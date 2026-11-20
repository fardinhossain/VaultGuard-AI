import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { TenantModel } from '../../models/Tenant.js';

export const authRouter = Router();

const demoTokenSchema = z.object({
  tenantId: z.string().min(1).default('tenant_supershop_bd'),
  actorRole: z.enum(['admin', 'delivery', 'marketing']).default('admin'),
  actorId: z.string().min(1).optional(),
});

authRouter.post('/demo-token', async (req, res, next) => {
  try {
    const parsed = demoTokenSchema.parse(req.body ?? {});
    const tenant = await TenantModel.findOne({ tenantId: parsed.tenantId }).lean();
    if (!tenant) {
      res.status(404).json({
        error: 'TENANT_NOT_FOUND',
        message: `Tenant '${parsed.tenantId}' not found.`,
      });
      return;
    }

    const actorId = parsed.actorId ?? `demo_${parsed.actorRole}_01`;
    const claims = {
      tenantId: parsed.tenantId,
      actorRole: parsed.actorRole,
      actorId,
    };

    const token = jwt.sign(claims, env.JWT_SECRET, { expiresIn: '2h' });

    res.json({
      token,
      expiresIn: '2h',
      claims,
    });
  } catch (err) {
    next(err);
  }
});
