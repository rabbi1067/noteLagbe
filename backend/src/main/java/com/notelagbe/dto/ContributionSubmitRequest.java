package com.notelagbe.dto;

import com.notelagbe.entity.ResourceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class ContributionSubmitRequest {
    @NotBlank(message = "Title is required")
    @Size(min = 5, max = 80, message = "Title must be between 5 and 80 characters")
    private String title;

    @NotNull(message = "Resource type is required")
    private ResourceType resourceType; // NOTE or QUESTION_COURSE_IN

    @NotBlank(message = "File URL is required")
    @Size(max = 300, message = "File URL cannot exceed 300 characters")
    private String fileUrl;

    @Size(max = 300, message = "Preview URL cannot exceed 300 characters")
    private String previewUrl;

    @Size(max = 25, message = "Semester name cannot exceed 25 characters")
    private String semesterName;

    private int year = 2026;

    @NotBlank(message = "Course code is required")
    @Size(min = 3, max = 15, message = "Course code must be between 3 and 15 characters")
    private String courseCode;

    private String department;

    private Long teacherId;

    // The 2 reward courses the student wants unlocked:
    @NotBlank(message = "First reward course code is required")
    @Size(min = 3, max = 15, message = "First reward course code must be between 3 and 15 characters")
    private String requestedCourseCode1;

    private Long requestedTeacherId1;

    @NotBlank(message = "Second reward course code is required")
    @Size(min = 3, max = 15, message = "Second reward course code must be between 3 and 15 characters")
    private String requestedCourseCode2;

    private Long requestedTeacherId2;

    public ContributionSubmitRequest() {}

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public ResourceType getResourceType() { return resourceType; }
    public void setResourceType(ResourceType resourceType) { this.resourceType = resourceType; }

    public String getFileUrl() { return fileUrl; }
    public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }

    public String getPreviewUrl() { return previewUrl; }
    public void setPreviewUrl(String previewUrl) { this.previewUrl = previewUrl; }

    public String getSemesterName() { return semesterName; }
    public void setSemesterName(String semesterName) { this.semesterName = semesterName; }

    public int getYear() { return year; }
    public void setYear(int year) { this.year = year; }

    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public Long getTeacherId() { return teacherId; }
    public void setTeacherId(Long teacherId) { this.teacherId = teacherId; }

    public String getRequestedCourseCode1() { return requestedCourseCode1; }
    public void setRequestedCourseCode1(String requestedCourseCode1) { this.requestedCourseCode1 = requestedCourseCode1; }

    public Long getRequestedTeacherId1() { return requestedTeacherId1; }
    public void setRequestedTeacherId1(Long requestedTeacherId1) { this.requestedTeacherId1 = requestedTeacherId1; }

    public String getRequestedCourseCode2() { return requestedCourseCode2; }
    public void setRequestedCourseCode2(String requestedCourseCode2) { this.requestedCourseCode2 = requestedCourseCode2; }

    public Long getRequestedTeacherId2() { return requestedTeacherId2; }
    public void setRequestedTeacherId2(Long requestedTeacherId2) { this.requestedTeacherId2 = requestedTeacherId2; }
}
