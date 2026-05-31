/**
 * Module D1 — rule-based element role recognition (no AI).
 *
 * Strategy follows the spec: *structure* elements (background, axis/frame,
 * ticks, grid, text) have crisp signatures and must be classified reliably.
 * *Data semantics* (which line is a fit / auxiliary / the important one) are
 * only guessed, and are expected to be corrected by the user (Module D2).
 *
 * Signals used: color class (gray/black = structure, saturated = data), stroke
 * width, geometric length, bbox position relative to the plot frame, marker
 * presence, and id/class hints from the source <g> (tick/axis/grid/legend/...).
 */
import type { BBox, ElementRole, ParsedElement } from "../types";
import { classifyColor } from "./colorUtils";

export interface RoleContext {
  figure: BBox; // union bbox of everything
  plot: BBox; // estimated plot/axes area
}

function area(b: BBox): number {
  return Math.max(0, b.w) * Math.max(0, b.h);
}
function union(a: BBox, b: BBox): BBox {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}
function near(v: number, target: number, tol: number): boolean {
  return Math.abs(v - target) <= tol;
}

/** id/class hint matching, walking up via the element's recorded hint string. */
function hint(el: ParsedElement, re: RegExp): boolean {
  return re.test(el.scid) || (el.idHint ? re.test(el.idHint) : false);
}

const NUMERIC_TEXT = /^[\s]*[−\-+]?[\d.,]+\s*(?:[%‰]|°|×?10|cm|mm|nm|µm|s|h|V|A|mAh|Hz)?\s*$/;

/** Compute the figure & plot frame from raw elements (pass 1). */
export function computeContext(els: ParsedElement[]): RoleContext {
  let figure: BBox | null = null;
  for (const e of els) {
    if (area(e.bbox) <= 0) continue;
    figure = figure ? union(figure, e.bbox) : { ...e.bbox };
  }
  const fig = figure ?? { x: 0, y: 0, w: 100, h: 100 };

  // Plot area = the largest light rectangle (typical plot background) that is
  // *not* the whole-figure (page) background, else the bbox spanned by long
  // dark "spine" lines, else the figure bbox.
  const figArea = area(fig);
  let plot: BBox | null = null;
  let bestBgArea = 0;
  for (const e of els) {
    const cls = classifyColor(e.fill);
    const a = area(e.bbox);
    const big = a > 0.18 * figArea;
    const notWholeFigure = a < 0.9 * figArea; // exclude the page background
    const lightish = cls === "white" || cls === "gray";
    if ((e.tag === "rect" || e.tag === "path") && big && notWholeFigure && lightish && a > bestBgArea) {
      bestBgArea = a;
      plot = { ...e.bbox };
    }
  }
  if (!plot) {
    // derive from long dark lines (axis spines)
    let frame: BBox | null = null;
    for (const e of els) {
      const cls = classifyColor(e.stroke);
      const long = Math.max(e.bbox.w, e.bbox.h) > 0.5 * Math.max(fig.w, fig.h);
      if ((cls === "black" || cls === "gray") && long) frame = frame ? union(frame, e.bbox) : { ...e.bbox };
    }
    plot = frame ?? fig;
  }
  return { figure: fig, plot };
}

