"use client";

import { Trash2, ChevronUp, ChevronDown, Grid3x3, Magnet, Crop, Lock, Unlock } from "lucide-react";
import { useStore, FIG_PX_PER_MM } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { JOURNAL_PRESETS } from "@/lib/journals";

// Grid presets — `cols` drives the arrangement; rows follow from the panel count.
const GRIDS: { label: string; cols: number }[] = [
  { label: "2×2", cols: 2 },
  { label: "3×2", cols: 3 },
  { label: "3×3", cols: 3 },
  { label: "4×2", cols: 4 }
];

export function LeftSidebar() {
  const t = useT();
  const panels = useStore((s) => s.panels);
  const selectedPanelId = useStore((s) => s.selectedPanelId);
  const selectPanel = useStore((s) => s.selectPanel);
  const removePanel = useStore((s) => s.removePanel);
  const reorderPanels = useStore((s) => s.reorderPanels);
  const autoCropPanel = useStore((s) => s.autoCropPanel);
  const pageWidthMm = useStore((s) => s.pageWidthMm);
  const setPageWidthMm = useStore((s) => s.setPageWidthMm);
  const innerPad = useStore((s) => s.innerPad);
  const setInnerPad = useStore((s) => s.setInnerPad);
  const applyGrid = useStore((s) => s.applyGrid);
  const layoutLocked = useStore((s) => s.layoutLocked);
  const setLayoutLocked = useStore((s) => s.setLayoutLocked);
  const gridCols = useStore((s) => s.gridCols);
  const gridGap = useStore((s) => s.gridGap);
  const setGridGap = useStore((s) => s.setGridGap);
  const showGrid = useStore((s) => s.showGrid);
  const snapEnabled = useStore((s) => s.snapEnabled);
  const toggleGrid = useStore((s) => s.toggleGrid);
  const toggleSnap = useStore((s) => s.toggleSnap);
  const updatePanelRect = useStore((s) => s.updatePanelRect);

  const ordered = [...panels].sort((a, b) => a.order - b.order);
  const selectedPanel = panels.find((p) => p.id === selectedPanelId) ?? null;

  const move = (id: string, dir: -1 | 1) => {
    const ids = ordered.map((p) => p.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorderPanels(ids);
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-line bg-panel" data-tour="layout">
      {/* Page & layout */}
      <div className="border-b border-line p-3">
        <div className="panel-title mb-2">{t("sec.page")}</div>
        <label className="field-label">{t("page.width")}</label>
        <select
          className="input-dark mb-2 w-full"
          value={JOURNAL_PRESETS.find((j) => j.widthMm === pageWidthMm)?.id ?? "custom"}
          onChange={(e) => {
            const preset = JOURNAL_PRESETS.find((j) => j.id === e.target.value);
            if (preset && preset.id !== "custom") setPageWidthMm(preset.widthMm);
          }}
        >
          {JOURNAL_PRESETS.map((j) => (
            <option key={j.id} value={j.id}>
              {j.name} ({j.widthMm}mm)
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="input-dark w-20"
            value={Math.round(pageWidthMm)}
            min={40}
            max={300}
            onChange={(e) => setPageWidthMm(Number(e.target.value) || pageWidthMm)}
          />
          <span className="text-2xs text-faint">{t("page.mmWide")}</span>
        </div>

        <div className="panel-title mb-2 mt-4 border-t border-line pt-3">{t("sec.arrange")}</div>
        <label className="field-label">{t("arrange.grid")}</label>
        <div className="grid grid-cols-4 gap-1">
          {GRIDS.map((G) => (
            <button
              key={G.label}
              className="chip justify-center"
              onClick={() => applyGrid(G.cols)}
              title={t("tip.gridArrange", { n: G.cols })}
            >
              {G.label}
            </button>
          ))}
        </div>
        <button
          className={`chip mt-1 w-full justify-center gap-1 ${layoutLocked ? "chip-on" : ""}`}
          onClick={() => setLayoutLocked(!layoutLocked)}
          title={layoutLocked ? t("tip.layoutLocked") : t("tip.layoutFree")}
        >
          {layoutLocked ? <Lock size={12} /> : <Unlock size={12} />}
          {layoutLocked ? t("layout.locked") : t("layout.free")}
        </button>
        {gridCols > 0 && (
          <div className="mt-1 flex items-center gap-2">
            <span className="text-2xs text-faint">{t("arrange.gap")}</span>
            <input
              type="range"
              min={0}
              max={48}
              step={1}
              value={gridGap}
              onChange={(e) => setGridGap(Number(e.target.value))}
              className="flex-1"
              title={t("tip.gap")}
            />
            <span className="w-9 text-right text-2xs text-faint">{gridGap}px</span>
          </div>
        )}

        <label className="field-label mt-3">{t("panel.innerPad")}</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={60}
            step={1}
            value={innerPad}
            onChange={(e) => setInnerPad(Number(e.target.value))}
            className="flex-1"
            title={t("tip.innerPad")}
          />
          <span className="w-9 text-right text-2xs text-faint">{innerPad}px</span>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            className={`chip flex-1 ${showGrid ? "chip-on" : ""}`}
            onClick={toggleGrid}
            title={t("tip.grid")}
          >
            <Grid3x3 size={13} /> {t("act.grid")}
          </button>
          <button
            className={`chip flex-1 ${snapEnabled ? "chip-on" : ""}`}
            onClick={toggleSnap}
            title={t("tip.snap")}
          >
            <Magnet size={13} /> {t("act.snap")}
          </button>
        </div>
      </div>

      {/* Panels */}
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <div className="panel-title mb-2">{t("sec.panels")} · {panels.length}</div>
        {ordered.length === 0 && (
          <div className="text-2xs text-faint">{t("panels.empty")}</div>
        )}
        <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
          {ordered.map((p, i) => {
            const active = p.id === selectedPanelId;
            return (
              <div
                key={p.id}
                onClick={() => selectPanel(p.id)}
                className={`group flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-xs ${
                  active ? "bg-accent/15 text-ink ring-1 ring-accent/40" : "hover:bg-hover text-muted"
                }`}
              >
                <span className="w-5 shrink-0 font-semibold text-ink">{p.label || "—"}</span>
                <span className="flex-1 truncate" title={p.name}>
                  {p.name}
                </span>
                <button
                  className="opacity-60 p-0.5 hover:text-ink hover:opacity-100 disabled:opacity-20"
                  disabled={i === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    move(p.id, -1);
                  }}
                >
                  <ChevronUp size={12} />
                </button>
                <button
                  className="opacity-60 p-0.5 hover:text-ink hover:opacity-100 disabled:opacity-20"
                  disabled={i === ordered.length - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    move(p.id, 1);
                  }}
                >
                  <ChevronDown size={12} />
                </button>
                <button
                  className="opacity-60 p-0.5 hover:text-accent hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    autoCropPanel(p.id);
                  }}
                  title={t("tip.autocropRow")}
                >
                  <Crop size={12} />
                </button>
                <button
                  className="opacity-60 p-0.5 hover:text-bad hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePanel(p.id);
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>

        {selectedPanel && (
          <div className="mt-3 border-t border-line pt-2">
            <div className="field-label mb-1">{t("panels.selSize")} · {selectedPanel.label}</div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                className="input-dark w-14"
                min={5}
                value={Math.round(selectedPanel.w / FIG_PX_PER_MM)}
                onChange={(e) =>
                  updatePanelRect(selectedPanel.id, {
                    x: selectedPanel.x,
                    y: selectedPanel.y,
                    w: Math.max(5, Number(e.target.value)) * FIG_PX_PER_MM,
                    h: selectedPanel.h
                  })
                }
              />
              <span className="text-2xs text-faint">{t("unit.W")}</span>
              <input
                type="number"
                className="input-dark w-14"
                min={5}
                value={Math.round(selectedPanel.h / FIG_PX_PER_MM)}
                onChange={(e) =>
                  updatePanelRect(selectedPanel.id, {
                    x: selectedPanel.x,
                    y: selectedPanel.y,
                    w: selectedPanel.w,
                    h: Math.max(5, Number(e.target.value)) * FIG_PX_PER_MM
                  })
                }
              />
              <span className="text-2xs text-faint">{t("unit.Hmm")}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {([["1:1", 1], ["4:3", 4 / 3], ["3:2", 3 / 2], ["16:9", 16 / 9], ["2:1", 2]] as [string, number][]).map(
                ([label, r]) => (
                  <button
                    key={label}
                    className="chip px-1.5 py-0.5 text-2xs"
                    title={t("tip.aspect", { r: label })}
                    onClick={() =>
                      updatePanelRect(selectedPanel.id, {
                        x: selectedPanel.x,
                        y: selectedPanel.y,
                        w: selectedPanel.w,
                        h: selectedPanel.w / r
                      })
                    }
                  >
                    {label}
                  </button>
                )
              )}
            </div>
            <button
              className="chip mt-1.5 w-full justify-center"
              onClick={() => autoCropPanel(selectedPanel.id)}
              title={t("tip.cropWs")}
            >
              <Crop size={12} /> {t("act.autocropWs")}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
