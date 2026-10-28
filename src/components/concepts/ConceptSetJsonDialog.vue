<template>
  <AtlasDialog
    :model-value="modelValue"
    eyebrow="JSON"
    :title="t('components.cohortBuilder.jsonViewEdit').value"
    :subtitle="t('cs.manager.importJsonHint').value"
    max-width="900"
    data-testid="concept-set-json-dialog"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="$emit('update:modelValue', false)"
  >
    <AtlasTextField
      v-model="draft"
      multiline
      :rows="20"
      class="concept-set-json-dialog__editor"
      spellcheck="false"
      :aria-label="t('components.cohortBuilder.jsonViewEdit').value"
      data-testid="concept-set-json-field"
    />

    <AtlasAlert
      v-if="parseError"
      severity="danger"
      density="compact"
      class="mt-2"
      data-testid="concept-set-json-error"
    >
      {{ parseError }}
    </AtlasAlert>

    <template #actions>
      <AtlasButton
        variant="ghost"
        size="sm"
        :disabled="!draft.trim()"
        data-testid="concept-set-json-copy"
        @click="copyJson"
      >
        {{ copied ? t('components.cohortBuilder.jsonCopied').value : t('common.copy').value }}
      </AtlasButton>
      <AtlasButton
        variant="ghost"
        size="sm"
        :disabled="!draft.trim()"
        data-testid="concept-set-json-download"
        @click="downloadJson"
      >
        {{ t('common.download').value }}
      </AtlasButton>

      <AtlasSpacer />

      <AtlasButton
        variant="ghost"
        @click="$emit('update:modelValue', false)"
      >
        {{ t('common.cancel').value }}
      </AtlasButton>
      <AtlasButton
        :disabled="!canApply || !parsedImport.ok"
        data-testid="concept-set-json-apply"
        @click="applyJson"
      >
        {{ t('components.cohortBuilder.jsonApply').value }}
      </AtlasButton>
    </template>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AtlasAlert, AtlasButton, AtlasDialog, AtlasSpacer, AtlasTextField } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/utils/logger'
import { parseConceptSetJson } from './concept-set-import'
import type { ConceptSetItem } from '@/models/concept-set.types'

interface Props {
  modelValue: boolean
  json: string
  filename: string
  canApply?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  canApply: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  apply: [items: ConceptSetItem[]]
}>()

const { t } = useI18n()
const draft = ref('')
const copied = ref(false)
const parsedImport = computed(() => parseConceptSetJson(draft.value))
const parseError = computed(() => draft.value.trim() ? parsedImport.value.error ?? '' : '')
let copiedTimer: ReturnType<typeof setTimeout> | undefined

watch(
  () => props.modelValue,
  open => {
    if (!open) return
    draft.value = props.json
    copied.value = false
  },
  { immediate: true }
)

async function copyJson() {
  try {
    await navigator.clipboard.writeText(draft.value)
    copied.value = true
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (error) {
    logger.error('ConceptSetJsonDialog', 'Clipboard copy failed', error)
  }
}

function downloadJson() {
  const blob = new Blob([draft.value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = props.filename
  link.click()
  URL.revokeObjectURL(url)
}

function applyJson() {
  if (!props.canApply || !parsedImport.value.ok) return
  emit('apply', parsedImport.value.items)
}
</script>

<style scoped>
.concept-set-json-dialog__editor :deep(textarea) {
  font-family: 'Roboto Mono', 'SF Mono', Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.55;
  white-space: pre;
  overflow-x: auto;
}
</style>
