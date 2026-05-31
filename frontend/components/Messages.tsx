"use client";

import { X, AlertTriangle, Info } from "lucide-react";
import { useStore } from "@/lib/store";

/** Floating import warnings / info toasts (Module: import detection feedback). */
export function Messages() {
  const messages = useStore((s) => s.importMessages);
  const dismiss = useStore((s) => s.dismissMessage);
  if (messages.length === 0) return null;

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-40 flex max-w-sm flex-col gap-2">
      {messages.slice(-5).map((m) => (
        <div
          key={m.id}
          className={`pointer-events-auto flex items-start gap-2 rounded-md border px-3 py-2 text-xs shadow-pop backdrop-blur ${
            m.tone === "warn"
              ? "border-warn/40 bg-[#2a2310]/95 text-amber-100"
              : "border-line bg-elevated/95 text-ink"
          }`}
        >
          {m.tone === "warn" ? (
            <AlertTriangle size={14} className="mt-px shrink-0 text-warn" />
          ) : (
            <Info size={14} className="mt-px shrink-0 text-accent" />
          )}
          <span className="flex-1 leading-snug">{m.text}</span>
          <button onClick={() => dismiss(m.id)} className="shrink-0 text-faint hover:text-ink">
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
