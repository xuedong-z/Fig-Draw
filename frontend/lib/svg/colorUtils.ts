/**
 * Color parsing & classification used across recognition (Module D) and
 * recoloring (Module E). Pure functions, no DOM.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}
export interface HSL {
  h: number; // 0..360
  s: number; // 0..1
  l: number; // 0..1
}

const NAMED: Record<string, string> = {
  black: "#000000",
  white: "#ffffff",
  red: "#ff0000",
  green: "#008000",
  blue: "#0000ff",
  gray: "#808080",
  grey: "#808080",
  none: "none",
  transparent: "none"
};

/** Parse a CSS color string into RGB. Returns null for none/unparseable. */
export function parseColor(input: string | null): RGB | null {
  if (!input) return null;
  let s = input.trim().toLowerCase();
  if (s === "none" || s === "transparent") return null;
  if (s in NAMED) s = NAMED[s];
  if (s === "none") return null;

  if (s.startsWith("#")) {
    let hex = s.slice(1);
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    if (hex.length === 6) {
      const n = parseInt(hex, 16);
      if (Number.isNaN(n)) return null;
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    return null;
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(",").map((p) => parseFloat(p.trim()));
    if (parts.length >= 3) return { r: clamp255(parts[0]), g: clamp255(parts[1]), b: clamp255(parts[2]) };
  }
  return null;
}

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function toHex({ r, g, b }: RGB): string {
  const h = (n: number) => clamp255(n).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** Perceived lightness 0..1 (Rec.709). */
export function luminance({ r, g, b }: RGB): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Achromatic = the channel spread is small (gray/black/white). This is the core
 * signal that separates *structure* (axes/ticks/grid, all gray/black) from
 * *data* (saturated colors).  Module key technical note.
 */
export function isAchromatic(rgb: RGB, threshold = 26): boolean {
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  return max - min < threshold;
}

export type ColorClass = "black" | "white" | "gray" | "data";

export function classifyColor(input: string | null): ColorClass | null {
  const rgb = parseColor(input);
  if (!rgb) return null;
  const lum = luminance(rgb);
  if (isAchromatic(rgb)) {
    if (lum < 0.22) return "black";
    if (lum > 0.9) return "white";
    return "gray";
  }
  return "data";
}

export function isDataColor(input: string | null): boolean {
  return classifyColor(input) === "data";
}

// --- HSL conversions -------------------------------------------------------

export function rgbToHsl({ r, g, b }: RGB): HSL {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

export function hexToHsl(hex: string): HSL {
  return rgbToHsl(parseColor(hex) ?? { r: 0, g: 0, b: 0 });
}
export function hslToHex(hsl: HSL): string {
  return toHex(hslToRgb(hsl));
}

/** Lighten/darken by moving lightness toward 1/0 by `amount` (0..1). */
export function adjustLightness(hex: string, amount: number): string {
  const hsl = hexToHsl(hex);
  hsl.l = Math.max(0, Math.min(1, hsl.l + amount));
  return hslToHex(hsl);
}

export function mix(a: string, b: string, t: number): string {
  const ca = parseColor(a) ?? { r: 0, g: 0, b: 0 };
  const cb = parseColor(b) ?? { r: 0, g: 0, b: 0 };
  return toHex({
    r: ca.r + (cb.r - ca.r) * t,
    g: ca.g + (cb.g - ca.g) * t,
    b: ca.b + (cb.b - ca.b) * t
  });
}

/**
 * Recolor a gradient stop to a target hue while preserving the stop's own
 * lightness (Module key note: keep relative lightness structure, shift hue).
 */
export function recolorToHue(stopHex: string, targetHex: string): string {
  const stop = hexToHsl(stopHex);
  const target = hexToHsl(targetHex);
  return hslToHex({ h: target.h, s: target.s, l: stop.l });
}

/** Derive a 2-stop gradient (light->color) from a single solid color. */
export function deriveGradient(hex: string): { from: string; to: string } {
  return { from: adjustLightness(hex, 0.22), to: adjustLightness(hex, -0.05) };
}
