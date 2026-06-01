/** Bundled sample figures (served from /public/samples) for one-click trials. */
export interface Example {
  file: string;
  name: string;
  desc: string;
}

export const EXAMPLES: Example[] = [
  { file: "seaborn_grid.svg", name: "Line plot", desc: "seaborn · grid + 3 lines" },
  { file: "origin_xrd.svg", name: "XRD patterns", desc: "Origin · stacked spectra + full frame" },
  { file: "prism_bars.svg", name: "Bar chart", desc: "GraphPad Prism · bars + error bars" },
  { file: "electro.svg", name: "Electrocatalysis", desc: "matplotlib · lines + scatter + legend" },
  { file: "scatter_clusters.svg", name: "Scatter", desc: "points · 3 clusters + legend" },
  { file: "multiline.svg", name: "Multi-line", desc: "lines · 4 curves (one dashed)" },
  { file: "area_stacked.svg", name: "Stacked area", desc: "fill · 3 stacked layers" },
  { file: "mixed_fit.svg", name: "Mixed", desc: "point + line + band · 2 series" }
];

/** Fetch a bundled sample and import it as a panel. */
export async function loadExample(
  ex: Example,
  importSvg: (name: string, raw: string) => void
): Promise<void> {
  const res = await fetch(`/samples/${ex.file}`);
  if (!res.ok) throw new Error(`Could not load example "${ex.file}" (${res.status})`);
  importSvg(ex.name, await res.text());
}
