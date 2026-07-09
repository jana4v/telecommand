<script setup lang="ts">
import { onMounted } from "vue";
import { useRoute } from "vue-router";
import { useAuth } from "../services/auth";

const route = useRoute();
const auth = useAuth();

onMounted(() => {
  const target = typeof route.query.redirect === "string" ? route.query.redirect : "/";
  auth.login(target);
});
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <h1>Signing in…</h1>
      <p>Redirecting to the SCG identity provider.</p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at top, #1f2a44 0%, #101826 55%, #0a101a 100%);
  padding: 1.25rem;
}

.login-card {
  width: min(440px, 100%);
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 14px;
  padding: 1.25rem;
  color: #e2e8f0;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.4);
  text-align: center;
}

h1 {
  margin: 0;
  font-size: 1.4rem;
}

p {
  margin: 0.45rem 0 0;
  color: #93c5fd;
}
</style>
