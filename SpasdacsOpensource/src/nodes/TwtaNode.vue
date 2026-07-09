<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <!-- Metallic chassis rim -->
        <linearGradient :id="`tw-rim-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#c8c8da"/>
          <stop offset="20%"  stop-color="#686878"/>
          <stop offset="48%"  stop-color="#e4e4f2"/>
          <stop offset="74%"  stop-color="#565666"/>
          <stop offset="100%" stop-color="#b8b8ca"/>
        </linearGradient>
        <!-- Body background -->
        <linearGradient :id="`tw-body-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#0e1828"/>
          <stop offset="100%" stop-color="#060e18"/>
        </linearGradient>
        <!-- Top sheen -->
        <linearGradient :id="`tw-sheen-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#fff" stop-opacity="0.07"/>
          <stop offset="40%"  stop-color="#fff" stop-opacity="0.02"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.15"/>
        </linearGradient>
        <!-- Inner panel off -->
        <radialGradient :id="`tw-off-${uid}`" cx="50%" cy="45%" r="65%">
          <stop offset="0%"   stop-color="#14182e"/>
          <stop offset="100%" stop-color="#06080e"/>
        </radialGradient>
        <!-- Inner panel on (warming — dim green) -->
        <radialGradient :id="`tw-on-${uid}`" cx="40%" cy="40%" r="70%">
          <stop offset="0%"   stop-color="#18402a"/>
          <stop offset="60%"  stop-color="#0c2218"/>
          <stop offset="100%" stop-color="#060e0a"/>
        </radialGradient>
        <!-- Inner panel fully on / bunched — vivid green -->
        <radialGradient :id="`tw-bunched-${uid}`" cx="40%" cy="35%" r="75%">
          <stop offset="0%"   stop-color="#1a7a40"/>
          <stop offset="45%"  stop-color="#0e5228"/>
          <stop offset="100%" stop-color="#05200f"/>
        </radialGradient>
        <!-- Helix tube body -->
        <linearGradient :id="`tw-tube-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#283848"/>
          <stop offset="35%"  stop-color="#182838"/>
          <stop offset="70%"  stop-color="#0e1c2c"/>
          <stop offset="100%" stop-color="#08101a"/>
        </linearGradient>
        <!-- Helix tube rim -->
        <linearGradient :id="`tw-tube-rim-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#7a9aba"/>
          <stop offset="50%"  stop-color="#4a6a8a"/>
          <stop offset="100%" stop-color="#1e3048"/>
        </linearGradient>
        <!-- Active helix glow -->
        <radialGradient :id="`tw-glow-${uid}`" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   :stop-color="helixColor" stop-opacity="0.55"/>
          <stop offset="100%" :stop-color="helixColor" stop-opacity="0.00"/>
        </radialGradient>
        <!-- RF connector gradient -->
        <linearGradient :id="`tw-conn-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#5a7a9a"/>
          <stop offset="50%"  stop-color="#2a4a6a"/>
          <stop offset="100%" stop-color="#1a2a3a"/>
        </linearGradient>
        <!-- Clip: inner panel -->
        <clipPath :id="`tw-panel-clip-${uid}`">
          <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"/>
        </clipPath>
        <!-- Clip: helix tube interior -->
        <clipPath :id="`tw-tube-clip-${uid}`">
          <rect :x="tx" :y="ty" :width="tw_" :height="th" :rx="th/2"/>
        </clipPath>
      </defs>

      <!-- ── Chassis ──────────────────────────────────────────────────── -->
      <rect x="1" y="1" :width="w-2" :height="h-2"
        :rx="cr" :fill="`url(#tw-body-${uid})`"
        :stroke="`url(#tw-rim-${uid})`" :stroke-width="rw"
      />
      <!-- Chassis sheen overlay -->
      <rect :x="rw*0.5" :y="rw*0.5" :width="w-rw" :height="h-rw"
        :rx="cr*0.8" :fill="`url(#tw-sheen-${uid})`" pointer-events="none"
      />

      <!-- ── RF connector housings (decorative, at left/right edge) ──── -->
      <!-- Left (RF IN) -->
      <rect :x="0" :y="h/2 - connH/2" :width="connW" :height="connH" :rx="connW*0.35"
        :fill="`url(#tw-conn-${uid})`" :stroke="`url(#tw-tube-rim-${uid})`" :stroke-width="w*0.009"
      />
      <circle :cx="connW*0.5" :cy="h/2" :r="connH*0.22" fill="#0d1117" stroke="#8090a0" stroke-width="1.2"/>
      <!-- Right (RF OUT) -->
      <rect :x="w-connW" :y="h/2 - connH/2" :width="connW" :height="connH" :rx="connW*0.35"
        :fill="`url(#tw-conn-${uid})`" :stroke="`url(#tw-tube-rim-${uid})`" :stroke-width="w*0.009"
      />
      <circle :cx="w-connW*0.5" :cy="h/2" :r="connH*0.22" fill="#0d1117" stroke="#8090a0" stroke-width="1.2"/>

      <!-- ── Inner panel — three overlapping gradients cross-fade via GSAP ─ -->
      <!-- Base: always OFF gradient -->
      <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        :fill="`url(#tw-off-${uid})`" stroke="#06080e" :stroke-width="rw*0.5"/>
      <!-- Warming overlay (fades in when ON, fades out when bunched) -->
      <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        :fill="`url(#tw-on-${uid})`" :opacity="onPanelOp" pointer-events="none"/>
      <!-- Bunched overlay (fades in when fully bunched) -->
      <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        :fill="`url(#tw-bunched-${uid})`" :opacity="bunchedPanelOp" pointer-events="none"/>
      <!-- Panel glow edge (fades in/out — no v-if snap) -->
      <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        fill="none" :stroke="panelGlowColor" :stroke-width="rw*0.5" :opacity="panelGlowOp"
        :style="`filter: drop-shadow(0 0 ${pw*0.04}px ${panelGlowColor})`"
      />

      <!-- ── Heat-sink fins (right strip inside panel) ──────────────── 
      <line v-for="i in 5" :key="`fin${i}`" :x1="px + pw - finW + pw * 0.025" :y1="py + ph * (i / 6)" :x2="px + pw - pw * 0.025"
        :y2="py + ph * (i / 6)" stroke="#1e3048" :stroke-width="ph * 0.030" stroke-linecap="round" opacity="0.9"
        :clip-path="`url(#tw-panel-clip-${uid})`" /> -->
      <!-- Fin area separator line 
      <line
        :x1="px + pw - finW" :y1="py + ph*0.08"
        :x2="px + pw - finW" :y2="py + ph*0.92"
        stroke="#1e3048" stroke-width="1" opacity="0.5"
        :clip-path="`url(#tw-panel-clip-${uid})`"
      /> -->

      <!-- ── Helix tube ───────────────────────────────────────────────── -->


      <!-- Active glow behind coils (fades in/out via GSAP) -->
      <ellipse
        :cx="tx + tw_/2" :cy="ty + th/2"
        :rx="tw_*0.45" :ry="th*0.40"
        :fill="`url(#tw-glow-${uid})`" :opacity="glowEllipseOp"
      />

      <!-- ── Helix coils — back semi-arcs (sweep down, behind) ─────────── -->
      <path v-for="c in coilCount" :key="`cb${c}`"
        :d="coilBack(c-1)" fill="none" :stroke="coilStroke"
        :stroke-width="w*0.010" stroke-linecap="round"
        :opacity="coilBackOp"
      />
      <!-- ── Electron bunching animation (between back and front arcs) ──── -->
      <!-- Particles are clipped to the panel so they vanish at the edges.   -->
      <!-- 3 bunches × 3 dots each, tight timing within a bunch creates the  -->
      <!-- visual of grouped electron clusters streaming through the helix.   -->
      <g v-if="coilGlows" :clip-path="`url(#tw-panel-clip-${uid})`">
        <circle v-for="e in electronBunches" :key="e.id" :r="e.r"
          fill="#00d4ff" :opacity="e.opacity"
        >
          <animateMotion
            :path="electronPath"
            :dur="`${e.dur}s`"
            :begin="`${e.begin}s`"
            repeatCount="indefinite"
          />
        </circle>
      </g>

      <!-- ── Helix coils — front semi-arcs (sweep up, in front) ──────────── -->
      <path v-for="c in coilCount" :key="`cf${c}`"
        :d="coilFront(c-1)" fill="none" :stroke="coilStroke"
        :stroke-width="w*0.013" stroke-linecap="round"
        :opacity="coilFrontOp"
      />


      <!-- ── Status LED (in fin strip, no blur) ──────────────────────── -->
      <!-- Outer bezel (metallic ring) -->
      <circle :cx="ledX" :cy="ledY" :r="ledR * 1.30"
        fill="#0d1520" stroke="#4a6070" :stroke-width="w*0.014"
      />
      <!-- LED lens fill -->
      <circle :cx="ledX" :cy="ledY" :r="ledR"
        :fill="isOn ? (d.isInvalid ? '#e74c3c' : '#27ae60') : '#101e2a'"
        :stroke="isOn ? (d.isInvalid ? '#e74c3c' : '#27ae60') : '#2a3a48'"
        :stroke-width="w*0.010"
      />
      <!-- Specular hotspot (only when on) -->
      <circle v-if="isOn && !d.isInvalid"
        :cx="ledX - ledR*0.28" :cy="ledY - ledR*0.28" :r="ledR*0.38"
        fill="white" opacity="0.55"
      />



      <!-- ── TWTA name tile (top-centre of inner panel) ───────────────── -->
      <text
        :x="titleX"
        :y="titleY"
        :text-anchor="titleAnchor" dominant-baseline="middle"
        font-weight="700" :fill="titleFontColor"
        :font-size="titleFontSize"
        font-family="'Segoe UI', sans-serif"
        letter-spacing="0.6"
      >{{ (d.twtaName as string) || 'TWTA' }}</text>

      <!-- ── Temperature (bottom-right of inner panel) ─────────────────── -->
      <text
        :x="px + pw - pw*0.04"
        :y="py + ph - ph*0.08"
        text-anchor="end"
        :fill="tempColor"
        :font-size="tempFontSize"
        font-family="'Digital7', 'Courier New', monospace"
        font-weight="700"
      >{{ tempText }}</text>

      <!-- ── Invalid overlay ──────────────────────────────────────────── -->
      <rect v-if="d.isInvalid" x="1" y="1" :width="w-2" :height="h-2"
        fill="rgba(231,76,60,0.20)" :rx="cr"
        stroke="#e74c3c" :stroke-width="rw*0.55" stroke-dasharray="8,5"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useNodeData }  from "./useNodeData";
