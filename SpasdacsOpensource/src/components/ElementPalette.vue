<template>
  <aside class="palette">
    <div class="palette-titlebar">
      <span class="palette-title">Elements</span>
      <div class="palette-collapse-btns">
        <button class="palette-collapse-btn" title="Expand all" @click="expandAll">+</button>
        <button class="palette-collapse-btn" title="Collapse all" @click="collapseAll">−</button>
      </div>
    </div>

    <div class="palette-search">
      <input v-model="search" placeholder="Search…" class="palette-search-input" />
    </div>

    <div class="palette-list">
      <!-- ── Grouped diagram elements ───────────────────────────── -->
      <template v-for="group in filteredGroups" :key="group.section">
        <button
          class="palette-section-header"
          @click="toggleSection(group.section)"
          :title="group.section"
        >
          <span class="palette-section-chevron" :class="{ collapsed: collapsedSections.has(group.section) }">▾</span>
          <span class="palette-section-name">{{ group.section }}</span>
          <span class="palette-section-count">{{ group.items.length }}</span>
        </button>
        <template v-if="!collapsedSections.has(group.section)">
          <div
            v-for="item in group.items"
            :key="item.category"
            class="palette-item"
            draggable="true"
            @dragstart="onDragStart($event, item)"
            :title="item.label"
          >
            <svg class="palette-icon" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <component :is="iconFor(item.category)" />
            </svg>
            <span class="palette-label">{{ item.label }}</span>
          </div>
        </template>
      </template>

      <!-- ── SVG file library ───────────────────────────────────── -->
      <template v-if="filteredSvgAssets.length">
        <button class="palette-section-header" @click="toggleSection('__svg__')">
          <span class="palette-section-chevron" :class="{ collapsed: collapsedSections.has('__svg__') }">▾</span>
          <span class="palette-section-name">SVG Files</span>
          <span class="palette-section-count">{{ filteredSvgAssets.length }}</span>
        </button>
        <template v-if="!collapsedSections.has('__svg__')">
          <div
            v-for="asset in filteredSvgAssets"
            :key="asset.key"
            class="palette-item palette-item-asset"
            draggable="true"
            @dragstart="onSvgLibraryDragStart($event, asset)"
            :title="asset.label + '\nClick paths in canvas to assign telemetry'"
          >
            <div class="palette-thumb palette-thumb-svg-preview" v-html="asset.svgMarkup" />
            <span class="palette-label">{{ asset.label }}</span>
          </div>
        </template>
      </template>

      <!-- ── Raster image library ───────────────────────────────── -->
      <template v-if="filteredRasterAssets.length">
        <button class="palette-section-header" @click="toggleSection('__img__')">
          <span class="palette-section-chevron" :class="{ collapsed: collapsedSections.has('__img__') }">▾</span>
          <span class="palette-section-name">Image Library</span>
          <span class="palette-section-count">{{ filteredRasterAssets.length }}</span>
        </button>
        <template v-if="!collapsedSections.has('__img__')">
          <div
            v-for="asset in filteredRasterAssets"
            :key="asset.key"
            class="palette-item palette-item-asset"
            draggable="true"
            @dragstart="onRasterLibraryDragStart($event, asset)"
            :title="asset.label"
          >
            <img class="palette-thumb" :src="asset.url" :alt="asset.label" draggable="false" />
            <span class="palette-label">{{ asset.label }}</span>
          </div>
        </template>
      </template>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, h, onMounted, type Component } from "vue";
import { PALETTE_ITEMS } from "../types";
import { getPaletteLibraryAssets, fetchRuntimePaletteAssets, type PaletteRasterAsset, type PaletteSvgAsset, type PaletteLibraryAsset } from "../assets/paletteAssetImages";
import { sanitizeSvgMarkup, ensureSvgElementIds } from "../nodes/svgGraphicUtils";

const emit = defineEmits<{
  (e: "drag-start", payload: { category: string; event: DragEvent; defaults?: Record<string, unknown> }): void;
}>();

const search = ref("");
const paletteLibrary = ref(getPaletteLibraryAssets());

// All unique section names in declaration order
const ALL_SECTIONS = [...new Set(PALETTE_ITEMS.map(p => p.section ?? "Other")),
  "__svg__", "__img__"];

// Default: all sections collapsed
const collapsedSections = ref<Set<string>>(new Set(ALL_SECTIONS));

function toggleSection(section: string) {
  const s = new Set(collapsedSections.value);
  if (s.has(section)) s.delete(section);
  else s.add(section);
  collapsedSections.value = s;
}

function expandAll()  { collapsedSections.value = new Set(); }
function collapseAll() { collapsedSections.value = new Set(ALL_SECTIONS); }

