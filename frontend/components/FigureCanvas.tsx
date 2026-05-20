import type { ComposerSettings, SavedPlot } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";

export function FigureCanvas({
  settings,
  panelAssignments,
  savedPlots,
  onAssign
}: {
  settings: ComposerSettings;
  panelAssignments: Array<string | null>;
  savedPlots: SavedPlot[];
  onAssign: (index: number, slot: string) => void;
}) {
  const [rows, cols] = settings.layout.split("x").map((value) => Number(value.trim()));
  const panelCount = rows * cols;
  const panels = Array.from({ length: panelCount });
  const { t } = useLanguage();

  return (
    <section className="panel-shell rounded-lg bg-[#EFEFEA] p-6">
      <div className="mx-auto max-w-5xl bg-white px-8 py-7 shadow-soft">
        <div className="rounded bg-slate-100 px-4 py-5 text-sm leading-6 text-slate-400">
          {t(
            "Article text placeholder. Results are discussed here with surrounding manuscript context.",
            "论文正文占位区域。这里模拟 Figure 上方的文章结果与讨论段落。"
          )}
        </div>
        <div
          className="my-6 grid bg-white"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap: `${settings.vertical_gap}px ${settings.horizontal_gap}px`,
            padding: settings.outer_margin
          }}
        >
          {panels.map((_, index) => {
            const slot = panelAssignments[index];
            const plot = savedPlots.find((item) => item.slot === slot);
            return (
              <div key={index} className="relative min-h-[220px] border border-dashed border-rule bg-white p-4">
                <span
                  className="absolute left-2 top-1 font-semibold"
                  style={{ fontFamily: settings.font_family, fontSize: settings.panel_label_size }}
                >
                  {String.fromCharCode(97 + index)}
                </span>
                <select
                  className="field mb-3 ml-5 max-w-[150px]"
                  value={slot || ""}
                  onChange={(event) => onAssign(index, event.target.value)}
                >
                  <option value="">{t("Select plot", "选择图表")}</option>
                  {savedPlots.map((item) => (
                    <option key={item.slot} value={item.slot}>
                      {t("Plot", "图")} {item.slot}
                    </option>
                  ))}
                </select>
                {plot ? (
                  <img src={plot.image} alt={`Panel ${index + 1}`} className="h-[190px] w-full object-contain" />
                ) : (
                  <div className="flex h-[190px] items-center justify-center text-sm text-slate-400">{t("Empty panel", "空面板")}</div>
                )}
              </div>
            );
          })}
        </div>
        <div className="rounded bg-slate-100 px-4 py-5 text-sm leading-6 text-slate-400">
          {t(
            "Article text placeholder. Figure caption and subsequent discussion continue below.",
            "论文正文占位区域。这里模拟 Figure caption 和下方继续展开的讨论内容。"
          )}
        </div>
      </div>
    </section>
  );
}
