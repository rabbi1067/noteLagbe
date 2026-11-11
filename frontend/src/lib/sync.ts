"use client";

import { useEffect, useRef } from "react";
import { API_BASE_URL, resolveDirectBackendApiUrl } from "./api";

export interface SyncPayload {
  entity: string; // e.g. "course", "teacher", "resource", "matrix", "department", "review"
  action: string; // e.g. "created", "updated", "deleted", "assigned"
  data?: any;
  timestamp: number;
}

type SyncCallback = (payload: SyncPayload) => void;

// Active in-memory subscribers across the current window
const subscribers = new Set<SyncCallback>();

// Cross-tab broadcast channel
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    broadcastChannel = new BroadcastChannel("notelagbe_sync_bus");
    broadcastChannel.onmessage = (event) => {
      if (event?.data && event.data.type === "DATA_SYNC") {
        dispatchToSubscribers(event.data.payload);
      }
    };
  } catch {
    // Ignore BroadcastChannel errors in restricted contexts
  }
}

// Fallback storage listener for cross-tab communication
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "notelagbe_sync_ping" && e.newValue) {
      try {
        const payload = JSON.parse(e.newValue);
        dispatchToSubscribers(payload);
      } catch {
        // Ignore parsing errors
      }
    }
  });
}

function dispatchToSubscribers(payload: SyncPayload) {
  if (typeof window !== "undefined" && payload.action !== "connected") {
    window.dispatchEvent(new Event("notelagbe:sync-data"));
  }
  subscribers.forEach((cb) => {
    try {
      cb(payload);
    } catch (err) {
      console.error("[LiveSync Client] Callback error:", err);
    }
  });
}

/**
 * Notify all browser tabs immediately when a local admin action occurs.
 */
export function notifyDataChanged(entity: string, action: string, data?: any) {
  const payload: SyncPayload = {
    entity,
    action,
    data,
    timestamp: Date.now(),
  };

  // Dispatch to local window subscribers immediately
  dispatchToSubscribers(payload);

  // Broadcast to other tabs via BroadcastChannel
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: "DATA_SYNC", payload });
    } catch {
      // Ignore postMessage errors
    }
  }

  // Fallback via localStorage ping with unique nonce to guarantee storage event triggers across tabs
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("notelagbe_sync_ping", JSON.stringify({ ...payload, _nonce: Math.random() + "_" + Date.now() }));
    } catch {
      // Ignore localStorage errors
    }
  }
}

// Persistent SSE connection singleton
let eventSource: EventSource | null = null;
let reconnectTimer: any = null;
let reconnectAttempt = 0;

function initServerEvents() {
  if (typeof window === "undefined" || eventSource) return;

  try {
    const directBase = resolveDirectBackendApiUrl();
    let sseUrl = `${directBase || API_BASE_URL.replace(/\/+$/, "")}/sync/events`;
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      // Direct connection to local backend for zero-latency, unbuffered SSE events on localhost
      sseUrl = "http://localhost:8888/api/sync/events";
    }
    eventSource = new EventSource(sseUrl);

    const handleMessage = (e: MessageEvent) => {
      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (data && (data.entity || data.action)) {
          dispatchToSubscribers({
            entity: data.entity || "all",
            action: data.action || "updated",
            data: data.data,
            timestamp: data.timestamp || Date.now(),
          });
        }
      } catch (err) {
        console.error("[LiveSync SSE] Parse error:", err);
      }
    };

    eventSource.addEventListener("sync", handleMessage);
    eventSource.onmessage = handleMessage;

    eventSource.onopen = () => {
      reconnectAttempt = 0;
      // Dispatches connection revalidation
      dispatchToSubscribers({
        entity: "all",
        action: "connected",
        timestamp: Date.now(),
      });
    };

    eventSource.onerror = () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      // Exponential backoff reconnect to avoid hammering a cold-starting backend
      const delays = [4000, 8000, 15000, 30000, 60000];
      const delay = delays[Math.min(reconnectAttempt, delays.length - 1)];
      reconnectAttempt += 1;
      clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        initServerEvents();
      }, delay);
    };
  } catch {
    // Ignore SSE setup failures in unsupported environments
  }
}

/**
 * Subscribe to real-time data sync events.
 */
export function subscribeToSync(callback: SyncCallback): () => void {
  subscribers.add(callback);
  initServerEvents();

  return () => {
    subscribers.delete(callback);
  };
}

/**
 * Universal React Hook: Re-runs `onSync` whenever admin updates data in backend or across tabs.
 * Also automatically revalidates when the tab regains focus or visibility.
 */
export function useDataSync(onSync: (payload?: SyncPayload) => void, filterEntity?: string) {
  const callbackRef = useRef(onSync);

  useEffect(() => {
    callbackRef.current = onSync;
  }, [onSync]);

  useEffect(() => {
    const handleSync = (payload: SyncPayload) => {
      if (!filterEntity || filterEntity === "all" || payload.entity === filterEntity || payload.entity === "all") {
        callbackRef.current(payload);
      }
    };

    const unsubscribe = subscribeToSync(handleSync);

    // Revalidate on tab focus or visibility return (throttled to at most once per 45s)
    let lastFocusRevalidate = 0;
    const handleVisibility = () => {
      const now = Date.now();
      if (document.visibilityState === "visible" && now - lastFocusRevalidate > 45000) {
        lastFocusRevalidate = now;
        callbackRef.current({
          entity: "focus",
          action: "revalidate",
          timestamp: now,
        });
      }
    };

    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      unsubscribe();
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [filterEntity]);
}
