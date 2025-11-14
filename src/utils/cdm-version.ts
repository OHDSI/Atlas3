/**
 * CDM Version Validation Utility
 * US5: T073-T082
 *
 * Validates CDM version constraints using semantic versioning
 */

/**
 * Parse a semantic version string into major, minor, patch
 */
function parseVersion(version: string): { major: number; minor: number; patch: number } | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/)
  if (!match) {
    return null
  }
  return {
    major: parseInt(match[1] || '0', 10),
    minor: parseInt(match[2] || '0', 10),
    patch: parseInt(match[3] || '0', 10),
  }
}

/**
 * Compare two semantic versions
 * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
function compareVersions(v1: string, v2: string): number {
  const ver1 = parseVersion(v1)
  const ver2 = parseVersion(v2)

  if (!ver1 || !ver2) {
    return 0 // Unable to compare
  }

  if (ver1.major !== ver2.major) {
    return ver1.major - ver2.major
  }
  if (ver1.minor !== ver2.minor) {
    return ver1.minor - ver2.minor
  }
  return ver1.patch - ver2.patch
}

/**
 * Validate a CDM version against a constraint
 *
 * @param currentVersion - The current CDM version (e.g., "5.3.1")
 * @param constraint - The version constraint (e.g., ">=5.0.0", ">=5.0.0 <6.0.0")
 * @returns true if the version satisfies the constraint, false otherwise
 *
 * Supported operators:
 * - >= : Greater than or equal
 * - > : Greater than
 * - <= : Less than or equal
 * - < : Less than
 * - = : Equal
 *
 * Examples:
 * - validateCdmVersion("5.3.1", ">=5.0.0") => true
 * - validateCdmVersion("5.3.1", ">=5.0.0 <6.0.0") => true
 * - validateCdmVersion("4.5.0", ">=5.0.0") => false
 * - validateCdmVersion("6.0.0", ">=5.0.0 <6.0.0") => false
 */
export function validateCdmVersion(currentVersion: string, constraint: string): boolean {
  // Check if current version can be parsed
  const currentParsed = parseVersion(currentVersion)
  if (!currentParsed) {
    return false // Cannot validate malformed version
  }

  // Split constraint by space to handle multiple conditions (e.g., ">=5.0.0 <6.0.0")
  const conditions = constraint.trim().split(/\s+/)

  for (const condition of conditions) {
    // Parse operator and version from condition
    const match = condition.match(/^(>=|>|<=|<|=)(.+)$/)
    if (!match) {
      continue // Skip invalid conditions
    }

    const operator = match[1]
    const constraintVersion = match[2]

    const comparison = compareVersions(currentVersion, constraintVersion || '')

    // Check if the condition is satisfied
    let satisfied = false
    switch (operator) {
      case '>=':
        satisfied = comparison >= 0
        break
      case '>':
        satisfied = comparison > 0
        break
      case '<=':
        satisfied = comparison <= 0
        break
      case '<':
        satisfied = comparison < 0
        break
      case '=':
        satisfied = comparison === 0
        break
    }

    // All conditions must be satisfied (AND logic)
    if (!satisfied) {
      return false
    }
  }

  return true
}

/**
 * Get the minimum CDM version from a constraint
 * Useful for displaying version requirements
 *
 * @param constraint - The version constraint (e.g., ">=5.0.0")
 * @returns The minimum version string, or null if not determinable
 */
export function getMinimumVersion(constraint: string): string | null {
  const match = constraint.match(/>=?(\d+\.\d+\.\d+)/)
  return match ? (match[1] || null) : null
}
