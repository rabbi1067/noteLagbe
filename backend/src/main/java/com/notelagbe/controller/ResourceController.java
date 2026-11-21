package com.notelagbe.controller;

import com.notelagbe.entity.Resource;
import com.notelagbe.entity.User;
import com.notelagbe.repository.UserRepository;
import com.notelagbe.security.CustomUserDetails;
import com.notelagbe.security.JwtTokenProvider;
import com.notelagbe.service.ResourceService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/resources")
public class ResourceController {

    private final ResourceService resourceService;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;

    public ResourceController(ResourceService resourceService,
                              JwtTokenProvider jwtTokenProvider,
                              UserRepository userRepository) {
        this.resourceService = resourceService;
        this.jwtTokenProvider = jwtTokenProvider;
        this.userRepository = userRepository;
    }

    @GetMapping("/course/{code}")
    public ResponseEntity<List<Resource>> getResourcesForCourse(
            @PathVariable String code,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(resourceService.getResourcesForCourse(
                code,
                userDetails != null ? userDetails.getUser() : null
        ));
    }

    @GetMapping("/teacher/{teacherId}")
    public ResponseEntity<List<Resource>> getResourcesForTeacher(
            @PathVariable Long teacherId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(resourceService.getResourcesForTeacher(
                teacherId,
                userDetails != null ? userDetails.getUser() : null
        ));
    }

    @GetMapping("/check-availability")
    public ResponseEntity<Map<String, Object>> checkAvailability(
            @RequestParam String courseCode,
            @RequestParam(required = false) Long teacherId) {
        return ResponseEntity.ok(resourceService.checkAvailability(courseCode, teacherId));
    }

    @GetMapping("/check-duplicate")
    public ResponseEntity<Map<String, Object>> checkDuplicate(
            @RequestParam String courseCode,
            @RequestParam(required = false) Long teacherId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String semesterName,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) Long excludeId) {
        return ResponseEntity.ok(resourceService.checkDuplicate(courseCode, teacherId, type, semesterName, title, excludeId));
    }

    @GetMapping("/duplicate-slots")
    public ResponseEntity<Map<String, Object>> getDuplicateSlots(@RequestParam String courseCode) {
        return ResponseEntity.ok(resourceService.getDuplicateSlots(courseCode));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resource> getResource(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails != null ? userDetails.getUser() : null;
        return ResponseEntity.ok(resourceService.getResourceByIdForUser(id, user));
    }

    @GetMapping("/{id}/file")
    public ResponseEntity<byte[]> getResourceFile(
            @PathVariable Long id,
            @RequestParam(required = false, defaultValue = "false") boolean download,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails != null ? userDetails.getUser() : null;
        return resourceService.streamResourceFile(id, download, user);
    }

    @PostMapping("/{id}/download")
    public ResponseEntity<Map<String, Object>> downloadResource(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails != null ? userDetails.getUser() : null;
        int views = resourceService.incrementDownloadCount(id, user);
        return ResponseEntity.ok(Map.of("success", true, "downloadsCount", views));
    }

    @PostMapping("/{id}/view")
    public ResponseEntity<Map<String, Object>> viewResource(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = userDetails != null ? userDetails.getUser() : null;
        int views = resourceService.incrementDownloadCount(id, user);
        return ResponseEntity.ok(Map.of("success", true, "downloadsCount", views));
    }
}
