import { Router } from 'express';
import { rewrapRecordDEK } from '@vaultguard/crypto-core';
import { keyProvider } from '../../config/db.js';
import { EncryptedRecordModel } from '../../models/EncryptedRecord.js';
import { TenantModel } from '../../models/Tenant.js';
import { appendAuditLog } from '../audit/audit.service.js';

export const keysRouter = Router();

keysRouter.post('/rotate', async (req, res, next) => {
  const start = performance.now();
  try {
    const { tenantId, actorId, actorRole } = req.auth;
    const tenant = await TenantModel.findOne({ tenantId });
    if (!tenant) {
      res.status(404).json({ error: 'TENANT_NOT_FOUND', message: 'Active tenant not found.' });
      return;
    }

    keyProvider.syncTenantKeyVersion(tenantId, tenant.activeKeyVersion);
    const rotation = keyProvider.rotateTenantKEK(tenantId);

    const records = await EncryptedRecordModel.find({ tenantId });
    for (const record of records) {
      const rewrapped = rewrapRecordDEK({
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
        targetKeyVersion: rotation.newVersion,
        keyProvider,
      });

      record.wrappedDEK = rewrapped.wrappedDEK;
      record.wrapNonce = rewrapped.wrapNonce;
      record.wrapAuthTag = rewrapped.wrapAuthTag;
      record.keyVersion = rewrapped.keyVersion;
      await record.save();
    }

    tenant.activeKeyVersion = rotation.newVersion;
    await tenant.save();

    const latencyMs = Number((performance.now() - start).toFixed(2));
    await appendAuditLog({
      tenantId,
      actorId,
      actorRole,
      action: 'KEY_ROTATE',
      purpose: `KEK_V${rotation.previousVersion}_TO_V${rotation.newVersion}`,
      result: 'SUCCESS',
      latencyMs,
    });

    res.json({
      tenantId,
      previousVersion: rotation.previousVersion,
      newVersion: rotation.newVersion,
      recordsRewrapped: records.length,
      ciphertextModified: false,
      latencyMs,
    });
  } catch (err) {
    next(err);
  }
});
