/**
 * reusable-catalog.ts
 *
 * Reusables imported into a cohort expression, the way concept sets are.
 *
 * Importing a reusable adds one entry to the expression's catalog
 * (`ReusableCriteria` for a single criterion, `ReusableCriteriaGroups` for a
 * criteria group). The entry holds the reusable's logic and concept sets as
 * they were at one version. Every place the reusable is used points at the
 * entry (`ReusableCriteriaRef` / `ReusableCriteriaGroupRef`, `{Id}`).
 *
 * circe 1.14 does not know the catalog or the pointers, so each use also
 * keeps the logic expanded inline, with the entry's concept sets merged into
 * the cohort's. That inline copy is derived: it is rebuilt from the entry
 * whenever the entry changes, so all uses of one reusable in a cohort always
 * hold the same logic. Once circe resolves the pointers itself, the inline
 * copy can go.
 */
import type {
  ConceptSet,
  Criteria,
  CriteriaGroup,
  ReusableCriteriaEntry,
  ReusableCriteriaGroupEntry,
  ReusableUse,
} from '@/models/circe-types'
import type { ReusableDesign } from '@/models/reusable.types'
import {
  canInsertByReference,
  createEmptyDesign,
  criteriaBody,
  instantiateReusable,
} from './reusable-design'
import type { ReusableSource } from './reusable-reference'

/** What a host expression keeps imported reusables in. A cohort expression is one. */
export interface ReusableCatalogRoot {
  ReusableCriteria?: ReusableCriteriaEntry[] | null
  ReusableCriteriaGroups?: ReusableCriteriaGroupEntry[] | null
}

/** A single criterion, or a criteria group. */
export type ReusableKind = 'criteria' | 'group'

type Entry = ReusableCriteriaEntry | ReusableCriteriaGroupEntry

