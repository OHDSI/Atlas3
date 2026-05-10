<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Checklist, ChecklistStep, ChecklistStepStatus } from './types'

const props = defineProps<{
  checklist: Checklist
  compact?: boolean
}>()

const emit = defineEmits<{
  (e: 'open-step', step: ChecklistStep): void
}>()

const expanded = ref(props.checklist.status === 'active')

const doneCount = computed(() => props.checklist.steps.filter(s => s.status === 'done').length)
const totalCount = computed(() => props.checklist.steps.length)
const isComplete = computed(() => props.checklist.status === 'completed')
const isAbandoned = computed(() => props.checklist.status === 'abandoned')

function toggle() {
  expanded.value = !expanded.value
}

const ICONS: Record<ChecklistStepStatus, string> = {
  pending: 'mdi-circle-outline',
  in_progress: 'mdi-progress-clock',
  done: 'mdi-check-circle',
  blocked: 'mdi-alert-circle',
}

const COLORS: Record<ChecklistStepStatus, string> = {
  pending: 'medium-emphasis',
  in_progress: 'primary',
  done: 'success',
  blocked: 'warning',
}

function statusLabel(s: ChecklistStepStatus): string {
  switch (s) {
    case 'pending': return 'Pending'
    case 'in_progress': return 'In progress'
    case 'done': return 'Done'
    case 'blocked': return 'Blocked'
  }
}
</script>

<template>
  <v-card
    class="cohort-agent-checklist"
    :class="{
      'cohort-agent-checklist--compact': compact,
      'cohort-agent-checklist--complete': isComplete,
      'cohort-agent-checklist--abandoned': isAbandoned,
    }"
    flat
    border
    rounded="lg"
    density="compact"
  >
    <button
      type="button"
      class="cohort-agent-checklist__header"
      @click="toggle"
    >
      <v-icon
        :icon="expanded ? 'mdi-menu-down' : 'mdi-menu-right'"
        size="small"
        class="me-1"
      />
      <v-icon
        :icon="isComplete ? 'mdi-clipboard-check' : isAbandoned ? 'mdi-clipboard-remove-outline' : 'mdi-clipboard-list-outline'"
        size="small"
        class="me-2"
      />
      <span class="cohort-agent-checklist__title">{{ checklist.title }}</span>
      <v-spacer />
      <v-chip
        size="x-small"
        :color="isComplete ? 'success' : 'primary'"
        variant="tonal"
        density="compact"
        label
      >
        {{ doneCount }} / {{ totalCount }}
      </v-chip>
    </button>

    <v-expand-transition>
      <div v-show="expanded">
        <v-divider />
        <ul class="cohort-agent-checklist__steps">
          <li
            v-for="step in checklist.steps"
            :key="step.id"
            class="cohort-agent-checklist__step"
            :class="`cohort-agent-checklist__step--${step.status}`"
          >
            <v-icon
              :icon="ICONS[step.status]"
              :color="COLORS[step.status]"
              :class="{ 'cohort-agent-checklist__spin': step.status === 'in_progress' }"
              size="small"
              class="me-2"
              :title="statusLabel(step.status)"
            />
            <div class="cohort-agent-checklist__step-text">
              <div class="cohort-agent-checklist__step-label">
                {{ step.label }}
              </div>
              <div
                v-if="step.description"
                class="cohort-agent-checklist__step-desc text-caption text-medium-emphasis"
              >
                {{ step.description }}
              </div>
            </div>
            <v-spacer />
            <v-btn
              v-if="step.linkedRoute && step.status !== 'done'"
              size="x-small"
              variant="text"
              density="compact"
              @click="emit('open-step', step)"
            >
              Open
            </v-btn>
          </li>
        </ul>
        <div
          v-if="isComplete"
          class="cohort-agent-checklist__footer text-caption text-success"
        >
          <v-icon
            icon="mdi-check-circle"
            size="x-small"
            class="me-1"
          />
          All steps complete
        </div>
      </div>
    </v-expand-transition>
  </v-card>
</template>

<style scoped>
.cohort-agent-checklist {
  margin: 4px 0 8px;
  background: rgb(var(--v-theme-surface));
}
.cohort-agent-checklist--compact {
  margin: 2px 0;
  font-size: 0.85em;
}
.cohort-agent-checklist--abandoned {
  opacity: 0.7;
}
.cohort-agent-checklist__header {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 6px 10px;
  background: transparent;
  border: 0;
  cursor: pointer;
  text-align: left;
  font: inherit;
}
.cohort-agent-checklist__header:hover {
  background: rgba(0, 0, 0, 0.03);
}
.cohort-agent-checklist__title {
  font-weight: 600;
  font-size: 0.9rem;
  color: rgb(var(--v-theme-on-surface));
}
.cohort-agent-checklist__steps {
  list-style: none;
  padding: 4px 10px 8px;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.cohort-agent-checklist__step {
  display: flex;
  align-items: flex-start;
  padding: 4px 0;
  font-size: 0.85rem;
  line-height: 1.3;
}
.cohort-agent-checklist__step--done .cohort-agent-checklist__step-label {
  text-decoration: line-through;
  color: rgba(0, 0, 0, 0.55);
}
.cohort-agent-checklist__step-text {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
}
.cohort-agent-checklist__step-label {
  word-break: break-word;
}
.cohort-agent-checklist__step-desc {
  margin-top: 2px;
}
.cohort-agent-checklist__footer {
  padding: 4px 10px 8px;
  display: flex;
  align-items: center;
}
.cohort-agent-checklist__spin {
  animation: cohort-agent-checklist-spin 2s linear infinite;
}
@keyframes cohort-agent-checklist-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
