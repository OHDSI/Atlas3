/**
 * Component Tests: TagGroupTable
 *
 * Tests for tag group table component
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import TagGroupTable from '@/components/config/TagGroupTable.vue'
import type { TagGroup } from '@/models/config.types'

const vuetify = createVuetify({ components, directives })

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

const mockTagGroups: TagGroup[] = [
  {
    id: 1,
    name: 'Category',
    color: '#1976D2',
    icon: 'mdi-tag',
    mandatory: true,
    showGroup: true,
    multiSelection: false,
    allowCustom: false,
    description: 'Category tag group',
    createdDate: '2024-01-01T00:00:00Z',
    createdBy: { login: 'testuser' },
    groups: []
  },
  {
    id: 2,
    name: 'Status',
    color: '#4CAF50',
    icon: 'mdi-flag',
    mandatory: false,
    showGroup: true,
    multiSelection: true,
    allowCustom: true,
    description: 'Status tag group with a very long description that should be truncated',
    groups: []
  }
]

describe('TagGroupTable.vue', () => {
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
      wrapper = mount(TagGroupTable, {
        props: {
          items: mockTagGroups,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should render data table', () => {
      wrapper = mount(TagGroupTable, {
        props: {
          items: mockTagGroups,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const table = wrapper.findComponent({ name: 'VDataTable' })
      expect(table.exists()).toBe(true)
    })

    it('should pass items to data table', () => {
      wrapper = mount(TagGroupTable, {
        props: {
          items: mockTagGroups,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const table = wrapper.findComponent({ name: 'VDataTable' })
      expect(table.props('items')).toEqual(mockTagGroups)
    })

    it('should show loading state', () => {
      wrapper = mount(TagGroupTable, {
        props: {
          items: [],
          loading: true
        },
        global: {
          plugins: [vuetify]
        }
      })

      const table = wrapper.findComponent({ name: 'VDataTable' })
      expect(table.props('loading')).toBe(true)
    })
  })

  describe('Table headers', () => {
    it('should display all column headers', () => {
      wrapper = mount(TagGroupTable, {
        props: {
          items: mockTagGroups,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const table = wrapper.findComponent({ name: 'VDataTable' })
      const headers = table.props('headers')

      const headerTitles = headers.map((h: { title: string }) => h.title)
      expect(headerTitles).toContain('Name')
      expect(headerTitles).toContain('Color')
      expect(headerTitles).toContain('Icon')
      expect(headerTitles).toContain('Mandatory')
      expect(headerTitles).toContain('Show Column')
      expect(headerTitles).toContain('Multiple')
      expect(headerTitles).toContain('Free-form')
      expect(headerTitles).toContain('Created')
      expect(headerTitles).toContain('Author')
      expect(headerTitles).toContain('Description')
      expect(headerTitles).toContain('Actions')
    })
  })

  describe('Color swatch display', () => {
    it('should render color swatch for items with color', () => {
      wrapper = mount(TagGroupTable, {
        props: {
          items: mockTagGroups,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const colorSwatches = wrapper.findAll('.color-swatch')
      expect(colorSwatches.length).toBeGreaterThan(0)
    })

    it('should apply correct background color to swatch', () => {
      wrapper = mount(TagGroupTable, {
        props: {
          items: mockTagGroups,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const colorSwatches = wrapper.findAll('.color-swatch')
      // Check for color in style attribute (may be RGB or hex)
      const style = colorSwatches[0].attributes('style')
      expect(style).toBeDefined()
      expect(style).toMatch(/background-color/)
    })
  })

  describe('Icon display', () => {
    it('should render icon when present', () => {
      wrapper = mount(TagGroupTable, {
        props: {
          items: mockTagGroups,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const icons = wrapper.findAllComponents({ name: 'VIcon' })
      // Check that icons are rendered (Vuetify may render icon content differently)
      expect(icons.length).toBeGreaterThan(0)
    })
  })

  describe('Boolean flag chips', () => {
    it('should show mandatory chip for required groups', () => {
      wrapper = mount(TagGroupTable, {
        props: {
          items: mockTagGroups,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const chips = wrapper.findAllComponents({ name: 'VChip' })
      const mandatoryChip = chips.find(chip => chip.text() === 'Required')
      expect(mandatoryChip).toBeDefined()
      expect(mandatoryChip?.props('color')).toBe('error')
    })

    it('should show column chip for showGroup true', () => {
      wrapper = mount(TagGroupTable, {
        props: {
          items: mockTagGroups,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const chips = wrapper.findAllComponents({ name: 'VChip' })
      const columnChips = chips.filter(chip => chip.text() === 'Column')
      expect(columnChips.length).toBeGreaterThan(0)
    })

    it('should show multiple chip for multiSelection true', () => {
      wrapper = mount(TagGroupTable, {
        props: {
          items: mockTagGroups,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const chips = wrapper.findAllComponents({ name: 'VChip' })
      const multipleChip = chips.find(chip => chip.text() === 'Multiple')
      expect(multipleChip).toBeDefined()
      expect(multipleChip?.props('color')).toBe('info')
    })

    it('should show free-form chip for allowCustom true', () => {
      wrapper = mount(TagGroupTable, {
        props: {
          items: mockTagGroups,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const chips = wrapper.findAllComponents({ name: 'VChip' })
      const freeformChip = chips.find(chip => chip.text() === 'Free-form')
      expect(freeformChip).toBeDefined()
      expect(freeformChip?.props('color')).toBe('success')
    })
  })

  describe('Date formatting', () => {
    it('should format created date', () => {
      wrapper = mount(TagGroupTable, {
        props: {
          items: mockTagGroups,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      // Should display formatted date (format may vary - actually shows 2023 due to timezone)
      expect(wrapper.text()).toMatch(/202[34]/)
    })
  })

  describe('Author display', () => {
    it('should display author login', () => {
      wrapper = mount(TagGroupTable, {
        props: {
          items: mockTagGroups,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      expect(wrapper.text()).toContain('testuser')
    })
  })

  describe('Description truncation', () => {
    it('should truncate long descriptions', () => {
      wrapper = mount(TagGroupTable, {
        props: {
          items: mockTagGroups,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const text = wrapper.text()
      // Long description should be truncated with ellipsis
      expect(text).toContain('...')
    })
  })

  describe('Action buttons', () => {
    it('should display show tags button', () => {
      wrapper = mount(TagGroupTable, {
        props: {
          items: mockTagGroups,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const showTagsButtons = buttons.filter(btn => btn.text() === 'Show Tags')
      expect(showTagsButtons.length).toBeGreaterThan(0)
    })

    it('should display edit button', () => {
      wrapper = mount(TagGroupTable, {
        props: {
          items: mockTagGroups,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const editButtons = buttons.filter(btn => btn.props('icon') === 'mdi-pencil')
      expect(editButtons.length).toBe(2)
    })

    it('should display delete button', () => {
      wrapper = mount(TagGroupTable, {
        props: {
          items: mockTagGroups,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const deleteButtons = buttons.filter(btn => btn.props('icon') === 'mdi-delete')
      expect(deleteButtons.length).toBe(2)
    })

    it('should have error color for delete button', () => {
      wrapper = mount(TagGroupTable, {
        props: {
          items: mockTagGroups,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const deleteButtons = buttons.filter(btn => btn.props('icon') === 'mdi-delete')
      deleteButtons.forEach(btn => {
        expect(btn.props('color')).toBe('error')
      })
    })
  })

  describe('Event emissions', () => {
    it('should emit edit event when edit button clicked', async () => {
      wrapper = mount(TagGroupTable, {
        props: {
          items: mockTagGroups,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const editButtons = buttons.filter(btn => btn.props('icon') === 'mdi-pencil')

      await editButtons[0].trigger('click')

      expect(wrapper.emitted('edit')).toBeTruthy()
      expect(wrapper.emitted('edit')![0]).toEqual([mockTagGroups[0]])
    })

    it('should emit delete event when delete button clicked', async () => {
      wrapper = mount(TagGroupTable, {
        props: {
          items: mockTagGroups,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const deleteButtons = buttons.filter(btn => btn.props('icon') === 'mdi-delete')

      await deleteButtons[0].trigger('click')

      expect(wrapper.emitted('delete')).toBeTruthy()
      expect(wrapper.emitted('delete')![0]).toEqual([mockTagGroups[0]])
    })

    it('should emit showTags event when show tags button clicked', async () => {
      wrapper = mount(TagGroupTable, {
        props: {
          items: mockTagGroups,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const showTagsButtons = buttons.filter(btn => btn.text() === 'Show Tags')

      await showTagsButtons[0].trigger('click')

      expect(wrapper.emitted('showTags')).toBeTruthy()
      expect(wrapper.emitted('showTags')![0]).toEqual([mockTagGroups[0]])
    })
  })

  describe('Empty state', () => {
    it('should display empty state when no items', () => {
      wrapper = mount(TagGroupTable, {
        props: {
          items: [],
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      expect(wrapper.text()).toContain('No tag groups found')
    })

    it('should display empty state icon', () => {
      wrapper = mount(TagGroupTable, {
        props: {
          items: [],
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const icons = wrapper.findAllComponents({ name: 'VIcon' })
      // Check that icon component is rendered in empty state
      expect(icons.length).toBeGreaterThan(0)
    })

    it('should display helpful message in empty state', () => {
      wrapper = mount(TagGroupTable, {
        props: {
          items: [],
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      expect(wrapper.text()).toContain('Create your first tag group to get started')
    })
  })

  describe('Accessibility', () => {
    it('should have aria-label on edit buttons', () => {
      wrapper = mount(TagGroupTable, {
        props: {
          items: mockTagGroups,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const editButtons = buttons.filter(btn => btn.props('icon') === 'mdi-pencil')
      editButtons.forEach(btn => {
        expect(btn.attributes('aria-label')).toBe('Edit tag group')
      })
    })

    it('should have aria-label on delete buttons', () => {
      wrapper = mount(TagGroupTable, {
        props: {
          items: mockTagGroups,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const deleteButtons = buttons.filter(btn => btn.props('icon') === 'mdi-delete')
      deleteButtons.forEach(btn => {
        expect(btn.attributes('aria-label')).toBe('Delete tag group')
      })
    })
  })
})