const CATALOG_KEYS = new Set(['ReusableCriteria', 'ReusableCriteriaGroups'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/** The kind of entry a reusable is imported as. */
export function catalogKindFor(design: ReusableDesign): ReusableKind {
  return design.type === 'CRITERIA_GROUP' ? 'group' : 'criteria'
}

/**
 * Whether a reusable's design can be held by an entry of `kind`: a Criteria
 * Group reusable as a group, an Initial/Censoring Event reusable with a single
 * event as a criterion, neither with parameters.
 */
export function fitsKind(design: ReusableDesign, kind: ReusableKind): boolean {
  return canInsertByReference(design) && catalogKindFor(design) === kind
}

function entries(root: ReusableCatalogRoot, kind: ReusableKind): Entry[] {
  return (kind === 'group' ? root.ReusableCriteriaGroups : root.ReusableCriteria) ?? []
}

export function findEntry(
  root: ReusableCatalogRoot,
  kind: 'criteria',
  id: number
): ReusableCriteriaEntry | undefined
export function findEntry(
  root: ReusableCatalogRoot,
  kind: 'group',
  id: number
): ReusableCriteriaGroupEntry | undefined
export function findEntry(root: ReusableCatalogRoot, kind: ReusableKind, id: number): Entry | undefined
export function findEntry(root: ReusableCatalogRoot, kind: ReusableKind, id: number): Entry | undefined {
  return entries(root, kind).find(e => e.Id === id)
}

/** The entry already imported for a reusable, if any. */
export function findEntryForReusable(
  root: ReusableCatalogRoot,
  kind: ReusableKind,
  reusableId: number
): Entry | undefined {
  return entries(root, kind).find(e => e.RefId === reusableId)
}

function setEntryContent(entry: Entry, kind: ReusableKind, design: ReusableDesign, source: ReusableSource) {
  entry.RefId = source.Id
  entry.Version = source.Version ?? null
  entry.Name = source.Name ?? null
  entry.ConceptSets = clone(design.conceptSets)
  if (kind === 'group') {
    const group = entry as ReusableCriteriaGroupEntry
    group.CriteriaGroup = clone(design.criteriaGroupExpression)
  } else {
    const criteria = entry as ReusableCriteriaEntry
    criteria.Criteria = clone(design.initialEventExpression.CriteriaList?.[0] ?? {})
  }
}

/**
 * Imports a reusable into `root`, or returns the entry it already has. A
 * cohort holds one entry per reusable, so a second use of the same reusable
 * shares the first one's entry (and version) instead of adding its own.
 */
export function importReusable(
  root: ReusableCatalogRoot,
  design: ReusableDesign,
  source: ReusableSource
): { kind: ReusableKind; entry: Entry } {
  const kind = catalogKindFor(design)
  const existing = findEntryForReusable(root, kind, source.Id)
  if (existing) return { kind, entry: existing }

  const list =
    kind === 'group'
      ? (root.ReusableCriteriaGroups ??= [])
      : (root.ReusableCriteria ??= [])
  const id = [...(root.ReusableCriteria ?? []), ...(root.ReusableCriteriaGroups ?? [])].reduce(
    (max, e) => Math.max(max, e.Id),
    0
  ) + 1
  const entry = { Id: id } as Entry
  setEntryContent(entry, kind, design, source)
  ;(list as Entry[]).push(entry)
  return { kind, entry }
}

function entryAsDesign(entry: Entry, kind: ReusableKind): ReusableDesign {
  if (kind === 'group') {
    return {
      ...createEmptyDesign('CRITERIA_GROUP'),
      conceptSets: entry.ConceptSets ?? [],
      criteriaGroupExpression: (entry as ReusableCriteriaGroupEntry).CriteriaGroup,
    }
  }
  const design = createEmptyDesign('INITIAL_EVENT')
  design.conceptSets = entry.ConceptSets ?? []
  design.initialEventExpression.CriteriaList = [(entry as ReusableCriteriaEntry).Criteria]
  return design
}

export interface MaterializedUse {
  /** Concept sets the host must add before the logic is placed. */
  conceptSets: ConceptSet[]
  /** For a criteria entry: the criterion, pointing at its entry. */
  criteria?: Criteria
  /** For a group entry: the group, pointing at its entry. */
  criteriaGroup?: CriteriaGroup
}

/**
 * The inline copy of an entry for a host: its logic with the entry's concept
 * sets renumbered into the host's, reusing host concept sets that are
 * identical, and marked as a use of the entry.
 */
export function materialize(
  entry: Entry,
  kind: ReusableKind,
  hostConceptSets: readonly ConceptSet[]
): MaterializedUse {
  const instance = instantiateReusable(entryAsDesign(entry, kind), hostConceptSets, {}, {
    reuseIdenticalConceptSets: true,
  })
  if (kind === 'group') {
    const group = instance.criteriaGroup as CriteriaGroup
    group.ReusableCriteriaGroupRef = { Id: entry.Id }
    return { conceptSets: instance.conceptSets, criteriaGroup: group }
  }
  const criteria = instance.criteriaList?.[0] ?? {}
  const body = criteriaBody(criteria)
  if (body) body.ReusableCriteriaRef = { Id: entry.Id }
  return { conceptSets: instance.conceptSets, criteria }
}

/** The entry a criterion is a use of, if it is one. */
export function getCriteriaUse(criteria: Criteria): ReusableUse | undefined {
  const use = criteriaBody(criteria)?.ReusableCriteriaRef
  return isRecord(use) && typeof use.Id === 'number' ? (use as ReusableUse) : undefined
}

/** The entry a group is a use of, if it is one. */
export function getGroupUse(group: CriteriaGroup): ReusableUse | undefined {
  const use = group.ReusableCriteriaGroupRef
  return isRecord(use) && typeof use.Id === 'number' ? use : undefined
}

function isUseOf(node: Record<string, unknown>, kind: ReusableKind, id: number): boolean {
  if (kind === 'group') return getGroupUse(node as CriteriaGroup)?.Id === id
  // A criterion is a single-key wrapper around its domain object.
  return Object.keys(node).length === 1 && getCriteriaUse(node)?.Id === id
}

/**
 * Every use of an entry in `root`: the criterion wrappers (`{ConditionOccurrence:
 * {...}}`) or criteria groups that point at it. The catalog itself is skipped,
 * so a reusable's own logic is never mistaken for a use.
 */
export function findUses(
  root: ReusableCatalogRoot,
  kind: ReusableKind,
  id: number
): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = []
  const visit = (node: unknown, isRoot: boolean) => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item, false)
      return
    }
    if (!isRecord(node)) return
    if (!isRoot && isUseOf(node, kind, id)) {
      found.push(node)
      // A use's own logic is the entry's, so nothing inside it is another use.
      return
    }
    for (const [key, value] of Object.entries(node)) {
      if (isRoot && CATALOG_KEYS.has(key)) continue
      visit(value, false)
    }
  }
  visit(root, true)
  return found
}

