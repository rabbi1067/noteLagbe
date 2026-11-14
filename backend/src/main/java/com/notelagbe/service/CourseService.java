package com.notelagbe.service;

import com.notelagbe.dto.CourseSearchResponse;
import com.notelagbe.dto.TeacherBriefDto;
import com.notelagbe.entity.*;
import com.notelagbe.exception.ApiException;
import com.notelagbe.exception.ResourceNotFoundException;
import com.notelagbe.repository.*;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class CourseService {

    private final CourseRepository courseRepository;
    private final TeacherCourseRepository teacherCourseRepository;
    private final TeacherRepository teacherRepository;
    private final ResourceRepository resourceRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final UnlockedCourseRepository unlockedCourseRepository;
    private final SubscriptionService subscriptionService;
    private final LiveSyncService liveSyncService;
    private final ReviewRepository reviewRepository;
    private final UserCourseReviewRepository userCourseReviewRepository;
    private final ContributionRequestRepository contributionRequestRepository;

    public CourseService(CourseRepository courseRepository,
                         TeacherCourseRepository teacherCourseRepository,
                         TeacherRepository teacherRepository,
                         ResourceRepository resourceRepository,
                         SubscriptionRepository subscriptionRepository,
                         UnlockedCourseRepository unlockedCourseRepository,
                         SubscriptionService subscriptionService,
                         LiveSyncService liveSyncService,
                         ReviewRepository reviewRepository,
                         UserCourseReviewRepository userCourseReviewRepository,
                         ContributionRequestRepository contributionRequestRepository) {
        this.courseRepository = courseRepository;
        this.teacherCourseRepository = teacherCourseRepository;
        this.teacherRepository = teacherRepository;
        this.resourceRepository = resourceRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.unlockedCourseRepository = unlockedCourseRepository;
        this.subscriptionService = subscriptionService;
        this.liveSyncService = liveSyncService;
        this.reviewRepository = reviewRepository;
        this.userCourseReviewRepository = userCourseReviewRepository;
        this.contributionRequestRepository = contributionRequestRepository;
    }

    @Cacheable(value = "courses", key = "(#user != null ? #user.id : 0) + '_' + (#query ?: '') + '_' + (#semester ?: '') + '_' + (#electiveGroup ?: '') + '_' + (#department ?: '')", unless = "#result == null || #result.isEmpty()")
    public List<CourseSearchResponse> searchCourses(String query, Integer semester, String electiveGroup, String department, User user) {
        List<Course> courses;

        if (department != null && !department.trim().isEmpty() && !department.equalsIgnoreCase("ALL")) {
            courses = courseRepository.findByDepartmentIgnoreCase(department.trim());
        } else {
            courses = courseRepository.findAll();
        }

        // Sort naturally: CSE courses first, numerically by course number (CSE141, CSE161, CSE181, CSE241...)
        courses = courses.stream().sorted((c1, c2) -> compareCoursesNaturally(c1.getCode(), c2.getCode())).toList();

        if (semester != null) {
            courses = courses.stream().filter(c -> c.getSemester() == semester).toList();
        }

        if (electiveGroup != null && !electiveGroup.trim().isEmpty()) {
            courses = courses.stream()
                    .filter(c -> electiveGroup.equalsIgnoreCase(c.getElectiveGroup()))
                    .toList();
        }

        // Batch pre-fetch all dependencies in bulk queries instead of 340+ sequential queries!
        List<Resource> allApproved = resourceRepository.findByStatusOrderByCreatedAtDesc(ResourceStatus.APPROVED);
        Map<Long, List<Resource>> resourcesByCourseId = allApproved.stream()
                .filter(r -> r.getCourse() != null)
                .collect(Collectors.groupingBy(r -> r.getCourse().getId()));

        List<TeacherCourse> allTeacherCourses = teacherCourseRepository.findAll();
        Map<Long, List<TeacherCourse>> teacherCoursesByCourseId = allTeacherCourses.stream()
                .filter(tc -> tc.getCourse() != null)
                .collect(Collectors.groupingBy(tc -> tc.getCourse().getId()));

        Map<Long, Long> unlockCounts = unlockedCourseRepository.findAll().stream()
                .filter(u -> u.getCourse() != null)
                .collect(Collectors.groupingBy(u -> u.getCourse().getId(), Collectors.counting()));

        // Pre-compute user unlocked course IDs (full-course) and gifted faculty IDs per course
        Set<Long> userUnlockedCourseIds = new HashSet<>();
        Map<Long, List<Long>> userUnlockedTeacherIdsByCourse = new HashMap<>();
        boolean isStaff = user != null && user.getRole() != null &&
                (user.getRole() == Role.ROLE_ADMIN || user.getRole() == Role.ROLE_SUPER_ADMIN || user.getRole() == Role.ROLE_MANAGER);
        boolean isAllUnlocked = isStaff;

        if (user != null && !isStaff) {
            Optional<Subscription> validSub = subscriptionService.getValidActiveSubscription(user.getId());
            if (validSub.isPresent() && validSub.get().isUnlimited()) {
                isAllUnlocked = true;
            } else {
                boolean hasActiveSub = validSub.isPresent();
                List<UnlockedCourse> userUnlocks = unlockedCourseRepository.findByUserId(user.getId());
                java.time.LocalDateTime now = java.time.LocalDateTime.now();
                for (UnlockedCourse uc : userUnlocks) {
                    if (uc.getCourse() != null && (uc.getExpiresAt() == null || !now.isAfter(uc.getExpiresAt()))) {
                        boolean validSource = hasActiveSub
                                || uc.getSource() == UnlockSource.CONTRIBUTION_REWARD
                                || uc.getSource() == UnlockSource.FREE_WAIVER
                                || uc.getSource() == UnlockSource.ADMIN_GIFT;
                        if (!validSource) continue;
                        if (uc.getTeacher() == null) {
                            userUnlockedCourseIds.add(uc.getCourse().getId());
                        } else {
                            userUnlockedTeacherIdsByCourse
                                    .computeIfAbsent(uc.getCourse().getId(), k -> new ArrayList<>())
                                    .add(uc.getTeacher().getId());
                        }
                    }
                }
            }
        }

        final boolean allUnlockedFinal = isAllUnlocked;

        if (query != null && !query.trim().isEmpty()) {
            String q = query.trim().toLowerCase();
            courses = courses.stream().filter(c -> {
                if (c.getCode().toLowerCase().contains(q) || c.getTitle().toLowerCase().contains(q)) {
                    return true;
                }
                List<TeacherCourse> tcs = teacherCoursesByCourseId.getOrDefault(c.getId(), Collections.emptyList());
                return tcs.stream().anyMatch(tc ->
                        (tc.getTeacher() != null && tc.getTeacher().getName() != null && tc.getTeacher().getName().toLowerCase().contains(q)) ||
                        (tc.getTeacher() != null && tc.getTeacher().getInitial() != null && tc.getTeacher().getInitial().toLowerCase().contains(q))
                );
            }).toList();
        }

        return courses.stream().map(c -> toSearchResponseOptimized(
                c,
                resourcesByCourseId.getOrDefault(c.getId(), Collections.emptyList()),
                teacherCoursesByCourseId.getOrDefault(c.getId(), Collections.emptyList()),
                unlockCounts.getOrDefault(c.getId(), 0L),
                allUnlockedFinal || userUnlockedCourseIds.contains(c.getId()),
                userUnlockedTeacherIdsByCourse.getOrDefault(c.getId(), Collections.emptyList())
        )).toList();
    }

    @Cacheable(value = "course_details", key = "(#user != null ? #user.id : 0) + '_' + #code.toLowerCase()", unless = "#result == null")
    public CourseSearchResponse getCourseByCode(String code, User user) {
        Course course = courseRepository.findByCodeIgnoreCase(code.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with code: " + code));
        return toSearchResponse(course, user);
    }

    @CacheEvict(value = {"courses", "course_details", "course_resources", "teacher_resources"}, allEntries = true)
    @Transactional
    public boolean unlockCourse(String code, User user) {
        if (user.getRole() == Role.ROLE_ADMIN || user.getRole() == Role.ROLE_SUPER_ADMIN || user.getRole() == Role.ROLE_MANAGER) {
            return true; // Staff have permanent access
        }

        Course course = courseRepository.findByCodeIgnoreCase(code.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with code: " + code));

        if (unlockedCourseRepository.existsByUserIdAndCourseIdAndTeacherIsNull(user.getId(), course.getId())) {
            return true; // Already unlocked full course
        }

        Subscription validSub = subscriptionService.getValidActiveSubscription(user.getId())
                .orElseThrow(() -> new ApiException("No active subscription plan found or your plan validity has ended. Please purchase or renew a plan to unlock courses!"));

        // Acquire row-level write lock on the active subscription so concurrent unlocks cannot exceed quota
        Subscription sub = subscriptionRepository.findByIdForUpdate(validSub.getId())
                .orElseThrow(() -> new ApiException("Active subscription record is no longer available."));

        if (!sub.isActive() || sub.isExpired()) {
            throw new ApiException("Your subscription plan is no longer active. Please renew to unlock courses!");
        }

        // Re-check inside locked critical section for idempotency
        if (unlockedCourseRepository.existsByUserIdAndCourseIdAndTeacherIsNull(user.getId(), course.getId())) {
            return true;
        }

        if (sub.isUnlimited()) {
            UnlockedCourse uc = new UnlockedCourse(user, course, UnlockSource.YEAR_UNLIMITED, sub.getEndDate());
            unlockedCourseRepository.save(uc);
            return true;
        }

        if (sub.getUsedCoursesCount() >= sub.getMaxCoursesAllowed()) {
            throw new ApiException("You have reached the maximum course unlock limit for your plan ("
                    + sub.getMaxCoursesAllowed() + " courses). Please upgrade your plan or contribute a note to unlock more!");
        }

        sub.setUsedCoursesCount(sub.getUsedCoursesCount() + 1);
        subscriptionRepository.save(sub);

        UnlockedCourse uc = new UnlockedCourse(user, course, UnlockSource.PURCHASED_QUOTA, sub.getEndDate());
        unlockedCourseRepository.save(uc);

        return true;
    }

    private CourseSearchResponse toSearchResponse(Course course, User user) {
        CourseSearchResponse res = new CourseSearchResponse();
        res.setId(course.getId());
        res.setCode(course.getCode());
        res.setTitle(course.getTitle());
        res.setCredits(course.getCredits());
        res.setSemester(course.getSemester());
        res.setLab(course.isLab());
        res.setPrerequisite(course.getPrerequisite());
        res.setElectiveGroup(course.getElectiveGroup());
        res.setDepartment(course.getDepartment() != null ? course.getDepartment() : "CSE");

        // Fetch all approved resources for this course once
        List<Resource> courseResources = resourceRepository.findByCourseIdAndStatus(course.getId(), ResourceStatus.APPROVED);

        // Find associated teachers with detailed per-teacher notes and questions breakdown (strictly based on authentic approved materials)
        List<TeacherCourse> tcs = teacherCourseRepository.findByCourseId(course.getId());
        Map<Long, TeacherCourse> teacherCourseMap = new LinkedHashMap<>();
        for (TeacherCourse tc : tcs) {
            if (tc.getTeacher() != null) {
                teacherCourseMap.putIfAbsent(tc.getTeacher().getId(), tc);
            }
        }
        Map<Long, Teacher> distinctTeachers = new LinkedHashMap<>();
        for (Resource r : courseResources) {
            if (r.getTeacher() != null) {
                distinctTeachers.putIfAbsent(r.getTeacher().getId(), r.getTeacher());
            }
        }

        List<TeacherBriefDto> teacherDtos = distinctTeachers.values().stream().map(teacher -> {
            TeacherCourse matchedTc = teacherCourseMap.get(teacher.getId());
            String sched = matchedTc != null ? matchedTc.getScheduleInfo() : null;
            TeacherBriefDto dto = new TeacherBriefDto(
                    teacher.getId(),
                    teacher.getName(),
                    teacher.getInitial(),
                    teacher.getDesignation(),
                    teacher.getRoom(),
                    teacher.getEmail(),
                    teacher.getImage(),
                    sched
            );

            long tNotes = courseResources.stream()
                    .filter(r -> r.getTeacher() != null && r.getTeacher().getId().equals(dto.getId()))
                    .filter(r -> r.getType() == ResourceType.NOTE || r.getType() == ResourceType.LAB_HAND_NOTE || r.getType() == ResourceType.LAB_REPORT || r.getType() == ResourceType.DOC_NOTE || r.getType() == ResourceType.PROJECT_LINK || r.getType() == ResourceType.OTHERS || r.getType() == ResourceType.SYLLABUS)
                    .count();

            long tQuestions = courseResources.stream()
                    .filter(r -> r.getTeacher() != null && r.getTeacher().getId().equals(dto.getId()))
                    .filter(r -> r.getType() == ResourceType.QUESTION_COURSE_IN ||
                                 r.getType() == ResourceType.MID_QUESTION ||
                                 r.getType() == ResourceType.FINAL_QUESTION ||
                                 r.getType() == ResourceType.QUIZ_CT ||
                                 r.getType() == ResourceType.LAB_QUIZ ||
                                 r.getType() == ResourceType.LAB_FINAL ||
                                 r.getType() == ResourceType.LAB_MANUAL)
                    .count();

            dto.setNotesCount((int) tNotes);
            dto.setQuestionsCount((int) tQuestions);
            dto.setHasNotes(tNotes > 0);
            dto.setHasQuestions(tQuestions > 0);

            if (tNotes > 0 && tQuestions > 0) {
                dto.setStatusBadge("BOTH");
            } else if (tNotes > 0) {
                dto.setStatusBadge("NOTES_ONLY");
            } else if (tQuestions > 0) {
                dto.setStatusBadge("QUESTIONS_ONLY");
            } else {
                dto.setStatusBadge("NONE");
            }

            return dto;
        }).toList();

        res.setTeachers(teacherDtos);

        // Overall course resources status
        long totalNotes = courseResources.stream()
                .filter(r -> r.getType() == ResourceType.NOTE || r.getType() == ResourceType.LAB_HAND_NOTE || r.getType() == ResourceType.LAB_REPORT || r.getType() == ResourceType.DOC_NOTE || r.getType() == ResourceType.PROJECT_LINK || r.getType() == ResourceType.OTHERS || r.getType() == ResourceType.SYLLABUS)
                .count();
        long totalQuestions = courseResources.stream().filter(r ->
                r.getType() == ResourceType.QUESTION_COURSE_IN ||
                r.getType() == ResourceType.MID_QUESTION ||
                r.getType() == ResourceType.FINAL_QUESTION ||
                r.getType() == ResourceType.QUIZ_CT ||
                r.getType() == ResourceType.LAB_QUIZ ||
                r.getType() == ResourceType.LAB_FINAL ||
                r.getType() == ResourceType.LAB_MANUAL).count();

        res.setHasNotes(totalNotes > 0);
        res.setHasQuestions(totalQuestions > 0);
        res.setNotesCount((int) totalNotes);
        res.setQuestionsCount((int) totalQuestions);

        if (totalNotes > 0 && totalQuestions > 0) {
            res.setStatusBadge("BOTH");
        } else if (totalNotes > 0) {
            res.setStatusBadge("NOTES_ONLY");
        } else if (totalQuestions > 0) {
            res.setStatusBadge("QUESTIONS_ONLY");
        } else {
            res.setStatusBadge("NONE");
        }

        // Check if unlocked via SubscriptionService (handles expiration, quotas, and automatic locking)
        res.setUnlocked(subscriptionService.isCourseUnlocked(user, course));
        res.setUnlockedTeacherIds(new ArrayList<>(subscriptionService.getUnlockedTeacherIds(user, course)));

        // Real database unlock count (Zero fake/demo offsets)
        long realCount = unlockedCourseRepository.countByCourseId(course.getId());
        res.setUnlockCount((int) realCount);
        res.setTrending(realCount >= 10);

        return res;
    }

    private CourseSearchResponse toSearchResponseOptimized(
            Course course,
            List<Resource> courseResources,
            List<TeacherCourse> tcs,
            long realCount,
            boolean isUnlocked,
            List<Long> unlockedTeacherIds) {
        CourseSearchResponse res = new CourseSearchResponse();
        res.setId(course.getId());
        res.setCode(course.getCode());
        res.setTitle(course.getTitle());
        res.setCredits(course.getCredits());
        res.setSemester(course.getSemester());
        res.setLab(course.isLab());
        res.setPrerequisite(course.getPrerequisite());
        res.setElectiveGroup(course.getElectiveGroup());
        res.setDepartment(course.getDepartment() != null ? course.getDepartment() : "CSE");

        Map<Long, TeacherCourse> teacherCourseMap = new LinkedHashMap<>();
        for (TeacherCourse tc : tcs) {
            if (tc.getTeacher() != null) {
                teacherCourseMap.putIfAbsent(tc.getTeacher().getId(), tc);
            }
        }
        Map<Long, Teacher> distinctTeachers = new LinkedHashMap<>();
        for (Resource r : courseResources) {
            if (r.getTeacher() != null) {
                distinctTeachers.putIfAbsent(r.getTeacher().getId(), r.getTeacher());
            }
        }

        List<TeacherBriefDto> teacherDtos = distinctTeachers.values().stream().map(teacher -> {
            TeacherCourse matchedTc = teacherCourseMap.get(teacher.getId());
            String sched = matchedTc != null ? matchedTc.getScheduleInfo() : null;
            TeacherBriefDto dto = new TeacherBriefDto(
                    teacher.getId(),
                    teacher.getName(),
                    teacher.getInitial(),
                    teacher.getDesignation(),
                    teacher.getRoom(),
                    teacher.getEmail(),
                    teacher.getImage(),
                    sched
            );

            long tNotes = courseResources.stream()
                    .filter(r -> r.getTeacher() != null && r.getTeacher().getId().equals(dto.getId()))
                    .filter(r -> r.getType() == ResourceType.NOTE || r.getType() == ResourceType.LAB_HAND_NOTE || r.getType() == ResourceType.LAB_REPORT || r.getType() == ResourceType.DOC_NOTE || r.getType() == ResourceType.PROJECT_LINK || r.getType() == ResourceType.OTHERS || r.getType() == ResourceType.SYLLABUS)
                    .count();

            long tQuestions = courseResources.stream()
                    .filter(r -> r.getTeacher() != null && r.getTeacher().getId().equals(dto.getId()))
                    .filter(r -> r.getType() == ResourceType.QUESTION_COURSE_IN ||
                                 r.getType() == ResourceType.MID_QUESTION ||
                                 r.getType() == ResourceType.FINAL_QUESTION ||
                                 r.getType() == ResourceType.QUIZ_CT ||
                                 r.getType() == ResourceType.LAB_QUIZ ||
                                 r.getType() == ResourceType.LAB_FINAL ||
                                 r.getType() == ResourceType.LAB_MANUAL)
                    .count();

            dto.setNotesCount((int) tNotes);
            dto.setQuestionsCount((int) tQuestions);
            dto.setHasNotes(tNotes > 0);
            dto.setHasQuestions(tQuestions > 0);

            if (tNotes > 0 && tQuestions > 0) {
                dto.setStatusBadge("BOTH");
            } else if (tNotes > 0) {
                dto.setStatusBadge("NOTES_ONLY");
            } else if (tQuestions > 0) {
                dto.setStatusBadge("QUESTIONS_ONLY");
            } else {
                dto.setStatusBadge("NONE");
            }

            return dto;
        }).toList();

        res.setTeachers(teacherDtos);

        long totalNotes = courseResources.stream()
                .filter(r -> r.getType() == ResourceType.NOTE || r.getType() == ResourceType.LAB_HAND_NOTE || r.getType() == ResourceType.LAB_REPORT || r.getType() == ResourceType.DOC_NOTE || r.getType() == ResourceType.PROJECT_LINK || r.getType() == ResourceType.OTHERS || r.getType() == ResourceType.SYLLABUS)
                .count();
        long totalQuestions = courseResources.stream().filter(r ->
                r.getType() == ResourceType.QUESTION_COURSE_IN ||
                r.getType() == ResourceType.MID_QUESTION ||
                r.getType() == ResourceType.FINAL_QUESTION ||
                r.getType() == ResourceType.QUIZ_CT ||
                r.getType() == ResourceType.LAB_QUIZ ||
                r.getType() == ResourceType.LAB_FINAL ||
                r.getType() == ResourceType.LAB_MANUAL).count();

        res.setHasNotes(totalNotes > 0);
        res.setHasQuestions(totalQuestions > 0);
        res.setNotesCount((int) totalNotes);
        res.setQuestionsCount((int) totalQuestions);

        if (totalNotes > 0 && totalQuestions > 0) {
            res.setStatusBadge("BOTH");
        } else if (totalNotes > 0) {
            res.setStatusBadge("NOTES_ONLY");
        } else if (totalQuestions > 0) {
            res.setStatusBadge("QUESTIONS_ONLY");
        } else {
            res.setStatusBadge("NONE");
        }

        res.setUnlocked(isUnlocked);
        res.setUnlockedTeacherIds(unlockedTeacherIds != null ? unlockedTeacherIds : Collections.emptyList());
        res.setUnlockCount((int) realCount);
        res.setTrending(realCount >= 10);

        return res;
    }

    @CacheEvict(value = {"courses", "course_details", "teachers", "teacher_details", "teacher_courses"}, allEntries = true)
    @Transactional
    public void assignTeacherToCourse(String courseCode, Long teacherId) {
        Course course = courseRepository.findByCodeIgnoreCase(courseCode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with code: " + courseCode));
        Teacher teacher = teacherRepository.findById(teacherId)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found with id: " + teacherId));
        List<TeacherCourse> existingList = teacherCourseRepository.findAllByCourseIdAndTeacherId(course.getId(), teacher.getId());
        if (!existingList.isEmpty()) {
            TeacherCourse primary = existingList.get(0);
            primary.setScheduleInfo("ADMIN_ASSIGNED");
            primary.setSection("General");
            teacherCourseRepository.save(primary);
            if (existingList.size() > 1) {
                for (int i = 1; i < existingList.size(); i++) {
                    teacherCourseRepository.delete(existingList.get(i));
                }
            }
        } else {
            TeacherCourse tc = new TeacherCourse();
            tc.setCourse(course);
            tc.setTeacher(teacher);
            tc.setSection("General");
            tc.setScheduleInfo("ADMIN_ASSIGNED");
            teacherCourseRepository.save(tc);
        }
        liveSyncService.broadcast("matrix", "assigned", courseCode + "->" + teacherId);
        liveSyncService.broadcast("teacher_course", "updated", teacherId);
    }

    @CacheEvict(value = {"courses", "course_details", "teachers", "teacher_details", "teacher_courses"}, allEntries = true)
    @Transactional
    public void removeTeacherFromCourse(String courseCode, Long teacherId) {
        Course course = courseRepository.findByCodeIgnoreCase(courseCode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with code: " + courseCode));
        List<TeacherCourse> existingList = teacherCourseRepository.findAllByCourseIdAndTeacherId(course.getId(), teacherId);
        if (!existingList.isEmpty()) {
            teacherCourseRepository.deleteAll(existingList);
        }
        teacherCourseRepository.deleteByCourseIdAndTeacherId(course.getId(), teacherId);
        List<Resource> teacherRes = resourceRepository.findByCourseIdAndTeacherId(course.getId(), teacherId);
        for (Resource r : teacherRes) {
            r.setTeacher(null);
            resourceRepository.save(r);
        }
        liveSyncService.broadcast("matrix", "removed", courseCode + "->" + teacherId);
        liveSyncService.broadcast("teacher_course", "updated", teacherId);
    }

    @CacheEvict(value = {"courses", "course_details", "course_codes"}, allEntries = true)
    @Transactional
    public Course createCourse(Course course, Long initialTeacherId) {
        if (course.getCode() == null || course.getCode().trim().isEmpty()) {
            throw new ApiException("Course code is required");
        }
        String cleanCode = course.getCode().trim().toUpperCase();
        if (courseRepository.findByCodeIgnoreCase(cleanCode).isPresent()) {
            throw new ApiException("Course with code " + cleanCode + " already exists");
        }
        course.setCode(cleanCode);
        if (course.getTitle() == null || course.getTitle().trim().isEmpty()) {
            throw new ApiException("Course title is required");
        }
        course.setTitle(course.getTitle().trim());
        if (course.getDepartment() == null || course.getDepartment().trim().isEmpty()) {
            course.setDepartment("CSE");
        }
        Course saved = courseRepository.save(course);
        if (initialTeacherId != null) {
            assignTeacherToCourse(saved.getCode(), initialTeacherId);
        }
        liveSyncService.broadcast("course", "created", saved.getCode());
        return saved;
    }

    @CacheEvict(value = {"courses", "course_details", "course_codes"}, allEntries = true)
    @Transactional
    public Course updateCourse(String code, Map<String, Object> payload) {
        Course course = courseRepository.findByCodeIgnoreCase(code.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with code: " + code));

        if (payload.containsKey("title") && payload.get("title") != null) {
            String title = payload.get("title").toString().trim();
            if (!title.isEmpty()) course.setTitle(title);
        }
        if (payload.containsKey("credits") && payload.get("credits") != null) {
            course.setCredits(Double.parseDouble(payload.get("credits").toString()));
        }
        if (payload.containsKey("semester") && payload.get("semester") != null) {
            course.setSemester(Integer.parseInt(payload.get("semester").toString()));
        }
        if (payload.containsKey("department") && payload.get("department") != null) {
            course.setDepartment(payload.get("department").toString());
        }
        if (payload.containsKey("isLab") && payload.get("isLab") != null) {
            course.setLab(Boolean.parseBoolean(payload.get("isLab").toString()));
        }
        if (payload.containsKey("prerequisite") && payload.get("prerequisite") != null) {
            course.setPrerequisite(payload.get("prerequisite").toString());
        }
        if (payload.containsKey("description") && payload.get("description") != null) {
            course.setDescription(payload.get("description").toString());
        }

        Course updated = courseRepository.save(course);
        liveSyncService.broadcast("course", "updated", code);
        return updated;
    }

    @CacheEvict(value = {"courses", "course_details", "course_codes"}, allEntries = true)
    @Transactional
    public void deleteCourse(String code) {
        Course course = courseRepository.findByCodeIgnoreCase(code.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with code: " + code));

        Long courseId = course.getId();

        // 1. Delete all teacher assignments for this course
        List<TeacherCourse> tcs = teacherCourseRepository.findByCourseId(courseId);
        teacherCourseRepository.deleteAll(tcs);

        // 2. Remove student unlocks for this course
        unlockedCourseRepository.deleteByCourseId(courseId);

        // 3. Remove reviews & user reviews for this course
        reviewRepository.deleteByCourseId(courseId);
        userCourseReviewRepository.deleteByCourseId(courseId);

        // 4. Handle contribution requests where this course was requested as reward
        List<ContributionRequest> rewardContribs = contributionRequestRepository.findByRequestedCourse1IdOrRequestedCourse2Id(courseId, courseId);
        contributionRequestRepository.deleteAll(rewardContribs);

        // 5. Delete resources linked to this course (and any contribution request referencing them)
        List<Resource> resources = resourceRepository.findByCourseId(courseId);
        for (Resource r : resources) {
            List<ContributionRequest> crs = contributionRequestRepository.findByUploadedResourceId(r.getId());
            contributionRequestRepository.deleteAll(crs);
            resourceRepository.delete(r);
        }

        // 6. Delete course
        courseRepository.delete(course);
        liveSyncService.broadcast("course", "deleted", code);
    }

    public static int compareCoursesNaturally(String c1, String c2) {
        if (c1 == null && c2 == null) return 0;
        if (c1 == null) return 1;
        if (c2 == null) return -1;

        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("^([a-zA-Z]+)(\\d+)(.*)$");
        java.util.regex.Matcher m1 = pattern.matcher(c1.trim().toUpperCase());
        java.util.regex.Matcher m2 = pattern.matcher(c2.trim().toUpperCase());

        if (m1.matches() && m2.matches()) {
            String dept1 = m1.group(1);
            String dept2 = m2.group(1);
            int num1 = Integer.parseInt(m1.group(2));
            int num2 = Integer.parseInt(m2.group(2));
            String suffix1 = m1.group(3);
            String suffix2 = m2.group(3);

            // CSE department courses always come first
            if ("CSE".equalsIgnoreCase(dept1) && !"CSE".equalsIgnoreCase(dept2)) return -1;
            if (!"CSE".equalsIgnoreCase(dept1) && "CSE".equalsIgnoreCase(dept2)) return 1;

            if (!dept1.equalsIgnoreCase(dept2)) {
                return dept1.compareToIgnoreCase(dept2);
            }

            if (num1 != num2) {
                return Integer.compare(num1, num2);
            }

            return suffix1.compareToIgnoreCase(suffix2);
        }

        return c1.compareToIgnoreCase(c2);
    }

    public void verifyCourseUnlockedForDownload(String courseCode, User user) {
        Course course = courseRepository.findByCodeIgnoreCase(courseCode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with code: " + courseCode));

        if (!subscriptionService.hasAnyUnlockForCourse(user, course)) {
            throw new ApiException("Course " + course.getCode() + " is locked. You must unlock this course before downloading the offline study pack.");
        }
    }

    public void generateOfflineStudyPackZip(String courseCode, User user, OutputStream outputStream) throws IOException {
        verifyCourseUnlockedForDownload(courseCode, user);
        Course course = courseRepository.findByCodeIgnoreCase(courseCode.trim()).get();

        List<Resource> resources = resourceRepository.findByCourseIdAndStatus(course.getId(), ResourceStatus.APPROVED).stream()
                .filter(r -> subscriptionService.isResourceUnlocked(user, r))
                .toList();

        try (ZipOutputStream zos = new ZipOutputStream(outputStream)) {
            // 1. Generate Interactive Offline Study Guide HTML
            String guideHtml = buildOfflineStudyGuideHtml(course, resources);
            zos.putNextEntry(new ZipEntry("00_START_HERE_OFFLINE_STUDY_GUIDE.html"));
            zos.write(guideHtml.getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // 2. Generate Readme Instructions TXT
            String readmeTxt = buildOfflineReadme(course, resources);
            zos.putNextEntry(new ZipEntry("README_INSTRUCTIONS.txt"));
            zos.write(readmeTxt.getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();

            // 3. Process each approved material into categorized folders
            for (Resource r : resources) {
                String folder = getCategoryFolder(r.getType());
                String teacherTag = (r.getTeacher() != null && r.getTeacher().getInitial() != null && !r.getTeacher().getInitial().isBlank())
                        ? r.getTeacher().getInitial().trim()
                        : (r.getTeacher() != null ? r.getTeacher().getName() : "Faculty");
                String safeTitle = sanitizeFilename(r.getTitle());
                String baseFileName = teacherTag + " - " + safeTitle;

                // Try downloading original document bytes if available online
                byte[] downloadedBytes = tryDownloadUrl(r.getFileUrl(), 2500);
                if (downloadedBytes != null && downloadedBytes.length > 0) {
                    zos.putNextEntry(new ZipEntry(folder + baseFileName + ".pdf"));
                    zos.write(downloadedBytes);
                    zos.closeEntry();
                }

                // Companion offline HTML viewer for this specific resource
                String resourceViewerHtml = buildSingleResourceOfflineHtml(course, r, baseFileName, downloadedBytes != null);
                zos.putNextEntry(new ZipEntry(folder + baseFileName + ".html"));
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
            conn.setRequestProperty("User-Agent", "NoteLagbe-SEU-Offline-Pack/1.0");
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
                        if (total > 15 * 1024 * 1024) break; // 15MB limit per file
                    }
                    return out.toByteArray();
                }
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private String buildOfflineReadme(Course course, List<Resource> resources) {
        long notesCount = resources.stream().filter(r -> r.getType() == ResourceType.NOTE).count();
        long midCount = resources.stream().filter(r -> r.getType() == ResourceType.MID_QUESTION).count();
        long finalCount = resources.stream().filter(r -> r.getType() == ResourceType.FINAL_QUESTION).count();
        long labCount = resources.size() - notesCount - midCount - finalCount;

        return """
================================================================================
NOTELAGBE - SOUTHEAST UNIVERSITY (SEU) ACADEMIC ARCHIVE
OFFLINE STUDY PACK: %s - %s
================================================================================
Department: %s | Credits: %.1f | Semester: %d
Total Approved Materials: %d
- Lecture Hand Notes: %d
- Midterm Question Papers: %d
- Final Question Papers: %d
- Lab Manuals & Practical Experiments: %d

ARCHIVE DIRECTORY MAP:
--------------------------------------------------------------------------------
├── 00_START_HERE_OFFLINE_STUDY_GUIDE.html  <-- Open this in any web browser!
├── README_INSTRUCTIONS.txt
├── 01_Lecture_Hand_Notes/                  <-- Theory & Hand Notes
├── 02_Midterm_Exam_Papers/                 <-- Past Midterm Exam Solutions
├── 03_Final_Exam_Papers/                   <-- Past Final Exam Solutions
└── 04_Lab_Manuals_And_Tasks/               <-- Lab Manuals, Quizzes & Reports

HOW TO USE THIS OFFLINE STUDY PACK:
1. Double click "00_START_HERE_OFFLINE_STUDY_GUIDE.html" to open the interactive
   study dashboard. Zero internet or Wi-Fi required!
2. Filter notes by instructor (e.g. MSH, AMS, SMA), search by exam topics, and
   track your revision progress with built-in checkboxes.
3. Every material also has an offline HTML viewer and downloadable PDF in its folder.
4. If you have any new notes to contribute, visit https://note-lagbe-sandy.vercel.app to earn rewards!

Good luck with your exams!
NoteLagbe - By Southeast University Students, For Southeast University Students
================================================================================
""".formatted(
                course.getCode(),
                course.getTitle(),
                course.getDepartment() != null ? course.getDepartment() : "CSE",
                course.getCredits(),
                course.getSemester(),
                resources.size(),
                notesCount,
                midCount,
                finalCount,
                labCount
        );
    }

    private String buildOfflineStudyGuideHtml(Course course, List<Resource> resources) {
        long notesCount = resources.stream().filter(r -> r.getType() == ResourceType.NOTE).count();
        long midCount = resources.stream().filter(r -> r.getType() == ResourceType.MID_QUESTION).count();
        long finalCount = resources.stream().filter(r -> r.getType() == ResourceType.FINAL_QUESTION).count();
        long labCount = resources.size() - (notesCount + midCount + finalCount);

        StringBuilder cardsHtml = new StringBuilder();
        for (Resource r : resources) {
            String folder = getCategoryFolder(r.getType());
            String teacherTag = (r.getTeacher() != null && r.getTeacher().getInitial() != null && !r.getTeacher().getInitial().isBlank())
                    ? r.getTeacher().getInitial().trim()
                    : (r.getTeacher() != null ? r.getTeacher().getName() : "Faculty");
            String safeTitle = sanitizeFilename(r.getTitle());
            String baseFileName = teacherTag + " - " + safeTitle;

            String typeBadge;
            String catKey;
            switch (r.getType()) {
                case NOTE:
                    typeBadge = "<span class=\"badge badge-blue\">Lecture Note</span>";
                    catKey = "note";
                    break;
                case MID_QUESTION:
                    typeBadge = "<span class=\"badge badge-amber\">Midterm Exam</span>";
                    catKey = "mid";
                    break;
                case FINAL_QUESTION:
                    typeBadge = "<span class=\"badge badge-purple\">Final Exam</span>";
                    catKey = "final";
                    break;
                case LAB_MANUAL:
                case LAB_HAND_NOTE:
                case LAB_REPORT:
                case LAB_QUIZ:
                case LAB_FINAL:
                case QUESTION_COURSE_IN:
                    typeBadge = "<span class=\"badge badge-emerald\">Lab Manual/Task</span>";
                    catKey = "lab";
                    break;
                default:
                    typeBadge = "<span class=\"badge badge-slate\">Material</span>";
                    catKey = "other";
                    break;
            }

            String teacherName = r.getTeacher() != null ? r.getTeacher().getName() : "Southeast University Faculty";
            String teacherInitial = (r.getTeacher() != null && r.getTeacher().getInitial() != null) ? r.getTeacher().getInitial() : "";

            cardsHtml.append("""
                <div class=\"card\" data-category=\"%s\" data-teacher=\"%s\" data-title=\"%s\">
                    <div class=\"card-header\">
                        %s
                        <span class=\"sem-tag\">%s %d</span>
                    </div>
                    <h3 class=\"card-title\">%s</h3>
                    <div class=\"teacher-info\">
                        <div class=\"teacher-avatar\">%s</div>
                        <div>
                            <p class=\"teacher-name\">%s</p>
                            <p class=\"teacher-meta\">%s</p>
                        </div>
                    </div>
                    <div class=\"card-actions\">
                        <a href=\"./%s%s.html\" class=\"btn btn-primary\">
                            <svg width=\"16\" height=\"16\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M15 12a3 3 0 11-6 0 3 3 0 016 0z\"></path><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z\"></path></svg>
                            View Offline Note
                        </a>
                        <a href=\"./%s%s.pdf\" class=\"btn btn-secondary\" target=\"_blank\">
                            <svg width=\"16\" height=\"16\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z\"></path></svg>
                            PDF Document
                        </a>
                    </div>
                    <label class=\"checkbox-label\">
                        <input type=\"checkbox\" onchange=\"toggleRevision(this, '%s')\" id=\"rev_%s\">
                        <span>Revision Complete</span>
                    </label>
                </div>
            """.formatted(
                    catKey,
                    escapeHtml(teacherName.toLowerCase() + " " + teacherInitial.toLowerCase()),
                    escapeHtml(r.getTitle().toLowerCase()),
                    typeBadge,
                    escapeHtml(r.getSemesterName() != null ? r.getSemesterName() : "Academic"),
                    r.getAcademicYear(),
                    escapeHtml(r.getTitle()),
                    escapeHtml(teacherInitial.isBlank() ? "SEU" : teacherInitial),
                    escapeHtml(teacherName),
                    escapeHtml(teacherInitial.isBlank() ? "SEU Faculty" : "Initial: " + teacherInitial),
                    folder,
                    escapeHtml(baseFileName),
                    folder,
                    escapeHtml(baseFileName),
                    r.getId(),
                    r.getId()
            ));
        }

        return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>%s - %s | Offline Study Pack</title>
    <style>
        :root {
            --bg-color: #0f172a;
            --card-bg: #1e293b;
            --card-border: #334155;
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --primary: #3b82f6;
            --primary-hover: #2563eb;
            --emerald: #10b981;
            --amber: #f59e0b;
            --purple: #8b5cf6;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        body { background: var(--bg-color); color: var(--text-primary); line-height: 1.6; padding: 24px 16px; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #1e293b 0%%, #0f172a 100%%); border: 1px solid var(--card-border); border-radius: 24px; padding: 32px 24px; margin-bottom: 24px; position: relative; overflow: hidden; }
        .badge-bar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
        .badge { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 12px; display: inline-flex; align-items: center; }
        .badge-blue { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
        .badge-amber { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
        .badge-purple { background: rgba(139, 92, 246, 0.2); color: #c084fc; border: 1px solid rgba(139, 92, 246, 0.3); }
        .badge-emerald { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
        .badge-slate { background: rgba(148, 163, 184, 0.2); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.3); }
        h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; color: #fff; }
        .subtitle { font-size: 14px; color: var(--text-secondary); max-width: 800px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-top: 24px; }
        .stat-card { background: rgba(30, 41, 59, 0.6); border: 1px solid var(--card-border); border-radius: 16px; padding: 14px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: 800; color: #fff; }
        .stat-label { font-size: 11px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; }
        .controls { display: flex; flex-direction: column; md-flex-direction: row; gap: 16px; margin-bottom: 24px; background: var(--card-bg); border: 1px solid var(--card-border); padding: 16px; border-radius: 20px; }
        .search-box { flex: 1; position: relative; }
        .search-input { width: 100%%; background: #0f172a; border: 1px solid var(--card-border); border-radius: 12px; padding: 12px 16px; color: #fff; font-size: 14px; outline: none; }
        .search-input:focus { border-color: var(--primary); }
        .filter-tabs { display: flex; flex-wrap: wrap; gap: 8px; }
        .filter-btn { background: #0f172a; border: 1px solid var(--card-border); color: var(--text-secondary); padding: 8px 14px; border-radius: 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .filter-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }
        .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
        .card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 20px; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; transition: transform 0.2s, border-color 0.2s; }
        .card:hover { border-color: #475569; transform: translateY(-2px); }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .sem-tag { font-size: 11px; color: var(--text-secondary); font-weight: 600; }
        .card-title { font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 12px; line-height: 1.4; }
        .teacher-info { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding: 8px 12px; background: rgba(15, 23, 42, 0.5); border-radius: 12px; }
        .teacher-avatar { width: 36px; height: 36px; border-radius: 10px; background: var(--primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; }
        .teacher-name { font-size: 13px; font-weight: 700; color: #fff; }
        .teacher-meta { font-size: 11px; color: var(--text-secondary); }
        .card-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
        .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border-radius: 10px; font-size: 12px; font-weight: 700; text-decoration: none; transition: all 0.2s; text-align: center; }
        .btn-primary { background: var(--primary); color: #fff; }
        .btn-primary:hover { background: var(--primary-hover); }
        .btn-secondary { background: #0f172a; color: var(--text-secondary); border: 1px solid var(--card-border); }
        .btn-secondary:hover { background: #1e293b; color: #fff; }
        .checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-secondary); cursor: pointer; user-select: none; }
        .checkbox-label input { cursor: pointer; accent-color: var(--emerald); }
        .tips-section { margin-top: 32px; background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9)); border: 1px solid var(--card-border); border-radius: 20px; padding: 24px; }
        .tips-title { font-size: 16px; font-weight: 800; color: #fbbf24; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        .tips-list { font-size: 13px; color: var(--text-secondary); padding-left: 20px; line-height: 1.8; }
        .footer { text-align: center; margin-top: 32px; font-size: 12px; color: var(--text-secondary); }
    </style>
</head>
<body>
    <div class="container">
        <!-- HEADER -->
        <div class="header">
            <div class="badge-bar">
                <span class="badge badge-blue">%s</span>
                <span class="badge badge-slate">%s DEPARTMENT</span>
                <span class="badge badge-slate">SEMESTER %d</span>
                <span class="badge badge-slate">%.1f CREDITS</span>
                <span class="badge badge-emerald">✓ 100%% OFFLINE READY</span>
            </div>
            <h1>%s</h1>
            <p class="subtitle">
                Official Southeast University offline study pack. Access all approved faculty hand notes, past midterm and final questions, and lab manuals without internet.
            </p>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">%d</div>
                    <div class="stat-label">Total Materials</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">%d</div>
                    <div class="stat-label">Lecture Notes</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">%d</div>
                    <div class="stat-label">Midterm Papers</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">%d</div>
                    <div class="stat-label">Final Papers</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">%d</div>
                    <div class="stat-label">Lab Tasks</div>
                </div>
            </div>
        </div>

        <!-- CONTROLS & SEARCH -->
        <div class="controls">
            <div class="search-box">
                <input type="text" id="searchInput" class="search-input" placeholder="🔍 Search notes by topic, teacher initial (e.g. MSH), or semester..." onkeyup="filterCards()">
            </div>
            <div class="filter-tabs">
                <button class="filter-btn active" onclick="setCategory('all', this)">All (%d)</button>
                <button class="filter-btn" onclick="setCategory('note', this)">Hand Notes (%d)</button>
                <button class="filter-btn" onclick="setCategory('mid', this)">Midterm (%d)</button>
                <button class="filter-btn" onclick="setCategory('final', this)">Final (%d)</button>
                <button class="filter-btn" onclick="setCategory('lab', this)">Lab Manuals (%d)</button>
            </div>
        </div>

        <!-- CARDS GRID -->
        <div class="cards-grid" id="cardsGrid">
            %s
        </div>

        <!-- OFFLINE EXAM STRATEGY -->
        <div class="tips-section">
            <div class="tips-title">
                💡 Southeast University Exam Preparation Strategy
            </div>
            <ol class="tips-list">
                <li><strong>Review Lecture Hand Notes First:</strong> Cover core concepts from faculty notes before attempting past question papers.</li>
                <li><strong>Solve Past 3 Years Midterm & Final Questions:</strong> Southeast University exams frequently revisit patterns from previous terms.</li>
                <li><strong>Lab Manual Tasks:</strong> Practice code implementations and CLI commands on your local compiler/simulator before lab quizzes.</li>
                <li><strong>Offline Revision:</strong> Check the "Revision Complete" box on each card to keep track of your exam readiness offline.</li>
            </ol>
        </div>

        <div class="footer">
            <p>NoteLagbe Academic Archive • Generated for Southeast University Students</p>
        </div>
    </div>

    <script>
        let currentCategory = 'all';

        function setCategory(cat, btn) {
            currentCategory = cat;
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterCards();
        }

        function filterCards() {
            const query = (document.getElementById('searchInput').value || '').toLowerCase().trim();
            const cards = document.querySelectorAll('.card');

            cards.forEach(card => {
                const cat = card.getAttribute('data-category');
                const teacher = card.getAttribute('data-teacher') || '';
                const title = card.getAttribute('data-title') || '';

                const matchesCat = currentCategory === 'all' || cat === currentCategory;
                const matchesQuery = !query || title.includes(query) || teacher.includes(query);

                if (matchesCat && matchesQuery) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        }

        function toggleRevision(cb, id) {
            localStorage.setItem('notelagbe_rev_' + id, cb.checked ? 'true' : 'false');
        }

        // Restore revision checks on load
        window.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('.checkbox-label input').forEach(cb => {
                const id = cb.id.replace('rev_', '');
                if (localStorage.getItem('notelagbe_rev_' + id) === 'true') {
                    cb.checked = true;
                }
            });
        });
    </script>
</body>
</html>
""".formatted(
                course.getCode(),
                escapeHtml(course.getTitle()),
                course.getCode(),
                escapeHtml(course.getDepartment() != null ? course.getDepartment() : "CSE"),
                course.getSemester(),
                course.getCredits(),
                escapeHtml(course.getTitle()),
                resources.size(),
                notesCount,
                midCount,
                finalCount,
                labCount,
                resources.size(),
                notesCount,
                midCount,
                finalCount,
                labCount,
                cardsHtml.toString()
        );
    }

    private String buildSingleResourceOfflineHtml(Course course, Resource r, String baseFileName, boolean hasPdf) {
        String teacherName = r.getTeacher() != null ? r.getTeacher().getName() : "Southeast University Faculty";
        String teacherInitial = (r.getTeacher() != null && r.getTeacher().getInitial() != null) ? r.getTeacher().getInitial() : "";

        return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>%s | %s Offline Viewer</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #0f172a; color: #f8fafc; padding: 20px; line-height: 1.6; }
        .nav-bar { max-width: 1100px; margin: 0 auto 20px; display: flex; justify-content: space-between; align-items: center; }
        .back-link { display: inline-flex; align-items: center; gap: 6px; color: #60a5fa; text-decoration: none; font-size: 14px; font-weight: 700; }
        .back-link:hover { text-decoration: underline; }
        .viewer-card { max-width: 1100px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 24px; }
        h1 { font-size: 20px; margin-bottom: 8px; color: #fff; }
        .meta { font-size: 13px; color: #94a3b8; margin-bottom: 16px; }
        .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }
        .btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px; border-radius: 12px; font-size: 13px; font-weight: 700; text-decoration: none; }
        .btn-primary { background: #3b82f6; color: #fff; }
        .btn-secondary { background: #0f172a; color: #cbd5e1; border: 1px solid #334155; }
        .viewer-frame { width: 100%%; height: 750px; border-radius: 12px; border: 1px solid #334155; background: #0f172a; }
        .notes-box { margin-top: 24px; padding: 16px; background: #0f172a; border-radius: 12px; border: 1px solid #334155; }
        .notes-box textarea { width: 100%%; height: 100px; background: transparent; border: none; color: #fff; outline: none; resize: vertical; font-size: 13px; }
    </style>
</head>
<body>
    <div class="nav-bar">
        <a href="../00_START_HERE_OFFLINE_STUDY_GUIDE.html" class="back-link">
            ← Back to %s Offline Study Guide
        </a>
        <span style="font-size: 12px; color: #94a3b8;">%s</span>
    </div>
    <div class="viewer-card">
        <h1>%s</h1>
        <p class="meta">Instructor: %s (%s) • %s %d • Course: %s</p>
        <div class="actions">
            %s
            <a href="%s" target="_blank" class="btn btn-secondary">🌐 Cloud Web Version</a>
        </div>
        %s
        <div class="notes-box">
            <h4 style="font-size: 13px; color: #fbbf24; margin-bottom: 8px;">📝 Personal Offline Notes for this Resource:</h4>
            <textarea id="studyNote" placeholder="Write formulas, summary, or exam reminders here... (Automatically saved offline)"></textarea>
        </div>
    </div>
    <script>
        const noteArea = document.getElementById('studyNote');
        const storageKey = 'notelagbe_notes_%s';
        noteArea.value = localStorage.getItem(storageKey) || '';
        noteArea.addEventListener('input', () => {
            localStorage.setItem(storageKey, noteArea.value);
        });
    </script>
</body>
</html>
""".formatted(
                escapeHtml(r.getTitle()),
                course.getCode(),
                course.getCode(),
                course.getCode() + " Academic Archive",
                escapeHtml(r.getTitle()),
                escapeHtml(teacherName),
                escapeHtml(teacherInitial.isBlank() ? "SEU" : teacherInitial),
                escapeHtml(r.getSemesterName() != null ? r.getSemesterName() : "Academic"),
                r.getAcademicYear(),
                course.getCode() + " - " + escapeHtml(course.getTitle()),
                hasPdf ? "<a href=\"./" + escapeHtml(baseFileName) + ".pdf\" target=\"_blank\" class=\"btn btn-primary\">📄 Open Downloaded PDF</a>" : "",
                escapeHtml(r.getFileUrl()),
                hasPdf ? "<iframe src=\"./" + escapeHtml(baseFileName) + ".pdf\" class=\"viewer-frame\"></iframe>" : "<div style=\"padding: 30px; text-align: center; color: #94a3b8;\">Note summary loaded. Open Cloud Web Version for direct external stream if online.</div>",
                r.getId()
        );
    }

    @CacheEvict(value = {"courses", "course_details", "course_resources", "teacher_resources"}, allEntries = true)
    public boolean toggleSuperAdminCourseLock(String code, User user, Boolean forceLocked) {
        if (user == null || user.getRole() != Role.ROLE_SUPER_ADMIN) {
            throw new ApiException("Only Super Admin can toggle testing lock state", HttpStatus.FORBIDDEN);
        }
        Course course = courseRepository.findByCodeIgnoreCase(code.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with code: " + code));

        boolean targetLocked;
        if (forceLocked != null) {
            subscriptionService.setSuperAdminTestLock(user.getId(), course.getCode(), forceLocked);
            targetLocked = forceLocked;
        } else {
            targetLocked = subscriptionService.toggleSuperAdminTestLock(user.getId(), course.getCode());
        }
        return targetLocked;
    }

    public boolean isSuperAdminCourseTestLocked(String code, User user) {
        if (user == null || user.getRole() != Role.ROLE_SUPER_ADMIN) {
            return false;
        }
        return subscriptionService.isSuperAdminTestLocked(user.getId(), code);
    }
}
