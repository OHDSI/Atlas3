<template>
  <span class="entity-import">
    <AtlasButton
      icon="mdi-upload"
      variant="secondary"
      :disabled="disabled"
      :loading="importing"
      :data-testid="testid"
      @click="openPicker"
    >
      {{ label }}
    </AtlasButton>
    <input
      ref="fileInput"
      type="file"
      accept="application/json,.json"
      :aria-label="label"
      style="display: none"
      :data-testid="testid ? `${testid}-input` : undefined"
      @change="onFileChange"
    >
  </span>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { AtlasButton } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/utils/logger'

interface Props {
  label: string
  testid?: string
  disabled?: boolean
  importDesign: (json: unknown, meta: { fileName: string }) => Promise<{ id?: number | string }>
}

const props = withDefaults(defineProps<Props>(), {
  testid: undefined,
  disabled: false,
})

const emit = defineEmits<{
  imported: [entity: { id?: number | string }]
  failed: [message: string]
}>()

const { tv } = useI18n()

const fileInput = ref<HTMLInputElement | null>(null)
const importing = ref(false)

function openPicker() {
  if (props.disabled || importing.value) return
  fileInput.value?.click()
}

// FileReader rather than File#text(): jsdom's File does not implement text(),
// and FileReader works identically in both jsdom and real browsers.
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // Cleared before the work, not after, so picking the same file again still
  // fires a change event when the first attempt failed.
  input.value = ''
  if (!file) return

  importing.value = true
  try {
    let design: unknown
    try {
      design = JSON.parse(await readFileAsText(file))
    } catch (err) {
      logger.error('EntityImportButton', `Import parse failed for ${file.name}`, err)
      emit('failed', tv('components.entityImport.invalidJson', '{file} is not valid JSON.', { file: file.name }))
      return
    }
    emit('imported', await props.importDesign(design, { fileName: file.name }))
  } catch (err) {
    logger.error('EntityImportButton', `Import failed for ${file.name}`, err)
    emit(
      'failed',
      err instanceof Error && err.message
        ? err.message
        : tv('components.entityImport.failed', 'Import failed.')
    )
  } finally {
    importing.value = false
  }
}
</script>

<style scoped>
.entity-import {
  display: inline-flex;
}
</style>
