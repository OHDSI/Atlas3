/**
 * The shared list-level import control (#267).
 */
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import EntityImportButton from '@/components/shared/EntityImportButton.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

function mountButton(props: Record<string, unknown> = {}) {
  return mount(EntityImportButton, {
    global: { plugins: [vuetify] },
    props: {
      label: 'Import',
      testid: 'thing-import',
      importDesign: vi.fn().mockResolvedValue({ id: 7 }),
      ...props,
    },
  })
}

/**
 * Drive the hidden input the way a file picker would. jsdom's FileReader
 * (used under the hood, since jsdom's File has no `.text()`) resolves over
 * two macrotask ticks, so this flushes twice.
 */
async function pick(wrapper: ReturnType<typeof mountButton>, name: string, text: string) {
  const input = wrapper.get('[data-testid="thing-import-input"]')
  const file = new File([text], name, { type: 'application/json' })
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
  await flushPromises()
  await flushPromises()
}

describe('EntityImportButton', () => {
  it('opens the file picker when the button is clicked', async () => {
    const wrapper = mountButton()
    const input = wrapper.get('[data-testid="thing-import-input"]')
    const click = vi.spyOn(input.element as HTMLInputElement, 'click')

    await wrapper.get('[data-testid="thing-import"]').trigger('click')

    expect(click).toHaveBeenCalled()
  })

  it('hands the parsed design and the file name to importDesign, then reports the entity', async () => {
    const importDesign = vi.fn().mockResolvedValue({ id: 42 })
    const wrapper = mountButton({ importDesign })

    await pick(wrapper, 'design.json', '{"name":"Statins"}')

    expect(importDesign).toHaveBeenCalledWith({ name: 'Statins' }, { fileName: 'design.json' })
    expect(wrapper.emitted('imported')?.[0]?.[0]).toEqual({ id: 42 })
  })

  it('reports a file that is not JSON without calling importDesign', async () => {
    const importDesign = vi.fn()
    const wrapper = mountButton({ importDesign })

    await pick(wrapper, 'notes.json', 'this is not json')

    expect(importDesign).not.toHaveBeenCalled()
    expect(wrapper.emitted('imported')).toBeUndefined()
    expect(wrapper.emitted('failed')?.[0]?.[0]).toContain('notes.json')
  })

  it('reports the reason when importDesign rejects', async () => {
    const importDesign = vi.fn().mockRejectedValue(new Error('Not a pathway design'))
    const wrapper = mountButton({ importDesign })

    await pick(wrapper, 'wrong.json', '{"a":1}')

    expect(wrapper.emitted('failed')?.[0]?.[0]).toBe('Not a pathway design')
  })

  it('clears the input so the same file can be picked again', async () => {
    const wrapper = mountButton()
    await pick(wrapper, 'design.json', '{"a":1}')

    expect((wrapper.get('[data-testid="thing-import-input"]').element as HTMLInputElement).value).toBe('')
  })

  it('does not open the picker while disabled', async () => {
    const wrapper = mountButton({ disabled: true })
    const input = wrapper.get('[data-testid="thing-import-input"]')
    const click = vi.spyOn(input.element as HTMLInputElement, 'click')

    await wrapper.get('[data-testid="thing-import"]').trigger('click')

    expect(click).not.toHaveBeenCalled()
  })
})
