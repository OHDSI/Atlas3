<template>
  <div
    v-if="samples.length === 0"
    class="text-center py-6 text-grey-darken-1"
    data-testid="cohort-samples-list-empty"
  >
    No samples have been generated for this cohort and source yet.
  </div>
  <v-table
    v-else
    density="comfortable"
    hover
    data-testid="cohort-samples-list"
  >
    <thead>
      <tr>
        <th>Name</th>
        <th class="text-right">
          Persons
        </th>
        <th>Selection criteria</th>
        <th>Author</th>
        <th>Created</th>
        <th class="text-right">
          Actions
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="sample in samples"
        :key="sample.id"
        class="cohort-samples-list__row"
        :class="{ 'cohort-samples-list__row--selected': selectedSampleId === sample.id }"
        data-testid="cohort-samples-list-row"
        @click="$emit('select', sample)"
      >
        <td>
          <a
            href="#"
            class="cohort-samples-list__name"
            @click.prevent.stop="$emit('select', sample)"
          >
            {{ sample.name }}
          </a>
        </td>
        <td class="text-right">
          {{ formatCount(sample.size) }}
        </td>
        <td class="cohort-samples-list__criteria">
          {{ summarizeCriteria(sample) }}
        </td>
        <td>{{ formatUser(sample.createdBy) }}</td>
        <td>{{ formatDate(sample.createdDate) }}</td>
        <td class="text-right">
          <v-btn
            icon="mdi-refresh"
            size="small"
            variant="text"
            aria-label="Refresh sample"
            data-testid="cohort-samples-list-refresh"
            @click.stop="$emit('refresh', sample)"
          />
          <v-btn
            icon="mdi-delete"
            size="small"
            variant="text"
            aria-label="Delete sample"
            data-testid="cohort-samples-list-delete"
            @click.stop="$emit('delete', sample)"
          />
        </td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup lang="ts">
import type { CohortSample } from '@/models/cohort-sample.types'
import { GENDER_FEMALE_CONCEPT_ID, GENDER_MALE_CONCEPT_ID } from '@/models/cohort-sample.types'

defineProps<{
  samples: CohortSample[]
  selectedSampleId?: number | null
}>()

defineEmits<{
  select: [sample: CohortSample]
  refresh: [sample: CohortSample]
  delete: [sample: CohortSample]
}>()

function formatCount(n: number): string {
  return new Intl.NumberFormat().format(n)
}

function formatDate(value: string | number | undefined | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatUser(user: { name?: string; login?: string } | null | undefined): string {
  if (!user) return '—'
  return user.name || user.login || '—'
}

function summarizeCriteria(sample: CohortSample): string {
  const parts: string[] = []
  const a = sample.age
  if (a) {
    switch (a.mode) {
      case 'lessThan':
        parts.push(`age < ${a.value}`)
        break
      case 'lessThanOrEqual':
        parts.push(`age ≤ ${a.value}`)
        break
      case 'greaterThan':
        parts.push(`age > ${a.value}`)
        break
      case 'greaterThanOrEqual':
        parts.push(`age ≥ ${a.value}`)
        break
      case 'equalTo':
        parts.push(`age = ${a.value}`)
        break
      case 'between':
        parts.push(`age ${a.min}–${a.max}`)
        break
      case 'notBetween':
        parts.push(`age ∉ ${a.min}–${a.max}`)
        break
    }
  }
  const g = sample.gender
  if (g) {
    const labels: string[] = []
    if (g.conceptIds.includes(GENDER_MALE_CONCEPT_ID)) labels.push('Male')
    if (g.conceptIds.includes(GENDER_FEMALE_CONCEPT_ID)) labels.push('Female')
    if (g.otherNonBinary) labels.push('Other / non-binary')
    if (labels.length > 0) parts.push(labels.join(', '))
  }
  return parts.length > 0 ? parts.join(' · ') : 'All persons'
}
</script>

<style scoped>
.cohort-samples-list__row {
  cursor: pointer;
}
.cohort-samples-list__row--selected {
  background: rgba(31, 66, 90, 0.06);
}
.cohort-samples-list__name {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
  font-weight: 500;
}
.cohort-samples-list__name:hover {
  text-decoration: underline;
}
.cohort-samples-list__criteria {
  color: rgba(0, 0, 0, 0.66);
  font-size: 13px;
}
</style>
