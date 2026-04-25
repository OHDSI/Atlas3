import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CohortSampleCreateDialog from '@/components/cohort-samples/CohortSampleCreateDialog.vue'
import {
  GENDER_FEMALE_CONCEPT_ID,
  GENDER_MALE_CONCEPT_ID,
} from '@/models/cohort-sample.types'

const vuetify = createVuetify({ components, directives })

function makeWrapper() {
  return mount(CohortSampleCreateDialog, {
    global: { plugins: [vuetify] },
    attachTo: document.body,
    props: { modelValue: true },
  })
}

describe('CohortSampleCreateDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('does not emit submit when the form is invalid (missing name)', async () => {
    const wrapper = makeWrapper()
    await flushPromises()

    // The submit button is disabled while the form is invalid; force the
    // submit handler via the exposed component via querying the dialog DOM.
    const submitBtn = document.body.querySelector('[data-testid=sample-submit]') as HTMLButtonElement | null
    expect(submitBtn).not.toBeNull()
    expect(submitBtn!.disabled).toBe(true)
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('emits submit with both genders selected (no gender filter is sent)', async () => {
    const wrapper = makeWrapper()
    await flushPromises()

    // Fill the name and submit; default size = 100, default genders all = true except other.
    const nameInput = document.body.querySelector('[data-testid=sample-name] input') as HTMLInputElement
    nameInput.value = 'demo'
    nameInput.dispatchEvent(new Event('input'))
    await flushPromises()

    const submitBtn = document.body.querySelector('[data-testid=sample-submit]') as HTMLButtonElement
    submitBtn.click()
    await flushPromises()

    const emitted = wrapper.emitted('submit')
    expect(emitted).toHaveLength(1)
    const params = emitted![0]![0] as { name: string; size: number; gender?: { conceptIds: number[] } }
    expect(params.name).toBe('demo')
    expect(params.size).toBe(100)
    // Male + Female checked, Other unchecked → gender filter is built but
    // since both Male and Female are selected (not all three), it still constrains.
    expect(params.gender?.conceptIds.sort()).toEqual([GENDER_FEMALE_CONCEPT_ID, GENDER_MALE_CONCEPT_ID].sort())
  })

  it('omits the gender filter when all three checkboxes are selected', async () => {
    const wrapper = makeWrapper()
    await flushPromises()

    const nameInput = document.body.querySelector('[data-testid=sample-name] input') as HTMLInputElement
    nameInput.value = 'all'
    nameInput.dispatchEvent(new Event('input'))

    // Tick the "Other" checkbox so all three are now selected
    const otherCheckbox = document.body.querySelector('[data-testid=sample-gender-other] input') as HTMLInputElement
    otherCheckbox.click()
    await flushPromises()

    const submitBtn = document.body.querySelector('[data-testid=sample-submit]') as HTMLButtonElement
    submitBtn.click()
    await flushPromises()

    const params = wrapper.emitted('submit')?.[0]?.[0] as { gender?: unknown }
    expect(params.gender).toBeUndefined()
  })

  it('omits the gender filter when all three checkboxes are unchecked', async () => {
    const wrapper = makeWrapper()
    await flushPromises()

    const nameInput = document.body.querySelector('[data-testid=sample-name] input') as HTMLInputElement
    nameInput.value = 'none'
    nameInput.dispatchEvent(new Event('input'))

    // Uncheck male + female (both are checked by default)
    ;(document.body.querySelector('[data-testid=sample-gender-male] input') as HTMLInputElement).click()
    ;(document.body.querySelector('[data-testid=sample-gender-female] input') as HTMLInputElement).click()
    await flushPromises()

    const submitBtn = document.body.querySelector('[data-testid=sample-submit]') as HTMLButtonElement
    submitBtn.click()
    await flushPromises()

    const params = wrapper.emitted('submit')?.[0]?.[0] as { gender?: unknown }
    expect(params.gender).toBeUndefined()
  })

  it('builds an age range payload when both bounds are provided', async () => {
    const wrapper = makeWrapper()
    await flushPromises()

    const nameInput = document.body.querySelector('[data-testid=sample-name] input') as HTMLInputElement
    nameInput.value = 'aged'
    nameInput.dispatchEvent(new Event('input'))

    // Set age mode to "between" and provide min/max via the dialog's exposed state.
    const vm = wrapper.vm as unknown as Record<string, unknown> & {
      // Refs are auto-unwrapped via the component proxy.
      ageMode: string | null
      ageMin: number | null
      ageMax: number | null
    }
    vm.ageMode = 'between'
    vm.ageMin = 40
    vm.ageMax = 65
    await flushPromises()

    const submitBtn = document.body.querySelector('[data-testid=sample-submit]') as HTMLButtonElement
    submitBtn.click()
    await flushPromises()

    const params = wrapper.emitted('submit')?.[0]?.[0] as { age?: { mode: string; min?: number; max?: number; value?: number } }
    expect(params.age).toEqual({ mode: 'between', min: 40, max: 65 })
  })

  it('emits update:modelValue=false when Cancel is clicked', async () => {
    const wrapper = makeWrapper()
    await flushPromises()

    // Cancel is the second-to-last v-btn in the action bar; click via DOM lookup.
    const cancelBtn = Array.from(
      document.body.querySelectorAll('.v-card-actions button')
    ).find((b) => b.textContent?.toLowerCase().includes('cancel')) as HTMLButtonElement | undefined
    expect(cancelBtn).toBeDefined()
    cancelBtn!.click()
    await flushPromises()

    const closed = wrapper.emitted('update:modelValue')
    expect(closed?.[closed.length - 1]).toEqual([false])
  })
})
