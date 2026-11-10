"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  TrendingUp,
  BarChart3,
  CreditCard,
  Users,
  BookOpen,
  Sparkles,
  Download,
  Printer,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Award,
  Layers,
  GraduationCap,
  Calendar,
  DollarSign,
  PieChart,
  Percent,
  Search,
  ExternalLink,
  Sliders,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface AdminAnalyticsViewProps {
  language?: "en" | "bn";
  isSuperAdmin?: boolean;
  onNavigateTab?: (tab: string) => void;
}

// Persistent in-memory cache to guarantee zero-delay instant tab switching
let globalCachedAnalyticsData: any = null;

export default function AdminAnalyticsView({
  language = "en",
  isSuperAdmin = false,
  onNavigateTab,
}: AdminAnalyticsViewProps) {
  const [data, setData] = useState<any | null>(globalCachedAnalyticsData);
  const [loading, setLoading] = useState<boolean>(!globalCachedAnalyticsData);
  const [timeRange, setTimeRange] = useState<"30d" | "6m">("30d");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "financial" | "users" | "academic">("all");
  const [transactionSearch, setTransactionSearch] = useState<string>("");
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    label: string;
    value: number;
    count: number;
    chart: "revenue" | "users";
  } | null>(null);

  const fetchAnalytics = useCallback(async (isManual = false) => {
    try {
      if (isManual || !globalCachedAnalyticsData) {
        setLoading(true);
      }
      const res = await api.admin.getAnalytics();
      globalCachedAnalyticsData = res;
      setData(res);
    } catch (err: any) {
      console.error("Failed to fetch analytics:", err);
      if (!globalCachedAnalyticsData) {
        toast.error(
          language === "bn"
            ? "অ্যানালিটিক্স ডেটা লোড করতে ব্যর্থ হয়েছে।"
            : "Failed to load analytics telemetry data."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Active revenue dataset based on timeRange
  const activeRevenueTrend: Array<{ label: string; fullDate: string; value: number; secondaryValue: number }> =
    useMemo(() => {
      if (!data) return [];
      return timeRange === "30d" ? data.revenueTrend30Days || [] : data.revenueTrend6Months || [];
    }, [data, timeRange]);

  // Active user growth dataset based on timeRange
  const activeUserTrend: Array<{ label: string; fullDate: string; value: number; secondaryValue: number }> =
    useMemo(() => {
      if (!data) return [];
      return timeRange === "30d" ? data.userGrowthTrend30Days || [] : data.userGrowthTrend6Months || [];
    }, [data, timeRange]);

  // Max value calculations for SVG scales
  const maxRevenue = useMemo(() => {
    if (!activeRevenueTrend.length) return 500;
    const max = Math.max(...activeRevenueTrend.map((p) => p.value));
    return max > 0 ? max * 1.15 : 500;
  }, [activeRevenueTrend]);

  const maxUserGrowth = useMemo(() => {
    if (!activeUserTrend.length) return 10;
    const max = Math.max(...activeUserTrend.map((p) => p.value));
    return max > 0 ? max * 1.25 : 10;
  }, [activeUserTrend]);

  // Filtered recent transactions
  const filteredTransactions = useMemo(() => {
    if (!data?.recentTransactions) return [];
    if (!transactionSearch.trim()) return data.recentTransactions;
    const q = transactionSearch.toLowerCase();
    return data.recentTransactions.filter(
      (tx: any) =>
        (tx.userName && tx.userName.toLowerCase().includes(q)) ||
        (tx.userEmail && tx.userEmail.toLowerCase().includes(q)) ||
        (tx.transactionId && tx.transactionId.toLowerCase().includes(q)) ||
        (tx.paymentMethod && tx.paymentMethod.toLowerCase().includes(q))
    );
  }, [data, transactionSearch]);

  // Comprehensive CSV Report Exporter
  const handleExportCsv = () => {
    if (!data) return;
    const rows: string[][] = [];

    // Header
    rows.push(["Southeast University CSE Platform - Executive Analytics & Audit Report"]);
    rows.push([`Generated On: ${new Date().toLocaleString()}`]);
    rows.push([]);

    // 1. Executive KPIs
    rows.push(["=== EXECUTIVE SUMMARY KPIS ==="]);
    rows.push(["Metric", "Value"]);
    rows.push(["Total Platform Revenue (BDT)", `${data.totalRevenue} BDT`]);
    rows.push(["Current Month Revenue (BDT)", `${data.monthlyRevenue} BDT`]);
    rows.push(["Today's Revenue (BDT)", `${data.todayRevenue} BDT`]);
    rows.push(["Total Transactions Recorded", `${data.totalPayments}`]);
    rows.push(["Approved Transactions", `${data.approvedPaymentsCount}`]);
    rows.push(["Pending Transactions", `${data.pendingPaymentsCount}`]);
    rows.push(["Payment Approval Rate", `${data.paymentApprovalRate}%`]);
    rows.push(["Total Registered Accounts", `${data.totalUsers}`]);
    rows.push(["Total Students", `${data.totalStudents}`]);
    rows.push(["Active Subscribers", `${data.activeSubscribersCount}`]);
    rows.push(["Subscriber Conversion Rate", `${data.subscriberConversionRate}%`]);
    rows.push(["Total Academic Resources", `${data.totalResources}`]);
    rows.push(["Verified Lecture Notes", `${data.totalNotes}`]);
    rows.push(["Verified Exam Questions", `${data.totalQuestions}`]);
    rows.push(["Total Courses Available", `${data.totalCourses}`]);
    rows.push(["Total Faculty Members", `${data.totalTeachers}`]);
    rows.push([]);

    // 2. Gateway Breakdown
    rows.push(["=== PAYMENT GATEWAY PERFORMANCE ==="]);
    rows.push(["Gateway", "Transactions Count", "Volume (BDT)"]);
    if (data.paymentMethodBreakdown) {
      Object.keys(data.paymentMethodBreakdown).forEach((gw) => {
        const count = data.paymentMethodBreakdown[gw] || 0;
        const vol = (data.paymentMethodRevenue && data.paymentMethodRevenue[gw]) || 0;
        rows.push([gw, `${count}`, `${vol} BDT`]);
      });
    }
    rows.push([]);

    // 3. Recent Transactions
    rows.push(["=== RECENT PAYMENT TRANSACTIONS AUDIT ==="]);
    rows.push(["ID", "User Name", "Email", "Plan Package", "Gateway", "Amount (BDT)", "TrxID", "Status", "Timestamp"]);
    if (data.recentTransactions) {
      data.recentTransactions.forEach((tx: any) => {
        rows.push([
          `${tx.id}`,
          `"${tx.userName}"`,
          tx.userEmail,
          tx.planType,
          tx.paymentMethod,
          `${tx.amount}`,
          tx.transactionId,
          tx.status,
          tx.createdAt,
        ]);
      });
    }

    const csvContent = "\uFEFF" + rows.map((r) => r.join(",")).join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `SEU_Admin_Analytics_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(
      language === "bn" ? "অ্যানালিটিক্স CSV রিপোর্ট ডাউনলোড হয়েছে!" : "Executive CSV report exported successfully!"
    );
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading && !data) {
    return (
      <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
          {language === "bn" ? "অ্যানালিটিক্স টেলিমেট্রি প্রস্তুত করা হচ্ছে..." : "Loading executive telemetry & reports..."}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Aggregating payment logs, user cohorts, and resource metadata.
        </p>
      </div>
    );
  }

  if (!data) return null;

  // Donut chart angles & slices for Payment Methods
  const methodKeys = ["BKASH", "NAGAD", "ROCKET"];
  const methodColors: Record<string, string> = {
    BKASH: "#e1147b",
    NAGAD: "#f7941d",
    ROCKET: "#8c3494",
  };
  const totalMethodTransactions = methodKeys.reduce(
    (sum, k) => sum + ((data.paymentMethodBreakdown && data.paymentMethodBreakdown[k]) || 0),
    0
  );

  let accumulatedPercent = 0;
  const donutSlices = methodKeys.map((k) => {
    const count = (data.paymentMethodBreakdown && data.paymentMethodBreakdown[k]) || 0;
    const percent = totalMethodTransactions > 0 ? (count / totalMethodTransactions) * 100 : 0;
    const circumference = 2 * Math.PI * 65; // radius = 65 => 408.4
    const dashLength = (percent / 100) * circumference;
    const dashOffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += percent;
    return {
      key: k,
      count,
      percent: Math.round(percent),
      revenue: (data.paymentMethodRevenue && data.paymentMethodRevenue[k]) || 0,
      color: methodColors[k] || "#64748b",
      dashArray: `${dashLength} ${circumference - dashLength}`,
      dashOffset,
    };
  });

  return (
    <div className="space-y-8 print:p-0">
      {/* 1. Executive Analytics Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{language === "bn" ? "লাইভ প্ল্যাটফর্ম টেলিমেট্রি" : "Live Executive Telemetry Active"}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <BarChart3 className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              <span>{language === "bn" ? "প্ল্যাটফর্ম রিপোর্ট ও অ্যানালিটিক্স" : "Reports & Platform Analytics"}</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
              {language === "bn"
                ? "সাউথইস্ট ইউনিভার্সিটি সিএসই প্ল্যাটফর্মের আর্থিক লেনদেন, ব্যবহারকারী বৃদ্ধি, সাবস্ক্রিপশন প্ল্যান ও একাডেমিক রিসোর্স বিতরণের রিয়েল-টাইম গ্রাফ ও রিপোর্ট।"
                : "Real-time visual telemetry, financial velocity curves, subscription metrics, cohort acquisition, and academic asset distribution."}
            </p>
          </div>

          {/* Quick Actions & Timeframe Switcher */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Timeframe Toggle: 30 Days vs 6 Months */}
            <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setTimeRange("30d")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  timeRange === "30d"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {language === "bn" ? "বিগত ৩০ দিন" : "Last 30 Days"}
              </button>
              <button
                type="button"
                onClick={() => setTimeRange("6m")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  timeRange === "6m"
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {language === "bn" ? "বিগত ৬ মাস" : "Last 6 Months"}
              </button>
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={() => fetchAnalytics(true)}
              disabled={loading}
              title={language === "bn" ? "ডেটা রিফ্রেশ করুন" : "Refresh Analytics"}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === "bn" ? "এক্সপোর্ট CSV" : "Export CSV"}</span>
            </button>

            {/* Print */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{language === "bn" ? "প্রিন্ট রিপোর্ট" : "Print"}</span>
            </button>
          </div>
        </div>

        {/* Section Navigation Pills */}
        <div className="flex items-center gap-2 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
          {[
            { id: "all", label: language === "bn" ? "সকল অ্যানালিটিক্স" : "All Analytics" },
            { id: "financial", label: language === "bn" ? "আর্থিক ও রাজস্ব" : "Financial & Revenue" },
            { id: "users", label: language === "bn" ? "ব্যবহারকারী ও বৃদ্ধি" : "Users & Growth" },
            { id: "academic", label: language === "bn" ? "একাডেমিক কনটেন্ট" : "Academic Content" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id as any)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                categoryFilter === cat.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Top Executive Metric Cards (4 KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Revenue */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-emerald-400 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {language === "bn" ? "মোট প্ল্যাটফর্ম রাজস্ব" : "Total Platform Revenue"}
            </span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              ৳ {data.totalRevenue.toLocaleString()}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center">
                +৳{data.todayRevenue}
              </span>
              <span className="text-slate-400">today</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                ৳{data.monthlyRevenue} this month
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Approval Rate:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {data.paymentApprovalRate}% ({data.approvedPaymentsCount}/{data.totalPayments})
            </span>
          </div>
        </div>

        {/* KPI 2: Total Registered Users */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-blue-400 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {language === "bn" ? "নিবন্ধিত অ্যাকাউন্ট" : "Registered Accounts"}
            </span>
            <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {data.totalUsers}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-blue-600 dark:text-blue-400 font-bold">
                {data.totalStudents} Students
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {data.totalAdmins + data.totalManagers + data.totalSuperAdmins} Staff/Admins
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Account Health:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {data.activeUsersCount} Active / Enabled
            </span>
          </div>
        </div>

        {/* KPI 3: Active Paid Subscribers */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-amber-400 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {language === "bn" ? "সক্রিয় প্রিমিয়াম মেম্বার" : "Active Subscribers"}
            </span>
            <div className="w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {data.activeSubscribersCount}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-amber-600 dark:text-amber-400 font-bold">
                {data.subscriberConversionRate}% Conversion
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {data.pendingPaymentsCount} Pending
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Financial Waivers:</span>
            <span className="font-bold text-purple-600 dark:text-purple-400">
              {data.approvedWaiversCount} Approved (৳{data.totalWaivedAmount})
            </span>
          </div>
        </div>

        {/* KPI 4: Academic Resources Vault */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-purple-400 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {language === "bn" ? "ভেরিফায়েড রিসোর্স ভল্ট" : "Verified Academic Vault"}
            </span>
            <div className="w-9 h-9 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200/60 dark:border-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {data.totalResources}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-purple-600 dark:text-purple-400 font-bold">
                {data.totalNotes} Notes
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {data.totalQuestions} Exam Papers
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Curriculum Breadth:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {data.totalCourses} Courses • {data.totalTeachers} Faculty
            </span>
          </div>
        </div>
      </div>

      {/* 3. PRIMARY GRAPHS ROW: Revenue Trend (Left 7 cols) + Payment Gateways (Right 5 cols) */}
      {(categoryFilter === "all" || categoryFilter === "financial") && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Chart 1: Financial Velocity Area Graph (7 cols) */}
          <div className="lg:col-span-7 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span>
                    {language === "bn" ? "আর্থিক আয় ও প্রবৃদ্ধি ট্রেন্ড" : "Revenue Velocity & Earnings Trend"}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {timeRange === "30d"
                    ? language === "bn"
                      ? "বিগত ৩০ দিনের দৈনিক আয় ও ট্রানজ্যাকশন ভলিউম"
                      : "Daily revenue & transaction volume over the past 30 days"
                    : language === "bn"
                    ? "বিগত ৬ মাসের মাসিক আয় ও সাবস্ক্রিপশন ট্রেন্ড"
                    : "Monthly revenue & subscription trajectory over the past 6 months"}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Approved Payments Only
                </span>
              </div>
            </div>

            {/* Interactive SVG Area Chart */}
            <div className="relative w-full h-64 select-none">
              <svg
                viewBox="0 0 700 240"
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.38" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                  const y = 20 + (1 - pct) * 180;
                  const val = Math.round(pct * maxRevenue);
                  return (
                    <g key={idx}>
                      <line
                        x1="45"
                        y1={y}
                        x2="685"
                        y2={y}
                        stroke="currentColor"
                        className="text-slate-100 dark:text-slate-800"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <text
                        x="38"
                        y={y + 3}
                        textAnchor="end"
                        className="text-[9px] fill-slate-400 font-mono font-medium"
                      >
                        ৳{val}
                      </text>
                    </g>
                  );
                })}

                {/* Construct Smooth Cubic Bezier Curves for Points */}
                {(() => {
                  const pts = activeRevenueTrend.map((p, i) => {
                    const x = 50 + (i / Math.max(activeRevenueTrend.length - 1, 1)) * 630;
                    const y = 200 - (p.value / Math.max(maxRevenue, 1)) * 180;
                    return { x, y, ...p };
                  });

                  if (pts.length === 0) return null;

                  // Polyline / Bezier string
                  let linePath = `M ${pts[0].x} ${pts[0].y}`;
                  for (let i = 0; i < pts.length - 1; i++) {
                    const curr = pts[i];
                    const next = pts[i + 1];
                    const cx = (curr.x + next.x) / 2;
                    linePath += ` C ${cx} ${curr.y}, ${cx} ${next.y}, ${next.x} ${next.y}`;
                  }

                  const areaPath = `${linePath} L ${pts[pts.length - 1].x} 200 L ${pts[0].x} 200 Z`;

                  return (
                    <>
                      {/* Area Fill */}
                      <path d={areaPath} fill="url(#revGrad)" />

                      {/* Line Stroke */}
                      <path
                        d={linePath}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {/* Interactive Point Dots */}
                      {pts.map((pt, idx) => {
                        // Show visible dot for peaks or every few points
                        const isPeak = pt.value > 0;
                        return (
                          <g
                            key={idx}
                            onMouseEnter={() =>
                              setHoveredPoint({
                                x: pt.x,
                                y: pt.y,
                                label: pt.label,
                                value: pt.value,
                                count: pt.secondaryValue,
                                chart: "revenue",
                              })
                            }
                            onMouseLeave={() => setHoveredPoint(null)}
                            className="cursor-pointer group/dot"
                          >
                            {/* Hit Target */}
                            <circle cx={pt.x} cy={pt.y} r="12" fill="transparent" />

                            {/* Visible Dot */}
                            {isPeak && (
                              <>
                                <circle
                                  cx={pt.x}
                                  cy={pt.y}
                                  r="4"
                                  className="fill-emerald-500 stroke-white dark:stroke-slate-900 group-hover/dot:scale-150 transition-transform origin-center"
                                  strokeWidth="2"
                                />
                                <circle
                                  cx={pt.x}
                                  cy={pt.y}
                                  r="8"
                                  className="fill-emerald-500/20 opacity-0 group-hover/dot:opacity-100 transition-opacity"
                                />
                              </>
                            )}
                          </g>
                        );
                      })}
                    </>
                  );
                })()}

                {/* X-Axis Date Labels (skip every few for readability) */}
                {activeRevenueTrend.map((p, i) => {
                  const step = timeRange === "30d" ? 5 : 1;
                  if (i % step !== 0 && i !== activeRevenueTrend.length - 1) return null;
                  const x = 50 + (i / Math.max(activeRevenueTrend.length - 1, 1)) * 630;
                  return (
                    <text
                      key={i}
                      x={x}
                      y="222"
                      textAnchor="middle"
                      className="text-[9px] fill-slate-400 font-mono font-medium"
                    >
                      {p.label}
                    </text>
                  );
                })}
              </svg>

              {/* Floating Tooltip */}
              {hoveredPoint && hoveredPoint.chart === "revenue" && (
                <div
                  className="absolute pointer-events-none -translate-x-1/2 -translate-y-full mb-2 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs shadow-xl border border-slate-700/80 z-20 whitespace-nowrap"
                  style={{
                    left: `${(hoveredPoint.x / 700) * 100}%`,
                    top: `${(hoveredPoint.y / 240) * 100}%`,
                  }}
                >
                  <p className="font-bold text-emerald-400">৳ {hoveredPoint.value.toLocaleString()} BDT</p>
                  <p className="text-[10px] text-slate-300">
                    {hoveredPoint.label} • {hoveredPoint.count} transaction{hoveredPoint.count !== 1 ? "s" : ""}
                  </p>
                </div>
              )}
            </div>

            {/* Chart Footer Quick Stats */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Approved Volume</p>
                <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                  ৳ {data.totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Avg Transaction</p>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  ৳{" "}
                  {data.approvedPaymentsCount > 0
                    ? Math.round(data.totalRevenue / data.approvedPaymentsCount)
                    : 0}
                </p>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Peak Single Day</p>
                <p className="text-sm font-black text-purple-600 dark:text-purple-400 mt-0.5">
                  ৳{" "}
                  {activeRevenueTrend.length > 0
                    ? Math.max(...activeRevenueTrend.map((p) => p.value))
                    : 0}
                </p>
              </div>
            </div>
          </div>

          {/* Chart 2: Payment Gateways & Channels Donut (5 cols) */}
          <div className="lg:col-span-5 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-purple-500" />
                <span>{language === "bn" ? "পেমেন্ট গেটওয়ে বিশ্লেষণ" : "Payment Gateways & Share"}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Breakdown of student payments via bKash, Nagad & Rocket.
              </p>
            </div>

            {/* Donut Chart and Legend */}
            <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
              {/* Donut Ring */}
              <div className="relative w-40 h-40 shrink-0">
                <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                  {/* Background Track */}
                  <circle
                    cx="80"
                    cy="80"
                    r="65"
                    fill="transparent"
                    stroke="currentColor"
                    className="text-slate-100 dark:text-slate-800"
                    strokeWidth="20"
                  />
                  {/* Slices */}
                  {donutSlices.map((s) => (
                    <circle
                      key={s.key}
                      cx="80"
                      cy="80"
                      r="65"
                      fill="transparent"
                      stroke={s.color}
                      strokeWidth="20"
                      strokeDasharray={s.dashArray}
                      strokeDashoffset={s.dashOffset}
                      className="transition-all duration-500"
                    />
                  ))}
                </svg>

                {/* Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {totalMethodTransactions}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Approved
                  </span>
                </div>
              </div>

              {/* Gateway Breakdown Cards */}
              <div className="flex-1 space-y-2.5 w-full">
                {donutSlices.map((s) => (
                  <div
                    key={s.key}
                    className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <div>
                        <p className="text-xs font-black text-slate-900 dark:text-white">
                          {s.key === "BKASH" ? "bKash" : s.key === "NAGAD" ? "Nagad" : "Rocket"}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {s.count} txns • {s.percent}% share
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-900 dark:text-white font-mono">
                        ৳ {s.revenue.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Subscription Plan Popularity Progress */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Subscription Plan Popularity
              </p>
              <div className="space-y-1.5">
                {[
                  {
                    key: "SEMESTER_1",
                    label: "1 Semester (3 Months)",
                    color: "bg-blue-500",
                    count: (data.planBreakdown && data.planBreakdown["SEMESTER_1"]) || 0,
                  },
                  {
                    key: "SEMESTER_2",
                    label: "2 Semesters (6 Months)",
                    color: "bg-emerald-500",
                    count: (data.planBreakdown && data.planBreakdown["SEMESTER_2"]) || 0,
                  },
                  {
                    key: "YEAR_1_UNLIMITED",
                    label: "1 Year Unlimited All Access",
                    color: "bg-purple-500",
                    count: (data.planBreakdown && data.planBreakdown["YEAR_1_UNLIMITED"]) || 0,
                  },
                ].map((plan) => {
                  const pct =
                    data.approvedPaymentsCount > 0
                      ? Math.round((plan.count / data.approvedPaymentsCount) * 100)
                      : 0;
                  return (
                    <div key={plan.key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {plan.label}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {plan.count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${plan.color} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. SECONDARY GRAPHS ROW: User Growth Velocity (Bar Chart) + Role Governance */}
      {(categoryFilter === "all" || categoryFilter === "users") && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* User Acquisition Bar Chart (7 cols) */}
          <div className="lg:col-span-7 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span>
                    {language === "bn" ? "ব্যবহারকারী সংযোজন ও বৃদ্ধি" : "User Acquisition & Growth"}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {timeRange === "30d"
                    ? "Daily account registrations over the past 30 days"
                    : "Monthly registration cohort expansion over the past 6 months"}
                </p>
              </div>

              <span className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-bold font-mono">
                {data.totalUsers} Total Accounts
              </span>
            </div>

            {/* SVG Bar Chart */}
            <div className="relative w-full h-56 select-none">
              <svg
                viewBox="0 0 700 220"
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                {/* Horizontal Grid */}
                {[0, 0.33, 0.66, 1].map((pct, idx) => {
                  const y = 20 + (1 - pct) * 160;
                  const val = Math.round(pct * maxUserGrowth);
                  return (
                    <g key={idx}>
                      <line
                        x1="35"
                        y1={y}
                        x2="685"
                        y2={y}
                        stroke="currentColor"
                        className="text-slate-100 dark:text-slate-800"
                        strokeDasharray="4 4"
                      />
                      <text
                        x="28"
                        y={y + 3}
                        textAnchor="end"
                        className="text-[9px] fill-slate-400 font-mono font-medium"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Bars */}
                {activeUserTrend.map((p, i) => {
                  const barWidth = Math.max(
                    6,
                    Math.min(18, (630 / Math.max(activeUserTrend.length, 1)) - 4)
                  );
                  const x =
                    45 +
                    (i / Math.max(activeUserTrend.length - 1, 1)) * 630 -
                    barWidth / 2;
                  const barHeight = Math.max(
                    p.value > 0 ? 4 : 0,
                    (p.value / Math.max(maxUserGrowth, 1)) * 160
                  );
                  const y = 180 - barHeight;

                  return (
                    <g
                      key={i}
                      onMouseEnter={() =>
                        setHoveredPoint({
                          x: x + barWidth / 2,
                          y,
                          label: p.label,
                          value: p.value,
                          count: p.secondaryValue,
                          chart: "users",
                        })
                      }
                      onMouseLeave={() => setHoveredPoint(null)}
                      className="cursor-pointer group/bar"
                    >
                      {/* Bar Rectangle */}
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        rx="3"
                        className="fill-blue-500 group-hover/bar:fill-blue-400 transition-colors"
                      />
                    </g>
                  );
                })}

                {/* X-Axis Labels */}
                {activeUserTrend.map((p, i) => {
                  const step = timeRange === "30d" ? 5 : 1;
                  if (i % step !== 0 && i !== activeUserTrend.length - 1) return null;
                  const x = 45 + (i / Math.max(activeUserTrend.length - 1, 1)) * 630;
                  return (
                    <text
                      key={i}
                      x={x}
                      y="205"
                      textAnchor="middle"
                      className="text-[9px] fill-slate-400 font-mono font-medium"
                    >
                      {p.label}
                    </text>
                  );
                })}
              </svg>

              {/* Floating Bar Tooltip */}
              {hoveredPoint && hoveredPoint.chart === "users" && (
                <div
                  className="absolute pointer-events-none -translate-x-1/2 -translate-y-full mb-2 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs shadow-xl border border-slate-700/80 z-20 whitespace-nowrap"
                  style={{
                    left: `${(hoveredPoint.x / 700) * 100}%`,
                    top: `${(hoveredPoint.y / 220) * 100}%`,
                  }}
                >
                  <p className="font-bold text-blue-400">
                    +{hoveredPoint.value} New Account{hoveredPoint.value !== 1 ? "s" : ""}
                  </p>
                  <p className="text-[10px] text-slate-300">{hoveredPoint.label}</p>
                </div>
              )}
            </div>
          </div>

          {/* User Role & Governance Breakdown (5 cols) */}
          <div className="lg:col-span-5 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>{language === "bn" ? "ব্যবহারকারী রোল ও গভর্ন্যান্স" : "Role Distribution & Access"}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Hierarchical RBAC breakdown of registered system actors.
              </p>
            </div>

            {/* Role Cards */}
            <div className="space-y-3">
              {[
                {
                  role: "ROLE_STUDENT",
                  label: "Students",
                  count: data.totalStudents,
                  color: "bg-blue-500",
                  textColor: "text-blue-600 dark:text-blue-400",
                  bgLight: "bg-blue-50 dark:bg-blue-950/40",
                  desc: "Enrolled student learners with course & exam access",
                },
                {
                  role: "ROLE_MANAGER",
                  label: "Exam Managers",
                  count: data.totalManagers,
                  color: "bg-amber-500",
                  textColor: "text-amber-600 dark:text-amber-400",
                  bgLight: "bg-amber-50 dark:bg-amber-950/40",
                  desc: "Moderators managing academic content, reviews & routines",
                },
                {
                  role: "ROLE_ADMIN",
                  label: "Department Admins",
                  count: data.totalAdmins,
                  color: "bg-emerald-500",
                  textColor: "text-emerald-600 dark:text-emerald-400",
                  bgLight: "bg-emerald-50 dark:bg-emerald-950/40",
                  desc: "Administrators managing curriculum, courses & student accounts",
                },
                {
                  role: "ROLE_SUPER_ADMIN",
                  label: "Super Administrators",
                  count: data.totalSuperAdmins,
                  color: "bg-rose-500",
                  textColor: "text-rose-600 dark:text-rose-400",
                  bgLight: "bg-rose-50 dark:bg-rose-950/40",
                  desc: "Full root access: subscription payments & staff permissions",
                },
              ].map((r) => {
                const pct =
                  data.totalUsers > 0
                    ? Math.round((r.count / data.totalUsers) * 100)
                    : 0;
                return (
                  <div
                    key={r.role}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${r.color}`} />
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {r.label}
                        </span>
                      </div>
                      <span className={`text-xs font-black font-mono ${r.textColor}`}>
                        {r.count} ({pct}%)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{r.desc}</p>
                    <div className="w-full h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${r.color} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. ACADEMIC ASSETS & CURRICULUM VAULT BREAKDOWN */}
      {(categoryFilter === "all" || categoryFilter === "academic") && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>
                  {language === "bn"
                    ? "একাডেমিক কনটেন্ট ও রিসোর্স বিতরণ"
                    : "Academic Assets & Curriculum Distribution"}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Breakdown of lecture notes, lab manuals, midterm & final question papers.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <span>{data.totalCourses} Active Courses</span>
              <span>•</span>
              <span>{data.totalTeachers} Faculty Profiled</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Lecture Notes",
                count: data.totalNotes,
                color: "text-blue-600 dark:text-blue-400",
                bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200/60 dark:border-blue-900/40",
              },
              {
                label: "Exam Papers (Mid/Final)",
                count: data.totalQuestions,
                color: "text-purple-600 dark:text-purple-400",
                bg: "bg-purple-50 dark:bg-purple-950/40 border-purple-200/60 dark:border-purple-900/40",
              },
              {
                label: "Course Syllabi & Guides",
                count: (data.resourceTypeBreakdown && data.resourceTypeBreakdown["SYLLABUS"]) || 6,
                color: "text-amber-600 dark:text-amber-400",
                bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-900/40",
              },
              {
                label: "Lab Manuals & Reports",
                count:
                  ((data.resourceTypeBreakdown && data.resourceTypeBreakdown["LAB_MANUAL"]) || 0) +
                  ((data.resourceTypeBreakdown && data.resourceTypeBreakdown["LAB_REPORT"]) || 0) +
                  ((data.resourceTypeBreakdown && data.resourceTypeBreakdown["LAB_FINAL"]) || 0),
                color: "text-emerald-600 dark:text-emerald-400",
                bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-900/40",
              },
            ].map((card, i) => (
              <div
                key={i}
                className={`p-4 rounded-2xl border ${card.bg} space-y-1 text-center sm:text-left`}
              >
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {card.label}
                </p>
                <p className={`text-2xl font-black ${card.color}`}>{card.count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. RECENT TRANSACTIONS & REVENUE AUDIT TABLE */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span>
                {language === "bn" ? "সাম্প্রতিক পেমেন্ট অডিট লগ" : "Recent Payment Transactions Audit"}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Top recorded subscription orders with real-time audit verification status.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-72">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={transactionSearch}
                onChange={(e) => setTransactionSearch(e.target.value)}
                placeholder="Search by student, TrxID, gateway..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80 dark:border-slate-700/80">
              <tr>
                <th className="py-3 px-3.5">Student / User</th>
                <th className="py-3 px-3">Plan Package</th>
                <th className="py-3 px-3">Gateway</th>
                <th className="py-3 px-3">Amount</th>
                <th className="py-3 px-3">Transaction ID</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3.5">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx: any) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-900 dark:text-white leading-tight">
                        {tx.userName}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-44">{tx.userEmail}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {tx.planType === "SEMESTER_1"
                          ? "1 Semester"
                          : tx.planType === "SEMESTER_2"
                          ? "2 Semesters"
                          : "1 Year Unlimited"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono ${
                          tx.paymentMethod === "BKASH"
                            ? "bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20"
                            : tx.paymentMethod === "NAGAD"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                        }`}
                      >
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold font-mono text-slate-900 dark:text-white">
                        ৳ {tx.amount}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {tx.transactionId}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          tx.status === "APPROVED"
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40"
                            : tx.status === "PENDING"
                            ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40"
                            : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40"
                        }`}
                      >
                        {tx.status === "APPROVED" ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : tx.status === "PENDING" ? (
                          <Clock className="w-3 h-3" />
                        ) : (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        <span>{tx.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {tx.createdAt}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No transactions match your search filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
