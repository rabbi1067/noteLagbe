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

export type PageSizeOption = "a4" | "letter" | "fit";
export type PageOrientationOption = "auto" | "portrait" | "landscape";
export type MarginOption = "none" | "small" | "normal";
export type QualityPresetId = "original" | "high" | "balanced" | "compact" | "custom";

export interface PdfExportOptions {
  pageSize: PageSizeOption;
  orientation: PageOrientationOption;
  margin: MarginOption;
  qualityPct: number; // 35..98
}

export const DEFAULT_EXPORT_OPTIONS: PdfExportOptions = {
  pageSize: "a4",
  orientation: "auto",
  margin: "small",
  qualityPct: 96,
};

export const QUALITY_PRESETS: {
  id: Exclude<QualityPresetId, "custom">;
  qualityPct: number;
  labelEn: string;
  labelBn: string;
}[] = [
  { id: "original", qualityPct: 96, labelEn: "Original", labelBn: "অরিজিনাল" },
  { id: "high", qualityPct: 90, labelEn: "High", labelBn: "হাই" },
  { id: "balanced", qualityPct: 78, labelEn: "Balanced", labelBn: "ব্যালেন্সড" },
  { id: "compact", qualityPct: 58, labelEn: "Compact", labelBn: "কম্প্যাক্ট" },
];

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

function resolveQualityParams(qualityPct: number): {
  jpegQuality: number;
  maxDimension: number;
} {
  const clamped = Math.max(35, Math.min(98, Math.round(qualityPct)));
  const jpegQuality = clamped / 100;
  let maxDimension = 1600;
  if (clamped >= 94) maxDimension = 2400;
  else if (clamped >= 85) maxDimension = 2000;
  else if (clamped >= 70) maxDimension = 1600;
  else maxDimension = Math.round(1100 + ((clamped - 35) / 35) * 400);
  return { jpegQuality, maxDimension };
}

export function getMatchingQualityPreset(qualityPct: number): QualityPresetId {
  const match = QUALITY_PRESETS.find((p) => p.qualityPct === Math.round(qualityPct));
  return match ? match.id : "custom";
}

export function buildPageCacheKey(page: PdfMakerPage, qualityPct: number): string {
  return [
    page.id,
    page.rotation90,
    page.straightenDeg.toFixed(1),
    page.flipH ? 1 : 0,
    page.flipV ? 1 : 0,
    page.brightness,
    page.contrast,
    page.saturation,
    page.crop.x.toFixed(4),
    page.crop.y.toFixed(4),
    page.crop.w.toFixed(4),
    page.crop.h.toFixed(4),
    Math.round(qualityPct),
  ].join("|");
}

export interface EncodedPageAsset {
  jpgBytes: Uint8Array;
  width: number;
  height: number;
}

