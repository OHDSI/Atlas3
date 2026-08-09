import type { Capability, JsonSchema } from './types'
import routeManifest from '@/router/routes.manifest.json'

const DOMAIN_ENUM = ['Condition', 'Drug', 'Procedure', 'Measurement',
  'Observation', 'Visit', 'Device', 'Specimen']
const OPERATOR_ENUM = ['gt', 'gte', 'lt', 'lte', 'eq', 'between']

const criterionSchema: JsonSchema = {
  type: 'object',
  properties: {
    conceptId: { type: 'number', description: 'OMOP concept ID' },
    conceptName: { type: 'string', description: 'Human-readable concept name' },
    domain: { type: 'string', enum: DOMAIN_ENUM, description: 'OMOP domain' },
    group: { type: 'string', enum: ['inclusion', 'exclusion'] },
    includeDescendants: { type: 'boolean' },
    operator: {
      type: 'string', enum: OPERATOR_ENUM,
      description: 'Measurement value operator (only for Measurement domain)',
    },
    value: { type: 'number', description: 'Threshold value (only for Measurement domain)' },
    value2: { type: 'number', description: 'Upper bound for between operator' },
  },
  required: ['conceptId', 'conceptName', 'domain', 'group', 'includeDescendants'],
}

const conceptRefSchema: JsonSchema = {
  type: 'object',
  properties: {
    conceptId: { type: 'number' },
    conceptName: { type: 'string' },
    domain: { type: 'string', enum: DOMAIN_ENUM },
    includeDescendants: { type: 'boolean' },
    isExcluded: { type: 'boolean', description: 'Optional exclusion flag for concept-set items' },
  },
  required: ['conceptId', 'conceptName', 'domain'],
}

const temporalWindowSchema: JsonSchema = {
  type: 'object',
  description: 'Optional temporal window for the criteria, relative to the index (cohort entry) start date.',
  properties: {
    startDays: { type: ['number', 'null'], description: 'Window start in days vs index start: negative = before index, 0 = at index, null = all time prior.' },
    endDays: { type: ['number', 'null'], description: 'Window end in days vs index start: positive = after index, null = all time after. Default 0 (index date).' },
  },
}

const agentVisibleViews = (routeManifest as Array<{ name: string; agentVisible?: boolean }>)
  .filter(r => r.agentVisible).map(r => r.name)

const idNameItem = (requireName: boolean): JsonSchema => ({
  type: 'object',
  properties: { id: { type: 'number' }, name: { type: 'string' } },
  required: requireName ? ['id', 'name'] : ['id'],
})

