<template>
  <v-dialog
    :model-value="modelValue"
    max-width="900"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <AtlasIcon
          color="primary"
          class="mr-2"
        >
          mdi-shape
        </AtlasIcon>
        {{ t('navigation.conceptsets', 'Concept Sets') }}
      </v-card-title>
      <v-card-text>
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
                <v-btn
                  icon
                  size="small"
                  variant="text"
                  @click="$emit('view', conceptSet)"
                >
                  <AtlasIcon size="small">
                    mdi-eye
                  </AtlasIcon>
                </v-btn>
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
      </v-card-text>
      <v-card-actions>
        <AtlasSpacer />
        <AtlasButton
          @click="$emit('update:modelValue', false)"
        >
          {{ t('common.close') }}
        </AtlasButton>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasIcon, AtlasSpacer } from '@/components/ui'
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
