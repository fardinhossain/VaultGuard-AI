import { Router } from 'express';
import { z } from 'zod';
import {
  CryptographicTamperError,
  decryptRecord,
  flipCiphertextByte,
} from '@vaultguard/crypto-core';
import { keyProvider } from '../../config/db.js';
import { EncryptedRecordModel } from '../../models/EncryptedRecord.js';
import { appendAuditLog } from '../audit/audit.service.js';
import { recordAndEvaluateActivity } from '../sentinel/sentinel.service.js';

export const breachRouter = Router();

const TRADITIONAL_PLAINTEXT_SAMPLE = [
  {
    _id: 'legacy_672a9101',
    name: 'Fardin Hossain',
    phone: '01712345678',
    email: 'fardin.demo@example.com',
    address: 'House 14, Road 7, Dhanmondi, Dhaka',
    orderTotal: '৳4,850',
    plaintextExposed: true,
  },
  {
    _id: 'legacy_672a9102',
    name: 'Nusrat Jahan',
    phone: '01819876543',
    email: 'nusrat.demo@example.com',
    address: 'Flat 4B, Sector 11, Uttara, Dhaka',
    orderTotal: '৳12,400',
    plaintextExposed: true,
  },
  {
    _id: 'legacy_672a9103',
    name: 'Tanvir Ahmed',
    phone: '01911223344',
    email: 'tanvir.demo@example.com',
    address: 'Block C, Banani, Dhaka',
    orderTotal: '৳2,190',
    plaintextExposed: true,
  },
];

breachRouter.get('/dump', async (req, res, next) => {
  try {
    const rawDocs = await EncryptedRecordModel.find({ tenantId: req.auth.tenantId })
      .sort({ createdAt: -1 })
      .lean();

    const vaultguardRawDump = rawDocs.map((doc) => ({
      recordId: doc.recordId,
      tenantId: doc.tenantId,
      recordType: doc.recordType,
      algorithm: doc.algorithm,
      schemaVersion: doc.schemaVersion,
      keyVersion: doc.keyVersion,
      ciphertext: doc.ciphertext,
      dataNonce: doc.dataNonce,
      dataAuthTag: doc.dataAuthTag,
      wrappedDEK: doc.wrappedDEK,
      wrapNonce: doc.wrapNonce,
      wrapAuthTag: doc.wrapAuthTag,
      phoneBlindIndex: doc.phoneBlindIndex,
      createdAt: doc.createdAt,
    }));

    res.json({
      tenantId: req.auth.tenantId,
      traditionalLeakSample: TRADITIONAL_PLAINTEXT_SAMPLE,
      vaultguardRawDump,
      summary: {
        totalRecordsInVault: vaultguardRawDump.length,
        readablePiiFieldsInTraditional: TRADITIONAL_PLAINTEXT_SAMPLE.length * 5,
        readablePiiFieldsInVaultGuard: 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

const tamperSchema = z.object({
  recordId: z.string().min(1).optional(),
  byteIndex: z.number().int().min(0).max(512).optional(),
});

breachRouter.post('/tamper-test', async (req, res, next) => {
  const start = performance.now();
  try {
    const { tenantId, actorId, actorRole } = req.auth;
    const body = tamperSchema.parse(req.body ?? {});

    const record = body.recordId
      ? await EncryptedRecordModel.findOne({ tenantId, recordId: body.recordId }).lean()
      : await EncryptedRecordModel.findOne({ tenantId }).sort({ createdAt: -1 }).lean();

    if (!record) {
      res.status(404).json({
        error: 'RECORD_NOT_FOUND',
        message: 'No encrypted records found for tamper verification.',
      });
      return;
    }

    const flipped = flipCiphertextByte(record.ciphertext, body.byteIndex ?? 0);

    let gcmVerificationPassed = true;
    let cryptoError = '';
    let errorCode = '';

    try {
      decryptRecord({
        envelope: {
          recordId: record.recordId,
          tenantId: record.tenantId,
          algorithm: record.algorithm,
          schemaVersion: record.schemaVersion,
          keyVersion: record.keyVersion,
          ciphertext: flipped.tamperedCiphertext,
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
      gcmVerificationPassed = false;
      if (err instanceof CryptographicTamperError) {
        cryptoError = err.cryptoMessage;
        errorCode = err.code;
      } else {
        cryptoError = err instanceof Error ? err.message : 'Unable to authenticate data';
        errorCode = 'CRYPTO_TAMPER_DETECTED';
      }
    }

    const latencyMs = Number((performance.now() - start).toFixed(2));
    await recordAndEvaluateActivity({
      tenantId,
      actorId,
      actorRole,
      recordId: record.recordId,
      outcome: 'tamper',
      persistEvent: true,
    });

    await appendAuditLog({
      tenantId,
      actorId,
      actorRole,
      action: 'TAMPER_DETECTED',
      recordId: record.recordId,
      purpose: 'BREACH_TAMPER_SIMULATION',
      result: 'FAILED',
      latencyMs,
    });

    res.json({
      recordId: record.recordId,
      algorithm: record.algorithm,
      tamperedByteIndex: flipped.byteIndex,
      originalByteHex: flipped.originalByteHex,
      tamperedByteHex: flipped.tamperedByteHex,
      originalCiphertextSnippet: `${record.ciphertext.slice(0, 20)}...`,
      tamperedCiphertextSnippet: `${flipped.tamperedCiphertext.slice(0, 20)}...`,
      gcmVerificationPassed,
      failClosed: !gcmVerificationPassed,
      errorCode,
      cryptoError,
      auditLogged: true,
      databaseUntouched: true,
      latencyMs,
    });
  } catch (err) {
    next(err);
  }
});
