<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <!--
      ACMU — Atomic Clock Management Unit — 280×160 viewBox.
      Used in NVS/IRNSS satellites.
      Four atomic clock inputs → Phase Meter (stability comparison) → 10.023 MHz output.

      Ports:
        CLK1  left  yRatio 0.22   CLK2  left  yRatio 0.40
        CLK3  left  yRatio 0.58   CLK4  left  yRatio 0.76
        OUT   right yRatio 0.50   (10.023 MHz synthesised reference)

      Animations (ON):
        • CLK1–4 input zone : static sine waves (clock signals)
        • Phase meter screen : animated REF vs DUT comparison + Δφ reading
        • Output zone        : scrolling 10.023 MHz carrier
    -->
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`"
         xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <!-- Chassis -->
        <linearGradient :id="`ac-rim-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#c8c8da"/>
          <stop offset="22%"  stop-color="#686878"/>
          <stop offset="48%"  stop-color="#e4e4f2"/>
          <stop offset="76%"  stop-color="#565666"/>
          <stop offset="100%" stop-color="#b8b8ca"/>
        </linearGradient>
        <linearGradient :id="`ac-body-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#0e1828"/>
          <stop offset="100%" stop-color="#060e18"/>
        </linearGradient>
        <linearGradient :id="`ac-sheen-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#fff" stop-opacity="0.06"/>
          <stop offset="40%"  stop-color="#fff" stop-opacity="0.02"/>
          <stop offset="100%" stop-color="#000" stop-opacity="0.14"/>
        </linearGradient>
        <!-- Inner panel -->
        <radialGradient :id="`ac-panel-off-${uid}`" cx="50%" cy="45%" r="65%">
          <stop offset="0%"   stop-color="#14182e"/>
          <stop offset="100%" stop-color="#06080e"/>
        </radialGradient>
        <radialGradient :id="`ac-panel-on-${uid}`" cx="40%" cy="38%" r="70%">
          <stop offset="0%"   stop-color="#0a1a30"/>
          <stop offset="60%"  stop-color="#060e20"/>
          <stop offset="100%" stop-color="#020810"/>
        </radialGradient>
        <!-- Phase meter block -->
        <radialGradient :id="`ac-pm-off-${uid}`" cx="50%" cy="50%" r="70%">
          <stop offset="0%"   stop-color="#141020"/>
          <stop offset="100%" stop-color="#060810"/>
        </radialGradient>
        <radialGradient :id="`ac-pm-on-${uid}`" cx="35%" cy="35%" r="68%">
          <stop offset="0%"   stop-color="#1a0a40"/>
          <stop offset="100%" stop-color="#080020"/>
        </radialGradient>
        <!-- Freq synth block -->
        <radialGradient :id="`ac-fs-off-${uid}`" cx="50%" cy="50%" r="70%">
          <stop offset="0%"   stop-color="#0a1020"/>
          <stop offset="100%" stop-color="#040810"/>
        </radialGradient>
        <radialGradient :id="`ac-fs-on-${uid}`" cx="35%" cy="35%" r="68%">
          <stop offset="0%"   stop-color="#001a3a"/>
          <stop offset="100%" stop-color="#000810"/>
        </radialGradient>
        <!-- CLK connectors (left, metallic) -->
        <linearGradient :id="`ac-lconn-${uid}`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#3a5a7a"/>
          <stop offset="50%"  stop-color="#5a7a9a"/>
          <stop offset="100%" stop-color="#2a4a6a"/>
        </linearGradient>
        <!-- OUT connector (right) -->
        <linearGradient :id="`ac-rconn-${uid}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#5a7a9a"/>
          <stop offset="50%"  stop-color="#2a4a6a"/>
          <stop offset="100%" stop-color="#1a2a3a"/>
        </linearGradient>
        <!-- Glow filters -->
        <filter :id="`ac-glow-${uid}`" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="2.0" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter :id="`ac-out-glow-${uid}`" x="-10%" y="-120%" width="120%" height="340%">
          <feGaussianBlur stdDeviation="1.4" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <!-- Inner panel clip -->
        <clipPath :id="`ac-panel-clip-${uid}`">
          <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"/>
        </clipPath>
        <!-- Phase meter screen clip -->
        <clipPath :id="`ac-pm-clip-${uid}`">
          <rect :x="pmScreenX" :y="pmScreenY" :width="pmScreenW" :height="pmScreenH" rx="1"/>
        </clipPath>
        <!-- CLK zone clip -->
        <clipPath :id="`ac-clk-clip-${uid}`">
          <rect :x="leftConnW" :y="py" :width="divX1 - leftConnW" :height="ph"/>
        </clipPath>
        <!-- Output carrier clip -->
        <clipPath :id="`ac-out-clip-${uid}`">
          <rect
            :x="outStartX" :y="h * 0.50 - ph * 0.18"
            :width="outEndX - outStartX" :height="ph * 0.36"/>
        </clipPath>
      </defs>

      <!-- ── Chassis ─────────────────────────────────────────────────────── -->
      <rect x="1" y="1" :width="w-2" :height="h-2"
        :rx="cr" :fill="`url(#ac-body-${uid})`"
        :stroke="`url(#ac-rim-${uid})`" :stroke-width="rw"
      />
      <rect :x="rw*0.5" :y="rw*0.5" :width="w-rw" :height="h-rw"
        :rx="cr*0.8" :fill="`url(#ac-sheen-${uid})`" pointer-events="none"
      />

      <!-- ── CLK Input Connectors (4 × left side) ───────────────────────── -->
      <template v-for="(clkY, i) in clkYs" :key="`conn-${i}`">
        <rect
          :x="0" :y="clkY - leftConnH * 0.5"
          :width="leftConnW" :height="leftConnH" :rx="leftConnH * 0.25"
          :fill="`url(#ac-lconn-${uid})`"
          stroke="#1e3a5a" :stroke-width="w * 0.006"
        />
        <circle :cx="leftConnW * 0.72" :cy="clkY"
          :r="leftConnH * 0.22"
          fill="#0d1117" stroke="#6080a0" stroke-width="0.9"
        />
      </template>

      <!-- ── OUT Connector (right side) ────────────────────────────────────── -->
      <rect :x="w - rightConnW" :y="h/2 - rightConnH/2"
        :width="rightConnW" :height="rightConnH" :rx="rightConnW * 0.35"
        :fill="`url(#ac-rconn-${uid})`" stroke="#1e3a5a" :stroke-width="w * 0.007"
      />
      <circle :cx="w - rightConnW * 0.4" :cy="h/2" :r="rightConnH * 0.22"
        fill="#0d1117" stroke="#8090a0" stroke-width="1.2"
      />

      <!-- ── Inner panel ─────────────────────────────────────────────────── -->
      <rect :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        :fill="isOn ? `url(#ac-panel-on-${uid})` : `url(#ac-panel-off-${uid})`"
        stroke="#06080e" :stroke-width="rw * 0.4"
      />
      <!-- Accent border when ON -->
      <rect v-if="isOn && !d.isInvalid" :x="px" :y="py" :width="pw" :height="ph" :rx="pr"
        fill="none" stroke="#00aaff" :stroke-width="rw * 0.3" opacity="0.16"
      />

      <!-- Clock-present LED -->
      <circle
        :cx="px + pw * 0.12"
        :cy="py + ph * 0.075"
        :r="Math.max(3.1, h * 0.024)"
        :fill="clockPresent ? '#32ff86' : '#ff9800'"
        :stroke="clockPresent ? '#d8ffe8' : '#ffe2b6'"
        stroke-width="1"
        :filter="isOn && clockPresent ? `url(#ac-glow-${uid})` : ''"
      />
      <text
        :x="px + pw * 0.17"
        :y="py + ph * 0.078"
        dominant-baseline="middle"
        :fill="clockPresent ? '#89ffb8' : '#ffbd73'"
        :font-size="Math.max(6, h * 0.045)"
        font-family="'Segoe UI', sans-serif"
        font-weight="700"
      >CLK</text>

      <!-- ══════════════════════════════════════════════════════════════════
           CLK INPUT ZONE — 4 clock signal paths with static sine waves
           ════════════════════════════════════════════════════════════════ -->
      <template v-for="(clkY, i) in clkYs" :key="`clk-${i}`">
        <!-- Signal path line -->
        <line
          :x1="leftConnW" :y1="clkY" :x2="divX1" :y2="clkY"
          :stroke="clkStroke(i)"
          stroke-width="1.2" stroke-linecap="round"
          :opacity="isOn ? 0.55 : 0.18"
          :clip-path="`url(#ac-clk-clip-${uid})`"
        />
        <!-- Clock sine wave overlay (when ON) -->
        <path v-if="isOn"
          :d="clkSinePaths[i]"
          fill="none" :stroke="clkWaveStroke(i)" stroke-width="1.5" stroke-linecap="round"
          opacity="0.90"
          :clip-path="`url(#ac-clk-clip-${uid})`"
        />
      </template>

      <!-- ── Divider 1: CLK | Phase Meter ──────────────────────────────── -->
      <line :x1="divX1" :y1="py + ph*0.04" :x2="divX1" :y2="py + ph*0.96"
        stroke="#1a2a3a" stroke-width="1" opacity="0.45"
        :clip-path="`url(#ac-panel-clip-${uid})`"
      />

      <!-- ══════════════════════════════════════════════════════════════════
           PHASE METER BLOCK — compares 4 atomic clocks for stability
           ════════════════════════════════════════════════════════════════ -->

      <!-- Phase meter outer block -->
      <rect
        :x="pmBlockX" :y="pmBlockY" :width="pmBlockW" :height="pmBlockH" :rx="ph * 0.04"
        :fill="isOn ? `url(#ac-pm-on-${uid})` : `url(#ac-pm-off-${uid})`"
        :stroke="phaseMeterBorderStroke"
        stroke-width="1.4"
        :filter="isOn && !d.isInvalid ? `url(#ac-glow-${uid})` : ''"
        :clip-path="`url(#ac-panel-clip-${uid})`"
      />

      <!-- "PHASE METER" header inside block -->
      <text
        :x="pmBlockX + pmBlockW * 0.50" :y="pmBlockY + pmBlockH * 0.12"
        text-anchor="middle" dominant-baseline="middle"
        :fill="isOn ? '#aa88ff' : '#2a1a40'" :font-size="pmHeaderFontSize"
        font-family="'Segoe UI', sans-serif" font-weight="700" letter-spacing="0.8"
        :clip-path="`url(#ac-panel-clip-${uid})`"
      >PHASE METER</text>

      <!-- Phase meter screen (inner display) -->
      <rect
        :x="pmScreenX" :y="pmScreenY" :width="pmScreenW" :height="pmScreenH" rx="2"
        :fill="isOn ? '#05020e' : '#0a0810'"
        :stroke="isOn ? '#5533aa' : '#140a28'"
        stroke-width="0.8"
        :clip-path="`url(#ac-panel-clip-${uid})`"
      />

      <!-- REF waveform label -->
      <text v-if="isOn"
        :x="pmScreenX + pmScreenW * 0.08" :y="pmScreenY + pmScreenH * 0.18"
        dominant-baseline="middle"
        fill="#00ccff" :font-size="pmLabelFontSize"
        font-family="'Segoe UI', sans-serif" font-weight="700"
        :clip-path="`url(#ac-pm-clip-${uid})`"
      >REF</text>

      <!-- REF sine curve (static cyan, upper half of screen) -->
      <path v-if="isOn"
        :d="pmRefPath"
        fill="none" stroke="#00ccff" stroke-width="1.2" stroke-linecap="round"
        opacity="0.90"
        :clip-path="`url(#ac-pm-clip-${uid})`"
      />

      <!-- DUT waveform label -->
      <text v-if="isOn"
        :x="pmScreenX + pmScreenW * 0.08" :y="pmScreenY + pmScreenH * 0.68"
        dominant-baseline="middle"
        fill="#ffaa00" :font-size="pmLabelFontSize"
        font-family="'Segoe UI', sans-serif" font-weight="700"
        :clip-path="`url(#ac-pm-clip-${uid})`"
      >DUT</text>

      <!-- DUT sine curve (animated amber, lower half of screen, phase-drifting) -->
      <path v-if="isOn && dutPath"
        :d="dutPath"
        fill="none" stroke="#ffaa00" stroke-width="1.2" stroke-linecap="round"
        opacity="0.90"
        :clip-path="`url(#ac-pm-clip-${uid})`"
      />

      <!-- Animated phase cursor (vertical line sweeping across screen) -->
      <line v-if="isOn"
        :x1="phaseCursorX" :y1="pmScreenY + 2"
        :x2="phaseCursorX" :y2="pmScreenY + pmScreenH - 2"
        stroke="#44ff88" stroke-width="0.9" stroke-dasharray="2,2" opacity="0.70"
        :clip-path="`url(#ac-pm-clip-${uid})`"
      />

      <!-- Δφ reading below screen -->
      <text v-if="isOn"
        :x="pmBlockX + pmBlockW * 0.50" :y="pmBlockY + pmBlockH * 0.88"
        text-anchor="middle" dominant-baseline="middle"
        fill="#44ff88" :font-size="pmReadingFontSize"
        font-family="'Courier New', monospace" font-weight="700"
        :clip-path="`url(#ac-panel-clip-${uid})`"
      >Ts = {{ samplingTimeText }}</text>
      <text v-if="!isOn"
        :x="pmBlockX + pmBlockW * 0.50" :y="pmBlockY + pmBlockH * 0.52"
        text-anchor="middle" dominant-baseline="middle"
        fill="#2a1a40" :font-size="pmHeaderFontSize"
        font-family="'Segoe UI', sans-serif"
        :clip-path="`url(#ac-panel-clip-${uid})`"
      >STANDBY</text>

      <!-- ── Divider 2: Phase Meter | Freq Synth ────────────────────────── -->
      <line :x1="divX2" :y1="py + ph*0.04" :x2="divX2" :y2="py + ph*0.96"
        stroke="#1a2a3a" stroke-width="1" opacity="0.45"
        :clip-path="`url(#ac-panel-clip-${uid})`"
      />

      <!-- ══════════════════════════════════════════════════════════════════
           FREQUENCY SYNTHESISER BLOCK — 10.023 MHz output
           ════════════════════════════════════════════════════════════════ -->

      <!-- Freq synth outer block -->
      <rect
        :x="freqBlockX" :y="freqBlockY" :width="freqBlockW" :height="freqBlockH" :rx="ph * 0.04"
        :fill="isOn ? `url(#ac-fs-on-${uid})` : `url(#ac-fs-off-${uid})`"
        :stroke="ocxoBorderStroke"
        stroke-width="1.4"
        :filter="isOn && !d.isInvalid ? `url(#ac-glow-${uid})` : ''"
        :clip-path="`url(#ac-panel-clip-${uid})`"
      />

      <!-- "OCXO" header inside freq block -->
      <text
        :x="freqBlockX + freqBlockW * 0.50" :y="freqBlockY + freqBlockH * 0.12"
        text-anchor="middle" dominant-baseline="middle"
        :fill="isOn ? '#44aaff' : '#0a2040'" :font-size="freqOcxoFontSize"
        font-family="'Segoe UI', sans-serif" font-weight="700" letter-spacing="1.2"
        :clip-path="`url(#ac-panel-clip-${uid})`"
      >OCXO</text>

      <!-- Frequency value — large -->
      <text
        :x="freqBlockX + freqBlockW * 0.50" :y="freqBlockY + freqBlockH * 0.40"
        text-anchor="middle" dominant-baseline="middle"
        :fill="isOn ? '#00eeff' : '#0a2a3a'" :font-size="freqValueFontSize"
        font-family="'Courier New', monospace" font-weight="700" letter-spacing="0.4"
        :clip-path="`url(#ac-panel-clip-${uid})`"
      >10.023</text>

      <!-- MHz label -->
      <text
        :x="freqBlockX + freqBlockW * 0.50" :y="freqBlockY + freqBlockH * 0.62"
        text-anchor="middle" dominant-baseline="middle"
        :fill="isOn ? '#0088ff' : '#0a1a2a'" :font-size="freqUnitFontSize"
        font-family="'Segoe UI', sans-serif" font-weight="700" letter-spacing="1.2"
        :clip-path="`url(#ac-panel-clip-${uid})`"
      >MHz</text>

      <!-- Static sine icon inside freq block (bottom) -->
      <path :d="freqSineIcon"
        fill="none" :stroke="isOn ? '#0066cc' : '#0a1428'"
        stroke-width="1.0" stroke-linecap="round"
        :opacity="isOn ? 0.65 : 0.20"
        :clip-path="`url(#ac-panel-clip-${uid})`"
      />

      <!-- Signal line: freq block → output zone (when ON) -->
      <line v-if="!isOn"
        :x1="freqBlockX + freqBlockW" :y1="h * 0.50"
        :x2="w - rightConnW" :y2="h * 0.50"
        stroke="#0a1428" stroke-width="1.4" opacity="0.22"
        :clip-path="`url(#ac-panel-clip-${uid})`"
      />

      <!-- Animated 10.023 MHz output carrier -->
      <template v-if="isOn && outCarrierPath">
        <path
          :d="outCarrierPath"
          fill="none" :stroke="outCarrierStroke" stroke-width="1.8"
          stroke-linecap="round" stroke-linejoin="round"
          :filter="`url(#ac-out-glow-${uid})`"
          :clip-path="`url(#ac-out-clip-${uid})`"
        />
      </template>

      <!-- ── Title (rendered last so it sits on top of all blocks) ────────── -->
      <SvgMultilineText v-if="titleText"
        :text="titleText" :x="titleX" :y="titleY"
        :font-size="titleFontSz" font-weight="700" letter-spacing="1.4"
        font-family="'Courier New', monospace"
        :fill="titleFontColor" :text-anchor="titleAnchor"
        :clip-path="`url(#ac-panel-clip-${uid})`"
      />

      <!-- ── Temperature (bottom-right) ─────────────────────────────────── -->
      <text :x="px + pw - pw*0.022" :y="py + ph - ph*0.075"
        text-anchor="end" dominant-baseline="middle"
        :fill="tempColor" :font-size="tempFontSize"
        font-weight="700" font-family="'Digital7', 'Courier New', monospace"
        :clip-path="`url(#ac-panel-clip-${uid})`"
      >{{ tempText }}</text>

      <!-- ── Invalid overlay ─────────────────────────────────────────────── -->
      <rect v-if="d.isInvalid" x="1" y="1" :width="w-2" :height="h-2"
        fill="rgba(231,76,60,0.18)" :rx="cr"
        stroke="#e74c3c" :stroke-width="rw*0.5" stroke-dasharray="8,5"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useNodeData } from "./useNodeData";
