<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
    max-width="600"
  >
    <v-card>
      <v-card-title>Select cohorts</v-card-title>
      <v-card-text>
        <v-text-field v-model="search" label="Search" density="compact" />
        <v-list density="compact" select-strategy="independent" v-model:selected="selected">
          <v-list-item
            v-for="c in filtered"
            :key="c.id"
            :value="c.id"
            :title="c.name"
          />
        </v-list>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="close">Cancel</v-btn>
        <v-btn color="primary" @click="confirm" :disabled="selected.length === 0">Add</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getCohorts } from '@/services/webapi'
import type { PathwayCohortRef } from '@/models/pathway.types'
import { logger } from '@/utils/logger'

interface CohortOption { id: number; name: string }

const props = defineProps<{
  modelValue: boolean
  excludedIds: number[]
}>()

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  'select': [refs: PathwayCohortRef[]]
}>()

const cohorts = ref<CohortOption[]>([])
const selected = ref<number[]>([])
const search = ref('')

async function load() {
  const r = await getCohorts()
  if (r.success) {
    cohorts.value = r.data.map(c => ({ id: c.id, name: c.name }))
  } else {
    logger.error('PathwayCohortPicker', 'getCohorts failed', r.error)
  }
}

onMounted(load)

const filtered = computed(() =>
  cohorts.value.filter(c =>
    !props.excludedIds.includes(c.id) &&
    c.name.toLowerCase().includes(search.value.toLowerCase())
  )
)

function close() {
  emit('update:modelValue', false)
  selected.value = []
  search.value = ''
}

function confirmSelection(refs: PathwayCohortRef[]) {
  emit('select', refs)
  close()
}

function confirm() {
  const refs = cohorts.value
    .filter(c => selected.value.includes(c.id))
    .map(c => ({ id: c.id, name: c.name }))
  confirmSelection(refs)
}

defineExpose({ confirmSelection })
</script>
