"use client";

import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import type { Emphasis } from "@/lib/types";

const LEVELS: { id: Emphasis; tkey: string; hintKey: string }[] = [
  { id: "primary", tkey: "emphasis.primary", hintKey: "emphasis.primary.hint" },
  { id: "secondary", tkey: "emphasis.secondary", hintKey: "emphasis.secondary.hint" },
  { id: "auxiliary", tkey: "emphasis.auxiliary", hintKey: "emphasis.auxiliary.hint" },
  { id: "normal", tkey: "emphasis.normal", hintKey: "emphasis.normal.hint" }
];

export function EmphasisPanel() {
  const t = useT();
  const panels = useStore((s) => s.panels);
  const selectedPanelId = useStore((s) => s.selectedPanelId);
  const setSeriesEmphasis = useStore((s) => s.setSeriesEmphasis);

  const selectedPanel = panels.find((p) => p.id === selectedPanelId) ?? null;
  const series = selectedPanel ? [...selectedPanel.series].sort((a, b) => a.order - b.order) : [];

  return (
    <div className="p-3">
      <div className="panel-title mb-1">{t("emp.title")}</div>
      <p className="mb-3 text-2xs text-faint">{t("emp.desc")}</p>

      {!selectedPanel && <div className="text-2xs text-faint">{t("emp.selectPanel")}</div>}
      {selectedPanel && series.length === 0 && (
        <div className="text-2xs text-faint">{t("color.noSeries")}</div>
      )}

      <div className="flex flex-col gap-3">
        {selectedPanel &&
          series.map((s) => (
          <div key={s.id} className="rounded-md border border-line bg-elevated p-2">
            <div className="mb-2 flex items-center gap-2">
              <span
                className="h-3.5 w-3.5 shrink-0 rounded-sm border border-line"
                style={{ background: s.color }}
              />
              <span className="flex-1 truncate text-xs text-ink">{s.label || s.role}</span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {LEVELS.map((lv) => {
                const active = s.emphasis === lv.id;
                return (
                  <button
                    key={lv.id}
                    title={t(lv.hintKey)}
                    onClick={() => setSeriesEmphasis(selectedPanel.id, s.id, lv.id)}
                    className={`rounded px-2 py-1 text-2xs ${
                      active
                        ? "bg-accent text-white"
                        : "bg-panel text-muted ring-1 ring-line hover:text-ink"
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
  );
}
