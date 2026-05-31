/**
 * Module C1 — unified style access.
 *
 * SVG exporters store styling in two different ways:
 *   - inline CSS:        <path style="stroke:#1f77b4;stroke-width:1.5"/>   (matplotlib)
 *   - presentation attr: <polyline stroke="#FF0000" stroke-width="2"/>     (Origin/GraphPad)
 *
 * These helpers read/write a property regardless of where it lives, and on write
 * they update *every* location that currently holds it (CSS `style` wins over a
 * presentation attribute when both are present, so we keep them consistent).
 */

/** Parse an inline `style="a:b;c:d"` string into a map. */
export function parseStyle(style: string | null): Record<string, string> {
  const map: Record<string, string> = {};
  if (!style) return map;
  for (const decl of style.split(";")) {
    const idx = decl.indexOf(":");
    if (idx === -1) continue;
    const key = decl.slice(0, idx).trim();
    const val = decl.slice(idx + 1).trim();
    if (key) map[key] = val;
  }
  return map;
}

export function serializeStyle(map: Record<string, string>): string {
  return Object.entries(map)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}

/**
 * Read a style property. Inline `style` takes priority (it overrides attributes
 * in SVG), then the presentation attribute.
 */
export function getStyleValue(el: Element, prop: string): string | null {
  const styleMap = parseStyle(el.getAttribute("style"));
  if (prop in styleMap) return styleMap[prop];
  const attr = el.getAttribute(prop);
  return attr ?? null;
}

/**
 * Write a style property in whatever location(s) currently hold it. If it lives
 * nowhere yet, prefer the existing `style` attribute if the element already uses
 * inline CSS, otherwise set a presentation attribute.
 */
export function setStyleValue(el: Element, prop: string, value: string): void {
  const styleAttr = el.getAttribute("style");
  const styleMap = parseStyle(styleAttr);
  const hasInline = prop in styleMap;
  const hasAttr = el.hasAttribute(prop);

  if (hasInline) {
    styleMap[prop] = value;
    el.setAttribute("style", serializeStyle(styleMap));
  }
  if (hasAttr) {
    el.setAttribute(prop, value);
  }
  if (!hasInline && !hasAttr) {
    if (styleAttr !== null) {
      // element already uses inline CSS — keep the convention
      styleMap[prop] = value;
      el.setAttribute("style", serializeStyle(styleMap));
    } else {
      el.setAttribute(prop, value);
    }
  }
}

/** Remove a style property from both inline style and attribute. */
export function removeStyleValue(el: Element, prop: string): void {
  const styleMap = parseStyle(el.getAttribute("style"));
  if (prop in styleMap) {
    delete styleMap[prop];
    const s = serializeStyle(styleMap);
    if (s) el.setAttribute("style", s);
    else el.removeAttribute("style");
  }
  if (el.hasAttribute(prop)) el.removeAttribute(prop);
}

/** Convenience: read a numeric style value (e.g. stroke-width). */
export function getStyleNumber(el: Element, prop: string): number | null {
  const v = getStyleValue(el, prop);
  if (v == null) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
