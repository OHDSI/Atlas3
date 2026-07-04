import type { HostMessage } from '@/models/PluginModels'
import { getHostMessageBus } from '@/plugins/messaging/HostMessageBus'
import { useCohortStore } from '@/stores/cohort'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useDataSourcesStore } from '@/stores/datasources'
import { useFeatureAnalysesStore } from '@/stores/feature-analyses'
import { useCharacterizationStore } from '@/stores/characterization'
import { usePathwayStore } from '@/stores/pathway'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import { useUIStore } from '@/stores/ui'
import type {
  AgentProposal,
  CharacterizationCreatePayload,
  FeatureAnalysisCreatePayload,
  IncidenceRateCreatePayload,
  NavigateRoute,
  PathwayCreatePayload,
  StandaloneConceptSetPayload,
  UpdateCharacterizationPayload,
  UpdateConceptSetPayload,
  UpdateFeatureAnalysisPayload,
  UpdateIncidenceRatePayload,
  UpdatePathwayPayload,
} from '@/models/agent.types'
import router from '@/router'
import { createConceptSet } from '@/services/concept-set.service'
import { createFeatureAnalysis } from '@/services/feature-analysis.service'
import { createCharacterization } from '@/services/characterization.service'
import { createPathway, createIncidenceRate } from '@/services/webapi'
import type { ConceptSetItem } from '@/models/concept-set.types'
import type {
  FeatureAnalysis,
  FeatureAnalysisType,
  FeatureAnalysisDomain,
  FeatureAnalysisStatType,
} from '@/models/feature-analysis.types'
import type { CharacterizationDefinition } from '@/models/characterization.types'
import type { Pathway } from '@/models/pathway.types'
import type { IncidenceRate } from '@/models/incidence-rate.types'
import { logger } from '@/utils/logger'
import { applyCapability, type ApplyResult } from './capabilities/apply'

const PLUGIN_ID = 'pythia-plugin'

let installed = false

export function setupPythiaBridge(): void {
  if (installed) return
  installed = true

  window.addEventListener('plugin-message', (event: Event) => {
    const detail = (event as CustomEvent<HostMessage>).detail
    if (!detail || detail.sourcePluginId !== PLUGIN_ID) return

    switch (detail.type) {
      case 'cohort.applyProposal':
      case 'pythia.applyProposal':
        void handleApplyProposal(
          detail.payload as { proposal: AgentProposal },
          detail.callbackId
        )
        break
      case 'cohort.rejectProposal':
      case 'pythia.rejectProposal':
        logger.debug('pythiaBridge', 'proposal rejected', detail.payload)
        break
      case 'cohort.getContext':
      case 'app.getContext':
        handleGetContext(detail.callbackId)
        break
      case 'notify.snackbar':
        handleSnackbar(detail.payload as { message: string; type?: string })
        break
      case 'capability.apply': {
        const { name, args } = detail.payload as { name: string; args: Record<string, unknown> }
        void handleCapabilityApply(name, args, detail.callbackId)
        break
      }
      default:
        break
    }
  })

  logger.debug('pythiaBridge', 'installed')
}

async function handleApplyProposal(
  payload: { proposal: AgentProposal },
  callbackId?: string
): Promise<void> {
  const result = await applyProposalInner(payload)
  if (callbackId) {
    const bus = getHostMessageBus(PLUGIN_ID)
    bus?.handleResponse(callbackId, result ?? {})
  }
}

export async function applyProposalDirect(
  proposal: AgentProposal
): Promise<{ id?: number | string; name?: string } | void> {
  return applyProposalInner({ proposal })
}

async function handleCapabilityApply(
  name: string,
  args: Record<string, unknown>,
  callbackId?: string
): Promise<void> {
  let result: ApplyResult
  try {
    result = await applyCapability(name, args)
  } catch (err) {
    logger.error('pythiaBridge', `capability.apply failed for "${name}"`, err)
    result = { applied: false }
  }
  if (callbackId) getHostMessageBus(PLUGIN_ID)?.handleResponse(callbackId, result)
}

