package com.notelagbe.dto;

import java.util.List;

public class ActivityLogPageResponse {
    private List<ActivityLogResponseDto> items;
    private int currentPage;
    private int totalPages;
    private long totalItems;
    private int itemsPerPage;
    private String retentionPolicy;
    private long todayCount;
    private long uniqueIpCount;

    public ActivityLogPageResponse() {}

    public ActivityLogPageResponse(List<ActivityLogResponseDto> items, int currentPage, int totalPages, long totalItems, int itemsPerPage, String retentionPolicy, long todayCount, long uniqueIpCount) {
        this.items = items;
        this.currentPage = currentPage;
        this.totalPages = totalPages;
        this.totalItems = totalItems;
        this.itemsPerPage = itemsPerPage;
        this.retentionPolicy = retentionPolicy;
        this.todayCount = todayCount;
        this.uniqueIpCount = uniqueIpCount;
    }

    public List<ActivityLogResponseDto> getItems() { return items; }
    public void setItems(List<ActivityLogResponseDto> items) { this.items = items; }

    public int getCurrentPage() { return currentPage; }
    public void setCurrentPage(int currentPage) { this.currentPage = currentPage; }

    public int getTotalPages() { return totalPages; }
    public void setTotalPages(int totalPages) { this.totalPages = totalPages; }

    public long getTotalItems() { return totalItems; }
    public void setTotalItems(long totalItems) { this.totalItems = totalItems; }

    public int getItemsPerPage() { return itemsPerPage; }
    public void setItemsPerPage(int itemsPerPage) { this.itemsPerPage = itemsPerPage; }

    public String getRetentionPolicy() { return retentionPolicy; }
    public void setRetentionPolicy(String retentionPolicy) { this.retentionPolicy = retentionPolicy; }

    public long getTodayCount() { return todayCount; }
    public void setTodayCount(long todayCount) { this.todayCount = todayCount; }

    public long getUniqueIpCount() { return uniqueIpCount; }
    public void setUniqueIpCount(long uniqueIpCount) { this.uniqueIpCount = uniqueIpCount; }
}
