/**
 * RoleUsersTab interaction tests
 *
 * Exercises the script-level handlers:
 *  - toggleUser (checkbox click)
 *  - handleSave (Save Changes button)
 *  - isUserSelected / hasUserChanged (called from template renderers)
 *  - filteredUsers computed (search filter)
 *  - loadData watch on roleId change
 *
 * Pattern mirrors RolePermissionsTab-interactions.spec.ts.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'

const usersRef = ref<unknown[]>([])
const roleUsersRef = ref<unknown[]>([])
const isLoadingUsersRef = ref(false)
const usersErrorRef = ref<string | null>(null)
const assignUserToRole = vi.fn().mockResolvedValue(true)
const removeUserFromRole = vi.fn().mockResolvedValue(true)
const fetchUsers = vi.fn().mockResolvedValue(true)
const fetchRoleUsers = vi.fn().mockResolvedValue(true)

vi.mock('@/composables/useRoles', () => ({
  useRoles: () => ({
    users: usersRef,
    roleUsers: roleUsersRef,
    isLoadingUsers: isLoadingUsersRef,
    usersError: usersErrorRef,
    fetchUsers,
    fetchRoleUsers,
    assignUserToRole,
    removeUserFromRole,
  }),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import RoleUsersTab from '@/components/config/permissions/RoleUsersTab.vue'

const vuetify = createVuetify({ components, directives })

const baselineUsers = [
  { id: 1, login: 'alice', name: 'Alice A', email: 'alice@x.com' },
  { id: 2, login: 'bob', displayName: 'Bob B', email: null },
  { id: 3, login: 'carol', name: null, email: 'carol@x.com' },
  { id: 4, login: 'dave', name: 'Dave', email: 'dave@y.com' },
]

function makeStubs() {
  return {
    AtlasTextField: {
      name: 'AtlasTextField',
      props: ['modelValue'],
      emits: ['update:modelValue'],
      template:
        '<input class="stub-textfield" :value="modelValue" ' +
        '@input="$emit(\'update:modelValue\', $event.target.value)" />',
    },
    AtlasButton: {
      name: 'AtlasButton',
      props: ['disabled', 'loading'],
      emits: ['click'],
      template:
        '<button class="stub-save-btn" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    },
    AtlasCheckbox: {
      name: 'AtlasCheckbox',
      props: ['modelValue'],
      emits: ['update:modelValue'],
      template:
        '<input type="checkbox" class="stub-checkbox" :checked="modelValue" ' +
        '@change="$emit(\'update:modelValue\', !modelValue)" />',
    },
    AtlasChip: { name: 'AtlasChip', template: '<span class="stub-chip"><slot /></span>' },
    AtlasDataTable: {
      name: 'AtlasDataTable',
      props: ['items', 'headers'],
      template:
        '<div class="stub-datatable">' +
        '<div v-for="item in items" :key="item.id" class="stub-row">' +
        '<slot name="item.selected" :item="item" />' +
        '<slot name="item.login" :item="item" />' +
        '<slot name="item.name" :item="item" />' +
        '<slot name="item.email" :item="item" />' +
        '</div>' +
        '</div>',
    },
    AtlasAlert: {
      name: 'AtlasAlert',
      emits: ['close'],
      template:
        '<div class="stub-alert"><slot /><button class="stub-alert-close" @click="$emit(\'close\')" /></div>',
    },
    AtlasIcon: { name: 'AtlasIcon', template: '<span class="stub-icon"><slot /></span>' },
    AtlasProgressCircular: {
      name: 'AtlasProgressCircular',
      template: '<div class="stub-progress" />',
    },
  }
}

async function mountIt(opts: { roleId?: number } = {}) {
  setActivePinia(createPinia())
  const wrapper = mount(RoleUsersTab, {
    props: { roleId: opts.roleId ?? 1 },
    global: {
      plugins: [vuetify],
      stubs: makeStubs(),
    },
  })
  await flushPromises()
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('RoleUsersTab interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usersRef.value = [...baselineUsers]
    roleUsersRef.value = [{ id: 1 }, { id: 3 }]
    isLoadingUsersRef.value = false
    usersErrorRef.value = null
    assignUserToRole.mockResolvedValue(true)
    removeUserFromRole.mockResolvedValue(true)
  })

  it('renders all users (isUserSelected/hasUserChanged invoked via template)', async () => {
    const wrapper = await mountIt()
    const rows = wrapper.findAll('.stub-row')
    expect(rows.length).toBe(4)
    expect(wrapper.text()).toMatch(/alice/)
    expect(wrapper.text()).toMatch(/Bob B/) // displayName fallback
  })

  it('toggles a user off and enables save with change counter', async () => {
    const wrapper = await mountIt()
    const checkboxes = wrapper.findAll('.stub-checkbox')
    await checkboxes[0]!.trigger('change') // toggle id=1 off
    await wrapper.vm.$nextTick()
    const saveBtn = wrapper.find('.stub-save-btn')
    expect((saveBtn.element as HTMLButtonElement).disabled).toBe(false)
    expect(wrapper.text()).toMatch(/1 change/)
  })

  it('toggles a user on (was unselected)', async () => {
    const wrapper = await mountIt()
    const checkboxes = wrapper.findAll('.stub-checkbox')
    await checkboxes[1]!.trigger('change') // toggle id=2 on
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toMatch(/1 change/)
  })

  it('saves changes: assigns new users and removes deselected ones', async () => {
    const wrapper = await mountIt()
    const checkboxes = wrapper.findAll('.stub-checkbox')
    await checkboxes[1]!.trigger('change') // add id=2
    await checkboxes[2]!.trigger('change') // remove id=3
    await wrapper.vm.$nextTick()
    await wrapper.find('.stub-save-btn').trigger('click')
    await flushPromises()
    expect(assignUserToRole).toHaveBeenCalledWith(1, 2)
    expect(removeUserFromRole).toHaveBeenCalledWith(1, 3)
    expect(wrapper.text()).toMatch(/Successfully updated/)
  })

  it('shows an error when assignUserToRole returns false', async () => {
    assignUserToRole.mockResolvedValueOnce(false)
    const wrapper = await mountIt()
    const checkboxes = wrapper.findAll('.stub-checkbox')
    await checkboxes[1]!.trigger('change') // add id=2
    await wrapper.find('.stub-save-btn').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toMatch(/Failed to assign user 2/)
  })

  it('shows an error when removeUserFromRole returns false', async () => {
    removeUserFromRole.mockResolvedValueOnce(false)
    const wrapper = await mountIt()
    const checkboxes = wrapper.findAll('.stub-checkbox')
    await checkboxes[0]!.trigger('change') // remove id=1
    await wrapper.find('.stub-save-btn').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toMatch(/Failed to remove user 1/)
  })

  it('handleSave returns early when there are no changes', async () => {
    const wrapper = await mountIt()
    await wrapper.find('.stub-save-btn').trigger('click')
    await flushPromises()
    expect(assignUserToRole).not.toHaveBeenCalled()
    expect(removeUserFromRole).not.toHaveBeenCalled()
  })

  it('filters by debounced search query', async () => {
    vi.useFakeTimers()
    const wrapper = await mountIt()
    const input = wrapper.find('.stub-textfield')
    await input.setValue('carol')
    vi.advanceTimersByTime(400)
    await wrapper.vm.$nextTick()
    const text = wrapper.text()
    expect(text).toMatch(/carol/)
    expect(text).not.toMatch(/alice/)
    vi.useRealTimers()
  })

  it('clears previous debounce timer when search re-types', async () => {
    vi.useFakeTimers()
    const wrapper = await mountIt()
    const input = wrapper.find('.stub-textfield')
    await input.setValue('foo')
    vi.advanceTimersByTime(100)
    await input.setValue('bob')
    vi.advanceTimersByTime(400)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toMatch(/Bob B/)
    vi.useRealTimers()
  })

  it('reloads on roleId prop change', async () => {
    const wrapper = await mountIt()
    fetchRoleUsers.mockClear()
    await wrapper.setProps({ roleId: 99 })
    await flushPromises()
    expect(fetchRoleUsers).toHaveBeenCalledWith(99)
  })

  it('shows the loading state when isLoadingUsers is true', async () => {
    isLoadingUsersRef.value = true
    const wrapper = await mountIt()
    expect(wrapper.find('.role-users-tab__loading').exists()).toBe(true)
  })

  it('shows the error state and dismisses on close', async () => {
    usersErrorRef.value = 'Boom'
    const wrapper = await mountIt()
    const alert = wrapper.find('.stub-alert')
    expect(alert.exists()).toBe(true)
    await alert.find('.stub-alert-close').trigger('click')
    expect(usersErrorRef.value).toBeNull()
  })
})
