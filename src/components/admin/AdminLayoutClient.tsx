"use client";

import React from "react";
import { EventProvider } from "@/context/EventContext";

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <EventProvider>
      {children}
    </EventProvider>
  );
}