export const CAPABILITIES: Capability[] = [
  {
    name: 'add_criterion',
    description: 'Propose adding one criterion to the cohort. The user sees a confirmation card and accepts or rejects.',
    schema: criterionSchema,
    requiresApproval: true,
  },

  {
    name: 'add_criteria',
    description: 'Propose adding multiple criteria to the cohort with AND/OR logic. ALWAYS provide a `name` describing the rule (e.g. "On metformin or sulfonylurea", "Excludes pregnancy"); never omit it. Prefer add_inclusion_rule when cardinality or temporal constraints are needed.',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: "Short, human-readable label for this group (REQUIRED). E.g. 'Confirmatory T2DM treatment', 'Exclude Type 1 DM'." },
        group: { type: 'string', enum: ['inclusion', 'exclusion'] },
        logic: { type: 'string', enum: ['AND', 'OR'] },
        items: { type: 'array', items: criterionSchema },
      },
      required: ['name', 'group', 'logic', 'items'],
    },
    requiresApproval: true,
  },

  {
    name: 'add_qualifying_criterion',
    description: "Restrict the ENTRY EVENT itself rather than the person — the editor's \"Restrict initial events\". Use when the qualifying event must coincide with something, e.g. an inpatient visit, a diagnosis recorded on the same admission. Distinct from add_criterion, which qualifies the person over a window.",
    schema: conceptRefSchema,
    requiresApproval: true,
  },
  {
    name: 'set_censor_window',
    description: "Bound the study period with fixed dates (YYYY-MM-DD): nobody is followed before startDate or after endDate, whatever their observation. Use when the user names a study window ('2015 to 2019') — without it the cohort spans the whole database and the counts answer a different question.",
    schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Earliest date to include, YYYY-MM-DD.' },
        endDate: { type: 'string', description: 'Latest date to include, YYYY-MM-DD.' },
      },
      required: [],
    },
    requiresApproval: true,
  },
  {
    name: 'set_era_collapse',
    description: "Gap in days below which two stretches of cohort membership are merged into one era (the editor's era collapse). Default 0 — a person who leaves and re-enters counts as two episodes. Raise it when brief gaps should not split a person's follow-up.",
    schema: {
      type: 'object',
      properties: {
        gapDays: { type: 'number', description: 'Merge stretches separated by fewer than this many days.' },
      },
      required: ['gapDays'],
    },
    requiresApproval: true,
  },
  {
    name: 'set_event_limits',
    description: "Choose which qualifying events count, per person. 'first' is the new-user / first-diagnosis design — one row per person at their earliest qualifying event; 'all' (the default) puts a person in the cohort once per qualifying event, so counts mean episodes rather than people. Set this deliberately whenever the design is about new users or incident disease; phenotype_patterns reports what accepted definitions of the condition use.",
    schema: {
      type: 'object',
      properties: {
        entryEvents: { type: 'string', enum: ['first', 'all', 'last'], description: "Which entry events qualify a person ('Cohort entry on' in the editor)." },
        qualifyingEvents: { type: 'string', enum: ['first', 'all', 'last'], description: "Which qualifying events the inclusion rules apply to ('Apply rules to')." },
        inclusionRuleEvents: { type: 'string', enum: ['first', 'all', 'last'], description: 'Which events remain after the inclusion rules are applied.' },
      },
      required: [],
    },
    requiresApproval: true,
  },
  {
    name: 'add_demographic_criterion',
    description: "Restrict the cohort by age or sex — the criteria that have no concept set. Use for \"adults\", \"age 18 and over\", \"women aged 40 to 70\": pass minAge / maxAge in years and/or sex. Without this a cohort NAMED for adults contains children, because nothing in the definition says otherwise. Added as an inclusion rule, which is where CIRCE keeps demographic criteria.",
    schema: {
      type: 'object',
      properties: {
        minAge: { type: 'number', description: 'Lowest age in years, inclusive. 18 for adults.' },
        maxAge: { type: 'number', description: 'Highest age in years, inclusive.' },
        sex: { type: 'string', enum: ['male', 'female'], description: 'Restrict to one sex. Omit for any.' },
        name: { type: 'string', description: 'Rule name shown in the editor. Defaults to a label like "Age 18+".' },
      },
      required: [],
    },
    requiresApproval: true,
  },
  {
    name: 'use_concept_set',
    description: "Use an EXISTING saved concept set in the cohort being built, by its id from search_existing_concept_sets. Prefer this over rebuilding the same set concept by concept: it reuses the definition the user already curated, and stays in step with it. The host reads the saved set's concepts and adds the criterion. Use group 'entry' for a qualifying event, 'inclusion' to require it, 'exclusion' to require its absence.",
    schema: {
      type: 'object',
      properties: {
        conceptSetId: { type: 'number', description: 'Id of the saved concept set (from search_existing_concept_sets).' },
        group: { type: 'string', enum: ['entry', 'inclusion', 'exclusion'], description: "Where the criterion goes. Defaults to 'inclusion'." },
        name: { type: 'string', description: 'Rule name to show in the editor. Defaults to the concept set name.' },
      },
      required: ['conceptSetId'],
    },
    requiresApproval: true,
  },
  {
    name: 'remove_inclusion_rule',
    description: "Remove an inclusion rule from the cohort being edited, by its name (as shown in the editor) or its id. Use this when the user asks to drop, delete or undo a rule you added — do not rebuild the cohort to get rid of one rule.",
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Exact rule name as it appears in the cohort.' },
        id: { type: 'string', description: 'Rule id, if you have it.' },
      },
      required: [],
    },
    requiresApproval: true,
  },
  {
    name: 'remove_entry_event',
    description: "Remove one entry event from the cohort being edited, identified by the concept it was built from. Use when the cohort qualifies on several entry events and the user wants one dropped. To replace the entry event entirely, call set_entry_event instead.",
    schema: {
      type: 'object',
      properties: {
        conceptId: { type: 'number', description: 'Concept id of the entry event to remove.' },
        conceptName: { type: 'string', description: 'Concept name, if the id is not to hand.' },
      },
      required: [],
    },
    requiresApproval: true,
  },
  {
    name: 'set_entry_event',
    description: "Set the cohort's primary qualifying entry event. Replaces any existing entry event.",
    schema: conceptRefSchema,
    requiresApproval: true,
  },

  {
    name: 'set_observation_window',
    description: 'Set the prior + post observation window (in days) around the entry event. priorDays = days of continuous observation required BEFORE entry; postDays = days of continuous observation required AFTER entry.',
    schema: {
      type: 'object',
      properties: {
        priorDays: { type: 'number' },
        postDays: { type: 'number' },
      },
      required: ['priorDays', 'postDays'],
    },
    requiresApproval: true,
  },

  {
    name: 'add_exit_criterion',
    description: 'Define how a patient exits the cohort. Strategy: end_of_observation = end of continuous observation period; fixed_duration = N days after entry; continuous_drug = persistence-window-driven exit; custom_event = exit on a clinical event.',
    schema: {
      type: 'object',
      properties: {
        strategy: { type: 'string', enum: ['end_of_observation', 'fixed_duration', 'continuous_drug', 'custom_event'] },
        offset: { type: 'number', description: 'Days offset (for fixed_duration and continuous_drug)' },
        dateField: { type: 'string', enum: ['START_DATE', 'END_DATE'], description: 'Anchor for offset' },
        persistenceWindow: { type: 'number', description: 'Gap days between exposures for continuous_drug' },
        surveillanceWindow: { type: 'number', description: 'Trailing days after final exposure for continuous_drug' },
        concept: { ...conceptRefSchema, description: 'Concept defining the exit event (for continuous_drug or custom_event)' },
      },
      required: ['strategy'],
    },
    requiresApproval: true,
  },

  {
    name: 'set_censor_event',
    description: "Add a censoring criterion that ends a patient's time-at-risk when the event occurs.",
    schema: conceptRefSchema,
    requiresApproval: true,
  },

  {
    name: 'create_standalone_concept_set',
    description: "Create a NEW reusable concept set on the server via WebAPI, saved globally and usable across cohorts. This is NOT the default: criteria capabilities (set_entry_event, add_criterion, add_criteria, add_inclusion_rule) already build the concept set they need inside the cohort definition, which is what most phenotypes want. Reach for this only when the set is meant to be reused — the user asked for a standalone concept set, or the same set is needed by several cohorts or analyses. The host persists it, then attaches it to the open cohort if there is one, otherwise navigates to the concept-set editor. Use a clinical, descriptive name (e.g. 'Statins', 'Inhaled corticosteroids', 'Type 2 Diabetes diagnoses').",
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Concept set name (REQUIRED). Clinical and descriptive.' },
        description: { type: 'string', description: 'Optional one-line description' },
        items: { type: 'array', items: conceptRefSchema },
      },
      required: ['name', 'items'],
    },
    requiresApproval: true,
  },

  {
    name: 'navigate_to',
    description: 'Suggest moving the user to a different view in ATLAS. The user sees a 5s undo toast after the navigation is applied (no approval card). Always include a one-sentence `reason` so the toast is self-explanatory. Each `view` accepts a specific set of params — see the route manifest.',
    schema: {
      type: 'object',
      properties: {
        view: {
          type: 'string',
          enum: agentVisibleViews,
          description: 'Route name from the Atlas3 route manifest (resources/routes.manifest.json — generated by Atlas3/scripts/emit-route-manifest.mjs). Edit the manifest to add a new view.',
        },
        id: { type: 'number' },
        sourceKey: { type: 'string' },
        conceptId: { type: 'number' },
        personId: { type: 'number' },
        executionId: { type: 'number' },
        reason: { type: 'string', description: 'One short sentence; surfaced in the undo toast.' },
      },
      required: ['view'],
    },
    requiresApproval: true,
  },

  {
    name: 'add_inclusion_rule',
    description: 'Add an inclusion rule: a named group of criteria with AND/OR logic and optional cardinality (AT_LEAST/AT_MOST count) or temporal window. Prefer this over add_criteria when the model needs cardinality or temporal constraints.',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        logicType: { type: 'string', enum: ['ALL', 'ANY', 'AT_LEAST', 'AT_MOST'] },
        count: { type: 'number', description: 'Required for AT_LEAST and AT_MOST' },
        temporalWindow: temporalWindowSchema,
        events: { type: 'array', items: criterionSchema },
      },
      required: ['name', 'logicType', 'events'],
    },
    requiresApproval: true,
  },

  {
    name: 'create_feature_analysis',
    description: 'Persist a NEW feature analysis (covariate definition) on the server. The user sees an approval card; on accept, ATLAS navigates to the editor. `type` controls the design shape: PRESET (built-in OHDSI preset id as a string), CRITERIA_SET (JSON object with conceptSets + criteria), or CUSTOM_FE (raw SQL string). Pass `design` accordingly.',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Clinical, descriptive name. REQUIRED.' },
        description: { type: 'string' },
        type: {
          type: 'string', enum: ['PRESET', 'CRITERIA_SET', 'CUSTOM_FE'],
          description: 'PRESET for built-in feature library entries; CRITERIA_SET for custom criteria sets; CUSTOM_FE for raw SQL.',
        },
        domain: { type: 'string' },
        statType: { type: 'string', enum: ['PREVALENCE', 'DISTRIBUTION'] },
        design: { description: 'Type-dependent: string for PRESET/CUSTOM_FE; object for CRITERIA_SET.' },
      },
      required: ['name', 'type'],
    },
    requiresApproval: true,
  },

  {
    name: 'create_characterization',
    description: 'Persist a NEW cohort characterization on the server. REQUIRES at least one cohort and at least one feature analysis attached. Before calling this you MUST have called search_existing_cohorts and search_existing_feature_analyses to find the IDs. If neither result has matches, do NOT call this — instead, propose creating the missing prerequisite (cohort first, then feature analysis) and emit a navigate_to(view=\'cohort-new\' or \'feature-analysis-new\').',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Clinical, descriptive name. REQUIRED.' },
        description: { type: 'string' },
        cohorts: {
          type: 'array',
          description: 'REQUIRED. One or more cohorts to characterize. Each item is {id, name} pulled from search_existing_cohorts results.',
          items: idNameItem(true),
        },
        featureAnalyses: {
          type: 'array',
          description: 'REQUIRED. One or more feature analyses to apply. Each item is {id, name} pulled from search_existing_feature_analyses results.',
          items: idNameItem(false),
        },
      },
      required: ['name', 'cohorts', 'featureAnalyses'],
    },
    requiresApproval: true,
  },

  {
    name: 'create_pathway',
    description: 'Persist a NEW pathway analysis on the server. Only `name` is required; sensible OHDSI defaults are applied for the rest (combinationWindow=30, minCellCount=5, maxDepth=5, allowRepeats=false). Pass target/event cohort references when the user has named them.',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Clinical, descriptive name. REQUIRED.' },
        description: { type: 'string' },
        targetCohorts: { type: 'array', items: idNameItem(true) },
        eventCohorts: { type: 'array', items: idNameItem(true) },
        combinationWindow: { type: 'number', description: 'Days for collapsing concurrent events (default 30)' },
        minCellCount: { type: 'number', description: 'Minimum cell count to display (default 5)' },
        maxDepth: { type: 'number', description: 'Max pathway depth, 1-10 (default 5)' },
        allowRepeats: { type: 'boolean', description: 'Whether the same event can repeat in a pathway (default false)' },
      },
      required: ['name'],
    },
    requiresApproval: true,
  },

  {
    name: 'generate_analysis',
    description: 'Run a SAVED analysis against a data source, the same as clicking Generate in the editor. Use after the analysis exists (create_pathway / create_characterization / create_incidence_rate returned an id). Results appear in the editor when the job finishes. Omit sourceKey to use the source the user is currently working against.',
    schema: {
      type: 'object',
      properties: {
        analysisType: {
          type: 'string',
          enum: ['pathway', 'characterization', 'incidenceRate'],
          description: 'Which kind of analysis to run. REQUIRED.',
        },
        analysisId: { type: 'number', description: 'Saved analysis id. REQUIRED.' },
        sourceKey: { type: 'string', description: 'CDM source key, e.g. EUNOMIA. Defaults to the current source.' },
      },
      required: ['analysisType', 'analysisId'],
    },
    requiresApproval: true,
  },

  {
    name: 'update_concept_set',
    description: 'Apply a partial edit to an existing standalone concept set: rename, change description, append items, or replace items. Mutates the open editor; user clicks Save to persist. Use itemsToAdd to append (skips duplicate conceptIds), items to fully replace.',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Concept set id (REQUIRED).' },
        name: { type: 'string' },
        description: { type: 'string' },
        items: { type: 'array', items: conceptRefSchema, description: 'Full replace — overwrites the existing items array.' },
        itemsToAdd: { type: 'array', items: conceptRefSchema, description: 'Append-only — skips items whose conceptId already exists.' },
      },
      required: ['id'],
    },
    requiresApproval: true,
  },

  {
    name: 'update_feature_analysis',
    description: 'Apply a partial edit to an existing feature analysis: rename, change description, change type/domain/statType, or replace the design payload. Mutates the open editor; user clicks Save to persist.',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Feature analysis id (REQUIRED).' },
        name: { type: 'string' },
        description: { type: 'string' },
        type: { type: 'string', enum: ['PRESET', 'CRITERIA_SET', 'CUSTOM_FE'] },
        domain: { type: 'string' },
        statType: { type: 'string', enum: ['PREVALENCE', 'DISTRIBUTION'] },
        design: { description: 'Type-dependent: string for PRESET/CUSTOM_FE; object for CRITERIA_SET. Replaces the existing design entirely.' },
      },
      required: ['id'],
    },
    requiresApproval: true,
  },

  {
    name: 'update_characterization',
    description: 'Apply a partial edit to an existing characterization: rename, change description, replace or extend cohorts/featureAnalyses. Each cohort and feature-analysis ref is {id, name} from search_existing_* results.',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Characterization id (REQUIRED).' },
        name: { type: 'string' },
        description: { type: 'string' },
        cohorts: { type: 'array', items: idNameItem(true), description: 'Full replace.' },
        cohortsToAdd: { type: 'array', items: idNameItem(true), description: 'Append-only.' },
        featureAnalyses: { type: 'array', items: idNameItem(true), description: 'Full replace.' },
        featureAnalysesToAdd: { type: 'array', items: idNameItem(true), description: 'Append-only.' },
      },
      required: ['id'],
    },
    requiresApproval: true,
  },

  {
    name: 'update_pathway',
    description: 'Apply a partial edit to an existing pathway analysis: rename, change description, replace or extend target/event cohorts, tweak combinationWindow / minCellCount / maxDepth / allowRepeats.',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Pathway id (REQUIRED).' },
        name: { type: 'string' },
        description: { type: 'string' },
        targetCohorts: { type: 'array', items: idNameItem(true), description: 'Full replace.' },
        targetCohortsToAdd: { type: 'array', items: idNameItem(true), description: 'Append-only.' },
        eventCohorts: { type: 'array', items: idNameItem(true), description: 'Full replace.' },
        eventCohortsToAdd: { type: 'array', items: idNameItem(true), description: 'Append-only.' },
        combinationWindow: { type: 'number' },
        minCellCount: { type: 'number' },
        maxDepth: { type: 'number' },
        allowRepeats: { type: 'boolean' },
      },
      required: ['id'],
    },
    requiresApproval: true,
  },

  {
    name: 'update_incidence_rate',
    description: 'Apply a partial edit to an existing incidence-rate analysis: rename, change description, replace or extend target/outcome cohort ids, tweak timeAtRisk or studyWindow.',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Incidence-rate id (REQUIRED).' },
        name: { type: 'string' },
        description: { type: 'string' },
        targetIds: { type: 'array', items: { type: 'number' }, description: 'Full replace.' },
        targetIdsToAdd: { type: 'array', items: idNameItem(false), description: 'Append-only with optional display names.' },
        outcomeIds: { type: 'array', items: { type: 'number' }, description: 'Full replace.' },
        outcomeIdsToAdd: { type: 'array', items: idNameItem(false), description: 'Append-only with optional display names.' },
        timeAtRisk: {
          type: 'object',
          properties: {
            start: {
              type: 'object',
              properties: { DateField: { type: 'string', enum: ['StartDate', 'EndDate'] }, Offset: { type: 'number' } },
              required: ['DateField', 'Offset'],
            },
            end: {
              type: 'object',
              properties: { DateField: { type: 'string', enum: ['StartDate', 'EndDate'] }, Offset: { type: 'number' } },
              required: ['DateField', 'Offset'],
            },
          },
          required: ['start', 'end'],
        },
        studyWindow: { type: 'object', properties: { startDate: { type: 'string' }, endDate: { type: 'string' } } },
      },
      required: ['id'],
    },
    requiresApproval: true,
  },

  {
    name: 'create_incidence_rate',
    description: "Persist a NEW incidence-rate analysis on the server. Only `name` is required; the time-at-risk window defaults to {start: StartDate +0, end: EndDate +0} which means 'from cohort start to cohort end'. Provide a custom timeAtRisk when the user describes a specific risk window (e.g., '365 days after exposure' → start: StartDate +0, end: StartDate +365).",
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Clinical, descriptive name. REQUIRED.' },
        description: { type: 'string' },
        targetIds: { type: 'array', items: { type: 'number' }, description: 'Target cohort IDs (denominator)' },
        outcomeIds: { type: 'array', items: { type: 'number' }, description: 'Outcome cohort IDs (numerator)' },
        timeAtRisk: {
          type: 'object',
          properties: {
            start: {
              type: 'object',
              properties: { DateField: { type: 'string', enum: ['StartDate', 'EndDate'] }, Offset: { type: 'number', description: 'Days from the anchor date' } },
              required: ['DateField', 'Offset'],
            },
            end: {
              type: 'object',
              properties: { DateField: { type: 'string', enum: ['StartDate', 'EndDate'] }, Offset: { type: 'number' } },
              required: ['DateField', 'Offset'],
            },
          },
          required: ['start', 'end'],
        },
        studyWindow: {
          type: 'object',
          properties: {
            startDate: { type: 'string', description: 'ISO date YYYY-MM-DD' },
            endDate: { type: 'string', description: 'ISO date YYYY-MM-DD' },
          },
        },
      },
      required: ['name'],
    },
    requiresApproval: true,
  },

  {
    name: 'save_cohort',
    description: "Persist the CURRENTLY OPEN cohort to the WebAPI so it gets a stable id. Call this AFTER the user has accepted the cohort's entry event + criteria, and BEFORE creating any analysis (incidence rate / pathway / characterization) that must reference this cohort by id — analyses can only target SAVED cohorts. Returns the saved cohort id. Optional name/description override the open cohort's current values.",
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: "Optional clinical name to save under (defaults to the open cohort's name)." },
        description: { type: 'string', description: 'Optional description.' },
      },
    },
    requiresApproval: true,
  },
]

export function capabilityNames(): string[] {
  return CAPABILITIES.map(c => c.name)
}

export function getCapability(name: string): Capability | undefined {
  return CAPABILITIES.find(c => c.name === name)
}
