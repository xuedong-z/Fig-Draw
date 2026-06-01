/**
 * Global app state (Zustand) + undo/redo (Module I).
 *
 * The "document" (panels + page/typography/label settings + caption) is the
 * only thing snapshotted for undo. Selection and transient UI live outside
 * history. Each discrete edit calls `snapshot()` before mutating; continuous
 * canvas drags call `snapshot()` once at interaction start.
 */
"use client";
import { create } from "zustand";
import type {
  DataSeries,
  ElementRole,
  Emphasis,
  ExportSettings,
  Panel,
  ParsedElement,
  PanelLabelStyle,
  TypographySettings
} from "./types";
import { parseSvgString, aggregateSeries } from "./svg/parser";
import {
  bakeToCanvas as bakeToCanvasSvg,
  rebuildFigsize as rebuildFigsizeSvg,
  insetPlot as insetPlotSvg
} from "./svg/figsizeRebuild";
import {
  applyEmphasis,
  recolorSeries as recolorSeriesSvg,
  recolorLegendSwatches as recolorLegendSwatchesSvg,
  setElementRole as setRoleSvg,
  setElementStyle,
  setElementText as setElementTextSvg,
  setElementAttr as setElementAttrSvg,
  setElementHidden as setHiddenSvg,
  deleteElement as deleteElementSvg,
  unifyTypography as unifyTypographySvg,
  readElementColor as readElementColorSvg,
  panelScale,
  redrawAxisFrame,
  setBackgroundHidden as setBgHiddenSvg,
  applyGradientFill as applyGradientFillSvg,
  setSolidFill as setSolidFillSvg,
  reshapeMarkers as reshapeMarkersSvg,
  setTickDirection as setTickDirSvg,
  moveAxisLabel as moveAxisLabelSvg,
  setTickVisibility as setTickVisSvg,
  setAxisLabelGap as setAxisLabelGapSvg,
  type AxisFrameStyle,
  type TickDirection,
  type MarkerShape
} from "./svg/mutate";

export type { AxisFrameStyle, TickDirection };
import { colorsForCount, findPalette } from "./palettes";
import { FIGURE_CAPTION_DEFAULT } from "./fakeText";

/** figure-space pixels per millimetre (virtual coordinate system for layout). */
export const FIG_PX_PER_MM = 4;

// Nature submission guidelines: sans-serif (Arial/Helvetica), 5–7 pt type
// (≥5 pt), line widths ≥0.25 pt (0.5–1 pt typical).
const DEFAULT_TYPOGRAPHY: TypographySettings = {
  fontFamily: "Arial",
  axisLabelPt: 7,
  tickLabelPt: 6,
  legendPt: 6,
  titlePt: 7,
  dataLineWidthPt: 1.0,
  axisLineWidthPt: 0.5,
  tickLineWidthPt: 0.5
};

const DEFAULT_LABEL: PanelLabelStyle = {
  format: "(a)",
  position: "tl",
  fontFamily: "Arial",
  fontSizePt: 8, // Nature panel letters: ~8 pt bold
  bold: true,
  color: "#000000",
  whiteBacking: false,
  offsetPx: 4
};

const DEFAULT_EXPORT: ExportSettings = {
  widthMm: 183,
  heightMm: 120,
  dpi: 300,
  format: "png",
  transparent: false
};

interface DocSnapshot {
  panels: Panel[];
  caption: string;
  labelStyle: PanelLabelStyle;
  typography: TypographySettings;
  gutterMm: number;
  pageWidthMm: number;
  activePaletteId: string | null;
  axisFrame: AxisFrameStyle;
  bgTransparent: boolean;
  tickVisX: boolean;
  tickVisY: boolean;
  axisLabelGap: number;
  innerPad: number;
  layoutLocked: boolean;
  gridCols: number;
  gridGap: number;
}

export type RightTab = "palette" | "axis" | "emphasis" | "type" | "tune" | "export";
export type AlignKind = "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom";

interface AppState {
  // document
  panels: Panel[];
  caption: string;
  labelStyle: PanelLabelStyle;
  typography: TypographySettings;
  gutterMm: number;
  pageWidthMm: number;
  activePaletteId: string | null;
  axisFrame: AxisFrameStyle;
  bgTransparent: boolean;
  tickVisX: boolean;
  tickVisY: boolean;
  axisLabelGap: number;
  innerPad: number;
  layoutLocked: boolean;
  gridCols: number;
  gridGap: number;
  exportSettings: ExportSettings;

  // ui / selection (not in history)
  selectedPanelId: string | null;
  selectedPanelIds: string[]; // multi-select for align/distribute
  selectedElementId: string | null;
  rightTab: RightTab;
  showGrid: boolean;
  snapEnabled: boolean;
  importMessages: { id: string; text: string; tone: "info" | "warn" }[];

  // history
  past: DocSnapshot[];
  future: DocSnapshot[];

  // actions
  importSvg: (name: string, raw: string) => void;
  removePanel: (id: string) => void;
  selectPanel: (id: string | null) => void;
  togglePanelSelected: (id: string) => void;
  alignPanels: (kind: AlignKind) => void;
  distributePanels: (axis: "h" | "v") => void;
  applyElementStyleToRole: (panelId: string, scid: string) => void;
  selectElement: (id: string | null) => void;
  setRightTab: (t: RightTab) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;

