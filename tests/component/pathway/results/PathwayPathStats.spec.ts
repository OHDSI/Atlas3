import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import PathwayPathStats from '@/components/pathway/results/PathwayPathStats.vue'
import type { PathStatsOutput } from '@/utils/pathway-path-stats'

const vuetify = createVuetify({ components, directives })

const sample: PathStatsOutput = {
  summary: {
    chips: [
      { name: 'SABA', colorKey: '1' },
      { name: 'ICS', colorKey: '2' },
      { name: 'LABA', colorKey: '4' },
    ],
    persons: 414,
    pctOfCohort: 3.2,
    pctOfPathways: 7.1,
  },
  steps: [
    { name: 'SABA', colorKey: '1', entered: 1210, retentionPct: 100 },
    { name: 'ICS', colorKey: '2', entered: 880, retentionPct: 72.7 },
    { name: 'LABA', colorKey: '4', entered: 414, retentionPct: 47.0 },
  ],
  stats: {
    medianDurationDays: null,
    medianStepGapDays: null,
    daysToStep1: null,
    continuedPastLastStep: null,
  },
}

const colors = (k: string) => ({ '1': '#1f77b4', '2': '#ff7f0e', '4': '#2ca02c' }[k] ?? '#ccc')

function mountIt(stats: PathStatsOutput) {
  return mount(PathwayPathStats, {
    props: { stats, colors },
    global: { plugins: [vuetify] },
  })
}

describe('PathwayPathStats', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  it('renders the chip sequence with cohort names', () => {
    const w = mountIt(sample)
    expect(w.text()).toContain('SABA')
    expect(w.text()).toContain('ICS')
    expect(w.text()).toContain('LABA')
  })

  it('renders the person count and percentages', () => {
    const w = mountIt(sample)
    expect(w.text()).toContain('414')
    expect(w.text()).toMatch(/3\.2%/)
    expect(w.text()).toMatch(/7\.1%/)
  })

  it('renders each step with entered count and retention', () => {
    const w = mountIt(sample)
    const rows = w.findAll('[data-testid="path-step-row"]')
    expect(rows).toHaveLength(3)
    expect(rows[1]!.text()).toContain('880')
    expect(rows[1]!.text()).toMatch(/73%|72\.7%/)
  })

  it('renders an em-dash for missing time-based stats', () => {
    const w = mountIt(sample)
    const rows = w.findAll('[data-testid="path-stat-row"]')
    expect(rows.length).toBeGreaterThanOrEqual(1)
    rows.forEach((r) => {
      expect(r.text()).toContain('—')
    })
  })

  it('renders numeric stats when they are present', () => {
    const w = mountIt({
      ...sample,
      stats: {
        medianDurationDays: 142,
        medianStepGapDays: 38,
        daysToStep1: 21,
        continuedPastLastStep: 182,
      },
    })
    expect(w.text()).toMatch(/142/)
    expect(w.text()).toMatch(/38/)
    expect(w.text()).toMatch(/21/)
    expect(w.text()).toMatch(/182/)
  })
})
