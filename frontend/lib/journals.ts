/** Module H — journal page-size presets (mm). */
import type { JournalPreset } from "./types";

export const JOURNAL_PRESETS: JournalPreset[] = [
  { id: "nature-single", name: "Nature single column", widthMm: 89, maxHeightMm: 247 },
  { id: "nature-double", name: "Nature double column", widthMm: 183, maxHeightMm: 247 },
  { id: "nature-1.5", name: "Nature 1.5 column", widthMm: 120, maxHeightMm: 247 },
  { id: "science-single", name: "Science single column", widthMm: 55, maxHeightMm: 240 },
  { id: "science-double", name: "Science double column", widthMm: 121, maxHeightMm: 240 },
  { id: "custom", name: "Custom (mm)", widthMm: 120, maxHeightMm: 247 }
];

export const DPI_OPTIONS = [300, 600, 1200];

export function mmToPx(mm: number, dpi: number): number {
  return Math.round((mm * dpi) / 25.4);
}
