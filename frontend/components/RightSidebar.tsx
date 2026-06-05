"use client";

import { LineChart, Tag, Type, SlidersHorizontal, Download, Ruler } from "lucide-react";
import { useStore, type RightTab } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { AxisPanel } from "./panels/AxisPanel";
import { ContentPanel } from "./panels/ContentPanel";
import { LegendPanel } from "./panels/LegendPanel";
import { TypographyPanel } from "./panels/TypographyPanel";
import { TunePanel } from "./panels/TunePanel";
import { ExportPanel } from "./panels/ExportPanel";

/** Tabs are organized BY EDIT-TARGET (object): Axis · Content(data) · Legend ·
 * Typography · Tune(any element, fall-back) · Export. */
const TABS: { id: RightTab; tkey: string; icon: typeof Ruler }[] = [
  { id: "axis", tkey: "tab.axis", icon: Ruler },
  { id: "content", tkey: "tab.content", icon: LineChart },
  { id: "legend", tkey: "tab.legend", icon: Tag },
  { id: "type", tkey: "tab.type", icon: Type },
  { id: "tune", tkey: "tab.tune", icon: SlidersHorizontal },
  { id: "export", tkey: "tab.export", icon: Download }
];

export function RightSidebar() {
  const rightTab = useStore((s) => s.rightTab);
  const setRightTab = useStore((s) => s.setRightTab);
  const t = useT();

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-line bg-panel" data-tour="tabs">
      <div className="flex shrink-0 border-b border-line">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = rightTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setRightTab(tab.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-2xs transition-colors duration-100 ease-out ${
                active ? "border-b-2 border-accent text-accent" : "text-muted hover:text-ink"
              }`}
            >
              <Icon size={15} />
              {t(tab.tkey)}
            </button>
          );
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {rightTab === "axis" && <AxisPanel />}
        {rightTab === "content" && <ContentPanel />}
        {rightTab === "legend" && <LegendPanel />}
        {rightTab === "type" && <TypographyPanel />}
        {rightTab === "tune" && <TunePanel />}
        {rightTab === "export" && <ExportPanel />}
      </div>
    </aside>
  );
}
