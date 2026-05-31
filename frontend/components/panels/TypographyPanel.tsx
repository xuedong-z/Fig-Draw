"use client";

import { Wand2 } from "lucide-react";
import { useStore } from "@/lib/store";
import type { PanelLabelStyle, TypographySettings } from "@/lib/types";

const FONTS = ["Arial", "Helvetica", "Helvetica Neue", "Calibri", "Times New Roman", "Georgia"];

function NumRow({
  label,
  value,
  step = 0.5,
  min = 0,
  onChange
}: {
  label: string;
  value: number;
  step?: number;
  min?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-2xs text-muted">
      <span className="flex-1">{label}</span>
      <input
        type="number"
        className="input-dark w-16"
        value={value}
        step={step}
        min={min}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function TypographyPanel() {
  const typography = useStore((s) => s.typography);
  const setTypography = useStore((s) => s.setTypography);
  const unifyTypography = useStore((s) => s.unifyTypography);
  const labelStyle = useStore((s) => s.labelStyle);
  const setLabelStyle = useStore((s) => s.setLabelStyle);
  const hasPanels = useStore((s) => s.panels.length > 0);

  const t = <K extends keyof TypographySettings>(k: K, v: TypographySettings[K]) =>
    setTypography({ [k]: v } as Partial<TypographySettings>);
  const l = <K extends keyof PanelLabelStyle>(k: K, v: PanelLabelStyle[K]) =>
    setLabelStyle({ [k]: v } as Partial<PanelLabelStyle>);

  return (
    <div className="p-3">
      <div className="panel-title mb-1">Typography</div>
      <p className="mb-3 text-2xs text-faint">
        Set targets by role, then apply to unify every panel&apos;s fonts and line weights.
      </p>

      <label className="field-label">Font family</label>
      <select
        className="input-dark mb-3 w-full"
        value={typography.fontFamily}
        onChange={(e) => t("fontFamily", e.target.value)}
      >
        {FONTS.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>

      <div className="field-label mb-1">Font size (pt)</div>
      <div className="mb-3 flex flex-col gap-1.5">
        <NumRow label="Axis label" value={typography.axisLabelPt} onChange={(v) => t("axisLabelPt", v)} />
        <NumRow label="Tick label" value={typography.tickLabelPt} onChange={(v) => t("tickLabelPt", v)} />
        <NumRow label="Legend" value={typography.legendPt} onChange={(v) => t("legendPt", v)} />
        <NumRow label="Title" value={typography.titlePt} onChange={(v) => t("titlePt", v)} />
      </div>

      <div className="field-label mb-1">Line width (pt)</div>
      <div className="mb-3 flex flex-col gap-1.5">
        <NumRow label="Data line" value={typography.dataLineWidthPt} step={0.1} onChange={(v) => t("dataLineWidthPt", v)} />
        <NumRow label="Axis / frame" value={typography.axisLineWidthPt} step={0.1} onChange={(v) => t("axisLineWidthPt", v)} />
        <NumRow label="Tick" value={typography.tickLineWidthPt} step={0.1} onChange={(v) => t("tickLineWidthPt", v)} />
      </div>

      <button
        className="tool-btn tool-btn-primary w-full justify-center"
        onClick={unifyTypography}
        disabled={!hasPanels}
      >
        <Wand2 size={14} /> Apply to all panels
      </button>

      {/* Panel labels */}
      <div className="mt-4 border-t border-line pt-3">
        <div className="panel-title mb-2">Panel labels</div>
        <div className="mb-2 grid grid-cols-2 gap-2">
          <div>
            <label className="field-label">Format</label>
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
          <div>
            <label className="field-label">Position</label>
            <select
              className="input-dark w-full"
              value={labelStyle.position}
              onChange={(e) => l("position", e.target.value as PanelLabelStyle["position"])}
            >
              <option value="tl">Top-left</option>
              <option value="tr">Top-right</option>
              <option value="bl">Bottom-left</option>
              <option value="br">Bottom-right</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <NumRow label="Size (pt)" value={labelStyle.fontSizePt} onChange={(v) => l("fontSizePt", v)} />
        </div>
        <div className="mt-2 flex items-center gap-3 text-2xs text-muted">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={labelStyle.bold}
              onChange={(e) => l("bold", e.target.checked)}
            />
            Bold
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={labelStyle.whiteBacking}
              onChange={(e) => l("whiteBacking", e.target.checked)}
            />
            White backing
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