async function applyProposalInner(
  payload: { proposal: AgentProposal }
): Promise<{ id?: number | string; name?: string } | void> {
  if (!payload?.proposal) return
  const proposal = payload.proposal
  switch (proposal.kind) {
    case 'navigate':
      await handleNavigate(proposal.route)
      return
    case 'saveCohort':
      return await handleSaveCohort(proposal)
    case 'createStandaloneConceptSet':
      return await handleCreateStandaloneConceptSet(proposal.conceptSet)
    case 'createFeatureAnalysis':
      return await handleCreateFeatureAnalysis(proposal.payload)
    case 'createCharacterization':
      return await handleCreateCharacterization(proposal.payload)
    case 'createPathway':
      return await handleCreatePathway(proposal.payload)
    case 'createIncidenceRate':
      return await handleCreateIncidenceRate(proposal.payload)
    case 'updateConceptSet':
      await handleUpdateConceptSet(proposal.payload); return
    case 'updateFeatureAnalysis':
      await handleUpdateFeatureAnalysis(proposal.payload); return
    case 'updateCharacterization':
      await handleUpdateCharacterization(proposal.payload); return
    case 'updatePathway':
      await handleUpdatePathway(proposal.payload); return
    case 'updateIncidenceRate':
      await handleUpdateIncidenceRate(proposal.payload); return
    default: {
      const cohortStore = useCohortStore()
      const currentRoute = router.currentRoute.value
      const onNewCohortRoute = currentRoute.name === 'cohort-new'
      if (!onNewCohortRoute) {
        cohortStore.createNewCohort()
      }
      cohortStore.applyProposal(proposal)
      await ensureOnCohortRoute()
      return
    }
  }
}

const COHORT_ROUTES = new Set([
  'cohort-edit',
  'cohort-new',
  'cohort-version-preview',
])

async function ensureOnCohortRoute() {
  const current = router.currentRoute.value
  const name = typeof current.name === 'string' ? current.name : ''
  if (COHORT_ROUTES.has(name)) return
  const cohort = useCohortStore().currentCohort
  if (!cohort) return
  try {
    if (typeof cohort.id === 'number') {
      await router.push({ name: 'cohort-edit', params: { id: String(cohort.id) } })
    } else {
      await router.push({ name: 'cohort-new' })
    }
  } catch (err) {
    logger.warn('pythiaBridge', 'auto-navigate to cohort route failed', err)
  }
}

async function handleSaveCohort(
  proposal: { name?: string; description?: string } = {}
): Promise<{ id?: number; name?: string } | void> {
  const cohortStore = useCohortStore()
  if (!cohortStore.currentCohort) {
    showSnackbar('There is no cohort to save yet', 'error')
    return
  }
  await ensureOnCohortRoute()
  return await cohortStore.requestSave({ name: proposal.name, description: proposal.description })
}

async function handleNavigate(route: NavigateRoute) {
  if (!route?.name) return
  if (route.name === 'cohort-new') {
    const cohortStore = useCohortStore()
    const currentName = router.currentRoute.value.name
    const editorMounted = typeof currentName === 'string' && COHORT_ROUTES.has(currentName)
    if (editorMounted && cohortStore.currentCohort && cohortStore.isDirty) {
      await cohortStore.requestSave() // safety auto-save before blanking
    }
    cohortStore.requestNewCohort()
  }
  try {
    router.push({ name: route.name, params: route.params ?? {} })
  } catch (err) {
    logger.warn('pythiaBridge', 'navigate failed', { route, err })
    showSnackbar('Could not navigate to that view', 'error')
  }
}

