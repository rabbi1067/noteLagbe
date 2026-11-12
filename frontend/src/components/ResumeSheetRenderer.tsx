"use client";

import React from "react";
import { User, Phone, Mail, MapPin, Globe, Code2, Link2 } from "lucide-react";
import {
  ResumeData,
  ResumeDesignConfig,
  ResumeSectionKey,
} from "@/lib/resumeTypes";

interface ResumeSheetRendererProps {
  data: ResumeData;
  design: ResumeDesignConfig;
  sheetRef?: React.Ref<HTMLDivElement>;
  measureRef?: React.Ref<HTMLDivElement>;
}

function hasContent(key: ResumeSectionKey, data: ResumeData): boolean {
  switch (key) {
    case "summary":
      return Boolean(data.summary.trim());
    case "education":
      return data.education.some((e) => e.institution.trim() || e.degree.trim());
    case "skills":
      return data.skills.some((s) => s.category.trim() || s.items.trim());
    case "projects":
      return data.projects.some((p) => p.name.trim() || p.description.trim());
    case "experience":
      return data.experience.some(
        (e) => e.role.trim() || e.organization.trim() || e.bullets.some((b) => b.trim())
      );
    case "achievements":
      return data.achievements.some((a) => a.trim());
    case "certifications":
      return data.certifications.some((c) => c.trim());
    case "languages":
      return data.languages.some((l) => l.name.trim());
    case "references":
      return data.referencesOnRequest || data.references.some((r) => r.name.trim());
  }
}