import SvgMultilineText from "./SvgMultilineText.vue";
import { useTitlePosition } from "./useTitlePosition";

const { d, w, h } = useNodeData(280, 160);
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

// ── Left CLK connectors ───────────────────────────────────────────────────
const leftConnW = computed(() => rw.value * 1.7);
const leftConnH = computed(() => h.value * 0.085);

// ── Right OUT connector ───────────────────────────────────────────────────
const rightConnW = computed(() => rw.value * 1.8);
const rightConnH = computed(() => h.value * 0.22);

// ── CLK signal Y positions (matched to port yRatios) ─────────────────────
const CLK_Y_RATIOS = [0.22, 0.40, 0.58, 0.76];
const clkYs = computed(() => CLK_Y_RATIOS.map(r => h.value * r));

// ── Layout zone boundaries ────────────────────────────────────────────────
// CLK zone: 23% | Phase Meter: 40% | Freq Synth: 37%
const clkZoneW  = computed(() => pw.value * 0.23);
const phZoneW   = computed(() => pw.value * 0.40);

const divX1 = computed(() => px.value + clkZoneW.value);
const divX2 = computed(() => px.value + clkZoneW.value + phZoneW.value);

// ── CLK sine wave geometry ────────────────────────────────────────────────
const clkAmp = computed(() => (clkYs.value[1] - clkYs.value[0]) * 0.26);
const clkSinePaths = computed(() => {
  const x0 = leftConnW.value;
  const x1 = divX1.value;
  const N  = 40;
  const cycles = 2;
  return clkYs.value.map(cy => {
    let path = '';
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const x = x0 + u * (x1 - x0);
      const y = cy - clkAmp.value * Math.sin(u * cycles * 2 * Math.PI);
      if (i === 0) path = `M ${x.toFixed(2)},${y.toFixed(2)}`;
      else         path += ` L ${x.toFixed(2)},${y.toFixed(2)}`;
    }
    return path;
  });
});
function normalizeClockSelection(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  if (Number.isFinite(n)) {
    const i = Math.round(n);
    return i >= 1 && i <= 4 ? i : null;
  }
  const s = String(raw).trim().toUpperCase();
  const m = s.match(/(?:CLK\s*)?([1-4])/);
  if (!m) return null;
  const i = Number(m[1]);
  return i >= 1 && i <= 4 ? i : null;
}

