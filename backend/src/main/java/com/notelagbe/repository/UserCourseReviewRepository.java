package com.notelagbe.repository;

import com.notelagbe.entity.UserCourseReview;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserCourseReviewRepository extends JpaRepository<UserCourseReview, Long> {
    boolean existsByUserIdAndCourseId(Long userId, Long courseId);
    void deleteByCourseId(Long courseId);
    void deleteByUserId(Long userId);
}
