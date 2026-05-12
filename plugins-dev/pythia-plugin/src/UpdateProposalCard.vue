<script setup lang="ts">
import { computed } from 'vue'
import type { ProposalState } from './types'

const props = defineProps<{ proposal: ProposalState }>()
defineEmits<{ accept: [id: string]; reject: [id: string] }>()

const args = computed(() => props.proposal.args as Record<string, unknown>)

// Map tool name → human-readable artifact noun + verb hint.
const TOOL_LABELS: Record<string, { noun: string; verb: string }> = {
  update_concept_set: { noun: 'concept set', verb: 'Update' },
  update_feature_analysis: { noun: 'feature analysis', verb: 'Update' },
  update_characterization: { noun: 'characterization', verb: 'Update' },
  update_pathway: { noun: 'pathway', verb: 'Update' },
  update_incidence_rate: { noun: 'incidence rate', verb: 'Update' },
}

const label = computed(() => TOOL_LABELS[props.proposal.toolName] ?? { noun: 'artifact', verb: 'Update' })

// Build a list of one-line change descriptions for the LLM args present.
const changes = computed<string[]>(() => {
  const a = args.value
  const lines: string[] = []
  if (typeof a.name === 'string' && a.name.trim()) {
    lines.push(`Rename to "${a.name}"`)
  }
  if (typeof a.description === 'string') {
    lines.push(a.description.trim() ? 'Change description' : 'Clear description')
  }
  // Arrays we recognise; show counts.
  const arrayLine = (key: string, label: string) => {
    const v = a[key]
    if (Array.isArray(v)) lines.push(`Set ${label} to ${v.length} item(s)`)
  }
  const addLine = (key: string, label: string) => {
    const v = a[key]
    if (Array.isArray(v) && v.length > 0) lines.push(`Add ${v.length} ${label}`)
  }
  arrayLine('items', 'items')
  addLine('itemsToAdd', 'item(s)')
  arrayLine('cohorts', 'cohorts')
  addLine('cohortsToAdd', 'cohort(s)')
  arrayLine('featureAnalyses', 'feature analyses')
  addLine('featureAnalysesToAdd', 'feature analysis(es)')
  arrayLine('targetCohorts', 'target cohorts')
  addLine('targetCohortsToAdd', 'target cohort(s)')
  arrayLine('eventCohorts', 'event cohorts')
  addLine('eventCohortsToAdd', 'event cohort(s)')
  arrayLine('targetIds', 'target cohort ids')
  addLine('targetIdsToAdd', 'target cohort(s)')
  arrayLine('outcomeIds', 'outcome cohort ids')
  addLine('outcomeIdsToAdd', 'outcome cohort(s)')
  // Scalar tweaks
  for (const k of ['type', 'domain', 'statType', 'combinationWindow', 'minCellCount', 'maxDepth', 'allowRepeats'] as const) {
    if (a[k] !== undefined) lines.push(`Set ${k} to ${String(a[k])}`)
  }
  if (a.timeAtRisk) lines.push('Update time-at-risk window')
  if (a.studyWindow !== undefined) lines.push(a.studyWindow === null ? 'Clear study window' : 'Update study window')
  if (a.design !== undefined) lines.push('Replace design')
  if (lines.length === 0) lines.push('No-op (no recognised fields)')
  return lines
})

const idDisplay = computed(() => {
  const id = args.value.id
  return typeof id === 'number' || typeof id === 'string' ? `#${id}` : ''
})
</script>

<template>
  <div
    class="proposal-card"
    :class="{ accepted: proposal.status === 'accepted', rejected: proposal.status === 'rejected' }"
  >
    <div class="card-header">
      <span class="badge">{{ label.verb }} {{ label.noun }}</span>
      <span class="count">{{ idDisplay }}</span>
    </div>
    <ul class="change-list">
      <li
        v-for="(line, i) in changes"
        :key="i"
      >
        {{ line }}
      </li>
    </ul>
    <div
      v-if="proposal.status === 'pending'"
      class="actions"
    >
      <button
        type="button"
        class="accept"
        @click="$emit('accept', proposal.id)"
      >
        Apply
      </button>
      <button
        type="button"
        class="reject"
        @click="$emit('reject', proposal.id)"
      >
        Reject
      </button>
    </div>
    <div
      v-else-if="proposal.status === 'accepted'"
      class="status-line"
    >
      Applied — review and Save in the editor
    </div>
    <div
      v-else
      class="status-line muted"
    >
      Rejected
    </div>
  </div>
</template>

<style scoped>
.proposal-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 10px; margin: 6px 0; background: #ffffff; font-size: 0.8125rem; }
.proposal-card.accepted { border-color: #16a34a; background: #f0fdf4; }
.proposal-card.rejected { opacity: 0.55; }
.card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.badge { display: inline-block; padding: 1px 6px; border-radius: 999px; background: #fef3c7; color: #92400e; font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.04em; }
.count { font-size: 0.6875rem; color: #6b7280; font-family: ui-monospace, SFMono-Regular, monospace; }
.change-list { list-style: disc; padding-left: 18px; margin: 4px 0; font-size: 0.75rem; color: #374151; }
.actions { display: flex; gap: 6px; margin-top: 8px; }
.actions button { flex: 1; padding: 4px 8px; border-radius: 6px; border: 1px solid transparent; font-size: 0.75rem; cursor: pointer; }
.actions .accept { background: #16a34a; color: white; }
.actions .reject { background: white; color: #6b7280; border-color: #d1d5db; }
.status-line { margin-top: 6px; font-size: 0.75rem; color: #16a34a; }
.status-line.muted { color: #9ca3af; }
</style>
