package com.notelagbe.service.review;

import com.notelagbe.dto.ReviewResponseDto;
import com.notelagbe.entity.ReviewStatus;
import java.util.List;

/**
 * Interface Segregation Principle (ISP):
 * Administrative moderation contract for approving, rejecting, deleting and inspecting reviews.
 */
public interface ReviewModerationService {

    List<ReviewResponseDto> getAllReviewsForAdmin(ReviewStatus status);

    ReviewResponseDto approveReview(Long id);

    ReviewResponseDto rejectReview(Long id);

    void deleteReview(Long id);

    ReviewResponseDto deleteReviewWithDetails(Long id);

    long countPendingReviews();
}
