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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class ResourceService {

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
            for (String cacheName : List.of("courses", "course_details", "teachers", "teacher_details", "teacher_courses")) {
                var c = cacheManager.getCache(cacheName);
                if (c != null) c.clear();
            }
        }
    }

    public List<Resource> getResourcesForCourse(String courseCode, User user) {
        Course course = courseRepository.findByCodeIgnoreCase(courseCode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + courseCode));

        List<Resource> resources = resourceRepository.findByCourseIdAndStatus(course.getId(), ResourceStatus.APPROVED);

        boolean isUnlocked = checkCourseUnlocked(user, course);

        // If not unlocked, mask the direct file URLs for students
        if (!isUnlocked) {
            return resources.stream().map(r -> {
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
            }).toList();
        }

        return resources;
    }

    public List<Resource> getResourcesForTeacher(Long teacherId, User user) {
        List<Resource> resources = resourceRepository.findByTeacherIdAndStatus(teacherId, ResourceStatus.APPROVED);
        return resources.stream().map(r -> {
            boolean isUnlocked = checkCourseUnlocked(user, r.getCourse());
            if (!isUnlocked) {
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
        if (!resourceRepository.existsById(id)) {
            throw new ResourceNotFoundException("Resource not found: " + id);
        }
        // Handle any contribution request that references this uploaded resource
        List<ContributionRequest> crs = contributionRequestRepository.findByUploadedResourceId(id);
        contributionRequestRepository.deleteAll(crs);

        resourceRepository.deleteById(id);
        liveSyncService.broadcast("resource", "deleted", id);
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
