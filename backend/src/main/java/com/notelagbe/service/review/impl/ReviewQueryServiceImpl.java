package com.notelagbe.service.review.impl;

import com.notelagbe.dto.ReviewResponseDto;
import com.notelagbe.entity.Course;
import com.notelagbe.entity.Review;
import com.notelagbe.entity.ReviewStatus;
import com.notelagbe.exception.ResourceNotFoundException;
import com.notelagbe.repository.CourseRepository;
import com.notelagbe.repository.ReviewRepository;
import com.notelagbe.service.review.ReviewMapper;
import com.notelagbe.service.review.ReviewQueryService;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Single Responsibility & Dependency Inversion Principle:
 * Specialized read-only query service for public review inspection.
 */
@Service
@Transactional(readOnly = true)
public class ReviewQueryServiceImpl implements ReviewQueryService {

    private final ReviewRepository reviewRepository;
    private final CourseRepository courseRepository;
    private final ReviewMapper reviewMapper;

    public ReviewQueryServiceImpl(ReviewRepository reviewRepository,
                                  CourseRepository courseRepository,
                                  ReviewMapper reviewMapper) {
        this.reviewRepository = reviewRepository;
        this.courseRepository = courseRepository;
        this.reviewMapper = reviewMapper;
    }

    @Override
    @Cacheable(value = "course_reviews", key = "#courseCode.toLowerCase()", unless = "#result == null")
    public List<ReviewResponseDto> getApprovedReviewsForCourse(String courseCode) {
        Course course = courseRepository.findByCodeIgnoreCase(courseCode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + courseCode));

        List<Review> reviews = reviewRepository.findByCourseIdAndStatusOrderByCreatedAtDesc(
                course.getId(), ReviewStatus.APPROVED);
        return reviewMapper.toDtoList(reviews);
    }

    @Override
    @Cacheable(value = "teacher_reviews", key = "#teacherId", unless = "#result == null")
    public List<ReviewResponseDto> getApprovedReviewsForTeacher(Long teacherId) {
        List<Review> reviews = reviewRepository.findByTeacherIdAndStatusOrderByCreatedAtDesc(
                teacherId, ReviewStatus.APPROVED);
        return reviewMapper.toDtoList(reviews);
    }

    @Override
    public List<ReviewResponseDto> getRecentApprovedReviews() {
        List<Review> reviews = reviewRepository.findByStatusOrderByCreatedAtDesc(ReviewStatus.APPROVED);
        return reviewMapper.toDtoList(reviews);
    }
}
