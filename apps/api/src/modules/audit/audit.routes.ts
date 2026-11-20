import { Router } from 'express';
import { listAuditLogs, verifyTenantAuditChain } from './audit.service.js';

export const auditRouter = Router();

auditRouter.get('/', async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 30;
    const action = typeof req.query.action === 'string' ? req.query.action : undefined;
    const result = typeof req.query.result === 'string' ? req.query.result : undefined;

    const data = await listAuditLogs(req.auth.tenantId, { page, limit, action, result });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

auditRouter.get('/verify', async (req, res, next) => {
  try {
    const verification = await verifyTenantAuditChain(req.auth.tenantId);
    res.json(verification);
  } catch (err) {
    next(err);
  }
});
