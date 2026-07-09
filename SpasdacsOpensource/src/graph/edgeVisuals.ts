import { Edge } from "@antv/x6";

/** Inspector / telemetry options for line endpoints */
export const EDGE_MARKER_OPTIONS: { value: string; label: string }[] = [
  { value: "none", label: "None" },
  { value: "classic", label: "Arrow (classic)" },
  { value: "block", label: "Block" },
  { value: "ellipse", label: "Ellipse" },
  { value: "diamond", label: "Diamond" },
  { value: "cross", label: "Cross" },
  { value: "circle", label: "Circle" },
  { value: "async", label: "Async" },
];

/**
 * Sentinel object for "no marker".
 *
 * WHY NOT null/false:  X6's ObjectAttr.qualify() returns true only for plain
 * objects.  null and false both fail the qualify check, so X6 skips the attr
 * entirely and its shape default (classic arrow) shows through.
 *
 * A zero-length SVG path IS a valid object: it passes qualify, serialises to
 * JSON, and renders nothing visible, so it acts as a reliable "no arrow" value
 * that survives save/load without the shape default bleeding back in.
 *
 * WHY name: null:  X6's setAttrs() uses Lodash merge, so setting
 * { d: "M 0 0" } is MERGED into the existing marker object rather than
 * replacing it.  A previous { name: "classic" } would survive the merge and
 * X6 would keep rendering that named marker.  Lodash merge propagates null
 * (unlike undefined which is skipped), so name: null explicitly clears the
 * name field and X6 falls through to the path-based "d" rendering.
 */
const NO_MARKER: Record<string, unknown> = { name: null, d: "M 0 0" };

function isNoMarker(val: unknown): boolean {
  return (
    val != null &&
    typeof val === "object" &&
    (val as Record<string, unknown>).d === "M 0 0" &&
    !(val as Record<string, unknown>).name
  );
}

export function markerKeyToAttr(key: string | undefined | null): Record<string, unknown> {
  const k = (key ?? "none").trim();
  if (!k || k === "none") return NO_MARKER;
  const size = 8;
  switch (k) {
    case "classic":
      return { name: "classic", size };
    case "block":
      return { name: "block", size };
    case "ellipse":
      return { name: "ellipse", rx: 5, ry: 5 };
    case "diamond":
      return { name: "diamond", size };
    case "cross":
      return { name: "cross", size };
    case "circle":
      return { name: "circle", r: 5 };
    case "async":
      return { name: "async", width: 14, height: 18, offset: 5 };
    default:
      return { name: "classic", size };
  }
}

export function applyEdgeMarkerEnd(edge: Edge, end: "source" | "target", markerKey: string | undefined | null): void {
  const path = end === "source" ? "line/sourceMarker" : "line/targetMarker";
  const attr = markerKeyToAttr(markerKey ?? undefined);
  const current = edge.attr(path) as Record<string, unknown> | null | undefined;

  if (isNoMarker(attr)) {
    // "none" desired — skip the set if the sentinel is already in place.
    if (isNoMarker(current)) return;
    edge.attr(path, NO_MARKER as any);
    return;
  }

  // Named-marker case: compare by name to skip redundant sets.
  const currentName = current && typeof current === "object" ? (current as { name?: string }).name ?? null : null;
  const nextName = (attr as { name?: string }).name ?? null;
  if (currentName === nextName) return;
  edge.attr(path, attr as any);
}

/** Middle label from `labelText` in cell data; clears when empty. */
export function syncEdgeLabelFromText(edge: Edge, text: string | undefined | null): void {
  const t = String(text ?? "").trim();
  const labels = edge.getLabels() as Array<{ attrs?: { label?: { text?: string }; text?: { text?: string } } }>;
  const first = labels[0];
  const current = first?.attrs?.label?.text ?? first?.attrs?.text?.text ?? "";
  if (String(current).trim() === t) return;
  if (!t) {
    edge.setLabels([]);
    return;
  }
  edge.setLabels([Edge.parseStringLabel(t)]);
}

function rawMarkerName(edge: Edge, end: "source" | "target"): string | null {
  const path = end === "source" ? "line/sourceMarker" : "line/targetMarker";
  const raw = edge.attr(path) as Record<string, unknown> | null | undefined;
  if (isNoMarker(raw)) return "none";      // explicit "no marker" sentinel
  if (raw == null) return null;
  if (typeof raw === "object" && raw.name) return String(raw.name);
  return null;
}

export function inferMarkerKeyFromEdge(edge: Edge, end: "source" | "target", data: Record<string, unknown>): string {
  const dk = end === "source" ? "sourceMarker" : "targetMarker";
  const fromData = data[dk];
  if (typeof fromData === "string" && fromData.length) return fromData;
  const fromAttr = rawMarkerName(edge, end);
  if (fromAttr) return fromAttr;
  return end === "target" ? "classic" : "none";
}

export function readEdgeLabelText(edge: Edge, data: Record<string, unknown>): string {
  if (typeof data.labelText === "string") return data.labelText;
  const labels = edge.getLabels() as Array<{ attrs?: { label?: { text?: string }; text?: { text?: string } } }>;
  const first = labels[0];
  const t = first?.attrs?.label?.text ?? first?.attrs?.text?.text;
  return t != null ? String(t) : "";
}

/** Apply stroke / width / opacity / markers / label from serialized `data` (after load or telemetry). */
export function applyEdgeVisualsFromData(edge: Edge, data: Record<string, unknown>): void {
  if (data.stroke) {
    const stroke = data.stroke as string;
    if (edge.attr("line/stroke") !== stroke) edge.attr("line/stroke", stroke);
  }
  if (data.strokeWidth != null) {
    const w = data.strokeWidth as number;
    if (Number(edge.attr("line/strokeWidth")) !== Number(w)) edge.attr("line/strokeWidth", w);
  }
  if (data.opacity !== undefined) {
    const op = data.opacity as number;
    if (Number(edge.attr("line/opacity")) !== Number(op)) edge.attr("line/opacity", op);
  }
  // Only apply markers when explicitly stored in data.
  // Skipping undefined prevents overwriting X6's built-in default arrow on
  // edges that were never given an explicit marker setting.
  if ("sourceMarker" in data) applyEdgeMarkerEnd(edge, "source", data.sourceMarker as string | undefined);
  if ("targetMarker" in data) applyEdgeMarkerEnd(edge, "target", data.targetMarker as string | undefined);
  syncEdgeLabelFromText(edge, data.labelText as string | undefined);
}
