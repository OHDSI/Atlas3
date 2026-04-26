import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import HighlightsPanel from '@/components/profile/HighlightsPanel.vue'
import { useProfileStore } from '@/stores/profile'
import { HIGHLIGHT_PALETTE } from '@/models/profile.types'

const vuetify = createVuetify({ components, directives })

const drawerStub = {
  template: '<div class="v-navigation-drawer"><slot /></div>',
  props: ['modelValue', 'location', 'permanent', 'width'],
}

function mountPanel() {
  return mount(HighlightsPanel, {
    global: {
      plugins: [vuetify],
      stubs: { VNavigationDrawer: drawerStub },
    },
  })
}

describe('HighlightsPanel', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('disables concept-sets tab when no cohort context', () => {
    useProfileStore()
    const w = mountPanel()
    expect(w.find('[data-test="highlights-tab-sets"]').attributes('disabled')).toBeDefined()
  })

  it('applies selected color to picked concepts', async () => {
    const s = useProfileStore()
    s.person = {
      gender: 'M', yearOfBirth: 1980, monthOfBirth: null, dayOfBirth: null,
      ageAtIndex: 40, recordCount: 1,
      records: [{ conceptId: 9, conceptName: 'Z', domain: 'Drug', startDate: 1, endDate: null, startDay: 0, endDay: null }],
      cohorts: [], observationPeriods: [],
    } as never
    const w = mountPanel()
    ;(w.vm as { onSelectionChange: (ids: number[]) => void }).onSelectionChange([9])
    await w.findAll('[data-test="highlight-swatch"]')[0]!.trigger('click')
    expect(s.highlights.get(9)).toBe(HIGHLIGHT_PALETTE[0])
  })
})
