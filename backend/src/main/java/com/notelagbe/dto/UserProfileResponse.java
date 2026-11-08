package com.notelagbe.dto;

import java.time.LocalDateTime;
import java.util.List;

public class UserProfileResponse {
    private Long id;
    private String name;
    private String email;
    private String studentId;
    private String phone;
    private String address;
    private String role;
    private String avatarUrl;
    private boolean chatBlocked;

    // Subscription Info
    private boolean hasActiveSubscription;
    private String planName;
    private int maxCoursesAllowed;
    private int usedCoursesCount;
    private int remainingCoursesCount;
    private boolean isUnlimited;
    private LocalDateTime subscriptionExpiresAt;

    // List of unlocked course codes
    private List<String> unlockedCourseCodes;

    public UserProfileResponse() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public boolean isHasActiveSubscription() { return hasActiveSubscription; }
    public void setHasActiveSubscription(boolean hasActiveSubscription) { this.hasActiveSubscription = hasActiveSubscription; }

    public String getPlanName() { return planName; }
    public void setPlanName(String planName) { this.planName = planName; }

    public int getMaxCoursesAllowed() { return maxCoursesAllowed; }
    public void setMaxCoursesAllowed(int maxCoursesAllowed) { this.maxCoursesAllowed = maxCoursesAllowed; }

    public int getUsedCoursesCount() { return usedCoursesCount; }
    public void setUsedCoursesCount(int usedCoursesCount) { this.usedCoursesCount = usedCoursesCount; }

    public int getRemainingCoursesCount() { return remainingCoursesCount; }
    public void setRemainingCoursesCount(int remainingCoursesCount) { this.remainingCoursesCount = remainingCoursesCount; }

    public boolean isUnlimited() { return isUnlimited; }
    public void setUnlimited(boolean unlimited) { isUnlimited = unlimited; }

    public LocalDateTime getSubscriptionExpiresAt() { return subscriptionExpiresAt; }
    public void setSubscriptionExpiresAt(LocalDateTime subscriptionExpiresAt) { this.subscriptionExpiresAt = subscriptionExpiresAt; }

    public boolean isChatBlocked() { return chatBlocked; }
    public void setChatBlocked(boolean chatBlocked) { this.chatBlocked = chatBlocked; }

    public List<String> getUnlockedCourseCodes() { return unlockedCourseCodes; }
    public void setUnlockedCourseCodes(List<String> unlockedCourseCodes) { this.unlockedCourseCodes = unlockedCourseCodes; }
}
