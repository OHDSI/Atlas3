<script setup lang="ts">
import { computed } from 'vue'
import type { ProposalState } from './types'

const props = defineProps<{ proposal: ProposalState }>()
defineEmits<{ accept: [id: string]; reject: [id: string] }>()

const opLabel: Record<string, string> = {
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  eq: '=',
  between: 'between',
}

const args = computed(() => props.proposal.args)

const valuePreview = computed(() => {
  const a = args.value
  if (!a.operator || a.value === undefined) return null
  if (a.operator === 'between') return `${a.value} – ${a.value2 ?? '?'}`
  return `${opLabel[a.operator] ?? a.operator} ${a.value}`
})

const groupLabel = computed(() => {
  if (args.value.group === 'inclusion') return 'Inclusion'
  if (args.value.group === 'exclusion') return 'Exclusion'
  return 'Entry event'
})
</script>

<template>
  <div
    class="proposal-card"
    :class="{ accepted: proposal.status === 'accepted', rejected: proposal.status === 'rejected' }"
  >
    <div class="card-header">
      <span
        class="badge"
        :class="`badge-${(args.domain || 'unknown').toLowerCase()}`"
      >{{ args.domain || 'Concept' }}</span>
      <span class="group-tag">{{ groupLabel }}</span>
    </div>
    <div class="concept-name">
      {{ args.conceptName || 'Unnamed concept' }}
    </div>
    <div
      v-if="valuePreview"
      class="value-line"
    >
      {{ args.conceptName }} {{ valuePreview }}
    </div>
    <div
      v-if="args.includeDescendants"
      class="hint"
    >
      Including descendant concepts
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
        Accept
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
      Added to cohort
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
.proposal-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 10px;
  margin: 6px 0;
  background: #ffffff;
  font-size: 0.8125rem;
}
.proposal-card.accepted {
  border-color: #16a34a;
  background: #f0fdf4;
}
.proposal-card.rejected {
  opacity: 0.55;
}
.card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 999px;
  background: #e0e7ff;
  color: #3730a3;
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.group-tag {
  font-size: 0.6875rem;
  color: #6b7280;
}
.concept-name {
  font-weight: 600;
  color: #111827;
}
.value-line {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.75rem;
  color: #4b5563;
  margin-top: 2px;
}
.hint {
  font-size: 0.6875rem;
  color: #6b7280;
  margin-top: 2px;
}
.actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}
.actions button {
  flex: 1;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid transparent;
  font-size: 0.75rem;
  cursor: pointer;
}
.actions .accept {
  background: #16a34a;
  color: white;
}
.actions .reject {
  background: white;
  color: #6b7280;
  border-color: #d1d5db;
}
.status-line {
  margin-top: 6px;
  font-size: 0.75rem;
  color: #16a34a;
}
.status-line.muted {
  color: #9ca3af;
}
</style>