const referenceClockIndex = computed(() => normalizeClockSelection(d.value.referenceInputClock));
const phaseMeterClockIndex = computed(() => normalizeClockSelection(d.value.phaseMeterInputClock));

function isSelectedClock(zeroBasedIdx: number): boolean {
  const oneBased = zeroBasedIdx + 1;
  return referenceClockIndex.value === oneBased || phaseMeterClockIndex.value === oneBased;
}

function clkStroke(zeroBasedIdx: number): string {
  if (!isOn.value) return "#1e3a5a";
  return isSelectedClock(zeroBasedIdx) ? "#2bff7f" : "#00aaff";
}

function clkWaveStroke(zeroBasedIdx: number): string {
  if (!isOn.value) return "#1e3a5a";
  return isSelectedClock(zeroBasedIdx) ? "#2bff7f" : "#00aaff";
}

function parseLockState(raw: unknown): boolean {
  if (raw === true || raw === 1) return true;
  if (raw === false || raw === 0 || raw === null || raw === undefined) return false;
  const s = String(raw).trim().toUpperCase();
  if (!s) return false;
  return s === "LOCKED" || s === "ON" || s === "TRUE" || s === "1" || s === "YES";
}

const ocxoLocked = computed(() => parseLockState(d.value.synthesizerLockStatus));
const phaseMeterLocked = computed(() => parseLockState(d.value.phaseMeterLockStatus));
const ocxoBorderStroke = computed(() => {
  if (!isOn.value) return "#0a1428";
  return ocxoLocked.value ? "#27ae60" : "#ff9800";
});
const outCarrierStroke = computed(() => {
  if (!isOn.value) return "#00eeff";
  return ocxoLocked.value ? "#27ae60" : "#ff9800";
});
const phaseMeterBorderStroke = computed(() => {
  if (!isOn.value) return "#1a0a30";
  return phaseMeterLocked.value ? "#27ae60" : "#ff9800";
});

