"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Sparkles,
  Printer,
  CheckCircle,
  Flame,
  AlertCircle,
  Send,
  Trash2,
  Lock,
  Clock,
  Bot,
  User as UserIcon,
  Copy,
  Check,
  RotateCcw,
  GraduationCap,
  BookOpen,
  MessageSquare,
  Layers,
  ChevronDown,
} from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";
import { toast } from "sonner";

interface TeacherOption {
  id: number;
  name: string;
  initial?: string;
  designation?: string;
}

interface CheatSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseCode: string;
  courseTitle?: string;
  courseDepartment?: string;
  isCourseUnlocked?: boolean;
  teachers?: TeacherOption[];
}

export default function CheatSheetModal({
  isOpen,
  onClose,
  courseCode,
  courseTitle,
  courseDepartment,
  isCourseUnlocked = false,
  teachers = [],
}: CheatSheetModalProps) {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<"chat" | "cheatsheet">("chat");

  // Chat States
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Static Cheat Sheet State
  const [sheetData, setSheetData] = useState<any>(null);
  const [sheetLoading, setSheetLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load chat messages and cheat sheet when modal opens
  useEffect(() => {
    if (isOpen && courseCode) {
      if (isCourseUnlocked) {
        setChatLoading(true);
        api.aiExamChat
          .getMessages(courseCode)
          .then((res) => {
            setMessages(Array.isArray(res) ? res : []);
          })
          .catch((err) => {
            console.error("Failed to load chat history:", err);
          })
          .finally(() => setChatLoading(false));
      }

      setSheetLoading(true);
      api.courses
        .getCheatSheet(courseCode)
        .then((res) => setSheetData(res))
        .catch(() => setSheetData(null))
        .finally(() => setSheetLoading(false));
    }
  }, [isOpen, courseCode, isCourseUnlocked]);

  useEffect(() => {
    if (activeTab === "chat" && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, activeTab]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success(language === "bn" ? "কপি করা হয়েছে!" : "Copied to clipboard!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || sending) return;

    if (!isCourseUnlocked) {
      toast.error(
        language === "bn"
          ? "এআই এক্সাম রিভিশন অ্যাসিস্ট্যান্ট ব্যবহারের জন্য কোর্সটি আনলক করুন।"
          : "Please unlock this course to chat with the AI Exam Assistant."
      );
      return;
    }

    const optimisticUserMsg = {
      id: Date.now(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
      courseCode,
      teacherId: selectedTeacherId,
    };

    setMessages((prev) => [...prev, optimisticUserMsg]);
    setInputMessage("");
    setSending(true);

    try {
      const res = await api.aiExamChat.sendMessage({
        courseCode,
        courseTitle,
        courseDepartment,
        teacherName: activeTeacher?.name || null,
        message: text,
        teacherId: selectedTeacherId,
        language,
      });

      if (res && res.assistantMessage) {
        setMessages((prev) => [...prev, res.assistantMessage]);
      } else {
        // Refresh full conversation if format differed
        const fresh = await api.aiExamChat.getMessages(courseCode);
        setMessages(fresh || []);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to get AI response. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleClearHistory = async () => {
    if (messages.length === 0) return;
    if (
      !confirm(
        language === "bn"
          ? "আপনি কি নিশ্চিতভাবে এই কোর্সের চ্যাট হিস্টোরি ক্লিয়ার করতে চান?"
          : "Are you sure you want to clear this course chat history?"
      )
    ) {
      return;
    }

    try {
      await api.aiExamChat.clearMessages(courseCode);
      setMessages([]);
      toast.success(
        language === "bn"
          ? "চ্যাট হিস্টোরি সফলভাবে মুছে ফেলা হয়েছে।"
          : "Chat conversation cleared."
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to clear conversation.");
    }
  };

  // Selected faculty display name
  const activeTeacher = teachers.find((t) => t.id === selectedTeacherId);
  const teacherInit = activeTeacher?.initial || "FAC";

  // Dynamic suggestion pills based on selected teacher or general and current interface language
  const promptSuggestions = activeTeacher
    ? language === "bn"
      ? [
          `⚡ ${activeTeacher.name} [${teacherInit}] স্যারের পরীক্ষার স্পেশাল সাজেশন ও বারবার আসা টপিক কী কী?`,
          `🔥 ${teacherInit} স্যারের বিগত মিডটার্ম ও ফাইনাল প্রশ্ন অ্যানালাইসিস করে গুরুত্বপূর্ণ প্রশ্ন দিন`,
          `📝 ${activeTeacher.name} স্যারের পরীক্ষার জন্য লাস্ট নাইট চিট শিট তৈরি করে দিন`,
          `💡 ${teacherInit} স্যারের পরীক্ষায় ফুল মার্কস পাওয়ার প্রেজেন্টেশন ও খাতা লেখার টিপস`,
        ]
      : [
          `⚡ What are the repeated questions and special exam suggestions for ${activeTeacher.name} [${teacherInit}]?`,
          `🔥 Analyze past midterm & final exam papers by ${teacherInit} and highlight critical questions`,
          `📝 Generate a high-yield last-night exam revision cheat sheet for ${activeTeacher.name}'s course`,
          `💡 Presentation and step-marking tips to score full marks in ${teacherInit}'s exam`,
        ]
    : language === "bn"
    ? [
        `🔥 বিগত সেমিস্টারগুলোতে সবচেয়ে বেশি রিপিট হওয়া প্রশ্ন ও টপিক কোনগুলো?`,
        `📝 পরীক্ষার আগের রাতের জন্য গুরুত্বপূর্ণ পয়েন্ট ও চিট শিট তৈরি করে দিন`,
        `🎯 মিডটার্ম ও ফাইনাল পরীক্ষার কমন প্রশ্ন প্যাটার্ন এবং চ্যাপ্টার প্রায়োরিটি দিন`,
        `💡 পরীক্ষায় ভালো সিজিপিএ পাওয়ার জন্য খাতা উপস্থাপনা ও স্টেপ মার্কিং কৌশল বলুন`,
      ]
    : [
        `🔥 Which questions and topics appeared most frequently in past semesters?`,
        `📝 Generate a concise last-night revision cheat sheet and key formulas`,
        `🎯 Breakdown the common midterm & final question patterns and chapter priorities`,
        `💡 How to structure and write answers for maximum step marking and top CGPA?`,
      ];

  // Helper to format timestamps nicely
  const formatTime = (iso?: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // Simple Markdown formatter for clean rendering of bold text, lists, and code
  const renderFormattedContent = (content: string) => {
    const lines = content.split("\n");
    let inCodeBlock = false;
    let codeBuffer: string[] = [];

    const elements: React.ReactNode[] = [];

    lines.forEach((line, index) => {
      if (line.trim().startsWith("```")) {
        if (inCodeBlock) {
          elements.push(
            <pre
              key={`code-${index}`}
              className="p-3 my-2 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-800"
            >
              <code>{codeBuffer.join("\n")}</code>
            </pre>
          );
          codeBuffer = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      const trimmed = line.trim();
      if (!trimmed) {
        elements.push(<div key={`empty-${index}`} className="h-2" />);
        return;
      }

      // Headers
      if (trimmed.startsWith("### ")) {
        elements.push(
          <h4 key={`h3-${index}`} className="text-sm font-black text-slate-900 dark:text-white mt-2 mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>{trimmed.replace(/^###\s+/, "")}</span>
          </h4>
        );
        return;
      }
      if (trimmed.startsWith("#### ")) {
        elements.push(
          <h5 key={`h4-${index}`} className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-2 mb-1">
            {trimmed.replace(/^####\s+/, "")}
          </h5>
        );
        return;
      }

      // Bullet points
      if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
        const bulletText = trimmed.replace(/^[\*\-]\s+/, "");
        elements.push(
          <div key={`li-${index}`} className="flex items-start gap-2 my-0.5 pl-2 text-xs text-slate-700 dark:text-slate-300">
            <span className="text-blue-500 mt-0.5">•</span>
            <span>{renderInlineText(bulletText)}</span>
          </div>
        );
        return;
      }

      // Numbered lists
      if (/^\d+\.\s+/.test(trimmed)) {
        elements.push(
          <div key={`num-${index}`} className="flex items-start gap-2 my-0.5 pl-2 text-xs text-slate-700 dark:text-slate-300">
            <span className="font-bold text-blue-600 dark:text-blue-400 shrink-0">
              {trimmed.match(/^\d+\./)?.[0]}
            </span>
            <span>{renderInlineText(trimmed.replace(/^\d+\.\s+/, ""))}</span>
          </div>
        );
        return;
      }

      // Quote / Tip boxes
      if (trimmed.startsWith("> ")) {
        elements.push(
          <div
            key={`quote-${index}`}
            className="p-2.5 my-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-medium"
          >
            {renderInlineText(trimmed.replace(/^>\s+/, ""))}
          </div>
        );
        return;
      }

      // Default paragraph
      elements.push(
        <p key={`p-${index}`} className="my-1 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          {renderInlineText(line)}
        </p>
      );
    });

    if (inCodeBlock && codeBuffer.length > 0) {
      elements.push(
        <pre
          key={`code-end`}
          className="p-3 my-2 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-800"
        >
          <code>{codeBuffer.join("\n")}</code>
        </pre>
      );
    }

    return elements;
  };

  const renderInlineText = (text: string) => {
    // Bold parsing (**text**)
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-black text-slate-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-mono text-[11px] font-bold border border-blue-200/50 dark:border-slate-700"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-4xl h-[92vh] max-h-[850px] rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================================================================= */}
        {/* 1. MODAL TOP BAR                                                  */}
        {/* ================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-purple-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500 via-purple-600 to-blue-600 text-white shadow-md shadow-purple-500/20 shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-base text-slate-900 dark:text-white truncate">
                  {language === "bn" ? "এআই এক্সাম রিভিশন কো-পাইলট ও স্টাডি মেন্টর" : "AI Exam Revision Copilot & Study Mentor"}
                </span>
                <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded-lg bg-blue-600 text-white shrink-0">
                  {courseCode}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300/40 shrink-0">
                  {language === "bn" ? "⚡ জেমিনি ৩.৮ ফ্ল্যাশ এআই" : "⚡ Gemini 3.8 Flash AI"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {courseTitle || (language === "bn" ? "অ্যাকাডেমিক কোর্স আর্কাইভ" : "Academic Course Archive")} • {courseDepartment || "CSE"} • Southeast University
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {activeTab === "cheatsheet" && (
              <button
                onClick={handlePrint}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors shadow-sm cursor-pointer"
                title="Print Cheat Sheet"
              >
                <Printer className="w-4 h-4" />
              </button>
            )}

            {activeTab === "chat" && messages.length > 0 && isCourseUnlocked && (
              <button
                onClick={handleClearHistory}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer"
                title="Clear conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === "bn" ? "ক্লিয়ার চ্যাট" : "Clear Chat"}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. SUB-BAR: TABS & FACULTY SELECTOR                              */}
        {/* ================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 shrink-0">
          {/* Dual Tabs */}
          <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold shrink-0">
            <button
              onClick={() => setActiveTab("chat")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === "chat"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{language === "bn" ? "এআই এক্সাম কো-পাইলট" : "AI Exam Copilot"}</span>
            </button>

            <button
              onClick={() => setActiveTab("cheatsheet")}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                activeTab === "cheatsheet"
                  ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm font-black"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{language === "bn" ? "কুইক রিভিশন গাইড" : "Quick Revision Guide"}</span>
            </button>
          </div>

          {/* Faculty Selector & Rolling Retention Pill */}
          <div className="flex items-center gap-2 flex-wrap justify-between sm:justify-end flex-1">
            {teachers.length > 0 && activeTab === "chat" && (
              <div className="inline-flex items-center gap-1.5 text-xs">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                  {language === "bn" ? "শিক্ষক ফোকাস:" : "Faculty Focus:"}
                </span>
                <select
                  value={selectedTeacherId || ""}
                  onChange={(e) => setSelectedTeacherId(e.target.value ? Number(e.target.value) : null)}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">{language === "bn" ? "সকল শিক্ষক (All Teachers)" : "All Teachers"}</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.initial ? `[${t.initial}]` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 7-Day Sliding Window Badge */}
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold shrink-0">
              <Clock className="w-3 h-3" />
              <span>
                {language === "bn" ? "রোলিং ৭ দিনের মেমোরি" : "7-Day Sliding Retention"}
              </span>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3. ACCESS LOCKED OVERLAY GUARD                                    */}
        {/* ================================================================= */}
        {!isCourseUnlocked ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {language === "bn" ? "কোর্সটি বর্তমানে লক করা আছে" : "Course Materials Are Locked"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {language === "bn"
                  ? "NoteLagbe AI Exam Revision Copilot ব্যবহার করতে কোর্সটি আনলক করুন। আনলক করলে আপনি যেকোনো শিক্ষকের বিগত প্রশ্ন বিশ্লেষণ, সমাধান ও কুইক রিভিশন গাইড পেয়ে যাবেন।"
                  : "Unlock this course to access the Gemini 3.8 AI Exam Revision Copilot, repetitive questions analysis, and faculty-specific revision guides."}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-900 dark:text-blue-300 max-w-md">
              <p className="text-[11px] leading-relaxed">
                {language === "bn"
                  ? "💡 কোর্স পেজের 'Unlock Course' বাটনে ক্লিক করে আনলক সম্পন্ন করুন।"
                  : "💡 Return to the course page and click 'Unlock Course' to gain unlimited access."}
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              {language === "bn" ? "কোর্স পেজে ফিরে যান" : "Back to Course Page"}
            </button>
          </div>
        ) : activeTab === "chat" ? (
          /* =============================================================== */
          /* 4. TAB 1: AI EXAM CHATBOT & INTERACTIVE CONVERSATION            */
          /* =============================================================== */
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-slate-950">
            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {chatLoading && messages.length === 0 ? (
                <div className="py-20 text-center text-slate-400 space-y-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto" />
                  <p className="text-xs font-bold">
                    {language === "bn"
                      ? "৭-দিনের কনভার্সেশন হিস্টোরি লোড হচ্ছে..."
                      : "Loading rolling 7-day conversation history..."}
                  </p>
                </div>
              ) : messages.length === 0 ? (
                /* Empty Chat Welcome State */
                <div className="py-12 sm:py-16 text-center space-y-4 max-w-lg mx-auto">
                  <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-blue-600 to-purple-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-purple-500/20">
                    <Bot className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {language === "bn"
                        ? "স্বাগতম! আমি আপনার AI Exam Revision Copilot"
                        : "Welcome to AI Exam Revision Copilot"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {language === "bn"
                        ? `${courseCode} কোর্সের বিগত সব মিডটার্ম ও ফাইনাল প্রশ্ন, শিক্ষকের প্রশ্নের ধরন এবং নোট বিশ্লেষণ করে যেকোনো প্রশ্নের সমাধান ও এক্সাম টিপস দেওয়ার জন্য প্রস্তুত।`
                        : `Ask any question to get customized exam revision suggestions, repeated questions breakdown, and faculty-specific tips for ${courseCode}.`}
                    </p>
                  </div>

                  {/* Suggestion Quick Pills */}
                  <div className="pt-2 space-y-2 text-left">
                    <span className="text-[11px] font-bold text-slate-400 block text-center uppercase tracking-wider">
                      {language === "bn" ? "ক্লিক করে দ্রুত প্রশ্ন করুন:" : "Quick Suggested Questions:"}
                    </span>
                    <div className="flex flex-col gap-2">
                      {promptSuggestions.map((prompt, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendMessage(prompt)}
                          disabled={sending}
                          className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-left text-xs font-medium text-slate-800 dark:text-slate-200 transition-all shadow-sm hover:border-blue-400 flex items-center justify-between group cursor-pointer"
                        >
                          <span className="truncate pr-2">{prompt}</span>
                          <Send className="w-3.5 h-3.5 text-blue-500 opacity-60 group-hover:opacity-100 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Chat Messages Timeline */
                <div className="space-y-4">
                  {messages.map((msg, index) => {
                    const isUser = msg.role === "user";

                    return (
                      <div
                        key={msg.id || index}
                        className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} animate-in fade-in duration-150`}
                      >
                        {!isUser && (
                          <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-amber-500 via-purple-600 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                            <Bot className="w-4 h-4" />
                          </div>
                        )}

                        <div className={`max-w-[85%] sm:max-w-[78%] space-y-1`}>
                          <div
                            className={`p-3.5 sm:p-4 rounded-3xl text-xs sm:text-[13px] shadow-sm leading-relaxed ${
                              isUser
                                ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-sm ml-auto"
                                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-sm relative group"
                            }`}
                          >
                            {/* Copy button for AI replies */}
                            {!isUser && (
                              <button
                                onClick={() => handleCopyText(msg.content, index)}
                                className="absolute top-2.5 right-2.5 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                title="Copy answer"
                              >
                                {copiedIndex === index ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}

                            {isUser ? (
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            ) : (
                              <div className="space-y-1">{renderFormattedContent(msg.content)}</div>
                            )}
                          </div>

                          <div
                            className={`flex items-center gap-1.5 text-[10px] text-slate-400 px-1 ${
                              isUser ? "justify-end" : "justify-start"
                            }`}
                          >
                            <span>{isUser ? "You" : "NoteLagbe AI"}</span>
                            <span>•</span>
                            <span>{formatTime(msg.createdAt)}</span>
                          </div>
                        </div>

                        {isUser && (
                          <div className="w-8 h-8 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                            <UserIcon className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* AI Generating Indicator */}
                  {sending && (
                    <div className="flex gap-3 justify-start animate-in fade-in duration-150">
                      <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-amber-500 via-purple-600 to-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Bot className="w-4 h-4 animate-spin" />
                      </div>
                      <div className="p-3.5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-2 h-2 rounded-full bg-purple-600 animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" />
                        </div>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {language === "bn"
                            ? "এআই পরীক্ষার ফাইল অ্যানালাইসিস করছে..."
                            : "Analyzing exam papers and notes..."}
                        </span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Quick Prompt Pills Bar (Visible when conversation is active) */}
            {messages.length > 0 && (
              <div className="px-4 sm:px-6 py-2 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 overflow-x-auto flex items-center gap-2 shrink-0 no-scrollbar">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  {language === "bn" ? "সাজেশন:" : "Prompts:"}
                </span>
                {promptSuggestions.slice(0, 3).map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(prompt)}
                    disabled={sending}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition-colors shrink-0 max-w-[280px] truncate cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Message Input Form */}
            <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={
                      language === "bn"
                        ? activeTeacher
                          ? `${activeTeacher.name} [${teacherInit}] স্যারের পরীক্ষার সাজেশন বা প্রশ্ন লিখুন...`
                          : "যেকোনো পরীক্ষার প্রশ্ন, সমাধান বা রিভিশন টিপস জানতে লিখুন..."
                        : activeTeacher
                        ? `Ask exam question or tips for ${activeTeacher.name}...`
                        : "Ask exam questions, past solutions, revision tips..."
                    }
                    disabled={sending}
                    className="w-full pl-4 pr-10 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!inputMessage.trim() || sending}
                  className="px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">{language === "bn" ? "পাঠান" : "Send"}</span>
                </button>
              </form>

              {/* Rolling 7-Day Auto-Purge Explanation */}
              <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400 px-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-500" />
                  {language === "bn"
                    ? "চ্যাট কনভার্সেশন সর্বোচ্চ ৭ দিন সংরক্ষিত থাকে এবং ৭ দিন পর স্বয়ংক্রিয়ভাবে মুছে যায়।"
                    : "Conversations are saved for 7 rolling days only and auto-purged daily."}
                </span>
                <span>
                  {messages.length} {language === "bn" ? "টি বার্তা" : "messages"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* =============================================================== */
          /* 5. TAB 2: INSTANT STRUCTURED REVISION CHEAT SHEET               */
          /* =============================================================== */
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs sm:text-sm bg-white dark:bg-slate-950">
            {sheetLoading ? (
              <div className="py-20 text-center text-slate-400 space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto" />
                <p className="text-xs font-semibold">
                  {language === "bn"
                    ? "আর্কাইভ অ্যানালাইসিস করে হাই-ইয়েল্ড চিট শিট তৈরি হচ্ছে..."
                    : "Generating high-yield revision summary..."}
                </p>
              </div>
            ) : sheetData ? (
              <div className="space-y-6 max-w-3xl mx-auto">
                {/* Summary Box */}
                <div className="p-5 rounded-3xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-2 shadow-sm">
                  <h4 className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2 text-xs uppercase tracking-wider">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <span>{language === "bn" ? "লাস্ট নাইট রিভিশন স্ট্র্যাটেজি" : "Key Revision Strategy"}</span>
                  </h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {sheetData.lastNightSummary}
                  </p>
                </div>

                {/* High Yield Topics */}
                {sheetData.highYieldTopics && (
                  <div className="space-y-3">
                    <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider text-xs">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span>{language === "bn" ? "সবচেয়ে বেশি রিপিটেড টপিকসমূহ (High-Yield)" : "High-Yield Topics (Recurrent in Past Exams)"}</span>
                    </h4>
                    <div className="space-y-2">
                      {sheetData.highYieldTopics.map((topic: string, i: number) => (
                        <div
                          key={i}
                          className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3 text-xs"
                        >
                          <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-black flex items-center justify-center shrink-0 text-[11px]">
                            {i + 1}
                          </span>
                          <span className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                            {topic}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Exam Scoring Tips */}
                {sheetData.examTips && (
                  <div className="space-y-3">
                    <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider text-xs">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <span>{language === "bn" ? "পরীক্ষার খাতা লেখার কৌশল ও মার্কস বাড়ানোর টিপস" : "Examination Scoring Tips"}</span>
                    </h4>
                    <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                      <ul className="space-y-2 text-slate-700 dark:text-slate-300 text-xs leading-relaxed list-disc list-inside">
                        {sheetData.examTips.map((tip: string, i: number) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-slate-400 py-16">
                {language === "bn"
                  ? "এই মুহূর্তে চিট শিট তৈরি করা সম্ভব হয়নি।"
                  : "Unable to generate cheat sheet at this time."}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
