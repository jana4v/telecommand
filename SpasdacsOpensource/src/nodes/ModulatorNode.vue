<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <!--
      Modulator — 250×110 viewBox.
      Signal flow (left → right):
        PCM data input → PN × Multiplier (XOR / spread) → PSK Modulator → BPSK output
      Animations:
        PCM input  : green scrolling square-wave (data bits) entering the PN multiplier.
        PSK output : cyan BPSK carrier whose phase flips at DSSS chip boundaries (DATA ⊕ PN).
    -->
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <!-- Metallic chassis rim -->
        <linearGradient :id="`md-rim-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#c8c8da"/>
          <stop offset="20%"  stop-color="#686878"/>
          <stop offset="48%"  stop-color="#e4e4f2"/>
          <stop offset="74%"  stop-color="#565666"/>
          <stop offset="100%" stop-color="#b8b8ca"/>
        </linearGradient>
        <linearGradient :id="`md-body-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#0e1828"/>
          <stop offset="100%" stop-color="#060e18"/>
        </linearGradient>
        <linearGradient :id="`md-sheen-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#fff" stop-opacity="0.07"/>
          <stop offset="40%"  stop-color="#fff" stop-opacity="0.02"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.15"/>
        </linearGradient>
        <!-- Inner panel -->
        <radialGradient :id="`md-panel-off-${uid}`" cx="50%" cy="45%" r="65%">
          <stop offset="0%"   stop-color="#14182e"/>
          <stop offset="100%" stop-color="#06080e"/>
        </radialGradient>
        <radialGradient :id="`md-panel-on-${uid}`" cx="50%" cy="40%" r="70%">
          <stop offset="0%"   stop-color="#0e1a2e"/>
          <stop offset="60%"  stop-color="#060e1a"/>
          <stop offset="100%" stop-color="#020810"/>
        </radialGradient>
        <!-- PN × multiplier circle — OFF -->
        <radialGradient :id="`md-pn-off-${uid}`" cx="35%" cy="35%" r="65%">
          <stop offset="0%"   stop-color="#1e1808"/>
          <stop offset="100%" stop-color="#0e0a04"/>
        </radialGradient>
        <!-- PN × multiplier circle — ON: deep amber (spread-spectrum mixing) -->
        <radialGradient :id="`md-pn-on-${uid}`" cx="35%" cy="35%" r="65%">
          <stop offset="0%"   stop-color="#3a2200"/>
          <stop offset="100%" stop-color="#180e00"/>
        </radialGradient>
        <!-- PSK MOD block — OFF -->
        <radialGradient :id="`md-psk-off-${uid}`" cx="35%" cy="35%" r="65%">
          <stop offset="0%"   stop-color="#0a1020"/>
          <stop offset="100%" stop-color="#040810"/>
        </radialGradient>
        <!-- PSK MOD block — ON: deep blue (carrier / phase modulation side) -->
        <radialGradient :id="`md-psk-on-${uid}`" cx="35%" cy="35%" r="65%">
          <stop offset="0%"   stop-color="#001a3a"/>
          <stop offset="100%" stop-color="#000a20"/>
        </radialGradient>
        <!-- RF connectors -->
        <linearGradient :id="`md-conn-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#5a7a9a"/>
          <stop offset="50%"  stop-color="#2a4a6a"/>
          <stop offset="100%" stop-color="#1a2a3a"/>
        </linearGradient>
        <linearGradient :id="`md-conn-rim-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#7a9aba"/>
          <stop offset="50%"  stop-color="#4a6a8a"/>
          <stop offset="100%" stop-color="#1e3048"/>
        </linearGradient>
        <!-- Glow filters -->
        <filter :id="`md-glow-${uid}`" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter :id="`md-pcm-glow-${uid}`" x="-10%" y="-120%" width="120%" height="340%">
          <feGaussianBlur stdDeviation="1.4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter :id="`md-psk-glow-${uid}`" x="-10%" y="-120%" width="120%" height="340%">
          <feGaussianBlur stdDeviation="1.6" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <!-- Clip: inner panel -->
        <clipPath :id="`md-clip-${uid}`">
          <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"/>
        </clipPath>
        <!-- Clip: PCM input zone (left connector → PN circle left edge) -->
        <clipPath :id="`md-pcm-clip-${uid}`">
          <rect
            :x="pcmStartX"
            :y="sigY - ph * 0.22"
            :width="pcmEndX - pcmStartX"
            :height="ph * 0.44"/>
        </clipPath>
        <!-- Clip: PSK output zone (PSK block right edge → right connector) -->
        <clipPath :id="`md-psk-clip-${uid}`">
          <rect
            :x="pskOutStartX"
            :y="sigY - ph * 0.22"
            :width="pskOutEndX - pskOutStartX"
            :height="ph * 0.44"/>
        </clipPath>
      </defs>

      <!-- ── Chassis ─────────────────────────────────────────────────────── -->
      <rect x="1" y="1" :width="w-2" :height="h-2"
        :rx="cr" :fill="`url(#md-body-${uid})`"
        :stroke="`url(#md-rim-${uid})`" :stroke-width="rw"
      />
      <rect :x="rw*0.5" :y="rw*0.5" :width="w-rw" :height="h-rw"
        :rx="cr*0.8" :fill="`url(#md-sheen-${uid})`" pointer-events="none"
      />

      <!-- ── RF Connectors ───────────────────────────────────────────────── -->
      <rect :x="0" :y="h/2 - connH/2" :width="connW" :height="connH" :rx="connW*0.35"
        :fill="`url(#md-conn-${uid})`" :stroke="`url(#md-conn-rim-${uid})`" :stroke-width="w*0.007"
      />
      <circle :cx="connW*0.5" :cy="h/2" :r="connH*0.22" fill="#0d1117" stroke="#8090a0" stroke-width="1.2"/>
      <rect :x="w-connW" :y="h/2 - connH/2" :width="connW" :height="connH" :rx="connW*0.35"
        :fill="`url(#md-conn-${uid})`" :stroke="`url(#md-conn-rim-${uid})`" :stroke-width="w*0.007"
      />
      <circle :cx="w-connW*0.5" :cy="h/2" :r="connH*0.22" fill="#0d1117" stroke="#8090a0" stroke-width="1.2"/>

      <!-- ── Inner panel ─────────────────────────────────────────────────── -->
      <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        :fill="isOn ? `url(#md-panel-on-${uid})` : `url(#md-panel-off-${uid})`"
        stroke="#06080e" :stroke-width="rw*0.4"
      />
      <rect v-if="isOn && !d.isInvalid" :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        fill="none" stroke="#44ff88" :stroke-width="rw*0.4" opacity="0.15"
      />

      <!-- ── Title ──────────────────────────────────────────────────────── -->
      <SvgMultilineText v-if="titleText"
        :text="titleText" :x="titleX" :y="titleY"
        :font-size="titleFontSz" font-weight="700" letter-spacing="1.2"
        font-family="'Courier New', monospace"
        :fill="titleFontColor" :text-anchor="titleAnchor"
        :clip-path="`url(#md-clip-${uid})`"
      />

      <!-- ══════════════════════════════════════════════════════════════════
           PCM INPUT — green scrolling square-wave entering PN multiplier
           ════════════════════════════════════════════════════════════════ -->
      <line v-if="!isOn"
        :x1="connW" :y1="sigY" :x2="pnCx - pnR" :y2="sigY"
        stroke="#1e3a2a" stroke-width="1.4" stroke-linecap="round" opacity="0.22"
        :clip-path="`url(#md-clip-${uid})`"
      />
      <template v-if="isOn && pcmPathStr">
        <path
          :d="pcmPathStr"
          fill="none" stroke="#44ff88" stroke-width="1.8"
          stroke-linecap="square" stroke-linejoin="miter"
          :filter="`url(#md-pcm-glow-${uid})`"
          :clip-path="`url(#md-pcm-clip-${uid})`"
        />
      </template>

      <!-- ── Divider 1: PCM | PN ────────────────────────────────────────── -->
      <line :x1="divX1" :y1="py + ph*0.06" :x2="divX1" :y2="py + ph*0.72"
        stroke="#1a2a3a" stroke-width="1" opacity="0.40"
        :clip-path="`url(#md-clip-${uid})`"
      />

      <!-- ══════════════════════════════════════════════════════════════════
           PN × MULTIPLIER — amber/orange circle, XOR symbol, PN input stub
           ════════════════════════════════════════════════════════════════ -->

      <!-- Outer glow ring (ON) -->
      <circle v-if="isOn && !d.isInvalid"
        :cx="pnCx" :cy="pnCy" :r="pnR * 1.28"
        fill="none" stroke="#ff8800" stroke-width="0.9" opacity="0.38"
      />
      <!-- Circle body -->
      <circle :cx="pnCx" :cy="pnCy" :r="pnR"
        :fill="isOn ? `url(#md-pn-on-${uid})` : `url(#md-pn-off-${uid})`"
        :stroke="isOn ? '#ff8800' : '#2a1a06'"
        :stroke-width="w*0.010"
        :filter="isOn && !d.isInvalid ? `url(#md-glow-${uid})` : ''"
      />
      <!-- × symbol — bright amber when ON -->
      <line :x1="pnCx - pnR*0.50" :y1="pnCy - pnR*0.50"
            :x2="pnCx + pnR*0.50" :y2="pnCy + pnR*0.50"
        :stroke="isOn ? '#ffaa00' : '#2a1a06'" :stroke-width="w*0.014" stroke-linecap="round"
      />
      <line :x1="pnCx + pnR*0.50" :y1="pnCy - pnR*0.50"
            :x2="pnCx - pnR*0.50" :y2="pnCy + pnR*0.50"
        :stroke="isOn ? '#ffaa00' : '#2a1a06'" :stroke-width="w*0.014" stroke-linecap="round"
      />
      <!-- PN sequence input stub (dashed line from below, like LO on mixer) -->
      <line :x1="pnCx" :y1="pnCy + pnR"
            :x2="pnCx" :y2="pnCy + pnR + ph*0.09"
        :stroke="isOn ? '#ff8800' : '#2a1a06'" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="3,2"
        :opacity="isOn ? 0.65 : 0.18"
        :clip-path="`url(#md-clip-${uid})`"
      />
      <text :x="pnCx" :y="pnCy + pnR + ph*0.20"
        text-anchor="middle" dominant-baseline="middle"
        :fill="isOn ? '#cc7700' : '#2a1a06'" :font-size="loFontSize"
        font-family="'Segoe UI', sans-serif" font-weight="700"
        :clip-path="`url(#md-clip-${uid})`"
      >PN</text>

      <!-- ── Divider 2: PN | PSK ────────────────────────────────────────── -->
      <line :x1="divX2" :y1="py + ph*0.06" :x2="divX2" :y2="py + ph*0.72"
        stroke="#1a2a3a" stroke-width="1" opacity="0.40"
        :clip-path="`url(#md-clip-${uid})`"
      />

      <!-- Signal: PN right → PSK block left -->
      <line :x1="pnCx + pnR" :y1="sigY" :x2="pskBlockX" :y2="sigY"
        :stroke="isOn ? '#4a9eff' : '#1e2a3a'"
        stroke-width="1.6" stroke-linecap="round"
        :opacity="isOn ? 0.85 : 0.22"
        :clip-path="`url(#md-clip-${uid})`"
      />

      <!-- ══════════════════════════════════════════════════════════════════
           PSK MODULATOR BLOCK — deep blue, shows PN×data → carrier mapping
           ════════════════════════════════════════════════════════════════ -->

      <!-- PSK block container -->
      <rect
        :x="pskBlockX" :y="sigY - ph*0.28"
        :width="pskBlockW" :height="ph*0.56"
        :rx="ph*0.06"
        :fill="isOn ? `url(#md-psk-on-${uid})` : `url(#md-psk-off-${uid})`"
        :stroke="isOn ? '#0088ff' : '#0a1428'"
        stroke-width="1.4"
        :filter="isOn && !d.isInvalid ? `url(#md-glow-${uid})` : ''"
        :clip-path="`url(#md-clip-${uid})`"
      />

      <!-- Input side: PN×PCM spread bits (small square wave left portion) -->
      <path :d="pskInputSquarePath"
        fill="none"
        :stroke="isOn ? '#ffaa00' : '#1e1808'"
        stroke-width="1.1" stroke-linecap="square" stroke-linejoin="miter"
        :opacity="isOn ? 0.85 : 0.22"
        :clip-path="`url(#md-clip-${uid})`"
      />

      <!-- Arrow inside PSK block (spread bits → modulated carrier) -->
      <line :x1="pskArrowX1" :y1="sigY" :x2="pskArrowX2" :y2="sigY"
        stroke="#9aa8b8" stroke-width="1.0" stroke-linecap="round"
        :opacity="isOn ? 0.80 : 0.22"
        :clip-path="`url(#md-clip-${uid})`"
      />
      <polygon :points="pskArrowHead" fill="#9aa8b8"
        :opacity="isOn ? 0.80 : 0.22"
        :clip-path="`url(#md-clip-${uid})`"
      />

      <!-- Output side: PSK carrier with phase reversal (right portion) -->
      <path :d="pskOutputCarrierPath"
        fill="none"
        :stroke="isOn ? '#00aaff' : '#0a1428'"
        stroke-width="1.2" stroke-linecap="round"
        :opacity="isOn ? 0.90 : 0.22"
        :clip-path="`url(#md-clip-${uid})`"
      />

      <!-- PSK label -->
      <text
        :x="pskBlockX + pskBlockW * 0.50" :y="sigY + ph*0.28 - ph*0.07"
        text-anchor="middle" dominant-baseline="middle"
        :fill="isOn ? '#0088ff' : '#0a1a2a'"
        :font-size="h*0.088"
        font-family="'Segoe UI', sans-serif" font-weight="700"
        :clip-path="`url(#md-clip-${uid})`"
      >PSK</text>

      <!-- ══════════════════════════════════════════════════════════════════
           PSK OUTPUT — animated DSSS BPSK carrier (phase flips at chip rate)
           Phase shift = DATA_BIT ⊕ PN_CHIP → spread-spectrum BPSK output
           ════════════════════════════════════════════════════════════════ -->

      <!-- Static line when OFF -->
      <line v-if="!isOn"
        :x1="pskBlockX + pskBlockW" :y1="sigY" :x2="w - connW" :y2="sigY"
        stroke="#1e3048" stroke-width="1.4" stroke-linecap="round" opacity="0.22"
        :clip-path="`url(#md-clip-${uid})`"
      />

      <!-- Animated BPSK output when ON -->
      <template v-if="isOn && pskPathStr">
        <path
          :d="pskPathStr"
          fill="none" stroke="#00ccff" stroke-width="1.8"
          stroke-linecap="round" stroke-linejoin="round"
          :filter="`url(#md-psk-glow-${uid})`"
          :clip-path="`url(#md-psk-clip-${uid})`"
        />
      </template>

      <!-- ── Temperature (bottom-right) ─────────────────────────────────── -->
      <text :x="px + pw - pw*0.025" :y="py + ph - ph*0.10"
        text-anchor="end" dominant-baseline="middle"
        :fill="tempColor" :font-size="tempFontSize"
        font-weight="700" font-family="'Digital7', 'Courier New', monospace"
        :clip-path="`url(#md-clip-${uid})`"
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

