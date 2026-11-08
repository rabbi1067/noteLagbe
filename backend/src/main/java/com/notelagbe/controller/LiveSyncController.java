package com.notelagbe.controller;

import com.notelagbe.service.LiveSyncService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

@RestController
@RequestMapping("/api/sync")
public class LiveSyncController {

    private final LiveSyncService liveSyncService;

    public LiveSyncController(LiveSyncService liveSyncService) {
        this.liveSyncService = liveSyncService;
    }

    /**
     * Server-Sent Events (SSE) stream for instant real-time data sync.
     * Publicly accessible, low footprint, zero polling required.
     */
    @GetMapping(value = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe() {
        return liveSyncService.subscribe();
    }

    /**
     * Healthcheck and status of the live sync service.
     */
    @GetMapping("/status")
    public Map<String, Object> getStatus() {
        return Map.of(
                "status", "UP",
                "service", "LiveSync Real-Time Engine",
                "timestamp", System.currentTimeMillis()
        );
    }
}