async function handleCreateStandaloneConceptSet(
  payload: StandaloneConceptSetPayload
): Promise<{ id?: number | string; name?: string } | void> {
  if (!payload?.name || !Array.isArray(payload.items) || payload.items.length === 0) {
    showSnackbar('Concept set is missing a name or items', 'error')
    return
  }

  // The service only sends conceptId / isExcluded / includeDescendants /
  // includeMapped to the WebAPI when persisting items; the editor re-resolves
  // full concept metadata on load. We still need to satisfy the ConceptSetItem
  // type, so fill in placeholder strings — they are not transmitted.
  const conceptSetItems: ConceptSetItem[] = payload.items.map(it => ({
    conceptId: it.conceptId,
    conceptName: it.conceptName,
    conceptCode: '',
    domainId: it.domain ?? '',
    vocabularyId: '',
    conceptClassId: '',
    standardConcept: 'S',
    invalidReason: null,
    isExcluded: it.isExcluded ?? false,
    includeDescendants: it.includeDescendants ?? true,
    includeMapped: false,
  }))

  const created = await createConceptSet({
    name: payload.name,
    description: payload.description ?? '',
    items: conceptSetItems,
  })

  if (!created || created.id === undefined || created.id === null) {
    showSnackbar('Failed to create concept set', 'error')
    return
  }

  // Branch on intent. Pythia's `create_standalone_concept_set` is the
  // single concept-set tool, used both for "create a Statins set" and for
  // "I need a Statins set to plug into this cohort I'm building". We
  // distinguish on the cohort-store state, NOT on the current route:
  //
  // - If there's any cohort in the store (active build or saved cohort
  //   open in the editor), the new concept set is almost certainly meant
  //   for it. Attach via addConceptSet and STAY where pythia is so the
  //   cohort-build flow continues uninterrupted. We also push the user
  //   onto the cohort route if they aren't already there — that way a
  //   model that creates the concept set BEFORE adding entry events
  //   (no cohort-mutation proposal has yet pulled the user in) still
  //   ends up on the cohort builder rather than /concepts.
  //
  // - If there's no cohort in the store at all, fall back to "open the
  //   concept-set editor" — the user explicitly wanted a standalone set.
  const cohortStore = useCohortStore()
  if (cohortStore.currentCohort) {
    cohortStore.applyProposal({
      kind: 'addConceptSet',
      conceptSet: {
        id: created.id as number,
        name: created.name,
        conceptCount: created.items?.length ?? 0,
      },
    } as never)
    await ensureOnCohortRoute()
    showSnackbar(
      `Concept set "${created.name}" created and attached to the cohort`,
      'success'
    )
    return { id: created.id, name: created.name }
  }

  showSnackbar(`Concept set "${created.name}" created`, 'success')
  try {
    await router.push({ name: 'concepts' })
    const store = useConceptSetsStore()
    await store.openEditEditor(created.id)
  } catch (err) {
    logger.warn('pythiaBridge', 'open-after-create failed', err)
  }
  return { id: created.id, name: created.name }
}

async function navigateToEditor(routeName: string, id: number | string) {
  try {
    await router.push({ name: routeName, params: { id: String(id) } })
  } catch (err) {
    logger.warn('pythiaBridge', 'navigate-after-create failed', { routeName, id, err })
  }
}

async function handleCreateFeatureAnalysis(
  payload: FeatureAnalysisCreatePayload
): Promise<{ id?: number | string; name?: string } | void> {
  if (!payload?.name || !payload?.type) {
    showSnackbar('Feature analysis is missing a name or type', 'error')
    return
  }
  const fa: FeatureAnalysis = {
    name: payload.name,
    description: payload.description,
    type: payload.type as FeatureAnalysisType,
    domain: payload.domain as FeatureAnalysisDomain | undefined,
    statType: payload.statType as FeatureAnalysisStatType | undefined,
    // The editor will validate the design's shape vs `type` on load. We
    // pass it through verbatim — string for PRESET / CUSTOM_FE, object for
    // CRITERIA_SET. Default to an empty string if the model omits it.
    design: (payload.design ?? '') as FeatureAnalysis['design'],
  }
  try {
    const created = await createFeatureAnalysis(fa)
    if (!created?.id) {
      showSnackbar('Failed to create feature analysis', 'error')
      return
    }
    showSnackbar(`Feature analysis "${created.name}" created`, 'success')
    await navigateToEditor('feature-analysis-edit', created.id)
    return { id: created.id, name: created.name }
  } catch (err) {
    logger.error('pythiaBridge', 'createFeatureAnalysis failed', err)
    showSnackbar(`Failed to create feature analysis: ${(err as Error).message}`, 'error')
  }
}

