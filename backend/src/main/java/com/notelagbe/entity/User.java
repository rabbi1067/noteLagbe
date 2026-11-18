package com.notelagbe.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users", indexes = {
        @Index(name = "idx_users_email", columnList = "email"),
        @Index(name = "idx_users_phone", columnList = "phone")
})
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @JsonIgnore
    private String password;

    private String studentId;

    private String phone;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private Role role = Role.ROLE_STUDENT;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private AuthProvider authProvider = AuthProvider.LOCAL;

    @Column(columnDefinition = "TEXT")
    private String avatarUrl;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(nullable = false)
    private boolean chatBlocked = false;

    @JsonIgnore
    private String resetToken;

    @JsonIgnore
    private LocalDateTime resetTokenExpiry;

    @JsonIgnore
    private String resetOtpHash;

    @JsonIgnore
    private LocalDateTime resetOtpExpiry;

    @JsonIgnore
    private Integer resetOtpAttempts = 0;

    @JsonIgnore
    private LocalDateTime resetOtpLastSentAt;

    private LocalDateTime createdAt = LocalDateTime.now();

    public User() {}

    public User(String name, String email, String password, String studentId, Role role) {
        this.name = name;
        this.email = email;
        this.password = password;
        this.studentId = studentId;
        this.role = role;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public AuthProvider getAuthProvider() { return authProvider; }
    public void setAuthProvider(AuthProvider authProvider) { this.authProvider = authProvider; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public boolean isChatBlocked() { return chatBlocked; }
    public void setChatBlocked(boolean chatBlocked) { this.chatBlocked = chatBlocked; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public String getResetToken() { return resetToken; }
    public void setResetToken(String resetToken) { this.resetToken = resetToken; }

    public LocalDateTime getResetTokenExpiry() { return resetTokenExpiry; }
    public void setResetTokenExpiry(LocalDateTime resetTokenExpiry) { this.resetTokenExpiry = resetTokenExpiry; }

    public String getResetOtpHash() { return resetOtpHash; }
    public void setResetOtpHash(String resetOtpHash) { this.resetOtpHash = resetOtpHash; }

    public LocalDateTime getResetOtpExpiry() { return resetOtpExpiry; }
    public void setResetOtpExpiry(LocalDateTime resetOtpExpiry) { this.resetOtpExpiry = resetOtpExpiry; }

    public Integer getResetOtpAttempts() { return resetOtpAttempts; }
    public void setResetOtpAttempts(Integer resetOtpAttempts) { this.resetOtpAttempts = resetOtpAttempts; }

    public LocalDateTime getResetOtpLastSentAt() { return resetOtpLastSentAt; }
    public void setResetOtpLastSentAt(LocalDateTime resetOtpLastSentAt) { this.resetOtpLastSentAt = resetOtpLastSentAt; }
}
