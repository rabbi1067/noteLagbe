"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload,
  Plus,
  Trash2,
  RotateCcw,
  RotateCw,
  FlipHorizontal2,
  FlipVertical2,
  Crop as CropIcon,
  Sun,
  Contrast,
  Droplets,
  Download,
  FileText,
  FileDown,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronsLeft,
  GripVertical,
  Grid3X3,
  RefreshCw,
  Check,
  Sparkles,
  Loader2,
  Layers,
  Image as ImageIcon,
  SlidersHorizontal,
  Gauge,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import {
  CropRect,
  DEFAULT_CROP,
  DEFAULT_EXPORT_OPTIONS,
  EncodedPageAsset,
  MarginOption,
  PageOrientationOption,
  PageSizeOption,
  PdfExportOptions,
  PdfMakerPage,
  QUALITY_PRESETS,
  encodePageJpegCached,
  estimateContainerBytes,
  formatFileSize,
  getMatchingQualityPreset,
  isFullCrop,
  loadImageElement,
  renderTransformedCanvas,
  renderFinalPageCanvas,
  generatePdfBlob,
  generateDocxBlob,
  resolveMarginPoints,
  resolvePdfLayout,
  sanitizeBaseFilename,
  triggerBlobDownload,
} from "@/lib/pdfMakerExport";

interface PdfMakerToolProps {
  language?: "en" | "bn";
}

type CropAspect = "free" | "a4p" | "a4l" | "square" | "16:9";
type DragMode = "move" | "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | null;

const MIN_CROP_SIZE = 0.08;

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function getAspectRatioValue(aspect: CropAspect): number | null {
  switch (aspect) {
    case "a4p":
      return 210 / 297;
    case "a4l":
      return 297 / 210;
    case "square":
      return 1;
    case "16:9":
      return 16 / 9;
    default:
      return null;
  }
}

/**
 * Lightweight thumbnail canvas reflecting each page's current crop, rotation,
 * straighten angle, flip, and color adjustments.
 */
function PageThumbnailCanvas({
  page,
  className = "",
}: {
  page: PdfMakerPage;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const rendered = await renderFinalPageCanvas(page, 260);
        if (cancelled || !canvasRef.current) return;
        const target = canvasRef.current;
        target.width = rendered.width;
        target.height = rendered.height;
        const ctx = target.getContext("2d");
        ctx?.drawImage(rendered, 0, 0);
      } catch {
        // Ignore transient unload
      }
    }, 30);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [page]);

  return (
    <canvas
      ref={canvasRef}
      className={`max-w-full max-h-full object-contain rounded-lg shadow-sm bg-white ${className}`}
    />
  );
}

