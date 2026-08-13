import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { z } from 'zod'
import { CriteriaSchemaMap, DemographicCriteriaSchema, type CriteriaWrapperKey } from '@/components/cohort-editor/circe.types'
import type { CriteriaAttributeSpec } from '@/components/cohort-editor/criteria/criteria-editor.types'
import ConditionEra from '@/components/cohort-editor/criteria/ConditionEra.vue'
import ConditionOccurrence from '@/components/cohort-editor/criteria/ConditionOccurrence.vue'
import Death from '@/components/cohort-editor/criteria/Death.vue'
import DemographicCriteria from '@/components/cohort-editor/criteria/DemographicCriteria.vue'
import DeviceExposure from '@/components/cohort-editor/criteria/DeviceExposure.vue'
import DoseEra from '@/components/cohort-editor/criteria/DoseEra.vue'
import DrugEra from '@/components/cohort-editor/criteria/DrugEra.vue'
import DrugExposure from '@/components/cohort-editor/criteria/DrugExposure.vue'
import Measurement from '@/components/cohort-editor/criteria/Measurement.vue'
import Observation from '@/components/cohort-editor/criteria/Observation.vue'
import ObservationPeriod from '@/components/cohort-editor/criteria/ObservationPeriod.vue'
import PayerPlanPeriod from '@/components/cohort-editor/criteria/PayerPlanPeriod.vue'
import ProcedureOccurrence from '@/components/cohort-editor/criteria/ProcedureOccurrence.vue'
import Specimen from '@/components/cohort-editor/criteria/Specimen.vue'
import VisitDetail from '@/components/cohort-editor/criteria/VisitDetail.vue'
import VisitOccurrence from '@/components/cohort-editor/criteria/VisitOccurrence.vue'

const vuetify = createVuetify({ components, directives })

type Editor = Record<string, unknown>

interface Target {
  schema: z.ZodObject<z.ZodRawShape>
  component: Editor | null
  /** Criteria editors take the Jackson wrapper; the demographic editor takes the payload itself. */
  wrapperKey: string | null
}

const CRITERIA_EDITORS: Record<CriteriaWrapperKey, Editor | null> = {
  ConditionEra,
  ConditionOccurrence,
  Death,
  DeviceExposure,
  DoseEra,
  DrugEra,
  DrugExposure,
  LocationRegion: null,
  Measurement,
  Observation,
  ObservationPeriod,
  PayerPlanPeriod,
  ProcedureOccurrence,
  Specimen,
  VisitDetail,
  VisitOccurrence,
}

const TARGETS: Record<string, Target> = {
  ...Object.fromEntries(
    Object.entries(CRITERIA_EDITORS).map(([domain, component]) => [domain, {
      schema: CriteriaSchemaMap[domain as CriteriaWrapperKey] as z.ZodObject<z.ZodRawShape>,
      component,
      wrapperKey: domain,
    }]),
  ),
  DemographicCriteria: {
    schema: DemographicCriteriaSchema,
    component: DemographicCriteria,
    wrapperKey: null,
  },
}

/**
 * Every editor binds its own concept set through an `EventConceptSet` header widget
 * rather than through the attribute list, so `CodesetId` is surfaced without any
 * attribute spec ever writing it.
 */
const HEADER_BOUND_FIELDS = ['CodesetId']

/**
 * Schema fields no attribute spec surfaces. A value loaded from a 2.x cohort into one
 * of these is invisible and uneditable in the editor while still constraining
 * generation, so every entry is a known gap rather than an accepted design.
 */
const KNOWN_UNSURFACED: readonly string[] = [
  'DoseEra.DateAdjustment',
  'DrugEra.DateAdjustment',
  'DrugExposure.VisitType',
  'DrugExposure.VisitTypeCS',
  'LocationRegion.CodesetId',
  'LocationRegion.CorrelatedCriteria',
  'LocationRegion.DateAdjustment',
  'LocationRegion.EndDate',
  'LocationRegion.StartDate',
  'Measurement.DateAdjustment',
]

function sortedStringify(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(sortedStringify).join(',') + ']'
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value as object).sort().map(
      key => JSON.stringify(key) + ':' + sortedStringify((value as Record<string, unknown>)[key]),
    ).join(',') + '}'
  }
  return JSON.stringify(value)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function collectDiffs(written: unknown, parsed: unknown, path: string, out: Set<string>): void {
  if (sortedStringify(written) === sortedStringify(parsed)) return

  if (Array.isArray(written) && Array.isArray(parsed)) {
    if (written.length !== parsed.length) {
      out.add(`${path}.length`)
      return
    }
    written.forEach((item, index) => collectDiffs(item, parsed[index], `${path}[]`, out))
    return
  }
  if (isPlainObject(written) && isPlainObject(parsed)) {
    for (const key of new Set([...Object.keys(written), ...Object.keys(parsed)])) {
      collectDiffs(written[key], parsed[key], path ? `${path}.${key}` : key, out)
    }
    return
  }
  out.add(path || '(root)')
}

