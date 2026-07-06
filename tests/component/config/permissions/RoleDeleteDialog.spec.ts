/**
 * RoleDeleteDialog tests
 *
 * Covers handleDelete outcomes:
 *  - success → emits success + closes
 *  - deleteRole returns false → deleteRoleError shown (130-133)
 *  - deleteRole throws an Error → error.message shown (135-140)
 *  - deleteRole throws a non-Error → unexpectedError fallback shown (135-140)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const deleteRole = vi.fn()

vi.mock('@/composables/useRoles', () => ({
  useRoles: () => ({ deleteRole }),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import RoleDeleteDialog from '@/components/config/permissions/RoleDeleteDialog.vue'

const vuetify = createVuetify({ components, directives })

function makeStubs() {
  return {
    AtlasDialog: {
      name: 'AtlasDialog',
      props: ['modelValue', 'title', 'eyebrow'],
      emits: ['update:modelValue', 'close'],
      template:
        '<div class="stub-dialog" :data-open="modelValue"><slot />' +
        '<div class="stub-dialog-actions"><slot name="actions" /></div></div>',
    },
    AtlasButton: {
      name: 'AtlasButton',
      props: ['disabled', 'loading', 'variant'],
      emits: ['click'],
      template:
        '<button class="stub-btn" :data-variant="variant" :disabled="disabled" ' +
        '@click="$emit(\'click\', $event)"><slot /></button>',
    },
    AtlasAlert: {
      name: 'AtlasAlert',
      props: ['severity'],
      emits: ['close'],
      template: '<div class="stub-alert" :data-severity="severity"><slot /></div>',
    },
  }
}

function mountDialog() {
  setActivePinia(createPinia())
  return mount(RoleDeleteDialog, {
    props: {
      modelValue: true,
      role: { id: 5, name: 'Editor', description: null },
      userCount: 0,
    },
    global: { plugins: [vuetify], stubs: makeStubs() },
  })
}

function deleteButton(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('.stub-btn').find(b => b.text().trim() === 'Delete Role')
}

function serverAlert(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('.stub-alert').find(a => a.attributes('data-severity') === 'danger')
}

describe('RoleDeleteDialog handleDelete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    deleteRole.mockReset()
  })

  it('emits success and closes when deletion succeeds', async () => {
    deleteRole.mockResolvedValueOnce(true)
    const wrapper = mountDialog()

    await deleteButton(wrapper)!.trigger('click')
    await flushPromises()

    expect(deleteRole).toHaveBeenCalledWith(5)
    expect(wrapper.emitted('success')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual([false])
    expect(serverAlert(wrapper)).toBeFalsy()
  })

  it('shows the delete-role error when deleteRole resolves false (130-133)', async () => {
    deleteRole.mockResolvedValueOnce(false)
    const wrapper = mountDialog()

    await deleteButton(wrapper)!.trigger('click')
    await flushPromises()

    expect(wrapper.emitted('success')).toBeFalsy()
    expect(serverAlert(wrapper)!.text()).toMatch(/Failed to delete role/)
  })

  it('surfaces the Error message when deleteRole throws an Error (135-140)', async () => {
    deleteRole.mockRejectedValueOnce(new Error('Role is in use'))
    const wrapper = mountDialog()

    await deleteButton(wrapper)!.trigger('click')
    await flushPromises()

    expect(serverAlert(wrapper)!.text()).toContain('Role is in use')
  })

  it('falls back to the unexpected-error message for a non-Error rejection (135-140)', async () => {
    deleteRole.mockRejectedValueOnce('plain string failure')
    const wrapper = mountDialog()

    await deleteButton(wrapper)!.trigger('click')
    await flushPromises()

    expect(serverAlert(wrapper)!.text()).toMatch(/An unexpected error occurred/)
  })
})
