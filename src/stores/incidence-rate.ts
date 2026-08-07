import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  IncidenceRate,
  IncidenceRateExpression,
  StratifyRule,
  StudyWindow,
  TimeAtRisk,
  IncidenceRateInfoBySource,
  RateMultiplier,
} from '@/models/incidence-rate.types'
import {
  IR_DEFAULTS,
  STORAGE_KEY_INCIDENCE_RATE_DRAFT,
  IR_AUTO_SAVE_INTERVAL_MS,
  RATE_MULTIPLIER_OPTIONS,
} from '@/models/incidence-rate.types'
import type { Version, VersionedAsset } from '@/components/versions/types'
import {
  getIncidenceRate,
  assignIncidenceRateTag,
  unassignIncidenceRateTag,
} from '@/services/webapi'
import type { Tag } from '@/models/webapi.types'
import { getIncidenceRateVersion } from '@/services/incidence-rate-versions.service'
import { logger } from '@/utils/logger'

export interface IncidenceRateValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
}

export interface IncidenceRateExecutionSummary {
  id: number
  sourceKey: string
  sourceId: number
  status: string
  startTime: number | null
  duration: number | null
  message: string | null
}

function emptyIR(): IncidenceRate {
  return {
    name: '',
    description: '',
    expression: {
      ConceptSets: [],
      targetIds: [],
      outcomeIds: [],
      timeAtRisk: {
        start: { ...IR_DEFAULTS.timeAtRisk.start },
        end: { ...IR_DEFAULTS.timeAtRisk.end },
      },
      strata: [],
    },
    tags: [],
  }
}

