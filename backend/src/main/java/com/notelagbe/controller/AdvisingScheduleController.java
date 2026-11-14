package com.notelagbe.controller;

import com.notelagbe.entity.User;
import com.notelagbe.repository.UserRepository;
import com.notelagbe.security.CustomUserDetails;
import com.notelagbe.service.AdvisingScheduleService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/advising")
public class AdvisingScheduleController {

    private final AdvisingScheduleService advisingScheduleService;
    private final UserRepository userRepository;

    public AdvisingScheduleController(AdvisingScheduleService advisingScheduleService, UserRepository userRepository) {
        this.advisingScheduleService = advisingScheduleService;
        this.userRepository = userRepository;
    }

    /**
     * Public endpoint to fetch all offered sections for a given semester
     */
    @GetMapping("/sections")
    public ResponseEntity<Map<String, Object>> getSections(
            @RequestParam(value = "semester", required = false) String semester) {
        return ResponseEntity.ok(advisingScheduleService.getSectionsCatalog(semester));
    }

    /**
     * Upload and parse Southeast University UMS Advising Table HTML file
     * Supports both multipart/form-data (up to 10MB) and JSON payload
     */
    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadAdvisingTable(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "semester", required = false) String semester,
            @RequestBody(required = false) Map<String, String> jsonBody,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        User uploader = resolveUser(userDetails);
        String htmlContent = null;
        String targetSemester = semester;

        if (file != null && !file.isEmpty()) {
            try {
                htmlContent = new String(file.getBytes(), StandardCharsets.UTF_8);
            } catch (Exception e) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Failed to read uploaded HTML file."));
            }
        } else if (jsonBody != null && jsonBody.containsKey("html")) {
            htmlContent = jsonBody.get("html");
            if (jsonBody.containsKey("semester") && (targetSemester == null || targetSemester.isBlank())) {
                targetSemester = jsonBody.get("semester");
            }
        }

        if (htmlContent == null || htmlContent.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "No HTML content provided. Please upload an official UMS HTML file."));
        }

        try {
            Map<String, Object> result = advisingScheduleService.parseAndSaveHtml(htmlContent, uploader, targetSemester);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("success", false, "error", "An error occurred while processing the advising table: " + e.getMessage()));
        }
    }

    /**
     * Generate conflict-free multi-objective routines
     */
    @PostMapping("/generate-routine")
    public ResponseEntity<Map<String, Object>> generateRoutine(
            @RequestBody Map<String, Object> payload) {

        @SuppressWarnings("unchecked")
        List<String> selectedCourses = (List<String>) payload.getOrDefault("selectedCourses", Collections.emptyList());
        String timePref = (String) payload.getOrDefault("timePreference", "ANY");
        String dayPref = (String) payload.getOrDefault("dayPreference", "ANY");

        @SuppressWarnings("unchecked")
        List<String> preferredDays = (List<String>) payload.getOrDefault("preferredDays", Collections.emptyList());

        @SuppressWarnings("unchecked")
        Map<String, List<String>> facultyPreferences = (Map<String, List<String>>) payload.getOrDefault("facultyPreferences", Collections.emptyMap());
        String semester = (String) payload.getOrDefault("semester", "Spring 2026");

        try {
            Map<String, Object> routines = advisingScheduleService.generateRoutines(
                    selectedCourses, timePref, dayPref, preferredDays, facultyPreferences, semester
            );
            return ResponseEntity.ok(routines);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("success", false, "error", "Failed to compute optimal routines: " + e.getMessage()));
        }
    }

    private User resolveUser(CustomUserDetails userDetails) {
        if (userDetails == null || userDetails.getUsername() == null) return null;
        return userRepository.findByEmail(userDetails.getUsername()).orElse(null);
    }
}
