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
  _courseTitle?: string
): string {
  const cleanCode = (courseCode || "CSE").toUpperCase().trim();
  const shortType = getShortResourceTypeName(resourceType);
  return `${cleanCode} ${shortType}`;
}
