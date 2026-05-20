import type { StyleSettings } from "@/lib/types";

type Props = {
  style: StyleSettings;
  onChange: (style: StyleSettings) => void;
};

function numberValue(value: number | null | undefined) {
  return value ?? "";
}

export function StyleControlPanel({ style, onChange }: Props) {
  const patch = (updates: Partial<StyleSettings>) => onChange({ ...style, ...updates });

  return (
    <section className="panel-shell rounded-lg p-4">
      <h2 className="text-base font-semibold">Style Control</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="grid gap-1">
          <span className="control-label">figure width (in)</span>
          <input className="field" type="number" step="0.1" value={style.figure_width ?? ""} onChange={(event) => patch({ figure_width: Number(event.target.value) })} />
        </label>
        <label className="grid gap-1">
          <span className="control-label">figure height (in)</span>
          <input className="field" type="number" step="0.1" value={style.figure_height ?? ""} onChange={(event) => patch({ figure_height: Number(event.target.value) })} />
        </label>
        <label className="grid gap-1">
          <span className="control-label">font family</span>
          <select className="field" value={style.font_family} onChange={(event) => patch({ font_family: event.target.value })}>
            <option>Arial</option>
            <option>Helvetica</option>
            <option>Times New Roman</option>
            <option>DejaVu Sans</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="control-label">palette</span>
          <select className="field" value={style.color_palette} onChange={(event) => patch({ color_palette: event.target.value })}>
            <option value="nature">Nature</option>
            <option value="battery">Battery</option>
            <option value="electrochem">Electrochemistry</option>
            <option value="mono">Monochrome</option>
          </select>
        </label>
        {[
          ["font_size", "font size"],
          ["axis_label_size", "axis label size"],
          ["tick_size", "tick font size"],
          ["line_width", "line width"],
          ["marker_size", "marker size"],
          ["axis_line_width", "axis line width"],
          ["tick_width", "tick width"]
        ].map(([key, label]) => (
          <label key={key} className="grid gap-1">
            <span className="control-label">{label}</span>
            <input
              className="field"
              type="number"
              step="0.1"
              value={style[key as keyof StyleSettings] as number}
              onChange={(event) => patch({ [key]: Number(event.target.value) } as Partial<StyleSettings>)}
            />
          </label>
        ))}
        <label className="grid gap-1">
          <span className="control-label">legend position</span>
          <select className="field" value={style.legend_position} onChange={(event) => patch({ legend_position: event.target.value })}>
            <option value="best">Best</option>
            <option value="upper right">Upper right</option>
            <option value="upper left">Upper left</option>
            <option value="lower right">Lower right</option>
            <option value="lower left">Lower left</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="control-label">x label</span>
          <input className="field" value={style.x_label || ""} onChange={(event) => patch({ x_label: event.target.value })} />
        </label>
        <label className="grid gap-1">
          <span className="control-label">y label</span>
          <input className="field" value={style.y_label || ""} onChange={(event) => patch({ y_label: event.target.value })} />
        </label>
        <label className="grid gap-1">
          <span className="control-label">second y label</span>
          <input className="field" value={style.second_y_label || ""} onChange={(event) => patch({ second_y_label: event.target.value })} />
        </label>
        <label className="grid gap-1">
          <span className="control-label">title</span>
          <input className="field" value={style.title || ""} onChange={(event) => patch({ title: event.target.value })} />
        </label>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {[
          ["x_min", "x min", 0],
          ["x_max", "x max", 1],
          ["y_min", "y min", 0],
          ["y_max", "y max", 1]
        ].map(([key, label, index]) => {
          const rangeKey = key.toString().startsWith("x") ? "x_range" : "y_range";
          const range = style[rangeKey] || [null, null];
          return (
            <label key={key} className="grid gap-1">
              <span className="control-label">{label}</span>
              <input
                className="field"
                type="number"
                value={numberValue(range[index as number])}
                onChange={(event) => {
                  const next = [...range] as [number | null, number | null];
                  next[index as number] = event.target.value === "" ? null : Number(event.target.value);
                  patch({ [rangeKey]: next } as Partial<StyleSettings>);
                }}
              />
            </label>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={style.show_grid} onChange={(event) => patch({ show_grid: event.target.checked })} />
          Show grid
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={style.show_legend} onChange={(event) => patch({ show_legend: event.target.checked })} />
          Show legend
        </label>
      </div>
    </section>
  );
}
