import { Router } from 'express';
import { z } from 'zod';
import { generateVaultId } from '@vaultguard/crypto-core';
import { keyProvider } from '../../config/db.js';
import { authContextMiddleware } from '../../middleware/authContext.js';
import { EncryptedRecordModel } from '../../models/EncryptedRecord.js';
import { TenantModel } from '../../models/Tenant.js';
import { appendAuditLog } from '../audit/audit.service.js';
import { getPlanDefinition } from '../plans/plans.catalog.js';

export const tenantsRouter = Router();

const createTenantSchema = z.object({
  name: z.string().min(2).max(80),
  industry: z.string().min(2).max(80).default('Retail & E-Commerce'),
  contactEmail: z.string().email(),
  region: z.string().min(2).max(80).default('ap-south-1 / Dhaka Local Node'),
  deploymentMode: z.enum(['cloud', 'hybrid', 'customer-hosted']).default('cloud'),
  planTier: z.enum(['free', 'basic', 'premium', 'enterprise']).default('free'),
});

tenantsRouter.get('/', async (_req, res, next) => {
  try {
    const [tenants, counts] = await Promise.all([
      TenantModel.find().sort({ createdAt: 1 }).lean(),
      EncryptedRecordModel.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$tenantId', count: { $sum: 1 } } },
      ]),
    ]);

    const countMap = new Map(counts.map((c) => [c._id, c.count]));
    res.json({
      tenants: tenants.map((t) => ({
        ...t,
        recordCount: countMap.get(t.tenantId) ?? 0,
      })),
    });
  } catch (err) {
    next(err);
  }
});

tenantsRouter.post('/', async (req, res, next) => {
  try {
    const parsed = createTenantSchema.parse(req.body);
    const slug = parsed.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 24);
    const tenantId = `tenant_${slug}_${generateVaultId('id').slice(-4)}`;
    const activeKeyVersion = keyProvider.ensureTenantKeys(tenantId);
    const plan = getPlanDefinition(parsed.planTier);

    const created = await TenantModel.create({
      tenantId,
      name: parsed.name,
      industry: parsed.industry,
      contactEmail: parsed.contactEmail,
      region: parsed.region,
      deploymentMode: parsed.deploymentMode,
      keyProvider: 'local-dev-kms',
      activeKeyVersion,
      keyReferenceId: `arn:vaultguard:kms:dhaka:${slug}-kek`,
      planTier: plan.tier,
      billingCycle: 'monthly',
      maxApiKeys: plan.maxApiKeys,
      monthlyRecordLimit: plan.monthlyRecordLimit,
    });

    res.status(201).json({ tenant: created.toObject() });
  } catch (err) {
    next(err);
  }
});

const updatePlanSchema = z.object({
  planTier: z.enum(['free', 'basic', 'premium', 'enterprise']),
  billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
});

tenantsRouter.patch('/plan', authContextMiddleware, async (req, res, next) => {
  const start = performance.now();
  try {
    const { planTier, billingCycle } = updatePlanSchema.parse(req.body ?? {});
    const plan = getPlanDefinition(planTier);

    const updated = await TenantModel.findOneAndUpdate(
      { tenantId: req.auth.tenantId },
      {
        $set: {
          planTier: plan.tier,
          billingCycle,
          maxApiKeys: plan.maxApiKeys,
          monthlyRecordLimit: plan.monthlyRecordLimit,
        },
      },
      { new: true },
    ).lean();

    if (!updated) {
      res.status(404).json({
        error: 'TENANT_NOT_FOUND',
        message: `Tenant '${req.auth.tenantId}' not found.`,
      });
      return;
    }

    await appendAuditLog({
      tenantId: req.auth.tenantId,
      actorId: req.auth.actorId,
      actorRole: req.auth.actorRole,
      action: 'PLAN_UPDATED',
      purpose: `PLAN_${plan.tier.toUpperCase()}_${billingCycle.toUpperCase()}`,
      result: 'SUCCESS',
      latencyMs: Number((performance.now() - start).toFixed(2)),
    });

    res.json({
      tenant: updated,
      plan,
    });
  } catch (err) {
    next(err);
  }
});
