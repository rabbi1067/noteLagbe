"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { 
  Trophy, 
  Crown, 
  Sparkles, 
  Award, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  UserCheck, 
  UploadCloud, 
  ArrowRight,
  Flame,
  Zap,
  Star,
  Medal,
  CheckCircle2,
  ShieldCheck,
  X
} from "lucide-react";
import confetti from "canvas-confetti";
import { api } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";
import { useDataSync } from "@/lib/sync";

export interface ContributorItem {
  rank: number;
  userId?: number;
  name: string;
  studentId?: string;
  department?: string;
  approvedContributions: number;
  badge?: string;
  title?: string;
  avatarUrl?: string;
}

function ContributorAvatar({
  name,
  avatarUrl,
  sizeClasses = "w-full h-full",
  fallbackTextClasses = "",
}: {
  name: string;
  avatarUrl?: string;
  sizeClasses?: string;
  fallbackTextClasses?: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (avatarUrl && !hasError) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${sizeClasses} object-cover rounded-[inherit] transition-transform duration-300 group-hover:scale-105`}
        onError={() => setHasError(true)}
      />
    );
  }

  const char = name ? name.trim().charAt(0).toUpperCase() : "U";
  return (
    <div className={`w-full h-full flex items-center justify-center font-black select-none ${fallbackTextClasses}`}>
      {char}
    </div>
  );
}

// =========================================================================
// 3D TILT PODIUM CARD COMPONENT (Interactive Parallax, Specular Glare & 3D Stage)
// =========================================================================
interface Podium3DCardProps {
  contributor: ContributorItem;
  rank: 1 | 2 | 3;
  language: "en" | "bn";
}

function Podium3DCard({ contributor, rank, language }: Podium3DCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Smooth tilt angles (Max 14 deg)
    const rotX = -((y - centerY) / centerY) * 14;
    const rotY = ((x - centerX) / centerX) * 14;

    setRotateX(rotX);
    setRotateY(rotY);
    setGlare({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.35,
    });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
    setGlare({ x: 50, y: 50, opacity: 0 });
  };

  const triggerCelebration = () => {
    const colors =
      rank === 1
        ? ["#6366f1", "#3b82f6", "#f59e0b", "#fbbf24", "#06b6d4"]
        : rank === 2
        ? ["#14b8a6", "#10b981", "#34d399", "#6ee7b7", "#0ea5e9"]
        : ["#a855f7", "#ec4899", "#f43f5e", "#d8b4fe", "#fb7185"];

    try {
      confetti({
        particleCount: 55,
        spread: 65,
        origin: { y: 0.65 },
        colors,
      });
    } catch {
      // safe fallback if confetti blocked
    }
  };

  // Rank-specific visual theme profiles
  const theme = {
    1: {
      cardBg: "from-indigo-950/80 via-slate-900/90 to-slate-950/95",
      border: "border-indigo-500/50 hover:border-indigo-400",
      glowRing: "shadow-[0_15px_45px_-10px_rgba(99,102,241,0.45)]",
      haloGradient: "from-indigo-600 via-blue-500 to-amber-400",
      haloPulse: "bg-indigo-500/25",
      badgeBg: "bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 text-white border-amber-300/40",
      badgeText: "Lead Contributor",
      badgeTextBn: "প্রধান অ্যাকাডেমিক লিড",
      rankTag: "TOP RANK #1",
      rankTagColor: "text-amber-300 bg-amber-500/20 border-amber-500/40",
      pedestalHeight: "h-20 sm:h-24",
      pedestalBg: "from-indigo-900/60 via-slate-900/90 to-slate-950",
      pedestalBorder: "border-indigo-500/40",
      pedestalGlow: "shadow-[0_-4px_25px_rgba(99,102,241,0.5)]",
      emblemText: "1ST",
      emblemColor: "from-amber-400 to-amber-200",
      pointPill: "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-indigo-500/30",
      accentGlow: "bg-indigo-500/30",
      avatarRing: "ring-4 ring-indigo-500/70 shadow-indigo-500/40",
      avatarFallback: "bg-gradient-to-tr from-indigo-600 via-blue-600 to-amber-500 text-white",
      crownIcon: true,
    },
    2: {
      cardBg: "from-teal-950/70 via-slate-900/90 to-slate-950/95",
      border: "border-teal-500/40 hover:border-teal-400",
      glowRing: "shadow-[0_12px_35px_-10px_rgba(20,184,166,0.35)]",
      haloGradient: "from-teal-500 via-emerald-400 to-cyan-400",
      haloPulse: "bg-teal-500/20",
      badgeBg: "bg-gradient-to-r from-teal-600 to-emerald-600 text-white border-teal-300/40",
      badgeText: "Senior Contributor",
      badgeTextBn: "সিনিয়র কন্ট্রিবিউটর",
      rankTag: "RANK #2",
      rankTagColor: "text-teal-300 bg-teal-500/20 border-teal-500/40",
      pedestalHeight: "h-14 sm:h-16",
      pedestalBg: "from-teal-950/60 via-slate-900/90 to-slate-950",
      pedestalBorder: "border-teal-500/30",
      pedestalGlow: "shadow-[0_-4px_20px_rgba(20,184,166,0.4)]",
      emblemText: "2ND",
      emblemColor: "from-teal-300 to-emerald-200",
      pointPill: "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-teal-500/30",
      accentGlow: "bg-teal-500/25",
      avatarRing: "ring-4 ring-teal-500/70 shadow-teal-500/40",
      avatarFallback: "bg-gradient-to-tr from-teal-600 via-emerald-600 to-cyan-500 text-white",
      crownIcon: false,
    },
    3: {
      cardBg: "from-purple-950/70 via-slate-900/90 to-slate-950/95",
      border: "border-purple-500/40 hover:border-purple-400",
      glowRing: "shadow-[0_12px_35px_-10px_rgba(168,85,247,0.35)]",
      haloGradient: "from-purple-500 via-fuchsia-400 to-pink-400",
      haloPulse: "bg-purple-500/20",
      badgeBg: "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-300/40",
      badgeText: "Distinguished",
      badgeTextBn: "সম্মানিত অবদানকারী",
      rankTag: "RANK #3",
      rankTagColor: "text-purple-300 bg-purple-500/20 border-purple-500/40",
      pedestalHeight: "h-10 sm:h-12",
      pedestalBg: "from-purple-950/60 via-slate-900/90 to-slate-950",
      pedestalBorder: "border-purple-500/30",
      pedestalGlow: "shadow-[0_-4px_20px_rgba(168,85,247,0.4)]",
      emblemText: "3RD",
      emblemColor: "from-purple-300 to-pink-200",
      pointPill: "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-purple-500/30",
      accentGlow: "bg-purple-500/25",
      avatarRing: "ring-4 ring-purple-500/70 shadow-purple-500/40",
      avatarFallback: "bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-pink-500 text-white",
      crownIcon: false,
    },
  }[rank];

  return (
    <div
      className={`flex flex-col items-center justify-end relative group ${
        rank === 1 ? "order-1 md:order-2 z-20 md:-translate-y-4" : rank === 2 ? "order-2 md:order-1 z-10" : "order-3 z-10"
      }`}
      style={{ perspective: "1200px" }}
    >
      {/* 3D Overhead Ambient Spotlight Halo */}
      <div
        className={`absolute -top-12 left-1/2 -translate-x-1/2 w-48 sm:w-64 h-48 rounded-full ${theme.accentGlow} blur-3xl pointer-events-none transition-opacity duration-500 ${
          isHovered ? "opacity-100 scale-110" : "opacity-60"
        }`}
      />

      {/* ========================================================= */}
      {/* 3D PARALLAX TILT CARD                                     */}
      {/* ========================================================= */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={triggerCelebration}
        className={`w-full p-5 sm:p-6 rounded-3xl bg-gradient-to-b ${theme.cardBg} border-2 ${theme.border} ${theme.glowRing} backdrop-blur-2xl relative overflow-hidden cursor-pointer select-none`}
        style={{
          transform: `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) ${
            isHovered ? "scale3d(1.03, 1.03, 1.03) translateZ(15px)" : "scale3d(1, 1, 1)"
          }`,
          transformStyle: "preserve-3d",
          transition: isHovered
            ? "transform 0.08s ease-out"
            : "transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
        title="Click to celebrate! 🎉"
      >
        {/* Dynamic Specular Glass Glare / Sheen Tracking Cursor */}
        <div
          className="pointer-events-none absolute inset-0 rounded-3xl z-30 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, ${glare.opacity}), transparent 60%)`,
          }}
        />

        {/* Shimmer Sweep Animation */}
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none z-20" />

        {/* ======================================================= */}
        {/* 3D LAYER 1: CARD HEADER & BADGES (translateZ 30px)      */}
        {/* ======================================================= */}
        <div
          className="flex items-center justify-between gap-2 relative z-10"
          style={{ transform: "translateZ(30px)", transformStyle: "preserve-3d" }}
        >
          <span
            className={`px-3 py-1 rounded-full font-mono font-black text-xs uppercase tracking-wider flex items-center gap-1.5 border shadow-sm ${theme.rankTagColor}`}
          >
            {rank === 1 ? (
              <Crown className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            ) : rank === 2 ? (
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            ) : (
              <Award className="w-3.5 h-3.5 text-purple-400" />
            )}
            <span>{theme.rankTag}</span>
          </span>

          <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 dark:text-slate-200">
            {language === "bn" ? theme.badgeTextBn : theme.badgeText}
          </span>
        </div>

        {/* ======================================================= */}
        {/* 3D LAYER 2: 3D AVATAR & GLOWING RINGS (translateZ 50px) */}
        {/* ======================================================= */}
        <div
          className="mt-6 flex flex-col items-center text-center space-y-3 relative z-10"
          style={{ transform: "translateZ(50px)", transformStyle: "preserve-3d" }}
        >
          <div className="relative">
            {/* Outer Pulsing Halo Ring */}
            <div
              className={`absolute -inset-2.5 rounded-3xl ${theme.haloPulse} blur-md animate-pulse-halo pointer-events-none`}
            />

            {/* Glowing Avatar Border Container */}
            <div
              className={`relative ${
                rank === 1 ? "w-20 h-20 sm:w-24 sm:h-24" : "w-16 h-16 sm:w-20 sm:h-20"
              } rounded-3xl p-1 bg-gradient-to-tr ${theme.haloGradient} ${theme.avatarRing} shadow-xl overflow-hidden group-hover:scale-105 transition-transform duration-300`}
            >
              <div className={`w-full h-full rounded-[1.25rem] overflow-hidden ${theme.avatarFallback} shadow-inner`}>
                <ContributorAvatar
                  name={contributor.name}
                  avatarUrl={contributor.avatarUrl}
                  fallbackTextClasses={
                    rank === 1 ? "text-white text-2xl sm:text-3xl font-black" : "text-white text-xl sm:text-2xl font-black"
                  }
                />
              </div>
            </div>

            {/* 3D Floating Floating Medal / Crown Badge */}
            <div
              className={`absolute ${
                rank === 1 ? "-top-3 -right-2 w-8 h-8" : "-bottom-2 -right-2 w-7 h-7"
              } rounded-2xl flex items-center justify-center shadow-lg border-2 border-white/80 dark:border-slate-800 ${
                rank === 1
                  ? "bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 animate-float-slow"
                  : rank === 2
                  ? "bg-gradient-to-tr from-teal-500 to-emerald-400 text-white"
                  : "bg-gradient-to-tr from-purple-500 to-pink-500 text-white"
              }`}
              style={{ transform: "translateZ(70px)" }}
            >
              {rank === 1 ? (
                <Crown className="w-4 h-4 fill-current drop-shadow-sm" />
              ) : rank === 2 ? (
                <Sparkles className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Award className="w-3.5 h-3.5 fill-current" />
              )}
            </div>
          </div>

          {/* ===================================================== */}
          {/* 3D LAYER 3: CONTRIBUTOR INFO & DEPT (translateZ 35px) */}
          {/* ===================================================== */}
          <div
            className="pt-1 space-y-1"
            style={{ transform: "translateZ(35px)", transformStyle: "preserve-3d" }}
          >
            <h3
              className={`font-black text-white tracking-tight ${
                rank === 1 ? "text-lg sm:text-xl" : "text-base sm:text-lg"
              } group-hover:text-amber-200 transition-colors`}
            >
              {contributor.name}
            </h3>
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 font-mono">
              {contributor.studentId && <span>{contributor.studentId}</span>}
              {contributor.studentId && contributor.department && <span>•</span>}
              {contributor.department && (
                <span className="px-2 py-0.5 rounded-md bg-white/10 text-slate-200 font-semibold border border-white/10">
                  {contributor.department}
                </span>
              )}
            </div>
          </div>

          {/* ===================================================== */}
          {/* 3D LAYER 4: EARNED POINTS BADGE (translateZ 40px)     */}
          {/* ===================================================== */}
          <div
            className="w-full pt-3 mt-1 border-t border-white/10 flex items-center justify-between text-xs"
            style={{ transform: "translateZ(40px)", transformStyle: "preserve-3d" }}
          >
            <span className="text-slate-400 font-medium">
              {language === "bn" ? "অর্জিত পয়েন্ট:" : "Earned Points:"}
            </span>
            <span
              className={`px-3 py-1 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-md ${theme.pointPill} group-hover:scale-105 transition-transform`}
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>
                {contributor.approvedContributions} {language === "bn" ? "পয়েন্ট" : "Points"}
              </span>
            </span>
          </div>
        </div>

        {/* Hover Hint Banner */}
        <div className="absolute inset-x-0 bottom-1 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <span className="text-[10px] text-amber-300/80 font-mono tracking-wider">
            ✨ Click to celebrate
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3D CYBER-OLYMPIC PEDESTAL BASE (Stage Platform)           */}
      {/* ========================================================= */}
      <div
        className={`w-[92%] sm:w-[88%] ${theme.pedestalHeight} rounded-b-2xl bg-gradient-to-b ${theme.pedestalBg} border-x-2 border-b-2 ${theme.pedestalBorder} ${theme.pedestalGlow} relative flex flex-col items-center justify-center -mt-1 shadow-2xl overflow-hidden`}
      >
        {/* Top Illuminated Neon LED Edge */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-white/70 to-transparent" />

        {/* Front Engraved Metallic Rank Number */}
        <div className="flex items-center gap-1.5 font-black tracking-widest text-lg sm:text-2xl font-mono select-none drop-shadow-md">
          <span className={`bg-gradient-to-b ${theme.emblemColor} bg-clip-text text-transparent`}>
            {theme.emblemText}
          </span>
        </div>
        <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">
          Podium Position
        </span>

        {/* Diagonal Floor Grid Shadow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.06),transparent_70%)] pointer-events-none" />
      </div>

      {/* Ground Neon Reflection Puddle */}
      <div
        className={`w-4/5 h-4 -mt-2 rounded-full ${theme.accentGlow} blur-lg pointer-events-none`}
      />
    </div>
  );
}

