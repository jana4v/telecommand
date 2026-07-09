<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" viewBox="0 0 180 130" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Enclosure panel -->
        <linearGradient :id="`cb-panel-${uid}`" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stop-color="#263a4a"/>
          <stop offset="100%" stop-color="#12202b"/>
        </linearGradient>
        <!-- Header bar -->
        <linearGradient :id="`cb-hdr-${uid}`" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stop-color="#1a2f45"/>
          <stop offset="50%"  stop-color="#22405e"/>
          <stop offset="100%" stop-color="#1a2f45"/>
        </linearGradient>
        <!-- PCB green substrate -->
        <linearGradient :id="`cb-pcb-${uid}`" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stop-color="#061410"/>
          <stop offset="100%" stop-color="#0a1e14"/>
        </linearGradient>
        <!-- IC chip body (dark ceramic) -->
        <linearGradient :id="`cb-chip-${uid}`" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stop-color="#232e3c"/>
          <stop offset="100%" stop-color="#141c28"/>
        </linearGradient>
        <!-- Metal pin sheen -->
        <linearGradient :id="`cb-pin-${uid}`" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stop-color="#8898a8"/>
          <stop offset="100%" stop-color="#4a5a68"/>
        </linearGradient>
        <!-- I/O connector -->
        <linearGradient :id="`cb-conn-${uid}`" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stop-color="#08121e"/>
          <stop offset="50%"  stop-color="#0e1c2c"/>
          <stop offset="100%" stop-color="#08121e"/>
        </linearGradient>
        <!-- Glow (tight) -->
        <filter :id="`cb-glow-${uid}`" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="1.2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <!-- Glow (wide, for LEDs) -->
        <filter :id="`cb-glow2-${uid}`" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="2.8" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <!-- ══════════════════════════════════════════════════════
           OUTER ENCLOSURE
           ══════════════════════════════════════════════════════ -->
      <rect x="0.5" y="0.5" width="179" height="129" rx="6"
        :fill="`url(#cb-panel-${uid})`" stroke="#3f6276" stroke-width="1.7"/>
      <!-- Top-face sheen -->
      <rect x="1" y="1" width="178" height="18" rx="6" fill="rgba(255,255,255,0.028)"/>

      <!-- Corner screws (4×) -->
      <g v-for="s in SCREWS" :key="`scr-${s.cx}-${s.cy}`">
        <circle :cx="s.cx" :cy="s.cy" r="3.5" fill="#0c1820" stroke="#243444" stroke-width="0.8"/>
        <line :x1="s.cx-2.5" :y1="s.cy"       :x2="s.cx+2.5" :y2="s.cy"       stroke="#2c4050" stroke-width="0.7"/>
        <line :x1="s.cx"     :y1="s.cy-2.5"   :x2="s.cx"     :y2="s.cy+2.5"   stroke="#2c4050" stroke-width="0.7"/>
      </g>

      <!-- ══════════════════════════════════════════════════════
           HEADER BAR
           ══════════════════════════════════════════════════════ -->
      <rect x="1" y="1" width="178" height="25" rx="6" :fill="`url(#cb-hdr-${uid})`"/>
      <!-- Bottom strip of header (slightly darker) -->
      <rect x="1" y="20" width="178" height="6" fill="#0d1820" opacity="0.85"/>
      <line x1="1" y1="26" x2="179" y2="26" stroke="#1c3040" stroke-width="0.8"/>
      <!-- Title (font-size configurable via titleFontSize; text = name or "CONTROLLER") -->
      <text :x="titleX" :y="titleY" :text-anchor="titleAnchor" :font-size="titleFontSize" font-weight="700" font-family="monospace"
        :fill="titleFontColor" letter-spacing="0.10em"
        style="paint-order: stroke; stroke: #0a1622; stroke-width: 0.8px;">{{ headerTitle }}</text>

      <!-- ── STATUS LEDs ─────────────────────────────────────────── -->
      <!-- Sockets -->
      <circle cx="146" cy="13" r="4.5" fill="#080f18" stroke="#1a2c3c" stroke-width="0.8"/>
      <circle cx="160" cy="13" r="4.5" fill="#080f18" stroke="#1a2c3c" stroke-width="0.8"/>
      <circle cx="174" cy="13" r="4.5" fill="#080f18" stroke="#1a2c3c" stroke-width="0.8"/>
      <!-- PWR: green=nominal, amber=standby, dim=fault/unknown, off=dark -->
      <circle cx="146" cy="13" r="2.8" :fill="pwrLedColor"
        :filter="`url(#cb-glow2-${uid})`" :opacity="pwrLedOpacity"/>
      <!-- SIG: accent, blinks when signals active; hidden when off -->
      <circle cx="160" cy="13" r="2.8" :fill="accentColor"
        :filter="`url(#cb-glow2-${uid})`"
        :class="{ 'led-blink': signalActive && !isOff }"
        :opacity="isOff ? 0.08 : signalActive ? 1 : 0.15"/>
      <!-- FLT: red = fault, hidden when off -->
      <circle cx="174" cy="13" r="2.8" :fill="fltLedColor"
        :filter="`url(#cb-glow2-${uid})`" :opacity="isOff ? 0.08 : fltLedOpacity"/>
      <!-- Labels -->
      <text x="146" y="22" text-anchor="middle" font-size="3.5" font-family="monospace" fill="#263a4e">PWR</text>
      <text x="160" y="22" text-anchor="middle" font-size="3.5" font-family="monospace" fill="#263a4e">SIG</text>
      <text x="174" y="22" text-anchor="middle" font-size="3.5" font-family="monospace" fill="#263a4e">FLT</text>

      <!-- ══════════════════════════════════════════════════════
           PCB BOARD
           ══════════════════════════════════════════════════════ -->
      <rect x="10" y="28" width="160" height="78" rx="3"
        :fill="`url(#cb-pcb-${uid})`" stroke="#0a2e1a" stroke-width="1"/>
      <!-- Routing grid (very subtle) -->
      <g opacity="0.5">
        <line v-for="xi in [30,50,70,90,110,130,150]" :key="'gx'+xi"
          :x1="xi" y1="28" :x2="xi" y2="106" stroke="#0a2010" stroke-width="0.4"/>
        <line v-for="yi in [40,52,64,76,88,100]" :key="'gy'+yi"
          x1="10" :y1="yi" x2="170" :y2="yi" stroke="#0a2010" stroke-width="0.4"/>
      </g>

      <!-- ══════════════════════════════════════════════════════
           BASE TRACE LINES (copper, always visible)
           ══════════════════════════════════════════════════════ -->
      <!-- Left traces (via pads → chip left pins) -->
      <line v-for="(pin, i) in PINS" :key="'ltb'+i"
        x1="10" :y1="pin.y" x2="57" :y2="pin.y"
        stroke="#10401e" stroke-width="1.2"/>
      <!-- Right traces (chip right pins → via pads) -->
      <line v-for="(pin, i) in PINS" :key="'rtb'+i"
        x1="121" :y1="pin.y" x2="170" :y2="pin.y"
        stroke="#10401e" stroke-width="1.2"/>
      <!-- Left via pads -->
      <circle v-for="(pin, i) in PINS" :key="'lv'+i"
        cx="10" :cy="pin.y" r="2.5" fill="#185828" stroke="#0a2a12" stroke-width="0.5"/>
      <!-- Right via pads -->
      <circle v-for="(pin, i) in PINS" :key="'rv'+i"
        cx="170" :cy="pin.y" r="2.5" fill="#185828" stroke="#0a2a12" stroke-width="0.5"/>

      <!-- ══════════════════════════════════════════════════════
           ANIMATED SIGNAL PULSES
           ══════════════════════════════════════════════════════ -->
      <!-- Left → MCU (signals flowing right into chip) -->
      <line v-for="(pin, i) in PINS" :key="'ls'+i"
        x1="10" :y1="pin.y" x2="57" :y2="pin.y"
        :stroke="accentColor" stroke-width="1.5"
        stroke-dasharray="5 17"
        :class="signalActive ? ['sig-in', `sig-d${i % 3}`] : []"
        opacity="0.85"/>
      <!-- MCU → Right (signals flowing right out of chip) -->
      <line v-for="(pin, i) in PINS" :key="'rs'+i"
        x1="121" :y1="pin.y" x2="170" :y2="pin.y"
        :stroke="accentColor" stroke-width="1.5"
        stroke-dasharray="5 17"
        :class="signalActive ? ['sig-out', `sig-d${(i+2) % 3}`] : []"
        opacity="0.85"/>

      <!-- ══════════════════════════════════════════════════════
           MCU CHIP (QFP / LQFP style)
           ══════════════════════════════════════════════════════ -->
      <!-- Drop shadow -->
      <rect x="67" y="46" width="46" height="46" rx="4" fill="#000000" opacity="0.45"/>
      <!-- Chip package body -->
      <rect x="65" y="44" width="46" height="46" rx="4"
        :fill="`url(#cb-chip-${uid})`" stroke="#263444" stroke-width="1"/>
      <!-- Die area -->
      <rect x="70" y="49" width="36" height="36" rx="2" fill="#0a1218" stroke="#172030" stroke-width="0.6"/>
      <!-- Routing grid inside die -->
      <line x1="70" y1="67" x2="106" y2="67" stroke="#142030" stroke-width="0.6"/>
      <line x1="88" y1="49" x2="88"  y2="85" stroke="#142030" stroke-width="0.6"/>
      <!-- Four functional blocks (CPU / MEM / I/O / PWR) -->
      <rect x="72" y="51" width="14" height="14" rx="1.5" fill="#0e1828" stroke="#1a2c40" stroke-width="0.5"/>
      <rect x="90" y="51" width="14" height="14" rx="1.5" fill="#0e1828" stroke="#1a2c40" stroke-width="0.5"/>
      <rect x="72" y="69" width="14" height="14" rx="1.5" fill="#0e1828" stroke="#1a2c40" stroke-width="0.5"/>
      <rect x="90" y="69" width="14" height="14" rx="1.5" fill="#0e1828" stroke="#1a2c40" stroke-width="0.5"/>
      <!-- Block labels -->
      <text x="79" y="58.5" text-anchor="middle" dominant-baseline="middle"
        font-size="3" font-family="monospace" fill="#284858" opacity="0.9">CPU</text>
      <text x="97" y="58.5" text-anchor="middle" dominant-baseline="middle"
        font-size="3" font-family="monospace" fill="#284858" opacity="0.9">MEM</text>
      <text x="79" y="76.5" text-anchor="middle" dominant-baseline="middle"
        font-size="3" font-family="monospace" fill="#284858" opacity="0.9">I/O</text>
      <text x="97" y="76.5" text-anchor="middle" dominant-baseline="middle"
        font-size="3" font-family="monospace" fill="#284858" opacity="0.9">PWR</text>
      <!-- Animated die data bus lines -->
      <line x1="72" y1="67" x2="106" y2="67"
        :stroke="accentColor" stroke-width="0.8" stroke-dasharray="3 5"
        :class="{ 'die-bus-h': signalActive }" opacity="0.45"/>
      <line x1="88" y1="49" x2="88" y2="85"
        :stroke="accentColor" stroke-width="0.8" stroke-dasharray="3 5"
        :class="{ 'die-bus-v': signalActive }" opacity="0.45"/>
      <!-- Main chip label: μCU -->
      <text x="88" y="66" text-anchor="middle" dominant-baseline="middle"
        font-size="6.5" font-weight="700" font-family="monospace"
        :fill="accentColor" opacity="0.92">μCU</text>
      <!-- Sub-label -->
      <text x="88" y="75" text-anchor="middle" dominant-baseline="middle"
        font-size="3.5" font-family="monospace" fill="#3a5878" opacity="0.8">ECLSS-01</text>
      <!-- Pin 1 marker (notch top-left corner) -->
      <circle cx="67.5" cy="46.5" r="2" fill="#0a1218" opacity="0.85"/>
      <!-- Active chip glow border -->
      <rect x="65" y="44" width="46" height="46" rx="4" fill="none"
        :stroke="accentColor" stroke-width="2.5"
        :opacity="signalActive ? 0.32 : 0.08"/>

      <!-- Chip pins – left side (x: 55→65) -->
      <rect v-for="(pin, i) in PINS" :key="'lp'+i"
        x="55" :y="pin.y - 1.5" width="10" height="3" rx="0.8"
        :fill="`url(#cb-pin-${uid})`"/>
      <!-- Chip pins – right side (x: 111→121) -->
      <rect v-for="(pin, i) in PINS" :key="'rp'+i"
        x="111" :y="pin.y - 1.5" width="10" height="3" rx="0.8"
        :fill="`url(#cb-pin-${uid})`"/>

      <!-- ══════════════════════════════════════════════════════
           CRYSTAL OSCILLATOR (above chip, centre)
           ══════════════════════════════════════════════════════ -->
      <!-- Can body -->
      <rect x="83" y="30" width="12" height="9" rx="2.5" fill="#3a3020" stroke="#504828" stroke-width="0.7"/>
      <!-- Leads (top) -->
      <line x1="86" y1="30" x2="86" y2="28" stroke="#6888a0" stroke-width="1.1"/>
      <line x1="92" y1="30" x2="92" y2="28" stroke="#6888a0" stroke-width="1.1"/>
      <!-- Pads at top of PCB -->
      <rect x="84.5" y="27.5" width="3" height="1.5" rx="0.3" fill="#185828" opacity="0.8"/>
      <rect x="90.5" y="27.5" width="3" height="1.5" rx="0.3" fill="#185828" opacity="0.8"/>
      <!-- Label inside can -->
      <text x="89" y="35.5" text-anchor="middle" dominant-baseline="middle"
        font-size="3" font-family="monospace" fill="#907848">XTAL</text>
      <!-- Trace from crystal to MCU top -->
      <line x1="89" y1="39" x2="89" y2="44" stroke="#10401e" stroke-width="0.9"/>
      <!-- Pad at chip top -->
      <circle cx="89" cy="39" r="1.5" fill="#185828" opacity="0.7"/>

      <!-- ══════════════════════════════════════════════════════
           SMD PASSIVE COMPONENTS — LEFT SIDE
           ══════════════════════════════════════════════════════ -->
      <!-- Capacitor C1 (electrolytic, blue-grey) -->
      <rect x="15"  y="34" width="7"  height="12" rx="1.5" fill="#282e3e" stroke="#38465a" stroke-width="0.6"/>
      <rect x="16.5" y="32"  width="4" height="2.5" rx="0.4" fill="#486070"/>
      <rect x="16.5" y="46"  width="4" height="2.5" rx="0.4" fill="#486070"/>
      <!-- Polarity mark -->
      <text x="18.5" y="39" text-anchor="middle" dominant-baseline="middle"
        font-size="4" font-family="monospace" fill="#3a5060">+</text>
      <text x="18.5" y="45.5" text-anchor="middle" dominant-baseline="middle"
        font-size="2.8" font-family="monospace" fill="#2a3848">C1</text>

      <!-- Resistor R1 (with colour bands) -->
      <rect x="28" y="34" width="16" height="8" rx="1.5" fill="#2a2010" stroke="#3a3010" stroke-width="0.6"/>
      <rect x="31"   y="34" width="2" height="8" fill="#880000" opacity="0.85"/>
      <rect x="34.5" y="34" width="2" height="8" fill="#cc8800" opacity="0.85"/>
      <rect x="38"   y="34" width="2" height="8" fill="#c89000" opacity="0.85"/>
      <line x1="28" y1="38" x2="26" y2="38" stroke="#58687a" stroke-width="0.9"/>
      <line x1="44" y1="38" x2="46" y2="38" stroke="#58687a" stroke-width="0.9"/>

      <!-- Capacitor C3 (bottom-left) -->
      <rect x="15"   y="91" width="7"  height="12" rx="1.5" fill="#282e3e" stroke="#38465a" stroke-width="0.6"/>
      <rect x="16.5" y="89" width="4"  height="2.5" rx="0.4" fill="#486070"/>
      <rect x="16.5" y="103" width="4" height="2.5" rx="0.4" fill="#486070"/>
      <text x="18.5" y="96.5" text-anchor="middle" dominant-baseline="middle"
        font-size="2.8" font-family="monospace" fill="#2a3848">C3</text>

      <!-- ══════════════════════════════════════════════════════
           SMD PASSIVE COMPONENTS — RIGHT SIDE
           ══════════════════════════════════════════════════════ -->
      <!-- Capacitor C2 -->
      <rect x="158" y="34" width="7"  height="12" rx="1.5" fill="#282e3e" stroke="#38465a" stroke-width="0.6"/>
      <rect x="159.5" y="32"  width="4" height="2.5" rx="0.4" fill="#486070"/>
      <rect x="159.5" y="46"  width="4" height="2.5" rx="0.4" fill="#486070"/>
      <text x="161.5" y="39" text-anchor="middle" dominant-baseline="middle"
        font-size="4" font-family="monospace" fill="#3a5060">+</text>
      <text x="161.5" y="45.5" text-anchor="middle" dominant-baseline="middle"
        font-size="2.8" font-family="monospace" fill="#2a3848">C2</text>

      <!-- Resistor R2 -->
      <rect x="136" y="34" width="16" height="8" rx="1.5" fill="#2a2010" stroke="#3a3010" stroke-width="0.6"/>
      <rect x="139"  y="34" width="2" height="8" fill="#880000" opacity="0.85"/>
      <rect x="142.5" y="34" width="2" height="8" fill="#cc8800" opacity="0.85"/>
      <rect x="146"  y="34" width="2" height="8" fill="#c89000" opacity="0.85"/>
      <line x1="136" y1="38" x2="134" y2="38" stroke="#58687a" stroke-width="0.9"/>
      <line x1="152" y1="38" x2="154" y2="38" stroke="#58687a" stroke-width="0.9"/>

      <!-- Capacitor C4 (bottom-right) -->
      <rect x="158" y="91" width="7"  height="12" rx="1.5" fill="#282e3e" stroke="#38465a" stroke-width="0.6"/>
      <rect x="159.5" y="89"  width="4" height="2.5" rx="0.4" fill="#486070"/>
      <rect x="159.5" y="103" width="4" height="2.5" rx="0.4" fill="#486070"/>
      <text x="161.5" y="96.5" text-anchor="middle" dominant-baseline="middle"
        font-size="2.8" font-family="monospace" fill="#2a3848">C4</text>

      <!-- ══════════════════════════════════════════════════════
           DATA BUS TRACE (bottom of PCB)
           ══════════════════════════════════════════════════════ -->
      <rect x="10" y="104.5" width="160" height="3.5" rx="1.2"
        fill="#082014" stroke="#10401e" stroke-width="0.6"/>
      <!-- Animated bus sweep -->
      <line x1="10" y1="106.3" x2="170" y2="106.3"
        :stroke="accentColor" stroke-width="2"
        stroke-dasharray="12 8"
        :class="{ 'data-bus': signalActive }"
        opacity="0.4"/>

      <!-- ══════════════════════════════════════════════════════
           I/O CONNECTOR STRIP (bottom of enclosure)
           ══════════════════════════════════════════════════════ -->
      <rect x="10" y="110" width="160" height="16" rx="2"
        :fill="`url(#cb-conn-${uid})`" stroke="#1a2c3c" stroke-width="0.8"/>
      <!-- 14 individual connector housings -->
      <rect v-for="i in 14" :key="'ch'+i"
        :x="12 + (i-1)*11.1" y="110" width="8" height="5" rx="0.4"
        fill="#101820" stroke="#1e2e3e" stroke-width="0.5"/>
      <!-- GND pins highlighted (every 3rd) in green tint -->
      <rect v-for="gi in [3,6,9,12]" :key="'gnd'+gi"
        :x="12 + (gi-1)*11.1" y="115" width="8" height="3" rx="0"
        fill="#182e18" opacity="0.65"/>
      <!-- Connector label -->
      <text x="90" y="122.5" text-anchor="middle" dominant-baseline="middle"
        font-size="3.5" font-family="monospace" fill="#202e3e" letter-spacing="0.08em">I/O  CONNECTOR</text>

      <!-- ══════════════════════════════════════════════════════
           POWER-OFF DIM OVERLAY (shown when status = off)
           ══════════════════════════════════════════════════════ -->
      <rect v-if="isOff" x="10" y="28" width="160" height="98" rx="3"
        fill="#000" opacity="0.62"/>
      <!-- "POWERED OFF" text when off -->
      <text v-if="isOff" x="90" y="80" text-anchor="middle" dominant-baseline="middle"
        font-size="9" font-weight="700" font-family="monospace"
        fill="#3a4a5a" opacity="0.7" letter-spacing="0.1em">POWERED OFF</text>

    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useNodeData } from "./useNodeData";
