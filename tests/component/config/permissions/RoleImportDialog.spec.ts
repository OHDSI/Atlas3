/**
 * RoleImportDialog tests
 *
 * Drives the multi-step import flow to cover the template branches and
 * script handlers: file select -> validate -> preview / conflict / error -> import.
 *
 * Notes for this environment:
 *  - jsdom's File has no `.text()` method, so file arguments are plain
 *    file-like objects `{ name, text() }` passed straight to handleFileSelect.
 *  - The component is `<script setup>`; its top-level refs, consts and
 *    functions are reachable via `wrapper.vm` in dev/test builds.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'

const rolesRef = ref<Array<{ id: number; name: string }>>([])
const importRole = vi.fn()

vi.mock('@/composables/useRoles', () => ({
  useRoles: () => ({
    roles: rolesRef,
    importRole,
  }),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import RoleImportDialog from '@/components/config/permissions/RoleImportDialog.vue'

const vuetify = createVuetify({ components, directives })

interface Vm {
  jsonData: string | null
  fileError: string | null
  errorMessage: string | null
  parsedRoleName: string
  parsedDescription: string
  permissionCount: number
  userCount: number
  hasConflict: boolean
  conflictResolution: 'skip' | 'rename'
  newRoleName: string
  isValidating: boolean
  validationComplete: boolean
  validationWarnings: string[]
  importing: boolean
  nameRules: Array<(v: string) => true | string>
  isNewNameValid: boolean
  displayRoleName: string
  handleFileSelect: (files: unknown) => Promise<void>
  validateImportData: (data: string) => Promise<void>
  handleConflictResolution: () => void
  handleImport: () => Promise<void>
  $nextTick: () => Promise<void>
}

const AtlasDialogStub = {
  name: 'AtlasDialog',
  props: ['modelValue', 'title', 'eyebrow'],
  emits: ['update:modelValue', 'close'],
  template:
    '<div class="stub-dialog"><slot /><div class="stub-actions"><slot name="actions" /></div></div>',
}

function mountDialog() {
  setActivePinia(createPinia())
  const wrapper = mount(RoleImportDialog, {
    props: { modelValue: true },
    global: {
      plugins: [vuetify],
      stubs: { AtlasDialog: AtlasDialogStub },
    },
  })
  return wrapper
}

function fileLike(name: string, contents: string | (() => Promise<string>)) {
  return {
    name,
    text: () =>
      typeof contents === 'function' ? contents() : Promise.resolve(contents),
  }
}

const validRolePayload = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    role: {
      name: 'Analyst',
      description: 'Reads data',
      permissions: [{ id: 1 }, { id: 2 }, { id: 3 }],
      users: [{ id: 10 }, { id: 11 }],
      ...overrides,
    },
  })

describe('RoleImportDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rolesRef.value = []
    importRole.mockReset()
  })

  it('renders the "Ready to Import" preview for a valid role file', async () => {
    const wrapper = mountDialog()
    const vm = wrapper.vm as unknown as Vm

    await vm.handleFileSelect([fileLike('role.json', validRolePayload())])
    await flushPromises()
    await vm.$nextTick()

    expect(vm.validationComplete).toBe(true)
    expect(vm.hasConflict).toBe(false)
    expect(vm.parsedRoleName).toBe('Analyst')
    expect(vm.parsedDescription).toBe('Reads data')
    expect(vm.permissionCount).toBe(3)
    expect(vm.userCount).toBe(2)
    expect(vm.validationWarnings).toEqual([])
    expect(vm.displayRoleName).toBe('Analyst')

    const text = wrapper.text()
    expect(text).toContain('Ready to Import')
    expect(text).toContain('Analyst')
    expect(text).toContain('Reads data')
    expect(text).toContain('3')
    expect(text).toContain('2')
  })

  it('shows warnings when the role has no permissions and no users', async () => {
    const wrapper = mountDialog()
    const vm = wrapper.vm as unknown as Vm

    await vm.handleFileSelect([
      fileLike(
        'role.json',
        JSON.stringify({ role: { name: 'Empty', permissions: [], users: [] } })
      ),
    ])
    await flushPromises()
    await vm.$nextTick()

    expect(vm.validationComplete).toBe(true)
    expect(vm.permissionCount).toBe(0)
    expect(vm.userCount).toBe(0)
    expect(vm.validationWarnings).toHaveLength(2)
    expect(vm.validationWarnings.join(' ')).toMatch(/no permissions/i)
    expect(vm.validationWarnings.join(' ')).toMatch(/no users/i)
    expect(wrapper.text()).toContain('Warnings')
    // No description provided -> description preview line is hidden
    expect(vm.parsedDescription).toBe('')
  })

  it('renders the conflict UI when a role with the same name exists', async () => {
    rolesRef.value = [{ id: 1, name: 'Analyst' }]
    const wrapper = mountDialog()
    const vm = wrapper.vm as unknown as Vm

    await vm.handleFileSelect([fileLike('role.json', validRolePayload())])
    await flushPromises()
    await vm.$nextTick()

    expect(vm.hasConflict).toBe(true)
    expect(vm.validationComplete).toBe(false)
    const text = wrapper.text()
    expect(text).toContain('Role Name Conflict')
    expect(text).toContain('Analyst')
    expect(text).toContain('already exists')

    // Switch to rename -> the new-role-name field appears
    vm.conflictResolution = 'rename'
    await vm.$nextTick()
    expect(wrapper.text()).toContain('New Role Name')
  })

  describe('name validation rules', () => {
    it('covers required / non-empty / max-length / duplicate rules', () => {
      rolesRef.value = [{ id: 1, name: 'Analyst' }]
      const wrapper = mountDialog()
      const vm = wrapper.vm as unknown as Vm
      const [required, nonEmpty, maxLen, duplicate] = vm.nameRules

      // required
      expect(required('')).not.toBe(true)
      expect(required('Editor')).toBe(true)

      // non-empty (whitespace only)
      expect(nonEmpty('   ')).not.toBe(true)
      expect(nonEmpty('Editor')).toBe(true)

      // max length
      expect(maxLen('x'.repeat(300))).not.toBe(true)
      expect(maxLen('Editor')).toBe(true)

      // duplicate against existing roles
      expect(duplicate('')).toBe(true)
      expect(duplicate('analyst')).not.toBe(true)
      expect(duplicate('Unique Name')).toBe(true)
    })

    it('isNewNameValid reflects rule results for the rename field', async () => {
      rolesRef.value = [{ id: 1, name: 'Analyst' }]
      const wrapper = mountDialog()
      const vm = wrapper.vm as unknown as Vm

      vm.newRoleName = ''
      await vm.$nextTick()
      expect(vm.isNewNameValid).toBe(false)

      vm.newRoleName = 'Analyst'
      await vm.$nextTick()
      expect(vm.isNewNameValid).toBe(false)

      vm.newRoleName = 'Fresh Role'
      await vm.$nextTick()
      expect(vm.isNewNameValid).toBe(true)
      expect(vm.displayRoleName).toBe('') // rename not active, nothing parsed yet

      vm.conflictResolution = 'rename'
      await vm.$nextTick()
      expect(vm.displayRoleName).toBe('Fresh Role')
    })
  })

  describe('file / validation error handlers', () => {
    it('rejects a non-JSON file extension', async () => {
      const wrapper = mountDialog()
      const vm = wrapper.vm as unknown as Vm

      await vm.handleFileSelect([fileLike('role.txt', '{}')])
      await flushPromises()

      expect(vm.fileError).toMatch(/JSON file/i)
      expect(vm.jsonData).toBeNull()
    })

    it('surfaces a file read error (Error instance -> message)', async () => {
      const wrapper = mountDialog()
      const vm = wrapper.vm as unknown as Vm

      await vm.handleFileSelect([
        fileLike('role.json', () => Promise.reject(new Error('disk boom'))),
      ])
      await flushPromises()

      expect(vm.errorMessage).toBe('disk boom')
    })

    it('surfaces a file read error (non-Error -> fallback message)', async () => {
      const wrapper = mountDialog()
      const vm = wrapper.vm as unknown as Vm

      await vm.handleFileSelect([
        fileLike('role.json', () => Promise.reject('nope')),
      ])
      await flushPromises()

      expect(vm.errorMessage).toMatch(/Failed to read file/i)
    })

    it('reports invalid JSON syntax', async () => {
      const wrapper = mountDialog()
      const vm = wrapper.vm as unknown as Vm

      await vm.handleFileSelect([fileLike('role.json', 'this is not json')])
      await flushPromises()

      expect(vm.errorMessage).toMatch(/Invalid JSON/i)
      expect(vm.validationComplete).toBe(false)
    })

    it('reports a missing role name (invalid import format)', async () => {
      const wrapper = mountDialog()
      const vm = wrapper.vm as unknown as Vm

      await vm.handleFileSelect([
        fileLike('role.json', JSON.stringify({ role: { description: 'x' } })),
      ])
      await flushPromises()

      expect(vm.errorMessage).toMatch(/missing role name/i)
    })
  })

  it('shows the validating spinner while validation is in flight', async () => {
    const wrapper = mountDialog()
    const vm = wrapper.vm as unknown as Vm

    vm.jsonData = validRolePayload()
    vm.hasConflict = false
    vm.validationComplete = false
    vm.isValidating = true
    await vm.$nextTick()

    expect(wrapper.text()).toContain('Validating import data')
  })

  it('runs the modelValue watcher when the dialog prop toggles closed', async () => {
    const wrapper = mountDialog()
    const vm = wrapper.vm as unknown as Vm

    await vm.handleFileSelect([fileLike('role.json', validRolePayload())])
    await flushPromises()
    expect(vm.jsonData).not.toBeNull()

    await wrapper.setProps({ modelValue: false })
    await vm.$nextTick()
    await wrapper.setProps({ modelValue: true })
    await vm.$nextTick()
  })

  describe('conflict resolution', () => {
    it('cancels the import when the user chooses "skip"', async () => {
      rolesRef.value = [{ id: 1, name: 'Analyst' }]
      const wrapper = mountDialog()
      const vm = wrapper.vm as unknown as Vm

      await vm.handleFileSelect([fileLike('role.json', validRolePayload())])
      await flushPromises()
      expect(vm.hasConflict).toBe(true)

      vm.conflictResolution = 'skip'
      await vm.$nextTick()
      vm.handleConflictResolution()
      await vm.$nextTick()

      // handleClose reset the parsed state and emitted the close event.
      expect(vm.jsonData).toBeNull()
      expect(vm.hasConflict).toBe(false)
      expect(vm.parsedRoleName).toBe('')
      expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual([false])
    })

    it('rewrites the JSON name and advances to the preview on rename', async () => {
      rolesRef.value = [{ id: 1, name: 'Analyst' }]
      const wrapper = mountDialog()
      const vm = wrapper.vm as unknown as Vm

      await vm.handleFileSelect([fileLike('role.json', validRolePayload())])
      await flushPromises()
      expect(vm.hasConflict).toBe(true)

      vm.conflictResolution = 'rename'
      vm.newRoleName = 'Analyst Copy'
      await vm.$nextTick()

      vm.handleConflictResolution()
      await vm.$nextTick()

      expect(vm.hasConflict).toBe(false)
      expect(vm.validationComplete).toBe(true)
      expect(JSON.parse(vm.jsonData!).role.name).toBe('Analyst Copy')
    })

    it('sets an error when the stored JSON can no longer be parsed', async () => {
      const wrapper = mountDialog()
      const vm = wrapper.vm as unknown as Vm

      vm.jsonData = 'not-json-anymore'
      vm.hasConflict = true
      vm.conflictResolution = 'rename'
      vm.newRoleName = 'Whatever'
      await vm.$nextTick()

      vm.handleConflictResolution()
      await vm.$nextTick()

      expect(vm.errorMessage).toMatch(/Failed to update role name/i)
    })
  })

  describe('import handler', () => {
    async function reachPreview(vm: Vm) {
      await vm.handleFileSelect([fileLike('role.json', validRolePayload())])
      await flushPromises()
    }

    it('emits success and closes on a successful import', async () => {
      const wrapper = mountDialog()
      const vm = wrapper.vm as unknown as Vm
      importRole.mockResolvedValueOnce({ id: 99, name: 'Analyst' })

      await reachPreview(vm)
      await vm.handleImport()
      await flushPromises()

      expect(importRole).toHaveBeenCalledOnce()
      expect(wrapper.emitted('success')).toBeTruthy()
      expect(wrapper.emitted('success')![0]).toEqual(['Analyst'])
      expect(vm.errorMessage).toBeNull()
    })

    it('shows a retry message when import returns null', async () => {
      const wrapper = mountDialog()
      const vm = wrapper.vm as unknown as Vm
      importRole.mockResolvedValueOnce(null)

      await reachPreview(vm)
      await vm.handleImport()
      await flushPromises()

      expect(vm.errorMessage).toMatch(/Failed to import role/i)
      expect(wrapper.emitted('success')).toBeFalsy()
    })

    it('surfaces a thrown import error (Error instance -> message)', async () => {
      const wrapper = mountDialog()
      const vm = wrapper.vm as unknown as Vm
      importRole.mockRejectedValueOnce(new Error('server exploded'))

      await reachPreview(vm)
      await vm.handleImport()
      await flushPromises()

      expect(vm.errorMessage).toBe('server exploded')
    })

    it('surfaces a thrown import error (non-Error -> fallback message)', async () => {
      const wrapper = mountDialog()
      const vm = wrapper.vm as unknown as Vm
      importRole.mockRejectedValueOnce('kaboom')

      await reachPreview(vm)
      await vm.handleImport()
      await flushPromises()

      expect(vm.errorMessage).toMatch(/Failed to import role/i)
    })

    it('no-ops when there is no JSON to import', async () => {
      const wrapper = mountDialog()
      const vm = wrapper.vm as unknown as Vm

      await vm.handleImport()
      await flushPromises()

      expect(importRole).not.toHaveBeenCalled()
    })
  })
})
