package com.notelagbe.service;

import com.notelagbe.dto.ActivityLogPageResponse;
import com.notelagbe.dto.ActivityLogResponseDto;
import com.notelagbe.entity.ActivityLog;
import com.notelagbe.entity.User;
import com.notelagbe.repository.ActivityLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
public class ActivityLogService {

    private static final Logger log = LoggerFactory.getLogger(ActivityLogService.class);

    private final ActivityLogRepository activityLogRepository;
    private final LiveSyncService liveSyncService;

    public ActivityLogService(ActivityLogRepository activityLogRepository, LiveSyncService liveSyncService) {
        this.activityLogRepository = activityLogRepository;
        this.liveSyncService = liveSyncService;
    }

    private static String clip(String val, int maxLen) {
        if (val == null) return null;
        return val.length() <= maxLen ? val : val.substring(0, maxLen - 3) + "...";
    }

    /**
     * Log an action with detailed metadata, client IP, and device info.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ActivityLog logActivity(String action, String actionType, String details, String userEmail, String userName, String userRole, String ipAddress, String deviceInfo, String status) {
        try {
            String safeIp = clip((ipAddress != null && !ipAddress.isBlank()) ? ipAddress : "127.0.0.1", 58);
            String safeDevice = clip((deviceInfo != null && !deviceInfo.isBlank()) ? deviceInfo : "Web Client", 145);
            ActivityLog entry = new ActivityLog(
                    clip(action != null ? action : "UNKNOWN", 100),
                    clip(actionType != null ? actionType : "SYSTEM", 50),
                    clip(details != null ? details : "", 1950),
                    clip(userEmail, 145),
                    clip(userName, 145),
                    clip(userRole, 50),
                    safeIp,
                    safeDevice,
                    clip(status != null ? status : "SUCCESS", 30)
            );
            entry = activityLogRepository.save(entry);
            liveSyncService.broadcast("activity_log", "created", entry.getId());
            return entry;
        } catch (Exception e) {
            log.error("Failed to persist activity log: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Legacy Overload without deviceInfo.
     */
    @Transactional
    public ActivityLog logActivity(String action, String actionType, String details, String userEmail, String userName, String userRole, String ipAddress, String status) {
        return logActivity(action, actionType, details, userEmail, userName, userRole, ipAddress, "Web Client", status);
    }

    /**
     * Overload accepting User object and IP.
     */
    @Transactional
    public ActivityLog logActivity(String action, String actionType, String details, User user, String ipAddress, String status) {
        String email = user != null ? user.getEmail() : "system@seu.edu.bd";
        String name = user != null ? user.getName() : "System Automated";
        String role = user != null && user.getRole() != null ? user.getRole().name() : "SYSTEM";
        return logActivity(action, actionType, details, email, name, role, ipAddress, "Web Client", status);
    }

    /**
     * Overload extracting IP, User-Agent device, and user from HttpServletRequest.
     */
    @Transactional
    public ActivityLog logActivity(String action, String actionType, String details, User user, HttpServletRequest request) {
        String clientIp = getClientIp(request);
        String deviceInfo = getDeviceInfo(request);
        String email = user != null ? user.getEmail() : "system@seu.edu.bd";
        String name = user != null ? user.getName() : "System Automated";
        String role = user != null && user.getRole() != null ? user.getRole().name() : "SYSTEM";
        return logActivity(action, actionType, details, email, name, role, clientIp, deviceInfo, "SUCCESS");
    }

    /**
     * Helper specifically for Authentication actions (Logins, SSO, Register).
     */
    @Transactional
    public ActivityLog logAuth(String action, String details, String email, String name, String role, HttpServletRequest request, String status) {
        String clientIp = getClientIp(request);
        String deviceInfo = getDeviceInfo(request);
        return logActivity(action, "AUTH", details, email, name, role, clientIp, deviceInfo, status != null ? status : "SUCCESS");
    }

