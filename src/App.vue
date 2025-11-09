<template>
  <v-app>
    <!-- Initial loading overlay while translations load -->
    <v-overlay
      v-model="isInitializing"
      persistent
      class="align-center justify-center"
    >
      <div class="text-center">
        <v-progress-circular
          indeterminate
          size="64"
          color="primary"
        />
        <div class="mt-4 text-h6">{{ t('common.loading', 'Loading...') }}</div>
      </div>
    </v-overlay>

    <NavBar />

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import NavBar from '@/components/shared/NavBar.vue'
import { useLocaleStore } from '@/stores/locale'
import { useI18n } from '@/composables/useI18n'

const localeStore = useLocaleStore()
const { t } = useI18n()

// Show overlay while initial translations are loading
const isInitializing = computed(() => {
  // Only show during initial load (when no translations are loaded yet)
  return localeStore.loading && Object.keys(localeStore.translations).length === 0
})
</script>

<style scoped>
/* Global styles will be added in assets/styles/ during implementation */
</style>