async function handleCreateCharacterization(
  payload: CharacterizationCreatePayload
): Promise<{ id?: number | string; name?: string } | void> {
  if (!payload?.name) {
    showSnackbar('Characterization is missing a name', 'error')
    return
  }
  if (!Array.isArray(payload.cohorts) || payload.cohorts.length === 0) {
    showSnackbar('Characterization needs at least one cohort attached', 'error')
    return
  }
  if (!Array.isArray(payload.featureAnalyses) || payload.featureAnalyses.length === 0) {
    showSnackbar('Characterization needs at least one feature analysis attached', 'error')
    return
  }
  const def: CharacterizationDefinition = {
    name: payload.name,
    description: payload.description,
    cohorts: payload.cohorts.map(c => ({ id: c.id, name: c.name })),
    featureAnalyses: payload.featureAnalyses.map(fa => ({
      id: fa.id,
      // Schema requires name to be a string when present; the editor
      // re-resolves the canonical name on load. Use a placeholder when the
      // model didn't pass one.
      name: fa.name ?? `Feature analysis ${fa.id}`,
    })),
    stratas: [],
  }
  try {
    const created = await createCharacterization(def)
    if (!created?.id) {
      showSnackbar('Failed to create characterization', 'error')
      return
    }
    showSnackbar(`Characterization "${created.name}" created`, 'success')
    await navigateToEditor('characterization-edit', created.id)
    return { id: created.id, name: created.name }
  } catch (err) {
    logger.error('pythiaBridge', 'createCharacterization failed', err)
    showSnackbar(`Failed to create characterization: ${(err as Error).message}`, 'error')
  }
}

async function handleCreatePathway(
  payload: PathwayCreatePayload
): Promise<{ id?: number | string; name?: string } | void> {
  if (!payload?.name) {
    showSnackbar('Pathway is missing a name', 'error')
    return
  }
  const pathway = {
    name: payload.name,
    description: payload.description,
    targetCohorts: (payload.targetCohorts ?? []).map(c => ({ id: c.id, name: c.name })),
    eventCohorts: (payload.eventCohorts ?? []).map(c => ({ id: c.id, name: c.name })),
    combinationWindow: payload.combinationWindow ?? 30,
    minCellCount: payload.minCellCount ?? 5,
    maxDepth: payload.maxDepth ?? 5,
    allowRepeats: payload.allowRepeats ?? false,
    tags: [],
  } as unknown as Pathway

  try {
    const result = await createPathway(pathway)
    if (!result.success || !result.data?.id) {
      const msg = result.success ? 'no id returned' : result.error
      showSnackbar(`Failed to create pathway: ${msg}`, 'error')
      return
    }
    showSnackbar(`Pathway "${result.data.name}" created`, 'success')
    await navigateToEditor('pathway-edit', result.data.id)
    return { id: result.data.id, name: payload.name }
  } catch (err) {
    logger.error('pythiaBridge', 'createPathway failed', err)
    showSnackbar(`Failed to create pathway: ${(err as Error).message}`, 'error')
  }
}

async function handleCreateIncidenceRate(
  payload: IncidenceRateCreatePayload
): Promise<{ id?: number | string; name?: string } | void> {
  if (!payload?.name) {
    showSnackbar('Incidence rate is missing a name', 'error')
    return
  }
  const tar = payload.timeAtRisk ?? {
    start: { DateField: 'StartDate' as const, Offset: 0 },
    end: { DateField: 'EndDate' as const, Offset: 0 },
  }
  const ir = {
    name: payload.name,
    description: payload.description,
    expression: {
      ConceptSets: [],
      targetIds: payload.targetIds ?? [],
      outcomeIds: payload.outcomeIds ?? [],
      timeAtRisk: tar,
      ...(payload.studyWindow?.startDate && payload.studyWindow?.endDate
        ? { studyWindow: { startDate: payload.studyWindow.startDate, endDate: payload.studyWindow.endDate } }
        : {}),
      strata: [],
    },
    tags: [],
  } as unknown as IncidenceRate

  try {
    const result = await createIncidenceRate(ir)
    if (!result.success || !result.data?.id) {
      const msg = result.success ? 'no id returned' : result.error
      showSnackbar(`Failed to create incidence rate: ${msg}`, 'error')
      return
    }
    showSnackbar(`Incidence rate "${result.data.name}" created`, 'success')
    await navigateToEditor('incidence-rate-edit', result.data.id)
    return { id: result.data.id, name: payload.name }
  } catch (err) {
    logger.error('pythiaBridge', 'createIncidenceRate failed', err)
    showSnackbar(`Failed to create incidence rate: ${(err as Error).message}`, 'error')
  }
}

type ArtifactKind =
  | 'cohort'
  | 'conceptSet'
  | 'featureAnalysis'
  | 'characterization'
  | 'pathway'
  | 'incidenceRate'

interface ArtifactSummary {
  kind: ArtifactKind
  id: number | string
  name: string
  summary: string
}

