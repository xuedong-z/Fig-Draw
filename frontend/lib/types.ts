export type PlotType = "line" | "scatter" | "bar" | "long_cycling" | "cv_curve" | "nyquist";

export type UploadedDataset = {
  dataset_id: string;
  filename: string;
  extension: string;
  columns: string[];
  preview: Record<string, unknown>[];
  rows?: Record<string, unknown>[];
  row_count: number;
};

export type DataMapping = {
  x?: string;
  y?: string;
  group?: string;
  error?: string;
  second_y?: string;
};

export type SemanticField = {
  key: string;
  label: string;
  type: "numeric" | "categorical";
  aliases: string[];
};

export type QuickControlSettings = {
  show_ce: boolean;
  show_markers: boolean;
  legend_position: string;
  palette: string;
  normalize_retention: boolean;
  show_retention_annotation: boolean;
};

export type SemanticStyleOverrides = {
  x_label?: string;
  left_y_label?: string;
  right_y_label?: string;
  title?: string;
  line_width?: number;
  marker_size?: number;
  font_size?: number;
  axis_label_size?: number;
  tick_size?: number;
  axis_line_width?: number;
  tick_width?: number;
  figure_width?: number;
  figure_height?: number;
  x_range?: [number | null, number | null];
  left_y_range?: [number | null, number | null];
  right_y_range?: [number | null, number | null];
  dpi?: number;
};

export type StyleSettings = {
  figure_width?: number;
  figure_height?: number;
  font_family: string;
  font_size: number;
  axis_label_size: number;
  tick_size: number;
  line_width: number;
  marker_size: number;
  axis_line_width: number;
  tick_width: number;
  color_palette: string;
  legend_position: string;
  x_label?: string;
  y_label?: string;
  second_y_label?: string;
  title?: string;
  x_range?: [number | null, number | null];
  y_range?: [number | null, number | null];
  show_grid: boolean;
  show_legend: boolean;
};

export type ReferenceTemplate = {
  id: string;
  name: string;
  category: string;
  chart_type?: PlotType;
  figure_type?: string;
  description: string;
  best_use_case?: string;
  required_fields?: string[];
  optional_fields?: string[];
  required_semantic_fields?: SemanticField[];
  optional_semantic_fields?: SemanticField[];
  default_column_aliases?: Record<string, string[]>;
  chart_structure?: Record<string, unknown>;
  plot_layers?: Array<Record<string, unknown>>;
  default_labels?: Record<string, string>;
  example_rows?: Record<string, string | number>[];
  reference_image_workflow?: Record<string, string>;
  layout_analysis?: Record<string, string>;
  finalized_layout?: Record<string, string | number>;
  style?: Record<string, unknown>;
  layout?: Record<string, number>;
  style_preset?: Record<string, unknown>;
  layout_preset?: Record<string, number>;
  quick_controls?: string[];
  advanced_controls?: string[];
};

export type JournalPreset = {
  id: string;
  name: string;
  width_mm: number;
  height_mm?: number;
  default_font: string;
  font_size: number;
  panel_label_size: number;
  line_width: number;
  dpi: number;
};

export type SavedPlot = {
  slot: "A" | "B" | "C" | "D";
  image: string;
  mapping: DataMapping;
  plot_type: PlotType;
  template_id: string;
  template_name: string;
  style: StyleSettings;
  saved_at: string;
};

export type ComposerSettings = {
  layout: string;
  journal_preset_id: string;
  width_mm?: number;
  height_mm?: number;
  dpi: number;
  font_family: string;
  font_size: number;
  panel_label_size: number;
  panel_label_bold: boolean;
  panel_label_position: string;
  all_axis_line_width?: number;
  all_line_width?: number;
  all_tick_width?: number;
  horizontal_gap: number;
  vertical_gap: number;
  outer_margin: number;
  output_format: "png" | "pdf";
};
