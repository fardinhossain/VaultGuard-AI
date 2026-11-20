import { Router } from 'express';
import { ROLE_POLICY_MATRIX } from './policy.service.js';

export const accessRouter = Router();

accessRouter.get('/policies', (_req, res) => {
  res.json({
    policies: Object.values(ROLE_POLICY_MATRIX),
    purposes: ['ORDER_DELIVERY', 'ADMIN_AUDIT', 'POLICY_FULL', 'ANALYTICS'],
  });
});
