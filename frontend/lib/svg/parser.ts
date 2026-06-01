/**
 * Module C — SVG parsing engine.
 *
 * Parses an exported figure into SciCompose's model:
 *  - assigns stable data-scid to every drawable element
 *  - measures real geometry (bbox/length) by briefly rendering offscreen
 *  - C2 detects text-converted-to-paths
 *  - C3 aggregates data elements into series (by group / color / collection)
 *  - C4 records fill + gradient references so recoloring can reach them
 *  - runs role recognition (Module D1) and writes data-scrole / data-scseries
 *
 * The returned `svg` string carries all data-sc* attributes and is the panel's
 * source of truth from then on.
 */
import type {
  BBox,
  DataSeries,
  ElementRole,
  ImportWarning,
  PanelMode,
  ParsedElement
} from "../types";
import { DATA_ROLES } from "../types";
import { classifyColor, parseColor, toHex } from "./colorUtils";
import { getStyleNumber, getStyleValue } from "./styleAccessor";
import { assignRoles } from "./roles";

const SVGNS = "http://www.w3.org/2000/svg";
const DRAWABLE = new Set(["path", "polyline", "polygon", "line", "rect", "circle", "ellipse", "text", "image", "use"]);
const SKIP_ANCESTORS = new Set(["defs", "clippath", "marker", "symbol", "mask", "pattern"]);

export interface ParseResult {
  svg: string;
  vb: BBox;
  elements: ParsedElement[];
  series: DataSeries[];
  textToPath: boolean;
  mode: PanelMode;
  warnings: ImportWarning[];
}

let scidCounter = 0;
function nextScid(): string {
  scidCounter += 1;
  return `sc${scidCounter.toString(36)}`;
}

/** Small stable hash of a string -> short base36 token (for series ids). */
function hashKey(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/** True if any ancestor is a non-rendering container (defs/marker/etc). */
function inSkippedAncestor(el: Element): boolean {
  let p = el.parentElement;
  while (p) {
    if (SKIP_ANCESTORS.has(p.tagName.toLowerCase())) return true;
    p = p.parentElement;
  }
  return false;
}

/** Concatenate id/class of the element and its ancestors as a recognition hint. */
function idHintOf(el: Element): string {
  const parts: string[] = [];
  let p: Element | null = el;
  let depth = 0;
  while (p && depth < 6) {
    const id = p.getAttribute("id");
    const cls = p.getAttribute("class");
    if (id) parts.push(id);
    if (cls) parts.push(cls);
    p = p.parentElement;
    depth += 1;
  }
  return parts.join(" ").toLowerCase();
}

function resolveGradientId(fill: string | null): string | null {
  if (!fill) return null;
  const m = fill.match(/url\(["']?#([^)"']+)["']?\)/);
  return m ? m[1] : null;
}

/** rect-as-bbox in the svg root user space (handles ancestor transforms). */
function rootBBox(el: SVGGraphicsElement): BBox {
  let b: DOMRect;
  try {
    b = el.getBBox();
  } catch {
    return { x: 0, y: 0, w: 0, h: 0 };
  }
  const ctm = el.getCTM();
  if (!ctm) return { x: b.x, y: b.y, w: b.width, h: b.height };
  const corners = [
    [b.x, b.y],
    [b.x + b.width, b.y],
    [b.x, b.y + b.height],
    [b.x + b.width, b.y + b.height]
  ].map(([x, y]) => ({ x: ctm.a * x + ctm.c * y + ctm.e, y: ctm.b * x + ctm.d * y + ctm.f }));
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const minx = Math.min(...xs);
  const miny = Math.min(...ys);
  return { x: minx, y: miny, w: Math.max(...xs) - minx, h: Math.max(...ys) - miny };
}

function isMarkerLike(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (el.hasAttribute("data-scshape")) return true; // reshaped scatter marker
  if (tag === "use") return true;
  if (tag === "circle" || tag === "ellipse") return true;
  // a small filled path inside a marker/scatter group
  if (tag === "path" && /marker|scatter|collection/i.test(idHintOf(el))) return true;
  return false;
}

/** Ensure the svg has xmlns + a viewBox so it renders predictably. */
function ensureRenderable(svg: SVGSVGElement): BBox {
  if (!svg.getAttribute("xmlns")) svg.setAttribute("xmlns", SVGNS);
  // figsize: stretch content to fill the box (axis lengths follow the box);
  // figsize compensation keeps text + stroke widths fixed (see mutate.applyFigsize).
  svg.setAttribute("preserveAspectRatio", "none");
  const vbAttr = svg.getAttribute("viewBox");
  if (vbAttr) {
    const [x, y, w, h] = vbAttr.split(/[\s,]+/).map(Number);
    if ([x, y, w, h].every((n) => Number.isFinite(n)) && w > 0 && h > 0) return { x, y, w, h };
  }
  const w = parseFloat(svg.getAttribute("width") || "");
  const h = parseFloat(svg.getAttribute("height") || "");
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    return { x: 0, y: 0, w, h };
  }
  return { x: 0, y: 0, w: 100, h: 100 };
}

