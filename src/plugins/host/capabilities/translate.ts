import type { AgentProposal } from '@/models/agent.types'
import type {
  CohortEvent,
  ConceptSetReference,
  CriteriaGroup,
  CriteriaType,
  ExitCriteria,
  ExitStrategy,
} from '@/models/cohort.types'
import type {
  Cardinality,
  EventAttribute,
  NumericOperator,
  TemporalWindow,
  Window as EventWindow,
} from '@/models/event.types'
import routeManifest from '@/router/routes.manifest.json'

interface ConceptRefArgs {
  conceptId?: number
  conceptName?: string
  domain?: string
  includeDescendants?: boolean
  isExcluded?: boolean
}

interface CriterionArgs extends ConceptRefArgs {
  group?: 'inclusion' | 'exclusion'
  operator?: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'between'
  value?: number
  value2?: number
}

interface ObservationWindowArgs {
  priorDays?: number
  postDays?: number
}

interface ExitCriterionArgs {
  strategy?: 'end_of_observation' | 'fixed_duration' | 'continuous_drug'
  offset?: number
  dateField?: 'START_DATE' | 'END_DATE'
  persistenceWindow?: number
  surveillanceWindow?: number
  concept?: ConceptRefArgs
}

interface AgentTemporalWindow {
  startDays?: number | null
  endDays?: number | null
}

interface InclusionRuleArgs {
  name?: string
  description?: string
  logicType?: 'ALL' | 'ANY' | 'AT_LEAST' | 'AT_MOST'
  count?: number
  temporalWindow?: AgentTemporalWindow
  events?: CriterionArgs[]
}

type NavigateView = string

interface NavigateArgs {
  view?: NavigateView
  id?: number
  sourceKey?: string
  conceptId?: number
  personId?: number
  executionId?: number
  cohortId?: number
  reason?: string
}

interface StandaloneConceptSetArgs {
  name?: string
  description?: string
  items?: ConceptRefArgs[]
}

interface CohortRefArgs {
  id?: number
  name?: string
}

interface FeatureAnalysisRefArgs {
  id?: number
  name?: string
}

interface CreateFeatureAnalysisArgs {
  name?: string
  description?: string
  type?: 'PRESET' | 'CRITERIA_SET' | 'CUSTOM_FE'
  domain?: string
  statType?: 'PREVALENCE' | 'DISTRIBUTION'
  design?: unknown
}

interface CreateCharacterizationArgs {
  name?: string
  description?: string
  cohorts?: CohortRefArgs[]
  featureAnalyses?: FeatureAnalysisRefArgs[]
}

interface CreatePathwayArgs {
  name?: string
  description?: string
  targetCohorts?: CohortRefArgs[]
  eventCohorts?: CohortRefArgs[]
  combinationWindow?: number
  minCellCount?: number
  maxDepth?: number
  allowRepeats?: boolean
}

interface CreateIncidenceRateArgs {
  name?: string
  description?: string
  targetIds?: number[]
  outcomeIds?: number[]
  timeAtRisk?: {
    start?: { DateField?: 'StartDate' | 'EndDate'; Offset?: number }
    end?: { DateField?: 'StartDate' | 'EndDate'; Offset?: number }
  }
  studyWindow?: { startDate?: string; endDate?: string }
}

type ProposalArgs = CriterionArgs &
  ObservationWindowArgs &
  ExitCriterionArgs &
  InclusionRuleArgs &
  NavigateArgs &
  StandaloneConceptSetArgs &
  CreateFeatureAnalysisArgs &
  CreateCharacterizationArgs &
  CreatePathwayArgs &
  CreateIncidenceRateArgs &
  Record<string, unknown>

interface RouteManifestEntry {
  name: string
  params: string[]
  agentVisible: boolean
}

const routeByName = new Map(
  (routeManifest as RouteManifestEntry[]).map(r => [r.name, r])
)

export function isAgentVisibleView(name: string): boolean {
  return routeByName.get(name)?.agentVisible === true
}

function getViewParams(name: string): string[] {
  return routeByName.get(name)?.params ?? []
}

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2, 12)
}

// CIRCE's canonical encoding for "patient must NOT have X": the criterion's
// occurrence count is EXACTLY 0. Shared by every exclusion path below.
const ZERO_OCCURRENCE_CARDINALITY: Cardinality = { type: 'EXACTLY', count: 0, countingMethod: 'ALL' }

