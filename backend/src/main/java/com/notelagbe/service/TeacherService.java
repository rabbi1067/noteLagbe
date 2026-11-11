package com.notelagbe.service;

import com.notelagbe.entity.FacultyCategory;
import com.notelagbe.entity.Resource;
import com.notelagbe.entity.Review;
import com.notelagbe.entity.Teacher;
import com.notelagbe.entity.TeacherCourse;
import com.notelagbe.exception.ApiException;
import com.notelagbe.exception.ResourceNotFoundException;
import com.notelagbe.repository.ResourceRepository;
import com.notelagbe.repository.ReviewRepository;
import com.notelagbe.repository.TeacherCourseRepository;
import com.notelagbe.repository.TeacherRepository;
import com.notelagbe.repository.UnlockedCourseRepository;
import com.notelagbe.security.FileUploadSecurityValidator;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class TeacherService {

    private final TeacherRepository teacherRepository;
    private final TeacherCourseRepository teacherCourseRepository;
    private final ResourceRepository resourceRepository;
    private final LiveSyncService liveSyncService;
    private final ReviewRepository reviewRepository;
    private final CloudinaryService cloudinaryService;
    private final UnlockedCourseRepository unlockedCourseRepository;

    public TeacherService(TeacherRepository teacherRepository,
                          TeacherCourseRepository teacherCourseRepository,
                          ResourceRepository resourceRepository,
                          LiveSyncService liveSyncService,
                          ReviewRepository reviewRepository,
                          CloudinaryService cloudinaryService,
                          UnlockedCourseRepository unlockedCourseRepository) {
        this.teacherRepository = teacherRepository;
        this.teacherCourseRepository = teacherCourseRepository;
        this.resourceRepository = resourceRepository;
        this.liveSyncService = liveSyncService;
        this.reviewRepository = reviewRepository;
        this.cloudinaryService = cloudinaryService;
        this.unlockedCourseRepository = unlockedCourseRepository;
    }

    @Cacheable(value = "teachers", key = "#category != null ? #category.name() : 'ALL'", unless = "#result == null || #result.isEmpty()")
    public List<Teacher> getAllTeachers(FacultyCategory category) {
        if (category != null) {
            return teacherRepository.findByCategory(category);
        }
        return teacherRepository.findAll();
    }

    @Cacheable(value = "teacher_details", key = "#id", unless = "#result == null")
    public Teacher getTeacherById(Long id) {
        return teacherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found with ID: " + id));
    }

    public List<TeacherCourse> getCoursesTaughtByTeacher(Long teacherId) {
        List<TeacherCourse> list = new java.util.ArrayList<>(teacherCourseRepository.findByTeacherId(teacherId));
        // Strict filter: purge/remove any demo mappings if no real resource exists and not admin assigned
        list.removeIf(tc -> {
            if (tc.getCourse() == null) return true;
            boolean hasResource = resourceRepository.existsByCourseCodeIgnoreCaseAndTeacherIdAndStatus(
                    tc.getCourse().getCode(), teacherId, com.notelagbe.entity.ResourceStatus.APPROVED);
            return !hasResource;
        });

        java.util.Set<Long> existingCourseIds = list.stream().filter(tc -> tc.getCourse() != null).map(tc -> tc.getCourse().getId()).collect(java.util.stream.Collectors.toSet());
        List<Resource> approvedResources = resourceRepository.findByTeacherIdAndStatus(teacherId, com.notelagbe.entity.ResourceStatus.APPROVED);
        Teacher teacher = teacherRepository.findById(teacherId).orElse(null);
        if (teacher != null) {
            for (Resource r : approvedResources) {
                if (r.getCourse() != null && !existingCourseIds.contains(r.getCourse().getId())) {
                    existingCourseIds.add(r.getCourse().getId());
                    TeacherCourse synthetic = new TeacherCourse(teacher, r.getCourse(), "General", "Course Material Archive");
                    list.add(synthetic);
                }
            }
        }
        return list.stream()
                .sorted((tc1, tc2) -> {
                    String code1 = tc1.getCourse() != null ? tc1.getCourse().getCode() : "";
                    String code2 = tc2.getCourse() != null ? tc2.getCourse().getCode() : "";
                    return CourseService.compareCoursesNaturally(code1, code2);
                })
                .toList();
    }

    public List<Teacher> searchTeachers(String query) {
        if (query == null || query.trim().isEmpty()) {
            return teacherRepository.findAll();
        }
        return teacherRepository.findByNameContainingIgnoreCaseOrInitialContainingIgnoreCase(query.trim(), query.trim());
    }

    @CacheEvict(value = {"teachers", "teacher_details", "courses", "course_details"}, allEntries = true)
    @Transactional
    public Teacher createTeacher(Teacher teacher) {
        if (teacher.getName() == null || teacher.getName().trim().isEmpty()) {
            throw new ApiException("Teacher name is required");
        }
        teacher.setName(teacher.getName().trim());
        if (teacher.getCategory() == null) {
            teacher.setCategory(FacultyCategory.FULL_TIME_FACULTY);
        }
        if (teacher.getDepartment() == null || teacher.getDepartment().trim().isEmpty()) {
            teacher.setDepartment("CSE");
        } else {
            teacher.setDepartment(teacher.getDepartment().trim().toUpperCase());
        }
        Teacher saved = teacherRepository.save(teacher);
        liveSyncService.broadcast("teacher", "created", saved.getId());
        return saved;
    }

    @CacheEvict(value = {"teachers", "teacher_details", "courses", "course_details"}, allEntries = true)
    @Transactional
    public Teacher updateTeacher(Long id, Map<String, Object> payload) {
        Teacher teacher = teacherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found with ID: " + id));

        if (payload.containsKey("name") && payload.get("name") != null) {
            String name = payload.get("name").toString().trim();
            if (!name.isEmpty()) teacher.setName(name);
        }
        if (payload.containsKey("initial")) {
            teacher.setInitial(payload.get("initial") != null ? payload.get("initial").toString().trim().toUpperCase() : null);
        }
        if (payload.containsKey("department")) {
            teacher.setDepartment(payload.get("department") != null && !payload.get("department").toString().trim().isEmpty() 
                    ? payload.get("department").toString().trim().toUpperCase() 
                    : "CSE");
        }
        if (payload.containsKey("designation")) {
            teacher.setDesignation(payload.get("designation") != null ? payload.get("designation").toString().trim() : null);
        }
        if (payload.containsKey("room")) {
            teacher.setRoom(payload.get("room") != null ? payload.get("room").toString().trim() : null);
        }
        if (payload.containsKey("email")) {
            teacher.setEmail(payload.get("email") != null ? payload.get("email").toString().trim() : null);
        }
        if (payload.containsKey("phone")) {
            teacher.setPhone(payload.get("phone") != null ? payload.get("phone").toString().trim() : null);
        }
        if (payload.containsKey("ext")) {
            teacher.setExt(payload.get("ext") != null ? payload.get("ext").toString().trim() : null);
        }
        if (payload.containsKey("image")) {
            teacher.setImage(payload.get("image") != null ? payload.get("image").toString().trim() : null);
        }
        if (payload.containsKey("onLeave")) {
            teacher.setOnLeave(Boolean.parseBoolean(payload.get("onLeave").toString()));
        }
        if (payload.containsKey("category") && payload.get("category") != null) {
            try {
                teacher.setCategory(FacultyCategory.valueOf(payload.get("category").toString().trim()));
            } catch (Exception ignored) {}
        }

        Teacher updated = teacherRepository.save(teacher);
        liveSyncService.broadcast("teacher", "updated", id);
        return updated;
    }

    @CacheEvict(value = {"teachers", "teacher_details", "courses", "course_details"}, allEntries = true)
    @Transactional
    public void deleteTeacher(Long id) {
        Teacher teacher = teacherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found with ID: " + id));

        List<TeacherCourse> tcs = teacherCourseRepository.findByTeacherId(teacher.getId());
        teacherCourseRepository.deleteAll(tcs);

        List<Resource> resources = resourceRepository.findByTeacherId(teacher.getId());
        for (Resource r : resources) {
            r.setTeacher(null);
            resourceRepository.save(r);
        }

        List<Review> reviews = reviewRepository.findByTeacherId(teacher.getId());
        for (Review rev : reviews) {
            rev.setTeacher(null);
            reviewRepository.save(rev);
        }

        unlockedCourseRepository.deleteByTeacherId(teacher.getId());

        teacherRepository.delete(teacher);
        liveSyncService.broadcast("teacher", "deleted", id);
    }

    public String uploadFacultyPhoto(MultipartFile file) throws IOException {
        String extDot = FileUploadSecurityValidator.validateImage(file, 5L * 1024 * 1024);

        if (cloudinaryService.isConfigured()) {
            return cloudinaryService.uploadFile(file, "notelagbe/faculty", true);
        }

        Path uploadDir = Paths.get("uploads", "faculty").toAbsolutePath().normalize();
        if (!Files.exists(uploadDir)) {
            Files.createDirectories(uploadDir);
        }

        String fileName = "faculty_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8) + extDot;
        Path targetPath = uploadDir.resolve(fileName).normalize();
        if (!targetPath.startsWith(uploadDir)) {
            throw new ApiException("Invalid target filename.");
        }
        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

        return "/uploads/faculty/" + fileName;
    }
}
