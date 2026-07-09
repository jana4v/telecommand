<template>
  <div class="node-wrap" :style="{ opacity: d.opacity ?? 1 }">
    <svg :width="w" :height="h" :viewBox="`0 0 120 160`" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient :id="`rb-metal-${uid}`" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stop-color="#6a8090"/>
          <stop offset="30%"  stop-color="#b0c4d0"/>
          <stop offset="65%"  stop-color="#8898a8"/>
          <stop offset="100%" stop-color="#344050"/>
        </linearGradient>
        <linearGradient :id="`rb-dark-${uid}`" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stop-color="#28363f"/>
          <stop offset="100%" stop-color="#111820"/>
        </linearGradient>
        <linearGradient :id="`rb-chair-${uid}`" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stop-color="#1e2c38"/>
          <stop offset="100%" stop-color="#0e1820"/>
        </linearGradient>
        <filter :id="`rb-glow-${uid}`" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.8" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>


      <!-- ── CHAIR ─────────────────────────────────────────────────────────── -->
      <!-- Backrest (right side — robot leans right when reclined) -->
      <rect x="100" y="38" width="12" height="62" rx="4" :fill="`url(#rb-chair-${uid})`"/>
      <rect x="101" y="39" width="6"  height="60" rx="3" fill="rgba(255,255,255,0.04)"/>
      <!-- Seat -->
      <rect x="8" y="96" width="104" height="10" rx="4" :fill="`url(#rb-chair-${uid})`"/>
      <rect x="8" y="96" width="104" height="3"  rx="3" fill="rgba(255,255,255,0.05)"/>
      <!-- Front legs -->
      <rect x="12"  y="106" width="6" height="34" rx="2" :fill="`url(#rb-dark-${uid})`"/>
      <rect x="102" y="106" width="6" height="34" rx="2" :fill="`url(#rb-dark-${uid})`"/>
      <!-- Footrest -->
      <rect x="12" y="134" width="96" height="4" rx="2" :fill="`url(#rb-dark-${uid})`"/>
      <!-- Armrests -->
      <rect x="8"   y="80" width="8"  height="18" rx="3" :fill="`url(#rb-chair-${uid})`"/>
      <rect x="104" y="80" width="8"  height="18" rx="3" :fill="`url(#rb-chair-${uid})`"/>

      <!-- ── LEGS (fixed to seat, independent of body tilt) ────────────────── -->
      <!-- Left thigh — pivot at (42, 96) -->
      <g transform="translate(42, 96)">
        <g :style="leftThighStyle">
          <rect x="-7" y="0" width="13" height="26" rx="4" :fill="`url(#rb-metal-${uid})`"/>
          <circle cx="0" cy="0"  r="6"  :fill="`url(#rb-dark-${uid})`"/>
          <circle cx="0" cy="26" r="5"  :fill="`url(#rb-dark-${uid})`"/>
          <!-- Left shin — pivot at (0, 26) -->
          <g transform="translate(0, 26)">
            <g :style="leftShinStyle">
              <rect x="-6" y="0" width="12" height="24" rx="4" :fill="`url(#rb-metal-${uid})`"/>
              <!-- Foot -->
              <rect x="-10" y="24" width="20" height="7" rx="3" :fill="`url(#rb-dark-${uid})`"/>
            </g>
          </g>
        </g>
      </g>

      <!-- Right thigh — pivot at (78, 96) -->
      <g transform="translate(78, 96)">
        <g :style="rightThighStyle">
          <rect x="-7" y="0" width="13" height="26" rx="4" :fill="`url(#rb-metal-${uid})`"/>
          <circle cx="0" cy="0"  r="6"  :fill="`url(#rb-dark-${uid})`"/>
          <circle cx="0" cy="26" r="5"  :fill="`url(#rb-dark-${uid})`"/>
          <g transform="translate(0, 26)">
            <g :style="rightShinStyle">
              <rect x="-6" y="0" width="12" height="24" rx="4" :fill="`url(#rb-metal-${uid})`"/>
              <rect x="-10" y="24" width="20" height="7" rx="3" :fill="`url(#rb-dark-${uid})`"/>
            </g>
          </g>
        </g>
      </g>

      <!-- ── UPPER BODY (tilts around hip pivot 60, 94) ────────────────────── -->
      <g transform="translate(60, 94)">
        <g :style="bodyStyle">

          <!-- Pelvis -->
          <rect x="-20" y="-10" width="40" height="10" rx="4" :fill="`url(#rb-dark-${uid})`"/>

          <!-- Torso -->
          <rect x="-19" y="-48" width="38" height="38" rx="6" :fill="`url(#rb-metal-${uid})`"/>
          <!-- Torso panel -->
          <rect x="-13" y="-44" width="26" height="24" rx="4" :fill="`url(#rb-dark-${uid})`" opacity="0.75"/>
          <!-- Chest reactor -->
          <circle cx="0" cy="-36" r="6" :fill="`url(#rb-dark-${uid})`"/>
          <circle cx="0" cy="-36" r="4" :fill="accentColor" :filter="`url(#rb-glow-${uid})`" opacity="0.95"/>
          <!-- LED strip -->
          <rect x="-9" y="-25" width="18" height="4" rx="2" :fill="`url(#rb-dark-${uid})`"/>
          <circle v-for="i in 5" :key="i" :cx="-7 + (i-1)*3.5" cy="-23" r="1.4"
            :fill="accentColor" :filter="`url(#rb-glow-${uid})`" opacity="0.7"/>

          <!-- Neck -->
          <rect x="-6" y="-58" width="12" height="12" rx="3" :fill="`url(#rb-dark-${uid})`"/>
          <rect x="-5" y="-56" width="10" height="2" rx="1" fill="#506070" opacity="0.6"/>
          <rect x="-5" y="-52" width="10" height="2" rx="1" fill="#506070" opacity="0.6"/>

          <!-- Head -->
          <rect x="-16" y="-84" width="32" height="28" rx="9" :fill="`url(#rb-metal-${uid})`"/>
          <!-- Head top sheen -->
          <rect x="-14" y="-82" width="28" height="10" rx="7" fill="rgba(255,255,255,0.08)"/>
          <!-- Ear panels -->
          <rect x="-20" y="-79" width="5" height="14" rx="2" :fill="`url(#rb-dark-${uid})`"/>
          <rect x="15"  y="-79" width="5" height="14" rx="2" :fill="`url(#rb-dark-${uid})`"/>
          <!-- Eye sockets -->
          <rect x="-14" y="-80" width="12" height="10" rx="3" :fill="`url(#rb-dark-${uid})`"/>
          <rect x="2"   y="-80" width="12" height="10" rx="3" :fill="`url(#rb-dark-${uid})`"/>
          <!-- Eyes (glowing) -->
          <circle cx="-8"  cy="-75" r="4" :fill="accentColor" :filter="`url(#rb-glow-${uid})`"/>
          <circle cx="8"   cy="-75" r="4" :fill="accentColor" :filter="`url(#rb-glow-${uid})`"/>
          <!-- Mouth grille -->
          <rect x="-11" y="-67" width="22" height="6" rx="2" :fill="`url(#rb-dark-${uid})`"/>
          <line v-for="i in 4" :key="i"
            :x1="-7 + (i-1)*4.5" y1="-67" :x2="-7 + (i-1)*4.5" y2="-61"
            stroke="#507090" stroke-width="1" opacity="0.6"/>
          <!-- Antenna -->
          <rect x="-2" y="-96" width="4" height="14" rx="2" :fill="`url(#rb-metal-${uid})`"/>
          <circle cx="0" cy="-98" r="4" :fill="accentColor" :filter="`url(#rb-glow-${uid})`"/>

          <!-- ── RIGHT ARM (body-right → screen-left) ── -->
          <!-- Shoulder ball -->
          <circle cx="-21" cy="-44" r="7" :fill="`url(#rb-dark-${uid})`"/>
          <circle cx="-21" cy="-44" r="4" fill="#506070" opacity="0.4"/>

          <!-- Upper arm — pivot at (-21, -42) -->
          <g transform="translate(-21, -42)">
            <g :style="rightUpperArmStyle">
              <rect x="-6" y="0" width="12" height="25" rx="4" :fill="`url(#rb-metal-${uid})`"/>
              <circle cx="0" cy="0"  r="5.5" :fill="`url(#rb-dark-${uid})`"/>
              <circle cx="0" cy="25" r="5"   :fill="`url(#rb-dark-${uid})`"/>
              <!-- Forearm — pivot at (0, 25) -->
              <g transform="translate(0, 25)">
                <g :style="rightForearmStyle">
                  <rect x="-5" y="0" width="10" height="21" rx="4" :fill="`url(#rb-metal-${uid})`"/>
                  <!-- Hand -->
                  <rect x="-7" y="21" width="14" height="9" rx="4" :fill="`url(#rb-dark-${uid})`"/>
                  <rect x="-4" y="22" width="3" height="7" rx="1" fill="#405060" opacity="0.7"/>
                  <rect x="-1" y="22" width="3" height="7" rx="1" fill="#405060" opacity="0.7"/>
                  <rect x="2"  y="22" width="3" height="7" rx="1" fill="#405060" opacity="0.7"/>
                </g>
              </g>
            </g>
          </g>

          <!-- ── LEFT ARM (body-left → screen-right) ── -->
          <circle cx="21" cy="-44" r="7" :fill="`url(#rb-dark-${uid})`"/>
          <circle cx="21" cy="-44" r="4" fill="#506070" opacity="0.4"/>

          <!-- Upper arm — pivot at (21, -42) -->
          <g transform="translate(21, -42)">
            <g :style="leftUpperArmStyle">
              <rect x="-6" y="0" width="12" height="25" rx="4" :fill="`url(#rb-metal-${uid})`"/>
              <circle cx="0" cy="0"  r="5.5" :fill="`url(#rb-dark-${uid})`"/>
              <circle cx="0" cy="25" r="5"   :fill="`url(#rb-dark-${uid})`"/>
              <g transform="translate(0, 25)">
                <g :style="leftForearmStyle">
                  <rect x="-5" y="0" width="10" height="21" rx="4" :fill="`url(#rb-metal-${uid})`"/>
                  <rect x="-7" y="21" width="14" height="9" rx="4" :fill="`url(#rb-dark-${uid})`"/>
                  <rect x="-4" y="22" width="3" height="7" rx="1" fill="#405060" opacity="0.7"/>
                  <rect x="-1" y="22" width="3" height="7" rx="1" fill="#405060" opacity="0.7"/>
                  <rect x="2"  y="22" width="3" height="7" rx="1" fill="#405060" opacity="0.7"/>
                </g>
              </g>
            </g>
          </g>

        </g>
      </g>

      <!-- Name label -->
      <text v-if="nameLabel"
        :x="titleX" :y="titleY"
        :text-anchor="titleAnchor" dominant-baseline="auto"
        :font-size="nameFs" font-weight="700" font-family="monospace"
        :fill="titleFontColor" opacity="0.85">{{ nameLabel }}</text>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useNodeData } from "./useNodeData";
