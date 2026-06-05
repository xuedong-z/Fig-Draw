/**
 * Write side of the engine: apply recoloring (Module E), emphasis (Module F)
 * and typography unification (Module G) to a panel's SVG string.
 *
 * All functions take an SVG string, mutate a parsed copy with the unified style
 * accessor, and return a new string. The panel's React model is updated
 * separately by the store, so these stay pure string->string transforms.
 */
import type { DataSeries, Emphasis, TypographySettings } from "../types";
import { classifyColor, parseColor, recolorToHue, toHex } from "./colorUtils";
import { getStyleValue, setStyleValue, removeStyleValue } from "./styleAccessor";
import { readTickSeg, writeTickSeg, remapPoints, remapPathD } from "./figsizeRebuild";

/** True if two color strings resolve to the same RGB (e.g. a solid marker whose
 * fill equals its stroke). Used to recolor a marker's body together with its edge. */
function sameColor(a: string | null, b: string | null): boolean {
  const ca = parseColor(a);
  const cb = parseColor(b);
  return !!ca && !!cb && toHex(ca) === toHex(cb);
}

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
    // Solid marker (fill == stroke, e.g. Origin's filled squares): recolor the body
    // too so it doesn't stay its old color. Open markers (white/none fill) are left
    // as-is, and gradient fills are untouched here.
    if (!gradId && fill && fill !== "none" && sameColor(fill, stroke)) {
      setStyleValue(el, "fill", color);
    }
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
  if (tag === "polygon" || tag === "polyline") {
    // Origin draws markers as small polygons (e.g. triangles). Center + radius
    // come from the points' bounding box so they can be reshaped/resized too.
    const nums = (el.getAttribute("points") ?? "").match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g);
    if (nums && nums.length >= 4) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let i = 0; i + 1 < nums.length; i += 2) {
        const x = +nums[i], y = +nums[i + 1];
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
      return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, r: Math.max(x1 - x0, y1 - y0) / 2 || 3 };
    }
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

/**
 * Resize scatter markers IN PLACE around each marker's own center, preserving its
 * shape (a triangle stays a triangle) and never touching the data line. `r` is the
 * target half-size in panel coords. Unlike reshapeMarkers this does NOT canonicalize
 * the shape — so changing size doesn't turn Origin markers into circles, and passing
 * only marker scids (not the whole series) keeps the line intact.
 */
