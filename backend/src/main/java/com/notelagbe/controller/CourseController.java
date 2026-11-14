package com.notelagbe.controller;

import com.notelagbe.dto.CourseSearchResponse;
import com.notelagbe.dto.UnlockCourseRequest;
import com.notelagbe.security.CustomUserDetails;
import com.notelagbe.service.CourseService;
import com.notelagbe.service.ActivityLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/courses")
public class CourseController {

    private final CourseService courseService;
    private final com.notelagbe.service.AiRevisionService aiRevisionService;
    private final ActivityLogService activityLogService;
    private final HttpServletRequest httpRequest;

    public CourseController(CourseService courseService, com.notelagbe.service.AiRevisionService aiRevisionService, ActivityLogService activityLogService, HttpServletRequest httpRequest) {
        this.courseService = courseService;
        this.aiRevisionService = aiRevisionService;
        this.activityLogService = activityLogService;
        this.httpRequest = httpRequest;
    }

    @GetMapping
    public ResponseEntity<List<CourseSearchResponse>> getCourses(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Integer semester,
            @RequestParam(required = false) String electiveGroup,
            @RequestParam(required = false) String department,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(courseService.searchCourses(
                query,
                semester,
                electiveGroup,
                department,
                userDetails != null ? userDetails.getUser() : null
        ));
    }

    @GetMapping("/{code}")
    public ResponseEntity<CourseSearchResponse> getCourseDetails(
            @PathVariable String code,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(courseService.getCourseByCode(
                code,
                userDetails != null ? userDetails.getUser() : null
        ));
    }

    @PostMapping("/{code}/unlock")
    public ResponseEntity<Map<String, Object>> unlockCourse(
            @PathVariable String code,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Login required"));
        }
        boolean success = courseService.unlockCourse(code, userDetails.getUser());
        try {
            activityLogService.logActivity("COURSE_UNLOCK", "CONTENT", "Student unlocked course: " + code.toUpperCase(), userDetails.getUser(), httpRequest);
        } catch (Exception ignored) {}
        return ResponseEntity.ok(Map.of("success", success, "message", "Course materials successfully unlocked!"));
    }

    @GetMapping("/{code}/cheatsheet")
    public ResponseEntity<Map<String, Object>> getCheatSheet(@PathVariable String code) {
        return ResponseEntity.ok(aiRevisionService.generateExamCheatSheet(code));
    }

    @GetMapping("/{code}/download-zip")
    public void downloadOfflineStudyPack(
            @PathVariable String code,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json;charset=UTF-8");
        response.getOutputStream().write(jsonError("For security purposes, the offline study pack (ZIP) download service is temporarily disabled. Please view materials directly on NoteLagbe.").getBytes(StandardCharsets.UTF_8));
    }

    private String jsonError(String message) {
        String clean = message == null ? "Unexpected error" : message
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "")
                .replace("\n", " ");
        return "{\"success\":false,\"message\":\"" + clean + "\"}";
    }
}