import { useGsapTween } from "./useGsapTween";
import { useTitlePosition } from "./useTitlePosition";

const { d, w, h } = useNodeData(170, 115);
const uid = ref(Math.random().toString(36).slice(2, 8));

// ── Chassis geometry ───────────────────────────────────────────────────────
const rw  = computed(() => w.value * 0.036);          // rim stroke width
const cr  = computed(() => w.value * 0.072);          // chassis corner radius

// ── Inner panel ────────────────────────────────────────────────────────────
const px  = computed(() => rw.value * 1.55);
const py  = computed(() => rw.value * 1.55);
const pw  = computed(() => w.value - px.value * 2);
const ph  = computed(() => h.value - py.value * 2);
const pr  = computed(() => cr.value * 0.65);

// ── Heat-sink fin area (right strip) ──────────────────────────────────────
const finW = computed(() => pw.value * 0.22);

// ── RF connector housings ──────────────────────────────────────────────────
const connW = computed(() => rw.value * 1.8);
const connH = computed(() => h.value * 0.30);

// ── Helix tube — full inner-panel width (no gun/collector ends) ────────────
const tw_   = computed(() => pw.value - rw.value);          // full panel width
const th    = computed(() => ph.value * 0.40);
const tx    = computed(() => px.value + rw.value * 0.5);    // flush left
const ty    = computed(() => py.value + ph.value * 0.30);

