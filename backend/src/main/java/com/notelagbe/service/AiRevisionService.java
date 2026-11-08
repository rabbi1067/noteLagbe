package com.notelagbe.service;

import com.notelagbe.entity.Course;
import com.notelagbe.exception.ResourceNotFoundException;
import com.notelagbe.repository.CourseRepository;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AiRevisionService {

    private final CourseRepository courseRepository;

    public AiRevisionService(CourseRepository courseRepository) {
        this.courseRepository = courseRepository;
    }

    public Map<String, Object> generateExamCheatSheet(String courseCode) {
        Course course = courseRepository.findByCodeIgnoreCase(courseCode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + courseCode));

        Map<String, Object> cheatSheet = new HashMap<>();
        cheatSheet.put("courseCode", course.getCode());
        cheatSheet.put("courseTitle", course.getTitle());
        cheatSheet.put("credits", course.getCredits());
        cheatSheet.put("semester", course.getSemester());

        // Smart revision structure
        cheatSheet.put("highYieldTopics", List.of(
                "Core definitions and foundational theory for " + course.getTitle(),
                "Mathematical derivations, proofs, and circuit/code diagrams frequently appearing in previous course-ins",
                "Step-by-step problem solving algorithms & time complexity analysis",
                "Midterm & Final recurrent questions identified by Course-In pattern predictor"
        ));

        cheatSheet.put("lastNightSummary", "Essential Quick Revision Summary for " + course.getCode() + " (" + course.getTitle() + "): Focus on core definitions, formula derivation steps, and previous years' Midterm/Final questions. For lab-based components, review syntax dry-runs and output traces.");

        cheatSheet.put("examTips", List.of(
                "Tip 1: Review Section A questions from previous course-ins - 60% probability of conceptual recurrence.",
                "Tip 2: Always draw neat diagrams/state flowcharts where applicable for full marks.",
                "Tip 3: For programming/algorithm questions, write clean pseudocode with complexity bounds."
        ));

        return cheatSheet;
    }
}
