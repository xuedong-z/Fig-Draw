# SciCompose

A browser-based **post-processing editor for scientific figures**. You bring SVGs
you already exported from Origin, matplotlib, GraphPad, etc.; SciCompose helps you
assemble them into one publication-ready figure — arrange panels, recognize and
recolor data series, set emphasis, unify type and line weights, and export a
submission-grade PNG + a re-editable SVG.

It is **not** a plotting tool and has **no backend, no data import, and no AI** —
all element recognition is done with front-end rules.

## What it does

1. **Import** exported SVG figures as panels.
2. **Arrange** them on a simulated Nature-style paper page (drag / resize / snap).
3. **Recognize** structural elements (axes, ticks, grid, background, data,
   scatter, legend, text) automatically; correct any role by hand.
4. **Recolor** series from a curated palette library (lines, fills, gradients).
5. **Emphasize** the key result (primary / secondary / auxiliary).
6. **Unify** fonts, sizes, and line widths across the whole figure.
7. **Export** PNG at 300 / 600 / 1200 DPI and a re-editable SVG, at journal
   widths (Nature 89 mm / 183 mm and more).

## Run

```powershell
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:3000`.

## Try it

1. Click **Import** and choose an SVG — or load the bundled sample
   `frontend/public/samples/electro.svg`.
2. The panel appears on the paper. Drag/resize it; add more panels and they snap
   to each other and to the page guides.
3. Open the **Palette** tab and apply a colorblind-safe palette
   (e.g. Okabe–Ito) — every data series and its legend swatch recolor together.
4. Use **Emphasis**, **Type**, and **Tune** to refine; correct any mis-recognized
   element from the left panel.
5. Open **Export**, pick a journal width and DPI, and export PNG / SVG.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS · fabric.js ·
Zustand. See [AGENTS.md](AGENTS.md) for the module map and architecture notes.
