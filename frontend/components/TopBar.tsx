"use client";

import { useRef } from "react";
import { Upload, Undo2, Redo2, Download, FlaskConical, Scissors } from "lucide-react";
import { useStore } from "@/lib/store";
import { ExampleMenu } from "./ExampleMenu";

export function TopBar() {
  const fileRef = useRef<HTMLInputElement>(null);
  const importSvg = useStore((s) => s.importSvg);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const setRightTab = useStore((s) => s.setRightTab);
  const cropAll = useStore((s) => s.cropAll);
  const panelCount = useStore((s) => s.panels.length);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const text = await file.text();
      importSvg(file.name.replace(/\.svg$/i, ""), text);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-panel px-3">
      <div className="flex items-center gap-2 pr-3">
        <FlaskConical size={18} className="text-accent" />
        <span className="text-sm font-semibold tracking-tight">SciCompose</span>
        <span className="hidden text-2xs text-faint sm:inline">figure editor</span>
      </div>

      <div className="h-5 w-px bg-line" />

      <button className="tool-btn tool-btn-primary" onClick={() => fileRef.current?.click()}>
        <Upload size={15} /> Import SVG
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".svg,image/svg+xml"
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      <ExampleMenu />

      <div className="h-5 w-px bg-line" />

      <button className="tool-btn" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
        <Undo2 size={15} /> Undo
      </button>
      <button className="tool-btn" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
        <Redo2 size={15} /> Redo
      </button>

      <div className="h-5 w-px bg-line" />

      <button
        className="tool-btn"
        onClick={cropAll}
        disabled={panelCount === 0}
        title="Trim edge whitespace on every panel"
      >
        <Scissors size={15} /> Trim
      </button>

      <div className="ml-auto" />

      <button
        className="tool-btn tool-btn-primary"
        onClick={() => setRightTab("export")}
        disabled={panelCount === 0}
      >
        <Download size={15} /> Export
      </button>
    </header>
  );
}
