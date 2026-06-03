"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/client";

interface Version {
  id: string;
  title: string;
  author: string;
  createdAt: string;
}

export default function VersionHistory({
  docId,
  onRestored,
  onClose,
}: {
  docId: string;
  onRestored: (updated: { title: string; content: string }) => void;
  onClose: () => void;
}) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setVersions(await api<Version[]>(`/api/documents/${docId}/versions`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveVersion() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/documents/${docId}/versions`, { method: "POST", json: {} });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save version");
    } finally {
      setBusy(false);
    }
  }

  async function restore(id: string) {
    if (!confirm("Restore this version? Your current content is saved as a new version first.")) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api<{ title: string; content: string }>(
        `/api/documents/${docId}/versions/${id}/restore`,
        { method: "POST", json: {} },
      );
      onRestored(updated);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not restore version");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="no-print mb-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Version history</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={saveVersion}
            disabled={busy}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            Save current version
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Close history">
            ✕
          </button>
        </div>
      </div>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : versions.length === 0 ? (
        <p className="text-sm text-gray-400">
          No saved versions yet. Click “Save current version” to snapshot this document.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {versions.map((v) => (
            <li key={v.id} className="flex items-center justify-between py-2">
              <div className="min-w-0">
                <div className="truncate text-sm text-gray-800">{v.title}</div>
                <div className="text-xs text-gray-400">
                  {v.author} · {new Date(v.createdAt).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => restore(v.id)}
                disabled={busy}
                className="shrink-0 rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Restore
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
