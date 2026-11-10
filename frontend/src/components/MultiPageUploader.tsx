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
} from "lucide-react";
import { mergeFilesToSinglePdf } from "@/lib/pdfMerger";
import { toast } from "sonner";

export interface UploadResult {
  url: string;
  fileName?: string;
  fileSize?: string;
}

interface MultiPageUploaderProps {
  uploadFn: (file: File) => Promise<UploadResult>;
  onUploadSuccess: (result: UploadResult, originalFiles: File[]) => void;
  onClear?: () => void;
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
  initialUrl = "",
  initialFileName = "",
  initialFileSize = "",
  titleHint = "",
  language = "en",
  accentColor = "blue",
  maxFileSizeMb = 50,
}: MultiPageUploaderProps) {
  const [pageFiles, setPageFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState<string>("");
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

  // Sync initial values if parent updates them (e.g. edit mode in modal or form reset)
  useEffect(() => {
    if (initialUrl && (!uploadedResult || uploadedResult.url !== initialUrl)) {
      setUploadedResult({
        url: initialUrl,
        fileName: initialFileName,
        fileSize: initialFileSize,
      });
    } else if (!initialUrl) {
      setUploadedResult(null);
      setPageFiles([]);
      if (localMergedBlobUrl) {
        URL.revokeObjectURL(localMergedBlobUrl);
        setLocalMergedBlobUrl(null);
      }
    }
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

  // Clean up object URLs when pageFiles change or component unmounts
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
    async (filesToProcess: File[]) => {
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

      setIsProcessing(true);
      const isMultiPage = filesToProcess.length > 1;

      try {
        let finalFileToUpload: File;

        if (isMultiPage) {
          setProcessStatus(
            language === "bn"
              ? `${filesToProcess.length}টি পৃষ্ঠা ১টি PDF ফাইলে মার্জ হচ্ছে...`
              : `Merging ${filesToProcess.length} pages into 1 single PDF...`
          );

          finalFileToUpload = await mergeFilesToSinglePdf(
            filesToProcess,
            titleHint || "Exam_Material",
            (curr, tot) => {
              setProcessStatus(
                language === "bn"
                  ? `মার্জ হচ্ছে (পৃষ্ঠা ${curr}/${tot})...`
                  : `Merging (Page ${curr}/${tot})...`
              );
            }
          );
        } else {
          // If 1 image, convert to standard crisp single-page PDF so it looks professional,
          // OR if it's already a PDF or docx, upload directly
          const single = filesToProcess[0];
          if (single.type.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(single.name)) {
            setProcessStatus(
              language === "bn"
                ? "ছবিটি পরিষ্কার PDF ডকুমেন্টে রূপান্তর হচ্ছে..."
                : "Converting image to clean PDF document..."
            );
            finalFileToUpload = await mergeFilesToSinglePdf(
              [single],
              titleHint || single.name.replace(/\.[^/.]+$/, "")
            );
          } else {
            finalFileToUpload = single;
          }
        }

        // Cache local blob URL so client can preview all merged pages instantly
        const blobUrl = URL.createObjectURL(finalFileToUpload);
        setLocalMergedBlobUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return blobUrl;
        });

        setProcessStatus(
          language === "bn"
            ? "সার্ভারে ফাইল আপলোড হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন"
            : "Uploading unified document to server... Please wait"
        );

        const res = await uploadFn(finalFileToUpload);

        const uploadData: UploadResult = {
          url: res.url,
          fileName: res.fileName || finalFileToUpload.name,
          fileSize:
            res.fileSize ||
            `${(finalFileToUpload.size / (1024 * 1024)).toFixed(1)} MB`,
        };

        setUploadedResult(uploadData);
        onUploadSuccess(uploadData, filesToProcess);

        toast.success(
          isMultiPage
            ? language === "bn"
              ? `সফল! ${filesToProcess.length}টি পৃষ্ঠা সফলভাবে ১টি PDF এ মার্জ এবং আপলোড হয়েছে!`
              : `Success! ${filesToProcess.length} pages merged into 1 PDF and uploaded!`
            : language === "bn"
            ? "ফাইল সফলভাবে আপলোড সম্পন্ন হয়েছে!"
            : "File uploaded successfully!"
        );
      } catch (err: any) {
        console.error("MultiPage upload error:", err);
        toast.error(
          err.message ||
            (language === "bn"
              ? "ফাইল মার্জ বা আপলোড করতে ব্যর্থ হয়েছে"
              : "Failed to merge or upload file")
        );
      } finally {
        setIsProcessing(false);
        setProcessStatus("");
      }
    },
    [uploadFn, onUploadSuccess, titleHint, language, maxFileSizeMb]
  );

  // Handle newly selected files from primary input
  const handleFilesSelected = (newFileList: FileList | File[]) => {
    const filesArray = Array.from(newFileList);
    if (filesArray.length === 0) return;

    setPageFiles(filesArray);
    processAndUploadFiles(filesArray);
  };

  // Append additional pages (+ Add Page)
  const handleAddMoreFiles = (newFileList: FileList | File[]) => {
    const additional = Array.from(newFileList);
    if (additional.length === 0) return;

    const combined = [...pageFiles, ...additional];
    setPageFiles(combined);
    processAndUploadFiles(combined);
  };

  // Reorder: Move file left / earlier
  const handleMoveLeft = (index: number) => {
    if (index <= 0) return;
    const next = [...pageFiles];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    setPageFiles(next);
    processAndUploadFiles(next);
  };

  // Reorder: Move file right / later
  const handleMoveRight = (index: number) => {
    if (index >= pageFiles.length - 1) return;
    const next = [...pageFiles];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    setPageFiles(next);
    processAndUploadFiles(next);
  };

  // Remove a specific page
  const handleRemovePage = (index: number) => {
    const next = pageFiles.filter((_, i) => i !== index);
    setPageFiles(next);
    if (next.length > 0) {
      processAndUploadFiles(next);
    } else {
      setUploadedResult(null);
      if (onClear) onClear();
    }
  };

  // Full clear
  const handleFullClear = () => {
    setPageFiles([]);
    setUploadedResult(null);
    if (localMergedBlobUrl) {
      URL.revokeObjectURL(localMergedBlobUrl);
      setLocalMergedBlobUrl(null);
    }
    if (onClear) onClear();
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (addMoreInputRef.current) addMoreInputRef.current.value = "";
  };

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
            <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              PNG / JPG / WEBP
            </span>
            <span className="text-[10px] text-slate-400 font-semibold ml-1">
              (Max {maxFileSizeMb} MB)
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
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs text-slate-900 dark:text-white">
                    {language === "bn"
                      ? `নির্বাচিত পৃষ্ঠা (${pageFiles.length}টি)`
                      : `Selected Document Pages (${pageFiles.length})`}
                  </span>
                  {pageFiles.length > 1 && (
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}
                    >
                      ✓ Auto-Merged PDF
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {language === "bn"
                    ? "ক্রম পরিবর্তন করতে তীরচিহ্ন (← / →) চাপুন। সেভ করার সময় সবগুলো ১টি PDF ডকুমেন্টে রূপান্তর হবে।"
                    : "Use arrows (← / →) to reorder pages. All pages merge cleanly into 1 PDF on save."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => addMoreInputRef.current?.click()}
                disabled={isProcessing}
                className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3 h-3" />
                <span>{language === "bn" ? "+ পৃষ্ঠা যোগ করুন" : "+ Add Page"}</span>
              </button>

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
              return (
                <div
                  key={`${file.name}-${idx}`}
                  className="group relative shrink-0 w-28 sm:w-32 rounded-xl bg-white dark:bg-[#090e1a] border border-slate-200 dark:border-slate-800 p-2 shadow-xs hover:border-blue-400 dark:hover:border-blue-500 transition-all flex flex-col items-center"
                >
                  {/* Page Number Badge */}
                  <div className="w-full flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {language === "bn" ? `পৃষ্ঠা ${idx + 1}` : `Page ${idx + 1}`}
                    </span>
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

                  {/* Thumbnail / Icon Container */}
                  <div className="w-full h-24 rounded-lg bg-slate-100 dark:bg-slate-800/80 overflow-hidden flex items-center justify-center relative border border-slate-200/50 dark:border-slate-700/50">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt={`Page ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1 text-slate-400">
                        <FileText className="w-7 h-7 text-red-500" />
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

                  {/* Reorder Buttons (Move Left / Right) */}
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

            {/* Quick Add Another Page Slot */}
            <button
              type="button"
              onClick={() => addMoreInputRef.current?.click()}
              disabled={isProcessing}
              className="shrink-0 w-24 sm:w-28 h-[160px] rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-white/40 dark:bg-slate-800/40 flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold text-center px-1">
                {language === "bn" ? "+ ২য়/পরের পৃষ্ঠা" : "+ Next Page"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Case 3: Processing & Uploading Status Bar */}
      {isProcessing && (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-3 animate-pulse">
          <RefreshCw className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-blue-700 dark:text-blue-300">
              {processStatus}
            </p>
            <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80">
              {language === "bn"
                ? "পৃষ্ঠাগুলো স্বয়ংক্রিয়ভাবে ১টি পরিচ্ছন্ন PDF এ সাজিয়ে ক্লাউডে আপলোড করা হচ্ছে..."
                : "Pages are being normalized, merged into a single clean PDF and stored safely."}
            </p>
          </div>
        </div>
      )}

      {/* Case 4: Final Merged / Uploaded Ready Status Card */}
      {!isProcessing && uploadedResult?.url && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500/30 dark:border-emerald-500/20 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-red-500" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white text-xs truncate max-w-[200px] sm:max-w-[280px]">
                  {uploadedResult.fileName || "Unified_Exam_Document.pdf"}
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
                <a
                  href={localMergedBlobUrl || uploadedResult.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 font-bold"
                  title="Open merged multi-page PDF"
                >
                  <span>{language === "bn" ? "প্রিভিউ দেখুন" : "Preview PDF"}</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
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
      )}
    </div>
  );
}
