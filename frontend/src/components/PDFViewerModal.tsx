"use client";

import React from "react";
import { X, Lock, Download, ShieldAlert, Sparkles, BookOpen, ExternalLink } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: any;
  courseCode: string;
  isUnlocked: boolean;
  onUnlockedSuccess: () => void;
}

export default function PDFViewerModal({
  isOpen,
  onClose,
  resource,
  courseCode,
  isUnlocked,
  onUnlockedSuccess,
}: PDFViewerModalProps) {
  const { user, isAuthenticated, setShowAuthModal } = useAuth();
  const [unlocking, setUnlocking] = React.useState(false);

  if (!isOpen || !resource) return null;

  const handleUnlockClick = async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    setUnlocking(true);
    try {
      await api.courses.unlock(courseCode);
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      toast.success(`${courseCode} materials successfully unlocked!`);
      onUnlockedSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to unlock course");
    } finally {
      setUnlocking(false);
    }
  };

  const secureFileUrl = resource?.id ? `/api/resources/${resource.id}/file` : resource?.fileUrl;

  const handleDownload = async () => {
    if (!resource) return;
    try {
      if (resource.id) await api.resources.trackDownload(resource.id);
    } catch {}
    const link = document.createElement("a");
    link.href = resource.id ? `/api/resources/${resource.id}/file?download=true` : (resource.fileUrl || "");
    link.download = "";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="w-full max-w-4xl h-[88vh] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5 truncate mr-4">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
              {courseCode}
            </span>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">
              {resource.title}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isUnlocked && (resource.fileUrl || resource.id) && (
              <>
                <a
                  href={`${secureFileUrl}?preview=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                  title="Open in new window"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Open</span>
                </a>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 relative overflow-hidden bg-slate-100 dark:bg-slate-950">
          
          {isUnlocked && (resource.fileUrl || resource.id) ? (
            <div className="w-full h-full relative">
              {/* Security Watermark Overlay */}
              <div className="absolute inset-0 pointer-events-none z-10 flex flex-wrap items-center justify-around opacity-[0.06] select-none overflow-hidden">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} className="transform -rotate-45 font-mono text-base font-extrabold text-slate-900 dark:text-white whitespace-nowrap p-8">
                    NoteLagbe • {user?.email || "Student Copy"}
                  </div>
                ))}
              </div>

              {/* Embedded Document Frame */}
              <iframe
                src={`${secureFileUrl}?preview=true#toolbar=0`}
                className="w-full h-full border-none"
                title={resource.title}
              />
            </div>
          ) : (
            /* Locked Preview Overlay */
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center relative">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/90 dark:to-slate-900/95 z-0" />

              <div className="relative z-10 max-w-md p-8 rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-md">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-800">
                  <Lock className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mb-2">
                  Material Protected
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                  This lecture note / question paper requires an active plan or unlocked quota for {courseCode}.
                </p>

                <div className="space-y-3">
                  <button
                    onClick={handleUnlockClick}
                    disabled={unlocking}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{unlocking ? "Unlocking..." : "Unlock Course Using Quota"}</span>
                  </button>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    No active quota?{" "}
                    <a href="/pricing" className="text-blue-600 dark:text-blue-400 font-bold underline">
                      Get a 6-Course Plan for ৳99
                    </a>{" "}
                    or{" "}
                    <a href="/contribute" className="text-emerald-600 dark:text-emerald-400 font-bold underline">
                      Upload Notes to Earn +2 Free
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