import { useTitlePosition } from "./useTitlePosition";

const { d, w, h } = useNodeData(120, 160);
const uid = ref(Math.random().toString(36).slice(2, 8));

const nameLabel  = computed(() => (d.value.name as string) || "");
const nameFs     = computed(() => (d.value.titleFontSize as number | undefined) ?? Math.max(7, Math.min(w.value * 0.09, 11)));
const titleFontColor = computed(() => (d.value.titleFontColor as string) || "#7090a8");
const { titleX, titleY, titleAnchor } = useTitlePosition(
  () => d.value.titlePosition as string | undefined,
  () => 0,
  () => w.value,
  () => 0,
  () => h.value,
  "top-center",
);
const accentColor = computed(() => (d.value.statusColor as string) || "#4a9eff");

// ── Telemetry reads ──────────────────────────────────────────────────────────
// posture     → "upright" / "reclined" (or 1/0)
// rightArm    → "forward" / "down"     (or 1/0)
// leftArm     → "forward" / "down"     (or 1/0)
// namaste     → "true" / "false"       (or 1/0)  — overrides individual arm states

function isTruthy(v: any, keywords = ["1","true","on","yes"]): boolean {
  if (v == null) return false;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "boolean") return v;
  return keywords.includes(String(v).toLowerCase().trim());
}

