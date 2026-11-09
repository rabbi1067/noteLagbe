package com.notelagbe.repository;

import com.notelagbe.entity.TeacherCourse;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface TeacherCourseRepository extends JpaRepository<TeacherCourse, Long> {
    List<TeacherCourse> findByCourseId(Long courseId);
    List<TeacherCourse> findByTeacherId(Long teacherId);
    List<TeacherCourse> findByCourseCodeIgnoreCase(String code);
    Optional<TeacherCourse> findByCourseIdAndTeacherId(Long courseId, Long teacherId);
    boolean existsByCourseIdAndTeacherId(Long courseId, Long teacherId);
    void deleteByCourseIdAndTeacherId(Long courseId, Long teacherId);
}
