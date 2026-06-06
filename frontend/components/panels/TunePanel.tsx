"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Trash2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import type { Panel } from "@/lib/types";
import { panelScale, PT_TO_FIG } from "@/lib/svg/mutate";
import { findPalette } from "@/lib/palettes";

/** Lighten a hex color toward white by `amt` (0–1) — used to build the light end of a
 * one-click gradient from a palette color, so gradients stay within the active palette. */
function lighten(hex: string, amt: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * amt));
  return `#${ch.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

const DASHES = [
  { v: "none", tkey: "dash.solid" },
  { v: "4,3", tkey: "dash.dashed" },
  { v: "1,3", tkey: "dash.dotted" },
  { v: "6,3,1,3", tkey: "dash.dashdot" }
];

const FONTS = ["Arial", "Helvetica", "Times New Roman", "Georgia", "DejaVu Sans", "Courier New"];

function asHex(c: string | null): string {
  return c && /^#[0-9a-f]{6}$/i.test(c) ? c : "#000000";
}

/** Raster (image) panel controls: crop by zooming in (edges clip to the panel box) and
 * pan the image within the box. Shown in Tune when an image panel is selected. */
function RasterControls({ panel }: { panel: Panel }) {
  const t = useT();
  const setImagePanelTransform = useStore((s) => s.setImagePanelTransform);
  const snapshot = useStore((s) => s.snapshot);
  const scale = panel.imgScale ?? 1;
  const dx = panel.imgDx ?? 0;
  const dy = panel.imgDy ?? 0;
  const step = Math.max(4, panel.vb.w * 0.04);
  const move = (mx: number, my: number) => {
    snapshot();
    setImagePanelTransform(panel.id, { dx: dx + mx * step, dy: dy + my * step });
  };
  return (
    <div>
      <label className="field-label">{t("tune.imgCrop")} · {Math.round(scale * 100)}%</label>
      <input
        type="range"
        min={1}
        max={4}
        step={0.02}
        className="mb-3 w-full"
        value={scale}
        onPointerDown={() => snapshot()}
        onChange={(e) => setImagePanelTransform(panel.id, { scale: Number(e.target.value) })}
      />
      <label className="field-label">{t("tune.imgPos")}</label>
      <div className="mb-3 flex items-center gap-1">
        <button className="tool-btn px-1.5" onClick={() => move(-1, 0)} title="←"><ChevronLeft size={13} /></button>
        <button className="tool-btn px-1.5" onClick={() => move(0, -1)} title="↑"><ChevronUp size={13} /></button>
        <button className="tool-btn px-1.5" onClick={() => move(0, 1)} title="↓"><ChevronDown size={13} /></button>
        <button className="tool-btn px-1.5" onClick={() => move(1, 0)} title="→"><ChevronRight size={13} /></button>
      </div>
      <button
        className="chip w-full justify-center"
        onClick={() => {
          snapshot();
          setImagePanelTransform(panel.id, { scale: 1, dx: 0, dy: 0 });
        }}
      >
        {t("tune.imgReset")}
      </button>
      <p className="mt-2 text-2xs text-faint">{t("tune.imgHint")}</p>
    </div>
  );
}

export function TunePanel() {
  const t = useT();
  const panels = useStore((s) => s.panels);
  const selectedPanelId = useStore((s) => s.selectedPanelId);
  const selectedElementId = useStore((s) => s.selectedElementId);
  const tuneElement = useStore((s) => s.tuneElement);
  const hideElement = useStore((s) => s.hideElement);
  const deleteElement = useStore((s) => s.deleteElement);
  const applyElementStyleToRole = useStore((s) => s.applyElementStyleToRole);
  const moveAxisLabel = useStore((s) => s.moveAxisLabel);
  const setElementText = useStore((s) => s.setElementText);
  const setMarkerSize = useStore((s) => s.setMarkerSize);
  const setElementGradient = useStore((s) => s.setElementGradient);
  const activePaletteId = useStore((s) => s.activePaletteId);
  const selectElement = useStore((s) => s.selectElement);

  const panel = panels.find((p) => p.id === selectedPanelId) ?? null;
  const el = panel?.elements.find((e) => e.scid === selectedElementId) ?? null;
  const hidden = el?.hidden ?? false;

  const [stroke, setStroke] = useState("#000000");
  const [fill, setFill] = useState("#000000");
  const [width, setWidth] = useState("");
  const [opacity, setOpacity] = useState("1");
  const [dash, setDash] = useState("none");
  const [fontSize, setFontSize] = useState("");
  const [textVal, setTextVal] = useState("");
  const [fontFam, setFontFam] = useState("Arial");
  const [markerR, setMarkerR] = useState("");

  useEffect(() => {
    if (!el) return;
    // show physical points (pt), matching the global Type panel. In the 1:1 bake
    // model panelScale is 1, so pt = px / PT_TO_FIG.
    const sc = panel ? panelScale(panel.vb.w, panel.vb.h, panel.w, panel.h) : 1;
    setStroke(asHex(el.stroke));
    setFill(asHex(el.fill));
    setWidth(el.strokeWidth != null ? String(Math.round((el.strokeWidth * sc) / PT_TO_FIG * 100) / 100) : "");
    setOpacity(el.opacity != null ? String(el.opacity) : "1");
    setDash(el.strokeDasharray ?? "none");
    setTextVal(el.text ?? "");
    setMarkerR(el.hasMarker ? String(Math.round((el.bbox.w / 2) * 10) / 10) : "");
    setFontSize(el.fontSizePx != null ? String(Math.round((el.fontSizePx * sc) / PT_TO_FIG * 10) / 10) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElementId, selectedPanelId]);

  if (!panel) return <div className="p-3 text-2xs text-faint">{t("tune.pickPanelEl")}</div>;

  // Element picker — kept visible whether or not an element is selected, so the user
  // can switch elements without first deselecting.
  const rank: Record<string, number> = {
    data: 0, fit: 1, scatter: 2, errorbar: 3, auxiliary: 4, legend: 5,
    "text-axis": 6, "text-title": 7, "text-tick": 8, "text-legend": 9,
    axis: 10, tick: 11, grid: 12, decoration: 20, unknown: 21, background: 99
  };
  const pickItems = [...panel.elements]
    .filter((e) => e.role !== "background")
    .sort((a, b) => (rank[a.role] ?? 50) - (rank[b.role] ?? 50));
  const picker = (
    <>
      <label className="field-label">{t("tune.pickEl")}</label>
      <select
        className="input-dark mb-2 w-full"
        value={selectedElementId ?? ""}
        onChange={(e) => selectElement(e.target.value || null)}
      >
        <option value="">{t("tune.pickElPlaceholder")}</option>
        {pickItems.map((e) => (
          <option key={e.scid} value={e.scid}>
            {t(`role.${e.role}`)}
            {e.text ? ` · "${e.text.slice(0, 16)}"` : e.stroke && e.stroke !== "none" ? ` · ${e.stroke}` : e.fill && e.fill !== "none" ? ` · ${e.fill}` : ""}
            {e.hidden ? ` · ${t("tune.hidden")}` : ""}
          </option>
        ))}
      </select>
    </>
  );

  if (!el) {
    return (
      <div className="p-3">
        <div className="panel-title mb-2">
          {panel.mode === "image" ? t("tune.editImg") : t("tune.editEl")} · {panel.label}
        </div>
        {panel.mode === "image" ? (
          <RasterControls panel={panel} />
        ) : (
          <>
            {picker}
            <p className="text-2xs text-faint">{t("tune.orClick")}</p>
          </>
        )}
      </div>
    );
  }

  const set = (prop: string, value: string) => tuneElement(panel.id, el.scid, prop, value);
  const sc = panelScale(panel.vb.w, panel.vb.h, panel.w, panel.h);
  const isText = el.tag === "text";
  const hasFill = el.fill != null && el.fill !== "none";
  const hasStroke = el.stroke != null && el.stroke !== "none";
  const colorInput = "h-7 w-full cursor-pointer rounded border border-line bg-transparent";

  // current palette's colors — quick-pick swatches so single-element edits stay on the
  // chosen palette instead of free-picking. Falls back to a journal palette if none set.
  const swatchColors = (findPalette(activePaletteId ?? "") ?? findPalette("npg"))?.colors ?? [];
  const Swatches = ({ onPick, active }: { onPick: (c: string) => void; active?: string }) =>
    swatchColors.length ? (
      <div className="-mt-2 mb-3 flex flex-wrap gap-1">
        {swatchColors.map((c, i) => (
          <button
            key={i}
            onClick={() => onPick(c)}
            title={c}
            className={`h-4 w-4 rounded-sm border ${
              active && active.toLowerCase() === c.toLowerCase() ? "border-accent ring-1 ring-accent" : "border-line"
            }`}
            style={{ background: c }}
          />
        ))}
      </div>
    ) : null;

  return (
    <div className="p-3">
      <div className="panel-title mb-2">{t("tune.editEl")} · {panel.label}</div>
      {picker}
      <div className="mb-3 truncate text-2xs text-faint">
        {t(`role.${el.role}`)} · {el.tag}
        {el.text ? ` · "${el.text.slice(0, 16)}"` : ""}
      </div>

      {/* Text: font size + color */}
      {isText && (
        <>
          <label className="field-label">{t("tune.text")}</label>
          <input
            className="input-dark mb-3 w-full"
            value={textVal}
            onChange={(e) => {
              setTextVal(e.target.value);
              setElementText(panel.id, el.scid, e.target.value);
            }}
          />
          <label className="field-label">{t("tune.font")}</label>
          <select
            className="input-dark mb-3 w-full"
            value={FONTS.includes(fontFam) ? fontFam : "Arial"}
            onChange={(e) => {
              setFontFam(e.target.value);
              set("font-family", e.target.value);
            }}
          >
            {FONTS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <label className="field-label">{t("tune.fontSize")}</label>
          <input
            type="number"
            step={0.5}
            min={1}
            className="input-dark mb-3 w-full"
            value={fontSize}
            onChange={(e) => {
              setFontSize(e.target.value);
              if (e.target.value)
                set("font-size", `${Math.round((Number(e.target.value) * PT_TO_FIG) / sc * 1000) / 1000}px`);
            }}
          />
          <label className="field-label">{t("tune.textColor")}</label>
          <input
            type="color"
            value={fill === "#000000" && el.fill ? asHex(el.fill) : fill}
            className={`mb-1 ${colorInput}`}
            onChange={(e) => {
              setFill(e.target.value);
              set("fill", e.target.value);
            }}
          />
          <Swatches active={fill} onPick={(c) => { setFill(c); set("fill", c); }} />
          {el.role === "text-axis" && (
            <>
              <label className="field-label">{t("tune.axisLabelPos")}</label>
              <div className="mb-3 flex gap-1">
                <button
                  className="chip flex-1 justify-center"
                  onClick={() => moveAxisLabel(panel.id, el.scid, { center: true })}
                  title={t("tip.centerLabel")}
                >
                  {t("act.center")}
                </button>
                <button
                  className="chip justify-center px-2.5"
                  onClick={() => moveAxisLabel(panel.id, el.scid, { nudge: -3 })}
                  title={t("tip.closer")}
                >
                  −
                </button>
                <button
                  className="chip justify-center px-2.5"
                  onClick={() => moveAxisLabel(panel.id, el.scid, { nudge: 3 })}
                  title={t("tip.farther")}
                >
                  +
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* Filled shape (bar / area / scatter): fill leads */}
      {!isText && hasFill && (
        <>
          <label className="field-label">{t("tune.fillColor")}</label>
          <input
            type="color"
            value={fill}
            className={`mb-1 ${colorInput}`}
            onChange={(e) => {
              setFill(e.target.value);
              set("fill", e.target.value);
            }}
          />
          <Swatches active={fill} onPick={(c) => { setFill(c); set("fill", c); }} />
          <label className="field-label">{t("tune.gradientFill")}</label>
          <div className="mb-3 grid grid-cols-4 gap-1.5">
            {swatchColors.map((c, i) => {
              const from = lighten(c, 0.72);
              return (
                <button
                  key={i}
                  onClick={() => setElementGradient(panel.id, el.scid, from, c)}
                  title={t("tip.gradient", { c })}
                  className="h-6 rounded border border-line transition hover:ring-2 hover:ring-accent"
                  style={{ background: `linear-gradient(to top, ${from}, ${c})` }}
                />
              );
            })}
          </div>
        </>
      )}

      {/* Stroke: line color/width (and shape edge); dash only for pure lines */}
      {!isText && hasStroke && (
        <>
          <div className="mb-1 grid grid-cols-2 gap-2">
            <div>
              <label className="field-label">{hasFill ? t("tune.edge") : t("tune.color")}</label>
              <input
                type="color"
                value={stroke}
                className={colorInput}
                onChange={(e) => {
                  setStroke(e.target.value);
                  set("stroke", e.target.value);
                }}
              />
            </div>
            <div>
              <label className="field-label">{t("tune.widthPt")}</label>
              <input
                type="number"
                step={0.1}
                min={0}
                className="input-dark w-full"
                value={width}
                onChange={(e) => {
                  setWidth(e.target.value);
                  if (e.target.value)
                    set("stroke-width", String(Math.round((Number(e.target.value) * PT_TO_FIG) / sc * 1000) / 1000));
                }}
              />
            </div>
          </div>
          <Swatches active={stroke} onPick={(c) => { setStroke(c); set("stroke", c); }} />
          <label className="field-label">{hasFill ? t("tune.edgeDash") : t("tune.dash")}</label>
          <select
            className="input-dark mb-3 w-full"
            value={DASHES.some((d) => d.v === dash) ? dash : "none"}
            onChange={(e) => {
              setDash(e.target.value);
              set("stroke-dasharray", e.target.value);
            }}
          >
            {DASHES.map((d) => (
              <option key={d.v} value={d.v}>
                {t(d.tkey)}
              </option>
            ))}
          </select>
        </>
      )}

      {el.hasMarker && (
        <>
          <label className="field-label">{t("tune.markerSize")}</label>
          <input
            type="number"
            step={0.5}
            min={0.5}
            className="input-dark mb-3 w-full"
            value={markerR}
            onChange={(e) => {
              setMarkerR(e.target.value);
              if (e.target.value) setMarkerSize(panel.id, el.scid, Number(e.target.value));
            }}
          />
        </>
      )}

      <label className="field-label">{t("tune.opacity")} · {Number(opacity).toFixed(2)}</label>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        className="mb-3 w-full"
        value={opacity}
        onChange={(e) => {
          setOpacity(e.target.value);
          set("opacity", e.target.value);
        }}
      />

      <button
        className="chip w-full justify-center"
        onClick={() => applyElementStyleToRole(panel.id, el.scid)}
        title={t("tip.applyToRole")}
      >
        {t("tune.applyToRole", { role: t(`role.${el.role}`) })}
      </button>

      <div className="mt-4 flex gap-2 border-t border-line pt-3">
        <button
          className={`chip flex-1 ${hidden ? "chip-on" : ""}`}
          onClick={() => hideElement(panel.id, el.scid, !hidden)}
          title={hidden ? t("tip.show") : t("tip.hide")}
        >
          {hidden ? <Eye size={13} /> : <EyeOff size={13} />} {hidden ? t("act.show") : t("act.hide")}
        </button>
        <button
          className="chip flex-1 text-bad"
          onClick={() => deleteElement(panel.id, el.scid)}
          title={t("tip.delete")}
        >
          <Trash2 size={13} /> {t("act.delete")}
        </button>
      </div>
    </div>
  );
}
