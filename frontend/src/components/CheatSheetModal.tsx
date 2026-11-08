"use client";

import React, { useState, useEffect } from "react";
import { X, Sparkles, Printer, CheckCircle, Flame, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

interface CheatSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseCode: string;
}

export default function CheatSheetModal({ isOpen, onClose, courseCode }: CheatSheetModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && courseCode) {
      setLoading(true);
      api.courses.getCheatSheet(courseCode)
        .then((res) => setData(res))
        .catch(() => setData(null))
        .finally(() => setLoading(false));
    }
  }, [isOpen, courseCode]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl max-h-[90vh] rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-indigo-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base text-slate-900 dark:text-slate-100">AI Exam Revision Cheat Sheet</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                  {courseCode}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">High-yield exam recap & recurrent course-in topics</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
              title="Print Cheat Sheet"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6 text-xs sm:text-sm">
          {loading ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto" />
              <p className="text-xs font-semibold">Generating high-yield revision summary...</p>
            </div>
          ) : data ? (
            <>
              {/* Summary Box */}
              <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60">
                <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                  <Flame className="w-4 h-4 text-amber-500" />
                  Key Revision Strategy
                </h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {data.lastNightSummary}
                </p>
              </div>

              {/* High Yield Topics */}
              {data.highYieldTopics && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 uppercase tracking-wider text-xs">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    High-Yield Topics (Recurrent in Past Exams)
                  </h4>
                  <div className="space-y-1.5">
                    {data.highYieldTopics.map((topic: string, i: number) => (
                      <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-start gap-2.5 text-xs">
                        <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 font-bold flex items-center justify-center shrink-0 text-[10px]">
                          {i + 1}
                        </span>
                        <span className="text-slate-700 dark:text-slate-300 leading-snug">{topic}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tips */}
              {data.examTips && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 uppercase tracking-wider text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    Examination Scoring Tips
                  </h4>
                  <ul className="space-y-1 text-slate-600 dark:text-slate-400 list-disc list-inside text-xs leading-relaxed">
                    {data.examTips.map((tip: string, i: number) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-slate-400 py-10">Unable to generate cheat sheet at this time.</p>
          )}
        </div>
      </div>
    </div>
  );
}
