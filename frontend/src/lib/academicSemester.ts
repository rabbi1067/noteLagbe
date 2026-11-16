/**
 * Southeast University (SEU) Academic Semester & Title Utility
 *
 * Southeast University operates on a 3-semester calendar per year:
 * 1. Spring: January - April (Months 0 - 3)
 * 2. Summer: May - August (Months 4 - 7)
 * 3. Fall: September - December (Months 8 - 11)
 *
 * Automatically progresses semester-by-semester (Spring 2027 -> Summer 2027 -> Fall 2027 -> Spring 2028...)
 * without any hardcoded year limits.
 */

export type Season = "Spring" | "Summer" | "Fall";

export function getCurrentAcademicSemester(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = Jan, 11 = Dec
  if (month <= 3) {
    return `Spring ${year}`;
  } else if (month <= 7) {
    return `Summer ${year}`;
  } else {
    return `Fall ${year}`;
  }
}

export interface SemesterChip {
  name: string;
  isCurrent: boolean;
  labelBn?: string;
  labelEn?: string;
}

/**
 * Returns ordered semester options around the given date:
 * Next Semester (Upcoming) -> Current Semester -> Previous Semesters
 */
export function getRecentAcademicSemesters(date: Date = new Date()): SemesterChip[] {
  const current = getCurrentAcademicSemester(date);
  const [currentSeason, currentYearStr] = current.split(" ");
  const year = parseInt(currentYearStr, 10) || date.getFullYear();
  const seasons: Season[] = ["Spring", "Summer", "Fall"];
  let seasonIdx = seasons.indexOf(currentSeason as Season);
  if (seasonIdx === -1) seasonIdx = 2; // Fall default

  // 1. Next upcoming semester
  const nextSeasonIdx = (seasonIdx + 1) % 3;
  const nextYear = seasonIdx === 2 ? year + 1 : year;
  const nextName = `${seasons[nextSeasonIdx]} ${nextYear}`;

  const chips: SemesterChip[] = [
    {
      name: nextName,
      isCurrent: false,
      labelBn: "আসন্ন",
      labelEn: "Upcoming",
    },
    {
      name: current,
      isCurrent: true,
      labelBn: "চলতি",
      labelEn: "Current",
    },
  ];

  // 2. 4 Past semesters
  let prevSeasonIdx = seasonIdx;
  let prevYear = year;
  for (let i = 0; i < 4; i++) {
    prevSeasonIdx = (prevSeasonIdx - 1 + 3) % 3;
    if (prevSeasonIdx === 2) {
      prevYear -= 1;
    }
    chips.push({
      name: `${seasons[prevSeasonIdx]} ${prevYear}`,
      isCurrent: false,
    });
  }

  return chips;
}

/**
 * Returns exactly 2 dynamic quick-pick semesters based on current academic calendar:
 * [Previous Semester, Current Semester]
 * e.g. ["Summer 2026", "Fall 2026"] in Fall 2026
 * -> automatically transitions to ["Fall 2026", "Spring 2027"] in Spring 2027
 * -> ["Spring 2027", "Summer 2027"] in Summer 2027
 * -> ["Fall 2027", "Spring 2028"] in 2028
 */
export function getTwoQuickSemesters(date: Date = new Date()): [string, string] {
  const current = getCurrentAcademicSemester(date);
  const [currentSeason, currentYearStr] = current.split(" ");
  const year = parseInt(currentYearStr, 10) || date.getFullYear();
  const seasons: Season[] = ["Spring", "Summer", "Fall"];
  let seasonIdx = seasons.indexOf(currentSeason as Season);
  if (seasonIdx === -1) seasonIdx = 2; // Fall default

  // Previous semester
  const prevSeasonIdx = (seasonIdx - 1 + 3) % 3;
  const prevYear = prevSeasonIdx === 2 ? year - 1 : year;
  const prevName = `${seasons[prevSeasonIdx]} ${prevYear}`;

  // Return chronologically [Previous Semester, Current Semester]
  return [prevName, current];
}

/**
 * Returns a rolling list of academic semesters spanning the past 2 years plus upcoming semester:
 * Automatically advances year by year (e.g. 2026, 2027, 2028...) without any hardcoded dates.
 */
