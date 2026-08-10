"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/ui/LogoutButton";

// Mock Data
const MOCK_APPLICANTS = [
  { id: "21BCE0452", name: "Alex Chen", dept: "Computer Science", year: "3rd Year", teamApplied: "Technical Team", cgpa: "9.42", skills: ["React", "Node.js", "AWS", "Go"], responses: { "Why do you want to join the core team?": "I am deeply passionate about building scalable systems...", "Describe a challenging technical project you've led.": "I recently led a team of 4 to develop an automated inventory management system...", "Availability": "Immediate (15+ hrs/week)", "Preferred Domain": "Backend Development", "Experience Level": "Intermediate (2+ years)" } },
  { id: "21BME1002", name: "Sarah Miller", dept: "Mechanical Eng", year: "2nd Year", teamApplied: "Design Team", cgpa: "8.95", skills: ["AutoCAD", "SolidWorks", "Python"], responses: { "Why do you want to join the core team?": "I want to bring hardware and design expertise...", "Describe a challenging technical project you've led.": "Built a custom 3D printer from scratch...", "Availability": "Weekends mostly", "Preferred Domain": "Design", "Experience Level": "Beginner (1 year)" } },
  { id: "21BEC0231", name: "Rohan Gupta", dept: "Electronics", year: "3rd Year", teamApplied: "Technical Team", cgpa: "9.10", skills: ["Embedded C", "Arduino", "Rust"], responses: { "Why do you want to join the core team?": "Embedded systems are the future...", "Describe a challenging technical project you've led.": "Designed an automated drone swarm...", "Availability": "Flexible", "Preferred Domain": "Hardware / Low-level", "Experience Level": "Advanced (3+ years)" } },
  { id: "21BDS0054", name: "Priya Sharma", dept: "Data Science", year: "1st Year", teamApplied: "Management Team", cgpa: "9.78", skills: ["TensorFlow", "PyTorch", "Tableau", "SQL"], responses: { "Why do you want to join the core team?": "I excel at managing data and people...", "Describe a challenging technical project you've led.": "Analyzed a dataset of 1M+ rows for a hackathon...", "Availability": "Immediate", "Preferred Domain": "Data / Management", "Experience Level": "Intermediate" } }
];

