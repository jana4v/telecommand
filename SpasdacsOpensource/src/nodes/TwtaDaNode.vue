<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <!-- Metallic chassis rim -->
        <linearGradient :id="`td-rim-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#c8c8da"/>
          <stop offset="20%"  stop-color="#686878"/>
          <stop offset="48%"  stop-color="#e4e4f2"/>
          <stop offset="74%"  stop-color="#565666"/>
          <stop offset="100%" stop-color="#b8b8ca"/>
        </linearGradient>
        <!-- Body background -->
        <linearGradient :id="`td-body-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#0e1828"/>
          <stop offset="100%" stop-color="#060e18"/>
        </linearGradient>
        <!-- Top sheen -->
        <linearGradient :id="`td-sheen-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#fff" stop-opacity="0.07"/>
          <stop offset="40%"  stop-color="#fff" stop-opacity="0.02"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.15"/>
        </linearGradient>
        <!-- Panel states (TWTA-style) -->
        <radialGradient :id="`td-off-${uid}`" cx="50%" cy="45%" r="65%">
          <stop offset="0%"   stop-color="#14182e"/>
          <stop offset="100%" stop-color="#06080e"/>
        </radialGradient>
        <radialGradient :id="`td-on-${uid}`" cx="40%" cy="40%" r="70%">
          <stop offset="0%"   stop-color="#18402a"/>
          <stop offset="60%"  stop-color="#0c2218"/>
          <stop offset="100%" stop-color="#060e0a"/>
        </radialGradient>
        <radialGradient :id="`td-bunched-${uid}`" cx="40%" cy="35%" r="75%">
          <stop offset="0%"   stop-color="#1a7a40"/>
          <stop offset="45%"  stop-color="#0e5228"/>
          <stop offset="100%" stop-color="#05200f"/>
        </radialGradient>
        <!-- Helix tube rim / RF connector gradient -->
        <linearGradient :id="`td-tube-rim-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#7a9aba"/>
          <stop offset="50%"  stop-color="#4a6a8a"/>
          <stop offset="100%" stop-color="#1e3048"/>
        </linearGradient>
        <!-- Active helix glow -->
        <radialGradient :id="`td-glow-${uid}`" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   :stop-color="helixColor" stop-opacity="0.55"/>
          <stop offset="100%" :stop-color="helixColor" stop-opacity="0.00"/>
        </radialGradient>
        <!-- RF connector gradient -->
        <linearGradient :id="`td-conn-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#5a7a9a"/>
          <stop offset="50%"  stop-color="#2a4a6a"/>
          <stop offset="100%" stop-color="#1a2a3a"/>
        </linearGradient>
        <!-- DA triangle — FGM: green -->
        <linearGradient :id="`td-tri-fgm-${uid}`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#14532d" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="#166534" stop-opacity="0.75"/>
        </linearGradient>
        <!-- DA triangle — ALC: orange -->
        <linearGradient :id="`td-tri-alc-${uid}`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#b45309" stop-opacity="0.95"/>
          <stop offset="100%" stop-color="#f97316" stop-opacity="0.80"/>
        </linearGradient>
        <!-- DA triangle — standby: dark grey -->
        <linearGradient :id="`td-tri-stby-${uid}`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#1a2030" stop-opacity="0.90"/>
          <stop offset="100%" stop-color="#243040" stop-opacity="0.65"/>
        </linearGradient>
        <!-- DA triangle glow filter -->
        <filter :id="`td-tri-glow-${uid}`" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <!-- Clip: full inner panel -->
        <clipPath :id="`td-panel-clip-${uid}`">
          <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"/>
        </clipPath>
        <!-- Clip: DA section (left of divider) -->
        <clipPath :id="`td-da-clip-${uid}`">
          <rect :x="px" :y="py" :width="daSecW" :height="ph" :rx="pr"/>
        </clipPath>
        <!-- Clip: TWTA + strip section (right of divider) -->
        <clipPath :id="`td-twta-clip-${uid}`">
          <rect :x="divX" :y="py" :width="twtaSecW + stripW" :height="ph"/>
        </clipPath>
      </defs>

      <!-- ── Chassis ─────────────────────────────────────────────────────── -->
      <rect x="1" y="1" :width="w-2" :height="h-2"
        :rx="cr" :fill="`url(#td-body-${uid})`"
        :stroke="`url(#td-rim-${uid})`" :stroke-width="rw"
      />
      <rect :x="rw*0.5" :y="rw*0.5" :width="w-rw" :height="h-rw"
        :rx="cr*0.8" :fill="`url(#td-sheen-${uid})`" pointer-events="none"
      />

      <!-- ── RF Connectors (left RF IN, right RF OUT) ───────────────────── -->
      <rect :x="0" :y="h/2 - connH/2" :width="connW" :height="connH" :rx="connW*0.35"
        :fill="`url(#td-conn-${uid})`" :stroke="`url(#td-tube-rim-${uid})`" :stroke-width="w*0.009"
      />
      <circle :cx="connW*0.5" :cy="h/2" :r="connH*0.22" fill="#0d1117" stroke="#8090a0" stroke-width="1.2"/>
      <rect :x="w-connW" :y="h/2 - connH/2" :width="connW" :height="connH" :rx="connW*0.35"
        :fill="`url(#td-conn-${uid})`" :stroke="`url(#td-tube-rim-${uid})`" :stroke-width="w*0.009"
      />
      <circle :cx="w-connW*0.5" :cy="h/2" :r="connH*0.22" fill="#0d1117" stroke="#8090a0" stroke-width="1.2"/>

      <!-- ── Inner panel — three overlapping gradients cross-fade via GSAP ─ -->
      <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        :fill="`url(#td-off-${uid})`" stroke="#06080e" :stroke-width="rw*0.5"/>
      <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        :fill="`url(#td-on-${uid})`" :opacity="onPanelOp" pointer-events="none"/>
      <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        :fill="`url(#td-bunched-${uid})`" :opacity="bunchedPanelOp" pointer-events="none"/>
      <!-- Panel glow border (fades in/out — no v-if snap) -->
      <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        fill="none" :stroke="panelGlowColor" :stroke-width="rw*0.5" :opacity="panelGlowOp"
        :style="`filter: drop-shadow(0 0 ${pw*0.04}px ${panelGlowColor})`"
      />

      <!-- ── Section divider ─────────────────────────────────────────────── -->
      <line
        :x1="divX" :y1="py + ph*0.06"
        :x2="divX" :y2="py + ph*0.88"
        stroke="#2e4a6a" stroke-width="1.2" opacity="0.70"
        :clip-path="`url(#td-panel-clip-${uid})`"
      />

      <!-- ════════════════════════════════════════════════════════════════
           LEFT: DA SECTION  (RF IN → Driver Amplifier)
           Signal chain: RF IN ──▷ [DA triangle] ──→ TWTA ──→ RF OUT
           ════════════════════════════════════════════════════════════════ -->

      <!-- DA section name (user-editable) -->
      <text
        :x="px + daSecW * 0.50"
        :y="py + ph*0.13"
        text-anchor="middle" dominant-baseline="middle"
        font-weight="700" fill="#c8d8e8"
        :font-size="titleFontSize"
        font-family="'Segoe UI', sans-serif"
        letter-spacing="0.6"
        :clip-path="`url(#td-da-clip-${uid})`"
      >{{ d.daName || 'DA' }}</text>

      <!-- Signal line: left RF connector → DA triangle input face -->
      <line
        :x1="connW" :y1="h/2"
        :x2="tLeft"  :y2="h/2"
        :stroke="daSignalColor" stroke-width="1.6" stroke-linecap="round"
        :opacity="signalOp"
        :clip-path="`url(#td-da-clip-${uid})`"
      />

      <!-- Amplifier triangle (right-pointing) -->
      <polygon
        :points="trianglePoints"
        :fill="triGradId"
        :stroke="triStrokeColor"
        stroke-width="2"
        stroke-linejoin="round"
        :filter="isOn && !d.isInvalid ? `url(#td-tri-glow-${uid})` : ''"
        :clip-path="`url(#td-da-clip-${uid})`"
      />

      <!-- Mode text inside triangle (FGM / ALC) -->
      <text
        :x="triCx" :y="triCy"
        text-anchor="middle" dominant-baseline="middle"
        fill="white"
        :fill-opacity="modeTextOp"
        :font-size="modeFontSize"
        font-weight="700"
        font-family="'Segoe UI', sans-serif"
        letter-spacing="1.5"
        :clip-path="`url(#td-da-clip-${uid})`"
      >{{ modeText }}</text>

      <!-- ════════════════════════════════════════════════════════════════
           RIGHT: TWTA SECTION  (DA output → Travelling Wave Tube → RF OUT)
           ════════════════════════════════════════════════════════════════ -->

      <!-- TWTA section name (user-editable) -->
      <text
        :x="titleX"
        :y="titleY"
        :text-anchor="titleAnchor" dominant-baseline="middle"
        font-weight="700" :fill="titleFontColor"
        :font-size="twtaTitleFontSize"
        font-family="'Segoe UI', sans-serif"
        letter-spacing="0.6"
        :clip-path="`url(#td-twta-clip-${uid})`"
      >{{ d.twtaName || 'TWTA' }}</text>

      <!-- Signal line: DA apex → TWTA helix input -->
      <line
        :x1="tRight"      :y1="h/2"
        :x2="divX + pw*0.006" :y2="h/2"
        :stroke="daSignalColor" stroke-width="1.6" stroke-linecap="round"
        :opacity="signalOp"
        :clip-path="`url(#td-twta-clip-${uid})`"
      />

      <!-- Active glow behind helix coils (fades in/out via GSAP) -->
      <ellipse
        :cx="hx + hw/2" :cy="hy + hh/2"
        :rx="hw*0.45" :ry="hh*0.40"
        :fill="`url(#td-glow-${uid})`" :opacity="glowEllipseOp"
        :clip-path="`url(#td-twta-clip-${uid})`"
      />

      <!-- Helix back semi-arcs (sweep down, behind) -->
      <path v-for="c in coilCount" :key="`cb${c}`"
        :d="coilBack(c-1)" fill="none" :stroke="coilStroke"
        :stroke-width="w*0.008" stroke-linecap="round"
        :opacity="coilBackOp"
        :clip-path="`url(#td-twta-clip-${uid})`"
      />

      <!-- Electron bunching animation (clipped to TWTA section) -->
      <g v-if="coilGlows" :clip-path="`url(#td-twta-clip-${uid})`">
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

      <!-- Helix front semi-arcs (sweep up, in front) -->
      <path v-for="c in coilCount" :key="`cf${c}`"
        :d="coilFront(c-1)" fill="none" :stroke="coilStroke"
        :stroke-width="w*0.011" stroke-linecap="round"
        :opacity="coilFrontOp"
        :clip-path="`url(#td-twta-clip-${uid})`"
      />

      <!-- ════════════════════════════════════════════════════════════════
           RIGHT STRIP — shared LED
           ════════════════════════════════════════════════════════════════ -->

      <!-- Separator before LED strip -->
      <line
        :x1="divX + twtaSecW + stripW*0.08" :y1="py + ph*0.06"
        :x2="divX + twtaSecW + stripW*0.08" :y2="py + ph*0.62"
        stroke="#1e3048" stroke-width="1" opacity="0.55"
        :clip-path="`url(#td-panel-clip-${uid})`"
      />
      <!-- LED bezel -->
      <circle :cx="ledX" :cy="ledY" :r="ledR*1.30"
        fill="#0d1520" stroke="#4a6070" :stroke-width="w*0.012"/>
      <!-- LED lens -->
      <circle :cx="ledX" :cy="ledY" :r="ledR"
        :fill="ledFill" :stroke="ledFill" :stroke-width="w*0.010"
      />
      <!-- LED specular hotspot (when ON) -->
      <circle v-if="isOn && !d.isInvalid"
        :cx="ledX - ledR*0.28" :cy="ledY - ledR*0.28" :r="ledR*0.38"
        fill="white" opacity="0.55"
      />

      <!-- ════════════════════════════════════════════════════════════════
           BOTTOM ROW — BOA (left) + Temperature (right, shared)
           ════════════════════════════════════════════════════════════════ -->
      <text
        :x="px + pw*0.03"
        :y="py + ph - ph*0.10"
        text-anchor="start" dominant-baseline="middle"
        :fill="boaColor"
        :font-size="valueFontSize"
        font-weight="700"
        font-family="'Digital7', 'Courier New', monospace"
        :clip-path="`url(#td-panel-clip-${uid})`"
      >{{ boaText }}</text>
      <text
        :x="px + pw - pw*0.03"
        :y="py + ph - ph*0.10"
        text-anchor="end" dominant-baseline="middle"
        :fill="tempColor"
        :font-size="valueFontSize"
        font-weight="700"
        font-family="'Digital7', 'Courier New', monospace"
        :clip-path="`url(#td-panel-clip-${uid})`"
      >{{ tempText }}</text>

      <!-- ── Invalid overlay ─────────────────────────────────────────────── -->
      <rect v-if="d.isInvalid"
        x="1" y="1" :width="w-2" :height="h-2"
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

