"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  ClipboardPaste,
  Layers,
  Plus,
  RotateCcw,
  Sparkles,
  Upload,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  User,
  BookOpen,
  FileText,
  Filter,
} from "lucide-react";
import {
  autoParseAdvisingText,
  ParsedOfferedSection,
  SAMPLE_SEU_RAW_ADVISING_TEXT,
} from "@/lib/seuAdvisingAutoParser";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface AdvisingDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSections: any[];
  onSaveCatalog: (sections: any[], rawText?: string) => void;
  onMergeCatalog: (sections: any[]) => void;
  semester?: string;
  isStaffOrAdmin?: boolean;
  onSyncBackend?: (rawText: string) => Promise<void>;
}

export default function AdvisingDataModal({
  isOpen,
  onClose,
  currentSections,
  onSaveCatalog,
  onMergeCatalog,
  semester = "Spring 2026",
  isStaffOrAdmin = false,
  onSyncBackend,
}: AdvisingDataModalProps) {
  const [activeTab, setActiveTab] = useState<"paste" | "sections" | "add">("paste");
  const [mobilePane, setMobilePane] = useState<"input" | "detected">("input");
  const [rawInput, setRawInput] = useState<string>("");
  const [detectedSections, setDetectedSections] = useState<ParsedOfferedSection[]>([]);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sections review tab search
  const [sectionsSearch, setSectionsSearch] = useState<string>("");

  // Manual Add Section Form State
  const [manualCode, setManualCode] = useState<string>("");
  const [manualSec, setManualSec] = useState<string>("1");
  const [manualTitle, setManualTitle] = useState<string>("");
  const [manualCredits, setManualCredits] = useState<number>(3.0);
  const [manualFacInit, setManualFacInit] = useState<string>("");
  const [manualFacName, setManualFacName] = useState<string>("");
  const [manualDay1, setManualDay1] = useState<string>("SUN");
  const [manualStart1, setManualStart1] = useState<string>("08:30");
  const [manualEnd1, setManualEnd1] = useState<string>("09:50");
  const [manualRoom1, setManualRoom1] = useState<string>("SEU333");
  const [hasSlot2, setHasSlot2] = useState<boolean>(true);
  const [manualDay2, setManualDay2] = useState<string>("TUE");
  const [manualStart2, setManualStart2] = useState<string>("08:30");
  const [manualEnd2, setManualEnd2] = useState<string>("09:50");
  const [manualRoom2, setManualRoom2] = useState<string>("SEU333");

  // Real-time auto parser with 150ms debounce
  useEffect(() => {
    if (!rawInput.trim()) {
      setDetectedSections([]);
      return;
    }

    setIsParsing(true);
    const timer = setTimeout(() => {
      try {
        const parsed = autoParseAdvisingText(rawInput, semester);
        setDetectedSections(parsed);
      } catch (err) {
        console.error("Auto parse error:", err);
      } finally {
        setIsParsing(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [rawInput, semester]);

  // Count unique courses detected
  const uniqueCoursesCount = useMemo(() => {
    const set = new Set(detectedSections.map((s) => s.courseCode));
    return set.size;
  }, [detectedSections]);

  // Sample data filler
  const handleLoadSampleData = () => {
    setRawInput(SAMPLE_SEU_RAW_ADVISING_TEXT);
    setActiveTab("paste");
    setMobilePane("detected");
    toast.success("Loaded real Southeast University advising sample data!");
  };

  // File upload reader
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    try {
      const text = await file.text();
      setRawInput(text);
      setActiveTab("paste");
      setMobilePane("detected");
      toast.success(`Loaded ${file.name}! Extracting sections...`);
    } catch {
      toast.error("Failed to read file.");
    }
  };

  // Save Catalog Action
  const handleSave = async () => {
    if (detectedSections.length === 0) {
      toast.error("No valid course sections detected. Paste advising data first!");
      return;
    }

    onSaveCatalog(detectedSections, rawInput);
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    toast.success(`✅ Saved ${detectedSections.length} sections (${uniqueCoursesCount} courses) to your catalog!`);

    // Sync to backend if staff/admin or sync handler provided
    if (onSyncBackend && rawInput) {
      try {
        await onSyncBackend(rawInput);
      } catch {}
    }

    onClose();
  };

  // Merge Catalog Action
  const handleMerge = () => {
    if (detectedSections.length === 0) {
      toast.error("No valid course sections detected to merge!");
      return;
    }

    onMergeCatalog(detectedSections);
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
    toast.success(`✅ Merged ${detectedSections.length} sections into your active catalog!`);
    onClose();
  };

  // Manual Add Form Submit
  const handleAddManualSection = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = manualCode.trim().toUpperCase();
    if (!cleanCode) {
      toast.error("Please enter a course code (e.g. CSE181)");
      return;
    }

    const slots: any[] = [
      {
        day: manualDay1,
        start: manualStart1,
        end: manualEnd1,
        room: manualRoom1.trim() || "SEU-TBA",
        startMinutes: parseInt(manualStart1.split(":")[0]) * 60 + parseInt(manualStart1.split(":")[1]),
        endMinutes: parseInt(manualEnd1.split(":")[0]) * 60 + parseInt(manualEnd1.split(":")[1]),
      },
    ];

    if (hasSlot2) {
      slots.push({
        day: manualDay2,
        start: manualStart2,
        end: manualEnd2,
        room: manualRoom2.trim() || "SEU-TBA",
        startMinutes: parseInt(manualStart2.split(":")[0]) * 60 + parseInt(manualStart2.split(":")[1]),
        endMinutes: parseInt(manualEnd2.split(":")[0]) * 60 + parseInt(manualEnd2.split(":")[1]),
      });
    }

    const newSec: ParsedOfferedSection = {
      courseCode: cleanCode,
      sectionNumber: manualSec.trim() || "1",
      courseTitle: manualTitle.trim() || cleanCode,
      credits: manualCredits,
      facultyInitial: manualFacInit.trim().toUpperCase() || "TBA",
      facultyName: manualFacName.trim() || "To Be Announced",
      availableSeats: 40,
      scheduleText: slots.map((s) => `${s.day} # ${s.start} ~ ${s.end} @ ${s.room}`).join(" / "),
      slots,
      semester,
    };

    onMergeCatalog([newSec]);
    toast.success(`Added ${newSec.courseCode}.${newSec.sectionNumber} to catalog!`);
    setManualCode("");
    setManualTitle("");
    setActiveTab("sections");
  };

  // Filter current sections for review
  const filteredCurrentSections = useMemo(() => {
    if (!sectionsSearch.trim()) return currentSections;
    const q = sectionsSearch.toLowerCase();
    return currentSections.filter(
      (s: any) =>
        s.courseCode?.toLowerCase().includes(q) ||
        s.courseTitle?.toLowerCase().includes(q) ||
        s.facultyInitial?.toLowerCase().includes(q) ||
        s.facultyName?.toLowerCase().includes(q) ||
        s.sectionNumber?.includes(q)
    );
  }, [currentSections, sectionsSearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-5xl max-h-[94vh] h-[90vh] flex flex-col rounded-3xl bg-[#090d16] border border-slate-800 shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===================================================================== */}
        {/* MODAL HEADER                                                          */}
        {/* ===================================================================== */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                <span>Course Catalog &amp; Advising Data</span>
              </h3>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Paste copied advising table from UMS or inspect current offered sections
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadSampleData}
              className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Insert realistic sample advising data with 60+ sections"
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Sample Data</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* TOP TABS NAVIGATION                                                   */}
        {/* ===================================================================== */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2 border-b border-slate-800/80 bg-slate-900/50 text-xs gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("paste")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "paste"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Paste Data</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("sections")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "sections"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Sections ({currentSections.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("add")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "add"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Section</span>
            </button>
          </div>

          {/* Mobile sub-toggle between Raw Input and Live Detected list */}
          {activeTab === "paste" && (
            <div className="flex md:hidden items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-[11px]">
              <button
                type="button"
                onClick={() => setMobilePane("input")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  mobilePane === "input" ? "bg-blue-600 text-white" : "text-slate-400"
                }`}
              >
                Input
              </button>
              <button
                type="button"
                onClick={() => setMobilePane("detected")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                  mobilePane === "detected" ? "bg-blue-600 text-white" : "text-slate-400"
                }`}
              >
                <span>Detected</span>
                {detectedSections.length > 0 && (
                  <span className="bg-purple-500 text-white rounded-full text-[9px] px-1.5 py-0.2">
                    {detectedSections.length}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ===================================================================== */}
        {/* TAB 1: PASTE DATA (SPLIT RAW INPUT & LIVE DETECTED)                  */}
        {/* ===================================================================== */}
        {activeTab === "paste" && (
          <div className="flex-1 overflow-hidden flex flex-col md:grid md:grid-cols-2 p-3 sm:p-5 gap-4">
            {/* LEFT: Raw Advising Input */}
            <div
              className={`flex-1 flex flex-col min-h-0 bg-slate-900/60 rounded-2xl border border-slate-800 p-3.5 space-y-2.5 ${
                mobilePane === "detected" ? "hidden md:flex" : "flex"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>Raw Advising Input</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {rawInput.length > 0 ? `${rawInput.length.toLocaleString()} chars` : "Paste or drag file"}
                </span>
              </div>

              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="Paste copied advising rows or full HTML table here...&#10;&#10;Supported formats:&#10;• Multi-line text directly copied from UMS advising (e.g. MAT261.10 Linear Algebra 3 [SAMD] SAT # 08:30 ~ 09:50)&#10;• TSV rows copied from browser table&#10;• Full HTML source code from UMS"
                className="flex-1 w-full bg-[#070b14] border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/60 resize-none leading-relaxed overflow-y-auto scrollbar-none"
              />

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".html,.htm,.txt"
                    onChange={(e) => {
                      if (e.target.files?.[0]) void handleFileUpload(e.target.files[0]);
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3 text-blue-400" />
                    <span>Upload .html</span>
                  </button>
                  {rawInput && (
                    <button
                      type="button"
                      onClick={() => setRawInput("")}
                      className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Mobile switch to Detected view button */}
                <button
                  type="button"
                  onClick={() => setMobilePane("detected")}
                  className="md:hidden px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-bold flex items-center gap-1"
                >
                  <span>View Detected ({detectedSections.length})</span>
                </button>
              </div>
            </div>

            {/* RIGHT: Live Detected Sections Preview */}
            <div
              className={`flex-1 flex flex-col min-h-0 bg-slate-900/60 rounded-2xl border border-slate-800 p-3.5 space-y-2.5 ${
                mobilePane === "input" ? "hidden md:flex" : "flex"
              }`}
            >
              <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-200">Detected</span>
                  {isParsing && (
                    <span className="text-[10px] font-mono text-blue-400 animate-pulse">
                      Parsing...
                    </span>
                  )}
                </div>
                <div className="text-xs font-mono font-bold text-purple-400">
                  {uniqueCoursesCount} Courses • {detectedSections.length} Sections
                </div>
              </div>

              {/* Scrollable list of detected cards */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {detectedSections.length > 0 ? (
                  detectedSections.map((sec, idx) => (
                    <div
                      key={`${sec.courseCode}.${sec.sectionNumber}-${idx}`}
                      className="p-3 rounded-xl bg-[#070b14] border border-slate-800/90 hover:border-slate-700 space-y-1.5 transition-all text-xs"
                    >
                      {/* Top Header: Section badge & Credits */}
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded font-mono font-black text-xs bg-purple-900/50 text-purple-300 border border-purple-700/60">
                          {sec.courseCode}.{sec.sectionNumber}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">
                          {sec.credits} Cr
                        </span>
                      </div>

                      {/* Course Title */}
                      <div className="font-bold text-slate-100 text-xs sm:text-sm">
                        {sec.courseTitle}
                      </div>

                      {/* Faculty */}
                      <div className="text-[11px] text-slate-300 flex items-center gap-1">
                        <User className="w-3 h-3 text-blue-400 shrink-0" />
                        <span>[{sec.facultyInitial}] {sec.facultyName}</span>
                      </div>

                      {/* Schedule Slots (Green text matching reference image) */}
                      <div className="space-y-0.5 pt-0.5">
                        {sec.slots.map((slot, sIdx) => (
                          <div
                            key={sIdx}
                            className="text-[11px] font-mono font-semibold text-emerald-400 flex items-center gap-1.5"
                          >
                            <span>{slot.day} # {slot.start} ~ {slot.end}</span>
                            <span className="text-emerald-500/80">@{slot.room}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-200">No Sections Detected Yet</h4>
                      <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                        Paste your advising table text on the left to extract sections automatically in real time.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleLoadSampleData}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                      <span>Load Sample SEU Advising Data</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 2: SECTIONS (INSPECT ACTIVE CATALOG)                              */}
        {/* ===================================================================== */}
        {activeTab === "sections" && (
          <div className="flex-1 overflow-hidden flex flex-col p-4 sm:p-6 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={sectionsSearch}
                  onChange={(e) => setSectionsSearch(e.target.value)}
                  placeholder="Search by course code, title, or faculty initial..."
                  className="w-full bg-[#070b14] border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <span className="text-xs font-mono font-bold text-slate-400">
                Showing {filteredCurrentSections.length} of {currentSections.length} Sections
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredCurrentSections.length > 0 ? (
                filteredCurrentSections.map((sec: any, idx: number) => (
                  <div
                    key={`${sec.courseCode}.${sec.sectionNumber}-${idx}`}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-purple-900/50 text-purple-300 border border-purple-700/60">
                          {sec.courseCode}.{sec.sectionNumber}
                        </span>
                        <span className="font-bold text-white text-xs truncate">
                          {sec.courseTitle}
                        </span>
                        <span className="text-[10px] text-slate-400">({sec.credits} Cr)</span>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        [{sec.facultyInitial}] {sec.facultyName}
                      </div>
                      <div className="text-[11px] font-mono text-emerald-400">
                        {sec.scheduleText}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const updated = currentSections.filter((_, i) => i !== idx);
                        onSaveCatalog(updated);
                        toast.info(`Removed ${sec.courseCode}.${sec.sectionNumber}`);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                      title="Delete Section"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <p className="text-xs">No sections match your search.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 3: ADD SECTION (MANUAL FORM)                                      */}
        {/* ===================================================================== */}
        {activeTab === "add" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <form onSubmit={handleAddManualSection} className="max-w-xl mx-auto space-y-4 text-xs">
              <h4 className="font-bold text-sm text-white mb-2">Manually Add Section</h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Course Code *</label>
                  <input
                    type="text"
                    required
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="e.g. CSE181"
                    className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Section Number *</label>
                  <input
                    type="text"
                    required
                    value={manualSec}
                    onChange={(e) => setManualSec(e.target.value)}
                    placeholder="e.g. 1"
                    className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Course Title</label>
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="e.g. Discrete Mathematics"
                  className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Credits</label>
                  <select
                    value={manualCredits}
                    onChange={(e) => setManualCredits(parseFloat(e.target.value))}
                    className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value={1.0}>1.0 Cr (Lab)</option>
                    <option value={1.5}>1.5 Cr</option>
                    <option value={3.0}>3.0 Cr (Theory)</option>
                    <option value={4.0}>4.0 Cr</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Faculty Initial</label>
                  <input
                    type="text"
                    value={manualFacInit}
                    onChange={(e) => setManualFacInit(e.target.value)}
                    placeholder="e.g. FUZ"
                    className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Faculty Name</label>
                  <input
                    type="text"
                    value={manualFacName}
                    onChange={(e) => setManualFacName(e.target.value)}
                    placeholder="e.g. Farhad Uz Zaman"
                    className="w-full bg-[#070b14] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Slot 1 */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <span className="font-bold text-slate-200">Day 1 Schedule *</span>
                <div className="grid grid-cols-4 gap-2">
                  <select
                    value={manualDay1}
                    onChange={(e) => setManualDay1(e.target.value)}
                    className="bg-[#070b14] border border-slate-800 rounded-lg p-2 text-xs text-white"
                  >
                    {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={manualStart1}
                    onChange={(e) => setManualStart1(e.target.value)}
                    placeholder="08:30"
                    className="bg-[#070b14] border border-slate-800 rounded-lg p-2 text-xs text-white font-mono"
                  />
                  <input
                    type="text"
                    value={manualEnd1}
                    onChange={(e) => setManualEnd1(e.target.value)}
                    placeholder="09:50"
                    className="bg-[#070b14] border border-slate-800 rounded-lg p-2 text-xs text-white font-mono"
                  />
                  <input
                    type="text"
                    value={manualRoom1}
                    onChange={(e) => setManualRoom1(e.target.value)}
                    placeholder="SEU333"
                    className="bg-[#070b14] border border-slate-800 rounded-lg p-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Slot 2 Toggle */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={hasSlot2}
                    onChange={(e) => setHasSlot2(e.target.checked)}
                    className="rounded accent-blue-600"
                  />
                  <span className="font-bold">Add Day 2 Slot (e.g. TUE for SUN+TUE pair)</span>
                </label>
              </div>

              {/* Slot 2 */}
              {hasSlot2 && (
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <span className="font-bold text-slate-200">Day 2 Schedule</span>
                  <div className="grid grid-cols-4 gap-2">
                    <select
                      value={manualDay2}
                      onChange={(e) => setManualDay2(e.target.value)}
                      className="bg-[#070b14] border border-slate-800 rounded-lg p-2 text-xs text-white"
                    >
                      {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={manualStart2}
                      onChange={(e) => setManualStart2(e.target.value)}
                      placeholder="08:30"
                      className="bg-[#070b14] border border-slate-800 rounded-lg p-2 text-xs text-white font-mono"
                    />
                    <input
                      type="text"
                      value={manualEnd2}
                      onChange={(e) => setManualEnd2(e.target.value)}
                      placeholder="09:50"
                      className="bg-[#070b14] border border-slate-800 rounded-lg p-2 text-xs text-white font-mono"
                    />
                    <input
                      type="text"
                      value={manualRoom2}
                      onChange={(e) => setManualRoom2(e.target.value)}
                      placeholder="SEU333"
                      className="bg-[#070b14] border border-slate-800 rounded-lg p-2 text-xs text-white"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md cursor-pointer"
              >
                + Add Section to Catalog
              </button>
            </form>
          </div>
        )}

        {/* ===================================================================== */}
        {/* BOTTOM ACTION BAR (MATCHES REFERENCE IMAGE EXACTLY)                   */}
        {/* ===================================================================== */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-slate-800 bg-slate-950/80 text-xs gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Private Session Sandbox • Changes calculate conflict-free routines</span>
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            {detectedSections.length > 0 && activeTab === "paste" && (
              <button
                type="button"
                onClick={handleMerge}
                className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Upload className="w-3.5 h-3.5 text-blue-400" />
                <span>Merge ({detectedSections.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={detectedSections.length === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs sm:text-sm font-extrabold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>
                Save Catalog ({detectedSections.length > 0 ? detectedSections.length : 0})
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
