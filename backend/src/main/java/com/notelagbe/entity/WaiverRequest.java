package com.notelagbe.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "waiver_requests")
public class WaiverRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private String studentId;

    private double cgpa;

    @Column(length = 2000, nullable = false)
    private String reason;

    @Column(length = 1000)
    private String idCardUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private PaymentStatus status = PaymentStatus.PENDING;

    private int grantedCoursesCount = 6;

    @Column(columnDefinition = "TEXT")
    private String adminNotes;

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime reviewedAt;

    public WaiverRequest() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public double getCgpa() { return cgpa; }
    public void setCgpa(double cgpa) { this.cgpa = cgpa; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getIdCardUrl() { return idCardUrl; }
    public void setIdCardUrl(String idCardUrl) { this.idCardUrl = idCardUrl; }

    public PaymentStatus getStatus() { return status; }
    public void setStatus(PaymentStatus status) { this.status = status; }

    public int getGrantedCoursesCount() { return grantedCoursesCount; }
    public void setGrantedCoursesCount(int grantedCoursesCount) { this.grantedCoursesCount = grantedCoursesCount; }

    public String getAdminNotes() { return adminNotes; }
    public void setAdminNotes(String adminNotes) { this.adminNotes = adminNotes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }
}
