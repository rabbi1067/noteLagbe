package com.notelagbe.service;

import com.notelagbe.entity.Course;
import com.notelagbe.entity.Resource;
import com.notelagbe.entity.ResourceStatus;
import com.notelagbe.entity.ResourceType;
import com.notelagbe.exception.ApiException;
import com.notelagbe.repository.CourseRepository;
import com.notelagbe.repository.ResourceRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Shared canonical normalization and live duplicate detection guard for academic materials.
 * Enforces uniqueness across Admin uploads/edits and Student contributions/approvals.
 */
@Service
public class ResourceDuplicateService {

    private static final List<ResourceStatus> ACTIVE_STATUSES =
            List.of(ResourceStatus.APPROVED, ResourceStatus.PENDING);

    private static final Set<ResourceType> SINGLE_SLOT_EXAM_TYPES = EnumSet.of(
            ResourceType.MID_QUESTION,
            ResourceType.FINAL_QUESTION,
            ResourceType.LAB_FINAL
    );

    private static final Pattern SEASON_FIRST_PATTERN = Pattern.compile(
            "^\\s*(spring|spr|summer|sum|smr|fall|fal|autumn|aut|winter|win)[\\s\\-_/'.,]*(\\d{2}|\\d{4})\\s*$",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern YEAR_FIRST_PATTERN = Pattern.compile(
            "^\\s*(\\d{2}|\\d{4})[\\s\\-_/'.,]*(spring|spr|summer|sum|smr|fall|fal|autumn|aut|winter|win)\\s*$",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern EMBEDDED_YEAR_PATTERN = Pattern.compile("\\b(20\\d{2})\\b");

    private final ResourceRepository resourceRepository;
    private final CourseRepository courseRepository;

    public ResourceDuplicateService(ResourceRepository resourceRepository, CourseRepository courseRepository) {
        this.resourceRepository = resourceRepository;
        this.courseRepository = courseRepository;
    }

    /**
     * Canonicalizes free-text semester strings (e.g. "summer 2025", "SUMMER-2025", "Sum 25", "Fall2026")
     * into a standard format such as "Summer 2025" while preserving custom non-standard labels cleanly.
     */
    public String normalizeSemesterName(String raw) {
        if (raw == null) {
            return "";
        }
        String trimmed = raw.trim().replaceAll("\\s+", " ");
        if (trimmed.isEmpty()) {
            return "";
        }

        Matcher seasonFirst = SEASON_FIRST_PATTERN.matcher(trimmed);
        if (seasonFirst.matches()) {
            String season = canonicalSeason(seasonFirst.group(1));
            String year = canonicalFourDigitYear(seasonFirst.group(2));
            return season + " " + year;
        }

        Matcher yearFirst = YEAR_FIRST_PATTERN.matcher(trimmed);
        if (yearFirst.matches()) {
            String season = canonicalSeason(yearFirst.group(2));
            String year = canonicalFourDigitYear(yearFirst.group(1));
            return season + " " + year;
        }

        return trimmed;
    }

    /**
     * Extracts a 4-digit year from a canonicalized semester string when present.
     */
    public int resolveAcademicYear(String rawSemester, int fallbackYear) {
        String canonical = normalizeSemesterName(rawSemester);
        Matcher yearMatcher = EMBEDDED_YEAR_PATTERN.matcher(canonical);
        if (yearMatcher.find()) {
            try {
                int parsed = Integer.parseInt(yearMatcher.group(1));
                if (parsed >= 2000 && parsed <= 2100) {
                    return parsed;
                }
            } catch (NumberFormatException ignored) {
                // Fall back cleanly
            }
        }
        return fallbackYear > 0 ? fallbackYear : 2026;
    }

    /**
     * Returns a compact lowercase comparison key for semester equality checks.
     */
    public String semesterComparisonKey(String raw) {
        String normalized = normalizeSemesterName(raw);
        if (normalized.isEmpty()) {
            return "";
        }
        return normalized.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "");
    }

    /**
     * Returns a normalized comparison key for titles in multi-item categories (notes, quizzes, labs).
     */
    public String titleComparisonKey(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.trim().toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
    }

    public boolean isSingleSlotExamType(ResourceType type) {
        return type != null && SINGLE_SLOT_EXAM_TYPES.contains(type);
    }

    /**
     * Checks whether an identical material already exists in APPROVED or PENDING status.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> checkDuplicate(
            String courseCode,
            Long teacherId,
            ResourceType type,
            String semesterName,
            String title,
            Long excludeResourceId
    ) {
        String canonicalSemester = normalizeSemesterName(semesterName);
        String semesterKey = semesterComparisonKey(canonicalSemester);
        String titleKey = titleComparisonKey(title);
        boolean singleSlot = isSingleSlotExamType(type);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("duplicate", false);
        result.put("normalizedSemester", canonicalSemester);
        result.put("singleSlotExam", singleSlot);
        result.put("message", null);

        if (courseCode == null || courseCode.trim().isEmpty() || type == null || semesterKey.isEmpty()) {
            return result;
        }
        if (!singleSlot && titleKey.isEmpty()) {
            return result;
        }

        Optional<Course> courseOpt = courseRepository.findByCodeIgnoreCase(courseCode.trim());
        if (courseOpt.isEmpty()) {
            return result;
        }

        Course course = courseOpt.get();
        Long targetTeacherId = (teacherId != null && teacherId > 0) ? teacherId : null;
        List<Resource> candidates = resourceRepository.findByCourseIdAndStatusIn(course.getId(), ACTIVE_STATUSES);

        for (Resource existing : candidates) {
            if (excludeResourceId != null && excludeResourceId.equals(existing.getId())) {
                continue;
            }
            if (existing.getType() != type) {
                continue;
            }
            if (!matchesTeacher(existing, targetTeacherId)) {
                continue;
            }
            if (!semesterKey.equals(semesterComparisonKey(existing.getSemesterName()))) {
                continue;
            }
            if (!singleSlot && !titleKey.equals(titleComparisonKey(existing.getTitle()))) {
                continue;
            }

            return buildDuplicateResponse(existing, course, canonicalSemester, singleSlot);
        }

        return result;
    }

    /**
     * Throws 409 CONFLICT if an active duplicate exists for the given attributes.
     */
    @Transactional(readOnly = true)
    public void assertNoDuplicate(
            String courseCode,
            Long teacherId,
            ResourceType type,
            String semesterName,
            String title,
            Long excludeResourceId
    ) {
        Map<String, Object> check = checkDuplicate(courseCode, teacherId, type, semesterName, title, excludeResourceId);
        if (Boolean.TRUE.equals(check.get("duplicate"))) {
            throw new ApiException(String.valueOf(check.get("message")), HttpStatus.CONFLICT);
        }
    }

    private boolean matchesTeacher(Resource existing, Long targetTeacherId) {
        Long existingTeacherId = existing.getTeacher() != null ? existing.getTeacher().getId() : null;
        if (targetTeacherId == null) {
            return existingTeacherId == null;
        }
        return targetTeacherId.equals(existingTeacherId);
    }

    private Map<String, Object> buildDuplicateResponse(
            Resource existing,
            Course course,
            String canonicalSemester,
            boolean singleSlot
    ) {
        String teacherName = existing.getTeacher() != null
                ? existing.getTeacher().getName()
                : "Central Exam (All Sections)";
        String displaySemester = !canonicalSemester.isEmpty()
                ? canonicalSemester
                : normalizeSemesterName(existing.getSemesterName());
        String typeLabel = formatResourceTypeLabel(existing.getType());
        boolean isPending = existing.getStatus() == ResourceStatus.PENDING;

        String statusPhrase = isPending
                ? "is already submitted and waiting for admin review"
                : "is already uploaded";

        String message = singleSlot
                ? String.format(
                        "Duplicate detected: %s for %s (%s) in %s %s (\"%s\").",
                        typeLabel, course.getCode(), teacherName, displaySemester, statusPhrase, existing.getTitle()
                )
                : String.format(
                        "Duplicate detected: \"%s\" (%s) for %s (%s) in %s %s.",
                        existing.getTitle(), typeLabel, course.getCode(), teacherName, displaySemester, statusPhrase
                );

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("duplicate", true);
        result.put("normalizedSemester", displaySemester);
        result.put("singleSlotExam", singleSlot);
        result.put("existingResourceId", existing.getId());
        result.put("existingTitle", existing.getTitle());
        result.put("existingType", existing.getType().name());
        result.put("existingSemester", existing.getSemesterName());
        result.put("existingStatus", existing.getStatus().name());
        result.put("existingCourseCode", course.getCode());
        result.put("existingTeacherName", teacherName);
        result.put("message", message);
        return result;
    }

    private String canonicalSeason(String token) {
        String lower = token.toLowerCase(Locale.ROOT);
        if (lower.startsWith("spr")) return "Spring";
        if (lower.startsWith("sum") || lower.equals("smr")) return "Summer";
        if (lower.startsWith("fal") || lower.startsWith("aut")) return "Fall";
        if (lower.startsWith("win")) return "Winter";
        return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
    }

    private String canonicalFourDigitYear(String rawYear) {
        if (rawYear.length() == 2) {
            return "20" + rawYear;
        }
        return rawYear;
    }

    private String formatResourceTypeLabel(ResourceType type) {
        if (type == null) return "Material";
        return switch (type) {
            case NOTE -> "Lecture Note";
            case QUESTION_COURSE_IN -> "Course-In Material";
            case MID_QUESTION -> "Midterm Question Paper";
            case FINAL_QUESTION -> "Final Exam Paper";
            case QUIZ_CT -> "Quiz / Class Test";
            case DOC_NOTE -> "Document Note";
            case PROJECT_LINK -> "Project Link";
            case LAB_MANUAL -> "Lab Manual";
            case LAB_QUIZ -> "Lab Quiz";
            case LAB_FINAL -> "Lab Final Exam Paper";
            case LAB_REPORT -> "Lab Report";
            case LAB_HAND_NOTE -> "Lab Hand Note";
            case SYLLABUS -> "Syllabus";
            case OTHERS -> "Material";
        };
    }
}