export default function InterviewerSearchPage() {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<typeof MOCK_APPLICANTS>([]);
  const [selectedApplicant, setSelectedApplicant] = useState<typeof MOCK_APPLICANTS[0] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const searchContainerRef = useRef<HTMLDivElement>(null);

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

    const lowerQuery = val.toLowerCase();
    const filtered = MOCK_APPLICANTS.filter(a => 
      a.name.toLowerCase().includes(lowerQuery) || a.id.toLowerCase().includes(lowerQuery)
    );
    
    setSuggestions(filtered);
    setIsDropdownOpen(true);
  };

  const handleSelect = (applicant: typeof MOCK_APPLICANTS[0]) => {
    setIsDropdownOpen(false);
    setSelectedApplicant(null);
    setIsLoading(true);
    setQuery(applicant.name);
    
    // Simulate network delay
    setTimeout(() => {
      setIsLoading(false);
      setSelectedApplicant(applicant);
    }, 800);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-on-background font-body-md selection:bg-primary/30">
      
      {/* Sidebar (Hidden on Mobile) */}
      <aside className="hidden md:flex h-screen w-64 fixed left-0 top-0 z-40 bg-surface-container dark:bg-surface-container backdrop-blur-md border-r border-outline-variant/20 shadow-2xl flex-col py-lg">
        <div className="px-md mb-xl mt-4">
          <div className="flex items-center gap-sm">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined text-[20px]">terminal</span>
            </div>
            <div>
              <h1 className="font-headline-sm text-headline-sm font-black text-primary">NEXUS</h1>
              <p className="text-[10px] font-label-sm tracking-widest text-on-surface-variant uppercase">Interviewer Portal</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col flex-grow px-sm">
          <Link href="/interviewer/search" className={`flex items-center gap-md px-md py-sm transition-all duration-300 hover:translate-x-1 ${pathname === '/interviewer/search' ? 'bg-primary/10 text-primary border-r-2 border-primary shadow-[inset_0_0_12px_rgba(180,197,255,0.2)] hover:glow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/30 hover:glow-sm'}`}>
            <span className="material-symbols-outlined">group</span>
            <span className="font-label-md text-label-md">Applicants Search</span>
          </Link>
          <Link href="/interviewer/rooms" className={`flex items-center gap-md px-md py-sm transition-all duration-300 hover:translate-x-1 ${pathname === '/interviewer/rooms' ? 'bg-primary/10 text-primary border-r-2 border-primary shadow-[inset_0_0_12px_rgba(180,197,255,0.2)] hover:glow-sm' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant/30 hover:glow-sm'}`}>
            <span className="material-symbols-outlined">terminal</span>
            <span className="font-label-md text-label-md">My Interviews</span>
          </Link>
        </div>
        
        <div className="mt-auto px-sm border-t border-outline-variant/10 pt-md">
          <LogoutButton className="flex items-center gap-md px-md py-sm text-on-surface-variant hover:text-error hover:bg-error/10 hover:glow-sm transition-all duration-300 w-full" />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="md:ml-64 flex-1 min-h-screen flex flex-col relative">
        
        {/* TopNavBar */}
        <header className="w-full sticky top-0 z-50 bg-surface/80 dark:bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30 shadow-sm h-16">
          <div className="flex items-center justify-between px-gutter h-full w-full max-w-container-max mx-auto">
            <div className="flex items-center gap-xl">
              <span className="font-headline-md text-headline-md font-bold tracking-tighter text-primary dark:text-primary drop-shadow-[0_0_8px_rgba(180,197,255,0.5)] md:hidden">NEXUS</span>
              <nav className="hidden md:flex items-center gap-lg">
                <a className="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors" href="#">Docs</a>
                <a className="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors" href="#">Help</a>
              </nav>
            </div>
            <div className="flex items-center gap-md">
              <button className="p-sm rounded-full hover:bg-surface-variant/50 transition-all duration-200 active:scale-95">
                <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
              </button>
              <button className="p-sm rounded-full hover:bg-surface-variant/50 transition-all duration-200 active:scale-95">
                <span className="material-symbols-outlined text-on-surface-variant">settings</span>
              </button>
              <div className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant/30 ml-sm bg-primary/20 flex items-center justify-center text-primary">
                 <span className="material-symbols-outlined text-sm">person</span>
              </div>
            </div>
          </div>
        </header>

        <div className="p-gutter pt-8 flex-1">
          <div className="max-w-4xl mx-auto space-y-xl">
            
            {/* Hero Search Section */}
            <section className="text-center space-y-md">
              <h1 className="font-headline-xl text-headline-xl text-primary glow-cyan">Applicant Retrieval</h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant">Enter a candidate's name or roll number to access their dossier.</p>
              
              <div className="relative max-w-2xl mx-auto mt-lg group" ref={searchContainerRef}>
                <div className="absolute inset-y-0 left-md flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-outline">search</span>
                </div>
                <input 
                  className="w-full h-16 pl-14 pr-md bg-surface-container-low border border-outline-variant/30 rounded-xl font-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 neon-border-focus transition-all duration-300" 
                  placeholder="Search by Name or Roll Number (e.g. 21BCE0452)..." 
                  type="text"
                  value={query}
                  onChange={handleSearchChange}
                  onFocus={() => { if(query.length >= 2) setIsDropdownOpen(true); }}
                />
                
                {/* Search Results Dropdown */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-sm glass-card rounded-xl border border-outline-variant/40 shadow-2xl z-20 overflow-hidden divide-y divide-outline-variant/20">
                    {suggestions.length > 0 ? (
                      suggestions.map(a => (
                        <div key={a.id} className="p-md hover:bg-primary/10 cursor-pointer transition-colors flex items-center justify-between" onClick={() => handleSelect(a)}>
                          <div className="flex items-center gap-md">
                            <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center border border-outline-variant/30">
                              <span className="material-symbols-outlined text-primary">person</span>
                            </div>
                            <div className="text-left">
                              <div className="font-body-md font-semibold text-on-surface">{a.name}</div>
                              <div className="font-label-sm text-on-surface-variant">{a.id} • {a.dept}</div>
                            </div>
                          </div>
                          <span className="material-symbols-outlined text-outline">chevron_right</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-lg text-center text-on-surface-variant">No records found matching "{query}"</div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-xl space-y-md animate-in fade-in duration-300">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <p className="font-label-md text-label-md text-secondary uppercase tracking-widest">Fetching Encrypted Dossier...</p>
              </div>
            )}

            {/* Empty State / Placeholder */}
            {!isLoading && !selectedApplicant && (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-40 animate-in fade-in duration-300">
                <span className="material-symbols-outlined text-[64px] mb-md text-outline">search_off</span>
                <p className="font-headline-md text-headline-md">No candidate selected</p>
                <p className="font-body-md text-body-md">Search for a name or roll number above to view a profile.</p>
              </div>
            )}

            {/* Profile View */}
            {!isLoading && selectedApplicant && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
                  
                  {/* Sidebar: Summary Info */}
                  <div className="lg:col-span-1 space-y-lg">
                    <div className="glass-card rounded-xl p-lg space-y-md relative overflow-hidden scanning">
                      <div className="flex justify-center">
                        <div className="w-32 h-32 rounded-xl border-2 border-primary/30 p-1 bg-surface-container">
                          <div className="w-full h-full rounded-lg bg-surface-variant flex items-center justify-center text-primary/50">
                            <span className="material-symbols-outlined text-6xl">person</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-center">
                        <h2 className="font-headline-md text-headline-md text-on-surface">{selectedApplicant.name}</h2>
                        <p className="font-label-sm text-label-sm text-secondary">ID: {selectedApplicant.id}</p>
                      </div>
                      <div className="pt-md border-t border-outline-variant/20 space-y-2">
                        <div className="flex justify-between items-center py-xs">
                          <span className="text-on-surface-variant font-label-sm">Department</span>
                          <span className="text-on-surface font-body-sm text-right">{selectedApplicant.dept}</span>
                        </div>
                        <div className="flex justify-between items-center py-xs">
                          <span className="text-on-surface-variant font-label-sm">Year</span>
                          <span className="text-on-surface font-body-sm text-right">{selectedApplicant.year}</span>
                        </div>
                        <div className="flex justify-between items-center py-xs">
                          <span className="text-on-surface-variant font-label-sm">Team Applied</span>
                          <span className="text-on-surface font-body-sm text-right">{selectedApplicant.teamApplied}</span>
                        </div>
                        <div className="flex justify-between items-center py-xs">
                          <span className="text-on-surface-variant font-label-sm">CGPA</span>
                          <span className="text-secondary font-label-md">{selectedApplicant.cgpa}</span>
                        </div>
                      </div>
                      <div className="space-y-sm">
                        <span className="text-on-surface-variant font-label-sm uppercase block">Technical Stack</span>
                        <div className="flex flex-wrap gap-xs">
                          {selectedApplicant.skills.map(skill => (
                            <span key={skill} className="px-sm py-xs bg-tertiary/10 text-tertiary font-label-sm rounded-md border border-tertiary/20">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="glass-card rounded-xl p-lg">
                      <h3 className="font-headline-sm text-headline-sm text-primary mb-md">Action center</h3>
                      <div className="grid grid-cols-1 gap-sm">
                        <button className="w-full flex items-center justify-center gap-sm bg-primary text-on-primary font-label-md py-md rounded-lg active:scale-95 transition-transform hover:bg-primary/90">
                          <span className="material-symbols-outlined">video_call</span>
                          START INTERVIEW
                        </button>
                        <button className="w-full flex items-center justify-center gap-sm border border-outline-variant text-on-surface font-label-md py-md rounded-lg hover:bg-surface-variant/30 active:scale-95 transition-all">
                          <span className="material-symbols-outlined">description</span>
                          DOWNLOAD CV
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Main View: Form Responses */}
                  <div className="lg:col-span-2 space-y-lg">
                    <div className="glass-card rounded-xl p-lg">
                      <div className="flex items-center gap-sm mb-lg">
                        <span className="material-symbols-outlined text-secondary">assignment</span>
                        <h3 className="font-headline-md text-headline-md">Application Responses</h3>
                      </div>
                      
                      <div className="space-y-xl">
                        {Object.entries(selectedApplicant.responses).map(([question, answer], index) => {
                          // For longer text responses
                          if (['Why do you want to join the core team?', "Describe a challenging technical project you've led."].includes(question)) {
                            return (
                              <div key={index} className="space-y-sm">
                                <label className="font-label-sm text-secondary uppercase tracking-wider">{question}</label>
                                <p className="p-md bg-surface-container-highest rounded-lg border-l-2 border-primary text-on-surface leading-relaxed font-body-md">
                                  {answer}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        })}

                        {/* Additional Data Table Style */}
                        <div className="border border-outline-variant/20 rounded-xl overflow-hidden bg-surface-container-low mt-lg">
                          <div className="grid grid-cols-2 bg-surface-variant/40 p-md border-b border-outline-variant/20">
                            <span className="font-label-sm text-on-surface-variant">Question</span>
                            <span className="font-label-sm text-on-surface-variant">Response</span>
                          </div>
                          <div className="divide-y divide-outline-variant/20">
                            {Object.entries(selectedApplicant.responses).map(([question, answer], index) => {
                              // For shorter data points
                              if (!['Why do you want to join the core team?', "Describe a challenging technical project you've led."].includes(question)) {
                                return (
                                  <div key={index} className="grid grid-cols-2 p-md hover:bg-surface-variant/20">
                                    <span className="text-body-sm font-medium">{question}</span>
                                    <span className="text-body-sm">{answer}</span>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>
        </div>
      </main>
      
      {/* Global CSS for custom animations that can't be easily tailwinded inline */}
      <style dangerouslySetInnerHTML={{__html: `
        .glass-card {
            background: rgba(17, 24, 39, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(180, 197, 255, 0.1);
        }
        .neon-border-focus:focus-within {
            border-color: #b4c5ff;
            box-shadow: 0 0 15px rgba(180, 197, 255, 0.3);
        }
        .glow-cyan {
            text-shadow: 0 0 8px rgba(76, 215, 246, 0.5);
        }
        @keyframes scan {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(100%); }
        }
        .scanning::after {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 20px;
            background: linear-gradient(to bottom, transparent, #4cd7f6, transparent);
            opacity: 0.2;
            animation: scan 3s linear infinite;
        }
      `}} />
    </div>
  );
}
