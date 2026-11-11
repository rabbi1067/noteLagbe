package com.notelagbe.dto;

import jakarta.validation.constraints.NotBlank;

public class GiftCourseRequest {
    @NotBlank(message = "Course code is required")
    private String courseCode;

    // Faculty member under the course for teacher-scoped gift access
    private Long teacherId;

    private Integer validityMonths; // null or <= 0 means permanent lifetime gift

    private String note; // optional message or reason

    public GiftCourseRequest() {}

    public GiftCourseRequest(String courseCode, Long teacherId, Integer validityMonths, String note) {
        this.courseCode = courseCode;
        this.teacherId = teacherId;
        this.validityMonths = validityMonths;
        this.note = note;
    }

    public String getCourseCode() {
        return courseCode;
    }

    public void setCourseCode(String courseCode) {
        this.courseCode = courseCode;
    }

    public Long getTeacherId() {
        return teacherId;
    }

    public void setTeacherId(Long teacherId) {
        this.teacherId = teacherId;
    }

    public Integer getValidityMonths() {
        return validityMonths;
    }

    public void setValidityMonths(Integer validityMonths) {
        this.validityMonths = validityMonths;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }
}
