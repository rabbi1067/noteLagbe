"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  GraduationCap, 
  BookOpen, 
  Layers, 
  Download, 
  ExternalLink, 
  Search, 
  Building2, 
  CheckCircle2, 
  Award, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  Code2, 
  ShieldCheck, 
  Cpu, 
  Network, 
  Clock, 
  Plus, 
  Mail, 
  MapPin, 
  Upload,
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

export default function AdminCurriculumTab() {
  const [selectedDeptId, setSelectedDeptId] = useState<string>("cse");
  const [selectedBatch, setSelectedBatch] = useState<"batch_72_plus" | "batch_60_71">("batch_72_plus");
  const [activeSubTab, setActiveSubTab] = useState<"roadmap" | "specializations">("roadmap");
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
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [openSemesters, setOpenSemesters] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    for (let i = 1; i <= 12; i++) init[i] = true;
    return init;
  });

  const toggleSemester = (semNum: number) => {
    setOpenSemesters((prev) => ({
      ...prev,
      [semNum]: !prev[semNum],
    }));
  };

  const currentDept: DepartmentInfo = useMemo(() => {
    return SEU_DEPARTMENTS.find((d) => d.id === selectedDeptId) || SEU_DEPARTMENTS[0];
  }, [selectedDeptId]);

  const isCseActive = selectedDeptId === "cse";

  const currentCurriculum: CurriculumData = useMemo(() => {
    return selectedBatch === "batch_72_plus" ? BATCH_72_CURRICULUM : BATCH_60_71_CURRICULUM;
  }, [selectedBatch]);

  // Filtered semesters
  const filteredSemesters = useMemo(() => {
    if (selectedYear === 0) return currentCurriculum.semesters;
    return currentCurriculum.semesters.filter((s) => s.year === selectedYear);
  }, [currentCurriculum, selectedYear]);

  const matchesSearch = (c: CourseDetail) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.code.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.prerequisite.toLowerCase().includes(q)
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Department Selector & Quick Actions */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Department-wise Academic Curriculum Governance</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              {currentDept.name} ({currentDept.code})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {currentDept.faculty} • Office: {currentDept.office} • Email: {currentDept.email}
            </p>
          </div>

          {/* Action Buttons: View Public & Download PDF */}
          <div className="flex items-center gap-2">
            <Link
              href="/curriculum"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Public Curriculum View</span>
            </Link>

            {isCseActive && (
              <a
                href="/curriculum/SEU_CSE_Curriculum_Batch_60_to_71.pdf"
                download="SEU_CSE_Curriculum_Batch_60_to_71.pdf"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm shadow-blue-500/20"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Official PDF</span>
              </a>
            )}
          </div>
        </div>

        {/* Department Switcher Tabs (All Departments) */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" /> Department:
          </span>
          {SEU_DEPARTMENTS.map((dept) => {
            const isSelected = dept.id === selectedDeptId;
            return (
              <button
                key={dept.id}
                onClick={() => setSelectedDeptId(dept.id)}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60"
                }`}
              >
                <span>{dept.code}</span>
                {dept.status === "active" ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                ) : (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold">
                    Coming Soon
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* CASE A: DEPARTMENT IS CSE */}
      {isCseActive ? (
        <>
          {/* Dual Batch Curriculum Switcher */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Batch 72+ */}
            <button
              onClick={() => setSelectedBatch("batch_72_plus")}
              className={`text-left p-5 rounded-2xl border transition-all ${
                selectedBatch === "batch_72_plus"
                  ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/30 shadow-md"
                  : "bg-white dark:bg-[#0d1527] border-slate-200 dark:border-slate-800 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 uppercase">
                  <Sparkles className="w-3 h-3" /> Latest OBE
                </span>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">141 Credits</span>
              </div>
              <h4 className="font-black text-base text-slate-900 dark:text-white mt-2">
                Batch 72 Onwards (New OBE Curriculum)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                4 Major Specialization Tracks (Software, Cyber, AI/DS, Networks) • 12 Semesters
              </p>
            </button>

            {/* Batch 60 to 71 */}
            <button
              onClick={() => setSelectedBatch("batch_60_71")}
              className={`text-left p-5 rounded-2xl border transition-all ${
                selectedBatch === "batch_60_71"
                  ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30 shadow-md"
                  : "bg-white dark:bg-[#0d1527] border-slate-200 dark:border-slate-800 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 uppercase">
                  <Award className="w-3 h-3" /> IEB Accredited
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">150 Credits</span>
              </div>
              <h4 className="font-black text-base text-slate-900 dark:text-white mt-2">
                Batch 60 to 71 (Legacy Curriculum)
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Elective Groups A & B • 12 Semesters • Official Course Curriculum PDF
              </p>
            </button>
          </div>

          {/* Sub-view Navigation */}
          <div className="border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveSubTab("roadmap")}
                className={`px-4 py-2 border-b-2 font-bold text-xs transition-all flex items-center gap-1.5 ${
                  activeSubTab === "roadmap"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>12-Semester Tables</span>
              </button>

              <button
                onClick={() => setActiveSubTab("specializations")}
                className={`px-4 py-2 border-b-2 font-bold text-xs transition-all flex items-center gap-1.5 ${
                  activeSubTab === "specializations"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>
                  {selectedBatch === "batch_72_plus" ? "4 Major Specialization Tracks" : "Elective Groups A & B"}
                </span>
              </button>
            </div>

            {/* Search */}
            <div className="relative pb-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search course code..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 12-Semester Roadmap Table */}
          {activeSubTab === "roadmap" && (
            <div className="space-y-4">
              <div className="space-y-4">
                {filteredSemesters.map((sem) => {
                  const isOpen = openSemesters[sem.semesterNumber] !== false;
                  const visibleCourses = sem.courses.filter(matchesSearch);

                  if (searchQuery.trim() && visibleCourses.length === 0) return null;

                  return (
                    <div
                      key={sem.semesterNumber}
                      className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm"
                    >
                      {/* Accordion Header */}
                      <button
                        onClick={() => toggleSemester(sem.semesterNumber)}
                        className="w-full text-left p-3.5 sm:p-4 bg-[#e0e7ff] dark:bg-blue-950/70 hover:bg-[#dbeafe] dark:hover:bg-blue-900/60 transition-colors flex items-center justify-between gap-3 select-none"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-md bg-[#283593] text-white font-black text-xs flex items-center justify-center">
                            {sem.semesterNumber}
                          </span>
                          <h4 className="font-black text-sm text-[#1e3a8a] dark:text-blue-200">
                            {sem.name}
                          </h4>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="font-bold text-[#1e3a8a] dark:text-blue-300">
                            {sem.totalCredits} Credits • {sem.courses.length} Courses
                          </span>
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>

                      {/* Official Table View */}
                      {isOpen && (
                        <div className="overflow-x-auto bg-white dark:bg-[#0d1527]">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-[#283593] text-white font-bold">
                                <th className="py-2.5 px-4 border border-[#3949ab]">Course Code</th>
                                <th className="py-2.5 px-4 border border-[#3949ab]">Course Title</th>
                                <th className="py-2.5 px-4 border border-[#3949ab] text-center">Category</th>
                                <th className="py-2.5 px-4 border border-[#3949ab] text-center">Prototype</th>
                                <th className="py-2.5 px-4 border border-[#3949ab] text-center">Credit</th>
                                <th className="py-2.5 px-4 border border-[#3949ab]">Prerequisite</th>
                                <th className="py-2.5 px-4 border border-[#3949ab] whitespace-nowrap text-center">Course Topics / Details</th>
                              </tr>
                            </thead>
                            <tbody>
                              {visibleCourses.map((course, idx) => {
                                const isExpanded = !!expandedCourseRows[course.code];
                                return (
                                  <React.Fragment key={course.code + idx}>
                                    <tr
                                      className={`hover:bg-blue-50/50 dark:hover:bg-slate-800/60 transition-colors ${
                                        idx % 2 === 0 ? "bg-white dark:bg-[#0d1527]" : "bg-slate-50/70 dark:bg-slate-800/30"
                                      }`}
                                    >
                                      <td className="py-2.5 px-4 border border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-700 dark:text-slate-300">
                                        {course.code}
                                      </td>
                                      <td className="py-2.5 px-4 border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white">
                                        {course.title}
                                      </td>
                                      <td className="py-2.5 px-4 border border-slate-200 dark:border-slate-800 text-center">
                                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-[#1e3a8a] dark:text-blue-300">
                                          {course.category}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-4 border border-slate-200 dark:border-slate-800 text-center font-medium">
                                        {course.prototype}
                                      </td>
                                      <td className="py-2.5 px-4 border border-slate-200 dark:border-slate-800 text-center font-black text-[#1e3a8a] dark:text-blue-400">
                                        {course.credits}
                                      </td>
                                      <td className="py-2.5 px-4 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                                        {course.prerequisite}
                                      </td>
                                      <td className="py-2.5 px-4 border border-slate-200 dark:border-slate-800 text-center whitespace-nowrap">
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

          {/* Specializations Tab */}
          {activeSubTab === "specializations" && (
            <div className="space-y-6">
              {selectedBatch === "batch_72_plus" && currentCurriculum.majorTracks ? (
                <div className="space-y-4">
                  {currentCurriculum.majorTracks.map((track) => (
                    <div
                      key={track.id}
                      className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm"
                    >
                      <div className="p-3.5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
                        <h4 className="font-black text-sm text-white">{track.title}</h4>
                        <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-bold">
                          {track.requiredCredits} Credits
                        </span>
                      </div>
                      <div className="overflow-x-auto bg-white dark:bg-[#0d1527]">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#283593] text-white font-bold">
                              <th className="py-2 px-4 border border-[#3949ab]">Code</th>
                              <th className="py-2 px-4 border border-[#3949ab]">Course Title</th>
                              <th className="py-2 px-4 border border-[#3949ab] text-center">Prototype</th>
                              <th className="py-2 px-4 border border-[#3949ab] text-center">Credit</th>
                              <th className="py-2 px-4 border border-[#3949ab]">Prerequisite</th>
                              <th className="py-2 px-4 border border-[#3949ab] text-center whitespace-nowrap">Course Topics / Details</th>
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
                                <td className="py-2 px-4 border border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-700 dark:text-slate-300">
                                  {course.code}
                                </td>
                                <td className="py-2 px-4 border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white">
                                  {course.title}
                                </td>
                                <td className="py-2 px-4 border border-slate-200 dark:border-slate-800 text-center">
                                  {course.prototype}
                                </td>
                                <td className="py-2 px-4 border border-slate-200 dark:border-slate-800 text-center font-bold text-blue-600">
                                  {course.credits}
                                </td>
                                <td className="py-2 px-4 border border-slate-200 dark:border-slate-800 text-slate-500 font-mono text-[11px]">
                                  {course.prerequisite}
                                </td>
                                <td className="py-2 px-4 border border-slate-200 dark:border-slate-800 text-center whitespace-nowrap">
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
              ) : (
                <div className="space-y-4">
                  {currentCurriculum.electiveGroups?.map((group) => (
                    <div
                      key={group.groupId}
                      className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm"
                    >
                      <div className="p-3.5 bg-gradient-to-r from-emerald-900 to-teal-900 text-white flex items-center justify-between">
                        <h4 className="font-black text-sm text-white">{group.name}</h4>
                        <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-bold">
                          Min {group.minCredits} Credits
                        </span>
                      </div>
                      <div className="overflow-x-auto bg-white dark:bg-[#0d1527]">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#1b5e20] text-white font-bold">
                              <th className="py-2 px-4 border border-[#2e7d32]">Course Code</th>
                              <th className="py-2 px-4 border border-[#2e7d32]">Course Title</th>
                              <th className="py-2 px-4 border border-[#2e7d32] text-center">Prototype</th>
                              <th className="py-2 px-4 border border-[#2e7d32] text-center">Credit</th>
                              <th className="py-2 px-4 border border-[#2e7d32]">Prerequisite</th>
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
                                <td className="py-2 px-4 border border-slate-200 dark:border-slate-800 font-mono font-bold text-slate-700 dark:text-slate-300">
                                  {course.code}
                                </td>
                                <td className="py-2 px-4 border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white">
                                  {course.title}
                                </td>
                                <td className="py-2 px-4 border border-slate-200 dark:border-slate-800 text-center">
                                  {course.prototype}
                                </td>
                                <td className="py-2 px-4 border border-slate-200 dark:border-slate-800 text-center font-bold text-emerald-600">
                                  {course.credits}
                                </td>
                                <td className="py-2 px-4 border border-slate-200 dark:border-slate-800 text-slate-500 font-mono text-[11px]">
                                  {course.prerequisite}
                                </td>
                                <td className="py-2 px-4 border border-slate-200 dark:border-slate-800 text-center whitespace-nowrap">
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
        /* CASE B: NON-CSE DEPARTMENTS (COMING SOON STATE IN ADMIN) */
        <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-center max-w-2xl mx-auto shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
            <Clock className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 uppercase">
              Curriculum Pending Ingestion
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              {currentDept.name} ({currentDept.code})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              This department&apos;s curriculum is scheduled as Coming Soon. Currently, the Department of Computer Science & Engineering (CSE) curriculum is fully active.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={() => setSelectedDeptId("cse")}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition-all shadow-sm"
            >
              Switch to Active CSE Curriculum
            </button>
          </div>
        </div>
      )}
    
      {/* Syllabus Topics & Outline Modal */}
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

              <button
                type="button"
                onClick={() => setSelectedCourseForSyllabus(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
