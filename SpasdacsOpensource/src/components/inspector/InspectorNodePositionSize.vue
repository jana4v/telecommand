<template>
  <section class="section">
    <h4 class="section-title">Position & Size</h4>
    <div class="field-row">
      <label class="field half">
        <span>X</span>
        <input class="input" type="number" :value="posX"
          @change="setPos('x', Number(($event.target as HTMLInputElement).value))" />
      </label>
      <label class="field half">
        <span>Y</span>
        <input class="input" type="number" :value="posY"
          @change="setPos('y', Number(($event.target as HTMLInputElement).value))" />
      </label>
    </div>
    <div class="field-row">
      <label class="field half">
        <span>W</span>
        <input class="input" type="number" :value="width"
          @change="setSize('width', Number(($event.target as HTMLInputElement).value))" />
      </label>
      <label class="field half">
        <span>H</span>
        <input class="input" type="number" :value="height"
          @change="setSize('height', Number(($event.target as HTMLInputElement).value))" />
      </label>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  posX: number;
  posY: number;
  width: number;
  height: number;
  setPos: (axis: "x" | "y", value: number) => void;
  setSize: (dim: "width" | "height", value: number) => void;
}>();
</script>

<style scoped>
.section { padding: 9px 12px; border-bottom: 1px solid #21262d; }
.section-title {
  font-size: 10px; font-weight: 700; color: #8b949e;
  text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 7px;
}
.field-row { display: flex; gap: 6px; }
.field {
  display: flex; flex-direction: column; gap: 2px; margin-bottom: 6px;
}
.field.half { flex: 1; }
.field > span {
  font-size: 10px; color: #8b949e; text-transform: uppercase; letter-spacing: 0.04em;
}
.input {
  background: #0d1117; border: 1px solid #30363d; border-radius: 4px;
  color: #c9d1d9; font-size: 12px; padding: 4px 7px; width: 100%; outline: none;
}
.input:focus { border-color: #4a9eff; }
</style>
