<template>
  <AtlasDialog
    :model-value="modelValue"
    :eyebrow="t('common.cohort', 'Cohort').value"
    :title="t('components.pathwayCohortPicker.selectCohorts', 'Select cohorts').value"
    max-width="600"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
    @close="close"
  >
    <AtlasTextField
      v-model="search"
      :label="tv('common.search', 'Search')"
    />
    <AtlasList
      v-model:selected="selected"
      density="compact"
      select-strategy="independent"
    >
      <AtlasListItem
        v-for="c in filtered"
        :key="c.id"
        :value="c.id"
        :title="c.name"
      />
    </AtlasList>
    <template #actions>
      <AtlasButton
        variant="ghost"
        @click="close"
      >
        {{ t('common.cancel', 'Cancel') }}
      </AtlasButton>
      <AtlasButton
        :disabled="selected.length === 0"
        @click="confirm"
      >
        {{ t('ir.editor.addTargetCohort', 'Add target cohort') }}
      </AtlasButton>
    </template>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasDialog, AtlasList, AtlasListItem, AtlasTextField } from '@/components/ui'
import { ref, onMounted, computed } from 'vue'
import { getCohorts } from '@/services/webapi'
import type { PathwayCohortRef } from '@/models/pathway.types'
import { logger } from '@/utils/logger'
import { useI18n } from '@/composables/useI18n'

interface CohortOption {
  id: number
  name: string
}

const props = defineProps<{
  modelValue: boolean
  excludedIds: number[]
}>()

const emit = defineEmits<{
  'update:modelValue': [v: boolean]
  select: [refs: PathwayCohortRef[]]
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
    logger.error('PathwayCohortPicker', 'getCohorts failed', r.error)
  }
}

onMounted(load)

const filtered = computed(() =>
  cohorts.value.filter(
    c =>
      !props.excludedIds.includes(c.id) && c.name.toLowerCase().includes(search.value.toLowerCase())
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
