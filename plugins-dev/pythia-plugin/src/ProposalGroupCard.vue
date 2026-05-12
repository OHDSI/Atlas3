<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Component } from 'vue'
import type { ProposalState } from './types'

const props = defineProps<{
  groupId: string
  items: ProposalState[]
  cardComponentFor: (toolName: string) => Component
}>()

const emit = defineEmits<{
  acceptAll: [groupId: string]
  rejectAll: [groupId: string]
  acceptOne: [proposalId: string]
  rejectOne: [proposalId: string]
}>()

const expanded = ref(true)

const total = computed(() => props.items.length)
const pending = computed(() => props.items.filter(p => p.status === 'pending').length)
const accepted = computed(() => props.items.filter(p => p.status === 'accepted').length)
const rejected = computed(() => props.items.filter(p => p.status === 'rejected').length)
const allResolved = computed(() => pending.value === 0)

function toggle() {
  expanded.value = !expanded.value
}

function onAcceptAll() {
  emit('acceptAll', props.groupId)
}

function onRejectAll() {
  emit('rejectAll', props.groupId)
}
</script>

<template>
  <div
    class="proposal-group"
    :class="{ resolved: allResolved }"
  >
    <button
      type="button"
      class="group-header"
      @click="toggle"
    >
      <span
        class="caret"
        :class="{ expanded }"
        aria-hidden="true"
      >▸</span>
      <span class="title">
        {{ total }} proposals from one turn
      </span>
      <span class="counts">
        <span
          v-if="accepted > 0"
          class="chip ok"
        >{{ accepted }}✓</span>
        <span
          v-if="rejected > 0"
          class="chip rej"
        >{{ rejected }}✕</span>
        <span
          v-if="pending > 0"
          class="chip pending"
        >{{ pending }} pending</span>
      </span>
      <span
        v-if="!allResolved"
        class="batch-actions"
        @click.stop
      >
        <button
          type="button"
          class="accept-all"
          @click="onAcceptAll"
        >Accept all</button>
        <button
          type="button"
          class="reject-all"
          @click="onRejectAll"
        >Reject all</button>
      </span>
    </button>
    <div
      v-show="expanded"
      class="group-body"
    >
      <component
        :is="cardComponentFor(item.toolName)"
        v-for="item in items"
        :key="item.id"
        :proposal="item"
        @accept="(id: string) => emit('acceptOne', id)"
        @reject="(id: string) => emit('rejectOne', id)"
      />
    </div>
  </div>
</template>

<style scoped>
.proposal-group {
  border: 1px solid #d1d5db;
  border-radius: 10px;
  margin: 8px 0;
  background: #f9fafb;
  overflow: hidden;
}
.proposal-group.resolved { opacity: 0.85; }
.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  background: transparent;
  border: 0;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
  text-align: left;
  font: inherit;
}
.group-header:hover { background: #f3f4f6; }
.caret {
  display: inline-block;
  font-size: 0.85rem;
  width: 12px;
  transition: transform 120ms ease;
  color: #6b7280;
}
.caret.expanded { transform: rotate(90deg); }
.title { flex: 1 1 auto; font-weight: 600; font-size: 0.8125rem; color: #111827; }
.counts { display: flex; gap: 4px; }
.chip {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 0.6875rem;
  font-weight: 500;
}
.chip.ok { background: #dcfce7; color: #166534; }
.chip.rej { background: #fee2e2; color: #991b1b; }
.chip.pending { background: #e0e7ff; color: #3730a3; }
.batch-actions { display: flex; gap: 4px; margin-left: 8px; }
.batch-actions button {
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid transparent;
  font-size: 0.6875rem;
  cursor: pointer;
}
.batch-actions .accept-all { background: #16a34a; color: white; }
.batch-actions .reject-all { background: white; color: #6b7280; border-color: #d1d5db; }
.group-body { padding: 4px 10px 8px; }
</style>
