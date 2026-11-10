"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Lock,
  Download,
  ShieldCheck,
  Sparkles,
  BookOpen,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Maximize2,
  Minimize2,
  FileText,
  Columns,
  Maximize
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
  isAdminMode?: boolean;
}

export default function PDFViewerModal({
  isOpen,
  onClose,
  resource,
  courseCode,
  isUnlocked,
  onUnlockedSuccess,
  isAdminMode = false,
}: PDFViewerModalProps) {
  const { user, isAuthenticated, setShowAuthModal } = useAuth();
  const [unlocking, setUnlocking] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270 degrees
  const [viewWidthMode, setViewWidthMode] = useState<"narrow" | "wide">("wide");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Admins get download and external new-tab privileges. Regular students read securely on-site.
  const isAdmin = user?.role === "ROLE_ADMIN" || user?.role === "ROLE_SUPER_ADMIN" || user?.role === "ROLE_MANAGER";
  const canDownloadAndOpen = Boolean(isAdminMode || isAdmin);

  // Keyboard accessibility & hotkeys for reading
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "Escape") {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      } else if (e.key === "+" || e.key === "=") {
        setZoom((prev) => Math.min(prev + 20, 300));
      } else if (e.key === "-" || e.key === "_") {
        setZoom((prev) => Math.max(prev - 20, 50));
      } else if (e.key === "0") {
        setZoom(100);
      } else if (e.key === "r" || e.key === "R") {
        setRotation((prev) => (prev + 90) % 360);
      } else if (e.key === "f" || e.key === "F") {
        setIsFullscreen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isFullscreen, onClose]);

  // Reset controls whenever a new resource is opened
  useEffect(() => {
    if (isOpen) {
      setZoom(100);
      setRotation(0);
    }
  }, [isOpen, resource?.id]);

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

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 20, 300));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 20, 50));
  const handleResetZoom = () => setZoom(100);
  const handleRotateClockwise = () => setRotation((prev) => (prev + 90) % 360);
  const handleResetRotation = () => setRotation(0);
  const toggleFullscreen = () => setIsFullscreen((prev) => !prev);

  const secureFileUrl = resource?.id ? `/api/resources/${resource.id}/file` : resource?.fileUrl;

  const handleDownload = async () => {
    if (!resource || !canDownloadAndOpen) return;
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
  const isRotated = rotation % 180 !== 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className={`w-full transition-all duration-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden relative ${
          isFullscreen
            ? "fixed inset-0 max-w-none h-full rounded-none"
            : viewWidthMode === "narrow"
            ? "max-w-3xl h-[92vh] rounded-2xl"
            : "max-w-6xl h-[92vh] rounded-2xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70">
          <div className="flex items-center gap-2.5 min-w-0 mr-4">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 shrink-0">
              {courseCode}
            </span>
            <div className="min-w-0">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate" title={displayTitle}>
                {displayTitle}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                  {resource.type ? resource.type.replace(/_/g, " ") : "Document"} • {resource.semesterName || "Semester Exam"}
                </span>
                {canDownloadAndOpen ? (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    Admin Access
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    <BookOpen className="w-2.5 h-2.5" />
                    Student Reader
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* ONLY ADMINS GET DIRECT OPEN & DOWNLOAD BUTTONS */}
            {canDownloadAndOpen && isUnlocked && (resource.fileUrl || resource.id) && (
              <>
                <a
                  href={`${secureFileUrl}?preview=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 shadow-sm"
                  title="Open in new window (Admin only)"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Tab</span>
                </a>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-all shadow-md shadow-blue-600/25 cursor-pointer"
                  title="Download Raw File to Device (Admin only)"
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
              title={isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen Mode (F)"}
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

        {/* Interactive Reader Controls Toolbar: Zoom, Rotate ("Side Korao"), View Width Mode */}
        {isUnlocked && (resource.fileUrl || resource.id) && (
          <div className="flex items-center justify-between px-3 sm:px-6 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/90 text-xs flex-wrap gap-2">
            
            {/* Left: View Width Switcher (Narrow vs Full Page) */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hidden md:inline">
                View:
              </span>
              <div className="flex items-center bg-white dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                <button
                  type="button"
                  onClick={() => setViewWidthMode("narrow")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    viewWidthMode === "narrow" && !isFullscreen
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  title="Narrow Reading Container (Book Style)"
                >
                  <Columns className="w-3 h-3" />
                  <span>Narrow</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewWidthMode("wide")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    viewWidthMode === "wide" && !isFullscreen
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  title="Full Page Wide Container"
                >
                  <Maximize className="w-3 h-3" />
                  <span>Full Page</span>
                </button>
              </div>
            </div>

            {/* Center: Zoom and Rotate ("Side Korao") Controls */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Zoom Bar */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoom <= 50}
                  className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors cursor-pointer"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="px-2 py-0.5 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                  title="Reset Zoom to 100% (0)"
                >
                  {zoom}%
                </button>

                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoom >= 300}
                  className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors cursor-pointer"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border-l border-slate-200 dark:border-slate-700 ml-0.5"
                  title="Reset Scale to 100%"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Rotate ("Side Korao") Button */}
              <div className="flex items-center bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <button
                  type="button"
                  onClick={handleRotateClockwise}
                  className="px-2.5 py-1 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 font-bold text-[11px] cursor-pointer"
                  title="Rotate document 90° clockwise (Side korao) [Key: R]"
                >
                  <RotateCw className="w-3.5 h-3.5 text-blue-500" />
                  <span>{rotation === 0 ? "Rotate 90°" : `${rotation}°`}</span>
                </button>

                {rotation !== 0 && (
                  <button
                    type="button"
                    onClick={handleResetRotation}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border-l border-slate-200 dark:border-slate-700 ml-0.5"
                    title="Reset rotation to 0°"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Right: Security & Reader Status Notice */}
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              {!canDownloadAndOpen ? (
                <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Website Study View</span>
                </span>
              ) : (
                <span className="font-mono text-[10px] text-slate-400 hidden sm:inline">
                  Admin Full Mode
                </span>
              )}
            </div>

          </div>
        )}

        {/* Content Body */}
        <div
          className="flex-1 relative overflow-auto bg-slate-200/80 dark:bg-slate-950 flex items-start justify-center p-2 sm:p-4 select-none"
          onContextMenu={(e) => {
            if (!canDownloadAndOpen) {
              e.preventDefault(); // Stop right-click saving for students
            }
          }}
        >
          {isUnlocked && (resource.fileUrl || resource.id) ? (
            <div
              className="relative flex items-center justify-center transition-all duration-200 ease-out origin-center"
              style={{
                transform: `rotate(${rotation}deg) scale(${zoom / 100})`,
                transformOrigin: "center center",
                width: isRotated ? "80vh" : "100%",
                height: isRotated ? "80vw" : "100%",
                minHeight: zoom > 100 ? `${zoom}%` : isRotated ? "80vw" : "100%",
                minWidth: zoom > 100 ? `${zoom}%` : isRotated ? "80vh" : "100%",
              }}
            >
              {/* Security Watermark Overlay for Student Anti-Scraping */}
              <div className="absolute inset-0 pointer-events-none z-10 flex flex-wrap items-center justify-around opacity-[0.05] select-none overflow-hidden">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="transform -rotate-45 font-mono text-sm sm:text-base font-extrabold text-slate-900 dark:text-white whitespace-nowrap p-8">
                    NoteLagbe Protected • {user?.email || "Student Academic Portal"}
                  </div>
                ))}
              </div>

              {/* Embedded Document Frame (with #toolbar=0 to suppress browser PDF download/print tools) */}
              <iframe
                src={`${secureFileUrl}?preview=true#toolbar=0&navpanes=0`}
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
