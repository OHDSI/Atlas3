<template>
  <AtlasDialog
    :model-value="modelValue"
    eyebrow="SQL"
    :title="t('components.cohortBuilder.sqlDialogTitle', 'Cohort SQL').value"
    :subtitle="t(
      'components.cohortBuilder.sqlDialogSubtitle',
      'The query this cohort generates. Template SQL keeps its @parameters so it runs anywhere; pick a dialect to see it rendered for one database.'
    ).value"
    max-width="900"
    data-testid="cohort-sql-dialog"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="$emit('update:modelValue', false)"
  >
    <AtlasSelect
      :model-value="dialect"
      :items="dialectItems"
      item-title="title"
      item-value="value"
      :label="t('components.cohortBuilder.sqlDialect', 'Dialect').value"
      :placeholder="t('components.cohortBuilder.sqlDialectTemplate', 'Template (no dialect)').value"
      variant="outlined"
      clearable
      hide-details
      density="compact"
      class="mb-3"
      data-testid="cohort-sql-dialect"
      @update:model-value="onDialectChange"
    />

    <AtlasProgressLinear
      v-if="loading"
      indeterminate
      color="primary"
      height="2"
      rounded
      class="mb-2"
      data-testid="cohort-sql-loading"
    />

    <AtlasTextField
      :model-value="sql"
      multiline
      readonly
      :rows="20"
      class="cohort-sql-dialog__viewer"
      spellcheck="false"
      :aria-label="t('components.cohortBuilder.sqlDialogTitle', 'Cohort SQL').value"
      data-testid="cohort-sql-field"
    />

    <AtlasAlert
      v-if="errorMessage"
      severity="danger"
      density="compact"
      class="mt-2"
      data-testid="cohort-sql-error"
    >
      {{ errorMessage }}
    </AtlasAlert>

    <template #actions>
      <AtlasButton
        variant="ghost"
        size="sm"
        :disabled="!sql.trim()"
        data-testid="cohort-sql-copy"
        @click="handleCopy"
      >
        {{ copied ? t('components.cohortBuilder.jsonCopied', 'Copied') : t('common.copy', 'Copy') }}
      </AtlasButton>

      <AtlasButton
        variant="ghost"
        size="sm"
        :disabled="!sql.trim()"
        data-testid="cohort-sql-download"
        @click="handleDownload"
      >
        {{ t('common.download', 'Download') }}
      </AtlasButton>

      <AtlasSpacer />

      <AtlasButton
        variant="ghost"
        data-testid="cohort-sql-close"
        @click="$emit('update:modelValue', false)"
      >
        {{ t('common.close', 'Close') }}
      </AtlasButton>
    </template>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  AtlasAlert,
  AtlasButton,
  AtlasDialog,
  AtlasProgressLinear,
  AtlasSelect,
  AtlasSpacer,
  AtlasTextField,
} from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/utils/logger'
import { generateCohortSql, translateSql, SQLRENDER_DIALECTS } from '@/services/cohort-sql.service'
import type { CohortExpression } from '@/models/circe-types'

/**
 * CohortSqlDialog — read the SQL a cohort definition generates.
 *
 * Read-only by design: this shows what the server would run, so there is
 * nothing here to apply back to the builder.
 *
 * The template is fetched once per open and kept, because clearing the dialect
 * has to return to it without another round trip — and because the cohort may
 * have been edited since the last open, which is why re-opening re-fetches.
 */
interface Props {
  modelValue: boolean
  /** Expression to build SQL for; need not be saved. */
  expression: CohortExpression | null
  /** Filename used by the Download action. */
  filename?: string
}

const props = withDefaults(defineProps<Props>(), {
  filename: 'cohort.sql',
})

defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const { t, tv } = useI18n()

const templateSql = ref('')
const translatedSql = ref('')
const dialect = ref<string | null>(null)
const loading = ref(false)
const errorMessage = ref('')
const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

const dialectItems = computed(() =>
  SQLRENDER_DIALECTS.map(d => ({ title: d.label, value: d.value }))
)

/** What the viewer shows: the translation when there is one, else the template. */
const sql = computed(() => (dialect.value ? translatedSql.value : templateSql.value))

watch(
  () => props.modelValue,
  open => {
    if (open) void loadTemplate()
  },
  { immediate: true }
)

async function loadTemplate() {
  if (!props.expression) return

  loading.value = true
  errorMessage.value = ''
  dialect.value = null
  translatedSql.value = ''

  const result = await generateCohortSql(props.expression)
  loading.value = false

  if (!result.success) {
    templateSql.value = ''
    errorMessage.value = result.error.message
    return
  }
  templateSql.value = result.data
}

async function onDialectChange(value: unknown) {
  const target = typeof value === 'string' && value ? value : null
  dialect.value = target
  errorMessage.value = ''

  // Clearing the dialect just reveals the template again — already in hand.
  if (!target) {
    translatedSql.value = ''
    return
  }

  loading.value = true
  const result = await translateSql(templateSql.value, target)
  loading.value = false

  if (!result.success) {
    // Fall back to the template rather than leaving the viewer empty: the
    // template is still valid, only this dialect could not be rendered.
    dialect.value = null
    translatedSql.value = ''
    errorMessage.value = result.error.message
    return
  }
  translatedSql.value = result.data
}

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(sql.value)
    copied.value = true
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (error) {
    logger.error('CohortSqlDialog', 'Clipboard copy failed', error)
    errorMessage.value = tv('components.cohortBuilder.copyFailed', 'Could not copy to clipboard')
  }
}

function handleDownload() {
  const blob = new Blob([sql.value], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = props.filename
  link.click()
  URL.revokeObjectURL(url)
}

onBeforeUnmount(() => clearTimeout(copiedTimer))
</script>

<style scoped>
.cohort-sql-dialog__viewer :deep(textarea) {
  font-family: var(--atlas-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  font-size: 0.8125rem;
  line-height: 1.5;
  white-space: pre;
}
</style>
