"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import AdvisingDataModal from "@/components/AdvisingDataModal";
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
  Zap,
  FileCode,
  UploadCloud,
  RotateCcw,
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

// Course themes
const COURSE_THEMES: Record<string, { bg: string; border: string; text: string; badge: string; dot: string }> = {
  CSE355: {
    bg: "from-blue-900/80 to-blue-950/90",
    border: "border-blue-500/50 hover:border-blue-400",
    text: "text-blue-200",
    badge: "bg-blue-950 text-blue-300 border-blue-800",
    dot: "bg-blue-400",
  },
  CSE381: {
    bg: "from-indigo-900/80 to-indigo-950/90",
    border: "border-indigo-500/50 hover:border-indigo-400",
    text: "text-indigo-200",
    badge: "bg-indigo-950 text-indigo-300 border-indigo-800",
    dot: "bg-indigo-400",
  },
  CSE382: {
    bg: "from-cyan-900/80 to-cyan-950/90",
    border: "border-cyan-500/50 hover:border-cyan-400",
    text: "text-cyan-200",
    badge: "bg-cyan-950 text-cyan-300 border-cyan-800",
    dot: "bg-cyan-400",
  },
  CSE443: {
    bg: "from-purple-900/80 to-purple-950/90",
    border: "border-purple-500/50 hover:border-purple-400",
    text: "text-purple-200",
    badge: "bg-purple-950 text-purple-300 border-purple-800",
    dot: "bg-purple-400",
  },
  CSE444: {
    bg: "from-pink-900/80 to-pink-950/90",
    border: "border-pink-500/50 hover:border-pink-400",
    text: "text-pink-200",
    badge: "bg-pink-950 text-pink-300 border-pink-800",
    dot: "bg-pink-400",
  },
  CSE181: {
    bg: "from-emerald-900/80 to-emerald-950/90",
    border: "border-emerald-500/50 hover:border-emerald-400",
    text: "text-emerald-200",
    badge: "bg-emerald-950 text-emerald-300 border-emerald-800",
    dot: "bg-emerald-400",
  },
  CSE241: {
    bg: "from-amber-900/80 to-amber-950/90",
    border: "border-amber-500/50 hover:border-amber-400",
    text: "text-amber-200",
    badge: "bg-amber-950 text-amber-300 border-amber-800",
    dot: "bg-amber-400",
  },
  CSE265: {
    bg: "from-teal-900/80 to-teal-950/90",
    border: "border-teal-500/50 hover:border-teal-400",
    text: "text-teal-200",
    badge: "bg-teal-950 text-teal-300 border-teal-800",
    dot: "bg-teal-400",
  },
};

const DEFAULT_THEME = {
  bg: "from-slate-800/80 to-slate-900/90",
  border: "border-slate-600 hover:border-slate-500",
  text: "text-slate-200",
  badge: "bg-slate-900 text-slate-300 border-slate-700",
  dot: "bg-slate-400",
};

const WEEK_DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const TIMELINE_START_MINUTES = 480; // 08:00 AM
const TIMELINE_END_MINUTES = 1140; // 07:00 PM
const TIMELINE_TOTAL_MINUTES = TIMELINE_END_MINUTES - TIMELINE_START_MINUTES; // 660 mins

const TIME_12_AXIS = [
  "08:00 AM",
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM",
  "07:00 PM",
];

