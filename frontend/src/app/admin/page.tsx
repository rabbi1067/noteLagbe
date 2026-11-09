"use client";

import AdminAnalyticsView from "@/components/AdminAnalyticsView";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import NotificationBell from "@/components/NotificationBell";
import BrandLogo from "@/components/BrandLogo";
import { api, ChatMessageDto } from "@/lib/api";
import { notifyDataChanged, useDataSync } from "@/lib/sync";
import {
  ShieldCheck,
  CreditCard,
  Upload,
  Users,
  BookOpen,
  Sparkles,
  Lock,
  Phone,
  MapPin,
  Plus,
  Trash2,
  Edit3,
  Pencil,
  ExternalLink,
  Check,
  X,
  Search,
  Filter,
  FileText,
  HelpCircle,
  AlertCircle,
  GraduationCap,
  RefreshCw,
  FolderOpen,
  Mail,
  Laptop,
  Star,
  EyeOff,
  User,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Layers,
  Settings,
  Activity,
  Globe,
  History,
  Menu,
  ChevronDown,
  LogOut,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  BarChart3,
  Building2,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Sliders,
  Award,
  Sun,
  Moon,
  Ban,
  KeyRound,
  ShieldAlert,
  UserCheck,
  Save,
  Camera,
  Image as ImageIcon,
  Link as LinkIcon,
  Download,
  FileQuestion,
  Megaphone,
  MessageSquare,
  Pin,
  Pause,
  PinOff,
  Volume2,
  Play,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import SearchableCourseSelect, { sortCoursesNaturally } from "@/components/SearchableCourseSelect";
import SearchableTeacherSelect from "@/components/SearchableTeacherSelect";
import FacultyAvatar from "@/components/FacultyAvatar";
import { DeleteConfirmationModal, DeleteSuccessModal } from "@/components/DeleteConfirmationModal";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  itemName?: string;
}

function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  itemName = "items",
}: PaginationProps) {
  if (totalItems <= 0) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, "...", totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
      <div className="text-slate-500 font-medium">
        Showing <span className="font-bold text-slate-800 dark:text-slate-200">{startItem}</span> to{" "}
        <span className="font-bold text-slate-800 dark:text-slate-200">{endItem}</span> of{" "}
        <span className="font-bold text-slate-800 dark:text-slate-200">{totalItems}</span> {itemName}
      </div>

      <div className="flex items-center gap-1.5 self-center sm:self-auto flex-wrap">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-700 transition-colors"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </button>

        {getPageNumbers().map((p, idx) =>
          typeof p === "number" ? (
            <button
              key={idx}
              onClick={() => onPageChange(p)}
              className={`w-7 h-7 rounded-lg font-bold text-xs transition-colors ${
                currentPage === p
                  ? "bg-blue-600 text-white shadow-sm"
                  : "border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
              }`}
            >
              {p}
            </button>
          ) : (
            <span key={idx} className="px-1 text-slate-400 font-bold select-none">
              ...
            </span>
          )
        )}

        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-700 transition-colors"
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </button>
      </div>
    </div>
  );
}

const DEFAULT_DEPARTMENT_META: Record<
  string,
  { code: string; name: string; school: string; gradient: string }
> = {
  CSE: {
    code: "CSE",
    name: "Computer Science & Engineering",
    school: "School of Science & Engineering",
    gradient: "from-blue-600 to-indigo-600",
  },
  SWE: {
    code: "SWE",
    name: "Software Engineering",
    school: "School of Science & Engineering",
    gradient: "from-cyan-600 to-blue-600",
  },
  SOFTWARE: {
    code: "SWE",
    name: "Software Engineering",
    school: "School of Science & Engineering",
    gradient: "from-cyan-600 to-blue-600",
  },
  ICT: {
    code: "ICT",
    name: "Information & Communication Technology",
    school: "School of Science & Engineering",
    gradient: "from-teal-600 to-emerald-600",
  },
  EEE: {
    code: "EEE",
    name: "Electrical & Electronic Engineering",
    school: "School of Science & Engineering",
    gradient: "from-amber-600 to-orange-600",
  },
  TEX: {
    code: "TEX",
    name: "Textile Engineering",
    school: "School of Science & Engineering",
    gradient: "from-purple-600 to-pink-600",
  },
  TEXTILE: {
    code: "TEX",
    name: "Textile Engineering",
    school: "School of Science & Engineering",
    gradient: "from-purple-600 to-pink-600",
  },
  PHR: {
    code: "PHR",
    name: "Pharmacy",
    school: "School of Health Sciences",
    gradient: "from-emerald-600 to-teal-700",
  },
  PHARMACY: {
    code: "PHR",
    name: "Pharmacy",
    school: "School of Health Sciences",
    gradient: "from-emerald-600 to-teal-700",
  },
  BBA: {
    code: "BBA",
    name: "Business Administration",
    school: "School of Business Studies",
    gradient: "from-blue-700 to-sky-600",
  },
  LAW: {
    code: "LAW",
    name: "Law & Justice",
    school: "School of Law & Governance",
    gradient: "from-rose-600 to-red-700",
  },
  ENG: {
    code: "ENG",
    name: "English Language & Literature",
    school: "School of Arts & Social Sciences",
    gradient: "from-violet-600 to-purple-700",
  },
  ENGLISH: {
    code: "ENG",
    name: "English Language & Literature",
    school: "School of Arts & Social Sciences",
    gradient: "from-violet-600 to-purple-700",
  },
  BNG: {
    code: "BNG",
    name: "Bangla",
    school: "School of Arts & Social Sciences",
    gradient: "from-emerald-700 to-green-800",
  },
  BANGLA: {
    code: "BNG",
    name: "Bangla",
    school: "School of Arts & Social Sciences",
    gradient: "from-emerald-700 to-green-800",
  },
  ECO: {
    code: "ECO",
    name: "Economics",
    school: "School of Arts & Social Sciences",
    gradient: "from-teal-600 to-cyan-700",
  },
  ECONOMICS: {
    code: "ECO",
    name: "Economics",
    school: "School of Arts & Social Sciences",
    gradient: "from-teal-600 to-cyan-700",
  },
  ARCH: {
    code: "ARCH",
    name: "Architecture",
    school: "School of Science & Engineering",
    gradient: "from-indigo-600 to-fuchsia-600",
  },
};

// Official 11 departments strictly synced from Southeast University (seu.edu.bd/programs)
const DEFAULT_DEPARTMENT_CODES = [
  "CSE",
  "EEE",
  "ARCH",
  "TEX",
  "PHR",
  "BBA",
  "LAW",
  "ENG",
  "BNG",
  "ECO",
  "ICT",
];

const DEPT_CODE_ALIASES: Record<string, string> = {
  SOFTWARE: "CSE",
  ENGLISH: "ENG",
  TEXTILE: "TEX",
  TE: "TEX",
  PHARMACY: "PHR",
  BANGLA: "BNG",
  BEN: "BNG",
  ECONOMICS: "ECO",
  ARCHITECTURE: "ARCH",
  SWE: "CSE",
  ENG: "ENG",
  TEX: "TEX",
  PHR: "PHR",
  BNG: "BNG",
  ECO: "ECO",
  ARCH: "ARCH",
  EEE: "EEE",
  CSE: "CSE",
  ICT: "ICT",
  BBA: "BBA",
  LAW: "LAW",
};

const normalizeDeptCode = (code?: string): string => {
  if (!code) return "CSE";
  const upper = code.trim().toUpperCase();
  return DEPT_CODE_ALIASES[upper] || upper;
};

const isDeptMatch = (itemDept?: string, targetDept?: string) => {
  if (!itemDept || !targetDept) return false;
  const a = itemDept.trim().toUpperCase();
  const b = targetDept.trim().toUpperCase();
  if (a === b) return true;
  const na = DEPT_CODE_ALIASES[a] || a;
  const nb = DEPT_CODE_ALIASES[b] || b;
  return na === nb;
};

