"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { 
  X, 
  Lock, 
  Mail, 
  User, 
  ShieldCheck, 
  Shield, 
  Sparkles, 
  Eye, 
  EyeOff, 
  KeyRound, 
  ArrowLeft, 
  Send, 
  CheckCircle2,
  Info,
  Phone,
  Clock,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { notifyDataChanged } from "@/lib/sync";
import { api, warmupBackend } from "@/lib/api";

export default function AuthModal() {
  const { showAuthModal, setShowAuthModal, login, register } = useAuth();
  const { language } = useLanguage();
  
  // Modes: "signin" | "register" | "forgot"
  const [authMode, setAuthMode] = useState<"signin" | "register" | "forgot">("signin");
  const [showPassword, setShowPassword] = useState(false);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [studentId, setStudentId] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot password 3-step OTP recovery state
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetStep, setResetStep] = useState<"email" | "code" | "password">("email");
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [codeExpiresIn, setCodeExpiresIn] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [authWaitSeconds, setAuthWaitSeconds] = useState(0);
  const [wakingBackend, setWakingBackend] = useState(false);

  const isAnyAuthPending = loading || forgotLoading || otpLoading || resetLoading;
  const visibleWaitSeconds = isAnyAuthPending ? authWaitSeconds : 0;

  useEffect(() => {
    if (showAuthModal) {
      void warmupBackend();
    }
  }, [showAuthModal]);

  useEffect(() => {
    if (!isAnyAuthPending) return;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      setAuthWaitSeconds(Math.max(1, Math.floor((Date.now() - startedAt) / 1000)));
    }, 1000);
    return () => clearInterval(timer);
  }, [isAnyAuthPending]);

  useEffect(() => {
    const handleBackendWaking = () => setWakingBackend(true);
    window.addEventListener("notelagbe:backend-waking", handleBackendWaking);
    return () => window.removeEventListener("notelagbe:backend-waking", handleBackendWaking);
  }, []);

  useEffect(() => {
    if (!showAuthModal || authMode !== "forgot" || resetStep !== "code") return;
    if (codeExpiresIn <= 0 && resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setCodeExpiresIn((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [showAuthModal, authMode, resetStep, codeExpiresIn > 0, resendCooldown > 0]);

  if (!showAuthModal) return null;

  const isRegister = authMode === "register";
  const isForgot = authMode === "forgot";

  const resetForgotFlow = () => {
    setResetStep("email");
    setOtpCode("");
    setResetToken("");
    setCodeExpiresIn(0);
    setResendCooldown(0);
    setNewPassword("");
    setConfirmPassword("");
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const maskEmail = (raw: string) => {
    const clean = raw.trim();
    const at = clean.indexOf("@");
    if (at <= 2) return clean;
    const local = clean.slice(0, at);
    const domain = clean.slice(at);
    const visibleStart = local.slice(0, Math.min(3, local.length - 1));
    return `${visibleStart}***${domain}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;

    if (!cleanEmail) {
      toast.error("Please enter your email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error("Please enter a valid email address (e.g. name@seu.edu.bd).");
      return;
    }
    if (cleanEmail.length > 100) {
      toast.error("Email address cannot exceed 100 characters.");
      return;
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (cleanPassword.length > 64) {
      toast.error("Password cannot exceed 64 characters.");
      return;
    }

    if (isRegister) {
      const cleanName = name.trim();
      const cleanId = studentId.trim();
      const cleanPhone = phone.trim();

      if (cleanName.length < 2 || cleanName.length > 60) {
        toast.error("Full name must be between 2 and 60 characters.");
        return;
      }

      if (cleanPhone) {
        const digitsOnly = cleanPhone.replace(/\D/g, "");
        if (digitsOnly.length < 10 || digitsOnly.length > 15) {
          toast.error("Please enter a valid phone number (e.g. 01712345678).");
          return;
        }
      }

      if (cleanId && (cleanId.length < 5 || cleanId.length > 20)) {
        toast.error("Student ID must be between 5 and 20 characters.");
        return;
      }

      setAuthWaitSeconds(0);
      setWakingBackend(false);
      setLoading(true);
      try {
        await register(cleanName, cleanEmail, cleanPassword, cleanId || undefined, cleanPhone || undefined);
        notifyDataChanged("user", "created");
        notifyDataChanged("staff", "created");
      } catch (err: any) {
        toast.error(err.message || "Registration failed");
      } finally {
        setLoading(false);
      }
    } else {
      setAuthWaitSeconds(0);
      setWakingBackend(false);
      setLoading(true);
      try {
        await login(cleanEmail, cleanPassword);
      } catch (err: any) {
        if (err?.code !== "ACCOUNT_BLOCKED" && !err?.blocked) { toast.error(err.message || "Authentication failed"); }
      } finally {
        setLoading(false);
      }
    }
  };

  const requestSecurityCode = async (isResend = false) => {
    const cleanForgotEmail = forgotEmail.trim().toLowerCase();

    if (!cleanForgotEmail) {
      toast.error(language === "bn" ? "অনুগ্রহ করে আপনার রেজিস্টার্ড ইমেইল দিন।" : "Please enter your registered email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanForgotEmail)) {
      toast.error(language === "bn" ? "সঠিক ইমেইল ফরম্যাট দিন (e.g. name@seu.edu.bd)।" : "Please enter a valid email address (e.g. name@seu.edu.bd).");
      return;
    }

    setAuthWaitSeconds(0);
    setWakingBackend(false);
    setForgotLoading(true);
    try {
      const res = await api.auth.forgotPassword(cleanForgotEmail);
      if (res && res.success && res.codeSent) {
        setForgotEmail(res.email || cleanForgotEmail);
        setOtpCode("");
        setResetToken("");
        setCodeExpiresIn(res.expiresInSeconds || 600);
        setResendCooldown(res.resendCooldownSeconds || 45);
        setResetStep("code");
        toast.success(
          language === "bn"
            ? isResend
              ? "আপনার ইমেইলে নতুন ৬-ডিজিটের সিকিউরিটি কোড পাঠানো হয়েছে।"
              : "আপনার ইমেইলে ৬-ডিজিটের সিকিউরিটি কোড পাঠানো হয়েছে।"
            : isResend
              ? "A new 6-digit security code has been sent to your email."
              : "A 6-digit security code has been sent to your email."
        );
      } else {
        toast.error(
          res?.message ||
            (language === "bn" ? "এই ইমেইলটি ডাটাবেজে নেই।" : "This email does not exist.")
        );
      }
    } catch (err: any) {
      if (err?.code !== "ACCOUNT_BLOCKED" && !err?.blocked) {
        const rawMsg = typeof err?.message === "string" ? err.message : "";
        const isNotFound = /does not exist|not found|no registered account/i.test(rawMsg);
        toast.error(
          isNotFound
            ? language === "bn"
              ? "এই ইমেইলটি ডাটাবেজে নেই।"
              : "This email does not exist."
            : rawMsg || (language === "bn" ? "সিকিউরিটি কোড পাঠানো যায়নি।" : "Unable to send security code.")
        );
      }
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await requestSecurityCode(false);
  };

  const handleVerifyCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = otpCode.replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      toast.error(language === "bn" ? "৬-ডিজিটের সিকিউরিটি কোড লিখুন।" : "Please enter the 6-digit security code.");
      return;
    }

    setAuthWaitSeconds(0);
    setWakingBackend(false);
    setOtpLoading(true);
    try {
      const res = await api.auth.verifyResetCode({
        email: forgotEmail.trim().toLowerCase(),
        code: cleanCode,
      });
      if (res && res.success && res.verified && res.resetToken) {
        setResetToken(res.resetToken);
        setResetStep("password");
        toast.success(
          language === "bn"
            ? "সিকিউরিটি কোড ভেরিফাইড হয়েছে! এখন নতুন পাসওয়ার্ড দিন।"
            : "Security code verified! You can now set your new password."
        );
      } else {
        toast.error(
          res?.message ||
            (language === "bn" ? "সিকিউরিটি কোডটি সঠিক নয়।" : "Invalid security code.")
        );
      }
    } catch (err: any) {
      if (err?.code !== "ACCOUNT_BLOCKED" && !err?.blocked) {
        toast.error(
          err?.message ||
            (language === "bn" ? "সিকিউরিটি কোড যাচাই করা যায়নি।" : "Failed to verify security code.")
        );
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken) {
      setResetStep("code");
      toast.error(language === "bn" ? "আগে ইমেইলের সিকিউরিটি কোড ভেরিফাই করুন।" : "Please verify your email security code first.");
      return;
    }

    if (!newPassword || newPassword.trim().length < 6) {
      toast.error(language === "bn" ? "নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।" : "New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(language === "bn" ? "পাসওয়ার্ড দুটি মেলেনি! দয়া করে আবার চেক করুন।" : "Passwords do not match! Please check again.");
      return;
    }

    setAuthWaitSeconds(0);
    setWakingBackend(false);
    setResetLoading(true);
    try {
      const cleanEmail = forgotEmail.trim().toLowerCase();
      const res = await api.auth.resetPassword({
        email: cleanEmail,
        resetToken,
        newPassword: newPassword.trim(),
      });

      if (res && res.success) {
        toast.success(language === "bn" ? "পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে! এখন লগইন করুন।" : "Password updated successfully! Please sign in now.");
        setEmail(cleanEmail);
        setPassword(newPassword.trim());
        resetForgotFlow();
        setAuthMode("signin");
      } else {
        toast.error(res.message || (language === "bn" ? "পাসওয়ার্ড পরিবর্তন করা যায়নি।" : "Unable to update password."));
      }
    } catch (err: any) {
      if (err?.code !== "ACCOUNT_BLOCKED" && !err?.blocked) {
        toast.error(err?.message || (language === "bn" ? "পাসওয়ার্ড রিসেট করতে সমস্যা হয়েছে।" : "Failed to reset password. Please try again."));
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 relative max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={() => {
            resetForgotFlow();
            setShowAuthModal(false);
          }}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Close"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-blue-500/25">
            {isForgot ? <KeyRound className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>
          <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {isForgot
              ? language === "bn"
                ? "পাসওয়ার্ড রিসেট করুন"
                : "Reset Your Password"
              : isRegister
                ? "Create Student Account"
                : "Welcome to NoteLagbe"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isForgot
              ? resetStep === "email"
                ? language === "bn"
                  ? "সিকিউরিটি কোড পেতে আপনার রেজিস্টার্ড ইমেইল দিন"
                  : "Enter your registered email to receive a 6-digit security code"
                : resetStep === "code"
                  ? language === "bn"
                    ? "আপনার ইমেইলে পাঠানো ৬-ডিজিটের সিকিউরিটি কোড লিখুন"
                    : "Enter the 6-digit security code sent to your email"
                  : language === "bn"
                    ? "আপনার অ্যাকাউন্টের জন্য নতুন পাসওয়ার্ড সেট করুন"
                    : "Create a strong new password for your account"
              : "Southeast University Academic Resource & Question Archive"}
          </p>
        </div>

        {/* Tab Toggle for Sign In / Register (Hidden in Forgot Password view) */}
        {!isForgot && (
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setAuthMode("signin")}
              className={`py-2 rounded-lg transition-all ${
                !isRegister
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("register")}
              className={`py-2 rounded-lg transition-all ${
                isRegister
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm font-bold"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Student Register
            </button>
          </div>
        )}

        

        {/* FORGOT PASSWORD VIEW */}
        {isForgot ? (
          <div className="space-y-4">
            {/* 3-Step Security Progress Indicator */}
            <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 text-[11px] font-bold">
              {[
                { key: "email", labelEn: "1. Email", labelBn: "১. ইমেইল" },
                { key: "code", labelEn: "2. Code", labelBn: "২. কোড" },
                { key: "password", labelEn: "3. Reset", labelBn: "৩. পাসওয়ার্ড" },
              ].map((step, idx) => {
                const currentIdx = resetStep === "email" ? 0 : resetStep === "code" ? 1 : 2;
                const isDone = idx < currentIdx;
                const isActive = idx === currentIdx;
                return (
                  <div
                    key={step.key}
                    className={`py-1.5 px-2 rounded-xl text-center transition-all ${
                      isActive
                        ? "bg-blue-600 text-white shadow-sm"
                        : isDone
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {language === "bn" ? step.labelBn : step.labelEn}
                  </div>
                );
              })}
            </div>

            {resetStep === "password" ? (
              /* STEP 3: CODE VERIFIED -> SET NEW PASSWORD */
              <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/35 border border-emerald-200 dark:border-emerald-800/60">
                  <div className="flex items-center gap-2 mb-0.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                      {language === "bn" ? "সিকিউরিটি কোড ভেরিফাইড" : "Security Code Verified"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {language === "bn"
                      ? `${maskEmail(forgotEmail)} অ্যাকাউন্টের জন্য নতুন পাসওয়ার্ড দিন।`
                      : `Set a strong new password for ${maskEmail(forgotEmail)}.`}
                  </p>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "bn" ? "নতুন পাসওয়ার্ড" : "New Password"} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      minLength={6}
                      maxLength={64}
                      placeholder={language === "bn" ? "কমপক্ষে ৬ অক্ষর" : "Minimum 6 characters"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value.slice(0, 64))}
                      className="w-full text-xs pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === "bn" ? "নতুন পাসওয়ার্ড নিশ্চিত করুন" : "Confirm New Password"} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      minLength={6}
                      maxLength={64}
                      placeholder={language === "bn" ? "আবার নতুন পাসওয়ার্ড লিখুন" : "Re-enter new password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value.slice(0, 64))}
                      className="w-full text-xs pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all shadow-md shadow-blue-500/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {resetLoading ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      {language === "bn" ? "নতুন পাসওয়ার্ড সেভ করে লগইন করুন" : "Save New Password & Sign In"}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={resetForgotFlow}
                  className="w-full py-2 px-4 rounded-xl font-semibold text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  {language === "bn" ? "ইমেইল পরিবর্তন করুন / আবার শুরু করুন" : "Change Email / Start Over"}
                </button>
              </form>
            ) : resetStep === "code" ? (
              /* STEP 2: VERIFY 6-DIGIT SECURITY CODE FROM EMAIL */
              <form onSubmit={handleVerifyCodeSubmit} className="space-y-3.5">
                <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/35 border border-blue-200 dark:border-blue-800/60 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      {language === "bn" ? "সিকিউরিটি কোড পাঠানো হয়েছে" : "Verification Code Sent"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        codeExpiresIn > 0
                          ? "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300"
                          : "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300"
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      {codeExpiresIn > 0
                        ? formatTimer(codeExpiresIn)
                        : language === "bn"
                          ? "মেয়াদ শেষ"
                          : "Expired"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    {language === "bn"
                      ? `${maskEmail(forgotEmail)} ইমেইলের ইনবক্স (বা স্প্যাম ফোল্ডার) চেক করে ৬-ডিজিটের সিকিউরিটি কোডটি দিন।`
                      : `Check ${maskEmail(forgotEmail)} (including Spam/Junk) and enter the 6-digit security code below.`}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {language === "bn" ? "৬-ডিজিট সিকিউরিটি কোড" : "6-Digit Security Code"} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    maxLength={6}
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full py-3 px-4 text-center text-lg font-mono font-black tracking-[0.55em] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={otpLoading || otpCode.length !== 6}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all shadow-md shadow-blue-500/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {otpLoading ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      {language === "bn" ? "সিকিউরিটি কোড যাচাই করুন" : "Verify Security Code"}
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    disabled={forgotLoading || resendCooldown > 0}
                    onClick={() => requestSecurityCode(true)}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${forgotLoading ? "animate-spin" : ""}`} />
                    {resendCooldown > 0
                      ? language === "bn"
                        ? `${resendCooldown} সেকেন্ড পর আবার পাঠান`
                        : `Resend in ${resendCooldown}s`
                      : language === "bn"
                        ? "নতুন কোড পাঠান"
                        : "Resend Security Code"}
                  </button>

                  <button
                    type="button"
                    onClick={resetForgotFlow}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    {language === "bn" ? "ইমেইল বদলান" : "Change Email"}
                  </button>
                </div>
              </form>
            ) : (
              /* STEP 1: ENTER EMAIL TO RECEIVE SECURITY CODE */
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {language === "bn" ? "রেজিস্টার্ড ইমেইল ঠিকানা" : "Registered Email Address"} <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. 2022100010045@seu.edu.bd or name@gmail.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    {language === "bn"
                      ? "অ্যাকাউন্ট থাকলে আপনার ইমেইলে একটি ৬-ডিজিটের সিকিউরিটি কোড পাঠানো হবে।"
                      : "We will send a 6-digit security verification code to your registered email."}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all shadow-md shadow-blue-500/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {forgotLoading ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      {language === "bn" ? "সিকিউরিটি কোড পাঠান" : "Send Security Code"}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    resetForgotFlow();
                    setAuthMode("signin");
                  }}
                  className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  {language === "bn" ? "সাইন ইন-এ ফিরে যান" : "Return to Sign In"}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* SIGN IN & REGISTER FORM */
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isRegister && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">{name.length}/60</span>
                </div>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={60}
                    placeholder="e.g. Fazle Rabbi"
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 60))}
                    className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  University Email / Email Address <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">{email.length}/100</span>
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  maxLength={100}
                  placeholder="name@seu.edu.bd or personal email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.slice(0, 100))}
                  className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {isRegister && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Student ID (Optional)
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">{studentId.length}/20</span>
                </div>
                <input
                  type="text"
                  maxLength={20}
                  placeholder="e.g. 2022100010045"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 20))}
                  className="w-full text-xs px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            )}

            {isRegister && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Phone Number (Optional)
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">{phone.length}/15</span>
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    maxLength={15}
                    placeholder="e.g. 01712345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9+-\s]/g, "").slice(0, 15))}
                    className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password <span className="text-red-500">*</span>
                </label>
                {authMode === "signin" ? (
                  <button
                    type="button"
                    onClick={() => {
                      resetForgotFlow();
                      setForgotEmail(email);
                      setAuthMode("forgot");
                    }}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-all cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400">Min 6 characters</span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  maxLength={64}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value.slice(0, 64))}
                  className="w-full text-xs pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                  ) : (
                    <Eye className="w-4 h-4 text-slate-400 dark:text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all shadow-md shadow-blue-500/25 disabled:opacity-70 mt-2 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>
                    {wakingBackend || visibleWaitSeconds >= 3
                      ? language === "bn"
                        ? `সার্ভার চালু হচ্ছে... (${visibleWaitSeconds}s)`
                        : `Waking server... (${visibleWaitSeconds}s)`
                      : isRegister
                        ? language === "bn"
                          ? "অ্যাকাউন্ট তৈরি হচ্ছে..."
                          : "Creating account..."
                        : language === "bn"
                          ? "সাইন ইন হচ্ছে..."
                          : "Signing in..."}
                  </span>
                </>
              ) : isRegister ? (
                "Complete Student Registration"
              ) : (
                "Sign In"
              )}
            </button>

            {loading && (wakingBackend || visibleWaitSeconds >= 4) && (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  {language === "bn"
                    ? "সার্ভার স্লিপ মোড থেকে চালু হচ্ছে। প্রথমবার লগইনে সাধারণত ২০–৪৫ সেকেন্ড সময় লাগতে পারে; অনুগ্রহ করে অপেক্ষা করুন।"
                    : "Server is waking up from idle sleep. The first request typically takes 20–45 seconds; please hold on."}
                </span>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
