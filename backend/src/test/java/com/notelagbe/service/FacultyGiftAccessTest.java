package com.notelagbe.service;

import com.notelagbe.dto.GiftCourseRequest;
import com.notelagbe.entity.*;
import com.notelagbe.exception.ApiException;
import com.notelagbe.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.CacheManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FacultyGiftAccessTest {

    @Mock private SubscriptionRepository subscriptionRepository;
    @Mock private UnlockedCourseRepository unlockedCourseRepository;
    @Mock private NotificationService notificationService;
    @Mock private CacheManager cacheManager;

    @Mock private UserRepository userRepository;
    @Mock private TeacherRepository teacherRepository;
    @Mock private CourseRepository courseRepository;
    @Mock private ResourceRepository resourceRepository;
    @Mock private PaymentRequestRepository paymentRequestRepository;
    @Mock private ContributionRequestRepository contributionRequestRepository;
    @Mock private WaiverRequestRepository waiverRequestRepository;
    @Mock private ReviewRepository reviewRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private NotificationRepository notificationRepository;
    @Mock private UserCourseReviewRepository userCourseReviewRepository;
    @Mock private LiveSyncService liveSyncService;
    @Mock private EmailService emailService;

    private SubscriptionService subscriptionService;
    private AdminService adminService;

    private User student;
    private User superAdmin;
    private Course course;
    private Teacher teacher1;
    private Teacher teacher2;

    @BeforeEach
    void setUp() {
        subscriptionService = new SubscriptionService(
                subscriptionRepository, unlockedCourseRepository, notificationService, cacheManager);
        adminService = new AdminService(
                userRepository, teacherRepository, courseRepository, resourceRepository,
                paymentRequestRepository, contributionRequestRepository, waiverRequestRepository,
                reviewRepository, passwordEncoder, notificationRepository, unlockedCourseRepository,
                subscriptionRepository, userCourseReviewRepository, liveSyncService,
                notificationService, emailService);

        student = new User();
        student.setId(10L);
        student.setName("Fazley Rabbi");
        student.setEmail("student@seu.edu.bd");
        student.setRole(Role.ROLE_STUDENT);

        superAdmin = new User();
        superAdmin.setId(1L);
        superAdmin.setName("Super Admin");
        superAdmin.setRole(Role.ROLE_SUPER_ADMIN);

        course = new Course();
        course.setId(100L);
        course.setCode("CSE361");
        course.setTitle("Operating Systems");

        teacher1 = new Teacher();
        teacher1.setId(201L);
        teacher1.setName("Md. Nahid Anam Opu");
        teacher1.setInitial("NAAO");

        teacher2 = new Teacher();
        teacher2.setId(202L);
        teacher2.setName("Another Faculty");
        teacher2.setInitial("ANF");
    }

    @Test
    void facultyScopedGiftUnlocksOnlyGiftedTeacherMaterials() {
        UnlockedCourse gift = new UnlockedCourse(
                student, course, teacher1, UnlockSource.ADMIN_GIFT, LocalDateTime.now().plusMonths(3));

        when(subscriptionRepository.findFirstByUserIdAndActiveTrueOrderByStartDateDesc(10L))
                .thenReturn(Optional.empty());
        when(unlockedCourseRepository.findAllByUserIdAndCourseId(10L, 100L))
                .thenReturn(List.of(gift));

        Resource resTeacher1 = new Resource();
        resTeacher1.setCourse(course);
        resTeacher1.setTeacher(teacher1);

        Resource resTeacher2 = new Resource();
        resTeacher2.setCourse(course);
        resTeacher2.setTeacher(teacher2);

        Resource resGeneral = new Resource();
        resGeneral.setCourse(course);
        resGeneral.setTeacher(null);

        assertFalse(subscriptionService.isCourseUnlocked(student, course),
                "Faculty gift must not grant full-course unlock");
        assertTrue(subscriptionService.isCourseUnlocked(student, course, teacher1));
        assertFalse(subscriptionService.isCourseUnlocked(student, course, teacher2));
        assertEquals(Set.of(201L), subscriptionService.getUnlockedTeacherIds(student, course));

        assertTrue(subscriptionService.isResourceUnlocked(student, resTeacher1));
        assertFalse(subscriptionService.isResourceUnlocked(student, resTeacher2));
        assertFalse(subscriptionService.isResourceUnlocked(student, resGeneral));
    }

    @Test
    void fullCourseRewardStillUnlocksAllFaculty() {
        UnlockedCourse fullReward = new UnlockedCourse(
                student, course, null, UnlockSource.CONTRIBUTION_REWARD, LocalDateTime.now().plusMonths(3));

        when(subscriptionRepository.findFirstByUserIdAndActiveTrueOrderByStartDateDesc(10L))
                .thenReturn(Optional.empty());
        when(unlockedCourseRepository.findAllByUserIdAndCourseId(10L, 100L))
                .thenReturn(List.of(fullReward));

        Resource resTeacher2 = new Resource();
        resTeacher2.setCourse(course);
        resTeacher2.setTeacher(teacher2);

        assertTrue(subscriptionService.isCourseUnlocked(student, course));
        assertTrue(subscriptionService.isCourseUnlocked(student, course, teacher1));
        assertTrue(subscriptionService.isResourceUnlocked(student, resTeacher2));
    }

    @Test
    void giftRequiresTeacherAndDispatchesBothBellAndEmailNotifications() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(student));
        GiftCourseRequest missingTeacherReq = new GiftCourseRequest("CSE361", null, 4, "Merit");

        assertThrows(ApiException.class,
                () -> adminService.giftCourseToStudent(10L, missingTeacherReq, superAdmin));

        when(courseRepository.findByCodeIgnoreCase("CSE361")).thenReturn(Optional.of(course));
        when(teacherRepository.findById(201L)).thenReturn(Optional.of(teacher1));
        when(unlockedCourseRepository.findByUserIdAndCourseIdAndTeacherId(10L, 100L, 201L))
                .thenReturn(Optional.empty());
        when(emailService.isEmailNotificationsEnabled()).thenReturn(true);
        when(emailService.isSmtpConfigured()).thenReturn(true);

        GiftCourseRequest validReq = new GiftCourseRequest("CSE361", 201L, 4, "Special Grant");
        Map<String, Object> result = adminService.giftCourseToStudent(10L, validReq, superAdmin);

        assertEquals(true, result.get("success"));
        assertEquals(true, result.get("bellNotified"));
        assertEquals(true, result.get("emailQueued"));
        assertEquals(201L, result.get("teacherId"));

        verify(unlockedCourseRepository).save(argThat(uc ->
                uc.getCourse().equals(course)
                        && uc.getTeacher().equals(teacher1)
                        && uc.getSource() == UnlockSource.ADMIN_GIFT));
        verify(notificationService).createNotification(
                eq(student), contains("Gift"), contains("NAAO"), eq("COURSE_GIFT"), eq("/courses/CSE361"));
        verify(emailService).sendCourseGiftEmail(
                eq(student), eq("CSE361"), eq("Operating Systems"), contains("NAAO"), eq(4), eq("Special Grant"));
        verify(liveSyncService).broadcast("course_unlock", "gifted", 10L);
    }
}
