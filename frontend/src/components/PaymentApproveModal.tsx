"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, ShieldAlert, X, Copy, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "sonner";

interface PaymentApproveModalProps {
  isOpen: boolean;
  payment: any | null;
  onClose: () => void;
  onConfirm: (paymentId: number, notes: string) => Promise<void>;
  isLoading?: boolean;
}

export default function PaymentApproveModal({
  isOpen,
  payment,
  onClose,
  onConfirm,
  isLoading = false,
}: PaymentApproveModalProps) {
  const { language } = useLanguage();
  const [notes, setNotes] = useState<string>("Verified with bKash/Nagad statement & approved by Super Admin");
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && payment) {
      setNotes("Verified with bKash/Nagad statement & approved by Super Admin");
      setCopied(false);
    }
  }, [isOpen, payment]);

  if (!isOpen || !payment) return null;

  const handleCopyTrx = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard && payment.transactionId) {
      navigator.clipboard.writeText(payment.transactionId);
      setCopied(true);
      toast.success(language === "bn" ? "TrxID কপি করা হয়েছে!" : "TrxID copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConfirmClick = async () => {
    await onConfirm(payment.id, notes.trim());
  };

  const planLabel =
    payment.planType === "YEAR_1_UNLIMITED"
      ? language === "bn"
        ? "১-বছর আনলিমিটেড অল কোর্স পাস"
        : "1-Year Annual Pass"
      : payment.planType === "SEMESTER_2"
      ? language === "bn"
        ? "২-সেমিস্টার প্ল্যান"
        : "2-Semesters Plan"
      : language === "bn"
      ? "১-সেমিস্টার প্ল্যান"
      : "1-Semester Plan";

  const quotaLabel =
    payment.planType === "YEAR_1_UNLIMITED"
      ? language === "bn"
        ? "সকল ৮৫+ কোর্সে আনলিমিটেড এক্সেস (৩৬৫ দিন)"
        : "Unlimited All 85+ Courses (1 Year / 365 Days)"
      : payment.planType === "SEMESTER_2"
      ? language === "bn"
        ? "১২টি কোর্স আনলক কোটা (১৮০ দিন)"
        : "12 Course Unlocks Quota (6 Months / 180 Days)"
      : language === "bn"
      ? "৬টি কোর্স আনলক কোটা (৯০ দিন)"
      : "6 Course Unlocks Quota (3 Months / 90 Days)";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl border border-emerald-500/30 bg-white dark:bg-[#0c1427] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0 shadow-xs">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {language === "bn" ? "পেমেন্ট অনুমোদন ও সাবস্ক্রিপশন নিশ্চিতকরণ" : "Confirm Payment Approval"}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {language === "bn"
                  ? "কোর্স কোটা প্রদানের পূর্বে ট্রানজেকশন তথ্য মিলিয়ে নিশ্চিত করুন"
                  : "Verify student transaction details before granting premium access."}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Student Overview Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {language === "bn" ? "স্টুডেন্ট একাউন্ট বিবরণ" : "Student Account"}
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {payment.user?.name || "Student"}
                </h4>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {payment.user?.email}
                </p>
              </div>
              {payment.user?.studentId && (
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">
                    {language === "bn" ? "স্টুডেন্ট আইডি" : "Student ID"}
                  </span>
                  <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-300 dark:border-slate-700">
                    {payment.user.studentId}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Plan & Amount Summary Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                {language === "bn" ? "সিলেক্টেড প্ল্যান" : "Selected Plan"}
              </span>
              <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>{planLabel}</span>
              </div>
              <span className="text-[11px] text-purple-700 dark:text-purple-300 block font-medium">
                {quotaLabel}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                {language === "bn" ? "পরিশোধিত অর্থ" : "Amount to Verify"}
              </span>
              <div className="font-black text-2xl text-emerald-600 dark:text-emerald-400">
                ৳{payment.amount}
              </div>
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 block">
                Via {payment.paymentMethod}
              </span>
            </div>
          </div>

          {/* Transaction ID & Phone verification row */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {language === "bn" ? "প্রেরক নম্বর:" : "Sender Mobile:"}
              </span>
              <strong className="font-mono text-slate-900 dark:text-white">{payment.senderPhone}</strong>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">
                {language === "bn" ? "ট্রানজেকশন আইডি:" : "Transaction ID (TrxID):"}
              </span>
              <div className="flex items-center gap-1.5">
                <strong className="font-mono text-sm text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-lg border border-blue-500/30">
                  {payment.transactionId}
                </strong>
                <button
                  type="button"
                  onClick={handleCopyTrx}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Copy TrxID"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {payment.createdAt && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">
                  {language === "bn" ? "জমা দেওয়ার সময়:" : "Submitted At:"}
                </span>
                <span className="text-slate-600 dark:text-slate-300">
                  {new Date(payment.createdAt).toLocaleString()}
                </span>
              </div>
            )}

            {payment.slipUrl && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  {language === "bn" ? "পেমেন্ট স্লিপ:" : "Payment Slip:"}
                </span>
                <a
                  href={payment.slipUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-500 hover:underline"
                >
                  <span>{language === "bn" ? "স্লিপ ছবি দেখুন" : "View Slip Screenshot"}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Admin Approval Memo / Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {language === "bn" ? "অ্যাডমিন অনুমোদন মন্তব্য / নোট:" : "Admin Approval Memo / Notes:"}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Verified with statement & approved"
              disabled={isLoading}
              className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 disabled:opacity-50"
            />
          </div>

          {/* Enterprise Security Notice */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-800 dark:text-amber-300 leading-relaxed space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{language === "bn" ? "সুপার অ্যাডমিন ক্লিয়ারেন্স নিশ্চয়তা" : "Super Admin Security Clearance"}</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              {language === "bn"
                ? "অনুমোদন কনফার্ম করার সাথে সাথে স্টুডেন্টের সাবস্ক্রিপশন সক্রিয় হবে, কোর্স আনলক কোটা যুক্ত হবে, লাইভ সিঙ্ক আপডেট হবে এবং অফিসিয়াল কনফার্মেশন ইমেইল পাঠানো হবে।"
                : "Confirming will instantly activate the subscription, allocate course unlock quota, broadcast real-time sync, and dispatch an official confirmation email to the student."}
            </p>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {language === "bn" ? "বাতিল" : "Cancel"}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={handleConfirmClick}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{language === "bn" ? "অনুমোদন হচ্ছে..." : "Activating Plan..."}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{language === "bn" ? "নিশ্চিত করুন ও অনুমোদন দিন" : "Confirm & Approve Payment"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
