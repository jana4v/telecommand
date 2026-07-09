<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg class="body-svg" viewBox="0 0 90 200" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Metallic gradients -->
        <linearGradient id="mpt-flg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#98a8bf"/>
          <stop offset="30%"  stop-color="#ccd8e8"/>
          <stop offset="68%"  stop-color="#8898b0"/>
          <stop offset="100%" stop-color="#404e64"/>
        </linearGradient>
        <linearGradient id="mpt-bdy" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#1a1a20"/>
          <stop offset="14%"  stop-color="#38302c"/>
          <stop offset="40%"  stop-color="#605040"/>
          <stop offset="60%"  stop-color="#584840"/>
          <stop offset="86%"  stop-color="#30281c"/>
          <stop offset="100%" stop-color="#141010"/>
        </linearGradient>
        <linearGradient id="mpt-nzl" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#101820"/>
          <stop offset="10%"  stop-color="#3c4e5e"/>
          <stop offset="33%"  stop-color="#788898"/>
          <stop offset="50%"  stop-color="#8ea0b0"/>
          <stop offset="67%"  stop-color="#687888"/>
          <stop offset="90%"  stop-color="#2e3e50"/>
          <stop offset="100%" stop-color="#0c1620"/>
        </linearGradient>
        <linearGradient id="mpt-fu-pipe" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#3c1606"/>
          <stop offset="50%"  stop-color="#a83010"/>
          <stop offset="100%" stop-color="#3c1606"/>
        </linearGradient>
        <!-- Catalyst bed amber glow -->
        <radialGradient id="mpt-catbed" cx="50%" cy="50%" r="60%">
          <stop offset="0%"   stop-color="#ffe860" stop-opacity="1"/>
          <stop offset="45%"  stop-color="#ffa030" stop-opacity="0.85"/>
          <stop offset="100%" stop-color="#c05010" stop-opacity="0"/>
        </radialGradient>
        <!-- Plume outer (warm amber-blue, hydrazine) -->
        <linearGradient id="mpt-plume-o" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#f0dca8" stop-opacity="0.90"/>
          <stop offset="18%"  stop-color="#d0a860" stop-opacity="0.72"/>
          <stop offset="38%"  stop-color="#9890d8" stop-opacity="0.52"/>
          <stop offset="65%"  stop-color="#6060c0" stop-opacity="0.24"/>
          <stop offset="100%" stop-color="#3030a0" stop-opacity="0"/>
        </linearGradient>
        <!-- Plume mid -->
        <linearGradient id="mpt-plume-m" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#fff0d0" stop-opacity="0.60"/>
          <stop offset="28%"  stop-color="#d0b888" stop-opacity="0.42"/>
          <stop offset="65%"  stop-color="#8888d0" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="#4040b0" stop-opacity="0"/>
        </linearGradient>
        <!-- Inner core (warm white-gold) -->
        <linearGradient id="mpt-core" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#ffffff"  stop-opacity="1.00"/>
          <stop offset="20%"  stop-color="#fff8e0"  stop-opacity="0.95"/>
          <stop offset="50%"  stop-color="#e8d8a0"  stop-opacity="0.72"/>
          <stop offset="80%"  stop-color="#c8a840"  stop-opacity="0.36"/>
          <stop offset="100%" stop-color="#a08020"  stop-opacity="0"/>
        </linearGradient>
        <!-- Exit flash -->
        <radialGradient id="mpt-exit" cx="50%" cy="30%" r="70%">
          <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.85"/>
          <stop offset="40%"  stop-color="#ffe8a0" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#d0a040" stop-opacity="0"/>
        </radialGradient>

        <!-- Clip paths -->
        <clipPath id="mpt-plume-clip">
          <path d="M 16,108 Q 6,155 2,196 L 88,196 Q 84,155 74,108 Z"/>
        </clipPath>
        <clipPath id="mpt-core-clip">
          <path d="M 37,108 Q 39,152 38,188 L 52,188 Q 51,152 53,108 Z"/>
        </clipPath>

        <!-- Filters -->
        <filter id="mpt-led" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="1.6" result="b"/>
          <feComposite in="SourceGraphic" in2="b" operator="over"/>
        </filter>
        <filter id="mpt-cmb" x="-90%" y="-90%" width="280%" height="280%">
          <feGaussianBlur stdDeviation="4.5" result="b"/>
          <feComposite in="SourceGraphic" in2="b" operator="over"/>
        </filter>
        <filter id="mpt-heat" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.2" result="b"/>
          <feComposite in="SourceGraphic" in2="b" operator="over"/>
        </filter>
        <filter id="mpt-diamond" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2.8" result="b"/>
          <feComposite in="SourceGraphic" in2="b" operator="over"/>
        </filter>
        <filter id="mpt-coreglow" x="-120%" y="-10%" width="340%" height="120%">
          <feGaussianBlur stdDeviation="2.2" result="b"/>
          <feComposite in="SourceGraphic" in2="b" operator="over"/>
        </filter>
        <filter id="mpt-shadow">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" flood-color="#00000070"/>
        </filter>
        <filter id="mpt-catglow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3.8" result="b"/>
          <feComposite in="SourceGraphic" in2="b" operator="over"/>
        </filter>
        <!-- Plasma turbulence (warm, different seed from biprop) -->
        <filter id="mpt-plasma" x="-12%" y="-4%" width="124%" height="108%">
          <feTurbulence type="fractalNoise" baseFrequency="0.038 0.065"
            numOctaves="3" seed="11" result="noise">
            <animate attributeName="baseFrequency"
              values="0.034 0.062;0.046 0.080;0.037 0.068;0.043 0.072;0.034 0.062"
              dur="1.4s" repeatCount="indefinite"/>
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.5"
            xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </defs>

      <!-- MOUNTING FLANGE -->
      <rect x="6" y="2" width="78" height="15" rx="2.5"
        fill="url(#mpt-flg)" stroke="#485870" stroke-width="1.2"
        filter="url(#mpt-shadow)"/>
      <rect x="6" y="2" width="78" height="3.5" rx="2.5" fill="#dce8f4" opacity="0.28"/>
      <!-- Bolt holes -->
      <g fill="#0c1220" stroke="#5858a0" stroke-width="0.8">
        <circle cx="17"  cy="9.5" r="3.5"/><circle cx="17"  cy="9.5" r="1.5" fill="#06060e" stroke="#6060b0" stroke-width="0.5"/>
        <circle cx="38"  cy="9.5" r="3.5"/><circle cx="38"  cy="9.5" r="1.5" fill="#06060e" stroke="#6060b0" stroke-width="0.5"/>
        <circle cx="52"  cy="9.5" r="3.5"/><circle cx="52"  cy="9.5" r="1.5" fill="#06060e" stroke="#6060b0" stroke-width="0.5"/>
        <circle cx="73"  cy="9.5" r="3.5"/><circle cx="73"  cy="9.5" r="1.5" fill="#06060e" stroke="#6060b0" stroke-width="0.5"/>
      </g>
      <line x1="6" y1="17" x2="84" y2="17" stroke="#887860" stroke-width="1.5"/>

      <!-- SINGLE CENTRED PROPELLANT INLET -->
      <rect x="27" y="17" width="36" height="12" rx="2.5"
        fill="url(#mpt-fu-pipe)" stroke="#983010" stroke-width="0.9"/>
      <text x="45" y="24.8" text-anchor="middle" font-size="4"
        font-family="monospace" fill="#de9060">PROP</text>
      <!-- Inlet valve LED -->
      <circle cx="58" cy="23" r="2.2"
        :fill="fuelEnabled ? '#ff6820' : '#28100a'"
        :opacity="fuelEnabled ? 1 : 0.5"
        filter="url(#mpt-led)"/>
      <!-- Pipe stub down to body -->
      <rect x="43" y="28" width="4" height="3" fill="#9a2808"/>

      <!-- MAIN THRUSTER BODY -->
      <rect x="14" y="17" width="62" height="57" rx="3"
        fill="url(#mpt-bdy)" stroke="#4a3828" stroke-width="1.5"
        filter="url(#mpt-shadow)"/>
      <rect x="14" y="17" width="62" height="4" rx="3" fill="#c8b890" opacity="0.12"/>
      <rect x="14" y="17" width="3"  height="57" rx="1" fill="#a89870" opacity="0.10"/>
      <!-- Structural ribs -->
      <line x1="15" y1="26" x2="75" y2="26" stroke="#281e14" stroke-width="0.6"/>
      <line x1="15" y1="37" x2="75" y2="37" stroke="#281e14" stroke-width="0.6"/>
      <line x1="15" y1="48" x2="75" y2="48" stroke="#281e14" stroke-width="0.6"/>
      <line x1="15" y1="59" x2="75" y2="59" stroke="#281e14" stroke-width="0.6"/>
      <line x1="27" y1="26" x2="27" y2="59" stroke="#201610" stroke-width="0.5"/>
      <line x1="63" y1="26" x2="63" y2="59" stroke="#201610" stroke-width="0.5"/>

      <!-- CATALYST BED WINDOW (amber glow, monoprop characteristic) -->
      <rect x="30" y="28" width="30" height="22" rx="3"
        fill="#080810" stroke="#301808" stroke-width="0.8"/>
      <!-- Outer amber glow -->
      <rect x="32" y="30" width="26" height="18" rx="2"
        fill="#ffa030"
        :opacity="thrustLevel > 0 ? thrustLevel * 0.78 : 0.12"
        filter="url(#mpt-catglow)"/>
      <!-- Inner hot spot -->
      <rect x="36" y="33" width="18" height="12" rx="1.5"
        fill="#ffe860"
        :opacity="thrustLevel > 0 ? thrustLevel * 0.55 : 0.06"
        filter="url(#mpt-cmb)"/>
      <!-- "CAT BED" label when not firing -->
      <text v-if="thrustLevel === 0" x="45" y="41" text-anchor="middle"
        font-size="3.8" font-family="monospace" fill="#806040" opacity="0.7">CAT BED</text>
      <!-- Chamber port frame -->
      <rect x="30" y="28" width="30" height="22" rx="3"
        fill="none" stroke="#3a2010" stroke-width="0.5"/>

      <!-- Single valve solenoid (left side only, monoprop has one valve) -->
      <rect x="10" y="39" width="6" height="13" rx="2"
        fill="#1c1810" stroke="#3c3020" stroke-width="0.8"/>
      <rect x="11" y="41" width="4" height="4" rx="1"
        fill="#c06020" :opacity="fuelEnabled ? 0.95 : 0.25"/>

      <!-- STATUS PANEL -->
      <rect x="17" y="52" width="56" height="20" rx="2"
        fill="#040506" stroke="#201408" stroke-width="0.8"/>
      <!-- LED: PWR -->
      <circle cx="30" cy="58.5" r="3"
        :fill="thrustLevel > 0 ? '#18e060' : '#061408'"
        filter="url(#mpt-led)"/>
      <text x="30" y="67" text-anchor="middle" font-size="3"
        font-family="monospace"
        :fill="thrustLevel > 0 ? '#28a048' : '#1e2e20'">PWR</text>
      <!-- LED: PROP -->
      <circle cx="60" cy="58.5" r="3"
        :fill="fuelEnabled ? '#ff7030' : '#200c06'"
        filter="url(#mpt-led)"/>
      <text x="60" y="67" text-anchor="middle" font-size="3"
        font-family="monospace"
        :fill="fuelEnabled ? '#905030' : '#2c1808'">PROP</text>
      <!-- Thrust bar track -->
      <rect x="17" y="68.5" width="56" height="2.5" rx="1.2"
        fill="#080608" stroke="#181008" stroke-width="0.3"/>
      <!-- Thrust bar fill -->
      <rect x="18" y="68.8" :width="54 * thrustLevel" height="1.9" rx="0.9"
        :fill="thrustBarColor" opacity="0.92"/>

      <!-- DE LAVAL BELL NOZZLE -->
      <path
        d="M 14,74 L 32,83 C 24,91 16,97 16,108 L 74,108 C 74,97 66,91 58,83 L 76,74 Z"
        fill="url(#mpt-nzl)" stroke="#3c2c1c" stroke-width="1.5"
        stroke-linejoin="round" filter="url(#mpt-shadow)"/>
      <line x1="17" y1="74" x2="34" y2="83" stroke="#9a8a6a" stroke-width="0.5" opacity="0.28"/>
      <line x1="21" y1="74" x2="37" y2="83" stroke="#9a8a6a" stroke-width="0.4" opacity="0.16"/>
      <line x1="73" y1="74" x2="56" y2="83" stroke="#9a8a6a" stroke-width="0.5" opacity="0.28"/>
      <line x1="69" y1="74" x2="53" y2="83" stroke="#9a8a6a" stroke-width="0.4" opacity="0.16"/>
      <line x1="32" y1="83" x2="58" y2="83" stroke="#a89878" stroke-width="0.8" opacity="0.40"/>
      <ellipse cx="45" cy="83" rx="13" ry="2.5"
        fill="none" stroke="#907850" stroke-width="0.5" opacity="0.30"/>
      <line x1="23" y1="90" x2="19" y2="101" stroke="#806840" stroke-width="0.4" opacity="0.22"/>
      <line x1="67" y1="90" x2="71" y2="101" stroke="#806840" stroke-width="0.4" opacity="0.22"/>
      <ellipse cx="45" cy="108" rx="29" ry="3.5"
        fill="none" stroke="#907850" stroke-width="1.2" opacity="0.55"/>
      <!-- Inner nozzle heat glow (amber when firing) -->
      <path v-if="thrustLevel > 0"
        d="M 33,83 C 26,91 18,97 18,108 L 72,108 C 72,97 64,91 57,83 Z"
        fill="#ff8820"
        :opacity="thrustLevel * 0.50"
        filter="url(#mpt-heat)"/>
      <ellipse v-if="thrustLevel > 0.2" cx="45" cy="86" rx="8" ry="3"
        fill="#ffd040"
        :opacity="(thrustLevel - 0.2) * 0.62"
        filter="url(#mpt-heat)"/>

      <!-- EXHAUST PLUME (warm amber-blue, hydrazine monoprop) -->
      <g v-if="thrustLevel > 0" :opacity="thrustLevel">

        <!-- Ambient halo (amber tinted) -->
        <ellipse cx="45" cy="135" rx="40" ry="30"
          fill="#c08820" opacity="0.06" class="plume-breathe"/>

        <!-- Outer plume envelope -->
        <g clip-path="url(#mpt-plume-clip)">
          <rect x="2" y="108" width="86" height="92" fill="url(#mpt-plume-o)"/>
          <rect x="6" y="108" width="78" height="88" fill="url(#mpt-plume-m)"
            filter="url(#mpt-plasma)" class="plume-wave"/>
        </g>

        <!-- Shock diamonds (amber-tinted) -->
        <g filter="url(#mpt-diamond)">
          <ellipse cx="45" cy="116" rx="14"  ry="5"   fill="rgba(255,240,185,0.86)" class="shock-d1"/>
          <ellipse cx="45" cy="130" rx="10"  ry="3.8" fill="rgba(240,215,165,0.74)" class="shock-d2"/>
          <ellipse cx="45" cy="144" rx="7"   ry="2.8" fill="rgba(210,185,145,0.62)" class="shock-d3"/>
          <ellipse cx="45" cy="157" rx="4.5" ry="2"   fill="rgba(185,160,120,0.46)" class="shock-d4"/>
        </g>

        <!-- Inner plasma core (warm white-gold) -->
        <g clip-path="url(#mpt-core-clip)" filter="url(#mpt-coreglow)">
          <rect x="37" y="108" width="16" height="82" fill="url(#mpt-core)"/>
        </g>

        <!-- Exit flash (amber) -->
        <ellipse cx="45" cy="109" rx="24" ry="7"
          fill="url(#mpt-exit)" class="exit-flash"/>

      </g>

      <!-- INVALID STATE OVERLAY -->
      <rect v-if="isInvalid" x="0" y="0" width="90" height="200"
        fill="#ff0000" opacity="0.18"/>
      <rect v-if="isInvalid" x="0" y="0" width="90" height="200"
        fill="none" stroke="#ff2828" stroke-width="2.5" stroke-dasharray="8 5"/>
    </svg>

    <div v-if="nodeName" class="mpt-label">{{ nodeName }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useNodeData } from "./useNodeData";

