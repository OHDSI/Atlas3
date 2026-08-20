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
import {
  circeConceptSetFromAtlas,
  nextConceptSetId,
  type AtlasConceptSetItem,
} from '@/components/cohort-editor/atlas-concept-set'
import { cardinalityToAtlas, operatorToAtlas } from '@/utils/mappers'
import type {
  ConceptSet,
  Criteria,
  CorelatedCriteria,
  DemographicCriteria,
  NumericRange,
  CriteriaGroup as CirceCriteriaGroup,
} from '@/models/circe-types'
import type { CohortEvent, CriteriaGroup as AtlasCriteriaGroup } from '@/models/cohort.types'
import type { NumericOperator } from '@/models/event.types'

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

/**
 * Builds a circe DemographicCriteria from an agent event.
 *
 * circe keeps demographics out of criteria lists entirely: they live in a
 * group's `DemographicCriteriaList` and carry their constraints as fields
 * rather than as a domain criterion. The agent sends them as an event with
 * `criteriaType: 'Demographic'` and an `attributes` array, so the two shapes
 * have nothing structural in common and this maps attribute by attribute.
 */
export function translateAgentDemographicEvent(event: CohortEvent): DemographicCriteria | null {
  if (event.criteriaType !== 'Demographic') return null

  const demographic: DemographicCriteria = {}

  for (const attribute of (event.attributes ?? []) as AgentAttribute[]) {
    const field = DEMOGRAPHIC_FIELD_BY_KEY[attribute.attributeKey ?? '']
    if (!field) continue

    if (attribute.type === 'numericRange' && field === 'Age') {
      demographic.Age = {
        Op: operatorToAtlas(attribute.operator as NumericOperator) as NonNullable<NumericRange['Op']>,
        Value: attribute.value,
        ...(attribute.extent === undefined ? {} : { Extent: attribute.extent }),
      }
      continue
    }

    if (attribute.type === 'concept' && field !== 'Age') {
      // Gender/Race/Ethnicity carry the CDM concepts inline, not a codeset.
      demographic[field] = attribute.concepts as DemographicCriteria['Gender']
    }
  }

  return Object.keys(demographic).length > 0 ? demographic : null
}

/** Attribute keys the agent uses, against the circe field they populate. */
const DEMOGRAPHIC_FIELD_BY_KEY: Record<string, 'Age' | 'Gender' | 'Race' | 'Ethnicity' | undefined> = {
  age: 'Age',
  gender: 'Gender',
  race: 'Race',
  ethnicity: 'Ethnicity',
}

interface AgentAttribute {
  type?: string
  attributeKey?: string
  operator?: string
  value?: number
  extent?: number
  concepts?: unknown[]
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
    const demographicList: DemographicCriteria[] = []

    for (const event of group.events ?? []) {
      // Demographics are not domain criteria in circe — they belong to the
      // group's own DemographicCriteriaList.
      if (event.criteriaType === 'Demographic') {
        const demographic = translateAgentDemographicEvent(event)
        if (demographic) demographicList.push(demographic)
        else dropped++
        continue
      }

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

    if (demographicList.length > 0) circeGroup.DemographicCriteriaList = demographicList

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
 * Adds concept sets to the expression-level list, reusing the entry already
 * there when the same set is registered twice. Returns the sets actually added.
 *
 * Skipping on id alone dropped an incoming set whenever an *unrelated* set
 * already held that id, while the criterion built for it kept a `CodesetId`
 * pointing at that other set — so the criterion silently matched the wrong
 * concepts. A colliding set is given the next free id instead, mutated in place
 * so a caller that reads `conceptSet.id` afterwards (the CustomEra strategy
 * does) sees the id it was actually filed under.
 *
 * Identity is approximated by id+name, matching circeConceptSetFromAtlas and
 * useCirceConceptSetPicker; ids reaching here are normally already resolved by
 * circeConceptSetFromAtlas against the same list.
 */
export function registerConceptSets(existing: ConceptSet[], incoming: ConceptSet[]): ConceptSet[] {
  const added: ConceptSet[] = []

  for (const conceptSet of incoming) {
    const collision = existing.find(cs => cs.id === conceptSet.id)
    if (collision && collision.name === conceptSet.name) continue

    if (collision) conceptSet.id = nextConceptSetId(existing)

    existing.push(conceptSet)
    added.push(conceptSet)
  }

  return added
}
