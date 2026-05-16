import type { MessageBus } from './main'
import type {
  ConceptRefArgs,
  CreateCharacterizationArgs,
  CreateFeatureAnalysisArgs,
  CreateIncidenceRateArgs,
  CreatePathwayArgs,
  CriterionArgs,
  ExitCriterionArgs,
  InclusionRuleArgs,
  NavigateArgs,
  NavigateView,
  ObservationWindowArgs,
  ProposalArgs,
  StandaloneConceptSetArgs,
} from './types'

export type ArtifactKind =
  | 'cohort'
  | 'conceptSet'
  | 'featureAnalysis'
  | 'characterization'
  | 'pathway'
  | 'incidenceRate'

export interface ArtifactSummary {
  kind: ArtifactKind
  id: number | string
  name: string
  summary: string
}

export interface RouteContext {
  routeName: string
  routeParams: Record<string, string | number>
  artifact: ArtifactSummary | null
}

export interface ShellContext {
  route?: { name: string; params: Record<string, string | number> }
  sourceKey: string | null
  routeContext?: RouteContext
  cohort: {
    id?: number
    name: string
    description?: string
    entryEventCount: number
    inclusionRuleCount: number
  } | null
  conceptSet?: {
    id?: number | string
    name: string
    itemCount: number
  } | null
}

export interface AgentProposal {
  kind:
    | 'addEntryEvent'
    | 'addInclusionRule'
    | 'addConceptSet'
    | 'setObservationPeriod'
    | 'setExitCriteria'
    | 'addCensoringCriterion'
    | 'navigate'
    | 'createStandaloneConceptSet'
    | 'createFeatureAnalysis'
    | 'createCharacterization'
    | 'createPathway'
    | 'createIncidenceRate'
    | 'updateConceptSet'
    | 'updateFeatureAnalysis'
    | 'updateCharacterization'
    | 'updatePathway'
    | 'updateIncidenceRate'
  [key: string]: unknown
}

export async function getShellContext(bus: MessageBus): Promise<ShellContext> {
  // Try the new app-wide context first; fall back to the older cohort-only
  // context for hosts that haven't been updated yet.
  try {
    return await bus.request<ShellContext>('app.getContext', {})
  } catch {
    try {
      return await bus.request<ShellContext>('cohort.getContext', {})
    } catch {
      return { sourceKey: null, cohort: null }
    }
  }
}

export function applyProposal(bus: MessageBus, proposal: AgentProposal): void {
  bus.send('cohort.applyProposal', { proposal })
}

export function rejectProposal(bus: MessageBus, id: string): void {
  bus.send('cohort.rejectProposal', { id })
}

export function notify(bus: MessageBus, message: string, type: string = 'info'): void {
  bus.send('notify.snackbar', { message, type })
}

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2, 12)
}

function domainToCriteriaType(domain: string | undefined): string {
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

function buildEventFromCriterion(args: CriterionArgs): unknown {
  if (!args.conceptId || !args.conceptName) return null
  const event: Record<string, unknown> = {
    id: uid(),
    criteriaType: domainToCriteriaType(args.domain),
    conceptSet: {
      id: uid(),
      name: args.conceptName,
      conceptCount: 1,
      // Embed the concept item directly. Without this, the cohort builder
      // renders the criterion with an empty concept set and the user sees
      // "nothing was added".
      items: [
        {
          concept: {
            CONCEPT_ID: args.conceptId,
            CONCEPT_NAME: args.conceptName,
            DOMAIN_ID: args.domain ?? '',
          },
          includeDescendants: args.includeDescendants ?? true,
          isExcluded: args.isExcluded ?? false,
          includeMapped: false,
        },
      ],
    },
  }
  if (args.operator && typeof args.value === 'number') {
    event.measurementOperator = args.operator
    event.measurementValue = args.value
    if (typeof args.value2 === 'number') event.measurementValue2 = args.value2
  }
  return event
}


const NAVIGATE_VIEWS: ReadonlySet<NavigateView> = new Set<NavigateView>([
  'home', 'cohorts', 'cohort-new', 'cohort-edit',
  'concepts', 'concept-detail', 'datasources',
  'profiles', 'profile-view',
  'feature-analyses', 'feature-analysis-new', 'feature-analysis-edit',
  'characterizations', 'characterization-new', 'characterization-edit',
  'pathways', 'pathway-new', 'pathway-edit', 'pathway-results',
  'incidence-rates', 'incidence-rate-new', 'incidence-rate-edit',
])

// Each route-name's required + accepted param keys. Used to project the
// loose tool args onto a clean `params` object before pushing onto Vue
// Router. Anything not listed here is ignored.
const NAVIGATE_PARAM_KEYS: Record<NavigateView, readonly (keyof NavigateArgs)[]> = {
  home: [],
  cohorts: [],
  'cohort-new': [],
  'cohort-edit': ['id'],
  concepts: [],
  'concept-detail': ['sourceKey', 'conceptId'],
  datasources: ['sourceKey'],
  profiles: [],
  'profile-view': ['sourceKey', 'personId'],
  'feature-analyses': [],
  'feature-analysis-new': [],
  'feature-analysis-edit': ['id'],
  characterizations: [],
  'characterization-new': [],
  'characterization-edit': ['id'],
  pathways: [],
  'pathway-new': [],
  'pathway-edit': ['id'],
  'pathway-results': ['id', 'executionId'],
  'incidence-rates': [],
  'incidence-rate-new': [],
  'incidence-rate-edit': ['id'],
}

function buildNavigateProposal(args: NavigateArgs): AgentProposal | null {
  const view = args.view
  if (!view || !NAVIGATE_VIEWS.has(view)) return null
  const allowedKeys = NAVIGATE_PARAM_KEYS[view] ?? []
  const params: Record<string, string | number> = {}
  for (const k of allowedKeys) {
    const v = args[k]
    if (v !== undefined && v !== null) params[k as string] = v as string | number
  }
  return {
    kind: 'navigate',
    route: { name: view, params },
    reason: typeof args.reason === 'string' ? args.reason : undefined,
  } as unknown as AgentProposal
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
  } as unknown as AgentProposal
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
  } as unknown as AgentProposal
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
  } as unknown as AgentProposal
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
  } as unknown as AgentProposal
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
  } as unknown as AgentProposal
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
  } as unknown as AgentProposal
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
  } as unknown as AgentProposal
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
  } as unknown as AgentProposal
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
  } as unknown as AgentProposal
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
  } as unknown as AgentProposal
}