const isUpright  = computed(() => isTruthy(d.value.posture,  ["1","upright","up","true","on","yes","standing"]));
const isNameaste = computed(() => isTruthy(d.value.namaste,  ["1","namaste","pray","true","on","yes"]));
const isRightFwd = computed(() => !isNameaste.value && isTruthy(d.value.rightArm, ["1","forward","fwd","true","on","yes","extend","press","right"]));
const isLeftFwd  = computed(() => !isNameaste.value && isTruthy(d.value.leftArm,  ["1","forward","fwd","true","on","yes","extend","press","left"]));

// ── Transition helper ────────────────────────────────────────────────────────
function rotStyle(deg: number, origin: string, dur = "0.7s"): Record<string, string> {
  return {
    transform: `rotate(${deg}deg)`,
    transformOrigin: origin,
    transition: `transform ${dur} cubic-bezier(0.34, 1.56, 0.64, 1)`,
  };
}

// ── Body posture (rotates around hip at translate origin 0,0) ───────────────
// Reclined (launch) → leans right toward chair backrest (+32°)
const bodyStyle = computed(() => rotStyle(isUpright.value ? 0 : 32, "0px 0px", "0.9s"));

// ── Legs (sitting position is fixed — thighs angled out, shins down) ────────
const leftThighStyle  = computed(() => rotStyle(18,  "0px 0px", "1s"));
const leftShinStyle   = computed(() => rotStyle(-14, "0px 0px", "1s"));
const rightThighStyle = computed(() => rotStyle(-18, "0px 0px", "1s"));
const rightShinStyle  = computed(() => rotStyle(14,  "0px 0px", "1s"));

