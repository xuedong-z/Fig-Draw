"use client";

/**
 * Shared file-import pipeline used by both the top-bar Import button and the
 * drag-and-drop drop zone. SVGs go through `importSvg`; raster images (PNG / JPG /
 * WebP / GIF) are read as a data URL + natural size and placed as image panels.
 */

type ImportActions = {
  importSvg: (name: string, raw: string) => void;
  importImage: (name: string, dataUrl: string, iw: number, ih: number) => void;
};

const RASTER_RE = /\.(png|jpe?g|webp|gif|bmp)$/i;

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error ?? new Error("read failed"));
    r.readAsDataURL(file);
  });
}

function imageSize(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth || 400, h: img.naturalHeight || 300 });
    img.onerror = () => resolve({ w: 400, h: 300 });
    img.src = dataUrl;
  });
}

/** Import a batch of dropped/picked files. Unknown types are skipped silently. */
export async function importFiles(
  files: FileList | File[] | null | undefined,
  actions: ImportActions
): Promise<void> {
  if (!files) return;
  for (const file of Array.from(files)) {
    const base = file.name.replace(/\.[^.]+$/, "");
    if (file.type === "image/svg+xml" || /\.svg$/i.test(file.name)) {
      actions.importSvg(base, await file.text());
    } else if (file.type.startsWith("image/") || RASTER_RE.test(file.name)) {
      const dataUrl = await readDataUrl(file);
      const { w, h } = await imageSize(dataUrl);
      actions.importImage(base, dataUrl, w, h);
    }
    // else: not an SVG or supported raster — ignore
  }
}
