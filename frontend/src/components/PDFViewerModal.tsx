"use client";

import React, { useState } from "react";
import {
  X,
  Lock,
  Download,
  ShieldAlert,
  Sparkles,
  BookOpen,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  FileText
} from "lucide-react";
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
  const [unlocking, setUnlocking] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 250));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
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

  const displayTitle = resource.title || `${courseCode} Academic Document`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className={`w-full transition-all duration-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden relative ${
          isFullscreen
            ? "fixed inset-0 max-w-none h-full rounded-none"
            : "max-w-5xl h-[92vh] rounded-2xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70">
          <div className="flex items-center gap-2.5 min-w-0 mr-4">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 shrink-0">
              {courseCode}
            </span>
            <div className="min-w-0">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate" title={displayTitle}>
                {displayTitle}
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                {resource.type ? resource.type.replace(/_/g, " ") : "Document"} • {resource.semesterName || "Semester Exam"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isUnlocked && (resource.fileUrl || resource.id) && (
              <>
                <a
                  href={`${secureFileUrl}?preview=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 shadow-sm"
                  title="Open in new window"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Tab</span>
                </a>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-all shadow-md shadow-blue-600/25 cursor-pointer"
                  title="Download File to Device"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="Close Viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-toolbar: Zoom Controls & Fit */}
        {isUnlocked && (resource.fileUrl || resource.id) && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/80 text-xs">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              <span className="font-medium text-[11px]">Interactive Document Viewer</span>
            </div>

            {/* Centered Zoom Bar */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 50}
                className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors cursor-pointer"
                title="Zoom Out (-25%)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                className="px-2 py-0.5 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                title="Reset Zoom to 100%"
              >
                {zoom}%
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 250}
                className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors cursor-pointer"
                title="Zoom In (+25%)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border-l border-slate-200 dark:border-slate-700 ml-0.5"
                title="Reset Fit (100%)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-[11px] text-slate-400 hidden sm:block">
              {isFullscreen ? "Press Esc to exit" : "Use + / - to scale"}
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 relative overflow-auto bg-slate-200/60 dark:bg-slate-950 flex items-start justify-center p-2 sm:p-4">
          {isUnlocked && (resource.fileUrl || resource.id) ? (
            <div
              className="w-full h-full relative flex items-center justify-center transition-transform duration-150 ease-out origin-top"
              style={{
                transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
                transformOrigin: "top center",
                minHeight: zoom > 100 ? `${zoom}%` : "100%",
                minWidth: zoom > 100 ? `${zoom}%` : "100%",
              }}
            >
              {/* Security Watermark Overlay */}
              <div className="absolute inset-0 pointer-events-none z-10 flex flex-wrap items-center justify-around opacity-[0.05] select-none overflow-hidden">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="transform -rotate-45 font-mono text-base font-extrabold text-slate-900 dark:text-white whitespace-nowrap p-8">
                    NoteLagbe • {user?.email || "Student Access"}
                  </div>
                ))}
              </div>

              {/* Embedded Document Frame */}
              <iframe
                src={`${secureFileUrl}?preview=true#toolbar=1&navpanes=0&zoom=${zoom}`}
                className="w-full h-full border-none rounded-xl shadow-lg bg-white"
                title={displayTitle}
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
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
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
