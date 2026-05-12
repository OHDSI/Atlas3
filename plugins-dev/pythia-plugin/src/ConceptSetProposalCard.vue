<script setup lang="ts">
import { computed } from 'vue'
import type { ProposalState } from './types'

const props = defineProps<{ proposal: ProposalState }>()
defineEmits<{ accept: [id: string]; reject: [id: string] }>()

const args = computed(() => props.proposal.args)
const items = computed(() => args.value.items ?? [])
const head = computed(() => items.value.slice(0, 3))
const extra = computed(() => Math.max(0, items.value.length - head.value.length))
</script>

<template>
  <div
    class="proposal-card"
    :class="{ accepted: proposal.status === 'accepted', rejected: proposal.status === 'rejected' }"
  >
    <div class="card-header">
      <span class="badge">Concept set</span>
      <span class="count">{{ items.length }} {{ items.length === 1 ? 'concept' : 'concepts' }}</span>
    </div>
    <div class="set-name">
      {{ args.name ?? 'Unnamed concept set' }}
    </div>
    <ul class="concept-list">
      <li
        v-for="c in head"
        :key="c.conceptId"
      >
        <span class="cn">{{ c.conceptName }}</span>
        <span class="cd">{{ c.domain }}</span>
        <span
          v-if="c.isExcluded"
          class="excluded"
        >excluded</span>
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
.card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.badge { display: inline-block; padding: 1px 6px; border-radius: 999px; background: #ede9fe; color: #5b21b6; font-size: 0.6875rem; text-transform: uppercase; letter-spacing: 0.04em; }
.count { font-size: 0.6875rem; color: #6b7280; }
.set-name { font-weight: 600; color: #111827; }
.concept-list { list-style: disc; padding-left: 18px; margin: 4px 0; font-size: 0.75rem; color: #374151; }
.concept-list .cn { margin-right: 6px; }
.concept-list .cd { color: #6b7280; font-size: 0.6875rem; }
.concept-list .excluded { color: #b91c1c; font-size: 0.625rem; margin-left: 6px; text-transform: uppercase; }
.concept-list .muted { color: #9ca3af; list-style: none; }
.actions { display: flex; gap: 6px; margin-top: 8px; }
.actions button { flex: 1; padding: 4px 8px; border-radius: 6px; border: 1px solid transparent; font-size: 0.75rem; cursor: pointer; }
.actions .accept { background: #16a34a; color: white; }
.actions .reject { background: white; color: #6b7280; border-color: #d1d5db; }
.status-line { margin-top: 6px; font-size: 0.75rem; color: #16a34a; }
.status-line.muted { color: #9ca3af; }
</style>
