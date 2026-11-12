"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Download,
  FileDown,
  Printer,
  Upload,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Sparkles,
  RotateCcw,
  FileJson,
  User,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Maximize2,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import ResumeSheetRenderer from "./ResumeSheetRenderer";
import {
  DEFAULT_DESIGN_CONFIG,
  RESUME_ACCENT_COLORS,
  RESUME_TEMPLATE_META,
  ResumeData,
  ResumeDesignConfig,
  ResumeSectionKey,
  SECTION_LABELS,
  SUMMARY_PRESETS,
  createEmptyResume,
  createSampleStudentResume,
} from "@/lib/resumeTypes";
import {
  generateResumePdfBlob,
  generateResumeDocxBlob,
  printResumeSheet,
} from "@/lib/resumeExport";

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

interface ResumeMakerToolProps {
  language?: "en" | "bn";
}

type EditorTabId =
  | "personal"
  | "summary"
  | "education"
  | "skills"
  | "projects"
  | "experience"
  | "awards"
  | "languages"
  | "references"
  | "layout";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Merge partial JSON or draft data with safe array/design defaults. */
function normalizeResumeDraft(
  parsed: { data?: Partial<ResumeData>; design?: Partial<ResumeDesignConfig> } | null | undefined
): { data?: ResumeData; design?: ResumeDesignConfig } {
  if (!parsed || typeof parsed !== "object") return {};
  const result: { data?: ResumeData; design?: ResumeDesignConfig } = {};
  if (parsed.data && typeof parsed.data === "object") {
    const empty = createEmptyResume();
    const d = parsed.data;
    result.data = {
      ...empty,
      ...d,
      education: Array.isArray(d.education) ? d.education : [],
      skills: Array.isArray(d.skills) ? d.skills : [],
      projects: Array.isArray(d.projects) ? d.projects : [],
      experience: Array.isArray(d.experience) ? d.experience : [],
      achievements: Array.isArray(d.achievements) ? d.achievements : [],
      certifications: Array.isArray(d.certifications) ? d.certifications : [],
      languages: Array.isArray(d.languages) ? d.languages : [],
      references: Array.isArray(d.references) ? d.references : [],
    };
  }
  if (parsed.design && typeof parsed.design === "object") {
    const cfg = parsed.design;
    result.design = {
      ...DEFAULT_DESIGN_CONFIG,
      ...cfg,
      sectionOrder:
        Array.isArray(cfg.sectionOrder) && cfg.sectionOrder.length > 0
          ? cfg.sectionOrder
          : [...DEFAULT_DESIGN_CONFIG.sectionOrder],
      hiddenSections: Array.isArray(cfg.hiddenSections) ? cfg.hiddenSections : [],
    };
  }
  return result;
}

