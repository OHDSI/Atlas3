/**
 * Logger Utility
 *
 * Provides conditional logging based on environment.
 * In production, only errors are logged (unless explicitly enabled).
 * In development, all log levels are available.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LoggerConfig {
  level: LogLevel
  enableInProd: boolean
}

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
}

const config: LoggerConfig = {
  level: import.meta.env.DEV ? 'debug' : 'warn',
  enableInProd: false
}

/**
 * Check if a log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  if (!config.enableInProd && import.meta.env.PROD) {
    return level === 'error'
  }
  return levels[level] >= levels[config.level]
}

/**
 * Format log message with tag
 */
function formatMessage(tag: string, message: string): string {
  return `[${tag}] ${message}`
}

/**
 * Logger instance with tag-based logging
 */
export const logger = {
  /**
   * Debug level logging (development only)
   * @param tag Component/module identifier (e.g., 'Auth', 'CohortStore')
   * @param message Log message
   * @param data Optional data to log
   */
  debug(tag: string, message: string, data?: unknown): void {
    if (shouldLog('debug')) {
      if (data !== undefined) {
        console.log(formatMessage(tag, message), data)
      } else {
        console.log(formatMessage(tag, message))
      }
    }
  },

  /**
   * Info level logging
   * @param tag Component/module identifier
   * @param message Log message
   * @param data Optional data to log
   */
  info(tag: string, message: string, data?: unknown): void {
    if (shouldLog('info')) {
      if (data !== undefined) {
        console.log(formatMessage(tag, message), data)
      } else {
        console.log(formatMessage(tag, message))
      }
    }
  },

  /**
   * Warning level logging
   * @param tag Component/module identifier
   * @param message Log message
   * @param data Optional data to log
   */
  warn(tag: string, message: string, data?: unknown): void {
    if (shouldLog('warn')) {
      if (data !== undefined) {
        console.warn(formatMessage(tag, message), data)
      } else {
        console.warn(formatMessage(tag, message))
      }
    }
  },

  /**
   * Error level logging (always logged)
   * @param tag Component/module identifier
   * @param message Log message
   * @param error Optional error object
   */
  error(tag: string, message: string, error?: unknown): void {
    if (shouldLog('error')) {
      if (error !== undefined) {
        console.error(formatMessage(tag, message), error)
      } else {
        console.error(formatMessage(tag, message))
      }
    }
  },

  /**
   * Set the minimum log level
   * @param level Minimum level to log
   */
  setLevel(level: LogLevel): void {
    config.level = level
  },

  /**
   * Enable or disable logging in production
   * @param enable Whether to enable logging in production
   */
  setEnableInProd(enable: boolean): void {
    config.enableInProd = enable
  }
}

export default logger
