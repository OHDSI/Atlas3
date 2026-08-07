import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Pathway, PathwayCohortRef, PathwayDesign } from '@/models/pathway.types'
import {
  PATHWAY_DEFAULTS,
  STORAGE_KEY_PATHWAY_DRAFT,
  PATHWAY_AUTO_SAVE_INTERVAL_MS,
} from '@/models/pathway.types'
import type { Version, VersionedAsset } from '@/components/versions/types'
import { getPathway, assignPathwayTag, unassignPathwayTag } from '@/services/webapi'
import type { Tag } from '@/models/webapi.types'
import { getPathwayVersion } from '@/services/pathway-versions.service'
import { logger } from '@/utils/logger'

export interface PathwayValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
}

function emptyPathway(): Pathway {
  return {
    name: '',
    description: '',
    targetCohorts: [],
    eventCohorts: [],
    combinationWindow: PATHWAY_DEFAULTS.combinationWindow,
    minCellCount: PATHWAY_DEFAULTS.minCellCount,
    maxDepth: PATHWAY_DEFAULTS.maxDepth,
    allowRepeats: PATHWAY_DEFAULTS.allowRepeats,
    tags: [],
  }
}

export const usePathwayStore = defineStore('pathway', () => {
  const currentPathway = ref<Pathway | null>(null)
  const isDirty = ref(false)
  const lastAutoSave = ref<Date | null>(null)
  const previewVersion = ref<Version | null>(null)
  const validationErrors = ref<PathwayValidationError[]>([])
  const isReadOnly = ref(false)

  const isPreviewMode = computed(() => previewVersion.value !== null)
  const hasErrors = computed(() => validationErrors.value.some(e => e.severity === 'error'))

  function setPathway(p: Pathway) {
    currentPathway.value = p
    isDirty.value = false
    validationErrors.value = []
  }

  function createNewPathway() {
    setPathway(emptyPathway())
    previewVersion.value = null
    isReadOnly.value = false
  }

  function markDirty() {
    isDirty.value = true
  }
  function markClean() {
    isDirty.value = false
  }

  // `updateDesign` writes the configurable settings sub-shape onto the
  // flat Pathway object (the WebAPI no longer wraps these in a `design`
  // sub-object — see pathway.types.ts).
  function updateDesign(partial: Partial<PathwayDesign>) {
    if (!currentPathway.value) return
    Object.assign(currentPathway.value, partial)
    markDirty()
  }

  function updateMeta(partial: Partial<Pick<Pathway, 'name' | 'description'>>) {
    if (!currentPathway.value) return
    Object.assign(currentPathway.value, partial)
    markDirty()
  }

  function addTargetCohort(refToAdd: PathwayCohortRef) {
    if (!currentPathway.value) return
    if (currentPathway.value.targetCohorts.some(c => c.id === refToAdd.id)) return
    currentPathway.value.targetCohorts.push(refToAdd)
    markDirty()
  }

  function removeTargetCohort(id: number) {
    if (!currentPathway.value) return
    currentPathway.value.targetCohorts = currentPathway.value.targetCohorts.filter(c => c.id !== id)
    markDirty()
  }

  function renameTargetCohort(id: number, name: string) {
    const c = currentPathway.value?.targetCohorts.find(x => x.id === id)
    if (c) {
      c.name = name
      markDirty()
    }
  }

  function addEventCohort(refToAdd: PathwayCohortRef) {
    if (!currentPathway.value) return
    if (currentPathway.value.eventCohorts.some(c => c.id === refToAdd.id)) return
    currentPathway.value.eventCohorts.push(refToAdd)
    markDirty()
  }

  function removeEventCohort(id: number) {
    if (!currentPathway.value) return
    currentPathway.value.eventCohorts = currentPathway.value.eventCohorts.filter(c => c.id !== id)
    markDirty()
  }

  function renameEventCohort(id: number, name: string) {
    const c = currentPathway.value?.eventCohorts.find(x => x.id === id)
    if (c) {
      c.name = name
      markDirty()
    }
  }

  async function loadPathway(id: number): Promise<boolean> {
    const result = await getPathway(id)
    if (!result.success) {
      logger.error('Pathway', `loadPathway(${id}) failed`, result.error)
      return false
    }
    setPathway(result.data)
    previewVersion.value = null
    isReadOnly.value = false
    return true
  }

  async function loadVersionPreview(id: number, versionNumber: number): Promise<boolean> {
    try {
      const asset: VersionedAsset<Pathway> = await getPathwayVersion(id, versionNumber)
      currentPathway.value = asset.entityDTO as Pathway
      previewVersion.value = asset.versionDTO
      isDirty.value = false
      isReadOnly.value = false
      return true
    } catch (err) {
      logger.error('Pathway', 'loadVersionPreview failed', err)
      return false
    }
  }

  async function clearPreviewVersion(): Promise<void> {
    const id = currentPathway.value?.id
    if (id) {
      await loadPathway(id)
      return
    }
    previewVersion.value = null
  }

  async function savePreviewAsCurrent(): Promise<boolean> {
    if (!previewVersion.value || !currentPathway.value?.id) {
      logger.error('PathwayStore', 'Cannot save preview: not in preview mode')
      return false
    }

    try {
      const { savePathway } = await import('@/services/webapi')
      const result = await savePathway(currentPathway.value.id, currentPathway.value)

      if (!result.success) {
        logger.error('PathwayStore', 'Failed to save preview as current', result.error)
        return false
      }

      previewVersion.value = null
      return true
    } catch (error) {
      logger.error('PathwayStore', 'Failed to save preview as current', error)
      return false
    }
  }

  let autoSaveTimer: ReturnType<typeof setInterval> | null = null

  function saveToDraft() {
    if (!currentPathway.value) return
    try {
      sessionStorage.setItem(
        STORAGE_KEY_PATHWAY_DRAFT,
        JSON.stringify({
          pathway: currentPathway.value,
          timestamp: new Date().toISOString(),
        })
      )
      lastAutoSave.value = new Date()
    } catch (err) {
      logger.error('Pathway', 'saveToDraft failed', err)
    }
  }

  function restoreFromDraft(): boolean {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY_PATHWAY_DRAFT)
      if (!raw) return false
      const { pathway } = JSON.parse(raw) as { pathway: Pathway; timestamp: string }
      currentPathway.value = pathway
      isDirty.value = true
      return true
    } catch (err) {
      logger.error('Pathway', 'restoreFromDraft failed', err)
      return false
    }
  }

  function clearDraft() {
    try {
      sessionStorage.removeItem(STORAGE_KEY_PATHWAY_DRAFT)
    } catch (err) {
      logger.error('Pathway', 'clearDraft failed', err)
    }
  }

  async function validatePathway() {
    const errors: PathwayValidationError[] = []
    const p = currentPathway.value
    if (!p) {
      validationErrors.value = errors
      return
    }
    if (!p.name || p.name.trim() === '') {
      errors.push({ field: 'name', message: 'Name is required', severity: 'error' })
    }
    if (p.targetCohorts.length === 0) {
      errors.push({
        field: 'targetCohorts',
        message: 'At least one target cohort is required',
        severity: 'error',
      })
    }
    if (p.eventCohorts.length === 0) {
      errors.push({
        field: 'eventCohorts',
        message: 'At least one event cohort is required',
        severity: 'error',
      })
    }
    if (p.maxDepth < 1) {
      errors.push({
        field: 'maxDepth',
        message: 'Max depth must be at least 1',
        severity: 'error',
      })
    }
    if (p.minCellCount < 1) {
      errors.push({
        field: 'minCellCount',
        message: 'Min cell count must be at least 1',
        severity: 'warning',
      })
    }
    validationErrors.value = errors
  }

  async function addTag(tag: Tag): Promise<boolean> {
    if (!currentPathway.value?.id) return false
    const ok = await assignPathwayTag(currentPathway.value.id, tag.id!)
    if (ok && !currentPathway.value.tags.some(t => t.id === tag.id)) {
      currentPathway.value.tags.push(tag)
      // intentionally do NOT mark dirty — tag mutations are metadata
    }
    return ok
  }

  async function removeTag(tagId: number): Promise<boolean> {
    if (!currentPathway.value?.id) return false
    const ok = await unassignPathwayTag(currentPathway.value.id, tagId)
    if (ok && currentPathway.value) {
      currentPathway.value.tags = currentPathway.value.tags.filter(t => t.id !== tagId)
    }
    return ok
  }

  async function syncTags(newTags: Tag[]): Promise<void> {
    if (!currentPathway.value?.id) return
    const current = currentPathway.value.tags
    const toAdd = newTags.filter(n => !current.some(c => c.id === n.id))
    const toRemove = current.filter(c => !newTags.some(n => n.id === c.id))
    for (const t of toAdd) await addTag(t)
    for (const t of toRemove) await removeTag(t.id!)
  }

  const canSave = computed(() => isDirty.value && !hasErrors.value && !isPreviewMode.value)

  const canGenerate = computed(
    () =>
      !isDirty.value &&
      !hasErrors.value &&
      currentPathway.value?.id !== undefined &&
      !isPreviewMode.value
  )

  function stopAutoSave() {
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer)
      autoSaveTimer = null
    }
  }

  function startAutoSave() {
    stopAutoSave()
    autoSaveTimer = setInterval(() => {
      if (isDirty.value && currentPathway.value) saveToDraft()
    }, PATHWAY_AUTO_SAVE_INTERVAL_MS)
  }

  /**
   * Pythia partial-update entry-point. Routes meta vs design fields to the
   * existing actions and adds target/event cohorts via their dedicated
   * helpers. Returns true when something was applied.
   */
  function applyProposal(payload: {
    name?: string
    description?: string
    targetCohorts?: PathwayCohortRef[]
    targetCohortsToAdd?: PathwayCohortRef[]
    eventCohorts?: PathwayCohortRef[]
    eventCohortsToAdd?: PathwayCohortRef[]
    combinationWindow?: number
    minCellCount?: number
    maxDepth?: number
    allowRepeats?: boolean
  }): boolean {
    if (!currentPathway.value) return false
    let applied = false
    const meta: Partial<Pick<Pathway, 'name' | 'description'>> = {}
    if (typeof payload.name === 'string' && payload.name.trim()) meta.name = payload.name
    if (typeof payload.description === 'string') meta.description = payload.description
    if (Object.keys(meta).length > 0) {
      updateMeta(meta)
      applied = true
    }

    const design: Partial<PathwayDesign> = {}
    if (typeof payload.combinationWindow === 'number') design.combinationWindow = payload.combinationWindow
    if (typeof payload.minCellCount === 'number') design.minCellCount = payload.minCellCount
    if (typeof payload.maxDepth === 'number') design.maxDepth = payload.maxDepth
    if (typeof payload.allowRepeats === 'boolean') design.allowRepeats = payload.allowRepeats
    if (Object.keys(design).length > 0) {
      updateDesign(design)
      applied = true
    }

    if (Array.isArray(payload.targetCohorts)) {
      currentPathway.value.targetCohorts = payload.targetCohorts
      markDirty()
      applied = true
    } else if (Array.isArray(payload.targetCohortsToAdd)) {
      for (const c of payload.targetCohortsToAdd) addTargetCohort(c)
      if (payload.targetCohortsToAdd.length > 0) applied = true
    }

    if (Array.isArray(payload.eventCohorts)) {
      currentPathway.value.eventCohorts = payload.eventCohorts
      markDirty()
      applied = true
    } else if (Array.isArray(payload.eventCohortsToAdd)) {
      for (const c of payload.eventCohortsToAdd) addEventCohort(c)
      if (payload.eventCohortsToAdd.length > 0) applied = true
    }

    return applied
  }

  return {
    currentPathway,
    isDirty,
    lastAutoSave,
    previewVersion,
    validationErrors,
    isReadOnly,
    isPreviewMode,
    hasErrors,
    setPathway,
    createNewPathway,
    markDirty,
    markClean,
    updateDesign,
    updateMeta,
    applyProposal,
    addTargetCohort,
    removeTargetCohort,
    renameTargetCohort,
    addEventCohort,
    removeEventCohort,
    renameEventCohort,
    loadPathway,
    loadVersionPreview,
    clearPreviewVersion,
    savePreviewAsCurrent,
    saveToDraft,
    restoreFromDraft,
    clearDraft,
    startAutoSave,
    stopAutoSave,
    validatePathway,
    canSave,
    canGenerate,
    addTag,
    removeTag,
    syncTags,
  }
})
