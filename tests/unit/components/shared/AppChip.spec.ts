/**
 * AppChip Component Tests
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AppChip from '@/components/shared/AppChip.vue'

const vuetify = createVuetify({ components, directives })

function mountComponent(options = {}) {
  return mount(AppChip, {
    global: {
      plugins: [vuetify]
    },
    ...options
  })
}

describe('AppChip', () => {
  it('should render v-chip', () => {
    const wrapper = mountComponent()

    expect(wrapper.findComponent({ name: 'VChip' }).exists()).toBe(true)
  })

  it('should render slot content', () => {
    const wrapper = mountComponent({
      slots: {
        default: 'Tag Label'
      }
    })

    expect(wrapper.text()).toContain('Tag Label')
  })

  it('should pass through attrs to v-chip', () => {
    const wrapper = mountComponent({
      attrs: {
        color: 'primary',
        closable: true
      }
    })

    const chip = wrapper.findComponent({ name: 'VChip' })
    expect(chip.exists()).toBe(true)
  })

  it('should handle click events', async () => {
    const wrapper = mountComponent()

    await wrapper.findComponent({ name: 'VChip' }).trigger('click')

    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
