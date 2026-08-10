"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

interface LogoutButtonProps {
  className?: string;
}

export default function LogoutButton({ className }: LogoutButtonProps) {
  const { signOut } = useClerk();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirectUrl: "/login" });
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={
        className ??
        "flex items-center gap-md px-md py-sm text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors w-full"
      }
    >
      <span className="material-symbols-outlined">logout</span>
      <span className="font-label-md text-label-md">Logout</span>
    </button>
  );
}