const ROUTE_TO_KIND: Record<string, ArtifactKind> = {
  'cohort-edit': 'cohort',
  'cohort-new': 'cohort',
  concepts: 'conceptSet',
  'concept-detail': 'conceptSet',
  'feature-analysis-edit': 'featureAnalysis',
  'feature-analysis-new': 'featureAnalysis',
  'characterization-edit': 'characterization',
  'characterization-new': 'characterization',
  'pathway-edit': 'pathway',
  'pathway-new': 'pathway',
  'incidence-rate-edit': 'incidenceRate',
  'incidence-rate-new': 'incidenceRate',
}

function buildArtifactSummary(routeName: string): ArtifactSummary | null {
  const kind = ROUTE_TO_KIND[routeName]
  if (!kind) return null
  switch (kind) {
    case 'cohort': {
      const c = useCohortStore().currentCohort
      if (!c) return null
      return {
        kind,
        id: c.id ?? 'draft',
        name: c.name,
        summary: `${c.entryEvents.length} entry event(s), ${c.inclusionRules.length} inclusion rule(s).${c.description ? ` ${c.description}` : ''}`,
      }
    }
    case 'conceptSet': {
      const cs = useConceptSetsStore().currentSet
      if (!cs) return null
      return {
        kind,
        id: cs.id ?? 'draft',
        name: cs.name,
        summary: `${cs.items?.length ?? 0} item(s).`,
      }
    }
    case 'featureAnalysis': {
      const fa = useFeatureAnalysesStore().currentFA
      if (!fa) return null
      return {
        kind,
        id: fa.id ?? 'draft',
        name: fa.name,
        summary: `Type: ${fa.type ?? 'unknown'}.${fa.domain ? ` Domain: ${fa.domain}.` : ''}${fa.description ? ` ${fa.description}` : ''}`,
      }
    }
    case 'characterization': {
      const ch = useCharacterizationStore().currentCharacterization
      if (!ch) return null
      return {
        kind,
        id: ch.id ?? 'draft',
        name: ch.name,
        summary: `${ch.cohorts?.length ?? 0} cohort(s), ${ch.featureAnalyses?.length ?? 0} feature analysis(es).${ch.description ? ` ${ch.description}` : ''}`,
      }
    }
    case 'pathway': {
      const p = usePathwayStore().currentPathway
      if (!p) return null
      return {
        kind,
        id: p.id ?? 'draft',
        name: p.name,
        summary: `${p.targetCohorts?.length ?? 0} target cohort(s), ${p.eventCohorts?.length ?? 0} event cohort(s).${p.description ? ` ${p.description}` : ''}`,
      }
    }
    case 'incidenceRate': {
      const ir = useIncidenceRateStore().currentIR
      if (!ir) return null
      const e = ir.expression
      return {
        kind,
        id: ir.id ?? 'draft',
        name: ir.name,
        summary: `${e?.targetIds?.length ?? 0} target(s), ${e?.outcomeIds?.length ?? 0} outcome(s).${ir.description ? ` ${ir.description}` : ''}`,
      }
    }
  }
}

// ---- Phase 3: edit-existing handlers ---------------------------------------
//
// Each handler ensures the matching artifact is loaded into its store
// (so the editor renders the current contents and the partial merge is
// visible to the user), then calls the store's applyProposal action.
// The user saves through the existing editor flow.

async function ensureConceptSetLoaded(id: number) {
  const store = useConceptSetsStore()
  if (store.currentSet?.id !== id) {
    await store.fetchOne(id)
  }
}

async function handleUpdateConceptSet(payload: UpdateConceptSetPayload) {
  if (typeof payload?.id !== 'number') {
    showSnackbar('Update concept set is missing an id', 'error')
    return
  }
  try {
    await ensureConceptSetLoaded(payload.id)
    const store = useConceptSetsStore()
    if (!store.currentSet) {
      showSnackbar('Could not load concept set for editing', 'error')
      return
    }
    // Translate StandaloneConceptSetItem into the editor's full ConceptSetItem shape.
    const toEditorItems = (its: NonNullable<UpdateConceptSetPayload['items']>): ConceptSetItem[] =>
      its.map(it => ({
        conceptId: it.conceptId,
        conceptName: it.conceptName,
        conceptCode: '',
        domainId: it.domain ?? '',
        vocabularyId: '',
        conceptClassId: '',
        standardConcept: 'S',
        invalidReason: null,
        isExcluded: it.isExcluded ?? false,
        includeDescendants: it.includeDescendants ?? true,
        includeMapped: false,
      }))
    const applied = store.applyProposal({
      name: payload.name,
      description: payload.description,
      items: payload.items ? toEditorItems(payload.items) : undefined,
      itemsToAdd: payload.itemsToAdd ? toEditorItems(payload.itemsToAdd) : undefined,
    })
    if (applied) {
      const ensureOnEditor = router.currentRoute.value.name !== 'concepts'
      if (ensureOnEditor) {
        try { await router.push({ name: 'concepts' }) } catch { /* noop */ }
      }
      showSnackbar(`Concept set "${store.currentSet.name}" updated — review and Save`, 'success')
    } else {
      showSnackbar('No changes to apply', 'info')
    }
  } catch (err) {
    logger.error('pythiaBridge', 'updateConceptSet failed', err)
    showSnackbar(`Failed to update concept set: ${(err as Error).message}`, 'error')
  }
}

