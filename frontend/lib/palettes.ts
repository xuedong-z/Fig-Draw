/**
 * Module E — the color library.
 *
 * Dozens of curated palettes, grouped by purpose. Bias: lower saturation,
 * coordinated, print-friendly — the "publication" look. Each palette is an
 * ordered color list mapped onto data series in order; gradient palettes also
 * carry paired light->dark stops for area/bar fills (Module E.6).
 */
import type { Palette, PaletteCategory } from "./types";

export const PALETTES: Palette[] = [
  // ── 1. Sequential / monochrome (ordered data: concentration, time, depth) ──
  { id: "seq_blue", name: "Blues", category: "sequential", colors: ["#dbe9f6", "#9ecae1", "#6baed6", "#3182bd", "#08519c"], bestFor: "ordered values" },
  { id: "seq_red", name: "Reds", category: "sequential", colors: ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"] },
  { id: "seq_green", name: "Greens", category: "sequential", colors: ["#edf8e9", "#bae4b3", "#74c476", "#31a354", "#006d2c"] },
  { id: "seq_purple", name: "Purples", category: "sequential", colors: ["#f2f0f7", "#cbc9e2", "#9e9ac8", "#756bb1", "#54278f"] },
  { id: "seq_orange", name: "Oranges", category: "sequential", colors: ["#feedde", "#fdbe85", "#fd8d3c", "#e6550d", "#a63603"] },
  { id: "seq_teal", name: "Teals", category: "sequential", colors: ["#d7f0ee", "#9fd9d4", "#5fbcb6", "#2f9c95", "#136f6a"] },
  { id: "seq_indigo", name: "Indigo", category: "sequential", colors: ["#e3e2f3", "#b8b5e0", "#8b86c9", "#5d56ab", "#352f7e"] },
  { id: "seq_gray", name: "Greys", category: "sequential", colors: ["#f0f0f0", "#d0d0d0", "#a8a8a8", "#787878", "#3f3f3f"] },
  { id: "seq_warm_gray", name: "Warm grey", category: "sequential", colors: ["#efece8", "#d6cfc6", "#b3a89a", "#8a7d6c", "#5a4f41"] },
  { id: "seq_amber", name: "Amber", category: "sequential", colors: ["#fdf2d0", "#f7d488", "#eeb33f", "#cf8a1e", "#9a5e12"] },
  { id: "seq_rose", name: "Rose", category: "sequential", colors: ["#f7e1e6", "#e8a9bb", "#d6708d", "#b94666", "#872544"] },
  { id: "seq_olive", name: "Olive", category: "sequential", colors: ["#eef0dc", "#cdd49a", "#a3b15e", "#788a37", "#4c5a1f"] },

  // ── 2. Categorical / multi-hue (distinct parallel categories) ──
  { id: "cat_nature_muted", name: "Nature muted", category: "categorical", colors: ["#4c6e91", "#c06b5a", "#6a9a6a", "#b39a4f", "#8a6ba0", "#4f9a9a", "#9a7b5a"], bestFor: "multiple samples" },
  { id: "cat_classic_soft", name: "Classic soft", category: "categorical", colors: ["#4878a8", "#ee854a", "#6acc64", "#d65f5f", "#956cb4", "#8c613c", "#dc7ec0"] },
  { id: "cat_cool", name: "Cool set", category: "categorical", colors: ["#2f6fae", "#2f9c95", "#5d56ab", "#3a8f5a", "#4a7fb0", "#7a6fc0"] },
  { id: "cat_warm", name: "Warm set", category: "categorical", colors: ["#c0492f", "#e08a2e", "#b9663f", "#cf8a1e", "#a8504f", "#d2a04a"] },
  { id: "cat_earth", name: "Earth", category: "categorical", colors: ["#6b8e4e", "#a86b3c", "#4f6d70", "#9a7b3f", "#7a5c4a", "#5c7a5c"] },
  { id: "cat_jewel", name: "Jewel muted", category: "categorical", colors: ["#2a5d8f", "#9a3c5a", "#3f7a5c", "#8a6a2f", "#5a4a8a", "#2f7a7a"] },
  { id: "cat_pastel", name: "Pastel", category: "categorical", colors: ["#9cb8d6", "#f2b6a0", "#a8d3a0", "#e8c0d0", "#c8b0e0", "#b0d8d8"] },
  { id: "cat_six_pro", name: "Six (pro)", category: "categorical", colors: ["#3b6ea5", "#c45a49", "#5a9367", "#d39a3c", "#7d5ba6", "#48969b"] },

  // ── 3. Muted / Morandi (low saturation, refined) ──
  { id: "morandi_classic", name: "Morandi", category: "muted", colors: ["#a89a8e", "#8f9e9b", "#c0a9a0", "#9a9a86", "#b0a4ae", "#8a9aa8"] },
  { id: "morandi_dusty", name: "Dusty", category: "muted", colors: ["#88a0a8", "#c4a69a", "#a0a888", "#b09aa8", "#9a8c7c", "#7c9a96"] },
  { id: "morandi_slate", name: "Slate", category: "muted", colors: ["#5f7480", "#8a9098", "#a7a39a", "#736b6e", "#9aa7a0", "#6e7c88"] },
  { id: "morandi_clay", name: "Clay", category: "muted", colors: ["#b08a78", "#9a8a6a", "#8a7e7c", "#a89a86", "#7c6f64", "#c0a896"] },
  { id: "muted_blue_gray", name: "Blue-grey", category: "muted", colors: ["#4a6276", "#7d93a6", "#a7b6c2", "#5e7588", "#90a2b2", "#c3ced8"] },
  { id: "muted_sage", name: "Sage", category: "muted", colors: ["#7d9a7e", "#a7b89a", "#9aab8c", "#88a092", "#b3bfa6", "#6f8a72"] },

  // ── 4. High-contrast / colorblind-safe (avoid red/green confusion) ──
  { id: "okabe_ito", name: "Okabe–Ito", category: "high-contrast", colorblindSafe: true, colors: ["#0072B2", "#E69F00", "#009E73", "#CC79A7", "#56B4E9", "#D55E00", "#F0E442", "#000000"], bestFor: "colorblind-safe" },
  { id: "ibm_cb", name: "IBM safe", category: "high-contrast", colorblindSafe: true, colors: ["#648FFF", "#785EF0", "#DC267F", "#FE6100", "#FFB000"] },
  { id: "cb_dark2", name: "Dark (safe)", category: "high-contrast", colorblindSafe: true, colors: ["#1b9e77", "#d95f02", "#7570b3", "#e7298a", "#66a61e", "#e6ab02"] },
  { id: "cb_blue_orange", name: "Blue/Orange", category: "high-contrast", colorblindSafe: true, colors: ["#1f6fb2", "#e8820c", "#7aa9d0", "#f0b066", "#0d3f66", "#a85a00"] },

  // ── 5. Duo / trio (top-journal minimal palettes) ──
  { id: "duo_navy_gold", name: "Navy + Gold", category: "duo-trio", colors: ["#1f3a5f", "#c8a45c"] },
  { id: "duo_teal_coral", name: "Teal + Coral", category: "duo-trio", colors: ["#2a7f7f", "#e07a5f"] },
  { id: "duo_blue_red", name: "Blue + Red", category: "duo-trio", colors: ["#3457a6", "#c0392b"] },
  { id: "duo_indigo_amber", name: "Indigo + Amber", category: "duo-trio", colors: ["#3d3b8e", "#d99a2b"] },
  { id: "trio_nature", name: "Trio nature", category: "duo-trio", colors: ["#3b6ea5", "#c45a49", "#5a9367"] },
  { id: "trio_slate", name: "Trio slate", category: "duo-trio", colors: ["#33485e", "#7a8b99", "#c2cdd6"] },
  { id: "emph_red_gray", name: "Spotlight red", category: "duo-trio", colors: ["#d1495b", "#a8aeb5", "#c9ced4", "#dde1e5"], bestFor: "primary vs background" },
  { id: "emph_blue_gray", name: "Spotlight blue", category: "duo-trio", colors: ["#2c6fbb", "#a8aeb5", "#c9ced4", "#dde1e5"], bestFor: "primary vs background" },

  // ── 6. Gradient / fill (area, bar, stacked) ──
  {
    id: "grad_blue",
    name: "Blue fill",
    category: "gradient",
    colors: ["#2f6fae", "#5d56ab", "#2f9c95"],
    gradients: [
      { from: "#cfe3f7", to: "#2f6fae" },
      { from: "#dad7f3", to: "#5d56ab" },
      { from: "#cdeeea", to: "#2f9c95" }
    ]
  },
  {
    id: "grad_warm",
    name: "Warm fill",
    category: "gradient",
    colors: ["#d2691e", "#c0392b", "#cf8a1e"],
    gradients: [
      { from: "#f7dcc4", to: "#d2691e" },
      { from: "#f4c9c4", to: "#c0392b" },
      { from: "#f6e3bf", to: "#cf8a1e" }
    ]
  },
  {
    id: "grad_sunset",
    name: "Sunset",
    category: "gradient",
    colors: ["#e07a5f", "#9a4c6b", "#d99a2b"],
    gradients: [
      { from: "#f6d3c7", to: "#e07a5f" },
      { from: "#e6c0cd", to: "#9a4c6b" },
      { from: "#f5e2bd", to: "#d99a2b" }
    ]
  },
  {
    id: "grad_ocean",
    name: "Ocean",
    category: "gradient",
    colors: ["#2c7fb8", "#41b6a6", "#253494"],
    gradients: [
      { from: "#cfe6f2", to: "#2c7fb8" },
      { from: "#cfeee8", to: "#41b6a6" },
      { from: "#d2d4ee", to: "#253494" }
    ]
  },
  {
    id: "grad_forest",
    name: "Forest",
    category: "gradient",
    colors: ["#31a354", "#788a37", "#136f6a"],
    gradients: [
      { from: "#d4eedb", to: "#31a354" },
      { from: "#e3e8c6", to: "#788a37" },
      { from: "#cce8e5", to: "#136f6a" }
    ]
  }
];

export const CATEGORY_LABELS: Record<PaletteCategory, string> = {
  sequential: "Sequential / mono",
  categorical: "Categorical",
  muted: "Muted / Morandi",
  "high-contrast": "High-contrast",
  "duo-trio": "Duo / Trio",
  gradient: "Gradient / fill"
};

export const CATEGORY_ORDER: PaletteCategory[] = [
  "categorical",
  "muted",
  "sequential",
  "high-contrast",
  "duo-trio",
  "gradient"
];

export function findPalette(id: string): Palette | undefined {
  return PALETTES.find((p) => p.id === id);
}

export function palettesByCategory(): Record<PaletteCategory, Palette[]> {
  const out = {} as Record<PaletteCategory, Palette[]>;
  for (const c of CATEGORY_ORDER) out[c] = [];
  for (const p of PALETTES) (out[p.category] ??= []).push(p);
  return out;
}

/** Map a palette onto N series; cycles colors and interpolates if needed. */
export function colorsForCount(palette: Palette, n: number): string[] {
  const base = palette.colors;
  if (n <= base.length) return base.slice(0, n);
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(base[i % base.length]);
  return out;
}
