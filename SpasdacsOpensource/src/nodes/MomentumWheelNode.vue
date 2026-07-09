<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <!-- Wheel gradients -->
        <linearGradient :id="`mw-ring-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#c8c8da"/>
          <stop offset="20%"  stop-color="#686878"/>
          <stop offset="48%"  stop-color="#e4e4f2"/>
          <stop offset="74%"  stop-color="#565666"/>
          <stop offset="100%" stop-color="#b8b8ca"/>
        </linearGradient>
        <radialGradient :id="`mw-body-${uid}`" cx="40%" cy="38%" r="62%">
          <stop offset="0%"   stop-color="#1a2c42"/>
          <stop offset="55%"  stop-color="#0c1c2e"/>
          <stop offset="100%" stop-color="#060f1c"/>
        </radialGradient>
        <radialGradient :id="`mw-hub-${uid}`" cx="38%" cy="35%" r="65%">
          <stop offset="0%"   stop-color="#284462"/>
          <stop offset="65%"  stop-color="#121e32"/>
          <stop offset="100%" stop-color="#0a1422"/>
        </radialGradient>
        <radialGradient :id="`mw-cap-${uid}`" cx="32%" cy="30%" r="70%">
          <stop offset="0%"   stop-color="#94b6d8"/>
          <stop offset="45%"  stop-color="#3c5a7a"/>
          <stop offset="100%" stop-color="#182438"/>
        </radialGradient>
        <!-- Metallic frame gradient -->
        <linearGradient :id="`mw-frame-${uid}`" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stop-color="#a8a8b8"/>
          <stop offset="25%"  stop-color="#68687a"/>
          <stop offset="50%"  stop-color="#d8d8e8"/>
          <stop offset="75%"  stop-color="#68687a"/>
          <stop offset="100%" stop-color="#a8a8b8"/>
        </linearGradient>
      </defs>


      <!-- ══════════════════════════════════════════════════════════════ -->


      <!-- Title underline separator -->
      <line
        :x1="frameO + frameSw" :y1="topH"
        :x2="w - frameO - frameSw" :y2="topH"
        stroke="rgba(100,140,200,0.22)" :stroke-width="frameSw * 0.28"
      />

      <!-- ══════════════════════════════════════════════════════════════ -->
      <!--  WHEEL  — left zone of middle row                             -->
      <!-- ══════════════════════════════════════════════════════════════ -->

      <!-- Outer glow ring -->
      <circle :cx="cx" :cy="cy" :r="r + r * 0.10"
        fill="none" :stroke="wheelColor" :stroke-width="r * 0.038" opacity="0.28"
        :style="`filter: drop-shadow(0 0 ${r * 0.15}px ${wheelColor})`"
      />
      <!-- Metallic outer rim -->
      <circle :cx="cx" :cy="cy" :r="r" :fill="`url(#mw-ring-${uid})`"/>
      <!-- Dark wheel body -->
      <circle :cx="cx" :cy="cy" :r="r - rimW" :fill="`url(#mw-body-${uid})`"/>

      <!-- Speed arc track -->
      <path :d="arcTrack"
        fill="none" stroke="#1a2d42" :stroke-width="arcStroke" stroke-linecap="round"
      />
      <!-- Speed arc fill -->
      <path v-if="speedFraction > 0.005" :d="arcFill"
        fill="none" :stroke="wheelColor" :stroke-width="arcStroke" stroke-linecap="round"
        :style="`filter: drop-shadow(0 0 ${arcStroke}px ${wheelColor})`"
      />

      <!-- Rotating group: spokes + hub ring + spoke-tip accents -->
      <g :transform="`rotate(${wheelAngle}, ${cx}, ${cy})`">
        <line v-for="spoke in spokes" :key="spoke.i"
          :x1="cx" :y1="cy" :x2="spoke.x2" :y2="spoke.y2"
          :stroke="wheelColor" :stroke-width="r * 0.048" stroke-linecap="round"
          :opacity="spoke.primary ? 0.9 : 0.45"
        />
        <circle :cx="cx" :cy="cy" :r="hubR"
          :fill="`url(#mw-hub-${uid})`" :stroke="wheelColor" :stroke-width="r * 0.029" opacity="0.95"
        />
        <circle v-for="tip in spokeTips" :key="tip.i"
          :cx="tip.x" :cy="tip.y" :r="r * 0.048"
          :fill="wheelColor" opacity="0.75"
        />
      </g>

      <!-- Rim inner-edge highlight (fixed) -->
      <circle :cx="cx" :cy="cy" :r="r - rimW"
        fill="none" stroke="#2a3c52" :stroke-width="r * 0.019" opacity="0.55"
      />
      <!-- Direction arrow (centred in hub) -->
      <text :x="cx" :y="cy + r * 0.04"
        text-anchor="middle" dominant-baseline="middle"
        :font-size="r * 0.40" :fill="wheelColor"
        opacity="0.92" font-family="sans-serif" pointer-events="none"
      >{{ d.wheelDirection === -1 ? '↺' : '↻' }}</text>
      <!-- Centre cap bolt (metallic) -->
      <circle :cx="cx" :cy="cy" :r="capR"
        :fill="`url(#mw-cap-${uid})`" :stroke="wheelColor" :stroke-width="r * 0.019" opacity="0.95"
      />
      <!-- Invalid overlay -->
      <circle v-if="d.isInvalid"
        :cx="cx" :cy="cy" :r="r"
        fill="rgba(231,76,60,0.22)" stroke="#e74c3c"
        :stroke-width="r * 0.048" stroke-dasharray="7,4"
      />

      <!-- ══════════════════════════════════════════════════════════════ -->
      <!--  TEMPERATURE — right column, horizontal                       -->
      <!-- ══════════════════════════════════════════════════════════════ -->
      <!-- Current — above temperature -->
      <text
        :x="tempCx" :y="cy - tempValFsz * 0.80"
        text-anchor="middle" dominant-baseline="middle"
        :font-size="tempValFsz" font-weight="700"
        font-family="'Digital7', 'Courier New', monospace"
        :fill="wheelColor" opacity="0.88"
      >{{ currText }}</text>
      <!-- Temperature — below current -->
      <text
        :x="tempCx" :y="cy + tempValFsz * 0.80"
        text-anchor="middle" dominant-baseline="middle"
        :font-size="tempValFsz" font-weight="700"
        font-family="'Digital7', 'Courier New', monospace"
        :fill="wheelColor"
      >{{ tempVal }}°C</text>

      <!-- ══════════════════════════════════════════════════════════════ -->
      <!--  SPEED + DIRECTION — bottom strip (single line)               -->
      <!-- ══════════════════════════════════════════════════════════════ -->

      <!-- Bottom separator line -->
      <line
        :x1="frameO + frameSw" :y1="h - botH"
        :x2="w - frameO - frameSw" :y2="h - botH"
        stroke="rgba(100,140,200,0.22)" :stroke-width="frameSw * 0.28"
      />
      <!-- Speed + direction -->
      <text
        :x="fullCx" :y="h - botH + botH * 0.54"
        text-anchor="middle" dominant-baseline="middle"
        :fill="wheelColor"
      ><tspan
          :font-size="speedFontSz" font-weight="700"
          font-family="'Digital7', 'Courier New', monospace"
          :letter-spacing="speedFontSz * 0.04"
        >{{ speedText }}</tspan><tspan
          :font-size="dirFontSz" font-weight="600"
          font-family="sans-serif" opacity="0.82"
          :dx="speedFontSz * 0.35"
        > {{ dirText }}</tspan></text>

      <!-- ══════════════════════════════════════════════════════════════ -->
      <!--  METALLIC FRAME BORDER — drawn last so it sits on top         -->
      <!-- ══════════════════════════════════════════════════════════════ -->
      <rect :x="frameO" :y="frameO" :width="w - frameSw" :height="h - frameSw"
        fill="none"
        :stroke="d.isInvalid ? '#e74c3c' : `url(#mw-frame-${uid})`"
        :stroke-width="frameSw"
        :rx="frameRx"
      />

    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useNodeData }   from "./useNodeData";
