import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";

export interface CropRect {
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  w: number; // normalized 0..1
  h: number; // normalized 0..1
}

export interface PdfMakerPage {
  id: string;
  name: string;
  previewUrl: string;
  width: number;
  height: number;
  rotation90: 0 | 90 | 180 | 270;
  straightenDeg: number; // -45 to +45
  flipH: boolean;
  flipV: boolean;
  brightness: number; // 50 to 180 (%)
  contrast: number; // 50 to 180 (%)
  saturation: number; // 0 to 180 (%)
  crop: CropRect;
}

export const DEFAULT_CROP: CropRect = { x: 0, y: 0, w: 1, h: 1 };

export function isFullCrop(crop: CropRect): boolean {
  return (
    Math.abs(crop.x) < 0.002 &&
    Math.abs(crop.y) < 0.002 &&
    Math.abs(crop.w - 1) < 0.002 &&
    Math.abs(crop.h - 1) < 0.002
  );
}

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to decode image"));
    img.src = src;
  });
}

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

/**
 * Fallback pixel adjustment when CanvasRenderingContext2D.filter is unavailable
 * (e.g. older iOS Safari builds).
 */
function applyPixelAdjustments(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  brightnessPct: number,
  contrastPct: number,
  saturationPct: number
): void {
  const b = brightnessPct / 100;
  const c = contrastPct / 100;
  const s = saturationPct / 100;
  if (Math.abs(b - 1) < 0.01 && Math.abs(c - 1) < 0.01 && Math.abs(s - 1) < 0.01) {
    return;
  }

  const imageData = ctx.getImageData(0, 0, width, height);
  const d = imageData.data;

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] * b;
    let g = d[i + 1] * b;
    let bl = d[i + 2] * b;

    r = (r - 128) * c + 128;
    g = (g - 128) * c + 128;
    bl = (bl - 128) * c + 128;

    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
    r = luma + (r - luma) * s;
    g = luma + (g - luma) * s;
    bl = luma + (bl - luma) * s;

    d[i] = clampByte(r);
    d[i + 1] = clampByte(g);
    d[i + 2] = clampByte(bl);
  }
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Renders Stage A: image rotated (90deg increments + fine straighten angle),
 * flipped, and color-adjusted (brightness, contrast, saturation).
 */
export async function renderTransformedCanvas(
  page: PdfMakerPage,
  maxDimension = 2000
): Promise<HTMLCanvasElement> {
  const img = await loadImageElement(page.previewUrl);
  const natW = img.naturalWidth || page.width || 800;
  const natH = img.naturalHeight || page.height || 1000;

  const totalDeg = page.rotation90 + page.straightenDeg;
  const rad = (totalDeg * Math.PI) / 180;
  const absCos = Math.abs(Math.cos(rad));
  const absSin = Math.abs(Math.sin(rad));

  const isExactRightAngle =
    Math.abs(page.straightenDeg) < 0.01 && (page.rotation90 === 90 || page.rotation90 === 270);
  const isExactStraight = Math.abs(page.straightenDeg) < 0.01 && !isExactRightAngle;

  const rawOutW = isExactStraight ? natW : isExactRightAngle ? natH : natW * absCos + natH * absSin;
  const rawOutH = isExactStraight ? natH : isExactRightAngle ? natW : natW * absSin + natH * absCos;

  const scale = Math.min(1, maxDimension / Math.max(rawOutW, rawOutH));
  const outW = Math.max(1, Math.round(rawOutW * scale));
  const outH = Math.max(1, Math.round(rawOutH * scale));
  const drawW = natW * scale;
  const drawH = natH * scale;

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outW, outH);

  const supportsFilter = typeof ctx.filter === "string";
  if (supportsFilter) {
    ctx.filter = `brightness(${page.brightness}%) contrast(${page.contrast}%) saturate(${page.saturation}%)`;
  }

  ctx.save();
  ctx.translate(outW / 2, outH / 2);
  ctx.rotate(rad);
  ctx.scale(page.flipH ? -1 : 1, page.flipV ? -1 : 1);
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  if (!supportsFilter) {
    ctx.filter = "none";
    applyPixelAdjustments(ctx, outW, outH, page.brightness, page.contrast, page.saturation);
  }

  return canvas;
}

/**
 * Renders the final cropped, straightened, adjusted page onto a canvas.
 */
