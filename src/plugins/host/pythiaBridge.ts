import { nextTick } from 'vue'
import type { HostMessage } from '@/models/PluginModels'
import { getHostMessageBus } from '@/plugins/messaging/HostMessageBus'
import { useCohortStore } from '@/stores/cohort'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useDataSourcesStore } from '@/stores/datasources'
import { useFeatureAnalysesStore } from '@/stores/feature-analyses'
import { useCharacterizationStore } from '@/stores/characterization'
import { usePathwayStore } from '@/stores/pathway'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import { useNotifications } from '@/stores/notifications'
import { useWebAPIStore } from '@/stores/webapi'
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
import { createConceptSet, getConceptSetById } from '@/services/concept-set.service'
import { createFeatureAnalysis } from '@/services/feature-analysis.service'
import { createCharacterization } from '@/services/characterization.service'
import { createPathway, generatePathway } from '@/services/pathway.service'
import { createIncidenceRate } from '@/services/incidence-rate.service'
import type { ConceptSetItem } from '@/models/concept-set.types'
import type { CohortEvent, ConceptSetReference, CriteriaGroup } from '@/models/cohort.types'
import { ensureUniqueConceptSetId } from '@/utils/concept-set-id'
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
import { domainToCriteriaType } from './capabilities/translate'

const PLUGIN_ID = 'pythia-plugin'

// `applied: false` is only ever set when the proposal was rejected outright, so
// the capability layer can stop reporting success for a change nothing made.
export interface ProposalOutcome {
  id?: number | string
  name?: string
  applied?: boolean
}

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
): Promise<ProposalOutcome | void> {
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
): Promise<ProposalOutcome | void> {
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
    case 'useConceptSet':
      return await handleUseConceptSet(proposal.payload)
    case 'createFeatureAnalysis':
      return await handleCreateFeatureAnalysis(proposal.payload)
    case 'createCharacterization':
      return await handleCreateCharacterization(proposal.payload)
    case 'createPathway':
      return await handleCreatePathway(proposal.payload)
    case 'createIncidenceRate':
      return await handleCreateIncidenceRate(proposal.payload)
    case 'generateAnalysis':
      await handleGenerateAnalysis(proposal.payload); return
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
      // Still sitting on the cohort we just saved, so an entry event now means
      // "the next cohort" rather than "edit this one".
      const routeCohortId = Number(
        (currentRoute.params as { id?: string } | undefined)?.id ?? NaN,
      )
      const onJustSavedCohort = savedCohortId !== null && routeCohortId === savedCohortId
      // A cohort definition always begins with its entry event, so that is what
      // marks "this is the next artifact" rather than "keep building the one on
      // screen". Resetting on any proposal that arrived while not on
      // /cohorts/new wiped the editor after the first save — the route is
      // cohort-edit from then on, so the observation window cleared the entry
      // event, and each inclusion rule cleared the rule before it. The agent
      // could not add anything to a cohort it had just saved, and the saved
      // definition kept only whatever the final proposal put there.
      const startsNewDefinition = proposal.kind === 'addEntryEvent'
      // requestNewCohort (not createNewCohort) so the MOUNTED editor re-syncs:
      // the plain reset clears the store but leaves the editor's local refs
      // holding the previous cohort's criteria.
      // Reset only when there is nothing to keep, or when the agent is starting
      // the next cohort after saving one. Resetting because the route happens
      // not to be /cohorts/new discards whatever is open — the cohort the user
      // is editing, or work in progress while they looked something up on
      // another page.
      if (!cohortStore.currentCohort || (onJustSavedCohort && startsNewDefinition)) {
        cohortStore.requestNewCohort()
        savedCohortId = null
      }
      // Route first: the cohort document belongs to the mounted editor, so the
      // proposal has nothing to write into until the editor is on screen.
      await ensureOnCohortRoute()
      await waitForCohortDocument()
      adoptProposalConceptSets(proposal)
      const result = cohortStore.applyProposal(proposal)
      if (result.reason === 'no-document') {
        showSnackbar('Open a cohort before asking for changes to one', 'error')
        return { applied: false }
      }
      return
    }
  }
}

// The editor attaches its document while mounting, which the router only
// schedules; a proposal that arrives from another view would otherwise reach an
// empty slot and be rejected.
async function waitForCohortDocument(ticks = 3): Promise<void> {
  const cohortStore = useCohortStore()
  for (let i = 0; i < ticks && !cohortStore.hasCohortDocument; i++) {
    await nextTick()
  }
}

function groupEvents(group: CriteriaGroup): CohortEvent[] {
  return [...group.events, ...(group.nestedGroups ?? []).flatMap(groupEvents)]
}