export function getRollingAcademicSemesters(date: Date = new Date(), pastYears: number = 2): string[] {
  const current = getCurrentAcademicSemester(date);
  const [currentSeason, currentYearStr] = current.split(" ");
  const year = parseInt(currentYearStr, 10) || date.getFullYear();
  const seasons: Season[] = ["Spring", "Summer", "Fall"];
  let seasonIdx = seasons.indexOf(currentSeason as Season);
  if (seasonIdx === -1) seasonIdx = 2;

  // 1. Next upcoming semester
  const nextSeasonIdx = (seasonIdx + 1) % 3;
  const nextYear = seasonIdx === 2 ? year + 1 : year;
  const nextName = `${seasons[nextSeasonIdx]} ${nextYear}`;

  const list: string[] = [nextName];

  // 2. From current down through pastYears
  let sIdx = seasonIdx;
  let yr = year;
  const minYear = year - pastYears;

  while (yr >= minYear) {
    list.push(`${seasons[sIdx]} ${yr}`);
    sIdx--;
    if (sIdx < 0) {
      sIdx = 2;
      yr--;
    }
  }

  return list;
}

/**
 * Standard concise academic resource type names:
 * e.g. "Midterm Question", "Final Question", "Lecture Handnote"
 */
export function getShortResourceTypeName(resourceType: string): string {
  const map: Record<string, string> = {
    MID_QUESTION: "Midterm Question",
    FINAL_QUESTION: "Final Question",
    NOTE: "Lecture Handnote",
    QUIZ_CT: "Quiz & CT Question",
    LAB_MANUAL: "Lab Manual",
    LAB_REPORT: "Lab Report",
    LAB_QUIZ: "Lab Quiz",
    LAB_FINAL: "Lab Final Question",
    QUESTION_COURSE_IN: "Course-In Material",
    OTHERS: "Study Material",
  };
  return map[resourceType] || "Academic Material";
}

/**
 * Builds clean, concise academic title:
 * "[CourseCode] [ShortResourceType]" -> e.g. "CSE141 Midterm Question"
 */
export function buildConciseAcademicTitle(
  courseCode: string,
  resourceType: string,
  _sem?: string,
  _courseTitle?: string,
  instanceIndex?: number
): string {
  const cleanCode = (courseCode || "CSE").toUpperCase().trim();
  const shortType = getShortResourceTypeName(resourceType);
  if ((resourceType === "QUIZ_CT" || resourceType === "LAB_QUIZ") && typeof instanceIndex === "number" && instanceIndex > 0) {
    return `${cleanCode} ${shortType} ${instanceIndex}`;
  }
  return `${cleanCode} ${shortType}`;
}

/**
 * Formats a clean, non-duplicate semester and year label.
 * Prevents issues like "Summer 2026 (2026)" or "Fall 2026 2026".
 * Examples:
 * - formatSemesterDisplay("Summer 2026", 2026) -> "Summer 2026"
 * - formatSemesterDisplay("Summer 2026 (2026)", 2026) -> "Summer 2026"
 * - formatSemesterDisplay("Summer", 2026) -> "Summer 2026"
 * - formatSemesterDisplay(null, 2026) -> "Semester 2026"
 * - formatSemesterDisplay(null, null) -> "Fall 2026"
 */
export function formatSemesterDisplay(
  semesterName?: string | null,
  academicYear?: number | string | null
): string {
  let sem = (semesterName || "").trim();

  // 1. Remove redundant parenthesized year at the end, e.g. "Summer 2026 (2026)" -> "Summer 2026"
  sem = sem.replace(/\s*\(\s*\d{4}\s*\)/g, "").trim();

  // 2. Remove duplicate consecutive year, e.g. "Summer 2026 2026" -> "Summer 2026"
  sem = sem.replace(/\b(19\d\d|20\d\d)\s+\1\b/g, "$1").trim();

  // 3. If already contains a valid 4-digit year (e.g. "Summer 2026", "Fall 2025")
  if (/\b(19\d\d|20\d\d)\b/.test(sem)) {
    return sem;
  }

  // 4. If only season name is present (e.g. "Summer", "Fall", "Spring") and academicYear is provided
  if (sem && academicYear) {
    return `${sem} ${academicYear}`;
  }

  if (sem) {
    return sem;
  }

  return academicYear ? `Semester ${academicYear}` : "Fall 2026";
}

