<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg class="body-svg" viewBox="0 0 90 200" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- ── Static metallic gradients ── -->
        <linearGradient id="thr2-flg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#98a8bf"/>
          <stop offset="30%"  stop-color="#ccd8e8"/>
          <stop offset="68%"  stop-color="#8898b0"/>
          <stop offset="100%" stop-color="#404e64"/>
        </linearGradient>
        <linearGradient id="thr2-bdy" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#1a2034"/>
          <stop offset="14%"  stop-color="#445898"/>
          <stop offset="40%"  stop-color="#7888b8"/>
          <stop offset="60%"  stop-color="#6878aa"/>
          <stop offset="86%"  stop-color="#364888"/>
          <stop offset="100%" stop-color="#121824"/>
        </linearGradient>
        <linearGradient id="thr2-nzl" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#101820"/>
          <stop offset="10%"  stop-color="#3c4e5e"/>
          <stop offset="33%"  stop-color="#788898"/>
          <stop offset="50%"  stop-color="#8ea0b0"/>
          <stop offset="67%"  stop-color="#687888"/>
          <stop offset="90%"  stop-color="#2e3e50"/>
          <stop offset="100%" stop-color="#0c1620"/>
        </linearGradient>
        <linearGradient id="thr2-ox" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#0a1640"/>
          <stop offset="50%"  stop-color="#1c3898"/>
          <stop offset="100%" stop-color="#0a1640"/>
        </linearGradient>
        <linearGradient id="thr2-fu" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#3c0e06"/>
          <stop offset="50%"  stop-color="#a82c0c"/>
          <stop offset="100%" stop-color="#3c0e06"/>
        </linearGradient>
        <!-- Plume outer (expanding vacuum plume, blue-violet) -->
        <linearGradient id="thr2-plume-o" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#b8d8ff" stop-opacity="0.90"/>
          <stop offset="18%"  stop-color="#7898f8" stop-opacity="0.72"/>
          <stop offset="45%"  stop-color="#5060d8" stop-opacity="0.48"/>
          <stop offset="75%"  stop-color="#3030a8" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="#2020a0" stop-opacity="0"/>
        </linearGradient>
        <!-- Plume mid-layer (secondary tone) -->
        <linearGradient id="thr2-plume-m" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#e0f0ff" stop-opacity="0.60"/>
          <stop offset="30%"  stop-color="#90b8f8" stop-opacity="0.40"/>
          <stop offset="70%"  stop-color="#5870d8" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="#3040b0" stop-opacity="0"/>
        </linearGradient>
        <!-- Inner plasma core (white-cyan, hot) -->
        <linearGradient id="thr2-core" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#ffffff"  stop-opacity="1.00"/>
          <stop offset="20%"  stop-color="#d8f2ff"  stop-opacity="0.95"/>
          <stop offset="50%"  stop-color="#90c0ff"  stop-opacity="0.75"/>
          <stop offset="80%"  stop-color="#5068e8"  stop-opacity="0.38"/>
          <stop offset="100%" stop-color="#3040c0"  stop-opacity="0"/>
        </linearGradient>
        <!-- Exit flash radial -->
        <radialGradient id="thr2-exit" cx="50%" cy="30%" r="70%">
          <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.85"/>
          <stop offset="40%"  stop-color="#c0e4ff" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#80a8ff" stop-opacity="0"/>
        </radialGradient>

        <!-- ── Clip paths ── -->
        <!-- Expanding plume cone (vacuum expansion) -->
        <clipPath id="thr2-plume-clip">
          <path d="M 16,108 Q 6,155 2,196 L 88,196 Q 84,155 74,108 Z"/>
        </clipPath>
        <!-- Narrow inner core -->
        <clipPath id="thr2-core-clip">
          <path d="M 37,108 Q 39,152 38,188 L 52,188 Q 51,152 53,108 Z"/>
        </clipPath>

        <!-- ── Filters ── -->
        <filter id="thr2-led" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="1.6" result="b"/>
          <feComposite in="SourceGraphic" in2="b" operator="over"/>
        </filter>
        <filter id="thr2-cmb" x="-90%" y="-90%" width="280%" height="280%">
          <feGaussianBlur stdDeviation="4.5" result="b"/>
          <feComposite in="SourceGraphic" in2="b" operator="over"/>
        </filter>
        <filter id="thr2-heat" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.2" result="b"/>
          <feComposite in="SourceGraphic" in2="b" operator="over"/>
        </filter>
        <filter id="thr2-diamond" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2.8" result="b"/>
          <feComposite in="SourceGraphic" in2="b" operator="over"/>
        </filter>
        <filter id="thr2-coreglow" x="-120%" y="-10%" width="340%" height="120%">
          <feGaussianBlur stdDeviation="2.2" result="b"/>
          <feComposite in="SourceGraphic" in2="b" operator="over"/>
        </filter>
        <filter id="thr2-shadow">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" flood-color="#00000070"/>
        </filter>
        <!-- Plasma turbulence (mid-plume shimmer) -->
        <filter id="thr2-plasma" x="-12%" y="-4%" width="124%" height="108%">
          <feTurbulence type="fractalNoise" baseFrequency="0.038 0.065"
            numOctaves="3" seed="7" result="noise">
            <animate attributeName="baseFrequency"
              values="0.033 0.060;0.045 0.078;0.036 0.066;0.042 0.070;0.033 0.060"
              dur="1.3s" repeatCount="indefinite"/>
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.5"
            xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </defs>

      <!-- ══════════════════════════════════════
           MOUNTING FLANGE / INTERFACE PLATE
           ══════════════════════════════════════ -->
      <rect x="6" y="2" width="78" height="15" rx="2.5"
        fill="url(#thr2-flg)" stroke="#485870" stroke-width="1.2"
        filter="url(#thr2-shadow)"/>
      <!-- Specular top edge -->
      <rect x="6" y="2" width="78" height="3.5" rx="2.5" fill="#dce8f4" opacity="0.28"/>
      <!-- Bolt holes (4×) -->
      <g fill="#0c1220" stroke="#283898" stroke-width="0.8">
        <circle cx="17"  cy="9.5" r="3.5"/><circle cx="17"  cy="9.5" r="1.5" fill="#06080e" stroke="#4860b8" stroke-width="0.5"/>
        <circle cx="38"  cy="9.5" r="3.5"/><circle cx="38"  cy="9.5" r="1.5" fill="#06080e" stroke="#4860b8" stroke-width="0.5"/>
        <circle cx="52"  cy="9.5" r="3.5"/><circle cx="52"  cy="9.5" r="1.5" fill="#06080e" stroke="#4860b8" stroke-width="0.5"/>
        <circle cx="73"  cy="9.5" r="3.5"/><circle cx="73"  cy="9.5" r="1.5" fill="#06080e" stroke="#4860b8" stroke-width="0.5"/>
      </g>
      <!-- Flange bottom edge highlight -->
      <line x1="6" y1="17" x2="84" y2="17" stroke="#6878a8" stroke-width="1.5"/>

      <!-- ══════════════════════════════════════
           PROPELLANT INLETS
           ══════════════════════════════════════ -->
      <!-- Oxidizer manifold (left, blue) -->
      <rect x="2" y="27" width="14" height="9" rx="2"
        fill="url(#thr2-ox)" stroke="#183898" stroke-width="0.9"/>
      <text x="9" y="33.8" text-anchor="middle" font-size="3.8"
        font-family="monospace" fill="#78a8ee">OX</text>
      <circle cx="14.5" cy="31.5" r="2"
        :fill="oxidizerEnabled ? '#1870ff' : '#061428'"
        :opacity="oxidizerEnabled ? 1 : 0.5"
        filter="url(#thr2-led)"/>
      <!-- Pipe stub connecting to body -->
      <rect x="14" y="30" width="2.5" height="3" fill="#1848b0"/>

      <!-- Fuel manifold (right, orange) -->
      <rect x="74" y="27" width="14" height="9" rx="2"
        fill="url(#thr2-fu)" stroke="#982208" stroke-width="0.9"/>
      <text x="81" y="33.8" text-anchor="middle" font-size="3.8"
        font-family="monospace" fill="#de7848">FL</text>
      <circle cx="75.5" cy="31.5" r="2"
        :fill="fuelEnabled ? '#ff5010' : '#28080a'"
        :opacity="fuelEnabled ? 1 : 0.5"
        filter="url(#thr2-led)"/>
      <rect x="73.5" y="30" width="2.5" height="3" fill="#9a2808"/>

      <!-- ══════════════════════════════════════
           MAIN THRUSTER BODY
           ══════════════════════════════════════ -->
      <rect x="14" y="17" width="62" height="57" rx="3"
        fill="url(#thr2-bdy)" stroke="#2c3670" stroke-width="1.5"
        filter="url(#thr2-shadow)"/>
      <!-- Top specular highlight -->
      <rect x="14" y="17" width="62" height="4" rx="3" fill="#b0c2dc" opacity="0.18"/>
      <!-- Left-edge specular -->
      <rect x="14" y="17" width="3"  height="57" rx="1" fill="#8898c8" opacity="0.14"/>
      <!-- Structural rib lines -->
      <line x1="15" y1="26" x2="75" y2="26" stroke="#1a2248" stroke-width="0.6"/>
      <line x1="15" y1="37" x2="75" y2="37" stroke="#1a2248" stroke-width="0.6"/>
      <line x1="15" y1="48" x2="75" y2="48" stroke="#1a2248" stroke-width="0.6"/>
      <line x1="15" y1="59" x2="75" y2="59" stroke="#1a2248" stroke-width="0.6"/>
      <!-- Panel dividers (vertical) -->
      <line x1="27" y1="26" x2="27" y2="59" stroke="#141c42" stroke-width="0.5"/>
      <line x1="63" y1="26" x2="63" y2="59" stroke="#141c42" stroke-width="0.5"/>

      <!-- Combustion chamber viewing port -->
      <rect x="30" y="28" width="30" height="22" rx="3"
        fill="#080a16" stroke="#1a2040" stroke-width="0.8"/>
      <!-- Chamber glow – two nested layers -->
      <rect x="32" y="30" width="26" height="18" rx="2"
        fill="#ff8018"
        :opacity="thrustLevel * 0.82"
        filter="url(#thr2-cmb)"/>
      <rect x="36" y="33" width="18" height="12" rx="1.5"
        fill="#ffe030"
        :opacity="thrustLevel * 0.58"
        filter="url(#thr2-cmb)"/>
      <!-- Chamber port inner frame -->
      <rect x="30" y="28" width="30" height="22" rx="3"
        fill="none" stroke="#1e2850" stroke-width="0.5"/>

      <!-- Valve actuator solenoid bumps (both sides) -->
      <rect x="10" y="39" width="6" height="13" rx="2"
        fill="#222840" stroke="#323858" stroke-width="0.8"/>
      <rect x="11" y="41" width="4" height="4" rx="1"
        fill="#3848a8" :opacity="oxidizerEnabled ? 0.95 : 0.25"/>
      <rect x="74" y="39" width="6" height="13" rx="2"
        fill="#222840" stroke="#323858" stroke-width="0.8"/>
      <rect x="75" y="41" width="4" height="4" rx="1"
        fill="#a03818" :opacity="fuelEnabled ? 0.95 : 0.25"/>

      <!-- Status panel -->
      <rect x="17" y="52" width="56" height="20" rx="2"
        fill="#040710" stroke="#141c28" stroke-width="0.8"/>
      <!-- LED: PWR -->
      <circle cx="27" cy="58.5" r="3"
        :fill="thrustLevel > 0 ? '#18e060' : '#061408'"
        filter="url(#thr2-led)"/>
      <text x="27" y="67" text-anchor="middle" font-size="3"
        font-family="monospace"
        :fill="thrustLevel > 0 ? '#28a048' : '#1e2e20'">PWR</text>
      <!-- LED: OX -->
      <circle cx="45" cy="58.5" r="3"
        :fill="oxidizerEnabled ? '#1888ff' : '#060e1c'"
        filter="url(#thr2-led)"/>
      <text x="45" y="67" text-anchor="middle" font-size="3"
        font-family="monospace"
        :fill="oxidizerEnabled ? '#205888' : '#181e30'">OX</text>
      <!-- LED: FUL -->
      <circle cx="63" cy="58.5" r="3"
        :fill="fuelEnabled ? '#ff5818' : '#160a04'"
        filter="url(#thr2-led)"/>
      <text x="63" y="67" text-anchor="middle" font-size="3"
        font-family="monospace"
        :fill="fuelEnabled ? '#884020' : '#2c1810'">FUL</text>
      <!-- Thrust level bar track -->
      <rect x="17" y="68.5" width="56" height="2.5" rx="1.2"
        fill="#080c18" stroke="#141e28" stroke-width="0.3"/>
      <!-- Thrust level bar fill -->
      <rect x="18" y="68.8" :width="54 * thrustLevel" height="1.9" rx="0.9"
        :fill="thrustBarColor" opacity="0.92"/>

      <!-- ══════════════════════════════════════
           DE LAVAL BELL NOZZLE
           ══════════════════════════════════════ -->
      <!-- Main nozzle body (convergent → throat → divergent bell) -->
      <path
        d="M 14,74 L 32,83 C 24,91 16,97 16,108 L 74,108 C 74,97 66,91 58,83 L 76,74 Z"
        fill="url(#thr2-nzl)" stroke="#283c50" stroke-width="1.5"
        stroke-linejoin="round" filter="url(#thr2-shadow)"/>
      <!-- Convergent-section highlight lines (left) -->
      <line x1="17" y1="74" x2="34" y2="83" stroke="#7c9aaa" stroke-width="0.5" opacity="0.30"/>
      <line x1="21" y1="74" x2="37" y2="83" stroke="#7c9aaa" stroke-width="0.4" opacity="0.18"/>
      <!-- Convergent-section highlight lines (right) -->
      <line x1="73" y1="74" x2="56" y2="83" stroke="#7c9aaa" stroke-width="0.5" opacity="0.30"/>
      <line x1="69" y1="74" x2="53" y2="83" stroke="#7c9aaa" stroke-width="0.4" opacity="0.18"/>
      <!-- Throat annular detail -->
      <line x1="32" y1="83" x2="58" y2="83" stroke="#8898a8" stroke-width="0.8" opacity="0.42"/>
      <ellipse cx="45" cy="83" rx="13" ry="2.5"
        fill="none" stroke="#5878a0" stroke-width="0.5" opacity="0.32"/>
      <!-- Bell divergent ribs (subtle) -->
      <line x1="23" y1="90" x2="19" y2="101" stroke="#3858a0" stroke-width="0.4" opacity="0.25"/>
      <line x1="67" y1="90" x2="71" y2="101" stroke="#3858a0" stroke-width="0.4" opacity="0.25"/>
      <!-- Exit plane ring (outer bright ring at nozzle exit) -->
      <ellipse cx="45" cy="108" rx="29" ry="3.5"
        fill="none" stroke="#4868a0" stroke-width="1.2" opacity="0.58"/>
      <!-- Inner nozzle heat glow (when firing) -->
      <path v-if="thrustLevel > 0"
        d="M 33,83 C 26,91 18,97 18,108 L 72,108 C 72,97 64,91 57,83 Z"
        fill="#ff6018"
        :opacity="thrustLevel * 0.52"
        filter="url(#thr2-heat)"/>
      <!-- Throat hot-spot (bright centre when full thrust) -->
      <ellipse v-if="thrustLevel > 0.2" cx="45" cy="86" rx="8" ry="3"
        fill="#ffe040"
        :opacity="(thrustLevel - 0.2) * 0.65"
        filter="url(#thr2-heat)"/>

      <!-- ══════════════════════════════════════
           EXHAUST PLUME  (vacuum-expansion style)
           ══════════════════════════════════════ -->
      <g v-if="thrustLevel > 0" :opacity="thrustLevel">

        <!-- Ambient outer glow halo (wide ellipse, pulsing) -->
        <ellipse cx="45" cy="135" rx="40" ry="30"
          fill="#3848d0" opacity="0.07" class="plume-breathe"/>

        <!-- Outer plume envelope (clipped to expanding cone) -->
        <g clip-path="url(#thr2-plume-clip)">
          <!-- Outer diffuse layer (no distortion for clean edges) -->
          <rect x="2" y="108" width="86" height="92" fill="url(#thr2-plume-o)"/>
          <!-- Mid-layer with plasma turbulence distortion -->
          <rect x="6" y="108" width="78" height="88" fill="url(#thr2-plume-m)"
            filter="url(#thr2-plasma)" class="plume-wave"/>
        </g>

        <!-- Shock diamonds (Mach disk structures, staggered pulse) -->
        <g filter="url(#thr2-diamond)">
          <ellipse cx="45" cy="116" rx="14"  ry="5"   fill="rgba(224,244,255,0.88)" class="shock-d1"/>
          <ellipse cx="45" cy="130" rx="10"  ry="3.8" fill="rgba(208,236,255,0.76)" class="shock-d2"/>
          <ellipse cx="45" cy="144" rx="7"   ry="2.8" fill="rgba(188,224,255,0.64)" class="shock-d3"/>
          <ellipse cx="45" cy="157" rx="4.5" ry="2"   fill="rgba(165,210,255,0.48)" class="shock-d4"/>
        </g>

        <!-- Inner plasma core (hot, white-cyan, clipped) -->
        <g clip-path="url(#thr2-core-clip)" filter="url(#thr2-coreglow)">
          <rect x="37" y="108" width="16" height="82" fill="url(#thr2-core)"/>
        </g>

        <!-- Exit-plane flash ring (bright at nozzle exit) -->
        <ellipse cx="45" cy="109" rx="24" ry="7"
          fill="url(#thr2-exit)" class="exit-flash"/>

      </g>

      <!-- ══════════════════════════════════════
           INVALID STATE OVERLAY
           ══════════════════════════════════════ -->
      <rect v-if="isInvalid" x="0" y="0" width="90" height="200"
        fill="#ff0000" opacity="0.18"/>
      <rect v-if="isInvalid" x="0" y="0" width="90" height="200"
        fill="none" stroke="#ff2828" stroke-width="2.5" stroke-dasharray="8 5"/>
    </svg>

    <!-- Name label (below node) -->
    <div v-if="nodeName" class="thr-label">{{ nodeName }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useNodeData } from "./useNodeData";

