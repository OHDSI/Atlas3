import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

import PathwayCoverageStat from '@/components/pathway/results/PathwayCoverageStat.vue'

const vuetify = createVuetify({ components, directives })

function mountIt(props: { totalPathwaysCount: number; targetCohortCount: number; targetCohortName?: string }) {
  return mount(PathwayCoverageStat, {
    props,
    global: { plugins: [vuetify] },
  })
}

describe('PathwayCoverageStat', () => {
  it('renders the percentage with one decimal', () => {
    const w = mountIt({ totalPathwaysCount: 5824, targetCohortCount: 12901 })
    expect(w.text()).toMatch(/45\.1%/)
  })

  it('renders the formatted person counts', () => {
    const w = mountIt({ totalPathwaysCount: 5824, targetCohortCount: 12901 })
    expect(w.text()).toMatch(/5,824/)
    expect(w.text()).toMatch(/12,901/)
  })

  it('renders 0% when targetCohortCount is zero', () => {
    const w = mountIt({ totalPathwaysCount: 0, targetCohortCount: 0 })
    expect(w.text()).toMatch(/0\.0%/)
  })

  it('caps the progress bar at 100% even when input exceeds it', () => {
    const w = mountIt({ totalPathwaysCount: 200, targetCohortCount: 100 })
    const fill = w.find('[data-testid="coverage-progress-fill"]')
    const style = fill.attributes('style') ?? ''
    expect(style).toContain('width: 100%')
  })

  it('renders the cohort name when provided', () => {
    const w = mountIt({ totalPathwaysCount: 1, targetCohortCount: 2, targetCohortName: 'Asthma cohort' })
    expect(w.text()).toContain('Asthma cohort')
  })
})
