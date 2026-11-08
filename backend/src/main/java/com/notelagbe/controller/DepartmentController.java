package com.notelagbe.controller;

import com.notelagbe.dto.DepartmentResponseDto;
import com.notelagbe.service.DepartmentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/departments")
public class DepartmentController {

    private final DepartmentService departmentService;

    public DepartmentController(DepartmentService departmentService) {
        this.departmentService = departmentService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getDepartments(
            @RequestParam(required = false, defaultValue = "false") boolean refresh) {
        List<DepartmentResponseDto> depts = departmentService.getDepartments(refresh);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "source", departmentService.getLastSource(),
                "totalDepartments", depts.size(),
                "departments", depts
        ));
    }

    @PostMapping("/sync")
    public ResponseEntity<Map<String, Object>> forceSync() {
        List<DepartmentResponseDto> depts = departmentService.getDepartments(true);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Successfully synced departments directly from Southeast University (seu.edu.bd/programs)",
                "totalDepartments", depts.size(),
                "departments", depts
        ));
    }
}
