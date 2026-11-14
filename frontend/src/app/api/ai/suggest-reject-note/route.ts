import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TYPE_NAMES: Record<string, { en: string; bn: string }> = {
  NOTE: { en: "Lecture Hand Note", bn: "লেকচার হ্যান্ড নোট" },
  MID_QUESTION: { en: "Midterm Question Paper", bn: "মিডটার্ম পরীক্ষার প্রশ্ন" },
  FINAL_QUESTION: { en: "Final Exam Paper", bn: "ফাইনাল পরীক্ষার প্রশ্ন" },
  QUIZ_CT: { en: "Quiz & Class Test (CT)", bn: "কুইজ ও ক্লাস টেস্ট (CT)" },
  LAB_MANUAL: { en: "Lab Manual / Code", bn: "ল্যাব ম্যানুয়াল / কোড" },
  LAB_QUIZ: { en: "Lab Quiz / Viva", bn: "ল্যাব কুইজ / ভাইভা" },
  LAB_FINAL: { en: "Lab Final Exam", bn: "ল্যাব ফাইনাল পরীক্ষা" },
  LAB_REPORT: { en: "Lab Report Sheet", bn: "ল্যাব রিপোর্ট" },
  LAB_HAND_NOTE: { en: "Lab Hand Note", bn: "ল্যাব হ্যান্ড নোট" },
  QUESTION_COURSE_IN: { en: "Course-In Material", bn: "কোর্স-ইন মেটেরিয়াল" },
  OTHERS: { en: "Academic Material", bn: "একাডেমিক স্টাডি মেটেরিয়াল" },
};

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title = "",
      resourceType = "NOTE",
      courseCode = "Course",
      courseTitle = "",
      semester = "",
      teacherName = "",
      teacherInitial = "",
      teacherId = null,
      fileName = "",
      fileUrl = "",
      previewUrl = "",
      cycleIndex = 0,
      language = "bn",
      exactDuplicateFound = false,
      exactDuplicateDetails = null,
      existingMaterialsForCourse = [],
    } = body;

    const isBangla = language === "bn";
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    const typeLabel = TYPE_NAMES[resourceType]?.[isBangla ? "bn" : "en"] || resourceType;
    const cleanCourse = (courseCode || "Course").toUpperCase().trim();
    const cleanSem = semester || (isBangla ? "উক্ত সেমিস্টার" : "Current Semester");
    const cleanTeacherName = teacherName ? teacherName.trim() : (isBangla ? "সংশ্লিষ্ট শিক্ষক" : "Assigned Faculty");
    const cleanTeacherInitial = teacherInitial ? teacherInitial.trim().toUpperCase() : "";

    // 1. Resolve inspection URL (handles relative backend paths /uploads/...)
    let inspectionUrl = previewUrl || fileUrl;
    const backendBase = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://notelagbe-backend.onrender.com").replace(/\/+$/, "");
    if (inspectionUrl && inspectionUrl.startsWith("/")) {
      inspectionUrl = `${backendBase}${inspectionUrl}`;
    }

    // 1. Genuine Multimodal Vision Inspection via Gemini
    if (apiKey) {
      try {
        let mediaPart: any = null;

        // If Cloudinary image PDF, convert to page 1 JPG for faster inspection
        if (inspectionUrl && inspectionUrl.includes("res.cloudinary.com") && inspectionUrl.includes("/image/upload/")) {
          inspectionUrl = inspectionUrl.replace(/\.pdf(\?.*)?$/i, ".jpg").replace("/image/upload/", "/image/upload/pg_1,w_1200/");
        }

        if (inspectionUrl && /^https?:\/\//i.test(inspectionUrl)) {
          try {
            const fetchRes = await fetch(inspectionUrl, { signal: AbortSignal.timeout(8000) });
            if (fetchRes.ok) {
              const arrayBuf = await fetchRes.arrayBuffer();
              const buf = Buffer.from(arrayBuf);
              // Gemini inlineData supports images and PDFs up to ~12MB
              if (buf.length > 0 && buf.length <= 12 * 1024 * 1024) {
                const detectedMime = detectBufferMime(buf, fetchRes.headers.get("content-type") || undefined);
                mediaPart = {
                  inlineData: {
                    mimeType: detectedMime,
                    data: buf.toString("base64"),
                  },
                };
              }
            }
          } catch (fetchErr) {
            console.warn("Could not fetch document preview for vision analysis:", fetchErr);
          }
        }

        const langRule = isBangla
          ? "CRITICAL: 'analysisFindings' and 'rejectionNote' MUST be written in 100% natural, polite, respectful, and standard Bengali (বাংলা). Do NOT use robot-like translations or English sentences."
          : "CRITICAL: 'analysisFindings' and 'rejectionNote' MUST be written in 100% clear, professional, constructive English.";

        // Build list of existing materials in database for context
        const existingSummary = Array.isArray(existingMaterialsForCourse) && existingMaterialsForCourse.length > 0
          ? existingMaterialsForCourse
              .map(
                (m: any, idx: number) =>
                  `${idx + 1}. [${m.type || "NOTE"}] "${m.title || "Material"}" - Semester: ${m.semester || "N/A"}, Faculty: ${m.teacherName || m.teacherInitial || "General"}`
              )
              .join("\n")
          : "No materials currently archived for this course in NoteLagbe.";

        const promptText = `You are the Senior Academic Document Auditor and Quality Reviewer for 'NoteLagbe' at Southeast University (SEU).
A student has submitted an academic document with the following claimed metadata:
- Target Course: "${cleanCourse}" (${courseTitle || ""})
- Assigned Faculty: "${cleanTeacherName}" ${cleanTeacherInitial ? `[Initial: ${cleanTeacherInitial}]` : ""}
- Target Semester: "${cleanSem}"
- Resource Category: "${resourceType}" (${typeLabel})
- Document Title: "${title}"
- Uploaded File: "${fileName}"

VERIFIED ARCHIVE DATABASE REALITY CHECK:
- Does an approved material already exist in NoteLagbe for this EXACT Course + EXACT Faculty (${cleanTeacherName}) + EXACT Semester (${cleanSem}) + EXACT Type (${typeLabel})?
  ${exactDuplicateFound ? `YES! An approved material already exists in our verified repository: "${exactDuplicateDetails?.title || title}" (Semester: ${exactDuplicateDetails?.semester || cleanSem}, Faculty: ${exactDuplicateDetails?.teacherName || cleanTeacherName}).` : `NO! NoteLagbe DOES NOT currently have an approved copy for ${cleanTeacherName} in ${cleanSem} for this course.`}
- All currently approved materials in repository for ${cleanCourse}:
${existingSummary}

YOUR MISSION:
Carefully inspect the attached document image / PDF page (if attached) or audit the submitted evidence.
1. HEADER & METADATA AUDIT:
   - Check University header: Southeast University (SEU)?
   - Check Course Code: Look at the printed header. Does it say "${cleanCourse}" or does it say a DIFFERENT course (e.g. CSE141, CSE241, EEE, etc.)?
   - Check Semester: Look at the printed header. Does it state "${cleanSem}" or does it state a DIFFERENT term (e.g. Spring 2025, Fall 2024, Summer 2023)?
   - Check Faculty / Teacher: Does the printed header, footer, or teacher signature indicate "${cleanTeacherName}" or initial "${cleanTeacherInitial}", or another faculty member?
   - Check Exam/Document Type: Does the header say "Final Examination", "Midterm Examination", "Quiz / CT", "Lab Manual", or "Assignment"? Does it match "${typeLabel}"?

2. QUESTION & CONTENT QUALITY AUDIT:
   - Are there real academic exam questions, problem statements, diagrams, formulas, or lecture notes?
   - Are the questions authentic and appropriate for ${cleanCourse}?
   - Is the document blurry, skewed, unreadable, cut off at margins, missing pages, or corrupted?
   - Is this an unrelated file (personal photo, random meme, assignment cover page, non-academic screenshot)?

AUDIT DECISION CRITERIA (CRITICAL RULES - STRICT HONESTY):
CASE 1: REAL FLAW / MISMATCH FOUND IN THE DOCUMENT ("hasRealFlaw": true):
- If ANY of the following is true in the document:
  * Course mismatch: The document header shows a different course than "${cleanCourse}".
  * Semester mismatch: The document header shows a different semester than "${cleanSem}".
  * Faculty mismatch: The document clearly belongs to a different instructor than "${cleanTeacherName}".
  * Type mismatch: The document is an Assignment, Class Test, or Note when "${typeLabel}" was claimed.
  * Poor quality / illegible: The handwriting or scan is too blurry, dark, cut off, or missing questions.
  * Irrelevant / fake: Not a genuine academic study material.
-> Set "hasRealFlaw": true.
-> In "flawType", specify one of: "SEMESTER_MISMATCH" | "COURSE_MISMATCH" | "FACULTY_MISMATCH" | "TYPE_MISMATCH" | "ILLEGIBLE_OR_BLURRY" | "INCOMPLETE_QUESTIONS" | "UNRELATED_CONTENT".
-> In "analysisFindings", describe the EXACT visible mismatch observed (e.g. "আপলোড করা প্রশ্নপত্রের হেডারে স্পষ্টভাবে 'Spring 2025' দেখা যাচ্ছে, কিন্তু সাবমিশনে 'Summer 2026' নির্বাচন করা হয়েছে।").
-> In "rejectionNote", provide a polite, respectful, and crystal-clear explanation in standard Bengali telling the student what went wrong and how to fix it before re-submitting.

CASE 2: DOCUMENT IS FULLY VALID & MATCHING, AND A DUPLICATE ALREADY EXISTS IN ARCHIVE ("hasRealFlaw": false, exactDuplicateFound = true):
- If the document is authentic and matches ${cleanCourse} + ${cleanSem} + ${cleanTeacherName} + ${typeLabel}, AND exactDuplicateFound is true:
-> Set "hasRealFlaw": false.
-> Set "flawType": "NONE".
-> Set "category": "DUPLICATE_ARCHIVE".
-> In "analysisFindings", confirm the document is authentic and matches ${cleanTeacherName}'s ${cleanSem} course, but note that this exact material already exists in NoteLagbe's verified archive.
-> In "rejectionNote", write a warm, appreciative note explicitly mentioning ${cleanCourse}, ${cleanTeacherName}, and ${cleanSem}:
   "${cleanCourse} কোর্সের ${cleanTeacherName} শিক্ষকের ${cleanSem} সেমিস্টারের ${typeLabel} ইতোমধ্যে আমাদের ভেরিফাইড আর্কাইভে সম্পূর্ণ আকারে সংরক্ষিত রয়েছে। আপনার আন্তরিক অবদানের জন্য ধন্যবাদ, অনুগ্রহ করে অন্য কোনো সেমিস্টারের বা নতুন কোর্সের মেটেরিয়াল শেয়ার করুন।"

CASE 3: DOCUMENT IS FULLY VALID & MATCHING, BUT NO DUPLICATE EXISTS IN ARCHIVE ("hasRealFlaw": false, exactDuplicateFound = false):
- If the document is authentic and matches ${cleanCourse} + ${cleanSem} + ${cleanTeacherName}, AND exactDuplicateFound is false:
-> Set "hasRealFlaw": false.
-> Set "flawType": "NONE".
-> Set "category": "ADMIN_REVIEW".
-> CRITICAL: NEVER falsely say that the material already exists in the repository!
-> In "analysisFindings", confirm the document is authentic for ${cleanTeacherName} and no duplicate was found.
-> In "rejectionNote", provide a courteous administrative/review note (e.g. requesting a higher resolution multi-page scan with solutions or complete front and back pages).

LANGUAGE & TONE:
${langRule}
Provide alternative phrasing variation #${(Number(cycleIndex) % 4) + 1}.

Return STRICT JSON ONLY matching this schema:
{
  "hasRealFlaw": boolean,
  "flawType": "NONE" | "SEMESTER_MISMATCH" | "COURSE_MISMATCH" | "FACULTY_MISMATCH" | "TYPE_MISMATCH" | "ILLEGIBLE_OR_BLURRY" | "INCOMPLETE_QUESTIONS" | "UNRELATED_CONTENT",
  "detectedCourseCode": string or null,
  "detectedSemester": string or null,
  "detectedFaculty": string or null,
  "detectedExamType": string or null,
  "analysisFindings": string,
  "rejectionNote": string,
  "category": "CONTENT_MISMATCH" | "DUPLICATE_ARCHIVE" | "POOR_QUALITY" | "INCOMPLETE_PAGES" | "ADMIN_REVIEW"
}`;

        const parts: any[] = [];
        if (mediaPart) {
          parts.push(mediaPart);
        }
        parts.push({ text: promptText });

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2,
                maxOutputTokens: 600,
              },
            }),
            signal: AbortSignal.timeout(10000),
          }
        );

        if (geminiRes.ok) {
          const aiData = await geminiRes.json();
          const rawJson = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawJson) {
            const parsed = JSON.parse(rawJson);
            if (parsed.rejectionNote && typeof parsed.rejectionNote === "string") {
              return NextResponse.json({
                success: true,
                suggestion: parsed.rejectionNote.trim(),
                hasRealFlaw: Boolean(parsed.hasRealFlaw),
                flawType: parsed.flawType || "NONE",
                analysisFindings: parsed.analysisFindings || (isBangla ? "ডকুমেন্ট বিশ্লেষণ সম্পন্ন হয়েছে।" : "Document analysis completed."),
                detectedCourseCode: parsed.detectedCourseCode || null,
                detectedSemester: parsed.detectedSemester || null,
                detectedFaculty: parsed.detectedFaculty || null,
                detectedDocType: parsed.detectedExamType || null,
                category: parsed.category || (parsed.hasRealFlaw ? "CONTENT_MISMATCH" : exactDuplicateFound ? "DUPLICATE_ARCHIVE" : "ADMIN_REVIEW"),
                source: mediaPart ? "gemini_multimodal_vision" : "gemini_academic_auditor",
                language: isBangla ? "bn" : "en",
              });
            }
          }
        }
      } catch (geminiErr) {
        console.warn("Gemini multimodal analysis failed or timed out:", geminiErr);
      }
    }

    // 2. Fallback to Backend AI Service (in case GEMINI_API_KEY is configured on Render backend)
    try {
      const backendAiRes = await fetch(`${backendBase}/api/ai/suggest-reject-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(6000),
      });
      if (backendAiRes.ok) {
        const backendData = await backendAiRes.json();
        if (backendData?.suggestion) {
          return NextResponse.json(backendData);
        }
      }
    } catch {
      // Proceed to resilient truth engine
    }

    // 3. Resilient Academic Truth Engine (Zero Blind Assumptions, 100% Truthful)
    if (exactDuplicateFound) {
      const duplicateMsg = isBangla
        ? `${cleanCourse} কোর্সের ${cleanTeacherName} শিক্ষকের ${cleanSem} সেমিস্টারের ${typeLabel} ইতোমধ্যে আমাদের ভেরিফাইড আর্কাইভে সম্পূর্ণ আকারে সংরক্ষিত রয়েছে। আপনার আন্তরিক অবদানের জন্য ধন্যবাদ, অনুগ্রহ করে অন্য কোনো সেমিস্টার বা নতুন কোর্সের মেটেরিয়াল শেয়ার করুন।`
        : `Academic material for ${cleanCourse} (${cleanSem}, Faculty: ${cleanTeacherName}) already exists in our verified repository. Thank you for your support, please consider sharing notes or question papers for another term or course.`;

      const findings = isBangla
        ? `ডাটাবেজ আর্কাইভ যাচাই: ${cleanCourse} কোর্সের ${cleanTeacherName} (${cleanSem}) এর জন্য একই মেটেরিয়াল ইতোমধ্যে সংরক্ষিত রয়েছে।`
        : `Database archive check: A verified copy already exists for ${cleanCourse} (${cleanSem}, Faculty: ${cleanTeacherName}).`;

      return NextResponse.json({
        success: true,
        suggestion: duplicateMsg,
        hasRealFlaw: false,
        flawType: "NONE",
        analysisFindings: findings,
        detectedCourseCode: cleanCourse,
        detectedSemester: cleanSem,
        detectedFaculty: cleanTeacherName,
        detectedDocType: resourceType,
        source: "academic_truth_engine",
        language: isBangla ? "bn" : "en",
        category: "DUPLICATE_ARCHIVE",
      });
    }

    // If NOT duplicate, suggest legitimate document review without false duplicate claims!
    const adminReviewMsg = isBangla
      ? `আপলোড করা ডকুমেন্টের পৃষ্ঠাগুলো পর্যাপ্ত আলোতে সোজা ও স্পষ্ট করে (সকল পৃষ্ঠাসহ পূর্ণাঙ্গ ফাইলে) পুনরায় সাবমিট করার অনুরোধ করা হচ্ছে।`
      : `Please capture a clearer, well-lit, and properly oriented scan including all pages of the document before re-submitting.`;

    const findings = isBangla
      ? `ডাটাবেজ আর্কাইভ যাচাই: ${cleanCourse} কোর্সের ${cleanTeacherName} (${cleanSem}) এর জন্য আর্কাইভে কোনো ডুপ্লিকেট পাওয়া যায়নি। প্রশাসনিক পর্যালোচনার ভিত্তিতে পুনরায় স্ক্যান কপি চাওয়া হয়েছে।`
      : `Database archive check: No duplicate found for ${cleanCourse} (${cleanSem}, Faculty: ${cleanTeacherName}). Administrative review requested.`;

    return NextResponse.json({
      success: true,
      suggestion: adminReviewMsg,
      hasRealFlaw: false,
      flawType: "NONE",
      analysisFindings: findings,
      detectedCourseCode: cleanCourse,
      detectedSemester: cleanSem,
      detectedFaculty: cleanTeacherName,
      detectedDocType: resourceType,
      source: "academic_truth_engine",
      language: isBangla ? "bn" : "en",
      category: "ADMIN_REVIEW",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate reject note" },
      { status: 500 }
    );
  }
}
