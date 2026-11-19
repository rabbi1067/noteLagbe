package com.notelagbe.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "teacher_courses", indexes = {
    @Index(name = "idx_tc_course_id", columnList = "course_id"),
    @Index(name = "idx_tc_teacher_id", columnList = "teacher_id")
})
public class TeacherCourse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "teacher_id", nullable = false)
    private Teacher teacher;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    private String section;

    private String scheduleInfo; // e.g., "SUN # 08:30 ~ 09:50 @ SEU527"

    public TeacherCourse() {}

    public TeacherCourse(Teacher teacher, Course course, String section, String scheduleInfo) {
        this.teacher = teacher;
        this.course = course;
        this.section = section;
        this.scheduleInfo = scheduleInfo;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Teacher getTeacher() { return teacher; }
    public void setTeacher(Teacher teacher) { this.teacher = teacher; }

    public Course getCourse() { return course; }
    public void setCourse(Course course) { this.course = course; }

    public String getSection() { return section; }
    public void setSection(String section) { this.section = section; }

    public String getScheduleInfo() { return scheduleInfo; }
    public void setScheduleInfo(String scheduleInfo) { this.scheduleInfo = scheduleInfo; }
}
