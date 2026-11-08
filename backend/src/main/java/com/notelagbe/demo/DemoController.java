package com.notelagbe.demo;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/demo")
@ConditionalOnProperty(name = "app.demo.enabled", havingValue = "true", matchIfMissing = false)
public class DemoController {

    @Value("${app.demo.enabled:true}")
    private boolean demoEnabled;

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getDemoStatus() {
        return ResponseEntity.ok(Map.of(
                "demoPackageActive", demoEnabled,
                "isolatedPackage", "com.notelagbe.demo",
                "message", "This demo package is completely isolated. When switching to production DB, you can set app.demo.enabled=false in application.yml OR safely delete the 'demo' package folder without any compilation or runtime errors!",
                "credentials", Map.of(
                        "admin", Map.of("email", "admin@seu.edu.bd", "password", "Admin@Password123!"),
                        "sampleStudent", Map.of("email", "student@seu.edu.bd", "password", "Student@Password123!")
                )
        ));
    }
}