async function ensureFeatureAnalysisLoaded(id: number) {
  const store = useFeatureAnalysesStore()
  if (store.currentFA?.id !== id) {
    await store.fetchOne(id)
  }
}

async function handleUpdateFeatureAnalysis(payload: UpdateFeatureAnalysisPayload) {
  if (typeof payload?.id !== 'number') {
    showSnackbar('Update feature analysis is missing an id', 'error')
    return
  }
  try {
    await ensureFeatureAnalysisLoaded(payload.id)
    const store = useFeatureAnalysesStore()
    if (!store.currentFA) {
      showSnackbar('Could not load feature analysis for editing', 'error')
      return
    }
    const applied = store.applyProposal({
      name: payload.name,
      description: payload.description,
      type: payload.type,
      domain: payload.domain,
      statType: payload.statType,
      design: payload.design as FeatureAnalysis['design'],
    } as Partial<FeatureAnalysis>)
    if (applied) {
      if (router.currentRoute.value.name !== 'feature-analysis-edit') {
        try {
          await router.push({ name: 'feature-analysis-edit', params: { id: String(payload.id) } })
        } catch { /* noop */ }
      }
      showSnackbar(`Feature analysis "${store.currentFA.name}" updated — review and Save`, 'success')
    } else {
      showSnackbar('No changes to apply', 'info')
    }
  } catch (err) {
    logger.error('pythiaBridge', 'updateFeatureAnalysis failed', err)
    showSnackbar(`Failed to update feature analysis: ${(err as Error).message}`, 'error')
  }
}

async function ensureCharacterizationLoaded(id: number) {
  const store = useCharacterizationStore()
  if (store.currentCharacterization?.id !== id) {
    await store.fetchOne(id)
  }
}

async function handleUpdateCharacterization(payload: UpdateCharacterizationPayload) {
  if (typeof payload?.id !== 'number') {
    showSnackbar('Update characterization is missing an id', 'error')
    return
  }
  try {
    await ensureCharacterizationLoaded(payload.id)
    const store = useCharacterizationStore()
    if (!store.currentCharacterization) {
      showSnackbar('Could not load characterization for editing', 'error')
      return
    }
    const applied = store.applyProposal({
      name: payload.name,
      description: payload.description,
      cohorts: payload.cohorts,
      cohortsToAdd: payload.cohortsToAdd,
      featureAnalyses: payload.featureAnalyses?.map(fa => ({ id: fa.id, name: fa.name ?? '' })),
      featureAnalysesToAdd: payload.featureAnalysesToAdd?.map(fa => ({
        id: fa.id,
        name: fa.name ?? '',
      })),
    })
    if (applied) {
      if (router.currentRoute.value.name !== 'characterization-edit') {
        try {
          await router.push({ name: 'characterization-edit', params: { id: String(payload.id) } })
        } catch { /* noop */ }
      }
      showSnackbar(
        `Characterization "${store.currentCharacterization.name}" updated — review and Save`,
        'success'
      )
    } else {
      showSnackbar('No changes to apply', 'info')
    }
  } catch (err) {
    logger.error('pythiaBridge', 'updateCharacterization failed', err)
    showSnackbar(`Failed to update characterization: ${(err as Error).message}`, 'error')
  }
}

async function ensurePathwayLoaded(id: number) {
  const store = usePathwayStore()
  if (store.currentPathway?.id !== id) {
    await store.loadPathway(id)
  }
}

