import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import DataSourceRunTable from '@/components/generation/DataSourceRunTable.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/composables/useEntityAccess', () => ({
  useSourceAccess: () => ({
    canRead: computed(() => true),
    canWrite: computed(() => true),
  }),
}))

const vuetify = createVuetify({ components, directives })

const sources = [
  { sourceKey: 'CCAE', sourceName: 'CCAE' },
  { sourceKey: 'MDCR', sourceName: 'MDCR' },
]
const executions = [
  { id: 1, sourceKey: 'CCAE', status: 'COMPLETED' as const, startTime: 1, endTime: 2, personCount: 8420 },
  { id: 2, sourceKey: 'MDCR', status: 'RUNNING' as const, startTime: 3 },
]

function mountTable(props: Record<string, unknown> = {}) {
  return mount(DataSourceRunTable, {
    global: { plugins: [vuetify] },
    props: { sources, executions, ...props },
  })
}

describe('DataSourceRunTable extensions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('omits Patients column by default', () => {
    const wrapper = mountTable()
    expect(wrapper.text()).not.toMatch(/Patients/)
  })

  it('renders Patients column when showPatientCount=true', () => {
    const wrapper = mountTable({ showPatientCount: true })
    expect(wrapper.text()).toMatch(/Patients/)
    expect(wrapper.text()).toContain('8,420')
  })

  it('renders extraActions buttons and emits extra-action with key+sourceKey', async () => {
    const wrapper = mountTable({
      extraActions: [
        { key: 'inclusion', label: 'Inclusion report' },
        { key: 'samples', label: 'Samples' },
      ],
    })
    const incBtn = wrapper.find('[data-testid="row-extra-inclusion-CCAE"]')
    expect(incBtn.exists()).toBe(true)
    await incBtn.trigger('click')
    const events = wrapper.emitted('extra-action')
    expect(events?.[0]).toEqual(['inclusion', 'CCAE'])
  })

  it('respects extraActions disabledWhen', () => {
    const wrapper = mountTable({
      extraActions: [
        { key: 'samples', label: 'Samples', disabledWhen: (r: { latestStatus?: string }) => r.latestStatus !== 'COMPLETED' },
      ],
    })
    const ccae = wrapper.find('[data-testid="row-extra-samples-CCAE"]')
    const mdcr = wrapper.find('[data-testid="row-extra-samples-MDCR"]')
    expect(ccae.attributes('disabled')).toBeUndefined()
    expect(mdcr.attributes('disabled')).toBeDefined()
  })

  it('passes hideCancel through to row', () => {
    const wrapper = mountTable({ hideCancel: true })
    const mdcrBtn = wrapper.find('[data-testid="run-btn-MDCR"]')
    expect(mdcrBtn.text()).not.toMatch(/Cancel/i)
  })
})
