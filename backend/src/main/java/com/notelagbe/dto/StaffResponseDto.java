package com.notelagbe.dto;

import java.time.LocalDateTime;

public class StaffResponseDto {
    private Long id;
    private String name;
    private String email;
    private String studentId;
    private String role;
    private LocalDateTime createdAt;
    private boolean enabled = true;
    private String phone;
    private String address;

    public StaffResponseDto() {}

    public StaffResponseDto(Long id, String name, String email, String role, LocalDateTime createdAt) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.role = role;
        this.createdAt = createdAt;
        this.enabled = true;
    }

    public StaffResponseDto(Long id, String name, String email, String role, LocalDateTime createdAt, boolean enabled) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.role = role;
        this.createdAt = createdAt;
        this.enabled = enabled;
    }

    public StaffResponseDto(Long id, String name, String email, String studentId, String role, LocalDateTime createdAt, boolean enabled) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.studentId = studentId;
        this.role = role;
        this.createdAt = createdAt;
        this.enabled = enabled;
    }

    public StaffResponseDto(Long id, String name, String email, String studentId, String role, LocalDateTime createdAt, boolean enabled, String phone, String address) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.studentId = studentId;
        this.role = role;
        this.createdAt = createdAt;
        this.enabled = enabled;
        this.phone = phone;
        this.address = address;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
}
