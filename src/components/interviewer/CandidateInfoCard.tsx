"use client";

import React from "react";
import { getPathConfig, normalizePathLabel } from "@/lib/dimensions";

export interface CandidateInfoCardProps {
  name: string;
  rollNumber: string;
  department?: string | null;
  branch?: string | null;
  year?: string | null;
  email?: string | null;
  phone?: string | null;
  appliedPath?: string | null;
  currentlyEvaluatedPath?: string | null;
}

export default function CandidateInfoCard({
  name,
  rollNumber,
  department,
  branch,
  year,
  email,
  phone,
  appliedPath,
  currentlyEvaluatedPath,
}: CandidateInfoCardProps) {
  const canonicalApplied = normalizePathLabel(appliedPath);
  const appliedConfig = canonicalApplied ? getPathConfig(canonicalApplied) : null;

  const canonicalEvaluated = normalizePathLabel(currentlyEvaluatedPath);
  const evaluatedConfig = canonicalEvaluated ? getPathConfig(canonicalEvaluated) : null;

  const isDifferent =
    canonicalEvaluated && canonicalApplied && canonicalEvaluated !== canonicalApplied;

  return (
    <div className="w-full bg-[#101412] border border-[#1D2A22] rounded-xl p-5 shadow-xl flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-[#1D2A22] pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#00FF66] text-lg font-bold">
            person_pin
          </span>
          <h2 className="text-xs font-black text-[#F5F5F5] uppercase tracking-widest">
            Candidate Info
          </h2>
        </div>
        <span className="text-[10px] font-mono text-[#8A938D] font-bold">
          {rollNumber || "—"}
        </span>
      </div>

      <div>
        <h3 className="text-lg font-black text-[#F5F5F5] uppercase tracking-wide break-words">
          {name || "Unknown Candidate"}
        </h3>

        {/* Path Badges */}
        <div className="flex flex-wrap items-center gap-2 mt-2.5">
          {appliedConfig ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0B0D0C] border border-[#00FF66]/30 text-[10px] font-bold text-[#00FF66]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66]" />
              <span>Applied: {appliedConfig.name}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0B0D0C] border border-[#FFB020]/40 text-[10px] font-bold text-[#FFB020]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFB020]" />
              <span>Applied: Path not detected</span>
            </div>
          )}

          {isDifferent && evaluatedConfig && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#00FF66]/10 border border-[#00FF66] text-[10px] font-black uppercase tracking-wider text-[#00FF66] shadow-[0_0_8px_rgba(0,255,102,0.2)]">
              <span className="material-symbols-outlined text-[13px] font-bold">
                swap_horiz
              </span>
              <span>Evaluating: {evaluatedConfig.name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#1D2A22]/50 text-left">
        <div>
          <span className="text-[9px] uppercase tracking-widest text-[#8A938D] font-bold block">
            Department
          </span>
          <span className="text-xs font-semibold text-[#F5F5F5] truncate block mt-0.5">
            {department || branch || "—"}
          </span>
        </div>
        <div>
          <span className="text-[9px] uppercase tracking-widest text-[#8A938D] font-bold block">
            Year
          </span>
          <span className="text-xs font-semibold text-[#F5F5F5] truncate block mt-0.5">
            {year || "—"}
          </span>
        </div>
        <div className="col-span-2">
          <span className="text-[9px] uppercase tracking-widest text-[#8A938D] font-bold block">
            Email
          </span>
          <span className="text-xs font-mono text-[#F5F5F5] truncate block mt-0.5">
            {email || "—"}
          </span>
        </div>
        <div className="col-span-2">
          <span className="text-[9px] uppercase tracking-widest text-[#8A938D] font-bold block">
            Phone
          </span>
          <span className="text-xs font-mono text-[#F5F5F5] truncate block mt-0.5">
            {phone || "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

