"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Megaphone, 
  AlertCircle, 
  BellRing, 
  Sparkles, 
  ExternalLink,
  Flame,
  Pause,
  Play,
  X,
  BookOpen,
  MessageSquare,
  ArrowRight
} from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";
import { useDataSync } from "@/lib/sync";

export interface NoticeItem {
  id: number;
  text: string;
  type: string;
  link?: string | null;
  active: boolean;
  priority: number;
  startsAt?: string | null;
  expiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export default function HeroNoticeBoard() {
  const router = useRouter();
  const { language } = useLanguage();

  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<NoticeItem | null>(null);

  const handleNoticeClick = (notice: NoticeItem) => {
    if (notice.link && notice.link.trim()) {
      const link = notice.link.trim();
      if (link.startsWith("http://") || link.startsWith("https://")) {
        window.open(link, "_blank", "noopener,noreferrer");
      } else {
        router.push(link);
      }
      return;
    }
    // If no explicit link is set, check if notice is about courses, notes, exams, questions
    const textLower = (notice.text || "").toLowerCase();
    if (
      textLower.includes("course") ||
      textLower.includes("note") ||
      textLower.includes("exam") ||
      textLower.includes("midterm") ||
      textLower.includes("final") ||
      textLower.includes("routine") ||
      textLower.includes("question") ||
      textLower.includes("paper") ||
      textLower.includes("archive") ||
      textLower.includes("কোর্স") ||
      textLower.includes("নোট") ||
      textLower.includes("পরীক্ষা")
    ) {
      router.push("/courses");
      return;
    }
    // Otherwise open the rich Notice Details Modal
    setSelectedNotice(notice);
  };

  const loadNotices = async () => {
    try {
      const data = await api.notices.getActive();
      if (Array.isArray(data)) {
        setNotices(data);
        try {
          if (data.length > 0) {
            localStorage.setItem("notelagbe_cached_notices", JSON.stringify(data));
          } else {
            localStorage.removeItem("notelagbe_cached_notices");
          }
        } catch {}
      } else {
        setNotices([]);
      }
    } catch {
      // Keep existing notices on network lag
    }
  };

  useEffect(() => {
    try {
      const cached = localStorage.getItem("notelagbe_cached_notices");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Guard against old mock notices
          const isMock = parsed.some((p: any) => p.text && p.text.includes("Fall 2026 Midterm"));
          if (!isMock) {
            setNotices(parsed);
          } else {
            localStorage.removeItem("notelagbe_cached_notices");
          }
        }
      }
    } catch {}
    loadNotices();
  }, []);

  // Universal Live Sync: instantly update ticker when admin adds, edits, or deletes a notice
  useDataSync((payload) => {
    if (!payload || payload.entity === "notice" || payload.entity === "all") {
      loadNotices();
    }
  });

  // Filter active and unexpired notices on client as well for safety
  const now = Date.now();
  const activeNotices = (notices || []).filter((n) => {
    if (!n.active) return false;
    if (n.startsAt && new Date(n.startsAt).getTime() > now) return false;
    if (n.expiresAt && new Date(n.expiresAt).getTime() < now) return false;
    return true;
  });

  // If no live notice is created or active in the database, do not render the banner
  if (activeNotices.length === 0) {
    return null;
  }

  const displayList = activeNotices;

  // Ensure enough items to create a seamless infinite loop
  const loopMultiplier = displayList.length === 1 ? 4 : displayList.length === 2 ? 3 : 2;
  const loopedItems: NoticeItem[] = [];
  for (let i = 0; i < loopMultiplier; i++) {
    loopedItems.push(...displayList);
  }

  const renderTypeIcon = (type?: string) => {
    const t = (type || "INFO").toUpperCase();
    switch (t) {
      case "ALERT":
        return <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse shrink-0" />;
      case "IMPORTANT":
        return <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case "UPDATE":
        return <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      default:
        return <BellRing className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
    }
  };

  const renderTypeBadge = (type?: string) => {
    const t = (type || "INFO").toUpperCase();
    switch (t) {
      case "ALERT":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white shadow-xs shrink-0">
            {language === "bn" ? "জরুরি" : "ALERT"}
          </span>
        );
      case "IMPORTANT":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-black shadow-xs shrink-0">
            {language === "bn" ? "নোটিশ" : "NOTICE"}
          </span>
        );
      case "UPDATE":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white shadow-xs shrink-0">
            {language === "bn" ? "আপডেট" : "UPDATE"}
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-xs shrink-0">
            {language === "bn" ? "তথ্য" : "INFO"}
          </span>
        );
    }
  };

  // Adjust scroll speed dynamically based on total length
  const duration = Math.max(30, loopedItems.length * 10);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 mb-2 min-h-[48px] sm:min-h-[52px]">
      {/* Eye-catching glowing marquee ribbon */}
      <div 
        className="group relative flex items-center h-12 sm:h-13 rounded-full bg-gradient-to-r from-[#0a1532] via-[#0f214e] to-[#0a1532] border-2 border-amber-400/80 dark:border-amber-400/70 shadow-[0_4px_30px_rgba(245,158,11,0.28)] dark:shadow-[0_4px_35px_rgba(245,158,11,0.22)] backdrop-blur-xl overflow-hidden transition-all duration-300 hover:border-amber-300 p-1"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Left Floating Radiant Live Badge */}
        <div className="relative z-20 shrink-0 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 text-white shadow-md shadow-red-500/40 select-none">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
          </span>
          <Megaphone className="w-3.5 h-3.5 text-white shrink-0 drop-shadow" />
          <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-white whitespace-nowrap drop-shadow">
            {language === "bn" ? "লাইভ নোটিশ" : "LIVE NOTICE"}
          </span>
        </div>

        {/* Continuous Scrolling Marquee Track with CSS Mask for edge fading */}
        <div 
          className="flex-1 overflow-hidden relative h-full flex items-center mx-2"
          style={{
            maskImage: "linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)",
            WebkitMaskImage: "linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)"
          }}
        >
          <div 
            className={`animate-continuous-marquee flex items-center gap-8 sm:gap-12 ${isPaused ? "is-marquee-paused" : ""}`}
            style={{
              animationDuration: `${duration}s`,
              animationPlayState: isPaused ? "paused" : "running"
            }}
          >
            {/* Set 1 */}
            <div className="flex items-center gap-8 sm:gap-12 shrink-0">
              {loopedItems.map((notice, index) => (
                <div 
                  key={`set1-${notice.id}-${index}`} 
                  onClick={() => handleNoticeClick(notice)}
                  className="flex items-center gap-2.5 shrink-0 cursor-pointer group/item hover:bg-white/10 px-2.5 py-1 rounded-full transition-all active:scale-[0.98]"
                  title={language === "bn" ? "নোটিশটি দেখতে ক্লিক করুন" : "Click to view this notice"}
                >
                  {renderTypeIcon(notice.type)}
                  {renderTypeBadge(notice.type)}
                  
                  <span className="text-xs sm:text-sm font-bold text-white group-hover/item:text-amber-300 drop-shadow-xs whitespace-nowrap transition-colors">
                    {notice.text}
                  </span>

                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-black group-hover/item:bg-white transition-all shadow-xs shrink-0">
                    <span>{language === "bn" ? "দেখুন" : "Explore"}</span>
                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  </span>

                  <span className="text-amber-400/80 text-xs select-none pl-2 font-mono">✦</span>
                </div>
              ))}
            </div>

            {/* Set 2 (Identical for seamless infinite scroll loop) */}
            <div className="flex items-center gap-8 sm:gap-12 shrink-0" aria-hidden="true">
              {loopedItems.map((notice, index) => (
                <div 
                  key={`set2-${notice.id}-${index}`} 
                  onClick={() => handleNoticeClick(notice)}
                  className="flex items-center gap-2.5 shrink-0 cursor-pointer group/item hover:bg-white/10 px-2.5 py-1 rounded-full transition-all active:scale-[0.98]"
                  title={language === "bn" ? "নোটিশটি দেখতে ক্লিক করুন" : "Click to view this notice"}
                >
                  {renderTypeIcon(notice.type)}
                  {renderTypeBadge(notice.type)}
                  
                  <span className="text-xs sm:text-sm font-bold text-white group-hover/item:text-amber-300 drop-shadow-xs whitespace-nowrap transition-colors">
                    {notice.text}
                  </span>

                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-black group-hover/item:bg-white transition-all shadow-xs shrink-0">
                    <span>{language === "bn" ? "দেখুন" : "Explore"}</span>
                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                  </span>

                  <span className="text-amber-400/80 text-xs select-none pl-2 font-mono">✦</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Floating Pause / Play Button */}
        <div className="relative z-20 shrink-0 flex items-center pr-1">
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="w-8 h-8 rounded-full bg-slate-800/90 hover:bg-amber-400 hover:text-black text-amber-300 flex items-center justify-center transition-all cursor-pointer border border-amber-400/50 shadow-md"
            title={isPaused ? "Play Marquee Ticker" : "Pause Marquee Ticker"}
            aria-label={isPaused ? "Play" : "Pause"}
          >
            {isPaused ? (
              <Play className="w-3.5 h-3.5 fill-current text-emerald-400 ml-0.5" />
            ) : (
              <Pause className="w-3.5 h-3.5 fill-current" />
            )}
          </button>
        </div>
      </div>

      {/* Notice Detail Modal */}
      {selectedNotice && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedNotice(null)}
        >
          <div 
            className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl relative text-slate-100 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedNotice(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Badge & Icon */}
            <div className="flex items-center gap-2 mb-3">
              {renderTypeIcon(selectedNotice.type)}
              {renderTypeBadge(selectedNotice.type)}
              <span className="text-xs text-slate-400 font-mono">
                {language === "bn" ? "ক্যাম্পাস নোটিশ" : "Campus Notice"}
              </span>
            </div>

            {/* Notice Body */}
            <h3 className="text-lg font-bold text-white mb-4 leading-snug">
              {selectedNotice.text}
            </h3>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  setSelectedNotice(null);
                  router.push(selectedNotice.link || "/courses");
                }}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>{language === "bn" ? "কোর্স ও প্রশ্নব্যাংক দেখুন" : "Explore Courses & Notes"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  setSelectedNotice(null);
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("notelagbe-open-chat"));
                  }
                }}
                className="py-2.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                <span>{language === "bn" ? "কমিউনিটি চ্যাট" : "Community Chat"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
