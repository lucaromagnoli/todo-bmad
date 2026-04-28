import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export type ErrorCode = 'validation_error' | 'not_found' | 'internal_error';

export interface ErrorEnvelope {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export interface MappedError {
  status: number;
  body: ErrorEnvelope;
}

export function mapError(err: unknown): MappedError {
  if (err instanceof ZodError) {
    return {
      status: 400,
      body: {
        error: {
          code: 'validation_error',
          message: 'Request validation failed',
          details: err.flatten(),
        },
      },
    };
  }
  if (err instanceof NotFoundError) {
    return {
      status: 404,
      body: { error: { code: 'not_found', message: err.message } },
    };
  }
  return {
    status: 500,
    body: { error: { code: 'internal_error', message: 'Internal server error' } },
  };
}

interface RequestLogger {
  error: (obj: Record<string, unknown>, msg: string) => void;
}

export const errorMiddleware =
  (logger?: RequestLogger): ErrorRequestHandler =>
  (err, _req, res, _next) => {
    const mapped = mapError(err);
    if (mapped.status === 500) {
      logger?.error({ err }, 'unhandled error');
    }
    res.status(mapped.status).json(mapped.body);
  };
