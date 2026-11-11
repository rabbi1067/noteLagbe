package com.notelagbe.service;

import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class LiveSyncService {

    private static final Logger log = LoggerFactory.getLogger(LiveSyncService.class);

    // Thread-safe collection of active SSE client subscriptions
    private final CopyOnWriteArrayList<SseEmitter> emitters = new CopyOnWriteArrayList<>();

    // Offload SSE fan-out so stalled client sockets never delay HTTP auth or write transactions
    private final ExecutorService broadcastExecutor = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "livesync-broadcaster");
        t.setDaemon(true);
        return t;
    });

    @PreDestroy
    public void shutdown() {
        broadcastExecutor.shutdownNow();
    }

    protected SseEmitter createEmitter() {
        return new SseEmitter(600_000L); // 10 minutes
    }

    /**
     * Subscribe a client to real-time sync events.
     * Sets a 10-minute timeout; browser EventSource automatically reconnects on timeout or close.
     */
    public SseEmitter subscribe() {
        SseEmitter emitter = createEmitter();

        emitter.onCompletion(() -> emitters.remove(emitter));
        emitter.onTimeout(() -> {
            emitter.complete();
            emitters.remove(emitter);
        });
        emitter.onError((e) -> emitters.remove(emitter));

        emitters.add(emitter);

        // Send initial connection handshake
        try {
            emitter.send(SseEmitter.event()
                    .name("connected")
                    .data(Map.of(
                            "status", "CONNECTED",
                            "message", "Live Real-Time Synchronization Active",
                            "timestamp", System.currentTimeMillis()
                    )));
        } catch (IOException e) {
            emitters.remove(emitter);
        }

        return emitter;
    }

    /**
     * Broadcast a data change event to all active clients (public and admin).
     *
     * @param entity e.g., "course", "teacher", "resource", "matrix", "department", "review"
     * @param action e.g., "created", "updated", "deleted", "assigned"
     * @param data payload or identifier
     */
    public void broadcast(String entity, String action, Object data) {
        if (emitters.isEmpty() || broadcastExecutor.isShutdown()) {
            return;
        }

        Map<String, Object> payload = Map.of(
                "entity", entity,
                "action", action,
                "data", data != null ? data.toString() : "",
                "timestamp", System.currentTimeMillis()
        );

        broadcastExecutor.execute(() -> {
            if (emitters.isEmpty()) {
                return;
            }
            List<SseEmitter> deadEmitters = new ArrayList<>();

            for (SseEmitter emitter : emitters) {
                try {
                    emitter.send(SseEmitter.event()
                            .name("sync")
                            .data(payload));
                } catch (Exception e) {
                    deadEmitters.add(emitter);
                }
            }

            if (!deadEmitters.isEmpty()) {
                emitters.removeAll(deadEmitters);
            }

            log.info("[LiveSync] Broadcasted change: entity={}, action={}, activeClients={}",
                    entity, action, emitters.size());
        });
    }

    public int getActiveClientsCount() {
        return emitters.size();
    }

    /**
     * Keep-alive heartbeat every 25 seconds to prevent browser/proxy connection dropouts.
     */
    @Scheduled(fixedRate = 25_000)
    public void sendHeartbeat() {
        if (emitters.isEmpty()) return;

        List<SseEmitter> deadEmitters = new ArrayList<>();
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name("ping")
                        .data(System.currentTimeMillis()));
            } catch (Exception e) {
                deadEmitters.add(emitter);
            }
        }
        if (!deadEmitters.isEmpty()) {
            emitters.removeAll(deadEmitters);
        }
    }
}