function parseClockPresent(raw: unknown): boolean {
  if (raw === true || raw === 1) return true;
  if (raw === false || raw === 0 || raw === null || raw === undefined) return false;
  const s = String(raw).trim().toUpperCase();
  if (!s) return false;
  return s === "ON" || s === "TRUE" || s === "1" || s === "YES" || s === "PRESENT" || s === "AVAILABLE";
}

const clockPresent = computed(() => parseClockPresent(d.value.clockPresent));

// ── Phase Meter block ─────────────────────────────────────────────────────
const pmBlockX = computed(() => divX1.value + phZoneW.value * 0.04);
const pmBlockY = computed(() => py.value + ph.value * 0.13);
const pmBlockW = computed(() => phZoneW.value * 0.92);
const pmBlockH = computed(() => ph.value * 0.80);

const pmHeaderFontSize  = computed(() => Math.max(6, h.value * 0.068));
const pmLabelFontSize   = computed(() => Math.max(5, h.value * 0.058));
const pmReadingFontSize = computed(() => Math.max(6, h.value * 0.072));

// Phase meter screen (inner oscilloscope-like display)
const pmScreenX = computed(() => pmBlockX.value + pmBlockW.value * 0.06);
const pmScreenY = computed(() => pmBlockY.value + pmBlockH.value * 0.22);
const pmScreenW = computed(() => pmBlockW.value * 0.88);
const pmScreenH = computed(() => pmBlockH.value * 0.54);

