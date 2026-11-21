"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";
import { useDataSync } from "@/lib/sync";
import { TeacherDetailSkeleton } from "@/components/skeletons/CardSkeletons";
import teachersDirectoryData from "@/data/teachers_directory.json";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  BookOpen, 
  ArrowLeft,
  ArrowRight, 
  Award, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileQuestion,
  ExternalLink,
  Upload,
  Sparkles,
  Star,
  Smile,
  ThumbsUp,
  Info,
  Lightbulb,
  CheckCircle2,
  Lock,
  Layers,
  GraduationCap,
  MessageSquarePlus,
  HelpCircle,
  EyeOff,
  X
} from "lucide-react";
import PDFViewerModal from "@/components/PDFViewerModal";
import FacultyAvatar from "@/components/FacultyAvatar";
import { formatSemesterDisplay } from "@/lib/academicSemester";
import { useAuth } from "@/context/AuthContext";
import { notifyDataChanged } from "@/lib/sync";
import { toast } from "sonner";

function sortTeacherCoursesNaturally(teacherCourses: any[]): any[] {
  return [...teacherCourses].sort((a, b) => {
    const codeA = (a.course?.code || a.code || "").toUpperCase().trim();
    const codeB = (b.course?.code || b.code || "").toUpperCase().trim();

    const matchA = codeA.match(/^([A-Z]+)(\d+)(.*)$/);
    const matchB = codeB.match(/^([A-Z]+)(\d+)(.*)$/);

    if (matchA && matchB) {
      const deptA = matchA[1];
      const deptB = matchB[1];
      const numA = parseInt(matchA[2], 10);
      const numB = parseInt(matchB[2], 10);
      const suffixA = matchA[3];
      const suffixB = matchB[3];

      if (deptA === "CSE" && deptB !== "CSE") return -1;
      if (deptA !== "CSE" && deptB === "CSE") return 1;
      if (deptA !== deptB) return deptA.localeCompare(deptB);
      if (numA !== numB) return numA - numB;
      return suffixA.localeCompare(suffixB);
    }
    return codeA.localeCompare(codeB, undefined, { numeric: true });
  });
}

function sortResourcesDescending(list: any[]): any[] {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => {
    // 1. Creation time (newest upload first)
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (timeA !== timeB && timeA > 0 && timeB > 0) {
      return timeB - timeA;
    }
    // 2. Sequential ID (higher ID = uploaded later)
    const idA = typeof a.id === "number" ? a.id : Number(a.id) || 0;
    const idB = typeof b.id === "number" ? b.id : Number(b.id) || 0;
    if (idA !== idB && idA > 0 && idB > 0) {
      return idB - idA;
    }
    // 3. Academic Year descending (e.g. 2026 > 2025 > 2024 > 2023)
    const yearA = Number(a.academicYear) || 0;
    const yearB = Number(b.academicYear) || 0;
    if (yearA !== yearB) {
      return yearB - yearA;
    }
    // 4. Semester season priority: Fall > Summer > Spring
    const getSemesterWeight = (s?: string) => {
      if (!s) return 0;
      const lower = s.toLowerCase();
      if (lower.includes("fall")) return 3;
      if (lower.includes("summer")) return 2;
      if (lower.includes("spring")) return 1;
      return 0;
    };
    const semWeightA = getSemesterWeight(a.semesterName);
    const semWeightB = getSemesterWeight(b.semesterName);
    if (semWeightA !== semWeightB) {
      return semWeightB - semWeightA;
    }
    return 0;
  });
}

