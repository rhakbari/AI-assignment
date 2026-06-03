"use client";

import { useCallback, useEffect, useState } from "react";
import { X, MessageSquare, Paperclip } from "lucide-react";
import { api, ApiError } from "@/lib/client";
import { toast } from "./Toast";

interface Comment {
  id: string;
  body: string;
  quote: string | null;
  resolved: boolean;
  authorId: string;
  author: string;
  createdAt: string;
}

export default function CommentsPanel({
  docId,
  currentUserId,
  canComment,
  isOwner,
  getSelectionQuote,
  onCountChange,
  onClose,
}: {
  docId: string;
  currentUserId: string;
  canComment: boolean;
  isOwner: boolean;
  getSelectionQuote: () => string;
  onCountChange?: (openCount: number) => void;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [quote, setQuote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<Comment[]>(`/api/documents/${docId}/comments`);
      setComments(data);
      onCountChange?.(data.filter((c) => !c.resolved).length);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load comments");
    }
  }, [docId, onCountChange]);

  // Initial load + light polling so collaborators' comments show up live.
  useEffect(() => {
    load();
    const iv = setInterval(load, 7000);
    return () => clearInterval(iv);
  }, [load]);

  function attachSelection() {
    setQuote(getSelectionQuote());
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/documents/${docId}/comments`, {
        method: "POST",
        json: { body, quote: quote || undefined },
      });
      setBody("");
      setQuote("");
      await load();
      toast("Comment added", "success");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add comment");
    } finally {
      setBusy(false);
    }
  }

  async function toggleResolved(c: Comment) {
    try {
      await api(`/api/documents/${docId}/comments/${c.id}`, {
        method: "PATCH",
        json: { resolved: !c.resolved },
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update comment");
    }
  }

  async function remove(c: Comment) {
    if (!confirm("Delete this comment?")) return;
    try {
      await api(`/api/documents/${docId}/comments/${c.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete comment");
    }
  }

  const open = comments.filter((c) => !c.resolved);
  const resolved = comments.filter((c) => c.resolved);

  return (
    <aside className="no-print flex w-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:w-80">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
          <MessageSquare size={15} className="text-brand-600" /> Comments
        </h3>
        <button
          onClick={onClose}
          className="text-slate-400 transition hover:text-slate-700"
          aria-label="Close comments"
        >
          <X size={16} />
        </button>
      </div>

      {canComment ? (
        <form onSubmit={add} className="mb-4">
          {quote && (
            <div className="mb-1 flex items-start gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800">
              <span className="truncate">“{quote}”</span>
              <button
                type="button"
                onClick={() => setQuote("")}
                className="ml-auto text-amber-500 transition hover:text-amber-700"
                aria-label="Remove quote"
              >
                <X size={13} />
              </button>
            </div>
          )}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment…"
            rows={2}
            className="w-full resize-y rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
          />
          <div className="mt-1 flex items-center justify-between">
            <button
              type="button"
              onClick={attachSelection}
              className="inline-flex items-center gap-1 text-xs text-slate-500 transition hover:text-slate-800"
              title="Attach the text currently selected in the document"
            >
              <Paperclip size={13} /> Attach selection
            </button>
            <button
              type="submit"
              disabled={busy || !body.trim()}
              className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Comment
            </button>
          </div>
        </form>
      ) : (
        <p className="mb-3 text-xs text-gray-400">You have view-only access — comments are read-only.</p>
      )}

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <div className="flex-1 space-y-3 overflow-y-auto">
        {open.length === 0 && resolved.length === 0 && (
          <p className="text-sm text-gray-400">No comments yet.</p>
        )}
        {open.map((c) => (
          <CommentItem
            key={c.id}
            c={c}
            canAct={canComment}
            canDelete={c.authorId === currentUserId || isOwner}
            onToggle={() => toggleResolved(c)}
            onDelete={() => remove(c)}
          />
        ))}
        {resolved.length > 0 && (
          <details className="pt-2">
            <summary className="cursor-pointer text-xs font-medium text-gray-400">
              Resolved ({resolved.length})
            </summary>
            <div className="mt-2 space-y-3">
              {resolved.map((c) => (
                <CommentItem
                  key={c.id}
                  c={c}
                  canAct={canComment}
                  canDelete={c.authorId === currentUserId || isOwner}
                  onToggle={() => toggleResolved(c)}
                  onDelete={() => remove(c)}
                />
              ))}
            </div>
          </details>
        )}
      </div>
    </aside>
  );
}

function CommentItem({
  c,
  canAct,
  canDelete,
  onToggle,
  onDelete,
}: {
  c: Comment;
  canAct: boolean;
  canDelete: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`rounded-lg border p-2 ${c.resolved ? "border-gray-100 bg-gray-50 opacity-70" : "border-gray-200"}`}>
      {c.quote && (
        <div className="mb-1 border-l-2 border-amber-300 pl-2 text-xs italic text-gray-500">
          “{c.quote}”
        </div>
      )}
      <p className="whitespace-pre-wrap text-sm text-gray-800">{c.body}</p>
      <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
        <span>
          {c.author} · {new Date(c.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </span>
        <span className="flex gap-2">
          {canAct && (
            <button onClick={onToggle} className="hover:text-gray-700">
              {c.resolved ? "Reopen" : "Resolve"}
            </button>
          )}
          {canDelete && (
            <button onClick={onDelete} className="hover:text-red-600">
              Delete
            </button>
          )}
        </span>
      </div>
    </div>
  );
}
