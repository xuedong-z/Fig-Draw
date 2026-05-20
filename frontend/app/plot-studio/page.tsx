"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronRight,
  ClipboardPaste,
  Copy,
  Download,
  Eraser,
  FlaskConical,
  FolderOpen,
  Maximize2,
  Minus,
  Plus,
  RefreshCw,
  Save,
  Table2,
  Trash2,
  Upload,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ClipboardEvent } from "react";

import { LanguageToggle } from "@/components/LanguageToggle";
import { SavedPlotsPanel } from "@/components/SavedPlotsPanel";
import { defaultStyleSettings } from "@/lib/defaultSettings";
import { fetchReferenceTemplates, generateSemanticPlot, loadSavedPlots, persistSavedPlot, referenceTemplatePreviewUrl, saveEditableDataset, uploadDataset } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import type {
  QuickControlSettings,
  ReferenceTemplate,
  SavedPlot,
  SemanticField,
  SemanticStyleOverrides,
  UploadedDataset
} from "@/lib/types";

type FigureType = {
  id: string;
  label: string;
  labelZh: string;
  description: string;
  descriptionZh: string;
  category: string;
  enabled: boolean;
};

type FigureDiscipline = {
  id: string;
  label: string;
  labelZh: string;
  description: string;
  descriptionZh: string;
  items: FigureType[];
};

const chartDatabase: FigureDiscipline[] = [
  {
    id: "electrochemistry",
    label: "Electrochemistry & Battery",
    labelZh: "\u7535\u5316\u5b66\u4e0e\u7535\u6c60",
    description: "Battery cycling, rate, impedance, CV/GCD, and electrochemical performance figures.",
    descriptionZh: "\u7535\u6c60\u5faa\u73af\u3001\u500d\u7387\u3001\u963b\u6297\u3001CV/GCD \u548c\u7535\u5316\u5b66\u6027\u80fd\u6d4b\u8bd5\u56fe\u3002",
    items: [
      { id: "long_cycling", label: "Long cycling plot", labelZh: "\u957f\u5faa\u73af\u6027\u80fd\u56fe", description: "Capacity retention and CE across cycles.", descriptionZh: "\u5bb9\u91cf\u4fdd\u6301\u7387\u4e0e\u5e93\u4ed1\u6548\u7387\u968f\u5faa\u73af\u5708\u6570\u53d8\u5316\u3002", category: "Battery & Electrochemistry", enabled: true },
      { id: "rate_performance", label: "Rate performance plot", labelZh: "\u500d\u7387\u6027\u80fd\u56fe", description: "Capacity under changing current rates.", descriptionZh: "\u4e0d\u540c\u7535\u6d41\u500d\u7387\u4e0b\u7684\u5bb9\u91cf\u8868\u73b0\u3002", category: "Battery & Electrochemistry", enabled: false },
      { id: "cv_curve", label: "CV curve", labelZh: "CV \u66f2\u7ebf", description: "Cyclic voltammetry overlays.", descriptionZh: "\u5faa\u73af\u4f0f\u5b89\u66f2\u7ebf\u53e0\u52a0\u4e0e\u6bd4\u8f83\u3002", category: "Battery & Electrochemistry", enabled: false },
      { id: "gcd_curve", label: "GCD curve", labelZh: "GCD \u66f2\u7ebf", description: "Galvanostatic charge-discharge profiles.", descriptionZh: "\u6052\u6d41\u5145\u653e\u7535\u7535\u538b\u5e73\u53f0\u66f2\u7ebf\u3002", category: "Battery & Electrochemistry", enabled: false },
      { id: "nyquist", label: "EIS / Nyquist plot", labelZh: "EIS / Nyquist \u56fe", description: "Impedance spectra and semicircles.", descriptionZh: "\u7535\u5316\u5b66\u963b\u6297\u8c31\u4e0e\u534a\u5706\u62df\u5408\u3002", category: "Battery & Electrochemistry", enabled: false },
      { id: "dq_dv", label: "dQ/dV plot", labelZh: "dQ/dV \u56fe", description: "Differential capacity curves.", descriptionZh: "\u5fae\u5206\u5bb9\u91cf\u66f2\u7ebf\u4e0e\u5cf0\u4f4d\u5206\u6790\u3002", category: "Battery & Electrochemistry", enabled: false }
    ]
  },
  {
    id: "biology",
    label: "Biology & Biomedical",
    labelZh: "\u751f\u7269\u4e0e\u533b\u5b66",
    description: "Dose response, survival, fluorescence, flow cytometry, qPCR, and biological assay figures.",
    descriptionZh: "\u5242\u91cf\u54cd\u5e94\u3001\u751f\u5b58\u66f2\u7ebf\u3001\u8367\u5149\u3001\u6d41\u5f0f\u3001qPCR \u548c\u751f\u7269\u5b9e\u9a8c\u56fe\u3002",
    items: [
      { id: "dose_response", label: "Dose-response curve", labelZh: "\u5242\u91cf\u54cd\u5e94\u66f2\u7ebf", description: "IC50/EC50 style biological response curves.", descriptionZh: "IC50/EC50 \u98ce\u683c\u7684\u751f\u7269\u54cd\u5e94\u66f2\u7ebf\u3002", category: "Biology & Biomedical", enabled: false },
      { id: "survival_curve", label: "Kaplan-Meier survival curve", labelZh: "Kaplan-Meier \u751f\u5b58\u66f2\u7ebf", description: "Survival probability with groups and censor marks.", descriptionZh: "\u5206\u7ec4\u751f\u5b58\u7387\u66f2\u7ebf\u4e0e\u5220\u5931\u6807\u8bb0\u3002", category: "Biology & Biomedical", enabled: false },
      { id: "qpcr_bar", label: "qPCR expression plot", labelZh: "qPCR \u8868\u8fbe\u56fe", description: "Relative expression bars with error and significance.", descriptionZh: "\u76f8\u5bf9\u8868\u8fbe\u91cf\u67f1\u72b6\u56fe\u3001\u8bef\u5dee\u548c\u663e\u8457\u6027\u3002", category: "Biology & Biomedical", enabled: false },
      { id: "flow_cytometry", label: "Flow cytometry plot", labelZh: "\u6d41\u5f0f\u7ec6\u80de\u56fe", description: "Gated scatter or fluorescence population plots.", descriptionZh: "\u95e8\u63a7\u6563\u70b9\u56fe\u6216\u8367\u5149\u7fa4\u4f53\u56fe\u3002", category: "Biology & Biomedical", enabled: false }
    ]
  },
  {
    id: "characterization",
    label: "Characterization & Testing",
    labelZh: "\u8868\u5f81\u4e0e\u6d4b\u8bd5",
    description: "Spectroscopy, diffraction, microscopy, materials testing, and instrument characterization plots.",
    descriptionZh: "\u5149\u8c31\u3001\u884d\u5c04\u3001\u663e\u5fae\u3001\u6750\u6599\u6d4b\u8bd5\u4e0e\u4eea\u5668\u8868\u5f81\u56fe\u3002",
    items: [
      { id: "xrd", label: "XRD pattern", labelZh: "XRD \u56fe\u8c31", description: "Stacked or indexed diffraction patterns.", descriptionZh: "\u5806\u53e0\u6216\u6807\u5cf0\u7684 X \u5c04\u7ebf\u884d\u5c04\u56fe\u3002", category: "Spectroscopy", enabled: false },
      { id: "raman", label: "Raman spectrum", labelZh: "Raman \u5149\u8c31", description: "Peak-labeled Raman spectra.", descriptionZh: "\u5e26\u5cf0\u4f4d\u6807\u6ce8\u7684\u62c9\u66fc\u5149\u8c31\u3002", category: "Spectroscopy", enabled: false },
      { id: "xps", label: "XPS spectrum", labelZh: "XPS \u5149\u8c31", description: "Survey and high-resolution fitting.", descriptionZh: "\u5168\u8c31\u4e0e\u9ad8\u5206\u8fa8\u62df\u5408\u56fe\u3002", category: "Spectroscopy", enabled: false },
      { id: "eels", label: "EELS spectrum", labelZh: "EELS \u5149\u8c31", description: "Edge and fine-structure comparison.", descriptionZh: "\u8fb9\u7ed3\u6784\u4e0e\u7cbe\u7ec6\u7ed3\u6784\u6bd4\u8f83\u3002", category: "Spectroscopy", enabled: false },
      { id: "line_profile", label: "Line profile", labelZh: "\u7ebf\u626b\u66f2\u7ebf", description: "Intensity or composition across distance.", descriptionZh: "\u5f3a\u5ea6\u6216\u7ec4\u5206\u968f\u8ddd\u79bb\u53d8\u5316\u3002", category: "Microscopy / Materials", enabled: false },
      { id: "elemental_mapping", label: "Elemental mapping", labelZh: "\u5143\u7d20\u9762\u5206\u5e03", description: "Multi-channel material maps.", descriptionZh: "\u591a\u901a\u9053\u5143\u7d20\u5206\u5e03\u56fe\u3002", category: "Microscopy / Materials", enabled: false },
      { id: "image_scale_bar", label: "Image with scale bar", labelZh: "\u5e26\u6bd4\u4f8b\u5c3a\u56fe\u7247", description: "Image panel with publication scale bar.", descriptionZh: "\u5e26\u6295\u7a3f\u98ce\u683c\u6bd4\u4f8b\u5c3a\u7684\u56fe\u50cf\u9762\u677f\u3002", category: "Microscopy / Materials", enabled: false }
    ]
  },
  {
    id: "general",
    label: "General Scientific Plots",
    labelZh: "\u901a\u7528\u79d1\u7814\u56fe",
    description: "Reusable paper-style line, scatter, bar, box, heatmap, and statistical figure templates.",
    descriptionZh: "\u8bba\u6587\u98ce\u683c\u7684\u6298\u7ebf\u3001\u6563\u70b9\u3001\u67f1\u72b6\u3001\u7bb1\u7ebf\u3001\u70ed\u56fe\u548c\u7edf\u8ba1\u6a21\u677f\u3002",
    items: [
      { id: "line", label: "Line plot", labelZh: "\u6298\u7ebf\u56fe", description: "Clean grouped line plots for general quantitative trends.", descriptionZh: "\u901a\u7528\u5b9a\u91cf\u8d8b\u52bf\u7684\u5206\u7ec4\u6298\u7ebf\u56fe\u3002", category: "General", enabled: false },
      { id: "scatter", label: "Scatter plot", labelZh: "\u6563\u70b9\u56fe", description: "Correlation and calibration figures.", descriptionZh: "\u76f8\u5173\u6027\u548c\u6821\u51c6\u66f2\u7ebf\u56fe\u3002", category: "General", enabled: false },
      { id: "bar", label: "Bar plot", labelZh: "\u67f1\u72b6\u56fe", description: "Grouped bars with error and significance markers.", descriptionZh: "\u5206\u7ec4\u67f1\u72b6\u56fe\u3001\u8bef\u5dee\u548c\u663e\u8457\u6027\u6807\u8bb0\u3002", category: "General", enabled: false },
      { id: "box_violin", label: "Box / violin plot", labelZh: "\u7bb1\u7ebf / \u5c0f\u63d0\u7434\u56fe", description: "Distribution plots for grouped measurements.", descriptionZh: "\u5206\u7ec4\u6d4b\u91cf\u503c\u7684\u5206\u5e03\u56fe\u3002", category: "General", enabled: false },
      { id: "histogram", label: "Histogram", labelZh: "\u76f4\u65b9\u56fe", description: "Particle size or distribution summary.", descriptionZh: "\u7c92\u5f84\u6216\u5206\u5e03\u7edf\u8ba1\u56fe\u3002", category: "General", enabled: false },
      { id: "heatmap", label: "Heatmap", labelZh: "\u70ed\u56fe", description: "Matrix-style intensity or expression maps.", descriptionZh: "\u77e9\u9635\u5f0f\u5f3a\u5ea6\u6216\u8868\u8fbe\u91cf\u56fe\u3002", category: "General", enabled: false }
    ]
  }
];