export default function TeacherDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params?.id);
  const { language, t } = useLanguage();
  const { user, isAuthenticated, setShowAuthModal } = useAuth();
  const isAdmin = Boolean(
    user &&
    (user.role === "ROLE_ADMIN" || user.role === "ROLE_SUPER_ADMIN" || user.role === "ROLE_MANAGER")
  );

  // Instant 0ms Pre-population from client storage or verified SEU faculty directory
  const [teacher, setTeacher] = useState<any>(() => {
    if (!id) return null;
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("notelagbe_cached_teachers");
        if (cached) {
          const list = JSON.parse(cached);
          const found = list.find((t: any) => String(t.id) === String(id));
          if (found) return found;
        }
      } catch {}
    }
    const fromDirectory = (teachersDirectoryData as any[]).find((t: any) => String(t.id) === String(id));
    return fromDirectory || null;
  });

  const [courses, setCourses] = useState<any[]>(() => {
    if (!id || typeof window === "undefined") return [];
    try {
      const cached = localStorage.getItem(`notelagbe_tch_courses_${id}`);
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });

  const [resources, setResources] = useState<any[]>(() => {
    if (!id || typeof window === "undefined") return [];
    try {
      const cached = localStorage.getItem(`notelagbe_tch_res_${id}`);
      if (cached) return sortResourcesDescending(JSON.parse(cached));
    } catch {}
    return [];
  });

  const [reviews, setReviews] = useState<any[]>(() => {
    if (!id || typeof window === "undefined") return [];
    try {
      const cached = localStorage.getItem(`notelagbe_tch_rev_${id}`);
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });

  // Zero-latency: If teacher details exist in directory or cache, start without full-page blocking
  const [loading, setLoading] = useState<boolean>(() => !teacher);
  const [imageFailed, setImageFailed] = useState(false);

  // Review & Rating Modal States
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showAllReviewsModal, setShowAllReviewsModal] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newCourseCode, setNewCourseCode] = useState("");
  const [newPersonality, setNewPersonality] = useState("Friendly");
  const [newMarking, setNewMarking] = useState("Fair & Generous");
  const [newDifficulty, setNewDifficulty] = useState("Medium");
  const [newComment, setNewComment] = useState("");
  const [newIsAnonymous, setNewIsAnonymous] = useState(true);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hasReviewedCourse, setHasReviewedCourse] = useState(false);
  const [checkingReviewStatus, setCheckingReviewStatus] = useState(false);

  // Layout balance controls
  const [showAllCourses, setShowAllCourses] = useState(true);
  const [courseFilter, setCourseFilter] = useState<"ALL" | "THEORY" | "LAB" | "NOTE" | "QUIZ" | "EXAM">("ALL");
  const [expandedCourseMap, setExpandedCourseMap] = useState<Record<string, boolean>>({});

  // PDF Preview Modal
  const [activeResource, setActiveResource] = useState<any | null>(null);

  const loadTeacherData = useCallback((isSilent = false) => {
    if (!id) return;
    if (!isSilent && !teacher) {
      setLoading(true);
    }
    Promise.all([
      api.teachers.getById(id).catch(() => null),
      api.teachers.getCourses(id).catch(() => []),
      api.resources.getByTeacher(id).catch(() => []),
      api.reviews.getByTeacher(id).catch(() => []),
    ])
      .then(([tData, cData, rData, revData]) => {
        if (tData) setTeacher(tData);

        // Strict safety filter: only include courses that have authentic uploaded materials in the database
        const realCourses = (cData || []).filter((c: any) => {
          const courseCode = (c.course?.code || c.code || "").toLowerCase();
          const hasResource = (rData || []).some((r: any) => (r.course?.code || "").toLowerCase() === courseCode);
          return hasResource;
        });

        // Also dynamically include courses with approved materials if not already in realCourses
        const courseMap = new Map<string, any>();
        realCourses.forEach((c: any) => {
          const code = (c.course?.code || c.code || "").toUpperCase();
          if (code) courseMap.set(code, c);
        });
        (rData || []).forEach((r: any) => {
          const code = (r.course?.code || "").toUpperCase();
          if (code && !courseMap.has(code) && r.course) {
            courseMap.set(code, {
              id: `mat-${r.id}`,
              course: r.course,
              teacher: tData || teacher,
              section: "General",
              scheduleInfo: null,
            });
          }
        });

        const sortedCourses = sortTeacherCoursesNaturally(Array.from(courseMap.values()));
        const sortedResources = sortResourcesDescending(rData || []);
        setCourses(sortedCourses);
        setResources(sortedResources);
        setReviews(revData || []);

        // Cache for instant 0ms retrieval on next visit
        try {
          localStorage.setItem(`notelagbe_tch_courses_${id}`, JSON.stringify(sortedCourses));
          if (rData) localStorage.setItem(`notelagbe_tch_res_${id}`, JSON.stringify(sortedResources));
          if (revData) localStorage.setItem(`notelagbe_tch_rev_${id}`, JSON.stringify(revData));
        } catch {}

        // Auto-expand the first course with materials by default
        if (sortedCourses.length > 0) {
          const firstCode = sortedCourses[0].course?.code || sortedCourses[0].code || "";
          setNewCourseCode((prev) => prev || firstCode);
          const firstWithRes = sortedCourses.find((c: any) => 
            rData?.some((r: any) => r.course?.code?.toLowerCase() === c.course?.code?.toLowerCase())
          ) || sortedCourses[0];
          if (firstWithRes?.course?.code) {
            setExpandedCourseMap((prev) => Object.keys(prev).length > 0 ? prev : { [firstWithRes.course.code]: true });
          }
        }
      })
      .finally(() => setLoading(false));
  }, [id, teacher]);

  useEffect(() => {
    loadTeacherData(true);
  }, [loadTeacherData]);

  // Enterprise Live Sync: Instantly updates teacher info, courses, and materials
  useDataSync(() => {
    loadTeacherData(true);
  });

  const toggleCourseExpand = (code: string) => {
    setExpandedCourseMap((prev) => {
      const isCurrentlyExpanded = courseFilter !== "ALL"
        ? (prev[code] !== false)
        : Boolean(prev[code]);
      return {
        ...prev,
        [code]: !isCurrentlyExpanded,
      };
    });
  };

  const getMarkingColor = (marking?: string) => {
    if (!marking) return "text-emerald-400";
    const m = marking.toLowerCase();
    if (m.includes("strict")) return "text-rose-400";
    if (m.includes("fair") || m.includes("generous") || m.includes("lenient")) return "text-emerald-400";
    if (m.includes("average") || m.includes("balanced")) return "text-sky-400";
    return "text-emerald-400";
  };

  const getDifficultyColor = (diff?: string) => {
    if (!diff) return "text-amber-400";
    const d = diff.toLowerCase();
    if (d.includes("easy") || d.includes("light")) return "text-emerald-400";
    if (d.includes("hard") || d.includes("heavy")) return "text-rose-400";
    return "text-amber-400";
  };

  // Duplicate Review Check per student per course
  useEffect(() => {
    if (isAuthenticated && newCourseCode && newCourseCode.trim()) {
      setCheckingReviewStatus(true);
      api.reviews.check(newCourseCode.trim())
        .then((res) => {
          setHasReviewedCourse(Boolean(res?.hasReviewed));
        })
        .catch(() => {
          setHasReviewedCourse(false);
        })
        .finally(() => setCheckingReviewStatus(false));
    } else {
      setHasReviewedCourse(false);
    }
  }, [newCourseCode, isAuthenticated]);

  // Dynamic Rating Calculations based exclusively on real student reviews
  const reviewCount = reviews.length;
  const avgRating = reviewCount > 0
    ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / reviewCount).toFixed(1)
    : null;

  // Helper to dynamically calculate most frequent trait from student reviews
  const getMode = (arr: (string | undefined | null)[]): string | null => {
    const valid = arr.filter((x): x is string => Boolean(x && x.trim()));
    if (valid.length === 0) return null;
    const freq: Record<string, number> = {};
    let max = 0;
    let mode = valid[0];
    for (const item of valid) {
      freq[item] = (freq[item] || 0) + 1;
      if (freq[item] > max) {
        max = freq[item];
        mode = item;
      }
    }
    return mode;
  };

  const dynamicPersonality = getMode(reviews.map((r) => r.personality));
  const dynamicMarking = getMode(reviews.map((r) => r.marking));
  const dynamicDifficulty = getMode(reviews.map((r) => r.difficulty));
  const dynamicCourse = getMode(reviews.map((r) => r.courseCode || r.course?.code));

  // Date formatting matching M/D/YYYY (e.g. 4/16/2026)
  const formatReviewDate = (dateStr?: string) => {
    if (!dateStr) return "4/16/2026";
    try {
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    } catch {
      return "4/16/2026";
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    const cleanCode = newCourseCode.trim().toUpperCase();
    if (!cleanCode) {
      toast.error(language === "bn" ? "কোর্স কোড নির্বাচন করুন" : "Please select or enter the course code");
      return;
    }
    if (hasReviewedCourse) {
      toast.error(
        language === "bn"
          ? "আপনি ইতিমধ্যে এই কোর্সের জন্য রিভিউ দিয়েছেন। কোর্স প্রতি একজন শিক্ষার্থী কেবল একটি রিভিউ দিতে পারেন।"
          : "You have already submitted an evaluation for this course. Only one review per course is allowed."
      );
      return;
    }
    const cleanComment = newComment.trim();
    if (cleanComment.length < 10) {
      toast.error(language === "bn" ? "কমপক্ষে ১০ অক্ষরের রিভিউ লিখুন" : "Please enter at least 10 characters in your review");
      return;
    }
    if (cleanComment.length > 500) {
      toast.error(language === "bn" ? "রিভিউ ৫০০ অক্ষরের বেশি হতে পারবে না" : "Review comment cannot exceed 500 characters");
      return;
    }

    setSubmittingReview(true);
    try {
      await api.reviews.submit({
        courseCode: cleanCode,
        teacherId: id,
        rating: newRating,
        comment: cleanComment,
        personality: newPersonality,
        marking: newMarking,
        difficulty: newDifficulty,
        anonymous: newIsAnonymous,
      });

      toast.success(
        language === "bn"
          ? "রিভিউ সাবমিট হয়েছে! অ্যাডমিন যাচাই করার পর এটি প্রদর্শিত হবে।"
          : "Review submitted! It will appear publicly once approved by an admin."
      );
      setShowReviewModal(false);
      setNewComment("");
      setNewRating(5);
      setHasReviewedCourse(true);

      // Re-fetch approved reviews
      const revData = await api.reviews.getByTeacher(id);
      setReviews(revData || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading && !teacher) {
    return <TeacherDetailSkeleton />;
  }

  if (!teacher) {
    return (
      <div className="py-32 text-center text-slate-400">
        <p className="text-base font-bold">{t("faculty.notFound", "Faculty Profile Not Found")}</p>
        <Link href="/teachers" className="text-xs text-blue-600 hover:underline mt-2 inline-block">
          &larr; Back to Faculty Directory
        </Link>
      </div>
    );
  }

  const isValidHttpImage = teacher.image && 
    (teacher.image.startsWith("http://") || teacher.image.startsWith("https://")) && 
    !teacher.image.includes("avatar_blue") && 
    !imageFailed;

  // Material category identification predicates
  const isNoteResource = (type?: string) =>
    type === "NOTE" || type === "LAB_HAND_NOTE" || type === "DOC_NOTE";
  const isQuizResource = (type?: string) =>
    type === "QUIZ_CT" || type === "LAB_QUIZ";
  const isExamResource = (type?: string) =>
    type === "MID_QUESTION" || type === "FINAL_QUESTION" || type === "LAB_FINAL";

  // Total material counts across all courses of this teacher
  const noteMaterialsCount = resources.filter((r) => isNoteResource(r.type)).length;
  const quizMaterialsCount = resources.filter((r) => isQuizResource(r.type)).length;
  const examMaterialsCount = resources.filter((r) => isExamResource(r.type)).length;

  // Course filtering & counts
  const theoryCount = courses.filter((c) => !c.course?.lab).length;
  const labCount = courses.filter((c) => c.course?.lab).length;

  const noteCoursesCount = courses.filter((tc) => {
    const code = tc.course?.code?.toLowerCase();
    return resources.some(
      (r) => r.course?.code?.toLowerCase() === code && isNoteResource(r.type)
    );
  }).length;

  const quizCoursesCount = courses.filter((tc) => {
    const code = tc.course?.code?.toLowerCase();
    return resources.some(
      (r) => r.course?.code?.toLowerCase() === code && isQuizResource(r.type)
    );
  }).length;

  const examCoursesCount = courses.filter((tc) => {
    const code = tc.course?.code?.toLowerCase();
    return resources.some(
      (r) => r.course?.code?.toLowerCase() === code && isExamResource(r.type)
    );
  }).length;

  const filteredCourses = courses.filter((tc) => {
    const code = tc.course?.code?.toLowerCase();
    if (courseFilter === "THEORY") return !tc.course?.lab;
    if (courseFilter === "LAB") return tc.course?.lab;
    if (courseFilter === "NOTE") {
      return resources.some(
        (r) => r.course?.code?.toLowerCase() === code && isNoteResource(r.type)
      );
    }
    if (courseFilter === "QUIZ") {
      return resources.some(
        (r) => r.course?.code?.toLowerCase() === code && isQuizResource(r.type)
      );
    }
    if (courseFilter === "EXAM") {
      return resources.some(
        (r) => r.course?.code?.toLowerCase() === code && isExamResource(r.type)
      );
    }
    return true;
  });

  const displayedCourses = showAllCourses ? filteredCourses : filteredCourses.slice(0, 3);
  const remainingCount = filteredCourses.length - displayedCourses.length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-10">
      
      {/* Back Navigation Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              router.push("/teachers");
            }
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 shadow-xs transition-all cursor-pointer group active:scale-95"
          title={language === "bn" ? "পূর্ববর্তী পেজে ফিরে যান" : "Back to Faculty Directory"}
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>{language === "bn" ? "ফ্যাকাল্টি তালিকায় ফিরে যান" : "Back to Faculty Directory"}</span>
        </button>

        {/* Breadcrumb indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
          <Link href="/teachers" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            {language === "bn" ? "শিক্ষকবৃন্দ" : "Faculty"}
          </Link>
          <span>/</span>
          <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{teacher.name}</span>
        </div>
      </div>
      
      {/* 1. FACULTY HEADER PROFILE CARD */}
      <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
        
        {/* Avatar with safe image handling and vector silhouette fallback */}
        <FacultyAvatar
          image={teacher.image}
          name={teacher.name}
          initial={teacher.initial}
          designation={teacher.designation}
          size="xl"
        />

        <div className="space-y-3 flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {teacher.name}
            </h1>
            {teacher.initial && (
              <span className="text-sm font-mono font-black text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-2.5 py-0.5 rounded-lg border border-purple-200/60 dark:border-purple-800/60">
                [{teacher.initial}]
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs">
            <span className="font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              CSE Department
            </span>
            <span className="font-semibold text-slate-500 dark:text-slate-400">
              • Southeast University
            </span>
            <span className="font-semibold text-purple-600 dark:text-purple-400">
              • {teacher.designation || "Faculty Member"}
            </span>
          </div>

          {/* Quick Clickable Course Badges (Direct links to course pages) */}
          {courses && courses.length > 0 && (
            <div className="pt-1.5 space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {language === "bn"
                  ? "পাঠদানকৃত কোর্সসমূহ (কোর্স পেজ দেখতে ক্লিক করুন):"
                  : "Conducted Courses (Click to open Course Page):"}
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5">
                {courses.map((tc) => (
                  <Link
                    key={tc.id || tc.course?.code}
                    href={`/courses/${tc.course?.code}`}
                    className="group inline-flex items-center gap-1 font-mono text-[11px] font-bold px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
                    title={`View ${tc.course?.title} page`}
                  >
                    <span>{tc.course?.code}</span>
                    <span className="font-sans font-medium text-slate-400 group-hover:text-blue-100">
                      • {tc.course?.title}
                    </span>
                    <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-white" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 pt-3 border-t border-slate-100 dark:border-slate-800">
            <p className="flex items-center gap-2 justify-center md:justify-start">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{teacher.room || "Faculty Room, Level 6"}</span>
            </p>
            <p className="flex items-center gap-2 justify-center md:justify-start truncate">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-purple-600 dark:text-purple-400 truncate">{teacher.email || "faculty@seu.edu.bd"}</span>
            </p>
          </div>
        </div>
      </div>

      {/* 2. MAIN TWO-COLUMN LAYOUT (Sticky left column to eliminate blank space) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: REVIEWS & STICKY SUMMARY CARD                                */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24 lg:self-start">
          
          {/* Quick Academic Summary Widget */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-50/60 to-purple-50/60 dark:from-slate-900/80 dark:to-slate-800/80 border border-blue-100 dark:border-slate-800 shadow-sm space-y-3">
            <p className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4" />
              <span>{language === "bn" ? "একাডেমিক তথ্য ও সংক্ষিপ্ত বিবরণ" : "Academic Teaching Overview"}</span>
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] text-slate-400 font-bold block">
                  {language === "bn" ? "কোর্সসমূহ" : "Courses"}
                </span>
                <span className="text-lg font-black text-slate-900 dark:text-white">{courses.length}</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] text-slate-400 font-bold block">
                  {language === "bn" ? "সংরক্ষিত প্রশ্ন" : "Archived Qs"}
                </span>
                <span className="text-lg font-black text-purple-600 dark:text-purple-400">{resources.length}</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
                <span className="text-[10px] text-slate-400 font-bold block">
                  {language === "bn" ? "রেটিং" : "Rating"}
                </span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {avgRating ? `${avgRating} ⭐` : "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Student Reviews & Evaluation Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 leading-tight">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0" />
                <span>{language === "bn" ? "শিক্ষার্থীদের রিভিউ ও মূল্যায়ন" : "Student Reviews & Evaluation"}</span>
              </h2>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 block">
                {reviewCount > 0 
                  ? `${reviewCount} ${language === "bn" ? "টি রিভিউ" : (reviewCount === 1 ? "Review" : "Reviews")} • ${language === "bn" ? "গড়" : "Average"} ${avgRating} ⭐`
                  : (language === "bn" ? "কোনো রিভিউ দেওয়া হয়নি" : "No reviews yet")}
              </span>
            </div>
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  setShowAuthModal(true);
                  return;
                }
                setShowReviewModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-500/20 hover:scale-[1.03] transition-all shrink-0 cursor-pointer"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              <span>{language === "bn" ? "রিভিউ দিন" : "Write Review"}</span>
            </button>
          </div>

          {/* Student Reviews Feed (Real approved reviews only, clean empty state when no reviews) */}
          <div className="space-y-3">
            {reviewCount === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mx-auto shadow-sm">
                  <Star className="w-6 h-6 fill-amber-500/20" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    {language === "bn" ? "এখনও কোনো রিভিউ দেওয়া হয়নি" : "No Student Reviews Yet"}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                    {language === "bn"
                      ? "এই শিক্ষকের জন্য প্রথম রিভিউ দিন! আপনার মূল্যায়ন সহপাঠীদের কোর্স নির্বাচন ও পরীক্ষার প্রস্তুতিতে সাহায্য করবে।"
                      : "Be the first student to review this faculty member! Your evaluation helps peers choose courses and prepare for exams."}
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
                  <span>{language === "bn" ? "প্রথম রিভিউটি দিন" : "Be the First to Review"}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.slice(0, 2).map((rev) => (
                  <FacultyReviewCard
                    key={rev.id}
                    review={rev}
                    formattedDate={formatReviewDate(rev.createdAt)}
                    language={language}
                  />
                ))}

                {reviewCount > 2 && (
                  <button
                    onClick={() => setShowAllReviewsModal(true)}
                    className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>
                      {language === "bn"
                        ? `সকল রিভিউ দেখুন (${reviewCount})`
                        : `View All Reviews (${reviewCount})`}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: COURSES CONDUCTED & COMPACT BALANCED ARCHIVE               */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <span>{language === "bn" ? "পাঠদানকৃত কোর্স ও ম্যাটেরিয়াল আর্কাইভ" : "Courses Taught & Materials Archive"}</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {language === "bn"
                  ? "সম্পূর্ণ অ্যাকাডেমিক পেজ, হ্যান্ড নোট এবং পরীক্ষার প্রশ্ন দেখতে যেকোনো কোর্সে ক্লিক করুন।"
                  : "Click any course to open its full academic page, notes, and exam questions."}
              </p>
            </div>
            <Link
              href="/contribute"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-all shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{language === "bn" ? "ম্যাটেরিয়াল যুক্ত করুন" : "Contribute Material"}</span>
            </Link>
          </div>

          {/* Quick Filter Tabs: All, Theory, Lab, Notes, Quiz, Exams */}
          {courses.length > 0 && (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold border border-slate-200 dark:border-slate-700 flex-wrap">
                <button
                  type="button"
                  onClick={() => setCourseFilter("ALL")}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    courseFilter === "ALL"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {language === "bn" ? `সকল (${courses.length})` : `All (${courses.length})`}
                </button>
                <button
                  type="button"
                  onClick={() => setCourseFilter("THEORY")}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    courseFilter === "THEORY"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {language === "bn" ? `থিওরি (${theoryCount})` : `Theory (${theoryCount})`}
                </button>
                <button
                  type="button"
                  onClick={() => setCourseFilter("LAB")}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    courseFilter === "LAB"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {language === "bn" ? `ল্যাব (${labCount})` : `Lab (${labCount})`}
                </button>
                <button
                  type="button"
                  onClick={() => setCourseFilter("NOTE")}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    courseFilter === "NOTE"
                      ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {language === "bn" ? `হ্যান্ড নোট (${noteMaterialsCount})` : `Notes (${noteMaterialsCount})`}
                </button>
                <button
                  type="button"
                  onClick={() => setCourseFilter("QUIZ")}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    courseFilter === "QUIZ"
                      ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {language === "bn" ? `কুইজ (${quizMaterialsCount})` : `Quiz (${quizMaterialsCount})`}
                </button>
                <button
                  type="button"
                  onClick={() => setCourseFilter("EXAM")}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    courseFilter === "EXAM"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {language === "bn" ? `পরীক্ষার প্রশ্ন (${examMaterialsCount})` : `Exams (${examMaterialsCount})`}
                </button>
              </div>

              <span className="text-[11px] font-semibold text-slate-400">
                {language === "bn"
                  ? `${filteredCourses.length}টির মধ্যে ${displayedCourses.length}টি কোর্স দেখানো হচ্ছে`
                  : `Showing ${displayedCourses.length} of ${filteredCourses.length} courses`}
              </span>
            </div>
          )}

          {/* Institutional Access Notice */}
          {courses.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-start gap-2.5 text-xs">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <p className="text-blue-900 dark:text-blue-200 leading-relaxed text-[11px]">
                {language === "bn" ? (
                  <>একটি কোর্স আনলক করলে সেই কোর্সের <strong>সকল শিক্ষকের</strong> লেকচার হ্যান্ড নোট, মিডটার্ম ও ফাইনাল পরীক্ষার প্রশ্নের সম্পূর্ণ অ্যাক্সেস পাওয়া যায়।</>
                ) : (
                  <>Unlocking a course provides full access to lecture hand notes, midterm papers, and final questions across <strong>all instructors</strong> teaching that course.</>
                )}
              </p>
            </div>
          )}

          {/* Grouped Course Cards List */}
          <div className="space-y-3.5">
            {displayedCourses.length > 0 ? (
              displayedCourses.map((tc) => {
                const courseCode = tc.course?.code;
                const rawCourseResources = resources.filter(
                  (r) => r.course?.code?.toLowerCase() === courseCode?.toLowerCase()
                );

                // Sort descending: newest upload first
                const sortedCourseResources = sortResourcesDescending(rawCourseResources);

                // Filter materials according to active courseFilter
                const displayedCourseResources = sortedCourseResources.filter((r) => {
                  if (courseFilter === "NOTE") return isNoteResource(r.type);
                  if (courseFilter === "QUIZ") return isQuizResource(r.type);
                  if (courseFilter === "EXAM") return isExamResource(r.type);
                  return true;
                });

                const noteCount = rawCourseResources.filter((r) => isNoteResource(r.type)).length;
                const quizCount = rawCourseResources.filter((r) => isQuizResource(r.type)).length;
                const examCount = rawCourseResources.filter((r) => isExamResource(r.type)).length;

                // When user clicks a specific filter (NOTE, QUIZ, EXAM), auto-expand so they immediately see the filtered files
                const isExpanded = courseFilter !== "ALL"
                  ? (expandedCourseMap[courseCode] !== false)
                  : Boolean(expandedCourseMap[courseCode]);

                return (
                  <div
                    key={tc.id}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 hover:border-blue-300 dark:hover:border-blue-800 transition-all"
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-lg bg-blue-600 text-white">
                            {courseCode}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {tc.course?.lab
                              ? (language === "bn" ? "প্র্যাকটিক্যাল ল্যাব" : "Practical Lab")
                              : (language === "bn" ? "থিওরি কোর্স" : "Theory Course")}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            • {tc.course?.credits} {language === "bn" ? "ক্রেডিট" : "Credits"}
                          </span>
                          {tc.section && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50">
                              {tc.section}
                            </span>
                          )}
                        </div>
                        <h3 className="font-black text-base text-slate-900 dark:text-white leading-tight">
                          {tc.course?.title}
                        </h3>
                      </div>

                      {/* Action Buttons: Direct Course Link & Materials Accordion */}
                      <div className="flex items-center gap-2 shrink-0">
                        {displayedCourseResources.length > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleCourseExpand(courseCode)}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-all cursor-pointer"
                            title={isExpanded ? "Collapse materials" : "Expand materials"}
                          >
                            <span>
                              {courseFilter === "NOTE"
                                ? `${displayedCourseResources.length} ${language === "bn" ? "টি হ্যান্ড নোট" : "Notes"}`
                                : courseFilter === "QUIZ"
                                ? `${displayedCourseResources.length} ${language === "bn" ? "টি কুইজ" : "Quizzes"}`
                                : courseFilter === "EXAM"
                                ? `${displayedCourseResources.length} ${language === "bn" ? "টি বিগত পরীক্ষা" : "Exams"}`
                                : `${displayedCourseResources.length} ${language === "bn" ? "টি ফাইল" : "Materials"}`}
                            </span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        )}

                        <Link
                          href={`/courses/${courseCode}`}
                          className="inline-flex items-center justify-center gap-1 px-3.5 py-2 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-sm transition-all"
                        >
                          <span>{language === "bn" ? "কোর্স পেজ" : "Course Page"}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>

                    {/* Material Count Summary Badges (Notes, Quiz, Past Exams) */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {noteCount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setCourseFilter(courseFilter === "NOTE" ? "ALL" : "NOTE");
                            setExpandedCourseMap((prev) => ({ ...prev, [courseCode]: true }));
                          }}
                          className={`inline-flex items-center gap-1 font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            courseFilter === "NOTE"
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                              : "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                          }`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{noteCount} {language === "bn" ? "হ্যান্ড নোট" : "Notes"}</span>
                        </button>
                      )}
                      {quizCount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setCourseFilter(courseFilter === "QUIZ" ? "ALL" : "QUIZ");
                            setExpandedCourseMap((prev) => ({ ...prev, [courseCode]: true }));
                          }}
                          className={`inline-flex items-center gap-1 font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            courseFilter === "QUIZ"
                              ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                              : "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-500/20 hover:bg-purple-100 dark:hover:bg-purple-900/40"
                          }`}
                        >
                          <HelpCircle className="w-3 h-3" />
                          <span>{quizCount} {language === "bn" ? "কুইজ" : "Quiz"}</span>
                        </button>
                      )}
                      {examCount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setCourseFilter(courseFilter === "EXAM" ? "ALL" : "EXAM");
                            setExpandedCourseMap((prev) => ({ ...prev, [courseCode]: true }));
                          }}
                          className={`inline-flex items-center gap-1 font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            courseFilter === "EXAM"
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                              : "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                          }`}
                        >
                          <FileQuestion className="w-3 h-3" />
                          <span>{examCount} {language === "bn" ? "বিগত পরীক্ষা" : "Past Exams"}</span>
                        </button>
                      )}
                      {noteCount === 0 && quizCount === 0 && examCount === 0 && (
                        <span className="text-[11px] text-slate-400">
                          {language === "bn" ? "কোনো মেটেরিয়াল আর্কাইভ পাওয়া যায়নি" : "No archived files yet"}
                        </span>
                      )}
                    </div>

                    {/* Expandable Materials Accordion */}
                    {isExpanded && displayedCourseResources.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
                        {displayedCourseResources.map((res) => (
                          <div
                            key={res.id}
                            className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs hover:border-purple-300 dark:hover:border-purple-800 transition-all"
                          >
                            <div className="space-y-0.5 pr-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded ${
                                    res.type === "NOTE" || res.type === "LAB_HAND_NOTE"
                                      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                                      : res.type === "QUIZ_CT" || res.type === "LAB_QUIZ"
                                      ? "bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400"
                                      : res.type === "DOC_NOTE"
                                      ? "bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400"
                                      : res.type === "PROJECT_LINK"
                                      ? "bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-400"
                                      : "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400"
                                  }`}
                                >
                                  {res.type === "NOTE" || res.type === "LAB_HAND_NOTE"
                                    ? (language === "bn" ? "হ্যান্ড নোট" : "Note")
                                    : res.type === "QUIZ_CT" || res.type === "LAB_QUIZ"
                                    ? (language === "bn" ? "কুইজ" : "Quiz")
                                    : res.type === "MID_QUESTION"
                                    ? (language === "bn" ? "মিড প্রশ্ন" : "Mid Exam")
                                    : res.type === "FINAL_QUESTION"
                                    ? (language === "bn" ? "ফাইনাল প্রশ্ন" : "Final Exam")
                                    : res.type === "DOC_NOTE"
                                    ? (language === "bn" ? "ডক নোট" : "Doc Note")
                                    : res.type === "PROJECT_LINK"
                                    ? (language === "bn" ? "প্রজেক্ট" : "Project")
                                    : (language === "bn" ? "ল্যাব ফাইল" : "Lab Material")}
                                </span>
                                <span className="font-bold text-slate-900 dark:text-white truncate">
                                  {res.title}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium text-slate-600 dark:text-slate-300">
                                  {formatSemesterDisplay(res.semesterName, res.academicYear)}
                                </span>
                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                {(() => {
                                  const contributorName =
                                    res.contributorName ||
                                    (res.isStudentContributed && res.uploader?.name) ||
                                    (res.uploader?.role === "ROLE_STUDENT" && res.uploader?.name ? res.uploader.name : null);

                                  if (contributorName) {
                                    return (
                                      <Link
                                        href="/contribute#leaderboard"
                                        title={
                                          language === "bn"
                                            ? `অ্যাকাডেমিক কন্ট্রিবিউটর: ${contributorName} (শীর্ষ ৫০ কন্ট্রিবিউটর তালিকায় দেখুন)`
                                            : `Academic Contributor: ${contributorName} (View in Top 50 Academic Contributors)`
                                        }
                                        className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 hover:underline transition-all group"
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse"></span>
                                        <span className="truncate max-w-[140px] sm:max-w-[200px]">
                                          By {contributorName}
                                        </span>
                                        <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/90 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-md font-bold border border-emerald-300/50 dark:border-emerald-800/60 shadow-xs group-hover:scale-105 transition-transform">
                                          {language === "bn" ? "কন্ট্রিবিউটর" : "Contributor"}
                                        </span>
                                      </Link>
                                    );
                                  }

                                  return (
                                    <span className="text-slate-400 dark:text-slate-500 font-medium">
                                      {language === "bn" ? "ভেরিফাইড আর্কাইভ" : "Verified Archive"}
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>

                            {res.videoUrl && (
                              <a
                                href={res.videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-bold text-xs bg-red-600/10 hover:bg-red-600 text-red-600 hover:text-white dark:bg-red-500/15 dark:hover:bg-red-600 dark:text-red-400 dark:hover:text-white border border-red-500/25 transition-all shrink-0 cursor-pointer shadow-2xs"
                                title="Watch YouTube Video"
                              >
                                <span className="text-[10px] font-black">▶</span>
                                <span>{language === "bn" ? "ভিডিও" : "Video"}</span>
                              </a>
                            )}

                            <button
                              onClick={() => setActiveResource(res)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-bold text-xs shadow-sm transition-all shrink-0 cursor-pointer ${
                                res.fileUrl
                                  ? "text-white bg-purple-600 hover:bg-purple-700"
                                  : "text-slate-700 dark:text-slate-200 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600"
                              }`}
                            >
                              {!res.fileUrl && <Lock className="w-3 h-3 text-amber-500" />}
                              <span>{res.fileUrl ? (language === "bn" ? "প্রিভিউ" : "Preview") : (language === "bn" ? "লকড" : "Unlock")}</span>
                              {res.fileUrl && <ExternalLink className="w-3 h-3" />}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {isExpanded && displayedCourseResources.length === 0 && (
                      <div className="py-4 text-center text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800">
                        {language === "bn" ? "এই কোর্সে নির্বাচিত ফিল্টারের কোনো ফাইল পাওয়া যায়নি" : "No files found for this filter category in this course"}
                      </div>
                    )}
                  </div>
                );
              })
            ) : courses.length === 0 ? (
              <div className="p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-sm">
                  <BookOpen className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-black text-slate-900 dark:text-white text-base">
                    {language === "bn" ? "বর্তমানে কোনো কোর্স নির্ধারিত নেই" : "No Courses Assigned Currently"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    {language === "bn"
                      ? "প্রশাসন কর্তৃক এই শিক্ষকের জন্য এখনো কোনো কোর্স অ্যাসাইন করা হয়নি। অ্যাডমিন কোর্স অ্যাসাইন করলে তা স্বয়ংক্রিয়ভাবে এখানে প্রদর্শিত হবে।"
                      : "Administration has not assigned any active courses to this faculty member yet. When assigned by an admin, conducted course tags and archive materials will automatically appear here."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
                <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {language === "bn" ? "এই ফিল্টারের অধীনে কোনো কোর্স পাওয়া যায়নি" : "No courses found under this filter"}
                </h3>
                <button
                  onClick={() => setCourseFilter("ALL")}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800"
                >
                  {language === "bn" ? `সকল কোর্স দেখুন (${courses.length})` : `View All Courses (${courses.length})`}
                </button>
              </div>
            )}

            {/* "See More Courses" / "Show Less" Expand Button */}
            {filteredCourses.length > 3 && (
              <div className="text-center pt-2">
                <button
                  onClick={() => setShowAllCourses(!showAllCourses)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all shadow-sm active:scale-95"
                >
                  {showAllCourses ? (
                    <>
                      <span>{language === "bn" ? "কম কোর্স দেখান (শীর্ষ ৩টি)" : "Show Fewer Courses (Show Top 3)"}</span>
                      <ChevronUp className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>
                        {language === "bn"
                          ? `আরও কোর্স দেখুন (+${remainingCount}টি কোর্স)`
                          : `See More Courses (+${remainingCount} more courses)`}
                      </span>
                      <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Pro Tip Box (Mirroring seu-ratemyfaculty.onrender.com) */}
          <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 flex items-start gap-3 text-xs">
            <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-amber-900 dark:text-amber-200 text-xs">
                {language === "bn" ? "পরীক্ষার প্রস্তুতির প্রো টিপ" : "Exam Prep Pro Tip"}
              </p>
              <p className="text-amber-800/90 dark:text-amber-300 mt-0.5 leading-relaxed text-[11px]">
                {language === "bn"
                  ? `${teacher.name}-এর পরীক্ষায় ভালো ফলাফলের জন্য সাউথইস্ট ইউনিভার্সিটির সিলেবাসের পাশাপাশি বিগত বছরের প্রশ্ন ও ক্লাসের গুরুত্বপূর্ণ টপিকগুলো ভালোভাবে অনুশীলন করুন।`
                  : `Always check the Southeast University syllabus along with previous year questions to ensure you are studying relevant topics emphasized by ${teacher.name}.`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Modal Viewer */}
      {activeResource && (
        <PDFViewerModal
          isOpen={true}
          onClose={() => setActiveResource(null)}
          resource={activeResource}
          courseCode={activeResource.course?.code || "CSE"}
          isUnlocked={Boolean(activeResource.fileUrl)}
          isAdminMode={isAdmin}
          onFileUpdated={(newUrl) => {
            setActiveResource((prev: any) => (prev ? { ...prev, fileUrl: newUrl, previewUrl: newUrl } : null));
            setResources((prevList: any[]) =>
              Array.isArray(prevList)
                ? prevList.map((item) =>
                    String(item.id) === String(activeResource?.id)
                      ? { ...item, fileUrl: newUrl, previewUrl: newUrl }
                      : item
                  )
                : prevList
            );
            if (activeResource?.id) {
              notifyDataChanged("resource", "updated", activeResource.id);
            }
            if (id) {
              api.resources.getByTeacher(id).then((rData) => setResources(sortResourcesDescending(rData || [])));
            }
          }}
          onUnlockedSuccess={() => {
            if (id) {
              api.resources.getByTeacher(id).then((rData) => setResources(sortResourcesDescending(rData || [])));
            }
          }}
        />
      )}

      {/* 3. SUBMIT REVIEW MODAL */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto"
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
                    {language === "bn" ? "শিক্ষক মূল্যায়ন ও রিভিউ" : "Faculty Review & Evaluation"}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {teacher.name} {teacher.initial ? `[${teacher.initial}]` : ""}
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

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Course Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === "bn" ? "কোর্স নির্বাচন করুন *" : "Which Course Did You Take? *"}
                </label>
                {courses.length > 0 ? (
                  <select
                    value={newCourseCode}
                    onChange={(e) => setNewCourseCode(e.target.value)}
                    className="w-full p-2.5 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {courses.map((c) => {
                      const code = c.course?.code || c.code;
                      const title = c.course?.title || c.title;
                      return (
                        <option key={code} value={code}>
                          {code} - {title}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <input
                    type="text"
                    maxLength={15}
                    value={newCourseCode}
                    onChange={(e) => setNewCourseCode(e.target.value)}
                    placeholder="e.g. CSE241, CSE181"
                    className="w-full p-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                )}
              </div>

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
                        ? "আপনি ইতিমধ্যে এই কোর্সের জন্য রিভিউ দিয়েছেন। কোর্স প্রতি একজন শিক্ষার্থী কেবল একটি রিভিউ দিতে পারেন।"
                        : "You have already submitted an evaluation for this course. Each student can evaluate a course once."}
                    </p>
                  </div>
                </div>
              )}

              {/* Teaching Traits: Personality, Marking, Difficulty */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    {language === "bn" ? "ব্যক্তিত্ব *" : "Personality *"}
                  </label>
                  <select
                    value={newPersonality}
                    onChange={(e) => setNewPersonality(e.target.value)}
                    className="w-full p-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Friendly">{language === "bn" ? "বন্ধুত্বপূর্ণ (Friendly)" : "Friendly"}</option>
                    <option value="Helpful">{language === "bn" ? "সহযোগিতাপূর্ণ (Helpful)" : "Helpful"}</option>
                    <option value="Strict">{language === "bn" ? "কঠোর (Strict)" : "Strict"}</option>
                    <option value="Supportive">{language === "bn" ? "সাপোর্টিভ (Supportive)" : "Supportive"}</option>
                    <option value="Professional">{language === "bn" ? "পেশাদার (Professional)" : "Professional"}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    {language === "bn" ? "মার্কিং স্টাইল *" : "Marking *"}
                  </label>
                  <select
                    value={newMarking}
                    onChange={(e) => setNewMarking(e.target.value)}
                    className="w-full p-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Fair & Generous">{language === "bn" ? "উদার ও চমৎকার (Fair & Generous)" : "Fair & Generous"}</option>
                    <option value="Average">{language === "bn" ? "মাঝারি (Average)" : "Average"}</option>
                    <option value="Strict">{language === "bn" ? "কঠিন (Strict)" : "Strict"}</option>
                    <option value="Lenient">{language === "bn" ? "সহজ (Lenient)" : "Lenient"}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    {language === "bn" ? "কঠিনতা *" : "Difficulty *"}
                  </label>
                  <select
                    value={newDifficulty}
                    onChange={(e) => setNewDifficulty(e.target.value)}
                    className="w-full p-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Easy">{language === "bn" ? "সহজ (Easy)" : "Easy"}</option>
                    <option value="Medium">{language === "bn" ? "মাঝারি (Medium)" : "Medium"}</option>
                    <option value="Hard">{language === "bn" ? "কঠিন (Hard)" : "Hard"}</option>
                  </select>
                </div>
              </div>

              {/* Mandatory Star Rating Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>{language === "bn" ? "রেটিং দিন *" : "Overall Faculty Rating *"}</span>
                  <span className="text-amber-500 font-extrabold text-xs">
                    {newRating === 5 && (language === "bn" ? "৫/৫ - চমৎকার (Excellent)" : "5/5 - Excellent")}
                    {newRating === 4 && (language === "bn" ? "৪/৫ - খুব ভালো (Very Good)" : "4/5 - Very Good")}
                    {newRating === 3 && (language === "bn" ? "৩/৫ - ভালো (Good)" : "3/5 - Good")}
                    {newRating === 2 && (language === "bn" ? "২/৫ - চলনসই (Fair)" : "2/5 - Fair")}
                    {newRating === 1 && (language === "bn" ? "১/৫ - দুর্বল (Needs Improvement)" : "1/5 - Poor")}
                  </span>
                </label>
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewRating(star)}
                      className="p-1 hover:scale-125 transition-transform"
                    >
                      <Star
                        className={`w-7 h-7 transition-colors ${
                          star <= newRating
                            ? "text-amber-500 fill-amber-500 drop-shadow-sm"
                            : "text-slate-300 dark:text-slate-600 hover:text-amber-400"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Review Comment Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === "bn" ? "আপনার বিস্তারিত অভিজ্ঞতা লিখুন *" : "Your Evaluation & Review *"}
                </label>
                <textarea
                  rows={3}
                  minLength={10}
                  maxLength={500}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={
                    language === "bn"
                      ? "শিক্ষকের পড়ানোর ধরণ, ক্লাসের স্লাইড, কাউন্সেলিং আওয়ার এবং পরীক্ষার প্রশ্ন সম্পর্কে আপনার বাস্তব অভিজ্ঞতা লিখুন..."
                      : "Describe teaching style, lecture clarity, helpfulness in counseling hours, and exam question patterns..."
                  }
                  className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  required
                />
                <div className="flex items-center justify-between text-[11px] px-1">
                  {newComment.length > 0 && newComment.trim().length < 10 ? (
                    <span className="text-amber-500 font-medium">
                      {10 - newComment.trim().length} {language === "bn" ? "অক্ষর আরও প্রয়োজন (কমপক্ষে ১০)" : "more characters needed (min 10)"}
                    </span>
                  ) : newComment.trim().length >= 10 ? (
                    <span className="text-emerald-500 font-medium">
                      ✓ {language === "bn" ? "নূন্যতম দৈর্ঘ্য পূরণ হয়েছে" : "Minimum length met"}
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      {language === "bn" ? "কমপক্ষে ১০ অক্ষর" : "Minimum 10 characters"}
                    </span>
                  )}
                  <span className={`font-mono ${newComment.length >= 480 ? "text-amber-500 font-bold" : "text-slate-400"}`}>
                    {newComment.length}/500
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
                    onClick={() => setNewIsAnonymous(true)}
                    className={`p-2.5 rounded-xl text-left border transition-all flex items-center gap-2 ${
                      newIsAnonymous
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
                    onClick={() => setNewIsAnonymous(false)}
                    className={`p-2.5 rounded-xl text-left border transition-all flex items-center gap-2 ${
                      !newIsAnonymous
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
                  disabled={submittingReview || hasReviewedCourse || checkingReviewStatus}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingReview
                    ? (language === "bn" ? "জমা হচ্ছে..." : "Submitting...")
                    : hasReviewedCourse
                    ? (language === "bn" ? "রিভিউ সম্পন্ন হয়েছে" : "Already Evaluated")
                    : (language === "bn" ? "রিভিউ জমা দিন" : "Submit Review")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. VIEW ALL REVIEWS MODAL */}
      {showAllReviewsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-4 max-h-[85vh] flex flex-col"
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
                    {language === "bn" ? "সকল শিক্ষার্থী রিভিউ" : "All Student Reviews"} ({reviews.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    {teacher.name} • {language === "bn" ? `গড় রেটিং ${avgRating} ⭐` : `Average Rating ${avgRating} ⭐`}
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

            {/* Unified Scrollable Reviews List */}
            <div className="overflow-y-auto space-y-4 pr-1 flex-1">
              {reviews.map((rev) => (
                <FacultyReviewCard
                  key={rev.id}
                  review={rev}
                  formattedDate={formatReviewDate(rev.createdAt)}
                  language={language}
                />
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
    </div>
  );
}

/**
 * Single unified card housing author identity, rating, 4 faculty evaluation attributes
 * (Course, Personality, Marking, Difficulty), and student comment in one cohesive box.
 */
function FacultyReviewCard({
  review,
  formattedDate,
  language,
}: {
  review: any;
  formattedDate: string;
  language: string;
}) {
  const markingLower = (review.marking || "").toLowerCase();
  const markingStyle = markingLower.includes("strict")
    ? "bg-rose-500/10 border-rose-500/25 text-rose-300"
    : markingLower.includes("fair") || markingLower.includes("generous") || markingLower.includes("lenient")
    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
    : "bg-sky-500/10 border-sky-500/25 text-sky-300";

  const diffLower = (review.difficulty || "").toLowerCase();
  const diffStyle = diffLower.includes("hard")
    ? "bg-rose-500/10 border-rose-500/25 text-rose-300"
    : diffLower.includes("easy")
    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
    : "bg-amber-500/10 border-amber-500/25 text-amber-300";

  const authorDisplay = review.anonymous
    ? language === "bn"
      ? "অজ্ঞাতনামা শিক্ষার্থী"
      : "Anonymous Student"
    : review.authorName || review.studentName || "Student";

  const metrics = [
    {
      label: language === "bn" ? "কোর্স" : "Course",
      value: review.courseCode || review.courseTitle || review.course?.code || "Course",
      style: "bg-blue-500/10 border-blue-500/25 text-blue-300",
    },
    {
      label: language === "bn" ? "ব্যক্তিত্ব" : "Personality",
      value: review.personality || "Friendly",
      style: "bg-purple-500/10 border-purple-500/25 text-purple-300",
    },
    {
      label: language === "bn" ? "মার্কিং" : "Marking",
      value: review.marking || "Fair & Generous",
      style: markingStyle,
    },
    {
      label: language === "bn" ? "কঠিনতা" : "Difficulty",
      value: review.difficulty || "Medium",
      style: diffStyle,
    },
  ];

  const stars = review.rating || 5;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[#0d1424]/95 backdrop-blur-md border border-slate-800/90 hover:border-blue-500/40 text-white shadow-lg transition-all duration-200 space-y-3.5">
      {/* Top Row: Student Identity + Date & Rating */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-slate-800/90 border border-slate-700/80 flex items-center justify-center shrink-0 text-blue-400">
            <User className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-white truncate">{authorDisplay}</span>
              {!review.anonymous && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/25 shrink-0">
                  {language === "bn" ? "শিক্ষার্থী" : "Student"}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{formattedDate}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 px-2.5 py-1 rounded-xl bg-slate-950/60 border border-slate-800">
          <div className="flex items-center gap-0.5 text-amber-400">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-3 h-3 ${
                  star <= stars ? "fill-amber-400 text-amber-400" : "text-slate-700"
                }`}
              />
            ))}
          </div>
          <Smile className={`w-4 h-4 shrink-0 ${stars >= 4 ? "text-emerald-400" : stars === 3 ? "text-amber-400" : "text-rose-400"}`} />
        </div>
      </div>

      {/* Inside-the-Box 2x2 Evaluation Attributes Grid */}
      <div className="grid grid-cols-2 gap-2">
        {metrics.map((m) => (
          <div
            key={m.label}
            className={`px-3 py-2 rounded-xl border ${m.style} flex flex-col justify-center min-w-0`}
          >
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 leading-none">
              {m.label}
            </span>
            <span className="text-xs font-extrabold truncate mt-1" title={m.value}>
              {m.value}
            </span>
          </div>
        ))}
      </div>

      {/* Student Feedback Comment */}
      <div className="border-l-2 border-blue-500 pl-3.5 py-1 bg-slate-950/35 rounded-r-xl text-xs sm:text-sm text-slate-200 leading-relaxed">
        &quot;{review.comment}&quot;
      </div>
    </div>
  );
}
