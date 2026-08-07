<template>
  <v-card variant="outlined">
    <v-card-title>{{ t('ir.tabs.conceptSets', 'Concept Sets') }}</v-card-title>
    <v-card-text
      v-if="conceptSets.length === 0"
      class="muted"
    >
      {{
        t('cohortDefinitions.noConceptSets', 'This incidence rate has no concept sets attached.')
      }}
    </v-card-text>
    <v-table
      v-else
      density="compact"
    >
      <thead>
        <tr>
          <th>{{ t('columns.name', 'Name') }}</th>
          <th>{{ t('columns.actions', 'Actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="cs in conceptSets"
          :key="cs.id"
        >
          <td>{{ cs.name }}</td>
          <td>
            <AtlasButton
              v-if="typeof cs.id === 'number'"
              size="sm"
              variant="ghost"
              :to="`/conceptset/${cs.id}`"
            >
              {{ t('cs.manager.concept.tabs.hierarchy.view', 'View') }}
            </AtlasButton>
          </td>
        </tr>
      </tbody>
    </v-table>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import { AtlasButton } from '@/components/ui'

const { t } = useI18n()
const store = useIncidenceRateStore()

const conceptSets = computed(
  () =>
    (store.currentIR?.expression.ConceptSets ?? []) as Array<{ id?: number | string; name: string }>
)
</script>

<style scoped>
.muted {
  color: #888;
  padding: 16px;
}

:global(.v-theme--dark) .muted {
  color: var(--atlas-color-on-surface-variant);
}
</style>
