"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { 
  BookOpen, 
  GraduationCap, 
  Sparkles, 
  Star, 
  ShieldCheck, 
  FileText, 
  Zap, 
  Users, 
  Calendar,
  Layers,
  Award
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function ThreeDimensionalHeroVisual() {
  const { language } = useLanguage();
  const cardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 3D Tilt State
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [activeTab, setActiveTab] = useState<"curriculum" | "faculty" | "calendar" | "tools">("curriculum");

  // Mouse tilt tracking
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = -((y - centerY) / centerY) * 12;
    const rotY = ((x - centerX) / centerX) * 14;

    setRotateX(rotX);
    setRotateY(rotY);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  // 3D Canvas Particle & Geometric Orbit Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", handleResize);

    // Particle constellation
    const numParticles = 38;
    const particles: Array<{
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      vz: number;
      size: number;
      color: string;
    }> = [];

    const colors = ["#3b82f6", "#6366f1", "#8b5cf6", "#06b6d4", "#ec4899"];

    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: (Math.random() - 0.5) * width,
        y: (Math.random() - 0.5) * height,
        z: Math.random() * 300 - 150,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        vz: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2.5 + 1.2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let angleX = 0;
    let angleY = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Subtle rotation
      angleX += 0.003;
      angleY += 0.004;

      const fov = 260;
      const cx = width / 2;
      const cy = height / 2;

      // Project and draw 3D connecting lines
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.x += p1.vx;
        p1.y += p1.vy;
        p1.z += p1.vz;

        if (p1.x < -width / 2) p1.x = width / 2;
        if (p1.x > width / 2) p1.x = -width / 2;
        if (p1.y < -height / 2) p1.y = height / 2;
        if (p1.y > height / 2) p1.y = -height / 2;
        if (p1.z < -150) p1.z = 150;
        if (p1.z > 150) p1.z = -150;

        // 3D rotation projection
        const cosY = Math.cos(angleY);
        const sinY = Math.sin(angleY);
        const cosX = Math.cos(angleX);
        const sinX = Math.sin(angleX);

        const x1 = p1.x * cosY + p1.z * sinY;
        const z1 = -p1.x * sinY + p1.z * cosY;
        const y1 = p1.y * cosX - z1 * sinX;
        const z2 = p1.y * sinX + z1 * cosX;

        const scale1 = fov / (fov + z2);
        const projX1 = cx + x1 * scale1;
        const projY1 = cy + y1 * scale1;

        // Render particle
        if (scale1 > 0) {
          ctx.beginPath();
          ctx.arc(projX1, projY1, Math.max(0.5, p1.size * scale1), 0, Math.PI * 2);
          ctx.fillStyle = p1.color;
          ctx.globalAlpha = Math.min(1, Math.max(0.15, (scale1 - 0.3) * 1.5));
          ctx.fill();

          // Connect nearby particles
          for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dz = p1.z - p2.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < 85) {
              const x2 = p2.x * cosY + p2.z * sinY;
              const z2_ = -p2.x * sinY + p2.z * cosY;
              const y2 = p2.y * cosX - z2_ * sinX;
              const z2_final = p2.y * sinX + z2_ * cosX;

              const scale2 = fov / (fov + z2_final);
              const projX2 = cx + x2 * scale2;
              const projY2 = cy + y2 * scale2;

              ctx.beginPath();
              ctx.moveTo(projX1, projY1);
              ctx.lineTo(projX2, projY2);
              ctx.strokeStyle = p1.color;
              ctx.globalAlpha = (1 - dist / 85) * 0.25;
              ctx.lineWidth = 0.8 * scale1;
              ctx.stroke();
            }
          }
        }
      }

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full max-w-5xl mx-auto my-6 px-4">
      {/* Background Glowing 3D Orb */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-[580px] h-[340px] bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20 rounded-full blur-[90px] pointer-events-none -z-10" />

      {/* 3D Perspective Wrapper */}
      <div
        style={{ perspective: "1200px" }}
        className="relative w-full"
      >
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleMouseLeave}
          style={{
            transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
            transformStyle: "preserve-3d",
            transition: isHovered ? "transform 0.1s ease-out" : "transform 0.6s ease-in-out",
          }}
          className="relative rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xl shadow-blue-500/10 overflow-hidden p-6 sm:p-8"
        >
          {/* Background Interactive 3D Canvas */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none opacity-60 dark:opacity-40"
          />

          {/* Glossy Hologram Sheen */}
          <div
            style={{
              background: `radial-gradient(circle at ${50 + rotateY * 2}% ${50 - rotateX * 2}%, rgba(255,255,255,0.25), transparent 60%)`,
            }}
            className="absolute inset-0 pointer-events-none z-10"
          />

          {/* CONTENT LAYER WITH 3D DEPTH (translateZ) */}
          <div 
            style={{ transform: "translateZ(35px)", transformStyle: "preserve-3d" }} 
            className="relative z-20 space-y-6"
          >
            {/* Header / Institutional Branding */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 dark:border-slate-800/70 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <GraduationCap className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                      Southeast University Academic Engine
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      <Zap className="w-3 h-3" /> Live 3D Hub
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {language === "bn" 
                      ? "সিএসই কারিকুলাম, শিক্ষক ডিরেক্টরি ও একাডেমিক ক্যালেন্ডার প্ল্যাটফর্ম" 
                      : "Official CSE Curriculum, Faculty Directory & Academic Calendar Platform"}
                  </p>
                </div>
              </div>

              {/* Status Chips */}
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="px-3 py-1 rounded-xl bg-blue-50 dark:bg-slate-800/90 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-slate-700">
                  Batch 60–71 Verified
                </span>
                <span className="px-3 py-1 rounded-xl bg-purple-50 dark:bg-slate-800/90 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-slate-700">
                  100% Real Database
                </span>
              </div>
            </div>

            {/* Interactive Feature Orbit Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {/* Feature 1: Curriculum */}
              <button
                type="button"
                onClick={() => setActiveTab("curriculum")}
                style={{ transform: activeTab === "curriculum" ? "translateZ(25px)" : "translateZ(10px)" }}
                className={`p-4 rounded-2xl text-left transition-all border ${
                  activeTab === "curriculum"
                    ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl shadow-blue-500/25 border-blue-400 scale-[1.03]"
                    : "bg-slate-50/80 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700/80"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${
                  activeTab === "curriculum" ? "bg-white/20 text-white" : "bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
                }`}>
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="font-bold text-sm">50+ CSE Courses</div>
                <div className={`text-[11px] ${activeTab === "curriculum" ? "text-blue-100" : "text-slate-500 dark:text-slate-400"}`}>
                  12 Semesters Mapped
                </div>
              </button>

              {/* Feature 2: Faculty */}
              <button
                type="button"
                onClick={() => setActiveTab("faculty")}
                style={{ transform: activeTab === "faculty" ? "translateZ(25px)" : "translateZ(10px)" }}
                className={`p-4 rounded-2xl text-left transition-all border ${
                  activeTab === "faculty"
                    ? "bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-xl shadow-purple-500/25 border-purple-400 scale-[1.03]"
                    : "bg-slate-50/80 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700/80"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${
                  activeTab === "faculty" ? "bg-white/20 text-white" : "bg-purple-100 dark:bg-purple-950 text-purple-600 dark:purple-400"
                }`}>
                  <Users className="w-5 h-5" />
                </div>
                <div className="font-bold text-sm">35+ Faculty Profiles</div>
                <div className={`text-[11px] ${activeTab === "faculty" ? "text-purple-100" : "text-slate-500 dark:text-slate-400"}`}>
                  Reviews & Initials
                </div>
              </button>

              {/* Feature 3: Academic Calendar */}
              <button
                type="button"
                onClick={() => setActiveTab("calendar")}
                style={{ transform: activeTab === "calendar" ? "translateZ(25px)" : "translateZ(10px)" }}
                className={`p-4 rounded-2xl text-left transition-all border ${
                  activeTab === "calendar"
                    ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-xl shadow-indigo-500/25 border-indigo-400 scale-[1.03]"
                    : "bg-slate-50/80 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700/80"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${
                  activeTab === "calendar" ? "bg-white/20 text-white" : "bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400"
                }`}>
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="font-bold text-sm">4-Year Calendar</div>
                <div className={`text-[11px] ${activeTab === "calendar" ? "text-indigo-100" : "text-slate-500 dark:text-slate-400"}`}>
                  2023–2026 Live
                </div>
              </button>

              {/* Feature 4: Student Tools */}
              <button
                type="button"
                onClick={() => setActiveTab("tools")}
                style={{ transform: activeTab === "tools" ? "translateZ(25px)" : "translateZ(10px)" }}
                className={`p-4 rounded-2xl text-left transition-all border ${
                  activeTab === "tools"
                    ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-xl shadow-emerald-500/25 border-emerald-400 scale-[1.03]"
                    : "bg-slate-50/80 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700/80"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${
                  activeTab === "tools" ? "bg-white/20 text-white" : "bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                }`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div className="font-bold text-sm">30+ Cover Pages</div>
                <div className={`text-[11px] ${activeTab === "tools" ? "text-emerald-100" : "text-slate-500 dark:text-slate-400"}`}>
                  Waiver & DOCX Tools
                </div>
              </button>
            </div>

            {/* Dynamic Active Tab Showcase */}
            <div 
              style={{ transform: "translateZ(20px)" }}
              className="p-4 sm:p-5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4"
            >
              <div className="space-y-1 text-left">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="font-bold text-sm text-slate-900 dark:text-white">
                    {activeTab === "curriculum" && (language === "bn" ? "কম্পিউটার সায়েন্স অ্যান্ড ইঞ্জিনিয়ারিং পূর্ণাঙ্গ কারিকুলাম" : "Full Computer Science & Engineering Curriculum")}
                    {activeTab === "faculty" && (language === "bn" ? "সাউথইস্ট ইউনিভার্সিটি রেট মাই ফ্যাকাল্টি ডিরেক্টরি" : "Southeast University RateMyFaculty Directory")}
                    {activeTab === "calendar" && (language === "bn" ? "অফিসিয়াল রেজিস্টার অনুমোদিত একাডেমিক ক্যালেন্ডার" : "Official Registrar Academic Calendar 2023–2026")}
                    {activeTab === "tools" && (language === "bn" ? "কভার পেজ ও ওয়েভার স্কলারশিপ জেনারেটর টুলস" : "Assignment Cover Page & Waiver Calculator Tools")}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {activeTab === "curriculum" && (language === "bn" ? "থিওরি, ল্যাব ক্রেডিট এবং প্রি-রিকুইজিট সহ ১ থেকে ১২ সেমিস্টার পর্যন্ত সবগুলো কোর্স তালিকাভুক্ত।" : "All courses from 1st to 12th semester with credit weights, prerequisite graphs and lab breakdown.")}
                  {activeTab === "faculty" && (language === "bn" ? "শিক্ষকের রুম নম্বর, ইনিশিয়াল, ইমেইল ও কোর্সভিত্তিক পূর্ববর্তী প্রশ্নব্যাংক সরাসরি দেখুন।" : "View faculty room numbers, official email, initials and question paper bank filtered by instructor.")}
                  {activeTab === "calendar" && (language === "bn" ? "Orientation, Add/Drop, Pre-registration এবং পরীক্ষার তারিখ হাই রেজ্যুলিউশন ডাউনলোড সহ।" : "High-res PNG and PDF downloads with dedicated Orientation, Add/Drop and Pre-registration tags.")}
                  {activeTab === "tools" && (language === "bn" ? "অ্যাসাইনমেন্ট ও ল্যাব রিপোর্টের জন্য ৩০টি অফিশিয়াল কালার ও ব্ল্যাক-অ্যান্ড-হোয়াইট DOCX টেমপ্লেট।" : "30 official monochrome and full-color Word templates with real-time preview and instant download.")}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <Link
                  href={
                    activeTab === "curriculum" ? "/curriculum" :
                    activeTab === "faculty" ? "/teachers" :
                    activeTab === "calendar" ? "/tools#calendar" : "/tools"
                  }
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-1.5"
                >
                  <span>{language === "bn" ? "সরাসরি ব্রাউজ করুন" : "Explore Now"}</span>
                  <span className="text-base leading-none">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
