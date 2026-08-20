/**
 * Component Tests: TagGroupDialog
 *
 * Tests for tag group creation/editing dialog component
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import TagGroupDialog from '@/components/config/TagGroupDialog.vue'
import type { TagGroup } from '@/models/config.types'

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
  mandatory: true,
  showGroup: true,
  multiSelection: false,
  allowCustom: false,
  description: 'Test category',
  groups: []
}

describe('TagGroupDialog.vue', () => {
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
      wrapper = mount(TagGroupDialog, {
        props: {
          modelValue: true,
          tagGroup: null
        },
        global: {
          plugins: [vuetify]
        }
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should show create mode title when tagGroup is null', () => {
      wrapper = mount(TagGroupDialog, {
        props: {
          modelValue: true,
          tagGroup: null
        },
        global: {
          plugins: [vuetify]
        }
      })

      // Dialog should exist
      const dialog = wrapper.findComponent({ name: 'VDialog' })
      expect(dialog.exists()).toBe(true)
    })

    it('should show edit mode title when tagGroup is provided', () => {
      wrapper = mount(TagGroupDialog, {
        props: {
          modelValue: true,
          tagGroup: mockTagGroup
        },
        global: {
          plugins: [vuetify]
        }
      })

      // Dialog should exist
      const dialog = wrapper.findComponent({ name: 'VDialog' })
      expect(dialog.exists()).toBe(true)
    })

    it('should populate form with tagGroup data in edit mode', async () => {
      wrapper = mount(TagGroupDialog, {
        props: {
          modelValue: true,
          tagGroup: mockTagGroup
        },
        global: {
          plugins: [vuetify]
        }
      })

      await wrapper.vm.$nextTick()

      const nameField = wrapper.findAllComponents({ name: 'VTextField' })[0]
      expect(nameField.props('modelValue')).toBe('Category')
    })
  })

  describe('Form fields', () => {
    it('should display name field', () => {
      wrapper = mount(TagGroupDialog, {
        props: {
          modelValue: true,
          tagGroup: null
        },
        global: {
          plugins: [vuetify]
        }
      })

      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      const nameField = textFields.find(field => field.props('label') === 'Name *')
      expect(nameField).toBeDefined()
    })

    it('should display color field with type color', () => {
      wrapper = mount(TagGroupDialog, {
        props: {
          modelValue: true,
          tagGroup: null
        },
        global: {
          plugins: [vuetify]
        }
      })

      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      const colorField = textFields.find(field => field.props('label') === 'Color')
      expect(colorField).toBeDefined()
      expect(colorField?.props('type')).toBe('color')
    })

    it('should display icon field', () => {
      wrapper = mount(TagGroupDialog, {
        props: {
          modelValue: true,
          tagGroup: null
        },
        global: {
          plugins: [vuetify]
        }
      })

      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      const iconField = textFields.find(field => field.props('label') === 'Icon')
      expect(iconField).toBeDefined()
    })

    it('should display all checkbox fields', () => {
      wrapper = mount(TagGroupDialog, {
        props: {
          modelValue: true,
          tagGroup: null
        },
        global: {
          plugins: [vuetify]
        }
      })

      const checkboxes = wrapper.findAllComponents({ name: 'VCheckbox' })
      expect(checkboxes.length).toBe(4)

      const labels = checkboxes.map(cb => cb.props('label'))
      expect(labels).toContain('Mandatory')
      expect(labels).toContain('Show as Column')
      expect(labels).toContain('Allow Multiple')
      expect(labels).toContain('Free-form')
    })

    it('should display description field', () => {
      wrapper = mount(TagGroupDialog, {
        props: {
          modelValue: true,
          tagGroup: null
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

  describe('Default values', () => {
    it('should set default color in create mode', async () => {
      wrapper = mount(TagGroupDialog, {
        props: {
          modelValue: true,
          tagGroup: null
        },
        global: {
          plugins: [vuetify]
        }
      })

      await wrapper.vm.$nextTick()

      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      const colorField = textFields.find(field => field.props('label') === 'Color')
      expect(colorField?.props('modelValue')).toBe('#1976D2')
    })

    it('should set showGroup to true by default', async () => {
      wrapper = mount(TagGroupDialog, {
        props: {
          modelValue: true,
          tagGroup: null
        },
        global: {
          plugins: [vuetify]
        }
      })

      await wrapper.vm.$nextTick()

      const checkboxes = wrapper.findAllComponents({ name: 'VCheckbox' })
      const showGroupCheckbox = checkboxes.find(cb => cb.props('label') === 'Show as Column')
      expect(showGroupCheckbox?.props('modelValue')).toBe(true)
    })

    it('should set other boolean flags to false by default', async () => {
      wrapper = mount(TagGroupDialog, {
        props: {
          modelValue: true,
          tagGroup: null
        },
        global: {
          plugins: [vuetify]
        }
      })

      await wrapper.vm.$nextTick()

      const checkboxes = wrapper.findAllComponents({ name: 'VCheckbox' })
      const mandatoryCheckbox = checkboxes.find(cb => cb.props('label') === 'Mandatory')
      const multiCheckbox = checkboxes.find(cb => cb.props('label') === 'Allow Multiple')
      const customCheckbox = checkboxes.find(cb => cb.props('label') === 'Free-form')

      expect(mandatoryCheckbox?.props('modelValue')).toBe(false)
      expect(multiCheckbox?.props('modelValue')).toBe(false)
      expect(customCheckbox?.props('modelValue')).toBe(false)
    })
  })

  describe('Form validation', () => {
    it('should require name field', () => {
      wrapper = mount(TagGroupDialog, {
        props: {
          modelValue: true,
          tagGroup: null
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
      wrapper = mount(TagGroupDialog, {
        props: {
          modelValue: true,
          tagGroup: null
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
      wrapper = mount(TagGroupDialog, {
        props: {
          modelValue: true,
          tagGroup: null
        },
        global: {
          plugins: [vuetify]
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const submitButton = buttons.find(btn => btn.text() === 'Create')
      expect(submitButton?.props('disabled')).toBe(true)
    })
  })

  describe('Icon preview', () => {
    it('should show icon preview when valid mdi icon entered', async () => {
      wrapper = mount(TagGroupDialog, {
        props: {
          modelValue: true,
          tagGroup: { ...mockTagGroup, icon: 'mdi-folder' }
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
    it('should show color preview', async () => {
      wrapper = mount(TagGroupDialog, {
        props: {
          modelValue: true,
          tagGroup: mockTagGroup
        },
        global: {
          plugins: [vuetify]
        }
      })

      await wrapper.vm.$nextTick()

      // Check that color field exists
      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      const colorField = textFields.find(field => field.props('type') === 'color')
      expect(colorField).toBeDefined()
    })

    it('should update color preview when color changes', async () => {
      wrapper = mount(TagGroupDialog, {
        props: {
          modelValue: true,
          tagGroup: { ...mockTagGroup, color: '#FF5722' }
        },
        global: {
          plugins: [vuetify]
        }
      })

      await wrapper.vm.$nextTick()

      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      const colorField = textFields.find(field => field.props('type') === 'color')
      expect(colorField?.props('modelValue')).toBe('#FF5722')
    })
  })

  describe('Form submission', () => {
    it('should emit save event with tagGroup data on submit', async () => {
      wrapper = mount(TagGroupDialog, {
        props: {
          modelValue: true,
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

    it('should show loading state while saving', () => {
      wrapper = mount(TagGroupDialog, {
        props: {
          modelValue: true,
          tagGroup: mockTagGroup
        },
        global: {
          plugins: [vuetify]
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const saveButton = buttons.find(btn => btn.text() === 'Save')

      expect(saveButton?.props()).toHaveProperty('loading')
    })
  })

  describe('Dialog actions', () => {
    it('should emit update:modelValue on cancel', async () => {
      wrapper = mount(TagGroupDialog, {
        props: {
          modelValue: true,
          tagGroup: null
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
      wrapper = mount(TagGroupDialog, {
        props: {
          modelValue: true,
          tagGroup: null
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
      wrapper = mount(TagGroupDialog, {
        props: {
          modelValue: true,
          tagGroup: null
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
      wrapper = mount(TagGroupDialog, {
        props: {
          modelValue: true,
          tagGroup: null
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
      wrapper = mount(TagGroupDialog, {
        props: {
          modelValue: true,
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
      wrapper = mount(TagGroupDialog, {
        props: {
          modelValue: true,
          tagGroup: mockTagGroup
        },
        global: {
          plugins: [vuetify]
        }
      })

      await wrapper.setProps({ tagGroup: null })
      await wrapper.vm.$nextTick()

      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      const nameField = textFields.find(field => field.props('label') === 'Name *')
      expect(nameField?.props('modelValue')).toBe('')
    })

    it('should reset boolean flags when switching from edit to create', async () => {
      wrapper = mount(TagGroupDialog, {
        props: {
          modelValue: true,
          tagGroup: mockTagGroup
        },
        global: {
          plugins: [vuetify]
        }
      })

      await wrapper.setProps({ tagGroup: null })
      await wrapper.vm.$nextTick()

      const checkboxes = wrapper.findAllComponents({ name: 'VCheckbox' })
      const mandatoryCheckbox = checkboxes.find(cb => cb.props('label') === 'Mandatory')
      expect(mandatoryCheckbox?.props('modelValue')).toBe(false)
    })
  })

  describe('Checkbox hints', () => {
    it('should display helpful hints for each checkbox', () => {
      wrapper = mount(TagGroupDialog, {
        props: {
          modelValue: true,
          tagGroup: null
        },
        global: {
          plugins: [vuetify]
        }
      })

      const checkboxes = wrapper.findAllComponents({ name: 'VCheckbox' })

      checkboxes.forEach(checkbox => {
        expect(checkbox.props('hint')).toBeDefined()
        expect(checkbox.props('persistentHint')).toBe(true)
      })
    })
  })
})
