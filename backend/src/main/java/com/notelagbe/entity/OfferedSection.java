package com.notelagbe.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "offered_sections", indexes = {
    @Index(name = "idx_offered_sections_course", columnList = "courseCode"),
    @Index(name = "idx_offered_sections_semester", columnList = "semester"),
    @Index(name = "idx_offered_sections_unique", columnList = "courseCode,sectionNumber,semester", unique = true)
})
public class OfferedSection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 30)
    private String courseCode; // e.g. CSE381

    @Column(nullable = false, length = 20)
    private String sectionNumber; // e.g. 1 or 4

    @Column(length = 200)
    private String courseTitle; // e.g. Introduction to Embedded Systems

    private Double credits = 3.0;

    @Column(length = 30)
    private String facultyInitial; // e.g. DSS

    @Column(length = 150)
    private String facultyName; // e.g. Dr. Sherejad Sanam

    private Integer availableSeats = 40;

    @Column(length = 500)
    private String scheduleText; // e.g. SUN # 08:30 ~ 09:50 @ SEU535 / TUE # 08:30 ~ 09:50 @ SEU535

    @Column(columnDefinition = "TEXT")
    private String scheduleJson; // JSON array of slots: [{"day":"SUN","start":"08:30","end":"09:50","room":"SEU535"}, ...]

    @Column(nullable = false, length = 50)
    private String semester = "Spring 2026";

    private Long uploadedByUserId;

    @Column(length = 30)
    private String uploaderRole = "SYSTEM"; // SYSTEM, ADMIN, STUDENT

    private LocalDateTime expiresAt; // Null for admin/system; 10 days for user uploads

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt = LocalDateTime.now();

    public OfferedSection() {}

    public OfferedSection(String courseCode, String sectionNumber, String courseTitle, Double credits,
                          String facultyInitial, String facultyName, Integer availableSeats,
                          String scheduleText, String scheduleJson, String semester,
                          Long uploadedByUserId, String uploaderRole, LocalDateTime expiresAt) {
        this.courseCode = courseCode != null ? courseCode.trim().toUpperCase() : "";
        this.sectionNumber = sectionNumber != null ? sectionNumber.trim() : "";
        this.courseTitle = courseTitle;
        this.credits = credits;
        this.facultyInitial = facultyInitial != null ? facultyInitial.trim().toUpperCase() : "";
        this.facultyName = facultyName;
        this.availableSeats = availableSeats;
        this.scheduleText = scheduleText;
        this.scheduleJson = scheduleJson;
        this.semester = semester;
        this.uploadedByUserId = uploadedByUserId;
        this.uploaderRole = uploaderRole;
        this.expiresAt = expiresAt;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode != null ? courseCode.trim().toUpperCase() : ""; }

    public String getSectionNumber() { return sectionNumber; }
    public void setSectionNumber(String sectionNumber) { this.sectionNumber = sectionNumber != null ? sectionNumber.trim() : ""; }

    public String getCourseTitle() { return courseTitle; }
    public void setCourseTitle(String courseTitle) { this.courseTitle = courseTitle; }

    public Double getCredits() { return credits; }
    public void setCredits(Double credits) { this.credits = credits; }

    public String getFacultyInitial() { return facultyInitial; }
    public void setFacultyInitial(String facultyInitial) { this.facultyInitial = facultyInitial != null ? facultyInitial.trim().toUpperCase() : ""; }

    public String getFacultyName() { return facultyName; }
    public void setFacultyName(String facultyName) { this.facultyName = facultyName; }

    public Integer getAvailableSeats() { return availableSeats; }
    public void setAvailableSeats(Integer availableSeats) { this.availableSeats = availableSeats; }

    public String getScheduleText() { return scheduleText; }
    public void setScheduleText(String scheduleText) { this.scheduleText = scheduleText; }

    public String getScheduleJson() { return scheduleJson; }
    public void setScheduleJson(String scheduleJson) { this.scheduleJson = scheduleJson; }

    public String getSemester() { return semester; }
    public void setSemester(String semester) { this.semester = semester; }

    public Long getUploadedByUserId() { return uploadedByUserId; }
    public void setUploadedByUserId(Long uploadedByUserId) { this.uploadedByUserId = uploadedByUserId; }

    public String getUploaderRole() { return uploaderRole; }
    public void setUploaderRole(String uploaderRole) { this.uploaderRole = uploaderRole; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    @Transient
    public String getFullSectionCode() {
        return courseCode + "." + sectionNumber;
    }
}
