"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  BookOpen, 
  Layers, 
  Calendar,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
}

export default function LiveRemainingCountdown({
  targetDate,
  planTitle,
  variant = "full", // "full" | "compact" | "card"
  showUnlockedChips = true,
}: {
  targetDate?: string;
  planTitle?: string;
  variant?: "full" | "compact" | "card";
  showUnlockedChips?: boolean;
}) {
  const { user } = useAuth();
  const { language } = useLanguage();

  // Determine effective expiration date
  const effectiveExpiresAt = targetDate || user?.activeAccessExpiresAt || user?.subscriptionExpiresAt;
  
  // Determine access type
  const isSubscription = user?.hasActiveSubscription;
  const isContributionReward = !isSubscription && (user?.activeAccessSource === "CONTRIBUTION_REWARD" || (user?.unlockedCourseDetails && user.unlockedCourseDetails.length > 0));
  const isStaff = user?.role === "ROLE_ADMIN" || user?.role === "ROLE_SUPER_ADMIN" || user?.role === "ROLE_MANAGER";

  const [timeLeft, setTimeLeft] = useState<CountdownTime>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalSeconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    if (!effectiveExpiresAt) return;

    const calculateTime = () => {
      const now = new Date().getTime();
      const target = new Date(effectiveExpiresAt).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          totalSeconds: 0,
          isExpired: true,
        });
        return;
      }

      const totalSecs = Math.floor(diff / 1000);
      const days = Math.floor(totalSecs / (3600 * 24));
      const hours = Math.floor((totalSecs % (3600 * 24)) / 3600);
      const minutes = Math.floor((totalSecs % 3600) / 60);
      const seconds = totalSecs % 60;

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        totalSeconds: totalSecs,
        isExpired: false,
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [effectiveExpiresAt]);

  // If staff, render permanent unrestricted access badge
  if (isStaff) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-slate-900 border border-blue-500/30 text-white shadow-lg flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400 font-bold shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {language === "bn" ? "অ্যাডমিন অ্যাক্সেস" : "Staff Administrative Clearance"}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h4 className="text-sm font-extrabold text-white mt-0.5">
              {language === "bn" ? "সকল ৮৫+ কোর্সে আনলিমিটেড স্থায়ী অ্যাক্সেস সক্রিয়" : "Permanent Unrestricted Access to All 85+ SEU Courses"}
            </h4>
          </div>
        </div>
        <Link
          href="/courses"
          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shrink-0 flex items-center gap-1"
        >
          <span>{language === "bn" ? "কোর্স দেখুন" : "View Courses"}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  // If no active access or expired
  if (!effectiveExpiresAt || timeLeft.isExpired) {
    return null;
  }

  // Calculate progress % based on estimated duration (default 90 days for 1 semester / contribution)
  const totalDurationDays = user?.planName?.includes("1-Year") || user?.planName?.includes("Annual")
    ? 365
    : user?.planName?.includes("2-Semester")
    ? 180
    : 90; // Default 3 months (90 days)
  
  const percentageRemaining = Math.min(100, Math.max(1, Math.round((timeLeft.days / totalDurationDays) * 100)));

  // Display title
  const activeTitle = planTitle || (
    isSubscription 
      ? user?.planName 
      : isContributionReward 
      ? (language === "bn" ? "কন্ট্রিবিউশন রিওয়ার্ড (৩ মাস সেমিস্টার অ্যাক্সেস)" : "Peer Contribution Reward (3 Months Semester Access)")
      : (language === "bn" ? "সক্রিয় কোর্স অ্যাক্সেস" : "Active Course Access")
  );

  return (
    <div className="w-full rounded-3xl bg-slate-900/90 dark:bg-slate-900/95 backdrop-blur-xl border-2 border-emerald-500/40 shadow-2xl shadow-emerald-500/10 p-6 sm:p-7 space-y-5 text-white">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-black shadow-lg shadow-emerald-500/25 shrink-0">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                {language === "bn" ? "লাইভ অ্যাক্সেস সক্রিয়" : "Live Access Active"}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                • {isSubscription ? (language === "bn" ? "পেইড প্ল্যান" : "Paid Plan") : (language === "bn" ? "৩ মাসের ফ্রি রিওয়ার্ড" : "3-Month Free Reward")}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white mt-1">
              {activeTitle}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <Link
            href="/courses"
            className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 active:scale-95"
          >
            <span>{language === "bn" ? "কোর্স ব্রাউজ করুন" : "Browse Courses"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Modern Live Countdown HUD (Days, Hours, Minutes, Seconds) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-300 font-semibold px-1">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" />
            {language === "bn" ? "লাইভ অবশিষ্ট সময় কাউন্টডাউন:" : "Live Remaining Validity Countdown:"}
          </span>
          <span className="text-slate-400 text-[11px] font-mono">
            {language === "bn" ? "মেয়াদ শেষ:" : "Expires on:"} {new Date(effectiveExpiresAt).toLocaleDateString()}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {/* Days */}
          <div className="p-3 sm:p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-center space-y-0.5 shadow-inner">
            <span className="text-2xl sm:text-4xl font-black text-emerald-400 font-mono tracking-tight block">
              {timeLeft.days}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              {language === "bn" ? "দিন" : "Days"}
            </span>
          </div>

          {/* Hours */}
          <div className="p-3 sm:p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-center space-y-0.5 shadow-inner">
            <span className="text-2xl sm:text-4xl font-black text-cyan-400 font-mono tracking-tight block">
              {String(timeLeft.hours).padStart(2, "0")}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              {language === "bn" ? "ঘণ্টা" : "Hours"}
            </span>
          </div>

          {/* Minutes */}
          <div className="p-3 sm:p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-center space-y-0.5 shadow-inner">
            <span className="text-2xl sm:text-4xl font-black text-teal-400 font-mono tracking-tight block">
              {String(timeLeft.minutes).padStart(2, "0")}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              {language === "bn" ? "মিনিট" : "Mins"}
            </span>
          </div>

          {/* Seconds */}
          <div className="p-3 sm:p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-center space-y-0.5 shadow-inner">
            <span className="text-2xl sm:text-4xl font-black text-amber-400 font-mono tracking-tight block animate-pulse">
              {String(timeLeft.seconds).padStart(2, "0")}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              {language === "bn" ? "সেকেন্ড" : "Secs"}
            </span>
          </div>
        </div>
      </div>

      {/* Semester Progress Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold px-1">
          <span>{totalDurationDays} {language === "bn" ? "দিনের মেয়াদের মধ্যে" : "Days Validity Window"}</span>
          <span className="text-emerald-400 font-mono font-bold">{timeLeft.days} {language === "bn" ? "দিন অবশিষ্ট" : "Days Left"} ({percentageRemaining}%)</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden p-0.5 border border-slate-700">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-500 shadow-sm shadow-emerald-500/50"
            style={{ width: `${percentageRemaining}%` }}
          />
        </div>
      </div>

      {/* Unlocked Course Chips with Remaining Days */}
      {showUnlockedChips && user?.unlockedCourseDetails && user.unlockedCourseDetails.length > 0 && (
        <div className="pt-3 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              {language === "bn" ? "আপনার আনলককৃত কোর্সসমূহ:" : "Your Active Unlocked Courses:"}
            </span>
            <span className="text-[11px] font-mono text-emerald-400">
              {user.unlockedCourseDetails.length} {language === "bn" ? "কোর্স সক্রিয়" : "courses active"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {user.unlockedCourseDetails.map((uc) => (
              <Link
                key={uc.id ?? `${uc.courseCode}-${uc.teacherId ?? "ALL"}`}
                href={`/courses/${encodeURIComponent(uc.courseCode)}`}
                className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 hover:border-emerald-500/50 transition-all text-xs"
              >
                <span className="font-mono font-black text-emerald-400 group-hover:text-emerald-300">
                  {uc.courseCode}
                </span>
                <span className="text-slate-300 text-[11px] truncate max-w-[120px] sm:max-w-[180px]">
                  {uc.courseTitle}
                </span>
                {uc.teacherName && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    🎁 {uc.teacherInitial || uc.teacherName}
                  </span>
                )}
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {uc.expiresAt ? `${uc.remainingDays}d left` : "Lifetime"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
