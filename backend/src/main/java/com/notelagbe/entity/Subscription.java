package com.notelagbe.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "subscriptions")
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
}
