"use client";

import { Trash2, ChevronUp, ChevronDown, Grid3x3, Magnet, Eraser } from "lucide-react";
import { useStore, type AxisFrameStyle } from "@/lib/store";
import { JOURNAL_PRESETS } from "@/lib/journals";

const FRAMES: { v: AxisFrameStyle; label: string; title: string }[] = [
  { v: "original", label: "Orig", title: "Keep the imported frame" },
  { v: "full", label: "Full", title: "Redraw a full box frame" },
  { v: "half", label: "Half", title: "Redraw a half (L) frame: left + bottom" },
  { v: "none", label: "None", title: "Hide the frame" }
];

export function LeftSidebar() {
  const panels = useStore((s) => s.panels);
  const selectedPanelId = useStore((s) => s.selectedPanelId);
  const selectPanel = useStore((s) => s.selectPanel);
  const removePanel = useStore((s) => s.removePanel);
  const reorderPanels = useStore((s) => s.reorderPanels);
  const pageWidthMm = useStore((s) => s.pageWidthMm);
  const setPageWidthMm = useStore((s) => s.setPageWidthMm);
  const gutterMm = useStore((s) => s.gutterMm);
  const setGutterMm = useStore((s) => s.setGutterMm);
  const axisFrame = useStore((s) => s.axisFrame);
  const setAxisFrame = useStore((s) => s.setAxisFrame);
  const bgTransparent = useStore((s) => s.bgTransparent);
  const setBackgroundTransparent = useStore((s) => s.setBackgroundTransparent);
  const showGrid = useStore((s) => s.showGrid);
  const snapEnabled = useStore((s) => s.snapEnabled);
  const toggleGrid = useStore((s) => s.toggleGrid);
  const toggleSnap = useStore((s) => s.toggleSnap);

  const ordered = [...panels].sort((a, b) => a.order - b.order);

  const move = (id: string, dir: -1 | 1) => {
    const ids = ordered.map((p) => p.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorderPanels(ids);
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-line bg-panel">
      {/* Layout */}
      <div className="border-b border-line p-3">
        <div className="panel-title mb-2">Layout</div>
        <label className="field-label">Page width</label>
        <select
          className="input-dark mb-2 w-full"
          value={JOURNAL_PRESETS.find((j) => j.widthMm === pageWidthMm)?.id ?? "custom"}
          onChange={(e) => {
            const preset = JOURNAL_PRESETS.find((j) => j.id === e.target.value);
            if (preset && preset.id !== "custom") setPageWidthMm(preset.widthMm);
          }}
        >
          {JOURNAL_PRESETS.map((j) => (
            <option key={j.id} value={j.id}>
              {j.name} ({j.widthMm}mm)
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="input-dark w-20"
            value={Math.round(pageWidthMm)}
            min={40}
            max={300}
            onChange={(e) => setPageWidthMm(Number(e.target.value) || pageWidthMm)}
          />
          <span className="text-2xs text-faint">mm wide</span>
        </div>

        <label className="field-label mt-3">Panel spacing</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="input-dark w-20"
            value={Math.round(gutterMm)}
            min={0}
            max={40}
            onChange={(e) => setGutterMm(Number(e.target.value))}
          />
          <span className="text-2xs text-faint">mm gutter</span>
        </div>

        <label className="field-label mt-3">Axis frame</label>
        <div className="grid grid-cols-4 gap-1">
          {FRAMES.map((f) => (
            <button
              key={f.v}
              title={f.title}
              onClick={() => setAxisFrame(f.v)}
              className={`chip justify-center ${axisFrame === f.v ? "chip-on" : ""}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            className={`chip flex-1 ${showGrid ? "chip-on" : ""}`}
            onClick={toggleGrid}
            title="Toggle grid"
          >
            <Grid3x3 size={13} /> Grid
          </button>
          <button
            className={`chip flex-1 ${snapEnabled ? "chip-on" : ""}`}
            onClick={toggleSnap}
            title="Toggle snapping"
          >
            <Magnet size={13} /> Snap
          </button>
        </div>

        <button
          className={`chip mt-2 w-full justify-center ${bgTransparent ? "chip-on" : ""}`}
          onClick={() => setBackgroundTransparent(!bgTransparent)}
          title="Remove figure backgrounds (make transparent)"
        >
          <Eraser size={13} /> Transparent background
        </button>
      </div>

      {/* Panels */}
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <div className="panel-title mb-2">Panels · {panels.length}</div>
        {ordered.length === 0 && (
          <div className="text-2xs text-faint">No panels yet — import an SVG.</div>
        )}
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
          {ordered.map((p, i) => {
            const active = p.id === selectedPanelId;
            return (
              <div
                key={p.id}
                onClick={() => selectPanel(p.id)}
                className={`group flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-xs ${
                  active ? "bg-accent/15 text-ink ring-1 ring-accent/40" : "hover:bg-hover text-muted"
                }`}
              >
                <span className="w-5 shrink-0 font-semibold text-ink">{p.label || "—"}</span>
                <span className="flex-1 truncate" title={p.name}>
                  {p.name}
                </span>
                <button
                  className="opacity-0 hover:text-ink group-hover:opacity-100 disabled:opacity-20"
                  disabled={i === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    move(p.id, -1);
                  }}
                >
                  <ChevronUp size={12} />
                </button>
                <button
                  className="opacity-0 hover:text-ink group-hover:opacity-100 disabled:opacity-20"
                  disabled={i === ordered.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    move(p.id, 1);
                  }}
                >
                  <ChevronDown size={12} />
                </button>
                <button
                  className="opacity-0 hover:text-bad group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePanel(p.id);
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
