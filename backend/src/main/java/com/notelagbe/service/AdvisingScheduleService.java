package com.notelagbe.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.notelagbe.entity.OfferedSection;
import com.notelagbe.entity.User;
import com.notelagbe.repository.OfferedSectionRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class AdvisingScheduleService {

    private static final Logger log = LoggerFactory.getLogger(AdvisingScheduleService.class);
    private static final String DEFAULT_SEMESTER = "Spring 2026";

    private final OfferedSectionRepository sectionRepository;
    private final ObjectMapper objectMapper;

    public AdvisingScheduleService(OfferedSectionRepository sectionRepository, ObjectMapper objectMapper) {
        this.sectionRepository = sectionRepository;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void initDefaultAdvisingData() {
        try {
            long count = sectionRepository.countBySemester(DEFAULT_SEMESTER);
            if (count < 60) {
                log.info("Offered sections count is {} (< 60), seeding verified Southeast University advising catalog...", count);
                seedDefaultSections();
            }
        } catch (Exception e) {
            log.warn("Advising catalog pre-seeding skipped: {}", e.getMessage());
        }
    }

    /**
     * Purges user-uploaded advising sections older than 10 days every night at 3:30 AM
     */
    @Scheduled(cron = "0 30 3 * * ?")
    @Transactional
    public void purgeExpiredSections() {
        try {
            int deleted = sectionRepository.deleteExpiredSections(LocalDateTime.now());
            if (deleted > 0) {
                log.info("Auto-purged {} expired student-uploaded advising sections (10-day retention policy)", deleted);
            }
        } catch (Exception e) {
            log.warn("Scheduled advising purge failed: {}", e.getMessage());
        }
    }

    /**
     * Parses Southeast University UMS HTML string.
     * Note: Admin uploads go to the official Master Catalog.
     * Student uploads are strictly isolated and NEVER merge into or overwrite the Admin Master Catalog!
     */
    @Transactional
    public Map<String, Object> parseAndSaveHtml(String htmlContent, User uploader, String semester) {
        if (htmlContent == null || htmlContent.trim().isEmpty()) {
            throw new IllegalArgumentException("HTML content cannot be empty.");
        }

        String targetSemester = (semester != null && !semester.trim().isEmpty()) ? semester.trim() : DEFAULT_SEMESTER;
        boolean isAdmin = uploader != null && (uploader.getRole().name().contains("ADMIN") || uploader.getRole().name().contains("MANAGER"));

        if (isAdmin) {
            return parseAndSaveAdminMasterHtml(htmlContent, uploader, targetSemester, false);
        }

        // Student Upload: Parse sections and return directly for student session without touching Admin Master DB
        List<ParsedSection> parsedList = parseUmsHtml(htmlContent);
        if (parsedList.isEmpty()) {
            throw new IllegalArgumentException("Could not extract any offered sections from the uploaded HTML. Please ensure it is an official Southeast University UMS advising table.");
        }

        log.info("Student {} uploaded advising HTML with {} sections (isolated from Admin Master)",
                uploader != null ? uploader.getEmail() : "Guest", parsedList.size());

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("totalParsed", parsedList.size());
        result.put("semester", targetSemester);
        result.put("isStudentPrivate", true);
        result.put("sections", parsedList);
        return result;
    }

    /**
     * Official Admin Master Table Importer.
     * Saves official sections with uploaderRole = "ADMIN", expiresAt = null.
     * If replaceExisting is true, purges previous master sections for this semester first.
     */
    @Transactional
    public Map<String, Object> parseAndSaveAdminMasterHtml(
            String htmlContent, User adminUser, String semester, boolean replaceExisting) {
        if (htmlContent == null || htmlContent.trim().isEmpty()) {
            throw new IllegalArgumentException("HTML content cannot be empty.");
        }

        String targetSemester = (semester != null && !semester.trim().isEmpty()) ? semester.trim() : DEFAULT_SEMESTER;
        Long uploaderId = adminUser != null ? adminUser.getId() : null;

        if (replaceExisting) {
            int deleted = sectionRepository.deleteMasterSectionsBySemester(targetSemester);
            log.info("Admin master import: purged {} existing master sections for {}", deleted, targetSemester);
        }

        List<ParsedSection> parsedList = parseUmsHtml(htmlContent);
        if (parsedList.isEmpty()) {
            throw new IllegalArgumentException("Could not extract any offered sections from the uploaded HTML. Please ensure it is an official Southeast University UMS advising table.");
        }

        int createdCount = 0;
        int updatedCount = 0;

        for (ParsedSection ps : parsedList) {
            Optional<OfferedSection> existingOpt = sectionRepository
                    .findByCourseCodeIgnoreCaseAndSectionNumberAndSemester(ps.courseCode, ps.sectionNumber, targetSemester);

            String scheduleJson = serializeSlots(ps.slots);

            if (existingOpt.isPresent()) {
                OfferedSection existing = existingOpt.get();
                existing.setCourseTitle(ps.courseTitle);
                existing.setCredits(ps.credits);
                existing.setFacultyInitial(ps.facultyInitial);
                existing.setFacultyName(ps.facultyName);
                existing.setAvailableSeats(ps.availableSeats);
                existing.setScheduleText(ps.scheduleText);
                existing.setScheduleJson(scheduleJson);
                existing.setUpdatedAt(LocalDateTime.now());
                existing.setExpiresAt(null);
                existing.setUploaderRole("ADMIN");
                existing.setUploadedByUserId(uploaderId);
                sectionRepository.save(existing);
                updatedCount++;
            } else {
                OfferedSection newSec = new OfferedSection(
                        ps.courseCode,
                        ps.sectionNumber,
                        ps.courseTitle,
                        ps.credits,
                        ps.facultyInitial,
                        ps.facultyName,
                        ps.availableSeats,
                        ps.scheduleText,
                        scheduleJson,
                        targetSemester,
                        uploaderId,
                        "ADMIN",
                        null
                );
                sectionRepository.save(newSec);
                createdCount++;
            }
        }

        log.info("Admin Master Advising HTML saved for {}: {} created, {} updated",
                targetSemester, createdCount, updatedCount);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("totalParsed", parsedList.size());
        result.put("createdCount", createdCount);
        result.put("updatedCount", updatedCount);
        result.put("semester", targetSemester);
        result.put("replaceExisting", replaceExisting);
        return result;
    }

    /**
     * Admin: Purges all master advising sections for a specific semester
     */
    @Transactional
    public Map<String, Object> purgeMasterCatalog(String semester) {
        String targetSemester = (semester != null && !semester.trim().isEmpty()) ? semester.trim() : DEFAULT_SEMESTER;
        int deleted = sectionRepository.deleteMasterSectionsBySemester(targetSemester);
        log.info("Admin purged {} master advising sections for semester {}", deleted, targetSemester);
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("deletedCount", deleted);
        res.put("semester", targetSemester);
        return res;
    }

    /**
     * Admin: Deletes an individual offered section by ID
     */
    @Transactional
    public Map<String, Object> deleteSection(Long id) {
        if (!sectionRepository.existsById(id)) {
            throw new IllegalArgumentException("Offered section not found with ID: " + id);
        }
        sectionRepository.deleteById(id);
        log.info("Admin deleted advising section ID: {}", id);
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("deletedId", id);
        return res;
    }

    /**
     * Admin: Resets/restores the official 62 Spring 2026 sections from seed data
     */
    @Transactional
    public Map<String, Object> resetToDefaultCatalog(String semester) {
        String targetSemester = (semester != null && !semester.trim().isEmpty()) ? semester.trim() : DEFAULT_SEMESTER;
        sectionRepository.deleteMasterSectionsBySemester(targetSemester);
        seedDefaultSections();
        long count = sectionRepository.countMasterSectionsBySemester(targetSemester);
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("restoredCount", count);
        res.put("semester", targetSemester);
        return res;
    }

    /**
     * Admin: Retrieves the official Master Table catalog with available semesters and metadata
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getAdminMasterCatalog(String semester) {
        String targetSemester = (semester != null && !semester.trim().isEmpty()) ? semester.trim() : DEFAULT_SEMESTER;
        List<OfferedSection> list = sectionRepository.findBySemesterOrderByCourseCodeAscSectionNumberAsc(targetSemester);

        // Strictly filter to official master sections (ADMIN or SYSTEM)
        List<OfferedSection> masterList = list.stream()
                .filter(s -> "ADMIN".equalsIgnoreCase(s.getUploaderRole()) || "SYSTEM".equalsIgnoreCase(s.getUploaderRole()))
                .collect(Collectors.toList());

        Map<String, List<OfferedSection>> grouped = masterList.stream()
                .collect(Collectors.groupingBy(OfferedSection::getCourseCode, LinkedHashMap::new, Collectors.toList()));

        List<String> distinctFaculties = masterList.stream()
                .map(OfferedSection::getFacultyInitial)
                .filter(f -> f != null && !f.trim().isEmpty())
                .distinct()
                .sorted()
                .collect(Collectors.toList());

        List<String> distinctSemesters = sectionRepository.findDistinctSemesters();
        if (distinctSemesters.isEmpty()) {
            distinctSemesters = List.of(DEFAULT_SEMESTER);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("semester", targetSemester);
        response.put("availableSemesters", distinctSemesters);
        response.put("totalSections", masterList.size());
        response.put("totalCourses", grouped.size());
        response.put("courses", grouped);
        response.put("sections", masterList);
        response.put("faculties", distinctFaculties);
        return response;
    }

    /**
     * Retrieves all active offered sections grouped by course code
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getSectionsCatalog(String semester) {
        String targetSemester = (semester != null && !semester.trim().isEmpty()) ? semester.trim() : DEFAULT_SEMESTER;
        List<OfferedSection> list = sectionRepository.findBySemesterOrderByCourseCodeAscSectionNumberAsc(targetSemester);

        Map<String, List<OfferedSection>> grouped = list.stream()
                .collect(Collectors.groupingBy(OfferedSection::getCourseCode, LinkedHashMap::new, Collectors.toList()));

        List<String> distinctFaculties = sectionRepository.findDistinctFacultyInitialsBySemester(targetSemester);

        List<String> distinctSemesters = sectionRepository.findDistinctSemesters();
        if (distinctSemesters.isEmpty()) {
            distinctSemesters = List.of(DEFAULT_SEMESTER);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("semester", targetSemester);
        response.put("availableSemesters", distinctSemesters);
        response.put("totalSections", list.size());
        response.put("totalCourses", grouped.size());
        response.put("courses", grouped);
        response.put("faculties", distinctFaculties);
        return response;
    }

    /**
     * Multi-Objective Conflict-Free Routine Generator
     */
    @Transactional(readOnly = true)
    public Map<String, Object> generateRoutines(
            List<String> selectedCourses,
            String timePreference,
            String dayPreference,
            List<String> preferredDays,
            Map<String, List<String>> facultyPreferences,
            String semester) {

        String targetSemester = (semester != null && !semester.trim().isEmpty()) ? semester.trim() : DEFAULT_SEMESTER;

        if (selectedCourses == null || selectedCourses.isEmpty()) {
            throw new IllegalArgumentException("Please select at least 1 course to generate routines.");
        }

        List<String> cleanCourseCodes = selectedCourses.stream()
                .map(c -> c.trim().toUpperCase())
                .filter(c -> !c.isEmpty())
                .distinct()
                .collect(Collectors.toList());

        // Fetch sections for each course
        List<List<OfferedSection>> courseSectionsList = new ArrayList<>();
        Map<String, OfferedSection> sectionCache = new HashMap<>();

        for (String cCode : cleanCourseCodes) {
            List<OfferedSection> secs = sectionRepository.findByCourseCodeIgnoreCaseAndSemester(cCode, targetSemester);
            if (secs.isEmpty()) {
                throw new IllegalArgumentException("No offered sections found for course: " + cCode + " in " + targetSemester);
            }
            courseSectionsList.add(secs);
            for (OfferedSection s : secs) {
                sectionCache.put(s.getFullSectionCode(), s);
            }
        }

        // Generate clash-free combinations with strict target days prioritization
        boolean hasPreferredDays = preferredDays != null && !preferredDays.isEmpty() && preferredDays.size() < 7;
        Set<String> prefSet = hasPreferredDays
                ? preferredDays.stream().map(String::toUpperCase).collect(Collectors.toSet())
                : Collections.emptySet();

        List<List<OfferedSection>> validCombinations = new ArrayList<>();
        boolean strictMatchesFound = false;
        List<String> coursesWithNoStrictSections = new ArrayList<>();

        if (hasPreferredDays) {
            // Tier 1: Try strict filtering first (only candidate sections whose slots all lie in prefSet)
            List<List<OfferedSection>> strictSectionsList = new ArrayList<>();
            boolean allCoursesHaveStrictSecs = true;

            for (int i = 0; i < cleanCourseCodes.size(); i++) {
                String cCode = cleanCourseCodes.get(i);
                List<OfferedSection> allSecs = courseSectionsList.get(i);
                List<OfferedSection> strictSecs = allSecs.stream().filter(s -> {
                    List<TimeSlot> slots = parseSlots(s.getScheduleJson());
                    if (slots.isEmpty()) return false;
                    return slots.stream().allMatch(slot -> prefSet.contains(slot.day.toUpperCase()));
                }).collect(Collectors.toList());

                // Prioritize preferred faculty within strict sections
                List<String> prefFacs = (facultyPreferences != null) ? facultyPreferences.get(cCode) : null;
                if (prefFacs != null && !prefFacs.isEmpty()) {
                    strictSecs.sort((s1, s2) -> {
                        int r1 = prefFacs.indexOf(s1.getFacultyInitial());
                        int r2 = prefFacs.indexOf(s2.getFacultyInitial());
                        int score1 = (r1 == 0) ? -2 : (r1 > 0 ? -1 : 0);
                        int score2 = (r2 == 0) ? -2 : (r2 > 0 ? -1 : 0);
                        return Integer.compare(score1, score2);
                    });
                }

                if (strictSecs.isEmpty()) {
                    allCoursesHaveStrictSecs = false;
                    coursesWithNoStrictSections.add(cCode);
                } else {
                    strictSectionsList.add(strictSecs);
                }
            }

            if (allCoursesHaveStrictSecs && strictSectionsList.size() == cleanCourseCodes.size()) {
                backtrackCombinations(strictSectionsList, 0, new ArrayList<>(), validCombinations);
                if (!validCombinations.isEmpty()) {
                    strictMatchesFound = true;
                }
            }
        }

        // Tier 2: If no target day filter or if strict mode yielded 0 clash-free combinations:
        if (validCombinations.isEmpty()) {
            List<List<OfferedSection>> prioritizedList = new ArrayList<>();
            for (int i = 0; i < cleanCourseCodes.size(); i++) {
                String cCode = cleanCourseCodes.get(i);
                List<OfferedSection> secs = courseSectionsList.get(i);
                List<OfferedSection> sortedSecs = new ArrayList<>(secs);
                List<String> prefFacs = (facultyPreferences != null) ? facultyPreferences.get(cCode) : null;

                sortedSecs.sort((s1, s2) -> {
                    // 1. Preferred faculty priority first
                    if (prefFacs != null && !prefFacs.isEmpty()) {
                        int r1 = prefFacs.indexOf(s1.getFacultyInitial());
                        int r2 = prefFacs.indexOf(s2.getFacultyInitial());
                        int fScore1 = (r1 == 0) ? -2 : (r1 > 0 ? -1 : 0);
                        int fScore2 = (r2 == 0) ? -2 : (r2 > 0 ? -1 : 0);
                        if (fScore1 != fScore2) {
                            return Integer.compare(fScore1, fScore2);
                        }
                    }
                    // 2. Preferred days priority
                    if (hasPreferredDays) {
                        long out1 = parseSlots(s1.getScheduleJson()).stream().filter(slot -> !prefSet.contains(slot.day.toUpperCase())).count();
                        long out2 = parseSlots(s2.getScheduleJson()).stream().filter(slot -> !prefSet.contains(slot.day.toUpperCase())).count();
                        return Long.compare(out1, out2);
                    }
                    return 0;
                });
                prioritizedList.add(sortedSecs);
            }
            backtrackCombinations(prioritizedList, 0, new ArrayList<>(), validCombinations);
        }

        if (validCombinations.isEmpty()) {
            Map<String, Object> emptyRes = new HashMap<>();
            emptyRes.put("success", true);
            emptyRes.put("totalCombinationsTested", 0);
            emptyRes.put("validRoutinesCount", 0);
            emptyRes.put("routines", Collections.emptyList());
            emptyRes.put("strictDayMatch", false);
            emptyRes.put("coursesWithNoStrictSections", coursesWithNoStrictSections);
            emptyRes.put("message", "No 100% clash-free routine combination is possible with these chosen courses. Try swapping one course or offering alternate sections.");
            return emptyRes;
        }

        // Score each combination
        List<ScoredRoutine> scoredList = new ArrayList<>();
        for (List<OfferedSection> combo : validCombinations) {
            ScoredRoutine sr = scoreCombination(combo, timePreference, dayPreference, preferredDays, facultyPreferences);
            scoredList.add(sr);
        }

        // Multi-Objective Hierarchy Master Sort:
        // 1. Outside Days: 0 outside days strictly first
        // 2. Strict Timing Window Compliance: 0 outside-window classes strictly first
        // 3. Preferred Faculty Priority: routines with more preferred faculty matches rank strictly higher
        // 4. Minimum Dead Gap Priority: routines with minimal gap (<=15m) rank first in Top 5
        // 5. Composite score fallback
        scoredList.sort((a, b) -> {
            if (preferredDays != null && !preferredDays.isEmpty()) {
                long aOutside = a.activeDays.stream().filter(d -> !prefSet.contains(d)).count();
                long bOutside = b.activeDays.stream().filter(d -> !prefSet.contains(d)).count();
                if (aOutside != bOutside) {
                    return Long.compare(aOutside, bOutside); // Fewer outside days first
                }
            }

            // 2. Strict Timing Window Compliance
            if (a.outsideWindowCount != b.outsideWindowCount) {
                return Integer.compare(a.outsideWindowCount, b.outsideWindowCount);
            }

            // 3. Preferred Faculty Priority
            if (a.facultyMatchCount != b.facultyMatchCount) {
                return Integer.compare(b.facultyMatchCount, a.facultyMatchCount);
            }

            // 4. Minimum Dead Gap Priority (Top 5 guaranteed minimal waiting gaps)
            if (Math.abs(a.totalGapMinutes - b.totalGapMinutes) >= 15.0) {
                return Double.compare(a.totalGapMinutes, b.totalGapMinutes);
            }

            // 5. Composite score fallback
            return Double.compare(b.score, a.score);
        });

        // Limit top 10 routines and assign rank
        List<ScoredRoutine> topRoutines = new ArrayList<>();
        for (int i = 0; i < Math.min(10, scoredList.size()); i++) {
            ScoredRoutine sr = scoredList.get(i);
            sr.rank = i + 1;
            topRoutines.add(sr);
        }

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("totalCombinationsTested", validCombinations.size());
        res.put("validRoutinesCount", scoredList.size());
        res.put("semester", targetSemester);
        res.put("strictDayMatch", strictMatchesFound);
        res.put("coursesWithNoStrictSections", coursesWithNoStrictSections);
        res.put("routines", topRoutines);
        return res;
    }

    private void backtrackCombinations(
            List<List<OfferedSection>> courses,
            int courseIndex,
            List<OfferedSection> current,
            List<List<OfferedSection>> result) {

        if (result.size() >= 500) {
            // Cap search to prevent memory exhaustion on large sets
            return;
        }

        if (courseIndex == courses.size()) {
            result.add(new ArrayList<>(current));
            return;
        }

        List<OfferedSection> sectionsForThisCourse = courses.get(courseIndex);
        for (OfferedSection candidate : sectionsForThisCourse) {
            if (!hasConflict(current, candidate)) {
                current.add(candidate);
                backtrackCombinations(courses, courseIndex + 1, current, result);
                current.remove(current.size() - 1);
            }
        }
    }

    private boolean hasConflict(List<OfferedSection> existing, OfferedSection candidate) {
        List<TimeSlot> candidateSlots = parseSlots(candidate.getScheduleJson());
        for (OfferedSection sec : existing) {
            List<TimeSlot> secSlots = parseSlots(sec.getScheduleJson());
            for (TimeSlot s1 : secSlots) {
                for (TimeSlot s2 : candidateSlots) {
                    if (s1.day.equalsIgnoreCase(s2.day)) {
                        // Conflict condition: max(start1, start2) < min(end1, end2)
                        int startMax = Math.max(s1.startMinutes, s2.startMinutes);
                        int endMin = Math.min(s1.endMinutes, s2.endMinutes);
                        if (startMax < endMin) {
                            return true; // Overlap detected!
                        }
                    }
                }
            }
        }
        return false;
    }

    private ScoredRoutine scoreCombination(
            List<OfferedSection> sections,
            String timePref,
            String dayPref,
            List<String> preferredDays,
            Map<String, List<String>> facultyPreferences) {

        double score = 100.0;
        List<String> highlights = new ArrayList<>();

        // 1. Gather all active slots
        Map<String, List<TimeSlot>> daySlots = new HashMap<>();
        Set<String> activeDays = new TreeSet<>();
        int totalCredits = 0;

        for (OfferedSection s : sections) {
            totalCredits += (s.getCredits() != null ? s.getCredits() : 3.0);
            List<TimeSlot> slots = parseSlots(s.getScheduleJson());
            for (TimeSlot slot : slots) {
                daySlots.computeIfAbsent(slot.day.toUpperCase(), k -> new ArrayList<>()).add(slot);
                activeDays.add(slot.day.toUpperCase());
            }
        }

        // Day count bonus/penalty
        int daysCount = activeDays.size();
        if (daysCount <= 2) {
            score += 60.0;
            highlights.add("⚡ Only " + daysCount + " Campus Days");
        } else if (daysCount == 3) {
            score += 35.0;
            highlights.add("🗓️ Balanced " + daysCount + " Days Schedule");
        } else if (daysCount >= 5) {
            score -= 25.0;
        }

        // Day preference matching
        if (preferredDays != null && !preferredDays.isEmpty()) {
            Set<String> prefSet = preferredDays.stream().map(String::toUpperCase).collect(Collectors.toSet());
            long outsideCount = activeDays.stream().filter(d -> !prefSet.contains(d)).count();
            if (outsideCount == 0) {
                score += 150.0;
                highlights.add("🎯 100% Target Days (" + String.join("+", activeDays) + ")");
            } else {
                score -= outsideCount * 90.0;
                highlights.add("⚠️ Includes " + activeDays.stream().filter(d -> !prefSet.contains(d)).collect(Collectors.joining(", ")));
            }
        }

        // Time preferences
        boolean hasEarlyMorning = false;
        boolean hasLateEvening = false;
        int morningCount = 0;
        int afternoonCount = 0;

        for (List<TimeSlot> slots : daySlots.values()) {
            for (TimeSlot slot : slots) {
                if (slot.startMinutes < 600) { // before 10:00 (e.g. 08:00 or 08:30)
                    hasEarlyMorning = true;
                }
                if (slot.endMinutes > 990) { // after 16:30
                    hasLateEvening = true;
                }
                if (slot.startMinutes >= 510 && slot.startMinutes <= 780) { // 08:30 - 13:00
                    morningCount++;
                }
                if (slot.startMinutes >= 690 && slot.startMinutes <= 990) { // 11:30 - 16:30
                    afternoonCount++;
                }
            }
        }

        // Time window & custom preferences
        int targetStartMin = -1;
        int targetEndMin = -1;
        String windowLabel = "";

        if ("WINDOW_10_TO_1".equalsIgnoreCase(timePref)) {
            targetStartMin = 600;
            targetEndMin = 780;
            windowLabel = "10:00 AM - 01:00 PM";
        } else if ("WINDOW_10_TO_3".equalsIgnoreCase(timePref)) {
            targetStartMin = 600;
            targetEndMin = 900;
            windowLabel = "10:00 AM - 03:00 PM";
        } else if ("WINDOW_800_TO_1130".equalsIgnoreCase(timePref) || "WINDOW_830_TO_1130".equalsIgnoreCase(timePref)) {
            targetStartMin = 480; // 08:00 AM accommodates 08:00 AM lab and 08:30 theory
            targetEndMin = 690;
            windowLabel = "08:00 AM - 11:30 AM";
        } else if ("WINDOW_130_TO_430".equalsIgnoreCase(timePref)) {
            targetStartMin = 810;
            targetEndMin = 990;
            windowLabel = "01:30 PM - 04:30 PM";
        } else if ("WINDOW_300_TO_630".equalsIgnoreCase(timePref) || "WINDOW_300_TO_600".equalsIgnoreCase(timePref)) {
            targetStartMin = 900;
            targetEndMin = 1110; // 06:30 PM accommodates evening lab running up to 06:30 PM
            windowLabel = "03:00 PM - 06:30 PM";
        } else if (timePref != null && timePref.toUpperCase().startsWith("CUSTOM_")) {
            try {
                String[] parts = timePref.split("_");
                if (parts.length >= 3) {
                    targetStartMin = Integer.parseInt(parts[1]);
                    targetEndMin = Integer.parseInt(parts[2]);
                    windowLabel = formatMinutesTo12(targetStartMin) + " - " + formatMinutesTo12(targetEndMin);
                }
            } catch (Exception e) {
                log.warn("Failed to parse custom time preference {}: {}", timePref, e.getMessage());
            }
        }

        int outsideWindowCount = 0;
        if (targetStartMin >= 0 && targetEndMin > targetStartMin) {
            int insideCount = 0;
            int totalSlotsCount = 0;
            for (OfferedSection s : sections) {
                for (TimeSlot sl : parseSlots(s.getScheduleJson())) {
                    totalSlotsCount++;
                    if (sl.startMinutes >= targetStartMin && sl.endMinutes <= targetEndMin) {
                        insideCount++;
                    } else {
                        outsideWindowCount++;
                    }
                }
            }
            if (outsideWindowCount == 0) {
                score += 250.0;
                highlights.add("🎯 100% Fits " + windowLabel + " Window");
            } else {
                score -= outsideWindowCount * 120.0;
                highlights.add("⚠️ " + outsideWindowCount + " class(es) outside " + windowLabel);
            }
        } else if ("AVOID_MORNING".equalsIgnoreCase(timePref)) {
            for (OfferedSection s : sections) {
                for (TimeSlot sl : parseSlots(s.getScheduleJson())) {
                    if (sl.startMinutes < 600) outsideWindowCount++;
                }
            }
            if (outsideWindowCount == 0) {
                score += 200.0;
                highlights.add("☀️ No Early 08:30 Classes");
            } else {
                score -= outsideWindowCount * 120.0;
            }
        } else if ("AVOID_LATE".equalsIgnoreCase(timePref)) {
            for (OfferedSection s : sections) {
                for (TimeSlot sl : parseSlots(s.getScheduleJson())) {
                    if (sl.endMinutes > 990) outsideWindowCount++;
                }
            }
            if (outsideWindowCount == 0) {
                score += 150.0;
                highlights.add("🌇 No Late Afternoon Classes");
            } else {
                score -= outsideWindowCount * 100.0;
            }
        } else if ("PREFER_MORNING".equalsIgnoreCase(timePref)) {
            score += morningCount * 15.0;
            if (morningCount > afternoonCount) highlights.add("🌅 Morning Centered");
        } else if ("PREFER_AFTERNOON".equalsIgnoreCase(timePref)) {
            score += afternoonCount * 15.0;
            if (afternoonCount > morningCount) highlights.add("☕ Afternoon Focused");
        }

        // Faculty preferences (HIGH PRIORITY)
        int facultyMatches = 0;
        int targetFacTotal = 0;
        if (facultyPreferences != null && !facultyPreferences.isEmpty()) {
            for (OfferedSection s : sections) {
                List<String> preferredForCourse = facultyPreferences.get(s.getCourseCode());
                if (preferredForCourse != null && !preferredForCourse.isEmpty()) {
                    targetFacTotal++;
                    String initial = s.getFacultyInitial();
                    int rank = preferredForCourse.indexOf(initial);
                    if (rank == 0) {
                        score += 250.0; // Top preferred faculty matched!
                        facultyMatches++;
                    } else if (rank > 0) {
                        score += 180.0; // Alternate preferred faculty matched!
                        facultyMatches++;
                    } else {
                        score -= 100.0; // Preference specified but not matched
                    }
                }
            }
            if (targetFacTotal > 0 && facultyMatches == targetFacTotal) {
                highlights.add("⭐ 100% Preferred Faculty Matched (" + facultyMatches + "/" + targetFacTotal + ")");
            } else if (facultyMatches > 0) {
                highlights.add("⭐ " + facultyMatches + "/" + targetFacTotal + " Preferred Faculty");
            }
        }

        // Multi-objective Gap Calculations & Back-to-Back Class Optimization
        double totalGapMinutes = 0;
        double consecutiveBonus = 0;
        double longGapPenalty = 0;
        for (List<TimeSlot> slots : daySlots.values()) {
            slots.sort(Comparator.comparingInt(a -> a.startMinutes));
            for (int i = 0; i < slots.size() - 1; i++) {
                int gap = slots.get(i + 1).startMinutes - slots.get(i).endMinutes;
                if (gap <= 15) {
                    consecutiveBonus += 100.0; // Ideal consecutive classes (10-15m transition between rooms)
                } else if (gap <= 40) {
                    consecutiveBonus += 30.0; // Short break
                    totalGapMinutes += gap;
                } else {
                    totalGapMinutes += gap;
                    longGapPenalty += (gap / 15.0) * 35.0; // Heavy penalty for long dead waiting gaps
                }
            }
        }

        score += consecutiveBonus;
        score -= longGapPenalty;

        if (totalGapMinutes == 0) {
            highlights.add("⏱️ 0m Gap (Back-to-Back Classes)");
        } else if (totalGapMinutes <= 45) {
            highlights.add("⏱️ Compact (" + (int) totalGapMinutes + "m Total Gap)");
        } else {
            highlights.add("⏱️ " + (int) totalGapMinutes + "m Total Gaps");
        }

        // Calculate match percentage (clamped between 65% and 99%)
        int matchPercentage = (int) Math.min(99, Math.max(65, Math.round((score / 240.0) * 100.0)));

        ScoredRoutine sr = new ScoredRoutine();
        sr.sections = sections;
        sr.score = score;
        sr.matchPercentage = matchPercentage;
        sr.activeDaysCount = daysCount;
        sr.activeDays = new ArrayList<>(activeDays);
        sr.totalCredits = totalCredits;
        sr.hasEarlyMorning = hasEarlyMorning;
        sr.hasLateEvening = hasLateEvening;
        sr.totalGapMinutes = totalGapMinutes;
        sr.facultyMatchCount = facultyMatches;
        sr.outsideWindowCount = outsideWindowCount;
        sr.highlights = highlights;
        return sr;
    }

    public static class ScoredRoutine {
        public List<OfferedSection> sections;
        public double score;
        public int matchPercentage;
        public int rank;
        public int activeDaysCount;
        public List<String> activeDays;
        public int totalCredits;
        public double totalGapMinutes;
        public int facultyMatchCount;
        public int outsideWindowCount;
        public boolean hasEarlyMorning;
        public boolean hasLateEvening;
        public List<String> highlights;
    }

    public static class TimeSlot {
        public String day;
        public String start;
        public String end;
        public String room;
        public int startMinutes;
        public int endMinutes;

        public TimeSlot() {}
        public TimeSlot(String day, String start, String end, String room) {
            this.day = day;
            this.start = start;
            this.end = end;
            this.room = room;
            this.startMinutes = toMinutes(start);
            this.endMinutes = toMinutes(end);
        }
    }

    private static int toMinutes(String timeStr) {
        if (timeStr == null || !timeStr.contains(":")) return 0;
        try {
            String[] parts = timeStr.trim().split(":");
            return Integer.parseInt(parts[0]) * 60 + Integer.parseInt(parts[1]);
        } catch (Exception e) {
            return 0;
        }
    }

    private String serializeSlots(List<TimeSlot> slots) {
        try {
            return objectMapper.writeValueAsString(slots);
        } catch (Exception e) {
            return "[]";
        }
    }

    private List<TimeSlot> parseSlots(String json) {
        if (json == null || json.trim().isEmpty()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<List<TimeSlot>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private static class ParsedSection {
        String courseCode;
        String sectionNumber;
        String courseTitle;
        Double credits = 3.0;
        String facultyInitial;
        String facultyName;
        Integer availableSeats = 40;
        String scheduleText;
        List<TimeSlot> slots = new ArrayList<>();
    }

    /**
     * Regex extractor for Southeast University Angular UMS table
     */
    private List<ParsedSection> parseUmsHtml(String html) {
        List<ParsedSection> list = new ArrayList<>();
        String[] blocks = html.split("ums-grid-offered-section");

        Pattern secPattern1 = Pattern.compile("class=\"[^\"]*mat-mdc-tooltip-trigger[^\"]*\"[^>]*>\\s*([A-Za-z0-9]+\\.[0-9]+)\\s*<");
        Pattern secPattern2 = Pattern.compile(">\\s*([A-Z]{3}\\d{3}\\.\\d+)\\s*<");
        Pattern titlePattern = Pattern.compile("hidden md:block[^\"]*\">[\\s\\S]*?<div[^>]*>([^<]+)</div>");
        Pattern credPattern = Pattern.compile("ml-3[^\"]*\">([0-9.]+)<");
        Pattern facPattern = Pattern.compile("\\[([A-Za-z0-9_-]+)\\]\\s*([^<]+)<");
        Pattern seatsPattern = Pattern.compile("(\\d+)\\s*</div>\\s*<div[^>]*><div[^>]*class=\"[^\"]*ng-star-inserted");
        Pattern schedPattern = Pattern.compile("(?i)(SUN|MON|TUE|WED|THU|FRI|SAT)\\s*#?\\s*([0-9]{1,2}:[0-9]{2})\\s*(?:~|---|--|–|—|-|to)\\s*([0-9]{1,2}:[0-9]{2})(?:\\s*@?\\s*([A-Za-z0-9_-]+))?");

        for (int i = 1; i < blocks.length; i++) {
            String chunk = blocks[i].length() > 3000 ? blocks[i].substring(0, 3000) : blocks[i];

            Matcher secM = secPattern1.matcher(chunk);
            if (!secM.find()) {
                secM = secPattern2.matcher(chunk);
                if (!secM.find()) continue;
            }
            String fullSection = secM.group(1).trim();
            if (!fullSection.contains(".")) continue;

            String[] secParts = fullSection.split("\\.");
            String courseCode = secParts[0].trim().toUpperCase();
            String sectionNum = secParts[1].trim();

            Matcher titleM = titlePattern.matcher(chunk);
            String title = titleM.find() ? titleM.group(1).trim() : courseCode;

            Matcher credM = credPattern.matcher(chunk);
            Double credits = 3.0;
            if (credM.find()) {
                try { credits = Double.parseDouble(credM.group(1).trim()); } catch (Exception ignored) {}
            }

            Matcher facM = facPattern.matcher(chunk);
            String facInit = facM.find() ? facM.group(1).trim().toUpperCase() : "TBA";
            String facName = facM.group(2) != null ? facM.group(2).trim() : "To Be Announced";

            Matcher seatsM = seatsPattern.matcher(chunk);
            int seats = 40;
            if (seatsM.find()) {
                try { seats = Integer.parseInt(seatsM.group(1).trim()); } catch (Exception ignored) {}
            }

            Matcher schedM = schedPattern.matcher(chunk);
            List<TimeSlot> slots = new ArrayList<>();
            StringBuilder schedSummary = new StringBuilder();
            while (schedM.find()) {
                String day = schedM.group(1).trim().toUpperCase();
                String start = schedM.group(2).trim();
                String end = schedM.group(3).trim();
                String room = schedM.group(4) != null ? schedM.group(4).trim() : "SEU-TBA";
                slots.add(new TimeSlot(day, start, end, room));
                if (schedSummary.length() > 0) schedSummary.append(" / ");
                schedSummary.append(day).append(" # ").append(start).append(" ~ ").append(end).append(" @ ").append(room);
            }

            if (!slots.isEmpty()) {
                ParsedSection ps = new ParsedSection();
                ps.courseCode = courseCode;
                ps.sectionNumber = sectionNum;
                ps.courseTitle = title;
                ps.credits = credits;
                ps.facultyInitial = facInit;
                ps.facultyName = facName;
                ps.availableSeats = seats;
                ps.scheduleText = schedSummary.toString();
                ps.slots = slots;
                list.add(ps);
            }
        }
        if (list.isEmpty()) {
            list = parseRawTextOrGenericTable(html);
        }
        return list;
    }

    /**
     * Resilient parser for copied UMS text, TSV tables, or non-Angular HTML tables
     * (e.g. direct copy-paste from browser table or seu-routine-builder text)
     */
    private List<ParsedSection> parseRawTextOrGenericTable(String input) {
        List<ParsedSection> list = new ArrayList<>();
        if (input == null || input.trim().isEmpty()) return list;

        String text = input;
        if (text.contains("<") && text.contains(">")) {
            text = text.replaceAll("(?i)<br\\s*/?>", "\n")
                       .replaceAll("(?i)</(?:div|p|tr|li|td)>", "\n")
                       .replaceAll("<[^>]+>", " ")
                       .replace("&amp;", "&")
                       .replace("&nbsp;", " ");
        }

        Pattern secPattern = Pattern.compile("(?i)(?:^|[\\r\\n\\s|,\t;<>(])([A-Z]{2,5}\\s*\\d{2,4})\\s*(?:\\.|-|\\s+sec(?:tion)?\\s*|\\s+#\\s*)\\s*(\\d{1,3})(?:[\\r\\n\\s|,\t;<>)]|$)");
        Matcher secMatcher = secPattern.matcher(text);

        List<Integer> matchStarts = new ArrayList<>();
        List<String> courseCodes = new ArrayList<>();
        List<String> sectionNums = new ArrayList<>();

        while (secMatcher.find()) {
            matchStarts.add(secMatcher.start(1));
            courseCodes.add(secMatcher.group(1).replaceAll("\\s+", "").toUpperCase());
            sectionNums.add(secMatcher.group(2).trim());
        }

        if (matchStarts.isEmpty()) return list;

        Pattern schedPattern = Pattern.compile("(?i)(SUN|MON|TUE|WED|THU|FRI|SAT)\\s*#?\\s*([0-9]{1,2}:[0-9]{2})\\s*(?:~|---|--|–|—|-|to)\\s*([0-9]{1,2}:[0-9]{2})(?:\\s*@?\\s*([A-Za-z0-9_-]+))?");
        Pattern facPattern = Pattern.compile("\\[([A-Za-z0-9_-]{2,6})\\]\\s*([^\\n\\r0-9<]+)?");
        Pattern credPattern = Pattern.compile("(?:^|\\s)(1\\.0|1\\.5|2\\.0|3\\.0|4\\.0|1|2|3|4)(?:\\s|Cr|cr|Credits|\\b)");

        for (int i = 0; i < matchStarts.size(); i++) {
            int start = matchStarts.get(i);
            int end = (i + 1 < matchStarts.size()) ? matchStarts.get(i + 1) : text.length();
            String chunk = text.substring(start, end);

            String courseCode = courseCodes.get(i);
            String secNum = sectionNums.get(i);

            Matcher schedM = schedPattern.matcher(chunk);
            List<TimeSlot> slots = new ArrayList<>();
            StringBuilder schedSummary = new StringBuilder();
            while (schedM.find()) {
                String day = schedM.group(1).trim().toUpperCase();
                String startTime = normalizeTime(schedM.group(2).trim());
                String endTime = normalizeTime(schedM.group(3).trim());
                String room = schedM.group(4) != null ? schedM.group(4).trim() : "SEU-TBA";
                slots.add(new TimeSlot(day, startTime, endTime, room));
                if (schedSummary.length() > 0) schedSummary.append(" / ");
                schedSummary.append(day).append(" # ").append(startTime).append(" ~ ").append(endTime).append(" @ ").append(room);
            }

            if (slots.isEmpty()) {
                slots.add(new TimeSlot("SUN", "08:30", "09:50", "SEU-TBA"));
                schedSummary.append("Schedule TBA");
            }

            String facInit = "TBA";
            String facName = "To Be Announced";
            Matcher facM = facPattern.matcher(chunk);
            if (facM.find()) {
                facInit = facM.group(1).trim().toUpperCase();
                if (facM.group(2) != null && !facM.group(2).trim().isEmpty()) {
                    facName = facM.group(2).trim().replaceAll("\\s+", " ");
                }
            }

            Double credits = (courseCode.endsWith("2") || courseCode.endsWith("4") || courseCode.endsWith("6") || courseCode.endsWith("8")) ? 1.0 : 3.0;
            Matcher credM = credPattern.matcher(chunk);
            if (credM.find()) {
                try {
                    credits = Double.parseDouble(credM.group(1).trim());
                } catch (Exception ignored) {}
            }

            int availableSeats = 40;
            String title = courseCode;
            if (chunk.contains("\t")) {
                String[] cols = chunk.split("\t");
                if (cols.length >= 2) {
                    String candidate = cols[1].replaceAll("\\[.*?\\]", "").replaceAll("\\d+", "").trim();
                    if (candidate.length() >= 3 && !candidate.equalsIgnoreCase("CSE.") && !candidate.equalsIgnoreCase("CSE")) {
                        title = candidate;
                    }
                }
                if (cols.length >= 5) {
                    try {
                        availableSeats = Integer.parseInt(cols[4].trim());
                    } catch (Exception ignored) {}
                }
            } else {
                String afterSec = chunk.replaceFirst("^[A-Z]{3,4}\\d{3}\\.\\d+", "").trim();
                String[] lines = afterSec.split("[\\r\\n]+");
                for (String line : lines) {
                    String candidate = line.replaceAll("\\[.*?\\]", "").replaceAll("\\d+\\s*(?:Cr|cr)?", "").trim();
                    if (candidate.isEmpty()) continue;
                    String upper = candidate.toUpperCase();
                    if (upper.equals("CSE.") || upper.equals("CSE") || upper.equals("EEE.") || upper.equals("EEE") ||
                        upper.equals("BBA.") || upper.equals("BBA") || upper.startsWith("B.SC") ||
                        upper.startsWith("DEPT") || upper.contains("SUN") || upper.contains("MON") ||
                        upper.contains("TUE") || upper.contains("WED") || upper.contains("THU") || upper.contains("FRI") || upper.contains("SAT")) {
                        continue;
                    }
                    if (candidate.length() >= 3) {
                        title = candidate;
                        break;
                    }
                }
            }

            ParsedSection ps = new ParsedSection();
            ps.courseCode = courseCode;
            ps.sectionNumber = secNum;
            ps.courseTitle = title;
            ps.credits = credits;
            ps.facultyInitial = facInit;
            ps.facultyName = facName;
            ps.availableSeats = availableSeats;
            ps.scheduleText = schedSummary.toString();
            ps.slots = slots;
            list.add(ps);
        }

        return list;
    }

    private String normalizeTime(String t) {
        if (t == null) return "00:00";
        t = t.trim();
        if (t.matches("^\\d:\\d{2}$")) {
            return "0" + t;
        }
        return t;
    }

    private String formatMinutesTo12(int totalMinutes) {
        int hours = totalMinutes / 60;
        int mins = totalMinutes % 60;
        String period = hours >= 12 ? "PM" : "AM";
        int h12 = hours % 12;
        if (h12 == 0) h12 = 12;
        return String.format("%02d:%02d %s", h12, mins, period);
    }

    /**
     * Seeds the authentic 62 Southeast University sections from UMS dataset (seu_offered_sections.json)
     */
    private void seedDefaultSections() {
        try {
            Resource resource = new ClassPathResource("data/seu_offered_sections.json");
            if (resource.exists()) {
                List<Map<String, Object>> list = objectMapper.readValue(
                        resource.getInputStream(),
                        new TypeReference<List<Map<String, Object>>>() {}
                );
                for (Map<String, Object> map : list) {
                    String courseCode = (String) map.get("courseCode");
                    String sectionNumber = String.valueOf(map.get("sectionNumber"));
                    String courseTitle = (String) map.get("courseTitle");
                    Double credits = ((Number) map.get("credits")).doubleValue();
                    String facultyInitial = (String) map.get("facultyInitial");
                    String facultyName = (String) map.get("facultyName");
                    String scheduleText = (String) map.get("scheduleText");
                    Object slots = map.get("slots");
                    String scheduleJson = objectMapper.writeValueAsString(slots);

                    Optional<OfferedSection> existingOpt = sectionRepository
                            .findByCourseCodeIgnoreCaseAndSectionNumberAndSemester(courseCode, sectionNumber, DEFAULT_SEMESTER);

                    if (existingOpt.isPresent()) {
                        OfferedSection existing = existingOpt.get();
                        existing.setCourseTitle(courseTitle);
                        existing.setCredits(credits);
                        existing.setFacultyInitial(facultyInitial);
                        existing.setFacultyName(facultyName);
                        existing.setScheduleText(scheduleText);
                        existing.setScheduleJson(scheduleJson);
                        sectionRepository.save(existing);
                    } else {
                        OfferedSection os = new OfferedSection(
                                courseCode, sectionNumber, courseTitle, credits,
                                facultyInitial, facultyName, 40, scheduleText,
                                scheduleJson, DEFAULT_SEMESTER, null, "SYSTEM", null
                        );
                        sectionRepository.save(os);
                    }
                }
                log.info("Successfully seeded {} real Southeast University advising sections from seu_offered_sections.json", list.size());
            } else {
                log.warn("Resource data/seu_offered_sections.json not found on classpath!");
            }
        } catch (Exception e) {
            log.warn("Failed to seed default advising sections: {}", e.getMessage());
        }
    }
}
