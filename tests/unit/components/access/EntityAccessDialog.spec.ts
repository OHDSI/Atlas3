/**
 * Component Tests: EntityAccessDialog
 */

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import EntityAccessDialog from '@/components/access/EntityAccessDialog.vue'
import { ApiError } from '@/services/api-error'
import { failure, success } from '@/types/api'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

const mockFetchEntityAccessRoles = vi.fn()
const mockLoadRoleSuggestions = vi.fn()
const mockGrantEntityAccess = vi.fn()
const mockRevokeEntityAccess = vi.fn()

vi.mock('@/services/access.service', () => ({
  fetchEntityAccessRoles: (...args: unknown[]) => mockFetchEntityAccessRoles(...args),
  loadRoleSuggestions: (...args: unknown[]) => mockLoadRoleSuggestions(...args),
  grantEntityAccess: (...args: unknown[]) => mockGrantEntityAccess(...args),
  revokeEntityAccess: (...args: unknown[]) => mockRevokeEntityAccess(...args),
}))

const AtlasDialogStub = defineComponent({
  name: 'AtlasDialog',
  props: {
    modelValue: { type: Boolean, required: true },
    maxWidth: { type: [Number, String], required: false, default: 1120 },
    persistent: { type: Boolean, default: false },
    chromeless: { type: Boolean, default: false },
  },
  emits: ['update:modelValue', 'close'],
  template: '<div data-testid="atlas-dialog-stub"><slot /></div>',
})

const AtlasIconButtonStub = defineComponent({
  name: 'AtlasIconButton',
  props: {
    icon: { type: String, required: true },
    ariaLabel: { type: String, required: true },
    variant: { type: String, default: 'tonal' },
    size: { type: String, default: 'md' },
    tone: { type: String, default: 'neutral' },
    loading: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
  },
  emits: ['click'],
  template: '<button :aria-label="ariaLabel" @click="$emit(\'click\', $event)" />',
})

const AtlasButtonStub = defineComponent({
  name: 'AtlasButton',
  props: {
    variant: { type: String, default: 'primary' },
    loading: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
  },
  emits: ['click'],
  template: '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
})

const AtlasAlertStub = defineComponent({
  name: 'AtlasAlert',
  props: {
    severity: { type: String, default: 'info' },
    closable: { type: Boolean, default: false },
  },
  emits: ['close'],
  template: '<div><slot /></div>',
})

const AtlasChipStub = defineComponent({
  name: 'AtlasChip',
  template: '<span><slot /></span>',
})

const AtlasAutocompleteStub = defineComponent({
  name: 'AtlasAutocomplete',
  props: {
    modelValue: { type: String, default: '' },
    items: { type: Array, default: () => [] },
    label: { type: String, default: '' },
    placeholder: { type: String, default: '' },
  },
  emits: ['update:modelValue', 'update:search'],
  template:
    '<input '
    + ':value="modelValue" '
    + 'data-testid="autocomplete-stub" '
    + '@input="$emit(\'update:modelValue\', $event.target.value); $emit(\'update:search\', $event.target.value)" '
    + ' />',
})

const AtlasDataTableStub = defineComponent({
  name: 'AtlasDataTable',
  props: {
    headers: { type: Array, default: () => [] },
    items: { type: Array, default: () => [] },
  },
  template:
    '<div data-testid="data-table-stub">' +
    '  <div v-for="item in items" :key="item.id">' +
    '    <slot name="item.description" :item="item" />' +
    '    <slot name="item.actions" :item="item" />' +
    '  </div>' +
    '</div>',
})

const AtlasProgressLinearStub = defineComponent({
  name: 'AtlasProgressLinear',
  template: '<div data-testid="progress-stub"></div>',
})

function mountComponent(props = {}) {
  return mount(EntityAccessDialog, {
    props: {
      modelValue: true,
      entityType: 'SOURCE',
      entityId: 42,
      title: 'Configure access',
      subtitle: 'OHDSI CDM V5 Database [OHDSI-CDMV5]',
      ...props,
    },
    global: {
      stubs: {
        AtlasDialog: AtlasDialogStub,
        AtlasIconButton: AtlasIconButtonStub,
        AtlasButton: AtlasButtonStub,
        AtlasAlert: AtlasAlertStub,
        AtlasChip: AtlasChipStub,
        AtlasAutocomplete: AtlasAutocompleteStub,
        AtlasDataTable: AtlasDataTableStub,
        AtlasProgressLinear: AtlasProgressLinearStub,
        'v-card': { template: '<div><slot /></div>' },
        'v-divider': { template: '<hr />' },
      },
    },
  })
}

