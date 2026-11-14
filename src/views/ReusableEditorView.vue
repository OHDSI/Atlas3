<template>
  <ReusableEditor />
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useReusableStore } from '@/stores/reusable'
import { useI18n } from '@/composables/useI18n'
import ReusableEditor from '@/components/reusables/ReusableEditor.vue'

const route = useRoute()
const store = useReusableStore()
const { tv } = useI18n()

async function loadFromRoute() {
  const id = Number(route.params.id)
  const version = route.params.version as string | undefined
  if (!Number.isFinite(id) || id <= 0) {
    store.createNew(tv('reusables.newName'))
    return
  }
  if (version && version !== 'current') {
    const versionNumber = Number(version)
    // A preview already loaded for this version needs no second fetch.
    if (store.current?.id === id && store.previewVersion?.version === versionNumber) return
    // The preview keeps the live tags, so make sure the live reusable is loaded first.
    if (store.current?.id !== id) await store.load(id)
    await store.loadVersionPreview(id, versionNumber)
    return
  }
  await store.load(id)
}

onMounted(loadFromRoute)
watch([() => route.params.id, () => route.params.version], loadFromRoute)
</script>
