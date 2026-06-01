"use client";

import {
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
  Crop,
  Maximize2,
  type LucideIcon
} from "lucide-react";
import { useStore, type AlignKind } from "@/lib/store";

const ALIGN: { kind: AlignKind; icon: LucideIcon; title: string }[] = [
  { kind: "left", icon: AlignStartVertical, title: "Align left" },
  { kind: "hcenter", icon: AlignCenterVertical, title: "Align horizontal centers" },
  { kind: "right", icon: AlignEndVertical, title: "Align right" },
  { kind: "top", icon: AlignStartHorizontal, title: "Align top" },
  { kind: "vcenter", icon: AlignCenterHorizontal, title: "Align vertical centers" },
  { kind: "bottom", icon: AlignEndHorizontal, title: "Align bottom" }
];

export function AlignToolbar() {
  const selectedPanelIds = useStore((s) => s.selectedPanelIds);
  const alignPanels = useStore((s) => s.alignPanels);
  const distributePanels = useStore((s) => s.distributePanels);
  const cropSelected = useStore((s) => s.cropSelected);
  const matchSizeSelected = useStore((s) => s.matchSizeSelected);

  if (selectedPanelIds.length < 2) return null;
  const canDistribute = selectedPanelIds.length >= 3;

  return (
    <div className="absolute right-3 top-3 z-30 flex items-center gap-0.5 rounded-md border border-line bg-panel/95 p-1 shadow-pop backdrop-blur">
      <span className="px-1 text-2xs text-faint">{selectedPanelIds.length} sel</span>
      {ALIGN.map(({ kind, icon: Icon, title }) => (
        <button
          key={kind}
          title={title}
          onClick={() => alignPanels(kind)}
          className="rounded p-1 text-muted hover:bg-hover hover:text-ink"
        >
          <Icon size={15} />
        </button>
      ))}
      <span className="mx-0.5 h-4 w-px bg-line" />
      <button
        title="Distribute horizontally"
        disabled={!canDistribute}
        onClick={() => distributePanels("h")}
        className="rounded p-1 text-muted hover:bg-hover hover:text-ink disabled:opacity-30"
      >
        <AlignHorizontalDistributeCenter size={15} />
      </button>
      <button
        title="Distribute vertically"
        disabled={!canDistribute}
        onClick={() => distributePanels("v")}
        className="rounded p-1 text-muted hover:bg-hover hover:text-ink disabled:opacity-30"
      >
        <AlignVerticalDistributeCenter size={15} />
      </button>
      <span className="mx-0.5 h-4 w-px bg-line" />
      <button
        title="Auto-crop whitespace on all selected panels"
        onClick={cropSelected}
        className="rounded p-1 text-muted hover:bg-hover hover:text-ink"
      >
        <Crop size={15} />
      </button>
      <button
        title="Match all selected panels to the first one's size"
        onClick={matchSizeSelected}
        className="rounded p-1 text-muted hover:bg-hover hover:text-ink"
      >
        <Maximize2 size={15} />
      </button>
    </div>
  );
}