const defaultQuickControls: QuickControlSettings = {
  show_ce: true,
  show_markers: true,
  legend_position: "upper right",
  palette: "nature_low_saturation",
  normalize_retention: false,
  show_retention_annotation: false
};

const defaultAdvancedControls: SemanticStyleOverrides = {
  x_label: "Cycle number",
  left_y_label: "Specific capacity (mAh g-1)",
  right_y_label: "Coulombic efficiency (%)",
  line_width: 1,
  marker_size: 3,
  font_size: 8,
  axis_label_size: 8,
  tick_size: 7,
  axis_line_width: 0.8,
  tick_width: 0.8,
  figure_width: 89 / 25.4,
  figure_height: 65 / 25.4,
  x_range: [null, null],
  left_y_range: [null, null],
  right_y_range: [null, null],
  dpi: 300
};

const stepLabels = {
  en: [
    "Choose figure type",
    "Choose reference template",
    "Upload and map data",
    "Generate and fine-tune",
    "Save as panel"
  ],
  zh: [
    "\u9009\u62e9\u56fe\u8868\u7c7b\u578b",
    "\u9009\u62e9\u53c2\u8003\u6a21\u677f",
    "\u4e0a\u4f20\u5e76\u6620\u5c04\u6570\u636e",
    "\u751f\u6210\u5e76\u5fae\u8c03\u56fe\u8868",
    "\u4fdd\u5b58\u4e3a\u9762\u677f"
  ]
};

const templateCopyZh: Record<string, { name: string; description: string; bestUseCase: string; analysis?: Record<string, string> }> = {
  battery_long_cycling_nature_dual_axis: {
    name: "\u6295\u7a3f\u56fe\u98ce\u683c\u53cc\u8f74\u957f\u5faa\u73af\u9762\u677f",
    description: "\u9762\u5411\u7535\u5316\u5b66\u6027\u80fd\u6d4b\u8bd5\u7efc\u5408\u56fe\u7684\u957f\u5faa\u73af\u6a21\u677f\uff1a\u5bbd\u5e45\u53cc\u680f\u7248\u5f0f\u3001\u5bb9\u91cf\u8870\u51cf\u66f2\u7ebf\u3001\u63a5\u8fd1 100% \u7684 CE \u66f2\u7ebf\u548c\u8bba\u6587\u5f0f\u6807\u6ce8\u3002",
    bestUseCase: "\u9002\u5408\u628a\u957f\u5faa\u73af\u7a33\u5b9a\u6027\u4f5c\u4e3a\u4e3b\u8981\u7ed3\u679c\u7684\u7535\u6c60\u8bba\u6587\u4e3b\u56fe\u3002",
    analysis: {
      visual_hierarchy: "\u9762\u677f\u6807\u7b7e\u548c\u5750\u6807\u8f74\u9996\u5148\u5efa\u7acb\u8bba\u6587\u591a\u9762\u677f\u8bed\u5883\uff1b\u5bb9\u91cf\u8870\u51cf\u66f2\u7ebf\u662f\u4e3b\u4fe1\u606f\u5c42\uff0cCE \u5728\u56fe\u4e0a\u65b9\u4ee5\u8fd1\u6c34\u5e73\u8d8b\u52bf\u4f5c\u4e3a\u8f85\u52a9\u4fe1\u606f\u3002",
      axis_strategy: "\u5de6 y \u8f74\u4e3a 0-250 mAh g-1\uff0c\u53f3 y \u8f74\u4e3a 0-120% CE\uff0cx \u8f74\u4e3a 0-1000 \u5708\uff0c\u4e3b\u523b\u5ea6\u4fdd\u6301\u7a00\u758f\u3002"
    }
  },
  battery_long_cycling_capacity_retention: {
    name: "\u7535\u6c60\u8bba\u6587\u591a\u6837\u54c1\u5bb9\u91cf\u4fdd\u6301\u7387\u56fe",
    description: "\u5f3a\u8c03\u591a\u4e2a\u6837\u54c1\u5faa\u73af\u5bf9\u6bd4\u548c\u6700\u7ec8\u4fdd\u6301\u7387\u7684\u957f\u5faa\u73af\u6a21\u677f\uff0c\u652f\u6301\u53ef\u9009\u8bef\u5dee\u68d2\u3002",
    bestUseCase: "\u9002\u5408\u6bd4\u8f83\u4e0d\u540c\u7535\u89e3\u6db2\u3001\u5305\u8986\u5c42\u6216\u7535\u6781\u6761\u4ef6\u7684\u5bb9\u91cf\u4fdd\u6301\u8d8b\u52bf\u3002"
  },
  battery_long_cycling_minimal: {
    name: "\u6781\u7b80\u957f\u5faa\u73af\u56fe",
    description: "\u4ec5\u4f7f\u7528\u5bb9\u91cf\u6570\u636e\u7684\u957f\u5faa\u73af\u5bf9\u6bd4\u56fe\uff0c\u98ce\u683c\u514b\u5236\uff0c\u9002\u5408\u5feb\u901f\u5bf9\u6bd4\u6216\u8865\u5145\u56fe\u3002",
    bestUseCase: "\u9002\u5408\u53ea\u6709 cycle\u3001sample\u3001capacity \u4e09\u5217\u6570\u636e\u65f6\u5feb\u901f\u751f\u6210\u8bba\u6587\u98ce\u683c\u56fe\u3002"
  }
};

const semanticFieldZh: Record<string, string> = {
  cycle: "\u5faa\u73af\u5708\u6570",
  sample: "\u6837\u54c1\u540d\u79f0",
  capacity: "\u6bd4\u5bb9\u91cf",
  coulombic_efficiency: "\u5e93\u4ed1\u6548\u7387",
  error: "\u8bef\u5dee",
  retention: "\u5bb9\u91cf\u4fdd\u6301\u7387"
};

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[_\\-\\s()%/]/g, "");
}

function fieldsFor(template: ReferenceTemplate | null) {
  return [...(template?.required_semantic_fields || []), ...(template?.optional_semantic_fields || [])];
}

type EditableRow = Record<string, string | number | null | undefined>;

type LongCyclingSample = {
  id: string;
  name: string;
  rows: EditableRow[];
  sourceFile?: string;
  page: number;
};

const samplePreviewPageSize = 30;
const longCyclingSemanticMapping = {
  cycle: "cycle",
  sample: "sample",
  capacity: "capacity",
  coulombic_efficiency: "coulombic_efficiency"
};

const longCyclingDataColumns = [
  { key: "cycle", label: "Cycle number", labelZh: "循环圈数" },
  { key: "capacity", label: "Capacity", labelZh: "容量 / 比容量" },
  { key: "coulombic_efficiency", label: "Coulombic efficiency", labelZh: "库仑效率" }
] as const;

function createDefaultSamples(): LongCyclingSample[] {
  return ["Sample 1", "Sample 2", "Sample 3"].map((name, index) => ({
    id: `sample-${index + 1}`,
    name,
    rows: [],
    page: 0
  }));
}

function sampleLabel(index: number) {
  return String.fromCharCode(65 + index);
}

