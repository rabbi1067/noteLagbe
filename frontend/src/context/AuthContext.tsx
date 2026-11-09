"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, setToken, removeToken } from "@/lib/api";
import { subscribeToSync, SyncPayload } from "@/lib/sync";
import { toast } from "sonner";

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
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  showSpotlight: boolean;
  setShowSpotlight: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showSpotlight, setShowSpotlight] = useState<boolean>(false);

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

  const refreshProfile = async () => {
    try {
      const profile = await api.auth.getMe();
      setUser(profile);
      if (typeof window !== "undefined") {
        localStorage.setItem("notelagbe_user", JSON.stringify(profile));
      }
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("401") || msg.includes("403") || msg.includes("Unauthorized") || msg.includes("Forbidden")) {
        logout(false);
      }
    }
  };

  useEffect(() => {
    const storedToken = getToken();
    if (storedToken) {
      setTokenState(storedToken);
      try {
        const savedUser = localStorage.getItem("notelagbe_user");
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          if (parsed && parsed.name) setUser(parsed);
        }
      } catch {}
      refreshProfile().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

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

  // Universal Live Sync: Automatically keep user profile, subscription, and quota in sync across tabs
  useEffect(() => {
    const handleSync = (payload: SyncPayload) => {
      if (
        payload.entity === "payment" ||
        payload.entity === "waiver" ||
        payload.entity === "subscription" ||
        payload.entity === "contribution" ||
        payload.entity === "user" ||
        payload.entity === "staff" ||
        payload.entity === "all"
      ) {
        if (getToken()) {
          if (payload.entity === "user" && (payload.action === "blocked" || payload.action === "deleted")) {
            const currentUserId = user?.id;
            if (payload.data && currentUserId && String(payload.data) === String(currentUserId)) {
              logout();
              toast.error(payload.action === "blocked"
                ? "Your account has been suspended by an administrator."
                : "Your account has been removed by an administrator.");
              return;
            }
          }
          refreshProfile().catch(() => {});
        }
      }
    };
    return subscribeToSync(handleSync);
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.auth.login({ email, password: pass });
    setToken(res.token);
    setTokenState(res.token);
    await refreshProfile();
    setShowAuthModal(false);
    toast.success(`Welcome back, ${res.name}!`);

    // Strict Role-Based Redirection
    const isStaff = res.role === "ROLE_ADMIN" || res.role === "ROLE_SUPER_ADMIN" || res.role === "ROLE_MANAGER";
    if (isStaff) {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
  };

  const register = async (name: string, email: string, pass: string, studentId?: string, phone?: string) => {
    const res = await api.auth.register({ name, email, password: pass, studentId, phone });
    setToken(res.token);
    setTokenState(res.token);
    await refreshProfile();
    setShowAuthModal(false);
    toast.success("Student account created successfully! Welcome to NoteLagbe.");
    router.push("/dashboard");
  };

  const logout = (showToast: boolean = true) => {
    api.auth.logout().catch(() => {});
    removeToken();
    setTokenState(null);
    setUser(null);
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
        showAuthModal,
        setShowAuthModal,
        showSpotlight,
        setShowSpotlight,
      }}
    >
      {children}
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
