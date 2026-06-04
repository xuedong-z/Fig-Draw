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
import { useT } from "@/lib/i18n";

const ALIGN: { kind: AlignKind; icon: LucideIcon; tkey: string }[] = [
  { kind: "left", icon: AlignStartVertical, tkey: "tip.align.left" },
  { kind: "hcenter", icon: AlignCenterVertical, tkey: "tip.align.hcenter" },
  { kind: "right", icon: AlignEndVertical, tkey: "tip.align.right" },
  { kind: "top", icon: AlignStartHorizontal, tkey: "tip.align.top" },
  { kind: "vcenter", icon: AlignCenterHorizontal, tkey: "tip.align.vcenter" },
  { kind: "bottom", icon: AlignEndHorizontal, tkey: "tip.align.bottom" }
];

export function AlignToolbar() {
  const t = useT();
  const selectedPanelIds = useStore((s) => s.selectedPanelIds);
  const alignPanels = useStore((s) => s.alignPanels);
  const distributePanels = useStore((s) => s.distributePanels);
  const cropSelected = useStore((s) => s.cropSelected);
  const matchSizeSelected = useStore((s) => s.matchSizeSelected);

  if (selectedPanelIds.length < 2) return null;
  const canDistribute = selectedPanelIds.length >= 3;

  return (
    <div className="absolute right-3 top-3 z-30 flex items-center gap-0.5 rounded-md border border-line bg-panel/95 p-1 shadow-pop backdrop-blur">
      <span className="px-1 text-2xs text-faint">{selectedPanelIds.length} {t("align.sel")}</span>
      {ALIGN.map(({ kind, icon: Icon, tkey }) => (
        <button
          key={kind}
          title={t(tkey)}
          onClick={() => alignPanels(kind)}
          className="rounded p-1 text-muted hover:bg-hover hover:text-ink"
        >
          <Icon size={15} />
        </button>
      ))}
      <span className="mx-0.5 h-4 w-px bg-line" />
      <button
        title={t("tip.dist.h")}
        disabled={!canDistribute}
        onClick={() => distributePanels("h")}
        className="rounded p-1 text-muted hover:bg-hover hover:text-ink disabled:opacity-30"
      >
        <AlignHorizontalDistributeCenter size={15} />
      </button>
      <button
        title={t("tip.dist.v")}
        disabled={!canDistribute}
        onClick={() => distributePanels("v")}
        className="rounded p-1 text-muted hover:bg-hover hover:text-ink disabled:opacity-30"
      >
        <AlignVerticalDistributeCenter size={15} />
      </button>
      <span className="mx-0.5 h-4 w-px bg-line" />
      <button
        title={t("tip.cropSel")}
        onClick={cropSelected}
        className="rounded p-1 text-muted hover:bg-hover hover:text-ink"
      >
        <Crop size={15} />
      </button>
      <button
        title={t("tip.matchSize")}
        onClick={matchSizeSelected}
        className="rounded p-1 text-muted hover:bg-hover hover:text-ink"
      >
        <Maximize2 size={15} />
      </button>
    </div>
  );
}