export default function ResumeMakerTool({ language = "en" }: ResumeMakerToolProps) {
  const bn = language === "bn";

  const [data, setData] = useState<ResumeData>(() => createSampleStudentResume());
  const [design, setDesign] = useState<ResumeDesignConfig>(() => ({
    ...DEFAULT_DESIGN_CONFIG,
    sectionOrder: [...DEFAULT_DESIGN_CONFIG.sectionOrder],
  }));
  const [activeEditorTab, setActiveEditorTab] = useState<EditorTabId>("personal");
  const [isExporting, setIsExporting] = useState<"pdf" | "docx" | null>(null);

  // Live A4 container fit scale & 1-page overflow measurement
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  const [previewScale, setPreviewScale] = useState(0.62);
  const [contentHeightPx, setContentHeightPx] = useState(900);

  // Observe preview container width to scale A4 cleanly on desktop/mobile
  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const availW = entry.contentRect.width - 16;
        if (availW > 100) {
          setPreviewScale(Math.min(0.88, availW / A4_WIDTH_PX));
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Observe internal resume content height to track strict 1-page A4 fit
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContentHeightPx(Math.round(entry.contentRect.height * design.autoFitScale));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [design.autoFitScale, design.template]);

  const fillPercent = Math.round((contentHeightPx / A4_HEIGHT_PX) * 100);
  const isOverflowing = contentHeightPx > A4_HEIGHT_PX + 4;

  const handleAutoFitOnePage = () => {
    if (contentHeightPx <= A4_HEIGHT_PX) {
      setDesign((prev) => ({ ...prev, autoFitScale: 1 }));
      toast.info(bn ? "রেজুমে ইতিমধ্যেই ১ পেজে সুন্দরভাবে ফিট আছে।" : "Resume already fits 1 A4 page.");
      return;
    }
    const nextDensity = "compact";
    const targetScale = Math.max(
      0.8,
      Math.min(1, Number(((A4_HEIGHT_PX - 12) / contentHeightPx * design.autoFitScale).toFixed(2)))
    );
    setDesign((prev) => ({
      ...prev,
      density: nextDensity,
      autoFitScale: targetScale,
    }));
    toast.success(bn ? "১ পেজ A4-এ অটো-ফিট করা হয়েছে!" : "Auto-fitted neatly onto 1 A4 page!");
  };

  // Profile Photo Upload (compressed square thumbnail data URL)
  const handlePhotoSelect = async (file: File) => {
    try {
      const url = URL.createObjectURL(file);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("Invalid image"));
        i.src = url;
      });
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = 360;
      canvas.height = 360;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(
        img,
        (img.naturalWidth - side) / 2,
        (img.naturalHeight - side) / 2,
        side,
        side,
        0,
        0,
        360,
        360
      );
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setData((prev) => ({ ...prev, photoDataUrl: dataUrl }));
      setDesign((prev) => ({ ...prev, showPhoto: true }));
      toast.success(bn ? "প্রোফাইল ছবি আপলোড হয়েছে!" : "Profile photo updated!");
    } catch {
      toast.error(bn ? "ছবিটি পড়া যায়নি।" : "Could not load selected image.");
    }
  };

  // JSON Export & Import
  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify({ data, design }, null, 2)], {
      type: "application/json",
    });
    const safeName = (data.fullName || "Resume").replace(/[^\w-]+/g, "_");
    triggerDownload(blob, `${safeName}_Resume_Backup.json`);
    toast.success(bn ? "JSON ব্যাকআপ ডাউনলোড হয়েছে!" : "Resume JSON backup exported!");
  };

  const handleImportJson = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const normalized = normalizeResumeDraft(parsed);
      if (!normalized.data) throw new Error("Invalid JSON");
      setData(normalized.data);
      if (normalized.design) {
        setDesign(normalized.design);
      }
      toast.success(bn ? "JSON থেকে রেজুমে লোড হয়েছে!" : "Resume imported from JSON!");
    } catch {
      toast.error(bn ? "সঠিক JSON ফাইল নয়।" : "Invalid resume JSON file.");
    }
  };

  const handleDownloadPdf = async () => {
    if (isExporting) return;
    setIsExporting("pdf");
    try {
      const blob = await generateResumePdfBlob(data, design, sheetRef.current);
      const safeName = (data.fullName || "Resume").trim().replace(/[^\w-]+/g, "_");
      triggerDownload(blob, `${safeName}_CV_A4.pdf`);
      toast.success(
        bn
          ? "১-পেজ A4 ATS-ফ্রেন্ডলি PDF ডাউনলোড হয়েছে!"
          : "1-Page A4 ATS PDF downloaded cleanly!"
      );
    } catch (err) {
      console.error("Resume PDF export failed:", err);
      toast.error(bn ? "PDF তৈরি করতে সমস্যা হয়েছে।" : "Failed to generate PDF.");
    } finally {
      setIsExporting(null);
    }
  };

  const handleDownloadDocx = async () => {
    if (isExporting) return;
    setIsExporting("docx");
    try {
      const blob = await generateResumeDocxBlob(data, design);
      const safeName = (data.fullName || "Resume").trim().replace(/[^\w-]+/g, "_");
      triggerDownload(blob, `${safeName}_CV_A4.docx`);
      toast.success(
        bn
          ? "Word (.docx) ফাইল ডাউনলোড হয়েছে!"
          : "Word (.docx) resume downloaded cleanly!"
      );
    } catch (err) {
      console.error("Resume DOCX export failed:", err);
      toast.error(bn ? "DOCX তৈরি করতে সমস্যা হয়েছে।" : "Failed to generate DOCX.");
    } finally {
      setIsExporting(null);
    }
  };

  const moveSectionOrder = (idx: number, dir: -1 | 1) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= design.sectionOrder.length) return;
    setDesign((prev) => {
      const next = [...prev.sectionOrder];
      const [item] = next.splice(idx, 1);
      next.splice(nextIdx, 0, item);
      return { ...prev, sectionOrder: next };
    });
  };

  const toggleSectionVisibility = (key: ResumeSectionKey) => {
    setDesign((prev) => {
      const exists = prev.hiddenSections.includes(key);
      return {
        ...prev,
        hiddenSections: exists
          ? prev.hiddenSections.filter((k) => k !== key)
          : [...prev.hiddenSections, key],
      };
    });
  };

  const editorTabs: { id: EditorTabId; labelEn: string; labelBn: string }[] = [
    { id: "personal", labelEn: "Personal & Photo", labelBn: "ব্যক্তিগত ও ছবি" },
    { id: "summary", labelEn: "Summary", labelBn: "সামারি" },
    { id: "education", labelEn: "Education", labelBn: "শিক্ষা" },
    { id: "skills", labelEn: "Skills", labelBn: "দক্ষতা" },
    { id: "projects", labelEn: "Projects", labelBn: "প্রজেক্ট" },
    { id: "experience", labelEn: "Experience", labelBn: "অভিজ্ঞতা" },
    { id: "awards", labelEn: "Awards & Certs", labelBn: "অর্জন ও সার্টি" },
    { id: "languages", labelEn: "Languages", labelBn: "ভাষা" },
    { id: "references", labelEn: "References", labelBn: "রেফারেন্স" },
    { id: "layout", labelEn: "Section Order", labelBn: "সেকশন সাজান" },
  ];

  return (
    <div className="space-y-6">
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handlePhotoSelect(f);
          e.target.value = "";
        }}
      />
      <input
        ref={jsonInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImportJson(f);
          e.target.value = "";
        }}
      />

      {/* Top Controls & Template Switcher Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono font-black px-2.5 py-0.5 rounded-full bg-blue-600 text-white uppercase tracking-wider">
                ONE-PAGE A4 CV BUILDER
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                LaTeX ATS • Germany • Europe • Modern
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {bn ? "প্রফেশনাল ১-পেজ A4 রেজুমে মেকার" : "Professional One-Page A4 Resume / CV Maker"}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setData(createSampleStudentResume());
                toast.success(bn ? "স্যাম্পল স্টুডেন্ট CV লোড হয়েছে!" : "Sample SEU student CV loaded!");
              }}
              className="px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {bn ? "স্যাম্পল ডেটা" : "Sample CV"}
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <FileJson className="w-3.5 h-3.5" />
              {bn ? "JSON সেভ" : "Export JSON"}
            </button>

            <button
              type="button"
              onClick={() => jsonInputRef.current?.click()}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              {bn ? "JSON ইমপোর্ট" : "Import JSON"}
            </button>

            <button
              type="button"
              onClick={() => {
                setData(createEmptyResume());
                toast.info(bn ? "নতুন খালি ফর্ম চালু হয়েছে।" : "Cleared form to start fresh.");
              }}
              className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {bn ? "রিসেট" : "Clear"}
            </button>
          </div>
        </div>

        {/* Template Selector Strip (5 Templates including Germany & Europe) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {RESUME_TEMPLATE_META.map((tpl) => {
            const active = design.template === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() =>
                  setDesign((prev) => ({
                    ...prev,
                    template: tpl.id,
                    font: tpl.id === "latex-ats" ? "serif" : "sans",
                    autoFitScale: 1,
                  }))
                }
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer space-y-1 ${
                  active
                    ? "border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-600/20"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-blue-400"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-blue-600 text-white">
                    {tpl.tag}
                  </span>
                </div>
                <div className="text-xs font-black text-slate-900 dark:text-white pt-0.5">
                  {bn ? tpl.nameBn : tpl.nameEn}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                  {bn ? tpl.descBn : tpl.descEn}
                </p>
              </button>
            );
          })}
        </div>

        {/* Quick Style Toggles Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/70 dark:border-slate-800">
          {/* Accent Colors */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {bn ? "থিম কালার:" : "Accent:"}
            </span>
            {RESUME_ACCENT_COLORS.map((col) => (
              <button
                key={col.hex}
                type="button"
                title={col.name}
                onClick={() => setDesign((prev) => ({ ...prev, accentColor: col.hex }))}
                style={{ backgroundColor: col.hex }}
                className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${
                  design.accentColor === col.hex
                    ? "ring-2 ring-offset-2 ring-blue-500 scale-110"
                    : "hover:scale-105 opacity-85"
                }`}
              />
            ))}
          </div>

          {/* Font, Density & Photo/CGPA toggles */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setDesign((prev) => ({
                  ...prev,
                  font: prev.font === "serif" ? "sans" : "serif",
                }))
              }
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              {design.font === "serif" ? "Font: Serif (LaTeX)" : "Font: Clean Sans"}
            </button>

            <button
              type="button"
              onClick={() =>
                setDesign((prev) => ({
                  ...prev,
                  density: prev.density === "compact" ? "normal" : "compact",
                  autoFitScale: 1,
                }))
              }
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              {design.density === "compact"
                ? bn
                  ? "স্পেসিং: কমপ্যাক্ট"
                  : "Spacing: Compact"
                : bn
                ? "স্পেসিং: নরমাল"
                : "Spacing: Normal"}
            </button>

            <button
              type="button"
              onClick={() => setDesign((prev) => ({ ...prev, showPhoto: !prev.showPhoto }))}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold cursor-pointer inline-flex items-center gap-1 ${
                design.showPhoto
                  ? "border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              {design.showPhoto ? (bn ? "ছবি: চালু" : "Photo: On") : bn ? "ছবি: বন্ধ" : "Photo: Off"}
            </button>

            <button
              type="button"
              onClick={() => setDesign((prev) => ({ ...prev, showCgpa: !prev.showCgpa }))}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold cursor-pointer ${
                design.showCgpa
                  ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500"
              }`}
            >
              {design.showCgpa ? "CGPA: Show" : "CGPA: Hide"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Split-Screen Workspace: Left Form Editor (5 cols) | Right Live 1-Page A4 Preview & Export (7 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Structured Content Editor */}
        <div className="xl:col-span-5 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Section Navigation Pills */}
          <div className="p-3 border-b border-slate-200/70 dark:border-slate-800 flex flex-wrap gap-1.5 bg-slate-50/70 dark:bg-slate-950/50">
            {editorTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveEditorTab(tab.id)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-all ${
                  activeEditorTab === tab.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-blue-400"
                }`}
              >
                {bn ? tab.labelBn : tab.labelEn}
              </button>
            ))}
          </div>

          {/* Active Editor Form Body */}
          <div className="p-5 space-y-4 max-h-[820px] overflow-y-auto">
            {/* 1. PERSONAL & PHOTO */}
            {activeEditorTab === "personal" && (
              <div className="space-y-4">
                {/* Photo Upload Row */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                      {data.photoDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={data.photoDataUrl}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {bn ? "প্রোফাইল ছবি (Germany/Europe/Modern)" : "Profile Photo (Germany / Europe / Modern)"}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {bn ? "LaTeX ATS স্টাইলে স্বয়ংক্রিয়ভাবে ছবি বাদ থাকে।" : "Cleanly cropped for sidebar/Germany/Europe CV."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                    >
                      {bn ? "আপলোড" : "Upload"}
                    </button>
                    {data.photoDataUrl && (
                      <button
                        type="button"
                        onClick={() => setData((p) => ({ ...p, photoDataUrl: "" }))}
                        className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      {bn ? "পূর্ণ নাম *" : "Full Name *"}
                    </label>
                    <input
                      type="text"
                      value={data.fullName}
                      onChange={(e) => setData((p) => ({ ...p, fullName: e.target.value }))}
                      placeholder="e.g. Md. Fazle Rabbi"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      {bn ? "টার্গেট রোল / সাবটাইটেল" : "Target Role / Headline"}
                    </label>
                    <input
                      type="text"
                      value={data.headline}
                      onChange={(e) => setData((p) => ({ ...p, headline: e.target.value }))}
                      placeholder="Software Engineering Intern • Competitive Programmer"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Phone</label>
                    <input
                      type="text"
                      value={data.phone}
                      onChange={(e) => setData((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+880 17XX-XXXXXX"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Email</label>
                    <input
                      type="email"
                      value={data.email}
                      onChange={(e) => setData((p) => ({ ...p, email: e.target.value }))}
                      placeholder="you@seu.edu.bd"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      {bn ? "ঠিকানা" : "Address / City"}
                    </label>
                    <input
                      type="text"
                      value={data.address}
                      onChange={(e) => setData((p) => ({ ...p, address: e.target.value }))}
                      placeholder="Dhaka-1208, Bangladesh"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">LinkedIn</label>
                    <input
                      type="text"
                      value={data.linkedin}
                      onChange={(e) => setData((p) => ({ ...p, linkedin: e.target.value }))}
                      placeholder="linkedin.com/in/username"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">GitHub</label>
                    <input
                      type="text"
                      value={data.github}
                      onChange={(e) => setData((p) => ({ ...p, github: e.target.value }))}
                      placeholder="github.com/username"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Portfolio</label>
                    <input
                      type="text"
                      value={data.portfolio}
                      onChange={(e) => setData((p) => ({ ...p, portfolio: e.target.value }))}
                      placeholder="portfolio.vercel.app"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      Codeforces / LeetCode
                    </label>
                    <input
                      type="text"
                      value={data.competitiveProfile}
                      onChange={(e) => setData((p) => ({ ...p, competitiveProfile: e.target.value }))}
                      placeholder="codeforces.com/profile/handle"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Germany & Europe Specific Fields */}
                <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-blue-700 dark:text-blue-300">
                      {bn ? "Germany / Europe CV তথ্য (ঐচ্ছিক)" : "Germany / Europe CV Details"}
                    </span>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={design.showGermanSignature}
                        onChange={(e) =>
                          setDesign((p) => ({ ...p, showGermanSignature: e.target.checked }))
                        }
                      />
                      {bn ? "স্বাক্ষর লাইন" : "Signature Footer"}
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Date of Birth</label>
                      <input
                        type="text"
                        value={data.dateOfBirth}
                        onChange={(e) => setData((p) => ({ ...p, dateOfBirth: e.target.value }))}
                        placeholder="14 May 2002"
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Nationality</label>
                      <input
                        type="text"
                        value={data.nationality}
                        onChange={(e) => setData((p) => ({ ...p, nationality: e.target.value }))}
                        placeholder="Bangladeshi"
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">
                        German Signature Place & Date
                      </label>
                      <input
                        type="text"
                        value={data.signaturePlaceDate}
                        onChange={(e) => setData((p) => ({ ...p, signaturePlaceDate: e.target.value }))}
                        placeholder="Dhaka, 12 November 2026"
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. SUMMARY */}
            {activeEditorTab === "summary" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                    {bn ? "রেডিমেড প্রিসেট (১ ক্লিকে বসান):" : "Quick Student Summary Presets:"}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {SUMMARY_PRESETS.map((pr, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setData((d) => ({ ...d, summary: pr.text }))}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-[11px] font-bold border border-blue-200 dark:border-blue-800/50 cursor-pointer"
                      >
                        + {bn ? pr.labelBn : pr.labelEn}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={6}
                  value={data.summary}
                  onChange={(e) => setData((p) => ({ ...p, summary: e.target.value }))}
                  placeholder={bn ? "আপনার সংক্ষিপ্ত পরিচিতি লিখুন..." : "Write a concise 2-3 sentence summary..."}
                  className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs leading-relaxed text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>
            )}

            {/* 3. EDUCATION */}
            {activeEditorTab === "education" && (
              <div className="space-y-3">
                {data.education.map((edu, idx) => (
                  <div key={edu.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                        Education #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setData((p) => ({
                            ...p,
                            education: p.education.filter((x) => x.id !== edu.id),
                          }))
                        }
                        className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={edu.institution}
                      onChange={(e) =>
                        setData((p) => ({
                          ...p,
                          education: p.education.map((x) =>
                            x.id === edu.id ? { ...x, institution: e.target.value } : x
                          ),
                        }))
                      }
                      placeholder="Southeast University"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                    <input
                      type="text"
                      value={edu.degree}
                      onChange={(e) =>
                        setData((p) => ({
                          ...p,
                          education: p.education.map((x) =>
                            x.id === edu.id ? { ...x, degree: e.target.value } : x
                          ),
                        }))
                      }
                      placeholder="B.Sc. in Computer Science and Engineering (CSE)"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={edu.period}
                        onChange={(e) =>
                          setData((p) => ({
                            ...p,
                            education: p.education.map((x) =>
                              x.id === edu.id ? { ...x, period: e.target.value } : x
                            ),
                          }))
                        }
                        placeholder="2023 – 2027 (Expected)"
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      />
                      <input
                        type="text"
                        value={edu.cgpa}
                        onChange={(e) =>
                          setData((p) => ({
                            ...p,
                            education: p.education.map((x) =>
                              x.id === edu.id ? { ...x, cgpa: e.target.value } : x
                            ),
                          }))
                        }
                        placeholder="CGPA (e.g. 3.85 / 4.00)"
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setData((p) => ({
                      ...p,
                      education: [
                        ...p.education,
                        {
                          id: `edu-${Date.now()}`,
                          institution: "Southeast University",
                          degree: "",
                          period: "",
                          cgpa: "",
                          location: "Dhaka, Bangladesh",
                        },
                      ],
                    }))
                  }
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 text-xs font-bold text-blue-600 dark:text-blue-400 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  {bn ? "নতুন শিক্ষাগত যোগ্যতা যোগ করুন" : "Add Education"}
                </button>
              </div>
            )}

            {/* 4. SKILLS */}
            {activeEditorTab === "skills" && (
              <div className="space-y-3">
                {data.skills.map((sk) => (
                  <div key={sk.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={sk.category}
                        onChange={(e) =>
                          setData((p) => ({
                            ...p,
                            skills: p.skills.map((x) =>
                              x.id === sk.id ? { ...x, category: e.target.value } : x
                            ),
                          }))
                        }
                        placeholder="Category (e.g. Programming)"
                        className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setData((p) => ({
                            ...p,
                            skills: p.skills.filter((x) => x.id !== sk.id),
                          }))
                        }
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={sk.items}
                      onChange={(e) =>
                        setData((p) => ({
                          ...p,
                          skills: p.skills.map((x) =>
                            x.id === sk.id ? { ...x, items: e.target.value } : x
                          ),
                        }))
                      }
                      placeholder="C, C++, Java, Python, React, SQL"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setData((p) => ({
                      ...p,
                      skills: [
                        ...p.skills,
                        { id: `sk-${Date.now()}`, category: "", items: "" },
                      ],
                    }))
                  }
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 text-xs font-bold text-blue-600 dark:text-blue-400 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  {bn ? "নতুন স্কিল গ্রুপ যোগ করুন" : "Add Skill Category"}
                </button>
              </div>
            )}

            {/* 5. PROJECTS */}
            {activeEditorTab === "projects" && (
              <div className="space-y-3">
                {data.projects.map((pr, idx) => (
                  <div key={pr.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                        Project #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setData((p) => ({
                            ...p,
                            projects: p.projects.filter((x) => x.id !== pr.id),
                          }))
                        }
                        className="p-1 text-rose-500 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={pr.name}
                      onChange={(e) =>
                        setData((p) => ({
                          ...p,
                          projects: p.projects.map((x) =>
                            x.id === pr.id ? { ...x, name: e.target.value } : x
                          ),
                        }))
                      }
                      placeholder="Project Name"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={pr.techStack}
                        onChange={(e) =>
                          setData((p) => ({
                            ...p,
                            projects: p.projects.map((x) =>
                              x.id === pr.id ? { ...x, techStack: e.target.value } : x
                            ),
                          }))
                        }
                        placeholder="Tech Stack (e.g. React, Java)"
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      />
                      <input
                        type="text"
                        value={pr.link}
                        onChange={(e) =>
                          setData((p) => ({
                            ...p,
                            projects: p.projects.map((x) =>
                              x.id === pr.id ? { ...x, link: e.target.value } : x
                            ),
                          }))
                        }
                        placeholder="GitHub / Live Link"
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      />
                    </div>
                    <textarea
                      rows={2}
                      value={pr.description}
                      onChange={(e) =>
                        setData((p) => ({
                          ...p,
                          projects: p.projects.map((x) =>
                            x.id === pr.id ? { ...x, description: e.target.value } : x
                          ),
                        }))
                      }
                      placeholder="Concise 1-line summary of what you built & impact..."
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setData((p) => ({
                      ...p,
                      projects: [
                        ...p.projects,
                        { id: `pr-${Date.now()}`, name: "", techStack: "", link: "", description: "" },
                      ],
                    }))
                  }
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 text-xs font-bold text-blue-600 dark:text-blue-400 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  {bn ? "নতুন প্রজেক্ট যোগ করুন" : "Add Project"}
                </button>
              </div>
            )}

            {/* 6. EXPERIENCE */}
            {activeEditorTab === "experience" && (
              <div className="space-y-3">
                {data.experience.map((exp, idx) => (
                  <div key={exp.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                        Experience #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setData((p) => ({
                            ...p,
                            experience: p.experience.filter((x) => x.id !== exp.id),
                          }))
                        }
                        className="p-1 text-rose-500 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={exp.role}
                        onChange={(e) =>
                          setData((p) => ({
                            ...p,
                            experience: p.experience.map((x) =>
                              x.id === exp.id ? { ...x, role: e.target.value } : x
                            ),
                          }))
                        }
                        placeholder="Role / Title"
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                      />
                      <input
                        type="text"
                        value={exp.period}
                        onChange={(e) =>
                          setData((p) => ({
                            ...p,
                            experience: p.experience.map((x) =>
                              x.id === exp.id ? { ...x, period: e.target.value } : x
                            ),
                          }))
                        }
                        placeholder="Jan 2024 – Present"
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      />
                    </div>
                    <input
                      type="text"
                      value={exp.organization}
                      onChange={(e) =>
                        setData((p) => ({
                          ...p,
                          experience: p.experience.map((x) =>
                            x.id === exp.id ? { ...x, organization: e.target.value } : x
                          ),
                        }))
                      }
                      placeholder="Organization / Club / Company"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                    <textarea
                      rows={3}
                      value={exp.bullets.join("\n")}
                      onChange={(e) =>
                        setData((p) => ({
                          ...p,
                          experience: p.experience.map((x) =>
                            x.id === exp.id
                              ? { ...x, bullets: e.target.value.split("\n") }
                              : x
                          ),
                        }))
                      }
                      placeholder="One bullet point per line..."
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setData((p) => ({
                      ...p,
                      experience: [
                        ...p.experience,
                        { id: `exp-${Date.now()}`, role: "", organization: "", period: "", bullets: [""] },
                      ],
                    }))
                  }
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 text-xs font-bold text-blue-600 dark:text-blue-400 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  {bn ? "নতুন অভিজ্ঞতা / ক্লাব যোগ করুন" : "Add Experience / Activity"}
                </button>
              </div>
            )}

            {/* 7. ACHIEVEMENTS & CERTIFICATIONS */}
            {activeEditorTab === "awards" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">
                    {bn ? "অর্জন ও পুরস্কার (প্রতি লাইনে একটি)" : "Achievements & Awards (one per line)"}
                  </label>
                  <textarea
                    rows={4}
                    value={data.achievements.join("\n")}
                    onChange={(e) =>
                      setData((p) => ({ ...p, achievements: e.target.value.split("\n") }))
                    }
                    placeholder="Honorable Mention — ICPC Asia Dhaka Preliminary 2024"
                    className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">
                    {bn ? "সার্টিফিকেশন (প্রতি লাইনে একটি)" : "Certifications (one per line)"}
                  </label>
                  <textarea
                    rows={5}
                    value={data.certifications.join("\n")}
                    onChange={(e) =>
                      setData((p) => ({ ...p, certifications: e.target.value.split("\n") }))
                    }
                    placeholder="CS50x Introduction to Computer Science — HarvardX"
                    className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                  />
                </div>
              </div>
            )}

            {/* 8. LANGUAGES */}
            {activeEditorTab === "languages" && (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-500">
                  {bn
                    ? "ইউরোপ ও জার্মান CV-তে CEFR লেভেল (যেমন Native C2, Fluent C1, Basic A2) খুবই গুরুত্বপূর্ণ।"
                    : "CEFR levels (e.g. Native C2, Fluent C1, Basic A2) are recommended for Germany & Europe CVs."}
                </p>
                {data.languages.map((lang) => (
                  <div key={lang.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={lang.name}
                      onChange={(e) =>
                        setData((p) => ({
                          ...p,
                          languages: p.languages.map((x) =>
                            x.id === lang.id ? { ...x, name: e.target.value } : x
                          ),
                        }))
                      }
                      placeholder="Language (e.g. English)"
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                    />
                    <input
                      type="text"
                      value={lang.proficiency}
                      onChange={(e) =>
                        setData((p) => ({
                          ...p,
                          languages: p.languages.map((x) =>
                            x.id === lang.id ? { ...x, proficiency: e.target.value } : x
                          ),
                        }))
                      }
                      placeholder="Fluent (C1)"
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setData((p) => ({
                          ...p,
                          languages: p.languages.filter((x) => x.id !== lang.id),
                        }))
                      }
                      className="p-1.5 text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setData((p) => ({
                      ...p,
                      languages: [
                        ...p.languages,
                        { id: `lang-${Date.now()}`, name: "", proficiency: "" },
                      ],
                    }))
                  }
                  className="w-full py-2 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 text-xs font-bold text-blue-600 dark:text-blue-400 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  {bn ? "নতুন ভাষা যোগ করুন" : "Add Language"}
                </button>
              </div>
            )}

            {/* 9. REFERENCES */}
            {activeEditorTab === "references" && (
              <div className="space-y-3">
                <label className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 cursor-pointer">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {bn
                      ? `"Available upon request" দেখান (নাম ছাড়া)`
                      : `Show "Available upon request"`}
                  </span>
                  <input
                    type="checkbox"
                    checked={data.referencesOnRequest}
                    onChange={(e) =>
                      setData((p) => ({ ...p, referencesOnRequest: e.target.checked }))
                    }
                  />
                </label>

                {!data.referencesOnRequest && (
                  <>
                    {data.references.length === 0 && (
                      <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 space-y-2.5 text-center">
                        <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                          {bn
                            ? "কোনো রেফারেন্স নেই — নতুন রেফারেন্স যোগ করুন অথবা 'Available upon request' চালু করুন।"
                            : "No references added yet. Add a reference or turn on \"Available upon request\" to display this section."}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setData((p) => ({
                                ...p,
                                references: [...createSampleStudentResume().references],
                              }))
                            }
                            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <RotateCcw className="w-3 h-3" />
                            {bn ? "ডিফল্ট রেফারেন্স ফেরান" : "Restore Sample References"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setData((p) => ({ ...p, referencesOnRequest: true }))
                            }
                            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold cursor-pointer transition-all"
                          >
                            {bn ? `"Available upon request" চালু করুন` : `Use "Available upon request"`}
                          </button>
                        </div>
                      </div>
                    )}

                    {data.references.map((ref, idx) => (
                      <div key={ref.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                            Reference #{idx + 1}
                          </span>
                          <button
                            type="button"
                            title={bn ? "রেফারেন্স মুছুন" : "Delete reference"}
                            onClick={() => {
                              const removed = ref;
                              const removedIndex = idx;
                              setData((p) => ({
                                ...p,
                                references: p.references.filter((x) => x.id !== ref.id),
                              }));
                              toast.info(
                                bn
                                  ? `রেফারেন্স "${removed.name || `#${removedIndex + 1}`}" মুছে ফেলা হয়েছে`
                                  : `Removed reference "${removed.name || `#${removedIndex + 1}`}"`,
                                {
                                  action: {
                                    label: bn ? "ফিরিয়ে আনুন" : "Undo",
                                    onClick: () =>
                                      setData((p) => {
                                        if (p.references.some((x) => x.id === removed.id)) return p;
                                        const next = [...p.references];
                                        next.splice(Math.min(removedIndex, next.length), 0, removed);
                                        return { ...p, references: next };
                                      }),
                                  },
                                }
                              );
                            }}
                            className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={ref.name}
                          onChange={(e) =>
                            setData((p) => ({
                              ...p,
                              references: p.references.map((x) =>
                                x.id === ref.id ? { ...x, name: e.target.value } : x
                              ),
                            }))
                          }
                          placeholder="Full Name (e.g. Md. Mijanur Rahman)"
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={ref.title}
                            onChange={(e) =>
                              setData((p) => ({
                                ...p,
                                references: p.references.map((x) =>
                                  x.id === ref.id ? { ...x, title: e.target.value } : x
                                ),
                              }))
                            }
                            placeholder="Title (e.g. Assistant Professor)"
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                          />
                          <input
                            type="text"
                            value={ref.organization}
                            onChange={(e) =>
                              setData((p) => ({
                                ...p,
                                references: p.references.map((x) =>
                                  x.id === ref.id ? { ...x, organization: e.target.value } : x
                                ),
                              }))
                            }
                            placeholder="Southeast University"
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                          />
                          <input
                            type="text"
                            value={ref.phone}
                            onChange={(e) =>
                              setData((p) => ({
                                ...p,
                                references: p.references.map((x) =>
                                  x.id === ref.id ? { ...x, phone: e.target.value } : x
                                ),
                              }))
                            }
                            placeholder="Phone"
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                          />
                          <input
                            type="text"
                            value={ref.email}
                            onChange={(e) =>
                              setData((p) => ({
                                ...p,
                                references: p.references.map((x) =>
                                  x.id === ref.id ? { ...x, email: e.target.value } : x
                                ),
                              }))
                            }
                            placeholder="Email"
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                          />
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setData((p) => ({
                            ...p,
                            references: [
                              ...p.references,
                              {
                                id: `ref-${Date.now()}`,
                                name: "",
                                title: "",
                                organization: "",
                                phone: "",
                                email: "",
                              },
                            ],
                          }))
                        }
                        className="flex-1 py-2.5 px-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 text-xs font-bold text-blue-600 dark:text-blue-400 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        {bn ? "নতুন রেফারেন্স যোগ করুন" : "Add Reference"}
                      </button>

                      {data.references.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            setData((p) => ({
                              ...p,
                              references: [...createSampleStudentResume().references],
                            }))
                          }
                          className="py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-blue-500 text-[11px] font-bold text-slate-600 dark:text-slate-300 inline-flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          {bn ? "ডিফল্ট ২টি রেফারেন্স" : "Restore 2 Samples"}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 10. SECTION ORDER & VISIBILITY */}
            {activeEditorTab === "layout" && (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-500 pb-1">
                  {bn
                    ? "যেকোনো সেকশনের ক্রম উপরে/নিচে নিতে পারেন অথবা লুকাতে পারেন।"
                    : "Reorder resume sections or toggle visibility."}
                </p>
                {design.sectionOrder.map((key, idx) => {
                  const isHidden = design.hiddenSections.includes(key);
                  return (
                    <div
                      key={key}
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between gap-2"
                    >
                      <span
                        className={`text-xs font-bold ${
                          isHidden
                            ? "line-through text-slate-400"
                            : "text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        {bn ? SECTION_LABELS[key].bn : SECTION_LABELS[key].en}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveSectionOrder(idx, -1)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === design.sectionOrder.length - 1}
                          onClick={() => moveSectionOrder(idx, 1)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSectionVisibility(key)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                        >
                          {isHidden ? (
                            <EyeOff className="w-3.5 h-3.5 text-rose-500" />
                          ) : (
                            <Eye className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Sticky Live One-Page A4 Preview & Export Actions */}
        <div className="xl:col-span-7 space-y-4">
          {/* Action Toolbar: 1-Page Fit Meter + PDF / DOCX / Print */}
          <div className="p-4 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                data-testid="resume-page-fit-badge"
                className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold inline-flex items-center gap-1.5 ${
                  isOverflowing
                    ? "bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                    : "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50"
                }`}
              >
                {isOverflowing ? (
                  <AlertTriangle className="w-3.5 h-3.5" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                {isOverflowing
                  ? bn
                    ? `১ পেজ ছাড়িয়েছে (${fillPercent}%)`
                    : `Overflows 1 A4 Page (${fillPercent}%)`
                  : bn
                  ? `১ পেজ A4 ফিট (${Math.min(100, fillPercent)}%)`
                  : `Fits 1 A4 Page (${Math.min(100, fillPercent)}%)`}
              </span>

              {isOverflowing && (
                <button
                  type="button"
                  onClick={handleAutoFitOnePage}
                  className="px-2.5 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Maximize2 className="w-3 h-3" />
                  {bn ? "অটো-ফিট ১ পেজ" : "Auto-Fit 1 Page"}
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={Boolean(isExporting)}
                onClick={handleDownloadPdf}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-black shadow-md shadow-blue-600/20 inline-flex items-center gap-1.5 cursor-pointer transition-all"
              >
                {isExporting === "pdf" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                {bn ? "PDF ডাউনলোড" : "Download PDF"}
              </button>

              <button
                type="button"
                disabled={Boolean(isExporting)}
                onClick={handleDownloadDocx}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-black shadow-md shadow-indigo-600/20 inline-flex items-center gap-1.5 cursor-pointer transition-all"
              >
                {isExporting === "docx" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5" />
                )}
                {bn ? "DOC (.docx)" : "Download DOC"}
              </button>

              <button
                type="button"
                onClick={() => printResumeSheet(sheetRef.current, `${data.fullName || "Resume"}_A4`)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                {bn ? "প্রিন্ট" : "Print"}
              </button>
            </div>
          </div>

          {/* Scaled Live A4 Viewport */}
          <div
            ref={previewContainerRef}
            className="p-3 sm:p-5 rounded-3xl bg-slate-200/80 dark:bg-slate-950/90 border border-slate-300/70 dark:border-slate-800 flex justify-center overflow-hidden"
          >
            <div
              style={{
                width: `${Math.round(A4_WIDTH_PX * previewScale)}px`,
                height: `${Math.round(A4_HEIGHT_PX * previewScale)}px`,
              }}
              className="relative shrink-0"
            >
              <div
                style={{
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top left",
                  width: `${A4_WIDTH_PX}px`,
                  height: `${A4_HEIGHT_PX}px`,
                }}
              >
                <ResumeSheetRenderer
                  data={data}
                  design={design}
                  sheetRef={sheetRef}
                  measureRef={measureRef}
                />
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            {bn
              ? "ডাউনলোড করা PDF ও DOCX ফাইলটি ঠিক ১-পেজ A4 আকারে এবং ATS-রিডেবল টেক্সট হিসেবে তৈরি হয়।"
              : "Strictly single-page A4 output — PDF exports selectable ATS-readable text, DOCX is fully editable in MS Word."}
          </p>
        </div>
      </div>
    </div>
  );
}
