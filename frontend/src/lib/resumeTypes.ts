export type ResumeTemplateId =
  | "latex-ats"
  | "german-lebenslauf"
  | "europe-minimal"
  | "modern-sidebar"
  | "corporate-minimal";

export type ResumeSectionKey =
  | "summary"
  | "education"
  | "skills"
  | "projects"
  | "experience"
  | "achievements"
  | "certifications"
  | "languages"
  | "references";

export type ResumeDensity = "compact" | "normal";
export type ResumeFontChoice = "serif" | "sans";

export interface ResumeDesignConfig {
  template: ResumeTemplateId;
  accentColor: string;
  density: ResumeDensity;
  font: ResumeFontChoice;
  showPhoto: boolean;
  showCgpa: boolean;
  showGermanSignature: boolean;
  autoFitScale: number; // 0.80 .. 1.0
  sectionOrder: ResumeSectionKey[];
  hiddenSections: ResumeSectionKey[];
}

export interface ResumeEducationItem {
  id: string;
  institution: string;
  degree: string;
  period: string;
  cgpa: string;
  location: string;
}

export interface ResumeSkillGroup {
  id: string;
  category: string;
  items: string;
}

export interface ResumeProjectItem {
  id: string;
  name: string;
  techStack: string;
  link: string;
  description: string;
}

export interface ResumeExperienceItem {
  id: string;
  role: string;
  organization: string;
  period: string;
  bullets: string[];
}

export interface ResumeLanguageItem {
  id: string;
  name: string;
  proficiency: string;
}

export interface ResumeReferenceItem {
  id: string;
  name: string;
  title: string;
  organization: string;
  phone: string;
  email: string;
}

export interface ResumeData {
  fullName: string;
  headline: string;
  phone: string;
  email: string;
  address: string;
  linkedin: string;
  github: string;
  portfolio: string;
  competitiveProfile: string;
  photoDataUrl: string;
  // Germany & Europe personal metadata
  dateOfBirth: string;
  nationality: string;
  signaturePlaceDate: string;
  // Sections
  summary: string;
  education: ResumeEducationItem[];
  skills: ResumeSkillGroup[];
  projects: ResumeProjectItem[];
  experience: ResumeExperienceItem[];
  achievements: string[];
  certifications: string[];
  languages: ResumeLanguageItem[];
  referencesOnRequest: boolean;
  references: ResumeReferenceItem[];
}

export const RESUME_TEMPLATE_META: {
  id: ResumeTemplateId;
  nameEn: string;
  nameBn: string;
  tag: string;
  descEn: string;
  descBn: string;
  supportsPhoto: boolean;
}[] = [
  {
    id: "latex-ats",
    nameEn: "LaTeX ATS Classic",
    nameBn: "LaTeX ATS ক্লাসিক",
    tag: "ATS #1",
    descEn: "Single-column serif CV built for tech & international ATS.",
    descBn: "টেক ও ইন্টারন্যাশনাল ATS স্ক্যানারের জন্য সিঙ্গেল-কলাম সেরিফ CV।",
    supportsPhoto: false,
  },
  {
    id: "german-lebenslauf",
    nameEn: "Germany (Lebenslauf)",
    nameBn: "জার্মানি স্টাইল (Lebenslauf)",
    tag: "GERMANY",
    descEn: "Structured German tabular CV with photo, DOB & signature.",
    descBn: "ছবি, জন্মতারিখ, জাতীয়তা ও স্বাক্ষর লাইনসহ জার্মান Lebenslauf।",
    supportsPhoto: true,
  },
  {
    id: "europe-minimal",
    nameEn: "Europe Minimal",
    nameBn: "ইউরোপ মিনিমাল স্টাইল",
    tag: "EUROPE",
    descEn: "Clean two-column European CV with circular photo & CEFR languages.",
    descBn: "গোল ছবি, CEFR ভাষা লেভেল ও রেফারেন্সসহ ইউরোপিয়ান ২-কলাম CV।",
    supportsPhoto: true,
  },
  {
    id: "modern-sidebar",
    nameEn: "Modern Sidebar",
    nameBn: "মডার্ন সাইডবার স্টাইল",
    tag: "MODERN",
    descEn: "Bold accent left sidebar with pill headings & circular photo.",
    descBn: "কালার সাইডবার, পিল হেডিং ও গোল ফটোসহ আধুনিক CV।",
    supportsPhoto: true,
  },
  {
    id: "corporate-minimal",
    nameEn: "Corporate Minimal",
    nameBn: "করপোরেট মিনিমাল",
    tag: "CORPORATE",
    descEn: "Clean modern single-column for BBA, banking & corporate roles.",
    descBn: "BBA, ব্যাংকিং ও করপোরেট চাকরির জন্য পরিষ্কার সিঙ্গেল-কলাম CV।",
    supportsPhoto: true,
  },
];

