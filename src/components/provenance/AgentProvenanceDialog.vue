<template>
  <AtlasDialog
    :model-value="modelValue"
    :eyebrow="t('components.agentProvenance.eyebrow').value"
    :title="t('components.agentProvenance.title').value"
    :close-label="t('common.close').value"
    max-width="960"
    @update:model-value="(v: boolean) => emit('update:modelValue', v)"
    @close="emit('update:modelValue', false)"
  >
    <p class="agent-provenance__intro">
      {{ intro }}
    </p>

    <div
      v-if="loading"
      class="agent-provenance__state"
      data-testid="agent-provenance-loading"
    >
      <AtlasProgressCircular
        indeterminate
        size="24"
      />
      <span>{{ t('common.loadingWithDots').value }}</span>
    </div>

    <AtlasAlert
      v-else-if="error"
      severity="danger"
      data-testid="agent-provenance-error"
    >
      {{ t('components.agentProvenance.loadError', { message: error }).value }}
      <template #actions>
        <AtlasButton
          variant="ghost"
          size="sm"
          @click="emit('retry')"
        >
          {{ t('common.retry').value }}
        </AtlasButton>
      </template>
    </AtlasAlert>

    <p
      v-else-if="traces.length === 0"
      class="agent-provenance__state"
      data-testid="agent-provenance-empty"
    >
      {{ t('components.agentProvenance.empty').value }}
    </p>

    <section
      v-for="trace in traces"
      v-else
      :key="trace.traceId"
      class="agent-provenance__trace"
      data-testid="agent-provenance-trace"
    >
      <header class="agent-provenance__trace-header">
        <span class="agent-provenance__trace-title">
          {{ t('components.agentProvenance.session', { time: formatTime(trace.startedAt) }).value }}
        </span>
        <span
          v-if="trace.userLogin"
          class="agent-provenance__muted"
        >
          {{ t('components.agentProvenance.byUser', { user: trace.userLogin }).value }}
        </span>
        <code
          class="agent-provenance__trace-id"
          :title="t('components.agentProvenance.traceIdHint').value"
        >{{ t('components.agentProvenance.traceId', { traceId: trace.traceId }).value }}</code>
      </header>

      <ol class="agent-provenance__steps">
        <li
          v-for="entry in trace.entries"
          :key="entry.id"
          class="agent-provenance__step"
          data-testid="agent-provenance-entry"
        >
          <div class="agent-provenance__step-header">
            <AtlasChip
              :tone="OUTCOME_TONE[entry.outcome]"
              size="sm"
              :data-testid="`agent-provenance-outcome-${entry.outcome}`"
            >
              {{ outcomeLabel(entry.outcome) }}
            </AtlasChip>
            <code class="agent-provenance__tool">{{ entry.tool }}</code>
            <span
              v-if="entry.reasoningStep"
              class="agent-provenance__muted"
            >{{ stepLabel(entry.reasoningStep) }}</span>
            <span class="agent-provenance__muted agent-provenance__time">{{ formatTime(entry.startedAt) }}</span>
          </div>

          <dl class="agent-provenance__details">
            <template v-if="entry.clinicalRationale">
              <dt>{{ t('components.agentProvenance.rationale').value }}</dt>
              <dd data-testid="agent-provenance-rationale">
                {{ entry.clinicalRationale }}
              </dd>
            </template>
            <template v-if="entry.evidenceReference">
              <dt>{{ t('components.agentProvenance.evidence').value }}</dt>
              <dd>{{ entry.evidenceReference }}</dd>
            </template>
            <template v-if="entry.errorMessage">
              <dt>{{ t('components.agentProvenance.reason').value }}</dt>
              <dd class="agent-provenance__error">
                {{ entry.errorMessage }}
              </dd>
            </template>
          </dl>
        </li>
      </ol>
    </section>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  AtlasAlert,
  AtlasButton,
  AtlasChip,
  AtlasDialog,
  AtlasProgressCircular,
} from '@/components/ui'
import type { AtlasChipTone } from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import { formatDateTime } from '@/utils/format'
import type {
  ProvenanceKind,
  ProvenanceOutcome,
  ProvenanceTrace,
} from '@/services/mcp-provenance.service'

