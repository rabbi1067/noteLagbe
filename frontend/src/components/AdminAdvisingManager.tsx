"use client";

import React, { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";
import {
  Upload,
  Calendar,
  Layers,
  Users,
  BookOpen,
  Clock,
  MapPin,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import { toast } from "sonner";

export default function AdminAdvisingManager() {
  const { language } = useLanguage();
  const [semester, setSemester] = useState<string>("Spring 2026");
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [data, setData] = useState<{
    semester: string;
    totalSections: number;
    totalCourses: number;
    courses: Record<string, any[]>;
    faculties: string[];
  }>({
    semester: "Spring 2026",
    totalSections: 0,
    totalCourses: 0,
    courses: {},
    faculties: [],
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const res = await api.advising.getSections(semester);
      if (res) {
        setData(res);
      }
    } catch (err: any) {
      console.warn("Failed to fetch advising catalog:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [semester]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }

    setUploading(true);
    try {
      const res = await api.advising.uploadAdvisingTable(file, semester);
      toast.success(
        `✅ Master advising table processed! Created: ${res.createdCount}, Updated: ${res.updatedCount}`
      );
      fetchCatalog();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload master advising table.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Flatten sections for filtering
  const allSections = React.useMemo(() => {
    const list: any[] = [];
    Object.entries(data.courses || {}).forEach(([code, secs]) => {
      secs.forEach((s) => list.push(s));
    });
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (s) =>
        s.courseCode?.toLowerCase().includes(q) ||
        s.courseTitle?.toLowerCase().includes(q) ||
        s.facultyInitial?.toLowerCase().includes(q) ||
        s.facultyName?.toLowerCase().includes(q) ||
        s.scheduleText?.toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner / Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Semester Intake</span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white font-mono">{semester}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Courses</span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white font-mono">{data.totalCourses}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Offered Sections</span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white font-mono">{data.totalSections}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Faculty Members</span>
            <h3 className="text-lg font-black text-slate-900 dark:text-white font-mono">{data.faculties?.length || 0}</h3>
          </div>
        </div>
      </div>

      {/* Action Controls & Upload */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Official Southeast University UMS Advising Master Importer
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Upload the complete semester advising HTML file (up to 10MB) directly from UMS.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              <Upload className={`w-4 h-4 ${uploading ? "animate-spin" : ""}`} />
              <span>{uploading ? "Parsing & Saving..." : "Upload Master .html"}</span>
            </button>

            <button
              onClick={fetchCatalog}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Refresh Catalog"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Course Code (CSE381), Faculty Initial (DSS), Title, or Room..."
            className="w-full text-xs font-medium py-2.5 pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Sections Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {allSections.length} offered sections</span>
          <span className="font-mono">Semester: {semester}</span>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Section Code</th>
                <th className="py-3 px-4">Course Title</th>
                <th className="py-3 px-4">Credits</th>
                <th className="py-3 px-4">Faculty</th>
                <th className="py-3 px-4">Weekly Schedule</th>
                <th className="py-3 px-4">Retention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {allSections.map((s, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                    {s.courseCode}.{s.sectionNumber}
                  </td>
                  <td className="py-3 px-4 font-sans text-slate-700 dark:text-slate-300 max-w-[220px] truncate">
                    {s.courseTitle}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{s.credits}</td>
                  <td className="py-3 px-4 font-sans text-indigo-600 dark:text-indigo-400">
                    <span className="font-mono font-bold mr-1">[{s.facultyInitial}]</span> {s.facultyName}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-[11px]">
                    {s.scheduleText}
                  </td>
                  <td className="py-3 px-4">
                    {s.expiresAt ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                        User (10 Days)
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                        Permanent
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
