"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/ui/LogoutButton";
import CustomCursor from "@/components/ui/CustomCursor";
import AdminSidebar from "@/components/admin/AdminSidebar";
import EventWorkspaceBanner from "@/components/admin/EventWorkspaceBanner";
import { useEvent } from "@/context/EventContext";

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

interface SheetSourceData {
  _id: string;
  name: string;
  spreadsheetId: string;
  url: string;
  sheetName?: string;
  range?: string;
  isActive: boolean;
  status: "Connected" | "Error" | "Never Tested";
  lastError?: string | null;
  lastTestedAt?: string | null;
  lastLoadedAt?: string | null;
  lastImportStats?: {
    totalRows: number;
    imported: number;
    updated: number;
    skipped: number;
  } | null;
  applicantCount?: number;
  isDefault?: boolean;
  isGloballyActive?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const pathname = usePathname();
  const { activeEventId, setActiveEvent } = useEvent();
  const [isSettingActive, setIsSettingActive] = useState<string | null>(null);

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

  // ── Google Sheets Integration State ──────────────────────────────────────
  const [sheetSources, setSheetSources] = useState<SheetSourceData[]>([]);
  const [sheetsLoading, setSheetsLoading] = useState(true);
  const [serviceAccountEmail, setServiceAccountEmail] = useState("");
  const [serviceAccountProjectId, setServiceAccountProjectId] = useState("");
  const [testingSheetId, setTestingSheetId] = useState<string | null>(null);
  const [testDiagnostics, setTestDiagnostics] = useState<
    Record<
      string,
      {
        status: "success" | "error";
        maskedSpreadsheetId?: string;
        serviceAccountEmail?: string;
        projectId?: string;
        title?: string;
        sheets?: string[];
        totalDataRows?: number;
        exactReason?: string;
        httpStatus?: number;
        guidance?: string;
        testedAt: Date;
      }
    >
  >({});
  const [loadingSheetId, setLoadingSheetId] = useState<string | null>(null);

  // Add / Edit Sheet Modal
  const [showSheetModal, setShowSheetModal] = useState(false);
  const [editingSheet, setEditingSheet] = useState<SheetSourceData | null>(null);
  const [sheetFormName, setSheetFormName] = useState("");
  const [sheetFormUrl, setSheetFormUrl] = useState("");
  const [sheetFormTab, setSheetFormTab] = useState("");
  const [sheetFormRange, setSheetFormRange] = useState("");
  const [isSavingSheet, setIsSavingSheet] = useState(false);

