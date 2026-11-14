package com.notelagbe.dto;

import jakarta.validation.constraints.NotBlank;

public class AiExamChatSendRequest {

    @NotBlank(message = "Course code is required")
    private String courseCode;

    @NotBlank(message = "Message content cannot be blank")
    private String message;

    private Long teacherId;

    private String language = "en";

    private String assistantReply;

    public AiExamChatSendRequest() {}

    public AiExamChatSendRequest(String courseCode, String message, Long teacherId) {
        this.courseCode = courseCode;
        this.message = message;
        this.teacherId = teacherId;
    }

    public AiExamChatSendRequest(String courseCode, String message, Long teacherId, String language) {
        this.courseCode = courseCode;
        this.message = message;
        this.teacherId = teacherId;
        this.language = language;
    }

    public AiExamChatSendRequest(String courseCode, String message, Long teacherId, String language, String assistantReply) {
        this.courseCode = courseCode;
        this.message = message;
        this.teacherId = teacherId;
        this.language = language;
        this.assistantReply = assistantReply;
    }

    public String getCourseCode() {
        return courseCode;
    }

    public void setCourseCode(String courseCode) {
        this.courseCode = courseCode;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Long getTeacherId() {
        return teacherId;
    }

    public void setTeacherId(Long teacherId) {
        this.teacherId = teacherId;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getAssistantReply() {
        return assistantReply;
    }

    public void setAssistantReply(String assistantReply) {
        this.assistantReply = assistantReply;
    }
}
