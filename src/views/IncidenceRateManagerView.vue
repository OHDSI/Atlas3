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

  const idStr = props.id ?? (route.params.id as string | undefined)
  if (!idStr || idStr === 'new') {
    // Only an unsaved draft (no id) may be reused here. A saved design left
    // loaded by an earlier visit, and its polled execution info, must not
    // leak into a freshly started design.
    if (!store.currentIR || store.currentIR.id !== undefined) {
      // Try draft first; otherwise empty.
      if (!store.restoreFromDraft()) store.createNewIR()
    }
    return
  }

  const id = Number(idStr)
  const version = route.params.version as string | undefined
  if (version && version !== 'current') {
    // The route's beforeEnter already loaded this preview - don't fetch twice.
    if (
      store.isPreviewMode &&
      store.currentIR?.id === id &&
      store.previewVersion?.version === Number(version)
    ) {
      return
    }
    if (!(await store.loadVersionPreview(id, Number(version)))) {
      loadingError.value = t(
        'incidenceRate.editor.loadError',
        'Failed to load incidence rate'
      ).value
    }
    return
  }
  if (!(await store.loadIR(id)))
    loadingError.value = t('incidenceRate.editor.loadError', 'Failed to load incidence rate').value
}

onMounted(async () => {
  await load()
  store.startAutoSave()
})

onBeforeUnmount(() => store.stopAutoSave())

// Two separate sources, not one getter returning a fresh array: the array
// form re-fires on every route.params object replacement even when both
// values are unchanged.
watch([() => route.params.id, () => route.params.version], load)
</script>

<style scoped>
.state {
  padding: 24px;
  text-align: center;
  color: var(--atlas-color-on-surface-variant);
}
.state.error {
  color: #c00;
}
.v-theme--dark .state.error {
  color: var(--atlas-color-danger-text);
}
</style>
