package com.notelagbe.security;

import com.notelagbe.dto.AuthRequest;
import com.notelagbe.dto.GoogleLoginRequest;
import com.notelagbe.entity.Role;
import com.notelagbe.entity.User;
import com.notelagbe.exception.ApiException;
import com.notelagbe.repository.CourseRepository;
import com.notelagbe.repository.SubscriptionRepository;
import com.notelagbe.repository.UnlockedCourseRepository;
import com.notelagbe.repository.UserRepository;
import com.notelagbe.service.AuthService;
import com.notelagbe.service.CloudinaryService;
import com.notelagbe.service.EmailService;
import com.notelagbe.service.LiveSyncService;
import com.notelagbe.service.SubscriptionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountBlockingEnforcementTest {

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
    @Mock private UserDetailsServiceImpl userDetailsService;

    private AuthService authService;
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
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
        jwtAuthenticationFilter = new JwtAuthenticationFilter(tokenProvider, userDetailsService);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private User makeBlockedStudent() {
        User user = new User();
        user.setId(42L);
        user.setName("Blocked Student");
        user.setEmail("blocked@seu.edu.bd");
        user.setRole(Role.ROLE_STUDENT);
        user.setEnabled(false);
        return user;
    }

    @Test
    void blockedStudentCannotLoginWithPassword() {
        User blocked = makeBlockedStudent();
        when(userRepository.findByEmail("blocked@seu.edu.bd")).thenReturn(Optional.of(blocked));

        AuthRequest req = new AuthRequest();
        req.setEmail("blocked@seu.edu.bd");
        req.setPassword("secret123");

        assertThrows(DisabledException.class, () -> authService.login(req));
        verify(authenticationManager, never()).authenticate(any());
        verify(tokenProvider, never()).generateToken(any());
    }

    @Test
    void blockedStudentCannotLoginWithGoogleSso() {
        User blocked = makeBlockedStudent();
        when(userRepository.findByEmail("blocked@seu.edu.bd")).thenReturn(Optional.of(blocked));

        AuthService verifiedGoogleAuthService = new AuthService(
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
        ) {
            @Override
            protected Map<String, Object> verifyGoogleIdToken(String idToken) {
                return Map.of(
                        "email", "blocked@seu.edu.bd",
                        "email_verified", "true",
                        "name", "Blocked Student"
                );
            }
        };

        GoogleLoginRequest req = new GoogleLoginRequest();
        req.setEmail("blocked@seu.edu.bd");
        req.setName("Blocked Student");
        req.setIdToken("verified.google.id.token");

        assertThrows(DisabledException.class, () -> verifiedGoogleAuthService.loginWithGoogle(req));
        verify(tokenProvider, never()).generateTokenFromUser(any());
    }

    @Test
    void googleSsoRejectsMissingIdTokenBeforeUserLookup() {
        GoogleLoginRequest req = new GoogleLoginRequest();
        req.setEmail("blocked@seu.edu.bd");
        req.setName("Blocked Student");

        ApiException ex = assertThrows(ApiException.class, () -> authService.loginWithGoogle(req));
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatus());
        verify(userRepository, never()).findByEmail(any());
        verify(tokenProvider, never()).generateTokenFromUser(any());
    }

    @Test
    void blockedStudentCannotRequestPasswordReset() {
        User blocked = makeBlockedStudent();
        when(userRepository.findByEmail("blocked@seu.edu.bd")).thenReturn(Optional.of(blocked));

        assertThrows(DisabledException.class, () -> authService.verifyEmailForPasswordReset("blocked@seu.edu.bd"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void jwtFilterRejectsExistingSessionTokenOfBlockedUserWithAccountBlockedCode() throws Exception {
        User blocked = makeBlockedStudent();
        CustomUserDetails userDetails = new CustomUserDetails(blocked);

        when(tokenProvider.validateToken("valid.jwt.token")).thenReturn(true);
        when(tokenProvider.getUsernameFromToken("valid.jwt.token")).thenReturn("blocked@seu.edu.bd");
        when(userDetailsService.loadUserByUsername("blocked@seu.edu.bd")).thenReturn(userDetails);

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/auth/me");
        request.addHeader("Authorization", "Bearer valid.jwt.token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain filterChain = new MockFilterChain();

        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        assertEquals(403, response.getStatus());
        assertTrue(response.getContentAsString().contains("ACCOUNT_BLOCKED"));
        assertTrue(response.getContentAsString().contains("\"blocked\":true"));
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void jwtFilterAllowsActiveUserSession() throws Exception {
        User active = makeBlockedStudent();
        active.setEnabled(true);
        CustomUserDetails userDetails = new CustomUserDetails(active);

        when(tokenProvider.validateToken("valid.jwt.token")).thenReturn(true);
        when(tokenProvider.getUsernameFromToken("valid.jwt.token")).thenReturn("blocked@seu.edu.bd");
        when(userDetailsService.loadUserByUsername("blocked@seu.edu.bd")).thenReturn(userDetails);

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/auth/me");
        request.addHeader("Authorization", "Bearer valid.jwt.token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain filterChain = new MockFilterChain();

        jwtAuthenticationFilter.doFilter(request, response, filterChain);

        assertEquals(200, response.getStatus());
        assertNotNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void consecutiveFiveFailedLoginAttempts_locksAccountFor30Minutes() {
        User student = makeBlockedStudent();
        student.setEnabled(true);
        student.setFailedLoginAttempts(4); // 4th attempt already failed
        when(userRepository.findByEmail("blocked@seu.edu.bd")).thenReturn(Optional.of(student));
        when(authenticationManager.authenticate(any())).thenThrow(new org.springframework.security.authentication.BadCredentialsException("Bad credentials"));

        AuthRequest req = new AuthRequest();
        req.setEmail("blocked@seu.edu.bd");
        req.setPassword("wrong-password");

        ApiException ex = assertThrows(ApiException.class, () -> authService.login(req));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatus());
        assertTrue(ex.getMessage().contains("৩০ মিনিটের জন্য"));
        assertNotNull(student.getLockoutUntil());
        assertTrue(student.getLockoutUntil().isAfter(java.time.LocalDateTime.now()));
        verify(userRepository, times(1)).save(student);
    }

    @Test
    void lockedAccountCannotLoginDuring30Minutes() {
        User student = makeBlockedStudent();
        student.setEnabled(true);
        student.setLockoutUntil(java.time.LocalDateTime.now().plusMinutes(25));
        when(userRepository.findByEmail("blocked@seu.edu.bd")).thenReturn(Optional.of(student));

        AuthRequest req = new AuthRequest();
        req.setEmail("blocked@seu.edu.bd");
        req.setPassword("correct-or-wrong");

        ApiException ex = assertThrows(ApiException.class, () -> authService.login(req));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatus());
        assertTrue(ex.getMessage().contains("মিনিট পর চেষ্টা করুন"));
        verify(authenticationManager, never()).authenticate(any());
    }

    @Test
    void expiredLockoutAutomaticallyUnlocksAccount() {
        User student = makeBlockedStudent();
        student.setEnabled(true);
        student.setFailedLoginAttempts(5);
        student.setLockoutUntil(java.time.LocalDateTime.now().minusMinutes(5)); // expired 5 mins ago
        when(userRepository.findByEmail("blocked@seu.edu.bd")).thenReturn(Optional.of(student));

        org.springframework.security.core.Authentication auth = mock(org.springframework.security.core.Authentication.class);
        when(auth.getPrincipal()).thenReturn(new CustomUserDetails(student));
        when(authenticationManager.authenticate(any())).thenReturn(auth);
        when(tokenProvider.generateToken(any())).thenReturn("valid.jwt.token");

        AuthRequest req = new AuthRequest();
        req.setEmail("blocked@seu.edu.bd");
        req.setPassword("valid-password");

        assertDoesNotThrow(() -> authService.login(req));
        assertNull(student.getLockoutUntil());
        assertEquals(0, student.getFailedLoginAttempts());
        verify(userRepository, atLeastOnce()).save(student);
    }
}
