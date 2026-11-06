import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, ref } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CachePreviewSelector from '@/components/cohort-editor/CachePreviewSelector.vue'
import { AtlasSelect } from '@/components/ui'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

type Status = 'ready' | 'not_built' | 'stale'

const enabled = ref(true)
const sources = ref<Array<{ sourceKey: string; sourceName: string; cacheStatus: { status: Status } | null }>>([])
const ready = computed(() => sources.value.filter(s => s.cacheStatus?.status === 'ready'))

vi.mock('@/composables/useTrexSQLCache', () => ({
  useTrexSQLCache: () => ({
    isTrexSQLEnabled: enabled,
    hasReadyCache: computed(() => ready.value.length > 0),
    selectedSourceKey: ref('B'),
    dataSources: sources,
    readyDataSources: ready,
    isLoadingDataSources: ref(false),
    selectDataSource: vi.fn(),
    initialize: vi.fn().mockResolvedValue(undefined),
  }),
}))

function mountSelector() {
  return mount(CachePreviewSelector, {
    global: { plugins: [createVuetify({ components, directives })] },
  })
}

describe('CachePreviewSelector', () => {
  beforeEach(() => {
    enabled.value = true
    sources.value = []
  })

  it('stays hidden when TrexSQL is enabled but no source has a ready cache', () => {
    sources.value = [
      { sourceKey: 'A', sourceName: 'Alpha', cacheStatus: { status: 'not_built' } },
      { sourceKey: 'B', sourceName: 'Beta', cacheStatus: { status: 'stale' } },
    ]
    expect(mountSelector().find('[data-testid="cache-preview-selector"]').exists()).toBe(false)
  })

  it('stays hidden when TrexSQL is disabled, even with a ready cache', () => {
    enabled.value = false
    sources.value = [{ sourceKey: 'A', sourceName: 'Alpha', cacheStatus: { status: 'ready' } }]
    expect(mountSelector().find('[data-testid="cache-preview-selector"]').exists()).toBe(false)
  })

  it('offers only the sources with a ready cache', () => {
    sources.value = [
      { sourceKey: 'A', sourceName: 'Alpha', cacheStatus: { status: 'not_built' } },
      { sourceKey: 'B', sourceName: 'Beta', cacheStatus: { status: 'ready' } },
      { sourceKey: 'C', sourceName: 'Gamma', cacheStatus: null },
    ]
    const wrapper = mountSelector()
    expect(wrapper.find('[data-testid="cache-preview-selector"]').exists()).toBe(true)
    const items = wrapper.findComponent(AtlasSelect).props('items') as Array<{ value: string }>
    expect(items.map(item => item.value)).toEqual(['B'])
  })
})