export function resizeMarkers(svg: string, scids: string[], r: number): string {
  const { root, serialize } = openDoc(svg);
  for (const scid of scids) {
    const el = byScid(root, scid);
    if (!el) continue;
    const g = markerGeom(el);
    if (!g || g.r <= 0) continue;
    const f = r / g.r; // scale factor about the center
    const tag = el.tagName.toLowerCase();
    if (tag === "circle") {
      el.setAttribute("r", String(round(g.r * f)));
    } else if (tag === "ellipse") {
      el.setAttribute("rx", String(round(mnum(el, "rx") * f)));
      el.setAttribute("ry", String(round(mnum(el, "ry") * f)));
    } else if (tag === "rect") {
      const w = mnum(el, "width") * f;
      const h = mnum(el, "height") * f;
      el.setAttribute("width", String(round(w)));
      el.setAttribute("height", String(round(h)));
      el.setAttribute("x", String(round(g.cx - w / 2)));
      el.setAttribute("y", String(round(g.cy - h / 2)));
    } else if (tag === "polygon" || tag === "polyline") {
      const pts = el.getAttribute("points");
      if (pts) el.setAttribute("points", remapPoints(pts, (x) => g.cx + (x - g.cx) * f, (y) => g.cy + (y - g.cy) * f));
    } else if (tag === "path") {
      const d = el.getAttribute("d");
      if (d) el.setAttribute("d", remapPathD(d, (x) => g.cx + (x - g.cx) * f, (y) => g.cy + (y - g.cy) * f, f, f));
    }
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

/** One side of the plot box an axis line lies on, with the line's own color. The
 * store computes these from element bboxes (at import, while every axis is visible)
 * and stamps them with stampAxisEdges so the frame toggle survives hide/show. */
export interface AxisEdge {
  scid: string;
  edge: "L" | "R" | "T" | "B" | "?";
  color: string | null;
}

/** Persist each axis line's plot edge as data-scedge so redrawAxisFrame can show/
 * hide the right ones even after some were hidden (a hidden element has no bbox to
 * re-classify from). Stamped once at import; the edge is invariant under resize. */
export function stampAxisEdges(svg: string, edges: AxisEdge[]): string {
  const { root, serialize } = openDoc(svg);
  for (const { scid, edge } of edges) byScid(root, scid)?.setAttribute("data-scedge", edge);
  return serialize();
}

/**
 * Set the axis frame to a full box / half L (left+bottom) / none. Instead of
 * replacing the imported axes with a black box, we SHOW the original edge lines that
 * the style calls for (preserving their colors — e.g. Origin's blue/gray dual-Y
 * axes) and hide the rest; any wanted edge that has no original line is drawn in the
 * dominant axis color. "original" restores every imported axis.
 */
export function redrawAxisFrame(
  svg: string,
  box: { x: number; y: number; w: number; h: number },
  style: AxisFrameStyle
): string {
  const { root, serialize } = openDoc(svg);
  root.querySelectorAll("[data-scframe]").forEach((el) => el.remove());
  const axisEls = Array.from(root.querySelectorAll('[data-scrole="axis"]'));
  if (style === "original") {
    axisEls.forEach((el) => removeStyleValue(el, "display"));
    return serialize();
  }
  if (style === "none") {
    axisEls.forEach((el) => setStyleValue(el, "display", "none"));
    return serialize();
  }

  const want = style === "full" ? ["L", "R", "T", "B"] : ["L", "B"];
  const present = new Set<string>();
  const counts = new Map<string, number>();
  for (const el of axisEls) {
    const edge = el.getAttribute("data-scedge") ?? "";
    const col = (getStyleValue(el, "stroke") ?? "").toLowerCase();
    if (col && col !== "none") counts.set(col, (counts.get(col) ?? 0) + 1);
    if (edge && want.includes(edge)) {
      removeStyleValue(el, "display");
      present.add(edge);
    } else {
      setStyleValue(el, "display", "none");
    }
  }

  // dominant original-axis color (for any edge we must draw because no line exists)
  let drawColor = "#000000", best = -1;
  for (const [c, n] of counts) if (n > best) ((best = n), (drawColor = c));

  const { x, y, w, h } = box;
  const seg: Record<string, [number, number, number, number]> = {
    L: [x, y, x, y + h], R: [x + w, y, x + w, y + h], T: [x, y, x + w, y], B: [x, y + h, x + w, y + h]
  };
  for (const edge of want) {
    if (present.has(edge)) continue;
    const [x1, y1, x2, y2] = seg[edge];
    const path = root.ownerDocument.createElementNS(SVG_NS, "path");
    path.setAttribute("d", `M${x1} ${y1} L${x2} ${y2}`);
    path.setAttribute("data-scframe", "1");
    path.setAttribute("data-scrole", "axis");
    path.setAttribute("data-scid", `sc-frame-${edge}`); // stable id so figsize remaps it
    path.setAttribute("style", `fill:none;stroke:${drawColor};stroke-width:1;stroke-linejoin:miter`);
    root.appendChild(path);
  }
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
    const seg = readTickSeg(el); // handles <path>, <polyline> (Origin), <line>
    if (!seg) return;
    const { ax, ay, bx, by } = seg;
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
    writeTickSeg(el, fx, fy, fx + nx * len * sign, fy + ny * len * sign);
  });
  return serialize();
}

/** Set every tick mark's length to `length` (panel coords), scaling all ticks by
 * one factor so the major/minor ratio is preserved (the longest tick becomes
 * `length`). The on-axis anchor and direction are kept. Handles every tick shape. */
