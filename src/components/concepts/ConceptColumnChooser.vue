<template>
  <AtlasMenu
    :close-on-content-click="false"
    location="bottom start"
    offset="8"
    :z-index="2301"
  >
    <template #activator="{ props: activatorProps }">
      <AtlasButton
        v-bind="activatorProps"
        variant="secondary"
        icon="mdi-view-column-outline"
        data-testid="concept-search-columns"
      >
        {{ t('common.columns').value }}
      </AtlasButton>
    </template>

    <AtlasCard
      padding="none"
      style="width: 260px; max-width: calc(100vw - 32px)"
    >
      <div class="concept-column-chooser__menu">
        <span class="text-eyebrow">{{ t('common.columns').value }}</span>
        <v-checkbox-btn
          v-for="column in optionalColumns"
          :key="column.key"
          :model-value="preferencesStore.visibleColumnKeys.includes(column.key)"
          :label="column.title"
          density="compact"
          hide-details
          @update:model-value="value => preferencesStore.setColumnVisibility(column.key, Boolean(value))"
        />
      </div>
    </AtlasCard>
  </AtlasMenu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AtlasButton, AtlasCard, AtlasMenu } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import { useConceptTablePreferencesStore } from '@/stores/concept-table-preferences'

const { t } = useI18n()
const preferencesStore = useConceptTablePreferencesStore()

const optionalColumns = computed(() => [
  { key: 'conceptCode', title: t('columns.conceptCode').value },
  { key: 'vocabularyId', title: t('columns.vocabulary').value },
  { key: 'standardConcept', title: t('columns.type').value },
  { key: 'domainId', title: t('columns.domain').value },
  { key: 'conceptClassId', title: t('columns.class').value },
  { key: 'invalidReason', title: t('columns.validity').value },
  { key: 'recordCount', title: t('columns.rcTooltip').value },
  { key: 'descendantRecordCount', title: t('columns.drcTooltip').value },
  { key: 'personCount', title: t('columns.pcTooltip').value },
  { key: 'descendantPersonCount', title: t('columns.dpcTooltip').value },
])
</script>

<style>
.concept-column-chooser__menu {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 220px;
  padding: 16px;
}
</style>
