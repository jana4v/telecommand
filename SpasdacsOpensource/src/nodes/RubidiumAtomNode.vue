<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <!--
      Energy-state Rubidium Atomic Clock (200×140 fixed viewBox).
      Three hyperfine / optical levels: A (ground), B (upper hyperfine), C (excited optical).

      OFF       → no animation, electrons parked on level A, laser/detector dark.
      ON        → all electrons on level B, full bright beam source→detector.
      LOCK      → electrons cycle B→A→C→(rand A|B); beam fluctuates with absorption.
    -->
    <svg :width="w" :height="h" viewBox="0 0 200 150"
         xmlns="http://www.w3.org/2000/svg" overflow="visible">

      <defs>
        <!-- Metallic frame gradient -->
        <linearGradient :id="`rba-frame-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#a8a8b8"/>
          <stop offset="25%"  stop-color="#68687a"/>
          <stop offset="50%"  stop-color="#d8d8e8"/>
          <stop offset="75%"  stop-color="#68687a"/>
          <stop offset="100%" stop-color="#a8a8b8"/>
        </linearGradient>
        <!-- Arrowhead for LOCK transition arrows — unique per instance -->
        <marker :id="`rba-arr-${uid}`"
                markerWidth="4.5" markerHeight="4.5" refX="3.5" refY="2.25" orient="auto">
          <path d="M 0 0 L 4.5 2.25 L 0 4.5 z" fill="#f0a030" opacity="0.80"/>
        </marker>
        <!-- Electron glow filter -->
        <filter :id="`rba-glow-${uid}`" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="1.6" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <!-- ── Outer frame ─────────────────────────────────────────────────── -->
      <rect x="1" y="1" width="198" height="148" rx="6" fill="#0d1117"
        :stroke="d.isInvalid ? '#e74c3c' : `url(#rba-frame-${uid})`"
        stroke-width="3"
      />

      <!-- ── Title — bound to node Name field ─────────────────────────────── -->
      <SvgMultilineText v-if="titleText"
        :text="titleText" :x="titleX" :y="titleY" :centered="false"
        :font-size="titleFontSz" font-weight="700" letter-spacing="1.5"
        font-family="'Courier New', monospace" :fill="titleFontColor" :text-anchor="titleAnchor"
      />

      <!-- ── Status LEDs ─────────────────────────────────────────────────── -->
      <!-- ON LED: lit whenever device is powered (ON or LOCK) -->
      <circle cx="18" cy="14" r="4.2"
        :fill="isPowered ? '#27ae60' : '#131e13'"
        :stroke="isPowered ? '#3dca80' : '#1e3020'" stroke-width="0.8"/>
      <text x="18" y="24" text-anchor="middle" font-size="5" fill="#6b7280">ON</text>

      <!-- LOCK LED: lit only when frequency lock acquired -->
      <circle cx="34" cy="14" r="4.2"
        :fill="isLocked ? '#d4860a' : '#1e1608'"
        :stroke="isLocked ? '#f0a030' : '#3a2a10'" stroke-width="0.8"/>
      <text x="34" y="24" text-anchor="middle" font-size="5" fill="#6b7280">LK</text>

      <!-- INV LED -->
      <circle cx="182" cy="14" r="4.2"
        :fill="d.isInvalid ? '#e74c3c' : '#1e0808'"
        :stroke="d.isInvalid ? '#ff6b6b' : '#3a1010'" stroke-width="0.8"/>
      <text x="182" y="24" text-anchor="middle" font-size="5" fill="#6b7280">INV</text>

      <!-- Title / body separator -->
      <line x1="7" y1="21" x2="193" y2="21"
            stroke="rgba(100,140,200,0.20)" stroke-width="0.7"/>

      <!-- ══════════════════════════════════════════════════════════════════ -->
      <!--  LASER SOURCE  (left block)                                       -->
      <!-- ══════════════════════════════════════════════════════════════════ -->
      <rect x="7" y="67" width="52" height="18" rx="3"
        :fill="isPowered ? '#081830' : '#0d0d1c'"
        :stroke="isPowered ? '#0088dd' : '#252535'" stroke-width="1.2"/>
      <!-- Laser label -->
      <text x="33" y="78" text-anchor="middle" dominant-baseline="middle"
            font-size="7" font-weight="700" font-family="monospace"
            :fill="isPowered ? '#00aaff' : '#28284a'">LASER</text>
      <!-- Output aperture glow -->
      <circle v-if="isPowered" cx="59" cy="76" r="2.8"
        :fill="beamColor" :opacity="0.65 + 0.30 * beamFlicker"/>

      <!-- Laser → cell short beam segment -->
      <rect v-if="isPowered" x="59" y="74.5" width="12" height="3" rx="1"
        :fill="beamColor" :opacity="0.50 + 0.40 * beamFlicker"/>

      <!-- ══════════════════════════════════════════════════════════════════ -->
      <!--  Rb CELL                                                          -->
      <!-- ══════════════════════════════════════════════════════════════════ -->
      <rect x="71" y="36" width="58" height="82" rx="4"
        fill="#060a10" :stroke="cellBorderColor" stroke-width="1.5"/>

      <!-- Cell label (top) -->
      <text x="100" y="46" text-anchor="middle" dominant-baseline="middle"
            font-size="5" fill="#334455" font-family="monospace" letter-spacing="1">
        Rb CELL
      </text>

      <!-- ── Energy levels ──────────────────────────────────────────────── -->
      <!-- Level C — excited optical state (top) -->
      <line x1="78" y1="56" x2="122" y2="56" :stroke="levelCColor" stroke-width="1.4" :opacity="0.75"/>
      <text x="125" y="59.5" font-size="6.5" font-weight="700"
            font-family="monospace" :fill="levelCColor" opacity="0.90">C</text>

      <!-- Level B — upper hyperfine (middle; aligns with beam) -->
      <line x1="78" y1="76" x2="122" y2="76" :stroke="levelBColor" stroke-width="1.4" :opacity="0.75"/>
      <text x="125" y="79.5" font-size="6.5" font-weight="700"
            font-family="monospace" :fill="levelBColor" opacity="0.90">B</text>

      <!-- Level A — lower hyperfine / ground (bottom) -->
      <line x1="78" y1="96" x2="122" y2="96" :stroke="levelAColor" stroke-width="1.4" :opacity="0.75"/>
      <text x="125" y="99.5" font-size="6.5" font-weight="700"
            font-family="monospace" :fill="levelAColor" opacity="0.90">A</text>

      <!-- ── Beam through cell (at level B = y 76) ──────────────────────── -->
      <rect v-if="isPowered" x="71" y="74.5" width="58" height="3" rx="0.5"
        :fill="beamColor" :opacity="cellBeamOpacity"/>

      <!-- ── Transition arrows (LOCK state only) ────────────────────────── -->
      <template v-if="isLocked">
        <!-- B → A (left side, curves down) -->
        <path :d="`M 85 74 Q 79 85 85 95`"
              fill="none" stroke="#f0a030" stroke-width="0.9"
              stroke-dasharray="2.2,1.5" opacity="0.62"
              :marker-end="`url(#rba-arr-${uid})`"/>
        <!-- A → C (left side, curves up) -->
        <path :d="`M 85 95 Q 77 76 85 57`"
              fill="none" stroke="#f0a030" stroke-width="0.9"
              stroke-dasharray="2.2,1.5" opacity="0.62"
              :marker-end="`url(#rba-arr-${uid})`"/>
        <!-- C → B (right side, short drop — spontaneous emission) -->
        <path :d="`M 115 56 Q 121 66 115 75`"
              fill="none" stroke="#c08828" stroke-width="0.8"
              stroke-dasharray="2,1.5" opacity="0.46"
              :marker-end="`url(#rba-arr-${uid})`"/>
        <!-- C → A (right side, longer drop — spontaneous emission) -->
        <path :d="`M 117 58 Q 125 76 117 95`"
              fill="none" stroke="#a07820" stroke-width="0.8"
              stroke-dasharray="2,1.5" opacity="0.34"
              :marker-end="`url(#rba-arr-${uid})`"/>
      </template>

      <!-- ── Electrons ───────────────────────────────────────────────────── -->
      <!-- Powered: animated electrons -->
      <template v-if="isPowered">
        <g v-for="(e, i) in electrons" :key="`rba-e-${i}`"
           :filter="`url(#rba-glow-${uid})`">
          <circle :cx="e.x" :cy="e.y" r="3.8" :fill="electronFill(e.state)" opacity="0.94"/>
          <!-- Specular highlight -->
          <circle :cx="e.x - 1" :cy="e.y - 1" r="1.2" fill="rgba(255,255,255,0.42)"/>
        </g>
      </template>
      <!-- OFF: dim electrons parked on level A -->
      <template v-else>
        <circle v-for="(ex, i) in ELECTRON_XS" :key="`rba-off-${i}`"
          :cx="ex" cy="88" r="3.5" fill="#1c2535" opacity="0.50"/>
      </template>

      <!-- ══════════════════════════════════════════════════════════════════ -->
      <!--  Cell → DETECTOR short segment                                    -->
      <!-- ══════════════════════════════════════════════════════════════════ -->
      <rect v-if="isPowered" x="129" y="74.5" width="12" height="3" rx="1"
        :fill="beamColor" :opacity="0.50 + 0.40 * beamFlicker"/>

      <!-- ══════════════════════════════════════════════════════════════════ -->
      <!--  PHOTODETECTOR  (right block)                                     -->
      <!-- ══════════════════════════════════════════════════════════════════ -->
      <rect x="141" y="67" width="52" height="18" rx="3"
        :fill="isPowered ? '#081812' : '#0d0d1c'"
        :stroke="isPowered ? '#27ae60' : '#252535'" stroke-width="1.2"/>
      <!-- Signal level fill bar -->
      <rect v-if="isPowered" x="142" y="68" :width="50 * detectorLevel" height="16" rx="2.5"
        :fill="isLocked ? '#d4860a' : '#27ae60'" opacity="0.20"/>
      <!-- Detector label -->
      <text x="167" y="78" text-anchor="middle" dominant-baseline="middle"
            font-size="7" font-weight="700" font-family="monospace"
            :fill="isPowered ? '#27ae60' : '#28284a'">DETECT</text>

      <!-- ── Temperature readout ─────────────────────────────────────────── -->
      <text x="193" y="145" text-anchor="end"
            :font-size="tempFontSz" font-weight="600"
            font-family="'Digital7','Courier New',monospace"
            :fill="!isPowered ? '#3a3a52' : isLocked ? '#d4860a' : '#00ccff'">
        {{ tempText }}
      </text>

    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useNodeData } from "./useNodeData";
