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

import { useEffect, useMemo, useRef } from "react";
import { Canvas, Rect, Line } from "fabric";
import { useStore, FIG_PX_PER_MM } from "@/lib/store";
import type { Panel, PanelLabelStyle } from "@/lib/types";

const SNAP = 6; // px snap threshold
const FAINT = "#c7ced8";
const ACCENT = "#4c8dff";

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

function labelPosClass(pos: PanelLabelStyle["position"]): string {
  switch (pos) {
    case "tr":
      return "right-1 top-0.5 text-right";
    case "bl":
      return "bottom-0.5 left-1";
    case "br":
      return "bottom-0.5 right-1 text-right";
    default:
      return "left-1 top-0.5";
  }
}

export function FigureCanvas() {
  const panels = useStore((s) => s.panels);
  const pageWidthMm = useStore((s) => s.pageWidthMm);
  const selectedPanelId = useStore((s) => s.selectedPanelId);
  const showGrid = useStore((s) => s.showGrid);
  const labelStyle = useStore((s) => s.labelStyle);

  const figW = pageWidthMm * FIG_PX_PER_MM;
  const figH = useMemo(() => {
    let maxB = 0;
    for (const p of panels) maxB = Math.max(maxB, p.y + p.h);
    return Math.max(280, Math.ceil(maxB) + 80);
  }, [panels]);

  const hostRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const guideVRef = useRef<Line | null>(null);
  const guideHRef = useRef<Line | null>(null);
  const overlayRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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

    let dragSnapped = false;

    c.on("mouse:down", (opt) => {
      dragSnapped = false;
      const t = (opt.target as RectWithId) || null;
      if (!t) {
        if (useStore.getState().selectedPanelId !== null) useStore.getState().selectPanel(null);
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
      let w = (o.width ?? 0) * (o.scaleX ?? 1);
      let h = (o.height ?? 0) * (o.scaleY ?? 1);
      const panel = useStore.getState().panels.find((p) => p.id === o.scId);
      if (panel && panel.aspectLocked) h = w / (panel.aspect || 1.4);
      w = Math.max(24, w);
      h = Math.max(18, h);
      o.set({ width: w, height: h, scaleX: 1, scaleY: 1 });
      o.setCoords();
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

    const onSelect = () => {
      const a = c.getActiveObject() as RectWithId | undefined;
      const id = a?.scId ?? null;
      if (useStore.getState().selectedPanelId !== id) useStore.getState().selectPanel(id);
    };
    c.on("selection:created", onSelect);
    c.on("selection:updated", onSelect);
    c.on("selection:cleared", () => {
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
        r.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false, mtr: false });
        c.add(r);
      } else if (c.getActiveObject() !== r) {
        r.set({ left: p.x, top: p.y, width: p.w, height: p.h, scaleX: 1, scaleY: 1 });
        r.setCoords();
      }
    }
    c.requestRenderAll();
  }, [panels]);

  // ── reflect store selection -> fabric active object ──────────────────────
  useEffect(() => {
    const c = fabricRef.current;
    if (!c) return;
    const active = c.getActiveObject() as RectWithId | undefined;
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
              "linear-gradient(to right, rgba(76,141,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(76,141,255,0.06) 1px, transparent 1px)",
            backgroundSize: `${FIG_PX_PER_MM * 10}px ${FIG_PX_PER_MM * 10}px`
          }}
        />
      )}

      {panels.length === 0 && (
        <div className="pointer-events-none absolute inset-3 z-[5] grid place-items-center rounded border border-dashed border-neutral-300">
          <div className="text-center">
            <div className="text-sm font-medium text-neutral-400">Import an SVG to begin</div>
            <div className="mt-1 text-2xs text-neutral-300">
              Drag exported sub-figures here · arrange them into one Figure
            </div>
          </div>
        </div>
      )}

      {/* native SVG overlays (visual truth, non-interactive) — a self-contained
          React subtree that fabric never touches */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {panels.map((p) => (
          <div
            key={p.id}
            ref={setOverlayRef(p.id)}
            className="absolute overflow-hidden"
            style={{ left: p.x, top: p.y, width: p.w, height: p.h }}
          >
            <div
              className="h-full w-full [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: p.svg }}
            />
            {p.label && labelStyle.format !== "none" && (
              <span
                className={`absolute font-semibold leading-none ${labelPosClass(labelStyle.position)}`}
                style={{
                  fontFamily: labelStyle.fontFamily,
                  fontSize: labelPx,
                  fontWeight: labelStyle.bold ? 700 : 400,
                  color: labelStyle.color,
                  background: labelStyle.whiteBacking ? "rgba(255,255,255,0.85)" : "transparent",
                  padding: labelStyle.whiteBacking ? "0 2px" : 0
                }}
              >
                {p.label}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* fabric interaction layer mounts its own <canvas> inside this host */}
      <div ref={hostRef} className="absolute inset-0 z-20" />
    </div>
  );
}