  // Preview Modal
  const [previewData, setPreviewData] = useState<{
    sourceName: string;
    sourceId: string;
    title: string;
    sheetName: string;
    headers: string[];
    rows: Record<string, string>[];
    totalRows: number;
    previewCount: number;
    detectedMappings: Record<string, string>;
  } | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);

  // ── Evaluation Configuration State ───────────────────────────────────────
  const [evalCriteria, setEvalCriteria] = useState<Array<{ id: string; name: string; maxScore: number }>>([]);
  const [evalLoading, setEvalLoading] = useState(true);
  const [evalSaving, setEvalSaving] = useState(false);
  const [newCriterionName, setNewCriterionName] = useState("");
  const [newCriterionMaxScore, setNewCriterionMaxScore] = useState<number>(10);
  const [hasEvalChanges, setHasEvalChanges] = useState(false);

  const loadEvalConfig = useCallback(async () => {
    setEvalLoading(true);
    try {
      const res = await fetch("/api/evaluation-config");
      const json = await res.json();
      if (json.success && Array.isArray(json.criteria)) {
        setEvalCriteria(json.criteria);
        setHasEvalChanges(false);
      }
    } catch {
      // silently fail
    } finally {
      setEvalLoading(false);
    }
  }, []);

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

  const loadSheetSources = useCallback(async () => {
    setSheetsLoading(true);
    try {
      const res = await fetch("/api/admin/sheets");
      const json = await res.json();
      if (json.success && json.sources) {
        setSheetSources(json.sources);
        if (json.serviceAccountEmail) {
          setServiceAccountEmail(json.serviceAccountEmail);
        }
        if (json.projectId) {
          setServiceAccountProjectId(json.projectId);
        }
      }
    } catch {
      // silently fail
    } finally {
      setSheetsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadRooms();
    loadIdentities();
    loadInterviewers();
    loadSheetSources();
    loadEvalConfig();
  }, [loadSettings, loadRooms, loadIdentities, loadInterviewers, loadSheetSources, loadEvalConfig]);

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

    const assignedRoom = rooms.find(
      (r) => r.assignedInterviewer?.toLowerCase() === interviewer.name.toLowerCase()
    );

    if (assignedRoom || interviewer.assignedToRoom) {
      const roomLabel = assignedRoom
        ? assignedRoom.name || `Room ${assignedRoom.roomNumber}`
        : `Room ${interviewer.assignedToRoom}`;
      showToast(
        `Cannot remove "${interviewer.name}" because they are currently assigned to ${roomLabel}. Please reassign or unassign the room before proceeding.`,
        "error"
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to remove interviewer profile "${interviewer.name}"?\n\nThis will remove them from active interviewer lists and room assignments. Historical interview records will be preserved.`
    );
    if (!confirmed) {
      return;
    }

    setDeletingInterviewerId(interviewer.id);
    try {
      const res = await fetch(`/api/admin/interviewers?id=${encodeURIComponent(interviewer.id)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to delete interviewer profile.");
      }

      showToast(json.message || `Interviewer "${interviewer.name}" removed successfully.`, "success");
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

  // ── Google Sheets Handlers ───────────────────────────────────────────────

  const handleOpenAddSheet = () => {
    setEditingSheet(null);
    setSheetFormName("");
    setSheetFormUrl("");
    setSheetFormTab("");
    setSheetFormRange("");
    setShowSheetModal(true);
  };

  const handleOpenEditSheet = (source: SheetSourceData) => {
    setEditingSheet(source);
    setSheetFormName(source.name);
    setSheetFormUrl(source.url || source.spreadsheetId);
    setSheetFormTab(source.sheetName || "");
    setSheetFormRange(source.range || "");
    setShowSheetModal(true);
  };

  const handleSaveSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = sheetFormName.trim();
    const url = sheetFormUrl.trim();

    if (!name || !url) {
      showToast("Source Name and Google Sheets URL/ID are required.", "error");
      return;
    }

    setIsSavingSheet(true);
    try {
      const isEditing = Boolean(editingSheet);
      const endpoint = "/api/admin/sheets";
      const method = isEditing ? "PATCH" : "POST";
      const payload: any = {
        name,
        url,
        sheetName: sheetFormTab.trim(),
        range: sheetFormRange.trim(),
      };
      if (isEditing && editingSheet) {
        payload.id = editingSheet._id;
      }

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save spreadsheet source.");
      }

      showToast(
        isEditing
          ? `Spreadsheet "${name}" updated successfully!`
          : `Spreadsheet "${name}" added successfully!`,
        "success"
      );
      setShowSheetModal(false);
      setEditingSheet(null);
      await loadSheetSources();
    } catch (err: any) {
      showToast(err.message || "Failed to save spreadsheet source.", "error");
    } finally {
      setIsSavingSheet(false);
    }
  };

  const handleToggleSheetActive = async (source: SheetSourceData) => {
    try {
      const res = await fetch("/api/admin/sheets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: source._id, isActive: !source.isActive }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Update failed");
      showToast(
        `Spreadsheet "${source.name}" ${source.isActive ? "deactivated" : "activated"}.`,
        "success"
      );
      await loadSheetSources();
    } catch (err: any) {
      showToast(err.message || "Failed to toggle sheet status.", "error");
    }
  };

  const handleSetActiveEvent = async (source: SheetSourceData) => {
    setIsSettingActive(source._id);
    try {
      await setActiveEvent(source._id);
      await loadSheetSources();
      showToast(`"${source.name}" is now the global active recruitment event.`, "success");
    } catch (err: any) {
      showToast(err.message || "Failed to set active event.", "error");
    } finally {
      setIsSettingActive(null);
    }
  };

  const handleDeleteSheet = async (source: SheetSourceData) => {
    if (source.isDefault) {
      showToast("The default primary sheet cannot be deleted.", "error");
      return;
    }

    if (source.isGloballyActive || source._id === activeEventId) {
      showToast("Cannot delete the currently active event. Please set another event as active first.", "error");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to remove spreadsheet source "${source.name}"?`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/sheets?id=${source._id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Delete failed");
      showToast(json.message || `Source "${source.name}" removed.`, "success");
      await loadSheetSources();
    } catch (err: any) {
      showToast(err.message || "Failed to delete spreadsheet source.", "error");
    }
  };

  const handleTestSheet = async (source: SheetSourceData) => {
    setTestingSheetId(source._id);
    try {
      const res = await fetch("/api/admin/sheets/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: source._id }),
      });
      const json = await res.json();

      setTestDiagnostics((prev) => ({
        ...prev,
        [source._id]: {
          status: json.success ? "success" : "error",
          maskedSpreadsheetId:
            json.maskedSpreadsheetId ||
            (source.spreadsheetId.length > 10
              ? `${source.spreadsheetId.slice(0, 6)}...${source.spreadsheetId.slice(-4)}`
              : source.spreadsheetId),
          serviceAccountEmail: json.serviceAccountEmail || serviceAccountEmail,
          projectId: json.projectId || serviceAccountProjectId,
          title: json.title,
          sheets: json.sheets,
          totalDataRows: json.totalDataRows,
          exactReason: json.exactReason || json.error,
          httpStatus: json.status,
          guidance: json.guidance,
          testedAt: new Date(),
        },
      }));

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Connection test failed.");
      }
      showToast(
        `Connected to "${json.title}"! Found ${json.sheets?.length || 0} worksheet(s), ~${json.totalDataRows || 0} rows. Service account: ${json.serviceAccountEmail}`,
        "success"
      );
      await loadSheetSources();
    } catch (err: any) {
      showToast(err.message || "Connection test failed.", "error");
      await loadSheetSources();
    } finally {
      setTestingSheetId(null);
    }
  };

  const handlePreviewSheet = async (source: SheetSourceData) => {
    setPreviewLoadingId(source._id);
    try {
      const res = await fetch("/api/admin/sheets/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: source._id, limit: 15 }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load sheet preview.");
      }
      setPreviewData({
        sourceName: json.sourceName,
        sourceId: source._id,
        title: json.title,
        sheetName: json.sheetName,
        headers: json.headers,
        rows: json.rows,
        totalRows: json.totalRows,
        previewCount: json.previewCount,
        detectedMappings: json.detectedMappings,
      });
    } catch (err: any) {
      showToast(err.message || "Failed to preview spreadsheet.", "error");
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const handleLoadSheet = async (sourceId: string, sourceName: string) => {
    const confirmed = window.confirm(
      `Import applicant data from "${sourceName}"?\n\nThis will safely insert new applicants and update registration responses while preserving all existing interview statuses, ratings, durations, and notes.`
    );
    if (!confirmed) return;

    setLoadingSheetId(sourceId);
    try {
      const res = await fetch("/api/admin/sheets/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sourceId }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load data from spreadsheet.");
      }
      showToast(
        `Load Complete for "${sourceName}":\nImported: ${json.imported} · Updated: ${json.updated} · Skipped: ${json.skipped}`,
        "success"
      );
      if (previewData?.sourceId === sourceId) {
        setPreviewData(null);
      }
      await loadSheetSources();
      await loadSettings();
    } catch (err: any) {
      showToast(err.message || "Failed to load spreadsheet data.", "error");
    } finally {
      setLoadingSheetId(null);
    }
  };

  const handleCopyEmail = () => {
    if (!serviceAccountEmail) return;
    navigator.clipboard.writeText(serviceAccountEmail);
    showToast("Service account email copied to clipboard!", "success");
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

  // ── Evaluation Configuration Handlers ─────────────────────────────────────

  const handleAddCriterion = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newCriterionName.trim();
    if (!name) {
      showToast("Criterion name cannot be empty.", "error");
      return;
    }
    if (evalCriteria.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      showToast(`Criterion "${name}" already exists.`, "error");
      return;
    }
    const maxScore = Number(newCriterionMaxScore) > 0 ? Number(newCriterionMaxScore) : 10;
    const newCrit = {
      id: `crit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      maxScore,
    };
    setEvalCriteria(prev => [...prev, newCrit]);
    setNewCriterionName("");
    setNewCriterionMaxScore(10);
    setHasEvalChanges(true);
  };

  const handleUpdateCriterionName = (index: number, newName: string) => {
    setEvalCriteria(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], name: newName };
      return copy;
    });
    setHasEvalChanges(true);
  };

  const handleUpdateCriterionMaxScore = (index: number, maxVal: number) => {
    const val = Number(maxVal) > 0 ? Math.floor(Number(maxVal)) : 10;
    setEvalCriteria(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], maxScore: val };
      return copy;
    });
    setHasEvalChanges(true);
  };

  const handleDeleteCriterion = (index: number) => {
    if (evalCriteria.length <= 1) {
      showToast("At least one evaluation criterion is required.", "error");
      return;
    }
    setEvalCriteria(prev => prev.filter((_, i) => i !== index));
    setHasEvalChanges(true);
  };

  const handleMoveCriterion = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === evalCriteria.length - 1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    setEvalCriteria(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
    setHasEvalChanges(true);
  };

  const handleSaveEvalConfig = async () => {
    if (evalCriteria.length === 0) {
      showToast("At least one criterion is required.", "error");
      return;
    }
    for (let i = 0; i < evalCriteria.length; i++) {
      if (!evalCriteria[i].name.trim()) {
        showToast(`Criterion #${i + 1} cannot have an empty name.`, "error");
        return;
      }
    }
    const names = evalCriteria.map(c => c.name.trim().toLowerCase());
    if (new Set(names).size !== names.length) {
      showToast("Each criterion must have a unique name.", "error");
      return;
    }

    setEvalSaving(true);
    try {
      const res = await fetch("/api/evaluation-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ criteria: evalCriteria }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to save configuration.");
      setEvalCriteria(json.criteria);
      setHasEvalChanges(false);
      showToast("Evaluation configuration saved successfully.", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to save evaluation configuration.", "error");
    } finally {
      setEvalSaving(false);
    }
  };

  const handleResetEvalDefaults = () => {
    setEvalCriteria([
      { id: "technical", name: "Technical", maxScore: 10 },
      { id: "communication", name: "Communication", maxScore: 10 },
      { id: "confidence", name: "Confidence", maxScore: 10 },
      { id: "leadership", name: "Leadership", maxScore: 10 },
      { id: "teamwork", name: "Teamwork", maxScore: 10 },
    ]);
    setHasEvalChanges(true);
  };

  // ── Refresh Statistics ─────────────────────────────────────────────────────

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([loadSettings(), loadEvalConfig()]);
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
    badge,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    badge?: React.ReactNode;
  }) => (
    <div className="flex items-start justify-between gap-3 mb-6 pb-4 border-b border-[#1D2A22]">
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-[#00FF66]/10 flex items-center justify-center flex-shrink-0 border border-[#00FF66]/25 shadow-[0_0_12px_rgba(0,255,102,0.15)] text-[#00FF66]">
          <span className="material-symbols-outlined text-[20px] font-bold">{icon}</span>
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-black uppercase tracking-wider text-[#F5F5F5]">{title}</h3>
            {badge}
          </div>
          {subtitle && (
            <p className="text-[11px] text-[#8A938D] font-medium tracking-wide mt-0.5">{subtitle}</p>
          )}
        </div>
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
    <div className="flex items-center justify-between py-3.5 px-4 rounded-xl border border-transparent hover:border-[#1D2A22] hover:bg-[#080B09] transition-all">
      <span className="text-xs text-[#8A938D] font-bold uppercase tracking-wider">{label}</span>
      <span className="text-sm text-[#F5F5F5] font-semibold text-right">{value}</span>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#050505] text-[#F5F5F5] font-body-md selection:bg-[#00FF66]/30 selection:text-[#00FF66]">
      <CustomCursor />

      {/* SideNavBar ────────────────────────────────────────────────────────── */}
      <AdminSidebar />

      {/* Main ────────────────────────────────────────────────────────────────── */}
      <main className="md:ml-64 flex-1 flex flex-col min-h-screen relative">

        {/* Canvas */}
        <div className="flex-1 p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full space-y-8 overflow-x-hidden">
          <EventWorkspaceBanner />

          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1D2A22]">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-pulse" />
                  Control Center
                </span>
                <span className="text-[10px] text-[#8A938D] font-mono uppercase tracking-wider">
                  NEXUS OS
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#F5F5F5] uppercase tracking-wide drop-shadow-[0_0_8px_rgba(0,255,102,0.3)]">
                Settings &amp; Administration
              </h2>
              <p className="text-xs text-[#8A938D] font-semibold uppercase tracking-wider mt-1">
                System configuration, live status, workspace settings and access controls
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="px-3 py-1.5 rounded-xl bg-[#101412] border border-[#1D2A22] text-[10px] font-mono text-[#8A938D] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00FF66]" />
                Engine Operational
              </span>
            </div>
          </div>

          {/* ── Top Grid: Admin Profile & System Status ───────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* ── 1. Admin Profile ───────────────────────────────────────────── */}
            <section className="lg:col-span-5 bg-[#101412] p-6 sm:p-7 rounded-2xl border border-[#1D2A22] shadow-xl hover:border-[#1D2A22]/90 transition-all flex flex-col justify-between">
              <div>
                <SectionHeading icon="manage_accounts" title="Admin Profile" subtitle="Current operator authentication and role" />
                <div className="flex items-start gap-4 p-4 rounded-xl bg-[#080B09] border border-[#1D2A22]">
                  <div className="w-14 h-14 rounded-2xl bg-[#00FF66]/10 border border-[#00FF66]/25 flex items-center justify-center text-[#00FF66] flex-shrink-0 shadow-[0_0_12px_rgba(0,255,102,0.15)]">
                    <span className="material-symbols-outlined text-[30px]">shield_person</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-black text-[#F5F5F5] uppercase tracking-wide truncate">System Admin</p>
                    <p className="text-xs text-[#8A938D] font-bold mt-0.5 uppercase tracking-wider">Super Administrator</p>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/20 uppercase tracking-wider mt-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00FF66] animate-pulse" />
                      Active Session
                    </span>
                  </div>
                </div>
              </div>
              <div className="pt-5 mt-5 border-t border-[#1D2A22] flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#8A938D] uppercase">Access Level: Full Root</span>
                <button
                  className="px-3.5 py-2 bg-[#0B0D0C] hover:bg-[#1A201D] hover:text-[#00FF66] border border-[#1D2A22] hover:border-[#00FF66]/30 text-[#8A938D] rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
                  title="Edit profile — coming soon"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  Edit Profile
                </button>
              </div>
            </section>

            {/* ── 2. System Status ────────────────────────────────────────────── */}
            <section className="lg:col-span-7 bg-[#101412] p-6 sm:p-7 rounded-2xl border border-[#1D2A22] shadow-xl hover:border-[#1D2A22]/90 transition-all">
              <SectionHeading
                icon="health_and_safety"
                title="System Status"
                subtitle="Live infrastructure telemetry and environment metrics"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* MongoDB */}
                <div className="bg-[#080B09] border border-[#1D2A22] rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-[#1D2A22]/90 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[#00FF66]">database</span>
                      <p className="text-[10px] font-black text-[#8A938D] uppercase tracking-wider">MongoDB</p>
                    </div>
                    {settingsLoading ? (
                      <SkeletonLine w="w-20" />
                    ) : (
                      <StatusBadge ok={settings?.mongodbConnected ?? false} />
                    )}
                  </div>
                  <p className="text-xs font-bold text-[#F5F5F5] font-mono">
                    {settingsLoading ? "—" : settings?.mongodbConnected ? "Atlas Cluster Connected" : "Not Reachable"}
                  </p>
                </div>

                {/* Google Sheets */}
                <div className="bg-[#080B09] border border-[#1D2A22] rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-[#1D2A22]/90 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[#00FF66]">table_chart</span>
                      <p className="text-[10px] font-black text-[#8A938D] uppercase tracking-wider">Google Sheets</p>
                    </div>
                    {settingsLoading ? (
                      <SkeletonLine w="w-20" />
                    ) : (
                      <StatusBadge ok={settings?.googleSheetsConnected ?? false} />
                    )}
                  </div>
                  <p className="text-xs font-bold text-[#F5F5F5] font-mono">
                    {settingsLoading ? "—" : settings?.googleSheetsConnected ? "API Service Configured" : "Missing Credentials"}
                  </p>
                </div>

                {/* Last Sync */}
                <div className="bg-[#080B09] border border-[#1D2A22] rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-[#1D2A22]/90 transition-all">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#8A938D]">sync</span>
                    <p className="text-[10px] font-black text-[#8A938D] uppercase tracking-wider">Last Sync Event</p>
                  </div>
                  {settingsLoading ? (
                    <SkeletonLine w="w-3/4" />
                  ) : (
                    <p className="text-xs font-bold text-[#F5F5F5] font-mono truncate">
                      {settings?.lastSync
                        ? new Date(settings.lastSync).toLocaleString()
                        : "No sync recorded"}
                    </p>
                  )}
                </div>

                {/* Total Applicants */}
                <div className="bg-[#080B09] border border-[#1D2A22] rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-[#1D2A22]/90 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[#8A938D]">group</span>
                      <p className="text-[10px] font-black text-[#8A938D] uppercase tracking-wider">Total Ingested</p>
                    </div>
                    <span className="text-[9px] text-[#8A938D] uppercase font-mono">Database Total</span>
                  </div>
                  {settingsLoading ? (
                    <SkeletonLine w="w-16" />
                  ) : (
                    <p className="text-2xl font-black text-[#00FF66] font-mono leading-none">
                      {settings?.totalApplicants ?? "—"}
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* ── 3. Room Management ───────────────────────────────────────────── */}
          <section className="bg-[#101412] p-6 sm:p-7 rounded-2xl border border-[#1D2A22] shadow-xl hover:border-[#1D2A22]/90 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#1D2A22]">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#00FF66]/10 flex items-center justify-center flex-shrink-0 border border-[#00FF66]/25 shadow-[0_0_12px_rgba(0,255,102,0.15)] text-[#00FF66]">
                  <span className="material-symbols-outlined text-[20px] font-bold">meeting_room</span>
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-[#F5F5F5]">Room Management</h3>
                  <p className="text-[11px] text-[#8A938D] font-medium tracking-wide mt-0.5">
                    Configure interview rooms, assigned interviewers, and live operational states
                  </p>
                </div>
              </div>
              <button
                onClick={handleOpenAddForm}
                disabled={showAddRoom}
                className="px-4 py-2 bg-[#00FF66] text-[#050505] hover:bg-[#00E55C] rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(0,255,102,0.25)] disabled:opacity-50 disabled:cursor-not-allowed self-start sm:self-auto h-9 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px] font-bold">add</span>
                Add Room
              </button>
            </div>

            {/* Inline Add Room Form */}
            {showAddRoom && (
              <form onSubmit={handleCreateRoom} className="bg-[#080B09] border border-[#00FF66]/40 rounded-2xl p-6 mb-6 space-y-4 animate-in fade-in duration-200 shadow-2xl">
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
                    <label className="text-[9px] text-[#8A938D] font-black uppercase tracking-wider block">
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
                      className="w-full bg-[#101412] border border-[#1D2A22] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F5F5] font-mono focus:outline-none focus:border-[#00FF66] focus:ring-1 focus:ring-[#00FF66] transition-colors font-bold h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] text-[#8A938D] font-black uppercase tracking-wider block">
                      Room Name / Label
                    </label>
                    <input
                      type="text"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="e.g. Room 04"
                      className="w-full bg-[#101412] border border-[#1D2A22] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#00FF66] focus:ring-1 focus:ring-[#00FF66] transition-colors font-bold uppercase tracking-wider h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] text-[#8A938D] font-black uppercase tracking-wider block">
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
                      className="w-full bg-[#101412] border border-[#1D2A22] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#00FF66] focus:ring-1 focus:ring-[#00FF66] transition-colors font-bold uppercase tracking-wider h-10"
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
                    className="px-4 py-2 bg-[#101412] hover:bg-[#1A201D] border border-[#1D2A22] text-[#8A938D] rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 h-9"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingRoom}
                    className="px-5 py-2 bg-[#00FF66] text-[#050505] hover:bg-[#00E55C] rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-[0_0_10px_rgba(0,255,102,0.3)] disabled:opacity-50 h-9"
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
              <form onSubmit={handleSaveEdit} className="bg-[#080B09] border border-[#00FF66]/40 rounded-2xl p-6 mb-6 space-y-4 animate-in fade-in duration-200 shadow-2xl">
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
                    <label className="text-[9px] text-[#8A938D] font-black uppercase tracking-wider block">
                      Room Label / Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editRoomName}
                      onChange={(e) => setEditRoomName(e.target.value)}
                      placeholder="e.g. Room 01"
                      className="w-full bg-[#101412] border border-[#1D2A22] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#00FF66] focus:ring-1 focus:ring-[#00FF66] transition-colors font-bold uppercase tracking-wider h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] text-[#8A938D] font-black uppercase tracking-wider block">
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
                      className="w-full bg-[#101412] border border-[#1D2A22] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#00FF66] focus:ring-1 focus:ring-[#00FF66] transition-colors font-bold uppercase tracking-wider h-10"
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
                    className="px-4 py-2 bg-[#101412] hover:bg-[#1A201D] border border-[#1D2A22] text-[#8A938D] rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 h-9"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingRoom}
                    className="px-5 py-2 bg-[#00FF66] text-[#050505] hover:bg-[#00E55C] rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-[0_0_10px_rgba(0,255,102,0.3)] disabled:opacity-50 h-9"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-32 bg-[#080B09] border border-[#1D2A22] rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : rooms.length === 0 ? (
              <div className="p-8 text-center bg-[#080B09] border border-dashed border-[#1D2A22] rounded-2xl">
                <p className="text-xs text-[#8A938D] font-bold uppercase tracking-wider">No interview rooms configured.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rooms.map((room) => {
                  const isDeactivated = room.isActive === false;
                  const hasActiveInterview = room.status === "Occupied" && room.applicant !== null;
                  const isOccupiedWithoutApp = room.status === "Occupied" && !room.applicant;
                  const isProcessing = actionRoomNumber === room.roomNumber;

                  return (
                    <div
                      key={room._id}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                        isDeactivated
                          ? "bg-[#080B09]/40 border-[#1D2A22]/50 opacity-60"
                          : hasActiveInterview
                          ? "bg-gradient-to-br from-[#00FF66]/[0.08] to-[#101412] border-[#00FF66]/40 shadow-[0_0_15px_rgba(0,255,102,0.08)]"
                          : "bg-[#080B09]/60 border-[#1D2A22] hover:border-[#1D2A22]/80 hover:bg-[#0B0E0C]"
                      }`}
                    >
                      {/* Top Header of Room Card */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center font-mono font-black text-sm border shadow-sm flex-shrink-0 ${
                              isDeactivated
                                ? "bg-[#101412] text-[#8A938D] border-[#1D2A22]"
                                : hasActiveInterview
                                ? "bg-[#00FF66]/15 text-[#00FF66] border-[#00FF66]/40 shadow-[0_0_10px_rgba(0,255,102,0.2)]"
                                : "bg-[#101412] text-[#F5F5F5] border-[#1D2A22]"
                            }`}
                          >
                            {String(room.roomNumber).padStart(2, "0")}
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-sm font-black text-[#F5F5F5] uppercase tracking-wide truncate">
                              {room.name || `Room ${String(room.roomNumber).padStart(2, "0")}`}
                            </h4>
                            <div className="flex items-center gap-1.5 text-xs mt-1 text-[#8A938D]">
                              <span className="material-symbols-outlined text-xs">person</span>
                              <span className="text-[11px] font-medium truncate">
                                {room.assignedInterviewer ? (
                                  <strong className="text-[#F5F5F5] font-semibold">{room.assignedInterviewer}</strong>
                                ) : (
                                  <span className="text-[#8A938D]/60 italic font-mono uppercase text-[10px]">Unassigned</span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 border flex-shrink-0 ${
                            isDeactivated
                              ? "bg-[#FF4D4D]/10 text-[#FF4D4D] border-[#FF4D4D]/25"
                              : hasActiveInterview
                              ? "bg-[#00FF66]/15 text-[#00FF66] border-[#00FF66]/30 shadow-[0_0_8px_rgba(0,255,102,0.2)]"
                              : isOccupiedWithoutApp
                              ? "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/25"
                              : "bg-[#8A938D]/10 text-[#8A938D] border-[#8A938D]/25"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
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

                      {/* Middle info: Candidate if active */}
                      {hasActiveInterview && (
                        <div className="bg-[#00FF66]/5 border border-[#00FF66]/20 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
                          <span className="text-[10px] uppercase font-bold text-[#8A938D] tracking-wider">Candidate:</span>
                          <span className="text-[#00FF66] font-mono font-bold text-[11px] truncate ml-2">
                            {room.applicant?.name} ({room.applicant?.rollNumber})
                          </span>
                        </div>
                      )}

                      {/* Bottom Actions Bar */}
                      <div className="flex items-center justify-between pt-3 border-t border-[#1D2A22]/60 gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStartEdit(room)}
                            disabled={isProcessing}
                            className="px-3 py-1.5 bg-[#101412] hover:bg-[#1A201D] hover:text-[#00FF66] border border-[#1D2A22] text-[#8A938D] rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
                            title="Edit Room Name & Interviewer"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                            Edit
                          </button>

                          <button
                            onClick={() => handleToggleActive(room)}
                            disabled={isProcessing || (room.isActive && hasActiveInterview)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-colors flex items-center gap-1.5 ${
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
                        </div>

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
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── 4. Interviewer Management ───────────────────────────────────── */}
          <section className="bg-[#101412] p-6 sm:p-7 rounded-2xl border border-[#1D2A22] shadow-xl hover:border-[#1D2A22]/90 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#1D2A22]">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#00FF66]/10 flex items-center justify-center flex-shrink-0 border border-[#00FF66]/25 shadow-[0_0_12px_rgba(0,255,102,0.15)] text-[#00FF66]">
                  <span className="material-symbols-outlined text-[20px] font-bold">badge</span>
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-[#F5F5F5]">Interviewer Management</h3>
                  <p className="text-[11px] text-[#8A938D] font-medium tracking-wide mt-0.5">
                    Authorized interviewers, credentials, and room assignment eligibility
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddInterviewerModal(true)}
                className="px-4 py-2 bg-[#00FF66] text-[#050505] hover:bg-[#00E55C] rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(0,255,102,0.25)] self-start sm:self-auto h-9 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px] font-bold">person_add</span>
                Add Interviewer
              </button>
            </div>

            {/* Interviewer Accounts List */}
            {interviewersLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-32 bg-[#080B09] border border-[#1D2A22] rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : interviewers.length === 0 ? (
              <div className="p-8 text-center bg-[#080B09] border border-dashed border-[#1D2A22] rounded-2xl">
                <p className="text-xs text-[#8A938D] font-bold uppercase tracking-wider">No interviewers found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {interviewers.map((interviewer) => {
                  const assignedRoom = rooms.find(
                    (r) => r.assignedInterviewer?.toLowerCase() === interviewer.name.toLowerCase()
                  );

                  return (
                    <div
                      key={interviewer.id}
                      className="p-5 rounded-2xl border border-[#1D2A22] bg-[#080B09]/60 hover:border-[#1D2A22]/80 hover:bg-[#0B0E0C] flex flex-col justify-between gap-4 transition-all shadow-sm"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-[#101412] border border-[#1D2A22] flex items-center justify-center text-[#00FF66] shadow-sm flex-shrink-0">
                              <span className="material-symbols-outlined text-[20px]">person</span>
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-black text-[#F5F5F5] uppercase tracking-wide truncate">
                                {interviewer.name}
                              </h4>
                              <p className="text-[10px] text-[#8A938D] font-mono uppercase tracking-wider">
                                {interviewer.role || "Interviewer"}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border flex-shrink-0 ${
                              interviewer.isDefault
                                ? "bg-[#00FF66]/10 text-[#00FF66] border-[#00FF66]/20"
                                : "bg-[#8A938D]/10 text-[#8A938D] border-[#8A938D]/20"
                            }`}
                          >
                            {interviewer.isDefault ? "Default" : "Custom"}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-[#1D2A22]/40 text-xs">
                          {assignedRoom ? (
                            <div className="flex items-center gap-1.5 text-[#00FF66]">
                              <span className="material-symbols-outlined text-xs">meeting_room</span>
                              <span className="text-[10px] font-bold uppercase tracking-wider truncate">
                                Assigned to {assignedRoom.name || `Room ${assignedRoom.roomNumber}`}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[#8A938D]">
                              <span className="material-symbols-outlined text-xs">event_available</span>
                              <span className="text-[10px] font-bold uppercase tracking-wider">
                                Unassigned · Available
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-[#1D2A22]/40">
                        <span className="px-2.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider bg-[#00FF66]/5 text-[#8A938D] border border-[#1D2A22]">
                          Active Profile
                        </span>
                        {!interviewer.isDefault && (
                          <button
                            onClick={() => handleDeleteInterviewer(interviewer)}
                            disabled={deletingInterviewerId === interviewer.id}
                            className="p-1.5 bg-[#FF4D4D]/10 hover:bg-[#FF4D4D]/20 text-[#FF4D4D] border border-[#FF4D4D]/20 hover:border-[#FF4D4D]/40 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-40 flex items-center justify-center cursor-pointer"
                            title={`Remove "${interviewer.name}" profile`}
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── 5. Evaluation Configuration ─────────────────────────────────── */}
          <section className="bg-[#101412] p-6 sm:p-7 rounded-2xl border border-[#1D2A22] shadow-xl hover:border-[#1D2A22]/90 transition-all space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1D2A22]">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#00FF66]/10 flex items-center justify-center flex-shrink-0 border border-[#00FF66]/25 shadow-[0_0_12px_rgba(0,255,102,0.15)] text-[#00FF66]">
                  <span className="material-symbols-outlined text-[20px] font-bold">tune</span>
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-[#F5F5F5]">Evaluation Configuration</h3>
                  <p className="text-[11px] text-[#8A938D] font-medium tracking-wide mt-0.5">
                    Global evaluation criteria and scoring scale applied to all interview workspaces across all events
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleResetEvalDefaults}
                  disabled={evalSaving}
                  className="px-3.5 py-2 bg-[#101412] hover:bg-[#151D18] text-[#8A938D] hover:text-[#F5F5F5] border border-[#1D2A22] rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 h-9"
                  title="Reset to default 5 criteria"
                >
                  Reset Defaults
                </button>
                <button
                  type="button"
                  onClick={handleSaveEvalConfig}
                  disabled={evalSaving || (!hasEvalChanges && evalCriteria.length > 0)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md h-9 ${
                    hasEvalChanges
                      ? "bg-[#00FF66] text-[#050505] hover:bg-[#00E55C] shadow-[0_0_15px_rgba(0,255,102,0.35)] animate-pulse"
                      : "bg-[#00FF66]/20 text-[#00FF66] border border-[#00FF66]/30 hover:bg-[#00FF66]/30"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <span className="material-symbols-outlined text-[16px] font-bold">
                    {evalSaving ? "hourglass_top" : "save"}
                  </span>
                  {evalSaving ? "Saving..." : hasEvalChanges ? "Save Changes *" : "Saved"}
                </button>
              </div>
            </div>

            {/* Criteria List */}
            {evalLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="h-16 bg-[#080B09] border border-[#1D2A22] rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : evalCriteria.length === 0 ? (
              <div className="p-8 text-center bg-[#080B09] border border-dashed border-[#1D2A22] rounded-2xl">
                <p className="text-xs text-[#8A938D] font-bold uppercase tracking-wider">No criteria configured.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {evalCriteria.map((criterion, idx) => (
                  <div
                    key={criterion.id || idx}
                    className="p-4 rounded-2xl border border-[#1D2A22] bg-[#080B09]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#1D2A22]/90 transition-all shadow-sm"
                  >
                    {/* Left: Reordering & Rank */}
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <span className="w-8 h-8 rounded-xl bg-[#101412] border border-[#1D2A22] text-[#8A938D] text-xs font-mono font-bold flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleMoveCriterion(idx, "up")}
                          disabled={idx === 0 || evalSaving}
                          className="w-7 h-4 rounded bg-[#101412] hover:bg-[#1A261F] text-[#8A938D] hover:text-[#00FF66] border border-[#1D2A22] flex items-center justify-center text-[10px] disabled:opacity-20 disabled:hover:text-[#8A938D] transition-colors"
                          title="Move Up"
                        >
                          <span className="material-symbols-outlined text-[13px] leading-none">arrow_drop_up</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveCriterion(idx, "down")}
                          disabled={idx === evalCriteria.length - 1 || evalSaving}
                          className="w-7 h-4 rounded bg-[#101412] hover:bg-[#1A261F] text-[#8A938D] hover:text-[#00FF66] border border-[#1D2A22] flex items-center justify-center text-[10px] disabled:opacity-20 disabled:hover:text-[#8A938D] transition-colors"
                          title="Move Down"
                        >
                          <span className="material-symbols-outlined text-[13px] leading-none">arrow_drop_down</span>
                        </button>
                      </div>
                    </div>

                    {/* Middle: Name Input & Max Score Input */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-center">
                      <div className="sm:col-span-2">
                        <label className="text-[9px] uppercase tracking-wider text-[#8A938D] font-black block mb-1">
                          Criterion Name
                        </label>
                        <input
                          type="text"
                          value={criterion.name}
                          onChange={(e) => handleUpdateCriterionName(idx, e.target.value)}
                          placeholder="e.g. Technical, Problem Solving"
                          className="w-full bg-[#101412] border border-[#1D2A22] rounded-xl px-3.5 py-2 text-xs font-bold text-[#F5F5F5] placeholder:text-[#8A938D]/40 focus:ring-1 focus:ring-[#00FF66] focus:border-[#00FF66] outline-none transition-all h-10"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase tracking-wider text-[#8A938D] font-black block mb-1">
                          Max Score
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={criterion.maxScore || 10}
                            onChange={(e) => handleUpdateCriterionMaxScore(idx, Number(e.target.value))}
                            className="w-full bg-[#101412] border border-[#1D2A22] rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-[#00FF66] focus:ring-1 focus:ring-[#00FF66] focus:border-[#00FF66] outline-none transition-all h-10"
                          />
                          <span className="absolute right-3 top-2.5 text-[10px] text-[#8A938D] pointer-events-none font-bold">
                            PTS
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Delete button */}
                    <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDeleteCriterion(idx)}
                        disabled={evalCriteria.length <= 1 || evalSaving}
                        className="w-10 h-10 bg-[#FF4D4D]/10 hover:bg-[#FF4D4D]/20 text-[#FF4D4D] border border-[#FF4D4D]/20 hover:border-[#FF4D4D]/40 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
                        title={evalCriteria.length <= 1 ? "At least one criterion is required" : `Delete "${criterion.name}"`}
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Criterion Sub-Form */}
            <form
              onSubmit={handleAddCriterion}
              className="p-5 rounded-2xl border border-dashed border-[#1D2A22] hover:border-[#00FF66]/40 bg-[#080B09]/40 flex flex-col sm:flex-row sm:items-end gap-3.5 transition-all"
            >
              <div className="flex-1">
                <label className="text-[9px] uppercase tracking-wider text-[#8A938D] font-black block mb-1">
                  Add New Criterion Name
                </label>
                <input
                  type="text"
                  value={newCriterionName}
                  onChange={(e) => setNewCriterionName(e.target.value)}
                  placeholder="e.g. Creativity, Critical Thinking"
                  className="w-full bg-[#101412] border border-[#1D2A22] rounded-xl px-3.5 py-2 text-xs font-semibold text-[#F5F5F5] placeholder:text-[#8A938D]/40 focus:ring-1 focus:ring-[#00FF66] focus:border-[#00FF66] outline-none transition-all h-10"
                />
              </div>
              <div className="w-full sm:w-32">
                <label className="text-[9px] uppercase tracking-wider text-[#8A938D] font-black block mb-1">
                  Max Score
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={newCriterionMaxScore}
                  onChange={(e) => setNewCriterionMaxScore(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-[#101412] border border-[#1D2A22] rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-[#00FF66] focus:ring-1 focus:ring-[#00FF66] focus:border-[#00FF66] outline-none transition-all h-10"
                />
              </div>
              <button
                type="submit"
                disabled={!newCriterionName.trim() || evalSaving}
                className="px-5 py-2 bg-[#00FF66]/10 hover:bg-[#00FF66]/20 text-[#00FF66] border border-[#00FF66]/30 hover:border-[#00FF66]/60 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed self-stretch sm:self-auto h-10"
              >
                <span className="material-symbols-outlined text-[16px] font-bold">add</span>
                Add Criterion
              </button>
            </form>
          </section>

          {/* ── 6. Google Sheets Integration ─────────────────────────────────── */}
          <section className="bg-[#101412] p-6 sm:p-7 rounded-2xl border border-[#1D2A22] shadow-xl hover:border-[#1D2A22]/90 transition-all space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1D2A22]">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#00FF66]/10 flex items-center justify-center flex-shrink-0 border border-[#00FF66]/25 shadow-[0_0_12px_rgba(0,255,102,0.15)] text-[#00FF66]">
                  <span className="material-symbols-outlined text-[20px] font-bold">table_view</span>
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-[#F5F5F5]">Google Sheets Integration</h3>
                  <p className="text-[11px] text-[#8A938D] font-medium tracking-wide mt-0.5">
                    Configure multiple spreadsheet sources, test connectivity, preview rows, and import applicants
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={handleOpenAddSheet}
                  className="px-4 py-2 bg-[#00FF66] text-[#050505] hover:bg-[#00E55C] rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(0,255,102,0.25)] h-9 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] font-bold">add_link</span>
                  Add Spreadsheet
                </button>
              </div>
            </div>

            {/* Service Account Sharing Instruction Card */}
            {serviceAccountEmail && (
              <div className="p-5 rounded-2xl border border-[#00FF66]/25 bg-gradient-to-r from-[#00FF66]/[0.06] to-transparent flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#00FF66]/15 border border-[#00FF66]/30 flex items-center justify-center text-[#00FF66] flex-shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[18px]">vpn_key</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-[#F5F5F5] uppercase tracking-wider">
                      Google Service Account Permission
                    </p>
                    <p className="text-[11px] text-[#8A938D] mt-0.5">
                      Share each Google Sheet with this service account email as <strong className="text-[#00FF66]">Viewer</strong>:
                    </p>
                    <p className="font-mono text-xs text-[#00FF66] break-all select-all mt-1.5 font-bold">
                      {serviceAccountEmail}
                    </p>
                    {serviceAccountProjectId && (
                      <p className="text-[10px] text-[#8A938D] mt-1 font-mono">
                        Google Cloud Project: <span className="text-[#F5F5F5] font-semibold">{serviceAccountProjectId}</span>
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleCopyEmail}
                  className="px-4 py-2 bg-[#101412] hover:bg-[#1A201D] border border-[#00FF66]/30 hover:border-[#00FF66]/60 text-[#00FF66] rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 flex-shrink-0 self-start md:self-auto h-9"
                >
                  <span className="material-symbols-outlined text-[14px]">content_copy</span>
                  Copy Email
                </button>
              </div>
            )}

            {/* Configured Spreadsheets List */}
            {sheetsLoading ? (
              <div className="space-y-4">
                {[1, 2].map((n) => (
                  <div key={n} className="h-32 bg-[#080B09] border border-[#1D2A22] rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : sheetSources.length === 0 ? (
              <div className="p-8 text-center bg-[#080B09] border border-dashed border-[#1D2A22] rounded-2xl">
                <p className="text-xs text-[#8A938D] font-bold uppercase tracking-wider">No Google Sheets sources configured.</p>
                <button
                  onClick={handleOpenAddSheet}
                  className="mt-3 px-3.5 py-2 bg-[#00FF66]/10 hover:bg-[#00FF66]/20 text-[#00FF66] border border-[#00FF66]/30 rounded-xl text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  Add First Sheet
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {sheetSources.map((source) => {
                  const isTesting = testingSheetId === source._id;
                  const isLoading = loadingSheetId === source._id;
                  const isPreviewing = previewLoadingId === source._id;
                  const isDeactivated = !source.isActive;
                  const isGloballyActive = Boolean(source.isGloballyActive || source._id === activeEventId);

                  return (
                    <div
                      key={source._id}
                      className={`p-5 sm:p-6 rounded-2xl border transition-all space-y-4 ${
                        isGloballyActive
                          ? "border-[#00FF66]/70 bg-gradient-to-br from-[#00FF66]/[0.05] to-[#101412] shadow-[0_0_25px_rgba(0,255,102,0.1)] ring-1 ring-[#00FF66]/30"
                          : isDeactivated
                          ? "border-[#1D2A22]/50 bg-[#080B09]/30 opacity-60"
                          : "border-[#1D2A22] bg-[#080B09]/60 hover:border-[#1D2A22]/80 hover:bg-[#0B0E0C]"
                      }`}
                    >
                      {/* Header & Status Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 shadow-sm ${
                              isGloballyActive
                                ? "bg-[#00FF66]/20 border-[#00FF66] text-[#00FF66] shadow-[0_0_12px_rgba(0,255,102,0.25)]"
                                : source.status === "Connected"
                                ? "bg-[#00FF66]/10 border-[#00FF66]/30 text-[#00FF66]"
                                : source.status === "Error"
                                ? "bg-[#FF4D4D]/10 border-[#FF4D4D]/30 text-[#FF4D4D]"
                                : "bg-[#101412] border-[#1D2A22] text-[#8A938D]"
                            }`}
                          >
                            <span className="material-symbols-outlined text-[22px]">
                              {isGloballyActive ? "stars" : source.status === "Connected" ? "check_circle" : source.status === "Error" ? "error" : "draft"}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-base font-black text-[#F5F5F5] uppercase tracking-wide truncate">
                                {source.name}
                              </h4>
                              {isGloballyActive && (
                                <span className="px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-[#00FF66] text-[#050505] shadow-[0_0_10px_rgba(0,255,102,0.4)] flex items-center gap-1 font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#050505] animate-pulse" />
                                  Active Event
                                </span>
                              )}
                              {source.isDefault && (
                                <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/20">
                                  Default Source
                                </span>
                              )}
                              <span
                                className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${
                                  source.status === "Connected"
                                    ? "bg-[#00FF66]/10 text-[#00FF66] border-[#00FF66]/20"
                                    : source.status === "Error"
                                    ? "bg-[#FF4D4D]/10 text-[#FF4D4D] border-[#FF4D4D]/20"
                                    : "bg-[#8A938D]/10 text-[#8A938D] border-[#1D2A22]"
                                }`}
                              >
                                {source.status}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/20 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[10px]">group</span>
                                {source.applicantCount ?? 0} Applicants
                              </span>
                              {!source.isActive && (
                                <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-[#FFB020]/10 text-[#FFB020] border border-[#FFB020]/20">
                                  Deactivated
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Primary event button in header for instant recognition */}
                        <div className="flex-shrink-0">
                          {isGloballyActive ? (
                            <span className="px-3.5 py-1.5 bg-[#00FF66]/15 border border-[#00FF66]/40 text-[#00FF66] rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 select-none shadow-[0_0_10px_rgba(0,255,102,0.15)]">
                              <span className="material-symbols-outlined text-[15px] font-bold">check_circle</span>
                              Currently Active
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSetActiveEvent(source)}
                              disabled={isSettingActive === source._id || isDeactivated}
                              className="px-3.5 py-1.5 bg-[#00FF66] text-[#050505] hover:bg-[#00E55C] rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,255,102,0.25)] hover:shadow-[0_0_18px_rgba(0,255,102,0.4)] disabled:opacity-40 cursor-pointer"
                              title={`Set "${source.name}" as the single global active recruitment event across the engine`}
                            >
                              {isSettingActive === source._id ? (
                                <div className="w-3.5 h-3.5 border-2 border-[#050505]/30 border-t-[#050505] rounded-full animate-spin" />
                              ) : (
                                <span className="material-symbols-outlined text-[15px] font-bold">radio_button_checked</span>
                              )}
                              {isSettingActive === source._id ? "Activating..." : "Set as Active Event"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Meta Info Row */}
                      <div className="p-3 bg-[#050505]/50 border border-[#1D2A22]/70 rounded-xl flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[#8A938D]">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[11px] text-[#00FF66]/80 hover:text-[#00FF66] hover:underline flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                          {source.spreadsheetId.slice(0, 18)}...
                        </a>
                        {source.sheetName && (
                          <span className="text-[11px] flex items-center gap-1">
                            <span className="text-[#8A938D] font-bold uppercase text-[9px]">Tab:</span>
                            <strong className="text-[#F5F5F5]">{source.sheetName}</strong>
                          </span>
                        )}
                        {source.lastTestedAt && (
                          <span className="text-[10px] flex items-center gap-1 font-mono">
                            <span className="text-[#8A938D] font-bold uppercase text-[9px]">Tested:</span>
                            {new Date(source.lastTestedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                        {source.lastLoadedAt && (
                          <span className="text-[10px] flex items-center gap-1 font-mono">
                            <span className="text-[#8A938D] font-bold uppercase text-[9px]">Loaded:</span>
                            {new Date(source.lastLoadedAt).toLocaleDateString()} {new Date(source.lastLoadedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                        {source.lastImportStats && source.lastImportStats.totalRows > 0 && (
                          <span className="text-[10px] text-[#8A938D] font-mono flex items-center gap-1 ml-auto">
                            <span className="text-[#00FF66]">+{source.lastImportStats.imported} added</span>
                            <span>·</span>
                            <span className="text-[#F5F5F5]">{source.lastImportStats.updated} updated</span>
                            <span>·</span>
                            <span className="text-[#8A938D]">{source.lastImportStats.skipped} skipped</span>
                          </span>
                        )}
                      </div>

                      {/* Connection Diagnostics Banner */}
                      {testDiagnostics[source._id] ? (
                        testDiagnostics[source._id].status === "success" ? (
                          <div className="p-3.5 bg-[#00FF66]/10 border border-[#00FF66]/30 rounded-xl space-y-2 text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#00FF66] flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                Connection Verified: &quot;{testDiagnostics[source._id].title || "Google Sheet"}&quot;
                              </span>
                              <span className="text-[10px] text-[#00FF66] font-mono font-bold bg-[#00FF66]/15 px-2 py-0.5 rounded">
                                HTTP 200 OK
                              </span>
                            </div>
                            <div className="p-2.5 bg-[#050505]/70 rounded-lg space-y-1 text-[10px] font-mono">
                              <div className="text-[#8A938D]">
                                Spreadsheet ID:{" "}
                                <span className="text-[#F5F5F5] font-semibold">
                                  {testDiagnostics[source._id].maskedSpreadsheetId}
                                </span>
                              </div>
                              <div className="text-[#8A938D]">
                                Worksheets:{" "}
                                <span className="text-[#00FF66]">
                                  {testDiagnostics[source._id].sheets?.join(", ") || "Default"}
                                </span>{" "}
                                (~{testDiagnostics[source._id].totalDataRows || 0} rows)
                              </div>
                              <div className="text-[#8A938D]">
                                Authenticated Service Account:{" "}
                                <span className="text-[#00FF66] font-bold select-all">
                                  {testDiagnostics[source._id].serviceAccountEmail}
                                </span>
                              </div>
                              {testDiagnostics[source._id].projectId && (
                                <div className="text-[#8A938D]">
                                  Google Cloud Project:{" "}
                                  <span className="text-[#F5F5F5] font-semibold">
                                    {testDiagnostics[source._id].projectId}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3.5 bg-[#FF4D4D]/10 border border-[#FF4D4D]/30 rounded-xl space-y-2 text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#FF4D4D] flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-sm">cancel</span>
                                Connection Test Failed
                              </span>
                              <span className="text-[10px] text-[#FF4D4D] font-mono font-bold bg-[#FF4D4D]/20 px-2 py-0.5 rounded">
                                HTTP {testDiagnostics[source._id].httpStatus || 400}
                              </span>
                            </div>
                            <div className="p-2.5 bg-[#050505]/70 rounded-lg space-y-1 text-[10px] font-mono">
                              <div className="text-[#8A938D]">
                                Target Spreadsheet ID:{" "}
                                <span className="text-[#F5F5F5] font-semibold">
                                  {testDiagnostics[source._id].maskedSpreadsheetId}
                                </span>
                              </div>
                              <div className="text-[#8A938D]">
                                Authenticated As:{" "}
                                <span className="text-[#00FF66] font-bold select-all">
                                  {testDiagnostics[source._id].serviceAccountEmail || "None (unauthenticated)"}
                                </span>
                              </div>
                              {testDiagnostics[source._id].projectId && (
                                <div className="text-[#8A938D]">
                                  Google Cloud Project:{" "}
                                  <span className="text-[#F5F5F5] font-semibold">
                                    {testDiagnostics[source._id].projectId}
                                  </span>
                                </div>
                              )}
                              <div className="text-[#FF4D4D] font-semibold pt-0.5">
                                Reason: {testDiagnostics[source._id].exactReason}
                              </div>
                            </div>
                            {testDiagnostics[source._id].guidance && (
                              <p className="text-[10px] text-[#F5F5F5]/90 leading-relaxed bg-[#FF4D4D]/15 p-2 rounded-lg border border-[#FF4D4D]/20 font-medium">
                                <strong className="text-[#00FF66] font-bold">Action Required:</strong>{" "}
                                {testDiagnostics[source._id].guidance}
                              </p>
                            )}
                          </div>
                        )
                      ) : source.lastError ? (
                        <div className="p-3.5 bg-[#FF4D4D]/10 border border-[#FF4D4D]/30 rounded-xl space-y-2 text-[11px]">
                          <div className="flex items-center gap-1.5 text-[#FF4D4D] font-bold">
                            <span className="material-symbols-outlined text-sm">error</span>
                            Last Connection Status: Error
                          </div>
                          <div className="p-2.5 bg-[#050505]/70 rounded-lg text-[10px] font-mono text-[#FF4D4D] leading-relaxed break-words">
                            {source.lastError}
                          </div>
                        </div>
                      ) : null}

                      {/* Actions Toolbar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1D2A22]/50">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/admin/dashboard?eventId=${source._id}`}
                            className="px-3 py-1.5 bg-[#101412] hover:bg-[#1A201D] text-[#8A938D] hover:text-[#00FF66] border border-[#1D2A22] hover:border-[#00FF66]/30 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 group/btn"
                            title={`Open dedicated workspace for ${source.name}`}
                          >
                            <span className="material-symbols-outlined text-[14px] group-hover/btn:translate-x-0.5 transition-transform">
                              launch
                            </span>
                            Workspace
                          </Link>

                          <button
                            onClick={() => handleTestSheet(source)}
                            disabled={isTesting}
                            className="px-3 py-1.5 bg-[#101412] hover:bg-[#1A201D] hover:text-[#00FF66] border border-[#1D2A22] text-[#8A938D] rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 disabled:opacity-50"
                            title="Test Google Sheets API Connection"
                          >
                            <span className={`material-symbols-outlined text-[14px] ${isTesting ? "animate-spin" : ""}`}>
                              {isTesting ? "sync" : "network_check"}
                            </span>
                            {isTesting ? "Testing..." : "Test"}
                          </button>

                          <button
                            onClick={() => handlePreviewSheet(source)}
                            disabled={isPreviewing || isDeactivated}
                            className="px-3 py-1.5 bg-[#101412] hover:bg-[#1A201D] hover:text-[#00FF66] border border-[#1D2A22] text-[#8A938D] rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 disabled:opacity-40"
                            title="Preview spreadsheet rows before importing"
                          >
                            <span className="material-symbols-outlined text-[14px]">visibility</span>
                            {isPreviewing ? "Loading..." : "Preview"}
                          </button>

                          <button
                            onClick={() => handleLoadSheet(source._id, source.name)}
                            disabled={isLoading || isDeactivated}
                            className="px-3.5 py-1.5 bg-[#00FF66]/10 text-[#00FF66] hover:bg-[#00FF66]/20 border border-[#00FF66]/30 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 disabled:opacity-40 shadow-sm"
                            title="Import rows from this sheet into database"
                          >
                            {isLoading ? (
                              <div className="w-3 h-3 border-2 border-[#00FF66]/30 border-t-[#00FF66] rounded-full animate-spin" />
                            ) : (
                              <span className="material-symbols-outlined text-[14px] font-bold">download</span>
                            )}
                            {isLoading ? "Importing..." : "Load Data"}
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditSheet(source)}
                            className="p-1.5 bg-[#101412] hover:bg-[#1A201D] hover:text-[#00FF66] border border-[#1D2A22] text-[#8A938D] rounded-lg text-[10px] transition-colors"
                            title="Edit Spreadsheet Details"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                          </button>

                          <button
                            onClick={() => handleToggleSheetActive(source)}
                            className={`p-1.5 rounded-lg text-[10px] border transition-colors ${
                              source.isActive
                                ? "bg-[#FFB020]/10 hover:bg-[#FFB020]/20 text-[#FFB020] border-[#FFB020]/30"
                                : "bg-[#00FF66]/10 hover:bg-[#00FF66]/20 text-[#00FF66] border-[#00FF66]/30"
                            }`}
                            title={source.isActive ? "Deactivate source" : "Activate source"}
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {source.isActive ? "pause" : "play_arrow"}
                            </span>
                          </button>

                          {!source.isDefault && (
                            <button
                              onClick={() => handleDeleteSheet(source)}
                              disabled={isGloballyActive}
                              className={`p-1.5 border rounded-lg text-[10px] transition-colors ${
                                isGloballyActive
                                  ? "bg-[#1D2A22]/20 border-[#1D2A22] text-[#8A938D]/30 cursor-not-allowed"
                                  : "bg-[#FF4D4D]/10 hover:bg-[#FF4D4D]/20 text-[#FF4D4D] border-[#FF4D4D]/20"
                              }`}
                              title={
                                isGloballyActive
                                  ? "Cannot delete the currently active event. Choose another active event first."
                                  : "Delete source configuration"
                              }
                            >
                              <span className="material-symbols-outlined text-[14px]">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Bottom Grid: System Information & Danger Zone ─────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* ── 7. System Information ───────────────────────────────────────── */}
            <section className="bg-[#101412] p-6 sm:p-7 rounded-2xl border border-[#1D2A22] shadow-xl hover:border-[#1D2A22]/90 transition-all">
              <SectionHeading
                icon="info"
                title="System Information"
                subtitle="Application build, runtime details and engine metadata"
              />
              <div className="bg-[#080B09] border border-[#1D2A22] rounded-2xl p-2 divide-y divide-[#1D2A22]/40">
                <InfoRow label="Application" value="NEXUS Recruitment Engine" />
                <InfoRow
                  label="Version"
                  value={
                    <span className="font-mono text-[#00FF66] font-bold">
                      {settingsLoading ? "—" : settings?.version ?? "v1.0.0"}
                    </span>
                  }
                />
                <InfoRow label="Framework" value="Next.js (App Router)" />
                <InfoRow label="Database Engine" value="MongoDB Atlas" />
                <InfoRow label="Data Pipeline" value="Google Sheets API v4" />
                <InfoRow
                  label="Node Runtime"
                  value={
                    <span className="font-mono text-[#00FF66] font-bold">
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
                        className={`font-bold font-mono px-2 py-0.5 rounded-full text-xs border ${
                          settings?.environment === "Production"
                            ? "bg-[#00FF66]/10 text-[#00FF66] border-[#00FF66]/30"
                            : "bg-[#FFB020]/10 text-[#FFB020] border-[#FFB020]/30"
                        }`}
                      >
                        {settings?.environment ?? "—"}
                      </span>
                    )
                  }
                />
              </div>
            </section>

            {/* ── 8. Danger Zone ──────────────────────────────────────────────── */}
            <section className="border border-[#FF4D4D]/30 bg-[#FF4D4D]/[0.03] rounded-2xl p-6 sm:p-7 shadow-xl">
              <div className="flex items-start gap-3.5 mb-6 pb-4 border-b border-[#FF4D4D]/20">
                <div className="w-10 h-10 rounded-xl bg-[#FF4D4D]/10 flex items-center justify-center flex-shrink-0 border border-[#FF4D4D]/25 shadow-[0_0_12px_rgba(255,77,77,0.15)] text-[#FF4D4D]">
                  <span className="material-symbols-outlined text-[20px] font-bold">warning</span>
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-[#FF4D4D]">Danger Zone</h3>
                  <p className="text-[11px] text-[#8A938D] font-medium tracking-wide mt-0.5">
                    Irreversible client-side actions — proceed with caution
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#080B09] border border-[#1D2A22] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#F5F5F5] uppercase">Local Storage Cache</p>
                      <p className="text-[10px] text-[#8A938D] mt-0.5">Purges cached client tokens, temporary session flags, and state</p>
                    </div>
                    <button
                      onClick={handleClearCache}
                      className="px-3.5 py-2 bg-[#FF4D4D]/10 hover:bg-[#FF4D4D]/20 text-[#FF4D4D] border border-[#FF4D4D]/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                      Clear Cache
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#080B09] border border-[#1D2A22] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#F5F5F5] uppercase">Application Reload</p>
                      <p className="text-[10px] text-[#8A938D] mt-0.5">Performs a hard window refresh, re-initializing all client contexts</p>
                    </div>
                    <button
                      onClick={handleReload}
                      className="px-3.5 py-2 bg-[#FF4D4D]/10 hover:bg-[#FF4D4D]/20 text-[#FF4D4D] border border-[#FF4D4D]/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                      Reload App
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-[#FF4D4D]/70 mt-5 uppercase font-bold tracking-wider text-center">
                These actions only affect your local browser session. No database records are deleted.
              </p>
            </section>
          </div>

        </div>{/* /Canvas */}
      </main>

      {/* Add Interviewer Modal */}
      {showAddInterviewerModal && (
        <div className="fixed inset-0 z-50 bg-[#050505]/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#0F1411] border border-[#1D2A22] hover:border-[#00FF66]/40 rounded-2xl p-6 sm:p-8 w-[min(540px,calc(100vw-32px))] max-w-[540px] min-w-0 max-h-[calc(100vh-32px)] overflow-y-auto shadow-2xl relative space-y-6 animate-in zoom-in-95 duration-200 transition-all">
            <div className="flex items-center justify-between border-b border-[#1D2A22] pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#00FF66]/10 border border-[#00FF66]/25 flex items-center justify-center text-[#00FF66] flex-shrink-0">
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
                className="text-[#8A938D] hover:text-[#F5F5F5] hover:bg-[#1D2A22]/50 transition-colors p-1.5 rounded-xl flex-shrink-0"
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
                  className="w-full bg-[#050505] border border-[#1D2A22] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#00FF66] focus:ring-1 focus:ring-[#00FF66] transition-colors font-bold uppercase tracking-wider placeholder:text-[#8A938D]/40 h-10"
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
                  className="w-full sm:w-auto px-4 py-2 bg-[#101412] hover:bg-[#1A201D] border border-[#1D2A22] text-[#8A938D] hover:text-[#F5F5F5] rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 text-center h-10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingInterviewer}
                  className="w-full sm:w-auto px-5 py-2 bg-[#00FF66] text-[#050505] hover:bg-[#00E55C] rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(0,255,102,0.3)] disabled:opacity-50 h-10"
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

      {/* Add / Edit Spreadsheet Modal */}
      {showSheetModal && (
        <div className="fixed inset-0 z-50 bg-[#050505]/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#0F1411] border border-[#1D2A22] hover:border-[#00FF66]/40 rounded-2xl p-6 sm:p-8 w-[min(560px,calc(100vw-32px))] max-w-[560px] min-w-0 max-h-[calc(100vh-32px)] overflow-y-auto shadow-2xl relative space-y-5 animate-in zoom-in-95 duration-200 transition-all">
            <div className="flex items-center justify-between border-b border-[#1D2A22] pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#00FF66]/10 border border-[#00FF66]/25 flex items-center justify-center text-[#00FF66] flex-shrink-0">
                  <span className="material-symbols-outlined text-[18px]">table_view</span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black uppercase tracking-wider text-[#F5F5F5] truncate">
                    {editingSheet ? "Edit Spreadsheet Source" : "Add Spreadsheet Source"}
                  </h3>
                  <p className="text-[10px] text-[#8A938D] font-bold uppercase tracking-wider truncate">
                    Configure Google Sheets URL &amp; Worksheet
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSheetModal(false)}
                className="text-[#8A938D] hover:text-[#F5F5F5] hover:bg-[#1D2A22]/50 transition-colors p-1.5 rounded-xl flex-shrink-0"
              >
                <span className="material-symbols-outlined text-sm font-bold">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveSheet} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] text-[#8A938D] font-black uppercase tracking-wider block">
                  Source Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={sheetFormName}
                  onChange={(e) => setSheetFormName(e.target.value)}
                  placeholder="e.g. Round 2 Late Registrations"
                  className="w-full bg-[#050505] border border-[#1D2A22] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#00FF66] focus:ring-1 focus:ring-[#00FF66] transition-colors font-bold uppercase tracking-wider placeholder:text-[#8A938D]/40 h-10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] text-[#8A938D] font-black uppercase tracking-wider block">
                  Google Sheets URL or Spreadsheet ID *
                </label>
                <input
                  type="text"
                  required
                  value={sheetFormUrl}
                  onChange={(e) => setSheetFormUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs.../edit"
                  className="w-full bg-[#050505] border border-[#1D2A22] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#00FF66] focus:ring-1 focus:ring-[#00FF66] transition-colors font-mono placeholder:text-[#8A938D]/40 text-[11px] h-10"
                />
                <p className="text-[10px] text-[#8A938D]/80 font-medium tracking-wide leading-relaxed">
                  Paste the full browser URL or the 44-character Spreadsheet ID. Make sure to share the sheet with the Service Account.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-[9px] text-[#8A938D] font-black uppercase tracking-wider block">
                    Worksheet Tab (Optional)
                  </label>
                  <input
                    type="text"
                    value={sheetFormTab}
                    onChange={(e) => setSheetFormTab(e.target.value)}
                    placeholder="e.g. Form Responses 1"
                    className="w-full bg-[#050505] border border-[#1D2A22] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#00FF66] focus:ring-1 focus:ring-[#00FF66] transition-colors placeholder:text-[#8A938D]/40 h-10"
                  />
                  <span className="text-[9px] text-[#8A938D]/70 block font-mono">Leave blank for first tab</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] text-[#8A938D] font-black uppercase tracking-wider block">
                    Range (Optional)
                  </label>
                  <input
                    type="text"
                    value={sheetFormRange}
                    onChange={(e) => setSheetFormRange(e.target.value)}
                    placeholder="e.g. A:Z"
                    className="w-full bg-[#050505] border border-[#1D2A22] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#00FF66] focus:ring-1 focus:ring-[#00FF66] transition-colors placeholder:text-[#8A938D]/40 font-mono h-10"
                  />
                  <span className="text-[9px] text-[#8A938D]/70 block font-mono">Default covers all columns</span>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-3 border-t border-[#1D2A22]">
                <button
                  type="button"
                  onClick={() => setShowSheetModal(false)}
                  disabled={isSavingSheet}
                  className="w-full sm:w-auto px-4 py-2 bg-[#101412] hover:bg-[#1A201D] border border-[#1D2A22] text-[#8A938D] hover:text-[#F5F5F5] rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 text-center h-10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSheet}
                  className="w-full sm:w-auto px-5 py-2 bg-[#00FF66] text-[#050505] hover:bg-[#00E55C] rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(0,255,102,0.3)] disabled:opacity-50 h-10"
                >
                  {isSavingSheet ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-[#050505]/30 border-t-[#050505] rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      {editingSheet ? "Save Changes" : "Add Spreadsheet"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Data Modal */}
      {previewData && (
        <div className="fixed inset-0 z-50 bg-[#050505]/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#0F1411] border border-[#1D2A22] hover:border-[#00FF66]/40 rounded-2xl p-6 sm:p-8 w-[min(940px,calc(100vw-32px))] max-w-[940px] min-w-0 max-h-[calc(100vh-32px)] overflow-y-auto shadow-2xl relative space-y-5 animate-in zoom-in-95 duration-200 transition-all">
            <div className="flex items-center justify-between border-b border-[#1D2A22] pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#00FF66]/10 border border-[#00FF66]/25 flex items-center justify-center text-[#00FF66] flex-shrink-0">
                  <span className="material-symbols-outlined text-[18px]">preview</span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black uppercase tracking-wider text-[#F5F5F5] truncate">
                    Preview: {previewData.sourceName}
                  </h3>
                  <p className="text-[10px] text-[#8A938D] font-bold uppercase tracking-wider truncate">
                    Sheet: &ldquo;{previewData.title}&rdquo; · Tab: &ldquo;{previewData.sheetName}&rdquo; · {previewData.totalRows} Total Rows
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewData(null)}
                className="text-[#8A938D] hover:text-[#F5F5F5] hover:bg-[#1D2A22]/50 transition-colors p-1.5 rounded-xl flex-shrink-0"
              >
                <span className="material-symbols-outlined text-sm font-bold">close</span>
              </button>
            </div>

            {/* Detected Column Mappings Overview */}
            <div className="bg-[#080B09] border border-[#1D2A22] rounded-xl p-4 space-y-2">
              <p className="text-[9px] font-black uppercase tracking-wider text-[#8A938D]">
                Detected Field Mappings
              </p>
              <div className="flex flex-wrap gap-2 text-[10px]">
                {Object.entries(previewData.detectedMappings).map(([field, mappedHeader]) => (
                  <span
                    key={field}
                    className="px-2.5 py-1 rounded-lg bg-[#101412] border border-[#1D2A22] text-[#F5F5F5] flex items-center gap-1.5"
                  >
                    <span className="text-[#8A938D] font-bold uppercase">{field}:</span>
                    <strong className="text-[#00FF66] font-mono">{mappedHeader}</strong>
                  </span>
                ))}
              </div>
            </div>

            {/* Table Preview */}
            <div className="border border-[#1D2A22] rounded-xl overflow-hidden bg-[#050505]">
              <div className="max-h-[320px] overflow-auto custom-scrollbar">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#080B09] sticky top-0 border-b border-[#1D2A22] z-10">
                    <tr>
                      <th className="p-2.5 text-[9px] font-black text-[#8A938D] uppercase tracking-wider border-r border-[#1D2A22] w-12 text-center">
                        #
                      </th>
                      {previewData.headers.map((h, i) => (
                        <th
                          key={i}
                          className="p-2.5 text-[10px] font-bold text-[#00FF66] uppercase tracking-wider whitespace-nowrap border-r border-[#1D2A22]"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1D2A22]/50">
                    {previewData.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#101412] transition-colors">
                        <td className="p-2 text-center font-mono text-[10px] text-[#8A938D] border-r border-[#1D2A22]">
                          {idx + 1}
                        </td>
                        {previewData.headers.map((header, colIdx) => (
                          <td
                            key={colIdx}
                            className="p-2 text-[11px] text-[#F5F5F5] whitespace-nowrap border-r border-[#1D2A22] max-w-[200px] truncate font-mono"
                            title={row[header]}
                          >
                            {row[header] || <span className="text-[#8A938D]/40">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[#1D2A22]">
              <p className="text-[10px] text-[#8A938D]">
                Showing first {previewData.previewCount} of {previewData.totalRows} data rows.
              </p>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setPreviewData(null)}
                  className="px-4 py-2 bg-[#101412] hover:bg-[#1A201D] border border-[#1D2A22] text-[#8A938D] hover:text-[#F5F5F5] rounded-xl text-xs font-bold uppercase tracking-wider transition-colors text-center h-10"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSheet(previewData.sourceId, previewData.sourceName)}
                  disabled={loadingSheetId === previewData.sourceId}
                  className="px-5 py-2 bg-[#00FF66] text-[#050505] hover:bg-[#00E55C] rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(0,255,102,0.3)] disabled:opacity-50 h-10"
                >
                  {loadingSheetId === previewData.sourceId ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-[#050505]/30 border-t-[#050505] rounded-full animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px] font-bold">download</span>
                      Load Data Now
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast ────────────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl flex items-start gap-3.5 shadow-2xl border bg-[#0F1411]/95 backdrop-blur-md w-auto max-w-[400px] animate-in slide-in-from-bottom-3 duration-200 ${
            toast.type === "success" ? "border-[#00FF66]/40 text-[#00FF66] shadow-[0_0_20px_rgba(0,255,102,0.15)]" : "border-[#FF4D4D]/40 text-[#FF4D4D] shadow-[0_0_20px_rgba(255,77,77,0.15)]"
          }`}
        >
          <span className="material-symbols-outlined mt-0.5 flex-shrink-0 text-[20px]">
            {toast.type === "success" ? "check_circle" : "error"}
          </span>
          <p className="font-body-md text-[#F5F5F5] text-xs font-bold uppercase tracking-wider flex-1">{toast.message}</p>
          <button
            onClick={() => setToast(null)}
            className="text-[#8A938D] hover:text-[#F5F5F5] ml-2 flex-shrink-0 p-1"
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
