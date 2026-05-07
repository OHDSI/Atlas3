<template>
  <v-navigation-drawer
    :model-value="modelValue"
    location="right"
    temporary
    :width="drawerWidth"
    @update:model-value="onDrawerChange"
  >
    <v-card flat class="h-100 d-flex flex-column">
      <v-card-title class="d-flex align-center pa-4 border-b">
        <AtlasIcon class="mr-2" color="primary">{{ headerIcon }}</AtlasIcon>
        <span class="text-h6">{{ headerTitle }}</span>
        <AtlasSpacer />
        <AtlasIconButton
          icon="mdi-close"
          :ariaLabel="closeLabel"
          variant="text"
          size="sm"
          data-testid="report-drawer-close"
          @click="close"
        />
      </v-card-title>
      <v-card-text class="flex-grow-1 overflow-y-auto pa-6">
        <InclusionRuleReport
          v-if="reportType === 'inclusion' && cohortId !== null && sourceKey"
          :cohort-id="cohortId"
          :source-key="sourceKey"
        />
        <CohortSamplesPanel
          v-else-if="reportType === 'samples' && cohortId !== null && sourceKey"
          :cohort-id="cohortId"
          :source-key="sourceKey"
        />
      </v-card-text>
    </v-card>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AtlasIcon, AtlasIconButton, AtlasSpacer } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import InclusionRuleReport from '@/components/reports/inclusion/InclusionRuleReport.vue'
import CohortSamplesPanel from '@/components/cohort-samples/CohortSamplesPanel.vue'

interface Props {
  modelValue: boolean
  cohortId: number | null
  sourceKey: string | null
  reportType: 'inclusion' | 'samples' | null
}

const props = defineProps<Props>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { t } = useI18n()

const drawerWidth = computed(() =>
  typeof window !== 'undefined' ? Math.min(window.innerWidth * 0.85, 1400) : 1200
)

const headerIcon = computed(() =>
  props.reportType === 'samples' ? 'mdi-shuffle-variant' : 'mdi-filter-variant'
)

const headerTitle = computed(() => {
  if (props.reportType === 'samples') {
    return t('cohortDefinitions.generation.drawer.samplesTitle', 'Cohort samples').value
  }
  return t('cohortDefinitions.generation.drawer.inclusionTitle', 'Inclusion rule report').value
})

const closeLabel = computed(() => t('common.close', 'Close').value)

function close() {
  emit('update:modelValue', false)
}

function onDrawerChange(value: boolean) {
  emit('update:modelValue', value)
}
</script>

<style scoped>
.border-b {
  border-bottom: 1px solid rgb(var(--v-border-color));
}
</style>
