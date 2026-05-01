import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import type { ConceptSetListItem } from '@/models/concept-set.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/services/concept-set.service', () => ({
  getAllConceptSets: vi.fn().mockResolvedValue([]),
  getConceptSetById: vi.fn().mockResolvedValue(null),
  createConceptSet: vi.fn().mockResolvedValue(null),
  updateConceptSet: vi.fn().mockResolvedValue(null),
  deleteConceptSet: vi.fn().mockResolvedValue(false),
}))

import ConceptSetChooserDialog from '@/components/concepts/ConceptSetChooserDialog.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

const sampleSets: ConceptSetListItem[] = [
  { id: 1, name: 'Diabetes Conditions', createdBy: 'alice' },
  { id: 5, name: 'Hypertension Drugs', createdBy: { id: 2, name: null, login: 'bob' } },
  { id: 9, name: 'Asthma Concepts', createdBy: 'carol' },
]

function makeWrapper(opts: { modelValue?: boolean; excludeId?: number | string; sets?: ConceptSetListItem[] } = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useConceptSetsStore()
  store.conceptSets = opts.sets ?? sampleSets

  const wrapper = mount(ConceptSetChooserDialog, {
    global: { plugins: [vuetify, pinia] },
    attachTo: document.body,
    props: {
      modelValue: opts.modelValue ?? true,
      ...(opts.excludeId !== undefined ? { excludeId: opts.excludeId } : {}),
    },
  })
  return { wrapper, store }
}

describe('ConceptSetChooserDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('renders all rows when the store is seeded with three concept sets', async () => {
    makeWrapper()
    await flushPromises()

    expect(document.body.querySelector('[data-testid="chooser-row-1"]')).not.toBeNull()
    expect(document.body.querySelector('[data-testid="chooser-row-5"]')).not.toBeNull()
    expect(document.body.querySelector('[data-testid="chooser-row-9"]')).not.toBeNull()
  })

  it('hides the row whose id matches excludeId', async () => {
    makeWrapper({ excludeId: 5 })
    await flushPromises()

    expect(document.body.querySelector('[data-testid="chooser-row-1"]')).not.toBeNull()
    expect(document.body.querySelector('[data-testid="chooser-row-5"]')).toBeNull()
    expect(document.body.querySelector('[data-testid="chooser-row-9"]')).not.toBeNull()
  })

  it('filters rows by case-insensitive name substring as the user types', async () => {
    makeWrapper()
    await flushPromises()

    const search = document.body.querySelector('[data-testid="chooser-search"] input') as HTMLInputElement
    expect(search).not.toBeNull()
    search.value = 'diab'
    search.dispatchEvent(new Event('input'))
    await flushPromises()

    expect(document.body.querySelector('[data-testid="chooser-row-1"]')).not.toBeNull()
    expect(document.body.querySelector('[data-testid="chooser-row-5"]')).toBeNull()
    expect(document.body.querySelector('[data-testid="chooser-row-9"]')).toBeNull()
  })

  it('emits select with the row id and closes when the row Select button is clicked', async () => {
    const { wrapper } = makeWrapper()
    await flushPromises()

    const selectBtn = document.body.querySelector('[data-testid="chooser-select-9"]') as HTMLButtonElement
    expect(selectBtn).not.toBeNull()
    selectBtn.click()
    await flushPromises()

    const selected = wrapper.emitted('select')
    expect(selected).toBeTruthy()
    expect(selected![0]).toEqual([9])

    const closed = wrapper.emitted('update:modelValue')
    expect(closed).toBeTruthy()
    expect(closed![closed!.length - 1]).toEqual([false])
  })

  it('renders the empty-state element when the filter matches nothing', async () => {
    makeWrapper()
    await flushPromises()

    const search = document.body.querySelector('[data-testid="chooser-search"] input') as HTMLInputElement
    search.value = 'zzznothingmatches'
    search.dispatchEvent(new Event('input'))
    await flushPromises()

    expect(document.body.querySelector('[data-testid="chooser-empty"]')).not.toBeNull()
  })
})