export default function PdfMakerTool({ language = "en" }: PdfMakerToolProps) {
  const [pages, setPages] = useState<PdfMakerPage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("NoteLagbe_Document");
  const [isDropActive, setIsDropActive] = useState(false);

  // Interactive crop & grid states
  const [isCropping, setIsCropping] = useState(false);
  const [cropAspect, setCropAspect] = useState<CropAspect>("free");
  const [showGrid, setShowGrid] = useState(false);
  const [canvasDisplaySize, setCanvasDisplaySize] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });

  // Reorder drag state
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Export settings & live size estimation states
  const [exportOptions, setExportOptions] = useState<PdfExportOptions>(DEFAULT_EXPORT_OPTIONS);
  const [estimatedBytes, setEstimatedBytes] = useState<number | null>(null);
  const [isEstimatingSize, setIsEstimatingSize] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const encodedAssetCacheRef = useRef<Map<string, EncodedPageAsset>>(new Map());

  // Interactive crop drag state ref for smooth pointer tracking
  const cropDragRef = useRef<{
    mode: DragMode;
    startX: number;
    startY: number;
    startCrop: CropRect;
  } | null>(null);
  const cropBoxContainerRef = useRef<HTMLDivElement | null>(null);

  // Revoke all tracked Object URLs only when unmounting
  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  // Detect touch device to safely disable native HTML5 draggable which intercepts mobile taps
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0)) {
      setIsTouchDevice(true);
    }
  }, []);

  const selectedIndex = pages.findIndex((p) => p.id === selectedId);
  const resolvedSelectedIndex = selectedIndex >= 0 ? selectedIndex : pages.length > 0 ? 0 : -1;
  const activePage = resolvedSelectedIndex >= 0 ? pages[resolvedSelectedIndex] : null;

  const bn = language === "bn";

  const liveLayout =
    canvasDisplaySize.w > 0 && canvasDisplaySize.h > 0
      ? resolvePdfLayout(canvasDisplaySize.w, canvasDisplaySize.h, exportOptions)
      : null;
  const showPaperPreview = Boolean(liveLayout && !isCropping);
  const paperBoxScale = liveLayout
    ? Math.min(480 / liveLayout.pageW, 460 / liveLayout.pageH)
    : 1;
  const activeMarginPt = resolveMarginPoints(exportOptions.margin);
  const activeMarginMmLabel =
    activeMarginPt === 0 ? "0 mm" : activeMarginPt === 36 ? "12.7 mm (0.5\")" : "25.4 mm (1.0\")";
  const pageFormatBadge = liveLayout
    ? `${
        exportOptions.pageSize === "fit"
          ? bn
            ? "Fit টু ইমেজ"
            : "Fit to Image"
          : `${exportOptions.pageSize === "letter" ? "Letter" : "A4"} ${
              liveLayout.isLandscape
                ? bn
                  ? "ল্যান্ডস্কেপ"
                  : "Landscape"
                : bn
                ? "পোর্ট্রেট"
                : "Portrait"
            }`
      } • ${bn ? "মার্জিন" : "Margin"}: ${activeMarginMmLabel}`
    : null;

  // Load uploaded image files cleanly preserving upload sequence
  const handleAddFiles = useCallback(
    async (incoming: FileList | File[]) => {
      const fileArray = Array.from(incoming).filter((file) => {
        if (file.type.startsWith("image/")) return true;
        return /\.(jpg|jpeg|png|webp|bmp|gif|avif)$/i.test(file.name);
      });

      if (fileArray.length === 0) {
        toast.error(
          bn
            ? "শুধুমাত্র ইমেজ ফাইল (JPG, PNG, WebP) সিলেক্ট করুন।"
            : "Please select valid image files (JPG, PNG, WebP)."
        );
        return;
      }

      const newPages: PdfMakerPage[] = [];
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const previewUrl = URL.createObjectURL(file);
        objectUrlsRef.current.add(previewUrl);
        try {
          const img = await loadImageElement(previewUrl);
          newPages.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${i}`,
            name: file.name,
            previewUrl,
            width: img.naturalWidth || 800,
            height: img.naturalHeight || 1000,
            rotation90: 0,
            straightenDeg: 0,
            flipH: false,
            flipV: false,
            brightness: 100,
            contrast: 100,
            saturation: 100,
            crop: { ...DEFAULT_CROP },
          });
        } catch {
          URL.revokeObjectURL(previewUrl);
          objectUrlsRef.current.delete(previewUrl);
          toast.error(
            bn ? `"${file.name}" ছবিটি পড়া যায়নি।` : `Could not read image "${file.name}".`
          );
        }
      }

      if (newPages.length > 0) {
        setPages((prev) => [...prev, ...newPages]);
        setSelectedId((cur) => cur || newPages[0].id);
        toast.success(
          bn
            ? `${newPages.length}টি ছবি সিরিয়াল অনুযায়ী যুক্ত হয়েছে!`
            : `Added ${newPages.length} image${newPages.length > 1 ? "s" : ""} in upload order!`
        );
      }
    },
    [bn]
  );

  // Update active page fields helper
  const updateActivePage = useCallback(
    (updater: (prev: PdfMakerPage) => PdfMakerPage) => {
      if (!activePage) return;
      setPages((prev) =>
        prev.map((p) => (p.id === activePage.id ? updater(p) : p))
      );
    },
    [activePage]
  );

  // Render main WYSIWYG editor canvas whenever activePage or crop mode changes
  useEffect(() => {
    if (!activePage) return;

    let cancelled = false;
    const rafId = window.requestAnimationFrame(async () => {
      try {
        const rendered = isCropping
          ? await renderTransformedCanvas(activePage, 1100)
          : await renderFinalPageCanvas(activePage, 1100);
        if (cancelled || !previewCanvasRef.current) return;

        const target = previewCanvasRef.current;
        target.width = rendered.width;
        target.height = rendered.height;
        const ctx = target.getContext("2d");
        ctx?.drawImage(rendered, 0, 0);
        setCanvasDisplaySize({ w: rendered.width, h: rendered.height });
      } catch {
        // Ignore transient decode failure
      }
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
    };
  }, [activePage, isCropping]);

  // Remove a single page and free its temporary ObjectURL
  const handleRemovePage = (id: string) => {
    setPages((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      const removed = prev[idx];
      if (removed && objectUrlsRef.current.has(removed.previewUrl)) {
        URL.revokeObjectURL(removed.previewUrl);
        objectUrlsRef.current.delete(removed.previewUrl);
      }
      const next = prev.filter((p) => p.id !== id);
      if (next.length === 0) {
        setSelectedId(null);
        setIsCropping(false);
        setCanvasDisplaySize({ w: 0, h: 0 });
        setEstimatedBytes(null);
      } else if (selectedId === id) {
        const fallback = next[Math.min(idx, next.length - 1)] || null;
        setSelectedId(fallback ? fallback.id : null);
      }
      return next;
    });
  };

  // Clear all temporary images
  const handleClearAll = () => {
    pages.forEach((p) => {
      if (objectUrlsRef.current.has(p.previewUrl)) {
        URL.revokeObjectURL(p.previewUrl);
        objectUrlsRef.current.delete(p.previewUrl);
      }
    });
    encodedAssetCacheRef.current.clear();
    setPages([]);
    setSelectedId(null);
    setIsCropping(false);
    setCanvasDisplaySize({ w: 0, h: 0 });
    setEstimatedBytes(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    toast.info(bn ? "সব টেম্পোরারি পেজ মুছে ফেলা হয়েছে।" : "Cleared all temporary pages.");
  };

  // Live debounced file size estimation using cached per-page JPEG encoding
  useEffect(() => {
    if (pages.length === 0) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (cancelled) return;
      setIsEstimatingSize(true);
      try {
        let totalImageBytes = 0;
        for (let i = 0; i < pages.length; i++) {
          if (cancelled) return;
          const asset = await encodePageJpegCached(
            pages[i],
            exportOptions.qualityPct,
            encodedAssetCacheRef.current
          );
          totalImageBytes += asset.jpgBytes.byteLength;
        }
        if (!cancelled) {
          setEstimatedBytes(estimateContainerBytes(totalImageBytes, pages.length));
        }
      } catch {
        // Ignore transient decode during rapid updates
      } finally {
        if (!cancelled) {
          setIsEstimatingSize(false);
        }
      }
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pages, exportOptions.qualityPct]);

  // Move page from index `from` to index `to` (used by step buttons, serial dropdown, and drag-and-drop)
  const movePageToIndex = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= pages.length || to >= pages.length) {
      return;
    }
    const targetPageId = pages[from]?.id;
    setPages((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(from, 1);
      updated.splice(to, 0, moved);
      return updated;
    });
    if (targetPageId) {
      setSelectedId(targetPageId);
    }
  };

  // Rotate 90deg left/right
  const rotatePage90 = (delta: 90 | -90) => {
    updateActivePage((p) => {
      const nextRot = (((p.rotation90 + delta) % 360) + 360) % 360;
      return {
        ...p,
        rotation90: nextRot as 0 | 90 | 180 | 270,
        crop: { ...DEFAULT_CROP },
      };
    });
  };

  // Apply current page's brightness/contrast/saturation to all pages
  const applyAdjustmentsToAll = () => {
    if (!activePage) return;
    const { brightness, contrast, saturation } = activePage;
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        brightness,
        contrast,
        saturation,
      }))
    );
    toast.success(
      bn
        ? "ব্রাইটনেস ও কালার সেটিংস সব পেজে অ্যাপ্লাই হয়েছে!"
        : "Applied brightness & color adjustments to all pages!"
    );
  };

  // Apply crop preset ratio centered in frame
  const handleApplyAspectPreset = (aspect: CropAspect) => {
    setCropAspect(aspect);
    if (!activePage || canvasDisplaySize.w === 0 || canvasDisplaySize.h === 0) return;
    if (aspect === "free") return;

    const targetRatio = getAspectRatioValue(aspect);
    if (!targetRatio) return;

    const imgRatio = canvasDisplaySize.w / canvasDisplaySize.h;
    let w = 0.86;
    let h = (w * imgRatio) / targetRatio;
    if (h > 0.9) {
      h = 0.9;
      w = (h * targetRatio) / imgRatio;
    }
    w = clamp(w, MIN_CROP_SIZE, 1);
    h = clamp(h, MIN_CROP_SIZE, 1);
    updateActivePage((p) => ({
      ...p,
      crop: {
        x: (1 - w) / 2,
        y: (1 - h) / 2,
        w,
        h,
      },
    }));
  };

  // Pointer crop interactions
  const startCropDrag = (e: React.PointerEvent, mode: DragMode) => {
    if (!activePage || !cropBoxContainerRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    cropDragRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...activePage.crop },
    };
  };

  const handleCropPointerMove = (e: React.PointerEvent) => {
    if (!cropDragRef.current || !cropBoxContainerRef.current || !activePage) return;
    const rect = cropBoxContainerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dx = (e.clientX - cropDragRef.current.startX) / rect.width;
    const dy = (e.clientY - cropDragRef.current.startY) / rect.height;
    const s = cropDragRef.current.startCrop;
    const mode = cropDragRef.current.mode;

    let { x, y, w, h } = s;

    if (mode === "move") {
      x = clamp(s.x + dx, 0, 1 - s.w);
      y = clamp(s.y + dy, 0, 1 - s.h);
    } else if (mode) {
      let left = s.x;
      let top = s.y;
      let right = s.x + s.w;
      let bottom = s.y + s.h;

      if (mode.includes("w")) left = clamp(s.x + dx, 0, right - MIN_CROP_SIZE);
      if (mode.includes("e")) right = clamp(s.x + s.w + dx, left + MIN_CROP_SIZE, 1);
      if (mode.includes("n")) top = clamp(s.y + dy, 0, bottom - MIN_CROP_SIZE);
      if (mode.includes("s")) bottom = clamp(s.y + s.h + dy, top + MIN_CROP_SIZE, 1);

      x = left;
      y = top;
      w = right - left;
      h = bottom - top;

      const ratio = getAspectRatioValue(cropAspect);
      if (ratio && canvasDisplaySize.w > 0 && canvasDisplaySize.h > 0) {
        const imgRatio = canvasDisplaySize.w / canvasDisplaySize.h;
        if (mode === "n" || mode === "s") {
          w = clamp((h * ratio) / imgRatio, MIN_CROP_SIZE, 1 - x);
          h = clamp((w * imgRatio) / ratio, MIN_CROP_SIZE, 1 - y);
        } else {
          h = clamp((w * imgRatio) / ratio, MIN_CROP_SIZE, 1 - y);
          w = clamp((h * ratio) / imgRatio, MIN_CROP_SIZE, 1 - x);
        }
      }
    }

    updateActivePage((p) => ({
      ...p,
      crop: { x, y, w, h },
    }));
  };

  const endCropDrag = () => {
    cropDragRef.current = null;
  };

  // Exports
  const handleDownloadPdf = async () => {
    if (pages.length === 0 || exportStatus) return;
    try {
      setExportStatus(bn ? "PDF তৈরি হচ্ছে..." : "Building PDF...");
      const blob = await generatePdfBlob(
        pages,
        exportOptions,
        (cur, total) => {
          setExportStatus(
            bn ? `PDF প্রসেসিং (${cur}/${total})...` : `Processing PDF (${cur}/${total})...`
          );
        },
        encodedAssetCacheRef.current
      );
      const base = sanitizeBaseFilename(fileName);
      triggerBlobDownload(blob, `${base}.pdf`);
      toast.success(
        bn
          ? `${base}.pdf (${formatFileSize(blob.size)}) ডাউনলোড শুরু হয়েছে!`
          : `${base}.pdf (${formatFileSize(blob.size)}) downloaded cleanly!`
      );
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error(
        bn ? "PDF তৈরি করতে সমস্যা হয়েছে।" : "Failed to generate PDF."
      );
    } finally {
      setExportStatus(null);
    }
  };

  const handleDownloadDocx = async () => {
    if (pages.length === 0 || exportStatus) return;
    try {
      setExportStatus(bn ? "DOCX তৈরি হচ্ছে..." : "Building Word (.docx)...");
      const blob = await generateDocxBlob(
        pages,
        exportOptions,
        (cur, total) => {
          setExportStatus(
            bn ? `Word ডকুমেন্ট (${cur}/${total})...` : `Building DOCX (${cur}/${total})...`
          );
        },
        encodedAssetCacheRef.current
      );
      const base = sanitizeBaseFilename(fileName);
      triggerBlobDownload(blob, `${base}.docx`);
      toast.success(
        bn
          ? `${base}.docx (${formatFileSize(blob.size)}) ডাউনলোড শুরু হয়েছে!`
          : `${base}.docx (${formatFileSize(blob.size)}) downloaded cleanly!`
      );
    } catch (err) {
      console.error("DOCX generation failed:", err);
      toast.error(
        bn ? "Word ফাইল তৈরি করতে সমস্যা হয়েছে।" : "Failed to generate DOCX."
      );
    } finally {
      setExportStatus(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden multi-image file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleAddFiles(e.target.files);
          }
          e.target.value = "";
        }}
      />

      {/* Hidden Mobile & Tablet Camera Input */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            const arr = Array.from(e.target.files);
            const now = Date.now();
            const normalized = arr.map((f, i) => {
              const isGenericName =
                !f.name ||
                f.name.toLowerCase() === "image.jpg" ||
                f.name.toLowerCase() === "image.jpeg" ||
                f.name.toLowerCase() === "image.png" ||
                f.name.toLowerCase().startsWith("captured_image");
              if (isGenericName) {
                return new File([f], `Camera_Page_${now}_${i + 1}.jpg`, {
                  type: f.type || "image/jpeg",
                  lastModified: now,
                });
              }
              return f;
            });
            handleAddFiles(normalized);
          }
          e.target.value = "";
        }}
      />

      {/* Header */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono font-black px-2.5 py-0.5 rounded-full bg-blue-600 text-white uppercase tracking-wider">
              PDF & DOCX MAKER
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {bn
              ? "ইমেজ টু PDF ও Word (DOCX) কনভার্টার"
              : "Multi-Image to PDF & Word (DOCX) Maker"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            {bn
              ? "একাধিক ছবি আপলোড করে বাঁকা ছবি সোজা (Straighten/Rotate), ক্রপ, ব্রাইটনেস ঠিক করুন ও সিরিয়াল সাজিয়ে PDF বা DOCX ডাউনলোড করুন।"
              : "Upload multiple photos, straighten crooked pages, crop margins, tune brightness/contrast, reorder serials, and export as PDF or DOCX."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 inline-flex items-center gap-2 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            {pages.length === 0
              ? bn
                ? "ছবি আপলোড করুন"
                : "Upload Images"
              : bn
              ? "আরও ছবি যোগ করুন"
              : "Add More Pages"}
          </button>

          {/* Mobile & Tablet Only: Direct Camera Action Button */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="lg:hidden px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 inline-flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 border border-emerald-400/30"
            title={bn ? "মোবাইল ক্যামেরা দিয়ে ছবি তুলুন" : "Snap page with mobile camera"}
          >
            <Camera className="w-4 h-4" />
            <span>
              {pages.length === 0
                ? bn
                  ? "ক্যামেরা দিয়ে তুলুন"
                  : "Camera Scan"
                : bn
                ? "+ ক্যামেরা পেজ"
                : "+ Snap Page"}
            </span>
          </button>

          {pages.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Trash2 className="w-4 h-4" />
              {bn ? "সব মুছুন" : "Clear All"}
            </button>
          )}
        </div>
      </div>

      {/* Empty State Dropzone */}
      {pages.length === 0 ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDropActive(true);
          }}
          onDragLeave={() => setIsDropActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDropActive(false);
            if (e.dataTransfer.files?.length) {
              handleAddFiles(e.dataTransfer.files);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`p-10 sm:p-16 rounded-3xl border-2 border-dashed transition-all cursor-pointer text-center space-y-5 ${
            isDropActive
              ? "border-blue-500 bg-blue-50/70 dark:bg-blue-950/30 scale-[1.01]"
              : "border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900/70 hover:border-blue-400 dark:hover:border-blue-600"
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-sm">
            <Upload className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {bn
                ? "এখানে ক্লিক করুন বা একসাথে একাধিক ছবি ছেড়ে দিন"
                : "Drop multiple images here or click to browse"}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {bn
                ? "আপনি যে সিরিয়ালে ছবি আপলোড করবেন ঠিক সেই সিরিয়ালেই PDF তৈরি হবে — চাইলে পরে যেকোনো সময় সিরিয়াল পরিবর্তন করতে পারবেন।"
                : "Pages keep your exact upload order by default. You can reorder serials, straighten crooked images, crop, tune brightness, and export anytime."}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
              JPG / PNG / WebP
            </span>
            <span className="lg:hidden px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-500/20 flex items-center gap-1 font-bold">
              <Camera className="w-3 h-3" />
              <span>{bn ? "ক্যামেরা দিয়ে তোলা যাবে" : "Camera Scan Supported"}</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
              {bn ? "বাঁকা ছবি সোজা + রোটেট" : "Straighten & Rotate"}
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
              {bn ? "ক্রপ ও ব্রাইটনেস" : "Crop & Brightness"}
            </span>
            <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              PDF + DOCX Download
            </span>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-sm inline-flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>{bn ? "ফাইল থেকে ছবি বাছুন" : "Browse Files"}</span>
            </button>

            {/* Mobile & Tablet Only: Direct Camera Button in Dropzone */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                cameraInputRef.current?.click();
              }}
              className="lg:hidden px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 inline-flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 border border-emerald-400/30"
            >
              <Camera className="w-4 h-4" />
              <span>{bn ? "ক্যামেরা দিয়ে ছবি তুলুন" : "Snap with Camera"}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Active Workspace */
        <div className="space-y-6">
          {/* Page Serial Bar (Upload Order + Drag & Drop + Manual Serial Picker) */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  {bn
                    ? `পেজ সিরিয়াল তালিকা (${pages.length}টি পেজ)`
                    : `Page Serial Order (${pages.length} ${pages.length === 1 ? "Page" : "Pages"})`}
                </h3>

                {/* Mobile & Tablet Quick Snap Next Page Button */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="lg:hidden px-2.5 py-1 rounded-xl text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  title={bn ? "ক্যামেরা দিয়ে পরবর্তী পেজ তুলুন" : "Snap next page with camera"}
                >
                  <Camera className="w-3 h-3" />
                  <span>{bn ? "+ ক্যামেরা পেজ" : "+ Camera Page"}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {bn
                  ? "সিরিয়াল (#) নির্বাচন করে, তীর বাটন চেপে, অথবা ১ নম্বরে নিতে '১ম পেজ' বাটনে ট্যাপ করুন"
                  : "Tap '#', use arrows, or click 'Make #1' to reorder pages"}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {pages.map((page, index) => {
                const isSelected = activePage?.id === page.id;
                const isDragTarget = dragOverIdx === index && draggedIdx !== index;
                return (
                  <div
                    key={page.id}
                    draggable={!isTouchDevice}
                    onDragStart={() => setDraggedIdx(index)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragOverIdx !== index) setDragOverIdx(index);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedIdx !== null && draggedIdx !== index) {
                        movePageToIndex(draggedIdx, index);
                      }
                      setDraggedIdx(null);
                      setDragOverIdx(null);
                    }}
                    onDragEnd={() => {
                      setDraggedIdx(null);
                      setDragOverIdx(null);
                    }}
                    onClick={() => {
                      setSelectedId(page.id);
                      setIsCropping(false);
                    }}
                    className={`group rounded-2xl p-2 border transition-all cursor-pointer flex flex-col gap-2 touch-manipulation select-none ${
                      isDragTarget
                        ? "border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/30"
                        : isSelected
                        ? "border-blue-600 ring-2 ring-blue-600/20 bg-blue-50/50 dark:bg-blue-950/30 shadow-md"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 hover:border-blue-300 dark:hover:border-blue-700"
                    }`}
                  >
                    {/* Top row: Drag grip + Serial dropdown + Make #1 Quick Action + Delete */}
                    <div
                      className="flex items-center justify-between gap-1"
                      onClick={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1 min-w-0">
                        <GripVertical className="hidden sm:inline-block w-3.5 h-3.5 text-slate-400 cursor-grab shrink-0" />
                        
                        {/* Interactive Serial Select Badge */}
                        <div className="relative inline-flex items-center shrink-0">
                          <select
                            aria-label={`Serial position for page ${index + 1}`}
                            value={index + 1}
                            onChange={(e) => {
                              e.stopPropagation();
                              const targetIndex = Number(e.target.value) - 1;
                              movePageToIndex(index, targetIndex);
                              toast.success(
                                bn
                                  ? `পেজ সিরিয়াল #${targetIndex + 1}-এ সেট করা হয়েছে`
                                  : `Page set to #${targetIndex + 1}`
                              );
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            className="appearance-none text-[11px] font-mono font-black pl-2 pr-5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white cursor-pointer outline-none shadow-xs active:scale-95 transition-all touch-manipulation"
                          >
                            {pages.map((_, optIdx) => (
                              <option
                                key={optIdx}
                                value={optIdx + 1}
                                className="bg-slate-900 text-white py-1"
                              >
                                #{optIdx + 1} {optIdx === 0 ? (bn ? "(১ম পেজ)" : "(1st)") : ""}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3 h-3 text-white/90 absolute right-1.5 pointer-events-none" />
                        </div>

                        {/* Quick One-Tap 'Make #1' Pill for any card not already at index 0 */}
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              movePageToIndex(index, 0);
                              toast.success(
                                bn ? "ছবিটিকে ১ নাম্বার পেজে আনা হয়েছে!" : "Moved to Page #1!"
                              );
                            }}
                            onTouchStart={(e) => e.stopPropagation()}
                            className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold text-blue-700 dark:text-blue-300 bg-blue-100/90 dark:bg-blue-950/80 hover:bg-blue-200 border border-blue-300 dark:border-blue-800 transition-all flex items-center gap-0.5 active:scale-90 shadow-xs cursor-pointer shrink-0"
                            title={bn ? "এই পেজটিকে সরাসরি ১ নাম্বার করুন" : "Set as Page #1"}
                          >
                            <ChevronsLeft className="w-2.5 h-2.5 shrink-0" />
                            <span>{bn ? "১ম করুন" : "Make #1"}</span>
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePage(page.id);
                        }}
                        onTouchStart={(e) => e.stopPropagation()}
                        title={bn ? "পেজ মুছুন" : "Remove page"}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Preview Thumb */}
                    <div className="h-28 w-full rounded-xl bg-slate-200/70 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center p-1.5 overflow-hidden">
                      <PageThumbnailCanvas page={page} />
                    </div>

                    {/* Bottom row: Move left / filename / Move right */}
                    <div
                      className="flex items-center justify-between gap-1"
                      onClick={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          movePageToIndex(index, index - 1);
                        }}
                        onTouchStart={(e) => e.stopPropagation()}
                        title={bn ? "১ ধাপ আগে নিন" : "Move earlier"}
                        className="p-1.5 sm:p-1 min-w-[28px] min-h-[28px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:border-blue-400 cursor-pointer disabled:cursor-not-allowed active:scale-90 transition-all touch-manipulation"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[65px] text-center">
                        {page.name}
                      </span>

                      <button
                        type="button"
                        disabled={index === pages.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          movePageToIndex(index, index + 1);
                        }}
                        onTouchStart={(e) => e.stopPropagation()}
                        title={bn ? "১ ধাপ পরে নিন" : "Move later"}
                        className="p-1.5 sm:p-1 min-w-[28px] min-h-[28px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:border-blue-400 cursor-pointer disabled:cursor-not-allowed active:scale-90 transition-all touch-manipulation"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Quick Add Tile */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/40 dark:bg-slate-950/30 flex flex-col items-center justify-center gap-2 min-h-[168px] text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all cursor-pointer"
              >
                <Plus className="w-6 h-6" />
                <span className="text-xs font-bold">
                  {bn ? "+ আরও ছবি" : "+ Add More"}
                </span>
              </button>
            </div>
          </div>

          {/* Main 2-Column Workspace: Live Page Editor (Left) + Controls & Export (Right) */}
          {activePage && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 7 Cols: WYSIWYG Preview & Interactive Crop Canvas */}
              <div className="lg:col-span-7 p-4 sm:p-6 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-black px-2.5 py-1 rounded-lg bg-blue-600 text-white shrink-0">
                      {bn
                        ? `পেজ ${resolvedSelectedIndex + 1}/${pages.length}`
                        : `Page ${resolvedSelectedIndex + 1} of ${pages.length}`}
                    </span>

                    {/* Quick Move to #1 button when this active page is not page 1 */}
                    {resolvedSelectedIndex > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          movePageToIndex(resolvedSelectedIndex, 0);
                          toast.success(
                            bn
                              ? "নির্বাচিত পেজটি এখন ১ নাম্বার পেজ!"
                              : "Selected page is now Page #1!"
                          );
                        }}
                        className="px-2.5 py-1 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all flex items-center gap-1 active:scale-95 shadow-xs cursor-pointer shrink-0"
                        title={bn ? "এই নির্বাচিত পেজটিকে সরাসরি ১ নাম্বার করুন" : "Set this selected page as Page #1"}
                      >
                        <ChevronsLeft className="w-3.5 h-3.5" />
                        <span>{bn ? "১ম পেজ করুন" : "Make #1"}</span>
                      </button>
                    )}

                    {/* Step Reorder Buttons right in the active editor */}
                    {pages.length > 1 && (
                      <div className="flex items-center gap-0.5 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shrink-0">
                        <button
                          type="button"
                          disabled={resolvedSelectedIndex === 0}
                          onClick={() => movePageToIndex(resolvedSelectedIndex, resolvedSelectedIndex - 1)}
                          className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-90"
                          title={bn ? "১ ধাপ আগে নিন" : "Move 1 position earlier"}
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={resolvedSelectedIndex === pages.length - 1}
                          onClick={() => movePageToIndex(resolvedSelectedIndex, resolvedSelectedIndex + 1)}
                          className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-90"
                          title={bn ? "১ ধাপ পরে নিন" : "Move 1 position later"}
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[140px] sm:max-w-xs">
                      {activePage.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowGrid((v) => !v)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 cursor-pointer transition-all ${
                        showGrid
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400"
                      }`}
                    >
                      <Grid3X3 className="w-3.5 h-3.5" />
                      {bn ? "গ্রিড" : "Grid"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsCropping((v) => !v)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 cursor-pointer transition-all ${
                        isCropping
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400"
                      }`}
                    >
                      {isCropping ? <Check className="w-3.5 h-3.5" /> : <CropIcon className="w-3.5 h-3.5" />}
                      {isCropping
                        ? bn
                          ? "ক্রপ সম্পন্ন"
                          : "Done Crop"
                        : bn
                        ? "ক্রপ করুন"
                        : "Crop"}
                    </button>
                  </div>
                </div>

                {/* Aspect Presets shown only in Crop Mode */}
                {isCropping && (
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-100/80 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(
                        [
                          { id: "free", label: bn ? "ফ্রি" : "Free" },
                          { id: "a4p", label: "A4 Portrait" },
                          { id: "a4l", label: "A4 Landscape" },
                          { id: "square", label: "1:1" },
                          { id: "16:9", label: "16:9" },
                        ] as { id: CropAspect; label: string }[]
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleApplyAspectPreset(opt.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                            cropAspect === opt.id
                              ? "bg-blue-600 text-white"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCropAspect("free");
                        updateActivePage((p) => ({ ...p, crop: { ...DEFAULT_CROP } }));
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                    >
                      {bn ? "ক্রপ রিসেট" : "Reset Crop"}
                    </button>
                  </div>
                )}

                {/* Live Canvas Viewport */}
                <div className="relative w-full min-h-[360px] sm:min-h-[460px] rounded-2xl bg-slate-950/90 border border-slate-800 flex items-center justify-center p-4 overflow-hidden select-none">
                  <div
                    style={
                      showPaperPreview && liveLayout
                        ? {
                            width: "100%",
                            maxWidth: `${Math.round(liveLayout.pageW * paperBoxScale)}px`,
                            aspectRatio: `${liveLayout.pageW} / ${liveLayout.pageH}`,
                          }
                        : undefined
                    }
                    className={
                      showPaperPreview
                        ? "bg-white rounded-sm shadow-2xl ring-1 ring-slate-300/60 flex items-center justify-center transition-all duration-200"
                        : "contents"
                    }
                  >
                    <div
                      ref={cropBoxContainerRef}
                      onPointerMove={handleCropPointerMove}
                      onPointerUp={endCropDrag}
                      onPointerCancel={endCropDrag}
                      style={
                        showPaperPreview && liveLayout
                          ? {
                              width: `${(liveLayout.drawW / liveLayout.pageW) * 100}%`,
                              height: `${(liveLayout.drawH / liveLayout.pageH) * 100}%`,
                            }
                          : undefined
                      }
                      className={
                        showPaperPreview
                          ? "relative flex items-center justify-center touch-none"
                          : "relative inline-flex items-center justify-center max-w-full max-h-[520px] touch-none"
                      }
                    >
                      <canvas
                        ref={previewCanvasRef}
                        className={
                          showPaperPreview
                            ? "w-full h-full block bg-white"
                            : "max-w-full max-h-[500px] w-auto h-auto rounded-lg shadow-2xl bg-white block"
                        }
                      />

                    {/* Straighten Alignment Grid Overlay */}
                    {showGrid && (
                      <div className="pointer-events-none absolute inset-0 rounded-lg overflow-hidden">
                        <div className="w-full h-full grid grid-cols-4 grid-rows-4">
                          {Array.from({ length: 16 }).map((_, idx) => (
                            <div
                              key={idx}
                              className="border border-cyan-400/35"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Interactive Crop Box */}
                    {isCropping && (
                      <div className="absolute inset-0">
                        {/* Outer dark masks around crop rectangle */}
                        <div
                          className="absolute inset-x-0 top-0 bg-slate-950/60 pointer-events-none"
                          style={{ height: `${activePage.crop.y * 100}%` }}
                        />
                        <div
                          className="absolute inset-x-0 bottom-0 bg-slate-950/60 pointer-events-none"
                          style={{
                            height: `${(1 - activePage.crop.y - activePage.crop.h) * 100}%`,
                          }}
                        />
                        <div
                          className="absolute left-0 bg-slate-950/60 pointer-events-none"
                          style={{
                            top: `${activePage.crop.y * 100}%`,
                            height: `${activePage.crop.h * 100}%`,
                            width: `${activePage.crop.x * 100}%`,
                          }}
                        />
                        <div
                          className="absolute right-0 bg-slate-950/60 pointer-events-none"
                          style={{
                            top: `${activePage.crop.y * 100}%`,
                            height: `${activePage.crop.h * 100}%`,
                            width: `${(1 - activePage.crop.x - activePage.crop.w) * 100}%`,
                          }}
                        />

                        {/* Draggable Crop Frame + 8 Resize Handles */}
                        <div
                          onPointerDown={(e) => startCropDrag(e, "move")}
                          style={{
                            left: `${activePage.crop.x * 100}%`,
                            top: `${activePage.crop.y * 100}%`,
                            width: `${activePage.crop.w * 100}%`,
                            height: `${activePage.crop.h * 100}%`,
                          }}
                          className="absolute border-2 border-emerald-400 cursor-move shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
                        >
                          {/* Corner & Edge Handles */}
                          {(
                            [
                              { mode: "nw", pos: "-top-2 -left-2 cursor-nwse-resize" },
                              { mode: "n", pos: "-top-2 left-1/2 -translate-x-1/2 cursor-ns-resize" },
                              { mode: "ne", pos: "-top-2 -right-2 cursor-nesw-resize" },
                              { mode: "e", pos: "top-1/2 -translate-y-1/2 -right-2 cursor-ew-resize" },
                              { mode: "se", pos: "-bottom-2 -right-2 cursor-nwse-resize" },
                              { mode: "s", pos: "-bottom-2 left-1/2 -translate-x-1/2 cursor-ns-resize" },
                              { mode: "sw", pos: "-bottom-2 -left-2 cursor-nesw-resize" },
                              { mode: "w", pos: "top-1/2 -translate-y-1/2 -left-2 cursor-ew-resize" },
                            ] as { mode: DragMode; pos: string }[]
                          ).map((handle) => (
                            <div
                              key={handle.mode}
                              onPointerDown={(e) => startCropDrag(e, handle.mode)}
                              className={`absolute w-4 h-4 rounded-full bg-white border-2 border-emerald-500 shadow ${handle.pos}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                </div>

                {/* Live dimensions & reset strip */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" />
                      {canvasDisplaySize.w > 0
                        ? `${canvasDisplaySize.w} × ${canvasDisplaySize.h} px`
                        : bn
                        ? "লোড হচ্ছে..."
                        : "Loading..."}
                      {!isFullCrop(activePage.crop) && (
                        <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                          {bn ? "ক্রপড" : "Cropped"}
                        </span>
                      )}
                    </span>
                    {pageFormatBadge && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-800/50 text-blue-700 dark:text-blue-300 text-[11px] font-semibold">
                        {pageFormatBadge}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      updateActivePage((p) => ({
                        ...p,
                        rotation90: 0,
                        straightenDeg: 0,
                        flipH: false,
                        flipV: false,
                        brightness: 100,
                        contrast: 100,
                        saturation: 100,
                        crop: { ...DEFAULT_CROP },
                      }));
                      toast.info(bn ? "এই পেজটি রিসেট করা হয়েছে।" : "Reset current page edits.");
                    }}
                    className="inline-flex items-center gap-1 font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {bn ? "এই পেজ রিসেট করুন" : "Reset Page"}
                  </button>
                </div>
              </div>

              {/* Right 5 Cols: Transform, Adjustments & Export Controls */}
              <div className="lg:col-span-5 space-y-5">
                {/* Card 1: Rotate & Straighten Crooked Images */}
                <div className="p-5 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <RotateCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      {bn ? "রোটেট ও বাঁকা ছবি সোজা করুন" : "Rotate & Straighten"}
                    </h4>
                    <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">
                      {activePage.rotation90}°
                      {activePage.straightenDeg !== 0
                        ? ` (${activePage.straightenDeg > 0 ? "+" : ""}${activePage.straightenDeg.toFixed(1)}°)`
                        : ""}
                    </span>
                  </div>

                  {/* Quick 90deg + Flip */}
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => rotatePage90(-90)}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:border-blue-500 text-xs font-bold text-slate-700 dark:text-slate-200 flex flex-col items-center gap-1 cursor-pointer transition-all"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>-90°</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => rotatePage90(90)}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:border-blue-500 text-xs font-bold text-slate-700 dark:text-slate-200 flex flex-col items-center gap-1 cursor-pointer transition-all"
                    >
                      <RotateCw className="w-4 h-4" />
                      <span>+90°</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateActivePage((p) => ({ ...p, flipH: !p.flipH }))
                      }
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        activePage.flipH
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                          : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:border-blue-500 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      <FlipHorizontal2 className="w-4 h-4" />
                      <span>{bn ? "ফ্লিপ H" : "Flip H"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateActivePage((p) => ({ ...p, flipV: !p.flipV }))
                      }
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                        activePage.flipV
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                          : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:border-blue-500 text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      <FlipVertical2 className="w-4 h-4" />
                      <span>{bn ? "ফ্লিপ V" : "Flip V"}</span>
                    </button>
                  </div>

                  {/* Fine Straighten Angle Slider (-45° to +45°) */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {bn ? "সূক্ষ্ম সোজা করা (Straighten)" : "Fine Straighten Angle"}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateActivePage((p) => ({ ...p, straightenDeg: 0 }))
                        }
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        {bn ? "0° রিসেট" : "Reset 0°"}
                      </button>
                    </div>
                    <input
                      type="range"
                      aria-label="Straighten angle slider"
                      min={-45}
                      max={45}
                      step={0.5}
                      value={activePage.straightenDeg}
                      onMouseDown={() => setShowGrid(true)}
                      onTouchStart={() => setShowGrid(true)}
                      onChange={(e) => {
                        const deg = Number(e.target.value);
                        updateActivePage((p) => ({ ...p, straightenDeg: deg }));
                      }}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>-45°</span>
                      <span>0°</span>
                      <span>+45°</span>
                    </div>
                  </div>
                </div>

                {/* Card 2: Brightness, Contrast & Saturation */}
                <div className="p-5 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      {bn ? "ব্রাইটনেস, কন্ট্রাস্ট ও কালার" : "Brightness & Color"}
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        updateActivePage((p) => ({
                          ...p,
                          brightness: 100,
                          contrast: 100,
                          saturation: 100,
                        }))
                      }
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      {bn ? "রিসেট" : "Reset"}
                    </button>
                  </div>

                  {/* Brightness */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300 inline-flex items-center gap-1.5">
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        {bn ? "ব্রাইটনেস" : "Brightness"}
                      </span>
                      <span className="font-mono text-slate-500">{activePage.brightness}%</span>
                    </div>
                    <input
                      type="range"
                      aria-label="Brightness slider"
                      min={50}
                      max={180}
                      step={2}
                      value={activePage.brightness}
                      onChange={(e) =>
                        updateActivePage((p) => ({ ...p, brightness: Number(e.target.value) }))
                      }
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  {/* Contrast */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300 inline-flex items-center gap-1.5">
                        <Contrast className="w-3.5 h-3.5 text-indigo-500" />
                        {bn ? "কন্ট্রাস্ট" : "Contrast"}
                      </span>
                      <span className="font-mono text-slate-500">{activePage.contrast}%</span>
                    </div>
                    <input
                      type="range"
                      aria-label="Contrast slider"
                      min={50}
                      max={180}
                      step={2}
                      value={activePage.contrast}
                      onChange={(e) =>
                        updateActivePage((p) => ({ ...p, contrast: Number(e.target.value) }))
                      }
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  {/* Saturation */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300 inline-flex items-center gap-1.5">
                        <Droplets className="w-3.5 h-3.5 text-cyan-500" />
                        {bn ? "স্যাচুরেশন (০% = B&W)" : "Saturation (0% = B&W)"}
                      </span>
                      <span className="font-mono text-slate-500">{activePage.saturation}%</span>
                    </div>
                    <input
                      type="range"
                      aria-label="Saturation slider"
                      min={0}
                      max={180}
                      step={2}
                      value={activePage.saturation}
                      onChange={(e) =>
                        updateActivePage((p) => ({ ...p, saturation: Number(e.target.value) }))
                      }
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  {pages.length > 1 && (
                    <button
                      type="button"
                      onClick={applyAdjustmentsToAll}
                      className="w-full py-2 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-xs font-bold text-blue-700 dark:text-blue-300 cursor-pointer transition-all"
                    >
                      {bn
                        ? "এই আলো/কালার সব পেজে অ্যাপ্লাই করুন"
                        : "Apply Adjustments to All Pages"}
                    </button>
                  )}
                </div>

                {/* Card 3: Page Layout (Size, Orientation, Margin) */}
                <div className="p-5 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    {bn ? "পেজ সাইজ, মার্জিন ও ওরিয়েন্টেশন" : "Page Size, Margin & Orientation"}
                  </h4>

                  {/* Page Size */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                      {bn ? "পেজ সাইজ" : "Page Size"}
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: "a4", label: bn ? "A4 (স্ট্যান্ডার্ড)" : "A4 (Standard)" },
                          { id: "letter", label: "Letter" },
                          { id: "fit", label: bn ? "ছবি অনুযায়ী (Fit)" : "Fit to Image" },
                        ] as { id: PageSizeOption; label: string }[]
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            setExportOptions((prev) => ({ ...prev, pageSize: opt.id }))
                          }
                          className={`py-2 px-2 rounded-xl border text-[11px] font-bold cursor-pointer transition-all ${
                            exportOptions.pageSize === opt.id
                              ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                              : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-blue-400"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Orientation */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        {bn ? "ওরিয়েন্টেশন" : "Orientation"}
                      </span>
                      {exportOptions.pageSize === "fit" && (
                        <span className="text-[10px] text-slate-400">
                          {bn ? "Fit মোডে অটো ছবি অনুযায়ী" : "Auto-matched in Fit mode"}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: "auto", label: bn ? "অটো (স্মার্ট)" : "Auto" },
                          { id: "portrait", label: bn ? "পোর্ট্রেট" : "Portrait" },
                          { id: "landscape", label: bn ? "ল্যান্ডস্কেপ" : "Landscape" },
                        ] as { id: PageOrientationOption; label: string }[]
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={exportOptions.pageSize === "fit"}
                          onClick={() =>
                            setExportOptions((prev) => ({ ...prev, orientation: opt.id }))
                          }
                          className={`py-2 px-2 rounded-xl border text-[11px] font-bold transition-all ${
                            exportOptions.pageSize === "fit"
                              ? "opacity-45 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-400"
                              : exportOptions.orientation === opt.id
                              ? "border-blue-600 bg-blue-600 text-white shadow-sm cursor-pointer"
                              : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-blue-400 cursor-pointer"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Margin */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        {bn ? "মার্জিন" : "Page Margin"}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {bn ? "ডিফল্ট: প্রিন্ট-সেফ (0.5\")" : "Default: Print-safe 0.5\""}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          {
                            id: "none",
                            label: bn ? "মার্জিন ছাড়া" : "No Margin",
                            sub: "0 mm",
                          },
                          {
                            id: "small",
                            label: bn ? "ছোট (Narrow)" : "Small",
                            sub: "12.7 mm · 0.5\"",
                          },
                          {
                            id: "normal",
                            label: bn ? "নরমাল (Standard)" : "Normal",
                            sub: "25.4 mm · 1.0\"",
                          },
                        ] as { id: MarginOption; label: string; sub: string }[]
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            setExportOptions((prev) => ({ ...prev, margin: opt.id }))
                          }
                          className={`py-2 px-2 rounded-xl border text-[11px] font-bold cursor-pointer transition-all flex flex-col items-center leading-tight ${
                            exportOptions.margin === opt.id
                              ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                              : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-blue-400"
                          }`}
                        >
                          <span>{opt.label}</span>
                          <span
                            className={`text-[9px] font-medium mt-0.5 ${
                              exportOptions.margin === opt.id
                                ? "text-blue-100"
                                : "text-slate-400"
                            }`}
                          >
                            {opt.sub}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card 4: Quality / Compression Slider + Live Estimated Size + Download */}
                <div className="p-5 rounded-3xl bg-gradient-to-br from-blue-600/10 via-indigo-600/5 to-transparent dark:from-blue-950/50 dark:via-slate-900 dark:to-slate-900 border border-blue-200/80 dark:border-blue-800/60 shadow-sm space-y-4">
                  {/* Quality Presets & Compression Slider */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        {bn ? "কোয়ালিটি ও কম্প্রেশন" : "Quality & Compression"}
                      </h4>
                      <span className="text-[11px] font-mono font-black px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        {exportOptions.qualityPct}% (
                        {getMatchingQualityPreset(exportOptions.qualityPct) === "custom"
                          ? bn
                            ? "কাস্টম"
                            : "Custom"
                          : QUALITY_PRESETS.find(
                              (q) => q.qualityPct === exportOptions.qualityPct
                            )?.[bn ? "labelBn" : "labelEn"]}
                        )
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      {QUALITY_PRESETS.map((preset) => {
                        const active = exportOptions.qualityPct === preset.qualityPct;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() =>
                              setExportOptions((prev) => ({
                                ...prev,
                                qualityPct: preset.qualityPct,
                              }))
                            }
                            className={`py-1.5 px-1.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-all ${
                              active
                                ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                                : "border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:border-blue-400"
                            }`}
                          >
                            {bn ? preset.labelBn : preset.labelEn}
                          </button>
                        );
                      })}
                    </div>

                    <input
                      type="range"
                      aria-label="Compression quality slider"
                      min={35}
                      max={98}
                      step={1}
                      value={exportOptions.qualityPct}
                      onChange={(e) =>
                        setExportOptions((prev) => ({
                          ...prev,
                          qualityPct: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-blue-600 cursor-pointer"
                    />

                    {/* Live Estimated File Size Indicator */}
                    <div className="px-3.5 py-2.5 rounded-2xl bg-white/80 dark:bg-slate-950/75 border border-slate-200/90 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {bn ? "আনুমানিক ফাইল সাইজ:" : "Estimated File Size:"}
                      </span>
                      <div className="flex items-center gap-2">
                        {isEstimatingSize ? (
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 inline-flex items-center gap-1">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            {bn ? "হিসাব হচ্ছে..." : "Calculating..."}
                          </span>
                        ) : estimatedBytes !== null ? (
                          <>
                            <span
                              data-testid="estimated-file-size"
                              className="text-xs font-mono font-black text-slate-900 dark:text-white"
                            >
                              ~{formatFileSize(estimatedBytes)}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                estimatedBytes <= 5 * 1024 * 1024
                                  ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300"
                                  : estimatedBytes <= 10 * 1024 * 1024
                                  ? "bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300"
                                  : "bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300"
                              }`}
                            >
                              {estimatedBytes <= 5 * 1024 * 1024
                                ? "< 5 MB"
                                : estimatedBytes <= 10 * 1024 * 1024
                                ? "< 10 MB"
                                : bn
                                ? "বড় ফাইল (>10MB)"
                                : "> 10 MB"}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">--</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      {bn ? "ফাইলের নাম" : "Output File Name"}
                    </label>
                    <input
                      type="text"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      placeholder="NoteLagbe_Document"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  {exportStatus && (
                    <div className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>{exportStatus}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      disabled={Boolean(exportStatus)}
                      onClick={handleDownloadPdf}
                      className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-black shadow-lg shadow-blue-600/20 inline-flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>{bn ? "PDF ডাউনলোড" : "Download PDF"}</span>
                    </button>

                    <button
                      type="button"
                      disabled={Boolean(exportStatus)}
                      onClick={handleDownloadDocx}
                      className="py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-black shadow-lg shadow-indigo-600/20 inline-flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <FileDown className="w-4 h-4" />
                      <span>{bn ? "DOCX ডাউনলোড" : "Download DOCX"}</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                    {bn
                      ? `সর্বমোট ${pages.length}টি পেজ বর্তমান সিরিয়ালে এক্সপোর্ট হবে।`
                      : `Exports ${pages.length} ${pages.length === 1 ? "page" : "pages"} in exact current serial order.`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
