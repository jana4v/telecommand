/**
 * useTitlePosition — maps a `titlePosition` string to SVG x / y / text-anchor
 * values for the SvgMultilineText title label.
 *
 * Nine-slot grid (row × col):
 *   top-left    top-center    top-right
 *   middle-left    center    middle-right
 *   bottom-left bottom-center bottom-right
 *
 * Usage:
 *   const { titleX, titleY, titleAnchor } = useTitlePosition(
 *     () => d.value.titlePosition as string,
 *     () => px.value,          // left edge of the title area
 *     () => areaW.value,       // width of the title area (use mainW for nodes with a side strip)
 *     () => py.value,
 *     () => ph.value,
 *     "top-center",            // default when titlePosition is unset
 *   );
 */
import { computed } from "vue";

export type TitlePosition =
  | "top-left"    | "top-center"    | "top-right"
  | "middle-left" | "center"        | "middle-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

export function useTitlePosition(
  getPosition: () => string | undefined,
  getBaseX:    () => number,
  getAreaW:    () => number,
  getPy:       () => number,
  getPh:       () => number,
  defaultPosition: TitlePosition = "top-center",
) {
  const pos = computed(() => (getPosition() as TitlePosition | undefined) ?? defaultPosition);

  /** Horizontal SVG coordinate */
  const titleX = computed(() => {
    const bx = getBaseX(), aw = getAreaW(), p = pos.value;
    if (p.endsWith("-left"))  return bx + aw * 0.05;
    if (p.endsWith("-right")) return bx + aw * 0.95;
    return bx + aw * 0.50; // center / middle
  });

  /** Vertical SVG coordinate (vertical centre of the text block is at this y) */
  const titleY = computed(() => {
    const py = getPy(), ph = getPh(), p = pos.value;
    if (p.startsWith("top"))    return py + ph * 0.14;
    if (p.startsWith("bottom")) return py + ph * 0.86;
    return py + ph * 0.50; // middle / center
  });

  /** SVG text-anchor value */
  const titleAnchor = computed<string>(() => {
    const p = pos.value;
    if (p.endsWith("-left"))  return "start";
    if (p.endsWith("-right")) return "end";
    return "middle";
  });

  return { titleX, titleY, titleAnchor };
}
