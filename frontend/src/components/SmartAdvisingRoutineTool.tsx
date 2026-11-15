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

// Visual color themes for individual courses
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
  CSE472: {
    bg: "from-emerald-900/80 to-emerald-950/90",
    border: "border-emerald-500/50 hover:border-emerald-400",
    text: "text-emerald-200",
    badge: "bg-emerald-950 text-emerald-300 border-emerald-800",
    dot: "bg-emerald-400",
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
// 12-hour Time Header Axis from 08:00 AM to 07:00 PM (480m to 1140m = 660m total span)
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
  const { user } = useAuth();
  const { language } = useLanguage();

  // State: Sections loaded from verified real SEU dataset
  const [sections, setSections] = useState<OfferedSectionItem[]>(REAL_SEU_OFFERED_SECTIONS);
  const [semester, setSemester] = useState<string>("Spring 2026");

  // Selection: Starts EMPTY (Manual course selection by student)
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [courseSearchQuery, setCourseSearchQuery] = useState<string>("");
  const [isCoursesExpanded, setIsCoursesExpanded] = useState<boolean>(false);

  // Preferences: Default to ANY (Balanced / Any Time Slot Flexible)
  const [timePreference, setTimePreference] = useState<
    "ANY" | "AVOID_MORNING" | "AVOID_LATE" | "PREFER_MORNING" | "PREFER_AFTERNOON"
  >("ANY");
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

  // Generated Routines (Top 10 options)
  const [routines, setRoutines] = useState<GeneratedRoutineOption[]>([]);
  const [selectedRoutineIndex, setSelectedRoutineIndex] = useState<number>(0);
  const [generating, setGenerating] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Layout Mode: "split" (Side-by-side) or "full" (Full-width timetable)
  const [layoutMode, setLayoutMode] = useState<"split" | "full">("split");

  // Timetable View Mode (Weekly, Daily, Overview)
  const [viewMode, setViewMode] = useState<"Weekly" | "Daily" | "Overview">("Weekly");
  const [dailyDay, setDailyDay] = useState<string>("SUN");

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

  // Load sections from backend on mount (or use built-in real sections)
  useEffect(() => {
    fetchBackendSections();
  }, [semester]);

  const fetchBackendSections = async () => {
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
              courseTitle: s.courseTitle || s.courseCode,
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
        if (flat.length >= 60) {
          setSections(flat);
        }
      }
    } catch (err) {
      console.warn("Backend advising fetch fallback to verified static data:", err);
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

  // Generate Routines Handler (Client-side fast solver with back-to-back gap minimization)
  const handleGenerateRoutines = async () => {
    if (selectedCourses.length === 0) {
      toast.error(language === "bn" ? "কমপক্ষে ১টি কোর্স নির্বাচন করুন!" : "Please select at least 1 course!");
      return;
    }

    setGenerating(true);

    try {
      // 1. Try Backend API
      const res = await api.advising.generateRoutine({
        selectedCourses,
        timePreference,
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

    // 2. Client-side local multi-objective solver
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

    // Score client combinations with back-to-back consecutive class optimization & gap minimization
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

          if (sm < 600) hasEarly = true; // before 10:00 (e.g. 08:00 or 08:30)
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
            // Direct back-to-back classes (10-15m transition between classrooms) - IDEAL!
            consecutiveBonus += 45;
          } else if (gap <= 50) {
            // Normal lunch / prayer break (e.g. 12:50 PM to 01:30 PM is 40 min)
            consecutiveBonus += 20;
            totalGapMinutes += gap;
          } else {
            // Unwanted dead waiting time (e.g. 2-4 hours break between classes)
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

      // Campus Days bonus according to dayPreference
      if (dayPreference === "MINIMIZE_DAYS") {
        if (dayCount <= 2) {
          score += 90;
          highlights.push(`⚡ Ultra-Compact (${dayCount} Campus Days)`);
        } else if (dayCount === 3) {
          score += 50;
          highlights.push(`🗓️ Balanced 3 Campus Days`);
        } else if (dayCount === 4) {
          score -= 20;
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
      if (timePreference === "AVOID_MORNING") {
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

      const matchPercentage = Math.min(99, Math.max(68, Math.round((score / 280) * 100)));

      return {
        sections: combo,
        score,
        matchPercentage,
        rank: 0,
        activeDaysCount: dayCount,
        activeDays,
        totalCredits: combo.reduce((acc, s) => acc + s.credits, 0),
        totalGapMinutes,
        facultyMatchCount: facMatchCount,
        hasEarlyMorning: hasEarly,
        hasLateEvening: hasLate,
        highlights,
      };
    });

    // Sort descending: strictly prioritize options matching user's selected preferred days, then highest score & minimal gap
    scored.sort((a, b) => {
      // 1. Fewer outside days first
      const aOutside = a.activeDays.filter((d) => !preferredDays.includes(d)).length;
      const bOutside = b.activeDays.filter((d) => !preferredDays.includes(d)).length;
      if (aOutside !== bOutside) {
        return aOutside - bOutside;
      }
      // 2. Score descending
      if (b.score !== a.score) return b.score - a.score;
      // 3. Gap minutes ascending
      return a.totalGapMinutes - b.totalGapMinutes;
    });

    // Provide Top 10 ranked options (Option 1 = Best Match, Option 2, etc.)
    const top = scored.slice(0, 10).map((opt, i) => ({
      ...opt,
      rank: i + 1,
    }));

    setRoutines(top);
    setSelectedRoutineIndex(0);
    triggerSuccessFeedback(top.length);
    setGenerating(false);
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

  // Run initial solve on mount ONLY if courses are already selected
  useEffect(() => {
    if (sections.length > 0 && selectedCourses.length > 0 && routines.length === 0) {
      runClientSideRoutineSolver();
    }
  }, [sections]);

  // Reset from custom student upload back to official SEU master catalog
  const handleResetToOfficial = () => {
    setSections(REAL_SEU_OFFERED_SECTIONS);
    setSelectedCourses([]);
    setRoutines([]);
    setIsCustomUpload(false);
    setCustomUploadName("");
    toast.success(
      language === "bn"
        ? "↺ বিশ্ববিদ্যালয়ের অফিসিয়াল মাস্টার রুটিনে ফিরে যাওয়া হয়েছে!"
        : "↺ Restored to Official University Master Routine!"
    );
  };

  // Handle UMS HTML File Upload (Isolated to student session; will never merge into admin master table)
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error(language === "bn" ? "ফাইলের সাইজ ১০ মেগাবাইটের কম হতে হবে!" : "File size must be under 10MB!");
      return;
    }

    setUploadingFile(true);
    try {
      const text = await file.text();
      const parsedList = parseHtmlClientSide(text);
      if (parsedList.length > 0) {
        setSections(parsedList);
        setIsCustomUpload(true);
        setCustomUploadName(file.name);
        setSelectedCourses([]);
        setRoutines([]);
        toast.success(
          language === "bn"
            ? `✅ আপনার ফাইলের ${parsedList.length}টি সেকশন আলাদাভাবে লোড করা হয়েছে! এবার আপনার পছন্দের কোর্স সিলেক্ট করুন।`
            : `✅ Successfully extracted ${parsedList.length} sections from your file! Now select your target courses.`
        );
      } else {
        toast.error("Could not extract sections. Please check your HTML file format.");
      }

      // Safe isolated backend upload call (never merges into admin master catalog)
      await api.advising.uploadAdvisingTable(file, semester).catch(() => {});
      setIsUploadModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to process advising HTML file.");
    } finally {
      setUploadingFile(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setPastedText(text);
        toast.success("Pasted content from clipboard!");
      } else {
        toast.error("Clipboard is empty or contains no text.");
      }
    } catch (e) {
      toast.error("Please press Ctrl+V inside the text box to paste.");
    }
  };

  const handleApplyPastedText = async () => {
    if (!pastedText.trim()) {
      toast.error("Please paste your UMS table text or HTML first!");
      return;
    }

    setUploadingFile(true);
    try {
      const parsedList = parseHtmlClientSide(pastedText);
      if (parsedList.length === 0) {
        toast.error(
          "Could not detect valid course sections. Please ensure you copied table rows containing course codes (e.g. CSE355.1) and schedule times."
        );
        return;
      }

      setSections(parsedList);
      setIsCustomUpload(true);
      setCustomUploadName(`Pasted Table (${parsedList.length} sections)`);
      setSelectedCourses([]);
      setRoutines([]);
      toast.success(
        language === "bn"
          ? `✅ পেস্ট করা টেবিল থেকে ${parsedList.length}টি সেকশন সফলভাবে লোড হয়েছে! এবার আপনার পছন্দের কোর্স সিলেক্ট করুন।`
          : `✅ Successfully extracted ${parsedList.length} sections from pasted data! Now select your target courses.`
      );

      // Safe isolated backend upload call (never merges into admin master catalog)
      api.advising.uploadAdvisingTable(pastedText, semester).catch(() => {});
      setIsUploadModalOpen(false);
      setPastedText("");
    } catch (err: any) {
      toast.error(err.message || "Failed to parse pasted table.");
    } finally {
      setUploadingFile(false);
    }
  };

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

      let title = "";
      const afterSec = chunk.replace(/^[A-Z]{3,4}\d{3}\.\d+/, "").trim();
      const lines = afterSec.split(/[\r\n]+/);
      for (const line of lines) {
        const candidate = line
          .replace(/\[.*?\]/g, "")
          .replace(/\d+\s*(?:Cr|cr|Credits)?/g, "")
          .replace(/&amp;/g, "&")
          .trim();
        if (!candidate) continue;
        const upper = candidate.toUpperCase();
        if (
          upper === "CSE." || upper === "CSE" ||
          upper === "EEE." || upper === "EEE" ||
          upper === "BBA." || upper === "BBA" ||
          upper === "TEXTILE" || upper === "LAW" || upper === "PHR" || upper === "ENG" ||
          upper === "B.SC." || upper === "B.SC" || upper.startsWith("B.SC IN") ||
          upper.startsWith("DEPARTMENT") || upper.startsWith("DEPT") || upper.startsWith("PROGRAM") ||
          upper === "SL" || upper === "COURSE" || upper === "SECTION" ||
          upper.includes("SUN") || upper.includes("MON") || upper.includes("TUE") ||
          upper.includes("WED") || upper.includes("THU") || upper.includes("FRI") || upper.includes("SAT")
        ) {
          continue;
        }
        if (candidate.length >= 3) {
          title = candidate;
          break;
        }
      }

      title = getSeuCourseTitle(courseCode, title);

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

  // Current active routine
  const activeRoutine = routines[selectedRoutineIndex] || routines[0] || null;

  // Copy routine section codes to clipboard
  const handleCopySectionCodes = () => {
    if (!activeRoutine) return;
    const codes = activeRoutine.sections.map((s) => `${s.courseCode}.${s.sectionNumber}`).join(", ");
    navigator.clipboard.writeText(codes);
    toast.success(
      language === "bn"
        ? `📋 সেকশন কোড কপি হয়েছে: ${codes}`
        : `📋 Copied section codes: ${codes}`
    );
  };

  // Download Class Routine as High-Quality PNG Image
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
        language === "bn"
          ? "✅ ক্লাস রুটিন PNG সফলভাবে ডাউনলোড হয়েছে!"
          : "✅ Class Routine PNG downloaded successfully!",
        { id: toastId }
      );
    } catch (err: any) {
      console.error("Failed to export routine PNG:", err);
      toast.error("Failed to export routine PNG. Please try again or use Print.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  // Download Class Routine as Landscape A4 PDF Document
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

      // Dark background for PDF
      pdf.setFillColor(11, 15, 25);
      pdf.rect(0, 0, pdfWidth, pdfHeight, "F");
      pdf.addImage(imgData, "PNG", marginX, marginY, canvasScaledWidth, canvasScaledHeight);
      pdf.save(`SEU_Class_Routine_Option_${selectedRoutineIndex + 1}_${semester.replace(/\s+/g, "_")}.pdf`);

      toast.success(
        language === "bn"
          ? "✅ ক্লাস রুটিন PDF সফলভাবে ডাউনলোড হয়েছে!"
          : "✅ Class Routine PDF downloaded successfully!",
        { id: toastId }
      );
    } catch (err: any) {
      console.error("Failed to export routine PDF:", err);
      toast.error("Failed to export routine PDF. Please try again or use Print.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ========================================================================= */}
      {/* 1. HERO HEADER WITH SEU THEME & UPLOAD CALLOUT */}
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
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Upload className="w-4 h-4" />
              <span>{language === "bn" ? "UMS টেবিল আপলোড (.html)" : "Upload UMS Table (.html)"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Custom Student Upload Active Banner */}
      {isCustomUpload && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/30 via-indigo-900/30 to-slate-900 border border-blue-500/40 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-white">
            <FileText className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              <strong>Custom Student Schedule Active:</strong> {customUploadName} ({sections.length} sections loaded)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
              Private Session Sandbox
            </span>
          </div>
          <button
            onClick={handleResetToOfficial}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
            <span>Reset to Official SEU Routine</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TARGET COURSE SELECTOR (SEARCH-TO-ADD & SEE MORE / SEE LESS)           */}
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
            {/* Header: Title, Credit Tracker Badge, Search Bar & Quick Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
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
                    {/* Max 17-Credit Limit Badge */}
                    <span className={`text-xs font-mono font-bold px-3 py-0.5 rounded-full border transition-all ${
                      selectedCreditsTotal >= 17
                        ? "bg-amber-950/70 text-amber-300 border-amber-500/60 shadow-sm"
                        : selectedCreditsTotal > 0
                        ? "bg-blue-950/70 text-blue-300 border-blue-500/40"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}>
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
                      ? "থিয়োরি ও ল্যাব মিলিয়ে সর্বোচ্চ ১৭ ক্রেডিট পর্যন্ত নির্বাচন করা যাবে। সার্চ করে সহজে যেকোনো কোর্স যুক্ত করুন।"
                      : "Select Theory and Lab courses (max 17 credits combined). Search to quickly add courses."}
                  </p>
                </div>
              </div>

              {/* Quick Actions & Live Search-to-Add Input */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[210px] sm:min-w-[260px] flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={courseSearchQuery}
                    onChange={(e) => setCourseSearchQuery(e.target.value)}
                    placeholder={language === "bn" ? "কোর্স সার্চ করে যুক্ত করুন (e.g. CSE4, Compiler)..." : "Search to add (e.g. CSE4, Compiler, Lab)..."}
                    className="w-full text-xs py-2 pl-8 pr-7 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                  />
                  {courseSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCourseSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const sample = ["CSE355", "CSE381", "CSE382", "CSE443", "CSE444"].filter(c => coursesCatalog.some(cat => cat.code === c));
                    const targetList = sample.length > 0 ? sample : coursesCatalog.slice(0, 5).map(c => c.code);
                    let total = 0;
                    const capped: string[] = [];
                    for (const code of targetList) {
                      const cObj = coursesCatalog.find(c => c.code === code);
                      const cred = cObj?.credits || 3.0;
                      if (total + cred <= 17) {
                        capped.push(code);
                        total += cred;
                      }
                    }
                    setSelectedCourses(capped);
                    toast.success(
                      language === "bn"
                        ? `৫টি রেকমেন্ডেড কোর্স (${total} ক্রেডিট) সিলেক্ট করা হয়েছে!`
                        : `Loaded recommended standard courses (${total} credits)!`
                    );
                  }}
                  className="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span>Recommend 5 (11 Cr)</span>
                </button>

                {selectedCourses.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedCourses([])}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono font-bold transition-all cursor-pointer"
                    >
                      Clear ({selectedCourses.length})
                    </button>

                    <button
                      type="button"
                      onClick={handleGenerateRoutines}
                      disabled={generating}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
                      <span>
                        {generating
                          ? "Solving..."
                          : language === "bn"
                          ? `১০টি রুটিন সাজান (${selectedCourses.length}টি কোর্স) 🚀`
                          : `Generate 10 Routines 🚀`}
                      </span>
                    </button>
                  </>
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

            {/* Courses Groups (Theory & Lab) */}
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

                      return (
                        <div
                          key={c.code}
                          onClick={() => handleToggleCourse(c.code, c.credits)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-start justify-between gap-3 group ${
                            isSelected
                              ? "bg-blue-600/15 border-blue-500/60 shadow-md shadow-blue-500/15 scale-[1.01]"
                              : exceedsLimit
                              ? "bg-slate-900/40 border-slate-800/80 text-slate-500 opacity-60 hover:border-amber-500/40"
                              : "bg-slate-800/40 border-slate-700/60 hover:border-slate-500 hover:bg-slate-800/70"
                          }`}
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
                            {/* Real Course Title! */}
                            <p className="text-xs font-bold text-slate-200 line-clamp-1 group-hover:text-blue-300 transition-colors" title={c.title}>
                              {c.title}
                            </p>
                            <div className="flex items-center justify-between text-[9px] font-mono">
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
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Practical Lab Courses Group */}
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

                      return (
                        <div
                          key={c.code}
                          onClick={() => handleToggleCourse(c.code, c.credits)}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-start justify-between gap-3 group ${
                            isSelected
                              ? "bg-cyan-600/15 border-cyan-500/60 shadow-md shadow-cyan-500/15 scale-[1.01]"
                              : exceedsLimit
                              ? "bg-slate-900/40 border-slate-800/80 text-slate-500 opacity-60 hover:border-amber-500/40"
                              : "bg-slate-800/40 border-slate-700/60 hover:border-slate-500 hover:bg-slate-800/70"
                          }`}
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
                            {/* Real Course Title! */}
                            <p className="text-xs font-bold text-slate-200 line-clamp-1 group-hover:text-cyan-300 transition-colors" title={c.title}>
                              {c.title}
                            </p>
                            <div className="flex items-center justify-between text-[9px] font-mono">
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
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No Courses Match Search Feedback */}
              {isSearching && theoryToShow.length === 0 && labToShow.length === 0 && (
                <div className="p-8 rounded-2xl bg-slate-800/40 border border-slate-700/60 text-center space-y-2">
                  <p className="text-sm font-bold text-slate-300">
                    {language === "bn"
                      ? `"${courseSearchQuery}" দিয়ে কোনো কোর্স পাওয়া যায়নি`
                      : `No courses found matching "${courseSearchQuery}"`}
                  </p>
                  <p className="text-xs text-slate-400">
                    {language === "bn"
                      ? "কোর্স কোড (e.g. CSE355, CSE4) বা বিষয়ের নাম দিয়ে সার্চ করুন।"
                      : "Try searching by course code (e.g. CSE355, CSE4) or title keywords."}
                  </p>
                  <button
                    type="button"
                    onClick={() => setCourseSearchQuery("")}
                    className="px-4 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold cursor-pointer"
                  >
                    {language === "bn" ? "সার্চ ক্লিয়ার করুন" : "Clear Search Filter"}
                  </button>
                </div>
              )}

              {/* See More / See Less Toggle Button */}
              {!isSearching && (
                <div className="pt-2 flex justify-center">
                  {!isCoursesExpanded && hasMore ? (
                    <button
                      type="button"
                      onClick={() => setIsCoursesExpanded(true)}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 hover:border-blue-500 text-blue-400 hover:text-blue-300 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:scale-[1.01]"
                    >
                      <span>
                        {language === "bn"
                          ? `সকল কোর্স দেখুন (${totalAvailable}টি কোর্স উপলব্ধ) ↓`
                          : `See More Courses (${totalAvailable} available) ↓`}
                      </span>
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  ) : isCoursesExpanded ? (
                    <button
                      type="button"
                      onClick={() => setIsCoursesExpanded(false)}
                      className="w-full sm:w-auto px-6 py-2 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <span>
                        {language === "bn" ? "কোর্স তালিকা সংক্ষেপ করুন ↑" : "See Less (Collapse) ↑"}
                      </span>
                      <ChevronUp className="w-4 h-4" />
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 2 & 3. WORKSPACE: PRIORITIES & GENERATED ROUTINES (SIDE-BY-SIDE / FULL)   */}
      {/* ========================================================================= */}
      {(() => {
        // RENDER HELPER: 2. Priorities & Gap Control Card
        const renderPrioritiesCard = (isSidebar: boolean = false) => (
          <div
            className={`rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md transition-all ${
              isSidebar ? "p-4 sm:p-5 space-y-4" : "p-5 sm:p-6 space-y-6"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    {language === "bn" ? "২. প্রায়োরিটি ও গ্যাপ কন্ট্রোল" : "2. Priorities & Gap Control"}
                  </h2>
                  {!isSidebar && (
                    <p className="text-xs text-slate-400">
                      {language === "bn"
                        ? "ক্লাসের সময় পছন্দ, ক্যাম্পাসে আসার দিন এবং পছন্দের শিক্ষকদের সিলেক্ট করে রুটিনের কোয়ালিটি নিয়ন্ত্রণ করুন।"
                        : "Fine-tune preferred 12-hour AM/PM time slots, back-to-back class gaps, and prioritized teachers."}
                    </p>
                  )}
                </div>
              </div>

              {isSidebar && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shrink-0">
                  Control Panel
                </span>
              )}
            </div>

            {/* Control Groups: Stacked in sidebar, 3-columns when full-width */}
            <div className={isSidebar ? "space-y-3.5" : "grid grid-cols-1 md:grid-cols-3 gap-5"}>
              {/* Time Priority (12-Hour AM/PM) - Default is ANY Balanced */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60">
                <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                  <span>{language === "bn" ? "ক্লাসের সময় পছন্দ" : "Time Preference (12-Hour AM/PM)"}</span>
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                </label>
                <select
                  value={timePreference}
                  onChange={(e) => setTimePreference(e.target.value as any)}
                  className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="ANY">⚡ Balanced / Any Time Slot (Flexible - Default)</option>
                  <option value="AVOID_MORNING">☀️ Avoid Morning (No 08:30 AM Classes)</option>
                  <option value="PREFER_MORNING">🌅 Prefer Morning Slots (08:30 AM - 01:00 PM)</option>
                  <option value="PREFER_AFTERNOON">☕ Prefer Afternoon Slots (11:30 AM - 04:30 PM)</option>
                  <option value="AVOID_LATE">🌇 Avoid Late Afternoon (No 04:30 PM+ Classes)</option>
                </select>
                <p className="text-[11px] text-slate-400 leading-tight">
                  {timePreference === "ANY"
                    ? "Flexible across all SEU slots: 08:30 AM, 10:00 AM, 11:30 AM, 01:30 PM, 03:00 PM."
                    : timePreference === "AVOID_MORNING"
                    ? "Penalizes early 08:00 AM & 08:30 AM morning slots in score ranking."
                    : "Optimizes class combinations according to your selected daytime window."}
                </p>
              </div>

              {/* Day & Gap Priority */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60">
                <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                  <span>{language === "bn" ? "টাইম গ্যাপ অপটিমাইজেশন" : "Gap & Schedule Style"}</span>
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                </label>
                <select
                  value={dayPreference}
                  onChange={(e) => setDayPreference(e.target.value as any)}
                  className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="COMPACT_GAPS">⏱️ Minimum Gap (Consecutive / Back-to-Back Classes)</option>
                  <option value="MINIMIZE_DAYS">⚡ Minimize Campus Days (Pack into 2 or 3 Days)</option>
                  <option value="ANY">🗓️ Any Day Distribution</option>
                </select>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Option #1 maximizes back-to-back classes with 10-15m room transitions, eliminating multi-hour dead breaks.
                </p>
              </div>

              {/* Preferred Days Toggle with 1-Click Presets */}
              <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 block">
                    {language === "bn" ? "পছন্দের বারসমূহ (Target Days)" : "Target Days (Strict Filter)"}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                    {preferredDays.length} / 7 Days Active
                  </span>
                </div>

                {/* Quick Presets for University Open-Credit Routines */}
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPreferredDays(["SUN", "TUE"]);
                      toast.success("Set Target Days to SUN+TUE (2 Days)!");
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                      preferredDays.length === 2 && preferredDays.includes("SUN") && preferredDays.includes("TUE")
                        ? "bg-indigo-600/30 border-indigo-400 text-indigo-200 shadow-sm"
                        : "bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white"
                    }`}
                  >
                    ⚡ SUN+TUE
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreferredDays(["MON", "WED"]);
                      toast.success("Set Target Days to MON+WED (2 Days)!");
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                      preferredDays.length === 2 && preferredDays.includes("MON") && preferredDays.includes("WED")
                        ? "bg-indigo-600/30 border-indigo-400 text-indigo-200 shadow-sm"
                        : "bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white"
                    }`}
                  >
                    ⚡ MON+WED
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreferredDays(["THU", "SAT"]);
                      toast.success("Set Target Days to THU+SAT (2 Days)!");
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                      preferredDays.length === 2 && preferredDays.includes("THU") && preferredDays.includes("SAT")
                        ? "bg-indigo-600/30 border-indigo-400 text-indigo-200 shadow-sm"
                        : "bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white"
                    }`}
                  >
                    ⚡ THU+SAT
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (preferredDays.includes("FRI")) {
                        setPreferredDays(preferredDays.filter((d) => d !== "FRI"));
                      } else {
                        setPreferredDays([...preferredDays, "FRI"]);
                        toast.success("Included Friday for 2-hour practical lab sessions!");
                      }
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all cursor-pointer ${
                      preferredDays.includes("FRI")
                        ? "bg-emerald-600/30 border-emerald-400 text-emerald-200"
                        : "bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white"
                    }`}
                  >
                    + FRI (2h)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreferredDays(["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"])}
                    className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                  >
                    All 7d
                  </button>
                </div>

                {/* Individual 7 Day Pills (Including Friday!) */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {WEEK_DAYS.map((day) => {
                    const active = preferredDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
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
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          active
                            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30 ring-1 ring-indigo-400"
                            : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  {preferredDays.length < 7
                    ? `Solver prioritizes conflict-free combos fitting strictly into: ${preferredDays.join(", ")}.`
                    : "Flexible across all weekdays. Uncheck days or click presets to restrict campus visits."}
                </p>
              </div>
            </div>

            {/* Preferred Faculty Selection */}
            <div className="space-y-3 pt-3 border-t border-slate-800/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-bold text-white">
                      {language === "bn" ? "পছন্দের শিক্ষক নির্বাচন" : "Preferred Faculty Selection"}
                    </span>
                  </span>
                  <p className="text-[11px] text-slate-400">
                    {language === "bn"
                      ? "যেসব শিক্ষকের সেকশন পছন্দ সেগুলো স্টার করুন। রুটিন জেনারেটর তাদের সর্বোচ্চ প্রায়োরিটি দেবে।"
                      : "Star teachers you prefer for each course. Solver prioritizes sections taught by them."}
                  </p>
                </div>
                {Object.values(facultyPreferences).some((arr) => arr.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setFacultyPreferences({})}
                    className="text-[11px] font-mono text-slate-400 hover:text-amber-400 underline transition-colors cursor-pointer self-start sm:self-auto"
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
                <div className={isSidebar ? "space-y-3" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5"}>
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

            {/* MASTER GENERATE BUTTON (Placed intuitively at the bottom of Priorities) */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleGenerateRoutines}
                disabled={generating || selectedCourses.length === 0}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm shadow-xl shadow-emerald-500/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40"
              >
                <Sparkles className={`w-5 h-5 ${generating ? "animate-spin" : ""}`} />
                <span>
                  {generating
                    ? language === "bn"
                      ? "সেরা ১০টি রুটিন সাজানো হচ্ছে..."
                      : "Optimizing Top 10 Routines..."
                    : selectedCourses.length === 0
                    ? language === "bn"
                      ? "প্রথমে ধাপ ১ থেকে কোর্স সিলেক্ট করুন"
                      : "Select Courses in Step 1 to Generate"
                    : language === "bn"
                    ? `১০টি সেরা রুটিন সাজান (${selectedCourses.length}টি কোর্স) 🚀`
                    : `Generate 10 Clash-Free Routines (${selectedCourses.length} Courses) 🚀`}
                </span>
              </button>
            </div>
          </div>
        );

        // RENDER HELPER: 3 & 4. Generated Routines & Timetable Results
        const renderRoutineResults = () => {
          if (routines.length === 0) return null;

          return (
            <div className="space-y-5">
              {/* Top 10 Options Selector Bar */}
              <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                        <span>
                          {language === "bn"
                            ? `সেরা ১০টি ক্ল্যাশ-মুক্ত রুটিন`
                            : `Top 10 Ranked Clash-Free Routines`}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                          100% Zero-Clash
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        {language === "bn"
                          ? "১ নাম্বার অপশনটি সর্বনিম্ন টাইম গ্যাপ (ব্যাক-টু-ব্যাক) সহ সর্বাধিক প্রায়োরিটি প্রাপ্ত।"
                          : "Option 1 has the absolute highest priority score and minimal gaps."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Side-by-Side vs Full-Width Toggle on Desktop */}
                    <div className="hidden lg:inline-flex items-center gap-1 rounded-xl bg-slate-900 border border-slate-800 p-1">
                      <button
                        type="button"
                        onClick={() => setLayoutMode("split")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          layoutMode === "split"
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                        title="Side-by-Side: Controls on Left, Timetable on Right"
                      >
                        🪟 Side-by-Side
                      </button>
                      <button
                        type="button"
                        onClick={() => setLayoutMode("full")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          layoutMode === "full"
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                        title="Full Width: Maximum width timetable display"
                      >
                        ⛶ Full Width
                      </button>
                    </div>

                    <button
                      onClick={() => setSelectedRoutineIndex((prev) => Math.max(0, prev - 1))}
                      disabled={selectedRoutineIndex === 0}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all disabled:opacity-40 cursor-pointer"
                      title="Previous Option"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono font-bold text-slate-300 px-1 shrink-0">
                      Option {selectedRoutineIndex + 1} of {routines.length}
                    </span>
                    <button
                      onClick={() => setSelectedRoutineIndex((prev) => Math.min(routines.length - 1, prev + 1))}
                      disabled={selectedRoutineIndex === routines.length - 1}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all disabled:opacity-40 cursor-pointer"
                      title="Next Option"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Horizontal Quick Scrollable Option Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {routines.map((opt, idx) => {
                    const isActive = selectedRoutineIndex === idx;
                    const isBest = idx === 0;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedRoutineIndex(idx)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border ${
                          isActive
                            ? "bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-500/25 scale-105"
                            : isBest
                            ? "bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
                            : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white"
                        }`}
                      >
                        {isBest && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                        <span>Option {idx + 1}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                            isActive ? "bg-blue-800 text-white" : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {opt.matchPercentage}%
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Active Option Highlight Bar */}
                {activeRoutine && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/40 to-slate-900 border border-blue-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-black text-sm text-white flex items-center gap-1.5">
                          <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs">
                            #{selectedRoutineIndex + 1}
                          </span>
                          <span>Option {selectedRoutineIndex + 1}</span>
                        </span>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          {activeRoutine.matchPercentage}% Efficiency Score
                        </span>
                        {selectedRoutineIndex === 0 && (
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-300" />
                            <span>Best Choice (Lowest Gap)</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        {activeRoutine.highlights.map((h, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-0.5 rounded-lg bg-slate-800/90 text-slate-300 border border-slate-700/80 font-medium text-[11px]"
                          >
                            {h}
                          </span>
                        ))}
                        <span className="px-2.5 py-0.5 rounded-lg bg-indigo-950/80 text-indigo-300 border border-indigo-800 font-mono text-[11px]">
                          🎓 {activeRoutine.totalCredits} Cr
                        </span>
                        <span className="px-2.5 py-0.5 rounded-lg bg-blue-950/80 text-blue-300 border border-blue-800 font-mono text-[11px]">
                          🗓️ {activeRoutine.activeDaysCount} Days ({activeRoutine.activeDays.join(", ")})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      <button
                        onClick={handleCopySectionCodes}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5 text-blue-400" />
                        <span>{language === "bn" ? "সেকশন কোড কপি" : "Copy Codes"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Interactive Timetable Grid (12-Hour AM/PM, Full Friday Support, Download PNG/PDF) */}
              {activeRoutine && (
                <div
                  ref={routineContainerRef}
                  id="routine-timetable-container"
                  className="rounded-3xl bg-[#0B0F19] border border-slate-800 p-4 sm:p-6 shadow-2xl space-y-5"
                >
                  {/* Header Bar with Action Buttons (Download PNG, Download PDF, View Switcher) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">
                          Class Information
                        </h2>
                        <span className="px-2 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-800 font-mono text-xs font-bold">
                          Option #{selectedRoutineIndex + 1}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                        <span>Southeast University Spring 2026</span>
                        <span>•</span>
                        <span className="text-emerald-400">12-Hour AM/PM Timetable</span>
                      </p>
                    </div>

                    {/* Right Side: View Switcher & Download Controls */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* View Switcher: Weekly / Daily / Overview */}
                      <div className="inline-flex rounded-xl bg-slate-900 border border-slate-800 p-1">
                        {(["Weekly", "Daily", "Overview"] as const).map((tab) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setViewMode(tab)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              viewMode === tab
                                ? "bg-blue-600 text-white shadow-sm"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>

                      {/* Download PNG Button */}
                      <button
                        type="button"
                        onClick={handleDownloadPNG}
                        disabled={isExporting}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="Download Class Routine as High-Quality PNG Image"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>PNG</span>
                      </button>

                      {/* Download PDF Button */}
                      <button
                        type="button"
                        onClick={handleDownloadPDF}
                        disabled={isExporting}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="Download Class Routine as Landscape PDF"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>
                    </div>
                  </div>

                  {/* VIEW: WEEKLY TIMETABLE GRID (All 7 Days including Friday with 2h sessions) */}
                  {viewMode === "Weekly" && (
                    <div className="overflow-x-auto scrollbar-thin pb-2">
                      <div className="min-w-[860px] space-y-2.5">
                        {/* 12-Hour Time Axis Header (08:00 AM to 07:00 PM) */}
                        <div className="grid grid-cols-12 pl-14 pr-2 text-slate-400 font-mono text-[11px] font-bold border-b border-slate-800 pb-2">
                          {TIME_12_AXIS.map((hourLabel) => (
                            <div key={hourLabel} className="text-center truncate">
                              {hourLabel}
                            </div>
                          ))}
                        </div>

                        {/* Day Rows: SUN, MON, TUE, WED, THU, FRI, SAT */}
                        {WEEK_DAYS.map((day) => {
                          const dayClasses: Array<{
                            section: OfferedSectionItem;
                            slot: TimeSlot;
                          }> = [];

                          activeRoutine.sections.forEach((sec) => {
                            sec.slots.forEach((sl) => {
                              if (sl.day.toUpperCase() === day) {
                                dayClasses.push({ section: sec, slot: sl });
                              }
                            });
                          });

                          return (
                            <div
                              key={day}
                              className={`flex items-center min-h-[76px] rounded-xl border relative overflow-hidden transition-all ${
                                dayClasses.length > 0
                                  ? "bg-slate-900/60 border-slate-800/80"
                                  : "bg-slate-900/30 border-slate-800/40"
                              }`}
                            >
                              {/* Day Label Left Column */}
                              <div className="w-14 shrink-0 font-mono font-bold text-xs text-slate-300 text-center select-none border-r border-slate-800/80 py-4">
                                <div>{day}</div>
                                {dayClasses.length === 0 && (
                                  <span className="text-[9px] text-slate-500 block">Free</span>
                                )}
                              </div>

                              {/* Timeline Area (Timeline span: 08:00 AM = 480m to 07:00 PM = 1140m => 660 mins total) */}
                              <div className="relative flex-1 h-[70px] mx-2">
                                {dayClasses.length === 0 && (
                                  <div className="absolute inset-0 flex items-center justify-center text-slate-600 font-mono text-xs italic">
                                    No classes scheduled
                                  </div>
                                )}

                                {dayClasses.map((item, idx) => {
                                  const sm = item.slot.startMinutes ?? timeToMinutes(item.slot.start);
                                  const em = item.slot.endMinutes ?? timeToMinutes(item.slot.end);

                                  const leftPct = Math.max(
                                    0,
                                    Math.min(100, ((sm - TIMELINE_START_MINUTES) / TIMELINE_TOTAL_MINUTES) * 100)
                                  );
                                  const widthPct = Math.max(
                                    6,
                                    Math.min(100 - leftPct, ((em - sm) / TIMELINE_TOTAL_MINUTES) * 100)
                                  );

                                  const theme = COURSE_THEMES[item.section.courseCode] || DEFAULT_THEME;

                                  return (
                                    <div
                                      key={idx}
                                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                                      className={`absolute top-1 bottom-1 rounded-xl bg-gradient-to-br ${theme.bg} border ${theme.border} p-2 shadow-md hover:scale-[1.01] transition-all flex flex-col justify-between overflow-hidden cursor-pointer group z-10`}
                                      title={`${item.section.courseCode}.${item.section.sectionNumber} - ${item.section.courseTitle}\nTime: ${formatTime12(item.slot.start)} - ${formatTime12(item.slot.end)}\nRoom: ${item.slot.room}\nFaculty: ${item.section.facultyName} [${item.section.facultyInitial}]`}
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-mono font-black text-xs text-white group-hover:text-blue-300 truncate">
                                          {item.section.courseCode}.{item.section.sectionNumber}
                                        </span>
                                        <span className="text-[9px] font-mono px-1 rounded bg-black/40 text-slate-300 border border-slate-700/80 shrink-0">
                                          [{item.section.facultyInitial}]
                                        </span>
                                      </div>

                                      <div className="text-[10px] text-slate-300 font-medium truncate">
                                        {item.section.courseTitle}
                                      </div>

                                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                                        <span className="font-semibold text-white/90">
                                          {formatTime12(item.slot.start)} - {formatTime12(item.slot.end)}
                                        </span>
                                        <span className="flex items-center gap-0.5 text-slate-300 truncate font-semibold">
                                          <MapPin className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                                          <span>{item.slot.room}</span>
                                        </span>
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
                  )}

                  {/* VIEW: DAILY SCHEDULE (All Days including Friday!) */}
                  {viewMode === "Daily" && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {WEEK_DAYS.map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setDailyDay(d)}
                            className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                              dailyDay === d
                                ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                                : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>

                      {(() => {
                        const dayClasses: Array<{ section: OfferedSectionItem; slot: TimeSlot }> = [];
                        activeRoutine.sections.forEach((sec) => {
                          sec.slots.forEach((sl) => {
                            if (sl.day.toUpperCase() === dailyDay) {
                              dayClasses.push({ section: sec, slot: sl });
                            }
                          });
                        });

                        dayClasses.sort((a, b) => (a.slot.startMinutes ?? 0) - (b.slot.startMinutes ?? 0));

                        if (dayClasses.length === 0) {
                          return (
                            <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 text-sm">
                              No classes scheduled on {dailyDay}! Enjoy your prep and self-study time.
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-3">
                            {dayClasses.map((item, idx) => {
                              const theme = COURSE_THEMES[item.section.courseCode] || DEFAULT_THEME;
                              const nextClass = dayClasses[idx + 1];
                              const gapToNext = nextClass
                                ? (nextClass.slot.startMinutes ?? 0) - (item.slot.endMinutes ?? 0)
                                : null;

                              return (
                                <React.Fragment key={idx}>
                                  <div
                                    className={`p-4 rounded-2xl bg-gradient-to-r ${theme.bg} border ${theme.border} space-y-2 shadow-md`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono font-black text-sm text-white">
                                          {item.section.courseCode}.{item.section.sectionNumber}
                                        </span>
                                        <span className="text-xs text-slate-300 font-semibold">
                                          {item.section.courseTitle}
                                        </span>
                                      </div>
                                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-black/40 text-slate-200 border border-slate-700">
                                        [{item.section.facultyInitial}] {item.section.facultyName}
                                      </span>
                                    </div>

                                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-mono text-slate-200">
                                      <span className="flex items-center gap-1 font-bold text-white">
                                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                                        <span>
                                          {formatTime12(item.slot.start)} ~ {formatTime12(item.slot.end)}
                                        </span>
                                      </span>
                                      <span className="flex items-center gap-1 font-bold text-indigo-300">
                                        <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                                        <span>{item.slot.room}</span>
                                      </span>
                                    </div>
                                  </div>

                                  {gapToNext !== null && (
                                    <div className="flex items-center justify-center py-1">
                                      <span
                                        className={`text-[11px] font-mono px-3 py-1 rounded-full border ${
                                          gapToNext <= 15
                                            ? "bg-emerald-950/60 text-emerald-300 border-emerald-800"
                                            : gapToNext <= 50
                                            ? "bg-blue-950/60 text-blue-300 border-blue-800"
                                            : "bg-amber-950/60 text-amber-300 border-amber-800"
                                        }`}
                                      >
                                        {gapToNext <= 15
                                          ? `⚡ ${gapToNext}m break (Direct consecutive next class)`
                                          : gapToNext <= 50
                                          ? `☕ ${gapToNext}m lunch/break before next class`
                                          : `⏱️ ${gapToNext}m gap before next class`}
                                      </span>
                                    </div>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* VIEW: OVERVIEW TABLE */}
                  {viewMode === "Overview" && (
                    <div className="overflow-x-auto scrollbar-thin">
                      <table className="w-full text-left text-xs font-sans">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                            <th className="py-3 px-3">Course</th>
                            <th className="py-3 px-3">Course Title</th>
                            <th className="py-3 px-3">Sec</th>
                            <th className="py-3 px-3">Cr</th>
                            <th className="py-3 px-3">Faculty Instructor</th>
                            <th className="py-3 px-3">12-Hour Schedule & Rooms</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 font-mono">
                          {activeRoutine.sections.map((s, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                              <td className="py-3 px-3 font-bold text-white">{s.courseCode}</td>
                              <td className="py-3 px-3 font-sans text-slate-300 max-w-[200px] truncate">
                                {s.courseTitle}
                              </td>
                              <td className="py-3 px-3 text-blue-400 font-bold">{s.sectionNumber}</td>
                              <td className="py-3 px-3 text-slate-300">{s.credits}</td>
                              <td className="py-3 px-3 text-indigo-300 font-sans">
                                <span className="font-mono font-bold mr-1">[{s.facultyInitial}]</span> {s.facultyName}
                              </td>
                              <td className="py-3 px-3 text-slate-300 text-[11px]">
                                {s.slots
                                  .map(
                                    (sl) =>
                                      `${sl.day} ${formatTime12(sl.start)} - ${formatTime12(sl.end)} @ ${sl.room}`
                                  )
                                  .join(" / ")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Footer Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>
                        Zero-Clash Verified • {activeRoutine.totalCredits} Credit Hours • {activeRoutine.activeDaysCount} Days on Campus
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopySectionCodes}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5 text-blue-400" />
                        <span>{language === "bn" ? "UMS সেকশন কপি" : "Copy for UMS"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-400" />
                        <span>{language === "bn" ? "প্রিন্ট" : "Print"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        };

        // When routines are present, support both Side-by-Side (Split) and Full-Width layouts
        if (routines.length > 0) {
          if (layoutMode === "split") {
            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-300">
                {/* Left Column (Sticky Sidebar on lg): 2. Priorities & Gap Control */}
                <div className="lg:col-span-5 xl:col-span-4 space-y-5 lg:sticky lg:top-20">
                  {renderPrioritiesCard(true)}
                </div>

                {/* Right Column: Top 10 Routines & Timetable */}
                <div className="lg:col-span-7 xl:col-span-8 space-y-5 min-w-0">
                  {renderRoutineResults()}
                </div>
              </div>
            );
          }

          // Full Width Mode
          return (
            <div className="space-y-6 animate-in fade-in duration-300">
              {renderPrioritiesCard(false)}
              {renderRoutineResults()}
            </div>
          );
        }

        // When no routines generated yet: render Priorities Card + Helpful Empty State
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            {renderPrioritiesCard(false)}

            <div className="rounded-3xl bg-slate-900/40 border border-slate-800/80 p-8 sm:p-12 text-center space-y-4 backdrop-blur-md">
              <div className="w-16 h-16 rounded-3xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-lg font-bold text-white">
                  {language === "bn" ? "রুটিন তৈরির জন্য প্রস্তুত" : "Ready to Build Your Routine"}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {language === "bn"
                    ? "ধাপ ১ থেকে কোর্স সিলেক্ট করুন এবং ধাপ ২-এর '১০টি সেরা রুটিন সাজান' বাটনে ক্লিক করে সাথে সাথে শূন্য-ক্ল্যাশ রুটিন তৈরি করুন।"
                    : "Select your target courses in Step 1, tune your day/gap preferences in Step 2, and click 'Generate 10 Clash-Free Routines' to get optimal schedules."}
                </p>
              </div>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => {
                    const sample = ["CSE355", "CSE381", "CSE382", "CSE443", "CSE444"].filter((c) =>
                      coursesCatalog.some((cat) => cat.code === c)
                    );
                    setSelectedCourses(sample.length > 0 ? sample : coursesCatalog.slice(0, 5).map((c) => c.code));
                    toast.success("Loaded 5 recommended standard courses (11 credits)!");
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  <span>Recommend Standard 5 Courses (11 Cr)</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 5. UPLOAD / PASTE ADVISING TABLE MODAL */}
      {/* ========================================================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-7 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors cursor-pointer text-base"
            >
              ✕
            </button>

            <div className="space-y-1.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white">
                {language === "bn" ? "সাউথইস্ট ইউনিভার্সিটি UMS টেবিল ইম্পোর্ট" : "Import Southeast University UMS Table"}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {language === "bn"
                  ? "সাউথইস্ট ইউনিভার্সিটির UMS পোর্টাল (ums.seu.edu.bd) থেকে Advising Table-এর .html ফাইল আপলোড করুন অথবা টেবিল থেকে কপি করে সরাসরি পেস্ট করুন।"
                  : "Upload official advising .html file or copy-paste table text directly from UMS. Auto-extracts all sections, slots, and faculty."}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-800/80 border border-slate-700/80">
              <button
                type="button"
                onClick={() => setUploadTab("file")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  uploadTab === "file"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Upload .html File</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadTab("paste")}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  uploadTab === "paste"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Paste Table / HTML</span>
              </button>
            </div>

            {/* Tab 1: File Upload */}
            {uploadTab === "file" && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-7 rounded-2xl border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-800/40 hover:bg-slate-800/80 transition-all text-center space-y-3 cursor-pointer"
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
                    {language === "bn" ? "ক্লিক করুন অথবা ফাইল ড্রপ করুন" : "Click to browse or drop .html file"}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">Supports SEU UMS HTML up to 10MB</p>
                </div>
              </div>
            )}

            {/* Tab 2: Direct Paste (Supports UMS table text, raw HTML, or seu-routine-builder format) */}
            {uploadTab === "paste" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">
                    {language === "bn" ? "টেবিল বা HTML কোড পেস্ট করুন" : "Paste Copied Table or HTML Source"}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePasteFromClipboard}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 text-[11px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Paste Clipboard</span>
                    </button>
                    {pastedText && (
                      <button
                        type="button"
                        onClick={() => setPastedText("")}
                        className="text-[11px] font-mono text-slate-400 hover:text-rose-400 cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste copied UMS advising table text or HTML source code here...&#10;&#10;Supported formats:&#10;• Full HTML source from ums.seu.edu.bd&#10;• Plain-text rows copied directly from browser (e.g. CSE355.1 Image Processing 3.0 [JAR] SUN # 10:00 ~ 11:20 @ SEU527 / TUE # 10:00 ~ 11:20 @ SEU527)&#10;• Formats from seu-routine-builder"
                  rows={7}
                  className="w-full text-xs font-mono p-3 rounded-2xl bg-slate-800/70 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed resize-none"
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-mono text-slate-400">
                    {pastedText.length > 0 ? `${pastedText.length.toLocaleString()} characters entered` : "Supports plain text or HTML"}
                  </span>
                  <button
                    type="button"
                    onClick={handleApplyPastedText}
                    disabled={uploadingFile || !pastedText.trim()}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${uploadingFile ? "animate-spin" : ""}`} />
                    <span>{uploadingFile ? "Parsing..." : "Parse & Apply Schedule"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Sandbox Guarantee Note */}
            <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-900/60 text-xs text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Private Student Sandbox Guarantee</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Your uploaded or pasted schedule is exclusively processed inside your personal browser session. It will <strong>never alter or merge into the university administration master catalog</strong>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