function rowsFromDataset(dataset: UploadedDataset): EditableRow[] {
  return ((dataset.rows && dataset.rows.length ? dataset.rows : dataset.preview) || []).map((row) => ({ ...row })) as EditableRow[];
}

function columnsFromRows(rows: EditableRow[], fallback: string[] = []) {
  const columns = new Set<string>(fallback);
  for (const row of rows) {
    Object.keys(row).forEach((column) => columns.add(column));
  }
  return Array.from(columns).filter(Boolean);
}

function pickColumn(columns: string[], aliases: string[], fallbackIndex: number) {
  const normalizedAliases = aliases.map(normalizeName);
  const match = columns.find((column) => {
    const normalizedColumn = normalizeName(column);
    return normalizedAliases.some((alias) => normalizedColumn === alias || normalizedColumn.includes(alias) || alias.includes(normalizedColumn));
  });
  return match || columns[fallbackIndex];
}

function standardizeLongCyclingSampleRows(dataset: UploadedDataset) {
  const rows = rowsFromDataset(dataset);
  const columns = dataset.columns || [];
  const cycleColumn = pickColumn(columns, ["cycle", "cycle number", "cycles", "n", "循环圈数", "循环", "圈数"], 0);
  const capacityColumn = pickColumn(columns, ["capacity", "specific capacity", "discharge capacity", "mah/g", "mah g-1", "容量", "比容量", "放电容量"], 1);
  const ceColumn = pickColumn(columns, ["ce", "coulombic efficiency", "coulombic_efficiency", "efficiency", "库伦效率", "库仑效率", "效率"], 2);
  return rows
    .map((row) => ({
      cycle: row[cycleColumn] ?? "",
      capacity: row[capacityColumn] ?? "",
      coulombic_efficiency: ceColumn ? row[ceColumn] ?? "" : ""
    }))
    .filter((row) => String(row.cycle ?? "").trim() || String(row.capacity ?? "").trim() || String(row.coulombic_efficiency ?? "").trim());
}

function rowsFromSamples(samples: LongCyclingSample[]): EditableRow[] {
  return samples.flatMap((sample, index) =>
    sample.rows.map((row) => ({
      sample: sample.name.trim() || `Sample ${index + 1}`,
      cycle: row.cycle ?? "",
      capacity: row.capacity ?? "",
      coulombic_efficiency: row.coulombic_efficiency ?? ""
    }))
  );
}

function parsePastedTable(text: string) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines.map((line) => (line.includes("\t") ? line.split("\t") : line.split(",")));
}

function emptyLongCyclingRow(): EditableRow {
  return { cycle: "", capacity: "", coulombic_efficiency: "" };
}

function autoMapColumns(template: ReferenceTemplate, columns: string[]) {
  const mapping: Record<string, string | undefined> = {};
  for (const field of fieldsFor(template)) {
    const aliases = [field.key, ...(field.aliases || []), ...((template.default_column_aliases || {})[field.key] || [])].map(normalizeName);
    const match = columns.find((column) => {
      const normalizedColumn = normalizeName(column);
      return aliases.some((alias) => normalizedColumn === alias || normalizedColumn.includes(alias) || alias.includes(normalizedColumn));
    });
    mapping[field.key] = match;
  }
  return mapping;
}

function csvFromRows(rows: Record<string, string | number>[] = []) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => String(row[header] ?? "")).join(","));
  }
  return lines.join("\n");
}

