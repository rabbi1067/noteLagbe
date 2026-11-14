"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
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
  ChevronRight,
  Filter,
  Search,
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
  BookOpen
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

export interface TimeSlot {
  day: string; // SUN, MON, TUE, WED, THU, FRI, SAT
  start: string; // e.g. "08:30"
  end: string; // e.g. "09:50"
  room: string; // e.g. "SEU527"
  startMinutes?: number;
  endMinutes?: number;
}

export interface OfferedSectionItem {
  id?: number;
  courseCode: string;
  sectionNumber: string;
  courseTitle: string;
  credits: number;
  facultyInitial: string;
  facultyName: string;
  availableSeats?: number;
  scheduleText: string;
  scheduleJson?: string;
  slots: TimeSlot[];
  semester?: string;
}

export interface GeneratedRoutineOption {
  sections: OfferedSectionItem[];
  score: number;
  matchPercentage: number;
  activeDaysCount: number;
  activeDays: string[];
  totalCredits: number;
  hasEarlyMorning: boolean;
  hasLateEvening: boolean;
  highlights: string[];
}

// Convert "08:30" to minutes (510)
function timeToMinutes(t: string): number {
  if (!t || !t.includes(":")) return 0;
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Check if two sections clash
function doSectionsClash(s1: OfferedSectionItem, s2: OfferedSectionItem): boolean {
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

// Built-in verified Southeast University sections (Spring 2026)
const DEFAULT_SEU_SECTIONS: OfferedSectionItem[] = [
  // CSE355 - Digital Image Processing (Theory, 3.0 Cr)
  { courseCode: "CSE355", sectionNumber: "1", courseTitle: "Digital Image Processing", credits: 3.0, facultyInitial: "JAR", facultyName: "Mst. Jesiara Khatun", scheduleText: "SUN # 10:00 ~ 11:20 @ SEU527 / TUE # 10:00 ~ 11:20 @ SEU527", slots: [{ day: "SUN", start: "10:00", end: "11:20", room: "SEU527", startMinutes: 600, endMinutes: 680 }, { day: "TUE", start: "10:00", end: "11:20", room: "SEU527", startMinutes: 600, endMinutes: 680 }] },
  { courseCode: "CSE355", sectionNumber: "2", courseTitle: "Digital Image Processing", credits: 3.0, facultyInitial: "JAR", facultyName: "Mst. Jesiara Khatun", scheduleText: "SUN # 11:30 ~ 12:50 @ SEU527 / TUE # 11:30 ~ 12:50 @ SEU527", slots: [{ day: "SUN", start: "11:30", end: "12:50", room: "SEU527", startMinutes: 690, endMinutes: 770 }, { day: "TUE", start: "11:30", end: "12:50", room: "SEU527", startMinutes: 690, endMinutes: 770 }] },
  { courseCode: "CSE355", sectionNumber: "3", courseTitle: "Digital Image Processing", credits: 3.0, facultyInitial: "MAHB", facultyName: "Mahbub Hasan", scheduleText: "MON # 08:30 ~ 09:50 @ SEU527 / WED # 08:30 ~ 09:50 @ SEU527", slots: [{ day: "MON", start: "08:30", end: "09:50", room: "SEU527", startMinutes: 510, endMinutes: 590 }, { day: "WED", start: "08:30", end: "09:50", room: "SEU527", startMinutes: 510, endMinutes: 590 }] },
  { courseCode: "CSE355", sectionNumber: "4", courseTitle: "Digital Image Processing", credits: 3.0, facultyInitial: "MAHB", facultyName: "Mahbub Hasan", scheduleText: "MON # 10:00 ~ 11:20 @ SEU527 / WED # 10:00 ~ 11:20 @ SEU527", slots: [{ day: "MON", start: "10:00", end: "11:20", room: "SEU527", startMinutes: 600, endMinutes: 680 }, { day: "WED", start: "10:00", end: "11:20", room: "SEU527", startMinutes: 600, endMinutes: 680 }] },
  { courseCode: "CSE355", sectionNumber: "5", courseTitle: "Digital Image Processing", credits: 3.0, facultyInitial: "MNAR", facultyName: "Namirah Rasul", scheduleText: "THU # 13:30 ~ 14:50 @ SEU527 / SAT # 13:30 ~ 14:50 @ SEU527", slots: [{ day: "THU", start: "13:30", end: "14:50", room: "SEU527", startMinutes: 810, endMinutes: 890 }, { day: "SAT", start: "13:30", end: "14:50", room: "SEU527", startMinutes: 810, endMinutes: 890 }] },
  { courseCode: "CSE355", sectionNumber: "6", courseTitle: "Digital Image Processing", credits: 3.0, facultyInitial: "MNAR", facultyName: "Namirah Rasul", scheduleText: "THU # 15:00 ~ 16:20 @ SEU527 / SAT # 15:00 ~ 16:20 @ SEU527", slots: [{ day: "THU", start: "15:00", end: "16:20", room: "SEU527", startMinutes: 900, endMinutes: 980 }, { day: "SAT", start: "15:00", end: "16:20", room: "SEU527", startMinutes: 900, endMinutes: 980 }] },
  { courseCode: "CSE355", sectionNumber: "7", courseTitle: "Digital Image Processing", credits: 3.0, facultyInitial: "NAAO", facultyName: "Md. Nahid Anam Opu", scheduleText: "SUN # 13:30 ~ 14:50 @ SEU321 / TUE # 13:30 ~ 14:50 @ SEU321", slots: [{ day: "SUN", start: "13:30", end: "14:50", room: "SEU321", startMinutes: 810, endMinutes: 890 }, { day: "TUE", start: "13:30", end: "14:50", room: "SEU321", startMinutes: 810, endMinutes: 890 }] },
  { courseCode: "CSE355", sectionNumber: "8", courseTitle: "Digital Image Processing", credits: 3.0, facultyInitial: "NAAO", facultyName: "Md. Nahid Anam Opu", scheduleText: "SUN # 15:00 ~ 16:20 @ SEU321 / TUE # 15:00 ~ 16:20 @ SEU321", slots: [{ day: "SUN", start: "15:00", end: "16:20", room: "SEU321", startMinutes: 900, endMinutes: 980 }, { day: "TUE", start: "15:00", end: "16:20", room: "SEU321", startMinutes: 900, endMinutes: 980 }] },
  { courseCode: "CSE355", sectionNumber: "9", courseTitle: "Digital Image Processing", credits: 3.0, facultyInitial: "RKM", facultyName: "Md. Rakibul Islam", scheduleText: "MON # 13:30 ~ 14:50 @ SEU321 / WED # 13:30 ~ 14:50 @ SEU321", slots: [{ day: "MON", start: "13:30", end: "14:50", room: "SEU321", startMinutes: 810, endMinutes: 890 }, { day: "WED", start: "13:30", end: "14:50", room: "SEU321", startMinutes: 810, endMinutes: 890 }] },
  { courseCode: "CSE355", sectionNumber: "10", courseTitle: "Digital Image Processing", credits: 3.0, facultyInitial: "RKM", facultyName: "Md. Rakibul Islam", scheduleText: "SUN # 15:00 ~ 16:20 @ SEU321 / TUE # 15:00 ~ 16:20 @ SEU321", slots: [{ day: "SUN", start: "15:00", end: "16:20", room: "SEU321", startMinutes: 900, endMinutes: 980 }, { day: "TUE", start: "15:00", end: "16:20", room: "SEU321", startMinutes: 900, endMinutes: 980 }] },

  // CSE381 - Introduction to Embedded Systems (Theory, 3.0 Cr)
  { courseCode: "CSE381", sectionNumber: "1", courseTitle: "Introduction to Embedded Systems", credits: 3.0, facultyInitial: "DSS", facultyName: "Dr. Sherejad Sanam", scheduleText: "SUN # 08:30 ~ 09:50 @ SEU535 / TUE # 08:30 ~ 09:50 @ SEU535", slots: [{ day: "SUN", start: "08:30", end: "09:50", room: "SEU535", startMinutes: 510, endMinutes: 590 }, { day: "TUE", start: "08:30", end: "09:50", room: "SEU535", startMinutes: 510, endMinutes: 590 }] },
  { courseCode: "CSE381", sectionNumber: "2", courseTitle: "Introduction to Embedded Systems", credits: 3.0, facultyInitial: "DSS", facultyName: "Dr. Sherejad Sanam", scheduleText: "SUN # 10:00 ~ 11:20 @ SEU535 / TUE # 10:00 ~ 11:20 @ SEU535", slots: [{ day: "SUN", start: "10:00", end: "11:20", room: "SEU535", startMinutes: 600, endMinutes: 680 }, { day: "TUE", start: "10:00", end: "11:20", room: "SEU535", startMinutes: 600, endMinutes: 680 }] },
  { courseCode: "CSE381", sectionNumber: "3", courseTitle: "Introduction to Embedded Systems", credits: 3.0, facultyInitial: "JABA", facultyName: "Jayed Bin Azad", scheduleText: "SUN # 10:00 ~ 11:20 @ SEU419 / TUE # 10:00 ~ 11:20 @ SEU419", slots: [{ day: "SUN", start: "10:00", end: "11:20", room: "SEU419", startMinutes: 600, endMinutes: 680 }, { day: "TUE", start: "10:00", end: "11:20", room: "SEU419", startMinutes: 600, endMinutes: 680 }] },
  { courseCode: "CSE381", sectionNumber: "4", courseTitle: "Introduction to Embedded Systems", credits: 3.0, facultyInitial: "JABA", facultyName: "Jayed Bin Azad", scheduleText: "SUN # 11:30 ~ 12:50 @ SEU419 / TUE # 11:30 ~ 12:50 @ SEU419", slots: [{ day: "SUN", start: "11:30", end: "12:50", room: "SEU419", startMinutes: 690, endMinutes: 770 }, { day: "TUE", start: "11:30", end: "12:50", room: "SEU419", startMinutes: 690, endMinutes: 770 }] },
  { courseCode: "CSE381", sectionNumber: "5", courseTitle: "Introduction to Embedded Systems", credits: 3.0, facultyInitial: "NAAO", facultyName: "Md. Nahid Anam Opu", scheduleText: "MON # 10:00 ~ 11:20 @ SEU535 / WED # 10:00 ~ 11:20 @ SEU535", slots: [{ day: "MON", start: "10:00", end: "11:20", room: "SEU535", startMinutes: 600, endMinutes: 680 }, { day: "WED", start: "10:00", end: "11:20", room: "SEU535", startMinutes: 600, endMinutes: 680 }] },
  { courseCode: "CSE381", sectionNumber: "6", courseTitle: "Introduction to Embedded Systems", credits: 3.0, facultyInitial: "NAAO", facultyName: "Md. Nahid Anam Opu", scheduleText: "MON # 11:30 ~ 12:50 @ SEU535 / WED # 11:30 ~ 12:50 @ SEU535", slots: [{ day: "MON", start: "11:30", end: "12:50", room: "SEU535", startMinutes: 690, endMinutes: 770 }, { day: "WED", start: "11:30", end: "12:50", room: "SEU535", startMinutes: 690, endMinutes: 770 }] },

  // CSE382 - Introduction to Embedded Systems Lab (Lab, 1.0 Cr)
  { courseCode: "CSE382", sectionNumber: "1", courseTitle: "Embedded Systems Lab", credits: 1.0, facultyInitial: "TMD", facultyName: "Tashreef Muhammad", scheduleText: "SUN # 11:30 ~ 13:30 @ SEU610", slots: [{ day: "SUN", start: "11:30", end: "13:30", room: "SEU610", startMinutes: 690, endMinutes: 810 }] },
  { courseCode: "CSE382", sectionNumber: "2", courseTitle: "Embedded Systems Lab", credits: 1.0, facultyInitial: "TMD", facultyName: "Tashreef Muhammad", scheduleText: "SUN # 14:00 ~ 16:00 @ SEU610", slots: [{ day: "SUN", start: "14:00", end: "16:00", room: "SEU610", startMinutes: 840, endMinutes: 960 }] },
  { courseCode: "CSE382", sectionNumber: "4", courseTitle: "Embedded Systems Lab", credits: 1.0, facultyInitial: "NAAO", facultyName: "Md. Nahid Anam Opu", scheduleText: "MON # 11:30 ~ 13:30 @ SEU610", slots: [{ day: "MON", start: "11:30", end: "13:30", room: "SEU610", startMinutes: 690, endMinutes: 810 }] },
  { courseCode: "CSE382", sectionNumber: "8", courseTitle: "Embedded Systems Lab", credits: 1.0, facultyInitial: "JABA", facultyName: "Jayed Bin Azad", scheduleText: "TUE # 16:30 ~ 18:30 @ SEU610", slots: [{ day: "TUE", start: "16:30", end: "18:30", room: "SEU610", startMinutes: 990, endMinutes: 1110 }] },

  // CSE443 - Pattern Recognition (Theory, 3.0 Cr)
  { courseCode: "CSE443", sectionNumber: "7", courseTitle: "Pattern Recognition", credits: 3.0, facultyInitial: "GMRN", facultyName: "Gazi Maliha Raisa Noor", scheduleText: "THU # 13:30 ~ 14:50 @ SEU332 / SAT # 13:30 ~ 14:50 @ SEU332", slots: [{ day: "THU", start: "13:30", end: "14:50", room: "SEU332", startMinutes: 810, endMinutes: 890 }, { day: "SAT", start: "13:30", end: "14:50", room: "SEU332", startMinutes: 810, endMinutes: 890 }] },
  { courseCode: "CSE443", sectionNumber: "8", courseTitle: "Pattern Recognition", credits: 3.0, facultyInitial: "GMRN", facultyName: "Gazi Maliha Raisa Noor", scheduleText: "THU # 15:00 ~ 16:20 @ SEU332 / SAT # 15:00 ~ 16:20 @ SEU332", slots: [{ day: "THU", start: "15:00", end: "16:20", room: "SEU332", startMinutes: 900, endMinutes: 980 }, { day: "SAT", start: "15:00", end: "16:20", room: "SEU332", startMinutes: 900, endMinutes: 980 }] },
  { courseCode: "CSE443", sectionNumber: "10", courseTitle: "Pattern Recognition", credits: 3.0, facultyInitial: "NIBI", facultyName: "Sheikh Md. Nibir", scheduleText: "THU # 16:30 ~ 17:50 @ SEU332 / SAT # 16:30 ~ 17:50 @ SEU332", slots: [{ day: "THU", start: "16:30", end: "17:50", room: "SEU332", startMinutes: 990, endMinutes: 1070 }, { day: "SAT", start: "16:30", end: "17:50", room: "SEU332", startMinutes: 990, endMinutes: 1070 }] },

  // CSE444 - Pattern Recognition Lab (Lab, 1.0 Cr)
  { courseCode: "CSE444", sectionNumber: "12", courseTitle: "Pattern Recognition Lab", credits: 1.0, facultyInitial: "TAJO", facultyName: "Tanjina Oriana", scheduleText: "SAT # 11:30 ~ 13:30 @ SEU213A", slots: [{ day: "SAT", start: "11:30", end: "13:30", room: "SEU213A", startMinutes: 690, endMinutes: 810 }] },
  { courseCode: "CSE444", sectionNumber: "14", courseTitle: "Pattern Recognition Lab", credits: 1.0, facultyInitial: "TAJO", facultyName: "Tanjina Oriana", scheduleText: "SAT # 14:00 ~ 16:00 @ SEU213A", slots: [{ day: "SAT", start: "14:00", end: "16:00", room: "SEU213A", startMinutes: 840, endMinutes: 960 }] },

  // CSE472 - Software Quality Assurance & Testing Lab (Lab, 1.0 Cr)
  { courseCode: "CSE472", sectionNumber: "1", courseTitle: "SQA & Testing Lab", credits: 1.0, facultyInitial: "ABAH", facultyName: "Abid Ahmad", scheduleText: "SUN # 08:30 ~ 10:30 @ SEU804", slots: [{ day: "SUN", start: "08:30", end: "10:30", room: "SEU804", startMinutes: 510, endMinutes: 630 }] },
  { courseCode: "CSE472", sectionNumber: "4", courseTitle: "SQA & Testing Lab", credits: 1.0, facultyInitial: "ANMS", facultyName: "Anik Mahmud Shanto", scheduleText: "THU # 11:30 ~ 13:30 @ SEU804", slots: [{ day: "THU", start: "11:30", end: "13:30", room: "SEU804", startMinutes: 690, endMinutes: 810 }] },
];

const WEEK_DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const TIME_COLUMNS = ["08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22"];

export default function SmartAdvisingRoutineTool() {
  const { user } = useAuth();
  const { language } = useLanguage();

  // State
  const [sections, setSections] = useState<OfferedSectionItem[]>(DEFAULT_SEU_SECTIONS);
  const [loading, setLoading] = useState<boolean>(false);
  const [semester, setSemester] = useState<string>("Spring 2026");

  // Selection
  const [selectedCourses, setSelectedCourses] = useState<string[]>([
    "CSE381",
    "CSE355",
    "CSE382",
    "CSE443",
    "CSE444",
  ]);

  // Preferences
  const [timePreference, setTimePreference] = useState<"ANY" | "AVOID_MORNING" | "AVOID_LATE" | "PREFER_MORNING" | "PREFER_AFTERNOON">("AVOID_MORNING");
  const [dayPreference, setDayPreference] = useState<"ANY" | "MINIMIZE_DAYS" | "AVOID_GAPS">("MINIMIZE_DAYS");
  const [preferredDays, setPreferredDays] = useState<string[]>(["SUN", "TUE", "THU", "SAT"]);
  const [facultyPreferences, setFacultyPreferences] = useState<Record<string, string[]>>({
    CSE381: ["JABA", "DSS"],
    CSE355: ["RKM", "JAR"],
  });

  // Generated Routines
  const [routines, setRoutines] = useState<GeneratedRoutineOption[]>([]);
  const [selectedRoutineIndex, setSelectedRoutineIndex] = useState<number>(0);
  const [generating, setGenerating] = useState<boolean>(false);

  // Timetable View Mode (Daily, Weekly, Overview)
  const [viewMode, setViewMode] = useState<"Daily" | "Weekly" | "Overview">("Weekly");
  const [dailyDay, setDailyDay] = useState<string>("SUN");

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load sections from backend on mount
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
              sectionNumber: s.sectionNumber,
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
        if (flat.length > 0) {
          setSections(flat);
        }
      }
    } catch (err) {
      console.warn("Backend advising fetch fallback to verified static data:", err);
    }
  };

  // Group sections by Course Code
  const coursesCatalog = useMemo(() => {
    const map = new Map<string, { title: string; credits: number; sections: OfferedSectionItem[] }>();
    sections.forEach((s) => {
      if (!map.has(s.courseCode)) {
        map.set(s.courseCode, {
          title: s.courseTitle,
          credits: s.credits,
          sections: [],
        });
      }
      map.get(s.courseCode)!.sections.push(s);
    });
    return Array.from(map.entries()).map(([code, data]) => ({
      code,
      title: data.title,
      credits: data.credits,
      sections: data.sections,
    }));
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

  // Generate Routines Handler (Hybrid: tries backend API, falls back to client-side fast solver)
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

      if (res && res.routines && res.routines.length > 0) {
        const formatted: GeneratedRoutineOption[] = res.routines.map((r: any) => ({
          ...r,
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

    // 2. Client-side local solver
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
      if (validCombos.length >= 300) return;
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
          ? "এই কোর্সগুলোর মধ্যে ১০০% ক্ল্যাশ-মুক্ত কোনো রুটিন তৈরি সম্ভব হয়নি। দয়া করে কোর্স বা সেকশন পরিবর্তন করুন।"
          : "No conflict-free routine possible for this combination. Please swap one course."
      );
      setGenerating(false);
      return;
    }

    // Score client combinations
    const scored: GeneratedRoutineOption[] = validCombos.map((combo) => {
      let score = 100;
      const highlights: string[] = [];
      const activeDaysSet = new Set<string>();
      let hasEarly = false;
      let hasLate = false;
      let morningCount = 0;
      let afternoonCount = 0;

      combo.forEach((sec) => {
        sec.slots.forEach((slot) => {
          activeDaysSet.add(slot.day.toUpperCase());
          const sm = slot.startMinutes ?? timeToMinutes(slot.start);
          const em = slot.endMinutes ?? timeToMinutes(slot.end);

          if (sm < 600) hasEarly = true; // before 10:00
          if (em > 990) hasLate = true; // after 16:30
          if (sm >= 510 && sm <= 780) morningCount++;
          if (sm >= 690 && sm <= 990) afternoonCount++;
        });
      });

      const dayCount = activeDaysSet.size;
      if (dayCount <= 2) {
        score += 60;
        highlights.push(`⚡ Only ${dayCount} Campus Days`);
      } else if (dayCount === 3) {
        score += 35;
        highlights.push(`🗓️ Balanced ${dayCount} Days`);
      } else if (dayCount >= 5) {
        score -= 25;
      }

      // Time pref
      if (timePreference === "AVOID_MORNING") {
        if (!hasEarly) {
          score += 40;
          highlights.push("☀️ No Early 08:30 Classes");
        } else {
          score -= 35;
        }
      } else if (timePreference === "AVOID_LATE") {
        if (!hasLate) {
          score += 35;
          highlights.push("🌇 No Late Classes");
        } else {
          score -= 30;
        }
      } else if (timePreference === "PREFER_MORNING") {
        score += morningCount * 10;
        if (morningCount > afternoonCount) highlights.push("🌅 Morning Centered");
      } else if (timePreference === "PREFER_AFTERNOON") {
        score += afternoonCount * 10;
        if (afternoonCount > morningCount) highlights.push("☕ Afternoon Focused");
      }

      // Faculty pref
      let facMatchCount = 0;
      combo.forEach((sec) => {
        const pref = facultyPreferences[sec.courseCode];
        if (pref && pref.includes(sec.facultyInitial)) {
          score += 30;
          facMatchCount++;
        }
      });
      if (facMatchCount === combo.length) {
        highlights.push("⭐ All Preferred Faculty Matched");
      } else if (facMatchCount > 0) {
        highlights.push(`⭐ ${facMatchCount} Preferred Faculty`);
      }

      const matchPercentage = Math.min(99, Math.max(65, Math.round((score / 230) * 100)));

      return {
        sections: combo,
        score,
        matchPercentage,
        activeDaysCount: dayCount,
        activeDays: Array.from(activeDaysSet),
        totalCredits: combo.reduce((acc, s) => acc + s.credits, 0),
        hasEarlyMorning: hasEarly,
        hasLateEvening: hasLate,
        highlights,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 15);
    setRoutines(top);
    setSelectedRoutineIndex(0);
    triggerSuccessFeedback(top.length);
    setGenerating(false);
  };

  const triggerSuccessFeedback = (count: number) => {
    toast.success(
      language === "bn"
        ? `🎉 ${count}টি শূন্য-ক্ল্যাশ (Zero Clash) রুটিন সফলভাবে সাজানো হয়েছে!`
        : `🎉 Generated ${count} conflict-free routines with 100% Zero-Clash guarantee!`
    );
    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch (e) {}
  };

  // Run initial solve on first render
  useEffect(() => {
    if (sections.length > 0 && routines.length === 0) {
      runClientSideRoutineSolver();
    }
  }, [sections]);

  // Handle UMS HTML File Upload (up to 10MB)
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error(language === "bn" ? "ফাইলের সাইজ ১০ মেগাবাইটের কম হতে হবে!" : "File size must be under 10MB!");
      return;
    }

    setUploadingFile(true);
    try {
      const text = await file.text();
      // Client-side instant regex parser for zero latency feedback
      const parsedList = parseHtmlClientSide(text);
      if (parsedList.length > 0) {
        setSections(parsedList);
        toast.success(
          language === "bn"
            ? `✅ সফলভাবে ${parsedList.length}টি সেকশন লোড করা হয়েছে!`
            : `✅ Successfully extracted ${parsedList.length} offered sections!`
        );
      }

      // Also persist to backend
      await api.advising.uploadAdvisingTable(file, semester);
      setIsUploadModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to process advising HTML file.");
    } finally {
      setUploadingFile(false);
    }
  };

  const parseHtmlClientSide = (html: string): OfferedSectionItem[] => {
    const list: OfferedSectionItem[] = [];
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
      const title = titleM ? titleM[1].trim() : courseCode;

      const credM = chunk.match(credPattern);
      const credits = credM ? parseFloat(credM[1].trim()) : 3.0;

      const facM = chunk.match(facPattern);
      const facInit = facM ? facM[1].trim().toUpperCase() : "TBA";
      const facName = facM ? facM[2].trim() : "To Be Announced";

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
    return list;
  };

  // Current active routine
  const activeRoutine = routines[selectedRoutineIndex] || routines[0] || null;

  // Copy routine summary to clipboard
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
                ? "সাউথইস্ট ইউনিভার্সিটির UMS অ্যাডভাইজিং টেবিল থেকে শূন্য-ক্ল্যাশ (0% Conflict) সহ আপনার কাঙ্ক্ষিত শিক্ষক, ডে-স্লট এবং ন্যূনতম ক্যাম্পাসের দিনে সেরা রুটিন তৈরি করুন।"
                : "Instantly computes conflict-free class combinations from SEU UMS advising tables. Optimize by preferred teachers, minimize campus days, and avoid early 08:30 mornings."}
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

            <button
              onClick={handleGenerateRoutines}
              disabled={generating}
              className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
              <span>{generating ? (language === "bn" ? "অ্যানালাইসিস হচ্ছে..." : "Solving...") : (language === "bn" ? "রুটিন সাজান 🚀" : "Generate Routines 🚀")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. COURSE SELECTOR & PREFERENCES CONTROLS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Course Selection Box (7 Cols) */}
        <div className="lg:col-span-7 rounded-3xl bg-slate-900/60 border border-slate-800 p-5 sm:p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-400" />
              <h2 className="text-base sm:text-lg font-bold text-white">
                {language === "bn" ? "১. টার্গেট কোর্স নির্বাচন করুন" : "1. Select Target Courses"}
              </h2>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {selectedCourses.length} Courses • {selectedCreditsTotal} Credits
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {coursesCatalog.map((c) => {
              const isSelected = selectedCourses.includes(c.code);
              return (
                <div
                  key={c.code}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedCourses(selectedCourses.filter((code) => code !== c.code));
                    } else {
                      if (selectedCourses.length >= 7) {
                        toast.error("Maximum 7 courses can be scheduled simultaneously.");
                        return;
                      }
                      setSelectedCourses([...selectedCourses, c.code]);
                    }
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex items-start justify-between gap-3 ${
                    isSelected
                      ? "bg-blue-600/15 border-blue-500/60 shadow-md shadow-blue-500/10"
                      : "bg-slate-800/40 border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/70"
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-white">{c.code}</span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {c.credits} Cr
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ({c.sections.length} sec)
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">{c.title}</p>
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

        {/* Priority & Preferences Config (5 Cols) */}
        <div className="lg:col-span-5 rounded-3xl bg-slate-900/60 border border-slate-800 p-5 sm:p-6 backdrop-blur-md space-y-5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              {language === "bn" ? "২. সময় ও ফ্যাকাল্টি প্রায়োরিটি" : "2. Priorities & Preferences"}
            </h2>
          </div>

          {/* Time Priority */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>{language === "bn" ? "ক্লাসের সময় পছন্দ (Time Preference)" : "Time Preference"}</span>
              <Clock className="w-3.5 h-3.5 text-slate-400" />
            </label>
            <select
              value={timePreference}
              onChange={(e) => setTimePreference(e.target.value as any)}
              className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="AVOID_MORNING">☀️ Avoid Morning (No 08:30 Classes)</option>
              <option value="AVOID_LATE">🌇 Avoid Late Afternoon (No 16:30+ Classes)</option>
              <option value="PREFER_MORNING">🌅 Prefer Morning Slots (08:30 - 13:00)</option>
              <option value="PREFER_AFTERNOON">☕ Prefer Afternoon Slots (11:30 - 16:30)</option>
              <option value="ANY">⚡ Balanced / Any Time Slot</option>
            </select>
          </div>

          {/* Day & Gap Priority */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>{language === "bn" ? "ক্যাম্পাস ডে মিনিমাইজেশন" : "Campus Days & Gaps"}</span>
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
            </label>
            <select
              value={dayPreference}
              onChange={(e) => setDayPreference(e.target.value as any)}
              className="w-full text-xs font-semibold py-2.5 px-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="MINIMIZE_DAYS">⚡ Minimize Campus Days (Pack into 2 or 3 Days)</option>
              <option value="AVOID_GAPS">⏱️ Compact Routine (Minimize Breaks/Gaps)</option>
              <option value="ANY">🗓️ Any Day Distribution</option>
            </select>
          </div>

          {/* Preferred Days Toggle */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-300 block">
              {language === "bn" ? "পছন্দের বারসমূহ (Preferred Days)" : "Preferred Days"}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {WEEK_DAYS.filter((d) => d !== "FRI").map((day) => {
                const active = preferredDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      if (active) {
                        setPreferredDays(preferredDays.filter((d) => d !== day));
                      } else {
                        setPreferredDays([...preferredDays, day]);
                      }
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                      active
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/30"
                        : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Faculty Picker for selected courses */}
          {selectedCourses.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>{language === "bn" ? "প্রিয় শিক্ষক নির্বাচন (Faculty Focus)" : "Preferred Faculties"}</span>
              </span>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1 no-scrollbar">
                {selectedCourses.slice(0, 3).map((code) => {
                  const facs = courseFaculties[code] || [];
                  if (facs.length === 0) return null;
                  const currentFav = facultyPreferences[code] || [];
                  return (
                    <div key={code} className="p-2 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs">
                      <span className="font-mono font-bold text-blue-400 mr-2">{code}:</span>
                      <div className="inline-flex flex-wrap gap-1 mt-1">
                        {facs.map((f) => {
                          const isFav = currentFav.includes(f.initial);
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
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                isFav
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                  : "bg-slate-700/60 text-slate-300 hover:bg-slate-700"
                              }`}
                              title={f.name}
                            >
                              [{f.initial}] {f.name.split(" ").slice(-1)[0]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. GENERATED ROUTINE OPTIONS SWITCHER */}
      {/* ========================================================================= */}
      {routines.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>
                {language === "bn"
                  ? `সেরা ${routines.length}টি ক্ল্যাশ-মুক্ত অপশন (র‍্যাংকড)`
                  : `Top ${routines.length} Ranked Clash-Free Routines`}
              </span>
            </h3>
            <button
              onClick={handleCopySectionCodes}
              className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-blue-400" />
              <span>{language === "bn" ? "সেকশন কোড কপি করুন" : "Copy Advising Codes"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {routines.map((opt, idx) => {
              const isActive = selectedRoutineIndex === idx;
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedRoutineIndex(idx)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer select-none space-y-2.5 relative overflow-hidden ${
                    isActive
                      ? "bg-gradient-to-br from-blue-900/40 via-indigo-900/30 to-slate-900 border-blue-500 shadow-lg shadow-blue-500/15"
                      : "bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-white flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center text-[10px]">
                        #{idx + 1}
                      </span>
                      <span>Option {idx + 1}</span>
                    </span>
                    <span className="text-xs font-mono font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {opt.matchPercentage}% Match
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {opt.highlights.slice(0, 3).map((h, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/80"
                      >
                        {h}
                      </span>
                    ))}
                  </div>

                  <div className="text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-800/80 truncate">
                    {opt.sections.map((s) => `${s.courseCode}.${s.sectionNumber}`).join(" • ")}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. INTERACTIVE TIMETABLE GRID (MATCHING USER SCREENSHOT EXACTLY) */}
      {/* ========================================================================= */}
      {activeRoutine && (
        <div className="rounded-3xl bg-[#0B0F19] border border-slate-800/80 p-5 sm:p-7 shadow-2xl space-y-6">
          {/* Header Bar matching Screenshot */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
                Class Information
              </h2>
              <p className="text-xs text-rose-500 font-mono mt-0.5">
                Only support 24 hours formatted sections.
              </p>
            </div>

            {/* View Switcher Tabs: Daily / Weekly / Overview */}
            <div className="inline-flex rounded-xl bg-slate-900 border border-slate-800 p-1 shrink-0 self-start sm:self-auto">
              {(["Daily", "Weekly", "Overview"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setViewMode(tab)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === tab
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* VIEW: WEEKLY TIMETABLE GRID */}
          {viewMode === "Weekly" && (
            <div className="overflow-x-auto no-scrollbar">
              <div className="min-w-[850px] space-y-2">
                {/* Time Axis Header (08 to 22) */}
                <div className="grid grid-cols-15 pl-14 pr-2 text-slate-400 font-mono text-xs font-bold border-b border-slate-800/80 pb-2">
                  {TIME_COLUMNS.map((hour) => (
                    <div key={hour} className="text-center">
                      {hour}
                    </div>
                  ))}
                </div>

                {/* Day Rows: SUN, MON, TUE, WED, THU, FRI, SAT */}
                {WEEK_DAYS.map((day) => {
                  // Filter classes on this day
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
                      className="flex items-center min-h-[72px] rounded-xl bg-slate-900/40 border border-slate-800/60 relative overflow-hidden"
                    >
                      {/* Day Label Left Column */}
                      <div className="w-14 shrink-0 font-mono font-bold text-xs text-slate-300 text-center select-none border-r border-slate-800/60 py-4">
                        {day}
                      </div>

                      {/* Timeline Area (14 hours: 08:00 to 22:00 = 840 mins) */}
                      <div className="relative flex-1 h-[68px] mx-2">
                        {dayClasses.map((item, idx) => {
                          const sm = item.slot.startMinutes ?? timeToMinutes(item.slot.start);
                          const em = item.slot.endMinutes ?? timeToMinutes(item.slot.end);

                          // Timeline boundaries: 08:00 = 480 min, 22:00 = 1320 min (total 840 min)
                          const leftPct = Math.max(0, Math.min(100, ((sm - 480) / 840) * 100));
                          const widthPct = Math.max(5, Math.min(100 - leftPct, ((em - sm) / 840) * 100));

                          return (
                            <div
                              key={idx}
                              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                              className="absolute top-1 bottom-1 rounded-xl bg-[#1E2238]/90 border border-indigo-500/50 hover:border-indigo-400 p-2 shadow-md hover:scale-[1.01] transition-all flex flex-col justify-between overflow-hidden cursor-pointer group"
                              title={`${item.section.courseCode}.${item.section.sectionNumber} - ${item.section.courseTitle}\nTime: ${item.slot.start}-${item.slot.end}\nRoom: ${item.slot.room}\nFaculty: ${item.section.facultyName} [${item.section.facultyInitial}]`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-mono font-black text-xs text-white group-hover:text-blue-300 truncate">
                                  {item.section.courseCode}.${item.section.sectionNumber}
                                </span>
                                <span className="text-[9px] font-mono px-1 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/80 shrink-0">
                                  [{item.section.facultyInitial}]
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                                <span>
                                  {item.slot.start}-{item.slot.end}
                                </span>
                                <span className="flex items-center gap-0.5 text-slate-400 truncate">
                                  <MapPin className="w-2.5 h-2.5 text-indigo-400" />
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

          {/* VIEW: DAILY VIEW */}
          {viewMode === "Daily" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {WEEK_DAYS.filter((d) => d !== "FRI").map((d) => (
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
                      🌴 No classes scheduled on {dailyDay}! Enjoy your study & prep time.
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {dayClasses.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-[#171B2B] border border-indigo-500/40 space-y-2 shadow-md"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-black text-sm text-white">
                            {item.section.courseCode}.{item.section.sectionNumber}
                          </span>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-800">
                            [{item.section.facultyInitial}]
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 truncate">{item.section.courseTitle}</p>
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-blue-400" />
                            <span>
                              {item.slot.start} ~ {item.slot.end}
                            </span>
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{item.slot.room}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* VIEW: OVERVIEW TABLE */}
          {viewMode === "Overview" && (
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-3">Course</th>
                    <th className="py-3 px-3">Title</th>
                    <th className="py-3 px-3">Section</th>
                    <th className="py-3 px-3">Cr</th>
                    <th className="py-3 px-3">Faculty</th>
                    <th className="py-3 px-3">Schedule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {activeRoutine.sections.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-3 font-bold text-white">{s.courseCode}</td>
                      <td className="py-3 px-3 font-sans text-slate-300 max-w-[200px] truncate">{s.courseTitle}</td>
                      <td className="py-3 px-3 text-blue-400 font-bold">{s.sectionNumber}</td>
                      <td className="py-3 px-3 text-slate-300">{s.credits}</td>
                      <td className="py-3 px-3 text-indigo-300 font-sans">
                        <span className="font-mono font-bold mr-1">[{s.facultyInitial}]</span> {s.facultyName}
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[11px]">{s.scheduleText}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Zero-Clash Verified • {activeRoutine.totalCredits} Credit Hours</span>
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

      {/* ========================================================================= */}
      {/* 5. UPLOAD ADVISING TABLE MODAL (SUPPORT UP TO 10MB) */}
      {/* ========================================================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>

            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white">
                {language === "bn" ? "সাউথইস্ট ইউনিভার্সিটি UMS টেবিল আপলোড" : "Upload Southeast University UMS Table"}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {language === "bn"
                  ? "সাউথইস্ট ইউনিভার্সিটির UMS পোর্টাল (ums.seu.edu.bd) থেকে Advising Table পেজের .html ফাইলটি (সর্বোচ্চ ১০ মেগাবাইট) এখানে আপলোড করুন। স্বয়ংক্রিয়ভাবে সব সেকশন ও রুটিন এক্সট্র্যাক্ট করা হবে।"
                  : "Save your SEU UMS Advising Table page as .html (up to 10MB) and drop it here. All sections, faculty codes, and day/time schedules will be parsed instantly."}
              </p>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-8 rounded-2xl border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-800/40 hover:bg-slate-800/80 transition-all text-center space-y-3 cursor-pointer"
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
              <FileText className="w-10 h-10 text-slate-400 mx-auto" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-200">
                  {language === "bn" ? "ক্লিক করুন অথবা ফাইল ড্রপ করুন" : "Click to browse or drop .html file"}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">Supports SEU UMS HTML up to 10MB</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-900/60 text-xs text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>10-Day Retention & Deduplication Policy</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                User-uploaded schedule tables are safely stored for 10 rolling days with automatic deduplication. Master tables uploaded by administrative staff take permanent precedence.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
