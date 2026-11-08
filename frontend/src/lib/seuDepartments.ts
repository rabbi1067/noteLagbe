import { useState, useEffect } from "react";

export interface DepartmentItem {
  id: string;
  code: string;
  name: string;
  nameBn: string;
  degreeName?: string;
  faculty: string;
  facultyBn?: string;
  status?: "active" | "coming_soon";
  isLive: boolean; // Strictly true only for CSE
  count?: number;
}

// Exactly the 11 official departments from https://seu.edu.bd/programs
export const OFFICIAL_SEU_DEPARTMENTS: DepartmentItem[] = [
  {
    id: "CSE",
    code: "CSE",
    name: "Department of Computer Science & Engineering",
    nameBn: "কম্পিউটার সায়েন্স অ্যান্ড ইঞ্জিনিয়ারিং বিভাগ",
    faculty: "School of Engineering (SE)",
    isLive: true,
  },
  {
    id: "EEE",
    code: "EEE",
    name: "Department of Electrical & Electronic Engineering",
    nameBn: "ইলেকট্রিক্যাল অ্যান্ড ইলেকট্রনিক ইঞ্জিনিয়ারিং বিভাগ",
    faculty: "School of Engineering (SE)",
    isLive: false,
  },
  {
    id: "ARCH",
    code: "ARCH",
    name: "Department of Architecture",
    nameBn: "স্থাপত্য বিভাগ (আর্কিটেকচার)",
    faculty: "School of Engineering (SE)",
    isLive: false,
  },
  {
    id: "TEX",
    code: "TEX",
    name: "Department of Textile Engineering",
    nameBn: "টেক্সটাইল ইঞ্জিনিয়ারিং বিভাগ",
    faculty: "School of Engineering (SE)",
    isLive: false,
  },
  {
    id: "PHR",
    code: "PHR",
    name: "Department of Pharmacy",
    nameBn: "ফার্মেসি বিভাগ",
    faculty: "School of Science (SS)",
    isLive: false,
  },
  {
    id: "BBA",
    code: "BBA",
    name: "Southeast Business School",
    nameBn: "সাউথইস্ট বিজনেস স্কুল",
    faculty: "School of Business Studies (SBS)",
    isLive: false,
  },
  {
    id: "LAW",
    code: "LAW",
    name: "Department of Law & Justice",
    nameBn: "আইন ও বিচার বিভাগ",
    faculty: "School of Law (SL)",
    isLive: false,
  },
  {
    id: "ENG",
    code: "ENG",
    name: "Department of English",
    nameBn: "ইংরেজি বিভাগ",
    faculty: "School of Arts & Social Sciences (SASS)",
    isLive: false,
  },
  {
    id: "BNG",
    code: "BNG",
    name: "Department of Bangla",
    nameBn: "বাংলা বিভাগ",
    faculty: "School of Arts & Social Sciences (SASS)",
    isLive: false,
  },
  {
    id: "ECO",
    code: "ECO",
    name: "Department of Economics",
    nameBn: "অর্থনীতি বিভাগ",
    faculty: "School of Arts & Social Sciences (SASS)",
    isLive: false,
  },
  {
    id: "ICT",
    code: "ICT",
    name: "Department of Information & Communication Technology",
    nameBn: "ইনফরমেশন অ্যান্ড কমিউনিকেশন টেকনোলজি বিভাগ",
    faculty: "School of Information Technology (SIT)",
    isLive: false,
  },
];

export const normalizeDeptCode = (code: string): string => {
  const c = (code || "").toUpperCase().trim();
  if (c === "TE") return "TEX";
  if (c === "PHAR") return "PHR";
  if (c === "BEN") return "BNG";
  return c;
};

// Check if a code belongs to official SEU departments
export const isOfficialSeuDept = (code: string): boolean => {
  const norm = normalizeDeptCode(code);
  return OFFICIAL_SEU_DEPARTMENTS.some((d) => d.code === norm);
};

// Dynamic hook that auto-syncs with /api/departments (which fetches live from seu.edu.bd/programs)
export function useSeuDepartments() {
  const [departments, setDepartments] = useState<DepartmentItem[]>(OFFICIAL_SEU_DEPARTMENTS);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<string>("static");

  useEffect(() => {
    let isMounted = true;
    async function syncDepartments() {
      try {
        setLoading(true);
        const res = await fetch("/api/departments");
        if (!res.ok) throw new Error("Failed to fetch departments API");
        const json = await res.json();
        if (json.departments && Array.isArray(json.departments) && isMounted) {
          // Map to uniform DepartmentItem ensuring CSE is the only active live dept
          const liveList: DepartmentItem[] = json.departments.map((d: any) => ({
            id: d.code,
            code: d.code,
            name: d.name,
            nameBn: d.nameBn || d.name,
            degreeName: d.degreeName,
            faculty: d.faculty,
            status: d.code === "CSE" ? ("active" as const) : ("coming_soon" as const),
            isLive: d.code === "CSE",
          }));
          setDepartments(liveList);
          setSource(json.source || "api");
        }
      } catch {
        // Fallback already active, keep calm
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    syncDepartments();
    return () => {
      isMounted = false;
    };
  }, []);

  return { departments, loading, source };
}
