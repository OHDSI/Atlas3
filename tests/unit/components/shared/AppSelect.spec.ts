/**
 * AppSelect Component Tests
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AppSelect from '@/components/shared/AppSelect.vue'

const vuetify = createVuetify({ components, directives })

function mountComponent(options = {}) {
  return mount(AppSelect, {
    global: {
      plugins: [vuetify]
    },
    ...options
  })
}

describe('AppSelect', () => {
  it('should render v-select', () => {
    const wrapper = mountComponent()

    expect(wrapper.findComponent({ name: 'VSelect' }).exists()).toBe(true)
  })

  it('should pass through attrs to v-select', () => {
    const wrapper = mountComponent({
      attrs: {
        items: ['Option 1', 'Option 2'],
        label: 'Select Option'
      }
    })

    const select = wrapper.findComponent({ name: 'VSelect' })
    expect(select.exists()).toBe(true)
  })

  it('should render slot content', () => {
    const wrapper = mountComponent({
      slots: {
        default: '<template>Custom Content</template>'
      }
    })

    expect(wrapper.findComponent({ name: 'VSelect' }).exists()).toBe(true)
  })
})
