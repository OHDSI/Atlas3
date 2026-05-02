/**
 * Cohort Sample Types
 *
 * Mirrors WebAPI 3.0 `org.ohdsi.webapi.cohortsample.*` DTOs (see
 * /home/ph/code/WebAPI/src/main/java/org/ohdsi/webapi/cohortsample/dto/).
 *
 * A cohort sample is a deterministic random selection of N persons from a
 * generated cohort, optionally filtered by age and gender criteria.
 */

import { z } from 'zod'

// Server-enforced limits (mirrors SampleParametersDTO constants)
export const SAMPLE_SIZE_MAX = 500
export const SAMPLE_AGE_MAX = 500

export const GENDER_MALE_CONCEPT_ID = 8507
export const GENDER_FEMALE_CONCEPT_ID = 8532

export type SampleAgeMode =
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'equalTo'
  | 'between'
  | 'notBetween'

export const SampleAgeModeValues: readonly SampleAgeMode[] = [
  'lessThan',
  'lessThanOrEqual',
  'greaterThan',
  'greaterThanOrEqual',
  'equalTo',
  'between',
  'notBetween',
]

export const SampleAgeSchema = z.object({
  mode: z.enum([
    'lessThan',
    'lessThanOrEqual',
    'greaterThan',
    'greaterThanOrEqual',
    'equalTo',
    'between',
    'notBetween',
  ]),
  value: z.number().int().nonnegative().optional(),
  min: z.number().int().nonnegative().optional(),
  max: z.number().int().nonnegative().optional(),
})

export type SampleAge = z.infer<typeof SampleAgeSchema>

export const SampleGenderSchema = z.object({
  conceptIds: z.array(z.number().int()).default([]),
  otherNonBinary: z.boolean().default(false),
})

export type SampleGender = z.infer<typeof SampleGenderSchema>

export const SampleParametersSchema = z.object({
  name: z.string().min(1),
  size: z.number().int().positive().max(SAMPLE_SIZE_MAX),
  age: SampleAgeSchema.optional(),
  gender: SampleGenderSchema.optional(),
})

export type SampleParameters = z.infer<typeof SampleParametersSchema>

// User shape mirrors org.ohdsi.webapi.user.User as serialized to clients
export const SampleUserSchema = z
  .object({
    login: z.string().optional(),
    name: z.string().optional(),
  })
  .passthrough()

export type SampleUser = z.infer<typeof SampleUserSchema>

export const SampleElementSchema = z.object({
  sampleId: z.number().int().nullable().optional(),
  rank: z.number().int().optional(),
  personId: z.string(),
  genderConceptId: z.number().int(),
  age: z.number().int(),
  recordCount: z.number().int().nullable().optional(),
})

export type SampleElement = z.infer<typeof SampleElementSchema>

export const CohortSampleSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  size: z.number().int(),
  createdDate: z.union([z.string(), z.number()]).optional(),
  createdBy: SampleUserSchema.nullable().optional(),
  cohortDefinitionId: z.number().int().nullable().optional(),
  sourceId: z.number().int().nullable().optional(),
  age: SampleAgeSchema.nullable().optional(),
  gender: SampleGenderSchema.nullable().optional(),
  elements: z.array(SampleElementSchema).optional(),
})

export type CohortSample = z.infer<typeof CohortSampleSchema>

export const CohortSampleListSchema = z.object({
  cohortDefinitionId: z.number().int(),
  sourceId: z.number().int(),
  generationStatus: z.string().nullable().optional(),
  isValid: z.boolean().optional(),
  samples: z.array(CohortSampleSchema),
})

export type CohortSampleList = z.infer<typeof CohortSampleListSchema>

/**
 * Client-side validation of sample parameters that mirrors the server's
 * SampleParametersDTO.validate(). Returns an array of human-readable error
 * messages — empty array means the parameters are valid.
 */
export function validateSampleParameters(p: SampleParameters): string[] {
  const errors: string[] = []
  if (!p.name || p.name.trim().length === 0) {
    errors.push('Sample must have a name.')
  }
  if (!Number.isInteger(p.size) || p.size <= 0 || p.size > SAMPLE_SIZE_MAX) {
    errors.push(`Sample size must be an integer between 1 and ${SAMPLE_SIZE_MAX}.`)
  }
  if (p.age) {
    const a = p.age
    const single =
      a.mode === 'lessThan' ||
      a.mode === 'lessThanOrEqual' ||
      a.mode === 'greaterThan' ||
      a.mode === 'greaterThanOrEqual' ||
      a.mode === 'equalTo'
    const range = a.mode === 'between' || a.mode === 'notBetween'
    if (single) {
      if (a.value === undefined || a.value === null)
        errors.push('Age value is required for this comparison mode.')
      if (a.min !== undefined || a.max !== undefined)
        errors.push('Age range cannot be used with a single-value comparison mode.')
    }
    if (range) {
      if (a.min === undefined || a.max === undefined)
        errors.push('Both minimum and maximum age are required for between/notBetween.')
      if (a.value !== undefined)
        errors.push('Single age value cannot be used with between/notBetween.')
      if (a.min !== undefined && a.max !== undefined && a.min > a.max)
        errors.push('Minimum age may not exceed maximum age.')
      if (a.max !== undefined && a.max >= SAMPLE_AGE_MAX)
        errors.push(`Maximum age must be smaller than ${SAMPLE_AGE_MAX}.`)
    }
  }
  if (p.gender) {
    if ((p.gender.conceptIds?.length ?? 0) === 0 && !p.gender.otherNonBinary) {
      errors.push('Select at least one gender or non-binary.')
    }
  }
  return errors
}
