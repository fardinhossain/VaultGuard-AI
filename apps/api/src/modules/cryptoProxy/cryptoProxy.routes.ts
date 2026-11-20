import { Router } from 'express';
import { z } from 'zod';
import {
  CryptographicTamperError,
  EncryptedEnvelope,
  KeyUnwrapError,
  computeBlindIndex,
  decryptRecord,
  encryptRecord,
  generateVaultId,
  rewrapRecordDEK,
} from '@vaultguard/crypto-core';
import { keyProvider } from '../../config/db.js';
import { sentinelGuardMiddleware } from '../../middleware/sentinelGuard.js';
import { AuditActorRole } from '../../models/AuditLog.js';
import { TenantModel } from '../../models/Tenant.js';
import {
  AccessPurpose,
  ActorRole,
  applyFieldRedaction,
  evaluateDecryptPolicy,
  getDefaultPurposeForRole,
} from '../access/policy.service.js';
import { appendAuditLog } from '../audit/audit.service.js';
import { recordAndEvaluateActivity } from '../sentinel/sentinel.service.js';

export const cryptoProxyRouter = Router();

export const encryptedEnvelopeSchema = z.object({
  recordId: z.string().min(1),
  tenantId: z.string().min(1),
  algorithm: z.literal('AES-256-GCM'),
  schemaVersion: z.number().int().min(1),
  keyVersion: z.number().int().min(1),
  ciphertext: z.string().min(1),
  dataNonce: z.string().min(1),
  dataAuthTag: z.string().min(1),
  wrappedDEK: z.string().min(1),
  wrapNonce: z.string().min(1),
  wrapAuthTag: z.string().min(1),
});

export type ExternalPrimitiveValue = string | number | boolean | null;

export async function encryptExternalPayload(params: {
  tenantId: string;
  actorId: string;
  actorRole: AuditActorRole;
  data: Record<string, ExternalPrimitiveValue>;
  blindIndexFields?: string[];
  recordId?: string;
}) {
  const start = performance.now();
  const tenant = await TenantModel.findOne({ tenantId: params.tenantId }).lean();
  if (!tenant) {
    throw new Error(`Tenant '${params.tenantId}' not found.`);
  }

  keyProvider.syncTenantKeyVersion(params.tenantId, tenant.activeKeyVersion);
  const recordId = params.recordId ?? generateVaultId('ext');

  const envelope = encryptRecord<Record<string, ExternalPrimitiveValue>>({
    tenantId: params.tenantId,
    recordId,
    payload: params.data,
    schemaVersion: 1,
    keyProvider,
  });

  const blindIndexes: Record<string, string> = {};
  const indexFields = params.blindIndexFields ?? (params.data.phone ? ['phone'] : []);

  if (indexFields.length > 0) {
    const indexKey = keyProvider.getBlindIndexKey(params.tenantId);
    try {
      for (const field of indexFields) {
        const rawVal = params.data[field];
        const strVal = rawVal !== null && rawVal !== undefined ? String(rawVal).trim() : '';
        if (strVal) {
          blindIndexes[field] = computeBlindIndex(indexKey, strVal);
        }
      }
    } finally {
      indexKey.fill(0);
    }
  }

  const latencyMs = Number((performance.now() - start).toFixed(2));
  await appendAuditLog({
    tenantId: params.tenantId,
    actorId: params.actorId,
    actorRole: params.actorRole,
    action: 'EXTERNAL_ENCRYPT',
    recordId,
    purpose: 'EXTERNAL_DB_WRITE',
    result: 'SUCCESS',
    latencyMs,
  });

  return {
    recordId,
    tenantId: params.tenantId,
    algorithm: envelope.algorithm,
    keyVersion: envelope.keyVersion,
    envelope,
    blindIndexes,
    latencyMs,
    storedInVaultGuard: false,
  };
}

export async function decryptExternalEnvelope(params: {
  tenantId: string;
  actorId: string;
  actorRole: ActorRole;
  envelope: EncryptedEnvelope;
  purpose?: AccessPurpose;
}) {
  const start = performance.now();
  const purpose = params.purpose ?? getDefaultPurposeForRole(params.actorRole);

  const policyEval = evaluateDecryptPolicy(params.actorRole, purpose);
  if (!policyEval.allowed) {
    const sentinelEval = await recordAndEvaluateActivity({
      tenantId: params.tenantId,
      actorId: params.actorId,
      actorRole: params.actorRole,
      recordId: params.envelope.recordId,
      outcome: 'unauthorized',
    });

    await appendAuditLog({
      tenantId: params.tenantId,
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: 'DECRYPT_BLOCKED',
      recordId: params.envelope.recordId,
      purpose,
      result: 'BLOCKED',
      latencyMs: Number((performance.now() - start).toFixed(2)),
    });

    return {
      allowed: false as const,
      status: 403,
      body: {
        error: 'ACCESS_DENIED_BY_POLICY',
        message: policyEval.reason,
        role: params.actorRole,
        purpose,
        auditLogged: true,
        sentinelRiskImpact: '+12',
        currentRiskScore: sentinelEval.riskScore,
        sessionAutoBlocked: sentinelEval.blocked,
      },
    };
  }

  let decrypted: Record<string, ExternalPrimitiveValue>;
  try {
    decrypted = decryptRecord<Record<string, ExternalPrimitiveValue>>({
      envelope: params.envelope,
      expectedTenantId: params.tenantId,
      keyProvider,
    });
  } catch (err) {
    if (err instanceof CryptographicTamperError || err instanceof KeyUnwrapError) {
      await recordAndEvaluateActivity({
        tenantId: params.tenantId,
        actorId: params.actorId,
        actorRole: params.actorRole,
        recordId: params.envelope.recordId,
        outcome: 'tamper',
        persistEvent: true,
      });
      await appendAuditLog({
        tenantId: params.tenantId,
        actorId: params.actorId,
        actorRole: params.actorRole,
        action: 'TAMPER_DETECTED',
        recordId: params.envelope.recordId,
        purpose,
        result: 'FAILED',
        latencyMs: Number((performance.now() - start).toFixed(2)),
      });
    }
    throw err;
  }

  const redacted = applyFieldRedaction(decrypted, params.actorRole);
  await recordAndEvaluateActivity({
    tenantId: params.tenantId,
    actorId: params.actorId,
    actorRole: params.actorRole,
    recordId: params.envelope.recordId,
    outcome: 'allow',
  });

  const latencyMs = Number((performance.now() - start).toFixed(2));
  await appendAuditLog({
    tenantId: params.tenantId,
    actorId: params.actorId,
    actorRole: params.actorRole,
    action: 'EXTERNAL_DECRYPT',
    recordId: params.envelope.recordId,
    purpose,
    result: 'SUCCESS',
    latencyMs,
  });

  return {
    allowed: true as const,
    status: 200,
    body: {
      recordId: params.envelope.recordId,
      tenantId: params.tenantId,
      role: params.actorRole,
      purpose,
      data: redacted,
      integrityVerified: true,
      keyVersion: params.envelope.keyVersion,
      latencyMs,
    },
  };
}

