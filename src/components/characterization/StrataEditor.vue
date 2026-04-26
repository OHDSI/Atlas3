<!--
  StrataEditor

  Phase 3 placeholder for the criteria-builder integration. Each stratum
  has a name and a JSON textarea holding the CriteriaGroup payload — the
  full builder lands in a follow-up. JSON parse errors surface inline as
  a chip but never block typing.
-->
<template>
  <div class="strata-editor">
    <h2 class="strata-editor__title">
      {{ t('characterizations.editor.strata.title', 'Subgroups (Strata)') }}
    </h2>

    <div
      v-if="strata.length === 0"
      class="strata-editor__empty"
      data-testid="strata-editor-empty"
    >
      {{ t('characterizations.editor.strata.empty', 'No strata defined.') }}
    </div>

    <div
      v-for="(stratum, index) in strata"
      :key="stratum.id"
      class="strata-editor__card"
      :data-testid="`strata-editor-card-${index}`"
    >
      <div class="strata-editor__card-header">
        <v-text-field
          :model-value="stratum.name"
          :label="t('characterizations.editor.strata.name', 'Stratum name').value"
          density="comfortable"
          variant="outlined"
          hide-details
          class="strata-editor__name"
          :data-testid="`strata-editor-name-${index}`"
          @update:model-value="(value: string) => updateName(index, value)"
        />
        <v-btn
          icon="mdi-delete"
          size="small"
          variant="text"
          color="error"
          :aria-label="t('characterizations.editor.strata.remove', 'Remove').value"
          :data-testid="`strata-editor-remove-${index}`"
          @click="removeStratum(index)"
        />
      </div>
      <div class="strata-editor__criteria-row">
        <v-chip
          v-if="jsonErrors[stratum.id]"
          color="error"
          size="small"
          variant="tonal"
          class="strata-editor__chip"
          :data-testid="`strata-editor-invalid-${index}`"
        >
          {{ t('characterizations.editor.strata.invalidJson', 'Invalid JSON') }}
        </v-chip>
      </div>
      <v-textarea
        :model-value="jsonText[stratum.id] ?? ''"
        :label="t('characterizations.editor.strata.criteriaLabel', 'Criteria (JSON)').value"
        :placeholder="
          t(
            'characterizations.editor.strata.criteriaPlaceholder',
            'Criteria builder integration ships in a follow-up. For now, paste a CriteriaGroup JSON.'
          ).value
        "
        density="comfortable"
        variant="outlined"
        rows="6"
        auto-grow
        class="strata-editor__criteria"
        :data-testid="`strata-editor-criteria-${index}`"
        @update:model-value="(value: string) => updateCriteria(stratum.id, value)"
      />
    </div>

    <div class="strata-editor__actions">
      <v-btn
        variant="outlined"
        color="primary"
        prepend-icon="mdi-plus"
        data-testid="strata-editor-add"
        @click="addStratum"
      >
        {{ t('characterizations.editor.strata.add', 'Add stratum') }}
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'

import { useI18n } from '@/composables/useI18n'
import type { Stratum } from '@/models/characterization.types'

const props = defineProps<{
  modelValue: Stratum[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Stratum[]]
}>()

const { t } = useI18n()

const strata = props.modelValue

// Mirror each stratum's `criteria` (an unknown object) as a JSON string per
// stratum id. We sync back into the parent via emit on every change; parse
// errors are tracked separately so the UI can flag them without blocking
// the user mid-edit.
const jsonText = reactive<Record<string, string>>({})
const jsonErrors = reactive<Record<string, boolean>>({})

function syncFromModel(value: Stratum[]) {
  // Drop any keys that no longer exist.
  for (const key of Object.keys(jsonText)) {
    if (!value.some((s) => s.id === key)) {
      delete jsonText[key]
      delete jsonErrors[key]
    }
  }
  // Seed entries for any new strata we haven't typed for yet.
  for (const stratum of value) {
    if (!(stratum.id in jsonText)) {
      jsonText[stratum.id] = stringifySafe(stratum.criteria)
      jsonErrors[stratum.id] = false
    }
  }
}

watch(() => props.modelValue, syncFromModel, { immediate: true, deep: false })

function stringifySafe(value: unknown): string {
  try {
    return JSON.stringify(value ?? {}, null, 2)
  } catch {
    return '{}'
  }
}

function makeUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID — sufficient for tests.
  return `s-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
}

function emitUpdate(next: Stratum[]) {
  emit('update:modelValue', next)
}

function updateName(index: number, name: string) {
  const next = props.modelValue.map((s, i) => (i === index ? { ...s, name } : s))
  emitUpdate(next)
}

function updateCriteria(id: string, raw: string) {
  jsonText[id] = raw
  let parsed: unknown = {}
  let invalid = false
  try {
    parsed = raw.trim() === '' ? {} : JSON.parse(raw)
    invalid = false
  } catch {
    invalid = true
  }
  jsonErrors[id] = invalid

  if (!invalid) {
    const next = props.modelValue.map((s) => (s.id === id ? { ...s, criteria: parsed } : s))
    emitUpdate(next)
  }
}

function addStratum() {
  const stratum: Stratum = {
    id: makeUuid(),
    name: '',
    criteria: {},
  }
  emitUpdate([...props.modelValue, stratum])
}

function removeStratum(index: number) {
  const next = props.modelValue.filter((_, i) => i !== index)
  emitUpdate(next)
}
</script>

<style scoped>
.strata-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.strata-editor__title {
  font-size: 1.1rem;
  font-weight: 500;
  margin: 0 0 4px 0;
}

.strata-editor__empty {
  padding: 12px 0;
  color: #666;
  font-style: italic;
}

.strata-editor__card {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.strata-editor__card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.strata-editor__name {
  flex: 1;
}

.strata-editor__criteria-row {
  min-height: 0;
}

.strata-editor__chip {
  margin-bottom: 4px;
}

.strata-editor__criteria :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.85rem;
}

.strata-editor__actions {
  display: flex;
  justify-content: flex-start;
}
</style>
