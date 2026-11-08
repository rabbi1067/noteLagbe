package com.notelagbe.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class ReviewSubmitRequest {
    @NotBlank(message = "Course code is required")
    @Size(min = 3, max = 15, message = "Course code must be between 3 and 15 characters")
    private String courseCode;

    private Long teacherId;

    @NotNull(message = "Rating is required")
    @Min(value = 1, message = "Rating must be at least 1")
    @Max(value = 5, message = "Rating cannot exceed 5")
    private Integer rating;

    @NotBlank(message = "Review comment is required")
    @Size(min = 10, max = 500, message = "Review comment must be between 10 and 500 characters")
    private String comment;

    @Size(max = 50)
    private String personality = "Friendly";

    @Size(max = 50)
    private String marking = "Fair & Generous";

    @Size(max = 50)
    private String difficulty = "Medium";

    private boolean anonymous = false;

    public ReviewSubmitRequest() {}

    public String getCourseCode() { return courseCode; }
    public void setCourseCode(String courseCode) { this.courseCode = courseCode; }

    public Long getTeacherId() { return teacherId; }
    public void setTeacherId(Long teacherId) { this.teacherId = teacherId; }

    public Integer getRating() { return rating; }
    public void setRating(Integer rating) { this.rating = rating; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public String getPersonality() { return personality; }
    public void setPersonality(String personality) { this.personality = personality; }

    public String getMarking() { return marking; }
    public void setMarking(String marking) { this.marking = marking; }

    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }

    public boolean isAnonymous() { return anonymous; }
    public void setAnonymous(boolean anonymous) { this.anonymous = anonymous; }
}
