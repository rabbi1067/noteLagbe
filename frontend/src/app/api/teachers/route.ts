import { NextRequest, NextResponse } from "next/server";
import teachersDirectory from "@/data/teachers_directory.json";
import { resolveBackendBaseUrl } from "@/lib/backendUrl";

export const dynamic = "force-dynamic";

let cachedTeachersResponse: { data: any[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 15 * 1000; // 15 seconds server memory cache (zero-lag freshness)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.toLowerCase().trim() || "";
  const category = searchParams.get("category")?.trim().toUpperCase();

  const isDefaultQuery = !query && (!category || category === "ALL");

  // 1. Ultra-fast Server-Memory Hit (<1ms)
  if (isDefaultQuery && cachedTeachersResponse && (Date.now() - cachedTeachersResponse.timestamp < CACHE_TTL_MS)) {
    return NextResponse.json(cachedTeachersResponse.data, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        "X-Data-Source": "edge-memory",
      },
    });
  }

  // 2. Try to fetch fresh live data from Spring Boot backend with fast 2.5s resilient timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);
  try {
    const backendUrl = resolveBackendBaseUrl();
    const queryString = searchParams.toString();
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "";
    const res = await fetch(`${backendUrl}/api/teachers${queryString ? `?${queryString}` : ""}`, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(clientIp ? { "X-Forwarded-For": clientIp } : {}),
      },
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        if (isDefaultQuery) {
          cachedTeachersResponse = { data, timestamp: Date.now() };
        }
        return NextResponse.json(data, {
          headers: {
            "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
            "X-Data-Source": "backend-live",
          },
        });
      }
    }
  } catch {
    // Backend timeout or offline -> fallback immediately to bundled official directory
  } finally {
    clearTimeout(timeoutId);
  }

  // 3. Instant Zero-Latency Fallback using pre-bundled authentic 397 faculty members
  const filtered = (teachersDirectory as any[]).filter((t) => {
    if (category && category !== "ALL") {
      const tCat = (t.category || "").trim().toUpperCase();
      if (tCat !== category) return false;
    }

    if (query) {
      const name = (t.name || "").toLowerCase();
      const initial = (t.initial || "").toLowerCase();
      const email = (t.email || "").toLowerCase();
      const room = (t.room || "").toLowerCase();
      const designation = (t.designation || "").toLowerCase();

      if (
        !name.includes(query) &&
        !initial.includes(query) &&
        !email.includes(query) &&
        !room.includes(query) &&
        !designation.includes(query)
      ) {
        return false;
      }
    }

    return true;
  });

  return NextResponse.json(filtered, {
    headers: {
      "Cache-Control": "no-store",
      "X-Data-Source": "directory-bundled",
    },
  });
}
