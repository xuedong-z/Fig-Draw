import { Save } from "lucide-react";

import { savedPlotSlots } from "@/lib/defaultSettings";
import { useLanguage } from "@/lib/i18n";
import type { SavedPlot } from "@/lib/types";

export function SavedPlotsPanel({
  savedPlots,
  canSave,
  onSave,
  onRefresh
}: {
  savedPlots: SavedPlot[];
  canSave: boolean;
  onSave: (slot: "A" | "B" | "C" | "D") => void;
  onRefresh?: () => void;
}) {
  const { t } = useLanguage();

  return (
    <section className="panel-shell rounded-lg p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">{t("Saved Plots", "已保存图表")}</h2>
        {onRefresh && (
          <button className="text-xs font-semibold text-accent" type="button" onClick={onRefresh}>
            {t("Refresh", "刷新")}
          </button>
        )}
      </div>
      <div className="grid gap-3">
        {savedPlotSlots.map((slot) => {
          const plot = savedPlots.find((item) => item.slot === slot);
          return (
            <div key={slot} className="rounded border border-rule bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">{t("Plot", "图")} {slot}</span>
                {onSave && (
                  <button
                    type="button"
                    disabled={!canSave}
                    onClick={() => onSave(slot)}
                    className="inline-flex h-8 items-center gap-1 rounded border border-rule px-2 text-xs font-semibold text-ink transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {t("Save", "保存")}
                  </button>
                )}
              </div>
              {plot ? (
                <div>
                  <img src={plot.image} alt={`Saved Plot ${slot}`} className="max-h-28 w-full object-contain" />
                  <p className="mt-2 text-xs text-slate-500">{plot.template_name}</p>
                </div>
              ) : (
                <p className="text-xs text-slate-500">{t("Empty slot", "空槽位")}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