/** The color that identifies an element's data series. A colored fill marks a
 * filled shape (bar / area / scatter marker) and wins; an unfilled line is
 * identified by its stroke. */
function seriesColorOf(el: ParsedElement): string | null {
  const fillData = classifyColor(el.fill) === "data";
  const strokeData = classifyColor(el.stroke) === "data";
  if (fillData) return el.fill;
  if (strokeData) return el.stroke;
  return el.stroke ?? el.fill;
}

/** Normalized hex key for grouping by color (C3 fallback). */
function colorKey(el: ParsedElement): string {
  const rgb = parseColor(seriesColorOf(el));
  return rgb ? toHex(rgb) : "none";
}

/** Group key for series aggregation: prefer a meaningful ancestor id. */
function groupKeyOf(node: Element, el: ParsedElement): string {
  let p: Element | null = node;
  let depth = 0;
  while (p && depth < 6) {
    const id = p.getAttribute("id") || "";
    if (/(line2d|pathcollection|errorbar|lines?_?\d|collection|series|patch|fill_|poly)/i.test(id)) {
      return `g:${id}`;
    }
    p = p.parentElement;
    depth += 1;
  }
  // direct parent group with any id
  const parentId = node.parentElement?.getAttribute("id");
  if (parentId) return `g:${parentId}`;
  return `c:${colorKey(el)}`;
}

/**
 * Parse a raw SVG string. Must run in the browser (uses getBBox).
 */