export const RESUME_ACCENT_COLORS = [
  { name: "Classic Slate Navy", hex: "#4f637d" },
  { name: "Royal Blue", hex: "#1d4ed8" },
  { name: "Midnight Charcoal", hex: "#1e293b" },
  { name: "Emerald", hex: "#065f46" },
  { name: "Deep Burgundy", hex: "#7f1d1d" },
];

export const DEFAULT_SECTION_ORDER: ResumeSectionKey[] = [
  "summary",
  "education",
  "skills",
  "projects",
  "experience",
  "achievements",
  "certifications",
  "languages",
  "references",
];

export const SECTION_LABELS: Record<ResumeSectionKey, { en: string; bn: string }> = {
  summary: { en: "Summary / Objective", bn: "সামারি / অবজেক্টিভ" },
  education: { en: "Education", bn: "শিক্ষাগত যোগ্যতা" },
  skills: { en: "Technical & Core Skills", bn: "দক্ষতা (Skills)" },
  projects: { en: "Projects", bn: "প্রজেক্টসমূহ" },
  experience: { en: "Experience & Activities", bn: "অভিজ্ঞতা ও কার্যক্রম" },
  achievements: { en: "Achievements & Awards", bn: "অর্জন ও পুরস্কার" },
  certifications: { en: "Certifications", bn: "সার্টিফিকেশন" },
  languages: { en: "Languages", bn: "ভাষা দক্ষতা" },
  references: { en: "References", bn: "রেফারেন্স" },
};

export const SUMMARY_PRESETS: { labelEn: string; labelBn: string; text: string }[] = [
  {
    labelEn: "CSE Software Intern",
    labelBn: "CSE সফটওয়্যার ইন্টার্ন",
    text: "Motivated Computer Science & Engineering undergraduate at Southeast University with strong problem-solving fundamentals in Data Structures, Algorithms, and full-stack web development. Eager to contribute to production software engineering teams.",
  },
  {
    labelEn: "Research & ML Student",
    labelBn: "রিসার্চ ও ML স্টুডেন্ট",
    text: "Analytical CSE student passionate about Machine Learning, data systems, and academic research. Experienced in Python, Java, LaTeX documentation, and collaborative technical fieldwork.",
  },
  {
    labelEn: "BBA / Business Fresh Grad",
    labelBn: "BBA / করপোরেট ফ্রেশার",
    text: "Detail-oriented Business Administration graduate with strong skills in financial analysis, client communication, project coordination, and MS Office productivity suites.",
  },
];

export const DEFAULT_DESIGN_CONFIG: ResumeDesignConfig = {
  template: "latex-ats",
  accentColor: "#4f637d",
  density: "compact",
  font: "serif",
  showPhoto: true,
  showCgpa: true,
  showGermanSignature: true,
  autoFitScale: 1,
  sectionOrder: [...DEFAULT_SECTION_ORDER],
  hiddenSections: [],
};

