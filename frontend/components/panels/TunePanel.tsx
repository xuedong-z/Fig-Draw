"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { ROLE_LABELS } from "@/lib/types";

const DASHES = [
  { v: "none", label: "Solid" },
  { v: "4,3", label: "Dashed" },
  { v: "1,3", label: "Dotted" },
  { v: "6,3,1,3", label: "Dash-dot" }
];

function asHex(c: string | null): string {
  return c && /^#[0-9a-f]{6}$/i.test(c) ? c : "#000000";
}

export function TunePanel() {
  const panels = useStore((s) => s.panels);
  const selectedPanelId = useStore((s) => s.selectedPanelId);
  const selectedElementId = useStore((s) => s.selectedElementId);
  const tuneElement = useStore((s) => s.tuneElement);
  const hideElement = useStore((s) => s.hideElement);
  const deleteElement = useStore((s) => s.deleteElement);
  const applyElementStyleToRole = useStore((s) => s.applyElementStyleToRole);

  const panel = panels.find((p) => p.id === selectedPanelId) ?? null;
  const el = panel?.elements.find((e) => e.scid === selectedElementId) ?? null;
  const hidden = el?.hidden ?? false;

  const [stroke, setStroke] = useState("#000000");
  const [fill, setFill] = useState("#000000");
  const [width, setWidth] = useState("");
  const [opacity, setOpacity] = useState("1");
  const [dash, setDash] = useState("none");
  const [fontSize, setFontSize] = useState("");

  useEffect(() => {
    if (!el) return;
    setStroke(asHex(el.stroke));
    setFill(asHex(el.fill));
    setWidth(el.strokeWidth != null ? String(el.strokeWidth) : "");
    setOpacity(el.opacity != null ? String(el.opacity) : "1");
    setDash(el.strokeDasharray ?? "none");
    setFontSize(el.fontSizePx != null ? String(Math.round(el.fontSizePx * 10) / 10) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElementId, selectedPanelId]);

  if (!panel) return <div className="p-3 text-2xs text-faint">Select a panel, then an element.</div>;
  if (!el)
    return (
      <div className="p-3 text-2xs text-faint">
        Select a panel, then click an element on the figure to edit it.
      </div>
    );

  const set = (prop: string, value: string) => tuneElement(panel.id, el.scid, prop, value);
  const isText = el.tag === "text";
  const hasFill = el.fill != null && el.fill !== "none";
  const hasStroke = el.stroke != null && el.stroke !== "none";
  const colorInput = "h-7 w-full cursor-pointer rounded border border-line bg-transparent";

  return (
    <div className="p-3">
      <div className="panel-title mb-1">Edit element</div>
      <div className="mb-3 truncate text-2xs text-faint">
        {ROLE_LABELS[el.role]} · {el.tag}
        {el.text ? ` · "${el.text.slice(0, 16)}"` : ""}
      </div>

      {/* Text: font size + color */}
      {isText && (
        <>
          <label className="field-label">Font size (px)</label>
          <input
            type="number"
            step={0.5}
            min={1}
            className="input-dark mb-3 w-full"
            value={fontSize}
            onChange={(e) => {
              setFontSize(e.target.value);
              if (e.target.value) set("font-size", `${e.target.value}px`);
            }}
          />
          <label className="field-label">Text color</label>
          <input
            type="color"
            value={fill === "#000000" && el.fill ? asHex(el.fill) : fill}
            className={`mb-3 ${colorInput}`}
            onChange={(e) => {
              setFill(e.target.value);
              set("fill", e.target.value);
            }}
          />
        </>
      )}

      {/* Filled shape (bar / area / scatter): fill leads */}
      {!isText && hasFill && (
        <>
          <label className="field-label">Fill color</label>
          <input
            type="color"
            value={fill}
            className={`mb-3 ${colorInput}`}
            onChange={(e) => {
              setFill(e.target.value);
              set("fill", e.target.value);
            }}
          />
        </>
      )}

      {/* Stroke: line color/width (and shape edge); dash only for pure lines */}
      {!isText && hasStroke && (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div>
              <label className="field-label">{hasFill ? "Edge" : "Color"}</label>
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
              <label className="field-label">Width</label>
              <input
                type="number"
                step={0.1}
                min={0}
                className="input-dark w-full"
                value={width}
                onChange={(e) => {
                  setWidth(e.target.value);
                  set("stroke-width", e.target.value);
                }}
              />
            </div>
          </div>
          {!hasFill && (
            <>
              <label className="field-label">Dash</label>
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
                    {d.label}
                  </option>
                ))}
              </select>
            </>
          )}
        </>
      )}

      <label className="field-label">Opacity · {Number(opacity).toFixed(2)}</label>
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
        title="Copy this element's color to the same kind in every panel"
      >
        Apply to all &ldquo;{ROLE_LABELS[el.role]}&rdquo;
      </button>

      <div className="mt-4 flex gap-2 border-t border-line pt-3">
        <button
          className={`chip flex-1 ${hidden ? "chip-on" : ""}`}
          onClick={() => hideElement(panel.id, el.scid, !hidden)}
          title={hidden ? "Show this element" : "Hide this element"}
        >
          {hidden ? <Eye size={13} /> : <EyeOff size={13} />} {hidden ? "Show" : "Hide"}
        </button>
        <button
          className="chip flex-1 text-bad"
          onClick={() => deleteElement(panel.id, el.scid)}
          title="Delete this element permanently"
        >
          <Trash2 size={13} /> Delete
        </button>
      </div>
    </div>
  );
}
