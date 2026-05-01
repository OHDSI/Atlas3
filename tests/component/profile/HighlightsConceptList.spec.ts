import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import HighlightsConceptList from '@/components/profile/HighlightsConceptList.vue'
import { useProfileStore } from '@/stores/profile'
import { HIGHLIGHT_PALETTE } from '@/models/profile.types'

const vuetify = createVuetify({ components, directives })

function seedTwoConcepts() {
  const s = useProfileStore()
  s.person = {
    gender: 'M', yearOfBirth: 1980, monthOfBirth: null, dayOfBirth: null,
    ageAtIndex: 40, recordCount: 3,
    records: [
      { conceptId: 1, conceptName: 'A', domain: 'Drug', startDate: 1, endDate: null, startDay: 0, endDay: null },
      { conceptId: 1, conceptName: 'A', domain: 'Drug', startDate: 1, endDate: null, startDay: 1, endDay: null },
      { conceptId: 7, conceptName: 'Z', domain: 'Drug', startDate: 1, endDate: null, startDay: 2, endDay: null },
    ],
    cohorts: [], observationPeriods: [],
  } as never
  return s
}

describe('HighlightsConceptList', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders one row per unique concept with a color dot', () => {
    seedTwoConcepts()
    const w = mount(HighlightsConceptList, { global: { plugins: [vuetify] } })
    expect(w.text()).toContain('A')
    expect(w.text()).toContain('Z')
    expect(w.find('[data-test="highlight-color-dot-1"]').exists()).toBe(true)
    expect(w.find('[data-test="highlight-color-dot-7"]').exists()).toBe(true)
  })

  it('clicking a palette swatch applies that color to the concept', async () => {
    const s = seedTwoConcepts()
    const color = HIGHLIGHT_PALETTE[0]
    const w = mount(HighlightsConceptList, {
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })
    await w.find('[data-test="highlight-color-dot-7"]').trigger('click')
    await flushPromises()
    // v-menu renders into the document body via v-overlay; query the
    // global document, not the wrapper, to find the swatch.
    const swatch = document.querySelector(`[data-test="highlight-color-swatch-${color}"]`) as HTMLButtonElement | null
    expect(swatch).not.toBeNull()
    swatch!.click()
    await flushPromises()
    expect(s.highlights.get(7)).toBe(color)
    w.unmount()
  })

  it('clicking the None swatch clears the highlight for the concept', async () => {
    const s = seedTwoConcepts()
    s.applyHighlight([7], HIGHLIGHT_PALETTE[0])
    expect(s.highlights.get(7)).toBe(HIGHLIGHT_PALETTE[0])
    const w = mount(HighlightsConceptList, {
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })
    await w.find('[data-test="highlight-color-dot-7"]').trigger('click')
    await flushPromises()
    const noneSwatch = document.querySelector('[data-test="highlight-color-swatch-none"]') as HTMLButtonElement | null
    expect(noneSwatch).not.toBeNull()
    noneSwatch!.click()
    await flushPromises()
    // applyHighlight(ids, 'none') deletes the entry from the map.
    expect(s.highlights.has(7)).toBe(false)
    w.unmount()
  })
})
