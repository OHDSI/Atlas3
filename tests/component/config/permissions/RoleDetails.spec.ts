/**
 * RoleDetails tests
 *
 * Covers the display + edit templates for name/description, the validation
 * rules, formatDate, and the update-failure/exception branches of saveName
 * and saveDescription.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import type { Role } from '@/models/role.types'

const updateRole = vi.fn()
const rolesRef = ref<Role[]>([])

vi.mock('@/composables/useRoles', () => ({
  useRoles: () => ({
    updateRole,
    roles: rolesRef,
  }),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import RoleDetails from '@/components/config/permissions/RoleDetails.vue'

const vuetify = createVuetify({ components, directives })

const baseRole: Role = {
  id: 1,
  name: 'Administrator',
  description: 'Full access',
  createdDate: '2024-01-15T10:30:00Z',
  modifiedDate: '2024-02-20T14:45:00Z',
}

function makeStubs() {
  return {
    AtlasIcon: { template: '<span class="stub-icon"><slot /></span>' },
    AtlasAlert: {
      props: ['severity'],
      emits: ['close'],
      template:
        '<div class="stub-alert" :data-severity="severity"><slot /><button class="stub-alert-close" @click="$emit(\'close\')" /></div>',
    },
    AtlasIconButton: {
      props: ['icon', 'title', 'ariaLabel', 'size', 'variant'],
      emits: ['click'],
      template: '<button class="stub-icon-btn" :data-title="title" @click="$emit(\'click\')" />',
    },
    AtlasTextField: {
      props: ['modelValue', 'rules'],
      emits: ['update:modelValue'],
      template:
        '<input class="stub-textfield" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    },
    AtlasButton: {
      props: ['disabled', 'loading', 'variant', 'size'],
      emits: ['click'],
      template:
        '<button class="stub-btn" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    },
  }
}

function mountIt(role: Partial<Role> = {}) {
  setActivePinia(createPinia())
  return mount(RoleDetails, {
    props: { role: { ...baseRole, ...role } as Role },
    global: {
      plugins: [vuetify],
      stubs: makeStubs(),
    },
  })
}

function findIconBtnByTitle(wrapper: ReturnType<typeof mount>, title: string) {
  return wrapper.findAll('.stub-icon-btn').find(w => w.attributes('data-title') === title)
}

function findBtnByText(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper.findAll('.stub-btn').find(w => w.text().trim() === text)
}

describe('RoleDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateRole.mockReset()
    rolesRef.value = []
  })

  it('renders the name, description and formatted metadata dates', () => {
    const wrapper = mountIt()
    expect(wrapper.text()).toMatch(/Administrator/)
    expect(wrapper.text()).toMatch(/Full access/)
    expect(wrapper.text()).toMatch(/Created/)
    expect(wrapper.text()).toMatch(/Modified/)
    // formatDate renders a human month name
    expect(wrapper.text()).toMatch(/January|February/)
  })

  it('shows the placeholder when no description is provided', () => {
    const wrapper = mountIt({ description: null })
    expect(wrapper.text()).toMatch(/No description provided/)
  })

  it('toggles into name edit mode and renders the edit field + actions', async () => {
    const wrapper = mountIt()
    await findIconBtnByTitle(wrapper, 'Edit Role Name')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.stub-textfield').exists()).toBe(true)
    expect(findBtnByText(wrapper, 'Save')).toBeTruthy()
    expect(findBtnByText(wrapper, 'Cancel')).toBeTruthy()
  })

  it('toggles into description edit mode', async () => {
    const wrapper = mountIt()
    await findIconBtnByTitle(wrapper, 'Edit Description')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.stub-textfield').exists()).toBe(true)
  })

  it('nameRules cover required/empty/too-long/duplicate and valid inputs', () => {
    rolesRef.value = [{ id: 2, name: 'Existing', description: null } as Role]
    const wrapper = mountIt()
    const rules = (wrapper.vm as unknown as { nameRules: Array<(v: string) => boolean | string> })
      .nameRules

    // required
    expect(rules[0]('')).not.toBe(true)
    expect(rules[0]('x')).toBe(true)
    // non-empty (whitespace only)
    expect(rules[1]('   ')).not.toBe(true)
    expect(rules[1]('valid')).toBe(true)
    // length <= 255
    expect(rules[2]('x'.repeat(300))).not.toBe(true)
    expect(rules[2]('ok')).toBe(true)
    // duplicate (case-insensitive, excludes own id)
    expect(rules[3]('existing')).not.toBe(true)
    expect(rules[3]('Administrator')).toBe(true)
    expect(rules[3]('')).toBe(true)
  })

  it('saveName success closes edit mode', async () => {
    updateRole.mockResolvedValueOnce(true)
    const wrapper = mountIt()
    await findIconBtnByTitle(wrapper, 'Edit Role Name')!.trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.stub-textfield').setValue('Renamed')
    await findBtnByText(wrapper, 'Save')!.trigger('click')
    await flushPromises()
    expect(updateRole).toHaveBeenCalledWith(1, { name: 'Renamed' })
    expect(wrapper.find('.stub-textfield').exists()).toBe(false)
  })

  it('saveName shows error when updateRole returns false', async () => {
    updateRole.mockResolvedValueOnce(false)
    const wrapper = mountIt()
    await findIconBtnByTitle(wrapper, 'Edit Role Name')!.trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.stub-textfield').setValue('Renamed')
    await findBtnByText(wrapper, 'Save')!.trigger('click')
    await flushPromises()
    expect(wrapper.find('.stub-alert[data-severity="danger"]').exists()).toBe(true)
    expect(wrapper.text()).toMatch(/Failed to update role name/)
  })

  it('saveName catch branch surfaces the thrown Error message', async () => {
    updateRole.mockRejectedValueOnce(new Error('name boom'))
    const wrapper = mountIt()
    await findIconBtnByTitle(wrapper, 'Edit Role Name')!.trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.stub-textfield').setValue('Renamed')
    await findBtnByText(wrapper, 'Save')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toMatch(/name boom/)
  })

  it('saveName catch branch uses the fallback message for a non-Error throw', async () => {
    updateRole.mockRejectedValueOnce('plain failure')
    const wrapper = mountIt()
    await findIconBtnByTitle(wrapper, 'Edit Role Name')!.trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.stub-textfield').setValue('Renamed')
    await findBtnByText(wrapper, 'Save')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toMatch(/An unexpected error occurred/)
  })

  it('cancel exits name edit mode without saving', async () => {
    const wrapper = mountIt()
    await findIconBtnByTitle(wrapper, 'Edit Role Name')!.trigger('click')
    await wrapper.vm.$nextTick()
    await findBtnByText(wrapper, 'Cancel')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.stub-textfield').exists()).toBe(false)
    expect(updateRole).not.toHaveBeenCalled()
  })

  it('saveDescription success closes edit mode', async () => {
    updateRole.mockResolvedValueOnce(true)
    const wrapper = mountIt()
    await findIconBtnByTitle(wrapper, 'Edit Description')!.trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.stub-textfield').setValue('New description')
    await findBtnByText(wrapper, 'Save')!.trigger('click')
    await flushPromises()
    expect(updateRole).toHaveBeenCalledWith(1, { description: 'New description' })
    expect(wrapper.find('.stub-textfield').exists()).toBe(false)
  })

  it('cancel exits description edit mode without saving', async () => {
    const wrapper = mountIt()
    await findIconBtnByTitle(wrapper, 'Edit Description')!.trigger('click')
    await wrapper.vm.$nextTick()
    await findBtnByText(wrapper, 'Cancel')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.stub-textfield').exists()).toBe(false)
    expect(updateRole).not.toHaveBeenCalled()
  })

  it('saveDescription catch branch uses the fallback message for a non-Error throw', async () => {
    updateRole.mockRejectedValueOnce('plain failure')
    const wrapper = mountIt()
    await findIconBtnByTitle(wrapper, 'Edit Description')!.trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.stub-textfield').setValue('New description')
    await findBtnByText(wrapper, 'Save')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toMatch(/An unexpected error occurred/)
  })

  it('saveDescription shows error when updateRole returns false', async () => {
    updateRole.mockResolvedValueOnce(false)
    const wrapper = mountIt()
    await findIconBtnByTitle(wrapper, 'Edit Description')!.trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.stub-textfield').setValue('New description')
    await findBtnByText(wrapper, 'Save')!.trigger('click')
    await flushPromises()
    expect(updateRole).toHaveBeenCalledWith(1, { description: 'New description' })
    expect(wrapper.text()).toMatch(/Failed to update description/)
  })

  it('saveDescription catch branch surfaces the thrown Error message', async () => {
    updateRole.mockRejectedValueOnce(new Error('desc boom'))
    const wrapper = mountIt()
    await findIconBtnByTitle(wrapper, 'Edit Description')!.trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.stub-textfield').setValue('New description')
    await findBtnByText(wrapper, 'Save')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toMatch(/desc boom/)
  })
})
