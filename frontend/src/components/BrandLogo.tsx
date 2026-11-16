"use client";

import React from "react";
import Link from "next/link";

interface BrandLogoProps {
  variant?: "public" | "admin" | "footer" | "icon-only";
  size?: "sm" | "md" | "lg";
  href?: string;
  showTagline?: boolean;
  className?: string;
}

export function NoteLagbeIcon({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <div
      className={`relative rounded-xl overflow-hidden shadow-md shadow-blue-500/20 flex items-center justify-center select-none shrink-0 group-hover:scale-105 transition-transform duration-200 ${className}`}
    >
      <svg
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          {/* Main Background Gradient: Deep Electric Navy to Vibrant Indigo */}
          <linearGradient id="nl-icon-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1d4ed8" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>

          {/* Accent Ribbon Gradient */}
          <linearGradient id="nl-ribbon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>

          {/* Page Highlight Gradient */}
          <linearGradient id="nl-page-left" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>

          {/* Gold Sparkle / Star of Excellence */}
          <linearGradient id="nl-gold-accent" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>

          {/* Soft Drop Shadow Filter */}
          <filter id="nl-soft-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodColor="#0f172a" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Squircle App Container */}
        <rect width="44" height="44" rx="11" fill="url(#nl-icon-bg)" />

        {/* Subtle Diagonal Gloss */}
        <path d="M0 0 L24 0 L0 24 Z" fill="white" fillOpacity="0.14" />

        {/* Open Book Spread with Shadow */}
        <g filter="url(#nl-soft-shadow)">
          {/* Left Page */}
          <path
            d="M9.5 13C9.5 11.9 10.4 11 11.5 11H20.5C21.3 11 22 11.7 22 12.5V30.5C22 31.3 21.3 32 20.5 32H11.5C10.4 32 9.5 31.1 9.5 30V13Z"
            fill="url(#nl-page-left)"
          />
          {/* Right Page */}
          <path
            d="M34.5 13C34.5 11.9 33.6 11 32.5 11H23.5C22.7 11 22 11.7 22 12.5V30.5C22 31.3 22.7 32 23.5 32H32.5C33.6 32 34.5 31.1 34.5 30V13Z"
            fill="#ffffff"
          />

          {/* Center Spine Divider */}
          <line x1="22" y1="11" x2="22" y2="32" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" />

          {/* Left Page Note Lines */}
          <line x1="12.5" y1="16" x2="19" y2="16" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="12.5" y1="20" x2="19" y2="20" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="12.5" y1="24" x2="17" y2="24" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" />

          {/* Right Page Note Lines (Blue Accent Highlight) */}
          <line x1="25" y1="16" x2="31.5" y2="16" stroke="#3b82f6" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="25" y1="20" x2="31.5" y2="20" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="25" y1="24" x2="29.5" y2="24" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" />

          {/* Hanging Bookmark Ribbon */}
          <path d="M20.5 11V22.5L22 21L23.5 22.5V11H20.5Z" fill="url(#nl-ribbon-grad)" />

          {/* Star of Excellence */}
          <path
            d="M31.5 7.5L32.2 9.2L34 10L32.2 10.8L31.5 12.5L30.8 10.8L29 10L30.8 9.2L31.5 7.5Z"
            fill="url(#nl-gold-accent)"
          />
        </g>
      </svg>
    </div>
  );
}

export const CampusNoteIcon = NoteLagbeIcon;

export default function BrandLogo({
  variant = "public",
  size = "md",
  href,
  showTagline = true,
  className = "",
}: BrandLogoProps) {
  const targetHref = href ?? (variant === "admin" ? "/admin" : "/");

  const iconSizes = {
    sm: "w-7 h-7 sm:w-8 sm:h-8",
    md: "w-8 h-8 sm:w-9 sm:h-9",
    lg: "w-11 h-11",
  };

  const textSizes = {
    sm: "text-sm sm:text-base",
    md: "text-base sm:text-lg",
    lg: "text-2xl",
  };

  const badgeConfig = {
    public: {
      label: "SEU",
      tooltip: "Southeast University",
      classes:
        "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 dark:border-blue-500/30",
    },
    admin: {
      label: "HQ",
      tooltip: "Admin Console & Operations",
      classes:
        "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 dark:border-indigo-500/30",
    },
    footer: {
      label: "SEU",
      tooltip: "Southeast University",
      classes:
        "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 dark:border-blue-500/30",
    },
    "icon-only": {
      label: "",
      tooltip: "",
      classes: "",
    },
  };

  const currentBadge = badgeConfig[variant];

  const content = (
    <div className={`inline-flex items-center gap-2 group select-none shrink-0 ${className}`}>
      <NoteLagbeIcon className={iconSizes[size]} />

      {variant !== "icon-only" && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-tight text-slate-900 dark:text-white ${textSizes[size]}`}>
              Note<span className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">Lagbe</span>
            </span>
            {currentBadge.label && (
              <span
                className={`hidden sm:inline-flex text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${currentBadge.classes}`}
                title={currentBadge.tooltip}
              >
                {currentBadge.label}
              </span>
            )}
          </div>

          {showTagline && (
            <span className="text-[10px] hidden xl:block text-slate-500 dark:text-slate-400 font-medium mt-0.5 tracking-normal whitespace-nowrap">
              {variant === "admin"
                ? "Academic Management Console"
                : "Southeast University Archive"}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (targetHref) {
    return (
      <Link href={targetHref} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl">
        {content}
      </Link>
    );
  }

  return content;
}
