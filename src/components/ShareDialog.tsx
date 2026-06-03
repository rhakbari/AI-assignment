"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/client";
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
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Share document</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Close">
            ✕
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
                  className="rounded-md px-2 py-1 text-xs text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  Remove
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
