package com.notelagbe.service;

import org.springframework.cache.annotation.CacheEvict;

import com.notelagbe.dto.WaiverSubmitRequest;
import com.notelagbe.entity.PaymentStatus;
import com.notelagbe.entity.PlanType;
import com.notelagbe.entity.Subscription;
import com.notelagbe.entity.User;
import com.notelagbe.entity.WaiverRequest;
import com.notelagbe.exception.ApiException;
import com.notelagbe.exception.ResourceNotFoundException;
import com.notelagbe.repository.SubscriptionRepository;
import com.notelagbe.repository.WaiverRequestRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class WaiverService {

    private static final Logger log = LoggerFactory.getLogger(WaiverService.class);

    private final WaiverRequestRepository waiverRequestRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final LiveSyncService liveSyncService;
    private final InputSanitizationService inputSanitizationService;

    public WaiverService(WaiverRequestRepository waiverRequestRepository,
                         SubscriptionRepository subscriptionRepository,
                         NotificationService notificationService,
                         @Autowired(required = false) EmailService emailService,
                         LiveSyncService liveSyncService,
                         InputSanitizationService inputSanitizationService) {
        this.waiverRequestRepository = waiverRequestRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.notificationService = notificationService;
        this.emailService = emailService;
        this.liveSyncService = liveSyncService;
        this.inputSanitizationService = inputSanitizationService;
    }

    @Transactional
    public synchronized WaiverRequest submitWaiver(WaiverSubmitRequest request, User user) {
        if (waiverRequestRepository.existsByUserIdAndStatus(user.getId(), PaymentStatus.PENDING)) {
            throw new ApiException("You already have an active waiver request currently pending review. Please wait for administrator verification.", org.springframework.http.HttpStatus.CONFLICT);
        }

        // Enforce input sanitization & genuine content verification
        String cleanStudentId = inputSanitizationService.sanitizeAndValidateStudentId(request.getStudentId());
        String cleanReason = inputSanitizationService.sanitizeAndValidateWaiverReason(request.getReason());
        String cleanCardUrl = inputSanitizationService.sanitizePlainText(request.getIdCardUrl());

        WaiverRequest wr = new WaiverRequest();
        wr.setUser(user);
        wr.setStudentId(cleanStudentId);
        wr.setCgpa(request.getCgpa() != null ? request.getCgpa() : 0.0);
        wr.setReason(cleanReason);
        wr.setIdCardUrl(cleanCardUrl);
        wr.setStatus(PaymentStatus.PENDING);
        wr.setGrantedCoursesCount(6);

        WaiverRequest saved = waiverRequestRepository.save(wr);
        liveSyncService.broadcast("waiver", "created", saved.getId());
        return saved;
    }

    public List<WaiverRequest> getWaivers(PaymentStatus status) {
        if (status != null) {
            return waiverRequestRepository.findByStatusOrderByCreatedAtDesc(status);
        }
        return waiverRequestRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<WaiverRequest> getUserWaivers(Long userId) {
        return waiverRequestRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @CacheEvict(value = {"courses", "course_details", "course_resources", "teacher_resources", "admin_analytics", "admin_stats"}, allEntries = true)
    @Transactional
    public WaiverRequest approveWaiver(Long waiverId, int grantedCoursesCount, String notes) {
        WaiverRequest wr = waiverRequestRepository.findById(waiverId)
                .orElseThrow(() -> new ResourceNotFoundException("Waiver request not found: " + waiverId));

        if (wr.getStatus() == PaymentStatus.APPROVED) {
            throw new ApiException("Waiver request is already approved!");
        }

        int quota = grantedCoursesCount > 0 ? grantedCoursesCount : 6;
        wr.setStatus(PaymentStatus.APPROVED);
        wr.setGrantedCoursesCount(quota);
        wr.setAdminNotes(notes != null ? notes : "Approved for ৳99 package (" + quota + " course unlocks quota).");
        wr.setReviewedAt(LocalDateTime.now());
        waiverRequestRepository.save(wr);

        // Deactivate old active subscriptions if any
        subscriptionRepository.findFirstByUserIdAndActiveTrueOrderByStartDateDesc(wr.getUser().getId())
                .ifPresent(sub -> {
                    sub.setActive(false);
                    subscriptionRepository.save(sub);
                });

        // Create ৳99 Package (1-Semester Plan, 3 Months, granted quota)
        Subscription waiverSub = new Subscription();
        waiverSub.setUser(wr.getUser());
        waiverSub.setPlanType(PlanType.SEMESTER_1);
        waiverSub.setMaxCoursesAllowed(quota);
        waiverSub.setUsedCoursesCount(0);
        waiverSub.setUnlimited(false);
        waiverSub.setActive(true);
        waiverSub.setStartDate(LocalDateTime.now());
        waiverSub.setEndDate(LocalDateTime.now().plusMonths(3));
        subscriptionRepository.save(waiverSub);

        // Send In-App Notification to student
        try {
            notificationService.createNotification(
                    wr.getUser(),
                    "Financial Aid / Waiver Approved! 🎉",
                    "Your financial aid / waiver application has been approved by Admin! The ৳99 package (1-Semester Plan) is active on your profile with " + quota + " course unlocks quota for 3 months.",
                    "WAIVER_APPROVED",
                    "/courses"
            );
        } catch (Exception e) {
            log.warn("Failed to create in-app notification for waiver: {}", e.getMessage());
        }

        // Send confirmation Email if enabled
        if (emailService != null) {
            try {
                emailService.sendWaiverApprovalEmail(wr.getUser(), quota);
            } catch (Exception e) {
                log.warn("Failed to send waiver approval email: {}", e.getMessage());
            }
        }

        liveSyncService.broadcast("waiver", "approved", wr.getId());
        liveSyncService.broadcast("subscription", "activated", wr.getUser().getId());

        return wr;
    }

    @CacheEvict(value = {"courses", "course_details", "course_resources", "teacher_resources", "admin_analytics", "admin_stats"}, allEntries = true)
    @Transactional
    public WaiverRequest rejectWaiver(Long waiverId, String notes) {
        WaiverRequest wr = waiverRequestRepository.findById(waiverId)
                .orElseThrow(() -> new ResourceNotFoundException("Waiver request not found: " + waiverId));

        if (wr.getStatus() == PaymentStatus.APPROVED) {
            throw new ApiException("An already approved waiver cannot be rejected directly.");
        }

        wr.setStatus(PaymentStatus.REJECTED);
        wr.setAdminNotes(notes);
        wr.setReviewedAt(LocalDateTime.now());
        WaiverRequest saved = waiverRequestRepository.save(wr);

        // Send In-App Notification to student
        try {
            notificationService.createNotification(
                    wr.getUser(),
                    "Financial Aid Application Update",
                    "Your financial aid / waiver request was reviewed: " + (notes != null ? notes : "Application declined by administrator."),
                    "WAIVER_DECLINED",
                    "/pricing"
            );
        } catch (Exception e) {
            log.warn("Failed to create notification for waiver rejection: {}", e.getMessage());
        }

        liveSyncService.broadcast("waiver", "rejected", wr.getId());

        return saved;
    }
}