// A proposal's concept sets arrive with client-side UUID ids, but the Atlas
// converter only emits a CodesetId for numeric ones, so without this every
// agent-added criterion would save with `CodesetId: null` and lose its
// concepts. Mirrors the builder's assignConceptSetToContext: allocate an id
// that is unique within the cohort, then register the set on the cohort so
// ConceptSets[] and the criteria agree.
function adoptProposalConceptSets(proposal: AgentProposal): void {
  const owners: Array<{ conceptSet?: ConceptSetReference }> = []
  switch (proposal.kind) {
    case 'addEntryEvent':
    case 'addCensoringCriterion':
      owners.push(proposal.event)
      break
    case 'addInclusionRule':
      owners.push(...proposal.rule.criteriaGroups.flatMap(groupEvents))
      break
    case 'setCohortExit':
      owners.push(proposal.exitCriteria)
      break
    case 'addConceptSet':
      owners.push(proposal)
      break
    default:
      return
  }

  const cohortStore = useCohortStore()
  // An addConceptSet proposal registers itself once the caller applies it.
  const register = proposal.kind !== 'addConceptSet'
  // The cohort's own sets live in the circe expression. Entries without a
  // numeric id occupy no CodesetId, so they can't collide with a new one.
  const existing: ConceptSetReference[] = (
    cohortStore.currentCohort?.expression?.ConceptSets ?? []
  ).flatMap(cs => (typeof cs.id === 'number' ? [{ id: cs.id, name: cs.name ?? '' }] : []))
  for (const owner of owners) {
    if (!owner.conceptSet) continue
    const ref = ensureUniqueConceptSetId(owner.conceptSet, existing)
    owner.conceptSet = ref
    if (!existing.some(cs => cs.id === ref.id)) existing.push(ref)
    if (register) cohortStore.applyProposal({ kind: 'addConceptSet', conceptSet: ref })
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

// Id of the cohort the agent last saved. The next artifact it starts must begin
// from a blank editor even though the route (cohort-new) hasn't changed — but
// only while that same cohort is still the one on screen. As a bare flag this
// survived any navigation, so opening an existing cohort and asking the agent
// to change its entry event wiped the cohort the user had just opened.
let savedCohortId: number | null = null

// Reuse a concept set the user already curated instead of rebuilding it concept
// by concept. Circe resolves criteria against the sets embedded in the cohort
// expression, so "reuse" means copying the saved set's concepts in — keeping its
// name and id so the cohort still reads as that set.
async function handleUseConceptSet(payload: {
  conceptSetId: number
  group?: 'entry' | 'inclusion' | 'exclusion'
  name?: string
}): Promise<ProposalOutcome | void> {
  if (payload?.conceptSetId === undefined) return { applied: false }
  let set
  try {
    set = await getConceptSetById(payload.conceptSetId)
  } catch (err) {
    logger.error('pythiaBridge', 'useConceptSet: fetch failed', err)
    showSnackbar(`Could not read concept set ${payload.conceptSetId}`, 'error')
    return { applied: false }
  }
  // getConceptSetById returns the set with its concepts flattened onto `items`
  // in the editor's internal shape, which is what the cohort store expects.
  const items = (set?.items ?? []) as unknown as Array<Record<string, unknown>>
  if (!set || items.length === 0) {
    // An empty set would silently match nobody, so refuse rather than attach it.
    showSnackbar(
      set ? `Concept set "${set.name}" has no concepts` : `Concept set ${payload.conceptSetId} not found`,
      'error',
    )
    return { applied: false }
  }

  const first = items[0] as Record<string, unknown>
  const nested = (first.concept ?? {}) as Record<string, unknown>
  const domain = String(first.domainId ?? nested.DOMAIN_ID ?? '')
  const group = payload.group ?? 'inclusion'
  const conceptSet = {
    id: set.id,
    name: set.name,
    conceptCount: items.length,
    items,
  }
  const event: Record<string, unknown> = {
    id: `use-${set.id}-${Date.now()}`,
    criteriaType: domainToCriteriaType(domain),
    conceptSet,
  }

  const cohortStore = useCohortStore()
  if (!cohortStore.currentCohort) cohortStore.requestNewCohort()
  await ensureOnCohortRoute()
  await waitForCohortDocument()

  let result
  if (group === 'entry') {
    result = cohortStore.applyProposal({ kind: 'addEntryEvent', event } as never)
  } else {
    const excluded = group === 'exclusion'
    result = cohortStore.applyProposal({
      kind: 'addInclusionRule',
      rule: {
        id: `use-rule-${set.id}-${Date.now()}`,
        name: payload.name || (excluded ? `Exclude: ${set.name}` : set.name),
        criteriaGroups: [
          {
            id: `use-group-${set.id}`,
            logicType: 'ALL',
            events: [
              excluded
                ? { ...event, cardinality: { type: 'EXACTLY', count: 0, countingMethod: 'ALL' } }
                : event,
            ],
          },
        ],
      },
    } as never)
  }
  if (!result.applied) {
    if (result.reason === 'no-document') {
      showSnackbar('Open a cohort before asking for changes to one', 'error')
    } else {
      logger.error('pythiaBridge', `useConceptSet: proposal rejected (${result.reason})`)
      showSnackbar(`Could not add concept set "${set.name}" to the cohort`, 'error')
    }
    return { applied: false }
  }
  showSnackbar(`Using concept set "${set.name}" (${items.length} concepts)`, 'success')
  return { id: set.id, name: set.name }
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
  const saved = await cohortStore.requestSave({ name: proposal.name, description: proposal.description })
  // The cohort is committed. Whatever the agent builds next is a DIFFERENT
  // cohort, so the editor must start blank — otherwise the next entry event is
  // added on top of this one and the user watches a single editor accumulate
  // three entry criteria while three separate cohorts are saved underneath.
  if (saved?.id) savedCohortId = Number(saved.id)
  return saved
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
    await router.push({ name: route.name, params: route.params ?? {} })
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

  let created
  try {
    created = await createConceptSet({
      name: payload.name,
      description: payload.description ?? '',
      items: conceptSetItems,
    })
  } catch (err) {
    showSnackbar(
      err instanceof Error ? err.message : 'Failed to create concept set',
      'error'
    )
    return
  }

  if (created.id === undefined || created.id === null) {
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
    const proposal: AgentProposal = {
      kind: 'addConceptSet',
      conceptSet: {
        id: created.id as number,
        name: created.name,
        conceptCount: created.items?.length ?? 0,
        // Without the concepts themselves the set lands in the cohort empty, so
        // anything referencing it matches nobody while the cohort still builds.
        items: created.items ?? [],
      },
    }
    adoptProposalConceptSets(proposal)
    cohortStore.applyProposal(proposal)
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
  const result = await createFeatureAnalysis(fa)
  if (!result.success) {
    logger.error('pythiaBridge', 'createFeatureAnalysis failed', result.error)
    showSnackbar(`Failed to create feature analysis: ${result.error.message}`, 'error')
    return
  }
  const created = result.data
  if (!created?.id) {
    showSnackbar('Failed to create feature analysis', 'error')
    return
  }
  showSnackbar(`Feature analysis "${created.name}" created`, 'success')
  await navigateToEditor('feature-analysis-edit', created.id)
  return { id: created.id, name: created.name }
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
  const result = await createCharacterization(def)
  if (!result.success) {
    logger.error('pythiaBridge', 'createCharacterization failed', result.error)
    showSnackbar(`Failed to create characterization: ${result.error.message}`, 'error')
    return
  }
  const created = result.data
  if (!created?.id) {
    showSnackbar('Failed to create characterization', 'error')
    return
  }
  showSnackbar(`Characterization "${created.name}" created`, 'success')
  await navigateToEditor('characterization-edit', created.id)
  return { id: created.id, name: created.name }
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
      const msg = result.success ? 'no id returned' : result.error.message
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

// Run a saved analysis, the same thing the Generate button does. The agent can
// create an analysis but previously had no way to execute it, so every demo
// ended with an unrun analysis the user had to kick off by hand.
async function handleGenerateAnalysis(payload: {
  analysisType: 'pathway' | 'characterization' | 'incidenceRate'
  analysisId: number
  sourceKey?: string
}): Promise<void> {
  // Fall back to whatever source the user is working against.
  const webapiStore = useWebAPIStore()
  if (!webapiStore.sources.length) await webapiStore.fetchSources().catch(() => {})
  const sourceKey =
    payload.sourceKey ||
    webapiStore.selectedSource ||
    webapiStore.sources[0]?.sourceKey ||
    ''
  if (!sourceKey) {
    showSnackbar('Cannot generate: no data source selected', 'error')
    return
  }
  if (payload.analysisType !== 'pathway') {
    showSnackbar(`Generating a ${payload.analysisType} is not supported yet`, 'warning')
    return
  }
  try {
    const result = await generatePathway(payload.analysisId, sourceKey)
    if (!result.success) {
      showSnackbar(`Failed to start generation: ${result.error}`, 'error')
      return
    }
    showSnackbar(`Generating pathway analysis against ${sourceKey}`, 'success')
    // The workbench only polls runs it started itself, so tell it to watch this
    // one — otherwise the page sits on "No runs yet" until a manual reload.
    usePathwayStore().notifyAgentGeneration()
  } catch (err) {
    logger.error('pythiaBridge', 'generateAnalysis failed', err)
    showSnackbar(`Failed to start generation: ${(err as Error).message}`, 'error')
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
      const msg = result.success ? 'no id returned' : result.error.message
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
        summary: `${c.description ?? ''}`.trim() || `Cohort: ${c.name}`,
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
          entryEventCount: cohort.currentCohort.expression?.PrimaryCriteria?.CriteriaList?.length ?? 0,
          inclusionRuleCount: cohort.currentCohort.expression?.InclusionRules?.length ?? 0,
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

// The UI store never defined showSnackbar, so every message the bridge raised
// fell through to a log line the user never saw. Route them to the
// notification store that AtlasNotificationHost actually renders.
function showSnackbar(message: string, type: string = 'info') {
  const notify = useNotifications()
  if (type === 'error') notify.danger(message)
  else if (type === 'success') notify.success(message)
  else if (type === 'warning') notify.warning(message)
  else notify.info(message)
}
