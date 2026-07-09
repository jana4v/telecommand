<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <!--
      NSGU — Navigation Signal Generator Unit — 220×100 viewBox.
      Used in GPS satellites to generate the navigation message signal.
      Signal flow (left → right):
        Input → Navigation Message Generator (NAV MSG GEN) → PCM output
      Animation:
        PCM output: green scrolling square-wave (GPS preamble: 10001011) when ON.
    -->
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <!-- Metallic chassis rim -->
        <linearGradient :id="`ns-rim-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#c8c8da"/>
          <stop offset="20%"  stop-color="#686878"/>
          <stop offset="48%"  stop-color="#e4e4f2"/>
          <stop offset="74%"  stop-color="#565666"/>
          <stop offset="100%" stop-color="#b8b8ca"/>
        </linearGradient>
        <linearGradient :id="`ns-body-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#0e1828"/>
          <stop offset="100%" stop-color="#060e18"/>
        </linearGradient>
        <linearGradient :id="`ns-sheen-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#fff" stop-opacity="0.07"/>
          <stop offset="40%"  stop-color="#fff" stop-opacity="0.02"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.15"/>
        </linearGradient>
        <!-- Inner panel -->
        <radialGradient :id="`ns-panel-off-${uid}`" cx="50%" cy="45%" r="65%">
          <stop offset="0%"   stop-color="#14182e"/>
          <stop offset="100%" stop-color="#06080e"/>
        </radialGradient>
        <radialGradient :id="`ns-panel-on-${uid}`" cx="40%" cy="38%" r="70%">
          <stop offset="0%"   stop-color="#0a1a30"/>
          <stop offset="60%"  stop-color="#060e20"/>
          <stop offset="100%" stop-color="#020810"/>
        </radialGradient>
        <!-- NAV MSG GEN — OFF -->
        <radialGradient :id="`ns-nav-off-${uid}`" cx="35%" cy="35%" r="65%">
          <stop offset="0%"   stop-color="#1e1808"/>
          <stop offset="100%" stop-color="#0e0e06"/>
        </radialGradient>
        <!-- NAV MSG GEN — ON: amber/gold (GPS navigation data) -->
        <radialGradient :id="`ns-nav-on-${uid}`" cx="35%" cy="35%" r="65%">
          <stop offset="0%"   stop-color="#2a1e00"/>
          <stop offset="100%" stop-color="#180e00"/>
        </radialGradient>
        <!-- RF connectors -->
        <linearGradient :id="`ns-conn-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#5a7a9a"/>
          <stop offset="50%"  stop-color="#2a4a6a"/>
          <stop offset="100%" stop-color="#1a2a3a"/>
        </linearGradient>
        <linearGradient :id="`ns-conn-rim-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#7a9aba"/>
          <stop offset="50%"  stop-color="#4a6a8a"/>
          <stop offset="100%" stop-color="#1e3048"/>
        </linearGradient>
        <!-- Glow filters -->
        <filter :id="`ns-glow-${uid}`" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter :id="`ns-pcm-glow-${uid}`" x="-10%" y="-120%" width="120%" height="340%">
          <feGaussianBlur stdDeviation="1.4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <!-- Clip: inner panel -->
        <clipPath :id="`ns-clip-${uid}`">
          <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"/>
        </clipPath>
        <!-- Clip: PCM output zone -->
        <clipPath :id="`ns-pcm-clip-${uid}`">
          <rect
            :x="pcmStartX"
            :y="sigY - ph * 0.24"
            :width="pcmEndX - pcmStartX"
            :height="ph * 0.48"/>
        </clipPath>
      </defs>

      <!-- ── Chassis ─────────────────────────────────────────────────────── -->
      <rect x="1" y="1" :width="w-2" :height="h-2"
        :rx="cr" :fill="`url(#ns-body-${uid})`"
        :stroke="`url(#ns-rim-${uid})`" :stroke-width="rw"
      />
      <rect :x="rw*0.5" :y="rw*0.5" :width="w-rw" :height="h-rw"
        :rx="cr*0.8" :fill="`url(#ns-sheen-${uid})`" pointer-events="none"
      />

      <!-- ── RF Connectors ───────────────────────────────────────────────── -->
      <rect :x="0" :y="h/2 - connH/2" :width="connW" :height="connH" :rx="connW*0.35"
        :fill="`url(#ns-conn-${uid})`" :stroke="`url(#ns-conn-rim-${uid})`" :stroke-width="w*0.007"
      />
      <circle :cx="connW*0.5" :cy="h/2" :r="connH*0.22" fill="#0d1117" stroke="#8090a0" stroke-width="1.2"/>
      <rect :x="w-connW" :y="h/2 - connH/2" :width="connW" :height="connH" :rx="connW*0.35"
        :fill="`url(#ns-conn-${uid})`" :stroke="`url(#ns-conn-rim-${uid})`" :stroke-width="w*0.007"
      />
      <circle :cx="w-connW*0.5" :cy="h/2" :r="connH*0.22" fill="#0d1117" stroke="#8090a0" stroke-width="1.2"/>

      <!-- ── Inner panel ─────────────────────────────────────────────────── -->
      <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        :fill="isOn ? `url(#ns-panel-on-${uid})` : `url(#ns-panel-off-${uid})`"
        stroke="#06080e" :stroke-width="rw*0.4"
      />
      <!-- Gold accent border when ON -->
      <rect v-if="isOn && !d.isInvalid" :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        fill="none" stroke="#ffd700" :stroke-width="rw*0.35" opacity="0.18"
      />

      <!-- ── Title ──────────────────────────────────────────────────────── -->
      <SvgMultilineText v-if="titleText"
        :text="titleText" :x="titleX" :y="titleY"
        :font-size="titleFontSz" font-weight="700" letter-spacing="1.2"
        font-family="'Courier New', monospace"
        :fill="titleFontColor" :text-anchor="titleAnchor"
        :clip-path="`url(#ns-clip-${uid})`"
      />

      <!-- Signal line: left connector → NAV block -->
      <line
        :x1="connW" :y1="sigY" :x2="navBlockX" :y2="sigY"
        :stroke="isOn ? '#ffa500' : '#2a1e08'"
        stroke-width="1.4" stroke-linecap="round"
        :opacity="isOn ? 0.75 : 0.18"
        :clip-path="`url(#ns-clip-${uid})`"
      />

      <!-- ═══════════════════════════════════════════════════════════════════
           NAV MSG GEN — amber/gold when ON
           ═══════════════════════════════════════════════════════════════ -->

      <!-- NAV block container -->
      <rect
        :x="navBlockX" :y="sigY - ph*0.30"
        :width="navBlockW" :height="ph*0.60"
        :rx="ph*0.06"
        :fill="isOn ? `url(#ns-nav-on-${uid})` : `url(#ns-nav-off-${uid})`"
        :stroke="isOn ? '#ffd700' : '#2a1e08'"
        stroke-width="1.5"
        :filter="isOn && !d.isInvalid ? `url(#ns-glow-${uid})` : ''"
        :clip-path="`url(#ns-clip-${uid})`"
      />

      <!-- Satellite icon inside NAV block -->
      <!-- Body -->
      <rect
        :x="satCx - satBW*0.5" :y="satCy - satBH*0.5"
        :width="satBW" :height="satBH"
        :rx="satBW*0.12"
        :fill="isOn ? '#3a2800' : '#1a1408'"
        :stroke="isOn ? '#ffd700' : '#3a2808'"
        stroke-width="1.0"
        :clip-path="`url(#ns-clip-${uid})`"
      />
      <!-- Solar panel left -->
      <rect
        :x="satCx - satBW*0.5 - satPanW" :y="satCy - satPanH*0.5"
        :width="satPanW" :height="satPanH"
        :rx="satPanW*0.10"
        :fill="isOn ? '#1a3a00' : '#0e1a08'"
        :stroke="isOn ? '#88cc44' : '#2a3818'"
        stroke-width="0.9"
        :clip-path="`url(#ns-clip-${uid})`"
      />
      <!-- Solar panel right -->
      <rect
        :x="satCx + satBW*0.5" :y="satCy - satPanH*0.5"
        :width="satPanW" :height="satPanH"
        :rx="satPanW*0.10"
        :fill="isOn ? '#1a3a00' : '#0e1a08'"
        :stroke="isOn ? '#88cc44' : '#2a3818'"
        stroke-width="0.9"
        :clip-path="`url(#ns-clip-${uid})`"
      />
      <!-- Antenna dish arc above body -->
      <path :d="satDishPath"
        fill="none"
        :stroke="isOn ? '#ffd700' : '#3a2808'"
        stroke-width="0.9" stroke-linecap="round"
        :clip-path="`url(#ns-clip-${uid})`"
      />
      <!-- Antenna mast -->
      <line
        :x1="satCx" :y1="satCy - satBH*0.5"
        :x2="satCx" :y2="satCy - satBH*0.5 - satMastH"
        :stroke="isOn ? '#ffd700' : '#3a2808'"
        stroke-width="0.9" stroke-linecap="round"
        :clip-path="`url(#ns-clip-${uid})`"
      />

      <!-- NAV label below satellite -->
      <text
        :x="navBlockX + navBlockW * 0.50" :y="sigY + ph*0.30 - ph*0.07"
        text-anchor="middle" dominant-baseline="middle"
        :fill="isOn ? '#ffd700' : '#3a2808'"
        :font-size="h*0.080"
        font-family="'Segoe UI', sans-serif" font-weight="700"
        :clip-path="`url(#ns-clip-${uid})`"
      >NAV MSG</text>

      <!-- ── Divider: NAV | PCM output ──────────────────────────────────── -->
      <line :x1="divX" :y1="py + ph*0.06" :x2="divX" :y2="py + ph*0.72"
        stroke="#1a2a3a" stroke-width="1" opacity="0.40"
        :clip-path="`url(#ns-clip-${uid})`"
      />

      <!-- ═══════════════════════════════════════════════════════════════════
           PCM OUTPUT — scrolling square-wave (GPS navigation message bits)
           ═══════════════════════════════════════════════════════════════ -->

      <!-- Static line when OFF -->
      <line v-if="!isOn"
        :x1="navBlockX + navBlockW" :y1="sigY" :x2="w - connW" :y2="sigY"
        stroke="#1e3048" stroke-width="1.4" stroke-linecap="round" opacity="0.22"
        :clip-path="`url(#ns-clip-${uid})`"
      />

      <!-- Animated PCM bits when ON -->
      <template v-if="isOn && pcmPathStr">
        <path
          :d="pcmPathStr"
          fill="none" stroke="#44ff88" stroke-width="1.8"
          stroke-linecap="square" stroke-linejoin="miter"
          :filter="`url(#ns-pcm-glow-${uid})`"
          :clip-path="`url(#ns-pcm-clip-${uid})`"
        />
      </template>

      <!-- ── Temperature (bottom-right) ─────────────────────────────────── -->
      <text :x="px + pw - pw*0.025" :y="py + ph - ph*0.10"
        text-anchor="end" dominant-baseline="middle"
        :fill="tempColor" :font-size="tempFontSize"
        font-weight="700" font-family="'Digital7', 'Courier New', monospace"
        :clip-path="`url(#ns-clip-${uid})`"
      >{{ tempText }}</text>

      <!-- ── Invalid overlay ─────────────────────────────────────────────── -->
      <rect v-if="d.isInvalid" x="1" y="1" :width="w-2" :height="h-2"
        fill="rgba(231,76,60,0.20)" :rx="cr"
        stroke="#e74c3c" :stroke-width="rw*0.55" stroke-dasharray="8,5"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useNodeData } from "./useNodeData";
