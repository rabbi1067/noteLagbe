package com.notelagbe.dto;

import com.notelagbe.entity.ResourceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class ResourceCreateRequest {

    @NotBlank(message = "Course code is required")
    @Size(min = 3, max = 15, message = "Course code must be between 3 and 15 characters")
    private String courseCode;

    private Long teacherId;

    @NotBlank(message = "Title is required")
    @Size(min = 3, max = 150, message = "Title must be between 3 and 150 characters")
    private String title;

    @NotNull(message = "Resource type is required")
    private ResourceType type = ResourceType.NOTE;

    @NotBlank(message = "File URL or attachment link is required")
    @Size(max = 500, message = "File URL cannot exceed 500 characters")
    private String fileUrl;

    @Size(max = 500, message = "Preview URL cannot exceed 500 characters")
    private String previewUrl;

    @Size(max = 50, message = "Semester name cannot exceed 50 characters")
    private String semesterName = "Fall 2026";

    private int academicYear = 2026;

    public ResourceCreateRequest() {}

    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }

    public Long getTeacherId() { return teacherId; }
    public void setTeacherId(Long teacherId) { this.teacherId = teacherId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public ResourceType getType() { return type; }
    public void setType(ResourceType type) { this.type = type; }

    public String getFileUrl() { return fileUrl; }
    public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }

    public String getPreviewUrl() { return previewUrl; }
    public void setPreviewUrl(String previewUrl) { this.previewUrl = previewUrl; }

    public String getSemesterName() { return semesterName; }
    public void setSemesterName(String semesterName) { this.semesterName = semesterName; }

    public int getAcademicYear() { return academicYear; }
    public void setAcademicYear(int academicYear) { this.academicYear = academicYear; }
}
