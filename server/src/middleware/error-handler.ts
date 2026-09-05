import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof AppError) {
    const errorResponse: { error: { code: string; message: string; details?: unknown } } = {
      error: {
        code: err.code,
        message: err.message
      }
    };
    
    if (err.details) {
      errorResponse.error.details = err.details;
    }
    
    res.status(err.statusCode).json(errorResponse);
    return;
  }

  logger.error('Unhandled error:', err);

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  });
}
