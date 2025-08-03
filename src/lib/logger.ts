/**
 * Centralized logging system for the Boxing Timer application
 * 
 * Provides environment-aware logging that:
 * - Shows all logs in development
 * - Shows only errors and warnings in production
 * - Allows per-module log level control
 * - Maintains consistent log formatting
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  showTimestamp: boolean;
  showModule: boolean;
}

class Logger {
  private config: LoggerConfig;
  private static instance: Logger;

  constructor() {
    // In production, only show warnings and errors
    // In development, show all logs
    const isProduction = process.env.NODE_ENV === 'production';
    
    this.config = {
      enabled: true,
      level: 'warn', // Only show warnings and errors
      showTimestamp: !isProduction,
      showModule: true,
    };
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;

    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    return levels[level] >= levels[this.config.level];
  }

  private formatMessage(module: string, message: string): string {
    const parts: string[] = [];
    
    if (this.config.showTimestamp) {
      parts.push(new Date().toISOString().split('T')[1].slice(0, -1));
    }
    
    if (this.config.showModule && module) {
      parts.push(`[${module}]`);
    }
    
    parts.push(message);
    return parts.join(' ');
  }

  debug(module: string, message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage(module, message), ...args);
    }
  }

  info(module: string, message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage(module, message), ...args);
    }
  }

  warn(module: string, message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage(module, message), ...args);
    }
  }

  error(module: string, message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage(module, message), ...args);
    }
  }

  // Allow runtime configuration changes
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }
}

// Create logger instance
const logger = Logger.getInstance();

// Export convenience functions for each module
export const createModuleLogger = (moduleName: string) => ({
  debug: (message: string, ...args: unknown[]) => logger.debug(moduleName, message, ...args),
  info: (message: string, ...args: unknown[]) => logger.info(moduleName, message, ...args),
  warn: (message: string, ...args: unknown[]) => logger.warn(moduleName, message, ...args),
  error: (message: string, ...args: unknown[]) => logger.error(moduleName, message, ...args),
});

// Export the main logger for direct use
export { logger };