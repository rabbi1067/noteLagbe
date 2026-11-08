package com.notelagbe.repository;

import com.notelagbe.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CourseRepository extends JpaRepository<Course, Long> {
    Optional<Course> findByCodeIgnoreCase(String code);
    Optional<Course> findByTitleIgnoreCase(String title);
    List<Course> findByTitleContainingIgnoreCase(String title);
    List<Course> findBySemester(int semester);
    List<Course> findByTitleContainingIgnoreCaseOrCodeContainingIgnoreCase(String title, String code);
    List<Course> findByDepartmentIgnoreCase(String department);
    List<Course> findAllByOrderBySemesterAscCodeAsc();
}
