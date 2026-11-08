package com.notelagbe.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "courses")
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private String title;

    private double credits;

    private int semester; // 1 to 12, or 0 for Electives

    private boolean isLab = false;

    private String prerequisite;

    private String electiveGroup; // "A", "B", or null

    @Column(length = 2000)
    private String description;

    @Column(length = 50)
    private String department = "CSE";

    public Course() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public double getCredits() { return credits; }
    public void setCredits(double credits) { this.credits = credits; }

    public int getSemester() { return semester; }
    public void setSemester(int semester) { this.semester = semester; }

    public boolean isLab() { return isLab; }
    public void setLab(boolean lab) { isLab = lab; }

    public String getPrerequisite() { return prerequisite; }
    public void setPrerequisite(String prerequisite) { this.prerequisite = prerequisite; }

    public String getElectiveGroup() { return electiveGroup; }
    public void setElectiveGroup(String electiveGroup) { this.electiveGroup = electiveGroup; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
}
