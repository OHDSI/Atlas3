import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import CohortReportDrawer from '@/components/cohort/CohortReportDrawer.vue'

vi.mock('@/components/reports/inclusion/InclusionRuleReport.vue', () => ({
  default: { name: 'InclusionRuleReport', template: '<div data-testid="stub-inclusion" />' },
}))
vi.mock('@/components/cohort-samples/CohortSamplesPanel.vue', () => ({
  default: { name: 'CohortSamplesPanel', template: '<div data-testid="stub-samples" />' },
}))

const vuetify = createVuetify({ components, directives })

function mountDrawer(props: Record<string, unknown>) {
  return mount(CohortReportDrawer, {
    global: {
      plugins: [vuetify],
      stubs: {
        VNavigationDrawer: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<div class="v-navigation-drawer" v-if="modelValue"><slot /></div>',
        },
      },
    },
    attachTo: document.body,
    props: {
      modelValue: true,
      cohortId: 1,
      sourceKey: 'CCAE',
      reportType: 'inclusion' as const,
      ...props,
    },
  })
}

describe('CohortReportDrawer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders InclusionRuleReport when reportType=inclusion', () => {
    const wrapper = mountDrawer({ reportType: 'inclusion' })
    expect(document.body.querySelector('[data-testid="stub-inclusion"]')).not.toBeNull()
    expect(document.body.querySelector('[data-testid="stub-samples"]')).toBeNull()
    wrapper.unmount()
  })

  it('renders CohortSamplesPanel when reportType=samples', () => {
    const wrapper = mountDrawer({ reportType: 'samples' })
    expect(document.body.querySelector('[data-testid="stub-samples"]')).not.toBeNull()
    expect(document.body.querySelector('[data-testid="stub-inclusion"]')).toBeNull()
    wrapper.unmount()
  })

  it('emits update:modelValue=false on close', async () => {
    const wrapper = mountDrawer({ reportType: 'inclusion' })
    const close = document.body.querySelector('[data-testid="report-drawer-close"]') as HTMLElement | null
    expect(close).not.toBeNull()
    close!.click()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
    wrapper.unmount()
  })

  it('renders nothing when reportType is null', () => {
    const wrapper = mountDrawer({ reportType: null })
    expect(document.body.querySelector('[data-testid="stub-inclusion"]')).toBeNull()
    expect(document.body.querySelector('[data-testid="stub-samples"]')).toBeNull()
    wrapper.unmount()
  })
})
