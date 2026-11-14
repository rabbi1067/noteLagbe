package com.notelagbe.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "resources",
    indexes = {
        @Index(name = "idx_resources_course_status", columnList = "course_id,status")
    }
)
public class Resource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ResourceType type = ResourceType.NOTE;

    @Column(length = 1000)
    private String fileUrl;

    @Column(length = 1000)
    private String previewUrl; // 1st page or thumbnail image

    private String semesterName; // e.g. "Fall 2024", "Spring 2025"

    @Column(name = "academic_year")
    private int academicYear = 2025;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @Column(length = 50)
    private String department = "CSE";

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "teacher_id")
    private Teacher teacher; // null if general/community

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "uploader_id")
    private User uploader;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ResourceStatus status = ResourceStatus.APPROVED;

    private int downloadsCount = 0;

    private LocalDateTime createdAt = LocalDateTime.now();

    public Resource() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

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

    public Course getCourse() { return course; }
    public void setCourse(Course course) { this.course = course; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public Teacher getTeacher() { return teacher; }
    public void setTeacher(Teacher teacher) { this.teacher = teacher; }

    public User getUploader() { return uploader; }
    public void setUploader(User uploader) { this.uploader = uploader; }

    public ResourceStatus getStatus() { return status; }
    public void setStatus(ResourceStatus status) { this.status = status; }

    public int getDownloadsCount() { return downloadsCount; }
    public void setDownloadsCount(int downloadsCount) { this.downloadsCount = downloadsCount; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    @com.fasterxml.jackson.annotation.JsonProperty("contributorName")
    public String getContributorName() {
        if (uploader != null && uploader.getRole() == Role.ROLE_STUDENT) {
            return uploader.getName();
        }
        return null;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("contributorStudentId")
    public String getContributorStudentId() {
        if (uploader != null && uploader.getRole() == Role.ROLE_STUDENT) {
            return uploader.getStudentId();
        }
        return null;
    }

    @com.fasterxml.jackson.annotation.JsonProperty("isStudentContributed")
    public boolean isStudentContributed() {
        return uploader != null && uploader.getRole() == Role.ROLE_STUDENT;
    }
}
