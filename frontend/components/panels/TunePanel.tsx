"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { ROLE_LABELS, type ElementRole } from "@/lib/types";

const ROLE_KEYS = Object.keys(ROLE_LABELS) as ElementRole[];
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
  const setElementRole = useStore((s) => s.setElementRole);

  const panel = panels.find((p) => p.id === selectedPanelId) ?? null;
  const el = panel?.elements.find((e) => e.scid === selectedElementId) ?? null;

  const [stroke, setStroke] = useState("#000000");
  const [fill, setFill] = useState("#000000");
  const [width, setWidth] = useState("");
  const [opacity, setOpacity] = useState("1");
  const [dash, setDash] = useState("none");

  useEffect(() => {
    if (!el) return;
    setStroke(asHex(el.stroke));
    setFill(asHex(el.fill));
    setWidth(el.strokeWidth != null ? String(el.strokeWidth) : "");
    setOpacity(el.opacity != null ? String(el.opacity) : "1");
    setDash(el.strokeDasharray ?? "none");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElementId, selectedPanelId]);

  if (!panel) return <div className="p-3 text-2xs text-faint">Select a panel, then an element.</div>;
  if (!el)
    return (
      <div className="p-3 text-2xs text-faint">
        Pick an element from the left list to fine-tune its color, weight and role.
      </div>
    );

  const set = (prop: string, value: string) => tuneElement(panel.id, el.scid, prop, value);
  const hasStroke = el.stroke != null && el.stroke !== "none";
  const hasFill = el.fill != null && el.fill !== "none";

  return (
    <div className="p-3">
      <div className="panel-title mb-1">Element tuning</div>
      <div className="mb-3 truncate text-2xs text-faint">
        {panel.label} · {el.tag}
        {el.text ? ` · "${el.text.slice(0, 16)}"` : ""}
      </div>

      <label className="field-label">Role</label>
      <select
        className="input-dark mb-3 w-full"
        value={el.role}
        onChange={(e) => setElementRole(panel.id, el.scid, e.target.value as ElementRole)}
      >
        {ROLE_KEYS.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div>
          <label className="field-label">Stroke</label>
          <input
            type="color"
            value={stroke}
            disabled={!hasStroke && el.role !== "data"}
            onChange={(e) => {
              setStroke(e.target.value);
              set("stroke", e.target.value);
            }}
            className="h-7 w-full cursor-pointer rounded border border-line bg-transparent"
          />
        </div>
        <div>
          <label className="field-label">Fill</label>
          <input
            type="color"
            value={fill}
            disabled={!hasFill}
            onChange={(e) => {
              setFill(e.target.value);
              set("fill", e.target.value);
            }}
            className="h-7 w-full cursor-pointer rounded border border-line bg-transparent disabled:opacity-30"
          />
        </div>
      </div>

      <label className="field-label">Stroke width</label>
      <input
        type="number"
        step={0.1}
        min={0}
        className="input-dark mb-3 w-full"
        value={width}
        onChange={(e) => {
          setWidth(e.target.value);
          set("stroke-width", e.target.value);
        }}
      />

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

      <label className="field-label">Dash</label>
      <select
        className="input-dark w-full"
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
    </div>
  );
}
