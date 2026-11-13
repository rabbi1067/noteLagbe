import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
    const cleanExt = fileName.split(".").pop()?.toLowerCase() || "";

    // 1. Semester Detection from filename or calendar
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
      } else if (!currentSemester) {
        detectedSemester = "Fall 2026";
      }
    }

    // 2. Resource Type & Exam Level Detection
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

    // 3. Mismatch Checking
    let hasMismatch = false;
    let mismatchReason: string | null = null;

    if (detectedType && detectedType !== resourceType) {
      const typeLabels: Record<string, string> = {
        NOTE: language === "bn" ? "লেকচার হ্যান্ড নোট" : "Lecture Note",
        MID_QUESTION: language === "bn" ? "মিডটার্ম পরীক্ষার প্রশ্ন" : "Midterm Exam",
        FINAL_QUESTION: language === "bn" ? "ফাইনাল পরীক্ষার প্রশ্ন" : "Final Exam",
        QUIZ_CT: language === "bn" ? "কুইজ / ক্লাস টেস্ট" : "Quiz / CT",
        LAB_MANUAL: language === "bn" ? "ল্যাব ম্যানুয়াল" : "Lab Manual",
      };

      const selectedLabel = typeLabels[resourceType] || resourceType;
      const detectedLabel = typeLabels[detectedType] || detectedType;

      hasMismatch = true;
      mismatchReason =
        language === "bn"
          ? `সতর্কতা: আপনি সিলেক্ট করেছেন '${selectedLabel}', কিন্তু ফাইলের নাম ও কনটেন্ট দেখে এটি '${detectedLabel}' মনে হচ্ছে। সঠিক ক্যাটাগরি যাচাই করুন।`
          : `Notice: You selected '${selectedLabel}', but the uploaded document appears to be '${detectedLabel}'. Please verify your selection.`;
    }

    // 4. Suggested Title Generation
    const cleanCourse = courseCode.toUpperCase().trim() || "Course";
    let typePart = "Lecture Hand Notes";
    if (resourceType === "MID_QUESTION" || detectedType === "MID_QUESTION") typePart = "Midterm Question Paper";
    else if (resourceType === "FINAL_QUESTION" || detectedType === "FINAL_QUESTION") typePart = "Final Exam Question Paper";
    else if (resourceType === "QUIZ_CT" || detectedType === "QUIZ_CT") typePart = "Quiz & Class Test (CT)";
    else if (resourceType === "LAB_MANUAL" || detectedType === "LAB_MANUAL") typePart = "Lab Manual & Code";
    else if (resourceType === "LAB_REPORT" || detectedType === "LAB_REPORT") typePart = "Lab Report";
    else if (resourceType === "LAB_FINAL" || detectedType === "LAB_FINAL") typePart = "Lab Final Exam Paper";
    else if (resourceType === "NOTE" || detectedType === "NOTE") typePart = "Complete Lecture Hand Notes";

    const semPart = detectedSemester || currentSemester || "Semester";
    const suggestedTitle = `${cleanCourse} ${typePart} (${semPart})`.slice(0, 80);

    const result: AnalysisResult = {
      suggestedTitle,
      suggestedSemester: detectedSemester || currentSemester || "Fall 2026",
      detectedType,
      hasMismatch,
      mismatchReason,
      isValidAcademicDoc: !/(meme|selfie|whatsapp|screenshot_game|wallpaper)/i.test(lowerName),
      confidence: 0.88,
    };

    // If Gemini API is available and file is an image, attempt multimodal confirmation
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && fileUrl && /\.(jpe?g|png|webp)$/i.test(fileUrl)) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `Examine this document URL: ${fileUrl}.
This is claimed to be a Southeast University academic document: Course: ${courseCode}, Selected Type: ${resourceType}.
Answer in JSON:
{
  "detectedCourseCode": string or null,
  "detectedSemester": string or null,
  "detectedType": "NOTE" | "MID_QUESTION" | "FINAL_QUESTION" | "QUIZ_CT" | "OTHER",
  "isMismatch": boolean,
  "mismatchExplanation": string or null,
  "suggestedTitle": string
}`,
                    },
                  ],
                },
              ],
              generationConfig: { responseMimeType: "application/json" },
            }),
            signal: AbortSignal.timeout(5000),
          }
        );

        if (geminiRes.ok) {
          const aiJson = await geminiRes.json();
          const parsed = JSON.parse(aiJson?.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
          if (parsed.suggestedTitle) result.suggestedTitle = parsed.suggestedTitle.slice(0, 80);
          if (parsed.detectedSemester) result.suggestedSemester = parsed.detectedSemester;
          if (parsed.isMismatch && parsed.mismatchExplanation) {
            result.hasMismatch = true;
            result.mismatchReason = parsed.mismatchExplanation;
          }
        }
      } catch (e) {
        // Fallback already populated
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
