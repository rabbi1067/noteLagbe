package com.notelagbe.service;

import com.notelagbe.entity.Notification;
import com.notelagbe.entity.User;
import com.notelagbe.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private final NotificationRepository notificationRepository;
    private final LiveSyncService liveSyncService;

    public NotificationService(NotificationRepository notificationRepository,
                               LiveSyncService liveSyncService) {
        this.notificationRepository = notificationRepository;
        this.liveSyncService = liveSyncService;
    }

    @Transactional
    public Notification createNotification(User user, String title, String message, String type, String link) {
        try {
            String safeTitle = clip(title, 200);
            String safeMessage = clip(message, 1500);
            String safeType = clip(type != null ? type : "SYSTEM", 32);
            String safeLink = clip(link, 255);
            Notification notification = new Notification(user, safeTitle, safeMessage, safeType, safeLink);
            Notification saved = notificationRepository.save(notification);
            try {
                liveSyncService.broadcast("notification", "created", user != null ? user.getId() : null);
            } catch (Exception ignored) {}
            return saved;
        } catch (Exception ex) {
            log.warn("Failed to create or persist notification: {}", ex.getMessage());
            return null;
        }
    }

    private String clip(String str, int maxLen) {
        if (str == null) return "";
        String trimmed = str.trim();
        return trimmed.length() > maxLen ? trimmed.substring(0, maxLen - 3) + "..." : trimmed;
    }

    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getUser() != null && n.getUser().getId().equals(userId)) {
                n.setRead(true);
                notificationRepository.save(n);
            }
        });
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        List<Notification> list = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        for (Notification n : list) {
            if (!n.isRead()) {
                n.setRead(true);
            }
        }
        notificationRepository.saveAll(list);
    }

    @Transactional
    public void deleteNotification(Long notificationId, Long userId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getUser() != null && n.getUser().getId().equals(userId)) {
                notificationRepository.delete(n);
            }
        });
    }

    @Transactional
    public void clearAll(Long userId) {
        notificationRepository.deleteByUserId(userId);
    }
}
