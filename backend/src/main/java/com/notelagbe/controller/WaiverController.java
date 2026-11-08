package com.notelagbe.controller;

import com.notelagbe.dto.WaiverSubmitRequest;
import com.notelagbe.entity.WaiverRequest;
import com.notelagbe.security.CustomUserDetails;
import com.notelagbe.service.WaiverService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/waivers")
public class WaiverController {

    private final WaiverService waiverService;

    public WaiverController(WaiverService waiverService) {
        this.waiverService = waiverService;
    }

    @PostMapping("/submit")
    public ResponseEntity<WaiverRequest> submitWaiver(
            @Valid @RequestBody WaiverSubmitRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(waiverService.submitWaiver(request, userDetails.getUser()));
    }

    @GetMapping("/my")
    public ResponseEntity<List<WaiverRequest>> getMyWaivers(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(waiverService.getUserWaivers(userDetails.getId()));
    }
}