// ── Helix coil geometry ────────────────────────────────────────────────────
// Each loop occupies exactly one coilSpacing pitch.
// Front arc (sweep=1 → goes UP, in front) drawn on top of back arc (sweep=0 → down, behind).
// Adjacent loops share endpoints on the tube centre-line → proper spring/helix look.
const coilCount   = 10;
const coilSpacing = computed(() => tw_.value / coilCount);          // exact pitch
const coilHalf    = computed(() => coilSpacing.value * 0.50);        // half-chord = half pitch
const coilRy      = computed(() => th.value * 0.44);                 // loop height (88% of tube)

// Back semi-arc for loop i  (sweeps down → behind)
function coilBack(i: number): string {
  const x1 = (tx.value + coilSpacing.value * i).toFixed(1);
  const x2 = (tx.value + coilSpacing.value * (i + 1)).toFixed(1);
  const yC = (ty.value + th.value * 0.5).toFixed(1);
  return `M ${x1} ${yC} A ${coilHalf.value.toFixed(1)} ${coilRy.value.toFixed(1)} 0 0 0 ${x2} ${yC}`;
}
// Front semi-arc for loop i  (sweeps up → in front)
function coilFront(i: number): string {
  const x1 = (tx.value + coilSpacing.value * i).toFixed(1);
  const x2 = (tx.value + coilSpacing.value * (i + 1)).toFixed(1);
  const yC = (ty.value + th.value * 0.5).toFixed(1);
  return `M ${x1} ${yC} A ${coilHalf.value.toFixed(1)} ${coilRy.value.toFixed(1)} 0 0 1 ${x2} ${yC}`;
}