function downloadExampleCsv(template: ReferenceTemplate) {
  const csv = csvFromRows(template.example_rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${template.id}_example.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function styleFromTemplate(template: ReferenceTemplate): SemanticStyleOverrides {
  const style = template.style_preset || {};
  const layout = template.layout_preset || {};
  const tupleRange = (value: unknown): [number | null, number | null] => {
    return Array.isArray(value) && value.length === 2 ? [Number(value[0]), Number(value[1])] : [null, null];
  };
  return {
    ...defaultAdvancedControls,
    x_label: template.default_labels?.x || defaultAdvancedControls.x_label,
    left_y_label: template.default_labels?.left_y || defaultAdvancedControls.left_y_label,
    right_y_label: template.default_labels?.right_y || defaultAdvancedControls.right_y_label,
    line_width: Number(style.line_width || defaultAdvancedControls.line_width),
    marker_size: Number(style.marker_size || defaultAdvancedControls.marker_size),
    font_size: Number(style.font_size || defaultAdvancedControls.font_size),
    axis_label_size: Number(style.axis_label_size || defaultAdvancedControls.axis_label_size),
    tick_size: Number(style.tick_size || defaultAdvancedControls.tick_size),
    axis_line_width: Number(style.axis_line_width || defaultAdvancedControls.axis_line_width),
    tick_width: Number(style.tick_width || defaultAdvancedControls.tick_width),
    figure_width: layout.width_mm ? Number(layout.width_mm) / 25.4 : defaultAdvancedControls.figure_width,
    figure_height: layout.height_mm ? Number(layout.height_mm) / 25.4 : defaultAdvancedControls.figure_height,
    x_range: tupleRange(style.x_range),
    left_y_range: tupleRange(style.left_y_range),
    right_y_range: tupleRange(style.right_y_range)
  };
}

function quickFromTemplate(template: ReferenceTemplate): QuickControlSettings {
  const style = template.style_preset || {};
  return {
    ...defaultQuickControls,
    legend_position: String(style.legend_position || defaultQuickControls.legend_position),
    palette: String(style.palette || defaultQuickControls.palette),
    show_ce: Boolean(template.chart_structure?.right_y)
  };
}

function TemplatePreview({ template }: { template: ReferenceTemplate }) {
  return (
    <div className="rounded border border-rule bg-white p-2">
      <img
        src={referenceTemplatePreviewUrl(template.id)}
        alt={`${template.name} generated reference preview`}
        className="h-36 w-full object-contain"
      />
    </div>
  );
}

function TemplateAnalysisSummary({ template }: { template: ReferenceTemplate }) {
  const { language, t } = useLanguage();
  if (!template.layout_analysis && !template.finalized_layout) return null;
  const analysis = template.layout_analysis || {};
  const layout = template.finalized_layout || {};
  const zhAnalysis = templateCopyZh[template.id]?.analysis || {};
  return (
    <div className="mt-3 grid gap-2 text-xs leading-5 text-slate-600">
      {analysis.visual_hierarchy && <p><span className="font-semibold text-ink">{t("Analysis:", "\u5206\u6790\uff1a")}</span> {language === "zh" ? zhAnalysis.visual_hierarchy || analysis.visual_hierarchy : analysis.visual_hierarchy}</p>}
      {analysis.axis_strategy && <p><span className="font-semibold text-ink">{t("Axes:", "\u5750\u6807\u8f74\uff1a")}</span> {language === "zh" ? zhAnalysis.axis_strategy || analysis.axis_strategy : analysis.axis_strategy}</p>}
      {layout.canvas_width_mm && layout.canvas_height_mm && (
        <p>
          <span className="font-semibold text-ink">{t("Final layout:", "确定版式：")}</span> {layout.canvas_width_mm} x {layout.canvas_height_mm} mm · {String(layout.primary_axis)} · {layout.secondary_axis ? String(layout.secondary_axis) : t("no secondary axis", "无第二坐标轴")}
        </p>
      )}
    </div>
  );
}

function StepProgress({
  currentStep,
  maxReachableStep,
  onStepClick,
  labels,
  workflowLabel
}: {
  currentStep: number;
  maxReachableStep: number;
  onStepClick: (step: number) => void;
  labels: string[];
  workflowLabel: string;
}) {
  return (
    <aside className="panel-shell rounded-lg p-4">
      <p className="control-label mb-3">{workflowLabel}</p>
      <div className="grid gap-3">
        {labels.map((step, index) => {
          const active = index + 1 === currentStep;
          const done = index + 1 < currentStep;
          const clickable = index + 1 <= maxReachableStep;
          return (
            <button
              key={step}
              type="button"
              disabled={!clickable}
              onClick={() => onStepClick(index + 1)}
              className={`flex gap-3 rounded border p-3 text-left transition ${
                active ? "border-accent bg-accent/10" : "border-rule bg-white"
              } ${clickable ? "hover:border-accent" : "cursor-not-allowed opacity-45"}`}
            >
              <span className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-semibold ${done ? "bg-accent text-white" : active ? "bg-white text-accent" : "bg-panel text-slate-500"}`}>
                {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span className="text-sm font-semibold">{step}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function FieldList({ title, fields }: { title: string; fields: SemanticField[] }) {
  const { language, t } = useLanguage();

  return (
    <div>
      <p className="control-label mb-2">{title}</p>
      <div className="grid gap-2">
        {fields.map((field) => (
          <div key={field.key} className="rounded border border-rule bg-white px-3 py-2 text-sm">
            <span className="font-semibold">{language === "zh" ? semanticFieldZh[field.key] || field.label : field.label}</span>
            <span className="ml-2 text-xs text-slate-500">{field.key} · {field.type === "numeric" ? t("numeric", "\u6570\u503c") : t("categorical", "\u5206\u7c7b")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataRequirementPanel({ template }: { template: ReferenceTemplate }) {
  const { language, t } = useLanguage();

  return (
    <section className="panel-shell rounded-lg p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="control-label">{t("Template data requirement", "模板数据要求")}</p>
          <h2 className="mt-1 text-xl font-semibold">{language === "zh" ? templateCopyZh[template.id]?.name || template.name : template.name}</h2>
        </div>
        <button
          type="button"
          onClick={() => downloadExampleCsv(template)}
          className="inline-flex h-9 items-center gap-2 rounded border border-rule bg-white px-3 text-sm font-semibold hover:border-accent"
        >
          <Download className="h-4 w-4" />
          {t("Download example CSV", "下载示例 CSV")}
        </button>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <FieldList title={t("Required columns", "必需字段")} fields={template.required_semantic_fields || []} />
        <FieldList title={t("Optional columns", "可选字段")} fields={template.optional_semantic_fields || []} />
      </div>
      <div className="mt-5 overflow-auto rounded border border-rule">
        <table className="min-w-full text-xs">
          <thead>
            <tr>
              {Object.keys(template.example_rows?.[0] || {}).map((header) => (
                <th key={header} className="border-b border-rule bg-panel px-3 py-2 text-left font-semibold">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(template.example_rows || []).map((row, index) => (
              <tr key={index}>
                {Object.keys(template.example_rows?.[0] || {}).map((header) => (
                  <td key={header} className="border-b border-rule px-3 py-2">{String(row[header] ?? "")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EditableDataWorkspace({
  samples,
  activeSampleId,
  uploading,
  error,
  onActiveSampleChange,
  onSampleNameChange,
  onSampleUpload,
  onSampleRowsChange,
  onAddSample
}: {
  samples: LongCyclingSample[];
  activeSampleId: string;
  uploading: boolean;
  error: string | null;
  onActiveSampleChange: (sampleId: string) => void;
  onSampleNameChange: (sampleId: string, name: string) => void;
  onSampleUpload: (sampleId: string, file: File) => void;
  onSampleRowsChange: (sampleId: string, rows: EditableRow[], page?: number) => void;
  onAddSample: () => void;
}) {
  const { language, t } = useLanguage();
  const activeSample = samples.find((sample) => sample.id === activeSampleId) || samples[0];
  const pageCount = Math.max(1, Math.ceil((activeSample?.rows.length || 0) / samplePreviewPageSize));
  const currentPage = Math.min(activeSample?.page || 0, pageCount - 1);
  const startRow = currentPage * samplePreviewPageSize;
  const visibleRows = (activeSample?.rows || []).slice(startRow, startRow + samplePreviewPageSize);
  const displayRows = visibleRows.length ? visibleRows : [{ cycle: "", capacity: "", coulombic_efficiency: "" }];
  const totalRows = samples.reduce((sum, sample) => sum + sample.rows.length, 0);
  const columnLabel = (column: (typeof longCyclingDataColumns)[number]) => (language === "zh" ? column.labelZh : column.label);
  const [selectedColumn, setSelectedColumn] = useState<(typeof longCyclingDataColumns)[number]["key"]>("cycle");
  const [fillValue, setFillValue] = useState("");
  const [seriesStart, setSeriesStart] = useState("1");
  const [seriesStep, setSeriesStep] = useState("1");
  const [worksheetMessage, setWorksheetMessage] = useState<string | null>(null);
  const selectedColumnMeta = longCyclingDataColumns.find((column) => column.key === selectedColumn) || longCyclingDataColumns[0];

  function notifyWorksheet(message: string) {
    setWorksheetMessage(message);
    window.setTimeout(() => setWorksheetMessage(null), 2400);
  }

  function commitRows(rows: EditableRow[], page = currentPage) {
    if (!activeSample) return;
    onSampleRowsChange(activeSample.id, rows, page);
  }

  function ensureRowCount(rows: EditableRow[], count: number) {
    const next = rows.map((row) => ({ ...row }));
    while (next.length < count) {
      next.push(emptyLongCyclingRow());
    }
    return next;
  }

  function patchCell(rowIndex: number, column: string, value: string) {
    if (!activeSample) return;
    const absoluteIndex = startRow + rowIndex;
    const next = activeSample.rows.map((row) => ({ ...row }));
    while (next.length <= absoluteIndex) {
      next.push(emptyLongCyclingRow());
    }
    next[absoluteIndex] = { ...next[absoluteIndex], [column]: value };
    commitRows(next);
  }

  function applyPastedText(rowIndex: number, columnIndex: number, text: string) {
    if (!activeSample) return;
    if (!text) return;
    const pastedRows = parsePastedTable(text);
    if (!pastedRows.length) return;

    const absoluteIndex = startRow + rowIndex;
    const columnKeys = longCyclingDataColumns.map((column) => column.key);
    const nextRows = activeSample.rows.map((row) => ({ ...row }));
    pastedRows.forEach((pastedRow, pasteRowIndex) => {
      const targetRowIndex = absoluteIndex + pasteRowIndex;
      while (nextRows.length <= targetRowIndex) {
        nextRows.push(emptyLongCyclingRow());
      }
      const targetRow = { ...nextRows[targetRowIndex] };
      pastedRow.forEach((cell, pasteColumnIndex) => {
        const targetColumn = columnKeys[columnIndex + pasteColumnIndex];
        if (targetColumn) {
          targetRow[targetColumn] = cell.trim();
        }
      });
      nextRows[targetRowIndex] = targetRow;
    });
    commitRows(nextRows);
    notifyWorksheet(t("Pasted cells into the worksheet.", "已粘贴到工作表。"));
  }

  function pasteCells(rowIndex: number, columnIndex: number, event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    if (!text) return;
    event.preventDefault();
    applyPastedText(rowIndex, columnIndex, text);
  }

  function addRow() {
    if (!activeSample) return;
    commitRows([...activeSample.rows, emptyLongCyclingRow()]);
  }

  function addRows(count: number) {
    if (!activeSample) return;
    const rows = [...activeSample.rows];
    for (let index = 0; index < count; index += 1) {
      rows.push(emptyLongCyclingRow());
    }
    commitRows(rows, Math.max(0, Math.ceil(rows.length / samplePreviewPageSize) - 1));
  }

  function deleteRow(rowIndex: number) {
    if (!activeSample) return;
    const absoluteIndex = startRow + rowIndex;
    const nextRows = activeSample.rows.filter((_, index) => index !== absoluteIndex);
    const nextPage = Math.min(currentPage, Math.max(0, Math.ceil(nextRows.length / samplePreviewPageSize) - 1));
    commitRows(nextRows, nextPage);
  }

  function changePage(nextPage: number) {
    if (!activeSample) return;
    commitRows(activeSample.rows, Math.min(Math.max(nextPage, 0), pageCount - 1));
  }

  async function copyColumn() {
    if (!activeSample) return;
    try {
      await navigator.clipboard.writeText(activeSample.rows.map((row) => String(row[selectedColumn] ?? "")).join("\n"));
      notifyWorksheet(t("Column copied.", "已复制整列。"));
    } catch {
      notifyWorksheet(t("Clipboard copy failed.", "复制到剪贴板失败。"));
    }
  }

  async function pasteColumnFromClipboard() {
    if (!activeSample) return;
    try {
      const text = await navigator.clipboard.readText();
      const values = parsePastedTable(text).map((row) => row[0] ?? "");
      if (!values.length) return;
      const nextRows = ensureRowCount(activeSample.rows, values.length);
      values.forEach((value, index) => {
        nextRows[index] = { ...nextRows[index], [selectedColumn]: value.trim() };
      });
      commitRows(nextRows, 0);
      notifyWorksheet(t("Column pasted.", "已粘贴整列。"));
    } catch {
      notifyWorksheet(t("Clipboard paste failed. Click a cell and press Ctrl+V instead.", "读取剪贴板失败。也可以点击单元格后按 Ctrl+V。"));
    }
  }

  async function copySampleTable() {
    if (!activeSample) return;
    const headers = longCyclingDataColumns.map((column) => columnLabel(column)).join("\t");
    const body = activeSample.rows
      .map((row) => longCyclingDataColumns.map((column) => String(row[column.key] ?? "")).join("\t"))
      .join("\n");
    try {
      await navigator.clipboard.writeText([headers, body].filter(Boolean).join("\n"));
      notifyWorksheet(t("Sample table copied.", "已复制当前样品表。"));
    } catch {
      notifyWorksheet(t("Clipboard copy failed.", "复制到剪贴板失败。"));
    }
  }

  function clearColumn() {
    if (!activeSample) return;
    commitRows(activeSample.rows.map((row) => ({ ...row, [selectedColumn]: "" })));
    notifyWorksheet(t("Column cleared.", "已清空整列。"));
  }

  function clearSampleTable() {
    if (!activeSample) return;
    commitRows([], 0);
    notifyWorksheet(t("Sample worksheet cleared.", "已清空当前样品工作表。"));
  }

  function fillColumn() {
    if (!activeSample) return;
    const rowCount = Math.max(activeSample.rows.length, 1);
    const nextRows = ensureRowCount(activeSample.rows, rowCount).map((row) => ({ ...row, [selectedColumn]: fillValue }));
    commitRows(nextRows);
    notifyWorksheet(t("Column filled.", "已填充整列。"));
  }

  function fillSeries() {
    if (!activeSample) return;
    const start = Number(seriesStart);
    const step = Number(seriesStep);
    if (Number.isNaN(start) || Number.isNaN(step)) {
      notifyWorksheet(t("Series start and step must be numeric.", "序列起始值和步长必须是数字。"));
      return;
    }
    const rowCount = Math.max(activeSample.rows.length, samplePreviewPageSize);
    const nextRows = ensureRowCount(activeSample.rows, rowCount).map((row, index) => ({
      ...row,
      [selectedColumn]: String(start + step * index)
    }));
    commitRows(nextRows, 0);
    notifyWorksheet(t("Series filled.", "已生成序列。"));
  }

  return (
    <section className="panel-shell flex min-h-[720px] flex-col rounded-lg p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="control-label">{t("Data Workspace", "数据区")}</p>
          <h2 className="text-lg font-semibold">{t("Import each sample separately", "按样品分别导入数据")}</h2>
        </div>
        <Table2 className="h-5 w-5 text-accent" />
      </div>

      <div className="mb-4 rounded border border-rule bg-white p-3">
        <p className="control-label mb-2">{t("Required columns per sample", "每个样品需要的数据列")}</p>
        <div className="flex flex-wrap gap-2">
          {longCyclingDataColumns.map((column) => (
            <span key={column.key} className="rounded bg-accent/10 px-2 py-1 text-xs font-semibold text-accent">
              {columnLabel(column)}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {t(
            "Each uploaded sample file is converted to these three columns. Common English or Chinese headers are recognized; otherwise the first three columns are used in order.",
            "每个样品文件会被整理成这三列。系统会识别常见中英文表头；如果识别不到，则按前三列依次作为循环圈数、容量、库仑效率。"
          )}
        </p>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col rounded border border-rule bg-white">
        <div className="border-b border-rule px-3 py-2">
          <div className="mb-3 flex items-center gap-2 overflow-x-auto">
            {samples.map((sample, index) => {
              const active = sample.id === activeSample?.id;
              return (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => onActiveSampleChange(sample.id)}
                  className={`flex min-w-[120px] items-center gap-2 rounded-t border px-3 py-2 text-left text-xs transition ${
                    active ? "border-accent bg-white text-ink" : "border-rule bg-panel text-slate-500 hover:border-accent"
                  }`}
                >
                  <span className="font-semibold">{sampleLabel(index)}</span>
                  <span className="truncate">{sample.name}</span>
                </button>
              );
            })}
            <button type="button" onClick={onAddSample} className="inline-flex h-9 items-center gap-1 rounded border border-rule px-2 text-xs font-semibold hover:border-accent">
              <Plus className="h-3.5 w-3.5" />
              {t("Sample", "样品")}
            </button>
          </div>
          {activeSample && (
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
              <input
                className="field"
                value={activeSample.name}
                onChange={(event) => onSampleNameChange(activeSample.id, event.target.value)}
                aria-label="Sample name"
              />
              <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded border border-rule px-3 text-xs font-semibold hover:border-accent">
                <Upload className="h-3.5 w-3.5" />
                {activeSample.sourceFile ? t("Replace data", "替换数据") : t("Import sample data", "导入样品数据")}
                <input
                  type="file"
                  accept=".csv,.txt,.xlsx,.xls"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onSampleUpload(activeSample.id, file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
          )}
          {uploading && <p className="mt-2 text-sm text-slate-500">{t("Reading data...", "正在读取数据...")}</p>}
          {error && <p className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-3 py-2">
          <div>
            <p className="text-sm font-semibold">{t("Sample table preview", "样品数据预览")}</p>
            <p className="text-xs text-slate-500">
              {activeSample?.sourceFile
                ? `${activeSample.sourceFile} · ${activeSample.rows.length} ${t("rows", "行")} · ${t("total", "总计")} ${totalRows} ${t("rows", "行")}`
                : t("Import data for this sample. Large files are shown page by page.", "请为当前样品导入数据。大文件会分页显示。")}
              {" "}
              {t("You can paste copied Excel cells directly into the table.", "可直接从 Excel 复制单元格并粘贴到表格中。")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={addRow} className="inline-flex h-8 items-center gap-1 rounded border border-rule px-2 text-xs font-semibold hover:border-accent">
              <Plus className="h-3.5 w-3.5" />
              {t("Add row", "新增行")}
            </button>
            <button type="button" onClick={() => addRows(10)} className="inline-flex h-8 items-center gap-1 rounded border border-rule px-2 text-xs font-semibold hover:border-accent">
              <Plus className="h-3.5 w-3.5" />
              {t("Add 10", "新增 10 行")}
            </button>
            <button type="button" onClick={copySampleTable} className="inline-flex h-8 items-center gap-1 rounded border border-rule px-2 text-xs font-semibold hover:border-accent">
              <Copy className="h-3.5 w-3.5" />
              {t("Copy table", "复制表格")}
            </button>
            <button type="button" onClick={clearSampleTable} disabled={!activeSample || activeSample.rows.length === 0} className="inline-flex h-8 items-center gap-1 rounded border border-rule px-2 text-xs font-semibold hover:border-accent disabled:cursor-not-allowed disabled:opacity-40">
              <Eraser className="h-3.5 w-3.5" />
              {t("Clear", "清空")}
            </button>
          </div>
        </div>
        <div className="border-b border-rule bg-panel/60 px-3 py-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">{t("Selected column", "当前列")}</span>
            {longCyclingDataColumns.map((column) => (
              <button
                key={column.key}
                type="button"
                onClick={() => setSelectedColumn(column.key)}
                className={`rounded border px-2 py-1 text-xs font-semibold transition ${
                  selectedColumn === column.key ? "border-accent bg-white text-accent" : "border-rule bg-white text-slate-600 hover:border-accent"
                }`}
              >
                {columnLabel(column)}
              </button>
            ))}
            {worksheetMessage && <span className="text-xs font-semibold text-accent">{worksheetMessage}</span>}
          </div>
          <div className="grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto]">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                className="field h-9"
                value={fillValue}
                onChange={(event) => setFillValue(event.target.value)}
                placeholder={t(`Fill ${selectedColumnMeta.label}`, `填充${columnLabel(selectedColumnMeta)}`)}
              />
              <button type="button" onClick={fillColumn} className="inline-flex h-9 items-center justify-center gap-1 rounded border border-rule bg-white px-3 text-xs font-semibold hover:border-accent">
                <ClipboardPaste className="h-3.5 w-3.5" />
                {t("Fill column", "填充整列")}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copyColumn} disabled={!activeSample || activeSample.rows.length === 0} className="inline-flex h-9 items-center gap-1 rounded border border-rule bg-white px-2 text-xs font-semibold hover:border-accent disabled:cursor-not-allowed disabled:opacity-40">
                <Copy className="h-3.5 w-3.5" />
                {t("Copy column", "复制列")}
              </button>
              <button type="button" onClick={pasteColumnFromClipboard} className="inline-flex h-9 items-center gap-1 rounded border border-rule bg-white px-2 text-xs font-semibold hover:border-accent">
                <ClipboardPaste className="h-3.5 w-3.5" />
                {t("Paste column", "粘贴列")}
              </button>
              <button type="button" onClick={clearColumn} disabled={!activeSample || activeSample.rows.length === 0} className="inline-flex h-9 items-center gap-1 rounded border border-rule bg-white px-2 text-xs font-semibold hover:border-accent disabled:cursor-not-allowed disabled:opacity-40">
                <Eraser className="h-3.5 w-3.5" />
                {t("Clear column", "清空列")}
              </button>
            </div>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <input className="field h-9" value={seriesStart} onChange={(event) => setSeriesStart(event.target.value)} placeholder={t("series start", "序列起始值")} />
            <input className="field h-9" value={seriesStep} onChange={(event) => setSeriesStep(event.target.value)} placeholder={t("series step", "序列步长")} />
            <button type="button" onClick={fillSeries} className="inline-flex h-9 items-center justify-center gap-1 rounded border border-rule bg-white px-3 text-xs font-semibold hover:border-accent">
              <ClipboardPaste className="h-3.5 w-3.5" />
              {t("Fill series", "填充序列")}
            </button>
          </div>
        </div>
        <div className="min-h-[240px] flex-1 overflow-auto">
          {!activeSample ? (
            <div className="flex h-56 items-center justify-center px-4 text-center text-sm leading-6 text-slate-500">
              {t("Import this sample's cycle, capacity, and CE columns to preview data here.", "导入当前样品的循环圈数、容量、库仑效率三列数据后，在这里预览。")}
            </div>
          ) : (
            <table className="min-w-full border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-panel">
                <tr>
                  <th className="w-10 border-b border-rule px-2 py-2 text-left font-semibold">#</th>
                  {longCyclingDataColumns.map((column) => (
                    <th key={column.key} className="min-w-[120px] border-b border-rule px-2 py-2 text-left font-semibold">
                      <button
                        type="button"
                        onClick={() => setSelectedColumn(column.key)}
                        className={`w-full rounded px-2 py-1 text-left transition ${selectedColumn === column.key ? "bg-accent/10 text-accent" : "hover:bg-white"}`}
                      >
                        {columnLabel(column)}
                      </button>
                    </th>
                  ))}
                  <th className="w-10 border-b border-rule px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-panel/60">
                    <td className="border-b border-rule px-2 py-1 text-slate-400">{startRow + rowIndex + 1}</td>
                    {longCyclingDataColumns.map((column, columnIndex) => (
                      <td key={column.key} className="border-b border-rule p-1">
                        <input
                          className="h-8 w-full min-w-[110px] rounded border border-transparent bg-transparent px-2 outline-none focus:border-accent focus:bg-white"
                          value={String(row[column.key] ?? "")}
                          onChange={(event) => patchCell(rowIndex, column.key, event.target.value)}
                          onPaste={(event) => pasteCells(rowIndex, columnIndex, event)}
                        />
                      </td>
                    ))}
                    <td className="border-b border-rule p-1">
                      <button type="button" onClick={() => deleteRow(rowIndex)} disabled={activeSample.rows.length === 0} className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {activeSample && activeSample.rows.length > 0 && (
          <div className="flex items-center justify-between border-t border-rule px-3 py-2 text-xs">
            <span className="text-slate-500">
              {t("Page", "第")} {currentPage + 1} / {pageCount}
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={() => changePage(currentPage - 1)} disabled={currentPage === 0} className="rounded border border-rule px-2 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-40">
                {t("Previous", "上一页")}
              </button>
              <button type="button" onClick={() => changePage(currentPage + 1)} disabled={currentPage >= pageCount - 1} className="rounded border border-rule px-2 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-40">
                {t("Next", "下一页")}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function FigurePreviewWorkspace({
  image,
  loading,
  error,
  warnings,
  canGenerate,
  onGenerate,
  canSave,
  onSave
}: {
  image: string | null;
  loading: boolean;
  error: string | null;
  warnings: string[];
  canGenerate: boolean;
  onGenerate: () => void;
  canSave: boolean;
  onSave: (slot: "A" | "B" | "C" | "D") => void;
}) {
  const { t } = useLanguage();
  const [zoom, setZoom] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const preview = (
    <div className="flex min-h-[520px] items-center justify-center overflow-auto rounded border border-rule bg-white p-4">
      {loading && <p className="text-sm text-slate-500">{t("Generating plot...", "正在生成图表...")}</p>}
      {!loading && image && (
        <img
          src={image}
          alt="Generated scientific plot"
          className="origin-center object-contain transition-transform"
          style={{ transform: `scale(${zoom})`, maxHeight: expanded ? "78vh" : "620px", maxWidth: "100%" }}
        />
      )}
      {!loading && !image && (
        <div className="max-w-md text-center">
          <p className="text-base font-semibold">{t("Preview area", "预览图区")}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {t("Import sample data, then generate the reference-based figure.", "导入样品数据后，生成参考图风格的科研图。")}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <section className="panel-shell rounded-lg p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="control-label">{t("Figure Preview", "预览图区")}</p>
          <h2 className="text-lg font-semibold">{t("Publication-style long cycling figure", "论文风格长循环图")}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setZoom((value) => Math.max(0.6, value - 0.1))} className="inline-flex h-9 w-9 items-center justify-center rounded border border-rule hover:border-accent" aria-label="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="min-w-14 text-center text-xs font-semibold text-slate-500">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((value) => Math.min(2.4, value + 0.1))} className="inline-flex h-9 w-9 items-center justify-center rounded border border-rule hover:border-accent" aria-label="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setExpanded(true)} className="inline-flex h-9 w-9 items-center justify-center rounded border border-rule hover:border-accent" aria-label="Expand preview">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate || loading}
          className="inline-flex h-10 items-center gap-2 rounded bg-accent px-4 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {t("Generate / update figure", "生成 / 更新图表")}
        </button>
        <div className="flex flex-wrap gap-2">
          {(["A", "B", "C", "D"] as const).map((slot) => (
            <button
              key={slot}
              type="button"
              disabled={!canSave}
              onClick={() => onSave(slot)}
              className="inline-flex h-9 items-center gap-1 rounded border border-rule px-2 text-xs font-semibold hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" />
              {t("Save", "保存")} {slot}
            </button>
          ))}
        </div>
      </div>

      {preview}
      {error && <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {warnings.length > 0 && (
        <div className="mt-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {warnings.map((warning) => <p key={warning}>{warning}</p>)}
        </div>
      )}

      {expanded && (
        <div className="fixed inset-0 z-50 bg-black/70 p-5">
          <div className="mx-auto flex h-full max-w-7xl flex-col rounded bg-paper p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">{t("Expanded preview", "放大预览")}</p>
              <button type="button" onClick={() => setExpanded(false)} className="inline-flex h-9 items-center gap-2 rounded border border-rule bg-white px-3 text-sm font-semibold hover:border-accent">
                <Minus className="h-4 w-4" />
                {t("Close", "关闭")}
              </button>
            </div>
            <div className="min-h-0 flex-1">{preview}</div>
          </div>
        </div>
      )}
    </section>
  );
}

function QuickControlsPanel({
  quick,
  advanced,
  onQuickChange,
  onAdvancedChange
}: {
  quick: QuickControlSettings;
  advanced: SemanticStyleOverrides;
  onQuickChange: (settings: QuickControlSettings) => void;
  onAdvancedChange: (settings: SemanticStyleOverrides) => void;
}) {
  const { t } = useLanguage();
  const patchQuick = (updates: Partial<QuickControlSettings>) => onQuickChange({ ...quick, ...updates });
  const patchAdvanced = (updates: Partial<SemanticStyleOverrides>) => onAdvancedChange({ ...advanced, ...updates });
  const numberInput = (key: keyof SemanticStyleOverrides, label: string, step = "0.1") => (
    <label className="grid gap-1">
      <span className="control-label">{label}</span>
      <input className="field" type="number" step={step} value={(advanced[key] as number | undefined) ?? ""} onChange={(event) => patchAdvanced({ [key]: Number(event.target.value) } as Partial<SemanticStyleOverrides>)} />
    </label>
  );
  const rangeInput = (key: "x_range" | "left_y_range" | "right_y_range", index: 0 | 1, label: string) => {
    const range = advanced[key] || [null, null];
    return (
      <label className="grid gap-1">
        <span className="control-label">{label}</span>
        <input
          className="field"
          type="number"
          value={range[index] ?? ""}
          onChange={(event) => {
            const next = [...range] as [number | null, number | null];
            next[index] = event.target.value === "" ? null : Number(event.target.value);
            patchAdvanced({ [key]: next } as Partial<SemanticStyleOverrides>);
          }}
        />
      </label>
    );
  };

  return (
    <section className="panel-shell rounded-lg p-4">
      <p className="control-label">{t("Parameter Control", "参数控制区")}</p>
      <h2 className="mt-1 text-base font-semibold">{t("Common controls", "常用控制")}</h2>
      <div className="mt-4 grid gap-3">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={quick.show_ce} onChange={(event) => patchQuick({ show_ce: event.target.checked })} />
          {t("Show Coulombic efficiency", "显示库仑效率")}
        </label>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={quick.show_markers} onChange={(event) => patchQuick({ show_markers: event.target.checked })} />
          {t("Show markers", "显示标记点")}
        </label>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={quick.normalize_retention} onChange={(event) => patchQuick({ normalize_retention: event.target.checked })} />
          {t("Normalize to retention %", "归一化为保持率 %")}
        </label>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={quick.show_retention_annotation} onChange={(event) => patchQuick({ show_retention_annotation: event.target.checked })} />
          {t("Show final retention annotation", "显示最终保持率标注")}
        </label>
        <label className="grid gap-1">
          <span className="control-label">{t("legend position", "图例位置")}</span>
          <select className="field" value={quick.legend_position} onChange={(event) => patchQuick({ legend_position: event.target.value })}>
            <option value="best">{t("Best", "自动")}</option>
            <option value="upper right">{t("Upper right", "右上")}</option>
            <option value="upper left">{t("Upper left", "左上")}</option>
            <option value="lower right">{t("Lower right", "右下")}</option>
            <option value="lower left">{t("Lower left", "左下")}</option>
          </select>
        </label>
        <label className="grid gap-1">
          <span className="control-label">{t("color palette", "配色方案")}</span>
          <select className="field" value={quick.palette} onChange={(event) => patchQuick({ palette: event.target.value })}>
            <option value="nature_low_saturation">{t("Nature low saturation", "Nature 低饱和配色")}</option>
            <option value="submission_nmc">{t("Submission NMC panel", "投稿图 NMC 面板配色")}</option>
            <option value="battery_muted">{t("Battery muted", "电池论文柔和配色")}</option>
            <option value="minimal_mono">{t("Minimal mono", "极简单色配色")}</option>
          </select>
        </label>
      </div>

      <details className="mt-4 rounded border border-rule bg-white p-3">
        <summary className="cursor-pointer text-sm font-semibold">{t("Axis labels", "坐标轴标签")}</summary>
        <div className="mt-3 grid gap-3">
        <label className="grid gap-1">
          <span className="control-label">{t("x label", "x 轴标签")}</span>
          <input className="field" value={advanced.x_label || ""} onChange={(event) => patchAdvanced({ x_label: event.target.value })} />
        </label>
        <label className="grid gap-1">
          <span className="control-label">{t("left y label", "左 y 轴标签")}</span>
          <input className="field" value={advanced.left_y_label || ""} onChange={(event) => patchAdvanced({ left_y_label: event.target.value })} />
        </label>
        <label className="grid gap-1">
          <span className="control-label">{t("right y label", "右 y 轴标签")}</span>
          <input className="field" value={advanced.right_y_label || ""} onChange={(event) => patchAdvanced({ right_y_label: event.target.value })} />
        </label>
        </div>
      </details>

      <details className="mt-4 rounded border border-rule bg-white p-3">
        <summary className="cursor-pointer text-sm font-semibold">{t("Advanced controls", "高级控制")}</summary>
      <div className="mt-4 grid gap-3">
        {numberInput("line_width", t("line width", "线宽"))}
        {numberInput("marker_size", t("marker size", "标记大小"))}
        {numberInput("font_size", t("font size", "字体大小"))}
        {numberInput("axis_line_width", t("axis line width", "坐标轴线宽"))}
        {numberInput("tick_width", t("tick width", "刻度线宽"))}
        {numberInput("figure_width", t("figure width (in)", "图宽（英寸）"))}
        {numberInput("figure_height", t("figure height (in)", "图高（英寸）"))}
        {numberInput("dpi", "dpi", "100")}
        <div className="grid grid-cols-2 gap-2">
          {rangeInput("x_range", 0, t("x min", "x 最小值"))}
          {rangeInput("x_range", 1, t("x max", "x 最大值"))}
          {rangeInput("left_y_range", 0, t("left y min", "左 y 最小值"))}
          {rangeInput("left_y_range", 1, t("left y max", "左 y 最大值"))}
          {rangeInput("right_y_range", 0, t("right y min", "右 y 最小值"))}
          {rangeInput("right_y_range", 1, t("right y max", "右 y 最大值"))}
        </div>
      </div>
      </details>
    </section>
  );
}

export default function PlotStudioPage() {
  const { language, t } = useLanguage();
  const [templates, setTemplates] = useState<ReferenceTemplate[]>([]);
  const [selectedDisciplineId, setSelectedDisciplineId] = useState(chartDatabase[0].id);
  const [selectedFigureType, setSelectedFigureType] = useState<FigureType | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ReferenceTemplate | null>(null);
  const [dataset, setDataset] = useState<UploadedDataset | null>(null);
  const [samples, setSamples] = useState<LongCyclingSample[]>(createDefaultSamples);
  const [activeSampleId, setActiveSampleId] = useState("sample-1");
  const [quickControls, setQuickControls] = useState<QuickControlSettings>(defaultQuickControls);
  const [advancedControls, setAdvancedControls] = useState<SemanticStyleOverrides>(defaultAdvancedControls);
  const [plotImage, setPlotImage] = useState<string | null>(null);
  const [autoPreviewEnabled, setAutoPreviewEnabled] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [savedPlots, setSavedPlots] = useState<SavedPlot[]>([]);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [plotError, setPlotError] = useState<string | null>(null);

  useEffect(() => {
    setSavedPlots(loadSavedPlots());
    fetchReferenceTemplates().then(setTemplates).catch((error: Error) => setPlotError(error.message));
  }, []);

  const templatesForType = useMemo(
    () => templates.filter((template) => template.figure_type === selectedFigureType?.id),
    [selectedFigureType, templates]
  );
  const selectedDiscipline = chartDatabase.find((discipline) => discipline.id === selectedDisciplineId) || chartDatabase[0];

  const editableRows = useMemo(() => rowsFromSamples(samples), [samples]);
  const controlSignature = useMemo(() => JSON.stringify({ quickControls, advancedControls }), [quickControls, advancedControls]);
  const lastGeneratedControlSignatureRef = useRef("");
  const hasEditableData = editableRows.length > 0;
  const currentStep = plotImage ? 5 : hasEditableData ? 4 : selectedTemplate ? 3 : selectedFigureType ? 2 : 1;
  const maxReachableStep = plotImage ? 5 : hasEditableData ? 4 : selectedTemplate ? 3 : selectedFigureType ? 2 : 1;
  const localizedSteps = stepLabels[language];
  const disciplineLabel = (discipline: FigureDiscipline) => (language === "zh" ? discipline.labelZh : discipline.label);
  const disciplineDescription = (discipline: FigureDiscipline) => (language === "zh" ? discipline.descriptionZh : discipline.description);
  const figureLabel = (figure: FigureType) => (language === "zh" ? figure.labelZh : figure.label);
  const figureDescription = (figure: FigureType) => (language === "zh" ? figure.descriptionZh : figure.description);
  const templateName = (template: ReferenceTemplate) => (language === "zh" ? templateCopyZh[template.id]?.name || template.name : template.name);
  const templateDescription = (template: ReferenceTemplate) => (language === "zh" ? templateCopyZh[template.id]?.description || template.description : template.description);
  const templateBestUseCase = (template: ReferenceTemplate) => (language === "zh" ? templateCopyZh[template.id]?.bestUseCase || template.best_use_case : template.best_use_case);
  const semanticFieldList = (fields: SemanticField[] = []) =>
    fields.map((field) => (language === "zh" ? semanticFieldZh[field.key] || field.key : field.key)).join(", ");
  const semanticMapping = longCyclingSemanticMapping;

  function resetAfterFigureType() {
    setSelectedTemplate(null);
    setDataset(null);
    const defaultSamples = createDefaultSamples();
    setSamples(defaultSamples);
    setActiveSampleId(defaultSamples[0].id);
    setPlotImage(null);
    setAutoPreviewEnabled(false);
    setWarnings([]);
    setUploadError(null);
    setPlotError(null);
  }

  function navigateToStep(step: number) {
    if (step === 1) {
      setSelectedFigureType(null);
      resetAfterFigureType();
      return;
    }
    if (step === 2 && selectedFigureType) {
      resetAfterFigureType();
      return;
    }
    if (step === 3 && selectedTemplate) {
      setPlotImage(null);
      setWarnings([]);
      setPlotError(null);
      return;
    }
    if (step === 4 && hasEditableData) {
      setPlotImage(null);
      setWarnings([]);
      setPlotError(null);
      return;
    }
  }

  function chooseFigureType(type: FigureType) {
    setSelectedFigureType(type);
    resetAfterFigureType();
  }

  function chooseTemplate(template: ReferenceTemplate) {
    const defaultSamples = createDefaultSamples();
    setSelectedTemplate(template);
    setDataset(null);
    setSamples(defaultSamples);
    setActiveSampleId(defaultSamples[0].id);
    setPlotImage(null);
    setAutoPreviewEnabled(false);
    setQuickControls(quickFromTemplate(template));
    setAdvancedControls(styleFromTemplate(template));
    setPlotError(null);
  }

  function updateSampleRows(sampleId: string, rows: EditableRow[], page = 0) {
    setSamples((current) =>
      current.map((sample) =>
        sample.id === sampleId
          ? {
              ...sample,
              rows,
              page
            }
          : sample
      )
    );
    setPlotImage(null);
    setAutoPreviewEnabled(false);
  }

  function updateSampleName(sampleId: string, name: string) {
    setSamples((current) => current.map((sample) => (sample.id === sampleId ? { ...sample, name } : sample)));
    setPlotImage(null);
    setAutoPreviewEnabled(false);
  }

  function addSample() {
    const nextId = `sample-${Date.now()}`;
    setSamples((current) => [
      ...current,
      {
        id: nextId,
        name: `Sample ${current.length + 1}`,
        rows: [],
        page: 0
      }
    ]);
    setActiveSampleId(nextId);
    setPlotImage(null);
    setAutoPreviewEnabled(false);
  }

  async function handleSampleUpload(sampleId: string, file: File) {
    if (!selectedTemplate) return;
    setUploading(true);
    setUploadError(null);
    setPlotError(null);
    try {
      const uploaded = await uploadDataset(file);
      const uploadedRows = standardizeLongCyclingSampleRows(uploaded);
      const nextSamples = samples.map((sample) =>
        sample.id === sampleId
          ? {
              ...sample,
              rows: uploadedRows,
              sourceFile: uploaded.filename,
              page: 0
            }
          : sample
      );
      setSamples(nextSamples);
      setDataset({
        ...uploaded,
        filename: uploaded.filename,
        columns: ["sample", "cycle", "capacity", "coulombic_efficiency"],
        rows: rowsFromSamples(nextSamples),
        preview: rowsFromSamples(nextSamples).slice(0, 8),
        row_count: rowsFromSamples(nextSamples).length
      });
      setPlotImage(null);
      setAutoPreviewEnabled(false);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : t("Sample import failed.", "样品数据导入失败。"));
    } finally {
      setUploading(false);
    }
  }

  async function handleGenerate() {
    if (!selectedTemplate || editableRows.length === 0) {
      setPlotError(t("Please choose a reference template and import data first.", "请先选择参考模板并导入数据。"));
      return;
    }
    setGenerating(true);
    setPlotError(null);
    setWarnings([]);
    try {
      const tableRows = rowsFromSamples(samples);
      const syncedDataset = await saveEditableDataset(dataset?.filename || "long-cycling-samples.csv", tableRows);
      setDataset(syncedDataset);
      const response = await generateSemanticPlot({
        selected_template_id: selectedTemplate.id,
        uploaded_data_id: syncedDataset.dataset_id,
        semantic_column_mapping: longCyclingSemanticMapping,
        style_overrides: advancedControls,
        quick_control_settings: quickControls,
        dpi: advancedControls.dpi || 300
      });
      setPlotImage(response.image);
      setWarnings(response.warnings);
      setAutoPreviewEnabled(true);
      lastGeneratedControlSignatureRef.current = controlSignature;
    } catch (error) {
      setPlotImage(null);
      setPlotError(error instanceof Error ? error.message : t("Template-driven plot generation failed.", "模板驱动绘图失败。"));
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    if (!autoPreviewEnabled || !plotImage || !selectedTemplate || editableRows.length === 0 || generating) return;
    if (lastGeneratedControlSignatureRef.current === controlSignature) return;
    const timer = window.setTimeout(() => {
      void handleGenerate();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [autoPreviewEnabled, controlSignature, editableRows.length, generating, plotImage, selectedTemplate]);

  function savePlot(slot: "A" | "B" | "C" | "D") {
    if (!plotImage || !selectedTemplate) return;
    const next = persistSavedPlot({
      slot,
      image: plotImage,
      mapping: {
        x: semanticMapping.cycle,
        y: semanticMapping.capacity,
        group: semanticMapping.sample,
        second_y: semanticMapping.coulombic_efficiency,
        error: undefined
      },
      plot_type: "long_cycling",
      template_id: selectedTemplate.id,
      template_name: selectedTemplate.name,
      style: {
        ...defaultStyleSettings,
        line_width: advancedControls.line_width || defaultStyleSettings.line_width,
        marker_size: advancedControls.marker_size || defaultStyleSettings.marker_size,
        font_size: advancedControls.font_size || defaultStyleSettings.font_size,
        axis_line_width: advancedControls.axis_line_width || defaultStyleSettings.axis_line_width,
        tick_width: advancedControls.tick_width || defaultStyleSettings.tick_width,
        figure_width: advancedControls.figure_width,
        figure_height: advancedControls.figure_height,
        color_palette: quickControls.palette,
        legend_position: quickControls.legend_position
      },
      saved_at: new Date().toISOString()
    });
    setSavedPlots(next);
  }

  return (
    <main className="min-h-screen bg-paper px-5 py-6">
      <header className="mx-auto mb-5 flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div>
          <p className="control-label">{t("Reference-based scientific figure generation", "参考图驱动科研 Figure 生成")}</p>
          <h1 className="text-3xl font-semibold">Scientific Figure Studio</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LanguageToggle />
          <Link href="/figure-composer" className="inline-flex h-10 items-center gap-2 rounded bg-ink px-4 text-sm font-semibold text-white hover:bg-accent">
            {t("Figure Composer", "Figure 排版器")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <div className={`mx-auto grid gap-4 ${selectedTemplate ? "max-w-[1800px] xl:grid-cols-[280px_minmax(0,1fr)]" : "max-w-7xl xl:grid-cols-[300px_minmax(0,1fr)_310px]"}`}>
        <div className="grid content-start gap-4">
          <StepProgress
            currentStep={currentStep}
            maxReachableStep={maxReachableStep}
            onStepClick={navigateToStep}
            labels={localizedSteps}
            workflowLabel={t("Workflow", "工作流")}
          />
          {(selectedFigureType || selectedTemplate) && (
            <section className="panel-shell rounded-lg p-4">
              <p className="control-label">{t("Current selection", "当前选择")}</p>
              <div className="mt-3 grid gap-2 text-sm">
                <p><span className="text-slate-500">{t("Discipline:", "学科：")}</span> <span className="font-semibold">{disciplineLabel(selectedDiscipline)}</span></p>
                {selectedFigureType && <p><span className="text-slate-500">{t("Figure:", "图类型：")}</span> <span className="font-semibold">{figureLabel(selectedFigureType)}</span></p>}
                {selectedTemplate && <p><span className="text-slate-500">{t("Template:", "\u6a21\u677f\uff1a")}</span> <span className="font-semibold">{templateName(selectedTemplate)}</span></p>}
              </div>
              <div className="mt-4 grid gap-2">
                <button type="button" className="text-left text-sm font-semibold text-accent" onClick={() => navigateToStep(1)}>
                  {t("Back to database", "返回图表数据库")}
                </button>
                {selectedFigureType && (
                  <button type="button" className="text-left text-sm font-semibold text-accent" onClick={() => navigateToStep(2)}>
                    {t("Back to templates", "返回模板库")}
                  </button>
                )}
              </div>
            </section>
          )}
        </div>

        <div className="grid content-start gap-4">
          {!selectedFigureType && (
            <section className="panel-shell rounded-lg p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="control-label">{t("Reference figure database", "参考图数据库")}</p>
                  <h2 className="mt-1 text-2xl font-semibold">{t("Choose a discipline first", "先选择学科分类")}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    {t(
                      "The template library is organized as a growing database. Pick a discipline folder, then choose the specific figure type inside it.",
                      "模板库会逐步扩展成大型数据库。请先选择学科目录，再进入对应的具体图表类型。"
                    )}
                  </p>
                </div>
                <select className="field w-full max-w-xs md:hidden" value={selectedDisciplineId} onChange={(event) => setSelectedDisciplineId(event.target.value)}>
                  {chartDatabase.map((discipline) => (
                    <option key={discipline.id} value={discipline.id}>{disciplineLabel(discipline)}</option>
                  ))}
                </select>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                <nav className="hidden rounded border border-rule bg-panel p-2 md:block">
                  {chartDatabase.map((discipline) => {
                    const active = discipline.id === selectedDisciplineId;
                    return (
                      <button
                        key={discipline.id}
                        type="button"
                        onClick={() => setSelectedDisciplineId(discipline.id)}
                        className={`mb-2 flex w-full items-start gap-3 rounded border p-3 text-left transition ${
                          active ? "border-accent bg-white" : "border-transparent bg-transparent hover:border-rule hover:bg-white"
                        }`}
                      >
                        <FolderOpen className={`mt-0.5 h-4 w-4 flex-none ${active ? "text-accent" : "text-slate-400"}`} />
                        <span>
                          <span className="block text-sm font-semibold">{disciplineLabel(discipline)}</span>
                          <span className="mt-1 block text-xs leading-5 text-slate-500">{disciplineDescription(discipline)}</span>
                        </span>
                      </button>
                    );
                  })}
                </nav>

                <div className="rounded border border-rule bg-white p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-accent" />
                    <div>
                      <h3 className="text-lg font-semibold">{disciplineLabel(selectedDiscipline)}</h3>
                      <p className="text-sm text-slate-600">{disciplineDescription(selectedDiscipline)}</p>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {selectedDiscipline.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => item.enabled && chooseFigureType(item)}
                        className={`group rounded border p-4 text-left transition ${
                          item.enabled ? "border-rule bg-white hover:border-accent hover:shadow-soft" : "cursor-not-allowed border-rule bg-slate-50 opacity-60"
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <FlaskConical className="h-5 w-5 text-accent" />
                          {item.enabled ? <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-accent" /> : <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t("Coming next", "即将支持")}</span>}
                        </div>
                        <span className="block text-sm font-semibold">{figureLabel(item)}</span>
                        <span className="mt-2 block text-xs leading-5 text-slate-600">{figureDescription(item)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {selectedFigureType && !selectedTemplate && (
            <section className="panel-shell rounded-lg p-5">
              <p className="control-label">{t("Reference template database", "参考模板数据库")}</p>
              <h2 className="mt-1 text-2xl font-semibold">{figureLabel(selectedFigureType)}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {t(
                  "Choose a literature-level reference before uploading data. Each template defines the expected data shape, layout analysis, and final plotting rules.",
                  "请先选择文献级参考模板，再上传数据。每个模板都会定义数据格式、版式分析和最终绘图规则。"
                )}
              </p>
              {templatesForType.length === 0 ? (
                <p className="mt-5 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">{t("Templates for this figure type are planned for a later version.", "该图类型的模板将在后续版本中加入。")}</p>
              ) : (
                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  {templatesForType.map((template) => (
                    <button key={template.id} type="button" onClick={() => chooseTemplate(template)} className="rounded-lg border border-rule bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-accent hover:shadow-soft">
                      <TemplatePreview template={template} />
                      <span className="mt-4 block text-base font-semibold">{templateName(template)}</span>
                      <span className="mt-2 block text-sm leading-6 text-slate-600">{templateDescription(template)}</span>
                      <span className="mt-3 block text-xs text-slate-500">
                        {t("Required:", "\u5fc5\u9700\u5b57\u6bb5\uff1a")} {semanticFieldList(template.required_semantic_fields || [])}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {t("Optional:", "\u53ef\u9009\u5b57\u6bb5\uff1a")} {semanticFieldList(template.optional_semantic_fields || [])}
                      </span>
                      <TemplateAnalysisSummary template={template} />
                      <span className="mt-3 block rounded bg-panel px-3 py-2 text-xs leading-5 text-slate-600">{templateBestUseCase(template)}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {selectedTemplate && (
            <div className="grid gap-4 2xl:grid-cols-[minmax(360px,430px)_minmax(520px,1fr)_330px]">
              <EditableDataWorkspace
                samples={samples}
                activeSampleId={activeSampleId}
                uploading={uploading}
                error={uploadError}
                onActiveSampleChange={setActiveSampleId}
                onSampleNameChange={updateSampleName}
                onSampleUpload={handleSampleUpload}
                onSampleRowsChange={updateSampleRows}
                onAddSample={addSample}
              />
              <FigurePreviewWorkspace
                image={plotImage}
                loading={generating}
                error={plotError}
                warnings={warnings}
                canGenerate={editableRows.length > 0}
                onGenerate={handleGenerate}
                canSave={Boolean(plotImage)}
                onSave={savePlot}
              />
              <div className="grid content-start gap-4">
                <QuickControlsPanel
                  quick={quickControls}
                  advanced={advancedControls}
                  onQuickChange={(settings) => {
                    setQuickControls(settings);
                  }}
                  onAdvancedChange={(settings) => {
                    setAdvancedControls(settings);
                  }}
                />
                {plotImage && <SavedPlotsPanel savedPlots={savedPlots} canSave={Boolean(plotImage)} onSave={savePlot} />}
              </div>
            </div>
          )}
        </div>

        {!selectedTemplate && <div className="grid content-start gap-4">
          {selectedTemplate && dataset ? (
            <QuickControlsPanel
              quick={quickControls}
              advanced={advancedControls}
              onQuickChange={setQuickControls}
              onAdvancedChange={setAdvancedControls}
            />
          ) : (
            <section className="panel-shell rounded-lg p-4">
              <h2 className="text-base font-semibold">{t("Fine tuning", "微调")}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {t("Controls appear after you choose a reference template and upload compatible data.", "选择参考模板并上传匹配数据后，这里会显示相关微调控件。")}
              </p>
            </section>
          )}
          {plotImage && <SavedPlotsPanel savedPlots={savedPlots} canSave={Boolean(plotImage)} onSave={savePlot} />}
        </div>}
      </div>
    </main>
  );
}

