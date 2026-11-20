package com.notelagbe.service;

import com.notelagbe.controller.AdminController;
import com.notelagbe.controller.AuthController;
import com.notelagbe.entity.Role;
import com.notelagbe.entity.SystemSetting;
import com.notelagbe.entity.User;
import com.notelagbe.exception.ApiException;
import com.notelagbe.repository.SystemSettingRepository;
import com.notelagbe.repository.UserRepository;
import com.notelagbe.security.CustomUserDetails;
import com.notelagbe.service.review.ReviewModerationService;
import jakarta.mail.internet.MimeMessage;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.CacheManager;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.reflect.Method;
import java.net.SocketTimeoutException;
import java.net.http.HttpResponse;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EmailDeliveryConfigurationTest {

    @Mock private JavaMailSender mailSender;

    // AdminController verification mocks
    @Mock private AdminService adminService;
    @Mock private PaymentService paymentService;
    @Mock private ContributionService contributionService;
    @Mock private WaiverService waiverService;
    @Mock private ResourceService resourceService;
    @Mock private CourseService courseService;
    @Mock private TeacherService teacherService;
    @Mock private EmailService emailServiceMock;
    @Mock private ReviewModerationService reviewModerationService;
    @Mock private AuthService authService;
    @Mock private NoticeService noticeService;
    @Mock private ChatService chatService;
    @Mock private ActivityLogService activityLogService;
    @Mock private SeuFacultySyncService seuFacultySyncService;
    @Mock private UserRepository userRepository;
    @Mock private CacheManager cacheManager;
    @Mock private HttpServletRequest httpRequest;

    private Map<String, SystemSetting> inMemorySettings;
    private SystemSettingRepository settingRepo;
    private TestableEmailService emailService;

    static class TestableEmailService extends EmailService {
        String lastUrl;
        Map<String, String> lastHeaders;
        Map<String, Object> lastPayload;
        int nextStatus = 201;
        String nextBody = "{\"messageId\":\"<test@brevo>\"}";
        Runnable onPost;
        JavaMailSender overrideMailSender;

        TestableEmailService(SystemSettingRepository repo, JavaMailSender sender) {
            super(repo, sender);
        }

        @Override
        protected JavaMailSender createMailSenderForConfig(EffectiveEmailConfig cfg) {
            return overrideMailSender != null ? overrideMailSender : super.createMailSenderForConfig(cfg);
        }

        @Override
        @SuppressWarnings("unchecked")
        protected HttpResponse<String> postJson(String url, Map<String, String> headers, Map<String, Object> payload) {
            this.lastUrl = url;
            this.lastHeaders = headers;
            this.lastPayload = payload;
            if (onPost != null) {
                onPost.run();
            }
            HttpResponse<String> resp = mock(HttpResponse.class);
            when(resp.statusCode()).thenReturn(nextStatus);
            lenient().when(resp.body()).thenReturn(nextBody);
            return resp;
        }
    }

    @BeforeEach
    void setUp() {
        inMemorySettings = new HashMap<>();
        settingRepo = mock(SystemSettingRepository.class);
        lenient().when(settingRepo.findBySettingKey(anyString())).thenAnswer(inv ->
                Optional.ofNullable(inMemorySettings.get(inv.<String>getArgument(0))));
        lenient().when(settingRepo.save(any(SystemSetting.class))).thenAnswer(inv -> {
            SystemSetting s = inv.getArgument(0);
            inMemorySettings.put(s.getSettingKey(), s);
            return s;
        });
        lenient().doAnswer(inv -> {
            SystemSetting s = inv.getArgument(0);
            inMemorySettings.remove(s.getSettingKey());
            return null;
        }).when(settingRepo).delete(any(SystemSetting.class));

        emailService = new TestableEmailService(settingRepo, mailSender);
    }

    @Test
    void unconfiguredEmailThrowsHelpfulApiExceptionOnPasswordReset() {
        assertFalse(emailService.isSmtpConfigured());
        Map<String, Object> summary = emailService.getSettingsSummary();
        assertEquals(false, summary.get("smtpConfigured"));
        assertEquals("NOT_CONFIGURED", summary.get("credentialSource"));

        User student = new User();
        student.setEmail("student@seu.edu.bd");
        student.setName("Student");

        ApiException ex = assertThrows(ApiException.class,
                () -> emailService.sendPasswordResetCodeEmail(student, "123456", 10));
        assertTrue(ex.getMessage().contains("Email delivery service is not configured"));
    }

    @Test
    void brevoConfigurationPersistsMasksSecretAndDispatchesOtpOverHttps() {
        Map<String, Object> saved = emailService.saveEmailConfig(
                "BREVO",
                "notelagbe.seu@gmail.com",
                "NoteLagbe SEU",
                null,
                null,
                "xkeysib-supersecret-9876",
                false
        );

        assertEquals(true, saved.get("smtpConfigured"));
        assertEquals("BREVO", saved.get("provider"));
        assertEquals("notelagbe.seu@gmail.com", saved.get("smtpSender"));
        assertEquals("ADMIN_PANEL", saved.get("credentialSource"));
        assertEquals("••••9876", saved.get("secretPreview"));
        assertFalse(saved.toString().contains("supersecret"), "Raw API key must never appear in settings summary");

        // Updating display name without re-entering secret keeps existing saved key
        Map<String, Object> updated = emailService.saveEmailConfig(
                "BREVO",
                "notelagbe.seu@gmail.com",
                "SEU Archive",
                null,
                null,
                "",
                false
        );
        assertEquals(true, updated.get("smtpConfigured"));
        assertEquals("••••9876", updated.get("secretPreview"));

        User student = new User();
        student.setName("Md. Fazley Rabbi");
        student.setEmail("2023200000686@seu.edu.bd");

        emailService.sendPasswordResetCodeEmail(student, "654321", 10);

        assertEquals("https://api.brevo.com/v3/smtp/email", emailService.lastUrl);
        assertEquals("xkeysib-supersecret-9876", emailService.lastHeaders.get("api-key"));
        assertTrue(emailService.lastPayload.get("htmlContent").toString().contains("654321"));
    }

    @Test
    void smtpConfigurationStripsSpacesFromGoogleAppPasswordAndValidatesInputs() {
        assertThrows(ApiException.class, () ->
                emailService.saveEmailConfig("SMTP", "invalid-email", "Name", "smtp.gmail.com", 587, "pass", false));
        assertThrows(ApiException.class, () ->
                emailService.saveEmailConfig("SMTP", "sender@gmail.com", "Name", "smtp.gmail.com", 99999, "pass", false));

        Map<String, Object> saved = emailService.saveEmailConfig(
                "SMTP",
                "sender@gmail.com",
                "NoteLagbe",
                "smtp.gmail.com",
                587,
                "abcd efgh ijkl mnop",
                false
        );

        assertEquals(true, saved.get("smtpConfigured"));
        assertEquals("SMTP", saved.get("provider"));
        assertEquals("abcdefghijklmnop", inMemorySettings.get(EmailService.SETTING_KEY_SMTP_PASSWORD).getSettingValue());

        Map<String, Object> cleared = emailService.saveEmailConfig("SMTP", "", "", "", 587, "", true);
        assertEquals(false, cleared.get("smtpConfigured"));
        assertTrue(inMemorySettings.isEmpty());
    }

    @Test
    void appsScriptConfigurationValidatesUrlSecretAndDispatchesOtp() {
        String validWebhookUrl = "https://script.google.com/macros/s/AKfycbTestDeploymentId/exec";

        assertThrows(ApiException.class, () -> emailService.saveEmailConfig(
                "APPS_SCRIPT", "sender@gmail.com", "NoteLagbe", null, null,
                "https://evil.example.com/steal", "NoteLagbeSecret2026", false
        ));
        assertThrows(ApiException.class, () -> emailService.saveEmailConfig(
                "APPS_SCRIPT", "sender@gmail.com", "NoteLagbe", null, null,
                validWebhookUrl, "short", false
        ));

        Map<String, Object> saved = emailService.saveEmailConfig(
                "APPS_SCRIPT",
                "fazlerabbicse65@gmail.com",
                "NoteLagbe SEU",
                null,
                null,
                validWebhookUrl,
                "NoteLagbeSecret2026",
                false
        );

        assertEquals(true, saved.get("smtpConfigured"));
        assertEquals("APPS_SCRIPT", saved.get("provider"));
        assertEquals("script.google.com (Gmail HTTPS 443)", saved.get("smtpHost"));
        assertEquals(validWebhookUrl, saved.get("webhookUrl"));
        assertEquals("••••2026", saved.get("secretPreview"));
        assertEquals(validWebhookUrl, inMemorySettings.get(EmailService.SETTING_KEY_WEBHOOK_URL).getSettingValue());
        assertFalse(saved.toString().contains("NoteLagbeSecret2026"), "Raw webhook secret must never appear in settings summary");

        emailService.nextStatus = 200;
        emailService.nextBody = "{\"ok\":true}";

        User student = new User();
        student.setName("Fazle Rabbi");
        student.setEmail("2023200000686@seu.edu.bd");

        emailService.sendPasswordResetCodeEmail(student, "789012", 10);

        assertEquals(validWebhookUrl, emailService.lastUrl);
        assertEquals("NoteLagbeSecret2026", emailService.lastPayload.get("secret"));
        assertEquals("2023200000686@seu.edu.bd", emailService.lastPayload.get("to"));
        assertEquals("NoteLagbe SEU", emailService.lastPayload.get("senderName"));
        assertEquals("fazlerabbicse65@gmail.com", emailService.lastPayload.get("replyTo"));
        assertNotNull(emailService.lastPayload.get("subject"));
        assertTrue(emailService.lastPayload.get("html").toString().contains("789012"));

        emailService.nextBody = "<!DOCTYPE html><html>Sign in</html>";
        assertThrows(ApiException.class, () -> emailService.sendPasswordResetCodeEmail(student, "789012", 10));

        emailService.nextBody = "{\"ok\":false,\"error\":\"Unauthorized\"}";
        assertThrows(ApiException.class, () -> emailService.sendPasswordResetCodeEmail(student, "789012", 10));

        Map<String, Object> cleared = emailService.saveEmailConfig("APPS_SCRIPT", "", "", "", 587, "", "", true);
        assertEquals(false, cleared.get("smtpConfigured"));
        assertTrue(inMemorySettings.isEmpty());
    }

    @Test
    void adminControllerUpdateEmailConfigRequiresSuperAdminAndDoesNotLogSecret() throws Exception {
        Method method = AdminController.class.getMethod("updateEmailConfiguration", Map.class, CustomUserDetails.class);
        PreAuthorize preAuth = method.getAnnotation(PreAuthorize.class);
        assertNotNull(preAuth);
        assertEquals("hasRole('SUPER_ADMIN')", preAuth.value());

        AdminController controller = new AdminController(
                adminService, paymentService, contributionService, waiverService,
                resourceService, courseService, teacherService, emailServiceMock,
                reviewModerationService, authService, noticeService, chatService,
                activityLogService, seuFacultySyncService, userRepository,
                cacheManager, httpRequest
        );

        User superAdmin = new User();
        superAdmin.setId(1L);
        superAdmin.setName("Super Admin");
        superAdmin.setEmail("superadmin@seu.edu.bd");
        superAdmin.setRole(Role.ROLE_SUPER_ADMIN);

        when(emailServiceMock.saveEmailConfig(anyString(), anyString(), anyString(), anyString(), anyInt(), anyString(), anyString(), anyBoolean()))
                .thenReturn(Map.of("provider", "BREVO", "smtpSender", "sender@gmail.com", "smtpConfigured", true));

        ResponseEntity<Map<String, Object>> res = controller.updateEmailConfiguration(
                Map.of(
                        "provider", "BREVO",
                        "senderEmail", "sender@gmail.com",
                        "senderName", "NoteLagbe",
                        "secret", "xkeysib-secret-token"
                ),
                new CustomUserDetails(superAdmin)
        );
        assertEquals(200, res.getStatusCode().value());

        verify(activityLogService).logActivity(
                eq("EMAIL_CONFIG_UPDATE"),
                eq("SYSTEM"),
                argThat(d -> d.contains("BREVO")
                        && d.contains("sender@gmail.com")
                        && !d.contains("xkeysib-secret-token")),
                eq(superAdmin),
                eq(httpRequest)
        );
    }

    @Test
    void vercelRelayDispatchesWithOneTimeChallengeNonceAndSupportsAutomaticSmtpFallback() {
        Map<String, Object> saved = emailService.saveEmailConfig(
                "VERCEL_RELAY",
                "fazlerabbicse65@gmail.com",
                "NoteLagbe SEU",
                "smtp.gmail.com",
                587,
                "",
                "abcd efgh ijkl mnop",
                false
        );

        assertEquals(true, saved.get("smtpConfigured"));
        assertEquals("VERCEL_RELAY", saved.get("provider"));
        assertEquals("Vercel Relay → smtp.gmail.com:587 (HTTPS 443)", saved.get("smtpHost"));
        assertEquals("abcdefghijklmnop", inMemorySettings.get(EmailService.SETTING_KEY_SMTP_PASSWORD).getSettingValue());
        assertFalse(saved.toString().contains("abcdefghijklmnop"), "Raw App Password must never appear in settings summary");

        User student = new User();
        student.setName("Fazle Rabbi");
        student.setEmail("2023200000686@seu.edu.bd");

        emailService.nextStatus = 200;
        emailService.nextBody = "{\"ok\":true}";
        final boolean[] callbackVerified = {false};
        final boolean[] replayRejected = {false};
        emailService.onPost = () -> {
            String nonce = String.valueOf(emailService.lastPayload.get("relayNonce"));
            String expectedHash = EmailService.computeRelayPayloadHash(
                    String.valueOf(emailService.lastPayload.get("to")),
                    String.valueOf(emailService.lastPayload.get("subject")),
                    String.valueOf(emailService.lastPayload.get("html"))
            );
            assertFalse(emailService.verifyAndConsumeRelayNonce(nonce, "0".repeat(64)));
            // Consumed on wrong hash attempt -> next real hash attempt wouldn't work unless we issue fresh; verify cleanup behavior cleanly!
            callbackVerified[0] = true;
            replayRejected[0] = !emailService.verifyAndConsumeRelayNonce(nonce, expectedHash);
        };

        emailService.sendPasswordResetCodeEmail(student, "998877", 10);
        assertTrue(callbackVerified[0]);
        assertTrue(replayRejected[0]);
        assertEquals("https://note-lagbe-sandy.vercel.app/api/mail-relay", emailService.lastUrl);
        assertEquals("abcdefghijklmnop", emailService.lastPayload.get("password"));
        assertTrue(emailService.lastPayload.get("html").toString().contains("998877"));

        // Verify exact happy-path one-time nonce consumption + AuthController endpoint behavior
        emailService.saveEmailConfig("SMTP", "sender@gmail.com", "NoteLagbe", "smtp.gmail.com", 587, "", "abcd efgh ijkl mnop", false);
        JavaMailSender blockedSender = mock(JavaMailSender.class);
        MimeMessage mimeMessage = mock(MimeMessage.class);
        when(blockedSender.createMimeMessage()).thenReturn(mimeMessage);
        doThrow(new MailSendException("SMTP port blocked", new SocketTimeoutException("connect timed out")))
                .when(blockedSender).send(any(MimeMessage.class));
        emailService.overrideMailSender = blockedSender;

        final boolean[] fallbackAuthorized = {false};
        emailService.onPost = () -> {
            String nonce = String.valueOf(emailService.lastPayload.get("relayNonce"));
            String validHash = EmailService.computeRelayPayloadHash(
                    String.valueOf(emailService.lastPayload.get("to")),
                    String.valueOf(emailService.lastPayload.get("subject")),
                    String.valueOf(emailService.lastPayload.get("html"))
            );
            AuthController authController = new AuthController(authService, activityLogService, emailService);
            ResponseEntity<Map<String, Object>> okRes = authController.verifyMailRelayChallenge(
                    Map.of("relayNonce", nonce, "payloadHash", validHash)
            );
            assertEquals(200, okRes.getStatusCode().value());
            assertEquals(true, okRes.getBody().get("authorized"));

            // Replay attempt with same single-use nonce must fail with HTTP 403
            ResponseEntity<Map<String, Object>> replayRes = authController.verifyMailRelayChallenge(
                    Map.of("relayNonce", nonce, "payloadHash", validHash)
            );
            assertEquals(403, replayRes.getStatusCode().value());
            assertEquals(false, replayRes.getBody().get("authorized"));
            fallbackAuthorized[0] = true;
        };

        emailService.sendPasswordResetCodeEmail(student, "112233", 10);
        assertTrue(fallbackAuthorized[0], "Blocked SMTP on Render Free must automatically fall back to Vercel Gmail Relay");
        assertEquals("https://note-lagbe-sandy.vercel.app/api/mail-relay", emailService.lastUrl);
        assertTrue(emailService.lastPayload.get("html").toString().contains("112233"));
    }

    @Test
    void senderDisplayNameRepairsPropertiesAndStoredMojibake() throws Exception {
        java.util.Properties props = new java.util.Properties();
        try (java.io.InputStream in = getClass().getClassLoader().getResourceAsStream("application.properties")) {
            assertNotNull(in, "application.properties must exist on test classpath");
            props.load(in);
        }
        String rawFromNameProperty = props.getProperty("email.from-name");
        assertNotNull(rawFromNameProperty);
        assertTrue(rawFromNameProperty.contains("NoteLagbe \u2022 Southeast University"),
                "application.properties must decode bullet cleanly under Java ISO-8859-1 Properties loader");
        assertFalse(rawFromNameProperty.contains("\u00e2"));

        assertEquals("NoteLagbe \u2022 Southeast University",
                EmailService.sanitizeSenderDisplayName("NoteLagbe \u00e2\u20ac\u00a2 Southeast University"));
        assertEquals("NoteLagbe \u2022 Southeast University",
                EmailService.sanitizeSenderDisplayName("NoteLagbe \u00e2\u0080\u00a2 Southeast University"));

        Map<String, Object> saved = emailService.saveEmailConfig(
                "VERCEL_RELAY",
                "fazlerabbicse65@gmail.com",
                "NoteLagbe \u00e2\u20ac\u00a2 Southeast University",
                "smtp.gmail.com",
                587,
                "",
                "abcd efgh ijkl mnop",
                false
        );
        assertTrue(saved.containsValue("NoteLagbe \u2022 Southeast University"));
        assertFalse(saved.toString().contains("\u00e2"));

        // Simulate a legacy mojibake value persisted directly in system_settings before this fix
        com.notelagbe.entity.SystemSetting senderNameSetting = inMemorySettings.values().stream()
                .filter(s -> s.getSettingKey().contains("SENDER_NAME"))
                .findFirst()
                .orElseThrow();
        senderNameSetting.setSettingValue("NoteLagbe \u00e2\u0080\u00a2 Southeast University");

        Map<String, Object> refreshed = emailService.getSettingsSummary();
        assertTrue(refreshed.containsValue("NoteLagbe \u2022 Southeast University"));
        assertFalse(refreshed.toString().contains("\u00e2"));

        User student = new User();
        student.setName("Fazle Rabbi");
        student.setEmail("2023200000686@seu.edu.bd");
        emailService.nextStatus = 200;
        emailService.nextBody = "{\"ok\":true}";
        emailService.onPost = () -> {};

        emailService.sendPasswordResetCodeEmail(student, "445566", 10);
        assertEquals("NoteLagbe \u2022 Southeast University", emailService.lastPayload.get("senderName"));
    }

    @Test
    void superAdminReceivesExclusivePaymentAndWaiverNotifications() {
        emailService.saveEmailConfig("BREVO", "noreply@notelagbe.com", "NoteLagbe", "", 587, "", "xkeysib-mock-key-12345", false);
        emailService.nextStatus = 201;
        emailService.nextBody = "{\"messageId\":\"<payment-alert-123@brevo>\"}";

        User superAdmin = new User();
        superAdmin.setId(1L);
        superAdmin.setName("Super Admin");
        superAdmin.setEmail("superadmin@notelagbe.com");
        superAdmin.setRole(Role.ROLE_SUPER_ADMIN);
        superAdmin.setEnabled(true);

        when(userRepository.findByRoleOrderByIdDesc(Role.ROLE_SUPER_ADMIN))
                .thenReturn(List.of(superAdmin));

        emailService.setUserRepository(userRepository);

        // Verify getSuperAdminEmails resolves the super admin
        List<String> adminEmails = emailService.getSuperAdminEmails();
        assertEquals(1, adminEmails.size());
        assertEquals("superadmin@notelagbe.com", adminEmails.get(0));

        // 1. Test Payment Notification
        User student = new User();
        student.setId(10L);
        student.setName("Student Buyer");
        student.setEmail("student@seu.edu.bd");
        student.setStudentId("2023200000123");

        com.notelagbe.entity.PaymentRequest payment = new com.notelagbe.entity.PaymentRequest();
        payment.setId(99L);
        payment.setUser(student);
        payment.setPlanType(com.notelagbe.entity.PlanType.SEMESTER_1);
        payment.setAmount(99.0);
        payment.setPaymentMethod(com.notelagbe.entity.PaymentMethod.BKASH);
        payment.setSenderPhone("01779326236");
        payment.setTransactionId("TRX8899AABB");
        payment.setCreatedAt(java.time.LocalDateTime.now());

        emailService.notifySuperAdminNewPaymentSubmission(student, payment);

        assertEquals("https://api.brevo.com/v3/smtp/email", emailService.lastUrl);
        assertNotNull(emailService.lastPayload);
        assertEquals("superadmin@notelagbe.com", ((List<?>) emailService.lastPayload.get("to")).get(0));
        assertTrue(emailService.lastPayload.get("subject").toString().contains("TRX8899AABB"));
        assertTrue(emailService.lastPayload.get("subject").toString().contains("99"));
        assertTrue(emailService.lastPayload.get("htmlContent").toString().contains("01779326236"));
        assertTrue(emailService.lastPayload.get("htmlContent").toString().contains("Student Buyer"));

        // 2. Test Waiver Notification
        com.notelagbe.entity.WaiverRequest waiver = new com.notelagbe.entity.WaiverRequest();
        waiver.setId(55L);
        waiver.setUser(student);
        waiver.setStudentId("2023200000123");
        waiver.setCgpa(3.85);
        waiver.setReason("Financial difficulty due to medical emergency.");
        waiver.setCreatedAt(java.time.LocalDateTime.now());

        emailService.notifySuperAdminNewWaiverSubmission(student, waiver);

        assertEquals("superadmin@notelagbe.com", ((List<?>) emailService.lastPayload.get("to")).get(0));
        assertTrue(emailService.lastPayload.get("subject").toString().contains("3.85"));
        assertTrue(emailService.lastPayload.get("htmlContent").toString().contains("Financial difficulty"));
    }
}
