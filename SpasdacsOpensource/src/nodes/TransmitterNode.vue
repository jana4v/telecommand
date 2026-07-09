<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <!--
      Transmitter — 250×110 viewBox.
      Signal flow (left → right):
        PCM input → Modulator → Mixer (LO) → Power Amplifier → PM output
      Animations:
        PCM input : green scrolling square-wave entering the MOD block from the left connector.
        PM output : cyan BPSK phase-modulated carrier emerging from the PA apex.
    -->
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <!-- Metallic chassis rim -->
        <linearGradient :id="`tx-rim-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#c8c8da"/>
          <stop offset="20%"  stop-color="#686878"/>
          <stop offset="48%"  stop-color="#e4e4f2"/>
          <stop offset="74%"  stop-color="#565666"/>
          <stop offset="100%" stop-color="#b8b8ca"/>
        </linearGradient>
        <linearGradient :id="`tx-body-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#0e1828"/>
          <stop offset="100%" stop-color="#060e18"/>
        </linearGradient>
        <linearGradient :id="`tx-sheen-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#fff" stop-opacity="0.07"/>
          <stop offset="40%"  stop-color="#fff" stop-opacity="0.02"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.15"/>
        </linearGradient>
        <!-- Inner panel -->
        <radialGradient :id="`tx-panel-off-${uid}`" cx="50%" cy="45%" r="65%">
          <stop offset="0%"   stop-color="#14182e"/>
          <stop offset="100%" stop-color="#06080e"/>
        </radialGradient>
        <radialGradient :id="`tx-panel-on-${uid}`" cx="62%" cy="38%" r="70%">
          <stop offset="0%"   stop-color="#0e1a3a"/>
          <stop offset="60%"  stop-color="#060e22"/>
          <stop offset="100%" stop-color="#020810"/>
        </radialGradient>
        <!-- MOD block — OFF -->
        <radialGradient :id="`tx-mod-off-${uid}`" cx="35%" cy="35%" r="65%">
          <stop offset="0%"   stop-color="#18222e"/>
          <stop offset="100%" stop-color="#08101a"/>
        </radialGradient>
        <!-- MOD block — ON: green-tinted (baseband processing side) -->
        <radialGradient :id="`tx-mod-on-${uid}`" cx="35%" cy="35%" r="65%">
          <stop offset="0%"   stop-color="#0a2e1a"/>
          <stop offset="100%" stop-color="#041008"/>
        </radialGradient>
        <!-- Mixer — OFF -->
        <radialGradient :id="`tx-mix-off-${uid}`" cx="35%" cy="35%" r="65%">
          <stop offset="0%"   stop-color="#18222e"/>
          <stop offset="100%" stop-color="#08101a"/>
        </radialGradient>
        <!-- Mixer — ON: vivid purple-indigo (frequency conversion) -->
        <radialGradient :id="`tx-mix-on-${uid}`" cx="35%" cy="35%" r="65%">
          <stop offset="0%"   stop-color="#2e1880"/>
          <stop offset="100%" stop-color="#100840"/>
        </radialGradient>
        <!-- PA Triangle — OFF -->
        <linearGradient :id="`tx-pa-off-${uid}`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#1a2030" stop-opacity="0.90"/>
          <stop offset="100%" stop-color="#243040" stop-opacity="0.65"/>
        </linearGradient>
        <!-- PA Triangle — ON: electric blue (RF output side) -->
        <linearGradient :id="`tx-pa-on-${uid}`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#0d1e5a" stop-opacity="0.96"/>
          <stop offset="55%"  stop-color="#1a4ecc" stop-opacity="0.92"/>
          <stop offset="100%" stop-color="#2578ff" stop-opacity="0.88"/>
        </linearGradient>
        <!-- RF connectors -->
        <linearGradient :id="`tx-conn-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#5a7a9a"/>
          <stop offset="50%"  stop-color="#2a4a6a"/>
          <stop offset="100%" stop-color="#1a2a3a"/>
        </linearGradient>
        <linearGradient :id="`tx-conn-rim-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#7a9aba"/>
          <stop offset="50%"  stop-color="#4a6a8a"/>
          <stop offset="100%" stop-color="#1e3048"/>
        </linearGradient>
        <!-- Glow filters -->
        <filter :id="`tx-glow-${uid}`" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter :id="`tx-pcm-glow-${uid}`" x="-10%" y="-120%" width="120%" height="340%">
          <feGaussianBlur stdDeviation="1.4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter :id="`tx-pm-glow-${uid}`" x="-10%" y="-120%" width="120%" height="340%">
          <feGaussianBlur stdDeviation="1.6" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <!-- Clip: inner panel -->
        <clipPath :id="`tx-clip-${uid}`">
          <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"/>
        </clipPath>
        <!-- Clip: PCM input zone (left connector → inside MOD block left portion) -->
        <clipPath :id="`tx-pcm-clip-${uid}`">
          <rect
            :x="pcmInStartX"
            :y="sigY - ph * 0.22"
            :width="pcmInEndX - pcmInStartX"
            :height="ph * 0.44"/>
        </clipPath>
        <!-- Clip: PM output zone (PA apex → right connector) -->
        <clipPath :id="`tx-pm-clip-${uid}`">
          <rect
            :x="pmStartX"
            :y="sigY - ph * 0.22"
            :width="pmEndX - pmStartX"
            :height="ph * 0.44"/>
        </clipPath>
      </defs>

      <!-- ── Chassis ─────────────────────────────────────────────────────── -->
      <rect x="1" y="1" :width="w-2" :height="h-2"
        :rx="cr" :fill="`url(#tx-body-${uid})`"
        :stroke="`url(#tx-rim-${uid})`" :stroke-width="rw"
      />
      <rect :x="rw*0.5" :y="rw*0.5" :width="w-rw" :height="h-rw"
        :rx="cr*0.8" :fill="`url(#tx-sheen-${uid})`" pointer-events="none"
      />

      <!-- ── RF Connectors ───────────────────────────────────────────────── -->
      <rect :x="0" :y="h/2 - connH/2" :width="connW" :height="connH" :rx="connW*0.35"
        :fill="`url(#tx-conn-${uid})`" :stroke="`url(#tx-conn-rim-${uid})`" :stroke-width="w*0.007"
      />
      <circle :cx="connW*0.5" :cy="h/2" :r="connH*0.22" fill="#0d1117" stroke="#8090a0" stroke-width="1.2"/>
      <rect :x="w-connW" :y="h/2 - connH/2" :width="connW" :height="connH" :rx="connW*0.35"
        :fill="`url(#tx-conn-${uid})`" :stroke="`url(#tx-conn-rim-${uid})`" :stroke-width="w*0.007"
      />
      <circle :cx="w-connW*0.5" :cy="h/2" :r="connH*0.22" fill="#0d1117" stroke="#8090a0" stroke-width="1.2"/>

      <!-- ── Inner panel ─────────────────────────────────────────────────── -->
      <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        :fill="isOn ? `url(#tx-panel-on-${uid})` : `url(#tx-panel-off-${uid})`"
        stroke="#06080e" :stroke-width="rw*0.4"
      />
      <rect v-if="isOn && !d.isInvalid" :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        fill="none" stroke="#44ff88" :stroke-width="rw*0.4" opacity="0.20"
      />

      <!-- ── Title ──────────────────────────────────────────────────────── -->
      <SvgMultilineText v-if="titleText"
        :text="titleText" :x="titleX" :y="titleY"
        :font-size="titleFontSz" font-weight="700" letter-spacing="1.2"
        font-family="'Courier New', monospace"
        :fill="titleFontColor" :text-anchor="titleAnchor"
        :clip-path="`url(#tx-clip-${uid})`"
      />

      <!-- ══════════════════════════════════════════════════════════════════
           PCM INPUT — green scrolling square-wave entering MOD (static line when OFF)
           ════════════════════════════════════════════════════════════════ -->
      <line v-if="!isOn"
        :x1="connW" :y1="sigY" :x2="modBlockX" :y2="sigY"
        stroke="#1e3a2a" stroke-width="1.4" stroke-linecap="round" opacity="0.22"
        :clip-path="`url(#tx-clip-${uid})`"
      />
      <template v-if="isOn && pcmPathStr">
        <path
          :d="pcmPathStr"
          fill="none" stroke="#44ff88" stroke-width="1.8"
          stroke-linecap="square" stroke-linejoin="miter"
          :filter="`url(#tx-pcm-glow-${uid})`"
          :clip-path="`url(#tx-pcm-clip-${uid})`"
        />
      </template>

      <!-- ══════════════════════════════════════════════════════════════════
           MODULATOR BLOCK — green border when ON (baseband → RF)
           ════════════════════════════════════════════════════════════════ -->

      <!-- MOD container -->
      <rect
        :x="modBlockX" :y="sigY - ph*0.26"
        :width="modBlockW" :height="ph*0.52"
        :rx="ph*0.06"
        :fill="isOn ? `url(#tx-mod-on-${uid})` : `url(#tx-mod-off-${uid})`"
        :stroke="isOn ? '#44ff88' : '#1e3a5a'"
        stroke-width="1.4"
        :filter="isOn && !d.isInvalid ? `url(#tx-glow-${uid})` : ''"
        :clip-path="`url(#tx-clip-${uid})`"
      />

      <!-- Baseband envelope (left third of MOD — the INPUT side) -->
      <path :d="modEnvelopePath"
        fill="none"
        :stroke="isOn ? '#44ff88' : '#1e3a2a'"
        stroke-width="1.5" stroke-linecap="round"
        :clip-path="`url(#tx-clip-${uid})`"
      />

      <!-- Arrow in MOD middle -->
      <line :x1="modArrowX1" :y1="sigY" :x2="modArrowX2" :y2="sigY"
        stroke="#9aa8b8" stroke-width="1.0" stroke-linecap="round"
        :opacity="isOn ? 0.80 : 0.25"
        :clip-path="`url(#tx-clip-${uid})`"
      />
      <polygon :points="modArrowHead" fill="#9aa8b8"
        :opacity="isOn ? 0.80 : 0.25"
        :clip-path="`url(#tx-clip-${uid})`"
      />

      <!-- Carrier sine wave (right third of MOD — the OUTPUT side) -->
      <path :d="modCarrierPath"
        fill="none" :stroke="signalColor"
        stroke-width="1.2" stroke-linecap="round"
        :opacity="isOn ? 0.90 : 0.28"
        :clip-path="`url(#tx-clip-${uid})`"
      />

      <!-- MOD label -->
      <text
        :x="modBlockX + modBlockW * 0.50" :y="sigY + ph*0.26 - ph*0.07"
        text-anchor="middle" dominant-baseline="middle"
        :fill="isOn ? '#44ff88' : '#2a4a3a'"
        :font-size="h*0.092"
        font-family="'Segoe UI', sans-serif" font-weight="700"
        :clip-path="`url(#tx-clip-${uid})`"
      >MOD</text>

      <!-- ══════════════════════════════════════════════════════════════════
           DIVIDER 1: MOD | Mixer
           ════════════════════════════════════════════════════════════════ -->
      <line :x1="divX1" :y1="py + ph*0.06" :x2="divX1" :y2="py + ph*0.72"
        stroke="#1a2a3a" stroke-width="1" opacity="0.45"
        :clip-path="`url(#tx-clip-${uid})`"
      />

      <!-- Signal: MOD right → Mixer left -->
      <line :x1="modBlockRight" :y1="sigY" :x2="mixerCx - mixerR" :y2="sigY"
        :stroke="signalColor" stroke-width="1.6" stroke-linecap="round"
        :opacity="isOn ? 0.85 : 0.22"
        :clip-path="`url(#tx-clip-${uid})`"
      />

      <!-- ══════════════════════════════════════════════════════════════════
           MIXER — purple-indigo + cyan × when ON
           ════════════════════════════════════════════════════════════════ -->

      <!-- Outer glow ring -->
      <circle v-if="isOn && !d.isInvalid"
        :cx="mixerCx" :cy="mixerCy" :r="mixerR * 1.28"
        fill="none" stroke="#7040ff" stroke-width="0.9" opacity="0.40"
      />
      <!-- Mixer body -->
      <circle :cx="mixerCx" :cy="mixerCy" :r="mixerR"
        :fill="isOn ? `url(#tx-mix-on-${uid})` : `url(#tx-mix-off-${uid})`"
        :stroke="isOn ? '#7050e8' : '#1e3a5a'"
        :stroke-width="w*0.010"
        :filter="isOn && !d.isInvalid ? `url(#tx-glow-${uid})` : ''"
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

      <!-- LO upconversion input (dashed line from bottom) -->
      <line :x1="mixerCx" :y1="mixerCy + mixerR"
            :x2="mixerCx" :y2="mixerCy + mixerR + ph*0.09"
        :stroke="loColor" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="3,2"
        :opacity="isOn ? 0.62 : 0.18"
        :clip-path="`url(#tx-clip-${uid})`"
      />
      <text :x="mixerCx" :y="mixerCy + mixerR + ph*0.18"
        text-anchor="middle" dominant-baseline="middle"
        fill="#5a7a98" :font-size="loFontSize"
        font-family="'Segoe UI', sans-serif" font-weight="600"
        :clip-path="`url(#tx-clip-${uid})`"
      >LO</text>

      <!-- ══════════════════════════════════════════════════════════════════
           DIVIDER 2: Mixer | PA
           ════════════════════════════════════════════════════════════════ -->
      <line :x1="divX2" :y1="py + ph*0.06" :x2="divX2" :y2="py + ph*0.72"
        stroke="#1a2a3a" stroke-width="1" opacity="0.45"
        :clip-path="`url(#tx-clip-${uid})`"
      />

      <!-- Signal: Mixer right → PA left face -->
      <line :x1="mixerCx + mixerR" :y1="sigY" :x2="paLeft" :y2="sigY"
        :stroke="signalColor" stroke-width="1.6" stroke-linecap="round"
        :opacity="isOn ? 0.85 : 0.22"
        :clip-path="`url(#tx-clip-${uid})`"
      />

      <!-- ══════════════════════════════════════════════════════════════════
           POWER AMPLIFIER — electric blue when ON
           ════════════════════════════════════════════════════════════════ -->

      <!-- PA triangle (right-pointing) -->
      <polygon
        :points="paPoints"
        :fill="isOn ? `url(#tx-pa-on-${uid})` : `url(#tx-pa-off-${uid})`"
        :stroke="isOn ? '#00aaff' : '#1e3a5a'"
        stroke-width="1.8" stroke-linejoin="round"
        :filter="isOn && !d.isInvalid ? `url(#tx-glow-${uid})` : ''"
        :clip-path="`url(#tx-clip-${uid})`"
      />
      <!-- Signal beam inside PA (ON only) -->
      <line v-if="isOn"
        :x1="paLeft + (paRight - paLeft) * 0.18" :y1="sigY"
        :x2="paRight - (paRight - paLeft) * 0.06" :y2="sigY"
        stroke="#00e5ff" stroke-width="1.1" stroke-linecap="round" opacity="0.72"
        :clip-path="`url(#tx-clip-${uid})`"
      />
      <!-- PA label (ON only) -->
      <text v-if="isOn"
        :x="paLeft + (paRight - paLeft) * 0.38" :y="sigY - triH * 0.27"
        text-anchor="middle" dominant-baseline="middle"
        fill="#4a8eff" :font-size="h * 0.080"
        font-family="'Segoe UI', sans-serif" font-weight="700"
        :clip-path="`url(#tx-clip-${uid})`"
      >PA</text>

      <!-- Signal: PA apex → right connector (static when OFF) -->
      <line v-if="!isOn"
        :x1="paRight" :y1="sigY" :x2="w - connW" :y2="sigY"
        stroke="#1e3048" stroke-width="1.4" stroke-linecap="round" opacity="0.22"
        :clip-path="`url(#tx-clip-${uid})`"
      />

      <!-- ══════════════════════════════════════════════════════════════════
           PM OUTPUT — animated BPSK phase-modulated carrier (cyan)
           ════════════════════════════════════════════════════════════════ -->
      <template v-if="isOn && pmPathStr">
        <path
          :d="pmPathStr"
          fill="none"
          stroke="#00ccff"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          :filter="`url(#tx-pm-glow-${uid})`"
          :clip-path="`url(#tx-pm-clip-${uid})`"
        />
      </template>

      <!-- ── Temperature (bottom-right) ─────────────────────────────────── -->
      <text :x="px + pw - pw*0.025" :y="py + ph - ph*0.10"
        text-anchor="end" dominant-baseline="middle"
        :fill="tempColor" :font-size="tempFontSize"
        font-weight="700" font-family="'Digital7', 'Courier New', monospace"
        :clip-path="`url(#tx-clip-${uid})`"
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
// MOD 30% | Mixer 26% | PA 20% | PM output 24%
const modZoneW = computed(() => pw.value * 0.30);
const mixZoneW = computed(() => pw.value * 0.26);
const paZoneW  = computed(() => pw.value * 0.20);

