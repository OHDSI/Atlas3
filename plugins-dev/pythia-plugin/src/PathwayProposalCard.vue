<script setup lang="ts">
import { computed } from 'vue'
import type { ProposalState } from './types'

const props = defineProps<{ proposal: ProposalState }>()
defineEmits<{ accept: [id: string]; reject: [id: string] }>()

const args = computed(() => props.proposal.args)
const targets = computed(() => args.value.targetCohorts ?? [])
const events = computed(() => args.value.eventCohorts ?? [])
</script>

<template>
  <div
    class="proposal-card"
    :class="{ accepted: proposal.status === 'accepted', rejected: proposal.status === 'rejected' }"
  >
    <div class="card-header">
      <span class="badge">Pathway analysis</span>
      <span class="counts">{{ targets.length }} target · {{ events.length }} event</span>
    </div>
    <div class="set-name">
      {{ args.name ?? 'Unnamed pathway analysis' }}
    </div>
    <div
      v-if="args.description"
      class="description"
    >
      {{ args.description }}
    </div>
    <dl class="meta">
      <dt>Combination window</dt>
      <dd>{{ args.combinationWindow ?? 30 }} days</dd>
      <dt>Min cell count</dt>
      <dd>{{ args.minCellCount ?? 5 }}</dd>
      <dt>Max depth</dt>
      <dd>{{ args.maxDepth ?? 5 }}</dd>
      <dt>Allow repeats</dt>
      <dd>{{ args.allowRepeats ? 'yes' : 'no' }}</dd>
    </dl>
    <div
      v-if="proposal.status === 'pending'"
      class="actions"
    >
      <button
        type="button"
        class="accept"
        @click="$emit('accept', proposal.id)"
      >
        Create &amp; open
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
      Pathway analysis created
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
.badge { display: inline-block; padding: 1px 6px; border-radius: 999px; background: #cffafe; color: #155e75; font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.04em; }
.counts { font-size: 0.6875rem; color: #6b7280; }
.set-name { font-weight: 600; color: #111827; }
.description { font-size: 0.75rem; color: #4b5563; margin-top: 2px; }
.meta { display: grid; grid-template-columns: max-content 1fr; gap: 2px 8px; margin: 4px 0 0; font-size: 0.6875rem; color: #4b5563; }
.meta dt { color: #6b7280; }
.meta dd { margin: 0; }
.actions { display: flex; gap: 6px; margin-top: 8px; }
.actions button { flex: 1; padding: 4px 8px; border-radius: 6px; border: 1px solid transparent; font-size: 0.75rem; cursor: pointer; }
.actions .accept { background: #16a34a; color: white; }
.actions .reject { background: white; color: #6b7280; border-color: #d1d5db; }
.status-line { margin-top: 6px; font-size: 0.75rem; color: #16a34a; }
.status-line.muted { color: #9ca3af; }
</style>
