import { getSeuCourseTitle } from "@/data/seuCourseTitles";

export interface ParsedTimeSlot {
  day: string;
  start: string;
  end: string;
  room: string;
  startMinutes: number;
  endMinutes: number;
}

export interface ParsedOfferedSection {
  courseCode: string;
  sectionNumber: string;
  courseTitle: string;
  credits: number;
  facultyInitial: string;
  facultyName: string;
  availableSeats: number;
  scheduleText: string;
  slots: ParsedTimeSlot[];
  semester?: string;
}

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

export function normalizeTimeString(raw: string): string {
  if (!raw) return "00:00";
  const clean = raw.trim();
  const m = clean.match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/);
  if (!m) return clean;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const meridian = m[3] ? m[3].toUpperCase() : null;
  if (meridian === "PM" && h < 12) h += 12;
  if (meridian === "AM" && h === 12) h = 0;
  return `${h < 10 ? "0" + h : h}:${min}`;
}

export function normalizeDayName(d: string): string {
  const upper = d.trim().toUpperCase();
  if (upper.startsWith("SUN")) return "SUN";
  if (upper.startsWith("MON")) return "MON";
  if (upper.startsWith("TUE")) return "TUE";
  if (upper.startsWith("WED")) return "WED";
  if (upper.startsWith("THU")) return "THU";
  if (upper.startsWith("FRI")) return "FRI";
  if (upper.startsWith("SAT")) return "SAT";
  return upper;
}

export function extractSlotsFromChunk(chunk: string): ParsedTimeSlot[] {
  const slots: ParsedTimeSlot[] = [];

  // Pattern 1: Paired or multiple days on single line (e.g. SUN, TUE # 08:30 ~ 09:50 @ SEU333 or SUN+TUE 8:30 AM - 9:50 AM)
  const pairedPattern = /(?:^|[\r\n\s|/])((?:SUN(?:DAY)?|MON(?:DAY)?|TUE(?:SDAY)?|WED(?:NESDAY)?|THU(?:RSDAY)?|FRI(?:DAY)?|SAT(?:URDAY)?)(?:\s*[,+&/]\s*(?:SUN(?:DAY)?|MON(?:DAY)?|TUE(?:SDAY)?|WED(?:NESDAY)?|THU(?:RSDAY)?|FRI(?:DAY)?|SAT(?:URDAY)?))+)\s*#?\s*([0-9]{1,2}:[0-9]{2}(?:\s*[AaPp][Mm])?)\s*(?:~|---|--|–|—|-|to)\s*([0-9]{1,2}:[0-9]{2}(?:\s*[AaPp][Mm])?)(?:\s*@?\s*([A-Za-z0-9_-]+))?/gi;

  let pm: RegExpExecArray | null;
  while ((pm = pairedPattern.exec(chunk)) !== null) {
    const rawDays = pm[1].split(/[,+&/]/).map((d) => normalizeDayName(d.trim())).filter(Boolean);
    const start = normalizeTimeString(pm[2]);
    const end = normalizeTimeString(pm[3]);
    const room = pm[4] ? pm[4].trim() : "SEU-TBA";

    for (const d of rawDays) {
      slots.push({
        day: d,
        start,
        end,
        room,
        startMinutes: timeToMinutes(start),
        endMinutes: timeToMinutes(end),
      });
    }
  }

  // Pattern 2: Single day format (e.g. SUN # 08:30 ~ 09:50 @ SEU333 or SAT 08:00 - 10:00 @ SEU608)
  const singlePattern = /(?:^|[\r\n\s|/])(SUN(?:DAY)?|MON(?:DAY)?|TUE(?:SDAY)?|WED(?:NESDAY)?|THU(?:RSDAY)?|FRI(?:DAY)?|SAT(?:URDAY)?)\s*#?\s*([0-9]{1,2}:[0-9]{2}(?:\s*[AaPp][Mm])?)\s*(?:~|---|--|–|—|-|to)\s*([0-9]{1,2}:[0-9]{2}(?:\s*[AaPp][Mm])?)(?:\s*@?\s*([A-Za-z0-9_-]+))?/gi;

  let sm: RegExpExecArray | null;
  while ((sm = singlePattern.exec(chunk)) !== null) {
    const d = normalizeDayName(sm[1]);
    const start = normalizeTimeString(sm[2]);
    const end = normalizeTimeString(sm[3]);
    const room = sm[4] ? sm[4].trim() : "SEU-TBA";

    // Avoid duplicate if already matched by pairedPattern
    const alreadyExists = slots.some(
      (s) => s.day === d && s.start === start && s.end === end
    );
    if (!alreadyExists) {
      slots.push({
        day: d,
        start,
        end,
        room,
        startMinutes: timeToMinutes(start),
        endMinutes: timeToMinutes(end),
      });
    }
  }

  return slots;
}