// REF waveform — static cyan, upper half of screen
const pmRefPath = computed(() => {
  const x0  = pmScreenX.value + pmScreenW.value * 0.04;
  const bw  = pmScreenW.value * 0.92;
  const cy  = pmScreenY.value + pmScreenH.value * 0.28;
  const amp = pmScreenH.value * 0.18;
  const N   = 60;
  let path  = '';
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = x0 + u * bw;
    const y = cy - amp * Math.sin(u * 3 * 2 * Math.PI);
    if (i === 0) path = `M ${x.toFixed(2)},${y.toFixed(2)}`;
    else         path += ` L ${x.toFixed(2)},${y.toFixed(2)}`;
  }
  return path;
});

// ── Freq Synth block ──────────────────────────────────────────────────────
const freqZoneW   = computed(() => pw.value * 0.37);
const freqBlockX  = computed(() => divX2.value + freqZoneW.value * 0.06);
const freqBlockY  = computed(() => py.value + ph.value * 0.13);
const freqBlockW  = computed(() => freqZoneW.value * 0.68);
const freqBlockH  = computed(() => ph.value * 0.74);

const freqValueFontSize = computed(() => Math.max(8, h.value * 0.115));
const freqUnitFontSize  = computed(() => Math.max(6, h.value * 0.080));
const freqOcxoFontSize  = computed(() => Math.max(6, h.value * 0.070));
const samplingTimeText = computed(() => {
  const raw = Number(d.value.samplingTime);
  if (!Number.isFinite(raw)) return "--.-";
  return raw.toFixed(1);
});

