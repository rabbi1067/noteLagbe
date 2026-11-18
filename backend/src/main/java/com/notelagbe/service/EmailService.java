package com.notelagbe.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.notelagbe.entity.PaymentMethod;
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

import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

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
    public static final String SETTING_KEY_WEBHOOK_URL = "EMAIL_WEBHOOK_URL";

    public static final String PROVIDER_VERCEL_RELAY = "VERCEL_RELAY";
    public static final String PROVIDER_SMTP = "SMTP";
    public static final String PROVIDER_BREVO = "BREVO";
    public static final String PROVIDER_RESEND = "RESEND";
    public static final String PROVIDER_APPS_SCRIPT = "APPS_SCRIPT";

    private static final String BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
    private static final String RESEND_ENDPOINT = "https://api.resend.com/emails";
    private static final String APPS_SCRIPT_PREFIX = "https://script.google.com/macros/s/";
    private static final int MAX_PENDING_RELAY_NONCES = 500;
    private static final long RELAY_NONCE_TTL_SECONDS = 90L;

    private final SystemSettingRepository systemSettingRepository;
    private final JavaMailSender injectedMailSender;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final SecureRandom secureRandom = new SecureRandom();
    private final Map<String, RelayAuthorization> pendingRelayNonces = new ConcurrentHashMap<>();
    private volatile boolean directSmtpBlockedDetected = false;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    @Value("${email.provider:}")
    private String envProvider = "";

    @Value("${email.from:}")
    private String envFromEmail = "";

    @Value("${email.from-name:NoteLagbe \u2022 Southeast University}")
    private String envFromName = "NoteLagbe \u2022 Southeast University";

    @Value("${email.brevo.api-key:}")
    private String envBrevoApiKey = "";

    @Value("${email.resend.api-key:}")
    private String envResendApiKey = "";

    @Value("${email.apps-script.url:}")
    private String envAppsScriptUrl = "";

    @Value("${email.apps-script.secret:}")
    private String envAppsScriptSecret = "";

    @Value("${email.vercel-relay.auto-fallback:true}")
    private boolean autoVercelRelayFallback = true;

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

    private record RelayAuthorization(String payloadHash, Instant expiresAt) {}

    protected record EffectiveEmailConfig(
            String provider,
            String senderEmail,
            String senderName,
            String smtpHost,
            int smtpPort,
            String webhookUrl,
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
        if (PROVIDER_VERCEL_RELAY.equals(upper)
                || PROVIDER_BREVO.equals(upper)
                || PROVIDER_RESEND.equals(upper)
                || PROVIDER_APPS_SCRIPT.equals(upper)
                || PROVIDER_SMTP.equals(upper)) {
            return upper;
        }
        throw new ApiException("Unsupported email provider: " + raw + ". Choose VERCEL_RELAY, APPS_SCRIPT, BREVO, RESEND, or SMTP.");
    }

    private static boolean isValidAppsScriptUrl(String url) {
        if (!hasText(url)) {
            return false;
        }
        String trimmed = url.trim();
        return trimmed.startsWith(APPS_SCRIPT_PREFIX) && !trimmed.contains("..") && trimmed.length() <= 500;
    }

    private static boolean isValidRelayUrl(String url) {
        if (!hasText(url)) {
            return false;
        }
        String trimmed = url.trim();
        if (trimmed.contains("..") || trimmed.contains(" ") || trimmed.length() > 500) {
            return false;
        }
        return trimmed.startsWith("https://")
                || trimmed.startsWith("http://localhost:")
                || trimmed.startsWith("http://127.0.0.1:");
    }

    private String resolveVercelRelayUrl(EffectiveEmailConfig cfg) {
        if (hasText(cfg.webhookUrl())) {
            return cfg.webhookUrl().trim();
        }
        return resolveFrontendBaseUrl() + "/api/mail-relay";
    }

    private String issueRelayNonce(String toEmail, String subject, String html) {
        Instant now = Instant.now();
        pendingRelayNonces.entrySet().removeIf(e -> now.isAfter(e.getValue().expiresAt()));
        if (pendingRelayNonces.size() >= MAX_PENDING_RELAY_NONCES) {
            throw new ApiException("Mail relay queue is temporarily full. Please try again in a moment.");
        }
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        String nonce = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
        String payloadHash = computeRelayPayloadHash(toEmail, subject, html);
        pendingRelayNonces.put(nonce, new RelayAuthorization(payloadHash, now.plusSeconds(RELAY_NONCE_TTL_SECONDS)));
        return nonce;
    }

    /**
     * Verifies and atomically consumes a single-use challenge nonce issued right before calling
     * NoteLagbe's Next.js Vercel relay endpoint, proving the request originated from this backend.
     */
    public boolean verifyAndConsumeRelayNonce(String relayNonce, String payloadHash) {
        if (!hasText(relayNonce) || !hasText(payloadHash)) {
            return false;
        }
        RelayAuthorization auth = pendingRelayNonces.remove(relayNonce.trim());
        if (auth == null || Instant.now().isAfter(auth.expiresAt())) {
            return false;
        }
        byte[] expected = auth.payloadHash().getBytes(StandardCharsets.UTF_8);
        byte[] actual = payloadHash.trim().toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(expected, actual);
    }

    static String computeRelayPayloadHash(String toEmail, String subject, String html) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            String canonical = (toEmail != null ? toEmail : "") + "\n"
                    + (subject != null ? subject : "") + "\n"
                    + (html != null ? html : "");
            byte[] digest = md.digest(canonical.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
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

    /**
     * Repairs UTF-8 punctuation corrupted by ISO-8859-1 or Windows-1252 decoding
     * (for example, {@code \u2022} read as {@code â€¢} or {@code \u00e2\u0080\u00a2}).
     */
    static String sanitizeSenderDisplayName(String name) {
        if (!hasText(name)) {
            return "NoteLagbe \u2022 Southeast University";
        }
        return name.trim()
                .replace("\u00e2\u20ac\u00a2", "\u2022")
                .replace("\u00e2\u0080\u00a2", "\u2022")
                .replace("\u00e2\u20ac\u201d", "\u2014")
                .replace("\u00e2\u0080\u0094", "\u2014")
                .replace("\u00e2\u20ac\u201c", "\u2013")
                .replace("\u00e2\u0080\u0093", "\u2013");
    }

    private EffectiveEmailConfig resolveConfig() {
        Optional<String> dbProvider = getDbSetting(SETTING_KEY_PROVIDER);
        Optional<String> dbSender = getDbSetting(SETTING_KEY_SENDER_EMAIL);
        Optional<String> dbSenderName = getDbSetting(SETTING_KEY_SENDER_NAME);
        Optional<String> dbHost = getDbSetting(SETTING_KEY_SMTP_HOST);
        Optional<String> dbPort = getDbSetting(SETTING_KEY_SMTP_PORT);
        Optional<String> dbSmtpPass = getDbSetting(SETTING_KEY_SMTP_PASSWORD);
        Optional<String> dbApiKey = getDbSetting(SETTING_KEY_API_KEY);
        Optional<String> dbWebhookUrl = getDbSetting(SETTING_KEY_WEBHOOK_URL);

        String provider;
        if (dbProvider.isPresent()) {
            provider = normalizeProvider(dbProvider.get());
        } else if (hasText(envProvider)) {
            provider = normalizeProvider(envProvider);
        } else if (hasText(envAppsScriptUrl)) {
            provider = PROVIDER_APPS_SCRIPT;
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
        String senderName = sanitizeSenderDisplayName(dbSenderName.orElseGet(() ->
                hasText(envFromName) ? envFromName.trim() : "NoteLagbe \u2022 Southeast University"
        ));
        String smtpHost = dbHost.orElseGet(() -> hasText(envMailHost) ? envMailHost.trim() : "smtp.gmail.com");
        String webhookUrl = dbWebhookUrl.orElseGet(() -> hasText(envAppsScriptUrl) ? envAppsScriptUrl.trim() : "");

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

        boolean usingDbOverride = dbProvider.isPresent()
                || dbSender.isPresent()
                || dbSmtpPass.isPresent()
                || dbApiKey.isPresent()
                || dbWebhookUrl.isPresent();

        String secret;
        boolean ready;
        if (PROVIDER_VERCEL_RELAY.equals(provider)) {
            String rawPass = dbSmtpPass.orElse(hasText(envMailPassword) ? envMailPassword : "");
            secret = sanitizeSmtpPassword(smtpHost, rawPass);
            String targetRelayUrl = resolveVercelRelayUrl(new EffectiveEmailConfig(
                    provider, senderEmail, senderName, smtpHost, smtpPort, webhookUrl, secret, false, false
            ));
            ready = hasText(smtpHost) && smtpPort > 0 && hasText(senderEmail) && hasText(secret) && isValidRelayUrl(targetRelayUrl);
        } else if (PROVIDER_APPS_SCRIPT.equals(provider)) {
            secret = dbApiKey.orElse(hasText(envAppsScriptSecret) ? envAppsScriptSecret.trim() : "");
            ready = isValidAppsScriptUrl(webhookUrl) && hasText(senderEmail) && hasText(secret);
        } else if (PROVIDER_BREVO.equals(provider)) {
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

        return new EffectiveEmailConfig(provider, senderEmail, senderName, smtpHost, smtpPort, webhookUrl, secret, usingDbOverride, ready);
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
        if (PROVIDER_VERCEL_RELAY.equals(cfg.provider())) {
            return "Vercel Relay → " + cfg.smtpHost() + ":" + cfg.smtpPort() + " (HTTPS 443)";
        }
        if (PROVIDER_APPS_SCRIPT.equals(cfg.provider())) {
            return "script.google.com (Gmail HTTPS 443)";
        }
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

        String source = !cfg.ready() && !hasSecret && !hasText(cfg.senderEmail()) && !hasText(cfg.webhookUrl())
                ? "NOT_CONFIGURED"
                : (cfg.fromAdminPanel() ? "ADMIN_PANEL" : "ENVIRONMENT");

        String statusMessage;
        if (!cfg.ready()) {
            statusMessage = PROVIDER_SMTP.equals(cfg.provider())
                    ? "Email delivery not configured (enter Vercel Relay, Brevo, Resend, or SMTP credentials)"
                    : cfg.provider() + " HTTPS gateway selected, but required URL, sender email, or secret is missing";
        } else if (PROVIDER_VERCEL_RELAY.equals(cfg.provider())) {
            statusMessage = "Vercel Gmail Relay Ready (" + resolveVercelRelayUrl(cfg) + ")";
        } else if (PROVIDER_SMTP.equals(cfg.provider())) {
            statusMessage = "SMTP Authenticated (" + cfg.smtpHost() + ":" + cfg.smtpPort()
                    + (autoVercelRelayFallback ? " + Vercel Auto-Relay" : "") + ")";
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
        map.put("webhookUrl", cfg.webhookUrl());
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
        return saveEmailConfig(rawProvider, senderEmail, senderName, smtpHost, smtpPort, null, secret, clearSavedConfig);
    }

    public Map<String, Object> saveEmailConfig(
            String rawProvider,
            String senderEmail,
            String senderName,
            String smtpHost,
            Integer smtpPort,
            String webhookUrl,
            String secret,
            boolean clearSavedConfig
    ) {
        directSmtpBlockedDetected = false;
        if (clearSavedConfig) {
            for (String key : List.of(
                    SETTING_KEY_PROVIDER,
                    SETTING_KEY_SENDER_EMAIL,
                    SETTING_KEY_SENDER_NAME,
                    SETTING_KEY_SMTP_HOST,
                    SETTING_KEY_SMTP_PORT,
                    SETTING_KEY_SMTP_PASSWORD,
                    SETTING_KEY_API_KEY,
                    SETTING_KEY_WEBHOOK_URL
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
        String cleanName = sanitizeSenderDisplayName(senderName);
        if (cleanName.length() > 120) {
            throw new ApiException("Sender display name cannot exceed 120 characters.");
        }

        EffectiveEmailConfig current = resolveConfig();
        String incomingSecret = secret != null ? secret.trim() : "";
        if (incomingSecret.length() > 450) {
            throw new ApiException("Provided password or API key exceeds maximum allowed length.");
        }

        if (PROVIDER_SMTP.equals(provider) || PROVIDER_VERCEL_RELAY.equals(provider)) {
            boolean isVercelRelay = PROVIDER_VERCEL_RELAY.equals(provider);
            String cleanHost = hasText(smtpHost) ? smtpHost.trim() : "smtp.gmail.com";
            if (cleanHost.contains(" ") || cleanHost.contains("://") || cleanHost.length() > 180) {
                throw new ApiException("Please enter a valid SMTP host (for example: smtp.gmail.com).");
            }
            int cleanPort = smtpPort != null ? smtpPort : 587;
            if (cleanPort < 1 || cleanPort > 65535) {
                throw new ApiException("SMTP port must be between 1 and 65535.");
            }
            String cleanRelayUrl = null;
            if (isVercelRelay && hasText(webhookUrl)) {
                cleanRelayUrl = webhookUrl.trim();
                if (!isValidRelayUrl(cleanRelayUrl)) {
                    throw new ApiException("Optional custom Vercel relay URL must start with https:// (leave blank to auto-use " + resolveFrontendBaseUrl() + "/api/mail-relay).");
                }
            }

            boolean previousSmtpCompatible = PROVIDER_SMTP.equals(current.provider()) || PROVIDER_VERCEL_RELAY.equals(current.provider());
            String effectivePass = hasText(incomingSecret)
                    ? sanitizeSmtpPassword(cleanHost, incomingSecret)
                    : (previousSmtpCompatible ? current.secret() : "");
            if (!hasText(effectivePass)) {
                throw new ApiException("SMTP password / Google App Password is required.");
            }

            saveOrDeleteDbSetting(SETTING_KEY_PROVIDER, provider);
            saveOrDeleteDbSetting(SETTING_KEY_SENDER_EMAIL, cleanEmail);
            saveOrDeleteDbSetting(SETTING_KEY_SENDER_NAME, cleanName);
            saveOrDeleteDbSetting(SETTING_KEY_SMTP_HOST, cleanHost);
            saveOrDeleteDbSetting(SETTING_KEY_SMTP_PORT, String.valueOf(cleanPort));
            saveOrDeleteDbSetting(SETTING_KEY_SMTP_PASSWORD, effectivePass);
            saveOrDeleteDbSetting(SETTING_KEY_API_KEY, null);
            saveOrDeleteDbSetting(SETTING_KEY_WEBHOOK_URL, cleanRelayUrl);
        } else if (PROVIDER_APPS_SCRIPT.equals(provider)) {
            String cleanUrl = webhookUrl != null ? webhookUrl.trim() : "";
            if (!isValidAppsScriptUrl(cleanUrl)) {
                throw new ApiException("Please enter a valid Google Apps Script Web App URL starting with https://script.google.com/macros/s/");
            }
            String effectiveSecret = hasText(incomingSecret)
                    ? incomingSecret
                    : (PROVIDER_APPS_SCRIPT.equals(current.provider()) ? current.secret() : "");
            if (!hasText(effectiveSecret) || effectiveSecret.length() < 8) {
                throw new ApiException("A shared Apps Script secret token (at least 8 characters) is required to protect your Gmail relay.");
            }

            saveOrDeleteDbSetting(SETTING_KEY_PROVIDER, PROVIDER_APPS_SCRIPT);
            saveOrDeleteDbSetting(SETTING_KEY_SENDER_EMAIL, cleanEmail);
            saveOrDeleteDbSetting(SETTING_KEY_SENDER_NAME, cleanName);
            saveOrDeleteDbSetting(SETTING_KEY_WEBHOOK_URL, cleanUrl);
            saveOrDeleteDbSetting(SETTING_KEY_API_KEY, effectiveSecret);
            saveOrDeleteDbSetting(SETTING_KEY_SMTP_PASSWORD, null);
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
            saveOrDeleteDbSetting(SETTING_KEY_WEBHOOK_URL, null);
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

    @Async
    public void sendStudentWelcomeEmail(User user) {
        if (!isEmailNotificationsEnabled()) {
            log.info("Skipping email notification: Email notifications are disabled by admin.");
            return;
        }
        if (user == null || !hasText(user.getEmail())) {
            return;
        }
        if (!isSmtpConfigured()) {
            log.info("Email delivery not configured. Skipping welcome email dispatch for {} - simulation mode.", user.getEmail());
            return;
        }

        String coursesUrl = resolveFrontendBaseUrl() + "/courses";
        String sId = hasText(user.getStudentId()) ? user.getStudentId() : "Not Provided";

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
                    .feature-list { list-style: none; padding: 0; margin: 16px 0; }
                    .feature-item { margin-bottom: 10px; font-size: 14px; color: #334155; line-height: 1.5; }
                    .btn { display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; font-size: 14px; margin-top: 16px; }
                    .footer { margin-top: 28px; font-size: 12px; color: #94a3b8; text-align: center; }
                </style>
            </head>
            <body>
                <div class="card">
                    <span class="badge">Southeast University • Official Academic Platform</span>
                    <div class="title">Welcome to NoteLagbe! 🎓</div>
                    <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                        Dear <strong>%s</strong>,<br>
                        Welcome to NoteLagbe, the comprehensive academic resource, lecture hand note archive, and exam question bank for Southeast University. Your student profile is active and ready to use!
                    </p>
                    <div class="box">
                        <div class="row"><span class="label">Full Name:</span><span class="val">%s</span></div>
                        <div class="row"><span class="label">Registered Email:</span><span class="val">%s</span></div>
                        <div class="row"><span class="label">Student ID:</span><span class="val">%s</span></div>
                        <div class="row"><span class="label">Account Status:</span><span class="val" style="color: #16a34a;">Active Student</span></div>
                    </div>
                    <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 20px;">What You Can Do on NoteLagbe:</div>
                    <ul class="feature-list">
                        <li class="feature-item">📚 <strong>Course Archive:</strong> Access lecture hand notes, midterm &amp; final question papers, and lab manuals from all SEU faculty.</li>
                        <li class="feature-item">🤖 <strong>AI Exam Revision Copilot:</strong> Get concise exam revision cheat sheets, repeated questions breakdown, and faculty-focused preparation tips.</li>
                        <li class="feature-item">🎁 <strong>Contribute &amp; Unlock Free:</strong> Upload 1 hand note or exam paper and get 2 courses completely unlocked for a full semester (90 days) free!</li>
                    </ul>
                    <div style="text-align: center;">
                        <a href="%s" class="btn">Explore Courses &amp; Notes →</a>
                    </div>
                    <div class="footer">
                        NoteLagbe — Southeast University Academic Resource Archive<br>
                        Permanent Campus: 251/A and 252, Tejgaon I/A, Dhaka-1208
                    </div>
                </div>
            </body>
            </html>
            """.formatted(
                HtmlUtils.htmlEscape(user.getName()),
                HtmlUtils.htmlEscape(user.getName()),
                HtmlUtils.htmlEscape(user.getEmail()),
                HtmlUtils.htmlEscape(sId),
                HtmlUtils.htmlEscape(coursesUrl)
        );

        try {
            dispatchHtmlEmail(user.getEmail(), "🎓 Welcome to NoteLagbe! Your SEU Student Account is Active", html);
            log.info("Student welcome email sent successfully to: {}", user.getEmail());
        } catch (Exception e) {
            log.warn("Failed to send student welcome email to {}: {}", user.getEmail(), e.getMessage());
        }
    }

    @Async
    public void sendContributionApprovalEmail(User user, String materialTitle, String courseCode, String course1Code, String course2Code, String adminFeedback) {
        if (!isEmailNotificationsEnabled()) {
            log.info("Skipping email notification: Email notifications are disabled by admin.");
            return;
        }
        if (user == null || !hasText(user.getEmail())) {
            return;
        }
        if (!isSmtpConfigured()) {
            log.info("Email delivery not configured. Skipping live contribution approval email dispatch for {} - simulation mode.", user.getEmail());
            return;
        }

        String dashboardUrl = resolveFrontendBaseUrl() + "/dashboard";
        String cleanFeedback = hasText(adminFeedback) ? adminFeedback : "Approved by Administrator. 2 courses unlocked for 90 days free!";

        String html = """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
                    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                    .badge { display: inline-block; padding: 4px 12px; background: #dcfce7; color: #15803d; border-radius: 999px; font-size: 12px; font-weight: bold; }
                    .title { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 8px; margin-bottom: 8px; }
                    .box { background: #f1f5f9; border-radius: 14px; padding: 18px; margin: 20px 0; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
                    .label { color: #64748b; font-weight: 500; }
                    .val { color: #0f172a; font-weight: 700; }
                    .btn { display: inline-block; background: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; font-size: 14px; margin-top: 16px; }
                    .footer { margin-top: 28px; font-size: 12px; color: #94a3b8; text-align: center; }
                </style>
            </head>
            <body>
                <div class="card">
                    <span class="badge">Academic Contribution Verified &amp; Approved</span>
                    <div class="title">Your Contribution is Approved! 🎉</div>
                    <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                        Dear <strong>%s</strong>,<br>
                        Thank you for contributing to the Southeast University student community! Your uploaded academic material has been verified by the administration and is now live on NoteLagbe.
                    </p>
                    <div class="box">
                        <div class="row"><span class="label">Material Title:</span><span class="val">%s</span></div>
                        <div class="row"><span class="label">Course Code:</span><span class="val" style="font-family: monospace;">%s</span></div>
                        <div class="row"><span class="label">Reward Courses:</span><span class="val" style="color: #16a34a; font-family: monospace;">%s &amp; %s</span></div>
                        <div class="row"><span class="label">Reward Access:</span><span class="val" style="color: #16a34a;">3 Months (90 Days) Free Access</span></div>
                    </div>
                    <div style="background: #f8fafc; border-left: 4px solid #16a34a; padding: 12px 16px; border-radius: 0 10px 10px 0; margin: 16px 0; font-size: 13px; color: #334155;">
                        <strong>Admin Feedback:</strong> %s
                    </div>
                    <p style="font-size: 13px; color: #64748b; line-height: 1.6;">
                        Your requested reward courses (<strong>%s</strong> and <strong>%s</strong>) have been automatically unlocked on your account with full access to all lecture notes and exam archives.
                    </p>
                    <div style="text-align: center;">
                        <a href="%s" class="btn">View Unlocked Courses on Dashboard →</a>
                    </div>
                    <div class="footer">
                        NoteLagbe — Southeast University Academic Resource Archive<br>
                        Permanent Campus: 251/A and 252, Tejgaon I/A, Dhaka-1208
                    </div>
                </div>
            </body>
            </html>
            """.formatted(
                HtmlUtils.htmlEscape(user.getName()),
                HtmlUtils.htmlEscape(materialTitle),
                HtmlUtils.htmlEscape(courseCode),
                HtmlUtils.htmlEscape(course1Code),
                HtmlUtils.htmlEscape(course2Code),
                HtmlUtils.htmlEscape(cleanFeedback),
                HtmlUtils.htmlEscape(course1Code),
                HtmlUtils.htmlEscape(course2Code),
                HtmlUtils.htmlEscape(dashboardUrl)
        );

        try {
            dispatchHtmlEmail(user.getEmail(), "🎉 Academic Contribution Approved! 2 Courses Unlocked Free (" + courseCode + ")", html);
            log.info("Contribution approval email sent successfully to: {}", user.getEmail());
        } catch (Exception e) {
            log.warn("Failed to send contribution approval email to {}: {}", user.getEmail(), e.getMessage());
        }
    }

    @Async
    public void sendPaymentSubmissionPendingEmail(User user, PlanType planType, double amount, String trxId, PaymentMethod method, String senderPhone) {
        if (!isEmailNotificationsEnabled()) {
            log.info("Skipping email notification: Email notifications are disabled by admin.");
            return;
        }
        if (user == null || !hasText(user.getEmail())) {
            return;
        }
        if (!isSmtpConfigured()) {
            log.info("Email delivery not configured. Skipping payment submission pending email for {} - simulation mode.", user.getEmail());
            return;
        }

        String pricingUrl = resolveFrontendBaseUrl() + "/pricing";
        String methodLabel = method != null ? method.name() : "Mobile Banking";

        String html = """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
                    .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                    .badge { display: inline-block; padding: 4px 12px; background: #fef3c7; color: #b45309; border-radius: 999px; font-size: 12px; font-weight: bold; }
                    .title { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 8px; margin-bottom: 8px; }
                    .box { background: #f1f5f9; border-radius: 14px; padding: 18px; margin: 20px 0; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
                    .label { color: #64748b; font-weight: 500; }
                    .val { color: #0f172a; font-weight: 700; font-family: monospace; }
                    .instruction-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin: 18px 0; font-size: 13px; color: #92400e; line-height: 1.6; }
                    .btn { display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; font-size: 14px; margin-top: 16px; }
                    .footer { margin-top: 28px; font-size: 12px; color: #94a3b8; text-align: center; }
                </style>
            </head>
            <body>
                <div class="card">
                    <span class="badge">NoteLagbe • Payment Verification Pending</span>
                    <div class="title">Payment Submission Received ⏳</div>
                    <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                        Dear <strong>%s</strong>,<br>
                        We have successfully received your payment verification request on NoteLagbe. Your transaction has been logged and queued for administrative review.
                    </p>
                    <div class="box">
                        <div class="row"><span class="label">Plan Selected:</span><span class="val">%s</span></div>
                        <div class="row"><span class="label">Amount:</span><span class="val">৳%.0f</span></div>
                        <div class="row"><span class="label">Payment Method:</span><span class="val">%s</span></div>
                        <div class="row"><span class="label">Sender Number:</span><span class="val">%s</span></div>
                        <div class="row"><span class="label">Transaction ID:</span><span class="val">%s</span></div>
                        <div class="row"><span class="label">Verification Status:</span><span class="val" style="color: #b45309;">Under Admin Review (যাচাই চলছে)</span></div>
                    </div>
                    <div class="instruction-box">
                        <strong>📌 পরবর্তী পদক্ষেপ / What to do next:</strong><br>
                        অ্যাডমিনিস্ট্রেটর আপনার Transaction ID মোবাইল ব্যাংকিং লেজারের সাথে যাচাই করছেন। সাধারণত <strong>১৫ থেকে ৩০ মিনিটের</strong> মধ্যে ভেরিফিকেশন সম্পন্ন হয়। অ্যাডমিন অনুমোদন (Accept) দেওয়ার সাথে সাথে আপনার কোর্স আনলক কোটা স্বয়ংক্রিয়ভাবে সক্রিয় হয়ে যাবে এবং আপনি আরেকটি কনফার্মেশন ইমেইল পাবেন।
                    </div>
                    <div style="text-align: center;">
                        <a href="%s" class="btn">Check Verification Status on NoteLagbe →</a>
                    </div>
                    <div class="footer">
                        NoteLagbe — Southeast University Academic Resource Archive<br>
                        Permanent Campus: 251/A and 252, Tejgaon I/A, Dhaka-1208
                    </div>
                </div>
            </body>
            </html>
            """.formatted(
                HtmlUtils.htmlEscape(user.getName()),
                HtmlUtils.htmlEscape(planType.getDisplayName()),
                amount,
                HtmlUtils.htmlEscape(methodLabel),
                HtmlUtils.htmlEscape(senderPhone != null ? senderPhone : "N/A"),
                HtmlUtils.htmlEscape(trxId),
                HtmlUtils.htmlEscape(pricingUrl)
        );

        try {
            dispatchHtmlEmail(user.getEmail(), "⏳ NoteLagbe: Payment Received — Under Admin Verification (" + trxId + ")", html);
            log.info("Payment submission pending email sent successfully to: {}", user.getEmail());
        } catch (Exception e) {
            log.warn("Failed to send payment submission pending email to {}: {}", user.getEmail(), e.getMessage());
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
                throw new ApiException("SMTP connection timed out (cloud hosts like Render Free block SMTP ports 465/587). Ask Super Admin to select Vercel Gmail Relay or Brevo/Resend HTTPS API in System Settings.");
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
            return Map.of("success", false, "message", "Email delivery credentials are not configured yet. Configure Vercel Gmail Relay or SMTP / API credentials below first.");
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
                    ? "SMTP connection timed out — Render Free tier blocks outbound SMTP ports (465/587). Switch provider to Vercel Gmail Relay (Port 443) right here in System Settings!"
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
        if (PROVIDER_VERCEL_RELAY.equals(cfg.provider())) {
            sendViaVercelRelay(cfg, toEmail, subject, html);
            return;
        }
        if (PROVIDER_APPS_SCRIPT.equals(cfg.provider())) {
            sendViaAppsScript(cfg, toEmail, subject, html);
            return;
        }
        if (PROVIDER_BREVO.equals(cfg.provider())) {
            sendViaBrevoApi(cfg, toEmail, subject, html);
            return;
        }
        if (PROVIDER_RESEND.equals(cfg.provider())) {
            sendViaResendApi(cfg, toEmail, subject, html);
            return;
        }
        if (autoVercelRelayFallback && directSmtpBlockedDetected && isValidRelayUrl(resolveVercelRelayUrl(cfg))) {
            sendViaVercelRelay(cfg, toEmail, subject, html);
            return;
        }
        try {
            sendViaSmtp(cfg, toEmail, subject, html);
        } catch (Exception e) {
            if (autoVercelRelayFallback
                    && isSmtpPortBlockedTimeout(e)
                    && isValidRelayUrl(resolveVercelRelayUrl(cfg))) {
                directSmtpBlockedDetected = true;
                log.warn("Direct SMTP unreachable ({}). Automatically falling back via Vercel Gmail Relay...", e.getMessage());
                sendViaVercelRelay(cfg, toEmail, subject, html);
                return;
            }
            throw e;
        }
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
        props.put("mail.smtp.connectiontimeout", "5000");
        props.put("mail.smtp.timeout", "5000");
        props.put("mail.smtp.writetimeout", "5000");
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

    private void sendViaAppsScript(EffectiveEmailConfig cfg, String toEmail, String subject, String html) throws Exception {
        if (!isValidAppsScriptUrl(cfg.webhookUrl())) {
            throw new ApiException("Invalid Google Apps Script Web App URL.");
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("secret", cfg.secret());
        body.put("to", toEmail);
        body.put("senderName", cfg.senderName());
        body.put("replyTo", cfg.senderEmail());
        body.put("subject", subject);
        body.put("html", html);

        HttpResponse<String> response = postJson(cfg.webhookUrl().trim(), Map.of(), body);
        parseJsonBridgeResponse(
                "Google Apps Script",
                response,
                "Google Apps Script returned non-JSON output. Set 'Who has access' to 'Anyone' and create a New deployment."
        );
    }

    private void sendViaVercelRelay(EffectiveEmailConfig cfg, String toEmail, String subject, String html) throws Exception {
        String relayUrl = resolveVercelRelayUrl(cfg);
        if (!isValidRelayUrl(relayUrl)) {
            throw new ApiException("Invalid Vercel Mail Relay URL.");
        }
        String relayNonce = issueRelayNonce(toEmail, subject, html);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("relayNonce", relayNonce);
        body.put("smtpHost", cfg.smtpHost());
        body.put("smtpPort", cfg.smtpPort());
        body.put("username", cfg.senderEmail());
        body.put("password", cfg.secret());
        body.put("senderEmail", cfg.senderEmail());
        body.put("senderName", cfg.senderName());
        body.put("to", toEmail);
        body.put("subject", subject);
        body.put("html", html);

        try {
            HttpResponse<String> response = postJson(relayUrl, Map.of(), body);
            parseJsonBridgeResponse(
                    "Vercel Gmail Relay",
                    response,
                    "Vercel Mail Relay returned an unexpected non-JSON response. Make sure the latest frontend deployment is live on Vercel."
            );
        } finally {
            pendingRelayNonces.remove(relayNonce);
        }
    }

    private void parseJsonBridgeResponse(String providerLabel, HttpResponse<String> response, String nonJsonHint) throws Exception {
        String respBody = response.body() != null ? response.body().trim() : "";
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            if (respBody.startsWith("{")) {
                Map<?, ?> parsedErr = objectMapper.readValue(respBody, Map.class);
                Object errObj = parsedErr.get("error");
                if (errObj != null && !errObj.toString().isBlank()) {
                    throw new ApiException(providerLabel + " failed: " + errObj);
                }
            }
            throw new ApiException(providerLabel + " returned HTTP " + response.statusCode() + ": " + summarizeHttpError(respBody));
        }
        if (!respBody.startsWith("{")) {
            throw new ApiException(nonJsonHint);
        }
        Map<?, ?> parsed = objectMapper.readValue(respBody, Map.class);
        Object okVal = parsed.get("ok");
        if (!(okVal instanceof Boolean b && b)) {
            Object errObj = parsed.get("error");
            throw new ApiException(providerLabel + " email failed: " + (errObj != null ? errObj.toString() : summarizeHttpError(respBody)));
        }
    }

    protected HttpResponse<String> postJson(String url, Map<String, String> headers, Map<String, Object> payload) throws Exception {
        String json = objectMapper.writeValueAsString(payload);
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(20))
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
            if (cursor instanceof SocketTimeoutException || cursor instanceof ConnectException) {
                return true;
            }
            String msg = cursor.getMessage();
            if (msg != null) {
                String lower = msg.toLowerCase(Locale.ROOT);
                if (lower.contains("timed out")
                        || lower.contains("connect timeout")
                        || lower.contains("couldn't connect")
                        || lower.contains("connection refused")
                        || lower.contains("network is unreachable")) {
                    return true;
                }
            }
            cursor = cursor.getCause();
        }
        return false;
    }
}
