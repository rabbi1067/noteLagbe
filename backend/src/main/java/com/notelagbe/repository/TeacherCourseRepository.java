package com.notelagbe.repository;

import com.notelagbe.entity.TeacherCourse;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TeacherCourseRepository extends JpaRepository<TeacherCourse, Long> {
    List<TeacherCourse> findByCourseId(Long courseId);
    List<TeacherCourse> findByTeacherId(Long teacherId);
    List<TeacherCourse> findByCourseCodeIgnoreCase(String code);
    boolean existsByCourseIdAndTeacherId(Long courseId, Long teacherId);
    void deleteByCourseIdAndTeacherId(Long courseId, Long teacherId);
}
