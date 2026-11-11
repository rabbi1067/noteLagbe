package com.notelagbe.repository;

import com.notelagbe.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface CourseRepository extends JpaRepository<Course, Long> {
    @Query("SELECT c.code FROM Course c")
    List<String> findAllCourseCodes();
    Optional<Course> findByCodeIgnoreCase(String code);
    Optional<Course> findByTitleIgnoreCase(String title);
    List<Course> findByTitleContainingIgnoreCase(String title);
    List<Course> findBySemester(int semester);
    List<Course> findByTitleContainingIgnoreCaseOrCodeContainingIgnoreCase(String title, String code);
    List<Course> findByDepartmentIgnoreCase(String department);
    List<Course> findAllByOrderBySemesterAscCodeAsc();
}
