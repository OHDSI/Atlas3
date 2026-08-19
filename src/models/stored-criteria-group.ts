/**
 * stored-criteria-group.ts
 *
 * A criteria group as it arrives from WebAPI, rather than as circe defines it.
 *
 * Characterization strata and incidence-rate stratify rules both carry a
 * `CriteriaGroup`, and both are read back from definitions written by older
 * Atlas versions. Two shapes show up there that the circe schema alone does not
 * accept:
 *
 * - `null`, rather than the field being absent. Chris's legacy IR strata are
 *   full of these: the 2.x save path stripped nulls from cohort expressions but
 *   not from IR definitions, so they survive in stored data.
 * - a JSON *string*, from the older Atlas format that serialised the group
 *   rather than nesting it. `utils/characterization-validators.ts` has always
 *   handled this case explicitly.
 *
 * Both were previously rejected by a bare `CriteriaGroupSchema.optional()`, and
 * because these designs are read with `parseOrThrow`, a single legacy stratum
 * failed the entire characterization or incidence rate rather than just itself.
 *
 * Normalising here means the rest of the application only ever sees a parsed
 * `CriteriaGroup | undefined`, which is what its types already claim.
 */
import { z } from 'zod'
import { CriteriaGroupSchema } from '@/models/circe-types'
import { logger } from '@/utils/logger'

const CONTEXT = 'StoredCriteriaGroup'

export const StoredCriteriaGroupSchema = z.preprocess(value => {
  // An explicitly-null group and an absent one mean the same thing: not set.
  if (value === null) return undefined
  if (typeof value !== 'string') return value

  const trimmed = value.trim()
  if (trimmed.length === 0) return undefined

  try {
    return JSON.parse(trimmed)
  } catch (err) {
    // Dropping one stratum's criteria is a smaller loss than failing the whole
    // definition, but it is still a loss, so it is reported rather than
    // swallowed.
    logger.warn(CONTEXT, 'Discarding criteria that are not parseable JSON', err)
    return undefined
  }
}, CriteriaGroupSchema.optional())
