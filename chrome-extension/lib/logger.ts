/**
 * Logger Service
 *
 * Centralized logging system with different levels and Sentry preparation
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

export interface LogContext {
  [key: string]: any;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: LogContext;
  error?: Error;
  userId?: string;
  sessionId?: string;
}

class Logger {
  private sessionId: string;
  private userId?: string;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.loadUserId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async loadUserId() {
    try {
      const result = await chrome.storage.local.get(['apiKey']);
      if (result.apiKey) {
        // Extract user info from API key or make API call
        this.userId = 'user_from_token'; // TODO: Get actual user ID
      }
    } catch (error) {
      // Silently fail
    }
  }

  private createEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date(),
      context,
      error,
      userId: this.userId,
      sessionId: this.sessionId
    };
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);

    // Keep only last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Send to Sentry if configured
    this.sendToSentry(entry);
  }

  private sendToSentry(entry: LogEntry) {
    // TODO: Integrate with Sentry
    // For now, just console log in development
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = entry.level === 'error' || entry.level === 'fatal'
        ? console.error
        : entry.level === 'warn'
        ? console.warn
        : console.log;

      consoleMethod(
        `[${entry.level.toUpperCase()}] ${entry.message}`,
        entry.context,
        entry.error
      );
    }

    // In production, would send to Sentry:
    // if (entry.level === 'error' || entry.level === 'fatal') {
    //   Sentry.captureException(entry.error || new Error(entry.message), {
    //     level: entry.level,
    //     contexts: { custom: entry.context },
    //     tags: { userId: entry.userId, sessionId: entry.sessionId }
    //   });
    // }
  }

  debug(message: string, context?: LogContext) {
    const entry = this.createEntry(LogLevel.DEBUG, message, context);
    this.addLog(entry);
  }

  info(message: string, context?: LogContext) {
    const entry = this.createEntry(LogLevel.INFO, message, context);
    this.addLog(entry);
  }

  warn(message: string, context?: LogContext) {
    const entry = this.createEntry(LogLevel.WARN, message, context);
    this.addLog(entry);
  }

  error(message: string, error?: Error, context?: LogContext) {
    const entry = this.createEntry(LogLevel.ERROR, message, context, error);
    this.addLog(entry);
  }

  fatal(message: string, error?: Error, context?: LogContext) {
    const entry = this.createEntry(LogLevel.FATAL, message, context, error);
    this.addLog(entry);
  }

  /**
   * Get recent logs (useful for debugging or support)
   */
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Export logs as JSON (for support tickets)
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
  }
}

// Singleton instance
export const logger = new Logger();

// Convenience exports
export const logDebug = (message: string, context?: LogContext) => logger.debug(message, context);
export const logInfo = (message: string, context?: LogContext) => logger.info(message, context);
export const logWarn = (message: string, context?: LogContext) => logger.warn(message, context);
export const logError = (message: string, error?: Error, context?: LogContext) => logger.error(message, error, context);
export const logFatal = (message: string, error?: Error, context?: LogContext) => logger.fatal(message, error, context);
