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
import { SUPPORTED_DIALECTS } from '@/models/datasource.types'
import { tr } from '../../helpers/i18n-mock'

const vuetify = createVuetify({ components, directives })
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

function makeStubs() {
  return {
    AtlasButton: {
      name: 'AtlasButton',
      props: ['loading', 'disabled', 'variant'],
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

const FULL_DETAILS = {
  sourceId: 42,
  sourceKey: 'IMP',
  sourceName: 'Impala Source',
  sourceDialect: 'impala',
  connectionString: 'jdbc:impala://host',
  username: 'svc',
  password: 'secret',
  krbAuthMethod: 'PASSWORD',
  krbAdminServer: 'kdc.example',
  daimons: [
    { daimonType: 'CDM', tableQualifier: 'cdm', priority: 1 },
    { daimonType: 'Results', tableQualifier: 'results', priority: 2 },
  ],
}

const MINIMAL_DETAILS = {
  sourceId: 43,
  sourceKey: 'MIN',
  sourceName: 'Minimal',
  sourceDialect: 'impala',
  connectionString: 'jdbc:impala://min',
  daimons: [],
}

const DIALOG_LABELS = {
  name: tr('columns.name'),
  key: tr('configuration.viewEdit.source.label'),
  connection: tr('configuration.viewEdit.connectionString.label'),
  username: tr('configuration.viewEdit.username.label'),
  password: tr('configuration.viewEdit.password.label'),
  adminServer: tr('configuration.viewEdit.krb.adminServer.label'),
  dialect: tr('configuration.viewEdit.dialect.label'),
  checkConnection: tr('columns.checkConnection'),
}

function mountDialog(props: { modelValue: boolean; sourceKey?: string | null; sourceId?: number | null }) {
  const pinia = createPinia()
  setActivePinia(pinia)
  return mount(DataSourceDialog, {
    global: { plugins: [vuetify, pinia], stubs: makeStubs() },
    props: { sourceKey: null, sourceId: null, ...props },
  })
}

async function openDialog(sourceKey: string | null = null, sourceId: number | null = null) {
  const wrapper = mountDialog({ modelValue: false, sourceKey, sourceId })
  await wrapper.setProps({ modelValue: true })
  await flushPromises()
  return wrapper
}

function field(wrapper: VueWrapper, label: string) {
  return wrapper.findAllComponents({ name: 'AtlasTextField' }).find(c => c.props('label') === label)
}

function fieldValue(wrapper: VueWrapper, label: string) {
  return field(wrapper, label)?.props('modelValue')
}

function select(wrapper: VueWrapper) {
  return wrapper.findAllComponents({ name: 'AtlasSelect' }).find(c => c.props('label') === DIALOG_LABELS.dialect)!
}

function button(wrapper: VueWrapper, text: string, index = 0) {
  return wrapper.findAllComponents({ name: 'AtlasButton' }).filter(b => b.text() === text)[index]
}

function saveButton(wrapper: VueWrapper) {
  return button(wrapper, tr('common.save'))
}

function daimonRows(wrapper: VueWrapper) {
  return wrapper.findAll('tbody tr').map(r => ({
    type: r.findAll('td')[1].text(),
    enabled: r.findComponent({ name: 'AtlasCheckbox' }).props('modelValue'),
    schema: r.findComponent({ name: 'AtlasTextField' }).props('modelValue'),
  }))
}

async function fillRequired(wrapper: VueWrapper, dialect = 'postgresql') {
  await field(wrapper, DIALOG_LABELS.name)!.setValue('New Source')
  await field(wrapper, DIALOG_LABELS.key)!.setValue('NEW_SOURCE')
  await field(wrapper, DIALOG_LABELS.connection)!.setValue('jdbc:x')
  await select(wrapper).setValue(dialect)
  await flushPromises()
}

async function clickSave(wrapper: VueWrapper) {
  const form = wrapper.findComponent({ name: 'VForm' }).vm as unknown as {
    validate: () => Promise<{ valid: boolean }>
  }
  expect((await form.validate()).valid).toBe(true)
  await flushPromises()
  await saveButton(wrapper).trigger('click')
  await flushPromises()
}

type Vm = { handleSave: () => Promise<void>; confirmDelete: () => Promise<void> }

beforeEach(() => {
  createSource.mockReset().mockResolvedValue({ sourceId: 7 })
  updateSource.mockReset().mockResolvedValue({ sourceId: 42 })
  deleteSource.mockReset().mockResolvedValue(undefined)
  getSourceDetails.mockReset().mockResolvedValue(FULL_DETAILS)
})

describe('DataSourceDialog mounted already open', () => {
  it('starts with an empty form, unchecked daimons and idle buttons', async () => {
    const wrapper = mountDialog({ modelValue: true })
    await flushPromises()
    for (const label of [DIALOG_LABELS.name, DIALOG_LABELS.key, DIALOG_LABELS.connection, DIALOG_LABELS.username, DIALOG_LABELS.password]) {
      expect(fieldValue(wrapper, label)).toBe('')
    }
    expect(select(wrapper).props('modelValue')).toBe('')
    expect(daimonRows(wrapper).every(r => r.enabled === false && r.schema === '')).toBe(true)
    expect(daimonRows(wrapper)).toHaveLength(6)
    const checkConnection = wrapper
      .findAllComponents({ name: 'AtlasCheckbox' })
      .find(c => c.props('label') === DIALOG_LABELS.checkConnection)
    expect(checkConnection?.props('modelValue')).toBe(false)
    expect(saveButton(wrapper).props('loading')).toBe(false)
    expect(saveButton(wrapper).props('disabled')).toBe(true)
    wrapper.unmount()
  })

  it('sends a minimal request built from initial state', async () => {
    const wrapper = mountDialog({ modelValue: true })
    await flushPromises()
    await fillRequired(wrapper)
    await clickSave(wrapper)
    expect(createSource).toHaveBeenCalledWith(
      {
        name: 'New Source',
        key: 'NEW_SOURCE',
        dialect: 'postgresql',
        connectionString: 'jdbc:x',
        daimons: [],
        checkConnection: false,
      },
      undefined
    )
    wrapper.unmount()
  })

  it('starts impala sources on keytab authentication', async () => {
    const wrapper = mountDialog({ modelValue: true })
    await flushPromises()
    await fillRequired(wrapper, 'impala')
    await clickSave(wrapper)
    expect(createSource.mock.calls[0][0]).toMatchObject({ krbAuthMethod: 'KEYTAB' })
    expect(createSource.mock.calls[0][0]).not.toHaveProperty('krbAdminServer')
    wrapper.unmount()
  })
})

describe('DataSourceDialog new vs edit', () => {
  it('a new source has the New Source title, no delete and an editable key', async () => {
    const wrapper = await openDialog()
    const dialog = wrapper.findAllComponents({ name: 'AtlasDialog' })[0]
    expect(dialog.props('title')).toBe(tr('configuration.newSource'))
    expect(button(wrapper, tr('common.delete'))).toBeUndefined()
    expect(field(wrapper, DIALOG_LABELS.key)!.props('disabled')).toBe(false)
    expect(getSourceDetails).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('an existing source has the Edit title, delete and a locked key', async () => {
    const wrapper = await openDialog('IMP', 42)
    const dialog = wrapper.findAllComponents({ name: 'AtlasDialog' })[0]
    expect(dialog.props('title')).toBe(tr('common.edit'))
    expect(button(wrapper, tr('common.delete'))).toBeDefined()
    expect(field(wrapper, DIALOG_LABELS.key)!.props('disabled')).toBe(true)
    wrapper.unmount()
  })

  it('offers every supported dialect', async () => {
    const wrapper = await openDialog()
    expect(select(wrapper).props('items')).toEqual(
      SUPPORTED_DIALECTS.map(d => ({ title: d.label, value: d.value }))
    )
    wrapper.unmount()
  })

  it('does not load details without a source id', async () => {
    const wrapper = await openDialog('IMP', null)
    expect(getSourceDetails).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('does not reload when the dialog closes', async () => {
    const wrapper = await openDialog('IMP', 42)
    await wrapper.setProps({ modelValue: false })
    await flushPromises()
    expect(getSourceDetails).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})

describe('DataSourceDialog loading details', () => {
  it('fills every field from the loaded source', async () => {
    const wrapper = await openDialog('IMP', 42)
    expect(fieldValue(wrapper, DIALOG_LABELS.name)).toBe('Impala Source')
    expect(fieldValue(wrapper, DIALOG_LABELS.connection)).toBe('jdbc:impala://host')
    expect(fieldValue(wrapper, DIALOG_LABELS.username)).toBe('svc')
    expect(fieldValue(wrapper, DIALOG_LABELS.password)).toBe('secret')
    expect(fieldValue(wrapper, DIALOG_LABELS.adminServer)).toBe('kdc.example')
    expect(wrapper.findComponent({ name: 'AtlasRadioGroup' }).props('modelValue')).toBe('PASSWORD')
    expect(daimonRows(wrapper).filter(r => r.enabled)).toEqual([
      { type: 'CDM', enabled: true, schema: 'cdm' },
      { type: 'Results', enabled: true, schema: 'results' },
    ])
    wrapper.unmount()
  })

  it('uses empty values and keytab when optional details are missing', async () => {
    getSourceDetails.mockResolvedValue(MINIMAL_DETAILS)
    const wrapper = await openDialog('MIN', 43)
    expect(fieldValue(wrapper, DIALOG_LABELS.username)).toBe('')
    expect(fieldValue(wrapper, DIALOG_LABELS.password)).toBe('')
    expect(fieldValue(wrapper, DIALOG_LABELS.adminServer)).toBe('')
    expect(wrapper.findComponent({ name: 'AtlasRadioGroup' }).props('modelValue')).toBe('KEYTAB')
    wrapper.unmount()
  })

  it('uses an empty connection string when none is returned', async () => {
    getSourceDetails.mockResolvedValue({ ...MINIMAL_DETAILS, connectionString: undefined })
    const wrapper = await openDialog('MIN', 43)
    expect(fieldValue(wrapper, DIALOG_LABELS.connection)).toBe('')
    wrapper.unmount()
  })

  it('reports and closes when details fail to load', async () => {
    getSourceDetails.mockRejectedValue(new Error('down'))
    const wrapper = await openDialog('IMP', 42)
    expect(wrapper.emitted('error')).toEqual([[tr('executionStatus.values.FAILED')]])
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    wrapper.unmount()
  })

  it('reopening for a new source clears everything loaded before', async () => {
    const wrapper = await openDialog('IMP', 42)
    await wrapper
      .findAllComponents({ name: 'AtlasCheckbox' })
      .find(c => c.props('label') === DIALOG_LABELS.checkConnection)!
      .setValue(true)
    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ sourceKey: null, sourceId: null })
    await wrapper.setProps({ modelValue: true })
    await flushPromises()

    for (const label of [DIALOG_LABELS.name, DIALOG_LABELS.key, DIALOG_LABELS.connection, DIALOG_LABELS.username, DIALOG_LABELS.password]) {
      expect(fieldValue(wrapper, label)).toBe('')
    }
    expect(select(wrapper).props('modelValue')).toBe('')
    expect(daimonRows(wrapper).every(r => r.enabled === false && r.schema === '')).toBe(true)

    await fillRequired(wrapper, 'impala')
    expect(fieldValue(wrapper, DIALOG_LABELS.adminServer)).toBe('')
    expect(wrapper.findComponent({ name: 'AtlasRadioGroup' }).props('modelValue')).toBe('KEYTAB')
    await clickSave(wrapper)
    expect(createSource).toHaveBeenCalledWith(
      {
        name: 'New Source',
        key: 'NEW_SOURCE',
        dialect: 'impala',
        connectionString: 'jdbc:x',
        daimons: [],
        checkConnection: false,
        krbAuthMethod: 'KEYTAB',
      },
      undefined
    )
    wrapper.unmount()
  })
})

describe('DataSourceDialog dialect-specific sections', () => {
  it('shows credentials but no kerberos or keyfile for postgresql', async () => {
    const wrapper = await openDialog()
    await select(wrapper).setValue('postgresql')
    expect(field(wrapper, DIALOG_LABELS.username)).toBeDefined()
    expect(wrapper.findComponent({ name: 'AtlasRadioGroup' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'VFileInput' }).exists()).toBe(false)
    wrapper.unmount()
  })

  it('hides credentials for bigquery and shows the keyfile input', async () => {
    const wrapper = await openDialog()
    await select(wrapper).setValue('bigquery')
    expect(field(wrapper, DIALOG_LABELS.username)).toBeUndefined()
    expect(wrapper.findComponent({ name: 'AtlasRadioGroup' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'VFileInput' }).find('input').attributes('accept')).toBe('.json')
    wrapper.unmount()
  })

  it('shows kerberos settings and the keytab input for impala', async () => {
    const wrapper = await openDialog()
    await select(wrapper).setValue('impala')
    expect(field(wrapper, DIALOG_LABELS.username)).toBeDefined()
    expect(wrapper.findComponent({ name: 'AtlasRadioGroup' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'VFileInput' }).find('input').attributes('accept')).toBe('.keytab')
    wrapper.unmount()
  })
})

describe('DataSourceDialog validation rules', () => {
  type Rule = (v: string) => true | string
  const emptyMessage = tr('configuration.viewEdit.source.validation.empty')

  it('requires a name', async () => {
    const wrapper = await openDialog()
    const [required] = field(wrapper, DIALOG_LABELS.name)!.findComponent({ name: 'VTextField' }).props('rules') as Rule[]
    expect(required('')).toBe(emptyMessage)
    expect(emptyMessage).not.toBe('')
    expect(required('x')).toBe(true)
    wrapper.unmount()
  })

  it('accepts only letters, digits, underscore and dash in the key', async () => {
    const wrapper = await openDialog()
    const [required, validKey] = field(wrapper, DIALOG_LABELS.key)!.findComponent({ name: 'VTextField' }).props('rules') as Rule[]
    expect(required('')).toBe(emptyMessage)
    expect(validKey('My_KEY-01')).toBe(true)
    expect(validKey('has space')).toBe(emptyMessage)
    expect(validKey('!lead')).toBe(emptyMessage)
    expect(validKey('trail!')).toBe(emptyMessage)
    wrapper.unmount()
  })
})

describe('DataSourceDialog request building', () => {
  it('sends kerberos settings and credentials for a loaded impala source', async () => {
    const wrapper = await openDialog('IMP', 42)
    await clickSave(wrapper)
    expect(updateSource).toHaveBeenCalledWith(
      42,
      {
        name: 'Impala Source',
        key: 'IMP',
        dialect: 'impala',
        connectionString: 'jdbc:impala://host',
        daimons: [
          { daimonType: 'CDM', tableQualifier: 'cdm', priority: 1 },
          { daimonType: 'Results', tableQualifier: 'results', priority: 2 },
        ],
        checkConnection: false,
        username: 'svc',
        password: 'secret',
        krbAuthMethod: 'PASSWORD',
        krbAdminServer: 'kdc.example',
      },
      undefined
    )
    wrapper.unmount()
  })

  it('drops kerberos settings and keeps credentials after switching to postgresql', async () => {
    const wrapper = await openDialog('IMP', 42)
    await select(wrapper).setValue('postgresql')
    await clickSave(wrapper)
    const request = updateSource.mock.calls[0][1]
    expect(request).toMatchObject({ username: 'svc', password: 'secret' })
    expect(request).not.toHaveProperty('krbAuthMethod')
    expect(request).not.toHaveProperty('krbAdminServer')
    wrapper.unmount()
  })

  it('drops credentials for bigquery', async () => {
    const wrapper = await openDialog('IMP', 42)
    await select(wrapper).setValue('bigquery')
    await clickSave(wrapper)
    const request = updateSource.mock.calls[0][1]
    expect(request).not.toHaveProperty('username')
    expect(request).not.toHaveProperty('password')
    wrapper.unmount()
  })

  it('sends a username without an empty password', async () => {
    const wrapper = await openDialog()
    await fillRequired(wrapper)
    await field(wrapper, DIALOG_LABELS.username)!.setValue('only-user')
    await clickSave(wrapper)
    const request = createSource.mock.calls[0][0]
    expect(request.username).toBe('only-user')
    expect(request).not.toHaveProperty('password')
    wrapper.unmount()
  })

  it('sends a password without an empty username', async () => {
    const wrapper = await openDialog()
    await fillRequired(wrapper)
    await field(wrapper, DIALOG_LABELS.password)!.setValue('pw')
    await clickSave(wrapper)
    const request = createSource.mock.calls[0][0]
    expect(request.password).toBe('pw')
    expect(request).not.toHaveProperty('username')
    wrapper.unmount()
  })

  it('omits a daimon that was unchecked even though its schema remains', async () => {
    const wrapper = await openDialog('IMP', 42)
    await wrapper.findAll('tbody tr')[0].findComponent({ name: 'AtlasCheckbox' }).setValue(false)
    await clickSave(wrapper)
    expect(updateSource.mock.calls[0][1].daimons).toEqual([
      { daimonType: 'Results', tableQualifier: 'results', priority: 2 },
    ])
    wrapper.unmount()
  })

  it('sends the keytab file for keytab authentication only', async () => {
    const wrapper = await openDialog()
    await fillRequired(wrapper, 'impala')
    const keytab = new File(['k'], 'svc.keytab')
    await wrapper.findComponent({ name: 'VFileInput' }).setValue(keytab)
    await flushPromises()
    await clickSave(wrapper)
    expect(createSource.mock.calls[0][1]).toBe(keytab)

    await wrapper.findComponent({ name: 'AtlasRadioGroup' }).setValue('PASSWORD')
    await flushPromises()
    await clickSave(wrapper)
    expect(createSource.mock.calls[1][1]).toBeUndefined()
    wrapper.unmount()
  })

  it('creates instead of updating when editing without a loaded id', async () => {
    const wrapper = await openDialog('IMP', null)
    await fillRequired(wrapper)
    await clickSave(wrapper)
    expect(updateSource).not.toHaveBeenCalled()
    expect(createSource).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})

describe('DataSourceDialog saving', () => {
  it('does not save an invalid form', async () => {
    const wrapper = await openDialog()
    await (wrapper.vm as unknown as Vm).handleSave()
    expect(createSource).not.toHaveBeenCalled()
    expect(wrapper.emitted('saved')).toBeUndefined()
    wrapper.unmount()
  })

  it('shows saving progress until the request settles, then closes', async () => {
    let resolve: (v: unknown) => void = () => {}
    createSource.mockReturnValueOnce(new Promise(r => { resolve = r }))
    const wrapper = await openDialog()
    await fillRequired(wrapper)
    const form = wrapper.findComponent({ name: 'VForm' }).vm as unknown as {
      validate: () => Promise<{ valid: boolean }>
    }
    await form.validate()
    await flushPromises()
    await saveButton(wrapper).trigger('click')
    await flushPromises()
    expect(saveButton(wrapper).props('loading')).toBe(true)
    resolve({ sourceId: 7 })
    await flushPromises()
    expect(saveButton(wrapper).props('loading')).toBe(false)
    expect(wrapper.emitted('saved')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    wrapper.unmount()
  })

  it('reports a generic failure for non-Error rejections and stops loading', async () => {
    createSource.mockRejectedValueOnce('nope')
    const wrapper = await openDialog()
    await fillRequired(wrapper)
    await clickSave(wrapper)
    expect(wrapper.emitted('error')).toEqual([[tr('executionStatus.values.FAILED')]])
    expect(saveButton(wrapper).props('loading')).toBe(false)
    wrapper.unmount()
  })

  it('Cancel closes the dialog', async () => {
    const wrapper = await openDialog()
    await button(wrapper, tr('common.cancel')).trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    wrapper.unmount()
  })
})

describe('DataSourceDialog deleting', () => {
  function confirmDialog(wrapper: VueWrapper) {
    return wrapper.findAllComponents({ name: 'AtlasDialog' })[1]
  }

  it('asks for confirmation before deleting', async () => {
    const wrapper = await openDialog('IMP', 42)
    expect(confirmDialog(wrapper).props('modelValue')).toBe(false)
    await button(wrapper, tr('common.delete')).trigger('click')
    expect(confirmDialog(wrapper).props('modelValue')).toBe(true)
    expect(deleteSource).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('deletes by numeric id, then emits deleted and closes', async () => {
    let resolve: (v: unknown) => void = () => {}
    deleteSource.mockReturnValueOnce(new Promise(r => { resolve = r }))
    const wrapper = await openDialog('IMP', 42)
    await button(wrapper, tr('common.delete')).trigger('click')
    await button(wrapper, tr('common.delete'), 1).trigger('click')
    await flushPromises()
    expect(button(wrapper, tr('common.delete'), 1).props('loading')).toBe(true)
    resolve(undefined)
    await flushPromises()
    expect(deleteSource).toHaveBeenCalledWith(42)
    expect(wrapper.emitted('deleted')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    expect(confirmDialog(wrapper).props('modelValue')).toBe(false)
    expect(button(wrapper, tr('common.delete'), 1)).toBeUndefined()
    wrapper.unmount()
  })

  it('reports the error message and keeps confirmation open when delete fails', async () => {
    deleteSource.mockRejectedValueOnce(new Error('in use'))
    const wrapper = await openDialog('IMP', 42)
    await button(wrapper, tr('common.delete')).trigger('click')
    await button(wrapper, tr('common.delete'), 1).trigger('click')
    await flushPromises()
    expect(wrapper.emitted('error')).toEqual([['in use']])
    expect(wrapper.emitted('deleted')).toBeUndefined()
    expect(confirmDialog(wrapper).props('modelValue')).toBe(true)
    expect(button(wrapper, tr('common.delete'), 1).props('loading')).toBe(false)
    wrapper.unmount()
  })

  it('reports a generic failure for non-Error delete rejections', async () => {
    deleteSource.mockRejectedValueOnce(503)
    const wrapper = await openDialog('IMP', 42)
    await button(wrapper, tr('common.delete')).trigger('click')
    await button(wrapper, tr('common.delete'), 1).trigger('click')
    await flushPromises()
    expect(wrapper.emitted('error')).toEqual([[tr('executionStatus.values.FAILED')]])
    wrapper.unmount()
  })

  it('does not delete when no source id was loaded', async () => {
    const wrapper = await openDialog('IMP', null)
    await (wrapper.vm as unknown as Vm).confirmDelete()
    expect(deleteSource).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('does not delete a new source', async () => {
    const wrapper = await openDialog('IMP', 42)
    await wrapper.setProps({ sourceKey: null })
    await (wrapper.vm as unknown as Vm).confirmDelete()
    expect(deleteSource).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
