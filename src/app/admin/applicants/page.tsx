"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/ui/LogoutButton";
import CustomCursor from "@/components/ui/CustomCursor";
import AdminSidebar from "@/components/admin/AdminSidebar";
import EventWorkspaceBanner from "@/components/admin/EventWorkspaceBanner";
import { useEvent } from "@/context/EventContext";

// Define shape based on MongoDB schema
interface EvaluationCriterionSnapshot {
  id: string;
  label: string;
  score: number;
  maxScore: number;
}

interface Evaluation {
  technical?: number | null;
  communication?: number | null;
  confidence?: number | null;
  leadership?: number | null;
  teamwork?: number | null;
  criteriaSnapshot?: EvaluationCriterionSnapshot[];
  submittedAt?: string;
}

interface ApplicantData {
  _id: string;
  name: string;
  rollNumber: string;
  email?: string;
  phone?: string;
  department?: string;
  branch?: string;
  year?: string;
  teamApplied?: string;
  source?: string;
  eventId?: string;
  responses: Record<string, string>;
  interviewStatus: "Waiting" | "Interviewing" | "Approved" | "Pending" | "Discussion Needed";
  assignedRoom?: number | null;
  assignedInterviewer?: string;
  interviewDuration?: number;
  finalDecision?: string;
  interviewNotes?: string;
  evaluation?: Evaluation;
  updatedAt: string;
}

type StatusType = "ALL" | "WAITING" | "INTERVIEWING" | "APPROVED" | "PENDING" | "DISCUSSION NEEDED";

