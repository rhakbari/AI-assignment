"use client";

import { useState } from "react";
import { X, Share2, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/client";
import { toast } from "./Toast";
import type { ShareEntry } from "./DocumentEditor";

type ShareRole = ShareEntry["role"];

export default function ShareDialog({
  docId,
  ownerEmail,
  initialShares,
  onClose,
  onChange,
}: {
  docId: string;
  ownerEmail: string;
  initialShares: ShareEntry[];
  onClose: () => void;
  onChange: (count: number) => void;
}) {
  const [shares, setShares] = useState<ShareEntry[]>(initialShares);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("VIEWER");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function sync(next: ShareEntry[]) {
    setShares(next);
    onChange(next.length);
  }

  async function addShare(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const entry = await api<ShareEntry>(`/api/documents/${docId}/share`, {
        method: "POST",
        json: { email, role },
      });
      const next = [...shares.filter((s) => s.userId !== entry.userId), entry];
      sync(next);
      setEmail("");
      toast(`Shared with ${entry.name} (${entry.role.toLowerCase()})`, "success");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not share");
    } finally {
      setBusy(false);
    }
  }

  async function updateRole(entry: ShareEntry, newRole: ShareRole) {
    setError(null);
    try {
      await api(`/api/documents/${docId}/share`, {
        method: "POST",
        json: { email: entry.email, role: newRole },
      });
      sync(shares.map((s) => (s.userId === entry.userId ? { ...s, role: newRole } : s)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update role");
    }
  }

  async function revoke(entry: ShareEntry) {
    setError(null);
    try {
      await api(`/api/documents/${docId}/share?userId=${entry.userId}`, { method: "DELETE" });
      sync(shares.filter((s) => s.userId !== entry.userId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove access");
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="animate-toast w-full max-w-md rounded-2xl bg-white p-6 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Share2 size={18} className="text-brand-600" /> Share document
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 transition hover:text-slate-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={addShare} className="mb-4 flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@ajaia.dev"
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as ShareRole)}
            className="rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-brand-500 focus:outline-none"
          >
            <option value="VIEWER">Viewer</option>
            <option value="COMMENTER">Commenter</option>
            <option value="EDITOR">Editor</option>
          </select>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            Share
          </button>
        </form>

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="space-y-1">
          <div className="flex items-center justify-between px-1 py-1.5 text-sm">
            <span className="text-gray-700">{ownerEmail}</span>
            <span className="text-xs font-medium text-gray-400">Owner</span>
          </div>
          {shares.length === 0 && (
            <p className="px-1 py-2 text-sm text-gray-400">Not shared with anyone yet.</p>
          )}
          {shares.map((s) => (
            <div key={s.userId} className="flex items-center justify-between gap-2 px-1 py-1.5">
              <div className="min-w-0">
                <div className="truncate text-sm text-gray-800">{s.name}</div>
                <div className="truncate text-xs text-gray-400">{s.email}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <select
                  value={s.role}
                  onChange={(e) => updateRole(s, e.target.value as ShareRole)}
                  className="rounded-md border border-gray-200 px-1.5 py-1 text-xs text-gray-700"
                >
                  <option value="VIEWER">Viewer</option>
                  <option value="COMMENTER">Commenter</option>
                  <option value="EDITOR">Editor</option>
                </select>
                <button
                  onClick={() => revoke(s)}
                  title="Remove access"
                  aria-label={`Remove ${s.name}`}
                  className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-gray-400">
          Tip: seeded teammates are <strong>bob@ajaia.dev</strong> and <strong>carol@ajaia.dev</strong>.
        </p>
      </div>
    </div>
  );
}
