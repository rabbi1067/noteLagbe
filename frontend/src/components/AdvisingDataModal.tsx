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
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  BookOpen,
  FileText,
  FileCode,
  UploadCloud,
  FolderOpen,
  ShieldCheck,
  Zap,
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
  onSaveCatalog: (sections: any[]) => void;
  semester?: string;
  isStaffOrAdmin?: boolean;
}

export default function AdvisingDataModal({
  isOpen,
  onClose,
  currentSections,
  onSaveCatalog,
  semester = "Spring 2026",
}: AdvisingDataModalProps) {
  // Tabs: html (Highlighted default), paste, sections, add
  const [activeTab, setActiveTab] = useState<"html" | "paste" | "sections" | "add">("html");
  const [mobilePane, setMobilePane] = useState<"input" | "detected">("input");

  // File Upload State
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [uploadedFileSize, setUploadedFileSize] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const htmlFileInputRef = useRef<HTMLInputElement>(null);
  const pasteFileInputRef = useRef<HTMLInputElement>(null);

  // Parsing State
  const [rawInput, setRawInput] = useState<string>("");
  const [detectedSections, setDetectedSections] = useState<ParsedOfferedSection[]>([]);
  const [isParsing, setIsParsing] = useState<boolean>(false);

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

  // Real-time auto parser with 120ms debounce
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
    }, 120);

    return () => clearTimeout(timer);
  }, [rawInput, semester]);

  // Count unique courses detected
  const uniqueCoursesCount = useMemo(() => {
    const set = new Set(detectedSections.map((s) => s.courseCode));
    return set.size;
  }, [detectedSections]);

  // File upload reader for HTML or text
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    try {
      const text = await file.text();
      setUploadedFileName(file.name);
      setUploadedFileSize(file.size);
      setRawInput(text);
      setMobilePane("detected");
      toast.success(`Loaded ${file.name}! Extracting course sections...`);
    } catch {
      toast.error("Failed to read file.");
    }
  };

  // Sample data filler
  const handleLoadSampleData = () => {
    setRawInput(SAMPLE_SEU_RAW_ADVISING_TEXT);
    setUploadedFileName("SEU_Spring_2026_Sample.html");
    setUploadedFileSize(SAMPLE_SEU_RAW_ADVISING_TEXT.length);
    setMobilePane("detected");
    toast.success("Loaded verified Southeast University advising sample dataset!");
  };

  // Apply to Active Session Action (Session sandbox only - does NOT persist to backend)
  const handleApplyToSession = () => {
    if (detectedSections.length === 0) {
      toast.error("No valid course sections detected. Please upload an HTML file or paste advising text first!");
      return;
    }

    onSaveCatalog(detectedSections);
    try {
      confetti({ particleCount: 55, spread: 65, origin: { y: 0.6 } });
    } catch {}
    toast.success(`✅ Session Activated: ${detectedSections.length} sections (${uniqueCoursesCount} courses) loaded!`);
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

    onSaveCatalog([...currentSections, newSec]);
    toast.success(`Added ${newSec.courseCode}.${newSec.sectionNumber} to session catalog!`);
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
            <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                <span>Course Catalog &amp; Advising Data</span>
              </h3>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Upload UMS advising HTML, paste data rows, or inspect active offered sections
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
        {/* TOP TABS NAVIGATION (PROMINENT HTML UPLOAD FIRST)                     */}
        {/* ===================================================================== */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-b border-slate-800/80 bg-slate-900/60 text-xs gap-2 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2">
            {/* 1. Upload HTML File (PROMINENTLY HIGHLIGHTED AS REQUESTED) */}
            <button
              type="button"
              onClick={() => setActiveTab("html")}
              className={`px-3.5 py-2 rounded-xl font-black transition-all flex items-center gap-2 cursor-pointer relative ${
                activeTab === "html"
                  ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-400"
                  : "bg-gradient-to-r from-indigo-950/80 to-purple-950/80 text-indigo-300 border border-indigo-700/60 hover:border-indigo-500 hover:text-white"
              }`}
            >
              <FileCode className="w-4 h-4 text-indigo-200" />
              <span>Upload .html</span>
              <span className="text-[9px] font-mono font-black px-1.5 py-0.2 rounded-md bg-white/20 text-white uppercase tracking-wider">
                Best
              </span>
            </button>

            {/* 2. Paste Data */}
            <button
              type="button"
              onClick={() => setActiveTab("paste")}
              className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "paste"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
              }`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span>Paste Data</span>
            </button>

            {/* 3. Sections */}
            <button
              type="button"
              onClick={() => setActiveTab("sections")}
              className={`px-3.5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "sections"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Sections ({currentSections.length})</span>
            </button>

            {/* 4. Add Section */}
            <button
              type="button"
              onClick={() => setActiveTab("add")}
              className={`px-3 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "add"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Section</span>
            </button>
          </div>

          {/* Right indicator: detected count */}
          {detectedSections.length > 0 && (
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-xl bg-purple-950/80 text-purple-300 border border-purple-800/60 shrink-0">
              {uniqueCoursesCount} Courses • {detectedSections.length} Sections
            </span>
          )}
        </div>

        {/* ===================================================================== */}
        {/* TAB 1: UPLOAD HTML FILE (PROMINENT DRAG & DROP + LIVE DETECTION)     */}
        {/* ===================================================================== */}
        {activeTab === "html" && (
          <div className="flex-1 overflow-hidden flex flex-col md:grid md:grid-cols-2 p-3 sm:p-5 gap-4">
            {/* Left: Drag and Drop Upload Area */}
            <div className="flex-1 flex flex-col min-h-0 bg-slate-900/60 rounded-2xl border border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-indigo-400" />
                  <span>Upload UMS .html Webpage File</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-bold">
                  Recommended
                </span>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files?.[0]) {
                    void handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => htmlFileInputRef.current?.click()}
                className={`flex-1 min-h-[220px] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-6 text-center cursor-pointer group ${
                  isDragging
                    ? "border-indigo-400 bg-indigo-500/15 scale-[1.01]"
                    : "border-slate-700/80 hover:border-indigo-500/70 bg-gradient-to-b from-slate-950/80 to-[#070b14]"
                }`}
              >
                <input
                  ref={htmlFileInputRef}
                  type="file"
                  accept=".html,.htm,.txt"
                  onChange={(e) => {
                    if (e.target.files?.[0]) void handleFileUpload(e.target.files[0]);
                  }}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-7 h-7" />
                </div>

                <h4 className="font-extrabold text-sm text-white mb-1">
                  Drag &amp; Drop your UMS .html file here
                </h4>
                <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-4">
                  ব্রাউজারে UMS অ্যাডভাইজিং পেজটি <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">Ctrl + S</kbd> চেপে HTML ফরম্যাটে সেভ করে এখানে ড্রপ করুন।
                </p>

                <button
                  type="button"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/30 transition-all flex items-center gap-2 group-hover:scale-105 pointer-events-none"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Browse .html File</span>
                </button>
              </div>

              {/* Uploaded File Info Card (if loaded) */}
              {uploadedFileName && (
                <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/40 flex items-center justify-between gap-3 text-xs animate-in fade-in">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{uploadedFileName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {(uploadedFileSize / 1024).toFixed(1)} KB • Extracted {detectedSections.length} sections
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedFileName("");
                      setRawInput("");
                    }}
                    className="text-[11px] font-mono text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              )}

              {/* Instructions Callout */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed space-y-1">
                <p className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>কেন HTML ফাইল আপলোড সেরা?</span>
                </p>
                <p>
                  UMS থেকে সরাসরি সেভ করা HTML ফাইলে সব কোর্সের নাম, সেকশন নম্বর, সম্পূর্ণ শিক্ষকের নাম, রুম নম্বর ও ক্লাসের সময় ১০০% অবিকৃতভাবে স্বয়ংক্রিয়ভাবে ডিটেক্ট হয়।
                </p>
              </div>
            </div>

            {/* Right: Live Detected Sections Preview */}
            <div className="flex-1 flex flex-col min-h-0 bg-slate-900/60 rounded-2xl border border-slate-800 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-200">Detected Courses &amp; Sections</span>
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
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded font-mono font-black text-xs bg-purple-900/50 text-purple-300 border border-purple-700/60">
                          {sec.courseCode}.{sec.sectionNumber}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">
                          {sec.credits} Cr
                        </span>
                      </div>
                      <div className="font-bold text-slate-100 text-xs sm:text-sm">
                        {sec.courseTitle}
                      </div>
                      <div className="text-[11px] text-slate-300 flex items-center gap-1">
                        <User className="w-3 h-3 text-blue-400 shrink-0" />
                        <span>[{sec.facultyInitial}] {sec.facultyName}</span>
                      </div>
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
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <FileCode className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-200">No Sections Detected Yet</h4>
                      <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                        Upload your UMS .html file on the left to extract sections automatically in real time.
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
        {/* TAB 2: PASTE DATA (SPLIT RAW INPUT & LIVE DETECTED)                  */}
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
                  {rawInput.length > 0 ? `${rawInput.length.toLocaleString()} chars` : "Paste or drag text"}
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
                    ref={pasteFileInputRef}
                    type="file"
                    accept=".html,.htm,.txt"
                    onChange={(e) => {
                      if (e.target.files?.[0]) void handleFileUpload(e.target.files[0]);
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => pasteFileInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3 text-blue-400" />
                    <span>Upload File</span>
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
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded font-mono font-black text-xs bg-purple-900/50 text-purple-300 border border-purple-700/60">
                          {sec.courseCode}.{sec.sectionNumber}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">
                          {sec.credits} Cr
                        </span>
                      </div>
                      <div className="font-bold text-slate-100 text-xs sm:text-sm">
                        {sec.courseTitle}
                      </div>
                      <div className="text-[11px] text-slate-300 flex items-center gap-1">
                        <User className="w-3 h-3 text-blue-400 shrink-0" />
                        <span>[{sec.facultyInitial}] {sec.facultyName}</span>
                      </div>
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
        {/* TAB 3: SECTIONS (INSPECT ACTIVE CATALOG - CLEAN & NO DELETE BUTTON)    */}
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
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 text-xs hover:border-slate-700 transition-all"
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

                    {/* Non-destructive clean badge: NO TRASH OR DELETE BUTTON */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-1 rounded-lg font-mono font-bold text-[10px] bg-slate-800/80 text-emerald-400 border border-slate-700/60 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Offered</span>
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <p className="text-xs">No sections available in this catalog.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 4: ADD SECTION (MANUAL ENTRY FOR SESSION)                        */}
        {/* ===================================================================== */}
        {activeTab === "add" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <form onSubmit={handleAddManualSection} className="max-w-xl mx-auto space-y-4 text-xs">
              <h4 className="font-bold text-sm text-white mb-2">Manually Add Section to Active Session</h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Course Code *</label>
                  <input
                    type="text"
                    required
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="e.g. CSE181"
                    className="w-full bg-[#070b14] border border-slate-800 rounded-lg p-2 text-xs text-white"
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
                    className="w-full bg-[#070b14] border border-slate-800 rounded-lg p-2 text-xs text-white"
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
                  className="w-full bg-[#070b14] border border-slate-800 rounded-lg p-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Credits</label>
                  <input
                    type="number"
                    step="0.5"
                    value={manualCredits}
                    onChange={(e) => setManualCredits(parseFloat(e.target.value) || 3.0)}
                    className="w-full bg-[#070b14] border border-slate-800 rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Faculty Initial</label>
                  <input
                    type="text"
                    value={manualFacInit}
                    onChange={(e) => setManualFacInit(e.target.value)}
                    placeholder="e.g. FUZ"
                    className="w-full bg-[#070b14] border border-slate-800 rounded-lg p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Faculty Name</label>
                  <input
                    type="text"
                    value={manualFacName}
                    onChange={(e) => setManualFacName(e.target.value)}
                    placeholder="e.g. Farhad Uz Zaman"
                    className="w-full bg-[#070b14] border border-slate-800 rounded-lg p-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Slot 1 */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <span className="font-bold text-slate-200 block text-[11px]">Class Slot 1</span>
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
                    type="time"
                    value={manualStart1}
                    onChange={(e) => setManualStart1(e.target.value)}
                    className="bg-[#070b14] border border-slate-800 rounded-lg p-2 text-xs text-white"
                  />
                  <input
                    type="time"
                    value={manualEnd1}
                    onChange={(e) => setManualEnd1(e.target.value)}
                    className="bg-[#070b14] border border-slate-800 rounded-lg p-2 text-xs text-white"
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

              {/* Toggle Slot 2 */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasSlot2"
                  checked={hasSlot2}
                  onChange={(e) => setHasSlot2(e.target.checked)}
                  className="rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="hasSlot2" className="text-slate-300 font-bold">Has Second Day Slot (e.g. TUE)</label>
              </div>

              {hasSlot2 && (
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <span className="font-bold text-slate-200 block text-[11px]">Class Slot 2</span>
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
                      type="time"
                      value={manualStart2}
                      onChange={(e) => setManualStart2(e.target.value)}
                      className="bg-[#070b14] border border-slate-800 rounded-lg p-2 text-xs text-white"
                    />
                    <input
                      type="time"
                      value={manualEnd2}
                      onChange={(e) => setManualEnd2(e.target.value)}
                      className="bg-[#070b14] border border-slate-800 rounded-lg p-2 text-xs text-white"
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
                + Add Section to Session Catalog
              </button>
            </form>
          </div>
        )}

        {/* ===================================================================== */}
        {/* BOTTOM ACTION BAR (SESSION SANDBOX CALLOUT & APPLY BUTTON)            */}
        {/* ===================================================================== */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-slate-800 bg-slate-950/80 text-xs gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-slate-400 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Private Session Sandbox • Changes calculate conflict-free routines without modifying backend</span>
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={handleApplyToSession}
              disabled={detectedSections.length === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs sm:text-sm font-extrabold transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-40"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>
                Apply to Routine Tool ({detectedSections.length > 0 ? detectedSections.length : 0})
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
