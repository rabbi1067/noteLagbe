package com.notelagbe.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.notelagbe.config.CacheConfig;
import com.notelagbe.dto.AuthRequest;
import com.notelagbe.dto.AuthResponse;
import com.notelagbe.dto.GoogleLoginRequest;
import com.notelagbe.entity.*;
import com.notelagbe.exception.ApiException;
import com.notelagbe.repository.*;
import com.notelagbe.service.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SecurityHardeningAndPaywallTest {

    @Mock private ResourceRepository resourceRepository;
    @Mock private CourseRepository courseRepository;
    @Mock private TeacherRepository teacherRepository;
    @Mock private UnlockedCourseRepository unlockedCourseRepository;
    @Mock private SubscriptionRepository subscriptionRepository;
    @Mock private SubscriptionService subscriptionService;
    @Mock private LiveSyncService liveSyncService;
    @Mock private ContributionRequestRepository contributionRequestRepository;
    @Mock private CloudinaryService cloudinaryService;
    @Mock private TeacherCourseRepository teacherCourseRepository;
    @Mock private CacheManager cacheManager;

    @Mock private PaymentRequestRepository paymentRequestRepository;
    @Mock private NotificationService notificationService;
    @Mock private EmailService emailService;
    @Mock private InputSanitizationService inputSanitizationService;
    @Mock private WaiverRequestRepository waiverRequestRepository;

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private JwtTokenProvider tokenProvider;

    private final List<Path> createdTempFiles = new ArrayList<>();
    private final List<Path> createdTempDirs = new ArrayList<>();

    @AfterEach
    void cleanupCreatedUploadFiles() throws IOException {
        for (Path file : createdTempFiles) {
            Files.deleteIfExists(file);
        }
        for (int i = createdTempDirs.size() - 1; i >= 0; i--) {
            Path dir = createdTempDirs.get(i);
            if (Files.isDirectory(dir)) {
                try (var entries = Files.list(dir)) {
                    if (entries.findAny().isEmpty()) {
                        Files.deleteIfExists(dir);
                    }
                }
            }
        }
    }

    private Path createTempMaterialFile(String filename, byte[] content) throws IOException {
        Path uploadsDir = Paths.get("uploads").toAbsolutePath().normalize();
        Path materialsDir = uploadsDir.resolve("materials").normalize();
        if (!Files.exists(uploadsDir)) {
            Files.createDirectories(uploadsDir);
            createdTempDirs.add(uploadsDir);
        }
        if (!Files.exists(materialsDir)) {
            Files.createDirectories(materialsDir);
            createdTempDirs.add(materialsDir);
        }
        Path file = materialsDir.resolve(filename);
        Files.write(file, content);
        createdTempFiles.add(file);
        return file;
    }

    @Test
    void urlSecurityValidatorBlocksPrivateInternalAndNonHttpSchemes(@TempDir Path tempDir) throws IOException {
        List<String> blockedUrls = List.of(
                "http://127.0.0.1/secret",
                "http://169.254.169.254/latest/meta-data",
                "http://10.0.0.1/admin",
                "http://localhost:8080/api/admin",
                "file:///etc/passwd"
        );
        for (String url : blockedUrls) {
            ApiException ex = assertThrows(ApiException.class,
                    () -> UrlSecurityValidator.validatePublicHttpUrl(url),
                    "Expected SSRF rejection for URL: " + url);
            assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        }

        URI validUri = UrlSecurityValidator.validatePublicHttpUrl("https://93.184.216.34/note.pdf");
        assertEquals("https", validUri.getScheme());

        Path materialsDir = tempDir.resolve("materials");
        Files.createDirectories(materialsDir);
        Path safeResolved = UrlSecurityValidator.resolveSafeLocalPath(tempDir, "/uploads/materials/note.pdf", "/uploads/", "uploads/");
        assertEquals(materialsDir.resolve("note.pdf").normalize(), safeResolved);

        ApiException traversalEx = assertThrows(ApiException.class,
                () -> UrlSecurityValidator.resolveSafeLocalPath(tempDir, "../secret.pdf", "/uploads/", "uploads/"));
        assertEquals(HttpStatus.FORBIDDEN, traversalEx.getStatus());
    }

    @Test
    void fileUploadSecurityValidatorEnforcesMagicBytesMimeAndSize() {
        byte[] svgBytes = "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile svgFile = new MockMultipartFile("file", "avatar.svg", "image/svg+xml", svgBytes);
        assertThrows(ApiException.class, () -> FileUploadSecurityValidator.validateImage(svgFile, FileUploadSecurityValidator.MAX_IMAGE_BYTES));

        byte[] htmlBytes = "<html><script>alert(1)</script></html>".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile htmlAsPng = new MockMultipartFile("file", "fake.png", "image/png", htmlBytes);
        assertThrows(ApiException.class, () -> FileUploadSecurityValidator.validateImage(htmlAsPng, FileUploadSecurityValidator.MAX_IMAGE_BYTES));

        MockMultipartFile htmlAsPdf = new MockMultipartFile("file", "fake.pdf", "application/pdf", htmlBytes);
        assertThrows(ApiException.class, () -> FileUploadSecurityValidator.validateMaterial(htmlAsPdf, FileUploadSecurityValidator.MAX_MATERIAL_BYTES));

        MockMultipartFile exeFile = new MockMultipartFile("file", "payload.exe", "application/x-msdownload", new byte[]{'M', 'Z', 0x00, 0x01});
        assertThrows(ApiException.class, () -> FileUploadSecurityValidator.validateMaterial(exeFile, FileUploadSecurityValidator.MAX_MATERIAL_BYTES));

        byte[] pngHeader = new byte[]{(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0x00};
        MockMultipartFile validPng = new MockMultipartFile("file", "photo.png", "image/png", pngHeader);
        assertEquals(".png", FileUploadSecurityValidator.validateImage(validPng, FileUploadSecurityValidator.MAX_IMAGE_BYTES));

        MockMultipartFile oversizedPng = new MockMultipartFile("file", "big.png", "image/png", pngHeader);
        ApiException tooBig = assertThrows(ApiException.class, () -> FileUploadSecurityValidator.validateImage(oversizedPng, 4));
        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, tooBig.getStatus());

        byte[] jpegHeader = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00};
        MockMultipartFile validJpg = new MockMultipartFile("file", "photo.jpeg", "image/jpeg", jpegHeader);
        assertEquals(".jpg", FileUploadSecurityValidator.validateImage(validJpg, FileUploadSecurityValidator.MAX_IMAGE_BYTES));

        byte[] pdfBytes = "%PDF-1.4\n1 0 obj\n<<>>\nendobj\n".getBytes(StandardCharsets.US_ASCII);
        MockMultipartFile validPdf = new MockMultipartFile("file", "notes.pdf", "application/pdf", pdfBytes);
        assertEquals(".pdf", FileUploadSecurityValidator.validateMaterial(validPdf, FileUploadSecurityValidator.MAX_MATERIAL_BYTES));

        byte[] bomPdfBytes = new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF, '%', 'P', 'D', 'F', '-', '1', '.', '7'};
        MockMultipartFile validBomPdf = new MockMultipartFile("file", "bom-notes.pdf", "application/pdf", bomPdfBytes);
        assertEquals(".pdf", FileUploadSecurityValidator.validateMaterial(validBomPdf, FileUploadSecurityValidator.MAX_MATERIAL_BYTES));

        byte[] webmBytes = new byte[]{0x1A, 0x45, (byte) 0xDF, (byte) 0xA3, 0x01};
        MockMultipartFile validWebm = new MockMultipartFile("file", "voice.webm", "audio/webm", webmBytes);
        assertEquals(".webm", FileUploadSecurityValidator.validateAudio(validWebm, FileUploadSecurityValidator.MAX_AUDIO_BYTES));
    }

    @Test
    void resourceServiceEnforcesPaywallMaskingAndStreaming() throws IOException {
        ResourceService resourceService = new ResourceService(
                resourceRepository, courseRepository, teacherRepository, unlockedCourseRepository,
                subscriptionRepository, subscriptionService, liveSyncService, contributionRequestRepository,
                cloudinaryService, teacherCourseRepository, cacheManager
        );

        Course course = new Course();
        course.setId(10L);
        course.setCode("CSE201");

        String uniqueName = "paywall-test-" + UUID.randomUUID() + ".pdf";
        byte[] pdfBytes = "%PDF-1.4\n%TestNoteLagbe\n".getBytes(StandardCharsets.US_ASCII);
        createTempMaterialFile(uniqueName, pdfBytes);

        Resource approvedResource = new Resource();
        approvedResource.setId(42L);
        approvedResource.setTitle("Midterm Past Paper");
        approvedResource.setType(ResourceType.MID_QUESTION);
        approvedResource.setStatus(ResourceStatus.APPROVED);
        approvedResource.setCourse(course);
        approvedResource.setSemesterName("Spring 2026");
        approvedResource.setFileUrl("/uploads/materials/" + uniqueName);
        approvedResource.setPreviewUrl("/uploads/materials/" + uniqueName);
        approvedResource.setDownloadsCount(0);

        User student = new User("Locked Student", "locked@seu.edu.bd", "hash", "202400001", Role.ROLE_STUDENT);
        student.setId(5L);

        when(resourceRepository.findById(42L)).thenReturn(Optional.of(approvedResource));
        when(subscriptionService.isResourceUnlocked(student, approvedResource)).thenReturn(false);

        Resource masked = resourceService.getResourceByIdForUser(42L, student);
        assertNull(masked.getFileUrl());
        assertNull(masked.getPreviewUrl());
        assertEquals("Midterm Past Paper", masked.getTitle());

        ApiException unauthEx = assertThrows(ApiException.class,
                () -> resourceService.streamResourceFile(42L, false, null));
        assertEquals(HttpStatus.UNAUTHORIZED, unauthEx.getStatus());

        ApiException forbiddenEx = assertThrows(ApiException.class,
                () -> resourceService.streamResourceFile(42L, true, student));
        assertEquals(HttpStatus.FORBIDDEN, forbiddenEx.getStatus());

        when(subscriptionService.isResourceUnlocked(student, approvedResource)).thenReturn(true);
        ResponseEntity<byte[]> unlockedStream = resourceService.streamResourceFile(42L, true, student);
        assertEquals(HttpStatus.OK, unlockedStream.getStatusCode());
        assertArrayEquals(pdfBytes, unlockedStream.getBody());
        assertTrue(Objects.requireNonNull(unlockedStream.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION)).contains("attachment"));
        assertEquals(1, approvedResource.getDownloadsCount());

        Resource pendingResource = new Resource();
        pendingResource.setId(43L);
        pendingResource.setTitle("Pending Note");
        pendingResource.setStatus(ResourceStatus.PENDING);
        pendingResource.setCourse(course);
        pendingResource.setFileUrl("/uploads/materials/" + uniqueName);
        when(resourceRepository.findById(43L)).thenReturn(Optional.of(pendingResource));

        ApiException pendingStudentEx = assertThrows(ApiException.class,
                () -> resourceService.streamResourceFile(43L, false, student));
        assertEquals(HttpStatus.FORBIDDEN, pendingStudentEx.getStatus());

        User admin = new User("Admin", "staff@seu.edu.bd", "hash", "ADM-01", Role.ROLE_ADMIN);
        admin.setId(1L);
        ResponseEntity<byte[]> adminStream = resourceService.streamResourceFile(43L, false, admin);
        assertEquals(HttpStatus.OK, adminStream.getStatusCode());
        assertArrayEquals(pdfBytes, adminStream.getBody());
    }

    @Test
    void paymentServiceTracksAccurateUsedCoursesCountAndGuardsApprovedRejection() {
        PaymentService paymentService = new PaymentService(
                paymentRequestRepository, subscriptionRepository, unlockedCourseRepository,
                courseRepository, new ObjectMapper(), notificationService, emailService,
                liveSyncService, inputSanitizationService
        );

        User student = new User("Student", "s1@seu.edu.bd", "hash", "202400002", Role.ROLE_STUDENT);
        student.setId(7L);

        Course cse101 = new Course();
        cse101.setId(101L);
        cse101.setCode("CSE101");

        PaymentRequest pending = new PaymentRequest();
        pending.setId(88L);
        pending.setUser(student);
        pending.setPlanType(PlanType.SEMESTER_1);
        pending.setAmount(199);
        pending.setTransactionId("TRX123456");
        pending.setStatus(PaymentStatus.PENDING);
        pending.setSelectedCoursesJson("[{\"courseCode\":\"CSE101\"},{\"courseCode\":\"NOPE999\"},{\"code\":\"CSE101\"}]");

        when(paymentRequestRepository.findById(88L)).thenReturn(Optional.of(pending));
        when(subscriptionRepository.findFirstByUserIdAndActiveTrueOrderByStartDateDesc(7L)).thenReturn(Optional.empty());
        when(courseRepository.findByCodeIgnoreCase("CSE101")).thenReturn(Optional.of(cse101));
        when(courseRepository.findByCodeIgnoreCase("NOPE999")).thenReturn(Optional.empty());
        when(unlockedCourseRepository.existsByUserIdAndCourseIdAndTeacherIsNull(7L, 101L))
                .thenReturn(false)
                .thenReturn(true);

        PaymentRequest approved = paymentService.approvePayment(88L, "Verified");
        assertEquals(PaymentStatus.APPROVED, approved.getStatus());

        ArgumentCaptor<Subscription> subCaptor = ArgumentCaptor.forClass(Subscription.class);
        verify(subscriptionRepository, atLeast(2)).save(subCaptor.capture());
        List<Subscription> savedSubs = subCaptor.getAllValues();
        Subscription finalSub = savedSubs.get(savedSubs.size() - 1);
        assertEquals(1, finalSub.getUsedCoursesCount());
        verify(unlockedCourseRepository, times(1)).save(any(UnlockedCourse.class));

        assertThrows(ApiException.class, () -> paymentService.rejectPayment(88L, "Cannot reject"));
    }

    @Test
    void waiverServiceApprovesGrantsQuotaAndGuardsApprovedRejection() {
        WaiverService waiverService = new WaiverService(
                waiverRequestRepository, subscriptionRepository, notificationService,
                emailService, liveSyncService, inputSanitizationService
        );

        User student = new User("Waiver Student", "waiver@seu.edu.bd", "hash", "202400003", Role.ROLE_STUDENT);
        student.setId(9L);

        WaiverRequest wr = new WaiverRequest();
        wr.setId(55L);
        wr.setUser(student);
        wr.setStatus(PaymentStatus.PENDING);

        Subscription previous = new Subscription(student, PlanType.SEMESTER_1);
        previous.setActive(true);

        when(waiverRequestRepository.findById(55L)).thenReturn(Optional.of(wr));
        when(subscriptionRepository.findFirstByUserIdAndActiveTrueOrderByStartDateDesc(9L)).thenReturn(Optional.of(previous));

        WaiverRequest approved = waiverService.approveWaiver(55L, 4, "Need-based aid granted");
        assertEquals(PaymentStatus.APPROVED, approved.getStatus());
        assertEquals(4, approved.getGrantedCoursesCount());
        assertFalse(previous.isActive());

        ArgumentCaptor<Subscription> subCaptor = ArgumentCaptor.forClass(Subscription.class);
        verify(subscriptionRepository, times(2)).save(subCaptor.capture());
        Subscription grantedSub = subCaptor.getAllValues().get(1);
        assertEquals(PlanType.SEMESTER_1, grantedSub.getPlanType());
        assertEquals(4, grantedSub.getMaxCoursesAllowed());
        assertEquals(0, grantedSub.getUsedCoursesCount());
        assertTrue(grantedSub.isActive());

        assertThrows(ApiException.class, () -> waiverService.rejectWaiver(55L, "Late rejection"));
    }

    @Test
    void cacheConfigScheduledEvictionClearsPopulatedCaches() {
        CacheConfig cacheConfig = new CacheConfig();
        CacheManager manager = cacheConfig.cacheManager();

        Cache coursesCache = manager.getCache(CacheConfig.CACHE_COURSES);
        Cache recentReviewsCache = manager.getCache(CacheConfig.CACHE_RECENT_REVIEWS);
        assertNotNull(coursesCache);
        assertNotNull(recentReviewsCache);

        coursesCache.put("all", List.of("CSE101"));
        recentReviewsCache.put("recent", List.of("review1"));
        assertNotNull(coursesCache.get("all"));
        assertNotNull(recentReviewsCache.get("recent"));

        cacheConfig.evictAllCachesAtIntervals();
        assertNull(coursesCache.get("all"));
        assertNull(recentReviewsCache.get("recent"));
    }

    @Test
    void authServiceGoogleLoginValidatesTokenClaimsBeforeIssuingJwt() {
        AuthService authService = new AuthService(
                userRepository, courseRepository, subscriptionRepository, unlockedCourseRepository,
                passwordEncoder, authenticationManager, tokenProvider, subscriptionService,
                liveSyncService, cloudinaryService, emailService
        ) {
            @Override
            protected Map<String, Object> verifyGoogleIdToken(String idToken) {
                if ("valid-google-token".equals(idToken)) {
                    return Map.of(
                            "email", "verified.student@seu.edu.bd",
                            "name", "Verified Student",
                            "picture", "https://lh3.googleusercontent.com/avatar.png"
                    );
                }
                return super.verifyGoogleIdToken(idToken);
            }
        };

        GoogleLoginRequest blankReq = new GoogleLoginRequest();
        blankReq.setIdToken("  ");
        blankReq.setEmail("verified.student@seu.edu.bd");
        ApiException blankEx = assertThrows(ApiException.class, () -> authService.loginWithGoogle(blankReq));
        assertEquals(HttpStatus.UNAUTHORIZED, blankEx.getStatus());
        verify(userRepository, never()).findByEmail(any());

        GoogleLoginRequest mismatchReq = new GoogleLoginRequest();
        mismatchReq.setIdToken("valid-google-token");
        mismatchReq.setEmail("imposter@seu.edu.bd");
        ApiException mismatchEx = assertThrows(ApiException.class, () -> authService.loginWithGoogle(mismatchReq));
        assertEquals(HttpStatus.UNAUTHORIZED, mismatchEx.getStatus());

        User verifiedUser = new User("Verified Student", "verified.student@seu.edu.bd", null, null, Role.ROLE_STUDENT);
        verifiedUser.setId(33L);
        verifiedUser.setAuthProvider(AuthProvider.GOOGLE);
        verifiedUser.setEnabled(true);

        when(userRepository.findByEmail("verified.student@seu.edu.bd")).thenReturn(Optional.of(verifiedUser));
        when(tokenProvider.generateTokenFromUser(verifiedUser)).thenReturn("signed-jwt-token");

        GoogleLoginRequest validReq = new GoogleLoginRequest();
        validReq.setIdToken("valid-google-token");
        validReq.setEmail("verified.student@seu.edu.bd");

        AuthResponse response = authService.loginWithGoogle(validReq);
        assertEquals("signed-jwt-token", response.getToken());
        assertEquals("verified.student@seu.edu.bd", response.getEmail());
        assertEquals("https://lh3.googleusercontent.com/avatar.png", response.getAvatarUrl());
        assertNotNull(response.getProfile());
    }

    @Test
    void authServiceLoginReusesPrincipalWithoutDuplicateUserQueryAndEmbedsProfile() {
        AuthService authService = new AuthService(
                userRepository, courseRepository, subscriptionRepository, unlockedCourseRepository,
                passwordEncoder, authenticationManager, tokenProvider, subscriptionService,
                liveSyncService, cloudinaryService, emailService
        );

        User student = new User("Fast Student", "fast.student@seu.edu.bd", "hash", "202400099", Role.ROLE_STUDENT);
        student.setId(77L);
        student.setEnabled(true);

        CustomUserDetails principal = new CustomUserDetails(student);
        Authentication auth = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());

        when(userRepository.findByEmail("fast.student@seu.edu.bd")).thenReturn(Optional.of(student));
        when(authenticationManager.authenticate(any())).thenReturn(auth);
        when(tokenProvider.generateToken(auth)).thenReturn("fast-jwt");
        when(subscriptionService.getValidActiveSubscription(77L)).thenReturn(Optional.empty());
        when(unlockedCourseRepository.findByUserId(77L)).thenReturn(List.of());

        AuthRequest loginReq = new AuthRequest();
        loginReq.setEmail("fast.student@seu.edu.bd");
        loginReq.setPassword("secret123");

        AuthResponse response = authService.login(loginReq);
        assertEquals("fast-jwt", response.getToken());
        assertNotNull(response.getProfile());
        assertEquals("Fast Student", response.getProfile().getName());
        assertFalse(response.getProfile().isHasActiveSubscription());

        // Pre-auth block check queries once; post-auth reuses CustomUserDetails principal cleanly
        verify(userRepository, times(1)).findByEmail("fast.student@seu.edu.bd");
    }

    @Test
    void liveSyncServiceBroadcastIsNonBlockingAndCleansDeadEmitters() throws InterruptedException {
        CountDownLatch attemptedBroadcastSend = new CountDownLatch(1);
        LiveSyncService service = new LiveSyncService() {
            @Override
            protected SseEmitter createEmitter() {
                return new SseEmitter(60_000L) {
                    private int sendCount = 0;

                    @Override
                    public void send(SseEventBuilder builder) throws IOException {
                        sendCount++;
                        if (sendCount == 1) {
                            return; // Initial "connected" handshake in subscribe() succeeds
                        }
                        try {
                            Thread.sleep(150);
                        } catch (InterruptedException ignored) {}
                        attemptedBroadcastSend.countDown();
                        throw new IOException("Simulated dead proxy socket");
                    }
                };
            }
        };

        try {
            service.subscribe();
            assertEquals(1, service.getActiveClientsCount());

            long startNanos = System.nanoTime();
            service.broadcast("course", "updated", 1);
            long callerElapsedMs = (System.nanoTime() - startNanos) / 1_000_000L;

            // broadcast() must hand off to its background executor immediately instead of blocking HTTP callers
            assertTrue(callerElapsedMs < 100, "broadcast blocked caller thread for " + callerElapsedMs + "ms");
            assertTrue(attemptedBroadcastSend.await(2, TimeUnit.SECONDS), "async broadcaster did not invoke emitter.send");

            // Give broadcaster a brief moment to remove the dead emitter after throwing IOException
            long deadline = System.currentTimeMillis() + 1000;
            while (service.getActiveClientsCount() > 0 && System.currentTimeMillis() < deadline) {
                Thread.sleep(20);
            }
            assertEquals(0, service.getActiveClientsCount());
        } finally {
            service.shutdown();
        }
    }

    @Test
    void superAdminExclusivityEnforcedOnPaymentsAndWaivers() throws Exception {
        Class<?> adminControllerClass = com.notelagbe.controller.AdminController.class;

        // Verify Payments endpoints strictly require SUPER_ADMIN
        org.springframework.security.access.prepost.PreAuthorize getPaymentsAuth =
                adminControllerClass.getMethod("getPayments", com.notelagbe.entity.PaymentStatus.class)
                        .getAnnotation(org.springframework.security.access.prepost.PreAuthorize.class);
        assertNotNull(getPaymentsAuth);
        assertEquals("hasRole('SUPER_ADMIN')", getPaymentsAuth.value());

        org.springframework.security.access.prepost.PreAuthorize approvePaymentAuth =
                adminControllerClass.getMethod("approvePayment", Long.class, Map.class, CustomUserDetails.class)
                        .getAnnotation(org.springframework.security.access.prepost.PreAuthorize.class);
        assertNotNull(approvePaymentAuth);
        assertEquals("hasRole('SUPER_ADMIN')", approvePaymentAuth.value());

        org.springframework.security.access.prepost.PreAuthorize rejectPaymentAuth =
                adminControllerClass.getMethod("rejectPayment", Long.class, Map.class, CustomUserDetails.class)
                        .getAnnotation(org.springframework.security.access.prepost.PreAuthorize.class);
        assertNotNull(rejectPaymentAuth);
        assertEquals("hasRole('SUPER_ADMIN')", rejectPaymentAuth.value());

        // Verify Waivers endpoints strictly require SUPER_ADMIN
        org.springframework.security.access.prepost.PreAuthorize getWaiversAuth =
                adminControllerClass.getMethod("getWaivers", com.notelagbe.entity.PaymentStatus.class)
                        .getAnnotation(org.springframework.security.access.prepost.PreAuthorize.class);
        assertNotNull(getWaiversAuth);
        assertEquals("hasRole('SUPER_ADMIN')", getWaiversAuth.value());

        org.springframework.security.access.prepost.PreAuthorize approveWaiverAuth =
                adminControllerClass.getMethod("approveWaiver", Long.class, Map.class, CustomUserDetails.class)
                        .getAnnotation(org.springframework.security.access.prepost.PreAuthorize.class);
        assertNotNull(approveWaiverAuth);
        assertEquals("hasRole('SUPER_ADMIN')", approveWaiverAuth.value());

        org.springframework.security.access.prepost.PreAuthorize rejectWaiverAuth =
                adminControllerClass.getMethod("rejectWaiver", Long.class, Map.class, CustomUserDetails.class)
                        .getAnnotation(org.springframework.security.access.prepost.PreAuthorize.class);
        assertNotNull(rejectWaiverAuth);
        assertEquals("hasRole('SUPER_ADMIN')", rejectWaiverAuth.value());
    }
}
