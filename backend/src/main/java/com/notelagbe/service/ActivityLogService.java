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

    /**
     * Log an action with detailed metadata and client IP.
     */
    @Transactional
    public ActivityLog logActivity(String action, String actionType, String details, String userEmail, String userName, String userRole, String ipAddress, String status) {
        try {
            String safeIp = (ipAddress != null && !ipAddress.isBlank()) ? ipAddress : "127.0.0.1";
            ActivityLog entry = new ActivityLog(
                    action,
                    actionType,
                    details,
                    userEmail,
                    userName,
                    userRole,
                    safeIp,
                    status != null ? status : "SUCCESS"
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
     * Overload accepting User object.
     */
    @Transactional
    public ActivityLog logActivity(String action, String actionType, String details, User user, String ipAddress, String status) {
        String email = user != null ? user.getEmail() : "system@seu.edu.bd";
        String name = user != null ? user.getName() : "System Automated";
        String role = user != null && user.getRole() != null ? user.getRole().name() : "SYSTEM";
        return logActivity(action, actionType, details, email, name, role, ipAddress, status);
    }

    /**
     * Overload extracting IP and user from request.
     */
    @Transactional
    public ActivityLog logActivity(String action, String actionType, String details, User user, HttpServletRequest request) {
        String clientIp = getClientIp(request);
        return logActivity(action, actionType, details, user, clientIp, "SUCCESS");
    }

    /**
     * Resolves the real client IP, considering proxies, Cloudflare tunnels, and load balancers.
     */
    public static String getClientIp(HttpServletRequest request) {
        if (request == null) return "127.0.0.1";

        String[] headers = {
                "CF-Connecting-IP",      // Cloudflare tunnel
                "X-Forwarded-For",
                "X-Real-IP",
                "Proxy-Client-IP",
                "WL-Proxy-Client-IP"
        };

        for (String header : headers) {
            String ip = request.getHeader(header);
            if (ip != null && !ip.isBlank() && !"unknown".equalsIgnoreCase(ip)) {
                return ip.split(",")[0].trim();
            }
        }

        String remote = request.getRemoteAddr();
        if ("0:0:0:0:0:0:0:1".equals(remote)) {
            return "127.0.0.1";
        }
        return remote != null ? remote : "127.0.0.1";
    }

    /**
     * Query activity logs with 365-day rolling retention and server-side pagination.
     */
    @Transactional(readOnly = true)
    public ActivityLogPageResponse getActivityLogs(int page, int size, String search, String actionType) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(100, Math.max(1, size));
        Pageable pageable = PageRequest.of(safePage, safeSize);

        // 365-day rolling retention cutoff: ajk theke bigoto one year show korbe
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
     * "agamikal aber last day thake one day auto delete hoye jabe ay vabe"
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
