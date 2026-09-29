<template>
  <ConceptSetEditor
    v-if="store.isOpen"
    :model-value="store.isOpen"
    :concept-set="conceptSets.currentSet"
    @update:model-value="onEditorUpdate"
    @save="onSave"
    @delete="onDelete"
  />
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import ConceptSetEditor from '@/components/concepts/ConceptSetEditor.vue'
import { useI18n } from '@/composables/useI18n'
import { usePluginConceptSetEditorStore } from '@/stores/plugin-concept-set-editor'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useNotifications } from '@/stores/notifications'

const store = usePluginConceptSetEditorStore()
const conceptSets = useConceptSetsStore()
const notify = useNotifications()
const route = useRoute()
const { tv } = useI18n()

// The editor emits save before it closes, and create/update have already put
// the persisted set (with its server-assigned id) into currentSet.
const onSave = () => {
  const saved = conceptSets.currentSet
  if (!saved || saved.id === undefined || saved.id === null) return
  store.saved({ conceptSetId: Number(saved.id), name: saved.name })
}

const onDelete = (id: number | string) => {
  void conceptSets.remove(id)
}

const onEditorUpdate = (value: boolean) => {
  if (!value) store.cancel()
}

watch(
  () => route.path,
  () => store.cancel()
)

watch(
  () => store.loadError,
  loadError => {
    if (!loadError) return
    notify.danger(
      tv('conceptSets.pluginEditLoadFailed', 'Could not open concept set {id}', {
        id: String(loadError.conceptSetId),
      }),
      { message: loadError.message ?? undefined }
    )
    store.clearLoadError()
  }
)
</script>
