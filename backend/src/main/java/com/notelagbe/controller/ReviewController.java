package com.notelagbe.controller;

import com.notelagbe.dto.ReviewResponseDto;
import com.notelagbe.dto.ReviewSubmitRequest;
import com.notelagbe.security.CustomUserDetails;
import com.notelagbe.service.review.ReviewQueryService;
import com.notelagbe.service.review.ReviewSubmissionService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Interface Segregation Principle (ISP) & Dependency Inversion Principle (DIP):
 * Depends on focused client-facing interfaces (ReviewSubmissionService, ReviewQueryService),
 * eliminating any coupling to administrative moderation capabilities.
 */
@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewSubmissionService reviewSubmissionService;
    private final ReviewQueryService reviewQueryService;

    public ReviewController(ReviewSubmissionService reviewSubmissionService,
                            ReviewQueryService reviewQueryService) {
        this.reviewSubmissionService = reviewSubmissionService;
        this.reviewQueryService = reviewQueryService;
    }

    @PostMapping("/submit")
    public ResponseEntity<ReviewResponseDto> submitReview(
            @Valid @RequestBody ReviewSubmitRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(reviewSubmissionService.submitReview(request, userDetails.getUser()));
    }

    @GetMapping("/check")
    public ResponseEntity<Map<String, Boolean>> checkReviewStatus(
            @RequestParam String courseCode,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        boolean reviewed = false;
        if (userDetails != null && userDetails.getUser() != null) {
            reviewed = reviewSubmissionService.hasUserReviewedCourse(userDetails.getUser(), courseCode);
        }
        return ResponseEntity.ok(Map.of("hasReviewed", reviewed));
    }

    @GetMapping("/course/{code}")
    public ResponseEntity<List<ReviewResponseDto>> getReviewsForCourse(@PathVariable String code) {
        return ResponseEntity.ok(reviewQueryService.getApprovedReviewsForCourse(code));
    }

    @GetMapping("/teacher/{teacherId}")
    public ResponseEntity<List<ReviewResponseDto>> getReviewsForTeacher(@PathVariable Long teacherId) {
        return ResponseEntity.ok(reviewQueryService.getApprovedReviewsForTeacher(teacherId));
    }

    @GetMapping("/recent")
    public ResponseEntity<List<ReviewResponseDto>> getRecentReviews() {
        return ResponseEntity.ok(reviewQueryService.getRecentApprovedReviews());
    }
}