const { d } = useNodeData(90, 200);

const thrustLevel = computed(() =>
  Math.max(0, Math.min(1, Number(d.value.thrustLevel ?? 0))));

const oxidizerEnabled = computed(() => {
  const v = d.value.oxidizerEnabled;
  return v === true || v === "true" || String(v) === "1";
});

const fuelEnabled = computed(() => {
  const v = d.value.fuelEnabled;
  return v === true || v === "true" || String(v) === "1";
});

const isInvalid = computed(() => !!d.value.isInvalid);
const nodeName  = computed(() => (d.value.name as string)?.trim() || "");

const thrustBarColor = computed(() => {
  const t = thrustLevel.value;
  if (t < 0.3)  return "#18e060";
  if (t < 0.65) return "#ffa018";
  return "#ff4018";
});
</script>

<style scoped>
.node-wrap {
  width: 100%;
  height: 100%;
  overflow: visible;
  position: relative;
}
svg {
  overflow: visible;
  display: block;
  width: 100%;
  height: 100%;
}

/* ── Plume animations ────────────────────────────────── */
@keyframes plume-breathe {
  0%, 100% { transform: scale(1);    opacity: 0.07; }
  50%       { transform: scale(1.15); opacity: 0.12; }
}
@keyframes plume-wave {
  0%   { transform: skewX(0deg)   scaleX(1.00); }
  20%  { transform: skewX(1.8deg) scaleX(1.02); }
  45%  { transform: skewX(-1.2deg) scaleX(0.98); }
  70%  { transform: skewX(2.2deg) scaleX(1.01); }
  100% { transform: skewX(0deg)   scaleX(1.00); }
}
@keyframes shock-pulse {
  0%, 100% { opacity: 0.68; }
  50%       { opacity: 1.00; }
}
@keyframes exit-flash {
  0%, 100% { opacity: 0.55; }
  45%       { opacity: 0.82; }
}

.plume-breathe {
  transform-box: fill-box;
  transform-origin: center;
  animation: plume-breathe 2.0s ease-in-out infinite;
}
.plume-wave {
  transform-box: fill-box;
  transform-origin: 50% 0%;
  animation: plume-wave 0.95s ease-in-out infinite;
}
.shock-d1 {
  transform-box: fill-box;
  transform-origin: center;
  animation: shock-pulse 0.82s ease-in-out infinite 0s;
}
.shock-d2 {
  transform-box: fill-box;
  transform-origin: center;
  animation: shock-pulse 0.82s ease-in-out infinite -0.27s;
}
.shock-d3 {
  transform-box: fill-box;
  transform-origin: center;
  animation: shock-pulse 0.82s ease-in-out infinite -0.55s;
}
.shock-d4 {
  transform-box: fill-box;
  transform-origin: center;
  animation: shock-pulse 0.82s ease-in-out infinite -0.68s;
}
.exit-flash {
  transform-box: fill-box;
  transform-origin: center;
  animation: exit-flash 0.72s ease-in-out infinite;
}

/* ── Label ── */
.thr-label {
  position: absolute;
  bottom: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  font-family: monospace;
  color: #96aabb;
  white-space: nowrap;
  pointer-events: none;
}
</style>
