import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import DataSourceRunRow from '@/components/generation/DataSourceRunRow.vue'

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

function mountRow(props: Record<string, unknown>) {
  return mount(DataSourceRunRow, {
    global: { plugins: [vuetify] },
    props: { sourceKey: 'CCAE', historyCount: 0, ...props },
  })
}

describe('DataSourceRunRow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('switches primary button to Cancel when running and hideCancel is false', () => {
    const wrapper = mountRow({ latestStatus: 'RUNNING' })
    const btn = wrapper.find('[data-testid="run-btn-CCAE"]')
    expect(btn.text()).toMatch(/Cancel/i)
  })

  it('keeps primary button as Generate (disabled) when running and hideCancel=true', () => {
    const wrapper = mountRow({ latestStatus: 'RUNNING', hideCancel: true })
    const btn = wrapper.find('[data-testid="run-btn-CCAE"]')
    expect(btn.text()).not.toMatch(/Cancel/i)
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('shows Rerun (enabled) when COMPLETE with hideCancel=true', () => {
    const wrapper = mountRow({ latestStatus: 'COMPLETED', hideCancel: true })
    const btn = wrapper.find('[data-testid="run-btn-CCAE"]')
    expect(btn.text()).toMatch(/Rerun/i)
    expect(btn.attributes('disabled')).toBeUndefined()
  })
})
