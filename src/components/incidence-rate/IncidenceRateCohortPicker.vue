<template>
  <v-dialog
    :model-value="modelValue"
    max-width="600"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
  >
    <v-card>
      <v-card-title>Select cohorts</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="search"
          :label="tv('common.search', 'Search')"
          density="compact"
        />
        <v-list
          v-model:selected="selected"
          density="compact"
          select-strategy="independent"
        >
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
        <v-btn @click="close">
          {{ t('common.cancel', 'Cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          :disabled="selected.length === 0"
          @click="confirm"
        >
          {{ t('common.add', 'Add cohort') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getCohorts } from '@/services/webapi'
import { logger } from '@/utils/logger'
import { useI18n } from '@/composables/useI18n'

interface CohortOption { id: number; name: string }

const props = defineProps<{
  modelValue: boolean
  excludedIds?: number[]
}>()

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  'select': [ref: { id: number; name: string }]
}>()

const cohorts = ref<CohortOption[]>([])
const selected = ref<number[]>([])
const search = ref('')
const { t, tv } = useI18n()

async function load() {
  const r = await getCohorts()
  if (r.success) {
    cohorts.value = r.data.map(c => ({ id: c.id, name: c.name }))
  } else {
    logger.error('IncidenceRateCohortPicker', 'getCohorts failed', r.error)
  }
}

onMounted(load)

const filtered = computed(() =>
  cohorts.value.filter(c =>
    !(props.excludedIds ?? []).includes(c.id) &&
    c.name.toLowerCase().includes(search.value.toLowerCase())
  )
)

function close() {
  emit('update:modelValue', false)
  selected.value = []
  search.value = ''
}

function confirmSelection(ref: { id: number; name: string }) {
  emit('select', ref)
  close()
}

function confirm() {
  const chosen = cohorts.value.find(c => selected.value.includes(c.id))
  if (chosen) confirmSelection({ id: chosen.id, name: chosen.name })
}

defineExpose({ confirmSelection })
</script>
