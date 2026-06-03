"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";
interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

// Tiny module-level pub/sub so any component can call toast() without a provider.
let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<(t: ToastItem[]) => void>();

function emit() {
  for (const l of listeners) l([...items]);
}
function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

export function toast(message: string, type: ToastType = "info") {
  const id = nextId++;
  items = [...items, { id, message, type }];
  emit();
  setTimeout(() => dismiss(id), 3500);
}

const STYLES: Record<ToastType, { icon: typeof Info; cls: string }> = {
  success: { icon: CheckCircle2, cls: "border-emerald-200 text-emerald-800" },
  error: { icon: AlertCircle, cls: "border-red-200 text-red-800" },
  info: { icon: Info, cls: "border-slate-200 text-slate-800" },
};

export function Toaster() {
  const [list, setList] = useState<ToastItem[]>([]);
  useEffect(() => {
    listeners.add(setList);
    setList([...items]);
    return () => {
      listeners.delete(setList);
    };
  }, []);

  return (
    <div
      className="no-print pointer-events-none fixed bottom-4 right-4 z-[1000] flex w-full max-w-xs flex-col gap-2"
      aria-live="polite"
      role="status"
    >
      {list.map((t) => {
        const { icon: Icon, cls } = STYLES[t.type];
        return (
          <div
            key={t.id}
            className={`animate-toast pointer-events-auto flex items-start gap-2 rounded-xl border bg-white px-3 py-2.5 text-sm shadow-pop ${cls}`}
          >
            <Icon size={18} className="mt-0.5 shrink-0" />
            <span className="flex-1 text-slate-700">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 text-slate-300 transition hover:text-slate-600"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