export function parseSvgString(raw: string, sourceName = "figure"): ParseResult {
  const warnings: ImportWarning[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, "image/svg+xml");
  const perr = doc.querySelector("parsererror");
  const svg = doc.documentElement as unknown as SVGSVGElement;
  if (perr || !svg || svg.tagName.toLowerCase() !== "svg") {
    warnings.push({ kind: "parse", message: "This file could not be parsed as SVG." });
    return { svg: raw, vb: { x: 0, y: 0, w: 100, h: 100 }, elements: [], series: [], textToPath: false, mode: "layout-only", warnings };
  }

  const vb = ensureRenderable(svg);

  // Import into the live document so geometry can be measured.
  const mount = document.createElement("div");
  mount.setAttribute("style", "position:fixed;left:-99999px;top:-99999px;width:10px;height:10px;overflow:hidden;opacity:0;pointer-events:none;");
  const liveSvg = document.importNode(svg, true) as SVGSVGElement;
  mount.appendChild(liveSvg);
  document.body.appendChild(mount);

  const elements: ParsedElement[] = [];
  const nodeByScid = new Map<string, Element>();

  try {
    const all = Array.from(liveSvg.querySelectorAll("*"));
    let textCount = 0;
    let glyphPathCount = 0;
    let imageArea = 0;

    for (const node of all) {
      const tag = node.tagName.toLowerCase();
      if (tag === "text") textCount += 1;
      if (!DRAWABLE.has(tag)) continue;
      if (inSkippedAncestor(node)) continue;

      const stroke = getStyleValue(node, "stroke");
      const fill = getStyleValue(node, "fill");
      const bbox = rootBBox(node as unknown as SVGGraphicsElement);

      // text-as-path signal: small filled achromatic paths (glyph outlines)
      if (tag === "path") {
        const small = Math.max(bbox.w, bbox.h) < Math.max(vb.w, vb.h) * 0.05;
        const filledDark = classifyColor(fill) === "black" || classifyColor(fill) === "gray";
        if (small && filledDark) glyphPathCount += 1;
      }
      if (tag === "image") imageArea += Math.max(0, bbox.w) * Math.max(0, bbox.h);

      let scid = node.getAttribute("data-scid");
      if (!scid) {
        scid = nextScid();
        node.setAttribute("data-scid", scid);
      }
      nodeByScid.set(scid, node);

      let length = Math.max(bbox.w, bbox.h);
      const geom = node as unknown as SVGGeometryElement;
      if (typeof geom.getTotalLength === "function") {
        try {
          const l = geom.getTotalLength();
          if (Number.isFinite(l) && l > 0) length = l;
        } catch {
          /* keep bbox-derived length */
        }
      }

      const fontSize = tag === "text" ? getStyleNumber(node, "font-size") : null;

      const el: ParsedElement = {
        scid,
        tag,
        role: (node.getAttribute("data-scrole") as ElementRole) || "unknown",
        idHint: idHintOf(node),
        groupKey: "",
        seriesId: node.getAttribute("data-scseries"),
        stroke: stroke ?? null,
        fill: fill ?? null,
        fillOpacity: getStyleNumber(node, "fill-opacity"),
        opacity: getStyleNumber(node, "opacity"),
        strokeWidth: getStyleNumber(node, "stroke-width"),
        strokeDasharray: getStyleValue(node, "stroke-dasharray"),
        gradientId: resolveGradientId(fill),
        bbox,
        pathLength: length,
        isGray: ["black", "white", "gray"].includes(classifyColor(stroke) ?? classifyColor(fill) ?? ""),
        hasMarker: isMarkerLike(node),
        text: tag === "text" ? node.textContent : null,
        fontSizePx: fontSize,
        hidden: getStyleValue(node, "display") === "none"
      };
      el.groupKey = groupKeyOf(node, el);
      elements.push(el);
    }

    // ---- C2: text converted to paths -----------------------------------
    const textToPath = textCount === 0 && glyphPathCount >= 10;
    if (textToPath) {
      warnings.push({
        kind: "text-as-path",
        message:
          "Text in this SVG was converted to paths — fonts can't be edited. Re-export keeping text (e.g. matplotlib svg.fonttype='none')."
      });
    }

    // ---- bitmap / layout-only ------------------------------------------
    let mode: PanelMode = "full";
    if (imageArea > 0.5 * vb.w * vb.h) {
      mode = "layout-only";
      warnings.push({
        kind: "bitmap",
        message: "This figure is mostly a bitmap image — layout only (its internal styles can't be edited)."
      });
    }

    // ---- color-scale (heatmap-like) detection --------------------------
    const gradients = Array.from(liveSvg.querySelectorAll("linearGradient,radialGradient"));
    const manyStops = gradients.some((g) => g.querySelectorAll("stop").length > 8);
    const distinctDataFills = new Set(
      elements.filter((e) => classifyColor(e.fill) === "data").map((e) => colorKey(e))
    );
    const looksLikeColorScale = (manyStops || distinctDataFills.size > 12) && textCount < 6;
    if (looksLikeColorScale && mode === "full") {
      warnings.push({
        kind: "color-scale",
        message: "This looks like a continuous color-scale figure (heatmap/contour) — recoloring would change its meaning. Layout only is recommended."
      });
    }

    // ---- Module D1: role recognition -----------------------------------
    assignRoles(elements);
    for (const e of elements) {
      const node = nodeByScid.get(e.scid);
      if (node) node.setAttribute("data-scrole", e.role);
    }

    // ---- C3: aggregate data series -------------------------------------
    const series = aggregateSeries(elements);
    for (const s of series) {
      for (const id of s.elementIds) {
        nodeByScid.get(id)?.setAttribute("data-scseries", s.id);
      }
    }

    pairLegends(series, elements);

    const outSvg = new XMLSerializer().serializeToString(liveSvg);
    return { svg: outSvg, vb, elements, series, textToPath, mode, warnings };
  } finally {
    document.body.removeChild(mount);
  }
}

