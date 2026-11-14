/**
 * reusable-design.ts
 *
 * Pure helpers for a reusable's design: reading and writing the `data` JSON
 * WebAPI stores, managing concept-set parameters, and turning a reusable into
 * logic that can be inserted into a host expression (a cohort, a strata rule,
 * a feature analysis) with its concept sets renumbered into the host's
 * codeset id space.
 */
import { z } from 'zod'
import { walkSchema } from '@/components/cohort-editor/schema-walk'
import {
  ConceptSetIdSchema,
  ConceptSetSelectionSchema,
  CriteriaGroupSchema,
  CriteriaSchema,
  type ConceptSet,
  type ConceptSetSelection,
  type Criteria,
  type CriteriaGroup,
  type PrimaryCriteria,
} from '@/models/circe-types'
import {
  CONCEPT_SET_PARAMETER_TYPE,
  REUSABLE_TYPES,
  type ReusableDesign,
  type ReusableParameter,
  type ReusableType,
} from '@/models/reusable.types'
import { nextConceptSetId } from '@/utils/concept-set-id'

const CriteriaListSchema = z.array(CriteriaSchema)

function emptyCriteriaGroup(): CriteriaGroup {
  return { Type: 'ALL', CriteriaList: [], DemographicCriteriaList: [], Groups: [] }
}

function emptyPrimaryCriteria(): PrimaryCriteria {
  return {
    CriteriaList: [],
    ObservationWindow: { PriorDays: 0, PostDays: 0 },
    PrimaryCriteriaLimit: { Type: 'First' },
  }
}

