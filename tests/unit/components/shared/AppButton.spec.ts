/**
 * AppButton Component Tests
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AppButton from '@/components/shared/AppButton.vue'

const vuetify = createVuetify({ components, directives })

function mountComponent(options = {}) {
  return mount(AppButton, {
    global: {
      plugins: [vuetify]
    },
    ...options
  })
}

describe('AppButton', () => {
  it('should render v-btn', () => {
    const wrapper = mountComponent()

    expect(wrapper.findComponent({ name: 'VBtn' }).exists()).toBe(true)
  })

  it('should render slot content', () => {
    const wrapper = mountComponent({
      slots: {
        default: 'Click Me'
      }
    })

    expect(wrapper.text()).toContain('Click Me')
  })

  it('should pass through attrs to v-btn', () => {
    const wrapper = mountComponent({
      attrs: {
        color: 'primary',
        disabled: true
      }
    })

    const btn = wrapper.findComponent({ name: 'VBtn' })
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('should emit click event', async () => {
    const wrapper = mountComponent()

    await wrapper.findComponent({ name: 'VBtn' }).trigger('click')

    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
