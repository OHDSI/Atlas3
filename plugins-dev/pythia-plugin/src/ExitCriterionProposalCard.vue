<script setup lang="ts">
import { computed } from 'vue'
import type { ProposalState } from './types'

const props = defineProps<{ proposal: ProposalState }>()
defineEmits<{ accept: [id: string]; reject: [id: string] }>()

const args = computed(() => props.proposal.args)

const strategyLabel = computed(() => {
  switch (args.value.strategy) {
    case 'end_of_observation': return 'End of continuous observation'
    case 'fixed_duration': return `Fixed duration (${args.value.offset ?? 0} days)`
    case 'continuous_drug': return 'Continuous drug exposure'
    case 'custom_event': return 'Custom event'
    default: return args.value.strategy ?? 'Unknown'
  }
})
</script>

<template>
  <div
    class="proposal-card"
    :class="{ accepted: proposal.status === 'accepted', rejected: proposal.status === 'rejected' }"
  >
    <div class="card-header">
      <span class="badge">Exit criterion</span>
    </div>
    <div class="value-line">
      {{ strategyLabel }}
    </div>
    <div
      v-if="args.concept?.conceptName"
      class="hint"
    >
      Trigger: {{ args.concept.conceptName }}
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
      Applied
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
.badge { display: inline-block; padding: 1px 6px; border-radius: 999px; background: #fde68a; color: #92400e; font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.04em; }
.value-line { font-weight: 600; color: #111827; }
.hint { font-size: 0.6875rem; color: #6b7280; margin-top: 2px; }
.actions { display: flex; gap: 6px; margin-top: 8px; }
.actions button { flex: 1; padding: 4px 8px; border-radius: 6px; border: 1px solid transparent; font-size: 0.75rem; cursor: pointer; }
.actions .accept { background: #16a34a; color: white; }
.actions .reject { background: white; color: #6b7280; border-color: #d1d5db; }
.status-line { margin-top: 6px; font-size: 0.75rem; color: #16a34a; }
.status-line.muted { color: #9ca3af; }
</style>
