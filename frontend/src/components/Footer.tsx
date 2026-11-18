"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, MapPin, Mail, Phone, ExternalLink } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

export default function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return (
    <footer className="print:hidden w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b1120] text-slate-600 dark:text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          
          {/* Col 1: Brand */}
          <div className="space-y-4">
            <BrandLogo variant="footer" size="sm" showTagline={false} />
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Southeast University&apos;s premier academic resource & question archive platform. Access lecture notes, course-in materials, past midterm and final examination papers, and faculty schedules all in one unified portal.
            </p>
            {/* Social Links: Connect with Founder & Lead Developer */}
            <div className="pt-1">
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
                Connect with Developer &amp; Founder
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="https://www.facebook.com/fazleyrabbi1067/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook Profile - Fazle Rabbi"
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-[#1877F2] dark:bg-slate-800 dark:hover:bg-[#1877F2] text-slate-600 dark:text-slate-300 hover:text-white flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-xs group"
                  title="Facebook - Fazle Rabbi"
                >
                  <svg className="w-4 h-4 fill-current transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                <a
                  href="https://x.com/FazleRabbi56251"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X (formerly Twitter) Profile - Fazle Rabbi"
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-black dark:bg-slate-800 dark:hover:bg-black text-slate-600 dark:text-slate-300 hover:text-white flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-xs group border border-transparent dark:hover:border-slate-700"
                  title="X (Twitter) - @FazleRabbi56251"
                >
                  <svg className="w-4 h-4 fill-current transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href="https://github.com/rabbi1067"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub Profile - rabbi1067"
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-[#24292e] dark:bg-slate-800 dark:hover:bg-[#24292e] text-slate-600 dark:text-slate-300 hover:text-white flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-xs group"
                  title="GitHub - rabbi1067"
                >
                  <svg className="w-4 h-4 fill-current transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                </a>
                <a
                  href="https://www.linkedin.com/in/fazleyrabbi1067/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn Profile - Fazle Rabbi"
                  className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-[#0A66C2] dark:bg-slate-800 dark:hover:bg-[#0A66C2] text-slate-600 dark:text-slate-300 hover:text-white flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-xs group"
                  title="LinkedIn - Fazle Rabbi"
                >
                  <svg className="w-4 h-4 fill-current transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v7.6h2.8v-7.6h-2.8M7.86 6.5a1.63 1.63 0 0 0-1.63 1.63c0 .9.73 1.63 1.63 1.63.9 0 1.63-.73 1.63-1.63 0-.9-.73-1.63-1.63-1.63z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <h5 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3">Quick Links</h5>
            <ul className="space-y-2 font-medium">
              <li>
                <Link href="/courses" className="hover:text-blue-600 dark:hover:text-blue-400">All Courses & Notes</Link>
              </li>
              <li>
                <Link href="/curriculum" className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5">
                  <span>Academic Curriculum</span>
                  <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">Batch 72+ & 60-71</span>
                </Link>
              </li>
              <li>
                <Link href="/teachers" className="hover:text-blue-600 dark:hover:text-blue-400">Faculty & Staff Directory</Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-blue-600 dark:hover:text-blue-400">Subscription Plans & Quota</Link>
              </li>
              <li>
                <Link href="/contribute" className="hover:text-blue-600 dark:hover:text-blue-400">Upload Notes (+2 Courses Free)</Link>
              </li>
            </ul>
          </div>

          {/* Col 3: SEU Quick Hub */}
          <div>
            <h5 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3">University Portals</h5>
            <ul className="space-y-2 font-medium">
              <li>
                <a href="https://ums.seu.edu.bd" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400">
                  <span>UMS Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="https://cse.seu.edu.bd" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400">
                  <span>Dept. of CSE Website</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <a href="https://admission.seu.edu.bd" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400">
                  <span>Online Admission</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Campus Contact */}
          <div>
            <h5 className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3">Permanent Campus</h5>
            <p className="space-y-1.5 text-slate-500 dark:text-slate-400">
              <span className="block font-semibold text-slate-700 dark:text-slate-300">Southeast University</span>
              <span>251/A and 252, Tejgaon I/A,</span><br/>
              <span>Dhaka-1208, Bangladesh</span>
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
          <p>© {new Date().getFullYear()} NoteLagbe. Built for university excellence.</p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="https://www.linkedin.com/in/fazleyrabbi1067/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60"
            >
              <span>Lead Developer: Fazle Rabbi</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <div className="flex items-center gap-1 text-xs">
              <span>Crafted with</span>
              <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
              <span>for SEU</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
