package com.notelagbe.service;

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
import com.notelagbe.security.JwtTokenProvider;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.time.LocalDateTime;
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

    @org.springframework.beans.factory.annotation.Value("${app.admin.initial-email:}")
    private String initialAdminEmail;

    public AuthService(UserRepository userRepository,
                       CourseRepository courseRepository,
                       SubscriptionRepository subscriptionRepository,
                       UnlockedCourseRepository unlockedCourseRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtTokenProvider tokenProvider,
                       SubscriptionService subscriptionService,
                       LiveSyncService liveSyncService,
                       CloudinaryService cloudinaryService) {
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
    }

    public AuthResponse login(AuthRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail().toLowerCase().trim(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String token = tokenProvider.generateToken(authentication);

        User user = userRepository.findByEmail(request.getEmail().toLowerCase().trim())
                .orElseThrow(() -> new ApiException("User not found"));

        return new AuthResponse(
                token,
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole().name(),
                user.getStudentId(),
                user.getAvatarUrl()
        );
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.getEmail().toLowerCase().trim();
        if (userRepository.existsByEmail(email)) {
            throw new ApiException("An account with this email address already exists! Please log in instead.");
        }

        User user = new User();
        user.setName(request.getName().trim());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        // Phone duplicate check
        String rawPhone = request.getPhone() != null ? request.getPhone().trim() : null;
        String cleanPhone = null;
        if (rawPhone != null && !rawPhone.isEmpty()) {
            cleanPhone = rawPhone.replaceAll("[^0-9+]", "");
            String baseDigits = cleanPhone.replaceAll("[^0-9]", "");
            if (baseDigits.startsWith("880") && baseDigits.length() >= 13) {
                baseDigits = "0" + baseDigits.substring(3);
            }
            String p1 = cleanPhone;
            String p2 = baseDigits;
            String p3 = "+88" + baseDigits;

            List<User> existingWithPhone = userRepository.findMatchingPhoneUsers(p1, p2, p3);
            if (!existingWithPhone.isEmpty()) {
                throw new ApiException("This phone number is already registered to another account! Please use a different phone number or log in.");
            }
        }

        // Student ID duplicate check
        String sId = request.getStudentId() != null ? request.getStudentId().trim() : null;
        if (sId != null && !sId.isEmpty()) {
            if (userRepository.existsByStudentId(sId)) {
                throw new ApiException("This Student ID is already registered! Please check your ID or contact support.");
            }
        }

        user.setStudentId(sId);
        user.setPhone(cleanPhone);
                if (userRepository.count() == 0 || (initialAdminEmail != null && !initialAdminEmail.isBlank() && email.equalsIgnoreCase(initialAdminEmail.trim()))) {
            user.setRole(Role.ROLE_SUPER_ADMIN);
        } else {
            user.setRole(Role.ROLE_STUDENT);
        }
        user.setAuthProvider(AuthProvider.LOCAL);

        user = userRepository.save(user);
        liveSyncService.broadcast("user", "created", user.getId());
        liveSyncService.broadcast("staff", "created", user.getId());

        String token = tokenProvider.generateTokenFromUser(user);

        return new AuthResponse(
                token,
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole().name(),
                user.getStudentId(),
                user.getAvatarUrl()
        );
    }

    @Transactional
    public AuthResponse loginWithGoogle(GoogleLoginRequest request) {
        String email = request.getEmail().toLowerCase().trim();
        Optional<User> existingUser = userRepository.findByEmail(email);

        User user;
        if (existingUser.isPresent()) {
            user = existingUser.get();
            if (request.getAvatarUrl() != null && user.getAvatarUrl() == null) {
                user.setAvatarUrl(request.getAvatarUrl());
                userRepository.save(user);
            }
        } else {
            user = new User();
            user.setName(request.getName() != null ? request.getName() : "SEU Student");
            user.setEmail(email);
            user.setRole(Role.ROLE_STUDENT);
            user.setAuthProvider(AuthProvider.GOOGLE);
            user.setAvatarUrl(request.getAvatarUrl());
            user.setEnabled(true);
            user = userRepository.save(user);
        }

        String token = tokenProvider.generateTokenFromUser(user);

        return new AuthResponse(
                token,
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole().name(),
                user.getStudentId(),
                user.getAvatarUrl()
        );
    }

    public UserProfileResponse getCurrentUserProfile(User user) {
        UserProfileResponse response = new UserProfileResponse();
        response.setId(user.getId());
        response.setName(user.getName());
        response.setEmail(user.getEmail());
        response.setStudentId(user.getStudentId());
        response.setRole(user.getRole().name());
        response.setAvatarUrl(user.getAvatarUrl());
        response.setChatBlocked(user.isChatBlocked());
        response.setPhone(user.getPhone() != null ? user.getPhone() : "");
        response.setAddress(user.getAddress() != null ? user.getAddress() : "");

        Optional<Subscription> subOpt = subscriptionService.getValidActiveSubscription(user.getId());
        if (subOpt.isPresent()) {
            Subscription sub = subOpt.get();
            response.setHasActiveSubscription(true);
            response.setPlanName(sub.getPlanType().getDisplayName());
            response.setMaxCoursesAllowed(sub.getMaxCoursesAllowed());
            response.setUsedCoursesCount(sub.getUsedCoursesCount());
            response.setRemainingCoursesCount(Math.max(0, sub.getMaxCoursesAllowed() - sub.getUsedCoursesCount()));
            response.setUnlimited(sub.isUnlimited());
            response.setSubscriptionExpiresAt(sub.getEndDate());
        } else {
            response.setHasActiveSubscription(false);
            response.setPlanName("Free Preview / Expired");
            response.setMaxCoursesAllowed(0);
            response.setUsedCoursesCount(0);
            response.setRemainingCoursesCount(0);
            response.setUnlimited(false);
        }

        LocalDateTime now = LocalDateTime.now();
        List<UnlockedCourse> userUnlocks = unlockedCourseRepository.findByUserId(user.getId());
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

        if (user.getRole() == Role.ROLE_ADMIN || user.getRole() == Role.ROLE_SUPER_ADMIN || user.getRole() == Role.ROLE_MANAGER
                || (subOpt.isPresent() && subOpt.get().isUnlimited())) {
            response.setUnlockedCourseCodes(courseRepository.findAll().stream().map(Course::getCode).toList());
            response.setActiveAccessSource(user.getRole() == Role.ROLE_STUDENT ? "UNLIMITED_ACCESS" : "STAFF_UNRESTRICTED");
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
            u.setPhone(phone.trim().isEmpty() ? null : phone.trim());
        }

        if (address != null) {
            u.setAddress(address.trim().isEmpty() ? null : address.trim());
        }

        if (avatarUrl != null) {
            String trimmed = avatarUrl.trim();
            if (trimmed.isEmpty() || trimmed.equalsIgnoreCase("null") || trimmed.equalsIgnoreCase("remove")) {
                if (u.getAvatarUrl() != null && u.getAvatarUrl().startsWith("/uploads/avatars/")) {
                    try {
                        String oldFileName = u.getAvatarUrl().replace("/uploads/avatars/", "");
                        Path oldFilePath = Paths.get("uploads", "avatars").resolve(oldFileName).toAbsolutePath().normalize();
                        Files.deleteIfExists(oldFilePath);
                    } catch (Exception ignored) {}
                }
                u.setAvatarUrl(null);
            } else {
                u.setAvatarUrl(trimmed);
            }
        }

        // Email cannot be modified - registration email is permanent
        u = userRepository.save(u);
        return getCurrentUserProfile(u);
    }

    @Transactional
    public UserProfileResponse uploadAvatar(User currentUser, MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new ApiException("No image file provided for upload.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new ApiException("Invalid file format. Only image files (JPEG, PNG, WEBP, GIF) are allowed.");
        }

        if (file.getSize() > 5 * 1024 * 1024) {
            throw new ApiException("Image file exceeds the 5 MB maximum allowed size.");
        }

        User u = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUser.getId()));

        Path uploadDir = Paths.get("uploads", "avatars").toAbsolutePath().normalize();
        if (!Files.exists(uploadDir)) {
            Files.createDirectories(uploadDir);
        }

        String originalFilename = file.getOriginalFilename();
        String ext = "png";
        if (originalFilename != null && originalFilename.contains(".")) {
            ext = originalFilename.substring(originalFilename.lastIndexOf(".") + 1).toLowerCase();
        }

        // If user already had a previously uploaded avatar, delete the previous physical file to avoid orphan storage
        if (u.getAvatarUrl() != null && u.getAvatarUrl().startsWith("/uploads/avatars/")) {
            try {
                String oldFileName = u.getAvatarUrl().replace("/uploads/avatars/", "");
                Path oldFilePath = uploadDir.resolve(oldFileName).toAbsolutePath().normalize();
                Files.deleteIfExists(oldFilePath);
            } catch (Exception ignored) {}
        }

        String fileUrl;
        if (cloudinaryService.isConfigured()) {
            fileUrl = cloudinaryService.uploadFile(file, "notelagbe/avatars", true);
        } else {
            String fileName = "user_" + u.getId() + "_" + System.currentTimeMillis() + "." + ext;
            Path targetPath = uploadDir.resolve(fileName);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            fileUrl = "/uploads/avatars/" + fileName;
        }
        u.setAvatarUrl(fileUrl);
        u = userRepository.save(u);

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

        return getCurrentUserProfile(u);
    }

    @Transactional
    public Map<String, Object> changePassword(User currentUser, String currentPassword, String newPassword) {
        User u = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUser.getId()));

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

        return Map.of(
                "success", true,
                "message", "Your password has been changed successfully!"
        );
    }

    @Transactional
    public Map<String, Object> verifyEmailForPasswordReset(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new ApiException("University registered email is required.");
        }
        String cleanEmail = email.trim().toLowerCase();
        User user = userRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> new ResourceNotFoundException("No registered account found with email '" + cleanEmail + "' in the Southeast University directory. Please check your spelling or register a new account."));

        String resetToken = UUID.randomUUID().toString();
        user.setResetToken(resetToken);
        user.setResetTokenExpiry(LocalDateTime.now().plusMinutes(30));
        userRepository.save(user);

        return Map.of(
                "success", true,
                "exists", true,
                "email", user.getEmail(),
                "name", user.getName(),
                "studentId", user.getStudentId() != null ? user.getStudentId() : "",
                "resetToken", resetToken,
                "message", "Account verified! You can now set a new password."
        );
    }

    @Transactional
    public Map<String, Object> resetPasswordWithToken(String email, String resetToken, String newPassword) {
        if (email == null || email.trim().isEmpty()) {
            throw new ApiException("Registered email is required.");
        }
        if (resetToken == null || resetToken.trim().isEmpty()) {
            throw new ApiException("Reset verification token is required.");
        }
        if (newPassword == null || newPassword.trim().length() < 6) {
            throw new ApiException("New password must be at least 6 characters long.");
        }

        String cleanEmail = email.trim().toLowerCase();
        User user = userRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> new ResourceNotFoundException("No registered account found with email '" + cleanEmail + "'."));

        if (user.getResetToken() == null || !user.getResetToken().equals(resetToken.trim())) {
            throw new ApiException("Invalid or expired password reset token. Please request a new verification.");
        }
        if (user.getResetTokenExpiry() != null && user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new ApiException("The password reset token has expired. Please verify your email again.");
        }

        user.setPassword(passwordEncoder.encode(newPassword.trim()));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);

        liveSyncService.broadcast("user", "password_reset", user.getId());

        return Map.of(
                "success", true,
                "message", "Password reset successfully! You can now sign in with your new password."
        );
    }
}
