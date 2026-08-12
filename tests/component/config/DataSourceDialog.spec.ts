/**
 * DataSourceDialog save-path tests
 *
 * Covers handleSave's two branches: create for a new source, and update keyed
 * on the numeric sourceId loaded with the source — not the string sourceKey
 * the dialog receives as a prop.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const createSource = vi.fn()
const updateSource = vi.fn()
const deleteSource = vi.fn()
const getSourceDetails = vi.fn()

vi.mock('@/services/source.service', () => ({
  createSource: (...args: unknown[]) => createSource(...args),
  updateSource: (...args: unknown[]) => updateSource(...args),
  deleteSource: (...args: unknown[]) => deleteSource(...args),
  getSourceDetails: (...args: unknown[]) => getSourceDetails(...args),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import DataSourceDialog from '@/components/config/DataSourceDialog.vue'

const vuetify = createVuetify({ components, directives })
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// The fields stay real so v-form validation runs for the Save button; only the
// dialog shell and buttons are stubbed, since AtlasDialog teleports its
// content out of the wrapper.
function makeStubs() {
  return {
    AtlasButton: {
      name: 'AtlasButton',
      props: ['loading', 'disabled'],
      emits: ['click'],
      template:
        '<button class="atlas-btn" :disabled="disabled" @click="$emit(\'click\', $event)"><slot /></button>',
    },
    AtlasDialog: {
      name: 'AtlasDialog',
      props: ['modelValue', 'title', 'maxWidth', 'eyebrow', 'persistent'],
      template: '<div class="dialog" v-if="modelValue"><slot /><slot name="actions" /></div>',
    },
  }
}

const details = {
  sourceId: 42,
  sourceKey: 'CDM',
  sourceName: 'CDM Source',
  sourceDialect: 'POSTGRESQL',
  connectionString: 'jdbc:postgresql://localhost:5432/cdm',
  daimons: [{ daimonType: 'CDM', tableQualifier: 'demo_cdm', priority: 0 }],
}

async function mountDialog(sourceKey: string | null) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(DataSourceDialog, {
    global: { plugins: [vuetify, pinia], stubs: makeStubs() },
    props: { modelValue: false, sourceKey },
  })
  // The dialog loads the source on open, so it has to transition closed → open.
  await wrapper.setProps({ modelValue: true })
  await flushPromises()
  return wrapper
}

async function fillRequiredFields(wrapper: VueWrapper) {
  const byLabel = (name: string, label: string) =>
    wrapper.findAllComponents({ name }).find(c => c.props('label') === label)!

  await byLabel('AtlasTextField', 'columns.name').setValue('New Source')
  await byLabel('AtlasTextField', 'configuration.viewEdit.source.label').setValue('NEW_SOURCE')
  await byLabel('AtlasTextField', 'configuration.viewEdit.connectionString.label').setValue(
    'jdbc:postgresql://localhost:5432/newdb'
  )
  await byLabel('AtlasSelect', 'configuration.viewEdit.dialect.label').setValue('POSTGRESQL')
  await flushPromises()
}

async function clickSave(wrapper: VueWrapper) {
  // The Save button is gated on validity, which v-form only pushes into the
  // dialog once it has run a validation pass.
  const form = wrapper.findComponent({ name: 'VForm' }).vm as unknown as {
    validate: () => Promise<{ valid: boolean }>
  }
  expect((await form.validate()).valid).toBe(true)
  await flushPromises()

  const buttons = wrapper.findAll('button.atlas-btn')
  await buttons[buttons.length - 1].trigger('click')
  await flushPromises()
}

describe('DataSourceDialog save', () => {
  beforeEach(() => {
    createSource.mockReset().mockResolvedValue({ sourceId: 7, sourceName: 'New Source' })
    updateSource.mockReset().mockResolvedValue({ sourceId: 42, sourceName: 'CDM Source' })
    deleteSource.mockReset().mockResolvedValue(undefined)
    getSourceDetails.mockReset().mockResolvedValue(details)
  })

  it('creates a source when no sourceKey is supplied', async () => {
    const wrapper = await mountDialog(null)
    await fillRequiredFields(wrapper)

    await clickSave(wrapper)

    expect(updateSource).not.toHaveBeenCalled()
    expect(createSource).toHaveBeenCalledTimes(1)
    expect(createSource.mock.calls[0][0]).toMatchObject({
      name: 'New Source',
      key: 'NEW_SOURCE',
      dialect: 'POSTGRESQL',
    })
    expect(wrapper.emitted('saved')).toHaveLength(1)
    wrapper.unmount()
  })

  it('updates through the numeric sourceId, not the sourceKey prop', async () => {
    const wrapper = await mountDialog('CDM')

    await clickSave(wrapper)

    expect(createSource).not.toHaveBeenCalled()
    expect(updateSource).toHaveBeenCalledTimes(1)
    const [sourceId, request] = updateSource.mock.calls[0]
    expect(sourceId).toBe(42)
    expect(request).toMatchObject({ name: 'CDM Source', key: 'CDM' })
    expect(wrapper.emitted('saved')).toHaveLength(1)
    wrapper.unmount()
  })

  it('reports the failure and stays open when the save is rejected', async () => {
    updateSource.mockRejectedValue(new Error('Unable to update data source. Please try again.'))
    const wrapper = await mountDialog('CDM')

    await clickSave(wrapper)

    expect(wrapper.emitted('saved')).toBeUndefined()
    expect(wrapper.emitted('error')?.[0]).toEqual([
      'Unable to update data source. Please try again.',
    ])
    wrapper.unmount()
  })
})
