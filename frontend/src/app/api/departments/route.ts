import { NextResponse } from "next/server";
import fallbackData from "@/data/seu_programs.json";

export const dynamic = "force-dynamic";

export async function GET() {
  // 1. Try to fetch from the NoteLagbe Spring Boot backend (which live-syncs with seu.edu.bd/programs)
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
    const backendRes = await fetch(`${backendUrl}/api/departments`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    if (backendRes.ok) {
      const data = await backendRes.json();
      if (data && Array.isArray(data.departments) && data.departments.length > 0) {
        return NextResponse.json({
          ...data,
          departments: data.departments.map((d: any) => ({
            ...d,
            isLive: d.code === "CSE",
            live: d.code === "CSE",
            status: d.code === "CSE" ? "active" : "coming_soon",
          })),
        });
      }
    }
  } catch {
    // Backend might be warming up or offline, fallback smoothly
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
