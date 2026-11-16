"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

export interface DuplicateSlotItem {
  id: number;
  title: string;
  titleKey?: string;
  type: string;
  semesterName: string;
  normalizedSemester?: string;
  semesterKey?: string;
  status: string;
  courseCode?: string;
  teacherId: number | null;
  teacherName?: string | null;
  singleSlotExam?: boolean;
}

export interface DuplicateCheckResult {
  duplicate: boolean;
  normalizedSemester: string;
  singleSlotExam: boolean;
  existingResourceId?: number;
  existingTitle?: string;
  existingType?: string;
  existingSemester?: string;
  existingStatus?: string;
  existingCourseCode?: string;
  existingTeacherName?: string;
  message: string | null;
}

interface UseDuplicateResourceCheckParams {
  enabled: boolean;
  prefetchEnabled?: boolean;
  courseCode?: string;
  teacherId?: number | string | null;
  type?: string;
  semesterName?: string;
  title?: string;
  excludeId?: number | null;
  seedSlots?: DuplicateSlotItem[];
  language?: string;
}

const SINGLE_SLOT_EXAM_TYPES = new Set(["MID_QUESTION", "FINAL_QUESTION", "LAB_FINAL"]);
const MULTI_INSTANCE_SEMESTER_TYPES = new Set(["QUIZ_CT", "LAB_QUIZ"]);
const SLOT_CACHE_TTL_MS = 20_000;