export function createEmptyDesign(type: ReusableType = 'CRITERIA_GROUP'): ReusableDesign {
  return {
    type,
    parameters: [],
    conceptSets: [],
    criteriaGroupExpression: emptyCriteriaGroup(),
    initialEventExpression: emptyPrimaryCriteria(),
    censoringEventExpression: [],
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

/** The id of the placeholder concept set criteria use to reference a parameter. */
export function parameterConceptSetId(parameterId: number): number {
  return -parameterId
}

function normalizeParameter(raw: unknown): ReusableParameter | null {
  if (!isRecord(raw) || typeof raw.id !== 'number') return null
  const name = typeof raw.name === 'string' && raw.name ? raw.name : `Parameter ${raw.id}`
  const data = isRecord(raw.data) ? (raw.data as ConceptSet) : {}
  return {
    ...raw,
    id: raw.id,
    name,
    // Atlas 2.x supported concept-set parameters only, and wrote this value.
    type: CONCEPT_SET_PARAMETER_TYPE,
    data: {
      ...data,
      id: parameterConceptSetId(raw.id),
      name,
      expression: data.expression ?? { items: [] },
    },
  }
}

/**
 * Reads the `data` string WebAPI stores. Tolerates what Atlas 2.x wrote,
 * including the early `expression` key for the criteria group, a missing type
 * (which 2.x read as Criteria Group) and absent sections. Keys this editor does
 * not know about are kept, so a round trip does not drop them.
 */
export function parseReusableDesign(data: string | null | undefined): ReusableDesign {
  let raw: unknown = {}
  if (data) {
    try {
      raw = JSON.parse(data)
    } catch {
      raw = {}
    }
  }
  const record = isRecord(raw) ? raw : {}
  const empty = createEmptyDesign()

  const type = REUSABLE_TYPES.includes(record.type as ReusableType)
    ? (record.type as ReusableType)
    : 'CRITERIA_GROUP'

  const group = record.criteriaGroupExpression ?? record.expression
  const initial = record.initialEventExpression

  const design: ReusableDesign & Record<string, unknown> = {
    ...record,
    type,
    parameters: asArray(record.parameters)
      .map(normalizeParameter)
      .filter((p): p is ReusableParameter => p !== null),
    conceptSets: asArray<ConceptSet>(record.conceptSets),
    criteriaGroupExpression: isRecord(group)
      ? { ...empty.criteriaGroupExpression, ...(group as CriteriaGroup) }
      : empty.criteriaGroupExpression,
    initialEventExpression: isRecord(initial)
      ? { ...empty.initialEventExpression, ...(initial as PrimaryCriteria) }
      : empty.initialEventExpression,
    censoringEventExpression: asArray<Criteria>(record.censoringEventExpression),
  }
  delete design.expression
  return design
}

export function serializeReusableDesign(design: ReusableDesign): string {
  return JSON.stringify(design)
}

/** Lowest unused parameter id, starting at 1 (as Atlas 2.x numbered them). */
export function nextParameterId(parameters: readonly ReusableParameter[]): number {
  const used = new Set(parameters.map(p => p.id))
  let id = 1
  while (used.has(id)) id++
  return id
}

export function createParameter(
  parameters: readonly ReusableParameter[],
  name?: string
): ReusableParameter {
  const id = nextParameterId(parameters)
  const parameterName = name?.trim() || `Parameter ${id}`
  return {
    id,
    name: parameterName,
    type: CONCEPT_SET_PARAMETER_TYPE,
    data: { id: parameterConceptSetId(id), name: parameterName, expression: { items: [] } },
  }
}

export function renameParameter(parameter: ReusableParameter, name: string): void {
  parameter.name = name
  parameter.data.name = name
}

/**
 * Rewrites every concept-set reference in `data`, walked against `schema`.
 * `map` returns the new id, or undefined to clear the reference (which circe
 * reads as "any").
 */
function remapReferences(
  schema: z.ZodTypeAny,
  data: unknown,
  map: (id: number) => number | undefined
): void {
  const remap = (value: unknown) => (typeof value === 'number' ? map(value) : value)
  walkSchema(schema, data, {
    field(fieldSchema, container, key) {
      if (fieldSchema === ConceptSetIdSchema) {
        container[key] = remap(container[key])
        return true
      }
      if (fieldSchema === ConceptSetSelectionSchema) {
        const selection = container[key] as ConceptSetSelection | null | undefined
        if (selection && typeof selection === 'object') {
          selection.CodesetId = remap(selection.CodesetId) as number | undefined
        }
        return true
      }
    },
  })
}

function remapDesignReferences(design: ReusableDesign, map: (id: number) => number | undefined) {
  remapReferences(CriteriaGroupSchema, design.criteriaGroupExpression, map)
  remapReferences(CriteriaListSchema, design.initialEventExpression.CriteriaList ?? [], map)
  remapReferences(CriteriaListSchema, design.censoringEventExpression, map)
}

/** Removes a parameter and clears every criterion that referenced it. */
export function removeParameter(design: ReusableDesign, parameterId: number): void {
  design.parameters = design.parameters.filter(p => p.id !== parameterId)
  const placeholder = parameterConceptSetId(parameterId)
  remapDesignReferences(design, id => (id === placeholder ? undefined : id))
}

/** Removes one of the reusable's own concept sets and clears its references. */
export function removeConceptSet(design: ReusableDesign, conceptSetId: number): void {
  design.conceptSets = design.conceptSets.filter(cs => cs.id !== conceptSetId)
  remapDesignReferences(design, id => (id === conceptSetId ? undefined : id))
}

/**
 * What to put in place of a parameter when inserting: one of the host's own
 * concept sets, a concept set to add to the host, or nothing ("any").
 */
export type ParameterBinding =
  | { kind: 'existing'; id: number }
  | { kind: 'new'; conceptSet: ConceptSet }

export interface ReusableInstance {
  /** Concept sets to append to the host expression, already renumbered. */
  conceptSets: ConceptSet[]
  /** Set for a Criteria Group reusable. */
  criteriaGroup?: CriteriaGroup
  /** Set for an Initial/Censoring Event reusable. */
  criteriaList?: Criteria[]
}

/**
 * Turns a reusable into logic for a host expression. Works on a copy: the
 * reusable's concept sets and any newly bound parameter sets get fresh ids
 * after the host's highest, every reference is rewritten to match, and
 * parameters left unbound are cleared so their criteria match any concept.
 *
 * Unlike Atlas 2.x, which only rewrote top-level and correlated criteria, the
 * rewrite reaches every reference, including nested groups and demographic
 * concept-set selections.
 */
export function instantiateReusable(
  design: ReusableDesign,
  hostConceptSets: readonly ConceptSet[],
  bindings: Readonly<Record<number, ParameterBinding | undefined>> = {}
): ReusableInstance {
  const copy = JSON.parse(JSON.stringify(design)) as ReusableDesign
  const idMap = new Map<number, number | undefined>()
  const added: ConceptSet[] = []
  const taken = hostConceptSets
    .filter((cs): cs is ConceptSet & { id: number } => typeof cs.id === 'number')
    .map(cs => ({ id: cs.id }))

  function allocate(conceptSet: ConceptSet): number {
    const id = nextConceptSetId([...taken, ...added.map(cs => ({ id: cs.id as number }))])
    added.push({ ...conceptSet, id })
    return id
  }

  for (const conceptSet of copy.conceptSets) {
    if (typeof conceptSet.id !== 'number') continue
    idMap.set(conceptSet.id, allocate(conceptSet))
  }

  for (const parameter of copy.parameters) {
    const binding = bindings[parameter.id]
    const placeholder = parameterConceptSetId(parameter.id)
    if (!binding) {
      idMap.set(placeholder, undefined)
    } else if (binding.kind === 'existing') {
      idMap.set(placeholder, binding.id)
    } else {
      idMap.set(placeholder, allocate(binding.conceptSet))
    }
  }

  // A reference to an id the reusable does not define is dangling; clearing it
  // is safer than letting it land on whichever host set shares that number.
  const map = (id: number) => idMap.get(id)

  if (copy.type === 'INITIAL_EVENT') {
    const criteriaList = copy.initialEventExpression.CriteriaList ?? []
    remapReferences(CriteriaListSchema, criteriaList, map)
    return { conceptSets: added, criteriaList }
  }

  remapReferences(CriteriaGroupSchema, copy.criteriaGroupExpression, map)
  return { conceptSets: added, criteriaGroup: copy.criteriaGroupExpression }
}

function isEmptyGroup(group: CriteriaGroup): boolean {
  return (
    (group.CriteriaList?.length ?? 0) === 0 &&
    (group.DemographicCriteriaList?.length ?? 0) === 0 &&
    (group.Groups?.length ?? 0) === 0
  )
}

/**
 * Adds a reusable's criteria group to `target`. An empty target takes the
 * reusable's criteria and its match type as they are. A target that already
 * holds criteria gets the reusable as a nested group instead: merging would
 * either change the match type the existing criteria were written under (what
 * Atlas 2.x did) or apply the target's match type to the reusable's criteria,
 * and both change what the logic means.
 */
export function insertCriteriaGroup(target: CriteriaGroup, inserted: CriteriaGroup): void {
  if (isEmptyGroup(target)) {
    target.Type = inserted.Type ?? 'ALL'
    if (inserted.Count !== undefined && inserted.Count !== null) {
      target.Count = inserted.Count
    } else {
      delete target.Count
    }
    target.CriteriaList = [...(inserted.CriteriaList ?? [])]
    target.DemographicCriteriaList = [...(inserted.DemographicCriteriaList ?? [])]
    target.Groups = [...(inserted.Groups ?? [])]
    return
  }
  if (!target.Groups) target.Groups = []
  target.Groups.push(inserted)
}