/** C3 — build DataSeries from data-role elements (pure, model-only). */
export function aggregateSeries(elements: ParsedElement[]): DataSeries[] {
  const groups = new Map<string, ParsedElement[]>();
  for (const e of elements) {
    if (!DATA_ROLES.includes(e.role)) continue;
    // Sub-divide a group by representative color: differently-colored curves
    // that merely share a parent <g> (e.g. Origin exports) must not merge into
    // one series, while same-colored members (a dashed line's segments, a
    // scatter cloud, a bar set) stay together.
    const rgb = parseColor(seriesColorOf(e));
    const ck = rgb ? toHex(rgb) : "none";
    const key = `${e.groupKey}|${ck}`;
    const arr = groups.get(key) ?? [];
    arr.push(e);
    groups.set(key, arr);
  }

  const series: DataSeries[] = [];
  let order = 0;
  for (const [key, members] of groups) {
    // representative color: most frequent data color among members
    // (markers use their fill, lines use their stroke — see seriesColorOf)
    const counts = new Map<string, number>();
    for (const m of members) {
      const rgb = parseColor(seriesColorOf(m));
      if (rgb) {
        const hex = toHex(rgb);
        counts.set(hex, (counts.get(hex) ?? 0) + 1);
      }
    }
    let color = "#888888";
    let best = -1;
    for (const [hex, n] of counts) if (n > best) ((best = n), (color = hex));

    const roleVote = new Map<ElementRole, number>();
    for (const m of members) roleVote.set(m.role, (roleVote.get(m.role) ?? 0) + 1);
    let role: ElementRole = "data";
    let bestRole = -1;
    for (const [r, n] of roleVote) if (n > bestRole) ((bestRole = n), (role = r));

    const isFill = members.some((m) => classifyColor(m.fill) === "data");
    const gradientId = members.find((m) => m.gradientId)?.gradientId ?? null;
    const id = `s${hashKey(key)}`; // stable across re-aggregation (groupKey is stable)
    for (const m of members) m.seriesId = id;
    series.push({
      id,
      role,
      elementIds: members.map((m) => m.scid),
      color,
      emphasis: "normal",
      label: null,
      legendElementId: null,
      hasMarker: members.some((m) => m.hasMarker),
      isFill,
      gradientId,
      order
    });
    order += 1;
  }
  return series;
}

/** D3 — pair each series with a legend text by color proximity. */
function pairLegends(series: DataSeries[], elements: ParsedElement[]): void {
  const legendTexts = elements.filter((e) => e.role === "text-legend");
  // Explicit legend swatches win. A tiny data glyph is only a *fallback* (matplotlib
  // sometimes draws legend keys as small line2d/markers without a legend id). Without
  // this preference a small scatter point (pathLength<40) gets matched as the "swatch",
  // so recoloring hits the data point and the real legend key never changes.
  const explicit = elements.filter((e) => e.role === "legend");
  const fallback = elements.filter((e) => DATA_ROLES.includes(e.role) && e.pathLength < 40);
  const usedTexts = new Set<string>();
  for (const s of series) {
    const match = (sw: ParsedElement) => {
      const c = parseColor(seriesColorOf(sw));
      return !!c && toHex(c) === s.color;
    };
    // find a swatch whose color matches this series — explicit legend keys first
    const swatch = explicit.find(match) ?? fallback.find(match);
    if (!swatch) continue;
    // nearest legend text by *vertical center* (text bbox.y is the top, so
    // comparing tops to the swatch line would bias toward the row below)
    const swCy = swatch.bbox.y + swatch.bbox.h / 2;
    let nearestText: ParsedElement | null = null;
    let nd = Infinity;
    for (const t of legendTexts) {
      if (usedTexts.has(t.scid)) continue;
      const tCy = t.bbox.y + t.bbox.h / 2;
      const dx = t.bbox.x - (swatch.bbox.x + swatch.bbox.w);
      const dy = tCy - swCy;
      const d = Math.abs(dy) + Math.max(0, dx);
      if (d < nd) ((nd = d), (nearestText = t));
    }
    if (nearestText) {
      usedTexts.add(nearestText.scid);
      s.label = (nearestText.text ?? "").trim() || null;
      s.legendElementId = swatch.scid;
    }
  }
}

export { scidCounter };
