"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import LiveRemainingCountdown from "@/components/LiveRemainingCountdown";
import { useDataSync } from "@/lib/sync";
import { Search, BookOpen, ArrowRight, Filter, Layers, Sparkles, ChevronRight, ChevronLeft, CheckCircle2, Flame, TrendingUp, ArrowUpDown } from "lucide-react";
import { CourseGridSkeleton } from "@/components/skeletons/CardSkeletons";
import { useSeuDepartments } from "@/lib/seuDepartments";
import coursesCatalogData from "@/data/courses_catalog.json";

export default function CoursesPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { departments: officialSeuDepts } = useSeuDepartments();
  // Instant 0ms load: Pre-populated with verified Southeast University course catalog
  const [courses, setCourses] = useState<any[]>(() => (coursesCatalogData as any[]) || []);
  const [allCourses, setAllCourses] = useState<any[]>(() => (coursesCatalogData as any[]) || []);
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<"all" | "has_notes" | "has_questions">("all");
  const [sortBy, setSortBy] = useState<"default" | "popular" | "notes" | "questions">("default");
  const [loading, setLoading] = useState<boolean>(false);
  const [syncTick, setSyncTick] = useState(0);

  // Background silent revalidation: refreshes counts without wiping UI or blocking user
  const fetchCourses = useCallback(async (isSilent = true) => {
    if (!isSilent && courses.length === 0) setLoading(true);
    try {
      const data = await api.courses.getAll();
      const validCourses = Array.isArray(data) && data.length > 0 ? data : null;
      if (validCourses) {
        setCourses(validCourses);
        setAllCourses(validCourses);
        try {
          localStorage.setItem("notelagbe_cached_courses_v2", JSON.stringify(validCourses));
        } catch {}
      }
    } catch {
      // Preserve catalog on network lag or backend warming up
    } finally {
      setLoading(false);
    }
  }, [courses.length]);

  // Load from local storage cache if available and revalidate silently
  useEffect(() => {
    try {
      const cached = localStorage.getItem("notelagbe_cached_courses_v2");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCourses(parsed);
          setAllCourses(parsed);
        }
      }
    } catch {}

    fetchCourses(true);
  }, [fetchCourses]);

  // Enterprise Live Sync: Instantly updates when admin adds/edits/deletes courses
  useDataSync(() => {
    setSyncTick((v) => v + 1);
    fetchCourses(true);
  });

  const departments = useMemo(() => {
    return [
      { id: "ALL", label: language === "bn" ? "সকল ডিপার্টমেন্ট" : "All Departments", isLive: true, count: allCourses.length },
      ...officialSeuDepts.map((d) => {
        const isCse = d.code === "CSE";
        const count = allCourses.filter((c) => (c.department || "CSE").toUpperCase() === d.code).length;
        return {
          id: d.code,
          label: d.code,
          name: d.name,
          nameBn: d.nameBn,
          isLive: isCse,
          count: isCse ? count : 0,
        };
      }),
    ];
  }, [officialSeuDepts, allCourses, language]);

  const displayedCourses = useMemo(() => {
    let list = courses.filter((c) => {
      const dept = (c.department || "CSE").toUpperCase().trim();
      if (selectedDepartment !== "ALL" && dept !== selectedDepartment.toUpperCase().trim()) return false;

      // Instant 0ms client-side semester and elective group filtering
      if (selectedSemester !== null && c.semester !== selectedSemester) return false;
      if (selectedGroup && (c.electiveGroup || "").toUpperCase() !== selectedGroup.toUpperCase()) return false;

      if (filterType === "has_notes" && !c.hasNotes) return false;
      if (filterType === "has_questions" && !c.hasQuestions) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const qNoSpace = q.replace(/\s+/g, "");
        const qStem = q.endsWith("s") && q.length > 3 ? q.slice(0, -1) : q;
        const codeClean = (c.code || "").toLowerCase().replace(/\s+/g, "");
        const titleLower = (c.title || "").toLowerCase();

        const matchCode = codeClean.includes(qNoSpace) || (c.code || "").toLowerCase().includes(q);
        const matchTitle = titleLower.includes(q) || titleLower.includes(qStem);
        const matchTeacher = c.teachers?.some((t: any) => {
          const tName = (t.name || "").toLowerCase();
          const tInitial = (t.initial || "").toLowerCase();
          return tName.includes(q) || tName.includes(qStem) || tInitial.includes(q);
        });
        if (!matchCode && !matchTitle && !matchTeacher) return false;
      }
      return true;
    });

    if (sortBy === "popular") {
      list = [...list].sort((a, b) => (b.unlockCount || 0) - (a.unlockCount || 0));
    } else if (sortBy === "notes") {
      list = [...list].sort((a, b) => (b.notesCount || 0) - (a.notesCount || 0));
    } else if (sortBy === "questions") {
      list = [...list].sort((a, b) => (b.questionsCount || 0) - (a.questionsCount || 0));
    }

    return list;
  }, [courses, filterType, searchQuery, sortBy, selectedDepartment, selectedSemester, selectedGroup]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
              {t("catalog.title", "Course Catalog & Question Bank")}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t("catalog.subtitle", "Browse academic curriculum courses, faculty assignments, lecture notes, and past examination archives")}
            </p>
          </div>
          <div className="text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 self-start sm:self-auto flex items-center gap-1.5">
            {loading && courses.length === 0 ? (
              <span>{language === "bn" ? "লোড হচ্ছে..." : "Loading Catalog..."}</span>
            ) : (
              <span>
                {displayedCourses.length} {t("catalog.coursesFound", "Courses Found")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Live Remaining Access Countdown HUD */}
      {(user?.hasActiveSubscription || user?.activeAccessExpiresAt || (user?.unlockedCourseDetails && user.unlockedCourseDetails.length > 0)) && (
        <LiveRemainingCountdown />
      )}

      {/* Filter and Search Bar */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            maxLength={100}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value.slice(0, 100))}
            placeholder={t("catalog.searchPlaceholder", "Search by course code (e.g. CSE241, CSE141), title, or instructor name (e.g. Shakib, Belal)...")}
            className="w-full px-4 py-3 pl-11 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white placeholder-slate-400"
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
        </div>

        {/* Multi-Department Filter Pills */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {language === "bn" ? "ডিপার্টমেন্ট:" : "Department:"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {departments.map((dept) => (
              <button
                key={dept.id}
                onClick={() => setSelectedDepartment(dept.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  selectedDepartment === dept.id
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-300"
                }`}
              >
                {dept.id === "CSE" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
                <span>{dept.label}</span>
                {!dept.isLive && (
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
                    {language === "bn" ? "শীঘ্রই" : "Coming Soon"}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Semester Filter (Full Width Dedicated Row) */}
        <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {language === "bn" ? "সেমিস্টার ফিল্টার:" : "Semester Filter:"}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => { setSelectedSemester(null); setSelectedGroup(null); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedSemester === null && selectedGroup === null
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {t("catalog.allSemesters", "All Semesters")}
            </button>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((sem) => (
              <button
                key={sem}
                onClick={() => { setSelectedSemester(sem); setSelectedGroup(null); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedSemester === sem
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {language === "bn" ? `সেমিস্টার ${sem}` : `Sem ${sem}`}
              </button>
            ))}
            <button
              onClick={() => { setSelectedSemester(null); setSelectedGroup("A"); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedGroup === "A"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {language === "bn" ? "গ্রুপ এ" : "Elective A"}
            </button>
            <button
              onClick={() => { setSelectedSemester(null); setSelectedGroup("B"); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedGroup === "B"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {language === "bn" ? "গ্রুপ বি" : "Elective B"}
            </button>
          </div>
        </div>

        {/* Resource Availability & Sort Order (Balanced Clean Row) */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          
          {/* Material / Resource Availability Filter */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {language === "bn" ? "ম্যাটেরিয়াল ফিল্টার:" : "Resource Availability:"}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setFilterType("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterType === "all"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {t("catalog.filterAll", "All Courses")}
              </button>
              <button
                onClick={() => setFilterType("has_notes")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterType === "has_notes"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {t("catalog.filterNotes", "Has Hand Notes")}
              </button>
              <button
                onClick={() => setFilterType("has_questions")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterType === "has_questions"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {t("catalog.filterQuestions", "Has Exam Questions")}
              </button>
            </div>
          </div>

          {/* Sort Order Controls */}
          <div className="space-y-2 lg:text-right">
            <div className="flex items-center lg:justify-end gap-1.5 text-slate-500 dark:text-slate-400">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="text-[11px] font-bold uppercase tracking-wider">
                {language === "bn" ? "সাজানোর ক্রম:" : "Sort Order:"}
              </span>
            </div>
            <div className="flex flex-wrap items-center lg:justify-end gap-1.5">
              <button
                onClick={() => setSortBy("default")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  sortBy === "default"
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {language === "bn" ? "কারিকুলাম ক্রম" : "Curriculum Order"}
              </button>
              <button
                onClick={() => setSortBy("popular")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  sortBy === "popular"
                    ? "bg-orange-600 text-white shadow-sm shadow-orange-500/20"
                    : "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border border-orange-200/60 dark:border-orange-800/40 hover:bg-orange-100 dark:hover:bg-orange-900/50"
                }`}
              >
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>{language === "bn" ? "সর্বাধিক আনলক" : "🔥 Most Unlocked"}</span>
              </button>
              <button
                onClick={() => setSortBy("notes")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  sortBy === "notes"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {language === "bn" ? "সর্বাধিক নোট" : "Most Notes"}
              </button>
              <button
                onClick={() => setSortBy("questions")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  sortBy === "questions"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {language === "bn" ? "সর্বাধিক বিগত প্রশ্ন" : "Most Past Exams"}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Courses List */}
      {loading && courses.length === 0 ? (
        <CourseGridSkeleton count={6} />
      ) : selectedDepartment !== "ALL" && displayedCourses.length === 0 && !searchQuery.trim() && !selectedSemester && filterType === "all" ? (
        <div className="p-12 sm:p-16 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center shadow-inner">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-lg mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-bold uppercase tracking-wider">
              {language === "bn" ? "ডিপার্টমেন্ট আর্কাইভ শীঘ্রই আসছে" : "Department Archive Coming Soon"}
            </span>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              {language === "bn" ? `${selectedDepartment} ডিপার্টমেন্ট` : `Department of ${selectedDepartment}`}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {language === "bn"
                ? `আমরা ${selectedDepartment} ডিপার্টমেন্টের কারিকুলাম ও প্রশ্নপত্র সংগ্রহ করছি। আপনার কাছে কোনো হ্যান্ডনোট বা প্রশ্নপত্র থাকলে কন্ট্রিবিউট করে যুক্ত করতে পারেন!`
                : `We are actively curating curriculum syllabus, lecture slides, and past examination papers for ${selectedDepartment}. If you have notes or past exams, please contribute to unlock rewards!`}
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setSelectedDepartment("ALL")}
              className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
            >
              {language === "bn" ? "সকল ডিপার্টমেন্টের কোর্স দেখুন" : "Browse All Available Courses"}
            </button>
            <Link
              href="/contribute"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-all"
            >
              {language === "bn" ? `${selectedDepartment} ম্যাটেরিয়াল জমা দিন` : `Contribute ${selectedDepartment} Materials`}
            </Link>
          </div>
        </div>
      ) : displayedCourses.length === 0 ? (
        <div className="py-20 text-center p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">No courses found matching your filter criteria</h3>
          <p className="text-xs text-slate-500 mt-1">Try resetting the department or search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedCourses.map((course) => (
            <div
              key={course.id}
              className="flex flex-col rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/90 p-6 shadow-sm hover:shadow-xl hover:border-blue-500/40 dark:hover:border-blue-500/30 transition-all group"
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
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {Boolean(course.trending && course.unlockCount && course.unlockCount > 0) && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 flex items-center gap-0.5 shadow-xs">
                      <TrendingUp className="w-2.5 h-2.5" />
                      <span>HOT</span>
                    </span>
                  )}
                  {Boolean(course.unlockCount && course.unlockCount > 0) && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-200/70 dark:border-orange-800/40 flex items-center gap-1 shadow-xs">
                      <Flame className="w-2.5 h-2.5 text-orange-500 fill-orange-500" />
                      <span>{course.unlockCount} {language === "bn" ? "আনলক" : "Unlocks"}</span>
                    </span>
                  )}
                  {course.isLab && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
                      {language === "bn" ? "ল্যাব" : "Lab"}
                    </span>
                  )}
                </div>
              </div>

              {/* Title & Metadata */}
              <h3 className="font-bold text-base text-slate-900 dark:text-white line-clamp-1 mb-2">
                {course.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2 font-medium">
                <span>{course.semester && course.semester > 0 ? `${t("course.semester", "Semester")} ${course.semester}` : (language === "bn" ? "ঐচ্ছিক" : "Elective")}</span>
                <span>•</span>
                <span>{course.credits} {t("course.credits", "Credits")}</span>
                {course.prerequisite && course.prerequisite !== "Nil" && (
                  <>
                    <span>•</span>
                    <span className="truncate">{language === "bn" ? "পূর্বশর্ত:" : "Pre:"} {course.prerequisite}</span>
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
                            <span className="text-[10px] font-medium text-slate-400">
                              {language === "bn" ? "আসছে" : "Upcoming"}
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
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  {course.unlocked && (() => {
                    const detail = user?.unlockedCourseDetails?.find((d: any) => d.courseCode?.toLowerCase() === course.code?.toLowerCase());
                    return (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>
                          {language === "bn" ? "আনলকড" : "Unlocked"}
                          {detail && detail.remainingDays > 0 ? ` (${detail.remainingDays}d)` : ""}
                        </span>
                      </span>
                    );
                  })()}
                  {course.notesCount > 0 && (
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {course.notesCount} {t("course.notesCount", "Notes")}
                    </span>
                  )}
                  {course.notesCount > 0 && course.questionsCount > 0 && <span>•</span>}
                  {course.questionsCount > 0 && (
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                      {course.questionsCount} {language === "bn" ? "বিগত প্রশ্ন" : "Past Exams"}
                    </span>
                  )}
                  {course.notesCount === 0 && course.questionsCount === 0 && (
                    <span className="text-slate-400 font-medium">
                      {language === "bn" ? "প্রথম আপলোড করুন" : "Be the first to upload"}
                    </span>
                  )}
                </div>

                <Link
                  href={`/courses/${course.code}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline group-hover:translate-x-0.5 transition-all"
                >
                  <span>{t("catalog.viewMaterials", "View Materials")}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
