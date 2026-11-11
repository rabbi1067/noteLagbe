package com.notelagbe.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.notelagbe.entity.PlanType;
import com.notelagbe.entity.SystemSetting;
import com.notelagbe.entity.User;
import com.notelagbe.exception.ApiException;
import com.notelagbe.repository.SystemSettingRepository;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.net.SocketTimeoutException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    public static final String SETTING_KEY_EMAIL_ENABLED = "EMAIL_NOTIFICATIONS_ENABLED";
    public static final String SETTING_KEY_PROVIDER = "EMAIL_PROVIDER";
    public static final String SETTING_KEY_SENDER_EMAIL = "EMAIL_SENDER_ADDRESS";
    public static final String SETTING_KEY_SENDER_NAME = "EMAIL_SENDER_NAME";
    public static final String SETTING_KEY_SMTP_HOST = "EMAIL_SMTP_HOST";
    public static final String SETTING_KEY_SMTP_PORT = "EMAIL_SMTP_PORT";
    public static final String SETTING_KEY_SMTP_PASSWORD = "EMAIL_SMTP_PASSWORD";
    public static final String SETTING_KEY_API_KEY = "EMAIL_API_KEY";

    public static final String PROVIDER_SMTP = "SMTP";
    public static final String PROVIDER_BREVO = "BREVO";
    public static final String PROVIDER_RESEND = "RESEND";

    private static final String BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
    private static final String RESEND_ENDPOINT = "https://api.resend.com/emails";

    private final SystemSettingRepository systemSettingRepository;
    private final JavaMailSender injectedMailSender;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Value("${email.provider:}")
    private String envProvider = "";

    @Value("${email.from:}")
    private String envFromEmail = "";

    @Value("${email.from-name:NoteLagbe • Southeast University}")
    private String envFromName = "NoteLagbe • Southeast University";

    @Value("${email.brevo.api-key:}")
    private String envBrevoApiKey = "";

    @Value("${email.resend.api-key:}")
    private String envResendApiKey = "";

    @Value("${spring.mail.username:}")
    private String envMailUsername = "";

    @Value("${spring.mail.password:}")
    private String envMailPassword = "";

    @Value("${spring.mail.host:smtp.gmail.com}")
    private String envMailHost = "smtp.gmail.com";

    @Value("${spring.mail.port:587}")
    private int envMailPort = 587;

    @Value("${app.frontend-url:https://note-lagbe-sandy.vercel.app}")
    private String frontendUrl = "https://note-lagbe-sandy.vercel.app";

    public EmailService(SystemSettingRepository systemSettingRepository,
                        @Autowired(required = false) JavaMailSender mailSender) {
        this.systemSettingRepository = systemSettingRepository;
        this.injectedMailSender = mailSender;
    }

    private record EffectiveEmailConfig(
            String provider,
            String senderEmail,
            String senderName,
            String smtpHost,
            int smtpPort,
            String secret,
            boolean fromAdminPanel,
            boolean ready
    ) {}

    private Optional<String> getDbSetting(String key) {
        return systemSettingRepository.findBySettingKey(key)
                .map(SystemSetting::getSettingValue)
                .map(String::trim)
                .filter(s -> !s.isEmpty());
    }

    private void saveOrDeleteDbSetting(String key, String value) {
        Optional<SystemSetting> existing = systemSettingRepository.findBySettingKey(key);
        if (value == null || value.trim().isEmpty()) {
            existing.ifPresent(systemSettingRepository::delete);
            return;
        }
        SystemSetting setting = existing.orElse(new SystemSetting(key, value.trim()));
        setting.setSettingValue(value.trim());
        systemSettingRepository.save(setting);
    }

    private static String normalizeProvider(String raw) {
        if (raw == null || raw.isBlank()) {
            return PROVIDER_SMTP;
        }
        String upper = raw.trim().toUpperCase(Locale.ROOT);
        if (PROVIDER_BREVO.equals(upper) || PROVIDER_RESEND.equals(upper) || PROVIDER_SMTP.equals(upper)) {
            return upper;
        }
        throw new ApiException("Unsupported email provider: " + raw + ". Choose SMTP, BREVO, or RESEND.");
    }

    private static boolean hasText(String s) {
        return s != null && !s.trim().isEmpty();
    }

    private static String sanitizeSmtpPassword(String host, String password) {
        if (password == null) {
            return "";
        }
        String trimmed = password.trim();
        if (host != null && host.toLowerCase(Locale.ROOT).contains("gmail.com")) {
            return trimmed.replaceAll("\\s+", "");
        }
        return trimmed;
    }

    private EffectiveEmailConfig resolveConfig() {
        Optional<String> dbProvider = getDbSetting(SETTING_KEY_PROVIDER);
        Optional<String> dbSender = getDbSetting(SETTING_KEY_SENDER_EMAIL);
        Optional<String> dbSenderName = getDbSetting(SETTING_KEY_SENDER_NAME);
        Optional<String> dbHost = getDbSetting(SETTING_KEY_SMTP_HOST);
        Optional<String> dbPort = getDbSetting(SETTING_KEY_SMTP_PORT);
        Optional<String> dbSmtpPass = getDbSetting(SETTING_KEY_SMTP_PASSWORD);
        Optional<String> dbApiKey = getDbSetting(SETTING_KEY_API_KEY);

        String provider;
        if (dbProvider.isPresent()) {
            provider = normalizeProvider(dbProvider.get());
        } else if (hasText(envProvider)) {
            provider = normalizeProvider(envProvider);
        } else if (hasText(envBrevoApiKey)) {
            provider = PROVIDER_BREVO;
        } else if (hasText(envResendApiKey)) {
            provider = PROVIDER_RESEND;
        } else {
            provider = PROVIDER_SMTP;
        }

        String senderEmail = dbSender.orElseGet(() ->
                hasText(envFromEmail) ? envFromEmail.trim() : (hasText(envMailUsername) ? envMailUsername.trim() : "")
        );
        String senderName = dbSenderName.orElseGet(() ->
                hasText(envFromName) ? envFromName.trim() : "NoteLagbe • Southeast University"
        );
        String smtpHost = dbHost.orElseGet(() -> hasText(envMailHost) ? envMailHost.trim() : "smtp.gmail.com");

        int smtpPort = envMailPort > 0 ? envMailPort : 587;
        if (dbPort.isPresent()) {
            try {
                int parsed = Integer.parseInt(dbPort.get());
                if (parsed >= 1 && parsed <= 65535) {
                    smtpPort = parsed;
                }
            } catch (NumberFormatException ignored) {
            }
        }

        boolean usingDbOverride = dbProvider.isPresent() || dbSender.isPresent() || dbSmtpPass.isPresent() || dbApiKey.isPresent();

        String secret;
        boolean ready;
        if (PROVIDER_BREVO.equals(provider)) {
            secret = dbApiKey.orElse(hasText(envBrevoApiKey) ? envBrevoApiKey.trim() : "");
            ready = hasText(secret) && hasText(senderEmail);
        } else if (PROVIDER_RESEND.equals(provider)) {
            secret = dbApiKey.orElse(hasText(envResendApiKey) ? envResendApiKey.trim() : "");
            ready = hasText(secret) && hasText(senderEmail);
        } else {
            String rawPass = dbSmtpPass.orElse(hasText(envMailPassword) ? envMailPassword : "");
            secret = sanitizeSmtpPassword(smtpHost, rawPass);
            ready = hasText(smtpHost) && smtpPort > 0 && hasText(senderEmail) && hasText(secret);
        }

        return new EffectiveEmailConfig(provider, senderEmail, senderName, smtpHost, smtpPort, secret, usingDbOverride, ready);
    }

    public boolean isSmtpConfigured() {
        return resolveConfig().ready();
    }

    public String getSmtpSender() {
        EffectiveEmailConfig cfg = resolveConfig();
        if (!cfg.ready()) {
            return hasText(cfg.senderEmail()) ? cfg.senderEmail() + " (Missing Credentials)" : "Not Configured";
        }
        return cfg.senderEmail();
    }

    public String getSmtpHost() {
        EffectiveEmailConfig cfg = resolveConfig();
        if (PROVIDER_BREVO.equals(cfg.provider())) {
            return "api.brevo.com (HTTPS 443)";
        }
        if (PROVIDER_RESEND.equals(cfg.provider())) {
            return "api.resend.com (HTTPS 443)";
        }
        String mode = cfg.smtpPort() == 465 ? "SSL" : "TLS";
        return cfg.smtpHost() + ":" + cfg.smtpPort() + " (" + mode + ")";
    }

    public Map<String, Object> getSettingsSummary() {
        EffectiveEmailConfig cfg = resolveConfig();
        boolean hasSecret = hasText(cfg.secret());
        String maskedHint = "";
        if (hasSecret) {
            String s = cfg.secret();
            maskedHint = s.length() > 4 ? "••••" + s.substring(s.length() - 4) : "••••";
        }

        String source = !cfg.ready() && !hasSecret && !hasText(cfg.senderEmail())
                ? "NOT_CONFIGURED"
                : (cfg.fromAdminPanel() ? "ADMIN_PANEL" : "ENVIRONMENT");

        String statusMessage;
        if (!cfg.ready()) {
            statusMessage = PROVIDER_SMTP.equals(cfg.provider())
                    ? "Email delivery not configured (enter SMTP or Brevo/Resend API credentials)"
                    : cfg.provider() + " HTTPS API selected, but sender email or API key is missing";
        } else if (PROVIDER_SMTP.equals(cfg.provider())) {
            statusMessage = "SMTP Authenticated (" + cfg.smtpHost() + ":" + cfg.smtpPort() + ")";
        } else {
            statusMessage = cfg.provider() + " HTTPS API Ready (Port 443)";
        }

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("emailNotificationsEnabled", isEmailNotificationsEnabled());
        map.put("smtpConfigured", cfg.ready());
        map.put("provider", cfg.provider());
        map.put("smtpSender", getSmtpSender());
        map.put("senderEmail", cfg.senderEmail());
        map.put("senderName", cfg.senderName());
        map.put("smtpHost", getSmtpHost());
        map.put("rawSmtpHost", cfg.smtpHost());
        map.put("smtpPort", cfg.smtpPort());
        map.put("hasSecret", hasSecret);
        map.put("secretPreview", maskedHint);
        map.put("credentialSource", source);
        map.put("statusMessage", statusMessage);
        return map;
    }

    public Map<String, Object> saveEmailConfig(
            String rawProvider,
            String senderEmail,
            String senderName,
            String smtpHost,
            Integer smtpPort,
            String secret,
            boolean clearSavedConfig
    ) {
        if (clearSavedConfig) {
            for (String key : List.of(
                    SETTING_KEY_PROVIDER,
                    SETTING_KEY_SENDER_EMAIL,
                    SETTING_KEY_SENDER_NAME,
                    SETTING_KEY_SMTP_HOST,
                    SETTING_KEY_SMTP_PORT,
                    SETTING_KEY_SMTP_PASSWORD,
                    SETTING_KEY_API_KEY
            )) {
                saveOrDeleteDbSetting(key, null);
            }
            log.info("Super Admin cleared custom email settings; reverted to environment configuration.");
            return getSettingsSummary();
        }

        String provider = normalizeProvider(rawProvider);
        String cleanEmail = senderEmail != null ? senderEmail.trim() : "";
        if (cleanEmail.isEmpty() || !cleanEmail.contains("@") || cleanEmail.length() > 200) {
            throw new ApiException("Please enter a valid sender email address.");
        }
        String cleanName = hasText(senderName) ? senderName.trim() : "NoteLagbe • Southeast University";
        if (cleanName.length() > 120) {
            throw new ApiException("Sender display name cannot exceed 120 characters.");
        }

        EffectiveEmailConfig current = resolveConfig();
        String incomingSecret = secret != null ? secret.trim() : "";
        if (incomingSecret.length() > 450) {
            throw new ApiException("Provided password or API key exceeds maximum allowed length.");
        }

        if (PROVIDER_SMTP.equals(provider)) {
            String cleanHost = hasText(smtpHost) ? smtpHost.trim() : "smtp.gmail.com";
            if (cleanHost.contains(" ") || cleanHost.contains("://") || cleanHost.length() > 180) {
                throw new ApiException("Please enter a valid SMTP host (for example: smtp.gmail.com).");
            }
            int cleanPort = smtpPort != null ? smtpPort : 587;
            if (cleanPort < 1 || cleanPort > 65535) {
                throw new ApiException("SMTP port must be between 1 and 65535.");
            }

            String effectivePass = hasText(incomingSecret)
                    ? sanitizeSmtpPassword(cleanHost, incomingSecret)
                    : (PROVIDER_SMTP.equals(current.provider()) ? current.secret() : "");
            if (!hasText(effectivePass)) {
                throw new ApiException("SMTP password / Google App Password is required.");
            }

            saveOrDeleteDbSetting(SETTING_KEY_PROVIDER, PROVIDER_SMTP);
            saveOrDeleteDbSetting(SETTING_KEY_SENDER_EMAIL, cleanEmail);
            saveOrDeleteDbSetting(SETTING_KEY_SENDER_NAME, cleanName);
            saveOrDeleteDbSetting(SETTING_KEY_SMTP_HOST, cleanHost);
            saveOrDeleteDbSetting(SETTING_KEY_SMTP_PORT, String.valueOf(cleanPort));
            saveOrDeleteDbSetting(SETTING_KEY_SMTP_PASSWORD, effectivePass);
            saveOrDeleteDbSetting(SETTING_KEY_API_KEY, null);
        } else {
            String effectiveApiKey = hasText(incomingSecret)
                    ? incomingSecret
                    : (provider.equals(current.provider()) ? current.secret() : "");
            if (!hasText(effectiveApiKey)) {
                throw new ApiException(provider + " API key is required.");
            }

            saveOrDeleteDbSetting(SETTING_KEY_PROVIDER, provider);
            saveOrDeleteDbSetting(SETTING_KEY_SENDER_EMAIL, cleanEmail);
            saveOrDeleteDbSetting(SETTING_KEY_SENDER_NAME, cleanName);
            saveOrDeleteDbSetting(SETTING_KEY_API_KEY, effectiveApiKey);
            saveOrDeleteDbSetting(SETTING_KEY_SMTP_PASSWORD, null);
        }

        log.info("Email delivery configuration updated in Admin Settings: provider={}, sender={}", provider, cleanEmail);
        return getSettingsSummary();
    }

    public boolean isEmailNotificationsEnabled() {
        return systemSettingRepository.findBySettingKey(SETTING_KEY_EMAIL_ENABLED)
                .map(s -> "true".equalsIgnoreCase(s.getSettingValue()))
                .orElse(true); // Default enabled
    }

    public void setEmailNotificationsEnabled(boolean enabled) {
        SystemSetting setting = systemSettingRepository.findBySettingKey(SETTING_KEY_EMAIL_ENABLED)
                .orElse(new SystemSetting(SETTING_KEY_EMAIL_ENABLED, String.valueOf(enabled)));
        setting.setSettingValue(String.valueOf(enabled));
        systemSettingRepository.save(setting);
        log.info("Email notification setting updated to: {}", enabled);
    }

    private String resolveFrontendBaseUrl() {
        return (frontendUrl != null && !frontendUrl.isBlank())
                ? frontendUrl.replaceAll("/+$", "")
                : "https://note-lagbe-sandy.vercel.app";
    }

    @Async
    public void sendPaymentApprovalEmail(User user, PlanType planType, double amount, String trxId, int quota, boolean unlimited) {
        if (!isEmailNotificationsEnabled()) {
            log.info("Skipping email notification: Email notifications are disabled by admin.");
            return;
        }
        if (user == null || !hasText(user.getEmail())) {
            return;
        }
        if (!isSmtpConfigured()) {
            log.info("Email delivery not configured. Skipping live payment email dispatch to {} ({}) - simulation mode.",
                    user.getEmail(), planType != null ? planType.getDisplayName() : "Plan");
            return;
        }

        String quotaText = unlimited ? "Unlimited All Courses for 1 Year" : quota + " Course Unlocks Quota";
        String dashboardUrl = resolveFrontendBaseUrl() + "/dashboard";

        String html = """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
                    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                    .badge { display: inline-block; padding: 4px 12px; background: #e0f2fe; color: #0284c7; border-radius: 999px; font-size: 12px; font-weight: bold; }
                    .title { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 8px; margin-bottom: 8px; }
                    .box { background: #f1f5f9; border-radius: 14px; padding: 18px; margin: 20px 0; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
                    .label { color: #64748b; font-weight: 500; }
                    .val { color: #0f172a; font-weight: 700; font-family: monospace; }
                    .btn { display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; font-size: 14px; margin-top: 16px; }
                    .footer { margin-top: 28px; font-size: 12px; color: #94a3b8; text-align: center; }
                </style>
            </head>
            <body>
                <div class="card">
                    <span class="badge">Southeast University • NoteLagbe</span>
                    <div class="title">Payment Approved & Plan Active! 🎉</div>
                    <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                        Dear <strong>%s</strong>,<br>
                        Your payment has been verified by the NoteLagbe administration. Your student access pass and course unlocks are now ready to use!
                    </p>
                    <div class="box">
                        <div class="row"><span class="label">Plan Purchased:</span><span class="val">%s</span></div>
                        <div class="row"><span class="label">Amount Paid:</span><span class="val">৳%.0f</span></div>
                        <div class="row"><span class="label">Transaction ID:</span><span class="val">%s</span></div>
                        <div class="row"><span class="label">Unlock Access:</span><span class="val" style="color: #16a34a;">%s</span></div>
                    </div>
                    <p style="font-size: 13px; color: #64748b;">
                        You can now browse any course and unlock full lecture notes and past midterm/final examination papers.
                    </p>
                    <div style="text-align: center;">
                        <a href="%s" class="btn">Go to NoteLagbe Dashboard →</a>
                    </div>
                    <div class="footer">
                        NoteLagbe — Southeast University CSE Notes & Question Bank Archive<br>
                        Permanent Campus: 251/A and 252, Tejgaon I/A, Dhaka-1208
                    </div>
                </div>
            </body>
            </html>
            """.formatted(
                HtmlUtils.htmlEscape(user.getName()),
                HtmlUtils.htmlEscape(planType.getDisplayName()),
                amount,
                HtmlUtils.htmlEscape(trxId),
                HtmlUtils.htmlEscape(quotaText),
                HtmlUtils.htmlEscape(dashboardUrl)
        );

        try {
            dispatchHtmlEmail(user.getEmail(), "🎉 NoteLagbe: Your " + planType.getDisplayName() + " Has Been Activated!", html);
            log.info("Payment approval email sent successfully to: {}", user.getEmail());
        } catch (Exception e) {
            log.warn("Failed to send payment approval email to {}: {}", user.getEmail(), e.getMessage());
        }
    }

    @Async
    public void sendWaiverApprovalEmail(User user, int quota) {
        if (!isEmailNotificationsEnabled()) {
            log.info("Skipping email notification: Email notifications are disabled by admin.");
            return;
        }
        if (user == null || !hasText(user.getEmail())) {
            return;
        }
        if (!isSmtpConfigured()) {
            log.info("Email delivery not configured. Skipping live waiver email dispatch for {} - simulation mode.", user.getEmail());
            return;
        }

        String coursesUrl = resolveFrontendBaseUrl() + "/courses";
        String html = """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
                    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                    .badge { display: inline-block; padding: 4px 12px; background: #f3e8ff; color: #7e22ce; border-radius: 999px; font-size: 12px; font-weight: bold; }
                    .title { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 8px; margin-bottom: 8px; }
                    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; margin: 20px 0; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
                    .label { color: #64748b; font-weight: 500; }
                    .val { color: #0f172a; font-weight: 700; }
                    .btn { display: inline-block; background: #7e22ce; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; font-size: 14px; margin-top: 16px; }
                    .footer { margin-top: 28px; font-size: 12px; color: #94a3b8; text-align: center; }
                </style>
            </head>
            <body>
                <div class="card">
                    <span class="badge">Southeast University • Financial Aid Waiver</span>
                    <div class="title">Waiver Approved & ৳99 Package Granted! 🎉</div>
                    <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                        Dear <strong>%s</strong>,<br>
                        Your financial aid application has been approved by NoteLagbe administration. You have received the <strong>৳99 (1-Semester Plan)</strong> with <strong>%d course unlocks</strong> valid for 3 months!
                    </p>
                    <div class="box">
                        <div class="row"><span class="label">Granted Package:</span><span class="val">৳99 Plan (1-Semester)</span></div>
                        <div class="row"><span class="label">Course Unlock Quota:</span><span class="val" style="color: #16a34a;">%d Courses</span></div>
                        <div class="row"><span class="label">Validity:</span><span class="val">3 Months</span></div>
                        <div class="row"><span class="label">Fee:</span><span class="val" style="color: #7e22ce;">100%% Free Waiver</span></div>
                    </div>
                    <p style="font-size: 13px; color: #64748b;">
                        You can immediately browse any Southeast University CSE course and click <strong>"Unlock Course Using Quota"</strong> to view handwritten lecture notes, midterm questionnaires, and final exam papers.
                    </p>
                    <div style="text-align: center;">
                        <a href="%s" class="btn">Browse & Unlock Courses →</a>
                    </div>
                    <div class="footer">
                        NoteLagbe — Southeast University CSE Notes & Question Bank Archive<br>
                        Permanent Campus: 251/A and 252, Tejgaon I/A, Dhaka-1208
                    </div>
                </div>
            </body>
            </html>
            """.formatted(HtmlUtils.htmlEscape(user.getName()), quota, quota, HtmlUtils.htmlEscape(coursesUrl));

        try {
            dispatchHtmlEmail(user.getEmail(), "🎉 NoteLagbe: Your Financial Aid / Free Waiver Has Been Approved!", html);
            log.info("Waiver approval email sent successfully to: {}", user.getEmail());
        } catch (Exception e) {
            log.warn("Failed to send waiver approval email to {}: {}", user.getEmail(), e.getMessage());
        }
    }

    @Async
    public void sendCourseGiftEmail(User user,
                                    String courseCode,
                                    String courseTitle,
                                    String teacherLabel,
                                    Integer validityMonths,
                                    String adminNote) {
        if (user == null || !hasText(user.getEmail())) {
            return;
        }
        if (!isEmailNotificationsEnabled()) {
            log.info("Skipping gift email notification: Email notifications are disabled by admin.");
            return;
        }
        if (!isSmtpConfigured()) {
            log.info("Email delivery not configured. Skipping live gift email dispatch to {} ({} - {}).",
                    user.getEmail(), courseCode, teacherLabel);
            return;
        }

        String safeCode = HtmlUtils.htmlEscape(courseCode != null ? courseCode : "Course");
        String safeTitle = HtmlUtils.htmlEscape(courseTitle != null ? courseTitle : "");
        String safeFaculty = HtmlUtils.htmlEscape(teacherLabel != null ? teacherLabel : "Assigned Faculty");
        String safeName = HtmlUtils.htmlEscape(user.getName() != null ? user.getName() : "Student");
        String validityStr = (validityMonths != null && validityMonths > 0)
                ? validityMonths + (validityMonths == 1 ? " Month" : " Months")
                : "Permanent Lifetime Access";
        String noteBlock = hasText(adminNote)
                ? "<div style=\"margin-top: 14px; padding: 12px 14px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px; font-size: 13px; color: #92400e;\"><strong>Admin Note:</strong> " + HtmlUtils.htmlEscape(adminNote.trim()) + "</div>"
                : "";

        String targetUrl = resolveFrontendBaseUrl() + "/courses/"
                + URLEncoder.encode(courseCode != null ? courseCode.trim() : "", StandardCharsets.UTF_8);

        String html = """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; color: #e2e8f0; margin: 0; padding: 20px; }
                    .card { max-width: 580px; margin: 0 auto; background: #111a2e; border-radius: 20px; padding: 32px; border: 1px solid #1e293b; box-shadow: 0 12px 32px rgba(0,0,0,0.35); }
                    .badge { display: inline-block; padding: 5px 12px; background: rgba(245, 158, 11, 0.16); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.35); border-radius: 999px; font-size: 12px; font-weight: bold; }
                    .title { font-size: 22px; font-weight: 800; color: #ffffff; margin-top: 12px; margin-bottom: 8px; }
                    .box { background: #0f172a; border: 1px solid #1e293b; border-radius: 14px; padding: 18px; margin: 20px 0; }
                    .row { margin-bottom: 10px; font-size: 14px; }
                    .label { color: #94a3b8; font-weight: 500; display: inline-block; min-width: 145px; }
                    .val { color: #f8fafc; font-weight: 700; }
                    .btn { display: inline-block; background: linear-gradient(90deg, #f59e0b, #d97706); color: #0f172a; text-decoration: none; padding: 12px 26px; border-radius: 12px; font-weight: 800; font-size: 14px; margin-top: 18px; }
                    .footer { margin-top: 28px; font-size: 12px; color: #64748b; text-align: center; }
                </style>
            </head>
            <body>
                <div class="card">
                    <span class="badge">Southeast University • NoteLagbe Gift Access</span>
                    <div class="title">Faculty Course Access Gifted! 🎁</div>
                    <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
                        Dear <strong>%s</strong>,<br>
                        NoteLagbe Administration has granted you complimentary gift access to materials for the following course and faculty member:
                    </p>
                    <div class="box">
                        <div class="row"><span class="label">Course Code:</span><span class="val" style="color: #60a5fa;">%s</span></div>
                        <div class="row"><span class="label">Course Title:</span><span class="val">%s</span></div>
                        <div class="row"><span class="label">Unlocked Faculty:</span><span class="val" style="color: #fbbf24;">%s</span></div>
                        <div class="row" style="margin-bottom:0;"><span class="label">Validity Period:</span><span class="val" style="color: #34d399;">%s</span></div>
                    </div>
                    %s
                    <p style="font-size: 13px; color: #94a3b8; line-height: 1.5;">
                        You can now open NoteLagbe to preview and study all handwritten notes and past exam questions uploaded under <strong>%s</strong> for <strong>%s</strong>.
                    </p>
                    <div style="text-align: center;">
                        <a href="%s" class="btn">Open %s Materials →</a>
                    </div>
                    <div class="footer">
                        NoteLagbe — Southeast University CSE Notes & Question Bank Archive<br>
                        Permanent Campus: 251/A and 252, Tejgaon I/A, Dhaka-1208
                    </div>
                </div>
            </body>
            </html>
            """.formatted(safeName, safeCode, safeTitle, safeFaculty, HtmlUtils.htmlEscape(validityStr), noteBlock, safeFaculty, safeCode, targetUrl, safeCode);

        try {
            dispatchHtmlEmail(user.getEmail(), "🎁 NoteLagbe: Gift Access Unlocked for " + courseCode + " (" + teacherLabel + ")", html);
            log.info("Course gift email sent successfully to {} ({} - {})", user.getEmail(), courseCode, teacherLabel);
        } catch (Exception e) {
            log.warn("Failed to send course gift email to {}: {}", user.getEmail(), e.getMessage());
        }
    }

    /**
     * Synchronously sends a 6-digit password reset OTP email.
     * Bypasses promotional notification opt-outs because account security verification is mandatory.
     */
    public void sendPasswordResetCodeEmail(User user, String securityCode, int expiryMinutes) {
        if (user == null || !hasText(user.getEmail())) {
            throw new ApiException("Registered email address is required to send security code.");
        }
        EffectiveEmailConfig cfg = resolveConfig();
        if (!cfg.ready()) {
            log.error("Cannot dispatch password reset OTP to {}: Email delivery credentials are missing.", user.getEmail());
            throw new ApiException("Email delivery service is not configured right now. Please contact support.");
        }

        String safeName = HtmlUtils.htmlEscape(user.getName() != null ? user.getName() : "Student");
        String safeCode = HtmlUtils.htmlEscape(securityCode);
        String baseUrl = resolveFrontendBaseUrl();

        String html = """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; color: #e2e8f0; margin: 0; padding: 20px; }
                    .card { max-width: 540px; margin: 0 auto; background: #111a2e; border-radius: 20px; padding: 32px; border: 1px solid #1e293b; box-shadow: 0 12px 32px rgba(0,0,0,0.4); }
                    .badge { display: inline-block; padding: 5px 12px; background: rgba(59, 130, 246, 0.16); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.35); border-radius: 999px; font-size: 12px; font-weight: bold; }
                    .title { font-size: 22px; font-weight: 800; color: #ffffff; margin-top: 14px; margin-bottom: 8px; }
                    .code-box { background: #090f1e; border: 1px dashed #3b82f6; border-radius: 16px; padding: 22px; margin: 22px 0; text-align: center; }
                    .code { font-family: 'Courier New', Consolas, monospace; font-size: 34px; font-weight: 900; letter-spacing: 10px; color: #ffffff; }
                    .meta { font-size: 12px; color: #94a3b8; margin-top: 8px; }
                    .warn { background: rgba(244, 63, 94, 0.1); border-left: 4px solid #f43f5e; border-radius: 8px; padding: 12px 14px; font-size: 12px; color: #fda4af; line-height: 1.5; margin-top: 16px; }
                    .footer { margin-top: 26px; font-size: 12px; color: #64748b; text-align: center; }
                </style>
            </head>
            <body>
                <div class="card">
                    <span class="badge">Account Security • One-Time Passcode</span>
                    <div class="title">Password Reset Verification Code</div>
                    <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
                        Hello <strong>%s</strong>,<br>
                        We received a request to reset the password for your NoteLagbe account. Enter the 6-digit security code below to continue:
                    </p>
                    <div class="code-box">
                        <div class="code">%s</div>
                        <div class="meta">Valid for <strong>%d minutes</strong> • Do not share this code with anyone</div>
                    </div>
                    <div class="warn">
                        <strong>Didn't request this?</strong> You can safely ignore this email. No changes will be made to your account unless this code is entered and verified.
                    </div>
                    <div class="footer">
                        NoteLagbe — Southeast University Archive (%s)
                    </div>
                </div>
            </body>
            </html>
            """.formatted(safeName, safeCode, expiryMinutes, HtmlUtils.htmlEscape(baseUrl));

        try {
            dispatchHtmlEmail(cfg, user.getEmail(), "🔐 NoteLagbe Security Code: Password Reset Verification", html);
            log.info("Password reset security code sent to {} via {}", user.getEmail(), cfg.provider());
        } catch (ApiException ae) {
            throw ae;
        } catch (Exception e) {
            log.error("Failed to send password reset security code to {} via {}: {}", user.getEmail(), cfg.provider(), e.getMessage());
            if (isSmtpPortBlockedTimeout(e)) {
                throw new ApiException("SMTP connection timed out (cloud hosts like Render Free block SMTP ports 465/587). Ask Super Admin to switch Email Delivery to Brevo/Resend HTTPS API in System Settings.");
            }
            throw new ApiException("Failed to send verification code to your email. Please try again later.");
        }
    }

    public Map<String, Object> sendTestEmail(String targetEmail) {
        if (!isEmailNotificationsEnabled()) {
            return Map.of("success", false, "message", "Email notifications are currently turned OFF in System Settings.");
        }
        EffectiveEmailConfig cfg = resolveConfig();
        if (!cfg.ready()) {
            return Map.of("success", false, "message", "Email delivery credentials are not configured yet. Configure SMTP or Brevo/Resend HTTPS API below first.");
        }
        if (!hasText(targetEmail)) {
            return Map.of("success", false, "message", "Target email address is required.");
        }

        String html = """
            <!DOCTYPE html>
            <html>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 24px; color: #1e293b;">
                <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 28px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    <h2 style="color: #0284c7; margin-top: 0;">🎉 NoteLagbe Email Delivery Verified!</h2>
                    <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                        This test email confirms that your active email delivery gateway is authenticated and operational.
                    </p>
                    <div style="background: #f1f5f9; padding: 14px; border-radius: 10px; font-size: 13px; font-family: monospace; line-height: 1.6;">
                        Provider: %s<br>
                        Sender: %s<br>
                        Recipient: %s<br>
                        Status: Authenticated &amp; Delivered
                    </div>
                    <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">
                        Southeast University NoteLagbe Automation Engine
                    </p>
                </div>
            </body>
            </html>
            """.formatted(
                HtmlUtils.htmlEscape(cfg.provider()),
                HtmlUtils.htmlEscape(cfg.senderEmail()),
                HtmlUtils.htmlEscape(targetEmail.trim())
        );

        try {
            dispatchHtmlEmail(cfg, targetEmail.trim(), "🔔 NoteLagbe: Email Delivery Live Test (" + cfg.provider() + ")", html);
            log.info("Test email sent successfully to {} via {}", targetEmail, cfg.provider());
            return Map.of(
                    "success", true,
                    "message", "Test email successfully sent to " + targetEmail.trim() + " via " + cfg.provider() + "."
            );
        } catch (Exception e) {
            log.error("Failed to send test email to {} via {}: {}", targetEmail, cfg.provider(), e.getMessage());
            String detail = isSmtpPortBlockedTimeout(e)
                    ? "SMTP connection timed out — Render Free tier blocks outbound SMTP ports (465/587). Switch provider to Brevo HTTPS API or Resend HTTPS API (Port 443) right here in System Settings!"
                    : "Delivery failed (" + cfg.provider() + "): " + e.getMessage();
            return Map.of("success", false, "message", detail);
        }
    }

    private void dispatchHtmlEmail(String toEmail, String subject, String html) throws Exception {
        dispatchHtmlEmail(resolveConfig(), toEmail, subject, html);
    }

    private void dispatchHtmlEmail(EffectiveEmailConfig cfg, String toEmail, String subject, String html) throws Exception {
        if (!cfg.ready()) {
            throw new ApiException("Email delivery service is not configured right now.");
        }
        if (PROVIDER_BREVO.equals(cfg.provider())) {
            sendViaBrevoApi(cfg, toEmail, subject, html);
            return;
        }
        if (PROVIDER_RESEND.equals(cfg.provider())) {
            sendViaResendApi(cfg, toEmail, subject, html);
            return;
        }
        sendViaSmtp(cfg, toEmail, subject, html);
    }

    protected JavaMailSender createMailSenderForConfig(EffectiveEmailConfig cfg) {
        if (!cfg.fromAdminPanel() && injectedMailSender != null) {
            return injectedMailSender;
        }
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(cfg.smtpHost());
        sender.setPort(cfg.smtpPort());
        sender.setUsername(cfg.senderEmail());
        sender.setPassword(cfg.secret());
        sender.setDefaultEncoding("UTF-8");

        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        if (cfg.smtpPort() == 465) {
            props.put("mail.smtp.ssl.enable", "true");
        } else {
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.starttls.required", "true");
        }
        props.put("mail.smtp.connectiontimeout", "10000");
        props.put("mail.smtp.timeout", "10000");
        props.put("mail.smtp.writetimeout", "10000");
        return sender;
    }

    private void sendViaSmtp(EffectiveEmailConfig cfg, String toEmail, String subject, String html) throws Exception {
        JavaMailSender sender = createMailSenderForConfig(cfg);
        if (sender == null) {
            throw new ApiException("SMTP mail sender unavailable.");
        }
        MimeMessage message = sender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        if (hasText(cfg.senderEmail())) {
            helper.setFrom(cfg.senderEmail(), cfg.senderName());
        }
        helper.setTo(toEmail);
        helper.setSubject(subject);
        helper.setText(html, true);
        sender.send(message);
    }

    private void sendViaBrevoApi(EffectiveEmailConfig cfg, String toEmail, String subject, String html) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("sender", Map.of("name", cfg.senderName(), "email", cfg.senderEmail()));
        body.put("to", List.of(Map.of("email", toEmail)));
        body.put("subject", subject);
        body.put("htmlContent", html);

        HttpResponse<String> response = postJson(
                BREVO_ENDPOINT,
                Map.of("api-key", cfg.secret(), "accept", "application/json"),
                body
        );
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new ApiException("Brevo API rejected email dispatch (HTTP " + response.statusCode() + "): " + summarizeHttpError(response.body()));
        }
    }

    private void sendViaResendApi(EffectiveEmailConfig cfg, String toEmail, String subject, String html) throws Exception {
        String formattedFrom = hasText(cfg.senderName())
                ? cfg.senderName() + " <" + cfg.senderEmail() + ">"
                : cfg.senderEmail();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("from", formattedFrom);
        body.put("to", List.of(toEmail));
        body.put("subject", subject);
        body.put("html", html);

        HttpResponse<String> response = postJson(
                RESEND_ENDPOINT,
                Map.of("Authorization", "Bearer " + cfg.secret()),
                body
        );
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new ApiException("Resend API rejected email dispatch (HTTP " + response.statusCode() + "): " + summarizeHttpError(response.body()));
        }
    }

    protected HttpResponse<String> postJson(String url, Map<String, String> headers, Map<String, Object> payload) throws Exception {
        String json = objectMapper.writeValueAsString(payload);
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(12))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8));
        headers.forEach(builder::header);
        return httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }

    private static String summarizeHttpError(String body) {
        if (body == null || body.isBlank()) {
            return "Empty response";
        }
        String singleLine = body.replaceAll("\\s+", " ").trim();
        return singleLine.length() > 180 ? singleLine.substring(0, 180) + "..." : singleLine;
    }

    private static boolean isSmtpPortBlockedTimeout(Throwable error) {
        Throwable cursor = error;
        while (cursor != null) {
            if (cursor instanceof SocketTimeoutException) {
                return true;
            }
            String msg = cursor.getMessage();
            if (msg != null && (msg.toLowerCase(Locale.ROOT).contains("timed out")
                    || msg.toLowerCase(Locale.ROOT).contains("connect timeout"))) {
                return true;
            }
            cursor = cursor.getCause();
        }
        return false;
    }
}
