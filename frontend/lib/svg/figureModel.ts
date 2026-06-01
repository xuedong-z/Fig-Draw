/**
 * Figure model (Module C5) — reverse-engineer a structured chart model from the
 * parsed elements, so operations like figsize can re-layout from real axis math
 * instead of geometric guessing.
 *
 * The heart of it is axis calibration: pair numeric tick labels with their pixel
 * positions and least-squares fit `pixel = k * value + b`. With that mapping we
 * can convert pixel <-> data value on each axis, recover the data range, and (next
 * step) re-place data/ticks when the plot box is resized.
 */
import type { BBox, ParsedElement } from "../types";

/** A linear pixel<->data calibration for one axis. */
export interface AxisMap {
  k: number; // pixel = k * value + b
  b: number;
  min: number; // data value at the low-pixel plot edge
  max: number; // data value at the high-pixel plot edge
  ticks: { value: number; pixel: number }[];
}

export interface FigureModel {
  plot: BBox; // plot-area box (viewBox coords)
  x: AxisMap | null;
  y: AxisMap | null;
}

/** Parse the leading number out of a tick label ("0.2", "−1", "1.0e3", "40"). */
export function parseTickNumber(text: string | null): number | null {
  if (!text) return null;
  const m = text.replace(/[−–—]/g, "-").match(/-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function uniqByValue(pts: { value: number; pixel: number }[]): { value: number; pixel: number }[] {
  const m = new Map<number, { value: number; pixel: number }>();
  for (const p of pts) if (!m.has(p.value)) m.set(p.value, p);
  return [...m.values()];
}

/** Least-squares fit pixel = k*value + b. Needs ≥2 distinct values. */
function linfit(pts: { value: number; pixel: number }[]): { k: number; b: number } | null {
  const u = uniqByValue(pts);
  if (u.length < 2) return null;
  const n = u.length;
  let sv = 0;
  let sp = 0;
  let svv = 0;
  let svp = 0;
  for (const { value, pixel } of u) {
    sv += value;
    sp += pixel;
    svv += value * value;
    svp += value * pixel;
  }
  const denom = n * svv - sv * sv;
  if (Math.abs(denom) < 1e-9) return null;
  const k = (n * svp - sv * sp) / denom;
  return { k, b: (sp - k * sv) / n };
}

function buildAxis(
  fit: { k: number; b: number },
  pts: { value: number; pixel: number }[],
  pixA: number,
  pixB: number
): AxisMap {
  const va = (pixA - fit.b) / fit.k;
  const vb = (pixB - fit.b) / fit.k;
  return { k: fit.k, b: fit.b, min: Math.min(va, vb), max: Math.max(va, vb), ticks: uniqByValue(pts) };
}

/**
 * Build the structured model from parsed elements + the plot box. X is calibrated
 * from numeric tick labels sitting OUTSIDE the plot below/above; Y from labels
 * OUTSIDE left/right. Returns null axes when calibration isn't possible.
 */
export function buildFigureModel(els: ParsedElement[], plot: BBox): FigureModel {
  const cx = (e: ParsedElement) => e.bbox.x + e.bbox.w / 2;
  const cy = (e: ParsedElement) => e.bbox.y + e.bbox.h / 2;
  const px2 = plot.x + plot.w;
  const py2 = plot.y + plot.h;

  const numeric = els
    .filter((e) => e.role === "text-tick" && !e.hidden)
    .map((e) => ({ e, v: parseTickNumber(e.text) }))
    .filter((o): o is { e: ParsedElement; v: number } => o.v != null);

  // X: tick labels below or above the plot (horizontal axis)
  const xPts = numeric
    .filter(({ e }) => cy(e) > py2 || cy(e) < plot.y)
    .map(({ e, v }) => ({ value: v, pixel: cx(e) }));
  const xFit = linfit(xPts);

  // Y: tick labels left or right of the plot (vertical axis)
  const yPts = numeric
    .filter(({ e }) => cx(e) < plot.x || cx(e) > px2)
    .map(({ e, v }) => ({ value: v, pixel: cy(e) }));
  const yFit = linfit(yPts);

  return {
    plot,
    x: xFit ? buildAxis(xFit, xPts, plot.x, px2) : null,
    y: yFit ? buildAxis(yFit, yPts, plot.y, py2) : null
  };
}
