"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";

interface ActiveUser {
  userId: string;
  name: string;
  role: "OWNER" | "EDITOR" | "COMMENTER" | "VIEWER" | null;
  isSelf: boolean;
}

const PALETTE = ["#3b6cf6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#0ea5e9", "#ec4899"];
function colorFor(id: string): string {
  let sum = 0;
  for (const ch of id) sum += ch.charCodeAt(0);
  return PALETTE[sum % PALETTE.length];
}
function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
const ROLE_VERB: Record<string, string> = {
  OWNER: "owner",
  EDITOR: "editing",
  COMMENTER: "commenting",
  VIEWER: "viewing",
};

/**
 * Real-time presence indicator. Sends a heartbeat and polls active collaborators
 * every 5s (polling keeps it serverless-friendly). Reports the document's server
 * updatedAt to the parent so it can flag changes made by other editors.
 */
export default function PresenceBar({
  docId,
  onUpdatedAt,
}: {
  docId: string;
  onUpdatedAt: (iso: string) => void;
}) {
  const [active, setActive] = useState<ActiveUser[]>([]);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        await api(`/api/documents/${docId}/presence`, { method: "POST" }); // heartbeat
        const data = await api<{ updatedAt: string; active: ActiveUser[] }>(
          `/api/documents/${docId}/presence`,
        );
        if (!alive) return;
        setActive(data.active);
        onUpdatedAt(data.updatedAt);
      } catch {
        /* transient network errors are fine; next tick retries */
      }
    };
    tick();
    const iv = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [docId, onUpdatedAt]);

  const others = active.filter((a) => !a.isSelf);

  return (
    <div className="no-print flex items-center gap-2">
      <div className="flex -space-x-2">
        {active.slice(0, 5).map((u) => (
          <span
            key={u.userId}
            title={`${u.name}${u.isSelf ? " (you)" : ""} · ${ROLE_VERB[u.role ?? "VIEWER"]}`}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold text-white ring-1 ring-black/5"
            style={{ backgroundColor: colorFor(u.userId) }}
          >
            {initials(u.name)}
          </span>
        ))}
      </div>
      <span className="hidden text-xs text-gray-400 sm:inline">
        {others.length === 0
          ? "Only you here"
          : `${others.length} other${others.length > 1 ? "s" : ""} here`}
      </span>
    </div>
  );
}
