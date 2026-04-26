<template>
  <v-card
    class="incidence-rate-card"
    @click="emit('open', incidenceRate.id ?? 0)"
  >
    <v-card-title>{{ incidenceRate.name }}</v-card-title>
    <v-card-subtitle v-if="incidenceRate.description">
      {{ incidenceRate.description }}
    </v-card-subtitle>
    <v-card-text>
      <div class="meta">
        <span v-if="incidenceRate.createdBy?.name">By {{ incidenceRate.createdBy.name }}</span>
        <span v-if="incidenceRate.modifiedDate">Modified {{ incidenceRate.modifiedDate }}</span>
      </div>
      <div class="tags">
        <v-chip
          v-for="tag in incidenceRate.tags"
          :key="tag.id"
          size="x-small"
        >
          {{ tag.name }}
        </v-chip>
      </div>
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <v-btn
        size="small"
        color="error"
        variant="text"
        @click.stop="emit('remove', incidenceRate.id ?? 0)"
      >
        {{ t('incidenceRateAnalysis.delete', 'Delete incidence rate') }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import type { IncidenceRate } from '@/models/incidence-rate.types'
import { useI18n } from '@/composables/useI18n'

defineProps<{ incidenceRate: IncidenceRate }>()
const emit = defineEmits<{ open: [id: number]; remove: [id: number] }>()
const { t } = useI18n()
</script>

<style scoped>
.incidence-rate-card { cursor: pointer; }
.meta { font-size: 0.85em; color: #666; }
.tags { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; }
</style>
