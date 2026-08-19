<template>
  <AtlasDialog
    :model-value="modelValue"
    eyebrow="JSON"
    :title="t('components.cohortBuilder.jsonDialogTitle', 'Cohort JSON').value"
    :subtitle="t(
      'components.cohortBuilder.jsonDialogSubtitle',
      'Edit the Atlas expression directly. Applying replaces the cohort logic — the name and description are kept.'
    ).value"
    max-width="900"
    data-testid="cohort-json-dialog"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="$emit('update:modelValue', false)"
  >
    <AtlasTextField
      v-model="draft"
      multiline
      :rows="20"
      class="cohort-json-dialog__editor"
      spellcheck="false"
      :aria-label="t('components.cohortBuilder.jsonDialogTitle', 'Cohort JSON').value"
      :placeholder="t(
        'components.cohortBuilder.jsonPlaceholder',
        'Paste an Atlas cohort expression, or load one from a file…'
      ).value"
      data-testid="cohort-json-field"
    />

    <AtlasAlert
      v-if="errorMessage"
      severity="danger"
      density="compact"
      class="mt-2"
      data-testid="cohort-json-error"
    >
      {{ errorMessage }}
    </AtlasAlert>

    <!-- Hidden native input: AtlasTextField has no file mode, and the
         dialog only needs the file's raw text (validated by the
         converter) to drop into the editor above. -->
    <input
      ref="fileInput"
      type="file"
      accept="application/json,.json"
      class="cohort-json-dialog__file-input"
      :aria-label="t('components.cohortBuilder.jsonLoadFile', 'Load file').value"
      data-testid="cohort-json-file-input"
      @change="onFileSelected"
    >

    <template #actions>
      <AtlasButton
        variant="ghost"
        size="sm"
        data-testid="cohort-json-load-file"
        @click="fileInput?.click()"
      >
        {{ t('components.cohortBuilder.jsonLoadFile', 'Load file') }}
      </AtlasButton>

      <AtlasButton
        variant="ghost"
        size="sm"
        :disabled="!draft.trim()"
        data-testid="cohort-json-copy"
        @click="handleCopy"
      >
        {{
          copied
            ? t('components.cohortBuilder.jsonCopied', 'Copied')
            : t('common.copy', 'Copy')
        }}
      </AtlasButton>

      <AtlasButton
        variant="ghost"
        size="sm"
        :disabled="!draft.trim()"
        data-testid="cohort-json-download"
        @click="handleDownload"
      >
        {{ t('common.download', 'Download') }}
      </AtlasButton>

      <AtlasSpacer />

      <AtlasButton
        variant="ghost"
        data-testid="cohort-json-cancel"
        @click="$emit('update:modelValue', false)"
      >
        {{ t('common.cancel') }}
      </AtlasButton>

      <AtlasButton
        :disabled="!canApplyDraft"
        data-testid="cohort-json-apply"
        @click="handleApply"
      >
        {{ t('components.cohortBuilder.jsonApply', 'Apply to builder') }}
      </AtlasButton>
    </template>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AtlasAlert, AtlasButton, AtlasDialog, AtlasSpacer, AtlasTextField } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/utils/logger'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_EXTENSIONS = ['.json']

/**
 * CohortJsonDialog - View / edit the cohort's Atlas JSON expression.
 *
 * The dialog owns a *draft* copy of the JSON: editing it here changes
 * nothing until "Apply to builder" is pressed, which hands the text back
 * to the builder to convert and load into its state. Copy / Download /
 * Load-file all act on the draft, so what you see is what you get.
 */
interface Props {
  modelValue: boolean
  /** Current cohort expression, re-read each time the dialog opens. */
  json: string
  /** Filename used by the Download action. */
  filename?: string
  /** False while previewing an old version — editing then would be a lie. */
  canApply?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  filename: 'cohort.json',
  canApply: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  apply: [json: string]
}>()

const { t, tv } = useI18n()

const draft = ref('')
const fileError = ref('')
const copied = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

async function readFileText(file: File): Promise<string | null> {
  if (file.size > MAX_FILE_SIZE) {
    fileError.value = `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`
    return null
  }
  if (!ALLOWED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))) {
    fileError.value = 'File must be JSON format (.json)'
    return null
  }
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = e => resolve((e.target?.result as string) ?? '')
    reader.onerror = () => { fileError.value = 'Failed to read file'; resolve(null) }
    reader.readAsText(file)
  })
}

let copiedTimer: ReturnType<typeof setTimeout> | undefined

// Re-seed the draft from the live expression every time the dialog opens,
// discarding any edits abandoned on a previous open.
watch(
  () => props.modelValue,
  open => {
    if (!open) return
    draft.value = props.json
    fileError.value = ''
    copied.value = false
  },
  { immediate: true }
)

/** Live JSON syntax check — drives both the inline error and Apply. */
const parseError = computed(() => {
  if (!draft.value.trim()) return ''
  try {
    JSON.parse(draft.value)
    return ''
  } catch (error) {
    return tv('components.cohortBuilder.jsonInvalid', 'Invalid JSON: {error}', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

const errorMessage = computed(() => fileError.value || parseError.value)

const canApplyDraft = computed(
  () => props.canApply && !!draft.value.trim() && !parseError.value
)

async function onFileSelected(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  fileError.value = ''
  const text = await readFileText(file)

  if (text === null) {
    fileError.value =
      fileError.value || tv('components.cohortBuilder.jsonReadFailed', 'Could not read file')
  } else {
    draft.value = text
  }

  // Let the same file be picked again after a failed read.
  target.value = ''
}

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(draft.value)
    copied.value = true
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (error) {
    logger.error('CohortJsonDialog', 'Clipboard copy failed', error)
    fileError.value = tv('components.cohortBuilder.copyFailed', 'Could not copy to clipboard')
  }
}

function handleDownload() {
  const blob = new Blob([draft.value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = props.filename
  link.click()
  URL.revokeObjectURL(url)
}

function handleApply() {
  if (!canApplyDraft.value) return
  emit('apply', draft.value)
}
</script>

<style scoped lang="scss">
.cohort-json-dialog__editor :deep(textarea) {
  font-family: 'Roboto Mono', 'SF Mono', Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.55;
  white-space: pre;
  overflow-x: auto;
}

.cohort-json-dialog__file-input {
  display: none;
}
</style>
