import { Router } from 'express';
import { z } from 'zod';
import { generateApiKey, generateVaultId, hashApiKey } from '@vaultguard/crypto-core';
import { ApiKeyModel } from '../../models/ApiKey.js';
import { TenantModel } from '../../models/Tenant.js';
import { appendAuditLog } from '../audit/audit.service.js';

export const apiKeysPublicRouter = Router();
export const apiKeysRouter = Router();

const verifySchema = z.object({
  apiKey: z.string().min(1),
});

apiKeysPublicRouter.post('/verify', async (req, res, next) => {
  try {
    const { apiKey } = verifySchema.parse(req.body ?? {});
    const keyHash = hashApiKey(apiKey);
    const keyDoc = await ApiKeyModel.findOne({ keyHash }).lean();

    if (!keyDoc) {
      res.status(401).json({
        valid: false,
        error: 'INVALID_API_KEY',
        message: 'API key was not recognized by VaultGuard.',
      });
      return;
    }

    const tenant = await TenantModel.findOne({ tenantId: keyDoc.tenantId }).lean();
    const valid = keyDoc.status === 'active';

    res.status(valid ? 200 : keyDoc.status === 'sentinel_blocked' ? 403 : 401).json({
      valid,
      status: keyDoc.status,
      keyId: keyDoc.keyId,
      keyPrefix: keyDoc.keyPrefix,
      name: keyDoc.name,
      tenantId: keyDoc.tenantId,
      tenantName: tenant?.name ?? keyDoc.tenantId,
      roleScope: keyDoc.roleScope,
      message:
        keyDoc.status === 'active'
          ? 'API key verified and active.'
          : keyDoc.status === 'revoked'
            ? 'API key has been revoked.'
            : 'API key auto-blocked by VaultGuard AI Sentinel.',
    });
  } catch (err) {
    next(err);
  }
});

apiKeysRouter.get('/', async (req, res, next) => {
  try {
    const keys = await ApiKeyModel.find({ tenantId: req.auth.tenantId })
      .select({ keyHash: 0 })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      tenantId: req.auth.tenantId,
      keys,
    });
  } catch (err) {
    next(err);
  }
});

const createKeySchema = z.object({
  name: z.string().trim().min(2).max(80),
  roleScope: z.enum(['admin', 'delivery', 'marketing']).default('admin'),
});

apiKeysRouter.post('/', async (req, res, next) => {
  const start = performance.now();
  try {
    const parsed = createKeySchema.parse(req.body ?? {});
    const { tenantId, actorId, actorRole } = req.auth;

    const generated = generateApiKey('live', tenantId);
    const keyId = generateVaultId('key');

    const created = await ApiKeyModel.create({
      keyId,
      tenantId,
      name: parsed.name,
      keyPrefix: generated.keyPrefix,
      keyHash: generated.keyHash,
      roleScope: parsed.roleScope,
      status: 'active',
      requestCount: 0,
    });

    await appendAuditLog({
      tenantId,
      actorId,
      actorRole,
      action: 'API_KEY_CREATED',
      purpose: `SCOPE_${parsed.roleScope.toUpperCase()}`,
      result: 'SUCCESS',
      latencyMs: Number((performance.now() - start).toFixed(2)),
    });

    const sanitized = created.toObject();
    const { keyHash: _omit, ...safeKey } = sanitized;

    res.status(201).json({
      apiKey: safeKey,
      rawKey: generated.rawKey,
      warning:
        'Copy this API key now. VaultGuard stores only its SHA-256 hash and will never show the full key again.',
    });
  } catch (err) {
    next(err);
  }
});

apiKeysRouter.post('/:keyId/revoke', async (req, res, next) => {
  const start = performance.now();
  try {
    const { tenantId, actorId, actorRole } = req.auth;
    const { keyId } = req.params;

    const updated = await ApiKeyModel.findOneAndUpdate(
      { tenantId, keyId },
      { $set: { status: 'revoked' } },
      { new: true },
    )
      .select({ keyHash: 0 })
      .lean();

    if (!updated) {
      res.status(404).json({
        error: 'API_KEY_NOT_FOUND',
        message: `API key '${keyId}' not found for tenant '${tenantId}'.`,
      });
      return;
    }

    await appendAuditLog({
      tenantId,
      actorId,
      actorRole,
      action: 'API_KEY_REVOKED',
      purpose: `REVOKED_${updated.keyPrefix}`,
      result: 'SUCCESS',
      latencyMs: Number((performance.now() - start).toFixed(2)),
    });

    res.json({
      revoked: true,
      apiKey: updated,
    });
  } catch (err) {
    next(err);
  }
});
