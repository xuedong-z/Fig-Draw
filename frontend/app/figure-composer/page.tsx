"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { LanguageToggle } from "@/components/LanguageToggle";
import { ExportPanel } from "@/components/ExportPanel";
import { FigureCanvas } from "@/components/FigureCanvas";
import { JournalPresetSelector } from "@/components/JournalPresetSelector";
import { SavedPlotsPanel } from "@/components/SavedPlotsPanel";
import { defaultComposerSettings } from "@/lib/defaultSettings";
import { exportFigure, fetchJournalPresets, loadSavedPlots } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import type { ComposerSettings, JournalPreset, SavedPlot } from "@/lib/types";

function downloadDataUrl(dataUrl: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export default function FigureComposerPage() {
  const { t } = useLanguage();
  const [savedPlots, setSavedPlots] = useState<SavedPlot[]>([]);
  const [presets, setPresets] = useState<JournalPreset[]>([]);
  const [settings, setSettings] = useState<ComposerSettings>(defaultComposerSettings);
  const [panelAssignments, setPanelAssignments] = useState<Array<string | null>>(["A", "B", "C", "D", null, null]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const panelCount = useMemo(() => {
    const [rows, cols] = settings.layout.split("x").map((item) => Number(item.trim()));
    return rows * cols;
  }, [settings.layout]);

  useEffect(() => {
    setSavedPlots(loadSavedPlots());
    fetchJournalPresets()
      .then((items) => {
        setPresets(items);
        const preset = items.find((item) => item.id === defaultComposerSettings.journal_preset_id);
        if (preset) {
          setSettings((current) => ({
            ...current,
            width_mm: preset.width_mm,
            height_mm: preset.height_mm,
            dpi: preset.dpi,
            font_family: preset.default_font,
            font_size: preset.font_size,
            panel_label_size: preset.panel_label_size
          }));
        }
      })
      .catch((error: Error) => setExportError(error.message));
  }, []);

  useEffect(() => {
    setPanelAssignments((current) => {
      const next = current.slice(0, panelCount);
      while (next.length < panelCount) next.push(null);
      return next;
    });
  }, [panelCount]);

  function assignPanel(index: number, slot: string) {
    setPanelAssignments((current) => {
      const next = [...current];
      next[index] = slot || null;
      return next;
    });
  }

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      const panels = panelAssignments.slice(0, panelCount).map((slot) => {
        const plot = savedPlots.find((item) => item.slot === slot);
        return plot ? { label: plot.slot, image: plot.image } : null;
      });
      const response = await exportFigure({ panels, settings });
      downloadDataUrl(response.file, `scientific-figure.${settings.output_format}`);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : t("Figure export failed.", "Figure 导出失败。"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper px-5 py-6">
      <header className="mx-auto mb-5 flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div>
          <p className="control-label">Scientific Figure Studio</p>
          <h1 className="text-3xl font-semibold">{t("Figure Composer", "Figure 排版器")}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LanguageToggle />
          <Link href="/plot-studio" className="inline-flex h-10 items-center gap-2 rounded bg-ink px-4 text-sm font-semibold text-white hover:bg-accent">
            <ArrowLeft className="h-4 w-4" /> {t("Plot Studio", "图表工作室")}
          </Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-4 xl:grid-cols-[310px_minmax(0,1fr)_310px]">
        <div className="grid content-start gap-4">
          <SavedPlotsPanel savedPlots={savedPlots} canSave={false} onSave={() => undefined} onRefresh={() => setSavedPlots(loadSavedPlots())} />
          <JournalPresetSelector presets={presets} settings={settings} onChange={setSettings} />
        </div>
        <FigureCanvas settings={settings} panelAssignments={panelAssignments} savedPlots={savedPlots} onAssign={assignPanel} />
        <ExportPanel settings={settings} onChange={setSettings} onExport={handleExport} loading={exporting} error={exportError} />
      </div>
    </main>
  );
}