export async function encodePageJpegCached(
  page: PdfMakerPage,
  qualityPct: number,
  cache?: Map<string, EncodedPageAsset>
): Promise<EncodedPageAsset> {
  const key = buildPageCacheKey(page, qualityPct);
  const hit = cache?.get(key);
  if (hit) return hit;

  const { jpegQuality, maxDimension } = resolveQualityParams(qualityPct);
  const canvas = await renderFinalPageCanvas(page, maxDimension);
  const jpgBytes = await canvasToJpegBytes(canvas, jpegQuality);
  const asset: EncodedPageAsset = {
    jpgBytes,
    width: canvas.width,
    height: canvas.height,
  };

  if (cache) {
    if (cache.size >= 80) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }
    cache.set(key, asset);
  }
  return asset;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb >= 10 ? 1 : 2)} MB`;
}

export function estimateContainerBytes(imageByteSum: number, pageCount: number): number {
  return imageByteSum + 1800 + pageCount * 450;
}

function resolveMarginPoints(margin: MarginOption): number {
  if (margin === "none") return 0;
  if (margin === "small") return 18;
  return 36;
}

function resolvePdfLayout(
  imgW: number,
  imgH: number,
  options: PdfExportOptions
): {
  pageW: number;
  pageH: number;
  drawX: number;
  drawY: number;
  drawW: number;
  drawH: number;
} {
  const m = resolveMarginPoints(options.margin);

  if (options.pageSize === "fit") {
    const pageW = 595.28;
    const drawW = Math.max(40, pageW - 2 * m);
    const drawH = Math.max(40, drawW * (imgH / imgW));
    const pageH = drawH + 2 * m;
    return { pageW, pageH, drawX: m, drawY: m, drawW, drawH };
  }

  const baseW = options.pageSize === "letter" ? 612 : 595.28;
  const baseH = options.pageSize === "letter" ? 792 : 841.89;

  const isLandscape =
    options.orientation === "landscape"
      ? true
      : options.orientation === "portrait"
      ? false
      : imgW > imgH;

  const pageW = isLandscape ? baseH : baseW;
  const pageH = isLandscape ? baseW : baseH;
  const availW = Math.max(20, pageW - 2 * m);
  const availH = Math.max(20, pageH - 2 * m);
  const ratio = Math.min(availW / imgW, availH / imgH);
  const drawW = imgW * ratio;
  const drawH = imgH * ratio;

  return {
    pageW,
    pageH,
    drawX: (pageW - drawW) / 2,
    drawY: (pageH - drawH) / 2,
    drawW,
    drawH,
  };
}

/**
 * Builds a multi-page PDF entirely in browser memory with pdf-lib,
 * respecting page size, orientation, margin, and compression quality.
 */
export async function generatePdfBlob(
  pages: PdfMakerPage[],
  options: PdfExportOptions = DEFAULT_EXPORT_OPTIONS,
  onProgress?: (current: number, total: number) => void,
  cache?: Map<string, EncodedPageAsset>
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setCreator("NoteLagbe Student Tools — Client PDF Maker");

  for (let i = 0; i < pages.length; i++) {
    onProgress?.(i + 1, pages.length);
    const asset = await encodePageJpegCached(pages[i], options.qualityPct, cache);
    const embedded = await pdfDoc.embedJpg(asset.jpgBytes);
    const layout = resolvePdfLayout(asset.width, asset.height, options);

    const pdfPage = pdfDoc.addPage([layout.pageW, layout.pageH]);
    pdfPage.drawImage(embedded, {
      x: layout.drawX,
      y: layout.drawY,
      width: layout.drawW,
      height: layout.drawH,
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
 * applying page size, orientation, margin, and compression quality settings.
 */
export async function generateDocxBlob(
  pages: PdfMakerPage[],
  options: PdfExportOptions = DEFAULT_EXPORT_OPTIONS,
  onProgress?: (current: number, total: number) => void,
  cache?: Map<string, EncodedPageAsset>
): Promise<Blob> {
  const zip = new JSZip();

  const assets: EncodedPageAsset[] = [];
  for (let i = 0; i < pages.length; i++) {
    onProgress?.(i + 1, pages.length);
    assets.push(await encodePageJpegCached(pages[i], options.qualityPct, cache));
  }

  const baseWTwips = options.pageSize === "letter" ? 12240 : 11906;
  const baseHTwips = options.pageSize === "letter" ? 15840 : 16838;
  const marginTwips =
    options.margin === "none" ? 0 : options.margin === "small" ? 360 : 720;

  let isLandscape = false;
  if (options.orientation === "landscape") {
    isLandscape = true;
  } else if (options.orientation === "auto") {
    const landscapeCount = assets.filter((a) => a.width > a.height).length;
    isLandscape = landscapeCount > assets.length / 2;
  }

  const pgWTwips = isLandscape ? baseHTwips : baseWTwips;
  const pgHTwips = isLandscape ? baseWTwips : baseHTwips;
  const maxEmuW = Math.max(91440, (pgWTwips - 2 * marginTwips) * 635);
  const maxEmuH = Math.max(91440, (pgHTwips - 2 * marginTwips) * 635);

  const relEntries: string[] = [];
  const bodyChunks: string[] = [];

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    const mediaFile = `media/image${i + 1}.jpeg`;
    const relId = `rIdImg${i + 1}`;
    zip.file(`word/${mediaFile}`, asset.jpgBytes);
    relEntries.push(
      `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${mediaFile}"/>`
    );

    const ratio = Math.min(maxEmuW / asset.width, maxEmuH / asset.height);
    const cx = Math.max(91440, Math.round(asset.width * ratio));
    const cy = Math.max(91440, Math.round(asset.height * ratio));

    bodyChunks.push(buildImageDrawingXml(relId, i + 1, `Page_${i + 1}.jpg`, cx, cy));
    if (i < assets.length - 1) {
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

  const orientAttr = isLandscape ? ` w:orient="landscape"` : "";
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
      `<w:sectPr><w:pgSz w:w="${pgWTwips}" w:h="${pgHTwips}"${orientAttr}/><w:pgMar w:top="${marginTwips}" w:right="${marginTwips}" w:bottom="${marginTwips}" w:left="${marginTwips}" w:header="360" w:footer="360" w:gutter="0"/></w:sectPr>` +
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