import { useTitlePosition } from "./useTitlePosition";

const { d, w, h } = useNodeData(180, 130);
const uid = ref(Math.random().toString(36).slice(2, 8));

const accentColor  = computed(() => (d.value.statusColor as string) || "#4a9eff");
// Header title: use name field if set, else "CONTROLLER"
const headerTitle  = computed(() => (d.value.name as string)?.trim() || "CONTROLLER");
// Title font size from inspector (default 7.5px)
const titleFontSize = computed(() => Number(d.value.titleFontSize) || 10.5);
const titleFontColor = computed(() => (d.value.titleFontColor as string) || "#8fc4ff");
const { titleX, titleY, titleAnchor } = useTitlePosition(
  () => d.value.titlePosition as string | undefined,
  () => 0,
  () => w.value,
  () => 0,
  () => h.value,
  "top-center",
);

// ── Static geometry ──────────────────────────────────────────────────────────
const SCREWS = [
  { cx: 8, cy: 8 }, { cx: 172, cy: 8 }, { cx: 8, cy: 122 }, { cx: 172, cy: 122 },
];
// MCU pin Y positions: 6 pins spanning chip body y=44–90, spaced 7px
const PINS = [50, 57, 64, 71, 78, 85].map(y => ({ y }));

// ── Telemetry helpers ────────────────────────────────────────────────────────
function isTruthy(v: any, keys = ["1","true","on","yes"]): boolean {
  if (v == null) return false;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  return keys.includes(String(v).toLowerCase().trim());
}

