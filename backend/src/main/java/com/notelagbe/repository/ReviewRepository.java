package com.notelagbe.repository;

import com.notelagbe.entity.Review;
import com.notelagbe.entity.ReviewStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    @EntityGraph(attributePaths = {"course", "teacher", "user"})
    List<Review> findByCourseIdAndStatusOrderByCreatedAtDesc(Long courseId, ReviewStatus status);

    @EntityGraph(attributePaths = {"course", "teacher", "user"})
    List<Review> findByTeacherIdAndStatusOrderByCreatedAtDesc(Long teacherId, ReviewStatus status);

    @EntityGraph(attributePaths = {"course", "teacher", "user"})
    List<Review> findByStatusOrderByCreatedAtDesc(ReviewStatus status);

    @EntityGraph(attributePaths = {"course", "teacher", "user"})
    List<Review> findByStatusOrderByCreatedAtDesc(ReviewStatus status, Pageable pageable);

    long countByStatus(ReviewStatus status);

    @EntityGraph(attributePaths = {"course", "teacher", "user"})
    List<Review> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"course", "teacher", "user"})
    List<Review> findByTeacherId(Long teacherId);

    @EntityGraph(attributePaths = {"course", "teacher", "user"})
    List<Review> findByCourseId(Long courseId);

    @EntityGraph(attributePaths = {"course", "teacher", "user"})
    List<Review> findByUserId(Long userId);

    void deleteByCourseId(Long courseId);
    void deleteByUserId(Long userId);
}