export function domainToCriteriaType(domain: string | undefined): CriteriaType {
  switch (domain) {
    case 'Condition': return 'ConditionOccurrence'
    case 'Drug': return 'DrugExposure'
    case 'Procedure': return 'ProcedureOccurrence'
    case 'Measurement': return 'Measurement'
    case 'Observation': return 'Observation'
    case 'Visit': return 'VisitOccurrence'
    case 'Device': return 'DeviceExposure'
    case 'Specimen': return 'Specimen'
    default: return 'ConditionOccurrence'
  }
}

// Map the agent's index-relative window {startDays,endDays} to ATLAS's
// {startWindow,endWindow}. Days are relative to the index (cohort entry) start:
// negative = before index, >= 0 = after, null/undefined = open-ended (all time).
// An omitted startDays defaults to all-time-prior; an omitted endDays to the
// index date (0). Passing `{}` therefore yields a wide-open [all-time, index]
// window — callers shouldn't, but it is well-defined.
function toEventWindow(
  w: { startDays?: number | null; endDays?: number | null } | undefined,
): TemporalWindow | undefined {
  if (!w) return undefined
  const toWindowBound = (d: number | null | undefined, openEndedAfter: boolean): EventWindow =>
    d === null || d === undefined
      ? { days: null, beforeAfter: openEndedAfter ? 'AFTER' : 'BEFORE', useIndexEnd: false, useEventEnd: false }
      : { days: Math.abs(d), beforeAfter: d < 0 ? 'BEFORE' : 'AFTER', useIndexEnd: false, useEventEnd: false }
  // startDays: undefined and null both mean all-time-prior. endDays: undefined
  // means the index date (0), but explicit null means all-time-after — so only
  // default *undefined* to 0 (a plain `?? 0` would wrongly collapse null to 0).
  return {
    startWindow: toWindowBound(w.startDays ?? null, false),
    endWindow: toWindowBound(w.endDays === undefined ? 0 : w.endDays, true),
  }
}

function deriveRuleName(items: CriterionArgs[], group?: string, logic?: string): string {
  const names = items
    .map(it => (typeof it.conceptName === 'string' ? it.conceptName : null))
    .filter((n): n is string => !!n)
  const groupLabel = group === 'exclusion' ? 'Exclude' : 'Require'
  const join = logic === 'OR' ? ' or ' : ' and '
  if (names.length === 0) return `${groupLabel} criteria`
  if (names.length === 1) return `${groupLabel}: ${names[0]}`
  if (names.length === 2) return `${groupLabel}: ${names.join(join)}`
  // 3+: keep first two, summarise the rest
  return `${groupLabel}: ${names[0]}${join}${names[1]} (+${names.length - 2} more)`
}

// Every criterion the agent injects references its concepts by CodesetId, so
// the set has to carry the concept itself. Shared by entry/inclusion events and
// by the exit criterion, which used to build a named but empty set.
//
// The id is a placeholder: the host bridge swaps it for a cohort-unique numeric
// one before the proposal reaches the store, because only numeric ids survive
// Atlas conversion as a CodesetId.
//
// Items use the internal ConceptSetItem shape, which is what the cohort builder,
// extractConceptSets and the Atlas converter all read. The metadata the agent
// cannot know is a placeholder; the concept-set editor re-resolves it on load.
function embeddedConceptSet(c: {
  conceptId: number
  conceptName: string
  domain?: string
  includeDescendants?: boolean
  isExcluded?: boolean
}): ConceptSetReference {
  return {
    id: uid(),
    name: c.conceptName,
    conceptCount: 1,
    items: [
      {
        conceptId: c.conceptId,
        conceptName: c.conceptName,
        conceptCode: '',
        domainId: c.domain ?? '',
        vocabularyId: '',
        conceptClassId: '',
        standardConcept: 'S',
        invalidReason: null,
        includeDescendants: c.includeDescendants ?? true,
        isExcluded: c.isExcluded ?? false,
        includeMapped: false,
      },
    ],
  }
}

// The capability schema speaks the Atlas short operator codes; the internal
// model (and everything downstream of it) speaks the long CIRCE names.
const NUMERIC_OPERATOR_BY_CODE: Record<NonNullable<CriterionArgs['operator']>, NumericOperator> = {
  gt: 'GREATER_THAN',
  gte: 'GREATER_THAN_OR_EQUAL',
  lt: 'LESS_THAN',
  lte: 'LESS_THAN_OR_EQUAL',
  eq: 'EQUAL',
  between: 'BETWEEN',
}

// CIRCE only defines ValueAsNumber on the two value-bearing domains. Attaching
// it anywhere else would emit a field the criteria type has no column for.
const VALUE_AS_NUMBER_TYPES: ReadonlySet<CriteriaType> = new Set<CriteriaType>([
  'Measurement',
  'Observation',
])

