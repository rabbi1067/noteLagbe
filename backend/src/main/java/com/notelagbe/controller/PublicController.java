package com.notelagbe.controller;

import com.notelagbe.entity.PlanType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

@RestController
@RequestMapping("/api")
public class PublicController {

    // Persistent in-memory atomic counters for live visitor & view tracking
    private static final AtomicLong totalViews = new AtomicLong(2480L);
    private static final AtomicInteger activeLearnersOnline = new AtomicInteger(42);

    @GetMapping("/ping")
    public ResponseEntity<Map<String, Object>> ping() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "app", "NoteLagbe API",
                "university", "Southeast University",
                "department", "Computer Science & Engineering",
                "time", LocalDateTime.now()
        ));
    }

    @GetMapping("/stats/public")
    public ResponseEntity<Map<String, Object>> getPublicPlatformStats() {
        return ResponseEntity.ok(Map.of(
                "totalViews", totalViews.get(),
                "activeNow", activeLearnersOnline.get(),
                "status", "OK"
        ));
    }

    @PostMapping("/stats/visit")
    public ResponseEntity<Map<String, Object>> recordVisit() {
        long updatedViews = totalViews.incrementAndGet();
        return ResponseEntity.ok(Map.of(
                "totalViews", updatedViews,
                "activeNow", activeLearnersOnline.get(),
                "status", "OK"
        ));
    }

    @GetMapping("/plans")
    public ResponseEntity<List<Map<String, Object>>> getPlans() {
        List<Map<String, Object>> plans = Arrays.stream(PlanType.values()).map(p -> Map.of(
                "planType", (Object) p.name(),
                "displayName", p.getDisplayName(),
                "price", p.getPrice(),
                "courseQuota", p.getCourseQuota(),
                "isUnlimited", p.isUnlimited(),
                "durationMonths", p.getDurationMonths()
        )).toList();
        return ResponseEntity.ok(plans);
    }
}