export async function renderFinalPageCanvas(
  page: PdfMakerPage,
  maxDimension = 2000
): Promise<HTMLCanvasElement> {
  const stageA = await renderTransformedCanvas(page, maxDimension);
  if (isFullCrop(page.crop)) {
    return stageA;
  }

  const sx = Math.max(0, Math.min(stageA.width - 1, Math.round(page.crop.x * stageA.width)));
  const sy = Math.max(0, Math.min(stageA.height - 1, Math.round(page.crop.y * stageA.height)));
  const sw = Math.max(1, Math.min(stageA.width - sx, Math.round(page.crop.w * stageA.width)));
  const sh = Math.max(1, Math.min(stageA.height - sy, Math.round(page.crop.h * stageA.height)));

  const out = document.createElement("canvas");
  out.width = sw;
  out.height = sh;
  const ctx = out.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, sw, sh);
  ctx.drawImage(stageA, sx, sy, sw, sh, 0, 0, sw, sh);
  return out;
}

async function canvasToJpegBytes(
  canvas: HTMLCanvasElement,
  quality = 0.9
): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("Canvas JPEG encoding failed"));
      },
      "image/jpeg",
      quality
    );
  });
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Builds a multi-page PDF entirely in browser memory with pdf-lib.
 */
export async function generatePdfBlob(
  pages: PdfMakerPage[],
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setCreator("NoteLagbe Student Tools — Client PDF Maker");

  for (let i = 0; i < pages.length; i++) {
    onProgress?.(i + 1, pages.length);
    const canvas = await renderFinalPageCanvas(pages[i], 2000);
    const jpgBytes = await canvasToJpegBytes(canvas, 0.9);
    const embedded = await pdfDoc.embedJpg(jpgBytes);

    // Normalize page width around A4 (595.28pt) while preserving exact cropped aspect ratio
    const targetWidth = 595.28;
    const scale = targetWidth / canvas.width;
    const pageW = targetWidth;
    const pageH = Math.max(100, canvas.height * scale);

    const pdfPage = pdfDoc.addPage([pageW, pageH]);
    pdfPage.drawImage(embedded, {
      x: 0,
      y: 0,
      width: pageW,
      height: pageH,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const safeBuffer = new Uint8Array(pdfBytes.byteLength);
  safeBuffer.set(pdfBytes);
  return new Blob([safeBuffer.buffer], { type: "application/pdf" });
}

function buildImageDrawingXml(
  relId: string,
  docPrId: number,
  imgName: string,
  cx: number,
  cy: number
): string {
  const safeName = imgName.replace(/[<>&"']/g, "");
  return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${docPrId}" name="${safeName}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${docPrId}" name="${safeName}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
}

/**
 * Generates a valid Microsoft Word (.docx) OOXML package client-side using JSZip,
 * placing each edited page fitted cleanly on an A4 Word page.
 */
export async function generateDocxBlob(
  pages: PdfMakerPage[],
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const zip = new JSZip();

  // Usable area on A4 (8.27" x 11.69") with 0.5" margins on all sides (in EMUs: 914400 per inch)
  const MAX_EMU_W = 6647688; // 7.27 in
  const MAX_EMU_H = 9774684; // 10.69 in

  const relEntries: string[] = [];
  const bodyChunks: string[] = [];

  for (let i = 0; i < pages.length; i++) {
    onProgress?.(i + 1, pages.length);
    const canvas = await renderFinalPageCanvas(pages[i], 1800);
    const jpgBytes = await canvasToJpegBytes(canvas, 0.88);

    const mediaFile = `media/image${i + 1}.jpeg`;
    const relId = `rIdImg${i + 1}`;
    zip.file(`word/${mediaFile}`, jpgBytes);
    relEntries.push(
      `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${mediaFile}"/>`
    );

    const ratio = Math.min(MAX_EMU_W / canvas.width, MAX_EMU_H / canvas.height);
    const cx = Math.max(91440, Math.round(canvas.width * ratio));
    const cy = Math.max(91440, Math.round(canvas.height * ratio));

    bodyChunks.push(buildImageDrawingXml(relId, i + 1, `Page_${i + 1}.jpg`, cx, cy));
    if (i < pages.length - 1) {
      bodyChunks.push(`<w:p><w:r><w:br w:type="page"/></w:r></w:p>`);
    }
  }

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Default Extension="jpeg" ContentType="image/jpeg"/>` +
      `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
      `</Types>`
  );

  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
      `</Relationships>`
  );

  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      relEntries.join("") +
      `</Relationships>`
  );

  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ` +
      `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ` +
      `xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ` +
      `xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ` +
      `xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
      `<w:body>` +
      bodyChunks.join("") +
      `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>` +
      `</w:body></w:document>`
  );

  return zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

export function sanitizeBaseFilename(name: string, fallback = "NoteLagbe_PDF"): string {
  const cleaned = name
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\.(pdf|docx|doc)$/i, "");
  return cleaned || fallback;
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
