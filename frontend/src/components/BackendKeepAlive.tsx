"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { warmupBackend } from "@/lib/api";

const KEEP_ALIVE_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes (Render sleeps at 15 mins)
const VISIBILITY_REWARM_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

/**
 * BackendKeepAlive:
 * 1. Pre-warms the Render backend connection immediately upon visitor arrival.
 * 2. Continuously keeps the backend alive (every 4 min) while any user has a tab open.
 * 3. Pre-fetches key post-login routes (/dashboard, /admin, /pricing) so authentication transitions are instant (0ms perceptible lag).
 */
export default function BackendKeepAlive() {
  const router = useRouter();
  const lastPingTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    // 1. Immediate eager pre-warm upon page mount
    void warmupBackend();

    // 2. Pre-fetch primary post-login destinations so Next.js has JS chunks cached
    try {
      router.prefetch("/dashboard");
      router.prefetch("/admin");
      router.prefetch("/pricing");
      router.prefetch("/courses");
    } catch {}

    // 3. Heartbeat timer to prevent Render Free Tier from entering cold sleep (15-min limit)
    const intervalId = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) {
        // Tab is hidden in background, still fire a lightweight keep-alive if tab has been open
        void warmupBackend();
        lastPingTimeRef.current = Date.now();
        return;
      }
      void warmupBackend();
      lastPingTimeRef.current = Date.now();
    }, KEEP_ALIVE_INTERVAL_MS);

    // 4. Tab wake-up handler: when user returns to tab after a while, refresh connection
    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        const elapsed = Date.now() - lastPingTimeRef.current;
        if (elapsed > VISIBILITY_REWARM_THRESHOLD_MS) {
          lastPingTimeRef.current = Date.now();
          void warmupBackend();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  return null;
}
