"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useDataSync } from "@/lib/sync";
import PDFViewerModal from "@/components/PDFViewerModal";
import CheatSheetModal from "@/components/CheatSheetModal";
import FacultyAvatar from "@/components/FacultyAvatar";
import { 
  BookOpen, 
  FileText, 
  Sparkles, 
  Lock, 
  Unlock, 
  Eye, 
  Download, 
  User, 
  Star, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  MapPin, 
  Send,
  FileQuestion,
  GraduationCap,
  Layers,
  ChevronRight,
  ExternalLink,
  Upload,
  Info,
  Lightbulb,
  Check,
  Search,
  FlaskConical,
  BookMarked,
  HelpCircle,
  ArrowRightLeft,
  ClipboardList,
  FileCode,
  Award,
  Smile,
  MessageSquarePlus,
  ThumbsUp,
  EyeOff,
  Flame,
  TrendingUp,
  Users,
  ShieldCheck,
  ShieldAlert,
  X
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { CourseDetailSkeleton } from "@/components/skeletons/CardSkeletons";
import coursesCatalogData from "@/data/courses_catalog.json";

export default function CourseDetailPage() {
  const params = useParams();
  const code = (params?.code as string)?.toUpperCase();
  const { user, isAuthenticated, hasUnlocked, hasUnlockedForTeacher, setShowAuthModal, refreshProfile } = useAuth();
  const { language, t } = useLanguage();

  // Instant 0ms Pre-population from client storage or verified SEU curriculum catalog
  const [course, setCourse] = useState<any>(() => {
    if (!code) return null;
    const cleanCode = code.toUpperCase();
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("notelagbe_cached_courses_v6");
        if (cached) {
          const list = JSON.parse(cached);
          const found = list.find((c: any) => c.code?.toUpperCase() === cleanCode);
          if (found) return found;
        }
      } catch {}
    }
    const fromCatalog = (coursesCatalogData as any[]).find((c) => c.code?.toUpperCase() === cleanCode);
    return fromCatalog || null;
  });

  const [companionCourse, setCompanionCourse] = useState<any>(null);
  
  const [resources, setResources] = useState<any[]>(() => {
    if (!code || typeof window === "undefined") return [];
    try {
      const cached = localStorage.getItem(`notelagbe_res_${code.toUpperCase()}`);
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });

  const [reviews, setReviews] = useState<any[]>(() => {
    if (!code || typeof window === "undefined") return [];
    try {
      const cached = localStorage.getItem(`notelagbe_rev_${code.toUpperCase()}`);
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });

  // Zero-latency: If course details exist in cache or catalog, do not show full-page skeleton
  const [loading, setLoading] = useState<boolean>(() => !course);

  // Active Selected Faculty Filter & Material Tab Filter
  const [selectedFacultyId, setSelectedFacultyId] = useState<number | "ALL">("ALL");
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [cheatSheetOpen, setCheatSheetOpen] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  // Review & Rating Modal States
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showAllReviewsModal, setShowAllReviewsModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [workload, setWorkload] = useState("Moderate / Balanced");
  const [timing, setTiming] = useState("Mid Degree (Sem 4-6)");
  const [reviewTeacherId, setReviewTeacherId] = useState<number | "">("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hasReviewedCourse, setHasReviewedCourse] = useState(false);

  // Silent background revalidation without blocking user or resetting UI
  const loadCourseData = useCallback(async (isSilent = false) => {
    if (!code) return;
    if (!isSilent && !course) {
      setLoading(true);
    }
    try {
      const [cData, rData, revData] = await Promise.all([
        api.courses.getByCode(code),
        api.resources.getByCourse(code),
        api.reviews.getByCourse(code),
      ]);

      if (cData) {
        setCourse(cData);
      }
      if (Array.isArray(rData)) {
        setResources(rData);
        try {
          localStorage.setItem(`notelagbe_res_${code.toUpperCase()}`, JSON.stringify(rData));
        } catch {}
      }
      if (Array.isArray(revData)) {
        setReviews(revData);
        try {
          localStorage.setItem(`notelagbe_rev_${code.toUpperCase()}`, JSON.stringify(revData));
        } catch {}
      }

      // Try discovering companion theory <-> lab course in-memory
      tryFindCompanionCourse(code);
    } catch {
      // Gracefully preserve cached/pre-populated catalog on network lag
    } finally {
      setLoading(false);
    }
  }, [code, course]);

  useEffect(() => {
    if (code) {
      // Discover companion course immediately from local catalog in 0ms
      tryFindCompanionCourse(code);

      // Revalidate live data silently in background
      loadCourseData(true);

      if (isAuthenticated) {
        api.reviews.check(code)
          .then((res) => setHasReviewedCourse(Boolean(res?.hasReviewed)))
          .catch(() => {});
      }
    }
  }, [code, isAuthenticated]);

  // Enterprise Live Sync: Refreshes course details and materials immediately when admin updates
  useDataSync(() => {
    loadCourseData(true);
  });

  const tryFindCompanionCourse = (currentCode: string) => {
    // E.g., CSE347 <-> CSE348, CSE241 <-> CSE242, CSE141 <-> CSE161
    const match = currentCode.match(/^([A-Z]+)(\d+)$/);
    if (!match) return;

    const prefix = match[1];
    const num = parseInt(match[2], 10);

    const candidates: string[] = [];
    if (num % 2 !== 0) {
      // Odd -> theory, try even (num + 1)
      candidates.push(`${prefix}${num + 1}`);
      if (num === 141) candidates.push("CSE161", "CSE142");
    } else {
      // Even -> lab, try odd (num - 1)
      candidates.push(`${prefix}${num - 1}`);
      if (num === 161) candidates.push("CSE141");
    }

    let allList: any[] = coursesCatalogData as any[];
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("notelagbe_cached_courses_v6");
        if (cached) allList = JSON.parse(cached);
      } catch {}
    }

    const comp = allList.find((c: any) => candidates.includes(c.code?.toUpperCase()));
    if (comp && comp.code) {
      setCompanionCourse(comp);
    }
  };

  const isCourseUnlocked = course ? (course.unlocked || hasUnlocked(code)) : false;

  const unlockedTeacherDetails = useMemo(
    () =>
      (user?.unlockedCourseDetails || []).filter(
        (d) => !d.isExpired && d.courseCode?.toLowerCase() === code?.toLowerCase() && d.teacherId != null
      ),
    [user?.unlockedCourseDetails, code]
  );

  const hasAnyCourseAccess =
    isCourseUnlocked ||
    unlockedTeacherDetails.length > 0 ||
    (course?.unlockedTeacherIds?.length ?? 0) > 0;

  const isResourceUnlockedForView = useCallback(
    (res: any): boolean => {
      if (!res) return false;
      if (isCourseUnlocked || Boolean(res.fileUrl)) return true;
      const tId = res.teacher?.id;
      if (tId == null) return false;
      return (
        hasUnlockedForTeacher(code, tId) ||
        Boolean(course?.unlockedTeacherIds?.some((id: number) => Number(id) === Number(tId)))
      );
    },
    [isCourseUnlocked, hasUnlockedForTeacher, code, course?.unlockedTeacherIds]
  );

  const handleUnlockCourse = async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    setUnlocking(true);
    try {
      await api.courses.unlock(code);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      toast.success(`${code} materials successfully unlocked for all instructors!`);
      await refreshProfile();
      await loadCourseData();
    } catch (err: any) {
      toast.error(err.message || "Could not unlock course");
    } finally {
      setUnlocking(false);
    }
  };

  // Security Maintenance Notice for Offline Study Pack (ZIP)
  const [showOfflinePackSecurityModal, setShowOfflinePackSecurityModal] = useState(false);

  const handleOfflineStudyPackDisabledNotice = () => {
    toast.error(
      language === "bn"
        ? "🛡️ নিরাপত্তাজনিত কারণে অফলাইন স্টাডি প্যাক (ZIP) সেবাটি সাময়িকভাবে বন্ধ রাখা হয়েছে।"
        : "🛡️ For security purposes, the Offline Study Pack (ZIP) service is temporarily disabled.",
      {
        duration: 5000,
        icon: "🔒",
      }
    );
    setShowOfflinePackSecurityModal(true);
  };

  const handleDownloadOfflineZip = handleOfflineStudyPackDisabledNotice;

  const handleOpenViewer = (res: any) => {
    setSelectedResource(res);
    setViewerOpen(true);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    if (hasReviewedCourse) {
      toast.error(
        language === "bn"
          ? "আপনি ইতিমধ্যে এই কোর্সের জন্য রিভিউ জমা দিয়েছেন। কোর্স প্রতি একটি রিভিউ দেওয়া যায়।"
          : "You have already submitted an evaluation for this course. Only one review per course is allowed."
      );
      return;
    }
    const cleanComment = comment.trim();
    if (cleanComment.length < 10) {
      toast.error(language === "bn" ? "কমপক্ষে ১০ অক্ষরের রিভিউ লিখুন" : "Please enter at least 10 characters for your review");
      return;
    }
    if (cleanComment.length > 500) {
      toast.error(language === "bn" ? "রিভিউ ৫০০ অক্ষরের বেশি হতে পারবে না" : "Review cannot exceed 500 characters");
      return;
    }

    setSubmittingReview(true);
    try {
      await api.reviews.submit({
        courseCode: code,
        teacherId: reviewTeacherId ? Number(reviewTeacherId) : null,
        rating,
        comment: cleanComment,
        difficulty,
        marking: workload, // stores Workload Demand
        personality: timing, // stores Recommended Timing (Open Credit)
        anonymous: isAnonymous,
      });
      toast.success(
        language === "bn"
          ? "রিভিউ সাবমিট হয়েছে! অ্যাডমিন যাচাই ও অনুমোদন করার পর এটি কোর্স পেজে প্রদর্শিত হবে।"
          : "Review submitted! It will appear publicly once approved by an admin."
      );
      setComment("");
      setRating(5);
      setShowReviewModal(false);
      setHasReviewedCourse(true);
      const revData = await api.reviews.getByCourse(code);
      setReviews(revData);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Helper to normalize timing across reviews
  const normalizeTiming = (val?: string): string => {
    if (!val) return "Sem 4-6 (Mid Degree)";
    const v = val.toLowerCase();
    if (v.includes("early") || v.includes("1-3")) return "Sem 1-3 (Early Degree)";
    if (v.includes("final") || v.includes("7-8")) return "Sem 7-8 (Final Year)";
    if (v.includes("flex") || v.includes("any")) return "Flexible (Any Semester)";
    if (v.includes("mid") || v.includes("4-6")) return "Sem 4-6 (Mid Degree)";
    return "Sem 4-6 (Mid Degree)";
  };

  // Helper to normalize workload across reviews
  const normalizeWorkload = (val?: string): string => {
    if (!val) return "Moderate / Balanced";
    const v = val.toLowerCase();
    if (v.includes("heavy") || v.includes("high")) return "Heavy Workload";
    if (v.includes("light") || v.includes("low")) return "Light Effort";
    return "Moderate / Balanced";
  };

  // Helper to normalize difficulty across reviews
  const normalizeDifficulty = (val?: string): string => {
    if (!val) return "Medium";
    const v = val.toLowerCase();
    if (v.includes("easy") || v.includes("light")) return "Easy";
    if (v.includes("hard") || v.includes("heavy")) return "Hard";
    return "Medium";
  };

  // Helper to dynamically calculate majority choice (highest percentage) from student reviews
  const getMajorityChoice = (arr: (string | undefined | null)[]) => {
    const valid = arr.filter((x): x is string => Boolean(x && x.trim()));
    if (valid.length === 0) return { choice: null, percent: 0, count: 0 };
    const freq: Record<string, number> = {};
    for (const item of valid) {
      freq[item] = (freq[item] || 0) + 1;
    }
    let maxCount = 0;
    let bestChoice = valid[0];
    for (const [key, count] of Object.entries(freq)) {
      if (count > maxCount) {
        maxCount = count;
        bestChoice = key;
      }
    }
    const percent = Math.round((maxCount / valid.length) * 100);
    return { choice: bestChoice, percent, count: maxCount };
  };

  const reviewCount = reviews.length;
  const avgRating = reviewCount > 0
    ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / reviewCount).toFixed(1)
    : null;

  const recommendCount = reviews.filter((r) => (Number(r.rating) || 5) >= 4).length;
  const recommendPercent = reviewCount > 0 ? Math.round((recommendCount / reviewCount) * 100) : null;

  // Complete statistical consensus calculation across all student evaluations (Highest Percentage Choice)
  const normalizedTimings = reviews.map((r) => normalizeTiming(r.personality));
  const fallbackTiming = course?.semester && course.semester <= 3
    ? "Sem 1-3 (Early Degree)"
    : course?.semester && course.semester >= 7
    ? "Sem 7-8 (Final Year)"
    : "Sem 4-6 (Mid Degree)";
  const timingStats = getMajorityChoice(normalizedTimings);
  const dynamicTiming = reviewCount > 0 ? (timingStats.choice || fallbackTiming) : null;
  const timingPercent = reviewCount > 0 ? timingStats.percent : 0;

  const normalizedWorkloads = reviews.map((r) => normalizeWorkload(r.marking));
  const workloadStats = getMajorityChoice(normalizedWorkloads);
  const dynamicWorkload = reviewCount > 0 ? (workloadStats.choice || "Moderate / Balanced") : null;
  const workloadPercent = reviewCount > 0 ? workloadStats.percent : 0;

  const isCurrentLab = Boolean(course?.lab);
  const normalizedDifficulties = reviews.map((r) => normalizeDifficulty(r.difficulty));
  const diffStats = getMajorityChoice(normalizedDifficulties);
  const dynamicDifficulty = reviewCount > 0 ? (diffStats.choice || (isCurrentLab ? "Practical" : "Medium")) : null;
  const diffPercent = reviewCount > 0 ? diffStats.percent : 0;

  const formatReviewDate = (dateStr?: string) => {
    if (!dateStr) return "4/16/2026";
    try {
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    } catch {
      return "4/16/2026";
    }
  };

  // SEU Open Credit Enrollment & Sequencing Guidance - Calculated dynamically from all reviews
  const getEnrollmentAdvice = (isLab: boolean) => {
    if (reviewCount === 0) {
      return {
        verdictTitle: isLab
          ? (language === "bn" ? "ল্যাব কোর্স সিকোয়েন্সিং গাইড" : "Companion Lab Sequence Guidance")
          : (course?.semester 
              ? (language === "bn" ? `সেমিস্টার ${course.semester} প্রস্তাবিত (সিলেবাস অনুসারে)` : `Semester ${course.semester} Recommended (Curriculum)`)
              : (language === "bn" ? "সিলেবাস সিকোয়েন্সিং গাইড" : "Curriculum Sequence Guidance")),
        adviceText: isLab
          ? (language === "bn" 
              ? "এটি একটি ব্যবহারিক ল্যাব কোর্স। ওপেন ক্রেডিট নিয়মে সংশ্লিষ্ট থিওরি কোর্সের সাথে একই সেমিস্টারে নিলে বিষয়বস্তু দ্রুত আয়ত্ত করা যায় এবং ফাইনাল গ্রেড উন্নত হয়।"
              : "This is a practical lab course. Under SEU's open credit system, taking this concurrently with its theory subject ensures maximum conceptual clarity and easier grade optimization.")
          : (language === "bn"
              ? "এখনও কোনো শিক্ষার্থী এই কোর্সের জন্য রিভিউ দেননি। সিলেবাসের ক্রমধারা অনুযায়ী এটি সময়মতো নিয়ে নিন এবং প্রথম রিভিউটি দিয়ে সহপাঠীদের সাহায্য করুন।"
              : "No student evaluations yet. Follow curriculum sequencing and be the first to submit a review to help your peers plan their degree!"),
        timingLabel: course?.semester ? (language === "bn" ? `সেমিস্টার ${course.semester}` : `Semester ${course.semester}`) : "—",
        recommendLevel: "PENDING",
      };
    }

    const timing = dynamicTiming || fallbackTiming;
    const workload = dynamicWorkload || "Moderate / Balanced";

    let guidance = "";
    if (timing.includes("Early") || timing.includes("1-3")) {
      guidance = language === "bn"
        ? `সকল ${reviewCount} জন শিক্ষার্থীর পর্যালোচনায় (${timingPercent}% ঐক্যমত), এটি ১ম থেকে ৩য় সেমিস্টারের মধ্যে নেওয়া জোরালোভাবে পরামর্শযোগ্য। এটি পরবর্তী অ্যাডভান্সড কোর্সগুলোর মূল ভিত্তি (Core Prerequisite), তাই ডিগ্রি শুরুতে শেষ করলে কোনো ক্রেডিট ব্লকেজ থাকে না।`
        : `Calculated from all ${reviewCount} student review${reviewCount > 1 ? 's' : ''} (${timingPercent}% consensus): strongly recommended for 1st - 3rd semester (Early Degree). Clearing this foundational prerequisite early prevents downstream enrollment locks.`;
    } else if (timing.includes("Mid") || timing.includes("4-6")) {
      guidance = language === "bn"
        ? `সকল ${reviewCount} জন শিক্ষার্থীর পর্যালোচনায় (${timingPercent}% ঐক্যমত), এটি ৪র্থ থেকে ৬ষ্ঠ সেমিস্টারে নেওয়া সবচেয়ে উপযুক্ত। মূল বিষয়ের ভিত্তি মজবুত হওয়ার পর এই কোর্সটি নিলে এর অ্যাসাইনমেন্ট ও প্রজেক্টের কাজের চাপ সহজে ব্যালান্স করা যায়।`
        : `Calculated from all ${reviewCount} student review${reviewCount > 1 ? 's' : ''} (${timingPercent}% consensus): recommended for 4th - 6th semester (Mid Degree). Best taken once core basics are solidified, keeping total credit workload balanced.`;
    } else if (timing.includes("Final") || timing.includes("7-8")) {
      guidance = language === "bn"
        ? `সকল ${reviewCount} জন শিক্ষার্থীর পর্যালোচনায় (${timingPercent}% ঐক্যমত), এটি ৭ম থেকে ৮ম সেমিস্টারে (ফাইনাল ইয়ার) নেওয়া উপযুক্ত। এটি উচ্চতর বিষয়ের কোর্স, যা পূর্বের কোর বিষয়গুলো সমাপ্ত করার পর নিলে সর্বোচ্চ সিজিপিএ নিশ্চিত হয়।`
        : `Calculated from all ${reviewCount} student review${reviewCount > 1 ? 's' : ''} (${timingPercent}% consensus): best suited for final year (7th - 8th semester) as an advanced elective requiring core prerequisite mastery.`;
    } else {
      guidance = language === "bn"
        ? `সকল ${reviewCount} জন শিক্ষার্থীর পর্যালোচনায়, এটি একটি ফ্লেক্সিবল কোর্স—আপনার সেমিস্টারের ক্রেডিট লোড এবং অবসর সময়ের ওপর ভিত্তি করে যে কোনো সেমিস্টারে স্বচ্ছন্দে সম্পন্ন করতে পারেন।`
        : `Calculated from all ${reviewCount} student review${reviewCount > 1 ? 's' : ''}: flexible timing — easily slotted into any semester schedule depending on your remaining credit requirements.`;
    }

    const workloadNote = workload.includes("Heavy")
      ? (language === "bn" ? "কাজের চাপ তুলনামূলক বেশি—একই সেমিস্টারে একাধিক কঠিন কোর্সের সাথে না নিয়ে হালকা বিষয়ের সাথে ক্রেডিট ব্যালান্স করুন।" : "Demanding workload — pair with lighter electives to protect your GPA.")
      : workload.includes("Light")
      ? (language === "bn" ? "হালকা চাপ—অন্যান্য ভারী কোর্সের পাশাপাশি ক্রেডিট চাহিদা মেটাতে আদর্শ।" : "Light effort — great for balancing credits alongside heavier technical courses.")
      : (language === "bn" ? "ভারসাম্যপূর্ণ চাপ—ক্লাস লেকচার ও অতীতের প্রশ্ন পর্যালোচনা করলেই চমৎকার গ্রেড অর্জন সম্ভব।" : "Balanced workload — standard assignment schedule and comfortable exam preparation.");

    const verdictLabel = language === "bn"
      ? (timing.includes("Early") ? "সেমিস্টার ১-৩ (শুরুর সেমিস্টার)" : timing.includes("Final") ? "সেমিস্টার ৭-৮ (ফাইনাল ইয়ার)" : timing.includes("Flex") ? "যেকোনো সেমিস্টার (ফ্লেক্সিবল)" : "সেমিস্টার ৪-৬ (মাঝের সেমিস্টার)")
      : timing;

    return {
      verdictTitle: verdictLabel,
      adviceText: `${guidance} ${workloadNote}`,
      timingLabel: verdictLabel,
      recommendLevel: Number(avgRating) >= 4.0 ? "HIGH" : Number(avgRating) >= 3.0 ? "MODERATE" : "CAUTION",
    };
  };

  if (loading && !course) {
    return <CourseDetailSkeleton />;
  }

  if (!course) {
    return (
      <div className="max-w-md mx-auto py-28 px-4 text-center">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Course Not Found</h2>
        <p className="text-xs text-slate-500 mb-6">Could not find any active course with code &quot;{code}&quot;.</p>
        <Link href="/courses" className="py-2.5 px-6 rounded-xl font-bold text-xs bg-blue-600 text-white">
          Back to Course Catalog
        </Link>
      </div>
    );
  }

  const isLabCourse = !!course.lab;

  // Base resources filtered by Faculty & live search
  const facultyFiltered = resources.filter((res) => {
    if (selectedFacultyId !== "ALL") {
      if (!res.teacher || res.teacher.id !== selectedFacultyId) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = res.title?.toLowerCase().includes(q);
      const matchSem = res.semesterName?.toLowerCase().includes(q);
      const matchTeacher = res.teacher?.name?.toLowerCase().includes(q);
      const matchInit = res.teacher?.initial?.toLowerCase().includes(q);
      if (!matchTitle && !matchSem && !matchTeacher && !matchInit) return false;
    }
    // Strict separation:
    if (!isLabCourse) {
      // Theory course: allowed types
      if (
        res.type !== "NOTE" &&
        res.type !== "MID_QUESTION" &&
        res.type !== "FINAL_QUESTION" &&
        res.type !== "QUIZ_CT" &&
        res.type !== "DOC_NOTE" &&
        res.type !== "QUESTION_COURSE_IN" &&
        res.type !== "OTHERS"
      ) {
        return false;
      }
    } else {
      // Lab course: strictly exclude Midterm and Final theory examination papers
      if (res.type === "MID_QUESTION" || (res.type === "FINAL_QUESTION" && !res.title?.toLowerCase().includes("lab"))) {
        return false;
      }
    }
    return true;
  });

  // Theory Categories: hand notes, mid, final, sate quiz, and doc file note
  const handNotes = facultyFiltered.filter(r => r.type === "NOTE" || r.type === "OTHERS");
  const midtermExams = facultyFiltered.filter(r => r.type === "MID_QUESTION");
  const finalExams = facultyFiltered.filter(r => r.type === "FINAL_QUESTION");
  const quizCTs = facultyFiltered.filter(r => r.type === "QUIZ_CT" || r.type === "QUESTION_COURSE_IN");
  const docNotes = facultyFiltered.filter(r => r.type === "DOC_NOTE" || r.fileUrl?.match(/\.(doc|docx|odt|txt|rtf)$/i) || r.title?.toLowerCase().includes(".doc"));

  // Lab Categories: hand notes, sate quiz, lab final, project link (live/github), and doc file note
  const labHandNotes = facultyFiltered.filter(r => r.type === "LAB_HAND_NOTE" || r.type === "LAB_REPORT" || (r.type === "NOTE" && isLabCourse) || (r.type === "OTHERS" && isLabCourse));
  const labQuizzes = facultyFiltered.filter(r => r.type === "LAB_QUIZ" || (r.type === "QUIZ_CT" && isLabCourse));
  const labFinals = facultyFiltered.filter(r => r.type === "LAB_FINAL");
  const projectLinks = facultyFiltered.filter(r => r.type === "PROJECT_LINK" || r.fileUrl?.includes("github.com") || r.title?.toLowerCase().includes("project"));
  const labDocNotes = facultyFiltered.filter(r => r.type === "DOC_NOTE" || r.fileUrl?.match(/\.(doc|docx|odt|txt|rtf)$/i) || r.title?.toLowerCase().includes(".doc"));
  const labManuals = facultyFiltered.filter(r => r.type === "LAB_MANUAL" || r.type === "QUESTION_COURSE_IN");

  // Deduplicated faculty list (from course teachers + any teachers with approved resources)
  const courseFacultyList = (() => {
    const list: any[] = [];
    const seen = new Set<number>();
    if (course?.teachers && Array.isArray(course.teachers)) {
      course.teachers.forEach((t: any) => {
        if (t?.id && !seen.has(t.id)) {
          seen.add(t.id);
          list.push(t);
        }
      });
    }
    resources.forEach((r: any) => {
      if (r?.teacher?.id && !seen.has(r.teacher.id)) {
        seen.add(r.teacher.id);
        list.push(r.teacher);
      }
    });
    return list;
  })();

  const selectedFacultyObj = selectedFacultyId !== "ALL"
    ? courseFacultyList.find((t: any) => t.id === selectedFacultyId)
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* 1. COURSE HERO HEADER */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs sm:text-sm font-extrabold px-3 py-1 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                {course.code}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {course.department || "CSE"} {t("course.department", "Department")}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {course.semester && course.semester > 0 ? `${t("course.semester", "Semester")} ${course.semester}` : `${t("course.electiveGroup", "Elective Group")} ${course.electiveGroup || "A/B"}`}
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {course.credits} {t("course.credits", "Credits")}
              </span>
              {isLabCourse ? (
                <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                  {t("course.labBadge", "Practical Lab Course")}
                </span>
              ) : (
                <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                  {t("course.theoryBadge", "Theory Course")}
                </span>
              )}

              {/* Real Database Unlock Counter Badges (Only shown when real users have unlocked) */}
              {Boolean(course.unlockCount && course.unlockCount > 0) && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 border border-orange-200/70 dark:border-orange-800/50 flex items-center gap-1.5 shadow-sm">
                  <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500 animate-pulse" />
                  <span>{course.unlockCount} {language === "bn" ? "জন শিক্ষার্থী আনলক করেছে" : "Students Unlocked"}</span>
                </span>
              )}
              {Boolean(course.trending && course.unlockCount && course.unlockCount > 0) && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200/70 dark:border-rose-800/50 flex items-center gap-1 shadow-sm">
                  <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
                  <span>{language === "bn" ? "জনপ্রিয় কোর্স" : "Trending Course"}</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {course.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {course.description || (language === "bn" 
                ? "সাউথইস্ট ইউনিভার্সিটির অফিশিয়াল একাডেমিক কারিকুলাম ও কোর্স আর্কাইভ। লেকচার হ্যান্ড নোট, বিগত সেমিস্টারের মিডটার্ম ও ফাইনাল প্রশ্ন এবং ল্যাব শিট।"
                : "Official academic course archive for Southeast University. Access lecture hand notes, previous semester midterm & final examination question papers, and lab manuals.")}
            </p>

            {course.prerequisite && course.prerequisite !== "Nil" && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-bold text-slate-700 dark:text-slate-300">{t("course.prerequisite", "Prerequisite")}:</span> {course.prerequisite}
              </p>
            )}

            {/* Companion Course 1-Click Switcher Banner */}
            {companionCourse && (
              <div className="mt-4 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    {companionCourse.lab ? <FlaskConical className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-extrabold text-blue-950 dark:text-blue-100">
                        {companionCourse.lab ? t("course.companionLab", "Companion Practical Lab Course:") : t("course.companionTheory", "Companion Theory Course:")}
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                        companionCourse.unlocked || hasUnlocked(companionCourse.code)
                          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                          : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400"
                      }`}>
                        {companionCourse.unlocked || hasUnlocked(companionCourse.code) ? t("course.unlocked", "✓ Unlocked") : t("course.separateUnlock", "Separate Course Unlock")}
                      </span>
                    </div>
                    <p className="text-[11px] text-blue-700 dark:text-blue-300 font-semibold mt-0.5">
                      {companionCourse.code} — {companionCourse.title}
                      {!(companionCourse.unlocked || hasUnlocked(companionCourse.code)) && ` ${t("course.requiresSeparate", "(Requires separate unlock)")}`}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/courses/${companionCourse.code}`}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center justify-center gap-1.5 self-start sm:self-auto shrink-0 transition-all"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>{t("course.switchTo", "Switch to")} {companionCourse.code}</span>
                </Link>
              </div>
            )}
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            {/* AI Revision CheatSheet Button */}
            <button
              onClick={() => setCheatSheetOpen(true)}
              className="py-3 px-5 rounded-2xl text-xs font-bold text-slate-800 dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{t("course.aiCheatSheet", "AI Exam Cheat Sheet")}</span>
            </button>

            {/* Unlock Status CTA */}
            {isCourseUnlocked ? (
              <div className="py-2.5 px-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex flex-col items-center justify-center gap-0.5">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t("course.allFacultyUnlocked", "All Faculty Unlocked")}</span>
                </div>
                {(() => {
                  const detail = user?.unlockedCourseDetails?.find((d) => d.courseCode?.toLowerCase() === code?.toLowerCase() && !d.teacherId);
                  if (detail && detail.remainingDays > 0) {
                    return (
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-300 font-extrabold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {detail.remainingDays} {language === "bn" ? "দিন অ্যাক্সেস অবশিষ্ট" : "Days Access Left"}
                      </span>
                    );
                  }
                  if (user?.activeAccessRemainingDays && user.activeAccessRemainingDays > 0) {
                    return (
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-300 font-extrabold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {user.activeAccessRemainingDays} {language === "bn" ? "দিন অ্যাক্সেস অবশিষ্ট" : "Days Access Left"}
                      </span>
                    );
                  }
                  return (
                    <span className="text-[10px] font-normal opacity-85">{t("course.allAccessible", "All notes & exams accessible")}</span>
                  );
                })()}
              </div>
            ) : (
              <div className="space-y-2">
                {unlockedTeacherDetails.length > 0 && (
                  <div className="py-2 px-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 text-center">
                    <span>
                      🎁 {language === "bn" ? "গিফট আনলক সক্রিয়:" : "Faculty Gift Active:"}{" "}
                      {unlockedTeacherDetails.map((d) => d.teacherInitial || d.teacherName).join(", ")}
                    </span>
                    <span className="text-[10px] font-normal opacity-90">
                      {language === "bn" ? "শুধুমাত্র নির্দিষ্ট শিক্ষকের নোট আনলকড" : "Only selected faculty materials unlocked"}
                    </span>
                  </div>
                )}
                <button
                  onClick={handleUnlockCourse}
                  disabled={unlocking}
                  className="w-full py-3 px-5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/25 transition-all flex flex-col items-center justify-center gap-0.5"
                >
                  <div className="flex items-center gap-2">
                    <Unlock className="w-4 h-4" />
                    <span>{unlocking ? t("course.unlocking", "Unlocking...") : t("course.unlockAllFaculty", "Unlock Course (All Faculty)")}</span>
                  </div>
                  <span className="text-[10px] font-normal text-blue-100">{t("course.oneQuota", "1 Quota • Unlocks all instructors")}</span>
                </button>
              </div>
            )}

            {/* Offline Study Pack (ZIP) CTA - Temporarily Disabled for Security */}
            <button
              onClick={handleOfflineStudyPackDisabledNotice}
              className="w-full py-3 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-between gap-2.5 cursor-pointer group bg-slate-100/90 hover:bg-slate-200/90 dark:bg-[#11192e] dark:hover:bg-[#16213b] border border-amber-500/30 shadow-xs"
              title={
                language === "bn"
                  ? "নিরাপত্তাজনিত কারণে এই সেবাটি সাময়িকভাবে বন্ধ রাখা হয়েছে"
                  : "For security purposes, this service is temporarily disabled"
              }
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 group-hover:scale-105 transition-transform shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="leading-tight font-black text-[13px] text-slate-900 dark:text-white">
                    {language === "bn" ? "অফলাইন স্টাডি প্যাক (ZIP)" : "Offline Study Pack (ZIP)"}
                  </span>
                  <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400/90 leading-tight">
                    {language === "bn" ? "নিরাপত্তার স্বার্থে সেবাটি সাময়িক স্থগিত" : "Temporarily paused for security"}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                🔒 {language === "bn" ? "স্থগিত" : "Disabled"}
              </span>
            </button>

            {/* Real Social Proof Card - Only when real unlocks exist */}
            {Boolean(course.unlockCount && course.unlockCount > 0) && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-blue-500/10 border border-amber-200/70 dark:border-amber-900/40 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="text-[11px] font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>{course.unlockCount} {language === "bn" ? "জন SEU শিক্ষার্থী যুক্ত" : "SEU Students Enrolled"}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-tight">
                  {isCourseUnlocked
                    ? (language === "bn"
                        ? "অভিনন্দন! আপনি এই কোর্সের পূর্ণাঙ্গ রিসোর্স আর্काइভের সফল আনলককারী।"
                        : "You are actively utilizing this course archive alongside your batchmates.")
                    : (language === "bn"
                        ? "মিডটার্ম ও ফাইনাল পরীক্ষার সেরা প্রস্তুতির জন্য ব্যাচমেটদের সর্বাধিক পছন্দের কোর্স।"
                        : "Trusted by batchmates preparing for Midterm & Final examinations.")}
                </p>
                <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>{language === "bn" ? "সকল শিক্ষকের হ্যান্ডনোট ও বিগত প্রশ্ন অন্তর্ভুক্ত" : "Includes all faculty notes & exam papers"}</span>
                </div>
              </div>
            )}

            <Link
              href="/contribute"
              className="py-2 px-4 rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 text-center transition-colors"
            >
              {t("course.contribute", "+ Contribute Material for this Course")}
            </Link>
          </div>
        </div>
      </div>

      {/* 2. FACULTY SELECTION (WHO TEACHES THIS COURSE) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <span>{t("course.facultyHeader", "Course Faculty & Instructors")}</span>
            </h2>
            <p className="text-xs text-slate-500">
              {t("course.facultySubtitle", "Select an instructor below to view their specific lecture hand notes, midterm & final questions, and lab tasks.")}
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {course.teachers?.length || 0} {t("course.facultyAssigned", "Faculty Assigned")}
          </span>
        </div>

        {/* Faculty Grid Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* All Faculty Card */}
          <button
            onClick={() => setSelectedFacultyId("ALL")}
            className={`p-4 rounded-2xl text-left border transition-all flex items-center gap-3 ${
              selectedFacultyId === "ALL"
                ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 shadow-sm"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl font-extrabold text-xs flex items-center justify-center shrink-0 ${
              selectedFacultyId === "ALL"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}>
              ALL
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                {t("course.allFacultyMembers", "All Faculty Members")}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {resources.length} {t("course.totalMaterials", "Total Materials")}
              </p>
            </div>
            {selectedFacultyId === "ALL" && (
              <Check className="w-4 h-4 text-blue-600 shrink-0" />
            )}
          </button>

          {/* Individual Faculty Cards with Name + [Initial] */}
          {courseFacultyList.map((tItem: any) => {
            const isSelected = selectedFacultyId === tItem.id;
            const isThisTeacherGifted =
              !isCourseUnlocked &&
              (hasUnlockedForTeacher(code, tItem.id) ||
                Boolean(course?.unlockedTeacherIds?.some((id: number) => Number(id) === Number(tItem.id))));
            const tRes = resources.filter(r => r.teacher?.id === tItem.id);
            const notesCount = tRes.filter(r => r.type === "NOTE" || r.type === "LAB_HAND_NOTE" || r.type === "LAB_REPORT").length;
            const examsCount = tRes.filter(r => r.type === "MID_QUESTION" || r.type === "FINAL_QUESTION" || r.type === "LAB_QUIZ" || r.type === "LAB_FINAL").length;

            return (
              <button
                key={tItem.id}
                onClick={() => setSelectedFacultyId(tItem.id)}
                className={`p-4 rounded-2xl text-left border transition-all flex items-center gap-3 relative ${
                  isSelected
                    ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20 shadow-sm"
                    : isThisTeacherGifted
                    ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-400/50 hover:border-amber-400"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                }`}
              >
                <FacultyAvatar
                  image={tItem.image}
                  name={tItem.name}
                  initial={tItem.initial}
                  designation={tItem.designation}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  {/* Name with [Initial] */}
                  <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {tItem.name} {tItem.initial ? `[${tItem.initial}]` : ""}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {isThisTeacherGifted && (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        🎁 Unlocked
                      </span>
                    )}
                    {notesCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                        {notesCount} {t("course.notesCount", "Notes")}
                      </span>
                    )}
                    {examsCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
                        {examsCount} {t("course.examsCount", "Exams")}
                      </span>
                    )}
                    {notesCount === 0 && examsCount === 0 && !isThisTeacherGifted && (
                      <span className="text-[10px] text-slate-400">{t("course.facultyRole", "Faculty")}</span>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 text-blue-600 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. MATERIAL EXPLORER HEADER & TABS */}
      <div className="space-y-6">
        
        {/* Navigation & Search Filter Bar */}
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Category Tabs: Custom for Lab vs Theory */}
            <div className="flex flex-wrap items-center gap-2">
              {isLabCourse ? (
                // Lab Categories: Hand Notes, Lab Quiz, Lab Final, Project Link, Doc File Notes
                [
                  { id: "ALL", label: `${language === "bn" ? "সকল মেটেরিয়াল" : "All Materials"} (${facultyFiltered.length})` },
                  { id: "LAB_HAND_NOTE", label: `${language === "bn" ? "হ্যান্ড নোট" : "Hand Notes"} (${labHandNotes.length})` },
                  { id: "LAB_QUIZ", label: `${language === "bn" ? "কুইজ" : "Quiz"} (${labQuizzes.length})` },
                  { id: "LAB_FINAL", label: `${language === "bn" ? "ল্যাব ফাইনাল" : "Lab Final"} (${labFinals.length})` },
                  { id: "PROJECT_LINK", label: `${language === "bn" ? "প্রজেক্ট লিংক" : "Project Links"} (${projectLinks.length})` },
                  { id: "DOC_NOTE", label: `${language === "bn" ? "ডক ফাইল নোট" : "Doc File Notes"} (${labDocNotes.length})` },
                  ...(labManuals.length > 0 ? [{ id: "LAB_MANUAL", label: `${language === "bn" ? "ল্যাব ম্যানুয়াল" : "Lab Manuals"} (${labManuals.length})` }] : []),
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeTab === tab.id
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))
              ) : (
                // Theory Categories: Hand Notes, Midterm, Final, Quiz & CT, Doc File Notes
                [
                  { id: "ALL", label: `${language === "bn" ? "সকল মেটেরিয়াল" : "All Materials"} (${facultyFiltered.length})` },
                  { id: "NOTES", label: `${language === "bn" ? "হ্যান্ড নোট" : "Hand Notes"} (${handNotes.length})` },
                  { id: "MIDTERM", label: `${language === "bn" ? "মিডটার্ম" : "Midterm"} (${midtermExams.length})` },
                  { id: "FINAL", label: `${language === "bn" ? "ফাইনাল" : "Final"} (${finalExams.length})` },
                  { id: "QUIZ", label: `${language === "bn" ? "কুইজ / সিটি" : "Quiz & CT"} (${quizCTs.length})` },
                  { id: "DOC_NOTE", label: `${language === "bn" ? "ডক ফাইল নোট" : "Doc File Notes"} (${docNotes.length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeTab === tab.id
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))
              )}
            </div>

            {/* Quick Live Search within this Course */}
            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                maxLength={100}
                placeholder={t("tabs.searchPlaceholder", "Filter by semester, quiz, or topic...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick 1-Click ZIP Download button (Temporarily Disabled for Security) */}
            <button
              onClick={handleOfflineStudyPackDisabledNotice}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-amber-500/30 shadow-xs cursor-pointer opacity-90 hover:opacity-100"
              title={
                language === "bn"
                  ? "নিরাপত্তাজনিত কারণে এই সেবাটি সাময়িকভাবে বন্ধ রাখা হয়েছে"
                  : "For security purposes, this service is temporarily disabled"
              }
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline font-bold">
                {language === "bn" ? "অফলাইন ZIP" : "Offline ZIP"}
              </span>
              <span className="text-[10px] text-amber-500 font-bold">🔒</span>
            </button>
          </div>

          {/* Active Instructor Feedback Pill */}
          {selectedFacultyObj && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>{t("course.filteringFor", "Filtering materials for:")}</span>
                <span className="font-bold text-slate-900 dark:text-white bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md text-blue-700 dark:text-blue-300">
                  {selectedFacultyObj.name} {selectedFacultyObj.initial ? `[${selectedFacultyObj.initial}]` : ""}
                </span>
              </div>
              <button 
                onClick={() => setSelectedFacultyId("ALL")}
                className="text-blue-600 text-xs font-bold hover:underline"
              >
                {t("course.clearFilter", "Clear Instructor Filter")}
              </button>
            </div>
          )}
        </div>

        {/* Notice Info */}
        <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/50 flex items-start gap-3 text-xs">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-extrabold text-blue-950 dark:text-blue-100">
              {isLabCourse ? (language === "bn" ? "প্র্যাকটিক্যাল ল্যাব কোর্স আর্কাইভ:" : "Practical Lab Course Archive:") : (language === "bn" ? "কোর্স আনলকের পরিধি ও নিয়ম:" : "Course Unlock Scope & Policy:")}
            </p>
            <p className="text-blue-900 dark:text-blue-200 leading-relaxed">
              {isLabCourse ? t("notice.scopeLab") : t("notice.scopeTheory")}
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. STRUCTURED STACKS: RENDER LAB OR THEORY SECTIONS                       */}
        {/* ========================================================================= */}
        
        {isLabCourse ? (
          /* ========================================================= */
          /* LAB COURSE SECTIONS (NO MIDTERM / NO FINAL THEORY EXAMS)  */
          /* ========================================================= */
          <div className="space-y-8">
            
            {/* 1. Lab Hand Notes */}
            {(activeTab === "ALL" || activeTab === "LAB_HAND_NOTE") && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <BookMarked className="w-4 h-4 text-teal-600" />
                    <span>{language === "bn" ? "হ্যান্ড নোট" : "Hand Notes"}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-400">
                      {labHandNotes.length}
                    </span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {language === "bn" ? "ব্যবহারিক ক্লাস লেকচার ও প্র্যাকটিক্যাল কোড শিট" : "Practical Class Lectures & Code Cheatsheets"}
                  </span>
                </div>

                {labHandNotes.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                    {language === "bn" ? "এখনও কোনো হ্যান্ড নোট আপলোড করা হয়নি।" : "No lab hand notes uploaded yet."}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {labHandNotes.map((res) => (
                      <MaterialCard
                        key={res.id}
                        resource={res}
                        categoryTag={language === "bn" ? "হ্যান্ড নোট" : "Hand Note"}
                        tagColor="teal"
                        isCourseUnlocked={isResourceUnlockedForView(res)}
                        onOpenViewer={handleOpenViewer}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 2. Lab Quiz */}
            {(activeTab === "ALL" || activeTab === "LAB_QUIZ") && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-purple-600" />
                    <span>{language === "bn" ? "ল্যাব কুইজ" : "Lab Quizzes"}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400">
                      {labQuizzes.length}
                    </span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {language === "bn" ? "ব্যবহারিক কোডিং কুইজ ও কমান্ড টেস্ট" : "Practical Coding & Command Quizzes"}
                  </span>
                </div>

                {labQuizzes.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                    {language === "bn" ? "এখনও কোনো ল্যাব কুইজ আপলোড করা হয়নি।" : "No lab quizzes uploaded yet."}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {labQuizzes.map((res) => (
                      <MaterialCard
                        key={res.id}
                        resource={res}
                        categoryTag={language === "bn" ? "ল্যাব কুইজ" : "Lab Quiz"}
                        tagColor="purple"
                        isCourseUnlocked={isResourceUnlockedForView(res)}
                        onOpenViewer={handleOpenViewer}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. Lab Final */}
            {(activeTab === "ALL" || activeTab === "LAB_FINAL") && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-rose-600" />
                    <span>{language === "bn" ? "ল্যাব ফাইনাল" : "Lab Final"}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400">
                      {labFinals.length}
                    </span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {language === "bn" ? "ল্যাব ফাইনাল প্রবলেম সেট ও ভাইভা প্রশ্নব্যাংক" : "Lab Final Problem Sets & Viva Question Bank"}
                  </span>
                </div>

                {labFinals.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                    {language === "bn" ? "এখনও কোনো ল্যাব ফাইনাল শিট আপলোড করা হয়নি।" : "No lab final examination sheets uploaded yet."}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {labFinals.map((res) => (
                      <MaterialCard
                        key={res.id}
                        resource={res}
                        categoryTag={language === "bn" ? "ল্যাব ফাইনাল" : "Lab Final"}
                        tagColor="rose"
                        isCourseUnlocked={isResourceUnlockedForView(res)}
                        onOpenViewer={handleOpenViewer}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. Project Links (Live Demo or GitHub Source Code) */}
            {(activeTab === "ALL" || activeTab === "PROJECT_LINK") && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-emerald-600" />
                    <span>{language === "bn" ? "প্রজেক্ট লিংক" : "Project Links"}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                      {projectLinks.length}
                    </span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {language === "bn" ? "লাইভ ওয়েব ডেমো ও গিটহাব সোর্স কোড রিপোজিটরি" : "Live Web Demos & GitHub Source Codes"}
                  </span>
                </div>

                {projectLinks.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                    {language === "bn" ? "এখনও কোনো প্রজেক্ট লিংক বা কোড যুক্ত করা হয়নি।" : "No project links or source codes added yet."}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projectLinks.map((res) => (
                      <MaterialCard
                        key={res.id}
                        resource={res}
                        categoryTag={language === "bn" ? "প্রজেক্ট লিংক" : "Project Link"}
                        tagColor="emerald"
                        isCourseUnlocked={isResourceUnlockedForView(res)}
                        onOpenViewer={handleOpenViewer}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 5. Doc File Notes */}
            {(activeTab === "ALL" || activeTab === "DOC_NOTE") && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-600" />
                    <span>{language === "bn" ? "ডক ফাইল নোট" : "Doc File Notes"}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400">
                      {labDocNotes.length}
                    </span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {language === "bn" ? "ওয়ার্ড ফাইল (.docx) ও ল্যাব রিপোর্ট টেমপ্লেট" : "Word (.docx) Documentation & Report Templates"}
                  </span>
                </div>

                {labDocNotes.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                    {language === "bn" ? "এখনও কোনো ডক ফাইল নোট আপলোড করা হয়নি।" : "No doc file notes uploaded yet."}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {labDocNotes.map((res) => (
                      <MaterialCard
                        key={res.id}
                        resource={res}
                        categoryTag={language === "bn" ? "ডক ফাইল নোট" : "Doc File Note"}
                        tagColor="cyan"
                        isCourseUnlocked={isResourceUnlockedForView(res)}
                        onOpenViewer={handleOpenViewer}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 6. Optional: Lab Manuals (If any exist) */}
            {labManuals.length > 0 && (activeTab === "ALL" || activeTab === "LAB_MANUAL") && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-amber-600" />
                    <span>{language === "bn" ? "ল্যাব ম্যানুয়াল" : "Lab Manuals & Practical Experiments"}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                      {labManuals.length}
                    </span>
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {labManuals.map((res) => (
                    <MaterialCard
                      key={res.id}
                      resource={res}
                      categoryTag={language === "bn" ? "ল্যাব ম্যানুয়াল" : "Lab Manual"}
                      tagColor="amber"
                      isCourseUnlocked={isResourceUnlockedForView(res)}
                      onOpenViewer={handleOpenViewer}
                    />
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : (
          /* ========================================================= */
          /* THEORY COURSE SECTIONS (5 DEDICATED STACKS)               */
          /* ========================================================= */
          <div className="space-y-8">
            
            {/* SECTION A: HAND NOTES */}
            {(activeTab === "ALL" || activeTab === "NOTES") && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <BookMarked className="w-4 h-4 text-emerald-600" />
                    <span>{language === "bn" ? "হ্যান্ড নোট" : "Hand Notes"}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                      {handNotes.length}
                    </span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {language === "bn" ? "লেকচার হ্যান্ড নোট ও ক্লাস স্লাইড" : "Lecture Hand Notes & Class Slides"}
                  </span>
                </div>

                {handNotes.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                    {language === "bn" ? "এখনও কোনো হ্যান্ড নোট আপলোড করা হয়নি।" : "No hand notes uploaded yet for this selection."}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {handNotes.map((res) => (
                      <MaterialCard
                        key={res.id}
                        resource={res}
                        categoryTag={language === "bn" ? "হ্যান্ড নোট" : "Hand Notes"}
                        tagColor="emerald"
                        isCourseUnlocked={isResourceUnlockedForView(res)}
                        onOpenViewer={handleOpenViewer}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SECTION B: MIDTERM EXAMINATION QUESTIONS */}
            {(activeTab === "ALL" || activeTab === "MIDTERM") && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>{language === "bn" ? "মিডটার্ম" : "Midterm Examination Papers"}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
                      {midtermExams.length} {language === "bn" ? "টি সেমিস্টার" : "Semesters"}
                    </span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {language === "bn" ? "বিগত সেমিস্টারের মিডটার্ম প্রশ্ন আর্কাইভ" : "Multi-Semester Midterm Archive"}
                  </span>
                </div>

                {midtermExams.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                    {language === "bn" ? "এখনও কোনো মিডটার্ম প্রশ্ন আপলোড করা হয়নি।" : "No midterm examination papers uploaded yet for this selection."}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {midtermExams.map((res) => (
                      <MaterialCard
                        key={res.id}
                        resource={res}
                        categoryTag={language === "bn" ? "মিডটার্ম" : "Midterm"}
                        tagColor="blue"
                        isCourseUnlocked={isResourceUnlockedForView(res)}
                        onOpenViewer={handleOpenViewer}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SECTION C: FINAL EXAMINATION QUESTIONS */}
            {(activeTab === "ALL" || activeTab === "FINAL") && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    <span>{language === "bn" ? "ফাইনাল" : "Final Examination Papers"}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400">
                      {finalExams.length} {language === "bn" ? "টি সেমিস্টার" : "Semesters"}
                    </span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {language === "bn" ? "বিগত সেমিস্টারের ফাইনাল পরীক্ষা প্রশ্ন আর্কাইভ" : "Multi-Semester Final Exam Archive"}
                  </span>
                </div>

                {finalExams.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                    {language === "bn" ? "এখনও কোনো ফাইনাল পরীক্ষা প্রশ্ন আপলোড করা হয়নি।" : "No final examination papers uploaded yet for this selection."}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {finalExams.map((res) => (
                      <MaterialCard
                        key={res.id}
                        resource={res}
                        categoryTag={language === "bn" ? "ফাইনাল" : "Final"}
                        tagColor="indigo"
                        isCourseUnlocked={isResourceUnlockedForView(res)}
                        onOpenViewer={handleOpenViewer}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SECTION D: QUIZ / CLASS TEST (CT) */}
            {(activeTab === "ALL" || activeTab === "QUIZ") && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-purple-600" />
                    <span>{language === "bn" ? "কুইজ ও ক্লাস টেস্ট (CT)" : "Quiz & Class Test (CT) Papers"}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400">
                      {quizCTs.length}
                    </span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {language === "bn" ? "সেমিস্টার কুইজ ও ক্লাস টেস্ট সলিউশন" : "Semester Quizzes, Spot Tests & Questions"}
                  </span>
                </div>

                {quizCTs.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                    {language === "bn" ? "এখনও কোনো কুইজ বা ক্লাস টেস্ট প্রশ্ন আপলোড করা হয়নি।" : "No quiz or class test papers uploaded yet."}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {quizCTs.map((res) => (
                      <MaterialCard
                        key={res.id}
                        resource={res}
                        categoryTag={language === "bn" ? "কুইজ / সিটি" : "Quiz / CT"}
                        tagColor="purple"
                        isCourseUnlocked={isResourceUnlockedForView(res)}
                        onOpenViewer={handleOpenViewer}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SECTION E: DOC FILE NOTES */}
            {(activeTab === "ALL" || activeTab === "DOC_NOTE") && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-600" />
                    <span>{language === "bn" ? "ডক ফাইল নোট" : "Doc File Notes"}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400">
                      {docNotes.length}
                    </span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {language === "bn" ? "ওয়ার্ড ফাইল (.docx), লেকচার ড্রাফট ও এডিটেবল নোটস" : "Editable Word (.docx) Lecture Guides, Summaries & Outlines"}
                  </span>
                </div>

                {docNotes.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                    {language === "bn" ? "এখনও কোনো ডক ফাইল নোট আপলোড করা হয়নি।" : "No doc file notes uploaded yet."}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {docNotes.map((res) => (
                      <MaterialCard
                        key={res.id}
                        resource={res}
                        categoryTag={language === "bn" ? "ডক ফাইল নোট" : "Doc File Note"}
                        tagColor="cyan"
                        isCourseUnlocked={isResourceUnlockedForView(res)}
                        onOpenViewer={handleOpenViewer}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* Pro Tip Box */}
        <div className="p-5 rounded-3xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 flex items-start gap-3 text-xs">
          <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold text-amber-900 dark:text-amber-200">
              {isLabCourse ? t("tip.labTitle", "Lab Exam Preparation Tip") : t("tip.theoryTitle", "Exam Preparation Tip")}
            </p>
            <p className="text-amber-800/90 dark:text-amber-300 mt-0.5 leading-relaxed">
              {isLabCourse ? t("tip.labText") : t("tip.theoryText")}
            </p>
          </div>
        </div>
      </div>

      {/* 5. STUDENT REVIEWS & COURSE DECISION GUIDE */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
        
        {/* Header with Title and "Write Course Review" Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span>{t("reviews.title", "Course Feedback")}</span>
            </h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              {reviewCount > 0 
                ? `${reviewCount} ${reviewCount === 1 ? "Course Evaluation" : "Course Evaluations"} • Average ${avgRating} ⭐ ${recommendPercent !== null ? `(${recommendPercent}% Recommended)` : ""}`
                : (language === "bn" ? "ওপেন ক্রেডিট সিস্টেমে এই কোর্সটি কখন নেওয়া উচিত—জুনিয়রদের পরামর্শ দিন" : "Senior guidance on when to take this course under SEU's open credit curriculum")}
            </p>
          </div>

          <button
            onClick={() => {
              if (!isAuthenticated) {
                setShowAuthModal(true);
                return;
              }
              setShowReviewModal(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 hover:scale-105 transition-all shrink-0"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>{language === "bn" ? "কোর্স রিভিউ লিখুন" : "Write Course Review"}</span>
          </button>
        </div>

        {/* DECISION MATRIX: "When Should You Take This Course? (Open Credit Sequence Guide)" */}
        {(() => {
          const advice = getEnrollmentAdvice(isLabCourse);
          return (
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-slate-950 dark:to-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🎯</span>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{language === "bn" ? "এই কোর্সটি কখন নেওয়া উচিত? (ওপেন ক্রেডিট সিকোয়েন্সিং গাইড)" : "When Should You Take This Course? (Open Credit Sequence Guide)"}</span>
                      {reviewCount > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20">
                          {language === "bn" ? `সকল (${reviewCount}) রিভিউ হতে হিসাবকৃত` : `Calculated from all ${reviewCount} review${reviewCount > 1 ? 's' : ''}`}
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                      {advice.verdictTitle} {reviewCount > 0 && `• ${timingPercent}% ${language === "bn" ? "ঐক্যমত" : "Consensus"}`}
                    </p>
                  </div>
                </div>

                {recommendPercent !== null && (
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800 flex items-center gap-1.5 shadow-sm">
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>{recommendPercent}% {language === "bn" ? "শিক্ষার্থী নেওয়ার পক্ষে" : "Would Recommend"}</span>
                  </span>
                )}
              </div>

              {/* Actionable Open Credit Advice for juniors */}
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {advice.adviceText}
              </p>

              {/* 4-Metric Grid (Difficulty, Workload Demand, Recommended Timing, Course Rating) calculated from all reviews */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-center text-xs">
                {/* Difficulty */}
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    {language === "bn" ? "কাঠিন্য" : "Difficulty"}
                  </span>
                  {reviewCount > 0 && dynamicDifficulty ? (
                    <>
                      <span className="font-extrabold text-amber-600 dark:text-amber-400 block mt-0.5 truncate">
                        {dynamicDifficulty}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        {diffPercent}% {language === "bn" ? "শিক্ষার্থীর মত" : "consensus"}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-bold text-slate-400 dark:text-slate-500 block mt-0.5">
                        {language === "bn" ? "মূল্যায়ন নেই" : "Not Rated"}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                        {language === "bn" ? "কোনো রিভিউ নেই" : "No evaluations yet"}
                      </span>
                    </>
                  )}
                </div>

                {/* Workload Demand */}
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    {language === "bn" ? "পড়ার চাপ" : "Workload Demand"}
                  </span>
                  {reviewCount > 0 && dynamicWorkload ? (
                    <>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 block mt-0.5 truncate">
                        {dynamicWorkload}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        {workloadPercent}% {language === "bn" ? "শিক্ষার্থীর মত" : "consensus"}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-bold text-slate-400 dark:text-slate-500 block mt-0.5">
                        {language === "bn" ? "মূল্যায়ন নেই" : "Not Rated"}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                        {language === "bn" ? "কোনো রিভিউ নেই" : "No evaluations yet"}
                      </span>
                    </>
                  )}
                </div>

                {/* Recommended Timing */}
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    {language === "bn" ? "উপযুক্ত সময়" : "Recommended Timing"}
                  </span>
                  {reviewCount > 0 ? (
                    <>
                      <span className="font-extrabold text-purple-600 dark:text-purple-400 block mt-0.5 truncate">
                        {advice.timingLabel}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        {timingPercent}% {language === "bn" ? "শিক্ষার্থীর মত" : "consensus"}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-bold text-slate-700 dark:text-slate-300 block mt-0.5 truncate">
                        {course?.semester ? (language === "bn" ? `সেমিস্টার ${course.semester}` : `Semester ${course.semester}`) : "—"}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                        {course?.semester ? (language === "bn" ? "সিলেবাস অনুসারে" : "Curriculum Sequence") : (language === "bn" ? "কোনো রিভিউ নেই" : "No evaluations yet")}
                      </span>
                    </>
                  )}
                </div>

                {/* Course Rating */}
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    {language === "bn" ? "কোর্স রেটিং" : "Course Rating"}
                  </span>
                  {reviewCount > 0 && avgRating ? (
                    <>
                      <span className="font-extrabold text-amber-500 block mt-0.5 truncate flex items-center justify-center gap-1">
                        {avgRating} / 5.0 <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        {reviewCount} {language === "bn" ? "টি রিভিউ হতে" : reviewCount > 1 ? "reviews" : "review"}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-bold text-slate-400 dark:text-slate-500 block mt-0.5 flex items-center justify-center gap-1">
                        — / 5.0 <Star className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                        {language === "bn" ? "কোনো রেটিং নেই" : "No ratings yet"}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Existing Reviews Feed */}
        {reviewCount === 0 ? (
          <div className="p-8 sm:p-10 rounded-3xl bg-slate-50 dark:bg-slate-950/60 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mx-auto shadow-sm">
              <Star className="w-6 h-6 fill-amber-500/20" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                {language === "bn" ? "এখনও কোনো শিক্ষার্থী রিভিউ দেয়নি" : "No Student Feedback Yet"}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                {language === "bn"
                  ? "আপনি কি ইতিমধ্যে এই কোর্সটি সম্পন্ন করেছেন? আপনার অভিজ্ঞতা ও পরামর্শ শেয়ার করুন—এটি জুনিয়রদের ওপেন ক্রেডিটে কোর্স নির্বাচন ও সেমিস্টার প্ল্যানিংয়ে সঠিক সিদ্ধান্ত নিতে সাহায্য করবে!"
                  : "Have you completed this course? Share your advice on credit workload, difficulty, and sequencing to help juniors make the right enrollment choices!"}
              </p>
            </div>
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  setShowAuthModal(true);
                  return;
                }
                setShowReviewModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              <span>{language === "bn" ? "প্রথম রিভিউটি লিখুন" : "Be the First to Review This Course"}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reviews.slice(0, 2).map((rev) => (
                <div
                  key={rev.id}
                  className="p-5 sm:p-6 rounded-2xl bg-[#0d131f] border border-slate-800 text-white shadow-xl space-y-3.5 flex flex-col justify-between"
                >
                  {/* Author Row with circular avatar, Name, Date, green Smiley face + star badge */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-blue-400">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-white truncate">
                          {rev.anonymous
                            ? (language === "bn" ? "অজ্ঞাতনামা শিক্ষার্থী" : "Anonymous Student")
                            : (rev.authorName || rev.studentName || "Student")}
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {formatReviewDate(rev.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="flex items-center text-amber-400">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3 h-3 ${
                              star <= (rev.rating || 5)
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-700"
                            }`}
                          />
                        ))}
                      </div>
                      <Smile className="w-5 h-5 text-emerald-400 shrink-0" />
                    </div>
                  </div>

                  {/* Quoted Feedback with Blue Left Border Accent */}
                  <div className="border-l-2 border-blue-500 pl-3.5 sm:pl-4 py-0.5 text-xs sm:text-sm text-slate-200 leading-relaxed font-normal flex-1">
                    &quot;{rev.comment}&quot;
                  </div>
                </div>
              ))}
            </div>

            {/* View All Reviews Button */}
            {reviewCount > 2 && (
              <button
                onClick={() => setShowAllReviewsModal(true)}
                className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>
                  {language === "bn"
                    ? `সকল কোর্স রিভিউ দেখুন (${reviewCount})`
                    : `View All Course Reviews (${reviewCount})`}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 6. WRITE COURSE REVIEW MODAL */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Star className="w-5 h-5 fill-amber-500" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {language === "bn" ? "কোর্স মূল্যায়ন ও রিভিউ" : "Course Evaluation & Feedback"}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium font-mono">
                    {code} - {course.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              {/* Already Reviewed Warning Alert */}
              {hasReviewedCourse && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                  <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      {language === "bn" ? "ইতিমধ্যে মূল্যায়ন দেওয়া হয়েছে" : "Already Evaluated"}
                    </p>
                    <p className="text-[11px] mt-0.5 opacity-90 leading-relaxed">
                      {language === "bn"
                        ? "আপনি ইতিমধ্যে এই কোর্সের জন্য রিভিউ জমা দিয়েছেন। কোর্স প্রতি একজন শিক্ষার্থী কেবল একটি রিভিউ দিতে পারেন।"
                        : "You have already submitted an evaluation for this course. Each student can evaluate a course once."}
                    </p>
                  </div>
                </div>
              )}

              {/* Instructor Selection (Optional - Which teacher did you take it with?) */}
              {course.teachers && course.teachers.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    {language === "bn" ? "কোন শিক্ষকের আন্ডারে কোর্সটি করেছিলেন? (ঐচ্ছিক)" : "Which Instructor Did You Take It With? (Optional)"}
                  </label>
                  <select
                    value={reviewTeacherId}
                    onChange={(e) => setReviewTeacherId(e.target.value ? Number(e.target.value) : "")}
                    className="w-full p-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">General / Any Assigned Faculty</option>
                    {course.teachers.map((tItem: any) => (
                      <option key={tItem.id} value={tItem.id}>
                        {tItem.name} {tItem.initial ? `[${tItem.initial}]` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Course Traits: Difficulty, Workload Demand, Recommended Timing (Open Credit) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 h-5 flex items-center whitespace-nowrap">
                    {language === "bn" ? "কাঠিন্য স্তর *" : "Difficulty *"}
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full p-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Easy">{language === "bn" ? "সহজ (Easy)" : "Easy (Light)"}</option>
                    <option value="Medium">{language === "bn" ? "মাঝারি (Medium)" : "Medium (Standard)"}</option>
                    <option value="Hard">{language === "bn" ? "কঠিন (Hard)" : "Hard (Heavy)"}</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 h-5 flex items-center whitespace-nowrap">
                    {language === "bn" ? "পড়ার চাপ *" : "Workload Demand *"}
                  </label>
                  <select
                    value={workload}
                    onChange={(e) => setWorkload(e.target.value)}
                    className="w-full p-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Moderate / Balanced">{language === "bn" ? "ভারসাম্যপূর্ণ (Balanced)" : "Moderate / Balanced"}</option>
                    <option value="Heavy Workload">{language === "bn" ? "অতিরিক্ত চাপ (Heavy)" : "Heavy Workload"}</option>
                    <option value="Light Effort">{language === "bn" ? "হালকা চাপ (Light)" : "Light Effort"}</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 h-5 flex items-center whitespace-nowrap">
                    {language === "bn" ? "উপযুক্ত সময় *" : "Recommended Timing *"}
                  </label>
                  <select
                    value={timing}
                    onChange={(e) => setTiming(e.target.value)}
                    className="w-full p-2.5 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Early Degree (Sem 1-3)">{language === "bn" ? "সেমিস্টার ১-৩ (শুরুতে)" : "Sem 1-3 (Early)"}</option>
                    <option value="Mid Degree (Sem 4-6)">{language === "bn" ? "সেমিস্টার ৪-৬ (মাঝে)" : "Sem 4-6 (Mid)"}</option>
                    <option value="Final Year (Sem 7-8)">{language === "bn" ? "সেমিস্টার ৭-৮ (ফাইনালে)" : "Sem 7-8 (Final)"}</option>
                    <option value="Flexible Timing">{language === "bn" ? "যেকোনো সেমিস্টারে" : "Any Semester"}</option>
                  </select>
                </div>
              </div>

              {/* Overall Star Rating */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>{language === "bn" ? "সার্বিক কোর্স রেটিং *" : "Overall Course Rating *"}</span>
                  <span className="text-amber-500 font-extrabold text-xs">
                    {rating === 5 && (language === "bn" ? "৫/৫ - চমৎকার (Excellent)" : "5/5 - Excellent")}
                    {rating === 4 && (language === "bn" ? "৪/৫ - খুব ভালো (Very Good)" : "4/5 - Very Good")}
                    {rating === 3 && (language === "bn" ? "৩/৫ - ভালো (Good)" : "3/5 - Good")}
                    {rating === 2 && (language === "bn" ? "২/৫ - চলনসই (Fair)" : "2/5 - Fair")}
                    {rating === 1 && (language === "bn" ? "১/৫ - দুর্বল (Needs Improvement)" : "1/5 - Poor")}
                  </span>
                </label>
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 justify-center">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRating(val)}
                      className="p-1 hover:scale-125 transition-transform"
                    >
                      <Star
                        className={`w-7 h-7 transition-colors ${
                          rating >= val
                            ? "text-amber-500 fill-amber-500 drop-shadow-sm"
                            : "text-slate-300 dark:text-slate-600 hover:text-amber-400"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Review Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === "bn" ? "আপনার বাস্তব অভিজ্ঞতা ও পরামর্শ লিখুন *" : "Your Course Experience & Advice for Juniors *"}
                </label>
                <textarea
                  rows={3}
                  minLength={10}
                  maxLength={500}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    language === "bn"
                      ? "কোর্সের সিলেবাস কেমন, অ্যাসাইনমেন্ট ও ল্যাব রিপোর্ট কতটুকু চাপের, পরীক্ষার প্রশ্ন কেমন আসে এবং জুনিয়রদের এই সেমিস্টারে এটি নেওয়া উচিত কি না বিস্তারিত লিখুন..."
                      : "Describe syllabus depth, assignment/lab pressure, exam patterns, and whether juniors should take this course this semester..."
                  }
                  className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  required
                />
                <div className="flex items-center justify-between text-[11px] px-1">
                  {comment.length > 0 && comment.trim().length < 10 ? (
                    <span className="text-amber-500 font-medium">
                      {10 - comment.trim().length} {language === "bn" ? "অক্ষর আরও প্রয়োজন (কমপক্ষে ১০)" : "more characters needed (min 10)"}
                    </span>
                  ) : comment.trim().length >= 10 ? (
                    <span className="text-emerald-500 font-medium">
                      ✓ {language === "bn" ? "নূন্যতম দৈর্ঘ্য পূরণ হয়েছে" : "Minimum length met"}
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      {language === "bn" ? "কমপক্ষে ১০ অক্ষর" : "Minimum 10 characters"}
                    </span>
                  )}
                  <span className={`font-mono ${comment.length >= 480 ? "text-amber-500 font-bold" : "text-slate-400"}`}>
                    {comment.length}/500
                  </span>
                </div>
              </div>

              {/* Anonymous vs Named Toggle */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  {language === "bn" ? "রিভিউ পরিচিতি নির্বাচন করুন" : "Choose Identity for this Review:"}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAnonymous(true)}
                    className={`p-2.5 rounded-xl text-left border transition-all flex items-center gap-2 ${
                      isAnonymous
                        ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-700 dark:text-purple-300 font-bold shadow-sm"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <EyeOff className="w-4 h-4 shrink-0 text-purple-600 dark:text-purple-400" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">
                        {language === "bn" ? "অজ্ঞাতনামা শিক্ষার্থী" : "Anonymous Student"}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {language === "bn" ? "নাম সম্পূর্ণ গোপন থাকবে" : "Identity completely hidden"}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAnonymous(false)}
                    className={`p-2.5 rounded-xl text-left border transition-all flex items-center gap-2 ${
                      !isAnonymous
                        ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-700 dark:text-blue-300 font-bold shadow-sm"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <User className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">
                        {user?.name || (language === "bn" ? "আমার নাম দেখাও" : "Show My Name")}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {language === "bn" ? "পাবলিকলি নাম দেখাবে" : "Show name on review"}
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {language === "bn" ? "বাতিল" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={submittingReview || hasReviewedCourse}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingReview
                    ? (language === "bn" ? "জমা হচ্ছে..." : "Submitting...")
                    : hasReviewedCourse
                    ? (language === "bn" ? "ফিডব্যাক সম্পন্ন হয়েছে" : "Already Evaluated")
                    : (language === "bn" ? "কোর্স ফিডব্যাক জমা দিন" : "Submit Course Feedback")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. VIEW ALL COURSE REVIEWS MODAL */}
      {showAllReviewsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Star className="w-5 h-5 fill-amber-500" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {language === "bn" ? "সকল কোর্স রিভিউ ও ফিডব্যাক" : "All Course Reviews & Feedback"} ({reviews.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    {code} - {course.title} • {language === "bn" ? `গড় রেটিং ${avgRating} ⭐` : `Average Rating ${avgRating} ⭐`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAllReviewsModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Reviews List matching media_1793343309179_a0fafd75.png */}
            <div className="overflow-y-auto space-y-6 pr-1 flex-1">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-5 rounded-2xl bg-[#0d131f] border border-slate-800 text-white shadow-lg space-y-3.5"
                >
                  {/* Author Row with circular avatar, Name, Date, green Smiley face + star badge */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-blue-400">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-white truncate">
                          {rev.anonymous
                            ? (language === "bn" ? "অজ্ঞাতনামা শিক্ষার্থী" : "Anonymous Student")
                            : (rev.authorName || rev.studentName || "Student")}
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {formatReviewDate(rev.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="flex items-center text-amber-400">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3 h-3 ${
                              star <= (rev.rating || 5)
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-700"
                            }`}
                          />
                        ))}
                      </div>
                      <Smile className="w-5 h-5 text-emerald-400 shrink-0" />
                    </div>
                  </div>

                  {/* Quoted Feedback with Blue Left Border Accent */}
                  <div className="border-l-2 border-blue-500 pl-3.5 sm:pl-4 py-0.5 text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
                    &quot;{rev.comment}&quot;
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400">
                {language === "bn" ? "প্রশাসক দ্বারা অনুমোদিত রিভিউ প্রদর্শিত হচ্ছে" : "Verified & approved reviews only"}
              </span>
              <button
                onClick={() => setShowAllReviewsModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {language === "bn" ? "বন্ধ করুন" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OFFLINE STUDY PACK (ZIP) DISABLED SECURITY NOTICE MODAL */}
      {showOfflinePackSecurityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#0c1427] border border-amber-500/30 p-6 sm:p-7 shadow-2xl space-y-5 text-center relative overflow-hidden">
            {/* Ambient decorative glow */}
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowOfflinePackSecurityModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Security Icon */}
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner">
              <ShieldAlert className="w-7 h-7" />
            </div>

            {/* Header & Badges */}
            <div className="space-y-1.5">
              <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {language === "bn" ? "নিরাপত্তা নোটিশ • সাময়িক স্থগিত" : "Security Notice • Temporarily Disabled"}
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {language === "bn" ? "অফলাইন স্টাডি প্যাক (ZIP) স্থগিত" : "Offline Study Pack (ZIP) Disabled"}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {language === "bn"
                  ? "শিক্ষার্থীদের ডেটা সুরক্ষা ও সার্ভার নিরাপত্তা নিশ্চিত করতে অফলাইন স্টাডি প্যাক (সব ফাইল এক ক্লিকে জিপ ডাউনলোড) সেবাটি সাময়িকভাবে বন্ধ রাখা হয়েছে।"
                  : "For security purposes and platform data integrity, the offline study pack (1-click full ZIP archive download) service is temporarily disabled."}
              </p>
            </div>

            {/* Reassurance Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-left space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{language === "bn" ? "অনলাইনে সম্পূর্ণ অ্যাক্সেস চালু রয়েছে" : "Online Reading Remains 100% Active"}</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed pl-6">
                {language === "bn"
                  ? "কোর্সের সমস্ত লেকচার হ্যান্ডনোট, মিডটার্ম ও ফাইনাল পরীক্ষার প্রশ্নপত্র এবং ল্যাব শিট আপনি সরাসরি ওয়েবসাইটে কোনো সীমাবদ্ধতা ছাড়াই পড়তে ও অনুশীলন করতে পারবেন।"
                  : "You can freely view, read, and study all lecture notes, exam question papers, and lab manuals directly in the NoteLagbe website viewer anytime."}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowOfflinePackSecurityModal(false)}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                {language === "bn" ? "বুঝেছি, ওয়েবসাইটে পড়ব" : "Got it, Browse Online"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <PDFViewerModal
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        resource={selectedResource}
        courseCode={code}
        isUnlocked={Boolean(selectedResource && isResourceUnlockedForView(selectedResource))}
        onUnlockedSuccess={loadCourseData}
      />

      <CheatSheetModal
        isOpen={cheatSheetOpen}
        onClose={() => setCheatSheetOpen(false)}
        courseCode={code}
      />
    </div>
  );
}

// Reusable Clean Academic Material Card
function MaterialCard({
  resource,
  categoryTag,
  tagColor,
  isCourseUnlocked,
  onOpenViewer,
}: {
  resource: any;
  categoryTag: string;
  tagColor: "emerald" | "blue" | "indigo" | "amber" | "teal" | "cyan" | "purple" | "rose";
  isCourseUnlocked: boolean;
  onOpenViewer: (r: any) => void;
}) {
  const { language } = useLanguage();
  const colorStyles: Record<string, string> = {
    emerald: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400",
    blue: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400",
    indigo: "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400",
    amber: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400",
    teal: "bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-400",
    cyan: "bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400",
    purple: "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400",
    rose: "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400",
  };

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        {/* Badge Header */}
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${colorStyles[tagColor] || colorStyles.blue}`}>
            {categoryTag}
          </span>

          <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
            {resource.semesterName || "Fall 2026"}
          </span>
        </div>

        {/* Title */}
        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-snug line-clamp-2">
          {resource.title}
        </h4>

        {/* Teacher Association with Name + [Initial] */}
        <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs">
          <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-[10px] flex items-center justify-center shrink-0">
            {resource.teacher?.initial || "FAC"}
          </div>
          <div className="truncate">
            <p className="font-bold text-slate-800 dark:text-slate-200 truncate text-[11px]">
              {resource.teacher ? `${resource.teacher.name} ${resource.teacher.initial ? `[${resource.teacher.initial}]` : ""}` : (language === "bn" ? "ডিপার্টমেন্ট শিক্ষক" : "Department Faculty")}
            </p>
            <p className="text-[10px] text-slate-400">{language === "bn" ? "শিক্ষক" : "Instructor"}</p>
          </div>
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <span className="text-[10px] text-slate-400 font-mono">
          {resource.downloadsCount || 0} {language === "bn" ? "ভিউ" : "views"}
        </span>

        <div className="flex items-center gap-2">
          {isCourseUnlocked || resource.fileUrl ? (
            resource.type === "PROJECT_LINK" || resource.fileUrl?.includes("github.com") ? (
              <a
                href={resource.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-1.5 px-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-1.5 shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{language === "bn" ? "প্রজেক্ট লিংক" : "Open Project"}</span>
              </a>
            ) : resource.type === "DOC_NOTE" || resource.fileUrl?.match(/\.(doc|docx|odt|txt|rtf)$/i) ? (
              <button
                type="button"
                onClick={async () => {
                  try {
                    const extMatch = resource.fileUrl?.match(/\.(doc|docx|odt|txt|rtf)(?:\?|$)/i);
                    const ext = extMatch ? extMatch[1].toLowerCase() : "docx";
                    const safeBase = (resource.title || "document").replace(/[^a-z0-9._-]+/gi, "_");
                    await api.resources.downloadFile(
                      resource.id,
                      resource.fileName || `${safeBase}.${ext}`
                    );
                    void api.resources.trackDownload(resource.id).catch(() => {});
                  } catch (err: any) {
                    toast.error(
                      err?.message ||
                        (language === "bn" ? "ডক ফাইল ডাউনলোড ব্যর্থ হয়েছে" : "Failed to download document")
                    );
                  }
                }}
                className="py-1.5 px-3 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{language === "bn" ? "ডক ফাইল" : "Download Doc"}</span>
              </button>
            ) : (
              <button
                onClick={() => onOpenViewer(resource)}
                className="py-1.5 px-3 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{language === "bn" ? "পিডিএফ দেখুন" : "Preview PDF"}</span>
              </button>
            )
          ) : (
            <button
              onClick={() => onOpenViewer(resource)}
              className="py-1.5 px-3 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span>{language === "bn" ? "আনলক" : "Unlock"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
