"use client";

import React from "react";
import { ShieldBan, AlertTriangle, LogOut, Mail, X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export interface AccountBlockedNotice {
  reason: "auto_logout" | "login_denied";
  message?: string;
  email?: string;
}

interface AccountBlockedModalProps {
  notice: AccountBlockedNotice | null;
  onClose: () => void;
}

/**
 * High-priority glassmorphism notification modal displayed when an administrator blocks a user
 * either while the user has an active session (auto-logout) or during a login attempt.
 */
export default function AccountBlockedModal({ notice, onClose }: AccountBlockedModalProps) {
  const { language } = useLanguage();
  if (!notice) return null;

  const isAutoLogout = notice.reason === "auto_logout";

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="account-blocked-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-[#0b1222]/95 border border-rose-500/35 shadow-2xl shadow-rose-950/50 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-rose-600 via-red-500 to-amber-500" />

        <div className="p-6 sm:p-7 space-y-5 relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notification"
            className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon + Badge */}
          <div className="flex flex-col items-center text-center space-y-3 pt-1">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500/25 to-red-600/20 border border-rose-500/40 flex items-center justify-center shadow-lg shadow-rose-600/20">
                <ShieldBan className="w-8 h-8 text-rose-400" />
              </div>
              {isAutoLogout && (
                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                  <LogOut className="w-3.5 h-3.5 text-amber-400" />
                </span>
              )}
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30">
              <AlertTriangle className="w-3 h-3" />
              {language === "bn"
                ? isAutoLogout
                  ? "সেশন স্বয়ংক্রিয়ভাবে লগ-আউট হয়েছে"
                  : "লগ-ইন সীমাবদ্ধ"
                : isAutoLogout
                  ? "Session Auto-Signed Out"
                  : "Login Restricted"}
            </span>

            <h3
              id="account-blocked-title"
              className="text-lg sm:text-xl font-black text-white tracking-tight"
            >
              {language === "bn"
                ? isAutoLogout
                  ? "আপনার অ্যাকাউন্ট ব্লক করা হয়েছে"
                  : "অ্যাকাউন্ট অ্যাক্সেস স্থগিত করা হয়েছে"
                : isAutoLogout
                  ? "Your Account Has Been Blocked"
                  : "Account Access Suspended"}
            </h3>
          </div>

          {/* Explanation Box */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-2.5 text-xs leading-relaxed">
            {language === "bn" ? (
              <p className="text-rose-200 font-medium">
                {isAutoLogout
                  ? "অ্যাডমিন আপনার অ্যাকাউন্টটি ব্লক করেছেন, তাই আপনাকে স্বয়ংক্রিয়ভাবে লগ-আউট করা হয়েছে। অ্যাকাউন্ট পুনরায় চালু না করা পর্যন্ত আর লগ-ইন করতে পারবেন না।"
                  : "অ্যাডমিন আপনার অ্যাকাউন্টটি ব্লক করেছেন। অ্যাকাউন্ট পুনরায় চালু না করা পর্যন্ত আপনি লগ-ইন করতে পারবেন না।"}
              </p>
            ) : (
              <p className="text-slate-200 font-medium">
                {notice.message ||
                  (isAutoLogout
                    ? "An administrator has blocked your account from User Accounts & RBAC. You have been automatically signed out for security."
                    : "This account has been blocked by an administrator and cannot sign in right now.")}
              </p>
            )}

            {notice.email && (
              <div className="flex items-center gap-2 pt-1 text-[11px] font-mono text-slate-400">
                <Mail className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="truncate">{notice.email}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 transition-all shadow-lg shadow-rose-600/25 cursor-pointer"
            >
              {language === "bn" ? "ঠিক আছে" : "Understood"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
