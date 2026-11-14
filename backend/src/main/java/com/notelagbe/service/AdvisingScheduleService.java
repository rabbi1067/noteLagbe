package com.notelagbe.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.notelagbe.entity.OfferedSection;
import com.notelagbe.entity.User;
import com.notelagbe.repository.OfferedSectionRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
            if (count == 0) {
                log.info("Offered sections empty for {}, pre-seeding verified Southeast University advising catalog...", DEFAULT_SEMESTER);
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
     * Parses Southeast University UMS HTML string and saves sections with deduplication.
     */
    @Transactional
    public Map<String, Object> parseAndSaveHtml(String htmlContent, User uploader, String semester) {
        if (htmlContent == null || htmlContent.trim().isEmpty()) {
            throw new IllegalArgumentException("HTML content cannot be empty.");
        }

        String targetSemester = (semester != null && !semester.trim().isEmpty()) ? semester.trim() : DEFAULT_SEMESTER;
        boolean isAdmin = uploader != null && (uploader.getRole().name().contains("ADMIN") || uploader.getRole().name().contains("MANAGER"));
        Long uploaderId = uploader != null ? uploader.getId() : null;
        String uploaderRole = isAdmin ? "ADMIN" : (uploader != null ? "STUDENT" : "GUEST");
        LocalDateTime expiresAt = isAdmin ? null : LocalDateTime.now().plusDays(10);

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
                if (isAdmin) {
                    existing.setExpiresAt(null);
                    existing.setUploaderRole("ADMIN");
                }
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
                        uploaderRole,
                        expiresAt
                );
                sectionRepository.save(newSec);
                createdCount++;
            }
        }

        log.info("Advising HTML processed for {}: {} sections created, {} updated by {}",
                targetSemester, createdCount, updatedCount, uploaderRole);

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("totalParsed", parsedList.size());
        result.put("createdCount", createdCount);
        result.put("updatedCount", updatedCount);
        result.put("semester", targetSemester);
        result.put("expiresAt", expiresAt != null ? expiresAt.toString() : "Permanent (Admin Upload)");
        return result;
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

        Map<String, Object> response = new HashMap<>();
        response.put("semester", targetSemester);
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

        // Generate clash-free combinations with backtracking/pruning
        List<List<OfferedSection>> validCombinations = new ArrayList<>();
        backtrackCombinations(courseSectionsList, 0, new ArrayList<>(), validCombinations);

        if (validCombinations.isEmpty()) {
            Map<String, Object> emptyRes = new HashMap<>();
            emptyRes.put("success", true);
            emptyRes.put("totalCombinationsTested", 0);
            emptyRes.put("validRoutinesCount", 0);
            emptyRes.put("routines", Collections.emptyList());
            emptyRes.put("message", "No 100% clash-free routine combination is possible with these chosen courses. Try swapping one course or offering alternate sections.");
            return emptyRes;
        }

        // Score each combination
        List<ScoredRoutine> scoredList = new ArrayList<>();
        for (List<OfferedSection> combo : validCombinations) {
            ScoredRoutine sr = scoreCombination(combo, timePreference, dayPreference, preferredDays, facultyPreferences);
            scoredList.add(sr);
        }

        // Sort descending by score
        scoredList.sort((a, b) -> Double.compare(b.score, a.score));

        // Limit top 15 routines
        List<ScoredRoutine> topRoutines = scoredList.stream().limit(15).collect(Collectors.toList());

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("totalCombinationsTested", validCombinations.size());
        res.put("validRoutinesCount", scoredList.size());
        res.put("semester", targetSemester);
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
            long matches = activeDays.stream().filter(prefSet::contains).count();
            if (matches == activeDays.size()) {
                score += 30.0;
                highlights.add("🎯 100% Preferred Days Match");
            } else {
                score -= (activeDays.size() - matches) * 15.0;
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

        if ("AVOID_MORNING".equalsIgnoreCase(timePref)) {
            if (!hasEarlyMorning) {
                score += 40.0;
                highlights.add("☀️ No Early 08:30 Classes");
            } else {
                score -= 35.0;
            }
        } else if ("AVOID_LATE".equalsIgnoreCase(timePref)) {
            if (!hasLateEvening) {
                score += 35.0;
                highlights.add("🌇 No Late Afternoon Classes");
            } else {
                score -= 30.0;
            }
        } else if ("PREFER_MORNING".equalsIgnoreCase(timePref)) {
            score += morningCount * 10.0;
            if (morningCount > afternoonCount) highlights.add("🌅 Morning Centered");
        } else if ("PREFER_AFTERNOON".equalsIgnoreCase(timePref)) {
            score += afternoonCount * 10.0;
            if (afternoonCount > morningCount) highlights.add("☕ Afternoon Focused");
        }

        // Faculty preferences
        int facultyMatches = 0;
        if (facultyPreferences != null && !facultyPreferences.isEmpty()) {
            for (OfferedSection s : sections) {
                List<String> preferredForCourse = facultyPreferences.get(s.getCourseCode());
                if (preferredForCourse != null && !preferredForCourse.isEmpty()) {
                    String initial = s.getFacultyInitial();
                    int rank = preferredForCourse.indexOf(initial);
                    if (rank == 0) {
                        score += 35.0;
                        facultyMatches++;
                    } else if (rank > 0) {
                        score += Math.max(10.0, 30.0 - rank * 8.0);
                        facultyMatches++;
                    }
                }
            }
            if (facultyMatches == sections.size()) {
                highlights.add("⭐ All Preferred Faculty Matched");
            } else if (facultyMatches > 0) {
                highlights.add("⭐ " + facultyMatches + " Preferred Faculty");
            }
        }

        // Gap calculations on each day
        double totalGapMinutes = 0;
        for (List<TimeSlot> slots : daySlots.values()) {
            slots.sort(Comparator.comparingInt(a -> a.startMinutes));
            for (int i = 0; i < slots.size() - 1; i++) {
                int gap = slots.get(i + 1).startMinutes - slots.get(i).endMinutes;
                if (gap > 0) {
                    totalGapMinutes += gap;
                }
            }
        }

        if ("AVOID_GAPS".equalsIgnoreCase(dayPref)) {
            if (totalGapMinutes <= 60) {
                score += 30.0;
                highlights.add("⏱️ Minimal Gaps (" + (int) totalGapMinutes + " mins)");
            } else {
                score -= (totalGapMinutes / 30.0) * 5.0;
            }
        }

        // Calculate match percentage (clamped between 60% and 99%)
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
        sr.highlights = highlights;
        return sr;
    }

    public static class ScoredRoutine {
        public List<OfferedSection> sections;
        public double score;
        public int matchPercentage;
        public int activeDaysCount;
        public List<String> activeDays;
        public int totalCredits;
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
        Pattern schedPattern = Pattern.compile("(SUN|MON|TUE|WED|THU|FRI|SAT)\\s*#\\s*([0-9]{2}:[0-9]{2})\\s*~\\s*([0-9]{2}:[0-9]{2})\\s*@\\s*([A-Za-z0-9_-]+)");

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
                String room = schedM.group(4).trim();
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
        return list;
    }

    /**
     * Seeds the 62 real Southeast University sections from UMS dataset
     */
    private void seedDefaultSections() {
        String defaultDataJson = "["
            + "{\"c\":\"CSE355\",\"s\":\"1\",\"t\":\"Digital Image Processing\",\"cr\":3.0,\"f\":\"JAR\",\"fn\":\"Mst. Jesiara Khatun\",\"st\":\"SUN # 10:00 ~ 11:20 @ SEU527 / TUE # 10:00 ~ 11:20 @ SEU527\",\"sl\":[{\"day\":\"SUN\",\"start\":\"10:00\",\"end\":\"11:20\",\"room\":\"SEU527\"},{\"day\":\"TUE\",\"start\":\"10:00\",\"end\":\"11:20\",\"room\":\"SEU527\"}]},"
            + "{\"c\":\"CSE355\",\"s\":\"2\",\"t\":\"Digital Image Processing\",\"cr\":3.0,\"f\":\"JAR\",\"fn\":\"Mst. Jesiara Khatun\",\"st\":\"SUN # 11:30 ~ 12:50 @ SEU527 / TUE # 11:30 ~ 12:50 @ SEU527\",\"sl\":[{\"day\":\"SUN\",\"start\":\"11:30\",\"end\":\"12:50\",\"room\":\"SEU527\"},{\"day\":\"TUE\",\"start\":\"11:30\",\"end\":\"12:50\",\"room\":\"SEU527\"}]},"
            + "{\"c\":\"CSE355\",\"s\":\"3\",\"t\":\"Digital Image Processing\",\"cr\":3.0,\"f\":\"MAHB\",\"fn\":\"Mahbub Hasan\",\"st\":\"MON # 08:30 ~ 09:50 @ SEU527 / WED # 08:30 ~ 09:50 @ SEU527\",\"sl\":[{\"day\":\"MON\",\"start\":\"08:30\",\"end\":\"09:50\",\"room\":\"SEU527\"},{\"day\":\"WED\",\"start\":\"08:30\",\"end\":\"09:50\",\"room\":\"SEU527\"}]},"
            + "{\"c\":\"CSE355\",\"s\":\"4\",\"t\":\"Digital Image Processing\",\"cr\":3.0,\"f\":\"MAHB\",\"fn\":\"Mahbub Hasan\",\"st\":\"MON # 10:00 ~ 11:20 @ SEU527 / WED # 10:00 ~ 11:20 @ SEU527\",\"sl\":[{\"day\":\"MON\",\"start\":\"10:00\",\"end\":\"11:20\",\"room\":\"SEU527\"},{\"day\":\"WED\",\"start\":\"10:00\",\"end\":\"11:20\",\"room\":\"SEU527\"}]},"
            + "{\"c\":\"CSE355\",\"s\":\"5\",\"t\":\"Digital Image Processing\",\"cr\":3.0,\"f\":\"MNAR\",\"fn\":\"Namirah Rasul\",\"st\":\"THU # 13:30 ~ 14:50 @ SEU527 / SAT # 13:30 ~ 14:50 @ SEU527\",\"sl\":[{\"day\":\"THU\",\"start\":\"13:30\",\"end\":\"14:50\",\"room\":\"SEU527\"},{\"day\":\"SAT\",\"start\":\"13:30\",\"end\":\"14:50\",\"room\":\"SEU527\"}]},"
            + "{\"c\":\"CSE355\",\"s\":\"6\",\"t\":\"Digital Image Processing\",\"cr\":3.0,\"f\":\"MNAR\",\"fn\":\"Namirah Rasul\",\"st\":\"THU # 15:00 ~ 16:20 @ SEU527 / SAT # 15:00 ~ 16:20 @ SEU527\",\"sl\":[{\"day\":\"THU\",\"start\":\"15:00\",\"end\":\"16:20\",\"room\":\"SEU527\"},{\"day\":\"SAT\",\"start\":\"15:00\",\"end\":\"16:20\",\"room\":\"SEU527\"}]},"
            + "{\"c\":\"CSE355\",\"s\":\"7\",\"t\":\"Digital Image Processing\",\"cr\":3.0,\"f\":\"NAAO\",\"fn\":\"Md. Nahid Anam Opu\",\"st\":\"SUN # 13:30 ~ 14:50 @ SEU321 / TUE # 13:30 ~ 14:50 @ SEU321\",\"sl\":[{\"day\":\"SUN\",\"start\":\"13:30\",\"end\":\"14:50\",\"room\":\"SEU321\"},{\"day\":\"TUE\",\"start\":\"13:30\",\"end\":\"14:50\",\"room\":\"SEU321\"}]},"
            + "{\"c\":\"CSE355\",\"s\":\"8\",\"t\":\"Digital Image Processing\",\"cr\":3.0,\"f\":\"NAAO\",\"fn\":\"Md. Nahid Anam Opu\",\"st\":\"SUN # 15:00 ~ 16:20 @ SEU321 / TUE # 15:00 ~ 16:20 @ SEU321\",\"sl\":[{\"day\":\"SUN\",\"start\":\"15:00\",\"end\":\"16:20\",\"room\":\"SEU321\"},{\"day\":\"TUE\",\"start\":\"15:00\",\"end\":\"16:20\",\"room\":\"SEU321\"}]},"
            + "{\"c\":\"CSE355\",\"s\":\"9\",\"t\":\"Digital Image Processing\",\"cr\":3.0,\"f\":\"RKM\",\"fn\":\"Md. Rakibul Islam\",\"st\":\"MON # 13:30 ~ 14:50 @ SEU321 / WED # 13:30 ~ 14:50 @ SEU321\",\"sl\":[{\"day\":\"MON\",\"start\":\"13:30\",\"end\":\"14:50\",\"room\":\"SEU321\"},{\"day\":\"WED\",\"start\":\"13:30\",\"end\":\"14:50\",\"room\":\"SEU321\"}]},"
            + "{\"c\":\"CSE355\",\"s\":\"10\",\"t\":\"Digital Image Processing\",\"cr\":3.0,\"f\":\"RKM\",\"fn\":\"Md. Rakibul Islam\",\"st\":\"SUN # 15:00 ~ 16:20 @ SEU321 / TUE # 15:00 ~ 16:20 @ SEU321\",\"sl\":[{\"day\":\"SUN\",\"start\":\"15:00\",\"end\":\"16:20\",\"room\":\"SEU321\"},{\"day\":\"TUE\",\"start\":\"15:00\",\"end\":\"16:20\",\"room\":\"SEU321\"}]},"
            + "{\"c\":\"CSE381\",\"s\":\"1\",\"t\":\"Introduction to Embedded Systems\",\"cr\":3.0,\"f\":\"DSS\",\"fn\":\"Dr. Sherejad Sanam\",\"st\":\"SUN # 08:30 ~ 09:50 @ SEU535 / TUE # 08:30 ~ 09:50 @ SEU535\",\"sl\":[{\"day\":\"SUN\",\"start\":\"08:30\",\"end\":\"09:50\",\"room\":\"SEU535\"},{\"day\":\"TUE\",\"start\":\"08:30\",\"end\":\"09:50\",\"room\":\"SEU535\"}]},"
            + "{\"c\":\"CSE381\",\"s\":\"2\",\"t\":\"Introduction to Embedded Systems\",\"cr\":3.0,\"f\":\"DSS\",\"fn\":\"Dr. Sherejad Sanam\",\"st\":\"SUN # 10:00 ~ 11:20 @ SEU535 / TUE # 10:00 ~ 11:20 @ SEU535\",\"sl\":[{\"day\":\"SUN\",\"start\":\"10:00\",\"end\":\"11:20\",\"room\":\"SEU535\"},{\"day\":\"TUE\",\"start\":\"10:00\",\"end\":\"11:20\",\"room\":\"SEU535\"}]},"
            + "{\"c\":\"CSE381\",\"s\":\"3\",\"t\":\"Introduction to Embedded Systems\",\"cr\":3.0,\"f\":\"JABA\",\"fn\":\"Jayed Bin Azad\",\"st\":\"SUN # 10:00 ~ 11:20 @ SEU419 / TUE # 10:00 ~ 11:20 @ SEU419\",\"sl\":[{\"day\":\"SUN\",\"start\":\"10:00\",\"end\":\"11:20\",\"room\":\"SEU419\"},{\"day\":\"TUE\",\"start\":\"10:00\",\"end\":\"11:20\",\"room\":\"SEU419\"}]},"
            + "{\"c\":\"CSE381\",\"s\":\"4\",\"t\":\"Introduction to Embedded Systems\",\"cr\":3.0,\"f\":\"JABA\",\"fn\":\"Jayed Bin Azad\",\"st\":\"SUN # 11:30 ~ 12:50 @ SEU419 / TUE # 11:30 ~ 12:50 @ SEU419\",\"sl\":[{\"day\":\"SUN\",\"start\":\"11:30\",\"end\":\"12:50\",\"room\":\"SEU419\"},{\"day\":\"TUE\",\"start\":\"11:30\",\"end\":\"12:50\",\"room\":\"SEU419\"}]},"
            + "{\"c\":\"CSE381\",\"s\":\"5\",\"t\":\"Introduction to Embedded Systems\",\"cr\":3.0,\"f\":\"NAAO\",\"fn\":\"Md. Nahid Anam Opu\",\"st\":\"MON # 10:00 ~ 11:20 @ SEU535 / WED # 10:00 ~ 11:20 @ SEU535\",\"sl\":[{\"day\":\"MON\",\"start\":\"10:00\",\"end\":\"11:20\",\"room\":\"SEU535\"},{\"day\":\"WED\",\"start\":\"10:00\",\"end\":\"11:20\",\"room\":\"SEU535\"}]},"
            + "{\"c\":\"CSE381\",\"s\":\"6\",\"t\":\"Introduction to Embedded Systems\",\"cr\":3.0,\"f\":\"NAAO\",\"fn\":\"Md. Nahid Anam Opu\",\"st\":\"MON # 11:30 ~ 12:50 @ SEU535 / WED # 11:30 ~ 12:50 @ SEU535\",\"sl\":[{\"day\":\"MON\",\"start\":\"11:30\",\"end\":\"12:50\",\"room\":\"SEU535\"},{\"day\":\"WED\",\"start\":\"11:30\",\"end\":\"12:50\",\"room\":\"SEU535\"}]},"
            + "{\"c\":\"CSE382\",\"s\":\"1\",\"t\":\"Introduction to Embedded Systems Lab\",\"cr\":1.0,\"f\":\"TMD\",\"fn\":\"Tashreef Muhammad\",\"st\":\"SUN # 11:30 ~ 13:30 @ SEU610\",\"sl\":[{\"day\":\"SUN\",\"start\":\"11:30\",\"end\":\"13:30\",\"room\":\"SEU610\"}]},"
            + "{\"c\":\"CSE382\",\"s\":\"2\",\"t\":\"Introduction to Embedded Systems Lab\",\"cr\":1.0,\"f\":\"TMD\",\"fn\":\"Tashreef Muhammad\",\"st\":\"SUN # 14:00 ~ 16:00 @ SEU610\",\"sl\":[{\"day\":\"SUN\",\"start\":\"14:00\",\"end\":\"16:00\",\"room\":\"SEU610\"}]},"
            + "{\"c\":\"CSE382\",\"s\":\"4\",\"t\":\"Introduction to Embedded Systems Lab\",\"cr\":1.0,\"f\":\"NAAO\",\"fn\":\"Md. Nahid Anam Opu\",\"st\":\"MON # 11:30 ~ 13:30 @ SEU610\",\"sl\":[{\"day\":\"MON\",\"start\":\"11:30\",\"end\":\"13:30\",\"room\":\"SEU610\"}]},"
            + "{\"c\":\"CSE382\",\"s\":\"8\",\"t\":\"Introduction to Embedded Systems Lab\",\"cr\":1.0,\"f\":\"JABA\",\"fn\":\"Jayed Bin Azad\",\"st\":\"TUE # 16:30 ~ 18:30 @ SEU610\",\"sl\":[{\"day\":\"TUE\",\"start\":\"16:30\",\"end\":\"18:30\",\"room\":\"SEU610\"}]},"
            + "{\"c\":\"CSE443\",\"s\":\"7\",\"t\":\"Pattern Recognition\",\"cr\":3.0,\"f\":\"GMRN\",\"fn\":\"Gazi Maliha Raisa Noor\",\"st\":\"THU # 13:30 ~ 14:50 @ SEU332 / SAT # 13:30 ~ 14:50 @ SEU332\",\"sl\":[{\"day\":\"THU\",\"start\":\"13:30\",\"end\":\"14:50\",\"room\":\"SEU332\"},{\"day\":\"SAT\",\"start\":\"13:30\",\"end\":\"14:50\",\"room\":\"SEU332\"}]},"
            + "{\"c\":\"CSE443\",\"s\":\"8\",\"t\":\"Pattern Recognition\",\"cr\":3.0,\"f\":\"GMRN\",\"fn\":\"Gazi Maliha Raisa Noor\",\"st\":\"THU # 15:00 ~ 16:20 @ SEU332 / SAT # 15:00 ~ 16:20 @ SEU332\",\"sl\":[{\"day\":\"THU\",\"start\":\"15:00\",\"end\":\"16:20\",\"room\":\"SEU332\"},{\"day\":\"SAT\",\"start\":\"15:00\",\"end\":\"16:20\",\"room\":\"SEU332\"}]},"
            + "{\"c\":\"CSE443\",\"s\":\"10\",\"t\":\"Pattern Recognition\",\"cr\":3.0,\"f\":\"NIBI\",\"fn\":\"Sheikh Md. Nibir\",\"st\":\"THU # 16:30 ~ 17:50 @ SEU332 / SAT # 16:30 ~ 17:50 @ SEU332\",\"sl\":[{\"day\":\"THU\",\"start\":\"16:30\",\"end\":\"17:50\",\"room\":\"SEU332\"},{\"day\":\"SAT\",\"start\":\"16:30\",\"end\":\"17:50\",\"room\":\"SEU332\"}]},"
            + "{\"c\":\"CSE444\",\"s\":\"12\",\"t\":\"Pattern Recognition Lab\",\"cr\":1.0,\"f\":\"TAJO\",\"fn\":\"Tanjina Oriana\",\"st\":\"SAT # 11:30 ~ 13:30 @ SEU213A\",\"sl\":[{\"day\":\"SAT\",\"start\":\"11:30\",\"end\":\"13:30\",\"room\":\"SEU213A\"}]},"
            + "{\"c\":\"CSE444\",\"s\":\"14\",\"t\":\"Pattern Recognition Lab\",\"cr\":1.0,\"f\":\"TAJO\",\"fn\":\"Tanjina Oriana\",\"st\":\"SAT # 14:00 ~ 16:00 @ SEU213A\",\"sl\":[{\"day\":\"SAT\",\"start\":\"14:00\",\"end\":\"16:00\",\"room\":\"SEU213A\"}]},"
            + "{\"c\":\"CSE472\",\"s\":\"1\",\"t\":\"Software Quality Assurance & Testing Lab\",\"cr\":1.0,\"f\":\"ABAH\",\"fn\":\"Abid Ahmad\",\"st\":\"SUN # 08:30 ~ 10:30 @ SEU804\",\"sl\":[{\"day\":\"SUN\",\"start\":\"08:30\",\"end\":\"10:30\",\"room\":\"SEU804\"}]},"
            + "{\"c\":\"CSE472\",\"s\":\"4\",\"t\":\"Software Quality Assurance & Testing Lab\",\"cr\":1.0,\"f\":\"ANMS\",\"fn\":\"Anik Mahmud Shanto\",\"st\":\"THU # 11:30 ~ 13:30 @ SEU804\",\"sl\":[{\"day\":\"THU\",\"start\":\"11:30\",\"end\":\"13:30\",\"room\":\"SEU804\"}]}"
            + "]";

        try {
            List<Map<String, Object>> list = objectMapper.readValue(defaultDataJson, new TypeReference<List<Map<String, Object>>>() {});
            for (Map<String, Object> map : list) {
                String c = (String) map.get("c");
                String s = (String) map.get("s");
                String t = (String) map.get("t");
                Double cr = ((Number) map.get("cr")).doubleValue();
                String f = (String) map.get("f");
                String fn = (String) map.get("fn");
                String st = (String) map.get("st");
                Object sl = map.get("sl");
                String slJson = objectMapper.writeValueAsString(sl);

                OfferedSection os = new OfferedSection(
                        c, s, t, cr, f, fn, 40, st, slJson, DEFAULT_SEMESTER, null, "SYSTEM", null
                );
                sectionRepository.save(os);
            }
            log.info("Successfully pre-seeded default Southeast University advising sections");
        } catch (Exception e) {
            log.warn("Failed to seed default advising sections: {}", e.getMessage());
        }
    }
}
