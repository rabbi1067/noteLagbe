package com.notelagbe.service.review.impl;

import com.notelagbe.dto.ReviewResponseDto;
import com.notelagbe.entity.Review;
import com.notelagbe.entity.ReviewStatus;
import com.notelagbe.exception.ResourceNotFoundException;
import com.notelagbe.repository.ReviewRepository;
import com.notelagbe.service.NotificationService;
import com.notelagbe.service.review.ReviewMapper;
import com.notelagbe.service.review.ReviewModerationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Single Responsibility & Interface Segregation Principle:
 * Specialized moderation service restricted to administrative workflows.
 */
@Service
public class ReviewModerationServiceImpl implements ReviewModerationService {

    private static final Logger log = LoggerFactory.getLogger(ReviewModerationServiceImpl.class);

    private final ReviewRepository reviewRepository;
    private final ReviewMapper reviewMapper;
    private final com.notelagbe.service.LiveSyncService liveSyncService;
    private final NotificationService notificationService;

    public ReviewModerationServiceImpl(ReviewRepository reviewRepository,
                                       ReviewMapper reviewMapper,
                                       com.notelagbe.service.LiveSyncService liveSyncService,
                                       NotificationService notificationService) {
        this.reviewRepository = reviewRepository;
        this.reviewMapper = reviewMapper;
        this.liveSyncService = liveSyncService;
        this.notificationService = notificationService;
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
    @CacheEvict(value = {"course_reviews", "teacher_reviews", "recent_reviews"}, allEntries = true)
    public ReviewResponseDto approveReview(Long id) {
        Review review = findReviewOrThrow(id);
        review.setStatus(ReviewStatus.APPROVED);
        Review saved = reviewRepository.save(review);
        ReviewResponseDto dto = reviewMapper.toDto(saved);
        notifyAuthorIfIdentified(saved, true);
        liveSyncService.broadcast("review", "approved", id);
        return dto;
    }

    @Override
    @Transactional
    @CacheEvict(value = {"course_reviews", "teacher_reviews", "recent_reviews"}, allEntries = true)
    public ReviewResponseDto rejectReview(Long id) {
        Review review = findReviewOrThrow(id);
        review.setStatus(ReviewStatus.REJECTED);
        Review saved = reviewRepository.save(review);
        ReviewResponseDto dto = reviewMapper.toDto(saved);
        notifyAuthorIfIdentified(saved, false);
        liveSyncService.broadcast("review", "rejected", id);
        return dto;
    }

    private void notifyAuthorIfIdentified(Review review, boolean approved) {
        if (review.isAnonymous() || review.getUser() == null) return;
        try {
            String targetName = review.getTeacher() != null
                    ? review.getTeacher().getName()
                    : (review.getCourse() != null ? review.getCourse().getCode() : "your selected course");
            String link = review.getTeacher() != null
                    ? "/teachers/" + review.getTeacher().getId()
                    : (review.getCourse() != null ? "/courses/" + review.getCourse().getCode() : "/courses");
            if (approved) {
                notificationService.createNotification(
                        review.getUser(),
                        "Your Review Is Now Live",
                        "Your evaluation for " + targetName + " has been approved by Admin and published publicly.",
                        "REVIEW_APPROVED",
                        link
                );
            } else {
                notificationService.createNotification(
                        review.getUser(),
                        "Review Moderation Update",
                        "Your evaluation for " + targetName + " was not approved or has been unpublished by Admin.",
                        "REVIEW_REJECTED",
                        link
                );
            }
        } catch (Exception e) {
            log.warn("Failed to create moderation notification for review #{}: {}", review.getId(), e.getMessage());
        }
    }

    @Override
    @Transactional
    @CacheEvict(value = {"course_reviews", "teacher_reviews", "recent_reviews"}, allEntries = true)
    public void deleteReview(Long id) {
        deleteReviewWithDetails(id);
    }

    @Override
    @Transactional
    @CacheEvict(value = {"course_reviews", "teacher_reviews", "recent_reviews"}, allEntries = true)
    public ReviewResponseDto deleteReviewWithDetails(Long id) {
        Review review = findReviewOrThrow(id);
        ReviewResponseDto dto = reviewMapper.toDto(review);
        reviewRepository.delete(review);
        liveSyncService.broadcast("review", "deleted", id);
        return dto;
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
