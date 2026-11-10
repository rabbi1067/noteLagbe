"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Bell, 
  Check, 
  CheckCheck,
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ExternalLink,
  BookOpen,
  Calendar,
  Trash2,
  LogIn,
  Layers,
  Inbox,
  Megaphone,
  Radio
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useDataSync } from "@/lib/sync";

export interface CampusNoticeItem {
  id: number;
  text: string;
  type: string;
  link?: string | null;
  active: boolean;
  priority: number;
  startsAt?: string | null;
  expiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return "Just now";
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
}

export default function NotificationBell() {
  const { isAuthenticated, setShowAuthModal } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [campusNotices, setCampusNotices] = useState<CampusNoticeItem[]>([]);
  const [readCampusNoticeIds, setReadCampusNoticeIds] = useState<number[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [filterTab, setFilterTab] = useState<"all" | "unread">("all");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchCampusNotices = async () => {
    try {
      const data = await api.notices.getActive();
      if (Array.isArray(data)) {
        setCampusNotices(data);
        try {
          if (data.length > 0) {
            localStorage.setItem("notelagbe_cached_notices", JSON.stringify(data));
          }
        } catch {}
      }
    } catch {
      // Ignore background fetch error
    }
  };

  const fetchUnreadCount = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.notifications.getUnreadCount();
      setUnreadCount(res.unreadCount || 0);
    } catch {
      // Ignore background poll errors
    }
  };

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const list = await api.notifications.getMy();
      const safeList = Array.isArray(list) ? list : [];
      setNotifications(safeList);
      const unread = safeList.filter((n: any) => !(n.isRead === true || n.read === true)).length;
      setUnreadCount(unread);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  // Initial load: campus notices & read IDs
  useEffect(() => {
    try {
      const storedRead = localStorage.getItem("notelagbe_read_campus_notices");
      if (storedRead) {
        setReadCampusNoticeIds(JSON.parse(storedRead));
      }
      const cached = localStorage.getItem("notelagbe_cached_notices");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const isMock = parsed.some((p: any) => p.text && p.text.includes("Fall 2026 Midterm"));
          if (!isMock) setCampusNotices(parsed);
        }
      }
    } catch {}

    fetchCampusNotices();
    const noticeInterval = setInterval(fetchCampusNotices, 25000);
    return () => clearInterval(noticeInterval);
  }, []);

  // Poll for personal notifications when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 20000); // 20s polling
      const handleFocus = () => {
        fetchUnreadCount();
        fetchCampusNotices();
      };
      window.addEventListener("focus", handleFocus);
      return () => {
        clearInterval(interval);
        window.removeEventListener("focus", handleFocus);
      };
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated]);

  // Real-time synchronization
  useDataSync((payload) => {
    if (!payload || payload.entity === "notice" || payload.entity === "all") {
      fetchCampusNotices();
    }
    if (isAuthenticated && (!payload || payload.entity === "notification" || payload.entity === "all")) {
      fetchUnreadCount();
      if (isOpen) fetchNotifications();
    }
  });

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      fetchCampusNotices();
      if (isAuthenticated) {
        fetchNotifications();
      }
    }
    setIsOpen(!isOpen);
  };

  // Filter active and unexpired campus notices
  const now = Date.now();
  const SKEW_TOLERANCE_MS = 30 * 60 * 1000;
  const activeCampusNotices = (campusNotices || []).filter((n) => {
    if (!n.active) return false;
    if (n.startsAt && (new Date(n.startsAt).getTime() - SKEW_TOLERANCE_MS) > now) return false;
    if (n.expiresAt && new Date(n.expiresAt).getTime() < now) return false;
    return true;
  });

  const unreadCampusCount = activeCampusNotices.filter((n) => !readCampusNoticeIds.includes(n.id)).length;
  const totalBadgeCount = unreadCount + unreadCampusCount;

  const handleCampusNoticeClick = (notice: CampusNoticeItem) => {
    // Mark as read
    if (!readCampusNoticeIds.includes(notice.id)) {
      const updated = [...readCampusNoticeIds, notice.id];
      setReadCampusNoticeIds(updated);
      try {
        localStorage.setItem("notelagbe_read_campus_notices", JSON.stringify(updated));
      } catch {}
    }

    setIsOpen(false);
    if (notice.link && notice.link.trim()) {
      const link = notice.link.trim();
      if (link.startsWith("http://") || link.startsWith("https://")) {
        window.open(link, "_blank", "noopener,noreferrer");
      } else {
        router.push(link);
      }
      return;
    }

    const textLower = (notice.text || "").toLowerCase();
    if (
      textLower.includes("course") ||
      textLower.includes("note") ||
      textLower.includes("exam") ||
      textLower.includes("midterm") ||
      textLower.includes("final") ||
      textLower.includes("routine") ||
      textLower.includes("question") ||
      textLower.includes("paper") ||
      textLower.includes("কোর্স") ||
      textLower.includes("নোট") ||
      textLower.includes("পরীক্ষা")
    ) {
      router.push("/courses");
    }
  };

  const handleMarkAsRead = async (id: number, link?: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await api.notifications.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (link) {
        setIsOpen(false);
        router.push(link);
      }
    } catch {
      if (link) {
        setIsOpen(false);
        router.push(link);
      }
    }
  };

  const handleMarkAllRead = async () => {
    // Mark campus notices as read
    const allNoticeIds = activeCampusNotices.map((n) => n.id);
    const merged = Array.from(new Set([...readCampusNoticeIds, ...allNoticeIds]));
    setReadCampusNoticeIds(merged);
    try {
      localStorage.setItem("notelagbe_read_campus_notices", JSON.stringify(merged));
    } catch {}

    // Mark personal notifications as read
    if (isAuthenticated) {
      try {
        await api.notifications.markAllAsRead();
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true, isRead: true })));
        setUnreadCount(0);
      } catch {}
    }
  };

  const handleDeleteNotification = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.notifications.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      fetchUnreadCount();
    } catch {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const handleClearAll = async () => {
    try {
      await api.notifications.clearAll();
      setNotifications([]);
      setUnreadCount(0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  // Filtered personal notifications list
  const filteredNotifications = notifications.filter((n) => {
    const isRead = n.isRead === true || n.read === true;
    if (filterTab === "unread") return !isRead;
    return true;
  });

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      {/* Bell Action Button */}
      <button
        onClick={handleToggle}
        className={`relative p-2 rounded-xl border transition-all ${
          isOpen
            ? "bg-blue-50 dark:bg-blue-950/60 border-blue-400 text-blue-600 dark:text-blue-400 shadow-sm"
            : totalBadgeCount > 0
            ? "border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:border-blue-500 shadow-sm"
            : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600"
        }`}
        title={totalBadgeCount > 0 ? `${totalBadgeCount} unread notification(s)` : "Notifications"}
        aria-label="View notifications"
      >
        <Bell className="w-4 h-4" />
        {totalBadgeCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white shadow-md animate-pulse">
            {totalBadgeCount > 9 ? "9+" : totalBadgeCount}
          </span>
        )}
      </button>

      {/* Notifications Drawer */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-96 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Notifications
              </span>
              {totalBadgeCount > 0 && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {totalBadgeCount} new
                </span>
              )}
            </div>

            {totalBadgeCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                title="Mark all notifications as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* SECTION: CAMPUS LIVE ANNOUNCEMENTS (Visible to Everyone) */}
          {activeCampusNotices.length > 0 && (
            <div className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0b1220]/60">
              <div className="px-4 py-2 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/40">
                <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Megaphone className="w-3 h-3 text-amber-500 animate-pulse" />
                  <span>Campus Announcements ({activeCampusNotices.length})</span>
                </span>
                <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  LIVE
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/40 max-h-[180px] overflow-y-auto">
                {activeCampusNotices.map((n) => {
                  const isRead = readCampusNoticeIds.includes(n.id);
                  const isAlert = n.type === "ALERT";
                  const isImportant = n.type === "IMPORTANT";
                  const isUpdate = n.type === "UPDATE";

                  return (
                    <div
                      key={`campus-${n.id}`}
                      onClick={() => handleCampusNoticeClick(n)}
                      className={`p-3 transition-colors cursor-pointer flex items-start gap-2.5 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 ${
                        !isRead ? "bg-amber-500/[0.04] dark:bg-amber-500/[0.08]" : ""
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isAlert
                          ? "bg-rose-500/15 text-rose-500"
                          : isImportant
                          ? "bg-amber-500/15 text-amber-500"
                          : isUpdate
                          ? "bg-emerald-500/15 text-emerald-500"
                          : "bg-blue-500/15 text-blue-500"
                      }`}>
                        <Megaphone className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded font-mono ${
                            isAlert
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                              : isImportant
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : isUpdate
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          }`}>
                            {n.type || "INFO"}
                          </span>
                          {!isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ring-2 ring-amber-200 dark:ring-amber-900 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug line-clamp-2">
                          {n.text}
                        </p>
                        <div className="flex items-center justify-between pt-0.5 text-[10px] text-slate-400">
                          <span>{formatRelativeTime(n.createdAt)}</span>
                          <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-0.5 hover:underline">
                            Open <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Unauthenticated Visitor State */}
          {!isAuthenticated ? (
            activeCampusNotices.length > 0 ? (
              <div className="p-4 text-center space-y-2 bg-slate-50/40 dark:bg-slate-900/40">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                  Sign in with your student account to get personal alerts for your course notes & payment receipts.
                </p>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowAuthModal(true);
                  }}
                  className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Student Sign In</span>
                </button>
              </div>
            ) : (
              <div className="p-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400 shadow-sm">
                  <Bell className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    SEU Campus Notifications
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                    Sign in with your student ID to receive instant alerts on course note uploads, solved papers, and payment approvals.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowAuthModal(true);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to NoteLagbe</span>
                </button>
              </div>
            )
          ) : (
            <>
              {/* Filter Tabs & Quick Actions */}
              {notifications.length > 0 && (
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setFilterTab("all")}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                        filterTab === "all"
                          ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-700"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      All ({notifications.length})
                    </button>
                    <button
                      onClick={() => setFilterTab("unread")}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                        filterTab === "unread"
                          ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-700"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      Unread ({unreadCount})
                    </button>
                  </div>

                  {notifications.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="text-[10px] font-semibold text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded"
                      title="Clear all notifications"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Clear all</span>
                    </button>
                  )}
                </div>
              )}

              {/* Notification List Feed */}
              <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading && notifications.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent mx-auto mb-2" />
                    <p className="text-xs">Loading notifications...</p>
                  </div>
                ) : filteredNotifications.length > 0 ? (
                  filteredNotifications.map((n) => {
                    const isRead = n.isRead === true || n.read === true;
                    const isApproved = n.type === "PAYMENT_APPROVED" || n.type === "SUBSCRIPTION_ACTIVATED" || n.type === "WAIVER_APPROVED";
                    const isRejected = n.type === "PAYMENT_REJECTED" || n.type === "WAIVER_REJECTED";
                    const isCalendar = n.type === "CALENDAR" || n.type === "EXAM";
                    const isCourse = n.type === "COURSE_UPDATE" || n.type === "RESOURCE_ADDED";

                    return (
                      <div
                        key={n.id}
                        onClick={() => handleMarkAsRead(n.id, n.link)}
                        className={`group p-3.5 sm:p-4 transition-colors cursor-pointer flex items-start gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 ${
                          !isRead ? "bg-blue-50/50 dark:bg-blue-950/25" : ""
                        }`}
                      >
                        {/* Type Icon Badge */}
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
                            isApproved
                              ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50"
                              : isRejected
                              ? "bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50"
                              : isCalendar
                              ? "bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50"
                              : isCourse
                              ? "bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50"
                              : "bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50"
                          }`}
                        >
                          {isApproved ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : isRejected ? (
                            <AlertCircle className="w-4 h-4" />
                          ) : isCalendar ? (
                            <Calendar className="w-4 h-4" />
                          ) : isCourse ? (
                            <BookOpen className="w-4 h-4" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                        </div>

                        {/* Content Body */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-xs font-bold truncate ${!isRead ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-300"}`}>
                              {n.title}
                            </p>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {!isRead && (
                                <span className="w-2 h-2 rounded-full bg-blue-600 ring-2 ring-blue-200 dark:ring-blue-900 shrink-0" />
                              )}
                              <button
                                onClick={(e) => handleDeleteNotification(n.id, e)}
                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-0.5 rounded transition-all"
                                title="Dismiss notification"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                            {n.message}
                          </p>

                          <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                            <span className="font-mono">
                              {formatRelativeTime(n.createdAt)}
                            </span>
                            {n.link && (
                              <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-0.5 group-hover:underline">
                                View details <ExternalLink className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 px-6 text-center text-slate-400 space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                      {filterTab === "unread" ? <Inbox className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {filterTab === "unread" ? "You're all caught up! 🎉" : "No notifications yet"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {filterTab === "unread" 
                        ? "There are no unread notifications right now."
                        : "Payment updates, course notes, and academic alerts will appear right here."}
                    </p>
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-center flex items-center justify-between px-4">
                <Link
                  href="/tools"
                  onClick={() => setIsOpen(false)}
                  className="text-[11px] font-bold text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
                >
                  <Layers className="w-3 h-3" />
                  <span>Student Tools</span>
                </Link>
                <Link
                  href="/pricing"
                  onClick={() => setIsOpen(false)}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Upgrade Plan &rarr;
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}