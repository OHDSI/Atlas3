/**
 * The any-of / not-any-of toggle used to render only when `IsExclusion` was
 * already set, and `toggleExclude` early-returned under the same condition. Since
 * `IsExclusion` is nullish in the schema and nothing backfills it, a selection
 * loaded as `{ "CodesetId": 3 }` — valid circe — could never be switched to
 * "not any of" at all.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ConceptSetSelection from '@/components/cohort-editor/input/ConceptSetSelection.vue'
import type { ConceptSetSelection as Selection } from '@/components/cohort-editor/circe.types'

const vuetify = createVuetify({ components, directives })

function mountSelection(modelValue: Selection) {
  return mount(ConceptSetSelection, {
    global: { plugins: [vuetify, createPinia()], stubs: { EventConceptSet: true } },
    props: { modelValue, conceptSets: [] },
  })
}

const chip = (wrapper: ReturnType<typeof mountSelection>) =>
  wrapper.find('.concept-set-selection__exclude-chip')

describe('ConceptSetSelection exclusion toggle', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('offers the toggle on a selection that carries only a CodesetId', () => {
    const wrapper = mountSelection({ CodesetId: 3 })

    expect(chip(wrapper).exists()).toBe(true)
    expect(chip(wrapper).text()).toBe('any of')
  })

  it('switches an unset selection to excluded rather than ignoring the click', async () => {
    const modelValue: Selection = { CodesetId: 3 }
    const wrapper = mountSelection(modelValue)

    await chip(wrapper).trigger('click')

    expect(modelValue.IsExclusion).toBe(true)
    expect(chip(wrapper).text()).toBe('not any of')
  })

  it('switches back off again', async () => {
    const modelValue: Selection = { CodesetId: 3, IsExclusion: true }
    const wrapper = mountSelection(modelValue)

    await chip(wrapper).trigger('click')

    expect(modelValue.IsExclusion).toBe(false)
    expect(chip(wrapper).text()).toBe('any of')
  })

  it('reads an explicit null as not excluded, the same as unset', () => {
    const wrapper = mountSelection({ CodesetId: 3, IsExclusion: null })

    expect(chip(wrapper).text()).toBe('any of')
  })
})
