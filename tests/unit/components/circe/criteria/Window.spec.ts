import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, reactive } from 'vue'
import { InlineAtlasMenuStub, mountComponent } from '../../../../helpers/component-wrapper'

import Window from '@/components/circe/criteria/Window.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../../helpers/i18n-mock')
  return mockUseI18n
})

describe('Window', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('toggles anchors and edits the start and end day values', async () => {
    const window = reactive({
      Start: { Days: null, Coeff: -1 },
      End: { Days: null, Coeff: 1 },
      UseEventEnd: false,
      UseIndexEnd: false,
    })

    const wrapper = mountComponent(Window as never, {
      props: { window },
      stubs: { AtlasMenu: InlineAtlasMenuStub },
    })

    expect(wrapper.text()).toContain('Event starts')
    expect(wrapper.text()).toContain('Index starts')

    await wrapper.get('.window-editor__chip').trigger('click')
    await nextTick()
    expect(window.UseEventEnd).toBe(true)

    const startDaysChip = wrapper.findAll('.window-editor__chip')[1]
    await startDaysChip.trigger('click')
    await nextTick()
    const startDaysField = wrapper.findAllComponents({ name: 'AtlasTextField' })[0]
    await startDaysField.vm.$emit('update:modelValue', '2')
    await nextTick()
    expect(window.Start?.Days).toBe(2)
    expect(wrapper.text()).toContain('2 days')

    await wrapper.findAllComponents({ name: 'AtlasIcon' })[0].trigger('click')
    await nextTick()
    expect(window.Start?.Days).toBeNull()

    await wrapper.findAll('.window-editor__chip')[2].trigger('click')
    await nextTick()
    expect(window.Start?.Coeff).toBe(1)

    const endDaysChip = wrapper.findAll('.window-editor__chip')[3]
    await endDaysChip.trigger('click')
    await nextTick()
    const endDaysField = wrapper.findAllComponents({ name: 'AtlasTextField' })[1]
    await endDaysField.vm.$emit('update:modelValue', '5')
    await nextTick()
    expect(window.End?.Days).toBe(5)

    await endDaysField.trigger('blur')
    await nextTick()

    await wrapper.findAll('.window-editor__chip')[4].trigger('click')
    await nextTick()
    expect(window.End?.Coeff).toBe(-1)

    await wrapper.findAll('.window-editor__chip')[5].trigger('click')
    await nextTick()
    expect(window.UseIndexEnd).toBe(true)
  })

  it('creates missing endpoints when a side is unset', async () => {
    const window = reactive({
      UseEventEnd: false,
      UseIndexEnd: false,
    }) as any

    const wrapper = mountComponent(Window as never, {
      props: { window },
      stubs: { AtlasMenu: InlineAtlasMenuStub },
    })

    await wrapper.findAll('.window-editor__chip')[1].trigger('click')
    await nextTick()
    await wrapper.findAllComponents({ name: 'AtlasTextField' })[0].vm.$emit('update:modelValue', '3')
    await nextTick()
    expect(window.Start).toStrictEqual({ Days: 3, Coeff: -1 })

    await wrapper.findAll('.window-editor__chip')[3].trigger('click')
    await nextTick()
    await wrapper.findAllComponents({ name: 'AtlasTextField' })[1].vm.$emit('update:modelValue', '9')
    await nextTick()
    expect(window.End).toStrictEqual({ Days: 9, Coeff: 1 })
  })
})
