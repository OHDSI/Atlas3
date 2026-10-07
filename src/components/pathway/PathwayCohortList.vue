<template>
  <v-table
    class="pathway-cohort-list"
    density="compact"
  >
    <thead>
      <tr>
        <th class="pathway-cohort-list__id">
          {{ t('columns.id', 'ID') }}
        </th>
        <th>{{ t('columns.name', 'Display name') }}</th>
        <th class="pathway-cohort-list__actions" />
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="c in cohorts"
        :key="c.id"
      >
        <td class="pathway-cohort-list__id">
          {{ c.id }}
        </td>
        <td>
          <AtlasTextField
            :model-value="c.name"
            hide-details
            :readonly="readonly"
            @update:model-value="(v) => emit('rename', c.id, String(v))"
          />
        </td>
        <td class="pathway-cohort-list__actions">
          <AtlasIconButton
            icon="mdi-close"
            size="sm"
            variant="text"
            v-bind="{ ariaLabel: t('components.pathwayCohortList.removeCohort', 'Remove cohort').value }"
            :disabled="readonly"
            @click="emit('remove', c.id)"
          />
        </td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup lang="ts">
import { AtlasIconButton, AtlasTextField } from '@/components/ui'
import type { PathwayCohortRef } from '@/models/pathway.types'
import { useI18n } from '@/composables/useI18n'

defineProps<{
  cohorts: PathwayCohortRef[]
  readonly?: boolean
}>()

const emit = defineEmits<{
  rename: [id: number, name: string]
  remove: [id: number]
}>()

const { t } = useI18n()
</script>

<style scoped>
.pathway-cohort-list :deep(table) {
  width: 100%;
  table-layout: fixed;
}

.pathway-cohort-list__id,
.pathway-cohort-list__actions {
  width: 56px;
  white-space: nowrap;
}

.pathway-cohort-list__actions {
  text-align: center;
}
</style>
