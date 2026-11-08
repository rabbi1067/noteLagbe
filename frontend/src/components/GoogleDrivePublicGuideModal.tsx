"use client";

import React from "react";
import { 
  Lock, 
  ExternalLink, 
  CheckCircle2, 
  RefreshCw, 
  X, 
  AlertTriangle,
  Globe,
  Share2,
  Users
} from "lucide-react";

interface GoogleDrivePublicGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  onRecheck: () => void;
  rechecking: boolean;
  language?: string;
}

export default function GoogleDrivePublicGuideModal({
  isOpen,
  onClose,
  fileUrl,
  onRecheck,
  rechecking,
  language = "en",
}: GoogleDrivePublicGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-6 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-4 pr-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-sm animate-pulse">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/80 px-2.5 py-0.5 rounded-full mb-1">
              <AlertTriangle className="w-3 h-3" />
              {language === "bn" ? "অ্যাক্সেস রেস্ট্রিক্টেড" : "Access Restricted"}
            </span>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight">
              {language === "bn"
                ? "গুগল ড্রাইভ ফাইলটি প্রাইভেট রয়েছে"
                : "Google Drive Link is Private / Restricted"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {language === "bn"
                ? "সহপাঠী ও অ্যাডমিনদের যাচাইয়ের সুবিধার্থে লিংকটি পাবলিক (Anyone with the link -> Viewer) করা আবশ্যক।"
                : "To let students and admins view and verify your material, this Google Drive file must have public access enabled."}
            </p>
          </div>
        </div>

        {/* 5-Step Visual Walkthrough Guide */}
        <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
          <p className="font-black text-[11px] uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            {language === "bn" ? "পাবলিক করার সহজ নির্দেশিকা (মাত্র ৩০ সেকেন্ড):" : "How to make it public (Takes 30 seconds):"}
          </p>

          <ol className="space-y-2.5 pl-1">
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                1
              </span>
              <span>
                {language === "bn" ? (
                  <>ফাইলটি গুগল ড্রাইভে ওপেন করুন। নিচে থাকা <strong>&ldquo;গুগল ড্রাইভে ওপেন করুন&rdquo;</strong> বাটনে চাপ দিন।</>
                ) : (
                  <>Open the file in Google Drive. You can use the button below.</>
                )}
              </span>
            </li>

            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                2
              </span>
              <span>
                {language === "bn" ? (
                  <>উপরে ডানে থাকা নীল <strong>&ldquo;Share&rdquo; (শেয়ার)</strong> বাটনে ক্লিক করুন।</>
                ) : (
                  <>Click the blue <strong>&ldquo;Share&rdquo;</strong> button at top right.</>
                )}
              </span>
            </li>

            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                3
              </span>
              <span>
                {language === "bn" ? (
                  <><strong>General access</strong> সেকশনে <strong>&ldquo;Restricted&rdquo;</strong> পরিবর্তন করে <strong>&ldquo;Anyone with the link&rdquo; (লিংক থাকা যে কেউ)</strong> সিলেক্ট করুন।</>
                ) : (
                  <>Under <strong>General access</strong>, change from <strong>&ldquo;Restricted&rdquo;</strong> to <strong>&ldquo;Anyone with the link&rdquo;</strong>.</>
                )}
              </span>
            </li>

            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                4
              </span>
              <span>
                {language === "bn" ? (
                  <>ভূমিকাটি <strong>&ldquo;Viewer&rdquo; (ভিউয়ার)</strong> রাখা নিশ্চিত করুন (যাতে কেউ ফাইল পরিবর্তন করতে না পারে)।</>
                ) : (
                  <>Ensure the permission is set to <strong>&ldquo;Viewer&rdquo;</strong> (so content remains read-only).</>
                )}
              </span>
            </li>

            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                5
              </span>
              <span>
                {language === "bn" ? (
                  <><strong>&ldquo;Copy link&rdquo;</strong> করে নিচের <strong>&ldquo;রিচেক করুন&rdquo;</strong> বাটনে চাপ দিন।</>
                ) : (
                  <>Click <strong>&ldquo;Copy link&rdquo;</strong> and press <strong>&ldquo;Re-check Link Now&rdquo;</strong> below.</>
                )}
              </span>
            </li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            {fileUrl && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" />
                <span>{language === "bn" ? "গুগল ড্রাইভে ওপেন করুন" : "Open in Google Drive"}</span>
              </a>
            )}

            <button
              type="button"
              onClick={onRecheck}
              disabled={rechecking}
              className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${rechecking ? "animate-spin" : ""}`} />
              <span>
                {rechecking
                  ? (language === "bn" ? "যাচাই হচ্ছে..." : "Checking Link...")
                  : (language === "bn" ? "পাবলিক করেছি — রিচেক করুন" : "Re-check Link Now")}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors text-center"
          >
            {language === "bn" ? "পরে ঠিক করব (বন্ধ করুন)" : "Dismiss & I'll fix it manually"}
          </button>
        </div>
      </div>
    </div>
  );
}
