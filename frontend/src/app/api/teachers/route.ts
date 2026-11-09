import { NextRequest, NextResponse } from "next/server";
import teachersDirectory from "@/data/teachers_directory.json";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.toLowerCase().trim() || "";
  const category = searchParams.get("category")?.trim().toUpperCase();

  // 1. Try to fetch fresh live data from Spring Boot backend with short timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const backendUrl =
      process.env.BACKEND_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:8888";

    const queryString = searchParams.toString();
    const res = await fetch(`${backendUrl}/api/teachers${queryString ? `?${queryString}` : ""}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return NextResponse.json(data, {
          headers: {
            "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
            "X-Data-Source": "backend-live",
          },
        });
      }
    }
  } catch {
    // Backend timeout or offline -> fallback immediately to bundled official directory
  }

  // 2. Instant Zero-Latency Fallback using pre-bundled authentic 397 faculty members
  let filtered = (teachersDirectory as any[]).filter((t) => {
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
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      "X-Data-Source": "directory-bundled",
    },
  });
}
