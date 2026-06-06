"use client";

/**
 * Module B — the elastic figure canvas.
 *
 * Hybrid architecture: a transparent fabric.Canvas on top is the *interaction*
 * layer (one Rect per panel: drag / resize / snap / smart guides), while the
 * actual vector fidelity comes from native HTML SVG overlays rendered directly
 * underneath each rect. The two are kept in lock-step:
 *   - fabric Rect  -> source of pointer interaction
 *   - overlay div  -> source of visual truth (panel.svg)
 * During a drag we write overlay DOM styles directly (no React churn) and only
 * commit the final rectangle to the store on `object:modified`. A single
 * `snapshot()` is taken at the first move of an interaction so undo is atomic.
 */

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Canvas, Rect, Line } from "fabric";
import { Check, X } from "lucide-react";
import { useStore, FIG_PX_PER_MM } from "@/lib/store";
import { useT } from "@/lib/i18n";
import type { Panel, PanelLabelStyle } from "@/lib/types";
import { EXAMPLES, loadExample } from "@/lib/examples";

const SNAP = 6; // px snap threshold
const FAINT = "#c7ced8";
const ACCENT = "#5b63f0";

type RectWithId = Rect & { scId?: string };

function effRect(o: Rect) {
  const w = (o.width ?? 0) * (o.scaleX ?? 1);
  const h = (o.height ?? 0) * (o.scaleY ?? 1);
  return { x: o.left ?? 0, y: o.top ?? 0, w, h };
}

/** Best 1-D snap among a set of moving edges vs. candidate target lines. */
function snap1D(
  edges: { val: number; place: (t: number) => number }[],
  targets: number[]
): { pos: number; guide: number } | null {
  let best: { pos: number; guide: number; dist: number } | null = null;
  for (const e of edges) {
    for (const t of targets) {
      const d = Math.abs(e.val - t);
      if (d <= SNAP && (!best || d < best.dist)) best = { pos: e.place(t), guide: t, dist: d };
    }
  }
  return best ? { pos: best.pos, guide: best.guide } : null;
}

/** Corner inset for the panel label, in figure px — keeps (a)(b)(c) off the axes
 * (esp. after Trim). Driven by labelStyle.offsetPx. */
function labelPosStyle(pos: PanelLabelStyle["position"], off: number): { left?: number; right?: number; top?: number; bottom?: number } {
  const v: { left?: number; right?: number; top?: number; bottom?: number } = {};
  if (pos === "tr" || pos === "br") v.right = off;
  else v.left = off;
  if (pos === "bl" || pos === "br") v.bottom = off;
  else v.top = off;
  return v;
}

const CROP_HANDLES: { k: string; x: number; y: number; cursor: string }[] = [
  { k: "tl", x: 0, y: 0, cursor: "nwse-resize" },
  { k: "t", x: 0.5, y: 0, cursor: "ns-resize" },
  { k: "tr", x: 1, y: 0, cursor: "nesw-resize" },
  { k: "l", x: 0, y: 0.5, cursor: "ew-resize" },
  { k: "r", x: 1, y: 0.5, cursor: "ew-resize" },
  { k: "bl", x: 0, y: 1, cursor: "nesw-resize" },
  { k: "b", x: 0.5, y: 1, cursor: "ns-resize" },
  { k: "br", x: 1, y: 1, cursor: "nwse-resize" }
];

/** Manual-crop overlay (z-30) — drag the box body to move it, the 8 handles to resize.
 * Confirm applies the kept region; cancel / Esc exits, Enter confirms. Swallows pointer
 * events so panel drags underneath don't fire while cropping. Coordinates are in the
 * figure-canvas pixel space (same as panel.x/y/w/h). */