// ── Arm states ───────────────────────────────────────────────────────────────
// Angles relative to "straight down" (0°)
// Right shoulder pivot at (-21, -42) in body frame → down = 0°
// Negative = CCW (arm sweeps to screen-left  = robot's right-forward)
// Namaste: both arms raise upward, forearms bend inward to meet at chest

const rightUpperArmAngle = computed(() => {
  if (isNameaste.value) return -36;      // shoulders inward
  if (isRightFwd.value) return isUpright.value ? -84 : -128; // press right-side button on active monitor
  return 0;                           // hanging down
});
const rightForearmAngle = computed(() => {
  if (isNameaste.value) return 54;       // hands meet at center chest
  if (isRightFwd.value) return isUpright.value ? -6 : 56;
  return 12;                          // natural rest droop
});

// Left shoulder pivot at (21, -42) → positive = CW (screen-right = robot's forward-left)
const leftUpperArmAngle = computed(() => {
  if (isNameaste.value) return 36;
  if (isLeftFwd.value)  return isUpright.value ? 84 : 128; // press left-side button on active monitor
  return 0;
});
const leftForearmAngle = computed(() => {
  if (isNameaste.value) return -54;
  if (isLeftFwd.value)  return isUpright.value ? 6 : -56;
  return -12;
});

const rightUpperArmStyle = computed(() => rotStyle(rightUpperArmAngle.value, "0px 0px"));
const rightForearmStyle  = computed(() => rotStyle(rightForearmAngle.value,  "0px 0px", "0.5s"));
const leftUpperArmStyle  = computed(() => rotStyle(leftUpperArmAngle.value,  "0px 0px"));
const leftForearmStyle   = computed(() => rotStyle(leftForearmAngle.value,   "0px 0px", "0.5s"));
</script>

<style scoped>
.node-wrap { width: 100%; height: 100%; overflow: visible; }
svg { overflow: visible; }
</style>
