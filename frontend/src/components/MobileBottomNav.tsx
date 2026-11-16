"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { 
  BookOpen, 
  GraduationCap, 
  Menu, 
  X, 
  Upload, 
  Layers, 
  Wrench, 
  Tag, 
  Sparkles, 
  ExternalLink,
  Laptop,
  MessageSquare,
  User,
  ShieldCheck,
  ChevronRight,
  Home,
  CheckCircle2,
  Calendar,
  Clock,
  Compass
} from "lucide-react";
import BrandLogo, { NoteLagbeIcon } from "@/components/BrandLogo";

export default function MobileBottomNav() {
  const pathname = usePathname() || "";
  const { user, isAuthenticated, isAdmin, setShowAuthModal } = useAuth();
  const { language, t } = useLanguage();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatUnseenCount, setChatUnseenCount] = useState(0);

  // Sync chat state with FloatingCommunityChat (SEU Campus Live)
  useEffect(() => {
    const handleChatState = (e: any) => {
      if (typeof e.detail?.isOpen === "boolean") {
        setIsChatOpen(e.detail.isOpen);
      }
    };
    const handleChatUnseen = (e: any) => {
      if (typeof e.detail?.count === "number") {
        setChatUnseenCount(e.detail.count);
      }
    };

    window.addEventListener("notelagbe-chat-state", handleChatState);
    window.addEventListener("notelagbe-chat-unseen", handleChatUnseen);
    return () => {
      window.removeEventListener("notelagbe-chat-state", handleChatState);
      window.removeEventListener("notelagbe-chat-unseen", handleChatUnseen);
    };
  }, []);

  const handleToggleCampusLive = () => {
    if (typeof window !== "undefined") {
      setDrawerOpen(false);
      if (isChatOpen) {
        window.dispatchEvent(new CustomEvent("notelagbe-close-chat"));
      } else {
        window.dispatchEvent(new CustomEvent("notelagbe-open-chat"));
      }
    }
  };

  // Auto-close drawer on route navigation
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Prevent background scroll when bottom drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // Don't render on admin dashboard
  if (pathname.startsWith("/admin")) {
    return null;
  }

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <>
      {/* =========================================================================
          1. FIXED BOTTOM NAVIGATION BAR (Mobile & Tablet: lg:hidden)
          Strictly hidden on PC / Desktop to preserve 100% desktop fidelity
         ========================================================================= */}
      <nav
        aria-label="Mobile and Tablet Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 w-full h-16 bg-white/95 dark:bg-[#0b1120]/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800/80 shadow-[0_-4px_25px_rgba(0,0,0,0.12)] pb-[env(safe-area-inset-bottom)] transition-colors select-none print:hidden"
      >
        <div className="max-w-md mx-auto h-full flex items-center justify-around px-2 sm:px-4">
          
          {/* 1. Courses & Notes */}
          <Link
            href="/courses"
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all active:scale-95 ${
              isActive("/courses")
                ? "text-blue-600 dark:text-blue-400 font-extrabold"
                : "text-slate-600 dark:text-slate-400 hover:text-blue-500 font-medium"
            }`}
          >
            <div className="relative">
              <BookOpen className="w-5 h-5 transition-transform" />
              {isActive("/courses") && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shadow-[0_0_6px_#3b82f6]" />
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] mt-1 leading-none tracking-tight">
              {language === "bn" ? "কোর্স ও নোট" : "Courses"}
            </span>
          </Link>

          {/* 2. Faculty Directory */}
          <Link
            href="/teachers"
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all active:scale-95 ${
              isActive("/teachers")
                ? "text-blue-600 dark:text-blue-400 font-extrabold"
                : "text-slate-600 dark:text-slate-400 hover:text-blue-500 font-medium"
            }`}
          >
            <div className="relative">
              <GraduationCap className="w-5 h-5 transition-transform" />
              {isActive("/teachers") && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 shadow-[0_0_6px_#3b82f6]" />
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] mt-1 leading-none tracking-tight">
              {language === "bn" ? "শিক্ষক" : "Faculty"}
            </span>
          </Link>

          {/* 3. Center Featured Action Hamburger Button (☰) */}
          <div className="flex flex-col items-center justify-center flex-1 h-full relative">
            <button
              type="button"
              onClick={() => setDrawerOpen(!drawerOpen)}
              className={`w-12 h-12 -mt-5 rounded-full flex items-center justify-center text-white shadow-lg transition-all active:scale-90 cursor-pointer ${
                drawerOpen
                  ? "bg-slate-900 dark:bg-slate-800 text-white ring-4 ring-blue-500/30"
                  : "bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 shadow-blue-500/40 border-2 border-white dark:border-[#0b1120]"
              }`}
              aria-label="Toggle Quick Navigation Menu"
            >
              {drawerOpen ? (
                <X className="w-6 h-6 transition-transform rotate-90" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
            <span className={`text-[10px] sm:text-[11px] mt-1 leading-none tracking-tight font-extrabold ${
              drawerOpen ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"
            }`}>
              {language === "bn" ? "মেনু" : "Menu"}
            </span>
          </div>

          {/* 4. SEU CAMPUS Live Community Chat Button */}
          <button
            type="button"
            onClick={handleToggleCampusLive}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all active:scale-95 cursor-pointer relative group ${
              isChatOpen
                ? "text-cyan-600 dark:text-cyan-400 font-extrabold"
                : "text-slate-600 dark:text-slate-400 hover:text-cyan-500 font-medium"
            }`}
            title={language === "bn" ? "SEU ক্যাম্পাস লাইভ" : "SEU Campus Live"}
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
              {chatUnseenCount > 0 && !isChatOpen ? (
                <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center shadow-[0_0_8px_rgba(225,29,72,0.8)] border border-white dark:border-slate-900 animate-in zoom-in-75">
                  {chatUnseenCount > 99 ? "99+" : chatUnseenCount}
                </span>
              ) : (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-80" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500 shadow-[0_0_6px_#06b6d4]" />
                </span>
              )}
              {isChatOpen && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_6px_#06b6d4]" />
              )}
            </div>
            <div className="flex items-center gap-0.5 mt-1 leading-none">
              <span className="text-[10px] sm:text-[11px] tracking-tight">
                {language === "bn" ? "ক্যাম্পাস" : "Campus"}
              </span>
              <span className="text-[8px] font-black uppercase text-cyan-600 dark:text-cyan-400">
                Live
              </span>
            </div>
          </button>

          {/* 5. Contribute (+2 Free) */}
          <Link
            href="/contribute"
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all active:scale-95 ${
              isActive("/contribute")
                ? "text-emerald-600 dark:text-emerald-400 font-extrabold"
                : "text-slate-600 dark:text-slate-400 hover:text-emerald-500 font-medium"
            }`}
          >
            <div className="relative">
              <Upload className="w-5 h-5 transition-transform" />
              <span className="absolute -top-1.5 -right-3 text-[8px] font-black bg-emerald-600 text-white px-1 py-0.2 rounded-full leading-none shadow-sm">
                +2
              </span>
              {isActive("/contribute") && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] mt-1 leading-none tracking-tight">
              {language === "bn" ? "কন্ট্রিবিউট" : "Contribute"}
            </span>
          </Link>
        </div>
      </nav>

      {/* =========================================================================
          2. AFTER CLICK DRAWER / BOTTOM SHEET OVERLAY (Exact match to diagram)
         ========================================================================= */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Sheet Container */}
          <div className="relative z-10 w-full max-h-[85vh] overflow-y-auto rounded-t-[32px] bg-white dark:bg-[#0c1222] border-t border-slate-200 dark:border-slate-800 shadow-2xl p-5 pb-10 space-y-5 animate-in slide-in-from-bottom duration-250">
            {/* Top Drag Handle Pill */}
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto -mt-1 mb-1" />

            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <NoteLagbeIcon className="w-7 h-7" />
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                    {language === "bn" ? "নোটলাগবে কুইক মেনু" : "NoteLagbe Quick Hub"}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {language === "bn" ? "সাউথইস্ট ইউনিভার্সিটি একাডেমিক পোর্টাল" : "Southeast University Academic Hub"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                aria-label="Close Menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TOP 3 FEATURED CARDS (As shown in user's diagram: Curriculum, Student Tools, Plans & Pricing) */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block px-1">
                {language === "bn" ? "জনপ্রিয় স্টুডেন্ট সার্ভিসেস" : "Featured Services"}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* 1. Curriculum */}
                <Link
                  href="/curriculum"
                  onClick={() => setDrawerOpen(false)}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center sm:flex-col sm:items-start justify-between sm:justify-start gap-3 group ${
                    isActive("/curriculum")
                      ? "bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-300 shadow-sm"
                      : "bg-slate-50 dark:bg-slate-900/60 hover:bg-blue-50/50 dark:hover:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs sm:text-sm truncate">
                      {language === "bn" ? "কারিকুলাম" : "Curriculum"}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {language === "bn" ? "সিলেবাস ও ক্রেডিট ম্যাট্রিক্স" : "Batch 72+ & 60-71 Syllabus"}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 sm:hidden shrink-0" />
                </Link>

                {/* 2. Student Tools */}
                <Link
                  href="/tools"
                  onClick={() => setDrawerOpen(false)}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center sm:flex-col sm:items-start justify-between sm:justify-start gap-3 group ${
                    isActive("/tools")
                      ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 shadow-sm"
                      : "bg-slate-50 dark:bg-slate-900/60 hover:bg-indigo-50/50 dark:hover:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs sm:text-sm truncate">
                      {language === "bn" ? "স্টুডেন্ট টুলস" : "Student Tools"}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {language === "bn" ? "কভার পেজ, রুটিন ও সিজিপিএ" : "Cover Page, Routine & CGPA"}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 sm:hidden shrink-0" />
                </Link>

                {/* 3. Plans & Pricing */}
                <Link
                  href="/pricing"
                  onClick={() => setDrawerOpen(false)}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center sm:flex-col sm:items-start justify-between sm:justify-start gap-3 group ${
                    isActive("/pricing")
                      ? "bg-purple-50 dark:bg-purple-950/60 border-purple-400 dark:border-purple-700 text-purple-700 dark:text-purple-300 shadow-sm"
                      : "bg-slate-50 dark:bg-slate-900/60 hover:bg-purple-50/50 dark:hover:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-600/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs sm:text-sm truncate">
                      {language === "bn" ? "প্ল্যান ও প্রাইসিং" : "Plans & Pricing"}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {language === "bn" ? "আনলক ও স্টাডি প্যাকেজ" : "Course Unlocks & Quota"}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 sm:hidden shrink-0" />
                </Link>
              </div>
            </div>

            {/* ACADEMIC DIRECTORY & STUDENT HUB */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block px-1">
                {language === "bn" ? "একাডেমিক হাব" : "Academic Hub"}
              </span>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 overflow-hidden text-xs">
                {/* Courses & Notes */}
                <Link
                  href="/courses"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-between p-3 hover:bg-white dark:hover:bg-slate-800/80 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {language === "bn" ? "সকল কোর্স ও বিগত প্রশ্নব্যাংক" : "All Courses & Question Bank"}
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>

                {/* Faculty Directory */}
                <Link
                  href="/teachers"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-between p-3 hover:bg-white dark:hover:bg-slate-800/80 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <GraduationCap className="w-4 h-4 text-indigo-500" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {language === "bn" ? "শিক্ষক তালিকা ও শিডিউল" : "Faculty & Staff Directory"}
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>

                {/* SEU Campus Live Community */}
                <button
                  type="button"
                  onClick={handleToggleCampusLive}
                  className="w-full flex items-center justify-between p-3 hover:bg-white dark:hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="w-4 h-4 text-cyan-500" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {language === "bn" ? "SEU ক্যাম্পাস লাইভ কমিউনিটি" : "SEU Campus Live Community"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-80" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                    </span>
                    <span className="text-[9px] font-black uppercase text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 px-1.5 py-0.5 rounded-full border border-cyan-200 dark:border-cyan-800">
                      Live
                    </span>
                  </div>
                </button>

                {/* Contribute Material */}
                <Link
                  href="/contribute"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center justify-between p-3 hover:bg-white dark:hover:bg-slate-800/80 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Upload className="w-4 h-4 text-emerald-500" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {language === "bn" ? "নোট আপলোড করুন (+২ কোর্স ফ্রি)" : "Contribute Notes (+2 Courses Free)"}
                    </span>
                  </div>
                  <span className="text-[10px] font-black bg-emerald-600 text-white px-1.5 py-0.5 rounded-full">
                    +2 Free
                  </span>
                </Link>

                {/* User Dashboard / Auth Trigger */}
                {isAuthenticated ? (
                  <>
                    <Link
                      href="/dashboard"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center justify-between p-3 hover:bg-white dark:hover:bg-slate-800/80 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <User className="w-4 h-4 text-blue-500" />
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {language === "bn" ? "স্টুডেন্ট ড্যাশবোর্ড ও আনলকড কোর্স" : "Student Dashboard & Unlocked Courses"}
                        </span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </Link>

                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setDrawerOpen(false)}
                        className="flex items-center justify-between p-3 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors font-bold"
                      >
                        <div className="flex items-center gap-2.5">
                          <ShieldCheck className="w-4 h-4" />
                          <span>{language === "bn" ? "অ্যাডমিন কন্ট্রোল সেন্টার" : "Admin Control Center"}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-purple-400" />
                      </Link>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      setShowAuthModal(true);
                    }}
                    className="w-full flex items-center justify-between p-3 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors font-bold text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <User className="w-4 h-4" />
                      <span>{language === "bn" ? "সাইন ইন / অ্যাকাউন্ট রেজিস্ট্রেশন" : "Sign In / Register Student Account"}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* SEU OFFICIAL EXTERNAL PORTALS */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block px-1">
                {language === "bn" ? "সাউথইস্ট ইউনিভার্সিটি লিংকস" : "SEU Official Portals"}
              </span>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <a
                  href="https://ums.seu.edu.bd"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between font-bold text-slate-700 dark:text-slate-300"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <ExternalLink className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="truncate">UMS Portal</span>
                  </div>
                </a>

                <a
                  href="https://canvas.seu.edu.bd"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-xl border border-cyan-200/60 dark:border-cyan-900/60 bg-cyan-50/30 dark:bg-cyan-950/20 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition-colors flex items-center justify-between font-bold text-cyan-700 dark:text-cyan-300"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Laptop className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                    <span className="truncate">Canvas LMS</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
