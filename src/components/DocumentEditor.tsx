"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import LinkExt from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import {
  ArrowLeft,
  MessageSquare,
  History as HistoryIcon,
  Download,
  Printer,
  ChevronDown,
  Share2,
  RefreshCw,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link2,
} from "lucide-react";
import { api, ApiError } from "@/lib/client";
import { toast } from "./Toast";
import EditorToolbar from "./EditorToolbar";
import ShareDialog from "./ShareDialog";
import VersionHistory from "./VersionHistory";
import PresenceBar from "./PresenceBar";
import CommentsPanel from "./CommentsPanel";

export type Role = "OWNER" | "EDITOR" | "COMMENTER" | "VIEWER";

export interface ShareEntry {
  userId: string;
  role: "VIEWER" | "COMMENTER" | "EDITOR";
  name: string;
  email: string;
}

export interface EditorInitial {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  role: Role;
  owner: { name: string; email: string };
  shares: ShareEntry[];
}

type SaveState = "idle" | "saving" | "saved" | "error";

/** Compact button for the floating selection (bubble) toolbar. */
function BubbleBtn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition active:scale-95 ${
        active ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

export default function DocumentEditor({
  initial,
  currentUserId,
}: {
  initial: EditorInitial;
  currentUserId: string;
}) {
  const canEdit = initial.role === "OWNER" || initial.role === "EDITOR";
  const canComment = canEdit || initial.role === "COMMENTER";
  const isOwner = initial.role === "OWNER";

  const [title, setTitle] = useState(initial.title);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [shareOpen, setShareOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [openComments, setOpenComments] = useState(0);
  const [shareCount, setShareCount] = useState(initial.shares.length);
  const [remoteChanged, setRemoteChanged] = useState(false);

  const contentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Baseline for detecting edits made by *other* collaborators.
  const lastSavedAt = useRef<string>(initial.updatedAt);

  const save = useCallback(
    async (data: { title?: string; content?: string }) => {
      setSaveState("saving");
      try {
        const res = await api<{ updatedAt: string }>(`/api/documents/${initial.id}`, {
          method: "PATCH",
          json: data,
        });
        if (res?.updatedAt) lastSavedAt.current = res.updatedAt;
        setRemoteChanged(false);
        setSaveState("saved");
      } catch (err) {
        setSaveState("error");
        if (err instanceof ApiError && err.status === 403) toast(err.message, "error");
      }
    },
    [initial.id],
  );

  const editor = useEditor({
    immediatelyRender: false,
    editable: canEdit,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      LinkExt.configure({ openOnClick: false, autolink: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Start writing…" }),
    ],
    content: initial.content,
    editorProps: { attributes: { class: "doc-content min-h-[60vh] focus:outline-none" } },
    onUpdate: ({ editor }) => {
      if (!canEdit) return;
      const html = editor.getHTML();
      setSaveState("saving");
      if (contentTimer.current) clearTimeout(contentTimer.current);
      contentTimer.current = setTimeout(() => save({ content: html }), 800);
    },
  });

  useEffect(() => {
    return () => {
      if (contentTimer.current) clearTimeout(contentTimer.current);
      if (titleTimer.current) clearTimeout(titleTimer.current);
    };
  }, []);

  // Presence reports the server's updatedAt; if it's newer than our last save,
  // another collaborator changed the document.
  const onServerUpdatedAt = useCallback((iso: string) => {
    const serverMs = new Date(iso).getTime();
    const mineMs = new Date(lastSavedAt.current).getTime();
    if (serverMs > mineMs + 1500) setRemoteChanged(true);
  }, []);

  function onTitleChange(value: string) {
    setTitle(value);
    setSaveState("saving");
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => save({ title: value.trim() || "Untitled document" }), 600);
  }

  function onRestored(updated: { title: string; content: string }) {
    setTitle(updated.title);
    editor?.commands.setContent(updated.content);
    setSaveState("saved");
    toast("Version restored", "success");
  }

  const setBubbleLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (leave empty to remove):", previous ?? "");
    if (url === null) return;
    const chain = editor.chain().focus().extendMarkRange("link");
    if (url === "") chain.unsetLink().run();
    else chain.setLink({ href: url }).run();
  }, [editor]);

  const getSelectionQuote = useCallback(() => {
    if (!editor) return "";
    const { from, to } = editor.state.selection;
    if (from === to) return "";
    const text = editor.state.doc.textBetween(from, to, " ").trim();
    return text.length > 180 ? `${text.slice(0, 180)}…` : text;
  }, [editor]);

  const statusLabel: Record<SaveState, string> = {
    idle: canEdit ? "All changes saved" : canComment ? "Comment access" : "View only",
    saving: "Saving…",
    saved: "All changes saved",
    error: "Save failed — retrying on next edit",
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="no-print mb-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <Link
            href="/documents"
            className="inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={15} /> All documents
          </Link>
          <div className="flex items-center gap-3">
            <PresenceBar docId={initial.id} onUpdatedAt={onServerUpdatedAt} />
            <span
              className={`inline-flex items-center gap-1.5 text-xs ${
                saveState === "error" ? "text-red-600" : "text-slate-400"
              }`}
              aria-live="polite"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  saveState === "saving"
                    ? "animate-pulse bg-brand-500"
                    : saveState === "error"
                      ? "bg-red-500"
                      : "bg-emerald-500"
                }`}
              />
              {statusLabel[saveState]}
            </span>
          </div>
        </div>

        {remoteChanged && (
          <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <span className="flex items-center gap-2">
              <RefreshCw size={15} /> A collaborator updated this document.
            </span>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-amber-700"
            >
              Reload
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            disabled={!canEdit}
            placeholder="Untitled document"
            className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1 text-2xl font-bold tracking-tight text-slate-900 outline-none transition hover:border-slate-200 focus:border-brand-500 disabled:cursor-default disabled:bg-transparent"
          />
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {!canEdit && (
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  canComment ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"
                }`}
              >
                {canComment ? "Can comment" : "View only"}
              </span>
            )}

            <button
              onClick={() => setCommentsOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                commentsOpen
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <MessageSquare size={15} />
              <span className="hidden sm:inline">Comments</span>
              {openComments > 0 && (
                <span className="rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white">
                  {openComments}
                </span>
              )}
            </button>

            {canEdit && (
              <button
                onClick={() => setHistoryOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <HistoryIcon size={15} />
                <span className="hidden sm:inline">History</span>
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setExportOpen((v) => !v)}
                onBlur={() => setTimeout(() => setExportOpen(false), 150)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Download size={15} />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown size={14} />
              </button>
              {exportOpen && (
                <div className="absolute right-0 z-50 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-pop">
                  <a
                    href={`/api/documents/${initial.id}/export?format=md`}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <Download size={15} /> Download as Markdown
                  </a>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => window.print()}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <Printer size={15} /> Print / Save as PDF
                  </button>
                </div>
              )}
            </div>

            {isOwner && (
              <button
                onClick={() => setShareOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                <Share2 size={15} />
                Share
                {shareCount > 0 && (
                  <span className="rounded-full bg-white/25 px-1.5 text-[11px] font-semibold">{shareCount}</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {canEdit && (
        <div className="no-print sticky top-14 z-10 mb-3">
          <EditorToolbar editor={editor} />
        </div>
      )}

      {canEdit && historyOpen && (
        <VersionHistory docId={initial.id} onRestored={onRestored} onClose={() => setHistoryOpen(false)} />
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="print-area min-w-0 flex-1 rounded-xl border border-slate-200/70 bg-white px-6 py-12 shadow-sheet sm:px-14 sm:py-16">
          {editor && canEdit && (
            <BubbleMenu
              editor={editor}
              tippyOptions={{ duration: 120 }}
              className="no-print flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-1 shadow-pop"
            >
              <BubbleBtn title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
                <Bold size={16} />
              </BubbleBtn>
              <BubbleBtn title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
                <Italic size={16} />
              </BubbleBtn>
              <BubbleBtn title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
                <UnderlineIcon size={16} />
              </BubbleBtn>
              <BubbleBtn title="Link" active={editor.isActive("link")} onClick={setBubbleLink}>
                <Link2 size={16} />
              </BubbleBtn>
            </BubbleMenu>
          )}
          <EditorContent editor={editor} />
        </div>

        {commentsOpen && (
          <CommentsPanel
            docId={initial.id}
            currentUserId={currentUserId}
            canComment={canComment}
            isOwner={isOwner}
            getSelectionQuote={getSelectionQuote}
            onCountChange={setOpenComments}
            onClose={() => setCommentsOpen(false)}
          />
        )}
      </div>

      {isOwner && shareOpen && (
        <ShareDialog
          docId={initial.id}
          ownerEmail={initial.owner.email}
          initialShares={initial.shares}
          onClose={() => setShareOpen(false)}
          onChange={(count) => setShareCount(count)}
        />
      )}
    </main>
  );
}
