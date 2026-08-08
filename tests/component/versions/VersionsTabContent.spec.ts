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
  getPathwayVersions: vi.fn().mockResolvedValue([]),
  updatePathwayVersion: vi.fn(),
  copyPathwayVersion: (...args: unknown[]) => copyPathway(...args),
}))
vi.mock('@/services/incidence-rate-versions.service', () => ({
  getIncidenceRateVersions: vi.fn().mockResolvedValue([]),
  updateIncidenceRateVersion: vi.fn(),
  copyIncidenceRateVersion: (...args: unknown[]) => copyIR(...args),
}))

const VersionsTableStub = defineComponent({
  name: 'VersionsTable',
  emits: ['preview', 'edit-comment', 'copy', 'clear-filters', 'author-filter'],
  template: '<div />',
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
        if (otherType !== assetType) expect(fn).not.toHaveBeenCalled()
      }

      wrapper.unmount()
    })
  }
})