  snapshot: () => void;
  updatePanelRect: (id: string, rect: { x: number; y: number; w: number; h: number }) => void;
  setPanelAspectLock: (id: string, locked: boolean) => void;
  reorderPanels: (orderedIds: string[]) => void;
  reflowPanels: () => void;

  applyPalette: (paletteId: string) => void;
  recolorSeries: (panelId: string, seriesId: string, color: string) => void;
  setSeriesEmphasis: (panelId: string, seriesId: string, emphasis: Emphasis) => void;
  setElementRole: (panelId: string, scid: string, role: ElementRole) => void;

  setTypography: (patch: Partial<TypographySettings>) => void;
  unifyTypography: () => void;
  tuneElement: (panelId: string, scid: string, prop: string, value: string) => void;
  hideElement: (panelId: string, scid: string, hidden: boolean) => void;
  deleteElement: (panelId: string, scid: string) => void;

  setLabelStyle: (patch: Partial<PanelLabelStyle>) => void;
  setGutterMm: (mm: number) => void;
  setAxisFrame: (style: AxisFrameStyle) => void;
  setBackgroundTransparent: (transparent: boolean) => void;
  autoCropPanel: (id: string) => void;
  setTickDirection: (direction: TickDirection) => void;
  setTickVisible: (axis: "x" | "y", visible: boolean) => void;
  setAxisLabelGap: (gap: number) => void;
  setInnerPad: (pad: number) => void;
  applyGrid: (cols: number) => void;
  setLayoutLocked: (locked: boolean) => void;
  setGridGap: (px: number) => void;
  cropSelected: () => void;
  cropAll: () => void;
  matchSizeSelected: () => void;
  setPanelTickDirection: (panelId: string, direction: TickDirection) => void;
  setElementText: (panelId: string, scid: string, text: string) => void;
  setElementMarkerSize: (panelId: string, scid: string, r: number) => void;
  setMarkerShape: (panelId: string, scid: string, shape: MarkerShape) => void;
  setMarkerSize: (panelId: string, scid: string, r: number) => void;
  setElementGradient: (panelId: string, scid: string, from: string, to: string) => void;
  moveAxisLabel: (panelId: string, scid: string, opts: { center?: boolean; nudge?: number }) => void;
  setPageWidthMm: (mm: number) => void;
  setCaption: (text: string) => void;
  setExport: (patch: Partial<ExportSettings>) => void;
  dismissMessage: (id: string) => void;

  undo: () => void;
  redo: () => void;
}

let messageCounter = 0;

function captureDoc(s: AppState): DocSnapshot {
  return structuredClone({
    panels: s.panels,
    caption: s.caption,
    labelStyle: s.labelStyle,
    typography: s.typography,
    gutterMm: s.gutterMm,
    pageWidthMm: s.pageWidthMm,
    activePaletteId: s.activePaletteId,
    axisFrame: s.axisFrame,
    bgTransparent: s.bgTransparent,
    tickVisX: s.tickVisX,
    tickVisY: s.tickVisY,
    axisLabelGap: s.axisLabelGap,
    innerPad: s.innerPad,
    layoutLocked: s.layoutLocked,
    gridCols: s.gridCols,
    gridGap: s.gridGap
  });
}

