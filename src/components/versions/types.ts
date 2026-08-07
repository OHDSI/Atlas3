import type { Ref } from 'vue'

/**
 * User who created a version
 */
export interface User {
  /** Unique user identifier */
  id: number
  /** Display name */
  name: string
  /** Optional email address */
  email?: string
}

/**
 * Version metadata for a historical snapshot of an asset
 */
export interface Version {
  /** Version number (auto-incremented by backend) */
  version: number
  /** ID of the parent asset (cohort definition or concept set) */
  assetId: number
  /** User who created this version (optional - may not be returned by all endpoints) */
  createdBy?: User
  /** ISO 8601 timestamp or Unix timestamp (milliseconds) when version was created */
  createdDate: string | number
  /** Optional user-provided comment describing this version */
  comment?: string | null
  /** Whether this version has been archived (soft delete) */
  archived: boolean
}

/**
 * Container for version data retrieved when previewing a specific version
 */
export interface VersionedAsset<T> {
  /** Version metadata */
  versionDTO: Version
  /** The asset data as it existed in this version */
  entityDTO: T
}

/**
 * Enhanced version object for display in the versions table
 */
export interface VersionsTableItem extends Omit<Version, 'createdBy' | 'createdDate' | 'comment'> {
  /** User who created this version (required for display) */
  createdBy: User
  /** ISO 8601 timestamp when version was created (normalized) */
  createdDate: string
  /** Optional user-provided comment */
  comment: string | null
  /** Display label for version column ('Current' or version number) */
  displayVersion: string | number
  /** Whether this is the current working version */
  isCurrent: boolean
  /** Whether this version is being previewed */
  isPreviewing: boolean
  /** Formatted creation date for display */
  formattedDate: string
}

/**
 * Configuration object passed to VersionsTable component via props
 */
export interface VersionsConfig {
  /** Asset type: cohort definition, concept set, pathway analysis, or incidence rate */
  assetType: 'cohortdefinition' | 'conceptset' | 'pathway-analysis' | 'ir'
  /** Asset ID */
  assetId: number
  /** Getter for current version data */
  currentVersion: () => VersionsTableItem
  /** Reactive reference to preview version (if any) */
  previewVersion: Ref<Version | null>
  /** Whether user can edit (affects comment editing visibility) */
  canEdit: Ref<boolean>
  /** Whether asset has unsaved changes (affects navigation warnings) */
  isDirty: Ref<boolean>
  /** Optional callback to clear preview state */
  clearPreview?: () => void
}

/**
 * Route path segment for each asset type's version-preview route
 * (/<segment>/:id/version/:version). assetType doesn't always match the URL
 * segment (e.g. 'ir' routes live under /incidence-rates/...) - kept
 * explicit and typed as a Record so a *missing* entry fails type-checking;
 * a *wrong* segment value still only fails at runtime (or in
 * tests/unit/router/versions-navigation.spec.ts, which resolves every entry
 * against the real route table).
 */
export const ASSET_ROUTE_SEGMENT: Record<VersionsConfig['assetType'], string> = {
  cohortdefinition: 'cohortdefinition',
  conceptset: 'conceptset',
  'pathway-analysis': 'pathway-analysis',
  ir: 'incidence-rates',
}

/**
 * Route path segment for the plain "view this asset" route
 * (/<segment>/:id), used to navigate to a newly-copied asset. This is a
 * *different* segment than ASSET_ROUTE_SEGMENT for cohortdefinition and
 * pathway-analysis (e.g. cohorts live at /cohorts/:id, not
 * /cohortdefinition/:id - that path is version-preview-only).
 *
 * Concept sets have no id-addressable route at all: ConceptSetEditor opens
 * via conceptSetsStore state (editorOpen/currentSet), not a URL param, so
 * there is intentionally no 'conceptset' entry here - pushing to any URL
 * for it would be a dead link regardless of which segment was chosen.
 */
export const ASSET_DETAIL_ROUTE_SEGMENT: Partial<Record<VersionsConfig['assetType'], string>> = {
  cohortdefinition: 'cohorts',
  'pathway-analysis': 'pathways',
  ir: 'incidence-rates',
}

/**
 * Request payload for updating version comment
 */
export interface CommentUpdatePayload {
  /** Updated comment text */
  comment: string
  /** Archived flag (always false for comment-only updates) */
  archived: boolean
}