    /**
     * Resolves the real client IP, considering proxies, Cloudflare tunnels, and load balancers.
     */
    public static String getClientIp(HttpServletRequest request) {
        if (request == null) return "127.0.0.1";

        String[] headers = {
                "CF-Connecting-IP",      // Cloudflare tunnel
                "True-Client-IP",
                "X-Client-IP",
                "X-Forwarded-For",
                "X-Real-IP",
                "Proxy-Client-IP",
                "WL-Proxy-Client-IP"
        };

        for (String header : headers) {
            String val = request.getHeader(header);
            if (val != null && !val.isBlank() && !"unknown".equalsIgnoreCase(val)) {
                String[] ips = val.split(",");
                for (String ip : ips) {
                    String clean = ip.trim();
                    if (!clean.isEmpty() && !"unknown".equalsIgnoreCase(clean)) {
                        return clean;
                    }
                }
            }
        }

        String remote = request.getRemoteAddr();
        if ("0:0:0:0:0:0:0:1".equals(remote) || "::1".equals(remote)) {
            return "127.0.0.1";
        }
        return remote != null ? remote : "127.0.0.1";
    }

    /**
     * Parses browser and operating system details from the User-Agent header.
     */
    public static String getDeviceInfo(HttpServletRequest request) {
        if (request == null) return "Web Browser";
        String ua = request.getHeader("User-Agent");
        if (ua == null || ua.isBlank()) return "Web Client";

        String browser = "Browser";
        if (ua.contains("Edg/")) browser = "Edge";
        else if (ua.contains("Chrome/")) browser = "Chrome";
        else if (ua.contains("Firefox/")) browser = "Firefox";
        else if (ua.contains("Safari/") && !ua.contains("Chrome/")) browser = "Safari";
        else if (ua.contains("Postman")) browser = "Postman";
        else if (ua.contains("curl")) browser = "cURL";

        String os = "Unknown OS";
        if (ua.contains("Windows")) os = "Windows";
        else if (ua.contains("Macintosh") || ua.contains("Mac OS")) os = "macOS";
        else if (ua.contains("Android")) os = "Android";
        else if (ua.contains("iPhone") || ua.contains("iPad")) os = "iOS";
        else if (ua.contains("Linux")) os = "Linux";

        return browser + " on " + os;
    }

    /**
     * Query activity logs with 365-day rolling retention and server-side pagination.
     */
    @Transactional(readOnly = true)
    public ActivityLogPageResponse getActivityLogs(int page, int size, String search, String actionType) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(100, Math.max(1, size));
        Pageable pageable = PageRequest.of(safePage, safeSize);

        // 365-day rolling retention cutoff
        LocalDateTime cutoff = LocalDateTime.now().minusDays(365);
        String safeSearch = search != null ? search.trim() : "";
        String safeActionType = (actionType != null && !actionType.isBlank() && !"ALL".equalsIgnoreCase(actionType))
                ? actionType.trim().toUpperCase()
                : null;

        Page<ActivityLog> paged = activityLogRepository.searchLogs(cutoff, safeActionType, safeSearch, pageable);

        List<ActivityLogResponseDto> dtoList = paged.getContent().stream()
                .map(ActivityLogResponseDto::new)
                .toList();

        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
        LocalDateTime endOfToday = LocalDate.now().atTime(LocalTime.MAX);
        long todayCount = activityLogRepository.countByCreatedAtBetween(startOfToday, endOfToday);
        long uniqueIpCount = activityLogRepository.countDistinctIpAddressesAfter(cutoff);

        return new ActivityLogPageResponse(
                dtoList,
                paged.getNumber() + 1, // 1-based page number for frontend
                Math.max(1, paged.getTotalPages()),
                paged.getTotalElements(),
                safeSize,
                "Rolling 365-Day Retention Window (Records older than 1 year are automatically purged daily)",
                todayCount,
                uniqueIpCount
        );
    }

    /**
     * Automatic Rolling Purge: Runs every day at 2:00 AM.
     * Deletes any activity log records older than 365 days (1 year).
     */
    @Scheduled(cron = "0 0 2 * * ?")
    @Transactional
    public void purgeExpiredLogs() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(365);
        int deleted = activityLogRepository.deleteOlderThan(cutoff);
        if (deleted > 0) {
            log.info("ActivityLog Retention Purge: Cleaned up {} records older than 365 days (before {})", deleted, cutoff);
        }
    }

    /**
     * Super Admin manual log purge: clears all activity logs.
     */
    @Transactional
    public void clearAllLogs() {
        activityLogRepository.deleteAll();
        liveSyncService.broadcast("activity_log", "cleared", 0L);
        log.info("Super Admin cleared all activity logs.");
    }
}
