"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  Trophy, 
  Crown, 
  Sparkles, 
  Award, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  GraduationCap, 
  CheckCircle2, 
  ShieldCheck, 
  Flame,
  UserCheck,
  UploadCloud,
  ArrowRight
} from "lucide-react";
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
        className={`${sizeClasses} object-cover rounded-[inherit]`}
        onError={() => setHasError(true)}
      />
    );
  }

  return <span className={fallbackTextClasses}>{name ? name.charAt(0).toUpperCase() : "U"}</span>;
}

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
  const hasTop3Podium = Boolean(top1 && top2 && top3 && !searchQuery.trim() && selectedDept === "ALL");

  // Ranks 4 to 50 (or all items if fewer than 4 or searching)
  const directoryContributors = useMemo(() => {
    if (searchQuery.trim() || selectedDept !== "ALL" || !hasTop3Podium) {
      return filteredContributors;
    }
    return filteredContributors.filter((c) => c.rank > 3);
  }, [filteredContributors, searchQuery, selectedDept, hasTop3Podium]);

  const displayedDirectory = showAll ? directoryContributors : directoryContributors.slice(0, 10);

  // Unique departments for filter
  const departmentsList = ["ALL", "CSE", "EEE", "ARCH", "TEX", "PHR", "BBA", "LAW", "ENG", "BNG", "ECO", "ICT"];

  return (
    <section id="leaderboard" className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-800 scroll-mt-24">
      
      {/* 1. Header & Title Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold tracking-wide uppercase">
            <Trophy className="w-3.5 h-3.5" />
            <span>{language === "bn" ? "অ্যাকাডেমিক অবদানের স্বীকৃতি" : "Academic Hall of Fame"}</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {language === "bn" ? "শীর্ষ ৫০ অ্যাকাডেমিক অবদানকারী" : "Top 50 Academic Contributors"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            {language === "bn"
              ? "সাউথইস্ট বিশ্ববিদ্যালয়ের সহপাঠীদের পড়াশোনায় সহযোগিতা করতে যারা নিয়মিত ভেরিফায়েড হ্যান্ডনোট, কুইজ, ল্যাব টাস্ক, প্রজেক্ট ও প্রশ্নপত্র শেয়ার করেছেন—তাদের সম্মাননা তালিকা।"
              : "Honoring Southeast University students who empower their peers by continuously sharing verified handwritten notes, quiz papers, lab tasks, project links, and exam archives."}
          </p>
        </div>

        {/* Stats Pill */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0 bg-slate-50 dark:bg-slate-800/80 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
          <UserCheck className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            {contributors.length} {language === "bn" ? "জন তালিকাভুক্ত" : "Students Recognized"}
          </span>
        </div>
      </div>

      {/* Empty State when no contributors yet */}
      {!loading && contributors.length === 0 ? (
        <div className="p-8 sm:p-14 rounded-3xl bg-gradient-to-b from-blue-500/5 via-slate-50/50 to-white dark:from-blue-950/20 dark:via-slate-900/60 dark:to-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
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
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 transition-all hover:scale-105"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{language === "bn" ? "নোট বা প্রশ্ন কন্ট্রিবিউট করুন" : "Contribute Notes Now"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* 2. TOP 3 SPECIAL PODIUM SPOTLIGHT (NO GOLD / SILVER / BRONZE MEDALS) */}
          {top1 && top2 && top3 && !searchQuery.trim() && selectedDept === "ALL" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 items-end pt-2">
          
          {/* Card: Rank #2 (Left - Senior Contributor, Emerald & Teal) */}
          <div className="order-2 md:order-1 p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-teal-500/10 via-slate-50 to-white dark:from-teal-950/40 dark:via-slate-900 dark:to-slate-900 border-2 border-teal-500/30 dark:border-teal-500/20 shadow-lg relative overflow-hidden group hover:border-teal-500/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-700 dark:text-teal-300 font-mono font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Rank #2</span>
              </span>
              <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400">
                {language === "bn" ? "সিনিয়র কন্ট্রিবিউটর" : "Senior Contributor"}
              </span>
            </div>

            <div className="mt-5 flex flex-col items-center text-center space-y-2">
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white text-xl font-black shadow-md shadow-teal-500/20 ring-4 ring-white dark:ring-slate-800 overflow-hidden">
                  <ContributorAvatar
                    name={top2.name}
                    avatarUrl={top2.avatarUrl}
                    fallbackTextClasses="text-white text-xl font-black"
                  />
                </div>
                <div className="absolute -bottom-2 -right-1 w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="pt-1">
                <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg">
                  {top2.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {top2.studentId} • {top2.department}
                </p>
              </div>

              <div className="w-full mt-2 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500 dark:text-slate-400">{language === "bn" ? "অর্জিত পয়েন্ট:" : "Earned Points:"}</span>
                <span className="px-2.5 py-0.5 rounded-lg bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 font-black">
                  {top2.approvedContributions} {language === "bn" ? "পয়েন্ট" : "Points"}
                </span>
              </div>
            </div>
          </div>

          {/* Card: Rank #1 (Center & Elevated - Lead Academic Contributor, Royal Indigo & Electric Blue) */}
          <div className="order-1 md:order-2 p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-indigo-600/15 via-blue-500/10 to-white dark:from-indigo-950/60 dark:via-blue-950/30 dark:to-slate-900 border-2 border-indigo-500/50 dark:border-indigo-400/40 shadow-xl shadow-indigo-500/10 relative overflow-hidden group hover:border-indigo-500 transition-all md:-translate-y-3">
            {/* Top Shine Accent */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-indigo-500/20 rounded-full blur-xl pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <span className="px-3.5 py-1 rounded-full bg-indigo-600 text-white font-mono font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <Crown className="w-3.5 h-3.5" />
                <span>Top Rank #1</span>
              </span>
              <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 tracking-wide uppercase">
                {language === "bn" ? "প্রধান অবদানকারী" : "Lead Contributor"}
              </span>
            </div>

            <div className="mt-5 flex flex-col items-center text-center space-y-2 relative z-10">
              <div className="relative">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-500 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-500/30 ring-4 ring-white dark:ring-slate-800 overflow-hidden">
                  <ContributorAvatar
                    name={top1.name}
                    avatarUrl={top1.avatarUrl}
                    fallbackTextClasses="text-white text-2xl font-black"
                  />
                </div>
                <div className="absolute -top-2.5 -right-1 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md border-2 border-white dark:border-slate-800">
                  <Crown className="w-4 h-4 text-amber-300" />
                </div>
              </div>

              <div className="pt-1">
                <h3 className="font-black text-slate-900 dark:text-white text-lg sm:text-xl">
                  {top1.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {top1.studentId} • {top1.department}
                </p>
              </div>

              <div className="w-full mt-2 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500 dark:text-slate-400">{language === "bn" ? "অর্জিত পয়েন্ট:" : "Earned Points:"}</span>
                <span className="px-3 py-1 rounded-lg bg-indigo-600 text-white font-black shadow-xs">
                  {top1.approvedContributions} {language === "bn" ? "পয়েন্ট" : "Points"}
                </span>
              </div>
            </div>
          </div>

          {/* Card: Rank #3 (Right - Distinguished Contributor, Radiant Violet & Purple) */}
          <div className="order-3 p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-purple-500/10 via-slate-50 to-white dark:from-purple-950/40 dark:via-slate-900 dark:to-slate-900 border-2 border-purple-500/30 dark:border-purple-500/20 shadow-lg relative overflow-hidden group hover:border-purple-500/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-700 dark:text-purple-300 font-mono font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" />
                <span>Rank #3</span>
              </span>
              <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">
                {language === "bn" ? "সম্মানিত অবদানকারী" : "Distinguished Contributor"}
              </span>
            </div>

            <div className="mt-5 flex flex-col items-center text-center space-y-2">
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white text-xl font-black shadow-md shadow-purple-500/20 ring-4 ring-white dark:ring-slate-800 overflow-hidden">
                  <ContributorAvatar
                    name={top3.name}
                    avatarUrl={top3.avatarUrl}
                    fallbackTextClasses="text-white text-xl font-black"
                  />
                </div>
                <div className="absolute -bottom-2 -right-1 w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs">
                  <Award className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="pt-1">
                <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg">
                  {top3.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {top3.studentId} • {top3.department}
                </p>
              </div>

              <div className="w-full mt-2 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500 dark:text-slate-400">{language === "bn" ? "অর্জিত পয়েন্ট:" : "Earned Points:"}</span>
                <span className="px-2.5 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 font-black">
                  {top3.approvedContributions} {language === "bn" ? "পয়েন্ট" : "Points"}
                </span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 3. Search and Department Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === "bn" ? "শীর্ষ ৫০ জনের মধ্যে খুঁজুন..." : "Search in top 50 contributors..."}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Department Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full pb-1 self-start sm:self-auto">
          {departmentsList.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDept(d)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedDept === d
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {d === "ALL" ? (language === "bn" ? "সকল ডিপার্টমেন্ট" : "All Departments") : d}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Complete Directory (Ranks 4 to 50 or Filtered List) */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        <div className="px-4 sm:px-6 py-3.5 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
          <span>{language === "bn" ? "কন্ট্রিবিউটর প্রোফাইল" : "Contributor Directory"}</span>
          <span className="text-slate-400 font-medium">
            {language === "bn"
              ? `প্রদর্শিত: ${displayedDirectory.length} / ${directoryContributors.length} জন`
              : `Showing ${displayedDirectory.length} of ${directoryContributors.length}`}
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {displayedDirectory.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {language === "bn" ? "কোনো কন্ট্রিবিউটর খুঁজে পাওয়া যায়নি।" : "No contributors matched your search criteria."}
            </div>
          ) : (
            displayedDirectory.map((c) => {
              const isTopThree = c.rank <= 3;
              return (
                <div
                  key={`${c.rank}-${c.name}`}
                  className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Left: Rank & Avatar & Name */}
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    {/* Rank Badge */}
                    <span
                      className={`w-9 h-8 rounded-xl font-mono text-xs font-black flex items-center justify-center shrink-0 border ${
                        c.rank === 1
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : c.rank === 2
                          ? "bg-teal-600 text-white border-teal-600"
                          : c.rank === 3
                          ? "bg-purple-600 text-white border-purple-600"
                          : c.rank <= 10
                          ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      #{c.rank}
                    </span>

                    {/* Avatar Circle */}
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 text-xs font-bold uppercase shrink-0 overflow-hidden ring-1 ring-slate-200/60 dark:ring-slate-700/60">
                      <ContributorAvatar
                        name={c.name}
                        avatarUrl={c.avatarUrl}
                        fallbackTextClasses="text-slate-700 dark:text-slate-200 text-xs font-bold uppercase"
                      />
                    </div>

                    {/* Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {c.name}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold shrink-0">
                          {c.department || "CSE"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {c.title || "Academic Contributor"} • {c.studentId}
                      </p>
                    </div>
                  </div>

                  {/* Right: Contributions Count */}
                  <div className="shrink-0 text-right">
                    <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-900/60">
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
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 text-center">
            <button
              onClick={() => setShowAll(!showAll)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors"
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