/**
 * Robust SEU UMS Advising Data Auto-Parser.
 * Handles:
 * 1. Multi-line raw copy-paste from UMS portal (e.g. WED # 15:00 ~ 16:20 \n REGULAR \n MAT261.10 \n Linear Algebra \n 3 \n [SAMD] Shifat Ahmed \n 6 \n SAT # 08:30 ~ 09:50 @ SEU536)
 * 2. TSV / Tabular rows copied from browser table
 * 3. Raw UMS HTML source code (ums-grid-offered-section or standard table tags)
 * 4. Space-separated or dash-separated section codes (e.g. CSE181.1, CSE 181.1, CSE-181.1)
 */
export function autoParseAdvisingText(input: string, semester = "Spring 2026"): ParsedOfferedSection[] {
  if (!input || !input.trim()) return [];

  let text = input.trim();

  // If input contains HTML tags, strip tags while preserving newlines
  if (text.includes("<") && text.includes(">")) {
    text = text
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:div|p|tr|li|td|h\d)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"');
  }

  // Regex to detect course code + section number: e.g. "CSE181.1", "MAT261.10", "CSE 181.01", "ACT141.2"
  const secRegex = /(?:^|[\r\n\s|\t,;<>(])([A-Z]{2,5}\s*\d{2,4})\s*(?:\.|\s*-\s*|\s+sec(?:tion)?\s*|\s+#\s*)\s*(\d{1,3})(?:[\r\n\s|\t,;<>)]|$)/gi;

  const matches: { index: number; code: string; sec: string }[] = [];
  let m: RegExpExecArray | null;

  while ((m = secRegex.exec(text)) !== null) {
    const rawCode = m[1].replace(/\s+/g, "").toUpperCase();
    const rawSec = String(parseInt(m[2].trim(), 10)); // normalize "01" -> "1"
    matches.push({
      index: m.index,
      code: rawCode,
      sec: rawSec,
    });
  }

  if (matches.length === 0) {
    return [];
  }

  const results: ParsedOfferedSection[] = [];
  const facPattern = /\[([A-Za-z0-9_-]{2,8})\]\s*([^\n\r0-9<]+)?/;
  const credPattern = /(?:^|[\r\n\s|\t])(1\.0|1\.5|2\.0|3\.0|4\.0|1|2|3|4)(?:[\r\n\s|\t]|$)/;

  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const next = matches[i + 1];
    const chunk = text.substring(cur.index, next ? next.index : text.length).trim();

    // 1. Extract Time Slots (supports paired days, AM/PM, and standard formats)
    const slots: ParsedTimeSlot[] = extractSlotsFromChunk(chunk);

    // 2. Extract Faculty Initial and Full Name
    let facInit = "TBA";
    let facName = "To Be Announced";
    const facM = chunk.match(facPattern);
    if (facM) {
      facInit = facM[1].trim().toUpperCase();
      if (facM[2] && facM[2].trim()) {
        facName = facM[2].trim().replace(/\s+/g, " ");
      }
    }

    // 3. Extract Credits
    let credits = 3.0;
    const isLab =
      cur.code.endsWith("2") ||
      cur.code.endsWith("4") ||
      cur.code.endsWith("6") ||
      cur.code.endsWith("8");
    if (isLab) credits = 1.0;

    const credM = chunk.match(credPattern);
    if (credM) {
      const parsedCred = parseFloat(credM[1]);
      if (!isNaN(parsedCred) && parsedCred >= 1.0 && parsedCred <= 4.0) {
        credits = parsedCred;
      }
    }

    // 4. Extract Available Seats
    let availableSeats = 40;
    const seatsM = chunk.match(/(?:^|[\r\n\s|\t])(\d{1,3})\s*(?:Seats?|seats?|Available|available|capacity)?(?:[\r\n\s|\t]|$)/);
    if (seatsM) {
      const parsedSeats = parseInt(seatsM[1], 10);
      if (!isNaN(parsedSeats) && parsedSeats >= 0 && parsedSeats <= 100) {
        availableSeats = parsedSeats;
      }
    }

    // 5. Extract Course Title
    let title = "";
    if (chunk.includes("\t")) {
      const cols = chunk.split("\t");
      if (cols.length >= 2) {
        const candidate = cols[1].replace(/\[.*?\]/g, "").replace(/\d+/g, "").trim();
        if (candidate.length >= 3 && !/^(CSE|EEE|BBA|MAT|ACT|ENG|THU|MON|TUE|WED|FRI|SAT)/i.test(candidate)) {
          title = candidate;
        }
      }
    }

    if (!title) {
      const lines = chunk
        .split(/[\r\n]+/)
        .map((l) => l.trim())
        .filter(Boolean);

      for (const line of lines) {
        const upper = line.toUpperCase();
        if (
          upper.includes(cur.code) ||
          upper === "REGULAR" ||
          upper.includes("PREREGISTERED") ||
          upper.includes("RETAKE") ||
          upper.includes("[") ||
          /^\d+$/.test(line) ||
          upper.startsWith("SUN") ||
          upper.startsWith("MON") ||
          upper.startsWith("TUE") ||
          upper.startsWith("WED") ||
          upper.startsWith("THU") ||
          upper.startsWith("FRI") ||
          upper.startsWith("SAT") ||
          upper === "CSE." ||
          upper === "CSE" ||
          upper === "EEE" ||
          upper === "BBA"
        ) {
          continue;
        }

        const candidate = line
          .replace(/\[.*?\]/g, "")
          .replace(/\d+\s*(?:Cr|cr|Credits)?/g, "")
          .replace(/&amp;/g, "&")
          .trim();

        if (candidate.length >= 3) {
          title = candidate;
          break;
        }
      }
    }

    // Fallback to official dictionary title if available
    title = getSeuCourseTitle(cur.code, title);

    const scheduleSummary = slots.length > 0
      ? slots.map((s) => `${s.day} # ${s.start} ~ ${s.end} @ ${s.room}`).join(" / ")
      : "Schedule TBA";

    results.push({
      courseCode: cur.code,
      sectionNumber: cur.sec,
      courseTitle: title,
      credits,
      facultyInitial: facInit,
      facultyName: facName,
      availableSeats,
      scheduleText: scheduleSummary,
      slots,
      semester,
    });
  }

  return results;
}

