/**
 * AggrecateSelect component tests
 *
 * Verifies the aggregate picker preserves the generic "Any" bucket and shows
 * domain-specific buckets for the active criteria domain, then writes the
 * selected aggregate back to the row.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import AggrecateSelect from '@/components/circe/criteria/AggrecateSelect.vue'
import type { FeatureAnalysisDistributionItem } from '@/models/feature-analysis.types'
import type { FeatureAnalysisAggregate } from '@/models/feature-analysis.types'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

function mountSelector(criteria: FeatureAnalysisDistributionItem) {
  return mount(AggrecateSelect, {
    props: {
      criteria,
      label: 'Aggregate',
      aggregates: [
        { id: 1, name: 'Events count' },
        { id: 2, name: 'Value as number', domain: 'MEASUREMENT' },
      ],
    },
    global: {
      plugins: [vuetify],
      stubs: {
        AtlasMenu: {
          template: '<div><slot name="activator" :props="{}" /><div data-testid="menu-content"><slot /></div></div>',
        },
        AtlasButton: {
          template: '<button v-bind="$attrs"><slot /></button>',
        },
      },
    },
  })
}

const allDomainAggregates: FeatureAnalysisAggregate[] = [
  { id: 1, name: 'Any aggregate' },
  { id: 2, name: 'Condition aggregate', domain: 'CONDITION' },
  { id: 3, name: 'Condition era aggregate', domain: 'CONDITION_ERA' },
  { id: 4, name: 'Demographics aggregate', domain: 'DEMOGRAPHICS' },
  { id: 5, name: 'Device aggregate', domain: 'DEVICE' },
  { id: 6, name: 'Drug aggregate', domain: 'DRUG' },
  { id: 7, name: 'Drug era aggregate', domain: 'DRUG_ERA' },
  { id: 8, name: 'Measurement aggregate', domain: 'MEASUREMENT' },
  { id: 9, name: 'Observation aggregate', domain: 'OBSERVATION' },
  { id: 10, name: 'Procedure aggregate', domain: 'PROCEDURE' },
  { id: 11, name: 'Visit aggregate', domain: 'VISIT' },
  { id: 12, name: 'Unmapped aggregate', domain: 'OTHER' as FeatureAnalysisAggregate['domain'] },
]

describe('AggrecateSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows generic and measurement-specific aggregate groups', () => {
    const criteria = {
      criteriaType: 'WindowedCriteria',
      aggregate: undefined,
      expression: { Criteria: { Measurement: {} } },
    } as FeatureAnalysisDistributionItem

    const wrapper = mountSelector(criteria)

    expect(wrapper.text()).toContain('Any')
    expect(wrapper.text()).toContain('Measurement')
    expect(wrapper.text()).toContain('Events count')
    expect(wrapper.text()).toContain('Value as number')
  })

  it('writes the selected aggregate back to the criteria row', async () => {
    const criteria = {
      criteriaType: 'WindowedCriteria',
      aggregate: undefined,
      expression: { Criteria: { Measurement: {} } },
    } as FeatureAnalysisDistributionItem

    const wrapper = mountSelector(criteria)

    await wrapper.get('[data-testid="feature-analysis-aggregate-option-2"]').trigger('click')

    expect(criteria.aggregate?.id).toBe(2)
    expect(wrapper.text()).toContain('Value as number')
  })

  it('groups and labels every aggregate domain bucket', () => {
    const criteria = {
      criteriaType: 'DemographicCriteria',
      aggregate: undefined,
      expression: {},
    } as FeatureAnalysisDistributionItem

    const wrapper = mount(AggrecateSelect, {
      props: {
        criteria,
        label: 'Aggregate',
        aggregates: allDomainAggregates,
      },
      global: {
        plugins: [vuetify],
        stubs: {
          AtlasMenu: {
            template: '<div><slot name="activator" :props="{}" /><div data-testid="menu-content"><slot /></div></div>',
          },
          AtlasButton: {
            template: '<button v-bind="$attrs"><slot /></button>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('Any')
    expect(wrapper.text()).toContain('Condition')
    expect(wrapper.text()).toContain('Condition Era')
    expect(wrapper.text()).toContain('Demographics')
    expect(wrapper.text()).toContain('Device')
    expect(wrapper.text()).toContain('Drug')
    expect(wrapper.text()).toContain('Drug Era')
    expect(wrapper.text()).toContain('Measurement')
    expect(wrapper.text()).toContain('Observation')
    expect(wrapper.text()).toContain('Procedure')
    expect(wrapper.text()).toContain('Visit')
    expect(wrapper.text()).toContain('OTHER')
  })

  it('shows all aggregates when the windowed criteria has no inner criteria', () => {
    const criteria = {
      criteriaType: 'WindowedCriteria',
      aggregate: undefined,
      expression: {},
    } as FeatureAnalysisDistributionItem

    const wrapper = mount(AggrecateSelect, {
      props: {
        criteria,
        label: 'Aggregate',
        aggregates: allDomainAggregates,
      },
      global: {
        plugins: [vuetify],
        stubs: {
          AtlasMenu: {
            template: '<div><slot name="activator" :props="{}" /><div data-testid="menu-content"><slot /></div></div>',
          },
          AtlasButton: {
            template: '<button v-bind="$attrs"><slot /></button>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('Any aggregate')
    expect(wrapper.text()).toContain('Condition aggregate')
    expect(wrapper.text()).toContain('Unmapped aggregate')
  })

  it('falls back to all aggregates when the inner criteria wrapper is unknown', () => {
    const criteria = {
      criteriaType: 'WindowedCriteria',
      aggregate: undefined,
      expression: { Criteria: {} },
    } as FeatureAnalysisDistributionItem

    const wrapper = mountSelector(criteria)

    expect(wrapper.text()).toContain('Events count')
    expect(wrapper.text()).toContain('Value as number')
  })

  it('clears the selected aggregate when the computed setter receives null', async () => {
    const criteria = {
      criteriaType: 'WindowedCriteria',
      aggregate: { id: 1, name: 'Any aggregate' },
      expression: { Criteria: { Measurement: {} } },
    } as FeatureAnalysisDistributionItem

    const wrapper = mountSelector(criteria)

    ;(wrapper.vm as unknown as { selectedAggregateId: number | null }).selectedAggregateId = null

    expect(criteria.aggregate).toBeUndefined()
  })

  it('keeps Any grouped first even when it appears after other domains in the input list', () => {
    const criteria = {
      criteriaType: 'DemographicCriteria',
      aggregate: undefined,
      expression: {},
    } as FeatureAnalysisDistributionItem

    const wrapper = mount(AggrecateSelect, {
      props: {
        criteria,
        label: 'Aggregate',
        aggregates: [
          { id: 2, name: 'Condition aggregate', domain: 'CONDITION' },
          { id: 1, name: 'Any aggregate' },
        ],
      },
      global: {
        plugins: [vuetify],
        stubs: {
          AtlasMenu: {
            template: '<div><slot name="activator" :props="{}" /><div data-testid="menu-content"><slot /></div></div>',
          },
          AtlasButton: {
            template: '<button v-bind="$attrs"><slot /></button>',
          },
        },
      },
    })

    const text = wrapper.text()
    expect(text.indexOf('Any')).toBeLessThan(text.indexOf('Condition'))
  })
})