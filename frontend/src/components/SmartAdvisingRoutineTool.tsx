"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  REAL_SEU_OFFERED_SECTIONS,
  OfferedSectionItem,
  TimeSlot,
} from "@/data/seuAdvisingCatalog";
import { getSeuCourseTitle } from "@/data/seuCourseTitles";
import {
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Upload,
  Download,
  Printer,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Filter,
  Search,
  Plus,
  X,
  RefreshCw,
  Trash2,
  Star,
  Users,
  Layers,
  GraduationCap,
  SlidersHorizontal,
  Flame,
  FileText,
  ShieldCheck,
  ExternalLink,
  BookOpen,
  Image as ImageIcon,
  FileDown,
  Trophy,
  Award,
  Lock,
  Bookmark,
  Sun,
  Moon,
  ArrowRight,
  Eye,
  Sliders,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

export type { TimeSlot, OfferedSectionItem };

export interface GeneratedRoutineOption {
  sections: OfferedSectionItem[];
  score: number;
  matchPercentage: number;
  rank: number;
  activeDaysCount: number;
  activeDays: string[];
  totalCredits: number;
  totalGapMinutes: number;
  facultyMatchCount: number;
  hasEarlyMorning: boolean;
  hasLateEvening: boolean;
  highlights: string[];
}

// Convert "08:30" to minutes (510)
export function timeToMinutes(t: string): number {
  if (!t || !t.includes(":")) return 0;
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Convert 12-hour "10:00 AM" or "01:00 PM" to minutes from midnight
export function time12ToMinutes(t12: string): number {
  if (!t12) return 0;
  const clean = t12.trim();
  const isPM = clean.toUpperCase().includes("PM");
  const isAM = clean.toUpperCase().includes("AM");
  const timePart = clean.replace(/(?:AM|PM)/gi, "").trim();
  const [hStr, mStr] = timePart.split(":");
  let h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  return h * 60 + m;
}

// Convert 24-hour "08:30" or "15:00" to friendly 12-hour "08:30 AM" or "03:00 PM"
export function formatTime12(t: string): string {
  if (!t || !t.includes(":")) return t;
  const parts = t.trim().split(":");
  let h = parseInt(parts[0], 10);
  const m = (parts[1] || "00").padStart(2, "0");
  if (isNaN(h)) return t;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  const hStr = h < 10 ? `0${h}` : `${h}`;
  return `${hStr}:${m} ${ampm}`;
}

// Check if two sections clash
export function doSectionsClash(s1: OfferedSectionItem, s2: OfferedSectionItem): boolean {
  for (const slot1 of s1.slots) {
    for (const slot2 of s2.slots) {
      if (slot1.day.toUpperCase() === slot2.day.toUpperCase()) {
        const start1 = slot1.startMinutes ?? timeToMinutes(slot1.start);
        const end1 = slot1.endMinutes ?? timeToMinutes(slot1.end);
        const start2 = slot2.startMinutes ?? timeToMinutes(slot2.start);
        const end2 = slot2.endMinutes ?? timeToMinutes(slot2.end);

        if (Math.max(start1, start2) < Math.min(end1, end2)) {
          return true; // Clash!
        }
      }
    }
  }
  return false;
}

// Visual color themes for courses (vibrant, modern dark palette matching the demo)
export interface CourseTheme {
  name: string;
  cardBg: string;
  border: string;
  text: string;
  badge: string;
  accent: string;
  dot: string;
  sidebarBg: string;
}

const COURSE_PALETTES: CourseTheme[] = [
  {
    name: "emerald",
    cardBg: "bg-emerald-950/85 hover:bg-emerald-900/90",
    border: "border-emerald-500/60 hover:border-emerald-400",
    text: "text-emerald-100",
    badge: "bg-emerald-950 text-emerald-300 border-emerald-700",
    accent: "text-emerald-400",
    dot: "bg-emerald-400",
    sidebarBg: "from-emerald-950/40 via-emerald-900/20 to-slate-900/90 border-emerald-500/40",
  },
  {
    name: "indigo",
    cardBg: "bg-indigo-950/85 hover:bg-indigo-900/90",
    border: "border-indigo-500/60 hover:border-indigo-400",
    text: "text-indigo-100",
    badge: "bg-indigo-950 text-indigo-300 border-indigo-700",
    accent: "text-indigo-400",
    dot: "bg-indigo-400",
    sidebarBg: "from-indigo-950/40 via-indigo-900/20 to-slate-900/90 border-indigo-500/40",
  },
  {
    name: "purple",
    cardBg: "bg-purple-950/85 hover:bg-purple-900/90",
    border: "border-purple-500/60 hover:border-purple-400",
    text: "text-purple-100",
    badge: "bg-purple-950 text-purple-300 border-purple-700",
    accent: "text-purple-400",
    dot: "bg-purple-400",
    sidebarBg: "from-purple-950/40 via-purple-900/20 to-slate-900/90 border-purple-500/40",
  },
  {
    name: "teal",
    cardBg: "bg-teal-950/85 hover:bg-teal-900/90",
    border: "border-teal-500/60 hover:border-teal-400",
    text: "text-teal-100",
    badge: "bg-teal-950 text-teal-300 border-teal-700",
    accent: "text-teal-400",
    dot: "bg-teal-400",
    sidebarBg: "from-teal-950/40 via-teal-900/20 to-slate-900/90 border-teal-500/40",
  },
  {
    name: "blue",
    cardBg: "bg-blue-950/85 hover:bg-blue-900/90",
    border: "border-blue-500/60 hover:border-blue-400",
    text: "text-blue-100",
    badge: "bg-blue-950 text-blue-300 border-blue-700",
    accent: "text-blue-400",
    dot: "bg-blue-400",
    sidebarBg: "from-blue-950/40 via-blue-900/20 to-slate-900/90 border-blue-500/40",
  },
  {
    name: "rose",
    cardBg: "bg-rose-950/85 hover:bg-rose-900/90",
    border: "border-rose-500/60 hover:border-rose-400",
    text: "text-rose-100",
    badge: "bg-rose-950 text-rose-300 border-rose-700",
    accent: "text-rose-400",
    dot: "bg-rose-400",
    sidebarBg: "from-rose-950/40 via-rose-900/20 to-slate-900/90 border-rose-500/40",
  },
  {
    name: "amber",
    cardBg: "bg-amber-950/85 hover:bg-amber-900/90",
    border: "border-amber-500/60 hover:border-amber-400",
    text: "text-amber-100",
    badge: "bg-amber-950 text-amber-300 border-amber-700",
    accent: "text-amber-400",
    dot: "bg-amber-400",
    sidebarBg: "from-amber-950/40 via-amber-900/20 to-slate-900/90 border-amber-500/40",
  },
  {
    name: "cyan",
    cardBg: "bg-cyan-950/85 hover:bg-cyan-900/90",
    border: "border-cyan-500/60 hover:border-cyan-400",
    text: "text-cyan-100",
    badge: "bg-cyan-950 text-cyan-300 border-cyan-700",
    accent: "text-cyan-400",
    dot: "bg-cyan-400",
    sidebarBg: "from-cyan-950/40 via-cyan-900/20 to-slate-900/90 border-cyan-500/40",
  },
];

export function getCourseTheme(code: string): CourseTheme {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % COURSE_PALETTES.length;
  return COURSE_PALETTES[idx];
}

const WEEK_DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

// Timetable runs from 08:00 AM (480 mins) to 06:00 PM (1080 mins) -> 600 mins total
const TIMELINE_START_MINUTES = 480;
const TIMELINE_END_MINUTES = 1080;
const TIMELINE_TOTAL_MINUTES = TIMELINE_END_MINUTES - TIMELINE_START_MINUTES; // 600 mins

const TIME_HOURS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

export default function SmartAdvisingRoutineTool() {
  const { user } = useAuth();
  const { language } = useLanguage();

  // App Top Navigation State
  const [activeAppTab, setActiveAppTab] = useState<"routine" | "compare" | "saved">("routine");

  // State: Sections loaded from verified real SEU dataset
  const [sections, setSections] = useState<OfferedSectionItem[]>(REAL_SEU_OFFERED_SECTIONS);
  const [semester, setSemester] = useState<string>("Spring 2026");

  // Selection: Starts with 5 standard courses from catalog on load
  const [selectedCourses, setSelectedCourses] = useState<string[]>([
    "CSE355",
    "CSE381",
    "CSE382",
    "CSE443",
    "CSE444",
  ]);
  const [sidebarCourseSearch, setSidebarCourseSearch] = useState<string>("");
  const [expandedFacultyCourse, setExpandedFacultyCourse] = useState<string | null>(null);

  // Preferences
  const [timePreference, setTimePreference] = useState<string>("ANY");
  const [customStartTime, setCustomStartTime] = useState<string>("10:00 AM");
  const [customEndTime, setCustomEndTime] = useState<string>("01:00 PM");
  const [showCustomTimeInput, setShowCustomTimeInput] = useState<boolean>(false);
  const [dayPreference, setDayPreference] = useState<
    "MINIMIZE_DAYS" | "COMPACT_GAPS" | "ANY"
  >("COMPACT_GAPS");
  const [preferredDays, setPreferredDays] = useState<string[]>([
    "SUN",
    "MON",
    "TUE",
    "WED",
    "THU",
    "FRI",
    "SAT",
  ]);
  const [facultyPreferences, setFacultyPreferences] = useState<Record<string, string[]>>({});

  // Generated Routines & Sorting
  const [routines, setRoutines] = useState<GeneratedRoutineOption[]>([]);
  const [selectedRoutineIndex, setSelectedRoutineIndex] = useState<number>(0);
  const [sortBy, setSortBy] = useState<"fewest_days" | "lowest_gap" | "highest_score">("fewest_days");
  const [generating, setGenerating] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Timetable View Mode (Week vs Day)
  const [viewMode, setViewMode] = useState<"Week" | "Day">("Week");
  const [dayViewSelectedDay, setDayViewSelectedDay] = useState<string>("MON");

  // Saved / Bookmarked Routines
  const [savedRoutines, setSavedRoutines] = useState<
    Array<{ id: string; routine: GeneratedRoutineOption; name: string; date: string }>
  >([]);

  // Course Catalog Modal State
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState<boolean>(false);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState<string>("");
  const [catalogFilterTab, setCatalogFilterTab] = useState<"all" | "theory" | "lab">("all");

  // Upload Modal State (Dual-mode: File or Direct Text/HTML Paste)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [uploadTab, setUploadTab] = useState<"file" | "paste">("file");
  const [pastedText, setPastedText] = useState<string>("");
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [isCustomUpload, setIsCustomUpload] = useState<boolean>(false);
  const [customUploadName, setCustomUploadName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export Timetable Ref
  const routineContainerRef = useRef<HTMLDivElement>(null);

  // Group sections by Course Code and categorize Theory vs Lab
  const coursesCatalog = useMemo(() => {
    const map = new Map<string, { title: string; credits: number; sections: OfferedSectionItem[] }>();
    sections.forEach((s) => {
      const canonicalTitle = getSeuCourseTitle(s.courseCode, s.courseTitle);
      if (!map.has(s.courseCode)) {
        map.set(s.courseCode, {
          title: canonicalTitle,
          credits: s.credits,
          sections: [],
        });
      }
      map.get(s.courseCode)!.sections.push({
        ...s,
        courseTitle: canonicalTitle,
      });
    });

    const all = Array.from(map.entries()).map(([code, data]) => ({
      code,
      title: data.title,
      credits: data.credits,
      isLab: data.credits <= 1.5,
      sections: data.sections,
    }));

    return all.sort((a, b) => {
      if (a.isLab !== b.isLab) return a.isLab ? 1 : -1;
      return a.code.localeCompare(b.code);
    });
  }, [sections]);

  // Distinct faculties per course
  const courseFaculties = useMemo(() => {
    const map: Record<string, Array<{ initial: string; name: string }>> = {};
    coursesCatalog.forEach((c) => {
      const facMap = new Map<string, string>();
      c.sections.forEach((s) => {
        if (s.facultyInitial && s.facultyInitial !== "TBA") {
          facMap.set(s.facultyInitial, s.facultyName);
        }
      });
      map[c.code] = Array.from(facMap.entries()).map(([initial, name]) => ({ initial, name }));
    });
    return map;
  }, [coursesCatalog]);

  // Total credits of currently selected courses
  const selectedCreditsTotal = useMemo(() => {
    return selectedCourses.reduce((sum, cCode) => {
      const match = coursesCatalog.find((c) => c.code === cCode);
      return sum + (match?.credits || 3.0);
    }, 0);
  }, [selectedCourses, coursesCatalog]);

  // Handler to toggle course selection with strict 17-credit limit enforcement
  const handleToggleCourse = (courseCode: string, credits: number) => {
    const isSelected = selectedCourses.includes(courseCode);
    if (isSelected) {
      setSelectedCourses((prev) => prev.filter((code) => code !== courseCode));
    } else {
      const currentTotal = selectedCreditsTotal;
      const newTotal = currentTotal + credits;
      if (newTotal > 17) {
        toast.error(
          language === "bn"
            ? `সর্বোচ্চ ১৭ ক্রেডিট নির্বাচন করা যাবে (থিয়োরি ও ল্যাব মিলিয়ে)। ${courseCode} (${credits} Cr) যোগ করলে মোট ${newTotal} ক্রেডিট হয়ে যায়!`
            : `Maximum 17 credits allowed per semester (Theory + Lab combined). Adding ${courseCode} (${credits} Cr) exceeds 17 credits!`
        );
        return;
      }
      setSelectedCourses((prev) => [...prev, courseCode]);
    }
  };

  // Toggle preferred faculty for a course
  const handleToggleFacultyPref = (courseCode: string, initial: string) => {
    setFacultyPreferences((prev) => {
      const current = prev[courseCode] || [];
      const updated = current.includes(initial)
        ? current.filter((i) => i !== initial)
        : [...current, initial];
      return { ...prev, [courseCode]: updated };
    });
  };

  // Generate Routines Handler (Fast solver with back-to-back gap minimization)
  const handleGenerateRoutines = async () => {
    if (selectedCourses.length === 0) {
      toast.error(language === "bn" ? "কমপক্ষে ১টি কোর্স নির্বাচন করুন!" : "Please select at least 1 course!");
      return;
    }

    setGenerating(true);

    try {
      const effectiveTimePref = timePreference === "CUSTOM"
        ? `CUSTOM_${time12ToMinutes(customStartTime)}_${time12ToMinutes(customEndTime)}`
        : timePreference;

      const res = await api.advising.generateRoutine({
        selectedCourses,
        timePreference: effectiveTimePref,
        dayPreference,
        preferredDays,
        facultyPreferences,
        semester,
      });

      if (res && res.routines && res.routines.length >= 1) {
        const formatted: GeneratedRoutineOption[] = res.routines.slice(0, 10).map((r: any, idx: number) => ({
          ...r,
          rank: idx + 1,
          sections: r.sections.map((sec: any) => {
            let slots: TimeSlot[] = [];
            if (sec.scheduleJson) {
              try {
                slots = JSON.parse(sec.scheduleJson);
              } catch (e) {}
            }
            return {
              ...sec,
              slots: slots.map((sl) => ({
                ...sl,
                startMinutes: timeToMinutes(sl.start),
                endMinutes: timeToMinutes(sl.end),
              })),
            };
          }),
        }));
        setRoutines(formatted);
        setSelectedRoutineIndex(0);
        triggerSuccessFeedback(formatted.length);
        setGenerating(false);
        return;
      }
    } catch (err) {
      console.warn("Backend routine generation fallback to local solver:", err);
    }

    // Client-side solver
    runClientSideRoutineSolver();
  };

  const runClientSideRoutineSolver = () => {
    const courseSecsList: OfferedSectionItem[][] = [];
    for (const cCode of selectedCourses) {
      const pool = sections.filter((s) => s.courseCode === cCode);
      if (pool.length === 0) {
        toast.error(`No sections available for ${cCode}`);
        setGenerating(false);
        return;
      }
      courseSecsList.push(pool);
    }

    const validCombos: OfferedSectionItem[][] = [];

    const backtrack = (idx: number, current: OfferedSectionItem[]) => {
      if (validCombos.length >= 2000) return;
      if (idx === courseSecsList.length) {
        validCombos.push([...current]);
        return;
      }
      for (const candidate of courseSecsList[idx]) {
        let clash = false;
        for (const existing of current) {
          if (doSectionsClash(existing, candidate)) {
            clash = true;
            break;
          }
        }
        if (!clash) {
          current.push(candidate);
          backtrack(idx + 1, current);
          current.pop();
        }
      }
    };

    backtrack(0, []);

    if (validCombos.length === 0) {
      setRoutines([]);
      toast.error(
        language === "bn"
          ? "এই কোর্সগুলোর মধ্যে ১০০% ক্ল্যাশ-মুক্ত কোনো রুটিন তৈরি সম্ভব হয়নি। দয়া করে অন্য কোর্স নির্বাচন করুন।"
          : "No conflict-free routine possible for this combination. Please swap one course."
      );
      setGenerating(false);
      return;
    }

    // Score client combinations
    const scored: GeneratedRoutineOption[] = validCombos.map((combo) => {
      let score = 100;
      const highlights: string[] = [];
      const daySlotsMap: Record<string, TimeSlot[]> = {};
      let hasEarly = false;
      let hasLate = false;
      let morningCount = 0;
      let afternoonCount = 0;

      combo.forEach((sec) => {
        sec.slots.forEach((slot) => {
          const day = slot.day.toUpperCase();
          if (!daySlotsMap[day]) daySlotsMap[day] = [];
          daySlotsMap[day].push(slot);

          const sm = slot.startMinutes ?? timeToMinutes(slot.start);
          const em = slot.endMinutes ?? timeToMinutes(slot.end);

          if (sm < 600) hasEarly = true; // before 10:00 (e.g. 08:30)
          if (em > 990) hasLate = true;  // after 16:30 (4:30 PM)
          if (sm >= 480 && sm <= 720) morningCount++;
          if (sm >= 690 && sm <= 1080) afternoonCount++;
        });
      });

      // 1. GAP ANALYSIS & BACK-TO-BACK BONUS
      let totalGapMinutes = 0;
      let consecutiveBonus = 0;
      let longGapPenalty = 0;

      Object.entries(daySlotsMap).forEach(([day, slots]) => {
        slots.sort((a, b) => (a.startMinutes ?? 0) - (b.startMinutes ?? 0));
        for (let i = 0; i < slots.length - 1; i++) {
          const s1 = slots[i];
          const s2 = slots[i + 1];
          const gap = (s2.startMinutes ?? 0) - (s1.endMinutes ?? 0);

          if (gap <= 15) {
            consecutiveBonus += 45;
          } else if (gap <= 50) {
            consecutiveBonus += 20;
            totalGapMinutes += gap;
          } else {
            totalGapMinutes += gap;
            longGapPenalty += Math.floor(gap / 15) * 14;
          }
        }
      });

      score += consecutiveBonus;
      score -= longGapPenalty;

      // 2. PREFERRED DAYS & STRICT DAY MATCHING
      const activeDays = Object.keys(daySlotsMap);
      const dayCount = activeDays.length;
      const outsideDays = activeDays.filter((d) => !preferredDays.includes(d));
      const isStrictDayMatch = outsideDays.length === 0;

      if (isStrictDayMatch) {
        score += 160;
        highlights.push(`🎯 100% Target Days (${activeDays.join("+")})`);
      } else {
        score -= outsideDays.length * 100;
        highlights.push(`⚠️ Includes ${outsideDays.join(", ")}`);
      }

      // Campus Days bonus
      if (dayPreference === "MINIMIZE_DAYS") {
        if (dayCount <= 2) {
          score += 90;
          highlights.push(`⚡ Ultra-Compact (${dayCount} Campus Days)`);
        } else if (dayCount === 3) {
          score += 50;
          highlights.push(`🗓️ Balanced 3 Campus Days`);
        } else if (dayCount >= 5) {
          score -= 60;
        }
      } else {
        if (dayCount <= 2) {
          score += 60;
          highlights.push(`⚡ Compact (${dayCount} Days)`);
        } else if (dayCount === 3) {
          score += 35;
          highlights.push(`🗓️ Balanced 3 Days`);
        } else if (dayCount >= 5) {
          score -= 30;
        }
      }

      // 3. GAP HIGHLIGHTS
      if (totalGapMinutes === 0) {
        score += 50;
        highlights.push("⏱️ 0m Gap (Direct Back-to-Back)");
      } else if (totalGapMinutes <= 45) {
        score += 25;
        highlights.push(`⏱️ Minimal ${totalGapMinutes}m Gap`);
      } else {
        highlights.push(`⏱️ ${totalGapMinutes}m Total Gap`);
      }

      // 4. TIME PREFERENCES
      if (timePreference === "WINDOW_10_TO_1") {
        let insideCount = 0;
        let totalSlots = 0;
        combo.forEach((sec) => {
          sec.slots.forEach((s) => {
            totalSlots++;
            const sm = s.startMinutes ?? timeToMinutes(s.start);
            const em = s.endMinutes ?? timeToMinutes(s.end);
            if (sm >= 600 && em <= 780) insideCount++;
          });
        });
        if (insideCount === totalSlots) {
          score += 80;
          highlights.push("🎯 10:00 AM - 01:00 PM Fit");
        }
      } else if (timePreference === "PREFER_MORNING") {
        score += morningCount * 12;
        if (!hasEarly) score += 20;
        highlights.push("🌅 Morning Focus");
      } else if (timePreference === "PREFER_AFTERNOON") {
        score += afternoonCount * 12;
        highlights.push("☕ Afternoon Focus");
      }

      // 5. FACULTY PREFERENCES
      let facMatchCount = 0;
      combo.forEach((sec) => {
        const pref = facultyPreferences[sec.courseCode];
        if (pref && pref.includes(sec.facultyInitial)) {
          score += 35;
          facMatchCount++;
        }
      });

      if (facMatchCount === combo.length) {
        highlights.push("⭐ All Preferred Faculty Matched");
      } else if (facMatchCount > 0) {
        highlights.push(`⭐ ${facMatchCount} Preferred Faculty`);
      }

      // Credits & Score normalization
      const totalCredits = combo.reduce((sum, s) => sum + s.credits, 0);
      const matchPercentage = Math.min(100, Math.max(65, Math.round((score / 280) * 100)));

      return {
        sections: combo,
        score,
        matchPercentage,
        rank: 0,
        activeDaysCount: dayCount,
        activeDays,
        totalCredits,
        totalGapMinutes,
        facultyMatchCount: facMatchCount,
        hasEarlyMorning: hasEarly,
        hasLateEvening: hasLate,
        highlights,
      };
    });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    const topOptions = scored.slice(0, 10).map((opt, idx) => ({
      ...opt,
      rank: idx + 1,
    }));

    setRoutines(topOptions);
    setSelectedRoutineIndex(0);
    setGenerating(false);
    triggerSuccessFeedback(topOptions.length);
  };

  const triggerSuccessFeedback = (count: number) => {
    toast.success(
      language === "bn"
        ? `🎉 সেরা ${count}টি শূন্য-ক্ল্যাশ (Zero Clash) রুটিন তৈরি হয়েছে!`
        : `🎉 Generated ${count} conflict-free routine options!`
    );
    try {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (e) {}
  };

  // Run initial solve on mount if selectedCourses has courses
  useEffect(() => {
    if (sections.length > 0 && selectedCourses.length > 0 && routines.length === 0) {
      runClientSideRoutineSolver();
    }
  }, [sections]);

  // Sorted routine options according to sortBy selection
  const sortedRoutines = useMemo(() => {
    if (routines.length === 0) return [];
    const list = [...routines];
    if (sortBy === "fewest_days") {
      list.sort((a, b) => a.activeDaysCount - b.activeDaysCount || b.score - a.score);
    } else if (sortBy === "lowest_gap") {
      list.sort((a, b) => a.totalGapMinutes - b.totalGapMinutes || b.score - a.score);
    } else {
      list.sort((a, b) => b.score - a.score);
    }
    return list;
  }, [routines, sortBy]);

  // Currently active routine
  const activeRoutine = sortedRoutines[selectedRoutineIndex] || sortedRoutines[0] || null;

  // Day header span mapping for the active routine (e.g. SUN: Free, MON: 08:30-13:30)
  const dayTimeSpanMap = useMemo(() => {
    const map: Record<string, { start: string; end: string; count: number; spanText: string }> = {};
    WEEK_DAYS.forEach((d) => {
      map[d] = { start: "", end: "", count: 0, spanText: "Free" };
    });

    if (!activeRoutine) return map;

    activeRoutine.sections.forEach((sec) => {
      sec.slots.forEach((sl) => {
        const day = sl.day.toUpperCase();
        if (map[day]) {
          map[day].count++;
          const sm = sl.startMinutes ?? timeToMinutes(sl.start);
          const em = sl.endMinutes ?? timeToMinutes(sl.end);
          if (!map[day].start || sm < timeToMinutes(map[day].start)) {
            map[day].start = sl.start;
          }
          if (!map[day].end || em > timeToMinutes(map[day].end)) {
            map[day].end = sl.end;
          }
        }
      });
    });

    WEEK_DAYS.forEach((d) => {
      if (map[d].count > 0 && map[d].start && map[d].end) {
        map[d].spanText = `${map[d].start}-${map[d].end}`;
      }
    });

    return map;
  }, [activeRoutine]);

  // Check if active routine is saved
  const isCurrentRoutineSaved = useMemo(() => {
    if (!activeRoutine) return false;
    return savedRoutines.some(
      (r) =>
        r.routine.sections.length === activeRoutine.sections.length &&
        r.routine.sections.every((s) =>
          activeRoutine.sections.some(
            (os) => os.courseCode === s.courseCode && os.sectionNumber === s.sectionNumber
          )
        )
    );
  }, [savedRoutines, activeRoutine]);

  // Toggle Save Routine
  const handleToggleSaveRoutine = () => {
    if (!activeRoutine) return;
    if (isCurrentRoutineSaved) {
      setSavedRoutines((prev) =>
        prev.filter(
          (r) =>
            !(
              r.routine.sections.length === activeRoutine.sections.length &&
              r.routine.sections.every((s) =>
                activeRoutine.sections.some(
                  (os) => os.courseCode === s.courseCode && os.sectionNumber === s.sectionNumber
                )
              )
            )
        )
      );
      toast.info(language === "bn" ? "রুটিন সেভ লিস্ট থেকে মুছে ফেলা হয়েছে" : "Routine removed from Saved");
    } else {
      setSavedRoutines((prev) => [
        ...prev,
        {
          id: `routine-${Date.now()}`,
          routine: activeRoutine,
          name: `Option #${activeRoutine.rank || selectedRoutineIndex + 1}`,
          date: new Date().toLocaleDateString(),
        },
      ]);
      toast.success(language === "bn" ? "✅ রুটিন সফলভাবে সেভ হয়েছে!" : "✅ Routine saved to your list!");
    }
  };

  // Copy advising section codes
  const handleCopySectionCodes = () => {
    if (!activeRoutine) return;
    const codes = activeRoutine.sections.map((s) => `${s.courseCode}.${s.sectionNumber}`).join(", ");
    navigator.clipboard.writeText(codes);
    toast.success(
      language === "bn" ? `📋 সেকশন কোড কপি হয়েছে: ${codes}` : `📋 Copied section codes: ${codes}`
    );
  };

  // Download Class Routine as PNG
  const handleDownloadPNG = async () => {
    if (!routineContainerRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading(language === "bn" ? "রুটিন ইমেজ (PNG) তৈরি হচ্ছে..." : "Exporting Class Routine as PNG...");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(routineContainerRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#0B0F19",
        logging: false,
      });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `SEU_Class_Routine_Option_${selectedRoutineIndex + 1}_${semester.replace(/\s+/g, "_")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(
        language === "bn" ? "✅ ক্লাস রুটিন PNG ডাউনলোড সম্পন্ন হয়েছে!" : "✅ Class Routine PNG downloaded successfully!",
        { id: toastId }
      );
    } catch (err) {
      console.error("Failed to export routine PNG:", err);
      toast.error("Failed to export routine PNG.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // Print Routine
  const handlePrintRoutine = () => {
    window.print();
  };

  // Reset to official routine
  const handleResetToOfficial = () => {
    setSections(REAL_SEU_OFFERED_SECTIONS);
    setSelectedCourses(["CSE355", "CSE381", "CSE382", "CSE443", "CSE444"]);
    setIsCustomUpload(false);
    setCustomUploadName("");
    toast.success(
      language === "bn" ? "↺ বিশ্ববিদ্যালয়ের অফিসিয়াল মাস্টার রুটিনে ফিরে যাওয়া হয়েছে!" : "↺ Restored to Official SEU Routine!"
    );
  };

  // Parsing UMS HTML or raw text
  const parseRawTextOrGenericTableClient = (input: string): OfferedSectionItem[] => {
    const list: OfferedSectionItem[] = [];
    if (!input || !input.trim()) return list;

    let text = input;
    if (text.includes("<") && text.includes(">")) {
      text = text
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(?:div|p|tr|li|td)>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&nbsp;/g, " ");
    }

    const secPattern = /(?:^|[\s|,]|^)([A-Z]{3,4}\d{3})\.(\d+)(?:[\s|,]|$|:)/gm;
    const matchStarts: number[] = [];
    const courseCodes: string[] = [];
    const sectionNums: string[] = [];

    let m: RegExpExecArray | null;
    while ((m = secPattern.exec(text)) !== null) {
      matchStarts.push(m.index);
      courseCodes.push(m[1].trim().toUpperCase());
      sectionNums.push(m[2].trim());
    }

    if (matchStarts.length === 0) return list;

    const schedPattern = /(SUN|MON|TUE|WED|THU|FRI|SAT)\s*#?\s*([0-9]{1,2}:[0-9]{2})\s*(?:~|-|to)\s*([0-9]{1,2}:[0-9]{2})(?:\s*@?\s*([A-Za-z0-9_-]+))?/gi;
    const facPattern = /\[([A-Za-z0-9_-]{2,6})\]\s*([^\n\r0-9<]+)?/;
    const credPattern = /(?:^|\s)(1\.0|1\.5|2\.0|3\.0|4\.0|1|2|3|4)(?:\s|Cr|cr|Credits|\b)/;

    for (let i = 0; i < matchStarts.length; i++) {
      const start = matchStarts[i];
      const end = i + 1 < matchStarts.length ? matchStarts[i + 1] : text.length;
      const chunk = text.substring(start, end);

      const courseCode = courseCodes[i];
      const secNum = sectionNums[i];

      const slots: TimeSlot[] = [];
      let schedM: RegExpExecArray | null;
      schedPattern.lastIndex = 0;
      while ((schedM = schedPattern.exec(chunk)) !== null) {
        const day = schedM[1].toUpperCase();
        let st = schedM[2].trim();
        if (st.length === 4) st = "0" + st;
        let et = schedM[3].trim();
        if (et.length === 4) et = "0" + et;
        const rm = schedM[4] ? schedM[4].trim() : "SEU-TBA";
        slots.push({
          day,
          start: st,
          end: et,
          room: rm,
          startMinutes: timeToMinutes(st),
          endMinutes: timeToMinutes(et),
        });
      }

      if (slots.length === 0) continue;

      let facInit = "TBA";
      let facName = "To Be Announced";
      const facM = chunk.match(facPattern);
      if (facM) {
        facInit = facM[1].trim().toUpperCase();
        if (facM[2] && facM[2].trim()) {
          facName = facM[2].trim().replace(/\s+/g, " ");
        }
      }

      let credits = (courseCode.endsWith("2") || courseCode.endsWith("4") || courseCode.endsWith("6") || courseCode.endsWith("8")) ? 1.0 : 3.0;
      const credM = chunk.match(credPattern);
      if (credM) {
        const parsedCred = parseFloat(credM[1]);
        if (!isNaN(parsedCred)) credits = parsedCred;
      }

      const title = getSeuCourseTitle(courseCode, "");

      list.push({
        courseCode,
        sectionNumber: secNum,
        courseTitle: title,
        credits,
        facultyInitial: facInit,
        facultyName: facName,
        availableSeats: 40,
        scheduleText: slots.map((s) => `${s.day} # ${s.start} ~ ${s.end} @ ${s.room}`).join(" / "),
        slots,
        semester,
      });
    }

    return list;
  };

  const parseHtmlClientSide = (html: string): OfferedSectionItem[] => {
    let list: OfferedSectionItem[] = [];
    if (html.includes("ums-grid-offered-section")) {
      const blocks = html.split("ums-grid-offered-section");

      const secPattern = /(?:class="[^"]*mat-mdc-tooltip-trigger[^"]*"[^>]*>|>)\s*([A-Z]{3}\d{3}\.\d+)\s*</;
      const titlePattern = /hidden md:block[^"]*">[\s\S]*?<div[^>]*>([^<]+)<\/div>/;
      const credPattern = /ml-3[^"]*">([0-9.]+)</;
      const facPattern = /\[([A-Za-z0-9_-]+)\]\s*([^<]+)</;
      const schedPattern = /(SUN|MON|TUE|WED|THU|FRI|SAT)\s*#\s*([0-9]{2}:[0-9]{2})\s*~\s*([0-9]{2}:[0-9]{2})\s*@\s*([A-Za-z0-9_-]+)/g;

      for (let i = 1; i < blocks.length; i++) {
        const chunk = blocks[i].slice(0, 3000);
        const secM = chunk.match(secPattern);
        if (!secM) continue;
        const fullSec = secM[1].trim();
        const [courseCode, secNum] = fullSec.split(".");

        const titleM = chunk.match(titlePattern);
        const rawTitle = titleM ? titleM[1].trim() : courseCode;
        const title = getSeuCourseTitle(courseCode, rawTitle.replace(/&amp;/g, "&").trim());

        const credM = chunk.match(credPattern);
        const credits = credM ? parseFloat(credM[1].trim()) : 3.0;

        const facM = chunk.match(facPattern);
        const facInit = facM ? facM[1].trim().toUpperCase() : "TBA";
        const facName = facM ? facM[2].trim().replace(/\s+/g, " ") : "To Be Announced";

        const slots: TimeSlot[] = [];
        let match: RegExpExecArray | null;
        while ((match = schedPattern.exec(chunk)) !== null) {
          slots.push({
            day: match[1].toUpperCase(),
            start: match[2],
            end: match[3],
            room: match[4],
            startMinutes: timeToMinutes(match[2]),
            endMinutes: timeToMinutes(match[3]),
          });
        }

        if (slots.length > 0) {
          list.push({
            courseCode,
            sectionNumber: secNum,
            courseTitle: title,
            credits,
            facultyInitial: facInit,
            facultyName: facName,
            scheduleText: slots.map((s) => `${s.day} # ${s.start} ~ ${s.end} @ ${s.room}`).join(" / "),
            slots,
            semester,
          });
        }
      }
    }

    if (list.length === 0) {
      list = parseRawTextOrGenericTableClient(html);
    }

    return list;
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setUploadingFile(true);
    try {
      const text = await file.text();
      const parsedList = parseHtmlClientSide(text);
      if (parsedList.length > 0) {
        setSections(parsedList);
        setIsCustomUpload(true);
        setCustomUploadName(file.name);
        setSelectedCourses(parsedList.slice(0, 5).map((s) => s.courseCode));
        toast.success(`Loaded ${parsedList.length} sections from ${file.name}!`);
        setIsUploadModalOpen(false);
      } else {
        toast.error("Could not extract sections from file.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process file.");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleApplyPastedText = async () => {
    if (!pastedText.trim()) return;
    setUploadingFile(true);
    try {
      const parsedList = parseHtmlClientSide(pastedText);
      if (parsedList.length > 0) {
        setSections(parsedList);
        setIsCustomUpload(true);
        setCustomUploadName(`Pasted Table (${parsedList.length} sections)`);
        setSelectedCourses(parsedList.slice(0, 5).map((s) => s.courseCode));
        toast.success(`Loaded ${parsedList.length} sections from pasted text!`);
        setIsUploadModalOpen(false);
        setPastedText("");
      } else {
        toast.error("Could not detect valid course sections.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to parse text.");
    } finally {
      setUploadingFile(false);
    }
  };

  // Filtered sidebar selected courses
  const filteredSidebarCourses = useMemo(() => {
    if (!sidebarCourseSearch.trim()) return selectedCourses;
    const q = sidebarCourseSearch.toLowerCase();
    return selectedCourses.filter((code) => {
      const cObj = coursesCatalog.find((c) => c.code === code);
      const title = cObj?.title || "";
      const facs = courseFaculties[code]?.map((f) => f.initial.toLowerCase()).join(" ") || "";
      return code.toLowerCase().includes(q) || title.toLowerCase().includes(q) || facs.includes(q);
    });
  }, [selectedCourses, sidebarCourseSearch, coursesCatalog, courseFaculties]);

  // Catalog filtered list for Modal
  const catalogModalCourses = useMemo(() => {
    let list = coursesCatalog;
    if (catalogFilterTab === "theory") list = list.filter((c) => !c.isLab);
    if (catalogFilterTab === "lab") list = list.filter((c) => c.isLab);
    if (!catalogSearchQuery.trim()) return list;
    const q = catalogSearchQuery.toLowerCase();
    return list.filter((c) => c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q));
  }, [coursesCatalog, catalogFilterTab, catalogSearchQuery]);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* ========================================================================= */}
      {/* 1. TOP NAVBAR (Exact match to seu-routine-builder.ai.studio)              */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 text-white font-black text-base">
            S
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>SEU Routine Builder</span>
            </h1>
            <p className="text-[11px] font-mono text-slate-400">
              Southeast University Advising Engine
            </p>
          </div>
        </div>

        {/* Center Tabs: Routine | Compare | Saved (X) */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-900 border border-slate-800 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveAppTab("routine")}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeAppTab === "routine"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Routine
          </button>
          <button
            type="button"
            onClick={() => setActiveAppTab("compare")}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeAppTab === "compare"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Compare
          </button>
          <button
            type="button"
            onClick={() => setActiveAppTab("saved")}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeAppTab === "saved"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Saved</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                savedRoutines.length > 0 ? "bg-amber-500 text-black" : "bg-slate-800 text-slate-400"
              }`}
            >
              {savedRoutines.length}
            </span>
          </button>
        </div>

        {/* Right CTA: Advising Data Button */}
        <div className="flex items-center gap-2.5">
          {isCustomUpload && (
            <button
              type="button"
              onClick={handleResetToOfficial}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="Reset to official master routine"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Reset to Official</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Advising Data</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MAIN ROUTINE BUILDER (Exact 2-Column Demo Layout)                  */}
      {/* ========================================================================= */}
      {activeAppTab === "routine" && (
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] xl:grid-cols-[360px_1fr] gap-5 items-start">
          {/* ===================================================================== */}
          {/* LEFT SIDEBAR (~350px)                                                 */}
          {/* ===================================================================== */}
          <div className="space-y-4">
            {/* Top Purple CTA Button: Re-Build Routine */}
            <button
              type="button"
              onClick={handleGenerateRoutines}
              disabled={generating || selectedCourses.length === 0}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white font-black text-sm shadow-xl shadow-purple-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40"
            >
              <Sparkles className={`w-4 h-4 text-purple-200 ${generating ? "animate-spin" : ""}`} />
              <span>{generating ? "Solving Zero-Clash Routines..." : "Re-Build Routine"}</span>
            </button>

            {/* PREFERENCES Card */}
            <div className="rounded-2xl bg-[#0d1322] border border-slate-800/90 p-4 space-y-4 shadow-xl">
              <div className="flex items-center justify-between text-xs font-mono font-bold tracking-wider text-slate-400 uppercase">
                <span>PREFERENCES</span>
                <button
                  type="button"
                  onClick={() => {
                    setTimePreference("ANY");
                    setDayPreference("COMPACT_GAPS");
                    setPreferredDays(["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]);
                    setFacultyPreferences({});
                  }}
                  className="text-[11px] font-sans font-normal text-slate-500 hover:text-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Time Slot (2x2 Grid) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Time Slot</span>
                  <button
                    type="button"
                    onClick={() => setShowCustomTimeInput(!showCustomTimeInput)}
                    className="text-[10px] text-indigo-400 hover:underline cursor-pointer"
                  >
                    {showCustomTimeInput ? "Presets" : "Custom Window"}
                  </button>
                </div>

                {!showCustomTimeInput ? (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "ANY", label: "Any Time" },
                      { id: "PREFER_MORNING", label: "Morning" },
                      { id: "WINDOW_10_TO_1", label: "Late Morning" },
                      { id: "PREFER_AFTERNOON", label: "Afternoon" },
                    ].map((slot) => {
                      const isActive = timePreference === slot.id;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setTimePreference(slot.id)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-center border ${
                            isActive
                              ? "bg-indigo-600 text-white border-indigo-400/40 shadow-md shadow-indigo-500/25"
                              : "bg-slate-850/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800"
                          }`}
                        >
                          {slot.label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <span className="text-[11px] text-slate-400 block font-mono">Custom 12-Hour Window:</span>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={customStartTime}
                        onChange={(e) => {
                          setCustomStartTime(e.target.value);
                          setTimePreference("CUSTOM");
                        }}
                        className="text-xs bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-white"
                      >
                        {["08:00 AM", "08:30 AM", "10:00 AM", "11:30 AM", "01:30 PM", "03:00 PM"].map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <select
                        value={customEndTime}
                        onChange={(e) => {
                          setCustomEndTime(e.target.value);
                          setTimePreference("CUSTOM");
                        }}
                        className="text-xs bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-white"
                      >
                        {["11:30 AM", "01:00 PM", "02:50 PM", "04:30 PM", "06:00 PM"].map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Time Gap (Segmented Pills: No Gap vs No Problem) */}
              <div className="space-y-2">
                <span className="text-xs text-slate-400 block">Time Gap</span>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-900/90 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setDayPreference("COMPACT_GAPS")}
                    className={`py-2 px-3 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      dayPreference === "COMPACT_GAPS"
                        ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    No Gap
                  </button>
                  <button
                    type="button"
                    onClick={() => setDayPreference("ANY")}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      dayPreference === "ANY"
                        ? "bg-slate-700 text-white shadow-md"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    No Problem
                  </button>
                </div>
              </div>

              {/* Preferred Days (7 rounded pills, cyan highlighted when active) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Preferred Days</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (preferredDays.length === 7) {
                        setPreferredDays(["SUN", "MON", "TUE", "WED"]);
                      } else {
                        setPreferredDays(["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]);
                      }
                    }}
                    className="text-cyan-400 hover:underline cursor-pointer text-[11px] font-semibold"
                  >
                    {preferredDays.length === 7 ? "Reset" : "All Days"}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-1">
                  {WEEK_DAYS.map((day) => {
                    const isSelected = preferredDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          setPreferredDays((prev) =>
                            prev.includes(day)
                              ? prev.length > 1
                                ? prev.filter((d) => d !== day)
                                : prev
                              : [...prev, day]
                          );
                        }}
                        className={`w-9 h-9 rounded-xl text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center justify-center border ${
                          isSelected
                            ? "bg-cyan-400 text-slate-950 border-cyan-300 shadow-md shadow-cyan-400/20 font-black scale-[1.02]"
                            : "bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200 hover:border-slate-600"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* COURSES Card */}
            <div className="rounded-2xl bg-[#0d1322] border border-slate-800/90 p-4 space-y-3.5 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold tracking-wider text-slate-300 uppercase">
                    COURSES ({selectedCourses.length})
                  </span>
                  <span
                    className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      selectedCreditsTotal >= 17
                        ? "bg-amber-950 text-amber-300 border-amber-500/50"
                        : "bg-slate-800 text-slate-300 border-slate-700"
                    }`}
                  >
                    {selectedCreditsTotal}/17 Cr
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCatalogModalOpen(true)}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Catalog</span>
                </button>
              </div>

              {/* Course Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={sidebarCourseSearch}
                  onChange={(e) => setSidebarCourseSearch(e.target.value)}
                  placeholder="Search courses or faculty..."
                  className="w-full text-xs py-2 pl-8 pr-7 rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {sidebarCourseSearch && (
                  <button
                    type="button"
                    onClick={() => setSidebarCourseSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Selected Courses List */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-0.5">
                {filteredSidebarCourses.length === 0 ? (
                  <div className="text-center py-6 space-y-2 text-slate-500">
                    <p className="text-xs">No courses selected.</p>
                    <button
                      type="button"
                      onClick={() => setIsCatalogModalOpen(true)}
                      className="text-xs text-indigo-400 hover:underline font-bold"
                    >
                      Browse Catalog to Add Courses
                    </button>
                  </div>
                ) : (
                  filteredSidebarCourses.map((cCode) => {
                    const cObj = coursesCatalog.find((c) => c.code === cCode);
                    const theme = getCourseTheme(cCode);
                    const isExpanded = expandedFacultyCourse === cCode;
                    const preferredFacs = facultyPreferences[cCode] || [];
                    const facList = courseFaculties[cCode] || [];

                    return (
                      <div
                        key={cCode}
                        className={`rounded-xl border p-2.5 bg-gradient-to-r ${theme.sidebarBg} transition-all space-y-1.5`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Checkbox (toggle) */}
                            <button
                              type="button"
                              onClick={() => handleToggleCourse(cCode, cObj?.credits || 3.0)}
                              className="w-4 h-4 rounded-md bg-indigo-600 border border-indigo-500 text-white flex items-center justify-center shrink-0 cursor-pointer"
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                            </button>

                            {/* Code */}
                            <span className="font-mono font-black text-xs text-white">
                              {cCode}
                            </span>

                            {/* Faculty badges preview */}
                            {facList.length > 0 && (
                              <div
                                onClick={() =>
                                  setExpandedFacultyCourse(isExpanded ? null : cCode)
                                }
                                className="flex items-center gap-1 text-[10px] font-mono text-amber-300/90 truncate cursor-pointer hover:underline"
                                title="Click to pick preferred faculty"
                              >
                                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400 shrink-0" />
                                <span>
                                  {preferredFacs.length > 0
                                    ? preferredFacs.join(", ")
                                    : facList.slice(0, 3).map((f) => f.initial).join(", ")}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {facList.length > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedFacultyCourse(isExpanded ? null : cCode)
                                }
                                className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
                                title="Pick faculty"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleToggleCourse(cCode, cObj?.credits || 3.0)}
                              className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer transition-colors"
                              title={`Remove ${cCode}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Title */}
                        <p className="text-[11px] font-bold text-slate-300 truncate" title={cObj?.title}>
                          {cObj?.title || cCode}
                        </p>

                        {/* Expandable Faculty Picker */}
                        {isExpanded && facList.length > 0 && (
                          <div className="pt-2 border-t border-slate-800/80 space-y-1.5 animate-in fade-in duration-150">
                            <span className="text-[10px] text-slate-400 font-mono block">
                              Select preferred teachers for {cCode}:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {facList.map((f) => {
                                const isFav = preferredFacs.includes(f.initial);
                                return (
                                  <button
                                    key={f.initial}
                                    type="button"
                                    onClick={() => handleToggleFacultyPref(cCode, f.initial)}
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                                      isFav
                                        ? "bg-amber-500 text-black border-amber-400 font-black shadow-sm"
                                        : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                                    }`}
                                  >
                                    <Star className={`w-2.5 h-2.5 ${isFav ? "fill-black" : "text-slate-400"}`} />
                                    <span>[{f.initial}]</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* RIGHT MAIN AREA: TIMETABLE & ROUTINE CONTROLS                         */}
          {/* ===================================================================== */}
          <div className="space-y-4">
            {/* Top Toolbar Bar */}
            <div className="rounded-2xl bg-[#0d1322] border border-slate-800/90 p-3 flex flex-wrap items-center justify-between gap-3 shadow-xl">
              {/* Routine Pagination & Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1 rounded-xl bg-slate-900 border border-slate-800 p-0.5">
                  <button
                    type="button"
                    onClick={() => setSelectedRoutineIndex((prev) => Math.max(0, prev - 1))}
                    disabled={selectedRoutineIndex === 0}
                    className="p-1 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                    title="Previous Routine"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono font-bold text-slate-200 px-2 shrink-0">
                    Routine {selectedRoutineIndex + 1} / {sortedRoutines.length || 1}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedRoutineIndex((prev) => Math.min(sortedRoutines.length - 1, prev + 1))
                    }
                    disabled={selectedRoutineIndex >= sortedRoutines.length - 1}
                    className="p-1 rounded-lg text-slate-300 hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                    title="Next Routine"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Direct #1 to #10 Pills */}
                <div className="hidden sm:flex items-center gap-1">
                  {sortedRoutines.slice(0, 10).map((r, idx) => {
                    const isSelected = selectedRoutineIndex === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedRoutineIndex(idx)}
                        className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-indigo-600 text-white font-black shadow-md shadow-indigo-500/30 scale-105"
                            : "bg-slate-850 text-slate-400 hover:text-white hover:bg-slate-800"
                        }`}
                      >
                        #{idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Controls on the Right: Sort, View Switcher & Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Sort dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-xs font-bold py-1.5 px-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 cursor-pointer focus:outline-none"
                >
                  <option value="fewest_days">Fewest Days</option>
                  <option value="lowest_gap">Lowest Gap</option>
                  <option value="highest_score">Highest Score</option>
                </select>

                {/* Week / Day view toggle */}
                <div className="inline-flex rounded-xl bg-slate-900 border border-slate-800 p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode("Week")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewMode === "Week"
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("Day")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewMode === "Day"
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Day
                  </button>
                </div>

                {/* Save Routine */}
                <button
                  type="button"
                  onClick={handleToggleSaveRoutine}
                  className={`p-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    isCurrentRoutineSaved
                      ? "bg-amber-500 text-black border-amber-400 font-black shadow-md shadow-amber-500/20"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white"
                  }`}
                  title={isCurrentRoutineSaved ? "Saved" : "Save this routine"}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Save</span>
                </button>

                {/* PNG Download */}
                <button
                  type="button"
                  onClick={handleDownloadPNG}
                  disabled={isExporting}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Download Routine Image (PNG)"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>PNG</span>
                </button>

                {/* Print */}
                <button
                  type="button"
                  onClick={handlePrintRoutine}
                  className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs transition-all cursor-pointer"
                  title="Print Timetable"
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>

                {/* Copy Section Codes */}
                <button
                  type="button"
                  onClick={handleCopySectionCodes}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Copy Advising Section Codes"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Copy Codes</span>
                </button>
              </div>
            </div>

            {/* Active Routine Highlights Strip */}
            {activeRoutine && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#0d1322] border border-slate-800/80 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-black text-indigo-300">
                    #{selectedRoutineIndex + 1} Option {selectedRoutineIndex + 1}
                  </span>
                  <span className="text-emerald-400 font-bold">
                    {activeRoutine.matchPercentage}% Efficiency Score
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-300">
                    {activeRoutine.totalGapMinutes === 0
                      ? "0m Gap (Direct Back-to-Back)"
                      : `${activeRoutine.totalGapMinutes}m Total Gap`}
                  </span>
                  {activeRoutine.facultyMatchCount > 0 && (
                    <>
                      <span className="text-slate-400">•</span>
                      <span className="text-amber-300 font-semibold">
                        ⭐ {activeRoutine.facultyMatchCount} Preferred Faculty
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
                  <span>{activeRoutine.totalCredits} Credits</span>
                  <span>
                    {activeRoutine.activeDaysCount} Campus Days ({activeRoutine.activeDays.join(", ")})
                  </span>
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* VERTICAL-TIME TIMETABLE GRID (Traditional 7-Day Timetable)        */}
            {/* ================================================================= */}
            <div
              ref={routineContainerRef}
              id="seu-routine-timetable-sheet"
              className="rounded-2xl bg-[#0a0e1a] border border-slate-800/90 shadow-2xl overflow-hidden p-4 space-y-2 backdrop-blur-xl"
            >
              {/* Day view selector when Day mode is active */}
              {viewMode === "Day" && (
                <div className="flex items-center gap-1.5 pb-2 border-b border-slate-800">
                  <span className="text-xs text-slate-400 font-mono mr-2">Select Day:</span>
                  {WEEK_DAYS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDayViewSelectedDay(d)}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        dayViewSelectedDay === d
                          ? "bg-indigo-600 text-white shadow-md"
                          : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}

              {/* Scrollable Timetable Area */}
              <div className="overflow-x-auto">
                <div className="min-w-[760px]">
                  {/* Grid Header: TIME + 7 Days */}
                  <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-slate-800/90 pb-2.5 text-center">
                    <div className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider self-center">
                      TIME
                    </div>
                    {WEEK_DAYS.map((day) => {
                      const isFree = dayTimeSpanMap[day]?.spanText === "Free";
                      const isVisibleInDayView = viewMode === "Week" || dayViewSelectedDay === day;
                      return (
                        <div
                          key={day}
                          className={`space-y-0.5 px-1 ${!isVisibleInDayView && viewMode === "Day" ? "opacity-20" : ""}`}
                        >
                          <div className="text-xs font-black text-slate-200">{day}</div>
                          <div
                            className={`text-[10px] font-mono font-semibold truncate ${
                              isFree ? "text-slate-500" : "text-indigo-400"
                            }`}
                          >
                            {dayTimeSpanMap[day]?.spanText || "Free"}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Timetable Body (Vertical Time from 08:00 to 18:00) */}
                  <div className="relative flex min-h-[580px] pt-1">
                    {/* Left Column: 10 Hour Markers (58px each) */}
                    <div className="w-[64px] shrink-0 flex flex-col justify-between py-1 select-none pr-2">
                      {TIME_HOURS.map((hr) => (
                        <div
                          key={hr}
                          className="h-[58px] text-[11px] font-mono text-slate-500 text-right leading-none -mt-1.5"
                        >
                          {hr}
                        </div>
                      ))}
                    </div>

                    {/* Right Columns Area (7 Days) */}
                    <div className="flex-1 grid grid-cols-7 relative border-l border-slate-800/60">
                      {/* 10 Horizontal Grid Guide Lines */}
                      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
                        {TIME_HOURS.map((hr, idx) => (
                          <div
                            key={hr}
                            className={`w-full border-t border-slate-800/40 ${idx === 0 ? "border-transparent" : ""}`}
                            style={{ height: "58px" }}
                          />
                        ))}
                      </div>

                      {/* Day Columns */}
                      {WEEK_DAYS.map((day) => {
                        const daySlots =
                          activeRoutine?.sections.flatMap((sec) =>
                            sec.slots
                              .filter((sl) => sl.day.toUpperCase() === day)
                              .map((sl) => ({ sec, slot: sl }))
                          ) || [];

                        const isVisible = viewMode === "Week" || dayViewSelectedDay === day;

                        return (
                          <div
                            key={day}
                            className={`relative h-[580px] border-r border-slate-800/40 last:border-r-0 transition-colors ${
                              !isVisible && viewMode === "Day" ? "opacity-15 pointer-events-none" : "hover:bg-slate-850/20"
                            }`}
                          >
                            {/* Class Cards */}
                            {daySlots.map(({ sec, slot }) => {
                              const sm = slot.startMinutes ?? timeToMinutes(slot.start);
                              const em = slot.endMinutes ?? timeToMinutes(slot.end);
                              const clampedStart = Math.max(TIMELINE_START_MINUTES, Math.min(TIMELINE_END_MINUTES, sm));
                              const clampedEnd = Math.max(TIMELINE_START_MINUTES, Math.min(TIMELINE_END_MINUTES, em));
                              const topPct = ((clampedStart - TIMELINE_START_MINUTES) / TIMELINE_TOTAL_MINUTES) * 100;
                              const heightPct = Math.max(((clampedEnd - clampedStart) / TIMELINE_TOTAL_MINUTES) * 100, 7.5);
                              const theme = getCourseTheme(sec.courseCode);

                              return (
                                <div
                                  key={`${sec.courseCode}-${sec.sectionNumber}-${slot.day}-${slot.start}`}
                                  style={{
                                    top: `${topPct}%`,
                                    height: `${heightPct}%`,
                                    left: "3px",
                                    right: "3px",
                                  }}
                                  className={`absolute rounded-xl border p-2 flex flex-col justify-between overflow-hidden shadow-lg transition-all group hover:z-20 hover:scale-[1.02] cursor-pointer ${theme.cardBg} ${theme.border} backdrop-blur-md`}
                                >
                                  {/* Top Row: Course Code + Section + Lock */}
                                  <div className="flex items-center justify-between gap-1 leading-none">
                                    <span className="font-mono font-black text-[11px] sm:text-xs text-white truncate">
                                      {sec.courseCode}.{sec.sectionNumber}
                                    </span>
                                    <Lock className="w-2.5 h-2.5 text-slate-400 group-hover:text-amber-400 shrink-0" />
                                  </div>

                                  {/* Course Title */}
                                  <p
                                    className="text-[10px] sm:text-[11px] font-semibold text-slate-200 line-clamp-1 leading-tight"
                                    title={sec.courseTitle}
                                  >
                                    {sec.courseTitle}
                                  </p>

                                  {/* Time & Room */}
                                  <div className="flex flex-wrap items-center justify-between gap-1 text-[9px] font-mono leading-none pt-0.5">
                                    <span className="text-slate-300">
                                      {slot.start} - {slot.end}
                                    </span>
                                    <span className="font-bold text-amber-300/90 truncate max-w-[65px]" title={slot.room}>
                                      {slot.room || "@SEU"}
                                    </span>
                                  </div>

                                  {/* Faculty badge */}
                                  {sec.facultyInitial && sec.facultyInitial !== "TBA" && (
                                    <div className="absolute right-1 bottom-1 text-[9px] font-mono font-bold px-1 rounded bg-black/50 text-indigo-300 border border-indigo-500/30">
                                      [{sec.facultyInitial}]
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: COMPARE VIEW                                                       */}
      {/* ========================================================================= */}
      {activeAppTab === "compare" && (
        <div className="rounded-2xl bg-[#0d1322] border border-slate-800 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-white">Compare Generated Routines</h2>
              <p className="text-xs text-slate-400">
                Side-by-side comparison of the top ranked clash-free routine options.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveAppTab("routine")}
              className="text-xs font-bold text-indigo-400 hover:underline cursor-pointer"
            >
              ← Back to Timetable
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedRoutines.slice(0, 6).map((routine, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border transition-all space-y-3 cursor-pointer ${
                  selectedRoutineIndex === idx
                    ? "bg-indigo-950/40 border-indigo-500/80 shadow-lg shadow-indigo-500/10"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                }`}
                onClick={() => {
                  setSelectedRoutineIndex(idx);
                  setActiveAppTab("routine");
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-sm text-white">
                    Option #{idx + 1}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
                    {routine.matchPercentage}% Score
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Campus Days:</span>
                    <span className="font-mono font-bold">{routine.activeDaysCount} Days ({routine.activeDays.join(", ")})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Time Gap:</span>
                    <span className="font-mono font-bold">{routine.totalGapMinutes} mins</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Preferred Faculty:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {routine.facultyMatchCount} matches
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono">{routine.sections.length} courses</span>
                  <span className="text-indigo-400 font-bold hover:underline">
                    View in Timetable →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SAVED ROUTINES                                                     */}
      {/* ========================================================================= */}
      {activeAppTab === "saved" && (
        <div className="rounded-2xl bg-[#0d1322] border border-slate-800 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-white">Saved Routines ({savedRoutines.length})</h2>
              <p className="text-xs text-slate-400">
                Bookmarked routine combinations saved for this session.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveAppTab("routine")}
              className="text-xs font-bold text-indigo-400 hover:underline cursor-pointer"
            >
              ← Back to Timetable
            </button>
          </div>

          {savedRoutines.length === 0 ? (
            <div className="text-center py-12 space-y-3 text-slate-500">
              <Bookmark className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-sm font-bold text-slate-400">No saved routines yet.</p>
              <p className="text-xs">
                Click the <strong>[ Save ]</strong> button on any generated routine option to bookmark it here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedRoutines.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-sm text-white">
                      {item.name}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSavedRoutines((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="p-1 rounded text-slate-500 hover:text-rose-400 cursor-pointer"
                      title="Remove saved routine"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1 text-xs text-slate-300">
                    <p className="font-mono text-slate-400">
                      Courses: {item.routine.sections.map((s) => `${s.courseCode}.${s.sectionNumber}`).join(", ")}
                    </p>
                    <p>
                      <strong>{item.routine.activeDaysCount} Days:</strong> {item.routine.activeDays.join(", ")}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        const targetIdx = sortedRoutines.findIndex(
                          (r) =>
                            r.sections.length === item.routine.sections.length &&
                            r.sections.every((s) =>
                              item.routine.sections.some(
                                (os) => os.courseCode === s.courseCode && os.sectionNumber === s.sectionNumber
                              )
                            )
                        );
                        if (targetIdx >= 0) setSelectedRoutineIndex(targetIdx);
                        setActiveAppTab("routine");
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      Open in Timetable
                    </button>
                    <span className="text-[10px] font-mono text-slate-500">{item.date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: COURSE CATALOG MODAL (Add / Remove Courses with 17-Cr limit)      */}
      {/* ========================================================================= */}
      {isCatalogModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl rounded-3xl bg-[#0d1322] border border-slate-800 p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                  <span>Course Catalog ({semester})</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Select Theory and Lab courses to build your routine (Max 17 Credits combined).
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${
                    selectedCreditsTotal >= 17
                      ? "bg-amber-950 text-amber-300 border-amber-500/50"
                      : "bg-slate-800 text-slate-300 border-slate-700"
                  }`}
                >
                  {selectedCreditsTotal} / 17 Credits Selected
                </span>
                <button
                  type="button"
                  onClick={() => setIsCatalogModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-xl bg-slate-900 border border-slate-800 p-1">
                {(["all", "theory", "lab"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setCatalogFilterTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer uppercase ${
                      catalogFilterTab === tab
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {tab === "all" ? `All (${coursesCatalog.length})` : tab === "theory" ? "Theory" : "Lab"}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[240px] flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={catalogSearchQuery}
                  onChange={(e) => setCatalogSearchQuery(e.target.value)}
                  placeholder="Search by code or title (e.g. CSE355, Algorithm)..."
                  className="w-full text-xs py-2 pl-9 pr-7 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {catalogSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setCatalogSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Courses Grid */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {catalogModalCourses.map((c) => {
                  const isSelected = selectedCourses.includes(c.code);
                  const wouldExceed = !isSelected && selectedCreditsTotal + c.credits > 17;

                  return (
                    <div
                      key={c.code}
                      onClick={() => !wouldExceed && handleToggleCourse(c.code, c.credits)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? "bg-indigo-950/60 border-indigo-500/80 shadow-md shadow-indigo-500/10"
                          : wouldExceed
                          ? "bg-slate-900/30 border-slate-800/60 opacity-50 cursor-not-allowed"
                          : "bg-slate-850/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-white">{c.code}</span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {c.credits} Cr
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {c.sections.length} sec
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-200 truncate" title={c.title}>
                          {c.title}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={wouldExceed}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                          isSelected
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30"
                            : wouldExceed
                            ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md"
                        }`}
                      >
                        {isSelected ? "Remove" : wouldExceed ? ">17 Cr" : "+ Add"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {selectedCourses.length} courses selected • {selectedCreditsTotal} / 17 credits
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsCatalogModalOpen(false);
                  handleGenerateRoutines();
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
              >
                Done & Re-Build Routine 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADVISING DATA MODAL (Upload UMS HTML or Paste table)             */}
      {/* ========================================================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-3xl bg-[#0d1322] border border-slate-800 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-indigo-400" />
                  <span>Advising Data Upload</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Upload .html file from UMS or paste copied table text directly.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800">
              <button
                type="button"
                onClick={() => setUploadTab("file")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  uploadTab === "file" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"
                }`}
              >
                Upload .html File
              </button>
              <button
                type="button"
                onClick={() => setUploadTab("paste")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  uploadTab === "paste" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-white"
                }`}
              >
                Paste Table / HTML
              </button>
            </div>

            {/* Tab 1: File */}
            {uploadTab === "file" && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-850/40 hover:bg-slate-850/80 transition-all text-center space-y-3 cursor-pointer"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".html,.htm"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                  }}
                  className="hidden"
                />
                <FileText className="w-9 h-9 text-slate-400 mx-auto" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-200">
                    Click to browse or drop .html file
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">Supports SEU UMS advising HTML</p>
                </div>
              </div>
            )}

            {/* Tab 2: Paste */}
            {uploadTab === "paste" && (
              <div className="space-y-3">
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste copied UMS advising table text or HTML source code here...&#10;&#10;Supported formats:&#10;• Full HTML source from ums.seu.edu.bd&#10;• Plain-text rows copied directly from browser (e.g. CSE355.1 Image Processing 3.0 [JAR] SUN # 10:00 ~ 11:20 @ SEU527 / TUE # 10:00 ~ 11:20 @ SEU527)&#10;• seu-routine-builder format"
                  rows={6}
                  className="w-full text-xs font-mono p-3 rounded-2xl bg-slate-800/70 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed resize-none"
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-mono text-slate-400">
                    {pastedText.length > 0 ? `${pastedText.length.toLocaleString()} characters entered` : "Supports plain text or HTML"}
                  </span>
                  <button
                    type="button"
                    onClick={handleApplyPastedText}
                    disabled={uploadingFile || !pastedText.trim()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${uploadingFile ? "animate-spin" : ""}`} />
                    <span>{uploadingFile ? "Parsing..." : "Parse & Apply Schedule"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Private Student Sandbox Note */}
            <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-900/60 text-xs text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-indigo-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Private Student Sandbox Guarantee</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Your uploaded schedule is processed inside your personal browser session. It will never alter the university master catalog.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
