package com.notelagbe.repository;

import com.notelagbe.entity.UnlockSource;
import com.notelagbe.entity.UnlockedCourse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UnlockedCourseRepository extends JpaRepository<UnlockedCourse, Long> {
    @Query("SELECT uc FROM UnlockedCourse uc JOIN FETCH uc.course LEFT JOIN FETCH uc.teacher WHERE uc.user.id = :userId")
    List<UnlockedCourse> findByUserId(@Param("userId") Long userId);
    long countByCourseId(Long courseId);
    List<UnlockedCourse> findAllByUserIdAndCourseId(Long userId, Long courseId);

    // Full-course unlock lookups (teacher == null)
    boolean existsByUserIdAndCourseIdAndTeacherIsNull(Long userId, Long courseId);
    Optional<UnlockedCourse> findByUserIdAndCourseIdAndTeacherIsNull(Long userId, Long courseId);

    // Faculty-scoped unlock lookups (teacher != null)
    boolean existsByUserIdAndCourseIdAndTeacherId(Long userId, Long courseId, Long teacherId);
    Optional<UnlockedCourse> findByUserIdAndCourseIdAndTeacherId(Long userId, Long courseId, Long teacherId);

    List<UnlockedCourse> findByExpiresAtNotNullAndExpiresAtBefore(java.time.LocalDateTime dateTime);

    @Modifying
    @Transactional
    void deleteByUserIdAndSourceIn(Long userId, Collection<UnlockSource> sources);

    @Modifying
    @Transactional
    void deleteByTeacherId(Long teacherId);

    void deleteByCourseId(Long courseId);
    void deleteByUserId(Long userId);
}
