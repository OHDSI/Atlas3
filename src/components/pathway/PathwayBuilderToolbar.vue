<template>
  <div class="pathway-toolbar">
    <v-btn
      color="primary"
      :disabled="!canSave"
      @click="onSave"
    >Save</v-btn>
    <v-btn
      :disabled="!currentPathway?.id || !hasPermission(permKey('post'))"
      @click="onCopy"
    >Copy</v-btn>
    <v-btn
      color="error"
      :disabled="!currentPathway?.id || !hasPermission(permKey('delete'))"
      @click="onDelete"
    >Delete</v-btn>
    <v-spacer />
    <v-btn
      :disabled="!currentPathway?.id"
      @click="emit('open-versions')"
    >Versions</v-btn>
    <v-btn
      :disabled="!currentPathway?.id || isPreviewMode"
      @click="emit('open-tags')"
    >Tags</v-btn>
    <v-btn
      :disabled="!currentPathway?.id"
      @click="emit('open-permissions')"
    >Access</v-btn>

    <v-snackbar
      :model-value="!!feedback"
      :color="feedback?.color ?? 'info'"
      :timeout="3000"
      @update:model-value="onSnackbarUpdate"
    >
      {{ feedback?.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePathwayStore } from '@/stores/pathway'
import { usePathwayBuilder } from '@/composables/usePathwayBuilder'
import { usePermissions } from '@/composables/usePermissions'

const store = usePathwayStore()
const { currentPathway, canSave, isPreviewMode } = storeToRefs(store)
const { save, copy, remove, feedback } = usePathwayBuilder()
const { hasPermission } = usePermissions()

const emit = defineEmits<{
  'open-tags': []
  'open-permissions': []
  'open-versions': []
}>()

function permKey(suffix: string): string {
  return currentPathway.value?.id
    ? `pathway:${currentPathway.value.id}:${suffix}`
    : `pathway:${suffix}`
}

async function onSave() { await save() }
async function onCopy() { await copy() }
async function onDelete() { await remove() }

function onSnackbarUpdate(open: boolean) {
  if (!open) feedback.value = null
}
</script>

<style scoped>
.pathway-toolbar { display: flex; gap: 8px; align-items: center; padding: 8px 0; }
</style>
