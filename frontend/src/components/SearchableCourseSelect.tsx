"use client";

import React, { useState, useRef, useEffect } from "react";
import { BookOpen, Check, ChevronDown, Search, X } from "lucide-react";

export interface CourseOption {
  code: string;
  title: string;
  department?: string;
  semester?: number;
  credits?: number;
}

export function sortCoursesNaturally<T extends { code: string; title?: string }>(courses: T[]): T[] {
  return [...courses].sort((a, b) => {
    const codeA = (a.code || "").toUpperCase().trim();
    const codeB = (b.code || "").toUpperCase().trim();

    const matchA = codeA.match(/^([A-Z]+)(\d+)(.*)$/);
    const matchB = codeB.match(/^([A-Z]+)(\d+)(.*)$/);

    if (matchA && matchB) {
      const deptA = matchA[1];
      const deptB = matchB[1];
      const numA = parseInt(matchA[2], 10);
      const numB = parseInt(matchB[2], 10);
      const suffixA = matchA[3];
      const suffixB = matchB[3];

      if (deptA === "CSE" && deptB !== "CSE") return -1;
      if (deptA !== "CSE" && deptB === "CSE") return 1;
      if (deptA !== deptB) return deptA.localeCompare(deptB);
      if (numA !== numB) return numA - numB;
      return suffixA.localeCompare(suffixB);
    }
    return codeA.localeCompare(codeB, undefined, { numeric: true });
  });
}

interface SearchableCourseSelectProps {
  label?: string;
  value: string;
  onChange: (courseCode: string) => void;
  courses: CourseOption[];
  placeholder?: string;
  required?: boolean;
  disabledCode?: string;
  disabledCodeReason?: string;
  variant?: "default" | "reward";
  language?: string;
}

export default function SearchableCourseSelect({
  label,
  value,
  onChange,
  courses,
  placeholder = "Search by code or title (e.g. CSE347, Networking, Math)...",
  required = false,
  disabledCode,
  disabledCodeReason = "Already selected",
  variant = "default",
  language = "en",
}: SearchableCourseSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sort courses naturally (CSE first, ordered by number: CSE141, CSE161, CSE181, CSE241...)
  const sortedCourses = sortCoursesNaturally(courses);

  // Find currently selected course object
  const selectedCourse = sortedCourses.find(
    (c) => c.code.toLowerCase() === (value || "").toLowerCase()
  );

  // Sync display text with selected course when not actively searching
  useEffect(() => {
    if (!isOpen) {
      if (selectedCourse) {
        setQuery(`${selectedCourse.code} - ${selectedCourse.title}`);
      } else {
        setQuery("");
      }
    }
  }, [value, selectedCourse, isOpen]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
        // Reset query text to selected course name
        if (selectedCourse) {
          setQuery(`${selectedCourse.code} - ${selectedCourse.title}`);
        } else {
          setQuery("");
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedCourse]);

  // Filter courses based on query
  // When focused or user types e.g. "n", matches any part of code or title
  const filteredCourses = sortedCourses.filter((c) => {
    if (!isOpen || !query.trim()) return true;

    // If query matches the exact formatted string of selected course, show all
    if (selectedCourse && query.trim() === `${selectedCourse.code} - ${selectedCourse.title}`) {
      return true;
    }

    const q = query.trim().toLowerCase();
    const codeMatch = c.code.toLowerCase().includes(q);
    const titleMatch = c.title.toLowerCase().includes(q);
    const deptMatch = c.department ? c.department.toLowerCase().includes(q) : false;

    return codeMatch || titleMatch || deptMatch;
  });

  const handleSelect = (course: CourseOption) => {
    if (disabledCode && course.code.toLowerCase() === disabledCode.toLowerCase()) {
      return;
    }
    onChange(course.code);
    setQuery(`${course.code} - ${course.title}`);
    setIsOpen(false);
    setIsFocused(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setQuery("");
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const isReward = variant === "reward";

  return (
    <div className="relative w-full space-y-1" ref={containerRef}>
      {label && (
        <label className={`block text-xs font-bold ${
          isReward
            ? "text-emerald-800 dark:text-emerald-300"
            : "text-slate-700 dark:text-slate-300"
        }`}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* The Single Interactive Search Combobox Input (NO EXTRA SEARCH FIELD) */}
      <div
        className={`relative flex items-center w-full rounded-xl transition-all border ${
          isOpen || isFocused
            ? isReward
              ? "ring-2 ring-emerald-500 border-emerald-500 bg-white dark:bg-slate-800"
              : "ring-2 ring-blue-500 border-blue-500 bg-white dark:bg-slate-800"
            : isReward
            ? "border-emerald-300 dark:border-emerald-800/80 bg-white dark:bg-slate-800/90 shadow-2xs"
            : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs hover:border-slate-400 dark:hover:border-slate-600"
        }`}
      >
        <div className="pl-3.5 pr-2 pointer-events-none text-slate-500 dark:text-slate-400">
          <BookOpen className="w-4 h-4" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsFocused(true);
            setIsOpen(true);
            // Select all text for easy quick typing
            inputRef.current?.select();
          }}
          placeholder={placeholder}
          className="w-full py-2.5 pr-14 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white bg-transparent focus:outline-none placeholder:text-slate-500 dark:placeholder:text-slate-400 placeholder:font-normal"
        />

        <div className="absolute right-2.5 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              title={language === "bn" ? "মুছে ফেলুন" : "Clear selection"}
              className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setIsOpen(!isOpen);
              if (!isOpen) inputRef.current?.focus();
            }}
            className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* Floating Dropdown List of All / Filtered Courses */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header Info */}
          <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>
              {language === "bn"
                ? `মোট কোর্স: ${filteredCourses.length}`
                : `Showing ${filteredCourses.length} of ${courses.length} courses`}
            </span>
            <span className="text-[10px] text-slate-400">
              {language === "bn" ? "টাইপ করে ফিল্টার করুন" : "Type to filter"}
            </span>
          </div>

          {/* List items */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
            {filteredCourses.length === 0 ? (
              <div className="p-4 text-center space-y-2">
                <p className="text-xs text-slate-400">
                  {language === "bn" ? "কোনো তালিকাভুক্ত কোর্স খুঁজে পাওয়া যায়নি" : "No listed courses matched your search"}
                </p>
                {query.trim().length >= 3 && (
                  <button
                    type="button"
                    onClick={() => {
                      const customCode = query.trim().toUpperCase();
                      onChange(customCode);
                      setIsOpen(false);
                      setIsFocused(false);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center gap-1.5 text-xs transition-colors shadow-sm"
                  >
                    <span>
                      {language === "bn"
                        ? `"${query.trim().toUpperCase()}" কাস্টম কোড হিসেবে ব্যবহার করুন`
                        : `Use "${query.trim().toUpperCase()}" as custom course code`}
                    </span>
                  </button>
                )}
              </div>
            ) : (
              filteredCourses.map((c) => {
                const isSelected = Boolean(value && value.toLowerCase() === c.code.toLowerCase());
                const isDisabled = Boolean(disabledCode && disabledCode.toLowerCase() === c.code.toLowerCase());

                return (
                  <button
                    key={c.code}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleSelect(c)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-2.5 transition-colors text-xs ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold"
                        : isDisabled
                        ? "opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-900"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 shrink-0">
                        {c.code}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                        {c.department || "CSE"}
                      </span>
                      <div className="truncate">
                        <span className="font-semibold block truncate">{c.title}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          {c.semester ? `Semester ${c.semester}` : "Curriculum"} {c.credits ? `• ${c.credits} Credits` : ""}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      {isDisabled && (
                        <span className="text-[10px] text-amber-500 font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                          {disabledCodeReason}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
