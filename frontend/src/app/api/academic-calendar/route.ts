import { NextResponse } from "next/server";
import fallbackCalendars from "@/data/academic_calendars.json";

// In-memory cache
interface CalendarCache {
  timestamp: number;
  data: any;
}

const cache: Record<string, CalendarCache> = {};
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

const cleanText = (str: string) => {
  if (!str) return "";
  let text = String(str);

  // Unescape HTML entities (first pass)
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");

  // Strip HTML tags (e.g. <p>, <br>, </div>)
  text = text.replace(/<[^>]+>/g, " ");

  // Second pass for doubly-escaped HTML entities (e.g. &amp;lt;p&amp;gt;)
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");

  // Strip any newly revealed tags
  text = text.replace(/<[^>]+>/g, " ");

  // Fix character anomalies, quotes, and typography
  text = text
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");

  // Fix "W"ith / "W"ithdrawal corruption
  text = text.replace(/["']?W["']?ithdrawal/gi, "Withdrawal");
  text = text.replace(/["']?W["']?ith/gi, "with");

  // Fix "W" Grade and quotes around W
  text = text.replace(/["']{2,}W["']{2,}/g, '"W"');
  text = text.replace(/\bwith\s+["']*\s*W\s*["']*\s*(?:Grade\s+)?without\b/gi, 'with "W" Grade without');
  text = text.replace(/\bwith\s+["']*\s*W\s*["']*\s*Grade\b/gi, 'with "W" Grade');

  // Fix Payment with Late Fine Tk. 500
  text = text.replace(/\bPayment\s+["']?with["']?\s+Late\s+Fine\s+TK\.\s*500\s+for\s+Registration\b/gi, "Payment with Late Fine Tk. 500 for Registration");
  text = text.replace(/\bPayment\s+with\s+late\s+fine\s+Tk\.\s*500\s+for\s+registration\b/gi, "Payment with Late Fine Tk. 500 for Registration");
  text = text.replace(/\bTK\.\s*500\b/g, "Tk. 500");
  text = text.replace(/\bLate Fine 500 and 50 Per Day\b/gi, "Late Fine Tk. 500 + Tk. 50 per day");

  // Fix merged concatenated installment sentences
  text = text.replace(/Last date for Course ADD\s*\/\s*DROP\s+Last date for payment of 1st installment\s*\(?40%\)?\s*without late fee/gi, "Last date for Course Add/Drop & Payment of 1st Installment (40%) without late fee");

  // Fix known SEU website typos and capitalization
  text = text.replace("National Revaluation & Solidarity Day", "National Revolution & Solidarity Day");
  text = text.replace("Classes begins", "Classes begin");
  text = text.replace("Orientation of newly students", "Orientation of newly admitted students");
  text = text.replace("Holiday (Budha Purnima)", "Holiday (Buddha Purnima)*");
  text = text.replace("Holiday(Buddha Purnima)*", "Holiday (Buddha Purnima)*");
  text = text.replace("Holiday(Ashura)", "Holiday (Ashura)*");
  text = text.replace("Holiday(Shaeed Dibosh)", "Holiday (Shaheed Dibash)");
  text = text.replace("Holiday (Sharaswati Puja)", "Holiday (Saraswati Puja)");
  text = text.replace("Holiday (Sharwarshiti Puja)", "Holiday (Saraswati Puja)");

  if (/^Announcement of Exam\b/i.test(text)) {
    text = "Announcement of Exam Results";
  }

  return text.replace(/\s+/g, " ").trim();
};

const categorizeEvent = (desc: string): string => {
  const d = (desc || "").toLowerCase();
  if (d.includes("semester break") || d.includes("vacation") || d.includes("term break")) {
    return "semester_break";
  }
  // Orientation events
  if (d.includes("orientation")) {
    return "orientation";
  }
  // Pre-registration events
  if (d.includes("pre-registration") || d.includes("preregistration")) {
    return "pre_registration";
  }
  // Add / Drop events (Course ADD/DROP, Semester drop)
  if (
    d.includes("add/drop") ||
    d.includes("add / drop") ||
    d.includes("add drop") ||
    d.includes("semester drop") ||
    (d.includes("drop") && !d.includes("attendance"))
  ) {
    return "add_drop";
  }
  // Check results strictly for actual exam results & faculty grade submission!
  if (
    d.includes("announcement of exam results") ||
    d.includes("grade submission") ||
    d.includes("transcript") ||
    (d.includes("result") && !d.includes("withdrawal"))
  ) {
    return "result";
  }
  if (
    d.includes("holiday") ||
    d.includes("puja") ||
    d.includes("eid") ||
    d.includes("shab-e-barat") ||
    d.includes("ashura") ||
    d.includes("revolution") ||
    (d.includes("day") &&
      (d.includes("victory") ||
        d.includes("mourning") ||
        d.includes("language") ||
        d.includes("independence") ||
        d.includes("christmas") ||
        d.includes("buddha") ||
        d.includes("may day") ||
        d.includes("nababarsho")))
  ) {
    return "holiday";
  }
  if (
    d.includes("classes begin") ||
    d.includes("classes end") ||
    d.includes("last date of classes") ||
    d.includes("last day of classes")
  ) {
    return "class";
  }
  if (d.includes("examination") || d.includes("exam") || d.includes("midterm") || d.includes("final exam")) {
    return "exam";
  }
  // Other administrative and registration events
  if (
    d.includes("withdrawal") ||
    d.includes("disabling") ||
    d.includes("fine") ||
    d.includes("admit card") ||
    d.includes("registration") ||
    d.includes("installment") ||
    d.includes("evaluation") ||
    d.includes("council") ||
    d.includes("offering")
  ) {
    return "admin";
  }
  return "general";
};

const parseItems = (rawItems: any[]) => {
  return rawItems.map((it: any) => {
    const content = it?.content || [];
    const dateStr = cleanText(content[0]);
    const descStr = cleanText(content[1]);
    const cat = categorizeEvent(descStr);

    return {
      date: dateStr,
      description: descStr,
      category: cat,
      isHighlight: cat === "exam" || cat === "class" || cat === "semester_break" || cat === "orientation" || cat === "result",
    };
  });
};

const sortSemesters = (semesters: any[]) => {
  return [...semesters].sort((a, b) => {
    const aName = (a.semester || "").toLowerCase();
    const bName = (b.semester || "").toLowerCase();
    const aScore = aName.includes("spring") ? 1 : aName.includes("summer") ? 2 : aName.includes("fall") ? 3 : 4;
    const bScore = bName.includes("spring") ? 1 : bName.includes("summer") ? 2 : bName.includes("fall") ? 3 : 4;
    return aScore - bScore;
  });
};

const MONTH_INDEX_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

const SHORT_MONTH_NAMES = [
  "Jan", "Feb", "March", "April", "May", "June",
  "July", "Aug", "Sept", "Oct", "Nov", "Dec"
];

function parseCalendarDate(dateStr: string, defaultYear: number): Date | null {
  if (!dateStr) return null;
  const clean = dateStr.replace(/\s+/g, " ").trim();
  const yearMatch = clean.match(/202\d/);
  const year = yearMatch ? parseInt(yearMatch[0], 10) : defaultYear;

  const cleanLower = clean.toLowerCase();
  let monthIndex: number | null = null;
  for (const [mStr, mIdx] of Object.entries(MONTH_INDEX_MAP)) {
    if (new RegExp(`\\b${mStr}\\b`, "i").test(cleanLower) || cleanLower.includes(mStr)) {
      monthIndex = mIdx;
      break;
    }
  }
  if (monthIndex === null) return null;

  const noYear = clean.replace(/202\d/g, "");
  const dayMatches = noYear.match(/\b\d{1,2}\b/g);
  if (!dayMatches || dayMatches.length === 0) return null;

  const day = parseInt(dayMatches[0], 10);
  if (isNaN(day) || day < 1 || day > 31) return null;

  return new Date(year, monthIndex, day);
}

// Parses the end date of an examination range (e.g. "June 13 - 20" -> June 20, "Jan 17 - 24, 2027" -> Jan 24 2027)
function parseRangeEndDate(dateStr: string, defaultYear: number): Date | null {
  if (!dateStr) return null;
  const clean = dateStr.replace(/\s+/g, " ").trim();
  const yearMatch = clean.match(/202\d/);
  const year = yearMatch ? parseInt(yearMatch[0], 10) : defaultYear;

  const parts = clean.split(/[-–—]|(?:\bto\b)/);
  const endPart = parts.length > 1 ? parts[parts.length - 1].trim() : clean;
  const startPart = parts[0].trim();

  let monthIndex: number | null = null;
  const endPartLower = endPart.toLowerCase();
  for (const [mStr, mIdx] of Object.entries(MONTH_INDEX_MAP)) {
    if (new RegExp(`\\b${mStr}\\b`, "i").test(endPartLower) || endPartLower.includes(mStr)) {
      monthIndex = mIdx;
      break;
    }
  }

  // If no month found in endPart, inherit from startPart
  if (monthIndex === null) {
    const startPartLower = startPart.toLowerCase();
    for (const [mStr, mIdx] of Object.entries(MONTH_INDEX_MAP)) {
      if (new RegExp(`\\b${mStr}\\b`, "i").test(startPartLower) || startPartLower.includes(mStr)) {
        monthIndex = mIdx;
        break;
      }
    }
  }

  if (monthIndex === null) return null;

  const noYear = endPart.replace(/202\d/g, "");
  const dayMatches = noYear.match(/\b\d{1,2}\b/g);
  if (!dayMatches || dayMatches.length === 0) return null;

  const day = parseInt(dayMatches[dayMatches.length - 1], 10);
  if (isNaN(day) || day < 1 || day > 31) return null;

  return new Date(year, monthIndex, day);
}

function calculateAndInjectSemesterBreaks(
  semesters: any[],
  yearStr: string,
  allCalendarsDb?: Record<string, any[]>
): any[] {
  const baseYear = parseInt(yearStr, 10) || 2026;

  return semesters.map((sem, index) => {
    const semName = sem.semester || "";
    const isFall = /fall/i.test(semName);
    const items = [...(sem.items || [])];

    // If already has an explicit semester_break, do not duplicate
    if (items.some((it) => it.category === "semester_break" || /semester break/i.test(it.description))) {
      return { ...sem, items };
    }

    // 1. Find Final Examination item (last day of Final Examination)
    const finalExamIndex = items.findIndex((it) => {
      const d = (it.description || "").toLowerCase();
      return d.includes("final exam") && !d.includes("admit card") && !d.includes("distribution");
    });
    if (finalExamIndex === -1) {
      return { ...sem, items };
    }
    const finalExamItem = items[finalExamIndex];

    // 2. Find Next Semester Classes Begin item
    let nextClassItem: any = null;

    if (!isFall) {
      // Check inside current semester items (e.g. 'Classes begin of Summer Semester 2026' or 'Classes begin of Fall')
      for (const it of items) {
        const d = (it.description || "").toLowerCase();
        if (d.includes("classes begin") && (d.includes("of summer") || d.includes("of fall") || d.includes("of "))) {
          nextClassItem = it;
          break;
        }
      }

      // If not found inside, check next semester in current year
      if (!nextClassItem && index + 1 < semesters.length) {
        const nextSem = semesters[index + 1];
        nextClassItem = (nextSem.items || []).find((it: any) =>
          /classes begin[s]?\b/i.test(it.description)
        );
      }
    } else {
      // For Fall semester, check if current sem has 'Classes begin of Spring'
      for (const it of items) {
        const d = (it.description || "").toLowerCase();
        if (d.includes("classes begin") && d.includes("spring")) {
          nextClassItem = it;
          break;
        }
      }

      // If not in Fall sem, look up next year's Spring semester in database
      if (!nextClassItem) {
        const nextYearStr = String(baseYear + 1);
        const nextYearSemesters = allCalendarsDb?.[nextYearStr];
        if (Array.isArray(nextYearSemesters)) {
          const springSem = nextYearSemesters.find((s: any) => /spring/i.test(s.semester || ""));
          if (springSem) {
            nextClassItem = (springSem.items || []).find((it: any) =>
              /classes begin[s]?\b/i.test(it.description)
            );
          }
        }
      }
    }

    if (!nextClassItem) {
      return { ...sem, items };
    }

    // Parse Dates: Final Exam End vs Next Classes Begin
    let dtExamEnd = parseRangeEndDate(
      finalExamItem.date,
      isFall && finalExamItem.date.toLowerCase().includes("jan") ? baseYear + 1 : baseYear
    );
    if (isFall && dtExamEnd && dtExamEnd.getMonth() <= 2 && dtExamEnd.getFullYear() === baseYear) {
      dtExamEnd.setFullYear(baseYear + 1);
    }

    let dtClass = parseCalendarDate(nextClassItem.date, isFall ? baseYear + 1 : baseYear);
    if (isFall && dtClass && dtClass.getMonth() <= 2 && dtClass.getFullYear() === baseYear) {
      dtClass.setFullYear(baseYear + 1);
    }

    if (!dtExamEnd || !dtClass) {
      return { ...sem, items };
    }

    // Break start = Day after Final Examination ends
    const breakStart = new Date(dtExamEnd);
    breakStart.setDate(breakStart.getDate() + 1);

    // Break end = Day before Next Classes Begin
    const breakEnd = new Date(dtClass);
    breakEnd.setDate(breakEnd.getDate() - 1);

    const diffTime = breakEnd.getTime() - breakStart.getTime();
    const daysCount = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (daysCount <= 0) {
      return { ...sem, items };
    }

    // Format date string
    const mStart = SHORT_MONTH_NAMES[breakStart.getMonth()];
    const mEnd = SHORT_MONTH_NAMES[breakEnd.getMonth()];
    const sDay = String(breakStart.getDate()).padStart(2, "0");
    const eDay = String(breakEnd.getDate()).padStart(2, "0");

    let formattedDate = "";
    if (breakStart.getMonth() === breakEnd.getMonth() && breakStart.getFullYear() === breakEnd.getFullYear()) {
      formattedDate = breakStart.getDate() === breakEnd.getDate()
        ? `${mStart} ${sDay}`
        : `${mStart} ${sDay} - ${eDay}`;
      if (breakStart.getFullYear() !== baseYear) {
        formattedDate += `, ${breakStart.getFullYear()}`;
      }
    } else {
      const yearSuffix = breakEnd.getFullYear() !== baseYear ? `, ${breakEnd.getFullYear()}` : "";
      formattedDate = `${mStart} ${sDay} - ${mEnd} ${eDay}${yearSuffix}`;
    }

    const dayText = daysCount === 1 ? "1 Day" : `${daysCount} Days`;
    const breakItem = {
      date: formattedDate,
      description: `Semester Break (${dayText})`,
      category: "semester_break",
      isHighlight: true,
    };

    // Insertion position: after Announcement of Exam Results if exists, else after Final Examination
    const announcementIndex = items.findIndex((it) =>
      /announcement of exam result/i.test(it.description)
    );
    const insertAfterIndex = announcementIndex !== -1 && announcementIndex > finalExamIndex
      ? announcementIndex
      : finalExamIndex;

    const updatedItems = [...items];
    updatedItems.splice(insertAfterIndex + 1, 0, breakItem);

    return {
      ...sem,
      items: updatedItems,
    };
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedYear = searchParams.get("year") || "2026";
    const forceSync = searchParams.get("force") === "true";

    const cacheKey = `year_${requestedYear}`;
    const now = Date.now();

    if (!forceSync && cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_TTL_MS) {
      return NextResponse.json({
        ...cache[cacheKey].data,
        cached: true,
      });
    }

    // Attempt to scrape live from SEU website
    let liveAvailableYears: string[] = ["2027", "2026", "2025", "2024", "2023"];
    let scrapedSemesters: any[] | null = null;
    let scrapeSuccess = false;

    try {
      // 1. Fetch main calendar page to discover available years
      const mainRes = await fetch("https://seu.edu.bd/academic-calendar", {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        next: { revalidate: 600 },
      });

      if (mainRes.ok) {
        const mainHtml = await mainRes.text();
        const yearMatches = mainHtml.matchAll(/academic-calendar-(202\d)/g);
        const discovered = Array.from(yearMatches, (m) => m[1]);
        if (discovered.length > 0) {
          liveAvailableYears = Array.from(new Set(discovered)).sort((a, b) => Number(b) - Number(a));
        }
      }

      // 2. Fetch specific year calendar
      const yearUrl = `https://seu.edu.bd/academic-calendar-${requestedYear}`;
      const yearRes = await fetch(yearUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        next: { revalidate: 600 },
      });

      if (yearRes.ok) {
        const yearHtml = await yearRes.text();
        const dataPageMatch = yearHtml.match(/data-page=["']({.*?})["']/);
        if (dataPageMatch) {
          const rawJson = dataPageMatch[1].replace(/&quot;/g, '"');
          const parsedPage = JSON.parse(rawJson);
          const sections = parsedPage?.props?.sections || [];

          // Case A: Nested under pages (e.g. 2026 Tri-Semester)
          for (const sec of sections) {
            const pages = sec?.contents?.module_contents?.pages || [];
            if (pages.length > 0) {
              for (const p of pages) {
                const pName = p?.name || p?.title || "";
                if (pName.includes("Tri") || pages.length === 1) {
                  for (const subSec of p?.sections || []) {
                    const mods = subSec?.contents?.module_contents?.modules || [];
                    if (mods.length > 0) {
                      scrapedSemesters = mods.map((m: any) => ({
                        semester: cleanText(m?.name || m?.title || "Semester"),
                        items: parseItems(m?.module_items || []),
                      }));
                      scrapeSuccess = true;
                      break;
                    }
                  }
                }
                if (scrapeSuccess) break;
              }
            }
            if (scrapeSuccess) break;

            // Case B: Direct dynamic_table in sections (e.g. 2025, 2024, 2023)
            if (sec?.section_name?.includes("dynamic_table")) {
              const mods =
                sec?.contents?.module_contents?.modules ||
                (Array.isArray(sec?.contents) ? sec?.contents : []);
              if (mods.length > 0) {
                scrapedSemesters = mods.map((m: any) => ({
                  semester: cleanText(m?.name || m?.title || "Semester"),
                  items: parseItems(m?.module_items || []),
                }));
                scrapeSuccess = true;
                break;
              }
            }
          }
        }
      }
    } catch (scrapeErr) {
      console.warn("Live scraping from seu.edu.bd encountered warning, using fallback dataset:", scrapeErr);
    }

    // 3. Fallback database
    const calendarsDb = (fallbackCalendars as any).calendars || {};
    const fallbackForYear = calendarsDb[requestedYear] || calendarsDb["2026"] || [];

    const rawSemesters =
      scrapeSuccess && scrapedSemesters && scrapedSemesters.length > 0
        ? sortSemesters(scrapedSemesters)
        : sortSemesters(fallbackForYear);

    // Ensure cleanText and categorizeEvent are strictly enforced on all semester items
    const finalSemesters = rawSemesters.map((sem) => ({
      ...sem,
      items: (sem.items || []).map((it: any) => {
        const desc = cleanText(it.description);
        const cat = categorizeEvent(desc);
        return {
          ...it,
          description: desc,
          category: cat,
          isHighlight: cat === "exam" || cat === "class" || cat === "semester_break" || cat === "orientation" || cat === "result",
        };
      }),
    }));

    // Automatically calculate and inject Semester Break between Exam Results Announcement and Classes Begin
    const semestersWithBreaks = calculateAndInjectSemesterBreaks(
      finalSemesters,
      requestedYear,
      calendarsDb
    );

    // Keep dynamic moving window of the last 4 years (e.g. [2026, 2025, 2024, 2023]. When 2027 comes, 2023 drops)
    const distinctYears = Array.from(new Set([...liveAvailableYears, ...Object.keys(calendarsDb)])).sort(
      (a, b) => Number(b) - Number(a)
    );
    const last4Years = distinctYears.slice(0, 4);

    const responsePayload = {
      success: true,
      year: requestedYear,
      availableYears: last4Years,
      semesters: semestersWithBreaks,
      source: scrapeSuccess ? "Live SEU Official Website (seu.edu.bd)" : "Verified SEU Academic Database",
      isLive: scrapeSuccess,
      lastSynced: new Date().toISOString(),
    };

    cache[cacheKey] = {
      timestamp: now,
      data: responsePayload,
    };

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error("Academic Calendar API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to fetch academic calendar",
        semesters: [],
      },
      { status: 500 }
    );
  }
}
