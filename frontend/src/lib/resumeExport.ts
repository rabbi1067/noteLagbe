import { jsPDF } from "jspdf";
import JSZip from "jszip";
import {
  ResumeData,
  ResumeDesignConfig,
  ResumeSectionKey,
} from "./resumeTypes";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return [r || 29, g || 78, b || 216];
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return [
      Number.isNaN(r) ? 29 : r,
      Number.isNaN(g) ? 78 : g,
      Number.isNaN(b) ? 216 : b,
    ];
  }
  return [29, 78, 216];
}

function getVisibleSections(design: ResumeDesignConfig): ResumeSectionKey[] {
  const hidden = new Set(design.hiddenSections);
  return design.sectionOrder.filter((s) => !hidden.has(s));
}

function sectionHasContent(
  key: ResumeSectionKey,
  data: ResumeData
): boolean {
  switch (key) {
    case "summary":
      return Boolean(data.summary.trim());
    case "education":
      return data.education.some((e) => e.institution.trim() || e.degree.trim());
    case "skills":
      return data.skills.some((s) => s.category.trim() || s.items.trim());
    case "projects":
      return data.projects.some((p) => p.name.trim() || p.description.trim());
    case "experience":
      return data.experience.some(
        (e) => e.role.trim() || e.organization.trim() || e.bullets.some((b) => b.trim())
      );
    case "achievements":
      return data.achievements.some((a) => a.trim());
    case "certifications":
      return data.certifications.some((c) => c.trim());
    case "languages":
      return data.languages.some((l) => l.name.trim());
    case "references":
      return data.referencesOnRequest || data.references.some((r) => r.name.trim());
  }
}

async function preparePhotoDataUrl(
  src: string,
  shape: "circle" | "rounded"
): Promise<{ dataUrl: string; bytes: Uint8Array } | null> {
  if (!src) return null;
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Photo decode failed"));
      i.src = src;
    });

    const size = 320;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    if (shape === "circle") {
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    } else {
      const r = 24;
      ctx.moveTo(r, 0);
      ctx.lineTo(size - r, 0);
      ctx.quadraticCurveTo(size, 0, size, r);
      ctx.lineTo(size, size - r);
      ctx.quadraticCurveTo(size, size, size - r, size);
      ctx.lineTo(r, size);
      ctx.quadraticCurveTo(0, size, 0, size - r);
      ctx.lineTo(0, r);
      ctx.quadraticCurveTo(0, 0, r, 0);
    }
    ctx.closePath();
    ctx.clip();

    // Center-crop square cover
    const iw = img.naturalWidth || size;
    const ih = img.naturalHeight || size;
    const minSide = Math.min(iw, ih);
    const sx = (iw - minSide) / 2;
    const sy = (ih - minSide) / 2;
    ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
    ctx.restore();

    const dataUrl = canvas.toDataURL("image/png");
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject()), "image/png");
    });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return { dataUrl, bytes };
  } catch {
    return null;
  }
}

interface PdfRenderMetrics {
  overflow: boolean;
  finalY: number;
}