const statusStr = computed(() => String(d.value.status ?? "").toLowerCase().trim());
const isNominal = computed(() =>
  ["nominal","ok","active","on","1","true","yes","run","running"].includes(statusStr.value));
const isFault   = computed(() =>
  ["fault","error","fail","alarm","critical","err"].includes(statusStr.value));
const isStandby = computed(() =>
  ["standby","idle","sleep","waiting","ready","warm"].includes(statusStr.value));
const isOff     = computed(() =>
  ["off","poweroff","power_off","shutdown","disabled","down","unpowered"].includes(statusStr.value));

// signalActive: disabled when off; auto-on when nominal; or explicitly forced
const signalActive = computed(() => {
  if (isOff.value) return false;
  return isTruthy(d.value.signalActive, ["1","true","on","yes","active"]) || isNominal.value;
});

// PWR LED: green=nominal, amber=standby, near-dark=off, dim otherwise
const pwrLedColor   = computed(() =>
  isOff.value     ? "#0e1a20" :
  isNominal.value ? "#30e060" :
  isStandby.value ? "#ffa020" : "#1e2a2e");
const pwrLedOpacity = computed(() =>
  isOff.value ? 0.2 : (isNominal.value || isStandby.value) ? 1 : 0.3);

// FLT LED: red only on fault
const fltLedColor   = computed(() => isFault.value ? "#ff2838" : "#261018");
const fltLedOpacity = computed(() => isFault.value ? 1 : 0.25);
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }

