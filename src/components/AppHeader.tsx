"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, LogOut } from "lucide-react";
import { api } from "@/lib/client";
import { Toaster } from "./Toast";

export default function AppHeader({
  user,
  children,
}: {
  user: { name: string; email: string };
  children?: React.ReactNode;
}) {
  const router = useRouter();

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <header className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link href="/documents" className="flex items-center gap-2 font-bold text-slate-900">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <FileText size={17} />
            </span>
            <span className="hidden sm:inline">Collab Docs</span>
          </Link>

          <div className="flex-1">{children}</div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold leading-tight text-slate-800">{user.name}</div>
              <div className="text-xs leading-tight text-slate-400">{user.email}</div>
            </div>
            <span
              title={user.name}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700"
            >
              {initials}
            </span>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>
      <Toaster />
    </>
  );
}
