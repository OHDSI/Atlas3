/**
 * RoleCreateDialog interaction tests
 *
 * Exercises the script-level handlers:
 *  - handleSubmit (create + edit + no-op edit + error paths)
 *  - handleClose (cancel button / dialog close)
 *  - role prop watcher (immediate + role-change → form populated)
 *
 * The existing smoke test mounts but never triggers any handler.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'

const rolesRef = ref<unknown[]>([])
const createRole = vi.fn()
const updateRole = vi.fn()

vi.mock('@/composables/useRoles', () => ({
  useRoles: () => ({
    roles: rolesRef,
    createRole,
    updateRole,
  }),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import RoleCreateDialog from '@/components/config/permissions/RoleCreateDialog.vue'

const vuetify = createVuetify({ components, directives })

const validForm = {
  name: 'VForm',
  props: ['modelValue'],
  emits: ['update:modelValue', 'submit'],
  methods: {
    validate() {
      return Promise.resolve({ valid: true })
    },
  },
  template:
    '<form class="stub-form" @submit.prevent="$emit(\'submit\', $event)"><slot /></form>',
}

function makeStubs() {
  return {
    VForm: validForm,
    'v-form': validForm,
    AtlasDialog: {
      name: 'AtlasDialog',
      props: ['modelValue', 'title', 'eyebrow'],
      emits: ['update:modelValue', 'close'],
      template:
        '<div class="stub-dialog" :data-open="modelValue">' +
        '<div class="stub-dialog-title">{{ title }}</div>' +
        '<slot />' +
        '<div class="stub-dialog-actions"><slot name="actions" /></div>' +
        '<button class="stub-dialog-close-trigger" @click="$emit(\'close\')" />' +
        '</div>',
    },
    AtlasTextField: {
      name: 'AtlasTextField',
      props: ['modelValue', 'label'],
      emits: ['update:modelValue'],
      template:
        '<input class="stub-textfield" :data-label="label" :value="modelValue" ' +
        '@input="$emit(\'update:modelValue\', $event.target.value)" />',
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
      emits: ['close'],
      template:
        '<div class="stub-alert"><slot /><button class="stub-alert-close" @click="$emit(\'close\')" /></div>',
    },
  }
}

async function mountIt(opts: {
  modelValue?: boolean
  role?: { id: number; name: string; description?: string | null } | null
  formValid?: boolean
} = {}) {
  setActivePinia(createPinia())
  const localValidForm = {
    name: 'VForm',
    props: ['modelValue'],
    emits: ['update:modelValue', 'submit'],
    mounted(this: { $emit: (e: string, v: unknown) => void }) {
      this.$emit('update:modelValue', true)
    },
    methods: {
      validate() {
        return Promise.resolve({ valid: opts.formValid !== false })
      },
    },
    template:
      '<form class="stub-form" @submit.prevent="$emit(\'submit\', $event)"><slot /></form>',
  }
  const wrapper = mount(RoleCreateDialog, {
    props: {
      modelValue: opts.modelValue ?? true,
      role: opts.role ?? null,
    },
    global: {
      plugins: [vuetify],
      stubs: { ...makeStubs(), VForm: localValidForm, 'v-form': localValidForm },
    },
  })
  await flushPromises()
  await wrapper.vm.$nextTick()
  return wrapper
}

function findInputByLabel(wrapper: ReturnType<typeof mount>, label: string) {
  return wrapper.findAll('.stub-textfield').find(w => w.attributes('data-label') === label)
}

function findActionByText(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper.findAll('.stub-btn').find(w => w.text().trim() === text)
}

describe('RoleCreateDialog interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rolesRef.value = []
    createRole.mockReset()
    updateRole.mockReset()
  })

  it('shows "Create New Role" title in create mode and resets form fields', async () => {
    const wrapper = await mountIt({ role: null })
    expect(wrapper.find('.stub-dialog-title').text()).toBe('Create New Role')
    const nameInput = findInputByLabel(wrapper, 'Role Name *')
    expect(nameInput).toBeTruthy()
    expect((nameInput!.element as HTMLInputElement).value).toBe('')
  })

  it('shows "Edit Role" title and populates the form when role is provided', async () => {
    const wrapper = await mountIt({
      role: { id: 7, name: 'admin', description: 'God mode' },
    })
    expect(wrapper.find('.stub-dialog-title').text()).toBe('Edit Role')
    const nameInput = findInputByLabel(wrapper, 'Role Name *')
    expect((nameInput!.element as HTMLInputElement).value).toBe('admin')
  })

  it('clears form when role prop becomes null (back to create mode)', async () => {
    const wrapper = await mountIt({
      role: { id: 7, name: 'admin', description: 'God mode' },
    })
    await wrapper.setProps({ role: null })
    await wrapper.vm.$nextTick()
    const nameInput = findInputByLabel(wrapper, 'Role Name *')
    expect((nameInput!.element as HTMLInputElement).value).toBe('')
  })

  it('handleSubmit creates a new role and emits success + closes', async () => {
    const newRole = { id: 99, name: 'Editor', description: 'edits' }
    createRole.mockResolvedValueOnce(newRole)
    const wrapper = await mountIt({ role: null })
    const nameInput = findInputByLabel(wrapper, 'Role Name *')
    await nameInput!.setValue('Editor')
    const descInput = findInputByLabel(wrapper, 'Description')
    await descInput!.setValue('edits')

    const submitBtn = findActionByText(wrapper, 'Create')
    expect(submitBtn).toBeTruthy()
    await submitBtn!.trigger('click')
    await flushPromises()

    expect(createRole).toHaveBeenCalledWith({ name: 'Editor', description: 'edits' })
    expect(wrapper.emitted('success')).toBeTruthy()
    expect(wrapper.emitted('success')![0]![0]).toEqual(newRole)
    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual([false])
  })

  it('handleSubmit shows server error when createRole returns null', async () => {
    createRole.mockResolvedValueOnce(null)
    const wrapper = await mountIt({ role: null })
    const nameInput = findInputByLabel(wrapper, 'Role Name *')
    await nameInput!.setValue('Editor')
    await findActionByText(wrapper, 'Create')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toMatch(/Failed to create role/)
  })

  it('handleSubmit catches an error thrown by createRole', async () => {
    createRole.mockRejectedValueOnce(new Error('Network boom'))
    const wrapper = await mountIt({ role: null })
    await findInputByLabel(wrapper, 'Role Name *')!.setValue('Editor')
    await findActionByText(wrapper, 'Create')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toMatch(/Network boom/)
  })

  it('handleSubmit edit path: updates role when name has changed', async () => {
    updateRole.mockResolvedValueOnce(true)
    const wrapper = await mountIt({
      role: { id: 7, name: 'admin', description: 'old' },
    })
    await findInputByLabel(wrapper, 'Role Name *')!.setValue('superadmin')
    await findActionByText(wrapper, 'Save')!.trigger('click')
    await flushPromises()
    expect(updateRole).toHaveBeenCalledWith(7, { name: 'superadmin' })
    expect(wrapper.emitted('success')).toBeTruthy()
  })

  it('handleSubmit edit path: updates description when only description changes', async () => {
    updateRole.mockResolvedValueOnce(true)
    const wrapper = await mountIt({
      role: { id: 7, name: 'admin', description: 'old' },
    })
    await findInputByLabel(wrapper, 'Description')!.setValue('new desc')
    await findActionByText(wrapper, 'Save')!.trigger('click')
    await flushPromises()
    expect(updateRole).toHaveBeenCalledWith(7, { description: 'new desc' })
  })

  it('handleSubmit edit path: no-op closes dialog without calling updateRole', async () => {
    const wrapper = await mountIt({
      role: { id: 7, name: 'admin', description: 'old' },
    })
    // No edits at all
    await findActionByText(wrapper, 'Save')!.trigger('click')
    await flushPromises()
    expect(updateRole).not.toHaveBeenCalled()
    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual([false])
  })

  it('handleSubmit edit path: server error when updateRole returns false', async () => {
    updateRole.mockResolvedValueOnce(false)
    const wrapper = await mountIt({
      role: { id: 7, name: 'admin', description: 'old' },
    })
    await findInputByLabel(wrapper, 'Role Name *')!.setValue('renamed')
    await findActionByText(wrapper, 'Save')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toMatch(/Failed to update role/)
  })

  it('handleClose emits update:modelValue false', async () => {
    const wrapper = await mountIt({ role: null })
    await findActionByText(wrapper, 'Cancel')!.trigger('click')
    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual([false])
  })

  it('handleClose via dialog @close event', async () => {
    const wrapper = await mountIt({ role: null })
    await wrapper.find('.stub-dialog-close-trigger').trigger('click')
    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual([false])
  })

  it('dismisses the server error alert when its close fires', async () => {
    createRole.mockResolvedValueOnce(null)
    const wrapper = await mountIt({ role: null })
    await findInputByLabel(wrapper, 'Role Name *')!.setValue('Editor')
    await findActionByText(wrapper, 'Create')!.trigger('click')
    await flushPromises()
    const alert = wrapper.find('.stub-alert')
    expect(alert.exists()).toBe(true)
    await alert.find('.stub-alert-close').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.stub-alert').exists()).toBe(false)
  })

  it('does nothing on submit when form validation fails', async () => {
    setActivePinia(createPinia())
    const wrapper = mount(RoleCreateDialog, {
      props: { modelValue: true, role: null },
      global: {
        plugins: [vuetify],
        stubs: {
          ...makeStubs(),
          VForm: {
            name: 'VForm',
            props: ['modelValue'],
            emits: ['update:modelValue', 'submit'],
            mounted(this: { $emit: (e: string, v: unknown) => void }) {
              this.$emit('update:modelValue', true)
            },
            methods: {
              validate() {
                return Promise.resolve({ valid: false })
              },
            },
            template:
              '<form class="stub-form" @submit.prevent="$emit(\'submit\', $event)"><slot /></form>',
          },
        },
      },
    })
    await flushPromises()
    await findInputByLabel(wrapper, 'Role Name *')!.setValue('whatever')
    await findActionByText(wrapper, 'Create')!.trigger('click')
    await flushPromises()
    expect(createRole).not.toHaveBeenCalled()
  })

  it('catches a non-Error throw with the fallback message', async () => {
    createRole.mockRejectedValueOnce('plain string failure')
    const wrapper = await mountIt({ role: null })
    await findInputByLabel(wrapper, 'Role Name *')!.setValue('Editor')
    await findActionByText(wrapper, 'Create')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toMatch(/An unexpected error occurred/)
  })

  it('name validation rules reject invalid input and accept valid input', async () => {
    rolesRef.value = [{ id: 1, name: 'Existing', description: null }]
    const wrapper = await mountIt({ role: null })

    const rules = (wrapper.vm as unknown as { nameRules: Array<(v: string) => string | boolean> })
      .nameRules
    expect(rules.length).toBeGreaterThanOrEqual(4)

    // required rule
    expect(rules[0]!('')).not.toBe(true)
    expect(rules[0]!('ok')).toBe(true)

    // non-empty / whitespace-only rule
    expect(typeof rules[1]!('   ')).toBe('string')
    expect(rules[1]!('name')).toBe(true)

    // max length (<= 255 chars) rule
    expect(typeof rules[2]!('x'.repeat(300))).toBe('string')
    expect(rules[2]!('short')).toBe(true)

    // duplicate-name rule (case-insensitive, empty passes through)
    expect(rules[3]!('')).toBe(true)
    expect(typeof rules[3]!('Existing')).toBe('string')
    expect(typeof rules[3]!('existing')).toBe('string')
    expect(rules[3]!('BrandNew')).toBe(true)
  })

  it('duplicate-name rule ignores the role being edited', async () => {
    rolesRef.value = [{ id: 7, name: 'admin', description: null }]
    const wrapper = await mountIt({ role: { id: 7, name: 'admin', description: 'God mode' } })

    const rules = (wrapper.vm as unknown as { nameRules: Array<(v: string) => string | boolean> })
      .nameRules
    // Same name, same id -> not a duplicate of another role
    expect(rules[3]!('admin')).toBe(true)
  })
})
