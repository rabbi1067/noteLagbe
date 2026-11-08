package com.notelagbe.repository;

import com.notelagbe.entity.FacultyCategory;
import com.notelagbe.entity.Teacher;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface TeacherRepository extends JpaRepository<Teacher, Long> {
    List<Teacher> findByCategory(FacultyCategory category);
    List<Teacher> findByNameContainingIgnoreCaseOrInitialContainingIgnoreCase(String name, String initial);
    List<Teacher> findByNameContainingIgnoreCase(String name);
    List<Teacher> findByInitialIgnoreCase(String initial);
    Optional<Teacher> findByEmail(String email);
    List<Teacher> findByName(String name);
    List<Teacher> findByNameIgnoreCase(String name);
}

