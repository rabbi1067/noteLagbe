import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const REJECT_REASONS = [
  {
    category: "CONTENT_MISMATCH",
    bn: "টাইটেল বা ক্যাটাগরিতে {typeLabel} উল্লেখ থাকলেও আপলোড করা ডকুমেন্টে ভিন্ন কনটেন্ট (যেমন অন্য কোনো বিষয়ের বা অ্যাসাইনমেন্টের পেজ) দেখা যাচ্ছে। অনুগ্রহ করে সঠিক কোর্স ও ক্যাটাগরি নিশ্চিত করে পুনরায় আপলোড করুন।",
    en: "The selected category '{typeLabel}' does not match the actual document content (e.g. contains unrelated subject material or assignment pages). Please verify the course and category, then re-submit.",
  },
  {
    category: "POOR_QUALITY",
    bn: "আপলোড করা খাতার ছবি/নোট কিছুটা ঝাপসা ও অস্পষ্ট। অনুগ্রহ করে পর্যাপ্ত আলোতে প্রতিটি পেজের পরিষ্কার, ফোকাসড এবং সোজা ছবি তুলে আপলোড করুন।",
    en: "The uploaded pages are blurry or low resolution. Please capture clear, well-lit, properly oriented and legible photos of each page before re-submitting.",
  },
  {
    category: "INCOMPLETE_PAGES",
    bn: "ডকুমেন্টে প্রয়োজনীয় পৃষ্ঠাগুলো অসম্পূর্ণ দেখাচ্ছে। অনুগ্রহ করে সম্পূর্ণ লেকচার নোট বা প্রশ্নপত্রের সবগুলো পেজ মার্জ করে একটি পূর্ণাঙ্গ ফাইলে সাবমিট করুন।",
    en: "The submission appears incomplete with missing pages. Please merge all pages of the lecture notes or exam question paper into a single complete document.",
  },
  {
    category: "DUPLICATE_SEMESTER",
    bn: "{courseCode} কোর্সের {semester} সেমিস্টারের মেটেরিয়াল ইতোমধ্যে ভেরিফাইড আর্কাইভে বিদ্যমান রয়েছে। অনুগ্রহ করে নতুন কোনো টার্ম বা বিষয়ের হ্যান্ড নোট শেয়ার করুন।",
    en: "Academic materials for {courseCode} ({semester}) already exist in our verified archive. Please share study notes or question papers for a different semester or topic.",
  },
  {
    category: "IRRELEVANT_CONTENT",
    bn: "আপলোড করা ফাইলে একাডেমিক পাঠ্যসূচির সাথে প্রাসঙ্গিক স্টাডি মেটেরিয়াল পরিলক্ষিত হয়নি। অনুগ্রহ করে শুধুমাত্র কোর্স সংক্রান্ত নোট, কুইজ বা পরীক্ষার প্রশ্ন আপলোড করুন।",
    en: "The uploaded file does not appear to contain syllabus-relevant academic study material. Please only upload valid university lecture notes, quizzes, or exam papers.",
  },
  {
    category: "FORMATTING_WATERMARK",
    bn: "ডকুমেন্টে অপ্রয়োজনীয় বড় দাগ, অপাঠ্য হাতের লেখা বা ব্যক্তিগত কনটেন্ট রয়েছে। অনুগ্রহ করে পরিচ্ছন্ন ও পাঠযোগ্য মেটেরিয়াল সাবমিট করুন।",
    en: "The document contains excessive marks, unreadable handwriting, or non-academic personal content. Please submit a clean, readable copy.",
  },
];

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
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title = "",
      resourceType = "NOTE",
      courseCode = "Course",
      semester = "",
      fileName = "",
      fileUrl = "",
      cycleIndex = 0,
      language = "en",
    } = body;

    const isBangla = language === "bn";
    const apiKey = process.env.GEMINI_API_KEY;
    const typeLabel = TYPE_NAMES[resourceType]?.[isBangla ? "bn" : "en"] || resourceType;

    // Check if Gemini API is configured and attempt high-precision generation in the requested language
    if (apiKey) {
      try {
        const langInstruction = isBangla
          ? "CRITICAL: Write the entire rejection feedback STRICTLY in respectful, constructive Bengali (বাংলা). Do NOT include English text."
          : "CRITICAL: Write the entire rejection feedback STRICTLY in clear, professional, constructive English. Do NOT include Bengali text.";

        const prompt = `You are a university academic reviewer for 'NoteLagbe' at Southeast University (SEU).
A student submitted a study material with:
- Title: "${title}"
- Resource Category: "${resourceType}" (${typeLabel})
- Course Code: "${courseCode}"
- Semester: "${semester}"
- File Name: "${fileName}"
- File URL: "${fileUrl}"

The admin is rejecting this submission.
${langInstruction}

Reason variation #${(cycleIndex % 5) + 1}. Focus on one specific issue:
1) Content mismatch (e.g. title says Quiz/CT or Midterm but document is an unrelated assignment or different course)
2) Low image quality / blurry handwriting / unreadable pages
3) Missing pages / incomplete question paper or lecture note
4) Duplicate semester material already in the verified archive
5) Irrelevant or non-educational content

Keep it concise (1 to 2 sentences), polite, encouraging, and actionable so the student knows exactly how to fix it and re-submit.
Return ONLY the raw text of the rejection note. No JSON, no markdown headings, no quotes.`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.6,
                maxOutputTokens: 250,
              },
            }),
            signal: AbortSignal.timeout(6000),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (generatedText) {
            return NextResponse.json({
              success: true,
              suggestion: generatedText,
              source: "gemini",
              language: isBangla ? "bn" : "en",
              category: `AI_VARIATION_${(cycleIndex % 5) + 1}`,
            });
          }
        }
      } catch (geminiErr) {
        console.warn("Gemini call failed or timed out, falling back to rule engine:", geminiErr);
      }
    }

    // Built-in Smart Academic Rule Engine (Guaranteed 0-latency fallback in exact language)
    const normalizedIndex = Math.abs(Number(cycleIndex) || 0) % REJECT_REASONS.length;
    const item = REJECT_REASONS[normalizedIndex];

    const safeCourse = courseCode || (isBangla ? "কোর্স" : "Course");
    const safeSem = semester || (isBangla ? "উক্ত সেমিস্টার" : "specified semester");
    const noteText = (isBangla ? item.bn : item.en)
      .replace("{typeLabel}", typeLabel)
      .replace("{courseCode}", safeCourse)
      .replace("{semester}", safeSem);

    return NextResponse.json({
      success: true,
      suggestion: noteText,
      source: "academic_rules",
      language: isBangla ? "bn" : "en",
      category: item.category,
      index: normalizedIndex,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate reject note" },
      { status: 500 }
    );
  }
}
