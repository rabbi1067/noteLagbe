"use client";

import React, { useState, useEffect, useId, useRef } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import EventCertificateMaker from "@/components/EventCertificateMaker";
import AcademicCalendarTool from "@/components/AcademicCalendarTool";
import { 
  Calculator,
  Award, 
  DollarSign, 
  FileText, 
  Calendar,
  CalendarDays, 
  Users, 
  Sparkles, 
  Plus, 
  Minus, 
  Info, 
  Download, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  RefreshCw, 
  Clock, 
  MapPin, 
  School, 
  ExternalLink, 
  ShieldCheck, 
  Layers, 
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Edit3,
  Search,
  Grid,
  Flame,
  Check,
  Share2,
  GraduationCap,
  Banknote,
  ClipboardList,
  HelpCircle,
  Palette
} from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import confetti from "canvas-confetti";

// ==========================================
// SEU OFFICIAL GRADING SCALE
// ==========================================
const SEU_GRADES = [
  { label: "4.00 (A+)", value: 4.00, desc: "80% and above", grade: "A+" },
  { label: "3.75 (A)",  value: 3.75, desc: "75% to 79%",  grade: "A" },
  { label: "3.50 (A-)", value: 3.50, desc: "70% to 74%",  grade: "A-" },
  { label: "3.25 (B+)", value: 3.25, desc: "65% to 69%",  grade: "B+" },
  { label: "3.00 (B)",  value: 3.00, desc: "60% to 64%",  grade: "B" },
  { label: "2.75 (B-)", value: 2.75, desc: "55% to 59%",  grade: "B-" },
  { label: "2.50 (C+)", value: 2.50, desc: "50% to 54%",  grade: "C+" },
  { label: "2.25 (C)",  value: 2.25, desc: "45% to 49%",  grade: "C" },
  { label: "2.00 (D)",  value: 2.00, desc: "40% to 44%",  grade: "D" },
  { label: "0.00 (F)",  value: 0.00, desc: "Less than 40%", grade: "F" },
];

const SEU_CREDITS = ["3.0", "1.0"];

// ==========================================
// SEU OFFICIAL ROUTINE SLOTS & DAY PAIRS
// ==========================================
export const SEU_THEORY_SLOTS = [
  "08:30-09:50",
  "10:00-11:20",
  "11:30-12:50",
  "13:30-14:50",
  "15:00-16:20",
  "16:30-17:50",
  "18:00-19:20",
  "18:30-19:50",
];

export const SEU_LAB_SLOTS = [
  "08:00-10:00",
  "10:00-12:00",
  "11:30-13:30",
  "13:30-15:30",
  "15:30-17:30",
  "16:30-18:30",
  "18:00-20:00",
];

export const SEU_DAY_SLOTS = [
  { label: "Sunday - Tuesday (SUN & TUE Theory Pair)", value: "Sunday - Tuesday", days: ["Sunday", "Tuesday"] },
  { label: "Monday - Wednesday (MON & WED Theory Pair)", value: "Monday - Wednesday", days: ["Monday", "Wednesday"] },
  { label: "Thursday - Saturday (THU & SAT Theory Pair)", value: "Thursday - Saturday", days: ["Thursday", "Saturday"] },
  { label: "Friday (FRI Single Day)", value: "Friday", days: ["Friday"] },
  { label: "Sunday (SUN Single)", value: "Sunday", days: ["Sunday"] },
  { label: "Monday (MON Single)", value: "Monday", days: ["Monday"] },
  { label: "Tuesday (TUE Single)", value: "Tuesday", days: ["Tuesday"] },
  { label: "Wednesday (WED Single)", value: "Wednesday", days: ["Wednesday"] },
  { label: "Thursday (THU Single)", value: "Thursday", days: ["Thursday"] },
  { label: "Saturday (SAT Single)", value: "Saturday", days: ["Saturday"] },
];

export const SEU_TIMELINE_DAYS = [
  { code: "SUN", fullDay: "Sunday", bg: "bg-[#0b1328]" },
  { code: "MON", fullDay: "Monday", bg: "bg-[#101b33]" },
  { code: "TUE", fullDay: "Tuesday", bg: "bg-[#0b1328]" },
  { code: "WED", fullDay: "Wednesday", bg: "bg-[#101b33]" },
  { code: "THU", fullDay: "Thursday", bg: "bg-[#0b1328]" },
  { code: "FRI", fullDay: "Friday", bg: "bg-[#101b33]" },
  { code: "SAT", fullDay: "Saturday", bg: "bg-[#0b1328]" },
];

export const SEU_TIMELINE_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];


// ==========================================
// SEU SMART ROUTINE 6 PREMIUM COLOR THEMES
// ==========================================
export interface RoutineThemeConfig {
  id: "navy" | "orange" | "pink" | "emerald" | "purple" | "daylight";
  name: string;
  nameBn: string;
  swatch: string;
  accentName: string;
  containerClass: string;
  rulerClass: string;
  rulerTextClass: string;
  rulerTickClass: string;
  rowEvenClass: string;
  rowOddClass: string;
  rowHoverClass: string;
  rowDividerClass: string;
  dayLabelClass: string;
  dayLabelTextClass: string;
  gridLineClass: string;
  cardNormalClass: string;
  cardCodeClass: string;
  cardTimeClass: string;
  cardRoomClass: string;
  cardIconClass: string;
  // Print & PDF Export Specs
  printBg: string;
  printHeaderLine: string;
  printHeaderH1: string;
  printHeaderP: string;
  printContainerBg: string;
  printContainerBorder: string;
  printRulerBg: string;
  printRulerBorder: string;
  printRulerText: string;
  printRowEven: string;
  printRowOdd: string;
  printRowBorder: string;
  printDayBg: string;
  printDayText: string;
  printDayBorder: string;
  printGridLine: string;
  printCardBg: string;
  printCardBorder: string;
  printCardCode: string;
  printCardTime: string;
  printCardRoom: string;
}

export const ROUTINE_COLOR_THEMES: Record<string, RoutineThemeConfig> = {
  navy: {
    id: "navy",
    name: "Midnight Navy",
    nameBn: "মিডনাইট নেভি",
    swatch: "#2563eb",
    accentName: "Navy",
    containerClass: "bg-[#070e1c] border-blue-900/50 shadow-2xl shadow-blue-950/40",
    rulerClass: "bg-[#0c1830] border-blue-900/50",
    rulerTextClass: "text-blue-200",
    rulerTickClass: "bg-blue-400/60",
    rowEvenClass: "bg-[#070e1c]",
    rowOddClass: "bg-[#0b1426]",
    rowHoverClass: "hover:bg-[#101d36]/70",
    rowDividerClass: "divide-blue-900/30",
    dayLabelClass: "border-blue-900/40 bg-[#0c1830]/80",
    dayLabelTextClass: "text-blue-400 font-extrabold",
    gridLineClass: "bg-blue-500/10",
    cardNormalClass: "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-blue-400 text-white shadow-md shadow-blue-950/40",
    cardCodeClass: "text-white font-black",
    cardTimeClass: "text-blue-100 font-bold",
    cardRoomClass: "text-blue-200 font-semibold",
    cardIconClass: "text-blue-300",
    printBg: "#070e1c",
    printHeaderLine: "#2563eb",
    printHeaderH1: "#ffffff",
    printHeaderP: "#93c5fd",
    printContainerBg: "#070e1c",
    printContainerBorder: "#1e3a8a",
    printRulerBg: "#0c1830",
    printRulerBorder: "#1e3a8a",
    printRulerText: "#bfdbfe",
    printRowEven: "#070e1c",
    printRowOdd: "#0b1426",
    printRowBorder: "#1e293b",
    printDayBg: "#0c1830",
    printDayText: "#60a5fa",
    printDayBorder: "#1e3a8a",
    printGridLine: "rgba(59, 130, 246, 0.12)",
    printCardBg: "#2563eb",
    printCardBorder: "#60a5fa",
    printCardCode: "#ffffff",
    printCardTime: "#dbeafe",
    printCardRoom: "#bfdbfe",
  },
  orange: {
    id: "orange",
    name: "Sunset Orange",
    nameBn: "সানসেট অরেঞ্জ",
    swatch: "#ea580c",
    accentName: "Orange",
    containerClass: "bg-[#170902] border-orange-900/50 shadow-2xl shadow-orange-950/40",
    rulerClass: "bg-[#261005] border-orange-900/50",
    rulerTextClass: "text-orange-200",
    rulerTickClass: "bg-orange-400/60",
    rowEvenClass: "bg-[#170902]",
    rowOddClass: "bg-[#200d04]",
    rowHoverClass: "hover:bg-[#2b1307]/70",
    rowDividerClass: "divide-orange-900/30",
    dayLabelClass: "border-orange-900/40 bg-[#261005]/80",
    dayLabelTextClass: "text-orange-400 font-extrabold",
    gridLineClass: "bg-orange-500/10",
    cardNormalClass: "bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 border border-orange-400 text-white shadow-md shadow-orange-950/40",
    cardCodeClass: "text-white font-black",
    cardTimeClass: "text-amber-100 font-bold",
    cardRoomClass: "text-orange-100 font-semibold",
    cardIconClass: "text-orange-200",
    printBg: "#140702",
    printHeaderLine: "#ea580c",
    printHeaderH1: "#ffffff",
    printHeaderP: "#fdba74",
    printContainerBg: "#170902",
    printContainerBorder: "#7c2d12",
    printRulerBg: "#261005",
    printRulerBorder: "#7c2d12",
    printRulerText: "#fed7aa",
    printRowEven: "#170902",
    printRowOdd: "#200d04",
    printRowBorder: "#431407",
    printDayBg: "#261005",
    printDayText: "#fb923c",
    printDayBorder: "#7c2d12",
    printGridLine: "rgba(249, 115, 22, 0.12)",
    printCardBg: "#ea580c",
    printCardBorder: "#fb923c",
    printCardCode: "#ffffff",
    printCardTime: "#ffedd5",
    printCardRoom: "#fed7aa",
  },
  pink: {
    id: "pink",
    name: "Cyber Pink",
    nameBn: "সাইবার পিঙ্ক",
    swatch: "#db2777",
    accentName: "Pink",
    containerClass: "bg-[#170412] border-pink-900/50 shadow-2xl shadow-pink-950/40",
    rulerClass: "bg-[#25071d] border-pink-900/50",
    rulerTextClass: "text-pink-200",
    rulerTickClass: "bg-pink-400/60",
    rowEvenClass: "bg-[#170412]",
    rowOddClass: "bg-[#1f0718]",
    rowHoverClass: "hover:bg-[#2c0b24]/70",
    rowDividerClass: "divide-pink-900/30",
    dayLabelClass: "border-pink-900/40 bg-[#25071d]/80",
    dayLabelTextClass: "text-pink-400 font-extrabold",
    gridLineClass: "bg-pink-500/10",
    cardNormalClass: "bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 border border-pink-400 text-white shadow-md shadow-pink-950/40",
    cardCodeClass: "text-white font-black",
    cardTimeClass: "text-pink-100 font-bold",
    cardRoomClass: "text-pink-100 font-semibold",
    cardIconClass: "text-pink-200",
    printBg: "#12030e",
    printHeaderLine: "#db2777",
    printHeaderH1: "#ffffff",
    printHeaderP: "#f9a8d4",
    printContainerBg: "#170412",
    printContainerBorder: "#831843",
    printRulerBg: "#25071d",
    printRulerBorder: "#831843",
    printRulerText: "#fbcfe8",
    printRowEven: "#170412",
    printRowOdd: "#1f0718",
    printRowBorder: "#500724",
    printDayBg: "#25071d",
    printDayText: "#f472b6",
    printDayBorder: "#831843",
    printGridLine: "rgba(236, 72, 153, 0.12)",
    printCardBg: "#db2777",
    printCardBorder: "#f472b6",
    printCardCode: "#ffffff",
    printCardTime: "#fce7f3",
    printCardRoom: "#fbcfe8",
  },
  emerald: {
    id: "emerald",
    name: "Emerald Forest",
    nameBn: "এমেরাল্ড ফরেস্ট",
    swatch: "#059669",
    accentName: "Emerald",
    containerClass: "bg-[#03140c] border-emerald-900/50 shadow-2xl shadow-emerald-950/40",
    rulerClass: "bg-[#062013] border-emerald-900/50",
    rulerTextClass: "text-emerald-200",
    rulerTickClass: "bg-emerald-400/60",
    rowEvenClass: "bg-[#03140c]",
    rowOddClass: "bg-[#051c11]",
    rowHoverClass: "hover:bg-[#0a2818]/70",
    rowDividerClass: "divide-emerald-900/30",
    dayLabelClass: "border-emerald-900/40 bg-[#062013]/80",
    dayLabelTextClass: "text-emerald-400 font-extrabold",
    gridLineClass: "bg-emerald-500/10",
    cardNormalClass: "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-400 text-white shadow-md shadow-emerald-950/40",
    cardCodeClass: "text-white font-black",
    cardTimeClass: "text-emerald-100 font-bold",
    cardRoomClass: "text-emerald-100 font-semibold",
    cardIconClass: "text-emerald-200",
    printBg: "#021009",
    printHeaderLine: "#059669",
    printHeaderH1: "#ffffff",
    printHeaderP: "#6ee7b7",
    printContainerBg: "#03140c",
    printContainerBorder: "#064e3b",
    printRulerBg: "#062013",
    printRulerBorder: "#064e3b",
    printRulerText: "#a7f3d0",
    printRowEven: "#03140c",
    printRowOdd: "#051c11",
    printRowBorder: "#022c22",
    printDayBg: "#062013",
    printDayText: "#34d399",
    printDayBorder: "#064e3b",
    printGridLine: "rgba(16, 185, 129, 0.12)",
    printCardBg: "#059669",
    printCardBorder: "#34d399",
    printCardCode: "#ffffff",
    printCardTime: "#d1fae5",
    printCardRoom: "#a7f3d0",
  },
  purple: {
    id: "purple",
    name: "Royal Purple",
    nameBn: "রয়েল পার্পল",
    swatch: "#7c3aed",
    accentName: "Purple",
    containerClass: "bg-[#110520] border-purple-900/50 shadow-2xl shadow-purple-950/40",
    rulerClass: "bg-[#1b0832] border-purple-900/50",
    rulerTextClass: "text-purple-200",
    rulerTickClass: "bg-purple-400/60",
    rowEvenClass: "bg-[#110520]",
    rowOddClass: "bg-[#18072d]",
    rowHoverClass: "hover:bg-[#250b44]/70",
    rowDividerClass: "divide-purple-900/30",
    dayLabelClass: "border-purple-900/40 bg-[#1b0832]/80",
    dayLabelTextClass: "text-purple-400 font-extrabold",
    gridLineClass: "bg-purple-500/10",
    cardNormalClass: "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border border-purple-400 text-white shadow-md shadow-purple-950/40",
    cardCodeClass: "text-white font-black",
    cardTimeClass: "text-purple-100 font-bold",
    cardRoomClass: "text-purple-100 font-semibold",
    cardIconClass: "text-purple-200",
    printBg: "#0d0419",
    printHeaderLine: "#7c3aed",
    printHeaderH1: "#ffffff",
    printHeaderP: "#d8b4fe",
    printContainerBg: "#110520",
    printContainerBorder: "#581c87",
    printRulerBg: "#1b0832",
    printRulerBorder: "#581c87",
    printRulerText: "#e9d5ff",
    printRowEven: "#110520",
    printRowOdd: "#18072d",
    printRowBorder: "#3b0764",
    printDayBg: "#1b0832",
    printDayText: "#c084fc",
    printDayBorder: "#581c87",
    printGridLine: "rgba(168, 85, 247, 0.12)",
    printCardBg: "#7c3aed",
    printCardBorder: "#a78bfa",
    printCardCode: "#ffffff",
    printCardTime: "#ede9fe",
    printCardRoom: "#ddd6fe",
  },
  daylight: {
    id: "daylight",
    name: "Daylight Paper",
    nameBn: "ক্লিন হোয়াইট পেপার",
    swatch: "#ffffff",
    accentName: "Daylight",
    containerClass: "bg-white border-slate-300 shadow-xl",
    rulerClass: "bg-slate-100 border-b border-slate-200",
    rulerTextClass: "text-slate-700 font-bold",
    rulerTickClass: "bg-slate-300",
    rowEvenClass: "bg-white",
    rowOddClass: "bg-slate-50/90",
    rowHoverClass: "hover:bg-blue-50/50",
    rowDividerClass: "divide-slate-200",
    dayLabelClass: "border-slate-200 bg-slate-100/90",
    dayLabelTextClass: "text-blue-900 font-extrabold",
    gridLineClass: "bg-slate-200/80",
    cardNormalClass: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border border-blue-500 shadow-sm",
    cardCodeClass: "text-white font-black",
    cardTimeClass: "text-blue-100 font-bold",
    cardRoomClass: "text-blue-100 font-semibold",
    cardIconClass: "text-blue-200",
    printBg: "#ffffff",
    printHeaderLine: "#2563eb",
    printHeaderH1: "#0f172a",
    printHeaderP: "#475569",
    printContainerBg: "#ffffff",
    printContainerBorder: "#cbd5e1",
    printRulerBg: "#f1f5f9",
    printRulerBorder: "#cbd5e1",
    printRulerText: "#334155",
    printRowEven: "#ffffff",
    printRowOdd: "#f8fafc",
    printRowBorder: "#e2e8f0",
    printDayBg: "#f1f5f9",
    printDayText: "#1d4ed8",
    printDayBorder: "#cbd5e1",
    printGridLine: "rgba(0,0,0,0.06)",
    printCardBg: "#2563eb",
    printCardBorder: "#1d4ed8",
    printCardCode: "#ffffff",
    printCardTime: "#dbeafe",
    printCardRoom: "#eff6ff",
  },
};

export const SEU_ROUTINE_COLUMNS = [
  {
    id: "col-1",
    label: "08:30 AM - 09:50 AM",
    subLabel: "Lab: 08:00 - 10:00 AM",
    theorySlot: "08:30 AM - 09:50 AM",
    labSlot: "08:00 AM - 10:00 AM",
    slots: ["08:30 AM - 09:50 AM", "08:00 AM - 10:00 AM"],
  },
  {
    id: "col-2",
    label: "10:00 AM - 11:20 AM",
    subLabel: "Theory Only",
    theorySlot: "10:00 AM - 11:20 AM",
    labSlot: null,
    slots: ["10:00 AM - 11:20 AM"],
  },
  {
    id: "col-3",
    label: "11:30 AM - 12:50 PM",
    subLabel: "Lab: 11:30 - 01:30 PM",
    theorySlot: "11:30 AM - 12:50 PM",
    labSlot: "11:30 AM - 01:30 PM",
    slots: ["11:30 AM - 12:50 PM", "11:30 AM - 01:30 PM"],
  },
  {
    id: "col-4",
    label: "01:30 PM - 02:50 PM",
    subLabel: "Lab: 01:30 - 03:30 PM",
    theorySlot: "01:30 PM - 02:50 PM",
    labSlot: "01:30 PM - 03:30 PM",
    slots: ["01:30 PM - 02:50 PM", "01:30 PM - 03:30 PM"],
  },
  {
    id: "col-5",
    label: "03:00 PM - 04:20 PM",
    subLabel: "Theory Only",
    theorySlot: "03:00 PM - 04:20 PM",
    labSlot: null,
    slots: ["03:00 PM - 04:20 PM"],
  },
  {
    id: "col-6",
    label: "04:30 PM - 05:50 PM",
    subLabel: "Lab: 04:30 - 06:30 PM",
    theorySlot: "04:30 PM - 05:50 PM",
    labSlot: "04:30 PM - 06:30 PM",
    slots: ["04:30 PM - 05:50 PM", "04:30 PM - 06:30 PM"],
  },
];


// =========================================================================
// 16 OFFICIAL & HANDCRAFTED UNIQUE SEU COVER TEMPLATES
// =========================================================================
export interface SEUCoverTemplate {
  id: string;
  num: string;
  name: string;
  nameBn: string;
  style: "Color" | "BW";
  theme: "classic" | "modern_wave" | "prestige_arch" | "geometric_tech" | "minimal_sidebar" | "executive_crest" | "cyber_circuit" | "fluted_academic" | "hexagonal_hive" | "facet_prism";
  defaultType: string;
  category: "assignment" | "lab" | "project" | "termpaper" | "thesis" | "proposal" | "casestudy" | "seminar" | "internship" | "capstone";
  file: string;
  desc: string;
  layoutStyle: "classic_table" | "asymmetric_spine" | "bold_editorial" | "floating_pill_cards" | "hex_spec_badge" | "executive_wave" | "prestige_honors" | "swiss_minimal" | "cyber_terminal" | "classical_column" | "geometric_tech_layout" | "casestudy_analytical" | "seminar_keynote" | "internship_tripartite" | "team_capstone" | "monochrome_laser";
}

export const SEU_20_TEMPLATES: SEUCoverTemplate[] = [
  // 01. Classic Academic Formal (Official SEU)
  {
    id: "01_Classic_Academic_Color",
    num: "01",
    name: "Classic Academic Formal",
    nameBn: "অফিসিয়াল ক্লাসিক ফ্রেম",
    style: "Color",
    theme: "classic",
    defaultType: "ASSIGNMENT",
    category: "assignment",
    file: "Color/01_Assignment_Color.docx",
    layoutStyle: "classic_table",
    desc: "Official SEU double navy border, formal course table & structured dual rectangular credential boxes."
  },
  // 02. Modern Asymmetric Polygon (Southern Univ inspired - Image 1)
  {
    id: "02_Asymmetric_Polygon_Spine",
    num: "02",
    name: "Modern Asymmetric Spine",
    nameBn: "সাউদার্ন ও আধুনিক পলিগন স্পাইন",
    style: "Color",
    theme: "facet_prism",
    defaultType: "LAB REPORT",
    category: "lab",
    file: "Color/02_Lab_Report_Color.docx",
    layoutStyle: "asymmetric_spine",
    desc: "Angled emerald & cyan polygon shards down left spine, clean left-aligned typography, underlined sections & teacher signature line (No boxes)."
  },
  // 03. Bold Editorial Poster (Franklin inspired - Image 2)
  {
    id: "03_Bold_Editorial_Poster",
    num: "03",
    name: "Bold Editorial Poster",
    nameBn: "ফ্র্যাঙ্কলিন বোল্ড পোস্টার",
    style: "Color",
    theme: "executive_crest",
    defaultType: "ASSIGNMENT",
    category: "assignment",
    file: "Color/01_Assignment_Color.docx",
    layoutStyle: "bold_editorial",
    desc: "Warm gold & amber diagonal planes with giant bold uppercase typography, floating minimal meta & corner submission date."
  },
  // 04. Honeycomb Floating 3D Cards (BUBT inspired - Image 3)
  {
    id: "04_Honeycomb_Floating_Cards",
    num: "04",
    name: "Honeycomb Floating 3D Cards",
    nameBn: "বিইউবিটি থ্রিডি ফ্লোটিং হেক্স",
    style: "Color",
    theme: "hexagonal_hive",
    defaultType: "LAB REPORT",
    category: "lab",
    file: "Color/02_Lab_Report_Color.docx",
    layoutStyle: "floating_pill_cards",
    desc: "3D isometric honeycomb hexagons, floating rounded pill cards with drop shadows, center dark ribbon banner and teacher signature line."
  },
  // 05. Hexagonal Mesh & Spec Checklist (Peripheral Interface inspired - Image 4)
  {
    id: "05_Hexagonal_Mesh_Spec",
    num: "05",
    name: "Hexagonal Mesh & Spec Checklist",
    nameBn: "পেরিফেরাল ইন্টারফেস ও হেক্স মেশ",
    style: "Color",
    theme: "hexagonal_hive",
    defaultType: "LAB REPORT",
    category: "lab",
    file: "Color/02_Lab_Report_Color.docx",
    layoutStyle: "hex_spec_badge",
    desc: "Full-page honeycomb mesh watermark, layered cyan/green hexagon badges, bulleted module checklist and golden engineering badge."
  },
  // 06. Modern Executive Wave
  {
    id: "06_Modern_Wave_Executive",
    num: "06",
    name: "Modern Executive Wave",
    nameBn: "মডার্ন এক্সিকিউটিভ ওয়েভ",
    style: "Color",
    theme: "modern_wave",
    defaultType: "PROJECT REPORT",
    category: "project",
    file: "Color/03_Project_Report_Color.docx",
    layoutStyle: "executive_wave",
    desc: "Dynamic flowing navy & cyan gradient ribbons down right margin with clean left-weighted modern corporate typography."
  },
  // 07. Prestige Arch Honors
  {
    id: "07_Prestige_Arch_Honors",
    num: "07",
    name: "Prestige Arch Honors",
    nameBn: "প্রেস্টিজ আর্চ ও রিবন অনার্স",
    style: "Color",
    theme: "prestige_arch",
    defaultType: "A THESIS ON",
    category: "thesis",
    file: "Color/05_Thesis_Dissertation_Color.docx",
    layoutStyle: "prestige_honors",
    desc: "Arched wave ribbons at top and bottom with gold accent strokes, formal serif degree invocation and elegant ornamental rules."
  },
  // 08. Minimalist Swiss Stripe
  {
    id: "08_Minimalist_Swiss_Sidebar",
    num: "08",
    name: "Minimalist Swiss Stripe",
    nameBn: "সুইস মিনিমালিস্ট স্ট্রাইপ",
    style: "Color",
    theme: "minimal_sidebar",
    defaultType: "ASSIGNMENT",
    category: "assignment",
    file: "Color/01_Assignment_Color.docx",
    layoutStyle: "swiss_minimal",
    desc: "Left vertical gradient accent stripe with rotated university title, zero framed boxes, pure clean sans-serif typography."
  },
  // 09. Cyber Circuit Developer Terminal
  {
    id: "09_Cyber_Circuit_Tech",
    num: "09",
    name: "Cyber Circuit Developer",
    nameBn: "সাইবার সার্কিট ডেভেলপার টার্মিনাল",
    style: "Color",
    theme: "cyber_circuit",
    defaultType: "LAB REPORT",
    category: "lab",
    file: "Color/02_Lab_Report_Color.docx",
    layoutStyle: "cyber_terminal",
    desc: "High-tech PCB circuit traces, terminal code syntax block with monospace typography and developer bracket tags [SUBMITTED_BY]."
  },
  // 10. Fluted Classical Column
  {
    id: "10_Fluted_Architectural_Column",
    num: "10",
    name: "Fluted Classical Column",
    nameBn: "ফ্লুটেড আর্কিটেকচারাল মোনোগ্রাফ",
    style: "Color",
    theme: "fluted_academic",
    defaultType: "TERM PAPER",
    category: "termpaper",
    file: "Color/04_Research_Term_Paper_Color.docx",
    layoutStyle: "classical_column",
    desc: "Classical ionic fluted columns on margins, formal Roman small-caps typography, ornamental academic research paper formatting."
  },
  // 11. Geometric Angular Tech
  {
    id: "11_Geometric_Angular_Tech",
    num: "11",
    name: "Geometric Angular Tech",
    nameBn: "জিওমেট্রিক অ্যাঙ্গুলার টেক",
    style: "Color",
    theme: "geometric_tech",
    defaultType: "RESEARCH PROPOSAL",
    category: "proposal",
    file: "Color/06_Research_Proposal_Color.docx",
    layoutStyle: "geometric_tech_layout",
    desc: "Sharp geometric polygon corners in navy & cyan with structured engineering proposal approval blocks."
  },
  // 12. Case Study Dual-Column Grid
  {
    id: "12_Case_Study_Grid",
    num: "12",
    name: "Case Study Dual-Column Grid",
    nameBn: "কেস স্টাডি অ্যানালিটিক্যাল গ্রিড",
    style: "Color",
    theme: "modern_wave",
    defaultType: "CASE STUDY",
    category: "casestudy",
    file: "Color/07_Case_Study_Color.docx",
    layoutStyle: "casestudy_analytical",
    desc: "Analytical corporate report layout with executive summary banner and dual-column problem & methodology blocks."
  },
  // 13. Seminar Presentation Keynote
  {
    id: "13_Seminar_Presentation",
    num: "13",
    name: "Seminar Presentation Keynote",
    nameBn: "সেমিনার কি-নোট ফরম্যাট",
    style: "Color",
    theme: "executive_crest",
    defaultType: "SEMINAR REPORT",
    category: "seminar",
    file: "Color/08_Seminar_Report_Color.docx",
    layoutStyle: "seminar_keynote",
    desc: "Speaker presentation title banner with faculty evaluation panel and audience attendee accreditation."
  },
  // 14. Internship Tripartite Supervisor
  {
    id: "14_Internship_Report",
    num: "14",
    name: "Internship Tripartite Supervisor",
    nameBn: "ইন্টার্নশিপ ট্রাইপার্টাইট ফরম্যাট",
    style: "Color",
    theme: "prestige_arch",
    defaultType: "INTERNSHIP REPORT",
    category: "internship",
    file: "Color/09_Internship_Report_Color.docx",
    layoutStyle: "internship_tripartite",
    desc: "Tripartite industrial attachment layout with student trainee, academic supervisor, and industry manager verification blocks."
  },
  // 15. Capstone Multi-Member Team
  {
    id: "15_Capstone_Project_Team",
    num: "15",
    name: "Capstone Multi-Member Team",
    nameBn: "ক্যাপস্টোন মাল্টি-মেম্বার টিম টেবিল",
    style: "Color",
    theme: "prestige_arch",
    defaultType: "FINAL YEAR DESIGN PROJECT",
    category: "capstone",
    file: "Color/10_Capstone_Final_Year_Project_Color.docx",
    layoutStyle: "team_capstone",
    desc: "4-member multi-student project team table with student IDs & roles, project supervision and defense committee approval block."
  },
  // 16. Monochrome Clean Laser B&W
  {
    id: "16_Monochrome_Laser_BW",
    num: "16",
    name: "Monochrome Clean Laser B&W",
    nameBn: "হাই-কনট্রাস্ট লেজার ফটোকপি B&W",
    style: "BW",
    theme: "classic",
    defaultType: "ASSIGNMENT",
    category: "assignment",
    file: "BW/01_Assignment_BW.docx",
    layoutStyle: "monochrome_laser",
    desc: "100% black line art with zero grayscale halftone blur, engineered specifically for 2-taka university photocopy/laser printing."
  },
];

