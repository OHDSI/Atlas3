import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import type { Ref } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import IncidenceRateBuilder from '@/components/incidence-rate/IncidenceRateBuilder.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import type { ConceptSetReference } from '@/models/cohort.types'
import { tr } from '../../helpers/i18n-mock'
import { vuetify, pristinePinia } from './_test-helpers'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

type Feedback = { message: string; color: 'success' | 'error' | 'info' } | null

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  feedback: null as unknown as Ref<Feedback>,
  canWrite: null as unknown as Ref<boolean>,
  hasPermission: vi.fn((_perm: string) => true),
  useEntityAccess: vi.fn(),
  exportIncidenceRate: vi.fn(),
  importIncidenceRate: vi.fn(),
}))

vi.mock('@/composables/useIncidenceRateBuilder', async () => {
  const { ref } = await import('vue')
  mocks.feedback = ref<Feedback>(null)
  return {
    useIncidenceRateBuilder: () => ({ save: mocks.save, feedback: mocks.feedback }),
  }
})

vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({ hasPermission: mocks.hasPermission }),
}))

vi.mock('@/composables/useEntityAccess', async () => {
  const { ref } = await import('vue')
  mocks.canWrite = ref(true)
  return {
    useEntityAccess: (...args: unknown[]) => {
      mocks.useEntityAccess(...args)
      return { canWrite: mocks.canWrite }
    },
  }
})

vi.mock('@/services/incidence-rate.service', () => ({
  getIncidenceRateReport: vi.fn().mockResolvedValue({ success: true, data: null }),
  listIncidenceRateInfo: vi.fn().mockResolvedValue({ success: true, data: [] }),
  generateIncidenceRate: vi.fn(),
  cancelIncidenceRateGeneration: vi.fn(),
  exportIncidenceRate: mocks.exportIncidenceRate,
  importIncidenceRate: mocks.importIncidenceRate,
  assignIncidenceRateTag: vi.fn(),
  unassignIncidenceRateTag: vi.fn(),
}))

const stubs = [
  'IncidenceRateWorkbench',
  'TagSelectionDialog',
  'EntityAccessDialog',
  'IncidenceRateVersionsPanel',
  'ConceptSetEditor',
  'ConceptSetsListDialog',
  'AtlasDialog',
  'AtlasSnackbar',
]

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/:p(.*)*', component: { template: '<div/>' } }],
})

interface BuilderSetup {
  handleExport: () => Promise<void>
  handleImportFileChange: (event: unknown) => Promise<void>
  createConceptSet: () => void
  handleConceptSetApplied: (set: { id?: number | string; name: string; items?: unknown[] }) => void
  handleDeleteConceptSet: (set: ConceptSetReference) => void
  confirmDeleteConceptSet: () => void
  cancelDeleteConceptSet: () => void
  deleteConceptSetWarning: string
  saveDisabledReason: string
}

function setup(w: VueWrapper): BuilderSetup {
  return (w.vm as unknown as { $: { setupState: BuilderSetup } }).$.setupState
}

function loadIR(id: number | null = 42, name = 'Foo') {
  const store = useIncidenceRateStore()
  store.createNewIR()
  store.currentIR!.id = id ?? undefined
  store.updateMeta({ name, description: 'Bar' })
  store.addTargetCohortId(1, 'Target')
  store.addOutcomeCohortId(2, 'Outcome')
  store.markClean()
  return store
}

async function mountBuilder() {
  const w = mount(IncidenceRateBuilder, { global: { plugins: [vuetify, router], stubs } })
  await flushPromises()
  return w
}

function iconButton(w: VueWrapper, testId: string) {
  const found = w.findAllComponents({ name: 'AtlasIconButton' }).find(c => c.attributes('data-testid') === testId)
  if (!found) throw new Error(`no AtlasIconButton ${testId}`)
  return found
}

function deleteDialog(w: VueWrapper) {
  const found = w.findAllComponents({ name: 'AtlasDialog' }).find(c => c.props('eyebrow') === 'CONCEPT SET')
  if (!found) throw new Error('no delete dialog')
  return found
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (err: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function readBlob(blob: Blob): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.readAsText(blob)
  })
}

