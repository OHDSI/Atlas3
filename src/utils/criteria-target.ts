import type {
  CohortEvent,
  CriteriaGroup,
  InclusionRule,
} from '@/models/cohort.types'

/**
 * Identifies which `CohortEvent` a concept-set selection targets.
 *
 * The cohort builder tracks the in-flight concept-set selection in a single
 * context object that is threaded through several nested emit chains (entry
 * events, additional criteria, inclusion-rule criteria groups). Resolving the
 * target event from that context is fiddly and was the source of a bug where
 * selecting a concept set for a *nested* criteria child overwrote the *parent*
 * event's concept set (issue #93): the nested child's index was being conflated
 * with the parent event's index.
 *
 * `nestedEventIndex`, when present, addresses the child inside the parent
 * event's `nestedCriteria.events` array. Only a single level of nesting is
 * addressable here — that matches what the cohort builder UI lets the user
 * attach a concept set to (the immediate nested child). The parent event is
 * located first (by id for entry events, or by rule/group/event index for
 * inclusion criteria, or by event index for additional criteria), and the
 * nested index then selects the child within it.
 */
export interface CriteriaTargetContext {
  /** Entry event id (entry-event path). */
  eventId?: string | null
  /** Inclusion-rule index. `-2` = additional criteria; `>= 0` = inclusion rule. */
  ruleIndex: number
  /** Criteria-group index within the inclusion rule. */
  groupIndex: number
  /** Event index within the parent container (entry list / group / additional). */
  eventIndex: number
  /** When set, target the nested child at this index inside the parent event. */
  nestedEventIndex?: number
}

/** Containers the resolver searches to find the parent event. */
export interface CriteriaTargetSources {
  entryEvents: CohortEvent[]
  additionalCriteria?: { events: CohortEvent[] } | null
  inclusionRules: InclusionRule[]
}

/**
 * Resolve the *parent* event a context points at, before any nested descent.
 * Returns `null` when the context doesn't address an event (e.g. exit criteria)
 * or the indices are out of range.
 */
function resolveParentEvent(
  context: CriteriaTargetContext,
  sources: CriteriaTargetSources
): CohortEvent | null {
  // Entry event — addressed by id.
  if (context.eventId) {
    return sources.entryEvents.find(e => e.id === context.eventId) ?? null
  }

  // Additional criteria — ruleIndex sentinel -2.
  if (context.ruleIndex === -2) {
    return sources.additionalCriteria?.events[context.eventIndex] ?? null
  }

  // Inclusion-rule criteria group.
  if (context.ruleIndex >= 0) {
    const rule: InclusionRule | undefined = sources.inclusionRules[context.ruleIndex]
    const group: CriteriaGroup | undefined = rule?.criteriaGroups[context.groupIndex]
    return group?.events[context.eventIndex] ?? null
  }

  return null
}

/**
 * Resolve the `CohortEvent` a concept-set selection targets.
 *
 * - For a non-nested context, returns the parent event itself.
 * - For a nested context (`nestedEventIndex` set), returns the nested child
 *   event inside `parentEvent.nestedCriteria.events`.
 *
 * Returns `null` when the target cannot be located (out-of-range indices,
 * missing nested criteria, or a non-event context such as exit criteria).
 */
export function resolveCriteriaTargetEvent(
  context: CriteriaTargetContext,
  sources: CriteriaTargetSources
): CohortEvent | null {
  const parent = resolveParentEvent(context, sources)
  if (!parent) return null

  if (context.nestedEventIndex === undefined || context.nestedEventIndex === null) {
    return parent
  }

  return parent.nestedCriteria?.events[context.nestedEventIndex] ?? null
}
