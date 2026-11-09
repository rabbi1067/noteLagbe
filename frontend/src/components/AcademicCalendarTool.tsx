"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Calendar as CalendarIcon, 
  Download, 
  RefreshCw, 
  Search, 
  X,
  FileText, 
  Image as ImageIcon, 
  Check, 
  ExternalLink, 
  Sparkles, 
  Clock, 
  Layers, 
  GraduationCap, 
  ShieldCheck, 
  Coffee,
  BookOpen,
  CalendarDays
} from "lucide-react";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { useLanguage } from "@/context/LanguageContext";
import academicCalendarsData from "@/data/academic_calendars.json";

interface CalendarItem {
  date: string;
  description: string;
  category: "exam" | "class" | "holiday" | "admin" | "result" | "semester_break" | "orientation" | "add_drop" | "pre_registration" | "installment" | "general";
  isHighlight: boolean;
}

interface SemesterData {
  semester: string;
  items: CalendarItem[];
}

// Convert English numbers to Bengali numerals
const toBnDigits = (str: string | number): string => {
  const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return String(str).replace(/[0-9]/g, (d) => bnDigits[Number(d)]);
};

// Translate English date string to Bengali if needed
const translateDate = (dateStr: string, lang: "en" | "bn"): string => {
  if (lang === "en" || !dateStr) return dateStr;

  const months: Record<string, string> = {
    Jan: "জানুয়ারি",
    January: "জানুয়ারি",
    Feb: "ফেব্রুয়ারি",
    February: "ফেব্রুয়ারি",
    Mar: "মার্চ",
    March: "মার্চ",
    Apr: "এপ্রিল",
    April: "এপ্রিল",
    May: "মে",
    June: "জুন",
    Jun: "জুন",
    July: "জুলাই",
    Jul: "জুলাই",
    Aug: "আগস্ট",
    August: "আগস্ট",
    Sept: "সেপ্টেম্বর",
    Sep: "সেপ্টেম্বর",
    September: "সেপ্টেম্বর",
    Oct: "অক্টোবর",
    October: "অক্টোবর",
    Nov: "নভেম্বর",
    November: "নভেম্বর",
    Dec: "ডিসেম্বর",
    December: "ডিসেম্বর",
  };

  let translated = dateStr;
  for (const [enM, bnM] of Object.entries(months)) {
    const regex = new RegExp(`\\b${enM}\\b`, "gi");
    translated = translated.replace(regex, bnM);
  }

  return toBnDigits(translated);
};

