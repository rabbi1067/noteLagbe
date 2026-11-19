package com.notelagbe.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "subscriptions", indexes = {
    @Index(name = "idx_subs_user_active_date", columnList = "user_id, active, start_date")
})
public class Subscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private PlanType planType;

    private int maxCoursesAllowed = 6;

    private int usedCoursesCount = 0;

    private boolean isUnlimited = false;

    private boolean active = true;

    private LocalDateTime startDate = LocalDateTime.now();

    private LocalDateTime endDate;

    private boolean paused = false;

    private LocalDateTime pausedAt;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "paused_by_user_id")
    private User pausedBy;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "payment_request_id")
    private PaymentRequest paymentRequest;

    @Transient
    private java.util.List<String> unlockedCourseCodes = new java.util.ArrayList<>();

    public Subscription() {}

    public Subscription(User user, PlanType planType) {
        this.user = user;
        this.planType = planType;
        this.maxCoursesAllowed = planType.getCourseQuota();
        this.isUnlimited = planType.isUnlimited();
        this.startDate = LocalDateTime.now();
        if (planType == PlanType.SEMESTER_1) {
            this.endDate = this.startDate.plusMonths(3);
        } else if (planType == PlanType.SEMESTER_2) {
            this.endDate = this.startDate.plusMonths(6);
        } else if (planType == PlanType.YEAR_1_UNLIMITED) {
            this.endDate = this.startDate.plusYears(1);
        } else {
            this.endDate = this.startDate.plusMonths(3);
        }
    }

    public boolean isExpired() {
        return endDate != null && LocalDateTime.now().isAfter(endDate);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public PlanType getPlanType() { return planType; }
    public void setPlanType(PlanType planType) { this.planType = planType; }

    public int getMaxCoursesAllowed() { return maxCoursesAllowed; }
    public void setMaxCoursesAllowed(int maxCoursesAllowed) { this.maxCoursesAllowed = maxCoursesAllowed; }

    public int getUsedCoursesCount() { return usedCoursesCount; }
    public void setUsedCoursesCount(int usedCoursesCount) { this.usedCoursesCount = usedCoursesCount; }

    public boolean isUnlimited() { return isUnlimited; }
    public void setUnlimited(boolean unlimited) { this.isUnlimited = unlimited; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public LocalDateTime getStartDate() { return startDate; }
    public void setStartDate(LocalDateTime startDate) { this.startDate = startDate; }

    public LocalDateTime getEndDate() { return endDate; }
    public void setEndDate(LocalDateTime endDate) { this.endDate = endDate; }

    public boolean isPaused() { return paused; }
    public void setPaused(boolean paused) { this.paused = paused; }

    public LocalDateTime getPausedAt() { return pausedAt; }
    public void setPausedAt(LocalDateTime pausedAt) { this.pausedAt = pausedAt; }

    public User getPausedBy() { return pausedBy; }
    public void setPausedBy(User pausedBy) { this.pausedBy = pausedBy; }

    public PaymentRequest getPaymentRequest() { return paymentRequest; }
    public void setPaymentRequest(PaymentRequest paymentRequest) { this.paymentRequest = paymentRequest; }

    public java.util.List<String> getUnlockedCourseCodes() { return unlockedCourseCodes; }
    public void setUnlockedCourseCodes(java.util.List<String> unlockedCourseCodes) { this.unlockedCourseCodes = unlockedCourseCodes; }

    @Transient
    public String getSenderPhone() {
        if (paymentRequest != null && paymentRequest.getSenderPhone() != null && !paymentRequest.getSenderPhone().isBlank()) {
            return paymentRequest.getSenderPhone();
        }
        return user != null ? user.getPhone() : null;
    }

    @Transient
    public String getTransactionId() {
        return paymentRequest != null ? paymentRequest.getTransactionId() : null;
    }

    @Transient
    public PaymentMethod getPaymentMethod() {
        return paymentRequest != null ? paymentRequest.getPaymentMethod() : null;
    }

    @Transient
    public LocalDateTime getPaymentSubmittedAt() {
        return paymentRequest != null ? paymentRequest.getCreatedAt() : null;
    }

    @Transient
    public Double getPaymentAmount() {
        return paymentRequest != null ? paymentRequest.getAmount() : null;
    }
}