import SvgMultilineText from "./SvgMultilineText.vue";
import { useTitlePosition } from "./useTitlePosition";

// ── Node data + size ──────────────────────────────────────────────────────────
const { d, w, h } = useNodeData(200, 150);
const uid = ref(Math.random().toString(36).slice(2, 8));

// ── Title + font sizes ────────────────────────────────────────────────────────
const titleText   = computed(() => (d.value.name   as string) ?? "");
const titleFontSz = computed(() => (d.value.titleFontSize as number) ?? 10);
const titleFontColor = computed(() => (d.value.titleFontColor as string) || "#c9d1d9");
const { titleX, titleY, titleAnchor } = useTitlePosition(
  () => d.value.titlePosition as string | undefined,
  () => 0,
  () => w.value,
  () => 0,
  () => h.value,
  "top-center",
);
const tempFontSz  = computed(() => (d.value.tempFontSize  as number) ?? 9);

// ── State ─────────────────────────────────────────────────────────────────────
// isPowered: position ≥ 1   (device on, regardless of lock status)
// isLocked:  isPowered AND isLocked flag (frequency lock acquired)
// isOn:      powered but NOT locked yet  (all electrons in B)
// OFF:       !isPowered → no animation, electrons on A
const isPowered = computed(() => ((d.value.position as number) ?? 0) > 0);
const isLocked  = computed(() => isPowered.value && !!(d.value.isLocked));
const isOn      = computed(() => isPowered.value && !isLocked.value);

