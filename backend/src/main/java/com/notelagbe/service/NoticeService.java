package com.notelagbe.service;

import com.notelagbe.dto.NoticeRequest;
import com.notelagbe.entity.Notice;
import com.notelagbe.exception.ResourceNotFoundException;
import com.notelagbe.repository.NoticeRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class NoticeService {

    private final NoticeRepository noticeRepository;
    private final LiveSyncService liveSyncService;

    public NoticeService(NoticeRepository noticeRepository, LiveSyncService liveSyncService) {
        this.noticeRepository = noticeRepository;
        this.liveSyncService = liveSyncService;
    }

    @Cacheable(value = "active_notices", unless = "#result == null || #result.isEmpty()")
    @Transactional
    public List<Notice> getActiveNotices() {
        autoPauseExpiredNotices();
        LocalDateTime now = LocalDateTime.now();
        // Allow up to 1-hour timezone/clock skew tolerance for newly scheduled notices
        LocalDateTime skewNow = now.plusHours(1);
        return noticeRepository.findCurrentlyActiveNotices(now, skewNow);
    }

    @Transactional
    public List<Notice> getAllNotices() {
        autoPauseExpiredNotices();
        return noticeRepository.findAllByOrderByPriorityDescCreatedAtDesc();
    }

    /**
     * Auto-pauses notices that have passed their expiresAt timestamp.
     * Runs every 30 seconds and also invoked synchronously on notice fetches.
     */
    @CacheEvict(value = "active_notices", allEntries = true)
    @Scheduled(fixedRate = 30000)
    @Transactional
    public void autoPauseExpiredNotices() {
        LocalDateTime now = LocalDateTime.now();
        List<Notice> expired = noticeRepository.findExpiredActiveNotices(now);
        if (!expired.isEmpty()) {
            for (Notice n : expired) {
                n.setActive(false);
                n.setUpdatedAt(now);
                noticeRepository.save(n);
            }
            liveSyncService.broadcast("notice", "expired_auto_paused", null);
        }
    }

    @CacheEvict(value = "active_notices", allEntries = true)
    @Transactional
    public Notice createNotice(NoticeRequest req) {
        Notice notice = new Notice();
        notice.setText(req.getText().trim());
        notice.setType(req.getType() != null && !req.getType().trim().isEmpty() ? req.getType().trim().toUpperCase() : "INFO");
        notice.setLink(req.getLink() != null && !req.getLink().trim().isEmpty() ? req.getLink().trim() : null);
        notice.setActive(req.isActive());
        notice.setPriority(req.getPriority());

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startsAt = req.getStartsAt();
        LocalDateTime expiresAt = req.getExpiresAt();

        // If startsAt is in the past or within 15 minutes of now, treat as immediately live
        if (startsAt != null && startsAt.isBefore(now.plusMinutes(15))) {
            startsAt = null;
        }

        // If expiresAt is in the past or before startsAt, clear it to prevent immediate auto-pause
        if (expiresAt != null && (expiresAt.isBefore(now) || (startsAt != null && expiresAt.isBefore(startsAt)))) {
            expiresAt = null;
        }

        notice.setStartsAt(startsAt);
        notice.setExpiresAt(expiresAt);
        notice.setCreatedAt(now);
        notice.setUpdatedAt(now);

        Notice saved = noticeRepository.save(notice);
        liveSyncService.broadcast("notice", "created", saved.getId());
        return saved;
    }

    @CacheEvict(value = "active_notices", allEntries = true)
    @Transactional
    public Notice updateNotice(Long id, NoticeRequest req) {
        Notice notice = noticeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notice not found with ID: " + id));

        notice.setText(req.getText().trim());
        if (req.getType() != null && !req.getType().trim().isEmpty()) {
            notice.setType(req.getType().trim().toUpperCase());
        }
        notice.setLink(req.getLink() != null && !req.getLink().trim().isEmpty() ? req.getLink().trim() : null);
        notice.setActive(req.isActive());
        notice.setPriority(req.getPriority());

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startsAt = req.getStartsAt();
        LocalDateTime expiresAt = req.getExpiresAt();

        // If startsAt is in the past or within 15 minutes of now, treat as immediate
        if (startsAt != null && startsAt.isBefore(now.plusMinutes(15))) {
            startsAt = null;
        }

        // If expiresAt is in the past or before startsAt, clear it
        if (expiresAt != null && (expiresAt.isBefore(now) || (startsAt != null && expiresAt.isBefore(startsAt)))) {
            expiresAt = null;
        }

        notice.setStartsAt(startsAt);
        notice.setExpiresAt(expiresAt);
        notice.setUpdatedAt(now);

        Notice updated = noticeRepository.save(notice);
        liveSyncService.broadcast("notice", "updated", id);
        return updated;
    }

    @CacheEvict(value = "active_notices", allEntries = true)
    @Transactional
    public void deleteNotice(Long id) {
        if (!noticeRepository.existsById(id)) {
            throw new ResourceNotFoundException("Notice not found with ID: " + id);
        }
        noticeRepository.deleteById(id);
        liveSyncService.broadcast("notice", "deleted", id);
    }

    @CacheEvict(value = "active_notices", allEntries = true)
    @Transactional
    public Map<String, Object> toggleNoticeStatus(Long id) {
        Notice notice = noticeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notice not found with ID: " + id));

        boolean nextState = !notice.isActive();
        LocalDateTime now = LocalDateTime.now();

        if (nextState) {
            // Admin clicked "Go Live": ensure notice is immediately active on the site
            // 1. Clear any past or invalid expiration date
            if (notice.getExpiresAt() != null && notice.getExpiresAt().isBefore(now)) {
                notice.setExpiresAt(null);
            }
            // 2. If startsAt was set in the future, reset to null so it is active right now
            if (notice.getStartsAt() != null && notice.getStartsAt().isAfter(now)) {
                notice.setStartsAt(null);
            }
            // 3. If expiresAt is before startsAt, clear expiresAt
            if (notice.getExpiresAt() != null && notice.getStartsAt() != null && notice.getExpiresAt().isBefore(notice.getStartsAt())) {
                notice.setExpiresAt(null);
            }
        }

        notice.setActive(nextState);
        notice.setUpdatedAt(now);
        noticeRepository.save(notice);

        liveSyncService.broadcast("notice", "updated", id);

        return Map.of(
                "success", true,
                "id", id,
                "active", notice.isActive(),
                "message", notice.isActive() ? "Notice published and visible live" : "Notice paused from display"
        );
    }
}
