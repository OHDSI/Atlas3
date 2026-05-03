<template>
  <div
    class="event-concept-set-field"
    data-testid="event-concept-set-field"
  >
    <div class="event-concept-set-field__title">
      {{ label }}
    </div>
    <div class="event-concept-set-field__input">
      <v-btn
        v-if="!conceptSet || !conceptSet.id"
        color="primary"
        variant="outlined"
        size="small"
        data-testid="concept-set-picker"
        @click="emit('select')"
      >
        <AtlasIcon class="mr-2">
          mdi-plus
        </AtlasIcon>
        {{ selectLabel }}
      </v-btn>
      <v-chip
        v-else
        closable
        color="primary"
        data-testid="selected-concept-set"
        style="cursor: pointer"
        @click="emit('edit', conceptSet)"
        @click:close="emit('clear')"
      >
        {{ conceptSet.name }}
      </v-chip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AtlasIcon } from '@/components/ui'
withDefaults(
  defineProps<{
    conceptSet: { id: number | string; name: string } | undefined | null
    label?: string
    selectLabel?: string
  }>(),
  {
    conceptSet: undefined,
    label: 'Concept Set',
    selectLabel: 'Select Concept Set',
  }
)

const emit = defineEmits<{
  select: []
  clear: []
  edit: [conceptSet: { id: number | string; name: string }]
}>()
</script>

<style scoped>
.event-concept-set-field {
  display: flex;
  border-radius: 6px;
  border: 1px solid rgb(var(--v-theme-primary));
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
}

.event-concept-set-field__title {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  flex: 0 0 auto;
  min-width: 140px;
  color: rgb(var(--v-theme-primary));
  background: #ebf2fa;
  font-size: 13px;
  font-weight: 500;
  border-right: 1px solid rgb(var(--v-theme-primary));
}

.event-concept-set-field__input {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  flex: 1 1 auto;
  color: rgb(var(--v-theme-primary));
}
</style>
