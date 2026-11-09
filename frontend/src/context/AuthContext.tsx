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
