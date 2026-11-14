import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function detectBufferMime(buf: Buffer, headerMime?: string): string {
  if (buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
    return "application/pdf";
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return "image/png";
  }
  if (buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45) {
    return "image/webp";
  }
  if (headerMime && (headerMime.startsWith("image/") || headerMime.includes("pdf"))) {
    return headerMime.includes("pdf") ? "application/pdf" : headerMime.split(";")[0].trim();
  }
  return "image/jpeg";
}

interface AnalysisResult {
  suggestedTitle: string;
  suggestedSemester: string;
  detectedType: string | null;
  hasMismatch: boolean;
  mismatchReason: string | null;
  isValidAcademicDoc: boolean;
  confidence: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fileName = "",
      fileUrl = "",
      courseCode = "",
      courseTitle = "",
      resourceType = "NOTE",
      currentSemester = "",
      language = "bn",
    } = body;

    const lowerName = fileName.toLowerCase();
    const cleanCourse = (courseCode || "Course").toUpperCase().trim();

    // 1. Academic Resource Type Mapping
    const typeTitleMap: Record<string, string> = {
      MID_QUESTION: "Midterm Examination Paper",
      FINAL_QUESTION: "Final Examination Paper",
      QUIZ_CT: "Class Test & Quiz (CT)",
      NOTE: "Lecture Hand Notes",
      LAB_MANUAL: "Lab Manual & Solutions",
      LAB_REPORT: "Lab Report Sheet",
      LAB_QUIZ: "Lab Quiz & Viva Questions",
      LAB_FINAL: "Lab Final Examination Paper",
      QUESTION_COURSE_IN: "Course-In Material",
      OTHERS: "Academic Study Material",
    };

    // 2. Semester Detection from filename or calendar
    let detectedSemester = "";
    const semMatch = fileName.match(/(fall|summer|spring|autumn|winter)[\s_\-.]*(\d{2,4})/i);
    if (semMatch) {
      const season = semMatch[1].charAt(0).toUpperCase() + semMatch[1].slice(1).toLowerCase();
      let year = semMatch[2];
      if (year.length === 2) year = `20${year}`;
      detectedSemester = `${season} ${year}`;
    } else {
      const yearMatch = fileName.match(/202[4-7]/);
      if (yearMatch) {
        detectedSemester = `Fall ${yearMatch[0]}`;
      } else if (currentSemester?.trim()) {
        detectedSemester = currentSemester.trim();
      } else {
        detectedSemester = "Fall 2026";
      }
    }

    // 3. Resource Type Detection from filename (for mismatch checking)
    let detectedType: string | null = null;
    if (lowerName.includes("final") || lowerName.includes("fnl")) {
      detectedType = "FINAL_QUESTION";
    } else if (lowerName.includes("mid") || lowerName.includes("midterm")) {
      detectedType = "MID_QUESTION";
    } else if (lowerName.includes("quiz") || lowerName.includes("ct") || lowerName.includes("class_test")) {
      detectedType = "QUIZ_CT";
    } else if (lowerName.includes("lab_manual") || lowerName.includes("manual")) {
      detectedType = "LAB_MANUAL";
    } else if (lowerName.includes("lab_report") || lowerName.includes("report")) {
      detectedType = "LAB_REPORT";
    } else if (lowerName.includes("lab_quiz") || lowerName.includes("viva")) {
      detectedType = "LAB_QUIZ";
    } else if (lowerName.includes("lab") && (lowerName.includes("exam") || lowerName.includes("final"))) {
      detectedType = "LAB_FINAL";
    } else if (lowerName.includes("note") || lowerName.includes("handnote") || lowerName.includes("lecture")) {
      detectedType = "NOTE";
    }

    // 4. Mismatch Checking
    let hasMismatch = false;
    let mismatchReason: string | null = null;

    if (detectedType && detectedType !== resourceType) {
      const typeLabels: Record<string, string> = {
        NOTE: language === "bn" ? "লেকচার হ্যান্ড নোট" : "Lecture Note",
        MID_QUESTION: language === "bn" ? "মিডটার্ম পরীক্ষার প্রশ্ন" : "Midterm Exam",
        FINAL_QUESTION: language === "bn" ? "ফাইনাল পরীক্ষার প্রশ্ন" : "Final Exam",
        QUIZ_CT: language === "bn" ? "কুইজ / ক্লাস টেস্ট" : "Quiz / CT",
        LAB_MANUAL: language === "bn" ? "ল্যাব ম্যানুয়াল" : "Lab Manual",
        LAB_REPORT: language === "bn" ? "ল্যাব রিপোর্ট" : "Lab Report",
        LAB_QUIZ: language === "bn" ? "ল্যাব কুইজ" : "Lab Quiz",
        LAB_FINAL: language === "bn" ? "ল্যাব ফাইনাল" : "Lab Final",
      };

      const selectedLabel = typeLabels[resourceType] || resourceType;
      const detectedLabel = typeLabels[detectedType] || detectedType;

      hasMismatch = true;
      mismatchReason =
        language === "bn"
          ? `সতর্কতা: আপনি সিলেক্ট করেছেন '${selectedLabel}', কিন্তু আপলোডকৃত ফাইলের তথ্য অনুযায়ী এটি '${detectedLabel}' মনে হচ্ছে। সঠিক ক্যাটাগরি নিশ্চিত করুন।`
          : `Notice: You selected '${selectedLabel}', but the uploaded document appears to be '${detectedLabel}'. Please verify your selection.`;
    }

    // 5. Build Default Deterministic Title strictly based on user's selected parameters
    const effectiveType = resourceType || detectedType || "NOTE";
    const typePart = typeTitleMap[effectiveType] || "Question Paper";
    const semPart = detectedSemester || currentSemester || "Fall 2026";

    // Clean course title (e.g. "Programming Language I (C)" -> "Programming Language I")
    const cleanTitle = (courseTitle || "")
      .replace(/\s*\([^)]*\)\s*/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();

    let candidateTitle = `${cleanCourse} ${typePart} (${semPart})`;
    if (cleanTitle && cleanTitle.length > 2) {
      const withCourse = `${cleanCourse} ${cleanTitle} ${typePart} (${semPart})`;
      if (withCourse.length <= 80) {
        candidateTitle = withCourse;
      }
    }

    const result: AnalysisResult = {
      suggestedTitle: candidateTitle.slice(0, 80),
      suggestedSemester: semPart,
      detectedType,
      hasMismatch,
      mismatchReason,
      isValidAcademicDoc: !/(meme|selfie|whatsapp_image_funny|screenshot_game|wallpaper)/i.test(lowerName),
      confidence: 0.92,
    };

    // 6. Gemini Multimodal Vision API Integration
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (apiKey && fileUrl && /^https?:\/\//i.test(fileUrl)) {
      try {
        let imagePart: any = null;
        let inspectionUrl = fileUrl;

        // If Cloudinary PDF, convert to 1st page JPG thumbnail for faster multimodal inspection
        if (inspectionUrl.includes("res.cloudinary.com") && inspectionUrl.includes("/image/upload/")) {
          inspectionUrl = inspectionUrl.replace(/\.pdf(\?.*)?$/i, ".jpg").replace("/image/upload/", "/image/upload/pg_1,w_1200/");
        }

        try {
          const imgRes = await fetch(inspectionUrl, { signal: AbortSignal.timeout(6000) });
          if (imgRes.ok) {
            const buffer = await imgRes.arrayBuffer();
            const nodeBuf = Buffer.from(buffer);
            if (nodeBuf.length > 0 && nodeBuf.length <= 10 * 1024 * 1024) {
              const detectedMime = detectBufferMime(nodeBuf, imgRes.headers.get("content-type") || undefined);
              imagePart = {
                inlineData: {
                  mimeType: detectedMime,
                  data: nodeBuf.toString("base64"),
                },
              };
            }
          }
        } catch {
          // Proceed to text prompt fallback
        }

        const promptText = `You are an academic document analyzer for Southeast University (SEU).
The student is uploading study material with the following form selection:
- Course Code: "${cleanCourse}" (${courseTitle || ""})
- Resource Type: "${resourceType}" (${typePart})
- Target Semester: "${semPart}"
- Uploaded File Name: "${fileName}"

Analyze the document image or file metadata.
Return STRICT JSON ONLY:
{
  "detectedCourseCode": string or null,
  "detectedType": "NOTE" | "MID_QUESTION" | "FINAL_QUESTION" | "QUIZ_CT" | "LAB_MANUAL" | "LAB_REPORT" | "OTHER",
  "detectedSemester": string or null,
  "hasMismatch": boolean,
  "mismatchReason": string or null,
  "suggestedTitle": string
}

CRITICAL RULES:
1. "suggestedTitle" MUST start with "${cleanCourse}" and accurately describe the selected Resource Type "${typePart}". Length must be under 80 characters.
   Format: "${cleanCourse} [Short Course Name] [Exam/Doc Type] ([Semester])"
   Example: "${cleanCourse} ${typePart} (${semPart})"
   NEVER change "${cleanCourse}" to any other course code (e.g. do NOT change ${cleanCourse} to CSE141 or any other code).
2. If the document content completely contradicts the academic document (e.g. meme, selfie, payment receipt, non-educational photo), set "hasMismatch": true with a clear explanation in Bengali.`;

        const parts: any[] = [];
        if (imagePart) parts.push(imagePart);
        parts.push({ text: promptText });

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.1,
              },
            }),
            signal: AbortSignal.timeout(6000),
          }
        );

        if (geminiRes.ok) {
          const aiJson = await geminiRes.json();
          const rawText = aiJson?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            if (parsed.suggestedTitle && typeof parsed.suggestedTitle === "string") {
              let cleanAiTitle = parsed.suggestedTitle.trim();
              // Enforce that title always starts with the user's selected course code
              if (!cleanAiTitle.toUpperCase().startsWith(cleanCourse)) {
                cleanAiTitle = `${cleanCourse} ${cleanAiTitle}`;
              }
              // Enforce that title does not mistakenly contain wrong default type if user chose MID_QUESTION
              if (resourceType === "MID_QUESTION" && cleanAiTitle.toLowerCase().includes("hand note")) {
                cleanAiTitle = cleanAiTitle.replace(/hand\s*notes?/gi, "Midterm Exam Paper");
              }
              result.suggestedTitle = cleanAiTitle.slice(0, 80);
            }
            if (parsed.detectedSemester && typeof parsed.detectedSemester === "string") {
              result.suggestedSemester = parsed.detectedSemester.trim().slice(0, 20);
            }
            if (parsed.hasMismatch && parsed.mismatchReason) {
              result.hasMismatch = true;
              result.mismatchReason = parsed.mismatchReason;
            }
          }
        }
      } catch {
        // Fallback already prepared and deterministic
      }
    }

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to analyze document" },
      { status: 500 }
    );
  }
}