export default function ResumeSheetRenderer({
  data,
  design,
  sheetRef,
  measureRef,
}: ResumeSheetRendererProps) {
  const hidden = new Set(design.hiddenSections);
  const visibleSections = design.sectionOrder.filter(
    (k) => !hidden.has(k) && hasContent(k, data)
  );

  const accent = design.accentColor || "#1d4ed8";
  const compact = design.density === "compact";
  const isSerif = design.font === "serif";
  const fontStack = isSerif
    ? "'Georgia', 'Times New Roman', serif"
    : "'Inter', 'Segoe UI', system-ui, sans-serif";

  const scaleStyle: React.CSSProperties =
    design.autoFitScale < 0.999
      ? {
          transform: `scale(${design.autoFitScale})`,
          transformOrigin: "top left",
          width: `${100 / design.autoFitScale}%`,
        }
      : {};

  const renderPhoto = (shape: "circle" | "rounded", sizePx: number, borderColor = "#ffffff") => {
    if (!design.showPhoto) return null;
    const radius = shape === "circle" ? "9999px" : "10px";
    return (
      <div
        style={{
          width: `${sizePx}px`,
          height: `${sizePx}px`,
          borderRadius: radius,
          border: `3px solid ${borderColor}`,
        }}
        className="overflow-hidden bg-slate-200 flex items-center justify-center shrink-0 shadow-sm"
      >
        {data.photoDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.photoDataUrl}
            alt={data.fullName || "Profile photo"}
            className="w-full h-full object-cover"
          />
        ) : (
          <User className="w-1/2 h-1/2 text-slate-400" />
        )}
      </div>
    );
  };

  // ==================== 1. MODERN SIDEBAR (Francisco Andrade style) ====================
  if (design.template === "modern-sidebar") {
    const leftSet = new Set<ResumeSectionKey>(["skills", "languages", "references"]);
    const leftSections = visibleSections.filter((s) => leftSet.has(s));
    const rightSections = visibleSections.filter((s) => !leftSet.has(s));

    const nameParts = (data.fullName || "YOUR NAME").trim().split(/\s+/);
    const firstName = nameParts.slice(0, Math.max(1, nameParts.length - 1)).join(" ");
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

    return (
      <div
        ref={sheetRef}
        style={{ fontFamily: fontStack }}
        className="w-[794px] h-[1123px] bg-white text-black overflow-hidden relative shadow-xl select-text"
      >
        <div ref={measureRef} style={scaleStyle} className="w-full min-h-[1123px] flex items-stretch px-6 pt-7 pb-6 gap-6">
          {/* Left Muted Slate-Navy Sidebar (Francisco Andrade exact palette) */}
          <div className="w-[248px] shrink-0 flex flex-col">
            <div className="flex justify-center -mb-14 z-10">
              {renderPhoto("circle", 122, "#ffffff")}
            </div>
            <div
              style={{ backgroundColor: accent }}
              className="flex-1 rounded-t-3xl rounded-b-2xl pt-16 pb-6 px-5 text-white space-y-4"
            >
              {/* Contact Me */}
              <div>
                <div className="bg-white rounded-full py-1 px-3 text-center mb-2.5">
                  <span className="text-[11px] font-extrabold tracking-widest uppercase text-black">
                    Contact Me
                  </span>
                </div>
                <div className="space-y-1.5 text-[10.5px] leading-snug text-white">
                  {data.phone && (
                    <div className="flex items-start gap-2">
                      <Phone className="w-3 h-3 mt-0.5 shrink-0 text-white" />
                      <span>{data.phone}</span>
                    </div>
                  )}
                  {data.email && (
                    <div className="flex items-start gap-2 break-all">
                      <Mail className="w-3 h-3 mt-0.5 shrink-0 text-white" />
                      <span>{data.email}</span>
                    </div>
                  )}
                  {data.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-white" />
                      <span>{data.address}</span>
                    </div>
                  )}
                  {[data.linkedin, data.github, data.portfolio]
                    .filter((v) => v.trim())
                    .map((link, idx) => (
                      <div key={idx} className="flex items-start gap-2 break-all">
                        <Globe className="w-3 h-3 mt-0.5 shrink-0 text-white" />
                        <span>{link}</span>
                      </div>
                    ))}
                </div>
              </div>

              {leftSections.map((sec) => (
                <div key={sec}>
                  <div className="bg-white rounded-full py-1 px-3 text-center mb-2">
                    <span className="text-[11px] font-extrabold tracking-widest uppercase text-black">
                      {sec === "skills" ? "Skills" : sec === "languages" ? "Languages" : "References"}
                    </span>
                  </div>
                  {sec === "skills" && (
                    <ul className="space-y-1 text-[10.2px] text-white">
                      {data.skills.map((s) =>
                        s.items.trim() ? (
                          <li key={s.id} className="leading-snug">
                            • {s.category ? <strong className="font-semibold">{s.category}: </strong> : ""}
                            {s.items}
                          </li>
                        ) : null
                      )}
                    </ul>
                  )}
                  {sec === "languages" && (
                    <ul className="space-y-1 text-[10.2px] text-white">
                      {data.languages.map((l) =>
                        l.name.trim() ? (
                          <li key={l.id}>
                            • {l.name} {l.proficiency ? `(${l.proficiency})` : ""}
                          </li>
                        ) : null
                      )}
                    </ul>
                  )}
                  {sec === "references" && (
                    <div className="space-y-2 text-[10px] text-white">
                      {data.referencesOnRequest || data.references.length === 0 ? (
                        <p>Available upon request.</p>
                      ) : (
                        data.references.map((r) =>
                          r.name.trim() ? (
                            <div key={r.id} className="leading-snug">
                              <div className="font-bold text-white">{r.name}</div>
                              <div className="text-white/95 text-[9.5px]">
                                {[r.title, r.organization].filter(Boolean).join(", ")}
                              </div>
                              {r.phone && <div className="text-[9.3px]">Phone: {r.phone}</div>}
                              {r.email && <div className="text-[9.3px] break-all">Email: {r.email}</div>}
                            </div>
                          ) : null
                        )
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Main Area (Pure Black Content Text) */}
          <div className="flex-1 pt-4 space-y-3.5">
            <div className="pb-1">
              <h1 className="text-[30px] leading-tight tracking-wide uppercase font-light text-black">
                {firstName} {lastName && <strong className="font-black">{lastName}</strong>}
              </h1>
              {data.headline && (
                <p className="text-[13px] font-medium text-black mt-1">{data.headline}</p>
              )}
            </div>

            {rightSections.map((sec) => (
              <div key={sec} className="space-y-1.5">
                <div
                  style={{ backgroundColor: accent }}
                  className="inline-block rounded-full px-4 py-1 text-white text-[11px] font-extrabold tracking-widest uppercase"
                >
                  {sec === "summary"
                    ? "About Me"
                    : sec === "experience"
                    ? "Experience"
                    : sec === "projects"
                    ? "Projects"
                    : sec === "education"
                    ? "Education"
                    : sec === "achievements"
                    ? "Achievements"
                    : "Certifications"}
                </div>

                <div className={`rounded-2xl bg-[#f4f6fa] border border-slate-200 ${compact ? "p-2.5" : "p-3"} space-y-2 text-[11px] text-black`}>
                  {sec === "summary" && <p className="leading-relaxed">{data.summary}</p>}

                  {sec === "experience" &&
                    data.experience.map((exp) =>
                      exp.role || exp.organization ? (
                        <div key={exp.id} className="space-y-0.5">
                          <div className="flex items-baseline justify-between gap-2">
                            <strong className="text-[12px] font-bold text-black">
                              {exp.role || exp.organization}
                            </strong>
                            <span className="text-[10.5px] font-medium text-black shrink-0">{exp.period}</span>
                          </div>
                          {exp.role && exp.organization && (
                            <div className="font-semibold text-black">{exp.organization}</div>
                          )}
                          <ul className="space-y-0.5 text-[10.5px]">
                            {exp.bullets.map((b, i) =>
                              b.trim() ? <li key={i}>• {b}</li> : null
                            )}
                          </ul>
                        </div>
                      ) : null
                    )}

                  {sec === "projects" &&
                    data.projects.map((p) =>
                      p.name ? (
                        <div key={p.id}>
                          <div className="flex items-baseline justify-between gap-2">
                            <strong className="font-bold text-black">
                              {p.name}
                            </strong>
                            {p.techStack && (
                              <span className="text-[10px] font-medium text-black">{p.techStack}</span>
                            )}
                          </div>
                          {p.description && <p className="text-[10.5px]">• {p.description}</p>}
                        </div>
                      ) : null
                    )}

                  {sec === "education" &&
                    data.education.map((edu) =>
                      edu.institution || edu.degree ? (
                        <div key={edu.id} className="flex items-baseline justify-between gap-2">
                          <div>
                            <div className="font-bold text-black">{edu.institution}</div>
                            <div className="text-[10.5px] text-black">
                              {edu.degree}
                              {design.showCgpa && edu.cgpa ? ` • CGPA: ${edu.cgpa}` : ""}
                            </div>
                          </div>
                          <span className="text-[10.5px] text-black shrink-0">{edu.period}</span>
                        </div>
                      ) : null
                    )}

                  {sec === "achievements" && (
                    <ul className="space-y-0.5 text-[10.5px]">
                      {data.achievements.map((a, i) => (a.trim() ? <li key={i}>• {a}</li> : null))}
                    </ul>
                  )}

                  {sec === "certifications" && (
                    <ul className="space-y-0.5 text-[10.5px]">
                      {data.certifications.map((c, i) => (c.trim() ? <li key={i}>• {c}</li> : null))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ==================== 2. EUROPE MINIMAL (Emaa Warner style) ====================
  if (design.template === "europe-minimal") {
    const leftSet = new Set<ResumeSectionKey>(["summary", "education", "skills", "languages"]);
    const leftSections = visibleSections.filter((s) => leftSet.has(s));
    const rightSections = visibleSections.filter((s) => !leftSet.has(s));
    const hasPersonalDetails = Boolean(
      data.dateOfBirth.trim() || data.nationality.trim() || data.competitiveProfile.trim()
    );

    return (
      <div
        ref={sheetRef}
        style={{ fontFamily: fontStack }}
        className="w-[794px] h-[1123px] bg-white text-black overflow-hidden relative shadow-xl select-text"
      >
        {/* Top Accent Strip */}
        <div className="flex w-full h-3">
          <div style={{ backgroundColor: accent }} className="w-64 h-full" />
          <div className="flex-1 bg-slate-100 h-full" />
        </div>

        <div
          ref={measureRef}
          style={scaleStyle}
          className={`px-10 ${compact ? "pt-6 pb-10 space-y-4" : "pt-7 pb-10 space-y-5"}`}
        >
          {/* Top Header */}
          <div className="flex items-center gap-7 pb-3 border-b border-slate-300">
            {renderPhoto("circle", 114, "#000000")}
            <div className="space-y-1.5 flex-1">
              <h1 className="text-[28px] font-bold tracking-[0.15em] uppercase leading-tight text-black">
                {data.fullName || "YOUR NAME"}
              </h1>
              {data.headline && (
                <p className="text-[13px] tracking-wide text-black font-medium">{data.headline}</p>
              )}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 text-[10.5px] text-black">
                {data.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="w-3 h-3 shrink-0 text-black" />
                    {data.phone}
                  </span>
                )}
                {data.email && (
                  <span className="inline-flex items-center gap-1.5 break-all">
                    <Mail className="w-3 h-3 shrink-0 text-black" />
                    {data.email}
                  </span>
                )}
                {data.address && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 shrink-0 text-black" />
                    {data.address}
                  </span>
                )}
                {data.portfolio && (
                  <span className="inline-flex items-center gap-1.5 break-all">
                    <Globe className="w-3 h-3 shrink-0 text-black" />
                    {data.portfolio}
                  </span>
                )}
                {data.linkedin && (
                  <span className="inline-flex items-center gap-1.5 break-all">
                    <Link2 className="w-3 h-3 shrink-0 text-black" />
                    {data.linkedin}
                  </span>
                )}
                {data.github && (
                  <span className="inline-flex items-center gap-1.5 break-all">
                    <Code2 className="w-3 h-3 shrink-0 text-black" />
                    {data.github}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 2-Column Body */}
          <div className="grid grid-cols-12 gap-7">
            {/* Left 4 cols */}
            <div className={`col-span-4 ${compact ? "space-y-4" : "space-y-5"} border-r border-slate-300 pr-5 min-h-[820px]`}>
              {leftSections.map((sec) => (
                <div key={sec} className="space-y-1.5">
                  <div className="flex items-center gap-2 border-b border-black pb-1">
                    <h2 className="text-[11px] font-extrabold tracking-widest uppercase text-black">
                      {sec === "summary"
                        ? "Summary"
                        : sec === "education"
                        ? "Education"
                        : sec === "skills"
                        ? "Skills"
                        : "Languages"}
                    </h2>
                  </div>
                  {sec === "summary" && (
                    <p className="text-[11px] leading-[1.52] text-black">{data.summary}</p>
                  )}
                  {sec === "education" &&
                    data.education.map((edu) =>
                      edu.institution || edu.degree ? (
                        <div key={edu.id} className="text-[11px] leading-snug pb-1.5 text-black">
                          <div className="font-bold text-black">{edu.degree || edu.institution}</div>
                          {edu.degree && <div className="text-black">{edu.institution}</div>}
                          <div className="text-[10px] text-black">
                            {[edu.period, design.showCgpa && edu.cgpa ? `CGPA: ${edu.cgpa}` : ""]
                              .filter(Boolean)
                              .join(" • ")}
                          </div>
                        </div>
                      ) : null
                    )}
                  {sec === "skills" && (
                    <ul className="space-y-1.5 text-[11px] leading-snug text-black">
                      {data.skills.map((s) =>
                        s.items.trim() ? (
                          <li key={s.id}>
                            • {s.category ? <strong>{s.category}: </strong> : ""}
                            {s.items}
                          </li>
                        ) : null
                      )}
                    </ul>
                  )}
                  {sec === "languages" && (
                    <ul className="space-y-1 text-[11px] text-black">
                      {data.languages.map((l) =>
                        l.name.trim() ? (
                          <li key={l.id}>
                            • <strong>{l.name}</strong> {l.proficiency ? `— ${l.proficiency}` : ""}
                          </li>
                        ) : null
                      )}
                    </ul>
                  )}
                </div>
              ))}

              {hasPersonalDetails && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-2 border-b border-black pb-1">
                    <h2 className="text-[11px] font-extrabold tracking-widest uppercase text-black">
                      Personal Info
                    </h2>
                  </div>
                  <div className="space-y-1 text-[10.5px] text-black leading-snug">
                    {data.dateOfBirth.trim() && (
                      <div>
                        <span className="font-semibold text-black">DOB: </span>
                        {data.dateOfBirth}
                      </div>
                    )}
                    {data.nationality.trim() && (
                      <div>
                        <span className="font-semibold text-black">Nationality: </span>
                        {data.nationality}
                      </div>
                    )}
                    {data.competitiveProfile.trim() && (
                      <div className="text-[9px] break-words">
                        <span className="font-semibold text-black">Profile: </span>
                        {data.competitiveProfile}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right 8 cols */}
            <div className={`col-span-8 ${compact ? "space-y-4" : "space-y-5"}`}>
              {rightSections.map((sec) => (
                <div key={sec} className="space-y-2">
                  <div className="flex items-center gap-2 border-b pb-1" style={{ borderColor: accent }}>
                    <h2 className="text-[11px] font-extrabold tracking-widest uppercase text-black">
                      {sec === "experience"
                        ? "Experience"
                        : sec === "projects"
                        ? "Projects"
                        : sec === "achievements"
                        ? "Achievements"
                        : sec === "certifications"
                        ? "Certifications"
                        : "References"}
                    </h2>
                  </div>

                  {sec === "experience" &&
                    data.experience.map((exp) =>
                      exp.role || exp.organization ? (
                        <div key={exp.id} className="text-[11px] space-y-0.5 pb-1 text-black">
                          <div className="flex items-baseline justify-between gap-2">
                            <strong className="text-black font-bold">{exp.role || exp.organization}</strong>
                            <span className="text-[10px] font-semibold text-black shrink-0">{exp.period}</span>
                          </div>
                          {exp.role && exp.organization && (
                            <div className="text-[10.5px] text-black font-medium">{exp.organization}</div>
                          )}
                          <ul className="space-y-0.5 text-[11px] leading-[1.48] text-black">
                            {exp.bullets.map((b, i) => (b.trim() ? <li key={i}>• {b}</li> : null))}
                          </ul>
                        </div>
                      ) : null
                    )}

                  {sec === "projects" &&
                    data.projects.map((p) =>
                      p.name ? (
                        <div key={p.id} className="text-[11px] pb-1 text-black">
                          <div className="flex items-baseline justify-between gap-2">
                            <strong className="text-black">{p.name}</strong>
                            <span className="text-[10px] font-medium text-black shrink-0">{p.techStack}</span>
                          </div>
                          {p.description && <p className="text-black leading-[1.48]">• {p.description}</p>}
                          {p.link && (
                            <p className="text-[9.8px] font-medium pt-0.5 text-black">
                              {p.link}
                            </p>
                          )}
                        </div>
                      ) : null
                    )}

                  {sec === "achievements" && (
                    <ul className="space-y-1 text-[11px] leading-[1.48] text-black">
                      {data.achievements.map((a, i) => (a.trim() ? <li key={i}>• {a}</li> : null))}
                    </ul>
                  )}

                  {sec === "certifications" && (
                    <ul className="space-y-1 text-[11px] leading-[1.48] text-black">
                      {data.certifications.map((c, i) => (c.trim() ? <li key={i}>• {c}</li> : null))}
                    </ul>
                  )}

                  {sec === "references" && (
                    <div className="grid grid-cols-2 gap-4 text-[10.8px] text-black">
                      {data.referencesOnRequest || data.references.length === 0 ? (
                        <p className="text-black col-span-2">Available upon request.</p>
                      ) : (
                        data.references.map((r) =>
                          r.name.trim() ? (
                            <div key={r.id} className="space-y-0.5">
                              <div className="font-bold text-black">{r.name}</div>
                              <div className="text-black text-[10px]">
                                {[r.title, r.organization].filter(Boolean).join(", ")}
                              </div>
                              {r.phone && <div className="text-[10px] text-black">Phone: {r.phone}</div>}
                              {r.email && <div className="text-[10px] text-black break-all">Email: {r.email}</div>}
                            </div>
                          ) : null
                        )
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Editorial Declaration Strip + Accent Footer */}
        <div className="absolute bottom-0 inset-x-0">
          <div className="px-10 py-2 border-t border-slate-300 bg-slate-50/90 flex items-center justify-between text-[9.8px] text-black">
            <span>
              Curriculum Vitae • {data.address || data.email || "Available for Opportunities"}
            </span>
            <span className="font-medium text-black">
              {data.signaturePlaceDate || data.fullName || "Certified Accurate"}
            </span>
          </div>
          <div className="flex w-full h-3.5">
            <div className="flex-1 bg-slate-900 h-full" />
            <div style={{ backgroundColor: accent }} className="w-40 h-full" />
          </div>
        </div>
      </div>
    );
  }

  // ==================== 3. GERMANY LEBENSLAUF ====================
  if (design.template === "german-lebenslauf") {
    return (
      <div
        ref={sheetRef}
        style={{ fontFamily: fontStack }}
        className="w-[794px] h-[1123px] bg-white text-black overflow-hidden relative shadow-xl select-text"
      >
        <div ref={measureRef} style={scaleStyle} className={`px-10 ${compact ? "py-5 space-y-2" : "py-7 space-y-3"}`}>
          {/* Header: Title + Left Contact + Right Photo */}
          <div style={{ borderColor: accent }} className="flex items-start justify-between gap-6 border-b-2 pb-2.5">
            <div className="space-y-0.5 flex-1">
              <div className="text-[9.5px] font-black tracking-[0.2em] uppercase text-black">
                Lebenslauf • Curriculum Vitae
              </div>
              <h1 className="text-[24px] font-black text-black leading-tight">
                {data.fullName || "YOUR NAME"}
              </h1>
              {data.headline && <p className="text-[11.5px] text-black font-medium">{data.headline}</p>}
              <div className="text-[10px] text-black pt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                {data.address && <span>{data.address}</span>}
                {data.phone && <span>• {data.phone}</span>}
                {data.email && <span>• {data.email}</span>}
              </div>
              {[data.linkedin, data.github, data.portfolio].filter(Boolean).length > 0 && (
                <div className="text-[9.8px] font-medium text-black flex flex-wrap gap-x-3">
                  {[data.linkedin, data.github, data.portfolio].filter(Boolean).join("  |  ")}
                </div>
              )}
            </div>
            {renderPhoto("rounded", 88, accent)}
          </div>

          {/* German Personal Info Block */}
          {(data.dateOfBirth.trim() || data.nationality.trim()) && (
            <div className="space-y-1">
              <h2 style={{ borderColor: accent }} className="text-[10.5px] font-extrabold uppercase tracking-wider text-black border-b pb-0.5">
                Personal Information / Persönliche Daten
              </h2>
              <div className="grid grid-cols-12 gap-3 text-[10.5px] text-black">
                {data.dateOfBirth.trim() && (
                  <>
                    <div className="col-span-3 font-semibold text-black">Date of Birth</div>
                    <div className="col-span-9 text-black">{data.dateOfBirth}</div>
                  </>
                )}
                {data.nationality.trim() && (
                  <>
                    <div className="col-span-3 font-semibold text-black">Nationality</div>
                    <div className="col-span-9 text-black">{data.nationality}</div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Chronological Sections */}
          {visibleSections.map((sec) => (
            <div key={sec} className="space-y-1">
              <h2 style={{ borderColor: accent }} className="text-[10.5px] font-extrabold uppercase tracking-wider text-black border-b pb-0.5">
                {sec === "summary"
                  ? "Profile Summary"
                  : sec === "experience"
                  ? "Work & Practical Experience"
                  : sec === "education"
                  ? "Education"
                  : sec === "projects"
                  ? "Projects"
                  : sec === "skills"
                  ? "Technical & Core Skills"
                  : sec === "languages"
                  ? "Language Proficiency"
                  : sec === "achievements"
                  ? "Achievements & Awards"
                  : sec === "certifications"
                  ? "Certifications"
                  : "References"}
              </h2>

              {sec === "summary" && <p className="text-[11px] leading-snug text-black">{data.summary}</p>}

              {sec === "experience" && (
                <div className="space-y-1.5">
                  {data.experience.map((exp) =>
                    exp.role || exp.organization ? (
                      <div key={exp.id} className="grid grid-cols-12 gap-3 text-[11px] text-black">
                        <div className="col-span-3 font-semibold text-black text-[10.5px]">{exp.period || "—"}</div>
                        <div className="col-span-9 space-y-0.5">
                          <div className="font-bold text-black">{exp.role || exp.organization}</div>
                          {exp.role && exp.organization && (
                            <div className="text-black italic">{exp.organization}</div>
                          )}
                          <ul className="text-[10.5px] text-black space-y-0.5">
                            {exp.bullets.map((b, i) => (b.trim() ? <li key={i}>• {b}</li> : null))}
                          </ul>
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              )}

              {sec === "education" && (
                <div className="space-y-1.5">
                  {data.education.map((edu) =>
                    edu.institution || edu.degree ? (
                      <div key={edu.id} className="grid grid-cols-12 gap-3 text-[11px] text-black">
                        <div className="col-span-3 font-semibold text-black text-[10.5px]">{edu.period || "—"}</div>
                        <div className="col-span-9">
                          <div className="font-bold text-black">{edu.institution}</div>
                          <div className="text-black text-[10.5px]">
                            {edu.degree}
                            {design.showCgpa && edu.cgpa ? ` • CGPA: ${edu.cgpa}` : ""}
                          </div>
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              )}

              {sec === "projects" && (
                <div className="space-y-1.5">
                  {data.projects.map((p) =>
                    p.name ? (
                      <div key={p.id} className="grid grid-cols-12 gap-3 text-[11px] text-black">
                        <div className="col-span-3 font-semibold text-black text-[10px]">{p.techStack || "Project"}</div>
                        <div className="col-span-9">
                          <span className="font-bold text-black">{p.name}</span>
                          {p.description && <span className="text-black"> — {p.description}</span>}
                        </div>
                      </div>
                    ) : null
                  )}
                </div>
              )}

              {sec === "skills" && (
                <div className="space-y-1">
                  {data.skills.map((sk) =>
                    sk.items.trim() ? (
                      <div key={sk.id} className="grid grid-cols-12 gap-3 text-[11px] text-black">
                        <div className="col-span-3 font-semibold text-black text-[10.5px]">{sk.category}</div>
                        <div className="col-span-9 text-black">{sk.items}</div>
                      </div>
                    ) : null
                  )}
                </div>
              )}

              {sec === "languages" && (
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-black">
                  {data.languages.map((l) =>
                    l.name.trim() ? (
                      <span key={l.id}>
                        • <strong>{l.name}</strong> {l.proficiency ? `(${l.proficiency})` : ""}
                      </span>
                    ) : null
                  )}
                </div>
              )}

              {sec === "achievements" && (
                <ul className="text-[10.5px] text-black space-y-0.5">
                  {data.achievements.map((a, i) => (a.trim() ? <li key={i}>• {a}</li> : null))}
                </ul>
              )}

              {sec === "certifications" && (
                <ul className="text-[10.5px] text-black space-y-0.5">
                  {data.certifications.map((c, i) => (c.trim() ? <li key={i}>• {c}</li> : null))}
                </ul>
              )}

              {sec === "references" && (
                <div className="text-[10.5px] text-black space-y-1">
                  {data.referencesOnRequest || data.references.length === 0 ? (
                    <p>Available upon request.</p>
                  ) : (
                    data.references.map((r) =>
                      r.name.trim() ? (
                        <div key={r.id} className="grid grid-cols-12 gap-3">
                          <div className="col-span-3 font-bold text-black">{r.name}</div>
                          <div className="col-span-9">
                            {[r.title, r.organization, r.phone, r.email].filter(Boolean).join(" • ")}
                          </div>
                        </div>
                      ) : null
                    )
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Signature Footer */}
          {design.showGermanSignature && (
            <div className="pt-2 flex items-end justify-between text-[10.5px] text-black">
              <span className="italic">{data.signaturePlaceDate || "Dhaka, Bangladesh"}</span>
              <div className="w-48 border-t border-black text-right pt-1 font-semibold text-black">
                {data.fullName || "Signature"}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== 4 & 5. LATEX ATS CLASSIC & CORPORATE MINIMAL ====================
  const isLatex = design.template === "latex-ats";

  return (
    <div
      ref={sheetRef}
      style={{ fontFamily: fontStack }}
      className="w-[794px] h-[1123px] bg-white text-black overflow-hidden relative shadow-xl select-text"
    >
      <div
        ref={measureRef}
        style={scaleStyle}
        className={`px-10 ${compact ? "py-6 space-y-2.5" : "py-8 space-y-3.5"}`}
      >
        {/* Header */}
        {isLatex ? (
          <div className="text-center space-y-0.5 pb-1">
            <h1 className="text-[26px] font-bold tracking-tight leading-tight text-black">
              {data.fullName || "YOUR NAME"}
            </h1>
            {data.headline && (
              <p className="text-[11px] text-black">{data.headline}</p>
            )}
            <p className="text-[10.5px] text-black">
              {[data.address, data.phone, data.email].filter((v) => v.trim()).join("  •  ")}
            </p>
            {[data.linkedin, data.github, data.competitiveProfile, data.portfolio].filter((v) => v.trim()).length > 0 && (
              <p className="text-[10px] text-black">
                {[data.linkedin, data.github, data.competitiveProfile, data.portfolio]
                  .filter((v) => v.trim())
                  .join("  |  ")}
              </p>
            )}
          </div>
        ) : (
          <div style={{ borderColor: accent }} className="flex items-center justify-between gap-5 border-l-4 pl-4 py-1">
            <div className="space-y-0.5 flex-1">
              <h1 className="text-[26px] font-black text-black leading-tight">
                {data.fullName || "YOUR NAME"}
              </h1>
              {data.headline && (
                <p className="text-[12px] font-bold text-black">{data.headline}</p>
              )}
              <p className="text-[10.5px] text-black pt-0.5">
                {[data.phone, data.email, data.address, data.linkedin, data.github]
                  .filter((v) => v.trim())
                  .join("  •  ")}
              </p>
            </div>
            {renderPhoto("rounded", 84, accent)}
          </div>
        )}

        {/* Sections */}
        {visibleSections.map((sec) => (
          <div key={sec} className="space-y-1">
            <h2 style={{ borderColor: isLatex ? "#000000" : accent }} className="text-[11.5px] font-bold tracking-wider uppercase text-black border-b pb-0.5">
              {sec === "summary"
                ? "Summary"
                : sec === "education"
                ? "Education"
                : sec === "skills"
                ? "Technical Skills"
                : sec === "projects"
                ? "Projects"
                : sec === "experience"
                ? "Experience"
                : sec === "achievements"
                ? "Achievements"
                : sec === "certifications"
                ? "Certifications"
                : sec === "languages"
                ? "Languages"
                : "References"}
            </h2>

            {sec === "summary" && (
              <p className="text-[11px] leading-snug text-black">{data.summary}</p>
            )}

            {sec === "education" && (
              <div className="space-y-1">
                {data.education.map((edu) =>
                  edu.institution || edu.degree ? (
                    <div key={edu.id} className="text-[11px] text-black">
                      <div className="flex items-baseline justify-between gap-2">
                        <strong className="text-black font-bold">{edu.institution}</strong>
                        <span className="italic text-[10.5px] text-black shrink-0">{edu.period}</span>
                      </div>
                      <div className="italic text-[10.5px] text-black">
                        {edu.degree}
                        {design.showCgpa && edu.cgpa ? `  •  CGPA: ${edu.cgpa}` : ""}
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            )}

            {sec === "skills" && (
              <ul className="space-y-0.5 text-[11px] text-black">
                {data.skills.map((s) =>
                  s.items.trim() ? (
                    <li key={s.id}>
                      • {s.category ? <strong>{s.category}: </strong> : ""}
                      {s.items}
                    </li>
                  ) : null
                )}
              </ul>
            )}

            {sec === "projects" && (
              <ul className="space-y-0.5 text-[11px] text-black">
                {data.projects.map((p) =>
                  p.name ? (
                    <li key={p.id}>
                      • <strong>{p.name}</strong>
                      {p.techStack ? <span className="italic text-black"> ({p.techStack})</span> : ""}
                      {p.description ? ` — ${p.description}` : ""}
                    </li>
                  ) : null
                )}
              </ul>
            )}

            {sec === "experience" && (
              <div className="space-y-1.5">
                {data.experience.map((exp) =>
                  exp.role || exp.organization ? (
                    <div key={exp.id} className="text-[11px] text-black">
                      <div className="flex items-baseline justify-between gap-2">
                        <strong className="text-black font-bold">{exp.role || exp.organization}</strong>
                        <span className="italic text-[10.5px] text-black shrink-0">{exp.period}</span>
                      </div>
                      {exp.role && exp.organization && (
                        <div className="italic text-[10.5px] text-black">{exp.organization}</div>
                      )}
                      <ul className="pl-3 space-y-0.5 text-[10.5px] text-black">
                        {exp.bullets.map((b, i) => (b.trim() ? <li key={i}>• {b}</li> : null))}
                      </ul>
                    </div>
                  ) : null
                )}
              </div>
            )}

            {sec === "achievements" && (
              <ul className="space-y-0.5 text-[10.5px] text-black">
                {data.achievements.map((a, i) => (a.trim() ? <li key={i}>• {a}</li> : null))}
              </ul>
            )}

            {sec === "certifications" && (
              <ul className="space-y-0.5 text-[10.5px] text-black">
                {data.certifications.map((c, i) => (c.trim() ? <li key={i}>• {c}</li> : null))}
              </ul>
            )}

            {sec === "languages" && (
              <p className="text-[10.5px] text-black">
                {data.languages
                  .filter((l) => l.name.trim())
                  .map((l) => (l.proficiency ? `${l.name} (${l.proficiency})` : l.name))
                  .join("  •  ")}
              </p>
            )}

            {sec === "references" && (
              <div className="text-[10.5px] text-black space-y-0.5">
                {data.referencesOnRequest || data.references.length === 0 ? (
                  <p>Available upon request.</p>
                ) : (
                  data.references.map((r) =>
                    r.name.trim() ? (
                      <div key={r.id}>
                        <strong className="text-black">{r.name}</strong>
                        <div className="italic text-black">
                          {[r.title, r.organization, r.phone, r.email].filter(Boolean).join("  •  ")}
                        </div>
                      </div>
                    ) : null
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
