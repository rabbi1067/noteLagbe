package com.notelagbe.service;

import com.notelagbe.entity.PlanType;
import com.notelagbe.entity.SystemSetting;
import com.notelagbe.entity.User;
import com.notelagbe.repository.SystemSettingRepository;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final String SETTING_KEY_EMAIL_ENABLED = "EMAIL_NOTIFICATIONS_ENABLED";

    private final SystemSettingRepository systemSettingRepository;
    private final JavaMailSender mailSender;

    public EmailService(SystemSettingRepository systemSettingRepository,
                        @Autowired(required = false) JavaMailSender mailSender) {
        this.systemSettingRepository = systemSettingRepository;
        this.mailSender = mailSender;
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
}
