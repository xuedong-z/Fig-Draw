"use client";

import { Trash2, ChevronUp, ChevronDown, Lock, Unlock, Grid3x3, Magnet } from "lucide-react";
import { useStore } from "@/lib/store";
import { ROLE_LABELS, type ElementRole, type ParsedElement } from "@/lib/types";
import { JOURNAL_PRESETS } from "@/lib/journals";

const ROLE_KEYS = Object.keys(ROLE_LABELS) as ElementRole[];

/** Order elements for the role list: data first, then structure, then text. */
const ROLE_RANK: Record<string, number> = {
  data: 0,
  fit: 1,
  scatter: 2,
  errorbar: 3,
  auxiliary: 4,
  axis: 5,
  tick: 6,
  grid: 7,
  background: 8,
  legend: 9,
  "text-title": 10,
  "text-axis": 11,
  "text-tick": 12,
  "text-legend": 13,
  decoration: 14,
  unknown: 15
};

function swatchColor(el: ParsedElement): string | null {
  if (el.stroke && el.stroke !== "none") return el.stroke;
  if (el.fill && el.fill !== "none") return el.fill;
  return null;
}

function elementText(el: ParsedElement): string {
  if (el.text) return `"${el.text.slice(0, 18)}"`;
  let t = el.tag;
  if (el.hasMarker) t += " ·marker";
  if (el.gradientId) t += " ·grad";
  return t;
}

export function LeftSidebar() {
  const panels = useStore((s) => s.panels);
  const selectedPanelId = useStore((s) => s.selectedPanelId);
  const selectedElementId = useStore((s) => s.selectedElementId);
  const selectPanel = useStore((s) => s.selectPanel);
  const selectElement = useStore((s) => s.selectElement);
  const removePanel = useStore((s) => s.removePanel);
  const reorderPanels = useStore((s) => s.reorderPanels);
  const setPanelAspectLock = useStore((s) => s.setPanelAspectLock);
  const setElementRole = useStore((s) => s.setElementRole);
  const setRightTab = useStore((s) => s.setRightTab);
  const pageWidthMm = useStore((s) => s.pageWidthMm);
  const setPageWidthMm = useStore((s) => s.setPageWidthMm);
  const showGrid = useStore((s) => s.showGrid);
  const snapEnabled = useStore((s) => s.snapEnabled);
  const toggleGrid = useStore((s) => s.toggleGrid);
  const toggleSnap = useStore((s) => s.toggleSnap);

  const ordered = [...panels].sort((a, b) => a.order - b.order);
  const selectedPanel = panels.find((p) => p.id === selectedPanelId) ?? null;

  const move = (id: string, dir: -1 | 1) => {
    const ids = ordered.map((p) => p.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorderPanels(ids);
  };

  const elements = selectedPanel
    ? [...selectedPanel.elements].sort(
        (a, b) => (ROLE_RANK[a.role] ?? 9) - (ROLE_RANK[b.role] ?? 9)
      )
    : [];

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
      </div>

      {/* Panels */}
      <div className="border-b border-line p-3">
        <div className="panel-title mb-2">Panels · {panels.length}</div>
        {ordered.length === 0 && (
          <div className="text-2xs text-faint">No panels yet — import an SVG.</div>
        )}
        <div className="flex flex-col gap-1">
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
                  className="opacity-0 hover:text-accent group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPanelAspectLock(p.id, !p.aspectLocked);
                  }}
                  title={p.aspectLocked ? "Aspect locked" : "Aspect free"}
                >
                  {p.aspectLocked ? <Lock size={12} /> : <Unlock size={12} />}
                </button>
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

      {/* Elements & roles (Module D2) */}
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <div className="panel-title mb-2">
          Elements & roles {selectedPanel ? `· ${elements.length}` : ""}
        </div>
        {!selectedPanel && (
          <div className="text-2xs text-faint">Select a panel to inspect its elements.</div>
        )}
        {selectedPanel?.textToPath && (
          <div className="mb-2 rounded border border-warn/40 bg-[#2a2310] px-2 py-1 text-2xs text-amber-100">
            Text was outlined to paths — fonts can&apos;t be re-typed, only recolored.
          </div>
        )}
        <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pr-1">
          {selectedPanel &&
            elements.map((el) => {
            const c = swatchColor(el);
            const active = el.scid === selectedElementId;
            return (
              <div
                key={el.scid}
                onClick={() => {
                  selectElement(el.scid);
                  setRightTab("tune");
                }}
                className={`flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 text-2xs ${
                  active ? "bg-accent/15 ring-1 ring-accent/40" : "hover:bg-hover"
                }`}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-sm border border-line"
                  style={
                    c
                      ? { background: c }
                      : {
                          backgroundImage:
                            "linear-gradient(45deg,#444 25%,transparent 25%,transparent 75%,#444 75%)",
                          backgroundSize: "4px 4px"
                        }
                  }
                />
                <span className="w-24 shrink-0 truncate text-muted" title={elementText(el)}>
                  {elementText(el)}
                </span>
                <select
                  className="input-dark ml-auto h-5 w-[88px] px-1 py-0 text-2xs"
                  value={el.role}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setElementRole(selectedPanel.id, el.scid, e.target.value as ElementRole)}
                >
                  {ROLE_KEYS.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
