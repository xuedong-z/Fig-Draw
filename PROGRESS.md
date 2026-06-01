# Progress & next steps

A snapshot for picking this project up on another device (e.g. continuing on a
phone via claude.ai/code). The architecture and module map live in
[AGENTS.md](AGENTS.md); product overview in [README.md](README.md).

## Run
```
cd frontend && npm install && npm run dev   # http://127.0.0.1:3000
```
Load a figure from the top-bar **Examples** menu (or the empty-state buttons), or
**Import SVG**.

## Done so far (committed)
- **Direct manipulation**: click an SVG element on the canvas to select + edit it;
  blue selection highlight; hide/delete elements; the old left "element list" was
  removed (role is auto in the background).
- **Tune panel adapts per element type**: fill shapes (bars/areas/scatter) lead
  with Fill; lines show stroke/width/dash; text shows font size. No Role dropdown.
- **Typography = Nature defaults** (shown as labelled "Nature N" chips). Sub-figure
  resize is **free-shape** (non-uniform); type/line are NOT auto-compensated —
  the Type panel's **"Unify to Nature size"** normalizes every sub-figure on demand.
- **Axis frame redraw**: full / half-L / none (LeftSidebar → Axis frame).
- **One-click transparent background** (LeftSidebar).
- **Panel gutter** spacing + reflow; **align/distribute** multi-selected panels;
  **apply one element's style to the same role** across all panels.
- **Gradient-fill palettes** for bars/areas (Color library → Gradient).
- **Bundled examples** (Origin / Prism / seaborn / matplotlib).

## TODO (not done yet)
- **T4 — Auto-crop whitespace**: one-click crop that shrinks a panel's `vb`
  (viewBox) to the bounding box of its visible, non-background elements (drop edge
  whitespace) while keeping its on-page x/y; update `panel.aspect`. Likely a store
  action `autoCropPanel(id)` + a button in the Tune/Layout area.
- **T5 — Axis-label position + tick direction** (type-specific Tune controls):
  - `text-axis`: a "center on axis" action + a distance-from-axis control (move the
    label x/y using `plotBox(panel)` already in `lib/store.ts`).
  - `tick`: inward/outward toggle — rewrite each tick path so its free end flips to
    the other side of the axis; a store action over all `tick` elements.
  Add both in `components/panels/TunePanel.tsx`.

## Key context
- Pure front-end, **no backend, no AI** recognition. The **SVG string is the source
  of truth**; edits are string→string transforms in `lib/svg/mutate.ts` keyed by
  `data-scid` / `data-scrole`. The React model is updated alongside.
- `FIG_PX_PER_MM = 4`; pt→figure-px = `4*25.4/72 = 1.4111` (used by
  `unifyTypography`); the `1.333` factor is only for panel labels.
- Recognition lives in `lib/svg/roles.ts` (tick-before-axis ordering; frame = thin
  unfilled box spanning the plot; legend swatches excluded from data series).
- See AGENTS.md "Gotchas" for the fabric.js + React canvas split.
