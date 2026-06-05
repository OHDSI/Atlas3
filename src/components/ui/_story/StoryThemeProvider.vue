<template>
  <v-theme-provider
    :theme="theme"
    with-background
    style="min-height: 100%;"
  >
    <div style="padding: 24px;">
      <slot />
    </div>
  </v-theme-provider>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

// Histoire applies its `dark` class (theme.darkClass) to the story sandbox's
// <html> when its global light/dark toggle is switched. We mirror that into the
// Vuetify theme so the single global toggle themes the components too.
const isDark = ref(false)
let observer: MutationObserver | null = null

function syncDark() {
  const cl = document.documentElement.classList
  isDark.value = cl.contains('dark') || cl.contains('htw-dark')
}

const theme = computed(() => (isDark.value ? 'dark' : 'light'))

onMounted(() => {
  syncDark()
  observer = new MutationObserver(syncDark)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>
