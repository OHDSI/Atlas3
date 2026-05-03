<template>
  <AtlasCard padding="md">
    <div class="section-header">
      <div class="section-header__title-row">
        <span class="text-eyebrow">EVENTS</span>
        <span class="section-header__rule" />
        <h2 class="section-title">
          Events
        </h2>
      </div>
      <div class="section-header__actions">
        <v-text-field
          :model-value="store.textFilter"
          :label="tv('profiles.searchEvents', 'Search events')"
          density="compact"
          hide-details
          clearable
          data-test="profile-search"
          style="min-width: 220px; max-width: 280px"
          @update:model-value="(v: string) => store.setTextFilter(v ?? '')"
        />
      </div>
    </div>
    <div
      class="profile-events-table section-body"
      data-test="profile-events-table"
    >
      <v-data-table
        :headers="headers"
        :items="store.filteredRecords"
        :items-per-page="25"
        density="compact"
        data-test="profile-table"
      >
        <template #item.endDay="{ item }">
          {{ item.endDay ?? '—' }}
        </template>
      </v-data-table>
    </div>
  </AtlasCard>
</template>

<script setup lang="ts">
import { useProfileStore } from '@/stores/profile'
import { useI18n } from '@/composables/useI18n'
import { AtlasCard } from '@/components/ui'

const store = useProfileStore()
const { tv } = useI18n()

const headers = [
  { title: tv('columns.conceptId', 'Concept Id'), key: 'conceptId' },
  { title: tv('columns.conceptName', 'Concept Name'), key: 'conceptName' },
  { title: tv('columns.domain', 'Domain'), key: 'domain' },
  { title: tv('columns.startDay', 'Start Day'), key: 'startDay' },
  { title: tv('columns.endDay', 'End Day'), key: 'endDay' },
]
</script>

<style scoped>
.section-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}
.section-header__title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.section-header__rule {
  width: 28px;
  height: 2px;
  background-color: rgb(var(--v-theme-orange));
  border-radius: 2px;
}
.section-title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.2;
  margin: 0;
}
.section-header__actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
