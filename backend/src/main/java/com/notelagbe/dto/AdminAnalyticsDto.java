package com.notelagbe.dto;

import java.util.List;
import java.util.Map;

public class AdminAnalyticsDto {

    // 1. Executive Summary KPIs
    private double totalRevenue;
    private double monthlyRevenue;
    private double todayRevenue;
    private long totalPayments;
    private long approvedPaymentsCount;
    private long pendingPaymentsCount;
    private long rejectedPaymentsCount;
    private double paymentApprovalRate;

    private long totalUsers;
    private long totalStudents;
    private long totalAdmins;
    private long totalManagers;
    private long totalSuperAdmins;
    private long activeUsersCount;
    private long activeSubscribersCount;
    private double subscriberConversionRate;

    private long totalResources;
    private long totalNotes;
    private long totalQuestions;
    private long totalCourses;
    private long totalTeachers;
    private long totalReviews;
    private long totalWaivers;
    private long approvedWaiversCount;
    private double totalWaivedAmount;

    // 2. Trend Time Series Data
    private List<TimePointData> revenueTrend30Days;
    private List<TimePointData> revenueTrend6Months;
    private List<TimePointData> userGrowthTrend30Days;
    private List<TimePointData> userGrowthTrend6Months;

    // 3. Distributions & Breakdowns
    private Map<String, Long> paymentMethodBreakdown;
    private Map<String, Double> paymentMethodRevenue;
    private Map<String, Long> planBreakdown;
    private Map<String, Long> roleDistribution;
    private Map<String, Long> resourceTypeBreakdown;

    // 4. Recent Transactions
    private List<RecentTransactionDto> recentTransactions;

    public AdminAnalyticsDto() {}

    // Inner DTO for Chart Points
    public static class TimePointData {
        private String label;
        private String fullDate;
        private double value;
        private long secondaryValue;

        public TimePointData() {}

        public TimePointData(String label, String fullDate, double value, long secondaryValue) {
            this.label = label;
            this.fullDate = fullDate;
            this.value = value;
            this.secondaryValue = secondaryValue;
        }

        public String getLabel() { return label; }
        public void setLabel(String label) { this.label = label; }

        public String getFullDate() { return fullDate; }
        public void setFullDate(String fullDate) { this.fullDate = fullDate; }

        public double getValue() { return value; }
        public void setValue(double value) { this.value = value; }

        public long getSecondaryValue() { return secondaryValue; }
        public void setSecondaryValue(long secondaryValue) { this.secondaryValue = secondaryValue; }
    }

    // Inner DTO for Recent Transactions
    public static class RecentTransactionDto {
        private Long id;
        private String userName;
        private String userEmail;
        private String planType;
        private String paymentMethod;
        private double amount;
        private String status;
        private String transactionId;
        private String createdAt;

        public RecentTransactionDto() {}

