"use client";

import { useState } from "react";
import { Eye, EyeOff, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import type { DataSeries, Panel } from "@/lib/types";

const STEP = 6; // px nudge per click (panel/figure coords)

/** One legend entry = a series' swatch color + editable label text + show/hide +
 * position nudge. Keyed by panel:series in the parent so switching panels re-inits the
 * local text (mergeSeries keeps prev.label, so binding straight to series.label would
 * fight the input). */
function LegendRow({ panel, s }: { panel: Panel; s: DataSeries }) {
  const t = useT();
  const recolorSeries = useStore((st) => st.recolorSeries);
  const setElementText = useStore((st) => st.setElementText);
  const hideElement = useStore((st) => st.hideElement);
  const nudgeElements = useStore((st) => st.nudgeElements);
  const [text, setText] = useState(s.label ?? "");

  const swatchEl = panel.elements.find((e) => e.scid === s.legendElementId);
  const hidden = swatchEl?.hidden ?? false;
  const ids = [s.legendElementId, s.legendTextId].filter(Boolean) as string[];
  const toggleHide = () => ids.forEach((scid) => hideElement(panel.id, scid, !hidden));
  const nudge = (dx: number, dy: number) => nudgeElements(panel.id, ids, dx, dy);

  return (
    <div className="rounded-md border border-line bg-elevated p-1.5">
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(s.color) ? s.color : "#888888"}
          onChange={(e) => recolorSeries(panel.id, s.id, e.target.value)}
          className="h-5 w-6 shrink-0 cursor-pointer rounded border border-line bg-transparent"
          title={t("tune.color")}
        />
        <input
          className="input-dark min-w-0 flex-1"
          value={text}
          disabled={!s.legendTextId}
          placeholder={s.role}
          onChange={(e) => {
            setText(e.target.value);
            if (s.legendTextId) setElementText(panel.id, s.legendTextId, e.target.value);
          }}
        />
        <button
          className="tool-btn shrink-0 px-1.5"
          onClick={toggleHide}
          title={hidden ? t("tip.show") : t("tip.hide")}
        >
          {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </div>
      <div className="mt-1.5 flex items-center gap-1">
        <span className="mr-1 text-[10px] text-faint">{t("legend.move")}</span>
        <button className="tool-btn px-1.5" onClick={() => nudge(-STEP, 0)} title="←">
          <ChevronLeft size={12} />
        </button>
        <button className="tool-btn px-1.5" onClick={() => nudge(0, -STEP)} title="↑">
          <ChevronUp size={12} />
        </button>
        <button className="tool-btn px-1.5" onClick={() => nudge(0, STEP)} title="↓">
          <ChevronDown size={12} />
        </button>
        <button className="tool-btn px-1.5" onClick={() => nudge(STEP, 0)} title="→">
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

/** "Legend" tab — surfaces each paired legend entry for direct editing, built from
 * existing series data + actions (recolorSeries / setElementText / hideElement /
 * nudgeElements). */
export function LegendPanel() {
  const t = useT();
  const panels = useStore((s) => s.panels);
  const selectedPanelId = useStore((s) => s.selectedPanelId);
  const setRightTab = useStore((s) => s.setRightTab);

  const panel = panels.find((p) => p.id === selectedPanelId) ?? null;
  const series = panel
    ? [...panel.series].filter((s) => s.legendElementId).sort((a, b) => a.order - b.order)
    : [];

  return (
    <div className="p-3">
      <div className="panel-title mb-1">
        {t("legend.title")} {panel ? `· ${panel.label}` : ""}
      </div>
      <p className="mb-3 text-2xs text-faint">{t("legend.desc")}</p>

      {!panel && <div className="text-2xs text-faint">{t("legend.selectPanel")}</div>}
      {panel && series.length === 0 && <div className="text-2xs text-faint">{t("legend.none")}</div>}

      <div className="flex flex-col gap-1.5">
        {panel && series.map((s) => <LegendRow key={`${panel.id}:${s.id}`} panel={panel} s={s} />)}
      </div>

      {panel && series.length > 0 && (
        <p className="mt-3 border-t border-line pt-2 text-[10px] text-faint">
          {t("legend.footHint")}{" "}
          <button className="text-accent hover:underline" onClick={() => setRightTab("type")}>
            {t("tab.type")}
          </button>
          {" · "}
          <button className="text-accent hover:underline" onClick={() => setRightTab("tune")}>
            {t("tab.tune")}
          </button>
        </p>
      )}
    </div>
  );
}