const divX1 = computed(() => px.value + modZoneW.value);
const divX2 = computed(() => px.value + modZoneW.value + mixZoneW.value);

// ── Signal axis ───────────────────────────────────────────────────────────
const sigY = computed(() => py.value + ph.value * 0.57);

// ── MOD block geometry ────────────────────────────────────────────────────
const modBlockX     = computed(() => px.value + modZoneW.value * 0.28);
const modBlockW     = computed(() => modZoneW.value * 0.68);
const modBlockRight = computed(() => modBlockX.value + modBlockW.value);

const modLeftThirdX  = computed(() => modBlockX.value + modBlockW.value * 0.04);
const modLeftThirdW  = computed(() => modBlockW.value * 0.34);
const modMidX        = computed(() => modBlockX.value + modBlockW.value * 0.42);
const modRightThirdX = computed(() => modBlockX.value + modBlockW.value * 0.62);
const modRightThirdW = computed(() => modBlockW.value * 0.34);

// ── Baseband envelope (left third of MOD — INPUT side) ───────────────────
// Single smooth bump: represents the baseband data envelope going into MOD
const modEnvelopePath = computed(() => {
  const x0  = modLeftThirdX.value;
  const w3  = modLeftThirdW.value;
  const cy  = sigY.value;
  const amp = ph.value * 0.13;
  const xm  = x0 + w3 * 0.5;
  const x2  = x0 + w3;
  return (
    `M ${x0.toFixed(1)},${cy.toFixed(1)} ` +
    `C ${(x0 + w3*0.25).toFixed(1)},${(cy - amp).toFixed(1)} ${(xm - w3*0.1).toFixed(1)},${(cy - amp).toFixed(1)} ${xm.toFixed(1)},${(cy - amp).toFixed(1)} ` +
    `C ${(xm + w3*0.1).toFixed(1)},${(cy - amp).toFixed(1)} ${(x2 - w3*0.25).toFixed(1)},${(cy - amp).toFixed(1)} ${x2.toFixed(1)},${cy.toFixed(1)}`
  );
});

