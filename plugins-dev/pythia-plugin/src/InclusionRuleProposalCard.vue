<script setup lang="ts">
import { computed } from 'vue'
import type { ProposalState } from './types'

const props = defineProps<{ proposal: ProposalState }>()
defineEmits<{ accept: [id: string]; reject: [id: string] }>()

const args = computed(() => props.proposal.args)

// add_inclusion_rule uses {logicType, events}; add_criteria uses {logic, items}.
// shell-bridge.proposalFromToolCall already normalises both on accept — mirror
// that here so the card renders both shapes correctly.
const items = computed(
  () => args.value.events ?? args.value.items ?? [],
)
const logicLabel = computed(() => {
  const lt = args.value.logicType
  if (lt === 'AT_LEAST') return `≥ ${args.value.count ?? 1} of`
  if (lt === 'AT_MOST') return `≤ ${args.value.count ?? 1} of`
  if (lt === 'ANY' || args.value.logic === 'OR') return 'Any of'
  return 'All of'
})

const eventNames = computed(() =>
  items.value.map((e: { conceptName?: string }) => e.conceptName ?? 'Unnamed').slice(0, 4),
)
const extra = computed(() => items.value.length - eventNames.value.length)
</script>

<template>
  <div
    class="proposal-card"
    :class="{ accepted: proposal.status === 'accepted', rejected: proposal.status === 'rejected' }"
  >
    <div class="card-header">
      <span class="badge">Inclusion rule</span>
    </div>
    <div class="rule-name">
      {{ args.name ?? 'Unnamed rule' }}
    </div>
    <div class="rule-logic">
      {{ logicLabel }}:
    </div>
    <ul class="event-list">
      <li
        v-for="n in eventNames"
        :key="n"
      >
        {{ n }}
      </li>
      <li
        v-if="extra > 0"
        class="muted"
      >
        …and {{ extra }} more
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
.proposal-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 10px; margin: 6px 0; background: #ffffff; font-size: 0.8125rem; }
.proposal-card.accepted { border-color: #16a34a; background: #f0fdf4; }
.proposal-card.rejected { opacity: 0.55; }
.card-header { margin-bottom: 4px; }
.badge { display: inline-block; padding: 1px 6px; border-radius: 999px; background: #dbeafe; color: #1e3a8a; font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.04em; }
.rule-name { font-weight: 600; color: #111827; }
.rule-logic { font-size: 0.75rem; color: #6b7280; margin-top: 2px; }
.event-list { list-style: disc; padding-left: 18px; margin: 4px 0; font-size: 0.75rem; color: #374151; }
.event-list .muted { color: #9ca3af; }
.actions { display: flex; gap: 6px; margin-top: 8px; }
.actions button { flex: 1; padding: 4px 8px; border-radius: 6px; border: 1px solid transparent; font-size: 0.75rem; cursor: pointer; }
.actions .accept { background: #16a34a; color: white; }
.actions .reject { background: white; color: #6b7280; border-color: #d1d5db; }
.status-line { margin-top: 6px; font-size: 0.75rem; color: #16a34a; }
.status-line.muted { color: #9ca3af; }
</style>
