import { Router } from 'express';
import { PLANS_CATALOG, PLAN_COMPARISON_ROWS } from './plans.catalog.js';

export const plansRouter = Router();

plansRouter.get('/', (_req, res) => {
  res.json({
    plans: PLANS_CATALOG,
    comparisonRows: PLAN_COMPARISON_ROWS,
  });
});
