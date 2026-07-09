<template>
  <section class="section">
    <h4 class="section-title">Monoprop Thruster</h4>

    <!-- Label -->
    <label class="field">
      <span>Label</span>
      <input class="input" type="text" placeholder="e.g. THR-M1"
        :value="data.name ?? ''"
        @change="set('name', ($event.target as HTMLInputElement).value)"/>
    </label>

    <div class="divider"/>

    <!-- Thrust Level -->
    <div class="field">
      <div class="field-row-header">
        <span>Thrust Level</span>
        <span class="thrust-pct" :class="thrustClass">{{ thrustPct }}%</span>
      </div>
      <div class="slider-row">
        <input class="slider" type="range" min="0" max="1" step="0.01"
          :value="data.thrustLevel ?? 0"
          @input="set('thrustLevel', Number(($event.target as HTMLInputElement).value))"/>
      </div>
      <div class="btn-group">
        <button class="btn" :class="{ active: thrustLevelNum === 0 }"
          @click="set('thrustLevel', 0)">Off</button>
        <button class="btn btn-25" :class="{ active: thrustLevelNum === 0.25 }"
          @click="set('thrustLevel', 0.25)">25%</button>
        <button class="btn btn-50" :class="{ active: thrustLevelNum === 0.5 }"
          @click="set('thrustLevel', 0.5)">50%</button>
        <button class="btn btn-100" :class="{ active: thrustLevelNum === 1 }"
          @click="set('thrustLevel', 1)">Max</button>
      </div>
    </div>

    <div class="divider"/>

    <!-- Propellant valve -->
    <div class="field">
      <span>Propellant Valve</span>
      <button class="valve-btn" :class="{ 'valve-on': fuOn }"
        @click="set('fuelEnabled', !fuOn)">
        <span class="valve-dot" :class="{ 'dot-on': fuOn }"/>
        {{ fuOn ? '● OPEN' : '○ CLOSED' }}
      </button>
      <span class="field-hint">Single propellant line — hydrazine / green propellant</span>
    </div>

    <div class="divider"/>

    <!-- Quick test -->
    <div class="field">
      <span>Quick Test</span>
      <div class="btn-group">
        <button class="btn btn-fire"
          @click="() => { set('thrustLevel', 1); set('fuelEnabled', true); }">
          🔥 Fire Max
        </button>
        <button class="btn btn-shutdown"
          @click="() => { set('thrustLevel', 0); set('fuelEnabled', false); }">
          ⬛ Shutdown
        </button>
      </div>
    </div>

    <div class="divider"/>

    <!-- Live state -->
    <div class="state-panel">
      <div class="state-title">Live State</div>
      <div class="state-row">
        <span class="state-key">PWR</span>
        <span class="state-chip" :class="thrustLevelNum > 0 ? 'chip-on' : 'chip-off'">
          {{ thrustLevelNum > 0 ? '⚡ FIRING' : '○ IDLE' }}
        </span>
      </div>
      <div class="state-row">
        <span class="state-key">PROP</span>
        <span class="state-chip" :class="fuOn ? 'chip-fu' : 'chip-off'">
          {{ fuOn ? '● OPEN' : '○ CLOSED' }}
        </span>
      </div>
      <div class="thrust-bar-wrap">
        <div class="thrust-bar-track">
          <div class="thrust-bar-fill" :style="{ width: thrustPct + '%' }" :class="thrustClass"/>
        </div>
        <span class="thrust-bar-label">{{ thrustPct }}%</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { InspectorSetter } from "../inspectorTypes";

const props = defineProps<{
  data: Record<string, any>;
  set: InspectorSetter;
}>();

const thrustLevelNum = computed(() =>
  Math.max(0, Math.min(1, Number(props.data.thrustLevel ?? 0))));
const thrustPct = computed(() => Math.round(thrustLevelNum.value * 100));

const fuOn = computed(() => {
  const v = props.data.fuelEnabled;
  return v === true || v === "true" || String(v) === "1";
});

const thrustClass = computed(() => {
  if (thrustLevelNum.value === 0)   return "thrust-off";
  if (thrustLevelNum.value < 0.35)  return "thrust-low";
  if (thrustLevelNum.value < 0.7)   return "thrust-mid";
  return "thrust-high";
});
</script>