function usedStratum(codesetId: number) {
  return {
    expression: {
      Type: 'ALL',
      CriteriaList: [{ Criteria: { ConditionOccurrence: { CodesetId: codesetId } } }],
      DemographicCriteriaList: [],
      Groups: [],
    },
  }
}

describe('IncidenceRateBuilder behavior', () => {
  beforeEach(() => {
    pristinePinia()
    vi.clearAllMocks()
    mocks.feedback.value = null
    mocks.canWrite.value = true
    mocks.hasPermission.mockImplementation(() => true)
  })

  describe('feedback snackbar', () => {
    it('maps feedback colors to snackbar severities', async () => {
      loadIR()
      const w = await mountBuilder()
      const snackbar = () => w.findComponent({ name: 'AtlasSnackbar' })

      expect(snackbar().props('severity')).toBe('info')
      expect(snackbar().props('modelValue')).toBe(false)

      mocks.feedback.value = { message: 'Oops', color: 'error' }
      await flushPromises()
      expect(snackbar().props('severity')).toBe('danger')
      expect(snackbar().props('text')).toBe('Oops')
      expect(snackbar().props('modelValue')).toBe(true)

      mocks.feedback.value = { message: 'Done', color: 'success' }
      await flushPromises()
      expect(snackbar().props('severity')).toBe('success')
    })
  })

  describe('initial state', () => {
    it('starts with every dialog closed and no tool busy', async () => {
      loadIR()
      const w = await mountBuilder()
      expect(w.findComponent({ name: 'ConceptSetsListDialog' }).props('modelValue')).toBe(false)
      expect(w.findComponent({ name: 'TagSelectionDialog' }).props('modelValue')).toBe(false)
      expect(w.findComponent({ name: 'EntityAccessDialog' }).props('modelValue')).toBe(false)
      expect(w.findAllComponents({ name: 'AtlasDialog' }).map(d => d.props('modelValue'))).toEqual([false, false])
      expect(iconButton(w, 'ir-builder-tools-menu').props('loading')).toBe(false)
    })

    it('opens the concept sets and versions dialogs from the toolbar', async () => {
      loadIR()
      const w = await mountBuilder()
      await w.get('[data-testid="ir-builder-conceptsets-icon"]').trigger('click')
      await w.get('[data-testid="ir-builder-versions-icon"]').trigger('click')
      expect(w.findComponent({ name: 'ConceptSetsListDialog' }).props('modelValue')).toBe(true)
      expect(w.findAllComponents({ name: 'AtlasDialog' }).find(d => d.props('eyebrow') !== 'CONCEPT SET')?.props('modelValue')).toBe(true)
    })
  })

  describe('edit gating', () => {
    it('makes the name and description editable for a current design', async () => {
      loadIR()
      const w = await mountBuilder()
      expect(w.get('[data-testid="ir-builder-name"]').attributes('readonly')).toBeUndefined()
      expect(w.get('[data-testid="ir-builder-description"]').attributes('readonly')).toBeUndefined()
    })

    it('makes the inputs read-only in preview mode', async () => {
      const store = loadIR()
      store.previewVersion = { version: 1 } as never
      const w = await mountBuilder()
      expect(w.get('[data-testid="ir-builder-name"]').attributes('readonly')).toBeDefined()
    })

    it('makes the inputs read-only when the design is read-only', async () => {
      const store = loadIR()
      store.isReadOnly = true
      const w = await mountBuilder()
      expect(w.get('[data-testid="ir-builder-name"]').attributes('readonly')).toBeDefined()
      expect(w.get('[data-testid="ir-builder-description"]').attributes('readonly')).toBeDefined()
    })
  })

  describe('tags', () => {
    it('passes an empty tag list when the design has no tags', async () => {
      const store = loadIR()
      store.currentIR!.tags = undefined as never
      const w = await mountBuilder()
      expect(w.findComponent({ name: 'TagSelectionDialog' }).props('selectedTags')).toEqual([])
    })
  })

  describe('concept set lists', () => {
    it('maps design concept sets, defaulting ids to their index and names to empty', async () => {
      const store = loadIR()
      store.currentIR!.expression.ConceptSets = [
        { id: 11, name: 'Used set', expression: { items: [] } },
        { expression: { items: [] } },
        { id: 22, name: 'Unused set' },
      ] as never
      store.currentIR!.expression.strata = [usedStratum(11)] as never
      const w = await mountBuilder()
      const dialog = w.findComponent({ name: 'ConceptSetsListDialog' })
      expect(dialog.props('conceptSets')).toEqual([
        { id: 11, name: 'Used set', items: [] },
        { id: 1, name: '', items: [] },
        { id: 22, name: 'Unused set', items: [] },
      ])
      expect(dialog.props('usedConceptSets')).toEqual([{ id: 11, name: 'Used set', items: [] }])
    })

    it('reports no used concept sets when no stratum references them', async () => {
      const store = loadIR()
      store.currentIR!.expression.ConceptSets = [{ id: 11, name: 'A', expression: { items: [] } }] as never
      store.currentIR!.expression.strata = [usedStratum(99)] as never
      const w = await mountBuilder()
      expect(w.findComponent({ name: 'ConceptSetsListDialog' }).props('usedConceptSets')).toEqual([])
    })

    it('closes the list when a concept set is opened or created', async () => {
      loadIR()
      const conceptSets = useConceptSetsStore()
      const viewSpy = vi.spyOn(conceptSets, 'openEmbeddedEditor').mockImplementation(() => undefined)
      const createSpy = vi.spyOn(conceptSets, 'openCreateEditor').mockImplementation(() => undefined)
      const w = await mountBuilder()
      const list = () => w.findComponent({ name: 'ConceptSetsListDialog' })

      await w.get('[data-testid="ir-builder-conceptsets-icon"]').trigger('click')
      list().vm.$emit('view', { id: 11, name: 'A', items: [] })
      await flushPromises()
      expect(list().props('modelValue')).toBe(false)
      expect(viewSpy).toHaveBeenCalledWith({ id: 11, name: 'A', items: [] })

      await w.get('[data-testid="ir-builder-conceptsets-icon"]').trigger('click')
      setup(w).createConceptSet()
      await flushPromises()
      expect(list().props('modelValue')).toBe(false)
      expect(createSpy).toHaveBeenCalled()
    })
  })

  describe('applying a concept set from the editor', () => {
    it('replaces an existing set in place and reopens the list', async () => {
      const store = loadIR()
      store.currentIR!.expression.ConceptSets = [
        { id: 1, name: 'First', expression: { items: [] } },
        { id: 2, name: 'Second', expression: { items: [] } },
      ] as never
      const conceptSets = useConceptSetsStore()
      const closeSpy = vi.spyOn(conceptSets, 'closeEditor')
      const w = await mountBuilder()

      setup(w).handleConceptSetApplied({ id: 1, name: 'First', items: [] })
      await flushPromises()

      expect(store.currentIR!.expression.ConceptSets.map(s => [s.id, s.name])).toEqual([
        [1, 'First'],
        [2, 'Second'],
      ])
      expect(store.isDirty).toBe(true)
      expect(closeSpy).toHaveBeenCalled()
      expect(w.findComponent({ name: 'ConceptSetsListDialog' }).props('modelValue')).toBe(true)
    })

    it('appends a new set after the existing ones', async () => {
      const store = loadIR()
      store.currentIR!.expression.ConceptSets = [
        { id: 1, name: 'First', expression: { items: [] } },
        { id: 2, name: 'Second', expression: { items: [] } },
      ] as never
      const w = await mountBuilder()

      setup(w).handleConceptSetApplied({ name: 'Third', items: [] })

      const sets = store.currentIR!.expression.ConceptSets
      expect(sets).toHaveLength(3)
      expect(sets.slice(0, 2).map(s => s.name)).toEqual(['First', 'Second'])
      expect(sets[2]!.name).toBe('Third')
      expect(sets[2]!.id).toBe(3)
    })
  })

  describe('deleting a concept set', () => {
    function withUsedSet() {
      const store = loadIR()
      store.currentIR!.expression.ConceptSets = [
        { id: 11, name: 'Used set', expression: { items: [] } },
        { id: 22, name: 'Other', expression: { items: [] } },
      ] as never
      store.currentIR!.expression.strata = [usedStratum(11)] as never
      return store
    }

    it('asks for confirmation when criteria use the set, then deletes and unassigns on confirm', async () => {
      const store = withUsedSet()
      const w = await mountBuilder()

      setup(w).handleDeleteConceptSet({ id: 11, name: 'Used set', items: [] })
      await flushPromises()
      expect(deleteDialog(w).props('modelValue')).toBe(true)
      expect(store.currentIR!.expression.ConceptSets.map(s => s.id)).toEqual([11, 22])
      expect(setup(w).deleteConceptSetWarning).toBe(
        tr('components.conceptSetDelete.warning', {
          name: 'Used set',
          usage: tr('components.conceptSetDelete.usageOne'),
        })
      )

      setup(w).confirmDeleteConceptSet()
      await flushPromises()
      expect(deleteDialog(w).props('modelValue')).toBe(false)
      expect(store.currentIR!.expression.ConceptSets.map(s => s.id)).toEqual([22])
      const criteria = (store.currentIR!.expression.strata[0]!.expression as unknown as {
        CriteriaList: Array<{ Criteria: { ConditionOccurrence: { CodesetId?: number } } }>
      }).CriteriaList[0]!
      expect(criteria.Criteria.ConditionOccurrence.CodesetId).toBeUndefined()
    })

    it('words the warning for several criteria', async () => {
      const store = withUsedSet()
      store.currentIR!.expression.strata = [usedStratum(11), usedStratum(11)] as never
      const w = await mountBuilder()
      setup(w).handleDeleteConceptSet({ id: 11, name: 'Used set', items: [] })
      expect(setup(w).deleteConceptSetWarning).toBe(
        tr('components.conceptSetDelete.warning', {
          name: 'Used set',
          usage: tr('components.conceptSetDelete.usageMany', { count: 2 }),
        })
      )
    })

    it('cancel closes the dialog and a later confirm deletes nothing', async () => {
      const store = withUsedSet()
      const w = await mountBuilder()
      setup(w).handleDeleteConceptSet({ id: 11, name: 'Used set', items: [] })
      await flushPromises()
      setup(w).cancelDeleteConceptSet()
      await flushPromises()
      expect(deleteDialog(w).props('modelValue')).toBe(false)

      store.markClean()
      setup(w).confirmDeleteConceptSet()
      expect(store.currentIR!.expression.ConceptSets.map(s => s.id)).toEqual([11, 22])
      expect(store.isDirty).toBe(false)
    })

    it('deletes an unused set immediately without opening the dialog', async () => {
      const store = withUsedSet()
      const w = await mountBuilder()
      setup(w).handleDeleteConceptSet({ id: 22, name: 'Other', items: [] })
      await flushPromises()
      expect(deleteDialog(w).props('modelValue')).toBe(false)
      expect(store.currentIR!.expression.ConceptSets.map(s => s.id)).toEqual([11])
      expect(store.isDirty).toBe(true)
    })

    it('leaves the list unchanged when the set is not in the design', async () => {
      const store = withUsedSet()
      const w = await mountBuilder()
      setup(w).handleDeleteConceptSet({ id: 99, name: 'Missing', items: [] })
      expect(store.currentIR!.expression.ConceptSets.map(s => s.id)).toEqual([11, 22])
    })

    it('ignores sets without a numeric id', async () => {
      const store = withUsedSet()
      const w = await mountBuilder()
      setup(w).handleDeleteConceptSet({ id: '11' as unknown as number, name: 'Used set', items: [] })
      await flushPromises()
      expect(deleteDialog(w).props('modelValue')).toBe(false)
      expect(store.currentIR!.expression.ConceptSets.map(s => s.id)).toEqual([11, 22])
      expect(store.isDirty).toBe(false)
    })
  })

  describe('export', () => {
    let downloads: Array<{ name: string; display: string; blob: Blob }>
    let pendingBlob: Blob | null
    let clickSpy: { mockRestore: () => void }

    beforeEach(() => {
      downloads = []
      pendingBlob = null
      Object.defineProperty(URL, 'createObjectURL', {
        value: vi.fn((blob: Blob) => {
          pendingBlob = blob
          return 'blob:mock'
        }),
        configurable: true,
      })
      Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true })
      clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        downloads.push({ name: this.download, display: this.style.display, blob: pendingBlob! })
      })
    })

    afterEach(() => {
      clickSpy.mockRestore()
    })

    it.each([
      ['  Hello, World!! ', 'incidence-rate-hello-world-42.json'],
      ['ABC Def', 'incidence-rate-abc-def-42.json'],
      ['!!!', 'incidence-rate-design-42.json'],
      ['', 'incidence-rate-design-42.json'],
      ['a'.repeat(70), `incidence-rate-${'a'.repeat(60)}-42.json`],
    ])('names the download for %j as %s', async (name, filename) => {
      const store = loadIR(42, 'x')
      store.currentIR!.name = name
      mocks.exportIncidenceRate.mockResolvedValue({ name: 'Exported' })
      const w = await mountBuilder()
      await setup(w).handleExport()
      expect(downloads.map(d => d.name)).toEqual([filename])
    })

    it('downloads the design as hidden JSON', async () => {
      loadIR(42, 'Foo')
      mocks.exportIncidenceRate.mockResolvedValue({ name: 'Exported' })
      const w = await mountBuilder()
      await setup(w).handleExport()
      expect(downloads).toHaveLength(1)
      expect(downloads[0]!.display).toBe('none')
      expect(downloads[0]!.blob.type).toBe('application/json;charset=utf-8;')
      expect(await readBlob(downloads[0]!.blob)).toBe(JSON.stringify({ name: 'Exported' }, null, 2))
    })

    it('shows the tools as busy only while exporting', async () => {
      loadIR()
      const pending = deferred<unknown>()
      mocks.exportIncidenceRate.mockReturnValue(pending.promise)
      const w = await mountBuilder()
      const run = setup(w).handleExport()
      await flushPromises()
      expect(iconButton(w, 'ir-builder-tools-menu').props('loading')).toBe(true)
      pending.reject(new Error('boom'))
      await run
      await flushPromises()
      expect(iconButton(w, 'ir-builder-tools-menu').props('loading')).toBe(false)
    })
  })

  describe('import', () => {
    function fileEvent(text: string) {
      const target = { files: [{ text: async () => text }], value: 'C:\\fakepath\\design.json' }
      return { target }
    }

    it('clears the input and does nothing when no file list is present', async () => {
      loadIR()
      const w = await mountBuilder()
      const target = { value: 'x' }
      await setup(w).handleImportFileChange({ target })
      expect(target.value).toBe('')
      expect(mocks.importIncidenceRate).not.toHaveBeenCalled()
    })

    it('reports an unparseable file and ends the busy state', async () => {
      loadIR()
      const w = await mountBuilder()
      const event = fileEvent('{nope')
      await setup(w).handleImportFileChange(event)
      await flushPromises()
      expect(event.target.value).toBe('')
      expect(mocks.feedback.value).toEqual({
        message: tr('characterizations.editor.utilities.import.parseError'),
        color: 'error',
      })
      expect(iconButton(w, 'ir-builder-tools-menu').props('loading')).toBe(false)
      expect(mocks.importIncidenceRate).not.toHaveBeenCalled()
    })

    it('imports, reports success, and opens the created design', async () => {
      loadIR()
      const pushSpy = vi.spyOn(router, 'push').mockResolvedValue(undefined)
      const pending = deferred<{ id: number }>()
      mocks.importIncidenceRate.mockReturnValue(pending.promise)
      const w = await mountBuilder()

      const run = setup(w).handleImportFileChange(fileEvent('{"name":"Imported"}'))
      await flushPromises()
      expect(mocks.importIncidenceRate).toHaveBeenCalledWith({ name: 'Imported' })
      expect(iconButton(w, 'ir-builder-tools-menu').props('loading')).toBe(true)

      pending.resolve({ id: 77 })
      await run
      await flushPromises()
      expect(mocks.feedback.value).toEqual({
        message: tr('characterizations.editor.utilities.import.importSuccess'),
        color: 'success',
      })
      expect(pushSpy).toHaveBeenCalledWith('/incidence-rates/77')
      expect(iconButton(w, 'ir-builder-tools-menu').props('loading')).toBe(false)
      pushSpy.mockRestore()
    })

    it('reports a failed import', async () => {
      loadIR()
      mocks.importIncidenceRate.mockRejectedValue(new Error('server'))
      const w = await mountBuilder()
      await setup(w).handleImportFileChange(fileEvent('{}'))
      await flushPromises()
      expect(mocks.feedback.value).toEqual({
        message: tr('characterizations.editor.utilities.import.importError'),
        color: 'error',
      })
      expect(iconButton(w, 'ir-builder-tools-menu').props('loading')).toBe(false)
    })
  })

  describe('save permission', () => {
    function saveDisabled(w: VueWrapper) {
      return w.get('[data-testid="ir-builder-save"]').attributes('disabled') !== undefined
    }

    it('checks access for the incidence rate entity', async () => {
      loadIR()
      await mountBuilder()
      expect(mocks.useEntityAccess).toHaveBeenCalledWith('incidenceRate', expect.objectContaining({ value: 42 }))
    })

    it('gates a new design on the create permission', async () => {
      const store = loadIR(null, 'New')
      store.markDirty()
      mocks.hasPermission.mockImplementation(() => false)
      const w = await mountBuilder()
      expect(saveDisabled(w)).toBe(true)
      expect(mocks.hasPermission).toHaveBeenCalledWith('create:incidence')
      expect(setup(w).saveDisabledReason).toBe(
        tr('const.disabledReason.noCreatePermission', { entity: tr('const.entityName.incidenceRate') })
      )
    })

    it('gates a saved design on write access, not the create permission', async () => {
      const store = loadIR(42, 'Saved')
      store.markDirty()
      mocks.hasPermission.mockImplementation(() => false)
      mocks.canWrite.value = true
      const w = await mountBuilder()
      expect(saveDisabled(w)).toBe(false)

      mocks.canWrite.value = false
      await flushPromises()
      expect(saveDisabled(w)).toBe(true)
      expect(setup(w).saveDisabledReason).toBe(
        tr('const.disabledReason.noWriteAccess', { entity: tr('const.entityName.incidenceRate') })
      )
    })

    it('explains a blank name', async () => {
      const store = loadIR(42, '   ')
      store.markDirty()
      const w = await mountBuilder()
      expect(setup(w).saveDisabledReason).toBe(
        tr('const.disabledReason.needsName', { entity: tr('const.entityName.incidenceRate') })
      )
    })

    it('marks the save button busy only while saving', async () => {
      const store = loadIR(42, 'Saved')
      store.markDirty()
      const pending = deferred<boolean>()
      mocks.save.mockReturnValue(pending.promise)
      const w = await mountBuilder()
      const save = () => w.findAllComponents({ name: 'AtlasButton' }).find(b => b.attributes('data-testid') === 'ir-builder-save')!

      expect(save().props('loading')).toBe(false)
      await w.get('[data-testid="ir-builder-save"]').trigger('click')
      await flushPromises()
      expect(save().props('loading')).toBe(true)
      pending.resolve(false)
      await flushPromises()
      expect(save().props('loading')).toBe(false)
    })
  })

  describe('title', () => {
    const title = (w: VueWrapper) => w.findComponent({ name: 'AnalysisBuilderShell' }).props('title')

    it('trims the design name', async () => {
      loadIR(42, '  Trimmed  ')
      expect(title(await mountBuilder())).toBe('Trimmed')
    })

    it('falls back to the new-entity name for a blank or missing name', async () => {
      const store = loadIR(42, '   ')
      const w = await mountBuilder()
      expect(title(w)).toBe(tr('home.newEntityNames.incidenceRate'))
      store.currentIR!.name = undefined as never
      await flushPromises()
      expect(title(w)).toBe(tr('home.newEntityNames.incidenceRate'))
    })
  })
})
