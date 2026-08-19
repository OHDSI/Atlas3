/**
 * criteria-registry.ts
 *
 * One description of the OMOP criteria types, replacing five hand-maintained
 * lists that had drifted apart: the add-criteria menu in CohortExpressionEditor,
 * the factory switch beside it, the union and options in CriteriaGroup, the
 * editor map in CriteriaRenderer, and the domain mapping in
 * plugins/host/capabilities/translate.ts.
 *
 * Two of those switches fell through to ConditionOccurrence for anything they
 * did not recognise, so a type missing from one list did not fail — it silently
 * became a condition. `LocationRegion` is exactly that case: it is in the schema
 * and round-trips through save, but appeared in none of the five. Here it is
 * present with `hasEditor: false`, which keeps it out of the add menu (there is
 * nothing to edit it with) while stating the gap instead of hiding it.
 *
 * Deliberately free of Vue component imports: translate.ts consumes the domain
 * mapping from here and lives in the plugin host, which must not pull the
 * editor tree into its bundle. The components are wired up separately, in
 * CriteriaRenderer.
 */
import type { Criteria, CriteriaWrapperKey } from '@/models/circe-types'

export interface CriteriaTypeEntry {
  /** The circe wrapper key, e.g. `ConditionOccurrence`. */
  key: CriteriaWrapperKey
  /** i18n key for the human-readable name. */
  i18nKey: string
  /** English fallback, matching the wording the editors already used. */
  label: string
  /**
   * OMOP domains that map to this criteria type. Only the types the agent can
   * be asked for by domain carry these; the rest are reachable by name only.
   */
  domains: readonly string[]
  /** Whether a criteria editor component exists for this type. */
  hasEditor: boolean
  /** A new, empty criterion of this type. */
  create(): Criteria
}

// Generic over both the key and `hasEditor` so each entry keeps its literal
// types. Widening either would make the derivations below vacuous: the key
// drives the exhaustiveness check against the schema, and `hasEditor` drives
// EditableCriteriaKey, which is what CriteriaRenderer's editor map is checked
// against.
function entry<K extends CriteriaWrapperKey, E extends boolean = true>(
  key: K,
  i18nKey: string,
  label: string,
  options: { domains?: readonly string[]; hasEditor?: E; initial?: Record<string, unknown> } = {}
): CriteriaTypeEntry & { key: K; hasEditor: E } {
  return {
    key,
    i18nKey,
    label,
    domains: options.domains ?? [],
    hasEditor: (options.hasEditor ?? true) as E,
    create: () => ({ [key]: { ...(options.initial ?? {}) } }) as Criteria,
  }
}

// Deliberately un-annotated so TypeScript infers each `key` as a literal; an
// explicit `readonly CriteriaTypeEntry[]` would widen them to CriteriaWrapperKey
// and defeat the exhaustiveness check below.
export const CRITERIA_TYPES = [
  // `First: false` is the one non-empty default, carried over from the previous
  // factory switch rather than changed here.
  entry('ConditionOccurrence', 'criteria.conditionOccurrence.name', 'Condition Occurrence', {
    domains: ['Condition'],
    initial: { First: false },
  }),
  entry('ConditionEra', 'criteria.conditionEra.name', 'Condition Era'),
  entry('DrugExposure', 'criteria.drugExposure.name', 'Drug Exposure', { domains: ['Drug'] }),
  entry('DrugEra', 'criteria.drugEra.name', 'Drug Era'),
  entry('DoseEra', 'criteria.doseEra.name', 'Dose Era'),
  entry('Measurement', 'criteria.measurement.name', 'Measurement', { domains: ['Measurement'] }),
  entry('Observation', 'criteria.observation.name', 'Observation', { domains: ['Observation'] }),
  entry('ObservationPeriod', 'criteria.observationPeriod.name', 'Observation Period'),
  entry('PayerPlanPeriod', 'criteria.payerPlanPeriod.name', 'Payer Plan Period'),
  entry('ProcedureOccurrence', 'criteria.procedureOccurrence.name', 'Procedure Occurrence', {
    domains: ['Procedure'],
  }),
  entry('Specimen', 'criteria.specimen.name', 'Specimen', { domains: ['Specimen'] }),
  entry('VisitDetail', 'criteria.visitDetail.name', 'Visit Detail'),
  entry('VisitOccurrence', 'criteria.visitOccurrence.name', 'Visit Occurrence', { domains: ['Visit'] }),
  entry('DeviceExposure', 'criteria.deviceExposure.name', 'Device Exposure', { domains: ['Device'] }),
  entry('Death', 'criteria.death.name', 'Death'),
  // In the schema and round-trips through save, but no editor component exists,
  // so it is not offered in the add menu.
  entry('LocationRegion', 'criteria.locationRegion.name', 'Location Region', { hasEditor: false as const }),
] as const

type RegisteredKey = (typeof CRITERIA_TYPES)[number]['key']

/**
 * Fails to compile if the registry and the schema disagree in either direction —
 * a criteria type added to CriteriaSchemaMap but not described here, or a key
 * here that the schema does not have. This is the drift the five hand-maintained
 * lists used to accumulate silently, made into a build error.
 */
const _registryCoversSchema: RegisteredKey extends CriteriaWrapperKey
  ? CriteriaWrapperKey extends RegisteredKey
    ? true
    : never
  : never = true
void _registryCoversSchema

export const CRITERIA_TYPE_BY_KEY: Readonly<Record<CriteriaWrapperKey, CriteriaTypeEntry>> =
  Object.fromEntries(CRITERIA_TYPES.map(type => [type.key, type])) as Record<
    CriteriaWrapperKey,
    CriteriaTypeEntry
  >

/** An entry the user can actually add and edit. */
export type EditableCriteriaType = Extract<(typeof CRITERIA_TYPES)[number], { hasEditor: true }>

/**
 * The keys that must have an editor component bound to them, derived from the
 * registry rather than listed by hand. CriteriaRenderer's map is checked against
 * this, so marking a type editable without writing its editor is a compile
 * error instead of a blank card at runtime.
 */
export type EditableCriteriaKey = EditableCriteriaType['key']

/** The types a user can actually add and edit, in menu order. */
export const EDITABLE_CRITERIA_TYPES: readonly EditableCriteriaType[] = CRITERIA_TYPES.filter(
  (type): type is EditableCriteriaType => type.hasEditor
)

/**
 * The criteria type an OMOP domain maps to.
 *
 * Returns undefined for an unrecognised domain rather than defaulting to
 * ConditionOccurrence: the old switches silently turned "some domain we have
 * not mapped" into a condition criterion, which is a wrong cohort rather than a
 * missing one. Callers decide what to do about not knowing.
 */
export function criteriaTypeForDomain(domain: string | undefined): CriteriaWrapperKey | undefined {
  if (!domain) return undefined
  return CRITERIA_TYPES.find(type => type.domains.includes(domain))?.key
}
