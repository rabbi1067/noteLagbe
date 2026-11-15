"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, AlertCircle, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from "lucide-react";

interface PDFCanvasViewerProps {
  pdfBytes?: Uint8Array | null;
  blobUrl?: string | null;
  activePage: number;
  onPageChange: (page: number) => void;
  onTotalPagesDetected: (total: number) => void;
  zoom: number; // 50 to 300
  rotation: number; // global rotation delta
  pageExtraRotations?: Record<number, number>; // per-page extra rotation
  viewMode?: "single" | "scroll"; // single page flip vs continuous scroll
  watermarkText?: string;
  onFallbackRequested?: () => void;
}

// Global cached PDF.js reference
let pdfjsPromise: Promise<any> | null = null;

async function getPdfJs() {
  if (typeof window === "undefined") return null;
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import("pdfjs-dist");
      try {
        if (pdfjs.GlobalWorkerOptions) {
          // Point directly to same-origin public worker
          pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
        }
      } catch (e) {
        console.warn("Failed to set workerSrc, will use fallback:", e);
      }
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

export default function PDFCanvasViewer({
  pdfBytes,
  blobUrl,
  activePage,
  onPageChange,
  onTotalPagesDetected,
  zoom,
  rotation,
  pageExtraRotations = {},
  viewMode = "scroll",
  watermarkText,
  onFallbackRequested,
}: PDFCanvasViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      return Math.max(280, Math.min(window.innerWidth - 32, 800));
    }
    return 600;
  });

  // Keep a stable ref to callbacks so parent re-renders don't trigger document reload
  const onTotalPagesDetectedRef = useRef(onTotalPagesDetected);
  useEffect(() => {
    onTotalPagesDetectedRef.current = onTotalPagesDetected;
  });

  // Track the source signature currently loaded to prevent redundant reload / detached ArrayBuffer errors
  const currentDocSourceRef = useRef<string | null>(null);

  // Active rendering tasks map to prevent race conditions when navigating rapidly
  const renderTasksRef = useRef<Map<number, any>>(new Map());
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

  // Observe container dimensions for perfect responsive scaling
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width > 0) {
          setContainerWidth(width);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Load PDF Document when pdfBytes or blobUrl changes
  useEffect(() => {
    if (!pdfBytes && !blobUrl) return;

    // Signature to identify if the file actually changed
    const sourceSignature = blobUrl || (pdfBytes ? `bytes_${pdfBytes.length}_${pdfBytes[0] || 0}` : null);
    if (!sourceSignature) return;

    // If document is already loaded for this source, do NOT reload it!
    if (currentDocSourceRef.current === sourceSignature && pdfDoc) {
      return;
    }

    let cancelled = false;
    let loadedDoc: any = null;

    const loadDocument = async () => {
      setLoading(true);
      setRenderError(null);

      try {
        const pdfjs = await getPdfJs();
        if (!pdfjs || cancelled) return;

        // Cancel any pending render tasks
        renderTasksRef.current.forEach((task) => {
          try {
            task.cancel();
          } catch {}
        });
        renderTasksRef.current.clear();

        // Senior Engineer Fix:
        // 1. Prefer blobUrl if available so the browser worker handles data via HTTP/blob streaming without transferring ArrayBuffer.
        // 2. If using pdfBytes, MUST clone with .slice(0) so the original Uint8Array buffer in React state is NEVER detached!
        const loadingTask = pdfjs.getDocument(
          blobUrl
            ? {
                url: blobUrl,
                cMapUrl: "https://unpkg.com/pdfjs-dist@3.11.174/cmaps/",
                cMapPacked: true,
              }
            : {
                data: pdfBytes!.slice(0),
                cMapUrl: "https://unpkg.com/pdfjs-dist@3.11.174/cmaps/",
                cMapPacked: true,
              }
        );

        loadedDoc = await loadingTask.promise;
        if (cancelled) {
          try {
            loadedDoc.destroy();
          } catch {}
          return;
        }

        currentDocSourceRef.current = sourceSignature;
        setPdfDoc(loadedDoc);
        const total = loadedDoc.numPages;
        setNumPages(total);
        onTotalPagesDetectedRef.current?.(total);
        setLoading(false);
      } catch (err: any) {
        if (cancelled) return;
        console.error("PDF.js document loading error:", err);
        setRenderError(err?.message || "Failed to parse PDF document");
        setLoading(false);
      }
    };

    loadDocument();

    return () => {
      cancelled = true;
      if (loadedDoc) {
        try {
          loadedDoc.destroy();
        } catch {}
      }
    };
  }, [pdfBytes, blobUrl]);

  // Render a specific page onto its corresponding canvas
  const renderPage = useCallback(
    async (pageIndex: number, canvas: HTMLCanvasElement) => {
      if (!pdfDoc || pageIndex < 1 || pageIndex > numPages) return;

      // Cancel any ongoing render task for this specific page
      const existingTask = renderTasksRef.current.get(pageIndex);
      if (existingTask) {
        try {
          existingTask.cancel();
        } catch {}
      }

      try {
        const page = await pdfDoc.getPage(pageIndex);

        // Calculate rotation: base page rotation + global rotation + per-page rotation
        const extraRot = pageExtraRotations[pageIndex] || 0;
        const totalRotation = ((page.rotate || 0) + rotation + extraRot) % 360;

        // Measure base viewport at 1.0 scale to fit container
        const baseViewport = page.getViewport({ scale: 1, rotation: totalRotation });

        // Calculate fit-width scale with safe margins for mobile & desktop
        const horizontalPadding = containerWidth > 640 ? 48 : 16;
        const targetWidth = Math.max(containerWidth - horizontalPadding, 280);
        const fitScale = targetWidth / baseViewport.width;

        // Apply user zoom multiplier
        const userScale = zoom / 100;
        const effectiveScale = fitScale * userScale;

        // High-DPI sharpness factor (capped at 2.0 to balance memory and sharpness on mobile)
        const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;

        const viewport = page.getViewport({
          scale: effectiveScale * dpr,
          rotation: totalRotation,
        });

        // Set high-res pixel dimensions on canvas buffer
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        // Strict Aspect-Ratio Preservation:
        // Width adapts responsively up to maxWidth, while height is strictly driven by the native aspect ratio!
        // This eliminates vertical stretching/elongation on mobile and desktop alike.
        const cssWidth = Math.floor(viewport.width / dpr);
        canvas.style.width = "100%";
        canvas.style.maxWidth = `${cssWidth}px`;
        canvas.style.height = "auto";
        canvas.style.aspectRatio = `${viewport.width} / ${viewport.height}`;

        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) return;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTasksRef.current.set(pageIndex, renderTask);

        await renderTask.promise;
        renderTasksRef.current.delete(pageIndex);
      } catch (err: any) {
        if (err?.name === "RenderingCancelledException") {
          // Harmless: superseded by a newer render
          return;
        }
        console.warn(`Render error on page ${pageIndex}:`, err);
      }
    },
    [pdfDoc, numPages, rotation, pageExtraRotations, containerWidth, zoom]
  );

  // Trigger render when relevant parameters change
  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;

    if (viewMode === "single") {
      const canvas = canvasRefs.current.get(activePage);
      if (canvas) {
        void renderPage(activePage, canvas);
      }
    } else {
      // Continuous scroll mode: render visible pages
      for (let p = 1; p <= numPages; p++) {
        const canvas = canvasRefs.current.get(p);
        if (canvas) {
          void renderPage(p, canvas);
        }
      }
    }
  }, [pdfDoc, numPages, activePage, viewMode, renderPage]);

  // Touch Swipe navigation support for mobile single-page flip
  const touchStartXRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (viewMode !== "single" || e.touches.length !== 1) return;
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (viewMode !== "single" || touchStartXRef.current === null || e.changedTouches.length !== 1) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;
    touchStartXRef.current = null;

    if (Math.abs(diff) > 50) {
      if (diff > 0 && activePage < numPages) {
        onPageChange(activePage + 1); // Swipe left -> next page
      } else if (diff < 0 && activePage > 1) {
        onPageChange(activePage - 1); // Swipe right -> previous page
      }
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-[420px] h-full flex flex-col items-center justify-center gap-3 p-8 rounded-2xl bg-slate-900/90 text-slate-200">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-sm font-bold text-white">Rendering PDF Study Document...</p>
        <p className="text-xs text-slate-400">High-resolution mobile canvas engine active</p>
      </div>
    );
  }

  if (renderError) {
    return (
      <div className="w-full min-h-[420px] h-full flex flex-col items-center justify-center p-6 text-center rounded-2xl bg-slate-950 border border-rose-500/30">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6 text-rose-400" />
        </div>
        <h4 className="text-base font-bold text-white mb-1">Canvas Render Issue</h4>
        <p className="text-xs text-slate-400 max-w-sm mb-4">{renderError}</p>
        {onFallbackRequested && (
          <button
            type="button"
            onClick={onFallbackRequested}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            Switch to Embedded Viewer
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="w-full flex flex-col items-center justify-start gap-6 py-2 overflow-x-auto relative"
    >
      {viewMode === "single" ? (
        // Single Page Mode
        <div className="relative flex flex-col items-center w-full max-w-full">
          <div
            style={{ maxWidth: "100%" }}
            className="relative shadow-2xl rounded-xl overflow-hidden border border-slate-700/60 bg-white mx-auto flex items-center justify-center"
          >
            <canvas
              ref={(el) => {
                if (el) canvasRefs.current.set(activePage, el);
                else canvasRefs.current.delete(activePage);
              }}
              className="block select-none"
            />
            {/* Watermark overlay directly on canvas */}
            {watermarkText && (
              <div className="absolute inset-0 pointer-events-none z-10 flex flex-wrap items-center justify-around opacity-[0.06] select-none overflow-hidden">
                {Array.from({ length: 16 }).map((_, i) => (
                  <div
                    key={i}
                    className="transform -rotate-45 font-mono text-xs sm:text-sm font-extrabold text-slate-900 whitespace-nowrap p-4"
                  >
                    NoteLagbe Protected • {watermarkText}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center gap-3 bg-slate-900/90 border border-slate-800 px-4 py-1.5 rounded-full text-xs text-slate-300 shadow-lg">
            <button
              type="button"
              disabled={activePage <= 1}
              onClick={() => onPageChange(Math.max(1, activePage - 1))}
              className="p-1 rounded-lg hover:bg-slate-800 disabled:opacity-30 cursor-pointer transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono font-bold text-white">
              Page {activePage} of {numPages}
            </span>
            <button
              type="button"
              disabled={activePage >= numPages}
              onClick={() => onPageChange(Math.min(numPages, activePage + 1))}
              className="p-1 rounded-lg hover:bg-slate-800 disabled:opacity-30 cursor-pointer transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        // Continuous Scroll Mode (All pages in a seamless vertical list)
        Array.from({ length: numPages }).map((_, idx) => {
          const pageNum = idx + 1;
          return (
            <div
              key={pageNum}
              id={`pdf-page-${pageNum}`}
              className="relative flex flex-col items-center w-full max-w-full"
            >
              {/* Page Number Badge */}
              <div className="mb-2 self-center px-3 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-[10px] font-mono font-bold text-slate-300 shadow-xs">
                Page {pageNum} of {numPages}
              </div>

              {/* Page Canvas Container with Strict Aspect Ratio Preservation */}
              <div
                style={{ maxWidth: "100%" }}
                className="relative shadow-2xl rounded-xl overflow-hidden border border-slate-700/60 bg-white mx-auto flex items-center justify-center"
              >
                <canvas
                  ref={(el) => {
                    if (el) canvasRefs.current.set(pageNum, el);
                    else canvasRefs.current.delete(pageNum);
                  }}
                  className="block select-none"
                />

                {/* Watermark overlay */}
                {watermarkText && (
                  <div className="absolute inset-0 pointer-events-none z-10 flex flex-wrap items-center justify-around opacity-[0.06] select-none overflow-hidden">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div
                        key={i}
                        className="transform -rotate-45 font-mono text-xs sm:text-sm font-extrabold text-slate-900 whitespace-nowrap p-4"
                      >
                        NoteLagbe Protected • {watermarkText}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
