package com.notelagbe.service;

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
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

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
    @Mock private CacheManager cacheManager;

    private ResourceDuplicateService duplicateService;
    private ResourceService resourceService;
    private Course cse141;
    private Teacher sakibSir;

    @BeforeEach
    void setUp() {
        duplicateService = new ResourceDuplicateService(resourceRepository, courseRepository);
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
    void singleSlotExamBlocksDuplicatesAcrossVariantsAndPending() {
        Resource existingMid = buildResource(10L, "CSE141 Mid Paper", ResourceType.MID_QUESTION, "Summer 2025", sakibSir, ResourceStatus.APPROVED);
        when(courseRepository.findByCodeIgnoreCase("CSE141")).thenReturn(Optional.of(cse141));
        when(resourceRepository.findByCourseIdAndStatusIn(eq(101L), any())).thenReturn(List.of(existingMid));

        // Lowercase hyphenated semester + different title STILL blocks single-slot MID_QUESTION
        Map<String, Object> dupCheck = duplicateService.checkDuplicate(
                "CSE141", 202L, ResourceType.MID_QUESTION, "summer-2025", "Completely Different Title", null
        );
        assertEquals(Boolean.TRUE, dupCheck.get("duplicate"));
        assertEquals("Summer 2025", dupCheck.get("normalizedSemester"));
        assertEquals(10L, dupCheck.get("existingResourceId"));
        assertTrue(String.valueOf(dupCheck.get("message")).contains("CSE141"));

        // Different exam type (FINAL_QUESTION) for same course/teacher/semester is allowed
        Map<String, Object> finalAllowed = duplicateService.checkDuplicate(
                "CSE141", 202L, ResourceType.FINAL_QUESTION, "summer 2025", "CSE141 Final", null
        );
        assertEquals(Boolean.FALSE, finalAllowed.get("duplicate"));

        // Different teacher (303L) or Central (-1 / null) is allowed
        Map<String, Object> otherTeacherAllowed = duplicateService.checkDuplicate(
                "CSE141", 303L, ResourceType.MID_QUESTION, "summer 2025", "Mid", null
        );
        assertEquals(Boolean.FALSE, otherTeacherAllowed.get("duplicate"));

        Map<String, Object> centralAllowed = duplicateService.checkDuplicate(
                "CSE141", -1L, ResourceType.MID_QUESTION, "summer 2025", "Mid", null
        );
        assertEquals(Boolean.FALSE, centralAllowed.get("duplicate"));

        // Editing self excludes existingResourceId
        Map<String, Object> selfExcluded = duplicateService.checkDuplicate(
                "CSE141", 202L, ResourceType.MID_QUESTION, "Summer 2025", "Updated Title", 10L
        );
        assertEquals(Boolean.FALSE, selfExcluded.get("duplicate"));
    }

    @Test
    void multiItemMaterialsAllowDistinctTitlesAndBlockIdenticalTitles() {
        Resource quiz1 = buildResource(20L, "Quiz 1", ResourceType.QUIZ_CT, "Summer 2025", sakibSir, ResourceStatus.PENDING);
        when(courseRepository.findByCodeIgnoreCase("CSE141")).thenReturn(Optional.of(cse141));
        when(resourceRepository.findByCourseIdAndStatusIn(eq(101L), any())).thenReturn(List.of(quiz1));

        // Distinct title Quiz 2 is allowed
        Map<String, Object> quiz2Allowed = duplicateService.checkDuplicate(
                "CSE141", 202L, ResourceType.QUIZ_CT, "summer 2025", "Quiz 2", null
        );
        assertEquals(Boolean.FALSE, quiz2Allowed.get("duplicate"));

        // Matching normalized title "quiz-1" against PENDING resource blocks with status context
        Map<String, Object> quiz1Blocked = duplicateService.checkDuplicate(
                "CSE141", 202L, ResourceType.QUIZ_CT, "Sum 25", "quiz-1", null
        );
        assertEquals(Boolean.TRUE, quiz1Blocked.get("duplicate"));
        assertEquals("PENDING", quiz1Blocked.get("existingStatus"));

        // Empty title should not trigger false positive while typing
        Map<String, Object> emptyTitle = duplicateService.checkDuplicate(
                "CSE141", 202L, ResourceType.QUIZ_CT, "Summer 2025", "", null
        );
        assertEquals(Boolean.FALSE, emptyTitle.get("duplicate"));
    }

    @Test
    void createResourceThrowsConflictAndNormalizesSemester() {
        Resource centralFinal = buildResource(30L, "Central Final", ResourceType.FINAL_QUESTION, "Fall 2026", null, ResourceStatus.APPROVED);
        when(courseRepository.findByCodeIgnoreCase("CSE141")).thenReturn(Optional.of(cse141));
        when(resourceRepository.findByCourseIdAndStatusIn(eq(101L), any())).thenReturn(List.of(centralFinal));

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

        Resource existingApproved = buildResource(40L, "CSE141 Summer Mid", ResourceType.MID_QUESTION, "Summer 2025", sakibSir, ResourceStatus.APPROVED);
        Resource rejectedOld = buildResource(41L, "Old Rejected Mid", ResourceType.MID_QUESTION, "Fall 2025", sakibSir, ResourceStatus.REJECTED);
        when(courseRepository.findByCodeIgnoreCase("CSE141")).thenReturn(Optional.of(cse141));
        when(teacherRepository.findById(202L)).thenReturn(Optional.of(sakibSir));
        when(resourceRepository.findByCourseIdAndStatusIn(eq(101L), any())).thenReturn(List.of(existingApproved));

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

        // Rejected resource should NOT block a fresh check in Fall 2025
        when(resourceRepository.findByCourseIdAndStatusIn(eq(101L), any())).thenReturn(List.of(existingApproved));
        assertEquals(Boolean.FALSE, duplicateService.checkDuplicate("CSE141", 202L, ResourceType.MID_QUESTION, "Fall 2025", "Fall Mid", null).get("duplicate"));
        assertEquals(ResourceStatus.REJECTED, rejectedOld.getStatus());

        // Approving a PENDING contribution whose attributes collide with an APPROVED record throws 409 CONFLICT
        Resource pendingOwn = buildResource(50L, "Pending Mid", ResourceType.MID_QUESTION, "Summer 2025", sakibSir, ResourceStatus.PENDING);
        ContributionRequest cr = new ContributionRequest();
        cr.setId(99L);
        cr.setUser(student);
        cr.setStatus(ResourceStatus.PENDING);
        cr.setUploadedResource(pendingOwn);
        when(contributionRequestRepository.findById(99L)).thenReturn(Optional.of(cr));
        when(resourceRepository.findByCourseIdAndStatusIn(eq(101L), any())).thenReturn(List.of(existingApproved, pendingOwn));

        ApiException approveConflict = assertThrows(
                ApiException.class,
                () -> contributionService.approveContribution(99L, "ok", null, 202L, "MID_QUESTION", "summer-2025", "CSE141", "CSE")
        );
        assertEquals(HttpStatus.CONFLICT, approveConflict.getStatus());
    }

    private Resource buildResource(Long id, String title, ResourceType type, String semester, Teacher teacher, ResourceStatus status) {
        Resource r = new Resource();
        r.setId(id);
        r.setTitle(title);
        r.setType(type);
        r.setSemesterName(semester);
        r.setCourse(cse141);
        r.setTeacher(teacher);
        r.setStatus(status);
        return r;
    }
}
