package com.notelagbe.controller;

import com.notelagbe.dto.AuthRequest;
import com.notelagbe.dto.AuthResponse;
import com.notelagbe.dto.GoogleLoginRequest;
import com.notelagbe.dto.RegisterRequest;
import com.notelagbe.dto.UserProfileResponse;
import com.notelagbe.security.CustomUserDetails;
import com.notelagbe.service.AuthService;
import com.notelagbe.service.ActivityLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final ActivityLogService activityLogService;

    public AuthController(AuthService authService, ActivityLogService activityLogService) {
        this.authService = authService;
        this.activityLogService = activityLogService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody AuthRequest request, HttpServletRequest httpRequest) {
        try {
            AuthResponse res = authService.login(request);
            try {
                if (res != null && res.getEmail() != null) {
                    activityLogService.logAuth(
                            "USER_LOGIN",
                            "User authenticated successfully via password: " + res.getEmail(),
                            res.getEmail(),
                            res.getName(),
                            res.getRole(),
                            httpRequest,
                            "SUCCESS"
                    );
                }
            } catch (Exception ignored) {}
            return ResponseEntity.ok(res);
        } catch (DisabledException ex) {
            try {
                activityLogService.logAuth(
                        "USER_LOGIN_BLOCKED",
                        "Blocked account attempted password login: " + request.getEmail(),
                        request.getEmail(),
                        null,
                        "BLOCKED",
                        httpRequest,
                        "FAILED"
                );
            } catch (Exception ignored) {}
            throw ex;
        }
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request, HttpServletRequest httpRequest) {
        AuthResponse res = authService.register(request);
        try {
            if (res != null && res.getEmail() != null) {
                activityLogService.logAuth(
                        "USER_REGISTER",
                        "New student account registered: " + res.getEmail() + (request.getStudentId() != null ? " (ID: " + request.getStudentId() + ")" : ""),
                        res.getEmail(),
                        res.getName(),
                        res.getRole(),
                        httpRequest,
                        "SUCCESS"
                );
            }
        } catch (Exception ignored) {}
        return ResponseEntity.ok(res);
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleLogin(@Valid @RequestBody GoogleLoginRequest request, HttpServletRequest httpRequest) {
        try {
            AuthResponse res = authService.loginWithGoogle(request);
            try {
                if (res != null && res.getEmail() != null) {
                    activityLogService.logAuth(
                            "USER_LOGIN_GOOGLE",
                            "User authenticated via Google Single Sign-On: " + res.getEmail(),
                            res.getEmail(),
                            res.getName(),
                            res.getRole(),
                            httpRequest,
                            "SUCCESS"
                    );
                }
            } catch (Exception ignored) {}
            return ResponseEntity.ok(res);
        } catch (DisabledException ex) {
            try {
                activityLogService.logAuth(
                        "USER_LOGIN_BLOCKED",
                        "Blocked account attempted Google SSO login: " + request.getEmail(),
                        request.getEmail(),
                        request.getName(),
                        "BLOCKED",
                        httpRequest,
                        "FAILED"
                );
            } catch (Exception ignored) {}
            throw ex;
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(@AuthenticationPrincipal CustomUserDetails userDetails, HttpServletRequest httpRequest) {
        if (userDetails != null && userDetails.getUser() != null) {
            try {
                activityLogService.logAuth(
                        "USER_LOGOUT",
                        "User signed out from session: " + userDetails.getUser().getEmail(),
                        userDetails.getUser().getEmail(),
                        userDetails.getUser().getName(),
                        userDetails.getUser().getRole() != null ? userDetails.getUser().getRole().name() : "STUDENT",
                        httpRequest,
                        "SUCCESS"
                );
            } catch (Exception ignored) {}
        }
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getCurrentUser(@AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(authService.getCurrentUserProfile(userDetails.getUser()));
    }

    @PutMapping("/profile")
    public ResponseEntity<UserProfileResponse> updateProfile(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(authService.updateProfile(
                userDetails.getUser(),
                body.get("name"),
                body.get("phone"),
                body.get("address"),
                body.containsKey("avatarUrl") ? body.get("avatarUrl") : null
        ));
    }

    @PostMapping("/avatar/upload")
    public ResponseEntity<Map<String, Object>> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails userDetails) throws IOException {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        UserProfileResponse up = authService.uploadAvatar(userDetails.getUser(), file);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "avatarUrl", up.getAvatarUrl() != null ? up.getAvatarUrl() : "",
                "message", "Profile picture uploaded successfully"
        ));
    }

    @DeleteMapping("/avatar")
    public ResponseEntity<Map<String, Object>> removeAvatar(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        authService.removeAvatar(userDetails.getUser());
        return ResponseEntity.ok(Map.of(
                "success", true,
                "avatarUrl", "",
                "message", "Profile picture removed successfully"
        ));
    }

    @PutMapping("/password")
    public ResponseEntity<Map<String, Object>> changePassword(
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(authService.changePassword(
                userDetails.getUser(),
                body.get("currentPassword"),
                body.get("newPassword")
        ));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, Object>> forgotPassword(@RequestBody Map<String, String> body, HttpServletRequest httpRequest) {
        String email = body.get("email");
        Map<String, Object> res = authService.verifyEmailForPasswordReset(email);
        try {
            activityLogService.logActivity(
                    "PASSWORD_RESET_REQUEST",
                    "AUTH",
                    "Password reset requested for email: " + email,
                    email,
                    (String) res.get("name"),
                    "STUDENT",
                    ActivityLogService.getClientIp(httpRequest),
                    "SUCCESS"
            );
        } catch (Exception ignored) {}
        return ResponseEntity.ok(res);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(@RequestBody Map<String, String> body, HttpServletRequest httpRequest) {
        String email = body.get("email");
        String resetToken = body.get("resetToken");
        String newPassword = body.get("newPassword");
        Map<String, Object> res = authService.resetPasswordWithToken(email, resetToken, newPassword);
        try {
            activityLogService.logActivity(
                    "PASSWORD_RESET_SUCCESS",
                    "AUTH",
                    "Password reset successfully for: " + email,
                    email,
                    null,
                    "STUDENT",
                    ActivityLogService.getClientIp(httpRequest),
                    "SUCCESS"
            );
        } catch (Exception ignored) {}
        return ResponseEntity.ok(res);
    }
}
