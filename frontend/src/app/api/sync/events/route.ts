import { NextRequest } from "next/server";
import { resolveBackendBaseUrl } from "@/lib/backendUrl";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const controller = new AbortController();
  const handshakeTimer = setTimeout(() => controller.abort(), 10_000);
  try {
    const backendBaseUrl = resolveBackendBaseUrl();
    const backendRes = await fetch(`${backendBaseUrl}/api/sync/events`, {
      headers: {
        Accept: "text/event-stream",
      },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(handshakeTimer);

    if (!backendRes.ok || !backendRes.body) {
      return new Response("Backend SSE unavailable", { status: 502 });
    }

    // Stream directly to client with unbuffered headers
    return new Response(backendRes.body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform, no-store",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: unknown) {
    clearTimeout(handshakeTimer);
    const isTimeout = (err instanceof Error || err instanceof DOMException) && err.name === "AbortError";
    const errMsg = err instanceof Error ? err.message : "Unavailable";
    return new Response(`SSE Proxy Error: ${errMsg}`, {
      status: isTimeout ? 503 : 500,
    });
  }
}
