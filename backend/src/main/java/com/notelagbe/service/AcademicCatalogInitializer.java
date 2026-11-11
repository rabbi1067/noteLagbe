package com.notelagbe.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.notelagbe.entity.Course;
import com.notelagbe.entity.FacultyCategory;
import com.notelagbe.entity.Teacher;
import com.notelagbe.entity.TeacherCourse;
import com.notelagbe.repository.CourseRepository;
import com.notelagbe.repository.TeacherCourseRepository;
import com.notelagbe.repository.TeacherRepository;
import com.notelagbe.repository.ResourceRepository;
import com.notelagbe.entity.Resource;
import com.notelagbe.entity.ResourceStatus;
import com.notelagbe.entity.User;
import com.notelagbe.entity.Role;
import com.notelagbe.entity.AuthProvider;
import com.notelagbe.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.CacheManager;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Initializes the authentic Southeast University Academic Catalog (Curriculum & Faculty Directory).
 * This component NEVER creates demo users, dummy reviews, fake resources, or dummy payments.
 * It strictly ensures that Southeast University CSE courses and faculty members are available in the database.
 */
@Component
@Order(1)
@ConditionalOnProperty(name = "app.catalog.init-enabled", havingValue = "true", matchIfMissing = true)
public class AcademicCatalogInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AcademicCatalogInitializer.class);

    private final CourseRepository courseRepository;
    private final TeacherRepository teacherRepository;
    private final TeacherCourseRepository teacherCourseRepository;
    private final ResourceRepository resourceRepository;
    private final SeuFacultySyncService seuFacultySyncService;
    private final ObjectMapper objectMapper;
    private final CacheManager cacheManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.initial-email:}")
    private String initialAdminEmail;

    @Value("${app.admin.initial-password:}")
    private String initialAdminPassword;

    @Value("${app.admin.owner-email:}")
    private String ownerAdminEmail;

    public AcademicCatalogInitializer(CourseRepository courseRepository,
                                      TeacherRepository teacherRepository,
                                      TeacherCourseRepository teacherCourseRepository,
                                       ResourceRepository resourceRepository,
                                      SeuFacultySyncService seuFacultySyncService,
                                      ObjectMapper objectMapper,
                                      CacheManager cacheManager,
                                      UserRepository userRepository,
                                      PasswordEncoder passwordEncoder) {
        this.courseRepository = courseRepository;
        this.teacherRepository = teacherRepository;
        this.teacherCourseRepository = teacherCourseRepository;
        this.resourceRepository = resourceRepository;
        this.seuFacultySyncService = seuFacultySyncService;
        this.objectMapper = objectMapper;
        this.cacheManager = cacheManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        log.info(">>> Checking Southeast University Academic Catalog in database...");
        long existingCourses = courseRepository.count();
        long existingTeachers = teacherRepository.count();

        if (existingCourses == 0) {
            seedCoursesIfEmpty();
        }
        if (existingTeachers == 0) {
            seedTeachersIfEmpty();
        }

        // Always sync the Super Admin record synchronously before accepting traffic.
        ensureSuperAdminUser();

        if (existingCourses > 0 && existingTeachers > 0) {
            // Defer catalog hygiene off the cold-start critical path so Render boots and passes health checks quickly.
            log.info(">>> Southeast University Academic Catalog verified ({} courses, {} teachers). Running consistency check asynchronously.",
                    existingCourses, existingTeachers);
            CompletableFuture.runAsync(this::runCatalogConsistencyMaintenanceSafe);
        } else {
            runCatalogConsistencyMaintenanceSafe();
            log.info(">>> Southeast University Academic Catalog verified in database.");
        }
    }

    private void runCatalogConsistencyMaintenanceSafe() {
        try {
            purgeNonCseDummyCourses();
            reconcileTeacherCourseMappings();
            ensureAllTeachersHaveInitials();

            if (cacheManager != null) {
                for (String cacheName : cacheManager.getCacheNames()) {
                    var c = cacheManager.getCache(cacheName);
                    if (c != null) c.clear();
                }
            }
        } catch (Exception e) {
            log.warn("Catalog consistency maintenance skipped/failed: {}", e.getMessage());
        }
    }

    private void ensureSuperAdminUser() {
        String adminEmail = (initialAdminEmail != null && !initialAdminEmail.isBlank())
                ? initialAdminEmail.trim().toLowerCase()
                : "admin@seu.edu.bd";
        String adminPass = (initialAdminPassword != null && !initialAdminPassword.isBlank())
                ? initialAdminPassword.trim()
                : "Admin@Password123!";

        Optional<User> existingAdmin = userRepository.findByEmail(adminEmail);
        if (existingAdmin.isPresent()) {
            User admin = existingAdmin.get();
            boolean changed = false;
            if (admin.getRole() != Role.ROLE_SUPER_ADMIN) {
                admin.setRole(Role.ROLE_SUPER_ADMIN);
                changed = true;
            }
            if (!admin.isEnabled()) {
                admin.setEnabled(true);
                changed = true;
            }
            if (admin.getPassword() == null || admin.getPassword().isBlank()) {
                admin.setPassword(passwordEncoder.encode(adminPass));
                changed = true;
            }
            if (changed) {
                userRepository.save(admin);
            }
            log.info(">>> Super Admin account synchronized for: {}", adminEmail);
        } else {
            User superAdmin = new User();
            superAdmin.setName("Fazle Rabbi");
            superAdmin.setEmail(adminEmail);
            superAdmin.setPassword(passwordEncoder.encode(adminPass));
            superAdmin.setRole(Role.ROLE_SUPER_ADMIN);
            superAdmin.setStudentId("2022100010045");
            superAdmin.setAuthProvider(AuthProvider.LOCAL);
            superAdmin.setEnabled(true);
            userRepository.save(superAdmin);
            log.info(">>> Initial Super Admin provisioned securely for email: {}", adminEmail);
        }

        if (ownerAdminEmail != null && !ownerAdminEmail.isBlank()) {
            userRepository.findByEmail(ownerAdminEmail.trim().toLowerCase()).ifPresent(u -> {
                if (u.getRole() != Role.ROLE_SUPER_ADMIN) {
                    u.setRole(Role.ROLE_SUPER_ADMIN);
                    userRepository.save(u);
                }
            });
        }
    }

    private void seedCoursesIfEmpty() {
        if (courseRepository.count() > 0) {
            log.info("Courses table already populated ({} courses found). Skipping course init.", courseRepository.count());
            return;
        }

        try {
            ClassPathResource res = new ClassPathResource("data/courses_curriculum.json");
            if (res.exists()) {
                try (InputStream is = res.getInputStream()) {
                    List<Map<String, Object>> courseList = objectMapper.readValue(is, new TypeReference<>() {});
                    for (Map<String, Object> cMap : courseList) {
                        Course c = new Course();
                        String code = (String) cMap.get("code");
                        c.setCode(code);
                        c.setTitle((String) cMap.get("title"));
                        c.setCredits(Double.parseDouble(cMap.get("credits").toString()));
                        c.setSemester(Integer.parseInt(cMap.get("semester").toString()));
                        c.setLab((Boolean) cMap.getOrDefault("isLab", false));
                        c.setPrerequisite((String) cMap.getOrDefault("prerequisite", "Nil"));
                        c.setElectiveGroup((String) cMap.get("electiveGroup"));

                        String dept = (String) cMap.get("department");
                        if (dept == null || dept.trim().isEmpty()) {
                            dept = "CSE";
                        }
                        c.setDepartment(dept);
                        courseRepository.save(c);
                    }
                    log.info("Initialized {} official courses for Southeast University CSE Curriculum.", courseList.size());
                }
            }
        } catch (Exception e) {
            log.error("Failed to load courses_curriculum.json", e);
        }
    }

    private void seedTeachersIfEmpty() {
        if (teacherRepository.count() > 0) {
            log.info("Teachers table already populated ({} teachers found).", teacherRepository.count());
            return;
        }

        loadTeachersFromJson("data/full_time_faculty.json", FacultyCategory.FULL_TIME_FACULTY);
        loadTeachersFromJson("data/adjunct_faculty.json", FacultyCategory.ADJUNCT_FACULTY);
        loadTeachersFromJson("data/officers_staff.json", FacultyCategory.OFFICERS_AND_STAFF);

        ensureTeacher("Md. Shakib Hasan", "MSH", "Senior Lecturer", FacultyCategory.FULL_TIME_FACULTY, "Room 528", "shakib.hasan@seu.edu.bd");
        ensureTeacher("Belal Ahmed", "BA", "Assistant Professor", FacultyCategory.FULL_TIME_FACULTY, "Room 529", "belal.ahmed@seu.edu.bd");

        syncTeachersFromRateMyFaculty();
        try {
            seuFacultySyncService.syncCseFaculties();
        } catch (Exception e) {
            log.warn("SEU Faculty live scrape skipped: {}", e.getMessage());
        }
    }

    private void loadTeachersFromJson(String path, FacultyCategory category) {
        try {
            ClassPathResource res = new ClassPathResource(path);
            if (!res.exists()) return;

            try (InputStream is = res.getInputStream()) {
                List<Map<String, Object>> list = objectMapper.readValue(is, new TypeReference<>() {});
                for (Map<String, Object> map : list) {
                    String name = (String) map.get("name");
                    if (name == null || name.trim().isEmpty()) continue;

                    String initial = (String) map.get("initial");
                    if (initial == null && map.containsKey("initials")) {
                        initial = (String) map.get("initials");
                    }
                    if (initial != null && initial.trim().isEmpty()) {
                        initial = null;
                    }

                    if (teacherRepository.findByNameContainingIgnoreCaseOrInitialContainingIgnoreCase(name, initial != null ? initial : name).isEmpty()) {
                        Teacher t = new Teacher();
                        t.setName(name.trim());
                        t.setInitial(initial != null ? initial.trim() : null);
                        t.setDesignation((String) map.getOrDefault("designation", "Faculty Member"));
                        t.setCategory(category);
                        t.setRoom((String) map.getOrDefault("room", "Faculty Office"));
                        t.setEmail((String) map.getOrDefault("email", ""));
                        t.setPhone((String) map.getOrDefault("phone", ""));
                        t.setImage((String) map.getOrDefault("image", ""));
                        teacherRepository.save(t);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to load teachers from " + path, e);
        }
    }

    private void ensureTeacher(String name, String initial, String desig, FacultyCategory cat, String room, String email) {
        if (teacherRepository.findByNameContainingIgnoreCaseOrInitialContainingIgnoreCase(name, initial).isEmpty()) {
            Teacher t = new Teacher();
            t.setName(name);
            t.setInitial(initial);
            t.setDesignation(desig);
            t.setCategory(cat);
            t.setRoom(room);
            t.setEmail(email);
            teacherRepository.save(t);
        }
    }

    private void syncTeachersFromRateMyFaculty() {
        try {
            ClassPathResource res = new ClassPathResource("data/seu_ratemyfaculty_teachers.json");
            if (!res.exists()) return;

            try (InputStream is = res.getInputStream()) {
                List<Map<String, Object>> list = objectMapper.readValue(is, new TypeReference<>() {});
                for (Map<String, Object> map : list) {
                    String fullName = (String) map.get("fullName");
                    if (fullName == null || fullName.trim().isEmpty()) continue;

                    String name = fullName;
                    String initial = null;

                    Matcher m = Pattern.compile("^(.*?)\\s*\\[([A-Z0-9]+)\\]$").matcher(fullName.trim());
                    if (m.matches()) {
                        name = m.group(1).trim();
                        initial = m.group(2).trim();
                    }

                    String photoUrl = (String) map.get("photoUrl");

                    Teacher t = null;
                    List<Teacher> byName = teacherRepository.findByNameIgnoreCase(name);
                    if (!byName.isEmpty()) {
                        t = byName.get(0);
                    } else if (initial != null) {
                        List<Teacher> byInit = teacherRepository.findByInitialIgnoreCase(initial);
                        if (!byInit.isEmpty()) {
                            t = byInit.get(0);
                        } else {
                            List<Teacher> bySub = teacherRepository.findByNameContainingIgnoreCase(name);
                            if (!bySub.isEmpty()) {
                                t = bySub.get(0);
                            }
                        }
                    }

                    if (t != null) {
                        boolean modified = false;
                        if (initial != null && (t.getInitial() == null || !t.getInitial().equalsIgnoreCase(initial))) {
                            t.setInitial(initial);
                            modified = true;
                        }
                        if (photoUrl != null && !photoUrl.contains("avatar_blue") && (t.getImage() == null || t.getImage().contains("avatar_blue") || t.getImage().startsWith("."))) {
                            t.setImage(photoUrl);
                            modified = true;
                        }
                        if (modified) {
                            teacherRepository.save(t);
                        }
                    } else {
                        t = new Teacher();
                        t.setName(name);
                        t.setInitial(initial);
                        t.setDesignation("Faculty Member");
                        t.setCategory(FacultyCategory.FULL_TIME_FACULTY);
                        t.setRoom("Faculty Office, Level 6");
                        t.setEmail(initial != null ? initial.toLowerCase() + "@seu.edu.bd" : "faculty@seu.edu.bd");
                        t.setImage(photoUrl);
                        teacherRepository.save(t);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to sync teachers from RateMyFaculty json", e);
        }
    }

    private void purgeNonCseDummyCourses() {
        // Enforce authentic CSE curriculum: Purge any non-CSE dummy courses (e.g. mock BBA, EEE, LAW, PHAR, ENG courses).
        // CSE non-major courses (such as ENG101, EEE181, ACT141, etc.) have department = "CSE" and are strictly kept.
        List<Course> nonCseCourses = courseRepository.findAll().stream()
                .filter(c -> c.getDepartment() != null && !c.getDepartment().trim().equalsIgnoreCase("CSE"))
                .toList();
        if (!nonCseCourses.isEmpty()) {
            for (Course nc : nonCseCourses) {
                try {
                    var mappings = teacherCourseRepository.findByCourseId(nc.getId());
                    if (mappings != null && !mappings.isEmpty()) {
                        teacherCourseRepository.deleteAll(mappings);
                    }
                    courseRepository.delete(nc);
                } catch (Exception ex) {
                    log.warn("Skipping cleanup of non-CSE course {} because related academic records exist: {}", nc.getCode(), ex.getMessage());
                }
            }
            log.info("Purged {} mock non-CSE courses from database. Only authentic CSE courses are retained.", nonCseCourses.size());
        }
    }

    /**
     * Reconciles teacher-course mappings in memory using bulk loads so cold boots over cloud SQL
     * do not issue hundreds of sequential round-trip queries.
     */
    private void reconcileTeacherCourseMappings() {
        log.info(">>> Checking and purging demo/fake teacher course offerings...");
        List<Resource> allResources = resourceRepository.findAll();
        List<TeacherCourse> allMappings = teacherCourseRepository.findAll();

        Set<String> approvedCourseTeacherKeys = new HashSet<>();
        for (Resource r : allResources) {
            if (r.getStatus() == ResourceStatus.APPROVED
                    && r.getCourse() != null && r.getCourse().getCode() != null
                    && r.getTeacher() != null && r.getTeacher().getId() != null) {
                approvedCourseTeacherKeys.add(
                        r.getCourse().getCode().toUpperCase(Locale.ROOT) + ":" + r.getTeacher().getId()
                );
            }
        }

        List<TeacherCourse> toPurge = new ArrayList<>();
        Map<String, TeacherCourse> activeMappingsByIds = new HashMap<>();
        for (TeacherCourse tc : allMappings) {
            if (tc.getCourse() == null || tc.getTeacher() == null || tc.getCourse().getCode() == null) {
                toPurge.add(tc);
                continue;
            }
            String approvedKey = tc.getCourse().getCode().toUpperCase(Locale.ROOT) + ":" + tc.getTeacher().getId();
            if (!approvedCourseTeacherKeys.contains(approvedKey)) {
                toPurge.add(tc);
            } else {
                String idKey = tc.getCourse().getId() + ":" + tc.getTeacher().getId();
                activeMappingsByIds.putIfAbsent(idKey, tc);
            }
        }

        if (!toPurge.isEmpty()) {
            teacherCourseRepository.deleteAll(toPurge);
            log.info(">>> Successfully purged {} demo teacher course mappings from database.", toPurge.size());
        }

        List<TeacherCourse> toSave = new ArrayList<>();
        int added = 0;
        for (Resource r : allResources) {
            if (r.getTeacher() != null && r.getCourse() != null
                    && r.getTeacher().getId() != null && r.getCourse().getId() != null) {
                String idKey = r.getCourse().getId() + ":" + r.getTeacher().getId();
                TeacherCourse existing = activeMappingsByIds.get(idKey);
                if (existing == null) {
                    TeacherCourse tc = new TeacherCourse(r.getTeacher(), r.getCourse(), "General", "ADMIN_ASSIGNED");
                    activeMappingsByIds.put(idKey, tc);
                    toSave.add(tc);
                    added++;
                } else if (!"ADMIN_ASSIGNED".equalsIgnoreCase(existing.getScheduleInfo())) {
                    existing.setScheduleInfo("ADMIN_ASSIGNED");
                    toSave.add(existing);
                }
            }
        }
        if (!toSave.isEmpty()) {
            teacherCourseRepository.saveAll(toSave);
        }
        if (added > 0) {
            log.info(">>> Auto-registered {} teacher-course mappings from existing academic materials.", added);
        }
    }

    private void ensureAllTeachersHaveInitials() {
        List<Teacher> teachers = teacherRepository.findAll();
        List<Teacher> updatedTeachers = new ArrayList<>();
        for (Teacher t : teachers) {
            if (t.getInitial() == null || t.getInitial().trim().isEmpty() || t.getInitial().equalsIgnoreCase("N/A")) {
                String genInit = generateFallbackInitials(t.getName());
                if (genInit != null) {
                    t.setInitial(genInit);
                    updatedTeachers.add(t);
                }
            }
        }
        if (!updatedTeachers.isEmpty()) {
            teacherRepository.saveAll(updatedTeachers);
        }
    }

    private String generateFallbackInitials(String name) {
        if (name == null || name.trim().isEmpty()) return "FAC";
        String clean = name.replaceAll("(?i)\\b(Prof\\.?|Professor|Dr\\.?|Doctor|Engr\\.?|Md\\.?|Mohammad|Muhammad|Mrs\\.?|Mr\\.?|Ms\\.?)\\b", "").trim();
        String[] parts = clean.split("[\\s.-]+");
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (!p.isEmpty() && Character.isLetter(p.charAt(0))) {
                sb.append(Character.toUpperCase(p.charAt(0)));
            }
        }
        String res = sb.toString();
        return res.length() >= 2 ? res : (name.length() >= 3 ? name.substring(0, 3).toUpperCase() : "FAC");
    }
}
