"use client";

import React, { useState } from "react";

export type FacultyGender = "male" | "female";

/**
 * Intelligent gender detection for Bangladeshi & international faculty members
 * based on honorifics, prefixes, and common given/family names.
 */
export function detectFacultyGender(name?: string, designation?: string): FacultyGender {
  if (!name) return "male";

  const lower = name.toLowerCase().trim();
  const words = lower.split(/[\s.,_()\[\]-]+/).filter(Boolean);

  // 1. Explicit Female Honorifics & Prefixes
  const femaleHonorifics = [
    "ms",
    "mrs",
    "miss",
    "mst",
    "begum",
    "khatun",
    "akter",
    "aktar",
    "sultana",
    "binte",
    "lady",
    "madam",
  ];
  if (words.some((w) => femaleHonorifics.includes(w))) {
    return "female";
  }

  // 2. Explicit Male Honorifics & Prefixes
  const maleHonorifics = [
    "mr",
    "md",
    "mohammad",
    "muhammad",
    "mohammed",
    "shaikh",
    "sheikh",
    "engr",
  ];
  const hasMaleHonorific = words.some((w) => maleHonorifics.includes(w));

  // 3. Known Bangladeshi & Muslim/Hindu Female Names
  const femaleNames = new Set([
    "shaheena", "shahina", "fatema", "fathima", "fatima", "sadia", "nusrat", "tasnim", "tasmia", "tahsin",
    "jeba", "umme", "farhana", "jannat", "jannatul", "sweety", "rabeya", "sabrina", "nadia", "afsana",
    "sharmin", "afrin", "fahmida", "samia", "samira", "rina", "kanta", "nipa", "debnath",
    "tazin", "akhanda", "meem", "fairuz", "fariha", "iffat", "iffath", "moumita", "anika", "nafisa",
    "youkee", "tumpa", "shanta", "shikha", "mousumi", "rupa", "sumaiya", "ananya", "tania", "moriom",
    "mariam", "dilruba", "shirin", "monira", "laboni", "shila", "jesmin", "asma", "munmun", "nargis",
    "roksana", "salma", "papiya", "poly", "shoma", "bipasha", "naznin", "shafia", "anindita", "mou",
    "choyti", "mitu", "shobha", "priya", "priyanka", "mitra", "tithi", "bushra", "lubna", "farzana",
    "mahjabin", "jesiara", "jonaki", "afroj", "rajia", "sharmin", "rumana", "kaniz", "tahmina", "sharifa",
    "kamrun", "nahar", "parvin", "shabnam", "shahnaz", "shirley", "eva", "shabana", "munira", "rezia",
    "oriana", "lea", "tasnia", "subah", "noshin", "muntaha", "snigdha", "somiya", "namirah", "kheya", "sarna",
    "prome", "oishee", "maliha", "nawrin", "tabassum", "diyan", "mohona", "tarmin", "shimu", "raisa", "reza",
    "zaha", "shanjida", "debosre", "dristy", "swapna"
  ]);

  if (words.some((w) => femaleNames.has(w))) {
    return "female";
  }

  if (hasMaleHonorific) {
    return "male";
  }

  // Default to male for academic portal consistency
  return "male";
}

interface FacultyAvatarProps {
  image?: string | null;
  name: string;
  initial?: string | null;
  designation?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showInitialBadge?: boolean;
}

export default function FacultyAvatar({
  image,
  name,
  designation,
  size = "md",
  className = "",
}: FacultyAvatarProps) {
  const [imageError, setImageError] = useState(false);

  const gender = detectFacultyGender(name, designation);
  const isFemale = gender === "female";

  // Check if image URL is a valid, publicly loadable asset (HTTP/HTTPS, relative upload, or data URI)
  const isValidUrl =
    Boolean(image) &&
    !imageError &&
    (image!.startsWith("http://") ||
      image!.startsWith("https://") ||
      image!.startsWith("/uploads/") ||
      image!.startsWith("data:image/")) &&
    !image!.includes("avatar_blue") &&
    !image!.includes("flaticon.com"); // Flaticon placeholder hotlinks often 403

  // Dimension presets
  const sizeClasses = {
    sm: "w-10 h-10 rounded-xl",
    md: "w-14 h-14 rounded-2xl",
    lg: "w-20 h-20 rounded-2xl",
    xl: "w-28 h-28 rounded-3xl",
  }[size];

  // Southeast University 3D Glossy Crystal Avatars
  const isFallback = !isValidUrl;
  const fallbackSrc = isFemale
    ? "/avatars/female_seu.png"
    : "/avatars/male_seu.png";

  return (
    <div
      className={`relative shrink-0 overflow-hidden bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-center ${sizeClasses} ${className}`}
    >
      <img
        src={isFallback ? fallbackSrc : image!}
        alt={name}
        className={`w-full h-full transition-transform duration-300 group-hover:scale-105 ${
          isFallback ? "object-contain p-1" : "object-cover object-[center_15%]"
        }`}
        onError={() => setImageError(true)}
        loading="lazy"
      />
    </div>
  );
}
