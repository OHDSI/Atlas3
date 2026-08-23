<template>
  <!-- Rendered only while a plugin is waiting on a choice, so Atlas standalone
       mounts nothing extra and the concept set list is not fetched on boot. -->
  <ConceptSetChooserDialog
    v-if="store.isOpen"
    :model-value="store.isOpen"
    :title="store.title"
    @update:model-value="onDialogUpdate"
    @select="onSelect"
  />
</template>

<script setup lang="ts">
import ConceptSetChooserDialog from '@/components/concepts/ConceptSetChooserDialog.vue'
import { usePluginConceptSetChooserStore } from '@/stores/plugin-concept-set-chooser'
import { useConceptSetsStore } from '@/stores/concept-sets'

const store = usePluginConceptSetChooserStore()
const conceptSets = useConceptSetsStore()

// The dialog reports the id only; the plugin needs a name to label the selection,
// and the list backing the dialog already holds it.
const onSelect = (conceptSetId: number) => {
  const match = conceptSets.conceptSets.find(cs => String(cs.id) === String(conceptSetId))
  store.select({ conceptSetId, name: match?.name ?? String(conceptSetId) })
}

// Covers dismissal by close button, escape and scrim click alike.
const onDialogUpdate = (value: boolean) => {
  if (!value) store.cancel()
}
</script>
