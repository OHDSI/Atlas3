<template>
  <div
    v-if="samples.length === 0"
    class="text-center py-6 text-grey-darken-1"
    data-testid="cohort-samples-list-empty"
  >
    {{
      tv(
        'components.cohortSamplesList.empty',
        'No samples have been generated for this cohort and source yet.'
      )
    }}
  </div>
  <v-table
    v-else
    density="comfortable"
    hover
    data-testid="cohort-samples-list"
  >
    <thead>
      <tr>
        <th>{{ tv('columns.name', 'Name') }}</th>
        <th class="text-right">
          {{ tv('components.cohortSamplesList.persons', 'Persons') }}
        </th>
        <th>{{ tv('columns.selectionCriteria', 'Selection criteria') }}</th>
        <th>{{ tv('columns.author', 'Author') }}</th>
        <th>{{ tv('columns.created', 'Created') }}</th>
        <th class="text-right">
          {{ tv('columns.actions', 'Actions') }}
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
          <AtlasIconButton
            icon="mdi-refresh"
            v-bind="{ ariaLabel: tv('components.cohortSamplesList.refreshSample', 'Refresh sample') }"
            variant="text"
            size="sm"
            data-testid="cohort-samples-list-refresh"
            @click.stop="$emit('refresh', sample)"
          />
          <AtlasIconButton
            icon="mdi-delete"
            v-bind="{ ariaLabel: tv('components.cohortSamplesList.deleteSample', 'Delete sample') }"
            variant="text"
            size="sm"
            data-testid="cohort-samples-list-delete"
            @click.stop="$emit('delete', sample)"
          />
        </td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup lang="ts">
import { AtlasIconButton } from '@/components/ui'
import type { CohortSample } from '@/models/cohort-sample.types'
import { GENDER_FEMALE_CONCEPT_ID, GENDER_MALE_CONCEPT_ID } from '@/models/cohort-sample.types'
import { useI18n } from '@/composables/useI18n'

const { tv } = useI18n()

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
    if (g.conceptIds.includes(GENDER_MALE_CONCEPT_ID))
      labels.push(tv('components.cohortSamples.male', 'Male'))
    if (g.conceptIds.includes(GENDER_FEMALE_CONCEPT_ID))
      labels.push(tv('components.cohortSamples.female', 'Female'))
    if (g.otherNonBinary) labels.push(tv('components.cohortSamples.otherNonBinary', 'Other / non-binary'))
    if (labels.length > 0) parts.push(labels.join(', '))
  }
  return parts.length > 0 ? parts.join(' · ') : tv('components.cohortSamples.allPersons', 'All persons')
}
</script>

<style scoped>
.cohort-samples-list__row {
  cursor: pointer;
}
.cohort-samples-list__row--selected {
  background: color-mix(in srgb, var(--atlas-color-primary) 6%, transparent);
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

/* rgba(0,0,0,.66) has no exact-match token; light stays byte-identical,
 * dark uses the muted-text token. */
.v-theme--dark .cohort-samples-list__criteria {
  color: var(--atlas-color-on-surface-variant);
}
</style>
