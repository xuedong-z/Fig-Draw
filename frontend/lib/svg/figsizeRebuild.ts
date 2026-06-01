/**
 * Model-based figsize (Origin-style re-layout).
 *
 * Instead of stretching the whole SVG and counter-compensating text/strokes,
 * we work in a 1:1 coordinate space (viewBox = panel size) and *reposition*
 * elements directly:
 *  - the plot area = panel minus fixed margins (label space stays constant);
 *  - data / grid / frame geometry is linearly mapped old-plot -> new-plot
 *    (axes lengthen, curves keep shape);
 *  - markers keep size, only their center moves with the data;
 *  - ticks keep length, their on-axis end follows the axis;
 *  - tick labels & axis titles keep a fixed distance to the axis, sliding along
 *    it with the data;
 *  - font sizes, stroke widths, marker radii are constants (no stretch).
 *
 * The geometry math (path/point remap, anchor placement) is pure and unit-tested
 * in figsizeRebuild.test.mjs; the DOM wiring uses the unified style accessor.
 */
import { getStyleValue, setStyleValue } from "./styleAccessor";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Remap every absolute coordinate of an SVG path `d` with (fx, fy); relative
 * segments are scaled by (sx, sy). Supports M L H V C S Q T A Z (abs + rel). */
export function remapPathD(
  d: string,
  fx: (x: number) => number,
  fy: (y: number) => number,
  sx: number,
  sy: number
): string {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:[eE][-+]?\d+)?/g);
  if (!tokens) return d;
  const out: (string | number)[] = [];
  let cmd = "";
  let i = 0;
  const num = (t: string) => parseFloat(t);
  while (i < tokens.length) {
    const t = tokens[i];
    if (/[a-zA-Z]/.test(t)) {
      cmd = t;
      out.push(t);
      i += 1;
      continue;
    }
    const C = cmd.toUpperCase();
    const absolute = cmd === C;
    const mapX = (v: string) => round(absolute ? fx(num(v)) : num(v) * sx);
    const mapY = (v: string) => round(absolute ? fy(num(v)) : num(v) * sy);
    if (C === "M" || C === "L" || C === "T") {
      out.push(mapX(tokens[i]), mapY(tokens[i + 1]));
      i += 2;
    } else if (C === "H") {
      out.push(mapX(tokens[i]));
      i += 1;
    } else if (C === "V") {
      out.push(mapY(tokens[i]));
      i += 1;
    } else if (C === "C") {
      out.push(mapX(tokens[i]), mapY(tokens[i + 1]), mapX(tokens[i + 2]), mapY(tokens[i + 3]), mapX(tokens[i + 4]), mapY(tokens[i + 5]));
      i += 6;
    } else if (C === "S" || C === "Q") {
      out.push(mapX(tokens[i]), mapY(tokens[i + 1]), mapX(tokens[i + 2]), mapY(tokens[i + 3]));
      i += 4;
    } else if (C === "A") {
      // rx ry x-rot large-arc sweep x y  (radii scale, flags pass through)
      out.push(round(num(tokens[i]) * sx), round(num(tokens[i + 1]) * sy), tokens[i + 2], tokens[i + 3], tokens[i + 4], mapX(tokens[i + 5]), mapY(tokens[i + 6]));
      i += 7;
    } else {
      out.push(num(tokens[i]));
      i += 1;
    }
  }
  // join: keep a space before numbers, no space needed after a command letter
  let s = "";
  for (const tok of out) {
    if (typeof tok === "string") s += (s ? " " : "") + tok;
    else s += " " + tok;
  }
  return s.trim();
}

/** Remap a polyline/polygon `points` list "x,y x,y ..." with (fx, fy). */
export function remapPoints(points: string, fx: (x: number) => number, fy: (y: number) => number): string {
  const nums = points.match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g);
  if (!nums) return points;
  const out: number[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    out.push(round(fx(parseFloat(nums[i]))), round(fy(parseFloat(nums[i + 1]))));
  }
  const pairs: string[] = [];
  for (let i = 0; i + 1 < out.length; i += 2) pairs.push(`${out[i]},${out[i + 1]}`);
  return pairs.join(" ");
}

/**
 * Build the plot-area remap for a figsize change. Margins (label space around
 * the plot) are held fixed; the plot fills the rest of the new panel.
 */
