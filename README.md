# SciCompose

### ▶ Use it now — no install: **https://fig-draw.pages.dev**

A browser-based **post-processing editor for scientific figures**. Bring the SVGs you
already exported from Origin, matplotlib, GraphPad Prism, etc. (and raster images like
micrographs); SciCompose assembles them into one publication-ready figure — arrange
panels, resize like *figsize*, recolor data series from a 120-palette library, refine
single elements, unify type and line weights, and export a submission-grade PNG plus a
re-editable SVG.

It runs **entirely in your browser** — no backend, no accounts, no AI, nothing leaves
your machine. It is **not** a plotting tool; it post-processes figures you already made.

## Highlights

- **Two kinds of panels**
  - **SVG figures** — fully recognized & editable (axes, ticks, data, scatter, legend, text).
  - **Raster images** (PNG/JPG/WebP) — placed as image panels; scale (aspect-locked) and
    crop (aspect-ratio cover). Mix micrographs + data plots in one figure.
- **Model-based resize (figsize)** — drag a panel and the **axes lengthen/shorten** while
  **font size, line width, marker size, tick length, and label-to-axis distance stay
  constant**, exactly like changing `figsize` in matplotlib/Origin. Repeated resizes are
  drift-free and reversible.
- **120-palette color library**, grouped & collapsible: Journal (ggsci — Nature/Science/
  Lancet/NEJM/JAMA/JCO), Editor themes (Nord, Solarized, Catppuccin ×4, Tokyo Night,
  Gruvbox, Dracula, Rosé Pine ×3, One Dark/Light, Palenight, Everforest), Diverging
  (ColorBrewer), perceptually-uniform Sequential (viridis/plasma/inferno/magma/cividis),
  34 low-saturation Muted/Morandi sets, and colorblind-safe High-contrast (Okabe–Ito,
  Wong, Paul Tol, seaborn, ColorBrewer). Bar charts color **per bar**; legends recolor
  with their data.
- **Per-element editor (Tune)** — pick any element (or use the dropdown), then edit text
  content / font / size, fill, **one-click gradient fills derived from the active palette**,
  stroke type & width, and **scatter marker shape & size for the whole series**. Every
  color input offers swatches from the current palette, so manual tweaks stay on-palette.
- **Layout** — grid presets (2×2 / 3×2 / 3×3 / 4×2) with lock/free + adjustable gap;
  align & distribute; match-size; per-panel size / aspect / crop; **Trim** crops edge
  whitespace on every panel at once (and reserves room for the (a)(b)(c) labels).
- **Axes & labels** — full / half / no frame; tick direction (inward/outward, global or
  per-panel); tick-mark visibility; axis-title gap; auto **(a)(b)(c)** labels fixed
  top-left with an adjustable gap.
- **Typography** — unify font family, point sizes, and line widths across the whole figure
  (values in **pt**, consistent on screen and in the export).
- **Export** — PNG at 300 / 600 / 1200 DPI and a re-editable SVG, at journal widths
  (Nature 89 / 183 mm, Science, and custom).
- Undo / redo throughout · clean light UI · realistic journal-page preview.

## How to use

1. Open **https://fig-draw.pages.dev**.
2. **Import** your exported sub-figures (SVG) and any images (PNG/JPG) — or click
   **Examples** to load a bundled sample (line / scatter / stacked-area / mixed / XRD /
   bars / electrocatalysis).
3. **Arrange** — apply a grid preset or free-place; align/distribute; resize (figsize for
   SVG, aspect-crop for images).
4. **Color** — apply a palette; legends and every series recolor together.
5. **Refine** — Tune single elements, set Axis frame / ticks, unify Type, place labels.
6. **Trim** — one click to crop whitespace across all panels.
7. **Export** — pick a journal width + DPI, export PNG and a re-editable SVG.

## Run locally (for development)

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS · fabric.js · Zustand.
Fully client-side. See [AGENTS.md](AGENTS.md) for the module map and architecture notes.

## Contributing

Issues and pull requests are welcome. The codebase is a single-page client app under
`frontend/`; `AGENTS.md` documents the modules (parser / recognition, figsize engine,
palette library, panel store, UI panels).
