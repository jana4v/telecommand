/** Sanitize pasted SVG: strip scripts and event handlers. */
export function sanitizeSvgMarkup(s: string): string {
  const doc = new DOMParser().parseFromString(s, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) return "";
  const strip = (el: Element) => {
    const tag = el.tagName.toLowerCase();
    if (tag === "script") {
      el.remove();
      return;
    }
    [...el.attributes].forEach(a => {
      const n = a.name.toLowerCase();
      if (n.startsWith("on")) el.removeAttribute(a.name);
      if (n === "href" && /^javascript:/i.test(a.value)) el.removeAttribute(a.name);
    });
    [...el.children].forEach(c => strip(c));
  };
  strip(svg);
  svg.querySelectorAll("foreignObject").forEach(f => f.remove());
  return svg.outerHTML;
}

const ID_TAGS = new Set([
  "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "g", "text", "image", "use",
]);

/** Ensure bindable ids on drawable SVG children (mutates DOM, returns serialized SVG). */
export function ensureSvgElementIds(svgString: string): string {
  const doc = new DOMParser().parseFromString(svgString, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) return svgString;
  let seq = 0;
  svg.querySelectorAll("*").forEach(el => {
    const t = el.tagName.toLowerCase();
    if (!ID_TAGS.has(t)) return;
    if (el.id) return;
    el.id = `svg-el-${++seq}`;
  });
  return svg.outerHTML;
}

/** Convert an SVG length attribute value to CSS pixels (96 dpi). */
function svgAttrToPx(attr: string | null): number {
  if (!attr) return NaN;
  const m = attr.trim().match(/^([0-9.eE+\-]+)\s*(px|mm|cm|in|pt|pc|)$/i);
  if (!m) return NaN;
  const n = parseFloat(m[1]);
  switch (m[2].toLowerCase()) {
    case "mm": return n * 96 / 25.4;
    case "cm": return n * 96 / 2.54;
    case "in": return n * 96;
    case "pt": return n * 96 / 72;
    case "pc": return n * 96 / 6;
    default:   return n; // "px" or unitless → already pixels
  }
}

export function parseSvgRootDimensions(svgString: string): { width: number; height: number } {
  const doc = new DOMParser().parseFromString(svgString, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) return { width: 200, height: 150 };
  let w = svgAttrToPx(svg.getAttribute("width"));
  let h = svgAttrToPx(svg.getAttribute("height"));
  const vb = svg.viewBox?.baseVal;
  if (!Number.isFinite(w) && vb && vb.width > 0) w = vb.width;
  if (!Number.isFinite(h) && vb && vb.height > 0) h = vb.height;
  if (!Number.isFinite(w)) w = 200;
  if (!Number.isFinite(h)) h = 150;
  return { width: Math.max(24, w), height: Math.max(24, h) };
}

/**
 * Return the SVG at its true declared pixel size (width/height attrs → px via unit
 * conversion). The original viewBox is preserved so SVG user coordinates map 1:1 to
 * canvas units — essential for overlaying component nodes at the correct position.
 *
 * Only the width/height attributes are stripped from the SVG element itself so that
 * CSS `width:100%; height:100%` controls rendering inside the X6 node.
 */
export async function cropSvgToContent(
  svgString: string,
): Promise<{ svgMarkup: string; width: number; height: number }> {
  const fallback = () => ({ svgMarkup: svgString, ...parseSvgRootDimensions(svgString) });

  // Parse true pixel dimensions from the SVG's declared attributes.
  const doc = new DOMParser().parseFromString(svgString, "image/svg+xml");
  const svgEl = doc.querySelector("svg");
  if (!svgEl) return fallback();

  let pxW = svgAttrToPx(svgEl.getAttribute("width"));
  let pxH = svgAttrToPx(svgEl.getAttribute("height"));
  const vb = svgEl.viewBox?.baseVal;

  // If attributes use a non-pixel unit (e.g. mm) and viewBox differs, compute
  // the pixel-per-user-unit ratio and apply it to the viewBox size.
  if (Number.isFinite(pxW) && vb && vb.width > 0) {
    // pxPerUserUnit: how many CSS pixels equal one SVG user unit
    const ratio = pxW / vb.width;
    if (!Number.isFinite(pxH)) pxH = vb.height * ratio;
  } else if (vb && vb.width > 0) {
    // No unit-bearing attrs — fall back to viewBox dimensions (user units ≈ px)
    pxW = vb.width;
    pxH = vb.height;
  }

  if (!Number.isFinite(pxW) || pxW < 1) return fallback();
  if (!Number.isFinite(pxH) || pxH < 1) return fallback();

  // Preserve the original viewBox so coordinate mapping is unchanged.
  // Strip the fixed width/height so CSS 100%/100% controls rendering.
  svgEl.removeAttribute("width");
  svgEl.removeAttribute("height");

  const svgMarkup = svgEl.outerHTML;
  const width  = Math.max(24, Math.round(pxW));
  const height = Math.max(24, Math.round(pxH));

  return { svgMarkup, width, height };
}

/** Extract first <svg>...</svg> from HTML or plain text. */
export function extractSvgFromClipboard(html?: string, plain?: string): string | null {
  const tryParse = (raw: string): string | null => {
    const s = raw.trim();
    if (!s.includes("<svg")) return null;
    const doc = new DOMParser().parseFromString(s, "image/svg+xml");
    const svg = doc.querySelector("svg");
    if (svg) return svg.outerHTML;
    const hdoc = new DOMParser().parseFromString(raw, "text/html");
    const hsvg = hdoc.querySelector("svg");
    return hsvg ? hsvg.outerHTML : null;
  };
  return tryParse(html || "") || tryParse(plain || "") || null;
}
