package com.notelagbe.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.notelagbe.dto.AuthResponse;
import com.notelagbe.dto.PaymentSubmitRequest;
import com.notelagbe.dto.RegisterRequest;
import com.notelagbe.entity.*;
import com.notelagbe.exception.ApiException;
import com.notelagbe.repository.*;
import com.notelagbe.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class StudentEmailFlowsTest {

    @Mock private UserRepository userRepository;
    @Mock private CourseRepository courseRepository;
    @Mock private SubscriptionRepository subscriptionRepository;
    @Mock private UnlockedCourseRepository unlockedCourseRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private JwtTokenProvider tokenProvider;
    @Mock private SubscriptionService subscriptionService;
    @Mock private LiveSyncService liveSyncService;
    @Mock private CloudinaryService cloudinaryService;
    @Mock private EmailService emailService;

    @Mock private PaymentRequestRepository paymentRequestRepository;
    @Mock private NotificationService notificationService;
    @Mock private InputSanitizationService inputSanitizationService;

    @Mock private ContributionRequestRepository contributionRequestRepository;
    @Mock private ResourceRepository resourceRepository;
    @Mock private TeacherRepository teacherRepository;
    @Mock private TeacherCourseRepository teacherCourseRepository;
    @Mock private ResourceDuplicateService resourceDuplicateService;

    private AuthService authService;
    private PaymentService paymentService;
    private ContributionService contributionService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository, courseRepository, subscriptionRepository, unlockedCourseRepository,
                passwordEncoder, authenticationManager, tokenProvider, subscriptionService,
                liveSyncService, cloudinaryService, emailService
        );

        paymentService = new PaymentService(
                paymentRequestRepository, subscriptionRepository, unlockedCourseRepository,
                courseRepository, new ObjectMapper(), notificationService, emailService,
                liveSyncService, inputSanitizationService,
                org.mockito.Mockito.mock(PricingCampaignService.class)
        );

        contributionService = new ContributionService(
                contributionRequestRepository, resourceRepository, courseRepository,
                teacherRepository, teacherCourseRepository, unlockedCourseRepository,
                liveSyncService, inputSanitizationService, notificationService,
                resourceDuplicateService
        );
        contributionService.setEmailService(emailService);
    }

    @Test
    void successfulRegistrationDispatchesWelcomeEmail() {
        RegisterRequest req = new RegisterRequest();
        req.setName("Fazle Rabbi");
        req.setEmail("fazlerabbicse65@gmail.com");
        req.setPassword("secret123");
        req.setStudentId("2024100010045");
        req.setPhone("01712345678");

        when(userRepository.findByEmailIgnoreCase("fazlerabbicse65@gmail.com")).thenReturn(Optional.empty());
        when(userRepository.findByPhone("01712345678")).thenReturn(Optional.empty());
        when(userRepository.existsByStudentId("2024100010045")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_pass");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(99L);
            return u;
        });
        when(tokenProvider.generateTokenFromUser(any(User.class))).thenReturn("valid.jwt.token");

        AuthResponse resp = authService.register(req);

        assertNotNull(resp);
        assertEquals("fazlerabbicse65@gmail.com", resp.getEmail());
        verify(emailService, times(1)).sendStudentWelcomeEmail(any(User.class));
    }

    @Test
    void failedRegistrationDueToDuplicateEmailNeverDispatchesEmail() {
        RegisterRequest req = new RegisterRequest();
        req.setName("Duplicate User");
        req.setEmail("taken@seu.edu.bd");
        req.setPassword("secret123");

        User existing = new User();
        existing.setId(10L);
        existing.setEmail("taken@seu.edu.bd");
        when(userRepository.findByEmailIgnoreCase("taken@seu.edu.bd")).thenReturn(Optional.of(existing));

        assertThrows(ApiException.class, () -> authService.register(req));
        verify(emailService, never()).sendStudentWelcomeEmail(any());
    }

    @Test
    void failedRegistrationDueToDuplicateStudentIdNeverDispatchesEmail() {
        RegisterRequest req = new RegisterRequest();
        req.setName("Test Student");
        req.setEmail("unique@seu.edu.bd");
        req.setPassword("secret123");
        req.setStudentId("2022100010045");

        when(userRepository.findByEmailIgnoreCase("unique@seu.edu.bd")).thenReturn(Optional.empty());
        when(userRepository.existsByStudentId("2022100010045")).thenReturn(true);

        assertThrows(ApiException.class, () -> authService.register(req));
        verify(emailService, never()).sendStudentWelcomeEmail(any());
    }

    @Test
    void paymentSubmissionDispatchesPendingReviewEmailAndNotification() {
        User student = new User();
        student.setId(15L);
        student.setName("Payment Tester");
        student.setEmail("payment@seu.edu.bd");

        PaymentSubmitRequest submitReq = new PaymentSubmitRequest();
        submitReq.setPlanType(PlanType.SEMESTER_1);
        submitReq.setPaymentMethod(PaymentMethod.BKASH);
        submitReq.setTransactionId("TRX12345678");
        submitReq.setSenderPhone("01779326236");

        when(inputSanitizationService.sanitizeAndValidateTransactionId("TRX12345678")).thenReturn("TRX12345678");
        when(inputSanitizationService.sanitizeAndValidatePhoneNumber("01779326236")).thenReturn("01779326236");
        when(inputSanitizationService.sanitizePlainText(any())).thenReturn(null);
        when(paymentRequestRepository.findByTransactionIdOrderByCreatedAtDesc("TRX12345678"))
                .thenReturn(Collections.emptyList());
        when(paymentRequestRepository.saveAndFlush(any(PaymentRequest.class)))
                .thenAnswer(invocation -> {
                    PaymentRequest pr = invocation.getArgument(0);
                    pr.setId(77L);
                    return pr;
                });

        PaymentRequest pr = paymentService.submitPayment(submitReq, student);

        assertNotNull(pr);
        assertEquals(PaymentStatus.PENDING, pr.getStatus());
        verify(notificationService, times(1)).createNotification(
                eq(student), contains("Payment Under Review"), anyString(), eq("PAYMENT_SUBMITTED"), eq("/pricing")
        );
        verify(emailService, times(1)).notifySuperAdminNewPaymentSubmission(
                eq(student), eq(pr)
        );
        verify(emailService, never()).sendPaymentSubmissionPendingEmail(any(), any(), anyDouble(), anyString(), any(), any());
    }

    @Test
    void contributionApprovalDispatchesContributionApprovalEmail() {
        User contributor = new User();
        contributor.setId(42L);
        contributor.setName("Top Contributor");
        contributor.setEmail("contributor@seu.edu.bd");

        Course course = new Course();
        course.setId(101L);
        course.setCode("CSE241");

        Course reward1 = new Course();
        reward1.setId(102L);
        reward1.setCode("CSE343");

        Course reward2 = new Course();
        reward2.setId(103L);
        reward2.setCode("CSE362");

        Resource resource = new Resource();
        resource.setId(505L);
        resource.setTitle("Algorithms Lecture Hand Notes Midterm");
        resource.setCourse(course);
        resource.setStatus(ResourceStatus.PENDING);

        ContributionRequest cr = new ContributionRequest();
        cr.setId(88L);
        cr.setUser(contributor);
        cr.setUploadedResource(resource);
        cr.setRequestedCourse1(reward1);
        cr.setRequestedCourse2(reward2);
        cr.setStatus(ResourceStatus.PENDING);

        when(contributionRequestRepository.findById(88L)).thenReturn(Optional.of(cr));
        when(resourceDuplicateService.normalizeSemesterName(any())).thenReturn("Summer 2025");
        when(resourceDuplicateService.resolveAcademicYear(any(), anyInt())).thenReturn(2025);
        when(contributionRequestRepository.save(any(ContributionRequest.class))).thenReturn(cr);

        ContributionRequest approved = contributionService.approveContribution(88L, "Excellent verified notes!");

        assertNotNull(approved);
        assertEquals(ResourceStatus.APPROVED, approved.getStatus());
        verify(emailService, times(1)).sendContributionApprovalEmail(
                eq(contributor),
                eq("Algorithms Lecture Hand Notes Midterm"),
                eq("CSE241"),
                eq("CSE343"),
                eq("CSE362"),
                eq("Excellent verified notes!")
        );
    }
}
