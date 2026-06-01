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
export const PT_TO_FIG = (4 * 25.4) / 72; // ≈ 1.41111

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
function recolorElement(root: Element, el: Element, color: string, preferFill: boolean): void {
  const stroke = getStyleValue(el, "stroke");
  const fill = getStyleValue(el, "fill");
  const gradId = gradientUrlId(fill);
  const hasStroke = stroke != null && stroke !== "none";
  const hasFill = gradId != null || (fill != null && fill !== "none");
  // Trust series membership (elementIds) rather than re-checking the color is still
  // "data"-like. Previously, once a line had been recolored to a near-gray/white
  // palette color, classifyColor() stopped seeing it as data and refused to recolor
  // it again — so further palette switches left the line stuck. Pick the channel by
  // the series kind: fill series recolor their fill (leaving structural edge strokes),
  // line/marker series recolor their stroke (or a fill-only marker's fill).
  if (preferFill && hasFill) {
    if (gradId) recolorGradient(root, gradId, color); // fill-opacity preserved
    else setStyleValue(el, "fill", color);
  } else if (hasStroke) {
    setStyleValue(el, "stroke", color);
  } else if (hasFill) {
    if (gradId) recolorGradient(root, gradId, color);
    else setStyleValue(el, "fill", color);
  }
}

/** Module E — recolor a whole series (and its legend swatch, kept in sync). */
export function recolorSeries(svg: string, series: DataSeries, color: string): string {
  const { root, serialize } = openDoc(svg);
  const preferFill = series.isFill;
  for (const id of series.elementIds) {
    const el = byScid(root, id);
    if (el) recolorElement(root, el, color, preferFill);
  }
  if (series.legendElementId) {
    const leg = byScid(root, series.legendElementId);
    if (leg) recolorElement(root, leg, color, preferFill);
  }
  return serialize();
}

/** Recolor every legend swatch currently drawn in `oldColor` to `newColor`. A series'
 * key may be several swatches (e.g. a line + a marker), and the fill recoloring paths
 * don't touch the legend at all — so we re-color all matching keys here. Auto-picks
 * stroke vs fill per swatch. */
