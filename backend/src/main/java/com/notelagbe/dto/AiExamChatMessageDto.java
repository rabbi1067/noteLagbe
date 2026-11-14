package com.notelagbe.dto;

import com.notelagbe.entity.AiExamChatMessage;
import java.time.LocalDateTime;

public class AiExamChatMessageDto {

    private Long id;
    private Long userId;
    private String courseCode;
    private Long teacherId;
    private String teacherName;
    private String role;
    private String content;
    private LocalDateTime createdAt;

    public AiExamChatMessageDto() {}

    public AiExamChatMessageDto(AiExamChatMessage m) {
        if (m != null) {
            this.id = m.getId();
            this.userId = m.getUserId();
            this.courseCode = m.getCourseCode();
            this.teacherId = m.getTeacherId();
            this.teacherName = m.getTeacherName();
            this.role = m.getRole();
            this.content = m.getContent();
            this.createdAt = m.getCreatedAt();
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
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

    public String getTeacherName() {
        return teacherName;
    }

    public void setTeacherName(String teacherName) {
        this.teacherName = teacherName;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