onMounted(async () => {
  const runtime = await fetchRuntimePaletteAssets();
  if (runtime.length) {
    paletteLibrary.value = [...paletteLibrary.value, ...runtime].sort(
      (a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
    );
  }
});

/** Items matching the search query */
const filtered = computed(() =>
  PALETTE_ITEMS.filter(p => p.label.toLowerCase().includes(search.value.toLowerCase()))
);

/** Items grouped by section, preserving declaration order, filtered by search */
const filteredGroups = computed(() => {
  const map = new Map<string, typeof PALETTE_ITEMS>();
  for (const item of filtered.value) {
    const sec = item.section ?? "Other";
    if (!map.has(sec)) map.set(sec, []);
    map.get(sec)!.push(item);
  }
  return Array.from(map.entries()).map(([section, items]) => ({ section, items }));
});

function matchesSearch(a: PaletteLibraryAsset) {
  return a.label.toLowerCase().includes(search.value.toLowerCase());
}

const filteredSvgAssets = computed(() =>
  paletteLibrary.value.filter(a => a.kind === "svg" && matchesSearch(a)) as PaletteSvgAsset[]
);

const filteredRasterAssets = computed(() =>
  paletteLibrary.value.filter(a => a.kind === "raster" && matchesSearch(a)) as PaletteRasterAsset[]
);

function onDragStart(event: DragEvent, item: typeof PALETTE_ITEMS[0]) {
  event.dataTransfer?.setData("text/plain", JSON.stringify({ category: item.category, defaults: item.defaults }));
  emit("drag-start", { category: item.category, event });
}

function onRasterLibraryDragStart(event: DragEvent, asset: PaletteRasterAsset) {
  const base = PALETTE_ITEMS.find(p => p.category === "Image")?.defaults ?? {};
  const defaults = { ...base, imageSource: asset.url, name: asset.label };
  event.dataTransfer?.setData("text/plain", JSON.stringify({ category: "Image", defaults }));
  emit("drag-start", { category: "Image", event, defaults });
}

function onSvgLibraryDragStart(event: DragEvent, asset: PaletteSvgAsset) {
  const clean = sanitizeSvgMarkup(asset.svgMarkup);
  const withIds = ensureSvgElementIds(clean || asset.svgMarkup);
  const defaults: Record<string, unknown> = {
    name: asset.label,
    svgMarkup: withIds,
    svgOverrides: {},
    svgSelectedElementId: "",
    fill: "transparent",
    stroke: "#30363d",
    strokeWidth: 1,
    statusColor: "",
    statusText: "",
  };
  event.dataTransfer?.setData("text/plain", JSON.stringify({ category: "SvgGraphic", defaults }));
  emit("drag-start", { category: "SvgGraphic", event, defaults });
}

// Tiny inline SVG icons per category
function iconFor(category: string): Component {
  const icons: Record<string, () => any> = {
    Valve:          () => h("g", [
      h("polygon", { points: "4,4 36,36 36,4 4,36", fill: "#4a9eff", stroke: "#a8a8b8", "stroke-width": "2" }),
      h("rect", { x: "17", y: "0", width: "6", height: "10", fill: "#a8a8b8" }),
    ]),
    Tank:           () => h("g", [
      // top pipe fitting
      h("rect", { x: "15", y: "0", width: "10", height: "6", fill: "#0c1828", stroke: "#253a50", "stroke-width": "1", rx: "1.5" }),
      // body
      h("rect", { x: "6", y: "5", width: "28", height: "32", fill: "#08121e", stroke: "#8899aa", "stroke-width": "2.5", rx: "5" }),
      // fluid fill (wave path ~60% full, blue)
      h("path", { d: "M 6 18.2 Q 13 17 20 18.2 Q 27 19.5 34 18.2 L 34 37 L 6 37 Z", fill: "#2d8fdd", opacity: "0.82" }),
      // cylindrical shading
      h("rect", { x: "6", y: "5", width: "28", height: "32", fill: "url(#pal-side)", rx: "5", opacity: "0.6" }),
      // barrel bands
      h("line", { x1: "7", y1: "16", x2: "33", y2: "16", stroke: "#1c3550", "stroke-width": "1.5" }),
      h("line", { x1: "7", y1: "27", x2: "33", y2: "27", stroke: "#1c3550", "stroke-width": "1.5" }),
      // body outline on top
      h("rect", { x: "6", y: "5", width: "28", height: "32", fill: "none", stroke: "#8899aa", "stroke-width": "2.5", rx: "5" }),
      // top cap ellipse
      h("ellipse", { cx: "20", cy: "8", rx: "11", ry: "3.5", fill: "none", stroke: "#2a4a62", "stroke-width": "1", opacity: "0.7" }),
      // bottom pipe
      h("rect", { x: "16", y: "36", width: "8", height: "5", fill: "#0c1828", stroke: "#253a50", "stroke-width": "1", rx: "1.5" }),
    ]),
    Gauge:          () => h("g", [
      // outer glow
      h("circle", { cx: "20", cy: "20", r: "19", fill: "none", stroke: "#27ae60", "stroke-width": "1.2", opacity: "0.18" }),
      // metallic bezel
      h("circle", { cx: "20", cy: "20", r: "17", fill: "#b0b0c8" }),
      // face
      h("circle", { cx: "20", cy: "20", r: "13", fill: "#0c1a28" }),
      // green zone arc (~0-50%)
      h("path", { d: "M 7.8 26.3 A 11 11 0 0 1 20 9", fill: "none", stroke: "#27ae60", "stroke-width": "4", "stroke-linecap": "butt", opacity: "0.25" }),
      // orange zone (~50-80%)
      h("path", { d: "M 20 9 A 11 11 0 0 1 29.5 14.5", fill: "none", stroke: "#ff9800", "stroke-width": "4", "stroke-linecap": "butt", opacity: "0.25" }),
      // red zone (~80-100%)
      h("path", { d: "M 29.5 14.5 A 11 11 0 0 1 32.2 26.3", fill: "none", stroke: "#e74c3c", "stroke-width": "4", "stroke-linecap": "butt", opacity: "0.25" }),
      // arc track
      h("path", { d: "M 7.8 26.3 A 11 11 0 1 1 32.2 26.3", fill: "none", stroke: "#0e1e2e", "stroke-width": "3", "stroke-linecap": "round" }),
      // arc fill (~60% green)
      h("path", { d: "M 7.8 26.3 A 11 11 0 0 1 27 12.5", fill: "none", stroke: "#27ae60", "stroke-width": "3", "stroke-linecap": "round" }),
      // major ticks
      h("line", { x1: "7.4", y1: "24.6", x2: "9.8",  y2: "20.6", stroke: "#8899aa", "stroke-width": "1.2" }),
      h("line", { x1: "20",  y1: "7",    x2: "20",    y2: "10.5", stroke: "#8899aa", "stroke-width": "1.2" }),
      h("line", { x1: "32.6",y1: "24.6", x2: "30.2",  y2: "20.6", stroke: "#8899aa", "stroke-width": "1.2" }),
      // needle shadow
      h("polygon", { points: "20,20 19.2,20.5 20,10.8 20.8,20.5", fill: "rgba(0,0,0,0.4)" }),
      // needle (pointing ~60%)
      h("polygon", { points: "20,20 19.2,20.5 20,10.8 20.8,20.5", fill: "#27ae60" }),
      // hub
      h("circle", { cx: "20", cy: "20", r: "3", fill: "#1e2c3a", stroke: "#27ae60", "stroke-width": "0.8" }),
      h("circle", { cx: "20", cy: "20", r: "1.2", fill: "#c8dff0" }),
      // value badge
      h("rect", { x: "13", y: "24", width: "14", height: "7", rx: "1.5", fill: "#030a12", stroke: "#27ae60", "stroke-width": "0.6" }),
      h("text", { x: "20", y: "29.5", "text-anchor": "middle", "font-size": "4.5", fill: "#27ae60", "font-weight": "700", "font-family": "monospace" }, "60.0"),
    ]),
    TWTA:           () => h("g", [
      h("rect", { x: "4", y: "6", width: "32", height: "28", fill: "#22223a", stroke: "#4a9eff", "stroke-width": "2", rx: "4" }),
      h("text", { x: "20", y: "22", "text-anchor": "middle", "font-size": "8", fill: "#e6edf3", "font-weight": "bold" }, "TWTA"),
    ]),
    DriverAmplifier: () => h("g", [
      h("line",    { x1: "2",  y1: "20", x2: "8",  y2: "20", stroke: "#a8a8b8", "stroke-width": "1.5" }),
      h("polygon", { points: "8,8 33,20 8,32", fill: "#1e2e3e", stroke: "#a8a8b8", "stroke-width": "2" }),
      h("line",    { x1: "33", y1: "20", x2: "38", y2: "20", stroke: "#a8a8b8", "stroke-width": "1.5" }),
    ]),
    TWTADA:         () => h("g", [
      h("line",    { x1: "0",  y1: "20", x2: "5",  y2: "20", stroke: "#a8a8b8", "stroke-width": "1.5" }),
      h("polygon", { points: "5,12 18,20 5,28", fill: "#1e2e3e", stroke: "#a8a8b8", "stroke-width": "1.5" }),
      h("line",    { x1: "18", y1: "20", x2: "22", y2: "20", stroke: "#a8a8b8", "stroke-width": "1.5" }),
      h("rect",    { x: "22", y: "9", width: "16", height: "22", fill: "#22223a", stroke: "#4a9eff", "stroke-width": "1.5", rx: "2" }),
      h("text",    { x: "30", y: "22", "text-anchor": "middle", "font-size": "4.5", fill: "#4a9eff", "font-weight": "bold" }, "TWTA"),
      h("line",    { x1: "38", y1: "20", x2: "40", y2: "20", stroke: "#4a9eff", "stroke-width": "1.5" }),
    ]),
    RFDownConverter: () => h("g", [
      h("line",    { x1: "2",  y1: "20", x2: "10", y2: "20", stroke: "#4a9eff", "stroke-width": "1.5" }),
      h("circle",  { cx: "20", cy: "20", r: "10", fill: "#1a2a3a", stroke: "#4a9eff", "stroke-width": "2" }),
      h("line",    { x1: "13", y1: "13", x2: "27", y2: "27", stroke: "#4a9eff", "stroke-width": "1.5" }),
      h("line",    { x1: "27", y1: "13", x2: "13", y2: "27", stroke: "#4a9eff", "stroke-width": "1.5" }),
      h("line",    { x1: "30", y1: "20", x2: "38", y2: "20", stroke: "#4a9eff", "stroke-width": "1.5" }),
      h("line",    { x1: "20", y1: "30", x2: "20", y2: "37", stroke: "#4a9eff", "stroke-width": "1", "stroke-dasharray": "2,2" }),
      h("polygon", { points: "17,34 23,34 20,38", fill: "#4a9eff" }),
    ]),
    RFUpConverter:  () => h("g", [
      h("line",    { x1: "2",  y1: "20", x2: "10", y2: "20", stroke: "#e67e22", "stroke-width": "1.5" }),
      h("circle",  { cx: "20", cy: "20", r: "10", fill: "#1a2a3a", stroke: "#e67e22", "stroke-width": "2" }),
      h("line",    { x1: "13", y1: "13", x2: "27", y2: "27", stroke: "#e67e22", "stroke-width": "1.5" }),
      h("line",    { x1: "27", y1: "13", x2: "13", y2: "27", stroke: "#e67e22", "stroke-width": "1.5" }),
      h("line",    { x1: "30", y1: "20", x2: "38", y2: "20", stroke: "#e67e22", "stroke-width": "1.5" }),
      h("line",    { x1: "20", y1: "3",  x2: "20", y2: "10", stroke: "#e67e22", "stroke-width": "1", "stroke-dasharray": "2,2" }),
      h("polygon", { points: "17,6 23,6 20,2", fill: "#e67e22" }),
    ]),
    LNA:            () => h("g", [
      h("line",    { x1: "0",  y1: "20", x2: "4",  y2: "20", stroke: "#4a9eff", "stroke-width": "1.5" }),
      h("polygon", { points: "4,13 13,20 4,27",   fill: "#1e3060", stroke: "#4a9eff", "stroke-width": "1.5" }),
      h("line",    { x1: "13", y1: "20", x2: "15", y2: "20", stroke: "#4a9eff", "stroke-width": "1.5" }),
      h("polygon", { points: "15,13 24,20 15,27",  fill: "#1e3060", stroke: "#4a9eff", "stroke-width": "1.5" }),
      h("line",    { x1: "24", y1: "20", x2: "26", y2: "20", stroke: "#4a9eff", "stroke-width": "1.5" }),
      h("polygon", { points: "26,13 35,20 26,27",  fill: "#1e3060", stroke: "#4a9eff", "stroke-width": "1.5" }),
      h("line",    { x1: "35", y1: "20", x2: "40", y2: "20", stroke: "#4a9eff", "stroke-width": "1.5" }),
    ]),
    Receiver:       () => h("g", [
      h("line",    { x1: "0",  y1: "20", x2: "4",  y2: "20", stroke: "#3b82f6", "stroke-width": "1.5" }),
      h("polygon", { points: "4,13 15,20 4,27",   fill: "#1e3060", stroke: "#3b82f6", "stroke-width": "1.5" }),
      h("line",    { x1: "15", y1: "20", x2: "21", y2: "20", stroke: "#3b82f6", "stroke-width": "1.5" }),
      h("circle",  { cx: "30", cy: "20", r: "9",  fill: "#1a2a3a", stroke: "#3b82f6", "stroke-width": "1.5" }),
      h("line",    { x1: "23", y1: "13", x2: "37", y2: "27", stroke: "#3b82f6", "stroke-width": "1.5" }),
      h("line",    { x1: "37", y1: "13", x2: "23", y2: "27", stroke: "#3b82f6", "stroke-width": "1.5" }),
      h("line",    { x1: "39", y1: "20", x2: "40", y2: "20", stroke: "#3b82f6", "stroke-width": "1.5" }),
    ]),
    ReceiverDemod:  () => h("g", [
      // Same as Receiver but with demod block added after the mixer
      h("line",    { x1: "0",  y1: "20", x2: "3",  y2: "20", stroke: "#3b82f6", "stroke-width": "1.5" }),
      h("polygon", { points: "3,13 11,20 3,27",   fill: "#1e3060", stroke: "#3b82f6", "stroke-width": "1.5" }),
      h("line",    { x1: "11", y1: "20", x2: "16", y2: "20", stroke: "#3b82f6", "stroke-width": "1.5" }),
      h("circle",  { cx: "22", cy: "20", r: "6",  fill: "#1a2a3a", stroke: "#3b82f6", "stroke-width": "1.5" }),
      h("line",    { x1: "16", y1: "13", x2: "28", y2: "27", stroke: "#3b82f6", "stroke-width": "1.5" }),
      h("line",    { x1: "28", y1: "13", x2: "16", y2: "27", stroke: "#3b82f6", "stroke-width": "1.5" }),
      h("line",    { x1: "28", y1: "20", x2: "30", y2: "20", stroke: "#3b82f6", "stroke-width": "1.5" }),
      // Demod block
      h("rect",    { x: "30", y: "14", width: "8", height: "12", rx: "1.5", fill: "#1a2a3a", stroke: "#44ff88", "stroke-width": "1.2" }),
      h("path",    { d: "M 31,20 C 31.5,17 32,17 32.5,20 C 33,23 33.5,23 34,20", fill: "none", stroke: "#3b82f6", "stroke-width": "0.8" }),
      h("path",    { d: "M 35,19 C 35.5,19 36.5,18.5 37,20 C 37.5,21.5 37.5,21.5 38,20", fill: "none", stroke: "#44ff88", "stroke-width": "0.9" }),
      h("line",    { x1: "38", y1: "20", x2: "40", y2: "20", stroke: "#44ff88", "stroke-width": "1.5" }),
    ]),
    Transmitter:    () => h("g", [
      // PCM input (green square wave on left)
      h("path",    { d: "M 0,20 L 2,20 L 2,15 L 5,15 L 5,25 L 8,25 L 8,20 L 10,20", fill: "none", stroke: "#44ff88", "stroke-width": "1.2" }),
      // MOD block (green border)
      h("rect",    { x: "10", y: "14", width: "8", height: "12", rx: "1.5", fill: "#0a2e1a", stroke: "#44ff88", "stroke-width": "1.2" }),
      h("path",    { d: "M 11,20 C 11.5,17.5 12,17.5 12.5,20 C 13,22.5 13.5,22.5 14,20", fill: "none", stroke: "#3b82f6", "stroke-width": "0.8" }),
      // Line MOD → Mixer
      h("line",    { x1: "18", y1: "20", x2: "22", y2: "20", stroke: "#3b82f6", "stroke-width": "1.2" }),
      // Mixer circle (purple)
      h("circle",  { cx: "26", cy: "20", r: "5",  fill: "#1a0a40", stroke: "#7050e8", "stroke-width": "1.4" }),
      h("line",    { x1: "23", y1: "17", x2: "29", y2: "23", stroke: "#00e5ff", "stroke-width": "1.1" }),
      h("line",    { x1: "29", y1: "17", x2: "23", y2: "23", stroke: "#00e5ff", "stroke-width": "1.1" }),
      // Line Mixer → PA
      h("line",    { x1: "31", y1: "20", x2: "33", y2: "20", stroke: "#3b82f6", "stroke-width": "1.2" }),
      // PA triangle (right-pointing, blue)
      h("polygon", { points: "33,14 33,26 39,20", fill: "#0d1e5a", stroke: "#00aaff", "stroke-width": "1.5" }),
      // PM output (cyan sine wave on right)
      h("path",    { d: "M 39,20 C 39.5,17 40,17 40,20", fill: "none", stroke: "#00ccff", "stroke-width": "1.0" }),
    ]),
    RFCoupler:      () => h("g", [
      // Main body (cyan bar)
      h("rect",    { x: "2", y: "12", width: "36", height: "14", rx: "3", fill: "#1e90b8", stroke: "#0d5f78", "stroke-width": "1.2" }),
      // Sheen
      h("rect",    { x: "2", y: "12", width: "36", height: "6",  rx: "3", fill: "rgba(255,255,255,0.25)" }),
      // P1 left stub
      h("rect",    { x: "0", y: "16", width: "3",  height: "6",  rx: "1", fill: "#b0c0d0", stroke: "#0d5f78", "stroke-width": "0.7" }),
      // P2 right stub
      h("rect",    { x: "37", y: "16", width: "3", height: "6",  rx: "1", fill: "#b0c0d0", stroke: "#0d5f78", "stroke-width": "0.7" }),
      // P4 bottom stub (isolated, ~38%)
      h("rect",    { x: "13.5", y: "26", width: "3", height: "6", rx: "0.8", fill: "#b0c0d0", stroke: "#0d5f78", "stroke-width": "0.7" }),
      // P3 bottom stub (coupled, ~76%)
      h("rect",    { x: "28", y: "26", width: "3",  height: "6", rx: "0.8", fill: "#b0c0d0", stroke: "#0d5f78", "stroke-width": "0.7" }),
      // Main through arrow (white, P1→P2)
      h("line",    { x1: "4",  y1: "19", x2: "35", y2: "19", stroke: "#fff", "stroke-width": "1.2", opacity: "0.9" }),
      h("polygon", { points: "33,17 37,19 33,21", fill: "#fff", opacity: "0.9" }),
      // Coupled path arrow (down at P3 column)
      h("circle",  { cx: "29.5", cy: "19", r: "1.2", fill: "#fff", opacity: "0.75" }),
      h("line",    { x1: "29.5", y1: "19", x2: "29.5", y2: "25.5", stroke: "#fff", "stroke-width": "1.2", opacity: "0.9" }),
      h("polygon", { points: "27.5,23.5 29.5,26 31.5,23.5", fill: "#fff", opacity: "0.9" }),
      // Labels
      h("text",    { x: "3", y: "11", "font-size": "4", fill: "#c9d1d9", "font-family": "sans-serif", "font-weight": "700" }, "p1"),
      h("text",    { x: "36", y: "11", "font-size": "4", fill: "#c9d1d9", "font-family": "sans-serif", "font-weight": "700", "text-anchor": "end" }, "p2"),
      h("text",    { x: "15", y: "35", "font-size": "4", fill: "#c9d1d9", "font-family": "sans-serif", "font-weight": "700", "text-anchor": "middle" }, "p4"),
      h("text",    { x: "29.5", y: "35", "font-size": "4", fill: "#c9d1d9", "font-family": "sans-serif", "font-weight": "700", "text-anchor": "middle" }, "p3"),
    ]),
    Modulator:      () => h("g", [
      // PCM input (green square wave, left)
      h("path",    { d: "M 0,20 L 1,20 L 1,15 L 4,15 L 4,25 L 7,25 L 7,15 L 10,15 L 10,20", fill: "none", stroke: "#44ff88", "stroke-width": "1.2" }),
      // PN × multiplier circle (amber/orange)
      h("circle",  { cx: "17", cy: "20", r: "6", fill: "#2a1600", stroke: "#ff8800", "stroke-width": "1.4" }),
      h("line",    { x1: "14", y1: "17", x2: "20", y2: "23", stroke: "#ffaa00", "stroke-width": "1.1" }),
      h("line",    { x1: "20", y1: "17", x2: "14", y2: "23", stroke: "#ffaa00", "stroke-width": "1.1" }),
      // "PN" label below circle
      h("line",    { x1: "17", y1: "26", x2: "17", y2: "29", stroke: "#ff8800", "stroke-width": "0.9", "stroke-dasharray": "2,1.5" }),
      // Signal line PN → PSK block
      h("line",    { x1: "23", y1: "20", x2: "26", y2: "20", stroke: "#4a9eff", "stroke-width": "1.2" }),
      // PSK MOD block (deep blue)
      h("rect",    { x: "26", y: "14", width: "10", height: "12", rx: "1.5", fill: "#001a3a", stroke: "#0088ff", "stroke-width": "1.3" }),
      // Static carrier with phase reversal inside PSK block
      h("path",    { d: "M 27,20 C 27.8,17.5 28.6,17.5 29.4,20 C 30.2,22.5 31,22.5 31,20 C 31,17.5 31.8,17.5 32.6,20 C 33.4,22.5 34.2,22.5 35,20", fill: "none", stroke: "#0088ff", "stroke-width": "0.9" }),
      // PSK output (cyan spread BPSK, right)
      h("path",    { d: "M 36,20 C 36.4,17.5 36.8,17.5 37.2,20 C 37.6,22.5 38,22.5 38,20 C 38,17.5 38.4,22.5 38.8,20 C 39.2,17.5 39.6,17.5 40,20", fill: "none", stroke: "#00ccff", "stroke-width": "1.1" }),
    ]),
    QPSKModulator:  () => h("g", [
      // input bitstream
      h("path", { d: "M 0,20 L 2,20 L 2,15 L 5,15 L 5,25 L 8,25 L 8,20 L 10,20", fill: "none", stroke: "#44ff88", "stroke-width": "1.2" }),
      // mapper block
      h("rect", { x: "10", y: "14", width: "9", height: "12", rx: "1.4", fill: "#071a34", stroke: "#4a9eff", "stroke-width": "1.2" }),
      h("text", { x: "14.5", y: "22", "text-anchor": "middle", "font-size": "3.2", fill: "#7dd3fc", "font-weight": "700", "font-family": "monospace" }, "Q"),
      // constellation circle and quadrants
      h("circle", { cx: "24", cy: "20", r: "6", fill: "#061526", stroke: "#b388ff", "stroke-width": "1.1" }),
      h("line", { x1: "18.8", y1: "20", x2: "29.2", y2: "20", stroke: "#4a9eff", "stroke-width": "0.8", opacity: "0.8" }),
      h("line", { x1: "24", y1: "14.8", x2: "24", y2: "25.2", stroke: "#4a9eff", "stroke-width": "0.8", opacity: "0.8" }),
      h("circle", { cx: "26.8", cy: "17.2", r: "1.1", fill: "#fbbf24" }),
      // qpsk output
      h("path", { d: "M 30,20 C 30.8,17.3 31.6,17.3 32.4,20 C 33.2,22.7 34,22.7 34,20 C 34,17.3 34.8,17.3 35.6,20 C 36.4,22.7 37.2,22.7 38,20 C 38.8,17.3 39.4,17.3 40,20", fill: "none", stroke: "#00ccff", "stroke-width": "1.1" }),
    ]),
    QPSKDemodulator: () => h("g", [
      // qpsk input
      h("path", { d: "M 0,20 C 0.8,17.3 1.6,17.3 2.4,20 C 3.2,22.7 4,22.7 4,20 C 4,17.3 4.8,17.3 5.6,20 C 6.4,22.7 7.2,22.7 8,20 C 8.8,17.3 9.4,17.3 10,20", fill: "none", stroke: "#00ccff", "stroke-width": "1.1" }),
      // constellation and active sample
      h("circle", { cx: "16", cy: "20", r: "6", fill: "#061526", stroke: "#44ff88", "stroke-width": "1.1" }),
      h("line", { x1: "10.8", y1: "20", x2: "21.2", y2: "20", stroke: "#4a9eff", "stroke-width": "0.8", opacity: "0.8" }),
      h("line", { x1: "16", y1: "14.8", x2: "16", y2: "25.2", stroke: "#4a9eff", "stroke-width": "0.8", opacity: "0.8" }),
      h("circle", { cx: "13.2", cy: "22.8", r: "1.1", fill: "#fbbf24" }),
      // demap block
      h("rect", { x: "23", y: "14", width: "9", height: "12", rx: "1.4", fill: "#062214", stroke: "#44ff88", "stroke-width": "1.2" }),
      h("text", { x: "27.5", y: "22", "text-anchor": "middle", "font-size": "2.8", fill: "#86efac", "font-weight": "700", "font-family": "monospace" }, "DEM"),
      // output bits
      h("path", { d: "M 32,20 L 34,20 L 34,15 L 37,15 L 37,25 L 40,25", fill: "none", stroke: "#44ff88", "stroke-width": "1.2" }),
    ]),
    TMDecoder:      () => h("g", [
      // 1553 bus input waveform
      h("path", { d: "M 0,20 C 0.8,17.6 1.6,17.6 2.4,20 C 3.2,22.4 4,22.4 4,20 C 4,17.6 4.8,17.6 5.6,20 C 6.4,22.4 7.2,22.4 8,20 C 8.8,17.6 9.4,17.6 10,20", fill: "none", stroke: "#00ccff", "stroke-width": "1.1" }),
      // decoder block
      h("rect", { x: "10", y: "14", width: "12", height: "12", rx: "1.5", fill: "#062214", stroke: "#44ff88", "stroke-width": "1.2" }),
      h("text", { x: "16", y: "22", "text-anchor": "middle", "font-size": "2.8", fill: "#86efac", "font-weight": "700", "font-family": "monospace" }, "DEC"),
      // fanout lines to decoded signals
      h("line", { x1: "22", y1: "20", x2: "30", y2: "14", stroke: "#44ff88", "stroke-width": "1.0" }),
      h("line", { x1: "22", y1: "20", x2: "30", y2: "20", stroke: "#44ff88", "stroke-width": "1.0" }),
      h("line", { x1: "22", y1: "20", x2: "30", y2: "26", stroke: "#44ff88", "stroke-width": "1.0" }),
      h("line", { x1: "30", y1: "14", x2: "40", y2: "14", stroke: "#44ff88", "stroke-width": "1.1" }),
      h("line", { x1: "30", y1: "20", x2: "40", y2: "20", stroke: "#44ff88", "stroke-width": "1.1" }),
      h("line", { x1: "30", y1: "26", x2: "40", y2: "26", stroke: "#44ff88", "stroke-width": "1.1" }),
      h("circle", { cx: "39", cy: "14", r: "1.0", fill: "#fbbf24" }),
      h("circle", { cx: "39", cy: "20", r: "1.0", fill: "#44ff88" }),
      h("circle", { cx: "39", cy: "26", r: "1.0", fill: "#44ff88" }),
    ]),
    NSGU:           () => h("g", [
      // Input line from left
      h("line",    { x1: "0", y1: "20", x2: "3", y2: "20", stroke: "#ffa500", "stroke-width": "1.2" }),
      // NAV MSG GEN block (gold, wider — left section)
      h("rect",    { x: "3", y: "12", width: "22", height: "16", rx: "1.5", fill: "#2a1e00", stroke: "#ffd700", "stroke-width": "1.3" }),
      // Mini satellite inside NAV block
      h("rect",    { x: "12", y: "17.5", width: "4", height: "3", rx: "0.5", fill: "#3a2800", stroke: "#ffd700", "stroke-width": "0.7" }),
      h("rect",    { x: "8.5", y: "18.2", width: "3.5", height: "1.6", rx: "0.3", fill: "#1a3a00", stroke: "#88cc44", "stroke-width": "0.6" }),
      h("rect",    { x: "16", y: "18.2", width: "3.5", height: "1.6", rx: "0.3", fill: "#1a3a00", stroke: "#88cc44", "stroke-width": "0.6" }),
      h("path",    { d: "M 12,17.5 L 14,15.5 M 16,17.5 L 14,15.5", fill: "none", stroke: "#ffd700", "stroke-width": "0.7" }),
      h("text",    { x: "14", y: "26.5", "text-anchor": "middle", "font-size": "3.5", fill: "#ffd700", "font-family": "sans-serif", "font-weight": "700" }, "NAV MSG"),
      // PCM output (green square wave, right)
      h("line",    { x1: "25", y1: "20", x2: "27", y2: "20", stroke: "#44ff88", "stroke-width": "1.2" }),
      h("path",    { d: "M 27,20 L 27,16 L 30,16 L 30,24 L 33,24 L 33,16 L 36,16 L 36,24 L 40,24", fill: "none", stroke: "#44ff88", "stroke-width": "1.2" }),
    ]),
    // ── ACMU — 4 CLK inputs → Phase Meter → 10.023 MHz out ───────────────────
    ACMU:           () => h("g", [
      // Outer frame
      h("rect",   { x: "1", y: "1", width: "38", height: "38", rx: "2", fill: "#0d1117", stroke: "#5566aa", "stroke-width": "1.2" }),
      // 4 CLK input stubs on left edge
      h("line",   { x1: "1", y1: "9",  x2: "6",  y2: "9",  stroke: "#44aaff", "stroke-width": "0.9" }),
      h("line",   { x1: "1", y1: "16", x2: "6",  y2: "16", stroke: "#44aaff", "stroke-width": "0.9" }),
      h("line",   { x1: "1", y1: "24", x2: "6",  y2: "24", stroke: "#44aaff", "stroke-width": "0.9" }),
      h("line",   { x1: "1", y1: "31", x2: "6",  y2: "31", stroke: "#44aaff", "stroke-width": "0.9" }),
      // CLK input zone (blue-grey block)
      h("rect",   { x: "6",  y: "4", width: "8", height: "32", rx: "1", fill: "#1a2a3a", stroke: "#4488aa", "stroke-width": "0.8" }),
      h("text",   { x: "10", y: "21", "text-anchor": "middle", "font-size": "3.5", fill: "#88ccee", "font-family": "monospace", "font-weight": "700", transform: "rotate(-90,10,21)" }, "CLK"),
      // Phase Meter block (deep indigo)
      h("rect",   { x: "14", y: "4", width: "13", height: "32", rx: "1", fill: "#1a1035", stroke: "#7766cc", "stroke-width": "0.8" }),
      h("text",   { x: "20.5", y: "8.5", "text-anchor": "middle", "font-size": "3", fill: "#aa99ff", "font-family": "sans-serif", "font-weight": "700" }, "PHASE"),
      // Inner screen (dark)
      h("rect",   { x: "15.5", y: "10", width: "10", height: "14", rx: "0.8", fill: "#0a0820", stroke: "#443388", "stroke-width": "0.5" }),
      // REF curve (cyan, static 3 cycles)
      h("path",   { d: "M 15.5,17 C 16,14 16.5,14 17,17 C 17.5,20 18,20 18.5,17 C 19,14 19.5,14 20,17 C 20.5,20 21,20 21.5,17", fill: "none", stroke: "#00ccff", "stroke-width": "0.7" }),
      // DUT curve (amber, phase offset)
      h("path",   { d: "M 15.5,20 C 16.2,17 16.7,17 17.2,20 C 17.7,23 18.2,23 18.7,20 C 19.2,17 19.7,17 20.2,20 C 20.7,23 21.2,23 21.7,20", fill: "none", stroke: "#ffaa00", "stroke-width": "0.7" }),
      // Δφ reading label
      h("text",   { x: "20.5", y: "28", "text-anchor": "middle", "font-size": "3", fill: "#ffcc44", "font-family": "monospace" }, "Δφ 1.2ns"),
      // Freq Synth block (dark green-blue)
      h("rect",   { x: "27", y: "4", width: "11", height: "32", rx: "1", fill: "#0e2018", stroke: "#44cc88", "stroke-width": "0.8" }),
      // 10.023 MHz label (two lines)
      h("text",   { x: "32.5", y: "16", "text-anchor": "middle", "font-size": "5", fill: "#44ff88", "font-family": "monospace", "font-weight": "700" }, "10"),
      h("text",   { x: "32.5", y: "22", "text-anchor": "middle", "font-size": "3.5", fill: "#44ff88", "font-family": "monospace", "font-weight": "700" }, ".023"),
      h("text",   { x: "32.5", y: "28", "text-anchor": "middle", "font-size": "3.5", fill: "#44ff88", "font-family": "monospace" }, "MHz"),
      // Static output sine icon
      h("path",   { d: "M 28.5,33 C 29,31 29.5,31 30,33 C 30.5,35 31,35 31.5,33", fill: "none", stroke: "#44ff88", "stroke-width": "0.8" }),
      // OUT stub on right
      h("line",   { x1: "38", y1: "20", x2: "39", y2: "20", stroke: "#44ff88", "stroke-width": "1.0" }),
    ]),
    RFCirculator:   () => h("g", [
      h("rect", { x: "4", y: "14", width: "3", height: "12", fill: "#555", stroke: "#222", "stroke-width": "0.4" }),
      h("rect", { x: "33", y: "14", width: "3", height: "12", fill: "#555", stroke: "#222", "stroke-width": "0.4" }),
      h("rect", { x: "16", y: "33", width: "8", height: "3", fill: "#555", stroke: "#222", "stroke-width": "0.4" }),
      h("circle", { cx: "20", cy: "20", r: "9", fill: "#fff", stroke: "#222", "stroke-width": "0.8" }),
      h("path", { d: "M 14 20 Q 20 10 26 20", fill: "none", stroke: "#5eb0d8", "stroke-width": "1.2" }),
      h("path", { d: "M 26 21 Q 28 26 20 28", fill: "none", stroke: "#d49050", "stroke-width": "1.2" }),
      h("path", { d: "M 20 28 Q 12 26 14 21", fill: "none", stroke: "#4caf50", "stroke-width": "1.2" }),
      h("text", { x: "20", y: "21", "text-anchor": "middle", "font-size": "3.2", fill: "#333", "font-weight": "700" }, "25.4"),
    ]),
    // ── Bandpass Filter — dark metallic chassis, violet BPF hump ──────────
    BandpassFilter: () => h("g", [
      // Chassis body
      h("rect", { x: "2", y: "5", width: "36", height: "30", rx: "2.5", fill: "#0e1828", stroke: "#686878", "stroke-width": "1.2" }),
      // RF connector nubs — left & right
      h("rect", { x: "0",  y: "16", width: "3", height: "8", rx: "1", fill: "#2a4a6a", stroke: "#5a7a9a", "stroke-width": "0.7" }),
      h("rect", { x: "37", y: "16", width: "3", height: "8", rx: "1", fill: "#2a4a6a", stroke: "#5a7a9a", "stroke-width": "0.7" }),
      // Connector centre dots
      h("circle", { cx: "1.5", cy: "20", r: "1.4", fill: "#0d1117", stroke: "#8090a0", "stroke-width": "0.6" }),
      h("circle", { cx: "38.5", cy: "20", r: "1.4", fill: "#0d1117", stroke: "#8090a0", "stroke-width": "0.6" }),
      // Frequency axis line
      h("line", { x1: "5", y1: "29", x2: "35", y2: "29", stroke: "#2a3a5a", "stroke-width": "0.7" }),
      // BPF passband fill (violet, low opacity) — closes along axis
      h("path", { d: "M 5,29 L 9,29 C 11,29 13,14 15,14 L 25,14 C 27,14 29,29 31,29 Z", fill: "#a78bfa", opacity: "0.22" }),
      // BPF response curve (violet stroke)
      h("path", { d: "M 5,29 L 9,29 C 11,29 13,14 15,14 L 25,14 C 27,14 29,29 31,29 L 35,29", fill: "none", stroke: "#a78bfa", "stroke-width": "1.6", "stroke-linecap": "round", "stroke-linejoin": "round" }),
      // Left cutoff dashed marker
      h("line", { x1: "15", y1: "13", x2: "15", y2: "29", stroke: "#a78bfa", "stroke-width": "0.6", "stroke-dasharray": "2,2", opacity: "0.45" }),
      // Right cutoff dashed marker
      h("line", { x1: "25", y1: "13", x2: "25", y2: "29", stroke: "#a78bfa", "stroke-width": "0.6", "stroke-dasharray": "2,2", opacity: "0.45" }),
      // Device label
      h("text", { x: "20", y: "10", "text-anchor": "middle", "dominant-baseline": "middle", "font-size": "5", fill: "#c8d8e8", "font-weight": "700", "font-family": "sans-serif", "letter-spacing": "0.4" }, "BPF"),
    ]),
    // ── Low Pass Filter — dark metallic chassis, teal rolloff curve ────────
    LowPassFilter:  () => h("g", [
      // Chassis body
      h("rect", { x: "2", y: "5", width: "36", height: "30", rx: "2.5", fill: "#0e1828", stroke: "#686878", "stroke-width": "1.2" }),
      // RF connector nubs — left & right
      h("rect", { x: "0",  y: "16", width: "3", height: "8", rx: "1", fill: "#2a4a6a", stroke: "#5a7a9a", "stroke-width": "0.7" }),
      h("rect", { x: "37", y: "16", width: "3", height: "8", rx: "1", fill: "#2a4a6a", stroke: "#5a7a9a", "stroke-width": "0.7" }),
      // Connector centre dots
      h("circle", { cx: "1.5", cy: "20", r: "1.4", fill: "#0d1117", stroke: "#8090a0", "stroke-width": "0.6" }),
      h("circle", { cx: "38.5", cy: "20", r: "1.4", fill: "#0d1117", stroke: "#8090a0", "stroke-width": "0.6" }),
      // Frequency axis line
      h("line", { x1: "5", y1: "29", x2: "35", y2: "29", stroke: "#2a3a5a", "stroke-width": "0.7" }),
      // LPF passband fill (teal) — left-side passband area down to axis
      h("path", { d: "M 5,14 L 20,14 C 23,14 27,29 29,29 L 35,29 L 5,29 Z", fill: "#22d3ee", opacity: "0.18" }),
      // LPF response curve (teal stroke): flat passband → S-curve rolloff → flat stopband
      h("path", { d: "M 5,14 L 20,14 C 23,14 27,29 29,29 L 35,29", fill: "none", stroke: "#22d3ee", "stroke-width": "1.6", "stroke-linecap": "round", "stroke-linejoin": "round" }),
      // Cutoff (–3 dB) dashed vertical at rolloff midpoint
      h("line", { x1: "24.5", y1: "13", x2: "24.5", y2: "29", stroke: "#22d3ee", "stroke-width": "0.6", "stroke-dasharray": "2,2", opacity: "0.45" }),
      // –3 dB tick mark (short horizontal at mid-level)
      h("line", { x1: "22", y1: "21.5", x2: "27", y2: "21.5", stroke: "#22d3ee", "stroke-width": "0.9", "stroke-linecap": "round", opacity: "0.72" }),
      // Device label
      h("text", { x: "20", y: "10", "text-anchor": "middle", "dominant-baseline": "middle", "font-size": "5", fill: "#c8d8e8", "font-weight": "700", "font-family": "sans-serif", "letter-spacing": "0.4" }, "LPF"),
    ]),
    Battery:        () => h("g", [
      h("rect", { x: "14", y: "0", width: "12", height: "4", fill: "#a8a8b8" }),
      h("rect", { x: "10", y: "4", width: "20", height: "32", fill: "#22223a", stroke: "#a8a8b8", "stroke-width": "2", rx: "3" }),
      h("rect", { x: "12", y: "22", width: "16", height: "12", fill: "#27ae60", opacity: "0.85" }),
    ]),
    MomentumWheel:  () => h("g", [
      // Outer glow
      h("circle", { cx: "20", cy: "20", r: "18", fill: "none", stroke: "#27ae60", "stroke-width": "1.5", opacity: "0.3" }),
      // Metallic rim
      h("circle", { cx: "20", cy: "20", r: "16", fill: "#a0a0b8", stroke: "#686878", "stroke-width": "0.5" }),
      // Dark body
      h("circle", { cx: "20", cy: "20", r: "12", fill: "#0c1c2e" }),
      // Speed arc (partial — ~60% fill at ~27ae60)
      h("path", { d: "M 8.3 25.9 A 14.5 14.5 0 1 1 28.1 29.5", fill: "none", stroke: "#27ae60", "stroke-width": "3", "stroke-linecap": "round", opacity: "0.85" }),
      // 6 spokes
      h("line", { x1: "20", y1: "20", x2: "20", y2: "9",  stroke: "#27ae60", "stroke-width": "1.8", "stroke-linecap": "round" }),
      h("line", { x1: "20", y1: "20", x2: "30", y2: "14", stroke: "#27ae60", "stroke-width": "1.8", "stroke-linecap": "round" }),
      h("line", { x1: "20", y1: "20", x2: "30", y2: "26", stroke: "#27ae60", "stroke-width": "0.9", "stroke-linecap": "round" }),
      h("line", { x1: "20", y1: "20", x2: "20", y2: "31", stroke: "#27ae60", "stroke-width": "1.8", "stroke-linecap": "round" }),
      h("line", { x1: "20", y1: "20", x2: "10", y2: "26", stroke: "#27ae60", "stroke-width": "0.9", "stroke-linecap": "round" }),
      h("line", { x1: "20", y1: "20", x2: "10", y2: "14", stroke: "#27ae60", "stroke-width": "1.8", "stroke-linecap": "round" }),
      // Hub ring
      h("circle", { cx: "20", cy: "20", r: "5", fill: "#142030", stroke: "#27ae60", "stroke-width": "1.2" }),
      // Centre cap
      h("circle", { cx: "20", cy: "20", r: "2", fill: "#3c5a7a", stroke: "#27ae60", "stroke-width": "0.8" }),
    ]),
    FPGA:           () => h("g", [
      h("rect",  { x: "8", y: "8",  width: "24", height: "24", fill: "rgba(0,0,0,0.45)", rx: "2" }),
      h("rect",  { x: "7", y: "7",  width: "24", height: "24", fill: "#0a1428", stroke: "#203858", "stroke-width": "1.2", rx: "2" }),
      h("line",  { x1: "10", y1: "15", x2: "28", y2: "15", stroke: "rgba(74,130,180,0.30)", "stroke-width": "0.6" }),
      h("line",  { x1: "10", y1: "23", x2: "28", y2: "23", stroke: "rgba(74,130,180,0.30)", "stroke-width": "0.6" }),
      h("line",  { x1: "16", y1: "10", x2: "16", y2: "28", stroke: "rgba(74,130,180,0.30)", "stroke-width": "0.6" }),
      h("line",  { x1: "23", y1: "10", x2: "23", y2: "28", stroke: "rgba(74,130,180,0.30)", "stroke-width": "0.6" }),
      h("circle",{ cx: "10", cy: "10", r: "0.9", fill: "rgba(100,170,230,0.45)" }),
      h("circle",{ cx: "16", cy: "10", r: "0.9", fill: "rgba(100,170,230,0.45)" }),
      h("circle",{ cx: "23", cy: "10", r: "0.9", fill: "rgba(100,170,230,0.45)" }),
      h("circle",{ cx: "28", cy: "10", r: "0.9", fill: "rgba(100,170,230,0.45)" }),
      h("circle",{ cx: "10", cy: "19", r: "0.9", fill: "rgba(100,170,230,0.45)" }),
      h("circle",{ cx: "28", cy: "19", r: "0.9", fill: "rgba(100,170,230,0.45)" }),
      h("circle",{ cx: "10", cy: "28", r: "0.9", fill: "rgba(100,170,230,0.45)" }),
      h("circle",{ cx: "16", cy: "28", r: "0.9", fill: "rgba(100,170,230,0.45)" }),
      h("circle",{ cx: "23", cy: "28", r: "0.9", fill: "rgba(100,170,230,0.45)" }),
      h("circle",{ cx: "28", cy: "28", r: "0.9", fill: "rgba(100,170,230,0.45)" }),
      h("path",  { d: "M 7 9.5 A 2.5 2.5 0 0 0 9.5 7 L 7 7 Z", fill: "#060e1c", stroke: "#203858", "stroke-width": "0.7" }),
      h("text",  { x: "19", y: "21", "text-anchor": "middle", "font-size": "4.5", fill: "rgba(140,190,240,0.60)", "font-weight": "700", "letter-spacing": "0.5" }, "FPGA"),
      h("rect",  { x: "9",  y: "3",  width: "2.2", height: "4", fill: "#c0d8e8", rx: "0.5" }),
      h("rect",  { x: "14", y: "3",  width: "2.2", height: "4", fill: "#c0d8e8", rx: "0.5" }),
      h("rect",  { x: "19", y: "3",  width: "2.2", height: "4", fill: "#c0d8e8", rx: "0.5" }),
      h("rect",  { x: "24", y: "3",  width: "2.2", height: "4", fill: "#c0d8e8", rx: "0.5" }),
      h("rect",  { x: "9",  y: "31", width: "2.2", height: "4", fill: "#c0d8e8", rx: "0.5" }),
      h("rect",  { x: "14", y: "31", width: "2.2", height: "4", fill: "#c0d8e8", rx: "0.5" }),
      h("rect",  { x: "19", y: "31", width: "2.2", height: "4", fill: "#c0d8e8", rx: "0.5" }),
      h("rect",  { x: "24", y: "31", width: "2.2", height: "4", fill: "#c0d8e8", rx: "0.5" }),
      h("rect",  { x: "3",  y: "10", width: "4", height: "2.2", fill: "#c0d8e8", rx: "0.5" }),
      h("rect",  { x: "3",  y: "17", width: "4", height: "2.2", fill: "#c0d8e8", rx: "0.5" }),
      h("rect",  { x: "3",  y: "25", width: "4", height: "2.2", fill: "#c0d8e8", rx: "0.5" }),
      h("rect",  { x: "31", y: "10", width: "4", height: "2.2", fill: "#c0d8e8", rx: "0.5" }),
      h("rect",  { x: "31", y: "17", width: "4", height: "2.2", fill: "#c0d8e8", rx: "0.5" }),
      h("rect",  { x: "31", y: "25", width: "4", height: "2.2", fill: "#c0d8e8", rx: "0.5" }),
      h("circle",{ cx: "37", cy: "7",  r: "3",   fill: "#27ae60" }),
      h("circle",{ cx: "36", cy: "6.2",r: "1.0", fill: "rgba(255,255,255,0.50)" }),
    ]),
    DTG:            () => h("g", [
      h("circle",  { cx: "20", cy: "20", r: "17", fill: "#b0b0c8" }),
      h("circle",  { cx: "20", cy: "20", r: "13", fill: "#0c1c2e" }),
      h("path",    { d: "M 8.3 25.9 A 14.5 14.5 0 1 1 28.1 29.5", fill: "none", stroke: "#4a9eff", "stroke-width": "2.5", "stroke-linecap": "round" }),
      h("circle",  { cx: "20", cy: "20", r: "10", fill: "none", stroke: "#0a0f18", "stroke-width": "1.5" }),
      h("circle",  { cx: "20", cy: "20", r: "9",  fill: "none", stroke: "#4a7a9a", "stroke-width": "2" }),
      h("circle",  { cx: "20", cy: "20", r: "6",  fill: "#060e1c" }),
      h("line",    { x1: "14", y1: "20", x2: "26", y2: "20", stroke: "#f39c12", "stroke-width": "1.2", opacity: "0.9", "stroke-dasharray": "2,2" }),
      h("line",    { x1: "20", y1: "14", x2: "20", y2: "26", stroke: "#1abc9c", "stroke-width": "1.2", opacity: "0.9", "stroke-dasharray": "2,2" }),
      h("circle",  { cx: "14", cy: "20", r: "1.2", fill: "#f39c12" }),
      h("circle",  { cx: "26", cy: "20", r: "1.2", fill: "#f39c12" }),
      h("circle",  { cx: "20", cy: "14", r: "1.2", fill: "#1abc9c" }),
      h("circle",  { cx: "20", cy: "26", r: "1.2", fill: "#1abc9c" }),
      h("circle",  { cx: "20", cy: "20", r: "2.5", fill: "#3c5a7a", stroke: "#4a9eff", "stroke-width": "0.8" }),
    ]),
    // SPST Switch — 40×40 icon showing open-position blade (pivot left, contact right, blade angled up)
    SpstSwitch:     () => h("g", [
      // Left wire stub
      h("line", { x1: "0",  y1: "28", x2: "8",  y2: "28", stroke: "#7a7a9a", "stroke-width": "2.2", "stroke-linecap": "round" }),
      // Right wire stub
      h("line", { x1: "32", y1: "28", x2: "40", y2: "28", stroke: "#7a7a9a", "stroke-width": "2.2", "stroke-linecap": "round" }),
      // Blade in open position (angled up ~30°)
      h("line", { x1: "8", y1: "28", x2: "29", y2: "10", stroke: "#9b59b6", "stroke-width": "2.8", "stroke-linecap": "round" }),
      // Pivot circle (left terminal)
      h("circle", { cx: "8",  cy: "28", r: "4.5", fill: "#9b59b6" }),
      // Blade tip circle (floating, upper right)
      h("circle", { cx: "29", cy: "10", r: "4.5", fill: "#9b59b6" }),
      // Contact circle (right terminal — fixed, not yet connected)
      h("circle", { cx: "32", cy: "28", r: "4.5", fill: "#7a7a9a", opacity: "0.65" }),
    ]),
    SP2T:           () => h("g", [
      h("rect", { x: "2", y: "2", width: "36", height: "36", fill: "#22223a", stroke: "#a8a8b8", "stroke-width": "2", rx: "4" }),
      h("rect", { x: "2", y: "17", width: "8", height: "6", fill: "#c8c8d8" }),
      h("rect", { x: "30", y: "8", width: "8", height: "6", fill: "#c8c8d8" }),
      h("rect", { x: "30", y: "26", width: "8", height: "6", fill: "#556677" }),
      h("line", { x1: "10", y1: "20", x2: "30", y2: "11", stroke: "#e0f0ff", "stroke-width": "2" }),
    ]),
    SP2TC:          () => h("g", [
      h("circle", { cx: "20", cy: "20", r: "17", fill: "#22223a", stroke: "#a8a8b8", "stroke-width": "2" }),
      h("rect", { x: "1", y: "17", width: "8", height: "6", fill: "#c8c8d8" }),
      h("rect", { x: "31", y: "8", width: "8", height: "6", fill: "#c8c8d8" }),
      h("rect", { x: "31", y: "26", width: "8", height: "6", fill: "#556677" }),
      h("line", { x1: "9", y1: "20", x2: "31", y2: "11", stroke: "#e0f0ff", "stroke-width": "2" }),
    ]),
    SP2TNoBg:       () => h("g", [
      h("rect", { x: "1", y: "17", width: "8", height: "6", fill: "#c8c8d8", stroke: "#6888a0", "stroke-width": "1" }),
      h("rect", { x: "31", y: "8", width: "8", height: "6", fill: "#c8c8d8", stroke: "#6888a0", "stroke-width": "1" }),
      h("rect", { x: "31", y: "26", width: "8", height: "6", fill: "#556677", stroke: "#6888a0", "stroke-width": "1" }),
      h("line", { x1: "9", y1: "20", x2: "31", y2: "11", stroke: "#e0f0ff", "stroke-width": "2" }),
    ]),
    Switch3P:       () => h("g", [
      h("circle", { cx: "20", cy: "20", r: "17", fill: "#22223a", stroke: "#a8a8b8", "stroke-width": "2" }),
      h("path",   { d: "M 3 20 C 8 20 20 30 20 37", fill: "none", stroke: "#e0f0ff", "stroke-width": "3" }),
      h("path",   { d: "M 20 3 C 20 8 30 20 37 20", fill: "none", stroke: "#e0f0ff", "stroke-width": "3" }),
      h("rect", { x: "1", y: "17", width: "6", height: "6", fill: "#c8c8d8" }),
      h("rect", { x: "33", y: "17", width: "6", height: "6", fill: "#c8c8d8" }),
      h("rect", { x: "17", y: "1", width: "6", height: "6", fill: "#c8c8d8" }),
      h("rect", { x: "17", y: "33", width: "6", height: "6", fill: "#c8c8d8" }),
    ]),
    Switch4P:       () => h("g", [
      h("circle", { cx: "20", cy: "20", r: "17", fill: "#22223a", stroke: "#a8a8b8", "stroke-width": "2" }),
      h("line",   { x1: "3", y1: "20", x2: "37", y2: "20", stroke: "#e0f0ff", "stroke-width": "3" }),
      h("rect", { x: "1", y: "17", width: "6", height: "6", fill: "#c8c8d8" }),
      h("rect", { x: "33", y: "17", width: "6", height: "6", fill: "#c8c8d8" }),
      h("rect", { x: "17", y: "1", width: "6", height: "6", fill: "#c8c8d8" }),
      h("rect", { x: "17", y: "33", width: "6", height: "6", fill: "#c8c8d8" }),
    ]),
    DP3T:           () => h("g", [
      h("rect", { x: "6", y: "2", width: "28", height: "36", fill: "#22223a", stroke: "#a8a8b8", "stroke-width": "2", rx: "4" }),
      h("rect", { x: "0", y: "10", width: "8", height: "6", fill: "#c8c8d8" }),
      h("rect", { x: "0", y: "24", width: "8", height: "6", fill: "#c8c8d8" }),
      h("rect", { x: "32", y: "5", width: "8", height: "6", fill: "#c8c8d8" }),
      h("rect", { x: "32", y: "17", width: "8", height: "6", fill: "#c8c8d8" }),
      h("rect", { x: "32", y: "29", width: "8", height: "6", fill: "#c8c8d8" }),
      h("line", { x1: "8", y1: "13", x2: "32", y2: "8", stroke: "#e0f0ff", "stroke-width": "1.5" }),
      h("line", { x1: "8", y1: "27", x2: "32", y2: "20", stroke: "#e0f0ff", "stroke-width": "1.5" }),
    ]),
    TransferSwitch: () => h("g", [
      h("rect", { x: "2", y: "2", width: "36", height: "36", fill: "#22223a", stroke: "#a8a8b8", "stroke-width": "2", rx: "4" }),
      h("line", { x1: "4", y1: "13", x2: "36", y2: "13", stroke: "#e0f0ff", "stroke-width": "2" }),
      h("line", { x1: "4", y1: "27", x2: "36", y2: "27", stroke: "#e0f0ff", "stroke-width": "2" }),
    ]),
    Thruster:       () => h("g", [
      // Mounting flange
      h("rect", { x: "5", y: "1", width: "30", height: "4", rx: "1.2", fill: "#8898b4", stroke: "#4860a0", "stroke-width": "0.7" }),
      h("circle", { cx: "10", cy: "3", r: "1.2", fill: "#06080e", stroke: "#4060b0", "stroke-width": "0.5" }),
      h("circle", { cx: "30", cy: "3", r: "1.2", fill: "#06080e", stroke: "#4060b0", "stroke-width": "0.5" }),
      // Propellant inlets
      h("rect", { x: "1",  y: "7", width: "6",  height: "3.5", rx: "1", fill: "#1838a8", stroke: "#1848c0", "stroke-width": "0.5" }),
      h("rect", { x: "33", y: "7", width: "6",  height: "3.5", rx: "1", fill: "#982208", stroke: "#b02808", "stroke-width": "0.5" }),
      // Thruster body
      h("rect", { x: "7", y: "5", width: "26", height: "15", rx: "2", fill: "#2c3a80", stroke: "#283068", "stroke-width": "1" }),
      h("line", { x1: "7", y1: "9.5",  x2: "33", y2: "9.5",  stroke: "#1a2248", "stroke-width": "0.5" }),
      h("line", { x1: "7", y1: "14.5", x2: "33", y2: "14.5", stroke: "#1a2248", "stroke-width": "0.5" }),
      // Combustion window
      h("rect", { x: "13", y: "7.5", width: "14", height: "8", rx: "1.5", fill: "#ff8020", opacity: "0.72" }),
      h("rect", { x: "16", y: "9",   width: "8",  height: "5", rx: "1",   fill: "#ffe030", opacity: "0.50" }),
      // Bell nozzle (de Laval shape)
      h("path", { d: "M 7,20 L 13,24 C 10,27 8,29 8,32 L 32,32 C 32,29 30,27 27,24 L 33,20 Z", fill: "#364e60", stroke: "#283c50", "stroke-width": "0.8" }),
      h("ellipse", { cx: "20", cy: "32", rx: "12", ry: "1.8", fill: "none", stroke: "#3860a0", "stroke-width": "0.7", opacity: "0.55" }),
      // Exhaust plume (expanding vacuum cone)
      h("path", { d: "M 9,32 Q 6,36 4,39 L 36,39 Q 34,36 31,32 Z", fill: "rgba(70,110,240,0.22)" }),
      // Shock diamonds
      h("ellipse", { cx: "20", cy: "33.5", rx: "7",  ry: "2.0", fill: "rgba(220,242,255,0.88)" }),
      h("ellipse", { cx: "20", cy: "37",   rx: "4.5", ry: "1.5", fill: "rgba(190,224,255,0.65)" }),
      // Inner core beam
      h("line", { x1: "20", y1: "32", x2: "20", y2: "39", stroke: "rgba(255,255,255,0.72)", "stroke-width": "1.6" }),
    ]),
    MonopropThruster: () => h("g", [
      // Mounting flange
      h("rect", { x: "5", y: "1", width: "30", height: "4", rx: "1.2", fill: "#8898b4", stroke: "#4860a0", "stroke-width": "0.7" }),
      h("circle", { cx: "10", cy: "3", r: "1.2", fill: "#06080e", stroke: "#4060b0", "stroke-width": "0.5" }),
      h("circle", { cx: "30", cy: "3", r: "1.2", fill: "#06080e", stroke: "#4060b0", "stroke-width": "0.5" }),
      // Single centred propellant inlet (orange/red)
      h("rect", { x: "13", y: "5", width: "14", height: "4.5", rx: "1.2", fill: "#a82808", stroke: "#c83010", "stroke-width": "0.7" }),
      h("text", { x: "20", y: "9", "text-anchor": "middle", "font-size": "3", "font-family": "monospace", fill: "#f08050" }, "PROP"),
      // Pipe stub to body
      h("rect", { x: "18", y: "9.5", width: "4", height: "3", fill: "#8a2206" }),
      // Thruster body (slightly purple-tinted for monoprop distinction)
      h("rect", { x: "7", y: "5", width: "26", height: "15", rx: "2", fill: "#2a2860", stroke: "#222050", "stroke-width": "1" }),
      h("line", { x1: "7", y1: "9.5",  x2: "33", y2: "9.5",  stroke: "#181640", "stroke-width": "0.5" }),
      h("line", { x1: "7", y1: "14.5", x2: "33", y2: "14.5", stroke: "#181640", "stroke-width": "0.5" }),
      // Catalyst bed (amber glow — key monoprop visual)
      h("rect", { x: "12", y: "7.5", width: "16", height: "9", rx: "1.5", fill: "#ffa030", opacity: "0.78" }),
      h("rect", { x: "15", y: "9",   width: "10", height: "6", rx: "1",   fill: "#ffe060", opacity: "0.52" }),
      // Bell nozzle
      h("path", { d: "M 7,20 L 13,24 C 10,27 8,29 8,32 L 32,32 C 32,29 30,27 27,24 L 33,20 Z", fill: "#364e60", stroke: "#283c50", "stroke-width": "0.8" }),
      h("ellipse", { cx: "20", cy: "32", rx: "12", ry: "1.8", fill: "none", stroke: "#486070", "stroke-width": "0.7", opacity: "0.55" }),
      // Warm amber-blue plume
      h("path", { d: "M 9,32 Q 6,36 4,39 L 36,39 Q 34,36 31,32 Z", fill: "rgba(200,170,255,0.22)" }),
      h("ellipse", { cx: "20", cy: "33.5", rx: "7",  ry: "2.0", fill: "rgba(255,238,185,0.88)" }),
      h("ellipse", { cx: "20", cy: "37",   rx: "4.5", ry: "1.5", fill: "rgba(240,215,160,0.65)" }),
      h("line", { x1: "20", y1: "32", x2: "20", y2: "39", stroke: "rgba(255,248,220,0.75)", "stroke-width": "1.6" }),
    ]),
    Ground:         () => h("g", [
      // vertical lead
      h("line", { x1: "20", y1: "2",  x2: "20", y2: "17", stroke: "#b0bec5", "stroke-width": "2.2", "stroke-linecap": "round" }),
      // bar 1 — widest
      h("line", { x1: "3",  y1: "17", x2: "37", y2: "17", stroke: "#b0bec5", "stroke-width": "2.4", "stroke-linecap": "round" }),
      // bar 2 — medium
      h("line", { x1: "9",  y1: "24", x2: "31", y2: "24", stroke: "#b0bec5", "stroke-width": "2.4", "stroke-linecap": "round" }),
      // bar 3 — narrowest
      h("line", { x1: "15", y1: "31", x2: "25", y2: "31", stroke: "#b0bec5", "stroke-width": "2.4", "stroke-linecap": "round" }),
    ]),
    Diode:          () => h("g", [
      h("polygon", { points: "4,4 30,20 4,36", fill: "#a8c8e8", stroke: "#a8a8b8", "stroke-width": "2" }),
      h("line",    { x1: "0", y1: "20", x2: "4", y2: "20", stroke: "#a8a8b8", "stroke-width": "2" }),
      h("line",    { x1: "30", y1: "4", x2: "30", y2: "36", stroke: "#a8a8b8", "stroke-width": "3" }),
      h("line",    { x1: "30", y1: "20", x2: "40", y2: "20", stroke: "#a8a8b8", "stroke-width": "2" }),
    ]),
    ZenerDiode:     () => h("g", [
      h("polygon", { points: "4,4 28,20 4,36", fill: "#a8c8e8", stroke: "#a8a8b8", "stroke-width": "2" }),
      h("line",    { x1: "0", y1: "20", x2: "4", y2: "20", stroke: "#a8a8b8", "stroke-width": "2" }),
      h("polyline",{ points: "22,4 28,8 28,32 34,36", fill: "none", stroke: "#a8a8b8", "stroke-width": "3", "stroke-linecap": "round", "stroke-linejoin": "round" }),
      h("line",    { x1: "28", y1: "20", x2: "40", y2: "20", stroke: "#a8a8b8", "stroke-width": "2" }),
    ]),
    Resistor:       () => h("g", [
      h("rect",  { x: "8", y: "10", width: "24", height: "20", fill: "#222236", stroke: "#a8a8b8", "stroke-width": "2", rx: "1" }),
      h("line",  { x1: "0", y1: "20", x2: "8", y2: "20", stroke: "#a8a8b8", "stroke-width": "2" }),
      h("polyline", { points: "8,20 11,11 15,29 19,11 23,29 27,11 32,20", fill: "none", stroke: "#a8a8b8", "stroke-width": "1.5", "stroke-linecap": "round", "stroke-linejoin": "round" }),
      h("line",  { x1: "32", y1: "20", x2: "40", y2: "20", stroke: "#a8a8b8", "stroke-width": "2" }),
    ]),
    Capacitor:      () => h("g", [
      h("line", { x1: "0", y1: "20", x2: "15", y2: "20", stroke: "#a8a8b8", "stroke-width": "2" }),
      h("line", { x1: "25", y1: "20", x2: "40", y2: "20", stroke: "#a8a8b8", "stroke-width": "2" }),
      h("line", { x1: "17", y1: "8", x2: "17", y2: "32", stroke: "#a8a8b8", "stroke-width": "2.8", "stroke-linecap": "round" }),
      h("line", { x1: "23", y1: "8", x2: "23", y2: "32", stroke: "#a8a8b8", "stroke-width": "2.8", "stroke-linecap": "round" }),
    ]),
    // MOSFET — paths match MosfetNode.vue (viewBox "0 0 50 75")
    // scale(0.48) fits the 75-unit tall symbol into ~36 px; translate(8,2) centres it horizontally
    Mosfet:         () => h("g", { transform: "translate(8,2) scale(0.48)" }, [
      h("circle",  { cx: "35.496", cy: "35.22", r: "25", fill: "none", stroke: "#94a3b8", "stroke-width": "2.5" }),
      h("path",    { d: "M 0,43.089 H 24.031 V 23.478", fill: "none", stroke: "#94a3b8", "stroke-width": "2.5", "stroke-linecap": "round", "stroke-linejoin": "round" }),
      h("rect",    { x: "28.517", y: "17.002", width: "3.158", height: "7.158",  fill: "#94a3b8" }),
      h("rect",    { x: "28.603", y: "26.798", width: "2.986", height: "10.986", fill: "#94a3b8" }),
      h("rect",    { x: "28.517", y: "40.421", width: "3.158", height: "7.158",  fill: "#94a3b8" }),
      h("path",    { d: "M 43,75 V 44.571 H 31.847", fill: "none", stroke: "#94a3b8", "stroke-width": "2.5", "stroke-linecap": "round", "stroke-linejoin": "round" }),
      h("path",    { d: "M 43,44.817 V 31.333 H 35.8", fill: "none", stroke: "#94a3b8", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }),
      h("polygon", { points: "34.5,31.333 37.1,29.8 37.1,32.866", fill: "#94a3b8" }),
      h("path",    { d: "M 43,0 V 19.961 H 31.945", fill: "none", stroke: "#94a3b8", "stroke-width": "2.5", "stroke-linecap": "round", "stroke-linejoin": "round" }),
    ]),
    Fuse:           () => h("g", [
      h("line",  { x1: "0", y1: "20", x2: "9", y2: "20", stroke: "#a8a8b8", "stroke-width": "2" }),
      h("line",  { x1: "31", y1: "20", x2: "40", y2: "20", stroke: "#a8a8b8", "stroke-width": "2" }),
      h("rect",  { x: "9", y: "11", width: "22", height: "18", rx: "3", fill: "#11192a", stroke: "#a8a8b8", "stroke-width": "1.6" }),
      h("polyline", { points: "12,20 16,14 20,26 24,14 28,20", fill: "none", stroke: "#e6edf3", "stroke-width": "1.6", "stroke-linecap": "round", "stroke-linejoin": "round" }),
    ]),
    // ── Current Sensor (CT) — toroid coil left, digital readout right ───────
    CurrentSensor:  () => h("g", [
      // body
      h("rect", { x: "1", y: "6", width: "38", height: "28", fill: "#0e1626", stroke: "#27ae60", "stroke-width": "1.6", rx: "3" }),
      // toroid annulus (evenodd = donut)
      h("path", { d: "M 3 20 a 6 6 0 1 0 12 0 a 6 6 0 1 0 -12 0 M 6 20 a 3 3 0 1 1 6 0 a 3 3 0 1 1 -6 0 Z", "fill-rule": "evenodd", fill: "#0a1820", stroke: "#27ae60", "stroke-width": "1.1" }),
      // winding circles at 210°/270°/330° on mid-ring
      h("circle", { cx: "5.5",  cy: "17.2", r: "1.25", fill: "#0a1820", stroke: "#27ae60", "stroke-width": "0.85" }),
      h("circle", { cx: "9",    cy: "14.5", r: "1.25", fill: "#0a1820", stroke: "#27ae60", "stroke-width": "0.85" }),
      h("circle", { cx: "12.5", cy: "17.2", r: "1.25", fill: "#0a1820", stroke: "#27ae60", "stroke-width": "0.85" }),
      // conductor wire through hole
      h("line", { x1: "1", y1: "20", x2: "15", y2: "20", stroke: "#a0c8e8", "stroke-width": "1.4", "stroke-linecap": "round" }),
      // soft divider
      h("line", { x1: "17", y1: "9", x2: "17", y2: "31", stroke: "#27ae60", "stroke-width": "0.4", opacity: "0.3" }),
      // unit badge centred above screen
      h("rect", { x: "22", y: "8", width: "14", height: "6.5", fill: "#0a1018", stroke: "#202830", "stroke-width": "0.8", rx: "1.5" }),
      h("text", { x: "29", y: "12.8", "text-anchor": "middle", "font-size": "5.2", "font-weight": "700", "font-family": "monospace", fill: "#27ae60" }, "A"),
      // digital screen
      h("rect", { x: "18", y: "16", width: "20", height: "13", fill: "#040a06", stroke: "#27ae60", "stroke-width": "0.8", rx: "1.5" }),
      // digital readout
      h("text", { x: "28", y: "25", "text-anchor": "middle", "font-size": "8.5", "font-weight": "700", "font-family": "'Digital7','Courier New',monospace", fill: "#27ae60" }, "2.45"),
    ]),
    // ── LED Indicator — coloured status dot (restored original element) ──────
    Indicator:      () => h("g", [
      // body / bezel
      h("rect", { x: "6", y: "4", width: "28", height: "32", fill: "#0e1520", stroke: "#606870", "stroke-width": "1.2", rx: "3" }),
      // LED mount depression
      h("circle", { cx: "20", cy: "17", r: "9", fill: "#090d12", stroke: "#1a232e", "stroke-width": "0.8" }),
      // LED chrome ring
      h("circle", { cx: "20", cy: "17", r: "7.5", fill: "none", stroke: "#707880", "stroke-width": "1" }),
      // LED body (green = ON)
      h("circle", { cx: "20", cy: "17", r: "6", fill: "#27ae60" }),
      // specular highlight
      h("ellipse", { cx: "18.2", cy: "15.0", rx: "2.0", ry: "1.3", fill: "rgba(255,255,255,0.42)" }),
      // label
      h("text", { x: "20", y: "32", "text-anchor": "middle", "font-size": "5", "font-weight": "700", "font-family": "monospace", fill: "#27ae60", opacity: "0.65" }, "LED"),
    ]),
    // ── Numeric Display — digital readout (was previously called "Indicator") ─
    NumericDisplay: () => h("g", [
      h("rect", { x: "1", y: "6", width: "38", height: "28", fill: "#0e1626", stroke: "#27ae60", "stroke-width": "1.6", rx: "3" }),
      // units badge
      h("rect", { x: "11", y: "8", width: "18", height: "6.5", fill: "#0a1018", stroke: "#202830", "stroke-width": "0.8", rx: "1.5" }),
      h("text", { x: "20", y: "12.8", "text-anchor": "middle", "font-size": "5", "font-weight": "700", "font-family": "monospace", fill: "#27ae60" }, "UNIT"),
      // digital screen
      h("rect", { x: "3", y: "16", width: "34", height: "14", fill: "#040a06", stroke: "#27ae60", "stroke-width": "0.8", rx: "1.5" }),
      // readout
      h("text", { x: "20", y: "25.5", "text-anchor": "middle", "font-size": "8.5", "font-weight": "700", "font-family": "'Digital7','Courier New',monospace", fill: "#27ae60" }, "001.500"),
    ]),
    Circle:         () => h("g", [
      h("circle", { cx: "20", cy: "20", r: "16", fill: "#22223a", stroke: "#a8a8b8", "stroke-width": "2" }),
    ]),
    Rect:           () => h("g", [
      h("rect", { x: "4", y: "8", width: "32", height: "24", fill: "#22223a", stroke: "#a8a8b8", "stroke-width": "2", rx: "3" }),
    ]),
    TextLabel:      () => h("g", [
      h("text", { x: "20", y: "25", "text-anchor": "middle", "font-size": "16", fill: "#e6edf3", "font-weight": "bold" }, "T"),
    ]),
    TransparentLabel: () => h("g", [
      h("text", { x: "20", y: "25", "text-anchor": "middle", "font-size": "14", fill: "#e6edf3", "font-weight": "bold", opacity: "0.7" }, "T"),
      h("line", { x1: "6", y1: "30", x2: "34", y2: "30", stroke: "#e6edf3", "stroke-width": "1", opacity: "0.35" }),
    ]),
    // ── Text Box — scrollable live-text panel ──────────────────────────────
    TextBox: () => h("g", [
      // Background
      h("rect", { x: "1", y: "1", width: "38", height: "38", rx: "3", fill: "#0d1117", stroke: "#2a3a4a", "stroke-width": "1.2" }),
      // Title bar
      h("rect", { x: "1", y: "1", width: "38", height: "9",  rx: "2", fill: "#0e1f30" }),
      h("rect", { x: "1", y: "5", width: "38", height: "5",  fill: "#0e1f30" }),
      h("line", { x1: "1", y1: "10", x2: "39", y2: "10", stroke: "#2a3a4a", "stroke-width": "0.6" }),
      h("text", { x: "20", y: "8", "text-anchor": "middle", "font-size": "4.5", fill: "#e8eaf0", "font-weight": "700", "font-family": "monospace" }, "TITLE"),
      // Content lines
      h("text", { x: "4", y: "16", "font-size": "4", fill: "#c9d1d9", "font-family": "sans-serif" }, "Telemetry value text"),
      h("text", { x: "4", y: "22", "font-size": "4", fill: "#c9d1d9", "font-family": "sans-serif" }, "wraps to next line"),
      h("text", { x: "4", y: "28", "font-size": "4", fill: "#4a9eff", "font-family": "sans-serif" }, "live mnemonic →"),
      // Scrollbar hint
      h("rect", { x: "35", y: "11", width: "3", height: "27", rx: "1.5", fill: "#0d1520" }),
      h("rect", { x: "35", y: "14", width: "3", height: "10", rx: "1.5", fill: "#2a4a6a" }),
    ]),
    // ── Data Grid — two-column label|value telemetry table ──────────────────
    DataGrid: () => h("g", [
      // Background
      h("rect", { x: "2", y: "2", width: "36", height: "36", fill: "#0b0f18", stroke: "#1e3040", "stroke-width": "1.2", rx: "3" }),
      // Column divider (vertical at ~48%)
      h("line", { x1: "19", y1: "2", x2: "19", y2: "38", stroke: "rgba(255,255,255,0.07)", "stroke-width": "0.8" }),
      // Row separators
      h("line", { x1: "4", y1: "15", x2: "36", y2: "15", stroke: "rgba(255,255,255,0.05)", "stroke-width": "0.7" }),
      h("line", { x1: "4", y1: "24", x2: "36", y2: "24", stroke: "rgba(255,255,255,0.05)", "stroke-width": "0.7" }),
      h("line", { x1: "4", y1: "33", x2: "36", y2: "33", stroke: "rgba(255,255,255,0.05)", "stroke-width": "0.7" }),
      // Alternating stripe on row 2
      h("rect", { x: "3", y: "15", width: "34", height: "9", fill: "rgba(255,255,255,0.025)" }),
      // Label column (left)
      h("text", { x: "5", y: "12",  "font-size": "4.5", fill: "#5e7888", "font-family": "sans-serif" }, "TEMP"),
      h("text", { x: "5", y: "21",  "font-size": "4.5", fill: "#5e7888", "font-family": "sans-serif" }, "VOLT"),
      h("text", { x: "5", y: "30",  "font-size": "4.5", fill: "#5e7888", "font-family": "sans-serif" }, "CURR"),
      // Value column (right, cyan monospace)
      h("text", { x: "35", y: "12", "font-size": "4.5", fill: "#00ddc8", "font-family": "monospace", "font-weight": "600", "text-anchor": "end" }, "28.4"),
      h("text", { x: "35", y: "21", "font-size": "4.5", fill: "#00ddc8", "font-family": "monospace", "font-weight": "600", "text-anchor": "end" }, "5.00"),
      h("text", { x: "35", y: "30", "font-size": "4.5", fill: "#00ddc8", "font-family": "monospace", "font-weight": "600", "text-anchor": "end" }, "1.23"),
    ]),
    Image:          () => h("g", [
      h("rect",  { x: "2", y: "2", width: "36", height: "36", fill: "#0d1117", stroke: "#30363d", "stroke-width": "1.5", rx: "3" }),
      h("rect",  { x: "8", y: "8", width: "24", height: "18", fill: "#1a2030", stroke: "#30363d", "stroke-width": "1" }),
      h("polygon", { points: "8,26 16,14 22,20 26,16 32,26", fill: "#2d4060", opacity: "0.8" }),
      h("circle", { cx: "13", cy: "14", r: "3", fill: "#ffcc00", opacity: "0.7" }),
    ]),
    // ── System — metallic-bordered block with green status fill ────────────
    System:         () => h("g", [
      // Outer metallic rim
      h("rect", { x: "2", y: "9", width: "36", height: "22", rx: "3", fill: "#0d1520", stroke: "#686878", "stroke-width": "1.4" }),
      // Status fill overlay (green when ON)
      h("rect", { x: "2", y: "9", width: "36", height: "22", rx: "3", fill: "#27ae60", opacity: "0.14" }),
      // Inner sheen
      h("rect", { x: "3", y: "9.5", width: "34", height: "7", rx: "2", fill: "rgba(255,255,255,0.04)" }),
      // Active border glow (#bdd1c5 default border)
      h("rect", { x: "2", y: "9", width: "36", height: "22", rx: "3", fill: "none", stroke: "#bdd1c5", "stroke-width": "1.1" }),
      // Left connector port dot
      h("circle", { cx: "2",  cy: "20", r: "2.2", fill: "#0d1117", stroke: "#8090a0", "stroke-width": "0.9" }),
      // Right connector port dot
      h("circle", { cx: "38", cy: "20", r: "2.2", fill: "#0d1117", stroke: "#8090a0", "stroke-width": "0.9" }),
      // Label
      h("text", { x: "20", y: "21", "text-anchor": "middle", "dominant-baseline": "middle", "font-size": "5.2", fill: "#c8d8e8", "font-weight": "700", "font-family": "sans-serif", "letter-spacing": "0.5" }, "SYSTEM"),
    ]),
    // ── DPDT Switch — dark body, 4 corner ports, 4 interior COMs, horizontal poles ──
    DPDT:           () => h("g", [
      // body
      h("rect", { x: "2", y: "2", width: "36", height: "36", fill: "#22223a", stroke: "#a8a8b8", "stroke-width": "2", rx: "4" }),
      // fixed corner arms: TL→CTL, TR→CTR, BL→CBL, BR→CBR
      h("line", { x1: "4",  y1: "4",  x2: "13", y2: "13", stroke: "#a8c8e8", "stroke-width": "1.8", "stroke-linecap": "round" }),
      h("line", { x1: "36", y1: "4",  x2: "27", y2: "13", stroke: "#a8c8e8", "stroke-width": "1.8", "stroke-linecap": "round" }),
      h("line", { x1: "4",  y1: "36", x2: "13", y2: "27", stroke: "#a8c8e8", "stroke-width": "1.8", "stroke-linecap": "round" }),
      h("line", { x1: "36", y1: "36", x2: "27", y2: "27", stroke: "#a8c8e8", "stroke-width": "1.8", "stroke-linecap": "round" }),
      // horizontal poles (POS-1): CTL─CTR and CBL─CBR
      h("line", { x1: "13", y1: "13", x2: "27", y2: "13", stroke: "#e0f0ff", "stroke-width": "2", "stroke-linecap": "round" }),
      h("line", { x1: "13", y1: "27", x2: "27", y2: "27", stroke: "#e0f0ff", "stroke-width": "2", "stroke-linecap": "round" }),
      // corner port dots
      h("circle", { cx: "4",  cy: "4",  r: "2.5", fill: "#0d1117", stroke: "#8090a0", "stroke-width": "1" }),
      h("circle", { cx: "36", cy: "4",  r: "2.5", fill: "#0d1117", stroke: "#8090a0", "stroke-width": "1" }),
      h("circle", { cx: "4",  cy: "36", r: "2.5", fill: "#0d1117", stroke: "#8090a0", "stroke-width": "1" }),
      h("circle", { cx: "36", cy: "36", r: "2.5", fill: "#0d1117", stroke: "#8090a0", "stroke-width": "1" }),
      // interior COM dots: CTL, CTR, CBL, CBR
      h("circle", { cx: "13", cy: "13", r: "2.5", fill: "#0d1117", stroke: "#8090a0", "stroke-width": "1" }),
      h("circle", { cx: "27", cy: "13", r: "2.5", fill: "#0d1117", stroke: "#8090a0", "stroke-width": "1" }),
      h("circle", { cx: "13", cy: "27", r: "2.5", fill: "#0d1117", stroke: "#8090a0", "stroke-width": "1" }),
      h("circle", { cx: "27", cy: "27", r: "2.5", fill: "#0d1117", stroke: "#8090a0", "stroke-width": "1" }),
    ]),
    // ── DPDT_N — outer ports parallel to inner COM rows (horizontal arms) ──
    DPDT_N:         () => h("g", [
      h("rect", { x: "2", y: "2", width: "36", height: "36", fill: "#22223a", stroke: "#a8a8b8", "stroke-width": "2", rx: "4" }),
      // fixed horizontal arms: outer-left→CL and CR→outer-right
      h("line", { x1: "4",  y1: "13", x2: "13", y2: "13", stroke: "#a8c8e8", "stroke-width": "1.8", "stroke-linecap": "round" }),
      h("line", { x1: "27", y1: "13", x2: "36", y2: "13", stroke: "#a8c8e8", "stroke-width": "1.8", "stroke-linecap": "round" }),
      h("line", { x1: "4",  y1: "27", x2: "13", y2: "27", stroke: "#a8c8e8", "stroke-width": "1.8", "stroke-linecap": "round" }),
      h("line", { x1: "27", y1: "27", x2: "36", y2: "27", stroke: "#a8c8e8", "stroke-width": "1.8", "stroke-linecap": "round" }),
      // horizontal poles (POS-1): CTL─CTR and CBL─CBR
      h("line", { x1: "13", y1: "13", x2: "27", y2: "13", stroke: "#e0f0ff", "stroke-width": "2", "stroke-linecap": "round" }),
      h("line", { x1: "13", y1: "27", x2: "27", y2: "27", stroke: "#e0f0ff", "stroke-width": "2", "stroke-linecap": "round" }),
      // outer ports (left & right edges, parallel to inner rows)
      h("circle", { cx: "4",  cy: "13", r: "2.5", fill: "#0d1117", stroke: "#8090a0", "stroke-width": "1" }),
      h("circle", { cx: "36", cy: "13", r: "2.5", fill: "#0d1117", stroke: "#8090a0", "stroke-width": "1" }),
      h("circle", { cx: "4",  cy: "27", r: "2.5", fill: "#0d1117", stroke: "#8090a0", "stroke-width": "1" }),
      h("circle", { cx: "36", cy: "27", r: "2.5", fill: "#0d1117", stroke: "#8090a0", "stroke-width": "1" }),
      // interior COM dots
      h("circle", { cx: "13", cy: "13", r: "2.5", fill: "#0d1117", stroke: "#8090a0", "stroke-width": "1" }),
      h("circle", { cx: "27", cy: "13", r: "2.5", fill: "#0d1117", stroke: "#8090a0", "stroke-width": "1" }),
      h("circle", { cx: "13", cy: "27", r: "2.5", fill: "#0d1117", stroke: "#8090a0", "stroke-width": "1" }),
      h("circle", { cx: "27", cy: "27", r: "2.5", fill: "#0d1117", stroke: "#8090a0", "stroke-width": "1" }),
    ]),
    // ── Pump — circular housing with impeller blades and inlet/outlet ──────
    Pump:           () => h("g", [
      h("line",    { x1: "0",  y1: "20", x2: "9",  y2: "20", stroke: "#4a9eff", "stroke-width": "2" }),
      h("line",    { x1: "31", y1: "20", x2: "40", y2: "20", stroke: "#4a9eff", "stroke-width": "2" }),
      h("circle",  { cx: "20", cy: "20", r: "13", fill: "#0e1828", stroke: "#4a9eff", "stroke-width": "2" }),
      h("circle",  { cx: "20", cy: "20", r: "8",  fill: "#142030", stroke: "#4a9eff", "stroke-width": "1", opacity: "0.7" }),
      h("line",    { x1: "20", y1: "12", x2: "20", y2: "28", stroke: "#4a9eff", "stroke-width": "1.5", "stroke-linecap": "round" }),
      h("line",    { x1: "12", y1: "20", x2: "28", y2: "20", stroke: "#4a9eff", "stroke-width": "1.5", "stroke-linecap": "round" }),
      h("line",    { x1: "14", y1: "14", x2: "26", y2: "26", stroke: "#4a9eff", "stroke-width": "1.5", "stroke-linecap": "round", opacity: "0.6" }),
      h("line",    { x1: "26", y1: "14", x2: "14", y2: "26", stroke: "#4a9eff", "stroke-width": "1.5", "stroke-linecap": "round", opacity: "0.6" }),
      h("circle",  { cx: "20", cy: "20", r: "2.5", fill: "#4a9eff", opacity: "0.9" }),
    ]),
    // ── SSPA — metallic chassis with right-pointing amplifier triangle ─────
    SSPA:           () => h("g", [
      // Chassis body
      h("rect", { x: "2", y: "5", width: "36", height: "30", rx: "2.5", fill: "#0e1828", stroke: "#686878", "stroke-width": "1.2" }),
      // RF connector nubs — left & right
      h("rect", { x: "0",  y: "16", width: "3", height: "8", rx: "1", fill: "#2a4a6a", stroke: "#5a7a9a", "stroke-width": "0.7" }),
      h("rect", { x: "37", y: "16", width: "3", height: "8", rx: "1", fill: "#2a4a6a", stroke: "#5a7a9a", "stroke-width": "0.7" }),
      // Connector centre dots
      h("circle", { cx: "1.5",  cy: "20", r: "1.4", fill: "#0d1117", stroke: "#8090a0", "stroke-width": "0.6" }),
      h("circle", { cx: "38.5", cy: "20", r: "1.4", fill: "#0d1117", stroke: "#8090a0", "stroke-width": "0.6" }),
      // Signal lines IN → triangle, triangle apex → OUT
      h("line", { x1: "3",  y1: "20", x2: "9",  y2: "20", stroke: "#4ade80", "stroke-width": "1.2", "stroke-linecap": "round", opacity: "0.75" }),
      h("line", { x1: "31", y1: "20", x2: "37", y2: "20", stroke: "#4ade80", "stroke-width": "1.2", "stroke-linecap": "round", opacity: "0.75" }),
      // Amplifier triangle fill (green)
      h("path", { d: "M 9,8 L 31,20 L 9,32 Z", fill: "#27ae60", opacity: "0.28" }),
      // Amplifier triangle border (green)
      h("path", { d: "M 9,8 L 31,20 L 9,32 Z", fill: "none", stroke: "#27ae60", "stroke-width": "1.5", "stroke-linejoin": "round" }),
      // Gain stripes inside triangle (horizontal dashed)
      h("line", { x1: "10", y1: "14", x2: "21", y2: "14", stroke: "#27ae60", "stroke-width": "0.6", "stroke-dasharray": "2.5,2", opacity: "0.40" }),
      h("line", { x1: "10", y1: "20", x2: "30", y2: "20", stroke: "#27ae60", "stroke-width": "0.6", "stroke-dasharray": "2.5,2", opacity: "0.40" }),
      h("line", { x1: "10", y1: "26", x2: "21", y2: "26", stroke: "#27ae60", "stroke-width": "0.6", "stroke-dasharray": "2.5,2", opacity: "0.40" }),
      // Apex output glow dot
      h("circle", { cx: "31", cy: "20", r: "2.2", fill: "#27ae60", opacity: "0.72" }),
      h("circle", { cx: "31", cy: "20", r: "0.9", fill: "#f0fdf4", opacity: "0.90" }),
      // Device label
      h("text", { x: "20", y: "10", "text-anchor": "middle", "dominant-baseline": "middle", "font-size": "5", fill: "#c8d8e8", "font-weight": "700", "font-family": "sans-serif", "letter-spacing": "0.4" }, "SSPA"),
    ]),
    // ── Rubidium Atom (energy-state) — laser, cell with A/B/C levels, detector
    RubidiumAtom:   () => h("g", [
      // Laser block (left)
      h("rect", { x: "0", y: "14", width: "10", height: "12", rx: "1.5", fill: "#081830", stroke: "#0088dd", "stroke-width": "0.9" }),
      h("text", { x: "5", y: "22", "text-anchor": "middle", "font-size": "3.5", fill: "#00aaff", "font-weight": "700", "font-family": "monospace" }, "LAS"),
      // Beam laser→cell
      h("rect", { x: "10", y: "19.5", width: "5", height: "1.5", rx: "0.5", fill: "#00ccff", opacity: "0.8" }),
      // Rb cell
      h("rect", { x: "15", y: "8", width: "20", height: "26", rx: "2", fill: "#060a10", stroke: "#2a6aaa", "stroke-width": "1" }),
      // Level C
      h("line", { x1: "17", y1: "12", x2: "33", y2: "12", stroke: "#3a6080", "stroke-width": "1.1", opacity: "0.75" }),
      h("text", { x: "34.5", y: "14.5", "font-size": "4", fill: "#3a6080", "font-weight": "700", "font-family": "monospace" }, "C"),
      // Level B (beam level)
      h("line", { x1: "17", y1: "21", x2: "33", y2: "21", stroke: "#00aaff", "stroke-width": "1.1", opacity: "0.75" }),
      h("text", { x: "34.5", y: "23.5", "font-size": "4", fill: "#00aaff", "font-weight": "700", "font-family": "monospace" }, "B"),
      // Level A
      h("line", { x1: "17", y1: "30", x2: "33", y2: "30", stroke: "#3a6080", "stroke-width": "1.1", opacity: "0.75" }),
      h("text", { x: "34.5", y: "32.5", "font-size": "4", fill: "#3a6080", "font-weight": "700", "font-family": "monospace" }, "A"),
      // Beam through cell
      h("rect", { x: "15", y: "20.2", width: "20", height: "1.4", fill: "#00ccff", opacity: "0.55" }),
      // Electrons on B level
      h("circle", { cx: "20", cy: "21", r: "2.2", fill: "#00e5ff", opacity: "0.9" }),
      h("circle", { cx: "25", cy: "21", r: "2.2", fill: "#00e5ff", opacity: "0.9" }),
      h("circle", { cx: "30", cy: "21", r: "2.2", fill: "#00e5ff", opacity: "0.9" }),
      // Beam cell→detector
      h("rect", { x: "35", y: "19.5", width: "5", height: "1.5", rx: "0.5", fill: "#00ccff", opacity: "0.8" }),
      // Detector block (right)
      h("rect", { x: "30", y: "14", width: "10", height: "12", rx: "1.5", fill: "#081812", stroke: "#27ae60", "stroke-width": "0.9" }),
      h("text", { x: "35", y: "22", "text-anchor": "middle", "font-size": "3", fill: "#27ae60", "font-weight": "700", "font-family": "monospace" }, "DET"),
      // LEDs top
      h("circle", { cx: "3",  cy: "4", r: "2", fill: "#27ae60" }),
      h("circle", { cx: "8",  cy: "4", r: "2", fill: "#d4860a", opacity: "0.5" }),
      h("text", { x: "20", y: "40", "text-anchor": "middle", "font-size": "4", fill: "#8ba0b8", "font-family": "monospace", "font-weight": "700" }, "Rb ATOM"),
    ]),
    // ── Horn Antenna ──────────────────────────────────────────────────────────
    HornAntenna: () => h("g", [
      // Outer frame
      h("rect", { x: "1", y: "1", width: "38", height: "38", rx: "3", fill: "#0d1117", stroke: "#4a6888", "stroke-width": "1.2" }),
      // Waveguide feed
      h("rect", { x: "3", y: "17.5", width: "8", height: "5", rx: "1", fill: "#2e404e", stroke: "#4a9eff", "stroke-width": "0.8" }),
      // Horn flare (trapezoid)
      h("path", { d: "M 11,17.5 L 11,22.5 L 24,32 L 24,8 Z", fill: "#2e404e", stroke: "#4a9eff", "stroke-width": "0.8", "stroke-linejoin": "round" }),
      // Aperture line
      h("line", { x1: "24", y1: "8", x2: "24", y2: "32", stroke: "#00aaff", "stroke-width": "1.8", "stroke-linecap": "round" }),
      // RF arcs (3 arcs — static preview)
      h("path", { d: "M 28.4,13.5 A 8,8 0 0,1 28.4,26.5", fill: "none", stroke: "#00e5ff", "stroke-width": "1.2", opacity: "0.80" }),
      h("path", { d: "M 31.5,10.0 A 14,14 0 0,1 31.5,30.0", fill: "none", stroke: "#00e5ff", "stroke-width": "0.9", opacity: "0.55" }),
      h("path", { d: "M 34.2,6.5 A 20,20 0 0,1 34.2,33.5", fill: "none", stroke: "#00e5ff", "stroke-width": "0.7", opacity: "0.30" }),
      // ON LED
      h("circle", { cx: "5", cy: "5", r: "2.5", fill: "#27ae60" }),
    ]),
    // ── Patch Array Antenna — 2×4 patch grid on ground plane, broadside arc ─
    PatchArrayAntenna: () => h("g", [
      // Outer frame
      h("rect", { x: "1", y: "1", width: "38", height: "38", rx: "3", fill: "#0d1117", stroke: "#4a6888", "stroke-width": "1.2" }),
      // Ground plane
      h("rect", { x: "3", y: "26", width: "34", height: "4", rx: "1", fill: "#1a2a3a", stroke: "#3a6080", "stroke-width": "0.7" }),
      // 2×4 patch elements (row 1 y=16, row 2 y=22; cols x=4,11,18,25)
      ...[4, 11, 18, 25].flatMap(x => [16, 22].map(y =>
        h("rect", { x: String(x), y: String(y), width: "6", height: "3.5", rx: "0.5", fill: "#1a5080", stroke: "#4a9eff", "stroke-width": "0.6" })
      )),
      // Broadside radiation arc (main lobe)
      h("path", { d: "M 9,16 A 11,11 0 0,1 31,16", fill: "none", stroke: "#00e5ff", "stroke-width": "1.2", opacity: "0.85" }),
      h("path", { d: "M 5,13  A 16,16 0 0,1 35,13",  fill: "none", stroke: "#00e5ff", "stroke-width": "0.8", opacity: "0.50" }),
      h("path", { d: "M 2,10  A 21,21 0 0,1 38,10",  fill: "none", stroke: "#00e5ff", "stroke-width": "0.5", opacity: "0.28" }),
      // ON LED
      h("circle", { cx: "5", cy: "5", r: "2.5", fill: "#27ae60" }),
    ]),
    // ── Helical Antenna — coil winding on ground disc, tip glow ─────────────
    HelicalAntenna: () => h("g", [
      // Outer frame
      h("rect", { x: "1", y: "1", width: "38", height: "38", rx: "3", fill: "#0d1117", stroke: "#4a6888", "stroke-width": "1.2" }),
      // Back arcs (dim, far-side winding) — 4 half-turns
      h("path", { d: "M 28,9  A 9,3 0 0,1 11,12", fill: "none", stroke: "#006699", "stroke-width": "1.1", opacity: "0.4" }),
      h("path", { d: "M 28,15 A 9,3 0 0,1 11,18", fill: "none", stroke: "#006699", "stroke-width": "1.1", opacity: "0.4" }),
      h("path", { d: "M 28,21 A 9,3 0 0,1 11,24", fill: "none", stroke: "#006699", "stroke-width": "1.1", opacity: "0.4" }),
      h("path", { d: "M 28,27 A 9,3 0 0,1 11,30", fill: "none", stroke: "#006699", "stroke-width": "1.1", opacity: "0.4" }),
      // Front arcs (bright, near-side winding)
      h("path", { d: "M 11,6  A 9,3 0 0,0 28,9",  fill: "none", stroke: "#00ccff", "stroke-width": "1.6" }),
      h("path", { d: "M 11,12 A 9,3 0 0,0 28,15", fill: "none", stroke: "#00ccff", "stroke-width": "1.6" }),
      h("path", { d: "M 11,18 A 9,3 0 0,0 28,21", fill: "none", stroke: "#00ccff", "stroke-width": "1.6" }),
      h("path", { d: "M 11,24 A 9,3 0 0,0 28,27", fill: "none", stroke: "#00ccff", "stroke-width": "1.6" }),
      // Tip dot (open end)
      h("circle", { cx: "20", cy: "5", r: "2.2", fill: "#00e5ff", opacity: "0.9" }),
      // Feed stub down to disc
      h("line",   { x1: "11", y1: "30", x2: "20", y2: "30", stroke: "#00aadd", "stroke-width": "1.2" }),
      h("line",   { x1: "20", y1: "30", x2: "20", y2: "33", stroke: "#00aadd", "stroke-width": "1.2" }),
      // Ground disc (flat ellipse)
      h("ellipse", { cx: "20", cy: "34", rx: "14", ry: "3.5", fill: "#1a3a55", stroke: "#3a6080", "stroke-width": "0.9" }),
      h("ellipse", { cx: "20", cy: "34", rx: "9",  ry: "2.2", fill: "none",    stroke: "#2a4a62", "stroke-width": "0.5", opacity: "0.7" }),
    ]),
    // ── Offset Reflector — asymmetric dish + horn lower-right + rightward beam ──
    OffsetReflector: () => h("g", [
      // Outer frame
      h("rect", { x: "1", y: "1", width: "38", height: "38", rx: "3", fill: "#0d1117", stroke: "#4a6888", "stroke-width": "1.2" }),
      // Dish — ASYMMETRIC offset parabolic section (NO strut, NO fill)
      // Scaled from M 78,10 C 15,10 10,55 50,98 (160×110) → 40×40
      // P0=(20,4) P1=(4,4) P2=(3,20) P3=(13,36)  — upper portion gentle, lower tighter
      h("path", { d: "M 20,4 C 4,4 3,20 13,36", fill: "none", stroke: "#1e4060", "stroke-width": "3.5", "stroke-linecap": "round" }),
      h("path", { d: "M 20,4 C 4,4 3,20 13,36", fill: "none", stroke: "#4a9eff", "stroke-width": "1.8", "stroke-linecap": "round" }),
      h("path", { d: "M 19,5 C 5,5 4,19 14,34",  fill: "none", stroke: "#00ccff", "stroke-width": "0.6", "stroke-linecap": "round", opacity: "0.45" }),
      // Horn — free space lower-right, NO strut, pointing upper-left (-152°)
      h("g", { transform: "translate(27,30) rotate(-152)" }, [
        h("rect",    { x: "-5", y: "-1.5", width: "5", height: "3", fill: "#1a3a58", stroke: "#3a78b8", "stroke-width": "0.6", rx: "0.3" }),
        h("polygon", { points: "0,-1.5 0,1.5 6,3.5 6,-3.5", fill: "#1e3a58", stroke: "#4a9eff", "stroke-width": "0.7" }),
        h("line",    { x1: "6", y1: "-3.5", x2: "6", y2: "3.5", stroke: "#00aaff", "stroke-width": "1.2" }),
      ]),
      // Focal point dot (in free space between horn aperture and dish)
      h("circle", { cx: "22", cy: "27", r: "1.3", fill: "#00ccff", opacity: "0.85" }),
      // Horn → dish emission arcs (from focal ~(22,27) toward dish, up-left)
      h("path", { d: "M 18,28 A 5,5 0 0,1 21,22",  fill: "none", stroke: "#00ccff", "stroke-width": "0.9", opacity: "0.70" }),
      h("path", { d: "M 14,29 A 9,9 0 0,1 20,19",  fill: "none", stroke: "#00ccff", "stroke-width": "0.6", opacity: "0.40" }),
      // Reflected beam arcs — rightward from dish aperture, centre (16,20)
      h("path", { d: "M 21,19 A 5,5 0 0,1 21,21",   fill: "none", stroke: "#00e5ff", "stroke-width": "1.3", opacity: "0.90" }),
      h("path", { d: "M 25,18 A 9,9 0 0,1 25,22",   fill: "none", stroke: "#00e5ff", "stroke-width": "0.85", opacity: "0.60" }),
      h("path", { d: "M 30,17 A 14,14 0 0,1 30,23", fill: "none", stroke: "#00e5ff", "stroke-width": "0.55", opacity: "0.35" }),
    ]),
    // ── Rubidium Atomic Clock — dark chassis, atom orbitals, nucleus dot ────
    RubidiumClock:  () => h("g", [
      // body
      h("rect", { x: "1", y: "1", width: "38", height: "38", rx: "3", fill: "#0d1117", stroke: "#4a6888", "stroke-width": "1.2" }),
      // 3 orbital ellipses at 0/60/120 deg (all through centre 20,22)
      h("ellipse", { cx: "20", cy: "22", rx: "14", ry: "5.5", fill: "none", stroke: "#00ccff", "stroke-width": "0.9", opacity: "0.55" }),
      h("ellipse", { cx: "20", cy: "22", rx: "14", ry: "5.5", fill: "none", stroke: "#00ccff", "stroke-width": "0.9", opacity: "0.55",
        transform: "rotate(60,20,22)" }),
      h("ellipse", { cx: "20", cy: "22", rx: "14", ry: "5.5", fill: "none", stroke: "#00ccff", "stroke-width": "0.9", opacity: "0.55",
        transform: "rotate(120,20,22)" }),
      // nucleus
      h("circle", { cx: "20", cy: "22", r: "3.5", fill: "#0a3a72", stroke: "#00ccff", "stroke-width": "0.8" }),
      h("circle", { cx: "20", cy: "22", r: "1.4", fill: "#4ab8ff", opacity: "0.9" }),
      // 3 electrons at different orbit positions
      h("circle", { cx: "34", cy: "22", r: "2",   fill: "#00e5ff", opacity: "0.9" }),
      h("circle", { cx: "13", cy: "14", r: "2",   fill: "#00e5ff", opacity: "0.9" }),
      h("circle", { cx: "13", cy: "30", r: "2",   fill: "#00e5ff", opacity: "0.9" }),
      // ON LED (green, top-left)
      h("circle", { cx: "5",  cy: "5",  r: "2.5", fill: "#27ae60" }),
      // LK LED (gold, beside it)
      h("circle", { cx: "12", cy: "5",  r: "2.5", fill: "#d4860a", opacity: "0.55" }),
      // label
      h("text", { x: "20", y: "9", "text-anchor": "middle", "font-size": "4.2",
        fill: "#8ba0b8", "font-weight": "700", "font-family": "monospace", "letter-spacing": "0.5" }, "Rb CLK"),
    ]),
    // ── ECLSS icons ───────────────────────────────────────────────────────
    SolenoidValve:  () => h("g", [
      // coil body
      h("rect", { x: "10", y: "1", width: "20", height: "10", fill: "#0a0a1e", stroke: "#606090", "stroke-width": "1.5", rx: "2" }),
      // winding marks
      h("line", { x1: "14", y1: "1", x2: "14", y2: "11", stroke: "#404070", "stroke-width": "1" }),
      h("line", { x1: "18", y1: "1", x2: "18", y2: "11", stroke: "#404070", "stroke-width": "1" }),
      h("line", { x1: "22", y1: "1", x2: "22", y2: "11", stroke: "#404070", "stroke-width": "1" }),
      h("line", { x1: "26", y1: "1", x2: "26", y2: "11", stroke: "#404070", "stroke-width": "1" }),
      // status LED on coil
      h("circle", { cx: "33", cy: "6", r: "2.5", fill: "#4a9eff", opacity: "0.85" }),
      // stem
      h("rect", { x: "18", y: "11", width: "4", height: "5", fill: "#606080" }),
      // bow-tie valve body
      h("polygon", { points: "4,16 36,32 36,16 4,32", fill: "#0a0a1e", stroke: "#a8a8b8", "stroke-width": "2" }),
      // SOL label
      h("text", { x: "20", y: "39", "text-anchor": "middle", "font-size": "5", fill: "#606090", "font-weight": "700", "font-family": "monospace" }, "SOL"),
    ]),
    MotorValve:     () => h("g", [
      // motor circle
      h("circle", { cx: "20", cy: "9", r: "8", fill: "#0a1018", stroke: "#27ae60", "stroke-width": "1.8" }),
      // M label
      h("text", { x: "20", y: "12.5", "text-anchor": "middle", "font-size": "8", fill: "#27ae60", "font-weight": "900", "font-family": "monospace" }, "M"),
      // stem
      h("rect", { x: "18", y: "17", width: "4", height: "4", fill: "#407060" }),
      // bow-tie valve body
      h("polygon", { points: "4,21 36,35 36,21 4,35", fill: "#0a1018", stroke: "#a8a8b8", "stroke-width": "2" }),
      // MOV label
      h("text", { x: "20", y: "40", "text-anchor": "middle", "font-size": "5", fill: "#407060", "font-weight": "700", "font-family": "monospace" }, "MOV"),
    ]),
    PyroValve:      () => h("g", [
      // pyro cap
      h("rect", { x: "12", y: "0", width: "16", height: "8", fill: "#2a1800", stroke: "#ff9800", "stroke-width": "1.5", rx: "2" }),
      // P label in cap
      h("text", { x: "20", y: "7", "text-anchor": "middle", "font-size": "7", fill: "#ff9800", "font-weight": "900", "font-family": "monospace" }, "P"),
      // stem
      h("rect", { x: "18", y: "8", width: "4", height: "5", fill: "#a07030" }),
      // bow-tie valve body
      h("polygon", { points: "4,13 36,29 36,13 4,29", fill: "#1a1208", stroke: "#c08030", "stroke-width": "2" }),
      // PYRO label
      h("text", { x: "20", y: "39", "text-anchor": "middle", "font-size": "5", fill: "#ff9800", "font-weight": "700", "font-family": "monospace" }, "PYRO"),
    ]),
    CheckValve:     () => h("g", [
      // inlet / outlet pipes
      h("rect", { x: "0",  y: "17", width: "8",  height: "6", fill: "#0e1820", stroke: "#304858", "stroke-width": "1", rx: "1" }),
      h("rect", { x: "32", y: "17", width: "8",  height: "6", fill: "#0e1820", stroke: "#304858", "stroke-width": "1", rx: "1" }),
      // circle body
      h("circle", { cx: "20", cy: "20", r: "12", fill: "#0a1018", stroke: "#909090", "stroke-width": "2" }),
      // flap (vertical line)
      h("line", { x1: "20", y1: "10", x2: "20", y2: "30", stroke: "#708090", "stroke-width": "3", "stroke-linecap": "round" }),
      // flow arrow (left to right)
      h("line", { x1: "10", y1: "20", x2: "17", y2: "20", stroke: "#27ae60", "stroke-width": "2", "stroke-linecap": "round" }),
      h("polygon", { points: "17,17 23,20 17,23", fill: "#27ae60" }),
      // blocked-direction X on right
      h("line", { x1: "24", y1: "17", x2: "28", y2: "23", stroke: "#e74c3c", "stroke-width": "1.2", opacity: "0.7" }),
      h("line", { x1: "28", y1: "17", x2: "24", y2: "23", stroke: "#e74c3c", "stroke-width": "1.2", opacity: "0.7" }),
    ]),
    HeatExchanger:  () => h("g", [
      // outer body
      h("rect", { x: "2", y: "2", width: "36", height: "36", fill: "#0a1018", stroke: "#4a6070", "stroke-width": "2", rx: "3" }),
      // divider
      h("line", { x1: "2", y1: "21", x2: "38", y2: "21", stroke: "#4a6070", "stroke-width": "1", "stroke-dasharray": "3,2" }),
      // hot serpentine (top)
      h("path", { d: "M4 12 Q10 7 16 12 Q22 17 28 12 Q34 7 38 12", fill: "none", stroke: "#c04020", "stroke-width": "2.5", "stroke-linecap": "round" }),
      // hot inlet arrow
      h("polygon", { points: "2,10 2,14 7,12", fill: "#c04020" }),
      // cold serpentine (bottom)
      h("path", { d: "M38 30 Q32 25 26 30 Q20 35 14 30 Q8 25 2 30", fill: "none", stroke: "#2060c0", "stroke-width": "2.5", "stroke-linecap": "round" }),
      // cold inlet arrow
      h("polygon", { points: "38,28 38,32 33,30", fill: "#2060c0" }),
      // HEX label
      h("text", { x: "20", y: "39", "text-anchor": "middle", "font-size": "5", fill: "#607080", "font-weight": "700", "font-family": "monospace" }, "HEX"),
    ]),
    Radiator:       () => h("g", [
      // manifold pipes top
      h("rect", { x: "5",  y: "0", width: "6", height: "10", fill: "#1a2e44", stroke: "#4a7a9a", "stroke-width": "1.2", rx: "1" }),
      h("rect", { x: "29", y: "0", width: "6", height: "10", fill: "#1a2e44", stroke: "#4a7a9a", "stroke-width": "1.2", rx: "1" }),
      // panel body
      h("rect", { x: "2", y: "9", width: "36", height: "22", fill: "#0e1c2c", stroke: "#4a7a9a", "stroke-width": "2", rx: "2" }),
      // fin lines
      h("line", { x1: "9",  y1: "9", x2: "9",  y2: "31", stroke: "#3a6080", "stroke-width": "1.5" }),
      h("line", { x1: "15", y1: "9", x2: "15", y2: "31", stroke: "#3a6080", "stroke-width": "1.5" }),
      h("line", { x1: "21", y1: "9", x2: "21", y2: "31", stroke: "#3a6080", "stroke-width": "1.5" }),
      h("line", { x1: "27", y1: "9", x2: "27", y2: "31", stroke: "#3a6080", "stroke-width": "1.5" }),
      h("line", { x1: "33", y1: "9", x2: "33", y2: "31", stroke: "#3a6080", "stroke-width": "1.5" }),
      // label
      h("text", { x: "20", y: "39", "text-anchor": "middle", "font-size": "5", fill: "#4a7a9a", "font-weight": "700", "font-family": "monospace" }, "RAD"),
    ]),
    RadiatorFan:    () => h("g", [
      // fan housing
      h("circle", { cx: "10", cy: "20", r: "8", fill: "#122434", stroke: "#4a8db8", "stroke-width": "1.8" }),
      h("circle", { cx: "10", cy: "20", r: "2", fill: "#7ecbff" }),
      // blades
      h("path", { d: "M10 12 Q13 15 10 18 Q7 15 10 12", fill: "#9fdfff", opacity: "0.9" }),
      h("path", { d: "M18 20 Q15 23 12 20 Q15 17 18 20", fill: "#9fdfff", opacity: "0.9" }),
      h("path", { d: "M10 28 Q7 25 10 22 Q13 25 10 28", fill: "#9fdfff", opacity: "0.9" }),
      // airflow path
      h("path", { d: "M18 16 C24 15 27 17 31 16", fill: "none", stroke: "#ff8b4a", "stroke-width": "1.4", "stroke-dasharray": "2,2" }),
      h("path", { d: "M18 20 C24 20 27 20 31 20", fill: "none", stroke: "#ffb06a", "stroke-width": "1.4", "stroke-dasharray": "2,2" }),
      h("path", { d: "M18 24 C24 25 27 23 31 24", fill: "none", stroke: "#6ddcff", "stroke-width": "1.4", "stroke-dasharray": "2,2" }),
      // radiator slab
      h("rect", { x: "31", y: "12", width: "8", height: "16", rx: "1.5", fill: "#0f2735", stroke: "#5faed8", "stroke-width": "1.3" }),
      h("line", { x1: "33", y1: "13", x2: "33", y2: "27", stroke: "#5faed8", "stroke-width": "0.8" }),
      h("line", { x1: "35", y1: "13", x2: "35", y2: "27", stroke: "#5faed8", "stroke-width": "0.8" }),
      h("line", { x1: "37", y1: "13", x2: "37", y2: "27", stroke: "#5faed8", "stroke-width": "0.8" }),
    ]),
    HeaterPlate:    () => h("g", [
      // radiator plate
      h("rect", { x: "4", y: "19", width: "32", height: "14", rx: "2", fill: "#152638", stroke: "#6f86a0", "stroke-width": "1.6" }),
      h("line", { x1: "10", y1: "20", x2: "10", y2: "32", stroke: "#6f86a0", "stroke-width": "0.9" }),
      h("line", { x1: "16", y1: "20", x2: "16", y2: "32", stroke: "#6f86a0", "stroke-width": "0.9" }),
      h("line", { x1: "22", y1: "20", x2: "22", y2: "32", stroke: "#6f86a0", "stroke-width": "0.9" }),
      h("line", { x1: "28", y1: "20", x2: "28", y2: "32", stroke: "#6f86a0", "stroke-width": "0.9" }),
      // heater module
      h("rect", { x: "12", y: "7", width: "16", height: "8", rx: "2", fill: "#4f2a18", stroke: "#ffb16d", "stroke-width": "1.2" }),
      h("path", { d: "M14 11 Q16 8 18 11 Q20 14 22 11 Q24 8 26 11", fill: "none", stroke: "#ffd29a", "stroke-width": "1.2", "stroke-linecap": "round" }),
      // mounting links
      h("line", { x1: "14", y1: "15", x2: "12", y2: "19", stroke: "#a97348", "stroke-width": "1" }),
      h("line", { x1: "26", y1: "15", x2: "28", y2: "19", stroke: "#a97348", "stroke-width": "1" }),
      // heat waves
      h("path", { d: "M16 6 C15 4 17 3 16 1", fill: "none", stroke: "#ff9a52", "stroke-width": "1" }),
      h("path", { d: "M20 6 C19 4 21 3 20 1", fill: "none", stroke: "#ffbe78", "stroke-width": "1" }),
      h("path", { d: "M24 6 C23 4 25 3 24 1", fill: "none", stroke: "#ffd79b", "stroke-width": "1" }),
    ]),
    Compensator:    () => h("g", [
      // top cap
      h("rect", { x: "12", y: "0", width: "16", height: "5", fill: "#181828", stroke: "#5060a0", "stroke-width": "1.5", rx: "2" }),
      // upper cylinder
      h("rect", { x: "8", y: "4", width: "24", height: "7", fill: "#0e1020", stroke: "#5060a0", "stroke-width": "1.5", rx: "1" }),
      // bellows zigzag
      h("path", { d: "M8 11 L32 14 L8 17 L32 20 L8 23 L32 26", fill: "none", stroke: "#3a4880", "stroke-width": "2", "stroke-linejoin": "round" }),
      // lower cylinder (fluid)
      h("rect", { x: "8", y: "25", width: "24", height: "10", fill: "#0a1018", stroke: "#5060a0", "stroke-width": "1.5", rx: "1" }),
      // fluid level fill
      h("rect", { x: "9", y: "28", width: "22", height: "7", fill: "#2060a0", rx: "1", opacity: "0.7" }),
      // bottom cap
      h("rect", { x: "12", y: "34", width: "16", height: "5", fill: "#181828", stroke: "#5060a0", "stroke-width": "1.5", rx: "2" }),
      // label
      h("text", { x: "20", y: "40", "text-anchor": "middle", "font-size": "4.5", fill: "#5060a0", "font-weight": "700", "font-family": "monospace" }, "COMP"),
    ]),
    LFCU:           () => h("g", [
      // inlet/outlet pipes
      h("rect", { x: "0",  y: "17", width: "8",  height: "6", fill: "#0e1820", stroke: "#304858", "stroke-width": "1", rx: "1" }),
      h("rect", { x: "32", y: "17", width: "8",  height: "6", fill: "#0e1820", stroke: "#304858", "stroke-width": "1", rx: "1" }),
      // body circle
      h("circle", { cx: "20", cy: "20", r: "12", fill: "#0a1018", stroke: "#27ae60", "stroke-width": "2" }),
      // dial arc track
      h("path", { d: "M10.3 29 A11 11 0 1 1 29.7 29", fill: "none", stroke: "#1a2030", "stroke-width": "3.5", "stroke-linecap": "round" }),
      // dial arc fill (60%)
      h("path", { d: "M10.3 29 A11 11 0 0 1 27 12", fill: "none", stroke: "#27ae60", "stroke-width": "3.5", "stroke-linecap": "round" }),
      // needle
      h("line", { x1: "20", y1: "20", x2: "15", y2: "12", stroke: "#27ae60", "stroke-width": "1.8", "stroke-linecap": "round" }),
      // hub
      h("circle", { cx: "20", cy: "20", r: "2.2", fill: "#27ae60" }),
      // label
      h("text", { x: "20", y: "37", "text-anchor": "middle", "font-size": "4.5", fill: "#27ae60", "font-weight": "700", "font-family": "monospace" }, "LFCU"),
    ]),
    // ── ECLSS Controller Board ────────────────────────────────────────────────
    CtrlBoard: () => h("g", [
      // enclosure
      h("rect", { x: "1", y: "2", width: "38", height: "28", rx: "2", fill: "#0d1820", stroke: "#28404e", "stroke-width": "0.8" }),
      // header bar
      h("rect", { x: "1", y: "2", width: "38", height: "7", rx: "2", fill: "#1a3048" }),
      // header label
      h("text", { x: "20", y: "7.5", "text-anchor": "middle", "font-size": "3.5", fill: "#5888b8", "font-weight": "700", "font-family": "monospace" }, "CTRL"),
      // PWR LED (green)
      h("circle", { cx: "33", cy: "5.5", r: "1.8", fill: "#30e060" }),
      // SIG LED (blue)
      h("circle", { cx: "37", cy: "5.5", r: "1.8", fill: "#4a9eff" }),
      // PCB
      h("rect", { x: "3", y: "11", width: "34", height: "16", rx: "1", fill: "#071510", stroke: "#0a2e1a", "stroke-width": "0.5" }),
      // left traces
      h("line", { x1: "3",  y1: "14", x2: "13", y2: "14", stroke: "#10401e", "stroke-width": "0.8" }),
      h("line", { x1: "3",  y1: "17", x2: "13", y2: "17", stroke: "#10401e", "stroke-width": "0.8" }),
      h("line", { x1: "3",  y1: "20", x2: "13", y2: "20", stroke: "#10401e", "stroke-width": "0.8" }),
      h("line", { x1: "3",  y1: "23", x2: "13", y2: "23", stroke: "#10401e", "stroke-width": "0.8" }),
      // right traces
      h("line", { x1: "27", y1: "14", x2: "37", y2: "14", stroke: "#10401e", "stroke-width": "0.8" }),
      h("line", { x1: "27", y1: "17", x2: "37", y2: "17", stroke: "#10401e", "stroke-width": "0.8" }),
      h("line", { x1: "27", y1: "20", x2: "37", y2: "20", stroke: "#10401e", "stroke-width": "0.8" }),
      h("line", { x1: "27", y1: "23", x2: "37", y2: "23", stroke: "#10401e", "stroke-width": "0.8" }),
      // MCU chip body
      h("rect", { x: "13", y: "12.5", width: "14", height: "12", rx: "1.5", fill: "#1c2a3a", stroke: "#4a9eff", "stroke-width": "0.5" }),
      // die area
      h("rect", { x: "14.5", y: "14", width: "11", height: "9", rx: "1", fill: "#0a1218" }),
      // chip label
      h("text", { x: "20", y: "19.5", "text-anchor": "middle", "dominant-baseline": "middle", "font-size": "4", "font-weight": "700", "font-family": "monospace", fill: "#4a9eff" }, "μCU"),
      // chip left pins (3)
      h("rect", { x: "10", y: "14.5", width: "3", height: "1.5", rx: "0.4", fill: "#8898a8" }),
      h("rect", { x: "10", y: "17.5", width: "3", height: "1.5", rx: "0.4", fill: "#8898a8" }),
      h("rect", { x: "10", y: "20.5", width: "3", height: "1.5", rx: "0.4", fill: "#8898a8" }),
      // chip right pins (3)
      h("rect", { x: "27", y: "14.5", width: "3", height: "1.5", rx: "0.4", fill: "#8898a8" }),
      h("rect", { x: "27", y: "17.5", width: "3", height: "1.5", rx: "0.4", fill: "#8898a8" }),
      h("rect", { x: "27", y: "20.5", width: "3", height: "1.5", rx: "0.4", fill: "#8898a8" }),
      // crystal (above chip)
      h("rect", { x: "17.5", y: "11", width: "5", height: "2.5", rx: "0.8", fill: "#3a3020" }),
      // I/O connector
      h("rect", { x: "3", y: "28.5", width: "34", height: "4", rx: "0.8", fill: "#0c1620", stroke: "#1a2c3c", "stroke-width": "0.5" }),
      // connector pins (7)
      h("rect", { x: "4.5",  y: "28.5", width: "3.5", height: "2", rx: "0.3", fill: "#101820" }),
      h("rect", { x: "9.3",  y: "28.5", width: "3.5", height: "2", rx: "0.3", fill: "#101820" }),
      h("rect", { x: "14.1", y: "28.5", width: "3.5", height: "2", rx: "0.3", fill: "#101820" }),
      h("rect", { x: "18.9", y: "28.5", width: "3.5", height: "2", rx: "0.3", fill: "#101820" }),
      h("rect", { x: "23.7", y: "28.5", width: "3.5", height: "2", rx: "0.3", fill: "#101820" }),
      h("rect", { x: "28.5", y: "28.5", width: "3.5", height: "2", rx: "0.3", fill: "#101820" }),
      h("rect", { x: "33.3", y: "28.5", width: "3.5", height: "2", rx: "0.3", fill: "#101820" }),
      // label
      h("text", { x: "20", y: "38", "text-anchor": "middle", "font-size": "4.5", fill: "#5888b8", "font-weight": "700", "font-family": "monospace" }, "CTRL BOARD"),
    ]),
    // ── Robot / Astronaut ─────────────────────────────────────────────────────
    Robot: () => h("g", [
      // chair seat
      h("rect", { x: "4", y: "26", width: "32", height: "3", rx: "1", fill: "#1e2c38" }),
      // chair back
      h("rect", { x: "31", y: "12", width: "4", height: "17", rx: "1", fill: "#1e2c38" }),
      // torso
      h("rect", { x: "13", y: "12", width: "14", height: "14", rx: "3", fill: "#7090a8" }),
      // head
      h("rect", { x: "15", y: "3",  width: "10", height: "9",  rx: "3", fill: "#7090a8" }),
      // eyes
      h("circle", { cx: "18", cy: "7", r: "1.5", fill: "#4a9eff" }),
      h("circle", { cx: "22", cy: "7", r: "1.5", fill: "#4a9eff" }),
      // left arm (hanging)
      h("rect", { x: "8",  y: "13", width: "5",  height: "11", rx: "2", fill: "#6080a0" }),
      // right arm (hanging)
      h("rect", { x: "27", y: "13", width: "5",  height: "11", rx: "2", fill: "#6080a0" }),
      // left leg
      h("rect", { x: "13", y: "27", width: "5",  height: "10", rx: "2", fill: "#6080a0" }),
      // right leg
      h("rect", { x: "22", y: "27", width: "5",  height: "10", rx: "2", fill: "#6080a0" }),
      // label
      h("text", { x: "20", y: "41", "text-anchor": "middle", "font-size": "4.5", fill: "#7090a8", "font-weight": "700", "font-family": "monospace" }, "ROBOT"),
    ]),
  };
  const isReverse = category.endsWith("_reverse");
  const baseCategory = isReverse ? category.slice(0, -8) : category;
  const baseIcon = icons[baseCategory] ?? (() => h("rect", { x: "4", y: "4", width: "32", height: "32", fill: "#333" }));
  if (!isReverse) {
    return { render: baseIcon };
  }
  return {
    render: () => h("g", { transform: "translate(40,0) scale(-1,1)" }, [baseIcon()]),
  };
}
</script>

<style scoped>
.palette {
  width: 195px;
  flex-shrink: 0;
  background: #161b22;
  border-right: 1px solid #30363d;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.palette-titlebar {
  display: flex;
  align-items: center;
  padding: 8px 10px 6px 12px;
  border-bottom: 1px solid #30363d;
  gap: 4px;
}
.palette-title {
  flex: 1;
  font-size: 11px;
  font-weight: 700;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.palette-collapse-btns {
  display: flex;
  gap: 3px;
}
.palette-collapse-btn {
  width: 18px;
  height: 18px;
  padding: 0;
  background: #21262d;
  border: 1px solid #30363d;
  border-radius: 3px;
  color: #8b949e;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.1s, color 0.1s;
}
.palette-collapse-btn:hover {
  background: #30363d;
  color: #e6edf3;
}

.palette-section-header {
  display: flex;
  align-items: center;
  gap: 5px;
  width: 100%;
  padding: 7px 10px 5px;
  background: none;
  border: none;
  border-top: 1px solid #21262d;
  cursor: pointer;
  text-align: left;
  color: #8b949e;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  transition: background 0.1s;
}
.palette-section-header:first-child { border-top: none; }
.palette-section-header:hover { background: rgba(74, 158, 255, 0.07); color: #c9d1d9; }

.palette-section-chevron {
  font-size: 11px;
  line-height: 1;
  transition: transform 0.18s;
  display: inline-block;
  color: #4a9eff;
}
.palette-section-chevron.collapsed { transform: rotate(-90deg); }

.palette-section-name { flex: 1; }

.palette-section-count {
  font-size: 9px;
  font-weight: 600;
  background: #21262d;
  color: #6e7681;
  border-radius: 8px;
  padding: 1px 5px;
  min-width: 16px;
  text-align: center;
}

.palette-search { padding: 6px 8px; }
.palette-search-input {
  width: 100%;
  padding: 4px 8px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 5px;
  color: #c9d1d9;
  font-size: 12px;
  outline: none;
}
.palette-search-input:focus { border-color: #4a9eff; }

.palette-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}
.palette-list::-webkit-scrollbar { width: 4px; }
.palette-list::-webkit-scrollbar-thumb { background: #30363d; border-radius: 2px; }

.palette-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  cursor: grab;
  border-radius: 4px;
  margin: 1px 4px;
  transition: background 0.12s;
}
.palette-item:hover { background: rgba(74, 158, 255, 0.12); }
.palette-item:active { cursor: grabbing; }

.palette-icon {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 5px;
}

.palette-thumb {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  object-fit: contain;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 5px;
}
.palette-item-asset .palette-label { font-size: 10px; }

.palette-thumb-svg-preview {
  overflow: hidden;
  pointer-events: none;
}
.palette-thumb-svg-preview :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}

.palette-label {
  font-size: 11px;
  color: #c9d1d9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
