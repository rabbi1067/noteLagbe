"use client";

import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Award,
  Download,
  Printer,
  Sparkles,
  RotateCcw,
  Check,
  ZoomIn,
  ZoomOut,
  Palette,
  FileCheck,
  User,
  PenTool,
  Star,
  RefreshCw,
  Sliders,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface EventCertificateMakerProps {
  language?: "en" | "bn";
}

type ThemeId = "theme-1" | "theme-2" | "theme-3" | "theme-4" | "theme-5";

interface CertificateFormState {
  theme: ThemeId;
  certTitle: string;
  certSubtitle: string;
  presentationLine: string;
  recipientName: string;
  nameFont: "alex-brush" | "great-vibes" | "pinyon-script" | "playfair" | "cinzel";
  description: string;
  organization: string;
  issueDate: string;
  signatory1Name: string;
  signatory1Title: string;
  signatory1Signature: string;
  signatory2Enabled: boolean;
  signatory2Name: string;
  signatory2Title: string;
  signatory2Signature: string;
}

// Exact authentic template defaults matching the user's 5 official images
const THEME_ORIGINALS: Record<
  ThemeId,
  {
    name: string;
    sub: string;
    certTitle: string;
    certSubtitle: string;
    presentationLine: string;
    recipientName: string;
    nameFont: "alex-brush" | "great-vibes" | "pinyon-script" | "playfair" | "cinzel";
    description: string;
    organization: string;
    issueDate: string;
    signatory1Name: string;
    signatory1Title: string;
    signatory1Signature: string;
    signatory2Enabled: boolean;
    signatory2Name: string;
    signatory2Title: string;
    signatory2Signature: string;
  }
> = {
  "theme-1": {
    name: "1. Cyan Geometric Tech",
    sub: "Corporate & Contests",
    certTitle: "CERTIFICATE",
    certSubtitle: "OF APPRECIATION",
    presentationLine: "this certificate is proudly presented to:",
    recipientName: "Cahaya Dewi",
    nameFont: "alex-brush",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc semper felis et eros dictum, ut lacinia felis accumsan. Fusce non nisi sed turpis placerat placerat non sed arcu. In blandit dolor in nibh venenatis congue.",
    organization: "Southeast University Computer Club",
    issueDate: "November 07, 2026",
    signatory1Name: "",
    signatory1Title: "SIGNATURE",
    signatory1Signature: "",
    signatory2Enabled: true,
    signatory2Name: "",
    signatory2Title: "SIGNATURE",
    signatory2Signature: "",
  },
  "theme-2": {
    name: "2. Royal Ivory & Gold",
    sub: "Academic Honors & Degrees",
    certTitle: "CERTIFICATE",
    certSubtitle: "of Appreciation",
    presentationLine: "Proudly Presented To:",
    recipientName: "Adeline Palmerston",
    nameFont: "pinyon-script",
    description:
      "For expressing creativity, innovation, and originality that inspire and bring value to the community.",
    organization: "Department of Computer Science & Engineering",
    issueDate: "November 07, 2026",
    signatory1Name: "Yanis Petros",
    signatory1Title: "Head of Department",
    signatory1Signature: "Yanis Petros",
    signatory2Enabled: false,
    signatory2Name: "",
    signatory2Title: "",
    signatory2Signature: "",
  },
  "theme-3": {
    name: "3. Navy Executive Matrix",
    sub: "Research & Summits",
    certTitle: "CERTIFICATE",
    certSubtitle: "OF APPRECIATION",
    presentationLine: "This certificate is Presented to",
    recipientName: "Taylor Alonso",
    nameFont: "great-vibes",
    description:
      "In appreciation of his/her exceptional achievements and contributions in Sustainable Development Research, which have greatly enhanced the values of Borcelle Company on October 6, 2025.",
    organization: "Southeast University • Borcelle Company",
    issueDate: "October 06, 2025",
    signatory1Name: "OLIVIA WILSON",
    signatory1Title: "Head of Event",
    signatory1Signature: "Olivia Wilson",
    signatory2Enabled: true,
    signatory2Name: "KETUT SUSILO",
    signatory2Title: "Mentor",
    signatory2Signature: "Ketut Susilo",
  },
  "theme-4": {
    name: "4. Luxury Black & Gold",
    sub: "Workshops & Premium Fest",
    certTitle: "CERTIFICATE",
    certSubtitle: "OF APPRECIATION",
    presentationLine: "Proudly presented to",
    recipientName: "Olivia Wilson",
    nameFont: "alex-brush",
    description:
      "This certificate is awarded as recognition for the successful completion of this workshop.",
    organization: "Southeast University Innovation Lab",
    issueDate: "November 07, 2026",
    signatory1Name: "Claudia Alves",
    signatory1Title: "Manager",
    signatory1Signature: "Claudia Alves",
    signatory2Enabled: true,
    signatory2Name: "Cia Rodriguez",
    signatory2Title: "CEO",
    signatory2Signature: "Cia Rodriguez",
  },
  "theme-5": {
    name: "5. Regal Burgundy Silk",
    sub: "Championship & Valedictorian",
    certTitle: "CERTIFICATE",
    certSubtitle: "OF ACHIEVEMENT",
    presentationLine: "This certificate is proudly presented to",
    recipientName: "Charlotte Newman",
    nameFont: "pinyon-script",
    description:
      "In recognition of outstanding achievement, dedication, and exceptional performance, your commitment and determination have demonstrated excellence and are truly worthy of recognition.",
    organization: "Southeast University Academic Council",
    issueDate: "November 07, 2026",
    signatory1Name: "HANNAH PORTER",
    signatory1Title: "Dean of Academic Affairs",
    signatory1Signature: "Hannah Porter",
    signatory2Enabled: true,
    signatory2Name: "AISHA RAHMAN",
    signatory2Title: "Program Chairperson",
    signatory2Signature: "Aisha Rahman",
  },
};

// Initial state has EMPTY strings for all input fields ("kono demu value field a thakbe na")
const INITIAL_FORM_STATE: CertificateFormState = {
  theme: "theme-1",
  certTitle: "",
  certSubtitle: "",
  presentationLine: "",
  recipientName: "",
  nameFont: "alex-brush",
  description: "",
  organization: "",
  issueDate: "",
  signatory1Name: "",
  signatory1Title: "",
  signatory1Signature: "",
  signatory2Enabled: true,
  signatory2Name: "",
  signatory2Title: "",
  signatory2Signature: "",
};

