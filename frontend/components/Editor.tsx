"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { TopBar } from "./TopBar";
import { LeftSidebar } from "./LeftSidebar";
import { RightSidebar } from "./RightSidebar";
import { NaturePage } from "./NaturePage";
import { Messages } from "./Messages";

export function Editor() {
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);

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
        <main className="relative min-w-0 flex-1 overflow-auto bg-[#0a0d12]">
          <NaturePage />
          <Messages />
        </main>
        <RightSidebar />
      </div>
    </div>
  );
}
