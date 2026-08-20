/**
 * CohortCard Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import CohortCard from '@/components/cohort/CohortCard.vue'
import { useAuthStore } from '@/stores/auth'
import { emptyEntityAccess } from '@/models/auth.types'

// Mock dependencies
const mockPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback?: string) => ref(fallback || key),
    locale: ref('en-US')
  })
}))

const vuetify = createVuetify({ components, directives })

const mockCohort = {
  id: 123,
  name: 'Test Cohort',
  description: 'A test cohort description',
  createdBy: { name: 'John Doe', login: 'jdoe' },
  createdDate: '2024-01-15T10:00:00Z',
  modifiedDate: '2024-06-01T15:30:00Z',
  tags: [
    { id: 1, name: 'Diabetes', color: '#ff5252' },
    { id: 2, name: 'Heart Disease', color: '#2196f3' }
  ]
}

function mountComponent(props = {}) {
  return mount(CohortCard, {
    props: {
      cohort: mockCohort,
      ...props
    },
    global: {
      plugins: [vuetify],
      stubs: {
        VTooltip: {
          template: '<div><slot name="activator" :props="{}" /><slot /></div>'
        }
      }
    }
  })
}

describe('CohortCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // Default to a user with full write access to any cohort so existing
    // assertions about delete/generate buttons keep working.
    const authStore = useAuthStore()
    authStore.setUser({
      login: 'tester',
      displayName: 'tester',
      permissionIdx: { write: ['write:cohort-definition'] },
      entityAccess: emptyEntityAccess(),
    })
    vi.clearAllMocks()
  })

  it('should render cohort name', () => {
    const wrapper = mountComponent()

    expect(wrapper.text()).toContain('Test Cohort')
  })

  it('should render cohort description', () => {
    const wrapper = mountComponent()

    expect(wrapper.text()).toContain('A test cohort description')
  })

  it('should render cohort ID', () => {
    const wrapper = mountComponent()

    expect(wrapper.text()).toContain('123')
  })

  it('should format and display author name', () => {
    const wrapper = mountComponent()

    expect(wrapper.text()).toContain('John Doe')
  })

  it('should handle string author value', () => {
    const cohortWithStringAuthor = {
      ...mockCohort,
      createdBy: 'admin'
    }

    const wrapper = mountComponent({ cohort: cohortWithStringAuthor })

    expect(wrapper.text()).toContain('admin')
  })

  it('should render tags', () => {
    const wrapper = mountComponent()

    expect(wrapper.text()).toContain('Diabetes')
    expect(wrapper.text()).toContain('Heart Disease')
  })

  it('should navigate to cohort page on click', async () => {
    const wrapper = mountComponent()

    await wrapper.find('.cohort-card').trigger('click')

    expect(mockPush).toHaveBeenCalledWith('/cohorts/123')
  })

  // Refresh: Generate button removed from cohort cards. Running a
  // cohort happens from the cohort builder page now.

  it('should emit delete event', async () => {
    const wrapper = mountComponent()

    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    const deleteBtn = buttons.find(btn =>
      btn.attributes('aria-label') === 'Delete'
    )

    expect(deleteBtn).toBeDefined()
    await deleteBtn!.trigger('click')
    expect(wrapper.emitted('delete')).toBeTruthy()
    expect(wrapper.emitted('delete')![0]).toEqual([mockCohort])
  })

  it('should emit show-info event', async () => {
    const wrapper = mountComponent()

    const buttons = wrapper.findAllComponents({ name: 'VBtn' })
    // Refresh: aria-label is now sentence-case "Cohort information".
    const infoBtn = buttons.find(btn =>
      (btn.attributes('aria-label') ?? '').toLowerCase().includes('cohort information')
    )

    expect(infoBtn).toBeDefined()
    await infoBtn!.trigger('click')
    expect(wrapper.emitted('show-info')).toBeTruthy()
    expect(wrapper.emitted('show-info')![0]).toEqual([mockCohort])
  })

  it('should emit tag-click event when tag is clicked', async () => {
    const wrapper = mountComponent()

    const chips = wrapper.findAllComponents({ name: 'VChip' })
    expect(chips.length).toBeGreaterThan(0)
    await chips[0].trigger('click')
    expect(wrapper.emitted('tag-click')).toBeTruthy()
  })

  it('should apply selected style to selected tags', () => {
    const wrapper = mountComponent({ selectedTags: ['Diabetes'] })

    const chips = wrapper.findAllComponents({ name: 'VChip' })
    const diabetesChip = chips.find(chip => chip.text() === 'Diabetes')

    expect(diabetesChip).toBeDefined()
    // Refresh: selected → flat / unselected → tonal (was elevated /
    // flat). Matches the chip pattern used elsewhere in the app.
    expect(diabetesChip!.props('variant')).toBe('flat')
  })

  it('should handle cohort without description', () => {
    const cohortNoDesc = { ...mockCohort, description: undefined }

    const wrapper = mountComponent({ cohort: cohortNoDesc })

    expect(wrapper.exists()).toBe(true)
  })

  it('should handle cohort without tags', () => {
    const cohortNoTags = { ...mockCohort, tags: undefined }

    const wrapper = mountComponent({ cohort: cohortNoTags })

    expect(wrapper.findAllComponents({ name: 'VChip' })).toHaveLength(0)
  })

  it('should render the SurfaceCard wrapper with interactive hover lift', () => {
    // Refresh: replaced bespoke v-card + elevation watching with
    // SurfaceCard interactive (pure-CSS hover lift).
    const wrapper = mountComponent()

    expect(wrapper.find('.atlas-card.atlas-card--interactive').exists()).toBe(true)
  })

  // Discussion #124: one-click cohort duplication.
  describe('copy action', () => {
    it('emits copy with the cohort when the duplicate button is clicked', async () => {
      const wrapper = mountComponent({ canCopy: true })

      await wrapper.get('[data-testid="cohort-card-copy"]').trigger('click')

      expect(wrapper.emitted('copy')).toBeTruthy()
      expect(wrapper.emitted('copy')![0]).toEqual([mockCohort])
    })

    it('does not bubble the click to the card navigation handler', async () => {
      const wrapper = mountComponent({ canCopy: true })

      await wrapper.get('[data-testid="cohort-card-copy"]').trigger('click')

      expect(mockPush).not.toHaveBeenCalled()
    })

    it('disables the duplicate button when the user lacks create permission', () => {
      const wrapper = mountComponent({ canCopy: false })

      const btn = wrapper.get('[data-testid="cohort-card-copy"]')
      expect(btn.attributes('disabled')).not.toBeUndefined()
    })

    it('disables the duplicate button while a copy is in flight', () => {
      const wrapper = mountComponent({ canCopy: true, copying: true })

      const btn = wrapper.get('[data-testid="cohort-card-copy"]')
      expect(btn.attributes('disabled')).not.toBeUndefined()
    })
  })
})
