"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, API_BASE_URL, getToken } from "@/lib/api";

type ViewerDocKind = "pdf" | "image" | "drive-embed" | "unsupported";

function getGoogleDrivePreviewUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  const driveMatch = trimmed.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?[^#]*id=)([a-zA-Z0-9_-]{10,})/);
  if (driveMatch?.[1]) {
    return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  }
  const docsMatch = trimmed.match(/docs\.google\.com\/(document|presentation|spreadsheets)\/d\/([a-zA-Z0-9_-]+)/);
  if (docsMatch?.[1] && docsMatch?.[2]) {
    return `https://docs.google.com/${docsMatch[1]}/d/${docsMatch[2]}/preview`;
  }
  return null;
}

function getAuthStreamUrl(resourceId: number | string, isAdminMode?: boolean, download = false): string {
  const base = `${API_BASE_URL}/${isAdminMode ? "admin/" : ""}resources/${resourceId}/file`;
  return `${base}?${download ? "download=true" : "preview=true"}`;
}

async function inspectBlobFormat(
  blob: Blob,
  headerContentType: string,
  fallbackUrl?: string
): Promise<{ kind: ViewerDocKind; normalizedBlob: Blob }> {
  const ct = (headerContentType || blob.type || "").split(";")[0].trim().toLowerCase();
  const headBytes = new Uint8Array(await blob.slice(0, 16).arrayBuffer());

  const startsWith = (...sig: number[]) =>
    headBytes.length >= sig.length && sig.every((b, idx) => headBytes[idx] === b);

  // Magic-byte PDF detection (%PDF) fixes un-extensioned Cloudinary raw URLs served as application/octet-stream
  if (startsWith(0x25, 0x50, 0x44, 0x46)) {
    const mime = "application/pdf";
    return { kind: "pdf", normalizedBlob: ct === mime ? blob : new Blob([blob], { type: mime }) };
  }

  let detectedImgMime = "";
  if (startsWith(0x89, 0x50, 0x4e, 0x47)) detectedImgMime = "image/png";
  else if (startsWith(0xff, 0xd8, 0xff)) detectedImgMime = "image/jpeg";
  else if (startsWith(0x47, 0x49, 0x46, 0x38)) detectedImgMime = "image/gif";
  else if (startsWith(0x52, 0x49, 0x46, 0x46) && headBytes[8] === 0x57 && headBytes[9] === 0x45) detectedImgMime = "image/webp";

  if (detectedImgMime || ct.startsWith("image/")) {
    const mime = detectedImgMime || ct;
    return { kind: "image", normalizedBlob: ct === mime ? blob : new Blob([blob], { type: mime }) };
  }

  if (ct === "application/pdf") {
    return { kind: "pdf", normalizedBlob: blob };
  }

  const lowerUrl = (fallbackUrl || "").toLowerCase();
  if (
    startsWith(0x50, 0x4b, 0x03, 0x04) ||
    ct.includes("wordprocessingml") ||
    ct.includes("msword") ||
    ct.includes("zip") ||
    /\.(docx?|pptx?|xlsx?|zip|rar)(\?|$)/i.test(lowerUrl)
  ) {
    return { kind: "unsupported", normalizedBlob: blob };
  }

  if (lowerUrl.includes(".pdf")) {
    const mime = "application/pdf";
    return { kind: "pdf", normalizedBlob: new Blob([blob], { type: mime }) };
  }

  return { kind: "unsupported", normalizedBlob: blob };
}
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

  // Download and external new-tab privileges are ONLY enabled in Admin mode (inside /admin console).
  // On student course pages (/courses/[code]), all users (students & staff) experience the pure in-website reader!
  const canDownloadAndOpen = Boolean(isAdminMode);

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

  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [detectedKind, setDetectedKind] = useState<ViewerDocKind>("pdf");
  const [retryTick, setRetryTick] = useState(0);

  const drivePreviewUrl = useMemo(
    () => getGoogleDrivePreviewUrl(resource?.fileUrl),
    [resource?.fileUrl]
  );

  // Reset controls whenever a new resource is opened
  useEffect(() => {
    if (isOpen) {
      setZoom(100);
      setRotation(0);
    }
  }, [isOpen, resource?.id]);

  // Fetch document securely via Authorization header and render from local Blob URL
  useEffect(() => {
    if (!isOpen || !resource || !isUnlocked || (!resource.id && !resource.fileUrl)) {
      setBlobUrl(null);
      setDocError(null);
      setDocLoading(false);
      return;
    }

    if (!resource.id && drivePreviewUrl) {
      setBlobUrl(null);
      setDetectedKind("drive-embed");
      setDocError(null);
      setDocLoading(false);
      return;
    }

    let cancelled = false;
    let createdObjectUrl: string | null = null;
    const controller = new AbortController();

    const loadDocument = async () => {
      setDocLoading(true);
      setDocError(null);
      setBlobUrl(null);

      try {
        const token = getToken();
        const targetUrl = resource.id
          ? getAuthStreamUrl(resource.id, isAdminMode, false)
          : resource.fileUrl || "";

        const headers: HeadersInit = {};
        if (resource.id && token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const res = await fetch(targetUrl, {
          method: "GET",
          headers,
          signal: controller.signal,
        });

        const contentType = (res.headers.get("content-type") || "").toLowerCase();

        if (!res.ok) {
          let message = `Unable to load document (HTTP ${res.status}).`;
          if (contentType.includes("application/json")) {
            try {
              const errData = await res.json();
              if (errData?.message) message = errData.message;
            } catch {}
          }
          if (drivePreviewUrl) {
            if (!cancelled) {
              setDetectedKind("drive-embed");
              setDocError(null);
            }
            return;
          }
          throw new Error(message);
        }

        const rawBlob = await res.blob();
        if (rawBlob.size === 0) {
          throw new Error("The server returned an empty file.");
        }

        const previewText = (await rawBlob.slice(0, 512).text()).trim();
        const lowerHead = previewText.toLowerCase();
        if (
          contentType.includes("application/json") ||
          (previewText.startsWith("{") && previewText.includes('"status"'))
        ) {
          let jsonMsg = "Document could not be retrieved from storage.";
          try {
            const parsed = JSON.parse(await rawBlob.text());
            if (parsed?.message) jsonMsg = parsed.message;
          } catch {}
          throw new Error(jsonMsg);
        }

        if (
          contentType.startsWith("text/html") ||
          lowerHead.startsWith("<!doctype html") ||
          lowerHead.startsWith("<html")
        ) {
          if (drivePreviewUrl) {
            if (!cancelled) {
              setDetectedKind("drive-embed");
              setDocError(null);
            }
            return;
          }
          throw new Error("Source returned a webpage instead of a viewable document.");
        }

        const { kind, normalizedBlob } = await inspectBlobFormat(rawBlob, contentType, resource.fileUrl);
        if (cancelled) return;

        setDetectedKind(kind);
        createdObjectUrl = URL.createObjectURL(normalizedBlob);
        setBlobUrl(createdObjectUrl);
      } catch (err: unknown) {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;
        if (drivePreviewUrl) {
          setDetectedKind("drive-embed");
          setDocError(null);
        } else {
          const msg = err instanceof Error ? err.message : "Failed to load document preview.";
          setDocError(msg);
        }
      } finally {
        if (!cancelled) {
          setDocLoading(false);
        }
      }
    };

    loadDocument();

    return () => {
      cancelled = true;
      controller.abort();
      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
      }
    };
  }, [isOpen, resource?.id, resource?.fileUrl, isUnlocked, isAdminMode, drivePreviewUrl, retryTick]);

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

  const openableTabUrl =
    blobUrl || (detectedKind === "drive-embed" ? drivePreviewUrl : "") || resource.fileUrl || "";

  const handleDownload = async () => {
    if (!resource || !canDownloadAndOpen) return;
    try {
      if (resource.id) await api.resources.trackDownload(resource.id);
    } catch {}

    const safeTitle = (resource.title || courseCode || "document").replace(/[^a-z0-9._-]+/gi, "_");
    const triggerSave = (href: string, filename: string) => {
      const link = document.createElement("a");
      link.href = href;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    if (blobUrl) {
      const ext = detectedKind === "image" ? "" : ".pdf";
      const filename = safeTitle.includes(".") ? safeTitle : `${safeTitle}${ext}`;
      triggerSave(blobUrl, filename);
      return;
    }

    if (resource.id) {
      try {
        const token = getToken();
        const dlEndpoint = getAuthStreamUrl(resource.id, isAdminMode, true);
        const res = await fetch(dlEndpoint, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          throw new Error(`Download failed (HTTP ${res.status})`);
        }
        const dlBlob = await res.blob();
        const tempUrl = URL.createObjectURL(dlBlob);
        triggerSave(tempUrl, safeTitle);
        setTimeout(() => URL.revokeObjectURL(tempUrl), 10000);
        return;
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Download failed");
        return;
      }
    }

    if (resource.fileUrl) {
      window.open(resource.fileUrl, "_blank", "noopener,noreferrer");
    }
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
                {openableTabUrl && (
                  <a
                    href={openableTabUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 shadow-sm"
                    title="Open in new window (Admin only)"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">New Tab</span>
                  </a>
                )}
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

              {docLoading ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 rounded-xl bg-slate-900/95 border border-slate-800 text-slate-200 p-6">
                  <Loader2 className="w-9 h-9 animate-spin text-blue-400" />
                  <p className="text-sm font-semibold">Loading document preview...</p>
                  <p className="text-xs text-slate-400">Verifying credentials & streaming file securely</p>
                </div>
              ) : docError ? (
                <div className="w-full h-full flex items-center justify-center p-6 rounded-xl bg-slate-900/95 border border-slate-800">
                  <div className="max-w-md w-full rounded-2xl bg-slate-950/90 border border-rose-500/30 p-6 text-center space-y-4 shadow-xl">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto">
                      <AlertCircle className="w-6 h-6 text-rose-400" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-base font-bold text-white">Document Preview Unavailable</h4>
                      <p className="text-xs text-slate-300 leading-relaxed break-words">{docError}</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setRetryTick((t) => t + 1)}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Retry Preview
                      </button>
                      {canDownloadAndOpen && resource.fileUrl && (
                        <a
                          href={resource.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open Cloud Link
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ) : detectedKind === "image" && blobUrl ? (
                <div className="w-full h-full flex items-center justify-center overflow-auto rounded-xl bg-slate-950 p-2">
                  <img
                    src={blobUrl}
                    alt={displayTitle}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                    draggable={false}
                  />
                </div>
              ) : detectedKind === "drive-embed" && drivePreviewUrl ? (
                <iframe
                  src={drivePreviewUrl}
                  className="w-full h-full border-none rounded-xl shadow-lg bg-white"
                  title={displayTitle}
                  allow="autoplay"
                />
              ) : detectedKind === "pdf" && blobUrl ? (
                /* Embedded Document Frame (with #toolbar=0 to suppress browser PDF download/print tools) */
                <iframe
                  src={`${blobUrl}#toolbar=0&navpanes=0`}
                  className="w-full h-full border-none rounded-xl shadow-lg bg-white"
                  title={displayTitle}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-6 rounded-xl bg-slate-900/95 border border-slate-800">
                  <div className="max-w-md w-full rounded-2xl bg-slate-950/90 border border-slate-800 p-6 text-center space-y-4">
                    <FileText className="w-10 h-10 text-blue-400 mx-auto" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white">Inline Preview Not Supported</h4>
                      <p className="text-xs text-slate-400">
                        This file format cannot be rendered directly inside the browser frame.
                      </p>
                    </div>
                    {canDownloadAndOpen && (
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download File
                      </button>
                    )}
                  </div>
                </div>
              )}
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
