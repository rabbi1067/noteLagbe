package com.notelagbe.dto;

import com.notelagbe.entity.ActivityLog;
import java.time.LocalDateTime;

public class ActivityLogResponseDto {
    private Long id;
    private String action;
    private String actionType;
    private String details;
    private String userEmail;
    private String userName;
    private String userRole;
    private String ipAddress;
    private String status;
    private LocalDateTime createdAt;

    public ActivityLogResponseDto() {}

    public ActivityLogResponseDto(ActivityLog log) {
        this.id = log.getId();
        this.action = log.getAction();
        this.actionType = log.getActionType();
        this.details = log.getDetails();
        this.userEmail = log.getUserEmail();
        this.userName = log.getUserName();
        this.userRole = log.getUserRole();
        this.ipAddress = log.getIpAddress();
        this.status = log.getStatus();
        this.createdAt = log.getCreatedAt();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getActionType() { return actionType; }
    public void setActionType(String actionType) { this.actionType = actionType; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }

    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }

    public String getUserRole() { return userRole; }
    public void setUserRole(String userRole) { this.userRole = userRole; }

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
