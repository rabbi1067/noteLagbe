package com.notelagbe.controller;

import com.notelagbe.dto.ChatMessageDto;
import com.notelagbe.dto.ChatMessageRequest;
import com.notelagbe.security.CustomUserDetails;
import com.notelagbe.service.ChatService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping("/messages")
    public ResponseEntity<List<ChatMessageDto>> getRecentMessages(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        Long currentUserId = userDetails != null ? userDetails.getUser().getId() : null;
        return ResponseEntity.ok(chatService.getRecentMessages(currentUserId));
    }

    @GetMapping("/pinned")
    public ResponseEntity<ChatMessageDto> getPinnedMessage(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        Long currentUserId = userDetails != null ? userDetails.getUser().getId() : null;
        return ResponseEntity.ok(chatService.getActivePinnedMessage(currentUserId));
    }

    @GetMapping("/active-count")
    public ResponseEntity<Map<String, Object>> getActiveCount() {
        return ResponseEntity.ok(Map.of(
                "activeCount", chatService.getActiveUsersCount(),
                "status", "LIVE"
        ));
    }

    @PostMapping("/messages")
    public ResponseEntity<ChatMessageDto> sendTextMessage(
            @Valid @RequestBody ChatMessageRequest req,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(chatService.sendTextMessage(userDetails.getUser(), req));
    }

    @PostMapping("/voice")
    public ResponseEntity<ChatMessageDto> sendVoiceMessage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "duration", required = false, defaultValue = "0") Integer duration,
            @RequestParam(value = "replyToId", required = false) Long replyToId,
            @RequestParam(value = "replyToSender", required = false) String replyToSender,
            @RequestParam(value = "replyToText", required = false) String replyToText,
            @AuthenticationPrincipal CustomUserDetails userDetails) throws IOException {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(chatService.sendVoiceMessage(
                userDetails.getUser(),
                file,
                duration,
                replyToId,
                replyToSender,
                replyToText
        ));
    }

    @PostMapping("/image")
    public ResponseEntity<ChatMessageDto> sendImageMessage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "caption", required = false) String caption,
            @RequestParam(value = "replyToId", required = false) Long replyToId,
            @RequestParam(value = "replyToSender", required = false) String replyToSender,
            @RequestParam(value = "replyToText", required = false) String replyToText,
            @AuthenticationPrincipal CustomUserDetails userDetails) throws IOException {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(chatService.sendImageMessage(
                userDetails.getUser(),
                file,
                caption,
                replyToId,
                replyToSender,
                replyToText
        ));
    }

    @PostMapping("/messages/{id}/like")
    public ResponseEntity<ChatMessageDto> toggleLike(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(chatService.toggleLike(id, userDetails.getUser()));
    }
}
