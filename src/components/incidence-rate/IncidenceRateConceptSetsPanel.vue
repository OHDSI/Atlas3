<template>
  <v-card variant="outlined">
    <v-card-title>{{ t('incidenceRate.conceptSets', 'Concept Sets') }}</v-card-title>
    <v-card-text v-if="conceptSets.length === 0" class="muted">
      {{ t('incidenceRate.noConceptSets', 'This incidence rate has no concept sets attached.') }}
    </v-card-text>
    <v-table v-else density="compact">
      <thead>
        <tr>
          <th>{{ t('common.name', 'Name') }}</th>
          <th>{{ t('common.actions', 'Actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="cs in conceptSets" :key="cs.id">
          <td>{{ cs.name }}</td>
          <td>
            <v-btn
              v-if="typeof cs.id === 'number'"
              size="x-small"
              variant="text"
              :to="`/conceptset/${cs.id}`"
            >{{ t('common.view', 'View') }}</v-btn>
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

const { t } = useI18n()
const store = useIncidenceRateStore()

const conceptSets = computed(() =>
  (store.currentIR?.expression.ConceptSets ?? []) as Array<{ id?: number | string; name: string }>
)
</script>

<style scoped>
.muted { color: #888; padding: 16px; }
</style>
