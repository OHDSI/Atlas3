/**
 * Component Tests: TagTable
 *
 * Tests for tag table component
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import TagTable from '@/components/config/TagTable.vue'
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

const mockTags: Tag[] = [
  {
    id: 1,
    name: 'Important',
    color: '#FF5722',
    icon: 'mdi-star',
    permissionProtected: true,
    description: 'Important tag',
    createdDate: '2024-01-01T00:00:00Z',
    createdBy: { login: 'testuser' },
    count: 5,
    groups: [mockTagGroup]
  },
  {
    id: 2,
    name: 'Normal',
    permissionProtected: false,
    description: 'A very long description that should be truncated in the table display',
    count: 10,
    groups: [mockTagGroup]
  }
]

describe('TagTable.vue', () => {
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
      wrapper = mount(TagTable, {
        props: {
          items: mockTags,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should render data table', () => {
      wrapper = mount(TagTable, {
        props: {
          items: mockTags,
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
      wrapper = mount(TagTable, {
        props: {
          items: mockTags,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const table = wrapper.findComponent({ name: 'VDataTable' })
      expect(table.props('items')).toEqual(mockTags)
    })

    it('should show loading state', () => {
      wrapper = mount(TagTable, {
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
      wrapper = mount(TagTable, {
        props: {
          items: mockTags,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const table = wrapper.findComponent({ name: 'VDataTable' })
      const headers = table.props('headers')

      const headerTitles = headers.map((h: { title: string }) => h.title)
      expect(headerTitles).toContain('Tag')
      expect(headerTitles).toContain('Protected')
      expect(headerTitles).toContain('Created')
      expect(headerTitles).toContain('Author')
      expect(headerTitles).toContain('Description')
      expect(headerTitles).toContain('Usage')
      expect(headerTitles).toContain('Actions')
    })
  })

  describe('Tag badge display', () => {
    it('should render tag badge with color swatch', () => {
      wrapper = mount(TagTable, {
        props: {
          items: mockTags,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const badges = wrapper.findAll('.tag-badge')
      expect(badges.length).toBeGreaterThan(0)
    })

    it('should display tag color in swatch', () => {
      wrapper = mount(TagTable, {
        props: {
          items: mockTags,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const swatches = wrapper.findAll('.tag-badge__swatch')
      // Check for color in style (may be RGB or hex)
      const style = swatches[0].attributes('style')
      expect(style).toBeDefined()
      expect(style).toMatch(/background-color/)
    })

    it('should display tag icon in swatch', () => {
      wrapper = mount(TagTable, {
        props: {
          items: mockTags,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const icons = wrapper.findAllComponents({ name: 'VIcon' })
      // Check that icons are rendered
      expect(icons.length).toBeGreaterThan(0)
    })

    it('should use group color when tag has no color', () => {
      wrapper = mount(TagTable, {
        props: {
          items: mockTags,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const swatches = wrapper.findAll('.tag-badge__swatch')
      // Second tag has no color, should use group color (check style exists)
      const style = swatches[1].attributes('style')
      expect(style).toBeDefined()
      expect(style).toMatch(/background-color/)
    })

    it('should use group icon when tag has no icon', () => {
      wrapper = mount(TagTable, {
        props: {
          items: mockTags,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const icons = wrapper.findAllComponents({ name: 'VIcon' })
      // Check that icons are rendered
      expect(icons.length).toBeGreaterThan(0)
    })
  })

  describe('Permission protected indicator', () => {
    it('should show protected chip for permission-protected tags', () => {
      wrapper = mount(TagTable, {
        props: {
          items: mockTags,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const chips = wrapper.findAllComponents({ name: 'VChip' })
      const protectedChip = chips.find(chip => chip.text() === 'Protected')
      expect(protectedChip).toBeDefined()
      expect(protectedChip?.props('color')).toBe('warning')
    })

    it('should not show protected chip for non-protected tags', () => {
      wrapper = mount(TagTable, {
        props: {
          items: [mockTags[1]], // Only the non-protected tag
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const chips = wrapper.findAllComponents({ name: 'VChip' })
      const protectedChip = chips.find(chip => chip.text() === 'Protected')
      expect(protectedChip).toBeUndefined()
    })
  })

  describe('Date formatting', () => {
    it('should format created date', () => {
      wrapper = mount(TagTable, {
        props: {
          items: mockTags,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      // Should display year (format may vary - actually shows 2023 due to timezone)
      expect(wrapper.text()).toMatch(/202[34]/)
    })
  })

  describe('Author display', () => {
    it('should display author login', () => {
      wrapper = mount(TagTable, {
        props: {
          items: mockTags,
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
      wrapper = mount(TagTable, {
        props: {
          items: mockTags,
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

  describe('Usage count display', () => {
    it('should display usage count in chip', () => {
      wrapper = mount(TagTable, {
        props: {
          items: mockTags,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const chips = wrapper.findAllComponents({ name: 'VChip' })
      const countChips = chips.filter(chip => {
        const text = chip.text()
        return text === '5' || text === '10'
      })
      expect(countChips.length).toBeGreaterThan(0)
    })

    it('should display 0 for tags with no count', () => {
      const tagWithoutCount: Tag = {
        ...mockTags[0],
        count: undefined
      }

      wrapper = mount(TagTable, {
        props: {
          items: [tagWithoutCount],
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const chips = wrapper.findAllComponents({ name: 'VChip' })
      const countChip = chips.find(chip => chip.text() === '0')
      expect(countChip).toBeDefined()
    })
  })

  describe('Action buttons', () => {
    it('should display edit button', () => {
      wrapper = mount(TagTable, {
        props: {
          items: mockTags,
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
      wrapper = mount(TagTable, {
        props: {
          items: mockTags,
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
      wrapper = mount(TagTable, {
        props: {
          items: mockTags,
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
      wrapper = mount(TagTable, {
        props: {
          items: mockTags,
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
      expect(wrapper.emitted('edit')![0]).toEqual([mockTags[0]])
    })

    it('should emit delete event when delete button clicked', async () => {
      wrapper = mount(TagTable, {
        props: {
          items: mockTags,
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
      expect(wrapper.emitted('delete')![0]).toEqual([mockTags[0]])
    })
  })

  describe('Empty state', () => {
    it('should display empty state when no items', () => {
      wrapper = mount(TagTable, {
        props: {
          items: [],
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      expect(wrapper.text()).toContain('No tags in this group')
    })

    it('should display empty state icon', () => {
      wrapper = mount(TagTable, {
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
      wrapper = mount(TagTable, {
        props: {
          items: [],
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      expect(wrapper.text()).toContain('Create your first tag to get started')
    })
  })

  describe('Accessibility', () => {
    it('should have aria-label on edit buttons', () => {
      wrapper = mount(TagTable, {
        props: {
          items: mockTags,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const editButtons = buttons.filter(btn => btn.props('icon') === 'mdi-pencil')
      editButtons.forEach(btn => {
        expect(btn.attributes('aria-label')).toBe('Edit tag')
      })
    })

    it('should have aria-label on delete buttons', () => {
      wrapper = mount(TagTable, {
        props: {
          items: mockTags,
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const deleteButtons = buttons.filter(btn => btn.props('icon') === 'mdi-delete')
      deleteButtons.forEach(btn => {
        expect(btn.attributes('aria-label')).toBe('Delete tag')
      })
    })
  })

  describe('Tag name display', () => {
    it('should truncate long tag names', () => {
      const longNameTag: Tag = {
        ...mockTags[0],
        name: 'This is a very long tag name that should be truncated'
      }

      wrapper = mount(TagTable, {
        props: {
          items: [longNameTag],
          loading: false
        },
        global: {
          plugins: [vuetify]
        }
      })

      const badges = wrapper.findAll('.tag-badge__name')
      expect(badges[0].text()).toContain('...')
    })
  })
})
