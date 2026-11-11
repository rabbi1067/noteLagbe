package com.notelagbe.security;

import com.notelagbe.entity.Role;
import com.notelagbe.entity.User;
import com.notelagbe.exception.ApiException;
import com.notelagbe.exception.ResourceNotFoundException;
import com.notelagbe.repository.CourseRepository;
import com.notelagbe.repository.SubscriptionRepository;
import com.notelagbe.repository.UnlockedCourseRepository;
import com.notelagbe.repository.UserRepository;
import com.notelagbe.service.AuthService;
import com.notelagbe.service.CloudinaryService;
import com.notelagbe.service.EmailService;
import com.notelagbe.service.LiveSyncService;
import com.notelagbe.service.SubscriptionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PasswordResetSecurityTest {

    @Mock private UserRepository userRepository;
    @Mock private CourseRepository courseRepository;
    @Mock private SubscriptionRepository subscriptionRepository;
    @Mock private UnlockedCourseRepository unlockedCourseRepository;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private JwtTokenProvider tokenProvider;
    @Mock private SubscriptionService subscriptionService;
    @Mock private LiveSyncService liveSyncService;
    @Mock private CloudinaryService cloudinaryService;
    @Mock private EmailService emailService;

    private PasswordEncoder passwordEncoder;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder();
        authService = new AuthService(
                userRepository,
                courseRepository,
                subscriptionRepository,
                unlockedCourseRepository,
                passwordEncoder,
                authenticationManager,
                tokenProvider,
                subscriptionService,
                liveSyncService,
                cloudinaryService,
                emailService
        );
    }

    private User makeStudent() {
        User u = new User();
        u.setId(101L);
        u.setName("Fazle Rabbi");
        u.setEmail("student@seu.edu.bd");
        u.setStudentId("2022100010045");
        u.setPassword(passwordEncoder.encode("OldPass123"));
        u.setRole(Role.ROLE_STUDENT);
        u.setEnabled(true);
        return u;
    }

    @Test
    void unknownEmailReturnsNotExistsWithoutSendingCode() {
        when(userRepository.findByEmail("unknown@seu.edu.bd")).thenReturn(Optional.empty());

        ResourceNotFoundException ex = assertThrows(
                ResourceNotFoundException.class,
                () -> authService.verifyEmailForPasswordReset("unknown@seu.edu.bd")
        );
        assertEquals("This email does not exist.", ex.getMessage());
        verifyNoInteractions(emailService);
        verify(userRepository, never()).save(any());
    }

    @Test
    void requestingResetSendsOtpEmailAndNeverLeaksTokenOrUserDetails() {
        User student = makeStudent();
        when(userRepository.findByEmail("student@seu.edu.bd")).thenReturn(Optional.of(student));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> res = authService.verifyEmailForPasswordReset("student@seu.edu.bd");

        assertEquals(Boolean.TRUE, res.get("success"));
        assertEquals(Boolean.TRUE, res.get("codeSent"));
        assertNull(res.get("resetToken"), "Reset token MUST NOT be issued before OTP verification");
        assertNull(res.get("studentId"), "Student ID MUST NOT be exposed before OTP verification");
        assertNull(res.get("name"), "Name MUST NOT be exposed before OTP verification");

        ArgumentCaptor<String> otpCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendPasswordResetCodeEmail(eq(student), otpCaptor.capture(), eq(10));
        String sentOtp = otpCaptor.getValue();
        assertTrue(sentOtp.matches("\\d{6}"), "Security code must be 6 numeric digits");
        assertNotEquals(sentOtp, student.getResetOtpHash(), "OTP stored in DB must be hashed");
        assertTrue(passwordEncoder.matches(sentOtp, student.getResetOtpHash()));
    }

    @Test
    void cannotResetPasswordWithoutVerifyingOtpFirst() {
        User student = makeStudent();
        student.setResetOtpHash(passwordEncoder.encode("123456"));
        student.setResetOtpExpiry(LocalDateTime.now().plusMinutes(10));
        when(userRepository.findByEmail("student@seu.edu.bd")).thenReturn(Optional.of(student));

        assertThrows(
                ApiException.class,
                () -> authService.resetPasswordWithToken("student@seu.edu.bd", "forged-token", "NewPass999")
        );
        verify(userRepository, never()).save(any());
    }

    @Test
    void fiveWrongOtpAttemptsInvalidateSecurityCode() {
        User student = makeStudent();
        student.setResetOtpHash(passwordEncoder.encode("654321"));
        student.setResetOtpExpiry(LocalDateTime.now().plusMinutes(10));
        student.setResetOtpAttempts(0);
        when(userRepository.findByEmail("student@seu.edu.bd")).thenReturn(Optional.of(student));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        for (int i = 1; i <= 5; i++) {
            assertThrows(ApiException.class, () -> authService.verifyPasswordResetCode("student@seu.edu.bd", "000000"));
        }

        assertNull(student.getResetOtpHash(), "OTP hash must be wiped after 5 failed attempts");
        assertNull(student.getResetOtpExpiry());

        // Even submitting the real code after lockout must fail
        assertThrows(ApiException.class, () -> authService.verifyPasswordResetCode("student@seu.edu.bd", "654321"));
    }

    @Test
    void expiredOtpCannotBeVerified() {
        User student = makeStudent();
        student.setResetOtpHash(passwordEncoder.encode("123456"));
        student.setResetOtpExpiry(LocalDateTime.now().minusSeconds(5));
        when(userRepository.findByEmail("student@seu.edu.bd")).thenReturn(Optional.of(student));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        ApiException ex = assertThrows(
                ApiException.class,
                () -> authService.verifyPasswordResetCode("student@seu.edu.bd", "123456")
        );
        assertTrue(ex.getMessage().toLowerCase().contains("expired"));
        assertNull(student.getResetOtpHash());
    }

    @Test
    void fullOtpVerificationFlowResetsPasswordOnceAndRejectsReuse() {
        User student = makeStudent();
        when(userRepository.findByEmail("student@seu.edu.bd")).thenReturn(Optional.of(student));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        // Step 1: Request OTP
        authService.verifyEmailForPasswordReset("student@seu.edu.bd");
        ArgumentCaptor<String> otpCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendPasswordResetCodeEmail(eq(student), otpCaptor.capture(), eq(10));
        String otp = otpCaptor.getValue();

        // Step 2: Verify OTP -> single-use resetToken issued (stored hashed in DB)
        Map<String, Object> verifyRes = authService.verifyPasswordResetCode("student@seu.edu.bd", otp);
        assertEquals(Boolean.TRUE, verifyRes.get("verified"));
        String resetToken = (String) verifyRes.get("resetToken");
        assertNotNull(resetToken);
        assertNotEquals(resetToken, student.getResetToken(), "Reset token must be hashed in DB");
        assertNull(student.getResetOtpHash(), "OTP must be consumed upon verification");

        // Reusing same OTP must fail
        assertThrows(ApiException.class, () -> authService.verifyPasswordResetCode("student@seu.edu.bd", otp));

        // Step 3: Reset password with issued resetToken
        Map<String, Object> resetRes = authService.resetPasswordWithToken("student@seu.edu.bd", resetToken, "BrandNewPass!2026");
        assertEquals(Boolean.TRUE, resetRes.get("success"));
        assertTrue(passwordEncoder.matches("BrandNewPass!2026", student.getPassword()));
        assertNull(student.getResetToken(), "Reset token must be cleared after use");

        // Reusing same resetToken must fail
        assertThrows(ApiException.class, () -> authService.resetPasswordWithToken("student@seu.edu.bd", resetToken, "AnotherPass123"));
    }

    @Test
    void resendCooldownPreventsEmailSpam() {
        User student = makeStudent();
        student.setResetOtpLastSentAt(LocalDateTime.now().minusSeconds(10));
        when(userRepository.findByEmail("student@seu.edu.bd")).thenReturn(Optional.of(student));

        ApiException ex = assertThrows(
                ApiException.class,
                () -> authService.verifyEmailForPasswordReset("student@seu.edu.bd")
        );
        assertTrue(ex.getMessage().toLowerCase().contains("wait"));
        verifyNoInteractions(emailService);
    }
}
