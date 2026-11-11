package com.notelagbe.service.impl;

import com.notelagbe.dto.ReviewResponseDto;
import com.notelagbe.dto.ReviewSubmitRequest;
import com.notelagbe.entity.ReviewStatus;
import com.notelagbe.entity.User;
import com.notelagbe.service.ReviewService;
import com.notelagbe.service.review.ReviewModerationService;
import com.notelagbe.service.review.ReviewQueryService;
import com.notelagbe.service.review.ReviewSubmissionService;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Dependency Inversion & Composition:
 * Implements the composite ReviewService interface by delegating
 * to the specialized domain services.
 */
@Service
@Primary
public class ReviewServiceImpl implements ReviewService {

    private final ReviewSubmissionService submissionService;
    private final ReviewQueryService queryService;
    private final ReviewModerationService moderationService;

    public ReviewServiceImpl(ReviewSubmissionService submissionService,
                             ReviewQueryService queryService,
                             ReviewModerationService moderationService) {
        this.submissionService = submissionService;
        this.queryService = queryService;
        this.moderationService = moderationService;
    }

    @Override
    public ReviewResponseDto submitReview(ReviewSubmitRequest request, User user) {
        return submissionService.submitReview(request, user);
    }

    @Override
    public boolean hasUserReviewedCourse(User user, String courseCode) {
        return submissionService.hasUserReviewedCourse(user, courseCode);
    }

    @Override
    public List<ReviewResponseDto> getApprovedReviewsForCourse(String courseCode) {
        return queryService.getApprovedReviewsForCourse(courseCode);
    }

    @Override
    public List<ReviewResponseDto> getApprovedReviewsForTeacher(Long teacherId) {
        return queryService.getApprovedReviewsForTeacher(teacherId);
    }

    @Override
    public List<ReviewResponseDto> getRecentApprovedReviews() {
        return queryService.getRecentApprovedReviews();
    }

    @Override
    public List<ReviewResponseDto> getAllReviewsForAdmin(ReviewStatus status) {
        return moderationService.getAllReviewsForAdmin(status);
    }

    @Override
    public ReviewResponseDto approveReview(Long id) {
        return moderationService.approveReview(id);
    }

    @Override
    public ReviewResponseDto rejectReview(Long id) {
        return moderationService.rejectReview(id);
    }

    @Override
    public void deleteReview(Long id) {
        moderationService.deleteReview(id);
    }

    @Override
    public ReviewResponseDto deleteReviewWithDetails(Long id) {
        return moderationService.deleteReviewWithDetails(id);
    }

    @Override
    public long countPendingReviews() {
        return moderationService.countPendingReviews();
    }
}
