import { NextRequest, NextResponse } from "next/server";
import catalogCourses from "@/data/courses_catalog.json";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.toLowerCase().trim() || "";
  const semesterStr = searchParams.get("semester");
  const electiveGroup = searchParams.get("electiveGroup")?.trim().toUpperCase();
  const department = searchParams.get("department")?.trim().toUpperCase();

  const semester = semesterStr ? parseInt(semesterStr, 10) : null;

  // 1. Try to fetch fresh live data from Spring Boot backend with resilient timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const backendUrl =
      (process.env.BACKEND_INTERNAL_URL && process.env.BACKEND_INTERNAL_URL.startsWith("http"))
        ? process.env.BACKEND_INTERNAL_URL
        : (process.env.NEXT_PUBLIC_BACKEND_URL && process.env.NEXT_PUBLIC_BACKEND_URL.startsWith("http"))
        ? process.env.NEXT_PUBLIC_BACKEND_URL
        : (process.env.BACKEND_URL && process.env.BACKEND_URL.startsWith("http"))
        ? process.env.BACKEND_URL
        : (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith("http"))
        ? process.env.NEXT_PUBLIC_API_URL
        : (process.env.NODE_ENV === "development" ? "http://localhost:8888" : "https://notelagbe-backend.onrender.com");

    const queryString = searchParams.toString();
    const res = await fetch(`${backendUrl}/api/courses${queryString ? `?${queryString}` : ""}`, {
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
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "X-Data-Source": "backend-live",
          },
        });
      }
    }
  } catch {
    // Backend timeout or offline -> fallback immediately to bundled official catalog
  }

  // 2. Instant Zero-Latency Fallback using pre-bundled authentic 85 CSE curriculum courses
  let filtered = (catalogCourses as any[]).filter((c) => {
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
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Data-Source": "catalog-bundled",
    },
  });
}
