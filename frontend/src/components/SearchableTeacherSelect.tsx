"use client";

import React, { useState, useRef, useEffect } from "react";
import { User, Check, ChevronDown, X } from "lucide-react";

export interface TeacherOption {
  id: number;
  name: string;
  initial?: string;
  designation?: string;
  department?: string;
}

interface SearchableTeacherSelectProps {
  label?: string;
  value: number | "" | null;
  onChange: (teacherId: number | "") => void;
  teachers: TeacherOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  allowGeneral?: boolean;
  generalLabel?: string;
  generalSubLabel?: string;
  compact?: boolean;
  variant?: "default" | "reward";
  dropdownClassName?: string;
  language?: string;
}

export default function SearchableTeacherSelect({
  label,
  value,
  onChange,
  teachers,
  placeholder = "Search faculty by name or initial (e.g. Masum, DAKM, Yusuf)...",
  required = false,
  disabled = false,
  allowGeneral = true,
  generalLabel,
  generalSubLabel,
  compact = false,
  variant = "default",
  dropdownClassName,
  language = "en",
}: SearchableTeacherSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isReward = variant === "reward";

  // Find currently selected teacher
  const selectedTeacher = value
    ? teachers.find((t) => Number(t.id) === Number(value))
    : null;

  // Sync display text with selected teacher when dropdown is closed
  useEffect(() => {
    if (!isOpen) {
      if (selectedTeacher) {
        const initStr = selectedTeacher.initial ? ` [${selectedTeacher.initial}]` : "";
        setQuery(`${selectedTeacher.name}${initStr}`);
      } else if (value === "" || value === null) {
        if (generalLabel) {
          setQuery("");
        } else {
          setQuery(allowGeneral ? (language === "bn" ? "-- সাধারণ / বিভাগীয় ম্যাটেরিয়াল --" : "-- General / Department Wide --") : "");
        }
      } else {
        setQuery("");
      }
    }
  }, [value, selectedTeacher, isOpen, allowGeneral, generalLabel, language]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
        if (selectedTeacher) {
          const initStr = selectedTeacher.initial ? ` [${selectedTeacher.initial}]` : "";
          setQuery(`${selectedTeacher.name}${initStr}`);
        } else if (value === "" || value === null) {
          if (generalLabel) {
            setQuery("");
          } else {
            setQuery(allowGeneral ? (language === "bn" ? "-- সাধারণ / বিভাগীয় ম্যাটেরিয়াল --" : "-- General / Department Wide --") : "");
          }
        } else {
          setQuery("");
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedTeacher, value, allowGeneral, generalLabel, language]);

  // Filter teachers based on query with relevance scoring (exact initial or prefix ranks highest)
  const filteredTeachers = React.useMemo(() => {
    if (!isOpen || !query.trim()) return teachers;

    // If query matches current formatted name, show all
    const currentFormatted = selectedTeacher
      ? `${selectedTeacher.name}${selectedTeacher.initial ? ` [${selectedTeacher.initial}]` : ""}`
      : generalLabel || (language === "bn" ? "-- সাধারণ / বিভাগীয় ম্যাটেরিয়াল --" : "-- General / Department Wide --");

    if (query.trim() === currentFormatted) {
      return teachers;
    }

    const q = query.trim().toLowerCase();

    return teachers
      .map((t) => {
        const init = (t.initial || "").toLowerCase();
        const name = (t.name || "").toLowerCase();
        const desig = (t.designation || "").toLowerCase();
        const dept = (t.department || "").toLowerCase();

        let score = 0;
        if (init === q) score = 100; // exact initial match e.g. SM == sm
        else if (init.startsWith(q)) score = 85; // initial prefix e.g. S in SM
        else if (name.startsWith(q)) score = 70; // name starts with query
        else if (name.split(/\s+/).some((w) => w.startsWith(q))) score = 60; // name word starts with query
        else if (dept === q) score = 55; // exact department match e.g. cse, eee
        else if (dept.startsWith(q)) score = 50; // department prefix
        else if (init.includes(q)) score = 45;
        else if (name.includes(q)) score = 30;
        else if (dept.includes(q)) score = 25;
        else if (desig.includes(q)) score = 15;

        return { teacher: t, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.teacher);
  }, [teachers, isOpen, query, selectedTeacher, language]);

  const handleSelect = (t: TeacherOption | null) => {
    if (t) {
      onChange(t.id);
      const initStr = t.initial ? ` [${t.initial}]` : "";
      setQuery(`${t.name}${initStr}`);
    } else {
      onChange("");
      setQuery(generalLabel ? "" : (language === "bn" ? "-- সাধারণ / বিভাগীয় ম্যাটেরিয়াল --" : "-- General / Department Wide --"));
    }
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

  return (
    <div className={`relative w-full ${compact ? "space-y-0" : "space-y-1"}`} ref={containerRef}>
      {label && (
        <label className={`block text-xs font-bold ${
          isReward
            ? "text-emerald-800 dark:text-emerald-300"
            : "text-slate-700 dark:text-slate-300"
        }`}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Single Interactive Combobox Input */}
      <div
        className={`relative flex items-center w-full rounded-xl transition-all border ${
          disabled
            ? "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800"
            : compact
            ? "bg-slate-900 border-purple-500/30 text-purple-200 shadow-xs"
            : isOpen || isFocused
            ? isReward
              ? "ring-2 ring-emerald-500 border-emerald-500 bg-white dark:bg-slate-800"
              : "ring-2 ring-blue-500 border-blue-500 bg-white dark:bg-slate-800"
            : isReward
            ? "border-emerald-300 dark:border-emerald-800/80 bg-white dark:bg-slate-800/90 shadow-2xs"
            : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs hover:border-slate-400 dark:hover:border-slate-600"
        }`}
      >
        <div className={`${compact ? "pl-2.5 pr-1.5" : "pl-3.5 pr-2"} pointer-events-none ${
          disabled ? "text-slate-400" : isReward ? "text-emerald-600 dark:text-emerald-400" : compact ? "text-purple-400" : "text-slate-500 dark:text-slate-400"
        }`}>
          <User className={`${compact ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
        </div>

        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={query}
          onChange={(e) => {
            if (disabled) return;
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (disabled) return;
            setIsFocused(true);
            setIsOpen(true);
            inputRef.current?.select();
          }}
          placeholder={placeholder}
          className={`w-full font-semibold bg-transparent focus:outline-none placeholder:font-normal truncate ${
            disabled
              ? "cursor-not-allowed text-slate-400 placeholder:text-slate-400/80 py-2.5 pr-10 text-xs sm:text-sm"
              : compact
              ? "py-1.5 pr-12 text-xs text-purple-200 placeholder:text-purple-300/50"
              : "py-2.5 pr-14 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400"
          }`}
        />

        {!disabled && (
          <div className={`absolute ${compact ? "right-1.5" : "right-2.5"} flex items-center gap-0.5`}>
            {Boolean(value) && (
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
              onClick={() => {
                setIsOpen(!isOpen);
                if (!isOpen) inputRef.current?.focus();
              }}
              className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
        )}
      </div>

      {/* Floating Dropdown List of Filtered Faculty */}
      {isOpen && !disabled && (
        <div className={`absolute left-0 min-w-[320px] sm:min-w-[360px] max-w-[90vw] top-full mt-1.5 z-50 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 ${dropdownClassName || ""}`}>
          {/* Header Info */}
          <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>
              {language === "bn"
                ? `মোট শিক্ষক: ${filteredTeachers.length}`
                : `Showing ${filteredTeachers.length} of ${teachers.length} faculty members`}
            </span>
            <span className="text-[10px] text-slate-400">
              {language === "bn" ? "নাম বা ইনিশিয়াল লিখে সার্চ করুন" : "Type name or initial to filter"}
            </span>
          </div>

          {/* List items */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
            {/* General / Department Wide Option */}
            {allowGeneral && (
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-2.5 transition-colors text-xs ${
                  !value
                    ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                    *
                  </div>
                  <div className="truncate">
                    <span className="font-semibold block truncate">
                      {generalLabel || (language === "bn" ? "-- সাধারণ / বিভাগীয় ম্যাটেরিয়াল --" : "-- General / Department Wide --")}
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {generalSubLabel || (language === "bn" ? "সকল শিক্ষকের জন্য প্রযোজ্য" : "Applies to all course sections")}
                    </span>
                  </div>
                </div>

                {!value && <Check className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />}
              </button>
            )}

            {filteredTeachers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                {language === "bn" ? "কোনো শিক্ষক খুঁজে পাওয়া যায়নি" : "No matching faculty found"}
              </div>
            ) : (
              filteredTeachers.map((t) => {
                const isSelected = Boolean(value && Number(value) === Number(t.id));

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSelect(t)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-2.5 transition-colors text-xs ${
                      isSelected
                        ? isReward
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border-l-2 border-emerald-500"
                          : "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-lg font-bold text-[11px] flex items-center justify-center shrink-0 ${
                        isReward
                          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                          : "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300"
                      }`}>
                        {t.initial || t.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-semibold truncate">{t.name}</span>
                          {t.initial && (
                            <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                              isReward
                                ? "bg-emerald-50 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                : "bg-purple-50 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                            }`}>
                              [{t.initial}]
                            </span>
                          )}
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                            {t.department || "CSE"}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal truncate block">
                          {t.designation || "Faculty Member"}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className={`w-4 h-4 shrink-0 ${isReward ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400"}`} />
                    )}
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