const { d, w, h } = useNodeData(250, 110);
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

// ── Layout sections (proportions of pw) ──────────────────────────────────
// PCM 18% | PN× 27% | PSK MOD 31% | out 24%
const pcmZoneW = computed(() => pw.value * 0.18);
const pnZoneW  = computed(() => pw.value * 0.27);
const pskZoneW = computed(() => pw.value * 0.31);

const divX1 = computed(() => px.value + pcmZoneW.value);
const divX2 = computed(() => px.value + pcmZoneW.value + pnZoneW.value);

// ── Signal axis ───────────────────────────────────────────────────────────
const sigY = computed(() => py.value + ph.value * 0.57);

// ── PN multiplier circle ──────────────────────────────────────────────────
const pnR  = computed(() => ph.value * 0.195);
const pnCx = computed(() => px.value + pcmZoneW.value + pnZoneW.value * 0.50);
const pnCy = computed(() => sigY.value);

// ── PSK MOD block ─────────────────────────────────────────────────────────
const pskBlockX = computed(() => divX2.value + pskZoneW.value * 0.08);
const pskBlockW = computed(() => pskZoneW.value * 0.84);

// ── PSK block interior — static square wave (left third, spread bits) ────
const pskInputSquarePath = computed(() => {
  const x0  = pskBlockX.value + pskBlockW.value * 0.05;
  const bw  = pskBlockW.value * 0.28;
  const cy  = sigY.value;
  const amp = ph.value * 0.09;
  const segW = bw / 4; // 4 chips visible
  // Pattern: 1 0 1 1 (PN×data example)
  const bits = [1, 0, 1, 1];
  let path = `M ${x0.toFixed(2)},${(cy - amp).toFixed(2)}`;
  bits.forEach((b, i) => {
    const y = b === 1 ? cy - amp : cy + amp;
    const xL = x0 + i * segW;
    const xR = x0 + (i + 1) * segW;
    const prevY = i === 0 ? cy - amp : (bits[i - 1] === 1 ? cy - amp : cy + amp);
    if (i > 0 && y !== prevY) {
      path += ` L ${xL.toFixed(2)},${prevY.toFixed(2)} L ${xL.toFixed(2)},${y.toFixed(2)}`;
    }
    path += ` L ${xR.toFixed(2)},${y.toFixed(2)}`;
  });
  return path;
});