export const useIncidenceRateStore = defineStore('incidence-rate', () => {
  const currentIR = ref<IncidenceRate | null>(null)
  const isDirty = ref(false)
  const lastAutoSave = ref<Date | null>(null)
  const previewVersion = ref<Version | null>(null)
  const validationErrors = ref<IncidenceRateValidationError[]>([])
  const isReadOnly = ref(false)

  // Map of cohort id → display name (cohort JSON only carries IDs).
  const cohortNameById = ref<Map<number, string>>(new Map())

  // Generation cache: latest /info polled per source key.
  const executionInfoBySourceKey = ref<Record<string, IncidenceRateInfoBySource>>({})

  // UI state for the report.
  const selectedTargetId = ref<number | null>(null)
  const selectedOutcomeId = ref<number | null>(null)
  const selectedSourceKey = ref<string | null>(null)
  const rateMultiplier = ref<RateMultiplier>(1000)

  const isPreviewMode = computed(() => previewVersion.value !== null)
  const hasErrors = computed(() => validationErrors.value.some(e => e.severity === 'error'))

  function setIR(ir: IncidenceRate) {
    currentIR.value = ir
    isDirty.value = false
    validationErrors.value = []
  }

  function createNewIR() {
    setIR(emptyIR())
    previewVersion.value = null
    isReadOnly.value = false
    cohortNameById.value = new Map()
    executionInfoBySourceKey.value = {}
    selectedTargetId.value = null
    selectedOutcomeId.value = null
    selectedSourceKey.value = null
  }

  function markDirty() {
    isDirty.value = true
  }
  function markClean() {
    isDirty.value = false
  }

  function updateExpression(partial: Partial<IncidenceRateExpression>) {
    if (!currentIR.value) return
    currentIR.value.expression = { ...currentIR.value.expression, ...partial }
    markDirty()
  }

  function updateMeta(partial: Partial<Pick<IncidenceRate, 'name' | 'description'>>) {
    if (!currentIR.value) return
    Object.assign(currentIR.value, partial)
    markDirty()
  }

  function addTargetCohortId(id: number, name?: string) {
    if (!currentIR.value) return
    if (currentIR.value.expression.targetIds.includes(id)) return
    currentIR.value.expression.targetIds.push(id)
    if (name) cohortNameById.value.set(id, name)
    markDirty()
  }

  function removeTargetCohortId(id: number) {
    if (!currentIR.value) return
    currentIR.value.expression.targetIds = currentIR.value.expression.targetIds.filter(
      x => x !== id
    )
    markDirty()
  }

  function addOutcomeCohortId(id: number, name?: string) {
    if (!currentIR.value) return
    if (currentIR.value.expression.outcomeIds.includes(id)) return
    currentIR.value.expression.outcomeIds.push(id)
    if (name) cohortNameById.value.set(id, name)
    markDirty()
  }

  function removeOutcomeCohortId(id: number) {
    if (!currentIR.value) return
    currentIR.value.expression.outcomeIds = currentIR.value.expression.outcomeIds.filter(
      x => x !== id
    )
    markDirty()
  }

  function updateTimeAtRisk(partial: Partial<TimeAtRisk>) {
    if (!currentIR.value) return
    currentIR.value.expression.timeAtRisk = {
      ...currentIR.value.expression.timeAtRisk,
      ...partial,
    }
    markDirty()
  }

  function setStudyWindow(window: StudyWindow) {
    if (!currentIR.value) return
    currentIR.value.expression.studyWindow = window
    markDirty()
  }

  function clearStudyWindow() {
    if (!currentIR.value) return
    delete (currentIR.value.expression as { studyWindow?: StudyWindow }).studyWindow
    markDirty()
  }

  function addStratifyRule(rule: StratifyRule) {
    if (!currentIR.value) return
    currentIR.value.expression.strata.push(rule)
    markDirty()
  }

  function updateStratifyRule(index: number, partial: Partial<StratifyRule>) {
    if (!currentIR.value) return
    const rule = currentIR.value.expression.strata[index]
    if (!rule) return
    currentIR.value.expression.strata[index] = { ...rule, ...partial }
    markDirty()
  }

  function removeStratifyRule(index: number) {
    if (!currentIR.value) return
    currentIR.value.expression.strata.splice(index, 1)
    markDirty()
  }

  function moveStratifyRule(fromIndex: number, toIndex: number) {
    if (!currentIR.value) return
    const arr = currentIR.value.expression.strata
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= arr.length || toIndex >= arr.length) return
    const removed = arr.splice(fromIndex, 1)
    const item = removed[0]
    if (!item) return
    arr.splice(toIndex, 0, item)
    markDirty()
  }

  async function loadIR(id: number): Promise<boolean> {
    const result = await getIncidenceRate(id)
    if (!result.success) {
      logger.error('IncidenceRate', `loadIR(${id}) failed`, result.error)
      return false
    }
    setIR(result.data)
    previewVersion.value = null
    isReadOnly.value = false
    executionInfoBySourceKey.value = {}
    await resolveCohortNames(result.data)
    return true
  }

  async function resolveCohortNames(ir: IncidenceRate) {
    const ids = [...(ir.expression.targetIds ?? []), ...(ir.expression.outcomeIds ?? [])]
    const missing = ids.filter(id => !cohortNameById.value.has(id))
    if (missing.length === 0) return
    const { getCohortDefinition } = await import('@/services/webapi')
    await Promise.all(
      missing.map(async id => {
        const cohort = await getCohortDefinition(id)
        if (cohort?.name) cohortNameById.value.set(id, cohort.name)
      })
    )
  }

  async function loadVersionPreview(id: number, versionNumber: number): Promise<boolean> {
    try {
      const asset: VersionedAsset<IncidenceRate> = await getIncidenceRateVersion(id, versionNumber)
      currentIR.value = asset.entityDTO as IncidenceRate
      previewVersion.value = asset.versionDTO
      isDirty.value = false
      isReadOnly.value = false
      return true
    } catch (err) {
      logger.error('IncidenceRate', 'loadVersionPreview failed', err)
      return false
    }
  }

  function clearPreviewVersion() {
    previewVersion.value = null
  }

  async function savePreviewAsCurrent(): Promise<boolean> {
    if (!previewVersion.value || !currentIR.value?.id) {
      logger.error('IncidenceRateStore', 'Cannot save preview: not in preview mode')
      return false
    }

    try {
      const { saveIncidenceRate } = await import('@/services/webapi')
      const result = await saveIncidenceRate(currentIR.value.id, currentIR.value)

      if (!result.success) {
        logger.error('IncidenceRateStore', 'Failed to save preview as current', result.error)
        return false
      }

      previewVersion.value = null
      return true
    } catch (error) {
      logger.error('IncidenceRateStore', 'Failed to save preview as current', error)
      return false
    }
  }

  let autoSaveTimer: ReturnType<typeof setInterval> | null = null

  function saveToDraft() {
    if (!currentIR.value) return
    try {
      sessionStorage.setItem(
        STORAGE_KEY_INCIDENCE_RATE_DRAFT,
        JSON.stringify({
          ir: currentIR.value,
          cohortNames: Array.from(cohortNameById.value.entries()),
          timestamp: new Date().toISOString(),
        })
      )
      lastAutoSave.value = new Date()
    } catch (err) {
      logger.error('IncidenceRate', 'saveToDraft failed', err)
    }
  }

  function restoreFromDraft(): boolean {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY_INCIDENCE_RATE_DRAFT)
      if (!raw) return false
      const parsed = JSON.parse(raw) as { ir: IncidenceRate; cohortNames?: [number, string][] }
      currentIR.value = parsed.ir
      if (parsed.cohortNames) cohortNameById.value = new Map(parsed.cohortNames)
      isDirty.value = true
      return true
    } catch (err) {
      logger.error('IncidenceRate', 'restoreFromDraft failed', err)
      return false
    }
  }

  function clearDraft() {
    try {
      sessionStorage.removeItem(STORAGE_KEY_INCIDENCE_RATE_DRAFT)
    } catch (err) {
      logger.error('IncidenceRate', 'clearDraft failed', err)
    }
  }

  function stopAutoSave() {
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer)
      autoSaveTimer = null
    }
  }

  function startAutoSave() {
    stopAutoSave()
    autoSaveTimer = setInterval(() => {
      if (isDirty.value && currentIR.value) saveToDraft()
    }, IR_AUTO_SAVE_INTERVAL_MS)
  }

  async function validateIR() {
    const errors: IncidenceRateValidationError[] = []
    const ir = currentIR.value
    if (!ir) {
      validationErrors.value = errors
      return
    }
    if (!ir.name || ir.name.trim() === '') {
      errors.push({ field: 'name', message: 'Name is required', severity: 'error' })
    }
    if (ir.expression.targetIds.length === 0) {
      errors.push({
        field: 'targetIds',
        message: 'At least one target cohort is required',
        severity: 'error',
      })
    }
    if (ir.expression.outcomeIds.length === 0) {
      errors.push({
        field: 'outcomeIds',
        message: 'At least one outcome cohort is required',
        severity: 'error',
      })
    }
    const tar = ir.expression.timeAtRisk
    if (tar.start.DateField === tar.end.DateField && tar.end.Offset <= tar.start.Offset) {
      errors.push({
        field: 'timeAtRisk',
        message: 'Time-at-risk end must be after start when both reference the same date',
        severity: 'error',
      })
    }
    if (ir.expression.studyWindow) {
      if (ir.expression.studyWindow.startDate && ir.expression.studyWindow.endDate && ir.expression.studyWindow.startDate >= ir.expression.studyWindow.endDate) {
        errors.push({
          field: 'studyWindow',
          message: 'Study window start must be before end',
          severity: 'error',
        })
      }
    }
    validationErrors.value = errors
  }

  async function addTag(tag: Tag): Promise<boolean> {
    if (!currentIR.value?.id) return false
    const ok = await assignIncidenceRateTag(currentIR.value.id, tag.id!)
    if (ok && !currentIR.value.tags.some(t => t.id === tag.id)) {
      currentIR.value.tags.push(tag)
      // tag mutations are metadata — do not mark dirty
    }
    return ok
  }

  async function removeTag(tagId: number): Promise<boolean> {
    if (!currentIR.value?.id) return false
    const ok = await unassignIncidenceRateTag(currentIR.value.id, tagId)
    if (ok && currentIR.value) {
      currentIR.value.tags = currentIR.value.tags.filter(t => t.id !== tagId)
    }
    return ok
  }

  async function syncTags(newTags: Tag[]): Promise<void> {
    if (!currentIR.value?.id) return
    const current = currentIR.value.tags
    const toAdd = newTags.filter(n => !current.some(c => c.id === n.id))
    const toRemove = current.filter(c => !newTags.some(n => n.id === c.id))
    for (const t of toAdd) await addTag(t)
    for (const t of toRemove) await removeTag(t.id!)
  }

  function setExecutionInfo(sourceKey: string, info: IncidenceRateInfoBySource) {
    executionInfoBySourceKey.value = {
      ...executionInfoBySourceKey.value,
      [sourceKey]: info,
    }
  }

  function setSelectedSource(sourceKey: string | null) {
    selectedSourceKey.value = sourceKey
  }
  function setSelectedTargetOutcome(target: number | null, outcome: number | null) {
    selectedTargetId.value = target
    selectedOutcomeId.value = outcome
  }
  function setRateMultiplier(m: RateMultiplier) {
    rateMultiplier.value = m
  }

  const canSave = computed(() => isDirty.value && !hasErrors.value && !isPreviewMode.value)
  const canGenerate = computed(
    () =>
      !isDirty.value &&
      !hasErrors.value &&
      currentIR.value?.id !== undefined &&
      !isPreviewMode.value
  )

  const executions = computed<IncidenceRateExecutionSummary[]>(() => {
    const out: IncidenceRateExecutionSummary[] = []
    for (const [sourceKey, info] of Object.entries(executionInfoBySourceKey.value)) {
      const rawStart = info.executionInfo.startTime
      const startTime =
        typeof rawStart === 'number'
          ? rawStart
          : typeof rawStart === 'string' && rawStart
            ? Number(new Date(rawStart))
            : null
      out.push({
        id: info.executionInfo.id.sourceId,
        sourceKey,
        sourceId: info.executionInfo.id.sourceId,
        status: info.executionInfo.status,
        startTime,
        duration: info.executionInfo.executionDuration ?? null,
        message: info.executionInfo.message ?? null,
      })
    }
    out.sort((a, b) => (b.startTime ?? 0) - (a.startTime ?? 0))
    return out
  })

  function executionById(id: number): IncidenceRateExecutionSummary | null {
    return executions.value.find(e => e.id === id) ?? null
  }

  /**
   * Pythia partial-update entry-point. Routes meta vs expression fields to
   * the existing actions and adds target/outcome cohort ids via their
   * dedicated helpers. Returns true when something was applied.
   */
  function applyProposal(payload: {
    name?: string
    description?: string
    targetIds?: number[]
    targetIdsToAdd?: Array<{ id: number; name?: string }>
    outcomeIds?: number[]
    outcomeIdsToAdd?: Array<{ id: number; name?: string }>
    timeAtRisk?: Partial<TimeAtRisk>
    studyWindow?: StudyWindow | null
  }): boolean {
    if (!currentIR.value) return false
    let applied = false

    const meta: Partial<Pick<IncidenceRate, 'name' | 'description'>> = {}
    if (typeof payload.name === 'string' && payload.name.trim()) meta.name = payload.name
    if (typeof payload.description === 'string') meta.description = payload.description
    if (Object.keys(meta).length > 0) {
      updateMeta(meta)
      applied = true
    }

    if (Array.isArray(payload.targetIds)) {
      currentIR.value.expression.targetIds = [...payload.targetIds]
      markDirty()
      applied = true
    } else if (Array.isArray(payload.targetIdsToAdd)) {
      for (const t of payload.targetIdsToAdd) addTargetCohortId(t.id, t.name)
      if (payload.targetIdsToAdd.length > 0) applied = true
    }

    if (Array.isArray(payload.outcomeIds)) {
      currentIR.value.expression.outcomeIds = [...payload.outcomeIds]
      markDirty()
      applied = true
    } else if (Array.isArray(payload.outcomeIdsToAdd)) {
      for (const o of payload.outcomeIdsToAdd) addOutcomeCohortId(o.id, o.name)
      if (payload.outcomeIdsToAdd.length > 0) applied = true
    }

    if (payload.timeAtRisk) {
      updateTimeAtRisk(payload.timeAtRisk)
      applied = true
    }

    if (payload.studyWindow === null) {
      clearStudyWindow()
      applied = true
    } else if (payload.studyWindow) {
      setStudyWindow(payload.studyWindow)
      applied = true
    }

    return applied
  }

  return {
    // state
    currentIR,
    isDirty,
    lastAutoSave,
    previewVersion,
    validationErrors,
    isReadOnly,
    cohortNameById,
    executionInfoBySourceKey,
    selectedTargetId,
    selectedOutcomeId,
    selectedSourceKey,
    rateMultiplier,
    // computed
    isPreviewMode,
    hasErrors,
    canSave,
    canGenerate,
    executions,
    executionById,
    // mutators
    setIR,
    createNewIR,
    markDirty,
    markClean,
    updateExpression,
    updateMeta,
    applyProposal,
    addTargetCohortId,
    removeTargetCohortId,
    addOutcomeCohortId,
    removeOutcomeCohortId,
    updateTimeAtRisk,
    setStudyWindow,
    clearStudyWindow,
    addStratifyRule,
    updateStratifyRule,
    removeStratifyRule,
    moveStratifyRule,
    // lifecycle
    loadIR,
    loadVersionPreview,
    clearPreviewVersion,
    savePreviewAsCurrent,
    saveToDraft,
    restoreFromDraft,
    clearDraft,
    startAutoSave,
    stopAutoSave,
    validateIR,
    addTag,
    removeTag,
    syncTags,
    setExecutionInfo,
    setSelectedSource,
    setSelectedTargetOutcome,
    setRateMultiplier,
    // re-export options for convenience
    RATE_MULTIPLIER_OPTIONS,
  }
})