const { d, w, h } = useNodeData(280, 130);
const uid = ref(Math.random().toString(36).slice(2, 8));

// ── Chassis geometry ──────────────────────────────────────────────────────
const rw = computed(() => w.value * 0.036);
const cr = computed(() => w.value * 0.072);

// ── Inner panel ───────────────────────────────────────────────────────────
const px = computed(() => rw.value * 0.55);
const py = computed(() => rw.value * 0.55);
const pw = computed(() => w.value - px.value * 2);
const ph = computed(() => h.value - py.value * 2);
const pr = computed(() => cr.value * 0.65);

// ── Section layout ────────────────────────────────────────────────────────
// Signal flows LEFT → RIGHT:  RF IN → [DA triangle] → [TWTA helix] → RF OUT
// daSecW:   left 30%  — DA driver amplifier triangle
// twtaSecW: next 52%  — TWTA helix tube
// stripW:   last 18%  — LED status indicator
const daSecW   = computed(() => pw.value * 0.30);
const twtaSecW = computed(() => pw.value * 0.52);
const stripW   = computed(() => pw.value - daSecW.value - twtaSecW.value);
const divX     = computed(() => px.value + daSecW.value);  // divider between DA and TWTA

// ── RF connector housings ─────────────────────────────────────────────────
const connW = computed(() => rw.value * 1.8);
const connH = computed(() => h.value  * 0.28);

