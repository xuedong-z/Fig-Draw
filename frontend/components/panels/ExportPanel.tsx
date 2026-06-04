"use client";

import { useState } from "react";
import { Download, FileImage, FileCode2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { JOURNAL_PRESETS, DPI_OPTIONS, mmToPx } from "@/lib/journals";
import {
  figureBounds,
  buildFigureSvg,
  exportPng,
  exportSvgFile,
  exportFilename
} from "@/lib/export";

export function ExportPanel() {
  const t = useT();
  const panels = useStore((s) => s.panels);
  const labelStyle = useStore((s) => s.labelStyle);
  const exportSettings = useStore((s) => s.exportSettings);
  const setExport = useStore((s) => s.setExport);
  const pageWidthMm = useStore((s) => s.pageWidthMm);
  const setPageWidthMm = useStore((s) => s.setPageWidthMm);
  const [busy, setBusy] = useState(false);

  const { w: fw, h: fh } = figureBounds(panels);
  const widthMm = exportSettings.widthMm;
  const heightMm = (widthMm * fh) / fw;
  const pxW = mmToPx(widthMm, exportSettings.dpi);
  const pxH = Math.round((pxW * fh) / fw);
  const hasPanels = panels.length > 0;
  const isPng = exportSettings.format === "png";

  const setWidth = (mm: number) => {
    const v = Math.max(20, mm || widthMm);
    setExport({ widthMm: v, heightMm: (v * fh) / fw });
    setPageWidthMm(v);
  };

  const run = async () => {
    if (!hasPanels) return;
    setBusy(true);
    try {
      const build = buildFigureSvg(panels, labelStyle, { transparent: exportSettings.transparent });
      const hMm = (exportSettings.widthMm * build.heightPx) / build.widthPx;
      const fname = exportFilename(exportSettings, hMm);
      if (exportSettings.format === "svg") await exportSvgFile(build, fname);
      else await exportPng(build, exportSettings, fname);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-3">
      <div className="panel-title mb-1">{t("export.title")}</div>
      <p className="mb-3 text-2xs text-faint">{t("export.desc")}</p>

      <label className="field-label">{t("export.journalSize")}</label>
      <select
        className="input-dark mb-3 w-full"
        value={JOURNAL_PRESETS.find((j) => j.widthMm === Math.round(widthMm))?.id ?? "custom"}
        onChange={(e) => {
          const p = JOURNAL_PRESETS.find((j) => j.id === e.target.value);
          if (p && p.id !== "custom") setWidth(p.widthMm);
        }}
      >
        {JOURNAL_PRESETS.map((j) => (
          <option key={j.id} value={j.id}>
            {j.name} ({j.widthMm}mm)
          </option>
        ))}
      </select>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div>
          <label className="field-label">{t("export.widthMm")}</label>
          <input
            type="number"
            className="input-dark w-full"
            value={Math.round(widthMm)}
            min={20}
            max={300}
            onChange={(e) => setWidth(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="field-label">{t("export.heightMm")}</label>
          <input className="input-dark w-full opacity-60" value={heightMm.toFixed(1)} readOnly />
        </div>
      </div>

      <label className="field-label">{t("export.format")}</label>
      <div className="mb-3 grid grid-cols-2 gap-1">
        <button
          onClick={() => setExport({ format: "png" })}
          className={`flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs ${
            isPng ? "bg-accent text-white" : "bg-elevated text-muted ring-1 ring-line hover:text-ink"
          }`}
        >
          <FileImage size={14} /> PNG
        </button>
        <button
          onClick={() => setExport({ format: "svg" })}
          className={`flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs ${
            !isPng ? "bg-accent text-white" : "bg-elevated text-muted ring-1 ring-line hover:text-ink"
          }`}
        >
          <FileCode2 size={14} /> SVG
        </button>
      </div>

      {isPng && (
        <>
          <label className="field-label">{t("export.resolution")}</label>
          <div className="mb-3 grid grid-cols-3 gap-1">
            {DPI_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setExport({ dpi: d })}
                className={`rounded px-1 py-1.5 text-2xs ${
                  exportSettings.dpi === d
                    ? "bg-accent text-white"
                    : "bg-elevated text-muted ring-1 ring-line hover:text-ink"
                }`}
              >
                {d} dpi
              </button>
            ))}
          </div>
          <label className="mb-3 flex items-center gap-2 text-2xs text-muted">
            <input
              type="checkbox"
              checked={exportSettings.transparent}
              onChange={(e) => setExport({ transparent: e.target.checked })}
            />
            {t("axis.transparentBg")}
          </label>
        </>
      )}

      <div className="mb-3 rounded-md border border-line bg-elevated px-2 py-1.5 text-2xs text-muted">
        {t("export.output")} <span className="text-ink">{isPng ? `${pxW} × ${pxH} px` : t("export.vector")}</span>
        <span className="text-faint"> · {widthMm.toFixed(0)}×{heightMm.toFixed(0)} mm</span>
      </div>

      <button
        className="tool-btn tool-btn-primary w-full justify-center"
        onClick={run}
        disabled={!hasPanels || busy}
      >
        <Download size={14} /> {busy ? t("export.rendering") : t("export.exportBtn", { fmt: exportSettings.format.toUpperCase() })}
      </button>
      {!hasPanels && (
        <div className="mt-2 text-center text-2xs text-faint">{t("export.needPanel")}</div>
      )}
    </div>
  );
}
