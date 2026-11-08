package com.notelagbe.dto;

import com.notelagbe.entity.Review;
import com.notelagbe.entity.ReviewStatus;
import java.time.LocalDateTime;

public class ReviewResponseDto {
    private Long id;
    private String courseCode;
    private String courseTitle;
    private Long teacherId;
    private String teacherName;
    private String authorName;
    private String studentName;
    private String studentEmail;
    private boolean anonymous;
    private int rating;
    private String comment;
    private String personality;
    private String marking;
    private String difficulty;
    private ReviewStatus status;
    private LocalDateTime createdAt;

    public ReviewResponseDto() {}

    public static ReviewResponseDto fromEntity(Review review) {
        if (review == null) return null;
        ReviewResponseDto dto = new ReviewResponseDto();
        dto.setId(review.getId());
        if (review.getCourse() != null) {
            dto.setCourseCode(review.getCourse().getCode());
            dto.setCourseTitle(review.getCourse().getTitle());
        }
        if (review.getTeacher() != null) {
            dto.setTeacherId(review.getTeacher().getId());
            dto.setTeacherName(review.getTeacher().getName());
        }
        dto.setAnonymous(review.isAnonymous());
        dto.setAuthorName(review.getDisplayName());

        // Architectural Anonymity:
        // For anonymous reviews, student identity is completely omitted everywhere!
        if (review.isAnonymous()) {
            dto.setStudentName("Anonymous Student");
            dto.setStudentEmail(null);
        } else if (review.getUser() != null) {
            dto.setStudentName(review.getUser().getName());
            dto.setStudentEmail(review.getUser().getEmail());
        } else {
            dto.setStudentName(review.getAuthorName());
            dto.setStudentEmail(null);
        }

        dto.setRating(review.getRating());
        dto.setComment(review.getComment());
        dto.setPersonality(review.getPersonality());
        dto.setMarking(review.getMarking());
        dto.setDifficulty(review.getDifficulty());
        dto.setStatus(review.getStatus());
        dto.setCreatedAt(review.getCreatedAt());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }

    public String getCourseTitle() { return courseTitle; }
    public void setCourseTitle(String courseTitle) { this.courseTitle = courseTitle; }

    public Long getTeacherId() { return teacherId; }
    public void setTeacherId(Long teacherId) { this.teacherId = teacherId; }

    public String getTeacherName() { return teacherName; }
    public void setTeacherName(String teacherName) { this.teacherName = teacherName; }

    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public String getStudentEmail() { return studentEmail; }
    public void setStudentEmail(String studentEmail) { this.studentEmail = studentEmail; }

    public boolean isAnonymous() { return anonymous; }
    public void setAnonymous(boolean anonymous) { this.anonymous = anonymous; }

    public int getRating() { return rating; }
    public void setRating(int rating) { this.rating = rating; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public String getPersonality() { return personality; }
    public void setPersonality(String personality) { this.personality = personality; }

    public String getMarking() { return marking; }
    public void setMarking(String marking) { this.marking = marking; }

    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }

    public ReviewStatus getStatus() { return status; }
    public void setStatus(ReviewStatus status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