// ── PSK block interior — arrow (center) ──────────────────────────────────
const pskArrowX1 = computed(() => pskBlockX.value + pskBlockW.value * 0.38);
const pskArrowX2 = computed(() => pskBlockX.value + pskBlockW.value * 0.50);
const pskArrowHead = computed(() => {
  const tip  = pskArrowX2.value + pskBlockW.value * 0.04;
  const base = pskArrowX2.value;
  const hh   = ph.value * 0.05;
  const cy   = sigY.value;
  return `${base},${(cy - hh).toFixed(1)} ${tip.toFixed(1)},${cy.toFixed(1)} ${base},${(cy + hh).toFixed(1)}`;
});

// ── PSK block interior — carrier with phase reversal (right third) ────────
const pskOutputCarrierPath = computed(() => {
  const x0  = pskBlockX.value + pskBlockW.value * 0.56;
  const bw  = pskBlockW.value * 0.38;
  const cy  = sigY.value;
  const amp = ph.value * 0.09;
  const N   = 60;
  let path  = '';
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = x0 + u * bw;
    // 2.5 carrier cycles; phase reversal at halfway (visually shows PSK)
    const phShift = u < 0.5 ? 0 : Math.PI;
    const y = cy - amp * Math.sin(u * 2.5 * 2 * Math.PI + phShift);
    if (i === 0) path = `M ${x.toFixed(2)},${y.toFixed(2)}`;
    else         path += ` L ${x.toFixed(2)},${y.toFixed(2)}`;
  }
  return path;
});

