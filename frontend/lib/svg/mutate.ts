/**
 * Write side of the engine: apply recoloring (Module E), emphasis (Module F)
 * and typography unification (Module G) to a panel's SVG string.
 *
 * All functions take an SVG string, mutate a parsed copy with the unified style
 * accessor, and return a new string. The panel's React model is updated
 * separately by the store, so these stay pure string->string transforms.
 */
import type { DataSeries, Emphasis, TypographySettings } from "../types";
import { classifyColor, recolorToHue } from "./colorUtils";
import { getStyleValue, setStyleValue } from "./styleAccessor";

const AUX_GRAY = "#9aa0a6";

function openDoc(svg: string): { root: SVGSVGElement; serialize: () => string } {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement as unknown as SVGSVGElement;
  return { root, serialize: () => new XMLSerializer().serializeToString(root) };
}

function byScid(root: Element, scid: string): Element | null {
  return root.querySelector(`[data-scid="${CSS.escape(scid)}"]`);
}

function gradientUrlId(fill: string | null): string | null {
  const m = fill?.match(/url\(["']?#([^)"']+)["']?\)/);
  return m ? m[1] : null;
}

/** Recolor every stop of a gradient, preserving each stop's own lightness. */
function recolorGradient(root: Element, gradId: string, color: string): void {
  const grad = root.querySelector(`#${CSS.escape(gradId)}`);
  if (!grad) return;
  grad.querySelectorAll("stop").forEach((stop) => {
    const cur = getStyleValue(stop, "stop-color") ?? "#888888";
    setStyleValue(stop, "stop-color", recolorToHue(cur, color));
  });
}

/** Recolor one element's data-colored stroke/fill/gradient to `color`. */
function recolorElement(root: Element, el: Element, color: string): void {
  const stroke = getStyleValue(el, "stroke");
  if (classifyColor(stroke) === "data") setStyleValue(el, "stroke", color);

  const fill = getStyleValue(el, "fill");
  const gradId = gradientUrlId(fill);
  if (gradId) {
    recolorGradient(root, gradId, color); // fill-opacity preserved (untouched)
  } else if (classifyColor(fill) === "data") {
    setStyleValue(el, "fill", color); // keep fill-opacity as-is
  }
}

/** Module E — recolor a whole series (and its legend swatch, kept in sync). */
export function recolorSeries(svg: string, series: DataSeries, color: string): string {
  const { root, serialize } = openDoc(svg);
  for (const id of series.elementIds) {
    const el = byScid(root, id);
    if (el) recolorElement(root, el, color);
  }
  if (series.legendElementId) {
    const leg = byScid(root, series.legendElementId);
    if (leg) recolorElement(root, leg, color);
  }
  return serialize();
}

/** Module D2 — change an element's role (persisted as data-scrole). */
export function setElementRole(svg: string, scid: string, role: string): string {
  const { root, serialize } = openDoc(svg);
  const el = byScid(root, scid);
  if (el) el.setAttribute("data-scrole", role);
  return serialize();
}

/**
 * Module F — apply emphasis visuals for a single series. Deterministic (no
 * compounding): width is derived from the unified data line width.
 */
export function applyEmphasisToDoc(
  root: Element,
  series: DataSeries,
  emphasis: Emphasis,
  baseWidthPt: number
): void {
  const cfg = emphasisConfig(emphasis, baseWidthPt);
  for (const id of series.elementIds) {
    const el = byScid(root, id);
    if (!el) continue;

    // color: auxiliary -> gray, otherwise restore the series color
    recolorElement(root, el, emphasis === "auxiliary" ? AUX_GRAY : series.color);

    setStyleValue(el, "opacity", String(cfg.opacity));
    if (getStyleValue(el, "stroke") && classifyColor(getStyleValue(el, "stroke")) !== null) {
      setStyleValue(el, "stroke-width", String(cfg.width));
    }
    if (cfg.dash) setStyleValue(el, "stroke-dasharray", cfg.dash);
    else if (getStyleValue(el, "stroke-dasharray")) setStyleValue(el, "stroke-dasharray", "none");

    // z-order
    const parent = el.parentNode;
    if (parent) {
      if (emphasis === "primary") parent.appendChild(el);
      else if (emphasis === "auxiliary" && parent.firstChild) parent.insertBefore(el, parent.firstChild);
    }
  }

  // keep the legend swatch's color in step with the series
  if (series.legendElementId) {
    const leg = byScid(root, series.legendElementId);
    if (leg) recolorElement(root, leg, emphasis === "auxiliary" ? AUX_GRAY : series.color);
  }
}

export function applyEmphasis(svg: string, series: DataSeries, emphasis: Emphasis, baseWidthPt: number): string {
  const { root, serialize } = openDoc(svg);
  applyEmphasisToDoc(root, series, emphasis, baseWidthPt);
  return serialize();
}

function emphasisConfig(e: Emphasis, base: number) {
  switch (e) {
    case "primary":
      return { opacity: 1, width: round(base * 1.3), dash: "" };
    case "secondary":
      return { opacity: 0.6, width: round(base * 0.75), dash: "" };
    case "auxiliary":
      return { opacity: 0.5, width: round(base * 0.6), dash: "3,3" };
    default:
      return { opacity: 1, width: round(base), dash: "" };
  }
}

const FONT_BY_ROLE = (t: TypographySettings) => ({
  "text-axis": t.axisLabelPt,
  "text-tick": t.tickLabelPt,
  "text-legend": t.legendPt,
  "text-title": t.titlePt
});

const WIDTH_BY_ROLE = (t: TypographySettings) => ({
  axis: t.axisLineWidthPt,
  tick: t.tickLineWidthPt,
  data: t.dataLineWidthPt
});

/**
 * Module G — unify font/size/line-width by role. `elements` carries the role
 * map; we read data-scrole from the live nodes as the authority.
 */
export function unifyTypography(svg: string, typography: TypographySettings): string {
  const { root, serialize } = openDoc(svg);
  const fontByRole = FONT_BY_ROLE(typography);
  const widthByRole = WIDTH_BY_ROLE(typography);

  root.querySelectorAll("[data-scrole]").forEach((el) => {
    const role = el.getAttribute("data-scrole") || "";
    if (el.tagName.toLowerCase() === "text") {
      setStyleValue(el, "font-family", typography.fontFamily);
      const size = (fontByRole as Record<string, number>)[role];
      if (size) setStyleValue(el, "font-size", `${size}px`);
    }
    const w = (widthByRole as Record<string, number>)[role];
    if (w != null && getStyleValue(el, "stroke")) {
      setStyleValue(el, "stroke-width", String(w));
    }
  });
  return serialize();
}

/** Set a single style property on a single element (single-element tuning). */
export function setElementStyle(svg: string, scid: string, prop: string, value: string): string {
  const { root, serialize } = openDoc(svg);
  const el = byScid(root, scid);
  if (el) setStyleValue(el, prop, value);
  return serialize();
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Read back the current resolved color of an element (for the tuning panel). */
export function readElementColor(svg: string, scid: string): { stroke: string | null; fill: string | null } {
  const { root } = openDoc(svg);
  const el = byScid(root, scid);
  if (!el) return { stroke: null, fill: null };
  return { stroke: getStyleValue(el, "stroke"), fill: getStyleValue(el, "fill") };
}