// ── DA Triangle geometry (left section) ──────────────────────────────────
const tLeft  = computed(() => px.value  + daSecW.value * 0.06);
const tRight = computed(() => px.value  + daSecW.value * 0.94);
const triH   = computed(() => ph.value * 0.60);
const tTopY  = computed(() => h.value / 2 - triH.value / 2);
const tBotY  = computed(() => h.value / 2 + triH.value / 2);

const trianglePoints = computed(() =>
  `${tLeft.value.toFixed(1)},${tTopY.value.toFixed(1)} ` +
  `${tLeft.value.toFixed(1)},${tBotY.value.toFixed(1)} ` +
  `${tRight.value.toFixed(1)},${(h.value / 2).toFixed(1)}`
);
// Centroid of right-pointing triangle
const triCx = computed(() => (tLeft.value * 2 + tRight.value) / 3);
const triCy = computed(() => h.value / 2);

// ── Helix tube geometry (TWTA section, right of divider) ─────────────────
const hw = computed(() => twtaSecW.value * 0.90);
const hh = computed(() => ph.value * 0.37);
const hx = computed(() => divX.value + twtaSecW.value * 0.05);
const hy = computed(() => py.value + ph.value * 0.37);

// ── Helix coil geometry ───────────────────────────────────────────────────
const coilCount   = 8;
const coilSpacing = computed(() => hw.value / coilCount);
const coilHalf    = computed(() => coilSpacing.value * 0.50);
const coilRy      = computed(() => hh.value * 0.44);

