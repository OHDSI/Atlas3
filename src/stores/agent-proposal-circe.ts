/**
 * agent-proposal-circe.ts
 *
 * Translates the agent's proposal payloads into the circe object model the
 * cohort expression is made of.
 *
 * The agent bridge speaks the older Atlas shapes — `CohortEvent` with an
 * embedded `conceptSet` and a `cardinality`, `InclusionRule` with
 * `criteriaGroups` — because that is what `plugins/host/capabilities/translate.ts`
 * builds and what the tool contract with the assistant describes. The store
 * holds circe. Something has to bridge the two, and until now nothing did: the
 * store pushed `{ [criteriaType]: {} }` and dropped the concept set entirely,
 * so an agent-added "diabetes entry event" reached generation as *every*
 * condition occurrence, and an exclusion rule built with a zero-occurrence
 * cardinality saved with an empty expression and excluded nobody.
 *
 * Only the shapes translate.ts actually produces are handled, and anything not
 * understood is reported rather than silently dropped, so applyProposal can
 * answer honestly instead of returning `{ applied: true }` for a mutation that
 * lost its content.
 */
import { circeConceptSetFromAtlas, type AtlasConceptSetItem } from '@/components/cohort-editor/atlas-concept-set'
import { cardinalityToAtlas } from '@/utils/mappers'
import type {
  ConceptSet,
  Criteria,
  CorelatedCriteria,
  CriteriaGroup as CirceCriteriaGroup,
} from '@/components/cohort-editor/circe.types'
import type { CohortEvent, CriteriaGroup as AtlasCriteriaGroup } from '@/models/cohort.types'

/**
 * What a translated event needs from its caller: the criterion itself, plus the
 * expression-level concept set it references, which the caller must register in
 * `expression.ConceptSets` for the `CodesetId` to resolve.
 */
export interface TranslatedEvent {
  criteria: Criteria
  conceptSet?: ConceptSet
}

/**
 * Builds a circe criterion from an agent event, wiring its concept set in by
 * `CodesetId` rather than embedding it.
 *
 * Returns null when there is no criteria type to key the wrapper on — a
 * criterion with no domain cannot be represented at all, and is better refused
 * than written as an empty object that matches everything.
 */
export function translateAgentEvent(
  event: CohortEvent,
  existingConceptSets: ReadonlyArray<ConceptSet> = []
): TranslatedEvent | null {
  const criteriaType = event.criteriaType
  if (!criteriaType || criteriaType === 'Demographic') return null

  const conceptSet = event.conceptSet
    ? circeConceptSetFromAtlas(
        {
          id: event.conceptSet.id,
          name: event.conceptSet.name,
          items: event.conceptSet.items as AtlasConceptSetItem[] | undefined,
        },
        existingConceptSets
      )
    : undefined

  const inner: Record<string, unknown> = {}
  if (conceptSet?.id !== undefined) {
    inner.CodesetId = conceptSet.id
  }

  return {
    criteria: { [criteriaType]: inner } as Criteria,
    conceptSet,
  }
}

/**
 * Builds a correlated criterion — an event as it appears inside a criteria
 * group, where it can also carry an occurrence count.
 *
 * The count is what makes an exclusion rule an exclusion: circe expresses
 * "patient must not have X" as X with an occurrence of EXACTLY 0. Dropping the
 * cardinality turned every exclusion the agent built into an inclusion.
 */
export function translateAgentEventToCorelated(
  event: CohortEvent,
  existingConceptSets: ReadonlyArray<ConceptSet> = []
): { criteria: CorelatedCriteria; conceptSet?: ConceptSet } | null {
  const translated = translateAgentEvent(event, existingConceptSets)
  if (!translated) return null

  const criteria: CorelatedCriteria = { Criteria: translated.criteria }

  const cardinality = event.cardinality
  if (cardinality) {
    criteria.Occurrence = {
      Type: cardinalityToAtlas(cardinality.type),
      Count: cardinality.count,
      ...(cardinality.isDistinct === undefined ? {} : { IsDistinct: cardinality.isDistinct }),
    }
  }

  return { criteria, conceptSet: translated.conceptSet }
}

export interface TranslatedGroup {
  group: CirceCriteriaGroup
  conceptSets: ConceptSet[]
  /** Events that carried no usable criteria type and were left out. */
  dropped: number
}

/**
 * Builds a circe criteria group from the agent's `criteriaGroups`.
 *
 * translate.ts emits a single group per rule, so multiple groups are combined
 * under an ALL parent rather than silently keeping only the first.
 */
export function translateAgentCriteriaGroups(
  groups: AtlasCriteriaGroup[] | undefined,
  existingConceptSets: ReadonlyArray<ConceptSet> = []
): TranslatedGroup {
  const conceptSets: ConceptSet[] = []
  let dropped = 0

  const translateOne = (group: AtlasCriteriaGroup): CirceCriteriaGroup => {
    const criteriaList: CorelatedCriteria[] = []

    for (const event of group.events ?? []) {
      // Each translated set joins the pool so the next event in the group is
      // allocated a distinct id rather than colliding with it.
      const translated = translateAgentEventToCorelated(event, [...existingConceptSets, ...conceptSets])
      if (!translated) {
        dropped++
        continue
      }
      criteriaList.push(translated.criteria)
      if (translated.conceptSet) conceptSets.push(translated.conceptSet)
    }

    const circeGroup: CirceCriteriaGroup = {
      Type: group.logicType ?? 'ALL',
      CriteriaList: criteriaList,
    }

    if (group.count !== undefined) circeGroup.Count = group.count

    const nested = (group.nestedGroups ?? []).map(translateOne)
    if (nested.length > 0) circeGroup.Groups = nested

    return circeGroup
  }

  const translated = (groups ?? []).map(translateOne)

  if (translated.length === 1) {
    return { group: translated[0]!, conceptSets, dropped }
  }

  return {
    group: { Type: 'ALL', CriteriaList: [], Groups: translated },
    conceptSets,
    dropped,
  }
}

/**
 * Adds concept sets to the expression-level list, skipping ids already present.
 * Returns the sets actually added.
 */
export function registerConceptSets(existing: ConceptSet[], incoming: ConceptSet[]): ConceptSet[] {
  const added: ConceptSet[] = []

  for (const conceptSet of incoming) {
    if (existing.some(cs => cs.id === conceptSet.id)) continue
    existing.push(conceptSet)
    added.push(conceptSet)
  }

  return added
}
