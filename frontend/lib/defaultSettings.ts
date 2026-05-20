import type { ComposerSettings, PlotType, StyleSettings } from "./types";

export const plotTypes: { id: PlotType; label: string }[] = [
  { id: "line", label: "Line plot" },
  { id: "scatter", label: "Scatter plot" },
  { id: "bar", label: "Bar plot" },
  { id: "long_cycling", label: "Long cycling plot" },
  { id: "cv_curve", label: "CV curve" },
  { id: "nyquist", label: "Nyquist plot" }
];

export const defaultStyleSettings: StyleSettings = {
  figure_width: 3.5,
  figure_height: 2.55,
  font_family: "Arial",
  font_size: 8,
  axis_label_size: 8,
  tick_size: 7,
  line_width: 1,
  marker_size: 3,
  axis_line_width: 0.8,
  tick_width: 0.8,
  color_palette: "nature",
  legend_position: "best",
  x_label: "",
  y_label: "",
  second_y_label: "",
  title: "",
  x_range: [null, null],
  y_range: [null, null],
  show_grid: false,
  show_legend: true
};

export const defaultComposerSettings: ComposerSettings = {
  layout: "2x2",
  journal_preset_id: "nature_double",
  dpi: 300,
  font_family: "Arial",
  font_size: 8,
  panel_label_size: 10,
  panel_label_bold: true,
  panel_label_position: "top-left",
  all_axis_line_width: 0.8,
  all_line_width: 1,
  all_tick_width: 0.8,
  horizontal_gap: 6,
  vertical_gap: 6,
  outer_margin: 8,
  output_format: "png"
};

export const savedPlotSlots = ["A", "B", "C", "D"] as const;