const encryptRequestSchema = z.object({
  data: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .refine((obj) => Object.keys(obj).length > 0, 'At least one field is required.'),
  blindIndexFields: z.array(z.string()).optional(),
  recordId: z.string().min(1).optional(),
});

cryptoProxyRouter.post('/encrypt', sentinelGuardMiddleware, async (req, res, next) => {
  try {
    const parsed = encryptRequestSchema.parse(req.body ?? {});
    const result = await encryptExternalPayload({
      tenantId: req.auth.tenantId,
      actorId: req.auth.actorId,
      actorRole: req.auth.actorRole,
      data: parsed.data,
      blindIndexFields: parsed.blindIndexFields,
      recordId: parsed.recordId,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

const blindIndexSchema = z.object({
  field: z.string().default('phone'),
  value: z.string().min(1),
});

cryptoProxyRouter.post('/blind-index', async (req, res, next) => {
  const start = performance.now();
  try {
    const { field, value } = blindIndexSchema.parse(req.body ?? {});
    const indexKey = keyProvider.getBlindIndexKey(req.auth.tenantId);
    let blindIndex: string;
    try {
      blindIndex = computeBlindIndex(indexKey, value);
    } finally {
      indexKey.fill(0);
    }

    const latencyMs = Number((performance.now() - start).toFixed(2));
    await appendAuditLog({
      tenantId: req.auth.tenantId,
      actorId: req.auth.actorId,
      actorRole: req.auth.actorRole,
      action: 'SEARCH_BLIND_INDEX',
      purpose: `EXTERNAL_SEARCH_${field.toUpperCase()}`,
      result: 'SUCCESS',
      latencyMs,
    });

    res.json({
      field,
      blindIndex,
      latencyMs,
    });
  } catch (err) {
    next(err);
  }
});

const decryptRequestSchema = z.object({
  envelope: encryptedEnvelopeSchema,
  purpose: z.enum(['ORDER_DELIVERY', 'ADMIN_AUDIT', 'POLICY_FULL', 'ANALYTICS']).optional(),
});

cryptoProxyRouter.post('/decrypt', sentinelGuardMiddleware, async (req, res, next) => {
  try {
    const { envelope, purpose } = decryptRequestSchema.parse(req.body ?? {});
    const result = await decryptExternalEnvelope({
      tenantId: req.auth.tenantId,
      actorId: req.auth.actorId,
      actorRole: req.auth.actorRole,
      envelope,
      purpose,
    });
    res.status(result.status).json(result.body);
  } catch (err) {
    next(err);
  }
});

const rewrapRequestSchema = z.object({
  envelope: encryptedEnvelopeSchema,
});

cryptoProxyRouter.post('/rewrap', async (req, res, next) => {
  try {
    const { envelope } = rewrapRequestSchema.parse(req.body ?? {});
    if (envelope.tenantId !== req.auth.tenantId) {
      res.status(403).json({
        error: 'TENANT_AAD_MISMATCH',
        message: 'Envelope belongs to another tenant.',
      });
      return;
    }

    const tenant = await TenantModel.findOne({ tenantId: req.auth.tenantId }).lean();
    if (!tenant) {
      res.status(404).json({ error: 'TENANT_NOT_FOUND', message: 'Tenant not found.' });
      return;
    }

    keyProvider.syncTenantKeyVersion(req.auth.tenantId, tenant.activeKeyVersion);
    const rewrapped = rewrapRecordDEK({
      envelope,
      targetKeyVersion: tenant.activeKeyVersion,
      keyProvider,
    });

    res.json({
      previousKeyVersion: envelope.keyVersion,
      newKeyVersion: rewrapped.keyVersion,
      ciphertextModified: false,
      envelope: {
        ...envelope,
        keyVersion: rewrapped.keyVersion,
        wrappedDEK: rewrapped.wrappedDEK,
        wrapNonce: rewrapped.wrapNonce,
        wrapAuthTag: rewrapped.wrapAuthTag,
      },
    });
  } catch (err) {
    next(err);
  }
});
