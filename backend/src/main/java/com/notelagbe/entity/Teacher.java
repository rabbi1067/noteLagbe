package com.notelagbe.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "teachers")
public class Teacher {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String initial;

    private String designation;

    private String room;

    private String phone;

    private String ext;

    private String email;

    @Column(length = 500)
    private String image;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private FacultyCategory category = FacultyCategory.FULL_TIME_FACULTY;

    @Column(nullable = false, length = 64)
    private String department = "CSE";

    @Column(name = "youtube_url", length = 1000)
    private String youtubeUrl;

    private boolean onLeave = false;

    public Teacher() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getYoutubeUrl() { return youtubeUrl; }
    public void setYoutubeUrl(String youtubeUrl) { this.youtubeUrl = youtubeUrl; }

    public String getDepartment() { return department != null ? department : "CSE"; }
    public void setDepartment(String department) { this.department = department; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getInitial() { return initial; }
    public void setInitial(String initial) { this.initial = initial; }

    public String getDesignation() { return designation; }
    public void setDesignation(String designation) { this.designation = designation; }

    public String getRoom() { return room; }
    public void setRoom(String room) { this.room = room; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getExt() { return ext; }
    public void setExt(String ext) { this.ext = ext; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }

    public FacultyCategory getCategory() { return category; }
    public void setCategory(FacultyCategory category) { this.category = category; }

    public boolean isOnLeave() { return onLeave; }
    public void setOnLeave(boolean onLeave) { this.onLeave = onLeave; }
}
