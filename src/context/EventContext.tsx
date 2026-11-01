"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, Suspense } from "react";
import { useSearchParams } from "next/navigation";

export interface EventSource {
  _id: string;
  name: string;
  spreadsheetId: string;
  url: string;
  sheetName?: string;
  isActive: boolean;
  status: "Connected" | "Error" | "Never Tested";
  applicantCount?: number;
  isDefault?: boolean;
  isGloballyActive?: boolean;
}

interface EventContextType {
  activeEventId: string | null;
  activeEvent: EventSource | null;
  eventId: string | null;
  isEventWorkspace: boolean;
  currentEvent: EventSource | null;
  events: EventSource[];
  loading: boolean;
  setActiveEvent: (id: string) => Promise<boolean>;
  refreshEvents: () => Promise<void>;
  buildUrl: (path: string) => string;
}

const EventContext = createContext<EventContextType>({
  activeEventId: null,
  activeEvent: null,
  eventId: null,
  isEventWorkspace: false,
  currentEvent: null,
  events: [],
  loading: false,
  setActiveEvent: async () => false,
  refreshEvents: async () => {},
  buildUrl: (path) => path,
});

function EventProviderInner({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const urlEventId = searchParams?.get("eventId") || null;
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventSource[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sheets");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          if (json.sources) setEvents(json.sources);
          if (json.activeEventId) setActiveEventId(json.activeEventId);
        }
      } else {
        // Fallback for non-admin sessions (e.g. interviewer)
        const resActive = await fetch("/api/active-event");
        const jsonActive = await resActive.json();
        if (jsonActive.success) {
          if (jsonActive.activeEventId) setActiveEventId(jsonActive.activeEventId);
          if (jsonActive.event) setEvents([jsonActive.event]);
        }
      }
    } catch (err) {
      console.error("[EventContext] Error fetching events:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const setActiveEvent = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const res = await fetch("/api/admin/sheets/active", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId: id }),
        });
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || "Failed to set active event");
        }
        setActiveEventId(id);
        await fetchEvents();
        return true;
      } catch (err: any) {
        console.error("[EventContext] Error setting active event:", err);
        throw err;
      }
    },
    [fetchEvents]
  );

  const activeEvent = activeEventId
    ? events.find((e) => e._id === activeEventId) || null
    : null;

  // If a specific eventId is in URL that differs from active, consider it an explicit workspace view
  const isExplicitUrlWorkspace = Boolean(urlEventId && urlEventId !== activeEventId && urlEventId !== "all");
  const effectiveEventId = urlEventId || activeEventId;
  const currentEvent = effectiveEventId
    ? events.find((e) => e._id === effectiveEventId) || activeEvent
    : null;

  const buildUrl = useCallback(
    (path: string) => {
      // If there's an explicit URL override, propagate it; otherwise clean URLs are preferred
      if (!urlEventId) return path;
      const separator = path.includes("?") ? "&" : "?";
      return `${path}${separator}eventId=${encodeURIComponent(urlEventId)}`;
    },
    [urlEventId]
  );

  return (
    <EventContext.Provider
      value={{
        activeEventId,
        activeEvent,
        eventId: effectiveEventId,
        isEventWorkspace: isExplicitUrlWorkspace,
        currentEvent,
        events,
        loading,
        setActiveEvent,
        refreshEvents: fetchEvents,
        buildUrl,
      }}
    >
      {children}
    </EventContext.Provider>
  );
}

export function EventProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <EventProviderInner>{children}</EventProviderInner>
    </Suspense>
  );
}

export function useEvent(): EventContextType {
  return useContext(EventContext);
}
