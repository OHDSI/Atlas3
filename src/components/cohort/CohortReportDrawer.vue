<template>
  <AtlasSideSheet
    :model-value="modelValue"
    width="calc(100vw - 100px)"
    :aria-label="headerTitle"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div
      class="crd"
      data-testid="cohort-report-drawer"
    >
      <header class="crd__header">
        <AtlasIconButton
          v-if="reportType === 'profile'"
          icon="mdi-arrow-left"
          v-bind="{ ariaLabel: t('components.cohortReportDrawer.backToSamples').value }"
          variant="text"
          size="sm"
          data-testid="report-drawer-back"
          class="mr-1"
          @click="emit('back')"
        />
        <AtlasIcon
          class="mr-2"
          color="primary"
        >
          {{ headerIcon }}
        </AtlasIcon>
        <span class="text-h6">{{ headerTitle }}</span>
        <AtlasSpacer />
        <AtlasIconButton
          icon="mdi-close"
          v-bind="{ ariaLabel: closeLabel }"
          variant="text"
          size="sm"
          data-testid="report-drawer-close"
          @click="close"
        />
      </header>
      <div class="crd__body">
        <InclusionRuleReport
          v-if="reportType === 'inclusion' && cohortId !== null && sourceKey"
          :cohort-id="cohortId"
          :source-key="sourceKey"
        />
        <CohortSamplesPanel
          v-else-if="reportType === 'samples' && cohortId !== null && sourceKey"
          :cohort-id="cohortId"
          :source-key="sourceKey"
          @open-profile="(personId: string) => emit('open-profile', personId)"
        />
        <ProfileSidePanel
          v-else-if="reportType === 'profile' && sourceKey && personId"
          :source-key="sourceKey"
          :person-id="personId"
          :cohort-id="cohortId ?? undefined"
        />
      </div>
    </div>
  </AtlasSideSheet>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AtlasIcon, AtlasIconButton, AtlasSideSheet, AtlasSpacer } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import InclusionRuleReport from '@/components/reports/inclusion/InclusionRuleReport.vue'
import CohortSamplesPanel from '@/components/cohort-samples/CohortSamplesPanel.vue'
import ProfileSidePanel from '@/components/cohort-samples/ProfileSidePanel.vue'

interface Props {
  modelValue: boolean
  cohortId: number | null
  sourceKey: string | null
  reportType: 'inclusion' | 'samples' | 'profile' | null
  personId?: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'open-profile': [personId: string]
  back: []
}>()

const { t, tv } = useI18n()


const headerIcon = computed(() => {
  if (props.reportType === 'samples') return 'mdi-shuffle-variant'
  if (props.reportType === 'profile') return 'mdi-account-circle-outline'
  return 'mdi-filter-variant'
})

const headerTitle = computed(() => {
  if (props.reportType === 'samples') {
    return t('cohortDefinitions.generation.drawer.samplesTitle').value
  }
  if (props.reportType === 'profile') {
    return props.personId
      ? tv('components.cohortReportDrawer.personTitle', { id: props.personId })
      : tv('components.cohortReportDrawer.profileTitle')
  }
  return t('cohortDefinitions.generation.drawer.inclusionTitle').value
})

const closeLabel = computed(() => t('common.close').value)

function close() {
  emit('update:modelValue', false)
}

</script>

<style scoped>
.crd {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.crd__header {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  flex-shrink: 0;
}

.crd__body {
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 24px;
}

</style>