export default function AdminApplicantsPage() {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const { eventId } = useEvent();
  const [applicants, setApplicants] = useState<ApplicantData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<StatusType>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchApplicants = useCallback(async () => {
    try {
      setIsLoading(true);
      const url = eventId
        ? `/api/dashboard/applicants?eventId=${encodeURIComponent(eventId)}`
        : "/api/dashboard/applicants";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.applicants) {
        setApplicants(data.applicants);
      }
    } catch (err) {
      console.error("Failed to fetch applicants:", err);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchApplicants();
  }, [fetchApplicants]);

  // Calculate status counts based on real database applicants
  const counts = {
    ALL: applicants.length,
    WAITING: applicants.filter(a => a.interviewStatus === "Waiting").length,
    INTERVIEWING: applicants.filter(a => a.interviewStatus === "Interviewing").length,
    APPROVED: applicants.filter(a => a.interviewStatus === "Approved").length,
    PENDING: applicants.filter(a => a.interviewStatus === "Pending").length,
    "DISCUSSION NEEDED": applicants.filter(a => a.interviewStatus === "Discussion Needed").length,
  };

  // Filter and search applicants
  const filteredApplicants = applicants.filter(applicant => {
    // 1. Status Filter
    if (selectedStatus !== "ALL") {
      const mappedStatus = selectedStatus === "DISCUSSION NEEDED" ? "Discussion Needed" : 
                           selectedStatus.charAt(0) + selectedStatus.slice(1).toLowerCase();
      if (applicant.interviewStatus !== mappedStatus) {
        return false;
      }
    }

    // 2. Search query (name or roll number)
    if (query.trim().length > 0) {
      const q = query.toLowerCase();
      const nameMatch = applicant.name.toLowerCase().includes(q);
      const rollMatch = applicant.rollNumber.toLowerCase().includes(q);
      if (!nameMatch && !rollMatch) {
        return false;
      }
    }

    return true;
  });

  const toggleRow = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-[#00FF66]/10 text-[#00FF66] border-[#00FF66]/20";
      case "Pending":
        return "bg-[#1D1B08] text-[#FFD600] border-[#4A4000]";
      case "Discussion Needed":
        return "bg-[#1D0813] text-[#FF007A] border-[#4A0020]";
      case "Interviewing":
        return "bg-[#1D1708] text-[#FF9E00] border-[#4A2D00]";
      default: // Waiting
        return "bg-[#151716] text-[#8A938D] border-[#2C302E]";
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#050505] text-[#F5F5F5] font-body-md selection:bg-[#00FF66]/30 selection:text-[#00FF66]">
      <CustomCursor />

      {/* SideNavBar - Admin */}
      <AdminSidebar />

      {/* Main Content Area */}
      <main className="md:ml-64 flex-1 min-h-screen flex flex-col relative">

        {/* Page Content */}
        <div className="flex-1 p-8 max-w-[1440px] mx-auto w-full space-y-6 overflow-x-hidden pt-8">
          <EventWorkspaceBanner />

          {/* Page Header */}
          <div>
            <h2 className="text-2xl font-black tracking-wide text-[#F5F5F5] uppercase">
              Applicant Database
            </h2>
            <p className="text-xs text-[#8A938D] mt-1 font-semibold uppercase tracking-wider">
              Review and manage registered candidates.
            </p>
          </div>

          {/* Search Panel */}
          <div className="bg-[#101412] rounded-xl border border-[#1D2A22] p-6 shadow-md space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00FF66] text-lg">person_search</span>
              <h3 className="text-[10px] font-black text-[#F5F5F5] uppercase tracking-widest">Search Candidates</h3>
            </div>
            
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none z-10">
                <span className={`material-symbols-outlined text-lg transition-colors duration-200 ${query.length >= 2 ? 'text-[#00FF66]' : 'text-[#8A938D]/50'}`}>search</span>
              </div>
              <input
                className="w-full h-12 pl-12 pr-4 bg-[#0B0D0C] border border-[#1D2A22] rounded-lg text-sm text-[#F5F5F5] placeholder-[#8A938D]/40 focus:outline-none focus:border-[#00FF66]/50 focus:shadow-[0_0_12px_rgba(0,255,102,0.1)] transition-all duration-300"
                placeholder="Search by name or roll number..."
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {/* Status Filter Row */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[#1D2A22]/50">
              {(Object.keys(counts) as StatusType[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold tracking-wider transition-all duration-300 flex items-center gap-2 ${
                    selectedStatus === status
                      ? "bg-[#00FF66]/10 text-[#00FF66] border-[#00FF66]/30 shadow-[0_0_12px_rgba(0,255,102,0.05)]"
                      : "bg-[#0B0D0C] text-[#8A938D] border-[#1D2A22] hover:text-[#F5F5F5] hover:border-[#8A938D]/30"
                  }`}
                >
                  <span className="uppercase">{status}</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${
                    selectedStatus === status
                      ? "bg-[#00FF66]/20 text-[#00FF66]"
                      : "bg-[#101412] text-[#8A938D]"
                  }`}>
                    {counts[status]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-10 h-10 border-2 border-[#1D2A22] border-t-[#00FF66] rounded-full animate-spin"></div>
              <p className="text-[10px] font-bold text-[#8A938D] uppercase tracking-widest">Loading applicant database...</p>
            </div>
          ) : (
            <div className="bg-[#101412] rounded-xl border border-[#1D2A22] overflow-hidden shadow-md">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-[#0B0D0C] border-b border-[#1D2A22]">
                      <th className="p-4 text-[9px] font-black text-[#8A938D] uppercase tracking-widest">Applicant</th>
                      <th className="p-4 text-[9px] font-black text-[#8A938D] uppercase tracking-widest">Roll Number</th>
                      <th className="p-4 text-[9px] font-black text-[#8A938D] uppercase tracking-widest">Event</th>
                      <th className="p-4 text-[9px] font-black text-[#8A938D] uppercase tracking-widest">Department</th>
                      <th className="p-4 text-[9px] font-black text-[#8A938D] uppercase tracking-widest">Status</th>
                      <th className="p-4 text-[9px] font-black text-[#8A938D] uppercase tracking-widest">Interviewer</th>
                      <th className="p-4 text-[9px] font-black text-[#8A938D] uppercase tracking-widest">Room</th>
                      <th className="p-4 text-[9px] font-black text-[#8A938D] uppercase tracking-widest">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1D2A22]/50">
                    {filteredApplicants.length > 0 ? (
                      filteredApplicants.map((applicant) => {
                        const isExpanded = expandedId === applicant._id;
                        const hasInterviewed = applicant.interviewStatus !== "Waiting";
                        
                        return (
                          <React.Fragment key={applicant._id}>
                            <tr
                              onClick={() => toggleRow(applicant._id)}
                              className={`hover:bg-[#00FF66]/[0.02] cursor-pointer transition-colors ${
                                isExpanded ? "bg-[#00FF66]/[0.02]" : ""
                              }`}
                            >
                              <td className="p-4">
                                <div className="text-sm font-bold text-[#F5F5F5] uppercase">{applicant.name}</div>
                              </td>
                              <td className="p-4 font-mono text-xs text-[#8A938D]">
                                {applicant.rollNumber}
                              </td>
                              <td className="p-4 text-xs">
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/20 inline-block">
                                  {applicant.source || "Default"}
                                </span>
                              </td>
                              <td className="p-4 text-xs text-[#8A938D]">
                                {applicant.department || "—"}
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getStatusBadgeClass(applicant.interviewStatus)}`}>
                                  {applicant.interviewStatus}
                                </span>
                              </td>
                              <td className="p-4 text-xs text-[#8A938D]">
                                {hasInterviewed ? (applicant.assignedInterviewer || "—") : "—"}
                              </td>
                              <td className="p-4 text-xs text-[#8A938D]">
                                {hasInterviewed && applicant.assignedRoom ? `Room ${String(applicant.assignedRoom).padStart(2, '0')}` : "—"}
                              </td>
                              <td className="p-4 text-xs text-[#8A938D]">
                                {new Date(applicant.updatedAt).toLocaleDateString("en-US", {
                                  month: "numeric",
                                  day: "numeric",
                                  year: "numeric"
                                })}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={8} className="p-0 bg-[#0B0D0C]/40 border-t border-[#1D2A22]/30">
                                  <ExpandedDetailPane applicant={applicant} />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-[#8A938D] text-xs">
                          No applicants found matching current criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Stacked Layout View */}
              <div className="md:hidden divide-y divide-[#1D2A22]/50">
                {filteredApplicants.length > 0 ? (
                  filteredApplicants.map((applicant) => {
                    const isExpanded = expandedId === applicant._id;
                    const hasInterviewed = applicant.interviewStatus !== "Waiting";

                    return (
                      <div key={applicant._id} className="p-4 space-y-3">
                        <div
                          onClick={() => toggleRow(applicant._id)}
                          className="flex justify-between items-start cursor-pointer"
                        >
                          <div>
                            <div className="text-sm font-bold text-[#F5F5F5] uppercase">{applicant.name}</div>
                            <div className="text-[11px] text-[#8A938D] font-mono mt-0.5">{applicant.rollNumber}</div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${getStatusBadgeClass(applicant.interviewStatus)}`}>
                            {applicant.interviewStatus}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-[#8A938D]">
                          <div><span className="font-semibold text-[#00FF66]">Event:</span> {applicant.source || "Default"}</div>
                          <div><span className="font-semibold">Dept:</span> {applicant.department || "—"}</div>
                          <div>
                            <span className="font-semibold">Updated:</span> {new Date(applicant.updatedAt).toLocaleDateString("en-US", {
                              month: "numeric",
                              day: "numeric",
                              year: "numeric"
                            })}
                          </div>
                          <div><span className="font-semibold">Interviewer:</span> {hasInterviewed ? (applicant.assignedInterviewer || "—") : "—"}</div>
                          <div><span className="font-semibold">Room:</span> {hasInterviewed && applicant.assignedRoom ? `Room ${String(applicant.assignedRoom).padStart(2, '0')}` : "—"}</div>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-[#1D2A22] bg-[#0B0D0C]/40 -mx-4 px-4 pb-4">
                            <ExpandedDetailPane applicant={applicant} />
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-[#8A938D] text-xs">
                    No applicants found matching current criteria.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Expanded Detail Pane Component ──────────────────────────────────────────

function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const paddedMinutes = String(remainingMinutes).padStart(2, '0');
  return `${hours}h ${paddedMinutes}m`;
}

function ExpandedDetailPane({ applicant }: { applicant: ApplicantData }) {
  const isWaiting = applicant.interviewStatus === "Waiting";
  const isInterviewing = applicant.interviewStatus === "Interviewing";

  // Ratings helper
  const getRatingValue = (val: number | null | undefined, max: number = 10) => {
    return val !== undefined && val !== null ? `${val}/${max}` : "—";
  };

  // Profile fields to exclude from custom application questions
  const isStandardProfileField = (question: string) => {
    const q = question.trim().toLowerCase();
    return [
      "timestamp",
      "email address",
      "name :",
      "name",
      "gender",
      "roll number",
      "year of studying",
      "branch",
      "contact number"
    ].includes(q);
  };

  const isBlank = (value: any) => {
    return value == null || (typeof value === "string" && value.trim() === "");
  };

  const validResponses = Object.entries(applicant.responses || {}).filter(([question, answer]) => {
    if (isStandardProfileField(question)) return false;
    if (isBlank(answer)) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Interview Details & Evaluation */}
        <div className="space-y-6">
          {/* Interview Details */}
          <div className="bg-[#101412] rounded-lg border border-[#1D2A22] p-5">
            <h4 className="text-[10px] font-black text-[#00FF66] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">event_note</span>
              Interview Details
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-[#8A938D] uppercase font-bold block">Interviewer</span>
                <span className="text-xs text-[#F5F5F5] font-semibold mt-0.5 block">
                  {isWaiting ? "—" : (applicant.assignedInterviewer || "—")}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#8A938D] uppercase font-bold block">Room</span>
                <span className="text-xs text-[#F5F5F5] font-semibold mt-0.5 block">
                  {isWaiting ? "—" : (applicant.assignedRoom ? `Room ${String(applicant.assignedRoom).padStart(2, '0')}` : "—")}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#8A938D] uppercase font-bold block">Interview Duration</span>
                <span className="text-xs text-[#F5F5F5] font-semibold mt-0.5 block">
                  {isWaiting ? "—" : applicant.interviewDuration ? formatDuration(applicant.interviewDuration) : isInterviewing ? "0s" : "—"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#8A938D] uppercase font-bold block">Decision</span>
                <span className="text-xs text-[#F5F5F5] font-semibold mt-0.5 block">
                  {isWaiting ? "—" : isInterviewing ? "—" : (applicant.finalDecision || "—")}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-[10px] text-[#8A938D] uppercase font-bold block">Interview Status</span>
                <span className="text-xs text-[#F5F5F5] font-semibold mt-0.5 block uppercase">
                  {isInterviewing ? "Live" : applicant.interviewStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Evaluation & Ratings */}
          <div className="bg-[#101412] rounded-lg border border-[#1D2A22] p-5">
            <h4 className="text-[10px] font-black text-[#00FF66] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">analytics</span>
              Evaluation
            </h4>
            
            {isWaiting ? (
              <div className="text-center py-6 text-xs text-[#8A938D] font-bold uppercase tracking-wider bg-[#0B0D0C]/40 border border-dashed border-[#1D2A22] rounded-lg">
                INTERVIEW NOT YET CONDUCTED
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  {applicant.evaluation?.criteriaSnapshot && applicant.evaluation.criteriaSnapshot.length > 0 ? (
                    applicant.evaluation.criteriaSnapshot.map((crit) => (
                      <React.Fragment key={crit.id || crit.label}>
                        <div className="text-[#8A938D] font-semibold truncate pr-2">{crit.label}</div>
                        <div className="text-[#F5F5F5] font-bold text-right font-mono">
                          {getRatingValue(crit.score, crit.maxScore || 10)}
                        </div>
                      </React.Fragment>
                    ))
                  ) : (
                    <>
                      <div className="text-[#8A938D] font-semibold">Technical</div>
                      <div className="text-[#F5F5F5] font-bold text-right font-mono">{getRatingValue(applicant.evaluation?.technical)}</div>
                      
                      <div className="text-[#8A938D] font-semibold">Communication</div>
                      <div className="text-[#F5F5F5] font-bold text-right font-mono">{getRatingValue(applicant.evaluation?.communication)}</div>
                      
                      <div className="text-[#8A938D] font-semibold">Confidence</div>
                      <div className="text-[#F5F5F5] font-bold text-right font-mono">{getRatingValue(applicant.evaluation?.confidence)}</div>
                      
                      <div className="text-[#8A938D] font-semibold">Leadership</div>
                      <div className="text-[#F5F5F5] font-bold text-right font-mono">{getRatingValue(applicant.evaluation?.leadership)}</div>
                      
                      <div className="text-[#8A938D] font-semibold">Teamwork</div>
                      <div className="text-[#F5F5F5] font-bold text-right font-mono">{getRatingValue(applicant.evaluation?.teamwork)}</div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Interview Notes */}
          <div className="bg-[#101412] rounded-lg border border-[#1D2A22] p-5">
            <h4 className="text-[10px] font-black text-[#00FF66] uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">rate_review</span>
              Interview Notes
            </h4>
            {isWaiting ? (
              <div className="text-center py-4 text-xs text-[#8A938D] font-bold uppercase tracking-wider bg-[#0B0D0C]/40 border border-dashed border-[#1D2A22] rounded-lg">
                INTERVIEW NOT YET CONDUCTED
              </div>
            ) : applicant.interviewNotes?.trim() ? (
              <p className="text-xs text-[#8A938D] whitespace-pre-wrap leading-relaxed italic bg-[#0B0D0C] p-3 rounded-lg border border-[#1D2A22]/30">
                &ldquo;{applicant.interviewNotes}&rdquo;
              </p>
            ) : (
              <p className="text-xs text-[#8A938D]/60 italic bg-[#0B0D0C]/50 p-3 rounded-lg border border-dashed border-[#1D2A22]/50">
                No interview notes were added.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Applicant Information & Application Responses */}
        <div className="space-y-6">
          {/* Profile Details */}
          <div className="bg-[#101412] rounded-lg border border-[#1D2A22] p-5">
            <h4 className="text-[10px] font-black text-[#00FF66] uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">badge</span>
              Applicant Information
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <span className="text-[10px] text-[#8A938D] uppercase font-bold block">Email</span>
                <span className="text-xs text-[#F5F5F5] font-semibold mt-0.5 block truncate" title={applicant.email}>
                  {applicant.email || "—"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#8A938D] uppercase font-bold block">Phone</span>
                <span className="text-xs text-[#F5F5F5] font-semibold mt-0.5 block">
                  {applicant.phone || "—"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#8A938D] uppercase font-bold block">Department</span>
                <span className="text-xs text-[#F5F5F5] font-semibold mt-0.5 block">
                  {applicant.department || "—"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#8A938D] uppercase font-bold block">Branch</span>
                <span className="text-xs text-[#F5F5F5] font-semibold mt-0.5 block">
                  {applicant.branch || "—"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#8A938D] uppercase font-bold block">Year</span>
                <span className="text-xs text-[#F5F5F5] font-semibold mt-0.5 block">
                  {applicant.year || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Form Responses */}
          <div className="bg-[#101412] rounded-lg border border-[#1D2A22] p-5">
            <h4 className="text-[10px] font-black text-[#00FF66] uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">assignment</span>
              Form Responses
            </h4>
            {validResponses.length > 0 ? (
              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 divide-y divide-[#1D2A22]/50">
                {validResponses.map(([question, answer], index) => (
                  <div key={index} className={`pt-2 ${index === 0 ? "pt-0" : ""}`}>
                    <div className="text-[10px] font-bold text-[#8A938D]">{question}</div>
                    <div className="text-xs text-[#F5F5F5] mt-1 whitespace-pre-wrap leading-relaxed">{answer}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-[#8A938D] font-bold uppercase tracking-wider bg-[#0B0D0C]/40 border border-dashed border-[#1D2A22] rounded-lg">
                No Responses Data
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
