import { Download } from "lucide-react";

import { useLanguage } from "@/lib/i18n";
import type { ComposerSettings } from "@/lib/types";

export function ExportPanel({
  settings,
  onChange,
  onExport,
  loading,
  error
}: {
  settings: ComposerSettings;
  onChange: (settings: ComposerSettings) => void;
  onExport: () => void;
  loading: boolean;
  error: string | null;
}) {
  const { t } = useLanguage();
  const patch = (updates: Partial<ComposerSettings>) => onChange({ ...settings, ...updates });
  const numericControls: Array<[keyof ComposerSettings, string, string]> = [
    ["font_size", "all font size", "全局字号"],
    ["all_axis_line_width", "all axis line width", "全局坐标轴线宽"],
    ["all_line_width", "all line width", "全局曲线线宽"],
    ["all_tick_width", "all tick width", "全局刻度线宽"],
    ["panel_label_size", "panel label size", "面板标签字号"],
    ["horizontal_gap", "horizontal gap", "水平间距"],
    ["vertical_gap", "vertical gap", "垂直间距"],
    ["outer_margin", "outer margin", "外边距"]
  ];

  return (
    <section className="panel-shell rounded-lg p-4">
      <h2 className="text-base font-semibold">{t("Export", "导出")}</h2>
      <div className="mt-4 grid gap-3">
        <label className="grid gap-1">
          <span className="control-label">{t("output format", "导出格式")}</span>
          <select className="field" value={settings.output_format} onChange={(event) => patch({ output_format: event.target.value as "png" | "pdf" })}>
            <option value="png">PNG</option>
            <option value="pdf">PDF</option>
          </select>
        </label>
        {numericControls.map(([key, enLabel, zhLabel]) => (
          <label key={key} className="grid gap-1">
            <span className="control-label">{t(enLabel, zhLabel)}</span>
            <input
              className="field"
              type="number"
              step="0.5"
              value={settings[key] as number}
              onChange={(event) => patch({ [key]: Number(event.target.value) } as Partial<ComposerSettings>)}
            />
          </label>
        ))}
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.panel_label_bold} onChange={(event) => patch({ panel_label_bold: event.target.checked })} />
          {t("Bold panel labels", "面板标签加粗")}
        </label>
        <button
          type="button"
          onClick={onExport}
          disabled={loading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded bg-ink px-4 text-sm font-semibold text-white transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {loading ? t("Exporting...", "正在导出...") : t("Export figure", "导出整张 Figure")}
        </button>
        {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </div>
    </section>
  );
}
