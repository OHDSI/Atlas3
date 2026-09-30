/**
 * Pins handleCopy's per-assetType service dispatch. A chained ternary's
 * fall-through else previously let 'ir' silently reuse the concept-set
 * copy service (PUTting to /conceptset/{irId}/... with an IR id) - this
 * mounts the real component for every asset type and asserts each one
 * calls its own copy service and none of the others.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import VersionsTabContent from '@/components/versions/VersionsTabContent.vue'
import type { VersionsConfig, VersionsTableItem } from '@/components/versions/types'

const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback?: string) => ref(fallback ?? key),
    tv: (key: string, fallback?: string) => fallback ?? key,
  }),
}))

const copyCohort = vi.fn()
const copyConceptSet = vi.fn()
const copyPathway = vi.fn()
const copyIR = vi.fn()
const getPathwayVersions = vi.fn()
const saveCohortPreview = vi.fn()
const saveConceptSetPreview = vi.fn()
const savePathwayPreview = vi.fn()
const saveIRPreview = vi.fn()

vi.mock('@/services/cohort-definition-versions.service', () => ({
  getVersions: vi.fn().mockResolvedValue([]),
  updateVersion: vi.fn(),
  copyVersion: (...args: unknown[]) => copyCohort(...args),
}))
vi.mock('@/services/concept-set-versions.service', () => ({
  getVersions: vi.fn().mockResolvedValue([]),
  updateVersion: vi.fn(),
  copyVersion: (...args: unknown[]) => copyConceptSet(...args),
}))
vi.mock('@/services/pathway-versions.service', () => ({
  getPathwayVersions: (...args: unknown[]) => getPathwayVersions(...args),
  updatePathwayVersion: vi.fn(),
  copyPathwayVersion: (...args: unknown[]) => copyPathway(...args),
}))
vi.mock('@/services/incidence-rate-versions.service', () => ({
  getIncidenceRateVersions: vi.fn().mockResolvedValue([]),
  updateIncidenceRateVersion: vi.fn(),
  copyIncidenceRateVersion: (...args: unknown[]) => copyIR(...args),
}))

vi.mock('@/stores/cohort', () => ({
  useCohortStore: () => ({ savePreviewAsCurrent: saveCohortPreview }),
}))
vi.mock('@/stores/concept-sets', () => ({
  useConceptSetsStore: () => ({ savePreviewAsCurrent: saveConceptSetPreview }),
}))
vi.mock('@/stores/pathway', () => ({
  usePathwayStore: () => ({ savePreviewAsCurrent: savePathwayPreview }),
}))
vi.mock('@/stores/incidence-rate', () => ({
  useIncidenceRateStore: () => ({ savePreviewAsCurrent: saveIRPreview }),
}))

const VersionsTableStub = defineComponent({
  name: 'VersionsTable',
  props: {
    filteredVersions: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['preview', 'edit-comment', 'copy', 'clear-filters', 'author-filter'],
  template: '<div />',
})

const VersionCommentDialogStub = defineComponent({
  name: 'VersionCommentDialog',
  props: {
    modelValue: Boolean,
    version: {
      type: Object,
      default: null,
    },
  },
  template: '<div data-testid="comment-dialog" />',
})

const AtlasDialogStub = defineComponent({
  name: 'AtlasDialog',
  template: '<div><slot /><slot name="actions" /></div>',
})

const AtlasButtonStub = defineComponent({
  name: 'AtlasButton',
  emits: ['click'],
  template: '<button @click="$emit(\'click\')"><slot /></button>',
})

function makeConfig(assetType: VersionsConfig['assetType']): VersionsConfig {
  const current: VersionsTableItem = {
    version: 0,
    assetId: 42,
    createdBy: { id: 0, name: '' },
    createdDate: '',
    comment: null,
    archived: false,
    displayVersion: 'Current',
    isCurrent: true,
    isPreviewing: false,
    formattedDate: '',
  }
  return {
    assetType,
    assetId: 42,
    currentVersion: () => current,
    previewVersion: ref(null),
    canEdit: ref(true),
    isDirty: ref(false),
  }
}

const copyServices = {
  cohortdefinition: copyCohort,
  conceptset: copyConceptSet,
  'pathway-analysis': copyPathway,
  ir: copyIR,
} as const

async function flushAsync() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

describe('VersionsTabContent handleCopy dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    copyCohort.mockResolvedValue({ id: 101 })
    copyConceptSet.mockResolvedValue({ id: 102 })
    copyPathway.mockResolvedValue({ id: 103 })
    copyIR.mockResolvedValue({ id: 104 })
    getPathwayVersions.mockResolvedValue([])
    saveCohortPreview.mockResolvedValue(true)
    saveConceptSetPreview.mockResolvedValue(true)
    savePathwayPreview.mockResolvedValue(true)
    saveIRPreview.mockResolvedValue(true)
  })

  for (const assetType of Object.keys(copyServices) as (keyof typeof copyServices)[]) {
    it(`dispatches a ${assetType} copy to its own service only`, async () => {
      const wrapper = mount(VersionsTabContent, {
        props: { config: makeConfig(assetType) },
        global: {
          stubs: {
            VersionsTable: VersionsTableStub,
            VersionCommentDialog: true,
            AtlasDialog: true,
            AtlasSnackbar: true,
            AtlasButton: true,
          },
        },
      })
      await flushAsync()

      wrapper.findComponent(VersionsTableStub).vm.$emit('copy', 3)
      await flushAsync()

      expect(copyServices[assetType]).toHaveBeenCalledWith(42, 3)
      for (const [otherType, fn] of Object.entries(copyServices)) {
        if (otherType === assetType) {
          expect(fn).toHaveBeenCalledWith(42, 3)
        } else {
          expect(fn).not.toHaveBeenCalled()
        }
      }

      wrapper.unmount()
    })
  }

  it('navigates to a preview and opens the selected version comment dialog', async () => {
    const wrapper = mount(VersionsTabContent, {
      props: { config: makeConfig('pathway-analysis') },
      global: {
        stubs: {
          VersionsTable: VersionsTableStub,
          VersionCommentDialog: VersionCommentDialogStub,
          AtlasDialog: true,
          AtlasSnackbar: true,
          AtlasButton: true,
        },
      },
    })
    await flushAsync()
    const table = wrapper.findComponent(VersionsTableStub)

    table.vm.$emit('preview', 4)
    table.vm.$emit('edit-comment', { version: 4, comment: null })
    await flushAsync()

    expect(mockPush).toHaveBeenCalledWith({ path: '/pathway-analysis/42/version/4' })
    expect(wrapper.findComponent(VersionCommentDialogStub).props('modelValue')).toBe(true)
    expect(wrapper.findComponent(VersionCommentDialogStub).props('version')).toMatchObject({ version: 4 })
  })

  it('optimistically updates a saved version comment and shows feedback', async () => {
    getPathwayVersions.mockResolvedValueOnce([{
      version: 4,
      assetId: 42,
      createdBy: { id: 1, name: 'Author' },
      createdDate: '2025-01-01T00:00:00.000Z',
      comment: 'Original comment',
      archived: false,
    }])
    const wrapper = mount(VersionsTabContent, {
      props: { config: makeConfig('pathway-analysis') },
      global: { stubs: { VersionsTable: VersionsTableStub, VersionCommentDialog: VersionCommentDialogStub, AtlasDialog: true, AtlasSnackbar: true, AtlasButton: true } },
    })
    await flushAsync()
    wrapper.findComponent(VersionCommentDialogStub).vm.$emit('saved', { version: 4, comment: 'Updated comment' })
    await flushAsync()

    expect(wrapper.findComponent(VersionsTableStub).props('filteredVersions')).toContainEqual(expect.objectContaining({ version: 4, comment: 'Updated comment' }))
    expect(wrapper.findComponent({ name: 'AtlasSnackbar' }).props('severity')).toBe('success')
  })

  it('does not navigate when the user rejects an unsaved-change warning', async () => {
    const config = makeConfig('ir')
    config.isDirty.value = true
    vi.stubGlobal('confirm', vi.fn(() => false))
    const wrapper = mount(VersionsTabContent, {
      props: { config },
      global: { stubs: { VersionsTable: VersionsTableStub, VersionCommentDialog: true, AtlasDialog: true, AtlasSnackbar: true, AtlasButton: true } },
    })
    await flushAsync()
    wrapper.findComponent(VersionsTableStub).vm.$emit('preview', 5)
    await flushAsync()

    expect(mockPush).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('shows an error snackbar when copying a version fails', async () => {
    copyIR.mockRejectedValueOnce(new Error('copy failed'))
    const wrapper = mount(VersionsTabContent, {
      props: { config: makeConfig('ir') },
      global: { stubs: { VersionsTable: VersionsTableStub, VersionCommentDialog: true, AtlasDialog: true, AtlasSnackbar: true, AtlasButton: true } },
    })
    await flushAsync()
    wrapper.findComponent(VersionsTableStub).vm.$emit('copy', 3)
    await flushAsync()

    expect(wrapper.findComponent({ name: 'AtlasSnackbar' }).props('severity')).toBe('danger')
  })

  it('clears preview state and navigates after a successful copy', async () => {
    vi.useFakeTimers()
    const config = makeConfig('cohortdefinition')
    config.previewVersion.value = { version: 3 }
    config.clearPreview = vi.fn()
    const wrapper = mount(VersionsTabContent, {
      props: { config },
      global: { stubs: { VersionsTable: VersionsTableStub, VersionCommentDialog: true, AtlasDialog: true, AtlasSnackbar: true, AtlasButton: true } },
    })
    await flushAsync()
    wrapper.findComponent(VersionsTableStub).vm.$emit('copy', 3)
    await flushAsync()
    await vi.runAllTimersAsync()

    expect(config.clearPreview).toHaveBeenCalled()
    expect(mockPush).toHaveBeenCalledWith({ path: '/cohorts/101' })
    vi.useRealTimers()
  })

  it('continues a confirmed dirty copy and clears preview state without a callback', async () => {
    const config = makeConfig('ir')
    config.isDirty.value = true
    config.previewVersion.value = { version: 3 }
    vi.stubGlobal('confirm', vi.fn(() => true))
    const wrapper = mount(VersionsTabContent, {
      props: { config },
      global: { stubs: { VersionsTable: VersionsTableStub, VersionCommentDialog: true, AtlasDialog: true, AtlasSnackbar: true, AtlasButton: true } },
    })
    await flushAsync()
    wrapper.findComponent(VersionsTableStub).vm.$emit('copy', 3)
    await flushAsync()

    expect(copyIR).toHaveBeenCalledWith(42, 3)
    expect(config.previewVersion.value).toBeNull()
    vi.unstubAllGlobals()
  })

  it('saves preview versions through the matching asset store and reports failures', async () => {
    savePathwayPreview.mockResolvedValueOnce(false)
    saveIRPreview.mockRejectedValueOnce(new Error('save failed'))
    const cases: Array<[VersionsConfig['assetType'], ReturnType<typeof vi.fn>, 'success' | 'danger']> = [
      ['cohortdefinition', saveCohortPreview, 'success'],
      ['conceptset', saveConceptSetPreview, 'success'],
      ['pathway-analysis', savePathwayPreview, 'danger'],
      ['ir', saveIRPreview, 'danger'],
    ]

    for (const [assetType, save, severity] of cases) {
      const wrapper = mount(VersionsTabContent, {
        props: { config: makeConfig(assetType) },
        global: { stubs: { VersionsTable: VersionsTableStub, VersionCommentDialog: true, AtlasDialog: AtlasDialogStub, AtlasSnackbar: true, AtlasButton: AtlasButtonStub } },
      })
      await flushAsync()
      await wrapper.findAll('button').at(-1)!.trigger('click')
      await vi.dynamicImportSettled()
      await flushAsync()

      expect(save).toHaveBeenCalledOnce()
      expect(wrapper.findComponent({ name: 'AtlasSnackbar' }).props('severity')).toBe(severity)
      wrapper.unmount()
    }
  })
})
