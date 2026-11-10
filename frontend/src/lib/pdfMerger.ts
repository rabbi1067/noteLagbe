import { PDFDocument } from "pdf-lib";

export interface MergeProgressCallback {
  (current: number, total: number, message: string): void;
}

/**
 * Loads an image File, normalizes it to JPEG bytes via HTML Canvas to avoid
 * orientation, color profile, or format incompatibilities (supports PNG, JPG, WEBP, etc.).
 * Uses createImageBitmap when supported for hardware acceleration and correct EXIF orientation.
 */
export async function convertImageToJpegBytes(
  file: File
): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Browser environment required for image processing");
  }

  let imgSource: ImageBitmap | HTMLImageElement;
  let width = 0;
  let height = 0;

  if (typeof createImageBitmap === "function") {
    try {
      imgSource = await createImageBitmap(file);
      width = imgSource.width;
      height = imgSource.height;
    } catch {
      imgSource = await loadImageElement(file);
      width = imgSource.naturalWidth || imgSource.width;
      height = imgSource.naturalHeight || imgSource.height;
    }
  } else {
    imgSource = await loadImageElement(file);
    width = imgSource.naturalWidth || imgSource.width;
    height = imgSource.naturalHeight || imgSource.height;
  }

  // Cap max dimension to 3000px to maintain crisp quality while keeping file size optimal
  let targetW = width;
  let targetH = height;
  const maxDim = 3000;
  if (targetW > maxDim || targetH > maxDim) {
    if (targetW > targetH) {
      targetH = Math.round((targetH * maxDim) / targetW);
      targetW = maxDim;
    } else {
      targetW = Math.round((targetW * maxDim) / targetH);
      targetH = maxDim;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context not available");
  }

  // Draw pure white background in case of transparent PNGs
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(imgSource, 0, 0, targetW, targetH);

  if ("close" in imgSource && typeof (imgSource as any).close === "function") {
    (imgSource as any).close();
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(new Error(`Failed to process image: ${file.name}`));
          return;
        }
        const buffer = await blob.arrayBuffer();
        resolve({
          bytes: new Uint8Array(buffer),
          width: targetW,
          height: targetH,
        });
      },
      "image/jpeg",
      0.90
    );
  });
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
 * Merges multiple files (images, PDFs, or mixed) into a single unified PDF File.
 * Each image is scaled to fit comfortably on an A4 page (portrait or landscape based on aspect ratio)
 * with neat margins, producing a professional scanned question paper / document.
 */
export async function mergeFilesToSinglePdf(
  files: File[],
  baseTitle?: string,
  onProgress?: MergeProgressCallback
): Promise<File> {
  if (!files || files.length === 0) {
    throw new Error("No files provided to merge");
  }

  // If there is only 1 file and it is already a PDF, return it directly
  if (
    files.length === 1 &&
    (files[0].type === "application/pdf" || files[0].name.toLowerCase().endsWith(".pdf"))
  ) {
    return files[0];
  }

  const mergedDoc = await PDFDocument.create();
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (onProgress) {
      onProgress(i + 1, total, `Processing page ${i + 1} of ${total}: ${file.name}`);
    }

    if (isPdf) {
      const buffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const copiedPages = await mergedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
      copiedPages.forEach((page) => mergedDoc.addPage(page));
    } else {
      // Process image (JPG, PNG, WEBP, etc.)
      const { bytes, width: imgW, height: imgH } = await convertImageToJpegBytes(file);
      const embeddedJpg = await mergedDoc.embedJpg(bytes);

      // Determine orientation and standard A4 dimensions (in points: 72 points per inch)
      const isLandscape = imgW > imgH;
      const pageWidth = isLandscape ? 841.89 : 595.28;
      const pageHeight = isLandscape ? 595.28 : 841.89;

      const page = mergedDoc.addPage([pageWidth, pageHeight]);

      // Margins (15pt on all sides)
      const margin = 15;
      const availW = pageWidth - margin * 2;
      const availH = pageHeight - margin * 2;

      const scale = Math.min(availW / imgW, availH / imgH);
      const drawW = imgW * scale;
      const drawH = imgH * scale;

      const x = (pageWidth - drawW) / 2;
      const y = (pageHeight - drawH) / 2;

      page.drawImage(embeddedJpg, {
        x,
        y,
        width: drawW,
        height: drawH,
      });
    }
  }

  if (onProgress) {
    onProgress(total, total, "Finalizing merged PDF document...");
  }

  const mergedPdfBytes = await mergedDoc.save();
  const pdfBlob = new Blob([mergedPdfBytes as any], { type: "application/pdf" });

  // Generate a clean filename incorporating course and semester
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
