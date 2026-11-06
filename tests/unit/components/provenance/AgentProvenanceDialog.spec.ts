/**
 * AgentProvenanceDialog Component Tests
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { computed, ref } from 'vue'
import AgentProvenanceDialog from '@/components/provenance/AgentProvenanceDialog.vue'
import { groupByTrace, type ProvenanceEntry } from '@/services/mcp-provenance.service'

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      ref(params ? `${key} ${JSON.stringify(params)}` : key),
    locale: computed(() => 'en'),
  }),
}))

const vuetify = createVuetify({ components, directives })

function entry(overrides: Partial<ProvenanceEntry>): ProvenanceEntry {
  return {
    id: 1,
    traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
    spanId: '00f067aa0ba902b7',
    tool: 'create_cohort_definition',
    reasoningStep: 'STEP_3_COHORT_CRITERIA_DEFINITION',
    outcome: 'SUCCESS',
    clinicalRationale: 'Adults aged 40+ at their first recorded GI hemorrhage.',
    evidenceReference: 'OHDSI Eunomia GiBleed example study',
    userLogin: 'analyst',
    startedAt: 1_730_700_000_000,
    ...overrides,
  }
}

function mountDialog(props: Record<string, unknown>) {
  return mount(AgentProvenanceDialog, {
    props: { modelValue: true, kind: 'cohortdefinition', traces: [], ...props },
    global: {
      plugins: [vuetify],
      stubs: {
        AtlasDialog: { template: '<div class="dialog-stub"><slot /></div>' },
      },
    },
  })
}

describe('AgentProvenanceDialog', () => {
  it('lists each session with its calls, outcomes and rationale', () => {
    const traces = groupByTrace([
      entry({ id: 1 }),
      entry({
        id: 2,
        tool: 'update_cohort_definition',
        outcome: 'REJECTED',
        clinicalRationale: null,
        evidenceReference: null,
        errorMessage: 'concept 192671 is named "Gastrointestinal hemorrhage", not "GI bleed"',
        startedAt: 1_730_700_060_000,
      }),
      entry({ id: 3, traceId: 'f'.repeat(32), tool: 'generate_cohort', reasoningStep: 'MY_OWN_STEP', startedAt: 1_730_800_000_000 }),
    ])
    const wrapper = mountDialog({ traces })

    expect(wrapper.findAll('[data-testid="agent-provenance-trace"]')).toHaveLength(2)
    expect(wrapper.findAll('[data-testid="agent-provenance-entry"]')).toHaveLength(3)
    expect(wrapper.find('[data-testid="agent-provenance-outcome-SUCCESS"]').text())
      .toBe('components.agentProvenance.outcome.success')
    expect(wrapper.find('[data-testid="agent-provenance-outcome-REJECTED"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="agent-provenance-rationale"]').text())
      .toBe('Adults aged 40+ at their first recorded GI hemorrhage.')
    expect(wrapper.text()).toContain('not "GI bleed"')
    expect(wrapper.text()).toContain('components.agentProvenance.step.cohortCriteria')
    // A step label the client made up is shown as sent.
    expect(wrapper.text()).toContain('MY_OWN_STEP')
    expect(wrapper.text()).toContain('4bf92f3577b34da6a3ce929d0e0e4736')
    expect(wrapper.text()).toContain('components.agentProvenance.introCohortDefinition')
  })

  it('uses the concept set wording for a concept set', () => {
    const wrapper = mountDialog({ kind: 'conceptset' })
    expect(wrapper.text()).toContain('components.agentProvenance.introConceptSet')
  })

  it('shows the empty state', () => {
    const wrapper = mountDialog({})
    expect(wrapper.find('[data-testid="agent-provenance-empty"]').exists()).toBe(true)
  })

  it('shows the loading state instead of the list', () => {
    const wrapper = mountDialog({ loading: true, traces: groupByTrace([entry({})]) })
    expect(wrapper.find('[data-testid="agent-provenance-loading"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="agent-provenance-trace"]').exists()).toBe(false)
  })

  it('shows a load error with a retry', async () => {
    const wrapper = mountDialog({ error: 'HTTP 500: boom' })
    const alert = wrapper.find('[data-testid="agent-provenance-error"]')
    expect(alert.text()).toContain('HTTP 500: boom')

    await alert.find('button').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})
