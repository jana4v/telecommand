<template>
  <div class="login-page">
    <div class="login-card">
      <h1>SPASDACS Login</h1>
      <p>Sign in with IAM credentials to continue.</p>

      <div v-if="error" class="error-box">{{ error }}</div>

      <form @submit.prevent="doLogin">
        <label class="field">
          <span>Username</span>
          <input v-model.trim="username" autocomplete="username" required />
        </label>

        <label class="field">
          <span>Password</span>
          <input v-model="password" type="password" autocomplete="current-password" required />
        </label>

        <button class="btn-login" :disabled="busy" type="submit">
          {{ busy ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <div class="role-hint">
        Roles:
        <code>super_admin</code>,
        <code>admin</code>,
        <code>operator</code>,
        <code>viewer</code>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuth } from "../services/auth";

const router = useRouter();
const route = useRoute();
const auth = useAuth();

const username = ref("");
const password = ref("");
const busy = ref(false);
const error = ref("");

async function doLogin() {
  error.value = "";
  busy.value = true;
  try {
    await auth.login(username.value, password.value);
    const target = typeof route.query.redirect === "string" ? route.query.redirect : "/";
    router.replace(target);
  } catch (err: any) {
    error.value = String(err?.data?.error ?? err?.message ?? "Login failed");
  } finally {
    busy.value = false;
  }
}
</script>

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
}

h1 {
  margin: 0;
  font-size: 1.4rem;
}

p {
  margin: 0.45rem 0 1rem;
  color: #93c5fd;
}

.error-box {
  background: #3b1220;
  color: #fecdd3;
  border: 1px solid #7f1d1d;
  padding: 0.55rem 0.7rem;
  border-radius: 8px;
  margin-bottom: 0.9rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.9rem;
}

.field span {
  font-size: 0.88rem;
  color: #cbd5e1;
}

.field input {
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 0.58rem 0.65rem;
  background: #020617;
  color: #f8fafc;
}

.btn-login {
  width: 100%;
  border: none;
  border-radius: 9px;
  background: linear-gradient(90deg, #0ea5e9 0%, #38bdf8 100%);
  color: #082f49;
  font-weight: 700;
  padding: 0.65rem 0.9rem;
  cursor: pointer;
}

.btn-login:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.role-hint {
  margin-top: 0.9rem;
  color: #93c5fd;
  font-size: 0.82rem;
}

.role-hint code {
  color: #e2e8f0;
  background: #1e293b;
  border-radius: 4px;
  padding: 0.05rem 0.3rem;
}
</style>
