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
  Coffee,
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
  outsideWindowCount: number;
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

  // Preferences: Multi-Select Timing Filters & Windows
  const [timePreference, setTimePreference] = useState<string>("ANY");
  const [avoidEarlyMorning, setAvoidEarlyMorning] = useState<boolean>(false); // Skip 08:00 Lab & 08:30 Theory
  const [avoidLateEvening, setAvoidLateEvening] = useState<boolean>(false); // Skip after 04:30 PM (Theory & Lab)
  const [customStartTime, setCustomStartTime] = useState<string>("10:00 AM");
  const [customEndTime, setCustomEndTime] = useState<string>("02:50 PM");
  const [dayPreference, setDayPreference] = useState<
    "MINIMIZE_DAYS" | "COMPACT_GAPS" | "BALANCED_BREAK" | "ANY"
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

  // Target Days Multi-Additive Toggle (supports combining pairs to make 2, 4, 6 days)
  const handleToggleDayPair = (daysToToggle: string[]) => {
    setStrictDayConflict(null);
    const allPresent = daysToToggle.every((d) => preferredDays.includes(d));
    if (allPresent) {
      const remaining = preferredDays.filter((d) => !daysToToggle.includes(d));
      if (remaining.length === 0) {
        toast.error(language === "bn" ? "কমপক্ষে ১টি বার নির্বাচিত রাখতে হবে।" : "Please keep at least 1 day selected.");
        return;
      }
      setPreferredDays(remaining);
    } else {
      setPreferredDays((prev) => Array.from(new Set([...prev, ...daysToToggle])));
    }
  };

  // Quick Preset Goals (2 Days, 3 Days, 4 Days, 5 Days, All 7 Days)
  const handleApplyDayGoal = (goal: "2DAYS" | "3DAYS" | "4DAYS" | "5DAYS" | "ALL") => {
    setStrictDayConflict(null);
    if (goal === "2DAYS") {
      setPreferredDays(["SUN", "TUE"]);
      toast.success(language === "bn" ? "⚡ ২ দিনের টার্গেট (রবি + মঙ্গল) নির্বাচিত হয়েছে" : "⚡ 2-Day Target (Sun + Tue) selected");
    } else if (goal === "3DAYS") {
      setPreferredDays(["SUN", "TUE", "THU"]);
      toast.success(language === "bn" ? "🎯 ৩ দিনের টার্গেট (রবি + মঙ্গল + বৃহঃ) নির্বাচিত হয়েছে" : "🎯 3-Day Target (Sun, Tue, Thu) selected");
    } else if (goal === "4DAYS") {
      setPreferredDays(["SUN", "MON", "TUE", "WED"]);
      toast.success(language === "bn" ? "🗓️ ৪ দিনের টার্গেট (রবি - বুধ) নির্বাচিত হয়েছে" : "🗓️ 4-Day Target (Sun - Wed) selected");
    } else if (goal === "5DAYS") {
      setPreferredDays(["SUN", "MON", "TUE", "WED", "THU"]);
      toast.success(language === "bn" ? "🏢 ৫ দিনের উইকডেজ (রবি - বৃহঃ) নির্বাচিত হয়েছে" : "🏢 5-Day Weekdays (Sun - Thu) selected");
    } else if (goal === "ALL") {
      setPreferredDays(["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]);
      toast.success(language === "bn" ? "🌐 সব ৭ দিন (ফুল ফ্লেক্সিবল) নির্বাচিত হয়েছে" : "🌐 All 7 Days (Full Flexibility) selected");
    }
  };

  // Toggle Individual Day
  const handleToggleSingleDay = (day: string) => {
    setStrictDayConflict(null);
    if (preferredDays.includes(day)) {
      if (preferredDays.length <= 1) {
        toast.error(language === "bn" ? "কমপক্ষে ১টি বার নির্বাচিত রাখতে হবে।" : "Please keep at least 1 day selected.");
        return;
      }
      setPreferredDays((prev) => prev.filter((d) => d !== day));
    } else {
      setPreferredDays((prev) => [...prev, day]);
    }
  };

  // Generate Routines Handler (High-Performance Multi-Objective Solver)
  const handleGenerateRoutines = async () => {
    if (selectedCourses.length === 0) {
      toast.error(language === "bn" ? "কমপক্ষে ১টি কোর্স নির্বাচন করুন!" : "Please select at least 1 course!");
      return;
    }

    setGenerating(true);
    setStrictDayConflict(null);

    // Direct in-memory multi-objective solver (Instant execution < 20ms):
    // 1. 100% strict adherence to selected campus days (zero off-days when strict).
    // 2. Heavy preferred faculty prioritization in both candidate exploration and top rankings.
    // 3. Guaranteed minimum dead gaps in Top 5 (10-15m room changes, zero wasted wait hours).
    runClientSideRoutineSolver();
  };

  const runClientSideRoutineSolver = (forceRelaxed = false) => {
    const isDayFilterActive = preferredDays && preferredDays.length > 0 && preferredDays.length < 7;
    const prefSet = new Set(preferredDays.map((d) => d.toUpperCase()));
    const useStrict = strictDayFilter && isDayFilterActive && !forceRelaxed;

    // Parse target timing window parameters
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
    } else if (timePreference === "WINDOW_800_TO_1130" || timePreference === "WINDOW_830_TO_1130") {
      targetStartMin = 480;
      targetEndMin = 690;
      windowLabel = "08:00 AM - 11:30 AM";
    } else if (timePreference === "WINDOW_130_TO_430") {
      targetStartMin = 810;
      targetEndMin = 990;
      windowLabel = "01:30 PM - 04:30 PM";
    } else if (timePreference === "WINDOW_300_TO_630" || timePreference === "WINDOW_300_TO_600") {
      targetStartMin = 900;
      targetEndMin = 1110;
      windowLabel = "03:00 PM - 06:30 PM";
    } else if (timePreference === "CUSTOM") {
      targetStartMin = time12ToMinutes(customStartTime);
      targetEndMin = time12ToMinutes(customEndTime);
      windowLabel = `${customStartTime} - ${customEndTime}`;
    }

    // Helper: count how many slots in a section violate the user's requested time window
    const getSectionTimePenalty = (sec: OfferedSectionItem) => {
      if (!sec.slots || sec.slots.length === 0) return 0;
      let penalty = 0;
      for (const sl of sec.slots) {
        const sm = sl.startMinutes ?? timeToMinutes(sl.start);
        const em = sl.endMinutes ?? timeToMinutes(sl.end);

        // 1. Avoid early morning: skip classes before 10:00 AM (08:00 lab, 08:30 theory)
        if ((avoidEarlyMorning || timePreference === "AVOID_MORNING") && sm < 600) {
          penalty += 3;
        }

        // 2. Avoid late evening: skip classes running after 04:30 PM (04:30 - 05:50 theory, 04:30 - 06:30 lab)
        if ((avoidLateEvening || timePreference === "AVOID_LATE") && (em > 990 || sm >= 990)) {
          penalty += 3;
        }

        // 3. Predefined window or custom window
        if (targetStartMin >= 0 && targetEndMin > targetStartMin) {
          if (sm < targetStartMin || em > targetEndMin) {
            penalty += 1;
          }
        }
      }
      return penalty;
    };

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

      const prefFacs = facultyPreferences[cCode] || [];

      // Sort candidate sections: Preferred Faculty FIRST (High Priority), then Time Penalties, then Days
      const sortCandidates = (list: OfferedSectionItem[]) => {
        return [...list].sort((s1, s2) => {
          // 1. Preferred Faculty Priority (Highest Priority when selected by user!)
          if (prefFacs.length > 0) {
            const p1 = prefFacs.includes(s1.facultyInitial);
            const p2 = prefFacs.includes(s2.facultyInitial);
            if (p1 !== p2) return p1 ? -1 : 1;
          }

          // 2. Time Window & Multi-Filter Penalty: Sections that fit user's chosen hours come first!
          const t1 = getSectionTimePenalty(s1);
          const t2 = getSectionTimePenalty(s2);
          if (t1 !== t2) return t1 - t2;

          // 3. Outside Days Priority (if not in strict mode)
          if (isDayFilterActive) {
            const out1 = s1.slots.filter((sl) => !prefSet.has(sl.day.toUpperCase())).length;
            const out2 = s2.slots.filter((sl) => !prefSet.has(sl.day.toUpperCase())).length;
            if (out1 !== out2) return out1 - out2;
          }

          return 0;
        });
      };

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
          courseSecsList.push(sortCandidates(strictSecs));
        }
      } else {
        courseSecsList.push(sortCandidates(pool));
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

          if (dayPreference === "BALANCED_BREAK") {
            if (gap >= 25 && gap <= 65) {
              consecutiveBonus += 60;
            } else if (gap < 20) {
              consecutiveBonus += 20;
            } else {
              totalGapMinutes += gap;
              longGapPenalty += Math.floor(gap / 15) * 15;
            }
          } else {
            // Default or COMPACT_GAPS: back-to-back reward!
            // 0 - 15m transition between rooms: Ideal consecutive!
            if (gap <= 15) {
              consecutiveBonus += 100; // Big bonus for back-to-back classes
            } else if (gap <= 40) {
              consecutiveBonus += 30; // Small lunch/prayer gap
              totalGapMinutes += gap;
            } else {
              // Dead gap penalty: heavily penalize gaps longer than 40 minutes!
              totalGapMinutes += gap;
              longGapPenalty += Math.floor(gap / 15) * 35; // Severe penalty for 1h, 2h, 3h dead gaps!
            }
          }
        }
      });

      score += consecutiveBonus;
      score -= longGapPenalty;

      // 2. PREFERRED DAYS & STRICT DAY MATCHING
      const activeDays = Object.keys(daySlotsMap);
      const dayCount = activeDays.length;
      const outsideDays = activeDays.filter((d) => !prefSet.has(d.toUpperCase()));
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
          score += 100;
          highlights.push(`⚡ Ultra-Compact (${dayCount} Campus Days)`);
        } else if (dayCount === 3) {
          score += 60;
          highlights.push(`🗓️ Balanced 3 Campus Days`);
        } else if (dayCount >= 5) {
          score -= 60;
        }
      } else if (dayPreference === "BALANCED_BREAK") {
        highlights.push(`☕ Healthy 30-60m Breaks`);
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

      // 4. TIME PREFERENCES & WINDOW STRICTNESS
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
      } else if (timePreference === "WINDOW_800_TO_1130" || timePreference === "WINDOW_830_TO_1130") {
        targetStartMin = 480; // 08:00 AM accommodates 08:00 AM early lab and 08:30 theory
        targetEndMin = 690;
        windowLabel = "08:00 AM - 11:30 AM";
      } else if (timePreference === "WINDOW_130_TO_430") {
        targetStartMin = 810;
        targetEndMin = 990;
        windowLabel = "01:30 PM - 04:30 PM";
      } else if (timePreference === "WINDOW_300_TO_630" || timePreference === "WINDOW_300_TO_600") {
        targetStartMin = 900;
        targetEndMin = 1110; // 06:30 PM accommodates evening lab class running until 6:30 PM
        windowLabel = "03:00 PM - 06:30 PM";
      } else if (timePreference === "CUSTOM") {
        targetStartMin = time12ToMinutes(customStartTime);
        targetEndMin = time12ToMinutes(customEndTime);
        windowLabel = `${customStartTime} - ${customEndTime}`;
      }

      let outsideWindowCount = 0;
      let totalSlotsCount = 0;
      let morningViolationCount = 0;
      let eveningViolationCount = 0;

      combo.forEach((sec) => {
        sec.slots.forEach((slot) => {
          totalSlotsCount++;
          const sm = slot.startMinutes ?? timeToMinutes(slot.start);
          const em = slot.endMinutes ?? timeToMinutes(slot.end);

          let hasViolation = false;
          // Avoid early morning (08:00 lab, 08:30 theory)
          if ((avoidEarlyMorning || timePreference === "AVOID_MORNING") && sm < 600) {
            morningViolationCount++;
            hasViolation = true;
          }
          // Avoid late evening (after 04:30 PM)
          if ((avoidLateEvening || timePreference === "AVOID_LATE") && (em > 990 || sm >= 990)) {
            eveningViolationCount++;
            hasViolation = true;
          }
          // Window filter
          if (targetStartMin >= 0 && targetEndMin > targetStartMin) {
            if (sm < targetStartMin || em > targetEndMin) {
              hasViolation = true;
            }
          }
          if (hasViolation) {
            outsideWindowCount++;
          }
        });
      });

      if (targetStartMin >= 0 && targetEndMin > targetStartMin) {
        if (outsideWindowCount === 0) {
          score += 250;
          highlights.push(`🎯 100% Fits ${windowLabel} Window`);
        } else {
          score -= outsideWindowCount * 120;
          highlights.push(`⚠️ ${outsideWindowCount} class(es) outside ${windowLabel}`);
        }
      }
      if (avoidEarlyMorning || timePreference === "AVOID_MORNING") {
        if (morningViolationCount === 0) {
          score += 200;
          highlights.push("☀️ No Early 08:00/08:30 Classes");
        } else {
          score -= morningViolationCount * 150;
        }
      }
      if (avoidLateEvening || timePreference === "AVOID_LATE") {
        if (eveningViolationCount === 0) {
          score += 180;
          highlights.push("🌇 No Late Afternoon (4:30 PM+) Classes");
        } else {
          score -= eveningViolationCount * 150;
        }
      }

      if (timePreference === "PREFER_MORNING") {
        score += morningCount * 15;
        if (morningCount > afternoonCount) highlights.push("🌅 Morning Focused");
      } else if (timePreference === "PREFER_AFTERNOON") {
        score += afternoonCount * 15;
        if (afternoonCount > morningCount) highlights.push("☕ Afternoon Focused");
      }

      // 5. FACULTY PREFERENCES (HIGH PRIORITY)
      let facMatchCount = 0;
      let targetFacTotal = 0;
      combo.forEach((sec) => {
        const pref = facultyPreferences[sec.courseCode];
        if (pref && pref.length > 0) {
          targetFacTotal++;
          const idx = pref.indexOf(sec.facultyInitial);
          if (idx === 0) {
            score += 350; // Top preferred faculty matched!
            facMatchCount++;
          } else if (idx > 0) {
            score += 220; // Alternate preferred faculty matched!
            facMatchCount++;
          } else {
            score -= 150; // Did not match preferred faculty when one was requested
          }
        }
      });

      if (targetFacTotal > 0 && facMatchCount === targetFacTotal) {
        highlights.push(`⭐ 100% Preferred Faculty Matched (${facMatchCount}/${targetFacTotal})`);
      } else if (facMatchCount > 0) {
        highlights.push(`⭐ ${facMatchCount}/${targetFacTotal} Preferred Faculty`);
      }

      // Penalize sections that are closed (0 available seats)
      combo.forEach((sec) => {
        if (sec.availableSeats === 0) {
          score -= 25; // Soft penalty so open sections are ranked higher
        }
      });

      const totalCredits = combo.reduce((sum, s) => sum + s.credits, 0);

      return {
        sections: combo,
        score,
        matchPercentage: 100, // Calculated progressively in top10
        rank: 0,
        activeDaysCount: dayCount,
        activeDays,
        totalCredits,
        totalGapMinutes,
        facultyMatchCount: facMatchCount,
        outsideWindowCount,
        hasEarlyMorning: hasEarly,
        hasLateEvening: hasLate,
        highlights,
      };
    });

    // Multi-Objective Hierarchy Master Sort:
    // 1. Outside Days Strictness (0 outside days ALWAYS comes first!)
    // 2. Preferred Faculty Priority: routines with MORE preferred faculty matches rank strictly higher!
    // 3. Strict Timing Window Compliance: routines with 0 outside-window classes ALWAYS rank first!
    // 4. Minimum Dead Gap Priority (Top options guarantee minimal gap!):
    // 5. Composite score
    scored.sort((a, b) => {
      // 1. Outside Days Strictness (if user selected specific days)
      if (preferredDays && preferredDays.length > 0 && preferredDays.length < 7) {
        const aOutside = a.activeDays.filter((d) => !prefSet.has(d.toUpperCase())).length;
        const bOutside = b.activeDays.filter((d) => !prefSet.has(d.toUpperCase())).length;
        if (aOutside !== bOutside) {
          return aOutside - bOutside; // Fewer or 0 outside days strictly first!
        }
      }

      // 2. Preferred Faculty Priority (Highest priority when user starred a favorite teacher!)
      if (a.facultyMatchCount !== b.facultyMatchCount) {
        return b.facultyMatchCount - a.facultyMatchCount; // More preferred faculty first!
      }

      // 3. Strict Timing Filter Compliance:
      if (a.outsideWindowCount !== b.outsideWindowCount) {
        return a.outsideWindowCount - b.outsideWindowCount;
      }

      // 4. Minimum Dead Gap Priority (Top options guarantee minimal gap!):
      if (dayPreference === "COMPACT_GAPS" || dayPreference === "ANY" || !dayPreference) {
        if (Math.abs(a.totalGapMinutes - b.totalGapMinutes) >= 15) {
          return a.totalGapMinutes - b.totalGapMinutes; // Lowest waiting gap first (0m, 10m first)!
        }
      }

      // 5. Composite score fallback
      return b.score - a.score;
    });

    const top10 = scored.slice(0, 10).map((opt, idx) => {
      // Progressive, realistic match percentage:
      // Option 1 has highest efficiency (e.g. 98% - 100% if 0 gap, 0 time violation)
      // Subsequent options decline progressively (e.g. 98%, 95%, 92%, 89%, 86%, 83%, 80%, 77%, 74%, 71%)
      let eff = 98 - idx * 3;
      if (idx === 0 && opt.totalGapMinutes === 0 && opt.outsideWindowCount === 0) {
        eff = 100;
      }
      if (opt.totalGapMinutes > 30) {
        eff -= Math.min(6, Math.floor(opt.totalGapMinutes / 30) * 2);
      }
      if (opt.outsideWindowCount > 0) {
        eff -= opt.outsideWindowCount * 4;
      }
      const matchPercentage = Math.max(65, Math.min(100, eff));
      return {
        ...opt,
        rank: idx + 1,
        matchPercentage,
      };
    });

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
      {/* 2. PRIORITIES & GAP CONTROL (OVERHAULED: INTUITIVE, PROFESSIONAL & POWERFUL) */}
      {/* ========================================================================= */}
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-5 sm:p-7 backdrop-blur-md space-y-7 shadow-xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 text-indigo-400 border border-indigo-500/30 shadow-inner">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>{language === "bn" ? "২. সময়সূচি, গ্যাপ ও টার্গেট দিন নির্বাচন" : "2. Priorities, Schedule Style & Target Days"}</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  {preferredDays.length} {language === "bn" ? "দিন নির্বাচিত" : "Days Active"}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === "bn"
                  ? "ক্যাম্পাসে যাওয়ার দিনসমূহ, ক্লাসের ফাঁকে গ্যাপের ধরণ এবং সুবিধাজনক সময়সূচি নির্ধারণ করুন।"
                  : "Configure your target campus days, class break styles, and preferred daily timing windows."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="text-[11px] font-mono px-3 py-1.5 rounded-xl bg-slate-800/90 text-slate-300 border border-slate-700/80 shadow-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                {dayPreference === "COMPACT_GAPS"
                  ? "Back-to-Back"
                  : dayPreference === "BALANCED_BREAK"
                  ? "Healthy Break"
                  : dayPreference === "MINIMIZE_DAYS"
                  ? "Max Days Off"
                  : "Balanced Spread"}
              </span>
            </span>
          </div>
        </div>

        {/* ------------------------------------------------------------------------- */}
        {/* TIER 1: TARGET CAMPUS DAYS BUILDER (CLEAN & DIRECT SELECTION)             */}
        {/* ------------------------------------------------------------------------- */}
        <div className="rounded-2xl bg-slate-950/60 border border-slate-800/90 p-3.5 sm:p-4 space-y-3">
          {/* Header with Title + Active Count + Quick Helpers + Strict Filter Toggle */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 border-b border-slate-800/60 pb-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs sm:text-sm font-extrabold text-white">
                {language === "bn" ? "টার্গেট ক্যাম্পাস দিন ও উপস্থিতি" : "Target Campus Days & Attendance"}
              </h3>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-bold">
                {preferredDays.length} / 7 {language === "bn" ? "দিন নির্বাচিত" : "Days Active"}
                {preferredDays.length > 0 && preferredDays.length < 7 && ` (${preferredDays.join(", ")})`}
              </span>
            </div>

            {/* Quick Actions & Strict Mode Toggle */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Quick Select Helpers */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setStrictDayConflict(null);
                    setPreferredDays(["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]);
                  }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                    preferredDays.length === 7
                      ? "bg-indigo-600 text-white border-indigo-400 shadow-xs"
                      : "bg-slate-900/80 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {language === "bn" ? "সব ৭ দিন" : "All 7 Days"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStrictDayConflict(null);
                    setPreferredDays(["SUN", "MON", "TUE", "WED", "THU"]);
                  }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                    preferredDays.length === 5 && !preferredDays.includes("FRI") && !preferredDays.includes("SAT")
                      ? "bg-indigo-600 text-white border-indigo-400 shadow-xs"
                      : "bg-slate-900/80 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {language === "bn" ? "উইকডেজ" : "Weekdays"}
                </button>
              </div>

              {/* Strict vs Flexible Filter Toggle */}
              <button
                type="button"
                onClick={() => {
                  setStrictDayFilter((prev) => !prev);
                  setStrictDayConflict(null);
                }}
                className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                  strictDayFilter
                    ? "bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-xs"
                    : "bg-amber-950/80 border-amber-500/60 text-amber-300 shadow-xs"
                }`}
                title={
                  strictDayFilter
                    ? "Strict Mode: Zero classes on unselected days guaranteed"
                    : "Flexible Mode: Allows fallback days if required"
                }
              >
                <ShieldCheck className={`w-3.5 h-3.5 ${strictDayFilter ? "text-emerald-400" : "text-amber-400"}`} />
                <span>
                  {strictDayFilter
                    ? language === "bn"
                      ? "স্ট্রিক্ট: সক্রিয়"
                      : "Strict: ON"
                    : language === "bn"
                    ? "ফ্লেক্সিবল"
                    : "Flexible"}
                </span>
              </button>
            </div>
          </div>

          {/* 7 Sleek Day Tiles - Direct Selection */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 sm:gap-2">
            {WEEK_DAYS.map((day) => {
              const active = preferredDays.includes(day);
              const dayNames: Record<string, { en: string; bn: string }> = {
                SUN: { en: "Sunday", bn: "রবিবার" },
                MON: { en: "Monday", bn: "সোমবার" },
                TUE: { en: "Tuesday", bn: "মঙ্গলবার" },
                WED: { en: "Wednesday", bn: "বুধবার" },
                THU: { en: "Thursday", bn: "বৃহস্পতিবার" },
                FRI: { en: "Friday", bn: "শুক্রবার" },
                SAT: { en: "Saturday", bn: "শনিবার" },
              };
              const dayTypes: Record<string, { en: string; bn: string }> = {
                SUN: { en: "Theory Pair", bn: "থিওরি পেয়ার" },
                MON: { en: "Theory Pair", bn: "থিওরি পেয়ার" },
                TUE: { en: "Theory Pair", bn: "থিওরি পেয়ার" },
                WED: { en: "Theory Pair", bn: "থিওরি পেয়ার" },
                THU: { en: "Theory Pair", bn: "থিওরি পেয়ার" },
                FRI: { en: "2h Lab", bn: "২ঘণ্টা ল্যাব" },
                SAT: { en: "Theory Pair", bn: "থিওরি পেয়ার" },
              };

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleToggleSingleDay(day)}
                  className={`p-2 sm:p-2.5 rounded-xl text-left transition-all cursor-pointer border flex flex-col justify-between gap-1 ${
                    active
                      ? "bg-gradient-to-b from-indigo-950/80 to-slate-900/90 border-indigo-500/80 shadow-xs ring-1 ring-indigo-500/40"
                      : "bg-slate-900/40 border-slate-800/80 text-slate-500 hover:border-slate-700 hover:bg-slate-900/70"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-mono font-black text-xs sm:text-sm ${active ? "text-white" : "text-slate-400"}`}>
                      {day}
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                        active
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                          : "bg-slate-800 text-slate-500 border border-slate-700"
                      }`}
                    >
                      {active ? "✓ On" : "✕ Off"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px]">
                    <span className={`font-semibold ${active ? "text-slate-300" : "text-slate-500"}`}>
                      {language === "bn" ? dayNames[day]?.bn : dayNames[day]?.en}
                    </span>
                    <span className={`text-[9px] font-mono ${active ? "text-indigo-400" : "text-slate-600"}`}>
                      {language === "bn" ? dayTypes[day]?.bn : dayTypes[day]?.en}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Combinations Bar (Compact flex line) */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider mr-1">
              {language === "bn" ? "পেয়ার টগল:" : "Quick Pairs:"}
            </span>
            {[
              { label: "SUN & TUE", days: ["SUN", "TUE"], desc: "Theory" },
              { label: "MON & WED", days: ["MON", "WED"], desc: "Theory" },
              { label: "THU & SAT", days: ["THU", "SAT"], desc: "Theory" },
              { label: "FRI (2h)", days: ["FRI"], desc: "Labs" },
            ].map((p) => {
              const isFullyActive = p.days.every((d) => preferredDays.includes(d));
              const isPartiallyActive = !isFullyActive && p.days.some((d) => preferredDays.includes(d));

              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleToggleDayPair(p.days)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer border flex items-center gap-1 ${
                    isFullyActive
                      ? "bg-indigo-600 text-white border-indigo-400 shadow-xs"
                      : isPartiallyActive
                      ? "bg-indigo-950/60 text-indigo-300 border-indigo-600/50"
                      : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <span className="text-indigo-400 font-black">{isFullyActive ? "✓" : "+"}</span>
                  <span>{p.label}</span>
                </button>
              );
            })}

            {preferredDays.length < 7 && (
              <button
                type="button"
                onClick={() => {
                  setStrictDayConflict(null);
                  setPreferredDays(["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]);
                }}
                className="px-2 py-1 rounded-lg text-[10px] font-mono text-slate-400 hover:text-white border border-dashed border-slate-800 hover:border-slate-700 bg-slate-900/40 transition-colors cursor-pointer"
              >
                + {language === "bn" ? "সব ৭ দিন" : "All 7 Days"}
              </button>
            )}

            {strictDayFilter && preferredDays.length < 7 && (
              <span className="ml-auto text-[10px] text-emerald-400 font-medium hidden md:flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {language === "bn"
                    ? `১০০% কেবল নির্বাচিত ${preferredDays.length} দিনেই সীমাবদ্ধ`
                    : `100% within your ${preferredDays.length} selected days`}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------------------- */}
        {/* TIER 2: TWO COLUMNS (TIME PREFERENCE WINDOW & GAP/BREAK STYLE CARDS)      */}
        {/* ------------------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Column A: Time Preference Window */}
          <div className="rounded-2xl bg-slate-950/60 border border-slate-800/90 p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs sm:text-sm font-extrabold text-white">
                  {language === "bn" ? "ক্লাসের সময়সূচি (১২-ঘণ্টা AM/PM)" : "Class Timing Window (12-Hour AM/PM)"}
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700">
                {timePreference === "ANY"
                  ? language === "bn" ? "ফ্লেক্সিবল" : "Flexible"
                  : language === "bn" ? "উইন্ডো ফিল্টার" : "Window Filter"}
              </span>
            </div>

            {/* Multi-Select Smart Avoidance Toggles */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                {language === "bn" ? "ক্লাস বর্জন ফিল্টার (মাল্টিপল নির্বাচনযোগ্য):" : "Avoidance Filters (Multi-Selectable):"}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAvoidEarlyMorning((prev) => !prev)}
                  className={`p-2 rounded-xl text-left transition-all cursor-pointer border flex items-center justify-between gap-2 ${
                    avoidEarlyMorning
                      ? "bg-rose-950/60 border-rose-500/80 text-white shadow-xs ring-1 ring-rose-500/50"
                      : "bg-slate-900/80 hover:bg-slate-800 text-slate-400 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <span>🚫</span>
                      <span>{language === "bn" ? "সকালের ক্লাস বাদ (৮:০০/৮:৩০)" : "Avoid Early Morning"}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {language === "bn" ? "০৮:০০ ল্যাব ও ০৮:৩০ থিওরি এড়িয়ে" : "Skip 08:00 Lab & 08:30 Theory"}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      avoidEarlyMorning
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    {avoidEarlyMorning ? "✓ Active" : "+ Off"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAvoidLateEvening((prev) => !prev)}
                  className={`p-2 rounded-xl text-left transition-all cursor-pointer border flex items-center justify-between gap-2 ${
                    avoidLateEvening
                      ? "bg-purple-950/60 border-purple-500/80 text-white shadow-xs ring-1 ring-purple-500/50"
                      : "bg-slate-900/80 hover:bg-slate-800 text-slate-400 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <span>🌙</span>
                      <span>{language === "bn" ? "বিকেল/সন্ধ্যার ক্লাস বাদ (৪:৩০+)" : "Avoid Late Evening"}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {language === "bn" ? "০৪:৩০ এর পরের থিওরি ও ল্যাব এড়িয়ে" : "Skip slots running after 04:30 PM"}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      avoidLateEvening
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                        : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    {avoidLateEvening ? "✓ Active" : "+ Off"}
                  </span>
                </button>
              </div>
            </div>

            {/* Preferred Window Chips */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                {language === "bn" ? "পছন্দের দৈনিক উইন্ডো:" : "Preferred Daily Window:"}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                {[
                  { id: "ANY", label: "⚡ Any Time", sub: "08:00 AM - 06:30 PM" },
                  { id: "WINDOW_10_TO_1", label: "🎯 Prime", sub: "10:00 AM - 01:00 PM" },
                  { id: "WINDOW_10_TO_3", label: "🌇 Full Day", sub: "10:00 AM - 03:00 PM" },
                  { id: "WINDOW_130_TO_430", label: "☕ Afternoon", sub: "01:30 PM - 04:30 PM" },
                  { id: "WINDOW_800_TO_1130", label: "☀️ Morning Slot", sub: "08:00 AM - 11:30 AM" },
                  { id: "CUSTOM", label: "⚙️ Custom Window", sub: "Set Specific AM/PM" },
                ].map((opt) => {
                  const isSelected = timePreference === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTimePreference(opt.id)}
                      className={`p-2 rounded-xl text-left transition-all cursor-pointer border flex flex-col justify-between gap-0.5 ${
                        isSelected
                          ? "bg-blue-600/25 border-blue-500 text-white shadow-xs ring-1 ring-blue-500/50"
                          : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <span className="font-bold text-xs flex items-center justify-between">
                        <span>{opt.label}</span>
                        {isSelected && <span className="text-blue-400 font-mono text-[10px]">●</span>}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono truncate">
                        {opt.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom 12-Hour Range Selector (Compact) */}
            {timePreference === "CUSTOM" && (
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-blue-500/40 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-blue-300 text-[11px]">
                    {language === "bn" ? "কাস্টম উইন্ডো:" : "Custom Window:"}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-200 border border-blue-800">
                    {customStartTime} to {customEndTime}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-0.5 font-mono">
                      {language === "bn" ? "শুরুর সময়:" : "Earliest Start:"}
                    </label>
                    <select
                      value={customStartTime}
                      onChange={(e) => setCustomStartTime(e.target.value)}
                      className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                    >
                      {["08:00 AM", "08:30 AM", "09:00 AM", "10:00 AM", "11:30 AM", "01:00 PM", "01:30 PM", "03:00 PM"].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-0.5 font-mono">
                      {language === "bn" ? "শেষ সময়:" : "Latest End:"}
                    </label>
                    <select
                      value={customEndTime}
                      onChange={(e) => setCustomEndTime(e.target.value)}
                      className="w-full text-xs bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                    >
                      {["11:30 AM", "01:00 PM", "01:30 PM", "02:50 PM", "04:30 PM", "06:00 PM", "06:30 PM", "07:00 PM"].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Column B: Gap & Break Style (4 Compact Cards) */}
          <div className="rounded-2xl bg-slate-950/60 border border-slate-800/90 p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs sm:text-sm font-extrabold text-white">
                  {language === "bn" ? "ক্লাসের গ্যাপ ও শিডিউল স্টাইল" : "Gap & Break Style"}
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700">
                {language === "bn" ? "ব্রেক সলভার" : "Break Solver"}
              </span>
            </div>

            {/* 4 Compact Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                {
                  id: "COMPACT_GAPS" as const,
                  title: "⚡ Back-to-Back",
                  bnTitle: "⚡ ব্যাক-টু-ব্যাক",
                  tag: "Min Gap (0-15m)",
                  bnTag: "০-১৫ মি. ট্রানজিশন",
                  badgeColor: "bg-indigo-950 text-indigo-300 border-indigo-700",
                  desc: "Consecutive classes with 10-15m room changes. Zero wasted waiting hours.",
                  bnDesc: "১০-১৫ মি. রুম পরিবর্তন ছাড়া কোনো দীর্ঘ অলস বিরতি থাকবে না।",
                },
                {
                  id: "BALANCED_BREAK" as const,
                  title: "☕ Healthy Break",
                  bnTitle: "☕ স্বাস্থ্যকর বিরতি",
                  tag: "30-60m Break",
                  bnTag: "৩০-৬০ মি. ব্রেক",
                  badgeColor: "bg-emerald-950 text-emerald-300 border-emerald-700",
                  desc: "30-60 min relaxing gap between classes for lunch, prayer, and cafeteria study.",
                  bnDesc: "লাঞ্চ, নামাজ ও ক্যাফেটেরিয়া আড্ডার জন্য সুন্দর ৩০-৬০ মিনিট গ্যাপ।",
                },
                {
                  id: "MINIMIZE_DAYS" as const,
                  title: "📅 Max Days Off",
                  bnTitle: "📅 সর্বোচ্চ ছুটি",
                  tag: "2-3 Campus Days",
                  bnTag: "২-৩ দিন ক্যাম্পাস",
                  badgeColor: "bg-purple-950 text-purple-300 border-purple-700",
                  desc: "Cram courses into fewer days (2-3 days) to maximize free days every week.",
                  bnDesc: "সপ্তাহে বেশি ছুটি পেতে ক্লাসগুলো কম দিনে (২-৩ দিনে) সাজানো হবে।",
                },
                {
                  id: "ANY" as const,
                  title: "🧘 Balanced Spread",
                  bnTitle: "🧘 ব্যালেন্সড স্প্রেড",
                  tag: "Relaxed Pace",
                  bnTag: "রিলাক্সড রুটিন",
                  badgeColor: "bg-blue-950 text-blue-300 border-blue-700",
                  desc: "Even distribution (1-2 classes per active day), avoiding heavy daily fatigue.",
                  bnDesc: "ক্যাম্পাসের দিনগুলোতে সমান ১-২টি ক্লাস যাতে ক্লান্তি না আসে।",
                },
              ].map((style) => {
                const isSelected = dayPreference === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setDayPreference(style.id)}
                    className={`p-2.5 rounded-xl text-left transition-all cursor-pointer border flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? "bg-gradient-to-br from-indigo-900/30 to-purple-900/20 border-indigo-500 text-white shadow-xs ring-1 ring-indigo-500/40"
                        : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-extrabold text-xs text-white">
                          {language === "bn" ? style.bnTitle : style.title}
                        </span>
                        {isSelected && <span className="text-indigo-400 font-mono text-[9px]">● Active</span>}
                      </div>
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-md border inline-block ${style.badgeColor}`}>
                        {language === "bn" ? style.bnTag : style.tag}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      {language === "bn" ? style.bnDesc : style.desc}
                    </p>
                  </button>
                );
              })}
            </div>
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

            <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
              {/* Option Stepper */}
              <div className="inline-flex items-center gap-1 rounded-xl bg-slate-900 border border-slate-800 p-1 shrink-0">
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
              <div className="inline-flex rounded-xl bg-slate-900 border border-slate-800 p-1 shrink-0">
                {(["Weekly", "Daily", "Overview"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setViewMode(tab)}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewMode === tab
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {tab === "Weekly" ? "Weekly Grid" : tab === "Daily" ? "Daily Agenda" : "Section List"}
                  </button>
                ))}
              </div>

              {/* Export Button Group: PNG & PDF ALWAYS TOGETHER (Never split across rows) */}
              <div className="inline-flex items-center rounded-xl bg-slate-900 border border-slate-800 p-1 shrink-0 shadow-xs">
                <button
                  type="button"
                  onClick={handleDownloadPNG}
                  disabled={isExporting}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                  title="Download PNG Routine Image"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>PNG</span>
                </button>
                <div className="w-[1px] h-4 bg-slate-800 my-auto mx-0.5" />
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={isExporting}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                  title="Download PDF Document"
                >
                  <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                  <span>PDF</span>
                </button>
              </div>
            </div>
          </div>

          {/* 10 Option Tabs (Guaranteed 100% visible on all screens, never cut off) */}
          <div
            className={`grid gap-1.5 sm:gap-2 ${
              routines.length >= 10
                ? "grid-cols-5 lg:grid-cols-10"
                : routines.length >= 6
                ? "grid-cols-3 sm:grid-cols-6"
                : "grid-cols-2 sm:grid-cols-5"
            }`}
          >
            {routines.map((opt, idx) => {
              const isSelected = selectedRoutineIndex === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedRoutineIndex(idx)}
                  className={`p-2 sm:py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 border ${
                    isSelected
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-400 text-white shadow-md shadow-blue-500/30 ring-1 ring-blue-400 scale-[1.02]"
                      : "bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-1 truncate">
                    {idx === 0 && <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                    <span className="truncate">Option {idx + 1}</span>
                  </div>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded-md ${
                      isSelected ? "bg-white/20 text-white font-black" : "bg-slate-800 text-slate-400"
                    }`}
                  >
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
        language={language}
        isStaffOrAdmin={Boolean(isAdmin || isSuperAdmin || user?.role === "ROLE_ADMIN" || user?.role === "ROLE_MANAGER" || user?.role === "ROLE_SUPER_ADMIN")}
      />
    </div>
  );
}
