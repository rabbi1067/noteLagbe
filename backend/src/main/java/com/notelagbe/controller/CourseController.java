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

    @PostMapping("/{code}/super-admin/toggle-lock")
    public ResponseEntity<Map<String, Object>> toggleSuperAdminCourseLock(
            @PathVariable String code,
            @RequestBody(required = false) Map<String, Object> body,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null || userDetails.getUser() == null || userDetails.getUser().getRole() != com.notelagbe.entity.Role.ROLE_SUPER_ADMIN) {
            return ResponseEntity.status(403).body(Map.of("success", false, "message", "Only Super Admin can access this testing endpoint."));
        }
        Boolean forceLocked = null;
        if (body != null && body.containsKey("locked") && body.get("locked") != null) {
            forceLocked = Boolean.valueOf(body.get("locked").toString());
        }
        boolean isNowLocked = courseService.toggleSuperAdminCourseLock(code, userDetails.getUser(), forceLocked);
        try {
            activityLogService.logActivity(
                    "SUPER_ADMIN_TEST_LOCK",
                    "ADMIN",
                    "Super Admin " + (isNowLocked ? "LOCKED" : "UNLOCKED") + " course for testing: " + code.toUpperCase(),
                    userDetails.getUser(),
                    httpRequest
            );
        } catch (Exception ignored) {}
        return ResponseEntity.ok(Map.of(
                "success", true,
                "courseCode", code.toUpperCase(),
                "testLocked", isNowLocked,
                "isUnlocked", !isNowLocked,
                "message", isNowLocked
                        ? "Course locked in Super Admin Testing Mode. You can now test locked student UI & restricted features."
                        : "Course unlocked in Super Admin Testing Mode. Full staff access restored."
        ));
    }

    @GetMapping("/{code}/download-zip")
    public void downloadOfflineStudyPack(
            @PathVariable String code,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletResponse response) throws IOException {
        com.notelagbe.entity.User user = userDetails != null ? userDetails.getUser() : null;
        if (user == null) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json;charset=UTF-8");
            response.getOutputStream().write(jsonError("Login required to download offline study pack").getBytes(StandardCharsets.UTF_8));
            return;
        }

        // Offline study pack download is exclusively restricted to Super Admin testing
        if (user.getRole() != com.notelagbe.entity.Role.ROLE_SUPER_ADMIN) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json;charset=UTF-8");
            response.getOutputStream().write(jsonError("For security purposes, offline study pack (ZIP) download is currently restricted to Super Admin testing.").getBytes(StandardCharsets.UTF_8));
            return;
        }

        try {
            response.setContentType("application/zip");
            String safeFileCode = code.replaceAll("[^a-zA-Z0-9_-]", "").toUpperCase();
            if (safeFileCode.isEmpty()) safeFileCode = "COURSE";
            response.setHeader("Content-Disposition", "attachment; filename=\"" + safeFileCode + "_Offline_Study_Pack.zip\"");
            courseService.generateOfflineStudyPackZip(code, user, response.getOutputStream());
            try {
                activityLogService.logActivity("OFFLINE_PACK_DOWNLOAD", "CONTENT", "Super Admin downloaded offline study pack for: " + safeFileCode, user, httpRequest);
            } catch (Exception ignored) {}
        } catch (com.notelagbe.exception.ApiException e) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json;charset=UTF-8");
            response.getOutputStream().write(jsonError(e.getMessage()).getBytes(StandardCharsets.UTF_8));
        } catch (com.notelagbe.exception.ResourceNotFoundException e) {
            response.setStatus(HttpServletResponse.SC_NOT_FOUND);
            response.setContentType("application/json;charset=UTF-8");
            response.getOutputStream().write(jsonError(e.getMessage()).getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.setContentType("application/json;charset=UTF-8");
            response.getOutputStream().write(jsonError("Failed to generate offline study pack: " + e.getMessage()).getBytes(StandardCharsets.UTF_8));
        }
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
