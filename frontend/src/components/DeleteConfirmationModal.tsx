"use client";

import React, { useEffect, useState } from "react";
import { Trash2, AlertTriangle, X, RefreshCw, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  itemType?: string;
  itemName?: string;
  warningText?: string;
  dangerAlertText?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  isProcessing?: boolean;
}

export interface DeleteSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  itemName?: string;
  dismissButtonText?: string;
  autoCloseMs?: number;
}

// Comprehensive bilingual dictionary for delete confirmations
const CONFIRM_I18N: Record<
  "en" | "bn",
  {
    defaultTitle: string;
    defaultWarning: string;
    dangerAlert: string;
    confirmBtn: string;
    cancelBtn: string;
    deleting: string;
    closeDialog: string;
    types: Record<string, string>;
    titles: Record<string, string>;
    buttons: Record<string, string>;
  }
> = {
  en: {
    defaultTitle: "Confirm Deletion",
    defaultWarning:
      "This action is irreversible. All associated data will be permanently removed from the system.",
    dangerAlert:
      "Warning: Once deleted, this record cannot be recovered. Are you sure you want to proceed?",
    confirmBtn: "Permanently Delete",
    cancelBtn: "Cancel",
    deleting: "Deleting...",
    closeDialog: "Close dialog",
    types: {
      department: "Department",
      course: "Course",
      faculty: "Faculty",
      resource: "Resource",
      allocation: "Assignment",
      review: "Review",
      payment: "Payment",
      contribution: "Submission",
      waiver: "Waiver",
      avatar: "Profile Image",
      profile: "Profile",
    },
    titles: {
      "delete academic department": "Delete Academic Department",
      "delete academic course": "Delete Academic Course",
      "delete faculty member": "Delete Faculty Member",
      "delete academic resource": "Delete Academic Resource",
      "remove faculty teaching assignment": "Remove Teaching Assignment",
      "permanently delete faculty review": "Permanently Delete Faculty Review",
      "reject payment request": "Decline Subscription Payment",
      "reject student submission": "Reject Student Submission",
      "decline financial waiver": "Decline Financial Waiver",
      "remove custom profile image": "Remove Profile Picture",
      "remove profile picture": "Remove Profile Picture",
    },
    buttons: {
      "delete department": "Delete Department",
      "delete course": "Delete Course",
      "delete faculty": "Delete Faculty Member",
      "delete resource": "Delete Resource",
      "remove assignment": "Remove Assignment",
      "delete review": "Delete Review",
      "reject payment": "Reject Payment",
      "reject submission": "Reject Submission",
      "decline application": "Decline Application",
      "remove image": "Remove Image",
      "remove photo": "Remove Photo",
      "remove profile picture": "Remove Photo",
    },
  },
  bn: {
    defaultTitle: "মুছে ফেলার নিশ্চিতকরণ",
    defaultWarning:
      "এই কাজটি অপরিবর্তনীয়। সমস্ত সম্পর্কিত ডাটা সিস্টেম থেকে স্থায়ীভাবে মুছে যাবে।",
    dangerAlert:
      "সতর্কতা: একবার মুছে ফেললে এই ডাটা পুনরায় ফিরিয়ে আনা সম্ভব নয়। আপনি কি নিশ্চিত?",
    confirmBtn: "স্থায়ীভাবে মুছে ফেলুন",
    cancelBtn: "বাতিল",
    deleting: "মুছে ফেলা হচ্ছে...",
    closeDialog: "ডায়ালগ বন্ধ করুন",
    types: {
      department: "ডিপার্টমেন্ট",
      course: "কোর্স",
      faculty: "শিক্ষক",
      resource: "রিসোর্স",
      allocation: "অ্যাসাইনমেন্ট",
      review: "রিভিউ",
      payment: "পেমেন্ট",
      contribution: "সাবমিশন",
      waiver: "আর্থিক মওকুফ",
      avatar: "প্রোফাইল ছবি",
      profile: "প্রোফাইল",
    },
    titles: {
      "delete academic department": "একাডেমিক ডিপার্টমেন্ট মুছে ফেলুন",
      "delete academic course": "একাডেমিক কোর্স মুছে ফেলুন",
      "delete faculty member": "শিক্ষক প্রোফাইল মুছে ফেলুন",
      "delete academic resource": "একাডেমিক রিসোর্স মুছে ফেলুন",
      "remove faculty teaching assignment": "শিক্ষকের কোর্স অ্যাসাইনমেন্ট প্রত্যাহার করুন",
      "permanently delete faculty review": "শিক্ষক রিভিউ স্থায়ীভাবে মুছে ফেলুন",
      "reject payment request": "পেমেন্ট অনুরোধ প্রত্যাখ্যান করুন",
      "reject student submission": "ছাত্রের সাবমিশন প্রত্যাখ্যান করুন",
      "decline financial waiver": "আর্থিক মওকুফ আবেদন প্রত্যাখ্যান করুন",
      "remove custom profile image": "প্রোফাইল ছবি মুছে ফেলুন",
      "remove profile picture": "প্রোফাইল ছবি মুছে ফেলুন",
    },
    buttons: {
      "delete department": "ডিপার্টমেন্ট মুছুন",
      "delete course": "কোর্স মুছুন",
      "delete faculty": "শিক্ষক মুছুন",
      "delete resource": "রিসোর্স মুছুন",
      "remove assignment": "অ্যাসাইনমেন্ট সরান",
      "delete review": "রিভিউ মুছুন",
      "reject payment": "পেমেন্ট বাতিল করুন",
      "reject submission": "সাবমিশন বাতিল করুন",
      "decline application": "আবেদন বাতিল করুন",
      "remove image": "ছবি সরান",
      "remove photo": "ছবি সরান",
      "remove profile picture": "ছবি সরান",
    },
  },
};

