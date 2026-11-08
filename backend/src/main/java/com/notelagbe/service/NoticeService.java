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
        return noticeRepository.findCurrentlyActiveNotices(LocalDateTime.now());
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
        notice.setStartsAt(req.getStartsAt());
        notice.setExpiresAt(req.getExpiresAt());
        notice.setCreatedAt(LocalDateTime.now());
        notice.setUpdatedAt(LocalDateTime.now());

        // Check if created with past expiration
        if (notice.getExpiresAt() != null && notice.getExpiresAt().isBefore(LocalDateTime.now())) {
            notice.setActive(false);
        }

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
        notice.setStartsAt(req.getStartsAt());
        notice.setExpiresAt(req.getExpiresAt());
        notice.setUpdatedAt(LocalDateTime.now());

        // Check if updated with past expiration
        if (notice.getExpiresAt() != null && notice.getExpiresAt().isBefore(LocalDateTime.now())) {
            notice.setActive(false);
        }

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
        // If enabling an already expired notice, clear the past expiration date
        if (nextState && notice.getExpiresAt() != null && notice.getExpiresAt().isBefore(LocalDateTime.now())) {
            notice.setExpiresAt(null);
        }

        notice.setActive(nextState);
        notice.setUpdatedAt(LocalDateTime.now());
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
