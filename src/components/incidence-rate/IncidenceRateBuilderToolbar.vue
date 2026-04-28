<template>
  <v-toolbar
    density="compact"
    flat
  >
    <v-text-field
      :model-value="store.currentIR?.name ?? ''"
      :label="t('columns.name', 'Name').value"
      density="compact"
      hide-details
      class="name-field"
      :readonly="store.isReadOnly || store.isPreviewMode"
      @update:model-value="(v: string) => store.updateMeta({ name: v })"
    />
    <v-spacer />

    <v-btn
      :disabled="!store.canSave || saving"
      :loading="saving"
      color="primary"
      @click="onSave"
    >
      {{ t('common.save', 'Save') }}
    </v-btn>
    <v-btn
      :disabled="!store.currentIR?.id"
      @click="onCopy"
    >
      {{ t('common.copy', 'Copy') }}
    </v-btn>
    <v-btn
      :disabled="!store.currentIR?.id"
      color="error"
      variant="text"
      @click="askDelete = true"
    >
      {{ t('common.delete', 'Delete') }}
    </v-btn>

    <v-dialog
      v-model="askDelete"
      max-width="400"
    >
      <v-card>
        <v-card-title>{{ t('common.delete', 'Delete incidence rate') }}</v-card-title>
        <v-card-text>{{ t('ir.deleteConfirmation', 'Delete incidence rate analysis? Warning: deletion can not be undone!') }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="askDelete = false">
            {{ t('common.cancel', 'Cancel') }}
          </v-btn>
          <v-btn
            color="error"
            @click="onDelete"
          >
            {{ t('common.delete', 'Delete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar
      :model-value="!!feedback"
      :color="feedback?.color ?? 'info'"
      :timeout="3000"
      @update:model-value="(open: boolean) => { if (!open) feedback = null }"
    >
      {{ feedback?.message }}
    </v-snackbar>
  </v-toolbar>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import { useIncidenceRateBuilder } from '@/composables/useIncidenceRateBuilder'

const { t } = useI18n()
const store = useIncidenceRateStore()
const { save, copy, remove, feedback } = useIncidenceRateBuilder()
const saving = ref(false)
const askDelete = ref(false)

async function onSave() { saving.value = true; try { await save() } finally { saving.value = false } }
async function onCopy() { await copy() }
async function onDelete() { askDelete.value = false; await remove() }
</script>

<style scoped>
.name-field { max-width: 400px; }
</style>