// ── Colours ───────────────────────────────────────────────────────────────────
const beamColor      = computed(() => isLocked.value ? "#f0a030" : "#00ccff");
const cellBorderColor= computed(() => !isPowered.value ? "#1e2c3c" : isLocked.value ? "#c07820" : "#2a6aaa");
const levelAColor    = computed(() => isLocked.value ? "#f0a030" : "#3a6080");
const levelBColor    = computed(() => isLocked.value ? "#f0a030" : "#00aaff");
const levelCColor    = computed(() => isLocked.value ? "#f0a030" : "#3a6080");

// Beam opacity through cell: ON = full, LOCK = fluctuates with B population
const cellBeamOpacity = computed(() =>
  isLocked.value ? 0.30 + 0.55 * beamFlicker.value
  : isOn.value   ? 0.88
  : 0
);

// ── Electron data ─────────────────────────────────────────────────────────────
// Fixed x positions: 5 electrons spread across the cell width
const ELECTRON_XS = [82, 91, 100, 109, 118] as const;
const LEVEL_Y     = { A: 96, B: 76, C: 56 } as const;

// Transition durations (seconds)
const T_BA = 0.38;  // B→A: microwave stimulated transition
const T_AC = 0.48;  // A→C: optical pump (absorbs laser photon)
const T_CB = 0.55;  // C→A or C→B: spontaneous emission

