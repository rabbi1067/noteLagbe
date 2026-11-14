package com.notelagbe.service;

import com.notelagbe.dto.ResourceCreateRequest;
import com.notelagbe.entity.*;
import com.notelagbe.exception.ResourceNotFoundException;
import com.notelagbe.repository.*;
import com.notelagbe.security.FileUploadSecurityValidator;
import com.notelagbe.security.UrlSecurityValidator;
import org.springframework.web.multipart.MultipartFile;
import com.notelagbe.exception.ApiException;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.ContentDisposition;
import org.springframework.http.CacheControl;
import org.springframework.core.io.InputStreamResource;
import java.nio.charset.StandardCharsets;
import jakarta.annotation.PostConstruct;
import java.io.FileNotFoundException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class ResourceService {

    private static final Logger log = LoggerFactory.getLogger(ResourceService.class);

    private final ResourceRepository resourceRepository;
    private final CourseRepository courseRepository;
    private final TeacherRepository teacherRepository;
    private final UnlockedCourseRepository unlockedCourseRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final SubscriptionService subscriptionService;
    private final LiveSyncService liveSyncService;
    private final ContributionRequestRepository contributionRequestRepository;
    private final CloudinaryService cloudinaryService;
    private final CloudflareR2Service r2Service;
    private final TeacherCourseRepository teacherCourseRepository;
    private final CacheManager cacheManager;
    private final ResourceDuplicateService resourceDuplicateService;

    @Autowired(required = false)
    private FileOptimizationService fileOptimizationService;

    public void setFileOptimizationService(FileOptimizationService fileOptimizationService) {
        this.fileOptimizationService = fileOptimizationService;
    }

    public ResourceService(ResourceRepository resourceRepository,
                           CourseRepository courseRepository,
                           TeacherRepository teacherRepository,
                           UnlockedCourseRepository unlockedCourseRepository,
                           SubscriptionRepository subscriptionRepository,
                           SubscriptionService subscriptionService,
                           LiveSyncService liveSyncService,
                           ContributionRequestRepository contributionRequestRepository,
                           CloudinaryService cloudinaryService,
                           TeacherCourseRepository teacherCourseRepository,
                           CacheManager cacheManager) {
        this(resourceRepository, courseRepository, teacherRepository, unlockedCourseRepository,
                subscriptionRepository, subscriptionService, liveSyncService, contributionRequestRepository,
                cloudinaryService, teacherCourseRepository, cacheManager,
                new ResourceDuplicateService(resourceRepository, courseRepository));
    }

    public ResourceService(ResourceRepository resourceRepository,
                           CourseRepository courseRepository,
                           TeacherRepository teacherRepository,
                           UnlockedCourseRepository unlockedCourseRepository,
                           SubscriptionRepository subscriptionRepository,
                           SubscriptionService subscriptionService,
                           LiveSyncService liveSyncService,
                           ContributionRequestRepository contributionRequestRepository,
                           CloudinaryService cloudinaryService,
                           TeacherCourseRepository teacherCourseRepository,
                           CacheManager cacheManager,
                           ResourceDuplicateService resourceDuplicateService) {
        this(resourceRepository, courseRepository, teacherRepository, unlockedCourseRepository,
                subscriptionRepository, subscriptionService, liveSyncService, contributionRequestRepository,
                cloudinaryService, new CloudflareR2Service(), teacherCourseRepository, cacheManager,
                resourceDuplicateService);
    }

    @Autowired
    public ResourceService(ResourceRepository resourceRepository,
                           CourseRepository courseRepository,
                           TeacherRepository teacherRepository,
                           UnlockedCourseRepository unlockedCourseRepository,
                           SubscriptionRepository subscriptionRepository,
                           SubscriptionService subscriptionService,
                           LiveSyncService liveSyncService,
                           ContributionRequestRepository contributionRequestRepository,
                           CloudinaryService cloudinaryService,
                           CloudflareR2Service r2Service,
                           TeacherCourseRepository teacherCourseRepository,
                           CacheManager cacheManager,
                           ResourceDuplicateService resourceDuplicateService) {
        this.resourceRepository = resourceRepository;
        this.courseRepository = courseRepository;
        this.teacherRepository = teacherRepository;
        this.unlockedCourseRepository = unlockedCourseRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.subscriptionService = subscriptionService;
        this.liveSyncService = liveSyncService;
        this.contributionRequestRepository = contributionRequestRepository;
        this.cloudinaryService = cloudinaryService;
        this.r2Service = r2Service != null ? r2Service : new CloudflareR2Service();
        this.teacherCourseRepository = teacherCourseRepository;
        this.cacheManager = cacheManager;
        this.resourceDuplicateService = resourceDuplicateService;
    }

    public Map<String, Object> getDuplicateSlots(String courseCode) {
        return resourceDuplicateService.getDuplicateSlotsResponse(courseCode);
    }

    public Map<String, Object> checkDuplicate(
            String courseCode,
            Long teacherId,
            String rawType,
            String semesterName,
            String title,
            Long excludeId
    ) {
        ResourceType parsedType = null;
        if (rawType != null && !rawType.trim().isEmpty()) {
            try {
                parsedType = ResourceType.valueOf(rawType.trim().toUpperCase(java.util.Locale.ROOT));
            } catch (IllegalArgumentException ignored) {
                parsedType = null;
            }
        }
        return resourceDuplicateService.checkDuplicate(courseCode, teacherId, parsedType, semesterName, title, excludeId);
    }

    private void evictCaches() {
        if (cacheManager != null) {
            for (String cacheName : List.of("courses", "course_details", "teachers", "teacher_details", "teacher_courses", "course_resources", "teacher_resources", "duplicate_slots")) {
                var c = cacheManager.getCache(cacheName);
                if (c != null) c.clear();
            }
        }
    }

    @Cacheable(value = "course_resources", key = "(#user != null ? #user.id : 0) + '_' + #courseCode.toLowerCase()", unless = "#result == null")
    public List<Resource> getResourcesForCourse(String courseCode, User user) {
        Course course = courseRepository.findByCodeIgnoreCase(courseCode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + courseCode));

        List<Resource> resources = resourceRepository.findByCourseIdAndStatus(course.getId(), ResourceStatus.APPROVED);

        boolean fullCourseUnlocked = checkCourseUnlocked(user, course);
        java.util.Set<Long> unlockedTeacherIds = fullCourseUnlocked
                ? java.util.Collections.emptySet()
                : subscriptionService.getUnlockedTeacherIds(user, course);

        // Mask the direct file URLs for resources the student has not unlocked (full course or gifted faculty)
        return resources.stream().map(r -> {
            boolean resourceUnlocked = fullCourseUnlocked
                    || (r.getTeacher() != null && unlockedTeacherIds.contains(r.getTeacher().getId()));
            if (!resourceUnlocked) {
                return maskLockedResource(r);
            }
            if (r.getFileUrl() != null && r2Service.isConfigured() && (r.getFileUrl().contains(".r2.") || r.getFileUrl().contains("r2_"))) {
            r.setFileUrl(r2Service.getPresignedDownloadUrl(r.getFileUrl(), 24));
        }
        return r;
        }).toList();
    }

    private Resource maskLockedResource(Resource r) {
        Resource masked = new Resource();
        masked.setId(r.getId());
        masked.setTitle(r.getTitle());
        masked.setType(r.getType());
        masked.setFileUrl(null); // Locked!
        boolean previewIsSameAsFile = r.getPreviewUrl() != null && r.getFileUrl() != null
                && r.getPreviewUrl().trim().equals(r.getFileUrl().trim());
        masked.setPreviewUrl(previewIsSameAsFile ? null : r.getPreviewUrl());
        masked.setSemesterName(r.getSemesterName());
        masked.setAcademicYear(r.getAcademicYear());
        masked.setCourse(r.getCourse());
        masked.setTeacher(r.getTeacher());
        masked.setUploader(r.getUploader());
        masked.setStatus(r.getStatus());
        masked.setDownloadsCount(r.getDownloadsCount());
        masked.setCreatedAt(r.getCreatedAt());
        return masked;
    }

    @Cacheable(value = "teacher_resources", key = "(#user != null ? #user.id : 0) + '_' + #teacherId", unless = "#result == null")
    public List<Resource> getResourcesForTeacher(Long teacherId, User user) {
        List<Resource> resources = resourceRepository.findByTeacherIdAndStatusOrderByCreatedAtDesc(teacherId, ResourceStatus.APPROVED);
        return resources.stream()
                .sorted((a, b) -> {
                    if (a.getCreatedAt() != null && b.getCreatedAt() != null) {
                        int cmp = b.getCreatedAt().compareTo(a.getCreatedAt());
                        if (cmp != 0) return cmp;
                    }
                    return Long.compare(b.getId() != null ? b.getId() : 0, a.getId() != null ? a.getId() : 0);
                })
                .map(r -> {
                    boolean isUnlocked = subscriptionService.isResourceUnlocked(user, r);
                    if (!isUnlocked) {
                        return maskLockedResource(r);
                    }
                    if (r.getFileUrl() != null && r2Service.isConfigured() && (r.getFileUrl().contains(".r2.") || r.getFileUrl().contains("r2_"))) {
                        r.setFileUrl(r2Service.getPresignedDownloadUrl(r.getFileUrl(), 24));
                    }
                    return r;
                }).toList();
    }

    public Map<String, Object> checkAvailability(String courseCode, Long teacherId) {
        Optional<Course> cOpt = courseRepository.findByCodeIgnoreCase(courseCode.trim());
        Map<String, Object> resp = new HashMap<>();

        if (cOpt.isEmpty()) {
            resp.put("available", false);
            resp.put("message", "Course not found: " + courseCode);
            resp.put("notesCount", 0);
            resp.put("questionsCount", 0);
            return resp;
        }

        Course course = cOpt.get();
        List<Resource> resources;
        String teacherName = "All Faculty";

        if (teacherId != null && teacherId > 0) {
            resources = resourceRepository.findByCourseIdAndTeacherIdAndStatus(course.getId(), teacherId, ResourceStatus.APPROVED);
            Optional<Teacher> tOpt = teacherRepository.findById(teacherId);
            if (tOpt.isPresent()) {
                teacherName = tOpt.get().getName();
            }
        } else {
            resources = resourceRepository.findByCourseIdAndStatus(course.getId(), ResourceStatus.APPROVED);
        }

        long notesCount = resources.stream()
                .filter(r -> r.getType() == ResourceType.NOTE || r.getType() == ResourceType.LAB_HAND_NOTE || r.getType() == ResourceType.LAB_REPORT || r.getType() == ResourceType.DOC_NOTE || r.getType() == ResourceType.PROJECT_LINK || r.getType() == ResourceType.OTHERS || r.getType() == ResourceType.SYLLABUS)
                .count();
        long questionsCount = resources.stream().filter(r ->
                r.getType() == ResourceType.QUESTION_COURSE_IN ||
                r.getType() == ResourceType.MID_QUESTION ||
                r.getType() == ResourceType.FINAL_QUESTION ||
                r.getType() == ResourceType.QUIZ_CT ||
                r.getType() == ResourceType.LAB_QUIZ ||
                r.getType() == ResourceType.LAB_FINAL ||
                r.getType() == ResourceType.LAB_MANUAL).count();

        boolean available = !resources.isEmpty();

        resp.put("available", available);
        resp.put("courseId", course.getId());
        resp.put("courseCode", course.getCode());
        resp.put("courseTitle", course.getTitle());
        resp.put("teacherId", teacherId);
        resp.put("teacherName", teacherName);
        resp.put("notesCount", notesCount);
        resp.put("questionsCount", questionsCount);
        resp.put("totalCount", resources.size());
        resp.put("message", available
                ? "Resources found: " + notesCount + " notes, " + questionsCount + " questions."
                : "No notes or questions are currently uploaded for this course/teacher.");

        return resp;
    }

    public List<Resource> getAllResourcesForAdmin() {
        List<Resource> list = resourceRepository.findByStatusOrderByCreatedAtDesc(ResourceStatus.APPROVED);
        if (r2Service.isConfigured()) {
            for (Resource r : list) {
                if (r.getFileUrl() != null && (r.getFileUrl().contains(".r2.") || r.getFileUrl().contains("r2_"))) {
                    r.setFileUrl(r2Service.getPresignedDownloadUrl(r.getFileUrl(), 24));
                }
            }
        }
        return list;
    }

    @PostConstruct
    public void cleanupLegacyRejectedResourceFiles() {
        try {
            List<Resource> rejected = resourceRepository.findByStatusOrderByCreatedAtDesc(ResourceStatus.REJECTED);
            if (rejected == null || rejected.isEmpty()) return;
            for (Resource r : rejected) {
                if (r.getFileUrl() != null && !r.getFileUrl().isBlank()) {
                    String fileUrl = r.getFileUrl().trim();
                    if (r2Service != null && r2Service.isConfigured() && (fileUrl.contains(".r2.") || fileUrl.contains("r2.dev") || fileUrl.contains("r2_"))) {
                        r2Service.deleteFileByKeyOrUrl(fileUrl);
                        log.info("Cleaned up orphaned storage file on Cloudflare R2 for rejected resource ID {}: {}", r.getId(), fileUrl);
                    } else if (cloudinaryService != null && fileUrl.contains("cloudinary.com")) {
                        cloudinaryService.deleteFileByUrl(fileUrl);
                        log.info("Cleaned up orphaned storage file on Cloudinary for rejected resource ID {}: {}", r.getId(), fileUrl);
                    }
                    r.setFileUrl(null);
                    r.setPreviewUrl(null);
                    resourceRepository.save(r);
                }
            }
        } catch (Exception e) {
            log.warn("Legacy rejected resource file cleanup skipped: {}", e.getMessage());
        }
    }

    @Transactional
    public Resource createResource(ResourceCreateRequest req, User uploader) {
        Course course = courseRepository.findByCodeIgnoreCase(req.getCourseCode().trim())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + req.getCourseCode()));

        Teacher teacher = null;
        if (req.getTeacherId() != null && req.getTeacherId() > 0) {
            teacher = teacherRepository.findById(req.getTeacherId()).orElse(null);
        }

        ResourceType type = req.getType() != null ? req.getType() : ResourceType.NOTE;
        String canonicalSemester = resourceDuplicateService.normalizeSemesterName(req.getSemesterName());
        if (canonicalSemester.isEmpty()) {
            canonicalSemester = "Fall 2026";
        }
        String cleanTitle = req.getTitle().trim();

        resourceDuplicateService.assertNoDuplicate(
                course.getCode(),
                teacher != null ? teacher.getId() : null,
                type,
                canonicalSemester,
                cleanTitle,
                null
        );

        Resource r = new Resource();
        r.setTitle(cleanTitle);
        r.setType(type);
        r.setFileUrl(req.getFileUrl().trim());
        r.setPreviewUrl(req.getPreviewUrl());
        r.setSemesterName(canonicalSemester);
        r.setAcademicYear(resourceDuplicateService.resolveAcademicYear(canonicalSemester, req.getAcademicYear()));
        r.setCourse(course);
        r.setTeacher(teacher);
        r.setUploader(uploader);
        r.setStatus(ResourceStatus.APPROVED);

        Resource saved = resourceRepository.save(r);

        // Auto-link teacher to course when academic material is added
        if (teacher != null && course != null) {
            if (!teacherCourseRepository.existsByCourseIdAndTeacherId(course.getId(), teacher.getId())) {
                TeacherCourse tc = new TeacherCourse(teacher, course, "General", "ADMIN_ASSIGNED");
                teacherCourseRepository.save(tc);
            }
        }

        evictCaches();
        liveSyncService.broadcast("resource", "created", saved.getId());
        liveSyncService.broadcast("teacher_course", "updated", teacher != null ? teacher.getId() : 0);
        return saved;
    }

    @Transactional
    public Resource updateResource(Long id, ResourceCreateRequest req) {
        Resource r = resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with ID: " + id));

        if (req.getTitle() != null && !req.getTitle().trim().isEmpty()) {
            r.setTitle(req.getTitle().trim());
        }
        if (req.getType() != null) {
            r.setType(req.getType());
        }
        if (req.getFileUrl() != null && !req.getFileUrl().trim().isEmpty()) {
            r.setFileUrl(req.getFileUrl().trim());
        }
        if (req.getPreviewUrl() != null) {
            r.setPreviewUrl(req.getPreviewUrl().trim());
        }
        if (req.getSemesterName() != null && !req.getSemesterName().trim().isEmpty()) {
            String canonicalSemester = resourceDuplicateService.normalizeSemesterName(req.getSemesterName());
            r.setSemesterName(canonicalSemester);
            r.setAcademicYear(resourceDuplicateService.resolveAcademicYear(canonicalSemester, req.getAcademicYear() > 0 ? req.getAcademicYear() : r.getAcademicYear()));
        } else if (req.getAcademicYear() > 0) {
            r.setAcademicYear(req.getAcademicYear());
        }

        if (req.getCourseCode() != null && !req.getCourseCode().trim().isEmpty()) {
            courseRepository.findByCodeIgnoreCase(req.getCourseCode().trim()).ifPresent(r::setCourse);
        }

        if (req.getTeacherId() != null) {
            if (req.getTeacherId() > 0) {
                teacherRepository.findById(req.getTeacherId()).ifPresent(r::setTeacher);
            } else {
                r.setTeacher(null);
            }
        }

        String normalizedExistingSem = resourceDuplicateService.normalizeSemesterName(r.getSemesterName());
        if (!normalizedExistingSem.isEmpty()) {
            r.setSemesterName(normalizedExistingSem);
        }

        resourceDuplicateService.assertNoDuplicate(
                r.getCourse() != null ? r.getCourse().getCode() : null,
                r.getTeacher() != null ? r.getTeacher().getId() : null,
                r.getType(),
                r.getSemesterName(),
                r.getTitle(),
                id
        );

        Resource updated = resourceRepository.save(r);

        if (updated.getTeacher() != null && updated.getCourse() != null) {
            if (!teacherCourseRepository.existsByCourseIdAndTeacherId(updated.getCourse().getId(), updated.getTeacher().getId())) {
                TeacherCourse tc = new TeacherCourse(updated.getTeacher(), updated.getCourse(), "General", "ADMIN_ASSIGNED");
                teacherCourseRepository.save(tc);
            }
        }

        evictCaches();
        liveSyncService.broadcast("resource", "updated", id);
        liveSyncService.broadcast("teacher_course", "updated", updated.getTeacher() != null ? updated.getTeacher().getId() : 0);
        return updated;
    }

    @Transactional
    public Resource updateResourceFile(Long id, String fileUrl) {
        if (fileUrl == null || fileUrl.trim().isEmpty()) {
            throw new ApiException("A valid fileUrl is required.");
        }
        String trimmed = fileUrl.trim();
        if (trimmed.length() > 500) {
            throw new ApiException("File URL cannot exceed 500 characters.");
        }
        Resource r = resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with ID: " + id));
        r.setFileUrl(trimmed);
        Resource updated = resourceRepository.save(r);
        evictCaches();
        liveSyncService.broadcast("resource", "updated", id);
        liveSyncService.broadcast("contribution", "updated", id);
        return updated;
    }

    @Transactional
    public void deleteResource(Long id) {
        Resource r = resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found: " + id));
        Course course = r.getCourse();
        Teacher teacher = r.getTeacher();

        // Handle any contribution request that references this uploaded resource
        List<ContributionRequest> crs = contributionRequestRepository.findByUploadedResourceId(id);
        contributionRequestRepository.deleteAll(crs);

        resourceRepository.delete(r);

        // Delete remote file from R2 or Cloudinary if applicable
        if (r.getFileUrl() != null) {
            String fileUrl = r.getFileUrl().trim();
            if (r2Service.isConfigured() && (fileUrl.contains("r2_") || fileUrl.contains(".r2."))) {
                r2Service.deleteFileByKeyOrUrl(fileUrl);
            } else if (fileUrl.contains("cloudinary.com")) {
                cloudinaryService.deleteFileByUrl(fileUrl);
            }
        }

        // If no more approved resources exist for this teacher and course, clean up TeacherCourse mapping
        if (course != null && teacher != null) {
            boolean hasRemaining = resourceRepository.existsByCourseCodeIgnoreCaseAndTeacherIdAndStatus(
                    course.getCode(), teacher.getId(), ResourceStatus.APPROVED);
            if (!hasRemaining) {
                teacherCourseRepository.deleteByCourseIdAndTeacherId(course.getId(), teacher.getId());
            }
        }

        evictCaches();
        liveSyncService.broadcast("resource", "deleted", id);
        liveSyncService.broadcast("teacher_course", "updated", teacher != null ? teacher.getId() : 0);
        liveSyncService.broadcast("contribution", "deleted", id);
    }

    public boolean isCourseUnlockedForUser(String courseCode, User user) {
        if (user == null) return false;
        Optional<Course> courseOpt = courseRepository.findByCodeIgnoreCase(courseCode.trim());
        return courseOpt.map(course -> checkCourseUnlocked(user, course)).orElse(false);
    }

    private boolean checkCourseUnlocked(User user, Course course) {
        return subscriptionService.isCourseUnlocked(user, course);
    }

    private boolean isStaff(User user) {
        if (user == null || user.getRole() == null) {
            return false;
        }
        return user.getRole() == Role.ROLE_ADMIN
                || user.getRole() == Role.ROLE_SUPER_ADMIN
                || user.getRole() == Role.ROLE_MANAGER;
    }

    private boolean isUploader(User user, Resource resource) {
        return user != null
                && user.getId() != null
                && resource != null
                && resource.getUploader() != null
                && user.getId().equals(resource.getUploader().getId());
    }

    public Resource getResourceById(Long id) {
        return resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with ID: " + id));
    }

    public Resource getResourceByIdForUser(Long id, User user) {
        Resource r = getResourceById(id);
        boolean staff = isStaff(user);
        boolean uploader = isUploader(user, r);

        if (r.getStatus() != ResourceStatus.APPROVED && !staff && !uploader) {
            throw new ApiException("This material is pending approval and cannot be accessed yet.", HttpStatus.FORBIDDEN);
        }
        if (!staff && !uploader && !subscriptionService.isResourceUnlocked(user, r)) {
            return maskLockedResource(r);
        }
        if (r.getFileUrl() != null && r2Service.isConfigured() && (r.getFileUrl().contains(".r2.") || r.getFileUrl().contains("r2_"))) {
            r.setFileUrl(r2Service.getPresignedDownloadUrl(r.getFileUrl(), 24));
        }
        return r;
    }

    public void incrementDownloadCount(Long resourceId) {
        resourceRepository.findById(resourceId).ifPresent(r -> {
            r.setDownloadsCount(r.getDownloadsCount() + 1);
            resourceRepository.save(r);
        });
    }

    public void incrementDownloadCount(Long resourceId, User user) {
        Resource r = getResourceById(resourceId);
        boolean staff = isStaff(user);
        boolean uploader = isUploader(user, r);
        if (r.getStatus() != ResourceStatus.APPROVED && !staff && !uploader) {
            throw new ApiException("This material is pending approval and cannot be accessed yet.", HttpStatus.FORBIDDEN);
        }
        if (!staff && !uploader && !subscriptionService.isResourceUnlocked(user, r)) {
            throw new ApiException(
                    "Course access is locked. Please subscribe or contribute a material to unlock downloads.",
                    user == null ? HttpStatus.UNAUTHORIZED : HttpStatus.FORBIDDEN
            );
        }
        r.setDownloadsCount(r.getDownloadsCount() + 1);
        resourceRepository.save(r);
    }

    public ResponseEntity<byte[]> streamResourceFile(Long id, boolean download, User user) {
        Resource r = getResourceById(id);
        boolean staff = isStaff(user);
        boolean uploader = isUploader(user, r);

        if (r.getStatus() != ResourceStatus.APPROVED && !staff && !uploader) {
            throw new ApiException("This material is pending approval and cannot be accessed yet.", HttpStatus.FORBIDDEN);
        }

        if (r.getStatus() == ResourceStatus.APPROVED && !staff && !uploader && !subscriptionService.isResourceUnlocked(user, r)) {
            throw new ApiException(
                    "Course access is locked. Please subscribe or contribute a material to view or download this resource.",
                    user == null ? HttpStatus.UNAUTHORIZED : HttpStatus.FORBIDDEN
            );
        }

        String targetUrl = r.getFileUrl() != null && !r.getFileUrl().isBlank()
                ? r.getFileUrl()
                : r.getPreviewUrl();

        if (targetUrl == null || targetUrl.isBlank()) {
            throw new ResourceNotFoundException("No downloadable file associated with this resource.");
        }

        if (download) {
            incrementDownloadCount(id);
        }

        // Direct Cloudflare R2 Streaming & CDN Delivery (Zero Render Memory Pressure, 100% S3 Authorized)
        if (r2Service.isConfigured() && (targetUrl.contains(".r2.") || targetUrl.contains("r2.dev") || targetUrl.contains("r2_"))) {
            String presignedUrl = r2Service.getPresignedDownloadUrl(targetUrl, 24);
            if (presignedUrl != null && !presignedUrl.isBlank() && !presignedUrl.equals(targetUrl)) {
                log.info("Redirecting client directly to presigned/CDN Cloudflare R2 URL for material ID {}: {}", id, presignedUrl);
                return ResponseEntity.status(HttpStatus.FOUND)
                        .location(URI.create(presignedUrl))
                        .build();
            }

            // Direct S3 Byte Streaming for Cloudflare R2 fallback (100% Authorized via AWS SDK, No InvalidArgumentAuthorization)
            try {
                byte[] fileBytes = r2Service.fetchBytes(targetUrl);
                long contentLength = fileBytes.length;
                String contentType = "application/pdf";
                if (fileBytes.length >= 4 && fileBytes[0] == '%' && fileBytes[1] == 'P' && fileBytes[2] == 'D' && fileBytes[3] == 'F') {
                    contentType = "application/pdf";
                } else if (fileBytes.length >= 3 && (fileBytes[0] & 0xFF) == 0xFF && (fileBytes[1] & 0xFF) == 0xD8) {
                    contentType = "image/jpeg";
                } else if (fileBytes.length >= 4 && (fileBytes[0] & 0xFF) == 0x89 && fileBytes[1] == 'P' && fileBytes[2] == 'N' && fileBytes[3] == 'G') {
                    contentType = "image/png";
                }

                String courseCode = r.getCourse() != null ? r.getCourse().getCode() : "Course";
                String semester = r.getSemesterName() != null ? r.getSemesterName().trim() : "Semester";
                String title = r.getTitle() != null ? r.getTitle().trim() : "Academic_Document";

                String baseName = (courseCode + "_" + semester + "_" + title)
                        .replaceAll("[^a-zA-Z0-9_\\-\\.]+", "_")
                        .replaceAll("_+", "_");
                if (!baseName.toLowerCase().endsWith(".pdf")) {
                    baseName += ".pdf";
                }

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.parseMediaType(contentType));
                if (download) {
                    headers.setContentDisposition(ContentDisposition.attachment().filename(baseName, StandardCharsets.UTF_8).build());
                } else {
                    headers.setContentDisposition(ContentDisposition.inline().filename(baseName, StandardCharsets.UTF_8).build());
                }
                headers.setCacheControl(CacheControl.maxAge(1, java.util.concurrent.TimeUnit.HOURS).cachePrivate());

                return ResponseEntity.ok()
                        .headers(headers)
                        .contentLength(contentLength)
                        .body(fileBytes);
            } catch (Exception e) {
                log.warn("Direct R2 S3 read failed for ID {} ({}), falling back to fetchResourceBytes: {}", id, e.getMessage(), e);
            }
        }

        try {
            byte[] fileBytes = fetchResourceBytes(targetUrl);

            // Format clean, university-standard download filename with semester and course code!
            String courseCode = r.getCourse() != null ? r.getCourse().getCode() : "Course";
            String semester = r.getSemesterName() != null ? r.getSemesterName().trim() : "Semester";
            String title = r.getTitle() != null ? r.getTitle().trim() : "Academic_Document";

            String baseName = (courseCode + "_" + semester + "_" + title)
                    .replaceAll("[^a-zA-Z0-9_\\-\\.]+", "_")
                    .replaceAll("_+", "_");

            String contentType = "application/pdf";
            String ext = ".pdf";

            if (fileBytes.length >= 4 && fileBytes[0] == '%' && fileBytes[1] == 'P' && fileBytes[2] == 'D' && fileBytes[3] == 'F') {
                contentType = "application/pdf";
                ext = ".pdf";
            } else if (fileBytes.length >= 3 && (fileBytes[0] & 0xFF) == 0xFF && (fileBytes[1] & 0xFF) == 0xD8 && (fileBytes[2] & 0xFF) == 0xFF) {
                // If it's a JPEG (from an image-converted PDF fallback), wrap into valid standard PDF document
                try {
                    fileBytes = wrapJpegToPdf(fileBytes);
                    contentType = "application/pdf";
                    ext = ".pdf";
                } catch (Exception e) {
                    contentType = "image/jpeg";
                    ext = ".jpg";
                }
            } else if (fileBytes.length >= 4 && (fileBytes[0] & 0xFF) == 0x89 && fileBytes[1] == 'P' && fileBytes[2] == 'N' && fileBytes[3] == 'G') {
                contentType = "image/png";
                ext = ".png";
            } else if (targetUrl.toLowerCase().endsWith(".docx")) {
                contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                ext = ".docx";
            } else if (targetUrl.toLowerCase().endsWith(".zip")) {
                contentType = "application/zip";
                ext = ".zip";
            }

            if (!baseName.toLowerCase().endsWith(ext)) {
                baseName += ext;
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(contentType));
            if (download) {
                headers.setContentDisposition(ContentDisposition.attachment().filename(baseName, StandardCharsets.UTF_8).build());
            } else {
                headers.setContentDisposition(ContentDisposition.inline().filename(baseName, StandardCharsets.UTF_8).build());
            }
            headers.setCacheControl(CacheControl.maxAge(1, java.util.concurrent.TimeUnit.HOURS).cachePrivate());

            return ResponseEntity.ok()
                    .headers(headers)
                    .contentLength(fileBytes.length)
                    .body(fileBytes);

        } catch (Exception e) {
            log.error("Failed to stream resource file ID {}: {}", id, e.getMessage(), e);
            if (targetUrl != null && (targetUrl.startsWith("http://") || targetUrl.startsWith("https://"))) {
                String safeRedirect = targetUrl;
                if (r2Service.isConfigured() && r2Service.hasPublicCdnUrl()) {
                    safeRedirect = r2Service.getPresignedDownloadUrl(targetUrl, 24);
                }
                if (!safeRedirect.contains(".r2.cloudflarestorage.com")) {
                    log.warn("Streaming proxy failed for external file ID {}. Redirecting client directly: {}", id, safeRedirect);
                    return ResponseEntity.status(HttpStatus.FOUND)
                            .location(URI.create(safeRedirect))
                            .build();
                }
            }
            throw new ApiException("Unable to download or stream material: " + e.getMessage());
        }
    }

    public byte[] fetchResourceBytes(String targetUrl) throws IOException {
        if (targetUrl == null || targetUrl.isBlank()) {
            throw new IllegalArgumentException("Target URL is blank");
        }

        // If local relative path (strictly confined under uploads/)
        if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
            Path uploadsBase = Paths.get("uploads").toAbsolutePath().normalize();
            Path directPath = UrlSecurityValidator.resolveSafeLocalPath(uploadsBase, targetUrl, "/uploads/", "uploads/");
            if (Files.exists(directPath) && Files.isRegularFile(directPath)) {
                return Files.readAllBytes(directPath);
            }
            Path materialsBase = uploadsBase.resolve("materials").normalize();
            String safeFileName = Paths.get(targetUrl).getFileName() != null ? Paths.get(targetUrl).getFileName().toString() : "";
            if (!safeFileName.isBlank() && !safeFileName.contains("..")) {
                Path fallbackUploads = uploadsBase.resolve(safeFileName).normalize();
                if (fallbackUploads.startsWith(uploadsBase) && Files.exists(fallbackUploads) && Files.isRegularFile(fallbackUploads)) {
                    return Files.readAllBytes(fallbackUploads);
                }
                Path fallbackMaterials = materialsBase.resolve(safeFileName).normalize();
                if (fallbackMaterials.startsWith(materialsBase) && Files.exists(fallbackMaterials) && Files.isRegularFile(fallbackMaterials)) {
                    return Files.readAllBytes(fallbackMaterials);
                }
            }
            throw new FileNotFoundException("Local file not found on disk: " + targetUrl);
        }

        // Direct Cloudflare R2 fetch via S3 API
        if (r2Service.isConfigured() && (targetUrl.contains(".r2.") || targetUrl.contains("r2.dev") || targetUrl.contains("r2_"))) {
            try {
                return r2Service.fetchBytes(targetUrl);
            } catch (Exception e) {
                log.warn("Direct Cloudflare R2 fetch failed for {}, falling back to HTTP download: {}", targetUrl, e.getMessage());
            }
        }

        // Build list of candidate URLs to try in order of highest success probability:
        List<String> candidates = new java.util.ArrayList<>();

        if (targetUrl.contains("docs.google.com/")) {
            java.util.regex.Matcher docsMatcher = java.util.regex.Pattern
                    .compile("docs\\.google\\.com/(document|presentation|spreadsheets)/d/([a-zA-Z0-9_-]+)")
                    .matcher(targetUrl);
            if (docsMatcher.find()) {
                String docType = docsMatcher.group(1);
                String docId = docsMatcher.group(2);
                if ("presentation".equals(docType)) {
                    candidates.add("https://docs.google.com/presentation/d/" + docId + "/export/pdf");
                } else {
                    candidates.add("https://docs.google.com/" + docType + "/d/" + docId + "/export?format=pdf");
                }
            }
        } else if (targetUrl.contains("drive.google.com/") || targetUrl.contains("drive.usercontent.google.com/")) {
            java.util.regex.Matcher driveMatcher = java.util.regex.Pattern
                    .compile("(?:/file/d/|/d/|[?&]id=)([a-zA-Z0-9_-]{10,})")
                    .matcher(targetUrl);
            if (driveMatcher.find()) {
                String fileId = driveMatcher.group(1);
                candidates.add("https://drive.usercontent.google.com/download?id=" + fileId + "&export=download&confirm=t");
                candidates.add("https://drive.google.com/uc?export=download&id=" + fileId + "&confirm=t");
            }
        }

        // Fallback to the original target URL directly (clean raw Cloudinary URLs or external URLs)
        if (!candidates.contains(targetUrl)) {
            candidates.add(targetUrl);
        }

        if (targetUrl.contains("cloudinary.com")) {
            if (targetUrl.contains("/raw/upload/")) {
                // If stored as raw/upload, also try /image/upload/ variant as backup
                candidates.add(targetUrl.replace("/raw/upload/", "/image/upload/"));
            } else if (targetUrl.contains("/image/upload/")) {
                // If stored as image/upload, try /raw/upload/ variant first!
                candidates.add(targetUrl.replace("/image/upload/", "/raw/upload/"));
                // Try signed image URL via Cloudinary SDK
                if (cloudinaryService.isConfigured()) {
                    String signed = cloudinaryService.getSignedUrl(targetUrl);
                    if (signed != null && !candidates.contains(signed)) {
                        candidates.add(signed);
                    }
                }
                // Try fl_attachment to force raw stream download
                candidates.add(targetUrl.replace("/image/upload/", "/image/upload/fl_attachment/"));
            }
        }

        int lastStatusCode = 0;
        String lastErrorMsg = "";
        int maxBytes = (int) FileUploadSecurityValidator.MAX_MATERIAL_BYTES;
        Map<String, String> headers = Map.of("User-Agent", "NoteLagbe-DocumentService/1.0");

        for (String url : candidates) {
            if (url == null || url.isBlank()) continue;
            try {
                HttpResponse<InputStream> res = UrlSecurityValidator.fetchValidatedStream(
                        url, headers, 3, Duration.ofSeconds(60));
                lastStatusCode = res.statusCode();

                if (res.statusCode() >= 200 && res.statusCode() < 300) {
                    String contentType = res.headers().firstValue("Content-Type").orElse("").toLowerCase(java.util.Locale.ROOT);
                    if (contentType.startsWith("text/html")) {
                        res.body().close();
                        lastErrorMsg = "Received HTML viewer page instead of binary file";
                        log.debug("Skipping HTML response ({}) from candidate URL: {}", contentType, url);
                        continue;
                    }
                    byte[] bodyBytes = UrlSecurityValidator.readBoundedBytes(res.body(), maxBytes);
                    if (bodyBytes.length == 0) {
                        continue;
                    }
                    // Guard against HTML virus-scan/viewer pages served without explicit text/html Content-Type
                    String head = new String(bodyBytes, 0, Math.min(bodyBytes.length, 64), StandardCharsets.UTF_8)
                            .trim().toLowerCase(java.util.Locale.ROOT);
                    if (head.startsWith("<!doctype html") || head.startsWith("<html")) {
                        lastErrorMsg = "Received HTML document instead of binary file";
                        log.debug("Skipping HTML payload from candidate URL: {}", url);
                        continue;
                    }
                    log.info("Successfully fetched {} bytes for material from candidate URL: {}", bodyBytes.length, url);
                    return bodyBytes;
                } else {
                    res.body().close();
                    log.debug("Candidate URL returned HTTP {}: {}", res.statusCode(), url);
                }
            } catch (Exception e) {
                lastErrorMsg = e.getMessage();
                log.debug("Exception fetching candidate {}: {}", url, e.getMessage());
            }
        }

        // As a resilient fallback for Cloudinary multi-page and single-page documents:
        if (targetUrl.contains("cloudinary.com")) {
            List<byte[]> collectedPages = new java.util.ArrayList<>();
            int maxPages = 30;

            // Normalize base URL to point to Cloudinary image pipeline with .jpg extension
            String baseImgUrl = targetUrl;
            if (baseImgUrl.contains("/raw/upload/")) {
                baseImgUrl = baseImgUrl.replace("/raw/upload/", "/image/upload/");
            }
            if (baseImgUrl.contains("/upload/fl_attachment/")) {
                baseImgUrl = baseImgUrl.replace("/upload/fl_attachment/", "/upload/");
            }
            if (baseImgUrl.contains("?")) {
                baseImgUrl = baseImgUrl.substring(0, baseImgUrl.indexOf("?"));
            }
            if (baseImgUrl.matches(".*\\.[a-zA-Z0-9]+$")) {
                baseImgUrl = baseImgUrl.replaceAll("\\.[a-zA-Z0-9]+$", ".jpg");
            } else {
                baseImgUrl = baseImgUrl + ".jpg";
            }

            UrlSecurityValidator.validatePublicHttpUrl(baseImgUrl);

            for (int pg = 1; pg <= maxPages; pg++) {
                String pgUrl = baseImgUrl.replace("/upload/", "/upload/pg_" + pg + "/");
                try {
                    HttpResponse<InputStream> res = UrlSecurityValidator.fetchValidatedStream(
                            pgUrl, headers, 3, Duration.ofSeconds(15));
                    if (res.statusCode() >= 200 && res.statusCode() < 300) {
                        byte[] pageBytes = UrlSecurityValidator.readBoundedBytes(res.body(), maxBytes);
                        if (pageBytes.length > 0) {
                            collectedPages.add(pageBytes);
                            log.info("Fetched page {} ({} bytes) from Cloudinary: {}", pg, pageBytes.length, pgUrl);
                        } else {
                            break;
                        }
                    } else {
                        res.body().close();
                        // End of document pages reached (Cloudinary returns 400 when page index exceeds total document pages)
                        break;
                    }
                } catch (Exception e) {
                    log.debug("Stopped fetching pages at index {} due to: {}", pg, e.getMessage());
                    break;
                }
            }

            if (!collectedPages.isEmpty()) {
                log.info("Successfully fetched {} pages from Cloudinary. Assembling into multi-page PDF...", collectedPages.size());
                return wrapJpegsToPdf(collectedPages);
            }
        }

        throw new IOException("Remote storage returned HTTP status " + (lastStatusCode > 0 ? lastStatusCode : "error") +
                (lastErrorMsg.isEmpty() ? "" : " (" + lastErrorMsg + ")"));
    }

    public static byte[] wrapJpegToPdf(byte[] jpegBytes) throws IOException {
        return wrapJpegsToPdf(java.util.List.of(jpegBytes));
    }

    public static byte[] wrapJpegsToPdf(List<byte[]> pagesJpegBytes) throws IOException {
        if (pagesJpegBytes == null || pagesJpegBytes.isEmpty()) {
            throw new IllegalArgumentException("No pages provided to wrap into PDF");
        }

        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
        java.util.List<Integer> offsets = new java.util.ArrayList<>();

        // PDF Header
        out.write("%PDF-1.4\n%\u00E2\u00E3\u00CF\u00D3\n".getBytes(StandardCharsets.US_ASCII));

        int pageCount = pagesJpegBytes.size();

        // 1 0 obj: Catalog
        offsets.add(out.size());
        out.write("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n".getBytes(StandardCharsets.US_ASCII));

        // 2 0 obj: Pages Root
        offsets.add(out.size());
        StringBuilder kids = new StringBuilder();
        for (int i = 0; i < pageCount; i++) {
            kids.append(3 + i * 3).append(" 0 R ");
        }
        out.write(String.format(java.util.Locale.US,
                "2 0 obj\n<< /Type /Pages /Kids [%s] /Count %d >>\nendobj\n",
                kids.toString().trim(), pageCount).getBytes(StandardCharsets.US_ASCII));

        // Write each page, content stream, and DCT image XObject
        for (int i = 0; i < pageCount; i++) {
            byte[] jpegBytes = pagesJpegBytes.get(i);
            int width = 800;
            int height = 1100;
            try {
                java.awt.image.BufferedImage img = javax.imageio.ImageIO.read(new java.io.ByteArrayInputStream(jpegBytes));
                if (img != null) {
                    width = img.getWidth();
                    height = img.getHeight();
                }
            } catch (Exception ignored) {}

            boolean isLandscape = width > height;
            float pageWidth = isLandscape ? 841.89f : 595.28f;
            float pageHeight = isLandscape ? 595.28f : 841.89f;

            float margin = 15f;
            float availW = pageWidth - margin * 2;
            float availH = pageHeight - margin * 2;
            float scale = Math.min(availW / width, availH / height);
            float drawW = width * scale;
            float drawH = height * scale;
            float x = (pageWidth - drawW) / 2;
            float y = (pageHeight - drawH) / 2;

            String contentStream = String.format(java.util.Locale.US,
                    "q\n%.2f 0 0 %.2f %.2f %.2f cm\n/Im%d Do\nQ\n",
                    drawW, drawH, x, y, i + 1);
            byte[] contentBytes = contentStream.getBytes(StandardCharsets.US_ASCII);

            int pageObjId = 3 + i * 3;
            int contentObjId = 4 + i * 3;
            int imageObjId = 5 + i * 3;

            // Page Object
            offsets.add(out.size());
            String pageObj = String.format(java.util.Locale.US,
                    "%d 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2f %.2f] /Contents %d 0 R /Resources << /XObject << /Im%d %d 0 R >> >> >>\nendobj\n",
                    pageObjId, pageWidth, pageHeight, contentObjId, i + 1, imageObjId);
            out.write(pageObj.getBytes(StandardCharsets.US_ASCII));

            // Content Stream Object
            offsets.add(out.size());
            out.write(String.format(java.util.Locale.US,
                    "%d 0 obj\n<< /Length %d >>\nstream\n", contentObjId, contentBytes.length).getBytes(StandardCharsets.US_ASCII));
            out.write(contentBytes);
            out.write("\nendstream\nendobj\n".getBytes(StandardCharsets.US_ASCII));

            // Image XObject with DCTDecode
            offsets.add(out.size());
            String imageObjHeader = String.format(java.util.Locale.US,
                    "%d 0 obj\n<< /Type /XObject /Subtype /Image /Width %d /Height %d /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length %d >>\nstream\n",
                    imageObjId, width, height, jpegBytes.length);
            out.write(imageObjHeader.getBytes(StandardCharsets.US_ASCII));
            out.write(jpegBytes);
            out.write("\nendstream\nendobj\n".getBytes(StandardCharsets.US_ASCII));
        }

        // Cross-reference table
        int startXref = out.size();
        out.write(String.format(java.util.Locale.US, "xref\n0 %d\n0000000000 65535 f \n", offsets.size() + 1).getBytes(StandardCharsets.US_ASCII));
        for (int off : offsets) {
            out.write(String.format(java.util.Locale.US, "%010d 00000 n \n", off).getBytes(StandardCharsets.US_ASCII));
        }

        // Trailer
        out.write(String.format(java.util.Locale.US, "trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n", offsets.size() + 1, startXref).getBytes(StandardCharsets.US_ASCII));

        return out.toByteArray();
    }

    public Map<String, Object> uploadMaterialFile(MultipartFile file) throws IOException {
        MultipartFile effectiveFile = file;
        int savingsPercent = 0;
        long originalBytes = file != null ? file.getSize() : 0;
        if (fileOptimizationService != null && file != null) {
            FileOptimizationService.OptimizedFileResult opt = fileOptimizationService.optimizeMaterialFile(file);
            effectiveFile = opt.getFile();
            savingsPercent = opt.getPercentSaved();
        }

        String extDot = FileUploadSecurityValidator.validateMaterial(effectiveFile, FileUploadSecurityValidator.MAX_MATERIAL_BYTES);
        String ext = extDot.startsWith(".") ? extDot.substring(1) : extDot;
        String originalFilename = effectiveFile.getOriginalFilename();
        long bytes = effectiveFile.getSize();

        String fileUrl = null;
        String storageProvider = "LOCAL_DISK";
        boolean isImg = List.of("png", "jpg", "jpeg", "webp").contains(ext);
        boolean isLargeFile = bytes > 10L * 1024 * 1024; // > 10MB

        // HYBRID / SMART STORAGE ROUTING:
        // Rule 1: Files <= 10MB (images, small PDFs, question papers) -> Cloudinary (optimized CDN delivery & fast thumbnails)
        // Rule 2: Files > 10MB (large handwritten notes, multi-page slide decks, ZIPs) -> Cloudflare R2 (zero limits, zero egress)
        // Resilient Fallback: If primary fails or is unconfigured, seamlessly fallback to secondary or local disk.

        if (isLargeFile) {
            // > 10MB: Primary is Cloudflare R2
            if (r2Service.isConfigured()) {
                try {
                    fileUrl = r2Service.uploadFile(effectiveFile, "notelagbe/materials");
                    storageProvider = "CLOUDFLARE_R2";
                    log.info("Uploaded large academic material ({}, {} MB) to Cloudflare R2: {}", ext, String.format(java.util.Locale.US, "%.2f", bytes / (1024.0 * 1024.0)), fileUrl);
                } catch (Exception e) {
                    log.error("Cloudflare R2 upload failed ({}), attempting Cloudinary fallback: {}", e.getMessage(), e);
                }
            }
            if (fileUrl == null && cloudinaryService.isConfigured()) {
                try {
                    fileUrl = cloudinaryService.uploadFile(effectiveFile, "notelagbe/materials", isImg);
                    storageProvider = "CLOUDINARY";
                    log.info("Uploaded large material to Cloudinary on fallback: {}", fileUrl);
                } catch (Exception e) {
                    log.warn("Cloudinary fallback failed for large file: {}", e.getMessage());
                }
            }
        } else {
            // <= 10MB: Primary is Cloudinary
            if (cloudinaryService.isConfigured()) {
                try {
                    fileUrl = cloudinaryService.uploadFile(effectiveFile, "notelagbe/materials", isImg);
                    storageProvider = "CLOUDINARY";
                    log.info("Uploaded standard academic material ({}, {} MB) to Cloudinary: {}", ext, String.format(java.util.Locale.US, "%.2f", bytes / (1024.0 * 1024.0)), fileUrl);
                } catch (Exception e) {
                    log.warn("Cloudinary upload failed ({}), attempting Cloudflare R2 fallback: {}", e.getMessage(), e);
                }
            }
            if (fileUrl == null && r2Service.isConfigured()) {
                try {
                    fileUrl = r2Service.uploadFile(effectiveFile, "notelagbe/materials");
                    storageProvider = "CLOUDFLARE_R2";
                    log.info("Uploaded material to Cloudflare R2 on fallback: {}", fileUrl);
                } catch (Exception e) {
                    log.error("Cloudflare R2 fallback failed: {}", e.getMessage(), e);
                }
            }
        }

        // 4. Final Resilient Fallback: Local Server Disk Storage
        if (fileUrl == null) {
            Path uploadDir = Paths.get("uploads", "materials").toAbsolutePath().normalize();
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }

            String safeBaseName = "doc";
            if (originalFilename != null) {
                String base = originalFilename.contains(".")
                        ? originalFilename.substring(0, originalFilename.lastIndexOf("."))
                        : originalFilename;
                safeBaseName = base.replaceAll("[^a-zA-Z0-9.-]", "_");
                if (safeBaseName.length() > 30) {
                    safeBaseName = safeBaseName.substring(0, 30);
                }
            }

            String uniqueFileName = "material_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8) + "_" + safeBaseName + extDot;
            Path targetPath = uploadDir.resolve(uniqueFileName).normalize();
            if (!targetPath.startsWith(uploadDir)) {
                throw new ApiException("Invalid material target path.", HttpStatus.BAD_REQUEST);
            }
            Files.copy(effectiveFile.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            fileUrl = "/uploads/materials/" + uniqueFileName;
            storageProvider = "LOCAL_DISK";
            log.info("Stored academic material on local server disk: {}", fileUrl);
        }

        String formattedSize = bytes < 1024 * 1024
                ? String.format(java.util.Locale.US, "%.1f KB", bytes / 1024.0)
                : String.format(java.util.Locale.US, "%.2f MB", bytes / (1024.0 * 1024.0));

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("url", fileUrl);
        response.put("fileName", originalFilename != null ? originalFilename : ("material_" + System.currentTimeMillis() + "." + ext));
        response.put("fileSize", formattedSize);
        response.put("fileType", ext.toUpperCase(java.util.Locale.ROOT));
        response.put("storageProvider", storageProvider);
        response.put("savingsPercent", savingsPercent);
        response.put("originalSize", originalBytes);
        response.put("optimizedSize", bytes);
        response.put("message", savingsPercent > 0
                ? "File optimized & uploaded (" + savingsPercent + "% space saved)"
                : "File successfully uploaded and stored on server");
        return response;
    }
}