// ── Arrow inside MOD ──────────────────────────────────────────────────────
const modArrowX1   = computed(() => modMidX.value);
const modArrowX2   = computed(() => modMidX.value + modBlockW.value * 0.12);
const modArrowHead = computed(() => {
  const tip  = modArrowX2.value + modBlockW.value * 0.04;
  const base = modArrowX2.value;
  const hh   = ph.value * 0.05;
  const cy   = sigY.value;
  return `${base},${(cy - hh).toFixed(1)} ${tip.toFixed(1)},${cy.toFixed(1)} ${base},${(cy + hh).toFixed(1)}`;
});

// ── Carrier sine wave (right third of MOD — OUTPUT side, 2 cycles) ───────
const modCarrierPath = computed(() => {
  const x0  = modRightThirdX.value;
  const w3  = modRightThirdW.value;
  const cy  = sigY.value;
  const amp = ph.value * 0.09;
  const cw  = w3 / 2;
  const c   = cw * 0.5;
  const x1 = x0, x2 = x0 + cw, x3 = x0 + cw * 2;
  return (
    `M ${x1.toFixed(1)},${cy.toFixed(1)} ` +
    `C ${(x1+c).toFixed(1)},${(cy-amp).toFixed(1)} ${(x2-c).toFixed(1)},${(cy+amp).toFixed(1)} ${x2.toFixed(1)},${cy.toFixed(1)} ` +
    `C ${(x2+c).toFixed(1)},${(cy-amp).toFixed(1)} ${(x3-c).toFixed(1)},${(cy+amp).toFixed(1)} ${x3.toFixed(1)},${cy.toFixed(1)}`
  );
});