// =========================================================================
// MAIN LEADERBOARD COMPONENT
// =========================================================================
export default function TopContributorsLeaderboard() {
  const { language } = useLanguage();
  const [contributors, setContributors] = useState<ContributorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [showAll, setShowAll] = useState(false);

  const fetchLeaderboard = () => {
    api.contributions
      .getLeaderboard()
      .then((res) => {
        if (Array.isArray(res)) {
          setContributors(res);
        } else {
          setContributors([]);
        }
      })
      .catch((err) => {
        console.error("Failed to load leaderboard:", err);
        setContributors([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  useDataSync((payload) => {
    if (!payload || payload.entity === "contribution" || payload.entity === "user" || payload.entity === "all") {
      fetchLeaderboard();
    }
  });

  // Filter contributors by search and department
  const filteredContributors = useMemo(() => {
    return contributors.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.studentId && c.studentId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.department && c.department.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesDept =
        selectedDept === "ALL" ||
        (c.department && c.department.toUpperCase() === selectedDept.toUpperCase());

      return matchesSearch && matchesDept;
    });
  }, [contributors, searchQuery, selectedDept]);

  // Top 3 Spotlight items
  const top1 = contributors.find((c) => c.rank === 1);
  const top2 = contributors.find((c) => c.rank === 2);
  const top3 = contributors.find((c) => c.rank === 3);

  // Complete Directory: shows ALL contributors starting from Rank #1 (including top 1, 2, 3)
  const directoryContributors = filteredContributors;
  const displayedDirectory = showAll ? directoryContributors : directoryContributors.slice(0, 10);

  // Unique departments for filter
  const departmentsList = ["ALL", "CSE", "EEE", "ARCH", "TEX", "PHR", "BBA", "LAW", "ENG", "BNG", "ECO", "ICT"];

  return (
    <section id="leaderboard" className="space-y-8 pt-8 border-t border-slate-200 dark:border-slate-800/80 scroll-mt-24 relative">
      
      {/* Background Cybernetic Ambient Illumination */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-b from-blue-600/10 via-purple-600/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* ========================================================= */}
      {/* 1. HEADER & HERO BANNER                                   */}
      {/* ========================================================= */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-xs font-bold tracking-wider uppercase shadow-xs">
            <Trophy className="w-4 h-4 text-amber-500 animate-bounce" />
            <span>{language === "bn" ? "অ্যাকাডেমিক অবদানের স্বীকৃতি" : "Academic Hall of Fame"}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {language === "bn" ? "শীর্ষ ৫০ অ্যাকাডেমিক অবদানকারী" : "Top 50 Academic Contributors"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            {language === "bn"
              ? "সাউথইস্ট বিশ্ববিদ্যালয়ের সহপাঠীদের পড়াশোনায় সহযোগিতা করতে যারা নিয়মিত ভেরিফায়েড হ্যান্ডনোট, কুইজ, ল্যাব টাস্ক, প্রজেক্ট ও প্রশ্নপত্র শেয়ার করেছেন—তাদের সম্মাননা তালিকা।"
              : "Honoring Southeast University students who empower their peers by continuously sharing verified handwritten notes, quiz papers, lab tasks, project links, and exam archives."}
          </p>
        </div>

        {/* Stats Pill with Glowing Live Badge */}
        <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0 bg-slate-900/80 text-white px-4 py-2.5 rounded-2xl border border-slate-700/80 shadow-lg backdrop-blur-md">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <UserCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-extrabold tracking-wide">
            {contributors.length} {language === "bn" ? "জন স্বীকৃতিপ্রাপ্ত" : "Students Recognized"}
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* EMPTY STATE                                               */}
      {/* ========================================================= */}
      {!loading && contributors.length === 0 ? (
        <div className="p-8 sm:p-14 rounded-3xl bg-gradient-to-b from-blue-500/5 via-slate-50/50 to-white dark:from-blue-950/20 dark:via-slate-900/60 dark:to-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/25 animate-float-slow">
            <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-amber-300" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
              {language === "bn" ? "প্রথম অ্যাকাডেমিক কন্ট্রিবিউটর হোন!" : "Be the First Academic Contributor!"}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {language === "bn"
                ? "এখনো কোনো অবদান ভেরিফাই হয়নি। আপনার হ্যান্ডনোট, কুইজ সলিউশন বা পরীক্ষার প্রশ্নপত্র শেয়ার করে লিডারবোর্ডের শীর্ষ স্থান অর্জন করুন!"
                : "No verified contributions yet. Share your handwritten lecture notes, quiz solutions, or exam questions to top the Hall of Fame!"}
            </p>
          </div>
          <div className="pt-2 flex justify-center">
            <Link
              href="/contribute"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/30 transition-all hover:scale-105"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{language === "bn" ? "নোট বা প্রশ্ন কন্ট্রিবিউট করুন" : "Contribute Notes Now"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* ========================================================= */}
          {/* 2. TOP 3 3D PODIUM SPOTLIGHT (OLYMPIC ACADEMIC STAGE)     */}
          {/* ========================================================= */}
          {top1 && top2 && top3 && !searchQuery.trim() && selectedDept === "ALL" && (
            <div className="py-4">
              <div className="text-center pb-2">
                <span className="text-[11px] font-mono tracking-widest uppercase text-slate-400 dark:text-slate-400 font-bold flex items-center justify-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>3D Academic Podium Stage</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-end pt-4 pb-2">
                {/* Rank #2 (Left - Senior Contributor) */}
                <Podium3DCard contributor={top2} rank={2} language={language} />

                {/* Rank #1 (Center - Lead Contributor, Elevated) */}
                <Podium3DCard contributor={top1} rank={1} language={language} />

                {/* Rank #3 (Right - Distinguished Contributor) */}
                <Podium3DCard contributor={top3} rank={3} language={language} />
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. SEARCH & DEPARTMENT FILTER TOOLBAR                     */}
          {/* ========================================================= */}
          <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-md backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input with Clear Button */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === "bn" ? "শীর্ষ ৫০ জনের মধ্যে খুঁজুন..." : "Search in top 50 contributors..."}
                className="w-full pl-9 pr-9 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Department Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full pb-1 self-start sm:self-auto">
              {departmentsList.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDept(d)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedDept === d
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 scale-105"
                      : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700/50"
                  }`}
                >
                  {d === "ALL" ? (language === "bn" ? "সকল ডিপার্টমেন্ট" : "All Departments") : d}
                </button>
              ))}
            </div>
          </div>

          {/* ========================================================= */}
          {/* 4. COMPLETE DIRECTORY (All Contributors with 3D Medals)   */}
          {/* ========================================================= */}
          <div className="rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-xl overflow-hidden">
            <div className="px-5 sm:px-6 py-4 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-200">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-500" />
                <span>{language === "bn" ? "সকল কন্ট্রিবিউটর তালিকা" : "Contributor Directory"}</span>
              </div>
              <span className="text-slate-400 font-medium font-mono">
                {language === "bn"
                  ? `প্রদর্শিত: ${displayedDirectory.length} / ${directoryContributors.length} জন`
                  : `Showing ${displayedDirectory.length} of ${directoryContributors.length}`}
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {displayedDirectory.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  {language === "bn" ? "কোনো কন্ট্রিবিউটর খুঁজে পাওয়া যায়নি।" : "No contributors matched your search criteria."}
                </div>
              ) : (
                displayedDirectory.map((c) => {
                  return (
                    <div
                      key={`${c.rank}-${c.name}`}
                      className={`px-5 sm:px-6 py-4 flex items-center justify-between gap-3 transition-all duration-150 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 ${
                        c.rank === 1
                          ? "bg-indigo-50/30 dark:bg-indigo-950/20"
                          : c.rank === 2
                          ? "bg-teal-50/30 dark:bg-teal-950/20"
                          : c.rank === 3
                          ? "bg-purple-50/30 dark:bg-purple-950/20"
                          : ""
                      }`}
                    >
                      {/* Left: Rank & Avatar & Name */}
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        {/* 3D Rank Badge */}
                        <span
                          className={`w-10 h-9 rounded-xl font-mono text-xs font-black flex items-center justify-center shrink-0 border shadow-xs transition-transform hover:scale-105 ${
                            c.rank === 1
                              ? "bg-gradient-to-r from-amber-500 to-indigo-600 text-white border-amber-400 shadow-amber-500/30"
                              : c.rank === 2
                              ? "bg-gradient-to-r from-teal-500 to-emerald-600 text-white border-teal-400 shadow-teal-500/30"
                              : c.rank === 3
                              ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white border-purple-400 shadow-purple-500/30"
                              : c.rank <= 10
                              ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {c.rank === 1 ? (
                            <Crown className="w-4 h-4 text-amber-200" />
                          ) : (
                            `#${c.rank}`
                          )}
                        </span>

                        {/* Avatar */}
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 text-xs font-bold uppercase shrink-0 overflow-hidden ring-2 ring-slate-200/80 dark:ring-slate-700/80 shadow-xs">
                          <ContributorAvatar
                            name={c.name}
                            avatarUrl={c.avatarUrl}
                            fallbackTextClasses="text-slate-700 dark:text-slate-200 text-sm font-black uppercase"
                          />
                        </div>

                        {/* Details */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                              {c.name}
                            </span>
                            {c.rank === 1 && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0 flex items-center gap-1">
                                <Crown className="w-3 h-3 text-amber-400" />
                                <span>{language === "bn" ? "প্রধান অবদানকারী" : "Lead"}</span>
                              </span>
                            )}
                            {c.rank === 2 && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/40 shrink-0 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-teal-400" />
                                <span>{language === "bn" ? "সিনিয়র" : "Senior"}</span>
                              </span>
                            )}
                            {c.rank === 3 && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 shrink-0 flex items-center gap-1">
                                <Award className="w-3 h-3 text-purple-400" />
                                <span>{language === "bn" ? "সম্মানিত" : "Distinguished"}</span>
                              </span>
                            )}
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold shrink-0">
                              {c.department || "CSE"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            {c.title || (language === "bn" ? "অ্যাকাডেমিক কন্ট্রিবিউটর" : "Academic Contributor")} {c.studentId ? `• ${c.studentId}` : ""}
                          </p>
                        </div>
                      </div>

                      {/* Right: Contributions Count */}
                      <div className="shrink-0 text-right">
                        <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 shadow-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{c.approvedContributions}</span>
                          <span className="hidden sm:inline font-semibold text-[11px]">
                            {language === "bn" ? "পয়েন্ট" : "points"}
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* View All / Collapse Button */}
            {directoryContributors.length > 10 && (
              <div className="p-3 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 text-center">
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition-all cursor-pointer"
                >
                  <span>
                    {showAll
                      ? language === "bn"
                        ? "কমিয়ে দেখুন (Show Less)"
                        : "Show Less (Top 10)"
                      : language === "bn"
                      ? `সম্পূর্ণ ৫০ জন কন্ট্রিবিউটর দেখুন (${directoryContributors.length} জন)`
                      : `View All 50 Contributors (${directoryContributors.length} total)`}
                  </span>
                  {showAll ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>
        </>
      )}

    </section>
  );
}
