package com.notelagbe.controller;

import com.notelagbe.dto.AdminDashboardStats;
import com.notelagbe.dto.AdminAnalyticsDto;
import com.notelagbe.dto.ActivityLogPageResponse;
import com.notelagbe.dto.ChatMessageDto;
import com.notelagbe.dto.GiftCourseRequest;
import com.notelagbe.dto.NoticeRequest;
import com.notelagbe.dto.ResourceCreateRequest;
import com.notelagbe.dto.ReviewResponseDto;
import com.notelagbe.dto.StaffCreateRequest;
import com.notelagbe.dto.StaffResponseDto;
import com.notelagbe.entity.*;
import com.notelagbe.security.CustomUserDetails;
import com.notelagbe.service.*;
import com.notelagbe.service.review.ReviewModerationService;
import jakarta.validation.Valid;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;
    private final PaymentService paymentService;
    private final ContributionService contributionService;
    private final WaiverService waiverService;
    private final ResourceService resourceService;
    private final CourseService courseService;
    private final TeacherService teacherService;
    private final EmailService emailService;
    private final ReviewModerationService reviewModerationService;
    private final AuthService authService;
    private final NoticeService noticeService;
    private final ChatService chatService;
    private final ActivityLogService activityLogService;
    private final SeuFacultySyncService seuFacultySyncService;
    private final CacheManager cacheManager;
    private final HttpServletRequest httpRequest;

    public AdminController(AdminService adminService,
                           PaymentService paymentService,
                           ContributionService contributionService,
                           WaiverService waiverService,
                           ResourceService resourceService,
                           CourseService courseService,
                           TeacherService teacherService,
                           EmailService emailService,
                           ReviewModerationService reviewModerationService,
                           AuthService authService,
                           NoticeService noticeService,
                           ChatService chatService,
                           ActivityLogService activityLogService,
                           SeuFacultySyncService seuFacultySyncService,
                           CacheManager cacheManager,
                           HttpServletRequest httpRequest) {
        this.adminService = adminService;
        this.paymentService = paymentService;
        this.contributionService = contributionService;
        this.waiverService = waiverService;
        this.resourceService = resourceService;
        this.courseService = courseService;
        this.teacherService = teacherService;
        this.emailService = emailService;
        this.reviewModerationService = reviewModerationService;
        this.authService = authService;
        this.noticeService = noticeService;
        this.chatService = chatService;
        this.activityLogService = activityLogService;
        this.seuFacultySyncService = seuFacultySyncService;
        this.cacheManager = cacheManager;
        this.httpRequest = httpRequest;
    }

    private User getCurrentAdminUser() {
        try {
            var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof CustomUserDetails cud) {
                return cud.getUser();
            }
        } catch (Exception ignored) {}
        return null;
    }

    private void logAdminAction(String action, String actionType, String details) {
        try {
            User user = getCurrentAdminUser();
            activityLogService.logActivity(action, actionType, details, user, httpRequest);
        } catch (Exception ignored) {}
    }


    // ==========================================
    // Audit & Activity Logs (All Admins)
    // ==========================================
    @GetMapping("/activity-logs")
    public ResponseEntity<ActivityLogPageResponse> getActivityLogs(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(required = false, defaultValue = "") String search,
            @RequestParam(required = false) String actionType) {
        return ResponseEntity.ok(activityLogService.getActivityLogs(page - 1, size, search, actionType));
    }


    @PostMapping("/cache/clear")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Map<String, String>> clearApplicationCaches() {
        if (cacheManager != null) {
            for (String name : cacheManager.getCacheNames()) {
                var c = cacheManager.getCache(name);
                if (c != null) c.clear();
            }
        }
        return ResponseEntity.ok(Map.of("message", "All application caches cleared successfully."));
    }

    @DeleteMapping("/activity-logs")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, String>> clearActivityLogs() {
        logAdminAction("LOGS_CLEAR", "SYSTEM", "Super Admin cleared activity audit logs");
        activityLogService.clearAllLogs();
        return ResponseEntity.ok(Map.of("message", "All activity logs have been cleared successfully."));
    }

    private void evictAnalyticsCache() {
        if (cacheManager != null) {
            var c1 = cacheManager.getCache("admin_analytics");
            if (c1 != null) c1.clear();
            var c2 = cacheManager.getCache("admin_stats");
            if (c2 != null) c2.clear();
        }
    }

    @GetMapping("/analytics")
    @Cacheable(value = "admin_analytics", unless = "#result == null")
    public ResponseEntity<AdminAnalyticsDto> getAnalytics() {
        return ResponseEntity.ok(adminService.getAnalyticsData());
    }

    @GetMapping("/stats")
    @Cacheable(value = "admin_stats", unless = "#result == null")
    public ResponseEntity<AdminDashboardStats> getStats() {
        return ResponseEntity.ok(adminService.getDashboardStats());
    }

    // ==========================================
    // Course-Teacher Assignment & Creation Management
    // ==========================================
    @PostMapping("/courses")
    public ResponseEntity<Map<String, Object>> createCourse(
            @RequestBody Map<String, Object> payload) {
        Course course = new Course();
        course.setCode((String) payload.get("code"));
        course.setTitle((String) payload.get("title"));
        if (payload.get("credits") != null) {
            course.setCredits(Double.parseDouble(payload.get("credits").toString()));
        }
        if (payload.get("semester") != null) {
            course.setSemester(Integer.parseInt(payload.get("semester").toString()));
        }
        if (payload.get("department") != null) {
            course.setDepartment((String) payload.get("department"));
        }
        if (payload.get("isLab") != null) {
            course.setLab(Boolean.parseBoolean(payload.get("isLab").toString()));
        }
        Long initialTeacherId = null;
        if (payload.get("teacherId") != null && !payload.get("teacherId").toString().isEmpty()) {
            initialTeacherId = Long.parseLong(payload.get("teacherId").toString());
        }
        Course created = courseService.createCourse(course, initialTeacherId);
        logAdminAction("COURSE_CREATE", "ACADEMIC", "Admin created curriculum course: " + created.getCode() + " - " + created.getTitle());
        return ResponseEntity.ok(Map.of("success", true, "message", "Course created successfully", "course", created));
    }

    @PostMapping("/courses/{code}/teachers/{teacherId}")
    public ResponseEntity<Map<String, Object>> assignTeacherToCourse(
            @PathVariable String code,
            @PathVariable Long teacherId) {
        courseService.assignTeacherToCourse(code, teacherId);
        logAdminAction("FACULTY_ASSIGN", "ACADEMIC", "Assigned faculty ID #" + teacherId + " to course " + code);
        return ResponseEntity.ok(Map.of("success", true, "message", "Teacher assigned to course successfully"));
    }

    @DeleteMapping("/courses/{code}/teachers/{teacherId}")
    public ResponseEntity<Map<String, Object>> removeTeacherFromCourse(
            @PathVariable String code,
            @PathVariable Long teacherId) {
        courseService.removeTeacherFromCourse(code, teacherId);
        logAdminAction("FACULTY_UNASSIGN", "ACADEMIC", "Removed faculty ID #" + teacherId + " from course " + code);
        return ResponseEntity.ok(Map.of("success", true, "message", "Teacher removed from course successfully"));
    }

    @PutMapping("/courses/{code}")
    public ResponseEntity<Map<String, Object>> updateCourse(
            @PathVariable String code,
            @RequestBody Map<String, Object> payload) {
        Course updated = courseService.updateCourse(code, payload);
        logAdminAction("COURSE_UPDATE", "ACADEMIC", "Admin updated curriculum course details for: " + code);
        return ResponseEntity.ok(Map.of("success", true, "message", "Course updated successfully", "course", updated));
    }

    @DeleteMapping("/courses/{code}")
    public ResponseEntity<Map<String, Object>> deleteCourse(@PathVariable String code) {
        courseService.deleteCourse(code);
        logAdminAction("COURSE_DELETE", "ACADEMIC", "Admin deleted curriculum course: " + code);
        return ResponseEntity.ok(Map.of("success", true, "message", "Course deleted successfully"));
    }

    // ==========================================
    // Teacher / Faculty Directory CRUD
    // ==========================================
    @PostMapping("/teachers")
    public ResponseEntity<Map<String, Object>> createTeacher(@RequestBody Teacher teacher) {
        Teacher saved = teacherService.createTeacher(teacher);
        logAdminAction("FACULTY_CREATE", "ACADEMIC", "Admin created faculty profile: " + saved.getName() + (saved.getInitial() != null ? " (" + saved.getInitial() + ")" : ""));
        return ResponseEntity.ok(Map.of("success", true, "message", "Faculty profile created successfully", "teacher", saved));
    }

    @PostMapping("/teachers/upload-photo")
    public ResponseEntity<Map<String, Object>> uploadFacultyPhoto(
            @RequestParam("file") MultipartFile file) throws IOException {
        String photoUrl = teacherService.uploadFacultyPhoto(file);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "url", photoUrl,
                "message", "Faculty photo uploaded successfully"
        ));
    }

    @PutMapping("/teachers/{id}")
    public ResponseEntity<Map<String, Object>> updateTeacher(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload) {
        Teacher updated = teacherService.updateTeacher(id, payload);
        logAdminAction("FACULTY_UPDATE", "ACADEMIC", "Admin updated faculty profile ID #" + id + " (" + updated.getName() + ")");
        return ResponseEntity.ok(Map.of("success", true, "message", "Faculty profile updated successfully", "teacher", updated));
    }

    @DeleteMapping("/teachers/{id}")
    public ResponseEntity<Map<String, Object>> deleteTeacher(@PathVariable Long id) {
        teacherService.deleteTeacher(id);
        logAdminAction("FACULTY_DELETE", "ACADEMIC", "Admin deleted faculty profile ID #" + id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Faculty member removed successfully"));
    }

    // ==========================================
    // Resource Management (CRUD for Notes/Exams)
    // ==========================================
    @GetMapping("/resources")
    public ResponseEntity<List<Resource>> getAllResources() {
        return ResponseEntity.ok(resourceService.getAllResourcesForAdmin());
    }

    @PostMapping("/resources/upload")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'MANAGER')")
    public ResponseEntity<Map<String, Object>> uploadMaterialFile(
            @RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(resourceService.uploadMaterialFile(file));
    }

    @PostMapping("/resources")
    public ResponseEntity<Resource> createResource(
            @Valid @RequestBody ResourceCreateRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        Resource created = resourceService.createResource(request, userDetails != null ? userDetails.getUser() : null);
        logAdminAction("RESOURCE_UPLOAD", "CONTENT", "Admin uploaded material: " + created.getTitle() + (created.getCourse() != null ? " for course " + created.getCourse().getCode() : ""));
        evictAnalyticsCache();
        return ResponseEntity.ok(created);
    }

    @PutMapping("/resources/{id}")
    public ResponseEntity<Resource> updateResource(
            @PathVariable Long id,
            @RequestBody ResourceCreateRequest request) {
        Resource updated = resourceService.updateResource(id, request);
        evictAnalyticsCache();
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/resources/{id}")
    public ResponseEntity<Map<String, Object>> deleteResource(@PathVariable Long id) {
        resourceService.deleteResource(id);
        logAdminAction("RESOURCE_DELETE", "CONTENT", "Admin deleted study material ID #" + id);
        evictAnalyticsCache();
        return ResponseEntity.ok(Map.of("success", true, "message", "Resource deleted successfully"));
    }

    // ==========================================
    // Staff & Team Management (Super Admin only)
    // ==========================================
    @GetMapping("/staff")
    public ResponseEntity<List<StaffResponseDto>> getAllStaff() {
        return ResponseEntity.ok(adminService.getAllStaff());
    }

    @PostMapping("/staff")
    public ResponseEntity<StaffResponseDto> createStaff(
            @Valid @RequestBody StaffCreateRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        StaffResponseDto staff = adminService.createStaff(request, userDetails.getUser());
        logAdminAction("STAFF_CREATE", "STAFF", "Super Admin provisioned staff account: " + request.getEmail() + " as " + request.getRole());
        return ResponseEntity.ok(staff);
    }

    @PutMapping("/staff/{id}")
    public ResponseEntity<StaffResponseDto> updateStaff(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(adminService.updateStaff(id, payload, userDetails.getUser()));
    }

    @PutMapping("/staff/{id}/toggle-status")
    public ResponseEntity<Map<String, Object>> toggleStaffStatus(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        Map<String, Object> res = adminService.toggleStaffBlock(id, userDetails.getUser());
        logAdminAction("STAFF_STATUS_TOGGLE", "STAFF", "Super Admin toggled account active status for staff member ID #" + id);
        return ResponseEntity.ok(res);
    }

    @DeleteMapping("/staff/{id}")
    public ResponseEntity<Map<String, Object>> deleteStaff(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        adminService.deleteStaff(id, userDetails.getUser());
        logAdminAction("STAFF_DELETE", "STAFF", "Super Admin removed staff account ID #" + id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Staff account removed successfully"));
    }

    // ==========================================
    // Course Gifting to Student (Super Admin only)
    // ==========================================
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @PostMapping("/users/{userId}/gift-course")
    public ResponseEntity<Map<String, Object>> giftCourseToStudent(
            @PathVariable Long userId,
            @Valid @RequestBody GiftCourseRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        Map<String, Object> res = adminService.giftCourseToStudent(userId, request, userDetails.getUser());
        logAdminAction("COURSE_GIFT", "USER_MANAGEMENT", "Super Admin gifted course " + request.getCourseCode() + " to student ID #" + userId);
        evictAnalyticsCache();
        return ResponseEntity.ok(res);
    }

    @GetMapping("/users/{userId}/unlocked-courses")
    public ResponseEntity<List<Map<String, Object>>> getStudentUnlockedCourses(
            @PathVariable Long userId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(adminService.getStudentUnlockedCourses(userId, userDetails.getUser()));
    }

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @DeleteMapping("/users/{userId}/unlocked-courses/{courseId}")
    public ResponseEntity<Map<String, Object>> revokeStudentUnlockedCourse(
            @PathVariable Long userId,
            @PathVariable Long courseId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        Map<String, Object> res = adminService.revokeStudentUnlockedCourse(userId, courseId, userDetails.getUser());
        logAdminAction("COURSE_REVOKE", "USER_MANAGEMENT", "Super Admin revoked course ID #" + courseId + " from student ID #" + userId);
        evictAnalyticsCache();
        return ResponseEntity.ok(res);
    }

    // ==========================================
    // Payments Management
    // ==========================================
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @GetMapping("/payments")
    public ResponseEntity<List<PaymentRequest>> getPayments(@RequestParam(required = false) PaymentStatus status) {
        return ResponseEntity.ok(paymentService.getPayments(status));
    }

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @GetMapping("/subscriptions")
    public ResponseEntity<List<Subscription>> getSubscriptions(@RequestParam(required = false) Boolean active) {
        return ResponseEntity.ok(paymentService.getSubscriptions(active));
    }

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @PostMapping("/payments/{id}/approve")
    public ResponseEntity<PaymentRequest> approvePayment(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String notes = body != null && body.containsKey("notes") ? body.get("notes") : "Approved by Admin";
        PaymentRequest p = paymentService.approvePayment(id, notes);
        logAdminAction("PAYMENT_APPROVE", "BILLING", "Super Admin approved subscription payment ID #" + id + " (" + notes + ")");
        evictAnalyticsCache();
        return ResponseEntity.ok(p);
    }

    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @PostMapping("/payments/{id}/reject")
    public ResponseEntity<PaymentRequest> rejectPayment(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String notes = body != null && body.containsKey("notes") ? body.get("notes") : "Rejected by Admin";
        PaymentRequest p = paymentService.rejectPayment(id, notes);
        logAdminAction("PAYMENT_REJECT", "BILLING", "Super Admin rejected subscription payment ID #" + id + " (" + notes + ")");
        evictAnalyticsCache();
        return ResponseEntity.ok(p);
    }

    // ==========================================
    // Student Contributions Management
    // ==========================================
    @GetMapping("/contributions")
    public ResponseEntity<List<ContributionRequest>> getContributions(@RequestParam(required = false) ResourceStatus status) {
        return ResponseEntity.ok(contributionService.getContributions(status));
    }

    @PostMapping("/contributions/{id}/approve")
    public ResponseEntity<ContributionRequest> approveContribution(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body) {
        String feedback = body != null && body.containsKey("feedback") && body.get("feedback") != null
                ? String.valueOf(body.get("feedback")) : "Approved! Your 2 reward courses have been unlocked.";
        String title = body != null && body.containsKey("title") && body.get("title") != null
                ? String.valueOf(body.get("title")) : null;
        Long teacherId = null;
        if (body != null && body.containsKey("teacherId") && body.get("teacherId") != null && !String.valueOf(body.get("teacherId")).trim().isEmpty()) {
            try {
                teacherId = Long.parseLong(String.valueOf(body.get("teacherId")));
            } catch (Exception ignored) {}
        }
        String resourceType = body != null && body.containsKey("resourceType") && body.get("resourceType") != null
                ? String.valueOf(body.get("resourceType")) : null;
        String semesterName = body != null && body.containsKey("semesterName") && body.get("semesterName") != null
                ? String.valueOf(body.get("semesterName")) : null;
        String courseCode = body != null && body.containsKey("courseCode") && body.get("courseCode") != null
                ? String.valueOf(body.get("courseCode")) : null;
        String department = body != null && body.containsKey("department") && body.get("department") != null
                ? String.valueOf(body.get("department")) : null;

        ContributionRequest c = contributionService.approveContribution(id, feedback, title, teacherId, resourceType, semesterName, courseCode, department);
        logAdminAction("CONTRIBUTION_APPROVE", "CONTENT", "Admin approved student study contribution ID #" + id + (courseCode != null ? " for course " + courseCode : ""));
        return ResponseEntity.ok(c);
    }

    @PostMapping("/contributions/{id}/reject")
    public ResponseEntity<ContributionRequest> rejectContribution(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String feedback = body != null && body.containsKey("feedback") ? body.get("feedback") : "Resource does not meet quality requirements.";
        ContributionRequest c = contributionService.rejectContribution(id, feedback);
        logAdminAction("CONTRIBUTION_REJECT", "CONTENT", "Admin rejected student contribution ID #" + id + " (" + feedback + ")");
        return ResponseEntity.ok(c);
    }

    @DeleteMapping("/contributions/{id}")
    public ResponseEntity<Map<String, Object>> deleteContribution(@PathVariable Long id) {
        contributionService.deleteContribution(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Contribution request deleted successfully"));
    }

    @GetMapping("/resources/{id}/file")
    public ResponseEntity<byte[]> getAdminResourceFile(
            @PathVariable Long id,
            @RequestParam(required = false, defaultValue = "false") boolean download,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return resourceService.streamResourceFile(id, download, userDetails != null ? userDetails.getUser() : null);
    }

    // ==========================================
    // Free Access Waiver Management
    // ==========================================
    @GetMapping("/waivers")
    public ResponseEntity<List<WaiverRequest>> getWaivers(@RequestParam(required = false) PaymentStatus status) {
        return ResponseEntity.ok(waiverService.getWaivers(status));
    }

    @PostMapping("/waivers/{id}/approve")
    public ResponseEntity<WaiverRequest> approveWaiver(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body) {
        int quota = 6;
        String notes = "Approved by Admin";
        if (body != null) {
            if (body.containsKey("grantedCoursesCount")) {
                quota = Integer.parseInt(body.get("grantedCoursesCount").toString());
            }
            if (body.containsKey("notes")) {
                notes = body.get("notes").toString();
            }
        }
        WaiverRequest w = waiverService.approveWaiver(id, quota, notes);
        logAdminAction("WAIVER_APPROVE", "BILLING", "Admin approved 100% financial waiver request ID #" + id + " (Quota: " + quota + " courses)");
        evictAnalyticsCache();
        return ResponseEntity.ok(w);
    }

    @PostMapping("/waivers/{id}/reject")
    public ResponseEntity<WaiverRequest> rejectWaiver(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String notes = body != null && body.containsKey("notes") ? body.get("notes") : "Application declined.";
        WaiverRequest w = waiverService.rejectWaiver(id, notes);
        logAdminAction("WAIVER_REJECT", "BILLING", "Admin rejected financial waiver request ID #" + id);
        evictAnalyticsCache();
        return ResponseEntity.ok(w);
    }

    // ==========================================
    // Student Reviews & Evaluation Moderation
    // ==========================================
    @GetMapping("/reviews")
    public ResponseEntity<List<ReviewResponseDto>> getAllReviews(
            @RequestParam(required = false) ReviewStatus status) {
        return ResponseEntity.ok(reviewModerationService.getAllReviewsForAdmin(status));
    }

    @PostMapping("/reviews/{id}/approve")
    public ResponseEntity<ReviewResponseDto> approveReview(@PathVariable Long id) {
        ReviewResponseDto dto = reviewModerationService.approveReview(id);
        logAdminAction("REVIEW_APPROVE", "ACADEMIC", "Admin approved & published review ID #" + id);
        evictAnalyticsCache();
        return ResponseEntity.ok(dto);
    }

    @PostMapping("/reviews/{id}/reject")
    public ResponseEntity<ReviewResponseDto> rejectReview(@PathVariable Long id) {
        ReviewResponseDto dto = reviewModerationService.rejectReview(id);
        logAdminAction("REVIEW_REJECT", "ACADEMIC", "Admin rejected/unpublished review ID #" + id);
        evictAnalyticsCache();
        return ResponseEntity.ok(dto);
    }

    @DeleteMapping("/reviews/{id}")
    public ResponseEntity<Void> deleteReview(@PathVariable Long id) {
        reviewModerationService.deleteReview(id);
        logAdminAction("REVIEW_DELETE", "ACADEMIC", "Admin permanently deleted review ID #" + id);
        evictAnalyticsCache();
        return ResponseEntity.ok().build();
    }

    // ==========================================
    // System Settings & Admin Profile
    // ==========================================
    @GetMapping("/settings")
    public ResponseEntity<Map<String, Object>> getSystemSettings() {
        return ResponseEntity.ok(Map.of(
                "emailNotificationsEnabled", emailService.isEmailNotificationsEnabled(),
                "smtpConfigured", emailService.isSmtpConfigured(),
                "smtpSender", emailService.getSmtpSender(),
                "smtpHost", emailService.getSmtpHost(),
                "statusMessage", emailService.isSmtpConfigured()
                        ? "Google SMTP Authenticated & Ready"
                        : "Dev Simulation Mode (Google App Password not configured)"
        ));
    }

    @PostMapping("/settings/send-test-email")
    public ResponseEntity<Map<String, Object>> sendTestEmail(
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        String recipient = body != null && body.containsKey("recipientEmail") && !body.get("recipientEmail").isBlank()
                ? body.get("recipientEmail")
                : (userDetails != null && userDetails.getUser() != null ? userDetails.getUser().getEmail() : "admin@seu.edu.bd");
        Map<String, Object> result = emailService.sendTestEmail(recipient);
        logAdminAction("TEST_EMAIL", "SYSTEM", "Admin triggered test email to " + recipient + ": success=" + result.get("success"));
        return ResponseEntity.ok(result);
    }

    @PostMapping("/settings/email-toggle")
    public ResponseEntity<Map<String, Object>> toggleEmailNotifications(
            @RequestBody Map<String, Boolean> body) {
        boolean enabled = body != null && body.getOrDefault("enabled", true);
        emailService.setEmailNotificationsEnabled(enabled);
        logAdminAction("SETTINGS_UPDATE", "SYSTEM", "Admin updated notification settings: emailNotificationsEnabled=" + enabled);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "emailNotificationsEnabled", enabled
        ));
    }

    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> getAdminProfile(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(adminService.getAdminProfile(userDetails.getUser()));
    }

    @PutMapping("/profile")
    public ResponseEntity<Map<String, Object>> updateAdminProfile(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(adminService.updateAdminProfile(
                userDetails.getUser(),
                body.get("name"),
                body.get("phone"),
                body.get("address"),
                body.containsKey("avatarUrl") ? body.get("avatarUrl") : null
        ));
    }

    @PostMapping("/avatar/upload")
    public ResponseEntity<Map<String, Object>> uploadAdminAvatar(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails userDetails) throws IOException {
        com.notelagbe.dto.UserProfileResponse up = authService.uploadAvatar(userDetails.getUser(), file);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "avatarUrl", up.getAvatarUrl() != null ? up.getAvatarUrl() : "",
                "message", "Admin profile photo uploaded successfully"
        ));
    }

    @DeleteMapping("/avatar")
    public ResponseEntity<Map<String, Object>> removeAdminAvatar(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        authService.removeAvatar(userDetails.getUser());
        return ResponseEntity.ok(Map.of(
                "success", true,
                "avatarUrl", "",
                "message", "Admin profile photo removed successfully"
        ));
    }

    @PutMapping("/password")
    public ResponseEntity<Map<String, Object>> changeAdminPassword(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(adminService.changeAdminPassword(userDetails.getUser(), body.get("currentPassword"), body.get("newPassword")));
    }

    // ==========================================
    // Notice Board & Announcements Management
    // ==========================================
    @GetMapping("/notices")
    public ResponseEntity<List<Notice>> getAllNotices() {
        return ResponseEntity.ok(noticeService.getAllNotices());
    }

    @PostMapping("/notices")
    public ResponseEntity<Notice> createNotice(@Valid @RequestBody NoticeRequest request) {
        Notice n = noticeService.createNotice(request);
        logAdminAction("NOTICE_CREATE", "SYSTEM", "Admin published campus notice: " + (n.getText() != null && n.getText().length() > 50 ? n.getText().substring(0, 50) + "..." : n.getText()));
        return ResponseEntity.ok(n);
    }

    @PutMapping("/notices/{id}")
    public ResponseEntity<Notice> updateNotice(@PathVariable Long id, @Valid @RequestBody NoticeRequest request) {
        return ResponseEntity.ok(noticeService.updateNotice(id, request));
    }

    @DeleteMapping("/notices/{id}")
    public ResponseEntity<Map<String, Object>> deleteNotice(@PathVariable Long id) {
        noticeService.deleteNotice(id);
        logAdminAction("NOTICE_DELETE", "SYSTEM", "Admin deleted campus notice ID #" + id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Notice deleted successfully"));
    }

    @PutMapping("/notices/{id}/toggle-status")
    public ResponseEntity<Map<String, Object>> toggleNoticeStatus(@PathVariable Long id) {
        Map<String, Object> res = noticeService.toggleNoticeStatus(id);
        logAdminAction("NOTICE_TOGGLE", "SYSTEM", "Admin toggled campus notice status ID #" + id);
        return ResponseEntity.ok(res);
    }

    // ==========================================
    // Community Live Chat Moderation
    // ==========================================
    @DeleteMapping("/chat/messages/{id}")
    public ResponseEntity<Map<String, Object>> deleteChatMessage(@PathVariable Long id) {
        chatService.deleteMessage(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Message deleted successfully"));
    }

    @PostMapping("/chat/messages/{id}/pin")
    public ResponseEntity<ChatMessageDto> pinChatMessage(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(chatService.pinMessage(id, userDetails.getUser()));
    }

    @PostMapping("/chat/messages/{id}/unpin")
    public ResponseEntity<Map<String, Object>> unpinChatMessage(@PathVariable Long id) {
        chatService.unpinMessage(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Message unpinned successfully"));
    }

    @PostMapping("/chat/users/{userId}/block")
    public ResponseEntity<Map<String, Object>> blockUserFromChat(@PathVariable Long userId) {
        return ResponseEntity.ok(chatService.setUserChatBlocked(userId, true));
    }

    @PostMapping("/chat/users/{userId}/unblock")
    public ResponseEntity<Map<String, Object>> unblockUserFromChat(@PathVariable Long userId) {
        return ResponseEntity.ok(chatService.setUserChatBlocked(userId, false));
    }
}