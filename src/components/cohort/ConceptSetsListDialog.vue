<template>
  <AtlasDialog
    :model-value="modelValue"
    eyebrow="CONCEPTS"
    :title="t('navigation.conceptsets', 'Concept Sets').value"
    max-width="900"
    @update:model-value="$emit('update:modelValue', $event)"
    @close="$emit('update:modelValue', false)"
  >
    <v-table>
      <thead>
        <tr>
          <th class="text-left">
            {{ t('columns.id', 'ID') }}
          </th>
          <th class="text-left">
            {{ t('columns.name', 'Name') }}
          </th>
          <th class="text-left">
            {{ t('common.concepts', 'Concepts') }}
          </th>
          <th class="text-left">
            {{ t('columns.status', 'Status') }}
          </th>
          <th class="text-left">
            {{ t('columns.actions', 'Actions') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="conceptSet in conceptSets"
          :key="conceptSet.id"
        >
          <td>{{ conceptSet.id }}</td>
          <td>{{ conceptSet.name }}</td>
          <td>{{ conceptSet.items?.length || 0 }}</td>
          <td>
            <AtlasChip
              v-if="isUnused(conceptSet)"
              size="sm"
              variant="outlined"
              tone="warning"
            >
              {{ t('cohortDefinitions.unused', 'Unused') }}
            </AtlasChip>
          </td>
          <td>
            <AtlasIconButton
              icon="mdi-pencil-outline"
              v-bind="{ ariaLabel: t('common.edit', 'Edit').value }"
              variant="text"
              size="sm"
              @click="$emit('view', conceptSet)"
            />
            <AtlasIconButton
              icon="mdi-delete-outline"
              v-bind="{ ariaLabel: t('common.delete', 'Delete').value }"
              variant="text"
              size="sm"
              @click="$emit('delete', conceptSet)"
            />
          </td>
        </tr>
      </tbody>
    </v-table>
    <div
      v-if="conceptSets.length === 0"
      class="text-center py-8 text-grey"
    >
      {{ t('cohortDefinitions.noConceptSets', 'No concept sets in this cohort') }}
    </div>
    <template #actions>
      <AtlasButton
        @click="$emit('update:modelValue', false)"
      >
        {{ t('common.close') }}
      </AtlasButton>
    </template>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasChip, AtlasDialog, AtlasIconButton } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { ConceptSetReference } from '@/models/cohort.types'

interface Props {
  modelValue: boolean
  conceptSets: ConceptSetReference[]
  usedConceptSets?: ConceptSetReference[]
}

const props = defineProps<Props>()

defineEmits<{
  'update:modelValue': [value: boolean]
  view: [conceptSet: ConceptSetReference]
  delete: [conceptSet: ConceptSetReference]
}>()

const { t } = useI18n()

/**
 * Check if a concept set is not used in any criteria
 */
function isUnused(conceptSet: ConceptSetReference): boolean {
  if (!props.usedConceptSets || props.usedConceptSets.length === 0) {
    return true // If no used sets, all are unused
  }
  return !props.usedConceptSets.some(used => used.id === conceptSet.id)
}
</script>
