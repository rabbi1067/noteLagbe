package com.notelagbe.demo;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.notelagbe.entity.*;
import com.notelagbe.repository.NoticeRepository;
import com.notelagbe.repository.ActivityLogRepository;
import com.notelagbe.entity.ActivityLog;
import com.notelagbe.repository.*;
import com.notelagbe.service.SeuFacultySyncService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@ConditionalOnProperty(name = "app.demo.enabled", havingValue = "true", matchIfMissing = false)
public class DemoDataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final UserRepository userRepository;
    private final TeacherRepository teacherRepository;
    private final CourseRepository courseRepository;
    private final TeacherCourseRepository teacherCourseRepository;
    private final ResourceRepository resourceRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PaymentRequestRepository paymentRequestRepository;
    private final UnlockedCourseRepository unlockedCourseRepository;
    private final ReviewRepository reviewRepository;
    private final NoticeRepository noticeRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;
    private final SeuFacultySyncService seuFacultySyncService;
    private final ActivityLogRepository activityLogRepository;
    private final CacheManager cacheManager;

    public DemoDataSeeder(UserRepository userRepository,
                          TeacherRepository teacherRepository,
                          CourseRepository courseRepository,
                          TeacherCourseRepository teacherCourseRepository,
                          ResourceRepository resourceRepository,
                          SubscriptionRepository subscriptionRepository,
                          PaymentRequestRepository paymentRequestRepository,
                          UnlockedCourseRepository unlockedCourseRepository,
                          ReviewRepository reviewRepository,
                          NoticeRepository noticeRepository,
                          ChatMessageRepository chatMessageRepository,
                          NotificationRepository notificationRepository,
                          PasswordEncoder passwordEncoder,
                          ObjectMapper objectMapper,
                          SeuFacultySyncService seuFacultySyncService,
                          ActivityLogRepository activityLogRepository,
                          CacheManager cacheManager) {
        this.userRepository = userRepository;
        this.teacherRepository = teacherRepository;
        this.courseRepository = courseRepository;
        this.teacherCourseRepository = teacherCourseRepository;
        this.resourceRepository = resourceRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.paymentRequestRepository = paymentRequestRepository;
        this.unlockedCourseRepository = unlockedCourseRepository;
        this.reviewRepository = reviewRepository;
        this.noticeRepository = noticeRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.notificationRepository = notificationRepository;
        this.passwordEncoder = passwordEncoder;
        this.objectMapper = objectMapper;
        this.seuFacultySyncService = seuFacultySyncService;
        this.activityLogRepository = activityLogRepository;
        this.cacheManager = cacheManager;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        log.info(">>> Initializing NoteLagbe Isolated Demo Data...");

        seedUsers();
        seedCourses();
        seedTeachers();
        syncTeachersFromRateMyFaculty();
        seuFacultySyncService.syncCseFaculties();
        // No demo teacher course mappings seeded
        ensureAllTeachersHaveInitials();
        seedSampleResources();
        seedSampleReviews();
        seedSamplePaymentRequests();
        seedSampleNotices();
        // Clean production: Do not seed mock chat messages
        // seedSampleChatMessages();
        // Clear all demo activity logs so the audit log starts clean and 100% authentic
        activityLogRepository.deleteAll();

        // Evict any premature empty-cache entries that might have occurred during bootstrap
        if (cacheManager != null) {
            for (String cacheName : cacheManager.getCacheNames()) {
                var c = cacheManager.getCache(cacheName);
                if (c != null) c.clear();
            }
            log.info("Cleared all Spring caches after demo data seeding.");
        }

        log.info(">>> NoteLagbe Demo Data successfully seeded!");
    }

    private void seedUsers() {
        if (!userRepository.existsByEmail("admin@seu.edu.bd")) {
            User admin = new User();
            admin.setName("Super Admin (SEU)");
            admin.setEmail("admin@seu.edu.bd");
            admin.setPassword(passwordEncoder.encode("Admin@Password123!"));
            admin.setRole(Role.ROLE_SUPER_ADMIN);
            admin.setStudentId("SUPER-001");
            userRepository.save(admin);
            log.info("Super Admin created: admin@seu.edu.bd / Admin@Password123!");
        }

        if (!userRepository.existsByEmail("staff.admin@seu.edu.bd")) {
            User staffAdmin = new User();
            staffAdmin.setName("SEU Department Administrator");
            staffAdmin.setEmail("staff.admin@seu.edu.bd");
            staffAdmin.setPassword(passwordEncoder.encode("Admin@Password123!"));
            staffAdmin.setRole(Role.ROLE_ADMIN);
            staffAdmin.setStudentId("ADM-001");
            userRepository.save(staffAdmin);
            log.info("Administrator created: staff.admin@seu.edu.bd / Admin@Password123!");
        }

        if (!userRepository.existsByEmail("manager@seu.edu.bd")) {
            User manager = new User();
            manager.setName("Exam Moderator");
            manager.setEmail("manager@seu.edu.bd");
            manager.setPassword(passwordEncoder.encode("Manager@Password123!"));
            manager.setRole(Role.ROLE_MANAGER);
            manager.setStudentId("MGR-001");
            userRepository.save(manager);
            log.info("Manager created: manager@seu.edu.bd / Manager@Password123!");
        }

        if (!userRepository.existsByEmail("student@seu.edu.bd")) {
            User student = new User();
            student.setName("Fazle Rabbi");
            student.setEmail("student@seu.edu.bd");
            student.setPassword(passwordEncoder.encode("Student@Password123!"));
            student.setRole(Role.ROLE_STUDENT);
            student.setStudentId("2022100010045");
            userRepository.save(student);

            // Give initial 1-Semester active subscription for testing
            Subscription sub = new Subscription(student, PlanType.SEMESTER_1);
            subscriptionRepository.save(sub);
            seedStudentNotifications(student);
            log.info("Sample Student created: student@seu.edu.bd / Student@Password123! with 1-Semester active plan");
        } else {
            userRepository.findByEmail("student@seu.edu.bd").ifPresent(student -> {
                if (student.getAvatarUrl() == null || student.getAvatarUrl().isEmpty()) {
                    student.setAvatarUrl("https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&auto=format&fit=crop&q=80");
                    userRepository.save(student);
                }
                seedStudentNotifications(student);
            });
        }
    }


    private void seedStudentNotifications(User student) {
        if (notificationRepository.findByUserIdOrderByCreatedAtDesc(student.getId()).isEmpty()) {
            Notification n1 = new Notification(student, "Payment Approved: 1-Semester Plan", "Your bKash payment was approved by Admin. You have 6 course unlocks available!", "PAYMENT_APPROVED", "/courses");
            Notification n2 = new Notification(student, "SEU Academic Calendar 2026 Synchronized", "Official SEU Academic Calendar for Spring, Summer and Fall 2026 is now live with PDF/PNG downloads.", "CALENDAR", "/tools#calendar");
            Notification n3 = new Notification(student, "New Notes Uploaded: CSE241 Algorithms", "Handwritten lecture notes and solved mid-term questions are now available.", "COURSE_UPDATE", "/courses/CSE241");
            notificationRepository.saveAll(List.of(n1, n2, n3));
            log.info("Sample notifications seeded for student@seu.edu.bd");
        }
    }

    private void seedCourses() {
        if (courseRepository.count() > 0) return;

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

                        // All user-provided curriculum data belongs strictly to the CSE Department.
                        // Other departments are marked "Coming Soon".
                        String dept = (String) cMap.get("department");
                        if (dept == null || dept.trim().isEmpty()) {
                            dept = "CSE";
                        }
                        c.setDepartment(dept);
                        courseRepository.save(c);
                    }
                    log.info("Seeded {} courses for CSE Department from curriculum JSON.", courseList.size());
                }
            }
        } catch (Exception e) {
            log.error("Failed to load courses_curriculum.json", e);
        }
    }

    private void seedTeachers() {
        if (teacherRepository.count() > 0) return;

        loadTeachersFromJson("data/full_time_faculty.json", FacultyCategory.FULL_TIME_FACULTY);
        loadTeachersFromJson("data/adjunct_faculty.json", FacultyCategory.ADJUNCT_FACULTY);
        loadTeachersFromJson("data/officers_staff.json", FacultyCategory.OFFICERS_AND_STAFF);

        // Ensure popular teachers referenced by users are present
        ensureTeacher("Md. Shakib Hasan", "MSH", "Senior Lecturer", FacultyCategory.FULL_TIME_FACULTY, "Room 528", "shakib.hasan@seu.edu.bd");
        ensureTeacher("Belal Ahmed", "BA", "Assistant Professor", FacultyCategory.FULL_TIME_FACULTY, "Room 529", "belal.ahmed@seu.edu.bd");
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
                int updatedCount = 0;
                int addedCount = 0;

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
                    } else {
                        List<Teacher> bySub = teacherRepository.findByNameContainingIgnoreCase(name);
                        if (!bySub.isEmpty()) {
                            t = bySub.get(0);
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
                            t = teacherRepository.save(t);
                            updatedCount++;
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
                        t = teacherRepository.save(t);
                        addedCount++;
                    }

                    // No demo coursesTaught mapped: only authentic admin or material assignments
                }
                log.info("Synced SEU RateMyFaculty teachers: {} updated with initials, {} newly added.", updatedCount, addedCount);
            }
        } catch (Exception e) {
            log.error("Failed to sync teachers from RateMyFaculty json", e);
        }
    }

    private void loadTeachersFromJson(String relativePath, FacultyCategory defaultCat) {
        try {
            ClassPathResource res = new ClassPathResource(relativePath);
            if (!res.exists()) return;

            try (InputStream is = res.getInputStream()) {
                List<Map<String, Object>> teacherList = objectMapper.readValue(is, new TypeReference<>() {});
                for (Map<String, Object> tMap : teacherList) {
                    Teacher t = new Teacher();
                    t.setName((String) tMap.get("name"));
                    t.setInitial((String) tMap.get("initial"));
                    t.setDesignation((String) tMap.getOrDefault("designation", "Faculty Member"));
                    t.setRoom((String) tMap.getOrDefault("room", "N/A"));
                    t.setPhone((String) tMap.getOrDefault("phone", "N/A"));
                    t.setExt((String) tMap.getOrDefault("ext", "N/A"));
                    t.setEmail((String) tMap.getOrDefault("email", "N/A"));
                    String img = (String) tMap.get("image");
                    if (img != null) {
                        if (img.contains("avatar_blue.png")) {
                            img = "https://cse.seu.edu.bd/assets/images/users/avatar_blue.png";
                        } else if (img.startsWith("./Southeast University")) {
                            img = img.replaceAll("^\\./Southeast University\\d+_files/", "https://ums-local.seu.edu.bd/file-server/v/2.0.0/profile-picture/");
                        }
                    }
                    t.setImage(img);
                    t.setCategory(defaultCat);
                    teacherRepository.save(t);
                }
                log.info("Seeded {} teachers from {}", teacherList.size(), relativePath);
            }
        } catch (Exception e) {
            log.error("Failed to load teacher json: " + relativePath, e);
        }
    }

    private void ensureAllTeachersHaveInitials() {
        List<Teacher> teachers = teacherRepository.findAll();
        int updated = 0;
        for (Teacher t : teachers) {
            if (t.getInitial() == null || t.getInitial().trim().isEmpty()) {
                String initial = deriveAcademicInitial(t.getName());
                t.setInitial(initial);
                teacherRepository.save(t);
                updated++;
            }
        }
        log.info("Enforced academic initials for {} teachers who had missing initials.", updated);
    }

    private String deriveAcademicInitial(String name) {
        if (name == null || name.trim().isEmpty()) return "FAC";
        String lower = name.toLowerCase().trim();
        if (lower.contains("yusuf mahbubul islam")) return "YMI";
        if (lower.contains("shaheena sultana")) return "SS";
        if (lower.contains("mou mahmood")) return "MM";
        if (lower.contains("mohi uddin")) return "KMU";
        if (lower.contains("ashiqur rahman")) return "MAR";
        if (lower.contains("khairul alam")) return "MKA";
        if (lower.contains("rajon bardhan")) return "RB";
        if (lower.contains("yeaseen arafat")) return "YA";
        if (lower.contains("tanjina oriana")) return "TO";
        if (lower.contains("khalid ovi")) return "MKO";

        // Clean honorifics
        String cleaned = name.replaceAll("(?i)\\b(prof|professor|dr|engr|phd|director|dean|iqac|ccs|chairman|mr|ms|mrs|mst)\\b\\.?", "");
        cleaned = cleaned.replaceAll("[,\\(\\)\\.]", " ").trim();
        String[] parts = cleaned.split("\\s+");
        if (parts.length == 0 || parts[0].isEmpty()) return "FAC";
        if (parts.length == 1) return parts[0].substring(0, Math.min(3, parts[0].length())).toUpperCase();
        if (parts.length == 2) return ("" + parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
        if (parts.length == 3) return ("" + parts[0].charAt(0) + parts[1].charAt(0) + parts[2].charAt(0)).toUpperCase();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < Math.min(4, parts.length); i++) {
            if (!parts[i].isEmpty()) sb.append(parts[i].charAt(0));
        }
        return sb.toString().toUpperCase();
    }

    private void seedTeacherCourseMappings() {
        try {
            ClassPathResource res = new ClassPathResource("data/teacher_course_offerings.json");
            if (!res.exists()) return;

            try (InputStream is = res.getInputStream()) {
                List<Map<String, Object>> offerings = objectMapper.readValue(is, new TypeReference<>() {});
                for (Map<String, Object> off : offerings) {
                    String rawCode = (String) off.get("rawCode");
                    String courseCode = (String) off.get("courseCode");
                    String teacherName = (String) off.get("teacherName");
                    String initial = (String) off.get("teacherInitial");

                    if (courseCode == null || courseCode.equalsIgnoreCase("Code") || teacherName == null) {
                        continue;
                    }

                    Optional<Course> courseOpt = courseRepository.findByCodeIgnoreCase(courseCode.trim());
                    if (courseOpt.isEmpty()) continue;

                    Course course = courseOpt.get();

                    List<Teacher> teachers = teacherRepository.findByNameContainingIgnoreCaseOrInitialContainingIgnoreCase(teacherName, initial != null ? initial : "");
                    Teacher teacher;
                    if (!teachers.isEmpty()) {
                        teacher = teachers.get(0);
                        if (teacher.getInitial() == null && initial != null) {
                            teacher.setInitial(initial);
                            teacherRepository.save(teacher);
                        }
                    } else {
                        teacher = new Teacher();
                        teacher.setName(teacherName);
                        teacher.setInitial(initial);
                        teacher.setDesignation("Faculty Member");
                        teacher.setCategory(FacultyCategory.FULL_TIME_FACULTY);
                        teacher = teacherRepository.save(teacher);
                    }

                    if (!teacherCourseRepository.existsByCourseIdAndTeacherId(course.getId(), teacher.getId())) {
                        TeacherCourse tc = new TeacherCourse();
                        tc.setCourse(course);
                        tc.setTeacher(teacher);
                        tc.setSection(rawCode);
                        teacherCourseRepository.save(tc);
                    }
                }
                log.info("Seeded UMS teacher course mappings.");
            }
        } catch (Exception e) {
            log.error("Failed to load teacher_course_offerings.json", e);
        }

        // No demo teacher-course mappings seeded. Only authentic admin or material assignments.
    }

    private Course findBestMatchingCourse(String rawTitle) {
        if (rawTitle == null || rawTitle.trim().isEmpty()) return null;
        String title = rawTitle.trim();

        Optional<Course> byCode = courseRepository.findByCodeIgnoreCase(title);
        if (byCode.isPresent()) return byCode.get();

        Optional<Course> byExactTitle = courseRepository.findByTitleIgnoreCase(title);
        if (byExactTitle.isPresent()) return byExactTitle.get();

        Map<String, String> aliases = Map.ofEntries(
            Map.entry("Algorithm", "CSE265"),
            Map.entry("Algorithms", "CSE265"),
            Map.entry("Algorithm Lab", "CSE266"),
            Map.entry("Algorithms Lab", "CSE266"),
            Map.entry("Data Structures", "CSE241"),
            Map.entry("Data Structures Lab", "CSE242"),
            Map.entry("Discrete Mathematics", "CSE181"),
            Map.entry("Structured Programming", "CSE161"),
            Map.entry("Programming Language I", "CSE161"),
            Map.entry("Programming Language I (C)", "CSE161"),
            Map.entry("Programming Language I Lab", "CSE162"),
            Map.entry("Object Oriented Programming", "CSE281"),
            Map.entry("Object Oriented Programming Lab", "CSE282"),
            Map.entry("Digital Logic Design", "CSE221"),
            Map.entry("Digital Logic Design Lab", "CSE222"),
            Map.entry("Operating Systems", "CSE345"),
            Map.entry("Operating Systems Lab", "CSE346"),
            Map.entry("Advanced Networking", "CSE347"),
            Map.entry("Advanced Networking Lab", "CSE348"),
            Map.entry("Artificial Intelligence", "CSE463"),
            Map.entry("Computer Graphics & Animation", "CSE443"),
            Map.entry("Web and Internet Programming", "CSE471"),
            Map.entry("Web and Internet Programming Lab", "CSE472"),
            Map.entry("Microprocessor Design & Assembly Language Programming", "CSE325"),
            Map.entry("Database Management Systems", "CSE341"),
            Map.entry("Database Management Systems Lab", "CSE342"),
            Map.entry("Image Processing", "CSE355"),
            Map.entry("Machine Learning", "CSE475"),
            Map.entry("Software Engineering", "CSE363"),
            Map.entry("Linear Algebra and Matrices", "MAT241"),
            Map.entry("Differential & Integral Calculus", "MAT141"),
            Map.entry("Statistical Methods & Probability", "STA281"),
            Map.entry("Complex Variables and Transforms (Laplace & Fourier)", "MAT261"),
            Map.entry("Physics I", "PHY161"),
            Map.entry("Physics II", "PHY261"),
            Map.entry("Basic English Skills", "ENG101"),
            Map.entry("Advanced English Skills", "ENG102")
        );

        for (Map.Entry<String, String> entry : aliases.entrySet()) {
            if (title.equalsIgnoreCase(entry.getKey())) {
                return courseRepository.findByCodeIgnoreCase(entry.getValue()).orElse(null);
            }
        }

        List<Course> bySub = courseRepository.findByTitleContainingIgnoreCase(title);
        if (!bySub.isEmpty()) {
            return bySub.get(0);
        }

        return null;
    }

    private void mapTeacherToCourse(String courseCode, String teacherName, String initial, String section, String sched) {
        courseRepository.findByCodeIgnoreCase(courseCode).ifPresent(course -> {
            List<Teacher> teachers = teacherRepository.findByNameContainingIgnoreCaseOrInitialContainingIgnoreCase(teacherName, initial);
            Teacher teacher = !teachers.isEmpty() ? teachers.get(0) : null;
            if (teacher != null && !teacherCourseRepository.existsByCourseIdAndTeacherId(course.getId(), teacher.getId())) {
                TeacherCourse tc = new TeacherCourse(teacher, course, section, sched);
                teacherCourseRepository.save(tc);
            }
        });
    }

    private void seedSampleResources() {
        resourceRepository.deleteAll(); // Refresh with clean standard university exam & notes archive
        User admin = userRepository.findByEmail("admin@seu.edu.bd").orElse(null);

        // ==========================================
        // CSE347 (Advanced Networking)
        // ==========================================
        // Md. Shakib Hasan (MSH)
        addSampleResource("CSE347", "Md. Shakib Hasan", "Hand Notes - Routing Protocols, Subnetting & OSPF", ResourceType.NOTE, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&auto=format&fit=crop&q=80", "Fall 2026", 2026, admin);
        addSampleResource("CSE347", "Md. Shakib Hasan", "Midterm Examination - Fall 2026", ResourceType.MID_QUESTION, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80", "Fall 2026", 2026, admin);
        addSampleResource("CSE347", "Md. Shakib Hasan", "Midterm Examination - Spring 2025", ResourceType.MID_QUESTION, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80", "Spring 2025", 2025, admin);
        addSampleResource("CSE347", "Md. Shakib Hasan", "Midterm Examination - Summer 2024", ResourceType.MID_QUESTION, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80", "Summer 2024", 2024, admin);
        addSampleResource("CSE347", "Md. Shakib Hasan", "Final Examination - Spring 2025", ResourceType.FINAL_QUESTION, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80", "Spring 2025", 2025, admin);
        addSampleResource("CSE347", "Md. Shakib Hasan", "Final Examination - Fall 2024", ResourceType.FINAL_QUESTION, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80", "Fall 2024", 2024, admin);

        // Anik Mahmud Shanto (AMS)
        addSampleResource("CSE347", "Anik Mahmud Shanto", "Hand Notes - TCP/IP Congestion & SDN Architecture", ResourceType.NOTE, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80", "Fall 2026", 2026, admin);
        addSampleResource("CSE347", "Anik Mahmud Shanto", "Midterm Examination - Fall 2026", ResourceType.MID_QUESTION, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80", "Fall 2026", 2026, admin);
        addSampleResource("CSE347", "Anik Mahmud Shanto", "Midterm Examination - Spring 2025", ResourceType.MID_QUESTION, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80", "Spring 2025", 2025, admin);
        addSampleResource("CSE347", "Anik Mahmud Shanto", "Final Examination - Spring 2025", ResourceType.FINAL_QUESTION, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80", "Spring 2025", 2025, admin);

        // Sakib Mahmud (SMA)
        addSampleResource("CSE347", "Sakib Mahmud", "Hand Notes - Routing Architectures & Subnet Design", ResourceType.NOTE, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&auto=format&fit=crop&q=80", "Fall 2026", 2026, admin);
        addSampleResource("CSE347", "Sakib Mahmud", "Midterm Examination - Fall 2026", ResourceType.MID_QUESTION, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80", "Fall 2026", 2026, admin);
        addSampleResource("CSE347", "Sakib Mahmud", "Final Examination - Spring 2025", ResourceType.FINAL_QUESTION, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80", "Spring 2025", 2025, admin);

        // ==========================================
        // CSE348 (Advanced Networking Lab)
        // Includes: Lab Manuals, Lab Hand Notes, Lab Reports, Lab Quizzes, Lab Finals
        // ==========================================
        // 1. Lab Manuals & Practical Experiments
        addSampleResource("CSE348", "Anik Mahmud Shanto", "Lab Manual - Cisco Packet Tracer & Network Tasks", ResourceType.LAB_MANUAL, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80", "Fall 2026", 2026, admin);
        addSampleResource("CSE348", "Anik Mahmud Shanto", "Lab Manual - Router & Switch Configuration Tasks", ResourceType.LAB_MANUAL, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80", "Fall 2026", 2026, admin);
        addSampleResource("CSE348", "Md. Shakib Hasan", "Practical Experiments - VLAN, Trunking & NAT Lab Setup", ResourceType.LAB_MANUAL, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&auto=format&fit=crop&q=80", "Spring 2025", 2025, admin);

        // 2. Lab Hand Notes
        addSampleResource("CSE348", "Anik Mahmud Shanto", "Lab Hand Notes - Cisco IOS CLI Commands & Syntax", ResourceType.LAB_HAND_NOTE, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80", "Fall 2026", 2026, admin);
        addSampleResource("CSE348", "Md. Shakib Hasan", "Lab Hand Notes - Subnetting Cheatsheet & Topology Design", ResourceType.LAB_HAND_NOTE, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600&auto=format&fit=crop&q=80", "Spring 2025", 2025, admin);

        // 3. Lab Reports
        addSampleResource("CSE348", "Anik Mahmud Shanto", "Lab Report - Experiments 1 to 8 Cisco Packet Tracer Solutions", ResourceType.LAB_REPORT, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80", "Fall 2026", 2026, admin);
        addSampleResource("CSE348", "Md. Shakib Hasan", "Sample Lab Report - Standard Format & Network Simulation", ResourceType.LAB_REPORT, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80", "Spring 2025", 2025, admin);

        // 4. Lab Quiz
        addSampleResource("CSE348", "Anik Mahmud Shanto", "Lab Quiz 1 & 2 - Subnetting, VLSM & Routing Questions", ResourceType.LAB_QUIZ, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80", "Fall 2026", 2026, admin);
        addSampleResource("CSE348", "Md. Shakib Hasan", "Online Lab Quiz - OSPF & BGP CLI Configuration Test", ResourceType.LAB_QUIZ, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80", "Spring 2025", 2025, admin);

        // 5. Lab Final
        addSampleResource("CSE348", "Anik Mahmud Shanto", "Lab Final Examination - Troubleshooting Topology & Viva Sheet", ResourceType.LAB_FINAL, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80", "Fall 2026", 2026, admin);
        addSampleResource("CSE348", "Md. Shakib Hasan", "Lab Final Examination - Hands-on Topology Problem Set", ResourceType.LAB_FINAL, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80", "Spring 2025", 2025, admin);

        // ==========================================
        // CSE241 (Data Structures)
        // ==========================================
        // Md. Shakib Hasan (MSH)
        addSampleResource("CSE241", "Md. Shakib Hasan", "Hand Notes - Trees, Graphs, AVL & Sorting Algorithms", ResourceType.NOTE, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80", "Fall 2026", 2026, admin);
        addSampleResource("CSE241", "Md. Shakib Hasan", "Midterm Examination - Fall 2026", ResourceType.MID_QUESTION, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80", "Fall 2026", 2026, admin);
        addSampleResource("CSE241", "Md. Shakib Hasan", "Midterm Examination - Spring 2025", ResourceType.MID_QUESTION, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80", "Spring 2025", 2025, admin);
        addSampleResource("CSE241", "Md. Shakib Hasan", "Final Examination - Spring 2025", ResourceType.FINAL_QUESTION, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop&q=80", "Spring 2025", 2025, admin);

        // Belal Ahmed (BA)
        addSampleResource("CSE241", "Belal Ahmed", "Hand Notes - Graph Traversal, Dijkstra & Dynamic Programming", ResourceType.NOTE, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80", "Spring 2025", 2025, admin);
        addSampleResource("CSE241", "Belal Ahmed", "Midterm Examination - Fall 2026", ResourceType.MID_QUESTION, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80", "Fall 2026", 2026, admin);
        addSampleResource("CSE241", "Belal Ahmed", "Final Examination - Spring 2025", ResourceType.FINAL_QUESTION, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop&q=80", "Spring 2025", 2025, admin);
        addSampleResource("CSE241", "Belal Ahmed", "Final Examination - Summer 2024", ResourceType.FINAL_QUESTION, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&auto=format&fit=crop&q=80", "Summer 2024", 2024, admin);

        // Sakib Mahmud (SMA)
        addSampleResource("CSE241", "Sakib Mahmud", "Hand Notes - Binary Trees, Heaps & Recursion", ResourceType.NOTE, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80", "Fall 2026", 2026, admin);
        addSampleResource("CSE241", "Sakib Mahmud", "Midterm Examination - Spring 2026", ResourceType.MID_QUESTION, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format&fit=crop&q=80", "Spring 2026", 2026, admin);

        // ==========================================
        // CSE242 (Data Structures Lab)
        // Includes: Lab Manuals, Lab Hand Notes, Lab Reports, Lab Quizzes, Lab Finals
        // ==========================================
        addSampleResource("CSE242", "Md. Shakib Hasan", "Lab Manual - Binary Tree, Linked List & Queue Tasks", ResourceType.LAB_MANUAL, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80", "Fall 2026", 2026, admin);
        addSampleResource("CSE242", "Md. Shakib Hasan", "Lab Hand Notes - C++ STL Vectors, Lists & Maps Guide", ResourceType.LAB_HAND_NOTE, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80", "Fall 2026", 2026, admin);
        addSampleResource("CSE242", "Md. Shakib Hasan", "Lab Report - Complete Experiment Solutions 1 to 10", ResourceType.LAB_REPORT, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80", "Fall 2026", 2026, admin);
        addSampleResource("CSE242", "Belal Ahmed", "Lab Quiz - Pointer Arithmetic & Tree Traversal Quiz Sheet", ResourceType.LAB_QUIZ, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80", "Spring 2025", 2025, admin);
        addSampleResource("CSE242", "Belal Ahmed", "Lab Final Examination Coding Problems & Solutions", ResourceType.LAB_FINAL, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80", "Spring 2025", 2025, admin);

        // ==========================================
        // CSE141 (Computer Fundamentals)
        // ==========================================
        addSampleResource("CSE141", "Mst. Jesiara Khatun", "Hand Notes - Computer Architecture & Number Systems", ResourceType.NOTE, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80", "Fall 2026", 2026, admin);
        addSampleResource("CSE141", "Mst. Jesiara Khatun", "Midterm Examination - Fall 2026", ResourceType.MID_QUESTION, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&auto=format&fit=crop&q=80", "Fall 2026", 2026, admin);
        addSampleResource("CSE141", "Mst. Jesiara Khatun", "Midterm Examination - Spring 2025", ResourceType.MID_QUESTION, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&auto=format&fit=crop&q=80", "Spring 2025", 2025, admin);
        addSampleResource("CSE141", "Mst. Jesiara Khatun", "Final Examination - Spring 2025", ResourceType.FINAL_QUESTION, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&auto=format&fit=crop&q=80", "Spring 2025", 2025, admin);

        // ==========================================
        // CSE161 (Programming Language I - C)
        // ==========================================
        addSampleResource("CSE161", "Shahriar Manzoor", "Hand Notes - Pointers, Recursion & Dynamic Memory", ResourceType.NOTE, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600&auto=format&fit=crop&q=80", "Spring 2026", 2026, admin);
        addSampleResource("CSE161", "Shahriar Manzoor", "Midterm Examination - Spring 2026", ResourceType.MID_QUESTION, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80", "Spring 2026", 2026, admin);
        addSampleResource("CSE161", "Shahriar Manzoor", "Final Examination - Fall 2025", ResourceType.FINAL_QUESTION, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80", "Fall 2025", 2025, admin);
        addSampleResource("CSE161", "Shahriar Manzoor", "Class Test & Quiz 1 - Control Flow & Functions", ResourceType.QUIZ_CT, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80", "Spring 2026", 2026, admin);
        addSampleResource("CSE161", "Shahriar Manzoor", "Structured Programming in C Summary Notes (.DOCX)", ResourceType.DOC_NOTE, "https://filesamples.com/samples/document/docx/sample1.docx", "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&auto=format&fit=crop&q=80", "Spring 2026", 2026, admin);

        // ==========================================
        // CSE162 (Programming Language I Lab)
        // ==========================================
        addSampleResource("CSE162", "Shahriar Manzoor", "Lab Hand Notes - Dynamic Memory, Structs & File I/O", ResourceType.LAB_HAND_NOTE, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600&auto=format&fit=crop&q=80", "Spring 2026", 2026, admin);
        addSampleResource("CSE162", "Shahriar Manzoor", "Lab Quiz 1 - Syntax Debugging & Algorithm Tracing", ResourceType.LAB_QUIZ, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80", "Spring 2026", 2026, admin);
        addSampleResource("CSE162", "Shahriar Manzoor", "Lab Final Exam Problem Set & Viva Preparation", ResourceType.LAB_FINAL, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80", "Spring 2026", 2026, admin);
        addSampleResource("CSE162", "Shahriar Manzoor", "Student Attendance & Record System in C (GitHub Source Code)", ResourceType.PROJECT_LINK, "https://github.com/notelagbe/student-record-system-c", "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80", "Spring 2026", 2026, admin);
        addSampleResource("CSE162", "Shahriar Manzoor", "Lab Experiment Documentation & Template (.DOCX)", ResourceType.DOC_NOTE, "https://filesamples.com/samples/document/docx/sample1.docx", "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&auto=format&fit=crop&q=80", "Spring 2026", 2026, admin);

        // ==========================================
        // CSE355 (Image Processing)
        // ==========================================
        addSampleResource("CSE355", "Mahbub Hasan", "Hand Notes - Spatial Filtering & Image Transformation", ResourceType.NOTE, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop&q=80", "Fall 2026", 2026, admin);
        addSampleResource("CSE355", "Mst. Jesiara Khatun", "Midterm Examination - Summer 2025", ResourceType.MID_QUESTION, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80", "Summer 2025", 2025, admin);
        addSampleResource("CSE355", "Mahbub Hasan", "Final Examination - Fall 2024", ResourceType.FINAL_QUESTION, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80", "Fall 2024", 2024, admin);
        addSampleResource("CSE355", "Mahbub Hasan", "Lecture Slides - MATLAB Image Filtering & Morphological Operations", ResourceType.NOTE, "https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf", "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80", "Fall 2026", 2026, admin);

        log.info("Sample notes, course-ins, and exam papers seeded successfully.");
    }

    private void addSampleResource(String courseCode, String teacherName, String title, ResourceType type, String fileUrl, String previewUrl, String semester, int year, User uploader) {
        courseRepository.findByCodeIgnoreCase(courseCode).ifPresent(c -> {
            boolean exists = resourceRepository.findByCourseIdAndStatus(c.getId(), ResourceStatus.APPROVED).stream()
                    .anyMatch(r -> r.getTitle().equalsIgnoreCase(title) && 
                                   r.getSemesterName().equalsIgnoreCase(semester) &&
                                   r.getTeacher() != null &&
                                   teacherName != null &&
                                   r.getTeacher().getName().toLowerCase().contains(teacherName.toLowerCase()));
            if (exists) return;

            Resource r = new Resource();
            r.setTitle(title);
            r.setType(type);
            r.setFileUrl(fileUrl);
            r.setPreviewUrl(previewUrl);
            r.setSemesterName(semester);
            r.setAcademicYear(year);
            r.setCourse(c);
            r.setUploader(uploader);
            r.setStatus(ResourceStatus.APPROVED);
            r.setDownloadsCount(42);

            if (teacherName != null) {
                List<Teacher> teachers = teacherRepository.findByNameContainingIgnoreCaseOrInitialContainingIgnoreCase(teacherName, teacherName);
                if (!teachers.isEmpty()) {
                    r.setTeacher(teachers.get(0));
                }
            }

            resourceRepository.save(r);
        });
    }

    private void seedSampleReviews() {
        if (reviewRepository.count() > 0) return;

        User student = userRepository.findByEmail("student@seu.edu.bd").orElse(null);
        if (student == null) return;

        courseRepository.findByCodeIgnoreCase("CSE241").ifPresent(c -> {
            Review rev = new Review();
            rev.setUser(student);
            rev.setCourse(c);
            rev.setRating(5);
            rev.setComment("The course notes and exam question bank made tree and graph algorithms crystal clear before the exam! Highly recommended.");
            rev.setPersonality("Mid Degree (Sem 4-6)");
            rev.setMarking("Moderate / Balanced");
            rev.setDifficulty("Medium");
            rev.setStatus(com.notelagbe.entity.ReviewStatus.APPROVED);
            rev.setAnonymous(false);
            reviewRepository.save(rev);
        });
    }

    private void seedSamplePaymentRequests() {
        if (paymentRequestRepository.count() > 0) return;

        User student = userRepository.findByEmail("student@seu.edu.bd").orElse(null);
        if (student == null) return;

        // Seed diverse users for analytics
        String[][] additionalStudents = {
            {"Tanvir Ahmed", "tanvir.22@seu.edu.bd", "2022100010088", "3"},
            {"Nusrat Jahan", "nusrat.23@seu.edu.bd", "2023100010012", "7"},
            {"Sabbir Hossain", "sabbir.21@seu.edu.bd", "2021100010034", "12"},
            {"Mehedi Hasan", "mehedi.22@seu.edu.bd", "2022200010055", "18"},
            {"Ayesha Siddiqua", "ayesha.23@seu.edu.bd", "2023200010099", "25"},
            {"Rifat Karim", "rifat.24@seu.edu.bd", "2024100010007", "28"}
        };

        List<User> students = new ArrayList<>();
        students.add(student);
        for (String[] s : additionalStudents) {
            if (!userRepository.existsByEmail(s[1])) {
                User u = new User();
                u.setName(s[0]);
                u.setEmail(s[1]);
                u.setPassword(passwordEncoder.encode("Student@Password123!"));
                u.setRole(Role.ROLE_STUDENT);
                u.setStudentId(s[2]);
                int daysAgo = Integer.parseInt(s[3]);
                u.setCreatedAt(LocalDateTime.now().minusDays(daysAgo));
                u = userRepository.save(u);
                students.add(u);
            }
        }

        // Realistic transactions spanning the last 45 days
        Object[][] txMatrix = {
            {0, 0, PlanType.SEMESTER_1, PaymentMethod.BKASH, 99.0, PaymentStatus.APPROVED, "BK7X89Q1A", "01711223344"},
            {1, 1, PlanType.SEMESTER_2, PaymentMethod.NAGAD, 149.0, PaymentStatus.APPROVED, "NG9P4M2K8", "01822334455"},
            {2, 2, PlanType.SEMESTER_1, PaymentMethod.ROCKET, 99.0, PaymentStatus.APPROVED, "RK4W8N3V1", "01933445566"},
            {4, 3, PlanType.YEAR_1_UNLIMITED, PaymentMethod.BKASH, 299.0, PaymentStatus.APPROVED, "BK5J2L9Z0", "01744556677"},
            {6, 4, PlanType.SEMESTER_1, PaymentMethod.BKASH, 99.0, PaymentStatus.APPROVED, "BK3H8T5R2", "01655667788"},
            {8, 5, PlanType.SEMESTER_2, PaymentMethod.NAGAD, 149.0, PaymentStatus.APPROVED, "NG7C1X4B6", "01866778899"},
            {11, 0, PlanType.SEMESTER_1, PaymentMethod.ROCKET, 99.0, PaymentStatus.APPROVED, "RK2M9V7P3", "01977889900"},
            {14, 1, PlanType.SEMESTER_2, PaymentMethod.BKASH, 149.0, PaymentStatus.APPROVED, "BK8Y3D5F1", "01788990011"},
            {18, 2, PlanType.YEAR_1_UNLIMITED, PaymentMethod.BKASH, 299.0, PaymentStatus.APPROVED, "BK1Q6W8E4", "01899001122"},
            {22, 3, PlanType.SEMESTER_1, PaymentMethod.NAGAD, 99.0, PaymentStatus.APPROVED, "NG4R7T2Y9", "01900112233"},
            {26, 4, PlanType.SEMESTER_1, PaymentMethod.BKASH, 99.0, PaymentStatus.APPROVED, "BK9U1I3O5", "01712345670"},
            {30, 5, PlanType.SEMESTER_2, PaymentMethod.ROCKET, 149.0, PaymentStatus.APPROVED, "RK6P8A0S2", "01823456781"},
            {35, 0, PlanType.YEAR_1_UNLIMITED, PaymentMethod.BKASH, 299.0, PaymentStatus.APPROVED, "BK3D5F7G9", "01934567892"},
            {42, 1, PlanType.SEMESTER_1, PaymentMethod.NAGAD, 99.0, PaymentStatus.APPROVED, "NG0H2J4K6", "01745678903"},
            {0, 2, PlanType.SEMESTER_1, PaymentMethod.BKASH, 99.0, PaymentStatus.PENDING, "BK9XPEND01", "01856789014"},
            {1, 3, PlanType.SEMESTER_2, PaymentMethod.NAGAD, 149.0, PaymentStatus.PENDING, "NG8YPEND02", "01967890125"},
            {5, 4, PlanType.SEMESTER_1, PaymentMethod.ROCKET, 99.0, PaymentStatus.REJECTED, "RK7ZREJ001", "01778901236"}
        };

        for (Object[] tx : txMatrix) {
            int daysAgo = (int) tx[0];
            int studentIdx = ((int) tx[1]) % students.size();
            PlanType pt = (PlanType) tx[2];
            PaymentMethod pm = (PaymentMethod) tx[3];
            double amount = (double) tx[4];
            PaymentStatus st = (PaymentStatus) tx[5];
            String trxId = (String) tx[6];
            String phone = (String) tx[7];

            PaymentRequest pr = new PaymentRequest();
            pr.setUser(students.get(studentIdx));
            pr.setPlanType(pt);
            pr.setPaymentMethod(pm);
            pr.setSenderPhone(phone);
            pr.setTransactionId(trxId);
            pr.setAmount(amount);
            pr.setStatus(st);
            pr.setAdminNotes(st == PaymentStatus.APPROVED ? "Auto-verified transaction" : (st == PaymentStatus.REJECTED ? "Invalid TrxID" : "Awaiting review"));
            pr.setCreatedAt(LocalDateTime.now().minusDays(daysAgo).minusHours(daysAgo * 3 % 12));
            if (st != PaymentStatus.PENDING) {
                pr.setReviewedAt(pr.getCreatedAt().plusMinutes(45));
            }
            paymentRequestRepository.save(pr);
        }
        log.info("Seeded 17 realistic payment transactions across last 45 days for enterprise analytics.");
    }

    private void seedSampleNotices() {
        if (noticeRepository.count() > 0) return;

        noticeRepository.save(new Notice(
                "📢 Fall 2026 Midterm & Final examination questions, handwritten lecture notes and solved papers are now live!",
                "ALERT",
                "/courses",
                true,
                10
        ));

        noticeRepository.save(new Notice(
                "💡 Upload your study materials & lecture notes to permanently unlock 2 semester courses for free!",
                "UPDATE",
                "/contribute",
                true,
                5
        ));

        noticeRepository.save(new Notice(
                "⚡ Southeast University CSE Department Lab Manuals & Code Solutions archive updated.",
                "INFO",
                "/courses",
                true,
                1
        ));

        log.info("Sample campus notices seeded successfully.");
    }
    private void seedSampleChatMessages() {
        if (chatMessageRepository.count() > 0) return;

        User admin = userRepository.findByEmail("admin@seu.edu.bd").orElse(null);
        User student = userRepository.findByEmail("student@seu.edu.bd").orElse(null);

        // 1. Pinned 24-hour announcement from Admin
        if (admin != null) {
            ChatMessage pinned = new ChatMessage();
            pinned.setSender(admin);
            pinned.setSenderName("Super Admin (SEU)");
            pinned.setSenderEmail("admin@seu.edu.bd");
            pinned.setSenderRole(Role.ROLE_SUPER_ADMIN);
            pinned.setMessageType("TEXT");
            pinned.setText("📌 Southeast University Fall 2026 Midterm & Final Question Paper Archives and Solved Papers are now fully synced. Access anytime!");
            pinned.setPinned(true);
            pinned.setPinnedAt(LocalDateTime.now().minusHours(2));
            pinned.setPinExpiresAt(LocalDateTime.now().plusHours(22)); // Expires in 22 hrs (total 24h)
            pinned.setLikesCount(12);
            pinned.setCreatedAt(LocalDateTime.now().minusHours(2));
            chatMessageRepository.save(pinned);
        }

        // 2. Realistic student conversations
        ChatMessage m1 = new ChatMessage();
        m1.setSender(student);
        m1.setSenderName("Nihal (SEU)");
        m1.setSenderEmail("nihal@seu.edu.bd");
        m1.setSenderRole(Role.ROLE_STUDENT);
        m1.setMessageType("TEXT");
        m1.setText("acha seu theke ki UIU te credit transfer nibe? minimum CGPA koto lage?");
        m1.setLikesCount(2);
        m1.setCreatedAt(LocalDateTime.now().minusMinutes(25));
        chatMessageRepository.save(m1);

        ChatMessage m2 = new ChatMessage();
        m2.setSender(student);
        m2.setSenderName("Zoro (CSE)");
        m2.setSenderEmail("zoro@seu.edu.bd");
        m2.setSenderRole(Role.ROLE_STUDENT);
        m2.setMessageType("TEXT");
        m2.setText("na bro, SEU CSE curriculum onek standard. Credit transfer e shob match hoy na. SEU tei regular thako!");
        m2.setReplyToId(m1.getId());
        m2.setReplyToSender("Nihal (SEU)");
        m2.setReplyToText("acha seu theke ki UIU te credit transfer nibe? minimum CGPA koto lage?");
        m2.setLikesCount(5);
        m2.setCreatedAt(LocalDateTime.now().minusMinutes(20));
        chatMessageRepository.save(m2);

        ChatMessage m3 = new ChatMessage();
        m3.setSender(student);
        m3.setSenderName("Shanto (Batch 64)");
        m3.setSenderEmail("shanto@seu.edu.bd");
        m3.setSenderRole(Role.ROLE_STUDENT);
        m3.setMessageType("TEXT");
        m3.setText("CSE241 er sir er handwritten lecture notes kar kache ache? Midterm lagbe urgent!");
        m3.setLikesCount(1);
        m3.setCreatedAt(LocalDateTime.now().minusMinutes(12));
        chatMessageRepository.save(m3);

        if (student != null) {
            ChatMessage m4 = new ChatMessage();
            m4.setSender(student);
            m4.setSenderName(student.getName());
            m4.setSenderEmail(student.getEmail());
            m4.setSenderRole(Role.ROLE_STUDENT);
            m4.setMessageType("TEXT");
            m4.setText("NoteLagbe er Courses & Notes tab e check koro, CSE241 er teacher-wise handwritten notes and solved questions upload kora ache! 🔥");
            m4.setReplyToId(m3.getId());
            m4.setReplyToSender("Shanto (Batch 64)");
            m4.setReplyToText("CSE241 er sir er handwritten lecture notes kar kache ache? Midterm lagbe urgent!");
            m4.setLikesCount(7);
            m4.setCreatedAt(LocalDateTime.now().minusMinutes(5));
            chatMessageRepository.save(m4);
        }

        log.info("Sample community chat messages seeded successfully with 24-hr pinned announcement.");
    }

    private void seedActivityLogs() {
        // Demo activity logs removed - logs are strictly authentic live system telemetry
    }

}
