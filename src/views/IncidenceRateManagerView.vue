<template>
  <div
    v-if="loadingError"
    class="state error"
  >
    {{ loadingError }}
  </div>
  <IncidenceRateBuilder v-else-if="store.currentIR" />
  <div
    v-else
    class="state"
  >
    {{ t('common.loading', 'Loading incidence rate…') }}
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import IncidenceRateBuilder from '@/components/incidence-rate/IncidenceRateBuilder.vue'

const props = defineProps<{ id?: string }>()
const route = useRoute()
const store = useIncidenceRateStore()
const { t } = useI18n()
const loadingError = ref<string | null>(null)

async function load() {
  loadingError.value = null
  // Version preview: handled by router beforeEnter; if currentIR is set in preview mode, do nothing.
  if (store.isPreviewMode && store.currentIR) return

  const idStr = props.id ?? (route.params.id as string | undefined)
  if (!idStr || idStr === 'new') {
    if (!store.currentIR) {
      // Try draft first; otherwise empty.
      if (!store.restoreFromDraft()) store.createNewIR()
    }
    return
  }
  const id = Number(idStr)
  const ok = await store.loadIR(id)
  if (!ok)
    loadingError.value = t('incidenceRate.editor.loadError', 'Failed to load incidence rate').value
}

onMounted(async () => {
  await load()
  store.startAutoSave()
})

onBeforeUnmount(() => store.stopAutoSave())

watch(() => route.params.id, load)
</script>

<style scoped>
.state {
  padding: 24px;
  text-align: center;
  color: #888;
}
.v-theme--dark .state {
  color: var(--atlas-color-on-surface-variant);
}
.state.error {
  color: #c00;
}
.v-theme--dark .state.error {
  color: var(--atlas-color-danger-text);
}
</style>