// Static sine icon inside freq block (bottom decoration)
const freqSineIcon = computed(() => {
  const x0  = freqBlockX.value + freqBlockW.value * 0.08;
  const bw  = freqBlockW.value * 0.84;
  const cy  = freqBlockY.value + freqBlockH.value * 0.82;
  const amp = freqBlockH.value * 0.060;
  const N   = 40;
  let path  = '';
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = x0 + u * bw;
    const y = cy - amp * Math.sin(u * 3 * 2 * Math.PI);
    if (i === 0) path = `M ${x.toFixed(2)},${y.toFixed(2)}`;
    else         path += ` L ${x.toFixed(2)},${y.toFixed(2)}`;
  }
  return path;
});

// ── Output carrier zone ───────────────────────────────────────────────────
const outStartX = computed(() => freqBlockX.value + freqBlockW.value);
const outEndX   = computed(() => w.value - rightConnW.value);

// ── Font sizes ────────────────────────────────────────────────────────────
const tempFontSize = computed(() => h.value * 0.195);

// ── Animation reactive refs ───────────────────────────────────────────────
const dutPath       = ref<string>('');
const outCarrierPath = ref<string>('');
const phaseCursorX  = ref<number>(0);

// ── rAF state ─────────────────────────────────────────────────────────────
let _rafId     = 0;
let _lastT     = 0;
let _phase     = 0;   // drives output carrier scrolling
let _indicator = 0;   // drives phase meter animation (slow)