// ── Mixer geometry ────────────────────────────────────────────────────────
const mixerR  = computed(() => ph.value * 0.195);
const mixerCx = computed(() => px.value + modZoneW.value + mixZoneW.value * 0.50);
const mixerCy = computed(() => sigY.value);

// ── PA triangle (right-pointing, in right PA zone) ────────────────────────
const paLeft  = computed(() => divX2.value + paZoneW.value * 0.08);
const paRight = computed(() => divX2.value + paZoneW.value * 0.88);
const triH    = computed(() => ph.value * 0.46);
const paTopY  = computed(() => sigY.value - triH.value / 2);
const paBotY  = computed(() => sigY.value + triH.value / 2);

const paPoints = computed(() =>
  `${paLeft.value.toFixed(1)},${paTopY.value.toFixed(1)} ` +
  `${paLeft.value.toFixed(1)},${paBotY.value.toFixed(1)} ` +
  `${paRight.value.toFixed(1)},${sigY.value.toFixed(1)}`
);

// ── PCM input zone (left connector → inside MOD left portion) ─────────────
const pcmInStartX = computed(() => connW.value);
const pcmInEndX   = computed(() => modBlockX.value + modBlockW.value * 0.42);

// ── PM output zone (PA apex → right connector) ───────────────────────────
const pmStartX = computed(() => paRight.value);
const pmEndX   = computed(() => w.value - connW.value);

