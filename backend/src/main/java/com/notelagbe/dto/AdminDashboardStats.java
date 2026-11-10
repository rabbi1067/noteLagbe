package com.notelagbe.dto;

public class AdminDashboardStats {
    private long totalUsers;
    private long totalStudents;
    private long totalTeachers;
    private long totalCourses;
    private long totalResources;
    private long totalApprovedNotes;
    private long totalApprovedQuestions;

    private long pendingPayments;
    private long pendingContributions;
    private long pendingWaivers;
    private long pendingReviews;
    private long activePremiumUsers;

    private double totalRevenue;

    public AdminDashboardStats() {}

    public long getTotalUsers() { return totalUsers; }
    public void setTotalUsers(long totalUsers) { this.totalUsers = totalUsers; }

    public long getTotalStudents() { return totalStudents; }
    public void setTotalStudents(long totalStudents) { this.totalStudents = totalStudents; }

    public long getTotalTeachers() { return totalTeachers; }
    public void setTotalTeachers(long totalTeachers) { this.totalTeachers = totalTeachers; }

    public long getTotalCourses() { return totalCourses; }
    public void setTotalCourses(long totalCourses) { this.totalCourses = totalCourses; }

    public long getTotalResources() { return totalResources; }
    public void setTotalResources(long totalResources) { this.totalResources = totalResources; }

    public long getTotalApprovedNotes() { return totalApprovedNotes; }
    public void setTotalApprovedNotes(long totalApprovedNotes) { this.totalApprovedNotes = totalApprovedNotes; }

    public long getTotalApprovedQuestions() { return totalApprovedQuestions; }
    public void setTotalApprovedQuestions(long totalApprovedQuestions) { this.totalApprovedQuestions = totalApprovedQuestions; }

    public long getPendingPayments() { return pendingPayments; }
    public void setPendingPayments(long pendingPayments) { this.pendingPayments = pendingPayments; }

    public long getPendingContributions() { return pendingContributions; }
    public void setPendingContributions(long pendingContributions) { this.pendingContributions = pendingContributions; }

    public long getPendingWaivers() { return pendingWaivers; }
    public void setPendingWaivers(long pendingWaivers) { this.pendingWaivers = pendingWaivers; }

    public long getPendingReviews() { return pendingReviews; }
    public void setPendingReviews(long pendingReviews) { this.pendingReviews = pendingReviews; }

    public long getActivePremiumUsers() { return activePremiumUsers; }
    public void setActivePremiumUsers(long activePremiumUsers) { this.activePremiumUsers = activePremiumUsers; }

    public double getTotalRevenue() { return totalRevenue; }
    public void setTotalRevenue(double totalRevenue) { this.totalRevenue = totalRevenue; }
}
