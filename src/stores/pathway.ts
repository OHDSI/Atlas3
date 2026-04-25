import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Pathway, PathwayCohortRef, PathwayDesign } from '@/models/pathway.types'
import { PATHWAY_DEFAULTS, STORAGE_KEY_PATHWAY_DRAFT, PATHWAY_AUTO_SAVE_INTERVAL_MS } from '@/models/pathway.types'
import type { Version, VersionedAsset } from '@/components/versions/types'
import { getPathway } from '@/services/webapi'
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
    design: {
      targetCohorts: [],
      eventCohorts: [],
      combinationWindow: PATHWAY_DEFAULTS.combinationWindow,
      minCellCount: PATHWAY_DEFAULTS.minCellCount,
      maxDepth: PATHWAY_DEFAULTS.maxDepth,
      allowRepeats: PATHWAY_DEFAULTS.allowRepeats,
    },
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

  function markDirty() { isDirty.value = true }
  function markClean() { isDirty.value = false }

  function updateDesign(partial: Partial<PathwayDesign>) {
    if (!currentPathway.value) return
    currentPathway.value.design = { ...currentPathway.value.design, ...partial }
    markDirty()
  }

  function updateMeta(partial: Partial<Pick<Pathway, 'name' | 'description'>>) {
    if (!currentPathway.value) return
    Object.assign(currentPathway.value, partial)
    markDirty()
  }

  function addTargetCohort(refToAdd: PathwayCohortRef) {
    if (!currentPathway.value) return
    if (currentPathway.value.design.targetCohorts.some(c => c.id === refToAdd.id)) return
    currentPathway.value.design.targetCohorts.push(refToAdd)
    markDirty()
  }

  function removeTargetCohort(id: number) {
    if (!currentPathway.value) return
    currentPathway.value.design.targetCohorts =
      currentPathway.value.design.targetCohorts.filter(c => c.id !== id)
    markDirty()
  }

  function renameTargetCohort(id: number, name: string) {
    const c = currentPathway.value?.design.targetCohorts.find(x => x.id === id)
    if (c) { c.name = name; markDirty() }
  }

  function addEventCohort(refToAdd: PathwayCohortRef) {
    if (!currentPathway.value) return
    if (currentPathway.value.design.eventCohorts.some(c => c.id === refToAdd.id)) return
    currentPathway.value.design.eventCohorts.push(refToAdd)
    markDirty()
  }

  function removeEventCohort(id: number) {
    if (!currentPathway.value) return
    currentPathway.value.design.eventCohorts =
      currentPathway.value.design.eventCohorts.filter(c => c.id !== id)
    markDirty()
  }

  function renameEventCohort(id: number, name: string) {
    const c = currentPathway.value?.design.eventCohorts.find(x => x.id === id)
    if (c) { c.name = name; markDirty() }
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

  function clearPreviewVersion() {
    previewVersion.value = null
  }

  let autoSaveTimer: ReturnType<typeof setInterval> | null = null

  function saveToDraft() {
    if (!currentPathway.value) return
    try {
      sessionStorage.setItem(STORAGE_KEY_PATHWAY_DRAFT, JSON.stringify({
        pathway: currentPathway.value,
        timestamp: new Date().toISOString(),
      }))
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
    try { sessionStorage.removeItem(STORAGE_KEY_PATHWAY_DRAFT) }
    catch (err) { logger.error('Pathway', 'clearDraft failed', err) }
  }

  function stopAutoSave() {
    if (autoSaveTimer) { clearInterval(autoSaveTimer); autoSaveTimer = null }
  }

  function startAutoSave() {
    stopAutoSave()
    autoSaveTimer = setInterval(() => {
      if (isDirty.value && currentPathway.value) saveToDraft()
    }, PATHWAY_AUTO_SAVE_INTERVAL_MS)
  }

  return {
    currentPathway, isDirty, lastAutoSave, previewVersion,
    validationErrors, isReadOnly,
    isPreviewMode, hasErrors,
    setPathway, createNewPathway, markDirty, markClean,
    updateDesign, updateMeta,
    addTargetCohort, removeTargetCohort, renameTargetCohort,
    addEventCohort, removeEventCohort, renameEventCohort,
    loadPathway, loadVersionPreview, clearPreviewVersion,
    saveToDraft, restoreFromDraft, clearDraft, startAutoSave, stopAutoSave,
  }
})