export function planFigsize(
  plot: Box,
  vbW: number,
  vbH: number,
  newW: number,
  newH: number
): { newPlot: Box; mapX: (x: number) => number; mapY: (y: number) => number; sx: number; sy: number } {
  const mL = plot.x;
  const mT = plot.y;
  const mR = vbW - (plot.x + plot.w);
  const mB = vbH - (plot.y + plot.h);
  const newPlot: Box = {
    x: mL,
    y: mT,
    w: Math.max(10, newW - mL - mR),
    h: Math.max(10, newH - mT - mB)
  };
  const sx = newPlot.w / plot.w;
  const sy = newPlot.h / plot.h;
  // linear: a coord at the plot's left edge stays at mL, right edge at mL+newW';
  // coords outside the plot (labels handled separately) would extrapolate.
  const mapX = (x: number) => newPlot.x + (x - plot.x) * sx;
  const mapY = (y: number) => newPlot.y + (y - plot.y) * sy;
  return { newPlot, mapX, mapY, sx, sy };
}

function openDoc(svg: string): { root: SVGSVGElement; serialize: () => string } {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement as unknown as SVGSVGElement;
  return { root, serialize: () => new XMLSerializer().serializeToString(root) };
}

const numAttr = (el: Element, name: string) => parseFloat(el.getAttribute(name) ?? "0") || 0;

/**
 * Re-lay-out every element from the current `plot` box into a `newPlot` box. Element
 * SIZES (font, stroke, marker radius, tick length) stay constant, only POSITIONS
 * move: data/grid/frame map linearly; markers keep size; ticks keep length with the
 * anchor on the axis; axis titles & tick labels keep a fixed perpendicular distance.
 * Shared by figsize (panel resize) and inner-padding (plot inset).
 */
function relayoutElements(root: SVGSVGElement, plot: Box, newPlot: Box): void {
  const sx = newPlot.w / plot.w;
  const sy = newPlot.h / plot.h;
  const mapX = (x: number) => newPlot.x + (x - plot.x) * sx;
  const mapY = (y: number) => newPlot.y + (y - plot.y) * sy;
  const px1 = plot.x;
  const px2 = plot.x + plot.w;
  const py1 = plot.y;
  const py2 = plot.y + plot.h;
  const npx2 = newPlot.x + newPlot.w;
  const npy2 = newPlot.y + newPlot.h;

  root.querySelectorAll("[data-scid]").forEach((el) => {
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute("data-scrole") || "";

    // reshaped scatter marker: keep its size & shape constant, only re-center it on
    // the data (so markers don't stretch when the plot does).
    if (el.hasAttribute("data-scmx")) {
      const cx = numAttr(el, "data-scmx");
      const cy = numAttr(el, "data-scmy");
      const ddx = mapX(cx) - cx;
      const ddy = mapY(cy) - cy;
      if (tag === "circle" || tag === "ellipse") {
        el.setAttribute("cx", String(round(numAttr(el, "cx") + ddx)));
        el.setAttribute("cy", String(round(numAttr(el, "cy") + ddy)));
      } else if (tag === "rect") {
        el.setAttribute("x", String(round(numAttr(el, "x") + ddx)));
        el.setAttribute("y", String(round(numAttr(el, "y") + ddy)));
      } else {
        const d = el.getAttribute("d");
        if (d) el.setAttribute("d", remapPathD(d, (x) => x + ddx, (y) => y + ddy, 1, 1));
      }
      el.setAttribute("data-scmx", String(round(mapX(cx))));
      el.setAttribute("data-scmy", String(round(mapY(cy))));
      return;
    }

    if (tag === "text") {
      const x = numAttr(el, "x");
      const y = numAttr(el, "y");
      // Decide whether this label belongs to the X axis (below/above the plot) or
      // the Y axis (left/right) by which way it sits FURTHER outside the plot. A
      // robust test: the old `x < px1` ordering made an edge X-tick label (whose x
      // ≈ the plot corner) flip between "slide along X" and "fixed horizontal
      // offset" as the reparsed plot edge jittered — drifting on repeated resizes.
      const dxOut = Math.max(px1 - x, x - px2, 0);
      const dyOut = Math.max(py1 - y, y - py2, 0);
      let nx: number;
      let ny: number;
      if (dxOut > dyOut) {
        // Y-axis side: fixed horizontal distance to the axis, slides along Y
        nx = x < px1 ? newPlot.x - (px1 - x) : npx2 + (x - px2);
        ny = mapY(y);
      } else if (dyOut > 0) {
        // X-axis side: fixed vertical distance to the axis, slides along X
        nx = mapX(x);
        ny = y < py1 ? newPlot.y - (py1 - y) : npy2 + (y - py2);
      } else {
        // inside the plot (legend / annotations): follow the data both ways
        nx = mapX(x);
        ny = mapY(y);
      }
      el.setAttribute("x", String(round(nx)));
      el.setAttribute("y", String(round(ny)));
      const tf = el.getAttribute("transform");
      if (tf && /rotate/.test(tf)) {
        el.setAttribute("transform", tf.replace(/rotate\(\s*(-?[\d.]+)[^)]*\)/, `rotate($1 ${round(nx)} ${round(ny)})`));
      }
      return;
    }

    if (tag === "circle" || tag === "ellipse") {
      el.setAttribute("cx", String(round(mapX(numAttr(el, "cx")))));
      el.setAttribute("cy", String(round(mapY(numAttr(el, "cy")))));
      return; // radius unchanged
    }

    if (role === "tick") {
      const m = (el.getAttribute("d") ?? "").match(/M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*L\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/i);
      if (m) {
        const ax = +m[1];
        const ay = +m[2];
        const bx = +m[3];
        const by = +m[4];
        const tdx = bx - ax;
        const tdy = by - ay;
        // anchor = the end on the axis line (nearer the relevant edge). It follows
        // the data via mapX/mapY; the free end keeps the original tick vector, so
        // tick length & direction stay constant. Classify by tick orientation so a
        // corner tick (on two edges) is not mis-anchored.
        const vertical = Math.abs(tdy) >= Math.abs(tdx);
        let anchorA: boolean;
        if (vertical) {
          anchorA = Math.min(Math.abs(ay - py1), Math.abs(ay - py2)) <= Math.min(Math.abs(by - py1), Math.abs(by - py2));
        } else {
          anchorA = Math.min(Math.abs(ax - px1), Math.abs(ax - px2)) <= Math.min(Math.abs(bx - px1), Math.abs(bx - px2));
        }
        const fxp = mapX(anchorA ? ax : bx);
        const fyp = mapY(anchorA ? ay : by);
        const dx = anchorA ? tdx : -tdx;
        const dy = anchorA ? tdy : -tdy;
        el.setAttribute("d", `M${round(fxp)} ${round(fyp)} L${round(fxp + dx)} ${round(fyp + dy)}`);
      }
      return;
    }

    if (tag === "rect") {
      el.setAttribute("x", String(round(mapX(numAttr(el, "x")))));
      el.setAttribute("y", String(round(mapY(numAttr(el, "y")))));
      el.setAttribute("width", String(round(numAttr(el, "width") * sx)));
      el.setAttribute("height", String(round(numAttr(el, "height") * sy)));
      return;
    }

    if (tag === "path" || tag === "polyline" || tag === "polygon") {
      const d = el.getAttribute("d");
      if (d) el.setAttribute("d", remapPathD(d, mapX, mapY, sx, sy));
      const pts = el.getAttribute("points");
      if (pts) el.setAttribute("points", remapPoints(pts, mapX, mapY));
      return;
    }

    if (tag === "line") {
      el.setAttribute("x1", String(round(mapX(numAttr(el, "x1")))));
      el.setAttribute("y1", String(round(mapY(numAttr(el, "y1")))));
      el.setAttribute("x2", String(round(mapX(numAttr(el, "x2")))));
      el.setAttribute("y2", String(round(mapY(numAttr(el, "y2")))));
      return;
    }
  });
}

