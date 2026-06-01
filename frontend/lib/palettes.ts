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
  // — Morandi extended (soft greyed hues) —
  { id: "morandi_warm", name: "Morandi warm", category: "muted", colors: ["#b5a89a", "#c0a896", "#a89384", "#b8a48f", "#9c8b7c", "#cbb6a4"] },
  { id: "morandi_cool", name: "Morandi cool", category: "muted", colors: ["#8e9ca6", "#9aa7ac", "#a6aeb2", "#87969e", "#99a4aa", "#7c8a92"] },
  { id: "morandi_green", name: "Morandi green", category: "muted", colors: ["#9aa890", "#899a80", "#a7b09a", "#7e8e76", "#94a086", "#b0b8a4"] },
  { id: "morandi_rose", name: "Morandi rose", category: "muted", colors: ["#c2aaa6", "#b69692", "#cdb4b0", "#a98a86", "#c0a09c", "#d4c0bc"] },
  { id: "morandi_blue", name: "Morandi blue", category: "muted", colors: ["#8c9cae", "#9aa6b4", "#7e8ea2", "#a4b0bc", "#889ab0", "#b2bcc8"] },
  { id: "morandi_lilac", name: "Morandi lilac", category: "muted", colors: ["#a99cb0", "#b4a6bd", "#9a8ea6", "#bdb2c6", "#8e84a0", "#c8c0d0"] },
  // — Dusty (low-chroma, a touch lighter) —
  { id: "dusty_rose", name: "Dusty rose", category: "muted", colors: ["#c9aaa6", "#d6bcb6", "#b89690", "#c2a39c", "#ad8a85", "#dcc8c2"] },
  { id: "dusty_blue", name: "Dusty blue", category: "muted", colors: ["#94a6b8", "#a6b6c4", "#8294a8", "#b4c0cc", "#889cae", "#c2ccd6"] },
  { id: "dusty_teal", name: "Dusty teal", category: "muted", colors: ["#8aa6a4", "#9ab4b0", "#7c9896", "#a8c0bc", "#88a8a4", "#b6c8c4"] },
  { id: "dusty_mauve", name: "Dusty mauve", category: "muted", colors: ["#b0a0aa", "#beb0b8", "#9e8e98", "#c8bcc4", "#908290", "#d2c8ce"] },
  // — Muted earth & botanical —
  { id: "muted_terra", name: "Muted terra", category: "muted", colors: ["#a8896c", "#b89a7e", "#98775c", "#c2a88e", "#8a6e54", "#cab8a0"] },
  { id: "muted_sand", name: "Muted sand", category: "muted", colors: ["#c4b39a", "#d0c2ac", "#b3a288", "#beb094", "#a89578", "#dcd0bc"] },
  { id: "muted_forest", name: "Muted forest", category: "muted", colors: ["#6f8268", "#7e9078", "#88987e", "#94a088", "#607058", "#a4b09a"] },
  { id: "muted_olive", name: "Muted olive", category: "muted", colors: ["#9a9a78", "#a8a888", "#8a8a68", "#b4b498", "#7c7c5c", "#c0c0a8"] },
  // — Nordic / slate —
  { id: "nordic", name: "Nordic", category: "muted", colors: ["#7a8b99", "#92a2ae", "#8c9aa6", "#a8b4be", "#6e7e8c", "#b8c2ca"] },
  { id: "fjord", name: "Fjord", category: "muted", colors: ["#607888", "#7d93a6", "#6e8696", "#8ca0b0", "#54707e", "#9eb0be"] },
  { id: "slate_soft", name: "Soft slate", category: "muted", colors: ["#6e7c86", "#828e98", "#94a0a8", "#5e6c76", "#a4aeb6", "#8a96a0"] },
  // — Smoky / heather neutrals —
  { id: "heather", name: "Heather", category: "muted", colors: ["#a597a8", "#b3a4b6", "#97889a", "#c0b2c2", "#8e7f92", "#ccc0ce"] },
  { id: "smoky_teal", name: "Smoky teal", category: "muted", colors: ["#6f8a88", "#7e9a98", "#88a4a2", "#5f7a78", "#94aeac", "#a4bab8"] },
  { id: "smoky_plum", name: "Smoky plum", category: "muted", colors: ["#9a8a96", "#a896a4", "#8a7c88", "#b4a4b0", "#7e7080", "#c0b2bc"] },
  { id: "muted_stone", name: "Stone", category: "muted", colors: ["#a8a39a", "#b6b2aa", "#98948c", "#c2bfb8", "#88857e", "#cecbc4"] },
  { id: "muted_powder", name: "Powder", category: "muted", colors: ["#aab8c0", "#bcc6cc", "#98a8b2", "#ccd4d8", "#8898a4", "#dae0e4"] },

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
  },

  // ── 7. Journal palettes (ggsci — colors lifted from top scientific journals) ──
  { id: "npg", name: "Nature (NPG)", category: "journal", colors: ["#E64B35", "#4DBBD5", "#00A087", "#3C5488", "#F39B7F", "#8491B4", "#91D1C2", "#DC0000", "#7E6148"], bestFor: "Nature-style figures" },
  { id: "aaas", name: "Science (AAAS)", category: "journal", colors: ["#3B4992", "#EE0000", "#008B45", "#631879", "#008280", "#BB0021", "#5F559B", "#A20056", "#808180"] },
  { id: "lancet", name: "Lancet", category: "journal", colors: ["#00468B", "#ED0000", "#42B540", "#0099B4", "#925E9F", "#FDAF91", "#AD002A", "#ADB6B6"] },
  { id: "nejm", name: "NEJM", category: "journal", colors: ["#BC3C29", "#0072B5", "#E18727", "#20854E", "#7876B1", "#6F99AD", "#FFDC91", "#EE4C97"] },
  { id: "jama", name: "JAMA", category: "journal", colors: ["#374E55", "#DF8F44", "#00A1D5", "#B24745", "#79AF97", "#6A6599", "#80796B"] },
  { id: "jco", name: "JCO", category: "journal", colors: ["#0073C2", "#EFC000", "#868686", "#CD534C", "#7AA6DC", "#003C67", "#8F7700", "#3B3B3B"] },

  // ── 8. Categorical — classic data-viz defaults ──
  { id: "cat_tableau10", name: "Tableau 10", category: "categorical", colors: ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f", "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac"] },
  { id: "cat_d3_10", name: "D3 category10", category: "categorical", colors: ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"] },
  { id: "cat_set2", name: "Set2 (Brewer)", category: "categorical", colorblindSafe: true, colors: ["#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3", "#a6d854", "#ffd92f", "#e5c494", "#b3b3b3"] },
  { id: "cat_set1", name: "Set1 (Brewer)", category: "categorical", colors: ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00", "#ffff33", "#a65628", "#f781bf"] },

  // ── 9. High-contrast / colorblind-safe — Paul Tol schemes ──
  { id: "tol_bright", name: "Tol bright", category: "high-contrast", colorblindSafe: true, colors: ["#4477AA", "#EE6677", "#228833", "#CCBB44", "#66CCEE", "#AA3377", "#BBBBBB"], bestFor: "colorblind-safe" },
  { id: "tol_vibrant", name: "Tol vibrant", category: "high-contrast", colorblindSafe: true, colors: ["#EE7733", "#0077BB", "#33BBEE", "#EE3377", "#CC3311", "#009988", "#BBBBBB"] },
  { id: "tol_muted", name: "Tol muted", category: "high-contrast", colorblindSafe: true, colors: ["#CC6677", "#332288", "#DDCC77", "#117733", "#88CCEE", "#882255", "#44AA99", "#999933", "#AA4499"] },

  // ── 10. Sequential — perceptually-uniform (matplotlib, colorblind-safe) ──
  { id: "seq_viridis", name: "Viridis", category: "sequential", colorblindSafe: true, colors: ["#440154", "#414487", "#2A788E", "#22A884", "#7AD151", "#FDE725"], bestFor: "ordered, colorblind-safe" },
  { id: "seq_plasma", name: "Plasma", category: "sequential", colorblindSafe: true, colors: ["#0D0887", "#6A00A8", "#B12A90", "#E16462", "#FCA636", "#F0F921"] },
  { id: "seq_inferno", name: "Inferno", category: "sequential", colorblindSafe: true, colors: ["#000004", "#420A68", "#932667", "#DD513A", "#FCA50A", "#FCFFA4"] },
  { id: "seq_magma", name: "Magma", category: "sequential", colorblindSafe: true, colors: ["#000004", "#3B0F70", "#8C2981", "#DE4968", "#FE9F6D", "#FCFDBF"] },
  { id: "seq_cividis", name: "Cividis", category: "sequential", colorblindSafe: true, colors: ["#00204D", "#31446B", "#666970", "#958F78", "#CABA6A", "#FFEA46"] },

  // ── 11. Diverging — two-direction data (correlation, log-fold, anomaly) ──
  { id: "div_rdbu", name: "Red–Blue", category: "diverging", colorblindSafe: true, colors: ["#b2182b", "#ef8a62", "#fddbc7", "#f7f7f7", "#d1e5f0", "#67a9cf", "#2166ac"], bestFor: "centered values" },
  { id: "div_rdylbu", name: "Red–Yellow–Blue", category: "diverging", colors: ["#d73027", "#fc8d59", "#fee090", "#ffffbf", "#e0f3f8", "#91bfdb", "#4575b4"] },
  { id: "div_brbg", name: "Brown–Teal", category: "diverging", colorblindSafe: true, colors: ["#8c510a", "#d8b365", "#f6e8c3", "#f5f5f5", "#c7eae5", "#5ab4ac", "#01665e"] },
  { id: "div_puor", name: "Purple–Orange", category: "diverging", colorblindSafe: true, colors: ["#b35806", "#f1a340", "#fee0b6", "#f7f7f7", "#d8daeb", "#998ec3", "#542788"] },
  { id: "div_spectral", name: "Spectral", category: "diverging", colors: ["#d53e4f", "#fc8d59", "#fee08b", "#ffffbf", "#e6f598", "#99d594", "#3288bd"] },
  { id: "div_piyg", name: "Pink–Green", category: "diverging", colors: ["#c51b7d", "#e9a3c9", "#fde0ef", "#f7f7f7", "#e6f5d0", "#a1d76a", "#4d9221"] },

  // ── 12. Editor / UI themes (accent colors from popular coding themes) ──
  { id: "nord", name: "Nord", category: "theme", colors: ["#5e81ac", "#88c0d0", "#a3be8c", "#ebcb8b", "#d08770", "#bf616a", "#b48ead", "#8fbcbb"], bestFor: "cool Nordic minimal" },
  { id: "solarized", name: "Solarized", category: "theme", colors: ["#268bd2", "#2aa198", "#859900", "#b58900", "#cb4b16", "#dc322f", "#d33682", "#6c71c4"], bestFor: "low-contrast, easy on eyes" },
  { id: "catppuccin_latte", name: "Catppuccin Latte", category: "theme", colors: ["#1e66f5", "#179299", "#40a02b", "#df8e1d", "#fe640b", "#d20f39", "#8839ef", "#ea76cb"] },
  { id: "catppuccin_frappe", name: "Catppuccin Frappé", category: "theme", colors: ["#8caaee", "#81c8be", "#a6d189", "#e5c890", "#ef9f76", "#e78284", "#ca9ee6", "#f4b8e4"] },
  { id: "catppuccin_macchiato", name: "Catppuccin Macchiato", category: "theme", colors: ["#8aadf4", "#8bd5ca", "#a6da95", "#eed49f", "#f5a97f", "#ed8796", "#c6a0f6", "#f5bde6"] },
  { id: "catppuccin_mocha", name: "Catppuccin Mocha", category: "theme", colors: ["#89b4fa", "#94e2d5", "#a6e3a1", "#f9e2af", "#fab387", "#f38ba8", "#cba6f7", "#f5c2e7"] },
  { id: "tokyo_night", name: "Tokyo Night", category: "theme", colors: ["#7aa2f7", "#7dcfff", "#9ece6a", "#e0af68", "#ff9e64", "#f7768e", "#bb9af7", "#2ac3de"] },
  { id: "gruvbox", name: "Gruvbox", category: "theme", colors: ["#83a598", "#8ec07c", "#b8bb26", "#fabd2f", "#fe8019", "#fb4934", "#d3869b", "#d65d0e"] },
  { id: "dracula", name: "Dracula", category: "theme", colors: ["#bd93f9", "#ff79c6", "#8be9fd", "#50fa7b", "#ffb86c", "#ff5555", "#f1fa8c", "#6272a4"] },
  { id: "rose_pine", name: "Rosé Pine", category: "theme", colors: ["#31748f", "#9ccfd8", "#ebbcba", "#f6c177", "#eb6f92", "#c4a7e7"] },
  { id: "rose_pine_moon", name: "Rosé Pine Moon", category: "theme", colors: ["#3e8fb0", "#9ccfd8", "#ea9a97", "#f6c177", "#eb6f92", "#c4a7e7"] },
  { id: "rose_pine_dawn", name: "Rosé Pine Dawn", category: "theme", colors: ["#286983", "#56949f", "#d7827e", "#ea9d34", "#b4637a", "#907aa9"] },
  { id: "one_dark", name: "One Dark", category: "theme", colors: ["#61afef", "#98c379", "#e5c07b", "#d19a66", "#e06c75", "#c678dd", "#56b6c2"] },
  { id: "one_light", name: "One Light", category: "theme", colors: ["#4078f2", "#50a14f", "#c18401", "#986801", "#e45649", "#a626a4", "#0184bc"] },
  { id: "palenight", name: "Material Palenight", category: "theme", colors: ["#82aaff", "#89ddff", "#c3e88d", "#ffcb6b", "#f78c6c", "#f07178", "#c792ea"] },
  { id: "everforest", name: "Everforest", category: "theme", colors: ["#7fbbb3", "#a7c080", "#83c092", "#dbbc7f", "#e69875", "#e67e80", "#d699b6"], bestFor: "soft forest, easy on eyes" },

  // ── 13. More low-saturation custom sets ──
  { id: "warm_neutral", name: "Warm neutral", category: "muted", colors: ["#b3a392", "#c4b5a3", "#9c8b78", "#d0c4b4", "#8a7866", "#6f5d4c"] },
  { id: "cool_slate", name: "Cool slate", category: "muted", colors: ["#5e7081", "#738699", "#8a9caf", "#6b7e90", "#4e5f6e", "#a0b0bf"] },
  { id: "terracotta", name: "Terracotta", category: "muted", colors: ["#c07050", "#b08a7c", "#9c5640", "#cd9a88", "#8a6456", "#d8a896"] },
  { id: "monochrome", name: "Monochrome", category: "muted", colors: ["#3a3a3a", "#6b6b6b", "#9a9a9a", "#c4c4c4", "#525252", "#828282"] },
  { id: "cream_apricot", name: "Cream & apricot", category: "muted", colors: ["#e6c098", "#f0d4b4", "#d6a474", "#ecc4a0", "#c89066", "#f5e0c8"] },
  { id: "graphite", name: "Graphite", category: "muted", colors: ["#3a3a3c", "#555557", "#707074", "#8b8b8f", "#a6a6aa", "#c2c2c6"], bestFor: "Apple Pro grey" },

  // ── 14. Deep teal sequence + indigo duo ──
  { id: "seq_deep_teal", name: "Deep teal", category: "sequential", colors: ["#163e47", "#1f5862", "#2a727e", "#3a8d99", "#59a7b2", "#7fc0c9"] },
  { id: "duo_indigo_cream", name: "Indigo + Cream", category: "duo-trio", colors: ["#2c3a6e", "#e8dcc0"] },

  // ── 15. More standard scientific sets ──
  { id: "wong", name: "Wong (Nat. Methods)", category: "high-contrast", colorblindSafe: true, colors: ["#000000", "#E69F00", "#56B4E9", "#009E73", "#F0E442", "#0072B2", "#D55E00", "#CC79A7"], bestFor: "colorblind-safe (≈ Okabe–Ito)" },
  { id: "tol_highcontrast", name: "Tol high-contrast", category: "high-contrast", colorblindSafe: true, colors: ["#004488", "#DDAA33", "#BB5566", "#000000"] },
  { id: "seaborn_colorblind", name: "seaborn colorblind", category: "high-contrast", colorblindSafe: true, colors: ["#0173B2", "#DE8F05", "#029E73", "#D55E00", "#CC78BC", "#CA9161", "#FBAFE4", "#949494", "#ECE133", "#56B4E9"] },
  { id: "seaborn_deep", name: "seaborn deep", category: "categorical", colors: ["#4C72B0", "#DD8452", "#55A868", "#C44E52", "#8172B3", "#937860", "#DA8BC3", "#8C8C8C", "#CCB974", "#64B5CD"] },
  { id: "seaborn_muted", name: "seaborn muted", category: "categorical", colors: ["#4878D0", "#EE854A", "#6ACC64", "#D65F5F", "#956CB4", "#8C613C", "#DC7EC0", "#797979", "#D5BB67", "#82C6E2"] },
  { id: "cat_tableau_medium", name: "Tableau Medium", category: "categorical", colors: ["#729ECE", "#FF9E4A", "#67BF5C", "#ED665D", "#AD8BC9", "#A8786E", "#ED97CA", "#A2A2A2", "#CDCC5D", "#6DCCDA"] },
  { id: "cat_tab20", name: "matplotlib tab20", category: "categorical", colors: ["#1f77b4", "#aec7e8", "#ff7f0e", "#ffbb78", "#2ca02c", "#98df8a", "#d62728", "#ff9896", "#9467bd", "#c5b0d5", "#8c564b", "#c49c94", "#e377c2", "#f7b6d2", "#7f7f7f", "#c7c7c7", "#bcbd22", "#dbdb8d", "#17becf", "#9edae5"] }
];

export const CATEGORY_LABELS: Record<PaletteCategory, string> = {
  journal: "Journal",
  categorical: "Categorical",
  theme: "Editor themes",
  "high-contrast": "High-contrast",
  muted: "Muted / Morandi",
  sequential: "Sequential / mono",
  diverging: "Diverging",
  "duo-trio": "Duo / Trio",
  gradient: "Gradient / fill"
};

export const CATEGORY_ORDER: PaletteCategory[] = [
  "journal",
  "categorical",
  "theme",
  "high-contrast",
  "muted",
  "sequential",
  "diverging",
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

