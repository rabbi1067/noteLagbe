package com.notelagbe.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.notelagbe.dto.PaymentSubmitRequest;
import com.notelagbe.entity.*;
import com.notelagbe.exception.ApiException;
import com.notelagbe.exception.ResourceNotFoundException;
import com.notelagbe.repository.CourseRepository;
import com.notelagbe.repository.PaymentRequestRepository;
import com.notelagbe.repository.SubscriptionRepository;
import com.notelagbe.repository.UnlockedCourseRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class PaymentService {

    private final PaymentRequestRepository paymentRequestRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final UnlockedCourseRepository unlockedCourseRepository;
    private final CourseRepository courseRepository;
    private final ObjectMapper objectMapper;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final LiveSyncService liveSyncService;
    private final InputSanitizationService inputSanitizationService;

    public PaymentService(PaymentRequestRepository paymentRequestRepository,
                          SubscriptionRepository subscriptionRepository,
                          UnlockedCourseRepository unlockedCourseRepository,
                          CourseRepository courseRepository,
                          ObjectMapper objectMapper,
                          NotificationService notificationService,
                          EmailService emailService,
                          LiveSyncService liveSyncService,
                          InputSanitizationService inputSanitizationService) {
        this.paymentRequestRepository = paymentRequestRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.unlockedCourseRepository = unlockedCourseRepository;
        this.courseRepository = courseRepository;
        this.objectMapper = objectMapper;
        this.notificationService = notificationService;
        this.emailService = emailService;
        this.liveSyncService = liveSyncService;
        this.inputSanitizationService = inputSanitizationService;
    }

    @Transactional
    public PaymentRequest submitPayment(PaymentSubmitRequest request, User user) {
        // Enforce strict threat shield on payment inputs (Trx ID & BD Phone number)
        String cleanTrx = inputSanitizationService.sanitizeAndValidateTransactionId(request.getTransactionId());
        String cleanPhone = inputSanitizationService.sanitizeAndValidatePhoneNumber(request.getSenderPhone());
        String cleanSlip = inputSanitizationService.sanitizePlainText(request.getSlipUrl());

        if (paymentRequestRepository.existsByTransactionId(cleanTrx)) {
            throw new ApiException("This Transaction ID has already been submitted.");
        }

        PaymentRequest pr = new PaymentRequest();
        pr.setUser(user);
        pr.setPlanType(request.getPlanType());
        pr.setPaymentMethod(request.getPaymentMethod());
        pr.setSenderPhone(cleanPhone);
        pr.setTransactionId(cleanTrx);
        pr.setAmount(request.getPlanType().getPrice());
        pr.setSlipUrl(cleanSlip);
        pr.setSelectedCoursesJson(request.getSelectedCoursesJson());
        pr.setStatus(PaymentStatus.PENDING);

        PaymentRequest saved = paymentRequestRepository.save(pr);
        liveSyncService.broadcast("payment", "created", saved.getId());
        return saved;
    }

    public List<PaymentRequest> getPayments(PaymentStatus status) {
        if (status != null) {
            return paymentRequestRepository.findByStatusOrderByCreatedAtDesc(status);
        }
        return paymentRequestRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<PaymentRequest> getUserPayments(Long userId) {
        return paymentRequestRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public List<Subscription> getSubscriptions(Boolean activeOnly) {
        List<Subscription> list = subscriptionRepository.findAll(Sort.by(Sort.Direction.DESC, "startDate"));
        if (Boolean.TRUE.equals(activeOnly)) {
            return list.stream().filter(s -> s.isActive() && !s.isExpired()).toList();
        }
        return list;
    }

    @CacheEvict(value = {"courses", "course_details", "course_resources", "teacher_resources", "admin_analytics", "admin_stats"}, allEntries = true)
    @Transactional
    public PaymentRequest approvePayment(Long paymentId, String adminNotes) {
        PaymentRequest pr = paymentRequestRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment request not found: " + paymentId));

        if (pr.getStatus() == PaymentStatus.APPROVED) {
            throw new ApiException("Payment is already approved!");
        }

        pr.setStatus(PaymentStatus.APPROVED);
        pr.setAdminNotes(adminNotes);
        pr.setReviewedAt(LocalDateTime.now());
        paymentRequestRepository.save(pr);

        // Deactivate old active subscriptions if any
        subscriptionRepository.findFirstByUserIdAndActiveTrueOrderByStartDateDesc(pr.getUser().getId())
                .ifPresent(oldSub -> {
                    oldSub.setActive(false);
                    subscriptionRepository.save(oldSub);
                });

        // Create new Subscription for user
        Subscription sub = new Subscription(pr.getUser(), pr.getPlanType());
        subscriptionRepository.save(sub);

        // Auto-unlock selected courses if provided (legacy support)
        if (pr.getSelectedCoursesJson() != null && !pr.getSelectedCoursesJson().trim().isEmpty()) {
            try {
                List<Map<String, Object>> items = objectMapper.readValue(
                        pr.getSelectedCoursesJson(),
                        new TypeReference<List<Map<String, Object>>>() {}
                );
                int unlockedCount = 0;
                for (Map<String, Object> item : items) {
                    String code = (String) item.get("courseCode");
                    if (code == null) code = (String) item.get("code");
                    if (code != null) {
                        courseRepository.findByCodeIgnoreCase(code.trim()).ifPresent(course -> {
                            if (!unlockedCourseRepository.existsByUserIdAndCourseIdAndTeacherIsNull(pr.getUser().getId(), course.getId())) {
                                unlockedCourseRepository.save(new UnlockedCourse(pr.getUser(), course, UnlockSource.PURCHASED_QUOTA, sub.getEndDate()));
                            }
                        });
                        unlockedCount++;
                    }
                }
                sub.setUsedCoursesCount(unlockedCount);
                subscriptionRepository.save(sub);
            } catch (Exception e) {
                // Ignore parse errors, user can still unlock via quota
            }
        }

        // Send In-App Notification
        String planTitle = pr.getPlanType().getDisplayName();
        String quotaMsg = pr.getPlanType().isUnlimited()
                ? "Unlimited access to all courses for 1 Year!"
                : "You can unlock up to " + pr.getPlanType().getCourseQuota() + " courses directly from any course page.";

        notificationService.createNotification(
                pr.getUser(),
                "Payment Approved: " + planTitle + " 🎉",
                "Your payment (TrxID: " + pr.getTransactionId() + ") was approved by Admin. " + quotaMsg,
                "PAYMENT_APPROVED",
                "/courses"
        );

        // Trigger Async Email Notification (controlled by Admin Email Toggle)
        try {
            emailService.sendPaymentApprovalEmail(
                    pr.getUser(),
                    pr.getPlanType(),
                    pr.getAmount(),
                    pr.getTransactionId(),
                    pr.getPlanType().getCourseQuota(),
                    pr.getPlanType().isUnlimited()
            );
        } catch (Exception e) {
            // Fail gracefully without interrupting transaction
        }

        liveSyncService.broadcast("payment", "approved", pr.getId());
        liveSyncService.broadcast("subscription", "activated", pr.getUser().getId());

        return pr;
    }

    @Transactional
    public PaymentRequest rejectPayment(Long paymentId, String adminNotes) {
        PaymentRequest pr = paymentRequestRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment request not found: " + paymentId));

        pr.setStatus(PaymentStatus.REJECTED);
        pr.setAdminNotes(adminNotes);
        pr.setReviewedAt(LocalDateTime.now());

        // Send In-App Notification
        notificationService.createNotification(
                pr.getUser(),
                "Payment Request Declined ⚠️",
                "Your payment request (TrxID: " + pr.getTransactionId() + ") could not be verified." +
                        (adminNotes != null && !adminNotes.trim().isEmpty() ? " Admin note: " + adminNotes : " Please verify details and resubmit."),
                "PAYMENT_REJECTED",
                "/pricing"
        );

        PaymentRequest saved = paymentRequestRepository.save(pr);
        liveSyncService.broadcast("payment", "rejected", pr.getId());
        return saved;
    }
}
