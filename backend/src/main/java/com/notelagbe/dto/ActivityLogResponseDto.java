package com.notelagbe.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.notelagbe.entity.ActivityLog;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public class ActivityLogResponseDto {
    private Long id;
    private String action;
    private String actionType;
    private String details;
    private String userEmail;
    private String userName;
    private String userRole;
    private String ipAddress;
    private String deviceInfo;
    private String status;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSS")
    private LocalDateTime createdAt;

    private String isoTimestamp;       // Standard ISO 8601 with Z e.g. 2026-11-09T10:24:06.874Z
    private String formattedDate;      // "Nov 9, 2026"
    private String formattedTime;      // "04:24:06 PM"
    private String relativeTime;       // "Just now", "2m ago"

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
        this.deviceInfo = log.getDeviceInfo() != null ? log.getDeviceInfo() : "Web Client";
        this.status = log.getStatus();
        this.createdAt = log.getCreatedAt();

        LocalDateTime dt = log.getCreatedAt() != null ? log.getCreatedAt() : LocalDateTime.now();
        ZoneId dhakaZone = ZoneId.of("Asia/Dhaka");
        ZonedDateTime dhakaTime = dt.atZone(ZoneId.systemDefault()).withZoneSameInstant(dhakaZone);

        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.ENGLISH);
        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("hh:mm:ss a", Locale.ENGLISH);

        this.formattedDate = dhakaTime.format(dateFormatter);
        this.formattedTime = dhakaTime.format(timeFormatter);
        this.isoTimestamp = dt.atZone(ZoneId.systemDefault()).toInstant().toString();

        Duration duration = Duration.between(dt, LocalDateTime.now());
        long seconds = Math.abs(duration.getSeconds());
        if (seconds < 45) {
            this.relativeTime = "Just now";
        } else if (seconds < 3600) {
            this.relativeTime = (seconds / 60) + "m ago";
        } else if (seconds < 86400) {
            this.relativeTime = (seconds / 3600) + "h ago";
        } else {
            this.relativeTime = (seconds / 86400) + "d ago";
        }
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

    public String getDeviceInfo() { return deviceInfo; }
    public void setDeviceInfo(String deviceInfo) { this.deviceInfo = deviceInfo; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public String getIsoTimestamp() { return isoTimestamp; }
    public void setIsoTimestamp(String isoTimestamp) { this.isoTimestamp = isoTimestamp; }

    public String getFormattedDate() { return formattedDate; }
    public void setFormattedDate(String formattedDate) { this.formattedDate = formattedDate; }

    public String getFormattedTime() { return formattedTime; }
    public void setFormattedTime(String formattedTime) { this.formattedTime = formattedTime; }

    public String getRelativeTime() { return relativeTime; }
    public void setRelativeTime(String relativeTime) { this.relativeTime = relativeTime; }
}
