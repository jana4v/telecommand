<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const auth = useAuth()
const errorMessage = ref('')

onMounted(async () => {
  try {
    const returnPath = await auth.handleCallback()
    router.replace(returnPath)
  }
  catch (err: any) {
    console.error('[Auth Callback] Error:', err)
    errorMessage.value = err?.message ?? 'Login failed'
  }
})
</script>

<template>
  <div class="callback-page">
    <p v-if="errorMessage">
      {{ errorMessage }}
    </p>
    <p v-else>
      Signing in…
    </p>
  </div>
</template>

<style scoped>
.callback-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
