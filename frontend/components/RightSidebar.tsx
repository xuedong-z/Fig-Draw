"use client";

import { Palette, Star, Type, SlidersHorizontal, Download, Ruler } from "lucide-react";
import { useStore, type RightTab } from "@/lib/store";
import { PalettePanel } from "./panels/PalettePanel";
import { AxisPanel } from "./panels/AxisPanel";
import { EmphasisPanel } from "./panels/EmphasisPanel";
import { TypographyPanel } from "./panels/TypographyPanel";
import { TunePanel } from "./panels/TunePanel";
import { ExportPanel } from "./panels/ExportPanel";

const TABS: { id: RightTab; label: string; icon: typeof Palette }[] = [
  { id: "palette", label: "Color", icon: Palette },
  { id: "axis", label: "Axis", icon: Ruler },
  { id: "type", label: "Type", icon: Type },
  { id: "emphasis", label: "Emphasis", icon: Star },
  { id: "tune", label: "Tune", icon: SlidersHorizontal },
  { id: "export", label: "Export", icon: Download }
];

export function RightSidebar() {
  const rightTab = useStore((s) => s.rightTab);
  const setRightTab = useStore((s) => s.setRightTab);

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-line bg-panel">
      <div className="flex shrink-0 border-b border-line">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = rightTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setRightTab(t.id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-2xs transition-colors duration-100 ease-out ${
                active ? "border-b-2 border-accent text-accent" : "text-muted hover:text-ink"
              }`}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {rightTab === "palette" && <PalettePanel />}
        {rightTab === "axis" && <AxisPanel />}
        {rightTab === "emphasis" && <EmphasisPanel />}
        {rightTab === "type" && <TypographyPanel />}
        {rightTab === "tune" && <TunePanel />}
        {rightTab === "export" && <ExportPanel />}
      </div>
    </aside>
  );
}
