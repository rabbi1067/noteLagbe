"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { api } from "@/lib/api";
import { useDataSync } from "@/lib/sync";
import { 
  Search, 
  BookOpen, 
  Sparkles, 
  Upload, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Star, 
  GraduationCap, 
  Users, 
  FileText, 
  Zap, 
  HelpCircle, 
  Clock, 
  Layers, 
  FileQuestion, 
  Award, 
  ChevronRight,
  X,
  ExternalLink,
  MessageSquare
} from "lucide-react";
import FacultyAvatar from "@/components/FacultyAvatar";
import HeroNoticeBoard from "@/components/HeroNoticeBoard";
import { CourseGridSkeleton } from "@/components/skeletons/CardSkeletons";
import { useSeuDepartments } from "@/lib/seuDepartments";
import coursesCatalogData from "@/data/courses_catalog.json";
import teachersDirectoryData from "@/data/teachers_directory.json";

const INITIAL_CSE_COURSES = ((coursesCatalogData as any[]) || []).filter(
  (c) => (c.department || "CSE").toUpperCase() === "CSE"
);
const INITIAL_TEACHERS = (teachersDirectoryData as any[]) || [];

const catalogMap = new Map((coursesCatalogData as any[]).map((c) => [c.code?.toUpperCase(), c]));
function enrichHomeCoursesWithCatalog(list: any[]): any[] {
  if (!Array.isArray(list)) return [];
  return list.map((c) => {
    const cat = catalogMap.get(c.code?.toUpperCase());
    if ((!c.teachers || c.teachers.length === 0) && cat?.teachers && cat.teachers.length > 0) {
      return {
        ...c,
        teachers: cat.teachers,
        hasNotes: c.hasNotes || cat.hasNotes,
        hasQuestions: c.hasQuestions || cat.hasQuestions,
        statusBadge: c.statusBadge && c.statusBadge !== "NONE" ? c.statusBadge : cat.statusBadge,
        notesCount: typeof c.notesCount === "number" && c.notesCount > 0 ? c.notesCount : cat.notesCount,
        questionsCount: typeof c.questionsCount === "number" && c.questionsCount > 0 ? c.questionsCount : cat.questionsCount,
      };
    }
    return c;
  });
}

const DEFAULT_PLATFORM_VIEWS = 1580;

