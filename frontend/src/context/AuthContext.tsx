"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, setToken, removeToken, warmupBackend } from "@/lib/api";
import { subscribeToSync, SyncPayload } from "@/lib/sync";
import { toast } from "sonner";
import AccountBlockedModal, { AccountBlockedNotice } from "@/components/AccountBlockedModal";

export interface UnlockedCourseDetail {
  id?: number;
  courseId: number;
  courseCode: string;
  courseTitle: string;
  department: string;
  teacherId?: number | null;
  teacherName?: string | null;
  teacherInitial?: string | null;
  source: string;
  unlockedAt: string;
  expiresAt?: string;
  remainingDays: number;
  remainingHours: number;
  isExpired: boolean;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  studentId?: string;
  phone?: string;
  address?: string;
  role: "ROLE_STUDENT" | "ROLE_ADMIN" | "ROLE_MANAGER" | "ROLE_SUPER_ADMIN";
  avatarUrl?: string;
  hasActiveSubscription: boolean;
  planName?: string;
  maxCoursesAllowed: number;
  usedCoursesCount: number;
  remainingCoursesCount: number;
  unlimited: boolean;
  subscriptionExpiresAt?: string;
  unlockedCourseCodes: string[];
  unlockedCourseDetails?: UnlockedCourseDetail[];
  activeAccessRemainingDays?: number;
  activeAccessRemainingHours?: number;
  activeAccessExpiresAt?: string;
  activeAccessSource?: string;
  chatBlocked?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isStudent: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string, studentId?: string, phone?: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  hasUnlocked: (courseCode: string) => boolean;
  hasUnlockedForTeacher: (courseCode: string, teacherId?: number | null) => boolean;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  showSpotlight: boolean;
  setShowSpotlight: (show: boolean) => void;
  blockedNotice: AccountBlockedNotice | null;
  dismissBlockedNotice: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showSpotlight, setShowSpotlight] = useState<boolean>(false);
  const [blockedNotice, setBlockedNotice] = useState<AccountBlockedNotice | null>(null);
  const userRef = useRef<UserProfile | null>(null);
  const lastProfileCheckRef = useRef<number>(0);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Keyboard shortcut Ctrl+K / Cmd+K for Spotlight search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowSpotlight((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const clearLocalSession = useCallback(() => {
    removeToken();
    try {
      localStorage.removeItem("notelagbe_user");
    } catch {}
    userRef.current = null;
    setTokenState(null);
    setUser(null);
  }, []);

  const forceBlockedLogout = useCallback(
    (
      reason: "auto_logout" | "login_denied",
      message?: string,
      email?: string
    ) => {
      const targetEmail = email || userRef.current?.email;
      if (reason === "auto_logout") {
        clearLocalSession();
        setShowAuthModal(false);
        router.push("/");
      }
      setBlockedNotice({
        reason,
        message,
        email: targetEmail,
      });
    },
    [clearLocalSession, router]
  );

  const refreshProfile = useCallback(async () => {
    if (!getToken()) return;
    lastProfileCheckRef.current = Date.now();
    try {
      const profile = await api.auth.getMe();
      setUser(profile);
      userRef.current = profile;
      if (typeof window !== "undefined") {
        localStorage.setItem("notelagbe_user", JSON.stringify(profile));
      }
    } catch (err: any) {
      if (err?.code === "ACCOUNT_BLOCKED" || err?.blocked) {
        forceBlockedLogout("auto_logout", err?.message, userRef.current?.email);
        return;
      }
      const msg = err?.message || "";
      if (
        err?.status === 401 ||
        msg.includes("401") ||
        msg.includes("Unauthorized") ||
        msg.includes("no longer exists")
      ) {
        clearLocalSession();
        router.push("/");
      }
    }
  }, [clearLocalSession, forceBlockedLogout, router]);

  useEffect(() => {
    void warmupBackend();
  }, []);

  useEffect(() => {
    const storedToken = getToken();
    if (storedToken) {
      setTokenState(storedToken);
      try {
        const savedUser = localStorage.getItem("notelagbe_user");
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          if (parsed && parsed.name) {
            setUser(parsed);
            userRef.current = parsed;
          }
        }
      } catch {}
      refreshProfile().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [refreshProfile]);

  // -------------------------------------------------------------
  // Enterprise Inactivity Session Expiry & Security Guardian (OWASP)
  // Auto-logs out when user is inactive to protect unattended lab/campus PCs.
  // Admin / Staff: 20 minutes idle timeout
  // Students: 45 minutes idle timeout
  // -------------------------------------------------------------
  useEffect(() => {
    if (!token || !user) return;

    const isStaff = user.role === "ROLE_ADMIN" || user.role === "ROLE_SUPER_ADMIN" || user.role === "ROLE_MANAGER";
    const IDLE_TIMEOUT_MS = isStaff ? 20 * 60 * 1000 : 45 * 60 * 1000;
    const WARNING_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes before auto-logout

    let lastRecordTime = Date.now();
    let warningToastShown = false;

    // Reset idle timer on any genuine user interaction (throttled to every 2 seconds)
    const recordActivity = () => {
      const now = Date.now();
      if (now - lastRecordTime > 2000) {
        lastRecordTime = now;
        try {
          localStorage.setItem("notelagbe_last_activity", String(now));
        } catch {}
        if (warningToastShown) {
          warningToastShown = false;
          toast.dismiss("inactivity-warn");
        }
      }
    };

    // Ensure current activity baseline is registered immediately
    try {
      if (!localStorage.getItem("notelagbe_last_activity")) {
        localStorage.setItem("notelagbe_last_activity", String(Date.now()));
      }
    } catch {}

    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];
    events.forEach((evt) => window.addEventListener(evt, recordActivity, { passive: true }));

    // Heartbeat check every 10 seconds across all tabs
    const checkInterval = setInterval(() => {
      let storedLast = Date.now();
      try {
        const raw = localStorage.getItem("notelagbe_last_activity");
        if (raw) storedLast = parseInt(raw, 10);
      } catch {}

      const elapsed = Date.now() - storedLast;

      // 1. Session Exceeded Inactivity Limit -> Auto Logout
      if (elapsed >= IDLE_TIMEOUT_MS) {
        clearInterval(checkInterval);
        toast.dismiss("inactivity-warn");
        logout(false);
        toast.error(
          "🔒 Security Session Timeout: You were automatically signed out due to inactivity to protect your account. Please log in again.",
          { duration: 8000 }
        );
        return;
      }

      // 2. Approaching Inactivity Limit (Within 2 minutes) -> Show warning alert
      if (elapsed >= IDLE_TIMEOUT_MS - WARNING_THRESHOLD_MS && !warningToastShown) {
        warningToastShown = true;
        const minutesLeft = Math.ceil((IDLE_TIMEOUT_MS - elapsed) / 60000);
        toast.warning(
          `⚠️ Inactivity Warning: Your session will expire in ${minutesLeft} minute(s) due to inactivity for security. Click anywhere or press a key to stay logged in.`,
          { id: "inactivity-warn", duration: 12000 }
        );
      }
    }, 10000);

    // Cross-tab and 401 session-expired listener
    const handleSessionExpired = () => {
      logout(false);
      toast.info("Session expired or signed out from another tab.");
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "notelagbe_token" && !e.newValue) {
        logout(false);
      }
    };

    window.addEventListener("notelagbe:session-expired", handleSessionExpired);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, recordActivity));
      clearInterval(checkInterval);
      window.removeEventListener("notelagbe:session-expired", handleSessionExpired);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [token, user]);

  // Global listener for ACCOUNT_BLOCKED HTTP interceptor events (works both logged-in and during login attempts)
  useEffect(() => {
    const handleAccountBlockedEvent = (e: Event) => {
      const detail = (e as CustomEvent)?.detail || {};
      const reason: "auto_logout" | "login_denied" =
        detail.reason === "auto_logout" || Boolean(userRef.current)
          ? "auto_logout"
          : "login_denied";
      forceBlockedLogout(reason, detail.message, detail.email || userRef.current?.email);
    };

    window.addEventListener("notelagbe:account-blocked", handleAccountBlockedEvent);
    return () => {
      window.removeEventListener("notelagbe:account-blocked", handleAccountBlockedEvent);
    };
  }, [forceBlockedLogout]);

  // Active session heartbeat & tab visibility check (auto-logs out blocked users even when idle or when SSE is buffered)
  useEffect(() => {
    if (!token || !user) return;

    const verifyIfDue = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (!getToken()) return;
      if (Date.now() - lastProfileCheckRef.current < 5000) return;
      void refreshProfile();
    };

    const heartbeatId = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      if (getToken()) {
        void refreshProfile();
      }
    }, 20000);

    window.addEventListener("focus", verifyIfDue);
    document.addEventListener("visibilitychange", verifyIfDue);

    return () => {
      clearInterval(heartbeatId);
      window.removeEventListener("focus", verifyIfDue);
      document.removeEventListener("visibilitychange", verifyIfDue);
    };
  }, [token, user, refreshProfile]);

  // Universal Live Sync: Automatically keep user profile, subscription, and quota in sync across tabs
  useEffect(() => {
    const handleSync = (payload: SyncPayload) => {
      if (
        payload.entity === "payment" ||
        payload.entity === "waiver" ||
        payload.entity === "subscription" ||
        payload.entity === "contribution" ||
        payload.entity === "course_unlock" ||
        payload.entity === "notification" ||
        payload.entity === "user" ||
        payload.entity === "staff" ||
        payload.entity === "all"
      ) {
        if (getToken()) {
          if (payload.entity === "user" && (payload.action === "blocked" || payload.action === "deleted")) {
            const activeUser = userRef.current;
            if (payload.data && activeUser?.id && String(payload.data) === String(activeUser.id)) {
              if (payload.action === "blocked") {
                forceBlockedLogout(
                  "auto_logout",
                  "An administrator has blocked your account from User Accounts & RBAC. You have been signed out automatically.",
                  activeUser.email
                );
              } else {
                clearLocalSession();
                router.push("/");
                toast.error("Your account has been removed by an administrator.");
              }
              return;
            }
          }
          void refreshProfile();
        }
      }
    };
    return subscribeToSync(handleSync);
  }, [clearLocalSession, forceBlockedLogout, refreshProfile, router]);

  const applySessionFromAuthResponse = useCallback(
    (res: {
      id: number;
      name: string;
      email: string;
      studentId?: string;
      role: UserProfile["role"];
      avatarUrl?: string;
      profile?: UserProfile;
    }) => {
      const nextProfile: UserProfile = res.profile
        ? res.profile
        : {
            id: res.id,
            name: res.name,
            email: res.email,
            studentId: res.studentId,
            role: res.role,
            avatarUrl: res.avatarUrl,
            hasActiveSubscription: false,
            planName: "Free Preview / Expired",
            maxCoursesAllowed: 0,
            usedCoursesCount: 0,
            remainingCoursesCount: 0,
            unlimited: false,
            unlockedCourseCodes: [],
          };
      setUser(nextProfile);
      userRef.current = nextProfile;
      if (typeof window !== "undefined") {
        localStorage.setItem("notelagbe_user", JSON.stringify(nextProfile));
      }
      if (!res.profile) {
        // Hydrate full subscription details asynchronously if backend omitted embedded profile
        void refreshProfile();
      }
    },
    [refreshProfile]
  );

  const login = async (email: string, pass: string) => {
    try {
      const res = await api.auth.login({ email, password: pass });
      setToken(res.token);
      setTokenState(res.token);
      applySessionFromAuthResponse(res);
      setShowAuthModal(false);
      setBlockedNotice(null);
      toast.success(`Welcome back, ${res.name}!`);

      // Strict Role-Based Redirection
      const isStaff = res.role === "ROLE_ADMIN" || res.role === "ROLE_SUPER_ADMIN" || res.role === "ROLE_MANAGER";
      if (isStaff) {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      if (err?.code === "ACCOUNT_BLOCKED" || err?.blocked) {
        setBlockedNotice({
          reason: "login_denied",
          message: err?.message,
          email,
        });
      }
      throw err;
    }
  };

  const register = async (name: string, email: string, pass: string, studentId?: string, phone?: string) => {
    const res = await api.auth.register({ name, email, password: pass, studentId, phone });
    setToken(res.token);
    setTokenState(res.token);
    applySessionFromAuthResponse(res);
    setShowAuthModal(false);
    toast.success("Student account created successfully! Welcome to NoteLagbe.");
    router.push("/dashboard");
  };

  const logout = (showToast: boolean = true) => {
    api.auth.logout().catch(() => {});
    clearLocalSession();
    if (showToast) {
      toast.info("Signed out successfully.");
    }
    router.push("/");
  };

  const hasUnlocked = (courseCode: string): boolean => {
    if (!user) return false;
    const isStaff = user.role === "ROLE_ADMIN" || user.role === "ROLE_SUPER_ADMIN" || user.role === "ROLE_MANAGER";
    if (isStaff) return true;
    if (user.unlimited) return true;
    return user.unlockedCourseCodes?.some(
      (c) => c.toLowerCase() === courseCode.toLowerCase()
    ) ?? false;
  };

  const hasUnlockedForTeacher = (courseCode: string, teacherId?: number | null): boolean => {
    if (hasUnlocked(courseCode)) return true;
    if (!user || teacherId == null) return false;
    return user.unlockedCourseDetails?.some(
      (d) =>
        !d.isExpired &&
        d.courseCode?.toLowerCase() === courseCode.toLowerCase() &&
        d.teacherId != null &&
        Number(d.teacherId) === Number(teacherId)
    ) ?? false;
  };

  const isStaffUser = user?.role === "ROLE_ADMIN" || user?.role === "ROLE_SUPER_ADMIN" || user?.role === "ROLE_MANAGER";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: isStaffUser,
        isSuperAdmin: user?.role === "ROLE_SUPER_ADMIN",
        isStudent: user?.role === "ROLE_STUDENT",
        login,
        register,
        logout,
        refreshProfile,
        hasUnlocked,
        hasUnlockedForTeacher,
        showAuthModal,
        setShowAuthModal,
        showSpotlight,
        setShowSpotlight,
        blockedNotice,
        dismissBlockedNotice: () => setBlockedNotice(null),
      }}
    >
      {children}
      <AccountBlockedModal notice={blockedNotice} onClose={() => setBlockedNotice(null)} />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
