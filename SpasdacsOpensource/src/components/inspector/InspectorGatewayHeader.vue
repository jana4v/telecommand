<template>
  <div class="inspector-title">
    <span>Inspector</span>
    <slot name="badge" />
    <div class="gw-wrap">
      <button
        ref="gwPillEl"
        class="gw-pill"
        :class="gatewayAvailable ? 'gw-ok' : 'gw-off'"
        :title="gatewayAvailable
          ? `${liveMnemonics.length} mnemonics loaded — click to configure`
          : 'Gateway offline — click to configure'"
        @click="toggleGwConfig"
      >
        <span class="gw-dot" :class="{ spinning: mnemonicsLoading }"></span>
        {{ mnemonicsLoading ? '…' : gatewayAvailable ? liveMnemonics.length + ' mnemonics' : 'Simulated' }}
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="showGwConfig"
        class="gw-popover-fixed"
        :style="{ top: gwPopTop, right: gwPopRight }"
      >
        <div class="gw-popover-title">Gateway URL</div>
        <div class="gw-url-row">
          <input
            class="gw-url-input"
            v-model="gwUrlDraft"
            :placeholder="gwUrlPlaceholder"
            @keyup.enter="applyGwUrl"
          />
          <button class="gw-connect-btn" @click="applyGwUrl" :disabled="mnemonicsLoading">
            {{ mnemonicsLoading ? '…' : 'Connect' }}
          </button>
        </div>
        <div v-if="lastError" class="gw-error">{{ lastError }}</div>
        <div v-else-if="gatewayAvailable" class="gw-success">
          ✓ {{ liveMnemonics.length }} mnemonics loaded
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import {
  gatewayAvailable,
  gatewayUrl,
  lastError,
  mnemonicsLoading,
  liveMnemonics,
  loadMnemonics,
} from "../../services/mnemonicStore";

const gwUrlPlaceholder = `http://${window.location.host}/api/go/v1`;
const showGwConfig = ref(false);
const gwUrlDraft = ref(gatewayUrl.value);
const gwPillEl = ref<HTMLElement | null>(null);
const gwPopTop = ref("0px");
const gwPopRight = ref("0px");

function toggleGwConfig() {
  showGwConfig.value = !showGwConfig.value;
  if (showGwConfig.value && gwPillEl.value) {
    const rect = gwPillEl.value.getBoundingClientRect();
    gwPopTop.value = (rect.bottom + 6) + "px";
    gwPopRight.value = (window.innerWidth - rect.right) + "px";
  }
}

function applyGwUrl() {
  const url = gwUrlDraft.value.trim() || gwUrlPlaceholder;
  gwUrlDraft.value = url;
  loadMnemonics(true, url);
}

function onDocClick(e: MouseEvent) {
  if (!showGwConfig.value) return;
  const pill = gwPillEl.value;
  const target = e.target as globalThis.Node | null;
  const popoverEl = document.querySelector(".gw-popover-fixed");
  if (pill && !pill.contains(target as any) && (!popoverEl || !popoverEl.contains(target as any))) {
    showGwConfig.value = false;
  }
}

onMounted(() => document.addEventListener("click", onDocClick, true));
onUnmounted(() => document.removeEventListener("click", onDocClick, true));
</script>

<style scoped>
.inspector-title {
  padding: 10px 12px 6px;
  font-size: 11px; font-weight: 700; color: #8b949e;
  text-transform: uppercase; letter-spacing: 0.06em;
  border-bottom: 1px solid #30363d; flex-shrink: 0;
  display: flex; align-items: center; gap: 6px;
}

.gw-wrap { margin-left: auto; }

.gw-pill {
  display: flex; align-items: center; gap: 5px;
  padding: 2px 7px; border-radius: 10px; border: 1px solid;
  font-size: 10px; font-weight: 600; cursor: pointer;
  white-space: nowrap; transition: opacity 0.15s;
}
.gw-pill:hover { opacity: 0.85; }
.gw-ok  { background: rgba(39,174,96,0.15);  color: #27ae60; border-color: rgba(39,174,96,0.35);  }
.gw-off { background: rgba(150,150,150,0.12); color: #8b949e; border-color: rgba(150,150,150,0.25); }

.gw-dot {
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
  background: currentColor;
}
.gw-dot.spinning {
  animation: gw-spin 0.8s linear infinite;
  border: 2px solid currentColor; border-top-color: transparent; background: transparent;
  border-radius: 50%;
}
@keyframes gw-spin { to { transform: rotate(360deg); } }

.gw-popover-fixed {
  position: fixed; z-index: 9999;
  background: #1c2128; border: 1px solid #30363d; border-radius: 8px;
  padding: 10px 12px; min-width: 280px; box-shadow: 0 8px 24px rgba(0,0,0,0.5);
}
.gw-popover-title {
  font-size: 11px; font-weight: 700; color: #8b949e;
  text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px;
}
.gw-url-row { display: flex; gap: 6px; }
.gw-url-input {
  flex: 1; background: #0d1117; border: 1px solid #30363d; border-radius: 4px;
  color: #c9d1d9; font-size: 11px; padding: 4px 7px; outline: none;
}
.gw-url-input:focus { border-color: #4a9eff; }
.gw-connect-btn {
  padding: 4px 10px; background: rgba(74,158,255,0.15); color: #4a9eff;
  border: 1px solid rgba(74,158,255,0.3); border-radius: 4px;
  font-size: 11px; font-weight: 600; cursor: pointer; white-space: nowrap;
}
.gw-connect-btn:hover:not(:disabled) { background: rgba(74,158,255,0.28); }
.gw-connect-btn:disabled { opacity: 0.5; cursor: default; }
.gw-error   { margin-top: 6px; font-size: 10px; color: #e74c3c; }
.gw-success { margin-top: 6px; font-size: 10px; color: #27ae60; }
</style>
