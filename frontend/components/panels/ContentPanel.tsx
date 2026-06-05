"use client";

import { useState } from "react";
import { Check, Eye, ChevronDown, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { palettesByCategory, CATEGORY_ORDER, findPalette } from "@/lib/palettes";
import type { Emphasis, PaletteCategory } from "@/lib/types";
import { NumRow, NATURE_PRESET } from "./_shared";

/** Emphasis levels (merged in from the old EmphasisPanel). */
const LEVELS: { id: Emphasis; tkey: string; hintKey: string }[] = [
  { id: "primary", tkey: "emphasis.primary", hintKey: "emphasis.primary.hint" },
  { id: "secondary", tkey: "emphasis.secondary", hintKey: "emphasis.secondary.hint" },
  { id: "auxiliary", tkey: "emphasis.auxiliary", hintKey: "emphasis.auxiliary.hint" },
  { id: "normal", tkey: "emphasis.normal", hintKey: "emphasis.normal.hint" }
];

/** "Content" tab — everything about the plotted data: palette library, per-series
 * color + emphasis, and the data line width. (Merges old Palette + Emphasis panels.) */
export function ContentPanel() {
  const t = useT();
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
  const setSeriesEmphasis = useStore((s) => s.setSeriesEmphasis);
  const typography = useStore((s) => s.typography);
  const setTypography = useStore((s) => s.setTypography);
  const panels = useStore((s) => s.panels);
  const selectedPanelId = useStore((s) => s.selectedPanelId);

  const selectedPanel = panels.find((p) => p.id === selectedPanelId) ?? null;
  const series = selectedPanel ? [...selectedPanel.series].sort((a, b) => a.order - b.order) : [];

  return (
    <div className="p-3">
      <div className="panel-title mb-1">{t("content.title")}</div>
      <p className="mb-3 text-2xs text-faint">{t("color.desc")}</p>

      {/* palette library */}
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
              <span className={`field-label flex-1 ${hasActive ? "text-accent" : ""}`}>{t(`cat.${cat}`)}</span>
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
                      {pal.colorblindSafe && <Eye size={11} className="shrink-0 text-good" aria-label="colorblind-safe" />}
                      {active && <Check size={12} className="shrink-0 text-accent" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* data line width (global; applied on Typography → Unify) */}
      <div className="mt-2 border-t border-line pt-3">
        <NumRow
          label={t("type.dataLine")}
          value={typography.dataLineWidthPt}
          step={0.1}
          hint={`${NATURE_PRESET.dataLineWidthPt}`}
          onChange={(v) => setTypography({ dataLineWidthPt: v })}
        />
        <p className="mt-1 text-[10px] text-faint">{t("content.lineHint")}</p>
      </div>

      {/* per-series: color + emphasis */}
      <div className="mt-3 border-t border-line pt-3">
        <div className="field-label mb-2">
          {t("color.perSeries")} {selectedPanel ? `· ${selectedPanel.label}` : ""}
        </div>
        {!selectedPanel && <div className="text-2xs text-faint">{t("color.selectPanel")}</div>}
        {selectedPanel && series.length === 0 && <div className="text-2xs text-faint">{t("color.noSeries")}</div>}
        <div className="flex flex-col gap-2">
          {selectedPanel &&
            series.map((s) => (
              <div key={s.id} className="rounded-md border border-line bg-elevated p-2">
                <div className="mb-2 flex items-center gap-2">
                  <input
                    type="color"
                    value={/^#[0-9a-f]{6}$/i.test(s.color) ? s.color : "#888888"}
                    onChange={(e) => recolorSeries(selectedPanel.id, s.id, e.target.value)}
                    className="h-5 w-6 shrink-0 cursor-pointer rounded border border-line bg-transparent"
                  />
                  <span className="flex-1 truncate text-2xs text-ink">
                    {s.label || s.role}
                    {s.isFill ? " · fill" : ""}
                    {s.hasMarker ? " · marker" : ""}
                  </span>
                  <span className="text-2xs text-faint">{s.elementIds.length}×</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {LEVELS.map((lv) => {
                    const active = s.emphasis === lv.id;
                    return (
                      <button
                        key={lv.id}
                        title={t(lv.hintKey)}
                        onClick={() => setSeriesEmphasis(selectedPanel.id, s.id, lv.id)}
                        className={`rounded px-1 py-1 text-[10px] ${
                          active ? "bg-accent text-white" : "bg-panel text-muted ring-1 ring-line hover:text-ink"
                        }`}
                      >
                        {t(lv.tkey)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
