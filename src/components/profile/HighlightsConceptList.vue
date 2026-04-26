<template>
  <div class="highlights-concept-list">
    <v-text-field
      v-model="search"
      :label="tv('common.search', 'Search')"
      density="compact"
      hide-details
      clearable
    />
    <v-list
      density="compact"
      class="overflow-auto"
      max-height="320"
    >
      <v-list-item
        v-for="c in items"
        :key="c.conceptId"
      >
        <template #prepend>
          <v-checkbox
            :data-test="`highlight-concept-cb-${c.conceptId}`"
            :model-value="selected.has(c.conceptId)"
            hide-details
            @update:model-value="(v) => toggle(c.conceptId, v)"
          />
        </template>
        <v-list-item-title>{{ c.conceptName }}</v-list-item-title>
        <v-list-item-subtitle>{{ c.domain }} — {{ c.count }}</v-list-item-subtitle>
      </v-list-item>
    </v-list>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useTimelineFilters } from '@/composables/useTimelineFilters'
import { useI18n } from '@/composables/useI18n'

const { uniqueConcepts } = useTimelineFilters()
const { tv } = useI18n()

const emit = defineEmits<{ (e: 'selectionChange', ids: number[]): void }>()

const search = ref('')
const selected = ref<Set<number>>(new Set())

const items = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = uniqueConcepts.value.slice().sort((a, b) => b.count - a.count)
  if (!q) return list
  return list.filter(c => c.conceptName.toLowerCase().includes(q))
})

function toggle(id: number, on: boolean | null) {
  const next = new Set(selected.value)
  if (on) next.add(id)
  else next.delete(id)
  selected.value = next
  emit('selectionChange', Array.from(next))
}

watch(uniqueConcepts, () => {
  // Drop selections that no longer exist in the filtered set
  const ids = new Set(uniqueConcepts.value.map(c => c.conceptId))
  const next = new Set([...selected.value].filter(id => ids.has(id)))
  if (next.size !== selected.value.size) {
    selected.value = next
    emit('selectionChange', Array.from(next))
  }
})
</script>