export default function StudentToolsPage() {
  const { user, isAuthenticated } = useAuth();
  const { language, t } = useLanguage();

  // Active Tool Tab: 'cgpa' | 'tuition' | 'cover' | 'routine' | 'calendar' | 'sections'
  const [activeTab, setActiveTab] = useState<"cgpa" | "tuition" | "cover" | "certificate" | "routine" | "calendar" | "sections" | "advising">("cgpa");

  // Courses & Teachers for auto-suggest
  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [teachersList, setTeachersList] = useState<any[]>([]);

  useEffect(() => {
    api.courses.getAll().then(setCoursesList).catch(() => {});
    api.teachers.getAll().then(setTeachersList).catch(() => {});
  }, []);

  // =========================================================================
  // TOOL 1: SEU CGPA CALCULATOR STATE & LOGIC
  // =========================================================================
  const [courses, setCourses] = useState([
    { id: 1, credit: "", grade: "" },
    { id: 2, credit: "", grade: "" },
    { id: 3, credit: "", grade: "" },
    { id: 4, credit: "", grade: "" },
  ]);
  const [prevCredits, setPrevCredits] = useState("");
  const [prevCgpa, setPrevCgpa] = useState("");

  const [cgpaResult, setCgpaResult] = useState<{
    cgpa: number;
    totalCredits: number;
    totalPoints: number;
    cumulativeCgpa?: number;
    overallCredits?: number;
    prevCredits?: number;
    prevCgpa?: number;
    prevPoints?: number;
    overallPoints?: number;
    cgpaDiff?: number;
  } | null>(null);
  const [showGradingInfo, setShowGradingInfo] = useState(false);

  const addCourseRow = () => {
    setCourses([...courses, { id: Date.now(), credit: "", grade: "" }]);
  };

  const removeCourseRow = () => {
    if (courses.length > 1) {
      setCourses(courses.slice(0, -1));
    }
  };

  const resetCgpa = () => {
    setCourses([
      { id: 1, credit: "", grade: "" },
      { id: 2, credit: "", grade: "" },
      { id: 3, credit: "", grade: "" },
      { id: 4, credit: "", grade: "" },
    ]);
    setPrevCredits("");
    setPrevCgpa("");
    setCgpaResult(null);
    toast.info(language === "bn" ? "CGPA ক্যালকুলেটর রিসেট করা হয়েছে।" : "CGPA calculator reset.");
  };

  const calculateCgpa = () => {
    // 1. Validate previous credits & CGPA if entered
    const hasPrevCrInput = prevCredits.trim() !== "";
    const hasPrevCgpaInput = prevCgpa.trim() !== "";

    if (hasPrevCrInput && !hasPrevCgpaInput) {
      toast.error(
        language === "bn"
          ? "Cumulative CGPA হিসাব করতে পূর্বের মোট ক্রেডিটের সাথে পূর্বের CGPA-ও লিখুন।"
          : "Please also enter your previous CGPA to calculate cumulative CGPA."
      );
      return;
    }

    if (!hasPrevCrInput && hasPrevCgpaInput) {
      toast.error(
        language === "bn"
          ? "Cumulative CGPA হিসাব করতে পূর্বের CGPA-র সাথে পূর্বের সম্পন্ন মোট ক্রেডিটও লিখুন।"
          : "Please also enter your previous total credits to calculate cumulative CGPA."
      );
      return;
    }

    let pCr = 0;
    let pCgpa = 0;
    let hasPrevious = false;

    if (hasPrevCrInput && hasPrevCgpaInput) {
      pCr = parseFloat(prevCredits);
      pCgpa = parseFloat(prevCgpa);

      if (isNaN(pCr) || pCr <= 0 || pCr > 200) {
        toast.error(
          language === "bn"
            ? "পূর্বের মোট ক্রেডিট অবশ্যই ১ থেকে ২০০-এর মধ্যে একটি বৈধ সংখ্যা হতে হবে।"
            : "Previous total credits must be a valid number between 1 and 200."
        );
        return;
      }

      if (isNaN(pCgpa) || pCgpa < 0 || pCgpa > 4.0) {
        toast.error(
          language === "bn"
            ? "পূর্বের CGPA অবশ্যই 0.00 থেকে 4.00-এর মধ্যে হতে হবে।"
            : "Previous CGPA must be between 0.00 and 4.00."
        );
        return;
      }

      hasPrevious = true;
    }

    // 2. Validate current semester courses
    let semCredits = 0;
    let semPoints = 0;
    let validCourses = 0;

    courses.forEach((c) => {
      if (!c.credit || !c.grade) return;
      const cr = parseFloat(c.credit);
      const gr = parseFloat(c.grade);
      if (!isNaN(cr) && !isNaN(gr) && cr > 0) {
        semCredits += cr;
        semPoints += cr * gr;
        validCourses++;
      }
    });

    if (validCourses === 0 || semCredits === 0) {
      toast.error(
        language === "bn"
          ? "দয়া করে বর্তমান সেমিস্টারের কমপক্ষে একটি কোর্সের ক্রেডিট ও গ্রেড নির্বাচন করুন।"
          : "Please select credit and grade for at least one course."
      );
      return;
    }

    const currentCgpa = parseFloat((semPoints / semCredits).toFixed(2));
    let cumCgpa = undefined;
    let overallCr = undefined;
    let prevPts = undefined;
    let totPts = semPoints;
    let diff = undefined;

    if (hasPrevious) {
      prevPts = parseFloat((pCr * pCgpa).toFixed(2));
      overallCr = pCr + semCredits;
      totPts = parseFloat((prevPts + semPoints).toFixed(2));
      cumCgpa = parseFloat((totPts / overallCr).toFixed(2));
      diff = parseFloat((cumCgpa - pCgpa).toFixed(2));
    }

    setCgpaResult({
      cgpa: currentCgpa,
      totalCredits: semCredits,
      totalPoints: parseFloat(semPoints.toFixed(2)),
      cumulativeCgpa: cumCgpa,
      overallCredits: overallCr,
      prevCredits: hasPrevious ? pCr : undefined,
      prevCgpa: hasPrevious ? pCgpa : undefined,
      prevPoints: prevPts,
      overallPoints: parseFloat(totPts.toFixed(2)),
      cgpaDiff: diff,
    });

    toast.success(
      language === "bn"
        ? `CGPA হিসাব সম্পন্ন: ${cumCgpa !== undefined ? cumCgpa.toFixed(2) : currentCgpa.toFixed(2)}`
        : `CGPA Calculated: ${cumCgpa !== undefined ? cumCgpa.toFixed(2) : currentCgpa.toFixed(2)}`
    );

    try {
      confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } });
    } catch {}
  };

  // =========================================================================
  // TOOL 2: SEU TUITION FEE & WAIVER CALCULATOR STATE & LOGIC
  // =========================================================================
  const [perCreditFee, setPerCreditFee] = useState("");
  const [totalCredits, setTotalCredits] = useState("");
  const [labFee, setLabFee] = useState("");
  const [waiverPercent, setWaiverPercent] = useState("");
  const [tuitionResult, setTuitionResult] = useState<{
    originalTuition: number;
    discountAmount: number;
    netTuition: number;
    labFee: number;
    totalPayable: number;
    inst1: number;
    inst2: number;
    inst3: number;
  } | null>(null);

  const resetTuition = () => {
    setPerCreditFee("");
    setTotalCredits("");
    setLabFee("");
    setWaiverPercent("");
    setTuitionResult(null);
    toast.info(language === "bn" ? "টিউশন ফি ক্যালকুলেটর রিসেট করা হয়েছে।" : "Tuition fee calculator reset.");
  };

  const calculateTuition = () => {
    if (!perCreditFee.trim() || !totalCredits.trim()) {
      toast.error(
        language === "bn"
          ? "পার-ক্রেডিট ফি এবং মোট ক্রেডিট অবশ্যই পূরণ করতে হবে।"
          : "Please enter both Per Credit Fee and Total Credits."
      );
      return;
    }

    const feePerCr = parseFloat(perCreditFee);
    const cr = parseFloat(totalCredits);
    const lab = labFee.trim() ? parseFloat(labFee) : 0;
    const waiver = waiverPercent.trim() ? parseFloat(waiverPercent) : 0;

    if (isNaN(feePerCr) || feePerCr <= 0 || feePerCr > 50000) {
      toast.error(
        language === "bn"
          ? "পার-ক্রেডিট ফি অবশ্যই ১ থেকে ৫০,০০০ টাকার মধ্যে হতে হবে (যেমন: ৩৫৫০)।"
          : "Per Credit Fee must be between 1 and 50,000 BDT (e.g. 3550)."
      );
      return;
    }

    if (isNaN(cr) || cr <= 0 || cr > 35) {
      toast.error(
        language === "bn"
          ? "মোট ক্রেডিট অবশ্যই ১ থেকে ৩৫-এর মধ্যে হতে হবে।"
          : "Total Credits must be between 1 and 35."
      );
      return;
    }

    if (isNaN(lab) || lab < 0 || lab > 50000) {
      toast.error(
        language === "bn"
          ? "ল্যাব ফি ০ থেকে ৫০,০০০ টাকার মধ্যে হতে হবে।"
          : "Laboratory Fee must be between 0 and 50,000 BDT."
      );
      return;
    }

    if (isNaN(waiver) || waiver < 0 || waiver > 100) {
      toast.error(
        language === "bn"
          ? "ওয়েভারের শতকরা হার অবশ্যই ০% থেকে ১০০% এর মধ্যে হতে হবে।"
          : "Waiver percentage must be between 0% and 100%."
      );
      return;
    }

    const originalTuition = feePerCr * cr;
    const discountAmount = originalTuition * (waiver / 100);
    const netTuition = originalTuition - discountAmount;
    const totalPayable = netTuition + lab;

    // 40% + 30% + 30% Installment plan
    const inst1 = Math.round(totalPayable * 0.40);
    const inst2 = Math.round(totalPayable * 0.30);
    const inst3 = Math.round(totalPayable - (inst1 + inst2)); // exact balance

    setTuitionResult({
      originalTuition: Math.round(originalTuition),
      discountAmount: Math.round(discountAmount),
      netTuition: Math.round(netTuition),
      labFee: Math.round(lab),
      totalPayable: Math.round(totalPayable),
      inst1,
      inst2,
      inst3,
    });

    toast.success(
      language === "bn"
        ? `টিউশন ফি হিসাব সম্পন্ন! সর্বমোট প্রদেয়: ৳${Math.round(totalPayable).toLocaleString()}`
        : `Tuition Calculated! Total Payable: ৳${Math.round(totalPayable).toLocaleString()}`
    );
  };

  // =========================================================================
  // TOOL 3: SEU COVER PAGE MAKER STATE & LOGIC (20 OFFICIAL TEMPLATES)
  // =========================================================================
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("01_Classic_Academic_Color");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [coverDesignTheme, setCoverDesignTheme] = useState<"classic" | "modern_wave" | "prestige_arch" | "geometric_tech" | "minimal_sidebar" | "executive_crest" | "cyber_circuit" | "fluted_academic" | "hexagonal_hive" | "facet_prism">("classic");
  const [coverFilterStyle, setCoverFilterStyle] = useState<"all" | "Color" | "BW">("all");
  const [coverViewMode, setCoverViewMode] = useState<"gallery" | "editor">("gallery");
  const [coverCategoryFilter, setCoverCategoryFilter] = useState<string>("all");
  const [coverSearchQuery, setCoverSearchQuery] = useState<string>("");
  const [coverType, setCoverType] = useState<string>("Assignment");

  // Template-specific extra fields
  const [coverExpNo, setCoverExpNo] = useState("01");
  const [coverExpDate, setCoverExpDate] = useState("");
  const [coverResearchArea, setCoverResearchArea] = useState("");
  const [coverOrganization, setCoverOrganization] = useState("");
  const [coverInternRole, setCoverInternRole] = useState("");
  const [coverInternPeriod, setCoverInternPeriod] = useState("");
  const [coverIndustrySupervisor, setCoverIndustrySupervisor] = useState("");
  const [coverTeamMembers, setCoverTeamMembers] = useState<Array<{ name: string; id: string }>>([
    { name: user?.name || "Md Fazle Rabbi", id: user?.studentId || "2023200000686" },
    { name: "", id: "" },
    { name: "", id: "" }
  ]);

  const [coverCourseCode, setCoverCourseCode] = useState("");
  const [coverCourseTitle, setCoverCourseTitle] = useState("");
  const [coverSection, setCoverSection] = useState("");
  const [coverTopic, setCoverTopic] = useState("");

  // Dynamic Fluid Typography helper for Cover Page titles to prevent overflowing single-page A4
  const getCoverTopicFontSize = (text?: string, defaultClass: string = "text-xl sm:text-2xl") => {
    const len = text?.trim().length || 0;
    if (len > 140) return "text-xs sm:text-sm leading-snug";
    if (len > 80) return "text-sm sm:text-base leading-snug";
    if (len > 40) return "text-base sm:text-lg leading-tight";
    return defaultClass;
  };
  const [coverTeacherName, setCoverTeacherName] = useState("");
  const [coverTeacherInitial, setCoverTeacherInitial] = useState("");
  const [coverTeacherDesignation, setCoverTeacherDesignation] = useState("");
  const [coverStudentName, setCoverStudentName] = useState(user?.name || "");
  const [coverStudentID, setCoverStudentID] = useState(user?.studentId || "");
  const [coverSemester, setCoverSemester] = useState("");
  const [coverDepartment, setCoverDepartment] = useState("Department of Computer Science & Engineering");
  const [coverSubmissionDate, setCoverSubmissionDate] = useState("");
  const [rememberDetails, setRememberDetails] = useState(true);

  // Quick Select Course & Faculty Manual / Autocomplete Inputs
  const [quickCourseInput, setQuickCourseInput] = useState("");
  const [quickTeacherInput, setQuickTeacherInput] = useState("");

  const handleQuickCourseChange = (val: string) => {
    setQuickCourseInput(val);
    if (!val.trim()) return;

    // 1. Check if user typed combined Code.Section like CSE241.1 or CSE241.01
    const dotMatch = val.match(/^([A-Za-z]{2,5}\s*\d{3}[A-Za-z]?)\.(\d+)$/);
    if (dotMatch) {
      const rawCode = dotMatch[1].toUpperCase().replace(/\s+/, "");
      const sec = dotMatch[2];
      setCoverCourseCode(rawCode);
      setCoverSection(sec);
      const foundCourse = coursesList.find(c => c.code.toUpperCase().replace(/\s+/, "") === rawCode);
      if (foundCourse) {
        setCoverCourseTitle(foundCourse.title);
      }
      return;
    }

    // 2. Check exact course match from coursesList
    const matched = coursesList.find(c => 
      c.code.toUpperCase() === val.trim().toUpperCase() ||
      `${c.code} — ${c.title}`.toLowerCase() === val.trim().toLowerCase() ||
      c.title.toLowerCase() === val.trim().toLowerCase()
    );

    if (matched) {
      setCoverCourseCode(matched.code);
      setCoverCourseTitle(matched.title);
    } else {
      // 3. Check if input starts with a code like CSE241 or CSE 241
      const codeMatch = val.match(/^([A-Za-z]{2,5}\s*\d{3}[A-Za-z]?)(?:\s*[-—:]\s*(.*))?$/);
      if (codeMatch) {
        const parsedCode = codeMatch[1].toUpperCase().replace(/\s+/, "");
        setCoverCourseCode(parsedCode);
        if (codeMatch[2]) {
          setCoverCourseTitle(codeMatch[2].trim());
        } else {
          const found = coursesList.find(c => c.code.toUpperCase().replace(/\s+/, "") === parsedCode);
          if (found) {
            setCoverCourseTitle(found.title);
          }
        }
      } else {
        // Free manual input - set Course Title directly
        setCoverCourseTitle(val);
      }
    }
  };

  const handleQuickTeacherChange = (val: string) => {
    setQuickTeacherInput(val);
    if (!val.trim()) return;

    // 1. Check if matches one of teachersList
    const matched = teachersList.find(t => 
      t.name.toLowerCase() === val.trim().toLowerCase() ||
      (t.initial && t.initial.toLowerCase() === val.trim().toLowerCase()) ||
      `${t.name}${t.initial ? ` (${t.initial})` : ''} — ${t.designation || 'CSE'}`.toLowerCase() === val.trim().toLowerCase()
    );

    if (matched) {
      setCoverTeacherName(matched.name);
      setCoverTeacherInitial(matched.initial || "");
      setCoverTeacherDesignation(`${matched.designation || "Faculty Member"}, Department of Computer Science & Engineering`);
    } else {
      // 2. If user manually types "Teacher Name (INITIAL)" or "Teacher Name - Designation"
      const initMatch = val.match(/^(.*?)\s*\(([A-Za-z]+)\)(?:\s*[-—]\s*(.*))?$/);
      if (initMatch) {
        setCoverTeacherName(initMatch[1].trim());
        setCoverTeacherInitial(initMatch[2].trim().toUpperCase());
        if (initMatch[3]) {
          setCoverTeacherDesignation(initMatch[3].trim());
        } else if (!coverTeacherDesignation) {
          setCoverTeacherDesignation("Faculty Member, Department of Computer Science & Engineering");
        }
      } else {
        // Plain name
        const dashParts = val.split(/[-—]/);
        if (dashParts.length > 1) {
          setCoverTeacherName(dashParts[0].trim());
          setCoverTeacherDesignation(dashParts.slice(1).join(" - ").trim());
        } else {
          setCoverTeacherName(val);
          if (!coverTeacherDesignation) {
            setCoverTeacherDesignation("Faculty Member, Department of Computer Science & Engineering");
          }
        }
      }
    }
  };

  // Restore saved cover details from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("notelagbe_cover_details");
      if (saved) {
        try {
          const d = JSON.parse(saved);
          if (d.name) setCoverStudentName(d.name);
          if (d.studentId) setCoverStudentID(d.studentId);
          if (d.section) setCoverSection(d.section);
          if (d.semester) setCoverSemester(d.semester);
          if (d.department) setCoverDepartment(d.department);
        } catch {}
      }
    }
  }, []);

  const saveCoverDetailsLocally = () => {
    if (rememberDetails && typeof window !== "undefined") {
      localStorage.setItem("notelagbe_cover_details", JSON.stringify({
        name: coverStudentName,
        studentId: coverStudentID,
        section: coverSection,
        semester: coverSemester,
        department: coverDepartment,
      }));
      toast.success(language === "bn" ? "আপনার তথ্য এই ডিভাইসে সংরক্ষণ করা হয়েছে।" : "Your details remembered on this device.");
    }
  };

  // Helper to safely escape special characters for XML/OpenXML
  const escapeXml = (str: string) => {
    return (str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  // Helper to build 100% self-contained, zero-dependency A4 HTML document for Print & PDF
  const generateStandaloneCoverHtml = (previewHtml: string, docTitle: string, isColor: boolean, currentTheme: string) => {
    const primaryBorderColor = isColor ? "#1e3a8a" : "#000000";
    const origin = typeof window !== "undefined" ? window.location.origin : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${docTitle}</title>
  <base href="${origin}/" />
  <style>
    /* RESET & CORE PRINT SPECS */
    @page {
      size: 210mm 297mm;
      margin: 0mm !important;
    }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      box-sizing: border-box !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 210mm !important;
      height: 297mm !important;
      max-height: 297mm !important;
      background: #ffffff !important;
      color: #000000 !important;
      overflow: hidden !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
    }

    /* SCREEN PREVIEW WRAPPER */
    @media screen {
      body {
        background: #0f172a !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        min-height: 100vh !important;
        height: auto !important;
        overflow-y: auto !important;
        padding-bottom: 40px !important;
      }
      .screen-toolbar {
        position: sticky;
        top: 0;
        left: 0;
        right: 0;
        width: 100%;
        max-width: 900px;
        background: #1e293b;
        color: #f8fafc;
        padding: 12px 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-radius: 0 0 16px 16px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4);
        margin-bottom: 24px;
        z-index: 99999;
      }
      .toolbar-title {
        font-weight: 800;
        font-size: 14px;
        letter-spacing: 0.5px;
      }
      .toolbar-sub {
        font-size: 11px;
        color: #94a3b8;
      }
      .btn-print {
        background: linear-gradient(135deg, #2563eb, #4f46e5);
        color: #ffffff;
        border: none;
        padding: 9px 20px;
        border-radius: 10px;
        font-weight: 800;
        font-size: 13px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 12px rgba(37,99,235,0.4);
        transition: transform 0.15s ease;
      }
      .btn-print:hover { transform: scale(1.02); }
      .btn-close {
        background: #334155;
        color: #e2e8f0;
        border: none;
        padding: 9px 16px;
        border-radius: 10px;
        font-weight: 600;
        font-size: 12px;
        cursor: pointer;
        margin-left: 8px;
      }
      .print-a4-sheet {
        box-shadow: 0 10px 40px rgba(0,0,0,0.5) !important;
      }
    }

    @media print {
      .no-print { display: none !important; }
      body {
        background: #ffffff !important;
        width: 210mm !important;
        height: 297mm !important;
        max-height: 297mm !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .print-a4-sheet {
        box-shadow: none !important;
        margin: 0 !important;
        border-radius: 0 !important;
      }
    }

    /* STRICT A4 SHEET SPECIFICATION */
    .print-a4-sheet {
      width: 210mm !important;
      height: 297mm !important;
      max-height: 297mm !important;
      background: #ffffff !important;
      color: #000000 !important;
      margin: 0 auto !important;
      padding: ${currentTheme === "classic" ? "5mm" : "0mm"} !important;
      box-sizing: border-box !important;
      border: ${currentTheme === "classic" ? `3px solid ${primaryBorderColor}` : "none"} !important;
      position: relative !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      page-break-inside: avoid !important;
      page-break-after: avoid !important;
      break-after: avoid !important;
      overflow: hidden !important;
    }

    /* Inner Frame Container */
    .print-a4-sheet > div {
      width: 100% !important;
      height: 100% !important;
      min-height: 100% !important;
      max-height: 100% !important;
      padding: ${
        currentTheme === "classic"
          ? "10mm 10mm 8mm 10mm"
          : currentTheme === "modern_wave"
          ? "12mm 24mm 12mm 14mm"
          : currentTheme === "minimal_sidebar"
          ? "12mm 14mm 12mm 22mm"
          : currentTheme === "executive_crest"
          ? "14mm 14mm 12mm 16mm"
          : currentTheme === "cyber_circuit"
          ? "12mm 12mm 10mm 12mm"
          : currentTheme === "fluted_academic"
          ? "11mm 11mm 9mm 11mm"
          : currentTheme === "hexagonal_hive"
          ? "12mm 14mm 10mm 18mm"
          : currentTheme === "facet_prism"
          ? "12mm 14mm 10mm 20mm"
          : "14mm 14mm 12mm 14mm"
      } !important;
      border: ${currentTheme === "classic" ? `1.5px solid ${isColor ? "#1e3a8a99" : "#000000"}` : "none"} !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      box-sizing: border-box !important;
      position: relative !important;
    }
    .print-a4-sheet > div.p-0 {
      padding: 0 !important;
    }

    /* COMPLETE STANDALONE CSS UTILITIES (NO EXTERNAL CDN DEPENDENCY) */
    .font-sans { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important; }
    .font-serif { font-family: Georgia, Cambria, "Times New Roman", Times, serif !important; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important; }
    .font-black { font-weight: 900 !important; }
    .font-bold { font-weight: 700 !important; }
    .font-semibold { font-weight: 600 !important; }
    .font-normal { font-weight: 400 !important; }
    .uppercase { text-transform: uppercase !important; }
    .italic { font-style: italic !important; }
    .underline { text-decoration: underline !important; }
    .text-center { text-align: center !important; }
    .text-left { text-align: left !important; }
    .tracking-wide { letter-spacing: 0.025em !important; }
    .tracking-wider { letter-spacing: 0.05em !important; }
    .tracking-widest { letter-spacing: 0.1em !important; }
    .leading-snug { line-height: 1.375 !important; }
    .leading-relaxed { line-height: 1.625 !important; }

    .text-xs { font-size: 0.75rem !important; line-height: 1rem !important; }
    .text-sm { font-size: 0.875rem !important; line-height: 1.25rem !important; }
    .text-base { font-size: 1rem !important; line-height: 1.5rem !important; }
    .text-lg { font-size: 1.125rem !important; line-height: 1.75rem !important; }
    .text-xl { font-size: 1.25rem !important; line-height: 1.75rem !important; }
    .text-2xl { font-size: 1.5rem !important; line-height: 2rem !important; }
    .text-\\[9px\\] { font-size: 9px !important; }
    .text-\\[10px\\] { font-size: 10px !important; }
    .text-\\[11px\\] { font-size: 11px !important; }

    .text-black { color: #000000 !important; }
    .text-white { color: #ffffff !important; }
    .text-blue-900 { color: #1e3a8a !important; }
    .text-blue-950 { color: #172554 !important; }
    .text-slate-700 { color: #334155 !important; }
    .text-slate-800 { color: #1e293b !important; }
    .text-slate-900 { color: #0f172a !important; }
    .text-slate-950 { color: #020617 !important; }

    .bg-white { background-color: #ffffff !important; }
    .bg-blue-50\\/80 { background-color: rgba(239, 246, 255, 0.8) !important; }
    .bg-blue-50\\/70 { background-color: rgba(239, 246, 255, 0.7) !important; }
    .bg-blue-50\\/50 { background-color: rgba(239, 246, 255, 0.5) !important; }
    .bg-blue-50\\/40 { background-color: rgba(239, 246, 255, 0.4) !important; }
    .bg-blue-50\\/30 { background-color: rgba(239, 246, 255, 0.3) !important; }
    .bg-blue-50\\/20 { background-color: rgba(239, 246, 255, 0.2) !important; }
    .bg-blue-50\\/10 { background-color: rgba(239, 246, 255, 0.1) !important; }
    .bg-slate-50\\/50 { background-color: rgba(248, 250, 252, 0.5) !important; }
    .bg-slate-50\\/30 { background-color: rgba(248, 250, 252, 0.3) !important; }
    .bg-slate-100 { background-color: #f1f5f9 !important; }

    .border { border: 1.5px solid ${primaryBorderColor} !important; }
    .border-2 { border: 2px solid ${primaryBorderColor} !important; }
    .border-b { border-bottom: 1.5px solid ${primaryBorderColor} !important; }
    .border-t { border-top: 1.5px solid ${primaryBorderColor} !important; }
    .border-r { border-right: 1.5px solid ${primaryBorderColor} !important; }
    .border-y-2 { border-top: 2px solid ${primaryBorderColor} !important; border-bottom: 2px solid ${primaryBorderColor} !important; }
    .border-blue-900 { border-color: #1e3a8a !important; }
    .border-blue-800 { border-color: #1e40af !important; }
    .border-black { border-color: #000000 !important; }
    .rounded-full { border-radius: 9999px !important; }
    .rounded-lg { border-radius: 0.5rem !important; }
    .rounded-2xl { border-radius: 1rem !important; }

    .flex { display: flex !important; }
    .flex-col { flex-direction: column !important; }
    .flex-1 { flex: 1 1 0% !important; }
    .items-center { align-items: center !important; }
    .justify-center { justify-content: center !important; }
    .justify-between { justify-content: space-between !important; }
    .grid { display: grid !important; }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
    .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
    .grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)) !important; }
    .col-span-2 { grid-column: span 2 / span 2 !important; }
    .col-span-4 { grid-column: span 4 / span 4 !important; }
    .col-span-6 { grid-column: span 6 / span 6 !important; }
    .col-span-8 { grid-column: span 8 / span 8 !important; }
    .gap-2 { gap: 0.5rem !important; }
    .gap-4 { gap: 1rem !important; }

    .space-y-1\\.5 > * + * { margin-top: 0.375rem !important; }
    .space-y-2 > * + * { margin-top: 0.5rem !important; }
    .space-y-3 > * + * { margin-top: 0.75rem !important; }
    .space-y-4 > * + * { margin-top: 1rem !important; }
    .space-y-6 > * + * { margin-top: 1.25rem !important; }

    .relative { position: relative !important; }
    .absolute { position: absolute !important; }
    .inset-0 { top: 0 !important; right: 0 !important; bottom: 0 !important; left: 0 !important; }
    .inset-x-0 { left: 0 !important; right: 0 !important; }
    .inset-y-0 { top: 0 !important; bottom: 0 !important; }
    .top-0 { top: 0 !important; }
    .bottom-0 { bottom: 0 !important; }
    .left-0 { left: 0 !important; }
    .right-0 { right: 0 !important; }
    .z-0 { z-index: 0 !important; }
    .z-10 { z-index: 10 !important; }
    .overflow-hidden { overflow: hidden !important; }
    .pointer-events-none { pointer-events: none !important; }

    .w-full { width: 100% !important; }
    .h-full { height: 100% !important; }
    .w-24 { width: 6rem !important; }
    .h-24 { height: 6rem !important; }
    .w-28 { width: 7rem !important; }
    .h-28 { height: 7rem !important; }
    .w-72 { width: 18rem !important; }
    .h-72 { height: 18rem !important; }
    .w-80 { width: 20rem !important; }
    .h-80 { height: 20rem !important; }
    .max-w-lg { max-width: 32rem !important; }
    .max-w-md { max-width: 28rem !important; }
    .max-w-sm { max-width: 24rem !important; }
    .mx-auto { margin-left: auto !important; margin-right: auto !important; }
    .my-auto { margin-top: auto !important; margin-bottom: auto !important; }
    .inline-block { display: inline-block !important; }
    .block { display: block !important; }
    .object-contain { object-fit: contain !important; }
    .opacity-\\[0\\.05\\] { opacity: 0.05 !important; }
    .p-1\\.5 { padding: 0.375rem !important; }
    .p-2 { padding: 0.5rem !important; }
    .p-2\\.5 { padding: 0.625rem !important; }
    .p-3 { padding: 0.75rem !important; }
    .p-3\\.5 { padding: 0.875rem !important; }
    .p-4 { padding: 1rem !important; }
    .px-6 { padding-left: 1.5rem !important; padding-right: 1.5rem !important; }
    .px-8 { padding-left: 2rem !important; padding-right: 2rem !important; }
    .px-10 { padding-left: 2.5rem !important; padding-right: 2.5rem !important; }
    .py-1 { padding-top: 0.25rem !important; padding-bottom: 0.25rem !important; }
    .py-1\\.5 { padding-top: 0.375rem !important; padding-bottom: 0.375rem !important; }
    .py-2 { padding-top: 0.5rem !important; padding-bottom: 0.5rem !important; }
    .py-4 { padding-top: 1rem !important; padding-bottom: 1rem !important; }
    .pt-2 { padding-top: 0.5rem !important; }
    .mb-1 { margin-bottom: 0.25rem !important; }
    .mb-1\\.5 { margin-bottom: 0.375rem !important; }
    .mb-2 { margin-bottom: 0.5rem !important; }
    .mt-0\\.5 { margin-top: 0.125rem !important; }
    .mt-1 { margin-top: 0.25rem !important; }
    .mt-2 { margin-top: 0.5rem !important; }

    /* EXTENDED HIGH-FIDELITY COVER PAGE UTILITIES */
    .text-3xl { font-size: 1.875rem !important; line-height: 2.25rem !important; }
    .text-4xl { font-size: 2.25rem !important; line-height: 2.5rem !important; }
    .text-5xl { font-size: 3rem !important; line-height: 1 !important; }
    .leading-none { line-height: 1 !important; }
    .tracking-tight { letter-spacing: -0.025em !important; }

    .text-amber-500 { color: #f59e0b !important; }
    .text-amber-700 { color: #b45309 !important; }
    .text-amber-800 { color: #92400e !important; }
    .text-amber-900 { color: #78350f !important; }
    .text-amber-950 { color: #451a03 !important; }
    .bg-amber-100 { background-color: #fef3c7 !important; }
    .bg-amber-400 { background-color: #fbbf24 !important; }
    .bg-amber-600 { background-color: #d97706 !important; }
    .border-amber-200 { border-color: #fde68a !important; }
    .border-amber-300 { border-color: #fcd34d !important; }
    .border-amber-500 { border-color: #f59e0b !important; }
    .border-amber-600 { border-color: #d97706 !important; }
    .border-amber-600\/70 { border-color: rgba(217, 119, 6, 0.7) !important; }

    .text-emerald-700 { color: #047857 !important; }
    .text-emerald-800 { color: #065f46 !important; }
    .text-emerald-900 { color: #064e3b !important; }
    .text-emerald-950 { color: #022c22 !important; }
    .bg-emerald-50 { background-color: #ecfdf5 !important; }
    .bg-emerald-800 { background-color: #065f46 !important; }
    .border-emerald-100 { border-color: #d1fae5 !important; }
    .border-emerald-600 { border-color: #059669 !important; }
    .border-emerald-700 { border-color: #047857 !important; }
    .border-emerald-800 { border-color: #065f46 !important; }

    .text-cyan-700 { color: #0e7490 !important; }
    .text-cyan-800 { color: #155e75 !important; }
    .text-cyan-900 { color: #164e63 !important; }
    .text-cyan-950 { color: #083344 !important; }
    .bg-cyan-700 { background-color: #0e7490 !important; }
    .border-cyan-200 { border-color: #a5f3fc !important; }
    .border-cyan-300 { border-color: #67e8f9 !important; }
    .border-cyan-700 { border-color: #0e7490 !important; }
    .border-cyan-800\/40 { border-color: rgba(21, 94, 117, 0.4) !important; }

    .w-\[30\%\] { width: 30% !important; }
    .w-8 { width: 2rem !important; } .h-8 { height: 2rem !important; }
    .w-12 { width: 3rem !important; } .h-12 { height: 3rem !important; }
    .w-14 { width: 3.5rem !important; } .h-14 { height: 3.5rem !important; }
    .w-16 { width: 4rem !important; } .h-16 { height: 4rem !important; }
    .h-0\.5 { height: 2px !important; }
    .h-1 { height: 0.25rem !important; }
    .pl-\[33\%\] { padding-left: 33% !important; }
    .pl-4 { padding-left: 1rem !important; }
    .pl-8 { padding-left: 2rem !important; }
    .pr-6 { padding-right: 1.5rem !important; }
    .py-6 { padding-top: 1.5rem !important; padding-bottom: 1.5rem !important; }
    .p-6 { padding: 1.5rem !important; }
    .p-8 { padding: 2rem !important; }
    .ml-auto { margin-left: auto !important; }
    .shadow-xs { box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05) !important; }
    .shadow-sm { box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1) !important; }
    .shadow-md { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1) !important; }
    .shadow-xl { box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1) !important; }
    .bg-\[\#1e293b\] { background-color: #1e293b !important; }
    .rounded-sm { border-radius: 0.125rem !important; }
    .rounded-xl { border-radius: 0.75rem !important; }
    .rounded-2xl { border-radius: 1rem !important; }
    .shrink-0 { flex-shrink: 0 !important; }
    .max-w-xs { max-width: 20rem !important; }
  </style>
</head>
<body>
  <!-- Floating Screen Toolbar -->
  <div class="no-print screen-toolbar">
    <div>
      <div class="toolbar-title">📄 SOUTHEAST UNIVERSITY • 1-PAGE A4 COVER</div>
      <div class="toolbar-sub">Standard A4 (210 × 297 mm) • Save as PDF or Print</div>
    </div>
    <div>
      <button onclick="window.print()" class="btn-print">
        <span>🖨️</span> <span>Print / Save as PDF</span>
      </button>
      <button onclick="window.close()" class="btn-close">
        ✕ Close
      </button>
    </div>
  </div>

  <!-- Pure 1-Page A4 Sheet -->
  <div class="print-a4-sheet">
    ${previewHtml}
  </div>

  <script>
    // Guarantee fonts and images are fully decoded before triggering print dialog
    window.addEventListener('load', async function() {
      try {
        const imgs = Array.from(document.images);
        await Promise.all(imgs.map(function(img) {
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return new Promise(function(resolve) {
            img.onload = resolve;
            img.onerror = resolve;
            setTimeout(resolve, 800);
          });
        }));
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }
      } catch(e) {}
      setTimeout(function() {
        try { window.print(); } catch(e) {}
      }, 500);
    });
  </script>
</body>
</html>`;
  };

  // DIRECT HIGH-QUALITY A4 PDF GENERATION & DOWNLOAD (Zero popups, 100% crash-proof, works on mobile & desktop)
  const handleDirectPdfDownload = async () => {
    saveCoverDetailsLocally();

    const previewEl = document.getElementById("seu-cover-preview");
    if (!previewEl) {
      toast.error(language === "bn" ? "কভার পেজ প্রিভিউ পাওয়া যায়নি।" : "Could not find cover preview element.");
      return;
    }

    const activeTpl = SEU_20_TEMPLATES.find(t => t.id === selectedTemplateId) || SEU_20_TEMPLATES[0];
    const cleanCourse = (coverCourseCode || "SEU").replace(/[^a-zA-Z0-9_-]/g, "_");
    const cleanId = (coverStudentID || "").replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `SEU_${activeTpl.num}_${cleanCourse}_Cover${cleanId ? "_" + cleanId : ""}.pdf`;

    setIsGeneratingPdf(true);
    const toastId = toast.loading(
      language === "bn"
        ? "হাই-কোয়ালিটি A4 PDF প্রস্তুত হচ্ছে... অনুগ্রহ করে এক মুহূর্ত অপেক্ষা করুন।"
        : "Generating high-quality A4 PDF... Please wait a moment."
    );

    try {
      // Dynamic imports for optimal bundle size and zero SSR risk
      const { toJpeg } = await import("html-to-image");
      const { jsPDF } = await import("jspdf");

      // Ensure all preview images are loaded
      const imgs = Array.from(previewEl.querySelectorAll("img"));
      await Promise.all(
        imgs.map((img) => {
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
            setTimeout(resolve, 800);
          });
        })
      );

      // Render with html-to-image (uses native browser rendering engine - 100% supports modern Tailwind v4 lab/oklch colors)
      const imgData = await toJpeg(previewEl, {
        quality: 0.98,
        pixelRatio: 2.2,
        backgroundColor: "#ffffff",
        style: {
          borderRadius: "0px",
          boxShadow: "none",
          margin: "0 auto",
        },
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      // A4 is 210mm x 297mm
      pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
      pdf.save(fileName);

      toast.dismiss(toastId);
      toast.success(
        language === "bn"
          ? "✅ A4 PDF ফাইল সফলভাবে ডাউনলোড হয়েছে!"
          : "✅ A4 PDF downloaded successfully!"
      );

      try {
        confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
      } catch {}
    } catch (err: any) {
      console.error("Direct PDF generation error:", err);
      toast.dismiss(toastId);
      toast.error(
        language === "bn"
          ? "PDF তৈরিতে সমস্যা হয়েছে। বিকল্প 'প্রিন্ট ভিউ (A4)' বাটন ব্যবহার করতে পারেন।"
          : "Failed to generate PDF. You can try the 'Print A4' button."
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Safe Browser Print View using standard Blob URL (Strictly 1 page, zero CDN dependency, zero tab crashes)
  const handlePrintCoverPage = () => {
    saveCoverDetailsLocally();

    const previewEl = document.getElementById("seu-cover-preview");
    if (!previewEl) {
      toast.error(language === "bn" ? "কভার পেজ প্রিভিউ পাওয়া যায়নি।" : "Could not find cover preview element.");
      return;
    }

    const activeTpl = SEU_20_TEMPLATES.find(t => t.id === selectedTemplateId) || SEU_20_TEMPLATES[0];
    const isColor = activeTpl.style === "Color";
    const currentTheme = coverDesignTheme || activeTpl.theme || "classic";

    const cleanCourse = (coverCourseCode || "SEU").replace(/[^a-zA-Z0-9_-]/g, "_");
    const cleanId = (coverStudentID || "").replace(/[^a-zA-Z0-9_-]/g, "_");
    const docTitle = `SEU_${cleanCourse}_Cover_Page${cleanId ? "_" + cleanId : ""}`;

    const htmlContent = generateStandaloneCoverHtml(previewEl.innerHTML, docTitle, isColor, currentTheme);

    try {
      const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
      const blobUrl = URL.createObjectURL(blob);
      const printWindow = window.open(blobUrl, "_blank");

      if (!printWindow) {
        toast.info(
          language === "bn"
            ? "ব্রাউজার পপআপ ব্লক করেছে। অনুগ্রহ করে সরাসরি 'Download PDF' বাটন দিয়ে ফাইল ডাউনলোড করুন।"
            : "Browser popup was blocked. Please click the direct 'Download PDF' button above."
        );
      } else {
        toast.info(
          language === "bn"
            ? "প্রিন্ট উইন্ডো প্রস্তুত হচ্ছে... 'Save as PDF' সিলেক্ট করে 1-পেজ A4 সেভ করুন।"
            : "Print window opened. Select 'Save as PDF' to save your 1-page A4 cover.",
          { duration: 4000 }
        );
      }
    } catch (err) {
      console.error("Print window error:", err);
      toast.error(
        language === "bn"
          ? "প্রিন্ট উইন্ডো খুলতে সমস্যা হয়েছে। অনুগ্রহ করে সরাসরি 'Download PDF' বাটন ব্যবহার করুন।"
          : "Could not open print window. Please use the direct 'Download PDF' button."
      );
    }
  };

  // Customized Native Microsoft Word (.docx) Generation using JSZip
  const handleDownloadDocFile = async () => {
    saveCoverDetailsLocally();
    const activeTpl = SEU_20_TEMPLATES.find(t => t.id === selectedTemplateId) || SEU_20_TEMPLATES[0];

    const cleanCourse = (coverCourseCode || "SEU").replace(/[^a-zA-Z0-9_-]/g, "_");
    const cleanId = (coverStudentID || "").replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `SEU_${activeTpl.id}_${cleanCourse}${cleanId ? "_" + cleanId : ""}.docx`;

    try {
      toast.info(language === "bn" ? "কাস্টমাইজড Word (.docx) A4 ফাইল তৈরি হচ্ছে..." : "Preparing customized Word (.docx) A4 file...");
      
      // Fetch the authentic SEU template docx
      const res = await fetch(`/cover_templates/${activeTpl.file}`);
      if (!res.ok) {
        throw new Error(`Failed to load template file: ${res.statusText}`);
      }
      const arrayBuffer = await res.arrayBuffer();

      // Load with JSZip
      const zip = await JSZip.loadAsync(arrayBuffer);

      // Read word/document.xml
      const docXmlFile = zip.file("word/document.xml");
      if (!docXmlFile) {
        throw new Error("Invalid docx: word/document.xml not found");
      }

      let xml = await docXmlFile.async("text");

      // Escaped values from user inputs
      const studentName = escapeXml(coverStudentName || "Md Fazle Rabbi");
      const studentId = escapeXml(coverStudentID || "2023200000686");
      const semester = escapeXml(coverSemester || "Fall 2026");
      const section = escapeXml(coverSection || "8");
      const department = escapeXml(coverDepartment || "Department of Computer Science & Engineering");
      const teacherName = escapeXml(coverTeacherName ? `${coverTeacherName}${coverTeacherInitial ? ` (${coverTeacherInitial})` : ""}` : "Md. Nahid Anam Opu");
      const teacherDesig = escapeXml(coverTeacherDesignation || "Lecturer, Department of Computer Science & Engineering");
      const courseTitle = escapeXml(coverCourseTitle || "Operating Systems");
      const courseCode = escapeXml(coverCourseCode || "CSE362");
      const subDate = escapeXml(coverSubmissionDate || "21.09.2026");
      const topic = escapeXml(coverTopic || "[Topic of the Assignment]");
      const expNo = escapeXml(coverExpNo || "01");
      const expDate = escapeXml(coverExpDate || "14.09.2026");

      // Robust replacements across both plain and entity-encoded templates
      xml = xml.replaceAll("Lecturer, Department of Computer Science &amp; Engineering", teacherDesig);
      xml = xml.replaceAll("Lecturer, Department of Computer Science & Engineering", teacherDesig);
      xml = xml.replaceAll("Department of Computer Science &amp; Engineering", department);
      xml = xml.replaceAll("Department of Computer Science & Engineering", department);
      xml = xml.replaceAll("Md. Nahid Anam Opu", teacherName);
      xml = xml.replaceAll("Md Fazle Rabbi", studentName);
      xml = xml.replaceAll("2023200000686", studentId);
      xml = xml.replaceAll("Operating Systems", courseTitle);
      xml = xml.replaceAll("CSE362", courseCode);
      xml = xml.replaceAll("21.09.2026", subDate);
      xml = xml.replaceAll("DD.MM.YYYY", subDate);
      xml = xml.replaceAll("DD Month YYYY", subDate);

      // Category-specific placeholders
      if (activeTpl.category === "assignment") {
        xml = xml.replaceAll("[Topic of the Assignment]", topic);
      } else if (activeTpl.category === "lab") {
        xml = xml.replaceAll("[01]", expNo);
        xml = xml.replaceAll("[Name of the Experiment]", topic);
        if (coverExpDate) {
          xml = xml.replace("DD.MM.YYYY", expDate);
        }
      } else if (activeTpl.category === "project") {
        xml = xml.replaceAll("[Title of the Project]", topic);
      } else if (activeTpl.category === "termpaper") {
        xml = xml.replaceAll("[Title of the Research Paper]", topic);
        xml = xml.replaceAll("[Optional subtitle describing the study]", "");
      } else if (activeTpl.category === "thesis") {
        xml = xml.replaceAll("[TITLE OF THE THESIS IN CAPITAL LETTERS]", topic.toUpperCase());
        xml = xml.replaceAll("[Month, Year]", subDate);
      } else if (activeTpl.category === "proposal") {
        xml = xml.replaceAll("[Title of the Proposed Research]", topic);
        xml = xml.replaceAll("[Area / Domain]", escapeXml(coverResearchArea || "Artificial Intelligence & Data Mining"));
      } else if (activeTpl.category === "casestudy") {
        xml = xml.replaceAll("[Title / Subject of the Case Study]", topic);
      } else if (activeTpl.category === "seminar") {
        xml = xml.replaceAll("[Title of the Seminar Topic]", topic);
      } else if (activeTpl.category === "internship") {
        xml = xml.replaceAll("[Organization / Company Name]", escapeXml(coverOrganization || "[Organization / Company Name]"));
        xml = xml.replaceAll("[Intern Role]", escapeXml(coverInternRole || "Software Engineer Intern"));
        xml = xml.replaceAll("[Supervisor Name]", escapeXml(coverIndustrySupervisor || "[Industry Supervisor]"));
      } else if (activeTpl.category === "capstone") {
        xml = xml.replaceAll("[Title of the Project]", topic);
        if (coverTeamMembers[1]?.name) xml = xml.replaceAll("[Team Member 2]", escapeXml(coverTeamMembers[1].name));
        if (coverTeamMembers[1]?.id) xml = xml.replaceAll("[ID]", escapeXml(coverTeamMembers[1].id));
        if (coverTeamMembers[2]?.name) xml = xml.replaceAll("[Team Member 3]", escapeXml(coverTeamMembers[2].name));
      }

      // Save modified xml back into zip
      zip.file("word/document.xml", xml);

      // Generate new native DOCX Blob
      const modifiedBlob = await zip.generateAsync({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      // Trigger download
      const url = URL.createObjectURL(modifiedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(
        language === "bn"
          ? "কাস্টমাইজড Word (.docx) ফাইল সফলভাবে ডাউনলোড হয়েছে!"
          : "Customized Word (.docx) file downloaded successfully!"
      );
    } catch (err: any) {
      console.error("Docx generation error:", err);
      toast.error(
        language === "bn"
          ? `Word ফাইল তৈরিতে সমস্যা হয়েছে: ${err.message || "অনুগ্রহ করে আবার চেষ্টা করুন"}`
          : `Failed to generate Word file: ${err.message || "Please try again"}`
      );
    }
  };

  // Word (.doc with Exact Theme): Exports an authentic Microsoft Word document preserving the selected theme and layout
  const handleDownloadWordDocExactTheme = () => {
    saveCoverDetailsLocally();
    const activeTpl = SEU_20_TEMPLATES.find(t => t.id === selectedTemplateId) || SEU_20_TEMPLATES[0];
    const isColor = activeTpl.style === "Color";
    const primaryBorderColor = isColor ? "#1e3a8a" : "#000000";
    const cleanCourse = (coverCourseCode || "SEU").replace(/[^a-zA-Z0-9_-]/g, "_");
    const cleanId = (coverStudentID || "").replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `SEU_${activeTpl.id}_Theme_${cleanCourse}${cleanId ? "_" + cleanId : ""}.doc`;

    const studentName = coverStudentName || "Md Fazle Rabbi";
    const studentId = coverStudentID || "2023200000686";
    const semester = coverSemester || "Fall 2026";
    const section = coverSection || "8";
    const department = coverDepartment || "Department of Computer Science & Engineering";
    const teacherName = coverTeacherName ? `${coverTeacherName}${coverTeacherInitial ? ` (${coverTeacherInitial})` : ""}` : "Md. Nahid Anam Opu";
    const teacherDesig = coverTeacherDesignation || "Lecturer";
    const courseTitle = coverCourseTitle || "Operating Systems";
    const courseCode = coverCourseCode || "CSE362";
    const subDate = coverSubmissionDate || "21.09.2026";
    const topic = coverTopic || "[Topic of the Assignment]";
    const expNo = coverExpNo || "01";
    const expDate = coverExpDate || "14.09.2026";

    const wordHtml = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: 210mm 297mm;
      margin: 15mm 15mm 15mm 15mm;
      mso-header-margin: 0mm;
      mso-footer-margin: 0mm;
    }
    div.Section1 { page: Section1; }
    body {
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: #000;
      background: #fff;
    }
    .main-border-box {
      border: 3px double ${primaryBorderColor};
      padding: 24px;
      min-height: 250mm;
      box-sizing: border-box;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 12px 0;
    }
    th, td {
      border: 1px solid ${primaryBorderColor};
      padding: 8px 12px;
      font-size: 11pt;
    }
    .header-table {
      border: none;
      margin-bottom: 24px;
    }
    .header-table td {
      border: none;
      text-align: center;
      padding: 4px;
    }
    .uni-name {
      font-size: 20pt;
      font-weight: bold;
      color: ${isColor ? '#1e3a8a' : '#000000'};
      letter-spacing: 1px;
    }
    .dept-name {
      font-size: 12pt;
      font-weight: bold;
      color: #333333;
    }
    .badge-box {
      border: 2px solid ${primaryBorderColor};
      background-color: ${isColor ? '#eff6ff' : '#f8fafc'};
      color: ${isColor ? '#1e3a8a' : '#000000'};
      padding: 8px 24px;
      font-size: 13pt;
      font-weight: bold;
      text-align: center;
      display: inline-block;
      margin: 12px auto;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .topic-box {
      border: 1px solid ${primaryBorderColor};
      background-color: ${isColor ? '#f8fafc' : '#ffffff'};
      padding: 10px 16px;
      margin: 12px 0;
      font-size: 11pt;
      text-align: center;
    }
    .info-table td {
      background-color: #ffffff;
    }
    .info-table .label-col {
      width: 32%;
      font-weight: bold;
      background-color: ${isColor ? '#eff6ff' : '#f1f5f9'};
      color: ${isColor ? '#1e3a8a' : '#000000'};
    }
    .split-table {
      border: none;
      margin-top: 24px;
    }
    .split-table td {
      vertical-align: top;
      width: 48%;
      padding: 14px;
      border: 1.5px solid ${primaryBorderColor};
      background-color: ${isColor ? '#f8fafc' : '#ffffff'};
    }
    .split-title {
      font-weight: bold;
      text-transform: uppercase;
      font-size: 11pt;
      margin-bottom: 8px;
      text-decoration: underline;
      color: ${isColor ? '#1e3a8a' : '#000000'};
      letter-spacing: 0.5px;
    }
    .date-pill {
      border: 1px solid ${primaryBorderColor};
      background-color: ${isColor ? '#eff6ff' : '#f1f5f9'};
      color: ${isColor ? '#1e3a8a' : '#000000'};
      padding: 6px 18px;
      border-radius: 12px;
      display: inline-block;
      font-weight: bold;
      font-size: 10pt;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="Section1">
    <div class="main-border-box">
      <!-- Top University Header -->
      <table class="header-table">
        <tr>
          <td>
            <div class="uni-name">SOUTHEAST UNIVERSITY</div>
            <div class="dept-name">Department of Computer Science and Engineering</div>
          </td>
        </tr>
      </table>

      <!-- Document Badge -->
      <div style="text-align: center;">
        <div class="badge-box">${escapeXml(coverType || activeTpl.defaultType)}</div>
      </div>

      <!-- Topic Section -->
      <div class="topic-box">
        <b>${activeTpl.category === "lab" ? "EXPERIMENT NAME: " : activeTpl.category === "project" ? "PROJECT TITLE: " : "ASSIGNMENT TOPIC: "}</b>
        <span>${escapeXml(topic)}</span>
      </div>

      <!-- Course & Schedule Info Table -->
      <table class="info-table">
        <tr>
          <td class="label-col">Course Name:</td>
          <td><b>${escapeXml(courseTitle)}</b></td>
        </tr>
        <tr>
          <td class="label-col">Course Code:</td>
          <td><b>${escapeXml(courseCode)}</b></td>
        </tr>
        <tr>
          <td class="label-col">Section:</td>
          <td><b>${escapeXml(section)}</b></td>
        </tr>
        ${activeTpl.category === "lab" ? `
        <tr>
          <td class="label-col">Experiment No:</td>
          <td><b>${escapeXml(expNo)}</b> (Date: ${escapeXml(expDate)})</td>
        </tr>` : ""}
        <tr>
          <td class="label-col">Date of Submission:</td>
          <td><b>${escapeXml(subDate)}</b></td>
        </tr>
      </table>

      <!-- Submitted By & Submitted To Side-by-Side Table -->
      <table class="split-table">
        <tr>
          <td>
            <div class="split-title">Submitted By</div>
            <p style="margin: 4px 0;"><b>Name:</b> ${escapeXml(studentName)}</p>
            <p style="margin: 4px 0;"><b>Student ID:</b> ${escapeXml(studentId)}</p>
            <p style="margin: 4px 0;"><b>Semester:</b> ${escapeXml(semester)}</p>
            <p style="margin: 4px 0;"><b>Section:</b> ${escapeXml(section)}</p>
            <p style="margin: 4px 0;"><b>Department:</b> ${escapeXml(department)}</p>
            <p style="margin: 4px 0;"><b>University:</b> Southeast University</p>
          </td>
          <td>
            <div class="split-title">Submitted To</div>
            <p style="margin: 4px 0;"><b>Name:</b> ${escapeXml(teacherName)}</p>
            <p style="margin: 4px 0;"><b>Designation:</b> ${escapeXml(teacherDesig)}</p>
            <p style="margin: 4px 0;"><b>Department:</b> Dept. of Computer Science & Engineering</p>
            <p style="margin: 4px 0;"><b>University:</b> Southeast University</p>
          </td>
        </tr>
      </table>

      <!-- Bottom Submission Date Pill (Only for thesis or termpaper where table is omitted) -->
      ${(activeTpl.category === "thesis" || activeTpl.category === "termpaper") ? `
      <div style="text-align: center;">
        <div class="date-pill">Date of Submission: ${escapeXml(subDate)}</div>
      </div>` : ""}
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob(["\ufeff", wordHtml], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(
      language === "bn"
        ? "Word (.doc) ফাইল সফলভাবে ডাউনলোড হয়েছে!"
        : "Word (.doc) file downloaded successfully!"
    );
  };

  const handleDownloadGoogleDocs = () => {
    handleDownloadDocFile();
    toast.info(
      language === "bn"
        ? "ডাউনলোড হওয়া ফাইলটি Google Drive-এ আপলোড করে 'Open with Google Docs' দিয়ে এডিট করতে পারবেন।"
        : "Upload the downloaded file to Google Drive to edit directly with Google Docs.",
      { duration: 5000 }
    );
  };

  // =========================================================================
  // TOOL 4: SEU SMART ROUTINE BUILDER STATE & LOGIC (8 AM - 8 PM Timeline Grid)
  // =========================================================================
  const [routineEntries, setRoutineEntries] = useState<any[]>([]);
  const [courseCodeAndSec, setCourseCodeAndSec] = useState("");
  const [newDaySlot, setNewDaySlot] = useState("Sunday - Tuesday");
  const [newTime, setNewTime] = useState("08:30-09:50");
  const [newRoom, setNewRoom] = useState("");
  const [newTeacher, setNewTeacher] = useState("");
  const [routineTimeFormat, setRoutineTimeFormat] = useState<"12h" | "24h">("12h");
  const [routineColorTheme, setRoutineColorTheme] = useState<"navy" | "orange" | "pink" | "emerald" | "purple" | "daylight">("navy");

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("noteLagbe_routine_color_theme");
      if (savedTheme && ["navy", "orange", "pink", "emerald", "purple", "daylight"].includes(savedTheme)) {
        setRoutineColorTheme(savedTheme as any);
      }
    } catch (_) {}
  }, []);

  const changeRoutineColorTheme = (tId: "navy" | "orange" | "pink" | "emerald" | "purple" | "daylight") => {
    setRoutineColorTheme(tId);
    try {
      localStorage.setItem("noteLagbe_routine_color_theme", tId);
    } catch (_) {}
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("noteLagbe_routine_time_format");
      if (saved === "12h" || saved === "24h") {
        setRoutineTimeFormat(saved);
      }
    } catch (_) {}
  }, []);

  const changeRoutineTimeFormat = (fmt: "12h" | "24h") => {
    setRoutineTimeFormat(fmt);
    try {
      localStorage.setItem("noteLagbe_routine_time_format", fmt);
    } catch (_) {}
  };

  // Load routine entries from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("noteLagbe_routine_entries");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRoutineEntries(parsed);
        }
      }
    } catch (_) {}
  }, []);

  // Save routine entries to localStorage whenever it changes
  useEffect(() => {
    try {
      if (routineEntries.length > 0) {
        localStorage.setItem("noteLagbe_routine_entries", JSON.stringify(routineEntries));
      } else {
        localStorage.removeItem("noteLagbe_routine_entries");
      }
    } catch (_) {}
  }, [routineEntries]);

  // Helper to parse time string like "08:30-09:50" or "08:30 AM - 09:50 AM" into start/end minutes
  const parseTimeToMinutes = (timeStr: string) => {
    if (!timeStr) return null;
    const parts = timeStr.split("-").map(p => p.trim());
    if (parts.length !== 2) return null;

    const toMin = (t: string) => {
      // 12-hour AM/PM format
      const m12 = t.match(/(\d+)(?::(\d+))?\s*(AM|PM)/i);
      if (m12) {
        let hours = parseInt(m12[1], 10);
        const minutes = m12[2] ? parseInt(m12[2], 10) : 0;
        const ampm = m12[3].toUpperCase();
        if (ampm === "PM" && hours !== 12) hours += 12;
        if (ampm === "AM" && hours === 12) hours = 0;
        return hours * 60 + minutes;
      }
      // 24-hour format (e.g. 15:00 or 08:30)
      const m24 = t.match(/(\d+)(?::(\d+))?/);
      if (m24) {
        const hours = parseInt(m24[1], 10);
        const minutes = m24[2] ? parseInt(m24[2], 10) : 0;
        return hours * 60 + minutes;
      }
      return 0;
    };

    return { start: toMin(parts[0]), end: toMin(parts[1]) };
  };

  // Convert minutes to 12-hour format e.g. "08:30 AM", "01:30 PM"
  const formatTime12 = (min: number) => {
    let h = Math.floor(min / 60);
    const m = min % 60;
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${ampm}`;
  };

  // Convert any time range to 12-hour "08:30 AM - 09:50 AM" format
  const formatRange12 = (timeStr: string) => {
    const parsed = parseTimeToMinutes(timeStr);
    if (!parsed) return timeStr;
    return `${formatTime12(parsed.start)} - ${formatTime12(parsed.end)}`;
  };

  // Convert any time range to clean 24-hour "11:30-12:50" format
  const formatRange24 = (timeStr: string) => {
    const parsed = parseTimeToMinutes(timeStr);
    if (!parsed) return timeStr;
    const to24 = (min: number) => {
      const h = Math.floor(min / 60).toString().padStart(2, "0");
      const m = (min % 60).toString().padStart(2, "0");
      return `${h}:${m}`;
    };
    return `${to24(parsed.start)}-${to24(parsed.end)}`;
  };

  // Helper to detect if two time intervals overlap
  const checkTimeOverlap = (t1: string, t2: string) => {
    if (t1 === t2) return true;
    const r1 = parseTimeToMinutes(t1);
    const r2 = parseTimeToMinutes(t2);
    if (!r1 || !r2) return false;
    return Math.max(r1.start, r2.start) < Math.min(r1.end, r2.end);
  };

  // Routine Clash Detection
  const detectClashes = () => {
    const clashes: { e1: any; e2: any; day: string; time1: string; time2: string }[] = [];
    for (let i = 0; i < routineEntries.length; i++) {
      for (let j = i + 1; j < routineEntries.length; j++) {
        const a = routineEntries[i];
        const b = routineEntries[j];
        if (a.day === b.day && checkTimeOverlap(a.time, b.time)) {
          clashes.push({ e1: a, e2: b, day: a.day, time1: formatRange24(a.time), time2: formatRange24(b.time) });
        }
      }
    }
    return clashes;
  };

  const clashes = detectClashes();
  const curRoutineTheme = ROUTINE_COLOR_THEMES[routineColorTheme] || ROUTINE_COLOR_THEMES.navy;

  // Helper to parse unified "CSE381.4" or "CSE381 Sec 4"
  const parseCourseCodeAndSec = (input: string) => {
    const trimmed = (input || "").trim();
    if (!trimmed) return { code: "", section: "Sec 1", fullCode: "" };

    if (trimmed.includes(".")) {
      const parts = trimmed.split(".");
      const code = parts[0].replace(/\s+/g, "").toUpperCase();
      const sPart = parts.slice(1).join(".").trim();
      const secNum = sPart.replace(/^(sec|section)\s*/i, "").trim();
      const section = secNum ? `Sec ${secNum}` : "Sec 1";
      const fullCode = `${code}.${secNum || "1"}`;
      return { code, section, fullCode };
    } else {
      const match = trimmed.match(/^([a-zA-Z]+(?:\s*[0-9]+)?)\s*(?:sec(?:tion)?)?\s*(\d+)?$/i);
      if (match && match[2]) {
        const code = match[1].replace(/\s+/g, "").toUpperCase();
        const section = `Sec ${match[2]}`;
        const fullCode = `${code}.${match[2]}`;
        return { code, section, fullCode };
      }
      const code = trimmed.replace(/\s+/g, "").toUpperCase();
      return { code, section: "Sec 1", fullCode: `${code}.1` };
    }
  };

  // Add Class to Schedule (supports bi-weekly pairs and single days)
  const addRoutineEntry = () => {
    if (!courseCodeAndSec.trim()) {
      toast.error(language === "bn" ? "কোর্স কোড ও সেকশন লিখুন (যেমন: CSE381.4)।" : "Please enter Course Code and Section (e.g. CSE381.4).");
      return;
    }

    const { code, section, fullCode } = parseCourseCodeAndSec(courseCodeAndSec);

    if (!code || code.length < 3) {
      toast.error(
        language === "bn"
          ? "সঠিক কোর্স কোড লিখুন (যেমন: CSE381, MAT101)।"
          : "Please enter a valid course code (e.g. CSE381, MAT101)."
      );
      return;
    }

    const daySlotObj = SEU_DAY_SLOTS.find(s => s.value === newDaySlot);
    const targetDays = daySlotObj ? daySlotObj.days : [newDaySlot];
    const formattedTime = formatRange24(newTime);

    // Duplicate Check: Same class on the same day at the same time
    const isDuplicate = routineEntries.some(e => 
      targetDays.includes(e.day) && 
      (e.fullCode === fullCode || e.code === code) && 
      e.time === formattedTime
    );

    if (isDuplicate) {
      toast.error(
        language === "bn"
          ? `${fullCode} এই সময়ে ইতোমধ্যে রুটিনে যুক্ত আছে!`
          : `${fullCode} is already scheduled at this time slot!`
      );
      return;
    }

    const timestamp = Date.now();
    const newItems = targetDays.map((day, idx) => ({
      id: timestamp + idx + Math.floor(Math.random() * 1000),
      code,
      section,
      fullCode,
      day,
      time: formattedTime,
      room: newRoom.trim() || "SEU TBA",
      teacher: newTeacher.trim() || "",
    }));

    // Check clash
    let hasClash = false;
    for (const item of newItems) {
      const conflict = routineEntries.find(e => e.day === item.day && checkTimeOverlap(e.time, item.time));
      if (conflict) {
        hasClash = true;
        break;
      }
    }

    setRoutineEntries([...routineEntries, ...newItems]);
    setCourseCodeAndSec("");
    setNewRoom("");

    if (hasClash) {
      toast.warning(language === "bn" ? `⚠️ ${fullCode} যুক্ত হয়েছে, তবে একই সময়ে অন্য ক্লাস থাকায় Clash তৈরি হয়েছে!` : `⚠️ ${fullCode} added, but time clash detected!`);
    } else {
      toast.success(language === "bn" ? `${fullCode} সফলভাবে রুটিনে যুক্ত হয়েছে (${targetDays.join(" ও ")})!` : `${fullCode} successfully added for ${targetDays.join(" & ")}!`);
    }
  };

  const removeRoutineEntry = (id: number) => {
    setRoutineEntries(routineEntries.filter(e => e.id !== id));
    toast.info(language === "bn" ? "ক্লাস রুটিন থেকে সরানো হয়েছে।" : "Class removed from routine.");
  };

  // Print/PDF: Isolates ONLY the 8 AM - 8 PM Timeline Grid schedule
  const handlePrintRoutineOnly = () => {
    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) {
      window.print();
      return;
    }

    const themeCfg = ROUTINE_COLOR_THEMES[routineColorTheme] || ROUTINE_COLOR_THEMES.navy;

    let rowsHtml = "";
    SEU_TIMELINE_DAYS.forEach(({ code, fullDay, bg }, rIdx) => {
      const dayClasses = routineEntries.filter(e => e.day === fullDay || e.day === code);
      let cardsHtml = "";
      dayClasses.forEach(item => {
        const timeParsed = parseTimeToMinutes(item.time);
        const startMin = timeParsed ? Math.max(480, timeParsed.start) : 480;
        const endMin = timeParsed ? Math.min(1200, timeParsed.end) : 560;
        const leftPercent = Math.max(0, Math.min(95, ((startMin - 480) / 720) * 100));
        const widthPercent = Math.max(7, Math.min(100 - leftPercent, ((endMin - startMin) / 720) * 100));
        const timeLabel = routineTimeFormat === "12h" ? formatRange12(item.time) : formatRange24(item.time);

        cardsHtml += `
          <div style="position: absolute; left: ${leftPercent}%; width: ${widthPercent}%; min-width: 85px; top: 4px; bottom: 4px; background: ${themeCfg.printCardBg}; border: 1.5px solid ${themeCfg.printCardBorder}; border-radius: 8px; padding: 6px; box-sizing: border-box; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between;">
            <div style="font-weight: 900; font-family: monospace; font-size: 11px; color: ${themeCfg.printCardCode}; line-height: 1.1;">${item.fullCode || item.code}</div>
            <div style="font-size: 9.5px; font-family: monospace; color: ${themeCfg.printCardTime}; font-weight: bold; margin-top: 2px;">${timeLabel}</div>
            <div style="font-size: 9px; color: ${themeCfg.printCardRoom}; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px;">📍 ${item.room || "SEU TBA"}</div>
          </div>`;
      });

      const rowBg = rIdx % 2 === 0 ? themeCfg.printRowEven : themeCfg.printRowOdd;
      rowsHtml += `
        <div style="display: flex; height: 65px; border-bottom: 1px solid ${themeCfg.printRowBorder}; background: ${rowBg}; position: relative;">
          <div style="width: 70px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-family: monospace; font-weight: 800; font-size: 13px; color: ${themeCfg.printDayText}; border-right: 1px solid ${themeCfg.printDayBorder}; background: ${themeCfg.printDayBg};">
            ${code}
          </div>
          <div style="flex-grow: 1; position: relative; height: 100%;">
            ${SEU_TIMELINE_HOURS.map((_, hIdx) => `
              <div style="position: absolute; left: ${(hIdx / 12) * 100}%; top: 0; bottom: 0; width: 1px; background: ${themeCfg.printGridLine};"></div>
            `).join("")}
            ${cardsHtml}
          </div>
        </div>`;
    });

    const hoursHtml = SEU_TIMELINE_HOURS.map((h, i) => {
      const left = (i / 12) * 100;
      const hLabel = routineTimeFormat === "12h"
        ? (h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`)
        : `${h.toString().padStart(2, "0")}:00`;
      const tx = i === 0 ? "0%" : i === 12 ? "-100%" : "-50%";
      return `<div style="position: absolute; left: ${left}%; transform: translateX(${tx}); font-family: monospace; font-size: 10.5px; font-weight: bold; color: ${themeCfg.printRulerText};">${hLabel}</div>`;
    }).join("");

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>SEU Class Timetable (8 AM - 8 PM)</title>
  <style>
    @page { size: landscape; margin: 8mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 12px; background: ${themeCfg.printBg}; color: ${themeCfg.printCardCode}; }
    .no-print { display: flex; justify-content: space-between; align-items: center; background: ${themeCfg.printRulerBg}; padding: 10px 16px; border-radius: 8px; margin-bottom: 12px; border: 1px solid ${themeCfg.printContainerBorder}; }
    .header { text-align: center; margin-bottom: 12px; border-bottom: 2px solid ${themeCfg.printHeaderLine}; padding-bottom: 8px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 900; color: ${themeCfg.printHeaderH1}; letter-spacing: 0.5px; }
    .header p { margin: 3px 0 0; font-size: 11px; color: ${themeCfg.printHeaderP}; }
    @media print {
      body { padding: 0; background: ${themeCfg.printBg} !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <span style="font-size: 13px; font-weight: bold; color: ${themeCfg.printRulerText};">📄 Southeast University Weekly Routine Timeline (8 AM - 8 PM) • [Theme: ${themeCfg.name}]</span>
    <button onclick="window.print()" style="background: ${themeCfg.printHeaderLine}; color: #fff; border: none; padding: 8px 18px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 12px;">🖨️ Print / Save as PDF</button>
  </div>
  <div class="header">
    <h1>SOUTHEAST UNIVERSITY</h1>
    <p>Official Weekly Class Routine & Schedule • All Academic Departments (8:00 AM – 8:00 PM)</p>
  </div>
  <div style="border: 1px solid ${themeCfg.printContainerBorder}; border-radius: 12px; overflow: hidden; background: ${themeCfg.printContainerBg};">
    <!-- Timeline Hours Ruler -->
    <div style="display: flex; height: 32px; background: ${themeCfg.printRulerBg}; border-bottom: 1px solid ${themeCfg.printRulerBorder}; align-items: center;">
      <div style="width: 70px; flex-shrink: 0; font-family: monospace; font-size: 10px; font-weight: 800; color: ${themeCfg.printRulerText}; text-align: center;">DAY</div>
      <div style="flex-grow: 1; position: relative; height: 100%; display: flex; align-items: center;">
        ${hoursHtml}
      </div>
    </div>
    <!-- Day Rows -->
    ${rowsHtml}
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleDownloadPdfRoutine = () => {
    toast.info(language === "bn" ? "প্রিন্ট ডায়ালগ থেকে 'Save as PDF' নির্বাচন করে সেভ করুন।" : "In the print dialog, set Destination to 'Save as PDF' to download.", { duration: 4000 });
    handlePrintRoutineOnly();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* 1. TOP HEADER BOX - SOUTHEAST UNIVERSITY STUDENT TOOLS */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-slate-100/60 dark:from-blue-900/20 dark:via-indigo-900/10 dark:to-slate-900/40 border border-blue-200/80 dark:border-blue-800/60 shadow-sm relative overflow-hidden print:hidden space-y-6">
        
        {/* Header Title & Intro */}
        <div className="space-y-2 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-black px-2.5 py-1 rounded-xl bg-blue-600 text-white shadow-sm">
              SEU UTILITIES
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{language === "bn" ? "অফিসিয়াল স্টুডেন্ট টুলস" : "Official Student Tools"}</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {language === "bn" ? "সাউথইস্ট ইউনিভার্সিটি স্টুডেন্ট টুলস" : "Southeast University Student Tools"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {language === "bn"
              ? "সাউথইস্ট ইউনিভার্সিটির অ্যাকাডেমিক গ্রেডিং, টিউশন ফি ও কিস্তি হিসাব, অফিসিয়াল ল্যাব ও অ্যাসাইনমেন্ট কভার পেজ জেনারেটর এবং স্মার্ট ক্লাস রুটিন বিল্ডার।"
              : "Comprehensive academic utilities: CGPA calculator, tuition installment calculator, official cover page maker, and smart routine builder."}
          </p>
        </div>

        {/* 2. SUB-TOOL NAVIGATION CARDS (SEU Royal Blue / Indigo Theme - 5 per row, remaining to 2nd row) */}
        <div className="pt-5 border-t border-slate-200/60 dark:border-slate-800/60">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
            
            {/* Card 1: 1. CGPA Calculator */}
            <button
              onClick={() => setActiveTab("cgpa")}
              className={`w-full text-left p-5 rounded-3xl border transition-all duration-200 cursor-pointer flex flex-col justify-between h-[148px] relative group ${
                activeTab === "cgpa"
                  ? "bg-white dark:bg-slate-900 border-2 border-blue-600 dark:border-blue-500 ring-4 ring-blue-600/15 dark:ring-blue-500/20 shadow-xl shadow-blue-600/10 scale-[1.02]"
                  : "bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-blue-300 dark:hover:border-blue-700/60 hover:shadow-md hover:scale-[1.01]"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center shrink-0">
                  <Calculator className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                
              </div>

              <div className="pt-2">
                <h3 className={`text-sm sm:text-[15px] font-bold tracking-tight leading-snug transition-colors ${
                  activeTab === "cgpa" ? "text-blue-600 dark:text-blue-400" : "text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400"
                }`}>
                  {language === "bn" ? "১. CGPA ক্যালকুলেটর" : "1. CGPA Calculator"}
                </h3>
              </div>
            </button>

            {/* Card 2: 2. Tuition & Waiver Calculator */}
            <button
              onClick={() => setActiveTab("tuition")}
              className={`w-full text-left p-5 rounded-3xl border transition-all duration-200 cursor-pointer flex flex-col justify-between h-[148px] relative group ${
                activeTab === "tuition"
                  ? "bg-white dark:bg-slate-900 border-2 border-blue-600 dark:border-blue-500 ring-4 ring-blue-600/15 dark:ring-blue-500/20 shadow-xl shadow-blue-600/10 scale-[1.02]"
                  : "bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-blue-300 dark:hover:border-blue-700/60 hover:shadow-md hover:scale-[1.01]"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center shrink-0">
                  <Banknote className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                
              </div>

              <div className="pt-2">
                <h3 className={`text-sm sm:text-[15px] font-bold tracking-tight leading-snug transition-colors ${
                  activeTab === "tuition" ? "text-blue-600 dark:text-blue-400" : "text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400"
                }`}>
                  {language === "bn" ? "২. টিউশন ফি ও কিস্তি" : "2. Tuition & Waiver"}
                </h3>
              </div>
            </button>

            {/* Card 3: 3. SEU Cover Page Maker */}
            <button
              onClick={() => setActiveTab("cover")}
              className={`w-full text-left p-5 rounded-3xl border transition-all duration-200 cursor-pointer flex flex-col justify-between h-[148px] relative group ${
                activeTab === "cover"
                  ? "bg-white dark:bg-slate-900 border-2 border-blue-600 dark:border-blue-500 ring-4 ring-blue-600/15 dark:ring-blue-500/20 shadow-xl shadow-blue-600/10 scale-[1.02]"
                  : "bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-blue-300 dark:hover:border-blue-700/60 hover:shadow-md hover:scale-[1.01]"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                
              </div>

              <div className="pt-2">
                <h3 className={`text-sm sm:text-[15px] font-bold tracking-tight leading-snug transition-colors ${
                  activeTab === "cover" ? "text-blue-600 dark:text-blue-400" : "text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400"
                }`}>
                  {language === "bn" ? "৩. কভার পেজ মেকার" : "3. Cover Page Maker"}
                </h3>
              </div>
            </button>

            {/* Card 4: 4. Event Certificate Maker */}
            <button
              onClick={() => setActiveTab("certificate")}
              className={`w-full text-left p-5 rounded-3xl border transition-all duration-200 cursor-pointer flex flex-col justify-between h-[148px] relative group ${
                activeTab === "certificate"
                  ? "bg-white dark:bg-slate-900 border-2 border-blue-600 dark:border-blue-500 ring-4 ring-blue-600/15 dark:ring-blue-500/20 shadow-xl shadow-blue-600/10 scale-[1.02]"
                  : "bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-blue-300 dark:hover:border-blue-700/60 hover:shadow-md hover:scale-[1.01]"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center shrink-0">
                  <Award className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>

              <div className="pt-2">
                <h3 className={`text-sm sm:text-[15px] font-bold tracking-tight leading-snug transition-colors ${
                  activeTab === "certificate" ? "text-blue-600 dark:text-blue-400" : "text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400"
                }`}>
                  {language === "bn" ? "৪. ইভেন্ট সার্টিফিকেট মেকার" : "4. Event Certificate Maker"}
                </h3>
              </div>
            </button>

            {/* Card 4: 4. Smart Routine Builder */}
            <button
              onClick={() => setActiveTab("routine")}
              className={`w-full text-left p-5 rounded-3xl border transition-all duration-200 cursor-pointer flex flex-col justify-between h-[148px] relative group ${
                activeTab === "routine"
                  ? "bg-white dark:bg-slate-900 border-2 border-blue-600 dark:border-blue-500 ring-4 ring-blue-600/15 dark:ring-blue-500/20 shadow-xl shadow-blue-600/10 scale-[1.02]"
                  : "bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-blue-300 dark:hover:border-blue-700/60 hover:shadow-md hover:scale-[1.01]"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center shrink-0">
                  <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                
              </div>

              <div className="pt-2">
                <h3 className={`text-sm sm:text-[15px] font-bold tracking-tight leading-snug transition-colors ${
                  activeTab === "routine" ? "text-blue-600 dark:text-blue-400" : "text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400"
                }`}>
                  {language === "bn" ? "৫. স্মার্ট ক্লাস রুটিন" : "5. Smart Routine"}
                </h3>
              </div>
            </button>

            {/* Card 6: 6. Academic Calendar (Official Live Sync) */}
            <button
              onClick={() => setActiveTab("calendar")}
              className={`w-full text-left p-5 rounded-3xl border transition-all duration-200 cursor-pointer flex flex-col justify-between h-[148px] relative group ${
                activeTab === "calendar"
                  ? "bg-white dark:bg-slate-900 border-2 border-blue-600 dark:border-blue-500 ring-4 ring-blue-600/15 dark:ring-blue-500/20 shadow-xl shadow-blue-600/10 scale-[1.02]"
                  : "bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-blue-300 dark:hover:border-blue-700/60 hover:shadow-md hover:scale-[1.01]"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>

              <div className="pt-2">
                <h3 className={`text-sm sm:text-[15px] font-bold tracking-tight leading-snug transition-colors ${
                  activeTab === "calendar" ? "text-blue-600 dark:text-blue-400" : "text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400"
                }`}>
                  {language === "bn" ? "৬. একাডেমিক ক্যালেন্ডার" : "6. Academic Calendar"}
                </h3>
              </div>
            </button>

            {/* Card 7: 7. Find Section Group */}
            <button
              onClick={() => setActiveTab("sections")}
              className={`w-full text-left p-5 rounded-3xl border transition-all duration-200 cursor-pointer flex flex-col justify-between h-[148px] relative group ${
                activeTab === "sections"
                  ? "bg-white dark:bg-slate-900 border-2 border-blue-600 dark:border-blue-500 ring-4 ring-blue-600/15 dark:ring-blue-500/20 shadow-xl shadow-blue-600/10 scale-[1.02]"
                  : "bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-blue-300 dark:hover:border-blue-700/60 hover:shadow-md hover:scale-[1.01]"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-[10px] font-mono font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 shrink-0">
                  {language === "bn" ? "শীঘ্রই" : "Soon"}
                </span>
              </div>

              <div className="pt-2">
                <h3 className={`text-sm sm:text-[15px] font-bold tracking-tight leading-snug transition-colors ${
                  activeTab === "sections" ? "text-blue-600 dark:text-blue-400" : "text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400"
                }`}>
                  {language === "bn" ? "৭. ফাইন্ড সেকশন গ্রুপ" : "7. Find Section Group"}
                </h3>
              </div>
            </button>

            {/* Card 8: 8. Smart Advising Routine */}
            <button
              onClick={() => setActiveTab("advising")}
              className={`w-full text-left p-5 rounded-3xl border transition-all duration-200 cursor-pointer flex flex-col justify-between h-[148px] relative group ${
                activeTab === "advising"
                  ? "bg-white dark:bg-slate-900 border-2 border-blue-600 dark:border-blue-500 ring-4 ring-blue-600/15 dark:ring-blue-500/20 shadow-xl shadow-blue-600/10 scale-[1.02]"
                  : "bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-blue-300 dark:hover:border-blue-700/60 hover:shadow-md hover:scale-[1.01]"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-[10px] font-mono font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 shrink-0">
                  {language === "bn" ? "শীঘ্রই" : "Soon"}
                </span>
              </div>

              <div className="pt-2">
                <h3 className={`text-sm sm:text-[15px] font-bold tracking-tight leading-snug transition-colors ${
                  activeTab === "advising" ? "text-blue-600 dark:text-blue-400" : "text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400"
                }`}>
                  {language === "bn" ? "৮. স্মার্ট অ্যাডভাইজিং রুটিন" : "8. Smart Advising Routine"}
                </h3>
              </div>
            </button>

          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 1. SEU SGPA & CGPA CALCULATOR VIEW (MATCHES USER SCREENSHOTS) */}
      {/* ========================================================================= */}
      {activeTab === "cgpa" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Course Details Form (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-blue-600" />
                    <span>Course Details</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {language === "bn" ? "প্রতি কোর্সের ক্রেডিট ও প্রত্যাশিত গ্রেড নির্বাচন করুন" : "Select credit and expected grade for each course"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGradingInfo(!showGradingInfo)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 flex items-center justify-center transition-colors cursor-pointer"
                  title="View SEU Official Grading Policy"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>

              {/* SEU Grading Policy Modal/Card */}
              {showGradingInfo && (
                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs space-y-2 animate-in fade-in duration-200">
                  <div className="font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                    <School className="w-4 h-4 text-blue-600" />
                    <span>Southeast University Official Grading Scale</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 font-mono text-[11px]">
                    {SEU_GRADES.map(g => (
                      <div key={g.label} className="p-1.5 rounded-lg bg-white dark:bg-slate-900/80 border border-blue-100 dark:border-blue-900/40 text-center">
                        <p className="font-black text-slate-800 dark:text-slate-200">{g.label}</p>
                        <p className="text-[9px] text-slate-500">{g.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

      

              {/* Courses Rows (Course 1, Course 2, Course 3, ...) */}
              <div className="space-y-4">
                {courses.map((c, index) => (
                  <div key={c.id} className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Course {index + 1}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Credit Dropdown */}
                      <div className="relative">
                        <select
                          value={c.credit}
                          onChange={(e) => {
                            const updated = [...courses];
                            updated[index].credit = e.target.value;
                            setCourses(updated);
                          }}
                          className={`w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border-2 text-xs appearance-none transition-colors cursor-pointer ${
                            c.credit
                              ? "border-slate-300 dark:border-slate-600 font-bold text-slate-800 dark:text-white"
                              : "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 font-medium"
                          } focus:outline-none focus:border-blue-500`}
                        >
                          <option value="">{language === "bn" ? "ক্রেডিট" : "Credit"}</option>
                          <option value="3.0">{language === "bn" ? "৩.০ ক্রেডিট (থিওরি)" : "3.0 Credits (Theory)"}</option>
                          <option value="1.0">{language === "bn" ? "১.০ ক্রেডিট (ল্যাব)" : "1.0 Credit (Lab)"}</option>
                        </select>
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">
                          ▼
                        </span>
                      </div>

                      {/* Grade Dropdown */}
                      <div className="relative">
                        <select
                          value={c.grade}
                          onChange={(e) => {
                            const updated = [...courses];
                            updated[index].grade = e.target.value;
                            setCourses(updated);
                          }}
                          className={`w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border-2 text-xs appearance-none transition-colors cursor-pointer ${
                            c.grade
                              ? "border-blue-500/80 dark:border-blue-500 font-black text-slate-800 dark:text-white"
                              : "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 font-medium"
                          } focus:outline-none focus:border-blue-600`}
                        >
                          <option value="">{language === "bn" ? "গ্রেড" : "Grade"}</option>
                          {SEU_GRADES.map((g) => (
                            <option key={g.label} value={g.value.toFixed(2)}>
                              {g.label}
                            </option>
                          ))}
                        </select>
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none text-xs">
                          ▼
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons (+ / - / Count) */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={addCourseRow}
                    className="w-10 h-10 rounded-2xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-black text-lg flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                    title="Add Course"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={removeCourseRow}
                    disabled={courses.length <= 1}
                    className="w-10 h-10 rounded-2xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-950 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 font-black text-lg flex items-center justify-center transition-colors disabled:opacity-40 shadow-sm cursor-pointer"
                    title="Remove Course"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                </div>

                <span className="text-xs font-bold text-slate-500">
                  {courses.length} {language === "bn" ? "টি কোর্স যুক্ত আছে" : "Courses Added"}
                </span>
              </div>

              {/* Cumulative Optional Inputs (Past credits & past CGPA) */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    For Cumulative CGPA, enter previous record (optional):
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500">
                      {language === "bn" ? "পূর্বে সম্পন্ন মোট ক্রেডিট (Previous Total Credits)" : "Previous Total Credits"}
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 45 or 60"
                      value={prevCredits}
                      onChange={(e) => setPrevCredits(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500">
                      {language === "bn" ? "পূর্বের CGPA (Previous CGPA)" : "Previous CGPA"}
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 3.50"
                      value={prevCgpa}
                      onChange={(e) => setPrevCgpa(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Calculate & Reset Buttons (SEU Blue Theme) */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={calculateCgpa}
                  className="grow py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Calculator className="w-4 h-4" />
                  <span>Calculate CGPA</span>
                </button>
                <button
                  type="button"
                  onClick={resetCgpa}
                  className="py-4 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs transition-colors cursor-pointer"
                  title="Reset Calculator"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Results & Grading Scale (lg:col-span-5 space-y-5 sticky top-24) */}
          <div className="lg:col-span-5 space-y-5 sticky top-24">
            
            {/* Results Display Card */}
            {cgpaResult ? (
              <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-blue-500/10 border-2 border-emerald-500/30 dark:border-emerald-500/20 shadow-lg space-y-5 animate-in zoom-in-95 duration-200">
                
                {/* Header Badge */}
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                  <span className="text-[10px] font-mono font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    {cgpaResult.cumulativeCgpa !== undefined ? "CUMULATIVE CGPA ESTIMATION" : "SEU CGPA ESTIMATION"}
                  </span>
                  {cgpaResult.cgpaDiff !== undefined && (
                    <span className={`text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                      cgpaResult.cgpaDiff > 0
                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                        : cgpaResult.cgpaDiff < 0
                        ? "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}>
                      {cgpaResult.cgpaDiff > 0
                        ? `▲ +${cgpaResult.cgpaDiff.toFixed(2)} Increased`
                        : cgpaResult.cgpaDiff < 0
                        ? `▼ ${cgpaResult.cgpaDiff.toFixed(2)} Decreased`
                        : "• Maintained"}
                    </span>
                  )}

      
                </div>

                {/* Primary CGPA Display */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {cgpaResult.cumulativeCgpa !== undefined ? "Cumulative CGPA" : "CGPA"}
                    </p>
                    <p className="text-5xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight mt-1">
                      {(cgpaResult.cumulativeCgpa !== undefined ? cgpaResult.cumulativeCgpa : cgpaResult.cgpa).toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Credits</p>
                    <p className="text-4xl font-black text-slate-900 dark:text-white font-mono mt-1">
                      {cgpaResult.overallCredits !== undefined ? cgpaResult.overallCredits : cgpaResult.totalCredits}
                    </p>
                  </div>
                </div>

                {/* If Cumulative, Show Comparison Breakdown */}
                {cgpaResult.cumulativeCgpa !== undefined && (
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">This Semester</p>
                      <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                        {cgpaResult.cgpa.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {cgpaResult.totalCredits} Credits • {cgpaResult.totalPoints} pts
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Previous Record</p>
                      <p className="text-lg font-black text-slate-800 dark:text-slate-200 font-mono mt-0.5">
                        {cgpaResult.prevCgpa?.toFixed(2)}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {cgpaResult.prevCredits} Credits • {cgpaResult.prevPoints} pts
                      </p>
                    </div>
                  </div>
                )}

      

                {/* Points & Standing */}
                <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Grade Points Earned:</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                      {cgpaResult.overallPoints !== undefined ? cgpaResult.overallPoints : cgpaResult.totalPoints}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Equivalent Standard:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {(cgpaResult.cumulativeCgpa || cgpaResult.cgpa) >= 3.75 ? "First Class / Excellent" : (cgpaResult.cumulativeCgpa || cgpaResult.cgpa) >= 3.0 ? "Very Good" : "Satisfactory"}
                    </span>
                  </div>
                </div>

              </div>
            ) : (
              /* Standby Preview Card */
              <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Calculator className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {language === "bn" ? "CGPA ফলাফল প্রিভিউ" : "CGPA Calculation Summary"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                    {language === "bn"
                      ? "বামপাশের ফর্ম থেকে ক্রেডিট ও গ্রেড দিয়ে 'Calculate CGPA' বাটনে ক্লিক করলেই আপনার CGPA এখানে দৃশ্যমান হবে।"
                      : "Select course credits & expected grades on the left, then click Calculate CGPA to see your instant score here."}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs flex items-center justify-around font-semibold text-slate-600 dark:text-slate-400">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Total Courses</span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-200">{courses.length} Courses</span>
                  </div>
                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Selected Credits</span>
                    <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                      {courses.reduce((sum, c) => sum + (parseFloat(c.credit) || 0), 0) > 0
                        ? `${courses.reduce((sum, c) => sum + (parseFloat(c.credit) || 0), 0)} Cr`
                        : "-- Cr"}
                    </span>
                  </div>
                </div>
              </div>
            )}

      

            {/* Southeast University Official Grading Scale Reference */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="text-xs font-black uppercase text-blue-600 tracking-wider flex items-center gap-1.5">
                  <School className="w-4 h-4" />
                  <span>SEU Grading Policy</span>
                </h4>
                <span className="text-[10px] font-bold text-slate-400">Official</span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                {SEU_GRADES.map((g) => (
                  <div key={g.label} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                    <span className="font-black text-slate-800 dark:text-slate-200">{g.label}</span>
                    <span className="text-[10px] text-slate-500">{g.desc}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      
      {/* ========================================================================= */}
      {/* 2. SEU TUITION & WAIVER CALCULATOR VIEW (MATCHES USER SCREENSHOT) */}
      {/* ========================================================================= */}
      {activeTab === "tuition" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Fee Calculation Input Form (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    <span>Fee Calculation</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    {language === "bn" ? "ক্রেডিট ও ওয়েভার অনুযায়ী মোট ফি ও ৩ কিস্তি হিসাব" : "Calculate tuition fee & 3-installment plan (40% + 30% + 30%)"}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                  <Info className="w-4 h-4" />
                </div>
              </div>

              {/* Inputs Matching User Image - Professional empty initial states with clear placeholders */}
              <div className="space-y-4">
                {/* Per Credit Fee */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Per Credit Fee *
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setPerCreditFee("3550")}
                        className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900 text-[10px] font-bold text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40 cursor-pointer transition-colors"
                      >
                        CSE Day (৳3,550)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPerCreditFee("1950")}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                      >
                        CSE Evening (৳1,950)
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="50000"
                    maxLength={6}
                    value={perCreditFee}
                    onChange={(e) => setPerCreditFee(e.target.value.slice(0, 6))}
                    placeholder="Enter amount per credit (e.g. 3550)"
                    className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* Total Credits */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Total Credits *
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {["12", "13", "14", "17"].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setTotalCredits(c)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border cursor-pointer transition-colors ${
                            totalCredits === c
                              ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                              : "bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {c} Cr
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="35"
                    maxLength={4}
                    value={totalCredits}
                    onChange={(e) => setTotalCredits(e.target.value.slice(0, 4))}
                    placeholder="Enter total enrolled credits (e.g. 13)"
                    className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* Laboratory Fee */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Laboratory Fee
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50000"
                    maxLength={6}
                    value={labFee}
                    onChange={(e) => setLabFee(e.target.value.slice(0, 6))}
                    placeholder="Enter lab fee if applicable (e.g. 3540)"
                    className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* Waiver Percentage */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Waiver Percentage (%)
                    </label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {["0", "20", "30", "40", "50", "100"].map(w => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setWaiverPercent(w)}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                        >
                          {w}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    maxLength={3}
                    value={waiverPercent}
                    onChange={(e) => {
                      const val = e.target.value.slice(0, 3);
                      if (parseFloat(val) > 100) setWaiverPercent("100");
                      else setWaiverPercent(val);
                    }}
                    placeholder="Enter waiver % if eligible (e.g. 20)"
                    className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* SEU Policy Warning if < 12 credits and waiver entered */}
              {parseFloat(totalCredits) < 12 && parseFloat(waiverPercent) > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    {language === "bn"
                      ? "সতর্কতা: সাউথইস্ট ইউনিভার্সিটিতে স্কলারশিপ/ওয়েভার কার্যকর রাখতে সেমিস্টারে কমপক্ষে ১২ ক্রেডিট নেওয়া আবশ্যক।"
                      : "Note: At SEU, 12 credits minimum is strictly required to keep your waiver/scholarship active!"}
                  </span>
                </div>
              )}

              {/* Calculate & Reset Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={calculateTuition}
                  className="grow py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Calculate Fees</span>
                </button>
                <button
                  type="button"
                  onClick={resetTuition}
                  className="py-4 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs transition-colors cursor-pointer"
                  title="Reset Calculator"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Important Notes + Fee Breakdown (lg:col-span-5 space-y-5 sticky top-24) */}
          <div className="lg:col-span-5 space-y-5 sticky top-24">
            
            {/* Important Notes Card matching user screenshot (Purple Card) */}
            <div className="p-5 sm:p-6 rounded-3xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-900/50 space-y-3 text-xs text-purple-950 dark:text-purple-200 shadow-sm">
              <div className="font-extrabold flex items-center gap-2 text-sm text-purple-900 dark:text-purple-100">
                <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">
                  i
                </span>
                <span>Important Notes</span>
              </div>
              <ul className="space-y-2 list-disc list-inside text-xs opacity-90 pl-1 leading-relaxed">
                <li>
                  <strong className="text-purple-900 dark:text-purple-100">12 credits minimum</strong> required to keep waiver active
                </li>
                <li>This calculation provides an estimate</li>
                <li>
                  Installment plan: <strong className="text-purple-900 dark:text-purple-100">40% + 30% + 30%</strong>
                </li>
              </ul>
            </div>

            {/* Results Breakdown */}
            {tuitionResult ? (
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg space-y-5 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                    <span>Tuition Fee Breakdown</span>
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold">
                    ESTIMATION
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center gap-2 text-slate-600 dark:text-slate-400">
                    <span className="truncate min-w-0">Gross Tuition ({totalCredits} cr × ৳{perCreditFee}):</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono shrink-0 text-right truncate max-w-[50%]" title={`৳${tuitionResult.originalTuition.toLocaleString()}`}>৳{tuitionResult.originalTuition.toLocaleString()}</span>
                  </div>
                  {tuitionResult.discountAmount > 0 && (
                    <div className="flex justify-between items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                      <span className="truncate min-w-0">Waiver Discount ({waiverPercent}%):</span>
                      <span className="font-mono shrink-0 text-right truncate max-w-[50%]" title={`-৳${tuitionResult.discountAmount.toLocaleString()}`}>-৳{tuitionResult.discountAmount.toLocaleString()}</span>
                    </div>
                  )}

                  {tuitionResult.labFee > 0 && (
                    <div className="flex justify-between items-center gap-2 text-slate-600 dark:text-slate-400">
                      <span className="truncate min-w-0">Laboratory Fee:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 font-mono shrink-0 text-right truncate max-w-[50%]" title={`৳${tuitionResult.labFee.toLocaleString()}`}>৳{tuitionResult.labFee.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center gap-2 text-sm font-black text-blue-600 dark:text-blue-400 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="truncate min-w-0">Net Payable Tuition Fee:</span>
                    <span className="font-mono text-lg sm:text-xl shrink-0 text-right truncate max-w-[55%]" title={`৳${tuitionResult.totalPayable.toLocaleString()}`}>৳{tuitionResult.totalPayable.toLocaleString()}</span>
                  </div>
                </div>

                {/* 3 Installments Plan Table */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                    SEU 3-Installment Schedule (40% + 30% + 30%):
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
                    <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 min-w-0 overflow-hidden flex flex-col justify-between">
                      <p className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide truncate">1st (40%)</p>
                      <p 
                        className={`font-black text-slate-900 dark:text-white font-mono mt-0.5 truncate block w-full ${
                          tuitionResult.inst1.toLocaleString().length > 8 ? "text-xs sm:text-sm" : "text-sm sm:text-base"
                        }`}
                        title={`৳${tuitionResult.inst1.toLocaleString()}`}
                      >
                        ৳{tuitionResult.inst1.toLocaleString()}
                      </p>
                      <p className="text-[9px] text-slate-500 mt-0.5 truncate">At Registration</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/40 min-w-0 overflow-hidden flex flex-col justify-between">
                      <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide truncate">2nd (30%)</p>
                      <p 
                        className={`font-black text-slate-900 dark:text-white font-mono mt-0.5 truncate block w-full ${
                          tuitionResult.inst2.toLocaleString().length > 8 ? "text-xs sm:text-sm" : "text-sm sm:text-base"
                        }`}
                        title={`৳${tuitionResult.inst2.toLocaleString()}`}
                      >
                        ৳{tuitionResult.inst2.toLocaleString()}
                      </p>
                      <p className="text-[9px] text-slate-500 mt-0.5 truncate">Before Midterm</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 min-w-0 overflow-hidden flex flex-col justify-between">
                      <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide truncate">3rd (30%)</p>
                      <p 
                        className={`font-black text-slate-900 dark:text-white font-mono mt-0.5 truncate block w-full ${
                          tuitionResult.inst3.toLocaleString().length > 8 ? "text-xs sm:text-sm" : "text-sm sm:text-base"
                        }`}
                        title={`৳${tuitionResult.inst3.toLocaleString()}`}
                      >
                        ৳{tuitionResult.inst3.toLocaleString()}
                      </p>
                      <p className="text-[9px] text-slate-500 mt-0.5 truncate">Before Final</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <DollarSign className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">
                  {language === "bn" ? "হিসাব ও কিস্তির বিবরণী" : "Installment Breakdown Standby"}
                </h4>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                  {language === "bn"
                    ? "পার-ক্রেডিট ফি ও মোট ক্রেডিট দিয়ে 'Calculate Fees' বাটনে ক্লিক করলে নিট ফি ও ৩টি কিস্তির বিস্তারিত ব্রেকডাউন এখানে চলে আসবে।"
                    : "Fill in your per-credit fee and total credits, then click Calculate Fees to generate your 3-installment breakdown here."}
                </p>
              </div>
            )}

      

          </div>
        </div>
      )}

      

      {/* ========================================================================= */}
      {/* 3. SEU COVER PAGE MAKER VIEW (DIU LAYOUT + 2 SEU DOCX TEMPLATES) */}
      {/* ========================================================================= */}
      {activeTab === "cover" && (() => {
        const activeTpl = SEU_20_TEMPLATES.find(t => t.id === selectedTemplateId) || SEU_20_TEMPLATES[0];

        // Filter categories list
        const categories = [
          { id: "all", name: "All Unique Formats", nameBn: "সবগুলো সম্পূর্ণ ইউনিক ফরম্যাট", count: SEU_20_TEMPLATES.length },
          { id: "assignment", name: "Assignment", nameBn: "অ্যাসাইনমেন্ট", count: SEU_20_TEMPLATES.filter(t => t.category === "assignment").length },
          { id: "lab", name: "Lab Report", nameBn: "ল্যাব রিপোর্ট", count: SEU_20_TEMPLATES.filter(t => t.category === "lab").length },
          { id: "project", name: "Project Report", nameBn: "প্রজেক্ট রিপোর্ট", count: SEU_20_TEMPLATES.filter(t => t.category === "project").length },
          { id: "termpaper", name: "Term Paper", nameBn: "টার্ম পেপার", count: SEU_20_TEMPLATES.filter(t => t.category === "termpaper").length },
          { id: "thesis", name: "Thesis / Dissertation", nameBn: "থিসিস", count: SEU_20_TEMPLATES.filter(t => t.category === "thesis").length },
          { id: "proposal", name: "Research Proposal", nameBn: "প্রপোজাল", count: SEU_20_TEMPLATES.filter(t => t.category === "proposal").length },
          { id: "casestudy", name: "Case Study", nameBn: "কেস স্টাডি", count: SEU_20_TEMPLATES.filter(t => t.category === "casestudy").length },
          { id: "seminar", name: "Seminar Report", nameBn: "সেমিনার", count: SEU_20_TEMPLATES.filter(t => t.category === "seminar").length },
          { id: "internship", name: "Internship", nameBn: "ইন্টার্নশিপ", count: SEU_20_TEMPLATES.filter(t => t.category === "internship").length },
          { id: "capstone", name: "Capstone Project", nameBn: "ক্যাপস্টোন", count: SEU_20_TEMPLATES.filter(t => t.category === "capstone").length },
        ];

        // Filtered templates based on style, category, and search query
        const filteredTemplates = SEU_20_TEMPLATES.filter(t => {
          if (coverFilterStyle !== "all" && t.style !== coverFilterStyle) return false;
          if (coverCategoryFilter !== "all" && t.category !== coverCategoryFilter) return false;
          if (coverSearchQuery.trim()) {
            const q = coverSearchQuery.toLowerCase().trim();
            const matchName = t.name.toLowerCase().includes(q) || t.nameBn.toLowerCase().includes(q);
            const matchType = t.defaultType.toLowerCase().includes(q);
            const matchDesc = t.desc.toLowerCase().includes(q);
            const matchNum = t.num.includes(q);
            return matchName || matchType || matchDesc || matchNum;
          }
          return true;
        });

        const handleSelectAndEdit = (tplId: string) => {
          const chosen = SEU_20_TEMPLATES.find(t => t.id === tplId);
          setSelectedTemplateId(tplId);
          if (chosen) {
            setCoverType(chosen.defaultType);
            setCoverDesignTheme(chosen.theme || "classic");
          }
          setCoverViewMode("editor");
          if (typeof window !== "undefined") {
            window.scrollTo({ top: 380, behavior: "smooth" });
          }
        };

        // Render Active Cover Content - 16 Distinct Handcrafted Interior Layouts
        const renderActiveCoverContent = () => {
          const isColor = activeTpl.style === "Color";

          // 02. ASYMMETRIC SPINE (Southern University inspired - Image 1 in feedback / Image 3 in summary)
          if (activeTpl.layoutStyle === "asymmetric_spine") {
            return (
              <div className="relative w-full h-full font-sans overflow-hidden bg-white" style={{ minHeight: "840px" }}>
                {/* 1. Left Spine: Rich Multi-Layered Low-Poly Geometric Emerald Polygon Shards */}
                <div className="absolute top-0 bottom-0 left-0 w-[30%] pointer-events-none z-0 overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 180 842" preserveAspectRatio="none" fill="none">
                    <defs>
                      <linearGradient id="spineGradDark" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#047857" />
                        <stop offset="100%" stopColor="#064e3b" />
                      </linearGradient>
                      <linearGradient id="spineGradMid" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                      <linearGradient id="spineGradLight" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                      <linearGradient id="spineGradLime" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#86efac" />
                        <stop offset="100%" stopColor="#4ade80" />
                      </linearGradient>
                    </defs>

                    {/* Low-Poly Interlocking Polygon Shards (like Image 3) */}
                    <polygon points="0,0 180,0 140,110 0,160" fill="url(#spineGradDark)" />
                    <polygon points="0,120 140,110 180,240 0,270" fill="url(#spineGradMid)" opacity="0.95" />
                    <polygon points="0,230 180,240 130,380 0,340" fill="url(#spineGradDark)" />
                    <polygon points="0,310 130,380 175,520 0,490" fill="url(#spineGradLight)" opacity="0.9" />
                    <polygon points="0,460 175,520 140,680 0,640" fill="url(#spineGradMid)" />
                    <polygon points="0,610 140,680 180,842 0,842" fill="url(#spineGradDark)" />
                    
                    {/* Accent Triangles & Facets for Realistic Depth */}
                    <polygon points="40,90 140,110 90,190" fill="url(#spineGradLime)" opacity="0.8" />
                    <polygon points="80,220 180,240 120,320" fill="#a7f3d0" opacity="0.5" />
                    <polygon points="50,360 130,380 70,470" fill="url(#spineGradLime)" opacity="0.75" />
                    <polygon points="80,500 175,520 110,610" fill="#6ee7b7" opacity="0.6" />
                    <polygon points="60,660 140,680 90,770" fill="url(#spineGradLime)" opacity="0.7" />

                    {/* Clean Thin Geometric White Facet Lines */}
                    <line x1="180" y1="0" x2="140" y2="110" stroke="#ffffff" strokeWidth="1.5" opacity="0.7" />
                    <line x1="140" y1="110" x2="180" y2="240" stroke="#ffffff" strokeWidth="1.5" opacity="0.7" />
                    <line x1="180" y1="240" x2="130" y2="380" stroke="#ffffff" strokeWidth="1.5" opacity="0.7" />
                    <line x1="130" y1="380" x2="175" y2="520" stroke="#ffffff" strokeWidth="1.5" opacity="0.7" />
                    <line x1="175" y1="520" x2="140" y2="680" stroke="#ffffff" strokeWidth="1.5" opacity="0.7" />
                    <line x1="140" y1="680" x2="180" y2="842" stroke="#ffffff" strokeWidth="1.5" opacity="0.7" />
                  </svg>

                  {/* University Crest Logo Disc (Top-Left inside green area, exactly like Image 3) */}
                  <div className="absolute top-5 left-5 w-16 h-16 rounded-full bg-white shadow-xl p-1.5 flex items-center justify-center border-2 border-emerald-600">
                    <img 
                      src="/images/seu-logo.png" 
                      alt="SEU" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* 2. Right Content Area: Crisp White Background, Clean Left Alignment, ZERO Overlap */}
                <div className="pl-[33%] pr-6 py-6 flex-1 flex flex-col justify-between text-left relative z-10" style={{ minHeight: "840px" }}>
                  {/* Header: University & Department (Top-Right) */}
                  <div className="space-y-0.5 text-left border-b border-emerald-100 pb-2">
                    <h2 className="text-xs font-black tracking-wider text-emerald-950 uppercase">
                      SOUTHEAST UNIVERSITY
                    </h2>
                    <p className="text-[11px] font-bold text-emerald-700">
                      {coverDepartment || "Department of Computer Science and Engineering"}
                    </p>
                  </div>

                  {/* Hero Title & Course Code Tag */}
                  <div className="space-y-3 my-auto py-2">
                    <h1 className={`${getCoverTopicFontSize(coverTopic, "text-2xl sm:text-3xl")} font-black text-emerald-950 font-serif leading-tight break-words hyphens-auto`}>
                      {coverTopic || coverCourseTitle || "Mechanics of Materials Lab"}
                    </h1>
                    <div className="inline-block border-2 border-emerald-800 px-3 py-1 font-mono text-xs font-bold text-emerald-950 bg-white rounded-sm shadow-xs">
                      Course Code : {coverCourseCode || "CSE362"}
                    </div>
                    <div className="text-2xl font-bold text-slate-400 font-sans tracking-wide pt-1">
                      {coverType || "Lab Report"}
                    </div>
                  </div>

                  {/* Structured Credentials Section with Clean Emerald Divider Lines */}
                  <div className="space-y-2.5 text-xs">
                    <div className="font-bold text-xs text-emerald-950 pb-0.5">
                      Submission Date : <span className="font-mono font-bold text-slate-950">{coverSubmissionDate || "21.09.2026"}</span>
                    </div>
                    <div className="h-0.5 bg-emerald-800 w-full"></div>

                    {/* Submitted By */}
                    <div className="space-y-0.5 pt-1 text-slate-900">
                      <p className="font-black underline text-emerald-950 text-xs">Submitted By :</p>
                      <div className="pl-4 space-y-0.5 font-medium text-[11.5px]">
                        <p><span className="font-bold">Name :</span> {coverStudentName || "Md Fazle Rabbi"}</p>
                        <p><span className="font-bold">ID :</span> <span className="font-mono font-bold text-slate-950">{coverStudentID || "2023200000686"}</span></p>
                        <p><span className="font-bold">Section :</span> {coverSection || "08"}</p>
                        <p><span className="font-bold">Semester :</span> {coverSemester || "Fall 2026"}</p>
                      </div>
                    </div>

                    <div className="h-0.5 bg-emerald-800 w-full my-1.5"></div>

                    {/* Submitted To */}
                    <div className="space-y-0.5 text-slate-900">
                      <p className="font-black underline text-emerald-950 text-xs">Submitted to :</p>
                      <div className="pl-4 space-y-0.5 font-medium text-[11.5px]">
                        <p className="font-bold text-slate-950">{coverTeacherName || "Md. Nahid Anam Opu"} {coverTeacherInitial ? `(${coverTeacherInitial})` : ""}</p>
                        <p className="text-slate-700">{coverTeacherDesignation || "Lecturer"}, {coverDepartment || "Southeast University"}</p>
                        <p className="text-slate-700">Southeast University</p>
                      </div>
                    </div>

                    <div className="h-0.5 bg-emerald-800 w-full my-1.5"></div>

                    {/* Signature Footer */}
                    <div className="flex justify-between items-center text-[11px] pt-1 text-slate-700">
                      <span className="font-mono text-[10px] text-slate-500">Official SEU Lab Record</span>
                      <span className="font-bold text-slate-900">Teacher's Signature : _________________</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // 03. BOLD EDITORIAL POSTER (Franklin inspired - Image 2 in feedback / Image 4 in summary)
          if (activeTpl.layoutStyle === "bold_editorial") {
            return (
              <div className="relative w-full h-full font-sans overflow-hidden bg-white" style={{ minHeight: "840px" }}>
                {/* 1. Background Geometric Modern Planes (Top-Right and Middle-Right in Warm Mustard / Amber) */}
                <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 600 842" preserveAspectRatio="none" fill="none">
                    <defs>
                      <linearGradient id="franklinGold" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#fef08a" />
                        <stop offset="50%" stopColor="#facc15" />
                        <stop offset="100%" stopColor="#ca8a04" />
                      </linearGradient>
                      <linearGradient id="franklinAmber" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#fbbf24" />
                        <stop offset="100%" stopColor="#d97706" />
                      </linearGradient>
                      <pattern id="franklinDots" width="10" height="10" patternUnits="userSpaceOnUse">
                        <circle cx="3" cy="3" r="1.2" fill="#78350f" opacity="0.35" />
                      </pattern>
                    </defs>

                    {/* Top-Right Large Diagonal Gold Plane (like Image 4) */}
                    <polygon points="320,0 600,0 600,240 440,140" fill="url(#franklinGold)" />
                    {/* Middle-Right Diamond Shard */}
                    <polygon points="440,140 600,240 600,520 370,390" fill="url(#franklinAmber)" opacity="0.9" />
                    {/* Far-Right Triangular Accent */}
                    <polygon points="500,220 600,220 600,340" fill="#a16207" opacity="0.8" />
                    {/* Halftone Dot Matrix Accents */}
                    <rect x="520" y="140" width="60" height="70" fill="url(#franklinDots)" />
                    <rect x="20" y="440" width="50" height="60" fill="url(#franklinDots)" />
                    <rect x="540" y="740" width="50" height="50" fill="url(#franklinDots)" />
                  </svg>
                </div>

                {/* 2. Content Layer: Crisp High-Contrast Typography on Clean Space */}
                <div className="p-8 h-full flex flex-col justify-between text-left relative z-10">
                  {/* Top-Left Minimal Institution Block */}
                  <div className="space-y-0.5 max-w-xs">
                    <h2 className="text-xs font-black tracking-widest uppercase text-slate-950">
                      SOUTHEAST UNIVERSITY
                    </h2>
                    <p className="text-[10px] font-bold text-slate-700">
                      {coverDepartment || "Southeast University"}
                    </p>
                    <p className="text-[9.5px] font-mono text-slate-500">
                      Dhaka, Bangladesh • seu.edu.bd
                    </p>
                  </div>

                  {/* Giant Bold Stacked Typography (Center-Left on Clean Negative Space) */}
                  <div className="my-auto py-4 space-y-2 max-w-md">
                    <div className="space-y-0 leading-none">
                      <h1 className="text-4xl sm:text-5xl font-black text-amber-500 tracking-tight uppercase">
                        {coverType || "LAB REPORT"}
                      </h1>
                      <h2 className="text-3xl sm:text-4xl font-black text-amber-700 tracking-tight uppercase mt-1">
                        {coverCourseCode ? `${coverCourseCode} REPORT` : "ASSIGNMENT"}
                      </h2>
                      <h3 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight uppercase mt-1">
                        COVER PAGE
                      </h3>
                    </div>
                    {coverTopic && (
                      <p className="text-xs font-bold italic text-slate-700 max-w-sm pt-2 break-words hyphens-auto">
                        "{coverTopic}"
                      </p>
                    )}
                  </div>

                  {/* Clean Bottom Meta & Corner Submission Date */}
                  <div className="flex justify-between items-end pt-4 border-t border-amber-200">
                    <div className="space-y-1 text-xs">
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Submitted By:</p>
                      <p className="text-sm font-black text-slate-950 leading-tight">{coverStudentName || "Md Fazle Rabbi"}</p>
                      <p className="text-[11px] font-mono font-bold text-slate-800">STUDENT ID: {coverStudentID || "2023200000686"}</p>
                      <p className="text-[10px] font-semibold text-slate-600">COURSE: {coverCourseTitle} ({coverCourseCode}) • SEC {coverSection}</p>
                    </div>
                    <div className="text-right space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-600">SUPERVISED BY: {coverTeacherName || "MD. NAHID ANAM OPU"}</p>
                      <div className="text-[11px] font-mono font-black uppercase text-amber-950 tracking-wider bg-amber-100 px-3 py-1 border border-amber-300 rounded shadow-xs">
                        DATE OF SUBMISSION: {coverSubmissionDate || "21.09.2026"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // 04. FLOATING PILL CARDS (BUBT inspired - Image 3 in feedback / Image 5 in summary)
          if (activeTpl.layoutStyle === "floating_pill_cards") {
            return (
              <div className="relative w-full h-full font-sans overflow-hidden bg-white flex flex-col justify-between" style={{ minHeight: "840px" }}>
                {/* 1. Background Isometric Honeycomb Graphic along Left Spine */}
                <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 600 842" preserveAspectRatio="none" fill="none">
                    <defs>
                      <pattern id="bubtHexMesh" width="30" height="52" patternUnits="userSpaceOnUse">
                        <path 
                          d="M15,0 L30,8.66 L30,26 L15,34.64 L0,26 L0,8.66 Z M0,43.3 L15,34.64 M30,43.3 L15,34.64 M15,34.64 L15,52" 
                          stroke="rgba(217, 119, 6, 0.12)" 
                          strokeWidth="0.8" 
                          fill="none" 
                        />
                      </pattern>
                      <linearGradient id="bubtAmberHexTop" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#fef3c7" />
                        <stop offset="100%" stopColor="#f59e0b" />
                      </linearGradient>
                      <linearGradient id="bubtAmberHexLeft" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#d97706" />
                        <stop offset="100%" stopColor="#b45309" />
                      </linearGradient>
                      <linearGradient id="bubtAmberHexRight" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#92400e" />
                        <stop offset="100%" stopColor="#78350f" />
                      </linearGradient>
                    </defs>

                    {/* Mesh Watermark */}
                    <rect width="100%" height="100%" fill="url(#bubtHexMesh)" />

                    {/* 3D Isometric Honeycomb Cluster down the Left Spine spanning top to bottom */}
                    <g transform="translate(10, 15) scale(0.95)">
                      {/* Hexagon 1: Top Warm Amber / Copper */}
                      <g transform="translate(0, 0)">
                        <polygon points="55,5 95,28 55,51 15,28" fill="url(#bubtAmberHexTop)" />
                        <polygon points="15,28 55,51 55,97 15,74" fill="url(#bubtAmberHexLeft)" />
                        <polygon points="55,51 95,28 95,74 55,97" fill="url(#bubtAmberHexRight)" />
                      </g>
                      {/* Hexagon 2: Deep Charcoal */}
                      <g transform="translate(-10, 75)">
                        <polygon points="55,10 95,33 55,56 15,33" fill="#334155" />
                        <polygon points="15,33 55,56 55,102 15,79" fill="#1e293b" />
                        <polygon points="55,56 95,33 95,79 55,102" fill="#0f172a" />
                      </g>
                      {/* Hexagon 3: Amber Glow */}
                      <g transform="translate(10, 150)">
                        <polygon points="50,8 86,28 50,49 14,28" fill="#fde68a" />
                        <polygon points="14,28 50,49 50,90 14,69" fill="#d97706" />
                        <polygon points="50,49 86,28 86,69 50,90" fill="#92400e" />
                      </g>
                      {/* Hexagon 4: Dark Charcoal */}
                      <g transform="translate(-15, 225)">
                        <polygon points="55,10 95,33 55,56 15,33" fill="#334155" />
                        <polygon points="15,33 55,56 55,102 15,79" fill="#1e293b" />
                        <polygon points="55,56 95,33 95,79 55,102" fill="#0f172a" />
                      </g>
                      {/* Hexagon 5: Amber Accent */}
                      <g transform="translate(15, 305)">
                        <polygon points="40,6 70,22 40,38 10,22" fill="#fbbf24" />
                        <polygon points="10,22 40,38 40,70 10,54" fill="#b45309" />
                        <polygon points="40,38 70,22 70,54 40,70" fill="#78350f" />
                      </g>
                      {/* Hexagon 6: Mid Deep Charcoal behind banner */}
                      <g transform="translate(-12, 390)">
                        <polygon points="55,10 95,33 55,56 15,33" fill="#334155" />
                        <polygon points="15,33 55,56 55,102 15,79" fill="#1e293b" />
                        <polygon points="55,56 95,33 95,79 55,102" fill="#0f172a" />
                      </g>
                      {/* Hexagon 7: Lower Amber Cluster */}
                      <g transform="translate(8, 485)">
                        <polygon points="55,5 95,28 55,51 15,28" fill="url(#bubtAmberHexTop)" />
                        <polygon points="15,28 55,51 55,97 15,74" fill="url(#bubtAmberHexLeft)" />
                        <polygon points="55,51 95,28 95,74 55,97" fill="url(#bubtAmberHexRight)" />
                      </g>
                      {/* Hexagon 8: Deep Charcoal Base */}
                      <g transform="translate(-10, 580)">
                        <polygon points="50,8 86,28 50,49 14,28" fill="#475569" />
                        <polygon points="14,28 50,49 50,90 14,69" fill="#1e293b" />
                        <polygon points="50,49 86,28 86,69 50,90" fill="#0f172a" />
                      </g>
                      {/* Hexagon 9: Bottom Warm Amber Accent */}
                      <g transform="translate(12, 660)">
                        <polygon points="40,6 70,22 40,38 10,22" fill="#fbbf24" />
                        <polygon points="10,22 40,38 40,70 10,54" fill="#b45309" />
                        <polygon points="40,38 70,22 70,54 40,70" fill="#78350f" />
                      </g>
                    </g>
                  </svg>
                </div>

                {/* 2. Content Layer: Floating Solid White Rounded Pill Cards Balanced Across Full Height */}
                <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between text-left relative z-10" style={{ minHeight: "840px" }}>
                  {/* Top-Right Title Block */}
                  <div className="flex justify-end text-right">
                    <div className="space-y-1">
                      <h1 className="text-2xl sm:text-3xl font-black text-amber-900 uppercase tracking-wider leading-none">
                        {coverCourseTitle || "PHYSICS"}
                      </h1>
                      <p className="text-base sm:text-lg font-black text-slate-800 tracking-widest uppercase">
                        {coverType || "LAB REPORT"}
                      </p>
                      <p className="text-xs sm:text-sm font-mono font-extrabold text-slate-600 tracking-wider">
                        INTAKE / SEC: {coverSection || "54"}
                      </p>
                    </div>
                  </div>

                  {/* Floating Rounded Card 1: Course Details (Solid Opaque White Background) */}
                  <div className="ml-auto w-84 sm:w-[380px] rounded-2xl border-2 border-amber-600/70 bg-white shadow-lg p-4 text-left text-xs sm:text-[13px] space-y-2">
                    <p><span className="font-bold text-slate-700">Course Code: </span><span className="font-mono font-black text-slate-950">{coverCourseCode || "102"}</span></p>
                    <p><span className="font-bold text-slate-700">Course Title: </span><span className="font-bold text-slate-950">{coverCourseTitle || "Physics Lab"}</span></p>
                    <p><span className="font-bold text-slate-700">Experiment No.: </span><span className="font-black text-slate-950">{coverExpNo || "01"}</span></p>
                    <p className="break-words hyphens-auto"><span className="font-bold text-slate-700">Experiment Name: </span><span className="font-semibold text-slate-900">{coverTopic || "Familiarization with Vernier Calipers and Screw Gauge"}</span></p>
                  </div>

                  {/* Dark Solid Ribbon Center Banner */}
                  <div className="w-full bg-[#1e293b] text-white py-3.5 px-6 flex items-center justify-center gap-4 shadow-xl rounded-xl">
                    <img src="/images/seu-logo.png" alt="SEU" className="w-10 h-10 object-contain bg-white rounded-full p-1 shrink-0" />
                    <div className="text-left">
                      <p className="font-black text-sm uppercase tracking-wider">SOUTHEAST UNIVERSITY</p>
                      <p className="text-xs text-slate-300 font-medium">{coverDepartment || "Southeast University"}</p>
                    </div>
                  </div>

                  {/* Two Floating Rounded 3D Cards */}
                  <div className="grid grid-cols-2 gap-4 text-left">
                    {/* Left Card: Submitted By */}
                    <div className="rounded-2xl border-2 border-amber-600/70 bg-white shadow-lg p-4 text-xs space-y-1.5">
                      <p className="font-black underline text-amber-950 text-sm mb-1.5">Submitted By</p>
                      <p><span className="font-bold text-slate-700">Name: </span><span className="font-bold text-slate-950">{coverStudentName || "Md Fazle Rabbi"}</span></p>
                      <p><span className="font-bold text-slate-700">Section: </span><span className="text-slate-900">{coverSection || "08"}</span></p>
                      <p><span className="font-bold text-slate-700">ID No.: </span><span className="font-mono font-black text-slate-950">{coverStudentID || "2023200000686"}</span></p>
                      <p><span className="font-bold text-slate-700">Program: </span><span className="text-slate-900">{coverDepartment || "Southeast University"}</span></p>
                    </div>

                    {/* Right Card: Submitted To */}
                    <div className="rounded-2xl border-2 border-amber-600/70 bg-white shadow-lg p-4 text-xs space-y-1.5">
                      <p className="font-black underline text-amber-950 text-sm mb-1.5">Submitted To</p>
                      <p><span className="font-bold text-slate-700">Name: </span><span className="font-bold text-slate-950">{coverTeacherName || "Md. Nahid Anam Opu"}</span></p>
                      <p><span className="font-bold text-slate-700">Department: </span><span className="text-slate-900">{coverTeacherDesignation || "Lecturer"}, {coverDepartment || "Southeast University"}</span></p>
                      <p className="text-[11px] text-slate-600 pt-1 font-medium">Southeast University (SEU)</p>
                    </div>
                  </div>

                  {/* Bottom Footer Bar */}
                  <div className="flex justify-between items-center text-xs sm:text-sm font-bold text-slate-800 pt-3 border-t border-slate-300">
                    <p>Submitted Date: <span className="font-mono font-bold text-slate-950">{coverSubmissionDate || "21.09.2026"}</span></p>
                    <p>Teacher's Signature : _________________</p>
                  </div>
                </div>
              </div>
            );
          }

          // 05. HEX SPEC CHECKLIST & BADGE (Peripheral inspired - Image 4)
          if (activeTpl.layoutStyle === "hex_spec_badge") {
            return (
              <div className="flex-1 flex flex-col justify-between w-full p-4 font-sans text-left" style={{ minHeight: "840px" }}>
                {/* Top-Right Title */}
                <div className="text-right space-y-0.5 pr-2">
                  <h1 className="text-xl sm:text-2xl font-black text-blue-900 tracking-tight">
                    {coverCourseTitle || "Peripheral Interface"}
                  </h1>
                  <h2 className="text-xl sm:text-2xl font-black text-blue-900 tracking-tight">
                    {coverType || "Lab Report's"}
                  </h2>
                  <p className="text-[10px] font-mono font-bold text-slate-500">{coverDepartment ? coverDepartment.toUpperCase() : "SOUTHEAST UNIVERSITY"}</p>
                </div>

                {/* Checklist & Golden Hexagon Badge */}
                <div className="flex justify-between items-end my-auto py-4">
                  <div className="space-y-2 text-left pl-2 font-sans">
                    <p className="text-xs sm:text-sm font-black text-blue-950 break-words hyphens-auto">▪ Lab -1 : {coverTopic || "Process Synchronization & Fork"}</p>
                    <p className="text-xs sm:text-sm font-black text-blue-950">▪ Lab -2 : Memory Paging & Virtual Addressing</p>
                    <p className="text-xs sm:text-sm font-black text-blue-950">▪ Lab -3 : Device Driver & Kernel Interfacing</p>
                  </div>

                  {/* Hexagon Yellow Badge */}
                  <div className="w-16 h-16 bg-amber-400 text-amber-950 flex flex-col items-center justify-center font-bold shadow-md rounded-xl rotate-3 border-2 border-amber-500 shrink-0">
                    <span className="text-[8.5px] uppercase tracking-wider">Pages</span>
                    <span className="text-sm font-black">15</span>
                  </div>
                </div>

                {/* Bottom Specs Card */}
                <div className="border border-blue-900/40 bg-white shadow-xs rounded-xl p-3 text-left text-xs space-y-1.5">
                  <div className="flex justify-between items-center border-b border-blue-200 pb-1">
                    <span className="font-bold text-blue-950">Course: {coverCourseCode || "CSE362"} • Section: {coverSection || "8"}</span>
                    <span className="font-mono font-bold text-blue-900">Submission Date: {coverSubmissionDate || "21.09.2026"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-600 block text-[10px]">Submitted By:</span>
                      <span className="font-black text-slate-950">{coverStudentName || "Md Fazle Rabbi"}</span> <span className="font-mono text-slate-700">({coverStudentID || "2023200000686"})</span>
                    </div>
                    <div>
                      <span className="text-slate-600 block text-[10px]">Supervised By:</span>
                      <span className="font-black text-slate-950">{coverTeacherName || "Md. Nahid Anam Opu"}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Syllabus Note */}
                <p className="text-[10px] text-slate-500 italic text-center pt-2">
                  The Southeast University Academic Curriculum is a verified syllabus.
                </p>
              </div>
            );
          }

          // 08. SWISS MINIMALIST STRIPE (Template #08)
          if (activeTpl.layoutStyle === "swiss_minimal") {
            return (
              <div className="flex-1 flex flex-col justify-between w-full pl-8 pr-2 py-4 text-left font-sans" style={{ minHeight: "840px" }}>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-8 bg-blue-600 inline-block"></span>
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-800">
                      SOUTHEAST UNIVERSITY // {coverDepartment ? coverDepartment.toUpperCase() : "ACADEMIC"}
                    </span>
                  </div>
                  <div>
                    <h1 className={`${getCoverTopicFontSize(coverTopic, "text-2xl sm:text-3xl")} font-black text-slate-950 tracking-tight leading-none uppercase break-words hyphens-auto`}>
                      {coverTopic || "Operating Systems Architecture"}
                    </h1>
                    <p className="text-xs font-mono font-bold text-blue-600 mt-2 uppercase tracking-wider">
                      {coverType || "ASSIGNMENT"} • {coverCourseCode || "CSE362"}
                    </p>
                  </div>
                </div>

                <div className="border-t border-b border-slate-900 py-6 my-auto grid grid-cols-2 gap-8 text-xs">
                  <div className="space-y-1">
                    <p className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Student Candidate</p>
                    <p className="text-sm font-black text-slate-950">{coverStudentName || "Md Fazle Rabbi"}</p>
                    <p className="font-mono font-bold text-slate-800">ID: {coverStudentID || "2023200000686"}</p>
                    <p className="text-slate-600">Section: {coverSection || "8"} • {coverSemester || "Fall 2026"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">Faculty Reviewer</p>
                    <p className="text-sm font-black text-slate-950">{coverTeacherName || "Md. Nahid Anam Opu"}</p>
                    <p className="text-slate-800">{coverTeacherDesignation || "Lecturer"}, {coverDepartment || "Southeast University"}</p>
                    <p className="text-slate-600">Southeast University</p>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-500 uppercase border-t border-slate-200 pt-2">
                  <span>COURSE: {coverCourseTitle}</span>
                  <span>DATE OF SUBMISSION: {coverSubmissionDate || "21.09.2026"}</span>
                </div>
              </div>
            );
          }

          // 09. CYBER TERMINAL DEVELOPER (Template #09)
          if (activeTpl.layoutStyle === "cyber_terminal") {
            return (
              <div className="flex-1 flex flex-col justify-between w-full text-left font-mono text-xs p-2" style={{ minHeight: "840px" }}>
                <div className="bg-slate-900 text-emerald-400 p-2.5 rounded-t-lg flex items-center justify-between border-b border-slate-700">
                  <span className="font-bold flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                    <span>SEU_TERMINAL // ACADEMIC_KERNEL_V2.4</span>
                  </span>
                  <span className="text-[10px] text-slate-400">ENCODING: UTF-8</span>
                </div>

                <div className="bg-slate-950 text-slate-100 p-4 border-x border-slate-800 space-y-1 text-[11px] leading-relaxed my-auto rounded-b-lg">
                  <p className="text-blue-400">// Academic Submission Manifest</p>
                  <p className="text-purple-400">const <span className="text-yellow-300">submissionRecord</span> = &#123;</p>
                  <p className="pl-4"><span className="text-sky-300">"university"</span>: <span className="text-emerald-300">"Southeast University"</span>,</p>
                  <p className="pl-4"><span className="text-sky-300">"documentType"</span>: <span className="text-emerald-300">"{coverType || "LAB REPORT"}"</span>,</p>
                  <p className="pl-4"><span className="text-sky-300">"courseCode"</span>: <span className="text-emerald-300">"{coverCourseCode || "CSE362"}"</span>,</p>
                  <p className="pl-4"><span className="text-sky-300">"courseTitle"</span>: <span className="text-emerald-300">"{coverCourseTitle || "Operating Systems"}"</span>,</p>
                  <p className="pl-4 break-words hyphens-auto"><span className="text-sky-300">"experimentTitle"</span>: <span className="text-emerald-300">"{coverTopic || "Thread Scheduling & Kernel Tracing"}"</span>,</p>
                  <p className="pl-4"><span className="text-sky-300">"submittedBy"</span>: &#123;</p>
                  <p className="pl-8"><span className="text-sky-300">"name"</span>: <span className="text-amber-300">"{coverStudentName || "Md Fazle Rabbi"}"</span>,</p>
                  <p className="pl-8"><span className="text-sky-300">"id"</span>: <span className="text-amber-300">"{coverStudentID || "2023200000686"}"</span>,</p>
                  <p className="pl-8"><span className="text-sky-300">"section"</span>: <span className="text-amber-300">"{coverSection || "8"}"</span></p>
                  <p className="pl-4">&#125;,</p>
                  <p className="pl-4"><span className="text-sky-300">"evaluatedBy"</span>: <span className="text-emerald-300">"{coverTeacherName || "Md. Nahid Anam Opu"}"</span>,</p>
                  <p className="pl-4"><span className="text-sky-300">"submissionDate"</span>: <span className="text-emerald-300">"{coverSubmissionDate || "21.09.2026"}"</span></p>
                  <p className="text-purple-400">&#125;;</p>
                </div>

                <div className="bg-slate-900 text-slate-300 p-2.5 rounded-lg border border-slate-700 flex justify-between items-center text-[10px]">
                  <span className="text-emerald-400 font-bold">● BUILD: PASSING [0 ERRORS]</span>
                  <span className="text-slate-400">SHA256: 7f8a9...b12</span>
                </div>
              </div>
            );
          }

          // 15. CAPSTONE MULTI-MEMBER TEAM (Template #15)
          if (activeTpl.layoutStyle === "team_capstone") {
            return (
              <div className="flex-1 flex flex-col justify-between w-full text-center space-y-3 font-sans" style={{ minHeight: "840px" }}>
                <div className="space-y-1">
                  <img src="/images/seu-logo.png" alt="SEU" className="w-14 h-14 object-contain mx-auto" />
                  <h1 className="text-base font-black text-blue-900 uppercase">SOUTHEAST UNIVERSITY</h1>
                  <p className="text-[11px] font-bold text-slate-600">Senior Capstone Design Project • {coverDepartment || "Academic Department"}</p>
                </div>

                <div className="border-y-2 border-blue-950 py-2.5 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-800">FINAL YEAR CAPSTONE DESIGN PROJECT</span>
                  <h2 className={`${getCoverTopicFontSize(coverTopic, "text-base sm:text-lg")} font-black text-slate-950 break-words hyphens-auto`}>{coverTopic || "Autonomous Drone Navigation System"}</h2>
                  <p className="text-[11px] font-bold text-slate-600">Course: {coverCourseTitle} ({coverCourseCode}) • Section {coverSection}</p>
                </div>

                {/* Team Members Table */}
                <div className="text-left text-xs max-w-lg mx-auto w-full">
                  <p className="font-black uppercase text-[10px] mb-1 text-blue-950">Project Team Members:</p>
                  <div className="border border-blue-900 overflow-hidden text-[11px]">
                    <div className="grid grid-cols-12 bg-blue-900 text-white font-bold p-1">
                      <span className="col-span-2 text-center">SL</span>
                      <span className="col-span-6">Student Name</span>
                      <span className="col-span-4 font-mono">Student ID</span>
                    </div>
                    {coverTeamMembers.filter(m => m.name || m.id).map((m, idx) => (
                      <div key={idx} className={`grid grid-cols-12 p-1 border-t border-blue-200 ${idx % 2 === 0 ? "bg-white" : "bg-blue-50/50"}`}>
                        <span className="col-span-2 text-center font-bold">{idx + 1}</span>
                        <span className="col-span-6 font-bold text-slate-900">{m.name}</span>
                        <span className="col-span-4 font-mono font-bold text-blue-950">{m.id}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dual Supervision */}
                <div className="grid grid-cols-2 gap-3 text-left text-xs max-w-lg mx-auto w-full">
                  <div className="border border-blue-900 p-2 bg-white shadow-xs rounded-lg">
                    <p className="font-black uppercase text-[10px] text-blue-950 mb-0.5">Project Supervisor</p>
                    <p className="font-bold text-slate-950">{coverTeacherName || "Md. Nahid Anam Opu"}</p>
                    <p className="text-[10px] text-slate-700">{coverTeacherDesignation || "Lecturer"}, {coverDepartment || "Southeast University"}</p>
                    <p className="text-[10px] text-slate-600">Southeast University</p>
                  </div>
                  <div className="border border-blue-900 p-2 bg-white shadow-xs rounded-lg flex flex-col justify-between">
                    <div>
                      <p className="font-black uppercase text-[10px] text-blue-950 mb-0.5">Defense Committee</p>
                      <p className="text-[10px] text-slate-700">Approval & Evaluation Panel</p>
                    </div>
                    <p className="text-[9.5px] font-bold text-slate-600 pt-1 border-t border-slate-300">Signature: __________________</p>
                  </div>
                </div>

                <div className="text-center font-mono text-xs font-bold text-blue-950 pt-1">
                  Submission Date: {coverSubmissionDate || "21.09.2026"}
                </div>
              </div>
            );
          }

          // 12. CASE STUDY ANALYTICAL GRID (Template #12)
          if (activeTpl.layoutStyle === "casestudy_analytical") {
            return (
              <div className="flex-1 flex flex-col justify-between w-full text-left font-sans text-xs p-4" style={{ minHeight: "840px" }}>
                <div className="border-b-2 border-blue-900 pb-2 flex items-center justify-between">
                  <div>
                    <h1 className="text-base font-black text-blue-950 uppercase">SOUTHEAST UNIVERSITY</h1>
                    <p className="text-[11px] font-bold text-slate-600">Executive Case Study & Systems Analysis</p>
                  </div>
                  <img src="/images/seu-logo.png" alt="SEU" className="w-12 h-12 object-contain" />
                </div>

                <div className="bg-white shadow-xs p-4 border-l-4 border-blue-800 border-y border-r border-slate-200 rounded-r-lg my-4 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-800">CASE STUDY SPECIFICATION</span>
                  <h2 className={`${getCoverTopicFontSize(coverTopic, "text-xl")} font-black text-slate-950 break-words hyphens-auto`}>{coverTopic || "Distributed Microservices Scalability Under Peak Load"}</h2>
                  <p className="text-xs text-slate-700">Course: <span className="font-bold">{coverCourseTitle}</span> ({coverCourseCode}) • Sec: <span className="font-bold">{coverSection}</span></p>
                </div>

                <div className="grid grid-cols-2 gap-4 my-auto">
                  <div className="border border-slate-300 p-3 rounded-lg bg-white space-y-1">
                    <p className="font-black uppercase text-[10px] text-slate-500">Principal Analyst</p>
                    <p className="text-sm font-black text-slate-950">{coverStudentName || "Md Fazle Rabbi"}</p>
                    <p className="font-mono text-xs font-bold text-blue-950">ID: {coverStudentID || "2023200000686"}</p>
                    <p className="text-slate-600 text-[11px]">Dept: {coverDepartment || "Southeast University"}</p>
                  </div>
                  <div className="border border-slate-300 p-3 rounded-lg bg-white space-y-1">
                    <p className="font-black uppercase text-[10px] text-slate-500">Faculty Reviewer</p>
                    <p className="text-sm font-black text-slate-950">{coverTeacherName || "Md. Nahid Anam Opu"}</p>
                    <p className="text-xs font-bold text-slate-700">{coverTeacherDesignation || "Lecturer"}</p>
                    <p className="text-slate-600 text-[11px]">Southeast University</p>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-xs text-slate-700 font-medium">
                  <span>Southeast University • Academic Publication</span>
                  <span className="font-mono font-bold text-blue-950">Submission Date: {coverSubmissionDate || "21.09.2026"}</span>
                </div>
              </div>
            );
          }

          // 13. SEMINAR PRESENTATION KEYNOTE (Template #13)
          if (activeTpl.layoutStyle === "seminar_keynote") {
            return (
              <div className="flex flex-col justify-between h-full text-center space-y-4 p-4 font-sans">
                <div className="space-y-1">
                  <img src="/images/seu-logo.png" alt="SEU" className="w-16 h-16 object-contain mx-auto" />
                  <h1 className="text-lg font-black text-amber-950 uppercase">SOUTHEAST UNIVERSITY</h1>
                  <p className="text-xs font-bold text-amber-800">{coverDepartment || "Southeast University"}</p>
                </div>

                <div className="bg-white shadow-xs border-2 border-amber-600/60 p-4 rounded-xl space-y-2 max-w-lg mx-auto w-full my-auto">
                  <span className="inline-block px-4 py-1 rounded-full bg-amber-600 text-white font-black text-[11px] uppercase tracking-widest">
                    KEYNOTE SEMINAR COLLOQUIUM
                  </span>
                  <h2 className={`${getCoverTopicFontSize(coverTopic, "text-xl")} font-black text-slate-950 break-words hyphens-auto`}>{coverTopic || "Next-Generation Container Orchestration with Kubernetes"}</h2>
                  <p className="text-xs font-bold text-slate-700">Course: {coverCourseTitle} ({coverCourseCode}) • Section {coverSection}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-left text-xs max-w-lg mx-auto w-full">
                  <div className="border border-amber-500/50 p-3 rounded-lg bg-white">
                    <p className="font-black uppercase text-[10px] text-amber-900 mb-1">Keynote Speaker</p>
                    <p className="font-black text-slate-950 text-sm">{coverStudentName || "Md Fazle Rabbi"}</p>
                    <p className="font-mono text-xs font-bold text-slate-800">ID: {coverStudentID || "2023200000686"}</p>
                    <p className="text-slate-600 text-[11px]">{coverDepartment || "Degree Program"} • Semester {coverSemester || "Fall 2026"}</p>
                  </div>
                  <div className="border border-amber-500/50 p-3 rounded-lg bg-white">
                    <p className="font-black uppercase text-[10px] text-amber-900 mb-1">Evaluation Panel</p>
                    <p className="font-black text-slate-950 text-sm">{coverTeacherName || "Md. Nahid Anam Opu"}</p>
                    <p className="text-xs font-bold text-slate-800">{coverTeacherDesignation || "Lecturer"}</p>
                    <p className="text-slate-600 text-[11px]">Southeast University</p>
                  </div>
                </div>

                <div className="text-xs font-bold text-amber-950 pt-1">
                  Venue: SEU Main Auditorium • Date: <span className="font-mono">{coverSubmissionDate || "21.09.2026"}</span>
                </div>
              </div>
            );
          }

          // 14. TRIPARTITE INTERNSHIP ATTACHMENT (Template #14)
          if (activeTpl.layoutStyle === "internship_tripartite") {
            return (
              <div className="flex flex-col justify-between h-full text-center space-y-4 p-4 font-sans">
                <div className="space-y-1">
                  <img src="/images/seu-logo.png" alt="SEU" className="w-16 h-16 object-contain mx-auto" />
                  <h1 className="text-lg font-black text-blue-900 uppercase">SOUTHEAST UNIVERSITY</h1>
                  <p className="text-xs font-bold text-slate-700">{coverDepartment || "Southeast University"}</p>
                </div>

                <div className="bg-white shadow-xs border-y-2 border-blue-900 py-3 space-y-1 max-w-lg mx-auto w-full my-auto">
                  <span className="text-xs font-black uppercase tracking-widest text-blue-900">INTERNSHIP & INDUSTRIAL ATTACHMENT REPORT</span>
                  <p className="text-sm font-bold">at <span className="font-black underline text-slate-950">{coverOrganization || "Brain Station 23 PLC"}</span></p>
                  <p className="text-xs text-slate-700">Role: <span className="font-bold text-slate-950">{coverInternRole || "Software Engineer Intern"}</span> • Period: <span className="font-bold font-mono">{coverInternPeriod || "June 2026 – August 2026"}</span></p>
                </div>

                {/* 3-Way Supervisor Boxes */}
                <div className="grid grid-cols-3 gap-2 text-left text-[11px] max-w-lg mx-auto w-full">
                  <div className="border border-blue-900 p-2.5 bg-white shadow-xs rounded-lg">
                    <p className="font-black text-[10px] uppercase underline mb-1 text-blue-950">Student Trainee</p>
                    <p className="font-black text-slate-950">{coverStudentName || "Md Fazle Rabbi"}</p>
                    <p className="font-mono font-bold text-slate-800">{coverStudentID || "2023200000686"}</p>
                    <p className="text-slate-600 text-[10px]">{coverDepartment || "Southeast University"}</p>
                  </div>
                  <div className="border border-blue-900 p-2.5 bg-white shadow-xs rounded-lg">
                    <p className="font-black text-[10px] uppercase underline mb-1 text-blue-950">Academic Advisor</p>
                    <p className="font-black text-slate-950">{coverTeacherName || "Md. Nahid Anam Opu"}</p>
                    <p className="text-slate-700 text-[10px]">{coverTeacherDesignation || "Lecturer"}, {coverDepartment || "Southeast University"}</p>
                    <p className="text-slate-600 text-[10px]">Southeast University</p>
                  </div>
                  <div className="border border-blue-900 p-2.5 bg-white shadow-xs rounded-lg">
                    <p className="font-black text-[10px] uppercase underline mb-1 text-blue-950">Industry Mentor</p>
                    <p className="font-black text-slate-950">{coverIndustrySupervisor || "Senior Tech Lead"}</p>
                    <p className="text-slate-700 text-[10px]">{coverOrganization || "Tech Enterprise"}</p>
                    <p className="text-slate-600 text-[10px]">Industry Mentor</p>
                  </div>
                </div>

                <div className="text-xs font-mono font-bold text-blue-950 pt-1">
                  Submission Date: {coverSubmissionDate || "21.09.2026"}
                </div>
              </div>
            );
          }

          // 07. PRESTIGE ARCH HONORS / THESIS (Template #07)
          if (activeTpl.layoutStyle === "prestige_honors") {
            return (
              <div className="flex flex-col justify-between h-full text-center space-y-4 py-2 font-serif">
                <div className="space-y-1">
                  <img src="/images/seu-logo.png" alt="SEU" className="w-16 h-16 object-contain mx-auto" />
                  <h1 className="text-xl font-bold tracking-widest text-slate-900 uppercase">SOUTHEAST UNIVERSITY</h1>
                  <p className="text-xs font-sans font-bold text-slate-600 tracking-wide uppercase">{coverDepartment || "Southeast University"}</p>
                </div>

                <div className="space-y-3 my-auto max-w-lg mx-auto">
                  <p className="text-xs font-sans uppercase tracking-widest text-slate-500">A DISSERTATION & THESIS ON</p>
                  <h2 className={`${getCoverTopicFontSize(coverTopic, "text-xl")} font-bold text-slate-950 italic leading-snug break-words hyphens-auto`}>
                    “{coverTopic || "High-Performance Distributed Graph Algorithms on Multi-Core GPU Architectures"}”
                  </h2>
                  <p className="text-xs font-sans text-slate-600 leading-relaxed max-w-md mx-auto">
                    Submitted in Partial Fulfillment of the Requirements for the Degree of<br />
                    <span className="font-bold text-slate-800">Degree Program • {coverDepartment || "Southeast University"}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6 text-left text-xs font-sans max-w-lg mx-auto w-full border-t border-slate-300 pt-4">
                  <div className="space-y-1">
                    <p className="font-black text-[10px] uppercase tracking-wider text-slate-500">Candidate</p>
                    <p className="font-bold text-slate-950 text-sm">{coverStudentName || "Md Fazle Rabbi"}</p>
                    <p className="font-mono text-slate-800 font-bold">Student ID: {coverStudentID || "2023200000686"}</p>
                    <p className="text-slate-600">{coverDepartment || "Southeast University"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-black text-[10px] uppercase tracking-wider text-slate-500">Dissertation Supervisor</p>
                    <p className="font-bold text-slate-950 text-sm">{coverTeacherName || "Md. Nahid Anam Opu"}</p>
                    <p className="text-slate-800 font-medium">{coverTeacherDesignation || "Lecturer"}, {coverDepartment || "Southeast University"}</p>
                    <p className="text-slate-600">Southeast University</p>
                  </div>
                </div>

                <div className="font-sans text-xs font-bold text-slate-800 pt-1">
                  Date of Submission: <span className="font-mono">{coverSubmissionDate || "21.09.2026"}</span>
                </div>
              </div>
            );
          }

          // 10. CLASSICAL COLUMN / TERM PAPER (Template #10)
          if (activeTpl.layoutStyle === "classical_column") {
            return (
              <div className="flex flex-col justify-between h-full text-center space-y-4 py-2 font-serif">
                <div className="space-y-1">
                  <img src="/images/seu-logo.png" alt="SEU" className="w-16 h-16 object-contain mx-auto" />
                  <h1 className="text-lg font-bold tracking-widest text-slate-950 uppercase">SOUTHEAST UNIVERSITY</h1>
                  <p className="text-xs font-sans font-bold text-slate-600 uppercase">{coverDepartment || "Southeast University"}</p>
                </div>

                <div className="border-t-2 border-b-2 border-slate-900 py-6 my-auto space-y-2 max-w-lg mx-auto w-full">
                  <span className="font-sans text-xs font-black uppercase tracking-widest text-slate-700">ACADEMIC RESEARCH TERM PAPER</span>
                  <h2 className={`${getCoverTopicFontSize(coverTopic, "text-xl")} font-bold text-slate-950 italic break-words hyphens-auto`}>
                    {coverTopic || "A Comprehensive Survey of Memory Safety in Modern Systems Languages"}
                  </h2>
                  <p className="font-sans text-xs text-slate-600">
                    Course: <span className="font-bold text-slate-950">{coverCourseTitle}</span> ({coverCourseCode}) • Section {coverSection}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-left font-sans text-xs max-w-lg mx-auto w-full">
                  <div className="border-l-2 border-slate-900 pl-3 space-y-0.5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Author</p>
                    <p className="font-bold text-slate-950">{coverStudentName || "Md Fazle Rabbi"}</p>
                    <p className="font-mono text-slate-800">ID: {coverStudentID || "2023200000686"}</p>
                    <p className="text-slate-600">Semester: {coverSemester || "Fall 2026"}</p>
                  </div>
                  <div className="border-l-2 border-slate-900 pl-3 space-y-0.5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Course Instructor</p>
                    <p className="font-bold text-slate-950">{coverTeacherName || "Md. Nahid Anam Opu"}</p>
                    <p className="text-slate-800">{coverTeacherDesignation || "Lecturer"}, {coverDepartment || "Southeast University"}</p>
                    <p className="text-slate-600">Southeast University</p>
                  </div>
                </div>

                <div className="font-sans text-xs font-bold text-slate-800 pt-1 border-t border-slate-300">
                  Date of Submission: <span className="font-mono">{coverSubmissionDate || "21.09.2026"}</span>
                </div>
              </div>
            );
          }

          // 11. GEOMETRIC ANGULAR TECH (Template #11)
          if (activeTpl.layoutStyle === "geometric_tech_layout") {
            return (
              <div className="flex flex-col justify-between h-full text-left font-sans text-xs p-4">
                <div className="flex justify-between items-start border-b-2 border-cyan-700 pb-3">
                  <div>
                    <h1 className="text-base font-black text-cyan-950 uppercase tracking-wider">SOUTHEAST UNIVERSITY</h1>
                    <p className="text-[11px] font-bold text-cyan-800">{coverDepartment || "Southeast University"}</p>
                  </div>
                  <img src="/images/seu-logo.png" alt="SEU" className="w-12 h-12 object-contain" />
                </div>

                <div className="bg-white shadow-xs border border-cyan-300 p-4 rounded-xl my-4 space-y-2">
                  <span className="inline-block px-3 py-1 rounded bg-cyan-700 text-white font-mono text-[10px] font-bold uppercase tracking-wider">
                    RESEARCH PROJECT PROPOSAL
                  </span>
                  <h2 className={`${getCoverTopicFontSize(coverTopic, "text-xl")} font-black text-slate-950 break-words hyphens-auto`}>{coverTopic || "IoT-Enabled Smart Grid Monitoring Infrastructure"}</h2>
                  <p className="text-xs text-slate-700">Course: <span className="font-bold">{coverCourseTitle}</span> ({coverCourseCode}) • Sec: <span className="font-bold">{coverSection}</span></p>
                </div>

                <div className="grid grid-cols-2 gap-3 my-auto">
                  <div className="border border-cyan-800/40 p-3 rounded-lg bg-white space-y-1">
                    <p className="font-black uppercase text-[10px] text-cyan-900">Principal Applicant</p>
                    <p className="font-black text-slate-950 text-sm">{coverStudentName || "Md Fazle Rabbi"}</p>
                    <p className="font-mono text-xs font-bold text-cyan-950">ID: {coverStudentID || "2023200000686"}</p>
                    <p className="text-slate-600 text-[11px]">{coverDepartment || "Degree Program"} • Semester {coverSemester || "Fall 2026"}</p>
                  </div>
                  <div className="border border-cyan-800/40 p-3 rounded-lg bg-white space-y-1">
                    <p className="font-black uppercase text-[10px] text-cyan-900">Faculty Supervisor</p>
                    <p className="font-black text-slate-950 text-sm">{coverTeacherName || "Md. Nahid Anam Opu"}</p>
                    <p className="text-xs font-bold text-slate-700">{coverTeacherDesignation || "Lecturer"}</p>
                    <p className="text-slate-600 text-[11px]">Southeast University</p>
                  </div>
                </div>

                <div className="border-t border-cyan-200 pt-3 flex justify-between items-center text-xs text-slate-700 font-bold">
                  <span className="text-cyan-900">Status: FORMAL SUBMISSION</span>
                  <span className="font-mono">Submission Date: {coverSubmissionDate || "21.09.2026"}</span>
                </div>
              </div>
            );
          }

          // 06. MODERN EXECUTIVE WAVE (Template #06)
          if (activeTpl.layoutStyle === "executive_wave") {
            return (
              <div className="flex flex-col justify-between h-full text-left font-sans text-xs p-4">
                <div className="flex items-center gap-3 border-b border-blue-200 pb-3">
                  <img src="/images/seu-logo.png" alt="SEU" className="w-14 h-14 object-contain" />
                  <div>
                    <h1 className="text-base font-black text-blue-950 uppercase tracking-wide">SOUTHEAST UNIVERSITY</h1>
                    <p className="text-xs font-bold text-blue-800">{coverDepartment || "Southeast University"}</p>
                  </div>
                </div>

                <div className="space-y-3 my-auto py-4">
                  <span className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-900 font-black text-xs uppercase tracking-widest border border-blue-300">
                    {coverType || "PROJECT REPORT"}
                  </span>
                  <h2 className={`${getCoverTopicFontSize(coverTopic, "text-2xl")} font-black text-slate-950 tracking-tight leading-tight break-words hyphens-auto`}>
                    “{coverTopic || "NextGen Distributed Microservice Architecture"}”
                  </h2>
                  <p className="text-xs font-bold text-slate-600">
                    Course: <span className="text-slate-900">{coverCourseTitle}</span> ({coverCourseCode}) • Section {coverSection}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-blue-200 rounded-xl p-3.5 bg-white shadow-xs space-y-1">
                    <p className="font-black text-[10px] uppercase text-blue-900 tracking-wider">Submitted By</p>
                    <p className="font-black text-slate-950 text-sm">{coverStudentName || "Md Fazle Rabbi"}</p>
                    <p className="font-mono text-xs font-bold text-slate-800">ID: {coverStudentID || "2023200000686"}</p>
                    <p className="text-slate-600 text-[11px]">Semester: {coverSemester || "Fall 2026"}</p>
                  </div>
                  <div className="border border-blue-200 rounded-xl p-3.5 bg-white shadow-xs space-y-1">
                    <p className="font-black text-[10px] uppercase text-blue-900 tracking-wider">Submitted To</p>
                    <p className="font-black text-slate-950 text-sm">{coverTeacherName || "Md. Nahid Anam Opu"}</p>
                    <p className="text-xs font-bold text-slate-800">{coverTeacherDesignation || "Lecturer"}</p>
                    <p className="text-slate-600 text-[11px]">Southeast University</p>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-xs font-bold text-slate-700">
                  <span>Official SEU Project Deliverable</span>
                  <span className="font-mono">Date: {coverSubmissionDate || "21.09.2026"}</span>
                </div>
              </div>
            );
          }

          // 01 & 16. CLASSIC TABLE & MONOCHROME LASER (Default Academic Standard)
          return (
            <div className="space-y-6 text-center text-slate-900 flex-1 flex flex-col justify-between w-full" style={{ minHeight: "840px" }}>
              {/* Header: Centered Logo + University Name + Dynamic Department */}
              <div className="space-y-3 relative z-10">
                <div className="flex justify-center">
                  <img 
                    src="/images/seu-logo.png" 
                    alt="Southeast University Logo" 
                    className={`w-24 h-24 sm:w-28 sm:h-28 object-contain ${activeTpl.style === "BW" ? "filter grayscale contrast-125" : ""}`}
                  />
                </div>
                <div>
                  <h1 className={`text-xl sm:text-2xl font-black tracking-wider uppercase font-sans ${
                    isColor ? "text-blue-900" : "text-black"
                  }`}>
                    SOUTHEAST UNIVERSITY
                  </h1>
                  <p className={`text-xs sm:text-sm font-bold font-sans mt-0.5 ${
                    isColor ? "text-slate-800" : "text-black"
                  }`}>
                    {coverDepartment || "Southeast University"}
                  </p>
                </div>
              </div>

              {/* Middle: Document Title & Topic (Solid White Background for Pristine Legibility) */}
              <div className="space-y-4 my-auto relative z-10">
                <div>
                  <span className={`inline-block px-10 py-2 border-2 font-sans font-black text-sm uppercase tracking-widest ${
                    isColor
                      ? "border-blue-900 text-blue-950 bg-blue-50/90 shadow-xs"
                      : "border-black text-black bg-white shadow-xs"
                  }`}>
                    {coverType || "ASSIGNMENT"}
                  </span>
                </div>

                <div className={`p-3 border text-xs font-sans max-w-lg mx-auto bg-white shadow-xs rounded-lg ${
                  isColor ? "border-blue-800 text-blue-950" : "border-black text-black"
                }`}>
                  <span className="font-black uppercase tracking-wider text-slate-800">ASSIGNMENT TOPIC: </span>
                  <span className="font-bold text-slate-950 text-sm break-words hyphens-auto">{coverTopic || "[Topic of the Assignment]"}</span>
                </div>

                {/* Formal 3-Column Course Table (Solid Opaque White Background - 100% Legibility) */}
                <div className={`border text-left text-xs font-sans max-w-lg mx-auto bg-white shadow-xs rounded-lg overflow-hidden ${
                  isColor ? "border-blue-900" : "border-black"
                }`}>
                  <div className={`grid grid-cols-3 border-b p-2 bg-white ${isColor ? "border-blue-900" : "border-black"}`}>
                    <span className="font-bold text-slate-800">Course Name:</span>
                    <span className="col-span-2 font-bold text-slate-950">{coverCourseTitle || "Course Title"}</span>
                  </div>
                  <div className={`grid grid-cols-3 border-b p-2 bg-slate-50/60 ${isColor ? "border-blue-900" : "border-black"}`}>
                    <span className="font-bold text-slate-800">Course Code:</span>
                    <span className="col-span-2 font-mono font-bold text-slate-950 tracking-wider">{coverCourseCode || "CSE362"}</span>
                  </div>
                  <div className={`grid grid-cols-3 border-b p-2 bg-white ${isColor ? "border-blue-900" : "border-black"}`}>
                    <span className="font-bold text-slate-800">Section:</span>
                    <span className="col-span-2 font-bold text-slate-950">{coverSection || "8"}</span>
                  </div>
                  <div className="grid grid-cols-3 p-2 bg-slate-50/60">
                    <span className="font-bold text-slate-800">Date of Submission:</span>
                    <span className="col-span-2 font-mono font-bold text-slate-950">{coverSubmissionDate || "21.09.2026"}</span>
                  </div>
                </div>
              </div>

              {/* Bottom: Dual Formal Rectangular Credential Boxes (Solid Opaque White - 100% Legibility) */}
              <div className="grid grid-cols-2 gap-4 text-left font-sans text-xs max-w-lg mx-auto w-full pt-2 relative z-10">
                {/* Left: Submitted By */}
                <div className={`border p-3.5 space-y-1.5 bg-white shadow-xs rounded-lg ${isColor ? "border-blue-900" : "border-black"}`}>
                  <p className="font-black text-xs uppercase underline mb-2 tracking-wider text-blue-950">Submitted By</p>
                  <p className="leading-snug"><span className="font-bold text-slate-800">Name: </span><span className="font-bold text-slate-950">{coverStudentName || "Md Fazle Rabbi"}</span></p>
                  <p className="leading-snug"><span className="font-bold text-slate-800">ID: </span><span className="font-bold font-mono text-slate-950 tracking-wider">{coverStudentID || "2023200000686"}</span></p>
                  <p className="leading-snug"><span className="font-bold text-slate-800">Semester: </span><span className="font-bold text-slate-950">{coverSemester || "Fall 2026"}</span></p>
                  <p className="leading-snug"><span className="font-bold text-slate-800">Section: </span><span className="font-bold text-slate-950">{coverSection || "8"}</span></p>
                  <p className="leading-snug"><span className="font-bold text-slate-800">Dept: </span><span className="font-bold text-slate-950">{coverDepartment || "Southeast University"}</span></p>
                  <p className="leading-snug"><span className="font-bold text-slate-800">University: </span><span className="font-bold text-slate-950">Southeast University</span></p>
                </div>

                {/* Right: Submitted To */}
                <div className={`border p-3.5 space-y-1.5 bg-white shadow-xs rounded-lg ${isColor ? "border-blue-900" : "border-black"}`}>
                  <p className="font-black text-xs uppercase underline mb-2 tracking-wider text-blue-950">Submitted To</p>
                  <p className="leading-snug"><span className="font-bold text-slate-800">Name: </span><span className="font-bold text-slate-950">{coverTeacherName || "Md. Nahid Anam Opu"} {coverTeacherInitial ? `(${coverTeacherInitial})` : ""}</span></p>
                  <p className="leading-snug"><span className="font-bold text-slate-800">Designation: </span><span className="font-bold text-slate-950">{coverTeacherDesignation || "Lecturer"}</span></p>
                  <p className="leading-snug"><span className="font-bold text-slate-800">Department: </span><span className="font-bold text-slate-950">{coverDepartment || "Southeast University"}</span></p>
                  <p className="leading-snug"><span className="font-bold text-slate-800">University: </span><span className="font-bold text-slate-950">Southeast University</span></p>
                </div>
              </div>
            </div>
          );
        };

        // Render Miniature A4 Visual Preview for Gallery Card
        const renderThumbnailA4 = (tpl: typeof SEU_20_TEMPLATES[0]) => {
          const isColor = tpl.style === "Color";
          const primaryColor = isColor ? "#1e3a8a" : "#0f172a";
          const badgeBorder = isColor ? "#1e3a8a" : "#000000";
          const badgeBg = isColor ? "#eff6ff" : "#f8fafc";
          const badgeText = isColor ? "#172554" : "#000000";
          const accentBg = isColor ? "rgba(30, 58, 138, 0.08)" : "rgba(0, 0, 0, 0.04)";
          const theme = tpl.theme || "classic";

          return (
            <div className="w-full aspect-[210/297] bg-white text-slate-900 rounded-xl p-1 shadow-md border border-slate-300 dark:border-slate-700/80 flex flex-col justify-between relative overflow-hidden select-none">
              
              {/* Outer Container with Theme Graphics */}
              <div 
                className={`w-full h-full p-2 sm:p-2.5 flex flex-col justify-between relative ${
                  theme === "classic" ? "border-[1.5px]" : "border border-slate-200"
                }`}
                style={{ borderColor: theme === "classic" ? primaryColor : undefined }}
              >
                {/* Classic Inner Frame */}
                {theme === "classic" && (
                  <div 
                    className="absolute inset-1 border pointer-events-none"
                    style={{ borderColor: isColor ? "rgba(30, 58, 138, 0.35)" : "rgba(0,0,0,0.25)" }}
                  />
                )}

                {/* Modern Wave Theme (Image 1 Style Graphic) */}
                {theme === "modern_wave" && (
                  <div className="absolute inset-y-0 right-0 w-[42%] pointer-events-none z-0 overflow-hidden">
                    <svg className="w-full h-full" viewBox="0 0 240 842" preserveAspectRatio="none" fill="none">
                      <path d="M90,0 C170,220 20,480 130,842 L240,842 L240,0 Z" fill={isColor ? "#93c5fd" : "#cbd5e1"} fillOpacity="0.3" />
                      <path d="M125,0 C210,260 40,540 150,842 L240,842 L240,0 Z" fill={isColor ? "#1e3a8a" : "#0f172a"} />
                      <path d="M165,0 C75,240 195,520 90,842 L240,842 L240,0 Z" fill={isColor ? "#0284c7" : "#64748b"} fillOpacity="0.8" />
                      <path d="M155,0 C65,250 185,530 80,842" stroke={isColor ? "#38bdf8" : "#e2e8f0"} strokeWidth="4" fill="none" />
                    </svg>
                  </div>
                )}

                {/* Prestige Arch Theme (Image 2 Style Graphic) */}
                {theme === "prestige_arch" && (
                  <>
                    <div className="absolute top-0 inset-x-0 h-8 pointer-events-none z-0 overflow-hidden">
                      <svg className="w-full h-full" viewBox="0 0 600 130" preserveAspectRatio="none" fill="none">
                        <path d="M0,0 L600,0 L600,45 C460,110 220,35 0,90 Z" fill={isColor ? "#1e3a8a" : "#0f172a"} />
                        <path d="M0,0 L600,0 L600,25 C420,75 160,15 0,70 Z" fill={isColor ? "#0284c7" : "#64748b"} fillOpacity="0.5" />
                        <path d="M0,82 C180,30 430,95 600,40" stroke={isColor ? "#38bdf8" : "#cbd5e1"} strokeWidth="3" fill="none" />
                      </svg>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 h-8 pointer-events-none z-0 overflow-hidden">
                      <svg className="w-full h-full" viewBox="0 0 600 130" preserveAspectRatio="none" fill="none">
                        <path d="M0,130 L600,130 L600,85 C420,25 180,95 0,40 Z" fill={isColor ? "#1e3a8a" : "#0f172a"} />
                        <path d="M0,130 L600,130 L600,105 C460,55 220,115 0,60 Z" fill={isColor ? "#0284c7" : "#64748b"} fillOpacity="0.5" />
                        <path d="M0,48 C160,100 410,35 600,90" stroke={isColor ? "#38bdf8" : "#cbd5e1"} strokeWidth="3" fill="none" />
                      </svg>
                    </div>
                  </>
                )}

                {/* Geometric Tech Theme Graphic */}
                {theme === "geometric_tech" && (
                  <>
                    <div className="absolute top-0 right-0 w-16 h-7 pointer-events-none z-0 overflow-hidden">
                      <svg className="w-full h-full" viewBox="0 0 260 90" preserveAspectRatio="none" fill="none">
                        <polygon points="0,0 260,0 260,90 80,0" fill={isColor ? "#1e3a8a" : "#0f172a"} />
                        <polygon points="40,0 260,0 260,50 120,0" fill={isColor ? "#06b6d4" : "#64748b"} fillOpacity="0.6" />
                      </svg>
                    </div>
                    <div className="absolute bottom-0 left-0 w-16 h-7 pointer-events-none z-0 overflow-hidden">
                      <svg className="w-full h-full" viewBox="0 0 260 90" preserveAspectRatio="none" fill="none">
                        <polygon points="0,90 260,90 180,0 0,0" fill={isColor ? "#1e3a8a" : "#0f172a"} />
                        <polygon points="0,90 200,90 140,40 0,40" fill={isColor ? "#06b6d4" : "#64748b"} fillOpacity="0.6" />
                      </svg>
                    </div>
                  </>
                )}

                {/* Minimal Sidebar Theme Graphic */}
                {theme === "minimal_sidebar" && (
                  <div 
                    className="absolute top-0 bottom-0 left-0 w-2 pointer-events-none z-0"
                    style={{ background: isColor ? "linear-gradient(180deg, #1e3a8a 0%, #0284c7 50%, #0f172a 100%)" : "#0f172a" }}
                  />
                )}

                {/* Executive Crest / Ribbon Theme Graphic */}
                {theme === "executive_crest" && (
                  <>
                    <div className="absolute top-0 left-0 w-14 h-14 pointer-events-none z-0 overflow-hidden">
                      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none">
                        <polygon points="0,0 100,0 0,100" fill={isColor ? "#0f172a" : "#000"} />
                        <polygon points="0,85 0,98 98,0 85,0" fill={isColor ? "#fbbf24" : "#94a3b8"} />
                      </svg>
                    </div>
                    <div className="absolute bottom-0 right-0 w-10 h-10 pointer-events-none z-0 overflow-hidden">
                      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none">
                        <polygon points="100,0 100,100 0,100" fill={isColor ? "#0f172a" : "#000"} />
                        <polygon points="100,15 100,28 28,100 15,100" fill={isColor ? "#fbbf24" : "#94a3b8"} />
                      </svg>
                    </div>
                  </>
                )}

                {/* Cyber Circuit Theme Graphic */}
                {theme === "cyber_circuit" && (
                  <div className="absolute inset-0.5 pointer-events-none z-0 overflow-hidden">
                    <svg className="w-full h-full" viewBox="0 0 100 140" preserveAspectRatio="none" fill="none">
                      <path d="M5,20 L5,5 L20,5" stroke={isColor ? "#0284c7" : "#000"} strokeWidth="1.5" />
                      <circle cx="20" cy="5" r="1.5" fill={isColor ? "#06b6d4" : "#000"} />
                      <path d="M95,20 L95,5 L80,5" stroke={isColor ? "#0284c7" : "#000"} strokeWidth="1.5" />
                      <circle cx="80" cy="5" r="1.5" fill={isColor ? "#06b6d4" : "#000"} />
                      <path d="M5,120 L5,135 L20,135" stroke={isColor ? "#0284c7" : "#000"} strokeWidth="1.5" />
                      <path d="M95,120 L95,135 L80,135" stroke={isColor ? "#0284c7" : "#000"} strokeWidth="1.5" />
                    </svg>
                  </div>
                )}

                {/* Fluted Academic Certificate Theme Graphic */}
                {theme === "fluted_academic" && (
                  <div className="absolute inset-1 pointer-events-none z-0 border" style={{ borderColor: isColor ? "#1e3a8a" : "#000" }}>
                    <div className="absolute inset-0.5 border" style={{ borderColor: isColor ? "rgba(30, 58, 138, 0.4)" : "rgba(0,0,0,0.3)" }} />
                  </div>
                )}

                {/* Hexagon Hive Theme Graphic (Tech Honeycomb) */}
                {theme === "hexagonal_hive" && (
                  <>
                    <div className="absolute inset-0 pointer-events-none z-0 opacity-15 overflow-hidden">
                      <svg className="w-full h-full" viewBox="0 0 100 140" preserveAspectRatio="none" fill="none">
                        <path d="M10,15 L20,20 L20,30 L10,35 L0,30 L0,20 Z M30,15 L40,20 L40,30 L30,35 L20,30 L20,20 Z" stroke={isColor ? "#0284c7" : "#000"} strokeWidth="1" />
                        <path d="M10,45 L20,50 L20,60 L10,65 L0,60 L0,50 Z" stroke={isColor ? "#0284c7" : "#000"} strokeWidth="1" />
                      </svg>
                    </div>
                    <div className="absolute top-2 left-0.5 w-6 h-12 pointer-events-none z-0 overflow-hidden">
                      <svg className="w-full h-full" viewBox="0 0 30 60" fill="none">
                        <polygon points="12,4 22,9 22,21 12,26 2,21 2,9" fill={isColor ? "#d97706" : "#64748b"} />
                        <polygon points="12,24 22,29 22,41 12,46 2,41 2,29" fill={isColor ? "#0f172a" : "#000"} />
                        <polygon points="18,14 28,19 28,31 18,36 8,31 8,19" fill={isColor ? "#0284c7" : "#94a3b8"} opacity="0.9" />
                      </svg>
                    </div>
                  </>
                )}

                {/* Prism Matrix Theme Graphic (Facet Shards & Dots) */}
                {theme === "facet_prism" && (
                  <>
                    <div className="absolute top-0 bottom-0 left-0 w-4 pointer-events-none z-0 overflow-hidden">
                      <svg className="w-full h-full" viewBox="0 0 20 140" preserveAspectRatio="none" fill="none">
                        <polygon points="0,0 20,0 12,25 0,35" fill={isColor ? "#047857" : "#334155"} />
                        <polygon points="0,35 12,25 20,55 0,70" fill={isColor ? "#10b981" : "#64748b"} />
                        <polygon points="0,70 20,55 15,95 0,110" fill={isColor ? "#0284c7" : "#94a3b8"} />
                        <polygon points="0,110 15,95 20,140 0,140" fill={isColor ? "#1e3a8a" : "#0f172a"} />
                      </svg>
                    </div>
                    <div className="absolute top-1 left-5 w-3 h-3 pointer-events-none z-0 opacity-40">
                      <div className="grid grid-cols-2 gap-0.5">
                        <div className="w-0.5 h-0.5 rounded-full bg-slate-600" />
                        <div className="w-0.5 h-0.5 rounded-full bg-slate-600" />
                        <div className="w-0.5 h-0.5 rounded-full bg-slate-600" />
                        <div className="w-0.5 h-0.5 rounded-full bg-slate-600" />
                      </div>
                    </div>
                  </>
                )}

                {/* Soft Center Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05]">
                  <img 
                    src="/images/seu-logo.png" 
                    alt="" 
                    className={`w-24 h-24 object-contain ${!isColor ? "filter grayscale" : ""}`}
                  />
                </div>

                {/* Format Badge Top-Right */}
                <div className="absolute top-1.5 right-1.5 z-10">
                  <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider ${
                    theme === "modern_wave" ? "bg-cyan-600 text-white shadow-xs" :
                    theme === "prestige_arch" ? "bg-indigo-700 text-white shadow-xs" :
                    theme === "geometric_tech" ? "bg-blue-800 text-white shadow-xs" :
                    theme === "minimal_sidebar" ? "bg-slate-800 text-white shadow-xs" :
                    theme === "executive_crest" ? "bg-amber-600 text-white shadow-xs" :
                    theme === "cyber_circuit" ? "bg-sky-600 text-white shadow-xs" :
                    theme === "fluted_academic" ? "bg-emerald-700 text-white shadow-xs" :
                    theme === "hexagonal_hive" ? "bg-amber-600 text-white shadow-xs" :
                    theme === "facet_prism" ? "bg-teal-700 text-white shadow-xs" :
                    isColor ? "bg-blue-600 text-white shadow-xs" : "bg-slate-900 text-white shadow-xs"
                  }`}>
                    {theme === "modern_wave" ? "🌊 Wave" :
                     theme === "prestige_arch" ? "🏅 Arch" :
                     theme === "geometric_tech" ? "📐 Tech" :
                     theme === "minimal_sidebar" ? "📑 Spine" :
                     theme === "executive_crest" ? "🌟 Ribbon" :
                     theme === "cyber_circuit" ? "⚡ Circuit" :
                     theme === "fluted_academic" ? "🎓 Honors" :
                     theme === "hexagonal_hive" ? "⬡ Hive" :
                     theme === "facet_prism" ? "◈ Prism" :
                     isColor ? "🎨 Color" : "⬛ B&W"}
                  </span>
                </div>

                {/* 1. Header: Logo, University & Department */}
                <div className="text-center space-y-0.5 z-10">
                  <img 
                    src="/images/seu-logo.png" 
                    alt="SEU Logo" 
                    className={`w-6 h-6 sm:w-7 sm:h-7 object-contain mx-auto ${!isColor ? "filter grayscale contrast-125" : ""}`}
                  />
                  <div 
                    className="text-[7.5px] sm:text-[8px] font-black uppercase tracking-tight leading-tight"
                    style={{ color: primaryColor }}
                  >
                    SOUTHEAST UNIVERSITY
                  </div>
                  <div className="text-[5px] sm:text-[5.5px] font-semibold text-slate-500 leading-none truncate max-w-[90px] mx-auto">
                    {coverDepartment || "Southeast University"}
                  </div>
                </div>

                {/* 2. DISTINCT CENTER SECTION PER CATEGORY */}
                <div className="z-10 my-0.5 space-y-1">
                  
                  {/* Category 1: Assignment */}
                  {tpl.category === "assignment" && (
                    <>
                      <div className="text-center">
                        <span 
                          className="inline-block px-2.5 py-0.5 text-[6.5px] font-black uppercase tracking-widest border"
                          style={{ borderColor: badgeBorder, backgroundColor: badgeBg, color: badgeText }}
                        >
                          ASSIGNMENT
                        </span>
                      </div>
                      <div className="p-0.5 text-center text-[5px] font-bold italic" style={{ backgroundColor: accentBg, color: primaryColor }}>
                        Topic: [Assignment Title]
                      </div>
                    </>
                  )}

                  {/* Category 2: Lab Report */}
                  {tpl.category === "lab" && (
                    <>
                      <div className="text-center">
                        <span 
                          className="inline-block px-2.5 py-0.5 text-[6.5px] font-black uppercase tracking-widest border"
                          style={{ borderColor: badgeBorder, backgroundColor: badgeBg, color: badgeText }}
                        >
                          LAB REPORT
                        </span>
                      </div>
                      <div className="border text-[4.5px] p-0.5 text-center font-bold flex justify-between px-1" style={{ borderColor: primaryColor, backgroundColor: accentBg }}>
                        <span>Exp No: 01</span>
                        <span>Exp Name: [Name of Experiment]</span>
                      </div>
                    </>
                  )}

                  {/* Category 3: Project Report */}
                  {tpl.category === "project" && (
                    <div className="text-center space-y-0.5">
                      <span className="text-[6px] font-black uppercase tracking-wider block" style={{ color: primaryColor }}>
                        PROJECT REPORT
                      </span>
                      <div className="text-[5.5px] font-black italic">
                        “[Title of the Project]”
                      </div>
                      <div className="text-[4px] text-slate-500">
                        Submitted in partial fulfillment of course requirements
                      </div>
                    </div>
                  )}

                  {/* Category 4: Term Paper */}
                  {tpl.category === "termpaper" && (
                    <div className="text-center space-y-0.5 border-y py-0.5" style={{ borderColor: primaryColor }}>
                      <span className="text-[6.5px] font-black uppercase tracking-widest" style={{ color: primaryColor }}>
                        TERM PAPER
                      </span>
                      <div className="text-[5.5px] font-bold">
                        [Title of the Research Paper]
                      </div>
                    </div>
                  )}

                  {/* Category 5: Thesis / Dissertation */}
                  {tpl.category === "thesis" && (
                    <div className="text-center space-y-0.5">
                      <span className="text-[5px] font-serif uppercase tracking-widest block text-slate-600">
                        A THESIS ON
                      </span>
                      <div className="border p-0.5 text-[5.5px] font-black uppercase tracking-wider" style={{ borderColor: primaryColor, backgroundColor: accentBg }}>
                        [TITLE OF THE THESIS]
                      </div>
                      <div className="text-[4px] text-slate-600 leading-tight">
                        Requirements for Degree of B.Sc. in CSE
                      </div>
                    </div>
                  )}

                  {/* Category 6: Research Proposal */}
                  {tpl.category === "proposal" && (
                    <div className="text-center space-y-0.5">
                      <span className="inline-block px-2 py-0.5 text-[6px] font-black uppercase border" style={{ borderColor: badgeBorder, backgroundColor: badgeBg }}>
                        RESEARCH PROPOSAL
                      </span>
                      <div className="text-[5px] font-bold">[Proposed Research Title]</div>
                      <div className="text-[4px] text-slate-500">Research Area: Artificial Intelligence</div>
                    </div>
                  )}

                  {/* Category 7: Case Study */}
                  {tpl.category === "casestudy" && (
                    <div className="text-center space-y-0.5">
                      <span className="inline-block px-2 py-0.5 text-[6px] font-black uppercase border" style={{ borderColor: badgeBorder, backgroundColor: badgeBg }}>
                        CASE STUDY REPORT
                      </span>
                      <div className="text-[5px] font-bold">[Subject / Case Analysis Title]</div>
                    </div>
                  )}

                  {/* Category 8: Seminar Report */}
                  {tpl.category === "seminar" && (
                    <div className="text-center space-y-0.5">
                      <span className="inline-block px-2 py-0.5 text-[6px] font-black uppercase border" style={{ borderColor: badgeBorder, backgroundColor: badgeBg }}>
                        SEMINAR REPORT
                      </span>
                      <div className="text-[5px] font-bold italic">Topic: [Seminar Presentation]</div>
                    </div>
                  )}

                  {/* Category 9: Internship Report */}
                  {tpl.category === "internship" && (
                    <div className="text-center space-y-0.5">
                      <span className="text-[6.5px] font-black uppercase tracking-wider block" style={{ color: primaryColor }}>
                        INTERNSHIP REPORT
                      </span>
                      <div className="text-[5px] font-bold">on [Organization / Company Name]</div>
                      <div className="text-[4px] text-slate-500">Position: Software Engineer Intern</div>
                    </div>
                  )}

                  {/* Category 10: Capstone Project */}
                  {tpl.category === "capstone" && (
                    <div className="text-center space-y-0.5">
                      <span className="inline-block px-2 py-0.5 text-[6px] font-black uppercase border" style={{ borderColor: badgeBorder, backgroundColor: badgeBg }}>
                        FINAL YEAR DESIGN PROJECT
                      </span>
                      <div className="text-[5px] font-black">[Title of Capstone Project]</div>
                    </div>
                  )}

                </div>

                {/* 3. Middle Metadata Table (Except Thesis which uses formal citation block) */}
                  {tpl.layoutStyle === "asymmetric_spine" ? (
                    <div className="text-left pl-3 pr-1 py-1 space-y-1">
                      <div className="text-[6.5px] font-black font-serif text-emerald-900 leading-tight">Mechanics of Materials Lab</div>
                      <div className="text-[4px] font-mono border border-emerald-800 px-1 py-0.2 inline-block">Course: CSE362</div>
                      <div className="text-[3.8px] text-slate-400">Lab Report</div>
                      <div className="border-t border-b border-emerald-800 py-0.5 text-[3.8px] space-y-0.2 text-slate-800">
                        <p><span className="font-bold">By:</span> Md Fazle Rabbi (2023200000686)</p>
                        <p><span className="font-bold">To:</span> Md. Nahid Anam Opu, Lecturer</p>
                      </div>
                      <div className="text-[3.5px] font-mono text-emerald-900">Submission Date: 21.09.2026</div>
                    </div>
                  ) : tpl.layoutStyle === "bold_editorial" ? (
                    <div className="text-left p-1 space-y-1">
                      <div className="text-[7.5px] font-black uppercase text-amber-600 leading-none">LAB REPORT</div>
                      <div className="text-[6px] font-black uppercase text-amber-800 leading-none">ASSIGNMENT</div>
                      <div className="text-[5.5px] font-black uppercase text-slate-900 leading-none">COVER PAGE</div>
                      <div className="text-[4px] italic text-slate-600 pt-0.5">Operating Systems Lab</div>
                      <div className="flex justify-between items-end pt-1 text-[3.5px] border-t border-amber-200">
                        <div>
                          <p className="font-bold">By: Md Fazle Rabbi</p>
                          <p className="font-mono">ID: 2023200000686</p>
                        </div>
                        <div className="text-right font-mono font-bold text-amber-900">
                          DATE: 21.09.2026
                        </div>
                      </div>
                    </div>
                  ) : tpl.layoutStyle === "floating_pill_cards" ? (
                    <div className="p-0.5 space-y-1">
                      <div className="rounded border border-amber-600 bg-white p-0.5 text-left text-[3.8px]">
                        <span className="font-bold">Course:</span> CSE362 • <span className="font-bold">Exp:</span> 01
                      </div>
                      <div className="bg-slate-900 text-white p-0.5 text-[3.8px] font-bold text-center rounded">
                        SOUTHEAST UNIVERSITY (SEU)
                      </div>
                      <div className="grid grid-cols-2 gap-0.5 text-left text-[3.5px]">
                        <div className="rounded border border-amber-600 p-0.5 bg-white">
                          <span className="font-bold block">By: Rabbi</span>
                          <span className="font-mono">2023200000686</span>
                        </div>
                        <div className="rounded border border-amber-600 p-0.5 bg-white">
                          <span className="font-bold block">To: Lecturer</span>
                          <span>Dept. of CSE</span>
                        </div>
                      </div>
                      <div className="flex justify-between text-[3.2px] font-mono text-slate-700">
                        <span>Date: 21.09.2026</span>
                        <span>Sign: _________</span>
                      </div>
                    </div>
                  ) : tpl.layoutStyle === "hex_spec_badge" ? (
                    <div className="p-0.5 space-y-1 text-left">
                      <div className="text-right text-[5.5px] font-black text-blue-900">Lab Report's</div>
                      <div className="text-[3.8px] space-y-0.2 pl-1 font-bold text-blue-950">
                        <div>▪ Lab -1: Sync & Fork</div>
                        <div>▪ Lab -2: Virtual Memory</div>
                      </div>
                      <div className="border border-blue-200 bg-blue-50/50 p-0.5 text-[3.5px] rounded">
                        <span className="font-bold">CSE362</span> • Date: 21.09.2026
                      </div>
                    </div>
                  ) : tpl.layoutStyle === "cyber_terminal" ? (
                    <div className="bg-slate-950 text-emerald-400 p-1 rounded font-mono text-[3.5px] text-left space-y-0.5">
                      <div className="text-slate-400 border-b border-slate-800 pb-0.5">{">"} SEU_TERMINAL // CSE</div>
                      <div>const manifest = &#123;</div>
                      <div className="pl-1">type: "{tpl.defaultType}",</div>
                      <div className="pl-1">student: "Fazle Rabbi",</div>
                      <div className="pl-1">id: "2023200000686",</div>
                      <div className="pl-1">date: "21.09.2026"</div>
                      <div>&#125;;</div>
                    </div>
                  ) : tpl.layoutStyle === "swiss_minimal" ? (
                    <div className="text-left pl-2 space-y-1">
                      <div className="text-[6.5px] font-black uppercase text-slate-950 leading-tight">Operating Systems</div>
                      <div className="text-[4px] font-mono text-blue-600">CSE362 • ASSIGNMENT</div>
                      <div className="border-t border-b border-slate-900 py-0.5 grid grid-cols-2 gap-1 text-[3.5px]">
                        <div><span className="font-bold block">STUDENT</span>Rabbi (2023200000686)</div>
                        <div><span className="font-bold block">INSTRUCTOR</span>Nahid Anam Opu</div>
                      </div>
                      <div className="text-[3.2px] font-mono text-slate-500">SUBMITTED: 21.09.2026</div>
                    </div>
                  ) : tpl.category !== "thesis" && tpl.category !== "termpaper" ? (
                    <div className="border text-[4.5px] font-sans leading-tight" style={{ borderColor: primaryColor }}>
                      <div className="grid grid-cols-3 border-b p-0.5 px-1 font-semibold" style={{ borderColor: primaryColor }}>
                        <span className="font-bold">Course:</span>
                        <span className="col-span-2 font-mono">CSE362</span>
                      </div>
                      <div className="grid grid-cols-3 border-b p-0.5 px-1 font-semibold" style={{ borderColor: primaryColor }}>
                        <span className="font-bold">Section:</span>
                        <span className="col-span-2">08</span>
                      </div>
                      {tpl.category === "lab" && (
                        <div className="grid grid-cols-3 border-b p-0.5 px-1 font-semibold" style={{ borderColor: primaryColor }}>
                          <span className="font-bold">Lab Date:</span>
                          <span className="col-span-2 font-mono">14.09.2026</span>
                        </div>
                      )}
                      <div className="grid grid-cols-3 p-0.5 px-1 font-semibold">
                        <span className="font-bold">Date:</span>
                        <span className="col-span-2 font-mono">21.09.2026</span>
                      </div>
                    </div>
                  ) : null}


                {/* 4. DISTINCT BOTTOM SECTION PER CATEGORY (Only for standard layouts) */}
                {tpl.layoutStyle !== "asymmetric_spine" && tpl.layoutStyle !== "bold_editorial" && tpl.layoutStyle !== "floating_pill_cards" && tpl.layoutStyle !== "hex_spec_badge" && tpl.layoutStyle !== "cyber_terminal" && tpl.layoutStyle !== "swiss_minimal" && (
                  <div className="z-10">
                    {tpl.category === "capstone" ? (
                      /* Capstone: Multi-Member Project Team Table */
                      <div className="border p-0.5 text-[4px]" style={{ borderColor: primaryColor }}>
                        <div className="font-black uppercase text-[4.5px] border-b p-0.5 bg-slate-50" style={{ borderColor: primaryColor }}>Project Team</div>
                        <div className="grid grid-cols-12 p-0.5 border-b font-mono" style={{ borderColor: primaryColor }}>
                          <span className="col-span-2">1</span>
                          <span className="col-span-6">Rabbi</span>
                          <span className="col-span-4">2023200000686</span>
                        </div>
                        <div className="grid grid-cols-12 p-0.5 font-mono">
                          <span className="col-span-2">2</span>
                          <span className="col-span-6">Member 2</span>
                          <span className="col-span-4">[ID]</span>
                        </div>
                      </div>
                    ) : tpl.category === "internship" ? (
                      /* Internship: 3-Way Supervisor Boxes */
                      <div className="grid grid-cols-3 gap-0.5 text-[4px]">
                        <div className="border p-0.5" style={{ borderColor: primaryColor }}>
                          <span className="font-black block uppercase">Trainee</span>
                          <span className="truncate block">Rabbi</span>
                        </div>
                        <div className="border p-0.5" style={{ borderColor: primaryColor }}>
                          <span className="font-black block uppercase">Academic</span>
                          <span className="truncate block">Faculty</span>
                        </div>
                        <div className="border p-0.5" style={{ borderColor: primaryColor }}>
                          <span className="font-black block uppercase">Industry</span>
                          <span className="truncate block">Supervisor</span>
                        </div>
                      </div>
                    ) : (
                      /* Standard Split Boxes: Submitted By & Submitted To */
                      <div className="grid grid-cols-2 gap-1 text-[4px] sm:text-[4.5px]">
                        <div className="border p-1" style={{ borderColor: primaryColor }}>
                          <span className="font-black block uppercase mb-0.5">
                            {tpl.category === "seminar" ? "Presented By" : "Submitted By"}
                          </span>
                          <span className="text-slate-950 font-black truncate block">Md Fazle Rabbi</span>
                          <span className="font-mono text-slate-900 font-bold">2023200000686</span>
                        </div>
                        <div className="border p-1" style={{ borderColor: primaryColor }}>
                          <span className="font-black block uppercase mb-0.5">
                            {tpl.category === "thesis" ? "Supervised By" : tpl.category === "seminar" ? "Presented To" : "Submitted To"}
                          </span>
                          <span className="text-slate-950 font-black truncate block">Md. Nahid Anam</span>
                          <span className="text-slate-900 font-bold truncate block">Lecturer</span>
                        </div>
                      </div>
                    )}

                    {/* Single Submission Date Pill (Only for thesis/termpaper where table is omitted) */}
                    {(tpl.category === "thesis" || tpl.category === "termpaper") && (
                      <div className="text-center mt-1">
                        <span 
                          className="inline-block px-2 py-0.5 rounded-full text-[4.5px] font-mono font-bold border"
                          style={{ borderColor: primaryColor, color: primaryColor }}
                        >
                          Date: 21.09.2026
                        </span>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          );
        };

        return (
          <div className="space-y-8">
            {coverViewMode === "gallery" ? (
              /* ============================================================ */
              /* VIEW 1: 20 OFFICIAL TEMPLATES SHOWCASE / GALLERY VIEW       */
              /* ============================================================ */
              <div className="space-y-6">
                
                {/* 1. Header Banner & Filter Bar */}
                <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                  
                  {/* Title & Tagline */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                    <div className="space-y-1.5 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-black px-2.5 py-1 rounded-xl bg-blue-600 text-white shadow-xs uppercase">
                          16 Unique Handcrafted Formats
                        </span>
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{language === "bn" ? "অফিসিয়াল ইউনিক কভার কালেকশন" : "Official Unique Cover Collection"}</span>
                        </span>
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        {language === "bn" ? "অফিসিয়াল ও আধুনিক ১৬টি সম্পূর্ণ ইউনিক কভার টেমপ্লেট" : "Choose from 16 Official & Handcrafted Unique Cover Formats"}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                        {language === "bn"
                          ? "প্রতিটি টেমপ্লেট আলাদা ডিজাইন, আর্টওয়ার্ক এবং স্বতন্ত্র টেক্সট বিন্যাসে তৈরি। ক্লিক করে ডেডিকেটেড এডিটরে লাইভ প্রিভিউ দেখুন ও ১-ক্লিকে PDF ডাউনলোড করুন।"
                          : "Each template features distinct geometry and unique interior text typography. Click any template to edit and download your 1-page A4 PDF."}
                      </p>
                    </div>

                    {/* Style Switcher: All 30 / Color / BW */}
                    <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 shrink-0 self-start md:self-center border border-slate-200/60 dark:border-slate-700/60">
                      <button
                        onClick={() => setCoverFilterStyle("all")}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors duration-150 cursor-pointer select-none ${
                          coverFilterStyle === "all"
                            ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        All ({SEU_20_TEMPLATES.length})
                      </button>
                      <button
                        onClick={() => setCoverFilterStyle("Color")}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors duration-150 flex items-center gap-1.5 cursor-pointer select-none ${
                          coverFilterStyle === "Color"
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <span>🎨 Color</span>
                        <span className="text-[10px] opacity-80">({SEU_20_TEMPLATES.filter(t => t.style === "Color").length})</span>
                      </button>
                      <button
                        onClick={() => setCoverFilterStyle("BW")}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors duration-150 flex items-center gap-1.5 cursor-pointer select-none ${
                          coverFilterStyle === "BW"
                            ? "bg-slate-900 text-white dark:bg-slate-600 shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        <span>⬛ B&W</span>
                        <span className="text-[10px] opacity-80">({SEU_20_TEMPLATES.filter(t => t.style === "BW").length})</span>
                      </button>
                    </div>
                  </div>

                  {/* Search and Category Filters */}
                  <div className="space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Search Bar */}
                      <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={coverSearchQuery}
                          onChange={(e) => setCoverSearchQuery(e.target.value)}
                          placeholder={language === "bn" ? "টেমপ্লেট খুঁজুন (যেমন: Lab, Thesis...)" : "Search templates (e.g. Lab, Thesis, Capstone)..."}
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {coverSearchQuery && (
                          <button
                            onClick={() => setCoverSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Result Count */}
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>
                          {language === "bn"
                            ? `${filteredTemplates.length}টি টেমপ্লেট পাওয়া গেছে`
                            : `Showing ${filteredTemplates.length} of ${SEU_20_TEMPLATES.length} templates`}
                        </span>
                      </div>
                    </div>

                    {/* Category Filter Pills (Zero-Layout-Shift Rock-Solid Tabs) */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {categories.map((cat) => {
                        const isCatActive = coverCategoryFilter === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setCoverCategoryFilter(cat.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors duration-150 cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 border select-none ${
                              isCatActive
                                ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                                : "bg-slate-100 hover:bg-slate-200/90 dark:bg-slate-800/80 dark:hover:bg-slate-700/90 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/80"
                            }`}
                          >
                            <span>{language === "bn" ? cat.nameBn : cat.name}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono leading-none inline-flex items-center justify-center transition-colors duration-150 ${
                                isCatActive
                                  ? "bg-blue-500 text-white"
                                  : "bg-slate-200/90 dark:bg-slate-700/90 text-slate-600 dark:text-slate-400"
                              }`}
                            >
                              {cat.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>

                {/* 2. Visual 20-Template Thumbnail Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 sm:gap-6 min-h-[580px]">
                  {filteredTemplates.map((tpl) => {
                    const isSelected = tpl.id === selectedTemplateId;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => handleSelectAndEdit(tpl.id)}
                        className={`rounded-3xl border transition-all duration-300 flex flex-col justify-between p-4 cursor-pointer group relative bg-white dark:bg-slate-900/90 shadow-sm hover:shadow-xl hover:-translate-y-1 animate-in fade-in duration-150 ${
                          isSelected
                            ? "border-2 border-blue-600 dark:border-blue-500 ring-4 ring-blue-500/15"
                            : "border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600"
                        }`}
                      >
                        {/* Visual Thumbnail Sheet with Hover Action Overlay */}
                        <div className="relative group/thumb rounded-xl overflow-hidden shadow-inner">
                          {renderThumbnailA4(tpl)}
                          
                          {/* Hover Overlay with Button */}
                          <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[2px] flex flex-col items-center justify-center p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <span className="px-4 py-2 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center gap-1.5 shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-transform">
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{language === "bn" ? "কাস্টমাইজ করুন" : "Customize & Edit"}</span>
                            </span>
                          </div>
                        </div>

                        {/* Card Info Details */}
                        <div className="mt-3.5 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono font-bold text-slate-400">
                              #{tpl.num} • {tpl.style}
                            </span>
                            <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md ${
                              tpl.style === "Color"
                                ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            }`}>
                              {tpl.category.toUpperCase()}
                            </span>
                          </div>

                          <h3 className="text-xs font-black text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {language === "bn" ? tpl.nameBn : tpl.name}
                          </h3>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {tpl.desc}
                          </p>

                          {/* Action Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectAndEdit(tpl.id);
                            }}
                            className="w-full mt-2.5 py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-600 dark:bg-blue-950/60 dark:hover:bg-blue-600 text-blue-700 hover:text-white dark:text-blue-300 dark:hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>{language === "bn" ? "এডিট পেজে যান" : "Customize Template"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredTemplates.length === 0 && (
                  <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="text-3xl">🔍</div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                      {language === "bn" ? "কোনো টেমপ্লেট খুঁজে পাওয়া যায়নি" : "No templates matched your search"}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {language === "bn" ? "অন্য কোনো কি-ওয়ার্ড দিয়ে খুঁজুন অথবা ফিল্টার রিসেট করুন।" : "Try searching with different keywords or reset your filters."}
                    </p>
                    <button
                      onClick={() => {
                        setCoverSearchQuery("");
                        setCoverFilterStyle("all");
                        setCoverCategoryFilter("all");
                      }}
                      className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-all cursor-pointer"
                    >
                      Reset All Filters
                    </button>
                  </div>
                )}

              </div>
            ) : (
              /* ============================================================ */
              /* VIEW 2: DEDICATED CUSTOMIZATION & LIVE A4 PREVIEW WORKSPACE */
              /* ============================================================ */
              <div className="space-y-6 animate-in fade-in duration-200">
                
                {/* Top Navigation & Context Bar for Editor */}
                <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                  
                  {/* Left: Back to 20 Templates Button + Active Template Badge */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setCoverViewMode("gallery")}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/60 text-xs font-black text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer group"
                    >
                      <ArrowLeft className="w-4 h-4 text-blue-500 group-hover:-translate-x-1 transition-transform" />
                      <span>{language === "bn" ? "← সকল ১৬টি ইউনিক টেমপ্লেট গ্যালারি" : "← Back to 16 Templates"}</span>
                    </button>

                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          Template #{activeTpl.num} • {activeTpl.style}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Editing: {activeTpl.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick Switcher Dropdown & 1-Click Color/BW Toggle */}
                  <div className="flex items-center gap-2">
                    {/* 1-Click Toggle between Color and BW version of this template */}
                    {activeTpl.style === "Color" ? (
                      <button
                        onClick={() => {
                          const bwId = activeTpl.id.replace("_Color", "_BW");
                          const exists = SEU_20_TEMPLATES.find(t => t.id === bwId);
                          if (exists) setSelectedTemplateId(bwId);
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer flex items-center gap-1.5"
                        title="Switch to Black & White version"
                      >
                        <span>⬛ B&W Version</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          const colorId = activeTpl.id.replace("_BW", "_Color");
                          const exists = SEU_20_TEMPLATES.find(t => t.id === colorId);
                          if (exists) setSelectedTemplateId(colorId);
                        }}
                        className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-xs font-bold text-blue-700 dark:text-blue-300 transition-all cursor-pointer flex items-center gap-1.5"
                        title="Switch to Official Color version"
                      >
                        <span>🎨 Color Version</span>
                      </button>
                    )}

                    {/* Quick Select Any Other Template Dropdown */}
                    <div className="relative">
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => {
                          const chosen = SEU_20_TEMPLATES.find(t => t.id === e.target.value);
                          setSelectedTemplateId(e.target.value);
                          if (chosen) {
                            setCoverType(chosen.defaultType);
                            setCoverDesignTheme(chosen.theme || "classic");
                          }
                        }}
                        className="py-2 pl-3 pr-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {SEU_20_TEMPLATES.map((t) => (
                          <option key={t.id} value={t.id}>
                            #{t.num} {t.name} ({t.style})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                </div>

                {/* The 2-Column Editor (Left: Form, Right: Live A4 Preview & Action Buttons) */}
                {/* 2. MAIN GRID: FORM ON LEFT (5 COLS), LIVE A4 PREVIEW ON RIGHT (7 COLS) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LEFT FORM (5 Cols) */}
              <div className="lg:col-span-5 space-y-5 print:hidden">
                
                {/* Card 0: Design Theme & Layout Style (Choose between Classic Frame, Modern Wave, Prestige Arch, Geometric Tech, Minimal Sidebar) */}
                <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-blue-600 tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{language === "bn" ? "ডিজাইন থিম ও লেআউট" : "Design Theme & Layout"}</span>
                    </h4>
                    <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                      {coverDesignTheme === "classic" ? "🏛️ Classic Frame" :
                       coverDesignTheme === "modern_wave" ? "🌊 Modern Wave" :
                       coverDesignTheme === "prestige_arch" ? "🏅 Prestige Arch" :
                       coverDesignTheme === "geometric_tech" ? "📐 Geometric Tech" :
                       coverDesignTheme === "minimal_sidebar" ? "📑 Minimal Sidebar" :
                       coverDesignTheme === "executive_crest" ? "🌟 Executive Ribbon" :
                       coverDesignTheme === "cyber_circuit" ? "⚡ Cyber Circuit" :
                       coverDesignTheme === "fluted_academic" ? "🎓 Honors Frame" :
                       coverDesignTheme === "hexagonal_hive" ? "⬡ Hexagon Hive" : "◈ Prism Matrix"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <button
                      type="button"
                      onClick={() => setCoverDesignTheme("classic")}
                      className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all text-center cursor-pointer ${
                        coverDesignTheme === "classic"
                          ? "border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-sm ring-2 ring-blue-500/30"
                          : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="text-base">🏛️</span>
                      <span className="text-[11px] leading-tight font-black">Classic Frame</span>
                      <span className="text-[9px] text-slate-400 font-normal">Double Border</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCoverDesignTheme("modern_wave")}
                      className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all text-center cursor-pointer ${
                        coverDesignTheme === "modern_wave"
                          ? "border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-sm ring-2 ring-blue-500/30"
                          : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="text-base">🌊</span>
                      <span className="text-[11px] leading-tight font-black">Modern Wave</span>
                      <span className="text-[9px] text-slate-400 font-normal">Executive Curve</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCoverDesignTheme("prestige_arch")}
                      className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all text-center cursor-pointer ${
                        coverDesignTheme === "prestige_arch"
                          ? "border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-sm ring-2 ring-blue-500/30"
                          : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="text-base">🏅</span>
                      <span className="text-[11px] leading-tight font-black">Prestige Arch</span>
                      <span className="text-[9px] text-slate-400 font-normal">Honors Ribbon</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCoverDesignTheme("geometric_tech")}
                      className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all text-center cursor-pointer ${
                        coverDesignTheme === "geometric_tech"
                          ? "border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-sm ring-2 ring-blue-500/30"
                          : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="text-base">📐</span>
                      <span className="text-[11px] leading-tight font-black">Geometric Tech</span>
                      <span className="text-[9px] text-slate-400 font-normal">Corner Angles</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCoverDesignTheme("minimal_sidebar")}
                      className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all text-center cursor-pointer ${
                        coverDesignTheme === "minimal_sidebar"
                          ? "border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-sm ring-2 ring-blue-500/30"
                          : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="text-base">📑</span>
                      <span className="text-[11px] leading-tight font-black">Minimal Sidebar</span>
                      <span className="text-[9px] text-slate-400 font-normal">Accent Stripe</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCoverDesignTheme("executive_crest")}
                      className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all text-center cursor-pointer ${
                        coverDesignTheme === "executive_crest"
                          ? "border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-sm ring-2 ring-blue-500/30"
                          : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="text-base">🌟</span>
                      <span className="text-[11px] leading-tight font-black">Executive Ribbon</span>
                      <span className="text-[9px] text-slate-400 font-normal">Gold-Navy Crest</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCoverDesignTheme("cyber_circuit")}
                      className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all text-center cursor-pointer ${
                        coverDesignTheme === "cyber_circuit"
                          ? "border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-sm ring-2 ring-blue-500/30"
                          : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="text-base">⚡</span>
                      <span className="text-[11px] leading-tight font-black">Cyber Circuit</span>
                      <span className="text-[9px] text-slate-400 font-normal">STEM Matrix</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCoverDesignTheme("fluted_academic")}
                      className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all text-center cursor-pointer ${
                        coverDesignTheme === "fluted_academic"
                          ? "border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-sm ring-2 ring-blue-500/30"
                          : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="text-base">🎓</span>
                      <span className="text-[11px] leading-tight font-black">Honors Frame</span>
                      <span className="text-[9px] text-slate-400 font-normal">Academic Rosettes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCoverDesignTheme("hexagonal_hive")}
                      className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all text-center cursor-pointer ${
                        coverDesignTheme === "hexagonal_hive"
                          ? "border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-sm ring-2 ring-blue-500/30"
                          : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="text-base">⬡</span>
                      <span className="text-[11px] leading-tight font-black">Hexagon Hive</span>
                      <span className="text-[9px] text-slate-400 font-normal">Tech Honeycomb</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCoverDesignTheme("facet_prism")}
                      className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all text-center cursor-pointer ${
                        coverDesignTheme === "facet_prism"
                          ? "border-blue-600 bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 shadow-sm ring-2 ring-blue-500/30"
                          : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className="text-base">◈</span>
                      <span className="text-[11px] leading-tight font-black">Prism Matrix</span>
                      <span className="text-[9px] text-slate-400 font-normal">Shards & Dots</span>
                    </button>
                  </div>
                </div>

                {/* Card 1: Document Details (Manual Input + Suggestions) */}
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-blue-600 tracking-wider">
                      Document Details
                    </h4>
                    <span className="text-[10px] font-semibold text-slate-400">
                      Template #{activeTpl.num} • {activeTpl.style}
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    {/* Manual Cover Type Input with Datalist */}
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-700 dark:text-slate-300">
                          Document / Cover Type
                        </label>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                          {language === "bn" ? "সরাসরি টাইপ বা সিলেক্ট" : "Manual input or select"}
                        </span>
                      </div>
                      <div className="relative mt-1">
                        <input
                          type="text"
                          list="seu-cover-types-datalist"
                          value={coverType}
                          onChange={(e) => setCoverType(e.target.value)}
                          placeholder="e.g. Assignment, Lab Report, Thesis, Case Study..."
                          className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                        <datalist id="seu-cover-types-datalist">
                          <option value="ASSIGNMENT" />
                          <option value="LAB REPORT" />
                          <option value="PROJECT REPORT" />
                          <option value="TERM PAPER" />
                          <option value="A THESIS ON" />
                          <option value="RESEARCH PROPOSAL" />
                          <option value="CASE STUDY" />
                          <option value="SEMINAR REPORT" />
                          <option value="INTERNSHIP REPORT" />
                          <option value="FINAL YEAR DESIGN PROJECT" />
                          <option value="GROUP ASSIGNMENT" />
                          <option value="FINAL LAB REPORT" />
                          <option value="PRESENTATION" />
                          <option value="LAB REPORT INDEX" />
                        </datalist>
                      </div>
                    </div>

                    {/* Topic / Project / Thesis Title with Live Counter & Auto-Fit Protection */}
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-700 dark:text-slate-300">
                          {activeTpl.category === "lab"
                            ? "Experiment Name / Topic"
                            : activeTpl.category === "thesis"
                            ? "Thesis Title"
                            : activeTpl.category === "project" || activeTpl.category === "capstone"
                            ? "Project Title"
                            : "Topic / Title"}
                        </label>
                        <span className="text-[10px] font-semibold text-slate-400">
                          <span className={coverTopic.length > 180 ? "text-amber-500 font-bold" : "text-slate-500"}>
                            {coverTopic.length}/200
                          </span>{" "}
                          • {language === "bn" ? "প্রিন্ট পেজে অটো-ফিট" : "Auto-fits A4 page"}
                        </span>
                      </div>
                      <input
                        type="text"
                        maxLength={200}
                        value={coverTopic}
                        onChange={(e) => setCoverTopic(e.target.value)}
                        placeholder={
                          activeTpl.category === "lab"
                            ? "e.g. CPU Scheduling Algorithms in OS"
                            : activeTpl.category === "thesis"
                            ? "e.g. DEEP LEARNING APPROACH FOR BIOINFORMATICS"
                            : "Enter topic or experiment title"
                        }
                        className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-xs"
                      />
                    </div>

                    {/* Category-Specific Extra Fields */}
                    {activeTpl.category === "lab" && (
                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300">Experiment No</label>
                          <input
                            type="text"
                            value={coverExpNo}
                            onChange={(e) => setCoverExpNo(e.target.value)}
                            placeholder="01"
                            className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300">Date of Experiment</label>
                          <input
                            type="text"
                            value={coverExpDate}
                            onChange={(e) => setCoverExpDate(e.target.value)}
                            placeholder="DD.MM.YYYY"
                            className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                          />
                        </div>
                      </div>
                    )}

                    {activeTpl.category === "proposal" && (
                      <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                        <label className="font-bold text-slate-700 dark:text-slate-300">Research Area / Domain</label>
                        <input
                          type="text"
                          value={coverResearchArea}
                          onChange={(e) => setCoverResearchArea(e.target.value)}
                          placeholder="e.g. Machine Learning, Cloud Computing"
                          className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        />
                      </div>
                    )}

                    {activeTpl.category === "internship" && (
                      <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300">Organization / Company</label>
                          <input
                            type="text"
                            value={coverOrganization}
                            onChange={(e) => setCoverOrganization(e.target.value)}
                            placeholder="e.g. Brain Station 23 / SEU IT"
                            className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-bold text-slate-700 dark:text-slate-300">Intern Role</label>
                            <input
                              type="text"
                              value={coverInternRole}
                              onChange={(e) => setCoverInternRole(e.target.value)}
                              placeholder="Software Engineer Intern"
                              className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                            />
                          </div>
                          <div>
                            <label className="font-bold text-slate-700 dark:text-slate-300">Period</label>
                            <input
                              type="text"
                              value={coverInternPeriod}
                              onChange={(e) => setCoverInternPeriod(e.target.value)}
                              placeholder="01.06.2026 – 31.08.2026"
                              className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300">Industry Supervisor</label>
                          <input
                            type="text"
                            value={coverIndustrySupervisor}
                            onChange={(e) => setCoverIndustrySupervisor(e.target.value)}
                            placeholder="Supervisor Name, Designation, Company"
                            className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                          />
                        </div>
                      </div>
                    )}

                    {activeTpl.category === "capstone" && (
                      <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <label className="font-bold text-slate-700 dark:text-slate-300">Project Team Members</label>
                        {coverTeamMembers.map((member, idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
                            <span className="col-span-1 text-center font-bold text-slate-400">#{idx + 1}</span>
                            <input
                              type="text"
                              value={member.name}
                              onChange={(e) => {
                                const updated = [...coverTeamMembers];
                                updated[idx].name = e.target.value;
                                setCoverTeamMembers(updated);
                              }}
                              placeholder={`Member ${idx + 1} Name`}
                              className="col-span-6 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                            />
                            <input
                              type="text"
                              value={member.id}
                              onChange={(e) => {
                                const updated = [...coverTeamMembers];
                                updated[idx].id = e.target.value;
                                setCoverTeamMembers(updated);
                              }}
                              placeholder="Student ID"
                              className="col-span-5 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px]"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                </div>

                {/* Card 2: Course Information */}
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <h4 className="text-xs font-black uppercase text-blue-600 tracking-wider">
                    Course Information
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-700 dark:text-slate-300">Quick Select Course</label>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                          {language === "bn" ? "ম্যানুয়ালি টাইপ বা ড্রপডাউন থেকে সিলেক্ট" : "Manual input or select"}
                        </span>
                      </div>
                      <div className="relative mt-1">
                        <input
                          type="text"
                          list="seu-courses-datalist"
                          value={quickCourseInput}
                          onChange={(e) => handleQuickCourseChange(e.target.value)}
                          placeholder="Type course code/title (e.g. CSE241 or CSE241.1)..."
                          className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                        <datalist id="seu-courses-datalist">
                          {coursesList.map((c) => (
                            <option key={c.code} value={`${c.code} — ${c.title}`} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-1">
                        <label className="font-bold text-slate-700 dark:text-slate-300">Code</label>
                        <input
                          type="text"
                          value={coverCourseCode}
                          maxLength={20}
                          onChange={(e) => setCoverCourseCode(e.target.value)}
                          className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="font-bold text-slate-700 dark:text-slate-300">Section</label>
                        <input
                          type="text"
                          value={coverSection}
                          maxLength={20}
                          onChange={(e) => setCoverSection(e.target.value)}
                          placeholder="e.g. 8 or Sec 1"
                          className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300">Course Title</label>
                      <input
                        type="text"
                        value={coverCourseTitle}
                        maxLength={120}
                        onChange={(e) => setCoverCourseTitle(e.target.value)}
                        className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Card 3: Submitted To (Faculty) */}
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <h4 className="text-xs font-black uppercase text-blue-600 tracking-wider">
                    {activeTpl.category === "thesis" || activeTpl.category === "capstone"
                      ? "Supervised By (Faculty Member)"
                      : "Submitted To (Faculty Member)"}
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-700 dark:text-slate-300">Quick Select Faculty Member</label>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                          {language === "bn" ? "ম্যানুয়ালি টাইপ বা ড্রপডাউন থেকে সিলেক্ট" : "Manual input or select"}
                        </span>
                      </div>
                      <div className="relative mt-1">
                        <input
                          type="text"
                          list="seu-teachers-datalist"
                          value={quickTeacherInput}
                          onChange={(e) => handleQuickTeacherChange(e.target.value)}
                          placeholder="Type teacher name or initial (e.g. MAM)..."
                          className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                        />
                        <datalist id="seu-teachers-datalist">
                          {teachersList.map((t) => (
                            <option
                              key={t.id}
                              value={`${t.name}${t.initial ? ` (${t.initial})` : ''} — ${t.designation || 'CSE'}`}
                            />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="font-bold text-slate-700 dark:text-slate-300">Teacher Name</label>
                        <input
                          type="text"
                          value={coverTeacherName}
                          maxLength={80}
                          onChange={(e) => setCoverTeacherName(e.target.value)}
                          className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300">Initial</label>
                        <input
                          type="text"
                          value={coverTeacherInitial}
                          maxLength={15}
                          onChange={(e) => setCoverTeacherInitial(e.target.value)}
                          className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300">Designation & Department</label>
                      <input
                        type="text"
                        value={coverTeacherDesignation}
                        maxLength={100}
                        onChange={(e) => setCoverTeacherDesignation(e.target.value)}
                        className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Card 4: Submitted By (Student) */}
                <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <h4 className="text-xs font-black uppercase text-blue-600 tracking-wider">
                    {activeTpl.category === "seminar" ? "Presented By (Student)" : "Submitted By (Student)"}
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300">Your Full Name</label>
                      <input
                        type="text"
                        value={coverStudentName}
                        maxLength={80}
                        onChange={(e) => setCoverStudentName(e.target.value)}
                        className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300">Student ID</label>
                        <input
                          type="text"
                          value={coverStudentID}
                          maxLength={25}
                          onChange={(e) => setCoverStudentID(e.target.value)}
                          placeholder="e.g. 2023200000686"
                          className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300">Semester</label>
                        <input
                          type="text"
                          value={coverSemester}
                          maxLength={30}
                          onChange={(e) => setCoverSemester(e.target.value)}
                          placeholder="Fall 2026"
                          className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center">
                        <label className="font-bold text-slate-700 dark:text-slate-300">Department</label>
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">All Departments Supported</span>
                      </div>
                      <input
                        type="text"
                        value={coverDepartment}
                        maxLength={120}
                        onChange={(e) => setCoverDepartment(e.target.value)}
                        placeholder="Department of Computer Science & Engineering"
                        className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
                      />
                      {/* Quick Department Selector Pills for All SEU Departments */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {[
                          { name: "CSE", full: "Department of Computer Science & Engineering" },
                          { name: "EEE", full: "Department of Electrical & Electronic Engineering" },
                          { name: "Architecture", full: "Department of Architecture" },
                          { name: "Textile", full: "Department of Textile Engineering" },
                          { name: "Pharmacy", full: "Department of Pharmacy" },
                          { name: "BBA", full: "Department of Business Administration (BBA)" },
                          { name: "Law", full: "Department of Law & Justice" },
                          { name: "English", full: "Department of English" },
                          { name: "Bangla", full: "Department of Bangla" },
                          { name: "Economics", full: "Department of Economics" },
                          { name: "ICT", full: "Department of Information & Communication Technology" },
                        ].map((d) => (
                          <button
                            key={d.name}
                            type="button"
                            onClick={() => setCoverDepartment(d.full)}
                            className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                              coverDepartment === d.full
                                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400"
                            }`}
                          >
                            {d.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300">Submission Date</label>
                      <input
                        type="text"
                        value={coverSubmissionDate}
                        maxLength={30}
                        onChange={(e) => setCoverSubmissionDate(e.target.value)}
                        placeholder="e.g. 21.09.2026"
                        className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                      />
                    </div>

                    <label className="flex items-center gap-2 pt-2 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberDetails}
                        onChange={(e) => setRememberDetails(e.target.checked)}
                        className="rounded accent-blue-600"
                      />
                      <span>Remember my details on this device</span>
                    </label>
                  </div>
                </div>

              </div>

              {/* RIGHT LIVE A4 PREVIEW (7 Cols) */}
              <div className="lg:col-span-7 flex flex-col items-center">
                
                {/* Header bar above Preview */}
                <div className="w-full flex items-center justify-between mb-3 px-2 print:hidden">
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                    <Printer className="w-4 h-4 text-blue-500" />
                    <span>Live A4 Preview ({activeTpl.name} • {activeTpl.style})</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">Standard A4 • 210 × 297 mm</span>
                </div>

                {/* A4 Paper Container with Multi-Theme Graphics & Official A4 Layout */}
                <div 
                  id="seu-cover-preview"
                  className={`w-full max-w-[620px] bg-white text-black shadow-2xl p-2 sm:p-2.5 rounded-lg font-serif relative select-none overflow-hidden ${
                    coverDesignTheme === "classic"
                      ? (activeTpl.style === "BW" ? "border-2 border-black" : "border-2 border-blue-900 shadow-blue-900/10")
                      : coverDesignTheme === "executive_crest"
                      ? "border-2 border-amber-600/60 shadow-amber-900/10"
                      : coverDesignTheme === "cyber_circuit"
                      ? "border border-sky-400/60 shadow-sky-900/10"
                      : coverDesignTheme === "fluted_academic"
                      ? "border-2 border-blue-950 shadow-blue-950/10"
                      : coverDesignTheme === "hexagonal_hive"
                      ? "border-2 border-amber-600/70 shadow-amber-900/10"
                      : coverDesignTheme === "facet_prism"
                      ? "border-2 border-teal-700/70 shadow-teal-900/10"
                      : "border border-slate-300 shadow-slate-900/10"
                  }`}
                  style={{ minHeight: "840px" }}
                >
                  {/* Outer Frame Container */}
                  <div 
                    className={`w-full flex-1 flex flex-col justify-between relative ${
                      activeTpl.layoutStyle === "asymmetric_spine" ||
                      activeTpl.layoutStyle === "bold_editorial" ||
                      activeTpl.layoutStyle === "floating_pill_cards"
                        ? "p-0"
                        : "p-6 sm:p-10"
                    } ${
                      activeTpl.layoutStyle === "asymmetric_spine" ||
                      activeTpl.layoutStyle === "bold_editorial" ||
                      activeTpl.layoutStyle === "floating_pill_cards"
                        ? ""
                        : coverDesignTheme === "classic"
                        ? (activeTpl.style === "BW" ? "border border-black" : "border border-blue-900/40")
                        : coverDesignTheme === "modern_wave"
                        ? "pr-14 sm:pr-18"
                        : coverDesignTheme === "minimal_sidebar"
                        ? "pl-10 sm:pl-12"
                        : coverDesignTheme === "executive_crest"
                        ? "p-8 sm:p-11"
                        : coverDesignTheme === "cyber_circuit"
                        ? "p-7 sm:p-10"
                        : coverDesignTheme === "fluted_academic"
                        ? "p-7 sm:p-10"
                        : coverDesignTheme === "hexagonal_hive"
                        ? "p-6 sm:p-9 pl-10 sm:pl-14"
                        : coverDesignTheme === "facet_prism"
                        ? "p-6 sm:p-9 pl-12 sm:pl-16"
                        : ""
                    }`}
                    style={{ minHeight: "840px" }}
                  >
                    
                    {/* Generic Theme Background Graphics (Strictly for classic_table so they never conflict with handcrafted layouts) */}
                    {activeTpl.layoutStyle === "classic_table" && (
                      <>
                    {/* Modern Wave SVG Graphic (Image 1 Style Flowing Ribbons) */}
                    {coverDesignTheme === "modern_wave" && (
                      <div className="absolute inset-y-0 right-0 w-[24%] pointer-events-none z-0 overflow-hidden">
                        <svg className="w-full h-full" viewBox="0 0 140 842" preserveAspectRatio="none" fill="none">
                          <defs>
                            <linearGradient id="liveNavyWave" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor={activeTpl.style === "Color" ? "#1e3a8a" : "#1e293b"} />
                              <stop offset="100%" stopColor={activeTpl.style === "Color" ? "#0f172a" : "#000000"} />
                            </linearGradient>
                            <linearGradient id="liveCyanWave" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={activeTpl.style === "Color" ? "#0284c7" : "#64748b"} stopOpacity="0.85" />
                              <stop offset="50%" stopColor={activeTpl.style === "Color" ? "#06b6d4" : "#94a3b8"} stopOpacity="0.75" />
                              <stop offset="100%" stopColor={activeTpl.style === "Color" ? "#0ea5e9" : "#475569"} stopOpacity="0.9" />
                            </linearGradient>
                          </defs>
                          <path d="M90,0 C170,220 20,480 130,842 L240,842 L240,0 Z" fill={activeTpl.style === "Color" ? "#93c5fd" : "#cbd5e1"} fillOpacity="0.25" />
                          <path d="M125,0 C210,260 40,540 150,842 L240,842 L240,0 Z" fill="url(#liveNavyWave)" />
                          <path d="M165,0 C75,240 195,520 90,842 L240,842 L240,0 Z" fill="url(#liveCyanWave)" />
                          <path d="M155,0 C65,250 185,530 80,842" stroke={activeTpl.style === "Color" ? "#38bdf8" : "#e2e8f0"} strokeWidth="3" fill="none" opacity="0.9" />
                          <path d="M140,0 C50,260 170,540 65,842" stroke={activeTpl.style === "Color" ? "#bae6fd" : "#ffffff"} strokeWidth="1.5" strokeDasharray="4 4" fill="none" opacity="0.7" />
                        </svg>
                      </div>
                    )}

                    {/* Prestige Arch SVG Graphic (Image 2 Style Wave Ribbon Arches) */}
                    {coverDesignTheme === "prestige_arch" && (
                      <>
                        <div className="absolute top-0 inset-x-0 h-28 sm:h-32 pointer-events-none z-0 overflow-hidden">
                          <svg className="w-full h-full" viewBox="0 0 600 130" preserveAspectRatio="none" fill="none">
                            <defs>
                              <linearGradient id="liveTopArch" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor={activeTpl.style === "Color" ? "#0f172a" : "#000000"} />
                                <stop offset="60%" stopColor={activeTpl.style === "Color" ? "#1e3a8a" : "#1e293b"} />
                                <stop offset="100%" stopColor={activeTpl.style === "Color" ? "#312e81" : "#334155"} />
                              </linearGradient>
                            </defs>
                            <path d="M0,0 L600,0 L600,45 C460,110 220,35 0,90 Z" fill="url(#liveTopArch)" />
                            <path d="M0,0 L600,0 L600,25 C420,75 160,15 0,70 Z" fill={activeTpl.style === "Color" ? "#0284c7" : "#64748b"} fillOpacity="0.45" />
                            <path d="M0,82 C180,30 430,95 600,40" stroke={activeTpl.style === "Color" ? "#38bdf8" : "#94a3b8"} strokeWidth="2" fill="none" opacity="0.8" />
                            <path d="M0,92 C190,40 440,105 600,50" stroke={activeTpl.style === "Color" ? "#93c5fd" : "#cbd5e1"} strokeWidth="1.2" strokeDasharray="6 3" fill="none" opacity="0.6" />
                            <path d="M0,102 C200,50 450,115 600,60" stroke={activeTpl.style === "Color" ? "#bae6fd" : "#e2e8f0"} strokeWidth="0.8" fill="none" opacity="0.4" />
                          </svg>
                        </div>

                        <div className="absolute bottom-0 inset-x-0 h-28 sm:h-32 pointer-events-none z-0 overflow-hidden">
                          <svg className="w-full h-full" viewBox="0 0 600 130" preserveAspectRatio="none" fill="none">
                            <defs>
                              <linearGradient id="liveBotArch" x1="0" y1="1" x2="1" y2="0">
                                <stop offset="0%" stopColor={activeTpl.style === "Color" ? "#0f172a" : "#000000"} />
                                <stop offset="60%" stopColor={activeTpl.style === "Color" ? "#1e3a8a" : "#1e293b"} />
                                <stop offset="100%" stopColor={activeTpl.style === "Color" ? "#312e81" : "#334155"} />
                              </linearGradient>
                            </defs>
                            <path d="M0,130 L600,130 L600,85 C420,25 180,95 0,40 Z" fill="url(#liveBotArch)" />
                            <path d="M0,130 L600,130 L600,105 C460,55 220,115 0,60 Z" fill={activeTpl.style === "Color" ? "#0284c7" : "#64748b"} fillOpacity="0.45" />
                            <path d="M0,48 C160,100 410,35 600,90" stroke={activeTpl.style === "Color" ? "#38bdf8" : "#94a3b8"} strokeWidth="2" fill="none" opacity="0.8" />
                            <path d="M0,58 C170,110 420,45 600,100" stroke={activeTpl.style === "Color" ? "#93c5fd" : "#cbd5e1"} strokeWidth="1.2" strokeDasharray="6 3" fill="none" opacity="0.6" />
                            <path d="M0,68 C180,120 430,55 600,110" stroke={activeTpl.style === "Color" ? "#bae6fd" : "#e2e8f0"} strokeWidth="0.8" fill="none" opacity="0.4" />
                          </svg>
                        </div>
                      </>
                    )}

                    {/* Geometric Tech Polygon Graphic */}
                    {coverDesignTheme === "geometric_tech" && (
                      <>
                        <div className="absolute top-0 right-0 w-48 h-20 pointer-events-none z-0 overflow-hidden">
                          <svg className="w-full h-full" viewBox="0 0 260 90" preserveAspectRatio="none" fill="none">
                            <polygon points="0,0 260,0 260,90 80,0" fill={activeTpl.style === "Color" ? "#1e3a8a" : "#0f172a"} />
                            <polygon points="40,0 260,0 260,50 120,0" fill={activeTpl.style === "Color" ? "#06b6d4" : "#64748b"} fillOpacity="0.6" />
                          </svg>
                        </div>
                        <div className="absolute bottom-0 left-0 w-48 h-20 pointer-events-none z-0 overflow-hidden">
                          <svg className="w-full h-full" viewBox="0 0 260 90" preserveAspectRatio="none" fill="none">
                            <polygon points="0,90 260,90 180,0 0,0" fill={activeTpl.style === "Color" ? "#1e3a8a" : "#0f172a"} />
                            <polygon points="0,90 200,90 140,40 0,40" fill={activeTpl.style === "Color" ? "#06b6d4" : "#64748b"} fillOpacity="0.6" />
                          </svg>
                        </div>
                      </>
                    )}

                    {/* Minimal Sidebar Stripe */}
                    {coverDesignTheme === "minimal_sidebar" && (
                      <div 
                        className="absolute top-0 bottom-0 left-0 w-7 sm:w-8 pointer-events-none z-0 flex flex-col justify-between py-6 items-center"
                        style={{ background: activeTpl.style === "Color" ? "linear-gradient(180deg, #1e3a8a 0%, #0284c7 50%, #0f172a 100%)" : "#0f172a" }}
                      >
                        <span className="text-[9px] font-black tracking-widest text-white/80 rotate-180 uppercase" style={{ writingMode: "vertical-rl" }}>
                          SOUTHEAST UNIVERSITY
                        </span>
                        <div className="w-2 h-2 rounded-full bg-cyan-400" />
                      </div>
                    )}

                    {/* Executive Crest / Ribbon Graphic */}
                    {coverDesignTheme === "executive_crest" && (
                      <>
                        <div className="absolute top-0 left-0 w-44 sm:w-56 h-44 sm:h-56 pointer-events-none z-0 overflow-hidden">
                          <svg className="w-full h-full" viewBox="0 0 200 200" preserveAspectRatio="none" fill="none">
                            <defs>
                              <linearGradient id="liveExecNavy" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor={activeTpl.style === "Color" ? "#0f172a" : "#000000"} />
                                <stop offset="100%" stopColor={activeTpl.style === "Color" ? "#1e3a8a" : "#1e293b"} />
                              </linearGradient>
                              <linearGradient id="liveExecGold" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor={activeTpl.style === "Color" ? "#fbbf24" : "#94a3b8"} />
                                <stop offset="50%" stopColor={activeTpl.style === "Color" ? "#d97706" : "#64748b"} />
                                <stop offset="100%" stopColor={activeTpl.style === "Color" ? "#b45309" : "#475569"} />
                              </linearGradient>
                            </defs>
                            <polygon points="0,0 200,0 0,200" fill="url(#liveExecNavy)" />
                            <polygon points="0,175 0,195 195,0 175,0" fill="url(#liveExecGold)" />
                            <polygon points="0,150 0,160 160,0 150,0" fill={activeTpl.style === "Color" ? "#38bdf8" : "#cbd5e1"} opacity="0.8" />
                            <line x1="0" y1="135" x2="135" y2="0" stroke={activeTpl.style === "Color" ? "#fbbf24" : "#e2e8f0"} strokeWidth="1.5" strokeDasharray="3 3" />
                          </svg>
                        </div>

                        <div className="absolute bottom-0 right-0 w-36 sm:w-48 h-36 sm:h-48 pointer-events-none z-0 overflow-hidden">
                          <svg className="w-full h-full" viewBox="0 0 160 160" preserveAspectRatio="none" fill="none">
                            <polygon points="160,0 160,160 0,160" fill="url(#liveExecNavy)" />
                            <polygon points="160,20 160,35 35,160 20,160" fill="url(#liveExecGold)" />
                            <line x1="160" y1="50" x2="50" y2="160" stroke={activeTpl.style === "Color" ? "#38bdf8" : "#cbd5e1"} strokeWidth="1.5" strokeDasharray="4 4" />
                          </svg>
                        </div>

                        <div 
                          className="absolute inset-2 sm:inset-3 pointer-events-none z-0 rounded-sm"
                          style={{
                            border: activeTpl.style === "Color" ? "2px solid #1e3a8a" : "2px solid #000000",
                            outline: activeTpl.style === "Color" ? "1px solid #d97706" : "1px solid #94a3b8",
                            outlineOffset: "-6px"
                          }}
                        />
                      </>
                    )}

                    {/* Cyber Circuit Theme Graphic */}
                    {coverDesignTheme === "cyber_circuit" && (
                      <div className="absolute inset-1 sm:inset-2 pointer-events-none z-0 overflow-hidden">
                        <svg className="w-full h-full" viewBox="0 0 600 842" preserveAspectRatio="none" fill="none">
                          <defs>
                            <linearGradient id="liveCircuitGrad" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor={activeTpl.style === "Color" ? "#0284c7" : "#334155"} />
                              <stop offset="50%" stopColor={activeTpl.style === "Color" ? "#2563eb" : "#475569"} />
                              <stop offset="100%" stopColor={activeTpl.style === "Color" ? "#06b6d4" : "#64748b"} />
                            </linearGradient>
                          </defs>

                          {/* Top-Left Circuit Node Cluster */}
                          <path d="M15,80 L15,15 L80,15" stroke="url(#liveCircuitGrad)" strokeWidth="3" fill="none" />
                          <path d="M15,40 L45,40 L60,25 L120,25" stroke={activeTpl.style === "Color" ? "#0ea5e9" : "#64748b"} strokeWidth="1.5" fill="none" />
                          <circle cx="120" cy="25" r="3.5" fill={activeTpl.style === "Color" ? "#06b6d4" : "#000"} />
                          <path d="M40,15 L40,60 L55,75 L55,110" stroke={activeTpl.style === "Color" ? "#3b82f6" : "#94a3b8"} strokeWidth="1.5" fill="none" />
                          <circle cx="55" cy="110" r="3" fill={activeTpl.style === "Color" ? "#3b82f6" : "#000"} />

                          {/* Top-Right Circuit Node */}
                          <path d="M585,80 L585,15 L520,15" stroke="url(#liveCircuitGrad)" strokeWidth="3" fill="none" />
                          <path d="M585,45 L555,45 L540,30 L480,30" stroke={activeTpl.style === "Color" ? "#0ea5e9" : "#64748b"} strokeWidth="1.5" fill="none" />
                          <circle cx="480" cy="30" r="3.5" fill={activeTpl.style === "Color" ? "#06b6d4" : "#000"} />

                          {/* Bottom-Left Circuit Node */}
                          <path d="M15,762 L15,827 L80,827" stroke="url(#liveCircuitGrad)" strokeWidth="3" fill="none" />
                          <path d="M15,800 L50,800 L65,815 L130,815" stroke={activeTpl.style === "Color" ? "#0ea5e9" : "#64748b"} strokeWidth="1.5" fill="none" />
                          <circle cx="130" cy="815" r="3.5" fill={activeTpl.style === "Color" ? "#06b6d4" : "#000"} />

                          {/* Bottom-Right Circuit Node */}
                          <path d="M585,762 L585,827 L520,827" stroke="url(#liveCircuitGrad)" strokeWidth="3" fill="none" />
                          <path d="M585,795 L550,795 L535,810 L470,810" stroke={activeTpl.style === "Color" ? "#0ea5e9" : "#64748b"} strokeWidth="1.5" fill="none" />
                          <circle cx="470" cy="810" r="3.5" fill={activeTpl.style === "Color" ? "#06b6d4" : "#000"} />
                          <path d="M560,827 L560,780 L545,765 L545,730" stroke={activeTpl.style === "Color" ? "#3b82f6" : "#94a3b8"} strokeWidth="1.5" fill="none" />
                          <circle cx="545" cy="730" r="3" fill={activeTpl.style === "Color" ? "#3b82f6" : "#000"} />

                          {/* Technical Grid Inner Rule */}
                          <rect x="25" y="25" width="550" height="792" stroke={activeTpl.style === "Color" ? "rgba(2, 132, 199, 0.25)" : "rgba(0,0,0,0.15)"} strokeWidth="1" strokeDasharray="16 6" fill="none" />
                        </svg>
                      </div>
                    )}

                    {/* Fluted Academic Honors Certificate Frame */}
                    {coverDesignTheme === "fluted_academic" && (
                      <div className="absolute inset-1.5 sm:inset-2.5 pointer-events-none z-0">
                        <div 
                          className="w-full h-full relative"
                          style={{
                            border: activeTpl.style === "Color" ? "2.5px solid #1e3a8a" : "2.5px solid #000000",
                          }}
                        >
                          <div 
                            className="absolute inset-1.5"
                            style={{
                              border: activeTpl.style === "Color" ? "1px solid rgba(30, 58, 138, 0.45)" : "1px solid rgba(0, 0, 0, 0.35)",
                            }}
                          />
                          <div className="absolute -top-1.5 -left-1.5 w-6 h-6 flex items-center justify-center">
                            <div className="w-5 h-5 rounded-full border bg-white flex items-center justify-center" style={{ borderColor: activeTpl.style === "Color" ? "#1e3a8a" : "#000" }}>
                              <div className="w-2 h-2 rounded-full" style={{ background: activeTpl.style === "Color" ? "#1e3a8a" : "#000" }} />
                            </div>
                          </div>
                          <div className="absolute -top-1.5 -right-1.5 w-6 h-6 flex items-center justify-center">
                            <div className="w-5 h-5 rounded-full border bg-white flex items-center justify-center" style={{ borderColor: activeTpl.style === "Color" ? "#1e3a8a" : "#000" }}>
                              <div className="w-2 h-2 rounded-full" style={{ background: activeTpl.style === "Color" ? "#1e3a8a" : "#000" }} />
                            </div>
                          </div>
                          <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 flex items-center justify-center">
                            <div className="w-5 h-5 rounded-full border bg-white flex items-center justify-center" style={{ borderColor: activeTpl.style === "Color" ? "#1e3a8a" : "#000" }}>
                              <div className="w-2 h-2 rounded-full" style={{ background: activeTpl.style === "Color" ? "#1e3a8a" : "#000" }} />
                            </div>
                          </div>
                          <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 flex items-center justify-center">
                            <div className="w-5 h-5 rounded-full border bg-white flex items-center justify-center" style={{ borderColor: activeTpl.style === "Color" ? "#1e3a8a" : "#000" }}>
                              <div className="w-2 h-2 rounded-full" style={{ background: activeTpl.style === "Color" ? "#1e3a8a" : "#000" }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Hexagon Hive (Tech Honeycomb Matrix - Images 3 & 4 Style) */}
                    {coverDesignTheme === "hexagonal_hive" && (
                      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                        <svg className="w-full h-full" viewBox="0 0 600 842" preserveAspectRatio="none" fill="none">
                          <defs>
                            {/* Honeycomb repeating mesh pattern */}
                            <pattern id="liveHexMesh" width="30" height="52" patternUnits="userSpaceOnUse">
                              <path 
                                d="M15,0 L30,8.66 L30,26 L15,34.64 L0,26 L0,8.66 Z M0,43.3 L15,34.64 M30,43.3 L15,34.64 M15,34.64 L15,52" 
                                stroke={activeTpl.style === "Color" ? "rgba(2, 132, 199, 0.15)" : "rgba(0, 0, 0, 0.08)"} 
                                strokeWidth="0.9" 
                                fill="none" 
                              />
                            </pattern>
                            <linearGradient id="liveAmberHexTop" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor={activeTpl.style === "Color" ? "#fef3c7" : "#f1f5f9"} />
                              <stop offset="100%" stopColor={activeTpl.style === "Color" ? "#f59e0b" : "#94a3b8"} />
                            </linearGradient>
                            <linearGradient id="liveAmberHexLeft" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor={activeTpl.style === "Color" ? "#d97706" : "#64748b"} />
                              <stop offset="100%" stopColor={activeTpl.style === "Color" ? "#b45309" : "#475569"} />
                            </linearGradient>
                            <linearGradient id="liveAmberHexRight" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor={activeTpl.style === "Color" ? "#92400e" : "#334155"} />
                              <stop offset="100%" stopColor={activeTpl.style === "Color" ? "#78350f" : "#1e293b"} />
                            </linearGradient>
                            <linearGradient id="liveNavyHex" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor={activeTpl.style === "Color" ? "#1e293b" : "#334155"} />
                              <stop offset="100%" stopColor={activeTpl.style === "Color" ? "#0f172a" : "#000000"} />
                            </linearGradient>
                            <linearGradient id="liveCyanHex" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor={activeTpl.style === "Color" ? "#38bdf8" : "#94a3b8"} />
                              <stop offset="100%" stopColor={activeTpl.style === "Color" ? "#0284c7" : "#475569"} />
                            </linearGradient>
                            <filter id="hexDropShadow" x="-10%" y="-10%" width="130%" height="130%">
                              <feDropShadow dx="2" dy="4" stdDeviation="4" floodOpacity="0.18" />
                            </filter>
                          </defs>

                          {/* 1. Full-page technical honeycomb grid background */}
                          <rect width="100%" height="100%" fill="url(#liveHexMesh)" opacity="0.85" />

                          {/* 2. Top-Left 3D Clustered Isometric Hexagons - Restrained strictly to left outer margin (max x=28px) */}
                          <g filter="url(#hexDropShadow)">
                            {/* Hexagon 1: Warm Amber / Copper 3D Isometric Hexagon */}
                            <g transform="translate(-40, 45) scale(0.72)">
                              <polygon points="55,5 95,28 55,51 15,28" fill="url(#liveAmberHexTop)" />
                              <polygon points="15,28 55,51 55,97 15,74" fill="url(#liveAmberHexLeft)" />
                              <polygon points="55,51 95,28 95,74 55,97" fill="url(#liveAmberHexRight)" />
                            </g>

                            {/* Hexagon 2: Deep Navy/Charcoal Hexagon */}
                            <g transform="translate(-50, 115) scale(0.72)">
                              <polygon points="55,10 95,33 55,56 15,33" fill={activeTpl.style === "Color" ? "#334155" : "#475569"} />
                              <polygon points="15,33 55,56 55,102 15,79" fill="url(#liveNavyHex)" />
                              <polygon points="55,56 95,33 95,79 55,102" fill={activeTpl.style === "Color" ? "#020617" : "#0f172a"} />
                            </g>

                            {/* Hexagon 3: Electric Cyan Tech Hexagon */}
                            <g transform="translate(-35, 175) scale(0.72)">
                              <polygon points="50,8 86,28 50,49 14,28" fill={activeTpl.style === "Color" ? "#7dd3fc" : "#cbd5e1"} />
                              <polygon points="14,28 50,49 50,90 14,69" fill="url(#liveCyanHex)" />
                              <polygon points="50,49 86,28 86,69 50,90" fill={activeTpl.style === "Color" ? "#0369a1" : "#334155"} />
                            </g>

                            {/* Hexagon 4: Small Emerald Accent Hexagon */}
                            <g transform="translate(-45, 245) scale(0.72)">
                              <polygon points="35,6 60,20 35,35 10,20" fill={activeTpl.style === "Color" ? "#86efac" : "#e2e8f0"} />
                              <polygon points="10,20 35,35 35,64 10,49" fill={activeTpl.style === "Color" ? "#16a34a" : "#64748b"} />
                              <polygon points="35,35 60,20 60,49 35,64" fill={activeTpl.style === "Color" ? "#15803d" : "#334155"} />
                            </g>
                          </g>

                          {/* 3. Bottom-Left Tech Hexagon Cluster - Restrained to corner margin (max x=22px) */}
                          <g filter="url(#hexDropShadow)" transform="translate(-40, 750) scale(0.72)">
                            <polygon points="50,8 86,28 50,49 14,28" fill={activeTpl.style === "Color" ? "#cbd5e1" : "#e2e8f0"} />
                            <polygon points="14,28 50,49 50,90 14,69" fill="url(#liveNavyHex)" />
                            <polygon points="50,49 86,28 86,69 50,90" fill={activeTpl.style === "Color" ? "#1e3a8a" : "#475569"} />
                          </g>
                        </svg>
                      </div>
                    )}

                    {/* Prism Matrix (Facet Shards & Halftone Dots - Images 1 & 2 Style) */}
                    {coverDesignTheme === "facet_prism" && (
                      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                        <svg className="w-full h-full" viewBox="0 0 600 842" preserveAspectRatio="none" fill="none">
                          <defs>
                            {/* Halftone Dot Pattern */}
                            <pattern id="liveFacetDots" width="12" height="12" patternUnits="userSpaceOnUse">
                              <circle cx="3" cy="3" r="1.3" fill={activeTpl.style === "Color" ? "#64748b" : "#475569"} opacity="0.35" />
                            </pattern>
                            <linearGradient id="liveFacetEmerald" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor={activeTpl.style === "Color" ? "#047857" : "#1e293b"} />
                              <stop offset="100%" stopColor={activeTpl.style === "Color" ? "#065f46" : "#0f172a"} />
                            </linearGradient>
                            <linearGradient id="liveFacetMint" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor={activeTpl.style === "Color" ? "#10b981" : "#475569"} />
                              <stop offset="100%" stopColor={activeTpl.style === "Color" ? "#34d399" : "#94a3b8"} />
                            </linearGradient>
                            <linearGradient id="liveFacetNavy" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor={activeTpl.style === "Color" ? "#1e3a8a" : "#334155"} />
                              <stop offset="100%" stopColor={activeTpl.style === "Color" ? "#0f172a" : "#000000"} />
                            </linearGradient>
                            <linearGradient id="liveFacetCyan" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor={activeTpl.style === "Color" ? "#0284c7" : "#64748b"} />
                              <stop offset="100%" stopColor={activeTpl.style === "Color" ? "#06b6d4" : "#94a3b8"} />
                            </linearGradient>
                            <linearGradient id="liveFacetGold" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor={activeTpl.style === "Color" ? "#f59e0b" : "#cbd5e1"} />
                              <stop offset="100%" stopColor={activeTpl.style === "Color" ? "#d97706" : "#94a3b8"} />
                            </linearGradient>
                          </defs>

                          {/* 1. Halftone Dot Grid Accents in far corners only */}
                          <rect x="490" y="40" width="80" height="90" fill="url(#liveFacetDots)" />
                          <rect x="480" y="720" width="90" height="80" fill="url(#liveFacetDots)" />

                          {/* 2. Left Edge Low-Poly Facet Shard Mosaic - Kept strictly along narrow left edge (max x=30px) so text is 100% readable with zero overlap */}
                          <polygon points="0,0 26,0 16,110 0,150" fill="url(#liveFacetEmerald)" />
                          <polygon points="0,60 30,80 18,210 0,180" fill="url(#liveFacetMint)" opacity="0.85" />
                          <polygon points="0,170 26,195 14,320 0,290" fill="url(#liveFacetCyan)" opacity="0.9" />
                          <polygon points="0,270 30,340 18,470 0,440" fill="url(#liveFacetNavy)" />
                          <polygon points="0,420 28,465 15,570 0,550" fill="url(#liveFacetGold)" opacity="0.9" />
                          <polygon points="0,530 30,590 16,710 0,680" fill="url(#liveFacetEmerald)" opacity="0.9" />
                          <polygon points="0,660 26,710 18,842 0,842" fill="url(#liveFacetNavy)" />

                          {/* 3. Subtle translucent geometric wireframe lines connecting facets along edge */}
                          <line x1="26" y1="0" x2="30" y2="80" stroke={activeTpl.style === "Color" ? "#a7f3d0" : "#ffffff"} strokeWidth="1" opacity="0.7" />
                          <line x1="30" y1="80" x2="26" y2="195" stroke={activeTpl.style === "Color" ? "#67e8f9" : "#ffffff"} strokeWidth="1" opacity="0.7" />
                          <line x1="26" y1="195" x2="30" y2="340" stroke={activeTpl.style === "Color" ? "#93c5fd" : "#ffffff"} strokeWidth="1" opacity="0.7" />
                          <line x1="30" y1="340" x2="28" y2="465" stroke={activeTpl.style === "Color" ? "#fde68a" : "#ffffff"} strokeWidth="1" opacity="0.7" />
                          <line x1="28" y1="465" x2="30" y2="590" stroke={activeTpl.style === "Color" ? "#a7f3d0" : "#ffffff"} strokeWidth="1" opacity="0.7" />
                          <line x1="30" y1="590" x2="26" y2="710" stroke={activeTpl.style === "Color" ? "#93c5fd" : "#ffffff"} strokeWidth="1" opacity="0.7" />

                          {/* 4. Top-Right Geometric Minimal Accent */}
                          <polygon points="560,0 600,0 600,50 540,20" fill={activeTpl.style === "Color" ? "#047857" : "#334155"} opacity="0.6" />
                          <polygon points="580,0 600,0 600,25" fill={activeTpl.style === "Color" ? "#f59e0b" : "#94a3b8"} opacity="0.8" />
                        </svg>
                      </div>
                    )}
                      </>
                    )}

                    {/* Soft Center Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.05] z-0 overflow-hidden">
                      <img 
                        src="/images/seu-logo.png" 
                        alt="" 
                        className={`w-72 h-72 sm:w-80 sm:h-80 object-contain ${activeTpl.style === "BW" ? "filter grayscale contrast-125" : ""}`}
                      />
                    </div>

                    {/* Content Layer (z-10) - 16 DYNAMIC HANDCRAFTED LAYOUTS */}
                    {renderActiveCoverContent()}
                  </div>
                </div>

                {/* DOWNLOAD & EXPORT OPTIONS UNDER THE PREVIEW */}
                <div className="w-full max-w-[620px] mt-4 space-y-2.5 print:hidden">
                  
                  {/* Row 1: Primary Direct Download PDF + Print Option */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      onClick={handleDirectPdfDownload}
                      disabled={isGeneratingPdf}
                      className="sm:col-span-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 disabled:opacity-75 disabled:cursor-wait text-white font-black text-sm shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                    >
                      {isGeneratingPdf ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>{language === "bn" ? "PDF তৈরি হচ্ছে..." : "Generating PDF..."}</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Download PDF ({activeTpl.name} • 1 Page A4)</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handlePrintCoverPage}
                      className="py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                      title="Open dedicated clean A4 print view"
                    >
                      <Printer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>{language === "bn" ? "প্রিন্ট ভিউ (A4)" : "Print A4"}</span>
                    </button>
                  </div>

                  {/* Row 2: 3 High-Impact Word Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      onClick={handleDownloadWordDocExactTheme}
                      className="py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-[11px] font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-[0.99] text-center"
                      title="Download Microsoft Word (.doc) with exact theme colors and tables"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Word (.doc Exact Theme)</span>
                    </button>

                    <button
                      onClick={handleDownloadDocFile}
                      className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-[0.99] text-center"
                      title="Download customized official SEU Word template (.docx)"
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>Customized Word (.docx)</span>
                    </button>

                    <a
                      href={`/cover_templates/${activeTpl.file}`}
                      download={`SEU_${activeTpl.id}.docx`}
                      className="py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-[0.99] text-center"
                      title="Download the unaltered official institutional SEU Word template"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>Official Template (.docx)</span>
                    </a>
                  </div>

                  {/* Row 3: Google Docs Action */}
                  <button
                    onClick={handleDownloadGoogleDocs}
                    className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4 text-emerald-500" />
                    <span>Open in Google Docs (Upload .docx to Google Drive)</span>
                  </button>

                </div>

              </div>

            </div>

              </div>
            )}
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* 4. EVENT CERTIFICATE MAKER VIEW                                            */}
      {/* ========================================================================= */}
      {activeTab === "certificate" && (
        <EventCertificateMaker language={language} />
      )}

      {activeTab === "routine" && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span>SEU Smart Routine Builder & Clash Checker</span>
                </h2>
                <p className="text-xs text-slate-500">
                  {language === "bn"
                    ? "সেমিস্টার রুটিন তৈরি করুন এবং কোনো ক্লাসের সময় মিলে গেলে (Time Clash) স্বয়ংক্রিয় সতর্কবার্তা পান।"
                    : "Build your weekly timetable, prevent advising clashes, and export print-ready routine."}
                </p>
              </div>

              {/* Action Buttons: Print ONLY timetable / Download PDF */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handlePrintRoutineOnly}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  title="Print only the routine table grid"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Timetable</span>
                </button>
                <button
                  onClick={handleDownloadPdfRoutine}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  title="Download timetable as PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                {routineEntries.length > 0 && (
                  <button
                    onClick={() => {
                      setRoutineEntries([]);
                      toast.info(language === "bn" ? "রুটিন খালি করা হয়েছে।" : "Routine cleared.");
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                )}

      
              </div>
            </div>

            {/* Clash Alert Box (if any clashes detected) */}
            {clashes.length > 0 && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 space-y-1.5 animate-pulse">
                <div className="font-black flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>⚠️ Routine Time Clash Detected! ({clashes.length} Overlapping slots)</span>
                </div>
                {clashes.map((c, idx) => (
                  <p key={idx} className="text-[11px] font-semibold pl-6">
                    • <strong>{c.e1.fullCode || c.e1.code}</strong> and <strong>{c.e2.fullCode || c.e2.code}</strong> conflict on <strong>{c.day}</strong> ({routineTimeFormat === "12h" ? formatRange12(c.time1) : c.time1} overlaps with {routineTimeFormat === "12h" ? formatRange12(c.time2) : c.time2})!
                  </p>
                ))}
              </div>
            )}

      

            {/* Quick Add Class Row - Unified Code & Section Input */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-blue-600 tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Class to Schedule</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {language === "bn" ? "থিওরি ক্লাসের জন্য Sunday-Tuesday পেয়ার সিলেক্ট করুন" : "Pick bi-weekly pair for theory courses"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 text-xs">
                
                {/* 1. Unified Course Code & Section: like CSE241.1 */}
                <div className="md:col-span-3">
                  <label className="font-bold text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <span>Course Code & Section *</span>
                    <span className="text-blue-500 font-mono text-[9px]">(e.g. CSE241.1)</span>
                  </label>
                  <input
                    type="text"
                    value={courseCodeAndSec}
                    onChange={(e) => setCourseCodeAndSec(e.target.value)}
                    placeholder="CSE241.1"
                    className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white uppercase placeholder:normal-case placeholder:font-normal focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addRoutineEntry();
                    }}
                  />
                </div>

                {/* 2. Day Slot: Pairs & Single Days */}
                <div className="md:col-span-3">
                  <label className="font-bold text-[10px] text-slate-500 dark:text-slate-400">Day Slot</label>
                  <select
                    value={newDaySlot}
                    onChange={(e) => setNewDaySlot(e.target.value)}
                    className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <optgroup label="Bi-Weekly Theory Pairs (2 Days/Week)">
                      <option value="Sunday - Tuesday">Sunday - Tuesday</option>
                      <option value="Monday - Wednesday">Monday - Wednesday</option>
                      <option value="Thursday - Saturday">Thursday - Saturday</option>
                    </optgroup>
                    <optgroup label="Single Day (Lab / 1-Day Class)">
                      <option value="Friday">Friday (Single)</option>
                      <option value="Sunday">Sunday (Single)</option>
                      <option value="Monday">Monday (Single)</option>
                      <option value="Tuesday">Tuesday (Single)</option>
                      <option value="Wednesday">Wednesday (Single)</option>
                      <option value="Thursday">Thursday (Single)</option>
                      <option value="Saturday">Saturday (Single)</option>
                    </optgroup>
                  </select>
                </div>

                {/* 3. Time Slot: Official Theory & Lab Slots */}
                <div className="md:col-span-3">
                  <label className="font-bold text-[10px] text-slate-500 dark:text-slate-400">Time Slot</label>
                  <select
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <optgroup label="Theory Slots (1h 20m)">
                      {SEU_THEORY_SLOTS.map(s => (
                        <option key={s} value={s}>
                          {formatRange12(s)}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Lab Slots (2h)">
                      {SEU_LAB_SLOTS.map(s => (
                        <option key={s} value={s}>
                          {formatRange12(s)}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* 4. Room No */}
                <div className="md:col-span-2">
                  <label className="font-bold text-[10px] text-slate-500 dark:text-slate-400">Room No</label>
                  <input
                    type="text"
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    placeholder="Room 504"
                    className="w-full mt-1 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white placeholder:font-normal focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addRoutineEntry();
                    }}
                  />
                </div>

                {/* 5. Add Button */}
                <div className="md:col-span-1 flex items-end">
                  <button
                    onClick={addRoutineEntry}
                    className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                  </button>
                </div>

              </div>
            </div>

            {/* 8 AM - 8 PM Timeline Grid with 12h/24h toggle */}
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wide flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span>Weekly Class Schedule (8:00 AM – 8:00 PM)</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-mono font-bold">
                    8:00 - 20:00
                  </span>
                </div>

                {/* 12-Hour vs 24-Hour Format Switcher */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => changeRoutineTimeFormat("12h")}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1 ${
                      routineTimeFormat === "12h"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span>⏰ 12-Hour (AM/PM)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => changeRoutineTimeFormat("24h")}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1 ${
                      routineTimeFormat === "24h"
                        ? "bg-slate-900 text-white dark:bg-slate-700 shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span>24-Hour</span>
                  </button>
                </div>
              </div>

              <div id="seu-routine-grid-container" className={`overflow-x-auto border rounded-2xl transition-all duration-300 ${curRoutineTheme.containerClass}`}>
                <div className="min-w-[920px]">
                  
                  {/* Top Hours Ruler (08 to 20 / 8 AM to 8 PM) */}
                  <div className={`flex items-center h-10 border-b transition-colors duration-300 ${curRoutineTheme.rulerClass}`}>
                    <div className={`w-16 sm:w-20 shrink-0 border-r flex items-center justify-center font-mono text-[11px] font-extrabold ${curRoutineTheme.dayLabelClass} ${curRoutineTheme.rulerTextClass}`}>
                      DAY
                    </div>
                    <div className="grow relative h-full flex items-center">
                      {SEU_TIMELINE_HOURS.map((hour, idx) => {
                        const leftPercent = (idx / 12) * 100;
                        const hourLabel = routineTimeFormat === "12h"
                          ? (hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`)
                          : `${hour.toString().padStart(2, "0")}:00`;
                        const translateX = idx === 0 ? "0%" : idx === 12 ? "-100%" : "-50%";
                        return (
                          <div
                            key={hour}
                            style={{ left: `${leftPercent}%`, transform: `translateX(${translateX})` }}
                            className="absolute flex flex-col items-center select-none"
                          >
                            <span className={`font-mono text-[11px] font-bold ${curRoutineTheme.rulerTextClass}`}>
                              {hourLabel}
                            </span>
                            <div className={`w-[1px] h-1.5 mt-0.5 ${curRoutineTheme.rulerTickClass}`} />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Day Rows: SUN, MON, TUE, WED, THU, FRI, SAT */}
                  <div className={`divide-y transition-colors duration-300 ${curRoutineTheme.rowDividerClass}`}>
                    {SEU_TIMELINE_DAYS.map(({ code, fullDay, bg }, rIdx) => {
                      const dayClasses = routineEntries.filter(e => e.day === fullDay || e.day === code);
                      const isAlternate = rIdx % 2 === 1;

                      return (
                        <div
                          key={code}
                          className={`flex items-stretch min-h-[76px] transition-colors relative ${
                            isAlternate ? curRoutineTheme.rowOddClass : curRoutineTheme.rowEvenClass
                          } ${curRoutineTheme.rowHoverClass}`}
                        >
                          {/* Day Label on Left (SUN, MON, TUE...) */}
                          <div className={`w-16 sm:w-20 shrink-0 border-r flex items-center justify-center font-mono font-black text-xs sm:text-sm tracking-wider select-none ${curRoutineTheme.dayLabelClass} ${curRoutineTheme.dayLabelTextClass}`}>
                            {code}
                          </div>

                          {/* Timeline Canvas Track */}
                          <div className="grow relative min-h-[76px]">
                            {/* Vertical hour guidelines */}
                            {SEU_TIMELINE_HOURS.map((_, hIdx) => (
                              <div
                                key={hIdx}
                                style={{ left: `${(hIdx / 12) * 100}%` }}
                                className={`absolute top-0 bottom-0 w-[1px] pointer-events-none ${curRoutineTheme.gridLineClass}`}
                              />
                            ))}

                            {/* Positioned Class Cards */}
                            {dayClasses.map((item) => {
                              const timeParsed = parseTimeToMinutes(item.time);
                              const startMin = timeParsed ? Math.max(480, timeParsed.start) : 480;
                              const endMin = timeParsed ? Math.min(1200, timeParsed.end) : 560;
                              const leftPercent = Math.max(0, Math.min(95, ((startMin - 480) / 720) * 100));
                              const widthPercent = Math.max(7, Math.min(100 - leftPercent, ((endMin - startMin) / 720) * 100));
                              const timeLabel = routineTimeFormat === "12h" ? formatRange12(item.time) : formatRange24(item.time);
                              const isClashing = clashes.some(c => (c.e1.id === item.id || c.e2.id === item.id));

                              return (
                                <div
                                  key={item.id}
                                  style={{
                                    left: `${leftPercent}%`,
                                    width: `${widthPercent}%`,
                                    minWidth: "92px",
                                  }}
                                  className={`absolute top-1.5 bottom-1.5 rounded-xl p-2 border transition-all shadow-md group z-10 flex flex-col justify-between ${
                                    isClashing
                                      ? "bg-rose-950/90 border-2 border-rose-500 text-rose-100 ring-2 ring-rose-500/50 shadow-rose-500/20"
                                      : curRoutineTheme.cardNormalClass
                                  }`}
                                >
                                  {/* Line 1: Course Code & Section e.g. CSE381.4 */}
                                  <div className="flex items-center justify-between gap-1 leading-none">
                                    <span className={`font-mono font-black text-xs tracking-tight truncate ${curRoutineTheme.cardCodeClass}`}>
                                      {item.fullCode || item.code}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeRoutineEntry(item.id);
                                      }}
                                      className="text-slate-400 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-xs cursor-pointer"
                                      title="Remove from routine"
                                    >
                                      ✕
                                    </button>
                                  </div>

                                  {/* Line 2: 24h Time e.g. 11:30-12:50 */}
                                  <div className={`font-mono text-[10px] font-semibold leading-tight mt-0.5 truncate ${curRoutineTheme.cardTimeClass}`}>
                                    {timeLabel}
                                  </div>

                                  {/* Line 3: Room e.g. 📍 SEU419 */}
                                  <div className={`text-[9.5px] font-semibold flex items-center gap-1 mt-0.5 leading-none truncate ${curRoutineTheme.cardRoomClass}`}>
                                    <MapPin className={`w-2.5 h-2.5 shrink-0 ${curRoutineTheme.cardIconClass}`} />
                                    <span className="truncate">{item.room || "SEU TBA"}</span>
                                    {item.teacher && (
                                      <span className="opacity-75 font-normal truncate">• {item.teacher}</span>
                                    )}
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

              {/* ONE-ROW COLOR PALETTE SELECTOR BAR (5-6 Swatch Buttons, No Side Text) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 px-4 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-sm shadow-md">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-xs">
                    <Palette className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">
                      {language === "bn" ? "রুটিন কালার থিম" : "Routine Theme"}:
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-extrabold">
                      {language === "bn" ? curRoutineTheme.nameBn : curRoutineTheme.name}
                    </span>
                  </div>
                </div>

                {/* ONLY 6 Circular Color Buttons in ONE Single Row (No text beside buttons) */}
                <div className="flex items-center gap-2 shrink-0">
                  {(["navy", "orange", "pink", "emerald", "purple", "daylight"] as const).map((tId) => {
                    const theme = ROUTINE_COLOR_THEMES[tId];
                    const isSelected = routineColorTheme === tId;
                    return (
                      <button
                        key={tId}
                        type="button"
                        onClick={() => changeRoutineColorTheme(tId)}
                        title={language === "bn" ? theme.nameBn : theme.name}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                          tId === "daylight" ? "border-2 border-slate-300" : "border-2 border-white/20"
                        } ${
                          isSelected
                            ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110 shadow-lg shadow-black/40"
                            : "opacity-75 hover:opacity-100 hover:scale-105"
                        }`}
                        style={{ backgroundColor: theme.swatch }}
                      >
                        {isSelected && (
                          <Check className={`w-3.5 h-3.5 ${tId === "daylight" ? "text-slate-900" : "text-white"} stroke-[3]`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Routine Tips & Quick Helpers */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 gap-2">
              <div className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>
                  {language === "bn"
                    ? "টিপস: থিওরি কোর্সের জন্য Sunday-Tuesday বা Monday-Wednesday সিলেক্ট করলে একই সাথে দুই দিনের স্লটে ক্লাস বসে যাবে।"
                    : "Tip: Selecting bi-weekly pairs (e.g. Sunday - Tuesday) automatically places classes on both schedule days."}
                </span>
              </div>
              <div className="text-slate-400 font-mono text-[10px]">
                {routineEntries.length} {routineEntries.length === 1 ? "Class scheduled" : "Classes scheduled"}
              </div>
            </div>

          </div>
        </div>
      )}

      

      {/* ========================================================================= */}
      {/* 6. OFFICIAL ACADEMIC CALENDAR TOOL (LIVE SEU OFFICIAL SYNC & DOWNLOAD) */}
      {/* ========================================================================= */}
      {activeTab === "calendar" && <AcademicCalendarTool />}

      {/* ========================================================================= */}
      {/* 7. FIND SECTION GROUP VIEW (COMING SOON AS REQUESTED) */}
      {/* ========================================================================= */}
      {activeTab === "sections" && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-indigo-900/20 via-purple-900/10 to-slate-900/50 border-2 border-dashed border-indigo-300 dark:border-indigo-800 text-center space-y-6 shadow-sm">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/25">
              <Users className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono font-extrabold px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 uppercase tracking-widest">
                {language === "bn" ? "🚀 শীঘ্রই আসছে • পরবর্তী সেমিস্টারে উন্মোচিত হচ্ছে" : "🚀 Coming Soon • Launching Next Intake"}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {language === "bn" ? "ফাইন্ড সেকশন গ্রুপ (ওপেন ক্রেডিট হাব)" : "Find Section Group (Open Credit Hub)"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
                {language === "bn"
                  ? "সাউথইস্ট ইউনিভার্সিটিতে ওপেন ক্রেডিট সিস্টেমের কারণে বিভিন্ন ব্যাচের সিনিয়র-জুনিয়ররা একই সেকশনে ক্লাস করে। আপনাদের সবার ক্লাসরুম ও মেসেঞ্জার/হোয়াটসঅ্যাপ গ্রুপ লিংক এক জায়গায় খুঁজে পেতে এই হাবটি তৈরি হচ্ছে।"
                  : "Connecting SEU batchmates across open-credit sections. Find and share verified WhatsApp and Messenger classroom group links for Spring 2026, Summer 2026 & Fall 2026."}
              </p>
            </div>

            {/* Upcoming Features Teaser Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2 font-sans">
              <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                <span className="text-indigo-600 font-extrabold text-xs">
                  {language === "bn" ? "📅 ৩ সেমিস্টার ক্যালেন্ডার" : "📅 3-Semester Calendar"}
                </span>
                <p className="text-[11px] text-slate-500">
                  {language === "bn"
                    ? "Spring, Summer & Fall স্বয়ংক্রিয় বছরভিত্তিক ক্যালেন্ডার গ্রুপ।"
                    : "Automated year-based study and classroom groups for Spring, Summer & Fall."}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                <span className="text-purple-600 font-extrabold text-xs">
                  {language === "bn" ? "🔗 ১-ক্লিক গ্রুপ জয়েন" : "🔗 1-Click Group Join"}
                </span>
                <p className="text-[11px] text-slate-500">
                  {language === "bn"
                    ? "ক্লিক করলেই সরাসরি মেসেঞ্জার বা হোয়াটসঅ্যাপে নিয়ে যাবে।"
                    : "One-click instant redirect to verified Messenger or WhatsApp groups."}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                <span className="text-emerald-600 font-extrabold text-xs">
                  {language === "bn" ? "🛡️ ভেরিফায়েড শিক্ষার্থী" : "🛡️ Verified Students"}
                </span>
                <p className="text-[11px] text-slate-500">
                  {language === "bn"
                    ? "স্প্যাম ও ফেক লিংক প্রতিরোধে স্টুডেন্ট আইডি ভেরিফিকেশন।"
                    : "Student ID verification prevents spam, trolls, and invalid invite links."}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() =>
                  toast.success(
                    language === "bn"
                      ? "আপনি সেকশন হাবের প্রায়োরিটি নোটিফিকেশন তালিকায় যুক্ত হয়েছেন!"
                      : "You are on the priority notification list for the Section Hub launch!"
                  )
                }
                className="py-3 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{language === "bn" ? "লঞ্চের নোটিফিকেশন পান" : "Notify Me on Launch"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. SMART ADVISING ROUTINE VIEW (COMING SOON AS REQUESTED) */}
      {/* ========================================================================= */}
      {activeTab === "advising" && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-blue-900/20 via-indigo-900/10 to-slate-900/50 border-2 border-dashed border-blue-300 dark:border-blue-800 text-center space-y-6 shadow-sm">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25">
              <GraduationCap className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono font-extrabold px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 uppercase tracking-widest">
                {language === "bn" ? "🚀 শীঘ্রই আসছে • পরবর্তী সেমিস্টারে উন্মোচিত হচ্ছে" : "🚀 Coming Soon • Launching Next Intake"}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {language === "bn" ? "স্মার্ট অ্যাডভাইজিং রুটিন প্ল্যানার" : "Smart Advising Routine Planner"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
                {language === "bn"
                  ? "সাউথইস্ট ইউনিভার্সিটির ওপেন ক্রেডিট সিস্টেমে সেমিস্টার রেজিস্ট্রেশনে প্রি-রিকুইজিট কোর্স যাচাই, ক্লাস ক্ল্যাশ প্রিভেনশন এবং এক ক্লিকে সেরা সেকশন কম্বিনেশন তৈরি করার স্মার্ট অ্যাডভাইজিং রুটিন অ্যাসিস্ট্যান্ট শীঘ্রই আসছে।"
                  : "Smart advising routine planner for Southeast University students. Automatically checks course prerequisites, avoids schedule clashes, and generates optimal section combinations for semester advising."}
              </p>
            </div>

            {/* Upcoming Features Teaser Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2 font-sans">
              <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                <span className="text-blue-600 font-extrabold text-xs">
                  {language === "bn" ? "⚡ অটো কম্বিনেশন" : "⚡ Zero-Clash Combos"}
                </span>
                <p className="text-[11px] text-slate-500">
                  {language === "bn"
                    ? "আপনার পছন্দ অনুযায়ী শূন্য ক্ল্যাশ সহ সম্ভাব্য সেরা সেকশন কম্বো সাজাবে।"
                    : "Instantly generates conflict-free section combinations based on your preferred faculty and slots."}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                <span className="text-indigo-600 font-extrabold text-xs">
                  {language === "bn" ? "🎯 প্রি-রিকুইজিট চেক" : "🎯 Prerequisite Validation"}
                </span>
                <p className="text-[11px] text-slate-500">
                  {language === "bn"
                    ? "পূর্বের পাসের গ্রেড অনুযায়ী স্বয়ংক্রিয়ভাবে পরবর্তী কোর্স সাজেস্ট করবে।"
                    : "Validates completed courses and automatically recommends eligible courses for registration."}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                <span className="text-emerald-600 font-extrabold text-xs">
                  {language === "bn" ? "📊 ক্রেডিট ও ফি প্রজেকশন" : "📊 Credit & Tuition Projection"}
                </span>
                <p className="text-[11px] text-slate-500">
                  {language === "bn"
                    ? "অ্যাডভাইজিং সিলেক্ট করলেই আনুমানিক টিউশন ফি ও কিস্তি আগে থেকেই জেনে নিন।"
                    : "Computes total credit hours and calculates estimated tuition installments before advising."}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() =>
                  toast.success(
                    language === "bn"
                      ? "আপনি স্মার্ট অ্যাডভাইজিং রুটিনের প্রায়োরিটি আর্লি এক্সেস তালিকায় যুক্ত হয়েছেন!"
                      : "You are on the priority early-access list for Smart Advising Routine!"
                  )
                }
                className="py-3 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{language === "bn" ? "লঞ্চের নোটিফিকেশন পান" : "Notify Me on Launch"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      

    </div>
  );
}
