"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Upload,
  FileText,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Layers,
  Image as ImageIcon,
  AlertCircle,
  RotateCw,
  RotateCcw,
  Eye,
  Zap,
} from "lucide-react";
import {
  mergeFilesToSinglePdf,
  computeAutoPortraitRotations,
  inspectImageFile,
  isImageFileObject,
  isPdfFileObject,
  normalizeRotationDegrees,
  RotationDegrees,
} from "@/lib/pdfMerger";
import { toast } from "sonner";

export interface UploadResult {
  url: string;
  fileName?: string;
  fileSize?: string;
}

function getDocumentColorClass(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "text-red-500";
    case "doc":
    case "docx":
      return "text-blue-500";
    case "ppt":
    case "pptx":
      return "text-amber-500";
    case "xls":
    case "xlsx":
      return "text-emerald-500";
    case "zip":
    case "rar":
    case "7z":
      return "text-purple-500";
    default:
      return "text-indigo-500";
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface MultiPageUploaderProps {
  uploadFn: (
    file: File,
    onProgress?: (percent: number, loadedBytes: number, totalBytes: number) => void
  ) => Promise<UploadResult>;
  onUploadSuccess: (result: UploadResult, originalFiles: File[]) => void;
  onClear?: () => void;
  onInspectExisting?: () => void;
  initialUrl?: string;
  initialFileName?: string;
  initialFileSize?: string;
  titleHint?: string;
  language?: "en" | "bn";
  accentColor?: "blue" | "emerald";
  maxFileSizeMb?: number;
}

export default function MultiPageUploader({
  uploadFn,
  onUploadSuccess,
  onClear,
  onInspectExisting,
  initialUrl = "",
  initialFileName = "",
  initialFileSize = "",
  titleHint = "",
  language = "en",
  accentColor = "blue",
  maxFileSizeMb = 100,
}: MultiPageUploaderProps) {
  const [pageFiles, setPageFiles] = useState<File[]>([]);
  const [pageRotations, setPageRotations] = useState<RotationDegrees[]>([]);
  const [pageIsLandscapeRaw, setPageIsLandscapeRaw] = useState<boolean[]>([]);
  const [autoAlignedCount, setAutoAlignedCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState<string>("");
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [uploadLoaded, setUploadLoaded] = useState<number>(0);
  const [uploadTotal, setUploadTotal] = useState<number>(0);
  const [optimizationSavings, setOptimizationSavings] = useState<{
    original: number;
    final: number;
    percent: number;
  } | null>(null);
  const [uploadedResult, setUploadedResult] = useState<UploadResult | null>(
    initialUrl
      ? {
          url: initialUrl,
          fileName: initialFileName,
          fileSize: initialFileSize,
        }
      : null
  );
  const [localMergedBlobUrl, setLocalMergedBlobUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const addMoreInputRef = useRef<HTMLInputElement | null>(null);
  const uploadSeqRef = useRef(0);
  const [pendingRotationSync, setPendingRotationSync] = useState<{
    files: File[];
    rotations: RotationDegrees[];
  } | null>(null);

  // Sync initial values if parent updates them (e.g. edit mode in modal or form reset)
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      if (initialUrl) {
        setUploadedResult((prev) =>
          prev && prev.url === initialUrl
            ? prev
            : {
                url: initialUrl,
                fileName: initialFileName,
                fileSize: initialFileSize,
              }
        );
        setPageFiles([]);
        setPageRotations([]);
        setPageIsLandscapeRaw([]);
        setAutoAlignedCount(0);
        setLocalMergedBlobUrl((prevBlob) => {
          if (prevBlob) URL.revokeObjectURL(prevBlob);
          return null;
        });
      } else {
        setUploadedResult(null);
        setPageFiles([]);
        setPageRotations([]);
        setPageIsLandscapeRaw([]);
        setAutoAlignedCount(0);
        setLocalMergedBlobUrl((prevBlob) => {
          if (prevBlob) URL.revokeObjectURL(prevBlob);
          return null;
        });
      }
    });
    return () => {
      active = false;
    };
  }, [initialUrl, initialFileName, initialFileSize]);

  // Create preview URLs for images
  const previews = useMemo(() => {
    return pageFiles.map((file) => {
      if (file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name)) {
        return URL.createObjectURL(file);
      }
      return null;
    });
  }, [pageFiles]);

  // Clean up object URLs and pending debounce timers when component unmounts
  useEffect(() => {
    return () => {
      previews.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
      if (localMergedBlobUrl) {
        URL.revokeObjectURL(localMergedBlobUrl);
      }
    };
  }, [previews, localMergedBlobUrl]);

  // Theme styling helpers
  const isEmerald = accentColor === "emerald";
  const borderFocusClass = isEmerald ? "hover:border-emerald-500" : "hover:border-blue-500";
  const dragActiveBorderClass = isEmerald
    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
    : "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20";
  const iconBgClass = isEmerald
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    : "bg-blue-500/10 text-blue-600 dark:text-blue-400";
  const badgeClass = isEmerald
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
    : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
  const buttonPrimaryClass = isEmerald
    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
    : "bg-blue-600 hover:bg-blue-700 text-white";

  // Process & Merge files, then upload to backend
  const processAndUploadFiles = useCallback(
    async (filesToProcess: File[], rotationsList?: RotationDegrees[]) => {
      if (!filesToProcess || filesToProcess.length === 0) return;

      // Check max size
      const totalBytes = filesToProcess.reduce((acc, f) => acc + f.size, 0);
      if (totalBytes > maxFileSizeMb * 1024 * 1024) {
        toast.error(
          language === "bn"
            ? `ফাইলের মোট আকার ${maxFileSizeMb} MB এর বেশি হতে পারবে না।`
            : `Total file size exceeds ${maxFileSizeMb} MB limit.`
        );
        return;
      }

      const seq = ++uploadSeqRef.current;
      const rotationMap: Record<number, number> = {};
      if (rotationsList) {
        rotationsList.forEach((rot, idx) => {
          rotationMap[idx] = rot;
        });
      }

      setIsProcessing(true);
      const isMultiPage = filesToProcess.length > 1;

      try {
        let finalFileToUpload: File;

        if (isMultiPage) {
          // Check if any non-mergeable standalone document is present
          const nonMergeable = filesToProcess.filter(
            (f) => !isImageFileObject(f) && !isPdfFileObject(f)
          );
          if (nonMergeable.length > 0) {
            throw new Error(
              language === "bn"
                ? "Word, PowerPoint বা Zip ফাইল একাধিক পৃষ্ঠার সাথে মার্জ করা যায় না। অনুগ্রহ করে একক ফাইল হিসেবে আপলোড করুন অথবা একাধিক ছবি/PDF সিলেক্ট করুন।"
                : "Word, PowerPoint, or Zip documents cannot be merged across multiple pages. Please upload them individually or select images/PDFs."
            );
          }

          setProcessStatus(
            language === "bn"
              ? `${filesToProcess.length}টি পৃষ্ঠা একই ফরম্যাটে (Portrait A4) PDF ফাইলে মার্জ হচ্ছে...`
              : `Normalizing & merging ${filesToProcess.length} pages into 1 uniform PDF...`
          );

          finalFileToUpload = await mergeFilesToSinglePdf(
            filesToProcess,
            titleHint || "Exam_Material",
            (curr, tot) => {
              if (uploadSeqRef.current !== seq) return;
              setProcessStatus(
                language === "bn"
                  ? `মার্জ হচ্ছে (পৃষ্ঠা ${curr}/${tot})...`
                  : `Merging (Page ${curr}/${tot})...`
              );
            },
            { pageRotations: rotationMap, autoAlignMixed: true }
          );
        } else {
          // Single file handling
          const single = filesToProcess[0];

          if (isImageFileObject(single)) {
            // Single image: convert to uniform A4 PDF
            setProcessStatus(
              language === "bn"
                ? "ছবিটি পরিষ্কার A4 PDF ডকুমেন্টে রূপান্তর হচ্ছে..."
                : "Converting image to clean A4 PDF document..."
            );
            finalFileToUpload = await mergeFilesToSinglePdf(
              [single],
              titleHint || single.name.replace(/\.[^/.]+$/, ""),
              undefined,
              { pageRotations: rotationMap, autoAlignMixed: true }
            );
          } else if (isPdfFileObject(single)) {
            // Single PDF: normalize if possible, with clean fallback if protected/complex
            setProcessStatus(
              language === "bn"
                ? "PDF ফাইলটি প্রস্তুত করা হচ্ছে..."
                : "Preparing PDF document..."
            );
            try {
              finalFileToUpload = await mergeFilesToSinglePdf(
                [single],
                titleHint || single.name.replace(/\.[^/.]+$/, ""),
                undefined,
                { pageRotations: rotationMap, autoAlignMixed: true }
              );
            } catch (pdfErr) {
              console.warn("Direct PDF upload fallback (normalization skipped):", pdfErr);
              finalFileToUpload = single;
            }
          } else {
            // Standalone Document (Word doc/docx, PowerPoint ppt/pptx, Excel xls/xlsx, Zip, Text, etc.)
            const extUpper = single.name.split(".").pop()?.toUpperCase() || "DOCUMENT";
            setProcessStatus(
              language === "bn"
                ? `${extUpper} ফাইলটি সার্ভারে আপলোড হচ্ছে (${single.name})...`
                : `Uploading ${extUpper} file (${single.name})...`
            );
            finalFileToUpload = single;
          }
        }

        if (uploadSeqRef.current !== seq) return;

        const originalTotalBytes = filesToProcess.reduce((sum, f) => sum + f.size, 0);
        const finalBytes = finalFileToUpload.size;
        if (originalTotalBytes > finalBytes && (originalTotalBytes - finalBytes) > 200 * 1024) {
          const savedPct = Math.round(((originalTotalBytes - finalBytes) / originalTotalBytes) * 100);
          setOptimizationSavings({ original: originalTotalBytes, final: finalBytes, percent: savedPct });
        } else {
          setOptimizationSavings(null);
        }

        setUploadPercent(0);
        setUploadLoaded(0);
        setUploadTotal(finalBytes);

        // Cache local blob URL so client can preview/download instantly
        let blobUrl: string | null = null;
        try {
          blobUrl = URL.createObjectURL(finalFileToUpload);
          setLocalMergedBlobUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return blobUrl;
          });
        } catch {
          // Ignore
        }

        setProcessStatus(
          language === "bn"
            ? "সার্ভারে ফাইল আপলোড হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন"
            : "Uploading file to server... Please wait"
        );

        const res = await uploadFn(finalFileToUpload, (pct, loaded, total) => {
          if (uploadSeqRef.current !== seq) return;
          setUploadPercent(pct);
          setUploadLoaded(loaded);
          setUploadTotal(total);
          const loadedMb = (loaded / 1048576).toFixed(1);
          const totalMb = (total / 1048576).toFixed(1);
          setProcessStatus(
            language === "bn"
              ? `সার্ভারে আপলোড হচ্ছে... ${pct}% (${loadedMb} MB / ${totalMb} MB)`
              : `Uploading to server... ${pct}% (${loadedMb} MB / ${totalMb} MB)`
          );
        });
        if (uploadSeqRef.current !== seq) return;

        const uploadData: UploadResult = {
          url: res.url,
          fileName: res.fileName || finalFileToUpload.name,
          fileSize:
            res.fileSize ||
            `${(finalFileToUpload.size / (1024 * 1024)).toFixed(1)} MB`,
        };

        setUploadedResult(uploadData);
        onUploadSuccess(uploadData, filesToProcess);

        const ext = finalFileToUpload.name.split(".").pop()?.toUpperCase() || "FILE";
        toast.success(
          isMultiPage
            ? language === "bn"
              ? `সফল! ${filesToProcess.length}টি পৃষ্ঠা একই ফরম্যাটে ১টি PDF এ মার্জ এবং আপলোড হয়েছে!`
              : `Success! ${filesToProcess.length} pages normalized into 1 uniform PDF and uploaded!`
            : language === "bn"
            ? `${ext} ফাইল সফলভাবে আপলোড সম্পন্ন হয়েছে!`
            : `${ext} file uploaded successfully!`
        );
      } catch (err: any) {
        if (uploadSeqRef.current !== seq) return;
        console.error("MultiPage upload error:", err);
        toast.error(
          err.message ||
            (language === "bn"
              ? "ফাইল মার্জ বা আপলোড করতে ব্যর্থ হয়েছে"
              : "Failed to merge or upload file")
        );
      } finally {
        if (uploadSeqRef.current === seq) {
          setIsProcessing(false);
          setProcessStatus("");
        }
      }
    },
    [uploadFn, onUploadSuccess, titleHint, language, maxFileSizeMb]
  );

  // Inspect raw orientations + compute auto-alignment + trigger merge/upload
  const resolveOrientationsAndUpload = useCallback(
    async (nextFiles: File[], preserveRotations?: Record<number, number>) => {
      setPendingRotationSync(null);

      // Check for standalone documents mixed with multiple files
      const nonMergeable = nextFiles.filter(
        (f) => !isImageFileObject(f) && !isPdfFileObject(f)
      );
      if (nonMergeable.length > 0 && nextFiles.length > 1) {
        toast.error(
          language === "bn"
            ? "Word, PowerPoint বা Zip ফাইল একাধিক পৃষ্ঠার সাথে মার্জ করা যায় না। অনুগ্রহ করে একক ফাইল হিসেবে আপলোড করুন অথবা একাধিক ছবি/PDF সিলেক্ট করুন।"
            : "Word, PowerPoint, or Zip documents cannot be merged across multiple pages. Please upload single files or select images/PDFs."
        );
        return;
      }

      const rawFlags = await Promise.all(
        nextFiles.map(async (f) => {
          if (!isImageFileObject(f)) return false;
          try {
            const info = await inspectImageFile(f);
            return info.isLandscape;
          } catch {
            return false;
          }
        })
      );

      const analysis = await computeAutoPortraitRotations(nextFiles, preserveRotations);
      const nextRotations = nextFiles.map((_, idx) => analysis.rotations[idx] ?? 0);

      setPageFiles(nextFiles);
      setPageRotations(nextRotations);
      setPageIsLandscapeRaw(rawFlags);
      setAutoAlignedCount(analysis.autoAlignedIndices.length);

      if (analysis.autoAlignedIndices.length > 0) {
        toast.info(
          language === "bn"
            ? `${analysis.autoAlignedIndices.length}টি ঘোরানো (sideways) ছবি স্বয়ংক্রিয়ভাবে সোজা Portrait ফরম্যাটে ঠিক করা হয়েছে।`
            : `Auto-aligned ${analysis.autoAlignedIndices.length} sideways photo(s) to match uniform Portrait format.`
        );
      }

      processAndUploadFiles(nextFiles, nextRotations);
    },
    [language, processAndUploadFiles]
  );

  // Handle newly selected files from primary input
  const handleFilesSelected = (newFileList: FileList | File[]) => {
    const filesArray = Array.from(newFileList);
    if (filesArray.length === 0) return;

    resolveOrientationsAndUpload(filesArray);
  };

  // Append additional pages (+ Add Page)
  const handleAddMoreFiles = (newFileList: FileList | File[]) => {
    const additional = Array.from(newFileList);
    if (additional.length === 0) return;

    // Disallow adding more files if currently selected or newly selected is a standalone doc (Word, Zip, etc.)
    const currentHasNonMergeable = pageFiles.some(
      (f) => !isImageFileObject(f) && !isPdfFileObject(f)
    );
    const newHasNonMergeable = additional.some(
      (f) => !isImageFileObject(f) && !isPdfFileObject(f)
    );

    if (currentHasNonMergeable || newHasNonMergeable) {
      toast.error(
        language === "bn"
          ? "Word বা Zip ফাইলের সাথে অন্য পৃষ্ঠা জোড়া লাগানো যায় না। নতুন ফাইল দিতে চাইলে আগে 'মুছুন' (Clear) চাপুন।"
          : "Word or Zip documents cannot be merged with other pages. Please clear the current file first."
      );
      return;
    }

    const preserveMap: Record<number, number> = {};
    pageRotations.forEach((rot, idx) => {
      preserveMap[idx] = rot;
    });
    const combined = [...pageFiles, ...additional];
    resolveOrientationsAndUpload(combined, preserveMap);
  };

  useEffect(() => {
    if (!pendingRotationSync) return;
    const timer = setTimeout(() => {
      setPendingRotationSync(null);
      processAndUploadFiles(pendingRotationSync.files, pendingRotationSync.rotations);
    }, 600);
    return () => clearTimeout(timer);
  }, [pendingRotationSync, processAndUploadFiles]);

  // Reorder: Move file left / earlier
  const handleMoveLeft = useCallback((index: number) => {
    if (index <= 0) return;
    setPendingRotationSync(null);
    const nextFiles = [...pageFiles];
    [nextFiles[index - 1], nextFiles[index]] = [nextFiles[index], nextFiles[index - 1]];

    const nextRots = [...pageRotations];
    [nextRots[index - 1], nextRots[index]] = [nextRots[index] ?? 0, nextRots[index - 1] ?? 0];

    const nextFlags = [...pageIsLandscapeRaw];
    [nextFlags[index - 1], nextFlags[index]] = [nextFlags[index] ?? false, nextFlags[index - 1] ?? false];

    setPageFiles(nextFiles);
    setPageRotations(nextRots);
    setPageIsLandscapeRaw(nextFlags);
    processAndUploadFiles(nextFiles, nextRots);
  }, [pageFiles, pageRotations, pageIsLandscapeRaw, processAndUploadFiles]);

  // Reorder: Move file right / later
  const handleMoveRight = useCallback((index: number) => {
    if (index >= pageFiles.length - 1) return;
    setPendingRotationSync(null);
    const nextFiles = [...pageFiles];
    [nextFiles[index + 1], nextFiles[index]] = [nextFiles[index], nextFiles[index + 1]];

    const nextRots = [...pageRotations];
    [nextRots[index + 1], nextRots[index]] = [nextRots[index] ?? 0, nextRots[index + 1] ?? 0];

    const nextFlags = [...pageIsLandscapeRaw];
    [nextFlags[index + 1], nextFlags[index]] = [nextFlags[index] ?? false, nextFlags[index + 1] ?? false];

    setPageFiles(nextFiles);
    setPageRotations(nextRots);
    setPageIsLandscapeRaw(nextFlags);
    processAndUploadFiles(nextFiles, nextRots);
  }, [pageFiles, pageRotations, pageIsLandscapeRaw, processAndUploadFiles]);

  // Rotate a specific page by delta degrees (-90 or +90) and debounce PDF rebuild
  const handleRotatePage = useCallback((index: number, deltaDeg: number) => {
    const nextRots = pageFiles.map((_, i) =>
      i === index
        ? normalizeRotationDegrees((pageRotations[i] ?? 0) + deltaDeg)
        : pageRotations[i] ?? 0
    );
    setPageRotations(nextRots);
    setPendingRotationSync({ files: [...pageFiles], rotations: nextRots });
  }, [pageFiles, pageRotations]);

  // One-click Align All Sideways Images to Portrait A4
  const handleAlignAllPortrait = useCallback(() => {
    setPendingRotationSync(null);
    const nextRots: RotationDegrees[] = pageFiles.map((f, idx) => {
      if (!isImageFileObject(f)) return pageRotations[idx] ?? 0;
      const isRawLand = pageIsLandscapeRaw[idx] ?? false;
      const currentRot = pageRotations[idx] ?? 0;
      const isEffectivelyLand = (currentRot === 90 || currentRot === 270) ? !isRawLand : isRawLand;
      return isEffectivelyLand ? normalizeRotationDegrees(currentRot + 90) : currentRot;
    });
    setPageRotations(nextRots);
    processAndUploadFiles(pageFiles, nextRots);
  }, [pageFiles, pageRotations, pageIsLandscapeRaw, processAndUploadFiles]);

  // Remove a specific page
  const handleRemovePage = useCallback((index: number) => {
    setPendingRotationSync(null);
    const nextFiles = pageFiles.filter((_, i) => i !== index);
    const nextRots = pageRotations.filter((_, i) => i !== index);
    const nextFlags = pageIsLandscapeRaw.filter((_, i) => i !== index);
    setPageFiles(nextFiles);
    setPageRotations(nextRots);
    setPageIsLandscapeRaw(nextFlags);
    if (nextFiles.length > 0) {
      processAndUploadFiles(nextFiles, nextRots);
    } else {
      setUploadedResult(null);
      setAutoAlignedCount(0);
      if (onClear) onClear();
    }
  }, [pageFiles, pageRotations, pageIsLandscapeRaw, processAndUploadFiles, onClear]);

  // Full clear
  const handleFullClear = () => {
    setPendingRotationSync(null);
    uploadSeqRef.current++;
    setPageFiles([]);
    setPageRotations([]);
    setPageIsLandscapeRaw([]);
    setAutoAlignedCount(0);
    setUploadedResult(null);
    setUploadPercent(0);
    setUploadLoaded(0);
    setUploadTotal(0);
    setOptimizationSavings(null);
    if (localMergedBlobUrl) {
      URL.revokeObjectURL(localMergedBlobUrl);
      setLocalMergedBlobUrl(null);
    }
    if (onClear) onClear();
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (addMoreInputRef.current) addMoreInputRef.current.value = "";
  };

  const remainingLandscapeCount = useMemo(
    () =>
      pageFiles.reduce((acc, f, idx) => {
        if (!isImageFileObject(f)) return acc;
        const isRawLand = pageIsLandscapeRaw[idx] ?? false;
        const rot = pageRotations[idx] ?? 0;
        const isEffLand = rot === 90 || rot === 270 ? !isRawLand : isRawLand;
        return isEffLand ? acc + 1 : acc;
      }, 0),
    [pageFiles, pageIsLandscapeRaw, pageRotations]
  );

  return (
    <div className="space-y-3">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.ppt,.pptx,.zip,application/pdf,image/*"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFilesSelected(e.target.files);
          }
          e.target.value = "";
        }}
        className="hidden"
      />

      <input
        type="file"
        ref={addMoreInputRef}
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.ppt,.pptx,.zip,application/pdf,image/*"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleAddMoreFiles(e.target.files);
          }
          e.target.value = "";
        }}
        className="hidden"
      />

      {/* Case 1: Initial Empty Dropzone (No files selected yet, no currentUrl) */}
      {pageFiles.length === 0 && !uploadedResult && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              handleFilesSelected(e.dataTransfer.files);
            }
          }}
          onClick={() => {
            if (!isProcessing) fileInputRef.current?.click();
          }}
          className={`relative p-6 sm:p-7 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center group ${
            isDragOver
              ? dragActiveBorderClass
              : `border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 ${borderFocusClass} hover:bg-slate-50 dark:hover:bg-slate-900`
          }`}
        >
          <div
            className={`w-12 h-12 rounded-2xl ${iconBgClass} flex items-center justify-center group-hover:scale-110 transition-all shadow-xs`}
          >
            {isProcessing ? (
              <RefreshCw className="w-6 h-6 animate-spin text-current" />
            ) : (
              <Upload className="w-6 h-6" />
            )}
          </div>

          <div className="space-y-1 mt-2.5">
            <p className="font-extrabold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
              {isProcessing
                ? processStatus
                : language === "bn"
                ? "ডিভাইস থেকে ফাইল বা একাধিক পৃষ্ঠা নির্বাচন করুন"
                : "Select file or multiple pages from your device"}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {language === "bn"
                ? "প্রশ্নপত্রের ১ম ও ২য় পৃষ্ঠা বা নোট একসাথে সিলেক্ট করুন — স্বয়ংক্রিয়ভাবে ১টি PDF এ মার্জ হয়ে সেভ হবে।"
                : "Select Page 1 & Page 2 of question papers together — auto-merges into 1 clean PDF document."}
            </p>
          </div>

          <div className="flex items-center gap-1.5 pt-2 flex-wrap justify-center">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold border ${badgeClass}`}
            >
              ⚡ Multi-Page Auto-Merge
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
              PDF
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              DOC / DOCX
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              PNG / JPG / WEBP
            </span>
            <span className="text-[10px] text-slate-400 font-semibold ml-1">
              (Max {maxFileSizeMb} MB • Large Notes & Slides Supported)
            </span>
          </div>

          <button
            type="button"
            className={`mt-3.5 px-4 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${buttonPrimaryClass}`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>
              {language === "bn" ? "ফাইল / পেজ বেছে নিন" : "Browse & Select Pages"}
            </span>
          </button>
        </div>
      )}

      {/* Case 2: Multi-Page Gallery & Reordering Grid (When 1 or more pages are in state) */}
      {pageFiles.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3.5">
          {/* Gallery Header */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${iconBgClass}`}>
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-xs text-slate-900 dark:text-white">
                    {language === "bn"
                      ? `নির্বাচিত পৃষ্ঠা (${pageFiles.length}টি)`
                      : `Selected Document Pages (${pageFiles.length})`}
                  </span>
                  {(pageFiles.length > 1 || (pageFiles.length === 1 && isImageFileObject(pageFiles[0]))) && (
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}
                    >
                      ✓ Uniform A4 PDF
                    </span>
                  )}
                  {pageFiles.length === 1 && !isImageFileObject(pageFiles[0]) && isPdfFileObject(pageFiles[0]) && (
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}
                    >
                      ✓ PDF Document
                    </span>
                  )}
                  {pageFiles.length === 1 && !isImageFileObject(pageFiles[0]) && !isPdfFileObject(pageFiles[0]) && (
                    <span
                      className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25"
                    >
                      ✓ {pageFiles[0].name.split(".").pop()?.toUpperCase() || "DOCUMENT"}
                    </span>
                  )}
                  {autoAlignedCount > 0 && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25">
                      ↻ {autoAlignedCount} Auto-Aligned
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {pageFiles.length === 1 && !isImageFileObject(pageFiles[0]) && !isPdfFileObject(pageFiles[0])
                    ? (language === "bn"
                        ? "একক ডকুমেন্ট ফাইল হিসেবে সরাসরি ক্লাউড সার্ভারে আপলোড ও সংরক্ষিত হচ্ছে।"
                        : "Uploaded directly as a standalone document without image conversion.")
                    : (language === "bn"
                        ? "ক্রম বদলাতে (← / →) ও বাঁকা ছবি সোজা করতে (↺ / ↻) চাপুন — সবগুলো একই Portrait A4 ফরম্যাটে সেভ হবে।"
                        : "Use (← / →) to reorder and (↺ / ↻) to fix sideways photos — all pages merge into the same A4 format.")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {remainingLandscapeCount > 0 && (
                <button
                  type="button"
                  onClick={handleAlignAllPortrait}
                  disabled={isProcessing}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Rotate sideways images 90° to Portrait format"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>
                    {language === "bn" ? "সব Portrait করুন" : "Align Portrait"}
                  </span>
                </button>
              )}

              {!pageFiles.some((f) => !isImageFileObject(f) && !isPdfFileObject(f)) && (
                <button
                  type="button"
                  onClick={() => addMoreInputRef.current?.click()}
                  disabled={isProcessing}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3 h-3" />
                  <span>{language === "bn" ? "+ পৃষ্ঠা যোগ করুন" : "+ Add Page"}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleFullClear}
                disabled={isProcessing}
                className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 hover:bg-rose-100 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3" />
                <span>{language === "bn" ? "মুছুন" : "Clear"}</span>
              </button>
            </div>
          </div>

          {/* Horizontal Scrollable Thumbnails Strip */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
            {pageFiles.map((file, idx) => {
              const previewUrl = previews[idx];
              const rot = pageRotations[idx] ?? 0;
              const isSidewaysRot = rot === 90 || rot === 270;
              const isImg = isImageFileObject(file);
              return (
                <div
                  key={`${file.name}-${idx}`}
                  className="group relative shrink-0 w-32 sm:w-36 rounded-xl bg-white dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 p-2 shadow-xs hover:border-blue-400 dark:hover:border-blue-500 transition-all flex flex-col items-center"
                >
                  {/* Page Number & Rotation Badge */}
                  <div className="w-full flex items-center justify-between mb-1.5 gap-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {language === "bn" ? `পৃষ্ঠা ${idx + 1}` : `Page ${idx + 1}`}
                      </span>
                      {rot !== 0 && (
                        <span className="text-[9px] font-mono font-bold px-1 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                          {rot}°
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePage(idx)}
                      disabled={isProcessing}
                      className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition-colors cursor-pointer"
                      title="Remove this page"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Thumbnail / Icon Container (uncropped object-contain so sideways pages remain clearly visible) */}
                  <div className="w-full h-24 rounded-lg bg-slate-100 dark:bg-slate-950/90 overflow-hidden flex items-center justify-center relative border border-slate-200/50 dark:border-slate-700/50 p-1">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt={`Page ${idx + 1}`}
                        style={{
                          transform: `rotate(${rot}deg)`,
                        }}
                        className={`object-contain rounded transition-transform duration-200 ${
                          isSidewaysRot ? "max-w-[78px] max-h-[78px]" : "max-w-full max-h-full"
                        }`}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1 text-slate-400">
                        <FileText className={`w-7 h-7 ${getDocumentColorClass(file.name)}`} />
                        <span className="text-[9px] font-mono uppercase font-bold">
                          {file.name.split(".").pop()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Filename & Size */}
                  <p className="text-[10px] font-medium text-slate-700 dark:text-slate-300 truncate w-full mt-1.5 text-center">
                    {file.name}
                  </p>
                  <p className="text-[9px] font-mono text-slate-400 text-center">
                    {(file.size / 1024).toFixed(0)} KB
                  </p>

                  {/* Reorder (← / →) & Per-Page Rotate (↺ / ↻) Controls */}
                  <div className="flex items-center gap-1 mt-1.5 w-full justify-center">
                    <button
                      type="button"
                      onClick={() => handleMoveLeft(idx)}
                      disabled={idx === 0 || isProcessing}
                      className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title="Move earlier"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    {isImg && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleRotatePage(idx, -90)}
                          disabled={isProcessing}
                          className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 disabled:opacity-30 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
                          title="Rotate 90° Counter-Clockwise"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRotatePage(idx, 90)}
                          disabled={isProcessing}
                          className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 disabled:opacity-30 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
                          title="Rotate 90° Clockwise"
                        >
                          <RotateCw className="w-3 h-3" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => handleMoveRight(idx)}
                      disabled={idx === pageFiles.length - 1 || isProcessing}
                      className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      title="Move later"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Quick Add Another Page Slot (only when mergeable) */}
            {!pageFiles.some((f) => !isImageFileObject(f) && !isPdfFileObject(f)) && (
              <button
                type="button"
                onClick={() => addMoreInputRef.current?.click()}
                disabled={isProcessing}
                className="shrink-0 w-24 sm:w-28 h-[168px] rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-white/40 dark:bg-slate-800/40 flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-center px-1">
                  {language === "bn" ? "+ ২য়/পরের পৃষ্ঠা" : "+ Next Page"}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Case 3: Processing & Uploading Status Bar */}
      {isProcessing && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-emerald-500/10 border border-blue-500/30 dark:border-blue-500/20 shadow-xs space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <RefreshCw className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-blue-700 dark:text-blue-300 truncate">
                  {processStatus}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {uploadPercent !== null && uploadTotal > 0
                    ? `${(uploadLoaded / (1024 * 1024)).toFixed(1)} MB / ${(uploadTotal / (1024 * 1024)).toFixed(1)} MB`
                    : (language === "bn"
                        ? "ফাইলটি অপ্টিমাইজ ও সুরক্ষিতভাবে আপলোড হচ্ছে..."
                        : "Optimizing & uploading securely to storage...")}
                </p>
              </div>
            </div>
            {uploadPercent !== null && (
              <span className="text-xs font-mono font-extrabold text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                {uploadPercent}%
              </span>
            )}
          </div>
          {uploadPercent !== null && (
            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 h-1.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.max(5, uploadPercent)}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Case 4: Final Merged / Uploaded Ready Status Card */}
      {!isProcessing && uploadedResult?.url && (
        <div className="space-y-2">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500/30 dark:border-emerald-500/20 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <FileText className={`w-5 h-5 ${getDocumentColorClass(uploadedResult.fileName || "file.pdf")}`} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[200px] sm:max-w-[280px]">
                    {uploadedResult.fileName || "Document"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    {pageFiles.length > 1
                      ? `${pageFiles.length} Pages Merged`
                      : "Ready"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                  {uploadedResult.fileSize && <span>{uploadedResult.fileSize} • </span>}
                  {pageFiles.length === 0 && onInspectExisting ? (
                    <button
                      type="button"
                      onClick={onInspectExisting}
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                      title="Inspect document and fix rotated pages or images"
                    >
                      <Eye className="w-3 h-3" />
                      <span>{language === "bn" ? "দেখুন ও সোজা করুন" : "View & Fix Orientation"}</span>
                    </button>
                  ) : (
                    <a
                      href={localMergedBlobUrl || uploadedResult.url}
                      target="_blank"
                      rel="noreferrer"
                      download={uploadedResult.fileName}
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 font-bold"
                      title="View uploaded document"
                    >
                      <span>
                        {uploadedResult.fileName?.toLowerCase().endsWith(".pdf") || (pageFiles[0] && isImageFileObject(pageFiles[0]))
                          ? (language === "bn" ? "প্রিভিউ দেখুন" : "Preview PDF")
                          : (language === "bn" ? "ফাইল দেখুন" : "Open File")}
                      </span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {!pageFiles.some((f) => !isImageFileObject(f) && !isPdfFileObject(f)) && (
                <button
                  type="button"
                  onClick={() => addMoreInputRef.current?.click()}
                  disabled={isProcessing}
                  className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Add more pages to merge"
                >
                  <Plus className="w-3 h-3" />
                  <span>{language === "bn" ? "+ পৃষ্ঠা যোগ করুন" : "+ Add Page"}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Upload different files"
              >
                <Upload className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleFullClear}
                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title="Remove document"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {optimizationSavings && (
            <div className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/20 flex items-center justify-between text-[11px] text-emerald-800 dark:text-emerald-300">
              <span className="flex items-center gap-1.5 font-semibold">
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                <span>
                  {language === "bn"
                    ? `স্মার্ট অপ্টিমাইজড: ${formatBytes(optimizationSavings.original)} ➔ ${formatBytes(optimizationSavings.final)}`
                    : `Smart Optimized: ${formatBytes(optimizationSavings.original)} ➔ ${formatBytes(optimizationSavings.final)}`}
                </span>
              </span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md font-mono text-[10px]">
                {optimizationSavings.percent}% {language === "bn" ? "স্টোরেজ সাশ্রয়" : "saved"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
