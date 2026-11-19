package com.notelagbe.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "contribution_requests")
public class ContributionRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @OneToOne(fetch = FetchType.EAGER, cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinColumn(name = "resource_id", nullable = false)
    private Resource uploadedResource;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "requested_course1_id", nullable = false)
    private Course requestedCourse1;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "requested_teacher1_id")
    private Teacher requestedTeacher1;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "requested_course2_id", nullable = false)
    private Course requestedCourse2;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "requested_teacher2_id")
    private Teacher requestedTeacher2;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ResourceStatus status = ResourceStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String adminFeedback;

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime reviewedAt;

    public ContributionRequest() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Resource getUploadedResource() { return uploadedResource; }
    public void setUploadedResource(Resource uploadedResource) { this.uploadedResource = uploadedResource; }

    public Course getRequestedCourse1() { return requestedCourse1; }
    public void setRequestedCourse1(Course requestedCourse1) { this.requestedCourse1 = requestedCourse1; }

    public Teacher getRequestedTeacher1() { return requestedTeacher1; }
    public void setRequestedTeacher1(Teacher requestedTeacher1) { this.requestedTeacher1 = requestedTeacher1; }

    public Course getRequestedCourse2() { return requestedCourse2; }
    public void setRequestedCourse2(Course requestedCourse2) { this.requestedCourse2 = requestedCourse2; }

    public Teacher getRequestedTeacher2() { return requestedTeacher2; }
    public void setRequestedTeacher2(Teacher requestedTeacher2) { this.requestedTeacher2 = requestedTeacher2; }

    public ResourceStatus getStatus() { return status; }
    public void setStatus(ResourceStatus status) { this.status = status; }

    public String getAdminFeedback() { return adminFeedback; }
    public void setAdminFeedback(String adminFeedback) { this.adminFeedback = adminFeedback; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }
}
