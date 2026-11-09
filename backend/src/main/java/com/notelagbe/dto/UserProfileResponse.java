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

    // Rich unlocked courses metadata for live remaining countdown
    private List<UnlockedCourseDetail> unlockedCourseDetails;
    private Long activeAccessRemainingDays;
    private Long activeAccessRemainingHours;
    private LocalDateTime activeAccessExpiresAt;
    private String activeAccessSource; // "SUBSCRIPTION" | "CONTRIBUTION_REWARD" | "STAFF" | "NONE"

    public static class UnlockedCourseDetail {
        private Long courseId;
        private String courseCode;
        private String courseTitle;
        private String department;
        private String source;
        private LocalDateTime unlockedAt;
        private LocalDateTime expiresAt;
        private long remainingDays;
        private long remainingHours;
        private boolean isExpired;

        public UnlockedCourseDetail() {}

        public UnlockedCourseDetail(Long courseId, String courseCode, String courseTitle, String department,
                                    String source, LocalDateTime unlockedAt, LocalDateTime expiresAt,
                                    long remainingDays, long remainingHours, boolean isExpired) {
            this.courseId = courseId;
            this.courseCode = courseCode;
            this.courseTitle = courseTitle;
            this.department = department;
            this.source = source;
            this.unlockedAt = unlockedAt;
            this.expiresAt = expiresAt;
            this.remainingDays = remainingDays;
            this.remainingHours = remainingHours;
            this.isExpired = isExpired;
        }

        public Long getCourseId() { return courseId; }
        public void setCourseId(Long courseId) { this.courseId = courseId; }

        public String getCourseCode() { return courseCode; }
        public void setCourseCode(String courseCode) { this.courseCode = courseCode; }

        public String getCourseTitle() { return courseTitle; }
        public void setCourseTitle(String courseTitle) { this.courseTitle = courseTitle; }

        public String getDepartment() { return department; }
        public void setDepartment(String department) { this.department = department; }

        public String getSource() { return source; }
        public void setSource(String source) { this.source = source; }

        public LocalDateTime getUnlockedAt() { return unlockedAt; }
        public void setUnlockedAt(LocalDateTime unlockedAt) { this.unlockedAt = unlockedAt; }

        public LocalDateTime getExpiresAt() { return expiresAt; }
        public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }

        public long getRemainingDays() { return remainingDays; }
        public void setRemainingDays(long remainingDays) { this.remainingDays = remainingDays; }

        public long getRemainingHours() { return remainingHours; }
        public void setRemainingHours(long remainingHours) { this.remainingHours = remainingHours; }

        public boolean isExpired() { return isExpired; }
        public void setExpired(boolean expired) { isExpired = expired; }
    }

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

    public List<UnlockedCourseDetail> getUnlockedCourseDetails() { return unlockedCourseDetails; }
    public void setUnlockedCourseDetails(List<UnlockedCourseDetail> unlockedCourseDetails) { this.unlockedCourseDetails = unlockedCourseDetails; }

    public Long getActiveAccessRemainingDays() { return activeAccessRemainingDays; }
    public void setActiveAccessRemainingDays(Long activeAccessRemainingDays) { this.activeAccessRemainingDays = activeAccessRemainingDays; }

    public Long getActiveAccessRemainingHours() { return activeAccessRemainingHours; }
    public void setActiveAccessRemainingHours(Long activeAccessRemainingHours) { this.activeAccessRemainingHours = activeAccessRemainingHours; }

    public LocalDateTime getActiveAccessExpiresAt() { return activeAccessExpiresAt; }
    public void setActiveAccessExpiresAt(LocalDateTime activeAccessExpiresAt) { this.activeAccessExpiresAt = activeAccessExpiresAt; }

    public String getActiveAccessSource() { return activeAccessSource; }
    public void setActiveAccessSource(String activeAccessSource) { this.activeAccessSource = activeAccessSource; }
}
