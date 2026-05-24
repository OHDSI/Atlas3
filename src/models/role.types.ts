/**
 * Type definitions and Zod schemas for Role and Permissions Management
 *
 * Entities: Role, Permission, User
 * Based on: specs/001-role-permissions-management/data-model.md
 */

import { z } from 'zod'

// ============================================================================
// Role Types
// ============================================================================

/**
 * Raw Role Schema - transforms API response to normalized Role type
 */
export const RawRoleSchema = z
  .object({
    id: z.number().int(),
    role: z.string().min(1).max(255).optional(),
    name: z.string().min(1).max(255).optional(),
    roleName: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).optional().nullable(),
    createdDate: z.string().optional().nullable(),
    modifiedDate: z.string().optional().nullable(),
    createdBy: z.any().optional(),
    modifiedBy: z.any().optional(),
    defaultImported: z.boolean().optional(),
    systemRole: z.boolean().optional(),
  })
  .passthrough()
  .transform(data => ({
    id: data.id,
    name: data.role || data.name || data.roleName || '',
    description: data.description || null,
    createdDate: data.createdDate || null,
    modifiedDate: data.modifiedDate || null,
  }))

/**
 * Role Schema
 * Represents a named group with specific permissions
 */
export const RoleSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
  createdDate: z.string().optional().nullable(),
  modifiedDate: z.string().optional().nullable(),
})

export type Role = z.infer<typeof RoleSchema>

export const RoleListSchema = z.array(RawRoleSchema)

/**
 * Role creation payload (no ID required)
 */
export const RoleCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
})

export type RoleCreate = z.infer<typeof RoleCreateSchema>

/**
 * Role update payload
 * At least one field must be provided
 */
export const RoleUpdateSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(1000).optional(),
  })
  .refine(data => data.name !== undefined || data.description !== undefined, {
    message: 'At least one field (name or description) must be provided',
  })

export type RoleUpdate = z.infer<typeof RoleUpdateSchema>

// ============================================================================
// Permission Types
// ============================================================================

/**
 * Permission String Schema
 * Apache Shiro format: resource:instance:action
 * Example: "cohortdefinition:*:get"
 */
const PermissionStringSchema = z.string().min(1)

/**
 * Permission Schema
 * Represents a specific capability or access right
 */
export const PermissionSchema = z
  .object({
    id: z.number().int().positive(),
    permission: PermissionStringSchema.optional().nullable(),
    value: PermissionStringSchema.optional().nullable(), // Alternative field name
    description: z.string().max(500).optional().nullable(),
    category: z.string().max(100).optional().nullable(),
  })
  .passthrough() // Allow additional fields from API

export type Permission = z.infer<typeof PermissionSchema>

export const PermissionListSchema = z.array(PermissionSchema)

// ============================================================================
// User Types
// ============================================================================

/**
 * User Schema
 * Represents a person who uses the system
 */
// WebAPI uses id = -1 for the built-in "anonymous" pseudo-user, so the
// id must allow non-positive ints. Without this, the entire user list
// fails zod validation and the permissions UI renders empty.
export const UserSchema = z
  .object({
    id: z.number().int(),
    login: z.string().min(1).max(255),
    name: z.string().max(255).optional().nullable(),
    displayName: z.string().max(255).optional().nullable(),
    email: z.string().optional().nullable(),
  })
  .passthrough()

export type User = z.infer<typeof UserSchema>

export const UserListSchema = z.array(UserSchema)

// ============================================================================
// Assignment Types
// ============================================================================

/**
 * Role-Permission Assignment
 */
export const RolePermissionAssignmentSchema = z.object({
  roleId: z.number().int().positive(),
  permissionId: z.number().int().positive(),
})

export type RolePermissionAssignment = z.infer<typeof RolePermissionAssignmentSchema>

/**
 * Role-User Assignment
 */
export const RoleUserAssignmentSchema = z.object({
  roleId: z.number().int().positive(),
  userId: z.number().int().positive(),
})

export type RoleUserAssignment = z.infer<typeof RoleUserAssignmentSchema>

// ============================================================================
// API Result Types
// ============================================================================

/**
 * API Result type for consistent error handling
 * Follows existing Atlas3 pattern from src/services/webapi.ts
 */
export type ApiResult<T> = { isSuccess: true; data: T } | { isSuccess: false; message: string }

/**
 * Helper to create success result
 */
export const success = <T>(data: T): ApiResult<T> => ({
  isSuccess: true,
  data,
})

/**
 * Helper to create failure result
 */
export const failure = (message: string): ApiResult<never> => ({
  isSuccess: false,
  message,
})

// ============================================================================
// Import/Export Types
// ============================================================================

/**
 * Role Export Format
 * Compatible with Atlas 2.x role export format
 */
export const RoleExportSchema = z.object({
  role: z.object({
    name: z.string(),
    description: z.string().optional(),
    permissions: z.array(
      z.object({
        id: z.number().optional(),
        permission: PermissionStringSchema,
        description: z.string().optional(),
      })
    ),
    users: z.array(
      z.object({
        id: z.number().optional(),
        login: z.string(),
        name: z.string().optional(),
      })
    ),
  }),
})

export type RoleExport = z.infer<typeof RoleExportSchema>