const { d } = useNodeData(90, 200);

const thrustLevel = computed(() =>
  Math.max(0, Math.min(1, Number(d.value.thrustLevel ?? 0))));

const fuelEnabled = computed(() => {
  const v = d.value.fuelEnabled;
  return v === true || v === "true" || String(v) === "1";
});

const isInvalid = computed(() => !!d.value.isInvalid);
const nodeName  = computed(() => (d.value.name as string)?.trim() || "");

const thrustBarColor = computed(() => {
  const t = thrustLevel.value;
  if (t < 0.3)  return "#18e060";
  if (t < 0.65) return "#ffa030";
  return "#ff6820";
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

/* Plume animations */
@keyframes plume-breathe {
  0%, 100% { transform: scale(1);    opacity: 0.06; }
  50%       { transform: scale(1.15); opacity: 0.11; }
}
@keyframes plume-wave {
  0%   { transform: skewX(0deg)   scaleX(1.00); }
  20%  { transform: skewX(1.8deg) scaleX(1.02); }
  45%  { transform: skewX(-1.2deg) scaleX(0.98); }
  70%  { transform: skewX(2.2deg) scaleX(1.01); }
  100% { transform: skewX(0deg)   scaleX(1.00); }
}
@keyframes shock-pulse {
  0%, 100% { opacity: 0.65; }
  50%       { opacity: 0.98; }
}
@keyframes exit-flash {
  0%, 100% { opacity: 0.52; }
  45%       { opacity: 0.80; }
}

.plume-breathe {
  transform-box: fill-box;
  transform-origin: center;
  animation: plume-breathe 2.2s ease-in-out infinite;
}
.plume-wave {
  transform-box: fill-box;
  transform-origin: 50% 0%;
  animation: plume-wave 1.05s ease-in-out infinite;
}
.shock-d1 {
  transform-box: fill-box;
  transform-origin: center;
  animation: shock-pulse 0.88s ease-in-out infinite 0s;
}
.shock-d2 {
  transform-box: fill-box;
  transform-origin: center;
  animation: shock-pulse 0.88s ease-in-out infinite -0.29s;
}
.shock-d3 {
  transform-box: fill-box;
  transform-origin: center;
  animation: shock-pulse 0.88s ease-in-out infinite -0.58s;
}
.shock-d4 {
  transform-box: fill-box;
  transform-origin: center;
  animation: shock-pulse 0.88s ease-in-out infinite -0.72s;
}
.exit-flash {
  transform-box: fill-box;
  transform-origin: center;
  animation: exit-flash 0.78s ease-in-out infinite;
}

.mpt-label {
  position: absolute;
  bottom: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  font-family: monospace;
  color: #c8a878;
  white-space: nowrap;
  pointer-events: none;
}
</style>
