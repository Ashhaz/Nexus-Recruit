"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEvent } from "@/context/EventContext";

export default function EventWorkspaceBanner() {
  const pathname = usePathname();
  const { isEventWorkspace, currentEvent } = useEvent();

  if (!isEventWorkspace) return null;

  return (
    <div className="bg-[#00FF66]/10 border border-[#00FF66]/30 text-[#00FF66] px-4 py-2.5 rounded-xl flex items-center justify-between gap-4 mb-6 shadow-[0_0_15px_rgba(0,255,102,0.08)]">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="material-symbols-outlined text-[18px] text-[#00FF66] flex-shrink-0">
          folder_open
        </span>
        <div className="flex items-center flex-wrap gap-2 min-w-0">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#8A938D]">
            Event Workspace:
          </span>
          <span className="text-xs font-black text-[#F5F5F5] uppercase tracking-wide truncate">
            {currentEvent ? currentEvent.name : "Event Filter Active"}
          </span>
          {currentEvent && (
            <span className="text-[10px] bg-[#00FF66]/20 text-[#00FF66] font-mono px-2 py-0.5 rounded-full border border-[#00FF66]/30">
              {currentEvent.applicantCount ?? 0} applicants
            </span>
          )}
        </div>
      </div>

      <Link
        href={pathname}
        className="px-3 py-1.5 bg-[#050505] hover:bg-[#101412] text-[#F5F5F5] hover:text-[#00FF66] border border-[#1D2A22] hover:border-[#00FF66]/40 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 flex-shrink-0"
        title="Exit event workspace and return to overall application view"
      >
        <span className="material-symbols-outlined text-[14px]">arrow_back</span>
        <span>Exit to All Events</span>
      </Link>
    </div>
  );
}

