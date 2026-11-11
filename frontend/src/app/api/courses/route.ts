import { NextRequest, NextResponse } from "next/server";
import catalogCourses from "@/data/courses_catalog.json";
import { resolveBackendBaseUrl } from "@/lib/backendUrl";

export const dynamic = "force-dynamic";

let cachedCoursesResponse: { data: any[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds server memory cache

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.toLowerCase().trim() || "";
  const semesterStr = searchParams.get("semester");
  const electiveGroup = searchParams.get("electiveGroup")?.trim().toUpperCase();
  const department = searchParams.get("department")?.trim().toUpperCase();

  const semester = semesterStr ? parseInt(semesterStr, 10) : null;
  const isDefaultQuery = !query && !semester && !electiveGroup && (!department || department === "ALL");

  // 1. Ultra-fast Server-Memory Hit (<1ms)
  if (isDefaultQuery && cachedCoursesResponse && (Date.now() - cachedCoursesResponse.timestamp < CACHE_TTL_MS)) {
    return NextResponse.json(cachedCoursesResponse.data, {
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
    const res = await fetch(`${backendUrl}/api/courses${queryString ? `?${queryString}` : ""}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        if (isDefaultQuery) {
          cachedCoursesResponse = { data, timestamp: Date.now() };
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
    // Backend cold or offline -> fallback immediately to bundled official catalog
  } finally {
    clearTimeout(timeoutId);
  }

  // 3. Instant Zero-Latency Fallback using pre-bundled authentic 85 CSE curriculum courses
  const filtered = (catalogCourses as any[]).filter((c) => {
    if (department && department !== "ALL") {
      const cDept = (c.department || "CSE").trim().toUpperCase();
      if (cDept !== department) return false;
    }

    if (semester !== null && !isNaN(semester)) {
      if (c.semester !== semester) return false;
    }

    if (electiveGroup) {
      if ((c.electiveGroup || "").trim().toUpperCase() !== electiveGroup) return false;
    }

    if (query) {
      const code = (c.code || "").toLowerCase();
      const title = (c.title || "").toLowerCase();
      const codeClean = code.replace(/\s+/g, "");
      const qNoSpace = query.replace(/\s+/g, "");

      const matchCode = code.includes(query) || codeClean.includes(qNoSpace);
      const matchTitle = title.includes(query);
      const matchTeacher = c.teachers?.some((t: any) =>
        (t.name || "").toLowerCase().includes(query) || (t.initial || "").toLowerCase().includes(query)
      );

      if (!matchCode && !matchTitle && !matchTeacher) return false;
    }

    return true;
  });

  return NextResponse.json(filtered, {
    headers: {
      "Cache-Control": "no-store",
      "X-Data-Source": "catalog-bundled",
    },
  });
}
