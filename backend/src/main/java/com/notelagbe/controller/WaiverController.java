package com.notelagbe.controller;

import com.notelagbe.dto.WaiverSubmitRequest;
import com.notelagbe.entity.WaiverRequest;
import com.notelagbe.security.CustomUserDetails;
import com.notelagbe.service.ActivityLogService;
import com.notelagbe.service.WaiverService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/waivers")
public class WaiverController {

    private final WaiverService waiverService;
    private final ActivityLogService activityLogService;

    public WaiverController(WaiverService waiverService, ActivityLogService activityLogService) {
        this.waiverService = waiverService;
        this.activityLogService = activityLogService;
    }

    @PostMapping("/submit")
    public ResponseEntity<WaiverRequest> submitWaiver(
            @Valid @RequestBody WaiverSubmitRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletRequest httpRequest) {
        WaiverRequest w = waiverService.submitWaiver(request, userDetails.getUser());
        try {
            activityLogService.logActivity(
                    "WAIVER_SUBMIT",
                    "BILLING",
                    "Student submitted financial waiver application [Student ID: " + w.getStudentId() + ", CGPA: " + (w.getCgpa() != null ? w.getCgpa() : "N/A") + "]",
                    userDetails.getUser(),
                    httpRequest
            );
        } catch (Exception ignored) {}
        return ResponseEntity.ok(w);
    }

    @GetMapping("/my")
    public ResponseEntity<List<WaiverRequest>> getMyWaivers(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(waiverService.getUserWaivers(userDetails.getId()));
    }
}