export function setTickLength(
  svg: string,
  plot: { x: number; y: number; w: number; h: number },
  length: number
): string {
  const { root, serialize } = openDoc(svg);
  const ticks = [...root.querySelectorAll('[data-scrole="tick"]')];
  const segs = ticks.map((el) => ({ el, seg: readTickSeg(el) }));
  let maxLen = 0;
  for (const { seg } of segs) if (seg) maxLen = Math.max(maxLen, Math.hypot(seg.bx - seg.ax, seg.by - seg.ay));
  if (maxLen < 0.01) return serialize();
  const factor = length / maxLen;
  for (const { el, seg } of segs) {
    if (!seg) continue;
    const { ax, ay, bx, by } = seg;
    const len = Math.hypot(bx - ax, by - ay);
    if (len < 0.01) continue;
    // anchor = the end nearer a plot edge; the free end grows along the tick vector.
    const vertical = Math.abs(by - ay) >= Math.abs(bx - ax);
    let fx: number, fy: number, gx: number, gy: number;
    if (vertical) {
      const aD = Math.min(Math.abs(ay - plot.y), Math.abs(ay - (plot.y + plot.h)));
      const bD = Math.min(Math.abs(by - plot.y), Math.abs(by - (plot.y + plot.h)));
      if (aD <= bD) { fx = ax; fy = ay; gx = bx; gy = by; } else { fx = bx; fy = by; gx = ax; gy = ay; }
    } else {
      const aD = Math.min(Math.abs(ax - plot.x), Math.abs(ax - (plot.x + plot.w)));
      const bD = Math.min(Math.abs(bx - plot.x), Math.abs(bx - (plot.x + plot.w)));
      if (aD <= bD) { fx = ax; fy = ay; gx = bx; gy = by; } else { fx = bx; fy = by; gx = ax; gy = ay; }
    }
    const ux = (gx - fx) / len;
    const uy = (gy - fy) / len;
    writeTickSeg(el, fx, fy, fx + ux * len * factor, fy + uy * len * factor);
  }
  return serialize();
}

/** Set the perpendicular distance (panel-px) from each tick LABEL to its axis edge
 * (global), so labels sit a consistent, adjustable distance from the ticks — useful
 * after a font-size change pushes them too far. X labels sit below/above (move y);
 * Y labels sit left/right (move x). The side is inferred from the label position. */
export function setTickLabelGap(
  svg: string,
  plot: { x: number; y: number; w: number; h: number },
  gap: number
): string {
  const { root, serialize } = openDoc(svg);
  const px1 = plot.x, px2 = plot.x + plot.w, py1 = plot.y, py2 = plot.y + plot.h;
  root.querySelectorAll('[data-scrole="text-tick"]').forEach((el) => {
    if (el.tagName.toLowerCase() !== "text") return;
    const x = parseFloat(el.getAttribute("x") ?? "0");
    const y = parseFloat(el.getAttribute("y") ?? "0");
    // classify by which way the label sits further outside the plot (robust to a
    // label whose other coordinate grazes the plot edge).
    const dxOut = Math.max(px1 - x, x - px2, 0);
    const dyOut = Math.max(py1 - y, y - py2, 0);
    if (dxOut >= dyOut) {
      // Y-axis label (left/right): fixed horizontal distance to the axis
      el.setAttribute("x", String(round(x < px1 ? px1 - gap : px2 + gap)));
    } else {
      // X-axis label (below/above): fixed vertical distance to the axis
      el.setAttribute("y", String(round(y > py2 ? py2 + gap : py1 - gap)));
    }
  });
  return serialize();
}

/** Translate a set of text elements by (dx, dy), keeping each rotate() center in
 * step. Used for bbox-based axis-title centering (computed in the store, where the
 * visual bounding boxes live). */
export function shiftElements(svg: string, scids: string[], dx: number, dy: number): string {
  return shiftEach(svg, scids.map((scid) => ({ scid, dx, dy })));
}

/**
 * Set a text element's anchor + baseline and move x/y to the matching pivot, so a
 * later font-size change pivots around that point (keeping its alignment to the axis
 * / tick) instead of drifting. e.g. an X tick label pivots around its horizontal
 * center + top edge; a left Y tick label around its right edge + vertical center.
 */
