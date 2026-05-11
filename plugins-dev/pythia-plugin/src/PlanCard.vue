<script setup lang="ts">
import { computed, ref } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { Plan, PlanStep, PlanStepStatus } from './types'

const props = defineProps<{
  plan: Plan
  compact?: boolean
}>()

const emit = defineEmits<{
  (e: 'open-step', step: PlanStep): void
}>()

const expanded = ref(props.plan.status === 'active')
const docExpanded = ref(false)

const doneCount = computed(() => props.plan.steps.filter(s => s.status === 'done').length)
const totalCount = computed(() => props.plan.steps.length)
const isComplete = computed(() => props.plan.status === 'completed')
const isAbandoned = computed(() => props.plan.status === 'abandoned')
const hasDocument = computed(() => typeof props.plan.document === 'string' && props.plan.document.trim().length > 0)

function toggle() {
  expanded.value = !expanded.value
}

function toggleDoc() {
  docExpanded.value = !docExpanded.value
}

const ICONS: Record<PlanStepStatus, string> = {
  pending: 'mdi-circle-outline',
  in_progress: 'mdi-progress-clock',
  done: 'mdi-check-circle',
  blocked: 'mdi-alert-circle',
}

const COLORS: Record<PlanStepStatus, string> = {
  pending: 'medium-emphasis',
  in_progress: 'primary',
  done: 'success',
  blocked: 'warning',
}

function statusLabel(s: PlanStepStatus): string {
  switch (s) {
    case 'pending': return 'Pending'
    case 'in_progress': return 'In progress'
    case 'done': return 'Done'
    case 'blocked': return 'Blocked'
  }
}

marked.setOptions({ gfm: true, breaks: true })

const renderedDocument = computed(() => {
  const src = props.plan.document
  if (!src || !src.trim()) return ''
  const html = marked.parse(src, { async: false }) as string
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class'],
  })
})
</script>

<template>
  <v-card
    class="cohort-agent-plan"
    :class="{
      'cohort-agent-plan--compact': compact,
      'cohort-agent-plan--complete': isComplete,
      'cohort-agent-plan--abandoned': isAbandoned,
    }"
    flat
    border
    rounded="lg"
    density="compact"
  >
    <button
      type="button"
      class="cohort-agent-plan__header"
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
      <span class="cohort-agent-plan__title">{{ plan.title }}</span>
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

        <div
          v-if="hasDocument"
          class="cohort-agent-plan__doc-wrap"
        >
          <button
            type="button"
            class="cohort-agent-plan__doc-toggle"
            @click="toggleDoc"
          >
            <v-icon
              :icon="docExpanded ? 'mdi-menu-down' : 'mdi-menu-right'"
              size="x-small"
              class="me-1"
            />
            <span>Plan details</span>
          </button>
          <v-expand-transition>
            <div
              v-show="docExpanded"
              class="cohort-agent-plan__doc"
              v-html="renderedDocument"
            />
          </v-expand-transition>
          <v-divider />
        </div>

        <ul class="cohort-agent-plan__steps">
          <li
            v-for="step in plan.steps"
            :key="step.id"
            class="cohort-agent-plan__step"
            :class="`cohort-agent-plan__step--${step.status}`"
          >
            <v-icon
              :icon="ICONS[step.status]"
              :color="COLORS[step.status]"
              :class="{ 'cohort-agent-plan__spin': step.status === 'in_progress' }"
              size="small"
              class="me-2"
              :title="statusLabel(step.status)"
            />
            <div class="cohort-agent-plan__step-text">
              <div class="cohort-agent-plan__step-label">
                {{ step.label }}
              </div>
              <div
                v-if="step.description"
                class="cohort-agent-plan__step-desc text-caption text-medium-emphasis"
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
          class="cohort-agent-plan__footer text-caption text-success"
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
.cohort-agent-plan {
  margin: 4px 0 8px;
  background: rgb(var(--v-theme-surface));
}
.cohort-agent-plan--compact {
  margin: 2px 0;
  font-size: 0.85em;
}
.cohort-agent-plan--abandoned {
  opacity: 0.7;
}
.cohort-agent-plan__header {
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
.cohort-agent-plan__header:hover {
  background: rgba(0, 0, 0, 0.03);
}
.cohort-agent-plan__title {
  font-weight: 600;
  font-size: 0.9rem;
  color: rgb(var(--v-theme-on-surface));
}
.cohort-agent-plan__doc-wrap {
  padding: 0 10px;
}
.cohort-agent-plan__doc-toggle {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 4px 0;
  background: transparent;
  border: 0;
  cursor: pointer;
  text-align: left;
  font: inherit;
  font-size: 0.75rem;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.75;
}
.cohort-agent-plan__doc-toggle:hover {
  opacity: 1;
}
.cohort-agent-plan__doc {
  padding: 4px 0 8px;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: rgb(var(--v-theme-on-surface));
}
.cohort-agent-plan__doc :deep(p) { margin: 0 0 0.5em; }
.cohort-agent-plan__doc :deep(p:last-child) { margin-bottom: 0; }
.cohort-agent-plan__doc :deep(ul),
.cohort-agent-plan__doc :deep(ol) { margin: 0.25em 0 0.5em 1.25em; padding: 0; }
.cohort-agent-plan__doc :deep(li) { margin: 0.15em 0; }
.cohort-agent-plan__doc :deep(strong) { font-weight: 600; }
.cohort-agent-plan__doc :deep(code) {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.85em;
  background: rgba(0, 0, 0, 0.06);
  padding: 1px 4px;
  border-radius: 4px;
}
.cohort-agent-plan__steps {
  list-style: none;
  padding: 4px 10px 8px;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.cohort-agent-plan__step {
  display: flex;
  align-items: flex-start;
  padding: 4px 0;
  font-size: 0.85rem;
  line-height: 1.3;
}
.cohort-agent-plan__step--done .cohort-agent-plan__step-label {
  text-decoration: line-through;
  color: rgba(0, 0, 0, 0.55);
}
.cohort-agent-plan__step-text {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-width: 0;
}
.cohort-agent-plan__step-label {
  word-break: break-word;
}
.cohort-agent-plan__step-desc {
  margin-top: 2px;
}
.cohort-agent-plan__footer {
  padding: 4px 10px 8px;
  display: flex;
  align-items: center;
}
.cohort-agent-plan__spin {
  animation: cohort-agent-plan-spin 2s linear infinite;
}
@keyframes cohort-agent-plan-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