import SvgMultilineText from "./SvgMultilineText.vue";
import { useTitlePosition } from "./useTitlePosition";

const { d, w, h } = useNodeData(220, 100);
const uid = ref(Math.random().toString(36).slice(2, 8));

const titleText   = computed(() => (d.value.name         as string) ?? "");
const titleFontSz = computed(() => (d.value.titleFontSize as number) ?? 10);
const titleFontColor = computed(() => (d.value.titleFontColor as string) || "#c9d1d9");
const { titleX, titleY, titleAnchor } = useTitlePosition(
  () => d.value.titlePosition as string | undefined,
  () => px.value,
  () => pw.value,
  () => py.value,
  () => ph.value,
  "top-center",
);

// ── Chassis geometry ──────────────────────────────────────────────────────
const rw = computed(() => w.value * 0.036);
const cr = computed(() => w.value * 0.072);

// ── Inner panel ───────────────────────────────────────────────────────────
const px = computed(() => rw.value * 0.55);
const py = computed(() => rw.value * 0.55);
const pw = computed(() => w.value - px.value * 2);
const ph = computed(() => h.value - py.value * 2);
const pr = computed(() => cr.value * 0.65);

// ── RF connector housings ─────────────────────────────────────────────────
const connW = computed(() => rw.value * 1.8);
const connH = computed(() => h.value * 0.28);

