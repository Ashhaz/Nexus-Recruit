"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/ui/LogoutButton";
import CustomCursor from "@/components/ui/CustomCursor";

// Define shape based on MongoDB schema
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
  responses: Record<string, string>;
}

export default function AdminApplicantsPage() {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ApplicantData[]>([]);
  const [selectedApplicant, setSelectedApplicant] = useState<ApplicantData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    
    if (val.length < 2) {
      setSuggestions([]);
      setIsDropdownOpen(false);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/applicants/search?q=${encodeURIComponent(val)}`);
        const data = await res.json();
        setSuggestions(data.applicants || []);
        setIsDropdownOpen(true);
      } catch (err) {
        console.error("Search failed:", err);
      }
    }, 300);
  };

  const handleSelect = (applicant: ApplicantData) => {
    setIsDropdownOpen(false);
    setSelectedApplicant(null);
    setIsLoading(true);
    setQuery(applicant.name);
    
    // Slight artificial delay for smooth transition feel
    setTimeout(() => {
      setIsLoading(false);
      setSelectedApplicant(applicant);
    }, 400);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#050505] text-[#F5F5F5] font-body-md selection:bg-[#00FF66]/30 selection:text-[#00FF66]">
      <CustomCursor />

      {/* SideNavBar - Admin */}
      <aside className="w-64 fixed left-0 top-0 z-40 bg-[#0B0D0C] border-r border-[#1D2A22] shadow-2xl flex flex-col h-full py-6 hidden md:flex">
        <div className="px-6 mb-8">
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
        <nav className="flex-1 space-y-1.5 px-4 overflow-y-auto">
          <Link href="/admin/dashboard" className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 ${pathname === '/admin/dashboard' ? 'bg-[#00FF66]/10 text-[#00FF66] border-r-2 border-[#00FF66] shadow-[inset_0_0_12px_rgba(0,255,102,0.05)]' : 'text-[#8A938D] hover:text-[#F5F5F5] hover:bg-[#101412] hover:translate-x-1'}`}>
            <span className="material-symbols-outlined text-lg">dashboard</span>
            <span className="text-xs font-bold uppercase tracking-wider">Dashboard</span>
          </Link>
          <Link href="/admin/applicants" className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 ${pathname === '/admin/applicants' ? 'bg-[#00FF66]/10 text-[#00FF66] border-r-2 border-[#00FF66] shadow-[inset_0_0_12px_rgba(0,255,102,0.05)]' : 'text-[#8A938D] hover:text-[#F5F5F5] hover:bg-[#101412] hover:translate-x-1'}`}>
            <span className="material-symbols-outlined text-lg">group</span>
            <span className="text-xs font-bold uppercase tracking-wider">Applicants</span>
          </Link>
          <Link href="/admin/rooms" className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 ${pathname === '/admin/rooms' ? 'bg-[#00FF66]/10 text-[#00FF66] border-r-2 border-[#00FF66] shadow-[inset_0_0_12px_rgba(0,255,102,0.05)]' : 'text-[#8A938D] hover:text-[#F5F5F5] hover:bg-[#101412] hover:translate-x-1'}`}>
            <span className="material-symbols-outlined text-lg">terminal</span>
            <span className="text-xs font-bold uppercase tracking-wider">Rooms</span>
          </Link>
          <Link href="/admin/results" className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 ${pathname === '/admin/results' ? 'bg-[#00FF66]/10 text-[#00FF66] border-r-2 border-[#00FF66] shadow-[inset_0_0_12px_rgba(0,255,102,0.05)]' : 'text-[#8A938D] hover:text-[#F5F5F5] hover:bg-[#101412] hover:translate-x-1'}`}>
            <span className="material-symbols-outlined text-lg">assignment_turned_in</span>
            <span className="text-xs font-bold uppercase tracking-wider">Results</span>
          </Link>
          <Link href="/admin/analytics" className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 ${pathname === '/admin/analytics' ? 'bg-[#00FF66]/10 text-[#00FF66] border-r-2 border-[#00FF66] shadow-[inset_0_0_12px_rgba(0,255,102,0.05)]' : 'text-[#8A938D] hover:text-[#F5F5F5] hover:bg-[#101412] hover:translate-x-1'}`}>
            <span className="material-symbols-outlined text-lg">analytics</span>
            <span className="text-xs font-bold uppercase tracking-wider">Analytics</span>
          </Link>
          <Link href="/admin/settings" className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 ${pathname === '/admin/settings' ? 'bg-[#00FF66]/10 text-[#00FF66] border-r-2 border-[#00FF66] shadow-[inset_0_0_12px_rgba(0,255,102,0.05)]' : 'text-[#8A938D] hover:text-[#F5F5F5] hover:bg-[#101412] hover:translate-x-1'}`}>
            <span className="material-symbols-outlined text-lg">settings</span>
            <span className="text-xs font-bold uppercase tracking-wider">Settings</span>
          </Link>
        </nav>
        <div className="px-4 mt-auto">
          <div className="space-y-1">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="md:ml-64 flex-1 min-h-screen flex flex-col relative">
        
        {/* TopNavBar - Admin */}
        <header className="w-full sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-[#1D2A22] shadow-sm">
          <div className="flex items-center justify-between px-8 h-16 w-full max-w-container-max mx-auto">
            <div className="flex items-center gap-xl">
              <span className="text-xl font-black text-[#00FF66] drop-shadow-[0_0_8px_rgba(0,255,102,0.4)] md:hidden">NEXUS</span>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 text-[#8A938D] hover:text-[#00FF66] hover:bg-[#00FF66]/10 rounded-full transition-all">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <div className="h-6 w-[1px] bg-[#1D2A22] mx-1"></div>
              <div className="flex items-center gap-3 cursor-pointer group">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-[#F5F5F5]">System Admin</p>
                  <p className="text-[10px] text-[#8A938D]">Active</p>
                </div>
                <div className="w-9 h-9 rounded-full border border-[#1D2A22] group-hover:border-[#00FF66] transition-colors bg-[#0B0D0C] flex items-center justify-center text-[#00FF66]">
                  <span className="material-symbols-outlined text-[18px]">shield_person</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-8 max-w-[1440px] mx-auto w-full space-y-8 overflow-x-hidden pt-8">
          
          {/* Page Header */}
          <div>
            <h2 className="text-2xl font-black tracking-wide text-[#F5F5F5] uppercase">
              Applicant Database
            </h2>
            <p className="text-xs text-[#8A938D] mt-1 font-semibold uppercase tracking-wider">
              Search and review registered candidates.
            </p>
          </div>

          {/* Search Panel */}
          <div className="bg-[#101412] rounded-xl border border-[#1D2A22] p-6 shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-[#00FF66] text-lg">person_search</span>
              <h3 className="text-[10px] font-black text-[#F5F5F5] uppercase tracking-widest">Search Candidates</h3>
            </div>
            <p className="text-[11px] text-[#8A938D] mb-4">Search by candidate name or roll number.</p>
            
            <div className="relative max-w-2xl" ref={searchContainerRef}>
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none z-10">
                <span className={`material-symbols-outlined text-lg transition-colors duration-200 ${query.length >= 2 ? 'text-[#00FF66]' : 'text-[#8A938D]/50'}`}>search</span>
              </div>
              <input 
                className="w-full h-12 pl-12 pr-4 bg-[#0B0D0C] border border-[#1D2A22] rounded-lg text-sm text-[#F5F5F5] placeholder-[#8A938D]/40 focus:outline-none focus:border-[#00FF66]/50 focus:shadow-[0_0_12px_rgba(0,255,102,0.1)] transition-all duration-300" 
                placeholder="Search by name or roll number..." 
                type="text"
                value={query}
                onChange={handleSearchChange}
                onFocus={() => { if(query.length >= 2 && suggestions.length > 0) setIsDropdownOpen(true); }}
              />
              
              {/* Search Results Dropdown */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#101412] rounded-xl border border-[#1D2A22] shadow-2xl z-20 overflow-hidden divide-y divide-[#1D2A22]">
                  {suggestions.length > 0 ? (
                    suggestions.map(a => (
                      <div 
                        key={a._id || a.rollNumber} 
                        className="p-4 hover:bg-[#00FF66]/5 cursor-pointer transition-all duration-200 flex items-center justify-between group/row" 
                        onClick={() => handleSelect(a)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#0B0D0C] border border-[#1D2A22] group-hover/row:border-[#00FF66]/30 flex items-center justify-center transition-colors">
                            <span className="material-symbols-outlined text-[#00FF66] text-base">person</span>
                          </div>
                          <div>
                            <div className="text-sm font-bold text-[#F5F5F5]">{a.name}</div>
                            <div className="text-[11px] text-[#8A938D] font-mono">{a.rollNumber} <span className="text-[#8A938D]/40">•</span> {a.department || "Unknown Dept"}</div>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-sm text-[#8A938D] group-hover/row:text-[#00FF66] transition-colors">chevron_right</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center">
                      <span className="material-symbols-outlined text-3xl text-[#8A938D]/30 mb-2 block">search_off</span>
                      <p className="text-xs font-bold text-[#F5F5F5]/80 uppercase tracking-wider">No Applicants Found</p>
                      <p className="text-[11px] text-[#8A938D] mt-1">No candidate matched &ldquo;{query}&rdquo;</p>
                      <div className="mt-3 text-[10px] text-[#8A938D]/60">
                        <p>Try searching with:</p>
                        <p className="mt-0.5">• a different name</p>
                        <p>• roll number</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-10 h-10 border-2 border-[#1D2A22] border-t-[#00FF66] rounded-full animate-spin"></div>
              <p className="text-[10px] font-bold text-[#8A938D] uppercase tracking-widest">Fetching applicant record...</p>
            </div>
          )}

          {/* Default Empty State — Data hidden until search */}
          {!isLoading && !selectedApplicant && (
            <div className="w-full flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-[#0B0D0C] border border-[#1D2A22] flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl text-[#8A938D]/40">database</span>
              </div>
              <p className="text-sm font-black text-[#F5F5F5]/80 uppercase tracking-wider">Search to View</p>
              <p className="text-[11px] text-[#8A938D] mt-2 w-full max-w-[28rem] leading-relaxed">
                Applicant records are hidden by default.
                Search by name or roll number to retrieve a candidate.
              </p>
            </div>
          )}

          {/* Applicant Detail View */}
          {!isLoading && selectedApplicant && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Back / Clear button */}
              <button 
                onClick={() => { setSelectedApplicant(null); setQuery(""); }}
                className="flex items-center gap-2 text-[10px] font-bold text-[#8A938D] hover:text-[#00FF66] uppercase tracking-wider transition-colors group/back"
              >
                <span className="material-symbols-outlined text-sm group-hover/back:-translate-x-0.5 transition-transform">arrow_back</span>
                Clear Selection
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Candidate Summary */}
                <div className="lg:col-span-1 space-y-6">
                  
                  {/* Candidate Card */}
                  <div className="bg-[#101412] rounded-xl border border-[#1D2A22] p-6 relative overflow-hidden">
                    {/* Decorative background icon */}
                    <div className="absolute top-0 right-0 p-3 opacity-5">
                      <span className="material-symbols-outlined text-7xl text-[#00FF66]">person</span>
                    </div>
                    
                    <div className="relative z-10">
                      {/* Avatar */}
                      <div className="flex justify-center mb-4">
                        <div className="w-20 h-20 rounded-xl border border-[#1D2A22] bg-[#0B0D0C] flex items-center justify-center">
                          <span className="material-symbols-outlined text-4xl text-[#00FF66]/50">person</span>
                        </div>
                      </div>
                      
                      {/* Name and ID */}
                      <div className="text-center mb-5">
                        <h3 className="text-lg font-black text-[#F5F5F5] tracking-wide">{selectedApplicant.name}</h3>
                        <p className="text-xs font-mono text-[#00FF66] mt-1">{selectedApplicant.rollNumber}</p>
                      </div>

                      {/* Section: Candidate */}
                      <div className="border-t border-[#1D2A22] pt-4 space-y-0.5">
                        <p className="text-[9px] font-black text-[#00FF66] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-xs">badge</span>
                          Candidate
                        </p>
                        <DetailRow label="Name" value={selectedApplicant.name} />
                      </div>

                      {/* Section: Academic */}
                      <div className="border-t border-[#1D2A22] pt-4 mt-4 space-y-0.5">
                        <p className="text-[9px] font-black text-[#00FF66] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-xs">school</span>
                          Academic
                        </p>
                        <DetailRow label="Roll Number" value={selectedApplicant.rollNumber} />
                        <DetailRow label="Department" value={selectedApplicant.department} />
                        <DetailRow label="Branch" value={selectedApplicant.branch} />
                        <DetailRow label="Year" value={selectedApplicant.year} />
                        <DetailRow label="Team Applied" value={selectedApplicant.teamApplied} />
                      </div>

                      {/* Section: Contact */}
                      <div className="border-t border-[#1D2A22] pt-4 mt-4 space-y-0.5">
                        <p className="text-[9px] font-black text-[#00FF66] uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-xs">contact_mail</span>
                          Contact
                        </p>
                        <DetailRow label="Email" value={selectedApplicant.email} />
                        <DetailRow label="Phone" value={selectedApplicant.phone} />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Right Column: Application Responses */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-[#101412] rounded-xl border border-[#1D2A22] p-6">
                    <div className="flex items-center gap-2 mb-5 border-b border-[#1D2A22] pb-3">
                      <span className="material-symbols-outlined text-[#00FF66] text-base">assignment</span>
                      <h3 className="text-[10px] font-black text-[#F5F5F5] uppercase tracking-widest">Application Responses</h3>
                    </div>
                    
                    {selectedApplicant.responses && Object.entries(selectedApplicant.responses).length > 0 ? (
                      <div className="border border-[#1D2A22] rounded-lg overflow-hidden">
                        {/* Table Header */}
                        <div className="grid grid-cols-1 md:grid-cols-2 bg-[#0B0D0C] p-3 border-b border-[#1D2A22] gap-4">
                          <span className="text-[9px] font-black text-[#8A938D] uppercase tracking-widest">Question</span>
                          <span className="text-[9px] font-black text-[#8A938D] uppercase tracking-widest hidden md:block">Response</span>
                        </div>
                        {/* Table Rows */}
                        <div className="divide-y divide-[#1D2A22]">
                          {Object.entries(selectedApplicant.responses).map(([question, answer], index) => {
                            // Exclude metadata keys we already display if they were stuffed into responses
                            if (['Timestamp', 'Email Address', 'NAME :'].includes(question)) return null;

                            return (
                              <div 
                                key={index} 
                                className="grid grid-cols-1 md:grid-cols-2 p-3 hover:bg-[#00FF66]/[0.02] transition-colors gap-4"
                              >
                                <span className="text-xs font-semibold text-[#F5F5F5]">{question.replace(/_/g, " ")}</span>
                                <span className="text-xs whitespace-pre-wrap text-[#8A938D]">{answer || "—"}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 flex flex-col items-center justify-center text-center gap-2 border border-dashed border-[#1D2A22] rounded-lg bg-[#0B0D0C]/40">
                        <span className="material-symbols-outlined text-2xl text-[#8A938D]/40">description</span>
                        <p className="text-xs font-bold text-[#8A938D] uppercase tracking-wider">No response data available</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

// ── Helper sub-component ────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-[11px] text-[#8A938D] font-semibold">{label}</span>
      <span className="text-xs text-[#F5F5F5] font-medium text-right truncate max-w-[55%]" title={value || "N/A"}>
        {value || "N/A"}
      </span>
    </div>
  );
}
