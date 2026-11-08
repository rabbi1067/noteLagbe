"use client";

import React from "react";

/**
 * Skeleton placeholder for Faculty Directory grid (/teachers)
 */
export function FacultyGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="flex flex-col p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4"
        >
          <div className="flex items-start gap-4">
            {/* Avatar circle skeleton */}
            <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-800 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2.5">
              {/* Name bar */}
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
              {/* Designation bar */}
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2" />
              {/* Department pill */}
              <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-lg w-20" />
            </div>
          </div>

          {/* Contact info placeholder */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-4/5" />
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-3/5" />
          </div>

          {/* Bottom badge and action placeholder */}
          <div className="pt-2 flex items-center justify-between">
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-full w-24" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton placeholder for Courses grid (/courses)
 */
export function CourseGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="flex flex-col p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4"
        >
          {/* Header badges */}
          <div className="flex items-center justify-between">
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-20" />
            <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-full w-14" />
          </div>

          {/* Course title lines */}
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-full" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-2/3" />
          </div>

          {/* Teachers avatars placeholder */}
          <div className="flex items-center gap-2 pt-2">
            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-800 -ml-3" />
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-28 ml-2" />
          </div>

          {/* Resource count tags */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
            <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-16" />
            <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton placeholder for Course Detail page (/courses/[code])
 */
export function CourseDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-16" />
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-4" />
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-24" />
      </div>

      {/* Hero card skeleton */}
      <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-28" />
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-20" />
          </div>
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-2xl w-36" />
        </div>

        <div className="space-y-3">
          <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded-lg w-3/4 sm:w-1/2" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-full sm:w-2/3" />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/50 space-y-2">
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-md w-1/2" />
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-md w-3/4" />
            </div>
          ))}
        </div>
      </div>

      {/* Faculty Selection Pills Skeleton */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-32" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 bg-slate-200 dark:bg-slate-800 rounded-xl w-28" />
          ))}
        </div>
      </div>

      {/* Materials Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-20" />
              <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-full w-12" />
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-full" />
              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-1/2" />
            </div>
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton placeholder for Faculty Detail page (/teachers/[id])
 */
export function TeacherDetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-pulse">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-16" />
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-4" />
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-32" />
      </div>

      {/* Profile Header Skeleton */}
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-24 h-24 rounded-3xl bg-slate-200 dark:bg-slate-800 shrink-0" />
        <div className="space-y-3 flex-1 text-center sm:text-left w-full">
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/2 mx-auto sm:mx-0" />
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-1/3 mx-auto sm:mx-0" />
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-20" />
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-28" />
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-36" />
          </div>
        </div>
      </div>

      {/* Courses List Skeleton */}
      <div className="space-y-4">
        <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-44" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-md w-20" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-16" />
              </div>
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
