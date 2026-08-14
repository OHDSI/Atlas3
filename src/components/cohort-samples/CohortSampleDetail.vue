<template>
  <div class="cohort-sample-detail">
    <div class="cohort-sample-detail__header">
      <div>
        <div class="text-subtitle-1 font-weight-medium">
          {{ sample.name }}
        </div>
        <div
          v-if="sourceName"
          class="text-caption text-grey-darken-1"
          data-testid="cohort-sample-detail-source"
        >
          {{ t('components.cohortSampleDetail.source', 'Source: {name}', { name: sourceName }).value }}
        </div>
        <div class="text-caption text-grey-darken-1">
          {{
            t('components.cohortSampleDetail.personsCreated', '{count} persons · created {date}', {
              count: formatCount(sample.size),
              date: formatDate(sample.createdDate),
            }).value
          }}
        </div>
      </div>
    </div>
    <div
      v-if="loading"
      class="py-4"
    >
      <AtlasSkeleton type="table-tbody" />
    </div>
    <v-table
      v-else-if="sample.elements && sample.elements.length > 0"
      density="comfortable"
      hover
      data-testid="cohort-sample-detail-table"
    >
      <thead>
        <tr>
          <th>{{ tv('columns.personId', 'Person ID') }}</th>
          <th>{{ tv('columns.gender', 'Gender') }}</th>
          <th class="text-right">
            {{ tv('columns.ageAtIndex', 'Age at index') }}
          </th>
          <th
            v-if="anyRecordCount"
            class="text-right"
          >
            {{ tv('components.cohortSampleDetail.records', 'Records') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="el in sample.elements"
          :key="el.personId + ':' + el.rank"
          data-testid="cohort-sample-detail-row"
        >
          <td>
            <button
              v-if="effectiveSourceKey"
              type="button"
              class="profile-link"
              data-test="cohort-sample-profile-link"
              @click="$emit('open-profile', el.personId)"
            >
              {{ el.personId }}
            </button>
            <span v-else>{{ el.personId }}</span>
          </td>
          <td>{{ formatGender(el.genderConceptId) }}</td>
          <td class="text-right">
            {{ el.age }}
          </td>
          <td
            v-if="anyRecordCount"
            class="text-right"
          >
            {{ el.recordCount ?? '—' }}
          </td>
        </tr>
      </tbody>
    </v-table>
    <div
      v-else
      class="text-center py-6 text-grey-darken-1"
      data-testid="cohort-sample-detail-empty"
    >
      {{ tv('components.cohortSampleDetail.noRecords', 'This sample has no person records.') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { AtlasSkeleton } from '@/components/ui'
import { computed } from 'vue'
import {
  GENDER_FEMALE_CONCEPT_ID,
  GENDER_MALE_CONCEPT_ID,
  type CohortSample,
} from '@/models/cohort-sample.types'
import { useDataSourcesStore } from '@/stores/datasources'
import { useI18n } from '@/composables/useI18n'

const { t, tv } = useI18n()

const props = defineProps<{
  sample: CohortSample
  loading?: boolean
  sourceKey?: string
}>()

defineEmits<{ 'open-profile': [personId: string] }>()

const dsStore = useDataSourcesStore()

const effectiveSourceKey = computed(() => props.sourceKey ?? dsStore.selectedSource?.sourceKey)

// Once a sample is generated, the view gives no indication of which source's
// sample is being looked at, which is ambiguous when a cohort has samples
// from more than one source (#204).
const sourceName = computed(
  () => dsStore.sources.find(s => s.sourceKey === effectiveSourceKey.value)?.sourceName
    ?? effectiveSourceKey.value
)

function formatCount(n: number): string {
  return new Intl.NumberFormat().format(n)
}

function formatDate(value: string | number | undefined | null): string {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatGender(conceptId: number): string {
  if (conceptId === GENDER_MALE_CONCEPT_ID) return tv('components.cohortSamples.male', 'Male')
  if (conceptId === GENDER_FEMALE_CONCEPT_ID) return tv('components.cohortSamples.female', 'Female')
  return tv('components.cohortSamples.other', 'Other')
}

const anyRecordCount = computed(() =>
  (props.sample.elements ?? []).some(
    el => typeof el.recordCount === 'number' && el.recordCount !== null
  )
)
</script>

<style scoped>
.cohort-sample-detail__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.profile-link {
  color: rgb(var(--v-theme-primary));
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  font: inherit;
  text-decoration: none;
  font-variant-numeric: tabular-nums;
  border-bottom: 1px solid transparent;
  transition: border-color 120ms ease;
}
.profile-link:hover {
  border-bottom-color: currentColor;
}
.profile-link:focus-visible {
  border-bottom-color: currentColor;
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
</style>
