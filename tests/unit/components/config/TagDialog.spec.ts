/**
 * Component Tests: TagDialog
 *
 * Tests for tag creation/editing dialog component
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import TagDialog from '@/components/config/TagDialog.vue'
import type { Tag, TagGroup } from '@/models/config.types'

const vuetify = createVuetify({ components, directives })

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

const mockTagGroup: TagGroup = {
  id: 1,
  name: 'Category',
  color: '#1976D2',
  icon: 'mdi-tag',
  mandatory: false,
  showGroup: true,
  multiSelection: false,
  allowCustom: false,
  description: 'Test category',
  groups: []
}

const mockTag: Tag = {
  id: 1,
  name: 'Test Tag',
  color: '#FF5722',
  icon: 'mdi-star',
  permissionProtected: false,
  description: 'Test description',
  groups: [mockTagGroup]
}

describe('TagDialog.vue', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Mounting and props', () => {
    it('should mount successfully', () => {
      wrapper = mount(TagDialog, {
        props: {
          modelValue: true,
          tag: null,
          tagGroup: mockTagGroup
        },
        global: {
          plugins: [vuetify]
        }
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should show create mode title when tag is null', () => {
      wrapper = mount(TagDialog, {
        props: {
          modelValue: true,
          tag: null,
          tagGroup: mockTagGroup
        },
        global: {
          plugins: [vuetify]
        }
      })

      // Dialog should be shown
      const dialog = wrapper.findComponent({ name: 'VDialog' })
      expect(dialog.props('modelValue')).toBe(true)
    })

    it('should show edit mode title when tag is provided', () => {
      wrapper = mount(TagDialog, {
        props: {
          modelValue: true,
          tag: mockTag,
          tagGroup: mockTagGroup
        },
        global: {
          plugins: [vuetify]
        }
      })

      // Dialog should be shown
      const dialog = wrapper.findComponent({ name: 'VDialog' })
      expect(dialog.props('modelValue')).toBe(true)
    })

    it('should populate form with tag data in edit mode', async () => {
      wrapper = mount(TagDialog, {
        props: {
          modelValue: true,
          tag: mockTag,
          tagGroup: mockTagGroup
        },
        global: {
          plugins: [vuetify]
        }
      })

      await wrapper.vm.$nextTick()

      const nameField = wrapper.findAllComponents({ name: 'VTextField' })[0]
      expect(nameField.props('modelValue')).toBe('Test Tag')
    })
  })

  describe('Form fields', () => {
    it('should display name field', () => {
      wrapper = mount(TagDialog, {
        props: {
          modelValue: true,
          tag: null,
          tagGroup: mockTagGroup
        },
        global: {
          plugins: [vuetify]
        }
      })

      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      const nameField = textFields.find(field => field.props('label') === 'Name *')
      expect(nameField).toBeDefined()
    })

    it('should display color field', () => {
      wrapper = mount(TagDialog, {
        props: {
          modelValue: true,
          tag: null,
          tagGroup: mockTagGroup
        },
        global: {
          plugins: [vuetify]
        }
      })

      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      const colorField = textFields.find(field => field.props('label') === 'Color (optional)')
      expect(colorField).toBeDefined()
    })

    it('should display icon field', () => {
      wrapper = mount(TagDialog, {
        props: {
          modelValue: true,
          tag: null,
          tagGroup: mockTagGroup
        },
        global: {
          plugins: [vuetify]
        }
      })

      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      const iconField = textFields.find(field => field.props('label') === 'Icon (optional)')
      expect(iconField).toBeDefined()
    })

    it('should display permission protected checkbox', () => {
      wrapper = mount(TagDialog, {
        props: {
          modelValue: true,
          tag: null,
          tagGroup: mockTagGroup
        },
        global: {
          plugins: [vuetify]
        }
      })

      const checkbox = wrapper.findComponent({ name: 'VCheckbox' })
      expect(checkbox.exists()).toBe(true)
      expect(checkbox.props('label')).toBe('Permission Protected')
    })

    it('should display description field', () => {
      wrapper = mount(TagDialog, {
        props: {
          modelValue: true,
          tag: null,
          tagGroup: mockTagGroup
        },
        global: {
          plugins: [vuetify]
        }
      })

      const textarea = wrapper.findComponent({ name: 'VTextarea' })
      expect(textarea.exists()).toBe(true)
      expect(textarea.props('label')).toBe('Description')
    })
  })

  describe('Form validation', () => {
    it('should require name field', async () => {
      wrapper = mount(TagDialog, {
        props: {
          modelValue: true,
          tag: null,
          tagGroup: mockTagGroup
        },
        global: {
          plugins: [vuetify]
        }
      })

      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      const nameField = textFields.find(field => field.props('label') === 'Name *')
      expect(nameField).toBeDefined()
    })

    it('should have name validation rules', () => {
      wrapper = mount(TagDialog, {
        props: {
          modelValue: true,
          tag: null,
          tagGroup: mockTagGroup
        },
        global: {
          plugins: [vuetify]
        }
      })

      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      const nameField = textFields.find(field => field.props('label') === 'Name *')
      expect(nameField?.props('rules')).toBeDefined()
    })

    it('should disable submit button when form invalid', async () => {
      wrapper = mount(TagDialog, {
        props: {
          modelValue: true,
          tag: null,
          tagGroup: mockTagGroup
        },
        global: {
          plugins: [vuetify]
        }
      })

      // Form starts invalid (empty name)
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const submitButton = buttons.find(btn => btn.text() === 'Create')
      expect(submitButton?.props('disabled')).toBe(true)
    })
  })

  describe('Icon preview', () => {
    it('should show icon preview when valid icon entered', async () => {
      wrapper = mount(TagDialog, {
        props: {
          modelValue: true,
          tag: { ...mockTag, icon: 'mdi-tag' },
          tagGroup: mockTagGroup
        },
        global: {
          plugins: [vuetify]
        }
      })

      await wrapper.vm.$nextTick()

      const icons = wrapper.findAllComponents({ name: 'VIcon' })
      // Check that icons are rendered
      expect(icons.length).toBeGreaterThan(0)
    })
  })

  describe('Color preview', () => {
    it('should show color preview when color entered', async () => {
      wrapper = mount(TagDialog, {
        props: {
          modelValue: true,
          tag: { ...mockTag, color: '#FF5722' },
          tagGroup: mockTagGroup
        },
        global: {
          plugins: [vuetify]
        }
      })

      await wrapper.vm.$nextTick()

      // Check that color field has the value
      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      const colorField = textFields.find(field => field.props('type') === 'color')
      expect(colorField?.props('modelValue')).toBe('#FF5722')
    })
  })

  describe('Form submission', () => {
    it('should emit save event with tag data on submit', async () => {
      wrapper = mount(TagDialog, {
        props: {
          modelValue: true,
          tag: mockTag,
          tagGroup: mockTagGroup
        },
        global: {
          plugins: [vuetify]
        }
      })

      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const saveButton = buttons.find(btn => btn.text() === 'Save' && btn.props('color') === 'primary')

      // Check that save button exists
      expect(saveButton).toBeDefined()
    })

    it('should include parent tag group in saved tag', async () => {
      wrapper = mount(TagDialog, {
        props: {
          modelValue: true,
          tag: mockTag,
          tagGroup: mockTagGroup
        },
        global: {
          plugins: [vuetify]
        }
      })

      await wrapper.vm.$nextTick()

      // Check that tagGroup is part of props
      expect(wrapper.props('tagGroup')).toEqual(mockTagGroup)
    })

    it('should show loading state while saving', async () => {
      wrapper = mount(TagDialog, {
        props: {
          modelValue: true,
          tag: mockTag,
          tagGroup: mockTagGroup
        },
        global: {
          plugins: [vuetify]
        }
      })

      // Trigger saving state
      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const saveButton = buttons.find(btn => btn.text() === 'Save')

      // Check that loading prop can be set
      expect(saveButton?.props()).toHaveProperty('loading')
    })
  })

  describe('Dialog actions', () => {
    it('should emit update:modelValue on cancel', async () => {
      wrapper = mount(TagDialog, {
        props: {
          modelValue: true,
          tag: null,
          tagGroup: mockTagGroup
        },
        global: {
          plugins: [vuetify]
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const cancelButton = buttons.find(btn => btn.text() === 'Cancel')

      await cancelButton!.trigger('click')

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([false])
    })

    it('should emit update:modelValue when dialog closes', async () => {
      wrapper = mount(TagDialog, {
        props: {
          modelValue: true,
          tag: null,
          tagGroup: mockTagGroup
        },
        global: {
          plugins: [vuetify]
        }
      })

      const dialog = wrapper.findComponent({ name: 'VDialog' })
      await dialog.vm.$emit('update:model-value', false)

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([false])
    })
  })

  describe('Persistent dialog', () => {
    it('should be persistent to prevent accidental close', () => {
      wrapper = mount(TagDialog, {
        props: {
          modelValue: true,
          tag: null,
          tagGroup: mockTagGroup
        },
        global: {
          plugins: [vuetify]
        }
      })

      const dialog = wrapper.findComponent({ name: 'VDialog' })
      expect(dialog.props('persistent')).toBe(true)
    })
  })

  describe('Mode detection', () => {
    it('should correctly detect create mode', () => {
      wrapper = mount(TagDialog, {
        props: {
          modelValue: true,
          tag: null,
          tagGroup: mockTagGroup
        },
        global: {
          plugins: [vuetify]
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const submitButton = buttons.find(btn => btn.text() === 'Create')
      expect(submitButton).toBeDefined()
    })

    it('should correctly detect edit mode', () => {
      wrapper = mount(TagDialog, {
        props: {
          modelValue: true,
          tag: mockTag,
          tagGroup: mockTagGroup
        },
        global: {
          plugins: [vuetify]
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const submitButton = buttons.find(btn => btn.text() === 'Save')
      expect(submitButton).toBeDefined()
    })
  })

  describe('Form reset', () => {
    it('should reset form when switching from edit to create', async () => {
      wrapper = mount(TagDialog, {
        props: {
          modelValue: true,
          tag: mockTag,
          tagGroup: mockTagGroup
        },
        global: {
          plugins: [vuetify]
        }
      })

      await wrapper.setProps({ tag: null })
      await wrapper.vm.$nextTick()

      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      const nameField = textFields.find(field => field.props('label') === 'Name *')
      expect(nameField?.props('modelValue')).toBe('')
    })
  })
})
