"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  Maximize,
  ChevronLeft,
  ChevronRight,
  Save,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatSemesterDisplay } from "@/lib/academicSemester";
import { api, API_BASE_URL, getToken } from "@/lib/api";
import {
  convertImageToJpegBytes,
  inspectImageFile,
  inspectPdfOrientations,
  mergeFilesToSinglePdf,
  normalizeAndRotatePdfBytes,
  normalizeRotationDegrees,
} from "@/lib/pdfMerger";
import { toast } from "sonner";
import confetti from "canvas-confetti";

type ViewerDocKind = "pdf" | "image" | "drive-embed" | "pdf-embed" | "unsupported";

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
  const cleanBase = API_BASE_URL.replace(/\/+$/, "");
  const base = `${cleanBase}/${isAdminMode ? "admin/" : ""}resources/${resourceId}/file`;
  const token = getToken();
  const tokenParam = token ? `&token=${encodeURIComponent(token)}` : "";
  return `${base}?${download ? "download=true" : "preview=true"}${tokenParam}`;
}

export function isRawR2StorageUrl(url?: string | null): boolean {
  if (!url) return false;
  return (
    (url.includes(".r2.cloudflarestorage.com") || url.includes(".r2.") || url.includes("r2_")) &&
    !url.includes("X-Amz-Signature") &&
    !url.includes(".r2.dev")
  );
}

export function resolveSafeEmbedUrl(
  rawUrl?: string | null,
  resourceId?: number | string,
  isAdmin?: boolean
): string {
  if (!rawUrl) return "";
  // If it's a raw un-presigned Cloudflare R2 endpoint, direct browser iframe access will fail with InvalidArgumentAuthorization.
  // Instead, route through the backend streaming endpoint which generates an authentic AWS HMAC-SHA256 presigned redirect!
  if (isRawR2StorageUrl(rawUrl) && resourceId) {
    return getAuthStreamUrl(resourceId, isAdmin, false);
  }
  return rawUrl;
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

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: any;
  courseCode: string;
  isUnlocked: boolean;
  onUnlockedSuccess: () => void;
  isAdminMode?: boolean;
  onFileUpdated?: (newFileUrl: string) => void;
}

