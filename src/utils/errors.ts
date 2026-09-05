export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Authentication failed', details?: unknown) {
    super(message, 401, 'AUTH_ERROR', true, details);
  }
}

export class NotFoundError extends AppError {
  public readonly resource: string;

  constructor(resource: string = 'Resource', message?: string) {
    const errorMsg = message ?? `${resource} not found`;
    super(errorMsg, 404, 'NOT_FOUND', true, { resource });
    this.resource = resource;
  }
}

export class PlatformError extends AppError {
  public readonly platform: string;

  constructor(platform: string, message: string, details?: unknown, statusCode: number = 502) {
    super(`[${platform}] ${message}`, statusCode, 'PLATFORM_ERROR', true, details);
    this.platform = platform;
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfterMs?: number;

  constructor(message: string = 'Rate limit exceeded, please retry later', retryAfterMs?: number) {
    super(message, 429, 'RATE_LIMIT_ERROR', true, { retryAfterMs });
    this.retryAfterMs = retryAfterMs;
  }
}
