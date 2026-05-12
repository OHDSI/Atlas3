<script setup lang="ts">
import { computed } from 'vue'
import type { ProposalState } from './types'

const props = defineProps<{ proposal: ProposalState }>()
defineEmits<{ accept: [id: string]; reject: [id: string] }>()

const args = computed(() => props.proposal.args)

const VIEW_LABELS: Record<string, string> = {
  home: 'Home',
  cohorts: 'Cohorts',
  'cohort-new': 'New cohort',
  'cohort-edit': 'Cohort editor',
  concepts: 'Concept sets',
  'concept-detail': 'Concept detail',
  datasources: 'Data sources',
  profiles: 'Profiles',
  'profile-view': 'Patient profile',
  'feature-analyses': 'Feature analyses',
  'feature-analysis-new': 'New feature analysis',
  'feature-analysis-edit': 'Feature analysis editor',
  characterizations: 'Characterizations',
  'characterization-new': 'New characterization',
  'characterization-edit': 'Characterization editor',
  pathways: 'Pathways',
  'pathway-new': 'New pathway',
  'pathway-edit': 'Pathway editor',
  'pathway-results': 'Pathway results',
  'incidence-rates': 'Incidence rates',
  'incidence-rate-new': 'New incidence rate',
  'incidence-rate-edit': 'Incidence rate editor',
}

const viewLabel = computed(() => {
  const v = typeof args.value.view === 'string' ? args.value.view : ''
  return VIEW_LABELS[v] ?? v ?? 'Unknown view'
})

const paramSummary = computed(() => {
  const parts: string[] = []
  if (typeof args.value.id === 'number') parts.push(`id ${args.value.id}`)
  if (typeof args.value.cohortId === 'number') parts.push(`cohort ${args.value.cohortId}`)
  if (typeof args.value.conceptId === 'number') parts.push(`concept ${args.value.conceptId}`)
  if (typeof args.value.personId === 'number') parts.push(`person ${args.value.personId}`)
  if (typeof args.value.executionId === 'number' || typeof args.value.executionId === 'string') {
    parts.push(`run ${args.value.executionId}`)
  }
  if (typeof args.value.sourceKey === 'string') parts.push(args.value.sourceKey)
  return parts.join(' · ')
})

const reason = computed(() =>
  typeof args.value.reason === 'string' && args.value.reason.trim()
    ? args.value.reason.trim()
    : null
)
</script>

<template>
  <div
    class="proposal-card"
    :class="{ accepted: proposal.status === 'accepted', rejected: proposal.status === 'rejected' }"
  >
    <div class="card-header">
      <span class="badge">Navigate</span>
      <span
        v-if="paramSummary"
        class="params"
      >{{ paramSummary }}</span>
    </div>
    <div class="view-name">
      {{ viewLabel }}
    </div>
    <div
      v-if="reason"
      class="reason"
    >
      {{ reason }}
    </div>
    <div
      v-if="proposal.status === 'pending'"
      class="actions"
    >
      <button
        type="button"
        class="accept"
        @click="$emit('accept', proposal.id)"
      >
        Go
      </button>
      <button
        type="button"
        class="reject"
        @click="$emit('reject', proposal.id)"
      >
        Stay
      </button>
    </div>
    <div
      v-else-if="proposal.status === 'accepted'"
      class="status-line"
    >
      Navigated
    </div>
    <div
      v-else
      class="status-line muted"
    >
      Stayed here
    </div>
  </div>
</template>

<style scoped>
.proposal-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 10px; margin: 6px 0; background: #ffffff; font-size: 0.8125rem; }
.proposal-card.accepted { border-color: #2563eb; background: #eff6ff; }
.proposal-card.rejected { opacity: 0.55; }
.card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.badge { display: inline-block; padding: 1px 6px; border-radius: 999px; background: #dbeafe; color: #1e3a8a; font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.04em; }
.params { font-size: 0.6875rem; color: #6b7280; }
.view-name { font-weight: 600; color: #111827; }
.reason { margin-top: 2px; font-size: 0.75rem; color: #4b5563; }
.actions { display: flex; gap: 6px; margin-top: 8px; }
.actions button { flex: 1; padding: 4px 8px; border-radius: 6px; border: 1px solid transparent; font-size: 0.75rem; cursor: pointer; }
.actions .accept { background: #2563eb; color: white; }
.actions .reject { background: white; color: #6b7280; border-color: #d1d5db; }
.status-line { margin-top: 6px; font-size: 0.75rem; color: #2563eb; }
.status-line.muted { color: #9ca3af; }
</style>
