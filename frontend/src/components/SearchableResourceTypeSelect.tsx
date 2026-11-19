"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  FileText,
  FileQuestion,
  Award,
  HelpCircle,
  BookOpen,
  Code2,
  ClipboardList,
  FlaskConical,
  FolderArchive,
  Check,
  ChevronDown,
  X,
  Search,
} from "lucide-react";

export interface ResourceTypeOption {
  value: string;
  labelEn: string;
  labelBn: string;
  category: "EXAMS" | "NOTES" | "LAB" | "OTHERS";
  categoryNameEn: string;
  categoryNameBn: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
}

export const RESOURCE_TYPE_OPTIONS: ResourceTypeOption[] = [
  // --- EXAMINATIONS & QUESTIONS ---
  {
    value: "MID_QUESTION",
    labelEn: "Midterm Examination Paper",
    labelBn: "মিডটার্ম পরীক্ষার প্রশ্নপত্র",
    category: "EXAMS",
    categoryNameEn: "Examinations & Questions",
    categoryNameBn: "পরীক্ষা ও প্রশ্নপত্র",
    icon: FileQuestion,
    keywords: ["mid", "midterm", "exam", "question", "মিড", "মিডটার্ম", "প্রশ্ন", "পরীক্ষা"],
  },
  {
    value: "FINAL_QUESTION",
    labelEn: "Final Exam Paper",
    labelBn: "ফাইনাল পরীক্ষার প্রশ্নপত্র",
    category: "EXAMS",
    categoryNameEn: "Examinations & Questions",
    categoryNameBn: "পরীক্ষা ও প্রশ্নপত্র",
    icon: Award,
    keywords: ["final", "semester final", "exam", "question", "ফাইনাল", "প্রশ্ন", "পরীক্ষা"],
  },
  {
    value: "QUIZ_CT",
    labelEn: "Class Test & Quiz Question (CT)",
    labelBn: "ক্লাস টেস্ট ও কুইজ প্রশ্নপত্র (CT)",
    category: "EXAMS",
    categoryNameEn: "Examinations & Questions",
    categoryNameBn: "পরীক্ষা ও প্রশ্নপত্র",
    icon: HelpCircle,
    keywords: ["quiz", "ct", "class test", "assessment", "কুইজ", "ক্লাস টেস্ট", "টেস্ট"],
  },

  // --- LECTURE NOTES & STUDY ---
  {
    value: "NOTE",
    labelEn: "Lecture Notes (Handwritten / Slides)",
    labelBn: "লেকচার নোট (হস্তলিখিত / স্লাইড)",
    category: "NOTES",
    categoryNameEn: "Lecture Notes & Study",
    categoryNameBn: "লেকচার নোট ও পড়াশোনা",
    icon: BookOpen,
    keywords: ["note", "handnote", "lecture", "slide", "summary", "নোট", "লেকচার", "হ্যান্ডনোট"],
  },
  {
    value: "QUESTION_COURSE_IN",
    labelEn: "Course-In Materials / Assignment",
    labelBn: "কোর্স-ইন ম্যাটেরিয়াল ও এসাইনমেন্ট",
    category: "NOTES",
    categoryNameEn: "Lecture Notes & Study",
    categoryNameBn: "লেকচার নোট ও পড়াশোনা",
    icon: FileText,
    keywords: ["assignment", "course in", "course-in", "homework", "practice", "এসাইনমেন্ট", "কোর্স"],
  },

  // --- LAB & PRACTICAL ---
  {
    value: "LAB_MANUAL",
    labelEn: "Lab Manual & Code Solution",
    labelBn: "ল্যাব ম্যানুয়াল ও কোড সমাধান",
    category: "LAB",
    categoryNameEn: "Lab & Practical",
    categoryNameBn: "ল্যাব ও প্র্যাকটিক্যাল",
    icon: Code2,
    keywords: ["lab", "manual", "code", "programming", "solution", "ল্যাব", "কোড", "ম্যানুয়াল"],
  },
  {
    value: "LAB_REPORT",
    labelEn: "Lab Report / Project Report",
    labelBn: "ল্যাব রিপোর্ট ও প্রজেক্ট রিপোর্ট",
    category: "LAB",
    categoryNameEn: "Lab & Practical",
    categoryNameBn: "ল্যাব ও প্র্যাকটিক্যাল",
    icon: ClipboardList,
    keywords: ["lab report", "report", "project", "experiment", "রিপোর্ট", "প্রজেক্ট"],
  },
  {
    value: "LAB_QUIZ",
    labelEn: "Lab Quiz & Viva Question",
    labelBn: "ল্যাব কুইজ ও ভাইভা প্রশ্ন",
    category: "LAB",
    categoryNameEn: "Lab & Practical",
    categoryNameBn: "ল্যাব ও প্র্যাকটিক্যাল",
    icon: FlaskConical,
    keywords: ["viva", "lab quiz", "oral", "ভাইভা", "ল্যাব কুইজ", "মৌখিক"],
  },
  {
    value: "LAB_FINAL",
    labelEn: "Lab Final Exam Paper",
    labelBn: "ল্যাব ফাইনাল পরীক্ষার প্রশ্ন",
    category: "LAB",
    categoryNameEn: "Lab & Practical",
    categoryNameBn: "ল্যাব ও প্র্যাকটিক্যাল",
    icon: Award,
    keywords: ["lab final", "practical exam", "ল্যাব ফাইনাল", "প্র্যাকটিক্যাল"],
  },

  // --- OTHERS ---
  {
    value: "OTHERS",
    labelEn: "Other Academic Materials",
    labelBn: "অন্যান্য অ্যাকাডেমিক ম্যাটেরিয়াল",
    category: "OTHERS",
    categoryNameEn: "Other Academic Resources",
    categoryNameBn: "অন্যান্য অ্যাকাডেমিক বিষয়",
    icon: FolderArchive,
    keywords: ["other", "syllabus", "book", "guide", "reference", "অন্যান্য", "সিলেবাস"],
  },
];

