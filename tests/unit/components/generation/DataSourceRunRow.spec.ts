import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, unref } from 'vue'
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
  useSourceAccess: (sourceId: unknown) => ({
    canRead: computed(() => true),
    canWrite: computed(() => String(unref(sourceId as any)) === '404'),
  }),
}))

const vuetify = createVuetify({ components, directives })

function mountRow(props: Record<string, unknown>) {
  return mount(DataSourceRunRow, {
    global: { plugins: [vuetify] },
    props: { sourceId: 1, sourceKey: 'CCAE', historyCount: 0, ...props },
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
    const wrapper = mountRow({ latestStatus: 'COMPLETED', hideCancel: true, sourceId: 404 })
    const btn = wrapper.find('[data-testid="run-btn-CCAE"]')
    expect(btn.text()).toMatch(/Rerun/i)
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  it('uses sourceId for permission checks when provided', () => {
    const wrapper = mountRow({ sourceId: 404 })
    const btn = wrapper.find('[data-testid="run-btn-CCAE"]')
    expect(btn.attributes('disabled')).toBeUndefined()
  })
})
