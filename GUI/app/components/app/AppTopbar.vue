<script setup lang="ts">
const visible = useState<boolean>('visible', () => true)
</script>

<template>
  <nav class="topnav-overlay">
    <div class="topnav-container">
      <div class="topnav-left">
        <button
          class="menu-toggle-btn"
          title="Toggle Menu"
          @click="visible = !visible"
        >
          <i class="pi pi-bars" />
        </button>

        <div class="topnav-brand-wrap">
          <img src="/tc.gif" alt="logo" class="topnav-logo">
          <span class="topnav-brand">TeleCommand</span>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped lang="scss">
.topnav-overlay {
  position: fixed;
  width: 100%;
  top: 0;
  left: 0;
  z-index: 2100;
  background: #0b1220;
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.topnav-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 4rem;
  padding: 0 1rem;
}

.topnav-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.menu-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 8px;
  background: #111827;
  color: #e2e8f0;
  cursor: pointer;
}

.menu-toggle-btn:hover {
  background: #1f2937;
}

.topnav-brand-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.topnav-logo {
  height: 2rem;
  width: auto;
}

.topnav-brand {
  color: #e2e8f0;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.3px;
}
</style>