// ── PCM bit pattern (shared by both animations) ───────────────────────────
const PCM_BITS    = [1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 0, 1];
const PCM_SPEED   = 2.8;   // bits per second
const N_VIS_PCM   = 3;     // bits visible in PCM input zone
// PM carrier: 6 cycles across the PM output zone; 3 bits visible per frame
const N_VIS_PM    = 3;     // data bits visible in PM output zone
const N_CARRIER   = 6;     // carrier cycles across PM output zone

const pcmPathStr = ref<string>('');
const pmPathStr  = ref<string>('');

// ── PCM input path (scrolling square wave entering MOD from left) ─────────
function buildPcmPath(): string {
  const sx     = pcmInStartX.value;
  const ex     = pcmInEndX.value;
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

// ── PM output path (BPSK phase-modulated carrier) ─────────────────────────
// Same PCM bit pattern drives the phase: bit=0 → phase 0, bit=1 → phase π
// Result: carrier shows phase reversals at data transitions (BPSK-like).
function buildPmPath(): string {
  const sx     = pmStartX.value;
  const ex     = pmEndX.value;
  const availW = ex - sx;
  if (availW <= 4) return '';

  const N   = 120;
  const cy  = sigY.value;
  const amp = ph.value * 0.13;

  const frac = _phase % 1;
  const base = Math.floor(_phase);

  let path = '';

  for (let i = 0; i <= N; i++) {
    const u = i / N; // 0..1 across PM zone
    const x = sx + u * availW;

    // Which data bit controls the phase at this position
    const bitU   = u * N_VIS_PM + frac;
    const bitIdx = ((base + Math.floor(bitU)) % PCM_BITS.length + PCM_BITS.length) % PCM_BITS.length;
    const bitVal = PCM_BITS[bitIdx];

    // Carrier: N_CARRIER cycles across zone, scrolling rightward toward output
    const carrierArg = (u * N_CARRIER - _phase) * 2 * Math.PI;

    // BPSK: π phase shift for bit=1, 0 for bit=0
    const phShift = bitVal === 1 ? Math.PI : 0;

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
    _phase = (_phase + dt * PCM_SPEED) % PCM_BITS.length;
    pcmPathStr.value = buildPcmPath();
    pmPathStr.value  = buildPmPath();
  } else {
    _phase = 0;
    pcmPathStr.value = '';
    pmPathStr.value  = '';
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
