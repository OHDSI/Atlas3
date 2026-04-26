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
      await store.loadVersionPreview(id, Number(version))
    } else {
      await store.loadPathway(id)
    }
  } else {
    if (!store.restoreFromDraft()) store.createNewPathway()
  }
}

onMounted(loadFromRoute)
watch(() => [route.params.id, route.params.version], loadFromRoute)
</script>