describe('EntityAccessDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchEntityAccessRoles.mockResolvedValue(success([]))
    mockLoadRoleSuggestions.mockResolvedValue(success([]))
    mockGrantEntityAccess.mockResolvedValue(success(undefined))
    mockRevokeEntityAccess.mockResolvedValue(success(undefined))
  })

  it('renders the sticky header and scrollable content containers', async () => {
    const wrapper = mountComponent()

    await flushPromises()

    expect(wrapper.find('.entity-access-dialog__header').exists()).toBe(true)
    expect(wrapper.find('.entity-access-dialog__scroll').exists()).toBe(true)
    expect(wrapper.text()).toContain('Configure access')
    expect(wrapper.text()).toContain('OHDSI CDM V5 Database [OHDSI-CDMV5]')
  })

  it('loads source access data when opened', async () => {
    const wrapper = mountComponent()

    await flushPromises()

    expect(mockFetchEntityAccessRoles).toHaveBeenCalledWith('SOURCE', 42, 'READ')
    expect(mockFetchEntityAccessRoles).toHaveBeenCalledWith('SOURCE', 42, 'WRITE')
    expect(mockLoadRoleSuggestions).toHaveBeenCalledWith('')

    const dataTable = wrapper.findComponent({ name: 'AtlasDataTable' })
    expect(dataTable.exists()).toBe(true)
    expect(dataTable.props('items')).toEqual([])
  })

  it('shows the entity-missing warning when no entity id is available', async () => {
    const wrapper = mountComponent({ entityId: null })

    await flushPromises()

    expect(wrapper.text()).toContain('Save the asset before assigning permissions.')
    expect(mockFetchEntityAccessRoles).not.toHaveBeenCalledWith('SOURCE', null, 'READ')
  })

  it('surfaces load errors from access lookups', async () => {
    mockFetchEntityAccessRoles.mockResolvedValueOnce(
      failure(new ApiError('Access lookup failed', 500, null))
    )

    const wrapper = mountComponent()

    await flushPromises()

    expect(wrapper.text()).toContain('Access lookup failed')
  })

  it('loads new suggestions and grants read/write access from the autocomplete inputs', async () => {
    vi.useFakeTimers()
    mockLoadRoleSuggestions.mockResolvedValue(
      success([
        { id: 1, name: 'Reader', description: null },
        { id: 2, name: 'Writer', description: null },
      ])
    )
    mockFetchEntityAccessRoles.mockResolvedValue(
      success([
        { id: 1, name: 'Reader', description: null },
        { id: 2, name: 'Writer', description: null },
      ])
    )

    const wrapper = mountComponent()
    await flushPromises()

    const inputs = wrapper.findAll('[data-testid="autocomplete-stub"]')
    expect(inputs).toHaveLength(2)

    await inputs[0].setValue('Reader')
    await inputs[1].setValue('Writer')
    await vi.runAllTimersAsync()
    await flushPromises()

    const addButtons = wrapper.findAll('button').filter(button => button.text() === 'Add')
    expect(addButtons).toHaveLength(2)

    await addButtons[0].trigger('click')
    await addButtons[1].trigger('click')
    await flushPromises()

    expect(mockGrantEntityAccess).toHaveBeenCalledWith('SOURCE', 42, 1, 'READ')
    expect(mockGrantEntityAccess).toHaveBeenCalledWith('SOURCE', 42, 2, 'WRITE')
    vi.useRealTimers()
  })

  it('surfaces a role-not-found error when the typed role does not match suggestions', async () => {
    mockLoadRoleSuggestions.mockResolvedValue(success([{ id: 1, name: 'Reader', description: null }]))

    const wrapper = mountComponent()
    await flushPromises()

    const input = wrapper.find('[data-testid="autocomplete-stub"]')
    await input.setValue('Unknown role')
    await flushPromises()

    const addButton = wrapper.findAll('button').find(button => button.text() === 'Add')
    expect(addButton).toBeTruthy()
    await addButton!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Select a role from the list.')
  })

  it('retries and revokes access entries from the table actions', async () => {
    mockFetchEntityAccessRoles
      .mockResolvedValueOnce(success([{ id: 11, name: 'Reader', description: 'desc' }]))
      .mockResolvedValueOnce(success([{ id: 22, name: 'Writer', description: 'desc' }]))
      .mockResolvedValueOnce(success([]))
      .mockResolvedValueOnce(success([]))
    mockLoadRoleSuggestions.mockResolvedValue(success([]))

    const wrapper = mountComponent()
    await flushPromises()

    const revokeButtons = wrapper
      .findAll('button')
      .filter(button => button.attributes('aria-label') === 'Revoke')

    expect(revokeButtons.length).toBeGreaterThan(0)
    await revokeButtons[0].trigger('click')
    await flushPromises()

    expect(mockRevokeEntityAccess).toHaveBeenCalledWith('SOURCE', 42, 11, 'READ')
  })

  it('hides revoke buttons when canRevokeRole returns false', async () => {
    mockFetchEntityAccessRoles.mockResolvedValue(
      success([{ id: 11, name: 'Reader', description: 'desc' }])
    )

    const wrapper = mountComponent({ canRevokeRole: () => false })
    await flushPromises()

    expect(wrapper.text()).toContain('—')
  })

  it('emits update:modelValue when the close button is clicked', async () => {
    const wrapper = mountComponent()

    await flushPromises()

    const closeButton = wrapper.findComponent({ name: 'AtlasIconButton' })
    expect(closeButton.exists()).toBe(true)

    await closeButton.vm.$emit('click', new MouseEvent('click'))

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
  })
})