/**
 * Module H — export. Builds a single figure-only SVG (panels + labels, no page
 * chrome/watermark) and rasterizes it to PNG at a target DPI.
 */
import type { Panel, PanelLabelStyle, ExportSettings } from "./types";
import { formatLabel } from "./store";

export interface FigureBuild {
  svg: string;
  widthPx: number; // intrinsic figure-space width
  heightPx: number;
}

/** Content bounding box of all panels in figure space. */
export function figureBounds(panels: Panel[]): { w: number; h: number } {
  if (panels.length === 0) return { w: 400, h: 300 };
  let maxX = 0;
  let maxY = 0;
  for (const p of panels) {
    maxX = Math.max(maxX, p.x + p.w);
    maxY = Math.max(maxY, p.y + p.h);
  }
  return { w: Math.ceil(maxX), h: Math.ceil(maxY) };
}

function labelXY(p: Panel, style: PanelLabelStyle, fontPx: number) {
  const pad = fontPx * 0.4;
  switch (style.position) {
    case "tr":
      return { x: p.x + p.w - pad, y: p.y + fontPx, anchor: "end" };
    case "bl":
      return { x: p.x + pad, y: p.y + p.h - pad, anchor: "start" };
    case "br":
      return { x: p.x + p.w - pad, y: p.y + p.h - pad, anchor: "end" };
    default:
      return { x: p.x + pad, y: p.y + fontPx, anchor: "start" };
  }
}

/** Strip the outer <svg> of a panel and re-wrap as a nested <svg> at its rect. */
function nestPanel(p: Panel): string {
  const doc = new DOMParser().parseFromString(p.svg, "image/svg+xml");
  const root = doc.documentElement;
  const vb = `${p.vb.x} ${p.vb.y} ${p.vb.w} ${p.vb.h}`;
  const inner = root.innerHTML;
  // preserveAspectRatio none -> the panel fills its (independently sized) rect
  return `<svg x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" viewBox="${vb}" preserveAspectRatio="none" overflow="visible">${inner}</svg>`;
}

export function buildFigureSvg(
  panels: Panel[],
  labelStyle: PanelLabelStyle,
  opts: { transparent: boolean }
): FigureBuild {
  const { w, h } = figureBounds(panels);
  const ordered = [...panels].sort((a, b) => a.order - b.order);

  const bg = opts.transparent ? "" : `<rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>`;

  const body = ordered.map(nestPanel).join("\n");

  const labels = ordered
    .map((p, i) => {
      const text = formatLabel(i, labelStyle.format);
      if (!text) return "";
      const fontPx = labelStyle.fontSizePt * 1.333; // pt -> px @96dpi
      const { x, y, anchor } = labelXY(p, labelStyle, fontPx);
      const backing = labelStyle.whiteBacking
        ? `<rect x="${x - (anchor === "end" ? fontPx * 1.4 : 0) - 2}" y="${y - fontPx}" width="${fontPx * 1.6}" height="${fontPx * 1.25}" fill="#ffffff" opacity="0.85"/>`
        : "";
      return `${backing}<text x="${x}" y="${y}" font-family="${labelStyle.fontFamily}" font-size="${fontPx}" font-weight="${
        labelStyle.bold ? "700" : "400"
      }" fill="${labelStyle.color}" text-anchor="${anchor}">${text}</text>`;
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bg}${body}${labels}</svg>`;
  return { svg, widthPx: w, heightPx: h };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportSvgFile(build: FigureBuild, filename: string): Promise<void> {
  const blob = new Blob([build.svg], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, filename);
}

/** Rasterize the figure SVG to PNG at the requested physical size + DPI. */
export async function exportPng(
  build: FigureBuild,
  settings: ExportSettings,
  filename: string
): Promise<void> {
  const targetW = Math.round((settings.widthMm * settings.dpi) / 25.4);
  const targetH = Math.round(targetW * (build.heightPx / build.widthPx));

  // Make sure fonts are ready so canvas text renders correctly.
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
  }

  const blob = new Blob([build.svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d")!;
    if (!settings.transparent) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, targetW, targetH);
    }
    ctx.drawImage(img, 0, 0, targetW, targetH);
    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (pngBlob) downloadBlob(pngBlob, filename);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Auto filename, e.g. Figure1_183x120mm_300dpi.png */
export function exportFilename(settings: ExportSettings, heightMm: number): string {
  const w = Math.round(settings.widthMm);
  const h = Math.round(heightMm);
  return `Figure1_${w}x${h}mm_${settings.dpi}dpi.${settings.format}`;
}
