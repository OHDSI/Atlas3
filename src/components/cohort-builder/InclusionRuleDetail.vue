<template>
  <div
    v-if="rule === null"
    class="rule-detail rule-detail--empty"
    data-testid="inclusion-detail-empty"
  >
    {{ t('inclusionRail.selectRule', 'Select a rule on the left to edit it.').value }}
  </div>
  <div
    v-else
    class="rule-detail"
  >
    <div class="rule-description-container mb-3">
      <input
        :value="rule.description ?? ''"
        class="rule-description-input"
        :placeholder="
          t('inclusionRail.descriptionPlaceholder', 'Add a description for this inclusion rule…').value
        "
        @blur="onDescriptionBlur(($event.target as HTMLInputElement).value)"
      >
    </div>

    <div
      v-for="(group, groupIndex) in rule.criteriaGroups"
      :key="group.id"
      class="mb-3"
    >
      <CriteriaGroupEditor
        :model-value="group"
        @update:model-value="onUpdateGroup(groupIndex, $event)"
        @remove="onRemoveGroup(groupIndex)"
        @select-concept-set="$emit('select-concept-set', {
          groupIndex,
          eventIndex: typeof $event === 'number' ? $event : $event.eventIndex,
          nestedEventIndex:
            typeof $event === 'number' ? undefined : 'nestedEventIndex' in $event ? $event.nestedEventIndex : undefined,
        })"
        @select-concept="$emit('select-concept', { groupIndex, ...$event })"
        @edit-concept-set="$emit('edit-concept-set', $event)"
      />
    </div>

    <AtlasButton
      variant="primary"
      icon="mdi-plus"
      size="sm"
      data-testid="add-criteria-group"
      @click="onAddGroup"
    >
      {{ t('inclusionRail.addCriteriaGroup', 'Add criteria group').value }}
    </AtlasButton>
  </div>
</template>

<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid'
import { AtlasButton } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import CriteriaGroupEditor from './CriteriaGroupEditor.vue'
import type { CriteriaGroup, InclusionRule } from '@/models/cohort.types'

const { t } = useI18n()

interface Props {
  rule: InclusionRule | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:rule': [rule: InclusionRule]
  'select-concept-set': [
    ctx: { groupIndex: number; eventIndex: number; nestedEventIndex?: number },
  ]
  'select-concept': [ctx: {
    groupIndex: number
    eventIndex: number
    attributeIndex: number
    domainFilter: string | undefined
  }]
  'edit-concept-set': [conceptSet: { id: number | string; name: string; items?: unknown[] }]
}>()

function emitUpdated(next: InclusionRule): void {
  emit('update:rule', next)
}

function onDescriptionBlur(value: string): void {
  if (!props.rule) return
  emitUpdated({ ...props.rule, description: value || undefined })
}

function onUpdateGroup(index: number, group: CriteriaGroup): void {
  if (!props.rule) return
  const groups = [...props.rule.criteriaGroups]
  groups[index] = group
  emitUpdated({ ...props.rule, criteriaGroups: groups })
}

function onRemoveGroup(index: number): void {
  if (!props.rule) return
  const groups = [...props.rule.criteriaGroups]
  groups.splice(index, 1)
  emitUpdated({ ...props.rule, criteriaGroups: groups })
}

function onAddGroup(): void {
  if (!props.rule) return
  const newGroup: CriteriaGroup = { id: uuidv4(), logicType: 'ALL', events: [] }
  emitUpdated({ ...props.rule, criteriaGroups: [...props.rule.criteriaGroups, newGroup] })
}
</script>

<style scoped>
.rule-detail--empty {
  padding: 24px;
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface-variant));
  text-align: center;
  background: rgb(var(--v-theme-surface-variant));
  border-radius: 8px;
}

.rule-description-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rule-description-input {
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface));
  border: 1px solid rgb(var(--v-theme-outline));
  background: rgb(var(--v-theme-surface));
  padding: 8px 12px;
  border-radius: 4px;
  transition: all 0.2s;
  font-family: inherit;
  width: 100%;
}
.rule-description-input:focus,
.rule-description-input:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 2px rgb(var(--v-theme-primary), 0.1);
}
.rule-description-input:hover { border-color: rgb(var(--v-theme-primary)); }
.rule-description-input::placeholder { color: rgb(var(--v-theme-on-surface-variant)); }
</style>