/**
 * AgentProvenanceDialog - what an AI agent did to a cohort definition or
 * concept set through WebAPI's MCP server, and why.
 *
 * Each section is one agent session (one W3C trace); within it, the tool calls
 * in order with their outcome, reasoning step, and the clinical rationale and
 * evidence the agent was required to give. Refused and failed calls are shown
 * too: they are part of how the artifact came to be. The data is loaded by
 * useAgentProvenance in the host editor, which also drives the toolbar badge.
 */
interface Props {
  modelValue: boolean
  kind: ProvenanceKind
  traces: ProvenanceTrace[]
  loading?: boolean
  error?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  error: null,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  retry: []
}>()

const { t, locale } = useI18n()

const intro = computed(() =>
  props.kind === 'conceptset'
    ? t('components.agentProvenance.introConceptSet').value
    : t('components.agentProvenance.introCohortDefinition').value
)

const OUTCOME_TONE: Record<ProvenanceOutcome, AtlasChipTone> = {
  SUCCESS: 'success',
  REJECTED: 'warning',
  DENIED: 'danger',
  ERROR: 'danger',
  STARTED: 'neutral',
}

const OUTCOME_KEY: Record<ProvenanceOutcome, string> = {
  SUCCESS: 'components.agentProvenance.outcome.success',
  REJECTED: 'components.agentProvenance.outcome.rejected',
  DENIED: 'components.agentProvenance.outcome.denied',
  ERROR: 'components.agentProvenance.outcome.error',
  STARTED: 'components.agentProvenance.outcome.started',
}

// The server's own steps (ReasoningStep in WebAPI). A client may send any
// other label in _meta.reasoning_step; that is shown as sent.
const STEP_KEY: Record<string, string> = {
  STEP_1_CONCEPT_EXPLORATION: 'components.agentProvenance.step.conceptExploration',
  STEP_2_CONCEPT_SET_CONSOLIDATION: 'components.agentProvenance.step.conceptSetConsolidation',
  STEP_3_COHORT_CRITERIA_DEFINITION: 'components.agentProvenance.step.cohortCriteria',
  STEP_4_SQL_VALIDATION: 'components.agentProvenance.step.sqlValidation',
  STEP_5_GENERATION_VERIFICATION: 'components.agentProvenance.step.generationVerification',
  AUDIT: 'components.agentProvenance.step.audit',
}

function outcomeLabel(outcome: ProvenanceOutcome): string {
  return t(OUTCOME_KEY[outcome]).value
}

function stepLabel(step: string): string {
  const key = STEP_KEY[step]
  return key ? t(key).value : step
}

function formatTime(ms: number): string {
  return formatDateTime(ms, locale.value)
}
</script>

<style scoped lang="scss">
.agent-provenance {
  &__intro {
    margin: 0 0 16px;
    font-size: 13px;
    color: rgb(var(--v-theme-on-surface-variant));
  }

  &__state {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px 0;
    color: rgb(var(--v-theme-on-surface-variant));
  }

  &__trace + &__trace {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid var(--atlas-color-outline);
  }

  &__trace-header {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 12px;
    margin-bottom: 8px;
  }

  &__trace-title {
    font-weight: 500;
  }

  &__trace-id {
    font-size: 12px;
    color: rgb(var(--v-theme-on-surface-variant));
    overflow-wrap: anywhere;
  }

  &__steps {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  &__step {
    padding: 8px 0 8px 12px;
    border-left: 2px solid var(--atlas-color-outline);
  }

  &__step-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 10px;
  }

  &__tool {
    font-size: 13px;
  }

  &__time {
    margin-left: auto;
  }

  &__muted {
    font-size: 12px;
    color: rgb(var(--v-theme-on-surface-variant));
  }

  &__details {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 2px 12px;
    margin: 6px 0 0;
    font-size: 13px;

    dt {
      color: rgb(var(--v-theme-on-surface-variant));
    }

    dd {
      margin: 0;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
  }

  &__error {
    color: rgb(var(--v-theme-error));
  }
}
</style>
