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
          <div className="space-y-3">
            <BrandLogo variant="footer" size="sm" showTagline={false} />
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Southeast University&apos;s premier academic resource & question archive platform. Access lecture notes, course-in materials, past midterm and final examination papers, and faculty schedules all in one unified portal.
            </p>
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
          <div className="flex items-center gap-1">
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
            <span>for academic collaboration</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