function coilBack(i: number): string {
  const x1 = (hx.value + coilSpacing.value * i).toFixed(1);
  const x2 = (hx.value + coilSpacing.value * (i + 1)).toFixed(1);
  const yC = (hy.value + hh.value * 0.5).toFixed(1);
  return `M ${x1} ${yC} A ${coilHalf.value.toFixed(1)} ${coilRy.value.toFixed(1)} 0 0 0 ${x2} ${yC}`;
}
function coilFront(i: number): string {
  const x1 = (hx.value + coilSpacing.value * i).toFixed(1);
  const x2 = (hx.value + coilSpacing.value * (i + 1)).toFixed(1);
  const yC = (hy.value + hh.value * 0.5).toFixed(1);
  return `M ${x1} ${yC} A ${coilHalf.value.toFixed(1)} ${coilRy.value.toFixed(1)} 0 0 1 ${x2} ${yC}`;
}

// ── Electron bunching animation ───────────────────────────────────────────
const electronPath = computed(() => {
  const yC = (hy.value + hh.value * 0.5).toFixed(1);
  return `M ${hx.value.toFixed(1)} ${yC} L ${(hx.value + hw.value).toFixed(1)} ${yC}`;
});

const electronBunches = computed(() => {
  const BUNCHES   = 3;
  const PER_BUNCH = 3;
  const DUR       = 1.6;
  const BUNCH_GAP = DUR / BUNCHES;
  const DOT_GAP   = 0.08;
  const BASE_R    = w.value * 0.008;
  const items: { id: string; begin: number; dur: number; r: number; opacity: number }[] = [];
  for (let b = 0; b < BUNCHES; b++) {
    for (let e = 0; e < PER_BUNCH; e++) {
      items.push({
        id:      `${b}-${e}`,
        begin:   b * BUNCH_GAP + e * DOT_GAP,
        dur:     DUR,
        r:       BASE_R * (1 + e * 0.18),
        opacity: 0.55 + e * 0.20,
      });
    }
  }
  return items;
});

// ── Shared status LED (far-right strip) ──────────────────────────────────
const ledR = computed(() => w.value * 0.038);
const ledX = computed(() => divX.value + twtaSecW.value + stripW.value * 0.55);
const ledY = computed(() => py.value + ph.value * 0.32);

