package com.notelagbe.controller;

import com.notelagbe.dto.ContributionSubmitRequest;
import com.notelagbe.dto.LinkVerificationResponse;
import com.notelagbe.dto.ContributorLeaderboardItem;
import com.notelagbe.entity.ContributionRequest;
import com.notelagbe.exception.ApiException;
import com.notelagbe.security.CustomUserDetails;
import com.notelagbe.service.ContributionService;
import com.notelagbe.service.ResourceService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/contributions")
public class ContributionController {

    private final ContributionService contributionService;
    private final ResourceService resourceService;

    public ContributionController(ContributionService contributionService, ResourceService resourceService) {
        this.contributionService = contributionService;
        this.resourceService = resourceService;
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<List<ContributorLeaderboardItem>> getLeaderboard() {
        return ResponseEntity.ok(contributionService.getLeaderboard());
    }

    @GetMapping("/verify-link")
    public ResponseEntity<LinkVerificationResponse> verifyLink(@RequestParam String url) {
        return ResponseEntity.ok(contributionService.verifyPublicLink(url));
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadContributionFile(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails userDetails) throws IOException {
        if (userDetails == null) {
            throw new ApiException("Authentication required to upload contribution files.");
        }
        return ResponseEntity.ok(resourceService.uploadMaterialFile(file));
    }

    @PostMapping("/submit")
    public ResponseEntity<ContributionRequest> submitContribution(
            @Valid @RequestBody ContributionSubmitRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(contributionService.submitContribution(request, userDetails.getUser()));
    }

    @GetMapping("/my")
    public ResponseEntity<List<ContributionRequest>> getMyContributions(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(contributionService.getUserContributions(userDetails.getId()));
    }
}
