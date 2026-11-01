"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/ui/LogoutButton";
import { useEvent } from "@/context/EventContext";

export default function AdminSidebar() {
  const pathname = usePathname();
  const { isEventWorkspace, currentEvent, activeEvent, buildUrl } = useEvent();

  const navItems = [
    { href: "/admin/dashboard", icon: "dashboard", label: "Dashboard" },
    { href: "/admin/applicants", icon: "group", label: "Applicants" },
    { href: "/admin/rooms", icon: "terminal", label: "Rooms" },
    { href: "/admin/results", icon: "assignment_turned_in", label: "Results" },
    { href: "/admin/analytics", icon: "analytics", label: "Analytics" },
    { href: "/admin/settings", icon: "settings", label: "Settings" },
  ];

  return (
    <>
      {/* Mobile Top Header (Minimal, NO DROPDOWNS) */}
      <div className="md:hidden sticky top-0 z-30 bg-[#0B0D0C]/95 backdrop-blur-md border-b border-[#1D2A22] p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#00FF66] flex items-center justify-center text-[#050505] shadow-[0_0_10px_rgba(0,255,102,0.3)]">
            <span className="material-symbols-outlined text-[18px] font-bold">terminal</span>
          </div>
          <span className="text-sm font-black text-[#F5F5F5] tracking-wider uppercase">NEXUS</span>
        </div>

        {isEventWorkspace && currentEvent && (
          <Link
            href={pathname}
            className="text-[10px] text-[#00FF66] bg-[#00FF66]/10 px-2 py-1 rounded border border-[#00FF66]/20 font-bold uppercase tracking-wider flex items-center gap-1"
          >
            <span>{currentEvent.name}</span>
            <span className="material-symbols-outlined text-[12px]">close</span>
          </Link>
        )}
      </div>

      {/* Desktop Persistent Sidebar */}
      <aside className="w-64 fixed left-0 top-0 z-40 bg-[#0B0D0C] border-r border-[#1D2A22] shadow-2xl flex flex-col h-full py-6 hidden md:flex">
        {/* Brand / Logo */}
        <div className="px-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00FF66] flex items-center justify-center text-[#050505] shadow-[0_0_12px_rgba(0,255,102,0.4)]">
              <span className="material-symbols-outlined text-[20px] font-bold">terminal</span>
            </div>
            <div>
              <h1 className="text-lg font-black text-[#F5F5F5] tracking-wider">NEXUS</h1>
              <p className="text-[9px] font-bold tracking-widest text-[#8A938D] uppercase">Recruitment Engine</p>
            </div>
          </div>
        </div>

        {/* Active Event Indicator */}
        {activeEvent && !isEventWorkspace && (
          <div className="px-4 mb-4">
            <div className="p-2.5 rounded-lg bg-[#101412] border border-[#1D2A22] flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-pulse" />
                  <p className="text-[8px] font-black uppercase tracking-widest text-[#00FF66]">
                    Active Event
                  </p>
                </div>
                <p className="text-[11px] font-bold text-[#F5F5F5] truncate uppercase">
                  {activeEvent.name}
                </p>
              </div>
              {activeEvent.applicantCount !== undefined && (
                <span className="text-[9px] font-mono font-bold text-[#00FF66] bg-[#00FF66]/10 px-1.5 py-0.5 rounded border border-[#00FF66]/20">
                  {activeEvent.applicantCount}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Event Workspace Indicator (Only visible if currently inside an explicit non-active workspace) */}
        {isEventWorkspace && currentEvent && (
          <div className="px-4 mb-4">
            <div className="p-2.5 rounded-lg bg-[#00FF66]/10 border border-[#00FF66]/30 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[8px] font-black uppercase tracking-widest text-[#8A938D]">
                  Event Workspace
                </p>
                <p className="text-[11px] font-bold text-[#F5F5F5] truncate uppercase">
                  {currentEvent.name}
                </p>
              </div>
              <Link
                href={pathname}
                className="text-[9px] text-[#8A938D] hover:text-[#FF4D4D] font-bold uppercase tracking-wider transition-colors p-1"
                title="Exit to Active Event view"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </Link>
            </div>
          </div>
        )}

        {/* Navigation Links — Automatically preserves eventId context if inside workspace */}
        <nav className="flex-1 space-y-1.5 px-4 overflow-y-auto">
          {navItems.map(({ href, icon, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={buildUrl(href)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 ${
                  isActive
                    ? "bg-[#00FF66]/10 text-[#00FF66] border-r-2 border-[#00FF66] shadow-[inset_0_0_12px_rgba(0,255,102,0.05)]"
                    : "text-[#8A938D] hover:text-[#F5F5F5] hover:bg-[#101412] hover:translate-x-1"
                }`}
              >
                <span className="material-symbols-outlined text-lg">{icon}</span>
                <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Logout */}
        <div className="px-4 mt-auto">
          <div className="space-y-1">
            <LogoutButton />
          </div>
        </div>
      </aside>
    </>
  );
}
