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
  CheckCircle2, 
  ShieldCheck, 
  X,
  Medal
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
// EXECUTIVE 3D FORMAL HONOR CARD COMPONENT
// =========================================================================
interface FormalHonorCardProps {
  contributor: ContributorItem;
  rank: 1 | 2 | 3;
  language: "en" | "bn";
}

function FormalHonorCard({ contributor, rank, language }: FormalHonorCardProps) {
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

    // Subtle, restrained executive 3D tilt (Max 8 deg for clean formal feel)
    const rotX = -((y - centerY) / centerY) * 8;
    const rotY = ((x - centerX) / centerX) * 8;

    setRotateX(rotX);
    setRotateY(rotY);
    setGlare({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.22,
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
        particleCount: 45,
        spread: 60,
        origin: { y: 0.65 },
        colors,
      });
    } catch {
      // safe fallback if blocked
    }
  };

  // Formal Theme Profiles (Dual Light / Dark Theme Support)
  const theme = {
    1: {
      cardBg: "from-indigo-50/90 via-white to-blue-50/80 dark:from-indigo-950/70 dark:via-slate-900/90 dark:to-slate-950/95",
      border: "border-indigo-200/90 hover:border-indigo-400 dark:border-indigo-500/40 dark:hover:border-indigo-400/80",
      glowRing: "shadow-xl shadow-indigo-500/10 dark:shadow-[0_12px_40px_-10px_rgba(99,102,241,0.35)]",
      haloPulse: "bg-indigo-500/15",
      badgeText: "Lead Contributor",
      badgeTextBn: "প্রধান অবদানকারী",
      rankTag: "Rank #1",
      rankTagColor: "text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/15 border-amber-300/80 dark:border-amber-500/30",
      pointPill: "bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30",
      accentGlow: "bg-indigo-500/15 dark:bg-indigo-500/20",
      avatarRing: "ring-2 ring-amber-400/90 shadow-[0_0_20px_rgba(251,191,36,0.25)]",
      avatarFallback: "bg-gradient-to-tr from-indigo-600 via-blue-600 to-amber-500 text-white",
    },
    2: {
      cardBg: "from-teal-50/90 via-white to-emerald-50/80 dark:from-teal-950/60 dark:via-slate-900/90 dark:to-slate-950/95",
      border: "border-teal-200/90 hover:border-teal-400 dark:border-teal-500/35 dark:hover:border-teal-400/70",
      glowRing: "shadow-lg shadow-teal-500/10 dark:shadow-[0_10px_35px_-10px_rgba(20,184,166,0.25)]",
      haloPulse: "bg-teal-500/15",
      badgeText: "Senior Contributor",
      badgeTextBn: "সিনিয়র কন্ট্রিবিউটর",
      rankTag: "Rank #2",
      rankTagColor: "text-teal-800 dark:text-teal-300 bg-teal-100 dark:bg-teal-500/15 border-teal-300/80 dark:border-teal-500/30",
      pointPill: "bg-teal-50 dark:bg-teal-600/20 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-500/30",
      accentGlow: "bg-teal-500/15",
      avatarRing: "ring-2 ring-teal-400/90 shadow-[0_0_20px_rgba(20,184,166,0.25)]",
      avatarFallback: "bg-gradient-to-tr from-teal-600 via-emerald-600 to-cyan-500 text-white",
    },
    3: {
      cardBg: "from-purple-50/90 via-white to-pink-50/80 dark:from-purple-950/60 dark:via-slate-900/90 dark:to-slate-950/95",
      border: "border-purple-200/90 hover:border-purple-400 dark:border-purple-500/35 dark:hover:border-purple-400/70",
      glowRing: "shadow-lg shadow-purple-500/10 dark:shadow-[0_10px_35px_-10px_rgba(168,85,247,0.25)]",
      haloPulse: "bg-purple-500/15",
      badgeText: "Distinguished",
      badgeTextBn: "সম্মানিত অবদানকারী",
      rankTag: "Rank #3",
      rankTagColor: "text-purple-800 dark:text-purple-300 bg-purple-100 dark:bg-purple-500/15 border-purple-300/80 dark:border-purple-500/30",
      pointPill: "bg-purple-50 dark:bg-purple-600/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30",
      accentGlow: "bg-purple-500/15",
      avatarRing: "ring-2 ring-purple-400/90 shadow-[0_0_20px_rgba(168,85,247,0.25)]",
      avatarFallback: "bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-pink-500 text-white",
    },
  }[rank];

  return (
    <div
      className={`flex flex-col items-center justify-end relative group ${
        rank === 1 ? "order-1 md:order-2 z-20 md:-translate-y-4" : rank === 2 ? "order-2 md:order-1 z-10" : "order-3 z-10"
      }`}
      style={{ perspective: "1000px" }}
    >
      {/* Subtle Ambient Overhead Illumination */}
      <div
        className={`absolute -top-10 left-1/2 -translate-x-1/2 w-48 sm:w-64 h-48 rounded-full ${theme.accentGlow} blur-3xl pointer-events-none transition-opacity duration-500 ${
          isHovered ? "opacity-100 scale-105" : "opacity-60"
        }`}
      />

      {/* ========================================================= */}
      {/* FORMAL 3D EXECUTIVE HONOR CARD                            */}
      {/* ========================================================= */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={triggerCelebration}
        className={`w-full p-6 sm:p-7 rounded-3xl bg-gradient-to-b ${theme.cardBg} border ${theme.border} ${theme.glowRing} backdrop-blur-xl relative overflow-hidden cursor-pointer select-none transition-shadow`}
        style={{
          transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) ${
            isHovered ? "scale3d(1.02, 1.02, 1.02) translateZ(8px)" : "scale3d(1, 1, 1)"
          }`,
          transformStyle: "preserve-3d",
          transition: isHovered
            ? "transform 0.08s ease-out"
            : "transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        {/* Subtle Specular Glare Reflection */}
        <div
          className="pointer-events-none absolute inset-0 rounded-3xl z-30 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, ${glare.opacity}), transparent 60%)`,
          }}
        />

        {/* ======================================================= */}
        {/* HEADER: DIGNIFIED RANK BADGE & HONORARY TITLE           */}
        {/* ======================================================= */}
        <div
          className="flex items-center justify-between gap-2 relative z-10"
          style={{ transform: "translateZ(25px)", transformStyle: "preserve-3d" }}
        >
          <span
            className={`px-3 py-1 rounded-full font-mono font-bold text-xs flex items-center gap-1.5 border shadow-xs ${theme.rankTagColor}`}
          >
            {rank === 1 ? (
              <Crown className="w-3.5 h-3.5 text-amber-400" />
            ) : rank === 2 ? (
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            ) : (
              <Award className="w-3.5 h-3.5 text-purple-400" />
            )}
            <span>{theme.rankTag}</span>
          </span>

          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
            {language === "bn" ? theme.badgeTextBn : theme.badgeText}
          </span>
        </div>

        {/* ======================================================= */}
        {/* AVATAR PRESENTATION                                     */}
        {/* ======================================================= */}
        <div
          className="mt-6 flex flex-col items-center text-center space-y-3 relative z-10"
          style={{ transform: "translateZ(40px)", transformStyle: "preserve-3d" }}
        >
          <div className="relative">
            {/* Subtle Pulse Halo */}
            <div
              className={`absolute -inset-2 rounded-2xl ${theme.haloPulse} blur-md pointer-events-none`}
            />

            {/* Avatar Frame */}
            <div
              className={`relative ${
                rank === 1 ? "w-20 h-20 sm:w-22 sm:h-22" : "w-16 h-16 sm:w-18 sm:h-18"
              } rounded-2xl p-0.5 ${theme.avatarRing} shadow-lg overflow-hidden group-hover:scale-105 transition-transform duration-300`}
            >
              <div className={`w-full h-full rounded-[0.95rem] overflow-hidden ${theme.avatarFallback}`}>
                <ContributorAvatar
                  name={contributor.name}
                  avatarUrl={contributor.avatarUrl}
                  fallbackTextClasses={
                    rank === 1 ? "text-white text-2xl font-black" : "text-white text-xl font-black"
                  }
                />
              </div>
            </div>

            {/* Corner Rank Icon */}
            <div
              className={`absolute ${
                rank === 1 ? "-top-2 -right-2 w-7 h-7" : "-bottom-1.5 -right-1.5 w-6 h-6"
              } rounded-full flex items-center justify-center shadow-md border border-white dark:border-slate-800 ${
                rank === 1
                  ? "bg-amber-500 text-slate-950"
                  : rank === 2
                  ? "bg-teal-600 text-white"
                  : "bg-purple-600 text-white"
              }`}
              style={{ transform: "translateZ(55px)" }}
            >
              {rank === 1 ? (
                <Crown className="w-3.5 h-3.5 fill-current" />
              ) : rank === 2 ? (
                <Sparkles className="w-3 h-3 fill-current" />
              ) : (
                <Award className="w-3 h-3 fill-current" />
              )}
            </div>
          </div>

          {/* ===================================================== */}
          {/* CONTRIBUTOR CREDENTIALS                               */}
          {/* ===================================================== */}
          <div
            className="pt-1 space-y-1"
            style={{ transform: "translateZ(30px)", transformStyle: "preserve-3d" }}
          >
            <h3
              className={`font-black text-slate-900 dark:text-white tracking-tight ${
                rank === 1 ? "text-lg sm:text-xl" : "text-base sm:text-lg"
              }`}
            >
              {contributor.name}
            </h3>
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
              {contributor.studentId && <span>{contributor.studentId}</span>}
              {contributor.studentId && contributor.department && <span>•</span>}
              {contributor.department && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-white/10">
                  {contributor.department}
                </span>
              )}
            </div>
          </div>

          {/* ===================================================== */}
          {/* VERIFIED CONTRIBUTIONS STATUS                         */}
          {/* ===================================================== */}
          <div
            className="w-full pt-3 mt-1 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between text-xs"
            style={{ transform: "translateZ(30px)", transformStyle: "preserve-3d" }}
          >
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              {language === "bn" ? "অর্জিত পয়েন্ট:" : "Earned Points:"}
            </span>
            <span
              className={`px-3 py-1 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs ${theme.pointPill}`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {contributor.approvedContributions} {language === "bn" ? "পয়েন্ট" : "Points"}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Subtle Ground Ambient Puddle */}
      <div
        className={`w-3/4 h-3 -mt-1 rounded-full ${theme.accentGlow} blur-md pointer-events-none opacity-40 dark:opacity-100`}
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
      
      {/* Background Ambient Illumination */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-b from-blue-600/10 via-purple-600/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* ========================================================= */}
      {/* 1. HEADER & HERO BANNER                                   */}
      {/* ========================================================= */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100 dark:bg-blue-500/10 border border-blue-300 dark:border-blue-500/30 text-blue-700 dark:text-blue-400 text-xs font-bold tracking-wider uppercase shadow-xs">
            <Trophy className="w-4 h-4 text-amber-500" />
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

        {/* Stats Pill */}
        <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0 bg-white/90 dark:bg-slate-900/80 text-slate-800 dark:text-white px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs dark:shadow-md backdrop-blur-md">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <UserCheck className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-bold tracking-wide">
            {contributors.length} {language === "bn" ? "জন স্বীকৃতিপ্রাপ্ত" : "Students Recognized"}
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* EMPTY STATE                                               */}
      {/* ========================================================= */}
      {!loading && contributors.length === 0 ? (
        <div className="p-8 sm:p-14 rounded-3xl bg-gradient-to-b from-blue-500/5 via-slate-50/50 to-white dark:from-blue-950/20 dark:via-slate-900/60 dark:to-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/25">
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
          {/* 2. TOP 3 HONOR SPOTLIGHT (FORMAL EXECUTIVE PRESENTATION)  */}
          {/* ========================================================= */}
          {top1 && top2 && top3 && !searchQuery.trim() && selectedDept === "ALL" && (
            <div className="py-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-end pt-2 pb-2">
                {/* Rank #2 (Left - Senior Contributor) */}
                <FormalHonorCard contributor={top2} rank={2} language={language} />

                {/* Rank #1 (Center - Lead Contributor, Dignified Elevation) */}
                <FormalHonorCard contributor={top1} rank={1} language={language} />

                {/* Rank #3 (Right - Distinguished Contributor) */}
                <FormalHonorCard contributor={top3} rank={3} language={language} />
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. SEARCH & DEPARTMENT FILTER TOOLBAR                     */}
          {/* ========================================================= */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-md backdrop-blur-xl space-y-3.5">
            {/* Top Row: Search Input + Result Count & Reset Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === "bn" ? "শীর্ষ ৫০ জনের মধ্যে নাম বা আইডি খুঁজুন..." : "Search in top 50 by name or ID..."}
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
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

              {/* Status and Active Filter Reset */}
              <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
                <span className="font-semibold text-slate-500 dark:text-slate-400 font-mono">
                  {language === "bn"
                    ? `পাওয়া গেছে: ${filteredContributors.length} জন`
                    : `Showing: ${filteredContributors.length} contributors`}
                </span>
                {(selectedDept !== "ALL" || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDept("ALL");
                      setSearchQuery("");
                    }}
                    className="font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {language === "bn" ? "রিসেট ফিল্টার" : "Reset Filter"}
                  </button>
                )}
              </div>
            </div>

            {/* Department Filter Pills: Wrapped naturally across lines with perfect responsiveness */}
            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/70">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 hidden sm:inline-block">
                  {language === "bn" ? "ডিপার্টমেন্ট:" : "Dept:"}
                </span>
                {departmentsList.map((d) => {
                  const isSelected = selectedDept === d;
                  const count = d === "ALL"
                    ? contributors.length
                    : contributors.filter((c) => c.department?.toUpperCase() === d).length;
                  return (
                    <button
                      key={d}
                      onClick={() => setSelectedDept(d)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 scale-105"
                          : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/50 dark:border-slate-700/50"
                      }`}
                    >
                      <span>{d === "ALL" ? (language === "bn" ? "সকল ডিপার্টমেন্ট" : "All Departments") : d}</span>
                      {count > 0 && (
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 4. COMPLETE DIRECTORY (All Contributors)                  */}
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
                          ? "bg-indigo-50/70 dark:bg-indigo-950/20"
                          : c.rank === 2
                          ? "bg-teal-50/70 dark:bg-teal-950/20"
                          : c.rank === 3
                          ? "bg-purple-50/70 dark:bg-purple-950/20"
                          : ""
                      }`}
                    >
                      {/* Left: Rank & Avatar & Name */}
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        {/* Formal Rank Badge */}
                        <span
                          className={`w-10 h-9 rounded-xl font-mono text-xs font-black flex items-center justify-center shrink-0 border shadow-xs transition-transform hover:scale-105 ${
                            c.rank === 1
                              ? "bg-gradient-to-r from-amber-500 to-indigo-600 text-white border-amber-400 shadow-amber-500/20"
                              : c.rank === 2
                              ? "bg-gradient-to-r from-teal-500 to-emerald-600 text-white border-teal-400 shadow-teal-500/20"
                              : c.rank === 3
                              ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white border-purple-400 shadow-purple-500/20"
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
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 text-xs font-bold uppercase shrink-0 overflow-hidden ring-1 ring-slate-200/80 dark:ring-slate-700/80 shadow-xs">
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
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 shrink-0 flex items-center gap-1">
                                <Crown className="w-3 h-3 text-amber-400" />
                                <span>{language === "bn" ? "প্রধান অবদানকারী" : "Lead"}</span>
                              </span>
                            )}
                            {c.rank === 2 && (
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-500/30 shrink-0 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-teal-400" />
                                <span>{language === "bn" ? "সিনিয়র" : "Senior"}</span>
                              </span>
                            )}
                            {c.rank === 3 && (
                              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30 shrink-0 flex items-center gap-1">
                                <Award className="w-3 h-3 text-purple-400" />
                                <span>{language === "bn" ? "সম্মানিত" : "Distinguished"}</span>
                              </span>
                            )}
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold shrink-0">
                              {c.department || "CSE"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {c.title || (language === "bn" ? "অ্যাকাডেমিক কন্ট্রিবিউটর" : "Academic Contributor")} {c.studentId ? `• ${c.studentId}` : ""}
                          </p>
                        </div>
                      </div>

                      {/* Right: Contributions Count */}
                      <div className="shrink-0 text-right">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-500/20 shadow-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{c.approvedContributions}</span>
                          <span className="hidden sm:inline font-medium text-[11px]">
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
