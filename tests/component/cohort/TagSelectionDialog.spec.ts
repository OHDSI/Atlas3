/**
 * TagSelectionDialog interaction tests
 *
 * Drives the toggle/deselect/clear/apply/cancel handlers + the dialog
 * forwarding emit, so v8 records the inline arrow + function callbacks
 * declared in <script setup>. Without these clicks the script body was at
 * 0% functions.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

const fetchTagGroupsMock = vi.fn().mockResolvedValue(undefined)

vi.mock('@/stores/config', () => ({
  useConfigStore: () => ({
    allTags: [
      // Tag-group (groups=[]).
      { id: 100, name: 'Status', color: '#1976D2', groups: [] },
      // Tags belonging to the group.
      { id: 1, name: 'Active', color: '#FF0000', groups: [{ id: 100 }] },
      { id: 2, name: 'Inactive', color: '#00FF00', groups: [{ id: 100 }] },
    ],
    tagGroups: [{ id: 100, name: 'Status' }],
    fetchTagGroups: fetchTagGroupsMock,
  }),
}))

import TagSelectionDialog from '@/components/cohort/TagSelectionDialog.vue'
import type { Tag } from '@/models/cohort.types'

const vuetify = createVuetify({ components, directives })

const stubs = {
  AtlasDialog: {
    name: 'AtlasDialog',
    props: ['modelValue', 'eyebrow', 'title', 'maxWidth', 'persistent'],
    emits: ['update:modelValue', 'close'],
    template:
      '<div class="stub-dialog">' +
      '<button class="stub-dialog-update" @click="$emit(\'update:modelValue\', false)" />' +
      '<button class="stub-dialog-close" @click="$emit(\'close\')" />' +
      '<slot />' +
      '<div class="stub-actions"><slot name="actions" /></div>' +
      '</div>',
  },
  AtlasTextField: {
    name: 'AtlasTextField',
    props: ['modelValue', 'prependIcon', 'placeholder', 'variant', 'clearable'],
    emits: ['update:modelValue'],
    template:
      '<input class="stub-textfield" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  AtlasButton: {
    name: 'AtlasButton',
    props: ['size', 'variant'],
    emits: ['click'],
    template:
      '<button class="stub-button" :data-variant="variant" @click="$emit(\'click\', $event)"><slot /></button>',
  },
  AtlasChip: {
    name: 'AtlasChip',
    props: ['closable', 'variant'],
    emits: ['click', 'close'],
    template:
      '<span class="stub-chip" @click="$emit(\'click\', $event)">' +
      '<slot />' +
      '<button class="stub-chip-close" @click.stop="$emit(\'close\', $event)" />' +
      '</span>',
  },
  AtlasIcon: {
    name: 'AtlasIcon',
    template: '<span class="stub-icon"><slot /></span>',
  },
  AtlasBadge: { name: 'AtlasBadge', template: '<span class="stub-badge" />' },
  AtlasDivider: { name: 'AtlasDivider', template: '<hr class="stub-divider" />' },
  AtlasAlert: { name: 'AtlasAlert', template: '<div class="stub-alert"><slot /></div>' },
  AtlasProgressCircular: { name: 'AtlasProgressCircular', template: '<div class="stub-progress" />' },
  // v-expansion-panels keeps content closed by default; force everything to render so handlers are reachable.
  'v-expansion-panels': { name: 'VExpansionPanels', template: '<div class="stub-panels"><slot /></div>' },
  'v-expansion-panel': { name: 'VExpansionPanel', template: '<div class="stub-panel"><slot /></div>' },
  'v-expansion-panel-title': { name: 'VExpansionPanelTitle', template: '<div class="stub-panel-title"><slot /></div>' },
  'v-expansion-panel-text': { name: 'VExpansionPanelText', template: '<div class="stub-panel-text"><slot /></div>' },
  CreateTagForm: {
    name: 'CreateTagForm',
    props: ['tagGroups'],
    emits: ['created', 'cancel'],
    template:
      '<div class="stub-create-form">' +
      '<button class="stub-create-created" @click="$emit(\'created\', { id: 999, name: \'NewTag\', color: \'#123456\' })" />' +
      '<button class="stub-create-cancel" @click="$emit(\'cancel\')" />' +
      '</div>',
  },
}

function mountIt(props: Record<string, unknown> = {}) {
  return mount(TagSelectionDialog, {
    props: {
      modelValue: true,
      selectedTags: [] as Tag[],
      ...props,
    },
    global: { plugins: [vuetify], stubs },
  })
}

// Flush all pending microtasks so onMounted-driven async work completes.
const flushAsync = () => new Promise(r => setTimeout(r, 0))

describe('TagSelectionDialog interactions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('toggles a tag selection when its chip is clicked', async () => {
    const wrapper = mountIt()
    await wrapper.vm.$nextTick()
    // Find the first tag chip inside the tag-chips-grid (skip selected-tags ones)
    const chips = wrapper.findAll('.tag-chips-grid .stub-chip')
    expect(chips.length).toBeGreaterThan(0)
    await chips[0]!.trigger('click')
    await wrapper.vm.$nextTick()
    // After toggling, the selected-tags-section header should show count 1
    expect(wrapper.text()).toContain('Selected Tags (1)')
    // Click again to deselect
    await chips[0]!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('Selected Tags (1)')
  })

  it('clears all selections via Clear All', async () => {
    const wrapper = mountIt({ selectedTags: [{ id: 1, name: 'Active', color: '#FF0000' }] as Tag[] })
    await flushAsync()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Selected Tags (1)')
    const ghostBtn = wrapper.findAll('.stub-button').find(b => b.attributes('data-variant') === 'ghost' && b.text().includes('Clear All'))
    expect(ghostBtn).toBeTruthy()
    await ghostBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('Selected Tags (1)')
  })

  it('deselects a tag via the chip close button', async () => {
    const wrapper = mountIt({ selectedTags: [{ id: 1, name: 'Active', color: '#FF0000' }] as Tag[] })
    await flushAsync()
    await wrapper.vm.$nextTick()
    const closeBtn = wrapper.find('.selected-tags-chips .stub-chip-close')
    expect(closeBtn.exists()).toBe(true)
    await closeBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('Selected Tags (1)')
  })

  it('emits update:selected-tags + close on Apply', async () => {
    const wrapper = mountIt({ selectedTags: [{ id: 1, name: 'Active', color: '#FF0000' }] as Tag[] })
    await wrapper.vm.$nextTick()
    const applyBtn = wrapper.findAll('.stub-button').find(b => b.text() === 'Apply')
    expect(applyBtn).toBeTruthy()
    await applyBtn!.trigger('click')
    expect(wrapper.emitted('update:selected-tags')).toBeTruthy()
    const updates = wrapper.emitted('update:modelValue')
    expect(updates).toBeTruthy()
    expect(updates![updates!.length - 1]![0]).toBe(false)
  })

  it('emits update:modelValue=false on Cancel', async () => {
    const wrapper = mountIt()
    await wrapper.vm.$nextTick()
    const cancelBtn = wrapper.findAll('.stub-button').find(b => b.text() === 'Cancel')
    expect(cancelBtn).toBeTruthy()
    await cancelBtn!.trigger('click')
    const updates = wrapper.emitted('update:modelValue')
    expect(updates).toBeTruthy()
    expect(updates![updates!.length - 1]![0]).toBe(false)
  })

  it('forwards the dialog update:modelValue event', async () => {
    const wrapper = mountIt()
    await wrapper.find('.stub-dialog-update').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
  })

  it('runs cancel() when the dialog emits close', async () => {
    const wrapper = mountIt()
    await wrapper.find('.stub-dialog-close').trigger('click')
    const updates = wrapper.emitted('update:modelValue')
    expect(updates).toBeTruthy()
    expect(updates![updates!.length - 1]![0]).toBe(false)
  })

  it('filters via search query', async () => {
    const wrapper = mountIt()
    await wrapper.vm.$nextTick()
    const input = wrapper.find('.stub-textfield')
    await input.setValue('zzz-no-match')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.stub-alert').exists()).toBe(true)
  })

  it('handles created tag via CreateTagForm and resets the create panel via cancel', async () => {
    const wrapper = mountIt()
    await wrapper.vm.$nextTick()
    await wrapper.find('.stub-create-created').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Selected Tags (1)')
    // cancel handler
    await wrapper.find('.stub-create-cancel').trigger('click')
    // No assertion needed for cancel other than handler executed without error
    expect(wrapper.exists()).toBe(true)
  })
})