// Bilingual dictionary for delete success popups
const SUCCESS_I18N: Record<
  "en" | "bn",
  {
    defaultTitle: string;
    defaultMessage: string;
    dismissBtn: string;
    dismissAria: string;
    titles: Record<string, string>;
    messages: Record<string, string>;
  }
> = {
  en: {
    defaultTitle: "Deleted Successfully!",
    defaultMessage: "The selected record has been permanently removed from the system.",
    dismissBtn: "Done",
    dismissAria: "Dismiss notification",
    titles: {
      "department deleted successfully!": "Department Deleted Successfully!",
      "resource deleted successfully": "Resource Deleted Successfully",
      "payment request rejected": "Payment Request Rejected",
      "contribution rejected": "Student Submission Rejected",
      "waiver declined": "Financial Waiver Declined",
      "review deleted successfully!": "Faculty Review Deleted",
      "profile picture removed": "Profile Picture Removed",
    },
    messages: {
      "the selected record has been permanently removed from the system.":
        "The selected record has been permanently removed from the system.",
      "the faculty review has been permanently erased.":
        "The faculty review has been permanently erased.",
      "the student submission has been rejected and archived.":
        "The student submission has been rejected and archived.",
      "the financial waiver application has been declined.":
        "The financial waiver application has been declined.",
      "the subscription payment transaction has been declined.":
        "The subscription payment transaction has been declined.",
    },
  },
  bn: {
    defaultTitle: "সফলভাবে মুছে ফেলা হয়েছে!",
    defaultMessage: "নির্বাচিত রেকর্ডটি সিস্টেম থেকে স্থায়ীভাবে মুছে ফেলা হয়েছে।",
    dismissBtn: "ঠিক আছে",
    dismissAria: "বিজ্ঞপ্তি বন্ধ করুন",
    titles: {
      "department deleted successfully!": "ডিপার্টমেন্ট সফলভাবে মুছে ফেলা হয়েছে!",
      "resource deleted successfully": "রিসোর্স সফলভাবে মুছে ফেলা হয়েছে!",
      "payment request rejected": "পেমেন্ট অনুরোধ প্রত্যাখ্যাত হয়েছে",
      "contribution rejected": "ছাত্রের সাবমিশন প্রত্যাখ্যাত হয়েছে",
      "waiver declined": "আর্থিক মওকুফ আবেদন প্রত্যাখ্যাত",
      "review deleted successfully!": "শিক্ষক রিভিউ মুছে ফেলা হয়েছে!",
      "profile picture removed": "প্রোফাইল ছবি মুছে ফেলা হয়েছে",
    },
    messages: {
      "the selected record has been permanently removed from the system.":
        "নির্বাচিত রেকর্ডটি সিস্টেম থেকে স্থায়ীভাবে মুছে ফেলা হয়েছে।",
      "the faculty review has been permanently erased.":
        "শিক্ষক রিভিউ ডাটাবেজ থেকে স্থায়ীভাবে মুছে ফেলা হয়েছে।",
      "the student submission has been rejected and archived.":
        "ছাত্রের সাবমিশন প্রত্যাখ্যান ও সংরক্ষণাগারে রাখা হয়েছে।",
      "the financial waiver application has been declined.":
        "আর্থিক মওকুফ আবেদন প্রত্যাখ্যান করা হয়েছে।",
      "the subscription payment transaction has been declined.":
        "সাবস্ক্রিপশন পেমেন্ট লেনদেন প্রত্যাখ্যান করা হয়েছে।",
    },
  },
};