        public RecentTransactionDto(Long id, String userName, String userEmail, String planType,
                                    String paymentMethod, double amount, String status,
                                    String transactionId, String createdAt) {
            this.id = id;
            this.userName = userName;
            this.userEmail = userEmail;
            this.planType = planType;
            this.paymentMethod = paymentMethod;
            this.amount = amount;
            this.status = status;
            this.transactionId = transactionId;
            this.createdAt = createdAt;
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getUserName() { return userName; }
        public void setUserName(String userName) { this.userName = userName; }

        public String getUserEmail() { return userEmail; }
        public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

        public String getPlanType() { return planType; }
        public void setPlanType(String planType) { this.planType = planType; }

        public String getPaymentMethod() { return paymentMethod; }
        public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

        public double getAmount() { return amount; }
        public void setAmount(double amount) { this.amount = amount; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public String getTransactionId() { return transactionId; }
        public void setTransactionId(String transactionId) { this.transactionId = transactionId; }

        public String getCreatedAt() { return createdAt; }
        public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
    }

    // Getters and Setters
    public double getTotalRevenue() { return totalRevenue; }
    public void setTotalRevenue(double totalRevenue) { this.totalRevenue = totalRevenue; }

    public double getMonthlyRevenue() { return monthlyRevenue; }
    public void setMonthlyRevenue(double monthlyRevenue) { this.monthlyRevenue = monthlyRevenue; }

    public double getTodayRevenue() { return todayRevenue; }
    public void setTodayRevenue(double todayRevenue) { this.todayRevenue = todayRevenue; }

    public long getTotalPayments() { return totalPayments; }
    public void setTotalPayments(long totalPayments) { this.totalPayments = totalPayments; }

    public long getApprovedPaymentsCount() { return approvedPaymentsCount; }
    public void setApprovedPaymentsCount(long approvedPaymentsCount) { this.approvedPaymentsCount = approvedPaymentsCount; }

    public long getPendingPaymentsCount() { return pendingPaymentsCount; }
    public void setPendingPaymentsCount(long pendingPaymentsCount) { this.pendingPaymentsCount = pendingPaymentsCount; }

    public long getRejectedPaymentsCount() { return rejectedPaymentsCount; }
    public void setRejectedPaymentsCount(long rejectedPaymentsCount) { this.rejectedPaymentsCount = rejectedPaymentsCount; }

    public double getPaymentApprovalRate() { return paymentApprovalRate; }
    public void setPaymentApprovalRate(double paymentApprovalRate) { this.paymentApprovalRate = paymentApprovalRate; }

    public long getTotalUsers() { return totalUsers; }
    public void setTotalUsers(long totalUsers) { this.totalUsers = totalUsers; }

    public long getTotalStudents() { return totalStudents; }
    public void setTotalStudents(long totalStudents) { this.totalStudents = totalStudents; }

    public long getTotalAdmins() { return totalAdmins; }
    public void setTotalAdmins(long totalAdmins) { this.totalAdmins = totalAdmins; }

    public long getTotalManagers() { return totalManagers; }
    public void setTotalManagers(long totalManagers) { this.totalManagers = totalManagers; }

    public long getTotalSuperAdmins() { return totalSuperAdmins; }
    public void setTotalSuperAdmins(long totalSuperAdmins) { this.totalSuperAdmins = totalSuperAdmins; }

    public long getActiveUsersCount() { return activeUsersCount; }
    public void setActiveUsersCount(long activeUsersCount) { this.activeUsersCount = activeUsersCount; }

    public long getActiveSubscribersCount() { return activeSubscribersCount; }
    public void setActiveSubscribersCount(long activeSubscribersCount) { this.activeSubscribersCount = activeSubscribersCount; }

    public double getSubscriberConversionRate() { return subscriberConversionRate; }
    public void setSubscriberConversionRate(double subscriberConversionRate) { this.subscriberConversionRate = subscriberConversionRate; }

    public long getTotalResources() { return totalResources; }
    public void setTotalResources(long totalResources) { this.totalResources = totalResources; }

    public long getTotalNotes() { return totalNotes; }
    public void setTotalNotes(long totalNotes) { this.totalNotes = totalNotes; }

    public long getTotalQuestions() { return totalQuestions; }
    public void setTotalQuestions(long totalQuestions) { this.totalQuestions = totalQuestions; }

    public long getTotalCourses() { return totalCourses; }
    public void setTotalCourses(long totalCourses) { this.totalCourses = totalCourses; }

    public long getTotalTeachers() { return totalTeachers; }
    public void setTotalTeachers(long totalTeachers) { this.totalTeachers = totalTeachers; }

    public long getTotalReviews() { return totalReviews; }
    public void setTotalReviews(long totalReviews) { this.totalReviews = totalReviews; }

    public long getTotalWaivers() { return totalWaivers; }
    public void setTotalWaivers(long totalWaivers) { this.totalWaivers = totalWaivers; }

    public long getApprovedWaiversCount() { return approvedWaiversCount; }
    public void setApprovedWaiversCount(long approvedWaiversCount) { this.approvedWaiversCount = approvedWaiversCount; }

    public double getTotalWaivedAmount() { return totalWaivedAmount; }
    public void setTotalWaivedAmount(double totalWaivedAmount) { this.totalWaivedAmount = totalWaivedAmount; }

    public List<TimePointData> getRevenueTrend30Days() { return revenueTrend30Days; }
    public void setRevenueTrend30Days(List<TimePointData> revenueTrend30Days) { this.revenueTrend30Days = revenueTrend30Days; }

    public List<TimePointData> getRevenueTrend6Months() { return revenueTrend6Months; }
    public void setRevenueTrend6Months(List<TimePointData> revenueTrend6Months) { this.revenueTrend6Months = revenueTrend6Months; }

    public List<TimePointData> getUserGrowthTrend30Days() { return userGrowthTrend30Days; }
    public void setUserGrowthTrend30Days(List<TimePointData> userGrowthTrend30Days) { this.userGrowthTrend30Days = userGrowthTrend30Days; }

    public List<TimePointData> getUserGrowthTrend6Months() { return userGrowthTrend6Months; }
    public void setUserGrowthTrend6Months(List<TimePointData> userGrowthTrend6Months) { this.userGrowthTrend6Months = userGrowthTrend6Months; }

    public Map<String, Long> getPaymentMethodBreakdown() { return paymentMethodBreakdown; }
    public void setPaymentMethodBreakdown(Map<String, Long> paymentMethodBreakdown) { this.paymentMethodBreakdown = paymentMethodBreakdown; }

    public Map<String, Double> getPaymentMethodRevenue() { return paymentMethodRevenue; }
    public void setPaymentMethodRevenue(Map<String, Double> paymentMethodRevenue) { this.paymentMethodRevenue = paymentMethodRevenue; }

    public Map<String, Long> getPlanBreakdown() { return planBreakdown; }
    public void setPlanBreakdown(Map<String, Long> planBreakdown) { this.planBreakdown = planBreakdown; }

    public Map<String, Long> getRoleDistribution() { return roleDistribution; }
    public void setRoleDistribution(Map<String, Long> roleDistribution) { this.roleDistribution = roleDistribution; }

    public Map<String, Long> getResourceTypeBreakdown() { return resourceTypeBreakdown; }
    public void setResourceTypeBreakdown(Map<String, Long> resourceTypeBreakdown) { this.resourceTypeBreakdown = resourceTypeBreakdown; }

    public List<RecentTransactionDto> getRecentTransactions() { return recentTransactions; }
    public void setRecentTransactions(List<RecentTransactionDto> recentTransactions) { this.recentTransactions = recentTransactions; }
}
