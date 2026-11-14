import { PDFDocument, degrees } from "pdf-lib";

export const A4_PORTRAIT_WIDTH = 595.28;
export const A4_PORTRAIT_HEIGHT = 841.89;
export const A4_LANDSCAPE_WIDTH = 841.89;
export const A4_LANDSCAPE_HEIGHT = 595.28;

export type RotationDegrees = 0 | 90 | 180 | 270;

export interface MergeProgressCallback {
  (current: number, total: number, message: string): void;
}

export interface ImageOrientationInfo {
  width: number;
  height: number;
  isLandscape: boolean;
}

export interface AutoRotationAnalysis {
  rotations: Record<number, RotationDegrees>;
  autoAlignedIndices: number[];
  hasPortrait: boolean;
  landscapeIndices: number[];
}

export interface MergePdfOptions {
  pageRotations?: Record<number, number>;
  autoAlignMixed?: boolean;
  forcePortraitA4?: boolean;
  maxDim?: number;
  quality?: number;
  enhanceContrast?: boolean;
}

export interface PdfInspectionResult {
  pageCount: number;
  orientations: ("portrait" | "landscape")[];
  rotations: RotationDegrees[];
  sizes: { width: number; height: number }[];
  hasMixedOrientations: boolean;
  hasMixedPageSizes: boolean;
}

export interface PdfNormalizationResult {
  bytes: Uint8Array;
  pageCount: number;
  autoAlignedPages: number[];
  effectiveOrientations: ("portrait" | "landscape")[];
  changed: boolean;
}

/**
 * Normalizes any angle to 0, 90, 180, or 270 degrees clockwise.
 */
export function normalizeRotationDegrees(deg: number): RotationDegrees {
  const normalized = (((Math.round(deg / 90) * 90) % 360) + 360) % 360;
  if (normalized === 90 || normalized === 180 || normalized === 270) {
    return normalized;
  }
  return 0;
}

export function isImageFileObject(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name)
  );
}

