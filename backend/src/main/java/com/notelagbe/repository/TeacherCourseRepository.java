package com.notelagbe.repository;

import com.notelagbe.entity.TeacherCourse;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface TeacherCourseRepository extends JpaRepository<TeacherCourse, Long> {
    @EntityGraph(attributePaths = {"teacher", "course"})
    List<TeacherCourse> findByCourseId(Long courseId);

    @EntityGraph(attributePaths = {"teacher", "course"})
    List<TeacherCourse> findByTeacherId(Long teacherId);

    @EntityGraph(attributePaths = {"teacher", "course"})
    List<TeacherCourse> findByCourseCodeIgnoreCase(String code);

    @EntityGraph(attributePaths = {"teacher", "course"})
    Optional<TeacherCourse> findByCourseIdAndTeacherId(Long courseId, Long teacherId);

    @EntityGraph(attributePaths = {"teacher", "course"})
    List<TeacherCourse> findAllByCourseIdAndTeacherId(Long courseId, Long teacherId);

    boolean existsByCourseIdAndTeacherId(Long courseId, Long teacherId);
    void deleteByCourseIdAndTeacherId(Long courseId, Long teacherId);
}
