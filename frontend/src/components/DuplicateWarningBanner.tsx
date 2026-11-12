"use client";

import React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { DuplicateCheckResult } from "@/hooks/useDuplicateResourceCheck";

interface DuplicateWarningBannerProps {
  checking?: boolean;
  duplicateInfo: DuplicateCheckResult | null;
  language?: string;
}

/**
 * Displays a compact live checking badge and an explicit conflict warning card
 * when an identical resource already exists in APPROVED or PENDING status.
 */
export function DuplicateWarningBanner({
  checking,
  duplicateInfo,
  language = "en",
}: DuplicateWarningBannerProps) {
  if (!duplicateInfo?.duplicate) {
    if (!checking) return null;
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500 shrink-0" />
        <span>
          {language === "bn"
            ? "একই প্রশ্ন বা মেটেরিয়াল আগে থেকে আছে কিনা যাচাই করা হচ্ছে..."
            : "Checking if this material already exists..."}
        </span>
      </div>
    );
  }

  const isPending = duplicateInfo.existingStatus === "PENDING";

  return (
    <div
      role="alert"
      data-testid="duplicate-warning-banner"
      className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/35 text-red-700 dark:text-red-300 shadow-sm"
    >
      <div className="p-1.5 rounded-lg bg-red-500/15 text-red-600 dark:text-red-400 shrink-0 mt-0.5">
        <AlertTriangle className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-extrabold tracking-tight text-red-800 dark:text-red-200">
            {language === "bn"
              ? "ডুপ্লিকেট মেটেরিয়াল! এটি আগে থেকেই রয়েছে"
              : "Duplicate Detected — Already Exists"}
          </p>
          {isPending ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              {language === "bn" ? "রিভিউতে অপেক্ষমাণ" : "Pending Review"}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30">
              {language === "bn" ? "ইতিমধ্যে প্রকাশিত" : "Published"}
            </span>
          )}
        </div>
        <p className="text-[11px] leading-relaxed font-medium text-red-700/95 dark:text-red-300/95">
          {duplicateInfo.message}
        </p>
        <p className="text-[10px] font-semibold text-red-600/90 dark:text-red-400/90">
          {duplicateInfo.singleSlotExam
            ? language === "bn"
              ? "একই কোর্স, শিক্ষক ও সেমিস্টারে একই পরীক্ষার প্রশ্নপত্র দ্বিতীয়বার আপলোড করা যাবে না।"
              : "Only one exam paper is allowed per Course + Faculty + Exam Type + Semester. Change course, faculty, exam type, or semester."
            : language === "bn"
            ? "একই নামে আরেকটি মেটেরিয়াল যোগ করা যাবে না — ভিন্ন শিরোনাম (যেমন Quiz 2) অথবা ভিন্ন সেমিস্টার দিন।"
            : "An item with this exact title already exists for this course, faculty, and semester. Use a distinct title (e.g. Quiz 2) or semester."}
        </p>
      </div>
    </div>
  );
}