// ── Electron bunching animation ────────────────────────────────────────────
// 3 bunches × 3 dots.  Dots within a bunch are 0.08 s apart (tight cluster).
// Bunches are evenly spread over the total duration (1.6 s).
const electronPath = computed(() => {
  const yC = (ty.value + th.value * 0.5).toFixed(1);
  return `M ${tx.value.toFixed(1)} ${yC} L ${(tx.value + tw_.value).toFixed(1)} ${yC}`;
});

const electronBunches = computed(() => {
  const BUNCHES   = 3;
  const PER_BUNCH = 3;
  const DUR       = 1.6;
  const BUNCH_GAP = DUR / BUNCHES;   // 0.533 s between bunch starts
  const DOT_GAP   = 0.08;            // tight spacing within a bunch
  const BASE_R    = w.value * 0.009;
  const items: { id: string; begin: number; dur: number; r: number; opacity: number }[] = [];
  for (let b = 0; b < BUNCHES; b++) {
    for (let d = 0; d < PER_BUNCH; d++) {
      items.push({
        id:      `${b}-${d}`,
        begin:   b * BUNCH_GAP + d * DOT_GAP,
        dur:     DUR,
        r:       BASE_R * (1 + d * 0.18),        // lead dot slightly larger
        opacity: 0.55 + d * 0.20,                // brighten toward front of bunch
      });
    }
  }
  return items;
});

// ── Status LED — sits in centre of the right fin strip ─────────────────────
const ledR = computed(() => w.value * 0.060);
const ledX = computed(() => px.value + pw.value - finW.value * 0.50);  // fin centre
const ledY = computed(() => py.value + ph.value * 0.15);

// ── Temperature badge ──────────────────────────────────────────────────────
const tbW = computed(() => finW.value * 0.86);
const tbH = computed(() => ph.value * 0.24);

