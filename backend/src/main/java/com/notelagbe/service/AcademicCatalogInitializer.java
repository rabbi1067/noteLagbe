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
    @Transactional
    public void run(String... args) {
        log.info(">>> Checking Southeast University Academic Catalog in database...");
        seedCoursesIfEmpty();
        seedTeachersIfEmpty();
        purgeDemoTeacherCourseOfferings();
        syncCoursesFromMaterials();
        ensureAllTeachersHaveInitials();
        ensureSuperAdminUser();
        
        if (cacheManager != null) {
            for (String cacheName : cacheManager.getCacheNames()) {
                var c = cacheManager.getCache(cacheName);
                if (c != null) c.clear();
            }
        }
        log.info(">>> Southeast University Academic Catalog verified in database.");
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
            admin.setRole(Role.ROLE_SUPER_ADMIN);
            admin.setPassword(passwordEncoder.encode(adminPass));
            admin.setEnabled(true);
            userRepository.save(admin);
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

        userRepository.findByEmail("fazlerabbicse65@gmail.com").ifPresent(u -> {
            if (u.getRole() != Role.ROLE_SUPER_ADMIN) {
                u.setRole(Role.ROLE_SUPER_ADMIN);
                userRepository.save(u);
            }
        });
    }

    private void seedCoursesIfEmpty() {
        // Enforce authentic CSE curriculum: Purge any non-CSE dummy courses (e.g. mock BBA, EEE, LAW, PHAR, ENG courses).
        // CSE non-major courses (such as ENG101, EEE181, ACT141, etc.) have department = "CSE" and are strictly kept.
        List<Course> nonCseCourses = courseRepository.findAll().stream()
                .filter(c -> c.getDepartment() != null && !c.getDepartment().trim().equalsIgnoreCase("CSE"))
                .toList();
        if (!nonCseCourses.isEmpty()) {
            for (Course nc : nonCseCourses) {
                var mappings = teacherCourseRepository.findByCourseId(nc.getId());
                if (mappings != null && !mappings.isEmpty()) {
                    teacherCourseRepository.deleteAll(mappings);
                }
                courseRepository.delete(nc);
            }
            log.info("Purged {} mock non-CSE courses from database. Only authentic CSE courses are retained.", nonCseCourses.size());
        }

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

    private void purgeDemoTeacherCourseOfferings() {
        log.info(">>> Checking and purging demo/fake teacher course offerings...");
        List<TeacherCourse> all = teacherCourseRepository.findAll();
        List<TeacherCourse> toPurge = new ArrayList<>();
        for (TeacherCourse tc : all) {
            if (tc.getCourse() == null || tc.getTeacher() == null) {
                toPurge.add(tc);
                continue;
            }
            boolean hasApprovedResource = resourceRepository.existsByCourseCodeIgnoreCaseAndTeacherIdAndStatus(
                    tc.getCourse().getCode(), tc.getTeacher().getId(), ResourceStatus.APPROVED);
            if (!hasApprovedResource) {
                toPurge.add(tc);
            }
        }
        if (!toPurge.isEmpty()) {
            teacherCourseRepository.deleteAll(toPurge);
            log.info(">>> Successfully purged {} demo teacher course mappings from database.", toPurge.size());
        }
    }

    private void syncCoursesFromMaterials() {
        List<Resource> approved = resourceRepository.findAll();
        int added = 0;
        for (Resource r : approved) {
            if (r.getTeacher() != null && r.getCourse() != null) {
                List<TeacherCourse> tcList = teacherCourseRepository.findAllByCourseIdAndTeacherId(r.getCourse().getId(), r.getTeacher().getId());
                if (tcList.isEmpty()) {
                    TeacherCourse tc = new TeacherCourse(r.getTeacher(), r.getCourse(), "General", "ADMIN_ASSIGNED");
                    teacherCourseRepository.save(tc);
                    added++;
                } else {
                    TeacherCourse tc = tcList.get(0);
                    if (!"ADMIN_ASSIGNED".equalsIgnoreCase(tc.getScheduleInfo())) {
                        tc.setScheduleInfo("ADMIN_ASSIGNED");
                        teacherCourseRepository.save(tc);
                    }
                }
            }
        }
        if (added > 0) {
            log.info(">>> Auto-registered {} teacher-course mappings from existing academic materials.", added);
        }
    }

    private void ensureAllTeachersHaveInitials() {
        List<Teacher> teachers = teacherRepository.findAll();
        for (Teacher t : teachers) {
            if (t.getInitial() == null || t.getInitial().trim().isEmpty() || t.getInitial().equalsIgnoreCase("N/A")) {
                String genInit = generateFallbackInitials(t.getName());
                if (genInit != null) {
                    t.setInitial(genInit);
                    teacherRepository.save(t);
                }
            }
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
