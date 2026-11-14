package com.notelagbe.service;

import com.notelagbe.entity.FacultyCategory;
import com.notelagbe.entity.Resource;
import com.notelagbe.entity.ResourceStatus;
import com.notelagbe.entity.ResourceType;
import com.notelagbe.entity.Review;
import com.notelagbe.entity.Role;
import com.notelagbe.entity.Teacher;
import com.notelagbe.entity.TeacherCourse;
import com.notelagbe.entity.User;
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
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class TeacherService {

    private final TeacherRepository teacherRepository;
    private final TeacherCourseRepository teacherCourseRepository;
    private final ResourceRepository resourceRepository;
    private final LiveSyncService liveSyncService;
    private final ReviewRepository reviewRepository;
    private final CloudinaryService cloudinaryService;
    private final UnlockedCourseRepository unlockedCourseRepository;
    private final ResourceService resourceService;

    public TeacherService(TeacherRepository teacherRepository,
                          TeacherCourseRepository teacherCourseRepository,
                          ResourceRepository resourceRepository,
                          LiveSyncService liveSyncService,
                          ReviewRepository reviewRepository,
                          CloudinaryService cloudinaryService,
                          UnlockedCourseRepository unlockedCourseRepository,
                          @Lazy ResourceService resourceService) {
        this.teacherRepository = teacherRepository;
        this.teacherCourseRepository = teacherCourseRepository;
        this.resourceRepository = resourceRepository;
        this.liveSyncService = liveSyncService;
        this.reviewRepository = reviewRepository;
        this.cloudinaryService = cloudinaryService;
        this.unlockedCourseRepository = unlockedCourseRepository;
        this.resourceService = resourceService;
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

    /**
     * Generates a complete offline materials ZIP archive for all approved documents belonging to a faculty member.
     * Exclusively accessible to Super Admin users.
     */
    public void generateTeacherMaterialsZip(Long teacherId, User superAdmin, OutputStream outputStream) throws IOException {
        if (superAdmin == null || superAdmin.getRole() != Role.ROLE_SUPER_ADMIN) {
            throw new ApiException("Access restricted: Only Super Admin can download complete faculty material archives.");
        }

        Teacher teacher = getTeacherById(teacherId);
        List<Resource> resources = resourceRepository.findByTeacherIdAndStatusOrderByCreatedAtDesc(teacherId, ResourceStatus.APPROVED);

        try (ZipOutputStream zos = new ZipOutputStream(outputStream)) {
            // 1. Standalone HTML Overview
            String overviewHtml = buildFacultyMaterialsOverviewHtml(teacher, resources);
            zos.putNextEntry(new ZipEntry("00_START_HERE_FACULTY_OVERVIEW.html"));
            zos.write(overviewHtml.getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // 2. Readme Instructions TXT
            String readmeTxt = buildFacultyReadme(teacher, resources);
            zos.putNextEntry(new ZipEntry("README_FACULTY_ARCHIVE.txt"));
            zos.write(readmeTxt.getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // 3. Process each approved material
            Set<String> usedPaths = new HashSet<>();
            for (Resource r : resources) {
                String courseCode = (r.getCourse() != null && r.getCourse().getCode() != null)
                        ? r.getCourse().getCode().trim().toUpperCase()
                        : "GENERAL";
                String courseFolder = courseCode + "/";
                String categoryFolder = getCategoryFolder(r.getType());
                String safeTitle = sanitizeFilename(r.getTitle());
                String safeFaculty = sanitizeFilename(teacher.getName());
                String baseFileName = safeFaculty + " - " + safeTitle;

                // Download original document bytes
                byte[] downloadedBytes = null;
                if (r.getFileUrl() != null && !r.getFileUrl().isBlank()) {
                    try {
                        downloadedBytes = resourceService.fetchResourceBytes(r.getFileUrl());
                    } catch (Exception e) {
                        downloadedBytes = tryDownloadUrl(r.getFileUrl(), 4000);
                    }
                }

                if (downloadedBytes != null && downloadedBytes.length > 0) {
                    String ext = ".pdf";
                    if (downloadedBytes.length >= 3 && (downloadedBytes[0] & 0xFF) == 0xFF && (downloadedBytes[1] & 0xFF) == 0xD8) {
                        ext = ".jpg";
                    } else if (downloadedBytes.length >= 4 && (downloadedBytes[0] & 0xFF) == 0x89 && downloadedBytes[1] == 'P' && downloadedBytes[2] == 'N' && downloadedBytes[3] == 'G') {
                        ext = ".png";
                    }

                    String fullDocPath = courseFolder + categoryFolder + baseFileName + ext;
                    int dupeCounter = 1;
                    while (usedPaths.contains(fullDocPath)) {
                        fullDocPath = courseFolder + categoryFolder + baseFileName + "_" + (dupeCounter++) + ext;
                    }
                    usedPaths.add(fullDocPath);

                    zos.putNextEntry(new ZipEntry(fullDocPath));
                    zos.write(downloadedBytes);
                    zos.closeEntry();
                }

                // Companion offline HTML viewer for this specific resource
                String htmlPath = courseFolder + categoryFolder + baseFileName + ".html";
                int htmlDupe = 1;
                while (usedPaths.contains(htmlPath)) {
                    htmlPath = courseFolder + categoryFolder + baseFileName + "_" + (htmlDupe++) + ".html";
                }
                usedPaths.add(htmlPath);

                String resourceViewerHtml = buildSingleResourceHtml(teacher, r, baseFileName, downloadedBytes != null);
                zos.putNextEntry(new ZipEntry(htmlPath));
                zos.write(resourceViewerHtml.getBytes(StandardCharsets.UTF_8));
                zos.closeEntry();
            }

            zos.finish();
            zos.flush();
        }
    }

    private String getCategoryFolder(ResourceType type) {
        if (type == null) return "01_Lecture_Hand_Notes/";
        switch (type) {
            case NOTE:
            case DOC_NOTE:
            case OTHERS:
            case SYLLABUS:
                return "01_Lecture_Hand_Notes/";
            case MID_QUESTION:
                return "02_Midterm_Exam_Papers/";
            case FINAL_QUESTION:
                return "03_Final_Exam_Papers/";
            case QUIZ_CT:
                return "02_Midterm_Exam_Papers/";
            case LAB_MANUAL:
            case LAB_HAND_NOTE:
            case LAB_REPORT:
            case LAB_QUIZ:
            case LAB_FINAL:
            case PROJECT_LINK:
            case QUESTION_COURSE_IN:
                return "04_Lab_Manuals_And_Tasks/";
            default:
                return "01_Lecture_Hand_Notes/";
        }
    }

    private String sanitizeFilename(String name) {
        if (name == null || name.isBlank()) return "Document";
        String clean = name.replaceAll("[\\\\/:*?\"<>|]", "_").trim();
        if (clean.length() > 60) {
            clean = clean.substring(0, 60).trim();
        }
        return clean;
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private byte[] tryDownloadUrl(String urlStr, int timeoutMs) {
        if (urlStr == null || !urlStr.startsWith("http")) return null;
        try {
            java.net.URI uri = java.net.URI.create(urlStr);
            java.net.HttpURLConnection conn = (java.net.HttpURLConnection) uri.toURL().openConnection();
            conn.setRequestProperty("User-Agent", "NoteLagbe-SEU-Faculty-Pack/1.0");
            conn.setConnectTimeout(timeoutMs);
            conn.setReadTimeout(timeoutMs);
            conn.setInstanceFollowRedirects(true);
            if (conn.getResponseCode() == 200) {
                try (InputStream in = conn.getInputStream();
                     ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                    byte[] buffer = new byte[8192];
                    int n;
                    int total = 0;
                    while ((n = in.read(buffer)) != -1) {
                        out.write(buffer, 0, n);
                        total += n;
                        if (total > 30 * 1024 * 1024) break; // 30MB limit per file
                    }
                    return out.toByteArray();
                }
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private String buildFacultyReadme(Teacher teacher, List<Resource> resources) {
        long notesCount = resources.stream().filter(r -> r.getType() == ResourceType.NOTE).count();
        long midCount = resources.stream().filter(r -> r.getType() == ResourceType.MID_QUESTION).count();
        long finalCount = resources.stream().filter(r -> r.getType() == ResourceType.FINAL_QUESTION).count();
        long labCount = resources.size() - (notesCount + midCount + finalCount);

        Set<String> distinctCourses = new LinkedHashSet<>();
        for (Resource r : resources) {
            if (r.getCourse() != null && r.getCourse().getCode() != null) {
                distinctCourses.add(r.getCourse().getCode());
            }
        }

        return """
================================================================================
NOTELAGBE - SOUTHEAST UNIVERSITY (SEU) ACADEMIC ARCHIVE
FACULTY MATERIALS ARCHIVE: %s [%s]
================================================================================
Department: %s | Room: %s | Email: %s
Designation: %s
Total Approved Materials: %d
- Courses Covered: %s
- Lecture Hand Notes: %d
- Midterm Examination Papers: %d
- Final Examination Papers: %d
- Lab Manuals & Practical Quizzes: %d

ARCHIVE DIRECTORY MAP:
--------------------------------------------------------------------------------
├── 00_START_HERE_FACULTY_OVERVIEW.html  <-- Open this in any web browser!
├── README_FACULTY_ARCHIVE.txt
└── [COURSE_CODE]/
    ├── 01_Lecture_Hand_Notes/
    ├── 02_Midterm_Exam_Papers/
    ├── 03_Final_Exam_Papers/
    └── 04_Lab_Manuals_And_Tasks/

HOW TO USE THIS ARCHIVE:
1. Double-click "00_START_HERE_FACULTY_OVERVIEW.html" to explore all teaching assets
   and exam papers for this instructor offline in any browser.
2. Direct PDFs and responsive HTML companion viewers are included for each document.
3. Prepared exclusively for NoteLagbe Super Admin quality auditing and academic archival.
================================================================================
""".formatted(
                teacher.getName(),
                teacher.getInitial() != null ? teacher.getInitial() : "SEU",
                teacher.getDepartment() != null ? teacher.getDepartment() : "CSE",
                teacher.getRoom() != null ? teacher.getRoom() : "N/A",
                teacher.getEmail() != null ? teacher.getEmail() : "N/A",
                teacher.getDesignation() != null ? teacher.getDesignation() : "Faculty Member",
                resources.size(),
                String.join(", ", distinctCourses),
                notesCount,
                midCount,
                finalCount,
                labCount
        );
    }

    private String buildFacultyMaterialsOverviewHtml(Teacher teacher, List<Resource> resources) {
        StringBuilder cardsHtml = new StringBuilder();
        for (Resource r : resources) {
            String courseCode = r.getCourse() != null ? r.getCourse().getCode() : "GENERAL";
            String categoryFolder = getCategoryFolder(r.getType());
            String safeTitle = sanitizeFilename(r.getTitle());
            String safeFaculty = sanitizeFilename(teacher.getName());
            String baseFileName = safeFaculty + " - " + safeTitle;

            String typeBadge;
            switch (r.getType()) {
                case NOTE:
                    typeBadge = "<span class=\"badge badge-blue\">Lecture Note</span>";
                    break;
                case MID_QUESTION:
                    typeBadge = "<span class=\"badge badge-amber\">Midterm Exam</span>";
                    break;
                case FINAL_QUESTION:
                    typeBadge = "<span class=\"badge badge-purple\">Final Exam</span>";
                    break;
                case LAB_MANUAL:
                case LAB_HAND_NOTE:
                case LAB_REPORT:
                case LAB_QUIZ:
                case LAB_FINAL:
                    typeBadge = "<span class=\"badge badge-cyan\">Lab Asset</span>";
                    break;
                default:
                    typeBadge = "<span class=\"badge badge-blue\">Academic Note</span>";
                    break;
            }

            String relativePdfPath = "./" + courseCode + "/" + categoryFolder + baseFileName + ".pdf";
            String relativeHtmlPath = "./" + courseCode + "/" + categoryFolder + baseFileName + ".html";

            cardsHtml.append("""
                <div class="card" data-course="%s" data-type="%s">
                    <div class="card-header">
                        %s
                        <span class="badge badge-course">%s</span>
                        <span class="semester-pill">%s</span>
                    </div>
                    <h3 class="card-title">%s</h3>
                    <p class="card-meta">Course: %s | Uploaded on NoteLagbe Archive</p>
                    <div class="card-actions">
                        <a href="%s" target="_blank" class="btn btn-primary">📄 Open Document</a>
                        <a href="%s" class="btn btn-secondary">🔍 Offline Viewer</a>
                    </div>
                </div>
            """.formatted(
                    courseCode.toLowerCase(),
                    r.getType().name().toLowerCase(),
                    typeBadge,
                    courseCode,
                    escapeHtml(r.getSemesterName() != null ? r.getSemesterName() : "Academic"),
                    escapeHtml(r.getTitle()),
                    r.getCourse() != null ? escapeHtml(r.getCourse().getTitle()) : "Course Archive",
                    relativePdfPath,
                    relativeHtmlPath
            ));
        }

        return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>%s - Complete Academic Archive | NoteLagbe</title>
    <style>
        :root {
            --bg-primary: #090e1a;
            --bg-secondary: #0f172a;
            --card-bg: rgba(30, 41, 59, 0.7);
            --card-border: rgba(148, 163, 184, 0.15);
            --accent-blue: #3b82f6;
            --accent-indigo: #6366f1;
            --accent-purple: #a855f7;
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --font-stack: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            background-color: var(--bg-primary);
            color: var(--text-primary);
            font-family: var(--font-stack);
            line-height: 1.5;
            padding: 30px 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .hero {
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(168, 85, 247, 0.15));
            border: 1px solid var(--card-border);
            border-radius: 24px;
            padding: 36px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(10px);
        }
        .hero-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 12px;
            background: rgba(168, 85, 247, 0.2);
            color: #d8b4fe;
            border: 1px solid rgba(168, 85, 247, 0.3);
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 12px;
        }
        .hero h1 { font-size: 32px; font-weight: 900; margin-bottom: 8px; color: #fff; }
        .hero p { color: var(--text-secondary); font-size: 14px; max-width: 750px; }
        .hero-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 16px;
            margin-top: 24px;
        }
        .stat-box {
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid var(--card-border);
            border-radius: 16px;
            padding: 16px;
            text-align: center;
        }
        .stat-num { font-size: 26px; font-weight: 900; color: #fff; }
        .stat-label { font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; }
        .filter-bar {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-bottom: 24px;
        }
        .search-box {
            flex: 1;
            min-width: 250px;
            background: var(--bg-secondary);
            border: 1px solid var(--card-border);
            padding: 12px 18px;
            border-radius: 16px;
            color: #fff;
            font-size: 13px;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
            gap: 20px;
        }
        .card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 20px;
            padding: 24px;
            transition: all 0.2s ease;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        .card:hover {
            transform: translateY(-3px);
            border-color: rgba(59, 130, 246, 0.4);
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.4);
        }
        .card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
        .badge {
            font-size: 10px;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: 6px;
            text-transform: uppercase;
        }
        .badge-blue { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
        .badge-amber { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
        .badge-purple { background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }
        .badge-cyan { background: rgba(6, 182, 212, 0.15); color: #22d3ee; border: 1px solid rgba(6, 182, 212, 0.3); }
        .badge-course { background: rgba(255, 255, 255, 0.1); color: #fff; border: 1px solid rgba(255, 255, 255, 0.2); }
        .semester-pill { font-size: 11px; color: var(--text-secondary); margin-left: auto; font-family: monospace; }
        .card-title { font-size: 16px; font-weight: 800; color: #fff; margin-bottom: 8px; line-height: 1.3; }
        .card-meta { font-size: 12px; color: var(--text-secondary); margin-bottom: 20px; }
        .card-actions { display: flex; gap: 8px; }
        .btn {
            flex: 1;
            padding: 10px 14px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 700;
            text-align: center;
            text-decoration: none;
            transition: all 0.2s ease;
        }
        .btn-primary { background: linear-gradient(135deg, #3b82f6, #6366f1); color: #fff; }
        .btn-primary:hover { opacity: 0.9; }
        .btn-secondary { background: rgba(255, 255, 255, 0.08); color: #e2e8f0; border: 1px solid var(--card-border); }
        .btn-secondary:hover { background: rgba(255, 255, 255, 0.15); }
        .footer { text-align: center; margin-top: 50px; font-size: 12px; color: var(--text-secondary); }
    </style>
</head>
<body>
    <div class="container">
        <div class="hero">
            <div class="hero-badge">👑 Super Admin Faculty Material Archive</div>
            <h1>%s %s</h1>
            <p>%s • Department of %s • Southeast University</p>
            <p style="margin-top: 4px; font-size: 12px;">Office: %s | Email: %s</p>
            <div class="hero-stats">
                <div class="stat-box">
                    <div class="stat-num">%d</div>
                    <div class="stat-label">Total Materials</div>
                </div>
                <div class="stat-box">
                    <div class="stat-num">%s</div>
                    <div class="stat-label">Initial</div>
                </div>
                <div class="stat-box">
                    <div class="stat-num">SEU</div>
                    <div class="stat-label">Verified Archive</div>
                </div>
            </div>
        </div>

        <div class="filter-bar">
            <input type="text" id="searchInput" class="search-box" placeholder="Search title, course code (e.g. CSE343), or exam type..." onkeyup="filterCards()">
        </div>

        <div class="grid" id="materialsGrid">
            %s
        </div>

        <div class="footer">
            NoteLagbe — Southeast University Academic Archives &copy; 2026. Standalone Offline Distribution.
        </div>
    </div>
    <script>
        function filterCards() {
            const query = document.getElementById('searchInput').value.toLowerCase();
            const cards = document.querySelectorAll('.card');
            cards.forEach(card => {
                const text = card.innerText.toLowerCase();
                if (text.includes(query)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        }
    </script>
</body>
</html>
""".formatted(
                escapeHtml(teacher.getName()),
                escapeHtml(teacher.getName()),
                teacher.getInitial() != null ? "[" + escapeHtml(teacher.getInitial()) + "]" : "",
                escapeHtml(teacher.getDesignation() != null ? teacher.getDesignation() : "Faculty Member"),
                escapeHtml(teacher.getDepartment() != null ? teacher.getDepartment() : "CSE"),
                escapeHtml(teacher.getRoom() != null ? teacher.getRoom() : "N/A"),
                escapeHtml(teacher.getEmail() != null ? teacher.getEmail() : "N/A"),
                resources.size(),
                escapeHtml(teacher.getInitial() != null ? teacher.getInitial() : "SEU"),
                cardsHtml.toString()
        );
    }

    private String buildSingleResourceHtml(Teacher teacher, Resource r, String baseFileName, boolean hasPdf) {
        String courseCode = r.getCourse() != null ? r.getCourse().getCode() : "GENERAL";
        return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>%s | %s</title>
    <style>
        body {
            background-color: #0b1120;
            color: #f8fafc;
            font-family: system-ui, -apple-system, sans-serif;
            margin: 0;
            padding: 20px;
            display: flex;
            flex-direction: column;
            height: 100vh;
            box-sizing: border-box;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #1e293b;
            padding: 16px 24px;
            border-radius: 16px;
            margin-bottom: 16px;
            border: 1px solid #334155;
        }
        .header h1 { font-size: 18px; font-weight: 800; margin: 0; }
        .header p { font-size: 12px; color: #94a3b8; margin: 4px 0 0 0; }
        .btn {
            background: #3b82f6;
            color: #fff;
            padding: 10px 18px;
            border-radius: 10px;
            text-decoration: none;
            font-size: 13px;
            font-weight: 700;
        }
        .viewer-container {
            flex: 1;
            background: #020617;
            border-radius: 16px;
            border: 1px solid #1e293b;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        iframe { width: 100%%; height: 100%%; border: none; }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>%s</h1>
            <p>%s • Faculty: %s • %s</p>
        </div>
        <div>
            %s
            <a href="../../00_START_HERE_FACULTY_OVERVIEW.html" class="btn" style="background: #475569; margin-left: 8px;">Back to Overview</a>
        </div>
    </div>
    <div class="viewer-container">
        %s
    </div>
</body>
</html>
""".formatted(
                escapeHtml(r.getTitle()),
                courseCode,
                escapeHtml(r.getTitle()),
                courseCode,
                escapeHtml(teacher.getName()),
                escapeHtml(r.getSemesterName() != null ? r.getSemesterName() : "Academic"),
                hasPdf ? "<a href=\"./" + escapeHtml(baseFileName) + ".pdf\" target=\"_blank\" class=\"btn\">Open PDF</a>" : "",
                hasPdf ? "<iframe src=\"./" + escapeHtml(baseFileName) + ".pdf\"></iframe>" : "<p style=\"color: #94a3b8;\">Standalone PDF viewer loaded. Open PDF directly if supported.</p>"
        );
    }
}
