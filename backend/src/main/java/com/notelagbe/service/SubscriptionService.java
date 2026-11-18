package com.notelagbe.service;

import com.notelagbe.entity.*;
import com.notelagbe.repository.SubscriptionRepository;
import com.notelagbe.repository.UnlockedCourseRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.CacheManager;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class SubscriptionService {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionService.class);

    private final SubscriptionRepository subscriptionRepository;
    private final UnlockedCourseRepository unlockedCourseRepository;
    private final NotificationService notificationService;
    private final CacheManager cacheManager;

    // Concurrent map to hold super admin testing lock overrides (keyed by userId + ":" + courseCode)
    private final Set<String> superAdminTestLockedCourses = java.util.concurrent.ConcurrentHashMap.newKeySet();

    private String getSuperAdminTestKey(Long userId, String courseCode) {
        if (userId == null || courseCode == null) return "";
        return userId + ":" + courseCode.trim().toUpperCase();
    }

    public boolean isSuperAdminTestLocked(Long userId, String courseCode) {
        if (userId == null || courseCode == null) return false;
        return superAdminTestLockedCourses.contains(getSuperAdminTestKey(userId, courseCode));
    }

    public boolean setSuperAdminTestLock(Long userId, String courseCode, boolean locked) {
        if (userId == null || courseCode == null) return false;
        String key = getSuperAdminTestKey(userId, courseCode);
        if (locked) {
            superAdminTestLockedCourses.add(key);
        } else {
            superAdminTestLockedCourses.remove(key);
        }
        evictUnlockCaches();
        return locked;
    }

    public boolean toggleSuperAdminTestLock(Long userId, String courseCode) {
        boolean current = isSuperAdminTestLocked(userId, courseCode);
        return setSuperAdminTestLock(userId, courseCode, !current);
    }

    public SubscriptionService(SubscriptionRepository subscriptionRepository,
                               UnlockedCourseRepository unlockedCourseRepository,
                               NotificationService notificationService,
                               CacheManager cacheManager) {
        this.subscriptionRepository = subscriptionRepository;
        this.unlockedCourseRepository = unlockedCourseRepository;
        this.notificationService = notificationService;
        this.cacheManager = cacheManager;
    }

    private void evictUnlockCaches() {
        if (cacheManager != null) {
            for (String name : List.of("courses", "course_details", "course_resources", "teacher_resources", "admin_analytics", "admin_stats")) {
                var c = cacheManager.getCache(name);
                if (c != null) c.clear();
            }
        }
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
            evictUnlockCaches();

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

    private boolean isStaffUser(User user) {
        return user != null && user.getRole() != null &&
                (user.getRole() == Role.ROLE_ADMIN || user.getRole() == Role.ROLE_SUPER_ADMIN || user.getRole() == Role.ROLE_MANAGER);
    }

    private boolean isUnlockRowValid(UnlockedCourse uc, boolean hasActiveSub) {
        if (uc.getExpiresAt() != null && LocalDateTime.now().isAfter(uc.getExpiresAt())) {
            unlockedCourseRepository.delete(uc);
            return false;
        }
        UnlockSource src = uc.getSource();
        if (src == UnlockSource.CONTRIBUTION_REWARD || src == UnlockSource.FREE_WAIVER || src == UnlockSource.ADMIN_GIFT) {
            return true;
        }
        if (hasActiveSub) {
            return true;
        }
        unlockedCourseRepository.delete(uc);
        return false;
    }

    /**
     * Determines whether a course is currently unlocked in full (all faculty) for the user.
     * Faculty-scoped ADMIN_GIFT grants do NOT unlock full-course access.
     */
    @Transactional
    public boolean isCourseUnlocked(User user, Course course) {
        if (user == null || course == null) return false;

        // Super Admin Testing Mode override: if Super Admin explicitly locked this course for testing, treat as locked!
        if (user.getRole() == Role.ROLE_SUPER_ADMIN && isSuperAdminTestLocked(user.getId(), course.getCode())) {
            return false;
        }

        if (isStaffUser(user)) return true;

        Optional<Subscription> validSub = getValidActiveSubscription(user.getId());
        if (validSub.isPresent() && validSub.get().isUnlimited()) {
            return true;
        }

        boolean hasActiveSub = validSub.isPresent();
        List<UnlockedCourse> unlocks = unlockedCourseRepository.findAllByUserIdAndCourseId(user.getId(), course.getId());
        for (UnlockedCourse uc : unlocks) {
            if (uc.getTeacher() == null && isUnlockRowValid(uc, hasActiveSub)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Determines whether a specific faculty's materials under a course are unlocked for the user.
     */
    @Transactional
    public boolean isCourseUnlocked(User user, Course course, Teacher teacher) {
        if (user == null || course == null) return false;
        if (user.getRole() == Role.ROLE_SUPER_ADMIN && isSuperAdminTestLocked(user.getId(), course.getCode())) {
            return false;
        }
        if (isCourseUnlocked(user, course)) return true;
        if (teacher == null || teacher.getId() == null) return false;

        Optional<Subscription> validSub = getValidActiveSubscription(user.getId());
        boolean hasActiveSub = validSub.isPresent();
        List<UnlockedCourse> unlocks = unlockedCourseRepository.findAllByUserIdAndCourseId(user.getId(), course.getId());
        for (UnlockedCourse uc : unlocks) {
            if (uc.getTeacher() != null
                    && teacher.getId().equals(uc.getTeacher().getId())
                    && isUnlockRowValid(uc, hasActiveSub)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Returns teacher IDs specifically unlocked via faculty-scoped grants under this course.
     */
    @Transactional
    public Set<Long> getUnlockedTeacherIds(User user, Course course) {
        if (user == null || course == null) return Collections.emptySet();
        if (user.getRole() == Role.ROLE_SUPER_ADMIN && isSuperAdminTestLocked(user.getId(), course.getCode())) {
            return Collections.emptySet();
        }
        if (isStaffUser(user)) return Collections.emptySet();

        Optional<Subscription> validSub = getValidActiveSubscription(user.getId());
        if (validSub.isPresent() && validSub.get().isUnlimited()) {
            return Collections.emptySet();
        }

        boolean hasActiveSub = validSub.isPresent();
        List<UnlockedCourse> unlocks = unlockedCourseRepository.findAllByUserIdAndCourseId(user.getId(), course.getId());
        Set<Long> teacherIds = new HashSet<>();
        for (UnlockedCourse uc : unlocks) {
            if (uc.getTeacher() != null && isUnlockRowValid(uc, hasActiveSub)) {
                teacherIds.add(uc.getTeacher().getId());
            }
        }
        return teacherIds;
    }

    @Transactional
    public boolean hasAnyUnlockForCourse(User user, Course course) {
        return isCourseUnlocked(user, course) || !getUnlockedTeacherIds(user, course).isEmpty();
    }

    /**
     * Checks whether a specific resource is unlocked for the user (either full course or matching faculty gift).
     */
    @Transactional
    public boolean isResourceUnlocked(User user, Resource resource) {
        if (user == null || resource == null || resource.getCourse() == null) return false;
        if (user.getRole() == Role.ROLE_SUPER_ADMIN && isSuperAdminTestLocked(user.getId(), resource.getCourse().getCode())) {
            return false;
        }
        // Uploader always has access to view/download their own contributed material
        if (resource.getUploader() != null && user.getId() != null && user.getId().equals(resource.getUploader().getId())) {
            return true;
        }
        if (isCourseUnlocked(user, resource.getCourse())) return true;
        return resource.getTeacher() != null && isCourseUnlocked(user, resource.getCourse(), resource.getTeacher());
    }

    /**
     * Periodic background task every 10 minutes to auto-expire past subscriptions and contribution awards.
     */
    @Scheduled(fixedRate = 600000)
    @Transactional
    public void autoExpireSubscriptions() {
        LocalDateTime now = LocalDateTime.now();
        boolean changed = false;
        List<Subscription> expiredSubs = subscriptionRepository.findByActiveTrueAndEndDateBefore(now);
        for (Subscription sub : expiredSubs) {
            changed = true;
            sub.setActive(false);
            subscriptionRepository.save(sub);
            boolean hasOtherActiveSub = subscriptionRepository
                    .findByUserIdAndActiveTrueAndEndDateAfter(sub.getUser().getId(), now)
                    .stream()
                    .anyMatch(s -> !s.getId().equals(sub.getId()));
            if (!hasOtherActiveSub) {
                unlockedCourseRepository.deleteByUserIdAndSourceIn(
                        sub.getUser().getId(),
                        List.of(UnlockSource.PURCHASED_QUOTA, UnlockSource.YEAR_UNLIMITED)
                );
            }
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

        // Auto-expire individual unlocked courses (e.g. contribution rewards or gifted access whose validity has elapsed)
        List<UnlockedCourse> expiredUnlocks = unlockedCourseRepository.findByExpiresAtNotNullAndExpiresAtBefore(now);
        for (UnlockedCourse uc : expiredUnlocks) {
            changed = true;
            String courseCode = uc.getCourse() != null ? uc.getCourse().getCode() : "course";
            String facultySuffix = uc.getTeacher() != null ? " (" + uc.getTeacher().getName() + ")" : "";
            try {
                notificationService.createNotification(
                        uc.getUser(),
                        uc.getSource() == UnlockSource.ADMIN_GIFT ? "Gifted Faculty Access Ended ⏳" : "Course Reward Access Concluded ⏳",
                        "Your temporary access to " + courseCode + facultySuffix + " has concluded.",
                        "COURSE_EXPIRED",
                        "/pricing"
                );
            } catch (Exception ignored) {}
            unlockedCourseRepository.delete(uc);
            log.info("Auto-expired unlocked course id={} for user={}", uc.getId(), uc.getUser().getEmail());
        }

        if (changed) {
            evictUnlockCaches();
        }
    }
}
