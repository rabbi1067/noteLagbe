package com.notelagbe.service;

import com.notelagbe.dto.AdminDashboardStats;
import com.notelagbe.dto.AdminAnalyticsDto;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.stream.Collectors;
import com.notelagbe.dto.GiftCourseRequest;
import com.notelagbe.dto.StaffCreateRequest;
import com.notelagbe.dto.StaffResponseDto;
import com.notelagbe.entity.*;
import com.notelagbe.exception.ApiException;
import com.notelagbe.exception.ResourceNotFoundException;
import com.notelagbe.repository.*;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final TeacherRepository teacherRepository;
    private final CourseRepository courseRepository;
    private final ResourceRepository resourceRepository;
    private final PaymentRequestRepository paymentRequestRepository;
    private final ContributionRequestRepository contributionRequestRepository;
    private final WaiverRequestRepository waiverRequestRepository;
    private final ReviewRepository reviewRepository;
    private final PasswordEncoder passwordEncoder;
    private final NotificationRepository notificationRepository;
    private final UnlockedCourseRepository unlockedCourseRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final UserCourseReviewRepository userCourseReviewRepository;
    private final LiveSyncService liveSyncService;
    private final NotificationService notificationService;
    private final EmailService emailService;

    public AdminService(UserRepository userRepository,
                        TeacherRepository teacherRepository,
                        CourseRepository courseRepository,
                        ResourceRepository resourceRepository,
                        PaymentRequestRepository paymentRequestRepository,
                        ContributionRequestRepository contributionRequestRepository,
                        WaiverRequestRepository waiverRequestRepository,
                        ReviewRepository reviewRepository,
                        PasswordEncoder passwordEncoder,
                        NotificationRepository notificationRepository,
                        UnlockedCourseRepository unlockedCourseRepository,
                        SubscriptionRepository subscriptionRepository,
                        UserCourseReviewRepository userCourseReviewRepository,
                        LiveSyncService liveSyncService,
                        NotificationService notificationService,
                        EmailService emailService) {
        this.userRepository = userRepository;
        this.teacherRepository = teacherRepository;
        this.courseRepository = courseRepository;
        this.resourceRepository = resourceRepository;
        this.paymentRequestRepository = paymentRequestRepository;
        this.contributionRequestRepository = contributionRequestRepository;
        this.waiverRequestRepository = waiverRequestRepository;
        this.reviewRepository = reviewRepository;
        this.passwordEncoder = passwordEncoder;
        this.notificationRepository = notificationRepository;
        this.unlockedCourseRepository = unlockedCourseRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.userCourseReviewRepository = userCourseReviewRepository;
        this.liveSyncService = liveSyncService;
        this.notificationService = notificationService;
        this.emailService = emailService;
    }

    public AdminDashboardStats getDashboardStats() {
        AdminDashboardStats stats = new AdminDashboardStats();

        stats.setTotalUsers(userRepository.count());
        stats.setTotalStudents(userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.ROLE_STUDENT)
                .count());
        stats.setTotalTeachers(teacherRepository.count());
        stats.setTotalCourses(courseRepository.count());
        stats.setTotalResources(resourceRepository.count());

        stats.setTotalApprovedNotes(resourceRepository.findAll().stream()
                .filter(r -> r.getStatus() == ResourceStatus.APPROVED && (
                        r.getType() == ResourceType.NOTE ||
                        r.getType() == ResourceType.LAB_HAND_NOTE ||
                        r.getType() == ResourceType.LAB_REPORT ||
                        r.getType() == ResourceType.OTHERS ||
                        r.getType() == ResourceType.SYLLABUS
                ))
                .count());

        stats.setTotalApprovedQuestions(resourceRepository.findAll().stream()
                .filter(r -> r.getStatus() == ResourceStatus.APPROVED && (
                        r.getType() == ResourceType.QUESTION_COURSE_IN ||
                        r.getType() == ResourceType.MID_QUESTION ||
                        r.getType() == ResourceType.FINAL_QUESTION ||
                        r.getType() == ResourceType.QUIZ_CT ||
                        r.getType() == ResourceType.LAB_QUIZ ||
                        r.getType() == ResourceType.LAB_FINAL ||
                        r.getType() == ResourceType.LAB_MANUAL
                ))
                .count());

        stats.setPendingPayments(paymentRequestRepository.findByStatusOrderByCreatedAtDesc(PaymentStatus.PENDING).size());
        stats.setPendingContributions(contributionRequestRepository.findByStatusOrderByCreatedAtDesc(ResourceStatus.PENDING).size());
        stats.setPendingWaivers(waiverRequestRepository.findByStatusOrderByCreatedAtDesc(PaymentStatus.PENDING).size());
        stats.setPendingReviews(reviewRepository.countByStatus(ReviewStatus.PENDING));

        List<PaymentRequest> approvedPayments = paymentRequestRepository.findByStatusOrderByCreatedAtDesc(PaymentStatus.APPROVED);
        double revenue = approvedPayments.stream().mapToDouble(PaymentRequest::getAmount).sum();
        stats.setTotalRevenue(revenue);

        long activeSubscribers = subscriptionRepository.findAll().stream()
                .filter(s -> s.isActive() && !s.isExpired())
                .map(s -> s.getUser().getId())
                .distinct()
                .count();
        stats.setActivePremiumUsers(activeSubscribers);

        return stats;
    }

    public List<StaffResponseDto> getAllStaff() {
        List<User> allUsers = userRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
        return allUsers.stream().map(u -> new StaffResponseDto(
                u.getId(),
                u.getName(),
                u.getEmail(),
                u.getStudentId(),
                u.getRole().name(),
                u.getCreatedAt(),
                u.isEnabled(),
                u.getPhone(),
                u.getAddress()
        )).toList();
    }

    @Transactional
    public StaffResponseDto createStaff(StaffCreateRequest req, User currentUser) {
        Role targetRole = req.getRole() != null ? req.getRole() : Role.ROLE_STUDENT;

        // Security: Only SUPER_ADMIN can create administrative accounts
        if (currentUser.getRole() != Role.ROLE_SUPER_ADMIN && targetRole != Role.ROLE_STUDENT) {
            throw new ApiException("Access Denied: Only Super Administrators can provision administrative accounts (Admin, Manager, Super Admin). Standard Admins can only register Student accounts.");
        }

        String email = req.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new ApiException("An account with this email already exists: " + email);
        }

        User u = new User();
        u.setName(req.getName().trim());
        u.setEmail(email);
        u.setPassword(passwordEncoder.encode(req.getPassword()));
        u.setRole(targetRole);
        if (req.getStudentId() != null && !req.getStudentId().trim().isEmpty()) {
            String sId = req.getStudentId().trim();
            if (userRepository.existsByStudentId(sId)) {
                throw new ApiException("This Student ID is already registered to another account: " + sId);
            }
            u.setStudentId(sId);
        }
        if (req.getPhone() != null && !req.getPhone().trim().isEmpty()) {
            String rawPhone = req.getPhone().trim();
            String cleanPhone = rawPhone.replaceAll("[^0-9+]", "");
            String baseDigits = cleanPhone.replaceAll("[^0-9]", "");
            if (baseDigits.startsWith("880") && baseDigits.length() >= 13) {
                baseDigits = "0" + baseDigits.substring(3);
            }
            List<User> matching = userRepository.findMatchingPhoneUsers(cleanPhone, baseDigits, "+88" + baseDigits);
            if (!matching.isEmpty()) {
                throw new ApiException("An account with this phone number already exists: " + rawPhone);
            }
            u.setPhone(cleanPhone);
        }
        u.setAuthProvider(AuthProvider.LOCAL);
        u.setEnabled(true);
        u = userRepository.save(u);
        liveSyncService.broadcast("user", "created", u.getId());
        liveSyncService.broadcast("staff", "created", u.getId());

        return new StaffResponseDto(u.getId(), u.getName(), u.getEmail(), u.getStudentId(), u.getRole().name(), u.getCreatedAt(), u.isEnabled(), u.getPhone(), u.getAddress());
    }

    @Transactional
    public StaffResponseDto updateStaff(Long id, Map<String, Object> payload, User currentUser) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User account not found: " + id));

        // Security: Standard admin can only edit Student accounts
        if (currentUser.getRole() != Role.ROLE_SUPER_ADMIN && u.getRole() != Role.ROLE_STUDENT) {
            throw new ApiException("Access Denied: Standard Administrators can only edit Student accounts. Super Admin clearance is required to modify administrative staff.");
        }

        if (payload.containsKey("name") && payload.get("name") != null) {
            String name = payload.get("name").toString().trim();
            if (!name.isEmpty()) {
                u.setName(name);
            }
        }

        // Email is immutable once registered (Security/Identity constraint)

        if (payload.containsKey("studentId")) {
            String sId = payload.get("studentId") != null ? payload.get("studentId").toString().trim() : "";
            u.setStudentId(sId.isEmpty() ? null : sId);
        }

        if (payload.containsKey("phone")) {
            String phone = payload.get("phone") != null ? payload.get("phone").toString().trim() : null;
            u.setPhone((phone != null && !phone.isEmpty()) ? phone : null);
        }

        if (payload.containsKey("address")) {
            String address = payload.get("address") != null ? payload.get("address").toString().trim() : null;
            u.setAddress((address != null && !address.isEmpty()) ? address : null);
        }

        if (payload.containsKey("role") && payload.get("role") != null) {
            String roleStr = payload.get("role").toString().trim();
            try {
                Role newRole = Role.valueOf(roleStr);
                // Security: Only Super Admin can change someone to or from an administrative role
                if (currentUser.getRole() != Role.ROLE_SUPER_ADMIN && newRole != Role.ROLE_STUDENT) {
                    throw new ApiException("Access Denied: Only Super Administrators can grant administrative roles.");
                }
                if (currentUser.getId().equals(u.getId()) && newRole != u.getRole()) {
                    throw new ApiException("You cannot modify your own administrative role!");
                }
                u.setRole(newRole);
            } catch (IllegalArgumentException e) {
                throw new ApiException("Invalid role specified: " + roleStr);
            }
        }

        u = userRepository.save(u);
        liveSyncService.broadcast("user", "updated", u.getId());
        liveSyncService.broadcast("staff", "updated", u.getId());
        return new StaffResponseDto(u.getId(), u.getName(), u.getEmail(), u.getStudentId(), u.getRole().name(), u.getCreatedAt(), u.isEnabled(), u.getPhone(), u.getAddress());
    }

    @Transactional
    public Map<String, Object> toggleStaffBlock(Long id, User currentUser) {
        if (currentUser.getId().equals(id)) {
            throw new ApiException("You cannot block your own admin account!");
        }
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User account not found: " + id));
        if (u.getEmail().equalsIgnoreCase("admin@seu.edu.bd")) {
            throw new ApiException("Root Super Admin account cannot be blocked!");
        }

        // Security: Standard admin can only block/unblock student accounts
        if (currentUser.getRole() != Role.ROLE_SUPER_ADMIN && u.getRole() != Role.ROLE_STUDENT) {
            throw new ApiException("Access Denied: Standard Administrators can only block/unblock Student accounts. Super Admin clearance is required to suspend administrative staff.");
        }

        u.setEnabled(!u.isEnabled());
        userRepository.save(u);
        liveSyncService.broadcast("user", u.isEnabled() ? "unblocked" : "blocked", u.getId());
        liveSyncService.broadcast("staff", "updated", u.getId());

        String message = u.isEnabled()
                ? "Account for '" + u.getName() + "' has been unblocked successfully."
                : "Account for '" + u.getName() + "' has been blocked from logging in.";

        return Map.of(
                "success", true,
                "id", u.getId(),
                "enabled", u.isEnabled(),
                "message", message
        );
    }

    @Transactional
    public void deleteStaff(Long id, User currentUser) {
        if (currentUser.getId().equals(id)) {
            throw new ApiException("You cannot delete your own admin account!");
        }
        User u = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User account not found: " + id));
        if (u.getEmail().equalsIgnoreCase("admin@seu.edu.bd")) {
            throw new ApiException("Root Super Admin account cannot be removed!");
        }

        // Security: Standard admin can only delete student accounts
        if (currentUser.getRole() != Role.ROLE_SUPER_ADMIN && u.getRole() != Role.ROLE_STUDENT) {
            throw new ApiException("Access Denied: Standard Administrators can only delete Student accounts. Super Admin clearance is required to remove administrative staff.");
        }

        Long userId = u.getId();

        // 1. Delete notifications
        notificationRepository.deleteByUserId(userId);

        // 2. Delete unlocked courses
        unlockedCourseRepository.deleteByUserId(userId);

        // 3. Delete subscriptions
        subscriptionRepository.deleteByUserId(userId);

        // 4. Delete waiver requests
        waiverRequestRepository.deleteByUserId(userId);

        // 5. Delete payment requests
        paymentRequestRepository.deleteByUserId(userId);

        // 6. Delete user course reviews & reviews
        userCourseReviewRepository.deleteByUserId(userId);
        reviewRepository.deleteByUserId(userId);

        // 7. Delete contributions
        List<ContributionRequest> userContribs = contributionRequestRepository.findByUserIdOrderByCreatedAtDesc(userId);
        contributionRequestRepository.deleteAll(userContribs);

        // 8. Disassociate resources uploaded by this user so academic materials remain safe
        List<Resource> userResources = resourceRepository.findByUploaderIdOrderByCreatedAtDesc(userId);
        for (Resource r : userResources) {
            r.setUploader(null);
            resourceRepository.save(r);
        }

        userRepository.delete(u);
        liveSyncService.broadcast("user", "deleted", userId);
        liveSyncService.broadcast("staff", "deleted", userId);
    }

    @CacheEvict(value = {"courses", "course_details", "course_resources", "teacher_resources", "teachers", "teacher_details", "admin_analytics", "admin_stats"}, allEntries = true)
    @Transactional
    public Map<String, Object> giftCourseToStudent(Long studentId, GiftCourseRequest req, User currentUser) {
        // Security: Strictly restricted to Super Admin
        if (currentUser.getRole() != Role.ROLE_SUPER_ADMIN) {
            throw new ApiException("Access Denied: Only Super Administrators have authority to gift course access to students.");
        }

        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student user not found with ID: " + studentId));

        if (student.getRole() != Role.ROLE_STUDENT) {
            throw new ApiException("Course gifts can only be granted to Student accounts.");
        }

        if (req.getCourseCode() == null || req.getCourseCode().trim().isEmpty()) {
            throw new ApiException("Target course code is required.");
        }

        if (req.getTeacherId() == null || req.getTeacherId() <= 0) {
            throw new ApiException("Please select a specific faculty member under this course to gift.");
        }

        Course course = courseRepository.findByCodeIgnoreCase(req.getCourseCode().trim())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with code: " + req.getCourseCode()));

        Teacher teacher = teacherRepository.findById(req.getTeacherId())
                .orElseThrow(() -> new ResourceNotFoundException("Faculty member not found with ID: " + req.getTeacherId()));

        LocalDateTime expiresAt = null;
        if (req.getValidityMonths() != null && req.getValidityMonths() > 0) {
            expiresAt = LocalDateTime.now().plusMonths(req.getValidityMonths());
        }

        Optional<UnlockedCourse> existingOpt = unlockedCourseRepository.findByUserIdAndCourseIdAndTeacherId(
                student.getId(), course.getId(), teacher.getId());
        UnlockedCourse uc;
        boolean isExtension = false;
        if (existingOpt.isPresent()) {
            uc = existingOpt.get();
            uc.setSource(UnlockSource.ADMIN_GIFT);
            uc.setExpiresAt(expiresAt);
            uc.setUnlockedAt(LocalDateTime.now());
            isExtension = true;
        } else {
            uc = new UnlockedCourse(student, course, teacher, UnlockSource.ADMIN_GIFT, expiresAt);
        }
        unlockedCourseRepository.save(uc);

        String teacherLabel = teacher.getName() + (teacher.getInitial() != null && !teacher.getInitial().isBlank() ? " [" + teacher.getInitial() + "]" : "");

        // 1. In-App Bell Notification + real-time SSE trigger for NotificationBell
        boolean bellNotified = false;
        try {
            String validityText = expiresAt == null ? "permanent lifetime access" : "access for " + req.getValidityMonths() + " months";
            String noteText = (req.getNote() != null && !req.getNote().trim().isEmpty())
                    ? " Admin Message: \"" + req.getNote().trim() + "\""
                    : "";
            notificationService.createNotification(
                    student,
                    "Faculty Course Gift from Administration! 🎁",
                    "Super Admin has gifted you " + validityText + " to " + course.getCode() + " (" + course.getTitle() + ") — Faculty: " + teacherLabel + "!" + noteText,
                    "COURSE_GIFT",
                    "/courses/" + course.getCode()
            );
            bellNotified = true;
        } catch (Exception ignored) {}

        // 2. Async Email Notification to student
        boolean emailQueued = false;
        try {
            if (student.getEmail() != null && !student.getEmail().isBlank()
                    && emailService.isEmailNotificationsEnabled()
                    && emailService.isSmtpConfigured()) {
                emailQueued = true;
            }
            emailService.sendCourseGiftEmail(
                    student,
                    course.getCode(),
                    course.getTitle(),
                    teacherLabel,
                    req.getValidityMonths(),
                    req.getNote()
            );
        } catch (Exception ignored) {}

        liveSyncService.broadcast("course_unlock", "gifted", student.getId());

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success", true);
        res.put("message", course.getCode() + " (" + teacherLabel + ") successfully gifted to " + student.getName() + "!");
        res.put("courseId", course.getId());
        res.put("courseCode", course.getCode());
        res.put("courseTitle", course.getTitle());
        res.put("teacherId", teacher.getId());
        res.put("teacherName", teacher.getName());
        res.put("teacherInitial", teacher.getInitial());
        res.put("studentId", student.getId());
        res.put("studentName", student.getName());
        res.put("studentEmail", student.getEmail());
        res.put("expiresAt", expiresAt);
        res.put("isExtension", isExtension);
        res.put("bellNotified", bellNotified);
        res.put("emailQueued", emailQueued);
        return res;
    }

    public List<Map<String, Object>> getStudentUnlockedCourses(Long studentId, User currentUser) {
        if (currentUser.getRole() != Role.ROLE_SUPER_ADMIN && currentUser.getRole() != Role.ROLE_ADMIN) {
            throw new ApiException("Access Denied: Administrative clearance required.");
        }

        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student user not found with ID: " + studentId));

        List<UnlockedCourse> list = unlockedCourseRepository.findByUserId(student.getId());
        return list.stream().map(uc -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", uc.getId());
            item.put("courseId", uc.getCourse().getId());
            item.put("courseCode", uc.getCourse().getCode());
            item.put("courseTitle", uc.getCourse().getTitle());
            item.put("department", uc.getCourse().getDepartment());
            item.put("teacherId", uc.getTeacher() != null ? uc.getTeacher().getId() : null);
            item.put("teacherName", uc.getTeacher() != null ? uc.getTeacher().getName() : null);
            item.put("teacherInitial", uc.getTeacher() != null ? uc.getTeacher().getInitial() : null);
            item.put("source", uc.getSource().name());
            item.put("unlockedAt", uc.getUnlockedAt());
            item.put("expiresAt", uc.getExpiresAt());
            item.put("isExpired", uc.getExpiresAt() != null && LocalDateTime.now().isAfter(uc.getExpiresAt()));
            return item;
        }).toList();
    }

    private Map<String, Object> buildRevokeResponse(User student, Course course, Teacher teacher, UnlockSource source, String message) {
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success", true);
        res.put("message", message);
        res.put("studentId", student != null ? student.getId() : null);
        res.put("studentName", student != null ? student.getName() : null);
        res.put("studentEmail", student != null ? student.getEmail() : null);
        res.put("courseId", course != null ? course.getId() : null);
        res.put("courseCode", course != null ? course.getCode() : null);
        res.put("courseTitle", course != null ? course.getTitle() : null);
        res.put("teacherId", teacher != null ? teacher.getId() : null);
        res.put("teacherName", teacher != null ? teacher.getName() : null);
        res.put("teacherInitial", teacher != null ? teacher.getInitial() : null);
        res.put("source", source != null ? source.name() : null);
        return res;
    }

    @CacheEvict(value = {"courses", "course_details", "course_resources", "teacher_resources", "teachers", "teacher_details", "admin_analytics", "admin_stats"}, allEntries = true)
    @Transactional
    public Map<String, Object> revokeStudentUnlockedCourse(Long studentId, Long courseId, Long unlockId, Long teacherId, User currentUser) {
        if (currentUser.getRole() != Role.ROLE_SUPER_ADMIN) {
            throw new ApiException("Access Denied: Only Super Administrators can revoke unlocked course access.");
        }

        if (unlockId != null) {
            UnlockedCourse uc = unlockedCourseRepository.findById(unlockId)
                    .orElseThrow(() -> new ResourceNotFoundException("Unlock record not found."));
            if (uc.getUser() == null || !uc.getUser().getId().equals(studentId)) {
                throw new ApiException("Unlock record does not belong to the specified student.");
            }
            User student = uc.getUser();
            Course course = uc.getCourse();
            Teacher teacher = uc.getTeacher();
            UnlockSource source = uc.getSource();
            unlockedCourseRepository.delete(uc);
            liveSyncService.broadcast("course_unlock", "revoked", studentId);
            return buildRevokeResponse(student, course, teacher, source, "Access revoked successfully.");
        }

        if (teacherId != null) {
            Optional<UnlockedCourse> ucOpt = unlockedCourseRepository.findByUserIdAndCourseIdAndTeacherId(studentId, courseId, teacherId);
            if (ucOpt.isPresent()) {
                UnlockedCourse uc = ucOpt.get();
                User student = uc.getUser();
                Course course = uc.getCourse();
                Teacher teacher = uc.getTeacher();
                UnlockSource source = uc.getSource();
                unlockedCourseRepository.delete(uc);
                liveSyncService.broadcast("course_unlock", "revoked", studentId);
                return buildRevokeResponse(student, course, teacher, source, "Gifted faculty access revoked successfully.");
            }
            throw new ResourceNotFoundException("Faculty gift record was not found for this student.");
        }

        List<UnlockedCourse> matches = unlockedCourseRepository.findAllByUserIdAndCourseId(studentId, courseId);
        if (!matches.isEmpty()) {
            UnlockedCourse first = matches.get(0);
            User student = first.getUser();
            Course course = first.getCourse();
            Teacher teacher = matches.size() == 1 ? first.getTeacher() : null;
            UnlockSource source = first.getSource();
            unlockedCourseRepository.deleteAll(matches);
            liveSyncService.broadcast("course_unlock", "revoked", studentId);
            return buildRevokeResponse(student, course, teacher, source, "Course access revoked successfully.");
        } else {
            throw new ResourceNotFoundException("Course was not unlocked for this student.");
        }
    }

    @Transactional(readOnly = true)
    public User verifySuperAdminPassword(User currentUser, String rawPassword) {
        if (currentUser == null || currentUser.getId() == null) {
            throw new ApiException("Authentication required.", HttpStatus.UNAUTHORIZED);
        }
        User superAdmin = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Super Admin account not found: " + currentUser.getId()));

        if (superAdmin.getRole() != Role.ROLE_SUPER_ADMIN) {
            throw new ApiException("Access Denied: Only Super Administrators can clear activity logs.", HttpStatus.FORBIDDEN);
        }
        if (rawPassword == null || rawPassword.isBlank()) {
            throw new ApiException("Super Admin password is required to confirm clearing logs.", HttpStatus.BAD_REQUEST);
        }
        if (superAdmin.getPassword() == null || superAdmin.getPassword().isBlank()) {
            throw new ApiException("No local password is configured on this Super Admin account. Please set a password in Admin Profile Settings first.", HttpStatus.BAD_REQUEST);
        }
        if (!passwordEncoder.matches(rawPassword, superAdmin.getPassword())) {
            throw new ApiException("Incorrect Super Admin password! Logs were not cleared.", HttpStatus.UNAUTHORIZED);
        }
        return superAdmin;
    }

    public Map<String, Object> getAdminProfile(User currentUser) {
        User u = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUser.getId()));
        Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", u.getId());
        map.put("name", u.getName());
        map.put("email", u.getEmail());
        map.put("phone", u.getPhone() != null ? u.getPhone() : "");
        map.put("address", u.getAddress() != null ? u.getAddress() : "");
        map.put("studentId", u.getStudentId() != null ? u.getStudentId() : "");
        map.put("role", u.getRole().name());
        map.put("avatarUrl", u.getAvatarUrl() != null ? u.getAvatarUrl() : "");
        map.put("createdAt", u.getCreatedAt() != null ? u.getCreatedAt().toString() : "");
        map.put("enabled", u.isEnabled());
        return map;
    }

    @Transactional
    public Map<String, Object> updateAdminProfile(User currentUser, String name, String phone, String address, String avatarUrl) {
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
                        java.nio.file.Path oldFilePath = java.nio.file.Paths.get("uploads", "avatars").resolve(oldFileName).toAbsolutePath().normalize();
                        java.nio.file.Files.deleteIfExists(oldFilePath);
                    } catch (Exception ignored) {}
                }
                u.setAvatarUrl(null);
            } else {
                u.setAvatarUrl(trimmed);
            }
        }

        // Email cannot be modified - registration email is fixed
        u = userRepository.save(u);
        Map<String, Object> map = new java.util.HashMap<>();
        map.put("success", true);
        map.put("message", "Admin profile updated successfully");
        map.put("id", u.getId());
        map.put("name", u.getName());
        map.put("email", u.getEmail());
        map.put("phone", u.getPhone() != null ? u.getPhone() : "");
        map.put("address", u.getAddress() != null ? u.getAddress() : "");
        map.put("avatarUrl", u.getAvatarUrl() != null ? u.getAvatarUrl() : "");
        map.put("role", u.getRole().name());
        return map;
    }

    @Transactional
    public Map<String, Object> changeAdminPassword(User currentUser, String currentPassword, String newPassword) {
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

    public AdminAnalyticsDto getAnalyticsData() {
        AdminAnalyticsDto dto = new AdminAnalyticsDto();

        // 1. Fetch all primary datasets
        List<PaymentRequest> allPayments = paymentRequestRepository.findAll();
        List<User> allUsers = userRepository.findAll();
        List<Resource> allResources = resourceRepository.findAll();
        List<WaiverRequest> allWaivers = waiverRequestRepository.findAll();
        List<Subscription> allSubscriptions = subscriptionRepository.findAll();

        List<PaymentRequest> approvedPayments = allPayments.stream()
                .filter(p -> p.getStatus() == PaymentStatus.APPROVED)
                .toList();

        // 2. Financial KPIs
        double totalRev = approvedPayments.stream().mapToDouble(PaymentRequest::getAmount).sum();
        dto.setTotalRevenue(totalRev);

        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
        double todayRev = approvedPayments.stream()
                .filter(p -> p.getCreatedAt() != null && p.getCreatedAt().isAfter(startOfToday))
                .mapToDouble(PaymentRequest::getAmount).sum();
        dto.setTodayRevenue(todayRev);

        LocalDateTime startOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        double monthlyRev = approvedPayments.stream()
                .filter(p -> p.getCreatedAt() != null && p.getCreatedAt().isAfter(startOfMonth))
                .mapToDouble(PaymentRequest::getAmount).sum();
        dto.setMonthlyRevenue(monthlyRev);

        dto.setTotalPayments(allPayments.size());
        long approvedPaymentsCount = approvedPayments.size();
        dto.setApprovedPaymentsCount(approvedPaymentsCount);
        long pendingPaymentsCount = allPayments.stream().filter(p -> p.getStatus() == PaymentStatus.PENDING).count();
        dto.setPendingPaymentsCount(pendingPaymentsCount);
        long rejectedPaymentsCount = allPayments.stream().filter(p -> p.getStatus() == PaymentStatus.REJECTED).count();
        dto.setRejectedPaymentsCount(rejectedPaymentsCount);

        double approvalRate = allPayments.isEmpty() ? 100.0 : ((double) approvedPaymentsCount / allPayments.size()) * 100.0;
        dto.setPaymentApprovalRate(Math.round(approvalRate * 10.0) / 10.0);

        // 3. User Governance KPIs
        dto.setTotalUsers(allUsers.size());
        long studentsCount = allUsers.stream().filter(u -> u.getRole() == Role.ROLE_STUDENT).count();
        dto.setTotalStudents(studentsCount);
        dto.setTotalAdmins(allUsers.stream().filter(u -> u.getRole() == Role.ROLE_ADMIN).count());
        dto.setTotalManagers(allUsers.stream().filter(u -> u.getRole() == Role.ROLE_MANAGER).count());
        dto.setTotalSuperAdmins(allUsers.stream().filter(u -> u.getRole() == Role.ROLE_SUPER_ADMIN).count());
        dto.setActiveUsersCount(allUsers.stream().filter(User::isEnabled).count());

        long activeSubs = allSubscriptions.stream().filter(Subscription::isActive).count();
        dto.setActiveSubscribersCount(activeSubs);
        double convRate = studentsCount > 0 ? ((double) activeSubs / studentsCount) * 100.0 : 0.0;
        dto.setSubscriberConversionRate(Math.round(convRate * 10.0) / 10.0);

        // 4. Academic Asset KPIs
        dto.setTotalResources(allResources.size());
        dto.setTotalCourses(courseRepository.count());
        dto.setTotalTeachers(teacherRepository.count());
        dto.setTotalReviews(reviewRepository.count());

        long notesCount = allResources.stream()
                .filter(r -> r.getStatus() == ResourceStatus.APPROVED && (
                        r.getType() == ResourceType.NOTE ||
                        r.getType() == ResourceType.LAB_HAND_NOTE ||
                        r.getType() == ResourceType.LAB_REPORT ||
                        r.getType() == ResourceType.OTHERS ||
                        r.getType() == ResourceType.SYLLABUS
                )).count();
        dto.setTotalNotes(notesCount);

        long questionsCount = allResources.stream()
                .filter(r -> r.getStatus() == ResourceStatus.APPROVED && (
                        r.getType() == ResourceType.QUESTION_COURSE_IN ||
                        r.getType() == ResourceType.MID_QUESTION ||
                        r.getType() == ResourceType.FINAL_QUESTION ||
                        r.getType() == ResourceType.QUIZ_CT ||
                        r.getType() == ResourceType.LAB_QUIZ ||
                        r.getType() == ResourceType.LAB_FINAL ||
                        r.getType() == ResourceType.LAB_MANUAL
                )).count();
        dto.setTotalQuestions(questionsCount);

        // 5. Waiver Analytics
        dto.setTotalWaivers(allWaivers.size());
        long approvedWaivers = allWaivers.stream().filter(w -> w.getStatus() == PaymentStatus.APPROVED).count();
        dto.setApprovedWaiversCount(approvedWaivers);
        double waivedAmount = allWaivers.stream()
                .filter(w -> w.getStatus() == PaymentStatus.APPROVED)
                .mapToDouble(w -> 99.0)
                .sum();
        dto.setTotalWaivedAmount(Math.round(waivedAmount));

        // 6. Payment Methods & Plan Breakdown
        Map<String, Long> methodCount = new LinkedHashMap<>();
        Map<String, Double> methodRev = new LinkedHashMap<>();
        for (PaymentMethod pm : PaymentMethod.values()) {
            long count = approvedPayments.stream().filter(p -> p.getPaymentMethod() == pm).count();
            double rev = approvedPayments.stream().filter(p -> p.getPaymentMethod() == pm).mapToDouble(PaymentRequest::getAmount).sum();
            methodCount.put(pm.name(), count);
            methodRev.put(pm.name(), rev);
        }
        dto.setPaymentMethodBreakdown(methodCount);
        dto.setPaymentMethodRevenue(methodRev);

        Map<String, Long> planCount = new LinkedHashMap<>();
        for (PlanType pt : PlanType.values()) {
            long count = approvedPayments.stream().filter(p -> p.getPlanType() == pt).count();
            planCount.put(pt.name(), count);
        }
        dto.setPlanBreakdown(planCount);

        // 7. Role Distribution
        Map<String, Long> roleMap = new LinkedHashMap<>();
        roleMap.put("STUDENT", studentsCount);
        roleMap.put("MANAGER", dto.getTotalManagers());
        roleMap.put("ADMIN", dto.getTotalAdmins());
        roleMap.put("SUPER_ADMIN", dto.getTotalSuperAdmins());
        dto.setRoleDistribution(roleMap);

        // 8. Resource Type Breakdown
        Map<String, Long> resTypeMap = new LinkedHashMap<>();
        for (ResourceType rt : ResourceType.values()) {
            long c = allResources.stream().filter(r -> r.getType() == rt).count();
            if (c > 0) resTypeMap.put(rt.name(), c);
        }
        dto.setResourceTypeBreakdown(resTypeMap);

        // 9. Revenue Trend (Last 30 Days)
        DateTimeFormatter dayFmt = DateTimeFormatter.ofPattern("MMM dd");
        List<AdminAnalyticsDto.TimePointData> rev30 = new ArrayList<>();
        LocalDate today = LocalDate.now();
        for (int i = 29; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            LocalDateTime start = d.atStartOfDay();
            LocalDateTime end = d.plusDays(1).atStartOfDay();
            List<PaymentRequest> dayPayments = approvedPayments.stream()
                    .filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().isBefore(start) && p.getCreatedAt().isBefore(end))
                    .toList();
            double sum = dayPayments.stream().mapToDouble(PaymentRequest::getAmount).sum();
            rev30.add(new AdminAnalyticsDto.TimePointData(d.format(dayFmt), d.toString(), sum, dayPayments.size()));
        }
        dto.setRevenueTrend30Days(rev30);

        // 10. Revenue Trend (Last 6 Months)
        DateTimeFormatter monthFmt = DateTimeFormatter.ofPattern("MMM yyyy");
        List<AdminAnalyticsDto.TimePointData> rev6m = new ArrayList<>();
        YearMonth currentYm = YearMonth.now();
        for (int i = 5; i >= 0; i--) {
            YearMonth ym = currentYm.minusMonths(i);
            LocalDateTime start = ym.atDay(1).atStartOfDay();
            LocalDateTime end = ym.plusMonths(1).atDay(1).atStartOfDay();
            List<PaymentRequest> mPayments = approvedPayments.stream()
                    .filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().isBefore(start) && p.getCreatedAt().isBefore(end))
                    .toList();
            double sum = mPayments.stream().mapToDouble(PaymentRequest::getAmount).sum();
            rev6m.add(new AdminAnalyticsDto.TimePointData(ym.format(monthFmt), ym.toString(), sum, mPayments.size()));
        }
        dto.setRevenueTrend6Months(rev6m);

        // 11. User Growth Trend (Last 30 Days)
        List<AdminAnalyticsDto.TimePointData> user30 = new ArrayList<>();
        for (int i = 29; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            LocalDateTime start = d.atStartOfDay();
            LocalDateTime end = d.plusDays(1).atStartOfDay();
            long newUsers = allUsers.stream()
                    .filter(u -> u.getCreatedAt() != null && !u.getCreatedAt().isBefore(start) && u.getCreatedAt().isBefore(end))
                    .count();
            user30.add(new AdminAnalyticsDto.TimePointData(d.format(dayFmt), d.toString(), (double) newUsers, newUsers));
        }
        dto.setUserGrowthTrend30Days(user30);

        // 12. User Growth Trend (Last 6 Months)
        List<AdminAnalyticsDto.TimePointData> user6m = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            YearMonth ym = currentYm.minusMonths(i);
            LocalDateTime start = ym.atDay(1).atStartOfDay();
            LocalDateTime end = ym.plusMonths(1).atDay(1).atStartOfDay();
            long mUsers = allUsers.stream()
                    .filter(u -> u.getCreatedAt() != null && !u.getCreatedAt().isBefore(start) && u.getCreatedAt().isBefore(end))
                    .count();
            user6m.add(new AdminAnalyticsDto.TimePointData(ym.format(monthFmt), ym.toString(), (double) mUsers, mUsers));
        }
        dto.setUserGrowthTrend6Months(user6m);

        // 13. Recent Transactions (Top 10)
        DateTimeFormatter txFmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
        List<AdminAnalyticsDto.RecentTransactionDto> recentTx = allPayments.stream()
                .sorted(Comparator.comparing(PaymentRequest::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(10)
                .map(p -> new AdminAnalyticsDto.RecentTransactionDto(
                        p.getId(),
                        p.getUser() != null ? p.getUser().getName() : "Unknown User",
                        p.getUser() != null ? p.getUser().getEmail() : "N/A",
                        p.getPlanType() != null ? p.getPlanType().name() : "N/A",
                        p.getPaymentMethod() != null ? p.getPaymentMethod().name() : "N/A",
                        p.getAmount(),
                        p.getStatus() != null ? p.getStatus().name() : "PENDING",
                        p.getTransactionId() != null ? p.getTransactionId() : "N/A",
                        p.getCreatedAt() != null ? p.getCreatedAt().format(txFmt) : ""
                ))
                .toList();
        dto.setRecentTransactions(recentTx);

        return dto;
    }
}
