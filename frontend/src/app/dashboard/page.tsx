"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  User,
  BookOpen,
  Sparkles,
  CheckCircle2,
  CreditCard,
  Upload,
  ArrowRight,
  Clock,
  AlertCircle,
  ShieldCheck,
  GraduationCap,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Filter,
  Check,
  Eye,
  EyeOff,
  LayoutGrid,
  List,
  Camera,
  Trash2,
  Settings,
  KeyRound,
  Lock,
  Phone,
  MapPin,
  Save,
  Link as LinkIcon
} from "lucide-react";
import { toast } from "sonner";
import { DeleteConfirmationModal, DeleteSuccessModal } from "@/components/DeleteConfirmationModal";

export default function StudentDashboardPage() {
  const { user, isAuthenticated, isAdmin, refreshProfile, setShowAuthModal } = useAuth();
  const [unlockedCourseDetails, setUnlockedCourseDetails] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [contributions, setContributions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Live Search & Filter Controls
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "THEORY" | "LAB">("ALL");
  const [selectedSemester, setSelectedSemester] = useState<string>("ALL");

  // View Controls (Expand / Collapse & View Mode Toggle)
  const [showAllCourses, setShowAllCourses] = useState(false);
  const [viewMode, setViewMode] = useState<"GRID" | "LIST">("GRID");

  // Navigation Tabs State: "courses" | "profile" | "uploads" | "payments"
  const [activeTab, setActiveTab] = useState<"courses" | "profile" | "uploads" | "payments">("courses");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "profile" || tabParam === "settings") {
        setActiveTab("profile");
      } else if (tabParam === "uploads" || tabParam === "contributions") {
        setActiveTab("uploads");
      } else if (tabParam === "payments" || tabParam === "billing") {
        setActiveTab("payments");
      } else if (tabParam === "courses") {
        setActiveTab("courses");
      }
    }
  }, []);

  const handleSelectTab = (tab: "courses" | "profile" | "uploads" | "payments") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  // Settings & Avatar State
  const [showSettingsCard, setShowSettingsCard] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const [showAvatarUrlInput, setShowAvatarUrlInput] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState("");

  // Profile Edit State
  const [editName, setEditName] = useState(user?.name || "");
  const [editPhone, setEditPhone] = useState(user?.phone || "");
  const [editAddress, setEditAddress] = useState(user?.address || "");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (user) {
      setEditName(user.name || "");
      setEditPhone(user.phone || "");
      setEditAddress(user.address || "");
    }
  }, [user]);

  // Password Change State
  const [studentCurrentPassword, setStudentCurrentPassword] = useState("");
  const [studentNewPassword, setStudentNewPassword] = useState("");
  const [studentConfirmPassword, setStudentConfirmPassword] = useState("");
  const [showStudentCurrentPassword, setShowStudentCurrentPassword] = useState(false);
  const [showStudentNewPassword, setShowStudentNewPassword] = useState(false);
  const [showStudentConfirmPassword, setShowStudentConfirmPassword] = useState(false);
  const [changingStudentPassword, setChangingStudentPassword] = useState(false);

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
      setDeleteConfirmModal((prev) => ({ ...prev, isOpen: false }));
    } catch (err: any) {
      // Handled in caller
    } finally {
      setIsProcessingDelete(false);
    }
  };

  useEffect(() => {
    if (user?.name) {
      setEditName(user.name);
    }
  }, [user?.name]);

  const handleUploadStudentAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploadingAvatar(true);
    try {
      await api.auth.uploadAvatar(file);
      toast.success("Profile picture updated successfully!");
      if (refreshProfile) await refreshProfile();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload profile picture");
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleRemoveStudentAvatar = () => {
    openDeleteConfirm({
      title: "Delete Profile Picture",
      itemType: "Profile Avatar",
      itemName: user?.name || "Student Profile",
      warningText: "Are you sure you want to delete your profile picture? It will be permanently removed from the database and storage, and your profile will revert to the default letter avatar.",
      confirmButtonText: "Permanently Delete",
      onConfirm: async () => {
        setRemovingAvatar(true);
        try {
          await api.auth.removeAvatar();
          toast.success("Profile picture deleted from database successfully.");
          showDeleteSuccess(
            "Profile Picture Deleted!",
            "Your profile picture has been completely deleted from the database.",
            user?.name
          );
          if (refreshProfile) await refreshProfile();
        } catch (err: any) {
          toast.error(err.message || "Failed to remove profile picture");
          throw err;
        } finally {
          setRemovingAvatar(false);
        }
      },
    });
  };

  const handleSaveStudentAvatarUrl = async () => {
    if (!customAvatarUrl.trim()) {
      toast.error("Please enter a valid image URL.");
      return;
    }
    setUploadingAvatar(true);
    try {
      await api.auth.updateProfile({
        name: editName.trim() || user?.name || "Student",
        avatarUrl: customAvatarUrl.trim(),
      });
      setShowAvatarUrlInput(false);
      setCustomAvatarUrl("");
      toast.success("Profile picture URL updated successfully!");
      if (refreshProfile) await refreshProfile();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile picture URL");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdateStudentProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }
    setSavingProfile(true);
    try {
      await api.auth.updateProfile({
        name: editName.trim(),
        phone: editPhone.trim() || undefined,
        address: editAddress.trim() || undefined,
      });
      toast.success("Profile updated successfully!");
      if (refreshProfile) await refreshProfile();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangeStudentPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentCurrentPassword) {
      toast.error("Please enter your current password.");
      return;
    }
    if (studentNewPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (studentNewPassword !== studentConfirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    setChangingStudentPassword(true);
    try {
      const res = await api.auth.changePassword({
        currentPassword: studentCurrentPassword,
        newPassword: studentNewPassword,
      });
      toast.success(res.message || "Password updated successfully!");
      setStudentCurrentPassword("");
      setStudentNewPassword("");
      setStudentConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setChangingStudentPassword(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboard();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user?.unlockedCourseCodes, user?.unlimited]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [allCourses, pData, cData] = await Promise.all([
        api.courses.getAll().catch(() => []),
        api.payments.getMy().catch(() => []),
        api.contributions.getMy().catch(() => []),
      ]);

      const isUnlimited = Boolean(user?.unlimited || isAdmin);
      const myCourses = isUnlimited
        ? (allCourses || [])
        : (allCourses || []).filter((c: any) =>
            c.unlocked || user?.unlockedCourseCodes?.includes(c.code)
          );

      setUnlockedCourseDetails(myCourses);
      setPayments(pData || []);
      setContributions(cData || []);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const isUnlimitedAccess = Boolean(user?.unlimited || isAdmin);

  const theoryCount = useMemo(
    () => unlockedCourseDetails.filter((c) => !c.lab).length,
    [unlockedCourseDetails]
  );
  const labCount = useMemo(
    () => unlockedCourseDetails.filter((c) => c.lab).length,
    [unlockedCourseDetails]
  );

  const availableSemesters = useMemo(() => {
    const sems = new Set<number>();
    let hasElectives = false;
    unlockedCourseDetails.forEach((c) => {
      if (c.semester && c.semester > 0) sems.add(c.semester);
      if (c.electiveGroup) hasElectives = true;
    });
    const sorted = Array.from(sems).sort((a, b) => a - b);
    return { sorted, hasElectives };
  }, [unlockedCourseDetails]);

  const filteredCourses = useMemo(() => {
    return unlockedCourseDetails.filter((c: any) => {
      // Type Filter
      if (typeFilter === "THEORY" && c.lab) return false;
      if (typeFilter === "LAB" && !c.lab) return false;

      // Semester Filter
      if (selectedSemester !== "ALL") {
        if (selectedSemester === "ELECTIVE") {
          if (!c.electiveGroup) return false;
        } else {
          if (String(c.semester) !== selectedSemester) return false;
        }
      }

      // Live Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = c.code?.toLowerCase().includes(q);
        const titleMatch = c.title?.toLowerCase().includes(q);
        const deptMatch = c.department?.toLowerCase().includes(q);
        const semMatch =
          `semester ${c.semester}`.includes(q) || `sem ${c.semester}`.includes(q);
        const electiveMatch =
          c.electiveGroup && `group ${c.electiveGroup.toLowerCase()}`.includes(q);

        if (!codeMatch && !titleMatch && !deptMatch && !semMatch && !electiveMatch) {
          return false;
        }
      }

      return true;
    });
  }, [unlockedCourseDetails, typeFilter, selectedSemester, searchQuery]);

  // View Slicing: If actively filtering or searching, show all matches; otherwise show top 6 with "View All" toggle
  const isFiltering = Boolean(searchQuery.trim() || typeFilter !== "ALL" || selectedSemester !== "ALL");
  const displayedCourses = isFiltering || showAllCourses ? filteredCourses : filteredCourses.slice(0, 6);
  const remainingCount = Math.max(0, filteredCourses.length - 6);

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-32 px-4 text-center space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center shadow-md">
          <User className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Sign In to Student Dashboard</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Please authenticate to view your unlocked course repository, lecture notes, and quota balance.
          </p>
        </div>
        <button
          onClick={() => setShowAuthModal(true)}
          className="px-6 py-2.5 rounded-xl text-xs font-black bg-blue-600 text-white shadow-md hover:bg-blue-700 transition-all"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Admin Quick Action Banner (Shown for staff accounts) */}
      {isAdmin && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-purple-900/15 via-indigo-900/15 to-blue-900/15 border border-purple-200 dark:border-purple-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-600 text-white shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-white">
                Administrator Privileges Active ({user?.role?.replace("ROLE_", "")})
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                You have administrative access to manage faculty materials, approve student subscriptions, and staff accounts.
              </p>
            </div>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-purple-600 hover:bg-purple-700 shadow-md transition-all shrink-0"
          >
            <span>Open Admin Console</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* 1. PROFILE & PLAN HEADER */}
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="relative group shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl uppercase shadow-md shadow-blue-500/20 overflow-hidden border-2 border-blue-400/30">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0) || "S"
              )}
            </div>
            <label
              htmlFor="dash-avatar-upload"
              className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold"
              title="Change Profile Photo"
            >
              <Camera className="w-4 h-4 mb-0.5" />
              <span>{uploadingAvatar ? "..." : "Change"}</span>
            </label>
            <input
              id="dash-avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleUploadStudentAvatar}
              disabled={uploadingAvatar}
              className="hidden"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">{user?.name}</h1>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {user?.role?.replace("ROLE_", "") || "STUDENT"}
              </span>
              <button
                onClick={() => handleSelectTab(activeTab === "profile" ? "courses" : "profile")}
                className={`p-1.5 px-3 rounded-xl border text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-sm ${
                  activeTab === "profile"
                    ? "bg-blue-600 text-white border-blue-500 shadow-blue-500/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
                title="Student Profile, Address, Phone & Password Settings"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="text-[11px]">{activeTab === "profile" ? "Viewing Profile & Security" : "Edit Profile & Settings"}</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {user?.email} {user?.studentId && `• Student ID: ${user.studentId}`}
            </p>

            {/* Quick Contact & Address Information */}
            <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
              <button
                onClick={() => handleSelectTab("profile")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 transition-all text-[11px]"
                title="Click to view or edit contact phone number"
              >
                <Phone className="w-3 h-3 text-blue-500" />
                <span className="font-semibold">
                  {user?.phone ? user.phone : <span className="text-blue-500 font-bold">+ Add Phone</span>}
                </span>
              </button>

              <button
                onClick={() => handleSelectTab("profile")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/40 transition-all text-[11px]"
                title="Click to view or edit address"
              >
                <MapPin className="w-3 h-3 text-rose-500" />
                <span className="font-semibold">
                  {user?.address ? user.address : <span className="text-rose-500 font-bold">+ Add Address</span>}
                </span>
              </button>

              <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                Southeast University Academic Portal
              </span>

              {user?.avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveStudentAvatar}
                  disabled={removingAvatar}
                  className="text-[10px] text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 font-bold hover:underline inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900/60"
                  title="Completely delete profile photo from database"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                  <span>{removingAvatar ? "Deleting..." : "Delete Photo"}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quota Stats Box */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 min-w-[280px] space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-500">Current Plan:</span>
            <span className="font-black text-blue-600 dark:text-blue-400">
              {user?.planName || (isUnlimitedAccess ? "1-Year Annual Pass (৳499)" : "Free Preview")}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-500">Course Quota:</span>
            <span className="font-black text-slate-800 dark:text-slate-200">
              {isUnlimitedAccess
                ? "👑 All Courses Auto-Unlocked"
                : `${user?.usedCoursesCount || 0} / ${user?.maxCoursesAllowed || 0} Unlocked`}
            </span>
          </div>

          {isUnlimitedAccess ? (
            <div className="space-y-1">
              <div className="w-full bg-amber-100 dark:bg-amber-950/60 h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 via-purple-600 to-blue-600 h-full w-full rounded-full animate-pulse" />
              </div>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold text-right flex items-center justify-end gap-1">
                <Sparkles className="w-3 h-3 inline" /> 85+ Courses Available • No Limit
              </p>
            </div>
          ) : user?.maxCoursesAllowed ? (
            <div className="space-y-1">
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, ((user.usedCoursesCount || 0) / user.maxCoursesAllowed) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 text-right">
                {user?.remainingCoursesCount || 0} quota slot(s) remaining
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* 2. DASHBOARD NAVIGATION TABS (SELECTORS) */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 overflow-x-auto shadow-sm">
        <button
          onClick={() => handleSelectTab("courses")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === "courses"
              ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-md font-black"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-900/50"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>My Unlocked Courses</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
            activeTab === "courses"
              ? "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300"
              : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
          }`}>
            {unlockedCourseDetails.length}
          </span>
        </button>

        <button
          onClick={() => handleSelectTab("profile")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === "profile"
              ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-md font-black"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-900/50"
          }`}
        >
          <User className="w-4 h-4 text-blue-500" />
          <span>Student Profile & Settings</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold">
            Edit & Security
          </span>
        </button>

        <button
          onClick={() => handleSelectTab("uploads")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === "uploads"
              ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-md font-black"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-900/50"
          }`}
        >
          <Upload className="w-4 h-4 text-emerald-500" />
          <span>My Uploads & Rewards</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
            activeTab === "uploads"
              ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300"
              : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
          }`}>
            {contributions.length}
          </span>
        </button>

        <button
          onClick={() => handleSelectTab("payments")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === "payments"
              ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-md font-black"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-900/50"
          }`}
        >
          <CreditCard className="w-4 h-4 text-purple-500" />
          <span>Subscription & Billing</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
            activeTab === "payments"
              ? "bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300"
              : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
          }`}>
            {payments.length}
          </span>
        </button>
      </div>

      {/* 2B. STUDENT PROFILE & ACCOUNT SETTINGS CARD (DEDICATED SELECTOR VIEW) */}
      {(activeTab === "profile" || showSettingsCard) && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">Student Profile, Contact Details & Security</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Manage your contact phone number, address, profile picture (with full database deletion), and account password</p>
              </div>
            </div>
            {activeTab !== "profile" && (
              <button
                onClick={() => setShowSettingsCard(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Box: Profile Photo & Personal Information */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-blue-500" />
                  <span>Profile Photo Management</span>
                </span>
                <span className="text-[10px] font-medium text-slate-400">
                  {user?.avatarUrl ? "Custom Avatar Active" : "Default Letter Avatar"}
                </span>
              </h3>

              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-3xl flex items-center justify-center shadow-lg shadow-blue-500/20 overflow-hidden border-2 border-blue-400/30">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      user?.name?.charAt(0) || "S"
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Upload or Manage Profile Photo</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">JPEG, PNG, WEBP, or GIF. Max 5 MB. Deleting completely purges from database.</p>
                  
                  <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start pt-1">
                    <label
                      htmlFor="student-avatar-file-upload"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm cursor-pointer transition-all"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{uploadingAvatar ? "Uploading..." : "Upload Photo"}</span>
                    </label>
                    <input
                      id="student-avatar-file-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleUploadStudentAvatar}
                      disabled={uploadingAvatar}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => setShowAvatarUrlInput(!showAvatarUrlInput)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>URL</span>
                    </button>

                    {user?.avatarUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveStudentAvatar}
                        disabled={removingAvatar}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 transition-colors"
                        title="Delete photo completely from database"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{removingAvatar ? "Deleting..." : "Delete Photo (From DB)"}</span>
                      </button>
                    )}
                  </div>

                  {showAvatarUrlInput && (
                    <div className="flex items-center gap-1.5 w-full mt-2 animate-in fade-in">
                      <input
                        type="url"
                        value={customAvatarUrl}
                        onChange={(e) => setCustomAvatarUrl(e.target.value)}
                        placeholder="https://example.com/avatar.jpg"
                        className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleSaveStudentAvatarUrl}
                        disabled={uploadingAvatar}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-all shrink-0"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Personal Details Form */}
              <form onSubmit={handleUpdateStudentProfile} className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-700/60 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-500" />
                        <span>University Email</span>
                      </span>
                      <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                        Fixed / Non-editable
                      </span>
                    </label>
                    <input
                      type="email"
                      disabled
                      readOnly
                      value={user?.email || ""}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed font-mono select-none"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                      <span>Student ID Number</span>
                      <span className="text-[9px] font-bold text-slate-500 bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.2 rounded">
                        Fixed
                      </span>
                    </label>
                    <input
                      type="text"
                      disabled
                      readOnly
                      value={user?.studentId || "N/A"}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed font-mono select-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-blue-500" />
                      <span>Contact Phone Number</span>
                    </label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="e.g. +880 1700-000000"
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span>Residential Address</span>
                    </label>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="e.g. 251/A Tejgaon, Dhaka-1208"
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-4 py-2 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-sm flex items-center gap-1.5 disabled:opacity-50 transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingProfile ? "Saving..." : "Save Profile Details"}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right Box: Password Security */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-500" />
                  <span>Change Password</span>
                </span>
                <span className="text-[10px] font-medium text-slate-400">Minimum 6 characters</span>
              </h3>

              <form onSubmit={handleChangeStudentPassword} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">Current Password *</label>
                  <div className="relative">
                    <input
                      type={showStudentCurrentPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={studentCurrentPassword}
                      onChange={(e) => setStudentCurrentPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3.5 py-2 pr-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowStudentCurrentPassword(!showStudentCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showStudentCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">New Password (Min 6 chars) *</label>
                  <div className="relative">
                    <input
                      type={showStudentNewPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={studentNewPassword}
                      onChange={(e) => setStudentNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3.5 py-2 pr-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowStudentNewPassword(!showStudentNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showStudentNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">Confirm New Password *</label>
                  <div className="relative">
                    <input
                      type={showStudentConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={studentConfirmPassword}
                      onChange={(e) => setStudentConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3.5 py-2 pr-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowStudentConfirmPassword(!showStudentConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showStudentConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Security Guidelines</span>
                  </p>
                  <p>Never share your student password. You will use this password alongside your University Email ({user?.email}) to authenticate across portals.</p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={changingStudentPassword}
                    className="px-4 py-2 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-500 text-white shadow-sm flex items-center gap-1.5 disabled:opacity-50 transition-all"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{changingStudentPassword ? "Updating..." : "Update Password"}</span>
                  </button>
                </div>
              </form>
            </div>

          </div>
        </div>
      )}

      {/* 3. UNLOCKED COURSES SECTION */}
      {activeTab === "courses" && (
      <div className="space-y-5">
        
        {/* VIP 1-Year Pass Auto-Unlock Banner */}
        {isUnlimitedAccess && (
          <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-blue-500/10 border-2 border-amber-400/40 dark:border-amber-500/30 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-purple-600 text-white shadow-md shadow-amber-500/20 shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60">
                    👑 1-Year Pass Active (৳499)
                  </span>
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    All 85+ Southeast University Courses Auto-Unlocked!
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Congratulations! You have complete, unrestricted access to hand notes, midterm exams, and final question papers across every department and faculty. Use the live search and view toggle below to inspect any course.
                </p>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-3.5 py-2 rounded-2xl border border-amber-200/80 dark:border-amber-800/80">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Full Repository Access</span>
            </div>
          </div>
        )}

        {/* Section Header with View Mode Switch */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              <span>
                My Unlocked Courses ({unlockedCourseDetails.length})
              </span>
              {isUnlimitedAccess && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300/50 dark:border-emerald-800/50">
                  Auto-Unlocked
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isUnlimitedAccess
                ? "Every Southeast University course is active. Filter or live search by course code, title, or semester."
                : "Courses you have unlocked through your subscription quota or contribution rewards."}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* View Mode Toggle: Grid vs Compact List */}
            {unlockedCourseDetails.length > 0 && (
              <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
                <button
                  onClick={() => setViewMode("GRID")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    viewMode === "GRID"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Grid</span>
                </button>
                <button
                  onClick={() => setViewMode("LIST")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    viewMode === "LIST"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  title="List View"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>List</span>
                </button>
              </div>
            )}

            <Link href="/courses" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0">
              Browse All Courses & Teachers &rarr;
            </Link>
          </div>
        </div>

        {/* Live Search & Filter Bar */}
        {unlockedCourseDetails.length > 0 && (
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              
              {/* Search Input Box */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={100}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Live search by code (e.g. CSE347, 181), title (e.g. Networking), department..."
                  className="w-full pl-10 pr-9 py-2.5 text-xs rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Type Filter Buttons (All, Theory, Lab) */}
              <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-bold border border-slate-200 dark:border-slate-700 shrink-0">
                <button
                  onClick={() => setTypeFilter("ALL")}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    typeFilter === "ALL"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  All ({unlockedCourseDetails.length})
                </button>
                <button
                  onClick={() => setTypeFilter("THEORY")}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    typeFilter === "THEORY"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Theory ({theoryCount})
                </button>
                <button
                  onClick={() => setTypeFilter("LAB")}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    typeFilter === "LAB"
                      ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Lab ({labCount})
                </button>
              </div>

              {/* Semester Dropdown */}
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="px-3.5 py-2.5 text-xs rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
              >
                <option value="ALL">All Semesters</option>
                {availableSemesters.sorted.map((sem) => (
                  <option key={sem} value={String(sem)}>
                    Semester {sem}
                  </option>
                ))}
                {availableSemesters.hasElectives && (
                  <option value="ELECTIVE">Elective Courses</option>
                )}
              </select>
            </div>

            {/* Active Result Indicators & Quick Reset */}
            <div className="flex items-center justify-between text-xs pt-1 px-1 text-slate-500 dark:text-slate-400">
              <span>
                Showing <strong className="text-slate-900 dark:text-white">{displayedCourses.length}</strong> of{" "}
                {filteredCourses.length} unlocked courses
                {searchQuery && (
                  <span>
                    {" "}matching &ldquo;<span className="text-blue-600 dark:text-blue-400 font-bold">{searchQuery}</span>&rdquo;
                  </span>
                )}
              </span>

              {(searchQuery || typeFilter !== "ALL" || selectedSemester !== "ALL") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setTypeFilter("ALL");
                    setSelectedSemester("ALL");
                  }}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>Reset Filters</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Course Cards / List View Container */}
        {displayedCourses.length > 0 ? (
          <div className="space-y-6">
            
            {/* GRID VIEW */}
            {viewMode === "GRID" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedCourses.map((c) => (
                  <div
                    key={c.id || c.code}
                    className="p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-500/30 dark:border-emerald-500/20 shadow-sm flex flex-col justify-between hover:border-emerald-500/60 transition-all hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                          {c.code}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Full Access
                        </span>
                      </div>
                      <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100 line-clamp-1">
                        {c.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {c.semester ? `Semester ${c.semester}` : (c.electiveGroup ? `Elective Group ${c.electiveGroup}` : "Core Course")} • {c.credits || 3.0} Credits • {c.lab ? "Lab" : "Theory"}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                      <Link
                        href={`/courses/${c.code}`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 group"
                      >
                        <span>Read Notes & Exams</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* COMPACT LIST VIEW */
              <div className="space-y-2.5">
                {displayedCourses.map((c) => (
                  <div
                    key={c.id || c.code}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-emerald-400/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs font-black px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 shrink-0">
                        {c.code}
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                          {c.title}
                        </h3>
                        <p className="text-[11px] text-slate-500 truncate">
                          {c.semester ? `Semester ${c.semester}` : (c.electiveGroup ? `Elective Group ${c.electiveGroup}` : "Core")} • {c.credits || 3.0} Credits • {c.lab ? "Lab Course" : "Theory Course"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Full Access
                      </span>
                      <Link
                        href={`/courses/${c.code}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all"
                      >
                        <span>Open Course</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* "View All Courses" / "Show Fewer Courses" Expand Button */}
            {!isFiltering && filteredCourses.length > 6 && (
              <div className="text-center pt-2">
                <button
                  onClick={() => setShowAllCourses((prev) => !prev)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all shadow-sm active:scale-95"
                >
                  {showAllCourses ? (
                    <>
                      <span>Show Fewer Courses (Show Top 6)</span>
                      <ChevronUp className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      <span>View All {filteredCourses.length} Unlocked Courses (+{remainingCount} more)</span>
                      <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : unlockedCourseDetails.length > 0 ? (
          /* Empty Search Filter State */
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
            <Search className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              No unlocked courses match &ldquo;{searchQuery}&rdquo;
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Check for typos or try searching with a different course code (e.g. CSE347, CSE181) or keywords.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setTypeFilter("ALL");
                setSelectedSemester("ALL");
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-all"
            >
              Clear Search & Show All ({unlockedCourseDetails.length})
            </button>
          </div>
        ) : (
          /* Empty Initial State */
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
            <div className="space-y-1">
              <p className="text-base font-extrabold text-slate-800 dark:text-slate-200">
                You haven&apos;t unlocked any courses yet
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Get full access to handwritten lecture notes and past midterm/final exam questions with our semester plans (6 courses for ৳99, 12 courses for ৳149, or auto-unlock all courses with the 1-year pass for ৳499), or upload materials to earn 2 free course unlocks.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Link
                href="/pricing"
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-all"
              >
                Choose a Plan (From ৳99)
              </Link>
              <Link
                href="/contribute"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-all border border-emerald-200 dark:border-emerald-800"
              >
                Upload & Get 2 Free
              </Link>
            </div>
          </div>
        )}
      </div>
      )}

      {/* 4. CONTRIBUTIONS & PAYMENTS SUMMARY (Visible on Courses Overview) */}
      {activeTab === "courses" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Contributions */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-500" />
                <span>My Uploads & Rewards</span>
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleSelectTab("uploads")}
                  className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-emerald-600 transition-colors"
                >
                  View All &rarr;
                </button>
                <Link href="/contribute" className="text-xs font-bold text-emerald-600 hover:underline">
                  Submit New
                </Link>
              </div>
            </div>

            <div className="space-y-2.5">
              {contributions.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-xs flex items-center justify-between"
                >
                  <div className="truncate mr-2">
                    <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{item.uploadedResource?.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Reward Courses: {item.requestedCourse1?.code}, {item.requestedCourse2?.code}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                      item.status === "APPROVED"
                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                        : item.status === "PENDING"
                        ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400"
                        : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
              {contributions.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6">No uploads submitted yet.</p>
              )}
            </div>
          </div>

          {/* Payments */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-500" />
                <span>Subscription & Payment History</span>
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleSelectTab("payments")}
                  className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors"
                >
                  View All &rarr;
                </button>
                <Link href="/pricing" className="text-xs font-bold text-blue-600 hover:underline">
                  Upgrade
                </Link>
              </div>
            </div>

            <div className="space-y-2.5">
              {payments.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-xs flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{item.planType}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      TrxID: {item.transactionId} • ৳{item.amount} ({item.paymentMethod})
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${
                      item.status === "APPROVED"
                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                        : item.status === "PENDING"
                        ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400"
                        : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
              {payments.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6">No payment records found.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. DEDICATED UPLOADS TAB */}
      {activeTab === "uploads" && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">My Academic Uploads & Quota Rewards</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Track your uploaded lecture notes, past exam papers, and reward course unlocks.</p>
              </div>
            </div>
            <Link
              href="/contribute"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md transition-all self-start sm:self-auto"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Submit New Material (+2 Free Unlocks)</span>
            </Link>
          </div>

          <div className="space-y-3">
            {contributions.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <p className="font-extrabold text-slate-900 dark:text-white text-sm">
                    {item.uploadedResource?.title || "Academic Contribution"}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Requested Rewards: <strong className="text-slate-700 dark:text-slate-300">{item.requestedCourse1?.code || "N/A"}</strong> and{" "}
                    <strong className="text-slate-700 dark:text-slate-300">{item.requestedCourse2?.code || "N/A"}</strong>
                  </p>
                  {item.adminNote && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                      Admin Review Note: {item.adminNote}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-[11px] font-bold px-3 py-1 rounded-full ${
                      item.status === "APPROVED"
                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800"
                        : item.status === "PENDING"
                        ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800"
                        : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            ))}

            {contributions.length === 0 && (
              <div className="text-center py-12 space-y-3">
                <Upload className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">You haven&apos;t submitted any materials yet.</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">Upload verified Southeast University class notes or exam question papers to earn 2 free course unlocks.</p>
                <Link
                  href="/contribute"
                  className="inline-block px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow-sm"
                >
                  Upload Material Now
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. DEDICATED PAYMENTS TAB */}
      {activeTab === "payments" && (
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">Subscription & Payment History</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">View your active subscription plan, billing receipts, and transaction records.</p>
              </div>
            </div>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md transition-all self-start sm:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Upgrade Plan</span>
            </Link>
          </div>

          <div className="space-y-3">
            {payments.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                      {item.planType}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800">
                      ৳{item.amount}
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] font-mono">
                    Method: {item.paymentMethod || "bKash"} • Transaction ID: {item.transactionId}
                  </p>
                  {item.createdAt && (
                    <p className="text-[10px] text-slate-400">
                      Submitted: {new Date(item.createdAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-[11px] font-bold px-3 py-1 rounded-full ${
                      item.status === "APPROVED"
                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800"
                        : item.status === "PENDING"
                        ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800"
                        : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            ))}

            {payments.length === 0 && (
              <div className="text-center py-12 space-y-3">
                <CreditCard className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No payment records found.</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">You are currently on the Free Preview. Upgrade to unlock courses instantly.</p>
                <Link
                  href="/pricing"
                  className="inline-block px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-sm"
                >
                  View Subscription Plans
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Universal Enterprise Delete Confirmation Modal */}
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
