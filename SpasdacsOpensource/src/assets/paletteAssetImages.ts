/** Build-time list: files under assets/images appear in the Elements palette. */
const rasterUrlMap = import.meta.glob("./images/**/*.{png,jpg,jpeg,gif,webp}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

/** Inline SVG text — used for SvgGraphic nodes (telemetry per element), not as <image> URLs. */
const svgRawMap = import.meta.glob("./images/**/*.svg", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

export type PaletteRasterAsset = { kind: "raster"; key: string; url: string; label: string };
export type PaletteSvgAsset = { kind: "svg"; key: string; svgMarkup: string; label: string };
export type PaletteLibraryAsset = PaletteRasterAsset | PaletteSvgAsset;

function labelFromPath(path: string): string {
  const file = path.replace(/^.*\/images\//, "");
  return file.replace(/\.[^.]+$/, "");
}

export function getPaletteLibraryAssets(): PaletteLibraryAsset[] {
  const rasters: PaletteRasterAsset[] = Object.entries(rasterUrlMap).map(([path, url]) => ({
    kind: "raster" as const,
    key: path,
    url,
    label: labelFromPath(path),
  }));
  const svgs: PaletteSvgAsset[] = Object.entries(svgRawMap).map(([path, svgMarkup]) => ({
    kind: "svg" as const,
    key: path,
    svgMarkup,
    label: labelFromPath(path),
  }));
  return [...rasters, ...svgs].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
}

/**
 * Fetches images from the runtime-mounted volume (/spasdacs/palette-images/).
 * Files placed there appear in the Elements palette without rebuilding the image.
 * SVG content is fetched as raw text so SvgGraphic nodes work correctly.
 */
export async function fetchRuntimePaletteAssets(): Promise<PaletteLibraryAsset[]> {
  try {
    const res = await fetch("/spasdacs/palette-images/", { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const entries: Array<{ name: string; type: string }> = await res.json();
    const files = entries.filter(e => e.type === "file");
    const assets = await Promise.all(
      files.map(async (entry): Promise<PaletteLibraryAsset | null> => {
        const url = `/spasdacs/palette-images/${entry.name}`;
        const label = entry.name.replace(/\.[^.]+$/, "");
        if (/\.svg$/i.test(entry.name)) {
          const svgRes = await fetch(url);
          if (!svgRes.ok) return null;
          const svgMarkup = await svgRes.text();
          return { kind: "svg", key: url, svgMarkup, label };
        }
        if (/\.(png|jpg|jpeg|gif|webp)$/i.test(entry.name)) {
          return { kind: "raster", key: url, url, label };
        }
        return null;
      })
    );
    return assets.filter((a): a is PaletteLibraryAsset => a !== null);
  } catch {
    return [];
  }
}

/** @deprecated use getPaletteLibraryAssets */
export function getPaletteAssetImages(): PaletteLibraryAsset[] {
  return getPaletteLibraryAssets();
}

export type PaletteAssetImage = PaletteLibraryAsset;
