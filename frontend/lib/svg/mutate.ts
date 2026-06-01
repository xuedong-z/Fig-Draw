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
import { getStyleValue, setStyleValue, removeStyleValue } from "./styleAccessor";

const AUX_GRAY = "#9aa0a6";

/** points -> figure-space px (FIG_PX_PER_MM = 4, so 1pt = 4*25.4/72 px). */
const PT_TO_FIG = (4 * 25.4) / 72; // ≈ 1.41111

/**
 * Combined stretch factor of a panel (its viewBox is rendered into a w×h box
 * with preserveAspectRatio="none"). Typography & line widths are divided by
 * this before being written, so after the stretch they render at a constant
 * figure-space size — identical across panels regardless of panel size.
 * sqrt(sx*sy) keeps the perceived size stable under non-uniform resize.
 */
export function panelScale(vbW: number, vbH: number, w: number, h: number): number {
  const s = Math.sqrt((w / (vbW || 1)) * (h / (vbH || 1)));
  return Math.max(s, 0.05);
}

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
  baseWidthPt: number,
  scale = 1
): void {
  const cfg = emphasisConfig(emphasis, baseWidthPt, scale);
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

export function applyEmphasis(
  svg: string,
  series: DataSeries,
  emphasis: Emphasis,
  baseWidthPt: number,
  scale = 1
): string {
  const { root, serialize } = openDoc(svg);
  applyEmphasisToDoc(root, series, emphasis, baseWidthPt, scale);
  return serialize();
}

function emphasisConfig(e: Emphasis, base: number, scale = 1) {
  const k = PT_TO_FIG / scale; // pt -> compensated figure-px
  switch (e) {
    case "primary":
      return { opacity: 1, width: round(base * 1.3 * k), dash: "" };
    case "secondary":
      return { opacity: 0.6, width: round(base * 0.75 * k), dash: "" };
    case "auxiliary":
      return { opacity: 0.5, width: round(base * 0.6 * k), dash: "3,3" };
    default:
      return { opacity: 1, width: round(base * k), dash: "" };
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
export function unifyTypography(svg: string, typography: TypographySettings, scale = 1): string {
  const { root, serialize } = openDoc(svg);
  const fontByRole = FONT_BY_ROLE(typography);
  const widthByRole = WIDTH_BY_ROLE(typography);
  const k = PT_TO_FIG / scale; // pt -> figure-px, compensated for the panel stretch

  root.querySelectorAll("[data-scrole]").forEach((el) => {
    const role = el.getAttribute("data-scrole") || "";
    if (el.tagName.toLowerCase() === "text") {
      setStyleValue(el, "font-family", typography.fontFamily);
      const size = (fontByRole as Record<string, number>)[role];
      if (size) setStyleValue(el, "font-size", `${round(size * k)}px`);
    }
    const w = (widthByRole as Record<string, number>)[role];
    if (w != null && getStyleValue(el, "stroke")) {
      setStyleValue(el, "stroke-width", String(round(w * k)));
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

/** Hide / show one element via display:none (kept in the model, recoverable). */
export function setElementHidden(svg: string, scid: string, hidden: boolean): string {
  const { root, serialize } = openDoc(svg);
  const el = byScid(root, scid);
  if (el) {
    if (hidden) setStyleValue(el, "display", "none");
    else removeStyleValue(el, "display");
  }
  return serialize();
}

/** Permanently remove one element from the panel. */
export function deleteElement(svg: string, scid: string): string {
  const { root, serialize } = openDoc(svg);
  byScid(root, scid)?.remove();
  return serialize();
}

export type AxisFrameStyle = "original" | "full" | "half" | "none";

/**
 * Redraw the axis frame: hide the original axis/spine elements and draw a clean
 * full box / half L (left+bottom) / nothing at the given plot-area box. "original"
 * restores the imported frame. The drawn path carries data-scrole="axis" so the
 * unify step picks up its line width.
 */
export function redrawAxisFrame(
  svg: string,
  box: { x: number; y: number; w: number; h: number },
  style: AxisFrameStyle
): string {
  const { root, serialize } = openDoc(svg);
  root.querySelectorAll("[data-scframe]").forEach((el) => el.remove());
  const original = Array.from(root.querySelectorAll('[data-scrole="axis"]'));
  if (style === "original") {
    original.forEach((el) => removeStyleValue(el, "display"));
    return serialize();
  }
  original.forEach((el) => setStyleValue(el, "display", "none"));
  if (style === "none") return serialize();

  const { x, y, w, h } = box;
  const d =
    style === "full"
      ? `M${x} ${y} L${x + w} ${y} L${x + w} ${y + h} L${x} ${y + h} Z`
      : `M${x} ${y} L${x} ${y + h} L${x + w} ${y + h}`;
  const path = root.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  path.setAttribute("data-scframe", "1");
  path.setAttribute("data-scrole", "axis");
  path.setAttribute("style", "fill:none;stroke:#000000;stroke-width:1;stroke-linejoin:miter");
  root.appendChild(path);
  return serialize();
}

/** Hide / show every background-role fill (page + plot area) so the figure
 * background becomes transparent. */
export function setBackgroundHidden(svg: string, hidden: boolean): string {
  const { root, serialize } = openDoc(svg);
  root.querySelectorAll('[data-scrole="background"]').forEach((el) => {
    if (hidden) setStyleValue(el, "display", "none");
    else removeStyleValue(el, "display");
  });
  return serialize();
}

const SVG_NS = "http://www.w3.org/2000/svg";

/** Apply a vertical light→dark gradient fill to a fill-series' elements,
 * creating a reusable <linearGradient> referenced via fill=url(#id). */
export function applyGradientFill(
  svg: string,
  elementIds: string[],
  grad: { from: string; to: string },
  gradId: string
): string {
  const { root, serialize } = openDoc(svg);
  const doc = root.ownerDocument;
  let defs = root.querySelector("defs");
  if (!defs) {
    defs = doc.createElementNS(SVG_NS, "defs");
    root.insertBefore(defs, root.firstChild);
  }
  defs.querySelector(`#${CSS.escape(gradId)}`)?.remove();
  const lg = doc.createElementNS(SVG_NS, "linearGradient");
  lg.setAttribute("id", gradId);
  lg.setAttribute("x1", "0");
  lg.setAttribute("y1", "1");
  lg.setAttribute("x2", "0");
  lg.setAttribute("y2", "0");
  for (const [offset, color] of [["0", grad.from], ["1", grad.to]] as const) {
    const stop = doc.createElementNS(SVG_NS, "stop");
    stop.setAttribute("offset", offset);
    stop.setAttribute("stop-color", color);
    lg.appendChild(stop);
  }
  defs.appendChild(lg);
  for (const id of elementIds) {
    const el = byScid(root, id);
    if (!el) continue;
    const f = getStyleValue(el, "fill");
    if (f && f !== "none") setStyleValue(el, "fill", `url(#${gradId})`);
  }
  return serialize();
}

/** Set a flat solid color on a fill-series (fill + data stroke), clearing any
 * gradient url. Used when switching a fill series off a gradient palette. */
export function setSolidFill(svg: string, elementIds: string[], color: string): string {
  const { root, serialize } = openDoc(svg);
  for (const id of elementIds) {
    const el = byScid(root, id);
    if (!el) continue;
    const f = getStyleValue(el, "fill");
    if (f && f !== "none") setStyleValue(el, "fill", color);
    if (classifyColor(getStyleValue(el, "stroke")) === "data") setStyleValue(el, "stroke", color);
  }
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
