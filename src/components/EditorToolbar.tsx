"use client";

import { useState } from "react";
import { type Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Link2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
  Check,
  ChevronDown,
} from "lucide-react";

function Btn({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()} // keep editor selection
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-md px-2 text-sm font-medium transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 ${
        active
          ? "bg-brand-50 text-brand-700 ring-1 ring-brand-200"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-slate-200" />;
}

const ICON = 17;

/** Paragraph-style picker (Normal text / Heading 1–3) — the canonical doc-editor control. */
function StyleMenu({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);

  const styles = [
    {
      label: "Normal text",
      active: editor.isActive("paragraph"),
      run: () => editor.chain().focus().setParagraph().run(),
      cls: "text-sm",
    },
    {
      label: "Heading 1",
      active: editor.isActive("heading", { level: 1 }),
      run: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      cls: "text-lg font-bold",
    },
    {
      label: "Heading 2",
      active: editor.isActive("heading", { level: 2 }),
      run: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      cls: "text-base font-bold",
    },
    {
      label: "Heading 3",
      active: editor.isActive("heading", { level: 3 }),
      run: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      cls: "text-sm font-semibold",
    },
  ];
  const current = styles.find((s) => s.active) ?? styles[0];

  return (
    <div className="relative">
      <button
        type="button"
        title="Paragraph style"
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex h-8 w-32 cursor-pointer items-center justify-between gap-1 rounded-md px-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
      >
        <span className="truncate">{current.label}</span>
        <ChevronDown size={14} className="shrink-0 text-slate-400" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 z-50 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-pop"
        >
          {styles.map((s) => (
            <button
              key={s.label}
              role="menuitemradio"
              aria-checked={s.active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                s.run();
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-slate-700 transition hover:bg-slate-50 ${s.cls}`}
            >
              <span>{s.label}</span>
              {s.active && <Check size={15} className="shrink-0 text-brand-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EditorToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (leave empty to remove):", previous ?? "");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  // Live word count (StarterKit has no counter; cheap to derive from plain text).
  const words = editor.getText().trim().split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.ceil(words / 200));

  return (
    <div className="no-print flex flex-wrap items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-1.5 shadow-card">
      <Btn title="Undo (⌘Z)" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
        <Undo2 size={ICON} />
      </Btn>
      <Btn title="Redo (⌘⇧Z)" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
        <Redo2 size={ICON} />
      </Btn>
      <Divider />

      <StyleMenu editor={editor} />
      <Divider />

      <Btn title="Bold (⌘B)" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold size={ICON} />
      </Btn>
      <Btn title="Italic (⌘I)" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic size={ICON} />
      </Btn>
      <Btn title="Underline (⌘U)" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon size={ICON} />
      </Btn>
      <Btn title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough size={ICON} />
      </Btn>
      <Divider />

      <Btn title="Bulleted list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List size={ICON} />
      </Btn>
      <Btn title="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered size={ICON} />
      </Btn>
      <Btn title="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote size={ICON} />
      </Btn>
      <Btn title="Link" active={editor.isActive("link")} onClick={setLink}>
        <Link2 size={ICON} />
      </Btn>
      <Divider />

      <Btn title="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
        <AlignLeft size={ICON} />
      </Btn>
      <Btn title="Align center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
        <AlignCenter size={ICON} />
      </Btn>
      <Btn title="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
        <AlignRight size={ICON} />
      </Btn>

      <span className="ml-auto hidden items-center pr-1 text-xs font-medium tabular-nums text-slate-400 sm:flex">
        {words.toLocaleString()} {words === 1 ? "word" : "words"} · {mins} min read
      </span>
    </div>
  );
}
