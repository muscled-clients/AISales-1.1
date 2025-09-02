/**
 * Production-safe logging utility
 * Only logs in development mode, silent in production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: Date;
  source?: string;
}

class Logger {
  private isDevelopment: boolean;
  private isElectron: boolean;
  private logHistory: LogEntry[] = [];
  private maxHistorySize = 1000;

  constructor() {
    // Check if we're in development mode
    this.isDevelopment = process.env.NODE_ENV === 'development' || 
                         process.env.ELECTRON_IS_DEV === 'true';
    
    // Check if we're in Electron environment
    this.isElectron = typeof window !== 'undefined' && 
                      window.electronAPI !== undefined;
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, data?: any, source?: string): void {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date(),
      source
    };

    // Store in history for debugging (limited size)
    this.addToHistory(entry);

    // Only output to console in development
    if (this.isDevelopment) {
      const prefix = source ? `[${source}]` : '';
      const formattedMessage = `${prefix} ${message}`;

      switch (level) {
        case 'debug':
          console.log(formattedMessage, data || '');
          break;
        case 'info':
          console.info(formattedMessage, data || '');
          break;
        case 'warn':
          console.warn(formattedMessage, data || '');
          break;
        case 'error':
          console.error(formattedMessage, data || '');
          break;
      }
    }

    // In production, could send to external logging service
    if (!this.isDevelopment && level === 'error') {
      // TODO: Send to Sentry or other error tracking service
      this.sendToErrorTracking(entry);
    }
  }

  /**
   * Add entry to history buffer
   */
  private addToHistory(entry: LogEntry): void {
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
  }

  /**
   * Send errors to external tracking service (placeholder)
   */
  private sendToErrorTracking(entry: LogEntry): void {
    // TODO: Implement Sentry or similar service
    // For now, just store locally
    if (this.isElectron && window.electronAPI) {
      // Could send to main process for logging
    }
  }

  /**
   * Public logging methods
   */
  debug(message: string, data?: any, source?: string): void {
    this.log('debug', message, data, source);
  }

  info(message: string, data?: any, source?: string): void {
    this.log('info', message, data, source);
  }

  warn(message: string, data?: any, source?: string): void {
    this.log('warn', message, data, source);
  }

  error(message: string, data?: any, source?: string): void {
    this.log('error', message, data, source);
  }

  /**
   * Get log history (useful for debugging)
   */
  getHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  /**
   * Clear log history
   */
  clearHistory(): void {
    this.logHistory = [];
  }

  /**
   * Export logs for debugging
   */
  exportLogs(): string {
    return JSON.stringify(this.logHistory, null, 2);
  }

  /**
   * Check if we're in development mode
   */
  isDevMode(): boolean {
    return this.isDevelopment;
  }
}

// Create singleton instance
const logger = new Logger();

// Export both the instance and the class
export { Logger, logger as default };

// Convenience exports
export const debug = (message: string, data?: any, source?: string) => 
  logger.debug(message, data, source);

export const info = (message: string, data?: any, source?: string) => 
  logger.info(message, data, source);

export const warn = (message: string, data?: any, source?: string) => 
  logger.warn(message, data, source);

export const error = (message: string, data?: any, source?: string) => 
  logger.error(message, data, source);