import { useGsapSpin }   from "./useGsapSpin";
import { useGsapTween }  from "./useGsapTween";

const { d, w, h } = useNodeData(195, 185);

// Unique gradient ID suffix — avoids SVG id collisions across multiple instances
const uid = ref(Math.random().toString(36).slice(2, 8));

// ── Metallic frame — proportional to node size ────────────────────────────────
const frameSw = computed(() => Math.min(w.value, h.value) * 0.038);
const frameO  = computed(() => frameSw.value * 0.5);
const frameRx = computed(() => Math.min(w.value, h.value) * 0.060);

// ── Layout zones — all proportional so they scale on resize ──────────────────
const bdSw   = computed(() => h.value * 0.007);   // inner badge stroke-width
const bdMgn  = computed(() => frameO.value + frameSw.value);  // inset from frame
const topH   = computed(() => h.value * 0.178);   // title strip height
const botH   = computed(() => h.value * 0.178);   // speed strip height
const midGap = computed(() => h.value * 0.028);   // gap around wheel zone

// Full-width horizontal centre (for title and speed strips)
const fullCx = computed(() => w.value / 2);

// Right column fraction for temperature
const rightFrac = 0.315;
const rightW    = computed(() => w.value * rightFrac);

// ── Wheel zone ───────────────────────────────────────────────────────────────
const whlW = computed(() => w.value - rightW.value - midGap.value);
const whlH = computed(() => h.value - topH.value - botH.value - midGap.value * 2);
// Wheel radius: fill available space with a small inset for the glow ring
const r    = computed(() => Math.min(whlW.value, whlH.value) / 2 - 3);
// Wheel centre: centred inside the left/wheel zone
const cx   = computed(() => whlW.value / 2);
const cy   = computed(() => topH.value + midGap.value + whlH.value / 2);

