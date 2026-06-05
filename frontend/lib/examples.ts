/** Bundled sample figures (served from /public/samples) for one-click trials.
 * Origin-style SVGs exercise the olab:scope recognizer; the two PNGs exercise the
 * raster image-panel path. */
export interface Example {
  file: string;
  name: string;
  desc: string;
}

export const EXAMPLES: Example[] = [
  { file: "origin_scatter.svg", name: "Scatter", desc: "Origin · 3 clusters + legend" },
  { file: "origin_column.svg", name: "Bar chart", desc: "Origin · grouped columns" },
  { file: "origin_area.svg", name: "Stacked area", desc: "Origin · 3 stacked areas" },
  { file: "origin_doubleY.svg", name: "Double-Y", desc: "Origin · dual axes" },
  { file: "origin_spectra.svg", name: "XRD spectra", desc: "Origin · 4 stacked spectra" },
  { file: "em_micrograph.png", name: "Micrograph", desc: "PNG · electron micrograph" },
  { file: "schematic.png", name: "Schematic", desc: "PNG · mechanism diagram" },
  // line plot last — the tour's "resize the last panel" step uses it (figsize is clearest on a line plot)
  { file: "origin_line.svg", name: "Line plot", desc: "Origin · 3 lines + legend" }
];

/** Fetch a bundled sample and import it — SVGs go through importSvg, raster images
 * (PNG/JPG) through importImage (decoded for their natural size first). */
export async function loadExample(
  ex: Example,
  importSvg: (name: string, raw: string) => void,
  importImage: (name: string, dataUrl: string, iw: number, ih: number) => void
): Promise<void> {
  const res = await fetch(`/samples/${ex.file}`);
  if (!res.ok) throw new Error(`Could not load example "${ex.file}" (${res.status})`);

  if (ex.file.toLowerCase().endsWith(".svg")) {
    importSvg(ex.name, await res.text());
    return;
  }

  // raster: blob → data URL → natural size → importImage
  const blob = await res.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
  const { iw, ih } = await new Promise<{ iw: number; ih: number }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ iw: img.naturalWidth, ih: img.naturalHeight });
    img.onerror = () => reject(new Error("image decode failed"));
    img.src = dataUrl;
  });
  importImage(ex.name, dataUrl, iw, ih);
}
