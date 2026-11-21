package com.notelagbe.service;

import com.notelagbe.controller.AdminController;
import com.notelagbe.dto.ChatMessageDto;
import com.notelagbe.entity.ChatMessage;
import com.notelagbe.entity.Role;
import com.notelagbe.entity.SystemSetting;
import com.notelagbe.entity.User;
import com.notelagbe.exception.ApiException;
import com.notelagbe.repository.*;
import com.notelagbe.security.CustomUserDetails;
import com.notelagbe.service.review.ReviewModerationService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.CacheManager;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatRetentionAndOrderingTest {

    @Mock private ChatMessageRepository chatMessageRepository;
    @Mock private UserRepository userRepository;
    @Mock private ProfanityFilterService profanityFilterService;
    @Mock private LiveSyncService liveSyncService;
    @Mock private InputSanitizationService inputSanitizationService;
    @Mock private SystemSettingRepository systemSettingRepository;

    // AdminController dependencies for RBAC & audit log verification
    @Mock private AdminService adminService;
    @Mock private PaymentService paymentService;
    @Mock private ContributionService contributionService;
    @Mock private WaiverService waiverService;
    @Mock private ResourceService resourceService;
    @Mock private CourseService courseService;
    @Mock private TeacherService teacherService;
    @Mock private EmailService emailService;
    @Mock private ReviewModerationService reviewModerationService;
    @Mock private AuthService authService;
    @Mock private NoticeService noticeService;
    @Mock private ChatService chatServiceMock;
    @Mock private ActivityLogService activityLogService;
    @Mock private SeuFacultySyncService seuFacultySyncService;
    @Mock private CacheManager cacheManager;
    @Mock private HttpServletRequest httpRequest;

    private ChatService chatService;
    private AdminController adminController;
    private User superAdmin;
    private User student;

    @BeforeEach
    void setUp() {
        chatService = new ChatService(
                chatMessageRepository,
                userRepository,
                profanityFilterService,
                liveSyncService,
                inputSanitizationService,
                systemSettingRepository
        );

        adminController = new AdminController(
                adminService, paymentService, contributionService, waiverService,
                resourceService, courseService, teacherService, emailService,
                reviewModerationService, authService, noticeService, chatServiceMock,
                activityLogService, seuFacultySyncService, userRepository,
                cacheManager, httpRequest,
                org.mockito.Mockito.mock(PricingCampaignService.class)
        );

        superAdmin = new User();
        superAdmin.setId(1L);
        superAdmin.setName("Super Admin");
        superAdmin.setEmail("superadmin@seu.edu.bd");
        superAdmin.setRole(Role.ROLE_SUPER_ADMIN);

        student = new User();
        student.setId(10L);
        student.setName("Test Student");
        student.setEmail("2023200000686@seu.edu.bd");
        student.setRole(Role.ROLE_STUDENT);
    }

    private ChatMessage makeMsg(Long id, String text, LocalDateTime createdAt) {
        ChatMessage m = new ChatMessage();
        m.setId(id);
        m.setSender(student);
        m.setSenderName(student.getName());
        m.setSenderEmail(student.getEmail());
        m.setSenderRole(Role.ROLE_STUDENT);
        m.setMessageType("TEXT");
        m.setText(text);
        m.setCreatedAt(createdAt);
        return m;
    }

    @Test
    void getRetentionDaysDefaultsTo30WhenUnsetOrInvalid() {
        when(systemSettingRepository.findBySettingKey(ChatService.SETTING_KEY_CHAT_RETENTION_DAYS))
                .thenReturn(Optional.empty());
        assertEquals(30, chatService.getRetentionDays());

        when(systemSettingRepository.findBySettingKey(ChatService.SETTING_KEY_CHAT_RETENTION_DAYS))
                .thenReturn(Optional.of(new SystemSetting(ChatService.SETTING_KEY_CHAT_RETENTION_DAYS, "invalid")));
        assertEquals(30, chatService.getRetentionDays());

        when(systemSettingRepository.findBySettingKey(ChatService.SETTING_KEY_CHAT_RETENTION_DAYS))
                .thenReturn(Optional.of(new SystemSetting(ChatService.SETTING_KEY_CHAT_RETENTION_DAYS, "3")));
        assertEquals(30, chatService.getRetentionDays());

        when(systemSettingRepository.findBySettingKey(ChatService.SETTING_KEY_CHAT_RETENTION_DAYS))
                .thenReturn(Optional.of(new SystemSetting(ChatService.SETTING_KEY_CHAT_RETENTION_DAYS, "60")));
        assertEquals(60, chatService.getRetentionDays());
    }

    @Test
    void getRecentMessagesFetchesNewest150DescendingAndReturnsChronologicalOrder() {
        LocalDateTime now = LocalDateTime.now();
        ChatMessage newest = makeMsg(200L, "Newest", now);
        ChatMessage middle = makeMsg(199L, "Middle", now.minusMinutes(1));
        ChatMessage oldestOfWindow = makeMsg(198L, "Oldest in window", now.minusMinutes(2));

        // Repository returns newest-first (OrderByCreatedAtDesc)
        when(chatMessageRepository.findTop150ByDeletedFalseOrderByCreatedAtDesc())
                .thenReturn(Arrays.asList(newest, middle, oldestOfWindow));

        List<ChatMessageDto> result = chatService.getRecentMessages(10L);

        assertEquals(3, result.size());
        assertEquals(198L, result.get(0).getId());
        assertEquals(199L, result.get(1).getId());
        assertEquals(200L, result.get(2).getId());
    }

    @Test
    void updateRetentionDaysValidatesRangeAndPersistsSetting() {
        when(systemSettingRepository.findBySettingKey(ChatService.SETTING_KEY_CHAT_RETENTION_DAYS))
                .thenReturn(Optional.empty(), Optional.of(new SystemSetting(ChatService.SETTING_KEY_CHAT_RETENTION_DAYS, "90")));
        when(systemSettingRepository.save(any(SystemSetting.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(chatMessageRepository.countActiveMessages()).thenReturn(12L);
        when(chatMessageRepository.countSoftDeletedMessages()).thenReturn(2L);
        when(chatMessageRepository.countPurgeableMessages(any())).thenReturn(0L);
        when(chatMessageRepository.findTop1ByDeletedFalseOrderByCreatedAtAsc()).thenReturn(Optional.empty());

        Map<String, Object> status = chatService.updateRetentionDays(90);

        ArgumentCaptor<SystemSetting> captor = ArgumentCaptor.forClass(SystemSetting.class);
        verify(systemSettingRepository).save(captor.capture());
        assertEquals("90", captor.getValue().getSettingValue());
        assertEquals(90, status.get("retentionDays"));
        verify(liveSyncService).broadcast("chat", "retention_updated", 90);

        assertThrows(ApiException.class, () -> chatService.updateRetentionDays(6));
        assertThrows(ApiException.class, () -> chatService.updateRetentionDays(366));
    }

    @Test
    void purgeMessagesRemovesExpiredRowsAndLocalMediaButPreservesSafePaths() throws Exception {
        Path voiceDir = Paths.get("uploads", "voice").toAbsolutePath().normalize();
        Files.createDirectories(voiceDir);
        String uniqueFile = "test_fifo_purge_" + UUID.randomUUID() + ".webm";
        Path localVoiceFile = voiceDir.resolve(uniqueFile);
        Files.writeString(localVoiceFile, "dummy-audio-data");

        try {
            ChatMessage expiredLocal = makeMsg(1L, "Old voice", LocalDateTime.now().minusDays(31));
            expiredLocal.setMessageType("VOICE");
            expiredLocal.setVoiceUrl("/uploads/voice/" + uniqueFile);
            expiredLocal.setLikedUserIds(new HashSet<>(Set.of(10L, 11L)));

            ChatMessage expiredTraversal = makeMsg(2L, "Unsafe path", LocalDateTime.now().minusDays(35));
            expiredTraversal.setImageUrl("/uploads/../../pom.xml");

            when(chatMessageRepository.findPurgeableMessages(any(LocalDateTime.class)))
                    .thenReturn(Arrays.asList(expiredLocal, expiredTraversal));

            Map<String, Object> res = chatService.purgeMessagesOlderThanDays(30);

            assertEquals(true, res.get("success"));
            assertEquals(2, res.get("purgedCount"));
            assertEquals(1, res.get("filesDeleted"));
            assertEquals(30, res.get("olderThanDays"));
            assertFalse(Files.exists(localVoiceFile), "Expired local upload should be deleted from disk");
            assertTrue(expiredLocal.getLikedUserIds().isEmpty(), "Like relations should be cleared cleanly");
            verify(chatMessageRepository).deleteAll(Arrays.asList(expiredLocal, expiredTraversal));
            verify(liveSyncService).broadcast("chat", "messages_purged", 2);
        } finally {
            Files.deleteIfExists(localVoiceFile);
        }
    }

    @Test
    void scheduledPurgeUsesConfiguredRetentionFromSystemSettings() {
        when(systemSettingRepository.findBySettingKey(ChatService.SETTING_KEY_CHAT_RETENTION_DAYS))
                .thenReturn(Optional.of(new SystemSetting(ChatService.SETTING_KEY_CHAT_RETENTION_DAYS, "15")));
        when(chatMessageRepository.findPurgeableMessages(any(LocalDateTime.class)))
                .thenReturn(Collections.emptyList());

        LocalDateTime beforeRun = LocalDateTime.now().minusDays(15);
        chatService.purgeExpiredChatMessages();

        ArgumentCaptor<LocalDateTime> cutoffCaptor = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(chatMessageRepository).findPurgeableMessages(cutoffCaptor.capture());
        LocalDateTime usedCutoff = cutoffCaptor.getValue();
        assertFalse(usedCutoff.isBefore(beforeRun.minusSeconds(5)));
        assertFalse(usedCutoff.isAfter(LocalDateTime.now().minusDays(15).plusSeconds(5)));
    }

    @Test
    void superAdminEndpointsRequireSuperAdminRoleAndAuditLog() throws Exception {
        Method updateMethod = AdminController.class.getMethod("updateChatRetention", Map.class, CustomUserDetails.class);
        Method purgeMethod = AdminController.class.getMethod("purgeExpiredChatMessagesNow", Map.class, CustomUserDetails.class);
        Method statusMethod = AdminController.class.getMethod("getChatRetentionStatus");

        PreAuthorize updateAuth = updateMethod.getAnnotation(PreAuthorize.class);
        PreAuthorize purgeAuth = purgeMethod.getAnnotation(PreAuthorize.class);
        PreAuthorize statusAuth = statusMethod.getAnnotation(PreAuthorize.class);

        assertNotNull(updateAuth);
        assertEquals("hasRole('SUPER_ADMIN')", updateAuth.value());
        assertNotNull(purgeAuth);
        assertEquals("hasRole('SUPER_ADMIN')", purgeAuth.value());
        assertNull(statusAuth, "Status summary endpoint should remain viewable by standard admins");

        when(chatServiceMock.updateRetentionDays(60)).thenReturn(Map.of("retentionDays", 60));

        ResponseEntity<Map<String, Object>> updateRes = adminController.updateChatRetention(
                Map.of("retentionDays", 60),
                new CustomUserDetails(superAdmin)
        );
        assertEquals(200, updateRes.getStatusCode().value());
        verify(activityLogService).logActivity(
                eq("CHAT_RETENTION_UPDATE"),
                eq("SYSTEM"),
                argThat(d -> d.contains("60 days")),
                eq(superAdmin),
                eq(httpRequest));

        when(chatServiceMock.purgeMessagesOlderThanDays(30)).thenReturn(Map.of(
                "success", true,
                "purgedCount", 14,
                "olderThanDays", 30
        ));
        ResponseEntity<Map<String, Object>> purgeRes = adminController.purgeExpiredChatMessagesNow(
                Map.of("olderThanDays", 30),
                new CustomUserDetails(superAdmin)
        );
        assertEquals(200, purgeRes.getStatusCode().value());
        verify(activityLogService).logActivity(
                eq("CHAT_PURGE"),
                eq("SYSTEM"),
                argThat(d -> d.contains("14 expired message")),
                eq(superAdmin),
                eq(httpRequest));
    }
}
