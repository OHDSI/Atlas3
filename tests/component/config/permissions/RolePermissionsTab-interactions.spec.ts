/**
 * RolePermissionsTab interaction tests
 *
 * Exercises the script-level handlers:
 *  - togglePermission (checkbox click)
 *  - handleSave (Save Changes button)
 *  - isPermissionSelected / hasPermissionChanged / getPermissionString
 *    / getCategoryCount (called from template renderers)
 *  - loadData watch on roleId change
 *
 * The existing smoke spec mounts the component but never exercises the
 * handlers (v8 reports ~8% functions, 71% lines). One click per handler
 * closes the gap.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'

const permissionsRef = ref<unknown[]>([])
const rolePermissionsRef = ref<unknown[]>([])
const isLoadingPermissionsRef = ref(false)
const permissionsErrorRef = ref<string | null>(null)
const assignPermissionToRole = vi.fn().mockResolvedValue(true)
const removePermissionFromRole = vi.fn().mockResolvedValue(true)
const fetchPermissions = vi.fn().mockResolvedValue(true)
const fetchRolePermissions = vi.fn().mockResolvedValue(true)

vi.mock('@/composables/useRoles', () => ({
  useRoles: () => ({
    permissions: permissionsRef,
    rolePermissions: rolePermissionsRef,
    isLoadingPermissions: isLoadingPermissionsRef,
    permissionsError: permissionsErrorRef,
    fetchPermissions,
    fetchRolePermissions,
    assignPermissionToRole,
    removePermissionFromRole,
  }),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import RolePermissionsTab from '@/components/config/permissions/RolePermissionsTab.vue'

const vuetify = createVuetify({ components, directives })

const baselinePermissions = [
  { id: 1, permission: 'cohortdefinition:*:get', description: 'Read cohort', category: 'cohort' },
  { id: 2, value: 'cohortdefinition:*:post', description: 'Write cohort', category: 'cohort' },
  { id: 3, permission: 'config:*:get', description: 'Read config', category: 'config' },
  { id: 4, permission: 'noisy:permission', description: null, category: null },
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
    AtlasChip: {
      name: 'AtlasChip',
      template: '<span class="stub-chip"><slot /></span>',
    },
    AtlasDataTable: {
      name: 'AtlasDataTable',
      props: ['items', 'headers'],
      template:
        '<div class="stub-datatable">' +
        '<div v-for="item in items" :key="item.id" class="stub-row">' +
        '<slot name="item.selected" :item="item" />' +
        '<slot name="item.permission" :item="item" />' +
        '<slot name="item.description" :item="item" />' +
        '<slot name="item.category" :item="item" />' +
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
    AtlasTooltip: { name: 'AtlasTooltip', template: '<span class="stub-tooltip"><slot /></span>' },
    AtlasProgressCircular: {
      name: 'AtlasProgressCircular',
      template: '<div class="stub-progress" />',
    },
  }
}

async function mountIt(opts: { roleId?: number } = {}) {
  setActivePinia(createPinia())
  const wrapper = mount(RolePermissionsTab, {
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

describe('RolePermissionsTab interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    permissionsRef.value = [...baselinePermissions]
    rolePermissionsRef.value = [{ id: 1 }, { id: 3 }]
    isLoadingPermissionsRef.value = false
    permissionsErrorRef.value = null
    assignPermissionToRole.mockResolvedValue(true)
    removePermissionFromRole.mockResolvedValue(true)
  })

  it('renders rows and templates exercising helpers (isPermissionSelected/hasPermissionChanged/getPermissionString)', async () => {
    const wrapper = await mountIt()
    const rows = wrapper.findAll('.stub-row')
    expect(rows.length).toBe(4)
    // Permission code rendered via getPermissionString (handles value fallback)
    const codes = wrapper.findAll('.role-permissions-tab__permission-code').map(c => c.text())
    expect(codes).toContain('cohortdefinition:*:get')
    expect(codes).toContain('cohortdefinition:*:post') // from "value" field
  })

  it('toggles a permission off (was selected → unselected) and exposes change count', async () => {
    const wrapper = await mountIt()
    const checkboxes = wrapper.findAll('.stub-checkbox')
    // Permission id=1 was originally selected; toggling it should remove it
    await checkboxes[0]!.trigger('change')
    await wrapper.vm.$nextTick()
    // Save button should be enabled now (hasChanges true)
    const saveBtn = wrapper.find('.stub-save-btn')
    expect((saveBtn.element as HTMLButtonElement).disabled).toBe(false)
    // change chip rendered
    expect(wrapper.text()).toMatch(/1 change/)
  })

  it('toggles a permission on (was unselected → selected)', async () => {
    const wrapper = await mountIt()
    const checkboxes = wrapper.findAll('.stub-checkbox')
    // id=2 starts unselected, toggle it on
    await checkboxes[1]!.trigger('change')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toMatch(/1 change/)
  })

  it('saves changes: calls assignPermissionToRole for new, removePermissionFromRole for removed', async () => {
    const wrapper = await mountIt()
    const checkboxes = wrapper.findAll('.stub-checkbox')
    // Toggle id=2 ON (add) and id=3 OFF (remove)
    await checkboxes[1]!.trigger('change')
    await checkboxes[2]!.trigger('change')
    await wrapper.vm.$nextTick()
    // Click save
    await wrapper.find('.stub-save-btn').trigger('click')
    await flushPromises()
    expect(assignPermissionToRole).toHaveBeenCalledWith(1, 2)
    expect(removePermissionFromRole).toHaveBeenCalledWith(1, 3)
    // success message appears
    expect(wrapper.text()).toMatch(/Successfully updated/)
  })

  it('reports an error when assignPermissionToRole returns false', async () => {
    assignPermissionToRole.mockResolvedValueOnce(false)
    const wrapper = await mountIt()
    const checkboxes = wrapper.findAll('.stub-checkbox')
    await checkboxes[1]!.trigger('change') // toggle id=2 on
    await wrapper.find('.stub-save-btn').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toMatch(/Failed to assign permission 2/)
  })

  it('reports an error when removePermissionFromRole returns false', async () => {
    removePermissionFromRole.mockResolvedValueOnce(false)
    const wrapper = await mountIt()
    const checkboxes = wrapper.findAll('.stub-checkbox')
    await checkboxes[0]!.trigger('change') // toggle id=1 off
    await wrapper.find('.stub-save-btn').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toMatch(/Failed to remove permission 1/)
  })

  it('handleSave returns early when there are no changes', async () => {
    const wrapper = await mountIt()
    // No toggles; click anyway
    await wrapper.find('.stub-save-btn').trigger('click')
    await flushPromises()
    expect(assignPermissionToRole).not.toHaveBeenCalled()
    expect(removePermissionFromRole).not.toHaveBeenCalled()
  })

  it('filters by search query (debounced 300ms)', async () => {
    vi.useFakeTimers()
    const wrapper = await mountIt()
    const input = wrapper.find('.stub-textfield')
    await input.setValue('config')
    vi.advanceTimersByTime(400)
    await wrapper.vm.$nextTick()
    const codes = wrapper.findAll('.role-permissions-tab__permission-code').map(c => c.text())
    expect(codes).toEqual(['config:*:get'])
    vi.useRealTimers()
  })

  it('renders category counts via getCategoryCount', async () => {
    const wrapper = await mountIt()
    // The category chips include "cohort (2)" and "config (1)"
    expect(wrapper.text()).toMatch(/cohort \(2\)/)
    expect(wrapper.text()).toMatch(/config \(1\)/)
  })

  it('clears the previous debounce timer when search is re-typed quickly', async () => {
    vi.useFakeTimers()
    const wrapper = await mountIt()
    const input = wrapper.find('.stub-textfield')
    await input.setValue('foo')
    // before timer fires, type again to trigger the clearTimeout branch
    vi.advanceTimersByTime(100)
    await input.setValue('config')
    vi.advanceTimersByTime(400)
    await wrapper.vm.$nextTick()
    const codes = wrapper.findAll('.role-permissions-tab__permission-code').map(c => c.text())
    expect(codes).toEqual(['config:*:get'])
    vi.useRealTimers()
  })

  it('filters by selected category when not "all"', async () => {
    const wrapper = await mountIt()
    // The category chip-group uses VChipGroup with mandatory + AtlasChip items.
    // Find the AtlasChip with value="config" and emit its click via v-chip-group.
    // Simplest: locate the chip-group and emit update:modelValue directly.
    const chipGroup = wrapper.findComponent({ name: 'VChipGroup' })
    expect(chipGroup.exists()).toBe(true)
    chipGroup.vm.$emit('update:modelValue', 'config')
    await wrapper.vm.$nextTick()
    const codes = wrapper.findAll('.role-permissions-tab__permission-code').map(c => c.text())
    expect(codes).toEqual(['config:*:get'])
  })

  it('reloads on roleId prop change', async () => {
    const wrapper = await mountIt()
    fetchRolePermissions.mockClear()
    await wrapper.setProps({ roleId: 42 })
    await flushPromises()
    expect(fetchRolePermissions).toHaveBeenCalledWith(42)
  })

  it('shows the loading state when isLoadingPermissions is true', async () => {
    isLoadingPermissionsRef.value = true
    const wrapper = await mountIt()
    expect(wrapper.find('.role-permissions-tab__loading').exists()).toBe(true)
  })

  it('shows error state and allows closing the alert', async () => {
    permissionsErrorRef.value = 'Boom'
    const wrapper = await mountIt()
    const alert = wrapper.find('.stub-alert')
    expect(alert.exists()).toBe(true)
    await alert.find('.stub-alert-close').trigger('click')
    await wrapper.vm.$nextTick()
    // After close, error is cleared and alert no longer renders (since permissionsError is null)
    expect(permissionsErrorRef.value).toBeNull()
  })
})
