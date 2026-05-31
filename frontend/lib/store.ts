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
  PanelLabelStyle,
  TypographySettings
} from "./types";
import { parseSvgString, aggregateSeries } from "./svg/parser";
import {
  applyEmphasis,
  recolorSeries as recolorSeriesSvg,
  setElementRole as setRoleSvg,
  setElementStyle,
  unifyTypography as unifyTypographySvg
} from "./svg/mutate";
import { colorsForCount, findPalette } from "./palettes";
import { FIGURE_CAPTION_DEFAULT } from "./fakeText";

/** figure-space pixels per millimetre (virtual coordinate system for layout). */
export const FIG_PX_PER_MM = 4;

const DEFAULT_TYPOGRAPHY: TypographySettings = {
  fontFamily: "Arial",
  axisLabelPt: 8,
  tickLabelPt: 7,
  legendPt: 7,
  titlePt: 9,
  dataLineWidthPt: 1.2,
  axisLineWidthPt: 0.8,
  tickLineWidthPt: 0.8
};

const DEFAULT_LABEL: PanelLabelStyle = {
  format: "(a)",
  position: "tl",
  fontFamily: "Arial",
  fontSizePt: 9,
  bold: true,
  color: "#000000",
  whiteBacking: false
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
}

export type RightTab = "palette" | "emphasis" | "type" | "tune" | "export";

interface AppState {
  // document
  panels: Panel[];
  caption: string;
  labelStyle: PanelLabelStyle;
  typography: TypographySettings;
  gutterMm: number;
  pageWidthMm: number;
  activePaletteId: string | null;
  exportSettings: ExportSettings;

  // ui / selection (not in history)
  selectedPanelId: string | null;
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
  selectElement: (id: string | null) => void;
  setRightTab: (t: RightTab) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;

  snapshot: () => void;
  updatePanelRect: (id: string, rect: { x: number; y: number; w: number; h: number }) => void;
  setPanelAspectLock: (id: string, locked: boolean) => void;
  reorderPanels: (orderedIds: string[]) => void;

  applyPalette: (paletteId: string) => void;
  recolorSeries: (panelId: string, seriesId: string, color: string) => void;
  setSeriesEmphasis: (panelId: string, seriesId: string, emphasis: Emphasis) => void;
  setElementRole: (panelId: string, scid: string, role: ElementRole) => void;

  setTypography: (patch: Partial<TypographySettings>) => void;
  unifyTypography: () => void;
  tuneElement: (panelId: string, scid: string, prop: string, value: string) => void;

  setLabelStyle: (patch: Partial<PanelLabelStyle>) => void;
  setGutterMm: (mm: number) => void;
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
    activePaletteId: s.activePaletteId
  });
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
function placeNewPanel(existing: Panel[], aspect: number, pageWidthMm: number): { x: number; y: number; w: number; h: number } {
  const figW = pageWidthMm * FIG_PX_PER_MM;
  const cols = 2;
  const gutter = 4 * FIG_PX_PER_MM;
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

/** Merge freshly aggregated series with previous ones, preserving user edits. */
function mergeSeries(oldSeries: DataSeries[], fresh: DataSeries[]): DataSeries[] {
  const byId = new Map(oldSeries.map((s) => [s.id, s]));
  return fresh.map((s) => {
    const prev = byId.get(s.id);
    if (!prev) return s;
    return { ...s, emphasis: prev.emphasis, label: prev.label ?? s.label, order: prev.order };
  });
}

export const useStore = create<AppState>((set, get) => ({
  panels: [],
  caption: FIGURE_CAPTION_DEFAULT,
  labelStyle: DEFAULT_LABEL,
  typography: DEFAULT_TYPOGRAPHY,
  gutterMm: 4,
  pageWidthMm: 183,
  activePaletteId: null,
  exportSettings: DEFAULT_EXPORT,

  selectedPanelId: null,
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
      const rect = placeNewPanel(s.panels, aspect, s.pageWidthMm);
      const panel: Panel = {
        id: `p${Date.now().toString(36)}_${s.panels.length}`,
        name,
        label: "",
        svg: result!.svg,
        baseSvg: result!.svg,
        vb: result!.vb,
        aspect,
        x: rect.x,
        y: rect.y,
        w: rect.w,
        h: rect.h,
        aspectLocked: true,
        mode: result!.mode,
        warnings: result!.warnings,
        elements: result!.elements,
        series: result!.series,
        textToPath: result!.textToPath,
        order: s.panels.length
      };
      const panels = relabel([...s.panels, panel], s.labelStyle);
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

  selectPanel: (id) => set({ selectedPanelId: id, selectedElementId: null }),
  selectElement: (id) => set({ selectedElementId: id }),
  setRightTab: (t) => set({ rightTab: t }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),

  snapshot: () =>
    set((s) => ({ past: [...s.past, captureDoc(s)].slice(-80), future: [] })),

  updatePanelRect: (id, rect) =>
    set((s) => ({
      panels: s.panels.map((p) => (p.id === id ? { ...p, ...rect } : p))
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
          const color = colors[idx] ?? ser.color;
          svg = recolorSeriesSvg(svg, ser, color);
          return { ...ser, color };
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
    set((s) => ({ typography: { ...s.typography, ...patch } }));
  },

  unifyTypography: () => {
    get().snapshot();
    set((s) => ({
      panels: s.panels.map((p) => {
        if (p.mode === "layout-only") return p;
        let svg = unifyTypographySvg(p.svg, s.typography);
        // re-apply emphasis so emphasized widths win over the unified data width
        for (const ser of p.series) {
          if (ser.emphasis !== "normal") svg = applyEmphasis(svg, ser, ser.emphasis, s.typography.dataLineWidthPt);
        }
        return { ...p, svg };
      })
    }));
  },

  tuneElement: (panelId, scid, prop, value) => {
    get().snapshot();
    set((s) => ({
      panels: s.panels.map((p) => (p.id === panelId ? { ...p, svg: setElementStyle(p.svg, scid, prop, value) } : p))
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
    get().snapshot();
    set({ gutterMm: Math.max(0, mm) });
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