/** Plot-area box (figure/viewBox coords) for redrawing the axis frame. */
function plotBox(
  els: ParsedElement[],
  vb: { x: number; y: number; w: number; h: number }
): { x: number; y: number; w: number; h: number } {
  const figArea = vb.w * vb.h;
  const axisReal = els.filter((e) => e.role === "axis" && (e.bbox.w > 0 || e.bbox.h > 0));
  if (axisReal.length) {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const e of axisReal) {
      x0 = Math.min(x0, e.bbox.x);
      y0 = Math.min(y0, e.bbox.y);
      x1 = Math.max(x1, e.bbox.x + e.bbox.w);
      y1 = Math.max(y1, e.bbox.y + e.bbox.h);
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  const bgs = els.filter((e) => {
    const a = e.bbox.w * e.bbox.h;
    return e.role === "background" && a < 0.9 * figArea && a > 0.05 * figArea;
  });
  if (bgs.length) {
    const big = bgs.reduce((a, b) => (a.bbox.w * a.bbox.h > b.bbox.w * b.bbox.h ? a : b));
    return { ...big.bbox };
  }
  return { x: vb.x + vb.w * 0.12, y: vb.y + vb.h * 0.08, w: vb.w * 0.78, h: vb.h * 0.82 };
}

/** Recompute (a)(b)(c) labels from panel order. */
function relabel(panels: Panel[], style: PanelLabelStyle): Panel[] {
  const sorted = [...panels].sort((a, b) => a.order - b.order);
  sorted.forEach((p, i) => {
    p.label = formatLabel(i, style.format);
  });
  return panels;
}

export function formatLabel(index: number, format: PanelLabelStyle["format"]): string {
  const lower = String.fromCharCode(97 + (index % 26));
  const upper = lower.toUpperCase();
  switch (format) {
    case "(a)":
      return `(${lower})`;
    case "(A)":
      return `(${upper})`;
    case "a":
      return lower;
    case "A":
      return upper;
    default:
      return "";
  }
}

/** Place a freshly imported panel in a simple 2-column flow. */
function placeNewPanel(
  existing: Panel[],
  aspect: number,
  pageWidthMm: number,
  gutterMm: number
): { x: number; y: number; w: number; h: number } {
  const figW = pageWidthMm * FIG_PX_PER_MM;
  const cols = 2;
  const gutter = gutterMm * FIG_PX_PER_MM;
  const cellW = (figW - gutter * (cols - 1)) / cols;
  const w = cellW;
  const h = w / (aspect || 1.4);
  const idx = existing.length;
  const col = idx % cols;
  const row = Math.floor(idx / cols);
  // row height = max height in that row approximated by this panel's height
  const x = col * (cellW + gutter);
  const y = row * (h + gutter);
  return { x, y, w, h };
}

/**
 * Re-flow every panel into the 2-column grid using the current page width and
 * gutter, preserving panel order (and array order). Resets each panel's w/h to
 * the standard cell — manual sizes/positions are intentionally overridden, as
 * this is an explicit "tidy up" triggered by changing the gutter.
 */
function reflow(panels: Panel[], pageWidthMm: number, gutterMm: number): Panel[] {
  const figW = pageWidthMm * FIG_PX_PER_MM;
  const cols = 2;
  const gutter = gutterMm * FIG_PX_PER_MM;
  const cellW = (figW - gutter * (cols - 1)) / cols;
  const byOrder = [...panels].sort((a, b) => a.order - b.order);
  const rect = new Map<string, { x: number; y: number; w: number; h: number }>();
  let rowTop = 0;
  let rowMaxH = 0;
  byOrder.forEach((p, i) => {
    const col = i % cols;
    if (col === 0 && i > 0) {
      rowTop += rowMaxH + gutter;
      rowMaxH = 0;
    }
    const w = cellW;
    const h = w / (p.aspect || 1.4);
    rowMaxH = Math.max(rowMaxH, h);
    rect.set(p.id, { x: col * (cellW + gutter), y: rowTop, w, h });
  });
  return panels.map((p) => {
    const r = rect.get(p.id)!;
    if (p.mode === "layout-only" || (r.w === p.w && r.h === p.h)) return { ...p, ...r };
    const out = rebuildFigsizeSvg(p.svg, p.plot, p.vb.w, p.vb.h, r.w, r.h);
    // keep the geometric newPlot (exact + reversible) rather than re-detecting the
    // plot from getBBox each resize — the latter jitters and accumulates drift.
    return { ...reparsePanel({ ...p, ...r }, out.svg), plot: out.plot };
  });
}

/** Merge freshly aggregated series with previous ones, preserving user edits. */
function mergeSeries(oldSeries: DataSeries[], fresh: DataSeries[]): DataSeries[] {
  const byId = new Map(oldSeries.map((s) => [s.id, s]));
  return fresh.map((s) => {
    const prev = byId.get(s.id);
    if (!prev) return s;
    return { ...s, emphasis: prev.emphasis, label: prev.label ?? s.label, order: prev.order };
  });
}

/**
 * Re-derive elements/vb after a panel's SVG was structurally mutated (hide /
 * delete). `parseSvgString` preserves existing data-scid / data-scrole, so ids
 * and user role overrides survive. Series are intentionally kept as-is: hide /
 * delete targets structural elements, and data series still address members by
 * scid (a missing scid is simply skipped by later mutations).
 */
function reparsePanel(p: Panel, newSvg: string): Panel {
  const r = parseSvgString(newSvg, p.name);
  return { ...p, svg: r.svg, vb: r.vb, plot: plotBox(r.elements, r.vb), elements: r.elements };
}

/** Re-bake a panel to the tightest box around its visible, non-background content
 * (drops edge whitespace). Element sizes are preserved; the panel shrinks to fit. */
function cropPanel(p: Panel, label: PanelLabelStyle): Panel {
  if (p.mode === "layout-only") return p;
  const els = p.elements.filter(
    (e) => !e.hidden && e.role !== "background" && (e.bbox.w > 0 || e.bbox.h > 0)
  );
  if (!els.length) return p;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const e of els) {
    x0 = Math.min(x0, e.bbox.x);
    y0 = Math.min(y0, e.bbox.y);
    x1 = Math.max(x1, e.bbox.x + e.bbox.w);
    y1 = Math.max(y1, e.bbox.y + e.bbox.h);
  }
  const pad = Math.max(2, (x1 - x0) * 0.01);
  // reserve room above the content for the top-left (a)(b)(c) label so cropping
  // doesn't land it on the axes (label height + its inward gap + breathing room).
  const labelM = label.format === "none" ? 0 : Math.round(label.fontSizePt * 1.333 + Math.max(0, label.offsetPx) + 6);
  const box = { x: x0 - pad, y: y0 - pad - labelM, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 + labelM };
  const out = bakeToCanvasSvg(p.svg, box, p.plot, box.w, box.h);
  return reparsePanel({ ...p, w: box.w, h: box.h, aspect: box.w / box.h }, out.svg);
}

