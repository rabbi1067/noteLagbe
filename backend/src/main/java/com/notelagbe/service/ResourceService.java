package com.notelagbe.service;

import com.notelagbe.dto.ResourceCreateRequest;
import com.notelagbe.entity.*;
import com.notelagbe.exception.ResourceNotFoundException;
import com.notelagbe.repository.*;
import org.springframework.web.multipart.MultipartFile;
import com.notelagbe.exception.ApiException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.ContentDisposition;
import org.springframework.http.CacheControl;
import java.nio.charset.StandardCharsets;
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
    private final TeacherCourseRepository teacherCourseRepository;
    private final CacheManager cacheManager;

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
        this.resourceRepository = resourceRepository;
        this.courseRepository = courseRepository;
        this.teacherRepository = teacherRepository;
        this.unlockedCourseRepository = unlockedCourseRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.subscriptionService = subscriptionService;
        this.liveSyncService = liveSyncService;
        this.contributionRequestRepository = contributionRequestRepository;
        this.cloudinaryService = cloudinaryService;
        this.teacherCourseRepository = teacherCourseRepository;
        this.cacheManager = cacheManager;
    }

    private void evictCaches() {
        if (cacheManager != null) {
            for (String cacheName : List.of("courses", "course_details", "teachers", "teacher_details", "teacher_courses", "course_resources", "teacher_resources")) {
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
            return r;
        }).toList();
    }

    private Resource maskLockedResource(Resource r) {
        Resource masked = new Resource();
        masked.setId(r.getId());
        masked.setTitle(r.getTitle());
        masked.setType(r.getType());
        masked.setFileUrl(null); // Locked!
        masked.setPreviewUrl(r.getPreviewUrl());
        masked.setSemesterName(r.getSemesterName());
        masked.setAcademicYear(r.getAcademicYear());
        masked.setCourse(r.getCourse());
        masked.setTeacher(r.getTeacher());
        masked.setStatus(r.getStatus());
        masked.setDownloadsCount(r.getDownloadsCount());
        masked.setCreatedAt(r.getCreatedAt());
        return masked;
    }

    @Cacheable(value = "teacher_resources", key = "(#user != null ? #user.id : 0) + '_' + #teacherId", unless = "#result == null")
    public List<Resource> getResourcesForTeacher(Long teacherId, User user) {
        List<Resource> resources = resourceRepository.findByTeacherIdAndStatus(teacherId, ResourceStatus.APPROVED);
        return resources.stream().map(r -> {
            boolean isUnlocked = subscriptionService.isResourceUnlocked(user, r);
            if (!isUnlocked) {
                return maskLockedResource(r);
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
        return resourceRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public Resource createResource(ResourceCreateRequest req, User uploader) {
        Course course = courseRepository.findByCodeIgnoreCase(req.getCourseCode().trim())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + req.getCourseCode()));

        Teacher teacher = null;
        if (req.getTeacherId() != null && req.getTeacherId() > 0) {
            teacher = teacherRepository.findById(req.getTeacherId()).orElse(null);
        }

        Resource r = new Resource();
        r.setTitle(req.getTitle().trim());
        r.setType(req.getType() != null ? req.getType() : ResourceType.NOTE);
        r.setFileUrl(req.getFileUrl().trim());
        r.setPreviewUrl(req.getPreviewUrl());
        r.setSemesterName(req.getSemesterName() != null ? req.getSemesterName().trim() : "Fall 2026");
        r.setAcademicYear(req.getAcademicYear() > 0 ? req.getAcademicYear() : 2026);
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
            r.setSemesterName(req.getSemesterName().trim());
        }
        if (req.getAcademicYear() > 0) {
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
    public void deleteResource(Long id) {
        Resource r = resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found: " + id));
        Course course = r.getCourse();
        Teacher teacher = r.getTeacher();

        // Handle any contribution request that references this uploaded resource
        List<ContributionRequest> crs = contributionRequestRepository.findByUploadedResourceId(id);
        contributionRequestRepository.deleteAll(crs);

        resourceRepository.delete(r);

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

    public Resource getResourceById(Long id) {
        return resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with ID: " + id));
    }

    public void incrementDownloadCount(Long resourceId) {
        resourceRepository.findById(resourceId).ifPresent(r -> {
            r.setDownloadsCount(r.getDownloadsCount() + 1);
            resourceRepository.save(r);
        });
    }

    public ResponseEntity<byte[]> streamResourceFile(Long id, boolean download, User user) {
        Resource r = getResourceById(id);

        // If resource is not approved, only admin or uploader can view
        if (r.getStatus() != ResourceStatus.APPROVED) {
            boolean isAdmin = user != null && user.getRole() != null &&
                    (user.getRole() == Role.ROLE_ADMIN || user.getRole() == Role.ROLE_SUPER_ADMIN || user.getRole() == Role.ROLE_MANAGER ||
                     user.getRole().name().contains("ADMIN") || user.getRole().name().contains("MANAGER"));
            boolean isUploader = user != null && r.getUploader() != null && user.getId().equals(r.getUploader().getId());
            if (!isAdmin && !isUploader) {
                throw new ApiException("This material is pending approval and cannot be accessed yet.");
            }
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
            throw new ApiException("Unable to download or stream material: " + e.getMessage());
        }
    }

    public byte[] fetchResourceBytes(String targetUrl) throws IOException {
        if (targetUrl == null || targetUrl.isBlank()) {
            throw new IllegalArgumentException("Target URL is blank");
        }

        // If local relative path
        if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
            String clean = targetUrl.startsWith("/") ? targetUrl.substring(1) : targetUrl;
            Path p = Paths.get(clean);
            if (Files.exists(p)) {
                return Files.readAllBytes(p);
            }
            Path uploadsPath = Paths.get("uploads").resolve(p.getFileName());
            if (Files.exists(uploadsPath)) {
                return Files.readAllBytes(uploadsPath);
            }
            Path materialsPath = Paths.get("uploads", "materials").resolve(p.getFileName());
            if (Files.exists(materialsPath)) {
                return Files.readAllBytes(materialsPath);
            }
            throw new FileNotFoundException("Local file not found on disk: " + targetUrl);
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

        // HTTP Client with redirects enabled
        java.net.http.HttpClient client = java.net.http.HttpClient.newBuilder()
                .followRedirects(java.net.http.HttpClient.Redirect.ALWAYS)
                .connectTimeout(java.time.Duration.ofSeconds(15))
                .build();

        int lastStatusCode = 0;
        String lastErrorMsg = "";

        for (String url : candidates) {
            if (url == null || url.isBlank()) continue;
            try {
                java.net.http.HttpRequest req = java.net.http.HttpRequest.newBuilder()
                        .uri(java.net.URI.create(url))
                        .timeout(java.time.Duration.ofSeconds(20))
                        .header("User-Agent", "NoteLagbe-DocumentService/1.0")
                        .GET()
                        .build();

                java.net.http.HttpResponse<byte[]> res = client.send(req, java.net.http.HttpResponse.BodyHandlers.ofByteArray());
                lastStatusCode = res.statusCode();

                if (res.statusCode() >= 200 && res.statusCode() < 300 && res.body() != null && res.body().length > 0) {
                    String contentType = res.headers().firstValue("Content-Type").orElse("").toLowerCase(java.util.Locale.ROOT);
                    if (contentType.startsWith("text/html")) {
                        lastErrorMsg = "Received HTML viewer page instead of binary file";
                        log.debug("Skipping HTML response ({}) from candidate URL: {}", contentType, url);
                        continue;
                    }
                    // Guard against HTML virus-scan/viewer pages served without explicit text/html Content-Type
                    String head = new String(res.body(), 0, Math.min(res.body().length, 64), java.nio.charset.StandardCharsets.UTF_8)
                            .trim().toLowerCase(java.util.Locale.ROOT);
                    if (head.startsWith("<!doctype html") || head.startsWith("<html")) {
                        lastErrorMsg = "Received HTML document instead of binary file";
                        log.debug("Skipping HTML payload from candidate URL: {}", url);
                        continue;
                    }
                    log.info("Successfully fetched {} bytes for material from candidate URL: {}", res.body().length, url);
                    return res.body();
                } else {
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

            for (int pg = 1; pg <= maxPages; pg++) {
                String pgUrl = baseImgUrl.replace("/upload/", "/upload/pg_" + pg + "/");
                try {
                    java.net.http.HttpRequest req = java.net.http.HttpRequest.newBuilder()
                            .uri(java.net.URI.create(pgUrl))
                            .timeout(java.time.Duration.ofSeconds(15))
                            .header("User-Agent", "NoteLagbe-DocumentService/1.0")
                            .GET()
                            .build();
                    java.net.http.HttpResponse<byte[]> res = client.send(req, java.net.http.HttpResponse.BodyHandlers.ofByteArray());
                    if (res.statusCode() >= 200 && res.statusCode() < 300 && res.body() != null && res.body().length > 0) {
                        collectedPages.add(res.body());
                        log.info("Fetched page {} ({} bytes) from Cloudinary: {}", pg, res.body().length, pgUrl);
                    } else {
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
        if (file == null || file.isEmpty()) {
            throw new ApiException("No file was selected for upload.");
        }
        if (file.getSize() > 50 * 1024 * 1024) {
            throw new ApiException("File exceeds the maximum allowable size limit of 50 MB.");
        }

        String originalFilename = file.getOriginalFilename();
        String ext = "pdf";
        if (originalFilename != null && originalFilename.contains(".")) {
            ext = originalFilename.substring(originalFilename.lastIndexOf(".") + 1).toLowerCase();
        }

        List<String> allowedExtensions = List.of(
                "pdf", "png", "jpg", "jpeg", "webp", "doc", "docx", "ppt", "pptx", "zip"
        );
        if (!allowedExtensions.contains(ext)) {
            throw new ApiException("Unsupported file format (." + ext + "). Please upload a PDF, Image (PNG/JPG/WEBP), Office Document, or ZIP archive.");
        }

        String fileUrl;
        if (cloudinaryService.isConfigured()) {
            boolean isImg = List.of("png", "jpg", "jpeg", "webp").contains(ext);
            fileUrl = cloudinaryService.uploadFile(file, "notelagbe/materials", isImg);
        } else {
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

            String uniqueFileName = "material_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8) + "_" + safeBaseName + "." + ext;
            Path targetPath = uploadDir.resolve(uniqueFileName);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            fileUrl = "/uploads/materials/" + uniqueFileName;
        }
        long bytes = file.getSize();
        String formattedSize = bytes < 1024 * 1024
                ? String.format("%.1f KB", bytes / 1024.0)
                : String.format("%.2f MB", bytes / (1024.0 * 1024.0));

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("url", fileUrl);
        response.put("fileName", originalFilename != null ? originalFilename : ("material_" + System.currentTimeMillis() + "." + ext));
        response.put("fileSize", formattedSize);
        response.put("fileType", ext.toUpperCase());
        response.put("message", "File successfully uploaded and stored on server");
        return response;
    }
}