export default function SmartAdvisingRoutineTool() {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const { language } = useLanguage();

  // State: Sections loaded from verified backend or student sandbox session
  const [sections, setSections] = useState<OfferedSectionItem[]>([]);
  const [officialSections, setOfficialSections] = useState<OfferedSectionItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);
  const [semester, setSemester] = useState<string>("Spring 2026");

  // Selection
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [courseSearchQuery, setCourseSearchQuery] = useState<string>("");
  const [isCoursesExpanded, setIsCoursesExpanded] = useState<boolean>(false);
  const [expandedCourseSections, setExpandedCourseSections] = useState<string | null>(null);

  // Preferences: Default to ANY (Balanced / Any Time Slot Flexible)
  const [timePreference, setTimePreference] = useState<string>("ANY");
  const [customStartTime, setCustomStartTime] = useState<string>("10:00 AM");
  const [customEndTime, setCustomEndTime] = useState<string>("01:00 PM");
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
  const [strictDayFilter, setStrictDayFilter] = useState<boolean>(true);
  const [strictDayConflict, setStrictDayConflict] = useState<{
    hasConflict: boolean;
    requestedDays: string[];
    missingCourses: { code: string; title: string; offeredDays: string[] }[];
    isClashOnly: boolean;
    suggestedDay: string | null;
  } | null>(null);
  const [isRelaxedResult, setIsRelaxedResult] = useState<boolean>(false);
  const [facultyPreferences, setFacultyPreferences] = useState<Record<string, string[]>>({});
  const [isFacultyExpanded, setIsFacultyExpanded] = useState<boolean>(false);

  // Generated Routines (Top 10 options)
  const [routines, setRoutines] = useState<GeneratedRoutineOption[]>([]);
  const [selectedRoutineIndex, setSelectedRoutineIndex] = useState<number>(0);
  const [generating, setGenerating] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Timetable View Mode (Weekly, Daily, Overview)
  const [viewMode, setViewMode] = useState<"Weekly" | "Daily" | "Overview">("Weekly");
  const [dailyDay, setDailyDay] = useState<string>("SUN");

  // Upload / Advising Data Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isCustomUpload, setIsCustomUpload] = useState<boolean>(false);
  const [customUploadName, setCustomUploadName] = useState<string>("");

  // Export Timetable Ref
  const routineContainerRef = useRef<HTMLDivElement>(null);

  // Load official sections from backend on mount or semester change
  // Note: Student custom uploads are session-only and NOT saved to localStorage or backend.
  // Refreshing always restores whatever official catalog is published in the Admin Backend.
  useEffect(() => {
    fetchBackendSections();
  }, [semester]);

  const fetchBackendSections = async () => {
    setIsLoadingCatalog(true);
    try {
      const res = await api.advising.getSections(semester);
      if (res && res.courses && Object.keys(res.courses).length > 0) {
        const flat: OfferedSectionItem[] = [];
        Object.entries(res.courses).forEach(([code, secList]) => {
          (secList as any[]).forEach((s) => {
            let parsedSlots: TimeSlot[] = [];
            if (s.scheduleJson) {
              try {
                parsedSlots = JSON.parse(s.scheduleJson);
              } catch (e) {
                parsedSlots = [];
              }
            }
            flat.push({
              id: s.id,
              courseCode: s.courseCode,
              sectionNumber: String(s.sectionNumber),
              courseTitle: getSeuCourseTitle(s.courseCode, s.courseTitle),
              credits: s.credits || 3.0,
              facultyInitial: s.facultyInitial || "TBA",
              facultyName: s.facultyName || "TBA",
              availableSeats: s.availableSeats,
              scheduleText: s.scheduleText,
              slots: parsedSlots.map((sl) => ({
                ...sl,
                startMinutes: timeToMinutes(sl.start),
                endMinutes: timeToMinutes(sl.end),
              })),
              semester: s.semester,
            });
          });
        });
        setOfficialSections(flat);
        setSections(flat);
        setIsCustomUpload(false);
        setCustomUploadName("");
      } else {
        // Backend has no sections published by admin for this semester
        setOfficialSections([]);
        setSections([]);
      }
    } catch (err) {
      console.warn("Backend advising fetch error:", err);
      setOfficialSections([]);
      setSections([]);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

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
    setStrictDayConflict(null);
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

  // Search-filtered theory & lab courses
  const filteredTheoryCourses = useMemo(() => {
    const list = coursesCatalog.filter((c) => !c.isLab);
    if (!courseSearchQuery.trim()) return list;
    const q = courseSearchQuery.toLowerCase();
    return list.filter((c) => c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q));
  }, [coursesCatalog, courseSearchQuery]);

  const filteredLabCourses = useMemo(() => {
    const list = coursesCatalog.filter((c) => c.isLab);
    if (!courseSearchQuery.trim()) return list;
    const q = courseSearchQuery.toLowerCase();
    return list.filter((c) => c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q));
  }, [coursesCatalog, courseSearchQuery]);

  // Generate Routines Handler
  const handleGenerateRoutines = async () => {
    if (selectedCourses.length === 0) {
      toast.error(language === "bn" ? "কমপক্ষে ১টি কোর্স নির্বাচন করুন!" : "Please select at least 1 course!");
      return;
    }

    setGenerating(true);
    setStrictDayConflict(null);

    // If custom catalog is loaded, solve directly using client's uploaded dataset
    if (isCustomUpload) {
      runClientSideRoutineSolver();
      return;
    }

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
        const hasPreferredDays = preferredDays && preferredDays.length > 0 && preferredDays.length < 7;
        const prefSet = new Set(preferredDays.map((d) => d.toUpperCase()));

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
              courseTitle: getSeuCourseTitle(sec.courseCode, sec.courseTitle),
              slots: slots.map((sl) => ({
                ...sl,
                startMinutes: timeToMinutes(sl.start),
                endMinutes: timeToMinutes(sl.end),
              })),
            };
          }),
        }));

        // Strict Day Filter Enforcement:
        if (hasPreferredDays && strictDayFilter) {
          const strictlyMatchingRoutines = formatted.filter((r) =>
            r.activeDays.every((d) => prefSet.has(d.toUpperCase()))
          );

          if (strictlyMatchingRoutines.length > 0) {
            setRoutines(strictlyMatchingRoutines);
            setSelectedRoutineIndex(0);
            setIsRelaxedResult(false);
            setStrictDayConflict(null);
            triggerSuccessFeedback(strictlyMatchingRoutines.length);
            setGenerating(false);
            return;
          } else {
            // Backend returned routines with unselected days; run client solver for strict diagnosis
            runClientSideRoutineSolver();
            return;
          }
        }

        setRoutines(formatted);
        setSelectedRoutineIndex(0);
        setIsRelaxedResult(false);
        setStrictDayConflict(null);
        triggerSuccessFeedback(formatted.length);
        setGenerating(false);
        return;
      }
    } catch (err) {
      console.warn("Backend routine generation fallback to local solver:", err);
    }

    // Client-side local multi-objective solver
    runClientSideRoutineSolver();
  };

  const runClientSideRoutineSolver = (forceRelaxed = false) => {
    const isDayFilterActive = preferredDays && preferredDays.length > 0 && preferredDays.length < 7;
    const prefSet = new Set(preferredDays.map((d) => d.toUpperCase()));
    const useStrict = strictDayFilter && isDayFilterActive && !forceRelaxed;

    // 1. Prepare candidate sections for each selected course
    const courseSecsList: OfferedSectionItem[][] = [];
    const missingCoursesInfo: { code: string; title: string; offeredDays: string[] }[] = [];

    for (const cCode of selectedCourses) {
      const pool = sections.filter((s) => s.courseCode === cCode);
      if (pool.length === 0) {
        toast.error(`No sections available for ${cCode}`);
        setGenerating(false);
        return;
      }

      if (useStrict) {
        const strictSecs = pool.filter(
          (sec) =>
            sec.slots &&
            sec.slots.length > 0 &&
            sec.slots.every((sl) => prefSet.has(sl.day.toUpperCase()))
        );

        if (strictSecs.length === 0) {
          const offeredDays = Array.from(
            new Set(pool.flatMap((sec) => sec.slots.map((sl) => sl.day.toUpperCase())))
          );
          missingCoursesInfo.push({
            code: cCode,
            title: getSeuCourseTitle(cCode, pool[0]?.courseTitle),
            offeredDays,
          });
        } else {
          courseSecsList.push(strictSecs);
        }
      } else if (isDayFilterActive) {
        // Prioritize sections that fit preferred days first so outside days are explored last
        const sortedPool = [...pool].sort((s1, s2) => {
          const out1 = s1.slots.filter((sl) => !prefSet.has(sl.day.toUpperCase())).length;
          const out2 = s2.slots.filter((sl) => !prefSet.has(sl.day.toUpperCase())).length;
          return out1 - out2;
        });
        courseSecsList.push(sortedPool);
      } else {
        courseSecsList.push(pool);
      }
    }

    // In strict mode, if any course has 0 sections matching target days:
    if (useStrict && missingCoursesInfo.length > 0) {
      const dayFrequency: Record<string, number> = {};
      missingCoursesInfo.forEach((m) => {
        m.offeredDays.forEach((d) => {
          if (!prefSet.has(d)) {
            dayFrequency[d] = (dayFrequency[d] || 0) + 1;
          }
        });
      });
      const suggestedDay =
        Object.entries(dayFrequency).sort((a, b) => b[1] - a[1])[0]?.[0] || "SAT";

      setStrictDayConflict({
        hasConflict: true,
        requestedDays: preferredDays,
        missingCourses: missingCoursesInfo,
        isClashOnly: false,
        suggestedDay,
      });
      setRoutines([]);
      setIsRelaxedResult(false);
      setGenerating(false);
      return;
    }

    // 2. Backtracking search
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

    // 3. Handle zero combinations
    if (validCombos.length === 0) {
      if (useStrict) {
        const suggestedDay = WEEK_DAYS.find((d) => !prefSet.has(d)) || "SAT";
        setStrictDayConflict({
          hasConflict: true,
          requestedDays: preferredDays,
          missingCourses: [],
          isClashOnly: true,
          suggestedDay,
        });
        setRoutines([]);
        setIsRelaxedResult(false);
        setGenerating(false);
        return;
      }

      setRoutines([]);
      setIsRelaxedResult(false);
      toast.error(
        language === "bn"
          ? "এই কোর্সগুলোর মধ্যে ১০০% ক্ল্যাশ-মুক্ত কোনো রুটিন তৈরি সম্ভব হয়নি। দয়া করে অন্য কোর্স নির্বাচন করুন।"
          : "No conflict-free routine possible for this combination. Please swap one course."
      );
      setGenerating(false);
      return;
    }

    // Successful combinations found
    setStrictDayConflict(null);
    setIsRelaxedResult(forceRelaxed || (!useStrict && isDayFilterActive));

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
          if (em > 990) hasLate = true; // after 16:30 (4:30 PM)
          if (sm >= 480 && sm <= 720) morningCount++;
          if (sm >= 690 && sm <= 1080) afternoonCount++;
        });
      });

      // 1. GAP ANALYSIS & CONSECUTIVE CLASS REWARDS
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
      let targetStartMin = -1;
      let targetEndMin = -1;
      let windowLabel = "";

      if (timePreference === "WINDOW_10_TO_1") {
        targetStartMin = 600;
        targetEndMin = 780;
        windowLabel = "10:00 AM - 01:00 PM";
      } else if (timePreference === "WINDOW_10_TO_3") {
        targetStartMin = 600;
        targetEndMin = 900;
        windowLabel = "10:00 AM - 03:00 PM";
      } else if (timePreference === "WINDOW_830_TO_1130") {
        targetStartMin = 510;
        targetEndMin = 690;
        windowLabel = "08:30 AM - 11:30 AM";
      } else if (timePreference === "WINDOW_130_TO_430") {
        targetStartMin = 810;
        targetEndMin = 990;
        windowLabel = "01:30 PM - 04:30 PM";
      } else if (timePreference === "WINDOW_300_TO_600") {
        targetStartMin = 900;
        targetEndMin = 1080;
        windowLabel = "03:00 PM - 06:00 PM";
      } else if (timePreference === "CUSTOM") {
        targetStartMin = time12ToMinutes(customStartTime);
        targetEndMin = time12ToMinutes(customEndTime);
        windowLabel = `${customStartTime} - ${customEndTime}`;
      }

      if (targetStartMin >= 0 && targetEndMin > targetStartMin) {
        let insideCount = 0;
        let totalSlotsCount = 0;
        combo.forEach((sec) => {
          sec.slots.forEach((slot) => {
            totalSlotsCount++;
            const sm = slot.startMinutes ?? timeToMinutes(slot.start);
            const em = slot.endMinutes ?? timeToMinutes(slot.end);
            if (sm >= targetStartMin && em <= targetEndMin) {
              insideCount++;
            }
          });
        });

        if (insideCount === totalSlotsCount) {
          score += 90;
          highlights.push(`🎯 100% Fits ${windowLabel} Window`);
        } else if (insideCount > 0) {
          score += (insideCount / totalSlotsCount) * 50;
          score -= (totalSlotsCount - insideCount) * 20;
          highlights.push(`🎯 ${insideCount}/${totalSlotsCount} Classes in ${windowLabel}`);
        } else {
          score -= 60;
        }
      } else if (timePreference === "AVOID_MORNING") {
        if (!hasEarly) {
          score += 45;
          highlights.push("☀️ No Early 08:30 Classes");
        } else {
          score -= 40;
        }
      } else if (timePreference === "AVOID_LATE") {
        if (!hasLate) {
          score += 35;
          highlights.push("🌇 No Late Afternoon Classes");
        } else {
          score -= 30;
        }
      } else if (timePreference === "PREFER_MORNING") {
        score += morningCount * 12;
        if (morningCount > afternoonCount) highlights.push("🌅 Morning Focused");
      } else if (timePreference === "PREFER_AFTERNOON") {
        score += afternoonCount * 12;
        if (afternoonCount > morningCount) highlights.push("☕ Afternoon Focused");
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

      // Penalize sections that are closed (0 available seats)
      combo.forEach((sec) => {
        if (sec.availableSeats === 0) {
          score -= 25; // Soft penalty so open sections are ranked higher
        }
      });

      const totalCredits = combo.reduce((sum, s) => sum + s.credits, 0);
      const matchPercentage = Math.min(100, Math.max(60, Math.round((score / 280) * 100)));

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

    // Sort descending by score, STRICTLY prioritizing combinations that match user's selected preferred days
    if (preferredDays && preferredDays.length > 0 && preferredDays.length < 7) {
      scored.sort((a, b) => {
        const aOutside = a.activeDays.filter((d) => !preferredDays.includes(d)).length;
        const bOutside = b.activeDays.filter((d) => !preferredDays.includes(d)).length;
        if (aOutside !== bOutside) {
          return aOutside - bOutside; // Combinations with fewer or 0 outside days strictly rank first!
        }
        return b.score - a.score;
      });
    } else {
      scored.sort((a, b) => b.score - a.score);
    }

    const top10 = scored.slice(0, 10).map((opt, idx) => ({
      ...opt,
      rank: idx + 1,
    }));

    setRoutines(top10);
    setSelectedRoutineIndex(0);
    setGenerating(false);
    triggerSuccessFeedback(top10.length);
  };

  const triggerSuccessFeedback = (count: number) => {
    toast.success(
      language === "bn"
        ? `🎉 সেরা ${count}টি শূন্য-ক্ল্যাশ (Zero Clash) রুটিন সাজানো হয়েছে! ১ নাম্বার রুটিনটি সেরা।`
        : `🎉 Generated ${count} conflict-free routines! Option #1 has the highest efficiency & least gaps.`
    );
    try {
      confetti({
        particleCount: 45,
        spread: 65,
        origin: { y: 0.7 },
      });
    } catch (e) {}
  };

  // Reset from custom student session sandbox back to official university catalog
  const handleResetToOfficial = () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(`notelagbe_custom_advising_${semester}`);
      }
    } catch {}
    setSections(officialSections);
    setSelectedCourses([]);
    setRoutines([]);
    setIsCustomUpload(false);
    setCustomUploadName("");
    toast.success(
      language === "bn"
        ? "↺ বিশ্ববিদ্যালয়ের অফিসিয়াল মাস্টার ক্যাটালগে ফিরে যাওয়া হয়েছে!"
        : "↺ Restored to Official University Catalog!"
    );
  };

  // Handle Apply Catalog from AdvisingDataModal (Private Session Sandbox ONLY)
  // Per requirement: user inputs are applied in memory only, NEVER saved to backend or localStorage.
  // On page refresh, user inputs are cleared and official backend data is restored.
  const handleSaveCatalog = (newSections: OfferedSectionItem[]) => {
    setSections(newSections);
    setIsCustomUpload(true);
    setCustomUploadName(`Custom Session Catalog (${newSections.length} sections)`);
    setSelectedCourses([]);
    setRoutines([]);
    toast.success(
      language === "bn"
        ? `✅ সেশনের জন্য ${newSections.length}টি সেকশন লোড করা হয়েছে!`
        : `✅ Loaded ${newSections.length} sections into your private session sandbox!`
    );
  };







  const activeRoutine = routines[selectedRoutineIndex] || routines[0] || null;

  const handleCopySectionCodes = () => {
    if (!activeRoutine) return;
    const codes = activeRoutine.sections.map((s) => `${s.courseCode}.${s.sectionNumber}`).join(", ");
    navigator.clipboard.writeText(codes);
    toast.success(
      language === "bn" ? `📋 সেকশন কোড কপি হয়েছে: ${codes}` : `📋 Copied section codes: ${codes}`
    );
  };

  const handleDownloadPNG = async () => {
    if (!routineContainerRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading(language === "bn" ? "রুটিন ইমেজ (PNG) তৈরি হচ্ছে..." : "Exporting Class Routine as PNG image...");
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
        language === "bn" ? "✅ ক্লাস রুটিন PNG সফলভাবে ডাউনলোড হয়েছে!" : "✅ Class Routine PNG downloaded successfully!",
        { id: toastId }
      );
    } catch (err: any) {
      console.error("Failed to export routine PNG:", err);
      toast.error("Failed to export routine PNG.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!routineContainerRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading(language === "bn" ? "রুটিন PDF তৈরি হচ্ছে..." : "Generating landscape PDF document...");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(routineContainerRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#0B0F19",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min((pdfWidth - 16) / imgWidth, (pdfHeight - 16) / imgHeight);
      const canvasScaledWidth = imgWidth * ratio;
      const canvasScaledHeight = imgHeight * ratio;
      const marginX = (pdfWidth - canvasScaledWidth) / 2;
      const marginY = (pdfHeight - canvasScaledHeight) / 2;

      pdf.setFillColor(11, 15, 25);
      pdf.rect(0, 0, pdfWidth, pdfHeight, "F");
      pdf.addImage(imgData, "PNG", marginX, marginY, canvasScaledWidth, canvasScaledHeight);
      pdf.save(`SEU_Class_Routine_Option_${selectedRoutineIndex + 1}_${semester.replace(/\s+/g, "_")}.pdf`);

      toast.success(
        language === "bn" ? "✅ ক্লাস রুটিন PDF সফলভাবে ডাউনলোড হয়েছে!" : "✅ Class Routine PDF downloaded successfully!",
        { id: toastId }
      );
    } catch (err: any) {
      console.error("Failed to export routine PDF:", err);
      toast.error("Failed to export routine PDF.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ========================================================================= */}
      {/* 1. HERO HEADER WITH SEU THEME & UPLOAD CALLOUT                            */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/70 to-slate-950 border border-indigo-500/30 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-bold tracking-wider uppercase">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Southeast University Advising Engine • Zero-Clash Guarantee</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              {language === "bn"
                ? "স্মার্ট অ্যাডভাইজিং রুটিন প্ল্যানার & ক্ল্যাশ অপটিমাইজার"
                : "Smart Advising Routine Generator & Timetable"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {language === "bn"
                ? "সাউথইস্ট ইউনিভার্সিটির UMS অ্যাডভাইজিং টেবিল থেকে শূন্য-ক্ল্যাশ (0% Conflict) সহ ন্যূনতম টাইম গ্যাপ, কাঙ্ক্ষিত শিক্ষক ও সুবিধাজনক সময়ে সেরা ১০টি বিকল্প রুটিন এক্সপ্লোর ও ডাউনলোড করুন।"
                : "Instantly computes conflict-free class combinations from SEU UMS advising tables. Optimize for minimal gaps, back-to-back classes, preferred teachers, and export as PNG/PDF."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <FileCode className="w-4 h-4 text-blue-200" />
              <span>{language === "bn" ? "UMS ডাটা আপলোড (.html) / ইনপুট" : "Upload UMS Data (.html / Input)"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Custom Student Upload Active Banner */}
      {isCustomUpload && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/30 via-indigo-900/30 to-slate-900 border border-blue-500/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-white">
            <FileCode className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              <strong>{language === "bn" ? "কাস্টম সেশন স্যান্ডবক্স সক্রিয়:" : "Custom Session Sandbox Active:"}</strong>{" "}
              {customUploadName} ({sections.length} {language === "bn" ? "টি সেকশন" : "sections"})
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
              {language === "bn" ? "প্রাইভেট সেশন • রিফ্রেশ দিলে ব্যাকএন্ড ডাটা ফিরবে" : "Session Only • Refresh resets to official"}
            </span>
          </div>
          <button
            onClick={handleResetToOfficial}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
            <span>{language === "bn" ? "অফিসিয়াল ক্যাটালগে ব্যাক করুন" : "Reset to Official Catalog"}</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TARGET COURSE SELECTOR (SEARCH-TO-ADD, 17 CR LIMIT & SECTION DRAWER)   */}
      {/* ========================================================================= */}
      {(() => {
        const isSearching = courseSearchQuery.trim().length > 0;
        const theoryToShow = isSearching || isCoursesExpanded ? filteredTheoryCourses : filteredTheoryCourses.slice(0, 6);
        const labToShow = isSearching || isCoursesExpanded ? filteredLabCourses : filteredLabCourses.slice(0, 4);
        const totalAvailable = filteredTheoryCourses.length + filteredLabCourses.length;
        const totalShown = theoryToShow.length + labToShow.length;
        const hasMore = !isSearching && totalShown < totalAvailable;

        return (
          <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-5 sm:p-6 backdrop-blur-md space-y-5">
            {/* Header: Title, Credit Tracker Badge, and Action Buttons */}
            <div className="space-y-4 border-b border-slate-800/80 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0 mt-0.5">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base sm:text-lg font-black text-white">
                        {language === "bn" ? "১. টার্গেট কোর্স নির্বাচন করুন" : "1. Select Target Courses"}
                      </h2>
                      <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {selectedCourses.length} {language === "bn" ? "টি কোর্স" : "Courses"}
                      </span>
                      <span
                        className={`text-xs font-mono font-bold px-3 py-0.5 rounded-full border transition-all ${
                          selectedCreditsTotal >= 17
                            ? "bg-amber-950/70 text-amber-300 border-amber-500/60 shadow-sm"
                            : selectedCreditsTotal > 0
                            ? "bg-blue-950/70 text-blue-300 border-blue-500/40"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        {selectedCreditsTotal} / 17 Credits
                        {selectedCreditsTotal >= 17 && (
                          <span className="ml-1 text-[10px] text-amber-400 font-sans font-bold">
                            ({language === "bn" ? "সর্বোচ্চ সীমা" : "Max Reached"})
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {language === "bn"
                        ? "থিয়োরি ও ল্যাব মিলিয়ে সর্বোচ্চ ১৭ ক্রেডিট পর্যন্ত নির্বাচন করা যাবে। সার্চ করে যেকোনো কোর্স যুক্ত করুন অথবা সব সেকশন দেখুন।"
                        : "Select Theory and Lab courses (max 17 credits combined). Search to add courses and inspect available sections."}
                    </p>
                  </div>
                </div>

                {/* Clear Selection Button (Right side of header) */}
                {selectedCourses.length > 0 && (
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => setSelectedCourses([])}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono font-bold transition-all cursor-pointer"
                    >
                      Clear ({selectedCourses.length})
                    </button>
                  </div>
                )}
              </div>

              {/* Dedicated Full-Width Search Row */}
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={courseSearchQuery}
                  onChange={(e) => setCourseSearchQuery(e.target.value)}
                  placeholder={
                    language === "bn"
                      ? "কোর্স কোড বা নাম দিয়ে সার্চ করুন (যেমন: CSE181, Discrete Mathematics, CSE4, Compiler, Lab)..."
                      : "Search courses by code or title (e.g. CSE181, Discrete Mathematics, CSE4, Lab)..."
                  }
                  className="w-full text-xs sm:text-sm py-2.5 pl-10 pr-10 rounded-2xl bg-slate-800/90 border border-slate-700/80 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/80 focus:border-blue-500 shadow-inner transition-all"
                />
                {courseSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setCourseSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-700/60 transition-colors cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Active Selected Target Courses Shelf */}
            {selectedCourses.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900 border border-blue-500/30 space-y-2.5 animate-in fade-in duration-200">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-blue-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    <span>{language === "bn" ? "সিলেক্ট করা টার্গেট কোর্সসমূহ:" : "Active Selected Target Courses:"}</span>
                    <span className="font-mono text-[11px] text-slate-400">({selectedCourses.length})</span>
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-300">
                    {selectedCreditsTotal} / 17 Credits
                    {selectedCreditsTotal < 17 ? (
                      <span className="text-emerald-400 font-normal ml-1">
                        ({17 - selectedCreditsTotal} Cr remaining)
                      </span>
                    ) : (
                      <span className="text-amber-400 font-bold ml-1">
                        ({language === "bn" ? "১৭ ক্রেডিট পূর্ণ" : "17 Cr Full"})
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedCourses.map((cCode) => {
                    const cObj = coursesCatalog.find((c) => c.code === cCode);
                    const isLab = cObj?.isLab || false;
                    const cred = cObj?.credits || 3.0;
                    return (
                      <div
                        key={cCode}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 shadow-sm transition-all ${
                          isLab
                            ? "bg-cyan-950/70 border-cyan-500/40 text-cyan-200"
                            : "bg-blue-950/70 border-blue-500/40 text-blue-200"
                        }`}
                      >
                        <span className="font-mono font-black">{cCode}</span>
                        <span className="text-slate-300 text-[11px] truncate max-w-[130px] sm:max-w-[200px]" title={cObj?.title}>
                          {cObj?.title || cCode}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-slate-300 border border-white/10 font-bold">
                          {cred} Cr
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleCourse(cCode, cred)}
                          className="p-0.5 rounded-md hover:bg-white/20 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title={`Remove ${cCode}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Courses Groups (Theory & Lab) or Loading / Empty State */}
            {isLoadingCatalog ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-mono text-slate-400">
                  {language === "bn"
                    ? "বিশ্ববিদ্যালয়ের অ্যাডভাইজিং ক্যাটালগ যাচাই করা হচ্ছে..."
                    : "Verifying official university advising catalog..."}
                </p>
              </div>
            ) : totalAvailable === 0 ? (
              <div className="py-12 px-6 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mx-auto flex items-center justify-center">
                  <FileCode className="w-7 h-7" />
                </div>
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-base font-black text-white">
                    {language === "bn"
                      ? "কোনো কোর্স ডাটা পাওয়া যায়নি"
                      : "No Advising Course Data Available"}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {language === "bn"
                      ? "অ্যাডমিন প্যানেল থেকে এখনও এই সেমিস্টারের কোনো অফিশিয়াল কোর্স ডাটা পাবলিশ করা হয়নি। আপনি আপনার UMS টেবিলের .html ফাইল আপলোড করে অথবা টেক্সট পেস্ট করে সরাসরি কনফ্লিক্ট-মুক্ত রুটিন তৈরি করতে পারেন!"
                      : "No official advising catalog has been published by Admin for this semester yet. Upload your UMS .html table file or paste advising rows above to generate conflict-free routines in your private session sandbox!"}
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all inline-flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <UploadCloud className="w-4 h-4 text-white" />
                    <span>
                      {language === "bn"
                        ? "UMS .html ফাইল আপলোড করুন / পেস্ট করুন"
                        : "Upload UMS .html / Input Data"}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Theory Courses Group */}
              {theoryToShow.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-indigo-400" />
                      <span>Theory Courses (Paired Days • SUN+TUE / MON+WED / THU+SAT)</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-normal">
                      {isSearching
                        ? `${theoryToShow.length} matches`
                        : `${theoryToShow.length} of ${filteredTheoryCourses.length} shown`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {theoryToShow.map((c) => {
                      const isSelected = selectedCourses.includes(c.code);
                      const exceedsLimit = !isSelected && selectedCreditsTotal + c.credits > 17;
                      const isSectionsExpanded = expandedCourseSections === c.code;

                      return (
                        <div
                          key={c.code}
                          className={`rounded-2xl border transition-all select-none overflow-hidden ${
                            isSelected
                              ? "bg-blue-600/15 border-blue-500/60 shadow-md shadow-blue-500/15"
                              : exceedsLimit
                              ? "bg-slate-900/40 border-slate-800/80 text-slate-500 opacity-60"
                              : "bg-slate-800/40 border-slate-700/60 hover:border-slate-500 hover:bg-slate-800/70"
                          }`}
                        >
                          <div
                            onClick={() => handleToggleCourse(c.code, c.credits)}
                            className="p-3.5 flex items-start justify-between gap-3 cursor-pointer group"
                          >
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-sm text-white">{c.code}</span>
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                  {c.credits} Cr
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ({c.sections.length} sec)
                                </span>
                              </div>
                              <p className="text-xs font-bold text-slate-200 line-clamp-1 group-hover:text-blue-300 transition-colors" title={c.title}>
                                {c.title}
                              </p>
                              <div className="flex items-center justify-between text-[9px] font-mono pt-0.5">
                                <span className="text-indigo-400 block">
                                  Paired 80m Slots
                                </span>
                                {exceedsLimit && !isSelected && (
                                  <span className="text-amber-400 font-bold">
                                    {language === "bn" ? ">১৭ ক্রেডিট" : ">17 Cr"}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div
                              className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? "bg-blue-600 border-blue-500 text-white"
                                  : "border-slate-600 bg-slate-800/80 text-transparent"
                              }`}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          </div>

                          {/* Interactive Section Inspection Drawer */}
                          <div className="px-3.5 pb-2.5 pt-1 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedCourseSections(isSectionsExpanded ? null : c.code);
                              }}
                              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-bold"
                            >
                              <Eye className="w-3 h-3" />
                              <span>{isSectionsExpanded ? "Hide Sections" : `View ${c.sections.length} Sections`}</span>
                              <ChevronDown className={`w-3 h-3 transition-transform ${isSectionsExpanded ? "rotate-180" : ""}`} />
                            </button>
                            <span className="text-[10px] text-slate-500">
                              {c.sections.some((s) => s.availableSeats === 0) ? "Has full sec" : "All open"}
                            </span>
                          </div>

                          {/* Expanded Sections Breakdown */}
                          {isSectionsExpanded && (
                            <div className="px-3 pb-3 pt-1 space-y-1.5 bg-slate-900/90 border-t border-slate-800 animate-in fade-in duration-150">
                              <span className="text-[10px] font-mono text-slate-400 block font-bold">
                                Available Sections for {c.code}:
                              </span>
                              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                {c.sections.map((sec) => (
                                  <div
                                    key={`${sec.courseCode}.${sec.sectionNumber}`}
                                    className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/70 text-[10px] font-mono flex items-center justify-between gap-1.5"
                                  >
                                    <div className="min-w-0">
                                      <span className="font-bold text-white mr-1.5">
                                        Sec {sec.sectionNumber}
                                      </span>
                                      <span className="text-amber-300 font-semibold mr-1.5">
                                        [{sec.facultyInitial}]
                                      </span>
                                      <span className="text-slate-300 truncate">
                                        {sec.slots.map((sl) => `${sl.day} ${sl.start}-${sl.end}`).join(" & ")}
                                      </span>
                                    </div>
                                    <span
                                      className={`px-1.5 py-0.2 rounded shrink-0 font-bold ${
                                        sec.availableSeats === 0
                                          ? "bg-rose-950 text-rose-300 border border-rose-800"
                                          : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                      }`}
                                    >
                                      {sec.availableSeats !== undefined ? `${sec.availableSeats} seats` : "Open"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Lab Courses Group */}
              {labToShow.length > 0 && (
                <div className="space-y-2.5 pt-3 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span>Lab Courses (Single Day • 2-Hour Practical Sessions)</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-normal">
                      {isSearching
                        ? `${labToShow.length} matches`
                        : `${labToShow.length} of ${filteredLabCourses.length} shown`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {labToShow.map((c) => {
                      const isSelected = selectedCourses.includes(c.code);
                      const exceedsLimit = !isSelected && selectedCreditsTotal + c.credits > 17;
                      const isSectionsExpanded = expandedCourseSections === c.code;

                      return (
                        <div
                          key={c.code}
                          className={`rounded-2xl border transition-all select-none overflow-hidden ${
                            isSelected
                              ? "bg-cyan-600/15 border-cyan-500/60 shadow-md shadow-cyan-500/15"
                              : exceedsLimit
                              ? "bg-slate-900/40 border-slate-800/80 text-slate-500 opacity-60"
                              : "bg-slate-800/40 border-slate-700/60 hover:border-slate-500 hover:bg-slate-800/70"
                          }`}
                        >
                          <div
                            onClick={() => handleToggleCourse(c.code, c.credits)}
                            className="p-3.5 flex items-start justify-between gap-3 cursor-pointer group"
                          >
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-sm text-white">{c.code}</span>
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                  {c.credits} Cr
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ({c.sections.length} sec)
                                </span>
                              </div>
                              <p className="text-xs font-bold text-slate-200 line-clamp-1 group-hover:text-cyan-300 transition-colors" title={c.title}>
                                {c.title}
                              </p>
                              <div className="flex items-center justify-between text-[9px] font-mono pt-0.5">
                                <span className="text-cyan-400 block">
                                  Single Day 120m Lab
                                </span>
                                {exceedsLimit && !isSelected && (
                                  <span className="text-amber-400 font-bold">
                                    {language === "bn" ? ">১৭ ক্রেডিট" : ">17 Cr"}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div
                              className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? "bg-cyan-600 border-cyan-500 text-white"
                                  : "border-slate-600 bg-slate-800/80 text-transparent"
                              }`}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          </div>

                          {/* Section Inspection Drawer for Lab */}
                          <div className="px-3.5 pb-2.5 pt-1 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedCourseSections(isSectionsExpanded ? null : c.code);
                              }}
                              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-bold"
                            >
                              <Eye className="w-3 h-3" />
                              <span>{isSectionsExpanded ? "Hide Sections" : `View ${c.sections.length} Sections`}</span>
                              <ChevronDown className={`w-3 h-3 transition-transform ${isSectionsExpanded ? "rotate-180" : ""}`} />
                            </button>
                            <span className="text-[10px] text-slate-500">
                              {c.sections.some((s) => s.availableSeats === 0) ? "Has full sec" : "All open"}
                            </span>
                          </div>

                          {isSectionsExpanded && (
                            <div className="px-3 pb-3 pt-1 space-y-1.5 bg-slate-900/90 border-t border-slate-800 animate-in fade-in duration-150">
                              <span className="text-[10px] font-mono text-slate-400 block font-bold">
                                Available Lab Sections for {c.code}:
                              </span>
                              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                {c.sections.map((sec) => (
                                  <div
                                    key={`${sec.courseCode}.${sec.sectionNumber}`}
                                    className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/70 text-[10px] font-mono flex items-center justify-between gap-1.5"
                                  >
                                    <div className="min-w-0">
                                      <span className="font-bold text-white mr-1.5">
                                        Sec {sec.sectionNumber}
                                      </span>
                                      <span className="text-amber-300 font-semibold mr-1.5">
                                        [{sec.facultyInitial}]
                                      </span>
                                      <span className="text-slate-300 truncate">
                                        {sec.slots.map((sl) => `${sl.day} ${sl.start}-${sl.end}`).join(" & ")}
                                      </span>
                                    </div>
                                    <span
                                      className={`px-1.5 py-0.2 rounded shrink-0 font-bold ${
                                        sec.availableSeats === 0
                                          ? "bg-rose-950 text-rose-300 border border-rose-800"
                                          : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                      }`}
                                    >
                                      {sec.availableSeats !== undefined ? `${sec.availableSeats} seats` : "Open"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

            {/* See More / See Less Toggle */}
            {hasMore && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsCoursesExpanded(!isCoursesExpanded)}
                  className="px-5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 border border-slate-700 text-xs font-mono font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <span>
                    {isCoursesExpanded
                      ? language === "bn"
                        ? "কম কোর্স দেখুন (See Less)"
                        : "Show Less Courses"
                      : language === "bn"
                      ? `সব ${totalAvailable}টি কোর্স এক্সপ্লোর করুন (See All ${totalAvailable} Courses)`
                      : `See All Available Courses (${totalAvailable})`}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCoursesExpanded ? "rotate-180" : ""}`} />
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 2. PRIORITIES & GAP CONTROL (CLEAN, WELL-SPACED & FULLY FUNCTIONAL)        */}
      {/* ========================================================================= */}
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-5 sm:p-6 backdrop-blur-md space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {language === "bn" ? "২. সময় ও গ্যাপ প্রায়োরিটি কন্ট্রোল" : "2. Priorities & Gap Control"}
              </h2>
              <p className="text-xs text-slate-400">
                Configure preferred class timing windows, consecutive back-to-back breaks, and target campus days.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-700">
            Control Panel
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* 1. Time Preference (12-Hour AM/PM) */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-slate-300 flex items-center justify-between">
              <span>Time Preference (12-Hour AM/PM)</span>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
            </label>
            <select
              value={timePreference}
              onChange={(e) => setTimePreference(e.target.value)}
              className="w-full text-xs font-bold py-2.5 px-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ANY">⚡ Balanced / Any Time Slot (Flexible - Default)</option>
              <option value="WINDOW_10_TO_1">🎯 10:00 AM - 01:00 PM (Late Morning Peak)</option>
              <option value="WINDOW_10_TO_3">🎯 10:00 AM - 03:00 PM (Full Daytime Slot)</option>
              <option value="WINDOW_830_TO_1130">🎯 08:30 AM - 11:30 AM (Early Morning Slot)</option>
              <option value="WINDOW_130_TO_430">🎯 01:30 PM - 04:30 PM (Afternoon Slot)</option>
              <option value="WINDOW_300_TO_600">🎯 03:00 PM - 06:00 PM (Late Afternoon Slot)</option>
              <option value="AVOID_MORNING">☀️ Avoid Morning (No 08:30 AM Classes)</option>
              <option value="AVOID_LATE">🌇 Avoid Late Afternoon (No Post-04:30 PM Classes)</option>
              <option value="CUSTOM">⚙️ Custom 12-Hour Time Window</option>
            </select>

            {timePreference === "CUSTOM" && (
              <div className="p-3 rounded-2xl bg-slate-800/90 border border-slate-700 space-y-2 animate-in fade-in duration-150">
                <span className="text-[11px] font-mono text-slate-300 font-bold block">
                  Select Custom 12-Hour Window:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Start Time:</span>
                    <select
                      value={customStartTime}
                      onChange={(e) => setCustomStartTime(e.target.value)}
                      className="w-full text-xs bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                    >
                      {["08:00 AM", "08:30 AM", "09:00 AM", "10:00 AM", "11:30 AM", "01:00 PM", "01:30 PM", "03:00 PM"].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">End Time:</span>
                    <select
                      value={customEndTime}
                      onChange={(e) => setCustomEndTime(e.target.value)}
                      className="w-full text-xs bg-slate-900 border border-slate-700 rounded-xl p-2 text-white"
                    >
                      {["11:30 AM", "01:00 PM", "01:30 PM", "02:50 PM", "04:30 PM", "06:00 PM", "07:00 PM"].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
            <p className="text-[11px] text-slate-400">
              {timePreference === "ANY"
                ? "Flexible across all SEU slots: 08:30 AM, 10:00 AM, 11:30 AM, 01:30 PM, 03:00 PM."
                : "Solver will heavily boost combinations that fit inside this time window."}
            </p>
          </div>

          {/* 2. Gap & Schedule Style */}
          <div className="space-y-2">
            <label className="text-xs font-mono font-bold text-slate-300 flex items-center justify-between">
              <span>Gap & Schedule Style</span>
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
            </label>
            <select
              value={dayPreference}
              onChange={(e) => setDayPreference(e.target.value as any)}
              className="w-full text-xs font-bold py-2.5 px-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="COMPACT_GAPS">🎯 Minimum Gap (Consecutive / Back-to-Back)</option>
              <option value="MINIMIZE_DAYS">⚡ Minimize Campus Days (Compact 2-3 Days)</option>
              <option value="ANY">🗓️ Balanced Spread Across Days</option>
            </select>
            <p className="text-[11px] text-slate-400">
              {dayPreference === "COMPACT_GAPS"
                ? "Option #1 maximizes back-to-back classes with 10-15m room transitions, eliminating multi-hour dead breaks."
                : "Packs classes tightly into fewer campus days."}
            </p>
          </div>

          {/* 3. Target Days */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>Target Days</span>
              </span>
              <div className="flex items-center gap-2">
                {preferredDays.length < 7 && (
                  <button
                    type="button"
                    onClick={() => {
                      setStrictDayFilter((prev) => !prev);
                      setStrictDayConflict(null);
                    }}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                      strictDayFilter
                        ? "bg-emerald-950/80 text-emerald-300 border-emerald-700/60 font-black shadow-sm shadow-emerald-500/20"
                        : "bg-amber-950/80 text-amber-300 border-amber-700/60 font-medium"
                    }`}
                    title={
                      strictDayFilter
                        ? "Strict Filter: Zero classes on unselected days"
                        : "Flexible Mode: Allow extra days if no clash-free combination exists"
                    }
                  >
                    {strictDayFilter ? (
                      <>
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>Strict Filter</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>Flexible</span>
                      </>
                    )}
                  </button>
                )}
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 font-bold">
                  {preferredDays.length === 7
                    ? "All 7 Days (Flexible)"
                    : `${preferredDays.length} / 7 Days Active`}
                </span>
              </div>
            </div>

            {/* Quick SEU Presets */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "SUN+TUE", days: ["SUN", "TUE"] },
                { label: "MON+WED", days: ["MON", "WED"] },
                { label: "THU+SAT", days: ["THU", "SAT"] },
                { label: "+ FRI (2h)", days: ["FRI"], isToggle: true },
                { label: "All 7d", days: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] },
              ].map((p) => {
                const isActive = p.isToggle
                  ? preferredDays.includes("FRI")
                  : p.days.length === preferredDays.length && p.days.every((d) => preferredDays.includes(d));

                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setStrictDayConflict(null);
                      if (p.isToggle) {
                        if (preferredDays.includes("FRI")) {
                          if (preferredDays.length > 1) {
                            setPreferredDays(preferredDays.filter((d) => d !== "FRI"));
                          }
                        } else {
                          setPreferredDays((prev) => Array.from(new Set([...prev, "FRI"])));
                        }
                      } else {
                        setPreferredDays(p.days);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                      isActive
                        ? "bg-indigo-600 text-white border-indigo-400 shadow-sm shadow-indigo-500/20"
                        : "bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-slate-700"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Individual Day Cards Grid */}
            <div className="grid grid-cols-7 gap-1.5 pt-0.5">
              {WEEK_DAYS.map((day) => {
                const active = preferredDays.includes(day);
                const isFriday = day === "FRI";
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      setStrictDayConflict(null);
                      if (active) {
                        if (preferredDays.length <= 1) {
                          toast.error("Please keep at least 1 day selected.");
                          return;
                        }
                        setPreferredDays(preferredDays.filter((d) => d !== day));
                      } else {
                        setPreferredDays([...preferredDays, day]);
                      }
                    }}
                    className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer border flex flex-col items-center justify-center gap-0.5 ${
                      active
                        ? "bg-gradient-to-b from-indigo-600 to-indigo-700 text-white border-indigo-400/90 shadow-md shadow-indigo-500/25 ring-1 ring-indigo-400"
                        : "bg-slate-800/70 text-slate-400 border-slate-700/80 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    <span className="text-[11px] font-mono font-black">{day}</span>
                    <span className={`text-[8px] font-sans font-bold leading-none ${active ? "text-indigo-200" : "text-slate-500"}`}>
                      {isFriday ? "2h" : active ? "✓" : "off"}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed pt-0.5">
              {strictDayFilter && preferredDays.length < 7 ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 inline" />
                  {language === "bn"
                    ? "কঠোর ফিল্টার সক্রিয়: অনির্বাচিত কোনো বারে ক্লাস থাকবে না। ১০০% নির্বাচিত দিনগুলোতেই রুটিন সীমাবদ্ধ থাকবে।"
                    : "Strict Filter Active: Zero classes on unselected days guaranteed. Routines will strictly fit your selected days only."}
                </span>
              ) : (
                <span>
                  {language === "bn"
                    ? "💡 নির্বাচিত দিনগুলোতে ক্লাস থাকা রুটিনগুলো ১০০% প্রায়োরিটি নিয়ে সবার উপরে রাংক করবে। অনির্বাচিত দিনগুলোকে অফ-ডে রাখা হবে।"
                    : "💡 Routines fitting within your selected days rank #1. Unselected days are treated as off-campus days."}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Preferred Faculty Selection Accordion */}
        <div className="pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setIsFacultyExpanded((prev) => !prev)}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/60 transition-all cursor-pointer text-left group"
          >
            <div className="flex items-center gap-2.5">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
              <div>
                <span className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                  {language === "bn" ? "পছন্দের শিক্ষক নির্বাচন (ঐচ্ছিক)" : "Preferred Faculty Selection (Optional)"}
                </span>
                <span className="text-[11px] text-slate-400 block">
                  {language === "bn"
                    ? "নির্দিষ্ট শিক্ষকদের অগ্রাধিকার দিতে ক্লিক করে ওপেন করুন"
                    : "Click to prioritize specific instructors for your courses"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {Object.values(facultyPreferences).some((arr) => arr.length > 0) ? (
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {Object.values(facultyPreferences).reduce((sum, arr) => sum + arr.length, 0)} Starred
                </span>
              ) : (
                <span className="text-[10px] font-mono text-slate-400">(Any Faculty)</span>
              )}
              <div className={`p-1 rounded-lg bg-slate-800 text-slate-300 transition-transform duration-200 ${isFacultyExpanded ? "rotate-180 text-amber-400" : ""}`}>
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </button>

          {isFacultyExpanded && (
            <div className="pt-4 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  {language === "bn"
                    ? "কোর্সের বিপরীতে পছন্দের শিক্ষকদের স্টার করুন:"
                    : "Click stars next to instructor initials to prioritize them:"}
                </span>
                {Object.values(facultyPreferences).some((arr) => arr.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setFacultyPreferences({})}
                    className="text-[11px] font-mono text-slate-400 hover:text-amber-400 underline transition-colors cursor-pointer"
                  >
                    Clear all faculty stars
                  </button>
                )}
              </div>

              {selectedCourses.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-800/20 border border-dashed border-slate-700 text-center text-xs text-slate-400">
                  👉 Please select your courses in Section 1 to view and choose available faculty members.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {selectedCourses.map((code) => {
                    const courseInfo = coursesCatalog.find((c) => c.code === code);
                    const facs = courseFaculties[code] || [];
                    const currentFav = facultyPreferences[code] || [];
                    const isAny = currentFav.length === 0;

                    return (
                      <div
                        key={code}
                        className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/70 hover:border-slate-600 transition-all space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="font-mono font-black text-xs text-blue-400 mr-2">{code}</span>
                            <span className="text-[11px] text-slate-300 font-medium truncate block">
                              {courseInfo?.title || code}
                            </span>
                          </div>
                          <span
                            className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              isAny
                                ? "bg-slate-700/60 text-slate-400"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {isAny ? "Any Faculty" : `${currentFav.length} Fav`}
                          </span>
                        </div>

                        {facs.length === 0 ? (
                          <p className="text-xs text-slate-500 italic">No specific faculty assigned yet (TBA)</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {facs.map((f) => {
                              const isFav = currentFav.includes(f.initial);
                              const secCount =
                                courseInfo?.sections.filter((s) => s.facultyInitial === f.initial).length || 0;
                              return (
                                <button
                                  key={f.initial}
                                  type="button"
                                  onClick={() => {
                                    setFacultyPreferences({
                                      ...facultyPreferences,
                                      [code]: isFav
                                        ? currentFav.filter((x) => x !== f.initial)
                                        : [...currentFav, f.initial],
                                    });
                                  }}
                                  className={`group px-2.5 py-1 rounded-xl text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 border ${
                                    isFav
                                      ? "bg-amber-500/20 border-amber-500/60 text-amber-200 shadow-md shadow-amber-500/10 font-bold"
                                      : "bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white"
                                  }`}
                                  title={`${f.name} (${secCount} sections)`}
                                >
                                  <Star
                                    className={`w-3 h-3 shrink-0 ${
                                      isFav ? "text-amber-400 fill-amber-400" : "text-slate-500 group-hover:text-slate-400"
                                    }`}
                                  />
                                  <span className="font-bold">[{f.initial}]</span>
                                  <span className="text-[10px] font-sans truncate max-w-[100px]">
                                    {f.name.split(" ").slice(-1)[0]}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Master Generate Button */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            {selectedCourses.length === 0 ? (
              <span className="text-amber-400 font-medium flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{language === "bn" ? "প্রথমে ধাপ ১ থেকে কোর্স সিলেক্ট করুন" : "Please select your courses in Step 1 first"}</span>
              </span>
            ) : (
              <span className="text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>{selectedCourses.length}</strong> {language === "bn" ? "টি কোর্স রেডি" : "courses selected"} • <strong>{selectedCreditsTotal}</strong> / 17 {language === "bn" ? "ক্রেডিট" : "Credits"}
                </span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleGenerateRoutines}
            disabled={generating || selectedCourses.length === 0}
            className="w-full sm:w-auto min-w-[280px] py-4 px-8 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-sm shadow-xl shadow-indigo-500/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>{language === "bn" ? "সেরা ১০টি রুটিন সাজানো হচ্ছে..." : "Computing Routines..."}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>
                  {selectedCourses.length === 0
                    ? language === "bn" ? "কোর্স সিলেক্ট করুন" : "Select Courses to Generate"
                    : language === "bn"
                    ? `১০টি সেরা রুটিন সাজান (${selectedCourses.length}টি কোর্স) 🚀`
                    : `Generate 10 Conflict-Free Routines 🚀`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Target Day Strict Conflict Diagnostic Alert */}
      {strictDayConflict && (
        <div className="rounded-3xl bg-gradient-to-b from-amber-950/40 to-slate-900/90 border border-amber-500/50 p-5 sm:p-6 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white">
                  {language === "bn"
                    ? `নির্বাচিত ${strictDayConflict.requestedDays.length} দিনের মধ্যে রুটিন সাজানো সম্ভব হয়নি`
                    : `No Clash-Free Routine Fits Strictly Within Your ${strictDayConflict.requestedDays.length} Selected Days`}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">
                  {strictDayConflict.requestedDays.join(", ")}
                </span>
              </div>

              <div className="text-xs text-slate-300 space-y-1.5 pt-1">
                {strictDayConflict.missingCourses.length > 0 ? (
                  <>
                    <p className="text-slate-400">
                      {language === "bn"
                        ? "নিচের কোর্সগুলোর কোনো সেকশন আপনার নির্বাচিত দিনগুলোতে অফার করা হয়নি:"
                        : "The following courses have NO available sections on your selected days:"}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {strictDayConflict.missingCourses.map((mc) => (
                        <div
                          key={mc.code}
                          className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <span className="font-mono font-black text-xs text-blue-400 mr-2">{mc.code}</span>
                            <span className="text-[11px] text-slate-300 truncate block">{mc.title}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">
                              Only {mc.offeredDays.join(", ")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-slate-300">
                    {language === "bn"
                      ? "আপনার নির্বাচিত কোর্সগুলোর সেকশন এই দিনগুলোতে পাওয়া গেলেও তাদের ক্লাস টাইম ওভারল্যাপ (ক্ল্যাশ) করছে।"
                      : "The available sections for your selected courses have overlapping times (clashes) on these days."}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-3">
                {strictDayConflict.suggestedDay && (
                  <button
                    type="button"
                    onClick={() => {
                      const newDays = Array.from(new Set([...preferredDays, strictDayConflict.suggestedDay!]));
                      setPreferredDays(newDays);
                      setStrictDayConflict(null);
                      setTimeout(() => {
                        handleGenerateRoutines();
                      }, 100);
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>
                      {language === "bn"
                        ? `${strictDayConflict.suggestedDay} যুক্ত করুন (+১ দিন) এবং রুটিন তৈরি করুন`
                        : `Allow ${strictDayConflict.suggestedDay} (+1 Day) & Generate`}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    runClientSideRoutineSolver(true); // forceRelaxed = true
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {language === "bn"
                      ? "১টি অফ-ডে সহ সেরা রুটিনগুলো দেখুন"
                      : "View Best Routines with 1 Extra Day"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. GENERATED ROUTINES & TIMETABLE RESULTS                                 */}
      {/* ========================================================================= */}
      {routines.length > 0 && (
        <div
          ref={routineContainerRef}
          id="routine-timetable-container"
          className="rounded-3xl bg-[#0B0F19] border border-slate-800 p-5 sm:p-7 shadow-2xl space-y-6 backdrop-blur-xl animate-in fade-in duration-300"
        >
          {/* Relaxed Filter Notice Banner */}
          {isRelaxedResult && (
            <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/40 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5 text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {language === "bn"
                    ? "নোট: নির্বাচিত দিনগুলোতে সব কোর্সের সেকশন না থাকায় ন্যূনতম অফ-ক্যাম্পাস দিন সহ বিকল্প রুটিন দেখানো হয়েছে।"
                    : "Notice: Showing best conflict-free routines with minimal extra days because some courses lack sections on your target days."}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStrictDayFilter(true);
                  setIsRelaxedResult(false);
                  runClientSideRoutineSolver();
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/40 shrink-0 cursor-pointer"
              >
                Enforce Strict Filter
              </button>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0 mt-0.5">
                <Trophy className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">
                    {language === "bn" ? "সেরা ১০টি ক্ল্যাশ-মুক্ত রুটিন" : "Top 10 Ranked Clash-Free Routines"}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
                    100% Zero-Clash Guarantee
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {language === "bn"
                    ? "১ নাম্বার অপশনটি সর্বনিম্ন টাইম গ্যাপ (ব্যাক-টু-ব্যাক) সহ সর্বাধিক প্রায়োরিটি প্রাপ্ত।"
                    : "Option 1 has the absolute highest priority score with minimal gaps and optimized timings."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
              <div className="inline-flex items-center gap-1 rounded-xl bg-slate-900 border border-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => setSelectedRoutineIndex((prev) => Math.max(0, prev - 1))}
                  disabled={selectedRoutineIndex === 0}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all disabled:opacity-30 cursor-pointer"
                  title="Previous Option"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold text-slate-300 px-2 shrink-0">
                  Option {selectedRoutineIndex + 1} of {routines.length}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedRoutineIndex((prev) => Math.min(routines.length - 1, prev + 1))}
                  disabled={selectedRoutineIndex === routines.length - 1}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all disabled:opacity-30 cursor-pointer"
                  title="Next Option"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* View Switcher */}
              <div className="inline-flex rounded-xl bg-slate-900 border border-slate-800 p-1">
                {(["Weekly", "Daily", "Overview"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setViewMode(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewMode === tab
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {tab === "Weekly" ? "Weekly Grid" : tab === "Daily" ? "Daily Agenda" : "Section List"}
                  </button>
                ))}
              </div>

              {/* Exports */}
              <button
                type="button"
                onClick={handleDownloadPNG}
                disabled={isExporting}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Download PNG"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>PNG</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={isExporting}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                title="Download PDF"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>
            </div>
          </div>

          {/* Option Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {routines.map((opt, idx) => {
              const isSelected = selectedRoutineIndex === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedRoutineIndex(idx)}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 border ${
                    isSelected
                      ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/30 scale-105"
                      : "bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  {idx === 0 && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                  <span>Option {idx + 1}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${isSelected ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"}`}>
                    {opt.matchPercentage}%
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Option Highlight Banner */}
          {activeRoutine && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900 border border-blue-500/40 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono font-black text-sm text-blue-400">
                  #{activeRoutine.rank || selectedRoutineIndex + 1} Option {selectedRoutineIndex + 1}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                  {activeRoutine.matchPercentage}% Efficiency Score
                </span>
                {selectedRoutineIndex === 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400" />
                    <span>Best Choice (Lowest Gap)</span>
                  </span>
                )}
                <div className="flex flex-wrap items-center gap-1.5 text-slate-300 font-medium">
                  {activeRoutine.highlights.map((h, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60 text-[11px]">
                      {h}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 font-mono text-slate-400">
                <span>{activeRoutine.totalCredits} Credits</span>
                <span>{activeRoutine.activeDaysCount} Days ({activeRoutine.activeDays.join(", ")})</span>
                <button
                  type="button"
                  onClick={handleCopySectionCodes}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-blue-400" />
                  <span>Copy Codes</span>
                </button>
              </div>
            </div>
          )}

          {/* Timetable Sheet (Weekly Grid) */}
          {viewMode === "Weekly" && activeRoutine && (
            <div className="rounded-2xl border border-slate-800 overflow-x-auto bg-[#070A12] p-4">
              <div className="min-w-[800px] space-y-4">
                {/* 12-Hour Timeline Header Axis */}
                <div className="grid grid-cols-[80px_1fr] items-center border-b border-slate-800 pb-2">
                  <div className="text-[11px] font-mono font-bold text-slate-500 text-center uppercase">
                    DAY
                  </div>
                  <div className="relative flex justify-between text-[10px] font-mono text-slate-400 px-1 select-none">
                    {TIME_12_AXIS.map((t) => (
                      <span key={t} className="shrink-0">{t}</span>
                    ))}
                  </div>
                </div>

                {/* 7 Day Rows */}
                <div className="space-y-3">
                  {WEEK_DAYS.map((day) => {
                    const daySlots = activeRoutine.sections.flatMap((sec) =>
                      sec.slots
                        .filter((sl) => sl.day.toUpperCase() === day)
                        .map((sl) => ({ sec, slot: sl }))
                    );

                    const isFree = daySlots.length === 0;

                    return (
                      <div
                        key={day}
                        className={`grid grid-cols-[80px_1fr] items-stretch rounded-xl border transition-all ${
                          isFree
                            ? "bg-slate-900/20 border-slate-800/40 opacity-40 hover:opacity-75"
                            : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        {/* Day Label */}
                        <div className="p-3 border-r border-slate-800/80 flex flex-col justify-center items-center text-center">
                          <span className="font-mono font-black text-sm text-white">{day}</span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {isFree ? "Free" : `${daySlots.length} class`}
                          </span>
                          {!isFree && preferredDays.length < 7 && !preferredDays.includes(day) && (
                            <span className="mt-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                              Extra Day
                            </span>
                          )}
                        </div>

                        {/* Timeline Track */}
                        <div className="relative h-18 p-1.5 flex items-center">
                          {/* Guide Grid Lines */}
                          <div className="absolute inset-0 pointer-events-none flex justify-between px-1">
                            {TIME_12_AXIS.map((_, i) => (
                              <div key={i} className="h-full border-r border-slate-800/30" />
                            ))}
                          </div>

                          {/* Render Class Blocks */}
                          {daySlots.map(({ sec, slot }) => {
                            const sm = slot.startMinutes ?? timeToMinutes(slot.start);
                            const em = slot.endMinutes ?? timeToMinutes(slot.end);
                            const clampedStart = Math.max(TIMELINE_START_MINUTES, Math.min(TIMELINE_END_MINUTES, sm));
                            const clampedEnd = Math.max(TIMELINE_START_MINUTES, Math.min(TIMELINE_END_MINUTES, em));
                            const leftPct = ((clampedStart - TIMELINE_START_MINUTES) / TIMELINE_TOTAL_MINUTES) * 100;
                            const widthPct = Math.max(((clampedEnd - clampedStart) / TIMELINE_TOTAL_MINUTES) * 100, 7);
                            const theme = COURSE_THEMES[sec.courseCode] || DEFAULT_THEME;

                            return (
                              <div
                                key={`${sec.courseCode}-${sec.sectionNumber}-${slot.start}`}
                                style={{
                                  left: `${leftPct}%`,
                                  width: `${widthPct}%`,
                                }}
                                className={`absolute h-15 rounded-xl border p-2 flex flex-col justify-between overflow-hidden shadow-lg transition-all group hover:z-20 hover:scale-[1.02] cursor-pointer bg-gradient-to-br ${theme.bg} ${theme.border} backdrop-blur-md`}
                              >
                                <div className="flex items-center justify-between gap-1 leading-none">
                                  <span className="font-mono font-black text-[11px] text-white truncate">
                                    {sec.courseCode}.{sec.sectionNumber}
                                  </span>
                                  <span className="text-[9px] font-mono font-bold px-1 rounded bg-black/40 text-amber-300">
                                    [{sec.facultyInitial}]
                                  </span>
                                </div>
                                <p className="text-[10px] font-semibold text-slate-200 truncate leading-tight" title={sec.courseTitle}>
                                  {sec.courseTitle}
                                </p>
                                <div className="flex items-center justify-between text-[9px] font-mono text-slate-300 leading-none">
                                  <span>{slot.start}-{slot.end}</span>
                                  <span className="text-amber-200/80 truncate max-w-[55px]">{slot.room}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Daily View Mode */}
          {viewMode === "Daily" && activeRoutine && (
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {WEEK_DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDailyDay(d)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                      dailyDay === d
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-slate-900 text-slate-400 hover:text-white"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {activeRoutine.sections
                  .flatMap((sec) =>
                    sec.slots
                      .filter((sl) => sl.day.toUpperCase() === dailyDay)
                      .map((sl) => ({ sec, slot: sl }))
                  )
                  .sort((a, b) => (a.slot.startMinutes ?? 0) - (b.slot.startMinutes ?? 0))
                  .map(({ sec, slot }, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-white">
                            {sec.courseCode}.{sec.sectionNumber}
                          </span>
                          <span className="text-xs text-slate-300 font-bold">{sec.courseTitle}</span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono">
                          Faculty: <strong>{sec.facultyName}</strong> [{sec.facultyInitial}] • Room: <strong>{slot.room}</strong>
                        </p>
                      </div>
                      <div className="text-right font-mono text-xs font-bold text-blue-400">
                        {slot.start} - {slot.end}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Section List / Overview Mode */}
          {viewMode === "Overview" && activeRoutine && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {activeRoutine.sections.map((sec) => (
                <div
                  key={`${sec.courseCode}.${sec.sectionNumber}`}
                  className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-black text-sm text-blue-400 mr-2">
                        {sec.courseCode}.{sec.sectionNumber}
                      </span>
                      <span className="text-xs font-bold text-white">{sec.courseTitle}</span>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {sec.credits} Cr
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Instructor: <strong>{sec.facultyName}</strong> [{sec.facultyInitial}]
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {sec.slots.map((sl, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-slate-800 text-amber-300 border border-slate-700"
                      >
                        {sl.day} • {sl.start} - {sl.end} @ {sl.room}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* COURSE CATALOG & ADVISING DATA MODAL (FULL OVERHAUL WITH LIVE PARSER)     */}
      {/* ========================================================================= */}
      <AdvisingDataModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        currentSections={sections}
        onSaveCatalog={handleSaveCatalog}
        semester={semester}
        isStaffOrAdmin={Boolean(isAdmin || isSuperAdmin || user?.role === "ROLE_ADMIN" || user?.role === "ROLE_MANAGER" || user?.role === "ROLE_SUPER_ADMIN")}
      />
    </div>
  );
}