function specsOf(wrapper: { vm: unknown }): CriteriaAttributeSpec[] {
  const exposed = wrapper.vm as { attributeSpecs?: CriteriaAttributeSpec[] }
  const specs = exposed.attributeSpecs
  if (!Array.isArray(specs)) {
    throw new Error('editor does not expose attributeSpecs')
  }
  return specs
}

/**
 * Runs `apply` over every attribute spec of a freshly mounted editor and hands back the
 * criteria object the specs wrote into. `init` and `componentProps` are exercised
 * separately: both call `ensureObjectField`, and the second call is a no-op once the
 * first has created the field, so a shape defect in only one of them would hide.
 */
function writesOf(
  target: Target,
  apply: (spec: CriteriaAttributeSpec) => void,
): { data: Record<string, unknown>, specKeys: string[] } {
  const data: Record<string, unknown> = {}
  const criteria = target.wrapperKey ? { [target.wrapperKey]: data } : data
  const wrapper = mount(target.component as Editor, {
    global: { plugins: [vuetify, createPinia()] },
    props: { criteria, conceptSets: [] },
  })
  const specs = specsOf(wrapper)
  for (const spec of specs) apply(spec)
  wrapper.unmount()
  return { data, specKeys: specs.map(spec => spec.key) }
}

function surfaceOf(target: Target) {
  const fromInit = writesOf(target, spec => spec.init())
  const fromProps = writesOf(target, spec => spec.componentProps?.())
  return {
    specKeys: fromInit.specKeys,
    written: [fromInit.data, fromProps.data],
    writtenKeys: [...Object.keys(fromInit.data), ...Object.keys(fromProps.data)],
  }
}

const SURFACE: Record<string, ReturnType<typeof surfaceOf>> = Object.fromEntries(
  Object.entries(TARGETS)
    .filter(([, target]) => target.component !== null)
    .map(([name, target]) => [name, surfaceOf(target)]),
)

const EDITOR_NAMES = Object.keys(SURFACE)

function shapeKeys(name: string): string[] {
  return Object.keys((TARGETS[name] as Target).schema.shape)
}

function surfaceFor(name: string): ReturnType<typeof surfaceOf> {
  const surface = SURFACE[name]
  if (!surface) throw new Error(`no attribute-spec surface captured for ${name}`)
  return surface
}

describe.each(EDITOR_NAMES)('%s attribute specs against the schema', domain => {
  it('writes only fields the domain schema models', () => {
    const modelled = shapeKeys(domain)
    const unmodelled = [...new Set(surfaceFor(domain).writtenKeys)]
      .filter(key => !modelled.includes(key))
      .sort()

    expect(unmodelled, `${domain} attribute specs write fields the schema does not model`).toEqual([])
  })

  it('writes nested shapes the domain schema keeps through a parse', () => {
    const schema = (TARGETS[domain] as Target).schema
    const stripped = new Set<string>()

    for (const data of surfaceFor(domain).written) {
      const result = schema.safeParse(data)
      expect(result.success, `${domain} attribute specs write a value its schema rejects: ${
        result.success ? '' : JSON.stringify(result.error.issues)
      }`).toBe(true)
      if (!result.success) continue
      collectDiffs(data, result.data as Record<string, unknown>, domain, stripped)
    }

    expect([...stripped].sort(), `${domain} attribute specs write nested fields the schema strips`).toEqual([])
  })
})

describe('schema fields no attribute spec surfaces', () => {
  it('matches the pinned list of known gaps', () => {
    const unsurfaced: string[] = []

    for (const domain of Object.keys(TARGETS)) {
      const surface = SURFACE[domain]
      const surfaced = surface
        ? new Set([...surface.specKeys, ...surface.writtenKeys, ...HEADER_BOUND_FIELDS])
        : new Set<string>()

      for (const field of shapeKeys(domain)) {
        if (!surfaced.has(field)) unsurfaced.push(`${domain}.${field}`)
      }
    }

    expect(unsurfaced.sort()).toEqual([...KNOWN_UNSURFACED])
  })
})
