package com.notelagbe.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class WaiverSubmitRequest {

    @NotBlank(message = "Student ID is required")
    @Size(min = 5, max = 20, message = "Student ID must be between 5 and 20 characters")
    private String studentId;

    @DecimalMin(value = "0.00", message = "CGPA cannot be negative")
    @DecimalMax(value = "4.00", message = "CGPA cannot exceed 4.00")
    private Double cgpa;

    @NotBlank(message = "Reason / explanation is required")
    @Size(min = 20, max = 600, message = "Reason must be between 20 and 600 characters")
    private String reason;

    @Size(max = 500, message = "ID card URL cannot exceed 500 characters")
    private String idCardUrl;

    public WaiverSubmitRequest() {}

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public Double getCgpa() { return cgpa; }
    public void setCgpa(Double cgpa) { this.cgpa = cgpa; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getIdCardUrl() { return idCardUrl; }
    public void setIdCardUrl(String idCardUrl) { this.idCardUrl = idCardUrl; }
}
