import { Router } from 'express';
import {
  getSentinelTelemetry,
  resetTenantSentinel,
  simulateInsiderAttack,
} from './sentinel.service.js';

export const sentinelRouter = Router();

sentinelRouter.get('/telemetry', async (req, res, next) => {
  try {
    const telemetry = await getSentinelTelemetry(req.auth.tenantId);
    res.json(telemetry);
  } catch (err) {
    next(err);
  }
});

sentinelRouter.post('/simulate-attack', async (req, res, next) => {
  try {
    const result = await simulateInsiderAttack(req.auth.tenantId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

sentinelRouter.post('/reset', async (req, res, next) => {
  try {
    const telemetry = await resetTenantSentinel(req.auth.tenantId);
    res.json({
      reset: true,
      telemetry,
    });
  } catch (err) {
    next(err);
  }
});