export function proposalFromToolCall(
  toolName: string,
  args: ProposalArgs
): AgentProposal | null {
  switch (toolName) {
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
        return { kind: 'addCensoringCriterion', event }
      }
      return { kind: 'addEntryEvent', event }
    }

    case 'add_criteria': {
      const items = (args.items as CriterionArgs[] | undefined)
        ?? (args.events as CriterionArgs[] | undefined)
        ?? []
      const isExclusion = args.group === 'exclusion'
      const baseEvents = items
        .map(buildEventFromCriterion)
        .filter(Boolean) as Record<string, unknown>[]
      if (baseEvents.length === 0) return null
      // CIRCE encodes "patient must not have X" as a criterion with
      // cardinality EXACTLY 0. For exclusion groups, force ALL-logic so
      // "0 of A AND 0 of B AND 0 of C" means the patient has none of them.
      // ANY-logic with cardinality 0 would mean "≥1 of these is absent",
      // which is not what an exclusion list means.
      const events = isExclusion
        ? baseEvents.map(e => ({
            ...e,
            cardinality: { type: 'EXACTLY', count: 0, countingMethod: 'ALL' },
          }))
        : baseEvents
      const logicType = isExclusion
        ? 'ALL'
        : (args.logic === 'OR' ? 'ANY' : 'ALL')
      const ruleName =
        (typeof args.name === 'string' && args.name.trim()) ||
        deriveRuleName(items, typeof args.group === 'string' ? args.group : undefined,
                       typeof args.logic === 'string' ? args.logic : undefined)
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

    case 'set_entry_event': {
      const ref = args as ConceptRefArgs
      const event = buildEventFromCriterion(ref as CriterionArgs)
      if (!event) return null
      return { kind: 'addEntryEvent', event }
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
      const strategyMap: Record<string, string> = {
        end_of_observation: 'CONTINUOUS_OBSERVATION',
        fixed_duration: 'FIXED_DURATION',
        continuous_drug: 'CONTINUOUS_DRUG',
        custom_event: 'CUSTOM_EVENT',
      }
      const strategy = strategyMap[e.strategy ?? 'end_of_observation']
      const exitCriteria: Record<string, unknown> = { strategy }
      if (typeof e.offset === 'number') exitCriteria.offset = e.offset
      if (e.dateField) exitCriteria.dateField = e.dateField
      if (typeof e.persistenceWindow === 'number') exitCriteria.persistenceWindow = e.persistenceWindow
      if (typeof e.surveillanceWindow === 'number') exitCriteria.surveillanceWindow = e.surveillanceWindow
      if (e.concept?.conceptId && e.concept?.conceptName) {
        exitCriteria.conceptSet = {
          id: uid(),
          name: e.concept.conceptName,
          conceptCount: 1,
        }
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
      const events = (r.events ?? []).map(buildEventFromCriterion).filter(Boolean)
      if (events.length === 0) return null
      const group: Record<string, unknown> = {
        id: uid(),
        logicType: r.logicType ?? 'ALL',
        events,
      }
      if (r.count !== undefined) group.count = r.count
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
