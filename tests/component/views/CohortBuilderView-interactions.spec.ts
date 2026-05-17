/**
 * CohortBuilderView interaction tests
 *
 * Exercises every script-level handler:
 *  - onTitleInput / onSubtitleInput (hero text inputs)
 *  - onUpdateName / onUpdateDescription (forwarded from cohort-builder)
 *  - the toolbar emit handlers wired into cohort-toolbar-status /
 *    cohort-toolbar-actions
 *
 * The CohortBuilder child is stubbed so the View test stays focused on the
 * hero shell + toolbar handlers. Without this spec the script body is at 0%
 * functions even though the template renders.
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

// Spies for handler calls — declared with vi.hoisted so vi.mock can capture
// them and tests can read them back.
const {
  openConceptSetsDialog,
  openValidationDialog,
  openVersionsDialog,
  openTagsDialog,
  handleCancel,
  handleSave,
} = vi.hoisted(() => ({
  openConceptSetsDialog: vi.fn(),
  openValidationDialog: vi.fn(),
  openVersionsDialog: vi.fn(),
  openTagsDialog: vi.fn(),
  handleCancel: vi.fn(),
  handleSave: vi.fn(),
}))

// Stub the CohortBuilder child so we don't need its store wiring.
vi.mock('@/components/cohort/CohortBuilder.vue', () => ({
  default: {
    name: 'CohortBuilder',
    props: ['id', 'name', 'description', 'hideInternalBreadcrumb', 'hideInternalToolbar'],
    emits: ['update:name', 'update:description'],
    template:
      '<div class="stub-cohort-builder">' +
      '<button class="stub-update-name" @click="$emit(\'update:name\', \'From Child\')" />' +
      '<button class="stub-update-desc" @click="$emit(\'update:description\', \'Desc From Child\')" />' +
      '</div>',
    expose: [
      'conceptSetCount',
      'validationCount',
      'validationColor',
      'isValidating',
      'versionCount',
      'tagCount',
      'cohortId',
      'isPreviewingVersion',
      'canSave',
      'openConceptSetsDialog',
      'openValidationDialog',
      'openVersionsDialog',
      'openTagsDialog',
      'handleCancel',
      'handleSave',
    ],
    data() {
      return {
        conceptSetCount: 3,
        validationCount: 1,
        validationColor: 'red',
        isValidating: false,
        versionCount: 2,
        tagCount: 4,
        cohortId: 99,
        isPreviewingVersion: false,
        canSave: true,
      }
    },
    methods: {
      openConceptSetsDialog,
      openValidationDialog,
      openVersionsDialog,
      openTagsDialog,
      handleCancel,
      handleSave,
    },
  },
}))

vi.mock('@/components/cohort/CohortToolbarStatus.vue', () => ({
  default: {
    name: 'CohortToolbarStatus',
    props: ['conceptSetCount', 'validationCount', 'validationColor', 'isValidating', 'versionCount', 'tagCount', 'cohortId', 'isPreviewingVersion'],
    emits: ['show-concept-sets', 'show-validation', 'show-versions', 'show-tags'],
    template:
      '<div class="stub-toolbar-status">' +
      '<button class="status-concept-sets" @click="$emit(\'show-concept-sets\')" />' +
      '<button class="status-validation" @click="$emit(\'show-validation\')" />' +
      '<button class="status-versions" @click="$emit(\'show-versions\')" />' +
      '<button class="status-tags" @click="$emit(\'show-tags\')" />' +
      '</div>',
  },
}))

vi.mock('@/components/cohort/CohortToolbarActions.vue', () => ({
  default: {
    name: 'CohortToolbarActions',
    props: ['canSave', 'isPreviewingVersion'],
    emits: ['cancel', 'save'],
    template:
      '<div class="stub-toolbar-actions">' +
      '<button class="actions-cancel" @click="$emit(\'cancel\')" />' +
      '<button class="actions-save" @click="$emit(\'save\')" />' +
      '</div>',
  },
}))

import CohortBuilderView from '@/views/CohortBuilderView.vue'

const vuetify = createVuetify({ components, directives })

const stubs = {
  AtlasPageShell: {
    name: 'AtlasPageShell',
    props: ['hero', 'compact', 'eyebrow'],
    template:
      '<div class="stub-shell">' +
      '<div class="shell-eyebrow">{{ eyebrow }}</div>' +
      '<div class="shell-title"><slot name="title" /></div>' +
      '<div class="shell-subtitle"><slot name="subtitle" /></div>' +
      '<div class="shell-actions"><slot name="actions" /></div>' +
      '<slot />' +
      '</div>',
  },
}

function mountIt(props: Record<string, unknown> = {}) {
  return mount(CohortBuilderView, {
    props,
    global: { plugins: [vuetify], stubs },
  })
}

describe('CohortBuilderView interactions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('updates cohortName when the title input fires input', async () => {
    const wrapper = mountIt()
    const input = wrapper.find('.cohort-builder-view__title-input')
    await input.setValue('My Cohort')
    expect((input.element as HTMLInputElement).value).toBe('My Cohort')
    // Builder should see the updated name prop after the View's reactive ref propagates.
    await wrapper.vm.$nextTick()
    const builder = wrapper.findComponent({ name: 'CohortBuilder' })
    expect(builder.props('name')).toBe('My Cohort')
  })

  it('updates cohortDescription when the subtitle input fires input', async () => {
    const wrapper = mountIt()
    const input = wrapper.find('.cohort-builder-view__subtitle-input')
    await input.setValue('A description')
    await wrapper.vm.$nextTick()
    const builder = wrapper.findComponent({ name: 'CohortBuilder' })
    expect(builder.props('description')).toBe('A description')
  })

  it('reflects update:name from CohortBuilder back into the hero title', async () => {
    const wrapper = mountIt()
    await wrapper.find('.stub-update-name').trigger('click')
    await wrapper.vm.$nextTick()
    const input = wrapper.find('.cohort-builder-view__title-input')
    expect((input.element as HTMLInputElement).value).toBe('From Child')
  })

  it('reflects update:description from CohortBuilder back into the hero subtitle', async () => {
    const wrapper = mountIt()
    await wrapper.find('.stub-update-desc').trigger('click')
    await wrapper.vm.$nextTick()
    const input = wrapper.find('.cohort-builder-view__subtitle-input')
    expect((input.element as HTMLInputElement).value).toBe('Desc From Child')
  })

  it('forwards toolbar status emits to the builder ref handles', async () => {
    const wrapper = mountIt()
    await wrapper.vm.$nextTick()
    await wrapper.find('.status-concept-sets').trigger('click')
    await wrapper.find('.status-validation').trigger('click')
    await wrapper.find('.status-versions').trigger('click')
    await wrapper.find('.status-tags').trigger('click')
    expect(openConceptSetsDialog).toHaveBeenCalled()
    expect(openValidationDialog).toHaveBeenCalled()
    expect(openVersionsDialog).toHaveBeenCalled()
    expect(openTagsDialog).toHaveBeenCalled()
  })

  it('forwards toolbar actions cancel/save to the builder ref handles', async () => {
    const wrapper = mountIt()
    await wrapper.vm.$nextTick()
    await wrapper.find('.actions-cancel').trigger('click')
    await wrapper.find('.actions-save').trigger('click')
    expect(handleCancel).toHaveBeenCalled()
    expect(handleSave).toHaveBeenCalled()
  })

  it('passes the id prop through to CohortBuilder and surfaces it in the eyebrow', async () => {
    const wrapper = mountIt({ id: '42' })
    const builder = wrapper.findComponent({ name: 'CohortBuilder' })
    expect(builder.props('id')).toBe('42')
    expect(wrapper.text()).toContain('#42')
  })

  it('renders the default eyebrow when no id is provided', () => {
    const wrapper = mountIt()
    expect(wrapper.text().toLowerCase()).toContain('cohort')
  })
})
