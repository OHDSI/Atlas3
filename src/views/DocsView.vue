<template>
  <div class="docs-view">
    <iframe
      :src="pdfUrl"
      class="docs-view__pdf"
      :title="t('navigation.docs', 'User manual').value"
      data-testid="docs-pdf-frame"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

// Resolve relative to the deployment's base path so dev (/) and
// prod (/atlas/) both find the PDF without a hard-coded prefix.
const pdfUrl = computed(() => `${import.meta.env.BASE_URL}docs/atlas-manual.pdf`)
</script>

<style scoped>
/* Fill the v-main slot that hosts the router-view: the navbar
 * stays visible above. 60px matches the navbar height defined in
 * NavBar.vue; if that ever changes, update both. */
.docs-view {
  display: flex;
  height: calc(100vh - 60px);
  width: 100%;
}

.docs-view__pdf {
  flex: 1;
  border: 0;
  width: 100%;
  height: 100%;
}
</style>
