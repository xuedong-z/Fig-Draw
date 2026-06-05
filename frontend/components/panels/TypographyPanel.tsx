"use client";

import { Wand2, RotateCcw } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import type { PanelLabelStyle, TypographySettings } from "@/lib/types";
import { NumRow, NATURE_PRESET } from "./_shared";

const FONTS = ["Arial", "Helvetica", "Helvetica Neue", "Calibri", "Times New Roman", "Georgia"];

/** "Typography & labels" tab — figure-wide font family, the title & legend sizes
 * (the per-object axis/tick sizes live in Axis, the data line width in Content), the
 * Reset/Unify actions (the single canonical place that writes the whole typography
 * object), and panel-label styling. */
export function TypographyPanel() {
  const t = useT();
  const typography = useStore((s) => s.typography);
  const setTypography = useStore((s) => s.setTypography);
  const unifyTypography = useStore((s) => s.unifyTypography);
  const labelStyle = useStore((s) => s.labelStyle);
  const setLabelStyle = useStore((s) => s.setLabelStyle);
  const hasPanels = useStore((s) => s.panels.length > 0);

  const up = <K extends keyof TypographySettings>(k: K, v: TypographySettings[K]) =>
    setTypography({ [k]: v } as Partial<TypographySettings>);
  const l = <K extends keyof PanelLabelStyle>(k: K, v: PanelLabelStyle[K]) =>
    setLabelStyle({ [k]: v } as Partial<PanelLabelStyle>);

  return (
    <div className="p-3">
      <div className="panel-title mb-1">{t("type.title")}</div>
      <p className="mb-3 text-2xs text-faint">{t("type.desc")}</p>

      <label className="field-label">{t("type.fontFamily")}</label>
      <select
        className="input-dark mb-3 w-full"
        value={typography.fontFamily}
        onChange={(e) => up("fontFamily", e.target.value)}
      >
        {FONTS.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>

      <div className="field-label mb-1">{t("type.fontSize")}</div>
      <div className="mb-3 flex flex-col gap-1.5">
        <NumRow label={t("type.titleRow")} value={typography.titlePt} hint={`${NATURE_PRESET.titlePt}`} onChange={(v) => up("titlePt", v)} />
        <NumRow label={t("type.legend")} value={typography.legendPt} hint={`${NATURE_PRESET.legendPt}`} onChange={(v) => up("legendPt", v)} />
      </div>

      <div className="field-label mb-1">{t("type.lineWidth")}</div>
      <div className="mb-3 flex flex-col gap-1.5">
        <NumRow label={t("type.dataLine")} value={typography.dataLineWidthPt} step={0.1} hint={`${NATURE_PRESET.dataLineWidthPt}`} onChange={(v) => up("dataLineWidthPt", v)} />
      </div>

      <div className="flex gap-2">
        <button
          className="tool-btn justify-center px-2"
          onClick={() => setTypography(NATURE_PRESET)}
          title={t("tip.reset")}
        >
          <RotateCcw size={13} />
        </button>
        <button
          className="tool-btn tool-btn-primary flex-1 justify-center"
          onClick={unifyTypography}
          disabled={!hasPanels}
        >
          <Wand2 size={14} /> {t("type.unify")}
        </button>
      </div>

      {/* Panel labels */}
      <div className="mt-4 border-t border-line pt-3">
        <div className="panel-title mb-2">{t("type.panelLabels")}</div>
        <div className="mb-2">
          <label className="field-label">{t("type.format")}</label>
          <select
            className="input-dark w-full"
            value={labelStyle.format}
            onChange={(e) => l("format", e.target.value as PanelLabelStyle["format"])}
          >
            <option value="(a)">(a)</option>
            <option value="(A)">(A)</option>
            <option value="a">a</option>
            <option value="A">A</option>
            <option value="none">none</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <NumRow label={t("type.sizePt")} value={labelStyle.fontSizePt} onChange={(v) => l("fontSizePt", v)} />
          <NumRow label={t("type.gapPx")} value={labelStyle.offsetPx} min={0} step={1} onChange={(v) => l("offsetPx", v)} />
        </div>
        <div className="mt-2 flex items-center gap-3 text-2xs text-muted">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={labelStyle.bold} onChange={(e) => l("bold", e.target.checked)} />
            {t("type.bold")}
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={labelStyle.whiteBacking} onChange={(e) => l("whiteBacking", e.target.checked)} />
            {t("type.whiteBacking")}
          </label>
          <label className="ml-auto flex items-center gap-1.5">
            <input
              type="color"
              value={labelStyle.color}
              onChange={(e) => l("color", e.target.value)}
              className="h-5 w-6 cursor-pointer rounded border border-line bg-transparent"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
