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
            <AtlasIconButton
              icon="mdi-pencil-outline"
              v-bind="{ ariaLabel: 'Edit' }"
              variant="text"
              size="sm"
              @click="$emit('view', conceptSet)"
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
import { AtlasButton, AtlasDialog, AtlasIconButton } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { ConceptSetReference } from '@/models/cohort.types'

interface Props {
  modelValue: boolean
  conceptSets: ConceptSetReference[]
}

defineProps<Props>()

defineEmits<{
  'update:modelValue': [value: boolean]
  view: [conceptSet: ConceptSetReference]
}>()

const { t } = useI18n()
</script>
