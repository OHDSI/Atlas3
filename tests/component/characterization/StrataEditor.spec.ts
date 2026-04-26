/**
 * StrataEditor component tests
 *
 * Confirm add/remove flows emit updates and that JSON parse errors surface
 * inline as a chip. The full criteria-builder integration is deferred —
 * here we only validate the JSON-textarea fallback.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import StrataEditor from '@/components/characterization/StrataEditor.vue'
import type { Stratum } from '@/models/characterization.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

function mountEditor(initial: Stratum[] = []) {
  return mount(StrataEditor, {
    props: {
      modelValue: initial,
      'onUpdate:modelValue': (value: Stratum[]) => {
        wrapper.setProps({ modelValue: value })
      },
    },
    global: { plugins: [vuetify] },
  })
}

let wrapper: ReturnType<typeof mountEditor>

describe('StrataEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty placeholder when no strata are provided', () => {
    wrapper = mountEditor([])
    expect(wrapper.find('[data-testid="strata-editor-empty"]').exists()).toBe(true)
  })

  it('emits a new stratum with a UUID id when Add is clicked', async () => {
    wrapper = mountEditor([])

    await wrapper.get('[data-testid="strata-editor-add"]').trigger('click')
    await flushPromises()

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    const next = emitted![0]![0] as Stratum[]
    expect(next).toHaveLength(1)
    expect(typeof next[0]!.id).toBe('string')
    expect(next[0]!.id.length).toBeGreaterThan(0)
    expect(next[0]!.name).toBe('')
    expect(next[0]!.criteria).toEqual({})
  })

  it('removing a stratum filters it out of the modelValue', async () => {
    const initial: Stratum[] = [
      { id: 'a', name: 'A', criteria: {} },
      { id: 'b', name: 'B', criteria: {} },
    ]
    wrapper = mountEditor(initial)

    await wrapper.get('[data-testid="strata-editor-remove-0"]').trigger('click')
    await flushPromises()

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    const next = emitted![0]![0] as Stratum[]
    expect(next).toHaveLength(1)
    expect(next[0]!.id).toBe('b')
  })

  it('surfaces an inline invalid-JSON chip when criteria parsing fails', async () => {
    const initial: Stratum[] = [{ id: 'a', name: 'A', criteria: {} }]
    wrapper = mountEditor(initial)

    const textarea = wrapper.get('[data-testid="strata-editor-criteria-0"] textarea')
    await textarea.setValue('{ not valid json')
    await flushPromises()

    expect(wrapper.find('[data-testid="strata-editor-invalid-0"]').exists()).toBe(true)
  })

  it('does not emit update on invalid JSON, but does on valid JSON', async () => {
    const initial: Stratum[] = [{ id: 'a', name: 'A', criteria: {} }]
    wrapper = mountEditor(initial)

    const textarea = wrapper.get('[data-testid="strata-editor-criteria-0"] textarea')

    await textarea.setValue('{ broken')
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    await textarea.setValue('{"foo": 1}')
    await flushPromises()
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    const next = emitted![0]![0] as Stratum[]
    expect(next[0]!.criteria).toEqual({ foo: 1 })
  })
})