/**
 * Replaces an object's contents in place, so the parent list keeps holding the
 * same object (and Vue keeps the same component for it).
 */
function replaceContents(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const key of Object.keys(target)) delete target[key]
  Object.assign(target, source)
}

/**
 * Rebuilds every use of an entry from the entry. The concept sets it needs
 * are added once, through `addConceptSet`, before the uses are rewritten.
 */
export function rematerializeUses(
  root: ReusableCatalogRoot,
  kind: ReusableKind,
  entry: Entry,
  host: { getConceptSets: () => ConceptSet[]; addConceptSet: (cs: ConceptSet) => void }
): number {
  const uses = findUses(root, kind, entry.Id)
  if (uses.length === 0) return 0
  const materialized = materialize(entry, kind, host.getConceptSets())
  for (const conceptSet of materialized.conceptSets) host.addConceptSet(conceptSet)
  const logic = (kind === 'group' ? materialized.criteriaGroup : materialized.criteria) as Record<
    string,
    unknown
  >
  for (const use of uses) replaceContents(use, clone(logic))
  return uses.length
}

/**
 * Moves an entry to another version of its reusable and rebuilds every use of
 * it, so the whole cohort moves together.
 */
export function updateEntry(
  root: ReusableCatalogRoot,
  kind: ReusableKind,
  entry: Entry,
  design: ReusableDesign,
  source: ReusableSource,
  host: { getConceptSets: () => ConceptSet[]; addConceptSet: (cs: ConceptSet) => void }
): number {
  setEntryContent(entry, kind, design, source)
  return rematerializeUses(root, kind, entry, host)
}

/** Turns one use into a plain copy; its logic is unchanged. */
export function detachUse(target: Criteria | CriteriaGroup, kind: ReusableKind): void {
  if (kind === 'group') {
    delete (target as CriteriaGroup).ReusableCriteriaGroupRef
    return
  }
  const body = criteriaBody(target as Criteria)
  if (body) delete body.ReusableCriteriaRef
}

/** Drops entries nothing uses any more. Returns how many were dropped. */
export function pruneCatalog(root: ReusableCatalogRoot): number {
  let dropped = 0
  // Only touch a list that changes, so pruning a clean catalog does not mark
  // the expression as edited.
  const prune = (key: 'ReusableCriteria' | 'ReusableCriteriaGroups', kind: ReusableKind) => {
    const list = root[key] as Entry[] | null | undefined
    if (!list) return
    const kept = list.filter(entry => findUses(root, kind, entry.Id).length > 0)
    if (kept.length === list.length) return
    dropped += list.length - kept.length
    if (kept.length === 0) delete root[key]
    else (root as Record<string, unknown>)[key] = kept
  }
  prune('ReusableCriteria', 'criteria')
  prune('ReusableCriteriaGroups', 'group')
  return dropped
}

/**
 * Turns every use in `root` into a plain copy and empties the catalog. The
 * logic stays as it is. Returns how many uses were detached.
 */
export function detachAll(root: ReusableCatalogRoot): number {
  let detached = 0
  const visit = (node: unknown, isRoot: boolean) => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item, false)
      return
    }
    if (!isRecord(node)) return
    if ('ReusableCriteriaGroupRef' in node) {
      delete node.ReusableCriteriaGroupRef
      detached++
    }
    if ('ReusableCriteriaRef' in node) {
      delete node.ReusableCriteriaRef
      detached++
    }
    for (const [key, value] of Object.entries(node)) {
      if (isRoot && CATALOG_KEYS.has(key)) continue
      visit(value, false)
    }
  }
  visit(root, true)
  delete root.ReusableCriteria
  delete root.ReusableCriteriaGroups
  return detached
}
