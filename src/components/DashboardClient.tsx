"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError, upload } from "@/lib/client";

interface DocItem {
  id: string;
  title: string;
  updatedAt: string;
  isOwner: boolean;
  role: "OWNER" | "EDITOR" | "COMMENTER" | "VIEWER";
  owner: { name: string; email: string };
}

const ACCEPTED = ".txt,.md,.markdown,.docx";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function RoleBadge({ role }: { role: DocItem["role"] }) {
  const map = {
    OWNER: { label: "Owner", cls: "bg-brand-50 text-brand-700" },
    EDITOR: { label: "Can edit", cls: "bg-emerald-50 text-emerald-700" },
    COMMENTER: { label: "Can comment", cls: "bg-amber-50 text-amber-700" },
    VIEWER: { label: "View only", cls: "bg-gray-100 text-gray-600" },
  } as const;
  const { label, cls } = map[role];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

export default function DashboardClient() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [owned, setOwned] = useState<DocItem[]>([]);
  const [shared, setShared] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ owned: DocItem[]; shared: DocItem[] }>("/api/documents");
      setOwned(data.owned);
      setShared(data.shared);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createDoc() {
    setBusy(true);
    setError(null);
    try {
      const doc = await api<{ id: string }>("/api/documents", { method: "POST", json: {} });
      router.push(`/documents/${doc.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create document");
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-uploading the same file
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const doc = await upload<{ id: string }>("/api/upload", fd);
      router.push(`/documents/${doc.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
      setBusy(false);
    }
  }

  async function deleteDoc(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await api(`/api/documents/${id}`, { method: "DELETE" });
      setOwned((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">Documents</h1>
        <div className="flex gap-2">
          <button
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
          >
            Upload file
          </button>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPTED}
            onChange={onFile}
            className="hidden"
          />
          <button
            onClick={createDoc}
            disabled={busy}
            className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            + New document
          </button>
        </div>
      </div>

      <p className="mb-6 text-xs text-gray-400">
        Upload supports <span className="font-medium text-gray-500">.txt, .md, .docx</span> (max 5 MB) —
        each becomes a new editable document.
      </p>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="space-y-8">
          <Section title="My documents" empty="You have no documents yet. Create one or upload a file.">
            {owned.map((d) => (
              <DocCard key={d.id} doc={d} onDelete={() => deleteDoc(d.id, d.title)} />
            ))}
          </Section>

          <Section title="Shared with me" empty="Nothing has been shared with you yet.">
            {shared.map((d) => (
              <DocCard key={d.id} doc={d} />
            ))}
          </Section>
        </div>
      )}
    </div>
  );

  function Section({
    title,
    empty,
    children,
  }: {
    title: string;
    empty: string;
    children: React.ReactNode;
  }) {
    const items = Array.isArray(children) ? children : [children];
    const hasItems = items.some(Boolean) && items.length > 0;
    return (
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
        {hasItems ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
        ) : (
          <p className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-400">
            {empty}
          </p>
        )}
      </section>
    );
  }
}

function DocCard({ doc, onDelete }: { doc: DocItem; onDelete?: () => void }) {
  return (
    <div className="group relative rounded-xl border border-gray-200 bg-white p-4 transition hover:border-brand-500 hover:shadow-sm">
      <Link href={`/documents/${doc.id}`} className="block">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 font-semibold text-gray-900">{doc.title || "Untitled document"}</h3>
          <RoleBadge role={doc.role} />
        </div>
        <p className="text-xs text-gray-400">
          {doc.isOwner ? "You" : doc.owner.name} · {formatDate(doc.updatedAt)}
        </p>
      </Link>
      {onDelete && (
        <button
          onClick={onDelete}
          title="Delete document"
          className="absolute bottom-3 right-3 rounded-md px-2 py-1 text-xs text-gray-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
        >
          Delete
        </button>
      )}
    </div>
  );
}
