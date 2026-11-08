package com.notelagbe.service.review.impl;

import com.notelagbe.dto.ReviewResponseDto;
import com.notelagbe.entity.Review;
import com.notelagbe.entity.ReviewStatus;
import com.notelagbe.exception.ResourceNotFoundException;
import com.notelagbe.repository.ReviewRepository;
import com.notelagbe.service.review.ReviewMapper;
import com.notelagbe.service.review.ReviewModerationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Single Responsibility & Interface Segregation Principle:
 * Specialized moderation service restricted to administrative workflows.
 */
@Service
public class ReviewModerationServiceImpl implements ReviewModerationService {

    private final ReviewRepository reviewRepository;
    private final ReviewMapper reviewMapper;
    private final com.notelagbe.service.LiveSyncService liveSyncService;

    public ReviewModerationServiceImpl(ReviewRepository reviewRepository,
                                      ReviewMapper reviewMapper,
                                      com.notelagbe.service.LiveSyncService liveSyncService) {
        this.reviewRepository = reviewRepository;
        this.reviewMapper = reviewMapper;
        this.liveSyncService = liveSyncService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReviewResponseDto> getAllReviewsForAdmin(ReviewStatus status) {
        List<Review> list;
        if (status == null) {
            list = reviewRepository.findAllByOrderByCreatedAtDesc();
        } else {
            list = reviewRepository.findByStatusOrderByCreatedAtDesc(status);
        }
        return reviewMapper.toDtoList(list);
    }

    @Override
    @Transactional
    public ReviewResponseDto approveReview(Long id) {
        Review review = findReviewOrThrow(id);
        review.setStatus(ReviewStatus.APPROVED);
        ReviewResponseDto dto = reviewMapper.toDto(reviewRepository.save(review));
        liveSyncService.broadcast("review", "approved", id);
        return dto;
    }

    @Override
    @Transactional
    public ReviewResponseDto rejectReview(Long id) {
        Review review = findReviewOrThrow(id);
        review.setStatus(ReviewStatus.REJECTED);
        ReviewResponseDto dto = reviewMapper.toDto(reviewRepository.save(review));
        liveSyncService.broadcast("review", "rejected", id);
        return dto;
    }

    @Override
    @Transactional
    public void deleteReview(Long id) {
        if (!reviewRepository.existsById(id)) {
            throw new ResourceNotFoundException("Review not found with id: " + id);
        }
        reviewRepository.deleteById(id);
        liveSyncService.broadcast("review", "deleted", id);
    }

    @Override
    @Transactional(readOnly = true)
    public long countPendingReviews() {
        return reviewRepository.countByStatus(ReviewStatus.PENDING);
    }

    private Review findReviewOrThrow(Long id) {
        return reviewRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found with id: " + id));
    }
}
