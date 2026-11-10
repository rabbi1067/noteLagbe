package com.notelagbe.service;

import com.notelagbe.dto.ContributionSubmitRequest;
import com.notelagbe.dto.ContributorLeaderboardItem;
import com.notelagbe.dto.LinkVerificationResponse;
import com.notelagbe.entity.*;
import com.notelagbe.exception.ApiException;
import com.notelagbe.exception.ResourceNotFoundException;
import com.notelagbe.repository.*;
import org.springframework.cache.annotation.CacheEvict;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
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

    public ContributionService(ContributionRequestRepository contributionRequestRepository,
                               ResourceRepository resourceRepository,
                               CourseRepository courseRepository,
                               TeacherRepository teacherRepository,
                               TeacherCourseRepository teacherCourseRepository,
                               UnlockedCourseRepository unlockedCourseRepository,
                               LiveSyncService liveSyncService,
                               InputSanitizationService inputSanitizationService,
                               NotificationService notificationService) {
        this.contributionRequestRepository = contributionRequestRepository;
        this.resourceRepository = resourceRepository;
        this.courseRepository = courseRepository;
        this.teacherRepository = teacherRepository;
        this.teacherCourseRepository = teacherCourseRepository;
        this.unlockedCourseRepository = unlockedCourseRepository;
        this.liveSyncService = liveSyncService;
        this.inputSanitizationService = inputSanitizationService;
        this.notificationService = notificationService;
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
        String targetDept = (request.getDepartment() != null && !request.getDepartment().trim().isEmpty())
                ? request.getDepartment().trim().toUpperCase()
                : "CSE";

        Course uploadCourse = courseRepository.findByCodeIgnoreCase(uploadCode)
                .orElseGet(() -> {
                    Course c = new Course();
                    c.setCode(uploadCode.toUpperCase());
                    c.setTitle(uploadCode.toUpperCase() + " (" + targetDept + " Contributed Course)");
                    c.setCredits(3.0);
                    c.setSemester(1);
                    c.setDepartment(targetDept);
                    return courseRepository.save(c);
                });

        Course rewardCourse1 = courseRepository.findByCodeIgnoreCase(request.getRequestedCourseCode1().trim())
                .orElseGet(() -> {
                    Course c = new Course();
                    String rCode = request.getRequestedCourseCode1().trim().toUpperCase();
                    c.setCode(rCode);
                    c.setTitle(rCode + " (Reward Course)");
                    c.setCredits(3.0);
                    c.setSemester(1);
                    c.setDepartment("CSE");
                    return courseRepository.save(c);
                });

        Course rewardCourse2 = courseRepository.findByCodeIgnoreCase(request.getRequestedCourseCode2().trim())
                .orElseGet(() -> {
                    Course c = new Course();
                    String rCode = request.getRequestedCourseCode2().trim().toUpperCase();
                    c.setCode(rCode);
                    c.setTitle(rCode + " (Reward Course)");
                    c.setCredits(3.0);
                    c.setSemester(1);
                    c.setDepartment("CSE");
                    return courseRepository.save(c);
                });

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
        resource.setAcademicYear(request.getYear());
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
        liveSyncService.broadcast("contribution", "created", saved.getId());
        return saved;
    }

    public List<ContributionRequest> getContributions(ResourceStatus status) {
        if (status != null) {
            return contributionRequestRepository.findByStatusOrderByCreatedAtDesc(status);
        }
        return contributionRequestRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<ContributionRequest> getUserContributions(Long userId) {
        return contributionRequestRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @CacheEvict(value = {"courses", "course_details", "teachers", "teacher_details", "teacher_courses"}, allEntries = true)
    @Transactional
    public ContributionRequest approveContribution(Long contributionId, String feedback) {
        return approveContribution(contributionId, feedback, null, null, null, null, null, null);
    }

    @CacheEvict(value = {"courses", "course_details", "teachers", "teacher_details", "teacher_courses"}, allEntries = true)
    @Transactional
    public ContributionRequest approveContribution(Long contributionId, String feedback, String editedTitle, Long teacherId, String resourceType, String semesterName, String courseCode) {
        return approveContribution(contributionId, feedback, editedTitle, teacherId, resourceType, semesterName, courseCode, null);
    }

    @CacheEvict(value = {"courses", "course_details", "teachers", "teacher_details", "teacher_courses"}, allEntries = true)
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
            res.setSemesterName(semesterName.trim());
        }
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
            Optional<UnlockedCourse> existing1 = unlockedCourseRepository.findByUserIdAndCourseId(contributor.getId(), cr.getRequestedCourse1().getId());
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
            Optional<UnlockedCourse> existing2 = unlockedCourseRepository.findByUserIdAndCourseId(contributor.getId(), cr.getRequestedCourse2().getId());
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

    @CacheEvict(value = {"courses", "course_details", "teachers", "teacher_details", "teacher_courses"}, allEntries = true)
    @Transactional
    public ContributionRequest rejectContribution(Long contributionId, String feedback) {
        ContributionRequest cr = contributionRequestRepository.findById(contributionId)
                .orElseThrow(() -> new ResourceNotFoundException("Contribution request not found: " + contributionId));

        Resource res = cr.getUploadedResource();
        res.setStatus(ResourceStatus.REJECTED);
        resourceRepository.save(res);

        cr.setStatus(ResourceStatus.REJECTED);
        cr.setAdminFeedback(feedback);
        cr.setReviewedAt(LocalDateTime.now());

        ContributionRequest saved = contributionRequestRepository.save(cr);
        liveSyncService.broadcast("contribution", "rejected", saved.getId());
        liveSyncService.broadcast("resource", "rejected", res.getId());
        return saved;
    }

    @Transactional
    public void deleteContribution(Long contributionId) {
        ContributionRequest cr = contributionRequestRepository.findById(contributionId)
                .orElseThrow(() -> new ResourceNotFoundException("Contribution request not found: " + contributionId));
        Resource res = cr.getUploadedResource();
        contributionRequestRepository.delete(cr);
        if (res != null && res.getStatus() != ResourceStatus.APPROVED) {
            resourceRepository.delete(res);
        }
        liveSyncService.broadcast("contribution", "deleted", contributionId);
    }

    public LinkVerificationResponse verifyPublicLink(String rawUrl) {
        if (rawUrl == null || rawUrl.trim().isEmpty()) {
            return LinkVerificationResponse.invalidUrl("URL cannot be empty");
        }
        String url = rawUrl.trim();
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            return LinkVerificationResponse.invalidUrl("URL must start with http:// or https://");
        }

        try {
            URI uri = URI.create(url);
            String host = uri.getHost() != null ? uri.getHost().toLowerCase() : "";

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

                HttpClient client = HttpClient.newBuilder()
                        .followRedirects(HttpClient.Redirect.NEVER)
                        .connectTimeout(Duration.ofSeconds(4))
                        .build();

                HttpRequest req = HttpRequest.newBuilder()
                        .uri(URI.create(checkTarget))
                        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                        .timeout(Duration.ofSeconds(5))
                        .GET()
                        .build();

                HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());
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
                    String body = resp.body();
                    if (body != null && (body.contains("You need access") || body.contains("Request access") || body.contains("You need permission"))) {
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
            } else {
                // Non-Google link: quick head/get check
                HttpClient client = HttpClient.newBuilder()
                        .followRedirects(HttpClient.Redirect.NORMAL)
                        .connectTimeout(Duration.ofSeconds(4))
                        .build();

                HttpRequest req = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header("User-Agent", "Mozilla/5.0")
                        .timeout(Duration.ofSeconds(5))
                        .method("HEAD", HttpRequest.BodyPublishers.noBody())
                        .build();

                try {
                    HttpResponse<Void> resp = client.send(req, HttpResponse.BodyHandlers.discarding());
                    if (resp.statusCode() < 400) {
                        return LinkVerificationResponse.publicLink(false, null, "File link is reachable and public! ✓", url);
                    }
                } catch (Exception ignored) {
                    HttpRequest getReq = HttpRequest.newBuilder()
                            .uri(URI.create(url))
                            .header("User-Agent", "Mozilla/5.0")
                            .timeout(Duration.ofSeconds(5))
                            .GET()
                            .build();
                    HttpResponse<Void> getResp = client.send(getReq, HttpResponse.BodyHandlers.discarding());
                    if (getResp.statusCode() < 400) {
                        return LinkVerificationResponse.publicLink(false, null, "File link is reachable and public! ✓", url);
                    }
                }
                return LinkVerificationResponse.publicLink(false, null, "Link registered.", url);
            }
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