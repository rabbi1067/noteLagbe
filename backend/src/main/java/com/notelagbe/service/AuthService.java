package com.notelagbe.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.notelagbe.dto.AuthRequest;
import com.notelagbe.dto.AuthResponse;
import com.notelagbe.dto.GoogleLoginRequest;
import com.notelagbe.dto.RegisterRequest;
import com.notelagbe.dto.UserProfileResponse;
import com.notelagbe.entity.*;
import com.notelagbe.exception.ApiException;
import com.notelagbe.exception.ResourceNotFoundException;
import com.notelagbe.repository.CourseRepository;
import com.notelagbe.repository.SubscriptionRepository;
import com.notelagbe.repository.UnlockedCourseRepository;
import com.notelagbe.repository.UserRepository;
import com.notelagbe.util.UserValidationHelper;
import com.notelagbe.security.CustomUserDetails;
import com.notelagbe.security.FileUploadSecurityValidator;
import com.notelagbe.security.JwtTokenProvider;
import com.notelagbe.security.UrlSecurityValidator;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final UnlockedCourseRepository unlockedCourseRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final SubscriptionService subscriptionService;
    private final LiveSyncService liveSyncService;
    private final CloudinaryService cloudinaryService;
    private final EmailService emailService;

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AuthService.class);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final ObjectMapper JSON_MAPPER = new ObjectMapper();
    private static final int OTP_EXPIRY_MINUTES = 10;
    private static final int RESET_TOKEN_EXPIRY_MINUTES = 10;
    private static final int OTP_RESEND_COOLDOWN_SECONDS = 45;
    private static final int MAX_OTP_ATTEMPTS = 5;

    @org.springframework.beans.factory.annotation.Value("${app.admin.initial-email:}")
    private String initialAdminEmail;

    @org.springframework.beans.factory.annotation.Value("${app.admin.owner-email:}")
    private String ownerAdminEmail;

    @org.springframework.beans.factory.annotation.Value("${app.google.client-id:}")
    private String googleClientId;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.notelagbe.security.UserDetailsServiceImpl userDetailsServiceImpl;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private org.springframework.cache.CacheManager cacheManager;

    void setGoogleClientId(String googleClientId) {
        this.googleClientId = googleClientId;
    }

    public AuthService(UserRepository userRepository,
                       CourseRepository courseRepository,
                       SubscriptionRepository subscriptionRepository,
                       UnlockedCourseRepository unlockedCourseRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtTokenProvider tokenProvider,
                       SubscriptionService subscriptionService,
                       LiveSyncService liveSyncService,
                       CloudinaryService cloudinaryService,
                       EmailService emailService) {
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.unlockedCourseRepository = unlockedCourseRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.tokenProvider = tokenProvider;
        this.subscriptionService = subscriptionService;
        this.liveSyncService = liveSyncService;
        this.cloudinaryService = cloudinaryService;
        this.emailService = emailService;
    }

    private void assertUserNotBlocked(User user) {
        if (user != null && !user.isEnabled()) {
            throw new DisabledException(
                    "Your account has been blocked by an administrator. Please contact support for assistance."
            );
        }
    }

    private void assertUserNotLocked(User user) {
        if (user != null && user.getLockoutUntil() != null) {
            LocalDateTime now = LocalDateTime.now();
            if (now.isBefore(user.getLockoutUntil())) {
                long remainingMinutes = Math.max(1, Duration.between(now, user.getLockoutUntil()).toMinutes() + 1);
                throw new ApiException(
                        "Account temporarily locked due to multiple failed login attempts. Please try again after "
                                + remainingMinutes + " minute" + (remainingMinutes > 1 ? "s" : "") + ".",
                        "অ্যাকাউন্টে একাধিক ভুল প্রচেষ্টার কারণে সাময়িকভাবে ব্লক করা হয়েছে। অনুগ্রহ করে আরও "
                                + remainingMinutes + " মিনিট পর চেষ্টা করুন।",
                        HttpStatus.TOO_MANY_REQUESTS
                );
            } else {
                // Lockout duration has expired! Automatically unlock account
                user.setLockoutUntil(null);
                user.setFailedLoginAttempts(0);
                userRepository.save(user);
                evictCachedUser(user.getEmail());
            }
        }
    }

    private Optional<User> findUserForLogin(String cleanEmail) {
        if (userDetailsServiceImpl != null) {
            return userDetailsServiceImpl.findUserCachedOrLoad(cleanEmail);
        }
        return userRepository.findByEmail(cleanEmail);
    }

    private void evictCachedUser(String email) {
        if (userDetailsServiceImpl != null && email != null) {
            userDetailsServiceImpl.evictUserCache(email);
        }
    }

    @SuppressWarnings("unchecked")
    private List<String> getCachedCourseCodes() {
        if (courseRepository == null) {
            return List.of();
        }
        org.springframework.cache.Cache cache = cacheManager != null
                ? cacheManager.getCache(com.notelagbe.config.CacheConfig.CACHE_COURSE_CODES)
                : null;
        if (cache != null) {
            List<String> cached = cache.get("all", List.class);
            if (cached != null && !cached.isEmpty()) {
                return cached;
            }
        }
        List<String> codes = courseRepository.findAllCourseCodes();
        if (codes == null || codes.isEmpty()) {
            codes = courseRepository.findAll().stream().map(Course::getCode).toList();
        }
        if (cache != null && codes != null && !codes.isEmpty()) {
            cache.put("all", codes);
        }
        return codes != null ? codes : List.of();
    }

    public AuthResponse login(AuthRequest request) {
        String cleanEmail = request.getEmail().toLowerCase().trim();
        Optional<User> userOpt = findUserForLogin(cleanEmail);
        if (userOpt.isPresent()) {
            User existing = userOpt.get();
            assertUserNotBlocked(existing);
            assertUserNotLocked(existing);
        }

        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(cleanEmail, request.getPassword())
            );
        } catch (org.springframework.security.core.AuthenticationException ex) {
            // Check if user exists to record failed login attempt and enforce 30-minute lockout
            Optional<User> targetUserOpt = userRepository.findByEmail(cleanEmail);
            if (targetUserOpt.isPresent()) {
                User u = targetUserOpt.get();
                assertUserNotBlocked(u);
                assertUserNotLocked(u);

                int attempts = u.getFailedLoginAttempts() + 1;
                u.setFailedLoginAttempts(attempts);
                if (attempts >= 5) {
                    u.setLockoutUntil(LocalDateTime.now().plusMinutes(30));
                    userRepository.save(u);
                    evictCachedUser(cleanEmail);
                    throw new ApiException(
                            "Account temporarily locked for 30 minutes due to 5 consecutive failed login attempts.",
                            "অ্যাকাউন্টে ৫ বার ভুল পাসওয়ার্ড দেওয়ার কারণে ৩০ মিনিটের জন্য সাময়িকভাবে ব্লক করা হয়েছে। ৩০ মিনিট পর স্বয়ংক্রিয়ভাবে আনলক হবে।",
                            HttpStatus.TOO_MANY_REQUESTS
                    );
                } else {
                    userRepository.save(u);
                    evictCachedUser(cleanEmail);
                    int remaining = 5 - attempts;
                    // Only warn about 30-minute lockout after 2-3 failed attempts (attempts >= 3, i.e., remaining <= 2)
                    if (attempts >= 3) {
                        throw new ApiException(
                                "Invalid credentials. " + remaining + " attempt" + (remaining > 1 ? "s" : "") + " remaining before a 30-minute lockout.",
                                "ইমেইল অথবা পাসওয়ার্ড সঠিক নয়। আর " + remaining + " বার ভুল হলে অ্যাকাউন্ট ৩০ মিনিটের জন্য লক হয়ে যাবে।",
                                HttpStatus.UNAUTHORIZED
                        );
                    } else {
                        throw new ApiException(
                                "Invalid email or password.",
                                "ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।",
                                HttpStatus.UNAUTHORIZED
                        );
                    }
                }
            }
            throw new ApiException(
                    "Invalid email or password.",
                    "ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।",
                    HttpStatus.UNAUTHORIZED
            );
        }

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String token = tokenProvider.generateToken(authentication);

        User user = (authentication != null && authentication.getPrincipal() instanceof CustomUserDetails cud && cud.getUser() != null)
                ? cud.getUser()
                : userRepository.findByEmail(cleanEmail)
                        .orElseThrow(() -> new ApiException("User not found"));
        assertUserNotBlocked(user);

        // Reset failed login attempts on successful login
        if (user.getFailedLoginAttempts() > 0 || user.getLockoutUntil() != null) {
            user.setFailedLoginAttempts(0);
            user.setLockoutUntil(null);
            userRepository.save(user);
            evictCachedUser(user.getEmail());
        }

        AuthResponse response = new AuthResponse(
                token,
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole() != null ? user.getRole().name() : Role.ROLE_STUDENT.name(),
                user.getStudentId(),
                user.getAvatarUrl()
        );
        response.setProfile(getCurrentUserProfile(user));
        return response;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = UserValidationHelper.validateAndNormalizeEmail(request.getEmail());
        UserValidationHelper.assertUniqueEmail(email, null, userRepository);

        User user = new User();
        user.setName(request.getName().trim());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        String cleanPhone = normalizeAndValidateUniquePhone(request.getPhone(), null);

        // Student ID duplicate check
        String sId = request.getStudentId() != null ? request.getStudentId().trim() : null;
        if (sId != null && !sId.isEmpty()) {
            if (userRepository.existsByStudentId(sId)) {
                throw new ApiException("This Student ID is already registered! Please check your ID or contact support.");
            }
        }

        user.setStudentId(sId);
        user.setPhone(cleanPhone);
        boolean isOwnerOrInitialAdmin = (initialAdminEmail != null && !initialAdminEmail.isBlank() && email.equalsIgnoreCase(initialAdminEmail.trim()))
                || (ownerAdminEmail != null && !ownerAdminEmail.isBlank() && email.equalsIgnoreCase(ownerAdminEmail.trim()));
        if (isOwnerOrInitialAdmin) {
            user.setRole(Role.ROLE_SUPER_ADMIN);
        } else {
            user.setRole(Role.ROLE_STUDENT);
        }
        user.setAuthProvider(AuthProvider.LOCAL);

        user = userRepository.save(user);
        evictCachedUser(user.getEmail());
        liveSyncService.broadcast("user", "created", user.getId());
        liveSyncService.broadcast("staff", "created", user.getId());

        // Dispatch Welcome Email to newly registered student
        try {
            emailService.sendStudentWelcomeEmail(user);
        } catch (Exception e) {
            log.warn("Failed to dispatch welcome email to {}: {}", user.getEmail(), e.getMessage());
        }

        String token = tokenProvider.generateTokenFromUser(user);

        AuthResponse response = new AuthResponse(
                token,
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole() != null ? user.getRole().name() : Role.ROLE_STUDENT.name(),
                user.getStudentId(),
                user.getAvatarUrl()
        );
        response.setProfile(getCurrentUserProfile(user));
        return response;
    }

    private String normalizeAndValidateUniquePhone(String rawPhone, Long excludeUserId) {
        String cleanPhone = UserValidationHelper.validateAndNormalizePhone(rawPhone);
        UserValidationHelper.assertUniquePhone(cleanPhone, excludeUserId, userRepository);
        return cleanPhone;
    }

    @Transactional
    public AuthResponse loginWithGoogle(GoogleLoginRequest request) {
        Map<String, Object> tokenClaims = verifyGoogleIdToken(request.getIdToken());
        String rawTokenEmail = String.valueOf(tokenClaims.get("email")).toLowerCase().trim();
        String verifiedEmail = UserValidationHelper.validateAndNormalizeEmail(rawTokenEmail);
        if (request.getEmail() != null && !request.getEmail().isBlank()
                && !verifiedEmail.equalsIgnoreCase(request.getEmail().trim())) {
            throw new ApiException("Google token email mismatch.", org.springframework.http.HttpStatus.UNAUTHORIZED);
        }

        String verifiedName = tokenClaims.get("name") != null
                ? String.valueOf(tokenClaims.get("name")).trim()
                : (request.getName() != null && !request.getName().isBlank() ? request.getName().trim() : "SEU Student");
        String verifiedPicture = tokenClaims.get("picture") != null
                ? String.valueOf(tokenClaims.get("picture")).trim()
                : null;

        Optional<User> existingUser = userRepository.findByEmail(verifiedEmail);
        User user;
        boolean isOwnerOrInitialAdmin = (initialAdminEmail != null && !initialAdminEmail.isBlank() && verifiedEmail.equalsIgnoreCase(initialAdminEmail.trim()))
                || (ownerAdminEmail != null && !ownerAdminEmail.isBlank() && verifiedEmail.equalsIgnoreCase(ownerAdminEmail.trim()));

        if (existingUser.isPresent()) {
            user = existingUser.get();
            assertUserNotBlocked(user);
            assertUserNotLocked(user);
            boolean updated = false;
            if (user.getFailedLoginAttempts() > 0 || user.getLockoutUntil() != null) {
                user.setFailedLoginAttempts(0);
                user.setLockoutUntil(null);
                updated = true;
            }
            if (isOwnerOrInitialAdmin && user.getRole() != Role.ROLE_SUPER_ADMIN) {
                user.setRole(Role.ROLE_SUPER_ADMIN);
                updated = true;
            }
            if (verifiedPicture != null && (user.getAvatarUrl() == null || user.getAvatarUrl().isBlank())) {
                user.setAvatarUrl(verifiedPicture);
                updated = true;
            }
            if (updated) {
                userRepository.save(user);
                evictCachedUser(user.getEmail());
            }
        } else {
            user = new User();
            user.setName(verifiedName.isEmpty() ? "SEU Student" : verifiedName);
            user.setEmail(verifiedEmail);
            if (isOwnerOrInitialAdmin) {
                user.setRole(Role.ROLE_SUPER_ADMIN);
            } else {
                user.setRole(Role.ROLE_STUDENT);
            }
            user.setAuthProvider(AuthProvider.GOOGLE);
            user.setAvatarUrl(verifiedPicture);
            user.setEnabled(true);
            user = userRepository.save(user);
            evictCachedUser(user.getEmail());
        }

        String token = tokenProvider.generateTokenFromUser(user);

        AuthResponse response = new AuthResponse(
                token,
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole() != null ? user.getRole().name() : Role.ROLE_STUDENT.name(),
                user.getStudentId(),
                user.getAvatarUrl()
        );
        response.setProfile(getCurrentUserProfile(user));
        return response;
    }

    protected Map<String, Object> verifyGoogleIdToken(String idToken) {
        if (idToken == null || idToken.trim().isEmpty()) {
            throw new ApiException("Google ID token is required.", org.springframework.http.HttpStatus.UNAUTHORIZED);
        }
        try {
            String encoded = URLEncoder.encode(idToken.trim(), StandardCharsets.UTF_8);
            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create("https://oauth2.googleapis.com/tokeninfo?id_token=" + encoded))
                    .timeout(Duration.ofSeconds(8))
                    .GET()
                    .build();
            HttpResponse<String> response = UrlSecurityValidator.getSharedHttpClient()
                    .send(httpRequest, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() != 200 || response.body() == null || response.body().isBlank()) {
                throw new ApiException("Invalid or expired Google sign-in token.", org.springframework.http.HttpStatus.UNAUTHORIZED);
            }
            Map<String, Object> claims = JSON_MAPPER.readValue(response.body(), new TypeReference<>() {});
            Object emailObj = claims.get("email");
            Object emailVerifiedObj = claims.get("email_verified");
            if (emailObj == null || String.valueOf(emailObj).isBlank()
                    || !"true".equalsIgnoreCase(String.valueOf(emailVerifiedObj))) {
                throw new ApiException("Google account email is not verified.", org.springframework.http.HttpStatus.UNAUTHORIZED);
            }
            Object issObj = claims.get("iss");
            if (issObj != null) {
                String iss = String.valueOf(issObj);
                if (!"https://accounts.google.com".equals(iss) && !"accounts.google.com".equals(iss)) {
                    throw new ApiException("Untrusted Google token issuer.", org.springframework.http.HttpStatus.UNAUTHORIZED);
                }
            }
            Object expObj = claims.get("exp");
            if (expObj != null) {
                long expEpoch = Long.parseLong(String.valueOf(expObj));
                if (expEpoch * 1000L < System.currentTimeMillis()) {
                    throw new ApiException("Google sign-in token has expired.", org.springframework.http.HttpStatus.UNAUTHORIZED);
                }
            }
            if (googleClientId != null && !googleClientId.isBlank()) {
                Object audObj = claims.get("aud");
                if (audObj == null || !googleClientId.trim().equals(String.valueOf(audObj))) {
                    throw new ApiException("Google token audience mismatch.", org.springframework.http.HttpStatus.UNAUTHORIZED);
                }
            }
            return claims;
        } catch (ApiException ex) {
            throw ex;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ApiException("Google token verification interrupted.", org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE);
        } catch (Exception ex) {
            throw new ApiException("Failed to verify Google ID token.", org.springframework.http.HttpStatus.UNAUTHORIZED);
        }
    }

    public UserProfileResponse getCurrentUserProfile(User user) {
        Role safeRole = user.getRole() != null ? user.getRole() : Role.ROLE_STUDENT;
        UserProfileResponse response = new UserProfileResponse();
        response.setId(user.getId());
        response.setName(user.getName());
        response.setEmail(user.getEmail());
        response.setStudentId(user.getStudentId());
        response.setRole(safeRole.name());
        response.setAvatarUrl(user.getAvatarUrl());
        response.setChatBlocked(user.isChatBlocked());
        response.setPhone(user.getPhone() != null ? user.getPhone() : "");
        response.setAddress(user.getAddress() != null ? user.getAddress() : "");

        boolean isStaff = safeRole == Role.ROLE_ADMIN || safeRole == Role.ROLE_SUPER_ADMIN || safeRole == Role.ROLE_MANAGER;
        if (isStaff) {
            response.setHasActiveSubscription(false);
            response.setPlanName("Administrative Access");
            response.setMaxCoursesAllowed(0);
            response.setUsedCoursesCount(0);
            response.setRemainingCoursesCount(0);
            response.setUnlimited(false);
            response.setActiveAccessSource("STAFF_UNRESTRICTED");
            response.setUnlockedCourseCodes(List.of());
            response.setUnlockedCourseDetails(List.of());
            return response;
        }

        Optional<Subscription> subOpt = subscriptionService != null && user.getId() != null
                ? subscriptionService.getValidActiveSubscription(user.getId())
                : Optional.empty();
        if (subOpt.isPresent()) {
            Subscription sub = subOpt.get();
            response.setHasActiveSubscription(true);
            response.setSubscriptionPaused(sub.isPaused());
            response.setPlanName(sub.getPlanType().getDisplayName());
            response.setMaxCoursesAllowed(sub.getMaxCoursesAllowed());
            response.setUsedCoursesCount(sub.getUsedCoursesCount());
            response.setRemainingCoursesCount(Math.max(0, sub.getMaxCoursesAllowed() - sub.getUsedCoursesCount()));
            response.setUnlimited(sub.isUnlimited());
            response.setSubscriptionExpiresAt(sub.getEndDate());
        } else {
            response.setHasActiveSubscription(false);
            response.setSubscriptionPaused(false);
            response.setPlanName("Free Preview / Expired");
            response.setMaxCoursesAllowed(0);
            response.setUsedCoursesCount(0);
            response.setRemainingCoursesCount(0);
            response.setUnlimited(false);
        }

        LocalDateTime now = LocalDateTime.now();
        List<UnlockedCourse> userUnlocks = unlockedCourseRepository != null && user.getId() != null
                ? unlockedCourseRepository.findByUserId(user.getId())
                : List.of();
        List<UserProfileResponse.UnlockedCourseDetail> details = new ArrayList<>();
        List<String> validUnlockedCodes = new ArrayList<>();

        LocalDateTime latestAccessExp = null;
        if (subOpt.isPresent()) {
            latestAccessExp = subOpt.get().getEndDate();
            response.setActiveAccessSource("SUBSCRIPTION");
        } else {
            response.setActiveAccessSource("NONE");
        }

        for (UnlockedCourse uc : userUnlocks) {
            LocalDateTime exp = uc.getExpiresAt();
            if (exp == null && subOpt.isPresent()) {
                exp = subOpt.get().getEndDate();
            }

            boolean expired = exp != null && now.isAfter(exp);
            long daysLeft = 0;
            long hoursLeft = 0;
            if (exp != null && !expired) {
                daysLeft = java.time.temporal.ChronoUnit.DAYS.between(now, exp);
                hoursLeft = java.time.temporal.ChronoUnit.HOURS.between(now, exp);
                if (latestAccessExp == null || exp.isAfter(latestAccessExp)) {
                    latestAccessExp = exp;
                    if (subOpt.isEmpty()) {
                        response.setActiveAccessSource(uc.getSource().name());
                    }
                }
            }

            if (!expired && uc.getCourse() != null) {
                // Only full-course unlocks grant course-wide unlockedCourseCodes access; faculty-scoped gifts remain restricted to that teacher
                if (uc.getTeacher() == null && !validUnlockedCodes.contains(uc.getCourse().getCode())) {
                    validUnlockedCodes.add(uc.getCourse().getCode());
                }
                details.add(new UserProfileResponse.UnlockedCourseDetail(
                        uc.getId(),
                        uc.getCourse().getId(),
                        uc.getCourse().getCode(),
                        uc.getCourse().getTitle(),
                        uc.getCourse().getDepartment() != null ? uc.getCourse().getDepartment() : "CSE",
                        uc.getTeacher() != null ? uc.getTeacher().getId() : null,
                        uc.getTeacher() != null ? uc.getTeacher().getName() : null,
                        uc.getTeacher() != null ? uc.getTeacher().getInitial() : null,
                        uc.getSource().name(),
                        uc.getUnlockedAt(),
                        exp,
                        daysLeft,
                        hoursLeft,
                        false
                ));
            }
        }

        if (safeRole == Role.ROLE_ADMIN || safeRole == Role.ROLE_SUPER_ADMIN || safeRole == Role.ROLE_MANAGER
                || (subOpt.isPresent() && subOpt.get().isUnlimited())) {
            response.setUnlockedCourseCodes(getCachedCourseCodes());
            response.setActiveAccessSource(safeRole == Role.ROLE_STUDENT ? "UNLIMITED_ACCESS" : "STAFF_UNRESTRICTED");
        } else {
            response.setUnlockedCourseCodes(validUnlockedCodes);
        }

        response.setUnlockedCourseDetails(details);
        if (latestAccessExp != null && latestAccessExp.isAfter(now)) {
            response.setActiveAccessExpiresAt(latestAccessExp);
            response.setActiveAccessRemainingDays(java.time.temporal.ChronoUnit.DAYS.between(now, latestAccessExp));
            response.setActiveAccessRemainingHours(java.time.temporal.ChronoUnit.HOURS.between(now, latestAccessExp));
        }

        return response;
    }

    @Transactional
    public UserProfileResponse updateProfile(User currentUser, String name, String phone, String address, String avatarUrl) {
        User u = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUser.getId()));

        if (name != null && !name.trim().isEmpty()) {
            u.setName(name.trim());
        }

        if (phone != null) {
            u.setPhone(normalizeAndValidateUniquePhone(phone, u.getId()));
        }

        if (address != null) {
            u.setAddress(address.trim().isEmpty() ? null : address.trim());
        }

        if (avatarUrl != null) {
            String trimmed = avatarUrl.trim();
            if (trimmed.isEmpty() || trimmed.equalsIgnoreCase("null") || trimmed.equalsIgnoreCase("remove")) {
                if (u.getAvatarUrl() != null && u.getAvatarUrl().startsWith("/uploads/avatars/")) {
                    try {
                        Path oldFilePath = UrlSecurityValidator.resolveSafeLocalPath(
                                Paths.get("uploads", "avatars"), u.getAvatarUrl(), "/uploads/avatars/");
                        Files.deleteIfExists(oldFilePath);
                    } catch (Exception ignored) {}
                }
                u.setAvatarUrl(null);
            } else {
                if (!trimmed.startsWith("/uploads/avatars/")) {
                    UrlSecurityValidator.validatePublicHttpUrl(trimmed);
                }
                u.setAvatarUrl(trimmed);
            }
        }

        // Email cannot be modified - registration email is permanent
        u = userRepository.save(u);
        evictCachedUser(u.getEmail());
        return getCurrentUserProfile(u);
    }

    @Transactional
    public UserProfileResponse uploadAvatar(User currentUser, MultipartFile file) throws IOException {
        String extDot = FileUploadSecurityValidator.validateImage(file, 5L * 1024 * 1024);

        User u = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUser.getId()));

        Path uploadDir = Paths.get("uploads", "avatars").toAbsolutePath().normalize();
        if (!Files.exists(uploadDir)) {
            Files.createDirectories(uploadDir);
        }

        // If user already had a previously uploaded avatar, delete the previous physical file to avoid orphan storage
        if (u.getAvatarUrl() != null && u.getAvatarUrl().startsWith("/uploads/avatars/")) {
            try {
                Path oldFilePath = UrlSecurityValidator.resolveSafeLocalPath(
                        uploadDir, u.getAvatarUrl(), "/uploads/avatars/");
                Files.deleteIfExists(oldFilePath);
            } catch (Exception ignored) {}
        }

        String fileUrl;
        if (cloudinaryService.isConfigured()) {
            fileUrl = cloudinaryService.uploadFile(file, "notelagbe/avatars", true);
        } else {
            String fileName = "user_" + u.getId() + "_" + System.currentTimeMillis() + extDot;
            Path targetPath = uploadDir.resolve(fileName).normalize();
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            fileUrl = "/uploads/avatars/" + fileName;
        }
        u.setAvatarUrl(fileUrl);
        u = userRepository.save(u);
        evictCachedUser(u.getEmail());

        return getCurrentUserProfile(u);
    }

    @Transactional
    public UserProfileResponse removeAvatar(User currentUser) {
        User u = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUser.getId()));

        // Delete file from Cloudinary or local disk
        if (u.getAvatarUrl() != null && u.getAvatarUrl().contains("cloudinary.com")) {
            cloudinaryService.deleteFileByUrl(u.getAvatarUrl());
        } else if (u.getAvatarUrl() != null && u.getAvatarUrl().startsWith("/uploads/avatars/")) {
            try {
                String oldFileName = u.getAvatarUrl().replace("/uploads/avatars/", "");
                Path oldFilePath = Paths.get("uploads", "avatars").resolve(oldFileName).toAbsolutePath().normalize();
                Files.deleteIfExists(oldFilePath);
            } catch (Exception ignored) {}
        }

        u.setAvatarUrl(null);
        u = userRepository.save(u);
        evictCachedUser(u.getEmail());

        return getCurrentUserProfile(u);
    }

    @Transactional
    public Map<String, Object> changePassword(User currentUser, String currentPassword, String newPassword) {
        User u = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUser.getId()));

        if (u.getPassword() == null || u.getPassword().isBlank()) {
            throw new ApiException("This account has no local password configured. Please use Forgot Password to set one.");
        }
        if (currentPassword == null || currentPassword.isEmpty()) {
            throw new ApiException("Current password is required.");
        }
        if (!passwordEncoder.matches(currentPassword, u.getPassword())) {
            throw new ApiException("Incorrect current password! Please verify your existing password.");
        }
        if (newPassword == null || newPassword.trim().length() < 6) {
            throw new ApiException("New password must be at least 6 characters long.");
        }

        u.setPassword(passwordEncoder.encode(newPassword.trim()));
        userRepository.save(u);
        evictCachedUser(u.getEmail());

        return Map.of(
                "success", true,
                "message", "Your password has been changed successfully!"
        );
    }

    private void clearResetOtp(User user) {
        user.setResetOtpHash(null);
        user.setResetOtpExpiry(null);
        user.setResetOtpAttempts(0);
    }

    private String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm unavailable", e);
        }
    }

    /**
     * Step 1: Validate that the email exists and is active, then generate and email a 6-digit OTP security code.
     * Never exposes user identity or password reset authorization before email OTP verification.
     */
    @Transactional
    public Map<String, Object> verifyEmailForPasswordReset(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new ApiException("Registered email address is required.");
        }
        String cleanEmail = email.trim().toLowerCase();
        User user = userRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> new ResourceNotFoundException("This email does not exist."));
        assertUserNotBlocked(user);

        LocalDateTime now = LocalDateTime.now();
        if (user.getResetOtpLastSentAt() != null) {
            LocalDateTime nextAllowedAt = user.getResetOtpLastSentAt().plusSeconds(OTP_RESEND_COOLDOWN_SECONDS);
            if (nextAllowedAt.isAfter(now)) {
                long waitSeconds = Math.max(1L, Duration.between(now, nextAllowedAt).getSeconds());
                throw new ApiException("Please wait " + waitSeconds + " seconds before requesting another security code.");
            }
        }

        String securityCode = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
        user.setResetOtpHash(passwordEncoder.encode(securityCode));
        user.setResetOtpExpiry(now.plusMinutes(OTP_EXPIRY_MINUTES));
        user.setResetOtpAttempts(0);
        user.setResetOtpLastSentAt(now);
        // Revoke any stale verified reset token until the new security code is confirmed
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);

        emailService.sendPasswordResetCodeEmail(user, securityCode, OTP_EXPIRY_MINUTES);

        return Map.of(
                "success", true,
                "codeSent", true,
                "email", user.getEmail(),
                "expiresInSeconds", OTP_EXPIRY_MINUTES * 60,
                "resendCooldownSeconds", OTP_RESEND_COOLDOWN_SECONDS,
                "message", "Security code sent to your email address. Valid for " + OTP_EXPIRY_MINUTES + " minutes."
        );
    }

    /**
     * Step 2: Verify the 6-digit security code sent to the user's email and issue a single-use reset token.
     */
    @Transactional(noRollbackFor = ApiException.class)
    public Map<String, Object> verifyPasswordResetCode(String email, String code) {
        if (email == null || email.trim().isEmpty()) {
            throw new ApiException("Registered email address is required.");
        }
        if (code == null || code.trim().isEmpty()) {
            throw new ApiException("Security code is required.");
        }

        String cleanCode = code.trim().replaceAll("\\s+", "");
        if (!cleanCode.matches("\\d{6}")) {
            throw new ApiException("Please enter the 6-digit security code sent to your email.");
        }

        String cleanEmail = email.trim().toLowerCase();
        User user = userRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> new ResourceNotFoundException("This email does not exist."));
        assertUserNotBlocked(user);

        if (user.getResetOtpHash() == null || user.getResetOtpExpiry() == null) {
            throw new ApiException("No active security code found. Please request a new code.");
        }

        LocalDateTime now = LocalDateTime.now();
        if (user.getResetOtpExpiry().isBefore(now)) {
            clearResetOtp(user);
            userRepository.save(user);
            throw new ApiException("Security code has expired. Please request a new code.");
        }

        int currentAttempts = user.getResetOtpAttempts() != null ? user.getResetOtpAttempts() : 0;
        if (currentAttempts >= MAX_OTP_ATTEMPTS) {
            clearResetOtp(user);
            userRepository.save(user);
            throw new ApiException("Too many incorrect attempts. Please request a new security code.");
        }

        if (!passwordEncoder.matches(cleanCode, user.getResetOtpHash())) {
            int nextAttempts = currentAttempts + 1;
            if (nextAttempts >= MAX_OTP_ATTEMPTS) {
                clearResetOtp(user);
                userRepository.save(user);
                throw new ApiException("Too many incorrect verification attempts. This security code has been invalidated; please request a new code.");
            }
            user.setResetOtpAttempts(nextAttempts);
            userRepository.save(user);
            int remaining = MAX_OTP_ATTEMPTS - nextAttempts;
            throw new ApiException("Invalid security code. " + remaining + (remaining == 1 ? " attempt remaining." : " attempts remaining."));
        }

        // Code verified: consume OTP immediately and mint a single-use cryptographic reset token
        clearResetOtp(user);
        byte[] randomBytes = new byte[32];
        SECURE_RANDOM.nextBytes(randomBytes);
        String rawResetToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
        user.setResetToken(sha256Hex(rawResetToken));
        user.setResetTokenExpiry(now.plusMinutes(RESET_TOKEN_EXPIRY_MINUTES));
        userRepository.save(user);

        return Map.of(
                "success", true,
                "verified", true,
                "email", user.getEmail(),
                "resetToken", rawResetToken,
                "expiresInSeconds", RESET_TOKEN_EXPIRY_MINUTES * 60,
                "message", "Security code verified! You can now set a new password."
        );
    }

    /**
     * Step 3: Set a new password using the single-use verified reset token from Step 2.
     */
    @Transactional(noRollbackFor = ApiException.class)
    public Map<String, Object> resetPasswordWithToken(String email, String resetToken, String newPassword) {
        if (email == null || email.trim().isEmpty()) {
            throw new ApiException("Registered email is required.");
        }
        if (resetToken == null || resetToken.trim().isEmpty()) {
            throw new ApiException("Security code verification is required before resetting your password.");
        }
        if (newPassword == null || newPassword.trim().length() < 6) {
            throw new ApiException("New password must be at least 6 characters long.");
        }
        if (newPassword.trim().length() > 64) {
            throw new ApiException("New password cannot exceed 64 characters.");
        }

        String cleanEmail = email.trim().toLowerCase();
        User user = userRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> new ResourceNotFoundException("This email does not exist."));
        assertUserNotBlocked(user);

        if (user.getResetToken() == null || user.getResetTokenExpiry() == null) {
            throw new ApiException("Security code verification is required before resetting your password.");
        }
        if (user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            user.setResetToken(null);
            user.setResetTokenExpiry(null);
            userRepository.save(user);
            throw new ApiException("Your verification session has expired. Please request a new security code.");
        }

        byte[] expectedDigest = user.getResetToken().getBytes(StandardCharsets.UTF_8);
        byte[] presentedDigest = sha256Hex(resetToken.trim()).getBytes(StandardCharsets.UTF_8);
        if (!MessageDigest.isEqual(expectedDigest, presentedDigest)) {
            throw new ApiException("Invalid or expired security verification. Please verify your email code again.");
        }

        user.setPassword(passwordEncoder.encode(newPassword.trim()));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        clearResetOtp(user);
        userRepository.save(user);
        evictCachedUser(user.getEmail());

        liveSyncService.broadcast("user", "password_reset", user.getId());

        return Map.of(
                "success", true,
                "message", "Password reset successfully! You can now sign in with your new password."
        );
    }

    public AuthResponse refreshToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new ApiException("Bearer token is required to refresh session.", HttpStatus.UNAUTHORIZED);
        }
        String oldToken = authHeader.substring(7).trim();
        if (!tokenProvider.validateToken(oldToken)) {
            throw new ApiException("Session token is invalid or expired.", HttpStatus.UNAUTHORIZED);
        }
        String email = tokenProvider.getUsernameFromToken(oldToken);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        assertUserNotBlocked(user);

        String newToken = tokenProvider.generateTokenFromUser(user);
        AuthResponse response = new AuthResponse(
                newToken,
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole() != null ? user.getRole().name() : Role.ROLE_STUDENT.name(),
                user.getStudentId(),
                user.getAvatarUrl()
        );
        response.setProfile(getCurrentUserProfile(user));
        return response;
    }
}
