package com.notelagbe.service;

import com.notelagbe.dto.ContributionSubmitRequest;
import com.notelagbe.dto.ContributorLeaderboardItem;
import com.notelagbe.dto.LinkVerificationResponse;
import com.notelagbe.entity.*;
import com.notelagbe.exception.ApiException;
import com.notelagbe.exception.ResourceNotFoundException;
import com.notelagbe.repository.*;
import com.notelagbe.security.UrlSecurityValidator;
import org.springframework.cache.annotation.CacheEvict;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ContributionService {

    private final ContributionRequestRepository contributionRequestRepository;
    private final ResourceRepository resourceRepository;
    private final CourseRepository courseRepository;
    private final TeacherRepository teacherRepository;
    private final TeacherCourseRepository teacherCourseRepository;
    private final UnlockedCourseRepository unlockedCourseRepository;
    private final LiveSyncService liveSyncService;
    private static final Logger log = LoggerFactory.getLogger(ContributionService.class);

    private final InputSanitizationService inputSanitizationService;
    private final NotificationService notificationService;
    private final ResourceDuplicateService resourceDuplicateService;
    private final CloudflareR2Service r2Service;
    private final CloudinaryService cloudinaryService;

    public ContributionService(ContributionRequestRepository contributionRequestRepository,
                               ResourceRepository resourceRepository,
                               CourseRepository courseRepository,
                               TeacherRepository teacherRepository,
                               TeacherCourseRepository teacherCourseRepository,
                               UnlockedCourseRepository unlockedCourseRepository,
                               LiveSyncService liveSyncService,
                               InputSanitizationService inputSanitizationService,
                               NotificationService notificationService,
                               ResourceDuplicateService resourceDuplicateService) {
        this(contributionRequestRepository, resourceRepository, courseRepository, teacherRepository,
                teacherCourseRepository, unlockedCourseRepository, liveSyncService, inputSanitizationService,
                notificationService, resourceDuplicateService, new CloudflareR2Service(), new CloudinaryService());
    }

    public ContributionService(ContributionRequestRepository contributionRequestRepository,
                               ResourceRepository resourceRepository,
                               CourseRepository courseRepository,
                               TeacherRepository teacherRepository,
                               TeacherCourseRepository teacherCourseRepository,
                               UnlockedCourseRepository unlockedCourseRepository,
                               LiveSyncService liveSyncService,
                               InputSanitizationService inputSanitizationService,
                               NotificationService notificationService,
                               ResourceDuplicateService resourceDuplicateService,
                               CloudflareR2Service r2Service) {
        this(contributionRequestRepository, resourceRepository, courseRepository, teacherRepository,
                teacherCourseRepository, unlockedCourseRepository, liveSyncService, inputSanitizationService,
                notificationService, resourceDuplicateService, r2Service, new CloudinaryService());
    }

    @org.springframework.beans.factory.annotation.Autowired
    public ContributionService(ContributionRequestRepository contributionRequestRepository,
                               ResourceRepository resourceRepository,
                               CourseRepository courseRepository,
                               TeacherRepository teacherRepository,
                               TeacherCourseRepository teacherCourseRepository,
                               UnlockedCourseRepository unlockedCourseRepository,
                               LiveSyncService liveSyncService,
                               InputSanitizationService inputSanitizationService,
                               NotificationService notificationService,
                               ResourceDuplicateService resourceDuplicateService,
                               CloudflareR2Service r2Service,
                               CloudinaryService cloudinaryService) {
        this.contributionRequestRepository = contributionRequestRepository;
        this.resourceRepository = resourceRepository;
        this.courseRepository = courseRepository;
        this.teacherRepository = teacherRepository;
        this.teacherCourseRepository = teacherCourseRepository;
        this.unlockedCourseRepository = unlockedCourseRepository;
        this.liveSyncService = liveSyncService;
        this.inputSanitizationService = inputSanitizationService;
        this.notificationService = notificationService;
        this.resourceDuplicateService = resourceDuplicateService;
        this.r2Service = r2Service != null ? r2Service : new CloudflareR2Service();
        this.cloudinaryService = cloudinaryService != null ? cloudinaryService : new CloudinaryService();
    }

    @Transactional
    public ContributionRequest submitContribution(ContributionSubmitRequest request, User user) {
        // Sanitize and validate title against XSS, spam, and profanity
        String cleanTitle = inputSanitizationService.validateGenuineText(request.getTitle(), "Material title", 5, 80, true);

        // Sanitize and validate semester
        String cleanSemester = inputSanitizationService.sanitizePlainText(request.getSemesterName());
        if (cleanSemester.length() < 3 || cleanSemester.length() > 25) {
            throw new ApiException("Semester must be between 3 and 25 characters");
        }
        if (cleanSemester.matches(".*(.)\\1{3,}.*")) {
            throw new ApiException("Invalid semester: repetitive spam characters are not allowed");
        }
        String canonicalSemester = resourceDuplicateService.normalizeSemesterName(cleanSemester);
        if (!canonicalSemester.isEmpty()) {
            cleanSemester = canonicalSemester;
        }

        // Sanitize and validate file URL
        String cleanUrl = request.getFileUrl() != null ? request.getFileUrl().trim() : "";
        if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
            throw new ApiException("File URL must start with http:// or https://");
        }
        if (cleanUrl.length() > 300) {
            throw new ApiException("File URL cannot exceed 300 characters");
        }

        request.setTitle(cleanTitle);
        request.setSemesterName(cleanSemester);
        request.setFileUrl(cleanUrl);

        String uploadCode = request.getCourseCode().trim();
        Teacher resolvedTeacher = (request.getTeacherId() != null && request.getTeacherId() > 0)
                ? teacherRepository.findById(request.getTeacherId()).orElse(null)
                : null;
        resourceDuplicateService.assertNoDuplicate(
                uploadCode,
                resolvedTeacher != null ? resolvedTeacher.getId() : null,
                request.getResourceType(),
                cleanSemester,
                cleanTitle,
                null
        );

        String targetDept = (request.getDepartment() != null && !request.getDepartment().trim().isEmpty())
                ? request.getDepartment().trim().toUpperCase()
                : "CSE";

        Course uploadCourse = courseRepository.findByCodeIgnoreCase(uploadCode)
                .orElseThrow(() -> new ApiException("Upload target course not found in official catalog: " + uploadCode));

        String rCode1 = request.getRequestedCourseCode1().trim();
        Course rewardCourse1 = courseRepository.findByCodeIgnoreCase(rCode1)
                .orElseThrow(() -> new ApiException("Reward course 1 not found in official catalog: " + rCode1));

        String rCode2 = request.getRequestedCourseCode2().trim();
        Course rewardCourse2 = courseRepository.findByCodeIgnoreCase(rCode2)
                .orElseThrow(() -> new ApiException("Reward course 2 not found in official catalog: " + rCode2));

        // Ensure upload course department is recorded
        if (uploadCourse.getDepartment() == null || uploadCourse.getDepartment().trim().isEmpty()) {
            uploadCourse.setDepartment(targetDept);
            courseRepository.save(uploadCourse);
        }

        Teacher teacher = null;
        if (request.getTeacherId() != null) {
            teacher = teacherRepository.findById(request.getTeacherId()).orElse(null);
        }

        // 1. Create Pending Resource
        Resource resource = new Resource();
        resource.setTitle(request.getTitle());
        resource.setType(request.getResourceType());
        resource.setFileUrl(request.getFileUrl());
        resource.setPreviewUrl(request.getPreviewUrl());
        resource.setSemesterName(request.getSemesterName());
        resource.setAcademicYear(resourceDuplicateService.resolveAcademicYear(request.getSemesterName(), request.getYear()));
        resource.setCourse(uploadCourse);
        resource.setTeacher(teacher);
        resource.setDepartment(targetDept);
        resource.setUploader(user);
        resource.setStatus(ResourceStatus.PENDING);
        resource = resourceRepository.save(resource);

        // 2. Create Contribution Request
        ContributionRequest cr = new ContributionRequest();
        cr.setUser(user);
        cr.setUploadedResource(resource);
        cr.setRequestedCourse1(rewardCourse1);
        cr.setRequestedCourse2(rewardCourse2);
        cr.setStatus(ResourceStatus.PENDING);

        ContributionRequest saved = contributionRequestRepository.save(cr);
        resourceDuplicateService.evictCourse(uploadCourse.getCode());
        liveSyncService.broadcast("contribution", "created", saved.getId());
        return saved;
    }

    @Transactional(readOnly = true)
    public List<ContributionRequest> getContributions(ResourceStatus status) {
        List<ContributionRequest> list = status != null
                ? contributionRequestRepository.findByStatusOrderByCreatedAtDesc(status)
                : contributionRequestRepository.findAllByOrderByCreatedAtDesc();
        presignContributionResources(list);
        return list;
    }

    @Transactional(readOnly = true)
    public List<ContributionRequest> getUserContributions(Long userId) {
        List<ContributionRequest> list = contributionRequestRepository.findByUserIdOrderByCreatedAtDesc(userId);
        presignContributionResources(list);
        return list;
    }

    private void presignContributionResources(List<ContributionRequest> list) {
        if (r2Service == null || !r2Service.isConfigured() || list == null) return;
        for (ContributionRequest cr : list) {
            Resource r = cr.getUploadedResource();
            if (r != null && r.getFileUrl() != null && (r.getFileUrl().contains(".r2.") || r.getFileUrl().contains("r2.dev") || r.getFileUrl().contains("r2_"))) {
                r.setFileUrl(r2Service.getPresignedDownloadUrl(r.getFileUrl(), 24));
            }
        }
    }

    @CacheEvict(value = {"courses", "course_details", "course_resources", "teacher_resources", "teachers", "teacher_details", "teacher_courses", "duplicate_slots"}, allEntries = true)
    @Transactional
    public ContributionRequest approveContribution(Long contributionId, String feedback) {
        return approveContribution(contributionId, feedback, null, null, null, null, null, null);
    }

    @CacheEvict(value = {"courses", "course_details", "course_resources", "teacher_resources", "teachers", "teacher_details", "teacher_courses", "duplicate_slots"}, allEntries = true)
    @Transactional
    public ContributionRequest approveContribution(Long contributionId, String feedback, String editedTitle, Long teacherId, String resourceType, String semesterName, String courseCode) {
        return approveContribution(contributionId, feedback, editedTitle, teacherId, resourceType, semesterName, courseCode, null);
    }

    @CacheEvict(value = {"courses", "course_details", "course_resources", "teacher_resources", "teachers", "teacher_details", "teacher_courses", "duplicate_slots"}, allEntries = true)
    @Transactional
    public ContributionRequest approveContribution(Long contributionId, String feedback, String editedTitle, Long teacherId, String resourceType, String semesterName, String courseCode, String department) {
        ContributionRequest cr = contributionRequestRepository.findById(contributionId)
                .orElseThrow(() -> new ResourceNotFoundException("Contribution request not found: " + contributionId));

        if (cr.getStatus() == ResourceStatus.APPROVED) {
            throw new ApiException("Contribution is already approved!");
        }

        // 1. Update and approve resource with admin edits
        Resource res = cr.getUploadedResource();
        if (editedTitle != null && !editedTitle.trim().isEmpty()) {
            res.setTitle(editedTitle.trim());
        }
        if (teacherId != null) {
            if (teacherId <= 0) {
                res.setTeacher(null); // Central / All Faculty
            } else {
                teacherRepository.findById(teacherId).ifPresent(res::setTeacher);
            }
        }
        if (resourceType != null && !resourceType.trim().isEmpty()) {
            try {
                res.setType(ResourceType.valueOf(resourceType.trim().toUpperCase()));
            } catch (Exception ignored) {}
        }
        if (semesterName != null && !semesterName.trim().isEmpty()) {
            res.setSemesterName(resourceDuplicateService.normalizeSemesterName(semesterName));
        } else {
            String normalizedExisting = resourceDuplicateService.normalizeSemesterName(res.getSemesterName());
            if (!normalizedExisting.isEmpty()) {
                res.setSemesterName(normalizedExisting);
            }
        }
        res.setAcademicYear(resourceDuplicateService.resolveAcademicYear(res.getSemesterName(), res.getAcademicYear()));
        if (courseCode != null && !courseCode.trim().isEmpty()) {
            courseRepository.findByCodeIgnoreCase(courseCode.trim()).ifPresent(res::setCourse);
        }

        // Department handling: set on both resource and course
        if (department != null && !department.trim().isEmpty()) {
            String cleanDept = department.trim().toUpperCase();
            res.setDepartment(cleanDept);
            if (res.getCourse() != null) {
                res.getCourse().setDepartment(cleanDept);
                courseRepository.save(res.getCourse());
            }
        } else if (res.getCourse() != null && (res.getDepartment() == null || res.getDepartment().trim().isEmpty())) {
            res.setDepartment(res.getCourse().getDepartment() != null ? res.getCourse().getDepartment() : "CSE");
        }

        resourceDuplicateService.assertNoDuplicate(
                res.getCourse() != null ? res.getCourse().getCode() : null,
                res.getTeacher() != null ? res.getTeacher().getId() : null,
                res.getType(),
                res.getSemesterName(),
                res.getTitle(),
                res.getId()
        );

        res.setStatus(ResourceStatus.APPROVED);
        resourceRepository.save(res);

        // Ensure teacher is officially linked to this course in teacher_courses
        if (res.getTeacher() != null && res.getCourse() != null) {
            if (!teacherCourseRepository.existsByCourseIdAndTeacherId(res.getCourse().getId(), res.getTeacher().getId())) {
                TeacherCourse tc = new TeacherCourse(res.getTeacher(), res.getCourse(), "General", "ADMIN_ASSIGNED");
                teacherCourseRepository.save(tc);
            }
        }

        // 2. Auto-unlock the 2 requested reward courses for the contributor for 3 Months (1 Full Semester / 90 Days)!
        User contributor = cr.getUser();
        LocalDateTime rewardExpiresAt = LocalDateTime.now().plusMonths(3);

        if (cr.getRequestedCourse1() != null) {
            Optional<UnlockedCourse> existing1 = unlockedCourseRepository.findByUserIdAndCourseIdAndTeacherIsNull(contributor.getId(), cr.getRequestedCourse1().getId());
            if (existing1.isPresent()) {
                UnlockedCourse uc = existing1.get();
                LocalDateTime base = (uc.getExpiresAt() != null && uc.getExpiresAt().isAfter(LocalDateTime.now())) ? uc.getExpiresAt() : LocalDateTime.now();
                uc.setExpiresAt(base.plusMonths(3));
                uc.setSource(UnlockSource.CONTRIBUTION_REWARD);
                unlockedCourseRepository.save(uc);
            } else {
                unlockedCourseRepository.save(new UnlockedCourse(contributor, cr.getRequestedCourse1(), UnlockSource.CONTRIBUTION_REWARD, rewardExpiresAt));
            }
        }

        if (cr.getRequestedCourse2() != null) {
            Optional<UnlockedCourse> existing2 = unlockedCourseRepository.findByUserIdAndCourseIdAndTeacherIsNull(contributor.getId(), cr.getRequestedCourse2().getId());
            if (existing2.isPresent()) {
                UnlockedCourse uc = existing2.get();
                LocalDateTime base = (uc.getExpiresAt() != null && uc.getExpiresAt().isAfter(LocalDateTime.now())) ? uc.getExpiresAt() : LocalDateTime.now();
                uc.setExpiresAt(base.plusMonths(3));
                uc.setSource(UnlockSource.CONTRIBUTION_REWARD);
                unlockedCourseRepository.save(uc);
            } else {
                unlockedCourseRepository.save(new UnlockedCourse(contributor, cr.getRequestedCourse2(), UnlockSource.CONTRIBUTION_REWARD, rewardExpiresAt));
            }
        }

        // 3. Update contribution request
        String c1Code = cr.getRequestedCourse1() != null ? cr.getRequestedCourse1().getCode() : "Course 1";
        String c2Code = cr.getRequestedCourse2() != null ? cr.getRequestedCourse2().getCode() : "Course 2";
        cr.setStatus(ResourceStatus.APPROVED);
        cr.setAdminFeedback(feedback != null && !feedback.trim().isEmpty() ? feedback.trim() : "Verified and approved! Your 2 requested reward courses (" + c1Code + ", " + c2Code + ") have been unlocked for 3 months (1 Full Semester) free.");
        cr.setReviewedAt(LocalDateTime.now());

        // Send in-app notification to contributor
        try {
            notificationService.createNotification(
                    contributor,
                    "Academic Contribution Approved! 🎉",
                    "Your uploaded material for " + (res.getCourse() != null ? res.getCourse().getCode() : "SEU") + " is verified. " + c1Code + " & " + c2Code + " are now unlocked for 3 months (90 days) free!",
                    "CONTRIBUTION_APPROVED",
                    "/courses"
            );
        } catch (Exception e) {
            log.warn("Failed to dispatch contribution approval notification: {}", e.getMessage());
        }

        ContributionRequest saved = contributionRequestRepository.save(cr);
        liveSyncService.broadcast("contribution", "approved", saved.getId());
        liveSyncService.broadcast("resource", "approved", res.getId());
        if (res.getCourse() != null) {
            liveSyncService.broadcast("course", "updated", res.getCourse().getId());
        }
        if (res.getTeacher() != null) {
            liveSyncService.broadcast("teacher", "updated", res.getTeacher().getId());
        }
        liveSyncService.broadcast("subscription", "unlocked", contributor.getId());
        return saved;
    }

    @CacheEvict(value = {"courses", "course_details", "teachers", "teacher_details", "teacher_courses", "duplicate_slots"}, allEntries = true)
    @Transactional
    public ContributionRequest rejectContribution(Long contributionId, String feedback) {
        ContributionRequest cr = contributionRequestRepository.findById(contributionId)
                .orElseThrow(() -> new ResourceNotFoundException("Contribution request not found: " + contributionId));

        Resource res = cr.getUploadedResource();
        String fileUrl = res != null ? res.getFileUrl() : null;
        String courseCode = (res != null && res.getCourse() != null) ? res.getCourse().getCode() : "SEU";
        String resourceTitle = res != null ? res.getTitle() : "Study Material";

        // 1. Permanently delete physical file from Cloud Storage asynchronously (never blocks DB transaction)
        if (fileUrl != null && !fileUrl.trim().isEmpty()) {
            CompletableFuture.runAsync(() -> deletePhysicalFile(fileUrl));
        }

        // 2. Safely update status and wipe preview URL (keep placeholder so non-null DB constraint never fails)
        if (res != null) {
            res.setStatus(ResourceStatus.REJECTED);
            res.setFileUrl("[REJECTED]");
            res.setPreviewUrl(null);
            resourceRepository.save(res);
        }

        cr.setStatus(ResourceStatus.REJECTED);
        String safeFeedback = feedback != null ? feedback.trim() : "";
        // Defensive guard: if MySQL/TiDB column is still legacy VARCHAR(255), never exceed 240 chars
        cr.setAdminFeedback(safeFeedback.length() > 240 ? safeFeedback.substring(0, 237) + "..." : safeFeedback);
        cr.setReviewedAt(LocalDateTime.now());

        // 3. Send in-app notification to contributor with full rejection reason
        try {
            User contributor = cr.getUser();
            if (contributor != null) {
                String reason = !safeFeedback.isEmpty()
                        ? safeFeedback
                        : "Submission does not meet curriculum or quality standards.";
                String clippedReason = reason.length() > 180 ? reason.substring(0, 177) + "..." : reason;
                String safeResTitle = resourceTitle != null && resourceTitle.length() > 60
                        ? resourceTitle.substring(0, 57) + "..." : (resourceTitle != null ? resourceTitle : "Material");
                notificationService.createNotification(
                        contributor,
                        "Submission Declined: " + safeResTitle,
                        "Your contribution for " + courseCode + " was declined. Reason: " + clippedReason,
                        "CONTRIBUTION_REJECTED",
                        "/contribute"
                );
            }
        } catch (Exception e) {
            log.warn("Failed to dispatch contribution rejection notification: {}", e.getMessage());
        }

        ContributionRequest saved = contributionRequestRepository.save(cr);
        resourceDuplicateService.evictCourse(courseCode);
        liveSyncService.broadcast("contribution", "rejected", saved.getId());
        if (res != null) {
            liveSyncService.broadcast("resource", "deleted", res.getId());
        }
        return saved;
    }

    private void deletePhysicalFile(String fileUrl) {
        if (fileUrl == null || fileUrl.trim().isEmpty()) return;
        try {
            String cleanUrl = fileUrl.trim();
            if (r2Service != null && r2Service.isConfigured() && (cleanUrl.contains(".r2.") || cleanUrl.contains("r2.dev") || cleanUrl.contains("r2_"))) {
                r2Service.deleteFileByKeyOrUrl(cleanUrl);
                log.info("Deleted rejected contribution file from Cloudflare R2: {}", cleanUrl);
            } else if (cloudinaryService != null && cleanUrl.contains("cloudinary.com")) {
                cloudinaryService.deleteFileByUrl(cleanUrl);
                log.info("Deleted rejected contribution file from Cloudinary: {}", cleanUrl);
            } else if (cleanUrl.startsWith("/uploads/") || cleanUrl.contains("/uploads/materials/")) {
                String localFilename = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);
                Path localPath = Paths.get("uploads", "materials", localFilename).toAbsolutePath().normalize();
                Files.deleteIfExists(localPath);
                log.info("Deleted rejected contribution file from local disk: {}", localPath);
            }
        } catch (Exception ex) {
            log.warn("Failed to delete physical file from storage: {}", ex.getMessage());
        }
    }

    @Transactional
    public void deleteContribution(Long contributionId) {
        deleteContributionWithDetails(contributionId);
    }

    @Transactional
    public Map<String, Object> deleteContributionWithDetails(Long contributionId) {
        ContributionRequest cr = contributionRequestRepository.findById(contributionId)
                .orElseThrow(() -> new ResourceNotFoundException("Contribution request not found: " + contributionId));
        Resource res = cr.getUploadedResource();
        String studentName = cr.getUser() != null ? cr.getUser().getName() : "Unknown Student";
        String studentEmail = cr.getUser() != null ? cr.getUser().getEmail() : "";
        String title = res != null ? res.getTitle() : "Material";
        String courseCode = (res != null && res.getCourse() != null) ? res.getCourse().getCode() : "N/A";

        if (res != null && res.getFileUrl() != null && !res.getFileUrl().trim().isEmpty()) {
            String urlToDelete = res.getFileUrl();
            CompletableFuture.runAsync(() -> deletePhysicalFile(urlToDelete));
        }

        contributionRequestRepository.delete(cr);
        if (res != null && res.getStatus() != ResourceStatus.APPROVED) {
            resourceRepository.delete(res);
        }
        resourceDuplicateService.evictCourse(courseCode);
        liveSyncService.broadcast("contribution", "deleted", contributionId);
        if (res != null) {
            liveSyncService.broadcast("resource", "deleted", res.getId());
        }
        return Map.of(
                "id", contributionId,
                "studentName", studentName,
                "studentEmail", studentEmail,
                "title", title,
                "courseCode", courseCode
        );
    }

    public LinkVerificationResponse verifyPublicLink(String rawUrl) {
        if (rawUrl == null || rawUrl.trim().isEmpty()) {
            return LinkVerificationResponse.invalidUrl("URL cannot be empty");
        }
        URI validatedUri = UrlSecurityValidator.validatePublicHttpUrl(rawUrl);
        String url = validatedUri.toString();

        try {
            String host = validatedUri.getHost() != null ? validatedUri.getHost().toLowerCase() : "";

            boolean isGdrive = host.contains("drive.google.com") || host.contains("docs.google.com");
            String fileId = null;

            if (isGdrive) {
                // Extract file ID if available
                Pattern p1 = Pattern.compile("/d/([a-zA-Z0-9_-]+)");
                Matcher m1 = p1.matcher(url);
                if (m1.find()) {
                    fileId = m1.group(1);
                } else {
                    Pattern p2 = Pattern.compile("[?&]id=([a-zA-Z0-9_-]+)");
                    Matcher m2 = p2.matcher(url);
                    if (m2.find()) {
                        fileId = m2.group(1);
                    }
                }

                // Probe Google Drive
                String checkTarget = fileId != null
                        ? "https://drive.google.com/file/d/" + fileId + "/view"
                        : url;
                URI targetUri = UrlSecurityValidator.validatePublicHttpUrl(checkTarget);

                HttpRequest req = HttpRequest.newBuilder()
                        .uri(targetUri)
                        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                        .timeout(Duration.ofSeconds(5))
                        .GET()
                        .build();

                HttpResponse<InputStream> resp = UrlSecurityValidator.getSharedHttpClient()
                        .send(req, HttpResponse.BodyHandlers.ofInputStream());
                try (InputStream bodyStream = resp.body()) {
                    int status = resp.statusCode();
                    Optional<String> location = resp.headers().firstValue("Location");

                    // Check redirection to Google Signin / Accounts
                    if (location.isPresent()) {
                        String loc = location.get();
                        if (loc.contains("accounts.google.com") || loc.contains("ServiceLogin") || loc.contains("signin")) {
                            return LinkVerificationResponse.restrictedGoogleDrive(fileId, "Google Drive link is restricted (Private). Please set General Access to 'Anyone with the link' (Viewer).");
                        }
                    }

                    if (status == 401 || status == 403) {
                        return LinkVerificationResponse.restrictedGoogleDrive(fileId, "Access denied (401/403). Google Drive file is private or restricted.");
                    }

                    if (status == 200) {
                        byte[] bodyBytes = UrlSecurityValidator.readBoundedBytes(bodyStream, 256 * 1024);
                        String body = new String(bodyBytes, StandardCharsets.UTF_8);
                        if (body.contains("You need access") || body.contains("Request access") || body.contains("You need permission")) {
                            return LinkVerificationResponse.restrictedGoogleDrive(fileId, "Sign-in required to view this file. Please change General Access to 'Anyone with the link'.");
                        }
                        String previewUrl = fileId != null ? "https://drive.google.com/file/d/" + fileId + "/preview" : url;
                        return LinkVerificationResponse.publicLink(true, fileId, "Google Drive link is public and accessible! ✓", previewUrl);
                    }

                    if (status >= 300 && status < 400 && location.isPresent()) {
                        String previewUrl = fileId != null ? "https://drive.google.com/file/d/" + fileId + "/preview" : url;
                        return LinkVerificationResponse.publicLink(true, fileId, "Google Drive link is accessible! ✓", previewUrl);
                    }

                    return LinkVerificationResponse.restrictedGoogleDrive(fileId, "Could not verify public access (Status " + status + "). Please verify link permissions.");
                }
            } else {
                // Non-Google link: SSRF-safe bounded HEAD/GET reachability check
                int statusCode = UrlSecurityValidator.checkPublicUrlReachability(url, "Mozilla/5.0", Duration.ofSeconds(5));
                if (statusCode < 400) {
                    return LinkVerificationResponse.publicLink(false, null, "File link is reachable and public! ✓", url);
                }
                return LinkVerificationResponse.publicLink(false, null, "Link registered.", url);
            }
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception e) {
            return LinkVerificationResponse.unreachable("Could not verify link: " + e.getMessage());
        }
    }

    public List<ContributorLeaderboardItem> getLeaderboard() {
        List<ContributionRequest> approvedRequests = contributionRequestRepository.findByStatusOrderByCreatedAtDesc(ResourceStatus.APPROVED);
        if (approvedRequests == null || approvedRequests.isEmpty()) {
            return java.util.Collections.emptyList();
        }

        java.util.Map<User, Long> userCounts = approvedRequests.stream()
                .filter(cr -> cr.getUser() != null)
                .collect(java.util.stream.Collectors.groupingBy(ContributionRequest::getUser, java.util.stream.Collectors.counting()));

        List<ContributorLeaderboardItem> list = new java.util.ArrayList<>();

        for (java.util.Map.Entry<User, Long> entry : userCounts.entrySet()) {
            User u = entry.getKey();
            int count = entry.getValue().intValue();
            String userDept = approvedRequests.stream()
                    .filter(cr -> cr.getUser() != null && cr.getUser().getId().equals(u.getId()) && cr.getUploadedResource() != null && cr.getUploadedResource().getCourse() != null)
                    .map(cr -> cr.getUploadedResource().getCourse().getDepartment())
                    .filter(java.util.Objects::nonNull)
                    .findFirst()
                    .orElse("CSE");

            list.add(new ContributorLeaderboardItem(
                    0,
                    u.getId(),
                    u.getName(),
                    u.getStudentId() != null ? u.getStudentId() : "",
                    userDept,
                    count,
                    "",
                    "",
                    u.getAvatarUrl()
            ));
        }

        list.sort((a, b) -> Integer.compare(b.getApprovedContributions(), a.getApprovedContributions()));

        List<ContributorLeaderboardItem> result = new java.util.ArrayList<>();
        int rank = 1;
        for (ContributorLeaderboardItem item : list) {
            if (rank > 50) break;
            item.setRank(rank);

            if (rank == 1) {
                item.setBadge("Rank #1");
                item.setTitle("Lead Academic Contributor");
            } else if (rank == 2) {
                item.setBadge("Rank #2");
                item.setTitle("Senior Contributor");
            } else if (rank == 3) {
                item.setBadge("Rank #3");
                item.setTitle("Distinguished Contributor");
            } else if (rank <= 10) {
                item.setBadge("Rank #" + rank);
                item.setTitle("Elite Contributor");
            } else {
                item.setBadge("Rank #" + rank);
                item.setTitle("Academic Contributor");
            }

            result.add(item);
            rank++;
        }

        return result;
    }
}