export function setTextPivot(
  svg: string,
  items: { scid: string; anchor: string; baseline: string; x: number; y: number }[]
): string {
  const { root, serialize } = openDoc(svg);
  for (const it of items) {
    const el = byScid(root, it.scid);
    if (!el || el.tagName.toLowerCase() !== "text") continue;
    setStyleValue(el, "text-anchor", it.anchor);
    setStyleValue(el, "dominant-baseline", it.baseline);
    el.setAttribute("x", String(round(it.x)));
    el.setAttribute("y", String(round(it.y)));
    el.querySelectorAll("tspan").forEach((sp) => sp.removeAttribute("x"));
  }
  return serialize();
}

/** Translate text elements by a PER-ELEMENT (dx, dy), in one pass. Used by the
 * bbox-based gap controls (each label/title moved by its own visual offset). */
/** Translate whole elements by (dx, dy) regardless of geometry — accumulates a leading
 * translate() so it works for <polyline>/<polygon>/<rect>/<text>/<circle>/<path> alike
 * (a legend's swatch + label move together). reparse picks up new positions via
 * getBBox/getCTM. Unlike shiftEach (x/y only, for axis labels), this moves point-based
 * shapes too. */
export function nudgeEach(svg: string, moves: { scid: string; dx: number; dy: number }[]): string {
  const { root, serialize } = openDoc(svg);
  for (const { scid, dx, dy } of moves) {
    if (dx === 0 && dy === 0) continue;
    const el = byScid(root, scid);
    if (!el) continue;
    const cur = (el.getAttribute("transform") ?? "").trim();
    const m = cur.match(/^translate\(\s*(-?[\d.]+)(?:[ ,]+(-?[\d.]+))?\s*\)(.*)$/i);
    if (m) {
      const nx = parseFloat(m[1]) + dx;
      const ny = (m[2] ? parseFloat(m[2]) : 0) + dy;
      el.setAttribute("transform", `translate(${round(nx)} ${round(ny)})${m[3]}`);
    } else {
      el.setAttribute("transform", `translate(${round(dx)} ${round(dy)})${cur ? " " + cur : ""}`);
    }
  }
  return serialize();
}

export function nudgeElements(svg: string, scids: string[], dx: number, dy: number): string {
  if (dx === 0 && dy === 0) return svg;
  return nudgeEach(svg, scids.map((scid) => ({ scid, dx, dy })));
}

export function shiftEach(svg: string, moves: { scid: string; dx: number; dy: number }[]): string {
  const { root, serialize } = openDoc(svg);
  for (const { scid, dx, dy } of moves) {
    const el = byScid(root, scid);
    if (!el || (dx === 0 && dy === 0)) continue;
    const nx = parseFloat(el.getAttribute("x") ?? "0") + dx;
    const ny = parseFloat(el.getAttribute("y") ?? "0") + dy;
    el.setAttribute("x", String(round(nx)));
    el.setAttribute("y", String(round(ny)));
    // carry positioned child tspans (a merged multi-part title) along with the text
    el.querySelectorAll("tspan").forEach((sp) => {
      const sx = sp.getAttribute("x");
      if (sx != null) sp.setAttribute("x", String(round(parseFloat(sx) + dx)));
      const sy = sp.getAttribute("y");
      if (sy != null) sp.setAttribute("y", String(round(parseFloat(sy) + dy)));
    });
    const tf = el.getAttribute("transform");
    if (tf && /rotate/i.test(tf)) {
      el.setAttribute("transform", tf.replace(/rotate\(\s*(-?[\d.]+)[^)]*\)/i, `rotate($1 ${round(nx)} ${round(ny)})`));
    }
  }
  return serialize();
}

/**
 * Merge several `<text>` fragments — an Origin axis title that the exporter split
 * into pieces for subscripts ("Width of W", "3", "Te", "4", " (nm)") — into ONE
 * `<text>` with `<tspan>`s. Each tspan gets an ABSOLUTE x/y computed in the merged
 * text's local frame (inverse of the shared rotate), so every glyph lands exactly
 * where it was: rendering is unchanged, but it's now a single editable label. The
 * first fragment (in reading order) keeps the scid/role; the rest are removed.
 */
