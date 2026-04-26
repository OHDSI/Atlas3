<template>
  <div
    class="profile-events-table"
    data-test="profile-events-table"
  >
    <div class="d-flex align-center ga-3 mb-2">
      <ProfileFilterChips />
      <v-spacer />
      <v-text-field
        :model-value="store.textFilter"
        :label="tv('common.search', 'Search')"
        density="compact"
        hide-details
        clearable
        data-test="profile-search"
        style="max-width: 280px;"
        @update:model-value="(v: string) => store.setTextFilter(v ?? '')"
      />
    </div>
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
</template>

<script setup lang="ts">
import ProfileFilterChips from '@/components/profile/ProfileFilterChips.vue'
import { useProfileStore } from '@/stores/profile'
import { useI18n } from '@/composables/useI18n'

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
