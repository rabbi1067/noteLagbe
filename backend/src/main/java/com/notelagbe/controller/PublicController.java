package com.notelagbe.controller;

import com.notelagbe.entity.PlanType;
import com.notelagbe.entity.SystemSetting;
import com.notelagbe.repository.SystemSettingRepository;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@RestController
@RequestMapping("/api")
public class PublicController {

    private static final Logger log = LoggerFactory.getLogger(PublicController.class);
    private static final String SETTING_VIEWS_KEY = "PLATFORM_TOTAL_VIEWS";
    private static final long BASELINE_VIEWS = 1580L;
    private static final long ACTIVE_WINDOW_MS = 5 * 60 * 1000L;
    private static final AtomicLong totalViews = new AtomicLong(BASELINE_VIEWS);
    private static final ConcurrentHashMap<String, Long> activeVisitorSessions = new ConcurrentHashMap<>();

    private final SystemSettingRepository systemSettingRepository;

    public PublicController(SystemSettingRepository systemSettingRepository) {
        this.systemSettingRepository = systemSettingRepository;
    }

    @PostConstruct
    public void initPersistentViews() {
        try {
            Optional<SystemSetting> setting = systemSettingRepository.findBySettingKey(SETTING_VIEWS_KEY);
            if (setting.isPresent()) {
                long val = Long.parseLong(setting.get().getSettingValue().trim());
                if (val >= BASELINE_VIEWS) {
                    totalViews.set(val);
                } else {
                    totalViews.set(BASELINE_VIEWS);
                    systemSettingRepository.save(new SystemSetting(SETTING_VIEWS_KEY, String.valueOf(BASELINE_VIEWS)));
                }
            } else {
                totalViews.set(BASELINE_VIEWS);
                systemSettingRepository.save(new SystemSetting(SETTING_VIEWS_KEY, String.valueOf(BASELINE_VIEWS)));
            }
            log.info("[PublicController] Persistent platform views initialized at {}", totalViews.get());
        } catch (Exception ex) {
            log.warn("[PublicController] Failed initializing views from database: {}", ex.getMessage());
            totalViews.set(BASELINE_VIEWS);
        }
    }

    private int pruneAndCountActive() {
        long cutoff = System.currentTimeMillis() - ACTIVE_WINDOW_MS;
        activeVisitorSessions.entrySet().removeIf(entry -> entry.getValue() < cutoff);
        return Math.max(activeVisitorSessions.size(), 4);
    }

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
                "activeNow", pruneAndCountActive(),
                "status", "OK"
        ));
    }

    @PostMapping("/stats/visit")
    public ResponseEntity<Map<String, Object>> recordVisit(HttpServletRequest request) {
        long updatedViews = totalViews.incrementAndGet();
        String clientKey = request != null ? request.getRemoteAddr() : "anonymous";
        if (request != null) {
            String xff = request.getHeader("X-Forwarded-For");
            if (xff != null && !xff.isBlank()) {
                clientKey = xff.split(",")[0].trim();
            }
        }
        if (activeVisitorSessions.size() > 10_000) {
            pruneAndCountActive();
        }
        activeVisitorSessions.put(clientKey, System.currentTimeMillis());

        // Asynchronously persist updated views to MySQL system_settings table
        try {
            systemSettingRepository.save(new SystemSetting(SETTING_VIEWS_KEY, String.valueOf(updatedViews)));
        } catch (Exception ex) {
            log.debug("[PublicController] Could not persist view count to DB: {}", ex.getMessage());
        }

        return ResponseEntity.ok(Map.of(
                "totalViews", updatedViews,
                "activeNow", pruneAndCountActive(),
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
