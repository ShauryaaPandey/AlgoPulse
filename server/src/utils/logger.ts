import { env } from '../config/env.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private currentLevel: LogLevel;

  constructor(initialLevel?: LogLevel) {
    this.currentLevel = initialLevel ?? (env.LOG_LEVEL as LogLevel) ?? 'info';
  }

  public setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  public getLevel(): LogLevel {
    return this.currentLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.currentLevel];
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const formattedLevel = level.toUpperCase().padEnd(5);
    return `[${timestamp}] [${formattedLevel}] ${message}`;
  }

  public debug(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('debug')) return;
    if (args.length > 0) {
      console.debug(this.formatMessage('debug', message), ...args);
    } else {
      console.debug(this.formatMessage('debug', message));
    }
  }

  public info(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('info')) return;
    if (args.length > 0) {
      console.info(this.formatMessage('info', message), ...args);
    } else {
      console.info(this.formatMessage('info', message));
    }
  }

  public warn(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('warn')) return;
    if (args.length > 0) {
      console.warn(this.formatMessage('warn', message), ...args);
    } else {
      console.warn(this.formatMessage('warn', message));
    }
  }

  public error(message: string, ...args: unknown[]): void {
    if (!this.shouldLog('error')) return;
    if (args.length > 0) {
      console.error(this.formatMessage('error', message), ...args);
    } else {
      console.error(this.formatMessage('error', message));
    }
  }
}

export const logger = new Logger();
