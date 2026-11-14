package com.notelagbe.controller;

import com.notelagbe.service.AiExamChatService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiReviewController {

    private final AiExamChatService aiExamChatService;

    public AiReviewController(AiExamChatService aiExamChatService) {
        this.aiExamChatService = aiExamChatService;
    }

    @PostMapping("/suggest-reject-note")
    public ResponseEntity<Map<String, Object>> suggestRejectNote(@RequestBody Map<String, Object> payload) {
        return ResponseEntity.ok(aiExamChatService.suggestRejectNote(payload));
    }
}
