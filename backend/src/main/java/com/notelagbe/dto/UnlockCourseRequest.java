package com.notelagbe.dto;

import jakarta.validation.constraints.NotBlank;

public class UnlockCourseRequest {
    @NotBlank(message = "Course code is required")
    private String courseCode;

    public UnlockCourseRequest() {}

    public UnlockCourseRequest(String courseCode) {
        this.courseCode = courseCode;
    }

    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }
}