export default function AdminDashboardPage() {
  const { user, isAuthenticated, logout, refreshProfile } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const { theme, toggleTheme, isDark } = useTheme();
  const router = useRouter();

  // Navigation & Layout States
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "analytics"
    | "departments"
    | "resources"
    | "courses"
    | "teachers"
    | "courseTeachers"
    | "payments"
    | "contributions"
    | "waivers"
    | "reviews"
    | "staff"
    | "settings"
    | "notices"
    | "chat"
    | "activityLogs"
  >("overview");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Top-Right Executive Profile Dropdown State
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileDropdownOpen(false);
      }
    };
    if (profileDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileDropdownOpen]);

  // Global Data
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [contributions, setContributions] = useState<any[]>([]);
  const [waivers, setWaivers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [adminReviews, setAdminReviews] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState<boolean>(true);
  const [togglingEmail, setTogglingEmail] = useState(false);
  const [syncingCse, setSyncingCse] = useState(false);

  // Pagination Settings
  const RESOURCE_PAGE_SIZE = 10;
  const COURSE_PAGE_SIZE = 12;
  const TEACHER_PAGE_SIZE = 12;
  const PAYMENT_PAGE_SIZE = 6;
  const STAFF_PAGE_SIZE = 10;
  const CONTRIBUTION_PAGE_SIZE = 6;
  const WAIVER_PAGE_SIZE = 6;
  const REVIEW_PAGE_SIZE = 6;
  const FACULTY_COURSE_PAGE_SIZE = 6;
  const NOTICE_PAGE_SIZE = 8;

  // Pagination State
  const [resourcePage, setResourcePage] = useState(1);
  const [coursePage, setCoursePage] = useState(1);
  const [teacherPage, setTeacherPage] = useState(1);
  const [facultyCoursePage, setFacultyCoursePage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [staffPage, setStaffPage] = useState(1);
  const [contributionPage, setContributionPage] = useState(1);
  const [waiverPage, setWaiverPage] = useState(1);
  const [reviewPage, setReviewPage] = useState(1);
  const [noticePage, setNoticePage] = useState(1);

  // Search & Filters
  const [resourceSearch, setResourceSearch] = useState("");
  const [resourceTypeFilter, setResourceTypeFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [courseSearch, setCourseSearch] = useState("");
  const [courseDeptFilter, setCourseDeptFilter] = useState("ALL");
  const [courseTypeFilter, setCourseTypeFilter] = useState<"ALL" | "THEORY" | "LAB">("ALL");
  const [courseSemesterGroup, setCourseSemesterGroup] = useState<"ALL" | "1-4" | "5-8" | "9-12">("ALL");
  const [teacherSearch, setTeacherSearch] = useState("");
  const [teacherDeptFilter, setTeacherDeptFilter] = useState("ALL");
  const [teacherCategoryFilter, setTeacherCategoryFilter] = useState("ALL");
  const [matrixDeptFilter, setMatrixDeptFilter] = useState("ALL");
  const [reviewStatusFilter, setReviewStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");

  // Campus Notice Board States
  const [noticeSearch, setNoticeSearch] = useState("");
  const [noticeTypeFilter, setNoticeTypeFilter] = useState<string>("ALL");
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [editingNoticeId, setEditingNoticeId] = useState<number | null>(null);
  const [noticeText, setNoticeText] = useState("");
  const [noticeType, setNoticeType] = useState<"INFO" | "ALERT" | "IMPORTANT" | "UPDATE">("INFO");
  const [noticeLink, setNoticeLink] = useState("");
  const [noticeActive, setNoticeActive] = useState(true);
  const [noticePriority, setNoticePriority] = useState(0);
  const [noticeStartsAt, setNoticeStartsAt] = useState<string>("");
  const [noticeExpiresAt, setNoticeExpiresAt] = useState<string>("");
  const [savingNotice, setSavingNotice] = useState(false);

  // Live Chat Moderation States
  const [chatMessages, setChatMessages] = useState<ChatMessageDto[]>([]);
  const [pinnedChatMessage, setPinnedChatMessage] = useState<ChatMessageDto | null>(null);
  const [activeChatUsersCount, setActiveChatUsersCount] = useState<number>(0);
  const [chatSearch, setChatSearch] = useState("");
  const [chatSenderFilter, setChatSenderFilter] = useState<"ALL" | "STUDENT" | "FACULTY" | "ADMIN">("ALL");
  const [chatTypeFilter, setChatTypeFilter] = useState<"ALL" | "TEXT" | "VOICE" | "IMAGE">("ALL");
  const [chatDateFilter, setChatDateFilter] = useState<"ALL" | "TODAY" | "YESTERDAY" | "WEEK" | "CUSTOM">("ALL");
  const [chatCustomDate, setChatCustomDate] = useState<string>("");
  const [chatPage, setChatPage] = useState(1);
  const [chatPageSize, setChatPageSize] = useState(10);
  const [adminPreviewImage, setAdminPreviewImage] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<number | null>(null);
  const adminAudioRef = useRef<HTMLAudioElement | null>(null);

  // Department Management & Directory States
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [showDeptManageModal, setShowDeptManageModal] = useState(false);
  const [editingDeptCode, setEditingDeptCode] = useState<string | null>(null);
  const [deptFormCode, setDeptFormCode] = useState("");
  const [deptFormName, setDeptFormName] = useState("");
  const [savingDept, setSavingDept] = useState(false);

  // Custom Department full names mapping (e.g. { "ICT": "Information & Communication Technology" })
  const [customDeptNames, setCustomDeptNames] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem("notelagbe_admin_custom_dept_names");
      if (saved) {
        const parsed: Record<string, string> = JSON.parse(saved);
        const migrated: Record<string, string> = {};
        Object.entries(parsed).forEach(([key, val]) => {
          const normalized = normalizeDeptCode(key);
          migrated[normalized] = val;
        });
        setCustomDeptNames(migrated);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && Object.keys(customDeptNames).length > 0) {
      try {
        localStorage.setItem("notelagbe_admin_custom_dept_names", JSON.stringify(customDeptNames));
      } catch {}
    }
  }, [customDeptNames]);

  // Global Add Department State
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [newDeptInput, setNewDeptInput] = useState("");

  // Custom Departments registered by Admin (persisted in localStorage)
  const [customDepartments, setCustomDepartments] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("notelagbe_admin_custom_departments");
      if (saved) {
        const list: string[] = JSON.parse(saved);
        const migrated = Array.from(
          new Set(
            list
              .map((d) => normalizeDeptCode(d))
              .filter((d) => d && d !== "CE" && d !== "CIVIL")
          )
        );
        setCustomDepartments(migrated);
        localStorage.setItem("notelagbe_admin_custom_departments", JSON.stringify(migrated));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("notelagbe_admin_custom_departments", JSON.stringify(customDepartments));
      } catch {}
    }
  }, [customDepartments]);

  // Derived Dynamic Unique Departments across Courses, Teachers, and Admin entries (No Duplicates)
  const dynamicDepartments = useMemo(() => {
    const set = new Set<string>();
    DEFAULT_DEPARTMENT_CODES.forEach((d) => set.add(d.toUpperCase()));
    courses.forEach((c: any) => {
      if (c.department && typeof c.department === "string" && c.department.trim()) {
        const norm = normalizeDeptCode(c.department);
        if (norm !== "CE" && norm !== "CIVIL") set.add(norm);
      }
    });
    teachers.forEach((t: any) => {
      if (t.department && typeof t.department === "string" && t.department.trim()) {
        const norm = normalizeDeptCode(t.department);
        if (norm !== "CE" && norm !== "CIVIL") set.add(norm);
      }
    });
    customDepartments.forEach((d) => {
      if (d && typeof d === "string" && d.trim()) {
        const norm = normalizeDeptCode(d);
        if (norm !== "CE" && norm !== "CIVIL") set.add(norm);
      }
    });
    return Array.from(set).sort();
  }, [courses, teachers, customDepartments]);

  // Course-Faculty Matrix State
  const [cfMode, setCfMode] = useState<"byCourse" | "byFaculty">("byCourse");
  const [selectedCourseForFaculty, setSelectedCourseForFaculty] = useState<string>("");
  const [teacherToAssignId, setTeacherToAssignId] = useState<number | "">("");
  const [selectedFacultyId, setSelectedFacultyId] = useState<number | "">("");
  const [courseToAssignCode, setCourseToAssignCode] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  // Modals & Forms
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [editingResource, setEditingResource] = useState<any | null>(null);
  const [resDeptFilter, setResDeptFilter] = useState("ALL");
  const [resCourseCode, setResCourseCode] = useState("");
  const [resTeacherId, setResTeacherId] = useState<number | "">("");
  const [resTitle, setResTitle] = useState("");
  const [resType, setResType] = useState("NOTE");
  const [resFileUrl, setResFileUrl] = useState("");
  const [resFileName, setResFileName] = useState("");
  const [resFileSize, setResFileSize] = useState("");
  const [uploadingResFile, setUploadingResFile] = useState(false);
  const [isResDragOver, setIsResDragOver] = useState(false);
  const resFileInputRef = useRef<HTMLInputElement>(null);
  const [resSemester, setResSemester] = useState("Fall 2026");
  const [resYear, setResYear] = useState(2026);
  const [savingResource, setSavingResource] = useState(false);

  // Course Modal
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any | null>(null);
  const [courseFormCode, setCourseFormCode] = useState("");
  const [courseFormTitle, setCourseFormTitle] = useState("");
  const [courseFormCredits, setCourseFormCredits] = useState(3.0);
  const [courseFormSemester, setCourseFormSemester] = useState(1);
  const [courseFormDept, setCourseFormDept] = useState("CSE");
  const [courseFormCustomDept, setCourseFormCustomDept] = useState("");
  const [courseFormIsCustomDept, setCourseFormIsCustomDept] = useState(false);
  const [courseFormIsLab, setCourseFormIsLab] = useState(false);
  const [courseFormPrereq, setCourseFormPrereq] = useState("");
  const [courseFormDesc, setCourseFormDesc] = useState("");
  const [courseFormTeacherId, setCourseFormTeacherId] = useState<number | "">("");
  const [savingCourse, setSavingCourse] = useState(false);

  // Helper to detect if a file URL is an image
  const isImageFile = (url?: string) => {
    if (!url) return false;
    const u = url.toLowerCase();
    return Boolean(
      u.match(/\.(jpg|jpeg|png|webp|gif|svg|avif)(\?.*)?$/i) ||
      u.includes("/image/upload/") ||
      u.includes("images.unsplash.com") ||
      (u.includes("cloudinary.com") && !u.endsWith(".pdf") && !u.includes("/raw/")) ||
      u.startsWith("data:image/")
    );
  };

  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotate, setImageRotate] = useState(0);

  // Edit Contribution Modal State
  const [editingContribution, setEditingContribution] = useState<any | null>(null);
  const [contribEditTitle, setContribEditTitle] = useState("");
  const [contribEditCourseCode, setContribEditCourseCode] = useState("");
  const [contribEditTeacherId, setContribEditTeacherId] = useState<string | number>("0");
  const [contribEditDept, setContribEditDept] = useState("CSE");
  const [contribEditType, setContribEditType] = useState("NOTE");
  const [contribEditSemester, setContribEditSemester] = useState("");
  const [contribEditFeedback, setContribEditFeedback] = useState("");
  const [savingContributionEdit, setSavingContributionEdit] = useState(false);

  const handleOpenEditContributionModal = (c: any) => {
    setEditingContribution(c);
    setContribEditTitle(c.uploadedResource?.title || "");
    setContribEditCourseCode(c.uploadedResource?.course?.code || "");
    setContribEditTeacherId(c.uploadedResource?.teacher?.id ? String(c.uploadedResource.teacher.id) : "0");
    setContribEditDept(c.uploadedResource?.department || c.uploadedResource?.course?.department || "CSE");
    setContribEditType(c.uploadedResource?.type || "NOTE");
    setContribEditSemester(c.uploadedResource?.semesterName || "");
    setContribEditFeedback(c.adminFeedback || "Verified and approved by academic admin! 2 reward courses unlocked.");
  };

  const handleSaveAndApproveContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContribution) return;

    if (contribEditTitle.trim().length < 5 || contribEditTitle.trim().length > 80) {
      toast.error("Material title must be between 5 and 80 characters.");
      return;
    }

    setSavingContributionEdit(true);
    try {
      await api.admin.approveContribution(editingContribution.id, {
        title: contribEditTitle.trim(),
        teacherId: contribEditTeacherId === "0" || !contribEditTeacherId ? null : Number(contribEditTeacherId),
        resourceType: contribEditType,
        semesterName: contribEditSemester.trim(),
        courseCode: contribEditCourseCode.trim(),
        department: contribEditDept.trim().toUpperCase(),
        feedback: contribEditFeedback.trim(),
      });

      notifyDataChanged("contribution", "approved", editingContribution.id);
      notifyDataChanged("subscription", "unlocked", editingContribution.id);
      notifyDataChanged("resource", "approved", editingContribution.uploadedResource?.id);
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      toast.success("Contribution updated and approved! Published with correct details.");
      setEditingContribution(null);
      loadAllAdminData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update and approve contribution");
    } finally {
      setSavingContributionEdit(false);
    }
  };

  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any | null>(null);
  const [teacherFormName, setTeacherFormName] = useState("");
  const [teacherFormInitial, setTeacherFormInitial] = useState("");
  const [teacherFormDesignation, setTeacherFormDesignation] = useState("");
  const [teacherFormRoom, setTeacherFormRoom] = useState("");
  const [teacherFormEmail, setTeacherFormEmail] = useState("");
  const [teacherFormPhone, setTeacherFormPhone] = useState("");
  const [teacherFormImage, setTeacherFormImage] = useState("");
  const [teacherFormCategory, setTeacherFormCategory] = useState("FULL_TIME_FACULTY");
  const [teacherFormDept, setTeacherFormDept] = useState("CSE");
  const [teacherFormCustomDept, setTeacherFormCustomDept] = useState("");
  const [teacherFormIsCustomDept, setTeacherFormIsCustomDept] = useState(false);
  const [savingTeacher, setSavingTeacher] = useState(false);
  const [uploadingTeacherImage, setUploadingTeacherImage] = useState(false);

  // Activity & Audit Logs State (365-Day Rolling Retention)
  const [activityLogsData, setActivityLogsData] = useState<{
    items: any[];
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    retentionPolicy: string;
    todayCount: number;
    uniqueIpCount: number;
  }>({
    items: [],
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 15,
    retentionPolicy: "Rolling 365-Day Retention Window",
    todayCount: 0,
    uniqueIpCount: 0,
  });
  const [activityLogPage, setActivityLogPage] = useState(1);
  const [activityLogSearch, setActivityLogSearch] = useState("");
  const [activityLogCategory, setActivityLogCategory] = useState("ALL");
  const [loadingActivityLogs, setLoadingActivityLogs] = useState(false);

  const loadActivityLogs = useCallback(
    async (page = 1, search = "", category = "ALL") => {
      setLoadingActivityLogs(true);
      try {
        const res = await api.admin.getActivityLogs({
          page,
          size: 15,
          search: search.trim() || undefined,
          actionType: category !== "ALL" ? category : undefined,
        });
        if (res) {
          setActivityLogsData(res);
        }
      } catch (err: any) {
        console.error("Failed to load activity logs:", err);
      } finally {
        setLoadingActivityLogs(false);
      }
    },
    []
  );


  // User Accounts & RBAC State
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffStudentId, setStaffStudentId] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffRole, setStaffRole] = useState("ROLE_STUDENT");
  const [savingStaff, setSavingStaff] = useState(false);

  // Edit User Modal & Actions
  const [showEditStaffModal, setShowEditStaffModal] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const [editStaffName, setEditStaffName] = useState("");
  const [editStaffEmail, setEditStaffEmail] = useState("");
  const [editStaffStudentId, setEditStaffStudentId] = useState("");
  const [editStaffRole, setEditStaffRole] = useState("ROLE_STUDENT");
  const [editStaffPhone, setEditStaffPhone] = useState("");
  const [editStaffAddress, setEditStaffAddress] = useState("");
  const [updatingStaff, setUpdatingStaff] = useState(false);
  const [togglingStaffId, setTogglingStaffId] = useState<number | null>(null);

  // User Accounts Search & Filtering
  const [userSearch, setUserSearch] = useState("");
  const [userRoleCategory, setUserRoleCategory] = useState<"ALL" | "STUDENTS" | "STAFF">("ALL");
  const [userSpecificRole, setUserSpecificRole] = useState("ALL");
  const [userStatusFilter, setUserStatusFilter] = useState("ALL");

  // Admin Profile & Security State
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminAddress, setAdminAddress] = useState("");
  const [adminAvatarUrl, setAdminAvatarUrl] = useState("");
  const [uploadingAdminAvatar, setUploadingAdminAvatar] = useState(false);
  const [removingAdminAvatar, setRemovingAdminAvatar] = useState(false);
  const [showAvatarUrlInput, setShowAvatarUrlInput] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState("");
  const [isEditingAdminProfile, setIsEditingAdminProfile] = useState(false);
  const [savingAdminProfile, setSavingAdminProfile] = useState(false);

  // Password Management State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Universal Delete Confirmation & Success Modal Suite
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    itemType?: string;
    itemName: string;
    warningText?: string;
    confirmButtonText?: string;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: "",
    itemType: "",
    itemName: "",
    warningText: "",
    confirmButtonText: "Permanently Delete",
    onConfirm: () => {},
  });
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);

  const [deleteSuccessModal, setDeleteSuccessModal] = useState<{
    isOpen: boolean;
    title: string;
    itemName?: string;
    message: string;
  }>({
    isOpen: false,
    title: "Deleted Successfully!",
    itemName: "",
    message: "",
  });

  const openDeleteConfirm = (config: {
    title: string;
    itemType?: string;
    itemName: string;
    warningText?: string;
    confirmButtonText?: string;
    onConfirm: () => Promise<void> | void;
  }) => {
    setDeleteConfirmModal({
      isOpen: true,
      title: config.title,
      itemType: config.itemType,
      itemName: config.itemName,
      warningText: config.warningText,
      confirmButtonText: config.confirmButtonText || "Permanently Delete",
      onConfirm: config.onConfirm,
    });
  };

  const showDeleteSuccess = (title: string, message: string, itemName?: string) => {
    setDeleteSuccessModal({
      isOpen: true,
      title,
      message,
      itemName,
    });
  };

  const handleExecuteDeleteConfirm = async () => {
    if (!deleteConfirmModal.onConfirm) return;
    setIsProcessingDelete(true);
    try {
      await deleteConfirmModal.onConfirm();
      notifyDataChanged("all", "deleted", deleteConfirmModal.itemName);
      setDeleteConfirmModal((prev) => ({ ...prev, isOpen: false }));
    } catch (err: any) {
      // Handled in individual onConfirm
    } finally {
      setIsProcessingDelete(false);
    }
  };

  const isAdmin = user?.role === "ROLE_ADMIN" || user?.role === "ROLE_SUPER_ADMIN" || user?.role === "ROLE_MANAGER";
  const isSuperAdmin = user?.role === "ROLE_SUPER_ADMIN";

  useEffect(() => {
    if (isAdmin && activeTab === "activityLogs") {
      loadActivityLogs(activityLogPage, activityLogSearch, activityLogCategory);
    }
  }, [isAdmin, activeTab, activityLogPage, activityLogCategory, loadActivityLogs]);

  // Real-time automatic polling (4 seconds) when viewing Security & Activity Logs tab
  useEffect(() => {
    if (!isAdmin || activeTab !== "activityLogs") return;
    const interval = setInterval(() => {
      loadActivityLogs(activityLogPage, activityLogSearch, activityLogCategory);
    }, 4000);
    return () => clearInterval(interval);
  }, [isAdmin, activeTab, activityLogPage, activityLogSearch, activityLogCategory, loadActivityLogs]);


  // Data Loading
  useEffect(() => {
    if (isAdmin) {
      loadAllAdminData(true);
    }
  }, [isAdmin]);

  // Restrict payments tab strictly to Super Admin
  useEffect(() => {
    if (!isSuperAdmin && activeTab === "payments") {
      setActiveTab("overview");
    }
  }, [isSuperAdmin, activeTab]);

  // Enterprise Live Sync: Keep admin dashboard synchronized if changes happen in other tabs or server
  useDataSync((payload) => {
    if (isAdmin && payload?.action !== "admin_broadcast") {
      loadAllAdminData(true);
      if (activeTab === "activityLogs" || payload?.entity === "activity_log") {
        loadActivityLogs(activityLogPage, activityLogSearch, activityLogCategory);
      }
    }
  });

  // Reset pagination on filter changes (defined before any returns)
  useEffect(() => {
    setResourcePage(1);
  }, [resourceSearch, resourceTypeFilter, departmentFilter]);

  useEffect(() => {
    setCoursePage(1);
  }, [courseSearch, courseDeptFilter]);

  useEffect(() => {
    setTeacherPage(1);
  }, [teacherSearch, teacherDeptFilter]);

  useEffect(() => {
    setReviewPage(1);
  }, [reviewStatusFilter]);

  useEffect(() => {
    setNoticePage(1);
  }, [noticeSearch, noticeTypeFilter]);

  useEffect(() => {
    setFacultyCoursePage(1);
  }, [selectedCourseForFaculty, selectedFacultyId, cfMode, matrixDeptFilter]);

  useEffect(() => {
    setStaffPage(1);
  }, [userSearch, userRoleCategory, userSpecificRole, userStatusFilter]);

  const loadAllAdminData = async (isInitial = false) => {
    setLoading(true);
    try {
      const [sData, rData, pData, staffData, cData, wData, cList, tList, settingsData, revData, profileData, noticeData, chatMsgs, pinnedChat, chatActiveData] = await Promise.all([
        api.admin.getStats().catch(() => null),
        api.admin.getResources().catch(() => []),
        isSuperAdmin ? api.admin.getPayments("PENDING").catch(() => []) : Promise.resolve([]),
        api.admin.getStaff().catch(() => []),
        api.admin.getContributions("PENDING").catch(() => []),
        api.admin.getWaivers("PENDING").catch(() => []),
        api.courses.getAll().catch(() => []),
        api.teachers.getAll().catch(() => []),
        api.admin.getSettings().catch(() => ({ emailNotificationsEnabled: true })),
        api.admin.getReviews().catch(() => []),
        api.admin.getProfile().catch(() => null),
        api.admin.getNotices().catch(() => []),
        api.chat.getMessages().catch(() => []),
        api.chat.getPinned().catch(() => null),
        api.chat.getActiveCount().catch(() => ({ activeCount: 0 })),
      ]);
      setStats(sData);
      setResources(rData || []);
      setPayments(pData || []);
      setStaffList(staffData || []);
      setContributions(cData || []);
      setWaivers(wData || []);
      // Pre-fetch activity logs stats
      api.admin.getActivityLogs({ page: 1, size: 15 }).then((logData) => {
        if (logData) setActivityLogsData(logData);
      }).catch(() => {});
      const sortedCourses = sortCoursesNaturally(cList || []);
      setCourses(sortedCourses);
      setTeachers(tList || []);
      if (tList && tList.length > 0 && !selectedFacultyId) {
        setSelectedFacultyId(tList[0].id);
      }
      setAdminReviews(revData || []);
      setNotices(noticeData || []);
      setChatMessages(chatMsgs || []);
      setPinnedChatMessage(pinnedChat || null);
      setActiveChatUsersCount(chatActiveData?.activeCount ?? 0);
      if (settingsData && typeof settingsData.emailNotificationsEnabled === "boolean") {
        setEmailNotificationsEnabled(settingsData.emailNotificationsEnabled);
      }
      if (cList && cList.length > 0 && !resCourseCode) {
        setResCourseCode(cList[0].code);
      }
      if (profileData) {
        setAdminProfile(profileData);
        setAdminName(profileData.name || "");
        setAdminEmail(profileData.email || "");
        setAdminPhone(profileData.phone || "");
        setAdminAddress(profileData.address || "");
        setAdminAvatarUrl(profileData.avatarUrl || "");
      } else if (user) {
        setAdminProfile({
          name: user.name,
          email: user.email,
          phone: user.phone || "",
          address: user.address || "",
          role: user.role,
          avatarUrl: user.avatarUrl || "",
          enabled: true,
        });
        setAdminName(user.name || "");
        setAdminEmail(user.email || "");
        setAdminPhone(user.phone || "");
        setAdminAddress(user.address || "");
        setAdminAvatarUrl(user.avatarUrl || "");
      }
      if (!isInitial) {
        notifyDataChanged("all", "admin_broadcast");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Resource CRUD ----------------
  const filteredModalCourses = useMemo(() => {
    if (resDeptFilter === "ALL") return courses;
    return courses.filter(
      (c) => c.department && c.department.trim().toUpperCase() === resDeptFilter.trim().toUpperCase()
    );
  }, [courses, resDeptFilter]);

  const handleMaterialFileUpload = async (file: File) => {
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error("File is too large. Maximum allowed size is 50 MB.");
      return;
    }

    setUploadingResFile(true);
    try {
      const res = await api.admin.uploadMaterialFile(file);
      setResFileUrl(res.url);
      setResFileName(res.fileName || file.name);
      setResFileSize(res.fileSize || `${(file.size / (1024 * 1024)).toFixed(1)} MB`);

      // Auto-suggest title if user hasn't typed one
      if (!resTitle.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        setResTitle(cleanName);
      }

      toast.success("File uploaded successfully from device!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload file from device");
    } finally {
      setUploadingResFile(false);
    }
  };

  const openNewResourceModal = () => {
    setEditingResource(null);
    const initialDept = departmentFilter !== "ALL" ? departmentFilter : "ALL";
    setResDeptFilter(initialDept);
    const matchingCourses =
      initialDept === "ALL"
        ? courses
        : courses.filter((c) => c.department?.toUpperCase() === initialDept.toUpperCase());
    setResCourseCode(matchingCourses[0]?.code || courses[0]?.code || "CSE241");
    setResTeacherId("");
    setResTitle("");
    setResType("NOTE");
    setResFileUrl("");
    setResFileName("");
    setResFileSize("");
    setResSemester("Fall 2026");
    setResYear(2026);
    setShowResourceModal(true);
  };

  const openEditResourceModal = (r: any) => {
    setEditingResource(r);
    const dept = r.course?.department || "ALL";
    setResDeptFilter(dept);
    setResCourseCode(r.course?.code || "");
    setResTeacherId(r.teacher?.id || "");
    setResTitle(r.title || "");
    setResType(r.type || "NOTE");
    setResFileUrl(r.fileUrl || "");
    const extMatch = r.fileUrl ? r.fileUrl.split("/").pop() : "Existing File";
    setResFileName(extMatch || "Existing File");
    setResFileSize("");
    setResSemester(r.semesterName || "Fall 2026");
    setResYear(r.academicYear || 2026);
    setShowResourceModal(true);
  };

  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resTitle.trim()) {
      toast.error("Please enter a title for the material");
      return;
    }
    if (!resFileUrl.trim()) {
      toast.error("Please upload a file or document from your device");
      return;
    }
    setSavingResource(true);
    try {
      const payload: any = {
        title: resTitle.trim(),
        type: resType,
        fileUrl: resFileUrl.trim(),
        previewUrl: resFileUrl.trim(),
        courseCode: resCourseCode,
        teacherId: resTeacherId ? Number(resTeacherId) : null,
        semesterName: resSemester.trim(),
        academicYear: Number(resYear) || 2026,
      };

      if (editingResource) {
        await api.admin.updateResource(editingResource.id, payload);
        notifyDataChanged("resource", "updated", editingResource.id);
        toast.success("Resource updated successfully!");
      } else {
        await api.admin.createResource(payload);
        notifyDataChanged("resource", "created", payload.title);
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        toast.success("New academic material uploaded successfully!");
      }
      setShowResourceModal(false);
      loadAllAdminData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save resource");
    } finally {
      setSavingResource(false);
    }
  };

  const handleDeleteResource = (id: number) => {
    const targetResource = resources.find((r) => r.id === id);
    const resTitle = targetResource?.title || `Academic Resource #${id}`;
    openDeleteConfirm({
      title: "Delete Academic Resource",
      itemType: "Resource",
      itemName: resTitle,
      warningText: `Are you sure you want to permanently delete "${resTitle}"? The document link and associated record will be completely erased.`,
      confirmButtonText: "Delete Resource",
      onConfirm: async () => {
        try {
          await api.admin.deleteResource(id);
          notifyDataChanged("resource", "deleted", id);
          notifyDataChanged("contribution", "deleted", id);
          setResources((prev) => prev.filter((r) => r.id !== id));
          toast.success("Resource deleted successfully");
          showDeleteSuccess(
            "Academic Resource Deleted!",
            `"${resTitle}" has been permanently removed from the learning archive.`,
            resTitle
          );
        } catch (err: any) {
          toast.error(err.message || "Failed to delete resource");
          throw err;
        }
      },
    });
  };

  // ---------------- Course CRUD ----------------
  const openNewCourseModal = () => {
    setEditingCourse(null);
    setCourseFormCode("");
    setCourseFormTitle("");
    setCourseFormCredits(3.0);
    setCourseFormSemester(1);
    setCourseFormDept("CSE");
    setCourseFormCustomDept("");
    setCourseFormIsCustomDept(false);
    setCourseFormIsLab(false);
    setCourseFormPrereq("");
    setCourseFormDesc("");
    setCourseFormTeacherId("");
    setShowCourseModal(true);
  };

  const openEditCourseModal = (course: any) => {
    setEditingCourse(course);
    setCourseFormCode(course.code);
    setCourseFormTitle(course.title);
    setCourseFormCredits(course.credits || 3.0);
    setCourseFormSemester(course.semester || 1);
    const dept = (course.department || "CSE").toUpperCase();
    setCourseFormDept(dept);
    setCourseFormCustomDept("");
    setCourseFormIsCustomDept(false);
    setCourseFormIsLab(Boolean(course.lab || course.isLab));
    setCourseFormPrereq(course.prerequisite || "");
    setCourseFormDesc(course.description || "");
    setShowCourseModal(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseFormTitle.trim()) {
      toast.error("Please enter the course title");
      return;
    }
    const finalDept = (courseFormIsCustomDept ? courseFormCustomDept : courseFormDept).trim().toUpperCase() || "CSE";
    if (!customDepartments.includes(finalDept)) {
      setCustomDepartments((prev) => [...prev, finalDept]);
    }
    setSavingCourse(true);
    try {
      if (editingCourse) {
        await api.admin.updateCourse(editingCourse.code, {
          title: courseFormTitle.trim(),
          credits: Number(courseFormCredits),
          semester: Number(courseFormSemester),
          department: finalDept,
          isLab: courseFormIsLab,
          prerequisite: courseFormPrereq.trim(),
          description: courseFormDesc.trim(),
        });
        notifyDataChanged("course", "updated", editingCourse.code);
        toast.success(`Course ${editingCourse.code} updated successfully!`);
      } else {
        if (!courseFormCode.trim()) {
          toast.error("Please enter a course code (e.g. CSE325)");
          setSavingCourse(false);
          return;
        }
        await api.admin.createCourse({
          code: courseFormCode.trim().toUpperCase(),
          title: courseFormTitle.trim(),
          credits: Number(courseFormCredits),
          semester: Number(courseFormSemester),
          department: finalDept,
          isLab: courseFormIsLab,
          teacherId: courseFormTeacherId ? Number(courseFormTeacherId) : null,
        });
        notifyDataChanged("course", "created", courseFormCode.trim().toUpperCase());
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        toast.success(`Course ${courseFormCode.trim().toUpperCase()} created successfully!`);
      }
      setShowCourseModal(false);
      loadAllAdminData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save course");
    } finally {
      setSavingCourse(false);
    }
  };

  const handleDeleteCourse = (code: string) => {
    const targetCourse = courses.find((c) => c.code === code);
    const courseDisplay = targetCourse ? `${targetCourse.code}: ${targetCourse.title}` : code;
    openDeleteConfirm({
      title: "Delete Academic Course",
      itemType: "Course",
      itemName: courseDisplay,
      warningText: `Are you sure you want to permanently delete course ${code}? All teacher assignments, materials links, and student enrollments will be permanently removed.`,
      confirmButtonText: "Delete Course",
      onConfirm: async () => {
        try {
          await api.admin.deleteCourse(code);
          notifyDataChanged("course", "deleted", code);
          toast.success(`Course ${code} deleted successfully`);
          showDeleteSuccess(
            "Course Deleted Successfully!",
            `Course "${courseDisplay}" and all associated teacher links have been removed.`,
            code
          );
          loadAllAdminData();
        } catch (err: any) {
          toast.error(err.message || "Failed to delete course");
          throw err;
        }
      },
    });
  };

  // ---------------- Teacher CRUD ----------------
  const handleSyncCseFaculties = async () => {
    setSyncingCse(true);
    const toastId = toast.loading("Syncing CSE Faculty from official Southeast University website...");
    try {
      const res = await api.teachers.syncCse();
      toast.dismiss(toastId);
      toast.success(
        `CSE Faculty Sync Completed! Total: ${res.totalOfficialScraped} records (${res.updated} updated, ${res.added} added, ${res.unchanged} up-to-date).`,
        { duration: 5000 }
      );
      const freshTeachers = await api.teachers.getAll();
      setTeachers(freshTeachers || []);
      notifyDataChanged("teacher", "updated", "SYNC_CSE_ALL");
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message || "Failed to sync CSE faculty from official website");
    } finally {
      setSyncingCse(false);
    }
  };

  const openNewTeacherModal = () => {
    setEditingTeacher(null);
    setTeacherFormName("");
    setTeacherFormInitial("");
    setTeacherFormDesignation("Lecturer");
    setTeacherFormRoom("");
    setTeacherFormEmail("");
    setTeacherFormPhone("");
    setTeacherFormImage("");
    setTeacherFormCategory("FULL_TIME_FACULTY");
    setTeacherFormDept("CSE");
    setTeacherFormCustomDept("");
    setTeacherFormIsCustomDept(false);
    setShowTeacherModal(true);
  };

  const openEditTeacherModal = (teacher: any) => {
    setEditingTeacher(teacher);
    setTeacherFormName(teacher.name || "");
    setTeacherFormInitial(teacher.initial || "");
    setTeacherFormDesignation(teacher.designation || "");
    setTeacherFormRoom(teacher.room || "");
    setTeacherFormEmail(teacher.email || "");
    setTeacherFormPhone(teacher.phone || "");
    setTeacherFormImage(teacher.image || "");
    setTeacherFormCategory(teacher.category || "FULL_TIME_FACULTY");
    setTeacherFormDept((teacher.department || "CSE").toUpperCase());
    setTeacherFormCustomDept("");
    setTeacherFormIsCustomDept(false);
    setShowTeacherModal(true);
  };

  const handleUploadTeacherImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (JPEG, PNG, WEBP, GIF).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5 MB.");
      return;
    }

    setUploadingTeacherImage(true);
    try {
      const res = await api.admin.uploadTeacherPhoto(file);
      setTeacherFormImage(res.url);
      toast.success("Faculty photo uploaded from device successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload faculty photo");
    } finally {
      setUploadingTeacherImage(false);
      e.target.value = "";
    }
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherFormName.trim()) {
      toast.error("Please enter the teacher's full name");
      return;
    }
    const finalDept = (teacherFormIsCustomDept ? teacherFormCustomDept : teacherFormDept).trim().toUpperCase() || "CSE";
    if (!customDepartments.includes(finalDept)) {
      setCustomDepartments((prev) => [...prev, finalDept]);
    }
    setSavingTeacher(true);
    try {
      const payload: any = {
        name: teacherFormName.trim(),
        initial: teacherFormInitial.trim().toUpperCase(),
        designation: teacherFormDesignation.trim(),
        room: teacherFormRoom.trim(),
        email: teacherFormEmail.trim(),
        phone: teacherFormPhone.trim(),
        image: teacherFormImage.trim(),
        category: teacherFormCategory,
        department: finalDept,
      };

      if (editingTeacher) {
        await api.admin.updateTeacher(editingTeacher.id, payload);
        notifyDataChanged("teacher", "updated", editingTeacher.id);
        toast.success(`Faculty profile for ${teacherFormName.trim()} updated successfully!`);
      } else {
        await api.admin.createTeacher(payload);
        notifyDataChanged("teacher", "created", teacherFormName.trim());
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        toast.success(`Faculty member ${teacherFormName.trim()} added successfully!`);
      }
      setShowTeacherModal(false);
      loadAllAdminData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save faculty profile");
    } finally {
      setSavingTeacher(false);
    }
  };

  // ---------------- Department Management & Cascading ----------------
  const openAddDepartmentModal = () => {
    setEditingDeptCode(null);
    setDeptFormCode("");
    setDeptFormName("");
    setShowDeptManageModal(true);
  };

  const openEditDepartmentModal = (deptCode: string) => {
    const upper = deptCode.toUpperCase();
    const meta = DEFAULT_DEPARTMENT_META[upper];
    const currentName = customDeptNames[upper] || meta?.name || `${upper} Department`;
    setEditingDeptCode(upper);
    setDeptFormCode(upper);
    setDeptFormName(currentName);
    setShowDeptManageModal(true);
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = deptFormCode.trim().toUpperCase();
    const cleanName = deptFormName.trim();
    if (!cleanCode) {
      toast.error("Please enter a valid department code (e.g. ICT, SWE, BBA)");
      return;
    }

    setSavingDept(true);
    try {
      if (editingDeptCode) {
        const oldCode = editingDeptCode.toUpperCase();

        // 1. Update custom department names
        setCustomDeptNames((prev) => {
          const next = { ...prev };
          if (oldCode !== cleanCode) {
            delete next[oldCode];
          }
          next[cleanCode] = cleanName || DEFAULT_DEPARTMENT_META[cleanCode]?.name || `${cleanCode} Department`;
          return next;
        });

        // 2. Update custom departments array
        setCustomDepartments((prev) => {
          const filtered = prev.filter((d) => d.toUpperCase() !== oldCode);
          if (!filtered.includes(cleanCode)) {
            filtered.push(cleanCode);
          }
          return filtered;
        });

        // 3. Cascade updates to courses and teachers if department code changed
        if (oldCode !== cleanCode) {
          const affectedCourses = courses.filter((c) => c.department?.toUpperCase() === oldCode);
          const affectedTeachers = teachers.filter((t) => t.department?.toUpperCase() === oldCode);

          for (const course of affectedCourses) {
            try {
              await api.admin.updateCourse(course.code, {
                title: course.title,
                department: cleanCode,
                credits: course.credits,
                semester: course.semester,
                isLab: course.lab || course.isLab,
                prerequisite: course.prerequisite,
                description: course.description,
              });
            } catch (err) {
              console.error("Course cascade update error:", err);
            }
          }

          for (const teacher of affectedTeachers) {
            try {
              await api.admin.updateTeacher(teacher.id, {
                name: teacher.name,
                initial: teacher.initial,
                department: cleanCode,
                designation: teacher.designation,
                room: teacher.room,
                email: teacher.email,
                phone: teacher.phone,
                image: teacher.image,
                category: teacher.category,
              });
            } catch (err) {
              console.error("Teacher cascade update error:", err);
            }
          }

          toast.success(
            `Department code updated to "${cleanCode}"! Cascaded to ${affectedCourses.length} courses and ${affectedTeachers.length} faculty members.`
          );
        } else {
          toast.success(`Department "${cleanCode}" details updated successfully!`);
        }
      } else {
        // Adding new department
        if (dynamicDepartments.includes(cleanCode)) {
          toast.error(`Department "${cleanCode}" already exists in the system!`);
          setSavingDept(false);
          return;
        }

        setCustomDepartments((prev) => [...prev, cleanCode]);
        setCustomDeptNames((prev) => ({
          ...prev,
          [cleanCode]: cleanName || DEFAULT_DEPARTMENT_META[cleanCode]?.name || `${cleanCode} Department`,
        }));

        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        toast.success(`Department "${cleanCode}" registered successfully!`);
      }

      setShowDeptManageModal(false);
      setShowAddDeptModal(false);
      setNewDeptInput("");
      notifyDataChanged("department", "updated", cleanCode);
      loadAllAdminData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save department");
    } finally {
      setSavingDept(false);
    }
  };

  const handleDeleteDepartment = (deptCode: string) => {
    const upper = deptCode.toUpperCase();
    const deptFullName = customDeptNames[upper] || DEFAULT_DEPARTMENT_META[upper]?.name || `${upper} Department`;
    const coursesInDept = courses.filter((c) => c.department?.toUpperCase() === upper);
    const teachersInDept = teachers.filter((t) => t.department?.toUpperCase() === upper);
    const countWarning =
      coursesInDept.length > 0 || teachersInDept.length > 0
        ? ` Note: Department "${upper}" currently has ${coursesInDept.length} courses and ${teachersInDept.length} faculty members assigned.`
        : "";

    openDeleteConfirm({
      title: "Delete Academic Department",
      itemType: "Department",
      itemName: `${upper} — ${deptFullName}`,
      warningText: `Are you sure you want to delete the department definition for "${upper}"?${countWarning} It will be removed from all active filters and academic modules.`,
      confirmButtonText: "Delete Department",
      onConfirm: () => {
        setCustomDepartments((prev) => prev.filter((d) => d.toUpperCase() !== upper));
        setCustomDeptNames((prev) => {
          const next = { ...prev };
          delete next[upper];
          return next;
        });

        notifyDataChanged("department", "deleted", upper);
        toast.success(`Department "${upper}" removed successfully.`);
        showDeleteSuccess(
          "Department Deleted Successfully!",
          `Department "${upper}" has been removed from the university registry.`,
          upper
        );
      },
    });
  };

  // ---------------- Quick Register Department Legacy Bridge ----------------
  const handleAddNewDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDept = newDeptInput.trim().toUpperCase();
    if (!cleanDept) {
      toast.error("Please enter a department code (e.g. LAW, PHR, ARCH)");
      return;
    }
    if (dynamicDepartments.includes(cleanDept)) {
      toast.error(`Department "${cleanDept}" already exists in the system!`);
      return;
    }
    setCustomDepartments((prev) => [...prev, cleanDept]);
    setNewDeptInput("");
    setShowAddDeptModal(false);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    notifyDataChanged("department", "created", cleanDept);
    toast.success(`Department "${cleanDept}" added successfully across all filters and modules!`);
  };

  const handleDeleteTeacher = (id: number, name: string) => {
    openDeleteConfirm({
      title: "Delete Faculty Member",
      itemType: "Faculty",
      itemName: name,
      warningText: `Are you sure you want to permanently delete faculty member "${name}"? All assigned course linkages will be cleared and profile details erased.`,
      confirmButtonText: "Delete Faculty",
      onConfirm: async () => {
        try {
          await api.admin.deleteTeacher(id);
          notifyDataChanged("teacher", "deleted", id);
          toast.success(`Faculty member "${name}" deleted successfully`);
          showDeleteSuccess(
            "Faculty Member Deleted!",
            `"${name}" has been permanently removed from the faculty directory.`,
            name
          );
          loadAllAdminData();
        } catch (err: any) {
          toast.error(err.message || "Failed to delete teacher");
          throw err;
        }
      },
    });
  };

  // ---------------- Course-Faculty Assignment ----------------
  const handleAssignTeacher = async (courseCode: string, teacherId: number) => {
    if (!courseCode || !courseCode.trim()) {
      toast.error("Please select a target course first");
      return;
    }
    if (!teacherId || isNaN(teacherId) || teacherId <= 0) {
      toast.error("Please select a faculty member to assign");
      return;
    }
    setAssigning(true);
    try {
      await api.admin.assignTeacherToCourse(courseCode.trim(), teacherId);
      notifyDataChanged("matrix", "assigned", `${courseCode.trim()}->${teacherId}`);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      toast.success(`Faculty member successfully assigned to ${courseCode.trim()}! Conducted tags updated.`);
      setTeacherToAssignId("");
      setCourseToAssignCode("");
      await loadAllAdminData();
    } catch (err: any) {
      toast.error(err.message || "Failed to assign faculty to course");
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveTeacher = (courseCode: string, teacherId: number, teacherName: string) => {
    openDeleteConfirm({
      title: "Remove Faculty Teaching Assignment",
      itemType: "Allocation",
      itemName: `${teacherName} → ${courseCode}`,
      warningText: `Are you sure you want to remove ${teacherName} from conducting course ${courseCode}? Students will no longer see this faculty associated with the course.`,
      confirmButtonText: "Remove Assignment",
      onConfirm: async () => {
        try {
          await api.admin.removeTeacherFromCourse(courseCode, teacherId);
          notifyDataChanged("matrix", "removed", `${courseCode}->${teacherId}`);
          toast.success(`Removed ${teacherName} from ${courseCode}`);
          showDeleteSuccess(
            "Assignment Removed Successfully!",
            `Faculty allocation of ${teacherName} for course ${courseCode} has been cleared.`,
            `${teacherName} (${courseCode})`
          );
          loadAllAdminData();
        } catch (err: any) {
          toast.error(err.message || "Failed to remove teacher assignment");
          throw err;
        }
      },
    });
  };

  // ---------------- User Accounts & RBAC CRUD ----------------
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName || !staffEmail || !staffPassword) {
      toast.error("Please fill in all required fields (Name, Email, Password)");
      return;
    }
    if (!isSuperAdmin && staffRole !== "ROLE_STUDENT") {
      toast.error("Access Denied: Standard Administrators can only register Student accounts.");
      return;
    }
    const roleToAssign = isSuperAdmin ? staffRole : "ROLE_STUDENT";
    setSavingStaff(true);
    try {
      await api.admin.createStaff({
        name: staffName.trim(),
        email: staffEmail.trim(),
        password: staffPassword.trim(),
        role: roleToAssign,
        studentId: staffStudentId.trim() || undefined,
      });
      notifyDataChanged("user", "created");
      notifyDataChanged("staff", "created");
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      toast.success(`Account for ${staffName} (${roleToAssign.replace("ROLE_", "")}) registered successfully!`);
      setShowStaffModal(false);
      setStaffName("");
      setStaffEmail("");
      setStaffStudentId("");
      setStaffPassword("");
      setStaffRole(isSuperAdmin ? "ROLE_ADMIN" : "ROLE_STUDENT");
      loadAllAdminData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create account");
    } finally {
      setSavingStaff(false);
    }
  };

  const handleDeleteStaff = (staff: any) => {
    if (user?.id === staff.id) {
      toast.error("You cannot delete your own administrative account!");
      return;
    }
    if (staff.email === "admin@seu.edu.bd") {
      toast.error("Root Super Admin account cannot be removed!");
      return;
    }
    if (!isSuperAdmin && staff.role !== "ROLE_STUDENT") {
      toast.error("Access Denied: Standard Administrators can only delete Student accounts. Super Admin clearance required.");
      return;
    }
    const roleLabel = staff.role === "ROLE_STUDENT" ? "Student" : staff.role === "ROLE_ADMIN" ? "Administrator" : "Staff Member";
    openDeleteConfirm({
      title: "Permanently Delete User Account",
      itemType: roleLabel,
      itemName: `${staff.name} (${staff.email})`,
      warningText: `Are you sure you want to permanently delete the account for ${staff.name}? All personal settings, roles, and authorization keys will be permanently erased.`,
      confirmButtonText: "Delete Account",
      onConfirm: async () => {
        try {
          await api.admin.deleteStaff(staff.id);
          notifyDataChanged("user", "deleted", staff.id);
          notifyDataChanged("staff", "deleted", staff.id);
          toast.success(`Account for ${staff.name} deleted successfully`);
          showDeleteSuccess(
            "Account Deleted Successfully!",
            `User account for ${staff.name} (${staff.email}) has been permanently deleted.`,
            staff.name
          );
          loadAllAdminData();
        } catch (err: any) {
          toast.error(err.message || "Failed to delete user account");
          throw err;
        }
      },
    });
  };

  const handleOpenEditStaff = (staff: any) => {
    if (!isSuperAdmin && staff.role !== "ROLE_STUDENT") {
      toast.error("Access Denied: Standard Administrators can only edit Student accounts. Super Admin clearance required.");
      return;
    }
    setEditingStaffId(staff.id);
    setEditStaffName(staff.name || "");
    setEditStaffEmail(staff.email || "");
    setEditStaffStudentId(staff.studentId || "");
    setEditStaffRole(staff.role || "ROLE_STUDENT");
    setEditStaffPhone(staff.phone || "");
    setEditStaffAddress(staff.address || "");
    setShowEditStaffModal(true);
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaffId || !editStaffName.trim()) {
      toast.error("Please enter a valid name.");
      return;
    }
    setUpdatingStaff(true);
    try {
      const payload: any = {
        name: editStaffName.trim(),
        role: isSuperAdmin ? editStaffRole : "ROLE_STUDENT",
        studentId: editStaffStudentId.trim(),
        phone: editStaffPhone.trim() || undefined,
        address: editStaffAddress.trim() || undefined,
      };
      await api.admin.updateStaff(editingStaffId, payload);
      notifyDataChanged("user", "updated", editingStaffId);
      notifyDataChanged("staff", "updated", editingStaffId);
      toast.success(`Account for "${editStaffName}" updated successfully!`);
      setShowEditStaffModal(false);
      loadAllAdminData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update account");
    } finally {
      setUpdatingStaff(false);
    }
  };

  const handleToggleStaffStatus = (staff: any) => {
    if (user?.id === staff.id) {
      toast.error("You cannot block your own administrative account!");
      return;
    }
    if (staff.email === "admin@seu.edu.bd") {
      toast.error("Root Super Admin account cannot be blocked!");
      return;
    }
    if (!isSuperAdmin && staff.role !== "ROLE_STUDENT") {
      toast.error("Access Denied: Standard Administrators can only block/unblock Student accounts. Super Admin clearance required.");
      return;
    }
    const isBlocking = staff.enabled !== false;
    const actionWord = isBlocking ? "block" : "unblock";

    openDeleteConfirm({
      title: isBlocking ? "Block User Account" : "Unblock User Account",
      itemType: "Access Control",
      itemName: `${staff.name} (${staff.email})`,
      warningText: isBlocking
        ? `Are you sure you want to block login access for ${staff.name}? The user will immediately be barred from signing into the system.`
        : `Are you sure you want to restore active access permissions for ${staff.name}?`,
      confirmButtonText: isBlocking ? "Block Access" : "Restore Access",
      onConfirm: async () => {
        setTogglingStaffId(staff.id);
        try {
          const res = await api.admin.toggleStaffStatus(staff.id);
          notifyDataChanged("user", isBlocking ? "blocked" : "unblocked", staff.id);
          notifyDataChanged("staff", "updated", staff.id);
          toast.success(res.message || `Account ${actionWord}ed successfully`);
          showDeleteSuccess(
            `Account ${isBlocking ? "Blocked" : "Unblocked"}!`,
            `Login access for ${staff.name} has been ${isBlocking ? "suspended" : "restored"}.`,
            staff.name
          );
          loadAllAdminData();
        } catch (err: any) {
          toast.error(err.message || `Failed to ${actionWord} account`);
          throw err;
        } finally {
          setTogglingStaffId(null);
        }
      },
    });
  };

  // ---------------- Admin Profile & Password Handlers ----------------
  const handleUploadAdminAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (JPEG, PNG, WEBP, GIF).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5 MB.");
      return;
    }

    setUploadingAdminAvatar(true);
    try {
      const res = await api.admin.uploadAvatar(file);
      setAdminAvatarUrl(res.avatarUrl);
      setAdminProfile((prev: any) => ({ ...prev, avatarUrl: res.avatarUrl }));
      toast.success("Profile image updated successfully!");
      if (refreshProfile) {
        await refreshProfile();
      }
      loadAllAdminData();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload profile image");
    } finally {
      setUploadingAdminAvatar(false);
      e.target.value = "";
    }
  };

  const handleRemoveAdminAvatar = () => {
    openDeleteConfirm({
      title: "Remove Profile Image",
      itemType: "Avatar",
      itemName: user?.name || "Administrator Profile Image",
      warningText: "Are you sure you want to remove your custom profile image? Your account will revert to the standard initial letter avatar.",
      confirmButtonText: "Remove Image",
      onConfirm: async () => {
        setRemovingAdminAvatar(true);
        try {
          await api.admin.removeAvatar();
          setAdminAvatarUrl("");
          setAdminProfile((prev: any) => ({ ...prev, avatarUrl: "" }));
          toast.success("Profile image removed successfully.");
          showDeleteSuccess(
            "Profile Image Removed!",
            "Your profile image has been removed and reset to default.",
            user?.name
          );
          if (refreshProfile) {
            await refreshProfile();
          }
          loadAllAdminData();
        } catch (err: any) {
          toast.error(err.message || "Failed to remove profile image");
          throw err;
        } finally {
          setRemovingAdminAvatar(false);
        }
      },
    });
  };

  const handleSaveAdminAvatarUrl = async () => {
    if (!customAvatarUrl.trim()) {
      toast.error("Please enter a valid image URL.");
      return;
    }
    setUploadingAdminAvatar(true);
    try {
      const res = await api.admin.updateProfile({
        name: adminName.trim() || user?.name || "Admin",
        phone: adminPhone.trim() || undefined,
        address: adminAddress.trim() || undefined,
        avatarUrl: customAvatarUrl.trim(),
      });
      setAdminAvatarUrl(res.avatarUrl || customAvatarUrl.trim());
      setAdminProfile((prev: any) => ({ ...prev, avatarUrl: res.avatarUrl || customAvatarUrl.trim() }));
      setShowAvatarUrlInput(false);
      setCustomAvatarUrl("");
      toast.success("Profile image URL updated successfully!");
      if (refreshProfile) {
        await refreshProfile();
      }
      loadAllAdminData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile image URL");
    } finally {
      setUploadingAdminAvatar(false);
    }
  };

  const handleUpdateAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName.trim()) {
      toast.error("Full name cannot be empty.");
      return;
    }
    setSavingAdminProfile(true);
    try {
      const res = await api.admin.updateProfile({
        name: adminName.trim(),
        phone: adminPhone.trim() || undefined,
        address: adminAddress.trim() || undefined,
        avatarUrl: adminAvatarUrl || null,
      });
      toast.success(res.message || "Admin profile updated successfully!");
      setAdminProfile((prev: any) => ({
        ...prev,
        name: adminName.trim(),
        phone: adminPhone.trim(),
        address: adminAddress.trim(),
      }));
      setIsEditingAdminProfile(false);
      if (refreshProfile) {
        await refreshProfile();
      }
      loadAllAdminData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSavingAdminProfile(false);
    }
  };

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error("Please enter your current password.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match!");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await api.admin.changePassword({
        currentPassword,
        newPassword,
      });
      toast.success(res.message || "Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setChangingPassword(false);
    }
  };

  // ---------------- Verification Queues ----------------
  const handleApprovePayment = async (id: number) => {
    try {
      await api.admin.approvePayment(id);
      notifyDataChanged("payment", "approved", id);
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      toast.success("Payment approved! 6 courses unlocked for student.");
      loadAllAdminData();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve payment");
    }
  };

  const handleRejectPayment = (id: number) => {
    openDeleteConfirm({
      title: "Reject Payment Request",
      itemType: "Payment",
      itemName: `Payment Transaction #${id}`,
      warningText: "Are you sure you want to decline this subscription payment request? The student will be notified and subscription will remain inactive.",
      confirmButtonText: "Reject Payment",
      onConfirm: async () => {
        try {
          await api.admin.rejectPayment(id);
          notifyDataChanged("payment", "rejected", id);
          toast.success("Payment rejected");
          showDeleteSuccess("Payment Request Rejected", "The subscription payment transaction has been declined.", `Payment #${id}`);
          loadAllAdminData();
        } catch (err: any) {
          toast.error(err.message || "Failed to reject payment");
          throw err;
        }
      },
    });
  };

  const handleApproveContribution = async (id: number) => {
    try {
      await api.admin.approveContribution(id);
      notifyDataChanged("contribution", "approved", id);
      notifyDataChanged("subscription", "unlocked", id);
      notifyDataChanged("resource", "approved", id);
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      toast.success("Contribution approved! Resource is published and student's 2 reward courses unlocked.");
      loadAllAdminData();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve contribution");
    }
  };

  const handleRejectContribution = (id: number) => {
    openDeleteConfirm({
      title: "Reject Student Submission",
      itemType: "Contribution",
      itemName: `Submission #${id}`,
      warningText: "Are you sure you want to reject this student submission? The material will not be published.",
      confirmButtonText: "Reject Submission",
      onConfirm: async () => {
        try {
          await api.admin.rejectContribution(id);
          notifyDataChanged("contribution", "rejected", id);
          notifyDataChanged("resource", "rejected", id);
          toast.success("Contribution rejected");
          showDeleteSuccess("Contribution Rejected", "The student submission has been rejected and archived.", `Submission #${id}`);
          loadAllAdminData();
        } catch (err: any) {
          toast.error(err.message || "Failed to reject contribution");
          throw err;
        }
      },
    });
  };

  const handleApproveWaiver = async (id: number) => {
    try {
      await api.admin.approveWaiver(id, 6, "Approved ৳99 package with 6 course unlock quota by Administrator");
      notifyDataChanged("waiver", "approved", id);
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      toast.success("Financial waiver approved! Student granted 1-Semester 6 Course Unlocks.");
      loadAllAdminData();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve waiver");
    }
  };

  const handleRejectWaiver = (id: number) => {
    openDeleteConfirm({
      title: "Decline Financial Waiver",
      itemType: "Waiver",
      itemName: `Waiver Application #${id}`,
      warningText: "Are you sure you want to decline this financial waiver application?",
      confirmButtonText: "Decline Application",
      onConfirm: async () => {
        try {
          await api.admin.rejectWaiver(id, "Declined based on quota availability.");
          notifyDataChanged("waiver", "rejected", id);
          toast.success("Waiver application declined");
          showDeleteSuccess("Waiver Declined", "The financial waiver application has been declined.", `Waiver #${id}`);
          loadAllAdminData();
        } catch (err: any) {
          toast.error(err.message || "Failed to decline waiver");
          throw err;
        }
      },
    });
  };

  const handleApproveReview = async (id: number) => {
    try {
      await api.admin.approveReview(id);
      notifyDataChanged("review", "approved", id);
      toast.success("Review approved and published to public faculty profile!");
      loadAllAdminData();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve review");
    }
  };

  const handleRejectReview = async (id: number) => {
    try {
      await api.admin.rejectReview(id);
      notifyDataChanged("review", "rejected", id);
      toast.success("Review rejected / unpublished from public view.");
      loadAllAdminData();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject review");
    }
  };

  const handleDeleteReview = (id: number) => {
    openDeleteConfirm({
      title: "Permanently Delete Faculty Review",
      itemType: "Review",
      itemName: `Review Record #${id}`,
      warningText: "Are you sure you want to permanently delete this faculty review? It will be completely removed from public view and database.",
      confirmButtonText: "Delete Review",
      onConfirm: async () => {
        try {
          await api.admin.deleteReview(id);
          notifyDataChanged("review", "deleted", id);
          toast.success("Review deleted permanently");
          showDeleteSuccess("Review Deleted Successfully!", "The faculty review has been permanently erased.", `Review #${id}`);
          loadAllAdminData();
        } catch (err: any) {
          toast.error(err.message || "Failed to delete review");
          throw err;
        }
      },
    });
  };


  // ==========================================
  // CAMPUS NOTICE BOARD HANDLERS
  // ==========================================
  const openNewNoticeModal = () => {
    setEditingNoticeId(null);
    setNoticeText("");
    setNoticeType("INFO");
    setNoticeLink("");
    setNoticeActive(true);
    setNoticePriority(0);
    setNoticeStartsAt("");
    setNoticeExpiresAt("");
    setShowNoticeModal(true);
  };

  const openEditNoticeModal = (notice: any) => {
    setEditingNoticeId(notice.id);
    setNoticeText(notice.text || "");
    setNoticeType(notice.type || "INFO");
    setNoticeLink(notice.link || "");
    setNoticeActive(notice.active ?? true);
    setNoticePriority(notice.priority || 0);
    setNoticeStartsAt(notice.startsAt ? String(notice.startsAt).substring(0, 16) : "");
    setNoticeExpiresAt(notice.expiresAt ? String(notice.expiresAt).substring(0, 16) : "");
    setShowNoticeModal(true);
  };

  const handleSaveNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeText.trim()) {
      toast.error("Notice announcement text cannot be empty");
      return;
    }
    setSavingNotice(true);
    try {
      if (editingNoticeId) {
        await api.admin.updateNotice(editingNoticeId, {
          text: noticeText.trim(),
          type: noticeType,
          link: noticeLink.trim() || undefined,
          active: noticeActive,
          priority: Number(noticePriority) || 0,
          startsAt: noticeStartsAt ? noticeStartsAt : undefined,
          expiresAt: noticeExpiresAt ? noticeExpiresAt : undefined,
        });
        toast.success("Notice updated successfully");
        notifyDataChanged("notice", "update", editingNoticeId);
      } else {
        await api.admin.createNotice({
          text: noticeText.trim(),
          type: noticeType,
          link: noticeLink.trim() || undefined,
          active: noticeActive,
          priority: Number(noticePriority) || 0,
          startsAt: noticeStartsAt ? noticeStartsAt : undefined,
          expiresAt: noticeExpiresAt ? noticeExpiresAt : undefined,
        });
        toast.success("Notice published to live banner successfully");
        notifyDataChanged("notice", "create");
      }
      setShowNoticeModal(false);
      await loadAllAdminData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save notice");
    } finally {
      setSavingNotice(false);
    }
  };

  const handleToggleNoticeStatus = async (notice: any) => {
    try {
      await api.admin.toggleNoticeStatus(notice.id);
      notifyDataChanged("notice", "toggle", notice.id);
      toast.success(notice.active ? "Notice paused from live banner" : "Notice is now LIVE on homepage banner!");
      await loadAllAdminData();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle notice status");
    }
  };

  const handleDeleteNotice = (notice: any) => {
    openDeleteConfirm({
      title: "Permanently Delete Campus Notice",
      itemType: "Campus Notice",
      itemName: notice.text.length > 40 ? notice.text.substring(0, 40) + "..." : notice.text,
      warningText: "Are you sure you want to delete this notice? It will immediately stop appearing on the homepage marquee.",
      confirmButtonText: "Delete Notice",
      onConfirm: async () => {
        try {
          await api.admin.deleteNotice(notice.id);
          notifyDataChanged("notice", "delete", notice.id);
          toast.success("Notice deleted permanently");
          showDeleteSuccess("Notice Deleted Successfully!", "The notice has been removed from the platform.", notice.text.slice(0, 30));
          await loadAllAdminData();
        } catch (err: any) {
          toast.error(err.message || "Failed to delete notice");
          throw err;
        }
      },
    });
  };

  // Chat Moderation Actions
  const handleAdminDeleteChatMessage = (msg: ChatMessageDto) => {
    const preview = msg.text
      ? (msg.text.length > 50 ? msg.text.substring(0, 50) + "..." : msg.text)
      : (msg.messageType === "VOICE" ? `🎙️ Voice Note (${msg.voiceDuration || 1}s)` : "📷 Image Attachment");

    openDeleteConfirm({
      title: "Permanently Delete Chat Message",
      itemType: "Campus Live Message",
      itemName: `${msg.senderName}: "${preview}"`,
      warningText: "Are you sure you want to delete this message? It will be permanently removed from SEU Campus Live for all students and administrators immediately.",
      confirmButtonText: "Delete Message",
      onConfirm: async () => {
        try {
          await api.admin.deleteChatMessage(msg.id);
          setChatMessages((prev) => prev.filter((m) => m.id !== msg.id));
          if (pinnedChatMessage?.id === msg.id) setPinnedChatMessage(null);
          notifyDataChanged("chat", "deleted", msg.id);
          toast.success("Chat message removed permanently.");
          showDeleteSuccess(
            "Message Deleted Successfully!",
            "The chat message has been permanently deleted from SEU Campus Live stream.",
            preview
          );
        } catch (err: any) {
          toast.error(err.message || "Failed to delete chat message.");
          throw err;
        }
      },
    });
  };

  const handleAdminPinChatMessage = async (id: number) => {
    try {
      const pinned = await api.admin.pinChatMessage(id);
      setPinnedChatMessage(pinned);
      setChatMessages((prev) => prev.map((m) => (m.id === id ? { ...m, pinned: true } : { ...m, pinned: false })));
      toast.success("Message pinned as top campus announcement for 24 hours!");
      notifyDataChanged("chat", "pinned", id);
    } catch (err: any) {
      toast.error(err.message || "Failed to pin message.");
    }
  };

  const handleAdminUnpinChatMessage = async (id: number) => {
    try {
      await api.admin.unpinChatMessage(id);
      setPinnedChatMessage(null);
      setChatMessages((prev) => prev.map((m) => (m.id === id ? { ...m, pinned: false } : m)));
      toast.success("Announcement unpinned.");
      notifyDataChanged("chat", "unpinned", id);
    } catch (err: any) {
      toast.error(err.message || "Failed to unpin message.");
    }
  };

  const handleAdminBlockChatUser = async (userId: number, userName: string) => {
    if (!confirm(`Are you sure you want to suspend chat access for "${userName}"?`)) return;
    try {
      await api.admin.blockUserFromChat(userId);
      setStaffList((prev) => prev.map((u) => (u.id === userId ? { ...u, chatBlocked: true } : u)));
      toast.success(`Student "${userName}" has been blocked from chat.`);
      notifyDataChanged("user", "chat_blocked", userId);
    } catch (err: any) {
      toast.error(err.message || "Failed to block user.");
    }
  };

  const handleAdminUnblockChatUser = async (userId: number, userName: string) => {
    try {
      await api.admin.unblockUserFromChat(userId);
      setStaffList((prev) => prev.map((u) => (u.id === userId ? { ...u, chatBlocked: false } : u)));
      toast.success(`Student "${userName}" has been unblocked.`);
      notifyDataChanged("user", "chat_unblocked", userId);
    } catch (err: any) {
      toast.error(err.message || "Failed to unblock user.");
    }
  };

  const playAdminVoice = (id: number, url?: string | null) => {
    if (!url) return;
    if (playingVoiceId === id && adminAudioRef.current) {
      if (adminAudioRef.current.paused) {
        adminAudioRef.current.play().catch(() => {});
      } else {
        adminAudioRef.current.pause();
        setPlayingVoiceId(null);
      }
      return;
    }
    if (adminAudioRef.current) adminAudioRef.current.pause();
    const resolvedUrl = url.startsWith("http")
      ? url
      : `${typeof window !== "undefined" ? window.location.origin : ""}${url.startsWith("/") ? "" : "/"}${url}`;
    const audio = new Audio(resolvedUrl);
    adminAudioRef.current = audio;
    audio
      .play()
      .then(() => setPlayingVoiceId(id))
      .catch(() => {
        setPlayingVoiceId(null);
        toast.error("Failed to play voice note.");
      });
    audio.onended = () => setPlayingVoiceId(null);
    audio.onerror = () => {
      setPlayingVoiceId(null);
      toast.error("Failed to play voice note.");
    };
  };

  const handleToggleEmail = async () => {
    setTogglingEmail(true);
    try {
      const nextState = !emailNotificationsEnabled;
      const res = await api.admin.toggleEmail(nextState);
      setEmailNotificationsEnabled(res.emailNotificationsEnabled);
      toast.success(
        res.emailNotificationsEnabled
          ? "Automated Email Notifications TURNED ON (SMTP active)"
          : "Automated Email Notifications TURNED OFF"
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle email notifications");
    } finally {
      setTogglingEmail(false);
    }
  };

  // ---------------- Route Guard ----------------
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="max-w-md mx-auto py-32 px-4 text-center space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center shadow-lg">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Admin Access Restricted</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            This console is strictly restricted to Southeast University faculty and system administrators.
            Public student accounts cannot access administrative controls.
          </p>
        </div>
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90"
          >
            Back to Home
          </Link>
          <Link
            href="/courses"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
          >
            Browse Courses
          </Link>
        </div>
      </div>
    );
  }

  // ---------------- Filter Computations ----------------
  const filteredResources = resources.filter((r) => {
    const q = resourceSearch.toLowerCase();
    const matchSearch =
      !q ||
      r.title?.toLowerCase().includes(q) ||
      r.course?.code?.toLowerCase().includes(q) ||
      r.course?.title?.toLowerCase().includes(q) ||
      r.teacher?.name?.toLowerCase().includes(q);
    const matchType =
      resourceTypeFilter === "ALL" ||
      r.type === resourceTypeFilter ||
      (resourceTypeFilter === "LABS" && r.type && r.type.startsWith("LAB_")) ||
      (resourceTypeFilter === "EXAMS" && (r.type === "MID_QUESTION" || r.type === "FINAL_QUESTION"));
    const matchDept =
      departmentFilter === "ALL" ||
      (r.course?.department && r.course.department.toUpperCase() === departmentFilter.toUpperCase());
    return matchSearch && matchType && matchDept;
  });

  // Resource Category KPIs
  const totalMaterialsCount = resources.length;
  const lectureNotesCount = resources.filter((r) => r.type === "NOTE").length;
  const midQuestionsCount = resources.filter((r) => r.type === "MID_QUESTION").length;
  const finalQuestionsCount = resources.filter((r) => r.type === "FINAL_QUESTION").length;
  const examQuestionsCount = midQuestionsCount + finalQuestionsCount;
  const quizCtCount = resources.filter((r) => r.type === "QUIZ_CT").length;
  const labAssetsCount = resources.filter((r) => r.type && r.type.startsWith("LAB_")).length;

  const getDeptColorClass = (dept?: string) => {
    const code = normalizeDeptCode(dept);
    switch (code) {
      case "CSE":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "EEE":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "BBA":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "ICT":
        return "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20";
      case "SWE":
        return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20";
      case "PHR":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "ENG":
        return "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20";
      case "TEX":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      case "LAW":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "ARCH":
        return "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20";
      case "BNG":
        return "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border-emerald-600/20";
      case "ECO":
        return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20";
      default:
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
    }
  };

  const getResourceTypeBadge = (type?: string) => {
    switch (type) {
      case "NOTE":
        return {
          label: "Lecture Note",
          className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        };
      case "MID_QUESTION":
        return {
          label: "Midterm Exam",
          className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        };
      case "FINAL_QUESTION":
        return {
          label: "Final Exam",
          className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
        };
      case "QUIZ_CT":
        return {
          label: "Quiz / CT",
          className: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
        };
      case "LAB_MANUAL":
        return {
          label: "Lab Manual",
          className: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
        };
      case "LAB_QUIZ":
        return {
          label: "Lab Quiz",
          className: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
        };
      case "LAB_FINAL":
        return {
          label: "Lab Final",
          className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
        };
      case "LAB_REPORT":
        return {
          label: "Lab Report",
          className: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
        };
      case "LAB_HAND_NOTE":
        return {
          label: "Lab Note",
          className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        };
      default:
        return {
          label: type || "Material",
          className: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
        };
    }
  };

  const filteredCourses = courses.filter((c) => {
    const q = courseSearch.toLowerCase();
    const matchSearch =
      !q ||
      c.code?.toLowerCase().includes(q) ||
      c.title?.toLowerCase().includes(q) ||
      c.teachers?.some((t: any) => t.name?.toLowerCase().includes(q) || t.initial?.toLowerCase().includes(q));
    const matchDept =
      courseDeptFilter === "ALL" ||
      (c.department && c.department.toUpperCase() === courseDeptFilter.toUpperCase());
    const isLab = Boolean(c.lab || c.isLab);
    const matchType =
      courseTypeFilter === "ALL" ||
      (courseTypeFilter === "THEORY" && !isLab) ||
      (courseTypeFilter === "LAB" && isLab);
    const sem = Number(c.semester) || 1;
    const matchSem =
      courseSemesterGroup === "ALL" ||
      (courseSemesterGroup === "1-4" && sem >= 1 && sem <= 4) ||
      (courseSemesterGroup === "5-8" && sem >= 5 && sem <= 8) ||
      (courseSemesterGroup === "9-12" && sem >= 9 && sem <= 12);
    return matchSearch && matchDept && matchType && matchSem;
  });

  const filteredTeachers = teachers.filter((t) => {
    const q = teacherSearch.toLowerCase();
    const matchSearch =
      !q ||
      t.name?.toLowerCase().includes(q) ||
      t.initial?.toLowerCase().includes(q) ||
      t.designation?.toLowerCase().includes(q) ||
      t.room?.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q);
    const matchDept =
      teacherDeptFilter === "ALL" ||
      (t.department && t.department.toUpperCase() === teacherDeptFilter.toUpperCase());
    const matchCategory =
      teacherCategoryFilter === "ALL" ||
      (t.category && t.category.toUpperCase() === teacherCategoryFilter.toUpperCase());
    return matchSearch && matchDept && matchCategory;
  });

  const filteredDepartments = dynamicDepartments.filter((deptCode) => {
    const q = departmentSearch.trim().toLowerCase();
    if (!q) return true;
    const meta = DEFAULT_DEPARTMENT_META[deptCode];
    const name = customDeptNames[deptCode] || meta?.name || "";
    return deptCode.toLowerCase().includes(q) || name.toLowerCase().includes(q);
  });

  // Courses KPI metrics
  const theoryCoursesCount = courses.filter((c) => !c.lab && !c.isLab).length;
  const labCoursesCount = courses.filter((c) => c.lab || c.isLab).length;
  const totalCreditWeight = courses.reduce((sum, c) => sum + (Number(c.credits) || 3), 0);

  // Teachers KPI metrics
  const professorCount = teachers.filter((t) => t.designation?.toLowerCase().includes("prof")).length;
  const lecturerCount = teachers.filter((t) => t.designation?.toLowerCase().includes("lecturer")).length;
  const departmentsRepresentedCount = new Set(teachers.map((t) => t.department?.toUpperCase()).filter(Boolean)).size;

  // Matrix KPI metrics
  const assignedCoursesCount = courses.filter((c) => (c.teachers || []).length > 0).length;
  const unassignedCoursesCount = courses.filter((c) => (c.teachers || []).length === 0).length;
  const totalFacultyAssignments = courses.reduce((acc, c) => acc + (c.teachers || []).length, 0);

  // Course-Faculty Matrix filtered lists
  const matrixCourses =
    matrixDeptFilter === "ALL"
      ? courses
      : courses.filter((c) => (c.department || "CSE").toUpperCase() === matrixDeptFilter.toUpperCase());

  const matrixTeachers =
    matrixDeptFilter === "ALL"
      ? teachers
      : teachers.filter((t) => (t.department || "CSE").toUpperCase() === matrixDeptFilter.toUpperCase());

  const pendingReviewsCount = adminReviews.filter((r) => r.status === "PENDING").length;
  const filteredAdminReviews = adminReviews.filter((r) => {
    if (reviewStatusFilter === "ALL") return true;
    return r.status === reviewStatusFilter;
  });

  // Paginated Data
  const totalResourcePages = Math.max(1, Math.ceil(filteredResources.length / RESOURCE_PAGE_SIZE));
  const paginatedResources = filteredResources.slice(
    (resourcePage - 1) * RESOURCE_PAGE_SIZE,
    resourcePage * RESOURCE_PAGE_SIZE
  );

  const totalCoursePages = Math.max(1, Math.ceil(filteredCourses.length / COURSE_PAGE_SIZE));
  const paginatedCourses = filteredCourses.slice(
    (coursePage - 1) * COURSE_PAGE_SIZE,
    coursePage * COURSE_PAGE_SIZE
  );

  const totalTeacherPages = Math.max(1, Math.ceil(filteredTeachers.length / TEACHER_PAGE_SIZE));
  const paginatedTeachers = filteredTeachers.slice(
    (teacherPage - 1) * TEACHER_PAGE_SIZE,
    teacherPage * TEACHER_PAGE_SIZE
  );

  const totalPaymentPages = Math.max(1, Math.ceil(payments.length / PAYMENT_PAGE_SIZE));
  const paginatedPayments = payments.slice(
    (paymentPage - 1) * PAYMENT_PAGE_SIZE,
    paymentPage * PAYMENT_PAGE_SIZE
  );

  const studentUsersCount = staffList.filter((u) => u.role === "ROLE_STUDENT").length;
  const staffUsersCount = staffList.filter((u) => u.role !== "ROLE_STUDENT").length;

  const filteredUsers = staffList.filter((u) => {
    const term = userSearch.toLowerCase().trim();
    if (term) {
      const matchName = u.name?.toLowerCase().includes(term);
      const matchEmail = u.email?.toLowerCase().includes(term);
      const matchStudentId = u.studentId?.toLowerCase().includes(term);
      if (!matchName && !matchEmail && !matchStudentId) return false;
    }

    if (userRoleCategory === "STUDENTS" && u.role !== "ROLE_STUDENT") return false;
    if (userRoleCategory === "STAFF" && u.role === "ROLE_STUDENT") return false;

    if (userSpecificRole !== "ALL" && u.role !== userSpecificRole) return false;

    if (userStatusFilter === "ACTIVE" && u.enabled === false) return false;
    if (userStatusFilter === "BLOCKED" && u.enabled !== false) return false;

    return true;
  });

  const totalStaffPages = Math.max(1, Math.ceil(filteredUsers.length / STAFF_PAGE_SIZE));
  const paginatedStaff = filteredUsers.slice(
    (staffPage - 1) * STAFF_PAGE_SIZE,
    staffPage * STAFF_PAGE_SIZE
  );

  const totalContributionPages = Math.max(1, Math.ceil(contributions.length / CONTRIBUTION_PAGE_SIZE));
  const paginatedContributions = contributions.slice(
    (contributionPage - 1) * CONTRIBUTION_PAGE_SIZE,
    contributionPage * CONTRIBUTION_PAGE_SIZE
  );

  const totalWaiverPages = Math.max(1, Math.ceil(waivers.length / WAIVER_PAGE_SIZE));
  const paginatedWaivers = waivers.slice(
    (waiverPage - 1) * WAIVER_PAGE_SIZE,
    waiverPage * WAIVER_PAGE_SIZE
  );

  // Notice Board Computations
  const filteredNotices = notices.filter((n) => {
    const q = noticeSearch.toLowerCase().trim();
    const matchesSearch =
      q === "" ||
      (n.text && n.text.toLowerCase().includes(q)) ||
      (n.link && n.link.toLowerCase().includes(q));
    const matchesType = noticeTypeFilter === "ALL" || n.type === noticeTypeFilter;
    return matchesSearch && matchesType;
  });

  const totalNoticePages = Math.max(1, Math.ceil(filteredNotices.length / NOTICE_PAGE_SIZE));
  const paginatedNotices = filteredNotices.slice(
    (noticePage - 1) * NOTICE_PAGE_SIZE,
    noticePage * NOTICE_PAGE_SIZE
  );

  const totalReviewPages = Math.max(1, Math.ceil(filteredAdminReviews.length / REVIEW_PAGE_SIZE));
  const paginatedReviews = filteredAdminReviews.slice(
    (reviewPage - 1) * REVIEW_PAGE_SIZE,
    reviewPage * REVIEW_PAGE_SIZE
  );

  // Total pending items requiring immediate action
  const totalPendingActionItems =
    (isSuperAdmin ? payments.length : 0) + contributions.length + waivers.length + pendingReviewsCount;

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-slate-100 dark:bg-[#0a0f1d] text-slate-900 dark:text-slate-100 flex flex-col antialiased transition-colors duration-200">
      
      {/* ========================================================================= */}
      {/* 1. TOP UNIFIED EXECUTIVE ADMIN HEADER (64px / h-16)                       */}
      {/* ========================================================================= */}
      <header className="h-16 shrink-0 bg-white dark:bg-[#0d1527] border-b border-slate-200 dark:border-slate-800/80 px-4 sm:px-6 flex items-center justify-between z-30 transition-colors">
        {/* Left: Mobile Toggle, Brand & Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <BrandLogo variant="admin" size="sm" showTagline={false} className="shrink-0" />

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-2 hidden md:block" />

          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
            <span>Admin Console</span>
            <span className="text-slate-300 dark:text-slate-600">/</span>
            <span className="text-blue-600 dark:text-blue-400 font-bold capitalize">
              {activeTab === "overview"
                ? "Executive Dashboard"
                : activeTab === "departments"
                ? "Departments & Academic Units"
                : activeTab === "resources"
                ? "Materials & Exam Papers"
                : activeTab === "courses"
                ? "Courses Directory"
                : activeTab === "teachers"
                ? "Faculty Directory"
                : activeTab === "courseTeachers"
                ? "Course-Faculty Matrix"
                : activeTab === "payments"
                ? "Subscription Payments"
                : activeTab === "contributions"
                ? "Student Submissions"
                : activeTab === "waivers"
                ? "Financial Waivers"
                : activeTab === "reviews"
                ? "Faculty Reviews Moderation"
                : activeTab === "notices"
                ? "Campus Notice Board"
                : activeTab === "chat"
                ? "Campus Live Chatroom Moderation"
                : activeTab === "staff"
                ? "User Accounts & RBAC"
                : "System Settings"}
            </span>
          </div>
        </div>

        {/* Right: Quick Action, Refresh, Notifications, Lang, Theme, User Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {activeTab === "departments" && (
            <button
              onClick={openAddDepartmentModal}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Department</span>
            </button>
          )}



          {activeTab === "resources" && (
            <button
              onClick={openNewResourceModal}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upload Material</span>
            </button>
          )}

          {activeTab === "courses" && (
            <button
              onClick={openNewCourseModal}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Course</span>
            </button>
          )}

          {activeTab === "teachers" && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncCseFaculties}
                disabled={syncingCse}
                className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                title="Sync CSE Faculty directly from official website (cse.seu.edu.bd/cse-faculties-staff)"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingCse ? "animate-spin text-emerald-500" : ""}`} />
                <span>{syncingCse ? "Syncing..." : "⚡ Sync Official CSE"}</span>
              </button>
              <button
                onClick={openNewTeacherModal}
                className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Faculty</span>
              </button>
            </div>
          )}

          {activeTab === "courseTeachers" && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={openNewCourseModal}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-all"
                title="Create New Academic Course"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Course</span>
              </button>
              <button
                onClick={openNewTeacherModal}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-sm transition-all"
                title="Register New Faculty Member"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Faculty</span>
              </button>
            </div>
          )}

          {activeTab === "notices" && (
            <button
              onClick={openNewNoticeModal}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Notice</span>
            </button>
          )}

          {/* Header Action: Security & Activity Logs */}
          {activeTab === "activityLogs" && (
            <div className="flex items-center gap-2">
              {isSuperAdmin && (
                <button
                  onClick={async () => {
                    if (confirm("Are you sure you want to clear all activity audit logs?")) {
                      try {
                        await api.admin.clearActivityLogs();
                        loadActivityLogs(1, "", "ALL");
                      } catch (err: any) {
                        alert(err?.message || "Failed to clear logs");
                      }
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/50 shadow-xs transition-all"
                  title="Clear All Activity Logs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear Logs</span>
                </button>
              )}
              <button
                onClick={() => loadActivityLogs(activityLogPage, activityLogSearch, activityLogCategory)}
                disabled={loadingActivityLogs}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-xs transition-all disabled:opacity-50"
                title="Refresh Activity Logs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingActivityLogs ? "animate-spin text-emerald-500" : ""}`} />
                <span className="hidden sm:inline">Refresh Logs</span>
              </button>
            </div>
          )}

          {activeTab === "staff" && (
            <button
              onClick={() => {
                setStaffRole(isSuperAdmin ? "ROLE_ADMIN" : "ROLE_STUDENT");
                setStaffStudentId("");
                setShowStaffModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isSuperAdmin ? "Add User / Staff" : "Add Student"}</span>
            </button>
          )}

          <button
            onClick={() => loadAllAdminData()}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-700/60"
            title="Refresh All Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <NotificationBell />

          <button
            onClick={toggleLanguage}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
            title="Toggle Language"
          >
            {language === "bn" ? "বাং" : "EN"}
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
          </button>

          {/* Interactive Executive Profile & Session Dropdown */}
          <div className="relative pl-2 sm:pl-3 border-l border-slate-200 dark:border-slate-800" ref={profileDropdownRef}>
            <button
              onClick={() => setProfileDropdownOpen((prev) => !prev)}
              className={`flex items-center gap-2 sm:gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-2xl transition-all duration-150 border cursor-pointer select-none ${
                profileDropdownOpen
                  ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 shadow-sm"
                  : "border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:border-slate-200 dark:hover:border-slate-700/60"
              }`}
              title="Admin Account & Session Options"
              aria-expanded={profileDropdownOpen}
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-sm overflow-hidden shrink-0">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user?.name ? user.name[0]?.toUpperCase() : "A"
                )}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-slate-900 dark:text-white leading-none truncate max-w-[130px]">
                  {user?.name || "Admin"}
                </div>
                <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold leading-none mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{user?.role?.replace("ROLE_", "") || "ADMIN"}</span>
                </div>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                  profileDropdownOpen ? "rotate-180 text-blue-500" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu Panel */}
            {profileDropdownOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1.5 text-xs select-none"
              >
                {/* User Info Header Card */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black text-base flex items-center justify-center shrink-0 shadow-md shadow-purple-500/20 overflow-hidden">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      user?.name ? user.name[0]?.toUpperCase() : "A"
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-sm text-slate-900 dark:text-white truncate">
                      {user?.name || "Administrator"}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {user?.email || "admin@seu.edu.bd"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="font-mono text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        {user?.role?.replace("ROLE_", "") || "SUPER_ADMIN"}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Online
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Navigation Items */}
                <div className="p-1 space-y-0.5">
                  <button
                    onClick={() => {
                      setActiveTab("overview");
                      setProfileDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors font-semibold ${
                      activeTab === "overview"
                        ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 text-blue-500" />
                    <span>Executive Overview</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab("settings");
                      setProfileDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors font-semibold ${
                      activeTab === "settings"
                        ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <Settings className="w-4 h-4 text-purple-500" />
                    <div className="flex items-center justify-between flex-1">
                      <span>System Settings & Profile</span>
                      <span className="text-[10px] text-slate-400 font-normal">Edit info</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab("staff");
                      setProfileDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors font-semibold ${
                      activeTab === "staff"
                        ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>User Directory & Access Control</span>
                  </button>

                  <Link
                    href="/"
                    target="_blank"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors font-semibold"
                  >
                    <div className="flex items-center gap-2.5">
                      <ExternalLink className="w-4 h-4 text-indigo-500" />
                      <span>View Public Website</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">SEU Live</span>
                  </Link>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-200 dark:border-slate-800 my-1" />

                {/* Logout Action */}
                <div className="p-1">
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold transition-all group cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <LogOut className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="leading-tight">Log Out / End Session</p>
                      <p className="text-[10px] font-normal text-slate-400 dark:text-slate-500">Securely sign out of NoteLagbe HQ</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. BODY WRAPPER: FIXED SIDEBAR + INDEPENDENT SCROLLING CONTENT            */}
      {/* ========================================================================= */}
      <div className="flex-1 flex min-h-0 overflow-hidden">

        {/* Left Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 top-16 z-50 w-72 bg-white dark:bg-[#0d1527] border-r border-slate-200 dark:border-slate-800/80 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:w-72 lg:h-full shrink-0 ${
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Mobile Drawer Close Bar */}
          <div className="lg:hidden p-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800 dark:text-slate-300">Admin Navigation</span>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Live System Indicator */}
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Live Management</span>
            </div>
            <span className="font-mono text-slate-700 dark:text-slate-400 bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700/60 font-bold">
              {user?.role?.replace("ROLE_", "")}
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-6 flex-1 text-xs font-semibold">
            
            {/* Group: CORE DASHBOARD */}
            <div>
              <div className="px-3 mb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Dashboard & Analytics
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setActiveTab("overview");
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                    activeTab === "overview"
                      ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard Overview</span>
                  </div>
                  {totalPendingActionItems > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-black">
                      {totalPendingActionItems}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    setActiveTab("analytics");
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                    activeTab === "analytics"
                      ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    <span>{language === "bn" ? "রিপোর্ট ও অ্যানালিটিক্স" : "Reports & Analytics"}</span>
                  </div>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                    KPIs
                  </span>
                </button>
              </div>
            </div>

            {/* Group: ACADEMIC DIRECTORIES & CRUD */}
            <div>
              <div className="px-3 mb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Academic Management
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setActiveTab("departments");
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                    activeTab === "departments"
                      ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4" />
                    <span>Departments & Units</span>
                  </div>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-transparent">
                    {dynamicDepartments.length}
                  </span>
                </button>



                <button
                  onClick={() => {
                    setActiveTab("courses");
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                    activeTab === "courses"
                      ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <GraduationCap className="w-4 h-4" />
                    <span>Courses Directory</span>
                  </div>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-transparent">
                    {courses.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("teachers");
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                    activeTab === "teachers"
                      ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4" />
                    <span>Faculty Directory</span>
                  </div>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-transparent">
                    {teachers.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("courseTeachers");
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                    activeTab === "courseTeachers"
                      ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Layers className="w-4 h-4" />
                    <span>Course-Faculty Matrix</span>
                  </div>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-transparent">
                    {courses.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("resources");
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                    activeTab === "resources"
                      ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-4 h-4" />
                    <span>Materials & Exams</span>
                  </div>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-transparent">
                    {resources.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Group: VERIFICATION QUEUES */}
            <div>
              <div className="px-3 mb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Student Verification Queues
              </div>
              <div className="space-y-1">
                {isSuperAdmin && (
                  <button
                    onClick={() => {
                      setActiveTab("payments");
                      setMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                      activeTab === "payments"
                        ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-4 h-4" />
                      <span>Subscription Payments</span>
                    </div>
                    <span
                      className={`font-mono text-[11px] px-2 py-0.5 rounded-lg ${
                        payments.length > 0
                          ? "bg-amber-500 text-black font-extrabold animate-pulse"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-transparent"
                      }`}
                    >
                      {payments.length}
                    </span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setActiveTab("contributions");
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                    activeTab === "contributions"
                      ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-4 h-4" />
                    <span>Student Submissions</span>
                  </div>
                  <span
                    className={`font-mono text-[11px] px-2 py-0.5 rounded-lg ${
                      contributions.length > 0
                        ? "bg-emerald-500 text-white font-extrabold"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-transparent"
                    }`}
                  >
                    {contributions.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("waivers");
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                    activeTab === "waivers"
                      ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Award className="w-4 h-4" />
                    <span>Financial Waivers</span>
                  </div>
                  <span
                    className={`font-mono text-[11px] px-2 py-0.5 rounded-lg ${
                      waivers.length > 0
                        ? "bg-purple-500 text-white font-extrabold"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-transparent"
                    }`}
                  >
                    {waivers.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("reviews");
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                    activeTab === "reviews"
                      ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Star className="w-4 h-4" />
                    <span>Faculty Reviews</span>
                  </div>
                  <span
                    className={`font-mono text-[11px] px-2 py-0.5 rounded-lg ${
                      pendingReviewsCount > 0
                        ? "bg-amber-500 text-black font-extrabold"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-transparent"
                    }`}
                  >
                    {pendingReviewsCount > 0 ? `${pendingReviewsCount} new` : adminReviews.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Group: ACCESS & CONFIG */}
            <div>
              <div className="px-3 mb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Security & Platform
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setActiveTab("notices");
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                    activeTab === "notices"
                      ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Megaphone className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                    <span>Campus Notice Board</span>
                  </div>
                  <span
                    className={`font-mono text-[11px] px-2 py-0.5 rounded-lg ${
                      notices.filter((n) => n.active).length > 0
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-transparent"
                    }`}
                  >
                    {notices.filter((n) => n.active).length} active
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("chat");
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                    activeTab === "chat"
                      ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                    <span>Live Chat Moderation</span>
                  </div>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 font-bold border border-cyan-500/30">
                    {chatMessages.length} msgs
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("staff");
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                    activeTab === "staff"
                      ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4" />
                    <span>User Accounts & RBAC</span>
                  </div>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-transparent">
                    {staffList.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("activityLogs");
                    setMobileSidebarOpen(false);
                    loadActivityLogs(1, activityLogSearch, activityLogCategory);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                    activeTab === "activityLogs"
                      ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    <span>Security & Activity Logs</span>
                  </div>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                    {activityLogsData.totalItems > 0 ? activityLogsData.totalItems : "Live"}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab("settings");
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ${
                    activeTab === "settings"
                      ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/25"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Settings className="w-4 h-4" />
                    <span>System Settings</span>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${emailNotificationsEnabled ? "bg-emerald-500" : "bg-slate-600"}`} />
                </button>
              </div>
            </div>
          </nav>

          {/* Footer User Card */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/40 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user?.name?.charAt(0) || "A"
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name || "Administrator"}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Link
                href="/"
                target="_blank"
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 transition-colors border border-slate-200 dark:border-slate-700/60 shadow-2xs"
              >
                <span>View Public Site</span>
                <ExternalLink className="w-3 h-3 text-slate-500 dark:text-slate-400" />
              </Link>
              <button
                onClick={() => logout()}
                className="p-2 rounded-xl bg-white hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors border border-slate-200 dark:border-slate-700/60 shadow-2xs cursor-pointer"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile sidebar */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN ADMIN PORTAL CONTENT AREA                                         */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto bg-slate-50/70 dark:bg-[#0a0f1d] transition-colors">
        
        {/* Section In-Page Title Header */}
        <div className="px-6 sm:px-8 pt-6 pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {activeTab === "overview" && "Executive Overview & Health"}
              {activeTab === "departments" && "Departments & Academic Units Management"}
              {activeTab === "courses" && "Academic Course Catalog Directory"}
              {activeTab === "teachers" && "Faculty Member Directory & Profiles"}
              {activeTab === "courseTeachers" && "Course-Faculty Teaching Assignment Matrix"}
              {activeTab === "resources" && "Materials & Question Papers Management"}
              {activeTab === "payments" && "Student Subscription Payment Verifications"}
              {activeTab === "contributions" && "Peer Crowdsourcing Submissions & Rewards"}
              {activeTab === "waivers" && "Financial Aid & Hardship Waiver Requests"}
              {activeTab === "reviews" && "Student Feedback & Evaluation Moderation"}
              {activeTab === "notices" && "Campus Live Notice Board & Alerts"}
              {activeTab === "chat" && "SEU Campus Live Chatroom Moderation"}
              {activeTab === "staff" && "User Directory & Access Control (RBAC)"}
              {activeTab === "settings" && "Platform Configuration & SMTP Notifications"}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {activeTab === "overview" && "Real-time key performance indicators and university operational metrics."}
              {activeTab === "departments" && "Manage university departments, faculty programs, curriculum allocations, and archives."}
              {activeTab === "courses" && "Create, update, and manage official SEU courses and syllabus metadata."}
              {activeTab === "teachers" && "Add new instructors, manage faculty designations, and update rooms & emails."}
              {activeTab === "courseTeachers" && "Map and assign faculties to specific active semester courses."}
              {activeTab === "resources" && "Search, edit, verify, and remove learning assets and examination archives."}
              {activeTab === "payments" && "Verify bKash / Nagad transaction IDs and approve student premium access."}
              {activeTab === "contributions" && "Review student uploads and grant 2 free course access rewards."}
              {activeTab === "waivers" && "Review and approve student financial hardship exemption applications."}
              {activeTab === "reviews" && "Moderate student ratings and course / teacher feedback submissions."}
              {activeTab === "notices" && "Broadcast real-time single-line ticker alerts, schedule news, and urgent campus announcements to the homepage."}
              {activeTab === "chat" && "Monitor live student conversations, voice notes, 24-hour pinned announcements, and enforce anti-harassment user blocking."}
              {activeTab === "staff" && "Manage university student profiles, course managers, and administrative RBAC staff credentials."}
              {activeTab === "settings" && "Configure university system alerts, SMTP server, and platform policies."}
            </p>
          </div>
        </div>

        {/* Dynamic Section Content */}
        <main className="p-4 sm:p-8 space-y-8 flex-1">
          
          {/* ========================================================================= */}
          {/* TAB: OVERVIEW (EXECUTIVE DASHBOARD)                                       */}
          {/* ========================================================================= */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              
              {/* Alert Banner for pending tasks */}
              {totalPendingActionItems > 0 && (
                <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-amber-950 dark:text-amber-200">
                        {totalPendingActionItems} Action Items Requiring Administrative Review
                      </h3>
                      <p className="text-xs text-amber-800 dark:text-amber-400/80 mt-0.5">
                        {payments.length} pending payments • {contributions.length} material submissions • {waivers.length} financial waivers • {pendingReviewsCount} reviews to moderate
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {payments.length > 0 && (
                      <button
                        onClick={() => setActiveTab("payments")}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-black hover:bg-amber-400 transition-colors shadow-sm"
                      >
                        Review Payments ({payments.length})
                      </button>
                    )}
                    {pendingReviewsCount > 0 && (
                      <button
                        onClick={() => setActiveTab("reviews")}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-amber-100 text-amber-900 dark:bg-slate-800 dark:text-amber-300 dark:hover:bg-slate-700 transition-colors border border-amber-500/30 shadow-xs"
                      >
                        Moderate Reviews ({pendingReviewsCount})
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Top KPI Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Academic Materials */}
                <div
                  onClick={() => setActiveTab("resources")}
                  className="p-5 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800/90 shadow-sm hover:border-blue-500/50 cursor-pointer transition-all space-y-3 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Materials & Exams</span>
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <BookOpen className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{resources.length}</div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                      <span>Notes & question papers</span>
                      <ArrowUpRight className="w-3 h-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                  </div>
                </div>

                {/* 2. Active Courses */}
                <div
                  onClick={() => setActiveTab("courses")}
                  className="p-5 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800/90 shadow-sm hover:border-indigo-500/50 cursor-pointer transition-all space-y-3 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Catalog Courses</span>
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{courses.length}</div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                      <span>Full curriculum</span>
                      <ArrowUpRight className="w-3 h-3 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                  </div>
                </div>

                {/* 3. Faculty Members */}
                <div
                  onClick={() => setActiveTab("teachers")}
                  className="p-5 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800/90 shadow-sm hover:border-purple-500/50 cursor-pointer transition-all space-y-3 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Faculty Members</span>
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{teachers.length}</div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                      <span>Instructors & professors</span>
                      <ArrowUpRight className="w-3 h-3 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                  </div>
                </div>

                {/* 4. Subscriptions / Payments (SUPER ADMIN ONLY) or Student Community */}
                {isSuperAdmin ? (
                  <div
                    onClick={() => setActiveTab("payments")}
                    className="p-5 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800/90 shadow-sm hover:border-emerald-500/50 cursor-pointer transition-all space-y-3 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Payments</span>
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <CreditCard className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{payments.length}</div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                        <span>Manual bKash/Nagad</span>
                        <ArrowUpRight className="w-3 h-3 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setActiveTab("staff")}
                    className="p-5 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800/90 shadow-sm hover:border-blue-500/50 cursor-pointer transition-all space-y-3 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Student Community</span>
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Users className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{studentUsersCount}</div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                        <span>Active Students</span>
                        <ArrowUpRight className="w-3 h-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </p>
                    </div>
                  </div>
                )}

              </div>

              {/* Second Row: Management Shortcuts Hub */}
              <div className="p-6 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Administrative Actions Hub</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Quickly provision resources, manage curriculum, and grant student access.</p>
                  </div>
                  <span className="text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                    Full CRUD Activated
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <button
                    onClick={openNewResourceModal}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 text-left transition-all space-y-2 group shadow-xs"
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-900 dark:text-white">Upload New Material</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Add lecture slides, midterm or final questions</p>
                    </div>
                  </button>

                  <button
                    onClick={openNewCourseModal}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 text-left transition-all space-y-2 group shadow-xs"
                  >
                    <div className="w-8 h-8 rounded-xl bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-900 dark:text-white">Create New Course</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Add code, credits, lab status, and syllabus</p>
                    </div>
                  </button>

                  <button
                    onClick={openNewTeacherModal}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 text-left transition-all space-y-2 group shadow-xs"
                  >
                    <div className="w-8 h-8 rounded-xl bg-purple-600/10 dark:bg-purple-600/20 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-900 dark:text-white">Add Faculty Profile</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Register initials, room, photo, and designations</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setStaffRole(isSuperAdmin ? "ROLE_ADMIN" : "ROLE_STUDENT");
                      setStaffStudentId("");
                      setShowStaffModal(true);
                    }}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 text-left transition-all space-y-2 group shadow-xs"
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-600/10 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                      {isSuperAdmin ? <ShieldCheck className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-900 dark:text-white">
                        {isSuperAdmin ? "Provision Staff Member" : "Register Student"}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {isSuperAdmin
                          ? "Authorize Admins or Course Managers"
                          : "Register verified Southeast University student"}
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Third Row: Recent Materials & Recent Student Feedback Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Recent Uploads */}
                <div className="p-6 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                      <span>Recently Uploaded Materials</span>
                    </h3>
                    <button
                      onClick={() => setActiveTab("resources")}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View All ({resources.length})
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {resources.slice(0, 5).map((r) => (
                      <div
                        key={r.id}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs hover:bg-slate-100/80 dark:hover:bg-slate-800/50 transition-colors shadow-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{r.course?.code}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/80 dark:border-transparent">
                              {r.type}
                            </span>
                          </div>
                          <p className="font-medium text-slate-900 dark:text-white truncate mt-0.5">{r.title}</p>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                          {r.semesterName || "Fall 2026"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pending Student Reviews Preview */}
                <div className="p-6 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                      <span>Student Reviews Queue</span>
                    </h3>
                    <button
                      onClick={() => setActiveTab("reviews")}
                      className="text-xs font-bold text-amber-500 dark:text-amber-400 hover:underline"
                    >
                      Moderate ({adminReviews.length})
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {adminReviews.slice(0, 5).map((rev) => (
                      <div
                        key={rev.id}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs hover:bg-slate-100/80 dark:hover:bg-slate-800/50 transition-colors shadow-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{rev.courseCode || "CSE"}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                rev.status === "PENDING"
                                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                  : rev.status === "APPROVED"
                                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                  : "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                              }`}
                            >
                              {rev.status}
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 truncate mt-0.5 italic">&quot;{rev.comment}&quot;</p>
                        </div>
                        <div className="flex items-center gap-1 text-amber-500 dark:text-amber-400 shrink-0">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="font-bold text-slate-800 dark:text-white">{rev.rating || 5}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: DEPARTMENTS & UNITS MANAGEMENT (SENIOR SWE ARCHITECTURE)             */}
          {/* ========================================================================= */}
          {activeTab === "departments" && (
            <div className="space-y-6">
              {/* 4 KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Departments */}
                <div className="p-5 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Academic Units
                    </p>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                      {dynamicDepartments.length}
                    </div>
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-semibold">
                      University Departments
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6" />
                  </div>
                </div>

                {/* 2. Total Courses */}
                <div 
                  onClick={() => setActiveTab("courses")}
                  className="p-5 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm cursor-pointer hover:border-indigo-500/40 transition-all group"
                >
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Curriculum Courses
                    </p>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                      {courses.length}
                    </div>
                    <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1 font-semibold flex items-center gap-1">
                      <span>Across All Semesters</span>
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                </div>

                {/* 3. Total Faculty */}
                <div 
                  onClick={() => setActiveTab("teachers")}
                  className="p-5 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm cursor-pointer hover:border-purple-500/40 transition-all group"
                >
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Faculty Members
                    </p>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                      {teachers.length}
                    </div>
                    <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-semibold flex items-center gap-1">
                      <span>Instructors & Professors</span>
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

                {/* 4. Total Study Materials */}
                <div 
                  onClick={() => setActiveTab("resources")}
                  className="p-5 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm cursor-pointer hover:border-emerald-500/40 transition-all group"
                >
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Learning Archives
                    </p>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                      {resources.length}
                    </div>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                      <span>Notes & Question Bank</span>
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <BookOpen className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Controls Header & Search */}
              <div className="p-4 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                <div className="relative w-full sm:w-96">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={departmentSearch}
                    onChange={(e) => setDepartmentSearch(e.target.value)}
                    placeholder="Search departments by code or name (e.g. CSE, ICT, BBA)..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={openAddDepartmentModal}
                    className="px-4 py-2.5 rounded-2xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/25 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Department</span>
                  </button>
                </div>
              </div>

              {/* Departments Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredDepartments.map((deptCode) => {
                  const normalized = normalizeDeptCode(deptCode);
                  const meta = DEFAULT_DEPARTMENT_META[normalized] || DEFAULT_DEPARTMENT_META[deptCode] || {
                    code: normalized.length > 4 ? normalized.slice(0, 4) : normalized,
                    name: customDeptNames[deptCode] || customDeptNames[normalized] || `${normalized} Department`,
                    school: "Southeast University Academic Unit",
                    gradient: "from-blue-600 to-indigo-600",
                  };
                  const displayBadge = meta.code || (normalized.length > 4 ? normalized.slice(0, 4) : normalized);
                  const deptName = customDeptNames[deptCode] || customDeptNames[normalized] || meta.name;
                  const deptCourses = courses.filter((c) => isDeptMatch(c.department, deptCode));
                  const deptTeachers = teachers.filter((t) => isDeptMatch(t.department, deptCode));
                  const deptMaterials = resources.filter((r) => isDeptMatch(r.course?.department, deptCode));

                  return (
                    <div
                      key={deptCode}
                      className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 dark:hover:border-blue-500/40 transition-all flex flex-col justify-between space-y-4 sm:space-y-5 shadow-sm group"
                    >
                      <div className="space-y-4">
                        {/* Header: Badge & Actions */}
                        <div className="flex items-start justify-between gap-3 min-w-0">
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <div
                              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr ${meta.gradient} text-white flex items-center justify-center shadow-md shadow-blue-600/15 shrink-0 overflow-hidden px-1 border border-white/20 select-none`}
                            >
                              <span
                                className={`font-black tracking-tight leading-none text-center select-none uppercase truncate max-w-full ${
                                  displayBadge.length > 4
                                    ? "text-[9px] sm:text-[10px]"
                                    : displayBadge.length === 4
                                    ? "text-xs"
                                    : "text-xs sm:text-sm"
                                }`}
                              >
                                {displayBadge}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                                  {displayBadge} Unit
                                </span>
                                {deptCode !== displayBadge && (
                                  <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500 shrink-0">
                                    ({deptCode})
                                  </span>
                                )}
                              </div>
                              <h3
                                className="font-black text-sm sm:text-base text-slate-900 dark:text-white mt-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate"
                                title={deptName}
                              >
                                {deptName}
                              </h3>
                              <p
                                className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate"
                                title={meta.school}
                              >
                                {meta.school}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => openEditDepartmentModal(deptCode)}
                              className="p-2 rounded-xl text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Edit Department"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteDepartment(deptCode)}
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Delete Department"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Department Statistics Pill Matrix */}
                        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setCourseDeptFilter(deptCode);
                              setActiveTab("courses");
                            }}
                            className="p-1 rounded-xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-xs transition-all group/stat text-center"
                            title={`Filter ${deptCourses.length} Courses in ${deptCode}`}
                          >
                            <div className="font-black text-base text-slate-900 dark:text-white group-hover/stat:text-blue-600 dark:group-hover/stat:text-blue-400 transition-colors">
                              {deptCourses.length}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                              Courses
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setTeacherDeptFilter(deptCode);
                              setActiveTab("teachers");
                            }}
                            className="p-1 rounded-xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-xs transition-all border-x border-slate-200/80 dark:border-slate-800/80 group/stat text-center"
                            title={`Filter ${deptTeachers.length} Faculty in ${deptCode}`}
                          >
                            <div className="font-black text-base text-slate-900 dark:text-white group-hover/stat:text-purple-600 dark:group-hover/stat:text-purple-400 transition-colors">
                              {deptTeachers.length}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                              Faculty
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setDepartmentFilter(deptCode);
                              setActiveTab("resources");
                            }}
                            className="p-1 rounded-xl hover:bg-white dark:hover:bg-slate-800 hover:shadow-xs transition-all group/stat text-center"
                            title={`Filter ${deptMaterials.length} Materials in ${deptCode}`}
                          >
                            <div className="font-black text-base text-slate-900 dark:text-white group-hover/stat:text-emerald-600 dark:group-hover/stat:text-emerald-400 transition-colors">
                              {deptMaterials.length}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                              Materials
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Quick Filter Navigation Buttons */}
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                        <button
                          onClick={() => {
                            setCourseDeptFilter(deptCode);
                            setActiveTab("courses");
                          }}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-blue-50 dark:bg-slate-800/80 dark:hover:bg-blue-950/40 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-center border border-slate-200 dark:border-slate-700/60"
                        >
                          Courses ({deptCourses.length})
                        </button>
                        <button
                          onClick={() => {
                            setTeacherDeptFilter(deptCode);
                            setActiveTab("teachers");
                          }}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-purple-50 dark:bg-slate-800/80 dark:hover:bg-purple-950/40 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors text-center border border-slate-200 dark:border-slate-700/60"
                        >
                          Faculty ({deptTeachers.length})
                        </button>
                        <button
                          onClick={() => {
                            setDepartmentFilter(deptCode);
                            setActiveTab("resources");
                          }}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800/80 dark:hover:bg-emerald-950/40 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-center border border-slate-200 dark:border-slate-700/60"
                        >
                          Materials ({deptMaterials.length})
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: MATERIALS & EXAM PAPERS (FULL CRUD)                                   */}
          {/* ========================================================================= */}
          {activeTab === "resources" && (
            <div className="space-y-6">
              
              {/* Top Row: 4 KPI Cards for Materials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Total Archives */}
                <div className="p-5 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Materials</p>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                      {totalMaterialsCount}
                    </div>
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-semibold flex items-center gap-1">
                      <span>Across {dynamicDepartments.length} Departments</span>
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                    <BookOpen className="w-6 h-6" />
                  </div>
                </div>

                {/* 2. Lecture Notes */}
                <div 
                  onClick={() => setResourceTypeFilter(resourceTypeFilter === "NOTE" ? "ALL" : "NOTE")}
                  className="p-5 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm cursor-pointer hover:border-emerald-500/40 transition-all group"
                >
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lecture Handnotes</p>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                      {lectureNotesCount}
                    </div>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                      <span>Slides & Student Notes</span>
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                </div>

                {/* 3. Question Papers */}
                <div 
                  onClick={() => setResourceTypeFilter(resourceTypeFilter === "EXAMS" ? "ALL" : "EXAMS")}
                  className="p-5 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm cursor-pointer hover:border-purple-500/40 transition-all group"
                >
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Exam Questions</p>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                      {examQuestionsCount}
                    </div>
                    <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-semibold flex items-center gap-1">
                      <span>{midQuestionsCount} Midterm • {finalQuestionsCount} Final</span>
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                    <FileQuestion className="w-6 h-6" />
                  </div>
                </div>

                {/* 4. Lab Assets & Quizzes */}
                <div 
                  onClick={() => setResourceTypeFilter(resourceTypeFilter === "LABS" ? "ALL" : "LABS")}
                  className="p-5 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm cursor-pointer hover:border-cyan-500/40 transition-all group"
                >
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Labs & Quizzes</p>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                      {labAssetsCount + quizCtCount}
                    </div>
                    <p className="text-[11px] text-cyan-600 dark:text-cyan-400 mt-1 font-semibold flex items-center gap-1">
                      <span>{labAssetsCount} Lab Files • {quizCtCount} Quizzes/CT</span>
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center shrink-0">
                    <Layers className="w-6 h-6" />
                  </div>
                </div>

              </div>

              {/* Quick Filter Pills Row */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setResourceTypeFilter("ALL")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    resourceTypeFilter === "ALL"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                      : "bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span>All Materials</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-500/10 font-mono">
                    {totalMaterialsCount}
                  </span>
                </button>

                <button
                  onClick={() => setResourceTypeFilter("NOTE")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    resourceTypeFilter === "NOTE"
                      ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                      : "bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-emerald-500"
                  }`}
                >
                  <span>Lecture Handnotes</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-500/10 font-mono">
                    {lectureNotesCount}
                  </span>
                </button>

                <button
                  onClick={() => setResourceTypeFilter("MID_QUESTION")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    resourceTypeFilter === "MID_QUESTION"
                      ? "bg-amber-600 text-white shadow-sm shadow-amber-600/30"
                      : "bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-amber-500"
                  }`}
                >
                  <span>Midterm Questions</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/10 font-mono">
                    {midQuestionsCount}
                  </span>
                </button>

                <button
                  onClick={() => setResourceTypeFilter("FINAL_QUESTION")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    resourceTypeFilter === "FINAL_QUESTION"
                      ? "bg-purple-600 text-white shadow-sm shadow-purple-600/30"
                      : "bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-purple-500"
                  }`}
                >
                  <span>Final Exam Questions</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-purple-500/10 font-mono">
                    {finalQuestionsCount}
                  </span>
                </button>

                <button
                  onClick={() => setResourceTypeFilter("QUIZ_CT")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    resourceTypeFilter === "QUIZ_CT"
                      ? "bg-sky-600 text-white shadow-sm shadow-sky-600/30"
                      : "bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-sky-500"
                  }`}
                >
                  <span>Quizzes & CTs</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-sky-500/10 font-mono">
                    {quizCtCount}
                  </span>
                </button>

                <button
                  onClick={() => setResourceTypeFilter("LABS")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    resourceTypeFilter === "LABS"
                      ? "bg-cyan-600 text-white shadow-sm shadow-cyan-600/30"
                      : "bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-cyan-500"
                  }`}
                >
                  <span>Lab Manuals & Reports</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-cyan-500/10 font-mono">
                    {labAssetsCount}
                  </span>
                </button>
              </div>

              {/* Search & Action Toolbar */}
              <div className="p-4 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={resourceSearch}
                    onChange={(e) => setResourceSearch(e.target.value)}
                    placeholder="Search title, course code, teacher..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  {resourceSearch && (
                    <button
                      onClick={() => setResourceSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-between md:justify-end">
                  <div className="flex items-center gap-2">
                    <select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200 font-semibold focus:outline-none"
                    >
                      <option value="ALL">All Departments ({filteredResources.length})</option>
                      {dynamicDepartments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept} Department
                        </option>
                      ))}
                    </select>

                    <select
                      value={resourceTypeFilter}
                      onChange={(e) => setResourceTypeFilter(e.target.value)}
                      className="px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200 font-semibold focus:outline-none"
                    >
                      <option value="ALL">All Material Types</option>
                      <option value="NOTE">Lecture Notes</option>
                      <option value="MID_QUESTION">Midterm Exams</option>
                      <option value="FINAL_QUESTION">Final Exams</option>
                      <option value="QUIZ_CT">Quiz & Class Tests</option>
                      <option value="LABS">All Lab Assets</option>
                      <option value="LAB_MANUAL">Lab Manuals</option>
                      <option value="LAB_QUIZ">Lab Quizzes</option>
                      <option value="LAB_FINAL">Lab Finals</option>
                      <option value="LAB_REPORT">Lab Reports</option>
                      <option value="LAB_HAND_NOTE">Lab Hand Notes</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* PRIMARY ACTION: Upload Material */}
                    <button
                      type="button"
                      onClick={openNewResourceModal}
                      className="px-4 py-2 rounded-2xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25 flex items-center gap-1.5 transition-all"
                      title="Upload new lecture notes, exam papers, or lab manuals"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Upload Material</span>
                    </button>

                    {/* Secondary Action: Add Department */}
                    <button
                      type="button"
                      onClick={() => setShowAddDeptModal(true)}
                      className="px-3 py-2 rounded-2xl font-bold text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-all shadow-sm"
                      title="Register a new academic department into the system"
                    >
                      <Building2 className="w-3.5 h-3.5 text-blue-500" />
                      <span>+ Dept</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Materials Table */}
              <div className="rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-6 py-4">Course & Dept</th>
                        <th className="px-6 py-4">Material Title & Format</th>
                        <th className="px-6 py-4">Assigned Faculty</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Semester</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {paginatedResources.length > 0 ? (
                        paginatedResources.map((r) => {
                          const typeBadge = getResourceTypeBadge(r.type);
                          const deptBadgeClass = getDeptColorClass(r.course?.department);
                          return (
                            <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="flex flex-col gap-1 shrink-0">
                                    <span className="font-mono font-black text-xs px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-center">
                                      {r.course?.code || "GEN"}
                                    </span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border text-center ${deptBadgeClass}`}>
                                      {r.course?.department || "CSE"}
                                    </span>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-900 dark:text-white truncate max-w-[140px] sm:max-w-xs" title={r.course?.title}>
                                      {r.course?.title || "General Course"}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                      {r.course?.credits || 3.0} Credits {r.course?.isLab ? "• Lab Course" : ""}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-6 py-4">
                                <div className="space-y-1">
                                  <p className="font-bold text-slate-900 dark:text-white max-w-xs sm:max-w-md truncate" title={r.title}>
                                    {r.title}
                                  </p>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                    <span className="flex items-center gap-1 font-mono">
                                      <FileText className="w-3 h-3 text-slate-400" />
                                      <span>PDF Document</span>
                                    </span>
                                    {r.fileUrl && (
                                      <a
                                        href={r.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                                      >
                                        <span>Direct Link</span>
                                        <ExternalLink className="w-2.5 h-2.5" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="px-6 py-4">
                                {r.teacher ? (
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-bold text-xs flex items-center justify-center shrink-0">
                                      {r.teacher.initial ? r.teacher.initial.slice(0, 2) : r.teacher.name?.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                      <span className="text-slate-800 dark:text-slate-200 font-semibold block truncate max-w-[130px]">
                                        {r.teacher.name}
                                      </span>
                                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                        {r.teacher.initial && (
                                          <span className="font-mono text-purple-600 dark:text-purple-400">[{r.teacher.initial}]</span>
                                        )}
                                        {r.teacher.room && <span>• Rm {r.teacher.room}</span>}
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">General / Dept Shared</span>
                                )}
                              </td>

                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border inline-block ${typeBadge.className}`}>
                                  {typeBadge.label}
                                </span>
                              </td>

                              <td className="px-6 py-4">
                                <span className="font-mono text-xs text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                  {r.semesterName
                                    ? (/\d{4}/.test(r.semesterName) ? r.semesterName : `${r.semesterName} ${r.academicYear || ""}`.trim())
                                    : (r.academicYear ? `Semester (${r.academicYear})` : "Fall 2026")}
                                </span>
                              </td>

                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {r.fileUrl && (
                                    <a
                                      href={r.fileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-slate-800 transition-colors"
                                      title="Open Material in new tab"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </a>
                                  )}
                                  <button
                                    onClick={() => openEditResourceModal(r)}
                                    className="p-2 rounded-xl text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-amber-400 dark:hover:bg-slate-800 transition-colors"
                                    title="Edit Material"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteResource(r.id)}
                                    className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-slate-800 transition-colors"
                                    title="Delete Permanently"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                            <BookOpen className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
                            <p className="font-bold">No academic materials found matching your filters.</p>
                            <p className="text-xs mt-1">Try resetting the department filter or search term.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <TablePagination
                  currentPage={resourcePage}
                  totalPages={totalResourcePages}
                  totalItems={filteredResources.length}
                  itemsPerPage={RESOURCE_PAGE_SIZE}
                  onPageChange={setResourcePage}
                  itemName="materials"
                />
              </div>
            </div>
          )}



          {/* ========================================================================= */}
          {/* TAB: COURSES MANAGEMENT (FULL CRUD)                                       */}
          {/* ========================================================================= */}
          {activeTab === "courses" && (
            <div className="space-y-6">
              
              {/* Top Row: 4 KPI Cards for Courses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Courses */}
                <div className="p-5 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Courses</p>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                      {courses.length}
                    </div>
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-semibold">
                      Full University Catalog
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                </div>

                {/* 2. Theory Courses */}
                <div 
                  onClick={() => setCourseTypeFilter(courseTypeFilter === "THEORY" ? "ALL" : "THEORY")}
                  className="p-5 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm cursor-pointer hover:border-sky-500/40 transition-all group"
                >
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Theory Courses</p>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                      {theoryCoursesCount}
                    </div>
                    <p className="text-[11px] text-sky-600 dark:text-sky-400 mt-1 font-semibold flex items-center gap-1">
                      <span>Lectures & Conceptual</span>
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
                    <BookOpen className="w-6 h-6" />
                  </div>
                </div>

                {/* 3. Practical Labs */}
                <div 
                  onClick={() => setCourseTypeFilter(courseTypeFilter === "LAB" ? "ALL" : "LAB")}
                  className="p-5 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm cursor-pointer hover:border-purple-500/40 transition-all group"
                >
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Practical Labs</p>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                      {labCoursesCount}
                    </div>
                    <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-semibold flex items-center gap-1">
                      <span>Hands-on Engineering</span>
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                    <Layers className="w-6 h-6" />
                  </div>
                </div>

                {/* 4. Total Credits */}
                <div className="p-5 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Credit Weight</p>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                      {totalCreditWeight}
                    </div>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                      Cumulative Academic Hours
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Award className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Quick Filter Pills Row */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setCourseTypeFilter("ALL")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    courseTypeFilter === "ALL"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                      : "bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span>All Curricula</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-500/10 font-mono">
                    {courses.length}
                  </span>
                </button>

                <button
                  onClick={() => setCourseTypeFilter("THEORY")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    courseTypeFilter === "THEORY"
                      ? "bg-sky-600 text-white shadow-sm shadow-sky-600/30"
                      : "bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-sky-500"
                  }`}
                >
                  <span>Theory Only</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-sky-500/10 font-mono">
                    {theoryCoursesCount}
                  </span>
                </button>

                <button
                  onClick={() => setCourseTypeFilter("LAB")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    courseTypeFilter === "LAB"
                      ? "bg-purple-600 text-white shadow-sm shadow-purple-600/30"
                      : "bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-purple-500"
                  }`}
                >
                  <span>Practical Labs</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-purple-500/10 font-mono">
                    {labCoursesCount}
                  </span>
                </button>

                <div className="h-4 w-px bg-slate-200 dark:border-slate-800 shrink-0 mx-1" />

                <button
                  onClick={() => setCourseSemesterGroup("ALL")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    courseSemesterGroup === "ALL"
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25"
                      : "bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-500"
                  }`}
                >
                  All Semesters
                </button>

                <button
                  onClick={() => setCourseSemesterGroup("1-4")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    courseSemesterGroup === "1-4"
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25"
                      : "bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-500"
                  }`}
                >
                  1st - 4th Sem (Foundation)
                </button>

                <button
                  onClick={() => setCourseSemesterGroup("5-8")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    courseSemesterGroup === "5-8"
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25"
                      : "bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-500"
                  }`}
                >
                  5th - 8th Sem (Core Engineering)
                </button>

                <button
                  onClick={() => setCourseSemesterGroup("9-12")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    courseSemesterGroup === "9-12"
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25"
                      : "bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-500"
                  }`}
                >
                  9th - 12th Sem (Advanced / Elective)
                </button>
              </div>

              {/* Controls Header */}
              <div className="p-4 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    placeholder="Search courses by code, title, teacher..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {courseSearch && (
                    <button
                      onClick={() => setCourseSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                  <select
                    value={courseDeptFilter}
                    onChange={(e) => setCourseDeptFilter(e.target.value)}
                    className="px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
                  >
                    <option value="ALL">All Departments ({filteredCourses.length})</option>
                    {dynamicDepartments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept} Department
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={openNewCourseModal}
                    className="px-4 py-2.5 rounded-2xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/25 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Course</span>
                  </button>
                </div>
              </div>

              {/* Courses Grid / Table */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedCourses.map((c) => {
                  const assignedTeachers = c.teachers || [];
                  const isLab = Boolean(c.lab || c.isLab);

                  return (
                    <div
                      key={c.code}
                      className="p-5 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 dark:hover:border-blue-500/40 transition-all flex flex-col justify-between space-y-4 shadow-sm"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-xs px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              {c.code}
                            </span>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                              {c.department || "CSE"}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-transparent">
                              {c.credits || 3} Credits
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${isLab ? "bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/20" : "bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-500/20"}`}>
                              {isLab ? "Practical Lab" : "Theory Course"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditCourseModal(c)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Edit Course"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCourse(c.code)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Delete Course"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">{c.title}</h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{c.department || "CSE"} Department • Semester {c.semester || "General"}</p>
                        </div>

                        {/* Assigned Teachers Tags */}
                        <div className="pt-1">
                          <p className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">Conducted Faculty ({assignedTeachers.length}):</p>
                          <div className="flex flex-wrap gap-1">
                            {assignedTeachers.length > 0 ? (
                              assignedTeachers.map((t: any) => (
                                <span
                                  key={t.id}
                                  className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/50"
                                >
                                  {t.name} {t.initial ? `[${t.initial}]` : ""}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">No faculty assigned yet</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                        <Link
                          href={`/courses/${c.code}`}
                          target="_blank"
                          className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 text-[11px]"
                        >
                          <span>Open Public Course Page</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                        <button
                          onClick={() => {
                            setSelectedCourseForFaculty(c.code);
                            setActiveTab("courseTeachers");
                            setCfMode("byCourse");
                          }}
                          className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline"
                        >
                          Manage Faculty &rarr;
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1527]">
                <TablePagination
                  currentPage={coursePage}
                  totalPages={totalCoursePages}
                  totalItems={filteredCourses.length}
                  itemsPerPage={COURSE_PAGE_SIZE}
                  onPageChange={setCoursePage}
                  itemName="courses"
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: FACULTY DIRECTORY (FULL CRUD)                                        */}
          {/* ========================================================================= */}
          {activeTab === "teachers" && (
            <div className="space-y-6">

              {/* Official SEU CSE Sync Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        Official SEU CSE Faculty Directory Sync
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                        cse.seu.edu.bd
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Directly synchronizes profile pictures, official room numbers, emails, phone extensions, and designations with Southeast University official records without affecting student reviews.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSyncCseFaculties}
                  disabled={syncingCse}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/25 transition-all flex items-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingCse ? "animate-spin" : ""}`} />
                  <span>{syncingCse ? "Synchronizing with SEU..." : "Run Official Sync Now"}</span>
                </button>
              </div>
              
              {/* Top Row: 4 KPI Cards for Faculty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Faculty */}
                <div className="p-5 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Faculty</p>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                      {teachers.length}
                    </div>
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-semibold">
                      Registered Instructors
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

                {/* 2. Professors */}
                <div className="p-5 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Professors & Assoc.</p>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                      {professorCount}
                    </div>
                    <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-semibold">
                      Senior Academic Leadership
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                    <Award className="w-6 h-6" />
                  </div>
                </div>

                {/* 3. Lecturers */}
                <div className="p-5 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lecturers & Staff</p>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                      {lecturerCount}
                    </div>
                    <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1 font-semibold">
                      Teaching & Lab Faculty
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                </div>

                {/* 4. Departments Covered */}
                <div className="p-5 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Depts Represented</p>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                      {departmentsRepresentedCount}
                    </div>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                      Across All Faculties
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Quick Filter Pills Row */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setTeacherCategoryFilter("ALL")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    teacherCategoryFilter === "ALL"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                      : "bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span>All Faculty</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-500/10 font-mono">
                    {teachers.length}
                  </span>
                </button>

                <button
                  onClick={() => setTeacherCategoryFilter("FULL_TIME_FACULTY")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    teacherCategoryFilter === "FULL_TIME_FACULTY"
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                      : "bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-500"
                  }`}
                >
                  <span>Full-Time Faculty</span>
                </button>

                <button
                  onClick={() => setTeacherCategoryFilter("ADJUNCT_FACULTY")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    teacherCategoryFilter === "ADJUNCT_FACULTY"
                      ? "bg-purple-600 text-white shadow-sm shadow-purple-600/30"
                      : "bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-purple-500"
                  }`}
                >
                  <span>Adjunct Faculty</span>
                </button>

                <button
                  onClick={() => setTeacherCategoryFilter("VISITING_FACULTY")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    teacherCategoryFilter === "VISITING_FACULTY"
                      ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                      : "bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-emerald-500"
                  }`}
                >
                  <span>Visiting Faculty</span>
                </button>
              </div>

              {/* Controls Header */}
              <div className="p-4 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                    placeholder="Search faculty by name, initials, room..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {teacherSearch && (
                    <button
                      onClick={() => setTeacherSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                  <select
                    value={teacherDeptFilter}
                    onChange={(e) => setTeacherDeptFilter(e.target.value)}
                    className="px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
                  >
                    <option value="ALL">All Departments ({filteredTeachers.length})</option>
                    {dynamicDepartments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept} Department
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={openNewTeacherModal}
                    className="px-4 py-2 rounded-2xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/25 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Faculty Member</span>
                  </button>
                </div>
              </div>

              {/* Faculty Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedTeachers.map((t) => {
                  const teacherCourses = courses.filter((c) =>
                    c.teachers?.some((tc: any) => tc.id === t.id)
                  );

                  return (
                    <div
                      key={t.id}
                      className="p-5 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 hover:border-blue-500/40 dark:hover:border-blue-500/40 transition-all flex flex-col justify-between space-y-4 shadow-sm"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <FacultyAvatar
                              image={t.image}
                              name={t.name}
                              initial={t.initial}
                              designation={t.designation}
                              size="md"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{t.name}</h4>
                                {t.initial && (
                                  <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                                    [{t.initial}]
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                  {t.department || "CSE"}
                                </span>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.designation || "Faculty Member"}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditTeacherModal(t)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Edit Faculty Profile"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTeacher(t.id, t.name)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Delete Faculty Profile"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800/60">
                          {t.room && <p>📍 Room: <strong className="text-slate-900 dark:text-slate-200">{t.room}</strong></p>}
                          {t.email && <p>✉️ Email: <strong className="text-slate-900 dark:text-slate-200">{t.email}</strong></p>}
                          {t.phone && <p>📞 Phone: <strong className="text-slate-900 dark:text-slate-200">{t.phone}</strong></p>}
                          <p>
                            🎓 Conducted Courses:{" "}
                            <strong className="text-blue-600 dark:text-blue-400 font-bold">{teacherCourses.length} Courses</strong>
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                        <Link
                          href={`/teachers/${t.id}`}
                          target="_blank"
                          className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 text-[11px]"
                        >
                          <span>View Public Profile</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                        <button
                          onClick={() => {
                            setSelectedFacultyId(t.id);
                            setActiveTab("courseTeachers");
                            setCfMode("byFaculty");
                          }}
                          className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline"
                        >
                          Assign Courses &rarr;
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d1527]">
                <TablePagination
                  currentPage={teacherPage}
                  totalPages={totalTeacherPages}
                  totalItems={filteredTeachers.length}
                  itemsPerPage={TEACHER_PAGE_SIZE}
                  onPageChange={setTeacherPage}
                  itemName="faculty members"
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: COURSE-FACULTY MATRIX                                                */}
          {/* ========================================================================= */}
          {activeTab === "courseTeachers" && (
            <div className="space-y-6">
              
              {/* Top Row: 4 KPI Cards for Assignment Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Courses */}
                <div className="p-5 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Curriculum Offerings</p>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                      {courses.length}
                    </div>
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-semibold">
                      Total Course Modules
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                </div>

                {/* 2. Assigned Courses */}
                <div className="p-5 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assigned Courses</p>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                      {assignedCoursesCount}
                    </div>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                      Active Faculty Assigned
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                </div>

                {/* 3. Unassigned Courses */}
                <div className="p-5 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Unassigned Courses</p>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                      {unassignedCoursesCount}
                    </div>
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-semibold">
                      Awaiting Faculty Link
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                </div>

                {/* 4. Total Assignments */}
                <div className="p-5 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Allocations</p>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                      {totalFacultyAssignments}
                    </div>
                    <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-semibold">
                      Course-Teacher Pairs
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                    <Layers className="w-6 h-6" />
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Layers className="w-5 h-5 text-blue-500" />
                      <span>Course & Faculty Offerings Manager</span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Configure which instructors teach each course. Conducted tags and study materials will update automatically.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={matrixDeptFilter}
                      onChange={(e) => setMatrixDeptFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
                    >
                      <option value="ALL">All Departments</option>
                      {dynamicDepartments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept} Department
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={openNewCourseModal}
                      className="px-3 py-1.5 rounded-xl font-bold text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 flex items-center gap-1 transition-all shadow-sm"
                      title="Create New Academic Course"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Course</span>
                    </button>

                    <button
                      type="button"
                      onClick={openNewTeacherModal}
                      className="px-3 py-1.5 rounded-xl font-bold text-xs bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center gap-1 transition-all shadow-sm"
                      title="Register New Faculty Member"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Faculty</span>
                    </button>

                    <div className="inline-flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold">
                      <button
                        onClick={() => setCfMode("byCourse")}
                        className={`px-3.5 py-1.5 rounded-xl transition-all ${
                          cfMode === "byCourse"
                            ? "bg-blue-600 text-white font-bold shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        Manage by Course
                      </button>
                      <button
                        onClick={() => setCfMode("byFaculty")}
                        className={`px-3.5 py-1.5 rounded-xl transition-all ${
                          cfMode === "byFaculty"
                            ? "bg-blue-600 text-white font-bold shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        Manage by Faculty
                      </button>
                    </div>
                  </div>
                </div>

                {/* MODE 1: BY COURSE */}
                {cfMode === "byCourse" ? (
                  <div className="space-y-5">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center gap-3">
                      <div className="flex-1 w-full">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 block">Select Target Course:</label>
                        <SearchableCourseSelect
                          value={selectedCourseForFaculty || matrixCourses[0]?.code || courses[0]?.code || ""}
                          onChange={(code) => setSelectedCourseForFaculty(code)}
                          courses={matrixCourses}
                          placeholder="Select course..."
                        />
                      </div>

                      <div className="flex-1 w-full">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 block">Select Teacher to Assign:</label>
                        <SearchableTeacherSelect
                          value={teacherToAssignId}
                          onChange={(tid) => setTeacherToAssignId(tid)}
                          teachers={matrixTeachers}
                          placeholder="Search & select faculty..."
                          allowGeneral={false}
                        />
                      </div>

                      <button
                        onClick={() =>
                          handleAssignTeacher(
                            selectedCourseForFaculty || matrixCourses[0]?.code || courses[0]?.code,
                            Number(teacherToAssignId)
                          )
                        }
                        disabled={assigning}
                        className="w-full md:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white mt-auto h-[42px] shrink-0 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20"
                      >
                        {assigning ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Assigning...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            <span>Assign Faculty</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Assigned Faculty list for selected course */}
                    {(() => {
                      const activeCourseCode = selectedCourseForFaculty || courses[0]?.code;
                      const activeCourse = courses.find((c) => c.code === activeCourseCode);
                      const assignedTeachers = activeCourse?.teachers || [];

                      return (
                        <div className="space-y-3">
                          <h3 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                            Faculty currently conducting {activeCourseCode} ({assignedTeachers.length}):
                          </h3>

                          {assignedTeachers.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {assignedTeachers.map((t: any) => (
                                <div
                                  key={t.id}
                                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-sm"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-500/20">
                                      {t.initial || t.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{t.name}</p>
                                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{t.designation || "Faculty"}</p>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => handleRemoveTeacher(activeCourseCode, t.id, t.name)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    title="Remove assignment"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                              No faculty members assigned to {activeCourseCode} yet.
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  /* MODE 2: BY FACULTY */
                  <div className="space-y-5">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center gap-3">
                      <div className="flex-1 w-full">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 block">Select Target Faculty Member:</label>
                        <SearchableTeacherSelect
                          value={selectedFacultyId || matrixTeachers[0]?.id || teachers[0]?.id || ""}
                          onChange={(tid) => setSelectedFacultyId(tid)}
                          teachers={matrixTeachers}
                          placeholder="Select faculty member..."
                          allowGeneral={false}
                        />
                      </div>

                      <div className="flex-1 w-full">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 block">Select Course to Assign:</label>
                        <SearchableCourseSelect
                          value={courseToAssignCode}
                          onChange={(code) => setCourseToAssignCode(code)}
                          courses={matrixCourses}
                          placeholder="Search & choose course..."
                        />
                      </div>

                      <button
                        onClick={() =>
                          handleAssignTeacher(
                            courseToAssignCode,
                            Number(selectedFacultyId || matrixTeachers[0]?.id || teachers[0]?.id)
                          )
                        }
                        disabled={assigning}
                        className="w-full md:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white mt-auto h-[42px] shrink-0 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20"
                      >
                        {assigning ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Assigning...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            <span>Assign Course</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Courses conducted by selected teacher */}
                    {(() => {
                      const activeFacultyId = Number(selectedFacultyId || teachers[0]?.id);
                      const currentFaculty = teachers.find((t) => t.id === activeFacultyId);
                      const facultyCourses = courses.filter((c) =>
                        c.teachers?.some((t: any) => t.id === activeFacultyId)
                      );

                      return (
                        <div className="space-y-3">
                          <h3 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                            Courses conducted by {currentFaculty?.name || "Faculty Member"} ({facultyCourses.length}):
                          </h3>

                          {facultyCourses.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {facultyCourses.map((c: any) => (
                                <div
                                  key={c.code}
                                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-sm"
                                >
                                  <div>
                                    <p className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">{c.code}</p>
                                    <p className="font-medium text-xs text-slate-900 dark:text-white truncate max-w-[180px]">{c.title}</p>
                                  </div>

                                  <button
                                    onClick={() => handleRemoveTeacher(c.code, activeFacultyId, currentFaculty?.name || "Teacher")}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    title="Remove assignment"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                              No courses assigned to {currentFaculty?.name || "this faculty member"} yet.
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: PAYMENTS QUEUE                                                       */}
          {/* ========================================================================= */}
          {activeTab === "payments" && (
            !isSuperAdmin ? (
              <div className="p-16 text-center rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">Super Admin Clearance Required</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Subscription Payments and financial ledger verifications are strictly restricted to Super Administrators.
                </p>
                <button
                  onClick={() => setActiveTab("overview")}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs cursor-pointer"
                >
                  Return to Executive Overview
                </button>
              </div>
            ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">Manual bKash/Nagad Payment Approvals</h2>
                  <p className="text-xs text-slate-400">Approving unlocks 6 selected quota courses for the student.</p>
                </div>
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                  {payments.length} Pending
                </span>
              </div>

              {paginatedPayments.length > 0 ? (
                <div className="space-y-3">
                  {paginatedPayments.map((p) => {
                    let selectedCourses: any[] = [];
                    try {
                      if (p.selectedCoursesJson) selectedCourses = JSON.parse(p.selectedCoursesJson);
                    } catch {
                      selectedCourses = [];
                    }

                    return (
                      <div
                        key={p.id}
                        className="p-6 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                      >
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              {p.paymentMethod}
                            </span>
                            <span className="text-lg font-black text-slate-900 dark:text-white">৳{p.amount} • {p.planType}</span>
                          </div>

                          <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                            <p>Student: <strong className="text-slate-900 dark:text-white">{p.user?.name}</strong> ({p.user?.email})</p>
                            <p>Phone: <strong className="font-mono text-slate-900 dark:text-white">{p.senderPhone}</strong> • TrxID: <strong className="font-mono text-blue-600 dark:text-blue-400">{p.transactionId}</strong></p>
                          </div>

                          {selectedCourses.length > 0 && (
                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">6 Quota Courses Chosen by Student:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {selectedCourses.map((c: any, idx: number) => (
                                  <span key={idx} className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300/60 dark:border-transparent">
                                    {c.code || c.courseCode}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {p.slipUrl && (
                            <a
                              href={p.slipUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-bold text-blue-400 hover:underline"
                            >
                              <span>View Payment Slip Screenshot</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleApprovePayment(p.id)}
                            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 flex items-center gap-1.5"
                          >
                            <Check className="w-4 h-4" />
                            <span>Approve & Unlock 6</span>
                          </button>
                          <button
                            onClick={() => handleRejectPayment(p.id)}
                            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/60"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <TablePagination
                    currentPage={paymentPage}
                    totalPages={totalPaymentPages}
                    totalItems={payments.length}
                    itemsPerPage={PAYMENT_PAGE_SIZE}
                    onPageChange={setPaymentPage}
                    itemName="payments"
                  />
                </div>
              ) : (
                <div className="p-16 text-center rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                  No pending subscription requests at this time.
                </div>
              )}
            </div>
            )
          )}

          {/* ========================================================================= */}
          {/* TAB: STUDENT CONTRIBUTIONS                                                */}
          {/* ========================================================================= */}
          {activeTab === "contributions" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">Student Academic Contribution Queue</h2>
                  <p className="text-xs text-slate-400">Approving publishes the material and auto-unlocks 2 reward courses for the uploader.</p>
                </div>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  {contributions.length} Pending
                </span>
              </div>

              {paginatedContributions.length > 0 ? (
                <div className="space-y-3">
                  {paginatedContributions.map((c) => (
                    <div
                      key={c.id}
                      className="p-6 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                    >
                      <div className="space-y-2.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400">
                            {c.uploadedResource?.course?.code}
                          </span>
                          <span className="font-bold text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase">
                            Dept: {c.uploadedResource?.department || c.uploadedResource?.course?.department || "CSE"}
                          </span>
                          {c.uploadedResource?.teacher ? (
                            <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center gap-1">
                              <GraduationCap className="w-3.5 h-3.5" />
                              <span>[{c.uploadedResource.teacher.initial || "FA"}] {c.uploadedResource.teacher.name}</span>
                            </span>
                          ) : (
                            <span className="font-mono text-xs px-2.5 py-1 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                              Central / Unassigned Faculty
                            </span>
                          )}
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">{c.uploadedResource?.title}</h4>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Uploader: <strong className="text-slate-900 dark:text-white">{c.user?.name}</strong> ({c.user?.email}) • Type: <strong className="text-slate-700 dark:text-slate-300">{c.uploadedResource?.type}</strong>
                        </p>

                        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-slate-900 border border-emerald-200 dark:border-slate-800 text-xs text-emerald-800 dark:text-emerald-400">
                          <p className="font-bold text-emerald-700 dark:text-emerald-400">🎁 2 Reward Courses to be permanently unlocked:</p>
                          <p className="font-mono text-slate-700 dark:text-slate-300 mt-0.5">
                            1. {c.requestedCourse1?.code} ({c.requestedCourse1?.title})
                            <br />
                            2. {c.requestedCourse2?.code} ({c.requestedCourse2?.title})
                          </p>
                        </div>

                        {/* File Preview Thumbnail & Actions */}
                        {c.uploadedResource?.fileUrl && (
                          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            {isImageFile(c.uploadedResource.fileUrl) ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setImageZoom(1);
                                  setImageRotate(0);
                                  setAdminPreviewImage(c.uploadedResource.fileUrl);
                                }}
                                className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 group cursor-pointer"
                                title="Click to view image"
                              >
                                <img
                                  src={c.uploadedResource.fileUrl}
                                  alt={c.uploadedResource.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Eye className="w-5 h-5" />
                                </div>
                              </button>
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                                <FileText className="w-6 h-6" />
                              </div>
                            )}

                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={c.uploadedResource.fileUrl}>
                                {c.uploadedResource.fileUrl}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap">
                                {isImageFile(c.uploadedResource.fileUrl) ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setImageZoom(1);
                                      setImageRotate(0);
                                      setAdminPreviewImage(c.uploadedResource.fileUrl);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>View Image</span>
                                  </button>
                                ) : (
                                  <a
                                    href={c.uploadedResource.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Inspect Document</span>
                                  </a>
                                )}
                                <a
                                  href={c.uploadedResource.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px] flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Direct Link</span>
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <button
                          onClick={() => handleOpenEditContributionModal(c)}
                          className="px-3.5 py-2.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25 flex items-center gap-1.5 cursor-pointer"
                          title="Edit title, faculty initial or details before approving"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit & Approve</span>
                        </button>
                        <button
                          onClick={() => handleApproveContribution(c.id)}
                          className="px-3.5 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Quick Approve</span>
                        </button>
                        <button
                          onClick={() => handleRejectContribution(c.id)}
                          className="px-3.5 py-2.5 rounded-xl font-bold text-xs bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/60 cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}

                  <TablePagination
                    currentPage={contributionPage}
                    totalPages={totalContributionPages}
                    totalItems={contributions.length}
                    itemsPerPage={CONTRIBUTION_PAGE_SIZE}
                    onPageChange={setContributionPage}
                    itemName="submissions"
                  />
                </div>
              ) : (
                <div className="p-16 text-center rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                  No pending student submissions waiting for verification.
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: FINANCIAL WAIVERS                                                    */}
          {/* ========================================================================= */}
          {activeTab === "waivers" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-slate-900 dark:text-white">Financial Aid & Hardship Waiver Applications</h2>
                  <p className="text-xs text-slate-400">Approving grants the student the ৳99 Package (6 Course Unlocks Quota for 3 months).</p>
                </div>
                <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                  {waivers.length} Applications
                </span>
              </div>

              {paginatedWaivers.length > 0 ? (
                <div className="space-y-3">
                  {paginatedWaivers.map((w) => (
                    <div
                      key={w.id}
                      className="p-6 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300">
                            Target: ৳99 Package (6 Courses)
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {new Date(w.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {w.user?.name} • Student ID: {w.studentId} {w.cgpa ? `• CGPA: ${w.cgpa}` : ""}
                        </h4>
                        <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 italic">
                          &quot;{w.reason}&quot;
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">Email: {w.user?.email}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleApproveWaiver(w.id)}
                          className="px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>Accept & Grant 6</span>
                        </button>
                        <button
                          onClick={() => handleRejectWaiver(w.id)}
                          className="px-4 py-2.5 rounded-xl font-bold text-xs bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/60"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}

                  <TablePagination
                    currentPage={waiverPage}
                    totalPages={totalWaiverPages}
                    totalItems={waivers.length}
                    itemsPerPage={WAIVER_PAGE_SIZE}
                    onPageChange={setWaiverPage}
                    itemName="waivers"
                  />
                </div>
              ) : (
                <div className="p-16 text-center rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                  No pending financial waiver applications.
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: REVIEWS MODERATION                                                   */}
          {/* ========================================================================= */}
          {activeTab === "reviews" && (
            <div className="space-y-6">
              
              <div className="p-4 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Student Reviews & Evaluation Moderation</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Verify feedback quality before publishing to faculty profiles.</p>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
                  <button
                    onClick={() => setReviewStatusFilter("PENDING")}
                    className={`px-3 py-1.5 rounded-xl transition-all ${
                      reviewStatusFilter === "PENDING"
                        ? "bg-amber-500 text-slate-950 font-extrabold shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    Pending ({adminReviews.filter((r) => r.status === "PENDING").length})
                  </button>
                  <button
                    onClick={() => setReviewStatusFilter("APPROVED")}
                    className={`px-3 py-1.5 rounded-xl transition-all ${
                      reviewStatusFilter === "APPROVED"
                        ? "bg-emerald-600 text-white font-extrabold shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    Approved ({adminReviews.filter((r) => r.status === "APPROVED").length})
                  </button>
                  <button
                    onClick={() => setReviewStatusFilter("REJECTED")}
                    className={`px-3 py-1.5 rounded-xl transition-all ${
                      reviewStatusFilter === "REJECTED"
                        ? "bg-rose-600 text-white font-extrabold shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    Rejected ({adminReviews.filter((r) => r.status === "REJECTED").length})
                  </button>
                  <button
                    onClick={() => setReviewStatusFilter("ALL")}
                    className={`px-3 py-1.5 rounded-xl transition-all ${
                      reviewStatusFilter === "ALL"
                        ? "bg-blue-600 text-white font-extrabold shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    All ({adminReviews.length})
                  </button>
                </div>
              </div>

              {paginatedReviews.length > 0 ? (
                <div className="space-y-3">
                  {paginatedReviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-6 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-start justify-between gap-5 shadow-sm"
                    >
                      <div className="space-y-3 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-black bg-blue-500/20 text-blue-600 dark:text-blue-400">
                            Course: {rev.courseCode || rev.course?.code || "CSE"}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              rev.status === "PENDING"
                                ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                : rev.status === "APPROVED"
                                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30"
                            }`}
                          >
                            {rev.status}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            {new Date(rev.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-amber-500 dark:text-amber-400">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${s <= (rev.rating || 5) ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-700"}`}
                            />
                          ))}
                          <span className="text-xs font-bold text-slate-900 dark:text-white ml-1">({rev.rating || 5}/5)</span>
                        </div>

                        <p className="text-xs text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 italic leading-relaxed">
                          &quot;{rev.comment}&quot;
                        </p>

                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3">
                          <span>
                            Reviewer: <strong className="text-slate-900 dark:text-white">{rev.anonymous ? "Anonymous Student" : rev.authorName || "Student"}</strong>
                          </span>
                          {rev.teacher && (
                            <span>
                              Faculty: <strong className="text-purple-600 dark:text-purple-400">{rev.teacher.name}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {rev.status !== "APPROVED" && (
                          <button
                            onClick={() => handleApproveReview(rev.id)}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve & Publish</span>
                          </button>
                        )}
                        {rev.status === "APPROVED" && (
                          <button
                            onClick={() => handleRejectReview(rev.id)}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-600/20 hover:bg-amber-600/30 text-amber-700 dark:text-amber-300 border border-amber-600/40"
                          >
                            Unpublish
                          </button>
                        )}
                        {rev.status === "PENDING" && (
                          <button
                            onClick={() => handleRejectReview(rev.id)}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30"
                          >
                            Reject
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteReview(rev.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Delete permanently"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <TablePagination
                    currentPage={reviewPage}
                    totalPages={totalReviewPages}
                    totalItems={filteredAdminReviews.length}
                    itemsPerPage={REVIEW_PAGE_SIZE}
                    onPageChange={setReviewPage}
                    itemName="reviews"
                  />
                </div>
              ) : (
                <div className="p-16 text-center rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                  No reviews found matching the &quot;{reviewStatusFilter.toLowerCase()}&quot; filter.
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: USER DIRECTORY & RBAC MANAGEMENT                                     */}
          {/* ========================================================================= */}
          {activeTab === "notices" && (
            <button
              onClick={openNewNoticeModal}
              className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Notice</span>
            </button>
          )}

          {activeTab === "staff" && (
            <div className="space-y-6">
              
              {/* Top Banner Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                    <h3 className="font-black text-sm text-slate-900 dark:text-white">
                      All University Accounts & Access Control (RBAC)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                    {isSuperAdmin
                      ? "Super Administrator Clearance: You have full authority to register, edit, block, and manage Students, Course Managers, Admins, and Super Admins."
                      : "Standard Administrator Clearance: You can register, edit, block, and manage Student accounts. Managing administrative staff accounts requires Super Admin clearance."}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setStaffRole(isSuperAdmin ? "ROLE_ADMIN" : "ROLE_STUDENT");
                    setStaffStudentId("");
                    setShowStaffModal(true);
                  }}
                  className="px-4 py-2.5 rounded-2xl font-bold text-xs bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1.5 shadow-md shadow-purple-600/25 shrink-0 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSuperAdmin ? "Register User / Staff" : "Register Student"}</span>
                </button>
              </div>

              {/* Filtering & Search Controls */}
              <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                  {/* Search Bar */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search accounts by name, email, or student ID..."
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:border-blue-500"
                    />
                    {userSearch && (
                      <button
                        onClick={() => setUserSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Filter Selects */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Specific Role Dropdown */}
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                      <Filter className="w-3.5 h-3.5 text-slate-400" />
                      <select
                        value={userSpecificRole}
                        onChange={(e) => setUserSpecificRole(e.target.value)}
                        className="bg-transparent text-slate-700 dark:text-slate-300 font-bold focus:outline-none text-xs"
                      >
                        <option value="ALL">All Role Types</option>
                        <option value="ROLE_STUDENT">Students Only</option>
                        <option value="ROLE_ADMIN">Administrators</option>
                        <option value="ROLE_MANAGER">Course Managers</option>
                        <option value="ROLE_SUPER_ADMIN">Super Administrators</option>
                      </select>
                    </div>

                    {/* Status Dropdown */}
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                      <select
                        value={userStatusFilter}
                        onChange={(e) => setUserStatusFilter(e.target.value)}
                        className="bg-transparent text-slate-700 dark:text-slate-300 font-bold focus:outline-none text-xs"
                      >
                        <option value="ALL">All Statuses</option>
                        <option value="ACTIVE">Active Accounts</option>
                        <option value="BLOCKED">Blocked / Suspended</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Role Category Pills */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 overflow-x-auto text-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Quick View:</span>
                  <button
                    onClick={() => setUserRoleCategory("ALL")}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors shrink-0 ${
                      userRoleCategory === "ALL"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    All Accounts ({staffList.length})
                  </button>
                  <button
                    onClick={() => setUserRoleCategory("STUDENTS")}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors shrink-0 ${
                      userRoleCategory === "STUDENTS"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Students ({studentUsersCount})
                  </button>
                  <button
                    onClick={() => setUserRoleCategory("STAFF")}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors shrink-0 ${
                      userRoleCategory === "STAFF"
                        ? "bg-purple-600 text-white"
                        : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Staff & Admins ({staffUsersCount})
                  </button>
                </div>
              </div>

              {/* User Accounts Table */}
              <div className="rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-6 py-4">User Account</th>
                        <th className="px-6 py-4">University Email & Student ID</th>
                        <th className="px-6 py-4">Role Clearance</th>
                        <th className="px-6 py-4">Account Status</th>
                        <th className="px-6 py-4">Created Date</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {paginatedStaff.map((s) => {
                        const isStudent = s.role === "ROLE_STUDENT";
                        const canManage = isSuperAdmin || isStudent;
                        const isSelf = user?.id === s.id;
                        const isRoot = s.email === "admin@seu.edu.bd";

                        return (
                          <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shadow-sm text-white ${
                                  s.role === "ROLE_SUPER_ADMIN"
                                    ? "bg-amber-600"
                                    : s.role === "ROLE_ADMIN"
                                    ? "bg-purple-600"
                                    : s.role === "ROLE_MANAGER"
                                    ? "bg-blue-600"
                                    : "bg-emerald-600"
                                }`}>
                                  {s.name?.charAt(0) || "U"}
                                </div>
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-white block">{s.name}</span>
                                  {isSelf && (
                                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">You (Current Admin)</span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4">
                              <span className="text-slate-600 dark:text-slate-300 font-mono text-[11px] block">{s.email}</span>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                                {s.studentId && (
                                  <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                    ID: {s.studentId}
                                  </span>
                                )}
                                {s.phone && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                    <Phone className="w-2.5 h-2.5 text-slate-400" />
                                    {s.phone}
                                  </span>
                                )}
                              </div>
                              {s.address && (
                                <span className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[220px]" title={s.address}>
                                  <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                  {s.address}
                                </span>
                              )}
                            </td>

                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black border ${
                                s.role === "ROLE_SUPER_ADMIN"
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30"
                                  : s.role === "ROLE_MANAGER"
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/30"
                                  : s.role === "ROLE_ADMIN"
                                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/30"
                                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              }`}>
                                {s.role === "ROLE_STUDENT" ? "STUDENT" : s.role}
                              </span>
                            </td>

                            <td className="px-6 py-4">
                              {s.enabled === false ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                  <span>Blocked</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  <span>Active</span>
                                </span>
                              )}
                            </td>

                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                              {new Date(s.createdAt).toLocaleDateString()}
                            </td>

                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {/* Edit Account Details */}
                                <button
                                  onClick={() => handleOpenEditStaff(s)}
                                  disabled={!canManage}
                                  className={`p-2 rounded-xl transition-colors ${
                                    canManage
                                      ? "text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                      : "text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-40"
                                  }`}
                                  title={
                                    canManage
                                      ? "Edit account details"
                                      : "Requires Super Admin clearance to edit administrative staff"
                                  }
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>

                                {/* Toggle Block / Unblock */}
                                <button
                                  onClick={() => handleToggleStaffStatus(s)}
                                  disabled={!canManage || isSelf || isRoot || togglingStaffId === s.id}
                                  className={`p-2 rounded-xl transition-colors ${
                                    s.enabled === false
                                      ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                      : "text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                                  } disabled:opacity-30 disabled:cursor-not-allowed`}
                                  title={
                                    isSelf
                                      ? "Cannot block your own account"
                                      : isRoot
                                      ? "Root super admin cannot be blocked"
                                      : !canManage
                                      ? "Requires Super Admin clearance to suspend administrative staff"
                                      : s.enabled === false
                                      ? "Unblock account login"
                                      : "Block / Suspend account"
                                  }
                                >
                                  {s.enabled === false ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                </button>

                                {/* Delete / Revoke Access */}
                                <button
                                  onClick={() => handleDeleteStaff(s)}
                                  disabled={!canManage || isSelf || isRoot}
                                  className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                  title={
                                    isSelf
                                      ? "Cannot delete your own account"
                                      : isRoot
                                      ? "Root super admin cannot be deleted"
                                      : !canManage
                                      ? "Requires Super Admin clearance to delete administrative staff"
                                      : "Delete account"
                                  }
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <TablePagination
                  currentPage={staffPage}
                  totalPages={totalStaffPages}
                  totalItems={filteredUsers.length}
                  itemsPerPage={STAFF_PAGE_SIZE}
                  onPageChange={setStaffPage}
                  itemName="accounts"
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: SYSTEM & EMAIL SETTINGS                                              */}
          {/* ========================================================================= */}
          {activeTab === "settings" && (
            <div className="space-y-6 w-full">
              
              {/* Card 1: Administrator Profile Info & Edit (Full Width Top Hero) */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm w-full">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">Executive Profile & Account Details</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Logged-in administrator identity, contact information, and role clearance</p>
                    </div>
                  </div>

                  {!isEditingAdminProfile && (
                    <button
                      onClick={() => {
                        setAdminName(adminProfile?.name || user?.name || "");
                        setAdminEmail(adminProfile?.email || user?.email || "");
                        setAdminPhone(adminProfile?.phone || user?.phone || "");
                        setAdminAddress(adminProfile?.address || user?.address || "");
                        setIsEditingAdminProfile(true);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Profile Info</span>
                    </button>
                  )}
                </div>

                {!isEditingAdminProfile ? (
                  <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 p-5 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 w-full">
                    {/* Avatar Display & Actions */}
                    <div className="flex flex-col items-center gap-3 shrink-0">
                      <div className="relative group">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-500 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-purple-500/20 overflow-hidden border-2 border-purple-400/30">
                          {(adminProfile?.avatarUrl || user?.avatarUrl) ? (
                            <img src={adminProfile?.avatarUrl || user?.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            (adminProfile?.name || user?.name || "A").charAt(0).toUpperCase()
                          )}
                        </div>
                        {/* Camera overlay on hover */}
                        <label
                          htmlFor="admin-avatar-file"
                          className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold"
                          title="Change Profile Picture"
                        >
                          <Camera className="w-5 h-5 mb-0.5" />
                          <span>{uploadingAdminAvatar ? "..." : "Change"}</span>
                        </label>
                        <input
                          id="admin-avatar-file"
                          type="file"
                          accept="image/*"
                          onChange={handleUploadAdminAvatar}
                          disabled={uploadingAdminAvatar}
                          className="hidden"
                        />
                      </div>

                      {/* Quick Avatar Controls */}
                      <div className="flex items-center gap-1.5 flex-wrap justify-center">
                        <label
                          htmlFor="admin-avatar-file-btn"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900 cursor-pointer transition-colors"
                        >
                          <Camera className="w-3 h-3" />
                          <span>{uploadingAdminAvatar ? "Uploading..." : "Upload"}</span>
                        </label>
                        <input
                          id="admin-avatar-file-btn"
                          type="file"
                          accept="image/*"
                          onChange={handleUploadAdminAvatar}
                          disabled={uploadingAdminAvatar}
                          className="hidden"
                        />

                        <button
                          type="button"
                          onClick={() => setShowAvatarUrlInput(!showAvatarUrlInput)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          title="Enter image URL"
                        >
                          <LinkIcon className="w-3 h-3" />
                          <span>URL</span>
                        </button>

                        {(adminProfile?.avatarUrl || user?.avatarUrl) && (
                          <button
                            type="button"
                            onClick={handleRemoveAdminAvatar}
                            disabled={removingAdminAvatar}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900 transition-colors"
                            title="Remove profile picture"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{removingAdminAvatar ? "Removing..." : "Remove"}</span>
                          </button>
                        )}
                      </div>

                      {/* URL Input Box (if toggled) */}
                      {showAvatarUrlInput && (
                        <div className="flex items-center gap-1.5 w-full max-w-xs mt-1 animate-in fade-in">
                          <input
                            type="url"
                            value={customAvatarUrl}
                            onChange={(e) => setCustomAvatarUrl(e.target.value)}
                            placeholder="https://example.com/avatar.jpg"
                            className="flex-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                          />
                          <button
                            type="button"
                            onClick={handleSaveAdminAvatarUrl}
                            disabled={uploadingAdminAvatar}
                            className="px-2.5 py-1 rounded-lg bg-purple-600 text-white text-[11px] font-bold hover:bg-purple-500 transition-all shrink-0"
                          >
                            Save
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 6 Responsive Info Cards Across Full Width */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5 flex-1 text-xs w-full">
                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Admin Full Name</span>
                        <span className="text-sm font-black text-slate-900 dark:text-white truncate block">{adminProfile?.name || user?.name || "Administrator"}</span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registered Email</span>
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                            <Lock className="w-2.5 h-2.5" /> Fixed
                          </span>
                        </div>
                        <span className="font-mono text-xs text-slate-700 dark:text-slate-300 font-medium truncate block">{adminProfile?.email || user?.email || "admin@seu.edu.bd"}</span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Phone className="w-3 h-3 text-blue-500" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block">
                          {adminProfile?.phone || user?.phone || <span className="text-slate-400 italic">Not added yet</span>}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80">
                        <div className="flex items-center gap-1.5 mb-1">
                          <MapPin className="w-3 h-3 text-rose-500" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Address / Location</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate block">
                          {adminProfile?.address || user?.address || <span className="text-slate-400 italic">Not added yet</span>}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Security Role</span>
                        <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                          {adminProfile?.role || user?.role || "ROLE_SUPER_ADMIN"}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Account Status</span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>Active Access</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateAdminProfile} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={adminName}
                          onChange={(e) => setAdminName(e.target.value)}
                          placeholder="e.g. Super Admin"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 text-xs"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <Lock className="w-3.5 h-3.5 text-amber-500" />
                            <span>Registered University Email</span>
                          </span>
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            Fixed / Non-editable
                          </span>
                        </label>
                        <input
                          type="email"
                          disabled
                          readOnly
                          value={adminProfile?.email || user?.email || "admin@seu.edu.bd"}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-mono cursor-not-allowed select-none text-xs"
                        />
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                          Registration email is permanently fixed to your university identity.
                        </p>
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-blue-500" />
                          <span>Contact Phone Number</span>
                        </label>
                        <input
                          type="tel"
                          value={adminPhone}
                          onChange={(e) => setAdminPhone(e.target.value)}
                          placeholder="e.g. +880 1712-345678"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 text-xs"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          <span>Physical Address / Office</span>
                        </label>
                        <input
                          type="text"
                          value={adminAddress}
                          onChange={(e) => setAdminAddress(e.target.value)}
                          placeholder="e.g. Room 402, Academic Building 1"
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingAdminProfile(false)}
                        className="px-4 py-2 rounded-xl font-bold text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingAdminProfile}
                        className="px-5 py-2 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-500 text-white shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{savingAdminProfile ? "Saving Changes..." : "Save Profile Changes"}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Responsive 2-Column Balanced Grid for System Operations & Security */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full items-start">
                
                {/* Column 1: Security & Password Management */}
                <div className="space-y-6 w-full">
                  {/* Card 2: Password Change */}
                  <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm w-full">
                    <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-5">
                      <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <KeyRound className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white">Change Admin Password</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Update your account login security password (minimum 6 characters)</p>
                      </div>
                    </div>

                    <form onSubmit={handleChangeAdminPassword} className="space-y-4 text-xs w-full">
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Current Password *</label>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? "text" : "password"}
                            autoComplete="current-password"
                            required
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter your current password"
                            className="w-full px-4 py-2.5 pr-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono placeholder-slate-400 focus:outline-none focus:border-amber-500 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">New Password *</label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? "text" : "password"}
                              autoComplete="new-password"
                              required
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Min 6 characters"
                              className="w-full px-4 py-2.5 pr-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono placeholder-slate-400 focus:outline-none focus:border-amber-500 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Confirm New Password *</label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              autoComplete="new-password"
                              required
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Re-enter new password"
                              className="w-full px-4 py-2.5 pr-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono placeholder-slate-400 focus:outline-none focus:border-amber-500 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={changingPassword}
                          className="px-5 py-2.5 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-500 text-white shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>{changingPassword ? "Updating Password..." : "Update Password"}</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Card 2B: Security Clearance & Identity Policy */}
                  <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm w-full">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white">Security Clearance & Identity Policy</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">University enterprise role-based authorization standards</p>
                      </div>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">Session Token Protocol</span>
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">JWT Bearer (HMAC-SHA256)</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">Administrative Clearance Level</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">ROOT SUPER_ADMIN</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">Domain Email Enforcement</span>
                        <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Verified (@seu.edu.bd)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2: SMTP Email Notifications & Platform Runtime */}
                <div className="space-y-6 w-full">
                  {/* Card 3: SMTP Email Notifications */}
                  <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm w-full">
                    <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Mail className="w-5 h-5" />
                          </div>
                          <h3 className="text-base font-black text-slate-900 dark:text-white">Automated SMTP Email Notifications</h3>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
                          When enabled, branded emails are automatically dispatched via Google App Password SMTP to students upon subscription payment verification and waiver approvals.
                        </p>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black shrink-0 ${
                          emailNotificationsEnabled
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700"
                        }`}
                      >
                        {emailNotificationsEnabled ? "ACTIVE (ON)" : "DISABLED (OFF)"}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400">SMTP Gateway:</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">smtp.gmail.com:587 (TLS)</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400">Dispatcher Protocol:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">Spring MailSender & JavaMail</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400">Auto-Dispatched Events:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Payments, Waivers & Rewards</span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <button
                        onClick={handleToggleEmail}
                        disabled={togglingEmail}
                        className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
                          emailNotificationsEnabled
                            ? "bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60"
                            : "bg-blue-600 hover:bg-blue-500 text-white"
                        }`}
                      >
                        <Mail className="w-4 h-4" />
                        <span>{emailNotificationsEnabled ? "Turn OFF Email Notifications" : "Turn ON Email Notifications"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Card 4: Platform Runtime & Telemetry */}
                  <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm w-full">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                        <span>Platform Runtime & Telemetry</span>
                      </h3>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>100% Operational</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">Backend API Environment</p>
                        <p className="font-bold text-slate-900 dark:text-white mt-1">Spring Boot 3.3.5 / Java 21 LTS</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">Frontend Engine</p>
                        <p className="font-bold text-slate-900 dark:text-white mt-1">Next.js 16 (Turbopack) / React 19</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">Database Architecture</p>
                        <p className="font-bold text-slate-900 dark:text-white mt-1">PostgreSQL & In-Memory H2 Dev Mode</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">Real-Time Sync Engine</p>
                        <p className="font-bold text-purple-600 dark:text-purple-400 mt-1">LiveSync SSE Channel (:8888)</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}


          {/* ========================================================================= */}
          {/* TAB: CAMPUS NOTICE BOARD & REAL-TIME MARQUEE ALERTS                       */}
          {/* ========================================================================= */}
          {activeTab === "notices" && (
            <div className="space-y-6">
              {/* Top Banner Card */}
              <div className="p-6 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <Megaphone className="w-5 h-5" />
                    </div>
                    <h3 className="font-black text-sm text-slate-900 dark:text-white">
                      Campus Live Notice Board & Real-Time Marquee Ticker
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                    Publish real-time announcements, emergency alerts, and updates to the single-line banner on the Southeast University archive homepage. Changes stream instantly without student page reload.
                  </p>
                </div>

                <button
                  onClick={openNewNoticeModal}
                  className="px-4 py-2.5 rounded-2xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 shadow-md shadow-blue-600/25 shrink-0 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Publish Announcement</span>
                </button>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400">Total Notices</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{notices.length}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                    <FileText className="w-4 h-4" />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400">Live On Hero</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                        {notices.filter((n) => n.active).length}
                      </p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400">Urgent Alerts</p>
                    <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                      {notices.filter((n) => n.type === "ALERT" || n.type === "IMPORTANT").length}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400">Info & Routines</p>
                    <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
                      {notices.filter((n) => n.type === "INFO" || n.type === "UPDATE").length}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={noticeSearch}
                    onChange={(e) => setNoticeSearch(e.target.value)}
                    placeholder="Search announcements by keyword or link..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  {noticeSearch && (
                    <button
                      onClick={() => setNoticeSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={noticeTypeFilter}
                      onChange={(e) => setNoticeTypeFilter(e.target.value)}
                      className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">All Notice Types ({notices.length})</option>
                      <option value="INFO">Information (INFO)</option>
                      <option value="ALERT">Urgent Alerts (ALERT)</option>
                      <option value="IMPORTANT">Important (IMPORTANT)</option>
                      <option value="UPDATE">Updates (UPDATE)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Notices Table */}
              <div className="bg-white dark:bg-[#0d1527] rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40 text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 min-w-[280px]">Announcement Message</th>
                        <th className="py-3.5 px-4">Category</th>
                        <th className="py-3.5 px-4">Target Link</th>
                        <th className="py-3.5 px-4">Schedule / Auto-Pause</th>
                        <th className="py-3.5 px-4">Priority</th>
                        <th className="py-3.5 px-4">Live Toggle</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {paginatedNotices.length > 0 ? (
                        paginatedNotices.map((notice) => (
                          <tr
                            key={notice.id}
                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                          >
                            {/* Status */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {notice.expiresAt && new Date(notice.expiresAt).getTime() < Date.now() ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                  AUTO-PAUSED (EXPIRED)
                                </span>
                              ) : notice.active && notice.startsAt && new Date(notice.startsAt).getTime() > Date.now() ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                  SCHEDULED
                                </span>
                              ) : notice.active ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  LIVE
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                                  PAUSED
                                </span>
                              )}
                            </td>

                            {/* Message */}
                            <td className="py-3.5 px-4">
                              <div className="space-y-1">
                                <p className="font-semibold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
                                  {notice.text}
                                </p>
                                {notice.createdAt && (
                                  <p className="text-[10px] text-slate-400 font-mono">
                                    Added {new Date(notice.createdAt).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </td>

                            {/* Category Badge */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {notice.type === "ALERT" ? (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                                  ALERT
                                </span>
                              ) : notice.type === "IMPORTANT" ? (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                  IMPORTANT
                                </span>
                              ) : notice.type === "UPDATE" ? (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  UPDATE
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                  INFO
                                </span>
                              )}
                            </td>

                            {/* Link */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {notice.link ? (
                                <Link
                                  href={notice.link}
                                  target={notice.link.startsWith("http") ? "_blank" : undefined}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline max-w-[150px] truncate"
                                  title={notice.link}
                                >
                                  <span className="truncate">{notice.link}</span>
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                </Link>
                              ) : (
                                <span className="text-slate-400 text-xs">-</span>
                              )}
                            </td>

                            {/* Schedule / Auto-Pause */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="space-y-0.5">
                                {notice.startsAt && (
                                  <p className="text-[10px] text-slate-400 font-mono">
                                    From: {new Date(notice.startsAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                )}
                                {notice.expiresAt ? (
                                  <p className={`text-[11px] font-bold font-mono ${new Date(notice.expiresAt).getTime() < Date.now() ? "text-rose-500" : "text-emerald-500 dark:text-emerald-400"}`}>
                                    {new Date(notice.expiresAt).getTime() < Date.now() ? "Auto-Paused: " : "Until: "}
                                    {new Date(notice.expiresAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                ) : (
                                  <span className="text-slate-400 text-xs">Permanent</span>
                                )}
                              </div>
                            </td>

                            {/* Priority */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                P: {notice.priority || 0}
                              </span>
                            </td>

                            {/* Live Toggle */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <button
                                onClick={() => handleToggleNoticeStatus(notice)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                  notice.active
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/30"
                                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30"
                                }`}
                                title={notice.active ? "Click to Pause notice" : "Click to Broadcast live"}
                              >
                                {notice.active ? "Pause" : "Go Live"}
                              </button>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openEditNoticeModal(notice)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  title="Edit Notice"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteNotice(notice)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  title="Delete Notice"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-12 text-center">
                            <div className="max-w-xs mx-auto space-y-3">
                              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                                <Megaphone className="w-6 h-6" />
                              </div>
                              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                                No announcements found
                              </p>
                              <p className="text-xs text-slate-400">
                                {noticeSearch || noticeTypeFilter !== "ALL"
                                  ? "Try adjusting your search query or filter"
                                  : "Click the Publish Announcement button to post your first live hero banner notice."}
                              </p>
                              <button
                                onClick={openNewNoticeModal}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 transition-colors cursor-pointer"
                              >
                                Publish First Announcement
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer with TablePagination */}
                {totalNoticePages > 1 && (
                  <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
                    <TablePagination
                      currentPage={noticePage}
                      totalPages={totalNoticePages}
                      totalItems={filteredNotices.length}
                      itemsPerPage={NOTICE_PAGE_SIZE}
                      onPageChange={setNoticePage}
                      itemName="notices"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB: COMMUNITY LIVE CHATROOM MODERATION                                    */}
          {/* ========================================================================= */}
          {activeTab === "chat" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Quick Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Chat Messages</p>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{chatMessages.length}</h3>
                    </div>
                    <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">Active campus conversation stream</p>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">24-Hour Pinned Notice</p>
                      <h3 className="text-sm font-bold text-amber-500 mt-1 truncate max-w-[170px]">
                        {pinnedChatMessage ? (pinnedChatMessage.text || "🎙️ Voice Announcement") : "None Active"}
                      </h3>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
                      <Pin className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    {pinnedChatMessage ? "Auto-expires after 24 hours" : "Click Pin on any message to feature"}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Connected Students</p>
                      <h3 className="text-2xl font-black text-emerald-500 mt-1">{activeChatUsersCount} Active</h3>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 mt-2">
                    <span className={`w-2 h-2 rounded-full ${activeChatUsersCount > 0 ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                    <span>{activeChatUsersCount > 0 ? "Real-time LiveSync connected" : "No active LiveSync sessions"}</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Restricted Students</p>
                      <h3 className="text-2xl font-black text-rose-500 mt-1">
                        {staffList.filter((s: any) => s.chatBlocked).length} Blocked
                      </h3>
                    </div>
                    <div className="p-3 rounded-xl bg-rose-500/10 text-rose-500">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">Chat access suspended by moderation</p>
                </div>
              </div>

              {/* Search, Filter & Actions Bar */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                  {/* Left: Search input */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search messages by student name, email, or text..."
                      value={chatSearch}
                      onChange={(e) => {
                        setChatSearch(e.target.value);
                        setChatPage(1);
                      }}
                      className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  {/* Right: Quick actions (Refresh) */}
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={async () => {
                        try {
                          const [msgs, pinned, activeData] = await Promise.all([
                            api.chat.getMessages(),
                            api.chat.getPinned().catch(() => null),
                            api.chat.getActiveCount().catch(() => ({ activeCount: 0 })),
                          ]);
                          setChatMessages(msgs || []);
                          setPinnedChatMessage(pinned || null);
                          setActiveChatUsersCount(activeData?.activeCount ?? 0);
                          toast.success("Chat stream and active metrics refreshed.");
                        } catch {
                          toast.error("Failed to refresh chat.");
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Refresh Stream</span>
                    </button>
                  </div>
                </div>

                {/* Filter Controls Row */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  {/* Sender Role Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 text-[11px] font-medium">Role:</span>
                    <select
                      value={chatSenderFilter}
                      onChange={(e: any) => {
                        setChatSenderFilter(e.target.value);
                        setChatPage(1);
                      }}
                      className="py-1.5 px-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="ALL">All Roles</option>
                      <option value="STUDENT">Students Only</option>
                      <option value="FACULTY">Faculty Only</option>
                      <option value="ADMIN">Admins Only</option>
                    </select>
                  </div>

                  {/* Message Type Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 text-[11px] font-medium">Type:</span>
                    <select
                      value={chatTypeFilter}
                      onChange={(e: any) => {
                        setChatTypeFilter(e.target.value);
                        setChatPage(1);
                      }}
                      className="py-1.5 px-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="ALL">All Types</option>
                      <option value="TEXT">📝 Text Only</option>
                      <option value="VOICE">🎙️ Voice Notes</option>
                      <option value="IMAGE">📷 Images</option>
                    </select>
                  </div>

                  {/* Date Filter (Today, Yesterday, Week, Custom) */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 text-[11px] font-medium">Date:</span>
                    <select
                      value={chatDateFilter}
                      onChange={(e: any) => {
                        setChatDateFilter(e.target.value);
                        setChatPage(1);
                      }}
                      className="py-1.5 px-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors font-medium"
                    >
                      <option value="ALL">📅 All Time</option>
                      <option value="TODAY">Today Only</option>
                      <option value="YESTERDAY">Yesterday</option>
                      <option value="WEEK">Last 7 Days</option>
                      <option value="CUSTOM">Specific Date...</option>
                    </select>
                  </div>

                  {/* Specific Date Picker Input */}
                  {chatDateFilter === "CUSTOM" && (
                    <input
                      type="date"
                      value={chatCustomDate}
                      onChange={(e) => {
                        setChatCustomDate(e.target.value);
                        setChatPage(1);
                      }}
                      className="py-1 px-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-blue-400 text-slate-900 dark:text-white focus:outline-none"
                    />
                  )}

                  {/* Per Page Selector */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-slate-500 text-[11px] font-medium">Per Page:</span>
                    <select
                      value={chatPageSize}
                      onChange={(e) => {
                        setChatPageSize(Number(e.target.value));
                        setChatPage(1);
                      }}
                      className="py-1.5 px-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-semibold focus:outline-none"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  {/* Reset Filters button if any filter active */}
                  {(chatSearch || chatSenderFilter !== "ALL" || chatTypeFilter !== "ALL" || chatDateFilter !== "ALL") && (
                    <button
                      onClick={() => {
                        setChatSearch("");
                        setChatSenderFilter("ALL");
                        setChatTypeFilter("ALL");
                        setChatDateFilter("ALL");
                        setChatCustomDate("");
                        setChatPage(1);
                      }}
                      className="px-2 py-1 text-[11px] text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors font-semibold"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Messages Table */}
              <div className="rounded-2xl bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3.5 px-4">Sender</th>
                        <th className="py-3.5 px-4">Message / Media</th>
                        <th className="py-3.5 px-4">Date & Time</th>
                        <th className="py-3.5 px-4">Reactions</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Moderation Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {(() => {
                        const filtered = chatMessages.filter((m) => {
                          const q = chatSearch.toLowerCase().trim();
                          const matchesQuery =
                            !q ||
                            m.senderName?.toLowerCase().includes(q) ||
                            m.senderEmail?.toLowerCase().includes(q) ||
                            m.text?.toLowerCase().includes(q);

                          const matchesRole =
                            chatSenderFilter === "ALL" ||
                            (chatSenderFilter === "STUDENT" && m.senderRole === "ROLE_STUDENT") ||
                            (chatSenderFilter === "FACULTY" && m.senderRole === "ROLE_FACULTY") ||
                            (chatSenderFilter === "ADMIN" && (m.senderRole === "ROLE_ADMIN" || m.senderRole === "ROLE_SUPER_ADMIN"));

                          const matchesType =
                            chatTypeFilter === "ALL" ||
                            (chatTypeFilter === "TEXT" && m.messageType === "TEXT") ||
                            (chatTypeFilter === "VOICE" && m.messageType === "VOICE") ||
                            (chatTypeFilter === "IMAGE" && (m.messageType === "IMAGE" || Boolean(m.imageUrl)));

                          let matchesDate = true;
                          if (chatDateFilter !== "ALL" && m.createdAt) {
                            const msgDate = new Date(m.createdAt);
                            const now = new Date();
                            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                            const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
                            const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);

                            if (chatDateFilter === "TODAY") {
                              matchesDate = msgDate >= startOfToday;
                            } else if (chatDateFilter === "YESTERDAY") {
                              matchesDate = msgDate >= startOfYesterday && msgDate < startOfToday;
                            } else if (chatDateFilter === "WEEK") {
                              matchesDate = msgDate >= startOfWeek;
                            } else if (chatDateFilter === "CUSTOM" && chatCustomDate) {
                              const msgDateStr = msgDate.toISOString().split("T")[0];
                              matchesDate = msgDateStr === chatCustomDate;
                            }
                          }

                          return matchesQuery && matchesRole && matchesType && matchesDate;
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-slate-400">
                                <MessageSquare className="w-10 h-10 mx-auto text-slate-500 mb-2" />
                                <p className="font-semibold text-slate-700 dark:text-slate-300">No chat messages match your filters</p>
                                <p className="text-xs text-slate-500 mt-1">Try adjusting your date range, role, or search keyword</p>
                              </td>
                            </tr>
                          );
                        }

                        const startIndex = (chatPage - 1) * chatPageSize;
                        const pageItems = filtered.slice(startIndex, startIndex + chatPageSize);

                        return pageItems.map((msg) => {
                          const isRoleAdmin = msg.senderRole === "ROLE_ADMIN" || msg.senderRole === "ROLE_SUPER_ADMIN";
                          const isRoleFaculty = msg.senderRole === "ROLE_FACULTY";
                          const matchedUser = staffList.find((s: any) => s.id === msg.senderId);
                          const isBlocked = Boolean(matchedUser?.chatBlocked);

                          return (
                            <tr key={msg.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                              {/* Sender Profile */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-white/10 overflow-hidden">
                                    {msg.senderAvatarUrl ? (
                                      <img src={msg.senderAvatarUrl} alt={msg.senderName} className="w-full h-full object-cover" />
                                    ) : (
                                      msg.senderName?.charAt(0).toUpperCase() || "U"
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-slate-900 dark:text-white truncate max-w-[120px]">
                                        {msg.senderName}
                                      </span>
                                      {isRoleAdmin ? (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                                          Admin
                                        </span>
                                      ) : isRoleFaculty ? (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                          Faculty
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                                          Student
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                                      {msg.senderEmail}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Content / Media */}
                              <td className="py-3 px-4 max-w-xs">
                                {msg.replyToText && (
                                  <div className="mb-1 text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-900/80 px-2 py-0.5 rounded border-l-2 border-cyan-500 truncate">
                                    Replying to {msg.replyToSender}: {msg.replyToText}
                                  </div>
                                )}
                                {msg.messageType === "IMAGE" || msg.imageUrl ? (
                                  <div className="space-y-1">
                                    <div
                                      onClick={() => setAdminPreviewImage(msg.imageUrl || null)}
                                      className="relative group/thumb w-24 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 cursor-pointer bg-black/10 shadow-sm"
                                      title="Click to view full image"
                                    >
                                      <img
                                        src={
                                          msg.imageUrl?.startsWith("http")
                                            ? msg.imageUrl
                                            : `${typeof window !== "undefined" ? window.location.origin : ""}${msg.imageUrl?.startsWith("/") ? "" : "/"}${msg.imageUrl}`
                                        }
                                        alt="Chat attachment"
                                        className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform"
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity">
                                        View
                                      </div>
                                    </div>
                                    {msg.text && (
                                      <p className="text-slate-800 dark:text-slate-200 line-clamp-2 text-xs">
                                        {msg.text}
                                      </p>
                                    )}
                                  </div>
                                ) : msg.messageType === "VOICE" ? (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => playAdminVoice(msg.id, msg.voiceUrl)}
                                      className="w-7 h-7 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center shrink-0 shadow transition-transform active:scale-95"
                                    >
                                      {playingVoiceId === msg.id ? (
                                        <Pause className="w-3.5 h-3.5 fill-slate-950" />
                                      ) : (
                                        <Play className="w-3.5 h-3.5 fill-slate-950 ml-0.5" />
                                      )}
                                    </button>
                                    <span className="text-xs text-slate-400 font-mono">🎙️ Voice ({msg.voiceDuration || 1}s)</span>
                                  </div>
                                ) : (
                                  <p className="text-slate-800 dark:text-slate-200 line-clamp-2">{msg.text}</p>
                                )}
                              </td>

                              {/* Date & Time */}
                              <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                <div className="flex flex-col">
                                  <span className="font-medium text-slate-800 dark:text-slate-200">
                                    {msg.createdAt
                                      ? new Date(msg.createdAt).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                        })
                                      : "—"}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {msg.createdAt
                                      ? new Date(msg.createdAt).toLocaleTimeString("en-US", {
                                          hour: "numeric",
                                          minute: "2-digit",
                                          hour12: true,
                                        })
                                      : ""}
                                  </span>
                                </div>
                              </td>

                              {/* Reactions */}
                              <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                <span className="inline-flex items-center gap-1 font-semibold text-rose-500">
                                  ❤️ {msg.likesCount || 0}
                                </span>
                              </td>

                              {/* Status */}
                              <td className="py-3 px-4">
                                {msg.pinned ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                                    <Pin className="w-3 h-3 fill-amber-500" />
                                    24h Pinned
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">Normal</span>
                                )}
                              </td>

                              {/* Moderation Actions */}
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Pin / Unpin Button */}
                                  {msg.pinned ? (
                                    <button
                                      onClick={() => handleAdminUnpinChatMessage(msg.id)}
                                      className="p-1.5 rounded-lg bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 transition-colors"
                                      title="Unpin from top announcement"
                                    >
                                      <PinOff className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleAdminPinChatMessage(msg.id)}
                                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-amber-500 transition-colors"
                                      title="Pin as top announcement for 24 hours"
                                    >
                                      <Pin className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {/* Delete Message Button */}
                                  <button
                                    onClick={() => handleAdminDeleteChatMessage(msg)}
                                    className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors"
                                    title="Delete this message"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Block / Unblock User from Chat */}
                                  {msg.senderRole === "ROLE_STUDENT" && (
                                    isBlocked ? (
                                      <button
                                        onClick={() => handleAdminUnblockChatUser(msg.senderId, msg.senderName)}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 text-[10px] font-bold transition-colors"
                                        title="Unblock user to restore chat access"
                                      >
                                        <Check className="w-3 h-3" />
                                        Unblock
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleAdminBlockChatUser(msg.senderId, msg.senderName)}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-[10px] font-bold transition-colors"
                                        title="Block user from sending messages"
                                      >
                                        <Ban className="w-3 h-3" />
                                        Block
                                      </button>
                                    )
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Table Pagination Bar with Page Numbers and Items Per Page */}
                {(() => {
                  const filtered = chatMessages.filter((m) => {
                    const q = chatSearch.toLowerCase().trim();
                    const matchesQuery =
                      !q ||
                      m.senderName?.toLowerCase().includes(q) ||
                      m.senderEmail?.toLowerCase().includes(q) ||
                      m.text?.toLowerCase().includes(q);

                    const matchesRole =
                      chatSenderFilter === "ALL" ||
                      (chatSenderFilter === "STUDENT" && m.senderRole === "ROLE_STUDENT") ||
                      (chatSenderFilter === "FACULTY" && m.senderRole === "ROLE_FACULTY") ||
                      (chatSenderFilter === "ADMIN" && (m.senderRole === "ROLE_ADMIN" || m.senderRole === "ROLE_SUPER_ADMIN"));

                    const matchesType =
                      chatTypeFilter === "ALL" ||
                      (chatTypeFilter === "TEXT" && m.messageType === "TEXT") ||
                      (chatTypeFilter === "VOICE" && m.messageType === "VOICE") ||
                      (chatTypeFilter === "IMAGE" && (m.messageType === "IMAGE" || Boolean(m.imageUrl)));

                    let matchesDate = true;
                    if (chatDateFilter !== "ALL" && m.createdAt) {
                      const msgDate = new Date(m.createdAt);
                      const now = new Date();
                      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                      const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
                      const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);

                      if (chatDateFilter === "TODAY") {
                        matchesDate = msgDate >= startOfToday;
                      } else if (chatDateFilter === "YESTERDAY") {
                        matchesDate = msgDate >= startOfYesterday && msgDate < startOfToday;
                      } else if (chatDateFilter === "WEEK") {
                        matchesDate = msgDate >= startOfWeek;
                      } else if (chatDateFilter === "CUSTOM" && chatCustomDate) {
                        const msgDateStr = msgDate.toISOString().split("T")[0];
                        matchesDate = msgDateStr === chatCustomDate;
                      }
                    }

                    return matchesQuery && matchesRole && matchesType && matchesDate;
                  });

                  const totalItems = filtered.length;
                  const totalPages = Math.max(1, Math.ceil(totalItems / chatPageSize));
                  const startItem = totalItems > 0 ? (chatPage - 1) * chatPageSize + 1 : 0;
                  const endItem = Math.min(chatPage * chatPageSize, totalItems);

                  return (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col sm:grid sm:grid-cols-3 items-center justify-between gap-3 text-xs">
                      {/* Left: Showing count */}
                      <div className="text-slate-500 font-medium text-center sm:text-left">
                        Showing <span className="font-bold text-slate-800 dark:text-slate-200">{startItem}</span> to{" "}
                        <span className="font-bold text-slate-800 dark:text-slate-200">{endItem}</span> of{" "}
                        <span className="font-bold text-slate-800 dark:text-slate-200">{totalItems}</span> messages
                        {totalItems !== chatMessages.length && (
                          <span className="text-slate-400 ml-1 font-normal block sm:inline">(filtered from {chatMessages.length})</span>
                        )}
                      </div>

                      {/* Middle: Numbered Page Buttons & Navigation */}
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => setChatPage((p) => Math.max(1, p - 1))}
                          disabled={chatPage === 1}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-700 transition-colors shadow-sm"
                          title="Previous Page"
                        >
                          <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                        </button>

                        {/* Page Numbers */}
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter((pageNum) => {
                            if (totalPages <= 7) return true;
                            return (
                              pageNum === 1 ||
                              pageNum === totalPages ||
                              Math.abs(pageNum - chatPage) <= 1
                            );
                          })
                          .map((pageNum, idx, arr) => {
                            const prevPage = arr[idx - 1];
                            const hasGap = prevPage && pageNum - prevPage > 1;

                            return (
                              <React.Fragment key={pageNum}>
                                {hasGap && <span className="px-1 text-slate-400 select-none">...</span>}
                                <button
                                  onClick={() => setChatPage(pageNum)}
                                  className={`min-w-[32px] h-8 px-2.5 rounded-lg font-bold text-xs transition-all shadow-sm ${
                                    chatPage === pageNum
                                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-500/25 ring-2 ring-blue-500/30 scale-105"
                                      : "border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              </React.Fragment>
                            );
                          })}

                        <button
                          onClick={() => setChatPage((p) => Math.min(totalPages, p + 1))}
                          disabled={chatPage === totalPages}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-700 transition-colors shadow-sm"
                          title="Next Page"
                        >
                          <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                        </button>
                      </div>

                      {/* Right: Page Indicator summary */}
                      <div className="text-right text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                        Page <span className="font-bold text-slate-800 dark:text-slate-200">{chatPage}</span> of{" "}
                        <span className="font-bold text-slate-800 dark:text-slate-200">{totalPages}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}


          {/* ========================================================================= */}
          {/* TAB: REPORTS & ANALYTICS (EXECUTIVE VISUAL TELEMETRY)                      */}
          {/* ========================================================================= */}
          {activeTab === "analytics" && (
            <AdminAnalyticsView
              language={language}
              isSuperAdmin={isSuperAdmin}
              onNavigateTab={(tab: any) => setActiveTab(tab)}
            />
          )}

          {/* ========================================================================= */}
          {/* TAB: ENTERPRISE ACTIVITY & AUDIT LOGS (365-DAY ROLLING RETENTION)          */}
          {/* ========================================================================= */}
          {activeTab === "activityLogs" && (
            <div className="space-y-6">
              {/* Top Banner Header Card */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
                    <h3 className="font-black text-sm text-slate-900 dark:text-white">
                      Enterprise Activity & Security Audit Log
                    </h3>
                    <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Live Monitoring
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-3xl">
                    Continuous real-time telemetry tracking all administrative operations, course updates, student registrations, logins, and client IP addresses across the Southeast University portal.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="px-3.5 py-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-right">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-500" />
                      Rolling Retention Window
                    </div>
                    <div className="text-xs font-black text-blue-600 dark:text-blue-400">
                      365 Days Active (Auto-Purges Daily)
                    </div>
                  </div>

                  <button
                    onClick={() => loadActivityLogs(activityLogPage, activityLogSearch, activityLogCategory)}
                    disabled={loadingActivityLogs}
                    className="p-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 cursor-pointer"
                    title="Refresh Activity Logs"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingActivityLogs ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Metric Overview KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Total Events */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Recorded Events</span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white mt-0.5 block">{activityLogsData.totalItems}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Within 365-day retention window</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>

                {/* 2. Today's Events */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Today's Operations</span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">{activityLogsData.todayCount}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Active today since 12:00 AM</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <Activity className="w-5 h-5" />
                  </div>
                </div>

                {/* 3. Unique IPs */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Unique Client IPs</span>
                    <span className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-0.5 block">{activityLogsData.uniqueIpCount}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Campus subnets & remote nodes</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                    <Globe className="w-5 h-5" />
                  </div>
                </div>

                {/* 4. Automated Retention Engine */}
                <div className="p-4 rounded-2xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Auto-Purge Engine</span>
                    <span className="text-sm font-black text-amber-600 dark:text-amber-400 mt-1 block">Every Night @ 2:00 AM</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Prunes records older than 1 year</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Filter and Search Bar */}
              <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={activityLogSearch}
                      onChange={(e) => {
                        const val = e.target.value;
                        setActivityLogSearch(val);
                        setActivityLogPage(1);
                        loadActivityLogs(1, val, activityLogCategory);
                      }}
                      placeholder="Search by action, details, user email, or IP address (e.g. 103.145, login, CSE355)..."
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:border-blue-500"
                    />
                    {activityLogSearch && (
                      <button
                        onClick={() => {
                          setActivityLogSearch("");
                          setActivityLogPage(1);
                          loadActivityLogs(1, "", activityLogCategory);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Category / Action Type Select */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                      <Filter className="w-3.5 h-3.5 text-slate-400" />
                      <select
                        value={activityLogCategory}
                        onChange={(e) => {
                          const cat = e.target.value;
                          setActivityLogCategory(cat);
                          setActivityLogPage(1);
                          loadActivityLogs(1, activityLogSearch, cat);
                        }}
                        className="bg-transparent text-slate-700 dark:text-slate-300 font-bold focus:outline-none text-xs cursor-pointer"
                      >
                        <option value="ALL">All Event Categories</option>
                        <option value="AUTH">Authentication & Logins (AUTH)</option>
                        <option value="CONTENT">Materials & Exams (CONTENT)</option>
                        <option value="ACADEMIC">Curriculum & Faculty (ACADEMIC)</option>
                        <option value="STAFF">Staff & User RBAC (STAFF)</option>
                        <option value="BILLING">Subscription & Payments (BILLING)</option>
                        <option value="SYSTEM">System Notices & Automated (SYSTEM)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Log Table */}
              <div className="rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 min-w-[900px]">
                    <thead className="bg-slate-50 dark:bg-slate-900/80 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-5 py-4 whitespace-nowrap min-w-[170px]">Timestamp & Date</th>
                        <th className="px-5 py-4 whitespace-nowrap">Action Event</th>
                        <th className="px-5 py-4 whitespace-nowrap">Actor / User</th>
                        <th className="px-5 py-4">Activity Description</th>
                        <th className="px-5 py-4 whitespace-nowrap">Client IP Address</th>
                        <th className="px-5 py-4 whitespace-nowrap text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {activityLogsData.items.length > 0 ? (
                        activityLogsData.items.map((log: any) => {
                          return (
                            <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                              {/* Timestamp */}
                              <td className="px-5 py-3.5 whitespace-nowrap min-w-[185px]">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 dark:text-white text-xs">
                                    {log.formattedDate || (log.createdAt ? new Date(log.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Today")}
                                  </span>
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                    {log.relativeTime || "Recent"}
                                  </span>
                                </div>
                                <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5 mt-1">
                                  <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                                    {log.formattedTime || (log.createdAt ? new Date(log.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "")}
                                  </span>
                                  <span className="text-slate-400 dark:text-slate-500 text-[9px] font-sans font-medium">BST (UTC+6)</span>
                                </div>
                              </td>

                              {/* Action Badge */}
                              <td className="px-5 py-3.5 whitespace-nowrap">
                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-black font-mono border ${
                                  log.actionType === "AUTH"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                                    : log.actionType === "CONTENT"
                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25"
                                    : log.actionType === "ACADEMIC"
                                    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25"
                                    : log.actionType === "STAFF"
                                    ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25"
                                    : log.actionType === "BILLING"
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
                                    : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/25"
                                }`}>
                                  {log.action}
                                </span>
                              </td>

                              {/* Actor */}
                              <td className="px-5 py-3.5 whitespace-nowrap">
                                <div className="font-bold text-slate-900 dark:text-white text-xs">
                                  {log.userName || "System"}
                                </div>
                                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                  {log.userEmail || "system@seu.edu.bd"}
                                </div>
                                {log.userRole && (
                                  <span className="text-[9px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400 mt-0.5 block">
                                    {log.userRole.replace("ROLE_", "")}
                                  </span>
                                )}
                              </td>

                              {/* Details */}
                              <td className="px-5 py-3.5 max-w-md">
                                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                                  {log.details}
                                </p>
                              </td>

                              {/* Client IP Address & Device */}
                              <td className="px-5 py-3.5 whitespace-nowrap">
                                <div className="flex flex-col gap-1">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-blue-600 dark:text-blue-400 font-semibold shadow-2xs">
                                    <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>{log.ipAddress || "127.0.0.1"}</span>
                                  </span>
                                  {log.deviceInfo && (
                                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1 pl-1">
                                      <Laptop className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                      <span className="truncate max-w-[140px]" title={log.deviceInfo}>{log.deviceInfo}</span>
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Status */}
                              <td className="px-5 py-3.5 whitespace-nowrap text-center">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  <Check className="w-3 h-3 text-emerald-500" />
                                  {log.status || "SUCCESS"}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-16 text-center text-slate-400 text-xs">
                            {loadingActivityLogs ? (
                              <div className="flex items-center justify-center gap-2">
                                <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                                <span>Loading enterprise activity logs...</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                  <Activity className="w-6 h-6" />
                                </div>
                                <div>
                                  <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No activity logs recorded yet</p>
                                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                                    All demo logs have been removed. As authentic user logins, registrations, and administrative updates occur, they will appear here in real-time.
                                  </p>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls with Page Numbers */}
                <TablePagination
                  currentPage={activityLogsData.currentPage}
                  totalPages={activityLogsData.totalPages}
                  totalItems={activityLogsData.totalItems}
                  itemsPerPage={activityLogsData.itemsPerPage}
                  onPageChange={(newPage) => {
                    setActivityLogPage(newPage);
                    loadActivityLogs(newPage, activityLogSearch, activityLogCategory);
                  }}
                  itemName="activity logs (365-day retention)"
                />
              </div>
            </div>
          )}
        </main>
      </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT MATERIAL                                              */}
      {/* ========================================================================= */}
      {showResourceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-500">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    {editingResource ? "Edit Academic Resource" : "Upload New Academic Material"}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {editingResource ? "Update syllabus, title or cloud PDF attachment" : "Register learning materials, question papers or lab assets"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowResourceModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveResource} className="space-y-4 text-xs">
              
              {/* Target Department Selector to Filter Courses */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Target Department</label>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">Filters courses below</span>
                </div>
                <select
                  value={resDeptFilter}
                  onChange={(e) => {
                    const nextDept = e.target.value;
                    setResDeptFilter(nextDept);
                    const matching = nextDept === "ALL"
                      ? courses
                      : courses.filter((c) => c.department?.toUpperCase() === nextDept.toUpperCase());
                    if (matching.length > 0) {
                      setResCourseCode(matching[0].code);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-semibold"
                >
                  <option value="ALL">All Departments ({courses.length} Total Courses)</option>
                  {dynamicDepartments.map((dept) => {
                    const count = courses.filter((c) => c.department?.toUpperCase() === dept.toUpperCase()).length;
                    return (
                      <option key={dept} value={dept}>
                        {dept} Department ({count} courses)
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">Target Course *</label>
                <SearchableCourseSelect
                  value={resCourseCode}
                  onChange={setResCourseCode}
                  courses={filteredModalCourses}
                  placeholder={
                    filteredModalCourses.length === 0
                      ? `No courses found in ${resDeptFilter} department`
                      : `Select ${resDeptFilter === "ALL" ? "course" : resDeptFilter + " course"} (${filteredModalCourses.length} available)...`
                  }
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">Course Instructor / Faculty</label>
                <SearchableTeacherSelect
                  value={resTeacherId}
                  onChange={setResTeacherId}
                  teachers={teachers}
                  placeholder="Select faculty or general..."
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">Material Title *</label>
                <input
                  type="text"
                  required
                  value={resTitle}
                  onChange={(e) => setResTitle(e.target.value)}
                  placeholder="e.g. Lecture Slides - Graph BFS & DFS Traversal"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">Material Type *</label>
                  <select
                    value={resType}
                    onChange={(e) => setResType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none font-medium"
                  >
                    <option value="NOTE">Lecture Hand Note / Slides</option>
                    <option value="MID_QUESTION">Midterm Question Paper</option>
                    <option value="FINAL_QUESTION">Final Exam Paper</option>
                    <option value="QUIZ_CT">Quiz / Class Test (CT)</option>
                    <option value="LAB_MANUAL">Lab Manual / Experiment Sheet</option>
                    <option value="LAB_QUIZ">Lab Quiz Paper</option>
                    <option value="LAB_FINAL">Lab Final Examination</option>
                    <option value="LAB_REPORT">Lab Report Sample</option>
                    <option value="LAB_HAND_NOTE">Lab Hand Note</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">Semester (e.g. Fall 2026) *</label>
                  <input
                    type="text"
                    required
                    value={resSemester}
                    onChange={(e) => {
                      setResSemester(e.target.value);
                      const m = e.target.value.match(/(20\d\d)/);
                      if (m) setResYear(parseInt(m[1], 10));
                    }}
                    placeholder="e.g. Fall 2026"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none font-medium"
                  />
                </div>
              </div>

              {/* Direct Device File Upload (PDF, Image, Docs, Slides, ZIP) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span>Attach Material / Examination File *</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                      Direct Device Upload
                    </span>
                  </label>
                  {resFileUrl && (
                    <button
                      type="button"
                      onClick={() => resFileInputRef.current?.click()}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Replace File</span>
                    </button>
                  )}
                </div>

                {/* Hidden native input */}
                <input
                  type="file"
                  ref={resFileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleMaterialFileUpload(file);
                    e.target.value = "";
                  }}
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.ppt,.pptx,.zip,application/pdf,image/*"
                  className="hidden"
                />

                {!resFileUrl ? (
                  /* Dropzone State */
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsResDragOver(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsResDragOver(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsResDragOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleMaterialFileUpload(file);
                    }}
                    onClick={() => {
                      if (!uploadingResFile) resFileInputRef.current?.click();
                    }}
                    className={`relative p-6 sm:p-7 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center group ${
                      isResDragOver
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-inner"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-900"
                    }`}
                  >
                    {uploadingResFile ? (
                      <div className="flex flex-col items-center justify-center space-y-2.5 py-3">
                        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                          Uploading document to server...
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Storing in secure server media repository
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-black text-slate-800 dark:text-slate-200 text-xs">
                            Click to browse or drag & drop file from your device
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Upload lecture slides, question papers, notes, or scanned images directly
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1.5 flex-wrap justify-center">
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                            PDF
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            PNG / JPG / WEBP
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            DOCX / PPTX
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            ZIP
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold ml-1">
                            (Max 50 MB)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Uploaded File Ready Card */
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-emerald-500/30 dark:border-emerald-500/20 flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        {resFileUrl.toLowerCase().endsWith(".pdf") ? (
                          <FileText className="w-5 h-5 text-red-500" />
                        ) : resFileUrl.match(/\.(png|jpg|jpeg|webp)$/i) ? (
                          <FileText className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <FileText className="w-5 h-5 text-blue-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[220px] sm:max-w-[280px]">
                            {resFileName || resFileUrl.split("/").pop()}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Device Upload
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                          {resFileSize && <span>{resFileSize} • </span>}
                          <a
                            href={resFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 font-bold"
                          >
                            <span>Preview File</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => resFileInputRef.current?.click()}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Upload a different file from device"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setResFileUrl("");
                          setResFileName("");
                          setResFileSize("");
                        }}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Remove attached file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowResourceModal(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingResource}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25 disabled:opacity-50 transition-all"
                >
                  {savingResource ? "Saving..." : editingResource ? "Update Resource" : "Upload Material"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD / EDIT COURSE (FULL CRUD & LIGHT/DARK PARITY)                */}
      {/* ========================================================================= */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  {editingCourse ? `Edit Course: ${editingCourse.code}` : "Add New Academic Course"}
                </h3>
              </div>
              <button
                onClick={() => setShowCourseModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">Course Code *</label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingCourse)}
                    value={courseFormCode}
                    onChange={(e) => setCourseFormCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CSE325"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">Department *</label>
                    <button
                      type="button"
                      onClick={() => {
                        setCourseFormIsCustomDept(!courseFormIsCustomDept);
                        if (!courseFormIsCustomDept) setCourseFormCustomDept("");
                      }}
                      className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {courseFormIsCustomDept ? "← Pick from List" : "+ Enter Custom"}
                    </button>
                  </div>
                  {courseFormIsCustomDept ? (
                    <input
                      type="text"
                      required
                      value={courseFormCustomDept}
                      onChange={(e) => setCourseFormCustomDept(e.target.value.toUpperCase())}
                      placeholder="e.g. LAW, PHR, ARCH, ENG"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-blue-500/50 text-slate-900 dark:text-white font-mono placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  ) : (
                    <select
                      value={courseFormDept}
                      onChange={(e) => {
                        if (e.target.value === "__NEW__") {
                          setCourseFormIsCustomDept(true);
                          setCourseFormCustomDept("");
                        } else {
                          setCourseFormDept(e.target.value);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
                    >
                      {dynamicDepartments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept} Department
                        </option>
                      ))}
                      <option value="__NEW__">+ Add New Department...</option>
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">Course Title *</label>
                <input
                  type="text"
                  required
                  value={courseFormTitle}
                  onChange={(e) => setCourseFormTitle(e.target.value)}
                  placeholder="e.g. Artificial Intelligence & Expert Systems"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">Credits *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={courseFormCredits}
                    onChange={(e) => setCourseFormCredits(parseFloat(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">Semester (1-12)</label>
                  <input
                    type="number"
                    value={courseFormSemester}
                    onChange={(e) => setCourseFormSemester(parseInt(e.target.value, 10))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="labCheckbox"
                    checked={courseFormIsLab}
                    onChange={(e) => setCourseFormIsLab(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800"
                  />
                  <label htmlFor="labCheckbox" className="font-bold text-slate-700 dark:text-slate-300 select-none cursor-pointer">
                    Practical Lab?
                  </label>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">Prerequisite (Optional)</label>
                <input
                  type="text"
                  value={courseFormPrereq}
                  onChange={(e) => setCourseFormPrereq(e.target.value)}
                  placeholder="e.g. CSE141, CSE241"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {!editingCourse && (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">Initial Assigning Faculty (Optional)</label>
                  <SearchableTeacherSelect
                    value={courseFormTeacherId}
                    onChange={setCourseFormTeacherId}
                    teachers={teachers}
                    placeholder="Assign initial faculty member..."
                  />
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCourse}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {savingCourse ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingCourse ? "Save Course Changes" : "Create Course"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADD / EDIT FACULTY (FULL CRUD & LIGHT/DARK PARITY)               */}
      {/* ========================================================================= */}
      {showTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  {editingTeacher ? `Edit Faculty: ${editingTeacher.name}` : "Add New Faculty Member"}
                </h3>
              </div>
              <button
                onClick={() => setShowTeacherModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={teacherFormName}
                    onChange={(e) => setTeacherFormName(e.target.value)}
                    placeholder="e.g. Prof. Dr. Abdul Kadar Muhammad Masum"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">Initial (2-5 ch)</label>
                  <input
                    type="text"
                    value={teacherFormInitial}
                    onChange={(e) => setTeacherFormInitial(e.target.value.toUpperCase())}
                    placeholder="e.g. DAKM"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">Designation</label>
                  <input
                    type="text"
                    value={teacherFormDesignation}
                    onChange={(e) => setTeacherFormDesignation(e.target.value)}
                    placeholder="e.g. Associate Professor & Director, IQAC"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">Room / Office</label>
                  <input
                    type="text"
                    value={teacherFormRoom}
                    onChange={(e) => setTeacherFormRoom(e.target.value)}
                    placeholder="e.g. 105, 1st Floor"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block">Department *</label>
                    <button
                      type="button"
                      onClick={() => {
                        setTeacherFormIsCustomDept(!teacherFormIsCustomDept);
                        if (!teacherFormIsCustomDept) setTeacherFormCustomDept("");
                      }}
                      className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      {teacherFormIsCustomDept ? "← Pick from List" : "+ Enter Custom"}
                    </button>
                  </div>
                  {teacherFormIsCustomDept ? (
                    <input
                      type="text"
                      required
                      value={teacherFormCustomDept}
                      onChange={(e) => setTeacherFormCustomDept(e.target.value.toUpperCase())}
                      placeholder="e.g. CSE, EEE, LAW"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-purple-500/50 text-slate-900 dark:text-white font-mono placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  ) : (
                    <select
                      value={teacherFormDept}
                      onChange={(e) => {
                        if (e.target.value === "__NEW__") {
                          setTeacherFormIsCustomDept(true);
                          setTeacherFormCustomDept("");
                        } else {
                          setTeacherFormDept(e.target.value);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
                    >
                      {dynamicDepartments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept} Department
                        </option>
                      ))}
                      <option value="__NEW__">+ Add New Department...</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">Employment Category</label>
                  <select
                    value={teacherFormCategory}
                    onChange={(e) => setTeacherFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
                  >
                    <option value="FULL_TIME_FACULTY">Full-Time Faculty</option>
                    <option value="ADJUNCT_FACULTY">Adjunct Faculty</option>
                    <option value="VISITING_FACULTY">Visiting Faculty</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">University Email</label>
                  <input
                    type="email"
                    value={teacherFormEmail}
                    onChange={(e) => setTeacherFormEmail(e.target.value)}
                    placeholder="e.g. director.iqac@seu.edu.bd"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">Phone / Mobile</label>
                  <input
                    type="text"
                    value={teacherFormPhone}
                    onChange={(e) => setTeacherFormPhone(e.target.value)}
                    placeholder="e.g. +8801700000000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">
                    Avatar / Profile Picture
                  </label>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    Device upload or image URL
                  </span>
                </div>

                <div className="flex items-center gap-3.5">
                  {/* Photo Preview Thumbnail */}
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative group">
                    {teacherFormImage ? (
                      <>
                        <img
                          src={teacherFormImage}
                          alt="Faculty Preview"
                          className="w-full h-full object-cover object-[center_15%]"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setTeacherFormImage("")}
                          title="Remove Photo"
                          className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 text-rose-400" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Users className="w-5 h-5 text-slate-400 mb-0.5" />
                        <span className="text-[9px] font-bold text-slate-400">No Photo</span>
                      </div>
                    )}
                  </div>

                  {/* Device Upload Button + URL input */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="faculty-device-photo-upload"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-sm cursor-pointer transition-all"
                      >
                        {uploadingTeacherImage ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload from Device</span>
                          </>
                        )}
                      </label>
                      <input
                        id="faculty-device-photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleUploadTeacherImage}
                        disabled={uploadingTeacherImage}
                        className="hidden"
                      />

                      {teacherFormImage && (
                        <button
                          type="button"
                          onClick={() => setTeacherFormImage("")}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Clear</span>
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={teacherFormImage}
                        onChange={(e) => setTeacherFormImage(e.target.value)}
                        placeholder="Or enter image URL (https://... or /uploads/...)"
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-[11px] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTeacherModal(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTeacher}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/25 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {savingTeacher ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingTeacher ? "Save Faculty Profile" : "Register Faculty"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT DEPARTMENT (FULL CRUD & CASCADING)                      */}
      {/* ========================================================================= */}
      {showDeptManageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    {editingDeptCode ? `Edit Department: ${editingDeptCode}` : "Register New Department"}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {editingDeptCode
                      ? "Update department code and descriptive title."
                      : "Add a university academic department across NoteLagbe."}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDeptManageModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDepartment} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Department Code *
                </label>
                <input
                  type="text"
                  required
                  value={deptFormCode}
                  onChange={(e) => setDeptFormCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ICT, SWE, BBA, ARCH"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  Short abbreviation used across courses, faculty designations, and filters.
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">
                  Full Academic Name *
                </label>
                <input
                  type="text"
                  required
                  value={deptFormName}
                  onChange={(e) => setDeptFormName(e.target.value)}
                  placeholder="e.g. Information & Communication Technology"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="p-3 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                💡 <strong>Senior SWE Note:</strong> Renaming an existing department code automatically cascades updates across all active curriculum courses and faculty profiles.
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDeptManageModal(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDept}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white shadow-md shadow-blue-600/25 transition-all flex items-center gap-1.5"
                >
                  {savingDept ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>{editingDeptCode ? "Update Department" : "Register Department"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: PROVISION USER / STAFF ACCOUNT                                   */}
      {/* ========================================================================= */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    {isSuperAdmin ? "Register User / Staff Account" : "Register Student Account"}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isSuperAdmin
                      ? "Provision student or administrative access clearance"
                      : "Register verified Southeast University student credentials"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowStaffModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">Full Name *</label>
                <input
                  type="text"
                  required
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="e.g. Mahfuzur Rahman"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">University Email *</label>
                <input
                  type="email"
                  required
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder={staffRole === "ROLE_STUDENT" ? "2021000000012@seu.edu.bd" : "mahfuz@seu.edu.bd"}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                />
              </div>

              {staffRole === "ROLE_STUDENT" && (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">Student ID Number</label>
                  <input
                    type="text"
                    value={staffStudentId}
                    onChange={(e) => setStaffStudentId(e.target.value)}
                    placeholder="e.g. 2021000000012"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono placeholder-slate-400 focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">Initial Password *</label>
                <input
                  type="password"
                  required
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none font-mono focus:border-purple-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">Account Role / Access Level *</label>
                {isSuperAdmin ? (
                  <select
                    value={staffRole}
                    onChange={(e) => setStaffRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="ROLE_STUDENT">Student (Standard Academic Access)</option>
                    <option value="ROLE_ADMIN">Administrator (Materials, Payments, Waivers)</option>
                    <option value="ROLE_MANAGER">Course Manager (Materials & Offerings)</option>
                    <option value="ROLE_SUPER_ADMIN">Super Administrator (Full System & Access)</option>
                  </select>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-blue-500" />
                      <span className="font-bold text-xs text-slate-900 dark:text-white">Student Account</span>
                    </div>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Standard Admin Permission</span>
                  </div>
                )}
                {!isSuperAdmin && (
                  <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Standard administrators can register student accounts. Only Super Administrators can provision staff/admin roles.
                  </p>
                )}
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStaff}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/25 disabled:opacity-50 transition-all"
                >
                  {savingStaff
                    ? "Registering..."
                    : isSuperAdmin
                    ? "Authorize Account"
                    : "Register Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4B: EDIT USER / STAFF ACCOUNT                                      */}
      {/* ========================================================================= */}
      {showEditStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    {editStaffRole === "ROLE_STUDENT" ? "Edit Student Account" : "Edit Staff Account"}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Update account credentials & security access
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditStaffModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editStaffName}
                  onChange={(e) => setEditStaffName(e.target.value)}
                  placeholder="e.g. Mahfuzur Rahman"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">University Email</label>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Lock className="w-2.5 h-2.5" />
                    Fixed / Non-editable
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="email"
                    disabled
                    readOnly
                    value={editStaffEmail}
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono cursor-not-allowed select-none"
                  />
                  <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  University registration email is permanent and locked for security identity.
                </p>
              </div>

              {(editStaffRole === "ROLE_STUDENT" || isSuperAdmin) && (
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">Student ID Number</label>
                  <input
                    type="text"
                    value={editStaffStudentId}
                    onChange={(e) => setEditStaffStudentId(e.target.value)}
                    placeholder="e.g. 2021000000012"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono placeholder-slate-400 focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">Account Role / Access Level *</label>
                {isSuperAdmin ? (
                  <select
                    value={editStaffRole}
                    onChange={(e) => setEditStaffRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="ROLE_STUDENT">Student (Standard Academic Access)</option>
                    <option value="ROLE_ADMIN">Administrator (Materials, Payments, Waivers)</option>
                    <option value="ROLE_MANAGER">Course Manager (Materials & Offerings)</option>
                    <option value="ROLE_SUPER_ADMIN">Super Administrator (Full System & Access)</option>
                  </select>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-blue-500" />
                      <span className="font-bold text-xs text-slate-900 dark:text-white">Student Account</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">Locked</span>
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">Contact Phone Number</label>
                <div className="relative">
                  <input
                    type="tel"
                    value={editStaffPhone}
                    onChange={(e) => setEditStaffPhone(e.target.value)}
                    placeholder="e.g. +880 1711-234567"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 text-xs"
                  />
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">Physical Address / Location</label>
                <div className="relative">
                  <input
                    type="text"
                    value={editStaffAddress}
                    onChange={(e) => setEditStaffAddress(e.target.value)}
                    placeholder="e.g. Tejgaon, Dhaka-1208, Bangladesh"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 text-xs"
                  />
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditStaffModal(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingStaff}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/25 disabled:opacity-50 transition-all"
                >
                  {updatingStaff ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: QUICK REGISTER NEW DEPARTMENT                                     */}
      {/* ========================================================================= */}
      {showAddDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">Register Academic Department</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Instantly appears across all filters, courses & faculty</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddDeptModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewDepartment} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Department Code or Acronym *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newDeptInput}
                  onChange={(e) => setNewDeptInput(e.target.value.toUpperCase())}
                  placeholder="e.g. LAW, PHR, ARCH, BNG, ECO"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                  Enter uppercase acronym. System prevents duplicate department registrations automatically.
                </p>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                  Currently Active Departments ({dynamicDepartments.length}):
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  {dynamicDepartments.map((dept) => (
                    <span
                      key={dept}
                      className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                    >
                      {dept}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddDeptModal(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25"
                >
                  Register Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ========================================================================= */}
      {/* MODAL: PUBLISH / EDIT CAMPUS NOTICE ANNOUNCEMENT                           */}
      {/* ========================================================================= */}
      {showNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0d1527] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    {editingNoticeId ? "Edit Campus Notice" : "Publish Campus Announcement"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Streams live to the single-line banner above hero on homepage
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNoticeModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveNotice} className="p-6 space-y-4">
              {/* Notice Message */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Announcement Message <span className="text-red-500">*</span>
                  </label>
                  <span className={`text-[11px] font-mono ${noticeText.length > 280 ? "text-amber-500 font-bold" : "text-slate-400"}`}>
                    {noticeText.length}/300
                  </span>
                </div>
                <textarea
                  required
                  rows={3}
                  maxLength={300}
                  value={noticeText}
                  onChange={(e) => setNoticeText(e.target.value)}
                  placeholder="e.g. Southeast University Midterm Examination Fall 2026 routine is now officially published. Check courses for question archives!"
                  className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none leading-relaxed"
                />
              </div>

              {/* Notice Type Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Notice Type & Urgency
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "INFO", label: "Information", color: "blue", desc: "General update" },
                    { id: "ALERT", label: "Urgent Alert", color: "red", desc: "Exam / Emergency" },
                    { id: "IMPORTANT", label: "Important", color: "amber", desc: "Deadline / Notice" },
                    { id: "UPDATE", label: "Routine", color: "emerald", desc: "Portal changes" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setNoticeType(item.id as any)}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                        noticeType === item.id
                          ? "bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <p className="text-xs font-bold">{item.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{item.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Link (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Target Link / URL <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={noticeLink}
                    onChange={(e) => setNoticeLink(e.target.value)}
                    placeholder="e.g. /courses or /pricing or https://seu.edu.bd/notice"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>

              {/* Date & Time Scheduling with Auto-Pause */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span>Display Schedule & Auto-Pause Window</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Auto-hides when expired</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Starts At */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Starts From (Publish Time)
                    </label>
                    <input
                      type="datetime-local"
                      min={new Date().toISOString().slice(0, 16)}
                      value={noticeStartsAt}
                      onChange={(e) => setNoticeStartsAt(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>

                  {/* Expires At */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      Auto-Pause At (Expiration)
                    </label>
                    <input
                      type="datetime-local"
                      min={noticeStartsAt || new Date().toISOString().slice(0, 16)}
                      value={noticeExpiresAt}
                      onChange={(e) => setNoticeExpiresAt(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="pt-1">
                  <p className="text-[10px] font-semibold text-slate-400 mb-1">Quick Presets:</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const today8pm = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0, 0);
                        const pad = (n: number) => String(n).padStart(2, "0");
                        setNoticeExpiresAt(`${today8pm.getFullYear()}-${pad(today8pm.getMonth() + 1)}-${pad(today8pm.getDate())}T20:00`);
                      }}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                    >
                      Today until 8:00 PM
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
                        const pad = (n: number) => String(n).padStart(2, "0");
                        setNoticeExpiresAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
                      }}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                    >
                      +1 Day (24 hrs)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
                        const pad = (n: number) => String(n).padStart(2, "0");
                        setNoticeExpiresAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
                      }}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                    >
                      +3 Days
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
                        const pad = (n: number) => String(n).padStart(2, "0");
                        setNoticeExpiresAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
                      }}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                    >
                      +5 Days
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                        const pad = (n: number) => String(n).padStart(2, "0");
                        setNoticeExpiresAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
                      }}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
                    >
                      +7 Days (1 Week)
                    </button>

                    {(noticeStartsAt || noticeExpiresAt) && (
                      <button
                        type="button"
                        onClick={() => {
                          setNoticeStartsAt("");
                          setNoticeExpiresAt("");
                        }}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        Clear Schedule (Permanent)
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Display Priority & Status Toggle Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Priority */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Display Priority <span className="text-slate-400 font-normal">(Higher shows first)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={999}
                    value={noticePriority}
                    onChange={(e) => setNoticePriority(parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 rounded-2xl text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono"
                  />
                </div>

                {/* Status Toggle */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Live Broadcast Status
                  </label>
                  <label className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noticeActive}
                      onChange={(e) => setNoticeActive(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {noticeActive ? "Active on Live Banner" : "Draft (Paused)"}
                    </span>
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNoticeModal(false)}
                  className="px-4 py-2.5 rounded-2xl font-bold text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNotice}
                  className="px-5 py-2.5 rounded-2xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25 flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {savingNotice && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingNoticeId ? "Save Changes" : "Publish Announcement"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Universal Enterprise Delete Confirmation Modal */}
      {/* EDIT & APPROVE CONTRIBUTION MODAL */}
      {editingContribution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    Edit & Review Material Before Approval
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Uploader: <span className="font-bold text-slate-700 dark:text-slate-300">{editingContribution.user?.name}</span> ({editingContribution.user?.email})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingContribution(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Uploaded File Visual Inspection Card */}
            {editingContribution.uploadedResource?.fileUrl && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-blue-500" />
                    <span>Uploaded Academic File:</span>
                  </span>
                  <div className="flex items-center gap-2">
                    {isImageFile(editingContribution.uploadedResource.fileUrl) && (
                      <button
                        type="button"
                        onClick={() => {
                          setImageZoom(1);
                          setImageRotate(0);
                          setAdminPreviewImage(editingContribution.uploadedResource.fileUrl);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View Full Image</span>
                      </button>
                    )}
                    <a
                      href={editingContribution.uploadedResource.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Inspect Link</span>
                    </a>
                  </div>
                </div>

                {isImageFile(editingContribution.uploadedResource.fileUrl) && (
                  <div 
                    onClick={() => {
                      setImageZoom(1);
                      setImageRotate(0);
                      setAdminPreviewImage(editingContribution.uploadedResource.fileUrl);
                    }}
                    className="relative max-h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 flex items-center justify-center cursor-pointer group"
                    title="Click to enlarge image"
                  >
                    <img
                      src={editingContribution.uploadedResource.fileUrl}
                      alt={editingContribution.uploadedResource.title}
                      className="max-h-48 w-auto object-contain group-hover:scale-102 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-xs">
                      <ZoomIn className="w-4 h-4" />
                      <span>Click to view & zoom image</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSaveAndApproveContribution} className="space-y-4">
              {/* Material Title */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Material Title (হাতে গোনা পরিচ্ছন্ন শিরোনাম) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">
                    {contribEditTitle.length}/80
                  </span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={contribEditTitle}
                  onChange={(e) => setContribEditTitle(e.target.value)}
                  placeholder="e.g. Programming Language I Midterm Exam Solution"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Academic Department, Course & Faculty Initial (3 Columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Academic Department */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={contribEditDept}
                    onChange={(e) => setContribEditDept(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-blue-500"
                  >
                    <option value="CSE">CSE (Computer Science & Engineering)</option>
                    <option value="EEE">EEE (Electrical & Electronic Engineering)</option>
                    <option value="ARCH">ARCH (Architecture)</option>
                    <option value="TEX">TEX (Textile Engineering)</option>
                    <option value="PHR">PHR (Pharmacy)</option>
                    <option value="BBA">BBA (Business Administration)</option>
                    <option value="LAW">LAW (Law & Justice)</option>
                    <option value="ENG">ENG (English)</option>
                    <option value="BNG">BNG (Bangla)</option>
                    <option value="ECO">ECO (Economics)</option>
                    <option value="ICT">ICT (Information & Communication Tech)</option>
                  </select>
                </div>

                {/* Course Code */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Course Code <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={contribEditCourseCode}
                    onChange={(e) => setContribEditCourseCode(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-blue-500"
                  >
                    {courses.map((co: any) => (
                      <option key={co.id || co.code} value={co.code}>
                        {co.code} - {co.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Faculty / Teacher Initial */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Course Faculty <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={contribEditTeacherId}
                    onChange={(e) => setContribEditTeacherId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-blue-500"
                  >
                    <option value="0">Central Exam (All)</option>
                    {teachers.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        [{t.initial || "FA"}] {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Resource Type & Semester (2 Columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Resource Type */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Resource Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={contribEditType}
                    onChange={(e) => setContribEditType(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-blue-500"
                  >
                    <option value="NOTE">Lecture Notes (Handwritten/Slides)</option>
                    <option value="QUIZ_CT">Quiz / Class Test (Quiz / CT)</option>
                    <option value="MID_QUESTION">Midterm Exam Paper</option>
                    <option value="FINAL_QUESTION">Final Exam Paper</option>
                    <option value="LAB_HAND_NOTE">Lab Hand Note</option>
                    <option value="LAB_QUIZ">Lab Quiz / CT</option>
                    <option value="LAB_FINAL">Lab Final Examination</option>
                    <option value="PROJECT_CODE">Project Code / Live Link</option>
                    <option value="DOC_NOTE">Document / Word Note</option>
                    <option value="LAB_MANUAL">Lab Manual / Code Solution</option>
                    <option value="QUESTION_COURSE_IN">Course-In Material</option>
                    <option value="OTHERS">Other Material</option>
                  </select>
                </div>

                {/* Semester */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Semester (e.g. Fall 2026) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={25}
                    value={contribEditSemester}
                    onChange={(e) => setContribEditSemester(e.target.value)}
                    placeholder="e.g. Fall 2026, Summer 2026"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Admin Feedback Message */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Approval Feedback to Student (ঐচ্ছিক মেসেজ)
                </label>
                <input
                  type="text"
                  maxLength={150}
                  value={contribEditFeedback}
                  onChange={(e) => setContribEditFeedback(e.target.value)}
                  placeholder="Verified and approved! Your 2 reward courses have been unlocked."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Reward Courses Reminder */}
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-400">
                <span className="font-bold">🎁 2 Reward Courses will be unlocked upon approval:</span>
                <p className="font-mono text-[11px] mt-0.5">
                  1. {editingContribution.requestedCourse1?.code} ({editingContribution.requestedCourse1?.title})<br />
                  2. {editingContribution.requestedCourse2?.code} ({editingContribution.requestedCourse2?.title})
                </p>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingContribution(null)}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingContributionEdit}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {savingContributionEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving & Publishing...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save, Publish & Unlock 2</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => {
          if (!isProcessingDelete) {
            setDeleteConfirmModal((prev) => ({ ...prev, isOpen: false }));
          }
        }}
        onConfirm={handleExecuteDeleteConfirm}
        title={deleteConfirmModal.title}
        itemType={deleteConfirmModal.itemType}
        itemName={deleteConfirmModal.itemName}
        warningText={deleteConfirmModal.warningText}
        confirmButtonText={deleteConfirmModal.confirmButtonText}
        isProcessing={isProcessingDelete}
      />

      {/* Admin Image Lightbox Modal with Zoom & Rotate Controls */}
      {adminPreviewImage && (
        <div
          className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => { setAdminPreviewImage(null); setImageZoom(1); setImageRotate(0); }}
        >
          <div className="relative max-w-4xl max-h-[92vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950 p-2 flex items-center justify-center">
              <img
                src={adminPreviewImage}
                alt="Attachment preview"
                style={{
                  transform: `scale(${imageZoom}) rotate(${imageRotate}deg)`,
                  transition: "transform 0.15s ease-out",
                  maxHeight: "75vh",
                  maxWidth: "85vw",
                  objectFit: "contain",
                }}
                className="rounded-lg shadow-2xl"
              />
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
              <button
                type="button"
                onClick={() => setImageZoom((z) => Math.max(0.5, z - 0.25))}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1 shadow cursor-pointer"
                title="Zoom Out (-)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-mono text-slate-300 px-1">{Math.round(imageZoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setImageZoom((z) => Math.min(3, z + 0.25))}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1 shadow cursor-pointer"
                title="Zoom In (+)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setImageRotate((r) => (r + 90) % 360)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1 shadow cursor-pointer"
                title="Rotate 90° Clockwise"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => { setImageZoom(1); setImageRotate(0); }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold shadow cursor-pointer"
              >
                Reset
              </button>
              <a
                href={adminPreviewImage}
                download="academic-material"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Tab</span>
              </a>
              <button
                onClick={() => { setAdminPreviewImage(null); setImageZoom(1); setImageRotate(0); }}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Close</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Enterprise Delete Success Notification Popup */}
      <DeleteSuccessModal
        isOpen={deleteSuccessModal.isOpen}
        onClose={() => setDeleteSuccessModal((prev) => ({ ...prev, isOpen: false }))}
        title={deleteSuccessModal.title}
        itemName={deleteSuccessModal.itemName}
        message={deleteSuccessModal.message}
      />
    </div>
  );
}
