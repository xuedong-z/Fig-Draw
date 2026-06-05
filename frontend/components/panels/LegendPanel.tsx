"use client";

import { useState } from "react";
import { Eye, EyeOff, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Minus, Plus } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import type { DataSeries, Panel } from "@/lib/types";

const STEP = 6; // px per move click
const GAP_STEP = 3; // px per spacing click

/** One legend entry: color + editable label + show/hide. The whole legend moves and
 * spaces as a group via the controls below (not per-item). */
function LegendRow({ panel, s }: { panel: Panel; s: DataSeries }) {
  const t = useT();
  const recolorSeries = useStore((st) => st.recolorSeries);
  const setElementText = useStore((st) => st.setElementText);
  const hideElement = useStore((st) => st.hideElement);
  const [text, setText] = useState(s.label ?? "");

  const swatchEl = panel.elements.find((e) => e.scid === s.legendElementId);
  const hidden = swatchEl?.hidden ?? false;
  const ids = [s.legendElementId, s.legendTextId].filter(Boolean) as string[];
  const toggleHide = () => ids.forEach((scid) => hideElement(panel.id, scid, !hidden));

  return (
    <div className="flex items-center gap-2 rounded-md border border-line bg-elevated p-1.5">
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
  );
}

/** "Legend" tab — edit each entry's color/label/visibility, move the WHOLE legend as a
 * group, and adjust the spacing between entries. Built on recolorSeries / setElementText
 * / hideElement / nudgeElements / setLegendSpacing. */
export function LegendPanel() {
  const t = useT();
  const panels = useStore((s) => s.panels);
  const selectedPanelId = useStore((s) => s.selectedPanelId);
  const setRightTab = useStore((s) => s.setRightTab);
  const nudgeElements = useStore((s) => s.nudgeElements);
  const setLegendSpacing = useStore((s) => s.setLegendSpacing);

  const panel = panels.find((p) => p.id === selectedPanelId) ?? null;
  const series = panel
    ? [...panel.series].filter((s) => s.legendElementId).sort((a, b) => a.order - b.order)
    : [];
  const allScids = series.flatMap((s) => [s.legendElementId, s.legendTextId].filter(Boolean) as string[]);
  const moveAll = (dx: number, dy: number) => panel && nudgeElements(panel.id, allScids, dx, dy);

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
        <>
          {/* move the whole legend as a group */}
          <div className="mt-3 border-t border-line pt-3">
            <div className="field-label mb-1">{t("legend.moveAll")}</div>
            <div className="flex items-center gap-1">
              <button className="tool-btn px-1.5" onClick={() => moveAll(-STEP, 0)} title="←">
                <ChevronLeft size={13} />
              </button>
              <button className="tool-btn px-1.5" onClick={() => moveAll(0, -STEP)} title="↑">
                <ChevronUp size={13} />
              </button>
              <button className="tool-btn px-1.5" onClick={() => moveAll(0, STEP)} title="↓">
                <ChevronDown size={13} />
              </button>
              <button className="tool-btn px-1.5" onClick={() => moveAll(STEP, 0)} title="→">
                <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* spacing between entries */}
          {series.length > 1 && (
            <div className="mt-3">
              <div className="field-label mb-1">{t("legend.spacing")}</div>
              <div className="flex items-center gap-1">
                <button
                  className="tool-btn flex-1 justify-center"
                  onClick={() => setLegendSpacing(panel.id, -GAP_STEP)}
                  title={t("legend.tighter")}
                >
                  <Minus size={13} />
                </button>
                <button
                  className="tool-btn flex-1 justify-center"
                  onClick={() => setLegendSpacing(panel.id, GAP_STEP)}
                  title={t("legend.looser")}
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
          )}

          <p className="mt-3 border-t border-line pt-2 text-[10px] text-faint">
            {t("legend.footHint")}{" "}
            <button className="text-accent hover:underline" onClick={() => setRightTab("type")}>
              {t("tab.type")}
            </button>
          </p>
        </>
      )}
    </div>
  );
}