/**
 * Re-apply the global typography to a panel, compensated for the panel's
 * current stretch so type/line widths render at a constant figure-space size
 * across all panels. Operates on the panel's CURRENT svg (preserving manual
 * color/dash/hide edits); writes are absolute, so repeated calls (each resize)
 * don't accumulate. Emphasis is re-asserted last so emphasized widths win.
 */
function applyTypographyToPanel(p: Panel, typography: TypographySettings): Panel {
  if (p.mode === "layout-only") return p;
  const scale = panelScale(p.vb.w, p.vb.h, p.w, p.h);
  let svg = unifyTypographySvg(p.svg, typography, scale);
  for (const ser of p.series) {
    if (ser.emphasis !== "normal") {
      svg = applyEmphasis(svg, ser, ser.emphasis, typography.dataLineWidthPt, scale);
    }
  }
  // reparse so derived elements (fontSizePx / strokeWidth) reflect the new svg —
  // otherwise TunePanel shows stale values until the next resize forces a reparse
  // (the "size jumps after zoom" symptom). Typography doesn't move axes, keep plot.
  return { ...reparsePanel(p, svg), plot: p.plot };
}

export const useStore = create<AppState>((set, get) => ({
  panels: [],
  caption: FIGURE_CAPTION_DEFAULT,
  labelStyle: DEFAULT_LABEL,
  typography: DEFAULT_TYPOGRAPHY,
  gutterMm: 4,
  pageWidthMm: 183,
  activePaletteId: null,
  axisFrame: "original",
  bgTransparent: false,
  tickVisX: true,
  tickVisY: true,
  axisLabelGap: 28,
  innerPad: 0,
  layoutLocked: false,
  gridCols: 0,
  gridGap: 16,
  exportSettings: DEFAULT_EXPORT,

  selectedPanelId: null,
  selectedPanelIds: [],
  selectedElementId: null,
  rightTab: "palette",
  showGrid: true,
  snapEnabled: true,
  importMessages: [],

  past: [],
  future: [],

  importSvg: (name, raw) => {
    let result;
    try {
      result = parseSvgString(raw, name);
    } catch (err) {
      set((s) => ({
        importMessages: [
          ...s.importMessages,
          { id: `m${messageCounter++}`, text: `Failed to import ${name}: ${(err as Error).message}`, tone: "warn" }
        ]
      }));
      return;
    }
    get().snapshot();
    set((s) => {
      const aspect = result!.vb.w / result!.vb.h || 1.4;
      const rect = placeNewPanel(s.panels, aspect, s.pageWidthMm, s.gutterMm);
      const isFull = result!.mode !== "layout-only";
      const plot0 = plotBox(result!.elements, result!.vb);
      // Bake into 1:1 canvas pixel space so figsize re-lays-out instead of stretching.
      const baked = isFull
        ? bakeToCanvasSvg(result!.svg, result!.vb, plot0, rect.w, rect.h)
        : { svg: result!.svg, plot: plot0 };
      const re = isFull ? parseSvgString(baked.svg, name) : result!;
      const panel: Panel = {
        id: `p${Date.now().toString(36)}_${s.panels.length}`,
        name,
        label: "",
        svg: baked.svg,
        baseSvg: baked.svg,
        vb: isFull ? { x: 0, y: 0, w: rect.w, h: rect.h } : result!.vb,
        plot: baked.plot,
        aspect,
        x: rect.x,
        y: rect.y,
        w: rect.w,
        h: rect.h,
        aspectLocked: true,
        mode: result!.mode,
        warnings: result!.warnings,
        elements: re.elements,
        series: re.series,
        textToPath: result!.textToPath,
        order: s.panels.length
      };
      let prepared = panel;
      if (isFull) {
        if (s.axisFrame !== "original")
          prepared = { ...prepared, svg: redrawAxisFrame(prepared.svg, prepared.plot, s.axisFrame) };
        // apply the current global axis-title gap + tick visibility so a freshly
        // imported panel matches the rest without the user re-toggling anything.
        prepared = { ...prepared, svg: setAxisLabelGapSvg(prepared.svg, prepared.plot, s.axisLabelGap) };
        if (!s.tickVisX) prepared = { ...prepared, svg: setTickVisSvg(prepared.svg, "x", false) };
        if (!s.tickVisY) prepared = { ...prepared, svg: setTickVisSvg(prepared.svg, "y", false) };
        if (s.bgTransparent) prepared = { ...prepared, svg: setBgHiddenSvg(prepared.svg, true) };
      }
      const panels = relabel([...s.panels, prepared], s.labelStyle);
      const msgs = result!.warnings.map((w) => ({
        id: `m${messageCounter++}`,
        text: `${name}: ${w.message}`,
        tone: "warn" as const
      }));
      return {
        panels,
        selectedPanelId: panel.id,
        selectedElementId: null,
        importMessages: [...s.importMessages, ...msgs]
      };
    });
  },

  removePanel: (id) => {
    get().snapshot();
    set((s) => {
      const panels = relabel(
        s.panels.filter((p) => p.id !== id).map((p, i) => ({ ...p, order: i })),
        s.labelStyle
      );
      return { panels, selectedPanelId: s.selectedPanelId === id ? null : s.selectedPanelId };
    });
  },

  selectPanel: (id) =>
    set({ selectedPanelId: id, selectedElementId: null, selectedPanelIds: id ? [id] : [] }),
  togglePanelSelected: (id) =>
    set((s) => {
      const has = s.selectedPanelIds.includes(id);
      const ids = has ? s.selectedPanelIds.filter((x) => x !== id) : [...s.selectedPanelIds, id];
      return { selectedPanelIds: ids, selectedPanelId: id, selectedElementId: null };
    }),
  alignPanels: (kind) => {
    const ids = get().selectedPanelIds;
    if (ids.length < 2) return;
    get().snapshot();
    set((s) => {
      const sel = s.panels.filter((p) => ids.includes(p.id));
      const minX = Math.min(...sel.map((p) => p.x));
      const maxR = Math.max(...sel.map((p) => p.x + p.w));
      const minY = Math.min(...sel.map((p) => p.y));
      const maxB = Math.max(...sel.map((p) => p.y + p.h));
      const cx = (minX + maxR) / 2;
      const cy = (minY + maxB) / 2;
      const place = (p: Panel): Partial<Panel> => {
        switch (kind) {
          case "left":
            return { x: minX };
          case "right":
            return { x: maxR - p.w };
          case "hcenter":
            return { x: cx - p.w / 2 };
          case "top":
            return { y: minY };
          case "bottom":
            return { y: maxB - p.h };
          case "vcenter":
            return { y: cy - p.h / 2 };
        }
      };
      return { panels: s.panels.map((p) => (ids.includes(p.id) ? { ...p, ...place(p) } : p)) };
    });
  },
  distributePanels: (axis) => {
    const ids = get().selectedPanelIds;
    if (ids.length < 3) return;
    get().snapshot();
    set((s) => {
      const sel = s.panels.filter((p) => ids.includes(p.id));
      const horiz = axis === "h";
      const center = (p: Panel) => (horiz ? p.x + p.w / 2 : p.y + p.h / 2);
      sel.sort((a, b) => center(a) - center(b));
      const c0 = center(sel[0]);
      const cN = center(sel[sel.length - 1]);
      const step = (cN - c0) / (sel.length - 1);
      const pos = new Map<string, number>();
      sel.forEach((p, i) => pos.set(p.id, c0 + step * i - (horiz ? p.w : p.h) / 2));
      return {
        panels: s.panels.map((p) =>
          pos.has(p.id) ? { ...p, ...(horiz ? { x: pos.get(p.id)! } : { y: pos.get(p.id)! }) } : p
        )
      };
    });
  },
  applyElementStyleToRole: (panelId, scid) => {
    get().snapshot();
    set((s) => {
      const src = s.panels.find((p) => p.id === panelId);
      const el = src?.elements.find((e) => e.scid === scid);
      if (!src || !el) return {};
      const role = el.role;
      // read color live from the svg (tuneElement edits the svg, not the model)
      const { stroke, fill } = readElementColorSvg(src.svg, scid);
      const dash = el.strokeDasharray;
      const panels = s.panels.map((p) => {
        if (p.id !== panelId) return p; // apply only within the current figure
        let svg = p.svg;
        for (const e of p.elements) {
          if (e.role !== role) continue;
          if (stroke && stroke !== "none") svg = setElementStyle(svg, e.scid, "stroke", stroke);
          if (fill && fill !== "none") svg = setElementStyle(svg, e.scid, "fill", fill);
          if (dash != null) svg = setElementStyle(svg, e.scid, "stroke-dasharray", dash);
        }
        return svg === p.svg ? p : { ...reparsePanel(p, svg), plot: p.plot };
      });
      return { panels };
    });
  },
  selectElement: (id) => set({ selectedElementId: id }),
  setRightTab: (t) => set({ rightTab: t }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),

  snapshot: () =>
    set((s) => ({ past: [...s.past, captureDoc(s)].slice(-80), future: [] })),

  updatePanelRect: (id, rect) =>
    set((s) => ({
      panels: s.panels.map((p) => {
        if (p.id !== id) return p;
        // pure move (w/h unchanged) just repositions; a resize re-lays-out the
        // figure from the model — axes follow the box, text/strokes/markers fixed.
        if (p.mode === "layout-only" || (rect.w === p.w && rect.h === p.h)) {
          return { ...p, ...rect };
        }
        const out = rebuildFigsizeSvg(p.svg, p.plot, p.vb.w, p.vb.h, rect.w, rect.h);
        // reparse to refresh element bboxes (selection/frame/ticks); keep the
        // geometric newPlot — re-detecting it from getBBox jitters and drifts on
        // repeated resizes (edge X-tick labels creep outward).
        return { ...reparsePanel({ ...p, ...rect }, out.svg), plot: out.plot };
      })
    })),

  setPanelAspectLock: (id, locked) =>
    set((s) => ({ panels: s.panels.map((p) => (p.id === id ? { ...p, aspectLocked: locked } : p)) })),

  reorderPanels: (orderedIds) => {
    get().snapshot();
    set((s) => {
      const map = new Map(s.panels.map((p) => [p.id, p]));
      const panels = orderedIds
        .map((id, i) => {
          const p = map.get(id)!;
          return { ...p, order: i };
        })
        .filter(Boolean);
      return { panels: relabel(panels, s.labelStyle) };
    });
  },

  reflowPanels: () => {
    get().snapshot();
    set((s) => ({ panels: reflow(s.panels, s.pageWidthMm, s.gutterMm) }));
  },

  applyPalette: (paletteId) => {
    const palette = findPalette(paletteId);
    if (!palette) return;
    get().snapshot();
    set((s) => {
      const panels = s.panels.map((p) => {
        if (p.mode === "layout-only") return p;
        const dataSeries = [...p.series].sort((a, b) => a.order - b.order);
        const colors = colorsForCount(palette, dataSeries.length);
        let svg = p.svg;
        const series = p.series.map((ser) => {
          const idx = dataSeries.findIndex((d) => d.id === ser.id);
          const oldColor = ser.color;
          let finalColor: string;
          let gradientId: string | null = null;
          if (palette.gradients && ser.isFill) {
            // gradient palette + a fill series -> light->dark gradient fill
            const grad = palette.gradients[idx % palette.gradients.length];
            gradientId = `scgrad_${ser.id}`;
            svg = applyGradientFillSvg(svg, ser.elementIds, grad, gradientId);
            finalColor = grad.to;
          } else if (ser.isFill && !ser.hasMarker && ser.elementIds.length > 1) {
            // bar chart: each discrete bar gets the next palette color (distinct categories)
            ser.elementIds.forEach((eid, i) => {
              svg = setSolidFillSvg(svg, [eid], palette.colors[i % palette.colors.length]);
            });
            finalColor = palette.colors[0];
          } else if (ser.isFill) {
            finalColor =
              (palette.gradients ? palette.gradients[idx % palette.gradients.length].to : colors[idx]) ?? ser.color;
            svg = setSolidFillSvg(svg, ser.elementIds, finalColor); // solid (clears prior gradient url)
          } else {
            finalColor =
              (palette.gradients ? palette.gradients[idx % palette.gradients.length].to : colors[idx]) ?? ser.color;
            svg = recolorSeriesSvg(svg, ser, finalColor); // line/marker series
          }
          // recolor every legend key still drawn in the old color — a line+marker key has
          // two swatches, and the fill recoloring paths above skip the legend entirely.
          svg = recolorLegendSwatchesSvg(svg, oldColor, finalColor);
          return { ...ser, color: finalColor, gradientId };
        });
        return { ...p, svg, series };
      });
      return { panels, activePaletteId: paletteId };
    });
  },

  recolorSeries: (panelId, seriesId, color) => {
    get().snapshot();
    set((s) => ({
      panels: s.panels.map((p) => {
        if (p.id !== panelId) return p;
        const series = p.series.find((x) => x.id === seriesId);
        if (!series) return p;
        const svg = recolorSeriesSvg(p.svg, series, color);
        return {
          ...p,
          svg,
          series: p.series.map((x) => (x.id === seriesId ? { ...x, color } : x))
        };
      })
    }));
  },

  setSeriesEmphasis: (panelId, seriesId, emphasis) => {
    get().snapshot();
    set((s) => ({
      panels: s.panels.map((p) => {
        if (p.id !== panelId) return p;
        const series = p.series.find((x) => x.id === seriesId);
        if (!series) return p;
        const svg = applyEmphasis(p.svg, series, emphasis, s.typography.dataLineWidthPt);
        return {
          ...p,
          svg,
          series: p.series.map((x) => (x.id === seriesId ? { ...x, emphasis } : x))
        };
      })
    }));
  },

  setElementRole: (panelId, scid, role) => {
    get().snapshot();
    set((s) => ({
      panels: s.panels.map((p) => {
        if (p.id !== panelId) return p;
        const svg = setRoleSvg(p.svg, scid, role);
        const elements = p.elements.map((e) => (e.scid === scid ? { ...e, role } : e));
        const fresh = aggregateSeries(elements);
        const series = mergeSeries(p.series, fresh);
        return { ...p, svg, elements, series };
      })
    }));
  },

  setTypography: (patch) => {
    // store-only; sub-figures are normalized when the user hits "unify"
    set((s) => ({ typography: { ...s.typography, ...patch } }));
  },

  unifyTypography: () => {
    get().snapshot();
    set((s) => ({ panels: s.panels.map((p) => applyTypographyToPanel(p, s.typography)) }));
  },

  tuneElement: (panelId, scid, prop, value) => {
    get().snapshot();
    set((s) => ({
      panels: s.panels.map((p) =>
        // reparse to refresh elements (so the edited value sticks in TunePanel and
        // survives a later resize); keep plot — a style edit doesn't move the axes.
        p.id === panelId ? { ...reparsePanel(p, setElementStyle(p.svg, scid, prop, value)), plot: p.plot } : p
      )
    }));
  },

  setElementText: (panelId, scid, text) => {
    get().snapshot();
    set((s) => ({
      panels: s.panels.map((p) =>
        p.id === panelId ? { ...reparsePanel(p, setElementTextSvg(p.svg, scid, text)), plot: p.plot } : p
      )
    }));
  },

  setElementMarkerSize: (panelId, scid, r) => {
    get().snapshot();
    set((s) => ({
      panels: s.panels.map((p) =>
        p.id === panelId ? { ...reparsePanel(p, setElementAttrSvg(p.svg, scid, "r", String(r))), plot: p.plot } : p
      )
    }));
  },

  setMarkerShape: (panelId, scid, shape) => {
    get().snapshot();
    set((s) => ({
      panels: s.panels.map((p) => {
        if (p.id !== panelId) return p;
        const src = p.elements.find((e) => e.scid === scid);
        // apply to the whole series for a uniform look (fall back to the single marker)
        const scids = src?.seriesId
          ? p.elements.filter((e) => e.seriesId === src.seriesId).map((e) => e.scid)
          : [scid];
        return { ...reparsePanel(p, reshapeMarkersSvg(p.svg, scids, shape, null)), plot: p.plot };
      })
    }));
  },

  setMarkerSize: (panelId, scid, r) => {
    get().snapshot();
    set((s) => ({
      panels: s.panels.map((p) => {
        if (p.id !== panelId) return p;
        const src = p.elements.find((e) => e.scid === scid);
        const scids = src?.seriesId
          ? p.elements.filter((e) => e.seriesId === src.seriesId).map((e) => e.scid)
          : [scid];
        return { ...reparsePanel(p, reshapeMarkersSvg(p.svg, scids, null, r)), plot: p.plot };
      })
    }));
  },

  setElementGradient: (panelId, scid, from, to) => {
    get().snapshot();
    set((s) => ({
      panels: s.panels.map((p) =>
        p.id === panelId
          ? { ...reparsePanel(p, applyGradientFillSvg(p.svg, [scid], { from, to }, `scg_${scid}`)), plot: p.plot }
          : p
      )
    }));
  },

  hideElement: (panelId, scid, hidden) => {
    get().snapshot();
    set((s) => ({
      panels: s.panels.map((p) => (p.id === panelId ? reparsePanel(p, setHiddenSvg(p.svg, scid, hidden)) : p))
    }));
  },

  deleteElement: (panelId, scid) => {
    get().snapshot();
    set((s) => ({
      panels: s.panels.map((p) => (p.id === panelId ? reparsePanel(p, deleteElementSvg(p.svg, scid)) : p)),
      selectedElementId: s.selectedElementId === scid ? null : s.selectedElementId
    }));
  },

  setLabelStyle: (patch) => {
    get().snapshot();
    set((s) => {
      const labelStyle = { ...s.labelStyle, ...patch };
      return { labelStyle, panels: relabel([...s.panels], labelStyle) };
    });
  },

  setGutterMm: (mm) => {
    const g = Math.max(0, mm);
    get().snapshot();
    set((s) => ({ gutterMm: g, panels: reflow(s.panels, s.pageWidthMm, g) }));
  },

  setAxisFrame: (style) => {
    get().snapshot();
    set((s) => ({
      axisFrame: style,
      panels: s.panels.map((p) =>
        // keep the existing plot: re-deriving it from the redrawn frame's getBBox
        // (which includes stroke width) drifts the box a little on every toggle.
        p.mode === "layout-only" ? p : { ...reparsePanel(p, redrawAxisFrame(p.svg, p.plot, style)), plot: p.plot }
      )
    }));
  },

  setBackgroundTransparent: (transparent) => {
    get().snapshot();
    set((s) => ({
      bgTransparent: transparent,
      panels: s.panels.map((p) =>
        p.mode === "layout-only" ? p : { ...p, svg: setBgHiddenSvg(p.svg, transparent) }
      )
    }));
  },

  autoCropPanel: (id) => {
    get().snapshot();
    set((s) => ({ panels: s.panels.map((p) => (p.id === id ? cropPanel(p, s.labelStyle) : p)) }));
  },

  cropSelected: () => {
    const ids = get().selectedPanelIds;
    if (!ids.length) return;
    get().snapshot();
    set((s) => ({ panels: s.panels.map((p) => (ids.includes(p.id) ? cropPanel(p, s.labelStyle) : p)) }));
  },

  cropAll: () => {
    if (!get().panels.length) return;
    get().snapshot();
    set((s) => ({ panels: s.panels.map((p) => cropPanel(p, s.labelStyle)) }));
  },

  matchSizeSelected: () => {
    const ids = get().selectedPanelIds;
    if (ids.length < 2) return;
    get().snapshot();
    set((s) => {
      const sel = s.panels.filter((p) => ids.includes(p.id) && p.mode !== "layout-only");
      if (sel.length < 2) return {};
      const W = sel[0].w, H = sel[0].h; // match every selected panel to the first one's size
      return {
        panels: s.panels.map((p) => {
          if (!ids.includes(p.id) || p.mode === "layout-only") return p;
          if (Math.abs(p.w - W) < 0.5 && Math.abs(p.h - H) < 0.5) return p;
          const out = rebuildFigsizeSvg(p.svg, p.plot, p.vb.w, p.vb.h, W, H);
          return { ...reparsePanel({ ...p, w: W, h: H, aspect: W / H }, out.svg), plot: out.plot };
        })
      };
    });
  },

  setTickDirection: (direction) => {
    get().snapshot();
    set((s) => ({
      panels: s.panels.map((p) =>
        p.mode === "layout-only" ? p : { ...p, svg: setTickDirSvg(p.svg, p.plot, direction) }
      )
    }));
  },

  setPanelTickDirection: (panelId, direction) => {
    get().snapshot();
    set((s) => ({
      panels: s.panels.map((p) =>
        p.id === panelId && p.mode !== "layout-only" ? { ...p, svg: setTickDirSvg(p.svg, p.plot, direction) } : p
      )
    }));
  },

  setTickVisible: (axis, visible) => {
    get().snapshot();
    set((s) => ({
      tickVisX: axis === "x" ? visible : s.tickVisX,
      tickVisY: axis === "y" ? visible : s.tickVisY,
      panels: s.panels.map((p) =>
        p.mode === "layout-only" ? p : { ...reparsePanel(p, setTickVisSvg(p.svg, axis, visible)), plot: p.plot }
      )
    }));
  },

  setAxisLabelGap: (gap) => {
    get().snapshot();
    set((s) => ({
      axisLabelGap: gap,
      panels: s.panels.map((p) =>
        p.mode === "layout-only" ? p : { ...reparsePanel(p, setAxisLabelGapSvg(p.svg, p.plot, gap)), plot: p.plot }
      )
    }));
  },

  setInnerPad: (pad) => {
    get().snapshot();
    set((s) => {
      // inset the plot by the DELTA from the current padding (reversible), keeping
      // each panel's position & size fixed — increases inter-panel whitespace
      // without reflowing. plot follows the geometric inset (no getBBox jitter).
      const delta = pad - s.innerPad;
      return {
        innerPad: pad,
        panels: s.panels.map((p) => {
          if (p.mode === "layout-only") return p;
          const out = insetPlotSvg(p.svg, p.plot, delta);
          return { ...reparsePanel(p, out.svg), plot: out.plot };
        })
      };
    });
  },

  applyGrid: (cols) => {
    get().snapshot();
    set((s) => {
      const ordered = [...s.panels].sort((a, b) => a.order - b.order);
      const editable = ordered.filter((p) => p.mode !== "layout-only");
      const g = s.gridGap;
      const figW = s.pageWidthMm * FIG_PX_PER_MM;
      const cellW = (figW - g * (cols - 1)) / cols;
      const avgAspect = editable.length
        ? editable.reduce((a, p) => a + (p.aspect || 1.4), 0) / editable.length
        : 1.4;
      const cellH = cellW / avgAspect;
      const byId = new Map<string, Panel>();
      ordered.forEach((p, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = col * (cellW + g);
        const y = row * (cellH + g);
        if (p.mode === "layout-only" || (Math.abs(p.w - cellW) < 0.5 && Math.abs(p.h - cellH) < 0.5)) {
          byId.set(p.id, { ...p, x, y, w: cellW, h: cellH });
        } else {
          const out = rebuildFigsizeSvg(p.svg, p.plot, p.vb.w, p.vb.h, cellW, cellH);
          byId.set(p.id, { ...reparsePanel({ ...p, x, y, w: cellW, h: cellH }, out.svg), plot: out.plot });
        }
      });
      // a grid is the "regular" fixed layout — lock it; the user unlocks to free-place.
      return { gridCols: cols, layoutLocked: true, panels: s.panels.map((p) => byId.get(p.id) ?? p) };
    });
  },

  setLayoutLocked: (locked) => set({ layoutLocked: locked }),

  setGridGap: (px) => {
    set({ gridGap: px });
    // re-flow the current grid with the new gap (keeps columns + locked state)
    if (get().gridCols > 0) get().applyGrid(get().gridCols);
  },

  moveAxisLabel: (panelId, scid, opts) => {
    get().snapshot();
    set((s) => ({
      panels: s.panels.map((p) =>
        p.id === panelId ? reparsePanel(p, moveAxisLabelSvg(p.svg, scid, p.plot, opts)) : p
      )
    }));
  },

  setPageWidthMm: (mm) => {
    get().snapshot();
    set({ pageWidthMm: Math.max(40, mm) });
  },

  setCaption: (text) => set({ caption: text }),

  setExport: (patch) => set((s) => ({ exportSettings: { ...s.exportSettings, ...patch } })),

  dismissMessage: (id) => set((s) => ({ importMessages: s.importMessages.filter((m) => m.id !== id) })),

  undo: () =>
    set((s) => {
      if (s.past.length === 0) return s;
      const previous = s.past[s.past.length - 1];
      const future = [captureDoc(s), ...s.future].slice(0, 80);
      return { ...s, ...previous, past: s.past.slice(0, -1), future };
    }),

  redo: () =>
    set((s) => {
      if (s.future.length === 0) return s;
      const next = s.future[0];
      const past = [...s.past, captureDoc(s)].slice(-80);
      return { ...s, ...next, past, future: s.future.slice(1) };
    })
}));

// Dev-only debug handle (stripped from production builds).
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __sc?: typeof useStore }).__sc = useStore;
}
