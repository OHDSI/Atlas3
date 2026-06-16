import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import IncludedSourceCodesTable from '@/components/concepts/IncludedSourceCodesTable.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({ t: (_k: string, fallback: string) => ({ value: fallback }) }),
}))

const stubs = {
  AtlasAlert: { template: '<div class="stub-alert"><slot /></div>' },
  AtlasButton: { template: '<button><slot /></button>' },
  AtlasCard: { template: '<div class="stub-card"><slot /></div>' },
  AtlasChip: { template: '<span class="stub-chip"><slot /></span>' },
  AtlasDataTable: {
    props: ['items', 'loading'],
    template: '<table class="stub-table"><tbody><tr v-for="i in items" :key="i.conceptId"><td>{{ i.conceptName }}</td></tr></tbody></table>',
  },
  AtlasIcon: { template: '<i />' },
  AtlasSkeleton: { template: '<div class="stub-skeleton" />' },
}

function makeWrapper(props: Record<string, unknown> = {}) {
  return mount(IncludedSourceCodesTable, {
    props: { active: true, sourceKey: 'SYNPUF1K', ...props },
    global: { stubs },
  })
}

describe('IncludedSourceCodesTable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // Prevent the watcher from calling the real resolveSourceCodes, which would
    // reset sourceCodeItems/sourceCodeError when includedItems is empty.
    vi.spyOn(useConceptSetsStore(), 'resolveSourceCodes').mockResolvedValue()
  })

  it('renders rows for the store source-code items', () => {
    const store = useConceptSetsStore()
    store.sourceCodeItems = [
      {
        conceptId: 45542738,
        conceptName: 'Type 2 diabetes mellitus',
        conceptCode: 'E11.9',
        domainId: 'Condition',
        vocabularyId: 'ICD10CM',
        conceptClassId: 'ICD10 code',
        standardConcept: null,
        invalidReason: null,
      },
    ]
    const wrapper = makeWrapper()
    expect(wrapper.text()).toContain('Type 2 diabetes mellitus')
  })

  it('shows the empty state when there are no source codes', () => {
    const store = useConceptSetsStore()
    store.sourceCodeItems = []
    const wrapper = makeWrapper()
    expect(wrapper.text()).toContain('No source codes')
  })

  it('triggers resolveSourceCodes when activated', async () => {
    const store = useConceptSetsStore()
    const spy = vi.spyOn(store, 'resolveSourceCodes').mockResolvedValue()
    makeWrapper({ active: false })
    expect(spy).not.toHaveBeenCalled()

    const wrapper = makeWrapper({ active: true })
    await wrapper.vm.$nextTick()
    expect(spy).toHaveBeenCalledWith('SYNPUF1K')
  })

  it('renders an error alert with a retry button', () => {
    const store = useConceptSetsStore()
    store.sourceCodeError = 'Network error'
    const wrapper = makeWrapper()
    expect(wrapper.find('.stub-alert').exists()).toBe(true)
  })
})
