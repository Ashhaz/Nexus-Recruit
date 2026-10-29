"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/ui/LogoutButton";
import CustomCursor from "@/components/ui/CustomCursor";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SettingsData {
  mongodbConnected: boolean;
  googleSheetsConnected: boolean;
  lastSync: string | null;
  totalApplicants: number;
  environment: string;
  version: string;
  nodeVersion: string;
}

interface Toast {
  message: string;
  type: "success" | "error";
}

interface RoomSettingData {
  _id: string;
  roomNumber: number;
  name?: string;
  assignedInterviewer?: string;
  interviewer?: string;
  status: string;
  isActive: boolean;
  applicant: { name: string; rollNumber: string } | null;
}

interface InterviewerData {
  id: string;
  name: string;
  role: string;
  isDefault?: boolean;
  assignedToRoom?: number | null;
  assignedRoomName?: string | null;
  createdAt?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const pathname = usePathname();

  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [toast, setToast] = useState<Toast | null>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // ── Load settings ──────────────────────────────────────────────────────────

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (json.success && json.data) {
        setSettings(json.data);
      }
    } catch {
      // silently fail — error states handled per-card
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  // ── Interviewer Management State ─────────────────────────────────────────
  const [interviewers, setInterviewers] = useState<InterviewerData[]>([]);
  const [interviewersLoading, setInterviewersLoading] = useState(true);
  const [showAddInterviewerModal, setShowAddInterviewerModal] = useState(false);
  const [newInterviewerName, setNewInterviewerName] = useState("");
  const [isCreatingInterviewer, setIsCreatingInterviewer] = useState(false);
  const [deletingInterviewerId, setDeletingInterviewerId] = useState<string | null>(null);

  // ── Room Management State ────────────────────────────────────────────────
  const [rooms, setRooms] = useState<RoomSettingData[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [identities, setIdentities] = useState<{ id: string; name: string }[]>([]);

  // Add room form
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState<string>("");
  const [newRoomName, setNewRoomName] = useState("");
  const [newAssignedInterviewer, setNewAssignedInterviewer] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  // Edit room form
  const [editingRoom, setEditingRoom] = useState<RoomSettingData | null>(null);
  const [editRoomName, setEditRoomName] = useState("");
  const [editAssignedInterviewer, setEditAssignedInterviewer] = useState("");
  const [isUpdatingRoom, setIsUpdatingRoom] = useState(false);
  const [actionRoomNumber, setActionRoomNumber] = useState<number | null>(null);

  // ── Load rooms & identities ───────────────────────────────────────────────
  const loadRooms = useCallback(async () => {
    setRoomsLoading(true);
    try {
      const res = await fetch("/api/rooms");
      const json = await res.json();
      if (json.success && json.rooms) {
        setRooms(json.rooms);
      }
    } catch {
      showToast("Failed to load rooms.", "error");
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  const loadIdentities = useCallback(async () => {
    try {
      const res = await fetch("/api/interviewer/identities");
      const json = await res.json();
      if (json.success && json.identities) {
        setIdentities(json.identities);
      }
    } catch (e) {
      console.error("Failed to load interviewer identities:", e);
    }
  }, []);

  const loadInterviewers = useCallback(async () => {
    setInterviewersLoading(true);
    try {
      const res = await fetch("/api/admin/interviewers");
      const json = await res.json();
      if (json.success && json.interviewers) {
        setInterviewers(json.interviewers);
      }
    } catch {
      // silently fail
    } finally {
      setInterviewersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadRooms();
    loadIdentities();
    loadInterviewers();
  }, [loadSettings, loadRooms, loadIdentities, loadInterviewers]);

  const handleCreateInterviewer = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newInterviewerName.trim();

    if (!name) {
      showToast("Interviewer Full Name is required.", "error");
      return;
    }

    setIsCreatingInterviewer(true);
    try {
      const res = await fetch("/api/admin/interviewers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create interviewer profile.");
      }

      showToast(`Interviewer "${name}" profile added successfully!`, "success");
      setShowAddInterviewerModal(false);
      setNewInterviewerName("");

      // Refresh identities and list
      await loadIdentities();
      await loadInterviewers();

      // Automatically select in open room forms
      if (showAddRoom) {
        setNewAssignedInterviewer(name);
      }
      if (editingRoom) {
        setEditAssignedInterviewer(name);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to create interviewer profile.", "error");
    } finally {
      setIsCreatingInterviewer(false);
    }
  };

  const handleDeleteInterviewer = async (interviewer: InterviewerData) => {
    if (interviewer.isDefault) {
      showToast("Cannot delete default system interviewers.", "error");
      return;
    }

    if (interviewer.assignedToRoom) {
      showToast(
        `Cannot delete "${interviewer.name}" because they are currently assigned to Room ${interviewer.assignedToRoom}. Unassign them first.`,
        "error"
      );
      return;
    }

    if (!confirm(`Are you sure you want to remove interviewer profile "${interviewer.name}"?`)) {
      return;
    }

    setDeletingInterviewerId(interviewer.id);
    try {
      const res = await fetch(`/api/admin/interviewers?id=${interviewer.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete interviewer profile.");
      }

      showToast(json.message || `Interviewer "${interviewer.name}" removed.`, "success");
      await loadIdentities();
      await loadInterviewers();
    } catch (err: any) {
      showToast(err.message || "Failed to delete interviewer.", "error");
    } finally {
      setDeletingInterviewerId(null);
    }
  };

  // Suggest next room number when opening add form
  const handleOpenAddForm = () => {
    const nextNum = rooms.length > 0 ? Math.max(...rooms.map((r) => r.roomNumber)) + 1 : 1;
    setNewRoomNumber(String(nextNum));
    setNewRoomName(`Room ${String(nextNum).padStart(2, "0")}`);
    setNewAssignedInterviewer(identities[0]?.name || "");
    setShowAddRoom(true);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(newRoomNumber);
    if (!num || isNaN(num) || num <= 0) {
      showToast("Please provide a valid positive room number.", "error");
      return;
    }

    if (rooms.some((r) => r.roomNumber === num)) {
      showToast(`Room ${num} already exists. Please choose a different number.`, "error");
      return;
    }

    setIsCreatingRoom(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: num,
          name: newRoomName.trim(),
          assignedInterviewer: newAssignedInterviewer.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create room.");
      }

      showToast(`Room ${num} created successfully!`, "success");
      setShowAddRoom(false);
      setNewRoomNumber("");
      setNewRoomName("");
      setNewAssignedInterviewer("");
      await loadRooms();
    } catch (err: any) {
      showToast(err.message || "Failed to create room.", "error");
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleStartEdit = (room: RoomSettingData) => {
    setEditingRoom(room);
    setEditRoomName(room.name || `Room ${String(room.roomNumber).padStart(2, "0")}`);
    setEditAssignedInterviewer(room.assignedInterviewer || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;

    setIsUpdatingRoom(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: editingRoom.roomNumber,
          name: editRoomName.trim(),
          assignedInterviewer: editAssignedInterviewer.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update room.");
      }

      showToast(`Room ${editingRoom.roomNumber} updated successfully!`, "success");
      setEditingRoom(null);
      await loadRooms();
    } catch (err: any) {
      showToast(err.message || "Failed to update room.", "error");
    } finally {
      setIsUpdatingRoom(false);
    }
  };

  const handleToggleActive = async (room: RoomSettingData) => {
    if (room.isActive && room.status === "Occupied" && room.applicant !== null) {
      showToast(`Cannot deactivate Room ${room.roomNumber} while an interview is in progress.`, "error");
      return;
    }

    setActionRoomNumber(room.roomNumber);
    try {
      const res = await fetch("/api/rooms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: room.roomNumber,
          isActive: !room.isActive,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to toggle room status.");
      }

      showToast(
        `Room ${room.roomNumber} is now ${!room.isActive ? "Activated" : "Deactivated"}.`,
        "success"
      );
      await loadRooms();
    } catch (err: any) {
      showToast(err.message || "Failed to toggle status.", "error");
    } finally {
      setActionRoomNumber(null);
    }
  };

  const handleDeleteRoom = async (room: RoomSettingData) => {
    if (room.status === "Occupied" || room.applicant !== null) {
      showToast(`Cannot delete Room ${room.roomNumber} while an interview session is active.`, "error");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete Room ${room.roomNumber} (${room.name || "Room " + room.roomNumber})? This cannot be undone.`
    );
    if (!confirmed) return;

    setActionRoomNumber(room.roomNumber);
    try {
      const res = await fetch(`/api/rooms?roomNumber=${room.roomNumber}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete room.");
      }

      showToast(`Room ${room.roomNumber} removed successfully.`, "success");
      await loadRooms();
    } catch (err: any) {
      showToast(err.message || "Failed to delete room.", "error");
    } finally {
      setActionRoomNumber(null);
    }
  };

  // ── Sync Applicants ────────────────────────────────────────────────────────

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/applicants/sync", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Sync failed");
      showToast(
        `Sync Complete! Imported: ${json.imported} · Updated: ${json.updated} · Skipped: ${json.skipped}`,
        "success"
      );
      await loadSettings(); // refresh lastSync / totalApplicants
    } catch (e: any) {
      showToast(e.message || "Sync failed", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  // ── Refresh Statistics ─────────────────────────────────────────────────────

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadSettings();
      showToast("Statistics refreshed successfully.", "success");
    } catch {
      showToast("Failed to refresh statistics.", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  // ── Danger Zone ────────────────────────────────────────────────────────────

  const handleClearCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      showToast("Local browser cache cleared.", "success");
    } catch {
      showToast("Nothing to clear.", "error");
    }
  };

  const handleReload = () => {
    window.location.reload();
  };

  // ── Sub-components ─────────────────────────────────────────────────────────

  const StatusBadge = ({ ok }: { ok: boolean }) => (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
        ok ? "bg-[#00FF66]/10 text-[#00FF66] border-[#00FF66]/20" : "bg-[#FF4D4D]/10 text-[#FF4D4D] border-[#FF4D4D]/20"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-[#00FF66] animate-pulse" : "bg-[#FF4D4D]"}`}
      />
      {ok ? "Connected" : "Disconnected"}
    </span>
  );

  const SkeletonLine = ({ w = "w-1/2" }: { w?: string }) => (
    <div className={`h-4 bg-[#0B0D0C] rounded animate-pulse ${w}`} />
  );

  const SectionHeading = ({
    icon,
    title,
    subtitle,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
  }) => (
    <div className="flex items-start gap-3 mb-6">
      <div className="w-9 h-9 rounded-lg bg-[#00FF66]/10 flex items-center justify-center flex-shrink-0 border border-[#00FF66]/20">
        <span className="material-symbols-outlined text-[#00FF66] text-[20px] font-bold">{icon}</span>
      </div>
      <div>
        <h3 className="text-sm font-black uppercase tracking-wider text-[#F5F5F5]">{title}</h3>
        {subtitle && <p className="text-[10px] text-[#8A938D] font-semibold uppercase tracking-wider mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );

  const InfoRow = ({
    label,
    value,
  }: {
    label: string;
    value: React.ReactNode;
  }) => (
    <div className="flex items-center justify-between py-3 border-b border-[#1D2A22]/50 last:border-0">
      <span className="text-xs text-[#8A938D] font-bold uppercase tracking-wider">{label}</span>
      <span className="text-sm text-[#F5F5F5] font-semibold text-right">{value}</span>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#050505] text-[#F5F5F5] font-body-md selection:bg-[#00FF66]/30 selection:text-[#00FF66]">
      <CustomCursor />

      {/* SideNavBar ────────────────────────────────────────────────────────── */}
      <aside className="w-64 fixed left-0 top-0 z-40 bg-[#0B0D0C] border-r border-[#1D2A22] shadow-2xl flex-col h-full py-8 hidden md:flex">
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
          {[
            { href: "/admin/dashboard",  icon: "dashboard",            label: "Dashboard" },
            { href: "/admin/applicants", icon: "group",                label: "Applicants" },
            { href: "/admin/rooms",      icon: "terminal",             label: "Rooms" },
            { href: "/admin/results",    icon: "assignment_turned_in", label: "Results" },
            { href: "/admin/analytics",  icon: "analytics",            label: "Analytics" },
            { href: "/admin/settings",   icon: "settings",             label: "Settings" },
          ].map(({ href, icon, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 ${
                pathname === href
                  ? "bg-[#00FF66]/10 text-[#00FF66] border-r-2 border-[#00FF66] shadow-[inset_0_0_12px_rgba(0,255,102,0.05)]"
                  : "text-[#8A938D] hover:text-[#F5F5F5] hover:bg-[#101412] hover:translate-x-1"
              }`}
            >
              <span className="material-symbols-outlined text-lg">{icon}</span>
              <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="px-4 mt-auto">
          <LogoutButton />
        </div>
      </aside>

      {/* Main ────────────────────────────────────────────────────────────────── */}
      <main className="md:ml-64 flex-1 flex flex-col min-h-screen relative">

        {/* Canvas */}
        <div className="flex-1 p-8 max-w-4xl mx-auto w-full space-y-6 overflow-x-hidden">

          {/* Page header */}
          <div className="mb-2">
            <h2 className="text-3xl font-black text-[#F5F5F5] uppercase tracking-wide drop-shadow-[0_0_8px_rgba(0,255,102,0.3)]">Settings</h2>
            <p className="text-xs text-[#8A938D] font-semibold uppercase tracking-wider mt-1.5">
              System configuration, status and administration.
            </p>
          </div>

          {/* ── 1. Admin Profile ─────────────────────────────────────────────── */}
          <section className="glass-card p-6 rounded-xl">
            <SectionHeading icon="manage_accounts" title="Admin Profile" subtitle="Current operator information" />
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-[#00FF66]/10 border border-[#00FF66]/20 flex items-center justify-center text-[#00FF66] flex-shrink-0">
                  <span className="material-symbols-outlined text-[32px]">shield_person</span>
                </div>
                <div>
                  <p className="text-lg font-black text-[#F5F5F5] uppercase tracking-wide">System Admin</p>
                  <p className="text-xs text-[#8A938D] font-bold mt-0.5 uppercase tracking-wider">Admin Role</p>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/20 uppercase tracking-wider mt-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-pulse" />
                    Active Session
                  </span>
                </div>
              </div>
              <button
                className="px-4 py-2.5 bg-[#0B0D0C] hover:bg-[#101412] hover:text-[#00FF66] border border-[#1D2A22] text-[#8A938D] rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
                title="Edit profile — coming soon"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Edit Profile
              </button>
            </div>
          </section>

          {/* ── 2. System Status ──────────────────────────────────────────────── */}
          <section className="glass-card p-6 rounded-xl">
            <SectionHeading
              icon="health_and_safety"
              title="System Status"
              subtitle="Live connection and environment information"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* MongoDB */}
              <div className="bg-[#0B0D0C]/40 border border-[#1D2A22] rounded-lg p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#8A938D]">database</span>
                    <p className="text-[10px] font-bold text-[#8A938D] uppercase tracking-wider">MongoDB</p>
                  </div>
                  {settingsLoading ? (
                    <SkeletonLine w="w-20" />
                  ) : (
                    <StatusBadge ok={settings?.mongodbConnected ?? false} />
                  )}
                </div>
                <p className="text-sm font-semibold text-[#F5F5F5] mt-1">
                  {settingsLoading ? "—" : settings?.mongodbConnected ? "Atlas cluster connected" : "Not reachable"}
                </p>
              </div>

              {/* Google Sheets */}
              <div className="bg-[#0B0D0C]/40 border border-[#1D2A22] rounded-lg p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#8A938D]">table_chart</span>
                    <p className="text-[10px] font-bold text-[#8A938D] uppercase tracking-wider">Google Sheets</p>
                  </div>
                  {settingsLoading ? (
                    <SkeletonLine w="w-20" />
                  ) : (
                    <StatusBadge ok={settings?.googleSheetsConnected ?? false} />
                  )}
                </div>
                <p className="text-sm font-semibold text-[#F5F5F5] mt-1">
                  {settingsLoading ? "—" : settings?.googleSheetsConnected ? "Credentials configured" : "Missing credentials"}
                </p>
              </div>

              {/* Last Sync */}
              <div className="bg-[#0B0D0C]/40 border border-[#1D2A22] rounded-lg p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#8A938D]">sync</span>
                  <p className="text-[10px] font-bold text-[#8A938D] uppercase tracking-wider">Last Successful Sync</p>
                </div>
                {settingsLoading ? (
                  <SkeletonLine w="w-3/4" />
                ) : (
                  <p className="text-sm font-semibold text-[#F5F5F5] font-mono mt-1">
                    {settings?.lastSync
                      ? new Date(settings.lastSync).toLocaleString()
                      : "No sync recorded"}
                  </p>
                )}
              </div>

              {/* Total Applicants */}
              <div className="bg-[#0B0D0C]/40 border border-[#1D2A22] rounded-lg p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#8A938D]">group</span>
                  <p className="text-[10px] font-bold text-[#8A938D] uppercase tracking-wider">Total Applicants</p>
                </div>
                {settingsLoading ? (
                  <SkeletonLine w="w-16" />
                ) : (
                  <p className="text-2xl font-black text-[#00FF66] font-mono mt-1">
                    {settings?.totalApplicants ?? "—"}
                  </p>
                )}
              </div>

              {/* Environment */}
              <div className="bg-[#0B0D0C]/40 border border-[#1D2A22] rounded-lg p-4 flex flex-col gap-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#8A938D]">developer_mode</span>
                    <p className="text-[10px] font-bold text-[#8A938D] uppercase tracking-wider">Environment</p>
                  </div>
                  {!settingsLoading && settings && (
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                      settings.environment === "Production"
                        ? "bg-[#00FF66]/10 text-[#00FF66] border-[#00FF66]/20"
                        : "bg-[#FFB020]/10 text-[#FFB020] border-[#FFB020]/20"
                    }`}>
                      {settings.environment}
                    </span>
                  )}
                </div>
                {settingsLoading ? (
                  <SkeletonLine w="w-1/3" />
                ) : (
                  <p className="text-sm font-semibold text-[#F5F5F5] mt-1">{settings?.environment ?? "—"}</p>
                )}
              </div>

            </div>
          </section>

          {/* ── 3. Room Management ───────────────────────────────────────────── */}
          <section className="glass-card p-6 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#00FF66]/10 flex items-center justify-center flex-shrink-0 border border-[#00FF66]/20">
                  <span className="material-symbols-outlined text-[#00FF66] text-[20px] font-bold">meeting_room</span>
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-[#F5F5F5]">Room Management</h3>
                  <p className="text-[10px] text-[#8A938D] font-semibold uppercase tracking-wider mt-0.5">
                    Configure interview rooms, assigned interviewers, and live operational states
                  </p>
                </div>
              </div>
              <button
                onClick={handleOpenAddForm}
                disabled={showAddRoom}
                className="px-3.5 py-2 bg-[#00FF66] text-[#050505] hover:bg-[#00E55C] rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(0,255,102,0.25)] disabled:opacity-50 disabled:cursor-not-allowed self-start sm:self-auto font-black"
              >
                <span className="material-symbols-outlined text-[16px] font-bold">add</span>
                Add Room
              </button>
            </div>

            {/* Inline Add Room Form */}
            {showAddRoom && (
              <form onSubmit={handleCreateRoom} className="bg-[#0B0D0C] border border-[#00FF66]/30 rounded-xl p-5 mb-6 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-[#1D2A22] pb-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#00FF66] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                    Create New Interview Room
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAddRoom(false)}
                    className="text-[#8A938D] hover:text-[#F5F5F5] transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-[#8A938D] font-bold uppercase tracking-wider block">
                      Room Number *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={newRoomNumber}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewRoomNumber(val);
                        if (!newRoomName || newRoomName.startsWith("Room ")) {
                          setNewRoomName(`Room ${String(val).padStart(2, "0")}`);
                        }
                      }}
                      placeholder="e.g. 4"
                      className="w-full bg-[#050505] border border-[#1D2A22] rounded-lg px-3 py-2 text-xs text-[#F5F5F5] font-mono focus:outline-none focus:border-[#00FF66] transition-colors font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] text-[#8A938D] font-bold uppercase tracking-wider block">
                      Room Name / Label
                    </label>
                    <input
                      type="text"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="e.g. Room 04"
                      className="w-full bg-[#050505] border border-[#1D2A22] rounded-lg px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#00FF66] transition-colors font-bold uppercase tracking-wider"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] text-[#8A938D] font-bold uppercase tracking-wider block">
                        Assigned Interviewer
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAddInterviewerModal(true)}
                        className="text-[9px] font-bold text-[#00FF66] hover:underline flex items-center gap-0.5 uppercase cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[12px]">add</span>
                        New Interviewer
                      </button>
                    </div>
                    <select
                      value={newAssignedInterviewer}
                      onChange={(e) => setNewAssignedInterviewer(e.target.value)}
                      className="w-full bg-[#050505] border border-[#1D2A22] rounded-lg px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#00FF66] transition-colors font-bold uppercase tracking-wider"
                    >
                      <option value="">-- Unassigned --</option>
                      {identities.map((id) => (
                        <option key={id.id} value={id.name}>{id.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddRoom(false)}
                    disabled={isCreatingRoom}
                    className="px-3.5 py-2 bg-[#101412] hover:bg-[#1A201D] border border-[#1D2A22] text-[#8A938D] rounded-lg text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingRoom}
                    className="px-4 py-2 bg-[#00FF66] text-[#050505] hover:bg-[#00E55C] rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-[0_0_10px_rgba(0,255,102,0.3)] disabled:opacity-50 font-black"
                  >
                    {isCreatingRoom ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-[#050505]/30 border-t-[#050505] rounded-full animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">check</span>
                        Save Room
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Inline Edit Room Form */}
            {editingRoom && (
              <form onSubmit={handleSaveEdit} className="bg-[#0B0D0C] border border-[#00FF66]/40 rounded-xl p-5 mb-6 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-[#1D2A22] pb-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#00FF66] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    Edit Room {editingRoom.roomNumber} Configuration
                  </h4>
                  <button
                    type="button"
                    onClick={() => setEditingRoom(null)}
                    className="text-[#8A938D] hover:text-[#F5F5F5] transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-[#8A938D] font-bold uppercase tracking-wider block">
                      Room Label / Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editRoomName}
                      onChange={(e) => setEditRoomName(e.target.value)}
                      placeholder="e.g. Room 01"
                      className="w-full bg-[#050505] border border-[#1D2A22] rounded-lg px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#00FF66] transition-colors font-bold uppercase tracking-wider"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] text-[#8A938D] font-bold uppercase tracking-wider block">
                        Assigned Interviewer
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAddInterviewerModal(true)}
                        className="text-[9px] font-bold text-[#00FF66] hover:underline flex items-center gap-0.5 uppercase cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[12px]">add</span>
                        New Interviewer
                      </button>
                    </div>
                    <select
                      value={editAssignedInterviewer}
                      onChange={(e) => setEditAssignedInterviewer(e.target.value)}
                      className="w-full bg-[#050505] border border-[#1D2A22] rounded-lg px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#00FF66] transition-colors font-bold uppercase tracking-wider"
                    >
                      <option value="">-- Unassigned --</option>
                      {identities.map((id) => (
                        <option key={id.id} value={id.name}>{id.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingRoom(null)}
                    disabled={isUpdatingRoom}
                    className="px-3.5 py-2 bg-[#101412] hover:bg-[#1A201D] border border-[#1D2A22] text-[#8A938D] rounded-lg text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingRoom}
                    className="px-4 py-2 bg-[#00FF66] text-[#050505] hover:bg-[#00E55C] rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-[0_0_10px_rgba(0,255,102,0.3)] disabled:opacity-50 font-black"
                  >
                    {isUpdatingRoom ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-[#050505]/30 border-t-[#050505] rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">save</span>
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Rooms List */}
            {roomsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-16 bg-[#0B0D0C]/40 border border-[#1D2A22] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : rooms.length === 0 ? (
              <div className="p-8 text-center bg-[#0B0D0C]/30 border border-dashed border-[#1D2A22] rounded-lg">
                <p className="text-xs text-[#8A938D] font-bold uppercase tracking-wider">No interview rooms configured.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rooms.map((room) => {
                  const isDeactivated = room.isActive === false;
                  const hasActiveInterview = room.status === "Occupied" && room.applicant !== null;
                  const isOccupiedWithoutApp = room.status === "Occupied" && !room.applicant;
                  const isProcessing = actionRoomNumber === room.roomNumber;

                  return (
                    <div
                      key={room._id}
                      className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isDeactivated
                          ? "bg-[#0B0D0C]/30 border-[#1D2A22]/50 opacity-60"
                          : hasActiveInterview
                          ? "bg-[#00FF66]/5 border-[#00FF66]/30 shadow-[0_0_10px_rgba(0,255,102,0.05)]"
                          : "bg-[#0B0D0C]/50 border-[#1D2A22] hover:border-[#1D2A22]/80"
                      }`}
                    >
                      {/* Left: Info */}
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono font-black text-sm border ${
                          isDeactivated
                            ? "bg-[#101412] text-[#8A938D] border-[#1D2A22]"
                            : hasActiveInterview
                            ? "bg-[#00FF66]/10 text-[#00FF66] border-[#00FF66]/30"
                            : "bg-[#101412] text-[#F5F5F5] border-[#1D2A22]"
                        }`}>
                          {String(room.roomNumber).padStart(2, "0")}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-[#F5F5F5] uppercase tracking-wide">
                              {room.name || `Room ${String(room.roomNumber).padStart(2, "0")}`}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider flex items-center gap-1 border ${
                                isDeactivated
                                  ? "bg-[#FF4D4D]/10 text-[#FF4D4D] border-[#FF4D4D]/20"
                                  : hasActiveInterview
                                  ? "bg-[#00FF66]/10 text-[#00FF66] border-[#00FF66]/20"
                                  : isOccupiedWithoutApp
                                  ? "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/20"
                                  : "bg-[#8A938D]/10 text-[#8A938D] border-[#8A938D]/20"
                              }`}
                            >
                              <span
                                className={`w-1 h-1 rounded-full ${
                                  isDeactivated
                                    ? "bg-[#FF4D4D]"
                                    : hasActiveInterview
                                    ? "bg-[#00FF66] animate-pulse"
                                    : isOccupiedWithoutApp
                                    ? "bg-[#38BDF8]"
                                    : "bg-[#8A938D]"
                                }`}
                              />
                              {isDeactivated
                                ? "Deactivated"
                                : hasActiveInterview
                                ? "Live Interview"
                                : isOccupiedWithoutApp
                                ? "Registered"
                                : "Available"}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-xs mt-1">
                            <span className="text-[#8A938D] font-medium flex items-center gap-1 text-[11px]">
                              <span className="material-symbols-outlined text-xs">person</span>
                              Assigned:{" "}
                              <strong className="text-[#F5F5F5] font-semibold">
                                {room.assignedInterviewer || "None"}
                              </strong>
                            </span>
                            {hasActiveInterview && (
                              <span className="text-[#00FF66] font-medium text-[11px]">
                                Candidate: {room.applicant?.name} ({room.applicant?.rollNumber})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-end md:self-auto">
                        <button
                          onClick={() => handleStartEdit(room)}
                          disabled={isProcessing}
                          className="px-2.5 py-1.5 bg-[#101412] hover:bg-[#1A201D] hover:text-[#00FF66] border border-[#1D2A22] text-[#8A938D] rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
                          title="Edit Room Name & Interviewer"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                          Edit
                        </button>

                        <button
                          onClick={() => handleToggleActive(room)}
                          disabled={isProcessing || (room.isActive && hasActiveInterview)}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-colors flex items-center gap-1 ${
                            room.isActive
                              ? "bg-[#FFB020]/10 hover:bg-[#FFB020]/20 text-[#FFB020] border-[#FFB020]/30 disabled:opacity-40 disabled:cursor-not-allowed"
                              : "bg-[#00FF66]/10 hover:bg-[#00FF66]/20 text-[#00FF66] border-[#00FF66]/30"
                          }`}
                          title={
                            room.isActive && hasActiveInterview
                              ? "Cannot deactivate during an active interview"
                              : room.isActive
                              ? "Deactivate room"
                              : "Activate room"
                          }
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {room.isActive ? "pause" : "play_arrow"}
                          </span>
                          {room.isActive ? "Deactivate" : "Activate"}
                        </button>

                        <button
                          onClick={() => handleDeleteRoom(room)}
                          disabled={isProcessing || hasActiveInterview || room.status === "Occupied"}
                          className="p-1.5 bg-[#FF4D4D]/10 hover:bg-[#FF4D4D]/20 text-[#FF4D4D] border border-[#FF4D4D]/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={
                            hasActiveInterview || room.status === "Occupied"
                              ? "Cannot delete an active room"
                              : "Delete Room"
                          }
                        >
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── 4. Interviewer Management ───────────────────────────────────── */}
          <section className="glass-card p-6 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#00FF66]/10 flex items-center justify-center flex-shrink-0 border border-[#00FF66]/20">
                  <span className="material-symbols-outlined text-[#00FF66] text-[20px] font-bold">badge</span>
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-[#F5F5F5]">Interviewer Management</h3>
                  <p className="text-[10px] text-[#8A938D] font-semibold uppercase tracking-wider mt-0.5">
                    Authorized interviewers, credentials, and room assignment eligibility
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddInterviewerModal(true)}
                className="px-3.5 py-2 bg-[#00FF66] text-[#050505] hover:bg-[#00E55C] rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(0,255,102,0.25)] self-start sm:self-auto font-black"
              >
                <span className="material-symbols-outlined text-[16px] font-bold">person_add</span>
                Add Interviewer
              </button>
            </div>

            {/* Interviewer Accounts List */}
            {interviewersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-16 bg-[#0B0D0C]/40 border border-[#1D2A22] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : interviewers.length === 0 ? (
              <div className="p-8 text-center bg-[#0B0D0C]/30 border border-dashed border-[#1D2A22] rounded-lg">
                <p className="text-xs text-[#8A938D] font-bold uppercase tracking-wider">No interviewers found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {interviewers.map((interviewer) => {
                  const assignedRoom = rooms.find(
                    (r) => r.assignedInterviewer?.toLowerCase() === interviewer.name.toLowerCase()
                  );

                  return (
                    <div
                      key={interviewer.id}
                      className="p-4 rounded-xl border border-[#1D2A22] bg-[#0B0D0C]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#1D2A22]/80 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#101412] border border-[#1D2A22] flex items-center justify-center text-[#00FF66]">
                          <span className="material-symbols-outlined text-[20px]">person</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-[#F5F5F5] uppercase tracking-wide">
                              {interviewer.name}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${
                                interviewer.isDefault
                                  ? "bg-[#00FF66]/10 text-[#00FF66] border-[#00FF66]/20"
                                  : "bg-[#8A938D]/10 text-[#8A938D] border-[#8A938D]/20"
                              }`}
                            >
                              {interviewer.isDefault ? "Default Interviewer" : "Custom Profile"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs mt-1">
                            {assignedRoom ? (
                              <span className="text-[#00FF66] text-[10px] font-bold uppercase tracking-wider">
                                Assigned to {assignedRoom.name || `Room ${assignedRoom.roomNumber}`}
                              </span>
                            ) : (
                              <span className="text-[#8A938D] text-[10px] font-bold uppercase tracking-wider">
                                Unassigned · Available for room assignment
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {!interviewer.isDefault && !assignedRoom && (
                          <button
                            onClick={() => handleDeleteInterviewer(interviewer)}
                            disabled={deletingInterviewerId === interviewer.id}
                            className="p-1.5 bg-[#FF4D4D]/10 hover:bg-[#FF4D4D]/20 text-[#FF4D4D] border border-[#FF4D4D]/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-40"
                            title={`Remove "${interviewer.name}" profile`}
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </button>
                        )}
                        <span className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-[#00FF66]/5 text-[#8A938D] border border-[#1D2A22]">
                          Active Profile
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── 5. Synchronization ───────────────────────────────────────────── */}
          <section className="glass-card p-6 rounded-xl">
            <SectionHeading
              icon="cloud_sync"
              title="Synchronization"
              subtitle="Manage data synchronization from Google Sheets"
            />
            <div className="flex flex-col sm:flex-row gap-4">

              <div className="flex-1 bg-[#0B0D0C]/40 border border-[#1D2A22] rounded-lg p-4 flex flex-col gap-2">
                <p className="text-[9px] text-[#8A938D] uppercase tracking-wider font-bold">Last Sync</p>
                <p className="text-sm font-semibold text-[#F5F5F5] font-mono mt-1">
                  {settingsLoading
                    ? "—"
                    : settings?.lastSync
                    ? new Date(settings.lastSync).toLocaleString()
                    : "Never"}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:justify-end">
                <button
                  onClick={handleSync}
                  disabled={isSyncing || isRefreshing}
                  className="px-4 py-2.5 bg-[#00FF66] text-[#050505] hover:bg-[#00B84A] rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,255,102,0.35)] disabled:opacity-60 disabled:cursor-not-allowed font-black"
                >
                  {isSyncing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#050505]/30 border-t-[#050505] rounded-full animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px] font-bold">sync</span>
                      Sync Applicants
                    </>
                  )}
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={isSyncing || isRefreshing}
                  className="px-4 py-2.5 bg-[#0B0D0C] hover:bg-[#101412] hover:text-[#00FF66] border border-[#1D2A22] text-[#F5F5F5] rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isRefreshing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#F5F5F5]/30 border-t-[#F5F5F5] rounded-full animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">refresh</span>
                      Refresh Statistics
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* ── 6. System Information ─────────────────────────────────────────── */}
          <section className="glass-card p-6 rounded-xl">
            <SectionHeading
              icon="info"
              title="System Information"
              subtitle="Application build and runtime details"
            />
            <div className="bg-[#0B0D0C]/40 border border-[#1D2A22] rounded-lg px-4">
              <InfoRow label="Application Name" value="NEXUS Recruitment Engine" />
              <InfoRow
                label="Version"
                value={
                  <span className="font-mono text-[#00FF66]">
                    {settingsLoading ? "—" : settings?.version ?? "v1.0.0"}
                  </span>
                }
              />
              <InfoRow label="Framework" value="Next.js (App Router)" />
              <InfoRow label="Database" value="MongoDB Atlas" />
              <InfoRow label="Data Source" value="Google Sheets API" />
              <InfoRow
                label="Node Version"
                value={
                  <span className="font-mono text-[#00FF66]">
                    {settingsLoading ? "—" : settings?.nodeVersion ?? "—"}
                  </span>
                }
              />
              <InfoRow
                label="Environment"
                value={
                  settingsLoading ? (
                    "—"
                  ) : (
                    <span
                      className={
                        settings?.environment === "Production"
                          ? "text-[#00FF66]"
                          : "text-[#FFB020]"
                      }
                    >
                      {settings?.environment ?? "—"}
                    </span>
                  )
                }
              />
            </div>
          </section>

          {/* ── 7. Danger Zone ────────────────────────────────────────────────── */}
          <section className="border border-[#FF4D4D]/30 bg-[#FF4D4D]/5 rounded-xl p-6">
            <SectionHeading
              icon="warning"
              title="Danger Zone"
              subtitle="Irreversible client-side actions — proceed with caution"
            />
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleClearCache}
                className="flex-1 px-4 py-2.5 bg-[#FF4D4D]/10 hover:bg-[#FF4D4D]/20 text-[#FF4D4D] border border-[#FF4D4D]/30 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                Clear Local Cache
              </button>
              <button
                onClick={handleReload}
                className="flex-1 px-4 py-2.5 bg-[#FF4D4D]/10 hover:bg-[#FF4D4D]/20 text-[#FF4D4D] border border-[#FF4D4D]/30 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                Reload Application
              </button>
            </div>
            <p className="text-[10px] text-[#FF4D4D]/60 mt-4 uppercase font-bold tracking-wider">
              These actions only affect your browser session. No database data is modified.
            </p>
          </section>

        </div>{/* /Canvas */}
      </main>

      {/* Add Interviewer Modal */}
      {showAddInterviewerModal && (
        <div className="fixed inset-0 z-50 bg-[#050505]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#101412] border border-[#00FF66]/40 rounded-2xl p-6 sm:p-8 w-[min(540px,calc(100vw-32px))] max-w-[540px] min-w-0 max-h-[calc(100vh-32px)] overflow-y-auto shadow-2xl relative space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#1D2A22] pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#00FF66]/10 border border-[#00FF66]/20 flex items-center justify-center text-[#00FF66] flex-shrink-0">
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black uppercase tracking-wider text-[#F5F5F5] truncate">Add Custom Interviewer</h3>
                  <p className="text-[10px] text-[#8A938D] font-bold uppercase tracking-wider truncate">Add interviewer profile for room assignments</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddInterviewerModal(false)}
                className="text-[#8A938D] hover:text-[#F5F5F5] hover:bg-[#1D2A22]/50 transition-colors p-1 rounded-lg flex-shrink-0"
              >
                <span className="material-symbols-outlined text-sm font-bold">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateInterviewer} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] text-[#8A938D] font-black uppercase tracking-wider block">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newInterviewerName}
                  onChange={(e) => setNewInterviewerName(e.target.value)}
                  placeholder="e.g. Zaid Khan"
                  className="w-full bg-[#050505] border border-[#1D2A22] rounded-lg px-3 py-2.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#00FF66] transition-colors font-bold uppercase tracking-wider placeholder:text-[#8A938D]/40"
                  autoFocus
                />
                <p className="text-[10px] text-[#8A938D]/80 font-medium tracking-wide leading-relaxed">
                  Interviewer profile for room assignments and evaluation records. Interviewers log in using the shared credentials.
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-3 border-t border-[#1D2A22]">
                <button
                  type="button"
                  onClick={() => setShowAddInterviewerModal(false)}
                  disabled={isCreatingInterviewer}
                  className="w-full sm:w-auto px-4 py-2 bg-[#101412] hover:bg-[#1A201D] border border-[#1D2A22] text-[#8A938D] hover:text-[#F5F5F5] rounded-lg text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingInterviewer}
                  className="w-full sm:w-auto px-4 py-2 bg-[#00FF66] text-[#050505] hover:bg-[#00E55C] rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(0,255,102,0.3)] disabled:opacity-50 font-black"
                >
                  {isCreatingInterviewer ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-[#050505]/30 border-t-[#050505] rounded-full animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      Create Interviewer
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast ────────────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl flex items-start gap-4 shadow-2xl border bg-[#101412] w-auto max-w-[380px] ${
            toast.type === "success" ? "border-[#00FF66]/30 text-[#00FF66]" : "border-[#FF4D4D]/30 text-[#FF4D4D]"
          }`}
        >
          <span className="material-symbols-outlined mt-0.5 flex-shrink-0">
            {toast.type === "success" ? "check_circle" : "error"}
          </span>
          <p className="font-body-md text-[#F5F5F5] text-xs font-bold uppercase tracking-wider flex-1">{toast.message}</p>
          <button
            onClick={() => setToast(null)}
            className="text-[#8A938D] hover:text-[#F5F5F5] ml-2 flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Global CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        .glass-card {
          background: #101412;
          border: 1px solid #1D2A22;
        }
      ` }} />
    </div>
  );
}