async function handleUpdatePathway(payload: UpdatePathwayPayload) {
  if (typeof payload?.id !== 'number') {
    showSnackbar('Update pathway is missing an id', 'error')
    return
  }
  try {
    await ensurePathwayLoaded(payload.id)
    const store = usePathwayStore()
    if (!store.currentPathway) {
      showSnackbar('Could not load pathway for editing', 'error')
      return
    }
    // Pathway store accepts a Zod-passthrough cohort ref (open shape with
    // optional transport fields). Our UpdatePathwayPayload uses the strict
    // CohortRef; widen at the boundary.
    const applied = store.applyProposal(
      payload as Parameters<typeof store.applyProposal>[0]
    )
    if (applied) {
      if (router.currentRoute.value.name !== 'pathway-edit') {
        try {
          await router.push({ name: 'pathway-edit', params: { id: String(payload.id) } })
        } catch { /* noop */ }
      }
      showSnackbar(`Pathway "${store.currentPathway.name}" updated — review and Save`, 'success')
    } else {
      showSnackbar('No changes to apply', 'info')
    }
  } catch (err) {
    logger.error('pythiaBridge', 'updatePathway failed', err)
    showSnackbar(`Failed to update pathway: ${(err as Error).message}`, 'error')
  }
}

async function ensureIncidenceRateLoaded(id: number) {
  const store = useIncidenceRateStore()
  if (store.currentIR?.id !== id) {
    await store.loadIR(id)
  }
}

async function handleUpdateIncidenceRate(payload: UpdateIncidenceRatePayload) {
  if (typeof payload?.id !== 'number') {
    showSnackbar('Update incidence rate is missing an id', 'error')
    return
  }
  try {
    await ensureIncidenceRateLoaded(payload.id)
    const store = useIncidenceRateStore()
    if (!store.currentIR) {
      showSnackbar('Could not load incidence rate for editing', 'error')
      return
    }
    const applied = store.applyProposal(payload)
    if (applied) {
      if (router.currentRoute.value.name !== 'incidence-rate-edit') {
        try {
          await router.push({ name: 'incidence-rate-edit', params: { id: String(payload.id) } })
        } catch { /* noop */ }
      }
      showSnackbar(
        `Incidence rate "${store.currentIR.name}" updated — review and Save`,
        'success'
      )
    } else {
      showSnackbar('No changes to apply', 'info')
    }
  } catch (err) {
    logger.error('pythiaBridge', 'updateIncidenceRate failed', err)
    showSnackbar(`Failed to update incidence rate: ${(err as Error).message}`, 'error')
  }
}

function handleGetContext(callbackId?: string) {
  if (!callbackId) return
  const bus = getHostMessageBus(PLUGIN_ID)
  if (!bus) return

  const cohort = useCohortStore()
  const sources = useDataSourcesStore()
  const conceptSets = useConceptSetsStore()
  const route = router.currentRoute.value
  const routeName = typeof route.name === 'string' ? route.name : ''
  const routeParams = { ...route.params } as Record<string, string | number>
  const artifact = buildArtifactSummary(routeName)

  bus.handleResponse(callbackId, {
    route: { name: routeName, params: routeParams },
    sourceKey: sources.selectedSource?.sourceKey ?? null,
    routeContext: {
      routeName,
      routeParams,
      artifact,
    },
    cohort: cohort.currentCohort
      ? {
          id: cohort.currentCohort.id,
          name: cohort.currentCohort.name,
          description: cohort.currentCohort.description,
          entryEventCount: cohort.currentCohort.entryEvents.length,
          inclusionRuleCount: cohort.currentCohort.inclusionRules.length,
        }
      : null,
    conceptSet: conceptSets.currentSet
      ? {
          id: conceptSets.currentSet.id,
          name: conceptSets.currentSet.name,
          itemCount: conceptSets.currentSet.items?.length ?? 0,
        }
      : null,
  })
}

function handleSnackbar(payload: { message: string; type?: string }) {
  if (!payload?.message) return
  showSnackbar(payload.message, payload.type ?? 'info')
}

function showSnackbar(message: string, type: string = 'info') {
  const ui = useUIStore()
  const fn = (ui as unknown as { showSnackbar?: (msg: string, t?: string) => void })
    .showSnackbar
  if (typeof fn === 'function') {
    fn(message, type)
  } else {
    logger.info('pythiaBridge', 'snackbar', { message, type })
  }
}
