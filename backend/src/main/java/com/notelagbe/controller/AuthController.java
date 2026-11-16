package com.notelagbe.controller;

import com.notelagbe.dto.AuthRequest;
import com.notelagbe.dto.AuthResponse;
import com.notelagbe.dto.GoogleLoginRequest;
import com.notelagbe.dto.RegisterRequest;
import com.notelagbe.dto.UserProfileResponse;
import com.notelagbe.security.CustomUserDetails;
import com.notelagbe.service.AuthService;
import com.notelagbe.service.ActivityLogService;
import com.notelagbe.service.EmailService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final ActivityLogService activityLogService;
    private final EmailService emailService;

    public AuthController(AuthService authService,
                          ActivityLogService activityLogService,
                          EmailService emailService) {
        this.authService = authService;
        this.activityLogService = activityLogService;
        this.emailService = emailService;
    }

    private void logAuthAsync(String action, String details, String email, String name, String role, HttpServletRequest request, String status) {
        if (activityLogService == null) {
            return;
        }
        String clientIp = ActivityLogService.getClientIp(request);
        String deviceInfo = ActivityLogService.getDeviceInfo(request);
        CompletableFuture.runAsync(() -> {
            try {
                activityLogService.logActivity(action, "AUTH", details, email, name, role, clientIp, deviceInfo, status);
            } catch (Exception ignored) {}
        });
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody AuthRequest request, HttpServletRequest httpRequest) {
        try {
            AuthResponse res = authService.login(request);
            if (res != null && res.getEmail() != null) {
                logAuthAsync(
                        "USER_LOGIN",
                        "User authenticated successfully via password: " + res.getEmail(),
                        res.getEmail(),
                        res.getName(),
                        res.getRole(),
                        httpRequest,
                        "SUCCESS"
                );
            }
            return ResponseEntity.ok(res);
        } catch (DisabledException ex) {
            logAuthAsync(
                    "USER_LOGIN_BLOCKED",
                    "Blocked account attempted password login: " + request.getEmail(),
                    request.getEmail(),
                    null,
                    "BLOCKED",
                    httpRequest,
                    "FAILED"
            );
            throw ex;
        }
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request, HttpServletRequest httpRequest) {
        AuthResponse res = authService.register(request);
        if (res != null && res.getEmail() != null) {
            logAuthAsync(
                    "USER_REGISTER",
                    "New student account registered: " + res.getEmail() + (request.getStudentId() != null ? " (ID: " + request.getStudentId() + ")" : ""),
                    res.getEmail(),
                    res.getName(),
                    res.getRole(),
                    httpRequest,
                    "SUCCESS"
            );
        }
        return ResponseEntity.ok(res);
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleLogin(@Valid @RequestBody GoogleLoginRequest request, HttpServletRequest httpRequest) {
        try {
            AuthResponse res = authService.loginWithGoogle(request);
            if (res != null && res.getEmail() != null) {
                logAuthAsync(
                        "USER_LOGIN_GOOGLE",
                        "User authenticated via Google Single Sign-On: " + res.getEmail(),
                        res.getEmail(),
                        res.getName(),
                        res.getRole(),
                        httpRequest,
                        "SUCCESS"
                );
            }
            return ResponseEntity.ok(res);
        } catch (DisabledException ex) {
            logAuthAsync(
                    "USER_LOGIN_BLOCKED",
                    "Blocked account attempted Google SSO login: " + request.getEmail(),
                    request.getEmail(),
                    request.getName(),
                    "BLOCKED",
                    httpRequest,
                    "FAILED"
            );
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
                    "PASSWORD_RESET_CODE_SENT",
                    "AUTH",
                    "Password reset security code sent to: " + email,
                    email,
                    null,
                    "STUDENT",
                    ActivityLogService.getClientIp(httpRequest),
                    "SUCCESS"
            );
        } catch (Exception ignored) {}
        return ResponseEntity.ok(res);
    }

    @PostMapping("/verify-reset-code")
    public ResponseEntity<Map<String, Object>> verifyResetCode(@RequestBody Map<String, String> body, HttpServletRequest httpRequest) {
        String email = body.get("email");
        String code = body.get("code");
        Map<String, Object> res = authService.verifyPasswordResetCode(email, code);
        try {
            activityLogService.logActivity(
                    "PASSWORD_RESET_CODE_VERIFIED",
                    "AUTH",
                    "Password reset security code verified for: " + email,
                    email,
                    null,
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

    @PostMapping("/mail-relay-verify")
    public ResponseEntity<Map<String, Object>> verifyMailRelayChallenge(
            @RequestBody(required = false) Map<String, String> body) {
        String relayNonce = body != null ? body.get("relayNonce") : null;
        String payloadHash = body != null ? body.get("payloadHash") : null;
        boolean authorized = emailService.verifyAndConsumeRelayNonce(relayNonce, payloadHash);
        if (!authorized) {
            return ResponseEntity.status(403).body(Map.of("authorized", false));
        }
        return ResponseEntity.ok(Map.of("authorized", true));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refreshToken(HttpServletRequest httpRequest) {
        String authHeader = httpRequest.getHeader("Authorization");
        return ResponseEntity.ok(authService.refreshToken(authHeader));
    }
}
