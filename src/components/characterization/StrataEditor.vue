<!--
  StrataEditor — labelled "Subgroup analyses" in the UI to match Atlas 2.15
  terminology.

  Phase 3 placeholder for the criteria-builder integration. Each subgroup
  has a name and a JSON textarea holding the CriteriaGroup payload — the
  full builder lands in a follow-up. JSON parse errors surface inline as
  a chip but never block typing.
-->
<template>
  <div class="strata-editor">
    <div class="strata-editor__header">
      <h2 class="strata-editor__title">
        {{ t('cc.viewEdit.design.subgroups.title', 'Subgroup analyses').value }}
      </h2>
      <v-btn
        variant="outlined"
        color="primary"
        size="small"
        density="compact"
        prepend-icon="mdi-plus"
        data-testid="strata-editor-add"
        @click="addStratum"
      >
        {{ t('cc.viewEdit.design.subgroups.newSubgroup', 'New subgroup').value }}
      </v-btn>
    </div>

    <div
      v-if="modelValue.length === 0"
      class="strata-editor__empty"
      data-testid="strata-editor-empty"
    >
      {{ t('cc.viewEdit.design.subgroups.noSubgroups', 'No subgroups defined').value }}
    </div>

    <v-switch
      v-if="modelValue.length > 0"
      :model-value="strataOnly"
      :label="
        t('cc.viewEdit.design.subgroups.subgroupOnly', 'Calculate subgroup analyses only').value
      "
      density="compact"
      color="primary"
      hide-details
      data-testid="strata-editor-only"
      @update:model-value="(v: boolean | null) => $emit('update:strataOnly', !!v)"
    />

    <div
      v-for="(stratum, index) in modelValue"
      :key="stratum.id"
      class="strata-editor__card"
      :data-testid="`strata-editor-card-${index}`"
    >
      <div class="strata-editor__card-header">
        <v-text-field
          :model-value="stratum.name"
          :label="
            t('cc.viewEdit.design.subgroups.namePlaceholder', 'Subgroup name').value
          "
          :error="!stratum.name.trim() || isDuplicate(stratum.name)"
          :error-messages="nameErrors(stratum.name)"
          density="compact"
          variant="outlined"
          hide-details="auto"
          class="strata-editor__name"
          :data-testid="`strata-editor-name-${index}`"
          @update:model-value="(value: string) => updateName(index, value)"
        />
        <v-btn
          icon="mdi-delete"
          size="small"
          variant="text"
          color="error"
          :aria-label="t('columns.remove', 'Remove').value"
          :data-testid="`strata-editor-remove-${index}`"
          @click="removeStratum(index)"
        />
      </div>
      <v-chip
        v-if="jsonErrors[stratum.id]"
        color="error"
        size="small"
        variant="tonal"
        class="strata-editor__chip"
        :data-testid="`strata-editor-invalid-${index}`"
      >
        {{ t('characterizations.editor.strata.invalidJson', 'Invalid JSON').value }}
      </v-chip>
      <v-textarea
        :model-value="jsonText[stratum.id] ?? ''"
        :label="t('components.dateAdjust.criteriaLabel', 'Criteria (JSON)').value"
        :placeholder="
          t(
            'characterizations.editor.strata.criteriaPlaceholder',
            'Criteria builder integration ships in a follow-up. For now, paste a CriteriaGroup JSON.'
          ).value
        "
        density="compact"
        variant="outlined"
        rows="6"
        auto-grow
        class="strata-editor__criteria"
        :data-testid="`strata-editor-criteria-${index}`"
        @update:model-value="(value: string) => updateCriteria(stratum.id, value)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'

import { useI18n } from '@/composables/useI18n'
import type { Stratum } from '@/models/characterization.types'

const props = defineProps<{
  modelValue: Stratum[]
  strataOnly?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Stratum[]]
  'update:strataOnly': [value: boolean]
}>()

const { t, tv } = useI18n()

const jsonText = reactive<Record<string, string>>({})
const jsonErrors = reactive<Record<string, boolean>>({})

function syncFromModel(value: Stratum[]) {
  for (const key of Object.keys(jsonText)) {
    if (!value.some(s => s.id === key)) {
      delete jsonText[key]
      delete jsonErrors[key]
    }
  }
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
  return `s-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
}

const nameCounts = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = {}
  for (const s of props.modelValue) {
    const key = s.name.trim()
    if (!key) continue
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
})

function isDuplicate(name: string): boolean {
  const key = name.trim()
  if (!key) return false
  return (nameCounts.value[key] ?? 0) > 1
}

function nameErrors(name: string): string[] {
  if (!name.trim()) {
    return [tv('cc.viewEdit.design.subgroups.messages.nameIsEmpty', 'Subgroup name is empty.')]
  }
  if (isDuplicate(name)) {
    return [
      tv('cc.viewEdit.design.subgroups.messages.nameIsNotUnique', 'Subgroup name is duplicated.'),
    ]
  }
  return []
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
    const next = props.modelValue.map(s => (s.id === id ? { ...s, criteria: parsed } : s))
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
  gap: 10px;
}

.strata-editor__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.strata-editor__title {
  font-size: 1rem;
  font-weight: 500;
  margin: 0;
}

.strata-editor__empty {
  padding: 8px 0;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-style: italic;
  font-size: 12px;
}

.strata-editor__card {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.strata-editor__card-header {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.strata-editor__name {
  flex: 1;
}

.strata-editor__chip {
  align-self: flex-start;
}

.strata-editor__criteria :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8rem;
}
</style>