/* ── Signal: left traces flowing right into MCU ─── */
@keyframes sig-in-anim {
  from { stroke-dashoffset: 0; }
  to   { stroke-dashoffset: -22; }   /* period = 5 + 17 */
}
/* ── Signal: right traces flowing right out of MCU ─ */
@keyframes sig-out-anim {
  from { stroke-dashoffset: 0; }
  to   { stroke-dashoffset: -22; }
}
/* ── Data bus sweep ──────────────────────────────── */
@keyframes bus-anim {
  from { stroke-dashoffset: 0; }
  to   { stroke-dashoffset: -20; }   /* period = 12 + 8 */
}
/* ── Die internal bus lines ──────────────────────── */
@keyframes die-h-anim {
  from { stroke-dashoffset: 0; }
  to   { stroke-dashoffset: -8; }    /* period = 3 + 5 */
}
@keyframes die-v-anim {
  from { stroke-dashoffset: 0; }
  to   { stroke-dashoffset: -8; }
}
/* ── SIG LED blink ───────────────────────────────── */
@keyframes blink-anim {
  0%, 100% { opacity: 1;    }
  50%      { opacity: 0.12; }
}

/* Signal classes (applied via :class binding) */
.sig-in  { animation: sig-in-anim  1.1s linear infinite; }
.sig-out { animation: sig-out-anim 1.1s linear infinite; }

/* Stagger offsets for 3 interleaved phases */
.sig-d0 { animation-delay:  0s;     }
.sig-d1 { animation-delay: -0.37s;  }
.sig-d2 { animation-delay: -0.74s;  }

.data-bus { animation: bus-anim   0.7s linear    infinite; }
.die-bus-h { animation: die-h-anim 0.5s linear    infinite; }
.die-bus-v { animation: die-v-anim 0.5s linear    infinite 0.25s; }
.led-blink { animation: blink-anim 0.95s ease-in-out infinite; }
</style>