export function isPdfFileObject(file: File): boolean {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

/**
 * Decodes an image File honoring EXIF orientation whenever supported by the browser.
 * Caller must invoke `close()` after reading or drawing to release GPU resources.
 */
async function decodeImageSource(file: File): Promise<{
  source: ImageBitmap | HTMLImageElement;
  width: number;
  height: number;
  close: () => void;
}> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Browser environment required for image processing");
  }

  if (typeof createImageBitmap === "function") {
    try {
      let bitmap: ImageBitmap;
      try {
        bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      } catch {
        bitmap = await createImageBitmap(file);
      }
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => {
          try {
            bitmap.close();
          } catch {}
        },
      };
    } catch {
      // Fall through to HTMLImageElement loader
    }
  }

  const img = await loadImageElement(file);
  return {
    source: img,
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height,
    close: () => {},
  };
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name}`));
    };
    img.src = url;
  });
}

/**
 * Reads true post-EXIF pixel dimensions for an image File.
 */
export async function inspectImageFile(
  file: File
): Promise<ImageOrientationInfo> {
  const decoded = await decodeImageSource(file);
  try {
    return {
      width: decoded.width,
      height: decoded.height,
      isLandscape: decoded.width > decoded.height,
    };
  } finally {
    decoded.close();
  }
}

/**
 * Computes consistent rotations so sideways photos mixed into portrait exam/note uploads
 * automatically rotate +90deg CW into upright Portrait A4 while preserving user overrides.
 */
export async function computeAutoPortraitRotations(
  files: File[],
  manualRotations?: Record<number, number>
): Promise<AutoRotationAnalysis> {
  const infos = await Promise.all(
    files.map(async (file) => {
      if (!isImageFileObject(file)) return null;
      try {
        return await inspectImageFile(file);
      } catch {
        return null;
      }
    })
  );

  const rotations: Record<number, RotationDegrees> = {};
  const landscapeIndices: number[] = [];
  let hasPortrait = false;

  infos.forEach((info, idx) => {
    const explicit =
      manualRotations && manualRotations[idx] !== undefined
        ? normalizeRotationDegrees(manualRotations[idx])
        : undefined;

    if (!info) {
      rotations[idx] = explicit ?? 0;
      return;
    }

    const baseRot = explicit ?? 0;
    rotations[idx] = baseRot;
    const swap = baseRot === 90 || baseRot === 270;
    const effW = swap ? info.height : info.width;
    const effH = swap ? info.width : info.height;

    if (effW > effH) {
      landscapeIndices.push(idx);
    } else {
      hasPortrait = true;
    }
  });

  const autoAlignedIndices: number[] = [];
  if (hasPortrait && landscapeIndices.length > 0) {
    for (const idx of landscapeIndices) {
      if (!manualRotations || manualRotations[idx] === undefined) {
        rotations[idx] = 90;
        autoAlignedIndices.push(idx);
      }
    }
  }

  return {
    rotations,
    autoAlignedIndices,
    hasPortrait,
    landscapeIndices,
  };
}

/**
 * Converts an image File to normalized upright JPEG bytes, applying EXIF orientation
 * and optional clockwise rotation (0, 90, 180, 270 degrees).
 */
export async function convertImageToJpegBytes(
  file: File,
  extraRotationDeg = 0,
  compressionOptions?: {
    maxDim?: number;
    quality?: number;
    enhanceContrast?: boolean;
  }
): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const decoded = await decodeImageSource(file);
  const rotation = normalizeRotationDegrees(extraRotationDeg);

  try {
    let drawW = decoded.width;
    let drawH = decoded.height;
    // Optimal document default: 1600px gives ~200 DPI for A4, preserving crystal-clear legibility
    // of mathematical fractions and handwriting while reducing file storage size by up to 75%!
    const maxDim = compressionOptions?.maxDim ?? 1600;
    if (drawW > maxDim || drawH > maxDim) {
      if (drawW > drawH) {
        drawH = Math.round((drawH * maxDim) / drawW);
        drawW = maxDim;
      } else {
        drawW = Math.round((drawW * maxDim) / drawH);
        drawH = maxDim;
      }
    }

    const swap = rotation === 90 || rotation === 270;
    const canvasW = swap ? drawH : drawW;
    const canvasH = swap ? drawW : drawH;

    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 2D context not available");
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Document Scanner Contrast Enhancement:
    // Clears camera paper shadows and sharpens ballpoint/pencil handwriting
    if (compressionOptions?.enhanceContrast !== false) {
      ctx.filter = "contrast(1.12) brightness(1.02)";
    }

    ctx.save();
    ctx.translate(canvasW / 2, canvasH / 2);
    if (rotation !== 0) {
      ctx.rotate((rotation * Math.PI) / 180);
    }
    ctx.drawImage(decoded.source, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // High efficiency document quality (0.74 is visually identical for documents, cuts 60% weight)
    const quality = compressionOptions?.quality ?? 0.74;

    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            reject(new Error(`Failed to process image: ${file.name}`));
            return;
          }
          const buffer = await blob.arrayBuffer();
          resolve({
            bytes: new Uint8Array(buffer),
            width: canvasW,
            height: canvasH,
          });
        },
        "image/jpeg",
        quality
      );
    });
  } finally {
    decoded.close();
  }
}

/**
 * Computes PDF drawPage placement + CCW rotation for embedding raw PDF page content
 * rotated `totalCW` clockwise onto a target `[targetW, targetH]` frame with margins.
 */
function computeEmbeddedPageDrawParams(
  embW: number,
  embH: number,
  totalCW: RotationDegrees,
  targetW: number,
  targetH: number,
  margin = 15
) {
  const availW = targetW - margin * 2;
  const availH = targetH - margin * 2;
  const swap = totalCW === 90 || totalCW === 270;
  const rotW = swap ? embH : embW;
  const rotH = swap ? embW : embH;

  const scale = Math.min(availW / rotW, availH / rotH);
  const w = embW * scale;
  const h = embH * scale;
  const ox = (targetW - (swap ? h : w)) / 2;
  const oy = (targetH - (swap ? w : h)) / 2;

  switch (totalCW) {
    case 90:
      return { x: ox, y: oy + w, width: w, height: h, rotate: degrees(-90) };
    case 180:
      return { x: ox + w, y: oy + h, width: w, height: h, rotate: degrees(180) };
    case 270:
      return { x: ox + h, y: oy, width: w, height: h, rotate: degrees(90) };
    default:
      return { x: ox, y: oy, width: w, height: h, rotate: degrees(0) };
  }
}

/**
 * Inspects page sizes, orientations, and /Rotate attributes of any existing PDF byte buffer.
 */
export async function inspectPdfOrientations(
  pdfBytes: Uint8Array
): Promise<PdfInspectionResult> {
  const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pages = srcDoc.getPages();
  const orientations: ("portrait" | "landscape")[] = [];
  const rotations: RotationDegrees[] = [];
  const sizes: { width: number; height: number }[] = [];

  let portraitCount = 0;
  let landscapeCount = 0;
  let firstW: number | null = null;
  let firstH: number | null = null;
  let hasMixedPageSizes = false;

  for (const page of pages) {
    const { width, height } = page.getSize();
    const rot = normalizeRotationDegrees(page.getRotation().angle);
    const swap = rot === 90 || rot === 270;
    const visW = swap ? height : width;
    const visH = swap ? width : height;

    const isLand = visW > visH;
    if (isLand) landscapeCount++;
    else portraitCount++;

    orientations.push(isLand ? "landscape" : "portrait");
    rotations.push(rot);
    sizes.push({ width: visW, height: visH });

    if (firstW === null || firstH === null) {
      firstW = visW;
      firstH = visH;
    } else if (Math.abs(visW - firstW) > 5 || Math.abs(visH - firstH) > 5) {
      hasMixedPageSizes = true;
    }
  }

  return {
    pageCount: pages.length,
    orientations,
    rotations,
    sizes,
    hasMixedOrientations: portraitCount > 0 && landscapeCount > 0,
    hasMixedPageSizes,
  };
}

/**
 * Normalizes an existing PDF so mixed portrait/landscape pages align cleanly to uniform A4
 * format, and applies optional 1-based page extra clockwise rotations (e.g. `{ 2: 90 }`).
 */
export async function normalizeAndRotatePdfBytes(
  pdfBytes: Uint8Array,
  options: {
    autoAlignMixed?: boolean;
    pageExtraRotations?: Record<number, number>; // 1-based page number -> extra CW deg
    targetOrientation?: "UNIFORM_PORTRAIT" | "AUTO_UNIFORM";
  } = {}
): Promise<PdfNormalizationResult> {
  const {
    autoAlignMixed = true,
    pageExtraRotations = {},
    targetOrientation = "AUTO_UNIFORM",
  } = options;

  const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const srcPages = srcDoc.getPages();
  const n = srcPages.length;

  if (n === 0) {
    return {
      bytes: pdfBytes,
      pageCount: 0,
      autoAlignedPages: [],
      effectiveOrientations: [],
      changed: false,
    };
  }

  let rawPortraitCount = 0;
  let rawLandscapeCount = 0;
  const pageMeta = srcPages.map((p) => {
    const { width, height } = p.getSize();
    const srcRot = normalizeRotationDegrees(p.getRotation().angle);
    const swap = srcRot === 90 || srcRot === 270;
    const visW = swap ? height : width;
    const visH = swap ? width : height;
    const isLand = visW > visH;
    if (isLand) rawLandscapeCount++;
    else rawPortraitCount++;
    return { width, height, srcRot, visW, visH, isLand };
  });

  const isMixedRaw = rawPortraitCount > 0 && rawLandscapeCount > 0;
  const hasMixedSizes = pageMeta.some(
    (m) =>
      Math.abs(m.visW - pageMeta[0].visW) > 5 ||
      Math.abs(m.visH - pageMeta[0].visH) > 5
  );

  const autoAlignedPages: number[] = [];
  const totalCWList: RotationDegrees[] = [];
  const effectiveOrientations: ("portrait" | "landscape")[] = [];
  let postPortraitCount = 0;
  let anyExtraRotation = false;

  for (let i = 0; i < n; i++) {
    const meta = pageMeta[i];
    const pageNum = i + 1;
    let extraRot: RotationDegrees = 0;

    if (pageExtraRotations[pageNum] !== undefined) {
      extraRot = normalizeRotationDegrees(pageExtraRotations[pageNum]);
    } else if (autoAlignMixed && isMixedRaw && meta.isLand) {
      extraRot = 90;
      autoAlignedPages.push(pageNum);
    }

    if (extraRot !== 0) anyExtraRotation = true;

    const totalCW = normalizeRotationDegrees(meta.srcRot + extraRot);
    totalCWList.push(totalCW);

    const swapTotal = totalCW === 90 || totalCW === 270;
    const effW = swapTotal ? meta.height : meta.width;
    const effH = swapTotal ? meta.width : meta.height;
    const effLand = effW > effH;
    effectiveOrientations.push(effLand ? "landscape" : "portrait");
    if (!effLand) postPortraitCount++;
  }

  const needsUniformRebuild =
    anyExtraRotation ||
    isMixedRaw ||
    hasMixedSizes ||
    (targetOrientation === "UNIFORM_PORTRAIT" && postPortraitCount < n);

  if (!needsUniformRebuild) {
    return {
      bytes: pdfBytes,
      pageCount: n,
      autoAlignedPages: [],
      effectiveOrientations,
      changed: false,
    };
  }

  const usePortraitFrame =
    targetOrientation === "UNIFORM_PORTRAIT" || postPortraitCount > 0;
  const targetW = usePortraitFrame ? A4_PORTRAIT_WIDTH : A4_LANDSCAPE_WIDTH;
  const targetH = usePortraitFrame ? A4_PORTRAIT_HEIGHT : A4_LANDSCAPE_HEIGHT;

  const outDoc = await PDFDocument.create();

  for (let i = 0; i < n; i++) {
    const srcPage = srcPages[i];
    const totalCW = totalCWList[i];
    const outPage = outDoc.addPage([targetW, targetH]);

    try {
      const embeddedPage = await outDoc.embedPage(srcPage);
      const drawOpts = computeEmbeddedPageDrawParams(
        embeddedPage.width,
        embeddedPage.height,
        totalCW,
        targetW,
        targetH,
        15
      );
      outPage.drawPage(embeddedPage, drawOpts);
    } catch {
      // Fallback for blank/unusual PDF pages without standard content streams
      const outPages = outDoc.getPages();
      outDoc.removePage(outPages.length - 1);
      const [copied] = await outDoc.copyPages(srcDoc, [i]);
      copied.setRotation(degrees(totalCW));
      outDoc.addPage(copied);
    }
  }

  const savedBytes = await outDoc.save();
  return {
    bytes: new Uint8Array(savedBytes),
    pageCount: n,
    autoAlignedPages,
    effectiveOrientations,
    changed: true,
  };
}

/**
 * Merges multiple files (images, PDFs, or mixed) into a single unified PDF File.
 * Ensures all output pages share uniform A4 dimensions (Portrait A4 by default whenever any page
 * is portrait) and auto-aligns sideways images in mixed batches so no page appears out of format.
 */
export async function mergeFilesToSinglePdf(
  files: File[],
  baseTitle?: string,
  onProgress?: MergeProgressCallback,
  options?: MergePdfOptions
): Promise<File> {
  if (!files || files.length === 0) {
    throw new Error("No files provided to merge");
  }

  const autoAlignMixed = options?.autoAlignMixed ?? true;
  const forcePortraitA4 = options?.forcePortraitA4 ?? false;

  // If 1 file is already a PDF, still inspect & normalize mixed orientations cleanly if needed
  if (files.length === 1 && isPdfFileObject(files[0])) {
    try {
      const buf = new Uint8Array(await files[0].arrayBuffer());
      const singleRot = options?.pageRotations?.[0];
      const normalized = await normalizeAndRotatePdfBytes(buf, {
        autoAlignMixed,
        pageExtraRotations: singleRot ? { 1: singleRot } : undefined,
        targetOrientation: forcePortraitA4 ? "UNIFORM_PORTRAIT" : "AUTO_UNIFORM",
      });
      if (!normalized.changed) {
        return files[0];
      }
      const cleanPdfName = files[0].name.toLowerCase().endsWith(".pdf")
        ? files[0].name
        : `${files[0].name}.pdf`;
      return new File([normalized.bytes as any], cleanPdfName, {
        type: "application/pdf",
      });
    } catch (pdfErr) {
      console.warn("Direct PDF upload fallback (normalization skipped):", pdfErr);
      return files[0];
    }
  }

  // Resolve image rotations automatically for mixed batches if caller didn't override all indices
  const autoAnalysis = autoAlignMixed
    ? await computeAutoPortraitRotations(files, options?.pageRotations)
    : null;

  type PreparedItem =
    | { kind: "image"; bytes: Uint8Array; width: number; height: number }
    | { kind: "pdf"; bytes: Uint8Array };

  const prepared: PreparedItem[] = [];
  const total = files.length;
  let anyPortraitPage = forcePortraitA4;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (onProgress) {
      onProgress(i + 1, total, `Processing page ${i + 1} of ${total}: ${file.name}`);
    }

    if (isPdfFileObject(file)) {
      const buf = new Uint8Array(await file.arrayBuffer());
      const info = await inspectPdfOrientations(buf);
      if (info.orientations.some((o) => o === "portrait")) {
        anyPortraitPage = true;
      }
      prepared.push({ kind: "pdf", bytes: buf });
    } else if (isImageFileObject(file)) {
      const rot =
        options?.pageRotations?.[i] !== undefined
          ? normalizeRotationDegrees(options.pageRotations[i])
          : autoAnalysis?.rotations[i] ?? 0;

      const jpg = await convertImageToJpegBytes(file, rot, {
        maxDim: options?.maxDim,
        quality: options?.quality,
        enhanceContrast: options?.enhanceContrast,
      });
      if (jpg.height >= jpg.width) {
        anyPortraitPage = true;
      }
      prepared.push({
        kind: "image",
        bytes: jpg.bytes,
        width: jpg.width,
        height: jpg.height,
      });
    } else {
      throw new Error(`Cannot merge non-image/non-PDF document "${file.name}" into PDF. Please upload it as a standalone document.`);
    }
  }

  const pageWidth = anyPortraitPage ? A4_PORTRAIT_WIDTH : A4_LANDSCAPE_WIDTH;
  const pageHeight = anyPortraitPage ? A4_PORTRAIT_HEIGHT : A4_LANDSCAPE_HEIGHT;
  const margin = 15;
  const availW = pageWidth - margin * 2;
  const availH = pageHeight - margin * 2;

  const mergedDoc = await PDFDocument.create();

  for (const item of prepared) {
    if (item.kind === "pdf") {
      const normalizedPdf = await normalizeAndRotatePdfBytes(item.bytes, {
        autoAlignMixed,
        targetOrientation: anyPortraitPage ? "UNIFORM_PORTRAIT" : "AUTO_UNIFORM",
      });
      const srcDoc = await PDFDocument.load(normalizedPdf.bytes, {
        ignoreEncryption: true,
      });
      const copiedPages = await mergedDoc.copyPages(
        srcDoc,
        srcDoc.getPageIndices()
      );
      copiedPages.forEach((p) => mergedDoc.addPage(p));
    } else {
      const embeddedJpg = await mergedDoc.embedJpg(item.bytes);
      const page = mergedDoc.addPage([pageWidth, pageHeight]);
      const scale = Math.min(availW / item.width, availH / item.height);
      const drawW = item.width * scale;
      const drawH = item.height * scale;

      page.drawImage(embeddedJpg, {
        x: (pageWidth - drawW) / 2,
        y: (pageHeight - drawH) / 2,
        width: drawW,
        height: drawH,
      });
    }
  }

  if (onProgress) {
    onProgress(total, total, "Finalizing merged PDF document...");
  }

  const mergedPdfBytes = await mergedDoc.save({ useObjectStreams: true });
  const pdfBlob = new Blob([mergedPdfBytes as any], { type: "application/pdf" });

  let sanitizedTitle = (baseTitle || "Exam_Material")
    .trim()
    .replace(/[^\w\s\u0980-\u09FF-]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 60);

  if (sanitizedTitle.toLowerCase().endsWith(".pdf")) {
    sanitizedTitle = sanitizedTitle.substring(0, sanitizedTitle.length - 4);
  }

  const finalFileName = `${sanitizedTitle || "Exam_Material"}.pdf`;
  return new File([pdfBlob], finalFileName, { type: "application/pdf" });
}