export function mergeTextFragments(svg: string, scids: string[]): string {
  if (scids.length < 2) return svg;
  const { root, serialize } = openDoc(svg);
  const num = (e: Element, a: string) => parseFloat(e.getAttribute(a) ?? "0") || 0;
  const els = scids
    .map((id) => byScid(root, id))
    .filter((e): e is Element => !!e && e.tagName.toLowerCase() === "text");
  if (els.length < 2) return svg;

  const angle = parseFloat((els[0].getAttribute("transform") ?? "").match(/rotate\(\s*(-?[\d.]+)/)?.[1] ?? "0") || 0;
  const fwd = (angle * Math.PI) / 180; // text's own rotate
  const cF = Math.cos(fwd), sF = Math.sin(fwd);
  // glyph text comes from the <tspan>s (Origin wraps each piece in one), so the
  // formatting whitespace between <text> and <tspan> is excluded; intentional
  // spaces inside a tspan (e.g. " (nm)") are kept.
  const glyphText = (e: Element) => {
    const tspans = e.querySelectorAll("tspan");
    return tspans.length ? Array.from(tspans).map((t) => t.textContent ?? "").join("") : (e.textContent ?? "");
  };
  const frags = els
    .map((e) => ({ e, x: num(e, "x"), y: num(e, "y"), fs: parseFloat(getStyleValue(e, "font-size") ?? "0") || 0, fill: getStyleValue(e, "fill"), ff: getStyleValue(e, "font-family"), text: glyphText(e) }))
    .sort((p, q) => (p.x * cF + p.y * sF) - (q.x * cF + q.y * sF)); // reading order along the rotated +x axis

  const x0 = frags[0].x, y0 = frags[0].y;
  const mainFs = Math.max(...frags.map((f) => f.fs)) || 1;
  // perpendicular screen direction = the text's local +y (descender / subscript side)
  const perpX = -Math.sin(fwd), perpY = Math.cos(fwd);
  const bigs = frags.filter((f) => f.fs >= 0.85 * mainFs);
  const mainPerp = bigs.reduce((s, f) => s + (f.x * perpX + f.y * perpY), 0) / (bigs.length || 1);

  const doc = root.ownerDocument;
  const NS = "http://www.w3.org/2000/svg";
  const merged = doc.createElementNS(NS, "text");
  const first = frags[0].e;
  for (const a of ["data-scid", "data-scrole", "data-scseries", "font-family", "font-weight", "fill", "style", "class"]) {
    const v = first.getAttribute(a);
    if (v != null) merged.setAttribute(a, v);
  }
  merged.setAttribute("x", String(round(x0)));
  merged.setAttribute("y", String(round(y0)));
  merged.setAttribute("xml:space", "preserve"); // keep intentional spaces (" (nm)")
  if (angle) merged.setAttribute("transform", `rotate(${round(angle)} ${round(x0)} ${round(y0)})`);
  // the merged text carries the MAIN font size; normal pieces inherit it and sub/
  // superscripts use a RELATIVE size, so "unify typography" scales the whole title.
  setStyleValue(merged, "font-size", `${round(mainFs)}px`);
  const baseFill = getStyleValue(first, "fill");
  const baseFF = getStyleValue(first, "font-family");
  for (const f of frags) {
    const tspan = doc.createElementNS(NS, "tspan");
    if (f.fs < 0.85 * mainFs) {
      // smaller piece = sub/superscript; flow naturally (no absolute x/y), shift the
      // baseline and scale relative to the parent so it tracks a font-size change.
      const onSubSide = f.x * perpX + f.y * perpY >= mainPerp - 1e-6;
      tspan.setAttribute("baseline-shift", onSubSide ? "sub" : "super");
      setStyleValue(tspan, "font-size", `${round((f.fs / mainFs) * 100)}%`);
    }
    if (f.fill && f.fill !== baseFill) setStyleValue(tspan, "fill", f.fill);
    // Preserve a per-fragment font: Origin renders Greek letters in the Symbol font
    // (the char is a Latin letter the Symbol font maps to a Greek glyph — "m"→μ,
    // "l"→λ, "s"→σ). Without carrying its font-family the piece inherits the title's
    // Arial and turns back into a Latin letter.
    if (f.ff && f.ff !== baseFF) setStyleValue(tspan, "font-family", f.ff);
    tspan.textContent = f.text;
    merged.appendChild(tspan);
  }
  first.parentNode?.replaceChild(merged, first);
  for (let i = 1; i < frags.length; i++) frags[i].e.remove();
  return serialize();
}

/** Reposition an axis-label text: center it on the plot axis and/or nudge its
 * distance from the axis. Handles rotated (y-axis) labels, and moves all sibling
 * title fragments on the same side together (Origin splits a title with subscripts
 * into several <text> boxes) so the whole title centers/slides as one. */
export function moveAxisLabel(
  svg: string,
  scid: string,
  plot: { x: number; y: number; w: number; h: number },
  opts: { center?: boolean; nudge?: number }
): string {
  const { root, serialize } = openDoc(svg);
  const el = byScid(root, scid);
  if (!el || el.tagName.toLowerCase() !== "text") return serialize();
  const cx = plot.x + plot.w / 2;
  const cy = plot.y + plot.h / 2;
  const rotated = /rotate/i.test(el.getAttribute("transform") ?? "");
  const elX = parseFloat(el.getAttribute("x") ?? "0");
  const elY = parseFloat(el.getAttribute("y") ?? "0");

  // group = every axis-title fragment on the SAME side as the clicked one.
  const group = [...root.querySelectorAll('[data-scrole="text-axis"]')].filter((t) => {
    if (t.tagName.toLowerCase() !== "text") return false;
    const tRot = /rotate/i.test(t.getAttribute("transform") ?? "");
    if (tRot !== rotated) return false;
    const tx = parseFloat(t.getAttribute("x") ?? "0");
    const ty = parseFloat(t.getAttribute("y") ?? "0");
    return rotated ? (tx < cx) === (elX < cx) : (ty > cy) === (elY > cy);
  });
  const angle = (el.getAttribute("transform") ?? "").match(/rotate\(\s*(-?[\d.]+)/)?.[1] ?? "-90";

  if (rotated) {
    // vertical title: center along plot height (move y), nudge = horizontal distance (x)
    const ys = group.map((t) => parseFloat(t.getAttribute("y") ?? "0"));
    const dy = opts.center ? cy - (Math.min(...ys) + Math.max(...ys)) / 2 : 0;
    for (const t of group) {
      const nx = (parseFloat(t.getAttribute("x") ?? "0")) - (opts.nudge ?? 0);
      const ny = (parseFloat(t.getAttribute("y") ?? "0")) + dy;
      t.setAttribute("x", String(round(nx)));
      t.setAttribute("y", String(round(ny)));
      t.setAttribute("transform", `rotate(${angle} ${round(nx)} ${round(ny)})`);
    }
  } else {
    // horizontal title: center along plot width (move x), nudge = vertical distance (y)
    if (group.length <= 1 && opts.center) {
      el.setAttribute("x", String(round(cx)));
      setStyleValue(el, "text-anchor", "middle");
    } else if (opts.center) {
      const xs = group.map((t) => parseFloat(t.getAttribute("x") ?? "0"));
      const dx = cx - (Math.min(...xs) + Math.max(...xs)) / 2;
      for (const t of group) t.setAttribute("x", String(round(parseFloat(t.getAttribute("x") ?? "0") + dx)));
    }
    if (opts.nudge) for (const t of group) t.setAttribute("y", String(round(parseFloat(t.getAttribute("y") ?? "0") + opts.nudge)));
  }
  return serialize();
}

/** Show / hide every tick mark on one axis (global). X-axis ticks are vertical
 * strokes, Y-axis ticks horizontal — classified by the tick's own orientation so
 * a corner tick isn't mis-assigned. */
export function setTickVisibility(svg: string, axis: "x" | "y", visible: boolean): string {
  const { root, serialize } = openDoc(svg);
  root.querySelectorAll('[data-scrole="tick"]').forEach((el) => {
    const seg = readTickSeg(el); // handles <path>, <polyline> (Origin), <line>
    if (!seg) return;
    const isXAxis = Math.abs(seg.by - seg.ay) >= Math.abs(seg.bx - seg.ax); // vertical tick => X axis
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
