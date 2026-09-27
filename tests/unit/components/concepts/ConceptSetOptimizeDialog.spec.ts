import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ConceptSetOptimizeDialog from '@/components/concepts/ConceptSetOptimizeDialog.vue'
import { optimizeConceptSet } from '@/services/concept-set.service'
import type { ConceptSetItem } from '@/models/concept-set.types'

vi.mock('@/services/concept-set.service', () => ({
  optimizeConceptSet: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const vuetify = createVuetify({ components, directives })

const item = (conceptId: number, name: string, flags: Partial<ConceptSetItem> = {}): ConceptSetItem => ({
  conceptId,
  conceptName: name,
  conceptCode: String(conceptId),
  domainId: 'Condition',
  vocabularyId: 'SNOMED',
  conceptClassId: 'Clinical Finding',
  standardConcept: 'S',
  invalidReason: null,
  isExcluded: false,
  includeDescendants: false,
  includeMapped: false,
  ...flags,
})

const parent = item(201820, 'Diabetes mellitus', { includeDescendants: true })
const child = item(201826, 'Type 2 diabetes mellitus')

function factory(props: Record<string, unknown> = {}) {
  return mount(ConceptSetOptimizeDialog, {
    props: {
      modelValue: true,
      items: [parent, child],
      sourceKey: 'SYNPUF1K',
      conceptSetName: 'Diabetes',
      canCreateNew: true,
      ...props,
    },
    global: {
      plugins: [vuetify],
      stubs: { AtlasDialog: { template: '<div><slot /><slot name="actions" /></div>' } },
    },
  })
}

describe('ConceptSetOptimizeDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('optimizes on open and shows the optimized and removed items', async () => {
    vi.mocked(optimizeConceptSet).mockResolvedValue({ optimizedItems: [parent], removedItems: [child] })
    const w = factory()
    expect(w.find('[data-testid="cs-optimize-loading"]').exists()).toBe(true)
    await flushPromises()

    expect(optimizeConceptSet).toHaveBeenCalledWith('SYNPUF1K', [parent, child])
    expect(w.find('[data-testid="cs-optimize-optimized"]').text()).toContain('Diabetes mellitus')
    expect(w.find('[data-testid="cs-optimize-removed"]').text()).toContain('Type 2 diabetes mellitus')
  })

  it('says the set is already optimal when nothing was removed', async () => {
    vi.mocked(optimizeConceptSet).mockResolvedValue({ optimizedItems: [parent, child], removedItems: [] })
    const w = factory()
    await flushPromises()

    expect(w.find('[data-testid="cs-optimize-optimal"]').exists()).toBe(true)
    expect(w.find('[data-testid="cs-optimize-overwrite"]').exists()).toBe(false)
  })

  it('shows the error and retries', async () => {
    vi.mocked(optimizeConceptSet)
      .mockRejectedValueOnce(new Error('HTTP 500: optimizer down'))
      .mockResolvedValueOnce({ optimizedItems: [parent], removedItems: [child] })
    const w = factory()
    await flushPromises()

    expect(w.find('[data-testid="cs-optimize-error"]').text()).toContain('optimizer down')

    await w.findAll('button').find(b => b.text() === 'Retry')!.trigger('click')
    await flushPromises()

    expect(w.find('[data-testid="cs-optimize-removed"]').exists()).toBe(true)
  })

  it('emits the optimized items to overwrite the current set', async () => {
    vi.mocked(optimizeConceptSet).mockResolvedValue({ optimizedItems: [parent], removedItems: [child] })
    const w = factory()
    await flushPromises()

    await w.find('[data-testid="cs-optimize-overwrite"]').trigger('click')

    expect(w.emitted('overwrite')).toEqual([[[parent]]])
  })

  it('asks for a name, suggesting the ATLAS 2 default, before creating a new set', async () => {
    vi.mocked(optimizeConceptSet).mockResolvedValue({ optimizedItems: [parent], removedItems: [child] })
    const w = factory()
    await flushPromises()

    await w.find('[data-testid="cs-optimize-create"]').trigger('click')
    const input = w.find('[data-testid="cs-optimize-new-name"] input')
    expect((input.element as HTMLInputElement).value).toBe('Diabetes - OPTIMIZED')

    await input.setValue('Diabetes (optimized)')
    await w.find('[data-testid="cs-optimize-save-new"]').trigger('click')

    expect(w.emitted('create')).toEqual([[{ name: 'Diabetes (optimized)', items: [parent] }]])
  })

  it('offers only overwrite when creating a new set is not allowed', async () => {
    vi.mocked(optimizeConceptSet).mockResolvedValue({ optimizedItems: [parent], removedItems: [child] })
    const w = factory({ canCreateNew: false })
    await flushPromises()

    expect(w.find('[data-testid="cs-optimize-create"]').exists()).toBe(false)
    expect(w.find('[data-testid="cs-optimize-overwrite"]').exists()).toBe(true)
  })
})
