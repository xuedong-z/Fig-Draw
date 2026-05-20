import type { ComposerSettings, JournalPreset } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";

export function JournalPresetSelector({
  presets,
  settings,
  onChange
}: {
  presets: JournalPreset[];
  settings: ComposerSettings;
  onChange: (settings: ComposerSettings) => void;
}) {
  const { t } = useLanguage();
  const patch = (updates: Partial<ComposerSettings>) => onChange({ ...settings, ...updates });

  return (
    <section className="panel-shell rounded-lg p-4">
      <h2 className="text-base font-semibold">{t("Journal & Layout", "期刊与版式")}</h2>
      <div className="mt-4 grid gap-3">
        <label className="grid gap-1">
          <span className="control-label">{t("journal size preset", "期刊尺寸预设")}</span>
          <select
            className="field"
            value={settings.journal_preset_id}
            onChange={(event) => {
              const preset = presets.find((item) => item.id === event.target.value);
              patch({
                journal_preset_id: event.target.value,
                width_mm: preset?.width_mm,
                height_mm: preset?.height_mm,
                dpi: preset?.dpi || settings.dpi,
                font_family: preset?.default_font || settings.font_family,
                font_size: preset?.font_size || settings.font_size,
                panel_label_size: preset?.panel_label_size || settings.panel_label_size
              });
            }}
          >
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="control-label">{t("layout preset", "面板布局预设")}</span>
          <select className="field" value={settings.layout} onChange={(event) => patch({ layout: event.target.value })}>
            <option value="1x1">1 x 1</option>
            <option value="1x2">1 x 2</option>
            <option value="2x2">2 x 2</option>
            <option value="2x3">2 x 3</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1">
            <span className="control-label">{t("width mm", "宽度 mm")}</span>
            <input className="field" type="number" value={settings.width_mm || ""} onChange={(event) => patch({ width_mm: Number(event.target.value) })} />
          </label>
          <label className="grid gap-1">
            <span className="control-label">{t("height mm", "高度 mm")}</span>
            <input className="field" type="number" value={settings.height_mm || ""} onChange={(event) => patch({ height_mm: Number(event.target.value) })} />
          </label>
        </div>
        <label className="grid gap-1">
          <span className="control-label">dpi</span>
          <select className="field" value={settings.dpi} onChange={(event) => patch({ dpi: Number(event.target.value) })}>
            <option value={300}>300 dpi</option>
            <option value={600}>600 dpi</option>
          </select>
        </label>
      </div>
    </section>
  );
}
