"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { api } from "@/lib/api";
import { useDataSync, notifyDataChanged } from "@/lib/sync";
import { 
  CheckCircle2, 
  Sparkles, 
  CreditCard, 
  Smartphone, 
  ShieldCheck, 
  Send,
  AlertCircle,
  X,
  Copy,
  Check,
  BookOpen,
  ArrowRight,
  HelpCircle,
  Upload,
  Lock,
  Zap,
  GraduationCap,
  Clock,
  Star
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

export default function PricingPage() {
  const { user, isAuthenticated, setShowAuthModal, refreshProfile } = useAuth();
  const { language, t } = useLanguage();

  // Selected Plan for Checkout
  const [selectedPlan, setSelectedPlan] = useState<"SEMESTER_1" | "SEMESTER_2" | "YEAR_1_UNLIMITED">("SEMESTER_2");
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  // Payment Form States (bKash & Nagad ONLY)
  const [paymentMethod, setPaymentMethod] = useState<"BKASH" | "NAGAD">("BKASH");
  const [senderPhone, setSenderPhone] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);

  // Waiver Form States
  const [studentId, setStudentId] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [reason, setReason] = useState("");
  const [waiverLoading, setWaiverLoading] = useState(false);
  const [myWaiver, setMyWaiver] = useState<any | null>(null);
  const [isReapplying, setIsReapplying] = useState(false);

  // STRICT USER SPECIFICATION NUMBER: 01779326236
  const paymentNumber = "01779326236";

  const planConfig = {
    SEMESTER_1: {
      name: language === "bn" ? "১-সেমিস্টার প্ল্যান (৩ মাস)" : "1-Semester Plan (3 Months)",
      price: 99,
      quotaText: language === "bn" ? "৬টি কোর্স কোটা • ৩ মাস" : "6 Courses Quota • 3 Months",
      quotaNum: 6,
      period: language === "bn" ? "৩ মাস" : "3 Months",
      badge: language === "bn" ? "চলতি সেমিস্টারের জন্য সেরা" : "Best for Current Semester",
      unlimited: false,
    },
    SEMESTER_2: {
      name: language === "bn" ? "২-সেমিস্টার প্ল্যান (৬ মাস)" : "2-Semesters Plan (6 Months)",
      price: 149,
      quotaText: language === "bn" ? "১২টি কোর্স কোটা • ৬ মাস" : "12 Courses Quota • 6 Months",
      quotaNum: 12,
      period: language === "bn" ? "৬ মাস" : "6 Months",
      badge: language === "bn" ? "সর্বাধিক জনপ্রিয় • স্টুডেন্ট চয়েস" : "Most Popular • Student Choice",
      unlimited: false,
    },
    YEAR_1_UNLIMITED: {
      name: language === "bn" ? "১-বছরের অ্যানুয়াল পাস (১২ মাস)" : "1-Year Annual Pass (12 Months)",
      price: 499,
      quotaText: language === "bn" ? "আনলিমিটেড সকল কোর্স • ১ বছর" : "Unlimited All Courses • 1 Year",
      quotaNum: 999,
      period: language === "bn" ? "১২ মাস (পুরো ১ বছর)" : "12 Months (1 Full Year)",
      badge: language === "bn" ? "ভিআইপি আনলিমিটেড অ্যাক্সেস" : "VIP Unlimited Access",
      unlimited: true,
    },
  };

  const currentPlan = planConfig[selectedPlan];

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(paymentNumber);
    setCopiedNumber(true);
    toast.success("Payment number copied: 01779326236");
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  const handleOpenCheckout = (planKey: "SEMESTER_1" | "SEMESTER_2" | "YEAR_1_UNLIMITED") => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    setSelectedPlan(planKey);
    setShowCheckoutModal(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    const cleanPhone = senderPhone.trim().replace(/[\s-]/g, "");
    const cleanTrx = transactionId.trim().toUpperCase();

    if (!cleanPhone) {
      toast.error("Please enter your sender mobile number.");
      return;
    }
    if (!/^01[3-9]\d{8}$/.test(cleanPhone)) {
      toast.error("Please enter a valid 11-digit Bangladeshi mobile number (e.g. 017XXXXXXXX).");
      return;
    }

    if (!cleanTrx) {
      toast.error("Please provide the Transaction ID (TrxID).");
      return;
    }
    if (cleanTrx.length < 8 || cleanTrx.length > 25) {
      toast.error("Transaction ID must be between 8 and 25 alphanumeric characters.");
      return;
    }

    setPaymentLoading(true);
    try {
      await api.payments.submit({
        planType: selectedPlan,
        paymentMethod,
        senderPhone: cleanPhone,
        transactionId: cleanTrx,
        selectedCoursesJson: null,
      });

      notifyDataChanged("payment", "created");
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      toast.success("Payment submitted successfully! Admin will verify and activate your course quota promptly.");
      setShowCheckoutModal(false);
      setSenderPhone("");
      setTransactionId("");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit payment. Please verify your TrxID.");
    } finally {
      setPaymentLoading(false);
    }
  };

  // Pre-fill studentId and fetch user waiver status
  React.useEffect(() => {
    if (user?.studentId && !studentId) {
      setStudentId(user.studentId);
    }
  }, [user]);

  const fetchMyWaiver = React.useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const list = await api.waivers.getMy();
      if (list && list.length > 0) {
        setMyWaiver(list[0]);
      } else {
        setMyWaiver(null);
      }
    } catch {
      setMyWaiver(null);
    }
  }, [isAuthenticated]);

  React.useEffect(() => {
    fetchMyWaiver();
  }, [fetchMyWaiver]);

  // Enterprise Live Sync: Instantly updates waiver approval & payment status
  useDataSync(() => {
    fetchMyWaiver();
    if (isAuthenticated) {
      refreshProfile().catch(() => {});
    }
  });

  const handleWaiverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    const trimmedId = studentId.trim();
    const trimmedReason = reason.trim();

    if (!trimmedId) {
      toast.error("Please enter your Southeast University Student ID.");
      return;
    }
    if (trimmedId.length < 5 || trimmedId.length > 20) {
      toast.error("Student ID must be between 5 and 20 characters.");
      return;
    }

    if (cgpa) {
      const numCgpa = parseFloat(cgpa);
      if (isNaN(numCgpa) || numCgpa < 0.0 || numCgpa > 4.0) {
        toast.error("CGPA must be between 0.00 and 4.00.");
        return;
      }
    }

    if (!trimmedReason) {
      toast.error("Please provide your reason or explanation.");
      return;
    }
    if (trimmedReason.length < 20) {
      toast.error(`Reason is too short (${trimmedReason.length}/20 min). Please explain your situation with at least 20 characters.`);
      return;
    }
    if (trimmedReason.length > 600) {
      toast.error("Reason cannot exceed 600 characters.");
      return;
    }

    setWaiverLoading(true);
    try {
      const res = await api.waivers.submit({
        studentId: trimmedId,
        cgpa: cgpa ? parseFloat(cgpa) : undefined,
        reason: trimmedReason,
      });

      notifyDataChanged("waiver", "created");
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      toast.success("Your financial aid waiver request has been received. Our team will review and grant the ৳99 package upon verification.");
      setMyWaiver(res);
      setIsReapplying(false);
      setReason("");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit waiver application");
    } finally {
      setWaiverLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      
      {/* Hero Header with Glow Effects */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-extrabold text-xs border border-blue-200/80 dark:border-blue-800/80 shadow-sm animate-pulse">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>{language === "bn" ? "সাউথইস্ট ইউনিভার্সিটি এক্সক্লুসিভ" : "Southeast University CSE Exclusive"}</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          {language === "bn" ? "আপনার সেমিস্টার প্ল্যান বেছে নিন" : "Choose Your Semester Plan"}
        </h1>

        <p className="text-xs sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
          {language === "bn" 
            ? "কোনো জটিল কোর্স সিলেকশন ছাড়াই সহজে সাবস্ক্রিপশন নিন। ৩ মাস, ৬ মাস বা ১ বছরের জন্য কোর্স আনলক করুন। মেয়াদ শেষে আনলককৃত কোর্স স্বয়ংক্রিয়ভাবে পুনরায় লক হয়ে যাবে।" 
            : "Simple, flexible course unlock packages. Access hand notes, midterms, and finals for 3 months, 6 months, or 1 year. After expiration, unlocked courses automatically lock until renewed."}
        </p>

        {/* Quota Highlights Pill Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs font-bold text-slate-600 dark:text-slate-300">
          <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            ⚡ ৳99 = <strong>{language === "bn" ? "৬টি কোর্স (৩ মাস)" : "6 Courses (3 Months)"}</strong>
          </span>
          <span className="px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
            🔥 ৳149 = <strong>{language === "bn" ? "১২টি কোর্স (৬ মাস)" : "12 Courses (6 Months)"}</strong>
          </span>
          <span className="px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
            👑 ৳499 = <strong>{language === "bn" ? "সকল কোর্স আনলিমিটেড (১ বছর)" : "Unlimited All Courses (1 Year)"}</strong>
          </span>
        </div>
      </div>

      {/* Active Subscription Live Status Banner */}
      {user?.hasActiveSubscription && (
        <div className="max-w-4xl mx-auto p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-blue-950/30 border-2 border-emerald-500/50 shadow-xl shadow-emerald-500/10 space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md shadow-emerald-600/30 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                    {language === "bn" ? "আপনার সক্রিয় প্ল্যান" : "Your Active Plan"}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                  {user.planName || (language === "bn" ? "প্রিমিয়াম প্ল্যান" : "Premium Plan")}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <Link
                href="/courses"
                className="px-4 py-2.5 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
              >
                <span>{language === "bn" ? "কোর্স ব্রাউজ ও আনলক করুন" : "Browse & Unlock"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 text-xs border-t border-emerald-200/60 dark:border-emerald-800/60 font-semibold text-slate-700 dark:text-slate-200">
            <div>
              <span className="text-[10px] text-slate-500 block">{language === "bn" ? "মোট কোটা:" : "Total Quota:"}</span>
              <strong className="text-sm font-black text-slate-900 dark:text-white">
                {user.unlimited ? (language === "bn" ? "আনলিমিটেড (সকল ৮৫+)" : "Unlimited (All 85+)") : `${user.maxCoursesAllowed} Courses`}
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">{language === "bn" ? "ব্যবহৃত কোর্স:" : "Used Unlocks:"}</span>
              <strong className="text-sm font-black text-slate-900 dark:text-white">{user.usedCoursesCount} Courses</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">{language === "bn" ? "অবশিষ্ট কোটা:" : "Remaining Quota:"}</span>
              <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                {user.unlimited ? (language === "bn" ? "আনলিমিটেড" : "Unlimited") : `${user.remainingCoursesCount} Left`}
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">{language === "bn" ? "মেয়াদ উত্তীর্ণ:" : "Expires On:"}</span>
              <strong className="text-sm font-black text-slate-900 dark:text-white">
                {user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt).toLocaleDateString() : (language === "bn" ? "সক্রিয়" : "Active")}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* 3 Main Paid Subscription Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
        
        {/* ========================================================================= */}
        {/* PLAN 1: 1-SEMESTER (৳99 -> 6 COURSES • 3 MONTHS)                         */}
        {/* ========================================================================= */}
        <div className="rounded-3xl p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-600 transition-all flex flex-col justify-between group">
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200/60 dark:border-blue-800/60">
                {language === "bn" ? "১ সেমিস্টার • ৩ মাস মেয়াদ" : "1 Semester • 3 Months Validity"}
              </span>
              <h3 className="font-black text-2xl text-slate-900 dark:text-white pt-2">
                {language === "bn" ? "১-সেমিস্টার প্ল্যান" : "1-Semester Plan"}
              </h3>
              <p className="text-xs text-slate-500">
                {language === "bn"
                  ? "৩ মাসের জন্য সক্রিয়। বর্তমান সেমিস্টারের পরীক্ষার জন্য উপযুক্ত।"
                  : "Active for 3 months. Ideal for preparing current semester exams."}
              </p>
            </div>

            <div className="flex items-baseline gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white">৳99</span>
              <span className="text-xs text-slate-500 font-semibold">{language === "bn" ? "/ ৩ মাস" : "/ 3 months"}</span>
            </div>

            {/* Quota Feature Callout with Auto-Lock Policy */}
            <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60 text-xs">
              <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 font-black">
                <Zap className="w-4 h-4 text-blue-600" />
                <span>{language === "bn" ? "৬টি কোর্স আনলক কোটা (৩ মাস)" : "6 Course Unlocks Quota (3 Months)"}</span>
              </div>
              <p className="text-[11px] text-blue-800/80 dark:text-blue-300 mt-1 leading-relaxed">
                {language === "bn" ? (
                  <>পছন্দের যেকোনো ৬টি কোর্স আনলক করুন। মেয়াদ ৩ মাস। <strong>৩ মাস পর আনলককৃত কোর্স স্বয়ংক্রিয়ভাবে পুনরায় লক হয়ে যাবে</strong> (রিনিউ না করা পর্যন্ত)।</>
                ) : (
                  <>Unlock any 6 courses of your choice. Active for 3 months. <strong>After 3 months, unlocked courses automatically lock</strong> until renewed.</>
                )}
              </p>
            </div>

            <ul className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-bold text-slate-900 dark:text-white">
                  {language === "bn" ? "পছন্দের যেকোনো ৬টি কোর্স" : "Any 6 Courses of your choice"}
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{language === "bn" ? "৩ মাস ফুল অ্যাক্সেস মেয়াদ" : "3 Months Full Access Validity"}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{language === "bn" ? "মিডটার্ম ও ফাইনাল পরীক্ষার বিগত প্রশ্ন আর্কাইভ" : "Midterm & Final Examination Archive"}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{language === "bn" ? "ক্লাস লেকচার হ্যান্ড নোট ও স্লাইডস" : "Class Lecture Hand Notes & Slides"}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{language === "bn" ? "এআই এক্সাম চিট শিট ও মূল বিষয়সমূহ" : "AI Exam Cheat Sheet & Key Topics"}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-500 text-[11px]">
                  {language === "bn" ? "মেয়াদ শেষে স্বয়ংক্রিয়ভাবে লক হয়ে যাবে" : "Auto-locks after 3 months unless renewed"}
                </span>
              </li>
            </ul>
          </div>

          <div className="pt-8 space-y-2">
            <button
              onClick={() => handleOpenCheckout("SEMESTER_1")}
              className="w-full py-3.5 px-4 rounded-2xl font-bold text-xs text-slate-900 dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <span>{language === "bn" ? "১-সেমিস্টার প্ল্যান নিন (৳৯৯ / ৩ মাস)" : "Get 1-Semester Plan (৳99 / 3 Mos)"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <div className="text-center pt-1">
              <a
                href="#financial-aid"
                className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{language === "bn" ? "ফাইন্যান্সিয়াল এইড / ফ্রি ওয়েভার প্রয়োজন? নিচে আবেদন করুন ↓" : "Need Financial Aid / Free Waiver? Apply below ↓"}</span>
              </a>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PLAN 2: 2-SEMESTERS (৳149 -> 12 COURSES • 6 MONTHS) - FEATURED            */}
        {/* ========================================================================= */}
        <div className="rounded-3xl p-8 bg-gradient-to-b from-blue-50/50 via-white to-indigo-50/30 dark:from-blue-950/30 dark:via-slate-900 dark:to-slate-900 border-2 border-blue-600 shadow-2xl shadow-blue-500/15 flex flex-col justify-between relative transform hover:-translate-y-1 transition-all">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-[10px] uppercase tracking-wider shadow-md shadow-blue-500/30 flex items-center gap-1.5">
            <Star className="w-3 h-3 fill-current" />
            <span>{language === "bn" ? "সর্বাধিক জনপ্রিয় পছন্দ" : "Most Popular Choice"}</span>
          </div>

          <div className="space-y-6">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 border border-blue-300/60 dark:border-blue-700/60">
                {language === "bn" ? "২ সেমিস্টার • ৬ মাস মেয়াদ" : "2 Semesters • 6 Months Validity"}
              </span>
              <h3 className="font-black text-2xl text-slate-900 dark:text-white pt-2">
                {language === "bn" ? "২-সেমিস্টার প্ল্যান" : "2-Semesters Plan"}
              </h3>
              <p className="text-xs text-slate-500">
                {language === "bn"
                  ? "৬ মাসের জন্য সক্রিয়। পরপর ২টি একাডেমিক সেমিস্টার কভার করবে।"
                  : "Active for 6 months. Covers 2 consecutive academic semesters."}
              </p>
            </div>

            <div className="flex items-baseline gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white">৳149</span>
              <span className="text-xs text-slate-500 font-semibold">{language === "bn" ? "/ ৬ মাস" : "/ 6 months"}</span>
            </div>

            {/* Quota Feature Callout with Auto-Lock Policy */}
            <div className="p-3 rounded-2xl bg-blue-100/70 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700 text-xs">
              <div className="flex items-center gap-2 text-blue-900 dark:text-blue-100 font-black">
                <Zap className="w-4 h-4 text-blue-600" />
                <span>{language === "bn" ? "১২টি কোর্স আনলক কোটা (৬ মাস)" : "12 Course Unlocks Quota (6 Months)"}</span>
              </div>
              <p className="text-[11px] text-blue-800 dark:text-blue-200 mt-1 leading-relaxed">
                {language === "bn" ? (
                  <>পছন্দের যেকোনো ১২টি কোর্স আনলক করুন। মেয়াদ ৬ মাস। <strong>৬ মাস পর আনলককৃত কোর্স স্বয়ংক্রিয়ভাবে পুনরায় লক হয়ে যাবে</strong> (রিনিউ না করা পর্যন্ত)।</>
                ) : (
                  <>Unlock any 12 courses of your choice. Active for 6 months. <strong>After 6 months, unlocked courses automatically lock</strong> until renewed.</>
                )}
              </p>
            </div>

            <ul className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-bold text-slate-900 dark:text-white">
                  {language === "bn" ? "২ সেমিস্টারে যেকোনো ১২টি কোর্সের কোটা" : "Any 12 Courses Quota across 2 terms"}
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{language === "bn" ? "৬ মাস ফুল অ্যাক্সেস মেয়াদ" : "6 Months Full Access Validity"}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{language === "bn" ? "সকল মিডটার্ম ও ফাইনাল বিগত পরীক্ষার প্রশ্নপত্র" : "All Midterms & Finals Past Exam Papers"}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{language === "bn" ? "ল্যাব ম্যানুয়াল ও প্র্যাকটিক্যাল কোড আর্কাইভ" : "Lab Manuals & Practical Code Archives"}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{language === "bn" ? "শিক্ষক-ভিত্তিক লেকচার হ্যান্ড নোট" : "Teacher-specific Lecture Hand Notes"}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-500 text-[11px]">
                  {language === "bn" ? "মেয়াদ শেষে স্বয়ংক্রিয়ভাবে লক হয়ে যাবে" : "Auto-locks after 6 months unless renewed"}
                </span>
              </li>
            </ul>
          </div>

          <div className="pt-8">
            <button
              onClick={() => handleOpenCheckout("SEMESTER_2")}
              className="w-full py-4 px-4 rounded-2xl font-black text-xs text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
            >
              <Sparkles className="w-4 h-4" />
              <span>{language === "bn" ? "২-সেমিস্টার প্ল্যান নিন (৳১৪৯ / ৬ মাস)" : "Get 2-Semesters Plan (৳149 / 6 Mos)"}</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PLAN 3: 1-YEAR VIP (৳499 -> UNLIMITED • 12 MONTHS)                        */}
        {/* ========================================================================= */}
        <div className="rounded-3xl p-8 bg-gradient-to-b from-purple-50/50 via-white to-purple-50/30 dark:from-purple-950/25 dark:via-slate-900 dark:to-slate-900 border-2 border-purple-500/50 shadow-lg hover:shadow-xl hover:border-purple-500 transition-all flex flex-col justify-between group">
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950 border border-purple-200/60 dark:border-purple-800/60">
                {language === "bn" ? "১২ মাস • পুরো ১ বছর মেয়াদ" : "12 Months • Full Year Validity"}
              </span>
              <h3 className="font-black text-2xl text-purple-950 dark:text-purple-200 pt-2">
                {language === "bn" ? "১-বছরের অ্যানুয়াল পাস" : "1-Year Annual Pass"}
              </h3>
              <p className="text-xs text-slate-500">
                {language === "bn"
                  ? "পুরো ১ বছরের জন্য সাউথইস্ট ইউনিভার্সিটির সম্পূর্ণ আর্কাইভে আনলিমিটেড ভিআইপি অ্যাক্সেস।"
                  : "Unrestricted VIP access to the entire Southeast University archive for 1 year."}
              </p>
            </div>

            <div className="flex items-baseline gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-4xl sm:text-5xl font-black text-purple-950 dark:text-white">৳499</span>
              <span className="text-xs text-slate-500 font-semibold">{language === "bn" ? "/ ১ পুরো বছর" : "/ 1 full year"}</span>
            </div>

            {/* Quota Feature Callout with Auto-Lock Policy */}
            <div className="p-3 rounded-2xl bg-purple-100/70 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800 text-xs">
              <div className="flex items-center gap-2 text-purple-950 dark:text-purple-200 font-black">
                <CrownIcon className="w-4 h-4 text-purple-600" />
                <span>{language === "bn" ? "আনলিমিটেড সকল কোর্স (১ বছর)" : "UNLIMITED All Courses (1 Year)"}</span>
              </div>
              <p className="text-[11px] text-purple-900/80 dark:text-purple-300 mt-1 leading-relaxed">
                {language === "bn" ? (
                  <>সাউথইস্ট ইউনিভার্সিটির ৮৫+ সকল কোর্সে ১ বছর (৩৬৫ দিন) সরাসরি অ্যাক্সেস। <strong>১ বছর পর স্বয়ংক্রিয়ভাবে পুনরায় লক হয়ে যাবে</strong> (রিনিউ না করা পর্যন্ত)।</>
                ) : (
                  <>Instant access to all 85+ Southeast University courses for 1 Year (365 days). <strong>After 1 year, access automatically locks</strong> until renewed.</>
                )}
              </p>
            </div>

            <ul className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="font-black text-purple-950 dark:text-white">
                  {language === "bn" ? "আনলিমিটেড কোর্স আনলক (সকল ৮৫+ কোর্স)" : "Unlimited Course Unlocks (All 85+)"}
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span>{language === "bn" ? "পুরো ১ বছর (৩৬৫ দিন) উন্মুক্ত অ্যাক্সেস" : "1 Full Year (365 Days) Unrestricted Access"}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span>{language === "bn" ? "মিডটার্ম, ফাইনাল ও কুইজের প্রশ্ন সমাধান" : "All Midterms, Finals & Quiz Solved Papers"}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span>{language === "bn" ? "সকল ল্যাব ম্যানুয়াল ও প্র্যাকটিক্যাল কোড সলিউশন" : "All Lab Manuals & Code Solutions"}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span>{language === "bn" ? "নতুন আপলোডকৃত পরীক্ষায় প্রায়োরিটি অ্যাক্সেস" : "Priority access to newly uploaded exam papers"}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-slate-500 text-[11px]">
                  {language === "bn" ? "১ বছর পর মেয়াদ শেষে স্বয়ংক্রিয়ভাবে লক হয়ে যাবে" : "Auto-locks after 1 year unless renewed"}
                </span>
              </li>
            </ul>
          </div>

          <div className="pt-8">
            <button
              onClick={() => handleOpenCheckout("YEAR_1_UNLIMITED")}
              className="w-full py-3.5 px-4 rounded-2xl font-black text-xs text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md shadow-purple-500/25"
            >
              <Sparkles className="w-4 h-4" />
              <span>{language === "bn" ? "১-বছরের পাস নিন (৳৪৯৯ / ১ বছর)" : "Get 1-Year Pass (৳499 / 1 Year)"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Free Community Card Banner */}
      <div className="max-w-5xl mx-auto p-6 sm:p-8 rounded-3xl bg-emerald-50/60 dark:bg-emerald-950/20 border-2 border-emerald-500/40 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
            {language === "bn" ? "১০০% ফ্রি অপশন" : "100% Free Option"}
          </div>
          <h3 className="font-black text-xl text-emerald-950 dark:text-emerald-200">
            {language === "bn" ? "নোট আপলোড করে ফ্রিতে কোর্স আনলক করুন" : "Earn Free Course Unlocks with Community Uploads"}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
            {language === "bn" 
              ? "যেকোনো শিক্ষকের লেকচার নোট বা বিগত পরীক্ষার প্রশ্নপত্র আপলোড করুন। অ্যাডমিন অ্যাপ্রুভ করলেই আপনার পছন্দের যেকোনো ২টি কোর্স সম্পূর্ণ ফ্রিতে আনলক হয়ে যাবে!" 
              : "Upload any verified lecture notes or past semester exam question paper. When approved by admin, you instantly receive 2 free course unlocks credited to your profile!"}
          </p>
        </div>
        <Link
          href="/contribute"
          className="shrink-0 py-3.5 px-6 rounded-2xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          <span>{language === "bn" ? "আপলোড করুন ও ফ্রি আনলক নিন" : "Upload & Earn +2 Free Courses"}</span>
        </Link>
      </div>

      {/* FAQ Guide Accordion */}
      <div className="max-w-4xl mx-auto space-y-4">
        <h3 className="text-lg font-black text-slate-900 dark:text-white text-center">
          {language === "bn" ? "নোটলাগবে-তে কোর্স আনলক ও মেয়াদ যেভাবে কাজ করে" : "How Course Unlocking & Expiration Works at NoteLagbe"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
            <span className="font-bold text-blue-600 text-sm">
              {language === "bn" ? "১. প্ল্যান বেছে নিয়ে পেমেন্ট করুন" : "1. Choose Plan & Pay"}
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              {language === "bn" ? "বিকাশ বা নগদে টাকা পাঠান" : "Send money via bKash or Nagad"}
            </p>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              {language === "bn" ? (
                <><strong>01779326236</strong> নম্বরে ৳৯৯ (৩ মাস), ৳১৪৯ (৬ মাস) বা ৳৪৯৯ (১ বছর) সেন্ড মানি করুন এবং TrxID জমা দিন।</>
              ) : (
                <>Send ৳99 (3 mos), ৳149 (6 mos), or ৳499 (1 yr) to <strong>01779326236</strong> and submit your TrxID.</>
              )}
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
            <span className="font-bold text-emerald-600 text-sm">
              {language === "bn" ? "২. অ্যাডমিন অনুমোদন ও আনলক" : "2. Admin Approval & Unlock"}
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              {language === "bn" ? "মেয়াদের মধ্যে কোর্স আনলক করুন" : "Unlock courses during your term"}
            </p>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              {language === "bn"
                ? "অ্যাডমিন ভেরিফাই করলেই কোর্স পেজে গিয়ে নিজের ইচ্ছামত কোর্স আনলক করে নিতে পারবেন।"
                : "Upon admin approval, unlock courses on each course page. Your access stays active for the entire plan duration."}
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
            <span className="font-bold text-purple-600 text-sm">
              {language === "bn" ? "৩. মেয়াদ শেষে পুনরায় লক" : "3. Automatic Re-Locking"}
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              {language === "bn" ? "প্ল্যানের মেয়াদ শেষ হলে অটো-লক" : "Auto-locks when plan expires"}
            </p>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              {language === "bn"
                ? "৩ মাস (৳৯৯), ৬ মাস (৳১৪৯) বা ১ বছর (৳৪৯৯) শেষ হলে আনলককৃত কোর্সগুলো স্বয়ংক্রিয়ভাবে পুনরায় লক হয়ে যাবে।"
                : "When 3 months (৳99), 6 months (৳149), or 1 year (৳499) concludes, unlocked courses automatically lock until you renew."}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CHECKOUT MODAL (bKash & Nagad ONLY - NO COURSE SELECTOR)                  */}
      {/* ========================================================================= */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {language === "bn" ? "সাবস্ক্রিপশন পেমেন্ট সম্পন্ন করুন" : "Complete Subscription Payment"}
                  </h3>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    ৳{currentPlan.price}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {currentPlan.name} • {currentPlan.quotaText}
                </p>
              </div>

              <button
                onClick={() => setShowCheckoutModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Direct Payment Form */}
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
              
              {/* Payment Method Selector (bKash & Nagad) */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                  {language === "bn" ? "মোবাইল পেমেন্ট মাধ্যম সিলেক্ট করুন:" : "Select Mobile Payment Method:"}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("BKASH")}
                    className={`p-3 rounded-2xl border-2 transition-all flex items-center justify-center gap-2.5 font-black text-xs ${
                      paymentMethod === "BKASH"
                        ? "border-pink-500 bg-pink-50/50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300 shadow-sm"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-pink-600 shrink-0" />
                    <span>{language === "bn" ? "বিকাশ (সেন্ড মানি)" : "bKash (Send Money)"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("NAGAD")}
                    className={`p-3 rounded-2xl border-2 transition-all flex items-center justify-center gap-2.5 font-black text-xs ${
                      paymentMethod === "NAGAD"
                        ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 shadow-sm"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-orange-600 shrink-0" />
                    <span>{language === "bn" ? "নগদ (সেন্ড মানি)" : "Nagad (Send Money)"}</span>
                  </button>
                </div>
              </div>

              {/* Payment Number Card with Copy Button */}
              <div className={`p-4 rounded-2xl border text-xs space-y-2.5 ${
                paymentMethod === "BKASH"
                  ? "bg-pink-50/60 dark:bg-pink-950/20 border-pink-200 dark:border-pink-900/50 text-pink-950 dark:text-pink-200"
                  : "bg-orange-50/60 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/50 text-orange-950 dark:text-orange-200"
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[11px] uppercase tracking-wider">
                    {paymentMethod === "BKASH"
                      ? (language === "bn" ? "বিকাশ সেন্ড মানি নম্বর" : "bKash Send Money Number")
                      : (language === "bn" ? "নগদ সেন্ড মানি নম্বর" : "Nagad Send Money Number")}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyNumber}
                    className="flex items-center gap-1 font-bold text-[11px] underline hover:opacity-80"
                  >
                    {copiedNumber ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedNumber ? (language === "bn" ? "কপি হয়েছে!" : "Copied!") : (language === "bn" ? "নম্বর কপি করুন" : "Copy Number")}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-pink-200/50 dark:border-pink-900/40">
                  <span className="font-mono text-base font-black tracking-widest text-slate-900 dark:text-white">
                    {paymentNumber}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {language === "bn" ? "পার্সোনাল" : "Personal"}
                  </span>
                </div>

                <ol className="text-[11px] space-y-1 list-decimal list-inside opacity-90 leading-relaxed pt-1">
                  <li>
                    {language === "bn"
                      ? <>আপনার {paymentMethod === "BKASH" ? "bKash" : "Nagad"} অ্যাপে গিয়ে <strong>Send Money</strong> সিলেক্ট করুন।</>
                      : <>Open your {paymentMethod === "BKASH" ? "bKash" : "Nagad"} app and choose <strong>Send Money</strong>.</>}
                  </li>
                  <li>
                    {language === "bn"
                      ? <>সঠিক পরিমাণ: <strong>৳{currentPlan.price}</strong> টাকা <strong>{paymentNumber}</strong> নম্বরে পাঠান।</>
                      : <>Send exact amount: <strong>৳{currentPlan.price}</strong> to <strong>{paymentNumber}</strong>.</>}
                  </li>
                  <li>
                    {language === "bn"
                      ? <>যে নম্বর থেকে টাকা পাঠিয়েছেন তা এবং মেসেজে পাওয়া <strong>TrxID</strong> নিচে লিখুন।</>
                      : <>Enter your sender phone number and the <strong>TrxID</strong> below.</>}
                  </li>
                </ol>
              </div>

              {/* Form Input Fields */}
              <div className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {language === "bn"
                        ? `আপনার ${paymentMethod === "BKASH" ? "বিকাশ" : "নগদ"} সেন্ডার নম্বর *:`
                        : `Your ${paymentMethod === "BKASH" ? "bKash" : "Nagad"} Sender Number *:`}
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">{senderPhone.length}/11</span>
                  </div>
                  <input
                    type="tel"
                    required
                    maxLength={11}
                    placeholder="01XXXXXXXXX"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 11))}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-wider"
                  />
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    {senderPhone.length === 0 ? (
                      <span className="text-slate-400">{language === "bn" ? "১১ ডিজিটের পার্সোনাল নম্বর" : "11-digit personal account number"}</span>
                    ) : /^01[3-9]\d{8}$/.test(senderPhone) ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> {language === "bn" ? "সঠিক বাংলাদেশি মোবাইল নম্বর" : "Valid Bangladeshi mobile number"}
                      </span>
                    ) : (
                      <span className="text-amber-500 font-medium">
                        {language === "bn" ? "০১ দিয়ে শুরু ১১ ডিজিটের সঠিক নম্বর লিখুন" : "Must be 11 digits starting with 013-019"}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {language === "bn" ? "ট্রানজেকশন আইডি (TrxID) *:" : "Transaction ID (TrxID) *:"}
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">{transactionId.length}/15</span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    placeholder="e.g. BL9A7X8Q2Y"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 15))}
                    className="w-full text-xs font-mono p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    {transactionId.length < 8 ? (
                      <span className="text-slate-400">
                        {language === "bn" ? "পেমেন্ট এসএমএস থেকে প্রাপ্ত ৮-১৫ অক্ষরের TrxID" : "8 to 15 alphanumeric characters found in SMS"}
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> {language === "bn" ? "সঠিক TrxID ফরম্যাট" : "Valid TrxID format"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Unlock Quota Notice & Auto-Lock Terms */}
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                <p className="font-extrabold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>{language === "bn" ? "মেয়াদ ও অটো-লক শর্তাবলী:" : "Validity & Auto-Lock Terms:"}</span>
                </p>
                <p className="text-[11px] leading-relaxed opacity-90">
                  {currentPlan.unlimited ? (
                    language === "bn"
                      ? "অ্যাডমিন অনুমোদন দিলে সাউথইস্টের সকল ৮৫+ কোর্স ১ বছর (১২ মাস) আপনার প্রোফাইলে আনলক থাকবে। ১ বছর পর স্বয়ংক্রিয়ভাবে পুনরায় লক হয়ে যাবে।"
                      : "Upon admin approval, all 85+ Southeast University courses are instantly unlocked on your profile for 1 Full Year (12 Months). After 1 year, access automatically locks unless renewed."
                  ) : (
                    language === "bn"
                      ? `অ্যাডমিন অনুমোদন দিলে আপনি ${currentPlan.quotaNum}টি কোর্স আনলকের কোটা পাবেন যার মেয়াদ ${currentPlan.period}। মেয়াদ শেষ হলে কোর্সগুলো স্বয়ংক্রিয়ভাবে লক হয়ে যাবে।`
                      : `Upon admin approval, you receive ${currentPlan.quotaNum} course unlocks valid for ${currentPlan.period}. Once the ${currentPlan.period} period expires, courses will automatically lock until you renew your plan.`
                  )}
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={paymentLoading}
                className="w-full py-3.5 px-4 rounded-xl font-black text-xs text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 disabled:opacity-50"
              >
                {paymentLoading ? (
                  <>
                    <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                    <span>{language === "bn" ? "পেমেন্ট জমা হচ্ছে..." : "Submitting Payment..."}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{language === "bn" ? `৳${currentPlan.price} পেমেন্ট জমা দিন` : `Submit Payment of ৳${currentPlan.price}`}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FINANCIAL AID & WAIVER SECTION */}
      <div id="financial-aid" className="max-w-3xl mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-xl text-slate-900 dark:text-white">
                {language === "bn" ? "আর্থিক সহায়তা বা সম্পূর্ণ ফ্রি ওয়েভার প্রয়োজন?" : "Need Financial Aid / Free Waiver?"}
              </h3>
              <p className="text-xs text-slate-500">
                {language === "bn"
                  ? "সাউথইস্ট ইউনিভার্সিটির কোনো শিক্ষার্থীর আর্থিক সমস্যার কারণে পড়াশোনা থেমে থাকবে না"
                  : "NoteLagbe never lets financial hardship block academic success at Southeast University"}
              </p>
            </div>
          </div>
          <span className="self-start sm:self-center px-3 py-1 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
            {language === "bn" ? "১০০% ফ্রি ওয়েভার" : "100% Free Waiver"}
          </span>
        </div>

        {/* What You Get Callout: ৳99 Package (6 Courses Quota) */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-blue-950/20 border border-purple-200/70 dark:border-purple-800/50 space-y-2.5 text-xs">
          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-600" />
            <span>
              {language === "bn"
                ? "অ্যাডমিন অনুমোদন দিলে সম্পূর্ণ ৳৯৯ প্যাকেজ ফ্রিতে পাবেন (৬টি কোর্স আনলক):"
                : "Admin Accept Korle ৳99 Package Use Korte Parbe (6 Ta Course Unlock):"}
            </span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[12px]">
            {language === "bn" ? (
              <>আপনার আবেদন যাচাই করে প্রশাসন অনুমোদন দিলে আপনি স্বয়ংক্রিয়ভাবে <strong>৳৯৯ প্যাকেজ (১-সেমিস্টার প্ল্যান)</strong> পাবেন:</>
            ) : (
              <>Once your application is reviewed and accepted by administration, you automatically receive the full <strong>৳99 Package (1-Semester Plan)</strong>:</>
            )}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 font-semibold text-slate-700 dark:text-slate-200">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-purple-100 dark:border-purple-900/40">
              <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
              <span>{language === "bn" ? "৬টি কোর্স আনলক কোটা" : "6 Course Unlocks Quota"}</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-purple-100 dark:border-purple-900/40">
              <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
              <span>{language === "bn" ? "৩ মাস পূর্ণ অ্যাক্সেস" : "3 Months Full Access"}</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-purple-100 dark:border-purple-900/40">
              <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
              <span>{language === "bn" ? "সকল শিক্ষক ও ম্যাটেরিয়াল" : "All Faculty Teachers"}</span>
            </div>
          </div>
        </div>

        {/* Existing Waiver Status Cards */}
        {myWaiver && !isReapplying ? (
          <div>
            {myWaiver.status === "PENDING" && (
              <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
                  <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
                  <span>
                    {language === "bn"
                      ? "আর্থিক সহায়তার আবেদন অ্যাডমিন পর্যালোচনার অপেক্ষায় আছে"
                      : "Financial Aid Application Pending Admin Review"}
                  </span>
                </div>
                <p className="text-xs text-amber-900/80 dark:text-amber-200 leading-relaxed">
                  {language === "bn" ? (
                    <>আপনার <strong>৳৯৯ প্যাকেজ (৬টি কোর্স কোটা)</strong> এর আবেদনটি <strong>{new Date(myWaiver.createdAt).toLocaleDateString()}</strong> তারিখে জমা হয়েছে।</>
                  ) : (
                    <>Your application for the <strong>৳99 Package (6 Course Unlocks Quota)</strong> was submitted on <strong>{new Date(myWaiver.createdAt).toLocaleDateString()}</strong>.</>
                  )}
                </p>
                <div className="p-3.5 rounded-xl bg-white/70 dark:bg-slate-900/70 text-xs text-slate-700 dark:text-slate-300 italic border border-amber-100 dark:border-amber-900/50">
                  &quot;{myWaiver.reason}&quot;
                </div>
                <div className="flex items-center justify-between text-[11px] text-amber-800/80 dark:text-amber-300 pt-1">
                  <span>Student ID: <strong>{myWaiver.studentId}</strong> {myWaiver.cgpa ? `• CGPA: ${myWaiver.cgpa}` : ""}</span>
                  <span className="font-semibold">{language === "bn" ? "সাধারণত ২৪ ঘণ্টার মধ্যে যাচাই সম্পন্ন হয়" : "Review typically within 24 hours"}</span>
                </div>
              </div>
            )}

            {myWaiver.status === "APPROVED" && (
              <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-4 animate-in fade-in">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>
                    {language === "bn"
                      ? "আর্থিক সহায়তা অনুমোদিত • ৳৯৯ প্যাকেজ সক্রিয়! 🎉"
                      : "Financial Aid Approved • ৳99 Package Active! 🎉"}
                  </span>
                </div>
                <p className="text-xs text-emerald-900/80 dark:text-emerald-200 leading-relaxed">
                  {language === "bn" ? (
                    <>অভিনন্দন! নোটলাগবে প্রশাসন আপনার ফ্রি ওয়েভার অনুমোদন করেছে। আপনার অ্যাকাউন্টে ৩ মাসের জন্য ৬টি কোর্স আনলকের কোটাসহ <strong>৳৯৯ প্যাকেজ (১-সেমিস্টার প্ল্যান)</strong> সক্রিয় আছে।</>
                  ) : (
                    <>Congratulations! NoteLagbe administration has approved your financial waiver. Your <strong>৳99 Package (1-Semester Plan)</strong> is currently active with <strong>6 Course Unlocks Quota</strong> for 3 months.</>
                  )}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Link
                    href="/courses"
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm inline-flex items-center gap-1.5"
                  >
                    <span>{language === "bn" ? "কোর্স ব্রাউজ ও আনলক করুন" : "Browse & Unlock Courses"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href="/dashboard"
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 hover:bg-emerald-200 transition-colors"
                  >
                    {language === "bn" ? "ড্যাশবোর্ড ও কোটা দেখুন" : "View Dashboard & Quota"}
                  </Link>
                </div>
              </div>
            )}

            {myWaiver.status === "REJECTED" && (
              <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-sm">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  <span>{language === "bn" ? "আবেদন অনুমোদিত হয়নি" : "Application Not Approved"}</span>
                </div>
                <p className="text-xs text-rose-900/80 dark:text-rose-200 leading-relaxed">
                  {language === "bn" ? "প্রশাসনের মন্তব্য:" : "Reason from administration:"} {myWaiver.adminNotes || (language === "bn" ? "প্রয়োজনীয় শর্ত পূরণ হয়নি।" : "Requirements not met.")}
                </p>
                <button
                  onClick={() => setIsReapplying(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors"
                >
                  {language === "bn" ? "সংশোধিত আবেদন জমা দিন" : "Submit Updated Application"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleWaiverSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {language === "bn" ? "স্টুডেন্ট আইডি *" : "Student ID *"}
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">{studentId.length}/20</span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={20}
                  placeholder="e.g. 2022100010045"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 20))}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {language === "bn" ? "সাউথইস্ট ইউনিভার্সিটির অফিসিয়াল আইডি নম্বর" : "Official Southeast University ID number"}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {language === "bn" ? "সর্বশেষ সিজিপিএ (ঐচ্ছিক)" : "Latest CGPA (Optional)"}
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">0.00 - 4.00</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.00"
                  max="4.00"
                  placeholder="e.g. 3.75"
                  value={cgpa}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || (parseFloat(val) >= 0 && parseFloat(val) <= 4.0)) {
                      setCgpa(val);
                    }
                  }}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">{language === "bn" ? "৪.০০ স্কেলে" : "Scale out of 4.00"}</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {language === "bn" ? "আবেদনের কারণ ও ব্যাখ্যা *" : "Reason / Explanation *"}
                </label>
                <div className="flex items-center gap-2 text-[11px]">
                  {reason.trim().length === 0 ? (
                    <span className="text-slate-400">{language === "bn" ? "কমপক্ষে ২০ অক্ষর" : "Min 20 characters"}</span>
                  ) : reason.trim().length < 20 ? (
                    <span className="text-amber-500 font-semibold">
                      {20 - reason.trim().length} {language === "bn" ? "অক্ষর আরও প্রয়োজন" : "more characters needed"}
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> {language === "bn" ? "নূন্যতম সীমা পূরণ হয়েছে" : "Minimum met"}
                    </span>
                  )}
                  <span className={`font-mono ${reason.length >= 570 ? "text-amber-500 font-bold" : "text-slate-400"}`}>
                    {reason.length}/600
                  </span>
                </div>
              </div>
              <textarea
                rows={4}
                required
                minLength={20}
                maxLength={600}
                placeholder={
                  language === "bn"
                    ? "আপনার বর্তমান সেমিস্টার/একাডেমিক বর্ষ এবং কেন আপনি ৳৯৯ প্যাকেজ ওয়েভারের জন্য আবেদন করছেন সংক্ষেপে লিখুন (যেমন: আর্থিক সংকট, সেমিস্টার লক্ষ্য ইত্যাদি)..."
                    : "Briefly state your academic year and why you are applying for the ৳99 package waiver (e.g. academic standing, financial circumstances, semester targets)..."
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={`w-full text-xs p-3 rounded-xl border bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition-all ${
                  reason.length > 0 && reason.trim().length < 20
                    ? "border-amber-300 dark:border-amber-700 focus:ring-amber-500"
                    : "border-slate-200 dark:border-slate-700 focus:ring-purple-500"
                }`}
              />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                {language === "bn"
                  ? "কমপক্ষে ২০ অক্ষর, সর্বোচ্চ ৬০০ অক্ষর। সঠিক আবেদনসমূহ সাধারণত ২৪ ঘণ্টার মধ্যে যাচাই ও অনুমোদন করা হয়।"
                  : "Minimum 20 characters, maximum 600 characters. Genuine applications are approved within 24 hours."}
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="submit"
                disabled={waiverLoading || (reason.trim().length > 0 && reason.trim().length < 20)}
                className="py-2.5 px-6 rounded-xl font-bold text-xs text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 transition-colors disabled:opacity-50 shadow-sm"
              >
                {waiverLoading
                  ? (language === "bn" ? "আবেদন জমা হচ্ছে..." : "Submitting Application...")
                  : (language === "bn" ? "৳৯৯ প্যাকেজের (৬ কোর্স) জন্য আবেদন জমা দিন" : "Submit Application for ৳99 Package (6 Courses)")}
              </button>
              {isReapplying && (
                <button
                  type="button"
                  onClick={() => setIsReapplying(false)}
                  className="text-xs text-slate-500 hover:underline"
                >
                  {language === "bn" ? "বাতিল" : "Cancel"}
                </button>
              )}
            </div>
          </form>
        )}
      </div>

    </div>
  );
}

function CrownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.735H5.81a1 1 0 0 1-.957-.735L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" />
      <path d="M5 21h14" />
    </svg>
  );
}
