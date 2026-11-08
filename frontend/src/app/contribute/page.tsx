"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { api } from "@/lib/api";
import { 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ArrowRight, 
  BookOpen, 
  FileText, 
  Check, 
  Lock, 
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Layers,
  Building2,
  GraduationCap,
  Link as LinkIcon,
  Eye,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import SearchableCourseSelect, { sortCoursesNaturally } from "@/components/SearchableCourseSelect";
import SearchableTeacherSelect from "@/components/SearchableTeacherSelect";
import GoogleDrivePublicGuideModal from "@/components/GoogleDrivePublicGuideModal";
import TopContributorsLeaderboard from "@/components/TopContributorsLeaderboard";
import { useDataSync, notifyDataChanged } from "@/lib/sync";

const DEPARTMENTS = [
  { id: "CSE", code: "CSE", name: "Computer Science & Engineering", icon: "💻", badge: "Active" },
  { id: "EEE", code: "EEE", name: "Electrical & Electronic Engineering", icon: "⚡", badge: "Coming Soon" },
  { id: "ARCH", code: "ARCH", name: "Architecture", icon: "🏛️", badge: "Coming Soon" },
  { id: "TEX", code: "TEX", name: "Textile Engineering", icon: "🧵", badge: "Coming Soon" },
  { id: "PHR", code: "PHR", name: "Pharmacy", icon: "💊", badge: "Coming Soon" },
  { id: "BBA", code: "BBA", name: "Southeast Business School", icon: "💼", badge: "Coming Soon" },
  { id: "LAW", code: "LAW", name: "Law & Justice", icon: "⚖️", badge: "Coming Soon" },
  { id: "ENG", code: "ENG", name: "English", icon: "📖", badge: "Coming Soon" },
  { id: "BNG", code: "BNG", name: "Bangla", icon: "📜", badge: "Coming Soon" },
  { id: "ECO", code: "ECO", name: "Economics", icon: "📈", badge: "Coming Soon" },
  { id: "ICT", code: "ICT", name: "Information & Communication Technology", icon: "🌐", badge: "Coming Soon" },
];

export default function ContributePage() {
  const { user, isAuthenticated, setShowAuthModal, refreshProfile } = useAuth();
  const { language } = useLanguage();

  const [selectedDepartment, setSelectedDepartment] = useState("CSE");
  const [courses, setCourses] = useState<any[]>([]);
  const [myContributions, setMyContributions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [title, setTitle] = useState("");
  const [resourceType, setResourceType] = useState("NOTE");
  const [fileUrl, setFileUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [requestedCourseCode1, setRequestedCourseCode1] = useState("");
  const [requestedCourseCode2, setRequestedCourseCode2] = useState("");

  const targetCourses = React.useMemo(() => {
    return courses.filter(
      (c) => (c.department || "CSE").toUpperCase() === selectedDepartment.toUpperCase()
    );
  }, [courses, selectedDepartment]);

  const rewardCourses = React.useMemo(() => {
    const list = courses.filter(
      (c) => (c.department || "CSE").toUpperCase() === selectedDepartment.toUpperCase()
    );
    return list.length > 0 ? list : courses;
  }, [courses, selectedDepartment]);

  const currentDepartment = DEPARTMENTS.find((d) => d.id === selectedDepartment) || DEPARTMENTS[0];

  const handleDepartmentChange = (deptId: string) => {
    setSelectedDepartment(deptId);
    const deptCourses = courses.filter(
      (c) => (c.department || "CSE").toUpperCase() === deptId.toUpperCase()
    );
    if (deptCourses.length > 0) {
      setCourseCode(deptCourses[0].code);
      if (deptCourses.length >= 3) {
        setRequestedCourseCode1(deptCourses[1].code);
        setRequestedCourseCode2(deptCourses[2].code);
      } else if (deptCourses.length === 2) {
        setRequestedCourseCode1(deptCourses[0].code);
        setRequestedCourseCode2(deptCourses[1].code);
      } else if (deptCourses.length === 1) {
        setRequestedCourseCode1(deptCourses[0].code);
        setRequestedCourseCode2(deptCourses[0].code);
      }
    } else {
      setCourseCode("");
      if (courses.length >= 2) {
        setRequestedCourseCode1(courses[0].code);
        setRequestedCourseCode2(courses[1].code);
      }
    }
  };

  // Semester: single user-input field with empty default (no hardcoded Fall 2026 bug!)
  const [semester, setSemester] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | number>("");
  const [allTeachers, setAllTeachers] = useState<any[]>([]);

  useEffect(() => {
    api.teachers.getAll().then((data) => setAllTeachers(data || [])).catch(() => {});
  }, []);

  const selectedCourseObj = React.useMemo(() => {
    return courses.find((c) => c.code?.toLowerCase() === courseCode?.toLowerCase());
  }, [courses, courseCode]);

  const selectableFaculty = React.useMemo(() => {
    const list: any[] = [];
    const seen = new Set<number>();

    // 1. Central / Common Exam Option
    list.push({
      id: -1,
      name: language === "bn" ? "সেন্ট্রাল পরীক্ষা (সকল সেকশন)" : "Central Exam (All Sections)",
      initial: "ALL",
      designation: language === "bn" ? "কমন প্রশ্নপত্র বা কোর্স মেটেরিয়াল" : "Common question paper for all sections",
      department: selectedDepartment || "ALL",
    });

    // 2. Assigned Teachers for the selected course (if any)
    if (selectedCourseObj?.teachers && Array.isArray(selectedCourseObj.teachers)) {
      selectedCourseObj.teachers.forEach((t: any) => {
        if (t?.id && !seen.has(t.id)) {
          seen.add(t.id);
          list.push(t);
        }
      });
    }

    // 3. Department Teachers
    allTeachers
      .filter((t) => (t.department || "CSE").toUpperCase() === selectedDepartment.toUpperCase())
      .forEach((t) => {
        if (t?.id && !seen.has(t.id)) {
          seen.add(t.id);
          list.push(t);
        }
      });

    // 4. All other faculty in Southeast University
    allTeachers.forEach((t) => {
      if (t?.id && !seen.has(t.id)) {
        seen.add(t.id);
        list.push(t);
      }
    });

    return list;
  }, [selectedCourseObj, allTeachers, selectedDepartment, language]);

  const selectedTeacherObj = React.useMemo(() => {
    if (!selectedTeacherId || selectedTeacherId === "CENTRAL" || Number(selectedTeacherId) === -1) return null;
    return allTeachers.find((t) => String(t.id) === String(selectedTeacherId)) || null;
  }, [allTeachers, selectedTeacherId]);

  // Dual Upload Mode: DEVICE (Default) vs DRIVE (Alternative for 50MB+)
  const [uploadMode, setUploadMode] = useState<"DEVICE" | "DRIVE">("DEVICE");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadedFileSize, setUploadedFileSize] = useState("");
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDeviceFileUpload = async (file: File) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      toast.error(language === "bn" ? "ফাইল আপলোড করতে অনুগ্রহ করে সাইন ইন করুন।" : "Please sign in to upload files.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error(
        language === "bn"
          ? "ফাইলের আকার ৫০ MB এর বেশি। অনুগ্রহ করে 'ড্রাইভ লিংক' অপশন ব্যবহার করুন।"
          : "File exceeds 50 MB. Please use the Google Drive Link option."
      );
      return;
    }

    setIsUploadingFile(true);
    const toastId = toast.loading(
      language === "bn"
        ? `"${file.name}" আপলোড হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন`
        : `Uploading "${file.name}"... Please wait`
    );

    try {
      const res = await api.contributions.uploadFile(file);
      setFileUrl(res.url);
      setUploadedFileName(res.fileName || file.name);
      setUploadedFileSize(res.fileSize || `${(file.size / (1024 * 1024)).toFixed(1)} MB`);
      setLinkStatus("public");
      setLinkMessage(language === "bn" ? "ডিভাইস থেকে ফাইল সফলভাবে আপলোড হয়েছে" : "File successfully uploaded from device");

      // Auto-fill title if empty
      if (!title.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        setTitle(cleanName.substring(0, 100));
      }

      toast.success(
        language === "bn"
          ? `ফাইল সফলভাবে আপলোড হয়েছে! (${res.fileSize || "OK"})`
          : `File successfully uploaded! (${res.fileSize || "OK"})`,
        { id: toastId }
      );
    } catch (err: any) {
      toast.error(err.message || (language === "bn" ? "ফাইল আপলোড করতে ব্যর্থ হয়েছে" : "Failed to upload file"), { id: toastId });
    } finally {
      setIsUploadingFile(false);
    }
  };

  // Google Drive & Cloud Link Live Verification States
  const [linkStatus, setLinkStatus] = useState<"idle" | "verifying" | "public" | "restricted" | "invalid">("idle");
  const [linkMessage, setLinkMessage] = useState("");
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [recheckingLink, setRecheckingLink] = useState(false);
  const verifyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    api.courses
      .getAll()
      .then((res) => {
        const sorted = sortCoursesNaturally(res || []);
        setCourses(sorted);
        if (sorted && sorted.length >= 3) {
          const cseCourses = sorted.filter((c: any) => (c.department || "CSE").toUpperCase() === "CSE");
          if (cseCourses.length >= 3) {
            setCourseCode(cseCourses[0].code);
            setRequestedCourseCode1(cseCourses[1].code);
            setRequestedCourseCode2(cseCourses[2].code);
          } else {
            setCourseCode(sorted[0].code);
            setRequestedCourseCode1(sorted[1].code);
            setRequestedCourseCode2(sorted[2].code);
          }
        }
      })
      .catch(() => {});

    if (isAuthenticated) {
      loadMyContributions();
    }
  }, [isAuthenticated]);

  // Universal Live Sync: instantly update student's submission history and unlocked courses
  useDataSync((payload) => {
    if (
      !payload ||
      payload.entity === "contribution" ||
      payload.entity === "resource" ||
      payload.entity === "subscription" ||
      payload.entity === "all"
    ) {
      if (isAuthenticated) {
        loadMyContributions();
        refreshProfile?.().catch(() => {});
      }
    }
  });

  const loadMyContributions = async () => {
    try {
      const data = await api.contributions.getMy();
      setMyContributions(data || []);
    } catch {
      // Ignore
    }
  };

  // Live link verification logic
  const verifyLinkLive = async (url: string, showModalOnPrivate = false) => {
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      setLinkStatus("idle");
      setLinkMessage("");
      return;
    }

    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      setLinkStatus("invalid");
      setLinkMessage(language === "bn" ? "লিংকটি অবশ্যই https:// বা http:// দিয়ে শুরু হতে হবে" : "URL must start with https:// or http://");
      return;
    }

    setLinkStatus("verifying");
    setLinkMessage(language === "bn" ? "লিংকটি যাচাই করা হচ্ছে..." : "Verifying link accessibility...");

    try {
      const res = await api.contributions.verifyLink(cleanUrl);
      const isPublicLink = res.status === "PUBLIC" || res.isPublic === true || res.public === true;
      if (isPublicLink) {
        setLinkStatus("public");
        setLinkMessage(language === "bn" ? "পাবলিক ও উন্মুক্ত লিংক! ✓" : "Public and accessible! ✓");
        if (res.previewUrl) setPreviewUrl(res.previewUrl);
        if (showModalOnPrivate) {
          setShowDriveModal(false);
          toast.success(language === "bn" ? "অভিনন্দন! লিংকটি সফলভাবে পাবলিক করা হয়েছে।" : "Success! Link is now verified as public.");
        }
      } else {
        setLinkStatus("restricted");
        setLinkMessage(res.message || (language === "bn" ? "গুগল ড্রাইভ লিংকটি প্রাইভেট রয়েছে" : "Link is private/restricted"));
        // Automatically pop up guide modal if restricted
        setShowDriveModal(true);
      }
    } catch {
      // If error or network hiccup, fallback gracefully
      setLinkStatus("idle");
      setLinkMessage("");
    } finally {
      setRecheckingLink(false);
    }
  };

  // Debounced live verification when user types or pastes link
  const handleUrlChange = (val: string) => {
    setFileUrl(val);
    setLinkStatus("idle");
    setLinkMessage("");

    if (verifyTimeoutRef.current) {
      clearTimeout(verifyTimeoutRef.current);
    }

    const trimmed = val.trim();
    if (trimmed.length > 15 && (trimmed.startsWith("http://") || trimmed.startsWith("https://"))) {
      verifyTimeoutRef.current = setTimeout(() => {
        verifyLinkLive(trimmed, false);
      }, 800);
    }
  };

  const handleUrlBlur = () => {
    if (fileUrl.trim()) {
      verifyLinkLive(fileUrl.trim(), false);
    }
  };

  const handleRecheckLink = () => {
    setRecheckingLink(true);
    verifyLinkLive(fileUrl.trim(), true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    const cleanTitle = title.trim();
    const cleanUrl = fileUrl.trim();
    const cleanSemester = semester.trim();

    // 1. Strict Validation on Material Title (Min 5, Max 80, No Repetitive Spam)
    if (cleanTitle.length < 5 || cleanTitle.length > 80) {
      toast.error(
        language === "bn"
          ? "ম্যাটেরিয়ালের শিরোনাম ৫ থেকে ৮০ অক্ষরের মধ্যে হতে হবে।"
          : "Material title must be between 5 and 80 characters."
      );
      return;
    }

    if (/(.)\1{4,}/.test(cleanTitle)) {
      toast.error(
        language === "bn"
          ? "শিরোনামে অপ্রয়োজনীয় রিপিটেড অক্ষর (যেমন: aaaaa) ব্যবহার করা যাবে না।"
          : "Title cannot contain repetitive spam characters."
      );
      return;
    }

    if (!/[a-zA-Z\u0980-\u09FF]{3,}/.test(cleanTitle)) {
      toast.error(
        language === "bn"
          ? "অনুগ্রহ করে একটি সঠিক অর্থপূর্ণ শিরোনাম লিখুন।"
          : "Please enter a valid, meaningful title."
      );
      return;
    }

    // 2. Strict Validation on Semester (Min 3, Max 20, No Garbage)
    if (!cleanSemester) {
      toast.error(
        language === "bn"
          ? "অনুগ্রহ করে সেমিস্টার লিখুন বা নির্বাচন করুন (যেমন: Fall 2026)।"
          : "Please enter or pick a semester (e.g. Fall 2026)."
      );
      return;
    }

    if (cleanSemester.length < 3 || cleanSemester.length > 20) {
      toast.error(
        language === "bn"
          ? "সেমিস্টার ৩ থেকে ২০ অক্ষরের মধ্যে হতে হবে (যেমন: Fall 2026, Summer 2026)।"
          : "Semester must be between 3 and 20 characters."
      );
      return;
    }

    if (/(.)\1{3,}/.test(cleanSemester)) {
      toast.error(
        language === "bn"
          ? "সেমিস্টার ফিল্ডে অপ্রয়োজনীয় রিপিটেড অক্ষর বাদ দিন।"
          : "Semester cannot contain repetitive spam characters."
      );
      return;
    }

    // 3. Validation on Upload Mode & File URL
    if (uploadMode === "DEVICE" && !cleanUrl) {
      toast.error(
        language === "bn"
          ? "অনুগ্রহ করে ডিভাইস থেকে আপনার ফাইলটি সিলেক্ট করে আপলোড সম্পন্ন করুন।"
          : "Please select and upload your file from device before submitting."
      );
      return;
    }

    if (uploadMode === "DRIVE") {
      if (!cleanUrl) {
        toast.error(
          language === "bn"
            ? "অনুগ্রহ করে গুগল ড্রাইভ বা ক্লাউড PDF লিংক দিন।"
            : "Please enter your Google Drive or cloud link."
        );
        return;
      }
      if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
        toast.error(
          language === "bn"
            ? "দয়া করে একটি সঠিক ওয়েব লিংক দিন (https:// বা http:// দিয়ে শুরু)।"
            : "Please provide a valid web link starting with https:// or http://"
        );
        return;
      }
      if (cleanUrl.length > 300) {
        toast.error(
          language === "bn"
            ? "ফাইলের লিংক ৩০০ অক্ষরের বেশি হতে পারবে না।"
            : "File URL cannot exceed 300 characters."
        );
        return;
      }
      const isCloudStorage = /(drive\.google\.com|docs\.google\.com|onedrive|1drv\.ms|dropbox\.com|box\.com|mediafire\.com|mega\.nz|\.(pdf|docx|zip))/i.test(cleanUrl);
      if (!isCloudStorage) {
        toast.error(
          language === "bn"
            ? "দয়া করে একটি সঠিক গুগল ড্রাইভ বা ভেরিফাইড ক্লাউড স্টোরেজ লিংক দিন।"
            : "Please provide a valid Google Drive or verified cloud storage link."
        );
        return;
      }
      if (linkStatus === "restricted") {
        setShowDriveModal(true);
        toast.error(
          language === "bn"
            ? "গুগল ড্রাইভ লিংকটি প্রাইভেট রয়েছে। অনুগ্রহ করে এটি পাবলিক করুন।"
            : "This Google Drive link is restricted. Please make it public before submitting."
        );
        return;
      }
    }

    // 4. Validation on Target & Reward Courses
    if (!selectedTeacherId) {
      toast.error(
        language === "bn"
          ? "অনুগ্রহ করে শিক্ষকের ইনিশিয়াল (Course Faculty) নির্বাচন করুন।"
          : "Please select the Course Faculty / Instructor Initial."
      );
      return;
    }

    if (!courseCode) {
      toast.error(language === "bn" ? "অনুগ্রহ করে টার্গেট কোর্স নির্বাচন করুন।" : "Please select the target course.");
      return;
    }

    if (!requestedCourseCode1 || !requestedCourseCode2) {
      toast.error(language === "bn" ? "অনুগ্রহ করে ২টি পুরস্কার কোর্স নির্বাচন করুন।" : "Please select both reward courses.");
      return;
    }

    if (requestedCourseCode1.toLowerCase() === requestedCourseCode2.toLowerCase()) {
      toast.error(language === "bn" ? "পুরস্কারের জন্য অনুগ্রহ করে দুটি ভিন্ন কোর্স নির্বাচন করুন!" : "Please select two distinct courses for your unlock reward!");
      return;
    }

    const yearMatch = cleanSemester.match(/(20\d\d)/);
    const finalYear = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();

    setLoading(true);
    try {
      await api.contributions.submit({
        title: cleanTitle,
        resourceType,
        fileUrl: cleanUrl,
        previewUrl,
        courseCode,
        department: selectedDepartment,
        teacherId: (selectedTeacherId === "CENTRAL" || Number(selectedTeacherId) === -1) ? null : Number(selectedTeacherId),
        requestedCourseCode1,
        requestedCourseCode2,
        semesterName: cleanSemester,
        year: finalYear,
      });

      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      toast.success(
        language === "bn"
          ? "আপনার অ্যাকাডেমিক ম্যাটেরিয়াল সফলভাবে জমা হয়েছে! অ্যাডমিন অনুমোদন করলেই নির্বাচিত ২টি কোর্স স্বয়ংক্রিয়ভাবে ফ্রি আনলক হয়ে যাবে।"
          : "Contribution submitted successfully! Once verified by an admin, your 2 selected reward courses will unlock automatically."
      );
      setTitle("");
      setFileUrl("");
      setPreviewUrl("");
      setLinkStatus("idle");
      setSemester("");
      setSelectedTeacherId("");
      loadMyContributions();
      notifyDataChanged("contribution", "created");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit contribution");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* 1. Header Banner */}
      <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-xl space-y-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
          <Sparkles className="w-3.5 h-3.5" /> {language === "bn" ? "শিক্ষার্থীদের অ্যাকাডেমিক অবদান" : "Peer Academic Crowdsourcing"}
        </span>
        <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
          {language === "bn"
            ? "পড়াশোনার ম্যাটেরিয়াল আপলোড করুন — ২টি কোর্স সম্পূর্ণ ফ্রিতে আনলক করুন!"
            : "Upload Study Materials — Unlock 2 Courses for Free!"}
        </h1>
        <p className="text-xs sm:text-sm text-emerald-50 leading-relaxed max-w-2xl">
          {language === "bn"
            ? "সাউথইস্ট বিশ্ববিদ্যালয়ের সহপাঠীদের সহযোগিতার লক্ষ্যে হস্তলিখিত লেকচার নোট, ক্লাস টেস্ট (CT/Quiz), মিডটার্ম বা ফাইনাল পরীক্ষার প্রশ্ন আপলোড করুন। অ্যাডমিন ভেরিফাই করলেই আপনার পছন্দের যেকোনো ২টি কোর্স বিনামূল্যে আজীবনের জন্য আনলক হয়ে যাবে।"
            : "Contribute handwritten lecture notes, class tests (CT/Quiz), midterm questions, or final papers to help fellow Southeast University students. Once verified by our faculty review team, your 2 chosen courses will be permanently unlocked for free."}
        </p>
      </div>

      {/* 2. Main Upload Form */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              {language === "bn" ? "অ্যাকাডেমিক ম্যাটেরিয়াল সাবমিশন ফর্ম" : "Academic Submission Form"}
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            {language === "bn" ? "* চিহ্নিত তথ্য দেওয়া বাধ্যতামূলক" : "* Required fields"}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Row 0: Department Selector (All SEU Departments Supported) */}
          <div className="space-y-2.5 p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {language === "bn" ? "অ্যাকাডেমিক ডিপার্টমেন্ট নির্বাচন করুন" : "Select Academic Department"} <span className="text-red-500">*</span>
                </label>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full">
                {targetCourses.length} {language === "bn" ? "কোর্স উপলব্ধ" : "courses listed"}
              </span>
            </div>

            {/* Department Buttons Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-11 gap-1.5 sm:gap-2 pt-1">
              {DEPARTMENTS.map((dept) => {
                const isSelected = dept.id === selectedDepartment;
                return (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => handleDepartmentChange(dept.id)}
                    className={`px-2.5 py-2.5 rounded-xl text-xs font-bold transition-all text-center border flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md scale-[1.02]"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="text-sm">{dept.icon}</span>
                    <span className="tracking-tight">{dept.code}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-semibold ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : dept.badge === "Active"
                        ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    }`}>
                      {dept.badge}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Department Info Banner */}
            <div className="pt-1 flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
                <span>
                  {language === "bn"
                    ? `বর্তমান ডিপার্টমেন্ট: ${currentDepartment.name} (${currentDepartment.code})`
                    : `Active Department: ${currentDepartment.name} (${currentDepartment.code})`}
                </span>
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                {language === "bn" ? "✓ যেকোনো ডিপার্টমেন্টের নোট সাবমিট করা যাবে" : "✓ Submissions open for all departments"}
              </span>
            </div>
          </div>

          {/* Row 1: Resource Type * AND Target Course * (with Inline Searchable Combobox) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            
            {/* Resource Type Dropdown with QUIZ/CT and OTHERS */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                {language === "bn" ? "ম্যাটেরিয়ালের ধরন" : "Resource Type"} <span className="text-red-500">*</span>
              </label>
              <select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-emerald-500 font-semibold text-slate-900 dark:text-white"
              >
                <option value="NOTE">
                  {language === "bn" ? "লেকচার নোট (হস্তলিখিত / স্লাইড)" : "Lecture Notes (Handwritten / Slides)"}
                </option>
                <option value="QUIZ_CT">
                  {language === "bn" ? "ক্লাস টেস্ট / কুইজ প্রশ্নপত্র (Quiz / CT)" : "Class Test / Quiz Question (Quiz / CT)"}
                </option>
                <option value="MID_QUESTION">
                  {language === "bn" ? "মিডটার্ম পরীক্ষার প্রশ্নপত্র (Midterm Exam)" : "Midterm Examination Paper"}
                </option>
                <option value="FINAL_QUESTION">
                  {language === "bn" ? "ফাইনাল পরীক্ষার প্রশ্নপত্র (Final Exam)" : "Final Examination Paper"}
                </option>
                <option value="QUESTION_COURSE_IN">
                  {language === "bn" ? "কোর্স-ইন ম্যাটেরিয়াল / এসাইনমেন্ট" : "Course-In Materials / Assignment"}
                </option>
                <option value="LAB_MANUAL">
                  {language === "bn" ? "ল্যাব ম্যানুয়াল / কোড সমাধান" : "Lab Manual / Code Solution"}
                </option>
                <option value="LAB_REPORT">
                  {language === "bn" ? "ল্যাব রিপোর্ট / প্রজেক্ট রিপোর্ট" : "Lab Report / Project Report"}
                </option>
                <option value="OTHERS">
                  {language === "bn" ? "অন্যান্য অ্যাকাডেমিক ম্যাটেরিয়াল (Others)" : "Other Academic Materials (Others)"}
                </option>
              </select>
            </div>

            {/* Target Course with Interactive Searchable Combobox */}
            <div>
              <SearchableCourseSelect
                label={language === "bn" ? `${selectedDepartment} টার্গেট কোর্স` : `${selectedDepartment} Target Course`}
                required
                value={courseCode}
                onChange={setCourseCode}
                courses={targetCourses.length > 0 ? targetCourses : courses}
                placeholder={language === "bn" ? `${selectedDepartment} কোর্সের নাম বা কোড খুঁজুন...` : `Search ${selectedDepartment} course code or title...`}
                language={language}
              />
            </div>
          </div>

          {/* Row 1.5: Course Faculty / Instructor Initial (MANDATORY SEARCHABLE SELECT) */}
          <div className="space-y-3 p-4 sm:p-5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/60 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {language === "bn" ? "কোর্স শিক্ষক / ফ্যাকাল্টি ইনিশিয়াল (Faculty Initial)" : "Course Faculty / Instructor Initial"} <span className="text-red-500">*</span>
                </label>
              </div>
              {selectedTeacherId && (
                <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950 px-2.5 py-0.5 rounded-full border border-purple-300/50 dark:border-purple-800">
                  ✓ {selectedTeacherObj ? `[${selectedTeacherObj.initial || "FA"}] ${selectedTeacherObj.name}` : (language === "bn" ? "সেন্ট্রাল পরীক্ষা (সকল সেকশন)" : "Central Exam (All Sections)")}
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {language === "bn"
                ? "কোন শিক্ষকের ক্লাস নোট বা প্রশ্নপত্র? নাম বা ইনিশিয়াল দিয়ে শিক্ষক খুঁজুন এবং সিলেক্ট করুন (যেমন: SM, MRZ, DAKM, Shahriar)।"
                : "Which faculty member taught this section or prepared the exam? Search and select faculty by name or initial (e.g. SM, MRZ, DAKM, Shahriar)."}
            </p>

            <SearchableTeacherSelect
              value={selectedTeacherId ? Number(selectedTeacherId) : ""}
              onChange={(val) => setSelectedTeacherId(val)}
              teachers={selectableFaculty}
              placeholder={
                language === "bn"
                  ? "নাম বা ইনিশিয়াল দিয়ে শিক্ষক খুঁজুন (যেমন: SM, MRZ, DAKM, Shahriar)..."
                  : "Search faculty by name or initial (e.g. SM, MRZ, DAKM, Shahriar)..."
              }
              allowGeneral={false}
              language={language}
            />
          </div>

          {/* Row 2: Material Title & Semester (2 Columns side by side with validation & limits) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            
            {/* Material Title */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === "bn" ? "ম্যাটেরিয়ালের শিরোনাম" : "Material Title"} <span className="text-red-500">*</span>
                </label>
                <span className={`text-[11px] font-mono ${title.length >= 70 ? "text-amber-500 font-bold" : "text-slate-400"}`}>
                  {title.length}/80
                </span>
              </div>
              <input
                type="text"
                required
                minLength={5}
                maxLength={80}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  language === "bn"
                    ? "যেমন: প্রোগ্রামিং ল্যাংগুয়েজ ১ মিডটার্ম প্রশ্ন সমাধানসহ"
                    : "e.g. Programming Language I Midterm Exam with Solutions"
                }
                className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-emerald-500 font-medium"
              />
              <div className="text-[11px]">
                {title.length === 0 ? (
                  <span className="text-slate-400">{language === "bn" ? "কমপক্ষে ৫ থেকে সর্বোচ্চ ৮০ অক্ষর" : "5 - 80 characters"}</span>
                ) : title.trim().length < 5 ? (
                  <span className="text-amber-500 font-medium">
                    {5 - title.trim().length} {language === "bn" ? "অক্ষর আরও প্রয়োজন" : "more characters needed"}
                  </span>
                ) : /(.)\1{4,}/.test(title.trim()) ? (
                  <span className="text-rose-500 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {language === "bn" ? "অপ্রয়োজনীয় রিপিটেড অক্ষর বাদ দিন" : "No repetitive spam characters"}
                  </span>
                ) : !/[a-zA-Z\u0980-\u09FF]{3,}/.test(title.trim()) ? (
                  <span className="text-amber-500 font-medium">
                    {language === "bn" ? "অর্থপূর্ণ শিরোনাম লিখুন" : "Enter a meaningful title"}
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                    <Check className="w-3 h-3" /> {language === "bn" ? "সঠিক শিরোনাম" : "Valid title"}
                  </span>
                )}
              </div>
            </div>

            {/* Semester Input & Quick Suggestion Chips */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === "bn" ? "সেমিস্টার" : "Semester"} <span className="text-red-500">*</span>
                </label>
                <span className={`text-[11px] font-mono ${semester.length >= 18 ? "text-amber-500 font-bold" : "text-slate-400"}`}>
                  {semester.length}/20
                </span>
              </div>

              <input
                type="text"
                required
                maxLength={20}
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                placeholder={
                  language === "bn"
                    ? "যেমন: Fall 2026, Summer 2026, Spring 2025"
                    : "e.g. Fall 2026, Summer 2026, Spring 2025"
                }
                className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-emerald-500 font-semibold text-slate-900 dark:text-white placeholder:font-normal placeholder:text-slate-400"
              />

            </div>
          </div>

          {/* Row 3: Dual Mode (Direct Device Upload [Default] vs Google Drive Link [Alternative]) */}
          <div className="space-y-4 p-5 sm:p-6 rounded-3xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            {/* Mode Selector Header & Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-700/60">
              <div>
                <label className="block text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  {language === "bn" ? "অ্যাকাডেমিক ফাইল যুক্ত করুন" : "Attach Academic Material"} <span className="text-red-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {uploadMode === "DEVICE"
                    ? (language === "bn" ? "মোবাইল বা পিসি থেকে সরাসরি ফাইল আপলোড করুন (সেরা ও দ্রুত)" : "Direct upload from mobile or desktop device (Recommended)")
                    : (language === "bn" ? "৫০ MB এর বেশি বড় ফাইলের জন্য গুগল ড্রাইভ লিংক দিন" : "Google Drive link for larger archives (50MB+)")}
                </p>
              </div>

              {/* Mode Toggle Buttons */}
              <div className="inline-flex items-center p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => setUploadMode("DEVICE")}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                    uploadMode === "DEVICE"
                      ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{language === "bn" ? "ডিভাইস আপলোড (সেরা)" : "Direct Upload (Best)"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUploadMode("DRIVE")}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                    uploadMode === "DRIVE"
                      ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>{language === "bn" ? "ড্রাইভ লিংক (৫০MB+)" : "Drive Link (50MB+)"}</span>
                </button>
              </div>
            </div>

            {/* TAB CONTENT 1: DIRECT DEVICE UPLOAD */}
            {uploadMode === "DEVICE" && (
              <div className="space-y-3 pt-1">
                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleDeviceFileUpload(file);
                    e.target.value = "";
                  }}
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.ppt,.pptx,.zip,application/pdf,image/*"
                  className="hidden"
                />

                {!fileUrl || fileUrl.startsWith("http") ? (
                  /* Interactive Dropzone */
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleDeviceFileUpload(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-3 ${
                      isDragOver
                        ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20 scale-[1.01]"
                        : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                      {isUploadingFile ? (
                        <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                      ) : (
                        <Upload className="w-6 h-6" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <p className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {isUploadingFile
                          ? (language === "bn" ? "ফাইল আপলোড হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন" : "Uploading file... Please wait")
                          : (language === "bn" ? "ফাইলটি এখানে টেনে আনুন বা ক্লিক করে সিলেক্ট করুন" : "Drag and drop your file here, or click to browse")}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                        {language === "bn"
                          ? "পিডিএফ (PDF), ছবি (JPG, PNG), ওয়ার্ড ডক (.docx, .doc), স্লাইড বা জিপ (.zip) — সর্বোচ্চ ৫০ MB"
                          : "Supports PDF, Images (JPG, PNG, WEBP), Word Documents (.docx), Slides & ZIP archives up to 50 MB"}
                      </p>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{language === "bn" ? "ডিভাইস থেকে ফাইল বেছে নিন" : "Select File From Device"}</span>
                    </span>
                  </div>
                ) : (
                  /* Uploaded File Preview Card */
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500/40 dark:border-emerald-500/30 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[200px] sm:max-w-[300px]">
                            {uploadedFileName || fileUrl.split("/").pop()}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold shrink-0">
                            ✓ {uploadedFileSize || "Ready"}
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          {language === "bn" ? "সার্ভারে ফাইল নিরাপদে আপলোড সম্পন্ন হয়েছে" : "Uploaded safely to NoteLagbe server"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{language === "bn" ? "প্রিভিউ দেখুন" : "Preview"}</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{language === "bn" ? "বদলান" : "Replace"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFileUrl("");
                          setUploadedFileName("");
                          setUploadedFileSize("");
                        }}
                        className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                        title={language === "bn" ? "ফাইল রিমুভ করুন" : "Remove file"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: GOOGLE DRIVE LINK */}
            {uploadMode === "DRIVE" && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    {language === "bn" ? "গুগল ড্রাইভ বা ক্লাউড PDF লিংক" : "Google Drive or Cloud PDF Link"} <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">{fileUrl.length}/300</span>
                </div>

                <div className="relative">
                  <input
                    type="url"
                    maxLength={300}
                    value={fileUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    onBlur={handleUrlBlur}
                    placeholder="https://drive.google.com/file/d/.../view"
                    className={`w-full pl-4 pr-12 py-3 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 border font-mono transition-all focus:outline-none ${
                      linkStatus === "public"
                        ? "border-emerald-500 ring-2 ring-emerald-500/20"
                        : linkStatus === "restricted"
                        ? "border-rose-500 ring-2 ring-rose-500/20"
                        : "border-slate-200 dark:border-slate-700 focus:border-emerald-500"
                    }`}
                  />

                  {/* Status Indicator Icon */}
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {linkStatus === "verifying" && (
                      <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                    )}
                    {linkStatus === "public" && (
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    )}
                    {linkStatus === "restricted" && (
                      <button
                        type="button"
                        onClick={() => setShowDriveModal(true)}
                        className="p-1 rounded text-rose-500 hover:text-rose-600 animate-bounce cursor-pointer"
                        title={language === "bn" ? "প্রাইভেট লিংক নির্দেশিকা দেখুন" : "View private link guide"}
                      >
                        <Lock className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Status Feedback Box */}
                {linkStatus === "restricted" ? (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                    <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                      {linkMessage}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowDriveModal(true)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors shrink-0 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{language === "bn" ? "কীভাবে পাবলিক করবেন? (গাইড দেখুন)" : "How to make public? (View Guide)"}</span>
                    </button>
                  </div>
                ) : linkStatus === "public" ? (
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{linkMessage}</span>
                  </div>
                ) : linkStatus === "verifying" ? (
                  <div className="flex items-center gap-1.5 text-xs text-blue-500 font-medium pl-1">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{linkMessage}</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 pl-1">
                    {language === "bn"
                      ? "গুগল ড্রাইভ লিংক অবশ্যই পাবলিক ('Anyone with the link -> Viewer') হতে হবে যাতে সবাই দেখতে ও ভেরিফাই করতে পারে।"
                      : "Must be public ('Anyone with the link -> Viewer') so fellow students and reviewers can view it."}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Row 4: 🎁 2 REWARD COURSES SELECTION BOX (BOTH WITH SEARCHABLE COMBOBOXES) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-dashed border-emerald-500/40 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-extrabold text-xs sm:text-sm text-emerald-950 dark:text-emerald-200">
                  {language === "bn"
                    ? "অনুমোদনের পর ফ্রি আনলক করার জন্য ২টি পুরস্কার কোর্স নির্বাচন করুন:"
                    : "Select Your 2 Reward Courses to Unlock Upon Verification:"}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-200 bg-white dark:bg-emerald-900/80 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700 shadow-xs">
                  {currentDepartment.code} {language === "bn" ? "ডিপার্টমেন্ট" : "Dept"} ({rewardCourses.length} {language === "bn" ? "কোর্স উপলব্ধ" : "courses"})
                </span>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-0.5 rounded-full">
                  {language === "bn" ? "২টি কোর্স আজীবনের জন্য ফ্রি!" : "2 Courses Free for Life!"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* 1st Reward Course (Searchable Combobox) */}
              <div>
                <SearchableCourseSelect
                  label={language === "bn" ? `১ম পুরস্কার কোর্স (${selectedDepartment})` : `1st Reward Course (${selectedDepartment})`}
                  required
                  value={requestedCourseCode1}
                  onChange={setRequestedCourseCode1}
                  courses={rewardCourses}
                  placeholder={language === "bn" ? `${selectedDepartment} ১ম পুরস্কার কোর্স খুঁজুন...` : `Search ${selectedDepartment} 1st reward course...`}
                  variant="reward"
                  disabledCode={requestedCourseCode2}
                  disabledCodeReason={language === "bn" ? "২য় কোর্সে নির্বাচিত" : "Chosen as 2nd"}
                  language={language}
                />
              </div>

              {/* 2nd Reward Course (Searchable Combobox) */}
              <div>
                <SearchableCourseSelect
                  label={language === "bn" ? `২য় পুরস্কার কোর্স (${selectedDepartment})` : `2nd Reward Course (${selectedDepartment})`}
                  required
                  value={requestedCourseCode2}
                  onChange={setRequestedCourseCode2}
                  courses={rewardCourses}
                  placeholder={language === "bn" ? `${selectedDepartment} ২য় পুরস্কার কোর্স খুঁজুন...` : `Search ${selectedDepartment} 2nd reward course...`}
                  variant="reward"
                  disabledCode={requestedCourseCode1}
                  disabledCodeReason={language === "bn" ? "১ম কোর্সে নির্বাচিত" : "Chosen as 1st"}
                  language={language}
                />
              </div>
            </div>

            {requestedCourseCode1 && requestedCourseCode2 && requestedCourseCode1.toLowerCase() === requestedCourseCode2.toLowerCase() && (
              <p className="text-xs text-rose-500 font-bold flex items-center gap-1.5 pt-1">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {language === "bn"
                  ? "দয়া করে দুটি ভিন্ন কোর্স নির্বাচন করুন (একই কোর্স দুইবার নেওয়া যাবে না)।"
                  : "Please select two different courses (cannot unlock the same course twice)."}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || linkStatus === "restricted"}
            className="w-full py-3.5 rounded-2xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{language === "bn" ? "ম্যাটেরিয়াল জমা হচ্ছে..." : "Submitting Contribution..."}</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>
                  {language === "bn"
                    ? "ম্যাটেরিয়াল জমা দিন ও ২টি ফ্রি কোর্স আনলকের জন্য আবেদন করুন"
                    : "Submit Academic Material & Apply for 2 Free Unlocks"}
                </span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* 3. Top 50 Academic Contributors Leaderboard */}
      <TopContributorsLeaderboard />

      {/* 4. Student's Contribution History */}
      {isAuthenticated && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {language === "bn"
                ? `আমার জমাদান ইতিহাস (${myContributions.length})`
                : `My Submission History (${myContributions.length})`}
            </h3>
            <button
              onClick={loadMyContributions}
              className="text-xs font-semibold text-blue-500 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> {language === "bn" ? "রিফ্রেশ" : "Refresh"}
            </button>
          </div>

          {myContributions.length > 0 ? (
            <div className="space-y-3">
              {myContributions.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                        {item.uploadedResource?.course?.code}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {item.uploadedResource?.title}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-500">
                      {language === "bn" ? "পুরস্কার কোর্স:" : "Reward Courses:"} <strong>{item.requestedCourse1?.code}</strong> & <strong>{item.requestedCourse2?.code}</strong>
                    </p>
                    {item.adminFeedback && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {language === "bn" ? "অ্যাডমিন মন্তব্য: " : "Admin Feedback: "}
                        </span>
                        {item.adminFeedback}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {item.status === "APPROVED" && (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-3 py-1 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {language === "bn" ? "অনুমোদিত ও আনলকড!" : "Approved & Unlocked!"}
                      </span>
                    )}
                    {item.status === "PENDING" && (
                      <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-3 py-1 rounded-full">
                        <Clock className="w-3.5 h-3.5" /> {language === "bn" ? "অ্যাডমিন পর্যালোচনায় আছে" : "Under Admin Review"}
                      </span>
                    )}
                    {item.status === "REJECTED" && (
                      <span className="flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 px-3 py-1 rounded-full">
                        <XCircle className="w-3.5 h-3.5" /> {language === "bn" ? "প্রত্যাখ্যাত" : "Rejected"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              {language === "bn"
                ? "আপনি এখনও কোনো লেকচার নোট বা প্রশ্ন আপলোড করেননি।"
                : "You haven't submitted any lecture notes or past papers yet."}
            </div>
          )}
        </div>
      )}

      {/* 4. Google Drive Restricted / Private Link Popup Modal */}
      <GoogleDrivePublicGuideModal
        isOpen={showDriveModal}
        onClose={() => setShowDriveModal(false)}
        fileUrl={fileUrl}
        onRecheck={handleRecheckLink}
        rechecking={recheckingLink}
        language={language}
      />
    </div>
  );
}
