package com.notelagbe.repository;

import com.notelagbe.entity.UnlockSource;
import com.notelagbe.entity.UnlockedCourse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UnlockedCourseRepository extends JpaRepository<UnlockedCourse, Long> {
    List<UnlockedCourse> findByUserId(Long userId);
    long countByCourseId(Long courseId);
    boolean existsByUserIdAndCourseId(Long userId, Long courseId);
    boolean existsByUserIdAndCourseCodeIgnoreCase(Long userId, String code);
    Optional<UnlockedCourse> findByUserIdAndCourseId(Long userId, Long courseId);

    @Modifying
    @Transactional
    void deleteByUserIdAndSourceIn(Long userId, Collection<UnlockSource> sources);

    void deleteByCourseId(Long courseId);
    void deleteByUserId(Long userId);
}
