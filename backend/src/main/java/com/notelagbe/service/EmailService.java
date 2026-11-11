package com.notelagbe.service;

import com.notelagbe.entity.PlanType;
import com.notelagbe.entity.SystemSetting;
import com.notelagbe.entity.User;
import com.notelagbe.exception.ApiException;
import com.notelagbe.repository.SystemSettingRepository;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final String SETTING_KEY_EMAIL_ENABLED = "EMAIL_NOTIFICATIONS_ENABLED";

    private final SystemSettingRepository systemSettingRepository;
    private final JavaMailSender mailSender;

    @org.springframework.beans.factory.annotation.Value("${spring.mail.username:}")
    private String mailUsername;

    @org.springframework.beans.factory.annotation.Value("${spring.mail.password:}")
    private String mailPassword;

    @org.springframework.beans.factory.annotation.Value("${spring.mail.host:smtp.gmail.com}")
    private String mailHost;

    @org.springframework.beans.factory.annotation.Value("${spring.mail.port:587}")
    private int mailPort;

    @org.springframework.beans.factory.annotation.Value("${app.frontend-url:https://note-lagbe-sandy.vercel.app}")
    private String frontendUrl;

    public EmailService(SystemSettingRepository systemSettingRepository,
                        @Autowired(required = false) JavaMailSender mailSender) {
        this.systemSettingRepository = systemSettingRepository;
        this.mailSender = mailSender;
    }

    public boolean isSmtpConfigured() {
        return mailUsername != null && !mailUsername.trim().isEmpty()
                && mailPassword != null && !mailPassword.trim().isEmpty();
    }

    public String getSmtpSender() {
        if (!isSmtpConfigured()) {
            return "Not Configured (Requires Google App Password)";
        }
        return mailUsername;
    }

    public String getSmtpHost() {
        return mailHost + ":" + mailPort + " (TLS)";
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

    @Async
    public void sendPaymentApprovalEmail(User user, PlanType planType, double amount, String trxId, int quota, boolean unlimited) {
        if (!isEmailNotificationsEnabled()) {
            log.info("Skipping email notification: Email notifications are disabled by admin.");
            return;
        }

        if (!isSmtpConfigured()) {
            log.info("SMTP Google App Password not configured (SPRING_MAIL_PASSWORD missing). Skipping live email dispatch to {} ({}) - running in safe simulation mode.",
                    user != null ? user.getEmail() : "unknown",
                    planType != null ? planType.getDisplayName() : "Plan");
            return;
        }

        if (mailSender == null) {
            log.warn("JavaMailSender is not configured. Email to {} was not sent.", user.getEmail());
            return;
        }

        if (user.getEmail() == null || user.getEmail().trim().isEmpty()) {
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(user.getEmail());
            helper.setSubject("🎉 NoteLagbe: Your " + planType.getDisplayName() + " Has Been Activated!");

            String quotaText = unlimited ? "Unlimited All Courses for 1 Year" : quota + " Course Unlocks Quota";

            String html = """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
                        .card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
                        .header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
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
                            You can now browse any course (such as Advanced Networking, Data Structures, etc.) and unlock full lecture notes and past midterm/final examination papers.
                        </p>
                        <div style="text-align: center;">
                            <a href="http://localhost:3000/dashboard" class="btn">Go to NoteLagbe Dashboard →</a>
                        </div>
                        <div class="footer">
                            NoteLagbe — Southeast University CSE Notes & Question Bank Archive<br>
                            Permanent Campus: 251/A and 252, Tejgaon I/A, Dhaka-1208
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(user.getName(), planType.getDisplayName(), amount, trxId, quotaText);

            helper.setText(html, true);
            mailSender.send(message);
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

        if (!isSmtpConfigured()) {
            log.info("SMTP Google App Password not configured (SPRING_MAIL_PASSWORD missing). Skipping live email dispatch for waiver user {} - running in safe simulation mode.",
                    user != null ? user.getEmail() : "unknown");
            return;
        }

        if (mailSender == null) {
            log.warn("JavaMailSender is not configured. Email to {} was not sent.", user.getEmail());
            return;
        }

        if (user.getEmail() == null || user.getEmail().trim().isEmpty()) {
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(user.getEmail());
            helper.setSubject("🎉 NoteLagbe: Your Financial Aid / Free Waiver Has Been Approved!");

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
                            <a href="http://localhost:3000/courses" class="btn">Browse & Unlock Courses →</a>
                        </div>
                        <div class="footer">
                            NoteLagbe — Southeast University CSE Notes & Question Bank Archive<br>
                            Permanent Campus: 251/A and 252, Tejgaon I/A, Dhaka-1208
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(user.getName(), quota, quota);

            helper.setText(html, true);
            mailSender.send(message);
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
        if (user == null || user.getEmail() == null || user.getEmail().trim().isEmpty()) {
            return;
        }
        if (!isEmailNotificationsEnabled()) {
            log.info("Skipping gift email notification: Email notifications are disabled by admin.");
            return;
        }
        if (!isSmtpConfigured() || mailSender == null) {
            log.info("SMTP not configured. Skipping live gift email dispatch to {} ({} - {}).",
                    user.getEmail(), courseCode, teacherLabel);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String safeCode = HtmlUtils.htmlEscape(courseCode != null ? courseCode : "Course");
            String safeTitle = HtmlUtils.htmlEscape(courseTitle != null ? courseTitle : "");
            String safeFaculty = HtmlUtils.htmlEscape(teacherLabel != null ? teacherLabel : "Assigned Faculty");
            String safeName = HtmlUtils.htmlEscape(user.getName() != null ? user.getName() : "Student");
            String validityStr = (validityMonths != null && validityMonths > 0)
                    ? validityMonths + (validityMonths == 1 ? " Month" : " Months")
                    : "Permanent Lifetime Access";
            String noteBlock = (adminNote != null && !adminNote.trim().isEmpty())
                    ? "<div style=\"margin-top: 14px; padding: 12px 14px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px; font-size: 13px; color: #92400e;\"><strong>Admin Note:</strong> " + HtmlUtils.htmlEscape(adminNote.trim()) + "</div>"
                    : "";

            String baseUrl = (frontendUrl != null && !frontendUrl.isBlank()) ? frontendUrl.replaceAll("/+$", "") : "https://note-lagbe-sandy.vercel.app";
            String targetUrl = baseUrl + "/courses/" + java.net.URLEncoder.encode(courseCode != null ? courseCode.trim() : "", java.nio.charset.StandardCharsets.UTF_8);

            helper.setTo(user.getEmail());
            helper.setSubject("🎁 NoteLagbe: Gift Access Unlocked for " + courseCode + " (" + teacherLabel + ")");

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

            helper.setText(html, true);
            mailSender.send(message);
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
        if (user == null || user.getEmail() == null || user.getEmail().trim().isEmpty()) {
            throw new ApiException("Registered email address is required to send security code.");
        }
        if (!isSmtpConfigured() || mailSender == null) {
            log.error("Cannot dispatch password reset OTP to {}: SMTP credentials are missing.", user.getEmail());
            throw new ApiException("Email delivery service is not configured right now. Please contact support.");
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String safeName = HtmlUtils.htmlEscape(user.getName() != null ? user.getName() : "Student");
            String safeCode = HtmlUtils.htmlEscape(securityCode);
            String baseUrl = (frontendUrl != null && !frontendUrl.isBlank())
                    ? frontendUrl.replaceAll("/+$", "")
                    : "https://note-lagbe-sandy.vercel.app";

            helper.setTo(user.getEmail());
            helper.setSubject("🔐 NoteLagbe Security Code: Password Reset Verification");

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

            helper.setText(html, true);
            mailSender.send(message);
            log.info("Password reset security code sent to {}", user.getEmail());
        } catch (ApiException ae) {
            throw ae;
        } catch (Exception e) {
            log.error("Failed to send password reset security code to {}: {}", user.getEmail(), e.getMessage());
            throw new ApiException("Failed to send verification code to your email. Please try again later.");
        }
    }

    public java.util.Map<String, Object> sendTestEmail(String targetEmail) {
        if (!isEmailNotificationsEnabled()) {
            return java.util.Map.of("success", false, "message", "Email notifications are currently turned OFF in System Settings.");
        }
        if (!isSmtpConfigured()) {
            return java.util.Map.of("success", false, "message", "Google App Password is not configured in environment variables (SPRING_MAIL_PASSWORD missing). Set it in Render or .env first.");
        }
        if (targetEmail == null || targetEmail.trim().isEmpty()) {
            return java.util.Map.of("success", false, "message", "Target email address is required.");
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(targetEmail);
            helper.setSubject("🔔 NoteLagbe: SMTP Live Verification Test");
            String html = """
                <!DOCTYPE html>
                <html>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 24px; color: #1e293b;">
                    <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 28px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                        <h2 style="color: #0284c7; margin-top: 0;">🎉 NoteLagbe SMTP Live Verified!</h2>
                        <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                            This test email confirms that your Google App Password and Spring MailSender configuration are operational.
                        </p>
                        <div style="background: #f1f5f9; padding: 14px; border-radius: 10px; font-size: 13px; font-family: monospace; line-height: 1.6;">
                            Sender: %s<br>
                            Recipient: %s<br>
                            Status: Authenticated & Delivered
                        </div>
                        <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">
                            Southeast University NoteLagbe Automation Engine
                        </p>
                    </div>
                </body>
                </html>
                """.formatted(mailUsername, targetEmail);
            helper.setText(html, true);
            mailSender.send(message);
            log.info("SMTP test email sent successfully to {}", targetEmail);
            return java.util.Map.of("success", true, "message", "Test email successfully sent to " + targetEmail);
        } catch (Exception e) {
            log.error("Failed to send SMTP test email to {}: {}", targetEmail, e.getMessage());
            return java.util.Map.of("success", false, "message", "SMTP Delivery failed: " + e.getMessage());
        }
    }
}
