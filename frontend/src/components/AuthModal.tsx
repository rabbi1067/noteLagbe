"use client";

import React, { useState } from "react";
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
  Phone
} from "lucide-react";
import { toast } from "sonner";
import { notifyDataChanged } from "@/lib/sync";
import { api } from "@/lib/api";

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

  // Forgot password specific state
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [verifiedAccount, setVerifiedAccount] = useState<{
    name: string;
    email: string;
    studentId?: string;
    resetToken: string;
  } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  if (!showAuthModal) return null;

  const isRegister = authMode === "register";
  const isForgot = authMode === "forgot";

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

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanForgotEmail = forgotEmail.trim().toLowerCase();

    if (!cleanForgotEmail) {
      toast.error(language === "bn" ? "অনুগ্রহ করে আপনার রেজিস্টার্ড ইমেইল দিন।" : "Please enter your registered email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanForgotEmail)) {
      toast.error(language === "bn" ? "সঠিক ইমেইল ফরম্যাট দিন (e.g. name@seu.edu.bd)।" : "Please enter a valid email address (e.g. name@seu.edu.bd).");
      return;
    }

    setForgotLoading(true);
    try {
      const res = await api.auth.forgotPassword(cleanForgotEmail);
      if (res && res.success && res.resetToken) {
        setVerifiedAccount({
          name: res.name || "Student",
          email: res.email || cleanForgotEmail,
          studentId: res.studentId,
          resetToken: res.resetToken,
        });
        toast.success(language === "bn" ? `অ্যাকাউন্ট ভেরিফাইড! (${res.name || cleanForgotEmail}) নতুন পাসওয়ার্ড দিন।` : `Account verified! (${res.name || cleanForgotEmail}) Please set your new password.`);
      } else {
        toast.error(res.message || (language === "bn" ? "এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি।" : "No account was found with this email address."));
      }
    } catch (err: any) {
      const errMsg = err?.message || (language === "bn" ? "ডাটাবেজে এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি।" : "No account found with this email in the database.");
      if (err?.code !== "ACCOUNT_BLOCKED" && !err?.blocked) { toast.error(errMsg); }
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedAccount) return;

    if (!newPassword || newPassword.trim().length < 6) {
      toast.error(language === "bn" ? "নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।" : "New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(language === "bn" ? "পাসওয়ার্ড দুটি মেলেনি! দয়া করে আবার চেক করুন।" : "Passwords do not match! Please check again.");
      return;
    }

    setResetLoading(true);
    try {
      const res = await api.auth.resetPassword({
        email: verifiedAccount.email,
        resetToken: verifiedAccount.resetToken,
        newPassword: newPassword.trim(),
      });

      if (res && res.success) {
        toast.success(language === "bn" ? "পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে! এখন লগইন করুন।" : "Password updated successfully! Please sign in now.");
        setEmail(verifiedAccount.email);
        setPassword(newPassword.trim());
        setVerifiedAccount(null);
        setNewPassword("");
        setConfirmPassword("");
        setAuthMode("signin");
      } else {
        toast.error(res.message || (language === "bn" ? "পাসওয়ার্ড পরিবর্তন করা যায়নি।" : "Unable to update password."));
      }
    } catch (err: any) {
      if (err?.code !== "ACCOUNT_BLOCKED" && !err?.blocked) { toast.error(err?.message || (language === "bn" ? "পাসওয়ার্ড রিসেট করতে সমস্যা হয়েছে।" : "Failed to reset password. Please try again.")); }
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
          onClick={() => setShowAuthModal(false)}
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
              ? "Reset Your Password" 
              : isRegister 
                ? "Create Student Account" 
                : "Welcome to NoteLagbe"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isForgot
              ? "Enter your university email to recover your access"
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
            {verifiedAccount ? (
              /* STEP 2: ACCOUNT VERIFIED IN DATABASE -> SET NEW PASSWORD */
              <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
                <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-xs font-bold text-blue-950 dark:text-blue-200">
                      {language === "bn" ? "অ্যাকাউন্ট ভেরিফাইড (ডাটাবেজ)" : "Database Verified Account"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300">
                    <p className="font-semibold text-slate-900 dark:text-white">{verifiedAccount.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{verifiedAccount.email}</p>
                    {verifiedAccount.studentId && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-[10px] font-bold text-blue-800 dark:text-blue-300">
                        ID: {verifiedAccount.studentId}
                      </span>
                    )}
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
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
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all shadow-md shadow-blue-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {resetLoading ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Save New Password & Sign In
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVerifiedAccount(null);
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  className="w-full py-2 px-4 rounded-xl font-semibold text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Change Email / Start Over
                </button>
              </form>
            ) : (
              /* STEP 1: VERIFY EMAIL IN DATABASE */
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Registered University Email <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. 2022100010045@seu.edu.bd or name@seu.edu.bd"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
                    <Info className="w-3 h-3 text-blue-500 shrink-0" />
                    {language === "bn"
                    ? "শুধুমাত্র ডাটাবেজে রেজিস্টার্ড ইমেইল থাকলেই পাসওয়ার্ড রিসেট করা যাবে।"
                    : "Password reset is only available for emails registered in the database."}
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
                      Verify Email in Database
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setAuthMode("signin")}
                  className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Return to Sign In
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
              className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all shadow-md shadow-blue-500/25 disabled:opacity-50 mt-2 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : isRegister ? (
                "Complete Student Registration"
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