export function recolorLegendSwatches(svg: string, oldColor: string, newColor: string): string {
  const target = (oldColor || "").toLowerCase();
  if (!target) return svg;
  const { root, serialize } = openDoc(svg);
  root.querySelectorAll('[data-scrole="legend"]').forEach((el) => {
    const stroke = getStyleValue(el, "stroke");
    const fill = getStyleValue(el, "fill");
    const cur = ((fill && fill !== "none" ? fill : stroke) || "").toLowerCase();
    if (cur === target) recolorElement(root, el, newColor, true);
  });
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
    recolorElement(root, el, emphasis === "auxiliary" ? AUX_GRAY : series.color, series.isFill);

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
    if (leg) recolorElement(root, leg, emphasis === "auxiliary" ? AUX_GRAY : series.color, series.isFill);
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

/** Set a numeric geometry attribute (e.g. circle `r`, used for scatter marker size). */
export function setElementAttr(svg: string, scid: string, attr: string, value: string): string {
  const { root, serialize } = openDoc(svg);
  const el = byScid(root, scid);
  if (el) el.setAttribute(attr, value);
  return serialize();
}

/** Replace a <text> element's content (axis titles, tick labels, legend text). */
export function setElementText(svg: string, scid: string, text: string): string {
  const { root, serialize } = openDoc(svg);
  const el = byScid(root, scid);
  if (el && el.tagName.toLowerCase() === "text") el.textContent = text;
  return serialize();
}

export type MarkerShape = "circle" | "square" | "triangle" | "diamond" | "cross";

const mnum = (el: Element, a: string) => parseFloat(el.getAttribute(a) ?? "0") || 0;

/** Recover a marker's center + radius — from the persisted data-scm* if present,
 * else from the current circle/ellipse/rect geometry. */
function markerGeom(el: Element): { cx: number; cy: number; r: number } | null {
  const dx = el.getAttribute("data-scmx");
  const dy = el.getAttribute("data-scmy");
  const dr = el.getAttribute("data-scmr");
  if (dx != null && dy != null && dr != null) return { cx: +dx, cy: +dy, r: +dr };
  const tag = el.tagName.toLowerCase();
  if (tag === "circle") return { cx: mnum(el, "cx"), cy: mnum(el, "cy"), r: mnum(el, "r") || 3 };
  if (tag === "ellipse") return { cx: mnum(el, "cx"), cy: mnum(el, "cy"), r: mnum(el, "rx") || 3 };
  if (tag === "rect") {
    const w = mnum(el, "width");
    return { cx: mnum(el, "x") + w / 2, cy: mnum(el, "y") + mnum(el, "height") / 2, r: w / 2 || 3 };
  }
  return null;
}

function markerNode(doc: Document, shape: MarkerShape, cx: number, cy: number, r: number): Element {
  const R = (n: number) => String(round(n));
  if (shape === "circle") {
    const c = doc.createElementNS(SVG_NS, "circle");
    c.setAttribute("cx", R(cx)); c.setAttribute("cy", R(cy)); c.setAttribute("r", R(r));
    return c;
  }
  if (shape === "square") {
    const c = doc.createElementNS(SVG_NS, "rect");
    c.setAttribute("x", R(cx - r)); c.setAttribute("y", R(cy - r));
    c.setAttribute("width", R(2 * r)); c.setAttribute("height", R(2 * r));
    return c;
  }
  const p = doc.createElementNS(SVG_NS, "path");
  let d: string;
  if (shape === "triangle") d = `M${R(cx)} ${R(cy - r)} L${R(cx + r * 0.866)} ${R(cy + r * 0.5)} L${R(cx - r * 0.866)} ${R(cy + r * 0.5)} Z`;
  else if (shape === "diamond") d = `M${R(cx)} ${R(cy - r)} L${R(cx + r)} ${R(cy)} L${R(cx)} ${R(cy + r)} L${R(cx - r)} ${R(cy)} Z`;
  else d = `M${R(cx - r)} ${R(cy - r)} L${R(cx + r)} ${R(cy + r)} M${R(cx - r)} ${R(cy + r)} L${R(cx + r)} ${R(cy - r)}`; // cross
  p.setAttribute("d", d);
  return p;
}

/** Replace a set of scatter markers with a new shape and/or radius (keeps center,
 * color, identity). Each marker is stamped with data-scm{x,y,r}/data-scshape so
 * figsize keeps it a constant size (it only re-centers markers, never scales them).
 * shape=null keeps each marker's current shape (size-only change); r=null keeps r. */
export function reshapeMarkers(
  svg: string,
  scids: string[],
  shape: MarkerShape | null,
  r: number | null
): string {
  const { root, serialize } = openDoc(svg);
  const doc = root.ownerDocument;
  for (const scid of scids) {
    const el = byScid(root, scid);
    if (!el) continue;
    const g = markerGeom(el);
    if (!g) continue;
    const rr = r != null ? r : g.r;
    const sh = (shape ?? (el.getAttribute("data-scshape") as MarkerShape | null) ?? "circle") as MarkerShape;
    const nn = markerNode(doc, sh, g.cx, g.cy, rr);
    const style = el.getAttribute("style");
    if (style) nn.setAttribute("style", style);
    for (const a of ["data-scid", "data-scrole", "data-scseries", "fill", "stroke", "fill-opacity", "stroke-width", "opacity", "class"]) {
      const v = el.getAttribute(a);
      if (v != null) nn.setAttribute(a, v);
    }
    nn.setAttribute("data-scmx", String(round(g.cx)));
    nn.setAttribute("data-scmy", String(round(g.cy)));
    nn.setAttribute("data-scmr", String(round(rr)));
    nn.setAttribute("data-scshape", sh);
    el.parentNode?.replaceChild(nn, el);
  }
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
  // stable id so figsize (which only walks [data-scid]) re-maps this frame on resize
  path.setAttribute("data-scid", "sc-frame");
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

/** Set the SVG's own viewBox (drives on-screen rendering); stretched (figsize). */
export function setSvgViewBox(
  svg: string,
  vb: { x: number; y: number; w: number; h: number }
): string {
  const { root, serialize } = openDoc(svg);
  root.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  root.setAttribute("preserveAspectRatio", "none");
  return serialize();
}

const FIGSIZE_STROKE_TAGS = new Set(["path", "line", "polyline", "polygon", "rect", "circle", "ellipse"]);
const FIGSIZE_FIXED_TAGS = new Set(["text", "circle", "ellipse"]);

/** figsize prep (once at import): stretch to fill, pin every stroke width to a
 * fixed on-screen size, and back up the original transform of every element we
 * counter-scale (text / markers / ticks). */
export function prepareFigsize(svg: string): string {
  const { root, serialize } = openDoc(svg);
  root.setAttribute("preserveAspectRatio", "none");
  root.querySelectorAll("*").forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (FIGSIZE_STROKE_TAGS.has(tag)) el.setAttribute("vector-effect", "non-scaling-stroke");
    const fixed = FIGSIZE_FIXED_TAGS.has(tag) || el.getAttribute("data-scrole") === "tick";
    if (fixed && el.getAttribute("data-sctf") == null) {
      el.setAttribute("data-sctf", el.getAttribute("transform") ?? "");
    }
  });
  return serialize();
}

