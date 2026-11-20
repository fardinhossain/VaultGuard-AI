import { Router } from 'express';
import { z } from 'zod';
import {
  CryptographicTamperError,
  KeyUnwrapError,
  decryptRecord,
} from '@vaultguard/crypto-core';
import { keyProvider } from '../../config/db.js';
import { sentinelGuardMiddleware } from '../../middleware/sentinelGuard.js';
import { EncryptedRecordModel } from '../../models/EncryptedRecord.js';
import {
  AccessPurpose,
  applyFieldRedaction,
  evaluateDecryptPolicy,
  getDefaultPurposeForRole,
} from '../access/policy.service.js';
import { appendAuditLog } from '../audit/audit.service.js';
import { recordAndEvaluateActivity } from '../sentinel/sentinel.service.js';
import {
  createEncryptedCustomerRecord,
  searchEncryptedRecordsByPhone,
  serializeEncryptedSummary,
} from './records.service.js';

export const recordsRouter = Router();

const createCustomerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(6).max(24),
  email: z.string().trim().email().max(120),
  address: z.string().trim().min(4).max(220),
  orderTotal: z.string().trim().min(1).max(40),
});

const searchPhoneSchema = z.object({
  phone: z.string().trim().min(3).max(30),
});

const decryptSchema = z.object({
  purpose: z.enum(['ORDER_DELIVERY', 'ADMIN_AUDIT', 'POLICY_FULL', 'ANALYTICS']).optional(),
});

recordsRouter.get('/', async (req, res, next) => {
  try {
    const docs = await EncryptedRecordModel.find({ tenantId: req.auth.tenantId })
      .sort({ createdAt: -1 })
      .lean();
    res.json({
      tenantId: req.auth.tenantId,
      total: docs.length,
      records: docs.map(serializeEncryptedSummary),
    });
  } catch (err) {
    next(err);
  }
});

recordsRouter.post('/', async (req, res, next) => {
  try {
    const payload = createCustomerSchema.parse(req.body);
    const result = await createEncryptedCustomerRecord({
      tenantId: req.auth.tenantId,
      actorId: req.auth.actorId,
      actorRole: req.auth.actorRole,
      payload,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

recordsRouter.post('/search', async (req, res, next) => {
  try {
    const { phone } = searchPhoneSchema.parse(req.body);
    const result = await searchEncryptedRecordsByPhone({
      tenantId: req.auth.tenantId,
      actorId: req.auth.actorId,
      actorRole: req.auth.actorRole,
      rawPhone: phone,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

recordsRouter.post('/:recordId/decrypt', sentinelGuardMiddleware, async (req, res, next) => {
  const start = performance.now();
  try {
    const { recordId } = req.params;
    const { tenantId, actorId, actorRole } = req.auth;
    const body = decryptSchema.parse(req.body ?? {});
    const purpose: AccessPurpose = body.purpose ?? getDefaultPurposeForRole(actorRole);

    const policyEval = evaluateDecryptPolicy(actorRole, purpose);
    if (!policyEval.allowed) {
      const sentinelEval = await recordAndEvaluateActivity({
        tenantId,
        actorId,
        actorRole,
        recordId,
        outcome: 'unauthorized',
      });

      const latencyMs = Number((performance.now() - start).toFixed(2));
      await appendAuditLog({
        tenantId,
        actorId,
        actorRole,
        action: 'DECRYPT_BLOCKED',
        recordId,
        purpose,
        result: 'BLOCKED',
        latencyMs,
      });

      res.status(403).json({
        error: 'ACCESS_DENIED_BY_POLICY',
        message: policyEval.reason,
        role: actorRole,
        purpose,
        auditLogged: true,
        sentinelRiskImpact: '+12',
        currentRiskScore: sentinelEval.riskScore,
        sessionAutoBlocked: sentinelEval.blocked,
      });
      return;
    }

    const record = await EncryptedRecordModel.findOne({ tenantId, recordId }).lean();
    if (!record) {
      res.status(404).json({
        error: 'RECORD_NOT_FOUND',
        message: `Encrypted record '${recordId}' was not found for tenant '${tenantId}'.`,
      });
      return;
    }

    let decrypted;
    try {
      decrypted = decryptRecord({
        envelope: {
          recordId: record.recordId,
          tenantId: record.tenantId,
          algorithm: record.algorithm,
          schemaVersion: record.schemaVersion,
          keyVersion: record.keyVersion,
          ciphertext: record.ciphertext,
          dataNonce: record.dataNonce,
          dataAuthTag: record.dataAuthTag,
          wrappedDEK: record.wrappedDEK,
          wrapNonce: record.wrapNonce,
          wrapAuthTag: record.wrapAuthTag,
        },
        expectedTenantId: tenantId,
        keyProvider,
      });
    } catch (err) {
      if (err instanceof CryptographicTamperError || err instanceof KeyUnwrapError) {
        await recordAndEvaluateActivity({
          tenantId,
          actorId,
          actorRole,
          recordId,
          outcome: 'tamper',
          persistEvent: true,
        });
        await appendAuditLog({
          tenantId,
          actorId,
          actorRole,
          action: 'TAMPER_DETECTED',
          recordId,
          purpose,
          result: 'FAILED',
          latencyMs: Number((performance.now() - start).toFixed(2)),
        });
      }
      throw err;
    }

    const redactedData = applyFieldRedaction(decrypted, actorRole);
    await recordAndEvaluateActivity({
      tenantId,
      actorId,
      actorRole,
      recordId,
      outcome: 'allow',
    });

    const latencyMs = Number((performance.now() - start).toFixed(2));
    await appendAuditLog({
      tenantId,
      actorId,
      actorRole,
      action: 'DECRYPT_SUCCESS',
      recordId,
      purpose,
      result: 'SUCCESS',
      latencyMs,
    });

    res.json({
      recordId,
      role: actorRole,
      purpose,
      data: redactedData,
      integrityVerified: true,
      keyVersion: record.keyVersion,
      latencyMs,
    });
  } catch (err) {
    next(err);
  }
});
