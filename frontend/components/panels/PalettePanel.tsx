"use client";

import { useState } from "react";
import { Check, Eye, ChevronDown, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { palettesByCategory, CATEGORY_LABELS, CATEGORY_ORDER, findPalette } from "@/lib/palettes";
import type { PaletteCategory } from "@/lib/types";

export function PalettePanel() {
  const grouped = palettesByCategory();
  const activePaletteId = useStore((s) => s.activePaletteId);
  const activeCat = activePaletteId ? findPalette(activePaletteId)?.category : null;
  const [open, setOpen] = useState<Set<PaletteCategory>>(() => new Set<PaletteCategory>([activeCat ?? "journal"]));
  const toggle = (c: PaletteCategory) =>
    setOpen((prev) => {
      const n = new Set(prev);
      if (n.has(c)) n.delete(c);
      else n.add(c);
      return n;
    });
  const applyPalette = useStore((s) => s.applyPalette);
  const recolorSeries = useStore((s) => s.recolorSeries);
  const panels = useStore((s) => s.panels);
  const selectedPanelId = useStore((s) => s.selectedPanelId);

  const selectedPanel = panels.find((p) => p.id === selectedPanelId) ?? null;
  const series = selectedPanel ? [...selectedPanel.series].sort((a, b) => a.order - b.order) : [];

  return (
    <div className="p-3">
      <div className="panel-title mb-1">Color library</div>
      <p className="mb-3 text-2xs text-faint">
        Click a palette to recolor every panel&apos;s data series in order. Structure (axes, ticks,
        text) is left untouched.
      </p>

      {CATEGORY_ORDER.map((cat) => {
        const list = grouped[cat];
        if (!list.length) return null;
        const isOpen = open.has(cat);
        const hasActive = list.some((pal) => pal.id === activePaletteId);
        return (
          <div key={cat} className="mb-0.5">
            <button
              onClick={() => toggle(cat)}
              className="flex w-full items-center gap-1 rounded px-0.5 py-1 text-left hover:bg-hover"
            >
              {isOpen ? <ChevronDown size={12} className="shrink-0 text-faint" /> : <ChevronRight size={12} className="shrink-0 text-faint" />}
              <span className={`field-label flex-1 ${hasActive ? "text-accent" : ""}`}>{CATEGORY_LABELS[cat]}</span>
              <span className="text-2xs text-faint">{list.length}</span>
            </button>
            {isOpen && (
              <div className="mb-2 flex flex-col gap-1 pl-1">
                {list.map((pal) => {
                  const active = pal.id === activePaletteId;
                  return (
                    <button
                      key={pal.id}
                      onClick={() => applyPalette(pal.id)}
                      className={`flex items-center gap-2 rounded px-1.5 py-1 text-left ${
                        active ? "bg-accent/15 ring-1 ring-accent/40" : "hover:bg-hover"
                      }`}
                    >
                      <span className="flex h-4 overflow-hidden rounded-sm border border-line">
                        {pal.colors.slice(0, 7).map((c, i) => (
                          <span key={i} className="h-full w-3" style={{ background: c }} />
                        ))}
                      </span>
                      <span className="flex-1 truncate text-2xs text-ink">{pal.name}</span>
                      {pal.colorblindSafe && (
                        <Eye size={11} className="shrink-0 text-good" aria-label="colorblind-safe" />
                      )}
                      {active && <Check size={12} className="shrink-0 text-accent" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* per-series override */}
      <div className="mt-2 border-t border-line pt-3">
        <div className="field-label mb-2">
          Per-series color {selectedPanel ? `· ${selectedPanel.label}` : ""}
        </div>
        {!selectedPanel && <div className="text-2xs text-faint">Select a panel to fine-tune colors.</div>}
        {selectedPanel && series.length === 0 && (
          <div className="text-2xs text-faint">No data series detected in this panel.</div>
        )}
        <div className="flex flex-col gap-1.5">
          {selectedPanel &&
            series.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-2xs">
              <input
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(s.color) ? s.color : "#888888"}
                onChange={(e) => recolorSeries(selectedPanel.id, s.id, e.target.value)}
                className="h-5 w-6 shrink-0 cursor-pointer rounded border border-line bg-transparent"
              />
              <span className="flex-1 truncate text-muted">
                {s.label || s.role}
                {s.isFill ? " · fill" : ""}
                {s.hasMarker ? " · marker" : ""}
              </span>
              <span className="text-faint">{s.elementIds.length}×</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
