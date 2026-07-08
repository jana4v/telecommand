<script setup lang="ts">
import { useColorModeStore } from '~/stores/colorMode'

useHead({
  title: 'GEO RF Applications',
  meta: [
    { name: 'description', content: 'GEO RF Applications - Professional RF Management System' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
  ],
})

function handleError(error: any) {
  console.error('Global error:', error)
}

onErrorCaptured(handleError)

const colorModeStore = useColorModeStore()

onMounted(() => {
  // Force dark as the default visual mode for this Telecommand slice.
  document.documentElement.classList.add('dark')
  document.documentElement.classList.remove('light')
  colorModeStore.setCurrentMode('dark')
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style lang='scss'>
@use 'App.scss';
</style>