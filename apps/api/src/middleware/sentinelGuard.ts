import { NextFunction, Request, Response } from 'express';
import { appendAuditLog } from '../modules/audit/audit.service.js';
import { isActorSessionBlocked } from '../modules/sentinel/sentinel.service.js';

export async function sentinelGuardMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { tenantId, actorId, actorRole } = req.auth;
    const status = isActorSessionBlocked(tenantId, actorId);

    if (status.blocked) {
      await appendAuditLog({
        tenantId,
        actorId,
        actorRole,
        action: 'DECRYPT_BLOCKED',
        recordId: req.params.recordId,
        purpose: typeof req.body?.purpose === 'string' ? req.body.purpose : undefined,
        result: 'BLOCKED',
        latencyMs: 0.3,
      });

      res.status(403).json({
        error: 'SESSION_BLOCKED_BY_SENTINEL',
        message: `Session for actor '${actorId}' (${actorRole}) is auto-blocked by VaultGuard Sentinel (Risk ${status.riskScore ?? 95}/100). Reset Sentinel lock to resume.`,
        blockedActorId: actorId,
        riskScore: status.riskScore ?? 95,
        auditLogged: true,
      });
      return;
    }

    next();
  } catch (err) {
    next(err);
  }
}
