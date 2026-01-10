/**
 * LicenseAgreementDialog Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref, nextTick } from 'vue'
import LicenseAgreementDialog from '@/components/shared/LicenseAgreementDialog.vue'

// Mock useI18n composable
vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback: string) => ref(fallback)
  })
}))

const vuetify = createVuetify({ components, directives })

let wrapper: VueWrapper | null = null

function mountComponent(options = {}) {
  wrapper = mount(LicenseAgreementDialog, {
    global: {
      plugins: [vuetify]
    },
    attachTo: document.body,
    ...options
  })
  return wrapper
}

describe('LicenseAgreementDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
      wrapper = null
    }
  })

  describe('Component Rendering', () => {
    it('should render v-dialog component', () => {
      const wrapper = mountComponent({
        props: {
          modelValue: true
        }
      })

      expect(wrapper.findComponent({ name: 'VDialog' }).exists()).toBe(true)
    })

    it('should not display dialog when modelValue is false', () => {
      const wrapper = mountComponent({
        props: {
          modelValue: false
        }
      })

      const dialog = wrapper.findComponent({ name: 'VDialog' })
      expect(dialog.props('modelValue')).toBe(false)
    })

    it('should display dialog when modelValue is true', () => {
      const wrapper = mountComponent({
        props: {
          modelValue: true
        }
      })

      const dialog = wrapper.findComponent({ name: 'VDialog' })
      expect(dialog.props('modelValue')).toBe(true)
    })

    it('should render dialog with correct max-width', () => {
      const wrapper = mountComponent({
        props: {
          modelValue: true
        }
      })

      const dialog = wrapper.findComponent({ name: 'VDialog' })
      expect(dialog.props('maxWidth')).toBe('900px')
    })

    it('should render dialog as persistent', () => {
      const wrapper = mountComponent({
        props: {
          modelValue: true
        }
      })

      const dialog = wrapper.findComponent({ name: 'VDialog' })
      expect(dialog.props('persistent')).toBe(true)
    })

    it('should render dialog as scrollable', () => {
      const wrapper = mountComponent({
        props: {
          modelValue: true
        }
      })

      const dialog = wrapper.findComponent({ name: 'VDialog' })
      expect(dialog.props('scrollable')).toBe(true)
    })
  })

  describe('Content Rendering', () => {
    it('should render card with title', async () => {
      const _wrapper = mountComponent({
        props: {
          modelValue: true
        }
      })

      await nextTick()
      const html = document.body.innerHTML
      expect(html).toContain('License Agreement')
    })

    it('should render SNOMED license section in HTML', async () => {
      const _wrapper = mountComponent({
        props: {
          modelValue: true
        }
      })

      await nextTick()
      const html = document.body.innerHTML
      expect(html).toContain('SNOMED INTERNATIONAL SNOMED CT LICENSE AGREEMENT')
      expect(html).toContain('SNOMED International SNOMED CT Browser')
    })

    it('should render HemOnc license section in HTML', async () => {
      const _wrapper = mountComponent({
        props: {
          modelValue: true
        }
      })

      await nextTick()
      const html = document.body.innerHTML
      expect(html).toContain('HemOnc license agreement')
      expect(html).toContain('HemOnc.org LLC')
    })

    it('should render external links in SNOMED section', async () => {
      const _wrapper = mountComponent({
        props: {
          modelValue: true
        }
      })

      await nextTick()
      const html = document.body.innerHTML
      expect(html).toContain('href="http://www.snomed.org"')
      expect(html).toContain('target="_blank"')
      expect(html).toContain('rel="noopener noreferrer"')
    })

    it('should render external links in HemOnc section', async () => {
      const _wrapper = mountComponent({
        props: {
          modelValue: true
        }
      })

      await nextTick()
      const html = document.body.innerHTML
      expect(html).toContain('href="mailto:licensing@hemonc.org"')
    })

    it('should render Accept button', () => {
      const wrapper = mountComponent({
        props: {
          modelValue: true
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const acceptButton = buttons.find(btn => btn.text().includes('Accept'))
      expect(acceptButton).toBeDefined()
      expect(acceptButton?.props('color')).toBe('primary')
      expect(acceptButton?.props('variant')).toBe('elevated')
    })

    it('should render Reject button', () => {
      const wrapper = mountComponent({
        props: {
          modelValue: true
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const rejectButton = buttons.find(btn => btn.text().includes('Reject'))
      expect(rejectButton).toBeDefined()
      expect(rejectButton?.props('color')).toBe('error')
      expect(rejectButton?.props('variant')).toBe('text')
    })
  })

  describe('User Interactions', () => {
    it('should emit accept event when Accept button is clicked', async () => {
      const wrapper = mountComponent({
        props: {
          modelValue: true
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const acceptButton = buttons.find(btn => btn.text().includes('Accept'))

      await acceptButton?.trigger('click')

      expect(wrapper.emitted('accept')).toBeTruthy()
      expect(wrapper.emitted('accept')?.[0]).toEqual([])
    })

    it('should emit update:modelValue with false when Accept button is clicked', async () => {
      const wrapper = mountComponent({
        props: {
          modelValue: true
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const acceptButton = buttons.find(btn => btn.text().includes('Accept'))

      await acceptButton?.trigger('click')

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
    })

    it('should emit reject event when Reject button is clicked', async () => {
      const wrapper = mountComponent({
        props: {
          modelValue: true
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const rejectButton = buttons.find(btn => btn.text().includes('Reject'))

      await rejectButton?.trigger('click')

      expect(wrapper.emitted('reject')).toBeTruthy()
      expect(wrapper.emitted('reject')?.[0]).toEqual([])
    })

    it('should not emit update:modelValue when Reject button is clicked', async () => {
      const wrapper = mountComponent({
        props: {
          modelValue: true
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const rejectButton = buttons.find(btn => btn.text().includes('Reject'))

      await rejectButton?.trigger('click')

      // Only reject should be emitted, not update:modelValue
      expect(wrapper.emitted('reject')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })
  })

  describe('Props and Computed Properties', () => {
    it('should update showDialog computed property when modelValue changes', async () => {
      const wrapper = mountComponent({
        props: {
          modelValue: false
        }
      })

      expect(wrapper.findComponent({ name: 'VDialog' }).props('modelValue')).toBe(false)

      await wrapper.setProps({ modelValue: true })

      expect(wrapper.findComponent({ name: 'VDialog' }).props('modelValue')).toBe(true)
    })

    it('should emit update:modelValue when dialog is closed via v-model', async () => {
      const wrapper = mountComponent({
        props: {
          modelValue: true
        }
      })

      const dialog = wrapper.findComponent({ name: 'VDialog' })
      await dialog.vm.$emit('update:modelValue', false)

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      const _wrapper = mountComponent({
        props: {
          modelValue: true
        }
      })

      await nextTick()
      const html = document.body.innerHTML
      expect(html).toContain('<h2')
      expect(html).toContain('SNOMED')
    })

    it('should have descriptive button text', async () => {
      const _wrapper = mountComponent({
        props: {
          modelValue: true
        }
      })

      await nextTick()
      const html = document.body.innerHTML
      expect(html).toContain('Accept')
      expect(html).toContain('Reject')
    })

    it('should have proper link attributes for security', async () => {
      const _wrapper = mountComponent({
        props: {
          modelValue: true
        }
      })

      await nextTick()
      const html = document.body.innerHTML
      const hasSecureLinks = html.includes('target="_blank"') && html.includes('rel="noopener noreferrer"')
      expect(hasSecureLinks).toBe(true)
    })
  })
})
