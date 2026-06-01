/**
 * SciCompose core data model.
 *
 * Design principle: the *SVG string* of each panel (`Panel.svg`) is the single
 * source of truth. Every meaningful element carries stable `data-sc*` attributes
 * (id, role, series, emphasis) so that the derived model below can always be
 * re-parsed from the string. This keeps the whole app state serializable and
 * makes undo/redo a simple snapshot of strings + layout.
 */

/** Semantic role of a single SVG element. */
export type ElementRole =
  | "data" // measured data line
  | "fit" // fitted/smooth curve
  | "auxiliary" // reference/guide line
  | "scatter" // scatter markers
  | "errorbar" // error bars / caps
  | "axis" // axis spine / frame
  | "tick" // tick marks
  | "grid" // grid lines
  | "background" // plot-area background
  | "legend" // legend swatch/box
  | "text-tick" // tick labels (numbers)
  | "text-axis" // axis labels
  | "text-title" // title
  | "text-legend" // legend text
  | "decoration" // misc lines/shapes we leave alone
  | "unknown";

/** Visual emphasis level applied via Module F. */
export type Emphasis = "primary" | "secondary" | "auxiliary" | "normal";

/** Human-facing role groups used by the role-correction dropdown (Module D2). */
export const ROLE_LABELS: Record<ElementRole, string> = {
  data: "Measured data",
  fit: "Fitted curve",
  auxiliary: "Auxiliary line",
  scatter: "Scatter",
  errorbar: "Error bar",
  axis: "Axis / frame",
  tick: "Tick",
  grid: "Grid",
  background: "Background",
  legend: "Legend",
  "text-tick": "Tick label",
  "text-axis": "Axis label",
  "text-title": "Title",
  "text-legend": "Legend text",
  decoration: "Decoration",
  unknown: "Unknown"
};

/** Roles that participate in data recoloring / emphasis. */
export const DATA_ROLES: ElementRole[] = ["data", "fit", "auxiliary", "scatter", "errorbar"];

/** Roles that are text. */
export const TEXT_ROLES: ElementRole[] = ["text-tick", "text-axis", "text-title", "text-legend"];

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A single parsed SVG element (the atom of recognition). */
export interface ParsedElement {
  scid: string; // stable id, also written as data-scid on the node
  tag: string; // path | polyline | line | rect | circle | text | g ...
  role: ElementRole;
  idHint: string | null; // concatenated id/class of element + ancestors (recognition hint)
  groupKey: string; // aggregation key (ancestor group id or color) — used to rebuild series
  /** Group/series this element belongs to (data-scseries), if any. */
  seriesId: string | null;
  stroke: string | null; // resolved stroke color (hex/none/null)
  fill: string | null; // resolved fill color
  fillOpacity: number | null;
  opacity: number | null;
  strokeWidth: number | null;
  strokeDasharray: string | null;
  gradientId: string | null; // referenced <linearGradient>/<radialGradient> id (fill)
  bbox: BBox;
  pathLength: number; // rough geometric length (px) for line/path elements
  isGray: boolean; // stroke/fill is achromatic (gray/black/white)
  hasMarker: boolean; // marker-ish (circle/use/small repeated shapes)
  text: string | null; // text content for <text>
  fontSizePx: number | null;
  hidden: boolean; // display:none (user-hidden via Tune)
}

/**
 * A data series = aggregation of one or more elements (Module C3). The series
 * is what the color library, emphasis, and legend operate on.
 */
export interface DataSeries {
  id: string;
  role: ElementRole; // data | fit | auxiliary | scatter
  elementIds: string[]; // scids of member elements
  color: string; // representative color (hex)
  emphasis: Emphasis;
  label: string | null; // matched legend label
  legendElementId: string | null; // legend swatch element paired by color
  hasMarker: boolean;
  isFill: boolean; // filled area/bar vs stroke line
  gradientId: string | null; // if filled by a gradient
  order: number; // display/order index (user can reorder)
}

/** Why a panel might be restricted to layout-only mode (Module: import detection). */
export type PanelMode = "full" | "layout-only";

export interface ImportWarning {
  kind: "text-as-path" | "bitmap" | "color-scale" | "parse";
  message: string;
}

/** A panel = one imported figure placed on the elastic canvas (Module B). */
export interface Panel {
  id: string;
  name: string; // source filename
  label: string; // (a), (b)... auto-assigned
  svg: string; // SOURCE OF TRUTH — full <svg> string with data-sc* attrs
  baseSvg: string; // pristine original (for "reset")
  vb: BBox; // viewBox of the svg (intrinsic units)
  aspect: number; // intrinsic w/h
  // Placement on the figure canvas, in figure-space pixels (top-left origin).
  x: number;
  y: number;
  w: number;
  h: number;
  aspectLocked: boolean;
  mode: PanelMode;
  warnings: ImportWarning[];
  // Derived model (kept in sync with `svg`):
  elements: ParsedElement[];
  series: DataSeries[];
  textToPath: boolean; // text was converted to paths -> fonts not editable
  order: number; // panel order -> drives (a)(b)(c) labels
}

/** Panel-label styling (Module B). */
export interface PanelLabelStyle {
  format: "(a)" | "(A)" | "a" | "A" | "none";
  position: "tl" | "tr" | "bl" | "br";
  fontFamily: string;
  fontSizePt: number;
  bold: boolean;
  color: string;
  whiteBacking: boolean;
}

/** Typography defaults by role, in points (Module G). */
export interface TypographySettings {
  fontFamily: string;
  axisLabelPt: number;
  tickLabelPt: number;
  legendPt: number;
  titlePt: number;
  // Line widths in points
  dataLineWidthPt: number;
  axisLineWidthPt: number;
  tickLineWidthPt: number;
}

/** Journal / page size preset (Module H). */
export interface JournalPreset {
  id: string;
  name: string;
  widthMm: number;
  maxHeightMm: number;
}

export interface ExportSettings {
  widthMm: number;
  heightMm: number;
  dpi: number;
  format: "png" | "svg";
  transparent: boolean;
}

/** A named color palette from the library (Module E). */
export type PaletteCategory =
  | "sequential"
  | "categorical"
  | "muted"
  | "high-contrast"
  | "duo-trio"
  | "gradient";

export interface Palette {
  id: string;
  name: string;
  category: PaletteCategory;
  colors: string[]; // ordered hex list (for stroke/marker/solid fill)
  /** Optional paired gradients for fill/area charts (Module E.6). */
  gradients?: { from: string; to: string }[];
  bestFor?: string;
  colorblindSafe?: boolean;
}
