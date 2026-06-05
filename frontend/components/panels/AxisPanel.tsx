"use client";

import { Eraser, Wand2 } from "lucide-react";
import { useStore, type AxisFrameStyle } from "@/lib/store";
import { useT } from "@/lib/i18n";
import type { TypographySettings } from "@/lib/types";
import { NumRow, NATURE_PRESET } from "./_shared";

const FRAMES: { v: AxisFrameStyle; tkey: string; tipKey: string }[] = [
  { v: "original", tkey: "frame.original", tipKey: "tip.frame.original" },
  { v: "full", tkey: "frame.full", tipKey: "tip.frame.full" },
  { v: "half", tkey: "frame.half", tipKey: "tip.frame.half" },
  { v: "none", tkey: "frame.none", tipKey: "tip.frame.none" }
];

export function AxisPanel() {
  const t = useT();
  const panelCount = useStore((s) => s.panels.length);
  const axisFrame = useStore((s) => s.axisFrame);
  const setAxisFrame = useStore((s) => s.setAxisFrame);
  const setTickDirection = useStore((s) => s.setTickDirection);
  const tickVisX = useStore((s) => s.tickVisX);
  const tickVisY = useStore((s) => s.tickVisY);
  const setTickVisible = useStore((s) => s.setTickVisible);
  const axisLabelGap = useStore((s) => s.axisLabelGap);
  const setAxisLabelGap = useStore((s) => s.setAxisLabelGap);
  const tickLength = useStore((s) => s.tickLength);
  const setTickLength = useStore((s) => s.setTickLength);
  const tickLabelGap = useStore((s) => s.tickLabelGap);
  const setTickLabelGap = useStore((s) => s.setTickLabelGap);
  const centerAxisTitles = useStore((s) => s.centerAxisTitles);
  const bgTransparent = useStore((s) => s.bgTransparent);
  const setBackgroundTransparent = useStore((s) => s.setBackgroundTransparent);
  const typography = useStore((s) => s.typography);
  const setTypography = useStore((s) => s.setTypography);
  const unifyTypography = useStore((s) => s.unifyTypography);
  const up = <K extends keyof TypographySettings>(k: K, v: TypographySettings[K]) =>
    setTypography({ [k]: v } as Partial<TypographySettings>);

  if (!panelCount) return <div className="p-3 text-2xs text-faint">{t("axis.importHint")}</div>;

  return (
    <div className="p-3">
      <div className="panel-title mb-2">{t("axis.title")}</div>

      <label className="field-label">{t("axis.frame")}</label>
      <div className="mb-3 grid grid-cols-4 gap-1">
        {FRAMES.map((f) => (
          <button
            key={f.v}
            title={t(f.tipKey)}
            onClick={() => setAxisFrame(f.v)}
            className={`chip justify-center ${axisFrame === f.v ? "chip-on" : ""}`}
          >
            {t(f.tkey)}
          </button>
        ))}
      </div>

      <label className="field-label">{t("axis.tickDir")}</label>
      <div className="mb-3 grid grid-cols-2 gap-1">
        <button className="chip justify-center" onClick={() => setTickDirection("in")} title={t("tip.tickDirIn")}>
          {t("act.inward")}
        </button>
        <button className="chip justify-center" onClick={() => setTickDirection("out")} title={t("tip.tickDirOut")}>
          {t("act.outward")}
        </button>
      </div>

      <label className="field-label">{t("axis.tickMarks")}</label>
      <div className="mb-3 grid grid-cols-2 gap-1">
        <button
          className={`chip justify-center ${tickVisX ? "chip-on" : ""}`}
          onClick={() => setTickVisible("x", !tickVisX)}
          title={t("tip.xticks")}
        >
          {t("axis.xticks")}
        </button>
        <button
          className={`chip justify-center ${tickVisY ? "chip-on" : ""}`}
          onClick={() => setTickVisible("y", !tickVisY)}
          title={t("tip.yticks")}
        >
          {t("axis.yticks")}
        </button>
      </div>

      <label className="field-label">{t("axis.tickLen")} · {tickLength}px</label>
      <input
        type="range"
        min={1}
        max={16}
        step={0.5}
        value={tickLength}
        onChange={(e) => setTickLength(Number(e.target.value))}
        className="mb-3 w-full"
        title={t("tip.tickLen")}
      />

      <label className="field-label">{t("axis.tickLabelGap")} · {tickLabelGap}px</label>
      <input
        type="range"
        min={2}
        max={48}
        step={1}
        value={tickLabelGap}
        onChange={(e) => setTickLabelGap(Number(e.target.value))}
        className="mb-3 w-full"
        title={t("tip.tickLabelGap")}
      />

      <label className="field-label">{t("axis.titleGap")} · {axisLabelGap}px</label>
      <input
        type="range"
        min={4}
        max={64}
        step={1}
        value={axisLabelGap}
        onChange={(e) => setAxisLabelGap(Number(e.target.value))}
        className="mb-3 w-full"
        title={t("tip.titleGap")}
      />

      <button
        className="chip mb-3 w-full justify-center"
        onClick={() => centerAxisTitles()}
        title={t("tip.centerTitles")}
      >
        {t("axis.centerTitles")}
      </button>

      <button
        className={`chip w-full justify-center ${bgTransparent ? "chip-on" : ""}`}
        onClick={() => setBackgroundTransparent(!bgTransparent)}
        title={t("tip.transparentBg")}
      >
        <Eraser size={13} /> {t("axis.transparentBg")}
      </button>

      {/* axis & tick sizes (global typography fields; applied on Typography → Unify) */}
      <div className="mt-4 border-t border-line pt-3">
        <div className="field-label mb-1">{t("axis.sizes")}</div>
        <div className="flex flex-col gap-1.5">
          <NumRow label={t("type.axisLabel")} value={typography.axisLabelPt} hint={`${NATURE_PRESET.axisLabelPt}`} onChange={(v) => up("axisLabelPt", v)} />
          <NumRow label={t("type.tickLabel")} value={typography.tickLabelPt} hint={`${NATURE_PRESET.tickLabelPt}`} onChange={(v) => up("tickLabelPt", v)} />
          <NumRow label={t("type.axisFrame")} value={typography.axisLineWidthPt} step={0.1} hint={`${NATURE_PRESET.axisLineWidthPt}`} onChange={(v) => up("axisLineWidthPt", v)} />
          <NumRow label={t("type.tick")} value={typography.tickLineWidthPt} step={0.1} hint={`${NATURE_PRESET.tickLineWidthPt}`} onChange={(v) => up("tickLineWidthPt", v)} />
        </div>
        <p className="mt-1 text-[10px] text-faint">{t("axis.sizesHint")}</p>
        <button className="tool-btn tool-btn-primary mt-2 w-full justify-center" onClick={unifyTypography}>
          <Wand2 size={14} /> {t("type.unify")}
        </button>
      </div>
    </div>
  );
}