export function createSampleStudentResume(): ResumeData {
  return {
    fullName: "Ariful Islam",
    headline: "Computer Science & Engineering Student • Full-Stack & ML Enthusiast",
    phone: "+880 1712-345678",
    email: "ariful.cse@seu.edu.bd",
    address: "Tejgaon, Dhaka-1208, Bangladesh",
    linkedin: "linkedin.com/in/ariful-seu",
    github: "github.com/ariful-cse",
    portfolio: "arifuldev.vercel.app",
    competitiveProfile: "codeforces.com/profile/ariful_cf",
    photoDataUrl: "",
    dateOfBirth: "14 May 2002",
    nationality: "Bangladeshi",
    signaturePlaceDate: "Dhaka, 12 November 2026",
    summary:
      "Computer Science and Engineering undergraduate at Southeast University (CGPA: 3.82) with a strong foundation in algorithms, object-oriented programming, and web development. Experienced in Java, Python, TypeScript, and React with hands-on exposure to database management and Git workflows.",
    education: [
      {
        id: "edu-1",
        institution: "Southeast University, Dhaka",
        degree: "B.Sc. in Computer Science and Engineering (CSE)",
        period: "2023 – 2027 (Expected)",
        cgpa: "3.82 / 4.00",
        location: "Dhaka, Bangladesh",
      },
      {
        id: "edu-2",
        institution: "Govt. Science College, Dhaka",
        degree: "Higher Secondary Certificate (HSC), Science",
        period: "2020 – 2022",
        cgpa: "5.00 / 5.00",
        location: "Dhaka, Bangladesh",
      },
    ],
    skills: [
      {
        id: "sk-1",
        category: "Programming",
        items: "C, C++, Java, Python, TypeScript, SQL",
      },
      {
        id: "sk-2",
        category: "Frameworks & Web",
        items: "React, Next.js, Tailwind CSS, Spring Boot",
      },
      {
        id: "sk-3",
        category: "Tools & Core",
        items: "Git, GitHub, LaTeX, PostgreSQL, Docker, Linux",
      },
      {
        id: "sk-4",
        category: "CS Fundamentals",
        items: "Data Structures, Algorithms, OOP, DBMS, REST APIs, Problem Solving",
      },
    ],
    projects: [
      {
        id: "proj-1",
        name: "Campus Course & Archive Portal",
        techStack: "Next.js, TypeScript, Spring Boot",
        link: "github.com/ariful-cse/campus-portal",
        description:
          "Built a searchable academic note & past question platform serving 500+ university students with instant course filtering.",
      },
      {
        id: "proj-2",
        name: "Smart Attendance & Routine CLI",
        techStack: "Java, OOP, File I/O",
        link: "github.com/ariful-cse/routine-cli",
        description:
          "Designed a clash-detection class schedule validator and attendance tracker for semester advising.",
      },
    ],
    experience: [
      {
        id: "exp-1",
        role: "Undergraduate Teaching Assistant (Problem Solving)",
        organization: "Dept. of CSE, Southeast University",
        period: "Jan 2025 – Present",
        bullets: [
          "Guided 60+ freshman students through C programming labs and debugging sessions.",
          "Prepared weekly contest problem sets and reviewed lab code submissions.",
        ],
      },
      {
        id: "exp-2",
        role: "Executive Member — Technical Wing",
        organization: "SEU Computer Club",
        period: "2024 – 2025",
        bullets: [
          "Co-organized intra-university programming contests and Git/LaTeX workshops.",
        ],
      },
    ],
    achievements: [
      "Honorable Mention — ICPC Asia Dhaka Preliminary Contest 2024",
      "Dean's Honor List Scholar — Spring 2024 & Summer 2024, Southeast University",
      "Finalist — Southeast University Intra-Department Software Hackathon 2024",
    ],
    certifications: [
      "CS50x Introduction to Computer Science — HarvardX (2024)",
      "Supervised Machine Learning: Regression & Classification — Coursera (2025)",
    ],
    languages: [
      { id: "lang-1", name: "Bangla", proficiency: "Native (C2)" },
      { id: "lang-2", name: "English", proficiency: "Fluent (C1)" },
      { id: "lang-3", name: "German", proficiency: "Elementary (A2)" },
    ],
    referencesOnRequest: false,
    references: [
      {
        id: "ref-1",
        name: "Md. Mijanur Rahman",
        title: "Assistant Professor",
        organization: "Southeast University",
        phone: "+880 1700-000000",
        email: "mijanur.rahman@seu.edu.bd",
      },
      {
        id: "ref-2",
        name: "Dr. Farhana Akter",
        title: "Associate Professor",
        organization: "Dept. of CSE, SEU",
        phone: "+880 1711-000000",
        email: "farhana.akter@seu.edu.bd",
      },
    ],
  };
}

export function createEmptyResume(): ResumeData {
  return {
    fullName: "",
    headline: "",
    phone: "",
    email: "",
    address: "",
    linkedin: "",
    github: "",
    portfolio: "",
    competitiveProfile: "",
    photoDataUrl: "",
    dateOfBirth: "",
    nationality: "Bangladeshi",
    signaturePlaceDate: "",
    summary: "",
    education: [
      {
        id: `edu-${Date.now()}`,
        institution: "Southeast University",
        degree: "",
        period: "",
        cgpa: "",
        location: "Dhaka, Bangladesh",
      },
    ],
    skills: [
      { id: `sk-${Date.now()}`, category: "Technical Skills", items: "" },
    ],
    projects: [],
    experience: [],
    achievements: [],
    certifications: [],
    languages: [
      { id: `lang-${Date.now()}`, name: "Bangla", proficiency: "Native" },
      { id: `lang-${Date.now() + 1}`, name: "English", proficiency: "Fluent" },
    ],
    referencesOnRequest: true,
    references: [],
  };
}