// ── Font sizes ────────────────────────────────────────────────────────────
const titleFontSize     = computed(() => h.value * 0.112);   // DA section title
const twtaTitleFontSize = computed(() => (d.value.titleFontSize as number | undefined) ?? h.value * 0.220);   // TWTA section title (wider section)
const titleFontColor = computed(() => (d.value.titleFontColor as string) || "#c8d8e8");
const { titleX, titleY, titleAnchor } = useTitlePosition(
  () => d.value.titlePosition as string | undefined,
  () => px.value,
  () => pw.value,
  () => py.value,
  () => ph.value,
  "top-center",
);
const modeFontSize      = computed(() => h.value * 0.105);
const valueFontSize    = computed(() => h.value * 0.230);

// ── TWTA state (statusColor encodes three states) ─────────────────────────
// "#6aaa6a"      = ON + anode > 2V  (warming)
// "#27ae60"      = ON + anode ≤ 2V  (fully bunched)
// "gradient:off" / "" = OFF
const SC_WARMING = "#6aaa6a";
const SC_BUNCHED = "#27ae60";

const isOn = computed(() => {
  const sc = d.value.statusColor as string;
  return sc === "gradient:on" || sc === SC_BUNCHED || sc === SC_WARMING
    || (!!sc && sc !== "" && sc !== "gradient:off");
});

const isBunched = computed(() => {
  const sc = d.value.statusColor as string;
  return sc === SC_BUNCHED || sc === "gradient:on";
});

const coilGlows = computed(() => isBunched.value && !d.value.isInvalid);

const helixColor = computed(() => {
  if (d.value.isInvalid) return "#e74c3c";
  const sc = d.value.statusColor as string;
  if (!sc || sc === "gradient:off") return "#2a9d8f";
  return "#2ecc71";
});

const coilStroke = computed(() => {
  if (d.value.isInvalid) return "#e74c3c";
  return coilGlows.value ? "#00d4ff" : "#2a4060";
});

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
const signalOp       = useGsapTween(() => isOn.value ? 0.85 : 0.25, 0.45);
const modeTextOp     = useGsapTween(() => isOn.value ? 0.95 : 0.40, 0.45);

// ── DA Mode (statusText: "FGM" | "ALC") ──────────────────────────────────
const modeText = computed((): "FGM" | "ALC" => {
  const t = d.value.statusText as string | undefined;
  return t === "ALC" ? "ALC" : "FGM";
});
const isALC = computed(() => modeText.value === "ALC");

// ── DA colors ─────────────────────────────────────────────────────────────
const daSignalColor = computed(() => {
  if (d.value.isInvalid) return "#e74c3c";
  if (!isOn.value)       return "#2a3a4a";
  return isALC.value ? "#f97316" : "#22c55e";
});

const triGradId = computed(() => {
  if (!isOn.value) return `url(#td-tri-stby-${uid.value})`;
  return isALC.value
    ? `url(#td-tri-alc-${uid.value})`
    : `url(#td-tri-fgm-${uid.value})`;
});

const triStrokeColor = computed(() => daSignalColor.value);

// ── Shared LED ────────────────────────────────────────────────────────────
const ledFill = computed(() => {
  if (d.value.isInvalid) return "#e74c3c";
  return isOn.value ? "#27ae60" : "#101e2a";
});

// ── BOA value (d.gaugeValue → X.XX dB, bottom-left) ──────────────────────
const boaText = computed(() => {
  const v = d.value.gaugeValue as number | undefined;
  if (v === null || v === undefined || typeof v !== "number") return "x.xx dB";
  return v.toFixed(2) + " dB";
});
const boaColor = computed(() => {
  const v = d.value.gaugeValue as number | undefined;
  if (!isOn.value) return "#4a5568";
  if (typeof v !== "number") return "#ffd740";
  return Math.abs(v) >= 3.0 ? "#fbbf24" : "#ffd740";
});

// ── Temperature (shared, d.temperature → XX.X°C, bottom-right) ───────────
const tempText = computed(() => {
  const t = d.value.temperature as number | undefined;
  if (t === null || t === undefined || typeof t !== "number") return "xx.x°C";
  return t.toFixed(1) + "°C";
});
const tempColor = computed(() => {
  const t = d.value.temperature as number | undefined;
  if (!t) return "#ffd740";
  return t > 80 ? "#e74c3c" : t > 60 ? "#ff9800" : "#ffd740";
});
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
svg * { transition: none !important; animation: none !important; }
</style>
