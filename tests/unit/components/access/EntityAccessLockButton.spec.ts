/**
 * Component Tests: EntityAccessLockButton
 */

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import EntityAccessLockButton from '@/components/access/EntityAccessLockButton.vue'

const AtlasIconButtonStub = defineComponent({
  name: 'AtlasIconButton',
  props: {
    icon: { type: String, required: true },
    ariaLabel: { type: String, required: true },
    variant: { type: String, default: 'tonal' },
    size: { type: String, default: 'md' },
    tone: { type: String, default: 'neutral' },
    loading: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
  },
  emits: ['click'],
  template: '<button data-testid="atlas-icon-button-stub" @click="$emit(\'click\', $event)" />',
})

function mountComponent(props = {}) {
  return mount(EntityAccessLockButton, {
    props: {
      ariaLabel: 'Configure access',
      ...props,
    },
    global: {
      stubs: {
        AtlasIconButton: AtlasIconButtonStub,
      },
    },
  })
}

describe('EntityAccessLockButton', () => {
  it('passes the lock icon and tonal styling to AtlasIconButton', () => {
    const wrapper = mountComponent()

    const iconButton = wrapper.findComponent({ name: 'AtlasIconButton' })
    expect(iconButton.exists()).toBe(true)
    expect(iconButton.props('icon')).toBe('mdi-lock')
    expect(iconButton.props('variant')).toBe('text')
    expect(iconButton.props('size')).toBe('sm')
    expect(iconButton.props('ariaLabel')).toBe('Configure access')
  })

  it('emits click when the button is pressed', async () => {
    const wrapper = mountComponent()

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('click')).toBeTruthy()
    expect(wrapper.emitted('click')?.[0]?.[0]).toBeInstanceOf(MouseEvent)
  })
})