// ── Font sizes ─────────────────────────────────────────────────────────────
const titleFontSize = computed(() => (d.value.titleFontSize as number | undefined) ?? h.value * 0.165);
const titleFontColor = computed(() => (d.value.titleFontColor as string) || "#c8d8e8");
const { titleX, titleY, titleAnchor } = useTitlePosition(
  () => d.value.titlePosition as string | undefined,
  () => px.value,
  () => pw.value,
  () => py.value,
  () => ph.value,
  "top-center",
);
const tempFontSize  = computed(() => (d.value.tempFontSize  as number | undefined) ?? h.value * 0.160);
const labelSize     = computed(() => h.value * 0.085);

// ── State ──────────────────────────────────────────────────────────────────
// statusColor encodes three TWTA states (set by guidedParams body builder):
//   "#6aaa6a"      = ON + anode > 2V  (warming — LED green, coil dim)
//   "#27ae60"      = ON + anode ≤ 2V  (bunched — LED green, coil glows)
//   "gradient:on"  = ON (manual/inspector — treated as fully bunched)
//   "gradient:off" / "" = OFF
const SC_WARMING = "#6aaa6a";
const SC_BUNCHED = "#27ae60";

const isOn = computed(() => {
  const sc = d.value.statusColor as string;
  return sc === "gradient:on" || sc === SC_BUNCHED || sc === SC_WARMING
    || (!!sc && sc !== "" && sc !== "gradient:off");
});

// Fully bunched when statusColor says so, or when manually set to gradient:on
const isBunched = computed(() => {
  const sc = d.value.statusColor as string;
  return sc === SC_BUNCHED || sc === "gradient:on";
});

const coilGlows = computed(() => isBunched.value && !d.value.isInvalid);

const helixColor = computed(() => {
  if (d.value.isInvalid) return "#e74c3c";
  const sc = d.value.statusColor as string;
  if (!sc || sc === "gradient:off") return "#2a9d8f";
  // both warming (#6aaa6a) and bunched (#27ae60) → bright coil colour
  return "#2ecc71";
});

// Coil stroke — cyan when bunched (distinct from green LED), dim when warming/off
const coilStroke = computed(() => {
  if (d.value.isInvalid) return "#e74c3c";
  return coilGlows.value ? "#00d4ff" : "#2a4060";
});

// Panel glow: bunched → helixColor, invalid → red
const panelGlowing = computed(() =>
  coilGlows.value || !!d.value.isInvalid
);
const panelGlowColor = computed(() => {
  if (d.value.isInvalid) return "#e74c3c";
  return helixColor.value;
});

// ── GSAP smooth state transitions (declared after all deps are initialised) ─
const onPanelOp      = useGsapTween(() => (isOn.value && !coilGlows.value) ? 1.0 : 0.0, 0.55);
const bunchedPanelOp = useGsapTween(() => coilGlows.value ? 1.0 : 0.0, 0.55);
const coilBackOp     = useGsapTween(() => coilGlows.value ? 0.42 : 0.22, 0.55);
const coilFrontOp    = useGsapTween(() => coilGlows.value ? 0.95 : 0.48, 0.55);
const glowEllipseOp  = useGsapTween(() => coilGlows.value ? 1.0 : 0.0, 0.55);
const panelGlowOp    = useGsapTween(() => panelGlowing.value ? 0.35 : 0.0, 0.55);

// LED colour — green when ON, no orange when OFF (just goes dark)
const ledColor = computed(() => {
  if (d.value.isInvalid) return "#e74c3c";
  if (!isOn.value)        return "";          // OFF = dark, no colour
  return "#27ae60";                           // on = green
});

const tempColor = computed(() => {
  const t = d.value.temperature as number | undefined;
  if (!t) return "#ffd740";
  return t > 80 ? "#e74c3c" : t > 60 ? "#ff9800" : "#ffd740";
});

// ── Temperature text ───────────────────────────────────────────────────────
const tempText = computed(() => {
  const t = d.value.temperature;
  if (t === null || t === undefined || typeof t !== "number") return "xx.x°C";
  return t.toFixed(1) + "°C";
});
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
svg * { transition: none !important; animation: none !important; }
</style>
