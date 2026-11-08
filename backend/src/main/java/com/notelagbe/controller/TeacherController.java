package com.notelagbe.controller;

import com.notelagbe.entity.FacultyCategory;
import com.notelagbe.entity.Teacher;
import com.notelagbe.entity.TeacherCourse;
import com.notelagbe.service.TeacherService;
import com.notelagbe.service.SeuFacultySyncService;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teachers")
public class TeacherController {

    private final TeacherService teacherService;
    private final SeuFacultySyncService seuFacultySyncService;

    public TeacherController(TeacherService teacherService, SeuFacultySyncService seuFacultySyncService) {
        this.teacherService = teacherService;
        this.seuFacultySyncService = seuFacultySyncService;
    }

    @PostMapping("/sync-cse")
    public ResponseEntity<Map<String, Object>> syncCseFaculties() {
        return ResponseEntity.ok(seuFacultySyncService.syncCseFaculties());
    }

    @GetMapping
    public ResponseEntity<List<Teacher>> getTeachers(
            @RequestParam(required = false) FacultyCategory category,
            @RequestParam(required = false) String query) {
        if (query != null && !query.trim().isEmpty()) {
            return ResponseEntity.ok(teacherService.searchTeachers(query));
        }
        return ResponseEntity.ok(teacherService.getAllTeachers(category));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Teacher> getTeacherById(@PathVariable Long id) {
        return ResponseEntity.ok(teacherService.getTeacherById(id));
    }

    @GetMapping("/{id}/courses")
    public ResponseEntity<List<TeacherCourse>> getTeacherCourses(@PathVariable Long id) {
        return ResponseEntity.ok(teacherService.getCoursesTaughtByTeacher(id));
    }
}
