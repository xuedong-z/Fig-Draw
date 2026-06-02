# AGENTS.md

This repository is **SciCompose** — a browser-based **post-processing** editor for
scientific figures.

It is **not** a plotting tool, a template database, or a data-analysis app. The
user has *already* drawn their figures in Origin / matplotlib / GraphPad / etc.
and exported **SVG**. SciCompose takes those SVGs and helps them assemble,
recognize, recolor, emphasize, unify, and export a submission-grade composite
figure. There is no data import, no chart generation, and no backend.

> A previous product ("Scientific Figure Studio", a FastAPI + template-database
> plotting app) lived in this repo and was **intentionally removed**. Do not
> reintroduce a backend, a template/semantic-mapping flow, or data upload.

---

## What SciCompose does (scope)

1. **Import** one or more exported SVG figures as *panels*.
2. **Arrange** panels freely on a simulated Nature-style paper inner page
   (drag / resize / snap / smart guides).
3. **Recognize** each panel's structural elements (background, axis/frame,
   ticks, grid, data series, scatter, legend, text) using **pure front-end
   rules** — no AI / LLM. The user can correct any role.
4. **Recolor** data series with a large curated palette library (lines + fills +
   gradients), preserving per-stop lightness and fill-opacity.
5. **Emphasize** series by importance (primary / secondary / auxiliary / normal).
6. **Unify** fonts, sizes, and line widths across the figure.
7. **Export** a submission-grade PNG (300 / 600 / 1200 DPI) and a re-editable
   SVG, at journal widths (e.g. Nature 89 mm / 183 mm).

## Hard constraints (do not violate)

- **No AI/LLM** anywhere in recognition — all classification is rule-based
  (`lib/svg/roles.ts`).
- **No backend.** Everything runs in the browser.
- **No `localStorage`/persistence for core document state.** The figure lives in
  memory (Zustand). Undo/redo is in-memory snapshots.
- The **SVG string is the single source of truth** for a panel. All edits are
  pure `string -> string` transforms that read/write `data-sc*` attributes; the
  React model is updated alongside but never replaces the SVG.

---

## Tech stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript 5.7 · Tailwind 3.4 ·
fabric.js 6.9 (canvas drag/resize/snap) · Zustand 5 (state + history) ·
lucide-react (icons). SVG parsing/serialization via the browser `DOMParser` /
`XMLSerializer`; PNG export via `canvas.toBlob` with DPI scaling.

---

## Module map (spec module -> code)

| Module | What | Where |
| --- | --- | --- |
| A | Nature paper inner page | `frontend/components/NaturePage.tsx` |
| B | Elastic fabric.js canvas (drag/resize/snap/guides) | `frontend/components/FigureCanvas.tsx` |
| C | SVG parsing engine (scid tagging, geometry, series aggregation, warnings) | `frontend/lib/svg/parser.ts` |
| D1 | Rule-based role recognition | `frontend/lib/svg/roles.ts` |
| D2 | Role-correction UI | `frontend/components/LeftSidebar.tsx`, `frontend/components/panels/TunePanel.tsx` |
| E | Palette library + recoloring | `frontend/lib/palettes.ts`, `frontend/components/panels/PalettePanel.tsx`, `frontend/lib/svg/mutate.ts` |
| F | Primary/secondary emphasis | `frontend/components/panels/EmphasisPanel.tsx`, `mutate.ts` |
| G | Font/size/line-width unification | `frontend/components/panels/TypographyPanel.tsx`, `mutate.ts` |
| H | Export PNG/SVG at journal sizes | `frontend/lib/export.ts`, `frontend/components/panels/ExportPanel.tsx`, `frontend/lib/journals.ts` |
| I | Undo/redo | `frontend/lib/store.ts` (`past`/`future` snapshots) |

