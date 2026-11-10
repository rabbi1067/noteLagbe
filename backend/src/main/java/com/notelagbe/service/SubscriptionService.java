package com.notelagbe.service;

import com.notelagbe.entity.*;
import com.notelagbe.repository.SubscriptionRepository;
import com.notelagbe.repository.UnlockedCourseRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class SubscriptionService {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionService.class);

    private final SubscriptionRepository subscriptionRepository;
    private final UnlockedCourseRepository unlockedCourseRepository;
    private final NotificationService notificationService;

    public SubscriptionService(SubscriptionRepository subscriptionRepository,
                               UnlockedCourseRepository unlockedCourseRepository,
                               NotificationService notificationService) {
        this.subscriptionRepository = subscriptionRepository;
        this.unlockedCourseRepository = unlockedCourseRepository;
        this.notificationService = notificationService;
    }

    /**
     * Retrieves the user's active subscription if still within validity.
     * If expired (3 months for SEMESTER_1, 6 months for SEMESTER_2, 1 year for YEAR_1_UNLIMITED),
     * automatically deactivates the subscription, relocks quota courses, and notifies user.
     */
    @Transactional
    public Optional<Subscription> getValidActiveSubscription(Long userId) {
        if (userId == null) return Optional.empty();

        Optional<Subscription> subOpt = subscriptionRepository.findFirstByUserIdAndActiveTrueOrderByStartDateDesc(userId);
        if (subOpt.isEmpty()) {
            return Optional.empty();
        }

        Subscription sub = subOpt.get();
        if (sub.isExpired()) {
            log.info("Subscription id={} for user id={} expired on {}. Auto-locking courses.",
                    sub.getId(), userId, sub.getEndDate());
            sub.setActive(false);
            subscriptionRepository.save(sub);

            // Automatically relock courses unlocked via subscription quota / unlimited
            unlockedCourseRepository.deleteByUserIdAndSourceIn(
                    userId,
                    List.of(UnlockSource.PURCHASED_QUOTA, UnlockSource.YEAR_UNLIMITED)
            );

            // In-app alert
            try {
                notificationService.createNotification(
                        sub.getUser(),
                        "Subscription Validity Ended ⏳",
                        "Your " + sub.getPlanType().getDisplayName() + " has expired. Unlocked courses have been automatically locked. Renew anytime to regain full access!",
                        "SUBSCRIPTION_EXPIRED",
                        "/pricing"
                );
            } catch (Exception e) {
                log.warn("Failed to send subscription expiration notification: {}", e.getMessage());
            }

            return Optional.empty();
        }

        return Optional.of(sub);
    }

    /**
     * Determines whether a course is currently unlocked for the user.
     * Evaluates staff overrides, active subscription validity, quota, and contribution awards (3-month semester access).
     */
    @Transactional
    public boolean isCourseUnlocked(User user, Course course) {
        if (user == null || course == null) return false;

        // Staff have permanent administrative access
        if (user.getRole() == Role.ROLE_ADMIN || user.getRole() == Role.ROLE_SUPER_ADMIN || user.getRole() == Role.ROLE_MANAGER) {
            return true;
        }

        Optional<Subscription> validSub = getValidActiveSubscription(user.getId());
        if (validSub.isPresent()) {
            if (validSub.get().isUnlimited()) {
                return true;
            }
            Optional<UnlockedCourse> ucOpt = unlockedCourseRepository.findByUserIdAndCourseId(user.getId(), course.getId());
            if (ucOpt.isPresent()) {
                UnlockedCourse uc = ucOpt.get();
                if (uc.getExpiresAt() != null && LocalDateTime.now().isAfter(uc.getExpiresAt())) {
                    unlockedCourseRepository.delete(uc);
                    return false;
                }
                return true;
            }
            return false;
        }

        // Check if unlocked via non-subscription sources (e.g., 3-month contribution rewards or waivers)
        Optional<UnlockedCourse> ucOpt = unlockedCourseRepository.findByUserIdAndCourseId(user.getId(), course.getId());
        if (ucOpt.isPresent()) {
            UnlockedCourse uc = ucOpt.get();
            // If the 3-month contribution access or reward validity has passed, automatically expire and delete
            if (uc.getExpiresAt() != null && LocalDateTime.now().isAfter(uc.getExpiresAt())) {
                unlockedCourseRepository.delete(uc);
                return false;
            }
            UnlockSource src = uc.getSource();
            if (src == UnlockSource.CONTRIBUTION_REWARD || src == UnlockSource.FREE_WAIVER || src == UnlockSource.ADMIN_GIFT) {
                return true;
            } else {
                // Relock orphaned quota unlock because subscription has expired
                unlockedCourseRepository.delete(uc);
                return false;
            }
        }

        return false;
    }

    /**
     * Periodic background task every 10 minutes to auto-expire past subscriptions and contribution awards.
     */
    @Scheduled(fixedRate = 600000)
    @Transactional
    public void autoExpireSubscriptions() {
        LocalDateTime now = LocalDateTime.now();
        List<Subscription> expiredSubs = subscriptionRepository.findByActiveTrueAndEndDateBefore(now);
        for (Subscription sub : expiredSubs) {
            sub.setActive(false);
            subscriptionRepository.save(sub);
            unlockedCourseRepository.deleteByUserIdAndSourceIn(
                    sub.getUser().getId(),
                    List.of(UnlockSource.PURCHASED_QUOTA, UnlockSource.YEAR_UNLIMITED)
            );
            try {
                notificationService.createNotification(
                        sub.getUser(),
                        "Subscription Validity Ended ⏳",
                        "Your " + sub.getPlanType().getDisplayName() + " has expired. Unlocked courses have been automatically locked. Renew anytime to regain full access!",
                        "SUBSCRIPTION_EXPIRED",
                        "/pricing"
                );
            } catch (Exception e) {
                // Ignore
            }
            log.info("Auto-expired subscription id={} for user={}", sub.getId(), sub.getUser().getEmail());
        }

        // Auto-expire individual unlocked courses (e.g. 3-month contribution rewards whose validity has elapsed)
        List<UnlockedCourse> expiredUnlocks = unlockedCourseRepository.findByExpiresAtNotNullAndExpiresAtBefore(now);
        for (UnlockedCourse uc : expiredUnlocks) {
            try {
                notificationService.createNotification(
                        uc.getUser(),
                        "Course Reward Access Concluded ⏳",
                        "Your 3-month free access to " + (uc.getCourse() != null ? uc.getCourse().getCode() : "course") + " has concluded. Thank you for contributing to NoteLagbe!",
                        "COURSE_EXPIRED",
                        "/pricing"
                );
            } catch (Exception ignored) {}
            unlockedCourseRepository.delete(uc);
            log.info("Auto-expired unlocked course id={} for user={}", uc.getId(), uc.getUser().getEmail());
        }
    }
}