export default function HomePage() {
  const router = useRouter();
  const { setShowAuthModal, isAuthenticated } = useAuth();
  const { language, t } = useLanguage();
  const { departments: officialSeuDepts } = useSeuDepartments();
  const [allCourses, setAllCourses] = useState<any[]>(INITIAL_CSE_COURSES);
  const [teachers, setTeachers] = useState<any[]>(INITIAL_TEACHERS);
  const [activeDepartment, setActiveDepartment] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "notes" | "questions">("all");
  const [isLoading, setIsLoading] = useState(false);
  const [syncTick, setSyncTick] = useState(0);
  const [activeVisitorCount, setActiveVisitorCount] = useState<number>(DEFAULT_PLATFORM_VIEWS);

  const courses = useMemo(() => {
    if (activeDepartment !== "ALL" && activeDepartment !== "CSE") return [];
    return allCourses;
  }, [allCourses, activeDepartment]);

  // Instant cache load on client mount without causing SSR hydration mismatch
  useEffect(() => {
    try {
      const cachedCourses = localStorage.getItem("notelagbe_cached_courses_v7");
      if (cachedCourses) {
        const parsed = JSON.parse(cachedCourses);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAllCourses(enrichHomeCoursesWithCatalog(parsed));
        }
      }
      const cachedTeachers = localStorage.getItem("notelagbe_cached_teachers_v5");
      if (cachedTeachers) {
        const parsed = JSON.parse(cachedTeachers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTeachers(parsed);
        }
      }
      const cachedViews = localStorage.getItem("notelagbe_cached_views");
      if (cachedViews) {
        const count = parseInt(cachedViews, 10);
        if (!isNaN(count) && count >= DEFAULT_PLATFORM_VIEWS) {
          setActiveVisitorCount(count);
        }
      }
    } catch {}
  }, []);

  // Real-Time Visitor & Active Learners Tracker (Persistent & increments per visit/refresh)
  useEffect(() => {
    let mounted = true;

    // Immediately increment local count so the user sees real-time persistent increment upon every page view/refresh
    let optimisticViews = DEFAULT_PLATFORM_VIEWS;
    try {
      const cached = localStorage.getItem("notelagbe_cached_views");
      const current = cached ? parseInt(cached, 10) : DEFAULT_PLATFORM_VIEWS;
      const base = !isNaN(current) && current >= DEFAULT_PLATFORM_VIEWS ? current : DEFAULT_PLATFORM_VIEWS;
      optimisticViews = base + 1;
      if (mounted) setActiveVisitorCount(optimisticViews);
      localStorage.setItem("notelagbe_cached_views", String(optimisticViews));
    } catch {}

    // Synchronize with database counter via backend API
    api.stats
      .recordVisit()
      .then((res) => {
        if (mounted && res?.totalViews) {
          try {
            const finalCount = Math.max(res.totalViews, optimisticViews);
            setActiveVisitorCount(finalCount);
            localStorage.setItem("notelagbe_cached_views", String(finalCount));
          } catch {
            setActiveVisitorCount(res.totalViews);
          }
        }
      })
      .catch(() => {
        // Fallback to local storage if offline or during server cold-start
        try {
          const cached = localStorage.getItem("notelagbe_cached_views");
          const nextCount = cached ? parseInt(cached, 10) : optimisticViews;
          if (mounted && Number.isFinite(nextCount) && nextCount >= DEFAULT_PLATFORM_VIEWS) {
            setActiveVisitorCount(nextCount);
          }
        } catch {}
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Single unified loader (avoids duplicate CSE course fetches on mount and sync)
  const loadHomeData = useCallback(async () => {
    try {
      const [allC, teachersData] = await Promise.all([
        api.courses.getAll({ department: "CSE" }).catch(() => []),
        api.teachers.getAll().catch(() => []),
      ]);
      const validAll = Array.isArray(allC) && allC.length > 0 ? allC : null;
      const validTeachers = Array.isArray(teachersData) && teachersData.length > 0 ? teachersData : null;

      if (validAll) {
        const enriched = enrichHomeCoursesWithCatalog(validAll);
        setAllCourses(enriched);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("notelagbe_cached_courses_v7", JSON.stringify(enriched));
          } catch {}
        }
      }
      if (validTeachers) {
        setTeachers(validTeachers);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("notelagbe_cached_teachers_v5", JSON.stringify(validTeachers));
          } catch {}
        }
      }
    } catch {
      // Preserve pre-seeded catalog during cold starts
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void loadHomeData();
    });
    return () => {
      active = false;
    };
  }, [loadHomeData]);

  // Enterprise Real-Time Sync: Instantly re-fetches when admin modifies any data or backend wakes up
  useDataSync(() => {
    setSyncTick((v) => v + 1);
    void loadHomeData();
  });

  // Dynamic Departments strictly from official SEU programs (https://seu.edu.bd/programs)
  const departments = useMemo(() => {
    return [
      { id: "ALL", label: language === "bn" ? "সকল ডিপার্টমেন্ট" : "All Departments", isLive: true, count: allCourses.length },
      ...officialSeuDepts.map((d) => {
        const isCse = d.code === "CSE";
        const liveCount = allCourses.filter((c) => (c.department || "CSE").toUpperCase() === d.code).length;
        return {
          id: d.code,
          label: d.code,
          name: d.name,
          nameBn: d.nameBn,
          isLive: isCse,
          count: isCse ? liveCount : 0,
        };
      }),
    ];
  }, [officialSeuDepts, allCourses, language]);

  // Live real-time search filtering as user types
  const trimmed = searchQuery.trim().toLowerCase();
  const trimmedNoSpace = trimmed.replace(/\s+/g, "");
  const trimmedStem = trimmed.endsWith("s") && trimmed.length > 3 ? trimmed.slice(0, -1) : trimmed;

  const liveMatchedCourses = trimmed
    ? courses.filter((c) => {
        const codeClean = (c.code || "").toLowerCase().replace(/\s+/g, "");
        const titleLower = (c.title || "").toLowerCase();
        return (
          codeClean.includes(trimmedNoSpace) ||
          titleLower.includes(trimmed) ||
          titleLower.includes(trimmedStem) ||
          c.teachers?.some((t: any) => {
            const tName = (t.name || "").toLowerCase();
            const tInitial = (t.initial || "").toLowerCase();
            return tName.includes(trimmed) || tName.includes(trimmedStem) || tInitial.includes(trimmed);
          })
        );
      })
    : [];

  const liveMatchedTeachers = trimmed
    ? teachers.filter((t) => {
        const tName = (t.name || "").toLowerCase();
        const tInitial = (t.initial || "").toLowerCase();
        const tDesig = (t.designation || "").toLowerCase();
        return (
          tName.includes(trimmed) ||
          tName.includes(trimmedStem) ||
          tInitial.includes(trimmed) ||
          tDesig.includes(trimmed)
        );
      })
    : [];

  // Main grid filtering
  const filteredCourses = courses.filter((c) => {
    // Only CSE courses are live
    const dept = (c.department || "CSE").toUpperCase().trim();
    if (activeDepartment !== "ALL" && activeDepartment !== "CSE") return false;
    if (dept !== "CSE") return false;

    if (activeTab === "notes" && !c.hasNotes) return false;
    if (activeTab === "questions" && !c.hasQuestions) return false;
    if (trimmed) {
      const codeClean = (c.code || "").toLowerCase().replace(/\s+/g, "");
      const titleLower = (c.title || "").toLowerCase();
      const matchCode = codeClean.includes(trimmedNoSpace) || (c.code || "").toLowerCase().includes(trimmed);
      const matchTitle = titleLower.includes(trimmed) || titleLower.includes(trimmedStem);
      const matchTeacher = c.teachers?.some((t: any) => {
        const tName = (t.name || "").toLowerCase();
        const tInitial = (t.initial || "").toLowerCase();
        return tName.includes(trimmed) || tName.includes(trimmedStem) || tInitial.includes(trimmed);
      });
      if (!matchCode && !matchTitle && !matchTeacher) return false;
    }
    return true;
  }).slice(0, 9);

  return (
    <div className="space-y-20 pb-20">
      
      {/* 1. HERO SECTION */}
      <section className="relative overflow-visible pt-3 sm:pt-4 lg:pt-5 pb-16 lg:pb-24">
        {/* Radial gradients (lighter blur on mobile GPUs for smooth scrolling) */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[700px] h-[200px] sm:h-[380px] bg-gradient-to-tr from-blue-600/15 via-indigo-500/15 to-purple-500/10 blur-3xl sm:blur-[110px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-7">
          
          {/* Real-time Campus Notice Board & Ticker */}
          <HeroNoticeBoard />

          {/* Institutional Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100/80 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-semibold">
            <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>
              {language === "bn" 
                ? "সাউথইস্ট ইউনিভার্সিটি শিক্ষক মূল্যায়ন, লেকচার নোট ও বিগত প্রশ্নব্যাংক" 
                : "Southeast University Faculty Reviews, Notes & Exam Papers"}
            </span>
          </div>

          {/* Headline */}
          <h1
            className="font-extrabold text-slate-900 dark:text-white mx-auto text-3xl sm:text-5xl lg:text-6xl max-w-4xl leading-tight tracking-tight min-h-[96px] sm:min-h-[140px] flex flex-col justify-center"
          >
            {language === "bn" ? (
              <>
                <span className="block pb-1">পরীক্ষার প্রশ্ন ও শিক্ষকের নোটস পড়ুন</span>
                <span className="block mt-1 sm:mt-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-500 dark:from-blue-400 dark:to-indigo-300 bg-clip-text text-transparent pb-1">
                  যেকোনো সময়, যেকোনো স্থান থেকে
                </span>
              </>
            ) : (
              <>
                <span className="block pb-1">Access Exam Questions and Faculty Notes</span>
                <span className="block mt-1 sm:mt-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-500 dark:from-blue-400 dark:to-indigo-300 bg-clip-text text-transparent pb-1">
                  Anytime, Anywhere
                </span>
              </>
            )}
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
            {language === "bn"
              ? "সাউথইস্ট ইউনিভার্সিটির বিভিন্ন শিক্ষকের লেকচার হ্যান্ড নোট, বিগত মিডটার্ম ও ফাইনাল পরীক্ষার প্রশ্নব্যাংক শিক্ষক অনুযায়ী খুঁজুন।"
              : "Find handwritten lecture notes, midterm & final examination question papers partitioned by specific SEU instructors. Search live as you type."}
          </p>

          {/* Interactive Live Search Box with Real-time Dropdown */}
          <div className="relative max-w-2xl mx-auto pt-2">
            <div 
              className="relative flex items-center p-2 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 focus-within:border-blue-500 dark:focus-within:border-blue-500 shadow-xl shadow-blue-500/5 transition-all"
            >
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mr-2 shrink-0">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                maxLength={100}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  language === "bn"
                    ? "শিক্ষকের নাম (যেমন: Shakib, Belal, MHB) অথবা কোর্স কোড (যেমন: CSE241) দিয়ে খুঁজুন..."
                    : "Search faculty name (e.g. Shakib, Belal, MHB) or course (e.g. CSE241)..."
                }
                className="w-full bg-transparent text-sm sm:text-base text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mr-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* LIVE REAL-TIME RESULTS DROPDOWN */}
            {trimmed && (
              <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 text-left max-h-[480px] overflow-y-auto space-y-4 animate-in fade-in slide-in-from-top-2">
                
                {/* 1. Live Matching Courses */}
                {liveMatchedCourses.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-1">
                      <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                        <BookOpen className="w-3.5 h-3.5" /> 
                        {language === "bn" ? `ম্যাচিং কোর্সসমূহ (${liveMatchedCourses.length})` : `Matching Courses (${liveMatchedCourses.length})`}
                      </span>
                      <span>{language === "bn" ? "লাইভ রেজাল্ট" : "Live Results"}</span>
                    </div>
                    <div className="space-y-1.5">
                      {liveMatchedCourses.slice(0, 5).map((course) => (
                        <Link
                          key={course.id}
                          href={`/courses/${course.code}`}
                          className="flex items-center justify-between p-3 rounded-2xl hover:bg-blue-50 dark:hover:bg-slate-800/80 transition-all border border-transparent hover:border-blue-100 dark:hover:border-slate-700 group"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                                {course.code}
                              </span>
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {course.title}
                              </h4>
                            </div>
                            {course.teachers && course.teachers.length > 0 && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {language === "bn" ? "শিক্ষক:" : "Faculty:"} {course.teachers.map((t: any) => `${t.name}${t.initial ? ` [${t.initial}]` : ""}`).slice(0, 2).join(", ")}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {course.hasNotes && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                                {language === "bn" ? "নোটস" : "Notes"}
                              </span>
                            )}
                            {course.hasQuestions && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
                                {language === "bn" ? "পরীক্ষা" : "Exams"}
                              </span>
                            )}
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Live Matching Faculty */}
                {liveMatchedTeachers.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-1">
                      <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                        <Users className="w-3.5 h-3.5" /> 
                        {language === "bn" ? `ম্যাচিং শিক্ষকবৃন্দ (${liveMatchedTeachers.length})` : `Matching Faculty Members (${liveMatchedTeachers.length})`}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {liveMatchedTeachers.slice(0, 4).map((teacher) => (
                        <Link
                          key={teacher.id}
                          href={`/teachers/${teacher.id}`}
                          className="flex items-center justify-between p-3 rounded-2xl hover:bg-purple-50/70 dark:hover:bg-slate-800/80 transition-all border border-transparent hover:border-purple-100 dark:hover:border-slate-700 group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center shrink-0">
                              {teacher.initial ? teacher.initial.substring(0, 2) : teacher.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                {teacher.name} {teacher.initial ? `[${teacher.initial}]` : ""}
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                CSE • Southeast University • {teacher.designation || (language === "bn" ? "শিক্ষক" : "Faculty")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400 group-hover:underline shrink-0">
                            <span>{language === "bn" ? "নোট ও প্রশ্ন দেখুন" : "View Exams & Notes"}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Empty State */}
                {liveMatchedCourses.length === 0 && liveMatchedTeachers.length === 0 && (
                  <div className="py-8 text-center text-slate-400 space-y-1">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {language === "bn" 
                        ? `"${searchQuery}" এর জন্য কোনো কোর্স বা শিক্ষক পাওয়া যায়নি` 
                        : `No matching courses or faculty found for "${searchQuery}"`}
                    </p>
                    <p className="text-xs text-slate-500">
                      {language === "bn"
                        ? "কোর্স কোড (যেমন: CSE241, CSE141) অথবা শিক্ষকের নাম দিয়ে অনুসন্ধান করুন"
                        : "Try searching by course code (e.g. CSE241, CSE141) or instructor name (e.g. Shakib, Belal, MHB)"}
                    </p>
                  </div>
                )}

                {/* Footer bar */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>{language === "bn" ? "বিস্তারিত দেখতে যেকোনো রেজাল্টে ক্লিক করুন" : "Click any result to view details"}</span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-blue-500 font-bold hover:underline"
                  >
                    {language === "bn" ? "ফলাফল মুছুন" : "Clear Results"}
                  </button>
                </div>
              </div>
            )}

            {/* Department Quick Filter Tags */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4">
              {departments.map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => setActiveDepartment(dept.id)}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full transition-all border ${
                    activeDepartment === dept.id
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-700"
                  }`}
                >
                  {dept.id === "CSE" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                  <span>{dept.label}</span>
                  {!dept.isLive && (
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
                      {language === "bn" ? "শীঘ্রই" : "Soon"}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 text-center">
            <Link
              href="/courses"
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-md transition-all group cursor-pointer block"
            >
              <p suppressHydrationWarning className="text-2xl font-black text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                {allCourses.length > 0 ? allCourses.length : 85}
              </p>
              <p className="text-xs font-semibold text-slate-500 group-hover:text-blue-500 transition-colors mt-0.5">
                {language === "bn" ? "কারিকুলাম কোর্স" : "Curriculum Courses"}
              </p>
            </Link>
            <Link
              href="/teachers"
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500/50 hover:shadow-md transition-all group cursor-pointer block"
            >
              <p suppressHydrationWarning className="text-2xl font-black text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                {teachers.length > 0 ? `${teachers.length}` : "397"}
              </p>
              <p className="text-xs font-semibold text-slate-500 group-hover:text-indigo-500 transition-colors mt-0.5">
                {language === "bn" ? "সাউথইস্ট শিক্ষক তালিকা" : "SEU Faculty Directory"}
              </p>
            </Link>
            <Link
              href="/courses"
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/50 hover:shadow-md transition-all group cursor-pointer block"
            >
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">100%</p>
              <p className="text-xs font-semibold text-slate-500 group-hover:text-emerald-500 transition-colors mt-0.5">
                {language === "bn" ? "ভেরিফাইড মিড ও ফাইনাল প্রশ্ন" : "Verified Mid & Final Exams"}
              </p>
            </Link>
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 relative group overflow-hidden">
              <div className="flex items-center justify-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <p suppressHydrationWarning className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono tracking-tight transition-all duration-300">
                  {activeVisitorCount.toLocaleString()}
                </p>
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                {language === "bn" ? "সক্রিয় শিক্ষার্থী ও ভিউ" : "Active Students & Views"}
              </p>
            </div>
          </div>


        </div>
      </section>

      {/* 2. BROWSE STUDY MATERIALS & QUESTION BANK */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header with Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {language === "bn" ? "ফিচার্ড কোর্স ও প্রশ্ন ব্যাংক" : "Featured Courses & Question Bank"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {language === "bn"
                ? "শিক্ষক ও সেমিস্টার অনুযায়ী সাজানো পড়াশোনার ম্যাটেরিয়াল দেখতে যেকোনো কোর্স নির্বাচন করুন"
                : "Select a course to view materials partitioned by teacher and semester"}
            </p>
          </div>

          {/* Filter Tabs: All / Notes / Questions */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl self-start sm:self-auto text-xs font-bold">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "all"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              {language === "bn" ? "সকল কন্টেন্ট" : "All Items"}
            </button>
            <button
              onClick={() => setActiveTab("notes")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "notes"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              {language === "bn" ? "লেকচার হ্যান্ড নোট" : "Lecture Notes"}
            </button>
            <button
              onClick={() => setActiveTab("questions")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "questions"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              {language === "bn" ? "পরীক্ষার প্রশ্ন ব্যাংক" : "Exam Question Archive"}
            </button>
          </div>
        </div>

        {/* Courses Grid or Coming Soon / Empty State */}
        {activeDepartment !== "ALL" && activeDepartment !== "CSE" ? (
          <div className="p-12 sm:p-16 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center shadow-inner">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="space-y-1.5 max-w-lg mx-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-bold uppercase tracking-wider">
                {language === "bn" ? "ডিপার্টমেন্ট আর্কাইভ শীঘ্রই আসছে" : "Department Archive Coming Soon"}
              </span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                {language === "bn" ? `${activeDepartment} বিভাগ` : `Department of ${activeDepartment}`}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {language === "bn"
                  ? `${activeDepartment} বিভাগের জন্য কারিকুলাম সিলেবাস, লেকচার স্লাইড এবং বিগত মিডটার্ম/ফাইনাল পরীক্ষার প্রশ্নপত্র যুক্ত করার কাজ চলছে। বর্তমানে সকল লাইভ কোর্স কম্পিউটার সায়েন্স অ্যান্ড ইঞ্জিনিয়ারিং (CSE) বিভাগের অন্তর্গত।`
                  : `We are actively curating curriculum syllabus, lecture slides, and past midterm/final examination papers for the Department of ${activeDepartment}. Currently, all live courses belong to the Department of Computer Science & Engineering (CSE).`}
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setActiveDepartment("CSE")}
                className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
              >
                {language === "bn" ? "CSE বিভাগের কোর্সগুলো দেখুন (লাইভ)" : "Browse CSE Department Courses (Live)"}
              </button>
              <Link
                href="/contribute"
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-all"
              >
                {language === "bn"
                  ? `${activeDepartment} নোট আপলোড করুন (+২ ফ্রি কোর্স)`
                  : `Contribute ${activeDepartment} Notes (+2 Free Courses)`}
              </Link>
            </div>
          </div>
        ) : isLoading && filteredCourses.length === 0 ? (
          <CourseGridSkeleton count={6} />
        ) : filteredCourses.length === 0 ? (
          <div className="p-10 sm:p-14 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center shadow-inner">
              <Clock className="w-7 h-7" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-bold uppercase tracking-wider">
                {language === "bn" ? "কোনো কোর্স মেলেনি" : "No Courses Found"}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {language === "bn" ? "কোনো কোর্স খুঁজে পাওয়া যায়নি" : "No Matching Courses"}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {language === "bn"
                  ? "আপনার অনুসন্ধানের সাথে কোনো কোর্স মিলছে না। অনুগ্রহ করে ভিন্ন কীওয়ার্ড দিয়ে অনুসন্ধান করুন।"
                  : "No courses matched your search query. Try searching with a different course code or title."}
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => { setActiveDepartment("ALL"); setSearchQuery(""); }}
                className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
              >
                {language === "bn" ? "সকল কোর্স দেখুন" : "View All Courses"}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${encodeURIComponent(course.code)}`}
                className="flex flex-col rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/90 p-6 shadow-sm hover:shadow-xl hover:border-blue-500/40 dark:hover:border-blue-500/30 transition-all group cursor-pointer"
              >
                {/* Card Top: Code & Dept Badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base text-blue-600 dark:text-blue-400 group-hover:text-blue-500 transition-colors">
                      {course.code}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {course.department || "CSE"}
                    </span>
                  </div>
                  {course.isLab && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
                      {language === "bn" ? "ল্যাব কোর্স" : "Lab Course"}
                    </span>
                  )}
                </div>

                {/* Title & Metadata */}
                <h3 className="font-bold text-base text-slate-900 dark:text-white line-clamp-1 mb-2">
                  {course.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2 font-medium">
                  <span>
                    {course.semester && course.semester > 0
                      ? (language === "bn" ? `সেমিস্টার ${course.semester}` : `Semester ${course.semester}`)
                      : (language === "bn" ? "ঐচ্ছিক" : "Elective")}
                  </span>
                  <span>•</span>
                  <span>{course.credits} {language === "bn" ? "ক্রেডিট" : "Credits"}</span>
                  {course.prerequisite && course.prerequisite !== "Nil" && (
                    <>
                      <span>•</span>
                      <span className="truncate">
                        {language === "bn" ? "পূর্বশর্ত:" : "Pre:"} {course.prerequisite}
                      </span>
                    </>
                  )}
                </p>

                {/* Teaching Faculty & Material Availability Breakdown */}
                <div className="flex-1 space-y-2 mb-5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {language === "bn" ? "দায়িত্বপ্রাপ্ত শিক্ষক ও ম্যাটেরিয়াল:" : "Assigned Faculty & Material Status:"}
                  </p>

                  {course.teachers && course.teachers.length > 0 ? (
                    <div className="space-y-1.5">
                      {course.teachers.slice(0, 3).map((teacher: any) => (
                        <div
                          key={teacher.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {teacher.initial ? teacher.initial.substring(0, 2) : teacher.name.charAt(0)}
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {teacher.name} {teacher.initial ? `[${teacher.initial}]` : ""}
                            </span>
                          </div>

                          {/* Availability Pill */}
                          <div className="shrink-0 pl-2">
                            {teacher.hasNotes && teacher.hasQuestions ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                {language === "bn" ? "নোট ও প্রশ্ন" : "Notes & Qs"}
                              </span>
                            ) : teacher.hasNotes ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                {language === "bn" ? "নোট" : "Notes"}
                              </span>
                            ) : teacher.hasQuestions ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                                {language === "bn" ? "প্রশ্ন" : "Exam Papers"}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {language === "bn" ? "অ্যাসাইনকৃত শিক্ষক" : "Assigned Faculty"}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {course.teachers.length > 3 && (
                        <p className="text-[10px] text-slate-400 text-right pr-1">
                          +{course.teachers.length - 3} {language === "bn" ? "জন শিক্ষক" : "more faculty members"}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-1">
                      {language === "bn" ? "কোর্স রেজিস্ট্রেশন অনুযায়ী শিক্ষক নির্ধারিত হবে" : "Faculty assigned on course registration"}
                    </p>
                  )}
                </div>

                {/* Card Footer: Action */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-2 text-xs">
                    {course.notesCount > 0 && (
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {course.notesCount} {language === "bn" ? "টি নোট" : "Notes"}
                      </span>
                    )}
                    {course.notesCount > 0 && course.questionsCount > 0 && <span>•</span>}
                    {course.questionsCount > 0 && (
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {course.questionsCount} {language === "bn" ? "টি প্রশ্ন" : "Exams"}
                      </span>
                    )}
                    {course.notesCount === 0 && course.questionsCount === 0 && (
                      <span className="text-slate-400 font-medium">
                        {language === "bn" ? "প্রথম আপলোড করুন" : "Be the first to upload"}
                      </span>
                    )}
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:underline group-hover:translate-x-0.5 transition-all">
                    <span>{language === "bn" ? "কোর্স দেখুন" : "Explore Course"}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* View All Courses Button */}
        <div className="text-center pt-8">
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 shadow-sm transition-all"
          >
            <span>{language === "bn" ? "সকল ৮৫টি কারিকুলাম কোর্স ব্রাউজ করুন" : "Browse All 85 Curriculum Courses"}</span>
            <ArrowRight className="w-4 h-4 text-blue-500" />
          </Link>
        </div>
      </section>

      {/* 3. FEATURED FACULTY & QUESTION ARCHIVES (Inspired by seu-ratemyfaculty.onrender.com) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Users className="w-3.5 h-3.5" /> {language === "bn" ? "সাউথইস্ট শিক্ষক তালিকা" : "SEU Faculty Directory"}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {language === "bn" ? "শিক্ষক প্রোফাইল ও পরীক্ষার প্রশ্ন ব্যাংক" : "Faculty Profiles & Question Archives"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {language === "bn"
                ? "প্রতিটি শিক্ষকের লেকচার স্লাইড, হ্যান্ড নোট এবং বিগত বছরের প্রশ্ন এক জায়গায়"
                : "Access previous year questions and lecture slides partitioned by each professor"}
            </p>
          </div>

          <Link
            href="/teachers"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline self-start sm:self-auto"
          >
            <span>{language === "bn" ? "সকল ৩১০+ শিক্ষক দেখুন" : "View All 310+ Faculty"}</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachers.slice(0, 6).map((teacher) => (
            <Link
              key={teacher.id}
              href={`/teachers/${teacher.id}`}
              className="flex flex-col p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-purple-500/40 transition-all group"
            >
              <div className="flex items-center gap-4 mb-4">
                <FacultyAvatar
                  image={teacher.image}
                  name={teacher.name}
                  initial={teacher.initial}
                  designation={teacher.designation}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                      {teacher.name}
                    </h3>
                    {teacher.initial && (
                      <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-1.5 py-0.5 rounded">
                        [{teacher.initial}]
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {teacher.designation || (language === "bn" ? "শিক্ষক" : "Faculty Member")} • CSE
                  </p>
                  <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">
                    Southeast University
                  </p>
                </div>
              </div>

              <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <FileQuestion className="w-3.5 h-3.5 text-purple-500" />
                  <span>{language === "bn" ? "পরীক্ষার প্রশ্ন ও নোট" : "Exam Papers & Notes"}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 dark:text-purple-400 group-hover:translate-x-1 transition-transform">
                  <span>{language === "bn" ? "প্রোফাইল দেখুন" : "View Profile"}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. SUBSCRIPTION PLANS & 2-COURSE CONTRIBUTION CALLOUT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-3xl space-y-5 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5" /> {language === "bn" ? "ম্যাটেরিয়াল সংগ্রহের দুটি সহজ উপায়" : "Two Fair Ways to Access Materials"}
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              {language === "bn"
                ? "৳৯৯-এ নিজের পছন্দের ৬টি কোর্স নিন — অথবা নোট আপলোড করে ২টি কোর্স ফ্রিতে আনলক করুন!"
                : "Pick Your 6 Courses for ৳99 — Or Upload Notes to Get 2 Free!"}
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed max-w-2xl">
              {language === "bn"
                ? "বিকাশ বা নগদে ৳৯৯ পেমেন্ট করে আপনার পছন্দের ৬টি কোর্সের সকল শিক্ষকের লেকচার নোট, স্লাইড এবং বিগত মিড ও ফাইনাল প্রশ্নপত্র আনলক করুন। অথবা সাউথইস্ট সহপাঠীদের সহযোগিতায় নোট শেয়ার করুন এবং ৩ মাসের জন্য (১ সেমিস্টার) ফ্রিতে ২টি কোর্স আনলক করুন।"
                : "Pay ৳99 via bKash or Nagad to unlock handwritten lecture slides and past mid/final question papers for 6 chosen courses with your preferred teachers. Or contribute study materials to help SEU peers and get 2 courses unlocked for 3 months (1 Full Semester) completely free."}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
              <Link
                href="/pricing"
                className="w-full sm:w-auto px-6 py-3 rounded-2xl text-xs sm:text-sm font-black text-slate-900 bg-white hover:bg-blue-50 transition-all shadow-lg text-center"
              >
                {language === "bn" ? "৬-কোর্স প্ল্যান বেছে নিন (৳৯৯)" : "Choose 6-Course Plan (৳99)"}
              </Link>
              <Link
                href="/contribute"
                className="w-full sm:w-auto px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-center"
              >
                {language === "bn" ? "নোট আপলোড করুন (+২ ফ্রি কোর্স)" : "Contribute Notes (+2 Free Courses)"}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
