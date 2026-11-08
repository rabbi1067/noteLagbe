package com.notelagbe.entity;

public enum PlanType {
    FREE("Community Free Explorer", 0.0, 2, false, 0),
    SEMESTER_1("1-Semester Plan (3 Months)", 99.0, 6, false, 3),
    SEMESTER_2("2-Semesters Plan (6 Months)", 149.0, 12, false, 6),
    YEAR_1_UNLIMITED("1-Year All Courses Access (12 Months)", 499.0, 999, true, 12);

    private final String displayName;
    private final double price;
    private final int courseQuota;
    private final boolean unlimited;
    private final int durationMonths;

    PlanType(String displayName, double price, int courseQuota, boolean unlimited, int durationMonths) {
        this.displayName = displayName;
        this.price = price;
        this.courseQuota = courseQuota;
        this.unlimited = unlimited;
        this.durationMonths = durationMonths;
    }

    public String getDisplayName() {
        return displayName;
    }

    public double getPrice() {
        return price;
    }

    public int getCourseQuota() {
        return courseQuota;
    }

    public boolean isUnlimited() {
        return unlimited;
    }

    public int getDurationMonths() {
        return durationMonths;
    }
}