// "measurement value greater than 5" is a numericRange attribute on the
// criterion — the same shape the Atlas converter reads back out of
// `ValueAsNumber`. It is NOT a field on the event itself: an unknown event
// field is dropped on the way to Atlas, taking the whole filter with it and
// leaving a criterion that matches every occurrence of the concept.
function buildValueAsNumberAttribute(
  criteriaType: CriteriaType,
  args: CriterionArgs,
): EventAttribute | null {
  if (!args.operator || typeof args.value !== 'number') return null
  if (!VALUE_AS_NUMBER_TYPES.has(criteriaType)) return null
  const operator = NUMERIC_OPERATOR_BY_CODE[args.operator]
  if (!operator) return null
  // BETWEEN needs both bounds; without the upper one there is no range to test.
  if (operator === 'BETWEEN' && typeof args.value2 !== 'number') return null
  return {
    type: 'numericRange',
    attributeKey: 'valueAsNumber',
    operator,
    value: args.value,
    ...(operator === 'BETWEEN' ? { extent: args.value2 } : {}),
  }
}

function buildEventFromCriterion(args: CriterionArgs): CohortEvent | null {
  if (!args.conceptId || !args.conceptName) return null
  const criteriaType = domainToCriteriaType(args.domain)
  const event: CohortEvent = {
    id: uid(),
    criteriaType,
    conceptSet: embeddedConceptSet({
      conceptId: args.conceptId,
      conceptName: args.conceptName,
      domain: args.domain,
      includeDescendants: args.includeDescendants,
      isExcluded: args.isExcluded,
    }),
  }
  const valueFilter = buildValueAsNumberAttribute(criteriaType, args)
  if (valueFilter) event.attributes = [valueFilter]
  return event
}

function isEvent(event: CohortEvent | null): event is CohortEvent {
  return event !== null
}

function buildNavigateProposal(args: NavigateArgs): AgentProposal | null {
  const view = args.view
  if (!view || !isAgentVisibleView(view)) return null
  const allowedKeys = getViewParams(view)
  const params: Record<string, string | number> = {}
  for (const k of allowedKeys) {
    const v = (args as Record<string, unknown>)[k]
    if (typeof v === 'string' || typeof v === 'number') params[k] = v
  }
  return {
    kind: 'navigate',
    route: { name: view, params },
    reason: typeof args.reason === 'string' ? args.reason : undefined,
  }
}

function buildFeatureAnalysisProposal(args: CreateFeatureAnalysisArgs): AgentProposal | null {
  if (!args.name || !args.type) return null
  return {
    kind: 'createFeatureAnalysis',
    payload: {
      name: args.name,
      description: args.description,
      type: args.type,
      domain: args.domain,
      statType: args.statType,
      design: args.design,
    },
  }
}

function buildCharacterizationProposal(args: CreateCharacterizationArgs): AgentProposal | null {
  if (!args.name) return null
  const cohorts = (args.cohorts ?? [])
    .filter(c => typeof c.id === 'number' && typeof c.name === 'string')
    .map(c => ({ id: c.id as number, name: c.name as string }))
  const featureAnalyses = (args.featureAnalyses ?? [])
    .filter(fa => typeof fa.id === 'number')
    .map(fa => ({ id: fa.id as number, name: fa.name }))
  if (cohorts.length === 0 || featureAnalyses.length === 0) return null
  return {
    kind: 'createCharacterization',
    payload: {
      name: args.name,
      description: args.description,
      cohorts,
      featureAnalyses,
    },
  }
}

function buildPathwayProposal(args: CreatePathwayArgs): AgentProposal | null {
  if (!args.name) return null
  const targets = (args.targetCohorts ?? [])
    .filter(c => typeof c.id === 'number' && typeof c.name === 'string')
    .map(c => ({ id: c.id as number, name: c.name as string }))
  const events = (args.eventCohorts ?? [])
    .filter(c => typeof c.id === 'number' && typeof c.name === 'string')
    .map(c => ({ id: c.id as number, name: c.name as string }))
  return {
    kind: 'createPathway',
    payload: {
      name: args.name,
      description: args.description,
      targetCohorts: targets,
      eventCohorts: events,
      combinationWindow: args.combinationWindow,
      minCellCount: args.minCellCount,
      maxDepth: args.maxDepth,
      allowRepeats: args.allowRepeats,
    },
  }
}

