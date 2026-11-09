"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  GraduationCap, 
  BookOpen, 
  Layers, 
  Download, 
  Printer, 
  Search, 
  Sparkles, 
  CheckCircle2, 
  Building2, 
  ChevronDown, 
  ChevronUp, 
  Award, 
  Info, 
  Code2, 
  ShieldCheck, 
  Cpu, 
  Network, 
  Clock, 
  Upload, 
  Mail, 
  MapPin, 
  ArrowRight,
  X,
  Copy
} from "lucide-react";
import { 
  BATCH_72_CURRICULUM, 
  BATCH_60_71_CURRICULUM, 
  SEU_DEPARTMENTS, 
  CourseDetail, 
  CurriculumData,
  DepartmentInfo 
} from "@/lib/curriculumData";
import { useLanguage } from "@/context/LanguageContext";

export default function CurriculumPage() {
  const { t } = useLanguage();

  // Active department selection (e.g. "cse", "eee", "bba", "eng", "phar", "law", "ce", "te")
  const [selectedDepartment, setSelectedDepartment] = useState<string>("cse");
  // Active curriculum selection for CSE: "batch_72_plus" or "batch_60_71"
  const [selectedBatch, setSelectedBatch] = useState<"batch_72_plus" | "batch_60_71">("batch_72_plus");
  // Active view tab: "roadmap" | "specializations"
  const [activeView, setActiveView] = useState<"roadmap" | "specializations">("roadmap");
  // Semester filter: 0 = all, 1 = year 1, 2 = year 2, 3 = year 3, 4 = year 4
  const [selectedYear, setSelectedYear] = useState<number>(0);
  const [selectedCourseForSyllabus, setSelectedCourseForSyllabus] = useState<CourseDetail | null>(null);
  const [expandedCourseRows, setExpandedCourseRows] = useState<Record<string, boolean>>({});
  const [copiedTopics, setCopiedTopics] = useState<boolean>(false);

  const toggleCourseRow = (code: string) => {
    setExpandedCourseRows((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  const handleCopyTopics = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedTopics(true);
    setTimeout(() => setCopiedTopics(false), 2000);
  };
  // Search filter
  const [searchQuery, setSearchQuery] = useState<string>("");
  // Open accordion states for all semesters (all open by default)
  const [openSemesters, setOpenSemesters] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    for (let i = 1; i <= 12; i++) initial[i] = true;
    return initial;
  });

  const toggleSemester = (semNum: number) => {
    setOpenSemesters((prev) => ({
      ...prev,
      [semNum]: !prev[semNum],
    }));
  };

  const toggleAllSemesters = (expand: boolean) => {
    const updated: Record<number, boolean> = {};
    for (let i = 1; i <= 12; i++) updated[i] = expand;
    setOpenSemesters(updated);
  };

  // Current department info
  const currentDept: DepartmentInfo = useMemo(() => {
    return SEU_DEPARTMENTS.find((d) => d.id === selectedDepartment) || SEU_DEPARTMENTS[0];
  }, [selectedDepartment]);

  const isCseActive = selectedDepartment === "cse";

  // Active curriculum data (for CSE)
  const currentCurriculum: CurriculumData = useMemo(() => {
    return selectedBatch === "batch_72_plus" ? BATCH_72_CURRICULUM : BATCH_60_71_CURRICULUM;
  }, [selectedBatch]);

  // Filtered semesters based on year
  const filteredSemesters = useMemo(() => {
    if (selectedYear === 0) return currentCurriculum.semesters;
    return currentCurriculum.semesters.filter((s) => s.year === selectedYear);
  }, [currentCurriculum, selectedYear]);

  // Filtered courses based on search
  const matchesSearch = (course: CourseDetail) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      course.code.toLowerCase().includes(q) ||
      course.title.toLowerCase().includes(q) ||
      course.category.toLowerCase().includes(q) ||
      course.prerequisite.toLowerCase().includes(q)
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-[#070c18] text-slate-800 dark:text-slate-100 transition-colors pb-24 w-full max-w-full overflow-x-hidden">
      {/* Top Breadcrumb & Quick Actions Bar */}
      <div className="border-b border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-[#0b1222]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium overflow-x-auto py-1">
            <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 font-bold whitespace-nowrap">
              Academic Curriculum
            </span>
            <span>/</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold whitespace-nowrap">
              {currentDept.code}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isCseActive && (
              <a
                href="/curriculum/SEU_CSE_Curriculum_Batch_60_to_71.pdf"
                download="SEU_CSE_Curriculum_Batch_60_to_71.pdf"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition-all shadow-sm shadow-blue-500/20 active:scale-95"
                title="Download Official SEU CSE Curriculum PDF"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Official PDF</span>
              </a>
            )}

            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Print Curriculum Sheet"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-8">
        {/* ================================================================= */}
        {/* HERO SECTION                                                      */}
        {/* ================================================================= */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-950 text-white p-6 sm:p-10 shadow-xl border border-blue-800/40 w-full max-w-full">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-4xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold tracking-wide uppercase shadow-sm">
              <GraduationCap className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Southeast University • Academic Program Curriculum</span>
            </div>

            {/* Dynamic Degree Name based on selected Department */}
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              {currentDept.degreeName}
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              {isCseActive
                ? "Official undergraduate course roadmap, accredited credit allocations, and prerequisites. Choose between the new Batch 72+ OBE Curriculum and the legacy Batch 60-71 (150 Credits) syllabus."
                : `Official undergraduate curriculum roadmap for the ${currentDept.name} (${currentDept.faculty}).`}
            </p>

            {/* Department Selection Selector (All University Departments) */}
            <div className="pt-3 flex flex-wrap items-center gap-2 max-w-full">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider mr-1 flex items-center gap-1.5 shrink-0">
                <Building2 className="w-3.5 h-3.5 text-blue-400" /> Department:
              </span>
              {SEU_DEPARTMENTS.map((dept) => {
                const isSelected = dept.id === selectedDepartment;
                return (
                  <button
                    key={dept.id}
                    onClick={() => setSelectedDepartment(dept.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      isSelected
                        ? "bg-white text-blue-900 shadow-md font-black scale-105"
                        : "bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10"
                    }`}
                  >
                    <span>{dept.code}</span>
                    {dept.status === "active" ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Curriculum Active" />
                    ) : (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 border border-amber-400/30">
                        Coming Soon
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* CASE A: DEPARTMENT IS CSE (FULL DUAL CURRICULUM ACTIVATED)        */}
        {/* ================================================================= */}
        {isCseActive ? (
          <>
            {/* DUAL BATCH CURRICULUM SELECTOR */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Batch 72 Onwards */}
              <button
                onClick={() => setSelectedBatch("batch_72_plus")}
                className={`text-left p-5 sm:p-6 rounded-2xl border transition-all relative overflow-hidden group ${
                  selectedBatch === "batch_72_plus"
                    ? "bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/60 dark:to-indigo-950/40 border-blue-500 ring-2 ring-blue-500/30 shadow-lg"
                    : "bg-white dark:bg-[#0d1527] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                      <Sparkles className="w-3 h-3" />
                      Latest OBE Framework
                    </span>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mt-2">
                      Batch 72 Onwards
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      141 Total Credits • 4 Major Specializations (Software, Cyber, AI/DS, Networks) • 12 Semesters
                    </p>
                  </div>

                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                      selectedBatch === "batch_72_plus"
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-slate-300 dark:border-slate-700 group-hover:border-blue-400"
                    }`}
                  >
                    {selectedBatch === "batch_72_plus" && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <span>Trimester / 4.0 Years</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">Effective Spring 2024</span>
                </div>
              </button>

              {/* Card 2: Batch 60 to 71 */}
              <button
                onClick={() => setSelectedBatch("batch_60_71")}
                className={`text-left p-5 sm:p-6 rounded-2xl border transition-all relative overflow-hidden group ${
                  selectedBatch === "batch_60_71"
                    ? "bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/60 dark:to-teal-950/40 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg"
                    : "bg-white dark:bg-[#0d1527] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                      <Award className="w-3 h-3" />
                      IEB Accredited Legacy
                    </span>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white mt-2">
                      Batch 60 to 71
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      150 Total Credits • Elective Groups A & B • 12 Semesters • Official Syllabus
                    </p>
                  </div>

                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                      selectedBatch === "batch_60_71"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "border-slate-300 dark:border-slate-700 group-hover:border-emerald-400"
                    }`}
                  >
                    {selectedBatch === "batch_60_71" && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <span>Trimester / 4.0 Years</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Fresh 150-Credit Structure</span>
                </div>
              </button>
            </section>

            {/* KEY METRICS BAR */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Degree Credits</span>
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 block">
                  {currentCurriculum.totalCredits} Credits
                </span>
                <span className="text-[10px] text-slate-500">Graduation requirement</span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Duration</span>
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
                  12 Semesters
                </span>
                <span className="text-[10px] text-slate-500">{currentCurriculum.durationYears} Years Trimester</span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Min Passing CGPA</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {currentCurriculum.minCgpa.toFixed(2)} / 4.00
                </span>
                <span className="text-[10px] text-slate-500">Degree clearance</span>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Accreditation</span>
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 mt-1.5 block line-clamp-1">
                  {currentCurriculum.accreditation}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">✓ Approved & Active</span>
              </div>
            </section>

            {/* VIEW NAVIGATION (ROADMAP vs SPECIALIZATIONS) */}
            <div className="border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 sm:pb-px w-full max-w-full">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full pb-1 sm:pb-0">
                <button
                  onClick={() => setActiveView("roadmap")}
                  className={`px-3 sm:px-4 py-2 sm:py-2.5 border-b-2 font-bold text-xs sm:text-sm transition-all whitespace-nowrap flex items-center gap-2 shrink-0 ${
                    activeView === "roadmap"
                      ? "border-blue-600 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span>12-Semester Course Matrix</span>
                </button>

                <button
                  onClick={() => setActiveView("specializations")}
                  className={`px-3 sm:px-4 py-2 sm:py-2.5 border-b-2 font-bold text-xs sm:text-sm transition-all whitespace-nowrap flex items-center gap-2 shrink-0 ${
                    activeView === "specializations"
                      ? "border-blue-600 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <Layers className="w-4 h-4 shrink-0" />
                  <span>
                    {selectedBatch === "batch_72_plus" ? "Major Specializations (4 Tracks)" : "Elective Groups A & B"}
                  </span>
                </button>
              </div>

              {/* Quick Search */}
              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search course code or title..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                />
              </div>
            </div>

            {/* VIEW 1: SEMESTER TABLES ROADMAP (MATCHES USER SCREENSHOT) */}
            {activeView === "roadmap" && (
              <div className="space-y-6">
                {/* Filters Bar: Year Filters + Expand/Collapse All */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <span className="font-bold text-slate-400 uppercase tracking-wider mr-1">Year:</span>
                    {[
                      { label: "All Semesters", year: 0 },
                      { label: "Year 1 (Sem 1-3)", year: 1 },
                      { label: "Year 2 (Sem 4-6)", year: 2 },
                      { label: "Year 3 (Sem 7-9)", year: 3 },
                      { label: "Year 4 (Sem 10-12)", year: 4 },
                    ].map((item) => (
                      <button
                        key={item.year}
                        onClick={() => setSelectedYear(item.year)}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                          selectedYear === item.year
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleAllSemesters(true)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-slate-600 dark:text-slate-300"
                    >
                      Expand All
                    </button>
                    <button
                      onClick={() => toggleAllSemesters(false)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-slate-600 dark:text-slate-300"
                    >
                      Collapse All
                    </button>
                  </div>
                </div>

                {/* Semester Accordions Grid */}
                <div className="space-y-6">
                  {filteredSemesters.map((sem) => {
                    const isOpen = openSemesters[sem.semesterNumber] !== false;
                    const visibleCourses = sem.courses.filter(matchesSearch);

                    if (searchQuery.trim() && visibleCourses.length === 0) {
                      return null;
                    }

                    return (
                      <div
                        key={sem.semesterNumber}
                        className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm transition-all"
                      >
                        {/* Accordion Header (Styled exactly like SEU Website) */}
                        <button
                          onClick={() => toggleSemester(sem.semesterNumber)}
                          className="w-full text-left p-4 sm:p-4.5 bg-[#e0e7ff] dark:bg-blue-950/70 hover:bg-[#dbeafe] dark:hover:bg-blue-900/60 transition-colors flex items-center justify-between gap-3 select-none"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-[#283593] text-white font-black text-xs flex items-center justify-center shadow-sm">
                              {sem.semesterNumber}
                            </span>
                            <div>
                              <h4 className="font-black text-base text-[#1e3a8a] dark:text-blue-200">
                                {sem.name}
                              </h4>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <span className="font-extrabold text-xs px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 text-[#1e3a8a] dark:text-blue-300 shadow-sm">
                              {sem.totalCredits} Credits • {sem.courses.length} Courses
                            </span>
                            {isOpen ? (
                              <ChevronUp className="w-5 h-5 text-[#1e3a8a] dark:text-blue-300" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-[#1e3a8a] dark:text-blue-300" />
                            )}
                          </div>
                        </button>

                        {/* Table View (Matching Southeast University Official Table) */}
                        {isOpen && (
                          <div className="w-full max-w-full overflow-x-auto bg-white dark:bg-[#0d1527]">
                            <table className="min-w-[650px] w-full text-left border-collapse text-xs">
                              {/* Table Header: #283593 blue */}
                              <thead>
                                <tr className="bg-[#283593] text-white font-bold">
                                  <th className="py-3 px-4 border border-[#3949ab] whitespace-nowrap">
                                    Course Code
                                  </th>
                                  <th className="py-3 px-4 border border-[#3949ab]">
                                    Course Title
                                  </th>
                                  <th className="py-3 px-4 border border-[#3949ab] whitespace-nowrap text-center">
                                    Category
                                  </th>
                                  <th className="py-3 px-4 border border-[#3949ab] whitespace-nowrap text-center">
                                    Prototype
                                  </th>
                                  <th className="py-3 px-4 border border-[#3949ab] whitespace-nowrap text-center">
                                    Credit
                                  </th>
                                  <th className="py-3 px-4 border border-[#3949ab]">
                                    Prerequisite
                                  </th>
                                  <th className="py-3 px-4 border border-[#3949ab] whitespace-nowrap text-center">
                                    Course Topics / Details
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {visibleCourses.map((course, idx) => {
                                  const isExpanded = !!expandedCourseRows[course.code];
                                  return (
                                    <React.Fragment key={course.code + idx}>
                                      <tr
                                        className={`transition-colors hover:bg-blue-50/50 dark:hover:bg-slate-800/60 ${
                                          idx % 2 === 0
                                            ? "bg-white dark:bg-[#0d1527]"
                                            : "bg-slate-50/70 dark:bg-slate-800/30"
                                        }`}
                                      >
                                        {/* Course Code */}
                                        <td className="py-3 px-4 border border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                          {course.code}
                                        </td>

                                        {/* Course Title */}
                                        <td className="py-3 px-4 border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white">
                                          {course.title}
                                        </td>

                                        {/* Category Badge */}
                                        <td className="py-3 px-4 border border-slate-200 dark:border-slate-800 text-center whitespace-nowrap">
                                          <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-[#1e3a8a] dark:text-blue-300">
                                            {course.category}
                                          </span>
                                        </td>

                                        {/* Prototype */}
                                        <td className="py-3 px-4 border border-slate-200 dark:border-slate-800 text-center whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                                          {course.prototype}
                                        </td>

                                        {/* Credit */}
                                        <td className="py-3 px-4 border border-slate-200 dark:border-slate-800 text-center font-black text-[#1e3a8a] dark:text-blue-400">
                                          {course.credits}
                                        </td>

                                        {/* Prerequisite */}
                                        <td className="py-3 px-4 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                                          {course.prerequisite === "-" ? (
                                            <span className="text-slate-400 font-sans">-</span>
                                          ) : (
                                            course.prerequisite
                                          )}
                                        </td>

                                        {/* Course Topics / Details */}
                                        <td className="py-3 px-4 border border-slate-200 dark:border-slate-800 text-center whitespace-nowrap">
                                          <div className="flex items-center justify-center gap-1.5">
                                            <button
                                              type="button"
                                              onClick={() => setSelectedCourseForSyllabus(course)}
                                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 transition-all shadow-xs cursor-pointer group hover:scale-[1.02]"
                                              title={`View syllabus topics for ${course.code}`}
                                            >
                                              <BookOpen className="w-3.5 h-3.5 text-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors" />
                                              <span>View Topics</span>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleCourseRow(course.code);
                                              }}
                                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                              title={isExpanded ? "Collapse inline preview" : "Expand inline preview"}
                                            >
                                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180 text-blue-500" : ""}`} />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>

                                      {/* Inline Expandable Row for Topics */}
                                      {isExpanded && (
                                        <tr className="bg-blue-50/40 dark:bg-slate-900/60 border-b border-blue-100 dark:border-slate-800/80">
                                          <td colSpan={7} className="p-4 px-6 text-left">
                                            <div className="bg-white dark:bg-[#0b1324] rounded-xl p-4 border border-blue-100 dark:border-slate-800 shadow-xs">
                                              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
                                                <div className="flex items-center gap-2">
                                                  <span className="font-mono font-bold text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                                                    {course.code}
                                                  </span>
                                                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                                                    {course.title} ({course.credits} Credits)
                                                  </span>
                                                </div>
                                                <div className="text-xs text-slate-500 font-medium">
                                                  PREREQUISITE(S): <span className="text-slate-800 dark:text-slate-200 font-mono font-semibold">{course.prerequisite === "-" ? "Nil" : course.prerequisite}</span>
                                                </div>
                                              </div>
                                              <div>
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1.5">
                                                  <BookOpen className="w-3 h-3" />
                                                  TOPICS / WHAT IS TAUGHT:
                                                </div>
                                                <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-normal">
                                                  {course.topics || "Standard departmental syllabus outlines apply."}
                                                </div>
                                                {course.recommendedBooks && (
                                                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
                                                      RECOMMENDED BOOKS:
                                                    </div>
                                                    <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 whitespace-pre-line">
                                                      {course.recommendedBooks}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VIEW 2: SPECIALIZATION TRACKS / ELECTIVES */}
            {activeView === "specializations" && (
              <div className="space-y-6">
                <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-start gap-3 text-xs sm:text-sm text-blue-900 dark:text-blue-200">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Elective & Major Specialization Structure:</strong>{" "}
                    {selectedBatch === "batch_72_plus"
                      ? "Students in Batch 72+ choose 1 of the 4 Major Tracks. 6 Courses (12 Credits) required to complete the major."
                      : "Students in Batch 60 to 71 must take at least two courses with associated lab from Group B, with remaining credits fulfilled from Group A or Group B."}
                  </div>
                </div>

                {/* If Batch 72+: Render 4 Tracks as official tables */}
                {selectedBatch === "batch_72_plus" && currentCurriculum.majorTracks && (
                  <div className="space-y-6">
                    {currentCurriculum.majorTracks.map((track) => (
                      <div
                        key={track.id}
                        className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm"
                      >
                        <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            {track.id === "track_se" && <Code2 className="w-5 h-5 text-blue-300" />}
                            {track.id === "track_cyber" && <ShieldCheck className="w-5 h-5 text-red-300" />}
                            {track.id === "track_ai_ds" && <Cpu className="w-5 h-5 text-purple-300" />}
                            {track.id === "track_network" && <Network className="w-5 h-5 text-emerald-300" />}
                            <h4 className="font-black text-base text-white">
                              {track.title}
                            </h4>
                          </div>
                          <span className="font-bold text-xs px-3 py-1 rounded-full bg-white/20 text-white">
                            6 Courses — {track.requiredCredits} Credits Required
                          </span>
                        </div>

                        <div className="overflow-x-auto bg-white dark:bg-[#0d1527]">
                          <table className="min-w-[650px] w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-[#283593] text-white font-bold">
                                <th className="py-2.5 px-4 border border-[#3949ab]">Code</th>
                                <th className="py-2.5 px-4 border border-[#3949ab]">Course Title</th>
                                <th className="py-2.5 px-4 border border-[#3949ab] text-center">Prototype</th>
                                <th className="py-2.5 px-4 border border-[#3949ab] text-center">Credit</th>
                                <th className="py-2.5 px-4 border border-[#3949ab]">Prerequisite</th>
                                <th className="py-2.5 px-4 border border-[#3949ab] text-center whitespace-nowrap">Course Topics / Details</th>
                              </tr>
                            </thead>
                            <tbody>
                              {track.courses.map((course, idx) => (
                                <tr
                                  key={course.code + idx}
                                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                                    idx % 2 === 0 ? "bg-white dark:bg-[#0d1527]" : "bg-slate-50/60 dark:bg-slate-800/30"
                                  }`}
                                >
                                  <td className="py-2.5 px-4 border border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-700 dark:text-slate-300">
                                    {course.code}
                                  </td>
                                  <td className="py-2.5 px-4 border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white">
                                    {course.title}
                                  </td>
                                  <td className="py-2.5 px-4 border border-slate-200 dark:border-slate-800 text-center font-medium">
                                    {course.prototype}
                                  </td>
                                  <td className="py-2.5 px-4 border border-slate-200 dark:border-slate-800 text-center font-bold text-[#1e3a8a] dark:text-blue-400">
                                    {course.credits}
                                  </td>
                                  <td className="py-2.5 px-4 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                                    {course.prerequisite}
                                  </td>
                                  <td className="py-2.5 px-4 border border-slate-200 dark:border-slate-800 text-center whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedCourseForSyllabus(course)}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 transition-all cursor-pointer"
                                    >
                                      <BookOpen className="w-3 h-3 text-blue-500" />
                                      <span>View Topics</span>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* If Batch 60 to 71: Render Elective Groups A & B */}
                {selectedBatch === "batch_60_71" && currentCurriculum.electiveGroups && (
                  <div className="space-y-6">
                    {currentCurriculum.electiveGroups.map((group) => (
                      <div
                        key={group.groupId}
                        className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm"
                      >
                        <div className="p-4 bg-gradient-to-r from-emerald-900 to-teal-900 text-white flex items-center justify-between gap-3">
                          <div>
                            <h4 className="font-black text-base text-white">{group.name}</h4>
                            <p className="text-xs text-emerald-200 mt-0.5">{group.description}</p>
                          </div>
                          <span className="font-bold text-xs px-3 py-1 rounded-full bg-white/20 text-white shrink-0">
                            Min {group.minCredits} Credits
                          </span>
                        </div>

                        <div className="overflow-x-auto bg-white dark:bg-[#0d1527]">
                          <table className="min-w-[650px] w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-[#1b5e20] text-white font-bold">
                                <th className="py-2.5 px-4 border border-[#2e7d32]">Course Code</th>
                                <th className="py-2.5 px-4 border border-[#2e7d32]">Course Title</th>
                                <th className="py-2.5 px-4 border border-[#2e7d32] text-center">Prototype</th>
                                <th className="py-2.5 px-4 border border-[#2e7d32] text-center">Credits</th>
                                <th className="py-2.5 px-4 border border-[#2e7d32]">Prerequisites</th>
                                <th className="py-2.5 px-4 border border-[#2e7d32] text-center whitespace-nowrap">Course Topics / Details</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.courses.map((course, idx) => (
                                <tr
                                  key={course.code + idx}
                                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                                    idx % 2 === 0 ? "bg-white dark:bg-[#0d1527]" : "bg-slate-50/60 dark:bg-slate-800/30"
                                  }`}
                                >
                                  <td className="py-2.5 px-4 border border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-700 dark:text-slate-300">
                                    {course.code}
                                  </td>
                                  <td className="py-2.5 px-4 border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white">
                                    {course.title}
                                  </td>
                                  <td className="py-2.5 px-4 border border-slate-200 dark:border-slate-800 text-center font-medium">
                                    {course.prototype}
                                  </td>
                                  <td className="py-2.5 px-4 border border-slate-200 dark:border-slate-800 text-center font-bold text-emerald-700 dark:text-emerald-400">
                                    {course.credits}
                                  </td>
                                  <td className="py-2.5 px-4 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                                    {course.prerequisite}
                                  </td>
                                  <td className="py-2.5 px-4 border border-slate-200 dark:border-slate-800 text-center whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedCourseForSyllabus(course)}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 transition-all cursor-pointer"
                                    >
                                      <BookOpen className="w-3 h-3 text-blue-500" />
                                      <span>View Topics</span>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* ================================================================= */
          /* CASE B: OTHER DEPARTMENTS (COMING SOON STATE)                     */
          /* ================================================================= */
          <div className="space-y-6">
            <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-center max-w-3xl mx-auto shadow-sm space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center shadow-inner">
                <Clock className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  Curriculum Archive Coming Soon
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {currentDept.name} ({currentDept.code})
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
                  The official course curriculum for <strong className="text-slate-700 dark:text-slate-200">{currentDept.degreeName}</strong> is currently being digitized and scheduled for release. You will be able to view trimester-wise course outlines and prerequisites right here once published.
                </p>
              </div>

              {/* Department Contact Details */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 max-w-lg mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{currentDept.faculty}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{currentDept.office}</span>
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <a href={`mailto:${currentDept.email}`} className="text-blue-600 hover:underline">
                    {currentDept.email}
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setSelectedDepartment("cse")}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>View Department of CSE Curriculum</span>
                </button>

                <Link
                  href="/contribute"
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors flex items-center gap-2"
                >
                  <Upload className="w-4 h-4 text-emerald-500" />
                  <span>Contribute Materials for {currentDept.code}</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    
      {/* Syllabus Topics & Outline Modal (Official Course Details) */}
      {selectedCourseForSyllabus && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedCourseForSyllabus(null)}
        >
          <div 
            className="bg-white dark:bg-[#0c1527] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50/80 dark:bg-slate-900/60">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-blue-600 text-white">
                    {selectedCourseForSyllabus.code}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {selectedCourseForSyllabus.prototype}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    {selectedCourseForSyllabus.credits} Credits
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                    {selectedCourseForSyllabus.category}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedCourseForSyllabus.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                  PREREQUISITE(S): <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedCourseForSyllabus.prerequisite === "-" ? "Nil" : selectedCourseForSyllabus.prerequisite}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCourseForSyllabus(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              {/* Formal Title & Prereq Callout */}
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 font-mono text-xs text-blue-900 dark:text-blue-300 font-semibold space-y-1">
                <div>
                  {selectedCourseForSyllabus.code}: {selectedCourseForSyllabus.title.toUpperCase()} ({selectedCourseForSyllabus.credits} CREDITS)
                </div>
                <div>
                  PREREQUISITE(S): {selectedCourseForSyllabus.prerequisite === "-" ? "Nil" : selectedCourseForSyllabus.prerequisite}
                </div>
              </div>

              {/* TOPICS Section */}
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  TOPICS / WHAT IS TAUGHT:
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line text-sm">
                  {selectedCourseForSyllabus.topics || "Standard departmental syllabus outlines apply."}
                </div>
              </div>

              {/* RECOMMENDED BOOKS Section */}
              {selectedCourseForSyllabus.recommendedBooks && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
                    <Award className="w-4 h-4 text-emerald-500" />
                    RECOMMENDED BOOKS:
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {selectedCourseForSyllabus.recommendedBooks}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  const copyContent = `${selectedCourseForSyllabus.code}: ${selectedCourseForSyllabus.title.toUpperCase()} (${selectedCourseForSyllabus.credits} CREDITS)\nPREREQUISITE(S): ${selectedCourseForSyllabus.prerequisite === '-' ? 'Nil' : selectedCourseForSyllabus.prerequisite}\nTOPICS:\n${selectedCourseForSyllabus.topics || ''}${selectedCourseForSyllabus.recommendedBooks ? '\nRECOMMENDED BOOKS:\n' + selectedCourseForSyllabus.recommendedBooks : ''}`;
                  handleCopyTopics(copyContent);
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer"
              >
                {copiedTopics ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copiedTopics ? "Copied to Clipboard!" : "Copy Syllabus Topics"}</span>
              </button>

              <div className="flex items-center gap-2">
                <Link
                  href={`/courses/${selectedCourseForSyllabus.code}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs cursor-pointer"
                >
                  <span>Materials & Questions</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <button
                  type="button"
                  onClick={() => setSelectedCourseForSyllabus(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors shadow-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
