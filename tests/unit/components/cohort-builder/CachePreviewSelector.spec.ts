import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createVuetify } from 'vuetify'
import { setActivePinia, createPinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

const trexReturn = {
  isTrexSQLEnabled: ref(true),
  selectedSourceKey: ref<string | null>('SYNPUF-1K'),
  dataSources: ref([
    { sourceKey: 'SYNPUF-1K', sourceName: 'SYNPUF-1K', cacheStatus: { status: 'ready' as const } },
    { sourceKey: 'SYNPUF-100K', sourceName: 'SYNPUF-100K', cacheStatus: { status: 'stale' as const } },
    { sourceKey: 'CMS_DEID', sourceName: 'CMS_DEID', cacheStatus: { status: 'not_built' as const } },
  ]),
  isLoadingDataSources: ref(false),
  selectDataSource: vi.fn(),
  initialize: vi.fn(),
}

vi.mock('@/composables/useTrexSQLCache', () => ({
  useTrexSQLCache: () => trexReturn,
}))

import CachePreviewSelector from '@/components/cohort-builder/CachePreviewSelector.vue'

const vuetify = createVuetify({ components, directives })

function mountSelector() {
  return mount(CachePreviewSelector, {
    global: { plugins: [vuetify] },
  })
}

describe('CachePreviewSelector', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    trexReturn.isTrexSQLEnabled.value = true
    trexReturn.selectedSourceKey.value = 'SYNPUF-1K'
  })

  it('renders nothing when TrexSQL is disabled', () => {
    trexReturn.isTrexSQLEnabled.value = false
    const wrapper = mountSelector()
    expect(wrapper.find('[data-testid="cache-preview-selector"]').exists()).toBe(false)
  })

  it('renders the selected source name and ready status', () => {
    const wrapper = mountSelector()
    expect(wrapper.text()).toContain('SYNPUF-1K')
    expect(wrapper.text().toLowerCase()).toContain('ready')
  })

  it('calls selectDataSource when a different source is chosen', async () => {
    const wrapper = mountSelector()
    const select = wrapper.findComponent({ name: 'VSelect' })
    select.vm.$emit('update:modelValue', 'SYNPUF-100K')
    await wrapper.vm.$nextTick()
    expect(trexReturn.selectDataSource).toHaveBeenCalledWith('SYNPUF-100K')
  })
})