const CARRIER_SPEED   = 4.5;   // visual scrolling speed for 10.023 MHz output
const N_CARRIER       = 5;     // cycles in output zone
const INDICATOR_SPEED = 0.45;  // rad/s — phase measurement sweep rate

function buildDutPath(indicatorPhase: number): string {
  const x0  = pmScreenX.value + pmScreenW.value * 0.04;
  const bw  = pmScreenW.value * 0.92;
  const cy  = pmScreenY.value + pmScreenH.value * 0.72;
  const amp = pmScreenH.value * 0.18;
  // DUT phase slowly drifts — simulates phase comparison
  const dutPhaseOffset = Math.sin(indicatorPhase * 0.7) * 0.60;
  const N = 60;
  let path = '';
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = x0 + u * bw;
    const y = cy - amp * Math.sin(u * 3 * 2 * Math.PI + dutPhaseOffset);
    if (i === 0) path = `M ${x.toFixed(2)},${y.toFixed(2)}`;
    else         path += ` L ${x.toFixed(2)},${y.toFixed(2)}`;
  }
  return path;
}

function buildOutCarrier(): string {
  const sx     = outStartX.value;
  const ex     = outEndX.value;
  const availW = ex - sx;
  if (availW <= 4) return '';

  const cy  = h.value * 0.50;
  const amp = ph.value * 0.12;
  const N   = 120;
  let path  = '';
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = sx + u * availW;
    const y = cy - amp * Math.sin((u * N_CARRIER - _phase) * 2 * Math.PI);
    if (i === 0) path = `M ${x.toFixed(2)},${y.toFixed(2)}`;
    else         path += ` L ${x.toFixed(2)},${y.toFixed(2)}`;
  }
  return path;
}

function tick(t: number) {
  if (_lastT === 0) _lastT = t;
  const dt = Math.min((t - _lastT) / 1000, 0.05);
  _lastT = t;

  if (isOn.value) {
    _phase     = (_phase     + dt * CARRIER_SPEED)   % 1000;
    _indicator = (_indicator + dt * INDICATOR_SPEED) % (2 * Math.PI * 100);

    // Phase cursor: always-forward sawtooth sweep (0 → 1, wrap, never reverse)
    // _indicator grows at INDICATOR_SPEED (0.45 rad/s); factor 0.75 → ~3 s per sweep
    const sweepFrac = (_indicator * 0.75) % 1.0;
    phaseCursorX.value = pmScreenX.value + sweepFrac * pmScreenW.value;

    dutPath.value      = buildDutPath(_indicator);
    outCarrierPath.value = buildOutCarrier();
  } else {
    _phase = 0;
    _indicator = 0;
    dutPath.value = '';
    outCarrierPath.value = '';
  }

  _rafId = requestAnimationFrame(tick);
}

onMounted(()   => { _rafId = requestAnimationFrame(tick); });
onUnmounted(() => { if (_rafId) cancelAnimationFrame(_rafId); });

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