/** Assign a role to a single element given context. */
export function classifyElement(e: ParsedElement, ctx: RoleContext): ElementRole {
  const { plot, figure } = ctx;
  const plotMax = Math.max(plot.w, plot.h) || 1;
  const strokeCls = classifyColor(e.stroke);
  const fillCls = classifyColor(e.fill);
  const len = Math.max(e.bbox.w, e.bbox.h);
  const isAchroStroke = strokeCls === "black" || strokeCls === "gray";

  // ---- Text -------------------------------------------------------------
  if (e.tag === "text") {
    const cx = e.bbox.x + e.bbox.w / 2;
    const cy = e.bbox.y + e.bbox.h / 2;
    const txt = (e.text ?? "").trim();
    if (hint(e, /legend/i)) return "text-legend";
    if (hint(e, /title/i)) return "text-title";
    // title: above the plot, horizontally central
    if (cy < plot.y && Math.abs(cx - (plot.x + plot.w / 2)) < plot.w * 0.35 && txt.length > 0) {
      return "text-title";
    }
    // numeric + near an axis -> tick label
    const nearLeft = cx < plot.x + plot.w * 0.08;
    const nearBottom = cy > plot.y + plot.h * 0.92;
    if (NUMERIC_TEXT.test(txt)) return "text-tick";
    // long-ish text hugging the left or bottom edge -> axis label
    if (nearLeft || nearBottom) return "text-axis";
    // text sitting inside the plot near a corner -> likely legend
    const insidePlot = cx > plot.x && cx < plot.x + plot.w && cy > plot.y && cy < plot.y + plot.h;
    if (insidePlot) return "text-legend";
    return "text-axis";
  }

  // ---- Background -------------------------------------------------------
  if ((e.tag === "rect" || e.tag === "path") && area(e.bbox) > 0.45 * area(figure)) {
    if (fillCls === "white" || fillCls === "gray") return "background";
  }

  // ---- Legend swatch (non-text legend children) ------------------------
  // Legend *text* is handled above; any other drawable carrying a `legend`
  // id/class hint is a swatch/box and must not be counted as a data series.
  if (hint(e, /legend/i)) return "legend";

  // ---- Grid (id hint is very reliable for matplotlib) -------------------
  if (hint(e, /grid/i)) return "grid";
  // light gray thin long lines crossing the interior = grid
  if (isAchroStroke && strokeCls === "gray" && len > 0.6 * plotMax && (e.strokeWidth ?? 1) <= 1) {
    const onLeftEdge = near(e.bbox.x, plot.x, plot.w * 0.04) && e.bbox.h > e.bbox.w;
    const onBottomEdge = near(e.bbox.y + e.bbox.h, plot.y + plot.h, plot.h * 0.04) && e.bbox.w > e.bbox.h;
    if (!onLeftEdge && !onBottomEdge) return "grid";
  }

  // ---- Tick marks ------------------------------------------------------
  // Checked *before* axis: matplotlib nests ticks under a group named
  // "matplotlib.axis_N", so a generic axis hint would otherwise claim them.
  if (hint(e, /tick/i) && isAchroStroke) return "tick";
  if (isAchroStroke && len < plotMax * 0.04 && len > 0.2) {
    const nearBottom = near(e.bbox.y, plot.y + plot.h, plot.h * 0.06);
    const nearTop = near(e.bbox.y, plot.y, plot.h * 0.06);
    const nearLeft = near(e.bbox.x, plot.x, plot.w * 0.06);
    const nearRight = near(e.bbox.x, plot.x + plot.w, plot.w * 0.06);
    if (nearBottom || nearTop || nearLeft || nearRight) return "tick";
  }

  // ---- Axis / frame ----------------------------------------------------
  // Bare "axis" is excluded from the hint on purpose: matplotlib's tick
  // container is "matplotlib.axis_N", which is not a spine.
  if (hint(e, /spine|frame|border|outline/i) && isAchroStroke) return "axis";
  if (isAchroStroke && (strokeCls === "black" || strokeCls === "gray")) {
    // a single thin unfilled path/box tracing most of the plot boundary
    // (e.g. matplotlib's L-frame patch) = the axis frame
    const fillEmpty = fillCls !== "white" && fillCls !== "gray";
    const spansPlot = e.bbox.w > 0.7 * plot.w && e.bbox.h > 0.7 * plot.h;
    if (fillEmpty && spansPlot && (e.strokeWidth ?? 1) <= 3) return "axis";

    const horizontalLong = e.bbox.w > 0.55 * plot.w && e.bbox.h < plot.h * 0.04;
    const verticalLong = e.bbox.h > 0.55 * plot.h && e.bbox.w < plot.w * 0.04;
    const atBoundary =
      near(e.bbox.y, plot.y, plot.h * 0.06) ||
      near(e.bbox.y + e.bbox.h, plot.y + plot.h, plot.h * 0.06) ||
      near(e.bbox.x, plot.x, plot.w * 0.06) ||
      near(e.bbox.x + e.bbox.w, plot.x + plot.w, plot.w * 0.06);
    if ((horizontalLong || verticalLong) && atBoundary) return "axis";
  }

  // ---- Error bars (id hint) -------------------------------------------
  if (hint(e, /err|cap/i)) return "errorbar";

  // ---- Data / scatter / fit / auxiliary -------------------------------
  const isData = strokeCls === "data" || fillCls === "data";
  if (isData || e.hasMarker) {
    if (hint(e, /fit/i)) return "fit";
    if (hint(e, /aux|guide|reference|hline|vline/i)) return "auxiliary";
    // many small markers / PathCollection = scatter
    if (e.hasMarker && len < plotMax * 0.1) return "scatter";
    if (hint(e, /collection|scatter/i)) return "scatter";
    return "data";
  }

  // gray dashed straight line in the interior = auxiliary guide
  if (isAchroStroke && e.strokeDasharray && e.strokeDasharray !== "none") return "auxiliary";

  return "decoration";
}

export function assignRoles(els: ParsedElement[]): RoleContext {
  const ctx = computeContext(els);
  for (const e of els) {
    if (e.role && e.role !== "unknown") continue; // respect pre-set (e.g. from data attr)
    e.role = classifyElement(e, ctx);
  }
  return ctx;
}