interface Electron {
  state:     "A" | "B" | "C";
  nextState: "A" | "B" | "C" | null;
  progress:  number;   // 0–1 during transition
  timer:     number;   // wait time before next transition (s)
  x:         number;
  y:         number;
}

function makeElectrons(startState: "A" | "B"): Electron[] {
  return ELECTRON_XS.map((x, i) => ({
    state:     startState,
    nextState: null,
    progress:  0,
    timer:     Math.random() * 0.8 + i * 0.18,  // staggered starts
    x,
    y: LEVEL_Y[startState],
  }));
}

const electrons = ref<Electron[]>(makeElectrons("B"));

// ── Animation scalars ─────────────────────────────────────────────────────────
const beamFlicker   = ref(1.0);   // 0–1; drives beam and detector opacity
const detectorLevel = computed(() =>
  isLocked.value ? 0.35 + 0.60 * beamFlicker.value
  : isOn.value   ? 1.0
  : 0
);

// ── rAF loop ──────────────────────────────────────────────────────────────────
let _rafId = 0;
let _lastT = 0;
let _prevPowered = false;
let _prevLocked  = false;

function tick(t: number) {
  if (_lastT === 0) _lastT = t;
  const dt = Math.min((t - _lastT) / 1000, 0.05);
  _lastT = t;

  const powered = isPowered.value;
  const locked  = isLocked.value;
  const on      = isOn.value;

  // React to state transitions → reset electrons
  if (powered !== _prevPowered || locked !== _prevLocked) {
    if (!powered) {
      // Turning OFF → park all on A
      electrons.value = makeElectrons("A");
      beamFlicker.value = 0;
    } else if (on && _prevLocked) {
      // Leaving LOCK → put all back to B
      electrons.value = makeElectrons("B");
      beamFlicker.value = 1.0;
    }
    _prevPowered = powered;
    _prevLocked  = locked;
  }

  if (!powered) {
    _rafId = requestAnimationFrame(tick);
    return;
  }

  if (locked) {
    // ── Update electron state machine ────────────────────────────────────
    let inB = 0;
    const es = electrons.value;
    for (let i = 0; i < es.length; i++) {
      const e = es[i];

      if (e.nextState !== null) {
        // Animate transition
        const dur = e.state === "B" ? T_BA : e.state === "A" ? T_AC : T_CB;
        e.progress += dt / dur;
        if (e.progress >= 1) {
          e.state    = e.nextState!;
          e.nextState = null;
          e.progress = 0;
          e.y        = LEVEL_Y[e.state];
          e.timer    = 0.15 + Math.random() * 0.45;
        } else {
          // Smooth y interpolation
          const fromY = LEVEL_Y[e.state];
          const toY   = LEVEL_Y[e.nextState!];
          e.y = fromY + (toY - fromY) * e.progress;
        }
      } else {
        // Waiting
        e.timer -= dt;
        if (e.timer <= 0) {
          // Schedule next transition
          if      (e.state === "B") e.nextState = "A";
          else if (e.state === "A") e.nextState = "C";
          else    /* C */          e.nextState = Math.random() < 0.55 ? "B" : "A";
          e.progress = 0;
        }
      }

      if (e.state === "B" || e.nextState === "B") inB++;
    }
    electrons.value = [...es];

    // Beam flicker: fewer electrons in B → more light passes
    // (C state electrons absorb pump photon; B-population dip = more transmission)
    const targetFlicker = 1.0 - (inB / ELECTRON_XS.length) * 0.65;
    beamFlicker.value += (targetFlicker - beamFlicker.value) * 0.12;

  } else {
    // ON (unlocked) — no cycling, beam stays bright
    beamFlicker.value = 1.0;
  }

  _rafId = requestAnimationFrame(tick);
}

onMounted(() => {
  _rafId = requestAnimationFrame(tick);
});
onUnmounted(() => {
  if (_rafId) cancelAnimationFrame(_rafId);
});

// ── Electron fill colour ──────────────────────────────────────────────────────
function electronFill(state: "A" | "B" | "C"): string {
  if (isLocked.value) return "#ffc060";          // gold when locked
  if (state === "B")  return "#00e5ff";           // cyan on B level (ON)
  if (state === "C")  return "#c084fc";           // violet on C (should not appear in ON)
  return "#4a7a9a";                               // dim blue on A
}

// ── Temperature ───────────────────────────────────────────────────────────────
const tempText = computed(() => {
  const t = d.value.temperature as number | undefined | null;
  return t !== undefined && t !== null ? `${t.toFixed(1)} °C` : "--- °C";
});
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
svg * { transition: none !important; animation: none !important; }
</style>
