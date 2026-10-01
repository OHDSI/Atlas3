<template>
  <AtlasDialog
    :model-value="modelValue"
    eyebrow="COHORT"
    :title="t('components.cohortBuilder.printFriendlyDialogTitle', 'Print Friendly').value"
    :subtitle="t('components.cohortBuilder.printFriendlyDialogSubtitle', 'A readable view of this cohort definition.').value"
    max-width="900"
    data-testid="cohort-print-friendly-dialog"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="$emit('update:modelValue', false)"
  >
    <AtlasProgressLinear
      v-if="loading"
      indeterminate
      color="primary"
      height="2"
      data-testid="cohort-print-friendly-loading"
    />

    <AtlasAlert
      v-else-if="errorMessage"
      severity="danger"
      density="compact"
      data-testid="cohort-print-friendly-error"
    >
      {{ errorMessage }}
    </AtlasAlert>

    <div
      v-else-if="html"
      class="cohort-print-friendly-dialog__content"
      data-testid="cohort-print-friendly-content"
    >
      <!-- eslint-disable-next-line vue/no-v-html -- trusted WebAPI-rendered cohort content -->
      <div v-html="html" />
    </div>

    <template #actions>
      <AtlasSpacer />
      <AtlasButton
        variant="ghost"
        data-testid="cohort-print-friendly-close"
        @click="$emit('update:modelValue', false)"
      >
        {{ t('common.close', 'Close') }}
      </AtlasButton>
    </template>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { AtlasAlert, AtlasButton, AtlasDialog, AtlasProgressLinear, AtlasSpacer } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import { getCohortPrintFriendly } from '@/services/cohort-definition.service'
import type { CohortExpression } from '@/models/circe-types'

interface Props {
  modelValue: boolean
  expression: CohortExpression | null
}

const props = defineProps<Props>()

defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const { t } = useI18n()
const html = ref('')
const loading = ref(false)
const errorMessage = ref('')

watch(
  () => props.modelValue,
  open => {
    if (open) void loadPrintFriendly()
  },
  { immediate: true }
)

async function loadPrintFriendly() {
  if (!props.expression) return

  html.value = ''
  errorMessage.value = ''
  loading.value = true

  const result = await getCohortPrintFriendly(props.expression)
  loading.value = false

  if (!result.success) {
    errorMessage.value = result.error.message
    return
  }

  html.value = result.data
}
</script>

<style scoped>
.cohort-print-friendly-dialog__content {
  max-height: 600px;
  overflow-y: auto;
  line-height: 1.5;
}

.cohort-print-friendly-dialog__content :deep(h1),
.cohort-print-friendly-dialog__content :deep(h2),
.cohort-print-friendly-dialog__content :deep(h3) {
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
}

.cohort-print-friendly-dialog__content :deep(ul),
.cohort-print-friendly-dialog__content :deep(ol) {
  padding-left: 1.5rem;
}
</style>