interface SearchableResourceTypeSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: boolean;
  placeholder?: string;
  language?: "en" | "bn";
}

export default function SearchableResourceTypeSelect({
  label,
  value,
  onChange,
  required = false,
  error = false,
  placeholder,
  language = "en",
}: SearchableResourceTypeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isBn = language === "bn";

  const selectedOption = useMemo(() => {
    return RESOURCE_TYPE_OPTIONS.find((opt) => opt.value === value) || null;
  }, [value]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation & Esc handling
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setQuery("");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Filtered options based on user query
  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return RESOURCE_TYPE_OPTIONS;

    return RESOURCE_TYPE_OPTIONS.filter((opt) => {
      const matchLabelEn = opt.labelEn.toLowerCase().includes(q);
      const matchLabelBn = opt.labelBn.toLowerCase().includes(q);
      const matchVal = opt.value.toLowerCase().includes(q);
      const matchKey = opt.keywords.some((k) => k.toLowerCase().includes(q));

      return matchLabelEn || matchLabelBn || matchVal || matchKey;
    });
  }, [query]);

  // Group filtered options by category
  const groupedOptions = useMemo(() => {
    const groups: {
      category: string;
      title: string;
      options: ResourceTypeOption[];
    }[] = [];

    const categoryOrder: ("EXAMS" | "NOTES" | "LAB" | "OTHERS")[] = ["EXAMS", "NOTES", "LAB", "OTHERS"];

    categoryOrder.forEach((catKey) => {
      const matches = filteredOptions.filter((o) => o.category === catKey);
      if (matches.length > 0) {
        const first = matches[0];
        groups.push({
          category: catKey,
          title: isBn ? first.categoryNameBn : first.categoryNameEn,
          options: matches,
        });
      }
    });

    return groups;
  }, [filteredOptions, isBn]);

  const SelectedIcon = selectedOption ? selectedOption.icon : FileText;

  const defaultPlaceholder = isBn
    ? "ম্যাটেরিয়ালের ধরন নির্বাচন করুন..."
    : "Select resource type (e.g. Midterm, Final, CT)...";

  return (
    <div className="relative w-full space-y-1" ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full px-3.5 py-2.5 rounded-xl text-left transition-all flex items-center justify-between gap-2.5 cursor-pointer font-semibold ${
          isOpen
            ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-white dark:bg-slate-800 shadow-sm"
            : error
            ? "border-amber-500 dark:border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20 dark:bg-amber-950/20 text-slate-800 dark:text-slate-200"
            : selectedOption
            ? "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs hover:border-slate-400 dark:hover:border-slate-600"
            : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs hover:border-slate-400 dark:hover:border-slate-600"
        } border`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              selectedOption
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-slate-100 dark:bg-slate-700/60 text-slate-400 dark:text-slate-500"
            }`}
          >
            <SelectedIcon className="w-4 h-4" />
          </div>

          <div className="min-w-0 flex-1">
            {selectedOption ? (
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate block">
                {isBn ? selectedOption.labelBn : selectedOption.labelEn}
              </span>
            ) : (
              <span className="text-xs sm:text-sm font-normal text-slate-400 dark:text-slate-500 truncate block">
                {placeholder || defaultPlaceholder}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedOption && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setQuery("");
              }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title={isBn ? "মুছে ফেলুন" : "Clear selection"}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-emerald-500" : ""
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 space-y-2">
          {/* Search Box inside Dropdown */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                isBn
                  ? "টাইপ করে খুঁজুন..."
                  : "Search resource type..."
              }
              className="w-full pl-8 pr-7 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 font-medium"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Options List Grouped by Category */}
          <div className="max-h-72 overflow-y-auto space-y-2 p-1 custom-scrollbar">
            {groupedOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 space-y-1">
                <p className="font-semibold">{isBn ? "কোনো মিল পাওয়া যায়নি" : "No matching resource type"}</p>
                <p className="text-[11px] text-slate-500">
                  {isBn ? `"${query}" এর জন্য কোনো ক্যাটাগরি নেই` : `No category matching "${query}"`}
                </p>
              </div>
            ) : (
              groupedOptions.map((group) => (
                <div key={group.category} className="space-y-0.5">
                  <div className="px-2 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {group.title}
                  </div>

                  <div className="space-y-0.5">
                    {group.options.map((opt) => {
                      const isSelected = opt.value === value;
                      const Icon = opt.icon;

                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            onChange(opt.value);
                            setIsOpen(false);
                            setQuery("");
                          }}
                          className={`w-full py-2 px-2.5 rounded-xl text-left transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                            isSelected
                              ? "bg-emerald-500/10 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500/40 font-bold"
                              : "hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300 font-medium"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div
                              className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? "bg-emerald-500 text-white shadow-xs"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                            </div>

                            <span className="text-xs font-semibold truncate text-slate-900 dark:text-white">
                              {isBn ? opt.labelBn : opt.labelEn}
                            </span>
                          </div>

                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
