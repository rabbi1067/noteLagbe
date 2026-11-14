package com.notelagbe.controller;

import com.notelagbe.dto.AiExamChatMessageDto;
import com.notelagbe.dto.AiExamChatSendRequest;
import com.notelagbe.security.CustomUserDetails;
import com.notelagbe.service.AiExamChatService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai/exam-chat")
public class AiExamChatController {

    private final AiExamChatService aiExamChatService;

    public AiExamChatController(AiExamChatService aiExamChatService) {
        this.aiExamChatService = aiExamChatService;
    }

    @GetMapping("/messages")
    public ResponseEntity<List<AiExamChatMessageDto>> getMessages(
            @RequestParam String courseCode,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        List<AiExamChatMessageDto> messages = aiExamChatService.getConversation(
                userDetails != null ? userDetails.getUser() : null,
                courseCode
        );
        return ResponseEntity.ok(messages);
    }

    @PostMapping("/send")
    public ResponseEntity<Map<String, Object>> sendMessage(
            @Valid @RequestBody AiExamChatSendRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        Map<String, Object> result = aiExamChatService.sendMessage(
                userDetails != null ? userDetails.getUser() : null,
                request
        );
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/messages")
    public ResponseEntity<Map<String, Object>> clearMessages(
            @RequestParam String courseCode,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        aiExamChatService.clearConversation(
                userDetails != null ? userDetails.getUser() : null,
                courseCode
        );
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Conversation cleared successfully for course " + courseCode
        ));
    }
}