export default function PDFViewerModal({
  isOpen,
  onClose,
  resource,
  courseCode,
  isUnlocked,
  onUnlockedSuccess,
  isAdminMode = false,
  onFileUpdated,
}: PDFViewerModalProps) {
  const { user, isAuthenticated, setShowAuthModal } = useAuth();
  const [unlocking, setUnlocking] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270 degrees (for images/embeds)
  const [viewWidthMode, setViewWidthMode] = useState<"narrow" | "wide">("wide");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Per-page PDF orientation normalization & rotation state
  const [rawPdfBytes, setRawPdfBytes] = useState<Uint8Array | null>(null);
  const [activePdfBytes, setActivePdfBytes] = useState<Uint8Array | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [activePdfPage, setActivePdfPage] = useState(1);
  const [pageExtraRotations, setPageExtraRotations] = useState<Record<number, number>>({});
  const [autoAlignMixedPdf, setAutoAlignMixedPdf] = useState(true);
  const [autoAlignedPagesList, setAutoAlignedPagesList] = useState<number[]>([]);
  const [pdfChangedFromRaw, setPdfChangedFromRaw] = useState(false);

  // Standalone image orientation & physical save state
  const [rawImageBlob, setRawImageBlob] = useState<Blob | null>(null);
  const [activeImageBytes, setActiveImageBytes] = useState<Uint8Array | null>(null);
  const [imageIsLandscape, setImageIsLandscape] = useState(false);
  const [imageCssFallback, setImageCssFallback] = useState(false);
  const [savingFixedFile, setSavingFixedFile] = useState(false);

  // Download and external new-tab privileges are ONLY enabled in Admin mode (inside /admin console).
  // On student course pages (/courses/[code]), all users (students & staff) experience the pure in-website reader!
  const canDownloadAndOpen = Boolean(isAdminMode);

  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const activeBlobUrlRef = useRef<string | null>(null);
  const [detectedKind, setDetectedKind] = useState<ViewerDocKind>("pdf");
  const [embedUrl, setEmbedUrl] = useState<string>("");
  const [useGoogleDocsEmbed, setUseGoogleDocsEmbed] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  const replaceBlobUrl = useCallback((nextUrl: string | null) => {
    if (activeBlobUrlRef.current && activeBlobUrlRef.current !== nextUrl) {
      URL.revokeObjectURL(activeBlobUrlRef.current);
    }
    activeBlobUrlRef.current = nextUrl;
    setBlobUrl(nextUrl);
  }, []);

  const drivePreviewUrl = useMemo(
    () => getGoogleDrivePreviewUrl(resource?.fileUrl),
    [resource?.fileUrl]
  );

  // Reset controls whenever a new resource is opened
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setZoom(100);
      setRotation(0);
      setActivePdfPage(1);
      setPageExtraRotations({});
      setAutoAlignMixedPdf(true);
      setAutoAlignedPagesList([]);
      setPdfChangedFromRaw(false);
      setRawImageBlob(null);
      setActiveImageBytes(null);
      setImageIsLandscape(false);
      setImageCssFallback(false);
    });
    return () => {
      active = false;
    };
  }, [isOpen, resource?.id]);

  // Fetch document securely via Authorization header and render from local Blob URL
  useEffect(() => {
    if (!isOpen || !resource || !isUnlocked || (!resource.id && !resource.fileUrl)) {
      let active = true;
      queueMicrotask(() => {
        if (!active) return;
        replaceBlobUrl(null);
        setRawPdfBytes(null);
        setActivePdfBytes(null);
        setPdfPageCount(0);
        setRawImageBlob(null);
        setActiveImageBytes(null);
        setImageIsLandscape(false);
        setImageCssFallback(false);
        setDocError(null);
        setDocLoading(false);
      });
      return () => {
        active = false;
      };
    }

    if (!resource.id && drivePreviewUrl) {
      let active = true;
      queueMicrotask(() => {
        if (!active) return;
        replaceBlobUrl(null);
        setRawPdfBytes(null);
        setActivePdfBytes(null);
        setPdfPageCount(0);
        setRawImageBlob(null);
        setActiveImageBytes(null);
        setImageIsLandscape(false);
        setImageCssFallback(false);
        setDetectedKind("drive-embed");
        setDocError(null);
        setDocLoading(false);
      });
      return () => {
        active = false;
      };
    }

    let cancelled = false;
    const controller = new AbortController();

    const loadDocument = async () => {
      setDocLoading(true);
      setDocError(null);
      replaceBlobUrl(null);
      setEmbedUrl("");
      setRawPdfBytes(null);
      setActivePdfBytes(null);
      setPdfPageCount(0);
      setRawImageBlob(null);
      setActiveImageBytes(null);
      setImageIsLandscape(false);
      setImageCssFallback(false);

      try {
        const token = getToken();
        let targetUrl = resource.id
          ? getAuthStreamUrl(resource.id, isAdminMode, false)
          : resource.fileUrl || "";

        const headers: HeadersInit = {};
        // Target URL already carries query-string token; omit Authorization header to ensure S3/R2 presigned redirects succeed without CORS/auth collisions!
        if (resource.id && token && !targetUrl.includes("token=")) {
          headers.Authorization = `Bearer ${token}`;
        }

        let res: Response | null = null;
        try {
          res = await fetch(targetUrl, {
            method: "GET",
            headers,
            signal: controller.signal,
          });
        } catch (fetchErr) {
          console.warn("Backend stream failed or timed out, trying direct URL:", fetchErr);
        }

        // Resilient Fallback 1: If backend stream failed or returned error, try direct cloud URL
        if (!res || !res.ok) {
          if (resource.fileUrl && resource.fileUrl !== targetUrl && !cancelled) {
            try {
              res = await fetch(resource.fileUrl, {
                method: "GET",
                signal: controller.signal,
              });
            } catch (cloudErr) {
              console.warn("Direct cloud fetch also failed:", cloudErr);
              res = null;
            }
          }
        }

        // Resilient Fallback 2: For 50MB+ documents or when blob fetching is blocked by CORS/timeout,
        // switch directly to embedded PDF/cloud viewer!
        if (!res || !res.ok) {
          if (drivePreviewUrl && !cancelled) {
            setDetectedKind("drive-embed");
            setDocError(null);
            return;
          }
          if (resource.fileUrl && !cancelled) {
            setDetectedKind("pdf-embed");
            setEmbedUrl(resolveSafeEmbedUrl(resource.fileUrl, resource.id, isAdminMode));
            setDocError(null);
            return;
          }
          let message = "Unable to load document preview.";
          if (res && !res.ok) {
            message = `Unable to load document (HTTP ${res.status}).`;
            try {
              const errData = await res.json();
              if (errData?.message) message = errData.message;
            } catch {}
          }
          throw new Error(message);
        }

        const contentType = (res.headers.get("content-type") || "").toLowerCase();

        // Check if response body is an error JSON
        if (contentType.includes("application/json")) {
          let message = "Document could not be retrieved from server.";
          try {
            const errData = await res.json();
            if (errData?.message) message = errData.message;
          } catch {}
          if (resource.fileUrl && !cancelled) {
            setDetectedKind("pdf-embed");
            setEmbedUrl(resolveSafeEmbedUrl(resource.fileUrl, resource.id, isAdminMode));
            setDocError(null);
            return;
          }
          throw new Error(message);
        }

        const rawBlob = await res.blob();
        if (rawBlob.size === 0) {
          if (resource.fileUrl && !cancelled) {
            setDetectedKind("pdf-embed");
            setEmbedUrl(resolveSafeEmbedUrl(resource.fileUrl, resource.id, isAdminMode));
            setDocError(null);
            return;
          }
          throw new Error("The server returned an empty file.");
        }

        const previewText = (await rawBlob.slice(0, 512).text()).trim();
        const lowerHead = previewText.toLowerCase();
        if (
          contentType.includes("application/json") ||
          (previewText.startsWith("{") && previewText.includes('"status"'))
        ) {
          if (resource.fileUrl && !cancelled) {
            setDetectedKind("pdf-embed");
            setEmbedUrl(resolveSafeEmbedUrl(resource.fileUrl, resource.id, isAdminMode));
            setDocError(null);
            return;
          }
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
          if (resource.fileUrl && !cancelled) {
            setDetectedKind("pdf-embed");
            setEmbedUrl(resolveSafeEmbedUrl(resource.fileUrl, resource.id, isAdminMode));
            setDocError(null);
            return;
          }
          throw new Error("Source returned a webpage instead of a viewable document.");
        }

        const { kind, normalizedBlob } = await inspectBlobFormat(rawBlob, contentType, resource.fileUrl);
        if (cancelled) return;

        setDetectedKind(kind);

        if (kind === "pdf") {
          const rawBytes = new Uint8Array(await normalizedBlob.arrayBuffer());
          if (cancelled) return;
          setRawPdfBytes(rawBytes);
          setActivePdfBytes(rawBytes);

          // Fast-Path: Render PDF blob IMMEDIATELY! Zero freeze, zero main-thread CPU lockup!
          const displayUrl = URL.createObjectURL(normalizedBlob);
          replaceBlobUrl(displayUrl);
          setDocLoading(false);

          // Lightweight asynchronous inspection (reads page count & dimensions in ~5ms without slow PDF rebuild)
          try {
            const info = await inspectPdfOrientations(rawBytes);
            if (!cancelled) {
              setPdfPageCount(info.pageCount);
              setActivePdfPage(1);
            }
          } catch {
            if (!cancelled) {
              setPdfPageCount(0);
            }
          }
        } else {
          if (kind === "image") {
            setRawImageBlob(normalizedBlob);
            try {
              const info = await inspectImageFile(
                new File([normalizedBlob], "preview.jpg", {
                  type: normalizedBlob.type || "image/jpeg",
                })
              );
              if (!cancelled) {
                setImageIsLandscape(info.isLandscape);
              }
            } catch {
              if (!cancelled) {
                setImageIsLandscape(false);
              }
            }
          }
          if (!cancelled) {
            replaceBlobUrl(URL.createObjectURL(normalizedBlob));
          }
        }
      } catch (err: unknown) {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;
        if (drivePreviewUrl) {
          setDetectedKind("drive-embed");
          setDocError(null);
        } else if (resource.fileUrl) {
          // Automatic seamless fallback to embedded viewer for 50MB+ or external documents!
          setDetectedKind("pdf-embed");
          setEmbedUrl(resolveSafeEmbedUrl(resource.fileUrl, resource.id, isAdminMode));
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
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = null;
      }
    };
  }, [isOpen, resource?.id, resource?.fileUrl, isUnlocked, isAdminMode, drivePreviewUrl, retryTick, replaceBlobUrl]);

  const rebuildPdfWithRotations = useCallback(
    async (nextMap: Record<number, number>, nextAutoAlign: boolean) => {
      if (!rawPdfBytes) return;
      try {
        const res = await normalizeAndRotatePdfBytes(rawPdfBytes, {
          autoAlignMixed: nextAutoAlign,
          pageExtraRotations: nextMap,
          targetOrientation: "AUTO_UNIFORM",
        });
        setActivePdfBytes(res.bytes);
        setAutoAlignedPagesList(res.autoAlignedPages);
        setPdfChangedFromRaw(res.changed);
        const updatedBlob = new Blob([res.bytes as any], { type: "application/pdf" });
        replaceBlobUrl(URL.createObjectURL(updatedBlob));
      } catch (err) {
        console.error("Failed to normalize/rotate PDF page:", err);
        toast.error("Unable to rotate this PDF page.");
      }
    },
    [rawPdfBytes, replaceBlobUrl]
  );

  const handleRotateActivePdfPage = useCallback(
    async (deltaDeg: number) => {
      if (!rawPdfBytes || pdfPageCount === 0) return;
      const currentEffective =
        pageExtraRotations[activePdfPage] !== undefined
          ? pageExtraRotations[activePdfPage]
          : autoAlignedPagesList.includes(activePdfPage)
          ? 90
          : 0;
      const nextRot = normalizeRotationDegrees(currentEffective + deltaDeg);
      const nextMap = { ...pageExtraRotations, [activePdfPage]: nextRot };
      setPageExtraRotations(nextMap);
      await rebuildPdfWithRotations(nextMap, autoAlignMixedPdf);
    },
    [rawPdfBytes, pdfPageCount, pageExtraRotations, activePdfPage, autoAlignedPagesList, autoAlignMixedPdf, rebuildPdfWithRotations]
  );

  const handleResetPdfRotations = useCallback(async () => {
    setPageExtraRotations({});
    setAutoAlignMixedPdf(false);
    await rebuildPdfWithRotations({}, false);
  }, [rebuildPdfWithRotations]);

  const handleToggleAutoAlignPdf = useCallback(async () => {
    const nextAuto = !autoAlignMixedPdf;
    setPageExtraRotations({});
    setAutoAlignMixedPdf(nextAuto);
    await rebuildPdfWithRotations({}, nextAuto);
  }, [autoAlignMixedPdf, rebuildPdfWithRotations]);

  const handleRotateAllPdfPages = useCallback(
    async (deltaDeg: number) => {
      if (!rawPdfBytes || pdfPageCount === 0) return;
      const nextMap: Record<number, number> = {};
      for (let p = 1; p <= pdfPageCount; p++) {
        const currentEffective =
          pageExtraRotations[p] !== undefined
            ? pageExtraRotations[p]
            : autoAlignedPagesList.includes(p)
            ? 90
            : 0;
        nextMap[p] = normalizeRotationDegrees(currentEffective + deltaDeg);
      }
      setPageExtraRotations(nextMap);
      await rebuildPdfWithRotations(nextMap, autoAlignMixedPdf);
    },
    [rawPdfBytes, pdfPageCount, pageExtraRotations, autoAlignedPagesList, autoAlignMixedPdf, rebuildPdfWithRotations]
  );

  const applyImageRotation = useCallback(
    async (targetDeg: number) => {
      const next = normalizeRotationDegrees(targetDeg);
      setRotation(next);
      if (detectedKind !== "image" || !rawImageBlob) return;

      if (next === 0) {
        setActiveImageBytes(null);
        setImageCssFallback(false);
        replaceBlobUrl(URL.createObjectURL(rawImageBlob));
        return;
      }

      try {
        const srcFile = new File([rawImageBlob], "material_image.jpg", {
          type: rawImageBlob.type || "image/jpeg",
        });
        const converted = await convertImageToJpegBytes(srcFile, next);
        setActiveImageBytes(converted.bytes);
        setImageIsLandscape(converted.width > converted.height);
        setImageCssFallback(false);
        replaceBlobUrl(URL.createObjectURL(new Blob([converted.bytes as any], { type: "image/jpeg" })));
      } catch {
        setImageCssFallback(true);
      }
    },
    [detectedKind, rawImageBlob, replaceBlobUrl]
  );

  const persistFixedFileToResource = useCallback(
    async (fixedFile: File, successMessage: string) => {
      if (!canDownloadAndOpen || !resource?.id) return null;
      setSavingFixedFile(true);
      try {
        const uploadRes = await api.admin.uploadMaterialFile(fixedFile);
        await api.admin.updateResourceFile(resource.id, uploadRes.url);
        toast.success(successMessage);
        if (onFileUpdated) {
          onFileUpdated(uploadRes.url);
        }
        return uploadRes.url;
      } catch (err: any) {
        toast.error(err?.message || "Failed to save fixed file");
        return null;
      } finally {
        setSavingFixedFile(false);
      }
    },
    [canDownloadAndOpen, resource, onFileUpdated]
  );

  const handleSaveFixedPdfToServer = useCallback(async () => {
    if (!canDownloadAndOpen || !resource?.id || !activePdfBytes) return;
    const safeTitle = (resource.title || courseCode || "normalized_document")
      .replace(/[^a-z0-9._-]+/gi, "_")
      .replace(/\.pdf$/i, "");
    const fixedFile = new File([activePdfBytes as any], `${safeTitle}.pdf`, {
      type: "application/pdf",
    });
    const savedUrl = await persistFixedFileToResource(
      fixedFile,
      "Fixed uniform PDF saved permanently!"
    );
    if (savedUrl) {
      setRawPdfBytes(activePdfBytes);
      setPageExtraRotations({});
      setAutoAlignedPagesList([]);
      setPdfChangedFromRaw(false);
    }
  }, [canDownloadAndOpen, resource, courseCode, activePdfBytes, persistFixedFileToResource]);

  const handleSaveFixedImageToServer = useCallback(
    async (convertToPortraitPdf: boolean) => {
      if (!canDownloadAndOpen || !resource?.id || !rawImageBlob) return;
      const safeTitle = (resource.title || courseCode || "material")
        .replace(/[^a-z0-9._-]+/gi, "_")
        .replace(/\.(jpe?g|png|webp|gif|pdf)$/i, "");
      const srcFile = new File([rawImageBlob], `${safeTitle}.jpg`, {
        type: rawImageBlob.type || "image/jpeg",
      });

      if (convertToPortraitPdf) {
        setSavingFixedFile(true);
        try {
          const pdfFile = await mergeFilesToSinglePdf([srcFile], safeTitle, undefined, {
            pageRotations: { 0: rotation },
            forcePortraitA4: true,
          });
          setSavingFixedFile(false);
          const savedUrl = await persistFixedFileToResource(
            pdfFile,
            "Image converted to Portrait A4 PDF and saved!"
          );
          if (savedUrl) {
            setRotation(0);
            setActiveImageBytes(null);
            setRetryTick((t) => t + 1);
          }
        } catch (err: any) {
          setSavingFixedFile(false);
          toast.error(err?.message || "Failed to convert image to Portrait A4 PDF");
        }
        return;
      }

      const bytesToUpload =
        activeImageBytes || (await convertImageToJpegBytes(srcFile, rotation)).bytes;
      const fixedImgFile = new File([bytesToUpload as any], `${safeTitle}.jpg`, {
        type: "image/jpeg",
      });
      const savedUrl = await persistFixedFileToResource(
        fixedImgFile,
        "Upright image saved permanently!"
      );
      if (savedUrl) {
        const nextRawBlob = new Blob([bytesToUpload as any], { type: "image/jpeg" });
        setRawImageBlob(nextRawBlob);
        setActiveImageBytes(null);
        setImageCssFallback(false);
        setRotation(0);
        replaceBlobUrl(URL.createObjectURL(nextRawBlob));
      }
    },
    [
      canDownloadAndOpen,
      resource,
      courseCode,
      rawImageBlob,
      rotation,
      activeImageBytes,
      persistFixedFileToResource,
      replaceBlobUrl,
    ]
  );

  const rotateShortcutRef = useRef<() => void>(() => {});
  useEffect(() => {
    rotateShortcutRef.current = () => {
      if (detectedKind === "pdf" && rawPdfBytes && pdfPageCount > 0) {
        void handleRotateActivePdfPage(90);
      } else if (detectedKind === "image" && rawImageBlob) {
        void applyImageRotation(rotation + 90);
      } else {
        setRotation((prev) => (prev + 90) % 360);
      }
    };
  });

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
        rotateShortcutRef.current();
      } else if (e.key === "f" || e.key === "F") {
        setIsFullscreen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isFullscreen, onClose]);

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
  const handleRotateStep = (deltaDeg: number) => {
    if (detectedKind === "image" && rawImageBlob) {
      void applyImageRotation(rotation + deltaDeg);
    } else {
      setRotation((prev) => normalizeRotationDegrees(prev + deltaDeg));
    }
  };
  const handleResetRotation = () => {
    if (detectedKind === "image" && rawImageBlob) {
      void applyImageRotation(0);
    } else {
      setRotation(0);
    }
  };
  const toggleFullscreen = () => setIsFullscreen((prev) => !prev);

  const openableTabUrl =
    blobUrl ||
    (detectedKind === "drive-embed" ? drivePreviewUrl : "") ||
    (detectedKind === "pdf-embed" ? embedUrl : "") ||
    resolveSafeEmbedUrl(resource.fileUrl, resource.id, isAdminMode) ||
    "";

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
      const ext = detectedKind === "image" ? (activeImageBytes ? ".jpg" : "") : ".pdf";
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
      window.open(resolveSafeEmbedUrl(resource.fileUrl, resource.id, isAdminMode), "_blank", "noopener,noreferrer");
    }
  };

  const displayTitle = resource.title || `${courseCode} Academic Document`;
  const applyCssTransformRotation =
    rotation !== 0 && (detectedKind !== "image" || imageCssFallback);
  const cssRotationDeg = applyCssTransformRotation ? rotation : 0;
  const isRotated = applyCssTransformRotation && rotation % 180 !== 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
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
                  {resource.type ? resource.type.replace(/_/g, " ") : "Document"} • {formatSemesterDisplay(resource.semesterName, resource.academicYear)}
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

              {/* Rotate Controls (Per-Page PDF Normalization vs Global Image Rotate) */}
              {detectedKind === "pdf" && rawPdfBytes && pdfPageCount > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {pdfPageCount > 1 && (
                    <div className="flex items-center bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <button
                        type="button"
                        disabled={activePdfPage <= 1}
                        onClick={() => setActivePdfPage((p) => Math.max(1, p - 1))}
                        className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors cursor-pointer"
                        title="Previous Page"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200">
                        Pg {activePdfPage}/{pdfPageCount}
                      </span>
                      <button
                        type="button"
                        disabled={activePdfPage >= pdfPageCount}
                        onClick={() => setActivePdfPage((p) => Math.min(pdfPageCount, p + 1))}
                        className="p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors cursor-pointer"
                        title="Next Page"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <button
                      type="button"
                      onClick={() => handleRotateActivePdfPage(-90)}
                      className="p-1 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title={`Rotate Page ${activePdfPage} 90° Counter-Clockwise`}
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRotateActivePdfPage(90)}
                      className="px-2 py-1 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 font-bold text-[11px] cursor-pointer"
                      title={`Rotate Page ${activePdfPage} 90° Clockwise [Key: R]`}
                    >
                      <RotateCw className="w-3.5 h-3.5 text-blue-500" />
                      <span>Rotate {pdfPageCount > 1 ? `Pg ${activePdfPage}` : "90°"}</span>
                    </button>
                    {(pdfChangedFromRaw || Object.keys(pageExtraRotations).length > 0) && (
                      <button
                        type="button"
                        onClick={handleResetPdfRotations}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border-l border-slate-200 dark:border-slate-700 ml-0.5 cursor-pointer"
                        title="Restore original PDF pages"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {pdfPageCount > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRotateAllPdfPages(90)}
                      className="px-2 py-1 rounded-xl text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                      title="Rotate all pages 90° clockwise together"
                    >
                      <RotateCw className="w-3 h-3 text-blue-500" />
                      <span>All +90°</span>
                    </button>
                  )}

                  {autoAlignedPagesList.length > 0 && (
                    <button
                      type="button"
                      onClick={handleToggleAutoAlignPdf}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-colors cursor-pointer ${
                        autoAlignMixedPdf
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20"
                          : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                      }`}
                      title={`Pages ${autoAlignedPagesList.join(", ")} were normalized to Portrait A4. Click to toggle.`}
                    >
                      {autoAlignMixedPdf
                        ? `✓ Pg ${autoAlignedPagesList.join(",")} Aligned`
                        : "Original Format"}
                    </button>
                  )}

                  {canDownloadAndOpen && resource.id && pdfChangedFromRaw && (
                    <button
                      type="button"
                      onClick={handleSaveFixedPdfToServer}
                      disabled={savingFixedFile}
                      className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                      title="Persist uniform normalized PDF to database & storage"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingFixedFile ? "Saving..." : "Save Fixed PDF"}</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="flex items-center bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <button
                      type="button"
                      onClick={() => handleRotateStep(-90)}
                      className="p-1 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title="Rotate 90° Counter-Clockwise"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRotateStep(90)}
                      className="px-2 py-1 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 font-bold text-[11px] cursor-pointer"
                      title="Rotate document 90° clockwise (Side korao) [Key: R]"
                    >
                      <RotateCw className="w-3.5 h-3.5 text-blue-500" />
                      <span>{rotation === 0 ? "Rotate 90°" : `${rotation}°`}</span>
                    </button>

                    {rotation !== 0 && (
                      <button
                        type="button"
                        onClick={handleResetRotation}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border-l border-slate-200 dark:border-slate-700 ml-0.5 cursor-pointer"
                        title="Reset rotation to 0°"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {canDownloadAndOpen && resource.id && detectedKind === "image" && rawImageBlob && (
                    <>
                      {rotation !== 0 && (
                        <button
                          type="button"
                          onClick={() => void handleSaveFixedImageToServer(false)}
                          disabled={savingFixedFile}
                          className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                          title="Permanently overwrite material with this upright image"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{savingFixedFile ? "Saving..." : "Save Fixed Image"}</span>
                        </button>
                      )}
                      {(rotation !== 0 || imageIsLandscape) && (
                        <button
                          type="button"
                          onClick={() => void handleSaveFixedImageToServer(true)}
                          disabled={savingFixedFile}
                          className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                          title="Convert and permanently save as uniform Portrait A4 PDF"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{savingFixedFile ? "Saving..." : "Save as A4 PDF"}</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
              {detectedKind === "pdf-embed" && embedUrl.startsWith("http") && (
                <button
                  type="button"
                  onClick={() => setUseGoogleDocsEmbed((v) => !v)}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                    useGoogleDocsEmbed
                      ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-xs"
                  }`}
                  title="Switch between Direct Native PDF Viewer and Google Docs Cloud Viewer"
                >
                  <FileText className="w-3 h-3 text-blue-400" />
                  <span>{useGoogleDocsEmbed ? "Using Google Docs Viewer" : "Switch to Google Viewer"}</span>
                </button>
              )}
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
              className="relative flex items-center justify-center transition-all duration-200 ease-out origin-center w-full min-h-[72vh] sm:min-h-[80vh] h-[78vh] sm:h-[82vh]"
              style={{
                transform: `rotate(${cssRotationDeg}deg) scale(${zoom / 100})`,
                transformOrigin: "center center",
                width: isRotated ? "80vh" : "100%",
                height: isRotated ? "80vw" : "100%",
                minHeight: zoom > 100 ? `${zoom}%` : isRotated ? "80vw" : "75vh",
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
                      {resource.fileUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setDetectedKind("pdf-embed");
                            setEmbedUrl(resolveSafeEmbedUrl(resource.fileUrl, resource.id, isAdminMode));
                            setDocError(null);
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Force Preview
                        </button>
                      )}
                      {canDownloadAndOpen && resource.fileUrl && (
                        <a
                          href={resolveSafeEmbedUrl(resource.fileUrl, resource.id, isAdminMode)}
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
              ) : detectedKind === "pdf-embed" && embedUrl ? (
                /* Resilient Embedded Cloud Document Frame for 50MB+ Files */
                <div className="w-full h-full relative min-h-[500px]">
                  <iframe
                    key={useGoogleDocsEmbed ? `gdocs-${embedUrl}` : `direct-${embedUrl}`}
                    src={
                      useGoogleDocsEmbed && embedUrl.startsWith("http")
                        ? `https://docs.google.com/viewer?url=${encodeURIComponent(embedUrl)}&embedded=true`
                        : `${embedUrl}#toolbar=0&navpanes=0`
                    }
                    className="w-full h-full border-none rounded-xl shadow-lg bg-white min-h-[500px]"
                    title={displayTitle}
                  />
                </div>
              ) : detectedKind === "drive-embed" && drivePreviewUrl ? (
                <iframe
                  src={drivePreviewUrl}
                  className="w-full h-full border-none rounded-xl shadow-lg bg-white min-h-[500px]"
                  title={displayTitle}
                  allow="autoplay"
                />
              ) : detectedKind === "pdf" && blobUrl ? (
                /* Embedded Document Frame (with #toolbar=0 to suppress browser PDF download/print tools) */
                <iframe
                  key={`${blobUrl}-p${activePdfPage}`}
                  src={`${blobUrl}#page=${activePdfPage}&toolbar=0&navpanes=0`}
                  className="w-full h-full border-none rounded-xl shadow-lg bg-white min-h-[500px]"
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
