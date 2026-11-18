"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "en" | "bn";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
}

const translations: Record<string, { en: string; bn: string }> = {
  // Brand & Nav
  "app.name": { en: "NoteLagbe", bn: "নোট লাগবে" },
  "app.tagline": { en: "Notes & Question Bank Archive", bn: "নোট ও প্রশ্ন ব্যাংক আর্কাইভ" },
  "nav.courses": { en: "Courses & Notes", bn: "কোর্স ও নোটস" },
  "nav.curriculum": { en: "Curriculum", bn: "কারিকুলাম" },
  "nav.faculty": { en: "Faculty Directory", bn: "শিক্ষক তালিকা" },
  "nav.tools": { en: "Student Tools", bn: "স্টুডেন্ট টুলস" },
  "nav.pricing": { en: "Plans & Pricing", bn: "প্ল্যান ও প্রাইসিং" },
  "nav.contribute": { en: "Contribute", bn: "কন্ট্রিবিউট" },
  "nav.contributeFree": { en: "+2 Free", bn: "+২ ফ্রি" },
  "nav.signIn": { en: "Sign In", bn: "সাইন ইন" },
  "nav.signOut": { en: "Sign Out", bn: "লগ আউট" },
  "nav.adminPanel": { en: "Admin Control Center", bn: "অ্যাডমিন প্যানেল" },
  "nav.dashboard": { en: "Student Dashboard", bn: "স্টুডেন্ট ড্যাশবোর্ড" },
  "nav.subscription": { en: "Subscription & Plans", bn: "সাবস্ক্রিপশন ও প্ল্যান" },

  // Course Detail - General & Hero
  "course.department": { en: "Department", bn: "বিভাগ" },
  "course.credits": { en: "Credits", bn: "ক্রেডিট" },
  "course.semester": { en: "Semester", bn: "সেমিস্টার" },
  "course.electiveGroup": { en: "Elective Group", bn: "ঐচ্ছিক গ্রুপ" },
  "course.theoryBadge": { en: "Theory Course", bn: "থিওরি কোর্স" },
  "course.labBadge": { en: "Practical Lab Course", bn: "প্র্যাকটিক্যাল ল্যাব কোর্স" },
  "course.prerequisite": { en: "Prerequisite", bn: "পূর্বশর্ত" },
  "course.companionLab": { en: "Companion Practical Lab Course:", bn: "কম্প্যানিয়ন প্র্যাকটিক্যাল ল্যাব কোর্স:" },
  "course.companionTheory": { en: "Companion Theory Course:", bn: "কম্প্যানিয়ন থিওরি কোর্স:" },
  "course.switchTo": { en: "Switch to", bn: "সুইচ করুন" },
  "course.unlocked": { en: "✓ Unlocked", bn: "✓ আনলক করা হয়েছে" },
  "course.separateUnlock": { en: "Separate Course Unlock", bn: "আলাদাভাবে আনলক করতে হবে" },
  "course.requiresSeparate": { en: "(Requires separate unlock)", bn: "(আলাদাভাবে আনলক প্রয়োজন)" },
  "course.allFacultyUnlocked": { en: "All Faculty Unlocked", bn: "সকল শিক্ষকের ম্যাটেরিয়াল আনলকড" },
  "course.allAccessible": { en: "All notes & exams accessible", bn: "সকল নোট ও প্রশ্ন পড়ার উপযোগী" },
  "course.unlockAllFaculty": { en: "Unlock Course (All Faculty)", bn: "কোর্স আনলক করুন (সকল শিক্ষক)" },
  "course.unlocking": { en: "Unlocking...", bn: "আনলক হচ্ছে..." },
  "course.oneQuota": { en: "1 Quota • Unlocks all instructors", bn: "১ কোটা • সকল শিক্ষকের কন্টেন্ট আনলক হবে" },
  "course.aiCheatSheet": { en: "AI Exam Revision Copilot", bn: "এআই এক্সাম রিভিশন কো-পাইলট" },
  "course.contribute": { en: "+ Contribute Material for this Course", bn: "+ এই কোর্সের ম্যাটেরিয়াল আপলোড করুন" },

  // Course Detail - Faculty Section
  "course.facultyHeader": { en: "Course Faculty & Instructors", bn: "কোর্স শিক্ষকবৃন্দ" },
  "course.facultySubtitle": { 
    en: "Select an instructor below to view their specific lecture hand notes, midterm & final questions, and lab tasks.",
    bn: "নির্দিষ্ট শিক্ষকের হ্যান্ড নোট, মিডটার্ম ও ফাইনাল প্রশ্ন এবং ল্যাব কাজ দেখতে নিচে শিক্ষক সিলেক্ট করুন।"
  },
  "course.facultyAssigned": { en: "Faculty Assigned", bn: "জন শিক্ষক দায়িত্বে আছেন" },
  "course.allFacultyMembers": { en: "All Faculty Members", bn: "সকল শিক্ষক" },
  "course.totalMaterials": { en: "Total Materials", bn: "মোট ম্যাটেরিয়াল" },
  "course.notesCount": { en: "Notes", bn: "টি নোট" },
  "course.examsCount": { en: "Exams", bn: "টি পরীক্ষা" },
  "course.facultyRole": { en: "Faculty", bn: "শিক্ষক" },
  "course.filteringFor": { en: "Filtering materials for:", bn: "ফিল্টার করা হচ্ছে:" },
  "course.clearFilter": { en: "Clear Instructor Filter", bn: "ফিল্টার মুছুন" },

  // Course Detail - Filter Tabs
  "tabs.allMaterials": { en: "All Materials", bn: "সকল ম্যাটেরিয়াল" },
  "tabs.handNotes": { en: "Hand Notes", bn: "হ্যান্ড নোট" },
  "tabs.midtermExams": { en: "Midterm Exam Papers", bn: "মিডটার্ম পরীক্ষার প্রশ্নপত্র" },
  "tabs.finalExams": { en: "Final Exam Papers", bn: "ফাইনাল পরীক্ষার প্রশ্নপত্র" },
  "tabs.labSection": { en: "Lab Section", bn: "ল্যাব সেকশন" },
  "tabs.labManuals": { en: "Lab Manuals & Practical", bn: "ল্যাব ম্যানুয়াল ও প্র্যাকটিক্যাল" },
  "tabs.labHandNotes": { en: "Lab Hand Notes", bn: "ল্যাব হ্যান্ড নোট" },
  "tabs.labReports": { en: "Lab Reports", bn: "ল্যাব রিপোর্ট" },
  "tabs.labQuizzes": { en: "Lab Quizzes", bn: "ল্যাব কুইজ" },
  "tabs.labFinals": { en: "Lab Finals & Viva", bn: "ল্যাব ফাইনাল ও ভাইভা" },
  "tabs.searchPlaceholder": { en: "Filter by semester, quiz, or topic...", bn: "সেমিস্টার, কুইজ বা টপিক দিয়ে ফিল্টার করুন..." },

  // Course Detail - Section Titles & Subtitles
  "section.handNotes": { en: "Hand Notes", bn: "হ্যান্ড নোট" },
  "section.midtermExams": { en: "Midterm Examination Papers", bn: "মিডটার্ম পরীক্ষার প্রশ্নপত্র" },
  "section.finalExams": { en: "Final Examination Papers", bn: "ফাইনাল পরীক্ষার প্রশ্নপত্র" },
  "section.labSection": { en: "Lab Section & Companion Lab", bn: "ল্যাব সেকশন ও কম্প্যানিয়ন ল্যাব" },
  "section.labManuals": { en: "Lab Manuals & Practical Experiments", bn: "ল্যাব ম্যানুয়াল ও প্র্যাকটিক্যাল এক্সপেরিমেন্ট" },
  "section.labHandNotes": { en: "Lab Hand Notes", bn: "ল্যাব হ্যান্ড নোট" },
  "section.labReports": { en: "Lab Reports & Sample Solutions", bn: "ল্যাব রিপোর্ট ও নমুনা সমাধান" },
  "section.labQuizzes": { en: "Lab Quizzes", bn: "ল্যাব কুইজ" },
  "section.labFinals": { en: "Lab Final Examinations & Viva Tasks", bn: "ল্যাব ফাইনাল পরীক্ষা ও ভাইভা প্রশ্নাবলী" },

  "sub.officialTasks": { en: "Official Task Sheets & Experiment Setups", bn: "অফিসিয়াল টাস্ক শিট ও এক্সপেরিমেন্ট সেটআপ" },
  "sub.cliCommands": { en: "CLI Commands, Code Snippets & Topology Cheatsheets", bn: "সিএলআই কমান্ড, কোড স্নsnippet ও চিটশিট" },
  "sub.reportTemplates": { en: "Standard Report Templates & Complete Solutions", bn: "স্ট্যান্ডার্ড রিপোর্ট টেমপ্লেট ও পূর্ণাঙ্গ সমাধান" },
  "sub.codingQuizzes": { en: "Practical Coding & Command Quizzes", bn: "ব্যবহারিক কোডিং ও কমান্ড কুইজ" },
  "sub.problemSets": { en: "Lab Final Problem Sets & Viva Question Bank", bn: "ল্যাব ফাইনাল প্রশ্ন সেট ও ভাইভা প্রশ্ন ব্যাংক" },
  "sub.multiSemester": { en: "Multi-Semester Archive", bn: "মাল্টি-সেমিস্টার আর্কাইভ" },
  "sub.semesters": { en: "Semesters", bn: "সেমিস্টার" },

  // Empty States
  "empty.handNotes": { en: "No hand notes uploaded yet for this selection.", bn: "এই নির্বাচনের জন্য কোনো হ্যান্ড নোট এখনও যুক্ত করা হয়নি।" },
  "empty.midtermExams": { en: "No midterm examination papers uploaded yet for this selection.", bn: "এই নির্বাচনের জন্য কোনো মিডটার্ম প্রশ্ন এখনও যুক্ত করা হয়নি।" },
  "empty.finalExams": { en: "No final examination papers uploaded yet for this selection.", bn: "এই নির্বাচনের জন্য কোনো ফাইনাল প্রশ্ন এখনও যুক্ত করা হয়নি।" },
  "empty.labManuals": { en: "No lab manuals or experiment sheets uploaded yet.", bn: "কোনো ল্যাব ম্যানুয়াল এখনও আপলোড করা হয়নি।" },
  "empty.labHandNotes": { en: "No lab hand notes uploaded yet.", bn: "কোনো ল্যাব হ্যান্ড নোট এখনও আপলোড করা হয়নি।" },
  "empty.labReports": { en: "No sample lab reports uploaded yet.", bn: "কোনো নমুনা ল্যাব রিপোর্ট এখনও আপলোড করা হয়নি।" },
  "empty.labQuizzes": { en: "No lab quizzes uploaded yet.", bn: "কোনো ল্যাব কুইজ এখনও আপলোড করা হয়নি।" },
  "empty.labFinals": { en: "No lab final examination sheets uploaded yet.", bn: "কোনো ল্যাব ফাইনাল পরীক্ষার শিট এখনও আপলোড করা হয়নি।" },

  // Tips & Notice
  "notice.scopeTheory": { 
    en: "Unlocking this theory course unlocks all hand notes, midterm examination papers, and final examination papers across ALL instructors. Practical lab courses are separate courses and unlocked independently.",
    bn: "এই থিওরি কোর্সটি আনলক করলে সব শিক্ষকের হ্যান্ড নোট, মিডটার্ম ও ফাইনাল প্রশ্নপত্র আনলক হয়ে যাবে। প্র্যাকটিক্যাল ল্যাব কোর্স আলাদা কোর্স হিসেবে আলাদাভাবে আনলক করতে হবে।"
  },
  "notice.scopeLab": { 
    en: "This practical lab course archives all Lab Quizzes, Lab Finals & Viva, Lab Reports, Lab Hand Notes, and Lab Manuals across all assigned faculty. Unlocking this course gives access to all instructors teaching this lab.",
    bn: "এই প্র্যাকটিক্যাল ল্যাব কোর্সে সকল শিক্ষকের ল্যাব কুইজ, ল্যাব ফাইনাল ও ভাইভা, ল্যাব রিপোর্ট, ল্যাব হ্যান্ড নোট এবং ল্যাব ম্যানুয়াল সংরক্ষিত আছে। এই কোর্সটি আনলক করলে ল্যাবের সকল শিক্ষকের কন্টেন্ট পাওয়া যাবে।"
  },
  "tip.theoryTitle": { en: "Exam Preparation Tip", bn: "পরীক্ষার প্রস্তুতির পরামর্শ" },
  "tip.theoryText": { 
    en: "Always study the hand notes together with the midterm and final questions from your specific faculty instructor. Different professors focus on different chapters, question styles, and practical algorithms in their examinations.",
    bn: "সবসময় আপনার নির্দিষ্ট শিক্ষকের হ্যান্ড নোটের পাশাপাশি তার বিগত মিডটার্ম ও ফাইনাল প্রশ্নগুলো অনুশীলন করুন। বিভিন্ন শিক্ষক আলাদা অধ্যায় এবং প্রশ্নপদ্ধতির ওপর জোর দেন।"
  },
  "tip.labTitle": { en: "Lab Exam Preparation Tip", bn: "ল্যাব পরীক্ষার প্রস্তুতির পরামর্শ" },
  "tip.labText": { 
    en: "Review the Lab Hand Notes and sample Lab Reports alongside the past Lab Quizzes and Lab Final examination problem sets. Different lab instructors test different CLI setups, viva questions, and coding tasks.",
    bn: "ল্যাব কুইজ ও ল্যাব ফাইনালের সমস্যাগুলোর পাশাপাশি ল্যাব হ্যান্ড নোট এবং নমুনা ল্যাব রিপোর্টগুলো ভালো করে দেখুন। শিক্ষকরা ভিন্ন ভিন্ন সিএলআই সেটআপ ও ভাইভা প্রশ্ন জিজ্ঞাসা করেন।"
  },

  // Reviews
  "reviews.title": { en: "Course Feedback", bn: "কোর্স ফিডব্যাক" },
  "reviews.empty": { en: "No reviews submitted yet for this course.", bn: "এই কোর্সের জন্য এখনও কোনো রিভিউ দেওয়া হয়নি।" },
  "reviews.addFeedback": { en: "Add Your Feedback:", bn: "আপনার মতামত দিন:" },
  "reviews.placeholder": { en: "Share your experience about this course, teaching style, exam patterns...", bn: "এই কোর্স, পরীক্ষার প্রশ্নপদ্ধতি এবং শিক্ষকের পড়ানোর ধরন সম্পর্কে আপনার অভিজ্ঞতা শেয়ার করুন..." },
  "reviews.submit": { en: "Submit Review", bn: "রিভিউ জমা দিন" },
  "reviews.submitting": { en: "Submitting...", bn: "জমা হচ্ছে..." },

  // Course Catalog Page
  "catalog.title": { en: "Course Catalog & Question Bank", bn: "কোর্স তালিকা ও প্রশ্ন ব্যাংক" },
  "catalog.subtitle": { 
    en: "Browse academic curriculum courses, faculty assignments, lecture notes, and past examination archives",
    bn: "একাডেমিক কারিকুলাম কোর্স, শিক্ষক বন্টন, লেকচার নোট এবং বিগত পরীক্ষার প্রশ্নপত্র খুঁজুন"
  },
  "catalog.coursesFound": { en: "Courses Found", bn: "টি কোর্স পাওয়া গেছে" },
  "catalog.searchPlaceholder": { 
    en: "Search by course code (e.g. CSE241, CSE141), title, or instructor name (e.g. Shakib, Belal)...",
    bn: "কোর্স কোড (যেমন CSE241), নাম অথবা শিক্ষকের নাম দিয়ে খুঁজুন..."
  },
  "catalog.filterAll": { en: "All Courses", bn: "সকল কোর্স" },
  "catalog.filterNotes": { en: "Has Hand Notes", bn: "হ্যান্ড নোট আছে" },
  "catalog.filterQuestions": { en: "Has Exam Questions", bn: "পরীক্ষার প্রশ্ন আছে" },
  "catalog.allSemesters": { en: "All Semesters", bn: "সকল সেমিস্টার" },
  "catalog.comingSoon": { en: "Coming Soon", bn: "শীঘ্রই আসছে" },
  "catalog.viewMaterials": { en: "View Materials", bn: "ম্যাটেরিয়াল দেখুন" },

  // Faculty Directory Page
  "faculty.title": { en: "Faculty Directory & Question Archives", bn: "শিক্ষক ডিরেক্টরি ও প্রশ্ন ব্যাংক" },
  "faculty.subtitle": { 
    en: "Search Southeast University professors, inspect assigned curriculum courses, and access midterm & final exam papers",
    bn: "সাউথইস্ট ইউনিভার্সিটির সম্মানিত শিক্ষকদের খুঁজুন, তাদের কোর্স ও বিগত পরীক্ষার প্রশ্ন দেখুন"
  },
  "faculty.searchPlaceholder": { 
    en: "Search faculty name, initials (e.g. MHB, SM, Shakib, ADMR), or designation...",
    bn: "শিক্ষকের নাম, ইনিশিয়াল (যেমন MHB, TNHR, Shakib) অথবা পদবি দিয়ে খুঁজুন..."
  },
  "faculty.fullTime": { en: "Full-Time Faculty", bn: "পূর্ণকালীন শিক্ষক" },
  "faculty.adjunct": { en: "Adjunct Faculty", bn: "খণ্ডকালীন শিক্ষক" },
  "faculty.staff": { en: "Officers & Staff", bn: "কর্মকর্তা ও কর্মচারী" },
  "faculty.all": { en: "All Members", bn: "সকল সদস্য" },
  "faculty.coursesTaught": { en: "Courses Taught", bn: "পাঠদানকৃত কোর্সসমূহ" },
  "faculty.viewProfile": { en: "View Profile & Questions", bn: "প্রোফাইল ও প্রশ্নপত্র দেখুন" },

  // Pricing Page
  "pricing.title": { en: "Simple, Transparent Student Pricing", bn: "শিক্ষার্থীদের জন্য সহজ ও সুলভ প্ল্যান" },
  "pricing.subtitle": { 
    en: "Choose the package that fits your semester goals. Unlock hand notes and past exam papers for your courses, or contribute notes to unlock courses free.",
    bn: "আপনার প্রয়োজন অনুযায়ী প্ল্যান বেছে নিন। হ্যান্ড নোট ও পরীক্ষার প্রশ্ন আনলক করুন, অথবা নোট আপলোড করে ফ্রিতে কোর্স আনলক করুন।"
  },
  "pricing.plan1Title": { en: "1-Semester Plan (3 Months)", bn: "১-সেমিস্টার প্ল্যান (৩ মাস)" },
  "pricing.plan1Desc": { en: "Covers 1 Semester (3 Months)", bn: "১ সেমিস্টারের জন্য (৩ মাস)" },
  "pricing.plan1Action": { en: "Get 1-Semester Plan (৳99)", bn: "১-সেমিস্টার প্ল্যান নিন (৳৯৯)" },
  "pricing.plan2Badge": { en: "Most Popular • Student Choice", bn: "সর্বাধিক জনপ্রিয় • স্টুডেন্ট চয়েস" },
  "pricing.plan2Title": { en: "2-Semesters Plan (6 Months)", bn: "২-সেমিস্টার প্ল্যান (৬ মাস)" },
  "pricing.plan2Desc": { en: "Covers 2 Consecutive Semesters (6 Months)", bn: "পরপর ২টি সেমিস্টারের জন্য (৬ মাস)" },
  "pricing.plan2Action": { en: "Get 2-Semesters Plan (৳149)", bn: "২-সেমিস্টার প্ল্যান নিন (৳১৪৯)" },
  "pricing.plan3Badge": { en: "VIP 1-Year All Access", bn: "ভিআইপি ১-বছর অল অ্যাক্সেস" },
  "pricing.plan3Title": { en: "1-Year Annual Pass (12 Months)", bn: "১-বছরের অ্যানুয়াল পাস (১২ মাস)" },
  "pricing.plan3Desc": { en: "Full Year Access (12 Months)", bn: "পুরো ১ বছরের ৩টি সেমিস্টার (১২ মাস)" },
  "pricing.plan3Action": { en: "Get 1-Year Pass (৳499)", bn: "১-বছরের পাস নিন (৳৪৯৯)" },
  "pricing.freeCommunity": { en: "Free Community Access", bn: "ফ্রি কমিউনিটি অ্যাক্সেস" },
  "pricing.contributeToUnlock": { en: "Upload 1 Hand Note or Exam Paper = Get 2 Courses Free!", bn: "১টি নোট বা পরীক্ষার প্রশ্ন আপলোড করুন = ২টি কোর্স বিনামূল্যে পান!" },
};

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always initialize with 'en' to match SSR HTML and avoid React 19 Error 418
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("notelagbe_language") as Language | null;
      if (savedLang === "en" || savedLang === "bn") {
        setLanguageState(savedLang);
      }
    } catch {}
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("notelagbe_language", lang);
    }
  };

  const toggleLanguage = () => {
    const nextLang: Language = language === "en" ? "bn" : "en";
    setLanguage(nextLang);
  };

  const t = (key: string, fallback?: string): string => {
    const entry = translations[key];
    if (entry) {
      return entry[language] || entry.en || fallback || key;
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

export function getActiveLanguage(): Language {
  if (typeof window === "undefined") return "en";
  try {
    const saved = localStorage.getItem("notelagbe_language");
    return saved === "bn" ? "bn" : "en";
  } catch {
    return "en";
  }
}

/**
 * Enterprise locale-aware error message normalizer.
 * 1. Automatically parses and separates bilingual server messages like:
 *    "ইমেইল অথবা পাসওয়ার্ড সঠিক নয়। (Invalid email or password.)" -> returns EN or BN cleanly.
 * 2. Translates common system/auth/rate-limiting errors to the active language.
 * 3. Strips unneeded foreign substrings so EN users see 100% English, and BN users see 100% Bengali.
 */
export function localizeErrorMessage(rawMessage?: string | null, targetLang?: Language): string {
  if (!rawMessage || typeof rawMessage !== "string") {
    const lang = targetLang || getActiveLanguage();
    return lang === "bn" ? "একটি অপ্রত্যাশিত সমস্যা হয়েছে।" : "An unexpected error occurred.";
  }

  const clean = rawMessage.trim();
  const lang = targetLang || getActiveLanguage();

  // Pattern A: "<Bangla text> (<English text>)" e.g. "ইমেইল অথবা পাসওয়ার্ড সঠিক নয়। (Invalid email or password.)"
  const matchBnEn = clean.match(/^([\u0980-\u09FF\s\d।.,!?:;'\-]+?)\s*\(([^)]+)\)\s*$/);
  if (matchBnEn) {
    return lang === "bn" ? matchBnEn[1].trim() : matchBnEn[2].trim();
  }

  // Pattern B: "<English text> (<Bangla text>)" e.g. "Invalid email or password. (ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।)"
  const matchEnBn = clean.match(/^([A-Za-z0-9\s.,!?:;'\"\-_]+?)\s*\(([\u0980-\u09FF\s\d।.,!?:;'\-]+)\)\s*$/);
  if (matchEnBn) {
    return lang === "bn" ? matchEnBn[2].trim() : matchEnBn[1].trim();
  }

  // Pattern C: If English is active, but string contains Bengali characters and has a paren with English text
  if (lang === "en" && /[\u0980-\u09FF]/.test(clean)) {
    const parenEnglish = clean.match(/\(([A-Za-z0-9\s.,!?:;'\"\-_]+)\)/);
    if (parenEnglish && parenEnglish[1].trim().length > 3) {
      return parenEnglish[1].trim();
    }
  }

  // Pattern D: If Bengali is active, strip trailing or enclosed English in parentheses
  if (lang === "bn" && /[\u0980-\u09FF]/.test(clean)) {
    const stripped = clean.replace(/\s*\([A-Za-z0-9\s.,!?:;'\"\-_]+\)\s*/g, "").trim();
    if (stripped.length > 0) {
      return stripped;
    }
  }

  // Known dictionary translations for English locale
  if (lang === "en") {
    if (clean.includes("ইমেইল অথবা পাসওয়ার্ড সঠিক নয়")) {
      const matchAttempts = clean.match(/(\d+)\s*বার ভুল হলে/);
      if (matchAttempts) {
        const remaining = matchAttempts[1];
        return `Invalid credentials. ${remaining} attempt${Number(remaining) > 1 ? "s" : ""} remaining before a 30-minute lockout.`;
      }
      return "Invalid email or password.";
    }
    if (clean.includes("৫ বার ভুল পাসওয়ার্ড") || clean.includes("৩০ মিনিটের জন্য সাময়িকভাবে ব্লক")) {
      return "Account temporarily locked for 30 minutes due to 5 consecutive failed login attempts.";
    }
    if (clean.includes("একাধিক ভুল প্রচেষ্টার কারণে সাময়িকভাবে ব্লক")) {
      const matchMin = clean.match(/আরও\s*(\d+)\s*মিনিট/);
      if (matchMin) {
        return `Account temporarily locked due to multiple failed login attempts. Please try again after ${matchMin[1]} minute${Number(matchMin[1]) > 1 ? "s" : ""}.`;
      }
      return "Account temporarily locked due to multiple failed login attempts. Please try again later.";
    }
    if (clean.includes("খুব দ্রুত ক্লিক করছেন")) {
      return "You are clicking too fast! Please slow down and wait a moment.";
    }
    if (clean.includes("অনুরোধের সীমা অতিক্রম")) {
      return "Rate limit exceeded. Please wait a moment before trying again.";
    }
    if (clean.includes("এই ইমেইলটি ডাটাবেজে নেই")) {
      return "This email does not exist in our database.";
    }
    if (clean.includes("সিকিউরিটি কোড পাঠানো যায়নি")) {
      return "Unable to send security verification code. Please try again.";
    }
    if (clean.includes("পাসওয়ার্ড রিসেট করতে সমস্যা")) {
      return "Failed to reset password. Please try again.";
    }
    if (clean.includes("নিরাপত্তার স্বার্থে ইনঅ্যাক্টিভিটির কারণে")) {
      return "You were automatically signed out due to inactivity to protect your account. Please log in again.";
    }
    if (clean.includes("অ্যাকাউন্টটি অ্যাডমিনিস্ট্রেটর কর্তৃক ব্লক")) {
      return "Your account has been blocked by an administrator. Please contact support.";
    }
  }

  // Known dictionary translations for Bengali locale
  if (lang === "bn") {
    if (/bad credentials|invalid email or password/i.test(clean)) {
      return "ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।";
    }
    if (/5 consecutive failed login attempts|locked for 30 minutes/i.test(clean)) {
      return "অ্যাকাউন্টে ৫ বার ভুল পাসওয়ার্ড দেওয়ার কারণে ৩০ মিনিটের জন্য সাময়িকভাবে ব্লক করা হয়েছে। ৩০ মিনিট পর স্বয়ংক্রিয়ভাবে আনলক হবে।";
    }
    if (/remaining before a 30-minute lockout/i.test(clean)) {
      const m = clean.match(/(\d+)\s*attempt/i);
      if (m) {
        return `ইমেইল অথবা পাসওয়ার্ড সঠিক নয়। আর ${m[1]} বার ভুল হলে অ্যাকাউন্ট ৩০ মিনিটের জন্য লক হয়ে যাবে।`;
      }
      return "ইমেইল অথবা পাসওয়ার্ড সঠিক নয়। অতিরিক্ত ভুল হলে অ্যাকাউন্ট ৩০ মিনিটের জন্য লক হয়ে যাবে।";
    }
    if (/temporarily locked due to multiple failed login attempts/i.test(clean)) {
      const m = clean.match(/after\s+(\d+)\s+minute/i);
      if (m) {
        return `অ্যাকাউন্টে একাধিক ভুল প্রচেষ্টার কারণে সাময়িকভাবে ব্লক করা হয়েছে। অনুগ্রহ করে আরও ${m[1]} মিনিট পর চেষ্টা করুন।`;
      }
      return "অ্যাকাউন্টে একাধিক ভুল প্রচেষ্টার কারণে সাময়িকভাবে ব্লক করা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর চেষ্টা করুন।";
    }
    if (/clicking too fast/i.test(clean)) {
      return "আপনি খুব দ্রুত ক্লিক করছেন! দয়া করে কিছুক্ষণ অপেক্ষা করে আবার চেষ্টা করুন।";
    }
    if (/rate limit exceeded/i.test(clean)) {
      return "অনুরোধের সীমা অতিক্রম করেছে। দয়া করে কিছুক্ষণ অপেক্ষা করে আবার চেষ্টা করুন।";
    }
    if (/email does not exist/i.test(clean)) {
      return "এই ইমেইলটি ডাটাবেজে নেই।";
    }
    if (/student id is already registered/i.test(clean)) {
      return "এই স্টুডেন্ট আইডিটি দিয়ে ইতিমধ্যে অ্যাকাউন্ট খোলা হয়েছে!";
    }
    if (/email is already registered/i.test(clean)) {
      return "এই ইমেইলটি দিয়ে ইতিমধ্যে অ্যাকাউন্ট খোলা হয়েছে!";
    }
    if (/registration failed/i.test(clean)) {
      return "রেজিস্ট্রেশন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।";
    }
    if (/authentication failed/i.test(clean)) {
      return "লগইন করা যায়নি। ইমেইল ও পাসওয়ার্ড যাচাই করুন।";
    }
    if (/account has been blocked/i.test(clean)) {
      return "আপনার অ্যাকাউন্টটি অ্যাডমিনিস্ট্রেটর কর্তৃক ব্লক করা হয়েছে।";
    }
  }

  return clean;
}
