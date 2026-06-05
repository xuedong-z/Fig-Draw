/** Module H — journal page-size presets (mm). */
import type { JournalPreset } from "./types";

export const JOURNAL_PRESETS: JournalPreset[] = [
  { id: "double", name: "Double column · multi-panel (183mm)", widthMm: 183, maxHeightMm: 247 },
  { id: "single", name: "Single column · one figure (89mm)", widthMm: 89, maxHeightMm: 247 },
  { id: "ppt", name: "PowerPoint 16:9 (338mm)", widthMm: 338, maxHeightMm: 190 }
];

export const DPI_OPTIONS = [300, 600, 1200];

export function mmToPx(mm: number, dpi: number): number {
  return Math.round((mm * dpi) / 25.4);
}
