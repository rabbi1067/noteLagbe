import { NextResponse } from "next/server";
import fallbackData from "@/data/seu_programs.json";
import { resolveBackendBaseUrl } from "@/lib/backendUrl";

export const dynamic = "force-dynamic";

let cachedDepartmentsResponse: { payload: any; timestamp: number } | null = null;
const CACHE_TTL_MS = 15 * 1000;

export async function GET(request: Request) {
  if (cachedDepartmentsResponse && Date.now() - cachedDepartmentsResponse.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cachedDepartmentsResponse.payload, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        "X-Data-Source": "edge-memory",
      },
    });
  }

  // 1. Try to fetch from the NoteLagbe Spring Boot backend with fast 2.5s timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);
  try {
    const backendUrl = resolveBackendBaseUrl();
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "";
    const backendRes = await fetch(`${backendUrl}/api/departments`, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(clientIp ? { "X-Forwarded-For": clientIp } : {}),
      },
      cache: "no-store",
    });

    if (backendRes.ok) {
      const data = await backendRes.json();
      if (data && Array.isArray(data.departments) && data.departments.length > 0) {
        const normalized = {
          ...data,
          departments: data.departments.map((d: any) => ({
            ...d,
            isLive: d.code === "CSE",
            live: d.code === "CSE",
            status: d.code === "CSE" ? "active" : "coming_soon",
          })),
        };
        cachedDepartmentsResponse = { payload: normalized, timestamp: Date.now() };
        return NextResponse.json(normalized, {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
            "X-Data-Source": "backend-live",
          },
        });
      }
    }
  } catch {
    // Backend might be warming up or offline, fallback smoothly
  } finally {
    clearTimeout(timeoutId);
  }

  // 2. Return verified official departments (11 departments, 19 programs from seu.edu.bd/programs)
  return NextResponse.json({
    success: true,
    source: "official_seu_verified_catalog",
    totalDepartments: fallbackData.departments.length,
    totalPrograms: fallbackData.totalPrograms || 19,
    departments: fallbackData.departments.map((d: any) => ({
      ...d,
      isLive: d.code === "CSE",
      status: d.code === "CSE" ? "active" : "coming_soon",
      notesStatus: d.code === "CSE" ? "active" : "coming_soon",
      teachersStatus: d.code === "CSE" ? "active" : "coming_soon",
    })),
  });
}
