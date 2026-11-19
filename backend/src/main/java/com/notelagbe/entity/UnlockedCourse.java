package com.notelagbe.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "unlocked_courses", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "course_id", "teacher_id"})
}, indexes = {
    @Index(name = "idx_unlocked_user_id", columnList = "user_id")
})
public class UnlockedCourse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    // Optional: null means full-course unlock across all faculty; non-null restricts access to that specific faculty
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "teacher_id")
    private Teacher teacher;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private UnlockSource source = UnlockSource.PURCHASED_QUOTA;

    private LocalDateTime unlockedAt = LocalDateTime.now();

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    public UnlockedCourse() {}

    public UnlockedCourse(User user, Course course, UnlockSource source) {
        this.user = user;
        this.course = course;
        this.source = source;
        this.unlockedAt = LocalDateTime.now();
    }

    public UnlockedCourse(User user, Course course, UnlockSource source, LocalDateTime expiresAt) {
        this(user, course, null, source, expiresAt);
    }

    public UnlockedCourse(User user, Course course, Teacher teacher, UnlockSource source, LocalDateTime expiresAt) {
        this.user = user;
        this.course = course;
        this.teacher = teacher;
        this.source = source;
        this.unlockedAt = LocalDateTime.now();
        this.expiresAt = expiresAt;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Course getCourse() { return course; }
    public void setCourse(Course course) { this.course = course; }

    public Teacher getTeacher() { return teacher; }
    public void setTeacher(Teacher teacher) { this.teacher = teacher; }

    public boolean isTeacherScoped() { return this.teacher != null; }

    public UnlockSource getSource() { return source; }
    public void setSource(UnlockSource source) { this.source = source; }

    public LocalDateTime getUnlockedAt() { return unlockedAt; }
    public void setUnlockedAt(LocalDateTime unlockedAt) { this.unlockedAt = unlockedAt; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }

    public boolean isExpired() {
        return expiresAt != null && LocalDateTime.now().isAfter(expiresAt);
    }
}