function buildIncidenceRateProposal(args: CreateIncidenceRateArgs): AgentProposal | null {
  if (!args.name) return null
  const tar = args.timeAtRisk
    ? {
        start: {
          DateField: (args.timeAtRisk.start?.DateField ?? 'StartDate') as 'StartDate' | 'EndDate',
          Offset: args.timeAtRisk.start?.Offset ?? 0,
        },
        end: {
          DateField: (args.timeAtRisk.end?.DateField ?? 'EndDate') as 'StartDate' | 'EndDate',
          Offset: args.timeAtRisk.end?.Offset ?? 0,
        },
      }
    : undefined
  return {
    kind: 'createIncidenceRate',
    payload: {
      name: args.name,
      description: args.description,
      targetIds: (args.targetIds ?? []).filter((n): n is number => typeof n === 'number'),
      outcomeIds: (args.outcomeIds ?? []).filter((n): n is number => typeof n === 'number'),
      timeAtRisk: tar,
      studyWindow: args.studyWindow,
    },
  }
}

// ----- Update-* proposal builders --------------------------------------------
//
// Each `update_*` tool requires `id` plus any subset of fields the LLM wants
// to change. We pass the partial through to the host bridge, which routes
// it into the matching Pinia store's applyProposal action.

function asConceptRefList(items: unknown): ConceptRefArgs[] {
  if (!Array.isArray(items)) return []
  return items.filter((it): it is ConceptRefArgs =>
    typeof (it as ConceptRefArgs)?.conceptId === 'number' &&
    typeof (it as ConceptRefArgs)?.conceptName === 'string'
  )
}

function asCohortRefList(items: unknown): Array<{ id: number; name: string }> {
  if (!Array.isArray(items)) return []
  return (items as Array<{ id?: unknown; name?: unknown }>)
    .filter(c => typeof c.id === 'number' && typeof c.name === 'string')
    .map(c => ({ id: c.id as number, name: c.name as string }))
}

function asNumberList(xs: unknown): number[] {
  if (!Array.isArray(xs)) return []
  return xs.filter((n): n is number => typeof n === 'number')
}

function buildUpdateConceptSetProposal(args: ProposalArgs): AgentProposal | null {
  const id = (args as { id?: unknown }).id
  if (typeof id !== 'number') return null
  const items = asConceptRefList((args as { items?: unknown }).items).map(it => ({
    conceptId: it.conceptId as number,
    conceptName: it.conceptName as string,
    domain: it.domain,
    includeDescendants: it.includeDescendants ?? true,
    isExcluded: it.isExcluded ?? false,
  }))
  const itemsToAdd = asConceptRefList((args as { itemsToAdd?: unknown }).itemsToAdd).map(it => ({
    conceptId: it.conceptId as number,
    conceptName: it.conceptName as string,
    domain: it.domain,
    includeDescendants: it.includeDescendants ?? true,
    isExcluded: it.isExcluded ?? false,
  }))
  return {
    kind: 'updateConceptSet',
    payload: {
      id,
      name: typeof args.name === 'string' ? args.name : undefined,
      description: typeof args.description === 'string' ? args.description : undefined,
      items: items.length > 0 ? items : undefined,
      itemsToAdd: itemsToAdd.length > 0 ? itemsToAdd : undefined,
    },
  }
}

function buildUpdateFeatureAnalysisProposal(args: ProposalArgs): AgentProposal | null {
  const id = (args as { id?: unknown }).id
  if (typeof id !== 'number') return null
  return {
    kind: 'updateFeatureAnalysis',
    payload: {
      id,
      name: typeof args.name === 'string' ? args.name : undefined,
      description: typeof args.description === 'string' ? args.description : undefined,
      type: (args as { type?: unknown }).type as 'PRESET' | 'CRITERIA_SET' | 'CUSTOM_FE' | undefined,
      domain: typeof args.domain === 'string' ? (args.domain as string) : undefined,
      statType: (args as { statType?: unknown }).statType as 'PREVALENCE' | 'DISTRIBUTION' | undefined,
      design: (args as { design?: unknown }).design,
    },
  }
}

function buildUpdateCharacterizationProposal(args: ProposalArgs): AgentProposal | null {
  const id = (args as { id?: unknown }).id
  if (typeof id !== 'number') return null
  const cohorts = asCohortRefList((args as { cohorts?: unknown }).cohorts)
  const cohortsToAdd = asCohortRefList((args as { cohortsToAdd?: unknown }).cohortsToAdd)
  const fas = asCohortRefList((args as { featureAnalyses?: unknown }).featureAnalyses)
  const fasToAdd = asCohortRefList((args as { featureAnalysesToAdd?: unknown }).featureAnalysesToAdd)
  return {
    kind: 'updateCharacterization',
    payload: {
      id,
      name: typeof args.name === 'string' ? args.name : undefined,
      description: typeof args.description === 'string' ? args.description : undefined,
      cohorts: cohorts.length > 0 ? cohorts : undefined,
      cohortsToAdd: cohortsToAdd.length > 0 ? cohortsToAdd : undefined,
      featureAnalyses: fas.length > 0 ? fas : undefined,
      featureAnalysesToAdd: fasToAdd.length > 0 ? fasToAdd : undefined,
    },
  }
}

