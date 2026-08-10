import Link from "next/link";
import { Users, LayoutDashboard, Search, LogOut } from "lucide-react";

export function Sidebar({ role }: { role: "Admin" | "Interviewer" }) {
  return (
    <aside className="w-64 h-screen border-r border-outline-variant/20 bg-surface-container flex flex-col">
      <div className="p-6 flex items-center gap-3">
        <span className="text-2xl filter drop-shadow-[0_0_15px_rgba(180,197,255,0.6)]">🚀</span>
        <h1 className="font-headline-md text-primary tracking-tighter">NEXUS</h1>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {role === "Admin" && (
          <>
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-primary hover:bg-surface-variant rounded-xl transition-colors"
            >
              <LayoutDashboard size={20} />
              <span className="font-label-md">Dashboard</span>
            </Link>
          </>
        )}

        {role === "Interviewer" && (
          <>
            <Link
              href="/interviewer/search"
              className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-primary hover:bg-surface-variant rounded-xl transition-colors"
            >
              <Search size={20} />
              <span className="font-label-md">Search</span>
            </Link>
            <Link
              href="/interviewer/workspace"
              className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:text-primary hover:bg-surface-variant rounded-xl transition-colors"
            >
              <Users size={20} />
              <span className="font-label-md">Workspace</span>
            </Link>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-outline-variant/20">
        <button className="flex w-full items-center gap-3 px-4 py-3 text-error hover:bg-error/10 rounded-xl transition-colors">
          <LogOut size={20} />
          <span className="font-label-md">Logout</span>
        </button>
      </div>
    </aside>
  );
}
