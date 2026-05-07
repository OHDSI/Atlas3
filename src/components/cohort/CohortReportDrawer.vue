<template>
  <Teleport to="body">
    <Transition name="crd-slide">
      <aside
        v-if="modelValue"
        class="crd"
        :style="{ width: drawerWidth + 'px' }"
        data-testid="cohort-report-drawer"
        role="dialog"
        aria-modal="true"
      >
        <header class="crd__header">
          <AtlasIcon class="mr-2" color="primary">{{ headerIcon }}</AtlasIcon>
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
          />
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from 'vue'
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

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.modelValue) close()
}

watch(
  () => props.modelValue,
  open => {
    if (open) document.addEventListener('keydown', onKey)
    else document.removeEventListener('keydown', onKey)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.crd {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgb(var(--v-theme-surface));
  border-left: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.12);
  z-index: 1010;
  display: flex;
  flex-direction: column;
  max-width: 100vw;
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
  padding: 24px;
}

.crd-slide-enter-active,
.crd-slide-leave-active {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.crd-slide-enter-from,
.crd-slide-leave-to {
  transform: translateX(100%);
}
</style>