const SEASON_FIRST_REGEX =
  /^\s*(spring|spr|summer|sum|smr|fall|fal|autumn|aut|winter|win)[\s\-_/'.,]*(\d{2}|\d{4})\s*$/i;
const YEAR_FIRST_REGEX =
  /^\s*(\d{2}|\d{4})[\s\-_/'.,]*(spring|spr|summer|sum|smr|fall|fal|autumn|aut|winter|win)\s*$/i;

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  NOTE: "Lecture Note",
  QUESTION_COURSE_IN: "Course-In Material",
  MID_QUESTION: "Midterm Question Paper",
  FINAL_QUESTION: "Final Exam Paper",
  QUIZ_CT: "Quiz / Class Test",
  DOC_NOTE: "Document Note",
  PROJECT_LINK: "Project Link",
  LAB_MANUAL: "Lab Manual",
  LAB_QUIZ: "Lab Quiz",
  LAB_FINAL: "Lab Final Exam Paper",
  LAB_REPORT: "Lab Report",
  LAB_HAND_NOTE: "Lab Hand Note",
  SYLLABUS: "Syllabus",
  OTHERS: "Material",
};

const courseSlotCache = new Map<string, { items: DuplicateSlotItem[]; fetchedAt: number }>();
const inFlightSlotRequests = new Map<string, Promise<DuplicateSlotItem[] | null>>();

if (typeof window !== "undefined") {
  window.addEventListener("notelagbe:sync-data", () => {
    courseSlotCache.clear();
  });
}

export function invalidateDuplicateSlotCache(courseCode?: string) {
  if (courseCode && courseCode.trim()) {
    courseSlotCache.delete(courseCode.trim().toLowerCase());
    return;
  }
  courseSlotCache.clear();
}

function canonicalSeasonClient(token: string): string {
  const lower = token.toLowerCase();
  if (lower.startsWith("spr")) return "Spring";
  if (lower.startsWith("sum") || lower === "smr") return "Summer";
  if (lower.startsWith("fal") || lower.startsWith("aut")) return "Fall";
  if (lower.startsWith("win")) return "Winter";
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function canonicalYearClient(rawYear: string): string {
  return rawYear.length === 2 ? `20${rawYear}` : rawYear;
}

export function normalizeSemesterNameClient(raw?: string): string {
  if (!raw) return "";
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";

  const seasonFirst = trimmed.match(SEASON_FIRST_REGEX);
  if (seasonFirst) {
    return `${canonicalSeasonClient(seasonFirst[1])} ${canonicalYearClient(seasonFirst[2])}`;
  }

  const yearFirst = trimmed.match(YEAR_FIRST_REGEX);
  if (yearFirst) {
    return `${canonicalSeasonClient(yearFirst[2])} ${canonicalYearClient(yearFirst[1])}`;
  }

  return trimmed;
}

function semesterComparisonKeyClient(raw?: string): string {
  const normalized = normalizeSemesterNameClient(raw);
  if (!normalized) return "";
  return normalized.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function titleComparisonKeyClient(raw?: string): string {
  if (!raw) return "";
  return raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function parseTeacherId(raw?: number | string | null): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
}

function buildDuplicateResultFromSlot(
  slot: DuplicateSlotItem,
  courseCode: string,
  canonicalSemester: string,
  singleSlot: boolean
): DuplicateCheckResult {
  const displaySemester =
    canonicalSemester || slot.normalizedSemester || normalizeSemesterNameClient(slot.semesterName);
  const teacherName = slot.teacherName || "Central Exam (All Sections)";
  const typeLabel = RESOURCE_TYPE_LABELS[slot.type] || "Material";
  const isPending = slot.status === "PENDING";
  const statusPhrase = isPending
    ? "is already submitted and waiting for admin review"
    : "is already uploaded";
  const codeDisplay = slot.courseCode || courseCode.toUpperCase();

  const message = singleSlot
    ? `Duplicate detected: ${typeLabel} for ${codeDisplay} (${teacherName}) in ${displaySemester} ${statusPhrase} ("${slot.title}").`
    : `Duplicate detected: "${slot.title}" (${typeLabel}) for ${codeDisplay} (${teacherName}) in ${displaySemester} ${statusPhrase}.`;

  return {
    duplicate: true,
    normalizedSemester: displaySemester,
    singleSlotExam: singleSlot,
    existingResourceId: slot.id,
    existingTitle: slot.title,
    existingType: slot.type,
    existingSemester: slot.semesterName,
    existingStatus: slot.status,
    existingCourseCode: codeDisplay,
    existingTeacherName: teacherName,
    message,
  };
}

function matchDuplicateLocally(
  slots: DuplicateSlotItem[],
  params: {
    courseCode: string;
    teacherId: number | null;
    type: string;
    semesterName: string;
    title: string;
    excludeId?: number | null;
  }
): DuplicateCheckResult {
  const canonicalSemester = normalizeSemesterNameClient(params.semesterName);
  const semesterKey = semesterComparisonKeyClient(canonicalSemester);
  const titleKey = titleComparisonKeyClient(params.title);
  const singleSlot = SINGLE_SLOT_EXAM_TYPES.has(params.type);

  // Quizzes & Class Tests are faculty-administered and frequently have multiple
  // distinct tests (CT 1, CT 2, CT 3, Section A, Section B) within the exact same semester.
  // Multiple questions in the same semester are explicitly permitted and must never be blocked.
  if (MULTI_INSTANCE_SEMESTER_TYPES.has(params.type)) {
    return {
      duplicate: false,
      normalizedSemester: canonicalSemester,
      singleSlotExam: false,
      message: null,
    };
  }

  if (!params.courseCode || !params.type || !semesterKey || (!singleSlot && !titleKey)) {
    return {
      duplicate: false,
      normalizedSemester: canonicalSemester,
      singleSlotExam: singleSlot,
      message: null,
    };
  }

  for (const existing of slots) {
    if (params.excludeId && Number(existing.id) === Number(params.excludeId)) {
      continue;
    }
    if (existing.status === "REJECTED") {
      continue;
    }
    if ((existing.type || "").toUpperCase() !== params.type) {
      continue;
    }
    const existingTeacherId = existing.teacherId && Number(existing.teacherId) > 0 ? Number(existing.teacherId) : null;
    if (existingTeacherId !== params.teacherId) {
      continue;
    }
    const existingSemKey = existing.semesterKey || semesterComparisonKeyClient(existing.semesterName);
    if (existingSemKey !== semesterKey) {
      continue;
    }
    if (!singleSlot) {
      const existingTitleKey = existing.titleKey || titleComparisonKeyClient(existing.title);
      if (existingTitleKey !== titleKey) {
        continue;
      }
    }
    return buildDuplicateResultFromSlot(existing, params.courseCode, canonicalSemester, singleSlot);
  }

  return {
    duplicate: false,
    normalizedSemester: canonicalSemester,
    singleSlotExam: singleSlot,
    message: null,
  };
}

async function fetchCourseSlotsCached(courseCode: string): Promise<DuplicateSlotItem[] | null> {
  const key = courseCode.trim().toLowerCase();
  if (!key) return null;

  const existing = courseSlotCache.get(key);
  if (existing && Date.now() - existing.fetchedAt < SLOT_CACHE_TTL_MS) {
    return existing.items;
  }

  if (inFlightSlotRequests.has(key)) {
    return inFlightSlotRequests.get(key)!;
  }

  const reqPromise = (async () => {
    try {
      const res = await api.resources.getDuplicateSlots(courseCode.trim());
      const items = Array.isArray(res?.items) ? res.items : [];
      courseSlotCache.set(key, { items, fetchedAt: Date.now() });
      return items;
    } catch {
      return null;
    } finally {
      inFlightSlotRequests.delete(key);
    }
  })();

  inFlightSlotRequests.set(key, reqPromise);
  return reqPromise;
}

/**
 * Ultra-fast live duplicate-material detector:
 * - Prefetches active slots once per courseCode (into browser RAM) so keystroke matching runs in <1ms
 * - Accepts optional in-memory seedSlots (e.g. Admin Console already-loaded list) for 0ms instant checks
 * - Falls back cleanly to /resources/check-duplicate when needed
 */
export function useDuplicateResourceCheck({
  enabled,
  prefetchEnabled,
  courseCode,
  teacherId,
  type,
  semesterName,
  title,
  excludeId,
  seedSlots,
  language = "en",
}: UseDuplicateResourceCheckParams) {
  const cleanCourse = (courseCode || "").trim();
  const cleanType = (type || "").trim().toUpperCase();
  const cleanSemester = (semesterName || "").trim();
  const cleanTitle = (title || "").trim();
  const parsedTeacherId = parseTeacherId(teacherId);
  const isSingleSlot = SINGLE_SLOT_EXAM_TYPES.has(cleanType);
  const shouldPrefetch = prefetchEnabled ?? enabled;

  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateCheckResult | null>(null);
  const [courseSlotsState, setCourseSlotsState] = useState<{
    courseKey: string;
    items: DuplicateSlotItem[] | null;
    failed: boolean;
  }>({ courseKey: "", items: null, failed: false });

  const requestSeqRef = useRef(0);
  const lastToastedKeyRef = useRef("");

  const isMultiInstance = MULTI_INSTANCE_SEMESTER_TYPES.has(cleanType);

  const isEligible =
    enabled &&
    !isMultiInstance &&
    cleanCourse.length > 0 &&
    cleanType.length > 0 &&
    cleanSemester.length >= 3 &&
    (isSingleSlot || cleanTitle.length >= 2);

  const notifyDuplicateToast = useCallback(
    (res: DuplicateCheckResult) => {
      const sig = [
        res.existingResourceId ?? "",
        cleanCourse.toUpperCase(),
        parsedTeacherId ?? "CENTRAL",
        cleanType,
        res.normalizedSemester || cleanSemester,
        isSingleSlot ? "" : cleanTitle.toLowerCase(),
      ].join("|");

      if (sig === lastToastedKeyRef.current) return;
      lastToastedKeyRef.current = sig;

      const headline =
        language === "bn"
          ? "ডুপ্লিকেট ম্যাটেরিয়াল পাওয়া গেছে!"
          : "Duplicate Material Already Exists!";
      const desc =
        res.message ||
        (language === "bn"
          ? "এই কোর্স, শিক্ষক ও সেমিস্টারে একই ম্যাটেরিয়াল আগেই আপলোড করা হয়েছে।"
          : "This resource already exists for the selected course, faculty, and semester.");

      toast.error(headline, {
        id: "duplicate-material-alert",
        description: desc,
        duration: 6000,
      });
    },
    [cleanCourse, parsedTeacherId, cleanType, cleanSemester, cleanTitle, isSingleSlot, language]
  );

  // Prefetch per-course slot index immediately when courseCode changes (even before semester is typed!)
  useEffect(() => {
    const courseKey = cleanCourse.toLowerCase();
    if (!shouldPrefetch || !courseKey) {
      return;
    }

    const cached = courseSlotCache.get(courseKey);
    if (cached && Date.now() - cached.fetchedAt < SLOT_CACHE_TTL_MS) {
      setCourseSlotsState({ courseKey, items: cached.items, failed: false });
      return;
    }

    let cancelled = false;
    fetchCourseSlotsCached(cleanCourse).then((items) => {
      if (cancelled) return;
      if (items !== null) {
        setCourseSlotsState({ courseKey, items, failed: false });
      } else {
        setCourseSlotsState({ courseKey, items: null, failed: true });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [shouldPrefetch, cleanCourse]);

  // Merge prefetched backend slots + optional instant local seedSlots (Admin Console RAM list)
  const effectiveSlots = useMemo<DuplicateSlotItem[] | null>(() => {
    const courseKey = cleanCourse.toLowerCase();
    const fetchedForCourse =
      courseSlotsState.courseKey === courseKey ? courseSlotsState.items : null;

    if (!seedSlots || seedSlots.length === 0) {
      return fetchedForCourse;
    }
    if (!fetchedForCourse) {
      return seedSlots;
    }

    const byId = new Map<number, DuplicateSlotItem>();
    for (const s of seedSlots) {
      if (s?.id) byId.set(Number(s.id), s);
    }
    for (const f of fetchedForCourse) {
      if (f?.id) byId.set(Number(f.id), f);
    }
    return Array.from(byId.values());
  }, [cleanCourse, courseSlotsState, seedSlots]);

  // Zero-latency synchronous check when local slots are available; fast fallback otherwise
  useEffect(() => {
    if (!enabled) {
      lastToastedKeyRef.current = "";
    }

    if (!isEligible) {
      requestSeqRef.current += 1;
      setCheckingDuplicate(false);
      setDuplicateInfo(null);
      if (!enabled || cleanSemester.length < 3) {
        lastToastedKeyRef.current = "";
      }
      return;
    }

    if (effectiveSlots !== null) {
      const localMatch = matchDuplicateLocally(effectiveSlots, {
        courseCode: cleanCourse,
        teacherId: parsedTeacherId,
        type: cleanType,
        semesterName: cleanSemester,
        title: cleanTitle,
        excludeId,
      });
      setCheckingDuplicate(false);
      if (localMatch.duplicate) {
        setDuplicateInfo(localMatch);
        notifyDuplicateToast(localMatch);
      } else {
        setDuplicateInfo(null);
        lastToastedKeyRef.current = "";
      }
      return;
    }

    // If prefetch is still resolving cleanly and has not failed, wait briefly for prefetch instead of doubling traffic
    if (!courseSlotsState.failed) {
      setDuplicateInfo(null);
      setCheckingDuplicate(true);
      return;
    }

    // Fallback: direct API check if slot prefetch failed
    const seq = ++requestSeqRef.current;
    setDuplicateInfo(null);
    setCheckingDuplicate(true);

    const timer = window.setTimeout(async () => {
      try {
        const res = await api.resources.checkDuplicate({
          courseCode: cleanCourse,
          teacherId: parsedTeacherId,
          type: cleanType,
          semesterName: cleanSemester,
          title: cleanTitle,
          excludeId: excludeId ?? null,
        });
        if (seq !== requestSeqRef.current) return;

        if (res?.duplicate) {
          setDuplicateInfo(res);
          notifyDuplicateToast(res);
        } else {
          setDuplicateInfo(null);
          lastToastedKeyRef.current = "";
        }
      } catch {
        if (seq === requestSeqRef.current) {
          setDuplicateInfo(null);
        }
      } finally {
        if (seq === requestSeqRef.current) {
          setCheckingDuplicate(false);
        }
      }
    }, 80);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    enabled,
    isEligible,
    effectiveSlots,
    courseSlotsState.failed,
    cleanCourse,
    parsedTeacherId,
    cleanType,
    cleanSemester,
    cleanTitle,
    excludeId,
    notifyDuplicateToast,
  ]);

  const checkNow = useCallback(async (): Promise<DuplicateCheckResult | null> => {
    if (!isEligible) return null;

    const courseKey = cleanCourse.toLowerCase();
    const cached = courseSlotCache.get(courseKey);
    if (effectiveSlots !== null && cached && Date.now() - cached.fetchedAt < 10_000) {
      const localMatch = matchDuplicateLocally(effectiveSlots, {
        courseCode: cleanCourse,
        teacherId: parsedTeacherId,
        type: cleanType,
        semesterName: cleanSemester,
        title: cleanTitle,
        excludeId,
      });
      if (localMatch.duplicate) {
        setDuplicateInfo(localMatch);
        notifyDuplicateToast(localMatch);
      } else {
        setDuplicateInfo(null);
        lastToastedKeyRef.current = "";
      }
      return localMatch;
    }

    setCheckingDuplicate(true);
    try {
      const res = await api.resources.checkDuplicate({
        courseCode: cleanCourse,
        teacherId: parsedTeacherId,
        type: cleanType,
        semesterName: cleanSemester,
        title: cleanTitle,
        excludeId: excludeId ?? null,
      });
      if (res?.duplicate) {
        setDuplicateInfo(res);
        notifyDuplicateToast(res);
        return res;
      }
      setDuplicateInfo(null);
      lastToastedKeyRef.current = "";
      return res;
    } catch {
      return null;
    } finally {
      setCheckingDuplicate(false);
    }
  }, [
    isEligible,
    effectiveSlots,
    cleanCourse,
    parsedTeacherId,
    cleanType,
    cleanSemester,
    cleanTitle,
    excludeId,
    notifyDuplicateToast,
  ]);

  const isDuplicate = Boolean(duplicateInfo?.duplicate);

  return {
    isDuplicate,
    checkingDuplicate,
    duplicateInfo,
    checkNow,
  };
}
