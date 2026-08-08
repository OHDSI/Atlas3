<template>
  <PathwayBuilder />
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { usePathwayStore } from '@/stores/pathway'
import PathwayBuilder from '@/components/pathway/PathwayBuilder.vue'

const route = useRoute()
const store = usePathwayStore()

async function loadFromRoute() {
  const id = Number(route.params.id)
  const version = route.params.version as string | undefined
  if (Number.isFinite(id) && id > 0) {
    if (version && version !== 'current') {
      // The route's beforeEnter already loaded this preview - don't fetch twice.
      if (
        store.isPreviewMode &&
        store.currentPathway?.id === id &&
        store.previewVersion?.version === Number(version)
      ) {
        return
      }
      await store.loadVersionPreview(id, Number(version))
    } else {
      await store.loadPathway(id)
    }
  } else {
    if (!store.restoreFromDraft()) store.createNewPathway()
  }
}

onMounted(loadFromRoute)
// Two separate sources, not one getter returning a fresh array: the array
// form re-fires on every route.params object replacement even when both
// values are unchanged.
watch([() => route.params.id, () => route.params.version], loadFromRoute)
</script>