function drawPdfSingleOrSidebar(
  doc: jsPDF,
  data: ResumeData,
  design: ResumeDesignConfig,
  scale: number,
  photoDataUrl: string | null,
  dryRun: boolean
): PdfRenderMetrics {
  const fontFamily =
    design.font === "serif" && design.template === "latex-ats"
      ? "times"
      : design.font === "serif" && design.template !== "modern-sidebar"
      ? "times"
      : "helvetica";

  const densityFactor = design.density === "compact" ? 0.94 : 1.03;
  const fScale = scale * densityFactor;
  const [ar, ag, ab] = hexToRgb(design.accentColor);
  const sections = getVisibleSections(design).filter((k) =>
    sectionHasContent(k, data)
  );

  const setFont = (style: "normal" | "bold" | "italic" | "bolditalic", sizePt: number) => {
    doc.setFont(fontFamily, style);
    doc.setFontSize(sizePt * fScale);
  };

  const lineH = (pt: number) => pt * fScale * 0.42;

  const drawWrapped = (
    text: string,
    x: number,
    y: number,
    maxW: number,
    pt: number,
    style: "normal" | "bold" | "italic" = "normal",
    color: [number, number, number] = [30, 41, 59],
    align: "left" | "center" | "right" = "left"
  ): number => {
    const clean = text.trim();
    if (!clean) return y;
    setFont(style, pt);
    // Keep text pure black on light backgrounds; allow pure white only on dark accent panels
    if (color[0] >= 240 && color[1] >= 240 && color[2] >= 240) {
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setTextColor(0, 0, 0);
    }
    const lines = doc.splitTextToSize(clean, maxW) as string[];
    const step = lineH(pt);
    for (const line of lines) {
      if (!dryRun) {
        doc.text(line, x, y, { align });
      }
      y += step;
    }
    return y;
  };

  // ==================== MODERN SIDEBAR & EUROPE MINIMAL ====================
  if (design.template === "modern-sidebar" || design.template === "europe-minimal") {
    const isSidebar = design.template === "modern-sidebar";
    const sidebarW = isSidebar ? 72 : 70;
    const leftX = isSidebar ? 9 : 12;
    const leftMaxW = sidebarW - (isSidebar ? 18 : 18);
    const rightX = isSidebar ? sidebarW + 9 : sidebarW + 10;
    const rightMaxW = A4_WIDTH_MM - rightX - 12;

    if (isSidebar && !dryRun) {
      // Full-height accent sidebar background card
      doc.setFillColor(ar, ag, ab);
      doc.rect(6, 26, sidebarW - 6, A4_HEIGHT_MM - 32, "F");
    } else if (!isSidebar && !dryRun) {
      // Vertical hairline separator below header
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(sidebarW + 4, 51, sidebarW + 4, A4_HEIGHT_MM - 10);
    }

    let leftY = isSidebar ? 14 : 15;
    let rightY = 18;

    // Photo at top-left
    if (design.showPhoto && photoDataUrl) {
      if (!dryRun) {
        if (isSidebar) {
          doc.setFillColor(255, 255, 255);
          doc.circle(6 + (sidebarW - 6) / 2, 28, 17, "F");
        }
        const photoSize = 31;
        const px = isSidebar
          ? 6 + (sidebarW - 6) / 2 - photoSize / 2
          : leftX + 6;
        const py = isSidebar ? 28 - photoSize / 2 : 12;
        doc.addImage(photoDataUrl, "PNG", px, py, photoSize, photoSize);
      }
      leftY = isSidebar ? 50 : 48;
    } else {
      leftY = isSidebar ? 34 : 16;
    }

    // Header on right
    const nameStr = (data.fullName || "YOUR NAME").toUpperCase();
    rightY = drawWrapped(
      nameStr,
      rightX,
      rightY,
      rightMaxW,
      19,
      "bold",
      isSidebar ? [ar, ag, ab] : [15, 23, 42]
    );
    if (data.headline.trim()) {
      rightY += 0.5;
      rightY = drawWrapped(
        data.headline,
        rightX,
        rightY,
        rightMaxW,
        9.5,
        "normal",
        [71, 85, 105]
      );
    }
    if (!isSidebar) {
      const topContacts = [data.phone, data.email, data.address]
        .filter((x) => x.trim())
        .join("  |  ");
      if (topContacts) {
        rightY += 1;
        rightY = drawWrapped(topContacts, rightX, rightY, rightMaxW, 8, "normal", [71, 85, 105]);
      }
      const topLinks = [data.linkedin, data.github, data.portfolio]
        .filter((x) => x.trim())
        .join("  |  ");
      if (topLinks) {
        rightY = drawWrapped(topLinks, rightX, rightY, rightMaxW, 7.6, "normal", [ar, ag, ab]);
      }
      rightY = Math.max(rightY + 4, 50);
      leftY = Math.max(leftY + 2, 50);
      if (!dryRun) {
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(12, 47.5, A4_WIDTH_MM - 12, 47.5);
      }
    } else {
      rightY = Math.max(rightY + 5, 42);
    }

    const leftTextColor: [number, number, number] = isSidebar
      ? [241, 245, 249]
      : [51, 65, 85];

    const drawLeftHeading = (title: string) => {
      leftY += 2.2;
      if (isSidebar && !dryRun) {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(leftX, leftY - 3.8, leftMaxW, 5.2, 2.5, 2.5, "F");
        setFont("bold", 8.2);
        doc.setTextColor(0, 0, 0);
        doc.text(title.toUpperCase(), leftX + leftMaxW / 2, leftY - 0.3, { align: "center" });
        leftY += 3.8;
      } else {
        setFont("bold", 9);
        doc.setTextColor(0, 0, 0);
        if (!dryRun) {
          doc.text(title.toUpperCase(), leftX, leftY);
          doc.setDrawColor(ar, ag, ab);
          doc.setLineWidth(0.35);
          doc.line(leftX, leftY + 1.2, leftX + leftMaxW, leftY + 1.2);
        }
        leftY += 4.5;
      }
    };

    const drawRightHeading = (title: string) => {
      rightY += 2.5;
      if (isSidebar && !dryRun) {
        doc.setFillColor(ar, ag, ab);
        doc.roundedRect(rightX, rightY - 3.8, Math.min(48, rightMaxW), 5.3, 2.5, 2.5, "F");
        setFont("bold", 8.5);
        doc.setTextColor(255, 255, 255);
        doc.text(title.toUpperCase(), rightX + 3.5, rightY - 0.2);
        rightY += 4.2;
      } else {
        setFont("bold", 9.5);
        doc.setTextColor(0, 0, 0);
        if (!dryRun) {
          doc.text(title.toUpperCase(), rightX, rightY);
          doc.setDrawColor(148, 163, 184);
          doc.setLineWidth(0.35);
          doc.line(rightX, rightY + 1.3, rightX + rightMaxW, rightY + 1.3);
        }
        rightY += 4.8;
      }
    };

    // Left column content
    if (isSidebar) {
      drawLeftHeading("Contact");
      const contactLines = [
        data.phone,
        data.email,
        data.address,
        data.linkedin,
        data.github,
        data.portfolio,
      ].filter((x) => x.trim());
      for (const cl of contactLines) {
        leftY = drawWrapped(cl, leftX, leftY, leftMaxW, 7.8, "normal", leftTextColor);
        leftY += 0.6;
      }
    } else {
      if (sections.includes("summary")) {
        drawLeftHeading("Summary");
        leftY = drawWrapped(data.summary, leftX, leftY, leftMaxW, 8, "normal", leftTextColor);
        leftY += 1.5;
      }
      if (sections.includes("education")) {
        drawLeftHeading("Education");
        for (const edu of data.education) {
          if (!edu.institution && !edu.degree) continue;
          leftY = drawWrapped(edu.degree || edu.institution, leftX, leftY, leftMaxW, 8.2, "bold", [15, 23, 42]);
          if (edu.degree && edu.institution) {
            leftY = drawWrapped(edu.institution, leftX, leftY, leftMaxW, 7.8, "normal", leftTextColor);
          }
          const sub = [edu.period, design.showCgpa && edu.cgpa ? `CGPA: ${edu.cgpa}` : ""]
            .filter(Boolean)
            .join(" • ");
          if (sub) leftY = drawWrapped(sub, leftX, leftY, leftMaxW, 7.4, "italic", [100, 116, 139]);
          leftY += 1.5;
        }
      }
    }

    if (sections.includes("skills")) {
      drawLeftHeading("Skills");
      for (const sk of data.skills) {
        const line = sk.category ? `${sk.category}: ${sk.items}` : sk.items;
        if (!line.trim()) continue;
        leftY = drawWrapped(`• ${line}`, leftX, leftY, leftMaxW, 7.8, "normal", leftTextColor);
        leftY += 0.5;
      }
    }

    if (sections.includes("languages")) {
      drawLeftHeading("Languages");
      for (const lang of data.languages) {
        if (!lang.name.trim()) continue;
        const txt = lang.proficiency ? `• ${lang.name} (${lang.proficiency})` : `• ${lang.name}`;
        leftY = drawWrapped(txt, leftX, leftY, leftMaxW, 7.8, "normal", leftTextColor);
        leftY += 0.4;
      }
    }

    if (!isSidebar && (data.dateOfBirth.trim() || data.nationality.trim() || data.competitiveProfile.trim())) {
      drawLeftHeading("Personal Info");
      if (data.dateOfBirth.trim()) {
        leftY = drawWrapped(`DOB: ${data.dateOfBirth}`, leftX, leftY, leftMaxW, 7.7, "normal", leftTextColor);
      }
      if (data.nationality.trim()) {
        leftY = drawWrapped(`Nationality: ${data.nationality}`, leftX, leftY, leftMaxW, 7.7, "normal", leftTextColor);
      }
      if (data.competitiveProfile.trim()) {
        leftY = drawWrapped(`Profile: ${data.competitiveProfile}`, leftX, leftY, leftMaxW, 7.5, "normal", leftTextColor);
      }
    }

    if (isSidebar && sections.includes("references")) {
      drawLeftHeading("References");
      if (data.referencesOnRequest || data.references.length === 0) {
        leftY = drawWrapped("Available upon request.", leftX, leftY, leftMaxW, 7.8, "normal", leftTextColor);
      } else {
        for (const ref of data.references) {
          if (!ref.name.trim()) continue;
          leftY = drawWrapped(ref.name, leftX, leftY, leftMaxW, 8, "bold", [255, 255, 255]);
          const orgLine = [ref.title, ref.organization].filter((x) => x.trim()).join(", ");
          if (orgLine) leftY = drawWrapped(orgLine, leftX, leftY, leftMaxW, 7.4, "normal", leftTextColor);
          if (ref.phone) leftY = drawWrapped(`Phone: ${ref.phone}`, leftX, leftY, leftMaxW, 7.2, "normal", leftTextColor);
          if (ref.email) leftY = drawWrapped(`Email: ${ref.email}`, leftX, leftY, leftMaxW, 7.2, "normal", leftTextColor);
          leftY += 1.4;
        }
      }
    }

    // Right column sections
    const leftOnly = new Set<ResumeSectionKey>(
      isSidebar
        ? ["skills", "languages", "references"]
        : ["summary", "education", "skills", "languages"]
    );

    for (const sec of sections) {
      if (leftOnly.has(sec)) continue;
      if (sec === "summary") {
        drawRightHeading("About Me");
        rightY = drawWrapped(data.summary, rightX, rightY, rightMaxW, 8.3, "normal", [51, 65, 85]);
        rightY += 1.5;
      } else if (sec === "experience") {
        drawRightHeading("Experience");
        for (const exp of data.experience) {
          if (!exp.role && !exp.organization) continue;
          setFont("bold", 8.8);
          doc.setTextColor(0, 0, 0);
          if (!dryRun) doc.text(exp.role || exp.organization, rightX, rightY);
          if (exp.period && !dryRun) {
            setFont("normal", 8);
            doc.setTextColor(0, 0, 0);
            doc.text(exp.period, A4_WIDTH_MM - 12, rightY, { align: "right" });
          }
          rightY += lineH(8.8);
          if (exp.role && exp.organization) {
            rightY = drawWrapped(exp.organization, rightX, rightY, rightMaxW, 8, "italic", [0, 0, 0]);
          }
          for (const b of exp.bullets) {
            if (!b.trim()) continue;
            rightY = drawWrapped(`• ${b}`, rightX + 2, rightY, rightMaxW - 2, 7.9, "normal", [0, 0, 0]);
          }
          rightY += 1.5;
        }
      } else if (sec === "projects") {
        drawRightHeading("Projects");
        for (const pr of data.projects) {
          if (!pr.name) continue;
          const header = pr.techStack ? `${pr.name} — ${pr.techStack}` : pr.name;
          rightY = drawWrapped(header, rightX, rightY, rightMaxW, 8.5, "bold", [0, 0, 0]);
          if (pr.description) {
            rightY = drawWrapped(`• ${pr.description}`, rightX + 2, rightY, rightMaxW - 2, 7.9, "normal", [0, 0, 0]);
          }
          if (!isSidebar && pr.link.trim()) {
            rightY = drawWrapped(pr.link, rightX + 2, rightY, rightMaxW - 2, 7.4, "normal", [0, 0, 0]);
          }
          rightY += 1.2;
        }
      } else if (sec === "education") {
        drawRightHeading("Education");
        for (const edu of data.education) {
          if (!edu.institution && !edu.degree) continue;
          setFont("bold", 8.6);
          doc.setTextColor(0, 0, 0);
          if (!dryRun) doc.text(edu.institution, rightX, rightY);
          if (edu.period && !dryRun) {
            setFont("normal", 7.8);
            doc.setTextColor(0, 0, 0);
            doc.text(edu.period, A4_WIDTH_MM - 12, rightY, { align: "right" });
          }
          rightY += lineH(8.6);
          const deg = [edu.degree, design.showCgpa && edu.cgpa ? `CGPA: ${edu.cgpa}` : ""]
            .filter(Boolean)
            .join(" • ");
          if (deg) rightY = drawWrapped(deg, rightX, rightY, rightMaxW, 8, "normal", [71, 85, 105]);
          rightY += 1.2;
        }
      } else if (sec === "achievements") {
        drawRightHeading("Achievements");
        for (const ach of data.achievements) {
          if (ach.trim()) rightY = drawWrapped(`• ${ach}`, rightX + 1, rightY, rightMaxW - 1, 7.9, "normal", [51, 65, 85]);
        }
      } else if (sec === "certifications") {
        drawRightHeading("Certifications");
        for (const cert of data.certifications) {
          if (cert.trim()) rightY = drawWrapped(`• ${cert}`, rightX + 1, rightY, rightMaxW - 1, 7.9, "normal", [51, 65, 85]);
        }
      } else if (sec === "references") {
        drawRightHeading("References");
        if (data.referencesOnRequest || data.references.length === 0) {
          rightY = drawWrapped("Available upon request.", rightX, rightY, rightMaxW, 8, "normal", [51, 65, 85]);
        } else if (!isSidebar && data.references.filter((r) => r.name.trim()).length >= 2) {
          const validRefs = data.references.filter((r) => r.name.trim());
          const colW = (rightMaxW - 5) / 2;
          for (let idx = 0; idx < validRefs.length; idx += 2) {
            const pair = validRefs.slice(idx, idx + 2);
            const rowStartY = rightY;
            let maxPairY = rightY;
            pair.forEach((ref, colIdx) => {
              const rx = rightX + colIdx * (colW + 5);
              let ry = rowStartY;
              ry = drawWrapped(ref.name, rx, ry, colW, 8.3, "bold", [15, 23, 42]);
              const roleOrg = [ref.title, ref.organization].filter((x) => x.trim()).join(", ");
              if (roleOrg) ry = drawWrapped(roleOrg, rx, ry, colW, 7.6, "normal", [71, 85, 105]);
              if (ref.phone) ry = drawWrapped(`Phone: ${ref.phone}`, rx, ry, colW, 7.5, "normal", [71, 85, 105]);
              if (ref.email) ry = drawWrapped(`Email: ${ref.email}`, rx, ry, colW, 7.5, "normal", [71, 85, 105]);
              if (ry > maxPairY) maxPairY = ry;
            });
            rightY = maxPairY + 1.5;
          }
        } else {
          for (const ref of data.references) {
            if (!ref.name.trim()) continue;
            rightY = drawWrapped(ref.name, rightX, rightY, rightMaxW, 8.4, "bold", [15, 23, 42]);
            const det = [ref.title, ref.organization, ref.phone, ref.email]
              .filter((x) => x.trim())
              .join(" • ");
            if (det) rightY = drawWrapped(det, rightX, rightY, rightMaxW, 7.8, "normal", [71, 85, 105]);
            rightY += 1;
          }
        }
      }
    }

    const finalY = Math.max(leftY, rightY);
    return { overflow: finalY > A4_HEIGHT_MM - 8, finalY };
  }

  // ==================== GERMAN LEBENSLAUF ====================
  if (design.template === "german-lebenslauf") {
    const marginX = 14;
    const labelW = 46;
    const contentX = marginX + labelW + 4;
    const contentW = A4_WIDTH_MM - contentX - marginX;
    let y = 16;

    // Header: Left details + Right photo box
    const headerMaxW = design.showPhoto && photoDataUrl ? A4_WIDTH_MM - marginX * 2 - 34 : A4_WIDTH_MM - marginX * 2;
    let headY = y;
    if (!dryRun) {
      setFont("bold", 9);
      doc.setTextColor(0, 0, 0);
      doc.text("LEBENSLAUF  •  CURRICULUM VITAE", marginX, headY);
    }
    headY += 5.5;
    headY = drawWrapped(data.fullName || "YOUR NAME", marginX, headY, headerMaxW, 18, "bold", [15, 23, 42]);
    if (data.headline.trim()) {
      headY = drawWrapped(data.headline, marginX, headY, headerMaxW, 9.5, "normal", [71, 85, 105]);
    }
    const gContacts = [data.address, data.phone, data.email]
      .filter((x) => x.trim())
      .join("  |  ");
    if (gContacts) headY = drawWrapped(gContacts, marginX, headY, headerMaxW, 8.2, "normal", [51, 65, 85]);
    const gLinks = [data.linkedin, data.github, data.portfolio]
      .filter((x) => x.trim())
      .join("  |  ");
    if (gLinks) headY = drawWrapped(gLinks, marginX, headY, headerMaxW, 8, "normal", [ar, ag, ab]);

    if (design.showPhoto && photoDataUrl) {
      if (!dryRun) {
        doc.addImage(photoDataUrl, "PNG", A4_WIDTH_MM - marginX - 28, y - 2, 28, 28);
        doc.setDrawColor(ar, ag, ab);
        doc.setLineWidth(0.4);
        doc.rect(A4_WIDTH_MM - marginX - 28, y - 2, 28, 28);
      }
      y = Math.max(headY + 3, y + 30);
    } else {
      y = headY + 3;
    }

    if (!dryRun) {
      doc.setDrawColor(ar, ag, ab);
      doc.setLineWidth(0.6);
      doc.line(marginX, y, A4_WIDTH_MM - marginX, y);
    }
    y += 5;

    const drawGermanHeading = (title: string) => {
      y += 2;
      setFont("bold", 9.5);
      doc.setTextColor(0, 0, 0);
      if (!dryRun) {
        doc.text(title.toUpperCase(), marginX, y);
        doc.setDrawColor(ar, ag, ab);
        doc.setLineWidth(0.35);
        doc.line(marginX, y + 1.2, A4_WIDTH_MM - marginX, y + 1.2);
      }
      y += 5;
    };

    const drawGermanRow = (leftLabel: string, rightText: string, rightSub?: string, bullets?: string[]) => {
      const startY = y;
      const ly = drawWrapped(leftLabel, marginX, startY, labelW, 8.2, "bold", [71, 85, 105]);
      let ry = drawWrapped(rightText, contentX, startY, contentW, 8.8, "bold", [15, 23, 42]);
      if (rightSub) {
        ry = drawWrapped(rightSub, contentX, ry, contentW, 8.1, "normal", [71, 85, 105]);
      }
      if (bullets) {
        for (const b of bullets) {
          if (b.trim()) {
            ry = drawWrapped(`• ${b}`, contentX + 1.5, ry, contentW - 1.5, 8, "normal", [51, 65, 85]);
          }
        }
      }
      y = Math.max(ly, ry) + 1.6;
    };

    // Personal Details block (German Lebenslauf signature feature)
    if (data.dateOfBirth.trim() || data.nationality.trim()) {
      drawGermanHeading("Personal Information / Persönliche Daten");
      if (data.dateOfBirth.trim()) drawGermanRow("Date of Birth", data.dateOfBirth);
      if (data.nationality.trim()) drawGermanRow("Nationality", data.nationality);
    }

    for (const sec of sections) {
      if (sec === "summary") {
        drawGermanHeading("Profile Summary");
        y = drawWrapped(data.summary, marginX, y, A4_WIDTH_MM - marginX * 2, 8.3, "normal", [51, 65, 85]);
        y += 1.5;
      } else if (sec === "experience") {
        drawGermanHeading("Work & Practical Experience");
        for (const exp of data.experience) {
          if (!exp.role && !exp.organization) continue;
          drawGermanRow(exp.period || "—", exp.role || exp.organization, exp.role ? exp.organization : "", exp.bullets);
        }
      } else if (sec === "education") {
        drawGermanHeading("Education");
        for (const edu of data.education) {
          if (!edu.institution && !edu.degree) continue;
          const degLine = [edu.degree, design.showCgpa && edu.cgpa ? `Grade/CGPA: ${edu.cgpa}` : ""]
            .filter(Boolean)
            .join(" • ");
          drawGermanRow(edu.period || "—", edu.institution, degLine);
        }
      } else if (sec === "projects") {
        drawGermanHeading("Academic & Software Projects");
        for (const pr of data.projects) {
          if (!pr.name) continue;
          drawGermanRow(pr.techStack || "Project", pr.name, pr.description);
        }
      } else if (sec === "skills") {
        drawGermanHeading("Technical & Core Skills");
        for (const sk of data.skills) {
          if (!sk.items.trim()) continue;
          drawGermanRow(sk.category || "Skills", sk.items);
        }
      } else if (sec === "languages") {
        drawGermanHeading("Language Proficiency");
        const langLine = data.languages
          .filter((l) => l.name.trim())
          .map((l) => `${l.name}${l.proficiency ? ` (${l.proficiency})` : ""}`)
          .join("   •   ");
        if (langLine) y = drawWrapped(langLine, marginX, y, A4_WIDTH_MM - marginX * 2, 8.3, "normal", [30, 41, 59]);
        y += 1.5;
      } else if (sec === "achievements") {
        drawGermanHeading("Awards & Achievements");
        for (const a of data.achievements) {
          if (a.trim()) y = drawWrapped(`• ${a}`, marginX + 2, y, A4_WIDTH_MM - marginX * 2 - 2, 8.2, "normal", [51, 65, 85]);
        }
      } else if (sec === "certifications") {
        drawGermanHeading("Certifications");
        for (const c of data.certifications) {
          if (c.trim()) y = drawWrapped(`• ${c}`, marginX + 2, y, A4_WIDTH_MM - marginX * 2 - 2, 8.2, "normal", [51, 65, 85]);
        }
      } else if (sec === "references") {
        drawGermanHeading("References");
        if (data.referencesOnRequest || data.references.length === 0) {
          y = drawWrapped("Available upon request.", marginX, y, A4_WIDTH_MM - marginX * 2, 8.2, "normal", [51, 65, 85]);
        } else {
          for (const ref of data.references) {
            if (!ref.name.trim()) continue;
            const det = [ref.title, ref.organization, ref.phone, ref.email].filter((x) => x.trim()).join(" • ");
            drawGermanRow(ref.name, det || "Reference");
          }
        }
      }
    }

    if (design.showGermanSignature) {
      y += 4;
      if (!dryRun) {
        setFont("italic", 8);
        doc.setTextColor(0, 0, 0);
        doc.text(data.signaturePlaceDate || "Dhaka, Bangladesh", marginX, y);
        doc.setDrawColor(148, 163, 184);
        doc.line(A4_WIDTH_MM - marginX - 48, y - 0.5, A4_WIDTH_MM - marginX, y - 0.5);
        doc.text(data.fullName || "Signature", A4_WIDTH_MM - marginX, y + 3.5, { align: "right" });
      }
      y += 6;
    }

    return { overflow: y > A4_HEIGHT_MM - 8, finalY: y };
  }

  // ==================== LATEX ATS CLASSIC & CORPORATE MINIMAL ====================
  const isLatex = design.template === "latex-ats";
  const marginX = 13;
  const maxW = A4_WIDTH_MM - marginX * 2;
  let y = 14.5;

  if (isLatex) {
    y = drawWrapped(data.fullName || "YOUR NAME", A4_WIDTH_MM / 2, y, maxW, 19.5, "bold", [ar, ag, ab], "center");
    if (data.headline.trim()) {
      y = drawWrapped(data.headline, A4_WIDTH_MM / 2, y + 0.5, maxW, 8.8, "normal", [51, 65, 85], "center");
    }
    const cLine = [data.address, data.phone, data.email].filter((x) => x.trim()).join("  •  ");
    if (cLine) {
      y = drawWrapped(cLine, A4_WIDTH_MM / 2, y + 0.3, maxW, 8.1, "normal", [30, 41, 59], "center");
    }
    const lLine = [data.linkedin, data.github, data.competitiveProfile, data.portfolio]
      .filter((x) => x.trim())
      .join("  |  ");
    if (lLine) {
      y = drawWrapped(lLine, A4_WIDTH_MM / 2, y + 0.2, maxW, 7.9, "normal", [ar, ag, ab], "center");
    }
  } else {
    // Corporate Minimal Header
    const headMaxW = design.showPhoto && photoDataUrl ? maxW - 30 : maxW;
    if (!dryRun) {
      doc.setFillColor(ar, ag, ab);
      doc.rect(marginX, y - 3.5, 2.2, 19, "F");
    }
    let hy = y;
    hy = drawWrapped(data.fullName || "YOUR NAME", marginX + 5, hy, headMaxW - 5, 18.5, "bold", [15, 23, 42]);
    if (data.headline.trim()) {
      hy = drawWrapped(data.headline, marginX + 5, hy, headMaxW - 5, 9.2, "normal", [ar, ag, ab]);
    }
    const allC = [data.phone, data.email, data.address, data.linkedin, data.github]
      .filter((x) => x.trim())
      .join("  •  ");
    if (allC) {
      hy = drawWrapped(allC, marginX + 5, hy + 0.3, headMaxW - 5, 7.9, "normal", [71, 85, 105]);
    }
    if (design.showPhoto && photoDataUrl) {
      if (!dryRun) {
        doc.addImage(photoDataUrl, "PNG", A4_WIDTH_MM - marginX - 23, y - 3, 23, 23);
      }
      y = Math.max(hy + 2, y + 22);
    } else {
      y = hy + 2;
    }
  }

  y += 2;

  const drawClassicHeading = (title: string) => {
    y += 1.6;
    setFont("bold", 9.6);
    doc.setTextColor(0, 0, 0);
    if (!dryRun) {
      doc.text(title.toUpperCase(), marginX, y);
      doc.setDrawColor(ar, ag, ab);
      doc.setLineWidth(0.32);
      doc.line(marginX, y + 1.1, A4_WIDTH_MM - marginX, y + 1.1);
    }
    y += 4.3;
  };

  for (const sec of sections) {
    if (sec === "summary") {
      drawClassicHeading("Summary");
      y = drawWrapped(data.summary, marginX, y, maxW, 8.5, "normal", [0, 0, 0]);
      y += 0.8;
    } else if (sec === "education") {
      drawClassicHeading("Education");
      for (const edu of data.education) {
        if (!edu.institution && !edu.degree) continue;
        setFont("bold", 8.8);
        doc.setTextColor(0, 0, 0);
        if (!dryRun) doc.text(edu.institution, marginX, y);
        if (edu.period && !dryRun) {
          setFont("italic", 8.3);
          doc.setTextColor(0, 0, 0);
          doc.text(edu.period, A4_WIDTH_MM - marginX, y, { align: "right" });
        }
        y += lineH(8.8);
        const sub = [edu.degree, design.showCgpa && edu.cgpa ? `CGPA: ${edu.cgpa}` : ""]
          .filter(Boolean)
          .join("  •  ");
        if (sub) {
          y = drawWrapped(sub, marginX, y, maxW, 8.2, "italic", [51, 65, 85]);
        }
        y += 0.6;
      }
    } else if (sec === "skills") {
      drawClassicHeading("Technical Skills");
      for (const sk of data.skills) {
        if (!sk.items.trim()) continue;
        const line = sk.category.trim() ? `• ${sk.category}: ${sk.items}` : `• ${sk.items}`;
        y = drawWrapped(line, marginX + 2, y, maxW - 2, 8.3, "normal", [30, 41, 59]);
      }
      y += 0.6;
    } else if (sec === "projects") {
      drawClassicHeading("Projects");
      for (const pr of data.projects) {
        if (!pr.name) continue;
        const head = [pr.name, pr.techStack ? `(${pr.techStack})` : "", pr.link ? `• ${pr.link}` : ""]
          .filter(Boolean)
          .join(" ");
        const fullLine = pr.description ? `• ${head} — ${pr.description}` : `• ${head}`;
        y = drawWrapped(fullLine, marginX + 2, y, maxW - 2, 8.3, "normal", [30, 41, 59]);
        y += 0.3;
      }
      y += 0.4;
    } else if (sec === "experience") {
      drawClassicHeading("Experience");
      for (const exp of data.experience) {
        if (!exp.role && !exp.organization) continue;
        setFont("bold", 8.8);
        doc.setTextColor(0, 0, 0);
        if (!dryRun) doc.text(exp.role || exp.organization, marginX, y);
        if (exp.period && !dryRun) {
          setFont("italic", 8.3);
          doc.setTextColor(0, 0, 0);
          doc.text(exp.period, A4_WIDTH_MM - marginX, y, { align: "right" });
        }
        y += lineH(8.8);
        if (exp.role && exp.organization) {
          y = drawWrapped(exp.organization, marginX, y, maxW, 8.2, "italic", [51, 65, 85]);
        }
        for (const b of exp.bullets) {
          if (b.trim()) {
            y = drawWrapped(`• ${b}`, marginX + 3, y, maxW - 3, 8.2, "normal", [30, 41, 59]);
          }
        }
        y += 0.6;
      }
    } else if (sec === "achievements") {
      drawClassicHeading("Achievements");
      for (const ach of data.achievements) {
        if (ach.trim()) {
          y = drawWrapped(`• ${ach}`, marginX + 2, y, maxW - 2, 8.2, "normal", [30, 41, 59]);
        }
      }
      y += 0.4;
    } else if (sec === "certifications") {
      drawClassicHeading("Certifications");
      for (const cert of data.certifications) {
        if (cert.trim()) {
          y = drawWrapped(`• ${cert}`, marginX + 2, y, maxW - 2, 8.2, "normal", [30, 41, 59]);
        }
      }
      y += 0.4;
    } else if (sec === "languages") {
      drawClassicHeading("Languages");
      const lTxt = data.languages
        .filter((l) => l.name.trim())
        .map((l) => (l.proficiency ? `${l.name} (${l.proficiency})` : l.name))
        .join("  •  ");
      if (lTxt) {
        y = drawWrapped(lTxt, marginX, y, maxW, 8.3, "normal", [30, 41, 59]);
      }
      y += 0.4;
    } else if (sec === "references") {
      drawClassicHeading("References");
      if (data.referencesOnRequest || data.references.length === 0) {
        y = drawWrapped("Available upon request.", marginX, y, maxW, 8.3, "normal", [30, 41, 59]);
      } else {
        for (const ref of data.references) {
          if (!ref.name.trim()) continue;
          y = drawWrapped(ref.name, marginX, y, maxW, 8.6, "bold", [15, 23, 42]);
          const det = [ref.title, ref.organization, ref.phone, ref.email]
            .filter((x) => x.trim())
            .join("  •  ");
          if (det) {
            y = drawWrapped(det, marginX, y, maxW, 8.1, "italic", [51, 65, 85]);
          }
        }
      }
    }
  }

  return { overflow: y > A4_HEIGHT_MM - 8, finalY: y };
}

