package com.notelagbe.service;

import com.notelagbe.config.CacheConfig;
import com.notelagbe.dto.ContributionSubmitRequest;
import com.notelagbe.dto.ResourceCreateRequest;
import com.notelagbe.entity.*;
import com.notelagbe.exception.ApiException;
import com.notelagbe.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.CacheManager;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ResourceDuplicateGuardTest {

    @Mock private ResourceRepository resourceRepository;
    @Mock private CourseRepository courseRepository;
    @Mock private TeacherRepository teacherRepository;
    @Mock private UnlockedCourseRepository unlockedCourseRepository;
    @Mock private SubscriptionRepository subscriptionRepository;
    @Mock private SubscriptionService subscriptionService;
    @Mock private LiveSyncService liveSyncService;
    @Mock private ContributionRequestRepository contributionRequestRepository;
    @Mock private CloudinaryService cloudinaryService;
    @Mock private TeacherCourseRepository teacherCourseRepository;

    private CacheManager cacheManager;
    private ResourceDuplicateService duplicateService;
    private ResourceService resourceService;
    private Course cse141;
    private Teacher sakibSir;

    @BeforeEach
    void setUp() {
        cacheManager = new ConcurrentMapCacheManager(
                CacheConfig.CACHE_DUPLICATE_SLOTS,
                "courses", "course_details", "teachers", "teacher_details",
                "teacher_courses", "course_resources", "teacher_resources"
        );
        duplicateService = new ResourceDuplicateService(resourceRepository, courseRepository, cacheManager);
        resourceService = new ResourceService(
                resourceRepository, courseRepository, teacherRepository, unlockedCourseRepository,
                subscriptionRepository, subscriptionService, liveSyncService, contributionRequestRepository,
                cloudinaryService, teacherCourseRepository, cacheManager, duplicateService
        );

        cse141 = new Course();
        cse141.setId(101L);
        cse141.setCode("CSE141");
        cse141.setTitle("Computer Fundamentals");
        cse141.setDepartment("CSE");

        sakibSir = new Teacher();
        sakibSir.setId(202L);
        sakibSir.setName("Md. Sakib Sir");
        sakibSir.setInitial("SKB");
    }

    @Test
    void normalizesFreeTextSemestersCanonicalFormat() {
        assertEquals("Summer 2025", duplicateService.normalizeSemesterName("summer 2025"));
        assertEquals("Summer 2025", duplicateService.normalizeSemesterName("  SUMMER-2025 "));
        assertEquals("Summer 2025", duplicateService.normalizeSemesterName("Sum 25"));
        assertEquals("Fall 2026", duplicateService.normalizeSemesterName("Fall2026"));
        assertEquals("Spring 2028", duplicateService.normalizeSemesterName("2028 spr"));
        assertEquals("Summer 2025", duplicateService.normalizeSemesterName("Summer '25"));
        assertEquals("All Semesters", duplicateService.normalizeSemesterName("All   Semesters"));
        assertEquals(2025, duplicateService.resolveAcademicYear("sum 25", 2026));
    }

    @Test
    void singleSlotExamBlocksDuplicatesAndUsesSingleQueryCache() {
        Object[] existingMidRow = slotRow(10L, "CSE141 Mid Paper", ResourceType.MID_QUESTION, "Summer 2025", ResourceStatus.APPROVED, "CSE141", 202L, "Md. Sakib Sir");
        when(resourceRepository.findActiveDuplicateSlotsByCourseCode(eq("CSE141"), any()))
                .thenReturn(List.<Object[]>of(existingMidRow));

        Map<String, Object> dupCheck = duplicateService.checkDuplicate(
                "CSE141", 202L, ResourceType.MID_QUESTION, "summer-2025", "Completely Different Title", null
        );
        assertEquals(Boolean.TRUE, dupCheck.get("duplicate"));
        assertEquals("Summer 2025", dupCheck.get("normalizedSemester"));
        assertEquals(10L, dupCheck.get("existingResourceId"));
        assertTrue(String.valueOf(dupCheck.get("message")).contains("CSE141"));

        // Subsequent checks hit Spring CacheManager instead of re-querying DB
        Map<String, Object> finalAllowed = duplicateService.checkDuplicate(
                "CSE141", 202L, ResourceType.FINAL_QUESTION, "summer 2025", "CSE141 Final", null
        );
        assertEquals(Boolean.FALSE, finalAllowed.get("duplicate"));

        Map<String, Object> otherTeacherAllowed = duplicateService.checkDuplicate(
                "CSE141", 303L, ResourceType.MID_QUESTION, "summer 2025", "Mid", null
        );
        assertEquals(Boolean.FALSE, otherTeacherAllowed.get("duplicate"));

        Map<String, Object> centralAllowed = duplicateService.checkDuplicate(
                "CSE141", -1L, ResourceType.MID_QUESTION, "summer 2025", "Mid", null
        );
        assertEquals(Boolean.FALSE, centralAllowed.get("duplicate"));

        Map<String, Object> selfExcluded = duplicateService.checkDuplicate(
                "CSE141", 202L, ResourceType.MID_QUESTION, "Summer 2025", "Updated Title", 10L
        );
        assertEquals(Boolean.FALSE, selfExcluded.get("duplicate"));

        // Verify only 1 DB call happened across 5 checks, then evictCourse refreshes
        verify(resourceRepository, times(1)).findActiveDuplicateSlotsByCourseCode(eq("CSE141"), any());
        duplicateService.evictCourse("CSE141");
        Map<String, Object> slotsPayload = duplicateService.getDuplicateSlotsResponse("CSE141");
        assertEquals("CSE141", slotsPayload.get("courseCode"));
        assertEquals(1, ((List<?>) slotsPayload.get("items")).size());
        verify(resourceRepository, times(2)).findActiveDuplicateSlotsByCourseCode(eq("CSE141"), any());
    }

    @Test
    void multiItemMaterialsAllowMultipleQuizAndCtPerSemester() {
        Object[] quiz1Row = slotRow(20L, "Quiz 1", ResourceType.QUIZ_CT, "Summer 2025", ResourceStatus.PENDING, "CSE141", 202L, "Md. Sakib Sir");
        lenient().when(resourceRepository.findActiveDuplicateSlotsByCourseCode(eq("CSE141"), any()))
                .thenReturn(List.<Object[]>of(quiz1Row));

        // Quiz 2 in same semester is allowed
        Map<String, Object> quiz2Allowed = duplicateService.checkDuplicate(
                "CSE141", 202L, ResourceType.QUIZ_CT, "summer 2025", "Quiz 2", null
        );
        assertEquals(Boolean.FALSE, quiz2Allowed.get("duplicate"));

        // Multiple faculty-administered CTs/quizzes in same semester are explicitly permitted
        Map<String, Object> anotherCtAllowed = duplicateService.checkDuplicate(
                "CSE141", 202L, ResourceType.QUIZ_CT, "Sum 25", "quiz-1", null
        );
        assertEquals(Boolean.FALSE, anotherCtAllowed.get("duplicate"));

        Map<String, Object> emptyTitle = duplicateService.checkDuplicate(
                "CSE141", 202L, ResourceType.QUIZ_CT, "Summer 2025", "", null
        );
        assertEquals(Boolean.FALSE, emptyTitle.get("duplicate"));
    }

    @Test
    void createResourceThrowsConflictAndNormalizesSemester() {
        Object[] centralFinalRow = slotRow(30L, "Central Final", ResourceType.FINAL_QUESTION, "Fall 2026", ResourceStatus.APPROVED, "CSE141", null, null);
        when(courseRepository.findByCodeIgnoreCase("CSE141")).thenReturn(Optional.of(cse141));
        when(resourceRepository.findActiveDuplicateSlotsByCourseCode(eq("CSE141"), any()))
                .thenReturn(List.<Object[]>of(centralFinalRow));

        ResourceCreateRequest req = new ResourceCreateRequest();
        req.setCourseCode("CSE141");
        req.setTeacherId(null);
        req.setType(ResourceType.FINAL_QUESTION);
        req.setSemesterName("fall-2026");
        req.setTitle("Another Central Final");
        req.setFileUrl("https://example.com/final.pdf");

        ApiException conflict = assertThrows(ApiException.class, () -> resourceService.createResource(req, null));
        assertEquals(HttpStatus.CONFLICT, conflict.getStatus());
    }

    @Test
    void contributionSubmitAndApproveEnforceDuplicateGuardAndAllowRejected() {
        InputSanitizationService sanitizer = new InputSanitizationService(mock(ProfanityFilterService.class));
        ContributionService contributionService = new ContributionService(
                contributionRequestRepository,
                resourceRepository,
                courseRepository,
                teacherRepository,
                teacherCourseRepository,
                unlockedCourseRepository,
                liveSyncService,
                sanitizer,
                mock(NotificationService.class),
                duplicateService
        );

        Object[] existingApprovedRow = slotRow(40L, "CSE141 Summer Mid", ResourceType.MID_QUESTION, "Summer 2025", ResourceStatus.APPROVED, "CSE141", 202L, "Md. Sakib Sir");
        when(teacherRepository.findById(202L)).thenReturn(Optional.of(sakibSir));
        when(resourceRepository.findActiveDuplicateSlotsByCourseCode(eq("CSE141"), any()))
                .thenReturn(List.<Object[]>of(existingApprovedRow));

        ContributionSubmitRequest dupSubmit = new ContributionSubmitRequest();
        dupSubmit.setTitle("Another Mid Paper Copy");
        dupSubmit.setResourceType(ResourceType.MID_QUESTION);
        dupSubmit.setFileUrl("https://example.com/mid.pdf");
        dupSubmit.setSemesterName("summer 2025");
        dupSubmit.setCourseCode("CSE141");
        dupSubmit.setTeacherId(202L);
        dupSubmit.setRequestedCourseCode1("CSE142");
        dupSubmit.setRequestedCourseCode2("CSE143");

        User student = new User("Student", "s@seu.edu.bd", "hash", "202300001", Role.ROLE_STUDENT);
        ApiException submitConflict = assertThrows(ApiException.class, () -> contributionService.submitContribution(dupSubmit, student));
        assertEquals(HttpStatus.CONFLICT, submitConflict.getStatus());

        assertEquals(Boolean.FALSE, duplicateService.checkDuplicate("CSE141", 202L, ResourceType.MID_QUESTION, "Fall 2025", "Fall Mid", null).get("duplicate"));

        Resource pendingOwn = new Resource();
        pendingOwn.setId(50L);
        pendingOwn.setTitle("Pending Mid");
        pendingOwn.setType(ResourceType.MID_QUESTION);
        pendingOwn.setSemesterName("Summer 2025");
        pendingOwn.setCourse(cse141);
        pendingOwn.setTeacher(sakibSir);
        pendingOwn.setStatus(ResourceStatus.PENDING);

        Object[] pendingOwnRow = slotRow(50L, "Pending Mid", ResourceType.MID_QUESTION, "Summer 2025", ResourceStatus.PENDING, "CSE141", 202L, "Md. Sakib Sir");
        duplicateService.evictAll();
        when(courseRepository.findByCodeIgnoreCase("CSE141")).thenReturn(Optional.of(cse141));
        when(resourceRepository.findActiveDuplicateSlotsByCourseCode(eq("CSE141"), any()))
                .thenReturn(List.<Object[]>of(existingApprovedRow, pendingOwnRow));

        ContributionRequest cr = new ContributionRequest();
        cr.setId(99L);
        cr.setUser(student);
        cr.setStatus(ResourceStatus.PENDING);
        cr.setUploadedResource(pendingOwn);
        when(contributionRequestRepository.findById(99L)).thenReturn(Optional.of(cr));

        ApiException approveConflict = assertThrows(
                ApiException.class,
                () -> contributionService.approveContribution(99L, "ok", null, 202L, "MID_QUESTION", "summer-2025", "CSE141", "CSE")
        );
        assertEquals(HttpStatus.CONFLICT, approveConflict.getStatus());
    }

    private Object[] slotRow(
            Long id,
            String title,
            ResourceType type,
            String semesterName,
            ResourceStatus status,
            String courseCode,
            Long teacherId,
            String teacherName
    ) {
        return new Object[] { id, title, type, semesterName, status, courseCode, teacherId, teacherName };
    }
}
