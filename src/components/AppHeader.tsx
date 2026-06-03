"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

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
    <header className="no-print sticky top-0 z-20 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
        <Link href="/documents" className="flex items-center gap-2 font-bold text-gray-900">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-sm text-white">
            D
          </span>
          Collab Docs
        </Link>

        <div className="flex-1">{children}</div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <div className="text-sm font-medium leading-tight text-gray-800">{user.name}</div>
            <div className="text-xs leading-tight text-gray-400">{user.email}</div>
          </div>
          <span
            title={user.name}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700"
          >
            {initials}
          </span>
          <button
            onClick={logout}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
