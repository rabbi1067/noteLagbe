package com.notelagbe.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "activity_logs", indexes = {
    @Index(name = "idx_activity_logs_created_at", columnList = "createdAt"),
    @Index(name = "idx_activity_logs_action_type", columnList = "actionType"),
    @Index(name = "idx_activity_logs_user_email", columnList = "userEmail")
})
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String action; // e.g., USER_LOGIN, RESOURCE_UPLOAD, COURSE_UPDATE, NOTICE_CREATE, PAYMENT_APPROVE

    @Column(nullable = false, length = 50)
    private String actionType = "SYSTEM"; // AUTH, CONTENT, ACADEMIC, STAFF, BILLING, SYSTEM

    @Column(nullable = false, length = 2000)
    private String details;

    @Column(length = 150)
    private String userEmail;

    @Column(length = 150)
    private String userName;

    @Column(length = 50)
    private String userRole;

    @Column(nullable = false, length = 60)
    private String ipAddress = "127.0.0.1";

    @Column(length = 30)
    private String status = "SUCCESS"; // SUCCESS, FAILED, WARNING

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public ActivityLog() {}

    public ActivityLog(String action, String actionType, String details, String userEmail, String userName, String userRole, String ipAddress, String status) {
        this.action = action;
        this.actionType = actionType != null ? actionType : "SYSTEM";
        this.details = details;
        this.userEmail = userEmail;
        this.userName = userName;
        this.userRole = userRole;
        this.ipAddress = ipAddress != null && !ipAddress.isBlank() ? ipAddress : "127.0.0.1";
        this.status = status != null ? status : "SUCCESS";
        this.createdAt = LocalDateTime.now();
    }

    public ActivityLog(String action, String actionType, String details, String userEmail, String userName, String userRole, String ipAddress, String status, LocalDateTime createdAt) {
        this.action = action;
        this.actionType = actionType != null ? actionType : "SYSTEM";
        this.details = details;
        this.userEmail = userEmail;
        this.userName = userName;
        this.userRole = userRole;
        this.ipAddress = ipAddress != null && !ipAddress.isBlank() ? ipAddress : "127.0.0.1";
        this.status = status != null ? status : "SUCCESS";
        this.createdAt = createdAt != null ? createdAt : LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getActionType() {
        return actionType;
    }

    public void setActionType(String actionType) {
        this.actionType = actionType;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getUserRole() {
        return userRole;
    }

    public void setUserRole(String userRole) {
        this.userRole = userRole;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
