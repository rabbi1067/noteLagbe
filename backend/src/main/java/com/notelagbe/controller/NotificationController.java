package com.notelagbe.controller;

import com.notelagbe.entity.Notification;
import com.notelagbe.security.CustomUserDetails;
import com.notelagbe.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<List<Notification>> getMyNotifications(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(notificationService.getUserNotifications(userDetails.getId()));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.ok(Map.of("unreadCount", 0L));
        }
        long count = notificationService.getUnreadCount(userDetails.getId());
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Map<String, Boolean>> markAsRead(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails != null) {
            notificationService.markAsRead(id, userDetails.getId());
        }
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/read-all")
    public ResponseEntity<Map<String, Boolean>> markAllAsRead(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails != null) {
            notificationService.markAllAsRead(userDetails.getId());
        }
        return ResponseEntity.ok(Map.of("success", true));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Boolean>> deleteNotification(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails != null) {
            notificationService.deleteNotification(id, userDetails.getId());
        }
        return ResponseEntity.ok(Map.of("success", true));
    }

    @DeleteMapping("/clear-all")
    public ResponseEntity<Map<String, Boolean>> clearAll(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails != null) {
            notificationService.clearAll(userDetails.getId());
        }
        return ResponseEntity.ok(Map.of("success", true));
    }
}
