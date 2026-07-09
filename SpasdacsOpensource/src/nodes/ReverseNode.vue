<template>
  <div class="rf-reverse-host">
    <component :is="component" class="rf-reverse-svg" />
  </div>
</template>

<script setup lang="ts">
import type { Component } from "vue";

defineProps<{
  component: Component;
}>();
</script>

<style>
.rf-reverse-host .rf-reverse-svg {
  transform: scaleX(-1);
  transform-origin: center;
}

.rf-reverse-host .rf-reverse-svg text,
.rf-reverse-host .rf-reverse-svg tspan {
  transform: scaleX(-1);
  transform-origin: center;
  transform-box: fill-box;
}
</style>