export const SAMPLE_SEU_RAW_ADVISING_TEXT = `WED # 15:00 ~ 16:20 @ SEU536

REGULAR
Preregistered Course.
MAT261.10
Linear Algebra and Matrices
3
[SAMD] Shifat Ahmed
6
SAT # 08:30 ~ 09:50 @ SEU536

THU # 08:30 ~ 09:50 @ SEU536

REGULAR
Preregistered Course.
CSE261.1
Numerical Methods
3
[FUZ] Farhad Uz Zaman
12
SUN # 08:30 ~ 09:50 @ SEU333

TUE # 08:30 ~ 09:50 @ SEU333

REGULAR
Preregistered Course.
CSE261.2
Numerical Methods
3
[GM] Golam Mostafa
15
MON # 15:00 ~ 16:20 @ SEU406

WED # 15:00 ~ 16:20 @ SEU406

REGULAR
Preregistered Course.
CSE181.1
Discrete Mathematics
3
[KMU] Khandaker Mohammad Mohi Uddin
0
THU # 11:30 ~ 12:50 @ SEU510

SAT # 11:30 ~ 12:50 @ SEU510

REGULAR
Preregistered Course.
CSE181.2
Discrete Mathematics
3
[KMU] Khandaker Mohammad Mohi Uddin
13
THU # 10:00 ~ 11:20 @ SEU406

SAT # 10:00 ~ 11:20 @ SEU406

REGULAR
Preregistered Course.
CSE181.4
Discrete Mathematics
3
[MAHB] Mahbub Hasan
28
MON # 08:30 ~ 09:50 @ SEU406

WED # 08:30 ~ 09:50 @ SEU406

REGULAR
Preregistered Course.
CSE181.5
Discrete Mathematics
3
[MAHB] Mahbub Hasan
15
MON # 10:00 ~ 11:20 @ SEU324

WED # 10:00 ~ 11:20 @ SEU324

REGULAR
Preregistered Course.
CSE381.1
Introduction to Data Science
3
[DSI] Data Science Instructor
22
SUN # 08:30 ~ 09:50 @ SEU535

TUE # 08:30 ~ 09:50 @ SEU535

REGULAR
Preregistered Course.
CSE355.3
Digital Image Processing
3
[FAR] Faculty Architecture
19
MON # 08:30 ~ 09:50 @ SEU527

WED # 08:30 ~ 09:50 @ SEU527

REGULAR
Preregistered Course.
CSE444.8
Computer Graphics Lab
1
[NIR1] Lab Instructor
18
SAT # 08:00 ~ 10:00 @ SEU608
`;