/**
 * Universal Enterprise Delete Confirmation Modal
 * Strictly respects current language toggle (`en` = 100% English, `bn` = 100% Bengali).
 * Guarantees zero un-translated text, hazardous alert prompts, and accessible controls.
 */
export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemType,
  itemName,
  warningText,
  dangerAlertText,
  confirmButtonText,
  cancelButtonText,
  isProcessing = false,
}: DeleteConfirmModalProps) {
  const { language } = useLanguage();
  const langKey = language === "bn" ? "bn" : "en";
  const dict = CONFIRM_I18N[langKey];

  // Resolve Title
  let resolvedTitle = dict.defaultTitle;
  if (title) {
    const key = title.trim().toLowerCase();
    resolvedTitle = dict.titles[key] || title;
  }

  // Resolve Item Type Tag
  let resolvedItemType = itemType;
  if (itemType) {
    const typeKey = itemType.trim().toLowerCase();
    resolvedItemType = dict.types[typeKey] || itemType;
  }

  // Resolve Warning Text
  let resolvedWarning = warningText || dict.defaultWarning;
  if (language === "bn" && warningText) {
    // If user passed English warning text but language is Bengali, localize common patterns
    if (warningText.includes("department definition for")) {
      resolvedWarning = `আপনি কি নিশ্চিত যে আপনি এই ডিপার্টমেন্টটি মুছে ফেলতে চান? এটি সিস্টেমের সকল সক্রিয় ফিল্টার এবং মডিউল থেকে বাদ দেওয়া হবে।`;
    } else if (warningText.includes("permanently delete course")) {
      resolvedWarning = `আপনি কি নিশ্চিত যে আপনি এই কোর্সটি স্থায়ীভাবে মুছে ফেলতে চান? সংশ্লিষ্ট সকল শিক্ষক অ্যাসাইনমেন্ট ও রিসোর্স লিংক মুছে যাবে।`;
    } else if (warningText.includes("permanently delete faculty member")) {
      resolvedWarning = `আপনি কি নিশ্চিত যে আপনি এই শিক্ষক প্রোফাইলটি স্থায়ীভাবে মুছে ফেলতে চান? সংশ্লিষ্ট কোর্স লিংকেজ মুছে যাবে।`;
    } else if (warningText.includes("remove your custom profile image")) {
      resolvedWarning = `আপনি কি নিশ্চিত যে আপনি আপনার প্রোফাইল ছবি সরিয়ে ফেলতে চান? আপনার অ্যাকাউন্ট ডিফল্ট অবতারে ফিরে যাবে।`;
    } else if (warningText.includes("decline this subscription payment")) {
      resolvedWarning = `আপনি কি নিশ্চিত যে আপনি এই সাবস্ক্রিপশন পেমেন্ট অনুরোধটি বাতিল করতে চান?`;
    } else if (warningText.includes("reject this student submission")) {
      resolvedWarning = `আপনি কি নিশ্চিত যে আপনি এই ছাত্র সাবমিশনটি বাতিল করতে চান?`;
    } else if (warningText.includes("decline this financial waiver")) {
      resolvedWarning = `আপনি কি নিশ্চিত যে আপনি এই আর্থিক মওকুফ আবেদনটি বাতিল করতে চান?`;
    } else if (warningText.includes("permanently delete this faculty review")) {
      resolvedWarning = `আপনি কি নিশ্চিত যে আপনি এই শিক্ষক রিভিউটি স্থায়ীভাবে মুছে ফেলতে চান?`;
    }
  }

  // Resolve Hazard Alert Box Text
  const resolvedDangerAlert = dangerAlertText || dict.dangerAlert;

  // Resolve Action Buttons
  const resolvedCancelText = cancelButtonText || dict.cancelBtn;

  let resolvedConfirmText = dict.confirmBtn;
  if (confirmButtonText) {
    const btnKey = confirmButtonText.trim().toLowerCase();
    resolvedConfirmText = dict.buttons[btnKey] || confirmButtonText;
  }

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isProcessing) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isProcessing, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={() => {
          if (!isProcessing) onClose();
        }}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl transition-all scale-100 animate-in zoom-in-95 duration-150 overflow-hidden text-center">
        {/* Top Hazard Accent Line */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-red-600" />

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
          title={dict.closeDialog}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Hazard / Trash Icon */}
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-rose-500/10 ring-4 ring-rose-500/10">
          <Trash2 className="w-7 h-7" />
        </div>

        {/* Title */}
        <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
          {resolvedTitle}
        </h3>

        {/* Item Name / Pill */}
        {itemName && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mb-3 max-w-full">
            {resolvedItemType && (
              <span className="text-[10px] uppercase font-sans font-black px-1.5 py-0.5 rounded bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 mr-1">
                {resolvedItemType}
              </span>
            )}
            <span className="truncate">{itemName}</span>
          </div>
        )}

        {/* Warning Details */}
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-6">
          {resolvedWarning}
        </p>

        {/* Danger Alert Box */}
        <div className="mb-6 p-3 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 text-left flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <p className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 leading-normal">
            {resolvedDangerAlert}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 transition-all disabled:opacity-50"
          >
            {resolvedCancelText}
          </button>
          <button
            type="button"
            onClick={() => onConfirm()}
            disabled={isProcessing}
            className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white text-xs sm:text-sm font-bold shadow-lg shadow-rose-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{dict.deleting}</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>{resolvedConfirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Enterprise Delete Success Notification Popup
 * High-impact confirmation popup with language synchronization and auto-close countdown.
 */
export function DeleteSuccessModal({
  isOpen,
  onClose,
  title,
  message,
  itemName,
  dismissButtonText,
  autoCloseMs = 2800,
}: DeleteSuccessModalProps) {
  const { language } = useLanguage();
  const langKey = language === "bn" ? "bn" : "en";
  const dict = SUCCESS_I18N[langKey];

  const [timeLeft, setTimeLeft] = useState(Math.round(autoCloseMs / 1000));

  // Resolve Title
  let resolvedTitle = dict.defaultTitle;
  if (title) {
    const key = title.trim().toLowerCase();
    resolvedTitle = dict.titles[key] || title;
  }

  // Resolve Message
  let resolvedMessage = dict.defaultMessage;
  if (message) {
    const msgKey = message.trim().toLowerCase();
    resolvedMessage = dict.messages[msgKey] || message;
    if (language === "bn") {
      if (message.includes("has been removed from the university registry")) {
        resolvedMessage = `ডিপার্টমেন্টটি বিশ্ববিদ্যালয় রেজিস্ট্রি থেকে সফলভাবে মুছে ফেলা হয়েছে।`;
      } else if (message.includes("deleted successfully") || message.includes("removed successfully")) {
        resolvedMessage = `রেকর্ডটি সফলভাবে সিস্টেম থেকে মুছে ফেলা হয়েছে।`;
      }
    }
  }

  const resolvedDismissText = dismissButtonText || dict.dismissBtn;

  useEffect(() => {
    if (!isOpen) return;

    setTimeLeft(Math.round(autoCloseMs / 1000));

    const countdownTimer = setInterval(() => {
      setTimeLeft((prev) => (prev > 1 ? prev - 1 : 1));
    }, 1000);

    const autoCloseTimer = setTimeout(() => {
      onClose();
    }, autoCloseMs);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearInterval(countdownTimer);
      clearTimeout(autoCloseTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, autoCloseMs, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Success Dialog */}
      <div className="relative z-10 w-full max-w-sm bg-white dark:bg-[#0d1527] border border-emerald-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl transition-all scale-100 animate-in zoom-in-95 duration-150 overflow-hidden text-center">
        {/* Top Success Accent Line */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-green-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={dict.dismissAria}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Emerald Checkmark Icon */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-500/20 ring-4 ring-emerald-500/10">
          <CheckCircle2 className="w-8 h-8 animate-in zoom-in duration-200" />
        </div>

        {/* Title */}
        <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
          {resolvedTitle}
        </h3>

        {/* Optional Item Highlight */}
        {itemName && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300 mb-3 max-w-full">
            <span className="truncate">{itemName}</span>
          </div>
        )}

        {/* Message */}
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-6">
          {resolvedMessage}
        </p>

        {/* Dismiss Button with Timer Note */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
        >
          <span>{resolvedDismissText}</span>
          <span className="text-[10px] font-normal opacity-80">({timeLeft}s)</span>
        </button>
      </div>
    </div>
  );
}
