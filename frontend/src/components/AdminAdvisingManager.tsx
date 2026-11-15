"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { api } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";
import { formatTime12 } from "@/components/SmartAdvisingRoutineTool";
import {
  Upload,
  Calendar,
  Layers,
  Users,
  BookOpen,
  Clock,
  MapPin,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  ExternalLink,
  ShieldCheck,
  Plus,
  RotateCcw,
  Sparkles,
  Info,
  X,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminAdvisingManager() {
  const { language } = useLanguage();
  const [semester, setSemester] = useState<string>("Spring 2026");
  const [availableSemesters, setAvailableSemesters] = useState<string[]>([
    "Spring 2026",
    "Summer 2026",
    "Fall 2026",
  ]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [purging, setPurging] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState<boolean>(false);
  const [isNewSemesterModalOpen, setIsNewSemesterModalOpen] = useState<boolean>(false);
  const [newSemesterInput, setNewSemesterInput] = useState<string>("");

  // Upload modal inputs (Dual-mode: File or Direct Text/HTML Paste)
  const [uploadSemester, setUploadSemester] = useState<string>("Spring 2026");
  const [replaceExisting, setReplaceExisting] = useState<boolean>(true);
  const [uploadTab, setUploadTab] = useState<"file" | "paste">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState<string>("");

  const [data, setData] = useState<{
    semester: string;
    availableSemesters?: string[];
    totalSections: number;
    totalCourses: number;
    courses: Record<string, any[]>;
    sections?: any[];
    faculties: string[];
  }>({
    semester: "Spring 2026",
    totalSections: 0,
    totalCourses: 0,
    courses: {},
    sections: [],
    faculties: [],
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const res = await api.advising.getAdminCatalog(semester);
      if (res) {
        setData(res);
        if (res.availableSemesters && res.availableSemesters.length > 0) {
          const merged = Array.from(new Set([...res.availableSemesters, "Spring 2026", "Summer 2026", "Fall 2026"]));
          setAvailableSemesters(merged);
        }
      }
    } catch (err: any) {
      console.warn("Failed to fetch admin advising catalog, falling back to public catalog:", err);
      try {
        const fallback = await api.advising.getSections(semester);
        if (fallback) {
          setData(fallback);
        }
      } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
    setUploadSemester(semester);
  }, [semester]);

  // Handle Complete Master Catalog Purge (Remove all sections for current semester)
  const handlePurgeSemesterCatalog = async () => {
    setPurging(true);
    try {
      const res = await api.advising.purgeAdminMasterCatalog(semester);
      toast.success(
        language === "bn"
          ? `🗑️ ${semester}-এর সমস্ত ${res.deletedCount}টি মাস্টার সেকশন সফলভাবে রিমুভ করা হয়েছে!`
          : `🗑️ Successfully purged all ${res.deletedCount} master sections for ${semester}!`
      );
      setIsPurgeModalOpen(false);
      fetchCatalog();
    } catch (err: any) {
      toast.error(err.message || "Failed to purge semester catalog.");
    } finally {
      setPurging(false);
    }
  };

  // Handle Delete Individual Section
  const handleDeleteSection = async (id: number, code: string, sec: string) => {
    if (!confirm(`Are you sure you want to delete section ${code}.${sec}?`)) return;
    try {
      await api.advising.deleteAdminSection(id);
      toast.success(`Deleted section ${code}.${sec}`);
      fetchCatalog();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete section.");
    }
  };

  // Restore Default 62 SEU Spring 2026 Sections
  const handleResetDefault = async () => {
    if (!confirm(`Reset and seed official 62 Southeast University sections for ${semester}?`)) return;
    setResetting(true);
    try {
      const res = await api.advising.resetAdminDefault(semester);
      toast.success(`✅ Restored ${res.restoredCount} authentic SEU sections!`);
      fetchCatalog();
    } catch (err: any) {
      toast.error(err.message || "Failed to restore default catalog.");
    } finally {
      setResetting(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setPastedText(text);
        toast.success("Pasted content from clipboard!");
      } else {
        toast.error("Clipboard is empty or contains no text.");
      }
    } catch (e) {
      toast.error("Please press Ctrl+V inside the text box to paste.");
    }
  };

  // Handle Master Upload with Replace Option (Dual-mode: File or Direct Text/HTML Paste)
  const handleMasterUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadTab === "file" && !selectedFile) {
      toast.error("Please select an official SEU UMS .html file.");
      return;
    }
    if (uploadTab === "paste" && !pastedText.trim()) {
      toast.error("Please paste your UMS table text or HTML source.");
      return;
    }
    if (uploadTab === "file" && selectedFile && selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }

    setUploading(true);
    try {
      const targetSem = uploadSemester.trim() || semester;
      const payload = uploadTab === "file" ? selectedFile! : pastedText;
      const res = await api.advising.uploadAdminMasterTable(payload, targetSem, replaceExisting);
      toast.success(
        `✅ Master table uploaded for ${targetSem}! Total: ${res.totalParsed} sections (${res.createdCount} created, ${res.updatedCount} updated).`
      );
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setPastedText("");
      if (semester !== targetSem) {
        setSemester(targetSem);
      } else {
        fetchCatalog();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload master advising table.");
    } finally {
      setUploading(false);
    }
  };

  // Add a new semester option
  const handleAddNewSemester = () => {
    const val = newSemesterInput.trim();
    if (!val) return;
    if (!availableSemesters.includes(val)) {
      setAvailableSemesters([val, ...availableSemesters]);
    }
    setSemester(val);
    setUploadSemester(val);
    setIsNewSemesterModalOpen(false);
    setNewSemesterInput("");
    toast.success(`Switched to semester: ${val}`);
  };

  // Flatten sections for filtering & display
  const allSections = useMemo(() => {
    if (data.sections && data.sections.length > 0) {
      let list = [...data.sections];
      if (!searchQuery.trim()) return list;
      const q = searchQuery.toLowerCase();
      return list.filter(
        (s) =>
          s.courseCode?.toLowerCase().includes(q) ||
          s.courseTitle?.toLowerCase().includes(q) ||
          s.facultyInitial?.toLowerCase().includes(q) ||
          s.facultyName?.toLowerCase().includes(q) ||
          s.scheduleText?.toLowerCase().includes(q)
      );
    }

    const list: any[] = [];
    Object.entries(data.courses || {}).forEach(([code, secs]) => {
      secs.forEach((s) => list.push(s));
    });
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (s) =>
        s.courseCode?.toLowerCase().includes(q) ||
        s.courseTitle?.toLowerCase().includes(q) ||
        s.facultyInitial?.toLowerCase().includes(q) ||
        s.facultyName?.toLowerCase().includes(q) ||
        s.scheduleText?.toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. TOP SUMMARY CARDS & SEMESTER SELECTOR */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Semester Intake Card with Selector */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-medium block">Semester Intake</span>
              <select
                value={semester}
                onChange={(e) => {
                  if (e.target.value === "ADD_NEW") {
                    setIsNewSemesterModalOpen(true);
                  } else {
                    setSemester(e.target.value);
                  }
                }}
                className="text-sm font-black font-mono text-slate-900 dark:text-white bg-transparent border-0 p-0 focus:outline-none focus:ring-0 cursor-pointer"
              >
                {availableSemesters.map((sem) => (
                  <option key={sem} value={sem} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {sem}
                  </option>
                ))}
                <option value="ADD_NEW" className="bg-white dark:bg-slate-900 text-blue-600 font-bold">
                  + Add New Semester...
                </option>
              </select>
            </div>
          </div>
          <button
            onClick={() => setIsNewSemesterModalOpen(true)}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            title="Create New Semester Intake"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Total Courses */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Courses</span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white font-mono">{data.totalCourses}</h3>
          </div>
        </div>

        {/* Offered Sections */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Offered Sections</span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white font-mono">{data.totalSections}</h3>
          </div>
        </div>

        {/* Faculty Members */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Faculty Members</span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white font-mono">{data.faculties?.length || 0}</h3>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ISOLATION POLICY NOTICE (STUDENT UPLOADS NEVER MERGE) */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/20 via-indigo-900/15 to-transparent border border-blue-500/30 flex items-start gap-3 text-xs text-slate-300">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">Official Administrative Master Catalog Guarantee</span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Zero-Pollution Isolated
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            This catalog contains solely the university-wide master routine managed by administrators. When individual students upload their own advising schedules on NoteLagbe tools, their files remain strictly sandboxed to their personal browser session and will <strong>never merge, overwrite, or alter this official master database</strong>.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ACTION CONTROLS & MANAGEMENT BAR */}
      {/* ========================================================================= */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Official Southeast University UMS Advising Master Importer</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                {semester}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              When semester changes or schedules update, clear the existing table or upload a new master .html file directly from ums.seu.edu.bd.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Upload Master HTML Button */}
            <button
              onClick={() => {
                setUploadSemester(semester);
                setIsUploadModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Master .html</span>
            </button>

            {/* Clear / Purge Current Semester Catalog (Remove Button requested by user) */}
            <button
              onClick={() => setIsPurgeModalOpen(true)}
              disabled={data.totalSections === 0 || purging}
              className="px-4 py-2.5 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
              title={`Remove all sections for ${semester}`}
            >
              <Trash2 className="w-4 h-4" />
              <span>{purging ? "Purging..." : `Clear ${semester} Catalog`}</span>
            </button>

            {/* Reset to Default 62 SEU Sections */}
            <button
              onClick={handleResetDefault}
              disabled={resetting}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Restore official 62 Spring 2026 sections from seed data"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${resetting ? "animate-spin" : ""}`} />
              <span>Restore Default 62</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={fetchCatalog}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Refresh Catalog"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Course Code (CSE381), Faculty Initial (DSS), Title, Room (SEU527), or Schedule..."
            className="w-full text-xs font-medium py-2.5 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. SECTIONS TABLE WITH DELETE ACTION */}
      {/* ========================================================================= */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span className="font-semibold">
            Showing {allSections.length} of {data.totalSections} master offered sections
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold">
              Semester: {semester}
            </span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              12-Hour AM/PM Accurate
            </span>
          </div>
        </div>

        {allSections.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-12 h-12 text-slate-400 mx-auto opacity-50" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              No Offered Sections in Catalog for {semester}
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              This semester currently has zero sections loaded. Click <strong>Upload Master .html</strong> above to import the official SEU UMS advising table, or click <strong>Restore Default 62</strong>.
            </p>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors inline-flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Upload New Semester File</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Section Code</th>
                  <th className="py-3 px-4">Course Title</th>
                  <th className="py-3 px-4">Credits</th>
                  <th className="py-3 px-4">Faculty Instructor</th>
                  <th className="py-3 px-4">Weekly Schedule (12-Hour AM/PM)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {allSections.map((s, idx) => (
                  <tr key={s.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {s.courseCode}.{s.sectionNumber}
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-700 dark:text-slate-300 max-w-[220px] truncate">
                      {s.courseTitle}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-bold">
                      {s.credits} Cr
                    </td>
                    <td className="py-3 px-4 font-sans text-indigo-600 dark:text-indigo-400">
                      <span className="font-mono font-bold mr-1">[{s.facultyInitial}]</span> {s.facultyName}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 text-[11px]">
                      {s.slots && s.slots.length > 0
                        ? s.slots
                            .map((sl: any) => `${sl.day} ${formatTime12(sl.start)} ~ ${formatTime12(sl.end)} @ ${sl.room}`)
                            .join(" / ")
                        : s.scheduleText}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 font-bold">
                        Master Permanent
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {s.id && (
                        <button
                          onClick={() => handleDeleteSection(s.id, s.courseCode, s.sectionNumber)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                          title="Delete this section"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: UPLOAD MASTER HTML FILE (WITH REPLACE EXISTING TOGGLE) */}
      {/* ========================================================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-500 flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Upload Master Southeast University Advising Table
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Import official Southeast University advising schedule HTML (.html) file directly from UMS.
              </p>
            </div>

            <form onSubmit={handleMasterUpload} className="space-y-4">
              {/* Target Semester Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target Semester Intake
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={uploadSemester}
                    onChange={(e) => setUploadSemester(e.target.value)}
                    placeholder="e.g. Summer 2026, Fall 2026"
                    className="flex-1 text-xs font-mono font-bold py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <select
                    value={uploadSemester}
                    onChange={(e) => setUploadSemester(e.target.value)}
                    className="text-xs font-mono py-2 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    {availableSemesters.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Replace Existing Checkbox (crucial for semester changes!) */}
              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  className="mt-0.5 rounded border-slate-400 text-blue-600 focus:ring-blue-500"
                />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                    Replace existing master catalog for {uploadSemester}
                  </span>
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 block">
                    Recommended when semester changes or a new routine is released. Purges previous sections so days, times, and rooms are completely refreshed.
                  </span>
                </div>
              </label>

              {/* Mode Switcher Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setUploadTab("file")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    uploadTab === "file"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Upload .html File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUploadTab("paste")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    uploadTab === "paste"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Paste Table / HTML</span>
                </button>
              </div>

              {/* Mode 1: File Drop Area */}
              {uploadTab === "file" && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-6 rounded-2xl border-2 border-dashed transition-all text-center space-y-2 cursor-pointer ${
                    selectedFile
                      ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20"
                      : "border-slate-300 dark:border-slate-700 hover:border-blue-500 bg-slate-50 dark:bg-slate-800/40"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".html,.htm"
                    onChange={(e) => {
                      if (e.target.files?.[0]) setSelectedFile(e.target.files[0]);
                    }}
                    className="hidden"
                  />
                  <FileText className={`w-8 h-8 mx-auto ${selectedFile ? "text-emerald-500" : "text-slate-400"}`} />
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {selectedFile ? selectedFile.name : "Click to select official UMS .html file"}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : "Supports official UMS table up to 10MB"}
                    </p>
                  </div>
                </div>
              )}

              {/* Mode 2: Paste Raw Table or HTML Text */}
              {uploadTab === "paste" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Paste Master Table Text or HTML
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePasteFromClipboard}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-700 text-[11px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Paste Clipboard</span>
                      </button>
                      {pastedText && (
                        <button
                          type="button"
                          onClick={() => setPastedText("")}
                          className="text-[11px] font-mono text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste full UMS advising table HTML source or plain text copied from browser table...&#10;&#10;Supports:&#10;• Full UMS HTML&#10;• Copied table rows (e.g. CSE355.1 Image Processing 3.0 [JAR] SUN # 10:00 ~ 11:20 @ SEU527 / TUE # 10:00 ~ 11:20 @ SEU527)&#10;• seu-routine-builder formats"
                    rows={6}
                    className="w-full text-xs font-mono p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
                  />
                  <div className="text-[10px] font-mono text-slate-400 text-right">
                    {pastedText.length > 0 ? `${pastedText.length.toLocaleString()} characters` : "Plain text or HTML"}
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || (uploadTab === "file" ? !selectedFile : !pastedText.trim())}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Upload className={`w-4 h-4 ${uploading ? "animate-spin" : ""}`} />
                  <span>{uploading ? "Processing & Replacing..." : "Confirm & Import Master Table"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CONFIRM PURGE SEMESTER CATALOG */}
      {/* ========================================================================= */}
      {isPurgeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsPurgeModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-rose-600/20 border border-rose-500/30 text-rose-500 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Clear Master Catalog for {semester}?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                This will delete all <strong>{data.totalSections} sections</strong> currently registered for {semester}.
                Use this when the semester has concluded or when preparing to upload a newly updated routine.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300">
              ⚠️ After purging, students will not see course schedules for {semester} until a new official .html table is uploaded.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsPurgeModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePurgeSemesterCatalog}
                disabled={purging}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
              >
                <Trash2 className={`w-4 h-4 ${purging ? "animate-spin" : ""}`} />
                <span>{purging ? "Purging..." : `Confirm & Clear ${semester}`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADD NEW SEMESTER INTAKE */}
      {/* ========================================================================= */}
      {isNewSemesterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsNewSemesterModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Add New Semester Intake
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter the name of the new semester you want to manage.
              </p>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={newSemesterInput}
                onChange={(e) => setNewSemesterInput(e.target.value)}
                placeholder="e.g. Summer 2026 or Fall 2026"
                className="w-full text-xs font-mono font-bold py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewSemesterModalOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddNewSemester}
                disabled={!newSemesterInput.trim()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-50"
              >
                Add & Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
