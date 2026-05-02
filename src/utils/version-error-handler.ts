/**
 * Version Management Error Handler
 * T068: Centralized error handling for all version operations
 */
import { logger } from '@/utils/logger'

export interface VersionError {
  code: string
  message: string
  userMessage: string
  severity: 'error' | 'warning' | 'info'
  retry?: boolean
}

/**
 * Map of error codes to user-friendly messages
 */
const ERROR_MESSAGES: Record<string, Partial<VersionError>> = {
  VERSION_NOT_FOUND: {
    code: 'VERSION_NOT_FOUND',
    userMessage: 'This version could not be found. It may have been deleted.',
    severity: 'error',
    retry: false,
  },
  VERSION_LOAD_FAILED: {
    code: 'VERSION_LOAD_FAILED',
    userMessage: 'Unable to load version history. Please try again later.',
    severity: 'error',
    retry: true,
  },
  VERSION_PREVIEW_FAILED: {
    code: 'VERSION_PREVIEW_FAILED',
    userMessage: 'Unable to load version preview. Please try again.',
    severity: 'error',
    retry: true,
  },
  COMMENT_SAVE_FAILED: {
    code: 'COMMENT_SAVE_FAILED',
    userMessage: 'Failed to save comment. Please try again.',
    severity: 'error',
    retry: true,
  },
  COPY_VERSION_FAILED: {
    code: 'COPY_VERSION_FAILED',
    userMessage: 'Failed to create copy. Please try again.',
    severity: 'error',
    retry: true,
  },
  SAVE_AS_CURRENT_FAILED: {
    code: 'SAVE_AS_CURRENT_FAILED',
    userMessage: 'Failed to save version as current. Please try again.',
    severity: 'error',
    retry: true,
  },
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    userMessage: 'Network error. Please check your connection and try again.',
    severity: 'error',
    retry: true,
  },
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    userMessage: 'You do not have permission to perform this action.',
    severity: 'error',
    retry: false,
  },
  SERVER_ERROR: {
    code: 'SERVER_ERROR',
    userMessage: 'Server error. Please try again later.',
    severity: 'error',
    retry: true,
  },
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    userMessage: 'Validation failed. Please check your input.',
    severity: 'warning',
    retry: false,
  },
}

/**
 * Handle version-related errors and convert to user-friendly format
 * T068: User-friendly error messages
 */
export function handleVersionError(error: unknown, context?: string): VersionError {
  // Default error
  let versionError: VersionError = {
    code: 'UNKNOWN_ERROR',
    message: error instanceof Error ? error.message : 'Unknown error occurred',
    userMessage: 'An unexpected error occurred. Please try again.',
    severity: 'error',
    retry: true,
  }

  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes('404')) {
      versionError = {
        ...versionError,
        ...ERROR_MESSAGES.VERSION_NOT_FOUND,
        message: error.message,
      }
    } else if (error.message.includes('401') || error.message.includes('403')) {
      versionError = {
        ...versionError,
        ...ERROR_MESSAGES.UNAUTHORIZED,
        message: error.message,
      }
    } else if (error.message.includes('500') || error.message.includes('503')) {
      versionError = {
        ...versionError,
        ...ERROR_MESSAGES.SERVER_ERROR,
        message: error.message,
      }
    } else if (error.message.toLowerCase().includes('network')) {
      versionError = {
        ...versionError,
        ...ERROR_MESSAGES.NETWORK_ERROR,
        message: error.message,
      }
    } else if (error.message.toLowerCase().includes('validation')) {
      versionError = {
        ...versionError,
        ...ERROR_MESSAGES.VALIDATION_ERROR,
        message: error.message,
      }
    } else if (context) {
      // Use context-specific error
      const contextError = ERROR_MESSAGES[context]
      if (contextError) {
        versionError = {
          ...versionError,
          ...contextError,
          message: error.message,
        }
      }
    }
  }

  // Log error for debugging
  logger.error('VersionError', versionError.message, {
    code: versionError.code,
    context,
    originalError: error,
  })

  return versionError
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: VersionError): boolean {
  return error.retry === true
}

/**
 * Get user-friendly error message with i18n support
 */
export function getErrorMessage(error: VersionError, t?: (key: string) => string): string {
  if (t) {
    // Try to get translated message
    const translationKey = `versions.errors.${error.code}`
    const translated = t(translationKey)
    if (translated !== translationKey) {
      return translated
    }
  }

  return error.userMessage
}

/**
 * T069: Handle missing version edge case
 */
export function handleMissingVersion(versionNumber: number, assetId: number): VersionError {
  logger.warn('VersionError', `Version ${versionNumber} not found for asset ${assetId}`)

  return {
    code: 'VERSION_NOT_FOUND',
    message: `Version ${versionNumber} not found`,
    userMessage: `Version ${versionNumber} could not be found. It may have been deleted by another user.`,
    severity: 'error',
    retry: false,
  }
}

/**
 * Error recovery suggestions
 */
export function getRecoverySuggestion(error: VersionError): string[] {
  const suggestions: string[] = []

  switch (error.code) {
    case 'VERSION_NOT_FOUND':
      suggestions.push('Refresh the version list to see the latest versions')
      suggestions.push('Contact your administrator if the version should exist')
      break

    case 'NETWORK_ERROR':
      suggestions.push('Check your internet connection')
      suggestions.push('Try again in a few moments')
      break

    case 'UNAUTHORIZED':
      suggestions.push('Verify you have edit permissions for this asset')
      suggestions.push('Contact your administrator for access')
      break

    case 'SERVER_ERROR':
      suggestions.push('Wait a few minutes and try again')
      suggestions.push('Contact support if the problem persists')
      break

    case 'VALIDATION_ERROR':
      suggestions.push('Check that your comment is 500 characters or less')
      suggestions.push('Ensure all required fields are filled')
      break

    default:
      if (error.retry) {
        suggestions.push('Try again')
      }
      suggestions.push('Refresh the page if the problem persists')
  }

  return suggestions
}
