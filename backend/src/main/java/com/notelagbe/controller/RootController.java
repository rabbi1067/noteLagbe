package com.notelagbe.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
public class RootController {

    @RequestMapping(value = {"", "/"}, method = {RequestMethod.GET, RequestMethod.HEAD})
    public ResponseEntity<Map<String, Object>> rootHealthCheck() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "app", "NoteLagbe API",
                "university", "Southeast University",
                "department", "Computer Science & Engineering",
                "time", LocalDateTime.now()
        ));
    }
}
