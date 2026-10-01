import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import { defaultExpression } from '@/models/circe-types'

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback?: string) => ref(fallback || key),
  }),
}))

const mockGetCohortPrintFriendly = vi.fn()

vi.mock('@/services/cohort-definition.service', () => ({
  getCohortPrintFriendly: (...args: unknown[]) => mockGetCohortPrintFriendly(...args),
}))

import CohortPrintFriendlyDialog from '@/components/cohort/CohortPrintFriendlyDialog.vue'

const vuetify = createVuetify({ components, directives })
const PRINT_FRIENDLY_HTML = '<h1>Test cohort</h1><p>Readable criteria</p>'

function mountComponent(props: Record<string, unknown> = {}) {
  return mount(CohortPrintFriendlyDialog, {
    props: {
      modelValue: true,
      expression: defaultExpression,
      ...props,
    },
    global: {
      plugins: [vuetify],
      stubs: {
        AtlasDialog: {
          props: ['modelValue'],
          template: '<div v-if="modelValue"><slot /><slot name="actions" /></div>',
        },
      },
    },
  })
}

describe('CohortPrintFriendlyDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCohortPrintFriendly.mockResolvedValue({ success: true, data: PRINT_FRIENDLY_HTML })
  })

  it('fetches and renders the WebAPI print-friendly HTML when opened', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    expect(mockGetCohortPrintFriendly).toHaveBeenCalledWith(defaultExpression)
    const content = wrapper.find('[data-testid="cohort-print-friendly-content"]')
    expect(content.find('h1').text()).toBe('Test cohort')
    expect(content.find('p').text()).toBe('Readable criteria')
  })

  it('surfaces the service error', async () => {
    mockGetCohortPrintFriendly.mockResolvedValue({
      success: false,
      error: { message: 'HTTP 500: Could not render cohort' },
    })

    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.find('[data-testid="cohort-print-friendly-error"]').text()).toContain(
      'Could not render cohort'
    )
  })

  it('refreshes when reopened so it does not show stale content', async () => {
    const wrapper = mountComponent({ modelValue: false })
    await flushPromises()
    expect(mockGetCohortPrintFriendly).not.toHaveBeenCalled()

    await wrapper.setProps({ modelValue: true })
    await flushPromises()
    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })
    await flushPromises()

    expect(mockGetCohortPrintFriendly).toHaveBeenCalledTimes(2)
  })

  it('closes when the Close action is selected', async () => {
    const wrapper = mountComponent()
    await flushPromises()
    await wrapper.find('[data-testid="cohort-print-friendly-close"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toContainEqual([false])
  })
})