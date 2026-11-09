"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSeuDepartments } from "@/lib/seuDepartments";
import Link from "next/link";
import { api } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";
import { useDataSync } from "@/lib/sync";
import FacultyAvatar from "@/components/FacultyAvatar";
import { FacultyGridSkeleton } from "@/components/skeletons/CardSkeletons";
import { Search, User, Mail, Phone, MapPin, Award, BookOpen, ArrowRight, ChevronRight, FileQuestion, Building2, Sparkles } from "lucide-react";
import teachersDirectoryData from "@/data/teachers_directory.json";

export default function TeachersPage() {
  const { language, t } = useLanguage();
  const { departments: officialSeuDepts } = useSeuDepartments();
  // Instant 0ms load: Pre-populated with verified Southeast University faculty directory
  const [teachers, setTeachers] = useState<any[]>(() => (teachersDirectoryData as any[]) || []);
  const [category, setCategory] = useState<string>("ALL");
  const [selectedDept, setSelectedDept] = useState<string>("CSE");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState<boolean>(false);

  // Background silent revalidation: refreshes counts without wiping UI or blocking user
  const fetchTeachers = useCallback(async (isSilent = true) => {
    if (!isSilent && teachers.length === 0) setLoading(true);
    try {
      const data = await api.teachers.getAll({
        category: category === "ALL" ? undefined : category,
      });
      const valid = Array.isArray(data) && data.length > 0 ? data : null;
      if (valid) {
        setTeachers(valid);
        try {
          localStorage.setItem("notelagbe_cached_teachers", JSON.stringify(valid));
        } catch {}
      }
    } catch {
      // Preserve directory on network lag
    } finally {
      setLoading(false);
    }
  }, [category, teachers.length]);

  // Load from local storage cache if available and revalidate silently
  useEffect(() => {
    try {
      const cached = localStorage.getItem("notelagbe_cached_teachers");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTeachers(parsed);
        }
      }
    } catch {}

    fetchTeachers(true);
  }, [fetchTeachers]);

  // Enterprise Live Sync: Instantly updates when admin adds/edits/deletes faculty
  useDataSync(() => {
    fetchTeachers(true);
  });

  // Instant in-memory live filtering as user types with flexible matching
  const trimmed = query.trim().toLowerCase();
  const trimmedStem = trimmed.endsWith("s") && trimmed.length > 3 ? trimmed.slice(0, -1) : trimmed;
  const displayedTeachers = teachers.filter((t) => {
    const dept = (t.department || "CSE").toUpperCase().trim();
    if (selectedDept !== "ALL" && dept !== selectedDept.toUpperCase().trim()) return false;
    if (!trimmed) return true;
    const tName = (t.name || "").toLowerCase();
    const tInitial = (t.initial || "").toLowerCase();
    const tDesig = (t.designation || "").toLowerCase();
    const tEmail = (t.email || "").toLowerCase();
    return (
      tName.includes(trimmed) ||
      tName.includes(trimmedStem) ||
      tInitial.includes(trimmed) ||
      tDesig.includes(trimmed) ||
      tEmail.includes(trimmed)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
            {t("faculty.title", "Faculty Directory & Question Archives")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {t("faculty.subtitle", "Search Southeast University professors, inspect assigned curriculum courses, and access midterm & final exam papers")}
          </p>
        </div>
        <div className="text-xs font-bold px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/60 self-start sm:self-auto shrink-0 shadow-sm">
          {displayedTeachers.length} {language === "bn" ? "জন শিক্ষক পাওয়া গেছে" : "Faculty Found"}
        </div>
      </div>

      {/* Filter and Live Search */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            maxLength={100}
            value={query}
            onChange={(e) => setQuery(e.target.value.slice(0, 100))}
            placeholder={t("faculty.searchPlaceholder", "Search faculty name, initials (e.g. MHB, SM, Shakib, ADMR), or designation...")}
            className="w-full px-4 py-3 pl-11 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:border-purple-500 text-slate-900 dark:text-white placeholder-slate-400"
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
        </div>

        {/* Department Filter Pills */}
        <div className="space-y-1.5 pt-1 border-b border-slate-100 dark:border-slate-800 pb-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-purple-500" />
            {language === "bn" ? "ডিপার্টমেন্ট:" : "Department:"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "ALL", label: language === "bn" ? "সকল" : "All", isLive: true },
              ...officialSeuDepts.map((d) => ({
                id: d.code,
                label: d.code,
                isLive: d.code === "CSE",
              })),
            ].map((dept) => (
              <button
                key={dept.id}
                onClick={() => setSelectedDept(dept.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                  selectedDept === dept.id
                    ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-300"
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

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          {[
            { id: "FULL_TIME_FACULTY", label: t("faculty.fullTime", "Full-Time Faculty") },
            { id: "ADJUNCT_FACULTY", label: t("faculty.adjunct", "Adjunct Faculty") },
            { id: "OFFICERS_AND_STAFF", label: t("faculty.staff", "Officers & Staff") },
            { id: "ALL", label: t("faculty.all", "All Members") },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-4 py-2 rounded-xl transition-all border cursor-pointer ${
                category === cat.id
                  ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Teachers Grid or Coming Soon State */}
      {selectedDept !== "ALL" && displayedTeachers.length === 0 && !trimmed ? (
        <div className="p-12 sm:p-16 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center shadow-inner">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-lg mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-bold uppercase tracking-wider">
              Faculty Directory Coming Soon
            </span>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              Department of {selectedDept}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              We are actively compiling the faculty roster, office room directories, and consultation schedules for the Department of {selectedDept}. Currently, all active faculty belong to the <strong>Department of Computer Science & Engineering (CSE)</strong>.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => setSelectedDept("CSE")}
              className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-purple-600 hover:bg-purple-700 transition-all shadow-md shadow-purple-500/20"
            >
              Browse CSE Faculty Directory (Live)
            </button>
          </div>
        </div>
      ) : loading && teachers.length === 0 ? (
        <FacultyGridSkeleton count={6} />
      ) : displayedTeachers.length === 0 ? (
        <div className="py-20 text-center p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="font-bold text-slate-700 dark:text-slate-300">
            {query.trim()
              ? language === "bn"
                ? `"${query}" এর সাথে কোনো শিক্ষক পাওয়া যায়নি`
                : `No faculty members found matching "${query}"`
              : language === "bn"
              ? "এই ক্যাটাগরিতে কোনো শিক্ষক পাওয়া যায়নি"
              : "No faculty members found in this category"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedTeachers.map((teacher) => (
              <Link
                key={teacher.id}
                href={`/teachers/${teacher.id}`}
                className="flex flex-col p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-purple-400 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <FacultyAvatar
                    image={teacher.image}
                    name={teacher.name}
                    initial={teacher.initial}
                    designation={teacher.designation}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-white truncate group-hover:text-purple-600 transition-colors">
                        {teacher.name} {teacher.initial ? `[${teacher.initial}]` : ""}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                      {teacher.designation || (language === "bn" ? "শিক্ষক" : "Faculty Member")} • {teacher.department || "CSE"}
                    </p>
                    <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">
                      Southeast University
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="flex items-center gap-2 truncate">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{teacher.room || (language === "bn" ? "শিক্ষক অফিস, লেভেল ৬" : "Faculty Office, Level 6")}</span>
                  </p>
                  <p className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{teacher.email || "N/A"}</span>
                  </p>
                </div>

                <div className="pt-3 flex items-center justify-between text-xs font-bold text-purple-600 dark:text-purple-400 mt-auto">
                  <span className="flex items-center gap-1">
                    <FileQuestion className="w-3.5 h-3.5" />
                    <span>{t("faculty.viewProfile", "View Profile & Exams")}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }
