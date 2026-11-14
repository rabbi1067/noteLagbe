"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Calendar, Check, ChevronDown, Search, X, Sparkles, Plus } from "lucide-react";
import { getRollingAcademicSemesters } from "@/lib/academicSemester";

interface SearchableSemesterSelectProps {
  value: string;
  onChange: (semester: string) => void;
  placeholder?: string;
  required?: boolean;
  language?: string;
  error?: boolean;
  className?: string;
}

export default function SearchableSemesterSelect({
  value,
  onChange,
  placeholder = "Search or select semester (e.g. Fall 2026, Summer 2026)...",
  required = false,
  language = "en",
  error = false,
  className = "",
}: SearchableSemesterSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Dynamically generated rolling 2-year semesters based on real-time academic calendar
  const availableSemesters = useMemo(() => getRollingAcademicSemesters(new Date(), 2), []);

  // Sync display input query with value when dropdown is closed
  useEffect(() => {
    if (!isOpen) {
      setQuery(value || "");
    }
  }, [value, isOpen]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // If closed without selection, restore current value
        setQuery(value || "");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  // Filter semesters based on user search query
  const filteredSemesters = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return availableSemesters;
    return availableSemesters.filter((sem) => sem.toLowerCase().includes(q));
  }, [query, availableSemesters]);

  // Check if typed query is an exact match for one of the options
  const isExactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    return availableSemesters.some((sem) => sem.toLowerCase() === q);
  }, [query, availableSemesters]);

  const handleSelect = (sem: string) => {
    onChange(sem.trim());
    setQuery(sem.trim());
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setQuery("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredSemesters.length > 0) {
        handleSelect(filteredSemesters[0]);
      } else if (query.trim().length >= 3) {
        handleSelect(query.trim());
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setQuery(value || "");
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Main Input Field */}
      <div
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
        className={`relative flex items-center w-full rounded-xl transition-all duration-150 cursor-pointer ${
          error
            ? "border-red-500 ring-2 ring-red-500/20"
            : isOpen
            ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm"
            : "border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 shadow-2xs"
        } border bg-white dark:bg-slate-800`}
      >
        <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-500 dark:text-slate-400">
          <Calendar className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
        </div>

        <input
          ref={inputRef}
          type="text"
          required={required}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={
            language === "bn"
              ? "সেমিস্টার খুঁজুন বা লিখুন (যেমন: Fall 2026, Summer 2026)..."
              : placeholder
          }
          className="w-full pl-10 pr-16 py-2.5 rounded-xl text-xs sm:text-sm bg-transparent focus:outline-none font-semibold text-slate-900 dark:text-white placeholder:font-normal placeholder:text-slate-500 dark:placeholder:text-slate-400"
        />

        {/* Action icons (Clear and Dropdown Toggle) */}
        <div className="absolute right-2.5 flex items-center gap-1">
          {Boolean(value || query) && (
            <button
              type="button"
              onClick={handleClear}
              title={language === "bn" ? "মুছে ফেলুন" : "Clear selection"}
              className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
              if (!isOpen) inputRef.current?.focus();
            }}
            className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* Floating Dropdown List */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header Info */}
          <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-emerald-500" />
              {language === "bn"
                ? `২ বছরের অ্যাকাডেমিক সেমিস্টার (${availableSemesters.length}টি)`
                : `Recent 2-Year Academic Terms (${availableSemesters.length})`}
            </span>
            <span className="text-[10px] text-slate-400">
              {language === "bn" ? "টাইপ করে সার্চ করুন বা সিলেক্ট করুন" : "Type to filter or select"}
            </span>
          </div>

          {/* Semesters List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
            {/* Custom Query Option if user entered something not in list */}
            {query.trim().length >= 3 && !isExactMatch && (
              <button
                type="button"
                onClick={() => handleSelect(query.trim())}
                className="w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-2.5 transition-colors text-xs bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 cursor-pointer font-semibold mb-1"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <span>{language === "bn" ? "ব্যবহার করুন:" : "Use Custom:"} &ldquo;{query.trim()}&rdquo;</span>
                    <span className="block text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-normal">
                      {language === "bn" ? "কাস্টম অ্যাকাডেমিক সেমিস্টার হিসেবে যুক্ত করুন" : "Add as custom academic term"}
                    </span>
                  </div>
                </div>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </button>
            )}

            {filteredSemesters.length === 0 && query.trim().length < 3 && (
              <div className="p-5 text-center text-xs text-slate-400">
                {language === "bn" ? "কোনো সেমিস্টার পাওয়া যায়নি" : "No matching semester found"}
              </div>
            )}

            {filteredSemesters.map((sem) => {
              const isSelected = value.trim().toLowerCase() === sem.toLowerCase();
              return (
                <button
                  key={sem}
                  type="button"
                  onClick={() => handleSelect(sem)}
                  className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between gap-2.5 transition-colors text-xs cursor-pointer ${
                    isSelected
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <Calendar className="w-3 h-3" />
                    </div>
                    <span className="truncate">{sem}</span>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
