package com.notelagbe.service;

import com.notelagbe.config.CacheConfig;
import com.notelagbe.entity.ResourceStatus;
import com.notelagbe.entity.ResourceType;
import com.notelagbe.exception.ApiException;
import com.notelagbe.repository.CourseRepository;
import com.notelagbe.repository.ResourceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Shared canonical normalization and ultra-fast cached duplicate detection guard for academic materials.
 * Uses a single scalar JPQL projection (no EAGER entity/uploader hydration) plus Spring CacheManager caching.
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

    /**
     * Faculty-administered assessments that explicitly allow multiple distinct tests per semester
     * (e.g. CT 1, CT 2, CT 3, Quiz 1, Surprise Quiz, Section A/B variants).
     * These should NEVER be blocked by single-slot semester duplicate detection.
     */
    private static final Set<ResourceType> MULTI_INSTANCE_SEMESTER_TYPES = EnumSet.of(
            ResourceType.QUIZ_CT,
            ResourceType.LAB_QUIZ
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
    private final CacheManager cacheManager;

    public ResourceDuplicateService(ResourceRepository resourceRepository, CourseRepository courseRepository) {
        this(resourceRepository, courseRepository, null);
    }

    @Autowired
    public ResourceDuplicateService(
            ResourceRepository resourceRepository,
            CourseRepository courseRepository,
            CacheManager cacheManager
    ) {
        this.resourceRepository = resourceRepository;
        this.courseRepository = courseRepository;
        this.cacheManager = cacheManager;
    }

    /**
     * Compact immutable representation of an active (APPROVED or PENDING) material slot.
     */
    public record ActiveSlot(
            Long id,
            String title,
            String titleKey,
            ResourceType type,
            String semesterName,
            String normalizedSemester,
            String semesterKey,
            ResourceStatus status,
            String courseCode,
            Long teacherId,
            String teacherName,
            boolean singleSlotExam
    ) {}

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

    public String semesterComparisonKey(String raw) {
        String normalized = normalizeSemesterName(raw);
        if (normalized.isEmpty()) {
            return "";
        }
        return normalized.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "");
    }

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
     * Returns all active duplicate slots for a course from RAM cache or a single scalar JPQL query.
     */
    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<ActiveSlot> getActiveSlotsForCourse(String courseCode) {
        if (courseCode == null || courseCode.trim().isEmpty()) {
            return List.of();
        }
        String cleanCode = courseCode.trim();
        String cacheKey = cleanCode.toLowerCase(Locale.ROOT);
        Cache cache = cacheManager != null ? cacheManager.getCache(CacheConfig.CACHE_DUPLICATE_SLOTS) : null;
        if (cache != null) {
            List<ActiveSlot> cached = cache.get(cacheKey, List.class);
            if (cached != null) {
                return cached;
            }
        }

        List<Object[]> rows = resourceRepository.findActiveDuplicateSlotsByCourseCode(cleanCode, ACTIVE_STATUSES);
        List<ActiveSlot> slots = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            slots.add(toActiveSlot(row));
        }

        if (cache != null) {
            cache.put(cacheKey, List.copyOf(slots));
        }
        return slots;
    }

    /**
     * Returns lightweight slot metadata so clients can validate keystrokes locally in <1ms.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getDuplicateSlotsResponse(String courseCode) {
        List<ActiveSlot> slots = getActiveSlotsForCourse(courseCode);
        List<Map<String, Object>> items = new ArrayList<>(slots.size());
        for (ActiveSlot slot : slots) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", slot.id());
            item.put("title", slot.title());
            item.put("titleKey", slot.titleKey());
            item.put("type", slot.type() != null ? slot.type().name() : null);
            item.put("semesterName", slot.semesterName());
            item.put("normalizedSemester", slot.normalizedSemester());
            item.put("semesterKey", slot.semesterKey());
            item.put("status", slot.status() != null ? slot.status().name() : null);
            item.put("courseCode", slot.courseCode());
            item.put("teacherId", slot.teacherId());
            item.put("teacherName", slot.teacherName());
            item.put("singleSlotExam", slot.singleSlotExam());
            items.add(item);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("courseCode", courseCode != null ? courseCode.trim().toUpperCase(Locale.ROOT) : "");
        response.put("items", items);
        return response;
    }

    public void evictCourse(String courseCode) {
        if (cacheManager == null || courseCode == null || courseCode.trim().isEmpty()) {
            return;
        }
        Cache cache = cacheManager.getCache(CacheConfig.CACHE_DUPLICATE_SLOTS);
        if (cache != null) {
            cache.evict(courseCode.trim().toLowerCase(Locale.ROOT));
        }
    }

    public void evictAll() {
        if (cacheManager == null) {
            return;
        }
        Cache cache = cacheManager.getCache(CacheConfig.CACHE_DUPLICATE_SLOTS);
        if (cache != null) {
            cache.clear();
        }
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

        // Quizzes & Class Tests (CTs) are faculty-administered and frequently have multiple
        // distinct tests (CT 1, CT 2, CT 3, Section A, Section B) within the exact same semester.
        // They are explicitly multi-instance and should never be blocked from multiple uploads per semester.
        if (MULTI_INSTANCE_SEMESTER_TYPES.contains(type)) {
            return result;
        }

        if (!singleSlot && titleKey.isEmpty()) {
            return result;
        }

        Long targetTeacherId = (teacherId != null && teacherId > 0) ? teacherId : null;
        List<ActiveSlot> candidates = getActiveSlotsForCourse(courseCode);

        for (ActiveSlot existing : candidates) {
            if (excludeResourceId != null && excludeResourceId.equals(existing.id())) {
                continue;
            }
            if (existing.type() != type) {
                continue;
            }
            if (!Objects.equals(targetTeacherId, existing.teacherId())) {
                continue;
            }
            if (!semesterKey.equals(existing.semesterKey())) {
                continue;
            }
            if (!singleSlot && !titleKey.equals(existing.titleKey())) {
                continue;
            }

            return buildDuplicateResponse(existing, canonicalSemester, singleSlot);
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

    private ActiveSlot toActiveSlot(Object[] row) {
        Long id = row[0] != null ? ((Number) row[0]).longValue() : null;
        String title = row[1] != null ? String.valueOf(row[1]) : "";
        ResourceType type = parseType(row[2]);
        String semName = row[3] != null ? String.valueOf(row[3]) : "";
        ResourceStatus status = parseStatus(row[4]);
        String cCode = row[5] != null ? String.valueOf(row[5]) : "";
        Long tId = row[6] != null ? ((Number) row[6]).longValue() : null;
        String tName = row[7] != null ? String.valueOf(row[7]) : "Central Exam (All Sections)";
        String normalizedSem = normalizeSemesterName(semName);

        return new ActiveSlot(
                id,
                title,
                titleComparisonKey(title),
                type,
                semName,
                normalizedSem,
                semesterComparisonKey(normalizedSem),
                status,
                cCode,
                tId,
                tName,
                isSingleSlotExamType(type)
        );
    }

    private ResourceType parseType(Object raw) {
        if (raw instanceof ResourceType rt) return rt;
        if (raw == null) return null;
        try {
            return ResourceType.valueOf(String.valueOf(raw).trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private ResourceStatus parseStatus(Object raw) {
        if (raw instanceof ResourceStatus rs) return rs;
        if (raw == null) return ResourceStatus.APPROVED;
        try {
            return ResourceStatus.valueOf(String.valueOf(raw).trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ignored) {
            return ResourceStatus.APPROVED;
        }
    }

    private Map<String, Object> buildDuplicateResponse(
            ActiveSlot existing,
            String canonicalSemester,
            boolean singleSlot
    ) {
        String displaySemester = !canonicalSemester.isEmpty()
                ? canonicalSemester
                : existing.normalizedSemester();
        String typeLabel = formatResourceTypeLabel(existing.type());
        boolean isPending = existing.status() == ResourceStatus.PENDING;

        String statusPhrase = isPending
                ? "is already submitted and waiting for admin review"
                : "is already uploaded";

        String message = singleSlot
                ? String.format(
                        "Duplicate detected: %s for %s (%s) in %s %s (\"%s\").",
                        typeLabel, existing.courseCode(), existing.teacherName(), displaySemester, statusPhrase, existing.title()
                )
                : String.format(
                        "Duplicate detected: \"%s\" (%s) for %s (%s) in %s %s.",
                        existing.title(), typeLabel, existing.courseCode(), existing.teacherName(), displaySemester, statusPhrase
                );

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("duplicate", true);
        result.put("normalizedSemester", displaySemester);
        result.put("singleSlotExam", singleSlot);
        result.put("existingResourceId", existing.id());
        result.put("existingTitle", existing.title());
        result.put("existingType", existing.type() != null ? existing.type().name() : null);
        result.put("existingSemester", existing.semesterName());
        result.put("existingStatus", existing.status() != null ? existing.status().name() : null);
        result.put("existingCourseCode", existing.courseCode());
        result.put("existingTeacherName", existing.teacherName());
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