/**
 * figsize: the box is stretched by (sx,sy) so axis lengths follow it. Everything
 * "decorative" is counter-scaled around an anchor so its on-screen size stays
 * constant; only its anchor moves:
 *  - markers (circle/ellipse): anchor = center, follows the data;
 *  - ticks: anchor = the end sitting on the plot edge, follows the axis;
 *  - text: glyphs fixed; the distance to the plot edge it sits outside of (its
 *    padding) is locked, only the along-axis position follows the stretch.
 * `plot` is the plot-area box in viewBox coords.
 */
export function applyFigsize(
  svg: string,
  vb: { x: number; y: number; w: number; h: number },
  w: number,
  h: number,
  plot: { x: number; y: number; w: number; h: number }
): string {
  const { root, serialize } = openDoc(svg);
  const sx = vb.w ? w / vb.w : 1;
  const sy = vb.h ? h / vb.h : 1;
  const tol = Math.max(plot.w, plot.h) * 0.05;
  const px1 = plot.x;
  const px2 = plot.x + plot.w;
  const py1 = plot.y;
  const py2 = plot.y + plot.h;

  const around = (ax: number, ay: number, orig: string) =>
    `translate(${round(ax)} ${round(ay)}) scale(${round(1 / sx)} ${round(1 / sy)}) translate(${round(-ax)} ${round(-ay)})${
      orig ? " " + orig : ""
    }`;

  root.querySelectorAll("[data-sctf]").forEach((el) => {
    const tag = el.tagName.toLowerCase();
    const orig = el.getAttribute("data-sctf") ?? "";

    if (tag === "circle" || tag === "ellipse") {
      const cx = parseFloat(el.getAttribute("cx") ?? "0") || 0;
      const cy = parseFloat(el.getAttribute("cy") ?? "0") || 0;
      el.setAttribute("transform", around(cx, cy, orig));
      return;
    }

    if (el.getAttribute("data-scrole") === "tick") {
      const m = (el.getAttribute("d") ?? "").match(
        /M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*L\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/i
      );
      if (m) {
        const ax = +m[1];
        const ay = +m[2];
        const bx = +m[3];
        const by = +m[4];
        const onEdge = (x: number, y: number) =>
          Math.abs(x - px1) < tol || Math.abs(x - px2) < tol || Math.abs(y - py1) < tol || Math.abs(y - py2) < tol;
        const useA = onEdge(ax, ay);
        el.setAttribute("transform", around(useA ? ax : bx, useA ? ay : by, orig));
      }
      return;
    }

    if (tag === "text") {
      const x0 = parseFloat(el.getAttribute("x") ?? "0") || 0;
      const y0 = parseFloat(el.getAttribute("y") ?? "0") || 0;
      let xa = x0;
      let ya = y0;
      // Mutually exclusive: a label is on the LEFT/RIGHT (y-axis side -> lock its
      // horizontal distance to the axis, let y follow the data) OR ABOVE/BELOW
      // (x-axis side -> lock vertical distance, x follows the data). Inside the
      // plot (e.g. legend) -> no lock, both follow the data.
      if (x0 < px1) xa = px1 + (x0 - px1) / sx;
      else if (x0 > px2) xa = px2 + (x0 - px2) / sx;
      else if (y0 > py2) ya = py2 + (y0 - py2) / sy;
      else if (y0 < py1) ya = py1 + (y0 - py1) / sy;
      // counter-scale glyphs around their ORIGINAL anchor (back-translate uses the
      // real x0/y0), but re-anchor to the padding-locked position (forward = xa/ya).
      const comp = `translate(${round(xa)} ${round(ya)}) scale(${round(1 / sx)} ${round(1 / sy)}) translate(${round(-x0)} ${round(-y0)})`;
      el.setAttribute("transform", orig ? `${comp} ${orig}` : comp);
      return;
    }
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

export type TickDirection = "in" | "out";

/** Flip every tick mark to point inward (toward the plot) or outward. The fixed
 * end is the one sitting on a plot edge; the free end is redrawn the same length
 * along the inward/outward normal. Handles tick <path> "M x y L x y". */
export function setTickDirection(
  svg: string,
  plot: { x: number; y: number; w: number; h: number },
  direction: TickDirection
): string {
  const { root, serialize } = openDoc(svg);
  const sign = direction === "in" ? 1 : -1;
  const cx = plot.x + plot.w / 2;
  const cy = plot.y + plot.h / 2;
  root.querySelectorAll('[data-scrole="tick"]').forEach((el) => {
    const d = el.getAttribute("d");
    if (!d) return;
    const m = d.match(/M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*L\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/i);
    if (!m) return;
    const ax = +m[1], ay = +m[2], bx = +m[3], by = +m[4];
    const len = Math.hypot(bx - ax, by - ay);
    if (len < 0.5) return;
    // Classify by the tick's OWN orientation, not the anchor position: a corner
    // tick lies on two edges and would be misread. A vertical segment is an
    // X-axis tick (top/bottom edge); a horizontal one is a Y-axis tick.
    const vertical = Math.abs(by - ay) >= Math.abs(bx - ax);
    let fx: number, fy: number; // anchor = the end sitting on the axis line
    let nx = 0, ny = 0; // inward normal (toward plot center)
    if (vertical) {
      const aD = Math.min(Math.abs(ay - plot.y), Math.abs(ay - (plot.y + plot.h)));
      const bD = Math.min(Math.abs(by - plot.y), Math.abs(by - (plot.y + plot.h)));
      if (aD <= bD) { fx = ax; fy = ay; } else { fx = bx; fy = by; }
      ny = fy < cy ? 1 : -1;
    } else {
      const aD = Math.min(Math.abs(ax - plot.x), Math.abs(ax - (plot.x + plot.w)));
      const bD = Math.min(Math.abs(bx - plot.x), Math.abs(bx - (plot.x + plot.w)));
      if (aD <= bD) { fx = ax; fy = ay; } else { fx = bx; fy = by; }
      nx = fx < cx ? 1 : -1;
    }
    el.setAttribute("d", `M${fx} ${fy} L${fx + nx * len * sign} ${fy + ny * len * sign}`);
  });
  return serialize();
}

/** Reposition an axis-label text: center it on the plot axis and/or nudge its
 * distance from the axis. Handles rotated (y-axis) labels. nudge > 0 = away. */
export function moveAxisLabel(
  svg: string,
  scid: string,
  plot: { x: number; y: number; w: number; h: number },
  opts: { center?: boolean; nudge?: number }
): string {
  const { root, serialize } = openDoc(svg);
  const el = byScid(root, scid);
  if (!el || el.tagName.toLowerCase() !== "text") return serialize();
  let x = parseFloat(el.getAttribute("x") ?? "0");
  let y = parseFloat(el.getAttribute("y") ?? "0");
  const cx = plot.x + plot.w / 2;
  const cy = plot.y + plot.h / 2;
  const rotated = /rotate/i.test(el.getAttribute("transform") ?? "");
  if (rotated) {
    // y-axis label (vertical): center along plot height; distance = x position
    if (opts.center) y = cy;
    if (opts.nudge) x -= opts.nudge; // away = further left
    el.setAttribute("x", String(x));
    el.setAttribute("y", String(y));
    el.setAttribute("transform", `rotate(-90 ${x} ${y})`);
    if (opts.center) setStyleValue(el, "text-anchor", "middle");
  } else {
    // x-axis label (horizontal): center along plot width; distance = y position
    if (opts.center) {
      x = cx;
      setStyleValue(el, "text-anchor", "middle");
    }
    if (opts.nudge) y += opts.nudge; // away = further down
    el.setAttribute("x", String(x));
    el.setAttribute("y", String(y));
  }
  return serialize();
}

/** Show / hide every tick mark on one axis (global). X-axis ticks are vertical
 * strokes, Y-axis ticks horizontal — classified by the tick's own orientation so
 * a corner tick isn't mis-assigned. */
export function setTickVisibility(svg: string, axis: "x" | "y", visible: boolean): string {
  const { root, serialize } = openDoc(svg);
  root.querySelectorAll('[data-scrole="tick"]').forEach((el) => {
    const d = el.getAttribute("d");
    if (!d) return;
    const m = d.match(/M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*L\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/i);
    if (!m) return;
    const ax = +m[1], ay = +m[2], bx = +m[3], by = +m[4];
    const isXAxis = Math.abs(by - ay) >= Math.abs(bx - ax); // vertical tick => X axis
    if ((axis === "x") !== isXAxis) return;
    if (visible) removeStyleValue(el, "display");
    else setStyleValue(el, "display", "none");
  });
  return serialize();
}

/** Set the distance (figure-px) between each axis TITLE and its axis edge (global).
 * X titles sit below/above the plot (move along y); Y titles are rotated and sit to
 * the left/right (move along x). The side is inferred from the current position. */
export function setAxisLabelGap(
  svg: string,
  plot: { x: number; y: number; w: number; h: number },
  gap: number
): string {
  const { root, serialize } = openDoc(svg);
  const px1 = plot.x, px2 = plot.x + plot.w, py1 = plot.y, py2 = plot.y + plot.h;
  const cx = plot.x + plot.w / 2, cy = plot.y + plot.h / 2;
  root.querySelectorAll('[data-scrole="text-axis"]').forEach((el) => {
    if (el.tagName.toLowerCase() !== "text") return;
    const x = parseFloat(el.getAttribute("x") ?? "0");
    const y = parseFloat(el.getAttribute("y") ?? "0");
    const rotated = /rotate/i.test(el.getAttribute("transform") ?? "");
    if (rotated) {
      const nx = x < cx ? px1 - gap : px2 + gap; // Y title: horizontal distance to axis
      el.setAttribute("x", String(round(nx)));
      el.setAttribute("transform", `rotate(-90 ${round(nx)} ${round(y)})`);
    } else {
      const ny = y > cy ? py2 + gap : py1 - gap; // X title: vertical distance to axis
      el.setAttribute("y", String(round(ny)));
    }
  });
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