/**
 * Figsize: re-lay-out the figure for a new panel size (1:1 space, viewBox = panel).
 * Margins stay fixed, the plot fills the rest. Returns the new svg + plot box.
 */
export function rebuildFigsize(
  svg: string,
  plot: Box,
  vbW: number,
  vbH: number,
  newW: number,
  newH: number
): { svg: string; plot: Box } {
  const { root, serialize } = openDoc(svg);
  const { newPlot } = planFigsize(plot, vbW, vbH, newW, newH);
  relayoutElements(root, plot, newPlot);
  root.setAttribute("viewBox", `0 0 ${round(newW)} ${round(newH)}`);
  // keep width/height attrs in sync with the viewBox: re-parsing measures bbox
  // via getCTM(), which scales by width/viewBox — a stale width would scale the
  // measured bbox away from the (correct) 1:1 coordinates.
  root.setAttribute("width", String(round(newW)));
  root.setAttribute("height", String(round(newH)));
  root.setAttribute("preserveAspectRatio", "none");
  return { svg: serialize(), plot: newPlot };
}

/**
 * Inner padding: inset the plot by `delta` px on every side (negative removes it),
 * keeping the PANEL (viewBox/size) fixed. Content re-lays-out into the smaller plot,
 * which increases the whitespace between panels WITHOUT moving or reflowing them.
 * `delta` is applied relative to the current plot, so the caller passes (new−old).
 */
