"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { importFiles } from "@/lib/importFiles";
import { TopBar } from "./TopBar";
import { LeftSidebar } from "./LeftSidebar";
import { RightSidebar } from "./RightSidebar";
import { NaturePage } from "./NaturePage";
import { Messages } from "./Messages";
import { HelpPanel } from "./HelpPanel";

export function Editor() {
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const setLang = useStore((s) => s.setLang);
  const hydrateDoc = useStore((s) => s.hydrateDoc);
  const importSvg = useStore((s) => s.importSvg);
  const importImage = useStore((s) => s.importImage);
  const t = useT();
  const [dragOver, setDragOver] = useState(false);

  // Client-side hydration (done in an effect, not in the store initializer, so the
  // SSR/first-paint markup matches and React doesn't throw a hydration mismatch):
  //  - restore the saved UI language
  //  - restore the auto-saved document so a refresh doesn't wipe the user's work
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("sc-lang");
      if (saved === "zh" || saved === "en") setLang(saved);
    } catch {
      /* storage blocked — keep default */
    }
    hydrateDoc();
  }, [setLang, hydrateDoc]);

  // Stop the browser from navigating away (and losing the session) when a file is
  // dropped anywhere outside the editor drop zone.
  useEffect(() => {
    const prevent = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, []);

  // Module I — Ctrl+Z / Ctrl+Shift+Z
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <LeftSidebar />
        <main
          className="relative min-w-0 flex-1 overflow-auto bg-canvas"
          style={{
            backgroundImage: "radial-gradient(rgba(18,20,40,0.05) 1px, transparent 1px)",
            backgroundSize: "22px 22px"
          }}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            if (!dragOver) setDragOver(true);
          }}
          onDragLeave={(e) => {
            // ignore leaves that move to a child element (drag events bubble)
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false);
          }}
          onDrop={(e) => {
            if (!e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            setDragOver(false);
            void importFiles(e.dataTransfer.files, { importSvg, importImage });
          }}
        >
          <NaturePage />
          <Messages />
          {dragOver && (
            <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-accent/10 backdrop-blur-[1px]">
              <div className="rounded-xl border-2 border-dashed border-accent bg-paper/90 px-8 py-6 text-center shadow-pop">
                <div className="text-sm font-semibold text-accent">{t("drop.hint")}</div>
                <div className="mt-1 text-2xs text-muted">SVG · PNG · JPG · WebP</div>
              </div>
            </div>
          )}
        </main>
        <RightSidebar />
      </div>
      <HelpPanel />
    </div>
  );
}
