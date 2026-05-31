/**
 * Module A — pseudo materials/electrochemistry filler text so the page reads
 * like a real paper (not lorem ipsum), without meaning anything.
 */
const FRAGMENTS = [
  "the as-prepared catalyst exhibits a markedly lower overpotential",
  "consistent with the enhanced charge-transfer kinetics observed at the electrode interface",
  "the measured current density scales linearly with the applied potential window",
  "in agreement with the electrochemical impedance spectra recorded under operando conditions",
  "the faradaic efficiency remains above the threshold across the investigated cycling regime",
  "suggesting that the porous architecture facilitates rapid ion diffusion",
  "the specific capacity is retained after prolonged galvanostatic cycling",
  "while the Tafel slope indicates a favorable reaction pathway",
  "the crystalline domains were further resolved by high-resolution microscopy",
  "and the corresponding lattice spacing matches the reference diffraction pattern",
  "the binding energy shift confirms partial oxidation of the active sites",
  "which is corroborated by the complementary spectroscopic analysis",
  "the composite electrode maintains structural integrity at elevated rates",
  "demonstrating robust performance relative to the pristine counterpart",
  "the electrolyte formulation was optimized to suppress parasitic side reactions",
  "yielding a stable solid-electrolyte interphase over extended operation"
];

function pick(rng: () => number): string {
  return FRAGMENTS[Math.floor(rng() * FRAGMENTS.length)];
}

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** A paragraph of `sentences` pseudo-sentences. */
export function fakeParagraph(seed: number, sentences = 4): string {
  const rng = makeRng(seed);
  const out: string[] = [];
  for (let i = 0; i < sentences; i++) {
    const a = pick(rng);
    const b = pick(rng);
    out.push(`${capitalize(a)}, ${b}.`);
  }
  return out.join(" ");
}

export const FIGURE_CAPTION_DEFAULT =
  "Electrochemical characterization of the synthesized electrodes. (a) Representative voltage profiles, (b) rate capability, (c) long-term cycling stability, and (d) the corresponding impedance response.";
