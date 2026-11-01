"use client";

import React from "react";
import { useClerk } from "@clerk/nextjs";
import Link from "next/link";
import CustomCursor from "@/components/ui/CustomCursor";

interface AccessDeniedProps {
  requiredPortal: "Admin" | "Interviewer";
  userRole: string;
  authorizedDashboard: string;
  message: string;
}

export default function AccessDenied({
  requiredPortal,
  userRole,
  authorizedDashboard,
  message,
}: AccessDeniedProps) {
  const { signOut } = useClerk();

  const handleSignOut = async () => {
    await signOut({ redirectUrl: `/login?portal=${requiredPortal.toLowerCase()}` });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#F5F5F5] flex items-center justify-center px-6 selection:bg-[#00FF66]/30 selection:text-[#00FF66] font-body-md">
      <CustomCursor />
      <div className="w-full max-w-[480px]">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#FF4D4D]/30 bg-[#101412] shadow-[0_0_20px_rgba(255,77,77,0.15)]">
            <span className="material-symbols-outlined text-3xl text-[#FF4D4D]">
              lock
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-wide text-[#FFFFFF] uppercase">
            Access Denied
          </h1>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-[#8A938D] font-bold">
            {requiredPortal} Portal Authorization Required
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#FF4D4D]/30 bg-[#101412] p-8 shadow-2xl relative overflow-hidden space-y-6">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF4D4D]/60 to-transparent" />

          <div className="rounded-xl border border-[#FF4D4D]/20 bg-[#FF4D4D]/10 p-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[#FF4D4D] text-lg mt-0.5 flex-shrink-0">
                error
              </span>
              <p className="text-xs leading-5 font-bold uppercase tracking-wider text-[#FF4D4D]">
                {message}
              </p>
            </div>
          </div>

          <div className="bg-[#050505] border border-[#1D2A22] rounded-xl p-4 text-xs space-y-2">
            <div className="flex justify-between items-center text-[#8A938D]">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Your Current Role:</span>
              <span className="font-mono font-bold text-[#00FF66] uppercase">{userRole}</span>
            </div>
            <div className="flex justify-between items-center text-[#8A938D]">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Attempted Portal:</span>
              <span className="font-mono font-bold text-[#FF4D4D] uppercase">{requiredPortal} Portal</span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <Link
              href={authorizedDashboard}
              className="w-full flex items-center justify-center gap-2 bg-[#00FF66] hover:bg-[#00E55C] text-[#050505] font-black uppercase tracking-wider text-xs py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(0,255,102,0.25)] hover:shadow-[0_0_24px_rgba(0,255,102,0.45)]"
            >
              <span>Go to {userRole === "admin" ? "Admin" : "Interviewer"} Dashboard</span>
              <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 bg-[#050505] hover:bg-[#151917] border border-[#1D2A22] text-[#8A938D] hover:text-[#FF4D4D] hover:border-[#FF4D4D]/30 font-bold uppercase tracking-wider text-xs py-3.5 rounded-xl transition-colors"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              <span>Switch Account / Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

