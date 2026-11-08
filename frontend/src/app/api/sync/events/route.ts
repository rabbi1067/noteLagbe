import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const backendRes = await fetch("http://localhost:8888/api/sync/events", {
      headers: {
        Accept: "text/event-stream",
      },
      cache: "no-store",
    });

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
  } catch (err: any) {
    return new Response(`SSE Proxy Error: ${err.message}`, { status: 500 });
  }
}