export function insetPlot(svg: string, plot: Box, delta: number): { svg: string; plot: Box } {
  const { root, serialize } = openDoc(svg);
  const newPlot: Box = {
    x: plot.x + delta,
    y: plot.y + delta,
    w: Math.max(10, plot.w - 2 * delta),
    h: Math.max(10, plot.h - 2 * delta)
  };
  relayoutElements(root, plot, newPlot);
  return { svg: serialize(), plot: newPlot };
}

/**
 * Bake the original SVG (in its source viewBox coords) into a 1:1 canvas space
 * (viewBox = w0 × h0) by equal-ratio scaling every coordinate AND size. Done once
 * at import so later figsize rebuilds work in plain pixel space (no viewBox
 * stretch, no counter-scale transforms). Returns the baked svg + plot box.
 */
export function bakeToCanvas(svg: string, vb: Box, plot: Box, w0: number, h0: number): { svg: string; plot: Box } {
  const { root, serialize } = openDoc(svg);
  const s = vb.w ? w0 / vb.w : 1;
  const fx = (x: number) => (x - vb.x) * s;
  const fy = (y: number) => (y - vb.y) * s;

  root.querySelectorAll("[data-scid]").forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (tag === "path" || tag === "polyline" || tag === "polygon") {
      const d = el.getAttribute("d");
      if (d) el.setAttribute("d", remapPathD(d, fx, fy, s, s));
      const pts = el.getAttribute("points");
      if (pts) el.setAttribute("points", remapPoints(pts, fx, fy));
    } else if (tag === "rect") {
      el.setAttribute("x", String(round(fx(numAttr(el, "x")))));
      el.setAttribute("y", String(round(fy(numAttr(el, "y")))));
      el.setAttribute("width", String(round(numAttr(el, "width") * s)));
      el.setAttribute("height", String(round(numAttr(el, "height") * s)));
    } else if (tag === "circle") {
      el.setAttribute("cx", String(round(fx(numAttr(el, "cx")))));
      el.setAttribute("cy", String(round(fy(numAttr(el, "cy")))));
      el.setAttribute("r", String(round(numAttr(el, "r") * s)));
    } else if (tag === "ellipse") {
      el.setAttribute("cx", String(round(fx(numAttr(el, "cx")))));
      el.setAttribute("cy", String(round(fy(numAttr(el, "cy")))));
      el.setAttribute("rx", String(round(numAttr(el, "rx") * s)));
      el.setAttribute("ry", String(round(numAttr(el, "ry") * s)));
    } else if (tag === "line") {
      el.setAttribute("x1", String(round(fx(numAttr(el, "x1")))));
      el.setAttribute("y1", String(round(fy(numAttr(el, "y1")))));
      el.setAttribute("x2", String(round(fx(numAttr(el, "x2")))));
      el.setAttribute("y2", String(round(fy(numAttr(el, "y2")))));
    } else if (tag === "text") {
      const nx = fx(numAttr(el, "x"));
      const ny = fy(numAttr(el, "y"));
      el.setAttribute("x", String(round(nx)));
      el.setAttribute("y", String(round(ny)));
      const tf = el.getAttribute("transform");
      if (tf && /rotate/.test(tf)) {
        el.setAttribute("transform", tf.replace(/rotate\(\s*(-?[\d.]+)[^)]*\)/, `rotate($1 ${round(nx)} ${round(ny)})`));
      }
    }
    const fs = getStyleValue(el, "font-size");
    if (fs) {
      const v = parseFloat(fs);
      if (Number.isFinite(v)) setStyleValue(el, "font-size", `${round(v * s)}px`);
    }
    const sw = getStyleValue(el, "stroke-width");
    if (sw) {
      const v = parseFloat(sw);
      if (Number.isFinite(v)) setStyleValue(el, "stroke-width", String(round(v * s)));
    }
    // keep a reshaped marker's stored geometry in sync with the bake scale
    if (el.hasAttribute("data-scmx")) {
      el.setAttribute("data-scmx", String(round(fx(numAttr(el, "data-scmx")))));
      el.setAttribute("data-scmy", String(round(fy(numAttr(el, "data-scmy")))));
      el.setAttribute("data-scmr", String(round(numAttr(el, "data-scmr") * s)));
    }
  });

  root.setAttribute("viewBox", `0 0 ${round(w0)} ${round(h0)}`);
  // sync width/height attrs to the baked viewBox so a later parseSvgString()
  // measures bbox in true 1:1 coords (getCTM scales by width/viewBox).
  root.setAttribute("width", String(round(w0)));
  root.setAttribute("height", String(round(h0)));
  root.setAttribute("preserveAspectRatio", "none");
  return {
    svg: serialize(),
    plot: { x: round(fx(plot.x)), y: round(fy(plot.y)), w: round(plot.w * s), h: round(plot.h * s) }
  };
}
