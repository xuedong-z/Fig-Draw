"use client";

import type { TypographySettings } from "@/lib/types";

/** Nature submission guideline values (sans-serif, 5–7 pt, ≥0.25 pt lines).
 * Shared by Typography (reset/hints), Axis (size hints) and Content (line-width hint). */
export const NATURE_PRESET: TypographySettings = {
  fontFamily: "Arial",
  axisLabelPt: 7,
  tickLabelPt: 6,
  legendPt: 6,
  titlePt: 7,
  dataLineWidthPt: 1.0,
  axisLineWidthPt: 0.5,
  tickLineWidthPt: 0.5
};

/** A labelled numeric input with an optional "Nature {n}" guideline chip. Shared
 * across Axis / Content / Typography so the same control looks identical everywhere. */
export function NumRow({
  label,
  value,
  step = 0.5,
  min = 0,
  hint,
  onChange
}: {
  label: string;
  value: number;
  step?: number;
  min?: number;
  hint?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-2xs text-muted">
      <span className="flex flex-1 items-center gap-1.5">
        {label}
        {hint && (
          <span className="rounded bg-accent/15 px-1 text-[9px] font-medium text-accent">Nature {hint}</span>
        )}
      </span>
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
