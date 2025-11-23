/**
 * Version Management Components
 * Centralized exports for all version-related components and types
 */

// Components
export { default as VersionsTable } from './VersionsTable.vue'
export { default as VersionCommentDialog } from './VersionCommentDialog.vue'
export { default as VersionsTabContent } from './VersionsTabContent.vue'

// Types
export type {
  User,
  Version,
  VersionedAsset,
  VersionsTableItem,
  VersionsConfig,
  CommentUpdatePayload,
} from './types'

// Schemas
export {
  userSchema,
  versionSchema,
  versionArraySchema,
  versionedAssetSchema,
  commentUpdateSchema,
} from './schemas'
