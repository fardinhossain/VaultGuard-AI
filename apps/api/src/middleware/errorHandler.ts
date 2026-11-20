import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import {
  CryptographicTamperError,
  KeyUnwrapError,
  TenantMismatchError,
} from '@vaultguard/crypto-core';

export function errorHandlerMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
      issues: err.issues,
    });
    return;
  }

  if (err instanceof TenantMismatchError) {
    res.status(403).json({
      error: err.code,
      message: err.message,
    });
    return;
  }

  if (err instanceof CryptographicTamperError || err instanceof KeyUnwrapError) {
    res.status(422).json({
      error: err.code,
      message: err.message,
      failClosed: true,
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  console.error('[api-error]', message);
  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'Unexpected server error occurred.',
  });
}
