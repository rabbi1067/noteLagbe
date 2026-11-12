"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";

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
  courseCode?: string;
  teacherId?: number | string | null;
  type?: string;
  semesterName?: string;
  title?: string;
  excludeId?: number | null;
  language?: string;
}

const SINGLE_SLOT_EXAM_TYPES = new Set(["MID_QUESTION", "FINAL_QUESTION", "LAB_FINAL"]);

function parseTeacherId(raw?: number | string | null): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
}

/**
 * Live debounced duplicate-material check against /api/resources/check-duplicate.
 * Triggers a deduplicated toast popup + returns inline warning metadata.
 */
export function useDuplicateResourceCheck({
  enabled,
  courseCode,
  teacherId,
  type,
  semesterName,
  title,
  excludeId,
  language = "en",
}: UseDuplicateResourceCheckParams) {
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateCheckResult | null>(null);

  const requestSeqRef = useRef(0);
  const lastToastedKeyRef = useRef("");

  const cleanCourse = (courseCode || "").trim();
  const cleanType = (type || "").trim().toUpperCase();
  const cleanSemester = (semesterName || "").trim();
  const cleanTitle = (title || "").trim();
  const parsedTeacherId = parseTeacherId(teacherId);
  const isSingleSlot = SINGLE_SLOT_EXAM_TYPES.has(cleanType);

  const isEligible =
    enabled &&
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
    }, 320);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    enabled,
    isEligible,
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