function buildUpdatePathwayProposal(args: ProposalArgs): AgentProposal | null {
  const id = (args as { id?: unknown }).id
  if (typeof id !== 'number') return null
  const targets = asCohortRefList((args as { targetCohorts?: unknown }).targetCohorts)
  const targetsToAdd = asCohortRefList((args as { targetCohortsToAdd?: unknown }).targetCohortsToAdd)
  const events = asCohortRefList((args as { eventCohorts?: unknown }).eventCohorts)
  const eventsToAdd = asCohortRefList((args as { eventCohortsToAdd?: unknown }).eventCohortsToAdd)
  const a = args as Record<string, unknown>
  return {
    kind: 'updatePathway',
    payload: {
      id,
      name: typeof args.name === 'string' ? args.name : undefined,
      description: typeof args.description === 'string' ? args.description : undefined,
      targetCohorts: targets.length > 0 ? targets : undefined,
      targetCohortsToAdd: targetsToAdd.length > 0 ? targetsToAdd : undefined,
      eventCohorts: events.length > 0 ? events : undefined,
      eventCohortsToAdd: eventsToAdd.length > 0 ? eventsToAdd : undefined,
      combinationWindow: typeof a.combinationWindow === 'number' ? (a.combinationWindow as number) : undefined,
      minCellCount: typeof a.minCellCount === 'number' ? (a.minCellCount as number) : undefined,
      maxDepth: typeof a.maxDepth === 'number' ? (a.maxDepth as number) : undefined,
      allowRepeats: typeof a.allowRepeats === 'boolean' ? (a.allowRepeats as boolean) : undefined,
    },
  }
}

function buildUpdateIncidenceRateProposal(args: ProposalArgs): AgentProposal | null {
  const id = (args as { id?: unknown }).id
  if (typeof id !== 'number') return null
  const a = args as Record<string, unknown>
  const tar = a.timeAtRisk as
    | { start?: { DateField?: string; Offset?: number }; end?: { DateField?: string; Offset?: number } }
    | undefined
  const sw = a.studyWindow as { startDate?: string; endDate?: string } | null | undefined
  const targetIdsToAdd = asCohortRefList(a.targetIdsToAdd).map(t => ({ id: t.id, name: t.name }))
  const outcomeIdsToAdd = asCohortRefList(a.outcomeIdsToAdd).map(o => ({ id: o.id, name: o.name }))
  return {
    kind: 'updateIncidenceRate',
    payload: {
      id,
      name: typeof args.name === 'string' ? args.name : undefined,
      description: typeof args.description === 'string' ? args.description : undefined,
      targetIds: Array.isArray(a.targetIds) ? asNumberList(a.targetIds) : undefined,
      targetIdsToAdd: targetIdsToAdd.length > 0 ? targetIdsToAdd : undefined,
      outcomeIds: Array.isArray(a.outcomeIds) ? asNumberList(a.outcomeIds) : undefined,
      outcomeIdsToAdd: outcomeIdsToAdd.length > 0 ? outcomeIdsToAdd : undefined,
      timeAtRisk: tar
        ? {
            start: {
              DateField: (tar.start?.DateField ?? 'StartDate') as 'StartDate' | 'EndDate',
              Offset: tar.start?.Offset ?? 0,
            },
            end: {
              DateField: (tar.end?.DateField ?? 'EndDate') as 'StartDate' | 'EndDate',
              Offset: tar.end?.Offset ?? 0,
            },
          }
        : undefined,
      studyWindow: sw === null ? null : (sw && sw.startDate && sw.endDate ? { startDate: sw.startDate, endDate: sw.endDate } : undefined),
    },
  }
}

function buildStandaloneConceptSetProposal(args: StandaloneConceptSetArgs): AgentProposal | null {
  if (!args.name || !args.items?.length) return null
  return {
    kind: 'createStandaloneConceptSet',
    conceptSet: {
      name: args.name,
      description: args.description,
      items: args.items
        .filter(it => typeof it.conceptId === 'number' && typeof it.conceptName === 'string')
        .map(it => ({
          conceptId: it.conceptId as number,
          conceptName: it.conceptName as string,
          domain: it.domain,
          includeDescendants: it.includeDescendants ?? true,
          isExcluded: it.isExcluded ?? false,
        })),
    },
  }
}

