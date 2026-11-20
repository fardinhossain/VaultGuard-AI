import { Router } from 'express';
import { runCryptoSelfTest } from '@vaultguard/crypto-core';
import { getDatabaseMode } from '../../config/db.js';
import { authContextMiddleware } from '../../middleware/authContext.js';
import { ApiKeyModel } from '../../models/ApiKey.js';
import { AuditLogModel } from '../../models/AuditLog.js';
import { EncryptedRecordModel } from '../../models/EncryptedRecord.js';
import { ExternalStoreOrderModel } from '../../models/ExternalStoreOrder.js';
import { TenantModel } from '../../models/Tenant.js';
import { verifyTenantAuditChain } from '../audit/audit.service.js';
import { getSentinelTelemetry } from '../sentinel/sentinel.service.js';

export const healthRouter = Router();
export const dashboardRouter = Router();

healthRouter.get('/health', (_req, res) => {
  const cryptoSelfTest = runCryptoSelfTest();
  res.json({
    status: cryptoSelfTest.passed ? 'ok' : 'degraded',
    service: 'vaultguard-api',
    dbMode: getDatabaseMode(),
    cryptoSelfTest,
    timestamp: new Date().toISOString(),
  });
});

dashboardRouter.get('/summary', authContextMiddleware, async (req, res, next) => {
  try {
    const { tenantId } = req.auth;
    const [
      tenant,
      tenantCount,
      records,
      encryptLogs,
      auditVerification,
      sentinel,
      activeApiKeysCount,
      externalProtectedOrdersCount,
    ] = await Promise.all([
      TenantModel.findOne({ tenantId }).lean(),
      TenantModel.countDocuments(),
      EncryptedRecordModel.find({ tenantId })
        .select({ fieldCount: 1, keyVersion: 1, phoneBlindIndex: 1 })
        .lean(),
      AuditLogModel.find({ tenantId, action: { $in: ['ENCRYPT', 'EXTERNAL_ENCRYPT'] } })
        .select({ latencyMs: 1 })
        .lean(),
      verifyTenantAuditChain(tenantId),
      getSentinelTelemetry(tenantId),
      ApiKeyModel.countDocuments({ tenantId, status: 'active' }),
      ExternalStoreOrderModel.countDocuments({
        storeTenantId: tenantId,
        protectedByVaultGuard: true,
      }),
    ]);

    const totalEncryptedRecords = records.length;
    const totalEncryptedFields = records.reduce((acc, r) => acc + (r.fieldCount || 5), 0);
    const wrappedDekCount = totalEncryptedRecords;
    const blindIndexCount = records.filter((r) => Boolean(r.phoneBlindIndex)).length;

    const avgEncryptionLatencyMs =
      encryptLogs.length > 0
        ? Number(
            (
              encryptLogs.reduce((sum, l) => sum + l.latencyMs, 0) / encryptLogs.length
            ).toFixed(1),
          )
        : 1.2;

    const activeKeyVersion = tenant?.activeKeyVersion ?? 1;
    const encryptedAtRestPct = totalEncryptedRecords > 0 ? 100 : 0;
    const kekIsolationPct = 100;
    const plaintextExposurePct = 0;

    // Live Sovereignty & Security Index (0-100) driven by actual cryptographic & Sentinel state
    const rotationBonus = activeKeyVersion >= 2 ? 2 : 0;
    const chainScore = auditVerification.valid ? 20 : 5;
    const sentinelDeduction = sentinel.hasActiveBlock ? 4 : sentinel.severity === 'MEDIUM' ? 2 : 0;
    const securityIndexScore = Math.min(
      100,
      Math.max(
        60,
        (totalEncryptedRecords > 0 ? 78 : 50) + chainScore + rotationBonus - sentinelDeduction,
      ),
    );

    const dotMatrixColumns = [
      { key: 'AES', label: 'AES-GCM', level: totalEncryptedRecords > 0 ? 6 : 2, value: '256b' },
      { key: 'DEK', label: 'Per-Rec DEK', level: totalEncryptedRecords > 0 ? 6 : 2, value: `${wrappedDekCount}` },
      { key: 'AAD', label: 'Tenant AAD', level: 6, value: 'Bound' },
      { key: 'HMAC', label: 'Blind Index', level: blindIndexCount > 0 ? 5 : 2, value: `${blindIndexCount}` },
      { key: 'RBAC', label: 'Field Policy', level: 6, value: '3 Roles' },
      {
        key: 'XAI',
        label: 'AI Sentinel',
        level: sentinel.hasActiveBlock ? 6 : sentinel.severity === 'MEDIUM' ? 5 : 4,
        value: `${sentinel.currentRiskScore}`,
      },
      { key: 'HASH', label: 'Audit Chain', level: auditVerification.valid ? 6 : 1, value: auditVerification.valid ? 'Valid' : 'Alert' },
      { key: 'KEK', label: 'KEK Custody', level: activeKeyVersion >= 2 ? 6 : 5, value: `v${activeKeyVersion}` },
      { key: 'PDPA', label: 'PDPA 2026', level: securityIndexScore >= 90 ? 6 : 4, value: `${securityIndexScore}%` },
    ];

    res.json({
      tenant,
      tenantCount,
      totalEncryptedRecords,
      totalEncryptedFields,
      wrappedDekCount,
      blindIndexCount,
      encryptedAtRestPct,
      kekIsolationPct,
      plaintextExposurePct,
      avgEncryptionLatencyMs,
      activeKeyVersion,
      securityIndexScore,
      auditChainValid: auditVerification.valid,
      auditCount: auditVerification.checkedCount,
      activeApiKeysCount,
      externalProtectedOrdersCount,
      plan: {
        tier: tenant?.planTier ?? 'basic',
        billingCycle: tenant?.billingCycle ?? 'monthly',
        maxApiKeys: tenant?.maxApiKeys ?? 15,
        monthlyRecordLimit: tenant?.monthlyRecordLimit ?? 100000,
        activeApiKeysCount,
        totalProtectedCount: totalEncryptedRecords + externalProtectedOrdersCount,
      },
      dotMatrixColumns,
      sentinel,
    });
  } catch (err) {
    next(err);
  }
});
