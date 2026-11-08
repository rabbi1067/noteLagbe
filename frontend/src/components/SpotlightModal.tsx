"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Search, BookOpen, User, X, FileText, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

export default function SpotlightModal() {
  const { showSpotlight, setShowSpotlight } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "courses" | "teachers">("all");
  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (showSpotlight) {
      setTimeout(() => inputRef.current?.focus(), 50);
      performSearch(searchTerm);
    }
  }, [showSpotlight]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (showSpotlight) {
        performSearch(searchTerm);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const performSearch = async (query: string) => {
    setIsLoading(true);
    try {
      const [coursesRes, teachersRes] = await Promise.all([
        api.courses.getAll({ query }),
        api.teachers.getAll({ query }),
      ]);
      setCourses(coursesRes.slice(0, 10));
      setTeachers(teachersRes.slice(0, 8));
    } catch {
      // Ignore in search
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCourse = (code: string) => {
    setShowSpotlight(false);
    router.push(`/courses/${code}`);
  };

  const handleSelectTeacher = (id: number) => {
    setShowSpotlight(false);
    router.push(`/teachers/${id}`);
  };

  if (!showSpotlight) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-blue-500 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            maxLength={100}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type course code (e.g. CSE241), title, or faculty name..."
            className="w-full bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm sm:text-base focus:outline-none"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mr-2">
              <X className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={() => setShowSpotlight(false)}
            className="text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2.5 py-1 rounded-lg"
          >
            ESC
          </button>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1 rounded-full transition-colors ${activeTab === "all" ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"}`}
          >
            All Results ({courses.length + teachers.length})
          </button>
          <button
            onClick={() => setActiveTab("courses")}
            className={`px-3 py-1 rounded-full transition-colors ${activeTab === "courses" ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"}`}
          >
            Courses ({courses.length})
          </button>
          <button
            onClick={() => setActiveTab("teachers")}
            className={`px-3 py-1 rounded-full transition-colors ${activeTab === "teachers" ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"}`}
          >
            Faculty ({teachers.length})
          </button>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          
          {/* Courses Section */}
          {(activeTab === "all" || activeTab === "courses") && courses.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-2 flex items-center justify-between">
                <span>Courses & Study Materials</span>
                <span>{courses.length} matches</span>
              </p>
              <div className="space-y-1.5">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    onClick={() => handleSelectCourse(course.code)}
                    className="flex items-center justify-between p-3 rounded-2xl hover:bg-blue-50/80 dark:hover:bg-slate-800/80 cursor-pointer group transition-colors border border-transparent hover:border-blue-100 dark:hover:border-slate-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-extrabold text-xs shrink-0">
                        {course.department || course.code.replace(/[0-9]/g, "").substring(0, 3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{course.code}</span>
                          <span className="text-sm text-slate-600 dark:text-slate-300 font-semibold">{course.title}</span>
                          {course.isLab && (
                            <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 px-1.5 rounded font-bold">
                              Lab
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <span>Semester {course.semester || "Elective"}</span>
                          <span>•</span>
                          <span>{course.credits} Credits</span>
                          {course.teachers && course.teachers.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-slate-700 dark:text-slate-300 font-medium">
                                Faculty: {course.teachers.map((t: any) => t.name).slice(0, 2).join(", ")}
                                {course.teachers.length > 2 ? ` +${course.teachers.length - 2}` : ""}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {course.notesCount > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                          {course.notesCount} Notes
                        </span>
                      )}
                      {course.questionsCount > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                          {course.questionsCount} Past Papers
                        </span>
                      )}
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Teachers Section */}
          {(activeTab === "all" || activeTab === "teachers") && teachers.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-2">Faculty Members</p>
              <div className="space-y-1.5">
                {teachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    onClick={() => handleSelectTeacher(teacher.id)}
                    className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {teacher.initial || teacher.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{teacher.name}</span>
                          {teacher.initial && (
                            <span className="text-xs px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                              {teacher.initial}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {teacher.designation} • {teacher.room || "Faculty"}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && courses.length === 0 && teachers.length === 0 && (
            <div className="py-12 text-center text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold">No courses or faculty found matching &quot;{searchTerm}&quot;</p>
              <p className="text-[11px] text-slate-500 mt-1">Try searching by course code (e.g. CSE241), title, or instructor name.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
