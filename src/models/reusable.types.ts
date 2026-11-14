/**
 * Reusable Models
 *
 * A reusable is a named piece of cohort logic (a criteria group, or a set of
 * entry/censoring events) that can be inserted into a cohort definition,
 * a characterization's strata, a feature analysis or an incidence rate's
 * strata (WebAPI /reusable).
 *
 * WebAPI stores the design as an opaque JSON string in `data`. Its shape is
 * the one Atlas 2.x wrote, and reusables saved by Atlas 2.x must keep working,
 * so `ReusableDesign` mirrors it field for field.
 */
import { z } from 'zod'
import { TagSchema } from './webapi.types'
import type { ConceptSet, Criteria, CriteriaGroup, PrimaryCriteria } from './circe-types'

const UserRefSchema = z.union([
  z.string(),
  z.object({ login: z.string().optional(), name: z.string().nullish() }).passthrough(),
])

const DateValueSchema = z.union([z.number(), z.string()])

export const ReusableSchema = z
  .object({
    id: z.number().int().optional(),
    name: z.string(),
    description: z.string().nullish(),
    data: z.string().nullish(),
    tags: z.array(TagSchema).nullish(),
    createdBy: UserRefSchema.nullish(),
    createdDate: DateValueSchema.nullish(),
    modifiedBy: UserRefSchema.nullish(),
    modifiedDate: DateValueSchema.nullish(),
    readAccess: z.boolean().optional(),
    writeAccess: z.boolean().optional(),
  })
  .passthrough()

export type Reusable = z.infer<typeof ReusableSchema>

/** WebAPI's Spring Data page wrapper around the reusable list. */
export const ReusablePageSchema = z
  .object({
    content: z.array(ReusableSchema),
  })
  .passthrough()

/**
 * Initial/Censoring Event reusables hold entry events; Criteria Group
 * reusables hold a criteria group for any subgroup of criteria. Atlas 2.x
 * offered exactly these two.
 */
export type ReusableType = 'INITIAL_EVENT' | 'CRITERIA_GROUP'

export const REUSABLE_TYPES: readonly ReusableType[] = ['INITIAL_EVENT', 'CRITERIA_GROUP']

/** Atlas 2.x's only parameter type, and its literal wire value. */
export const CONCEPT_SET_PARAMETER_TYPE = 'Concept Set'

/**
 * A concept set the reusable leaves open: criteria reference it like any
 * other concept set, and whoever inserts the reusable supplies the actual set
 * (or none, which reads as "any"). Its placeholder concept set's id is the
 * parameter id negated, so it can never collide with a real concept set.
 */
export interface ReusableParameter {
  id: number
  name: string
  type: typeof CONCEPT_SET_PARAMETER_TYPE
  data: ConceptSet
}

export interface ReusableDesign {
  type: ReusableType
  parameters: ReusableParameter[]
  conceptSets: ConceptSet[]
  criteriaGroupExpression: CriteriaGroup
  initialEventExpression: PrimaryCriteria
  censoringEventExpression: Criteria[]
}
