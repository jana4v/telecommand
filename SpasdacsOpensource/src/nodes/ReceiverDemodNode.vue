<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <!-- Metallic chassis rim -->
        <linearGradient :id="`rd-rim-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#c8c8da"/>
          <stop offset="20%"  stop-color="#686878"/>
          <stop offset="48%"  stop-color="#e4e4f2"/>
          <stop offset="74%"  stop-color="#565666"/>
          <stop offset="100%" stop-color="#b8b8ca"/>
        </linearGradient>
        <linearGradient :id="`rd-body-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#0e1828"/>
          <stop offset="100%" stop-color="#060e18"/>
        </linearGradient>
        <linearGradient :id="`rd-sheen-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#fff" stop-opacity="0.07"/>
          <stop offset="40%"  stop-color="#fff" stop-opacity="0.02"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.15"/>
        </linearGradient>
        <!-- Inner panel -->
        <radialGradient :id="`rd-panel-off-${uid}`" cx="50%" cy="45%" r="65%">
          <stop offset="0%"   stop-color="#14182e"/>
          <stop offset="100%" stop-color="#06080e"/>
        </radialGradient>
        <radialGradient :id="`rd-panel-on-${uid}`" cx="38%" cy="38%" r="70%">
          <stop offset="0%"   stop-color="#0e1a3a"/>
          <stop offset="60%"  stop-color="#060e22"/>
          <stop offset="100%" stop-color="#020810"/>
        </radialGradient>
        <!-- LNA Triangle — OFF -->
        <linearGradient :id="`rd-tri-off-${uid}`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#1a2030" stop-opacity="0.90"/>
          <stop offset="100%" stop-color="#243040" stop-opacity="0.65"/>
        </linearGradient>
        <!-- LNA Triangle — ON: electric blue -->
        <linearGradient :id="`rd-tri-on-${uid}`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#0d1e5a" stop-opacity="0.96"/>
          <stop offset="55%"  stop-color="#1a4ecc" stop-opacity="0.92"/>
          <stop offset="100%" stop-color="#2578ff" stop-opacity="0.88"/>
        </linearGradient>
        <!-- Mixer — OFF -->
        <radialGradient :id="`rd-mixer-off-${uid}`" cx="35%" cy="35%" r="65%">
          <stop offset="0%"   stop-color="#18222e"/>
          <stop offset="100%" stop-color="#08101a"/>
        </radialGradient>
        <!-- Mixer — ON: vivid purple-indigo -->
        <radialGradient :id="`rd-mixer-on-${uid}`" cx="35%" cy="35%" r="65%">
          <stop offset="0%"   stop-color="#2e1880"/>
          <stop offset="100%" stop-color="#100840"/>
        </radialGradient>
        <!-- Demod — OFF -->
        <radialGradient :id="`rd-demod-off-${uid}`" cx="35%" cy="35%" r="65%">
          <stop offset="0%"   stop-color="#18222e"/>
          <stop offset="100%" stop-color="#08101a"/>
        </radialGradient>
        <!-- Demod — ON: green-tinted -->
        <radialGradient :id="`rd-demod-on-${uid}`" cx="35%" cy="35%" r="65%">
          <stop offset="0%"   stop-color="#0a2e1a"/>
          <stop offset="100%" stop-color="#041008"/>
        </radialGradient>
        <!-- RF connector -->
        <linearGradient :id="`rd-conn-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#5a7a9a"/>
          <stop offset="50%"  stop-color="#2a4a6a"/>
          <stop offset="100%" stop-color="#1a2a3a"/>
        </linearGradient>
        <linearGradient :id="`rd-conn-rim-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#7a9aba"/>
          <stop offset="50%"  stop-color="#4a6a8a"/>
          <stop offset="100%" stop-color="#1e3048"/>
        </linearGradient>
        <!-- Glow filters -->
        <filter :id="`rd-glow-${uid}`" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter :id="`rd-pcm-glow-${uid}`" x="-10%" y="-120%" width="120%" height="340%">
          <feGaussianBlur stdDeviation="1.4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <!-- Clip: inner panel -->
        <clipPath :id="`rd-clip-${uid}`">
          <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"/>
        </clipPath>
        <!-- Clip: PCM output zone (right third of demod → right connector) -->
        <clipPath :id="`rd-pcm-clip-${uid}`">
          <rect
            :x="pcmStartX"
            :y="sigY - ph * 0.22"
            :width="pcmEndX - pcmStartX"
            :height="ph * 0.44"/>
        </clipPath>
      </defs>

      <!-- ── Chassis ─────────────────────────────────────────────────────── -->
      <rect x="1" y="1" :width="w-2" :height="h-2"
        :rx="cr" :fill="`url(#rd-body-${uid})`"
        :stroke="`url(#rd-rim-${uid})`" :stroke-width="rw"
      />
      <rect :x="rw*0.5" :y="rw*0.5" :width="w-rw" :height="h-rw"
        :rx="cr*0.8" :fill="`url(#rd-sheen-${uid})`" pointer-events="none"
      />

      <!-- ── RF Connectors ───────────────────────────────────────────────── -->
      <rect :x="0" :y="h/2 - connH/2" :width="connW" :height="connH" :rx="connW*0.35"
        :fill="`url(#rd-conn-${uid})`" :stroke="`url(#rd-conn-rim-${uid})`" :stroke-width="w*0.007"
      />
      <circle :cx="connW*0.5" :cy="h/2" :r="connH*0.22" fill="#0d1117" stroke="#8090a0" stroke-width="1.2"/>
      <rect :x="w-connW" :y="h/2 - connH/2" :width="connW" :height="connH" :rx="connW*0.35"
        :fill="`url(#rd-conn-${uid})`" :stroke="`url(#rd-conn-rim-${uid})`" :stroke-width="w*0.007"
      />
      <circle :cx="w-connW*0.5" :cy="h/2" :r="connH*0.22" fill="#0d1117" stroke="#8090a0" stroke-width="1.2"/>

      <!-- ── Inner panel ─────────────────────────────────────────────────── -->
      <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        :fill="isOn ? `url(#rd-panel-on-${uid})` : `url(#rd-panel-off-${uid})`"
        stroke="#06080e" :stroke-width="rw*0.4"
      />
      <rect v-if="isOn && !d.isInvalid" :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        fill="none" stroke="#3b82f6" :stroke-width="rw*0.4" opacity="0.30"
      />

      <!-- ── Title ──────────────────────────────────────────────────────── -->
      <SvgMultilineText v-if="titleText"
        :text="titleText" :x="titleX" :y="titleY"
        :font-size="titleFontSz" font-weight="700" letter-spacing="1.2"
        font-family="'Courier New', monospace"
        :fill="titleFontColor" :text-anchor="titleAnchor"
        :clip-path="`url(#rd-clip-${uid})`"
      />

      <!-- ══════════════════════════════════════════════════════════════════
           LNA SECTION — amplifier triangle, electric-blue when ON
           ════════════════════════════════════════════════════════════════ -->

      <!-- Signal IN line -->
      <line :x1="connW" :y1="sigY" :x2="tLeft" :y2="sigY"
        :stroke="signalColor" stroke-width="1.6" stroke-linecap="round"
        :opacity="isOn ? 0.85 : 0.22"
        :clip-path="`url(#rd-clip-${uid})`"
      />

      <!-- Amplifier triangle -->
      <polygon
        :points="trianglePoints"
        :fill="isOn ? `url(#rd-tri-on-${uid})` : `url(#rd-tri-off-${uid})`"
        :stroke="isOn ? '#00aaff' : '#1e3a5a'"
        stroke-width="1.8" stroke-linejoin="round"
        :filter="isOn && !d.isInvalid ? `url(#rd-glow-${uid})` : ''"
        :clip-path="`url(#rd-clip-${uid})`"
      />
      <!-- Signal beam line through triangle (ON only) -->
      <line v-if="isOn"
        :x1="tLeft + (tRight - tLeft) * 0.18" :y1="sigY"
        :x2="tRight - (tRight - tLeft) * 0.06" :y2="sigY"
        stroke="#00e5ff" stroke-width="1.1" stroke-linecap="round" opacity="0.72"
        :clip-path="`url(#rd-clip-${uid})`"
      />
      <!-- LNA label inside triangle (ON only) -->
      <text v-if="isOn"
        :x="tLeft + (tRight - tLeft) * 0.38" :y="sigY - triH * 0.27"
        text-anchor="middle" dominant-baseline="middle"
        fill="#4a8eff" :font-size="h * 0.080"
        font-family="'Segoe UI', sans-serif" font-weight="700"
        :clip-path="`url(#rd-clip-${uid})`"
      >LNA</text>

      <!-- ══════════════════════════════════════════════════════════════════
           DIVIDER 1
           ════════════════════════════════════════════════════════════════ -->
      <line :x1="divX1" :y1="py + ph*0.06" :x2="divX1" :y2="py + ph*0.72"
        stroke="#1a2a3a" stroke-width="1" opacity="0.45"
        :clip-path="`url(#rd-clip-${uid})`"
      />

      <!-- Signal: triangle apex → mixer -->
      <line :x1="tRight" :y1="sigY" :x2="mixerCx - mixerR" :y2="sigY"
        :stroke="signalColor" stroke-width="1.6" stroke-linecap="round"
        :opacity="isOn ? 0.85 : 0.22"
        :clip-path="`url(#rd-clip-${uid})`"
      />

      <!-- ══════════════════════════════════════════════════════════════════
           MIXER SECTION — purple-indigo + cyan × when ON
           ════════════════════════════════════════════════════════════════ -->

      <!-- Outer glow ring -->
      <circle v-if="isOn && !d.isInvalid"
        :cx="mixerCx" :cy="mixerCy" :r="mixerR * 1.28"
        fill="none" stroke="#7040ff" stroke-width="0.9" opacity="0.40"
      />
      <!-- Mixer body -->
      <circle :cx="mixerCx" :cy="mixerCy" :r="mixerR"
        :fill="isOn ? `url(#rd-mixer-on-${uid})` : `url(#rd-mixer-off-${uid})`"
        :stroke="isOn ? '#7050e8' : '#1e3a5a'"
        :stroke-width="w*0.010"
        :filter="isOn && !d.isInvalid ? `url(#rd-glow-${uid})` : ''"
      />
      <!-- × symbol — bright cyan when ON -->
      <line :x1="mixerCx - mixerR*0.50" :y1="mixerCy - mixerR*0.50"
            :x2="mixerCx + mixerR*0.50" :y2="mixerCy + mixerR*0.50"
        :stroke="isOn ? '#00e5ff' : '#2a4060'" :stroke-width="w*0.014" stroke-linecap="round"
      />
      <line :x1="mixerCx + mixerR*0.50" :y1="mixerCy - mixerR*0.50"
            :x2="mixerCx - mixerR*0.50" :y2="mixerCy + mixerR*0.50"
        :stroke="isOn ? '#00e5ff' : '#2a4060'" :stroke-width="w*0.014" stroke-linecap="round"
      />

      <!-- LO dashed input -->
      <line :x1="mixerCx" :y1="mixerCy + mixerR"
            :x2="mixerCx" :y2="mixerCy + mixerR + ph*0.09"
        :stroke="loColor" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="3,2"
        :opacity="isOn ? 0.62 : 0.18"
        :clip-path="`url(#rd-clip-${uid})`"
      />
      <text :x="mixerCx" :y="mixerCy + mixerR + ph*0.18"
        text-anchor="middle" dominant-baseline="middle"
        fill="#5a7a98" :font-size="loFontSize"
        font-family="'Segoe UI', sans-serif" font-weight="600"
        :clip-path="`url(#rd-clip-${uid})`"
      >LO</text>

      <!-- ══════════════════════════════════════════════════════════════════
           DIVIDER 2
           ════════════════════════════════════════════════════════════════ -->
      <line :x1="divX2" :y1="py + ph*0.06" :x2="divX2" :y2="py + ph*0.72"
        stroke="#1a2a3a" stroke-width="1" opacity="0.45"
        :clip-path="`url(#rd-clip-${uid})`"
      />

      <!-- Signal: mixer → demod -->
      <line :x1="mixerCx + mixerR" :y1="sigY" :x2="demodBlockX" :y2="sigY"
        :stroke="signalColor" stroke-width="1.6" stroke-linecap="round"
        :opacity="isOn ? 0.85 : 0.22"
        :clip-path="`url(#rd-clip-${uid})`"
      />

      <!-- ══════════════════════════════════════════════════════════════════
           DEMODULATOR SECTION — green border + tint when ON
           ════════════════════════════════════════════════════════════════ -->

      <!-- Demod container -->
      <rect
        :x="demodBlockX" :y="sigY - ph*0.26"
        :width="demodBlockW" :height="ph*0.52"
        :rx="ph*0.06"
        :fill="isOn ? `url(#rd-demod-on-${uid})` : `url(#rd-demod-off-${uid})`"
        :stroke="isOn ? '#44ff88' : '#1e3a5a'"
        stroke-width="1.4"
        :filter="isOn && !d.isInvalid ? `url(#rd-glow-${uid})` : ''"
        :clip-path="`url(#rd-clip-${uid})`"
      />

      <!-- RF sine waveform (left third of demod) -->
      <path :d="sineWavePath"
        fill="none" :stroke="signalColor" stroke-width="1.2" stroke-linecap="round"
        :opacity="isOn ? 0.90 : 0.28"
        :clip-path="`url(#rd-clip-${uid})`"
      />

      <!-- Arrow in demod middle -->
      <line :x1="demodArrowX1" :y1="sigY" :x2="demodArrowX2" :y2="sigY"
        stroke="#9aa8b8" stroke-width="1.0" stroke-linecap="round"
        :opacity="isOn ? 0.80 : 0.25"
        :clip-path="`url(#rd-clip-${uid})`"
      />
      <polygon :points="demodArrowHead" fill="#9aa8b8"
        :opacity="isOn ? 0.80 : 0.25"
        :clip-path="`url(#rd-clip-${uid})`"
      />

      <!-- DEM label -->
      <text
        :x="demodBlockX + demodBlockW * 0.50"
        :y="sigY + ph*0.26 - ph*0.07"
        text-anchor="middle" dominant-baseline="middle"
        :fill="isOn ? '#44ff88' : '#2a4a3a'"
        :font-size="h*0.092"
        font-family="'Segoe UI', sans-serif" font-weight="700"
        :clip-path="`url(#rd-clip-${uid})`"
      >DEM</text>

      <!-- ══════════════════════════════════════════════════════════════════
           PCM OUTPUT — animated scrolling square-wave from demod right edge
           ════════════════════════════════════════════════════════════════ -->
      <!-- Static baseband line (OFF state) -->
      <line v-if="!isOn"
        :x1="demodBlockX + demodBlockW" :y1="sigY"
        :x2="px + pw - stripW - pw*0.01" :y2="sigY"
        stroke="#1e3a2a" stroke-width="1.4" stroke-linecap="round" opacity="0.22"
        :clip-path="`url(#rd-clip-${uid})`"
      />
      <!-- Animated PCM square wave (ON state) -->
      <template v-if="isOn && pcmPathStr">
        <path
          :d="pcmPathStr"
          fill="none"
          stroke="#44ff88"
          stroke-width="1.8"
          stroke-linecap="square"
          stroke-linejoin="miter"
          :filter="`url(#rd-pcm-glow-${uid})`"
          :clip-path="`url(#rd-pcm-clip-${uid})`"
        />
      </template>


      <!-- ── Temperature ─────────────────────────────────────────────────── -->
      <text :x="px + pw - pw*0.025" :y="py + ph - ph*0.10"
        text-anchor="end" dominant-baseline="middle"
        :fill="tempColor" :font-size="tempFontSize"
        font-weight="700" font-family="'Digital7', 'Courier New', monospace"
        :clip-path="`url(#rd-clip-${uid})`"
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
import SvgMultilineText from "./SvgMultilineText.vue";
import { useNodeData } from "./useNodeData";
import { useTitlePosition } from "./useTitlePosition";

