package com.notelagbe.service;

import com.notelagbe.controller.AdminController;
import com.notelagbe.entity.Role;
import com.notelagbe.entity.SystemSetting;
import com.notelagbe.entity.User;
import com.notelagbe.exception.ApiException;
import com.notelagbe.repository.SystemSettingRepository;
import com.notelagbe.repository.UserRepository;
import com.notelagbe.security.CustomUserDetails;
import com.notelagbe.service.review.ReviewModerationService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.CacheManager;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.reflect.Method;
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

        TestableEmailService(SystemSettingRepository repo, JavaMailSender sender) {
            super(repo, sender);
        }

        @Override
        @SuppressWarnings("unchecked")
        protected HttpResponse<String> postJson(String url, Map<String, String> headers, Map<String, Object> payload) {
            this.lastUrl = url;
            this.lastHeaders = headers;
            this.lastPayload = payload;
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

        when(emailServiceMock.saveEmailConfig(anyString(), anyString(), anyString(), anyString(), anyInt(), anyString(), anyBoolean()))
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
}
