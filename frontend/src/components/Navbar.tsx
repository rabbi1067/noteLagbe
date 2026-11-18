"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { 
  BookOpen, 
  Search, 
  Moon, 
  Sun, 
  User, 
  ShieldCheck, 
  Upload, 
  Sparkles, 
  LogOut, 
  Menu, 
  X,
  FileQuestion,
  GraduationCap,
  LogIn
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import BrandLogo from "@/components/BrandLogo";

export default function Navbar() {
  const pathname = usePathname() || "";
  const { user, isAuthenticated, isAdmin, logout, setShowAuthModal } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const { theme, toggleTheme, isDark } = useTheme();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  if (pathname.startsWith("/admin")) {
    return null;
  }

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  const getDesktopNavLinkClass = (path: string) => {
    const active = isActive(path);
    return `px-1.5 xl:px-2.5 py-1.5 rounded-xl text-[11px] xl:text-xs transition-all whitespace-nowrap shrink-0 ${
      active
        ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-black border border-blue-200/70 dark:border-blue-800/70 shadow-sm"
        : "text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-blue-600 dark:hover:text-blue-400 border border-transparent"
    }`;
  };

  const getMobileNavLinkClass = (path: string) => {
    const active = isActive(path);
    return `block px-3.5 py-2.5 rounded-xl text-sm transition-all ${
      active
        ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-black border border-blue-200/60 dark:border-blue-800/60"
        : "text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800/60"
    }`;
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0b1120]/95 backdrop-blur-md transition-colors print:hidden">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-5 lg:px-4 xl:px-8">
        <div className="flex items-center justify-between h-16 gap-1 sm:gap-2 lg:gap-3 xl:gap-4 min-w-0">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <BrandLogo variant="public" size="md" />
          </div>

          {/* Desktop & Tablet Landscape Nav Links */}
          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 2xl:gap-1.5 shrink-0 ml-auto mr-1.5 xl:mr-3">
            <Link href="/courses" className={getDesktopNavLinkClass("/courses")}>
              <span>{t("nav.courses", "Courses & Notes")}</span>
            </Link>
            <Link href="/curriculum" className={getDesktopNavLinkClass("/curriculum")}>
              {t("nav.curriculum", "Curriculum")}
            </Link>
            <Link href="/teachers" className={getDesktopNavLinkClass("/teachers")}>
              <span>{t("nav.faculty", "Faculty Directory")}</span>
            </Link>
            <Link href="/tools" className={getDesktopNavLinkClass("/tools")}>
              <span>{t("nav.tools", "Student Tools")}</span>
            </Link>
            <Link href="/pricing" className={getDesktopNavLinkClass("/pricing")}>
              <span>{t("nav.pricing", "Plans & Pricing")}</span>
            </Link>
            <Link 
              href="/contribute" 
              className={`relative px-2 xl:px-2.5 py-1.5 rounded-xl border transition-all font-bold text-[11px] xl:text-xs flex items-center gap-1 xl:gap-1.5 whitespace-nowrap shrink-0 ${
                isActive("/contribute")
                  ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-400 shadow-sm"
                  : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border-emerald-200 dark:border-emerald-800/60"
              }`}
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span>{t("nav.contribute", "Contribute")}</span>
              <span className="hidden xl:inline-block text-[9px] bg-emerald-600 text-white font-extrabold px-1.5 py-0.5 rounded-full shrink-0 leading-none">
                {t("nav.contributeFree", "+2 Free")}
              </span>
            </Link>
          </nav>

          {/* Right Action Icons & Auth */}
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
            
            {/* In-App Notifications Bell (Campus Announcements & Personal Alerts) */}
            <div className="shrink-0">
              <NotificationBell />
            </div>

            {/* Language Switcher Pill (Compact single-token on mobile, full pill on md+) */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 md:px-2.5 py-1 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-[10px] sm:text-xs font-bold transition-all hover:border-blue-500 shadow-sm shrink-0 cursor-pointer active:scale-95"
              title={language === "en" ? "বাংলায় দেখুন" : "Switch to English"}
            >
              {/* On mobile (< md): show active language token */}
              <span className="md:hidden text-blue-600 dark:text-blue-400 font-black">
                {language === "bn" ? "বাং" : "EN"}
              </span>
              {/* On md+: show dual switch EN | বাং */}
              <span className={`hidden md:inline ${language === "en" ? "text-blue-600 dark:text-blue-400 font-black" : "text-slate-400 font-semibold"}`}>
                EN
              </span>
              <span className="hidden md:inline text-slate-300 dark:text-slate-600 text-[10px] font-light">|</span>
              <span className={`hidden md:inline ${language === "bn" ? "text-blue-600 dark:text-blue-400 font-black" : "text-slate-400 font-semibold"}`}>
                বাং
              </span>
            </button>

            {/* Day / Night Theme Toggle Button (Compact, non-colliding icon button) */}
            <button
              onClick={toggleTheme}
              className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 flex items-center justify-center shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-amber-400/60 dark:hover:border-indigo-400/60 shadow-sm cursor-pointer active:scale-90 transition-all"
              title={isDark ? "Switch to Day Mode (Light)" : "Switch to Night Mode (Dark)"}
              aria-label="Toggle Day / Night Mode"
            >
              {isDark ? (
                <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0 hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 dark:text-indigo-400 shrink-0 hover:-rotate-12 transition-transform" />
              )}
            </button>

            {/* User Profile or Sign In Button */}
            <div className="flex items-center justify-end shrink-0">
              {isAuthenticated && user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-1.5 lg:gap-2 p-1 sm:p-1 xl:px-2.5 xl:py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm cursor-pointer shrink-0"
                    title={user.name}
                    aria-label="User Account Menu"
                  >
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold uppercase shadow-sm overflow-hidden shrink-0">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        user.name.charAt(0)
                      )}
                    </div>
                    {/* User Name & Role Pill - Hidden on mobile, tablet & laptop, visible on wide desktop (xl+) */}
                    <div className="hidden xl:flex flex-col text-left min-w-0 pr-0.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[130px]">
                        {user.name}
                      </span>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium truncate max-w-[130px]">
                        {isAdmin 
                          ? (language === "bn" ? "অ্যাডমিন" : "Admin / Staff") 
                          : (user.planName ? user.planName.split(" (")[0] : (language === "bn" ? "শিক্ষার্থী" : "Student"))}
                      </span>
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {userDropdownOpen && (
                    <div 
                      className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150"
                      onClick={() => setUserDropdownOpen(false)}
                    >
                      <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                        <p className="font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                      </div>

                      {isAdmin ? (
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 px-4 py-2.5 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 font-bold"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          {t("nav.adminPanel", "Admin Control Center")}
                        </Link>
                      ) : (
                        <>
                          <Link
                            href="/dashboard"
                            className="flex items-center gap-2 px-4 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                          >
                            <GraduationCap className="w-4 h-4" />
                            {t("nav.dashboard", "Student Dashboard")}
                          </Link>
                          <Link
                            href="/dashboard?tab=profile"
                            className="flex items-center gap-2 px-4 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                          >
                            <User className="w-4 h-4 text-blue-500" />
                            <span>{language === "bn" ? "প্রোফাইল ও পাসওয়ার্ড" : "Student Profile & Settings"}</span>
                          </Link>
                        </>
                      )}

                      <Link
                        href="/pricing"
                        className="flex items-center gap-2 px-4 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
                      >
                        <Sparkles className="w-4 h-4" />
                        {t("nav.subscription", "Subscription & Plans")}
                      </Link>

                      <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                        }}
                        className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold"
                      >
                        <LogOut className="w-4 h-4" />
                        {t("nav.signOut", "Sign Out")}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="py-1.5 px-3 sm:py-2 sm:px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-500/20 whitespace-nowrap cursor-pointer"
                >
                  {t("nav.signIn", "Sign In")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
    {/* 64px Spacer to preserve exact page flow below fixed header */}
    <div className="h-16 w-full shrink-0 print:hidden" aria-hidden="true" />
  </>
);
}
