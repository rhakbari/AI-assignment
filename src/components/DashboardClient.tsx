"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Upload, FileText, Trash2, FolderOpen, Inbox } from "lucide-react";
import { api, ApiError, upload } from "@/lib/client";
import { toast } from "./Toast";

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
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function RoleBadge({ role }: { role: DocItem["role"] }) {
  const map = {
    OWNER: { label: "Owner", cls: "bg-brand-50 text-brand-700" },
    EDITOR: { label: "Can edit", cls: "bg-emerald-50 text-emerald-700" },
    COMMENTER: { label: "Can comment", cls: "bg-amber-50 text-amber-700" },
    VIEWER: { label: "View only", cls: "bg-slate-100 text-slate-600" },
  } as const;
  const { label, cls } = map[role];
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

export default function DashboardClient() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [owned, setOwned] = useState<DocItem[]>([]);
  const [shared, setShared] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ owned: DocItem[]; shared: DocItem[] }>("/api/documents");
      setOwned(data.owned);
      setShared(data.shared);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Failed to load documents", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createDoc() {
    setBusy(true);
    try {
      const doc = await api<{ id: string }>("/api/documents", { method: "POST", json: {} });
      router.push(`/documents/${doc.id}`);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Failed to create document", "error");
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const doc = await upload<{ id: string }>("/api/upload", fd);
      router.push(`/documents/${doc.id}`);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Upload failed", "error");
      setBusy(false);
    }
  }

  async function deleteDoc(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await api(`/api/documents/${id}`, { method: "DELETE" });
      setOwned((prev) => prev.filter((d) => d.id !== id));
      toast("Document deleted", "success");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Delete failed", "error");
    }
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Documents</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create, import, and collaborate on documents.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <Upload size={16} /> Upload file
          </button>
          <input ref={fileInput} type="file" accept={ACCEPTED} onChange={onFile} className="hidden" />
          <button
            onClick={createDoc}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            <Plus size={16} /> New document
          </button>
        </div>
      </div>

      <p className="mb-8 text-xs text-slate-400">
        Upload supports <span className="font-medium text-slate-500">.txt, .md, .docx</span> (max 5 MB) — each
        becomes a new editable document.
      </p>

      {loading ? (
        <SkeletonGrid />
      ) : (
        <div className="space-y-10">
          <Section title="My documents" icon={<FolderOpen size={15} />}>
            {owned.length > 0 ? (
              <Grid>
                {owned.map((d) => (
                  <DocCard key={d.id} doc={d} onDelete={() => deleteDoc(d.id, d.title)} />
                ))}
              </Grid>
            ) : (
              <Empty text="No documents yet. Create one or upload a file to get started." />
            )}
          </Section>

          <Section title="Shared with me" icon={<Inbox size={15} />}>
            {shared.length > 0 ? (
              <Grid>
                {shared.map((d) => (
                  <DocCard key={d.id} doc={d} />
                ))}
              </Grid>
            ) : (
              <Empty text="Nothing has been shared with you yet." />
            )}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
      {text}
    </p>
  );
}

function SkeletonGrid() {
  return (
    <div className="space-y-10">
      {[0, 1].map((s) => (
        <div key={s}>
          <div className="mb-3 h-4 w-32 animate-pulse rounded bg-slate-200" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DocCard({ doc, onDelete }: { doc: DocItem; onDelete?: () => void }) {
  return (
    <div className="group relative rounded-xl border border-slate-200 bg-white p-4 shadow-card transition hover:border-brand-500 hover:shadow-pop">
      <Link href={`/documents/${doc.id}`} className="block">
        <div className="mb-3 flex items-start justify-between gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <FileText size={18} />
          </span>
          <RoleBadge role={doc.role} />
        </div>
        <h3 className="mb-1 line-clamp-2 font-semibold text-slate-900">{doc.title || "Untitled document"}</h3>
        <p className="text-xs text-slate-400">
          {doc.isOwner ? "You" : doc.owner.name} · {formatDate(doc.updatedAt)}
        </p>
      </Link>
      {onDelete && (
        <button
          onClick={onDelete}
          title="Delete document"
          aria-label={`Delete ${doc.title}`}
          className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
