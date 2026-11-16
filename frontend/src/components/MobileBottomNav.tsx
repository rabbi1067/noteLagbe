"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
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
  MessageSquare, 
  User, 
  ShieldCheck, 
  ChevronRight, 
  Calendar, 
  FileText, 
  Calculator, 
  Award, 
  Sun, 
  Moon, 
  LogOut, 
  Globe
} from "lucide-react";
import BrandLogo, { NoteLagbeIcon } from "@/components/BrandLogo";

export default function MobileBottomNav() {
  const pathname = usePathname() || "";
  const { user, isAuthenticated, isAdmin, logout, setShowAuthModal } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const { toggleTheme, isDark } = useTheme();
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
            onClick={() => {
              if (isChatOpen) window.dispatchEvent(new CustomEvent("notelagbe-close-chat"));
            }}
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
            onClick={() => {
              if (isChatOpen) window.dispatchEvent(new CustomEvent("notelagbe-close-chat"));
            }}
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
            onClick={() => {
              if (isChatOpen) window.dispatchEvent(new CustomEvent("notelagbe-close-chat"));
            }}
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

            {/* TOP 3 PRIMARY SERVICES (As shown in diagram: Curriculum | Student Tools | Plans & Pricing) */}
            <div className="grid grid-cols-3 gap-2">
              <Link
                href="/curriculum"
                onClick={() => setDrawerOpen(false)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all ${
                  isActive("/curriculum")
                    ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25"
                    : "bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 ${
                  isActive("/curriculum") ? "bg-white/20 text-white" : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                }`}>
                  <Layers className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold leading-tight">
                  {language === "bn" ? "কারিকুলাম" : "Curriculum"}
                </span>
              </Link>

              <Link
                href="/tools"
                onClick={() => setDrawerOpen(false)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all ${
                  isActive("/tools")
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/25"
                    : "bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 ${
                  isActive("/tools") ? "bg-white/20 text-white" : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                }`}>
                  <Wrench className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold leading-tight">
                  {language === "bn" ? "স্টুডেন্ট টুলস" : "Student Tools"}
                </span>
              </Link>

              <Link
                href="/pricing"
                onClick={() => setDrawerOpen(false)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all ${
                  isActive("/pricing")
                    ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/25"
                    : "bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/80 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 ${
                  isActive("/pricing") ? "bg-white/20 text-white" : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                }`}>
                  <Tag className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold leading-tight">
                  {language === "bn" ? "প্ল্যান ও প্রাইসিং" : "Plans"}
                </span>
              </Link>
            </div>

            {/* QUICK STUDENT TOOLS (2-Column Clean Cards) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {language === "bn" ? "প্রয়োজনীয় টুলস" : "Student Utility Tools"}
                </span>
                <Link
                  href="/tools"
                  onClick={() => setDrawerOpen(false)}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                >
                  {language === "bn" ? "সবগুলো দেখুন" : "View All"}
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* 1. Cover Page */}
                <Link
                  href="/tools?tab=cover"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-800/80 transition-all group"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                    {language === "bn" ? "কভার পেজ মেকার" : "Cover Page"}
                  </span>
                </Link>

                {/* 2. Exam Routine */}
                <Link
                  href="/tools?tab=routine"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-800/80 transition-all group"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                    {language === "bn" ? "এক্সাম রুটিন" : "Exam Routine"}
                  </span>
                </Link>

                {/* 3. CGPA Calculator */}
                <Link
                  href="/tools?tab=cgpa"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-800/80 transition-all group"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Calculator className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                    {language === "bn" ? "সিজিপিএ ক্যালকুলেটর" : "CGPA Calculator"}
                  </span>
                </Link>

                {/* 4. Certificate Maker */}
                <Link
                  href="/tools?tab=certificate"
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-800/80 transition-all group"
                >
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Award className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                    {language === "bn" ? "সার্টিফিকেট মেকার" : "Certificates"}
                  </span>
                </Link>
              </div>
            </div>

            {/* USER ACCOUNT & CONTROLS */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block px-1">
                {language === "bn" ? "অ্যাকাউন্ট ও সেটিংস" : "Account & Settings"}
              </span>

              {isAuthenticated && user ? (
                <div className="space-y-2">
                  {/* Logged in User Bar */}
                  <Link
                    href="/dashboard"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800/80 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          user.name.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {user.name}
                        </div>
                        <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold truncate">
                          {isAdmin 
                            ? "Admin / Staff" 
                            : (user.planName ? user.planName.split(" (")[0] : (language === "bn" ? "শিক্ষার্থী" : "Student Portal"))}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </Link>

                  {/* Admin shortcut if user is admin */}
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setDrawerOpen(false)}
                      className="flex items-center justify-between p-2.5 px-3 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 font-bold text-xs hover:bg-purple-100/50 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-purple-500" />
                        <span>{language === "bn" ? "অ্যাডমিন প্যানেল" : "Admin Panel"}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    setShowAuthModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 cursor-pointer active:scale-98 transition-all"
                >
                  <User className="w-4 h-4" />
                  <span>{language === "bn" ? "লগইন / সাইন আপ" : "Sign In to NoteLagbe"}</span>
                </button>
              )}

              {/* Bottom Utility Row: Language & Theme */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                {/* Language Toggle */}
                <button
                  type="button"
                  onClick={toggleLanguage}
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                >
                  <Globe className="w-4 h-4 text-blue-500" />
                  <span>{language === "bn" ? "English" : "বাংলায় দেখুন"}</span>
                </button>

                {/* Theme Toggle */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                >
                  {isDark ? (
                    <>
                      <Sun className="w-4 h-4 text-amber-400" />
                      <span>{language === "bn" ? "লাইট মোড" : "Light Mode"}</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4 text-indigo-500" />
                      <span>{language === "bn" ? "ডার্ক মোড" : "Dark Mode"}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Logout Option if logged in */}
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{language === "bn" ? "লগআউট করুন" : "Sign Out"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
