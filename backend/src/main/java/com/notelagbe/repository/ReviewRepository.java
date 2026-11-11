package com.notelagbe.repository;

import com.notelagbe.entity.Review;
import com.notelagbe.entity.ReviewStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByCourseIdAndStatusOrderByCreatedAtDesc(Long courseId, ReviewStatus status);
    List<Review> findByTeacherIdAndStatusOrderByCreatedAtDesc(Long teacherId, ReviewStatus status);
    List<Review> findByStatusOrderByCreatedAtDesc(ReviewStatus status);
    List<Review> findByStatusOrderByCreatedAtDesc(ReviewStatus status, Pageable pageable);
    long countByStatus(ReviewStatus status);
    List<Review> findAllByOrderByCreatedAtDesc();
    List<Review> findByTeacherId(Long teacherId);
    List<Review> findByCourseId(Long courseId);
    List<Review> findByUserId(Long userId);
    void deleteByCourseId(Long courseId);
    void deleteByUserId(Long userId);
}
