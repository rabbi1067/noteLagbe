"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, ArrowRight, X, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { useDataSync } from "@/lib/sync";
import { useLanguage } from "@/context/LanguageContext";

export default function GlobalCampaignBanner() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const [campaign, setCampaign] = useState<any | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const fetchCampaign = useCallback(async () => {
    try {
      const data = await api.pricing.getCampaign();
      if (data?.campaignActive && data?.expiresAt) {
        setCampaign(data);
      } else {
        setCampaign(null);
      }
    } catch {
      // Non-blocking silent fallback
      setCampaign(null);
    }
  }, []);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  // Live Sync listener for real-time campaign updates
  useDataSync(() => {
    fetchCampaign();
  });

  // Real-time ticking countdown
  useEffect(() => {
    if (!campaign?.expiresAt) {
      setTimeLeft(null);
      return;
    }

    const calculateTime = () => {
      const target = new Date(campaign.expiresAt).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft(null);
        setCampaign(null);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [campaign?.expiresAt]);

  if (!campaign || !campaign.campaignActive || dismissed) {
    return null;
  }

  const formatUnit = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="relative z-40 bg-gradient-to-r from-amber-600 via-rose-600 to-purple-700 text-white shadow-md border-b border-white/15 px-3 py-2 sm:py-2.5 text-xs transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Left: Campaign Tag & Title */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-black/25 shrink-0 shadow-inner">
            <Flame className="w-4 h-4 text-amber-300 animate-pulse" />
          </span>
          <div className="flex items-center gap-2 truncate">
            <span className="font-black text-amber-200 uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-black/30 border border-amber-300/30 shrink-0">
              {campaign.badgeText || (language === "bn" ? "স্পেশাল অফার" : "Flash Offer")}
            </span>
            <span className="font-extrabold truncate text-white text-xs sm:text-[13px]">
              {campaign.campaignName || (language === "bn" ? "সীমিত সময়ের বিশেষ ডিসকাউন্ট চলছে!" : "Limited Time Flash Discount Active!")}
            </span>
          </div>
        </div>

        {/* Center / Right: Live Countdown Timer */}
        {timeLeft && (
          <div className="hidden md:flex items-center gap-1.5 font-mono text-[11px] bg-black/35 px-2.5 py-1 rounded-xl border border-white/10 shrink-0 shadow-sm">
            <Clock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="text-white/80 font-sans text-[10px] mr-1">
              {language === "bn" ? "শেষ হতে বাকি:" : "Ends in:"}
            </span>
            {timeLeft.days > 0 && (
              <>
                <span className="font-black text-amber-200">{formatUnit(timeLeft.days)}d</span>
                <span className="text-white/40">:</span>
              </>
            )}
            <span className="font-black text-amber-200">{formatUnit(timeLeft.hours)}h</span>
            <span className="text-white/40">:</span>
            <span className="font-black text-amber-200">{formatUnit(timeLeft.minutes)}m</span>
            <span className="text-white/40">:</span>
            <span className="font-black text-rose-300 animate-pulse">{formatUnit(timeLeft.seconds)}s</span>
          </div>
        )}

        {/* Right: CTA & Dismiss */}
        <div className="flex items-center gap-1.5 shrink-0">
          {pathname !== "/pricing" && (
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1 px-3 py-1 rounded-xl font-black text-[11px] bg-white text-slate-900 hover:bg-amber-100 hover:scale-105 active:scale-95 shadow-md transition-all shrink-0 cursor-pointer"
            >
              <span>{language === "bn" ? "অফার নিন" : "Claim Offer"}</span>
              <ArrowRight className="w-3 h-3 text-slate-900" />
            </Link>
          )}

          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss banner"
            className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-black/20 transition-all cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
}
