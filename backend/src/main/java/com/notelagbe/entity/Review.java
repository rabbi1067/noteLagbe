package com.notelagbe.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "reviews")
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Architectural Anonymity: Nullable! When a student submits an anonymous review,
     * this user association is completely omitted (null) in the database.
     * There is zero trace or link back to the student in the reviews table.
     */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = true)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "teacher_id")
    private Teacher teacher;

    private int rating = 5; // 1 to 5

    @Column(length = 1000, nullable = false)
    private String comment;

    // Faculty Teaching & Marking Profile Attributes
    @Column(length = 50)
    private String personality = "Friendly"; // e.g. Friendly, Helpful, Strict, Supportive

    @Column(length = 50)
    private String marking = "Fair & Generous"; // e.g. Fair & Generous, Average, Strict, Lenient

    @Column(length = 50)
    private String difficulty = "Medium"; // e.g. Easy, Medium, Hard

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReviewStatus status = ReviewStatus.PENDING;

    @Column(nullable = false)
    private boolean anonymous = false;

    @Column(length = 100)
    private String authorName;

    private LocalDateTime createdAt = LocalDateTime.now();

    public Review() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Course getCourse() { return course; }
    public void setCourse(Course course) { this.course = course; }

    public Teacher getTeacher() { return teacher; }
    public void setTeacher(Teacher teacher) { this.teacher = teacher; }

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

    public boolean isAnonymous() { return anonymous; }
    public void setAnonymous(boolean anonymous) { this.anonymous = anonymous; }

    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public String getDisplayName() {
        if (this.anonymous || this.authorName == null || this.authorName.isBlank()) {
            return "Anonymous Student";
        }
        return this.authorName;
    }
}
