package com.notelagbe.dto;

public class ContributorLeaderboardItem {
    private int rank;
    private Long userId;
    private String name;
    private String studentId;
    private String department;
    private int approvedContributions;
    private String badge;
    private String title;
    private String avatarUrl;

    public ContributorLeaderboardItem() {}

    public ContributorLeaderboardItem(int rank, Long userId, String name, String studentId, String department, int approvedContributions, String badge, String title, String avatarUrl) {
        this.rank = rank;
        this.userId = userId;
        this.name = name;
        this.studentId = studentId;
        this.department = department;
        this.approvedContributions = approvedContributions;
        this.badge = badge;
        this.title = title;
        this.avatarUrl = avatarUrl;
    }

    public int getRank() { return rank; }
    public void setRank(int rank) { this.rank = rank; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public int getApprovedContributions() { return approvedContributions; }
    public void setApprovedContributions(int approvedContributions) { this.approvedContributions = approvedContributions; }

    public String getBadge() { return badge; }
    public void setBadge(String badge) { this.badge = badge; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
}
