package com.notelagbe.service;

import com.notelagbe.controller.AdminController;
import com.notelagbe.dto.GiftCourseRequest;
import com.notelagbe.dto.ReviewResponseDto;
import com.notelagbe.entity.*;
import com.notelagbe.exception.ApiException;
import com.notelagbe.repository.*;
import com.notelagbe.security.CustomUserDetails;
import com.notelagbe.service.review.ReviewModerationService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.CacheManager;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminAuditAndClearLogsTest {

    // Dependencies for real AdminService (verifySuperAdminPassword tests)
    @Mock private UserRepository userRepository;
    @Mock private TeacherRepository teacherRepository;
    @Mock private CourseRepository courseRepository;
    @Mock private ResourceRepository resourceRepository;
    @Mock private PaymentRequestRepository paymentRequestRepository;
    @Mock private ContributionRequestRepository contributionRequestRepository;
    @Mock private WaiverRequestRepository waiverRequestRepository;
    @Mock private ReviewRepository reviewRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private NotificationRepository notificationRepository;
    @Mock private UnlockedCourseRepository unlockedCourseRepository;
    @Mock private SubscriptionRepository subscriptionRepository;
    @Mock private UserCourseReviewRepository userCourseReviewRepository;
    @Mock private LiveSyncService liveSyncService;
    @Mock private NotificationService notificationService;
    @Mock private EmailService emailService;

    // Dependencies for AdminController audit & clear logs tests
    @Mock private AdminService adminServiceMock;
    @Mock private PaymentService paymentService;
    @Mock private ContributionService contributionService;
    @Mock private WaiverService waiverService;
    @Mock private ResourceService resourceService;
    @Mock private CourseService courseService;
    @Mock private TeacherService teacherService;
    @Mock private ReviewModerationService reviewModerationService;
    @Mock private AuthService authService;
    @Mock private NoticeService noticeService;
    @Mock private ChatService chatService;
    @Mock private ActivityLogService activityLogService;
    @Mock private SeuFacultySyncService seuFacultySyncService;
    @Mock private CacheManager cacheManager;
    @Mock private HttpServletRequest httpRequest;

    private AdminService realAdminService;
    private AdminController adminController;

    private User superAdmin;
    private User regularAdmin;
    private User student;
    private Course course;
    private Teacher teacher;

    @BeforeEach
    void setUp() {
        realAdminService = new AdminService(
                userRepository, teacherRepository, courseRepository, resourceRepository,
                paymentRequestRepository, contributionRequestRepository, waiverRequestRepository,
                reviewRepository, passwordEncoder, notificationRepository, unlockedCourseRepository,
                subscriptionRepository, userCourseReviewRepository, liveSyncService,
                notificationService, emailService);

        adminController = new AdminController(
                adminServiceMock, paymentService, contributionService, waiverService,
                resourceService, courseService, teacherService, emailService,
                reviewModerationService, authService, noticeService, chatService,
                activityLogService, seuFacultySyncService, userRepository,
                cacheManager, httpRequest);

        superAdmin = new User();
        superAdmin.setId(1L);
        superAdmin.setName("Super Admin");
        superAdmin.setEmail("superadmin@seu.edu.bd");
        superAdmin.setRole(Role.ROLE_SUPER_ADMIN);
        superAdmin.setPassword("$2a$10$encodedSuperSecret");

        regularAdmin = new User();
        regularAdmin.setId(2L);
        regularAdmin.setName("Campus Moderator");
        regularAdmin.setEmail("admin@seu.edu.bd");
        regularAdmin.setRole(Role.ROLE_ADMIN);
        regularAdmin.setPassword("$2a$10$encodedAdminSecret");

        student = new User();
        student.setId(10L);
        student.setName("Md. Fazley Rabbi");
        student.setEmail("2023200000686@seu.edu.bd");
        student.setRole(Role.ROLE_STUDENT);

        course = new Course();
        course.setId(100L);
        course.setCode("CSE361");
        course.setTitle("Operating Systems");

        teacher = new Teacher();
        teacher.setId(201L);
        teacher.setName("Md. Nahid Anam Opu");
        teacher.setInitial("NAAO");
    }

    @Test
    void verifySuperAdminPassword_rejectsNonSuperAdmin() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(regularAdmin));

        ApiException ex = assertThrows(ApiException.class,
                () -> realAdminService.verifySuperAdminPassword(regularAdmin, "any-pass"));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatus());
        verify(passwordEncoder, never()).matches(anyString(), anyString());
    }

    @Test
    void verifySuperAdminPassword_rejectsBlankAndWrongPasswords_acceptsValidPassword() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(superAdmin));

        ApiException blankEx = assertThrows(ApiException.class,
                () -> realAdminService.verifySuperAdminPassword(superAdmin, "   "));
        assertEquals(HttpStatus.BAD_REQUEST, blankEx.getStatus());

        when(passwordEncoder.matches("wrong-pass", superAdmin.getPassword())).thenReturn(false);
        ApiException wrongEx = assertThrows(ApiException.class,
                () -> realAdminService.verifySuperAdminPassword(superAdmin, "wrong-pass"));
        assertEquals(HttpStatus.UNAUTHORIZED, wrongEx.getStatus());

        when(passwordEncoder.matches("correct-pass", superAdmin.getPassword())).thenReturn(true);
        User verified = realAdminService.verifySuperAdminPassword(superAdmin, "correct-pass");
        assertSame(superAdmin, verified);
    }

    @Test
    void verificationQueuesLogPerformingAdminAndTargetStudent() {
        CustomUserDetails adminDetails = new CustomUserDetails(regularAdmin);

        // 1. Subscription Payment Approval
        PaymentRequest payment = mock(PaymentRequest.class);
        when(payment.getUser()).thenReturn(student);
        when(payment.getTransactionId()).thenReturn("TRX-9988");
        when(payment.getAmount()).thenReturn(200.0);
        when(paymentService.approvePayment(11L, "Verified bKash")).thenReturn(payment);

        adminController.approvePayment(11L, Map.of("notes", "Verified bKash"), adminDetails);

        verify(activityLogService).logActivity(
                eq("PAYMENT_APPROVE"),
                eq("BILLING"),
                argThat(d -> d.contains("[ADMIN] Campus Moderator (admin@seu.edu.bd)")
                        && d.contains("Payment #11")
                        && d.contains("TRX-9988")
                        && d.contains("2023200000686@seu.edu.bd")),
                eq(regularAdmin),
                eq(httpRequest));

        // 2. Student Submission Approval
        ContributionRequest contribution = mock(ContributionRequest.class);
        Resource res = mock(Resource.class);
        Course reward1 = mock(Course.class);
        Course reward2 = mock(Course.class);
        when(res.getTitle()).thenReturn("OS Mid Fall 2026");
        when(res.getCourse()).thenReturn(course);
        when(res.getTeacher()).thenReturn(teacher);
        when(reward1.getCode()).thenReturn("CSE355");
        when(reward2.getCode()).thenReturn("CSE441");
        when(contribution.getUploadedResource()).thenReturn(res);
        when(contribution.getRequestedCourse1()).thenReturn(reward1);
        when(contribution.getRequestedCourse2()).thenReturn(reward2);
        when(contribution.getUser()).thenReturn(student);
        when(contributionService.approveContribution(eq(22L), anyString(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(contribution);

        adminController.approveContribution(22L, Map.of("feedback", "Great notes"), adminDetails);

        verify(activityLogService).logActivity(
                eq("CONTRIBUTION_APPROVE"),
                eq("CONTENT"),
                argThat(d -> d.contains("[ADMIN] Campus Moderator (admin@seu.edu.bd)")
                        && d.contains("Student Submission #22")
                        && d.contains("OS Mid Fall 2026")
                        && d.contains("CSE355, CSE441")),
                eq(regularAdmin),
                eq(httpRequest));

        // 3. Financial Waiver Approval
        WaiverRequest waiver = mock(WaiverRequest.class);
        when(waiver.getUser()).thenReturn(student);
        when(waiver.getStudentId()).thenReturn("2023200000686");
        when(waiverService.approveWaiver(33L, 4, "Need verified")).thenReturn(waiver);

        adminController.approveWaiver(33L, Map.of("grantedCoursesCount", 4, "notes", "Need verified"), adminDetails);

        verify(activityLogService).logActivity(
                eq("WAIVER_APPROVE"),
                eq("BILLING"),
                argThat(d -> d.contains("[ADMIN] Campus Moderator (admin@seu.edu.bd)")
                        && d.contains("Financial Waiver #33")
                        && d.contains("Quota: 4 courses")
                        && d.contains("2023200000686")),
                eq(regularAdmin),
                eq(httpRequest));

        // 4. Faculty Review Approval (preserves anonymous label when anonymous)
        ReviewResponseDto reviewDto = new ReviewResponseDto();
        reviewDto.setId(44L);
        reviewDto.setCourseCode("CSE361");
        reviewDto.setTeacherName("Md. Nahid Anam Opu");
        reviewDto.setRating(5);
        reviewDto.setAuthorName("Anonymous Student");
        when(reviewModerationService.approveReview(44L)).thenReturn(reviewDto);

        adminController.approveReview(44L, adminDetails);

        verify(activityLogService).logActivity(
                eq("REVIEW_APPROVE"),
                eq("ACADEMIC"),
                argThat(d -> d.contains("[ADMIN] Campus Moderator (admin@seu.edu.bd)")
                        && d.contains("Faculty Review #44")
                        && d.contains("Anonymous Student")
                        && !d.contains("2023200000686@seu.edu.bd")),
                eq(regularAdmin),
                eq(httpRequest));
    }

    @Test
    void adminGiftAndRevokeRecordPerformingSuperAdminAndTargetDetails() {
        CustomUserDetails superDetails = new CustomUserDetails(superAdmin);

        GiftCourseRequest giftReq = new GiftCourseRequest("CSE361", 201L, 3, "Top contributor");
        when(adminServiceMock.giftCourseToStudent(eq(10L), eq(giftReq), eq(superAdmin))).thenReturn(Map.of(
                "studentName", "Md. Fazley Rabbi",
                "studentEmail", "2023200000686@seu.edu.bd",
                "teacherName", "Md. Nahid Anam Opu",
                "teacherInitial", "NAAO",
                "isExtension", false
        ));

        adminController.giftCourseToStudent(10L, giftReq, superDetails);

        verify(activityLogService).logActivity(
                eq("COURSE_GIFT"),
                eq("USER_MANAGEMENT"),
                argThat(d -> d.contains("[SUPER_ADMIN] Super Admin (superadmin@seu.edu.bd)")
                        && d.contains("CSE361")
                        && d.contains("Md. Nahid Anam Opu [NAAO]")
                        && d.contains("2023200000686@seu.edu.bd")
                        && d.contains("Top contributor")),
                eq(superAdmin),
                eq(httpRequest));

        when(adminServiceMock.revokeStudentUnlockedCourse(10L, 100L, 500L, 201L, superAdmin)).thenReturn(Map.of(
                "studentName", "Md. Fazley Rabbi",
                "studentEmail", "2023200000686@seu.edu.bd",
                "courseCode", "CSE361",
                "teacherName", "Md. Nahid Anam Opu",
                "teacherInitial", "NAAO",
                "source", "ADMIN_GIFT"
        ));

        adminController.revokeStudentUnlockedCourse(10L, 100L, 500L, 201L, superDetails);

        verify(activityLogService).logActivity(
                eq("COURSE_REVOKE"),
                eq("USER_MANAGEMENT"),
                argThat(d -> d.contains("[SUPER_ADMIN] Super Admin (superadmin@seu.edu.bd)")
                        && d.contains("revoked CSE361")
                        && d.contains("ADMIN_GIFT")
                        && d.contains("2023200000686@seu.edu.bd")),
                eq(superAdmin),
                eq(httpRequest));
    }

    @Test
    void clearActivityLogsRequiresValidSuperAdminPasswordAndLogsFailures() {
        CustomUserDetails superDetails = new CustomUserDetails(superAdmin);

        when(adminServiceMock.verifySuperAdminPassword(superAdmin, "wrong"))
                .thenThrow(new ApiException("Incorrect Super Admin password! Logs were not cleared.", HttpStatus.UNAUTHORIZED));

        ApiException ex = assertThrows(ApiException.class,
                () -> adminController.clearActivityLogsWithPassword(Map.of("password", "wrong"), superDetails));
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());

        verify(activityLogService, never()).clearAllLogs();
        verify(activityLogService).logActivity(
                eq("LOGS_CLEAR_DENIED"),
                eq("SYSTEM"),
                argThat(d -> d.contains("[SUPER_ADMIN] Super Admin (superadmin@seu.edu.bd)")
                        && d.contains("Incorrect Super Admin password")),
                eq("superadmin@seu.edu.bd"),
                eq("Super Admin"),
                eq("ROLE_SUPER_ADMIN"),
                anyString(),
                anyString(),
                eq("FAILED"));

        when(adminServiceMock.verifySuperAdminPassword(superAdmin, "correct")).thenReturn(superAdmin);

        ResponseEntity<Map<String, String>> response =
                adminController.clearActivityLogsWithPassword(Map.of("password", "correct"), superDetails);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(activityLogService, times(1)).clearAllLogs();
    }
}
