import type {
  ComposerSettings,
  DataMapping,
  JournalPreset,
  PlotType,
  QuickControlSettings,
  ReferenceTemplate,
  SavedPlot,
  SemanticStyleOverrides,
  StyleSettings,
  UploadedDataset
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      message = body.detail || message;
    } catch {
      // Keep the HTTP status message.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function uploadDataset(file: File): Promise<UploadedDataset> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    body: formData
  });
  return parseResponse<UploadedDataset>(response);
}

export async function saveEditableDataset(filename: string, rows: Record<string, unknown>[]): Promise<UploadedDataset> {
  const response = await fetch(`${API_BASE}/api/upload/table`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, rows })
  });
  return parseResponse<UploadedDataset>(response);
}

export async function fetchReferenceTemplates(): Promise<ReferenceTemplate[]> {
  return parseResponse<ReferenceTemplate[]>(await fetch(`${API_BASE}/api/reference-templates`));
}

export function referenceTemplatePreviewUrl(templateId: string): string {
  return `${API_BASE}/api/reference-templates/${templateId}/preview`;
}

export async function fetchJournalPresets(): Promise<JournalPreset[]> {
  return parseResponse<JournalPreset[]>(await fetch(`${API_BASE}/api/journal-presets`));
}

export async function generatePlot(payload: {
  dataset_id: string;
  mapping: DataMapping;
  plot_type: PlotType;
  template_id: string;
  style: StyleSettings;
  dpi?: number;
}): Promise<{ image: string; warnings: string[] }> {
  const response = await fetch(`${API_BASE}/api/plot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, dpi: payload.dpi || 300 })
  });
  return parseResponse<{ image: string; warnings: string[] }>(response);
}

export async function generateSemanticPlot(payload: {
  selected_template_id: string;
  uploaded_data_id: string;
  semantic_column_mapping: Record<string, string | undefined>;
  style_overrides: SemanticStyleOverrides;
  quick_control_settings: QuickControlSettings;
  dpi?: number;
}): Promise<{ image: string; warnings: string[] }> {
  const response = await fetch(`${API_BASE}/api/plot/semantic`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, dpi: payload.dpi || payload.style_overrides.dpi || 300 })
  });
  return parseResponse<{ image: string; warnings: string[] }>(response);
}

export async function exportFigure(payload: {
  panels: Array<{ label: string; image: string } | null>;
  settings: ComposerSettings;
}): Promise<{ file: string; mime_type: string }> {
  const response = await fetch(`${API_BASE}/api/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseResponse<{ file: string; mime_type: string }>(response);
}

export function loadSavedPlots(): SavedPlot[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem("sfs.savedPlots") || "[]") as SavedPlot[];
  } catch {
    return [];
  }
}

export function persistSavedPlot(plot: SavedPlot): SavedPlot[] {
  const current = loadSavedPlots().filter((item) => item.slot !== plot.slot);
  const next = [...current, plot].sort((a, b) => a.slot.localeCompare(b.slot));
  window.localStorage.setItem("sfs.savedPlots", JSON.stringify(next));
  return next;
}
