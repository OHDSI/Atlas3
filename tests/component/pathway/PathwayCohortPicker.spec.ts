import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import PathwayCohortPicker from '@/components/pathway/PathwayCohortPicker.vue'

const vuetify = createVuetify({ components, directives })

vi.mock('@/services/cohort-definition.service', () => ({
  getCohorts: vi.fn().mockResolvedValue({
    success: true,
    data: [
      { id: 1, name: 'Diabetics' },
      { id: 2, name: 'Cardio' },
    ],
  }),
}))

describe('PathwayCohortPicker', () => {
  beforeEach(() => {
    // Pinia is required by useI18n() inside the component tree.
    setActivePinia(createPinia())
  })

  it('emits select with chosen cohort refs', async () => {
    const w = mount(PathwayCohortPicker, {
      props: { modelValue: true, excludedIds: [] },
      global: { plugins: [vuetify] },
    })
    await new Promise(r => setTimeout(r, 0))
    const exposed = w.vm as unknown as {
      confirmSelection: (sel: { id: number; name: string }[]) => void
    }
    exposed.confirmSelection([{ id: 2, name: 'Cardio' }])
    expect(w.emitted('select')).toBeTruthy()
    expect(w.emitted('select')![0][0]).toEqual([{ id: 2, name: 'Cardio' }])
  })
})