<style scoped>
.divider { height: 1px; background: #21262d; margin: 8px 0; }
.field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
.field > span:first-child,
.field-row-header > span:first-child {
  font-size: 10px; color: #8b949e; text-transform: uppercase; letter-spacing: 0.04em;
}
.field-row-header { display: flex; justify-content: space-between; align-items: baseline; }
.field-hint { font-size: 10px; color: #3c4a5c; line-height: 1.4; }

.input {
  background: #0d1117; border: 1px solid #30363d; border-radius: 4px;
  color: #c9d1d9; font-size: 12px; padding: 4px 7px;
  width: 100%; outline: none; box-sizing: border-box;
}
.input:focus { border-color: #ffa030; }

.thrust-pct { font-size: 13px; font-weight: 700; font-family: monospace; }
.thrust-off  { color: #4a5568; }
.thrust-low  { color: #18e060; }
.thrust-mid  { color: #ffa018; }
.thrust-high { color: #ff4018; }

.slider-row { display: flex; gap: 6px; align-items: center; }
.slider { flex: 1; accent-color: #ffa030; cursor: pointer; }

.btn-group { display: flex; gap: 3px; }
.btn {
  flex: 1; padding: 4px 0; font-size: 11px; font-weight: 600;
  border: 1px solid #30363d; border-radius: 4px;
  background: #0d1117; color: #8b949e; cursor: pointer;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.btn:hover { background: #161b22; color: #c9d1d9; }
.btn.active  { background: #1a3a5c; color: #4a9eff; border-color: #2a5090; }
.btn-25.active  { background: #0d2a18; color: #18e060; border-color: #1a5030; }
.btn-50.active  { background: #2a2008; color: #ffa018; border-color: #604a10; }
.btn-100.active { background: #2a0808; color: #ff4018; border-color: #801010; }
.btn-fire     { background: #200d04; color: #ff8030; border-color: #602010; }
.btn-fire:hover { background: #301408; color: #ffa050; }
.btn-shutdown { background: #0d1117; color: #6e7681; border-color: #30363d; }

.valve-btn {
  padding: 6px 0; font-size: 11px; font-weight: 700;
  border: 1px solid #30363d; border-radius: 4px;
  background: #0a0e18; color: #4a5568; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 5px;
  transition: all 0.12s; width: 100%;
}
.valve-btn:hover { background: #121620; }
.valve-on { background: #200a04; color: #ff6030; border-color: #901808; }
.valve-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #2a3040; display: inline-block; flex-shrink: 0;
}
.dot-on { background: #ff5020; box-shadow: 0 0 5px #ff5020; }

.state-panel {
  background: #0d1117; border: 1px solid #21262d; border-radius: 5px;
  padding: 7px 9px; display: flex; flex-direction: column; gap: 5px;
}
.state-title  { font-size: 9px; color: #444d58; text-transform: uppercase; letter-spacing: 0.06em; }
.state-row    { display: flex; align-items: center; gap: 7px; }
.state-key    { font-size: 9px; font-weight: 700; font-family: monospace; color: #4a5568; width: 34px; }
.state-chip   { font-size: 10px; font-weight: 700; font-family: monospace; padding: 2px 7px; border-radius: 9px; border: 1px solid transparent; }
.chip-on  { background: #101e10; color: #18e060; border-color: #1a4820; }
.chip-off { background: #0c0e14; color: #3a4050; border-color: #1c2030; }
.chip-fu  { background: #160804; color: #ff5820; border-color: #801808; }

.thrust-bar-wrap  { display: flex; align-items: center; gap: 6px; margin-top: 2px; }
.thrust-bar-track { flex: 1; height: 5px; background: #0c1018; border: 1px solid #1c2030; border-radius: 3px; overflow: hidden; }
.thrust-bar-fill  { height: 100%; border-radius: 3px; transition: width 0.15s ease; }
.thrust-bar-fill.thrust-off  { background: #1e2430; }
.thrust-bar-fill.thrust-low  { background: #18e060; }
.thrust-bar-fill.thrust-mid  { background: #ffa018; }
.thrust-bar-fill.thrust-high { background: #ff4018; }
.thrust-bar-label { font-size: 10px; font-family: monospace; color: #5a6070; min-width: 28px; text-align: right; }
</style>
