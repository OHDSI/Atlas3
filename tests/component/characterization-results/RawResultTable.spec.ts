/**
 * RawResultTable component tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'

import RawResultTable from '@/components/characterization-results/RawResultTable.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

function mountTable(rows: Record<string, unknown>[]) {
  return mount(RawResultTable, {
    props: { analysisId: 500, analysisName: 'Custom analysis', rows },
    global: { plugins: [vuetify] },
    attachTo: document.body,
  })
}

describe('RawResultTable', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setActivePinia(createPinia())
  })

  it('derives columns from arbitrary custom-SQL keys', () => {
    const wrapper = mountTable([
      { covariateId: 1, covariateName: 'home death', deathPlace: 'home', deaths: 1280 },
    ])
    const headers = wrapper.findAll('th').map((h) => h.text())
    // Well-known columns lead; bespoke columns are surfaced too.
    expect(headers.some((h) => /Covariate Name/i.test(h))).toBe(true)
    expect(headers.some((h) => /Death Place/i.test(h))).toBe(true)
    expect(headers.some((h) => /Deaths/i.test(h))).toBe(true)
    wrapper.unmount()
  })

  it('hides header/badge-only keys from the table body', () => {
    const wrapper = mountTable([
      { covariateId: 1, covariateName: 'x', analysisId: 500, analysisName: 'Custom analysis', faType: 'CUSTOM_FE' },
    ])
    const headers = wrapper.findAll('th').map((h) => h.text())
    expect(headers.some((h) => /^Analysis Id$/i.test(h))).toBe(false)
    expect(headers.some((h) => /Fa Type|faType/i.test(h))).toBe(false)
    wrapper.unmount()
  })

  it('shows a Custom SQL badge when a row is CUSTOM_FE', () => {
    const wrapper = mountTable([{ covariateId: 1, covariateName: 'x', faType: 'CUSTOM_FE' }])
    expect(wrapper.text()).toMatch(/Custom SQL/i)
    wrapper.unmount()
  })

  it('omits the badge when no row is CUSTOM_FE', () => {
    const wrapper = mountTable([{ covariateId: 1, covariateName: 'x', faType: 'PRESET' }])
    expect(wrapper.find('.raw-result-table__badge').exists()).toBe(false)
    wrapper.unmount()
  })
})