// ── Signal axis ───────────────────────────────────────────────────────────
const sigY = computed(() => py.value + ph.value * 0.57);

// ── Section proportions (of pw): NAV MSG GEN 58% | PCM output 42%
const navZoneW = computed(() => pw.value * 0.58);

const divX = computed(() => px.value + navZoneW.value);

// ── NAV MSG GEN block geometry ────────────────────────────────────────────
const navBlockX = computed(() => px.value + navZoneW.value * 0.06);
const navBlockW = computed(() => navZoneW.value * 0.88);

// ── Satellite icon (inside NAV block) ────────────────────────────────────
const satCx    = computed(() => navBlockX.value + navBlockW.value * 0.50);
const satCy    = computed(() => sigY.value - ph.value * 0.08);
const satBW    = computed(() => navBlockW.value * 0.16);
const satBH    = computed(() => ph.value * 0.18);
const satPanW  = computed(() => navBlockW.value * 0.16);
const satPanH  = computed(() => ph.value * 0.10);
const satMastH = computed(() => ph.value * 0.09);

// Small arc dish above body
const satDishPath = computed(() => {
  const cx  = satCx.value;
  const topY = satCy.value - satBH.value * 0.5 - satMastH.value;
  const r   = satBW.value * 0.85;
  return `M ${(cx - r).toFixed(2)},${topY.toFixed(2)} A ${r.toFixed(2)},${(r * 0.45).toFixed(2)} 0 0 1 ${(cx + r).toFixed(2)},${topY.toFixed(2)}`;
});