Shell/layout: `frontend/components/Editor.tsx`, `TopBar.tsx`, `RightSidebar.tsx`,
`Messages.tsx`. Color + style helpers: `frontend/lib/svg/colorUtils.ts`,
`styleAccessor.ts`. Types: `frontend/lib/types.ts`. Sample SVGs:
`frontend/public/samples/`.

### Data flow

`importSvg(name, raw)` → `parseSvgString` (tag every drawable with `data-scid`,
measure geometry offscreen, detect text-as-path / bitmap / color-scale, run
`assignRoles`, `aggregateSeries`, `pairLegends`) → store panel whose `svg` string
carries `data-scid` / `data-scrole` / `data-scseries`. Recolor/emphasis/typography
edits go through `lib/svg/mutate.ts` and update both the SVG string and the
series model. `FIG_PX_PER_MM = 4`, so figure-space px map 1:1 to CSS px.

---

## Run / verify

```powershell
cd frontend
npm install
npm run dev      # http://127.0.0.1:3000
```

A portable Node + Next launch config also exists at `.claude/launch.json`
(serverId `scicompose`, port 3000).

Type-check (portable Node):

```bash
cd frontend
export PATH="/d/Fig draw/.tools/node-v22.13.1-win-x64:$PATH"
node ./node_modules/typescript/bin/tsc --noEmit
```

---

## Gotchas (learned the hard way)

- **fabric.js + React DOM ownership.** `new Canvas(reactCanvasEl)` wraps the
  React-managed `<canvas>` in a `.canvas-container`, which makes React's later
  reconciliation throw `NotFoundError`. The canvas is therefore created
  **imperatively** inside an isolated host div React never renders into, and the
  SVG overlays live in a **separate** React subtree. Keep it that way.
- **Color classification.** Achromatic (black/white/gray) ⇒ structure; saturated
  ⇒ data. Filled **markers/scatter are identified by their fill**, lines by their
  **stroke** (`seriesColorOf` in `parser.ts`). This breaks on **real Origin
  exports** (see below), which is why they get a dedicated path.
- **Origin (OriginLab) exports** are handled specially in `parser.ts`
  (`isOriginSvg` / `normalizeOriginSvg` / `originRoleFromHint`). Real Origin SVGs:
  wrap all geometry in a **nested `<svg>`** with a huge viewBox (flattened on
  import — width/height pinned to the viewBox so `getBBox·getCTM` measures 1:1);
  **color axes/ticks/labels** to match their data (the blue Y-axis was read as a
  data series) and use **gray `#808080` as a real data color** (its whole series
  was dropped to `decoration`) — both fixed by classifying from the
  `class`/`olab:scope` taxonomy (`…Axis…Line`→axis, `Tick`→tick,
  `TickLabel`→tick-label, `Title`→axis title, `Plot`→data/scatter) instead of
  color; draw markers as **`<polygon>`/`<rect>`**; clip data with a **mask**
  (stripped on import or the bake hides everything); and position rotated titles
  with `transform="matrix(...)"` + `<tspan x>` (converted to `x/y`+`rotate()`).
  The hand-written `samples/origin_xrd.svg` is **not** representative — it lacks
  the `olab` namespace, so it (correctly) uses the generic path.
- **Recognition ordering.** matplotlib nests ticks under a group named
  `matplotlib.axis_N`; tick detection therefore runs **before** the axis hint,
  and the axis hint deliberately excludes the bare word `axis`. The plot frame is
  detected as a thin, unfilled, box-shaped path spanning the plot.
- **Legend swatches** get role `legend` (not `data`) so they don't inflate the
  series count, but `recolorSeries`/emphasis also recolor `series.legendElementId`
  to keep the legend in sync.
- The platform shell is **PowerShell**; the Bash tool uses Git Bash, so use POSIX
  paths (`/d/Fig draw/...`).

## Conventions

- Only commit when the user explicitly asks.
- Do not kill the user's other dev servers (unrelated Vite apps on 5173/5174).