/**
 * Generates an ATS-readable, vector-text, single-page A4 PDF using jsPDF.
 * Automatically steps down scale if content exceeds 1 A4 page height so it
 * strictly produces 1 single page.
 */
export async function generateResumePdfBlob(
  data: ResumeData,
  design: ResumeDesignConfig
): Promise<Blob> {
  const shape = design.template === "german-lebenslauf" ? "rounded" : "circle";
  const photo =
    design.showPhoto && data.photoDataUrl
      ? await preparePhotoDataUrl(data.photoDataUrl, shape)
      : null;

  const scales = [1.0, 0.94, 0.88, 0.82, 0.76];
  let chosenScale = scales[scales.length - 1];

  for (const s of scales) {
    const probe = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const metrics = drawPdfSingleOrSidebar(
      probe,
      data,
      design,
      s,
      photo?.dataUrl || null,
      true
    );
    if (!metrics.overflow) {
      chosenScale = s;
      break;
    }
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  drawPdfSingleOrSidebar(
    doc,
    data,
    design,
    chosenScale,
    photo?.dataUrl || null,
    false
  );

  return doc.output("blob");
}

function xmlEscape(val: string): string {
  return val
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generates an editable Microsoft Word (.docx) file on a single A4 page (11906 x 16838 twips).
 */
export async function generateResumeDocxBlob(
  data: ResumeData,
  design: ResumeDesignConfig
): Promise<Blob> {
  const zip = new JSZip();
  const accentHex = design.accentColor.replace("#", "").toUpperCase() || "1D4ED8";
  const sections = getVisibleSections(design).filter((k) =>
    sectionHasContent(k, data)
  );

  const shape = design.template === "german-lebenslauf" ? "rounded" : "circle";
  const photo =
    design.showPhoto && data.photoDataUrl
      ? await preparePhotoDataUrl(data.photoDataUrl, shape)
      : null;

  const fontFace =
    design.font === "serif" && design.template === "latex-ats"
      ? "Times New Roman"
      : "Calibri";

  const makeRun = (
    text: string,
    opts?: {
      bold?: boolean;
      italic?: boolean;
      sizeHalfPt?: number;
      color?: string;
    }
  ) => {
    const b = opts?.bold ? "<w:b/>" : "";
    const it = opts?.italic ? "<w:i/>" : "";
    const sz = opts?.sizeHalfPt ? `<w:sz w:val="${opts.sizeHalfPt}"/><w:szCs w:val="${opts.sizeHalfPt}"/>` : "<w:sz w:val=\"20\"/><w:szCs w:val=\"20\"/>";
    const col = opts?.color ? `<w:color w:val="${opts.color}"/>` : `<w:color w:val="000000"/>`;
    return `<w:r><w:rPr><w:rFonts w:ascii="${fontFace}" w:hAnsi="${fontFace}"/>${b}${it}${sz}${col}</w:rPr><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`;
  };

  const makePara = (
    runs: string,
    opts?: {
      align?: "left" | "center" | "right";
      spaceAfter?: number;
      spaceBefore?: number;
      bottomBorderHex?: string;
      rightTabPos?: number;
    }
  ) => {
    const jc = opts?.align ? `<w:jc w:val="${opts.align}"/>` : "";
    const bdr = opts?.bottomBorderHex
      ? `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="${opts.bottomBorderHex}"/></w:pBdr>`
      : "";
    const tabs = opts?.rightTabPos
      ? `<w:tabs><w:tab w:val="right" w:pos="${opts.rightTabPos}"/></w:tabs>`
      : "";
    return `<w:p><w:pPr>${jc}${bdr}${tabs}<w:spacing w:before="${opts?.spaceBefore ?? 20}" w:after="${opts?.spaceAfter ?? 40}" w:line="240" w:lineRule="auto"/></w:pPr>${runs}</w:p>`;
  };

  const makeHeading = (title: string, colorHex = accentHex, lightOnDark = false) =>
    makePara(
      makeRun(title.toUpperCase(), {
        bold: true,
        sizeHalfPt: 20,
        color: lightOnDark ? "FFFFFF" : "000000",
      }),
      {
        spaceBefore: 90,
        spaceAfter: 35,
        bottomBorderHex: lightOnDark ? "CBD5E1" : colorHex,
      }
    );

  const imageXml = photo
    ? `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="60"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="914400" cy="914400"/><wp:docPr id="1" name="ProfilePhoto"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="1" name="ProfilePhoto"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdPhoto"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="914400" cy="914400"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`
    : "";

  const renderSectionParagraphs = (sec: ResumeSectionKey, textColor = "000000", subColor = "000000", lightMode = false): string[] => {
    const out: string[] = [];
    const labelMap: Record<ResumeSectionKey, string> = {
      summary: "Summary",
      education: "Education",
      skills: "Technical Skills",
      projects: "Projects",
      experience: "Experience",
      achievements: "Achievements",
      certifications: "Certifications",
      languages: "Languages",
      references: "References",
    };
    out.push(makeHeading(labelMap[sec], accentHex, lightMode));

    if (sec === "summary") {
      out.push(makePara(makeRun(data.summary, { sizeHalfPt: 19, color: textColor })));
    } else if (sec === "education") {
      for (const edu of data.education) {
        if (!edu.institution && !edu.degree) continue;
        out.push(
          makePara(
            makeRun(edu.institution, { bold: true, sizeHalfPt: 19, color: textColor }) +
              (edu.period ? makeRun(`\t${edu.period}`, { italic: true, sizeHalfPt: 18, color: subColor }) : ""),
            { rightTabPos: 10600, spaceAfter: 15 }
          )
        );
        const sub = [edu.degree, design.showCgpa && edu.cgpa ? `CGPA: ${edu.cgpa}` : ""]
          .filter(Boolean)
          .join(" • ");
        if (sub) {
          out.push(makePara(makeRun(sub, { italic: true, sizeHalfPt: 18, color: subColor }), { spaceAfter: 35 }));
        }
      }
    } else if (sec === "skills") {
      for (const sk of data.skills) {
        if (!sk.items.trim()) continue;
        out.push(
          makePara(
            (sk.category.trim() ? makeRun(`• ${sk.category}: `, { bold: true, sizeHalfPt: 19, color: textColor }) : makeRun("• ", { sizeHalfPt: 19, color: textColor })) +
              makeRun(sk.items, { sizeHalfPt: 19, color: textColor }),
            { spaceAfter: 20 }
          )
        );
      }
    } else if (sec === "projects") {
      for (const pr of data.projects) {
        if (!pr.name) continue;
        out.push(
          makePara(
            makeRun(`• ${pr.name}`, { bold: true, sizeHalfPt: 19, color: textColor }) +
              (pr.techStack ? makeRun(` (${pr.techStack})`, { italic: true, sizeHalfPt: 18, color: subColor }) : "") +
              (pr.description ? makeRun(` — ${pr.description}`, { sizeHalfPt: 18, color: textColor }) : ""),
            { spaceAfter: 25 }
          )
        );
      }
    } else if (sec === "experience") {
      for (const exp of data.experience) {
        if (!exp.role && !exp.organization) continue;
        out.push(
          makePara(
            makeRun(exp.role || exp.organization, { bold: true, sizeHalfPt: 19, color: textColor }) +
              (exp.period ? makeRun(`\t${exp.period}`, { italic: true, sizeHalfPt: 18, color: subColor }) : ""),
            { rightTabPos: 10600, spaceAfter: 15 }
          )
        );
        if (exp.role && exp.organization) {
          out.push(makePara(makeRun(exp.organization, { italic: true, sizeHalfPt: 18, color: subColor }), { spaceAfter: 20 }));
        }
        for (const b of exp.bullets) {
          if (b.trim()) {
            out.push(makePara(makeRun(`• ${b}`, { sizeHalfPt: 18, color: textColor }), { spaceAfter: 15 }));
          }
        }
      }
    } else if (sec === "achievements") {
      for (const a of data.achievements) {
        if (a.trim()) out.push(makePara(makeRun(`• ${a}`, { sizeHalfPt: 18, color: textColor }), { spaceAfter: 20 }));
      }
    } else if (sec === "certifications") {
      for (const c of data.certifications) {
        if (c.trim()) out.push(makePara(makeRun(`• ${c}`, { sizeHalfPt: 18, color: textColor }), { spaceAfter: 20 }));
      }
    } else if (sec === "languages") {
      const lTxt = data.languages
        .filter((l) => l.name.trim())
        .map((l) => (l.proficiency ? `• ${l.name} (${l.proficiency})` : `• ${l.name}`))
        .join("   ");
      if (lTxt) out.push(makePara(makeRun(lTxt, { sizeHalfPt: 18, color: textColor })));
    } else if (sec === "references") {
      if (data.referencesOnRequest || data.references.length === 0) {
        out.push(makePara(makeRun("Available upon request.", { sizeHalfPt: 18, color: textColor })));
      } else {
        for (const ref of data.references) {
          if (!ref.name.trim()) continue;
          out.push(makePara(makeRun(ref.name, { bold: true, sizeHalfPt: 19, color: textColor }), { spaceAfter: 10 }));
          const det = [ref.title, ref.organization, ref.phone, ref.email].filter((x) => x.trim()).join(" • ");
          if (det) out.push(makePara(makeRun(det, { sizeHalfPt: 18, color: subColor }), { spaceAfter: 25 }));
        }
      }
    }
    return out;
  };

  let bodyXml = "";
  const isTwoCol = design.template === "modern-sidebar" || design.template === "europe-minimal";

  if (isTwoCol) {
    const isSidebar = design.template === "modern-sidebar";
    const leftKeys: ResumeSectionKey[] = isSidebar
      ? ["skills", "languages", "references"]
      : ["summary", "education", "skills", "languages"];

    const leftParas: string[] = [];
    if (imageXml) leftParas.push(imageXml);

    leftParas.push(makeHeading("Contact", accentHex, isSidebar));
    for (const c of [data.phone, data.email, data.address, data.linkedin, data.github, data.portfolio].filter((x) => x.trim())) {
      leftParas.push(makePara(makeRun(c, { sizeHalfPt: 17, color: isSidebar ? "F1F5F9" : "000000" }), { spaceAfter: 20 }));
    }

    for (const sec of sections) {
      if (leftKeys.includes(sec)) {
        leftParas.push(
          ...renderSectionParagraphs(sec, isSidebar ? "F1F5F9" : "000000", isSidebar ? "E2E8F0" : "000000", isSidebar)
        );
      }
    }

    if (!isSidebar && (data.dateOfBirth.trim() || data.nationality.trim() || data.competitiveProfile.trim())) {
      leftParas.push(makeHeading("Personal Info", accentHex, false));
      if (data.dateOfBirth.trim()) {
        leftParas.push(makePara(makeRun(`DOB: ${data.dateOfBirth}`, { sizeHalfPt: 17, color: "000000" }), { spaceAfter: 15 }));
      }
      if (data.nationality.trim()) {
        leftParas.push(makePara(makeRun(`Nationality: ${data.nationality}`, { sizeHalfPt: 17, color: "000000" }), { spaceAfter: 15 }));
      }
      if (data.competitiveProfile.trim()) {
        leftParas.push(makePara(makeRun(`Profile: ${data.competitiveProfile}`, { sizeHalfPt: 16, color: "000000" }), { spaceAfter: 15 }));
      }
    }

    const rightParas: string[] = [];
    rightParas.push(
      makePara(makeRun((data.fullName || "YOUR NAME").toUpperCase(), { bold: true, sizeHalfPt: 34, color: "000000" }), {
        spaceAfter: 25,
      })
    );
    if (data.headline.trim()) {
      rightParas.push(makePara(makeRun(data.headline, { sizeHalfPt: 20, color: "000000" }), { spaceAfter: 60 }));
    }
    for (const sec of sections) {
      if (!leftKeys.includes(sec)) {
        rightParas.push(...renderSectionParagraphs(sec));
      }
    }

    const leftShading = isSidebar
      ? `<w:shd w:val="clear" w:color="auto" w:fill="${accentHex}"/>`
      : `<w:tcBorders><w:right w:val="single" w:sz="6" w:space="0" w:color="E2E8F0"/></w:tcBorders>`;
    bodyXml =
      `<w:tbl>` +
      `<w:tblPr><w:tblW w:w="10700" w:type="dxa"/><w:tblBorders><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/></w:tblBorders></w:tblPr>` +
      `<w:tr>` +
      `<w:tc><w:tcPr><w:tcW w:w="3600" w:type="dxa"/>${leftShading}<w:tcMar><w:top w:w="140" w:type="dxa"/><w:left w:w="160" w:type="dxa"/><w:bottom w:w="140" w:type="dxa"/><w:right w:w="160" w:type="dxa"/></w:tcMar></w:tcPr>${leftParas.join("")}</w:tc>` +
      `<w:tc><w:tcPr><w:tcW w:w="7100" w:type="dxa"/><w:tcMar><w:top w:w="120" w:type="dxa"/><w:left w:w="220" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar></w:tcPr>${rightParas.join("")}</w:tc>` +
      `</w:tr></w:tbl>`;
  } else {
    const paras: string[] = [];
    if (imageXml && design.template !== "latex-ats") paras.push(imageXml);
    paras.push(
      makePara(makeRun(data.fullName || "YOUR NAME", { bold: true, sizeHalfPt: 34, color: "000000" }), {
        align: design.template === "latex-ats" ? "center" : "left",
        spaceAfter: 20,
      })
    );
    if (data.headline.trim()) {
      paras.push(
        makePara(makeRun(data.headline, { sizeHalfPt: 19, color: "000000" }), {
          align: design.template === "latex-ats" ? "center" : "left",
          spaceAfter: 20,
        })
      );
    }
    const cLine = [data.address, data.phone, data.email].filter((x) => x.trim()).join("  •  ");
    if (cLine) {
      paras.push(
        makePara(makeRun(cLine, { sizeHalfPt: 18, color: "000000" }), {
          align: design.template === "latex-ats" ? "center" : "left",
          spaceAfter: 15,
        })
      );
    }
    const lLine = [data.linkedin, data.github, data.competitiveProfile, data.portfolio]
      .filter((x) => x.trim())
      .join("  |  ");
    if (lLine) {
      paras.push(
        makePara(makeRun(lLine, { sizeHalfPt: 18, color: "000000" }), {
          align: design.template === "latex-ats" ? "center" : "left",
          spaceAfter: 45,
        })
      );
    }

    if (design.template === "german-lebenslauf" && (data.dateOfBirth.trim() || data.nationality.trim())) {
      paras.push(makeHeading("Personal Information / Persönliche Daten"));
      const pText = [
        data.dateOfBirth.trim() ? `Date of Birth: ${data.dateOfBirth}` : "",
        data.nationality.trim() ? `Nationality: ${data.nationality}` : "",
      ]
        .filter(Boolean)
        .join("   •   ");
      paras.push(makePara(makeRun(pText, { sizeHalfPt: 18 })));
    }

    for (const sec of sections) {
      paras.push(...renderSectionParagraphs(sec));
    }

    if (design.template === "german-lebenslauf" && design.showGermanSignature) {
      paras.push(
        makePara(
          makeRun(data.signaturePlaceDate || "Dhaka, Bangladesh", { italic: true, sizeHalfPt: 18, color: "000000" }) +
            makeRun(`\t${data.fullName || "Signature"}`, { bold: true, sizeHalfPt: 18, color: "000000" }),
          { rightTabPos: 10600, spaceBefore: 140 }
        )
      );
    }
    bodyXml = paras.join("");
  }

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Default Extension="png" ContentType="image/png"/>` +
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

  const relList: string[] = [];
  if (photo) {
    zip.file("word/media/photo.png", photo.bytes);
    relList.push(
      `<Relationship Id="rIdPhoto" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/photo.png"/>`
    );
  }
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      relList.join("") +
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
      bodyXml +
      `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="580" w:right="600" w:bottom="580" w:left="600" w:header="360" w:footer="360" w:gutter="0"/></w:sectPr>` +
      `</w:body></w:document>`
  );

  return zip.generateAsync({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

/**
 * Isolated hidden-iframe print ensuring strictly 1 A4 page with zero app chrome.
 */
export function printResumeSheet(
  sheetElement: HTMLElement | null,
  title = "NoteLagbe_Resume"
): void {
  if (!sheetElement) return;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const headNodes = Array.from(
    document.querySelectorAll('link[rel="stylesheet"], style')
  )
    .map((el) => el.outerHTML)
    .join("\n");

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    window.print();
    return;
  }

  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${xmlEscape(title)}</title>
${headNodes}
<style>
  @page { size: A4 portrait; margin: 0; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
    width: 210mm !important;
    height: 297mm !important;
    overflow: hidden !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .resume-print-root {
    width: 210mm !important;
    height: 297mm !important;
    overflow: hidden !important;
    box-shadow: none !important;
    transform: none !important;
  }
</style>
</head>
<body>
  <div class="resume-print-root">${sheetElement.outerHTML}</div>
</body>
</html>`);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => iframe.remove(), 1500);
    }
  };

  setTimeout(triggerPrint, 250);
}
