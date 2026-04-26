<template>
  <v-card
    class="pathway-card"
    @click="emit('open', pathway.id ?? 0)"
  >
    <v-card-title>{{ pathway.name }}</v-card-title>
    <v-card-subtitle v-if="pathway.description">
      {{ pathway.description }}
    </v-card-subtitle>
    <v-card-text>
      <div class="meta">
        <span v-if="pathway.createdBy?.name">By {{ pathway.createdBy.name }}</span>
        <span v-if="pathway.modifiedDate">Modified {{ pathway.modifiedDate }}</span>
      </div>
      <div class="tags">
        <v-chip
          v-for="tag in pathway.tags"
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
        @click.stop="emit('remove', pathway.id ?? 0)"
      >
        {{ t('pathwayDefinitions.delete', 'Delete pathway') }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import type { Pathway } from '@/models/pathway.types'
import { useI18n } from '@/composables/useI18n'

defineProps<{ pathway: Pathway }>()
const emit = defineEmits<{ open: [id: number]; remove: [id: number] }>()
const { t } = useI18n()
</script>

<style scoped>
.pathway-card { cursor: pointer; }
.meta { font-size: 0.85em; color: #666; }
.tags { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; }
</style>
