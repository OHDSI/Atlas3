<!--
  CharacterizationUtilitiesTab

  Three lightweight utilities for the builder:
  - Export design JSON (downloads via Blob + <a download>)
  - Import design JSON (file picker → parse → POST to WebAPI → emit
    `imported` so the parent can route to the new id)
  - Diagnostics placeholder (deferred backend check)
-->
<template>
  <div
    class="char-utilities-tab"
    data-testid="char-utilities-tab"
  >
    <!-- Export -->
    <section class="char-utilities-tab__section">
      <h3 class="char-utilities-tab__section-title">
        {{ t('characterizations.editor.utilities.export.title', 'Export design') }}
      </h3>
      <p class="char-utilities-tab__section-desc">
        {{
          t(
            'characterizations.editor.utilities.export.description',
            'Download the design as JSON.'
          )
        }}
      </p>
      <v-btn
        color="primary"
        variant="outlined"
        prepend-icon="mdi-download"
        :disabled="!canExport || exporting"
        :loading="exporting"
        data-testid="char-utilities-export"
        @click="handleExport"
      >
        {{
          t(
            'characterizations.editor.utilities.export.download',
            'Download design JSON'
          )
        }}
      </v-btn>
      <v-alert
        v-if="exportError"
        type="error"
        variant="tonal"
        density="compact"
        class="mt-3"
        closable
        data-testid="char-utilities-export-error"
        @click:close="exportError = ''"
      >
        {{ exportError }}
      </v-alert>
    </section>

    <v-divider class="my-4" />

    <!-- Import -->
    <section class="char-utilities-tab__section">
      <h3 class="char-utilities-tab__section-title">
        {{ t('characterizations.editor.utilities.import.title', 'Import design') }}
      </h3>
      <p class="char-utilities-tab__section-desc">
        {{
          t(
            'characterizations.editor.utilities.import.description',
            'Upload a design JSON file. A new characterization is created.'
          )
        }}
      </p>
      <v-file-input
        :label="fileInputLabel"
        accept="application/json,.json"
        prepend-icon="mdi-upload"
        density="compact"
        variant="outlined"
        :disabled="importing"
        :loading="importing"
        data-testid="char-utilities-import"
        @update:model-value="handleImport"
      />
      <v-alert
        v-if="importError"
        type="error"
        variant="tonal"
        density="compact"
        class="mt-3"
        closable
        data-testid="char-utilities-import-error"
        @click:close="importError = ''"
      >
        {{ importError }}
      </v-alert>
    </section>

    <v-divider class="my-4" />

    <!-- Diagnostics (deferred) -->
    <section class="char-utilities-tab__section">
      <h3 class="char-utilities-tab__section-title">
        {{
          t('characterizations.editor.utilities.diagnostics.title', 'Diagnostics')
        }}
      </h3>
      <v-alert
        type="info"
        variant="tonal"
        density="compact"
        data-testid="char-utilities-diagnostics"
      >
        {{
          t(
            'characterizations.editor.utilities.diagnostics.comingSoon',
            'Backend diagnostics check coming soon.'
          )
        }}
      </v-alert>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import { useI18n } from '@/composables/useI18n'
import {
  exportCharacterization,
  importCharacterization,
} from '@/services/characterization.service'
import { logger } from '@/utils/logger'
import type { CharacterizationDefinition } from '@/models/characterization.types'

const props = defineProps<{
  characterization: CharacterizationDefinition | null
}>()

const emit = defineEmits<{
  (e: 'imported', def: CharacterizationDefinition): void
}>()

const { t } = useI18n()

const exporting = ref<boolean>(false)
const importing = ref<boolean>(false)
const exportError = ref<string>('')
const importError = ref<string>('')

const canExport = computed<boolean>(() => Boolean(props.characterization?.id))

const fileInputLabel = computed<string>(
  () =>
    t(
      'characterizations.editor.utilities.import.fileLabel',
      'Choose file'
    ).value
)

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'design'
}

function triggerDownload(filename: string, payload: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    logger.debug(
      'CharacterizationUtilities',
      'Skipping download outside the browser'
    )
    return
  }
  const blob = new Blob([payload], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

async function handleExport(): Promise<void> {
  if (!props.characterization?.id) return
  exportError.value = ''
  exporting.value = true
  try {
    const design = await exportCharacterization(props.characterization.id)
    const json = JSON.stringify(design, null, 2)
    const filename = `characterization-${slugify(props.characterization.name)}-${props.characterization.id}.json`
    triggerDownload(filename, json)
  } catch (err) {
    logger.error('CharacterizationUtilities', 'Export failed', err)
    exportError.value = t(
      'characterizations.editor.utilities.import.importError',
      'Import failed.'
    ).value
  } finally {
    exporting.value = false
  }
}

async function handleImport(value: File | File[] | null): Promise<void> {
  importError.value = ''
  const file = Array.isArray(value) ? value[0] : value
  if (!file) return

  importing.value = true
  let parsed: unknown
  try {
    const text = await file.text()
    parsed = JSON.parse(text)
  } catch (err) {
    logger.error('CharacterizationUtilities', 'Import parse failed', err)
    importError.value = t(
      'characterizations.editor.utilities.import.parseError',
      'Could not parse design JSON.'
    ).value
    importing.value = false
    return
  }

  try {
    const created = await importCharacterization(parsed)
    emit('imported', created)
  } catch (err) {
    logger.error('CharacterizationUtilities', 'Import POST failed', err)
    importError.value = t(
      'characterizations.editor.utilities.import.importError',
      'Import failed.'
    ).value
  } finally {
    importing.value = false
  }
}
</script>

<style scoped>
.char-utilities-tab {
  display: flex;
  flex-direction: column;
  padding: 8px 0;
}

.char-utilities-tab__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.char-utilities-tab__section-title {
  font-size: 1rem;
  font-weight: 500;
  margin: 0;
}

.char-utilities-tab__section-desc {
  margin: 0;
  color: #666;
}
</style>
