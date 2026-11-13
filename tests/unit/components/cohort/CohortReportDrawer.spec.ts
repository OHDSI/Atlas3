import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import CohortReportDrawer from '@/components/cohort/CohortReportDrawer.vue'
import { InlineAtlasSideSheetStub } from '../../../helpers/component-wrapper'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})
vi.mock('@/components/reports/inclusion/InclusionRuleReport.vue', () => ({
  default: { name: 'InclusionRuleReport', template: '<div data-testid="stub-inclusion" />' },
}))
vi.mock('@/components/cohort-samples/CohortSamplesPanel.vue', () => ({
  default: {
    name: 'CohortSamplesPanel',
    emits: ['open-profile'],
    template: '<div data-testid="stub-samples" />',
  },
}))
vi.mock('@/components/cohort-samples/ProfileSidePanel.vue', () => ({
  default: {
    name: 'ProfileSidePanel',
    props: ['sourceKey', 'personId', 'cohortId'],
    template: '<div data-testid="stub-profile" />',
  },
}))

const vuetify = createVuetify({ components, directives })

function mountDrawer(props: Record<string, unknown>) {
  return mount(CohortReportDrawer, {
    global: {
      plugins: [vuetify],
      stubs: { AtlasSideSheet: InlineAtlasSideSheetStub },
    },
    props: {
      modelValue: true,
      cohortId: 1,
      sourceKey: 'CCAE',
      reportType: 'inclusion' as const,
      ...props,
    },
  })
}

const sheet = (w: ReturnType<typeof mountDrawer>) => w.getComponent(InlineAtlasSideSheetStub)

describe('CohortReportDrawer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders InclusionRuleReport with the inclusion title when reportType=inclusion', () => {
    const wrapper = mountDrawer({ reportType: 'inclusion' })
    expect(wrapper.find('[data-testid="stub-inclusion"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="stub-samples"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="report-drawer-back"]').exists()).toBe(false)
    expect(sheet(wrapper).props('ariaLabel')).toBe(wrapper.find('.text-h6').text())
  })

  it('renders CohortSamplesPanel when reportType=samples and forwards open-profile', async () => {
    const wrapper = mountDrawer({ reportType: 'samples' })
    expect(wrapper.find('[data-testid="stub-samples"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="stub-inclusion"]').exists()).toBe(false)

    wrapper.getComponent({ name: 'CohortSamplesPanel' }).vm.$emit('open-profile', 'p-42')
    expect(wrapper.emitted('open-profile')).toEqual([['p-42']])
  })

  it('renders the profile panel with a person title and a back button', async () => {
    const wrapper = mountDrawer({ reportType: 'profile', personId: '42' })
    const profile = wrapper.getComponent({ name: 'ProfileSidePanel' })
    expect(profile.props()).toMatchObject({ sourceKey: 'CCAE', personId: '42', cohortId: 1 })
    expect(wrapper.find('.text-h6').text()).toContain('42')

    await wrapper.get('[data-testid="report-drawer-back"]').trigger('click')
    expect(wrapper.emitted('back')).toHaveLength(1)
  })

  it('uses the generic profile title and no panel without a person id', () => {
    const withPerson = mountDrawer({ reportType: 'profile', personId: '42' }).find('.text-h6').text()
    const wrapper = mountDrawer({ reportType: 'profile', personId: null })
    expect(wrapper.find('[data-testid="stub-profile"]').exists()).toBe(false)
    expect(wrapper.find('.text-h6').text()).not.toBe(withPerson)
    expect(wrapper.find('.text-h6').text()).not.toContain('42')
  })

  it('emits update:modelValue=false on close', async () => {
    const wrapper = mountDrawer({ reportType: 'inclusion' })
    await wrapper.get('[data-testid="report-drawer-close"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
  })

  it('forwards sheet dismissal (Esc/scrim) as update:modelValue', () => {
    const wrapper = mountDrawer({ reportType: 'inclusion' })
    sheet(wrapper).vm.$emit('update:modelValue', false)
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('renders nothing when reportType is null', () => {
    const wrapper = mountDrawer({ reportType: null })
    expect(wrapper.find('[data-testid="stub-inclusion"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="stub-samples"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="stub-profile"]').exists()).toBe(false)
  })

  it('renders no content while closed', () => {
    const wrapper = mountDrawer({ modelValue: false })
    expect(wrapper.find('[data-testid="cohort-report-drawer"]').exists()).toBe(false)
  })
})