export default function EventCertificateMaker({ language = "en" }: EventCertificateMakerProps) {
  const [certData, setCertData] = useState<CertificateFormState>(INITIAL_FORM_STATE);
  const [zoom, setZoom] = useState<number>(75);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const certificateRef = useRef<HTMLDivElement>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const isUserZoomedRef = useRef<boolean>(false);
  const lastWindowWidthRef = useRef<number>(typeof window !== "undefined" ? window.innerWidth : 1200);

  // Responsive Auto-Fit: dynamically calculate optimal preview scale to fit container without horizontal scroll
  const calculateFitZoom = useCallback(() => {
    if (previewBoxRef.current) {
      const containerWidth = previewBoxRef.current.clientWidth;
      // On mobile screens (<640px) padding inside preview box is p-2 (16px total)
      // On larger screens it is p-4 (32px total). We add safe breathing margin (4px)
      const padding = containerWidth < 640 ? 20 : 36;
      const available = containerWidth - padding;
      if (available > 100) {
        // Auto-scale to fit available width cleanly without horizontal overflow
        // Min zoom 20% (for very narrow mobile screens), max 100%
        const fitPercent = Math.min(100, Math.max(20, Math.floor((available / 920) * 100)));
        setZoom(fitPercent);
      }
    }
  }, []);

  useEffect(() => {
    // Initial responsive fit calculation on mount
    calculateFitZoom();
    const t1 = setTimeout(calculateFitZoom, 60);
    const t2 = setTimeout(calculateFitZoom, 250);

    // Responsive container observer: detects layout changes, orientation switches, etc.
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && previewBoxRef.current) {
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          if (width > 100 && !isUserZoomedRef.current) {
            const padding = width < 640 ? 20 : 36;
            const available = width - padding;
            const fitPercent = Math.min(100, Math.max(20, Math.floor((available / 920) * 100)));
            setZoom((prev) => (Math.abs(prev - fitPercent) > 2 ? fitPercent : prev));
          }
        }
      });
      ro.observe(previewBoxRef.current);
    }

    const handleWindowResize = () => {
      const currentWidth = window.innerWidth;
      if (Math.abs(currentWidth - lastWindowWidthRef.current) > 40) {
        lastWindowWidthRef.current = currentWidth;
        // On significant screen resize or rotation, reset and auto-fit
        isUserZoomedRef.current = false;
        calculateFitZoom();
      }
    };

    window.addEventListener("resize", handleWindowResize);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (ro) ro.disconnect();
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [calculateFitZoom]);

  const handleResetZoom = () => {
    isUserZoomedRef.current = false;
    if (previewBoxRef.current) {
      const containerWidth = previewBoxRef.current.clientWidth;
      const padding = containerWidth < 640 ? 20 : 36;
      const available = containerWidth - padding;
      const fitPercent = Math.min(100, Math.max(20, Math.floor((available / 920) * 100)));
      setZoom(fitPercent);
    } else {
      if (typeof window !== "undefined") {
        const screenW = window.innerWidth;
        if (screenW < 640) setZoom(35);
        else if (screenW < 1024) setZoom(65);
        else setZoom(75);
      } else {
        setZoom(75);
      }
    }
  };

  const activeThemeTpl = THEME_ORIGINALS[certData.theme];

  // Effective values: use user-typed text if present, otherwise render the authentic template text from the image
  const displayTitle = certData.certTitle.trim() || activeThemeTpl.certTitle;
  const displaySubtitle = certData.certSubtitle.trim() || activeThemeTpl.certSubtitle;
  const displayPresentation = certData.presentationLine.trim() || activeThemeTpl.presentationLine;
  const displayRecipient = certData.recipientName.trim() || activeThemeTpl.recipientName;
  const displayDescription = certData.description.trim() || activeThemeTpl.description;
  const displaySignatory1Name = certData.signatory1Name.trim() || activeThemeTpl.signatory1Name;
  const displaySignatory1Title = certData.signatory1Title.trim() || activeThemeTpl.signatory1Title;
  const displaySignatory1Signature = certData.signatory1Signature.trim() || activeThemeTpl.signatory1Signature;
  const displaySignatory2Name = certData.signatory2Name.trim() || activeThemeTpl.signatory2Name;
  const displaySignatory2Title = certData.signatory2Title.trim() || activeThemeTpl.signatory2Title;
  const displaySignatory2Signature = certData.signatory2Signature.trim() || activeThemeTpl.signatory2Signature;

  // Dynamic Typography & Layout Scaling helpers to prevent overflow & distortion when long text is entered
  const getTitleFontSize = (title: string) => {
    const len = title.length;
    if (len <= 15) return "text-4xl sm:text-5xl";
    if (len <= 24) return "text-3xl sm:text-4xl";
    if (len <= 32) return "text-2xl sm:text-3xl";
    return "text-xl sm:text-2xl";
  };

  const getRecipientFontSize = (name: string) => {
    const len = name.length;
    if (len <= 16) return "text-4xl sm:text-5xl";
    if (len <= 26) return "text-3xl sm:text-4xl";
    if (len <= 38) return "text-2xl sm:text-3xl";
    return "text-xl sm:text-2xl";
  };

  const getSubtitleFontSize = (sub: string) => {
    const len = sub.length;
    if (len <= 20) return "text-sm sm:text-base";
    if (len <= 32) return "text-xs sm:text-sm";
    return "text-[11px] sm:text-xs";
  };

  const getDescriptionClass = (desc: string) => {
    const len = desc.length;
    if (len <= 100) return "text-xs sm:text-[13px] leading-relaxed line-clamp-3";
    if (len <= 160) return "text-[11px] sm:text-xs leading-relaxed line-clamp-4";
    return "text-[10px] sm:text-[11px] leading-normal line-clamp-4";
  };

  const handleSelectTheme = (themeId: ThemeId) => {
    setCertData((prev) => ({
      ...prev,
      theme: themeId,
      nameFont: THEME_ORIGINALS[themeId].nameFont,
      signatory2Enabled: THEME_ORIGINALS[themeId].signatory2Enabled,
    }));
  };

  const handleResetFields = () => {
    setCertData({
      ...INITIAL_FORM_STATE,
      theme: certData.theme,
      nameFont: THEME_ORIGINALS[certData.theme].nameFont,
      signatory2Enabled: THEME_ORIGINALS[certData.theme].signatory2Enabled,
    });
    toast.info(language === "bn" ? "ইনপুট ফিল্ড রিসেট করা হয়েছে।" : "Input fields cleared.");
  };

  // Helper to convert base64 data URL to Blob for reliable cross-browser downloads
  const dataUrlToBlob = (dataUrl: string): Blob => {
    const parts = dataUrl.split(",");
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/png";
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  // Safe file downloader using Object URLs (bypasses browser data-URL length limits)
  const downloadBlobFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 1500);
  };

  // Capture certificate canvas at 100% unscaled scale directly from DOM
  const captureCertificateImage = async (): Promise<string> => {
    const el = certificateRef.current;
    if (!el) throw new Error("Certificate element not ready");

    const parent = el.parentElement;
    const originalTransform = parent ? parent.style.transform : "";

    try {
      // Temporarily unscale parent so captured image has true 100% 920x650 resolution
      if (parent) {
        parent.style.transform = "none";
      }

      // Force a synchronous reflow
      void el.offsetHeight;

      // 1. Primary engine: toPng from html-to-image with skipFonts: true (prevents CORS blocking on Google Fonts)
      try {
        const dataUrl = await toPng(el, {
          quality: 1,
          pixelRatio: 2.5,
          cacheBust: true,
          width: 920,
          height: 650,
          backgroundColor: "#ffffff",
          skipFonts: true,
        });

        if (dataUrl && dataUrl.length > 5000) {
          return dataUrl;
        }
      } catch (err) {
        console.warn("toPng with skipFonts error, trying default toPng:", err);
      }

      // 2. Retry without skipFonts
      try {
        const dataUrl = await toPng(el, {
          quality: 1,
          pixelRatio: 2.5,
          cacheBust: true,
          width: 920,
          height: 650,
          backgroundColor: "#ffffff",
        });

        if (dataUrl && dataUrl.length > 5000) {
          return dataUrl;
        }
      } catch (err) {
        console.warn("toPng default error, trying html2canvas fallback:", err);
      }

      // 3. Fallback: html2canvas
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(el, {
        scale: 2.5,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        width: 920,
        height: 650,
      });

      return canvas.toDataURL("image/png");
    } finally {
      // Restore preview zoom scale immediately
      if (parent) {
        parent.style.transform = originalTransform;
      }
    }
  };

  const handlePrint = () => {
    if (!certificateRef.current) return;

    // Get certificate HTML
    const certHtml = certificateRef.current.outerHTML;
    const recipientName = displayRecipient.trim() || "Certificate";

    const printWindow = window.open("", "_blank", "width=1200,height=850");
    if (!printWindow) {
      // Fallback to in-page print if popup was blocked
      window.print();
      return;
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${recipientName} - Southeast University Certificate</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Caveat:wght@600&family=Cinzel:wght@600;700;900&family=Great+Vibes&family=Playfair+Display:ital,wght@0,600;0,700;0,900;1,400&family=Pinyon+Script&family=Montserrat:wght@400;600;700;800&family=Homemade+Apple&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page {
      size: 11in 8.5in landscape; /* Standard Professional Certificate Dimensions */
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: #ffffff !important;
      overflow: hidden !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    .print-frame {
      width: 11in;
      height: 8.5in;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      overflow: hidden;
      margin: 0 auto;
      padding: 0;
    }
    #seu-certificate-print-area {
      width: 11in !important;
      height: 8.5in !important;
      transform: none !important;
      box-shadow: none !important;
      border: none !important;
      margin: 0 !important;
      position: relative !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      background: #ffffff !important;
    }
  </style>
</head>
<body>
  <div class="print-frame">
    ${certHtml}
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 450);
    };
  </script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleDownloadPng = async () => {
    if (!certificateRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading(language === "bn" ? "আল্ট্রা-এইচডি PNG সার্টিফিকেট তৈরি হচ্ছে..." : "Generating Ultra-HD PNG certificate...");
    try {
      const dataUrl = await captureCertificateImage();
      const blob = dataUrlToBlob(dataUrl);
      const safeName = displayRecipient.replace(/[^a-zA-Z0-9_\u0980-\u09FF-]/g, "_").trim() || "Certificate";
      downloadBlobFile(blob, `${safeName}_SEU_Certificate.png`);

      toast.dismiss(toastId);
      toast.success(language === "bn" ? "সার্টিফিকেট PNG সফলভাবে ডাউনলোড হয়েছে!" : "Certificate PNG downloaded successfully!");
    } catch (err: any) {
      console.error("PNG download error:", err);
      toast.dismiss(toastId);
      toast.error(language === "bn" ? "PNG ডাউনলোড ব্যর্থ হয়েছে: " + err.message : "Failed to download PNG: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!certificateRef.current) return;
    setIsExporting(true);
    const toastId = toast.loading(language === "bn" ? "প্রফেশনাল সার্টিফিকেট PDF রেন্ডার হচ্ছে..." : "Rendering standard certificate PDF...");
    try {
      const dataUrl = await captureCertificateImage();
      const { jsPDF } = await import("jspdf");

      // Professional Standard Certificate Dimensions: 11 x 8.5 inches (279.4 x 215.9 mm) Landscape
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "in",
        format: [11, 8.5],
        compress: true,
      });

      pdf.addImage(dataUrl, "PNG", 0, 0, 11, 8.5, undefined, "FAST");
      const pdfBlob = pdf.output("blob");
      const safeName = displayRecipient.replace(/[^a-zA-Z0-9_\u0980-\u09FF-]/g, "_").trim() || "Certificate";
      downloadBlobFile(pdfBlob, `${safeName}_SEU_Certificate.pdf`);

      toast.dismiss(toastId);
      toast.success(language === "bn" ? "সার্টিফিকেট PDF সফলভাবে ডাউনলোড হয়েছে!" : "Certificate PDF downloaded successfully!");
    } catch (err: any) {
      console.error("PDF download error:", err);
      toast.dismiss(toastId);
      toast.error(language === "bn" ? "PDF ডাউনলোড ব্যর্থ হয়েছে: " + err.message : "Failed to download PDF: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const getRecipientFontFamily = () => {
    switch (certData.nameFont) {
      case "alex-brush":
        return "'Alex Brush', cursive";
      case "great-vibes":
        return "'Great Vibes', cursive";
      case "pinyon-script":
        return "'Pinyon Script', cursive";
      case "playfair":
        return "'Playfair Display', serif";
      case "cinzel":
        return "'Cinzel', serif";
      default:
        return "'Alex Brush', cursive";
    }
  };

  return (
    <div className="space-y-8">
      {/* Google Fonts Injection */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&family=Caveat:wght@600&family=Cinzel:wght@600;700;900&family=Great+Vibes&family=Playfair+Display:ital,wght@0,600;0,700;0,900;1,400&family=Pinyon+Script&family=Montserrat:wght@400;600;700;800&family=Homemade+Apple&display=swap');

        @media print {
          @page {
            size: 11in 8.5in landscape !important;
            margin: 0 !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: hidden !important;
          }
          body * {
            visibility: hidden !important;
          }
          #seu-certificate-print-area, #seu-certificate-print-area * {
            visibility: visible !important;
          }
          #seu-certificate-print-area {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 0 !important;
            transform: none !important;
            box-shadow: none !important;
            border: none !important;
            z-index: 9999999 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Header Banner - Standard NoteLagbe Styling */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="space-y-1.5 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{language === "bn" ? "অফিশিয়াল একাডেমিক ও ইভেন্ট সার্টিফিকেট" : "Official Academic & Event Certificates"}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {language === "bn" ? "ইভেন্ট সার্টিফিকেট মেকার" : "Event Certificate Maker"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
            {language === "bn"
              ? "সেমিনার, ওয়ার্কশপ, হ্যাকাথন ও ক্লাব ইভেন্টের জন্য ৫টি অফিশিয়াল হ্যান্ডক্র্যাফটেড আল্ট্রা-প্রিমিয়াম সার্টিফিকেট মেকার।"
              : "Design & export high-resolution event certificates for hackathons, workshops, conferences, and student club awards."}
          </p>
        </div>
      </div>

      {/* 5 Master Template Selector Tabs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Palette className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{language === "bn" ? "৫টি মাস্টার সার্টিফিকেট ডিজাইন" : "5 Master Certificate Designs"}</span>
          </h2>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            Exact 1:1 replicas from official templates
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(["theme-1", "theme-2", "theme-3", "theme-4", "theme-5"] as ThemeId[]).map((themeId) => {
            const isSelected = certData.theme === themeId;
            const tpl = THEME_ORIGINALS[themeId];
            return (
              <button
                key={themeId}
                onClick={() => handleSelectTheme(themeId)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                  isSelected
                    ? "bg-white dark:bg-slate-900 border-2 border-blue-600 dark:border-blue-500 shadow-md ring-2 ring-blue-500/20 scale-[1.02]"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      themeId === "theme-1"
                        ? "bg-cyan-500"
                        : themeId === "theme-2"
                        ? "bg-amber-500"
                        : themeId === "theme-3"
                        ? "bg-blue-900"
                        : themeId === "theme-4"
                        ? "bg-neutral-900"
                        : "bg-rose-900"
                    }`}
                  />
                  {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                </div>
                <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">{tpl.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{tpl.sub}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Workspace: Left Controls (5 cols) + Right Live Canvas & Downloads (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Input Customization Form (NO pre-filled demo values in fields) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            {/* Form Header with Title, Limit Badge & Sleek Clear Inputs Action */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-2xs">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    {language === "bn" ? "সার্টিফিকেট তথ্য এডিটর" : "Certificate Editor"}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {language === "bn" ? "স্মার্ট লিমিট ও অটো-স্কেলিং সক্রিয়" : "Smart limits & auto-scaling active"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetFields}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-800/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                title={language === "bn" ? "সকল ইনপুট ফিল্ড মুছে ফেলুন" : "Clear all fields to defaults"}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{language === "bn" ? "রিসেট ফিল্ডস" : "Clear Inputs"}</span>
              </button>
            </div>

            {/* Section 1: Recipient Information */}
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>{language === "bn" ? "সার্টিফিকেট গ্রহীতার তথ্য" : "Recipient Information"}</span>
              </h3>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {language === "bn" ? "গ্রহীতার পূর্ণ নাম *" : "Recipient Full Name *"}
                  </label>
                  <span
                    className={`text-[10px] font-mono font-medium ${
                      certData.recipientName.length > 40
                        ? "text-rose-500 font-bold"
                        : certData.recipientName.length > 30
                        ? "text-amber-500"
                        : "text-slate-400"
                    }`}
                  >
                    {certData.recipientName.length}/50
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={50}
                  value={certData.recipientName}
                  onChange={(e) => setCertData({ ...certData, recipientName: e.target.value })}
                  placeholder={`e.g. ${activeThemeTpl.recipientName}`}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === "bn" ? "ক্যালোগ্রাফি ফন্ট নির্বাচন" : "Calligraphy Name Font"}
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "alex-brush", label: "Alex Brush", sample: "Alex" },
                    { id: "great-vibes", label: "Great Vibes", sample: "Vibes" },
                    { id: "pinyon-script", label: "Pinyon Script", sample: "Script" },
                    { id: "playfair", label: "Playfair Serif", sample: "Playfair" },
                    { id: "cinzel", label: "Cinzel Roman", sample: "Cinzel" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setCertData({ ...certData, nameFont: f.id as any })}
                      className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all text-center cursor-pointer ${
                        certData.nameFont === f.id
                          ? "bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-700 dark:text-blue-300 shadow-sm"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 2: Certificate Titles & Presentation */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <PenTool className="w-3.5 h-3.5 text-blue-600" />
                <span>{language === "bn" ? "হেডিং ও সাইটেশন বিবরণ" : "Headings & Citation"}</span>
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      {language === "bn" ? "টাইটেল" : "Main Title"}
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">
                      {certData.certTitle.length}/35
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={35}
                    value={certData.certTitle}
                    onChange={(e) => setCertData({ ...certData, certTitle: e.target.value })}
                    placeholder={`e.g. ${activeThemeTpl.certTitle}`}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      {language === "bn" ? "সাবটাইটেল" : "Subtitle"}
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">
                      {certData.certSubtitle.length}/40
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={40}
                    value={certData.certSubtitle}
                    onChange={(e) => setCertData({ ...certData, certSubtitle: e.target.value })}
                    placeholder={`e.g. ${activeThemeTpl.certSubtitle}`}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    {language === "bn" ? "প্রেজেন্টেশন লাইন" : "Presentation Line"}
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">
                    {certData.presentationLine.length}/65
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={65}
                  value={certData.presentationLine}
                  onChange={(e) => setCertData({ ...certData, presentationLine: e.target.value })}
                  placeholder={`e.g. ${activeThemeTpl.presentationLine}`}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    {language === "bn" ? "প্রশংসা বাক্য / সাইটেশন বর্ণনা" : "Award Citation / Description"}
                  </label>
                  <span
                    className={`text-[10px] font-mono font-medium ${
                      certData.description.length > 200
                        ? "text-rose-500 font-bold"
                        : certData.description.length > 160
                        ? "text-amber-500"
                        : "text-slate-400"
                    }`}
                  >
                    {certData.description.length}/220
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={220}
                  value={certData.description}
                  onChange={(e) => setCertData({ ...certData, description: e.target.value })}
                  placeholder={`e.g. ${activeThemeTpl.description}`}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
                />
                <p className="text-[10px] text-slate-400 italic">
                  {language === "bn"
                    ? "সার্টিফিকেটের সেরা নান্দনিকতার জন্য সর্বোচ্চ ২২০ অক্ষর নির্ধারিত।"
                    : "Max 220 characters with auto-scaling to keep clean certificate margins."}
                </p>
              </div>
            </div>

            {/* Section 3: Signatories */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Award className="w-3.5 h-3.5 text-blue-600" />
                  <span>{language === "bn" ? "অনুমোদনকারী ও স্বাক্ষর" : "Signatories & Signatures"}</span>
                </h3>
                <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={certData.signatory2Enabled}
                    onChange={(e) => setCertData({ ...certData, signatory2Enabled: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>2 Signatures</span>
                </label>
              </div>

              {/* Signatory 1 */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Signatory 1 {certData.signatory2Enabled ? "(Left)" : "(Center)"}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    maxLength={35}
                    value={certData.signatory1Name}
                    onChange={(e) => setCertData({ ...certData, signatory1Name: e.target.value })}
                    placeholder={`Name: e.g. ${activeThemeTpl.signatory1Name || "Full Name"}`}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    maxLength={40}
                    value={certData.signatory1Title}
                    onChange={(e) => setCertData({ ...certData, signatory1Title: e.target.value })}
                    placeholder={`Title: e.g. ${activeThemeTpl.signatory1Title}`}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300"
                  />
                </div>
                <input
                  type="text"
                  maxLength={30}
                  value={certData.signatory1Signature}
                  onChange={(e) => setCertData({ ...certData, signatory1Signature: e.target.value })}
                  placeholder={`Signature text: e.g. ${activeThemeTpl.signatory1Signature || "Handwritten name"}`}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-serif italic text-slate-800 dark:text-slate-200"
                />
              </div>

              {/* Signatory 2 */}
              {certData.signatory2Enabled && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Signatory 2 (Right)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      maxLength={35}
                      value={certData.signatory2Name}
                      onChange={(e) => setCertData({ ...certData, signatory2Name: e.target.value })}
                      placeholder={`Name: e.g. ${activeThemeTpl.signatory2Name || "Full Name"}`}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                    />
                    <input
                      type="text"
                      maxLength={40}
                      value={certData.signatory2Title}
                      onChange={(e) => setCertData({ ...certData, signatory2Title: e.target.value })}
                      placeholder={`Title: e.g. ${activeThemeTpl.signatory2Title}`}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300"
                    />
                  </div>
                  <input
                    type="text"
                    maxLength={30}
                    value={certData.signatory2Signature}
                    onChange={(e) => setCertData({ ...certData, signatory2Signature: e.target.value })}
                    placeholder={`Signature text: e.g. ${activeThemeTpl.signatory2Signature || "Handwritten name"}`}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-serif italic text-slate-800 dark:text-slate-200"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Certificate Canvas & Downloads (matching Cover Page Maker) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Zoom & Canvas Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {language === "bn" ? "প্রিভিউ স্কেল:" : "Preview Scale:"}
              </span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    isUserZoomedRef.current = true;
                    setZoom((prev) => Math.max(20, prev - (prev <= 40 ? 5 : 10)));
                  }}
                  className="p-1 sm:p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer active:scale-95 transition-all"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 min-w-9 text-center">
                  {zoom}%
                </span>
                <button
                  type="button"
                  onClick={() => {
                    isUserZoomedRef.current = true;
                    setZoom((prev) => Math.min(140, prev + (prev < 40 ? 5 : 10)));
                  }}
                  className="p-1 sm:p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer active:scale-95 transition-all"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  isUserZoomedRef.current = false;
                  handleResetZoom();
                }}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/40 px-2.5 py-1.5 rounded-xl border border-blue-200/60 dark:border-blue-900/40 cursor-pointer transition-all active:scale-95 shadow-2xs"
                title="Reset zoom to fit screen"
              >
                {language === "bn" ? "স্ক্রিন ফিট" : "Fit Screen"}
              </button>
            </div>

            <span className="self-start sm:self-auto text-[10px] sm:text-[11px] px-2.5 py-1 rounded-full font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40 whitespace-nowrap">
              Standard Certificate (11" × 8.5" Landscape)
            </span>
          </div>

          {/* Certificate Rendering Box */}
          <div
            ref={previewBoxRef}
            className="w-full overflow-x-auto p-2 sm:p-4 rounded-3xl bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 shadow-inner flex flex-col items-center justify-center min-h-[220px] sm:min-h-[300px] transition-all"
          >
            <div
              style={{
                width: `${Math.round(920 * (zoom / 100))}px`,
                height: `${Math.round(650 * (zoom / 100))}px`,
                position: "relative",
                transition: "width 0.15s ease-out, height 0.15s ease-out",
              }}
              className="mx-auto shrink-0 select-none shadow-xl rounded-xl sm:rounded-2xl overflow-hidden"
            >
              <div
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: "top left",
                  width: "920px",
                  height: "650px",
                  position: "absolute",
                  top: 0,
                  left: 0,
                }}
              >
                {/* TARGET PRINT/EXPORT CANVAS (Standard Certificate 11" x 8.5" Landscape) */}
                <div
                  ref={certificateRef}
                  id="seu-certificate-print-area"
                  className="w-[920px] h-[650px] relative bg-white select-none shadow-2xl overflow-hidden text-slate-900"
                  style={{
                    boxSizing: "border-box",
                  }}
                >
                {/* ============================================================== */}
                {/* THEME 1: MODERN CYAN GEOMETRIC TECH (Image 1)                   */}
                {/* ============================================================== */}
                {certData.theme === "theme-1" && (
                  <div className="w-full h-full relative p-12 flex flex-col justify-between overflow-hidden bg-white">
                    {/* SVG Geometric Background Accents matching Image 1 */}
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      viewBox="0 0 920 650"
                      preserveAspectRatio="none"
                    >
                      {/* Top-Left Polygons */}
                      <polygon points="0,0 260,0 0,350" fill="#cffafe" opacity="0.6" />
                      <polygon points="0,0 180,0 0,250" fill="#0d9488" />
                      <polygon points="0,100 150,0 200,0 0,260" fill="#14b8a6" opacity="0.8" />
                      <polygon points="0,0 80,0 0,110" fill="#042f2e" opacity="0.2" />

                      {/* Light Cyan Inner Frame Lines */}
                      <polyline points="48,150 48,48 180,48" fill="none" stroke="#a5f3fc" strokeWidth="2" opacity="0.7" />
                      <polyline points="872,500 872,602 740,602" fill="none" stroke="#a5f3fc" strokeWidth="2" opacity="0.7" />

                      {/* Bottom-Right Polygons - tight corner so signatures are 100% on pure white */}
                      <polygon points="920,650 810,650 920,520" fill="#cffafe" opacity="0.45" />
                      <polygon points="920,650 840,650 920,550" fill="#0d9488" />
                      <polygon points="870,650 920,590 920,625 840,650" fill="#14b8a6" opacity="0.85" />
                      <polygon points="895,650 920,620 920,650" fill="#042f2e" opacity="0.25" />
                    </svg>

                    {/* Gold Sunburst Badge (Top-Left) with blue center & BEST AWARD */}
                    <div className="absolute top-10 left-16 z-20 flex flex-col items-center">
                      <div className="relative w-28 h-28 flex items-center justify-center filter drop-shadow-md">
                        {/* Gold Ribbons hanging down */}
                        <div className="absolute top-14 -left-1 w-7 h-16 bg-gradient-to-b from-amber-400 via-amber-300 to-amber-500 [clip-path:polygon(0_0,100%_0,100%_100%,50%_75%,0_100%)] rotate-12" />
                        <div className="absolute top-14 -right-1 w-7 h-16 bg-gradient-to-b from-amber-400 via-amber-300 to-amber-500 [clip-path:polygon(0_0,100%_0,100%_100%,50%_75%,0_100%)] -rotate-12" />

                        {/* Scalloped Gold Medal Outer Ring */}
                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-300 p-1 flex items-center justify-center shadow-lg">
                          <div className="w-full h-full rounded-full bg-slate-900 border-2 border-amber-300 flex flex-col items-center justify-center text-center p-2">
                            <div className="flex gap-0.5 text-[8px] text-amber-300 mb-0.5">
                              ★ ★ ★ ★ ★
                            </div>
                            <span className="text-[12px] font-black text-amber-300 tracking-wider leading-none">
                              BEST
                            </span>
                            <span className="text-[9px] font-bold text-amber-200 tracking-widest leading-none mt-0.5">
                              AWARD
                            </span>
                            <div className="flex gap-0.5 text-[8px] text-amber-300 mt-0.5">
                              ★ ★ ★ ★ ★
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="z-10 text-center space-y-3.5 max-w-2xl mx-auto pt-6">
                      <div className="space-y-1">
                        <h1 className={`${getTitleFontSize(displayTitle)} font-black text-slate-800 tracking-[0.15em] uppercase font-sans leading-tight`}>
                          {displayTitle}
                        </h1>
                        <p className={`${getSubtitleFontSize(displaySubtitle)} font-bold text-slate-600 tracking-[0.25em] uppercase`}>
                          {displaySubtitle}
                        </p>
                      </div>

                      <p className="text-xs sm:text-sm font-medium text-slate-500 lowercase tracking-wide pt-1 line-clamp-1">
                        {displayPresentation}
                      </p>

                      {/* Recipient Name with dynamic scaling & adaptive underline */}
                      <div className="py-1.5 inline-block max-w-xl mx-auto w-full">
                        <h2
                          className={`${getRecipientFontSize(displayRecipient)} text-slate-800 leading-tight px-4 break-words`}
                          style={{ fontFamily: getRecipientFontFamily() }}
                        >
                          {displayRecipient}
                        </h2>
                        <div
                          className="mx-auto h-[2px] bg-slate-800 mt-2 transition-all duration-200"
                          style={{ width: `${Math.min(460, Math.max(200, displayRecipient.length * 10.5))}px` }}
                        />
                      </div>

                      <p className={`${getDescriptionClass(displayDescription)} text-slate-600 max-w-xl mx-auto px-4 font-normal break-words`}>
                        {displayDescription}
                      </p>
                    </div>

                    {/* Footer Signatures: centered inward with generous white cushion, 100% clear of all side designs */}
                    <div className="z-10 w-full max-w-xl mx-auto flex justify-between items-end pb-10 px-6">
                      <div className="text-center w-40">
                        <p className="text-[11px] font-bold tracking-widest uppercase text-slate-700 mb-1.5">
                          {displaySignatory1Title || "SIGNATURE"}
                        </p>
                        <div className="w-full h-[2px] bg-slate-900" />
                        {displaySignatory1Name && (
                          <p className="text-[11px] font-bold text-slate-800 mt-1">{displaySignatory1Name}</p>
                        )}
                      </div>

                      {certData.signatory2Enabled && (
                        <div className="text-center w-40">
                          <p className="text-[11px] font-bold tracking-widest uppercase text-slate-700 mb-1.5">
                            {displaySignatory2Title || "SIGNATURE"}
                          </p>
                          <div className="w-full h-[2px] bg-slate-900" />
                          {displaySignatory2Name && (
                            <p className="text-[11px] font-bold text-slate-800 mt-1">{displaySignatory2Name}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ============================================================== */}
                {/* THEME 2: CLASSIC ROYAL IVORY & GOLD (Image 2)                  */}
                {/* ============================================================== */}
                {certData.theme === "theme-2" && (
                  <div className="w-full h-full relative p-10 flex flex-col justify-between overflow-hidden bg-[#fdfbf7] text-[#3c2415]">
                    {/* SVG Authentic Greek Key / Ornate Interlocking Gold Lattice Border */}
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none p-5"
                      viewBox="0 0 920 650"
                      preserveAspectRatio="none"
                    >
                      {/* Outer Double Frame */}
                      <rect x="25" y="25" width="870" height="600" fill="none" stroke="#b38728" strokeWidth="2.5" />
                      <rect x="35" y="35" width="850" height="580" fill="none" stroke="#d4af37" strokeWidth="1" strokeDasharray="6,4" />

                      {/* Repeating Greek-Key Corner Flourishes */}
                      <path
                        d="M 45,45 L 80,45 L 80,60 L 60,60 L 60,75 L 75,75 L 75,90 L 45,90 Z"
                        fill="none"
                        stroke="#b38728"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M 875,45 L 840,45 L 840,60 L 860,60 L 860,75 L 845,75 L 845,90 L 875,90 Z"
                        fill="none"
                        stroke="#b38728"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M 45,605 L 80,605 L 80,590 L 60,590 L 60,575 L 75,575 L 75,560 L 45,560 Z"
                        fill="none"
                        stroke="#b38728"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M 875,605 L 840,605 L 840,590 L 860,590 L 860,575 L 845,575 L 845,560 L 875,560 Z"
                        fill="none"
                        stroke="#b38728"
                        strokeWidth="1.5"
                      />

                      {/* Inner Thin Border Line */}
                      <rect x="42" y="42" width="836" height="566" fill="none" stroke="#c59b27" strokeWidth="1" opacity="0.8" />
                    </svg>

                    {/* Content Section */}
                    <div className="z-10 text-center space-y-3.5 max-w-2xl mx-auto pt-6">
                      <div className="space-y-1">
                        <h1 className={`${getTitleFontSize(displayTitle)} font-serif font-black tracking-[0.12em] text-[#3c2415] uppercase leading-tight`}>
                          {displayTitle}
                        </h1>
                        <div className="flex items-center justify-center gap-3 pt-1">
                          <div className="w-16 h-[1px] bg-[#b38728]" />
                          <p className={`${getSubtitleFontSize(displaySubtitle)} font-serif italic text-[#633a20] tracking-wider`}>
                            {displaySubtitle}
                          </p>
                          <div className="w-16 h-[1px] bg-[#b38728]" />
                        </div>
                      </div>

                      <p className="text-xs font-serif tracking-wider text-[#633a20] pt-1 line-clamp-1">
                        {displayPresentation}
                      </p>

                      {/* Recipient Name with dynamic scaling & adaptive Diamond Rule */}
                      <div className="py-1.5 max-w-xl mx-auto w-full">
                        <h2
                          className={`${getRecipientFontSize(displayRecipient)} text-[#a07828] leading-tight px-4 break-words`}
                          style={{ fontFamily: getRecipientFontFamily() }}
                        >
                          {displayRecipient}
                        </h2>
                        <div
                          className="flex items-center justify-center gap-2 mt-2 mx-auto transition-all duration-200"
                          style={{ width: `${Math.min(460, Math.max(200, displayRecipient.length * 10.5))}px` }}
                        >
                          <div className="w-full h-[1px] bg-[#a07828]" />
                          <span className="text-[#a07828] text-xs">◆</span>
                          <div className="w-full h-[1px] bg-[#a07828]" />
                        </div>
                      </div>

                      <p className={`${getDescriptionClass(displayDescription)} font-serif text-[#4a3319] max-w-lg mx-auto italic px-4 break-words`}>
                        {displayDescription}
                      </p>
                    </div>

                    {/* Bottom Area: Gold Rosette Seal (Left-center) + Yanis Petros Signature matching Image 2 */}
                    <div className="z-10 flex items-center justify-center gap-6 pb-6">
                      {/* 3D Realistic Gold Seal Rosette */}
                      <div className="relative w-20 h-20 flex items-center justify-center">
                        <div className="absolute top-10 -left-1 w-5 h-12 bg-gradient-to-b from-amber-400 to-amber-600 [clip-path:polygon(0_0,100%_0,100%_100%,50%_75%,0_100%)] rotate-12" />
                        <div className="absolute top-10 -right-1 w-5 h-12 bg-gradient-to-b from-amber-400 to-amber-600 [clip-path:polygon(0_0,100%_0,100%_100%,50%_75%,0_100%)] -rotate-12" />
                        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-600 via-amber-200 to-yellow-500 p-1 flex items-center justify-center shadow-lg border-2 border-amber-300">
                          <div className="w-full h-full rounded-full border border-amber-700/40 flex items-center justify-center bg-gradient-to-br from-amber-300 via-yellow-200 to-amber-400">
                            <Award className="w-7 h-7 text-amber-800" />
                          </div>
                        </div>
                      </div>

                      {/* Single Signature Block */}
                      <div className="text-center w-56">
                        <div className="font-serif italic text-lg text-[#3c2415] h-7 flex items-center justify-center font-bold">
                          {displaySignatory1Signature || "Yanis Petros"}
                        </div>
                        <div className="w-full h-[1.5px] bg-[#3c2415] mb-1.5" />
                        <p className="text-xs font-serif font-black text-[#3c2415]">
                          {displaySignatory1Name || "Yanis Petros"}
                        </p>
                        <p className="text-[11px] font-serif text-[#633a20]">
                          {displaySignatory1Title || "Head of Department"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ============================================================== */}
                {/* THEME 3: MODERN EXECUTIVE NAVY & GOLD HALFTONE (Image 3)        */}
                {/* ============================================================== */}
                {certData.theme === "theme-3" && (
                  <div className="w-full h-full relative p-10 flex flex-col justify-between overflow-hidden bg-white text-slate-900">
                    {/* SVG Navy Polygons & Halftone Matrix Accents matching Image 3 */}
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      viewBox="0 0 920 650"
                      preserveAspectRatio="none"
                    >
                      {/* Double Thin Gold Margin Frame with Notched Corners */}
                      <rect x="25" y="25" width="870" height="600" fill="none" stroke="#d4af37" strokeWidth="1.5" />
                      <rect x="32" y="32" width="856" height="586" fill="none" stroke="#d4af37" strokeWidth="0.75" />

                      {/* Bottom-Left Navy Stacked Corner - Strictly confined to (x < 90) so text is 100% on pure white */}
                      <polygon points="0,650 0,570 80,650" fill="#07152b" />
                      <polygon points="0,650 0,600 50,650" fill="#0f294a" />
                      <polygon points="0,555 45,555 90,600 0,650" fill="none" stroke="#d4af37" strokeWidth="1.5" />
                      <line x1="0" y1="565" x2="85" y2="650" stroke="#d4af37" strokeWidth="2" />
                      <line x1="0" y1="580" x2="70" y2="650" stroke="#d4af37" strokeWidth="1" />

                      {/* Top-Right Navy & Gold Stacked Triangles & Wireframe Diamonds */}
                      <polygon points="920,0 920,95 825,0" fill="#07152b" />
                      <polygon points="920,0 920,60 860,0" fill="#0f294a" />
                      <polygon points="920,110 875,110 830,65 920,0" fill="none" stroke="#d4af37" strokeWidth="1.5" />
                      <line x1="920" y1="105" x2="835" y2="0" stroke="#d4af37" strokeWidth="2" />
                      <line x1="920" y1="90" x2="850" y2="0" stroke="#d4af37" strokeWidth="1" />

                      {/* Authentic Halftone Dot Matrix Pattern Top-Left (fades outward) */}
                      <g fill="#0f294a">
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((r) =>
                          [0, 1, 2, 3, 4, 5, 6, 7].map((c) => {
                            const dist = r + c;
                            const radius = Math.max(0.6, 3.2 - dist * 0.25);
                            const opacity = Math.max(0.15, 0.85 - dist * 0.07);
                            return (
                              <circle
                                key={`tl-dot-${r}-${c}`}
                                cx={45 + c * 14}
                                cy={45 + r * 14}
                                r={radius}
                                opacity={opacity}
                              />
                            );
                          })
                        )}
                      </g>

                      {/* Authentic Halftone Dot Matrix Pattern Bottom-Right (fades outward) */}
                      <g fill="#0f294a">
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((r) =>
                          [0, 1, 2, 3, 4, 5, 6, 7].map((c) => {
                            const dist = (7 - r) + (7 - c);
                            const radius = Math.max(0.6, 3.2 - dist * 0.25);
                            const opacity = Math.max(0.15, 0.85 - dist * 0.07);
                            return (
                              <circle
                                key={`br-dot-${r}-${c}`}
                                cx={775 + c * 14}
                                cy={505 + r * 14}
                                r={radius}
                                opacity={opacity}
                              />
                            );
                          })
                        )}
                      </g>
                    </svg>

                    {/* Top Center 3D Gold Medal matching Image 3 */}
                    <div className="z-10 flex flex-col items-center pt-2">
                      <div className="relative w-20 h-20 flex items-center justify-center">
                        {/* 3D Gold Ribbon Tails */}
                        <div className="absolute top-10 -left-1 w-5 h-12 bg-gradient-to-b from-amber-400 via-amber-300 to-amber-600 [clip-path:polygon(0_0,100%_0,100%_100%,50%_75%,0_100%)] rotate-12" />
                        <div className="absolute top-10 -right-1 w-5 h-12 bg-gradient-to-b from-amber-400 via-amber-300 to-amber-600 [clip-path:polygon(0_0,100%_0,100%_100%,50%_75%,0_100%)] -rotate-12" />

                        {/* Scalloped Gold Rosette Outer Ring */}
                        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-600 via-amber-200 to-yellow-500 p-1 shadow-lg border-2 border-amber-300 flex items-center justify-center">
                          <div className="w-full h-full rounded-full border border-amber-700/40 flex items-center justify-center bg-gradient-to-br from-amber-300 via-yellow-200 to-amber-400">
                            <Star className="w-8 h-8 text-amber-900 fill-amber-900" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Main Content */}
                    <div className="z-10 text-center space-y-3 max-w-2xl mx-auto -mt-2">
                      <div className="space-y-1">
                        <h1 className={`${getTitleFontSize(displayTitle)} font-serif font-black tracking-[0.25em] text-slate-900 uppercase leading-tight`}>
                          {displayTitle}
                        </h1>
                        <p className={`${getSubtitleFontSize(displaySubtitle)} font-sans font-bold text-slate-800 tracking-[0.2em] uppercase`}>
                          {displaySubtitle}
                        </p>
                      </div>

                      <p className="text-xs text-slate-500 font-sans tracking-wide line-clamp-1">
                        {displayPresentation}
                      </p>

                      {/* Recipient Name with dynamic scaling & adaptive underline */}
                      <div className="py-1 max-w-xl mx-auto w-full">
                        <h2
                          className={`${getRecipientFontSize(displayRecipient)} text-slate-900 leading-tight px-4 break-words`}
                          style={{ fontFamily: getRecipientFontFamily() }}
                        >
                          {displayRecipient}
                        </h2>
                        <div
                          className="mx-auto h-[1.5px] bg-slate-900 mt-2 transition-all duration-200"
                          style={{ width: `${Math.min(460, Math.max(200, displayRecipient.length * 10.5))}px` }}
                        />
                      </div>

                      <p className={`${getDescriptionClass(displayDescription)} text-slate-600 max-w-xl mx-auto px-4 font-normal break-words`}>
                        {displayDescription}
                      </p>
                    </div>

                    {/* 2 Signatures matching Image 3 - completely clear of polygons, 100% on pure white background */}
                    <div className="z-10 w-full max-w-2xl mx-auto flex justify-between items-end pb-8 px-6">
                      <div className="text-center w-48">
                        <div className="w-full h-[1.5px] bg-slate-900 mb-2" />
                        <p className="text-xs font-black text-slate-900 uppercase tracking-wider">
                          {displaySignatory1Name}
                        </p>
                        <p className="text-[11px] text-slate-600 font-medium">{displaySignatory1Title}</p>
                      </div>

                      {certData.signatory2Enabled && (
                        <div className="text-center w-48">
                          <div className="w-full h-[1.5px] bg-slate-900 mb-2" />
                          <p className="text-xs font-black text-slate-900 uppercase tracking-wider">
                            {displaySignatory2Name}
                          </p>
                          <p className="text-[11px] text-slate-600 font-medium">{displaySignatory2Title}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ============================================================== */}
                {/* THEME 4: LUXURY BLACK & GOLD (Image 4)                         */}
                {/* ============================================================== */}
                {certData.theme === "theme-4" && (
                  <div className="w-full h-full relative p-12 flex flex-col justify-between overflow-hidden bg-white text-slate-900">
                    {/* SVG Flowing Black Waves & Gold Filigree matching Image 4 */}
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      viewBox="0 0 920 650"
                      preserveAspectRatio="none"
                    >
                      {/* Thin Black Margin Frame */}
                      <rect x="35" y="35" width="850" height="580" fill="none" stroke="#222" strokeWidth="1.2" />

                      {/* Top-Right Black Wave & Gold Ribbon - tight corner curve */}
                      <path d="M 740,0 C 790,20 850,60 920,150 L 920,0 Z" fill="#111113" />
                      <path d="M 730,0 C 785,25 845,70 920,165" fill="none" stroke="#d4af37" strokeWidth="4" />
                      <path d="M 755,0 C 805,25 860,65 920,140" fill="none" stroke="#fef08a" strokeWidth="1.5" />

                      {/* Bottom-Left Black Wave & Gold Ribbon - stays strictly in corner (0,560 to 110,650), leaving signatures 100% clear */}
                      <path d="M 0,560 C 25,585 55,615 110,650 L 0,650 Z" fill="#111113" />
                      <path d="M 0,550 C 30,580 65,610 120,650" fill="none" stroke="#d4af37" strokeWidth="4" />
                      <path d="M 0,575 C 20,595 45,625 95,650" fill="none" stroke="#fef08a" strokeWidth="1.5" />

                      {/* Authentic Gold Foliage Branches (Top-Left) matching Image 4 */}
                      <g stroke="#c59b27" fill="#c59b27" strokeWidth="1.2">
                        <path d="M 45,45 Q 70,80 75,130 Q 78,160 95,185" fill="none" strokeWidth="2" strokeLinecap="round" />
                        <path d="M 45,45 Q 80,70 130,75 Q 160,78 185,95" fill="none" strokeWidth="2" strokeLinecap="round" />
                        <path d="M 60,65 Q 75,55 85,68 Q 72,78 60,65 Z" fill="#d4af37" />
                        <path d="M 65,60 Q 55,75 68,85 Q 78,72 65,60 Z" fill="#d4af37" />
                        <path d="M 85,95 Q 105,85 115,100 Q 98,110 85,95 Z" fill="#c59b27" />
                        <path d="M 95,85 Q 85,105 100,115 Q 110,98 95,85 Z" fill="#c59b27" />
                        <path d="M 72,125 Q 92,120 98,135 Q 82,145 72,125 Z" fill="#d4af37" />
                        <path d="M 125,72 Q 120,92 135,98 Q 145,82 125,72 Z" fill="#d4af37" />
                      </g>

                      {/* Authentic Gold Foliage Branches (Bottom-Right) matching Image 4 */}
                      <g stroke="#c59b27" fill="#c59b27" strokeWidth="1.2">
                        <path d="M 875,605 Q 850,570 845,520 Q 842,490 825,465" fill="none" strokeWidth="2" strokeLinecap="round" />
                        <path d="M 875,605 Q 840,580 790,575 Q 760,572 735,555" fill="none" strokeWidth="2" strokeLinecap="round" />
                        <path d="M 860,585 Q 845,595 835,582 Q 848,572 860,585 Z" fill="#d4af37" />
                        <path d="M 855,590 Q 865,575 852,565 Q 842,578 855,590 Z" fill="#d4af37" />
                        <path d="M 835,555 Q 815,565 805,550 Q 822,540 835,555 Z" fill="#c59b27" />
                        <path d="M 825,565 Q 835,545 820,535 Q 810,552 825,565 Z" fill="#c59b27" />
                      </g>
                    </svg>

                    {/* Gold Rosette Seal (Top-Right) matching Image 4 */}
                    <div className="absolute top-16 right-20 z-20">
                      <div className="relative w-20 h-20 flex items-center justify-center">
                        <div className="absolute top-10 -left-1 w-5 h-12 bg-gradient-to-b from-amber-400 to-amber-600 [clip-path:polygon(0_0,100%_0,100%_100%,50%_75%,0_100%)] rotate-12" />
                        <div className="absolute top-10 -right-1 w-5 h-12 bg-gradient-to-b from-amber-400 to-amber-600 [clip-path:polygon(0_0,100%_0,100%_100%,50%_75%,0_100%)] -rotate-12" />
                        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-600 via-amber-200 to-yellow-500 p-0.5 flex items-center justify-center shadow-xl border-2 border-amber-300">
                          <div className="w-full h-full rounded-full border border-amber-700/40 flex items-center justify-center bg-gradient-to-br from-amber-300 via-yellow-200 to-amber-400">
                            <Award className="w-7 h-7 text-amber-900" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="z-10 text-center space-y-3.5 max-w-xl mx-auto pt-4">
                      <div className="space-y-1">
                        <h1 className={`${getTitleFontSize(displayTitle)} font-serif font-black tracking-widest text-slate-900 uppercase leading-tight`}>
                          {displayTitle}
                        </h1>
                        <p className={`${getSubtitleFontSize(displaySubtitle)} font-sans font-bold text-slate-700 tracking-[0.2em] uppercase`}>
                          {displaySubtitle}
                        </p>
                      </div>

                      <p className="text-xs font-serif text-slate-600 pt-1 line-clamp-1">
                        {displayPresentation}
                      </p>

                      {/* Recipient Name with dynamic scaling & adaptive underline */}
                      <div className="py-1.5 inline-block max-w-xl mx-auto w-full">
                        <h2
                          className={`${getRecipientFontSize(displayRecipient)} text-[#b8860b] leading-tight px-4 break-words`}
                          style={{ fontFamily: getRecipientFontFamily() }}
                        >
                          {displayRecipient}
                        </h2>
                        <div
                          className="mx-auto h-[1.5px] bg-slate-900 mt-2 transition-all duration-200"
                          style={{ width: `${Math.min(460, Math.max(200, displayRecipient.length * 10.5))}px` }}
                        />
                      </div>

                      <p className={`${getDescriptionClass(displayDescription)} font-serif text-slate-700 max-w-lg mx-auto px-4 font-normal break-words`}>
                        {displayDescription}
                      </p>
                    </div>

                    {/* 2 Signatures matching Image 4 (Manager & CEO) - 100% on clear white background with zero black overlap */}
                    <div className="z-10 w-full max-w-2xl mx-auto flex justify-between items-end pb-8 px-6">
                      <div className="text-center w-48">
                        <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">{displaySignatory1Title || "Manager"}</p>
                        <div
                          className="text-xl text-[#996515] h-8 flex items-center justify-center font-bold"
                          style={{ fontFamily: "'Alex Brush', 'Great Vibes', cursive" }}
                        >
                          {displaySignatory1Signature || "Claudia Alves"}
                        </div>
                        <div className="w-40 mx-auto h-[1.5px] bg-slate-900 my-1" />
                        <p className="text-xs font-black text-slate-900 tracking-wide">{displaySignatory1Name || "Claudia Alves"}</p>
                      </div>

                      {certData.signatory2Enabled && (
                        <div className="text-center w-48">
                          <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">{displaySignatory2Title || "CEO"}</p>
                          <div
                            className="text-xl text-[#996515] h-8 flex items-center justify-center font-bold"
                            style={{ fontFamily: "'Alex Brush', 'Great Vibes', cursive" }}
                          >
                            {displaySignatory2Signature || "Cia Rodriguez"}
                          </div>
                          <div className="w-40 mx-auto h-[1.5px] bg-slate-900 my-1" />
                          <p className="text-xs font-black text-slate-900 tracking-wide">{displaySignatory2Name || "Cia Rodriguez"}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ============================================================== */}
                {/* THEME 5: REGAL BURGUNDY & GOLDEN SILK (Image 5)                */}
                {/* ============================================================== */}
                {certData.theme === "theme-5" && (
                  <div className="w-full h-full relative p-12 flex flex-col justify-between overflow-hidden bg-[#fffdf9] text-slate-900">
                    {/* SVG Flowing Burgundy Silk & Gold Filigree matching Image 5 on BOTH sides */}
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      viewBox="0 0 920 650"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        {/* Burgundy Silk Gradient */}
                        <linearGradient id="t5BurgundySilk" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#4a0715" />
                          <stop offset="30%" stopColor="#7a0c24" />
                          <stop offset="60%" stopColor="#9e1b32" />
                          <stop offset="85%" stopColor="#6b0f24" />
                          <stop offset="100%" stopColor="#3d0511" />
                        </linearGradient>

                        {/* Silk Shadow Fold Gradient */}
                        <linearGradient id="t5SilkFold" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#2c030c" stopOpacity="0.9" />
                          <stop offset="50%" stopColor="#881337" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#4a0715" stopOpacity="0.9" />
                        </linearGradient>

                        {/* Gold Satin Ribbon Gradient */}
                        <linearGradient id="t5GoldRibbon" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#b48c26" />
                          <stop offset="25%" stopColor="#fef08a" />
                          <stop offset="50%" stopColor="#d4af37" />
                          <stop offset="75%" stopColor="#fef08a" />
                          <stop offset="100%" stopColor="#996515" />
                        </linearGradient>

                        {/* Outer Border Gold Gradient */}
                        <linearGradient id="t5BorderGold" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fef08a" />
                          <stop offset="20%" stopColor="#d4af37" />
                          <stop offset="50%" stopColor="#b48c26" />
                          <stop offset="80%" stopColor="#d4af37" />
                          <stop offset="100%" stopColor="#fef08a" />
                        </linearGradient>
                      </defs>

                      {/* Outer Golden Border Bands matching Image 5 */}
                      <rect x="0" y="0" width="20" height="650" fill="url(#t5BorderGold)" opacity="0.9" />
                      <rect x="900" y="0" width="20" height="650" fill="url(#t5BorderGold)" opacity="0.9" />
                      <rect x="0" y="0" width="920" height="16" fill="url(#t5BorderGold)" opacity="0.8" />
                      <rect x="0" y="634" width="920" height="16" fill="url(#t5BorderGold)" opacity="0.8" />

                      {/* Inner Thin Gold Frame */}
                      <rect x="35" y="28" width="850" height="594" fill="none" stroke="#d4af37" strokeWidth="1.5" />

                      {/* ========================================================== */}
                      {/* 1. TOP-RIGHT BURGUNDY SILK DRAPE (Image 5)                 */}
                      {/* ========================================================== */}
                      {/* Main Burgundy Wave */}
                      <path
                        d="M 690,0 C 760,25 825,95 845,185 C 865,255 885,345 920,440 L 920,0 Z"
                        fill="url(#t5BurgundySilk)"
                      />
                      {/* Fold Layer 1 (Darker Ripple) */}
                      <path
                        d="M 740,0 C 795,45 845,130 865,225 C 880,290 895,350 920,400 L 920,0 Z"
                        fill="url(#t5SilkFold)"
                        opacity="0.85"
                      />
                      {/* Fold Layer 2 (Rich Crimson Fold) */}
                      <path
                        d="M 780,0 C 830,60 870,150 885,250 C 895,305 905,355 920,370 L 920,0 Z"
                        fill="#7a0c24"
                        opacity="0.9"
                      />
                      {/* Outer Gold Satin Ribbon */}
                      <path
                        d="M 685,0 C 755,25 820,95 840,185 C 860,255 880,345 920,445"
                        fill="none"
                        stroke="url(#t5GoldRibbon)"
                        strokeWidth="5.5"
                        strokeLinecap="round"
                      />
                      {/* Inner Gold Pinstripe */}
                      <path
                        d="M 680,0 C 750,25 815,95 835,185 C 855,255 875,345 920,452"
                        fill="none"
                        stroke="#fef08a"
                        strokeWidth="1.5"
                      />

                      {/* ========================================================== */}
                      {/* 2. BOTTOM-LEFT BURGUNDY SILK DRAPE (Image 5) - DIAGONAL PAIR*/}
                      {/* ========================================================== */}
                      {/* Main Burgundy Wave */}
                      <path
                        d="M 0,210 C 25,290 95,360 80,455 C 65,530 130,615 230,650 L 0,650 Z"
                        fill="url(#t5BurgundySilk)"
                      />
                      {/* Fold Layer 1 (Darker Ripple) */}
                      <path
                        d="M 0,270 C 35,340 75,415 65,500 C 55,560 100,625 180,650 L 0,650 Z"
                        fill="url(#t5SilkFold)"
                        opacity="0.85"
                      />
                      {/* Fold Layer 2 (Rich Crimson Fold) */}
                      <path
                        d="M 0,330 C 25,390 55,465 45,540 C 40,585 75,635 140,650 L 0,650 Z"
                        fill="#7a0c24"
                        opacity="0.9"
                      />
                      {/* Outer Gold Satin Ribbon */}
                      <path
                        d="M 0,205 C 25,285 95,355 80,450 C 65,525 130,610 235,650"
                        fill="none"
                        stroke="url(#t5GoldRibbon)"
                        strokeWidth="5.5"
                        strokeLinecap="round"
                      />
                      {/* Inner Gold Pinstripe */}
                      <path
                        d="M 0,200 C 25,280 95,350 80,445 C 65,520 130,605 242,650"
                        fill="none"
                        stroke="#fef08a"
                        strokeWidth="1.5"
                      />

                      {/* ========================================================== */}
                      {/* 3. TOP-LEFT GOLD BAROQUE FILIGREE (Image 5)                */}
                      {/* ========================================================== */}
                      <g stroke="#c59b27" fill="none" strokeWidth="1.6" strokeLinecap="round">
                        <path d="M 40,32 Q 65,32 80,50 Q 95,68 115,70" />
                        <path d="M 36,38 Q 36,65 54,80 Q 72,95 74,115" />
                        <circle cx="85" cy="55" r="9" strokeWidth="1.4" />
                        <circle cx="55" cy="85" r="9" strokeWidth="1.4" />
                        <circle cx="120" cy="72" r="5" fill="#d4af37" />
                        <circle cx="72" cy="120" r="5" fill="#d4af37" />
                        <path d="M 95,48 Q 110,40 125,52 Q 112,65 95,48 Z" fill="#d4af37" strokeWidth="1" />
                        <path d="M 48,95 Q 40,110 52,125 Q 65,112 48,95 Z" fill="#d4af37" strokeWidth="1" />
                        <path d="M 68,68 Q 85,85 100,100" strokeWidth="1.2" />
                      </g>

                      {/* ========================================================== */}
                      {/* 4. BOTTOM-RIGHT GOLD BAROQUE FILIGREE (Image 5)            */}
                      {/* ========================================================== */}
                      <g stroke="#c59b27" fill="none" strokeWidth="1.6" strokeLinecap="round">
                        <path d="M 880,618 Q 855,618 840,600 Q 825,582 805,580" />
                        <path d="M 884,612 Q 884,585 866,570 Q 848,555 846,535" />
                        <circle cx="835" cy="595" r="9" strokeWidth="1.4" />
                        <circle cx="865" cy="565" r="9" strokeWidth="1.4" />
                        <circle cx="800" cy="578" r="5" fill="#d4af37" />
                        <circle cx="848" cy="530" r="5" fill="#d4af37" />
                        <path d="M 825,602 Q 810,610 795,598 Q 808,585 825,602 Z" fill="#d4af37" strokeWidth="1" />
                        <path d="M 872,555 Q 880,540 868,525 Q 855,538 872,555 Z" fill="#d4af37" strokeWidth="1" />
                        <path d="M 852,582 Q 835,565 820,550" strokeWidth="1.2" />
                      </g>
                    </svg>

                    {/* Content Section */}
                    <div className="z-10 text-center space-y-3.5 max-w-xl mx-auto pt-4">
                      <div className="space-y-1">
                        <h1 className={`${getTitleFontSize(displayTitle)} font-serif font-black tracking-[0.15em] text-[#6b0f24] uppercase leading-tight`}>
                          {displayTitle}
                        </h1>
                        <div className="flex items-center justify-center gap-3 pt-1">
                          <div className="w-16 h-[1.5px] bg-[#d4af37]" />
                          <span className="text-[#d4af37] text-xs">◆</span>
                          <p className={`${getSubtitleFontSize(displaySubtitle)} font-serif font-black text-[#6b0f24] tracking-[0.2em] uppercase`}>
                            {displaySubtitle}
                          </p>
                          <span className="text-[#d4af37] text-xs">◆</span>
                          <div className="w-16 h-[1.5px] bg-[#d4af37]" />
                        </div>
                      </div>

                      <p className="text-xs font-serif italic text-slate-600 pt-1 line-clamp-1">
                        {displayPresentation}
                      </p>

                      {/* Recipient Name in Royal Burgundy Calligraphy with dynamic scaling & adaptive underline */}
                      <div className="py-1.5 inline-block max-w-xl mx-auto w-full">
                        <h2
                          className={`${getRecipientFontSize(displayRecipient)} text-[#6b0f24] leading-tight px-4 break-words`}
                          style={{ fontFamily: getRecipientFontFamily() }}
                        >
                          {displayRecipient}
                        </h2>
                        <div
                          className="mx-auto h-[1.5px] bg-[#6b0f24] mt-2 transition-all duration-200"
                          style={{ width: `${Math.min(460, Math.max(200, displayRecipient.length * 10.5))}px` }}
                        />
                      </div>

                      <p className={`${getDescriptionClass(displayDescription)} font-serif text-slate-700 max-w-lg mx-auto italic px-4 break-words`}>
                        {displayDescription}
                      </p>
                    </div>

                    {/* Bottom Area: 2 Signatures + Center Red Ribbon Medal matching Image 5 */}
                    <div className="z-10 w-full max-w-2xl mx-auto flex justify-between items-end pb-8 px-6 relative">
                      {/* Left Signatory */}
                      <div className="text-center w-48">
                        <div className="w-full h-[1.5px] bg-slate-800 mb-2" />
                        <p className="text-xs font-serif font-black text-slate-900 tracking-wider">
                          {displaySignatory1Name}
                        </p>
                        <p className="text-[10px] font-serif text-slate-600">{displaySignatory1Title}</p>
                      </div>

                      {/* Center Gold & Crimson Ribbon Medal */}
                      <div className="absolute left-1/2 -translate-x-1/2 -top-4 flex flex-col items-center">
                        <div className="relative w-16 h-16 flex items-center justify-center">
                          <div className="absolute top-9 -left-1 w-4 h-10 bg-gradient-to-b from-red-700 to-red-900 [clip-path:polygon(0_0,100%_0,100%_100%,50%_75%,0_100%)] rotate-12" />
                          <div className="absolute top-9 -right-1 w-4 h-10 bg-gradient-to-b from-red-700 to-red-900 [clip-path:polygon(0_0,100%_0,100%_100%,50%_75%,0_100%)] -rotate-12" />
                          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-600 via-amber-200 to-yellow-500 p-0.5 shadow-md flex items-center justify-center">
                            <div className="w-full h-full rounded-full border border-amber-700/40 flex items-center justify-center bg-gradient-to-br from-amber-300 to-amber-500">
                              <Award className="w-6 h-6 text-amber-900" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Signatory */}
                      {certData.signatory2Enabled && (
                        <div className="text-center w-48">
                          <div className="w-full h-[1.5px] bg-slate-800 mb-2" />
                          <p className="text-xs font-serif font-black text-slate-900 tracking-wider">
                            {displaySignatory2Name}
                          </p>
                          <p className="text-[10px] font-serif text-slate-600">{displaySignatory2Title}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

          {/* DOWNLOAD & EXPORT OPTIONS UNDER THE PREVIEW (matching Cover Page Maker) */}
          <div className="w-full mt-4 space-y-2.5 print:hidden">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isExporting}
                className="sm:col-span-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 disabled:opacity-75 disabled:cursor-wait text-white font-black text-xs sm:text-sm shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{language === "bn" ? "প্রসেসিং..." : "Exporting..."}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={isExporting}
                className="sm:col-span-1 py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <FileCheck className="w-4 h-4" />
                <span>Download PNG (HD)</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="sm:col-span-1 py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                title="Open browser print / Save as PDF view"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save as PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
