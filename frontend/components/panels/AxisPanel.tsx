"use client";

import { Eraser } from "lucide-react";
import { useStore, type AxisFrameStyle } from "@/lib/store";

const FRAMES: { v: AxisFrameStyle; label: string; title: string }[] = [
  { v: "original", label: "Orig", title: "Keep the imported frame" },
  { v: "full", label: "Full", title: "Redraw a full box frame" },
  { v: "half", label: "Half", title: "Redraw a half (L) frame: left + bottom" },
  { v: "none", label: "None", title: "Hide the frame" }
];

export function AxisPanel() {
  const panelCount = useStore((s) => s.panels.length);
  const axisFrame = useStore((s) => s.axisFrame);
  const setAxisFrame = useStore((s) => s.setAxisFrame);
  const setTickDirection = useStore((s) => s.setTickDirection);
  const tickVisX = useStore((s) => s.tickVisX);
  const tickVisY = useStore((s) => s.tickVisY);
  const setTickVisible = useStore((s) => s.setTickVisible);
  const axisLabelGap = useStore((s) => s.axisLabelGap);
  const setAxisLabelGap = useStore((s) => s.setAxisLabelGap);
  const bgTransparent = useStore((s) => s.bgTransparent);
  const setBackgroundTransparent = useStore((s) => s.setBackgroundTransparent);

  if (!panelCount) return <div className="p-3 text-2xs text-faint">Import an SVG to edit axes.</div>;

  return (
    <div className="p-3">
      <div className="panel-title mb-2">Axes · all panels</div>

      <label className="field-label">Axis frame</label>
      <div className="mb-3 grid grid-cols-4 gap-1">
        {FRAMES.map((f) => (
          <button
            key={f.v}
            title={f.title}
            onClick={() => setAxisFrame(f.v)}
            className={`chip justify-center ${axisFrame === f.v ? "chip-on" : ""}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <label className="field-label">Tick direction</label>
      <div className="mb-3 grid grid-cols-2 gap-1">
        <button className="chip justify-center" onClick={() => setTickDirection("in")} title="Ticks point inward">
          Inward
        </button>
        <button className="chip justify-center" onClick={() => setTickDirection("out")} title="Ticks point outward">
          Outward
        </button>
      </div>

      <label className="field-label">Tick marks</label>
      <div className="mb-3 grid grid-cols-2 gap-1">
        <button
          className={`chip justify-center ${tickVisX ? "chip-on" : ""}`}
          onClick={() => setTickVisible("x", !tickVisX)}
          title="Show / hide X-axis tick marks (all panels)"
        >
          X ticks
        </button>
        <button
          className={`chip justify-center ${tickVisY ? "chip-on" : ""}`}
          onClick={() => setTickVisible("y", !tickVisY)}
          title="Show / hide Y-axis tick marks (all panels)"
        >
          Y ticks
        </button>
      </div>

      <label className="field-label">Axis title gap · {axisLabelGap}px</label>
      <input
        type="range"
        min={4}
        max={64}
        step={1}
        value={axisLabelGap}
        onChange={(e) => setAxisLabelGap(Number(e.target.value))}
        className="mb-3 w-full"
        title="Distance from axis titles to the axis (all panels)"
      />

      <button
        className={`chip w-full justify-center ${bgTransparent ? "chip-on" : ""}`}
        onClick={() => setBackgroundTransparent(!bgTransparent)}
        title="Remove figure backgrounds (make transparent)"
      >
        <Eraser size={13} /> Transparent background
      </button>
    </div>
  );
}