const { d, w, h } = useNodeData(250, 110);
const uid = ref(Math.random().toString(36).slice(2, 8));

const titleText   = computed(() => (d.value.name         as string) ?? "");
const titleFontSz = computed(() => (d.value.titleFontSize as number) ?? 10);
const titleFontColor = computed(() => (d.value.titleFontColor as string) || "#c9d1d9");
const { titleX, titleY, titleAnchor } = useTitlePosition(
  () => d.value.titlePosition as string | undefined,
  () => px.value,
  () => mainW.value,
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

// ── Layout: LNA | Mixer | Demod | LED strip ───────────────────────────────
const stripW    = computed(() => pw.value * 0.18);
const mainW     = computed(() => pw.value - stripW.value);
const lnaSecW   = computed(() => mainW.value * 0.32);
const mixSecW   = computed(() => mainW.value * 0.32);
const demodSecW = computed(() => mainW.value * 0.36);

const divX1 = computed(() => px.value + lnaSecW.value);
const divX2 = computed(() => px.value + lnaSecW.value + mixSecW.value);

// ── Signal axis ───────────────────────────────────────────────────────────
const sigY = computed(() => py.value + ph.value * 0.57);

// ── LNA triangle (right-pointing) ────────────────────────────────────────
const tLeft  = computed(() => connW.value + mainW.value * 0.02);
const tRight = computed(() => px.value + lnaSecW.value * 0.90);
const triH   = computed(() => ph.value * 0.46);
const tTopY  = computed(() => sigY.value - triH.value / 2);
const tBotY  = computed(() => sigY.value + triH.value / 2);

const trianglePoints = computed(() =>
  `${tLeft.value.toFixed(1)},${tTopY.value.toFixed(1)} ` +
  `${tLeft.value.toFixed(1)},${tBotY.value.toFixed(1)} ` +
  `${tRight.value.toFixed(1)},${sigY.value.toFixed(1)}`
);

// ── Mixer geometry ────────────────────────────────────────────────────────
const mixerR  = computed(() => ph.value * 0.195);
const mixerCx = computed(() => px.value + lnaSecW.value + mixSecW.value * 0.46);
const mixerCy = computed(() => sigY.value);

// ── Demodulator block geometry ────────────────────────────────────────────
const demodBlockX = computed(() =>
  px.value + lnaSecW.value + mixSecW.value + demodSecW.value * 0.11
);
const demodBlockW     = computed(() => demodSecW.value * 0.78);
const demodBlockRight = computed(() => demodBlockX.value + demodBlockW.value);

const demodLeftThirdX = computed(() => demodBlockX.value + demodBlockW.value * 0.04);
const demodLeftThirdW = computed(() => demodBlockW.value * 0.34);
const demodMidX       = computed(() => demodBlockX.value + demodBlockW.value * 0.42);

// ── Sine waveform path inside demod (3-cycle) ─────────────────────────────
const sineWavePath = computed(() => {
  const x0  = demodLeftThirdX.value;
  const w3  = demodLeftThirdW.value;
  const cy  = sigY.value;
  const amp = ph.value * 0.09;
  const cw  = w3 / 3;
  const c   = cw * 0.5;
  const x1 = x0, x2 = x0 + cw, x3 = x0 + cw * 2, x4 = x0 + cw * 3;
  return (
    `M ${x1.toFixed(1)},${cy.toFixed(1)} ` +
    `C ${(x1+c).toFixed(1)},${(cy-amp).toFixed(1)} ${(x2-c).toFixed(1)},${(cy+amp).toFixed(1)} ${x2.toFixed(1)},${cy.toFixed(1)} ` +
    `C ${(x2+c).toFixed(1)},${(cy-amp).toFixed(1)} ${(x3-c).toFixed(1)},${(cy+amp).toFixed(1)} ${x3.toFixed(1)},${cy.toFixed(1)} ` +
    `C ${(x3+c).toFixed(1)},${(cy-amp).toFixed(1)} ${(x4-c).toFixed(1)},${(cy+amp).toFixed(1)} ${x4.toFixed(1)},${cy.toFixed(1)}`
  );
});

// ── Arrow inside demod ────────────────────────────────────────────────────
const demodArrowX1   = computed(() => demodMidX.value);
const demodArrowX2   = computed(() => demodMidX.value + demodBlockW.value * 0.12);
const demodArrowHead = computed(() => {
  const tip  = demodArrowX2.value + demodBlockW.value * 0.04;
  const base = demodArrowX2.value;
  const hh   = ph.value * 0.05;
  const cy   = sigY.value;
  return `${base},${(cy - hh).toFixed(1)} ${tip.toFixed(1)},${cy.toFixed(1)} ${base},${(cy + hh).toFixed(1)}`;
});

// ── PCM output zone ───────────────────────────────────────────────────────
// Spans from right 40% of demod block through to the right connector edge,
// giving enough room for clearly readable square-wave bits.
const pcmStartX = computed(() => demodBlockX.value + demodBlockW.value * 0.60);
const pcmEndX   = computed(() => w.value - connW.value);

// ── PCM animation ─────────────────────────────────────────────────────────
// NRZ-L bit pattern (16 bits, pseudo-random for visual interest)
const PCM_BITS   = [1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 1];
const N_VISIBLE  = 5;    // bits shown in the window at once
const PCM_SPEED  = 2.8;  // bits per second (scrolls rightward)

const pcmPathStr = ref<string>('');

function buildPcmPath(): string {
  const sx    = pcmStartX.value;
  const ex    = pcmEndX.value;
  const availW = ex - sx;
  if (availW <= 4) return '';

  const segW = availW / N_VISIBLE;
  const cy   = sigY.value;
  const amp  = ph.value * 0.10;

  const frac = _phase % 1;
  const base = Math.floor(_phase);

  // Render bits i = -1 … N_VISIBLE+1; SVG clipPath handles edge cropping.
  // As frac increases 0→1, the whole waveform drifts right by segW,
  // making new bits appear to emerge from the left (demod output).
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
const loFontSize   = computed(() => h.value * 0.095);
const tempFontSize = computed(() => h.value * 0.245);

// ── State ─────────────────────────────────────────────────────────────────
const isOn = computed(() => {
  const sc = d.value.statusColor as string;
  return !!sc && sc !== "" && sc !== "gradient:off";
});

// ── Colors ────────────────────────────────────────────────────────────────
const signalColor = computed(() =>
  d.value.isInvalid ? "#e74c3c" : isOn.value ? "#60a5fa" : "#1e3048"
);
const loColor = computed(() =>
  d.value.isInvalid ? "#e74c3c" : isOn.value ? "#60a5fa" : "#1e2a3a"
);

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
