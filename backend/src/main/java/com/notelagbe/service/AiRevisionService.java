package com.notelagbe.service;

import com.notelagbe.entity.Course;
import com.notelagbe.entity.Resource;
import com.notelagbe.entity.ResourceStatus;
import com.notelagbe.entity.ResourceType;
import com.notelagbe.exception.ResourceNotFoundException;
import com.notelagbe.repository.CourseRepository;
import com.notelagbe.repository.ResourceRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AiRevisionService {

    private final CourseRepository courseRepository;
    private final ResourceRepository resourceRepository;

    public AiRevisionService(CourseRepository courseRepository,
                             ResourceRepository resourceRepository) {
        this.courseRepository = courseRepository;
        this.resourceRepository = resourceRepository;
    }

    public Map<String, Object> generateExamCheatSheet(String courseCode) {
        Course course = courseRepository.findByCodeIgnoreCase(courseCode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + courseCode));

        List<Resource> approvedResources = resourceRepository.findByCourseIdAndStatus(
                course.getId(), ResourceStatus.APPROVED);

        long notesCount = approvedResources.stream()
                .filter(r -> r.getType() == ResourceType.NOTE || r.getType() == ResourceType.LAB_HAND_NOTE)
                .count();
        long midtermCount = approvedResources.stream()
                .filter(r -> r.getType() == ResourceType.MID_QUESTION)
                .count();
        long finalCount = approvedResources.stream()
                .filter(r -> r.getType() == ResourceType.FINAL_QUESTION)
                .count();
        long quizCount = approvedResources.stream()
                .filter(r -> r.getType() == ResourceType.QUIZ_CT || r.getType() == ResourceType.LAB_QUIZ)
                .count();
        long labCount = approvedResources.stream()
                .filter(r -> r.getType() == ResourceType.LAB_MANUAL || r.getType() == ResourceType.LAB_FINAL || r.getType() == ResourceType.LAB_REPORT)
                .count();

        Map<String, Object> cheatSheet = new HashMap<>();
        cheatSheet.put("courseCode", course.getCode());
        cheatSheet.put("courseTitle", course.getTitle());
        cheatSheet.put("credits", course.getCredits());
        cheatSheet.put("semester", course.getSemester());
        cheatSheet.put("approvedMaterialsCount", approvedResources.size());
        cheatSheet.put("materialBreakdown", Map.of(
                "notes", notesCount,
                "midterms", midtermCount,
                "finals", finalCount,
                "quizzes", quizCount,
                "labs", labCount
        ));

        List<String> focusTopics = new ArrayList<>();
        focusTopics.add("Core definitions, terminology, and foundational theory in " + course.getTitle());
        if (course.getDescription() != null && !course.getDescription().isBlank()) {
            focusTopics.add("Curriculum outline: " + course.getDescription().trim());
        }
        if (midtermCount + finalCount > 0) {
            focusTopics.add("Solve the " + (midtermCount + finalCount) + " archived Midterm & Final question paper(s) available for " + course.getCode());
        }
        if (course.isLab() || labCount > 0) {
            focusTopics.add("Trace lab implementations, viva questions, and practical code outputs");
        }
        if (notesCount > 0) {
            focusTopics.add("Review the " + notesCount + " peer/faculty hand note(s) and worked examples in the archive");
        }
        cheatSheet.put("highYieldTopics", focusTopics);

        cheatSheet.put("lastNightSummary", String.format(
                "Quick Study Plan for %s (%s): %d approved resource(s) archived (%d notes, %d midterms, %d finals). Prioritize previous exam papers first, then consolidate formulas and weak topics.",
                course.getCode(), course.getTitle(), approvedResources.size(), notesCount, midtermCount, finalCount));

        List<String> tips = new ArrayList<>();
        tips.add("Start with past Midterm/Final papers (" + (midtermCount + finalCount) + " available) to benchmark question format.");
        tips.add("Include clean diagrams, state tables, or complexity bounds where questions ask for design/analysis.");
        if (quizCount > 0) {
            tips.add("Skim the " + quizCount + " archived Quiz/CT set(s) for short conceptual questions.");
        }
        cheatSheet.put("examTips", tips);

        return cheatSheet;
    }
}