// ── PCM input zone ────────────────────────────────────────────────────────
const pcmStartX = computed(() => connW.value);
const pcmEndX   = computed(() => pnCx.value - pnR.value);

// ── PSK output zone ───────────────────────────────────────────────────────
const pskOutStartX = computed(() => pskBlockX.value + pskBlockW.value);
const pskOutEndX   = computed(() => w.value - connW.value);

// ── Bit & chip patterns ───────────────────────────────────────────────────
const DATA_BITS    = [1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 1];
const PN_CHIPS     = [1, 0, 1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0]; // 16-chip Gold code
const PCM_SPEED    = 2.0;  // data bits per second
const N_VIS_PCM    = 3;    // data bits visible in PCM input zone
const N_VIS_PSK    = 3;    // data bits visible in PSK output zone
const N_CARRIER    = 6;    // carrier cycles per data bit in PSK output zone
const CHIPS_PER_BIT = 4;   // spreading factor (PN chips per data bit)

const pcmPathStr = ref<string>('');
const pskPathStr = ref<string>('');

// ── PCM input path — scrolling green square wave ──────────────────────────
function buildPcmPath(): string {
  const sx     = pcmStartX.value;
  const ex     = pcmEndX.value;
  const availW = ex - sx;
  if (availW <= 4) return '';

  const segW = availW / N_VIS_PCM;
  const cy   = sigY.value;
  const amp  = ph.value * 0.10;

  const frac = _phase % 1;
  const base = Math.floor(_phase);

  let path = '';
  let prevLevel = -1;

  for (let i = -1; i <= N_VIS_PCM + 1; i++) {
    const idx   = ((base + i) % DATA_BITS.length + DATA_BITS.length) % DATA_BITS.length;
    const level = DATA_BITS[idx];
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

// ── PSK output path — DSSS BPSK: phase driven by DATA ⊕ PN_CHIP ──────────
// Each data bit is split into CHIPS_PER_BIT sub-intervals; the phase of the
// carrier within each chip is determined by: data_bit XOR pn_chip.
// This produces the characteristic dense phase-reversal pattern of DSSS.
function buildPskPath(): string {
  const sx     = pskOutStartX.value;
  const ex     = pskOutEndX.value;
  const availW = ex - sx;
  if (availW <= 4) return '';

  const N  = 160;
  const cy = sigY.value;
  const amp = ph.value * 0.13;

  const frac = _phase % 1;
  const base = Math.floor(_phase);

  let path = '';

  for (let i = 0; i <= N; i++) {
    const u = i / N; // 0..1 across PSK output zone
    const x = sx + u * availW;

    // Data bit position (N_VIS_PSK bits across the zone, scrolling)
    const bitPos  = u * N_VIS_PSK + frac;
    const bitIdx  = ((base + Math.floor(bitPos)) % DATA_BITS.length + DATA_BITS.length) % DATA_BITS.length;
    const dataVal = DATA_BITS[bitIdx];

    // PN chip position (CHIPS_PER_BIT chips per data bit)
    const chipPos = bitPos * CHIPS_PER_BIT;
    const chipIdx = Math.floor(chipPos) % PN_CHIPS.length;
    const pnVal   = PN_CHIPS[chipIdx];

    // Spread bit: XOR of data and PN chip
    const spreadBit = dataVal ^ pnVal;
    const phShift   = spreadBit === 1 ? Math.PI : 0;

    // Carrier: N_CARRIER cycles per data bit, scrolling rightward (minus = rightward)
    const carrierArg = (u * N_VIS_PSK * N_CARRIER - _phase * N_CARRIER) * 2 * Math.PI;
    const y = cy - amp * Math.sin(carrierArg + phShift);

    if (i === 0) path = `M ${x.toFixed(2)},${y.toFixed(2)}`;
    else         path += ` L ${x.toFixed(2)},${y.toFixed(2)}`;
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
    _phase = (_phase + dt * PCM_SPEED) % DATA_BITS.length;
    pcmPathStr.value = buildPcmPath();
    pskPathStr.value = buildPskPath();
  } else {
    _phase = 0;
    pcmPathStr.value = '';
    pskPathStr.value = '';
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