// Clean and sanitize event text from raw or escaped HTML tags and fix typos
const sanitizeDescription = (text: string): string => {
  if (!text) return "";
  let clean = String(text);

  // Fix character anomalies, quotes, and typography
  clean = clean
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");

  // Fix "W"ith / "W"ithdrawal corruption
  clean = clean.replace(/["']?W["']?ithdrawal/gi, "Withdrawal");
  clean = clean.replace(/["']?W["']?ith/gi, "with");

  // Fix "W" Grade and quotes around W
  clean = clean.replace(/["']{2,}W["']{2,}/g, '"W"');
  clean = clean.replace(/\bwith\s+["']*\s*W\s*["']*\s*(?:Grade\s+)?without\b/gi, 'with "W" Grade without');
  clean = clean.replace(/\bwith\s+["']*\s*W\s*["']*\s*Grade\b/gi, 'with "W" Grade');

  // Fix Payment with Late Fine Tk. 500
  clean = clean.replace(/\bPayment\s+["']?with["']?\s+Late\s+Fine\s+TK\.\s*500\s+for\s+Registration\b/gi, "Payment with Late Fine Tk. 500 for Registration");
  clean = clean.replace(/\bPayment\s+with\s+late\s+fine\s+Tk\.\s*500\s+for\s+registration\b/gi, "Payment with Late Fine Tk. 500 for Registration");
  clean = clean.replace(/\bTK\.\s*500\b/g, "Tk. 500");
  clean = clean.replace(/\bLate Fine 500 and 50 Per Day\b/gi, "Late Fine Tk. 500 + Tk. 50 per day");

  // Fix merged concatenated installment sentences
  clean = clean.replace(/Last date for Course ADD\s*\/\s*DROP\s+Last date for payment of 1st installment\s*\(?40%\)?\s*without late fee/gi, "Last date for Course Add/Drop & Payment of 1st Installment (40%) without late fee");

  // Fix known SEU website typos and capitalization
  clean = clean.replace("National Revaluation & Solidarity Day", "National Revolution & Solidarity Day");
  clean = clean.replace("Classes begins", "Classes begin");
  clean = clean.replace("Orientation of newly students", "Orientation of newly admitted students");
  clean = clean.replace("Holiday (Budha Purnima)", "Holiday (Buddha Purnima)*");
  clean = clean.replace("Holiday(Buddha Purnima)*", "Holiday (Buddha Purnima)*");
  clean = clean.replace("Holiday(Ashura)", "Holiday (Ashura)*");
  clean = clean.replace("Holiday(Shaeed Dibosh)", "Holiday (Shaheed Dibash)");
  clean = clean.replace("Holiday (Sharaswati Puja)", "Holiday (Saraswati Puja)");
  clean = clean.replace("Holiday (Sharwarshiti Puja)", "Holiday (Saraswati Puja)");

  if (/^Announcement of Exam\b/i.test(clean)) {
    clean = "Announcement of Exam Results";
  }

  // Unescape HTML entities pass 1
  clean = clean
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");

  // Strip all HTML tags
  clean = clean.replace(/<[^>]+>/g, " ");

  // Unescape pass 2 in case doubly escaped
  clean = clean
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");

  clean = clean.replace(/<[^>]+>/g, " ");

  return clean.replace(/\s+/g, " ").trim();
};

// Translate event descriptions into natural Bengali
const translateDescription = (desc: string, lang: "en" | "bn"): string => {
  const sanitized = sanitizeDescription(desc);
  if (!sanitized) return "";
  if (lang === "en") return sanitized;

  const phraseMap: Array<[RegExp, string]> = [
    [/Payment with Late Fine Tk\. 500 for Registration/gi, "রেজিস্ট্রেশনের জন্য লেট ফি ৫০০ টাকাসহ ফি প্রদান"],
    [/Student Attendance Disabling with Late Fine Tk\. 500 \+ Tk\. 50 per day/gi, "লেট ফি ৫০০ টাকা + দৈনিক ৫০ টাকাসহ শিক্ষার্থী উপস্থিতি ডিজ্যাবিলিং"],
    [/Last date of Semester Withdrawal with 50% adjustment/gi, "সেমিস্টার প্রত্যাহার (৫০% সমন্বয়)-এর শেষ তারিখ"],
    [/Last date of withdrawal from the [Ss]emester with full adjustment/gi, "সেমিস্টার প্রত্যাহার (১০০% সমন্বয়)-এর শেষ তারিখ"],
    [/Last date of withdrawal from the [Ss]emester with 50% adjustment/gi, "সেমিস্টার প্রত্যাহার (৫০% সমন্বয়)-এর শেষ তারিখ"],
    [/Last date for Course Add\/Drop & Payment of 1st [Ii]nstallment \(40%\) without late fee/gi, "কোর্স Add/Drop ও ১ম কিস্তি (৪০%) পরিশোধের শেষ তারিখ (লেট ফি ছাড়া)"],
    [/Pre-registration for Spring (\d{4}) \(From Fall \d{4}\)/gi, "স্প্রিং $1-এর জন্য প্রি-রেজিস্ট্রেশন (ফল সেশন থেকে)"],
    [/Pre-registration for Spring (\d{4})/gi, "স্প্রিং $1-এর জন্য প্রি-রেজিস্ট্রেশন"],
    [/Pre-registration for Summer (\d{4}) \(From Spring \d{4}\)/gi, "সামার $1-এর জন্য প্রি-রেজিস্ট্রেশন (স্প্রিং সেশন থেকে)"],
    [/Pre-registration for Summer (\d{4})/gi, "সামার $1-এর জন্য প্রি-রেজিস্ট্রেশন"],
    [/Pre-registration for Fall (\d{4}) \(From Summer \d{4}\)/gi, "ফল $1-এর জন্য প্রি-রেজিস্ট্রেশন (সামার সেশন থেকে)"],
    [/Pre-registration for Fall (\d{4})/gi, "ফল $1-এর জন্য প্রি-রেজিস্ট্রেশন"],
    [/Registration begins for Spring (\d{4})/gi, "স্প্রিং $1-এর রেজিস্ট্রেশন শুরু"],
    [/Registration begins for Summer (\d{4})/gi, "সামার $1-এর রেজিস্ট্রেশন শুরু"],
    [/Registration begins for Fall (\d{4})/gi, "ফল $1-এর রেজিস্ট্রেশন শুরু"],
    [/Registration ends/gi, "রেজিস্ট্রেশন শেষ"],
    [/Classes begin of Spring (\d{4})/gi, "স্প্রিং $1-এর ক্লাস শুরু"],
    [/Classes begin/gi, "ক্লাস শুরু"],
    [/Orientation of newly admitted students/gi, "নবীন শিক্ষার্থীদের ওরিয়েন্টেশন"],
    [/Last date for Course ADD\s*\/\s*DROP/gi, "কোর্স ADD / DROP-এর শেষ তারিখ"],
    [/Last date for payment of 1st installment \(40%\) without late fee/gi, "১ম কিস্তি (৪০%) পরিশোধের শেষ তারিখ (লেট ফি ছাড়া)"],
    [/Last date for payment of 1st installment \(40%\) with late fee/gi, "১ম কিস্তি (৪০%) পরিশোধের শেষ তারিখ (লেট ফিসহ)"],
    [/Last date for payment of 1st installment \(40%\)/gi, "১ম কিস্তি (৪০%) পরিশোধের শেষ তারিখ"],
    [/Last date for payment of 2nd installment \(30%\)/gi, "২য় কিস্তি (৩০%) পরিশোধের শেষ তারিখ"],
    [/Last date for payment of final installment \(30%\)/gi, "চূড়ান্ত কিস্তি (৩০%) পরিশোধের শেষ তারিখ"],
    [/Last day of Semester drop with full adjustment/gi, "সেমিস্টার ড্রপ (১০০% সমন্বয়) শেষ দিন"],
    [/Last day of Semester drop with 50% adjustment/gi, "সেমিস্টার ড্রপ (৫০% সমন্বয়) শেষ দিন"],
    [/Last date of Self-Issuance of Admit Card for Midterm Examination/gi, "মিডটার্ম পরীক্ষার এডমিট কার্ড সংগ্রহের শেষ তারিখ"],
    [/Last date of Self-issuance of Admit card for Final Examination/gi, "ফাইনাল পরীক্ষার এডমিট কার্ড সংগ্রহের শেষ তারিখ"],
    [/Admit card distribution for Midterm examination/gi, "মিডটার্ম পরীক্ষার এডমিট কার্ড বিতরণ"],
    [/Admit card distribution for Final exam/gi, "ফাইনাল পরীক্ষার এডমিট কার্ড বিতরণ"],
    [/Midterm Examination \(8 Days\)/gi, "মিডটার্ম পরীক্ষা (৮ দিন)"],
    [/Midterm Examination/gi, "মিডটার্ম পরীক্ষা"],
    [/Final Examination \(8 Days\)/gi, "ফাইনাল পরীক্ষা (৮ দিন)"],
    [/Final Examination/gi, "ফাইনাল পরীক্ষা"],
    [/Teaching Evaluation/gi, "টিচিং ইভালুয়েশন (মূল্যায়ন)"],
    [/Last Date of Classes \(UG-Regular\)/gi, "ক্লাসের শেষ তারিখ (ইউজি-রেগুলার)"],
    [/Last Date of Classes \(UG-Diploma & Master'?s\)/gi, "ক্লাসের শেষ তারিখ (ডিপ্লোমা ও মাস্টার্স)"],
    [/Last date of classes/gi, "ক্লাসের শেষ তারিখ"],
    [/Last date of Grade Submission/gi, "গ্রেড সাবমিশনের শেষ তারিখ"],
    [/Announcement of Exam Results?/gi, "পরীক্ষার ফলাফল প্রকাশ"],
    [/Academic Council Meeting/gi, "একাডেমিক কাউন্সিল মিটিং"],
    [/Course offering for Spring (\d{4}) uploaded/gi, "স্প্রিং $1-এর কোর্স অফারিং আপলোড"],
    [/Course offering for Summer (\d{4}) uploaded/gi, "সামার $1-এর কোর্স অফারিং আপলোড"],
    [/Course offering for Fall (\d{4}) uploaded/gi, "ফল $1-এর কোর্স অফারিং আপলোড"],
    [/Last date of [Ww]ithdrawal with ['"“]?W['"”]? Grade without adjustment/gi, '"W" গ্রেডসহ প্রত্যাহারের শেষ তারিখ (সমন্বয় ছাড়া)'],
    [/Last date of [Ww]ithdrawal with ['"“]?W['"”]? without adjustment/gi, '"W" গ্রেডসহ প্রত্যাহারের শেষ তারিখ (সমন্বয় ছাড়া)'],
    [/Last date of [Ww]ithdrawal with ['"“]?W['"”]? Grade recorded in the Academic Transcript without adjustment/gi, 'ট্রান্সক্রিপ্টে "W" গ্রেডসহ প্রত্যাহারের শেষ তারিখ'],
    [/Holiday \(National Re?volution & Solidarity Day\)/gi, "ছুটি (জাতীয় বিপ্লব ও সংহতি দিবস)"],
    [/Holiday \(Victory Day\)/gi, "ছুটি (বিজয় দিবস)"],
    [/Holiday \(Christmas Day\)/gi, "ছুটি (বড়দিন)"],
    [/Holiday \(Sharaswati Puja\)\s*\*?/gi, "ছুটি (সরস্বতী পূজা) *"],
    [/Holiday \(Shab-e-Barat\)\s*\*?/gi, "ছুটি (শবে বরাত) *"],
    [/Holiday \(Shaheed Dibash & International Mother Language Day\)/gi, "ছুটি (শহীদ দিবস ও আন্তর্জাতিক মাতৃভাষা দিবস)"],
    [/Holiday \(Independence Day\)/gi, "ছুটি (স্বাধীনতা দিবস)"],
    [/Holiday \(Bangla Nababarsho\)/gi, "ছুটি (বাংলা নববর্ষ)"],
    [/Holiday \(May Day\)/gi, "ছুটি (মে দিবস)"],
    [/Holiday \(Buddha Purnima\)\s*\*?/gi, "ছুটি (বুদ্ধ পূর্ণিমা) *"],
    [/Holiday \(Ashura\)\s*\*?/gi, "ছুটি (আশুরা) *"],
    [/Holiday \(Janmashtami\)\s*\*?/gi, "ছুটি (জন্মাষ্টমী) *"],
    [/Holiday \(National Mourning Day\)/gi, "ছুটি (জাতীয় শোক দিবস)"],
    [/Holiday \(Eid-e-Miladun-Nabi\)\s*\*?/gi, "ছুটি (ঈদে মিলাদুন্নবী) *"],
    [/Holiday \(Durga Puja\)\s*\*?/gi, "ছুটি (দূর্গাপূজা) *"],
    [/Holiday \(Eid-Ul-Fitr\)\s*\*?/gi, "ছুটি (ঈদুল ফিতর) *"],
    [/Holiday \(Eid-Ul-Azha\)\s*\*?/gi, "ছুটি (ঈদুল আযহা) *"],
    [/Holiday \(Jumatul Wida, Shab-e-Qadr & Eid-ul-Fitr\)\s*\*?/gi, "ছুটি (জুমাতুল বিদা, শবে কদর ও ঈদুল ফিতর) *"],
    [/Semester Break \((\d+) Days\)/gi, "সেমিস্টার বিরতি ($1 দিন)"],
    [/Pre-registration for Spring (\d{4}) \(From Fall \d{4}\)/gi, "স্প্রিং $1-এর জন্য প্রি-রেজিস্ট্রেশন (ফল সেশন থেকে)"],
    [/Pre-registration for Spring (\d{4})/gi, "স্প্রিং $1-এর জন্য প্রি-রেজিস্ট্রেশন"],
    [/Pre-registration for Summer (\d{4}) \(From Spring \d{4}\)/gi, "সামার $1-এর জন্য প্রি-রেজিস্ট্রেশন (স্প্রিং সেশন থেকে)"],
    [/Pre-registration for Summer (\d{4})/gi, "সামার $1-এর জন্য প্রি-রেজিস্ট্রেশন"],
    [/Pre-registration for Fall (\d{4}) \(From Summer \d{4}\)/gi, "ফল $1-এর জন্য প্রি-রেজিস্ট্রেশন (সামার সেশন থেকে)"],
    [/Pre-registration for Fall (\d{4})/gi, "ফল $1-এর জন্য প্রি-রেজিস্ট্রেশন"],
    [/Registration begins for Spring (\d{4})/gi, "স্প্রিং $1-এর রেজিস্ট্রেশন শুরু"],
    [/Registration begins for Summer (\d{4})/gi, "সামার $1-এর রেজিস্ট্রেশন শুরু"],
    [/Registration begins for Fall (\d{4})/gi, "ফল $1-এর রেজিস্ট্রেশন শুরু"],
    [/Registration ends/gi, "রেজিস্ট্রেশন শেষ"],
    [/Classes begin of Spring (\d{4})/gi, "স্প্রিং $1-এর ক্লাস শুরু"],
    [/Classes begin/gi, "ক্লাস শুরু"],
    [/Orientation of newly admitted students/gi, "নবীন শিক্ষার্থীদের ওরিয়েন্টেশন"],
    [/Last date for Course ADD\s*\/\s*DROP/gi, "কোর্স ADD / DROP-এর শেষ তারিখ"],
    [/Last date for payment of 1st installment \(40%\) without late fee/gi, "১ম কিস্তি (৪০%) পরিশোধের শেষ তারিখ (লেট ফি ছাড়া)"],
    [/Last date for payment of 1st installment \(40%\) with late fee/gi, "১ম কিস্তি (৪০%) পরিশোধের শেষ তারিখ (লেট ফিসহ)"],
    [/Last date for payment of 1st installment \(40%\)/gi, "১ম কিস্তি (৪০%) পরিশোধের শেষ তারিখ"],
    [/Last date for payment of 2nd installment \(30%\)/gi, "২য় কিস্তি (৩০%) পরিশোধের শেষ তারিখ"],
    [/Last date for payment of final installment \(30%\)/gi, "চূড়ান্ত কিস্তি (৩০%) পরিশোধের শেষ তারিখ"],
    [/Last day of Semester drop with full adjustment/gi, "সেমিস্টার ড্রপ (১০০% সমন্বয়) শেষ দিন"],
    [/Last day of Semester drop with 50% adjustment/gi, "সেমিস্টার ড্রপ (৫০% সমন্বয়) শেষ দিন"],
    [/Last date of Self-Issuance of Admit Card for Midterm Examination/gi, "মিডটার্ম পরীক্ষার এডমিট কার্ড সংগ্রহের শেষ তারিখ"],
    [/Last date of Self-issuance of Admit card for Final Examination/gi, "ফাইনাল পরীক্ষার এডমিট কার্ড সংগ্রহের শেষ তারিখ"],
    [/Admit card distribution for Midterm examination/gi, "মিডটার্ম পরীক্ষার এডমিট কার্ড বিতরণ"],
    [/Admit card distribution for Final exam/gi, "ফাইনাল পরীক্ষার এডমিট কার্ড বিতরণ"],
    [/Midterm Examination \(8 Days\)/gi, "মিডটার্ম পরীক্ষা (৮ দিন)"],
    [/Midterm Examination/gi, "মিডটার্ম পরীক্ষা"],
    [/Final Examination \(8 Days\)/gi, "ফাইনাল পরীক্ষা (৮ দিন)"],
    [/Final Examination/gi, "ফাইনাল পরীক্ষা"],
    [/Teaching Evaluation/gi, "টিচিং ইভালুয়েশন (মূল্যায়ন)"],
    [/Last Date of Classes \(UG-Regular\)/gi, "ক্লাসের শেষ তারিখ (ইউজি-রেগুলার)"],
    [/Last Date of Classes \(UG-Diploma & Master'?s\)/gi, "ক্লাসের শেষ তারিখ (ডিপ্লোমা ও মাস্টার্স)"],
    [/Last date of classes/gi, "ক্লাসের শেষ তারিখ"],
    [/Last date of Grade Submission/gi, "গ্রেড সাবমিশনের শেষ তারিখ"],
    [/Announcement of Exam Results?/gi, "পরীক্ষার ফলাফল প্রকাশ"],
    [/Academic Council Meeting/gi, "একাডেমিক কাউন্সিল মিটিং"],
    [/Course offering for Spring (\d{4}) uploaded/gi, "স্প্রিং $1-এর কোর্স অফারিং আপলোড"],
    [/Course offering for Summer (\d{4}) uploaded/gi, "সামার $1-এর কোর্স অফারিং আপলোড"],
    [/Course offering for Fall (\d{4}) uploaded/gi, "ফল $1-এর কোর্স অফারিং আপলোড"],
    [/Last date of withdrawal with ['"“]?W['"”]? Grade without adjustment/gi, '"W" গ্রেডসহ প্রত্যাহারের শেষ তারিখ (সমন্বয় ছাড়া)'],
    [/Last date of withdrawal with ['"“]?W['"”]? without adjustment/gi, '"W" গ্রেডসহ প্রত্যাহারের শেষ তারিখ (সমন্বয় ছাড়া)'],
    [/Last date of withdrawal with ['"“]?W['"”]? Grade recorded in the Academic Transcript without adjustment/gi, 'ট্রান্সক্রিপ্টে "W" গ্রেডসহ প্রত্যাহারের শেষ তারিখ'],
    [/Holiday \(National Re?volution & Solidarity Day\)/gi, "ছুটি (জাতীয় বিপ্লব ও সংহতি দিবস)"],
    [/Holiday \(Victory Day\)/gi, "ছুটি (বিজয় দিবস)"],
    [/Holiday \(Christmas Day\)/gi, "ছুটি (বড়দিন)"],
    [/Holiday \(Sharaswati Puja\)\s*\*?/gi, "ছুটি (সরস্বতী পূজা) *"],
    [/Holiday \(Shab-e-Barat\)\s*\*?/gi, "ছুটি (শবে বরাত) *"],
    [/Holiday \(Shaheed Dibash & International Mother Language Day\)/gi, "ছুটি (শহীদ দিবস ও আন্তর্জাতিক মাতৃভাষা দিবস)"],
    [/Holiday \(Independence Day\)/gi, "ছুটি (স্বাধীনতা দিবস)"],
    [/Holiday \(Bangla Nababarsho\)/gi, "ছুটি (বাংলা নববর্ষ)"],
    [/Holiday \(May Day\)/gi, "ছুটি (মে দিবস)"],
    [/Holiday \(Buddha Purnima\)\s*\*?/gi, "ছুটি (বুদ্ধ পূর্ণিমা) *"],
    [/Holiday \(Ashura\)\s*\*?/gi, "ছুটি (আশুরা) *"],
    [/Holiday \(Janmashtami\)\s*\*?/gi, "ছুটি (জন্মাষ্টমী) *"],
    [/Holiday \(National Mourning Day\)/gi, "ছুটি (জাতীয় শোক দিবস)"],
    [/Holiday \(Eid-e-Miladun-Nabi\)\s*\*?/gi, "ছুটি (ঈদে মিলাদুন্নবী) *"],
    [/Holiday \(Durga Puja\)\s*\*?/gi, "ছুটি (দূর্গাপূজা) *"],
    [/Holiday \(Eid-Ul-Fitr\)\s*\*?/gi, "ছুটি (ঈদুল ফিতর) *"],
    [/Holiday \(Eid-Ul-Azha\)\s*\*?/gi, "ছুটি (ঈদুল আযহা) *"],
    [/Holiday \(Jumatul Wida, Shab-e-Qadr & Eid-ul-Fitr\)\s*\*?/gi, "ছুটি (জুমাতুল বিদা, শবে কদর ও ঈদুল ফিতর) *"],
    [/Semester Break \((\d+) Days\)/gi, "সেমিস্টার বিরতি ($1 দিন)"],
    [/Semester Break \((\d+) Day\)/gi, "সেমিস্টার বিরতি ($1 দিন)"],
    [/Semester break/gi, "সেমিস্টার বিরতি"],
    [/Vacation/gi, "ছুটি / ভ্যাকেশন"],
  ];

  let result = sanitized;
  for (const [pattern, bnText] of phraseMap) {
    result = result.replace(pattern, bnText);
  }

  return toBnDigits(result);
};

// Translate Semester Tab Name
const translateSemesterName = (semName: string, lang: "en" | "bn"): string => {
  if (lang === "en" || !semName) return semName;
  let translated = semName
    .replace(/Spring/gi, "স্প্রিং")
    .replace(/Summer/gi, "সামার")
    .replace(/Fall/gi, "ফল");
  return toBnDigits(translated);
};

const getInitialSemesters = (year: string): SemesterData[] => {
  const cals = (academicCalendarsData as any)?.calendars;
  return (cals?.[year] || cals?.["2026"] || []) as SemesterData[];
};

export default function AcademicCalendarTool() {
  const { language } = useLanguage();

  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [availableYears, setAvailableYears] = useState<string[]>(["2026", "2025", "2024", "2023"]);
  const [semesters, setSemesters] = useState<SemesterData[]>(() => getInitialSemesters("2026"));
  const [selectedSemesterTab, setSelectedSemesterTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>("");
  const [dataSource, setDataSource] = useState<string>("Verified SEU Academic Database");

  const fullCalendarRef = useRef<HTMLDivElement>(null);
  const semesterCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Single Semester Dedicated Export Container Ref
  const [singleExportSemester, setSingleExportSemester] = useState<SemesterData | null>(null);
  const singleExportRef = useRef<HTMLDivElement>(null);

  // Fetch calendar data
  const loadCalendar = async (year: string, force: boolean = false) => {
    try {
      if (force) {
        setIsSyncing(true);
        toast.info(
          language === "bn"
            ? "অফিসিয়াল ওয়েবসাইট থেকে ক্যালেন্ডার সিঙ্ক হচ্ছে..."
            : "Syncing calendar from official SEU website..."
        );
      } else {
        // Instant view: synchronously set data from local verified dataset if available
        const localData = (academicCalendarsData as any)?.calendars?.[year];
        if (localData && localData.length > 0) {
          setSemesters(localData as SemesterData[]);
          setIsLoading(false);
        } else {
          setIsLoading(true);
        }
      }

      const res = await fetch(`/api/academic-calendar?year=${year}${force ? "&force=true" : ""}`);
      const data = await res.json();

      if (data.success) {
        setSemesters(data.semesters || []);
        // Restrict strictly to 4 valid years (2026, 2025, 2024, 2023)
        if (data.availableYears && data.availableYears.length > 0) {
          const valid = data.availableYears.filter((y: string) => Number(y) <= 2026 && Number(y) >= 2023);
          setAvailableYears(valid.slice(0, 4));
        }
        setDataSource(data.source || "seu.edu.bd");
        setLastSyncedTime(new Date(data.lastSynced).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));

        if (force) {
          toast.success(
            language === "bn"
              ? `অফিসিয়াল সাইট থেকে ${toBnDigits(year)}-এর ক্যালেন্ডার সফলভাবে সিঙ্ক সম্পন্ন হয়েছে!`
              : `Academic calendar for ${year} synced successfully from seu.edu.bd!`
          );
        }
      } else if (force) {
        toast.error(
          language === "bn"
            ? "ক্যালেন্ডার লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।"
            : "Failed to load academic calendar. Please try again."
        );
      }
    } catch (err) {
      console.error(err);
      if (force) {
        toast.error(
          language === "bn" ? "সার্ভার কানেকশন এরর" : "Server connection error"
        );
      }
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadCalendar(selectedYear);
  }, [selectedYear]);

  // Filter items based on search and category
  const getFilteredItems = (items: CalendarItem[]) => {
    return items.filter((item) => {
      const matchSearch =
        searchQuery === "" ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.date.toLowerCase().includes(searchQuery.toLowerCase());

      const d = item.description.toLowerCase();
      const isResult = item.category === "result" || d.includes("result") || d.includes("grade submission");
      const isExam = !isResult && (item.category === "exam" || (d.includes("examination") && !d.includes("admit")));
      const isOrientation = item.category === "orientation" || d.includes("orientation");
      const isPreReg = item.category === "pre_registration" || d.includes("pre-registration") || d.includes("preregistration");
      const isAddDrop =
        item.category === "add_drop" ||
        d.includes("add/drop") ||
        d.includes("add / drop") ||
        d.includes("add drop") ||
        d.includes("semester drop") ||
        (d.includes("drop") && !d.includes("attendance"));
      const isInstallment =
        item.category === "installment" ||
        d.includes("installment") ||
        d.includes("payment") ||
        d.includes("tuition") ||
        d.includes("late fee") ||
        d.includes("late fine") ||
        d.includes("waiver") ||
        d.includes("fine tk");

      let matchCategory = selectedCategory === "all";
      if (!matchCategory) {
        if (selectedCategory === "installment") {
          matchCategory = isInstallment;
        } else if (selectedCategory === "result") {
          matchCategory = isResult;
        } else if (selectedCategory === "exam") {
          matchCategory = isExam;
        } else if (selectedCategory === "semester_break") {
          matchCategory = item.category === "semester_break" || d.includes("semester break");
        } else if (selectedCategory === "holiday") {
          matchCategory = item.category === "holiday" || d.includes("holiday");
        } else if (selectedCategory === "class") {
          matchCategory = item.category === "class" || d.includes("classes begin") || d.includes("last date of classes") || d.includes("classes end");
        } else if (selectedCategory === "orientation") {
          matchCategory = isOrientation;
        } else if (selectedCategory === "add_drop") {
          matchCategory = isAddDrop;
        } else if (selectedCategory === "pre_registration") {
          matchCategory = isPreReg;
        } else {
          matchCategory = item.category === selectedCategory;
        }
      }

      return matchSearch && matchCategory;
    });
  };

  // Row styles matching official SEU format
  const getItemRowClass = (item: CalendarItem) => {
    const desc = item.description.toLowerCase();
    if (item.category === "semester_break" || desc.includes("semester break")) {
      return "bg-purple-100/90 text-purple-950 font-extrabold border-l-4 border-purple-600 shadow-xs";
    }
    // Result row (Announcement of Exam Results, Grade Submission)
    if (item.category === "result" || desc.includes("result") || desc.includes("grade submission")) {
      return "bg-emerald-50 text-emerald-950 font-bold border-l-4 border-emerald-500 shadow-xs";
    }
    // Examination row (Midterm & Final Exams only, excluding results)
    if (desc.includes("midterm examination") || desc.includes("final examination") || item.category === "exam") {
      return "bg-amber-100/90 text-amber-950 font-extrabold border-l-4 border-amber-500 shadow-xs";
    }
    // Orientation row
    if (item.category === "orientation" || desc.includes("orientation")) {
      return "bg-indigo-50 text-indigo-950 font-bold border-l-4 border-indigo-500 shadow-xs";
    }
    // Pre-registration row
    if (item.category === "pre_registration" || desc.includes("pre-registration") || desc.includes("preregistration")) {
      return "bg-sky-50 text-sky-950 font-semibold border-l-4 border-sky-500 shadow-xs";
    }
    // Add / Drop row
    if (
      item.category === "add_drop" ||
      desc.includes("add/drop") ||
      desc.includes("add / drop") ||
      desc.includes("add drop") ||
      desc.includes("semester drop") ||
      (desc.includes("drop") && !desc.includes("attendance"))
    ) {
      return "bg-teal-50 text-teal-950 font-semibold border-l-4 border-teal-500 shadow-xs";
    }
    // Installment & Tuition Payment row
    if (
      item.category === "installment" ||
      desc.includes("installment") ||
      desc.includes("payment") ||
      desc.includes("late fee") ||
      desc.includes("late fine") ||
      desc.includes("waiver")
    ) {
      return "bg-cyan-50/90 text-cyan-950 font-bold border-l-4 border-cyan-500 shadow-xs";
    }
    if (desc.includes("classes begin") || item.category === "class") {
      return "bg-yellow-50 text-yellow-950 font-bold border-l-4 border-yellow-500";
    }
    if (item.category === "holiday" || desc.includes("holiday")) {
      return "bg-rose-50 text-rose-900 font-semibold border-l-4 border-rose-400";
    }
    if (
      desc.includes("admit card") ||
      desc.includes("registration begins")
    ) {
      return "bg-blue-50/70 text-blue-950 font-semibold";
    }
    return "text-slate-800 hover:bg-slate-50";
  };

  // Filter function for html-to-image to exclude UI buttons from export
  const exportFilter = (node: HTMLElement) => {
    if (node?.classList && node.classList.contains("export-hide")) {
      return false;
    }
    return true;
  };

  // Download entire 3-semester calendar as PNG
  const downloadAllAsPng = async () => {
    if (!fullCalendarRef.current) return;
    try {
      setIsDownloading(true);
      setIsExporting(true);
      toast.info(
        language === "bn"
          ? "হাই-রেজোলিউশন ফুল শিট PNG প্রস্তুত হচ্ছে..."
          : "Generating high-resolution full calendar PNG..."
      );

      // Brief tick for DOM to apply export classes
      await new Promise((r) => setTimeout(r, 100));

      const dataUrl = await toPng(fullCalendarRef.current, {
        quality: 1,
        pixelRatio: 2.5,
        backgroundColor: "#ffffff",
        filter: exportFilter as any,
      });

      const link = document.createElement("a");
      link.download = `NoteLagbe_SEU_Academic_Calendar_${selectedYear}_Full.png`;
      link.href = dataUrl;
      link.click();

      toast.success(
        language === "bn"
          ? "ফুল ক্যালেন্ডার PNG ডাউনলোড সম্পন্ন হয়েছে!"
          : "Full Academic Calendar PNG downloaded successfully!"
      );
    } catch (err) {
      console.error(err);
      toast.error(
        language === "bn" ? "ডাউনলোড ব্যর্থ হয়েছে" : "Download failed"
      );
    } finally {
      setIsDownloading(false);
      setIsExporting(false);
    }
  };

  // Download entire 3-semester calendar as PDF
  const downloadAllAsPdf = async () => {
    if (!fullCalendarRef.current) return;
    try {
      setIsDownloading(true);
      setIsExporting(true);
      toast.info(
        language === "bn"
          ? "অফিসিয়াল ফুল ক্যালেন্ডার PDF প্রস্তুত হচ্ছে..."
          : "Generating official full calendar PDF..."
      );

      await new Promise((r) => setTimeout(r, 100));

      const dataUrl = await toPng(fullCalendarRef.current, {
        quality: 1,
        pixelRatio: 2.5,
        backgroundColor: "#ffffff",
        filter: exportFilter as any,
      });

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(dataUrl, "PNG", 0, 4, pdfWidth, Math.min(pdfHeight, 202));
      pdf.save(`NoteLagbe_SEU_Academic_Calendar_${selectedYear}_Full.pdf`);

      toast.success(
        language === "bn"
          ? "ফুল ক্যালেন্ডার PDF ডাউনলোড সম্পন্ন হয়েছে!"
          : "Full Academic Calendar PDF downloaded successfully!"
      );
    } catch (err) {
      console.error(err);
      toast.error(
        language === "bn" ? "PDF ডাউনলোড ব্যর্থ হয়েছে" : "PDF download failed"
      );
    } finally {
      setIsDownloading(false);
      setIsExporting(false);
    }
  };

  // Single Semester Download (PNG) with NoteLagbe & University Header
  const downloadSingleSemesterPng = async (sem: SemesterData) => {
    setSingleExportSemester(sem);
    try {
      setIsDownloading(true);
      setIsExporting(true);
      toast.info(
        language === "bn"
          ? `${translateSemesterName(sem.semester, language)} PNG প্রস্তুত হচ্ছে...`
          : `Generating ${sem.semester} PNG...`
      );

      // Wait for hidden export container to render with data
      await new Promise((r) => setTimeout(r, 150));

      if (!singleExportRef.current) return;

      const dataUrl = await toPng(singleExportRef.current, {
        quality: 1,
        pixelRatio: 2.5,
        backgroundColor: "#ffffff",
        filter: exportFilter as any,
      });

      const cleanName = sem.semester.replace(/\s+/g, "_");
      const link = document.createElement("a");
      link.download = `NoteLagbe_SEU_${cleanName}.png`;
      link.href = dataUrl;
      link.click();

      toast.success(
        language === "bn"
          ? `${translateSemesterName(sem.semester, language)} PNG ডাউনলোড সম্পন্ন!`
          : `${sem.semester} PNG downloaded successfully!`
      );
    } catch (err) {
      console.error(err);
      toast.error(language === "bn" ? "ডাউনলোড ব্যর্থ হয়েছে" : "Download failed");
    } finally {
      setIsDownloading(false);
      setIsExporting(false);
      setSingleExportSemester(null);
    }
  };

  // Single Semester Download (PDF) with NoteLagbe & University Header
  const downloadSingleSemesterPdf = async (sem: SemesterData) => {
    setSingleExportSemester(sem);
    try {
      setIsDownloading(true);
      setIsExporting(true);
      toast.info(
        language === "bn"
          ? `${translateSemesterName(sem.semester, language)} PDF প্রস্তুত হচ্ছে...`
          : `Generating ${sem.semester} PDF...`
      );

      await new Promise((r) => setTimeout(r, 150));

      if (!singleExportRef.current) return;

      const dataUrl = await toPng(singleExportRef.current, {
        quality: 1,
        pixelRatio: 2.5,
        backgroundColor: "#ffffff",
        filter: exportFilter as any,
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(dataUrl, "PNG", 10, 8, pdfWidth - 20, Math.min(pdfHeight, 280));
      const cleanName = sem.semester.replace(/\s+/g, "_");
      pdf.save(`NoteLagbe_SEU_${cleanName}.pdf`);

      toast.success(
        language === "bn"
          ? `${translateSemesterName(sem.semester, language)} PDF ডাউনলোড সম্পন্ন!`
          : `${sem.semester} PDF downloaded successfully!`
      );
    } catch (err) {
      console.error(err);
      toast.error(language === "bn" ? "PDF ডাউনলোড ব্যর্থ হয়েছে" : "PDF download failed");
    } finally {
      setIsDownloading(false);
      setIsExporting(false);
      setSingleExportSemester(null);
    }
  };

  // Category Pills Data (Arranged in requested sequence: All Events -> Orientation -> Classes -> Add/Drop -> Installment & Payment -> Pre-registration -> Examinations -> Results -> Holidays -> Semester Break)
  const categoriesList = [
    { id: "all", labelEn: "All Events", labelBn: "সব ইভেন্ট" },
    { id: "orientation", labelEn: "Orientation", labelBn: "ওরিয়েন্টেশন" },
    { id: "class", labelEn: "Classes", labelBn: "ক্লাস শুরু/শেষ" },
    { id: "add_drop", labelEn: "Add / Drop", labelBn: "অ্যাড / ড্রপ" },
    { id: "installment", labelEn: "Installment & Payment", labelBn: "কিস্তি ও পেমেন্ট" },
    { id: "pre_registration", labelEn: "Pre-registration", labelBn: "প্রি-রেজিস্ট্রেশন" },
    { id: "exam", labelEn: "Examinations", labelBn: "পরীক্ষা (Exams)" },
    { id: "result", labelEn: "Results", labelBn: "রেজাল্ট ও গ্রেড" },
    { id: "holiday", labelEn: "Holidays", labelBn: "ছুটি (Holidays)" },
    { id: "semester_break", labelEn: "Semester Break", labelBn: "সেমিস্টার বিরতি" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Official Sync Info */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-blue-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>
                {language === "bn"
                  ? "অফিসিয়াল এসইইউ লাইভ ইন্টিগ্রেশন"
                  : "Official SEU Live Integration"}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              {language === "bn"
                ? `একাডেমিক ক্যালেন্ডার (${toBnDigits(selectedYear)})`
                : `Academic Calendar (${selectedYear})`}
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl">
              {language === "bn"
                ? "Southeast University-র অফিসিয়াল ওয়েবসাইট (seu.edu.bd) থেকে স্বয়ংক্রিয়ভাবে সিঙ্ক হওয়া পরীক্ষার সময়সূচি, ক্লাস শুরুর তারিখ ও ছুটির তালিকা।"
                : "Synchronized directly with the official Southeast University website (seu.edu.bd). Examination dates, class schedules, and holidays."}
            </p>
          </div>

          {/* Dynamic 4-Year Moving Window & Live Sync Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center bg-slate-800/80 p-1 rounded-2xl border border-slate-700/80">
              {availableYears.map((yr) => (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                    selectedYear === yr
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {language === "bn" ? toBnDigits(yr) : yr}
                </button>
              ))}
            </div>

            <button
              onClick={() => loadCalendar(selectedYear, true)}
              disabled={isSyncing}
              className="p-2.5 rounded-2xl bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/40 text-blue-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold"
              title={
                language === "bn"
                  ? "Official SEU সাইট থেকে লাইভ রি-সিঙ্ক করুন"
                  : "Sync live from official SEU website"
              }
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-blue-400" : ""}`} />
              <span className="hidden sm:inline">
                {language === "bn" ? "রি-সিঙ্ক" : "Sync Now"}
              </span>
            </button>
          </div>
        </div>

        {/* Sync metadata bar */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>
              {language === "bn" ? "সর্বশেষ সিঙ্ক:" : "Last synced:"}{" "}
              {lastSyncedTime || (language === "bn" ? "আজ" : "Today")}
            </span>
            <span>•</span>
            <span className="text-blue-400 font-medium">{dataSource}</span>
          </div>
        </div>
      </div>

      {/* Filter and Master Download Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Semester Selector Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedSemesterTab("all")}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                selectedSemesterTab === "all"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>
                {language === "bn"
                  ? "সম্পূর্ণ বছর (৩ সেমিস্টার)"
                  : "Full Year (3 Semesters)"}
              </span>
            </button>

            {semesters.map((s) => (
              <button
                key={s.semester}
                onClick={() => setSelectedSemesterTab(s.semester)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 ${
                  selectedSemesterTab === s.semester
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {translateSemesterName(s.semester, language)}
              </button>
            ))}
          </div>

          {/* Master Downloads for Full 3 Semesters */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={downloadAllAsPng}
              disabled={isDownloading}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              title={
                language === "bn"
                  ? "সম্পূর্ণ ৩টি সেমিস্টার এক সাথে PNG আকারে ডাউনলোড করুন"
                  : "Download all 3 semesters as a complete high-res PNG sheet"
              }
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>{language === "bn" ? "ফুল শিট (PNG)" : "Full Sheet (PNG)"}</span>
            </button>

            <button
              onClick={downloadAllAsPdf}
              disabled={isDownloading}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              title={
                language === "bn"
                  ? "সম্পূর্ণ ৩টি সেমিস্টার এক সাথে PDF আকারে ডাউনলোড করুন"
                  : "Download all 3 semesters as a formal PDF document"
              }
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{language === "bn" ? "ফুল শিট (PDF)" : "Full Sheet (PDF)"}</span>
            </button>
          </div>
        </div>

        {/* Search & Category Filter Pills - 2 Separate Rows */}
        <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
          {/* Row 1: Full Search Bar on Top */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                language === "bn"
                  ? "ইভেন্ট, তারিখ বা কিস্তির বিবরণ খুঁজুন (যেমন: 1st Installment, Midterm, Eid, Registration)..."
                  : "Search event, date or installment details (e.g., 1st Installment, Midterm, Eid, Registration)..."
              }
              className="w-full pl-9 pr-9 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                title={language === "bn" ? "সার্চ মুছুন" : "Clear search"}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Row 2: Filter Tag Pills Beneath */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 scrollbar-none text-xs flex-wrap sm:flex-nowrap">
            {categoriesList.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat.id
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {language === "bn" ? cat.labelBn : cat.labelEn}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Official Printable Calendar Board */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {language === "bn"
              ? "Southeast University ক্যালেন্ডার ডাটা লোড হচ্ছে..."
              : "Loading Southeast University calendar data..."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Printable Container for Full Year (or filtered semester) */}
          <div
            ref={fullCalendarRef}
            className="bg-white text-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6 relative overflow-hidden"
          >
            {/* NoteLagbe Official Academic Portal Branding Bar (Prominent in UI & Downloads) */}
            <div className="w-full flex flex-wrap items-center justify-between pb-3 mb-2 border-b-2 border-slate-200 text-xs font-sans gap-2 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-extrabold text-xs tracking-wider shadow-sm">
                  <span className="font-black text-white">NoteLagbe</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 uppercase tracking-widest font-mono text-white">SEU</span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-slate-900 font-extrabold text-xs tracking-tight">
                    Southeast University Academic Resource & Question Archive
                  </span>
                  <span className="text-[10px] text-blue-600 font-bold">
                    Official Student Portal • note-lagbe-sandy.vercel.app
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Verified University Academic Calendar
                </span>
              </div>
            </div>

            {/* Official Southeast University Top Header (Matching SEU Official Document exactly) */}
            <div className="flex flex-col items-center justify-center text-center pb-2 relative z-10">
              <div className="flex items-center justify-center gap-4 mb-2">
                {/* Official Transparent University Seal Crest */}
                <img
                  src="/seu-official-logo.png"
                  alt="Southeast University Crest"
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain shrink-0"
                />
                <div className="flex flex-col text-left justify-center">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-black text-[#173775] tracking-tight uppercase leading-none">
                    SOUTHEAST UNIVERSITY
                  </h1>
                  <p className="text-xs sm:text-sm md:text-base italic text-slate-700 font-serif font-semibold mt-1 tracking-wide">
                    Meeting the Challenges of Time
                  </p>
                </div>
              </div>

              {/* Blue Header Banner matching official document with NoteLagbe Portal Branding */}
              <div className="w-full mt-2 py-2.5 px-4 bg-[#1d63ed] rounded-xl text-white font-black text-sm sm:text-base md:text-lg tracking-wide uppercase text-center shadow-sm flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider opacity-90 hidden sm:inline font-sans">
                  NOTELAGBE ARCHIVE
                </span>
                <span className="flex-1 text-center font-black tracking-wide">
                  ACADEMIC CALENDAR {selectedYear}
                </span>
                <span className="text-xs font-mono font-bold opacity-90 hidden sm:inline">
                  SEU.EDU.BD
                </span>
              </div>
            </div>

            {/* 3 Columns Grid for 3 Semesters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start relative z-10">
              {semesters
                .filter((s) => selectedSemesterTab === "all" || selectedSemesterTab === s.semester)
                .map((sem) => {
                  const items = getFilteredItems(sem.items);
                  return (
                    <div
                      key={sem.semester}
                      ref={(el) => {
                        semesterCardRefs.current[sem.semester] = el;
                      }}
                      className="border-2 border-slate-300 rounded-2xl overflow-hidden bg-white shadow-md flex flex-col"
                    >
                      {/* Column Header: Blue Banner with Title & Quick Download */}
                      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white p-3.5 flex items-center justify-between border-b-2 border-blue-950">
                        <span className="font-black text-sm tracking-wide uppercase">
                          {translateSemesterName(sem.semester, language)}
                        </span>

                        {/* Single Semester Individual Download Buttons (Class export-hide ensures they NEVER appear in PNG/PDF export) */}
                        {!isExporting && (
                          <div className="export-hide flex items-center gap-1.5">
                            <button
                              onClick={() => downloadSingleSemesterPng(sem)}
                              disabled={isDownloading}
                              className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-[10px] font-bold tracking-wider transition-colors flex items-center gap-1 text-white border border-white/20 active:scale-95 cursor-pointer"
                              title={
                                language === "bn"
                                  ? `${translateSemesterName(sem.semester, language)} শুধুমাত্র এই সেমিস্টারটি PNG ডাউনলোড করুন`
                                  : `Download ${sem.semester} as PNG`
                              }
                            >
                              <ImageIcon className="w-3 h-3 text-cyan-300" />
                              <span>PNG</span>
                            </button>
                            <button
                              onClick={() => downloadSingleSemesterPdf(sem)}
                              disabled={isDownloading}
                              className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-[10px] font-bold tracking-wider transition-colors flex items-center gap-1 text-white border border-white/20 active:scale-95 cursor-pointer"
                              title={
                                language === "bn"
                                  ? `${translateSemesterName(sem.semester, language)} শুধুমাত্র এই সেমিস্টারটি PDF ডাউনলোড করুন`
                                  : `Download ${sem.semester} as PDF`
                              }
                            >
                              <FileText className="w-3 h-3 text-amber-300" />
                              <span>PDF</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Items Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <tbody>
                            {items.length === 0 ? (
                              <tr>
                                <td colSpan={2} className="p-6 text-center text-slate-400">
                                  {language === "bn"
                                    ? "কোনো ইভেন্ট পাওয়া যায়নি"
                                    : "No events found matching your filter"}
                                </td>
                              </tr>
                            ) : (
                              items.map((it, idx) => (
                                <tr
                                  key={idx}
                                  className={`border-b border-slate-200 transition-colors ${getItemRowClass(it)}`}
                                >
                                  <td className="py-2 px-3 font-semibold text-slate-900 w-28 shrink-0 align-top border-r border-slate-200">
                                    {translateDate(it.date, language)}
                                  </td>
                                  <td className="py-2 px-3 align-top leading-snug text-slate-900">
                                    {translateDescription(it.description, language)}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Official Footnotes & NoteLagbe Archive Watermark Footer */}
            <div className="pt-4 border-t-2 border-slate-200 text-center text-xs space-y-2 text-slate-600 font-medium font-serif relative z-10">
              <p className="bg-blue-50 py-1 px-3 rounded-lg border border-blue-200 text-blue-900 inline-block text-[11px]">
                * Depends on sighting of the moon and approval of the Government
              </p>
              <p className="text-slate-700 font-bold">
                University Authority reserves the right to change the Academic Calendar
              </p>
              <div className="pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between text-[11px] font-sans text-slate-500 gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-[#173775]">NoteLagbe</span>
                  <span>•</span>
                  <span className="font-semibold text-slate-700">Southeast University Academic Resource & Question Archive</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-600 font-bold">Portal: note-lagbe-sandy.vercel.app</span>
                  <span>•</span>
                  <span>Academic Calendar {selectedYear}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Clean Single Semester Export Container (Offscreen layer with zIndex: -50 for flawless capture) */}
      {singleExportSemester && (
        <div
          ref={singleExportRef}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "820px",
            zIndex: -50,
            pointerEvents: "none",
          }}
          className="bg-white text-slate-900 p-8 rounded-none border border-slate-300 space-y-6"
        >
          {/* NoteLagbe Official Academic Portal Branding Bar */}
          <div className="w-full flex items-center justify-between pb-3 mb-2 border-b-2 border-slate-200 text-xs font-sans">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-extrabold text-xs tracking-wider shadow-sm">
                <span className="font-black text-white">NoteLagbe</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 uppercase tracking-widest font-mono text-white">SEU</span>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-slate-900 font-extrabold text-xs tracking-tight">
                  Southeast University Academic Resource & Question Archive
                </span>
                <span className="text-[10px] text-blue-600 font-bold">
                  Official Student Portal • note-lagbe-sandy.vercel.app
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Verified University Academic Calendar
              </span>
            </div>
          </div>

          {/* Southeast University Official Header */}
          <div className="flex flex-col items-center justify-center text-center pb-2 relative z-10">
            <div className="flex items-center justify-center gap-4 mb-2">
              <img
                src="/seu-official-logo.png"
                alt="Southeast University Crest"
                className="w-16 h-16 sm:w-18 sm:h-18 object-contain shrink-0"
              />
              <div className="flex flex-col text-left justify-center">
                <h1 className="text-2xl sm:text-3xl font-serif font-black text-[#173775] tracking-tight uppercase leading-none">
                  SOUTHEAST UNIVERSITY
                </h1>
                <p className="text-xs sm:text-sm italic text-slate-700 font-serif font-semibold mt-1 tracking-wide">
                  Meeting the Challenges of Time
                </p>
              </div>
            </div>

            <div className="w-full mt-2 py-2 px-4 bg-[#1d63ed] rounded-lg text-white font-black text-sm sm:text-base tracking-wide uppercase text-center shadow-sm">
              ACADEMIC CALENDAR {selectedYear} — {translateSemesterName(singleExportSemester.semester, language)}
            </div>
          </div>

          {/* Single Semester Table */}
          <div className="border-2 border-slate-300 rounded-xl overflow-hidden bg-white relative z-10">
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-3 font-black text-sm uppercase">
              {translateSemesterName(singleExportSemester.semester, language)}
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <tbody>
                {singleExportSemester.items.map((it, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-slate-200 ${getItemRowClass(it)}`}
                  >
                    <td className="py-2.5 px-3.5 font-bold text-slate-900 w-32 shrink-0 align-top border-r border-slate-200">
                      {translateDate(it.date, language)}
                    </td>
                    <td className="py-2.5 px-3.5 align-top leading-snug text-slate-900">
                      {translateDescription(it.description, language)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footnotes & NoteLagbe Branding */}
          <div className="pt-4 border-t-2 border-slate-200 text-center text-xs space-y-1.5 text-slate-600 font-serif relative z-10">
            <p className="bg-blue-50 py-1 px-3 rounded-lg border border-blue-200 text-blue-900 inline-block text-[11px]">
              * Depends on sighting of the moon and approval of the Government
            </p>
            <p className="text-slate-700 font-bold">
              University Authority reserves the right to change the Academic Calendar
            </p>
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] font-sans text-slate-500">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[#173775]">NoteLagbe</span>
                <span>•</span>
                <span className="font-semibold text-slate-700">Southeast University Academic Resource & Question Archive</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-600 font-bold">Portal: note-lagbe-sandy.vercel.app</span>
                <span>•</span>
                <span>{singleExportSemester.semester}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