export function translateCapability(
  name: string,
  rawArgs: Record<string, unknown>
): AgentProposal | null {
  const args = rawArgs as ProposalArgs
  switch (name) {
    case 'add_criterion': {
      const event = buildEventFromCriterion(args)
      if (!event) return null
      if (args.group === 'inclusion') {
        return {
          kind: 'addInclusionRule',
          rule: {
            id: uid(),
            name: args.conceptName ?? 'Inclusion rule',
            criteriaGroups: [{ id: uid(), logicType: 'ALL', events: [event] }],
          },
        }
      }
      if (args.group === 'exclusion') {
        const excEvent = { ...event, cardinality: ZERO_OCCURRENCE_CARDINALITY }
        return {
          kind: 'addInclusionRule',
          rule: {
            id: uid(),
            name: args.conceptName ? `Exclude: ${args.conceptName}` : 'Exclusion',
            criteriaGroups: [{ id: uid(), logicType: 'ALL', events: [excEvent] }],
          },
        }
      }
      return { kind: 'addEntryEvent', event }
    }

    case 'add_criteria': {
      const items = (args.items as CriterionArgs[] | undefined)
        ?? (args.events as CriterionArgs[] | undefined)
        ?? []
      const isExclusion = args.group === 'exclusion'
      const baseEvents = items.map(buildEventFromCriterion).filter(isEvent)
      if (baseEvents.length === 0) return null
      // CIRCE encodes "patient must not have X" as a criterion with
      // cardinality EXACTLY 0. For exclusion groups, force ALL-logic so
      // "0 of A AND 0 of B AND 0 of C" means the patient has none of them.
      // ANY-logic with cardinality 0 would mean "≥1 of these is absent",
      // which is not what an exclusion list means.
      const events = isExclusion
        ? baseEvents.map(e => ({ ...e, cardinality: ZERO_OCCURRENCE_CARDINALITY }))
        : baseEvents
      const logicType = isExclusion
        ? 'ALL'
        : (args.logic === 'OR' ? 'ANY' : 'ALL')
      const ruleName =
        (typeof args.name === 'string' && args.name.trim()) ||
        deriveRuleName(items, typeof args.group === 'string' ? args.group : undefined,
                       typeof args.logic === 'string' ? (args.logic as string) : undefined)
      return {
        kind: 'addInclusionRule',
        rule: {
          id: uid(),
          name: ruleName,
          criteriaGroups: [
            { id: uid(), logicType, events },
          ],
        },
      }
    }

    case 'add_qualifying_criterion': {
      const event = buildEventFromCriterion(args as CriterionArgs)
      if (!event) return null
      return { kind: 'addQualifyingCriterion', event }
    }

    case 'set_censor_window': {
      const a = args as { startDate?: string; endDate?: string }
      const iso = /^\d{4}-\d{2}-\d{2}$/
      const startDate = typeof a.startDate === 'string' && iso.test(a.startDate) ? a.startDate : undefined
      const endDate = typeof a.endDate === 'string' && iso.test(a.endDate) ? a.endDate : undefined
      if (!startDate && !endDate) return null
      return {
        kind: 'setCensorWindow',
        censorWindow: { startDate: startDate ?? null, endDate: endDate ?? null },
      }
    }

    case 'set_era_collapse': {
      const a = args as { gapDays?: number }
      if (typeof a.gapDays !== 'number' || a.gapDays < 0) return null
      return {
        kind: 'setEraCollapse',
        collapseSettings: { collapseType: 'ERA', eraPad: a.gapDays },
      }
    }

    case 'set_event_limits': {
      const a = args as { entryEvents?: string; qualifyingEvents?: string; inclusionRuleEvents?: string }
      const norm = (v?: string) => {
        const u = String(v ?? '').toUpperCase()
        return u === 'FIRST' || u === 'ALL' || u === 'LAST' ? (u as 'FIRST' | 'ALL' | 'LAST') : undefined
      }
      const primaryCriteriaLimit = norm(a.entryEvents)
      const qualifyingLimit = norm(a.qualifyingEvents)
      const inclusionQualifyingLimit = norm(a.inclusionRuleEvents)
      if (!primaryCriteriaLimit && !qualifyingLimit && !inclusionQualifyingLimit) return null
      return {
        kind: 'setEventLimits',
        limits: { primaryCriteriaLimit, qualifyingLimit, inclusionQualifyingLimit },
      }
    }

    case 'add_demographic_criterion': {
      const a = args as { minAge?: number; maxAge?: number; sex?: string; name?: string }
      const hasMin = typeof a.minAge === 'number'
      const hasMax = typeof a.maxAge === 'number'
      const sex = a.sex === 'male' || a.sex === 'female' ? a.sex : undefined
      if (!hasMin && !hasMax && !sex) return null

      const attributes: EventAttribute[] = []
      if (a.minAge !== undefined && a.maxAge !== undefined) {
        attributes.push({ type: 'numericRange', attributeKey: 'age', operator: 'BETWEEN', value: a.minAge, extent: a.maxAge })
      } else if (a.minAge !== undefined) {
        attributes.push({ type: 'numericRange', attributeKey: 'age', operator: 'GREATER_THAN_OR_EQUAL', value: a.minAge })
      } else if (a.maxAge !== undefined) {
        attributes.push({ type: 'numericRange', attributeKey: 'age', operator: 'LESS_THAN_OR_EQUAL', value: a.maxAge })
      }
      if (sex) {
        // The OMOP gender concepts are fixed CDM vocabulary, not something the
        // model should be recalling or searching for per source.
        const concept = sex === 'male'
          ? { CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE', DOMAIN_ID: 'Gender' }
          : { CONCEPT_ID: 8532, CONCEPT_NAME: 'FEMALE', DOMAIN_ID: 'Gender' }
        attributes.push({ type: 'concept', attributeKey: 'gender', concepts: [concept] })
      }

      const label = [
        hasMin && hasMax ? `Age ${a.minAge}-${a.maxAge}` : hasMin ? `Age ${a.minAge}+` : hasMax ? `Age up to ${a.maxAge}` : null,
        sex === 'male' ? 'Male' : sex === 'female' ? 'Female' : null,
      ].filter(Boolean).join(', ')

      // CIRCE keeps demographics out of PrimaryCriteria: they belong to a
      // group's DemographicCriteriaList, so this is always an inclusion rule.
      // (convertInternalToAtlas asserts this — a Demographic event routed to the
      // entry-event list throws rather than silently producing a criterion CIRCE
      // cannot read.)
      const event: CohortEvent = { id: uid(), criteriaType: 'Demographic', attributes }
      return {
        kind: 'addInclusionRule',
        rule: {
          id: uid(),
          name: (typeof a.name === 'string' && a.name.trim()) || label,
          criteriaGroups: [{ id: uid(), logicType: 'ALL', events: [event] }],
        },
      }
    }

    case 'use_concept_set': {
      const a = args as { conceptSetId?: number; group?: string; name?: string }
      if (a.conceptSetId === undefined) return null
      const group = a.group === 'entry' || a.group === 'exclusion' ? a.group : 'inclusion'
      return {
        kind: 'useConceptSet',
        payload: { conceptSetId: Number(a.conceptSetId), group, name: a.name },
      }
    }

    case 'remove_inclusion_rule': {
      const a = args as { name?: string; id?: string | number }
      if (!a.name && a.id === undefined) return null
      return { kind: 'removeInclusionRule', match: { name: a.name, id: a.id } }
    }

    case 'remove_entry_event': {
      const a = args as { conceptId?: number; conceptName?: string }
      if (!a.conceptName && a.conceptId === undefined) return null
      return {
        kind: 'removeEntryEvent',
        match: { conceptId: a.conceptId, conceptName: a.conceptName },
      }
    }

    case 'set_entry_event': {
      const ref = args as ConceptRefArgs
      const event = buildEventFromCriterion(ref as CriterionArgs)
      if (!event) return null
      // The capability's contract is "replaces any existing entry event". Without
      // this the store appended, so changing the entry event left the cohort
      // qualifying on either one — twice the population, no error anywhere.
      return { kind: 'addEntryEvent', event, replace: true }
    }

    case 'generate_analysis': {
      const a = args as { analysisType?: string; analysisId?: number; sourceKey?: string }
      const kinds = ['pathway', 'characterization', 'incidenceRate'] as const
      const analysisType = kinds.find(k => k === a.analysisType)
      if (!analysisType) return null
      if (typeof a.analysisId !== 'number') return null
      return {
        kind: 'generateAnalysis',
        payload: {
          analysisType,
          analysisId: a.analysisId,
          ...(a.sourceKey ? { sourceKey: a.sourceKey } : {}),
        },
      }
    }

    case 'set_observation_window': {
      const w = args as ObservationWindowArgs
      if (typeof w.priorDays !== 'number' || typeof w.postDays !== 'number') return null
      return {
        kind: 'setObservationPeriod',
        observationPeriod: { priorDays: w.priorDays, postDays: w.postDays },
      }
    }

    case 'add_exit_criterion': {
      const e = args as ExitCriterionArgs
      // CIRCE's EndStrategy is polymorphic over DateOffset | CustomEra only, so
      // there is nothing to map an event-driven exit onto. Anything outside this
      // map is rejected rather than silently degraded to end-of-observation.
      const strategyMap: Record<NonNullable<ExitCriterionArgs['strategy']>, ExitStrategy> = {
        end_of_observation: 'CONTINUOUS_OBSERVATION',
        fixed_duration: 'FIXED_DURATION',
        continuous_drug: 'CONTINUOUS_DRUG',
      }
      const strategy = strategyMap[e.strategy ?? 'end_of_observation']
      if (!strategy) return null
      const exitCriteria: ExitCriteria = { strategy }
      if (typeof e.offset === 'number') exitCriteria.offset = e.offset
      if (e.dateField) exitCriteria.dateField = e.dateField
      if (typeof e.persistenceWindow === 'number') exitCriteria.persistenceWindow = e.persistenceWindow
      if (typeof e.surveillanceWindow === 'number') exitCriteria.surveillanceWindow = e.surveillanceWindow
      if (e.concept?.conceptId && e.concept?.conceptName) {
        exitCriteria.conceptSet = embeddedConceptSet({
          conceptId: e.concept.conceptId,
          conceptName: e.concept.conceptName,
          domain: e.concept.domain,
          includeDescendants: e.concept.includeDescendants,
          isExcluded: e.concept.isExcluded,
        })
      }
      return { kind: 'setExitCriteria', exitCriteria }
    }

    case 'set_censor_event': {
      const event = buildEventFromCriterion(args as CriterionArgs)
      if (!event) return null
      return { kind: 'addCensoringCriterion', event }
    }

    case 'navigate_to':
      return buildNavigateProposal(args as NavigateArgs)

    case 'save_cohort':
      return {
        kind: 'saveCohort',
        name: typeof args.name === 'string' ? args.name : undefined,
        description: typeof args.description === 'string' ? args.description : undefined,
      }

    case 'create_standalone_concept_set':
      return buildStandaloneConceptSetProposal(args as StandaloneConceptSetArgs)

    case 'create_feature_analysis':
      return buildFeatureAnalysisProposal(args as CreateFeatureAnalysisArgs)

    case 'create_characterization':
      return buildCharacterizationProposal(args as CreateCharacterizationArgs)

    case 'create_pathway':
      return buildPathwayProposal(args as CreatePathwayArgs)

    case 'create_incidence_rate':
      return buildIncidenceRateProposal(args as CreateIncidenceRateArgs)

    case 'update_concept_set':
      return buildUpdateConceptSetProposal(args)

    case 'update_feature_analysis':
      return buildUpdateFeatureAnalysisProposal(args)

    case 'update_characterization':
      return buildUpdateCharacterizationProposal(args)

    case 'update_pathway':
      return buildUpdatePathwayProposal(args)

    case 'update_incidence_rate':
      return buildUpdateIncidenceRateProposal(args)

    case 'add_inclusion_rule': {
      const r = args as InclusionRuleArgs
      const events = (r.events ?? []).map(buildEventFromCriterion).filter(isEvent)
      if (events.length === 0) return null
      const isExcludeGroup = r.logicType === 'AT_MOST' && (r.count ?? 0) === 0
      const finalEvents = isExcludeGroup
        ? events.map(e => ({ ...e, cardinality: ZERO_OCCURRENCE_CARDINALITY }))
        : events
      const tw = toEventWindow(r.temporalWindow)
      const windowedEvents = tw
        ? finalEvents.map(e => ({ ...e, temporalWindow: tw }))
        : finalEvents
      const group: CriteriaGroup = {
        id: uid(),
        logicType: isExcludeGroup ? 'ALL' : (r.logicType ?? 'ALL'),
        events: windowedEvents,
      }
      if (!isExcludeGroup && r.count !== undefined) group.count = r.count
      const ruleName =
        (typeof r.name === 'string' && r.name.trim()) ||
        deriveRuleName(r.events ?? [], undefined, r.logicType === 'ANY' ? 'OR' : 'AND')
      return {
        kind: 'addInclusionRule',
        rule: {
          id: uid(),
          name: ruleName,
          description: r.description,
          criteriaGroups: [group],
        },
      }
    }

    default:
      return null
  }
}