// ── PCM output zone (NAV block right → right connector) ──────────────────
const pcmStartX = computed(() => navBlockX.value + navBlockW.value);
const pcmEndX   = computed(() => w.value - connW.value);

// ── GPS navigation message bit pattern (preamble: 10001011, then data) ───
const PCM_BITS  = [1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0, 1, 0, 0];
const PCM_SPEED = 2.5;  // bits per second
const N_VISIBLE = 5;    // visible bits in output zone

const pcmPathStr = ref<string>('');

function buildPcmPath(): string {
  const sx     = pcmStartX.value;
  const ex     = pcmEndX.value;
  const availW = ex - sx;
  if (availW <= 4) return '';

  const segW = availW / N_VISIBLE;
  const cy   = sigY.value;
  const amp  = ph.value * 0.11;

  const frac = _phase % 1;
  const base = Math.floor(_phase);

  let path = '';
  let prevLevel = -1;

  for (let i = -1; i <= N_VISIBLE + 1; i++) {
    const idx   = ((base + i) % PCM_BITS.length + PCM_BITS.length) % PCM_BITS.length;
    const level = PCM_BITS[idx];
    const x     = sx + (i + frac) * segW;
    const y     = level === 1 ? cy - amp : cy + amp;

    if (path === '') {
      path = `M ${x.toFixed(2)},${y.toFixed(2)}`;
    } else if (level !== prevLevel) {
      const prevY = prevLevel === 1 ? cy - amp : cy + amp;
      path += ` L ${x.toFixed(2)},${prevY.toFixed(2)} L ${x.toFixed(2)},${y.toFixed(2)}`;
    } else {
      path += ` L ${x.toFixed(2)},${y.toFixed(2)}`;
    }
    prevLevel = level;
  }
  return path;
}

// ── rAF loop ──────────────────────────────────────────────────────────────
let _rafId = 0;
let _lastT = 0;
let _phase = 0;

function tick(t: number) {
  if (_lastT === 0) _lastT = t;
  const dt = Math.min((t - _lastT) / 1000, 0.05);
  _lastT = t;

  if (isOn.value) {
    _phase = (_phase + dt * PCM_SPEED) % PCM_BITS.length;
    pcmPathStr.value = buildPcmPath();
  } else {
    _phase = 0;
    pcmPathStr.value = '';
  }

  _rafId = requestAnimationFrame(tick);
}

onMounted(()   => { _rafId = requestAnimationFrame(tick); });
onUnmounted(() => { if (_rafId) cancelAnimationFrame(_rafId); });

// ── Font sizes ────────────────────────────────────────────────────────────
const tempFontSize = computed(() => h.value * 0.22);

// ── State ─────────────────────────────────────────────────────────────────
const isOn = computed(() => {
  const sc = d.value.statusColor as string;
  return !!sc && sc !== "" && sc !== "gradient:off";
});

// ── Temperature ───────────────────────────────────────────────────────────
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