function CropBox({ panel }: { panel: Panel }) {
  const t = useT();
  const applyCrop = useStore((s) => s.applyCrop);
  const cancelCrop = useStore((s) => s.cancelCrop);
  const [box, setBox] = useState({ x: panel.x, y: panel.y, w: panel.w, h: panel.h });
  const drag = useRef<{ mode: string; sx: number; sy: number; box: typeof box } | null>(null);

  const MIN = 16;
  const clamp = (b: typeof box) => {
    const w = Math.max(MIN, Math.min(b.w, panel.w));
    const h = Math.max(MIN, Math.min(b.h, panel.h));
    const x = Math.max(panel.x, Math.min(b.x, panel.x + panel.w - w));
    const y = Math.max(panel.y, Math.min(b.y, panel.y + panel.h - h));
    return { x, y, w, h };
  };

  const onDown = (mode: string) => (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    drag.current = { mode, sx: e.clientX, sy: e.clientY, box: { ...box } };
    const onMove = (ev: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = ev.clientX - d.sx;
      const dy = ev.clientY - d.sy;
      let { x, y, w, h } = d.box;
      if (d.mode === "move") {
        x += dx;
        y += dy;
      } else {
        if (d.mode.includes("l")) { x += dx; w -= dx; }
        if (d.mode.includes("r")) { w += dx; }
        if (d.mode.includes("t")) { y += dy; h -= dy; }
        if (d.mode.includes("b")) { h += dy; }
      }
      setBox(clamp({ x, y, w, h }));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      drag.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelCrop();
      else if (e.key === "Enter") applyCrop(box);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [box, applyCrop, cancelCrop]);

  return (
    <div className="absolute inset-0 z-30">
      <div
        className="absolute cursor-move"
        style={{
          left: box.x,
          top: box.y,
          width: box.w,
          height: box.h,
          boxShadow: "0 0 0 9999px rgba(15,18,28,0.45)",
          outline: "1.5px dashed #5b63f0"
        }}
        onPointerDown={onDown("move")}
      >
        {CROP_HANDLES.map((hd) => (
          <div
            key={hd.k}
            onPointerDown={onDown(hd.k)}
            className="absolute h-2.5 w-2.5 rounded-sm border border-white"
            style={{
              left: `calc(${hd.x * 100}% - 5px)`,
              top: `calc(${hd.y * 100}% - 5px)`,
              background: "#5b63f0",
              cursor: hd.cursor
            }}
          />
        ))}
      </div>
      <div className="absolute left-1/2 top-2 flex -translate-x-1/2 items-center gap-1.5 rounded-lg border border-line bg-panel px-2 py-1 shadow-pop">
        <span className="mr-1 text-2xs text-faint">{t("crop.hint")}</span>
        <button className="chip chip-on" onClick={() => applyCrop(box)}>
          <Check size={13} /> {t("crop.apply")}
        </button>
        <button className="chip" onClick={cancelCrop}>
          <X size={13} /> {t("crop.cancel")}
        </button>
      </div>
    </div>
  );
}

export function FigureCanvas() {
  const t = useT();
  const panels = useStore((s) => s.panels);
  const pageWidthMm = useStore((s) => s.pageWidthMm);
  const selectedPanelId = useStore((s) => s.selectedPanelId);
  const selectedPanelIds = useStore((s) => s.selectedPanelIds);
  const selectedElementId = useStore((s) => s.selectedElementId);
  const showGrid = useStore((s) => s.showGrid);
  const showPanelBorder = useStore((s) => s.showPanelBorder);
  const labelStyle = useStore((s) => s.labelStyle);
  const layoutLocked = useStore((s) => s.layoutLocked);
  const cropPanelId = useStore((s) => s.cropPanelId);

  const figW = pageWidthMm * FIG_PX_PER_MM;
  const isPpt = pageWidthMm >= 320; // PowerPoint preset (338mm) → fixed 16:9 slide
  const figH = useMemo(() => {
    if (isPpt) return Math.round((figW * 9) / 16);
    let maxB = 0;
    for (const p of panels) maxB = Math.max(maxB, p.y + p.h);
    return Math.max(280, Math.ceil(maxB) + 10);
  }, [panels, isPpt, figW]);

  const hostRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const guideVRef = useRef<Line | null>(null);
  const guideHRef = useRef<Line | null>(null);
  const overlayRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const overlayHostRef = useRef<HTMLDivElement>(null);
  // true while we programmatically sync fabric's active object from the store,
  // so the resulting selection events don't bounce back and reset selection.
  const suppressSelectRef = useRef(false);

  // ── init fabric (once) ───────────────────────────────────────────────────
  // The <canvas> is created imperatively (NOT via JSX): fabric wraps it in its
  // own `.canvas-container`, which would move a React-managed node and crash
  // reconciliation. Mounting on a node React never renders keeps the two
  // DOM-owners cleanly separated.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const el = document.createElement("canvas");
    host.appendChild(el);
    const c = new Canvas(el, {
      selection: false,
      preserveObjectStacking: true,
      uniformScaling: false,
      renderOnAddRemove: true
    });
    c.wrapperEl.style.position = "absolute";
    c.wrapperEl.style.top = "0";
    c.wrapperEl.style.left = "0";
    fabricRef.current = c;

    const mkGuide = () =>
      new Line([0, 0, 0, 0], {
        stroke: ACCENT,
        strokeWidth: 1,
        selectable: false,
        evented: false,
        visible: false,
        excludeFromExport: true,
        strokeDashArray: [4, 3]
      });
    const gv = mkGuide();
    const gh = mkGuide();
    guideVRef.current = gv;
    guideHRef.current = gh;
    c.add(gv, gh);

    const syncOverlay = (o: RectWithId) => {
      if (!o.scId) return;
      const div = overlayRefs.current.get(o.scId);
      if (!div) return;
      const r = effRect(o);
      div.style.left = `${r.x}px`;
      div.style.top = `${r.y}px`;
      div.style.width = `${r.w}px`;
      div.style.height = `${r.h}px`;
    };

    const hideGuides = () => {
      gv.set({ visible: false });
      gh.set({ visible: false });
    };

    const showGuide = (line: Line, vertical: boolean, at: number) => {
      const len = vertical ? c.getHeight() : c.getWidth();
      if (vertical) line.set({ x1: at, y1: 0, x2: at, y2: len, visible: true });
      else line.set({ x1: 0, y1: at, x2: len, y2: at, visible: true });
    };

    const applySnap = (o: RectWithId) => {
      const r = effRect(o);
      const w = r.w;
      const h = r.h;
      const W = c.getWidth();
      const xs = [0, W, W / 2];
      const ys = [0];
      for (const p of useStore.getState().panels) {
        if (p.id === o.scId) continue;
        xs.push(p.x, p.x + p.w, p.x + p.w / 2);
        ys.push(p.y, p.y + p.h, p.y + p.h / 2);
      }
      const sx = snap1D(
        [
          { val: r.x, place: (t) => t },
          { val: r.x + w / 2, place: (t) => t - w / 2 },
          { val: r.x + w, place: (t) => t - w }
        ],
        xs
      );
      const sy = snap1D(
        [
          { val: r.y, place: (t) => t },
          { val: r.y + h / 2, place: (t) => t - h / 2 },
          { val: r.y + h, place: (t) => t - h }
        ],
        ys
      );
      if (sx) {
        o.set({ left: sx.pos });
        showGuide(gv, true, sx.guide);
      } else gv.set({ visible: false });
      if (sy) {
        o.set({ top: sy.pos });
        showGuide(gh, false, sy.guide);
      } else gh.set({ visible: false });
    };

    // Snap while RESIZING: snap only the edge(s) being dragged (per the active handle)
    // to neighbouring panel edges / canvas edges, adjusting width/height — not just moving
    // the whole rect like applySnap. tl/tr/bl/br move two edges; ml/mr/mt/mb move one.
    const applyScaleSnap = (o: RectWithId) => {
      const corner = (o as { __corner?: string }).__corner;
      if (!corner) {
        hideGuides();
        return;
      }
      const r = effRect(o);
      const W = c.getWidth();
      const xs = [0, W, W / 2];
      const ys = [0];
      for (const p of useStore.getState().panels) {
        if (p.id === o.scId) continue;
        xs.push(p.x, p.x + p.w, p.x + p.w / 2);
        ys.push(p.y, p.y + p.h, p.y + p.h / 2);
      }
      let left = r.x;
      let top = r.y;
      let right = r.x + r.w;
      let bottom = r.y + r.h;
      let guideX: number | null = null;
      let guideY: number | null = null;
      if (corner.includes("l")) {
        const s = snap1D([{ val: left, place: (t) => t }], xs);
        if (s && s.pos < right - 24) {
          left = s.pos;
          guideX = s.guide;
        }
      } else if (corner.includes("r")) {
        const s = snap1D([{ val: right, place: (t) => t }], xs);
        if (s && s.pos > left + 24) {
          right = s.pos;
          guideX = s.guide;
        }
      }
      if (corner.includes("t")) {
        const s = snap1D([{ val: top, place: (t) => t }], ys);
        if (s && s.pos < bottom - 18) {
          top = s.pos;
          guideY = s.guide;
        }
      } else if (corner.includes("b")) {
        const s = snap1D([{ val: bottom, place: (t) => t }], ys);
        if (s && s.pos > top + 18) {
          bottom = s.pos;
          guideY = s.guide;
        }
      }
      o.set({ left, top, width: right - left, height: bottom - top, scaleX: 1, scaleY: 1 });
      o.setCoords();
      if (guideX != null) showGuide(gv, true, guideX);
      else gv.set({ visible: false });
      if (guideY != null) showGuide(gh, false, guideY);
      else gh.set({ visible: false });
    };

    let dragSnapped = false;

    c.on("mouse:down", (opt) => {
      dragSnapped = false;
      const t = (opt.target as RectWithId) || null;
      const st = useStore.getState();
      if (!t) {
        if (st.selectedPanelId !== null) st.selectPanel(null);
        return;
      }
      // Shift-click is multi-select for align/distribute (handled by the
      // selection handler); skip element-picking in that case.
      if ((opt.e as MouseEvent).shiftKey) return;
      // A click on the already-selected panel picks the element under the cursor.
      // The overlays are pointer-events:none and fabric's canvas sits on top, so
      // we momentarily flip both to let elementFromPoint reach the real SVG node.
      if (t.scId && t.scId === st.selectedPanelId) {
        const ev = opt.e as MouseEvent;
        const overlay = overlayHostRef.current;
        const fabHost = hostRef.current; // disable the WHOLE fabric layer (lower + upper canvas)
        if (overlay && fabHost && typeof ev.clientX === "number") {
          const prevFab = fabHost.style.pointerEvents;
          const prevOverlay = overlay.style.pointerEvents;
          fabHost.style.pointerEvents = "none";
          overlay.style.pointerEvents = "auto";
          const node = document.elementFromPoint(ev.clientX, ev.clientY);
          fabHost.style.pointerEvents = prevFab;
          overlay.style.pointerEvents = prevOverlay;
          const scid = node?.closest("[data-scid]")?.getAttribute("data-scid") ?? null;
          if (scid) {
            st.selectElement(scid);
            st.setRightTab("tune");
          } else if (st.selectedElementId !== null) {
            st.selectElement(null);
          }
        }
      }
    });

    c.on("object:moving", (opt) => {
      const o = opt.target as RectWithId;
      if (!o) return;
      if (!dragSnapped) {
        useStore.getState().snapshot();
        dragSnapped = true;
      }
      applySnap(o);
      syncOverlay(o);
    });

    c.on("object:scaling", (opt) => {
      const o = opt.target as RectWithId;
      if (!o) return;
      if (!dragSnapped) {
        useStore.getState().snapshot();
        dragSnapped = true;
      }
      // Free-shape: width and height resize independently (corners or side
      // handles), so a sub-figure can be reshaped, not just scaled.
      const w = Math.max(24, (o.width ?? 0) * (o.scaleX ?? 1));
      const h = Math.max(18, (o.height ?? 0) * (o.scaleY ?? 1));
      o.set({ width: w, height: h, scaleX: 1, scaleY: 1 });
      o.setCoords();
      // snap the dragged edge(s) to neighbouring panels / canvas edges, same as moving
      applyScaleSnap(o);
      syncOverlay(o);
    });

    c.on("object:modified", (opt) => {
      const o = opt.target as RectWithId;
      if (!o || !o.scId) return;
      const r = effRect(o);
      o.set({ left: r.x, top: r.y, width: r.w, height: r.h, scaleX: 1, scaleY: 1 });
      o.setCoords();
      useStore.getState().updatePanelRect(o.scId, { x: r.x, y: r.y, w: r.w, h: r.h });
      hideGuides();
      dragSnapped = false;
      c.requestRenderAll();
    });

    c.on("mouse:up", () => {
      hideGuides();
      c.requestRenderAll();
    });

    const onSelect = (opt: { e?: Event }) => {
      if (suppressSelectRef.current) return; // store->fabric sync, not a user click
      const ev = opt?.e as MouseEvent | undefined;
      const a = c.getActiveObject() as RectWithId | undefined;
      const id = a?.scId ?? null;
      const st = useStore.getState();
      if (ev?.shiftKey && id) {
        st.togglePanelSelected(id);
      } else if (st.selectedPanelId !== id) {
        st.selectPanel(id);
      }
    };
    c.on("selection:created", onSelect);
    c.on("selection:updated", onSelect);
    c.on("selection:cleared", () => {
      if (suppressSelectRef.current) return; // ignore programmatic clears
      if (useStore.getState().selectedPanelId !== null) useStore.getState().selectPanel(null);
    });

    return () => {
      void c.dispose();
      fabricRef.current = null;
    };
  }, []);

  // ── resize canvas to figure size ─────────────────────────────────────────
  useEffect(() => {
    const c = fabricRef.current;
    if (!c) return;
    c.setDimensions({ width: figW, height: figH });
    c.requestRenderAll();
  }, [figW, figH]);

  // ── reconcile fabric rects with store panels ─────────────────────────────
  useEffect(() => {
    const c = fabricRef.current;
    if (!c) return;
    const existing = new Map<string, RectWithId>();
    for (const obj of c.getObjects()) {
      const r = obj as RectWithId;
      if (r.scId) existing.set(r.scId, r);
    }
    // remove panels that are gone
    for (const [id, obj] of existing) {
      if (!panels.some((p) => p.id === id)) c.remove(obj);
    }
    // add / update
    for (const p of panels) {
      let r = existing.get(p.id);
      if (!r) {
        r = new Rect({
          left: p.x,
          top: p.y,
          width: p.w,
          height: p.h,
          fill: "rgba(255,255,255,0.001)",
          stroke: FAINT,
          strokeWidth: 1,
          strokeDashArray: [5, 4],
          strokeUniform: true,
          hasRotatingPoint: false,
          lockRotation: true,
          objectCaching: false,
          borderColor: ACCENT,
          cornerColor: ACCENT,
          cornerStyle: "circle",
          cornerSize: 9,
          transparentCorners: false,
          borderScaleFactor: 1.5,
          padding: 0
        }) as RectWithId;
        r.scId = p.id;
        r.setControlsVisibility({ mtr: false }); // hide rotation; keep side + corner handles
        c.add(r);
      } else if (r.left !== p.x || r.top !== p.y || r.width !== p.w || r.height !== p.h) {
        // sync from the store even for the active object, so numeric / preset size
        // edits move the blue selection box too (after a drag the values already match)
        r.set({ left: p.x, top: p.y, width: p.w, height: p.h, scaleX: 1, scaleY: 1 });
        r.setCoords();
      }
      // regular (grid) layout locks size + position; unlock = free placement. The
      // panel stays selectable so element click-to-edit still works when locked.
      r.set({
        lockMovementX: layoutLocked,
        lockMovementY: layoutLocked,
        lockScalingX: layoutLocked,
        lockScalingY: layoutLocked,
        hasControls: !layoutLocked,
        stroke: showPanelBorder ? FAINT : "transparent"
      });
    }
    c.requestRenderAll();
  }, [panels, layoutLocked, showPanelBorder]);

  // ── reflect store selection -> fabric active object ──────────────────────
  useEffect(() => {
    const c = fabricRef.current;
    if (!c) return;
    const active = c.getActiveObject() as RectWithId | undefined;
    suppressSelectRef.current = true;
    if (selectedPanelId) {
      if (!active || active.scId !== selectedPanelId) {
        const obj = c.getObjects().find((o) => (o as RectWithId).scId === selectedPanelId) as
          | RectWithId
          | undefined;
        if (obj) {
          c.setActiveObject(obj);
          c.requestRenderAll();
        }
      }
    } else if (active) {
      c.discardActiveObject();
      c.requestRenderAll();
    }
    suppressSelectRef.current = false;
  }, [selectedPanelId, panels]);

  const setOverlayRef = (id: string) => (el: HTMLDivElement | null) => {
    if (el) overlayRefs.current.set(id, el);
    else overlayRefs.current.delete(id);
  };

  const labelPx = labelStyle.fontSizePt * 1.333;

  return (
    <div
      className="relative mx-auto select-none overflow-hidden rounded-[1px] bg-white"
      style={{ width: figW, height: figH }}
    >
      {showGrid && (
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(91,99,240,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(91,99,240,0.06) 1px, transparent 1px)",
            backgroundSize: `${FIG_PX_PER_MM * 10}px ${FIG_PX_PER_MM * 10}px`
          }}
        />
      )}

      {panels.length === 0 && (
        <div className="pointer-events-none absolute inset-3 z-[5] grid place-items-center rounded-lg border border-dashed border-line">
          <div className="text-center">
            <div className="text-sm font-medium text-muted">{t("canvas.importBegin")}</div>
            <div className="mt-1 text-2xs text-faint">
              {t("canvas.importHint")}
            </div>
            <div className="pointer-events-auto mt-2 flex flex-wrap justify-center gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.file}
                  onClick={() => loadExample(ex, useStore.getState().importSvg, useStore.getState().importImage)}
                  title={ex.desc}
                  className="rounded-md border border-dashed border-line bg-control px-2 py-1 text-2xs text-muted transition-colors duration-100 ease-out hover:bg-hover hover:text-ink"
                >
                  {ex.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* native SVG overlays (visual truth, non-interactive) — a self-contained
          React subtree that fabric never touches */}
      <div ref={overlayHostRef} className="pointer-events-none absolute inset-0 z-10">
        {panels.map((p) => {
          const multiSel = selectedPanelIds.length > 1 && selectedPanelIds.includes(p.id);
          const selEl =
            p.id === selectedPanelId && selectedElementId
              ? p.elements.find((e) => e.scid === selectedElementId)
              : null;
          return (
          <div
            key={p.id}
            ref={setOverlayRef(p.id)}
            className="absolute"
            style={{
              left: p.x,
              top: p.y,
              width: p.w,
              height: p.h,
              outline: multiSel ? "2px solid #5b63f0" : undefined,
              outlineOffset: "1px"
            }}
          >
            {/* only the SVG is clipped to the panel box; the (a)(b)(c) label can sit
                outside it (negative gap) without being cut off */}
            <div
              className="h-full w-full overflow-hidden [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: p.svg }}
            />
            {selEl && (
              <div
                className="pointer-events-none absolute"
                style={{
                  left: `${((selEl.bbox.x - p.vb.x) / p.vb.w) * 100}%`,
                  top: `${((selEl.bbox.y - p.vb.y) / p.vb.h) * 100}%`,
                  width: `${(selEl.bbox.w / p.vb.w) * 100}%`,
                  height: `${(selEl.bbox.h / p.vb.h) * 100}%`,
                  outline: "1.5px solid #5b63f0",
                  outlineOffset: "1px",
                  background: "rgba(91,99,240,0.1)"
                }}
              />
            )}
            {p.label && labelStyle.format !== "none" && (
              <span
                className="absolute font-semibold leading-none"
                style={{
                  // labels are fixed top-left; gap (offsetPx) just nudges them inward
                  ...labelPosStyle("tl", labelStyle.offsetPx ?? 4),
                  fontFamily: labelStyle.fontFamily,
                  fontSize: labelPx,
                  fontWeight: labelStyle.bold ? 700 : 400,
                  color: labelStyle.color,
                  // image panels fill to the corner (slice), so always give their label a
                  // backing chip — otherwise the black (a)/(b) sits on the photo and reads
                  // as part of the image.
                  background: labelStyle.whiteBacking || p.mode === "image" ? "rgba(255,255,255,0.85)" : "transparent",
                  padding: labelStyle.whiteBacking || p.mode === "image" ? "0 2px" : 0
                }}
              >
                {p.label}
              </span>
            )}
          </div>
          );
        })}
      </div>

      {/* fabric interaction layer mounts its own <canvas> inside this host */}
      <div ref={hostRef} className="absolute inset-0 z-20" />

      {/* manual-crop overlay sits above everything while active */}
      {cropPanelId && panels.some((p) => p.id === cropPanelId) && (
        <CropBox key={cropPanelId} panel={panels.find((p) => p.id === cropPanelId)!} />
      )}
    </div>
  );
}