// ── Proportional wheel sizes ─────────────────────────────────────────────────
const rimW      = computed(() => r.value * 0.173);
const hubR      = computed(() => r.value * 0.28);
const capR      = computed(() => r.value * 0.10);
const arcR      = computed(() => r.value - rimW.value / 2);
const arcStroke = computed(() => r.value * 0.087);

// ── Telemetry data ────────────────────────────────────────────────────────────
const speed     = computed(() => Math.abs((d.value.wheelSpeed ?? 0) as number));
const direction = computed(() => ((d.value.wheelDirection as number) ?? 1));

// GSAP-driven continuous rotation — visual speed capped at 1 rot/s at 6000 RPM
const wheelAngle    = useGsapSpin(() => speed.value, () => direction.value, 6000);
// Smooth arc-fill transition when speed changes
const speedFraction = useGsapTween(() => Math.min(speed.value / 6000, 1), 1.0, "power1.inOut");
const wheelColor    = computed(() =>
  String(d.value.statusColor ||
    (speed.value > 4000 ? "#e74c3c" : speed.value > 1000 ? "#27ae60" : "#ff9800"))
);

// Raw (instant) speed text — bypasses tweener so it never counts up
const speedText = computed(() => {
  const raw = (d.value.wheelSpeedRaw ?? d.value.wheelSpeed ?? 0) as number;
  return Math.abs(raw).toFixed(0) + " RPM";
});
const dirText = computed(() =>
  (d.value.wheelDirection as number) === -1 ? "↺ CCW" : "↻  CW"
);
const tempVal = computed(() => {
  const t = d.value.wheelTemperature;
  return (t !== undefined && t !== null) ? (t as number).toFixed(1) : "---";
});
const currText = computed(() => {
  const c = d.value.wheelCurrent;
  return (c !== undefined && c !== null) ? Math.round(c as number) + " mA" : "--- mA";
});

// Configurable title from node name
const titleText = computed(() => (d.value.name as string) || "Wheel");

// ── Font sizes — all derived from reactive layout values ─────────────────────
const titleFontSz = computed(() => (d.value.titleFontSize as number | undefined) ?? topH.value * 0.62);
const titleFontColor = computed(() => (d.value.titleFontColor as string) || "#94a3b8");
const speedFontSz = computed(() => botH.value  * 0.58);
const dirFontSz   = computed(() => botH.value  * 0.36);

// ── Temperature column ────────────────────────────────────────────────────────
const tempCx     = computed(() => w.value - rightW.value / 2 - rightW.value * 0.22);
const tempBdW    = computed(() => rightW.value - midGap.value * 2);
const tempBdH    = computed(() => Math.min(whlH.value * 0.58, r.value * 1.15));
const tempBdX    = computed(() => tempCx.value - tempBdW.value / 2);
const tempValFsz = computed(() => tempBdH.value * 0.36);
const tempLblFsz = computed(() => tempBdH.value * 0.22);

// ── Spokes ────────────────────────────────────────────────────────────────────
const spokes = computed(() => {
  const spokeR = r.value - rimW.value - r.value * 0.06;
  return Array.from({ length: 6 }, (_, i) => ({
    i,
    x2: cx.value + spokeR * Math.cos(i * Math.PI / 3),
    y2: cy.value + spokeR * Math.sin(i * Math.PI / 3),
    primary: i % 2 === 0,
  }));
});

const spokeTips = computed(() => {
  const spokeR = r.value - rimW.value - r.value * 0.06;
  return [0, 2, 4].map(i => ({
    i,
    x: cx.value + spokeR * Math.cos(i * Math.PI / 3),
    y: cy.value + spokeR * Math.sin(i * Math.PI / 3),
  }));
});

// ── Speed arc ──────────────────────────────────────────────────────────────────
function makeArc(startDeg: number, spanDeg: number, arcRadius: number): string {
  const toRad = (deg: number) => deg * Math.PI / 180;
  const x1 = cx.value + arcRadius * Math.cos(toRad(startDeg));
  const y1 = cy.value + arcRadius * Math.sin(toRad(startDeg));
  const x2 = cx.value + arcRadius * Math.cos(toRad(startDeg + spanDeg));
  const y2 = cy.value + arcRadius * Math.sin(toRad(startDeg + spanDeg));
  const largeArc = spanDeg > 180 ? 1 : 0;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${arcRadius} ${arcRadius} 0 ${largeArc} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

const arcTrack = computed(() => makeArc(120, 300, arcR.value));
const arcFill  = computed(() =>
  makeArc(120, Math.max(speedFraction.value * 300, 3), arcR.value)
);
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
svg * { transition: none !important; animation: none !important; }
</style>
