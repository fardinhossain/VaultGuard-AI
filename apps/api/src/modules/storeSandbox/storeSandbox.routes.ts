import { Router } from 'express';
import { z } from 'zod';
import {
  CryptographicTamperError,
  computeBlindIndex,
  decryptRecord,
  flipCiphertextByte,
  generateVaultId,
} from '@vaultguard/crypto-core';
import { keyProvider } from '../../config/db.js';
import { authenticateRawApiKey } from '../../middleware/authContext.js';
import { ExternalStoreOrderModel } from '../../models/ExternalStoreOrder.js';
import { appendAuditLog } from '../audit/audit.service.js';
import {
  decryptExternalEnvelope,
  encryptExternalPayload,
} from '../cryptoProxy/cryptoProxy.routes.js';
import {
  isActorSessionBlocked,
  recordAndEvaluateActivity,
} from '../sentinel/sentinel.service.js';

export const storeSandboxRouter = Router();

function getStoreTenantId(headerVal: unknown): string {
  return typeof headerVal === 'string' && headerVal.trim()
    ? headerVal.trim()
    : 'tenant_supershop_bd';
}

storeSandboxRouter.get('/orders', async (req, res, next) => {
  try {
    const storeTenantId = getStoreTenantId(req.headers['x-tenant-id']);
    const orders = await ExternalStoreOrderModel.find({ storeTenantId })
      .sort({ createdAt: -1 })
      .lean();

    const unprotectedOrders = orders.filter((o) => !o.protectedByVaultGuard).length;
    const protectedOrders = orders.length - unprotectedOrders;

    res.json({
      storeTenantId,
      orders,
      summary: {
        totalOrders: orders.length,
        protectedOrders,
        unprotectedOrders,
        exposedPlaintextFields: unprotectedOrders * 5,
      },
    });
  } catch (err) {
    next(err);
  }
});

const checkoutSchema = z.object({
  apiKey: z.string().optional(),
  itemsSummary: z.string().trim().min(2).max(120).default('2x Grocery Basket, 1x Olive Oil'),
  customer: z.object({
    name: z.string().trim().min(2).max(100),
    phone: z.string().trim().min(6).max(24),
    email: z.string().trim().email().max(120),
    address: z.string().trim().min(4).max(220),
    orderTotal: z.string().trim().min(1).max(40),
  }),
});

storeSandboxRouter.post('/checkout', async (req, res, next) => {
  try {
    const parsed = checkoutSchema.parse(req.body ?? {});
    const storeTenantId = getStoreTenantId(req.headers['x-tenant-id']);
    const orderId = generateVaultId('extord');
    const orderNumber = `ORD-BD-${Math.floor(1000 + Math.random() * 9000)}`;
    const rawKey = parsed.apiKey?.trim() ?? '';

    if (!rawKey) {
      // Unprotected mode: store saves raw plaintext directly in its own DB
      const created = await ExternalStoreOrderModel.create({
        orderId,
        storeTenantId,
        orderNumber,
        itemsSummary: parsed.itemsSummary,
        protectedByVaultGuard: false,
        plaintextCustomer: parsed.customer,
      });

      res.status(201).json({
        protectedByVaultGuard: false,
        warning: 'PLAINTEXT_SAVED_IN_STORE_DB',
        order: created.toObject(),
      });
      return;
    }

    // Protected mode: authenticate merchant's VaultGuard API Key & encrypt before saving to Store DB
    const keyAuth = await authenticateRawApiKey(rawKey);
    if (!keyAuth.ok) {
      res.status(keyAuth.status).json({
        error: keyAuth.error,
        message: keyAuth.message,
      });
      return;
    }

    const lock = isActorSessionBlocked(keyAuth.key.tenantId, keyAuth.key.keyId);
    if (lock.blocked) {
      res.status(403).json({
        error: 'API_KEY_BLOCKED_BY_SENTINEL',
        message: `API key '${keyAuth.key.keyPrefix}' is auto-blocked by Sentinel.`,
      });
      return;
    }

    const encrypted = await encryptExternalPayload({
      tenantId: keyAuth.key.tenantId,
      actorId: keyAuth.key.keyId,
      actorRole: keyAuth.key.roleScope,
      data: parsed.customer,
      blindIndexFields: ['phone'],
      recordId: orderId,
    });

    const created = await ExternalStoreOrderModel.create({
      orderId,
      storeTenantId: keyAuth.key.tenantId,
      orderNumber,
      itemsSummary: parsed.itemsSummary,
      protectedByVaultGuard: true,
      apiKeyPrefixUsed: keyAuth.key.keyPrefix,
      encryptedEnvelope: encrypted.envelope,
      blindIndexes: encrypted.blindIndexes,
    });

    res.status(201).json({
      protectedByVaultGuard: true,
      apiKeyPrefixUsed: keyAuth.key.keyPrefix,
      latencyMs: encrypted.latencyMs,
      order: created.toObject(),
    });
  } catch (err) {
    next(err);
  }
});

const storeSearchSchema = z.object({
  apiKey: z.string().min(1),
  phone: z.string().min(3),
});

storeSandboxRouter.post('/search', async (req, res, next) => {
  const start = performance.now();
  try {
    const { apiKey, phone } = storeSearchSchema.parse(req.body ?? {});
    const keyAuth = await authenticateRawApiKey(apiKey);
    if (!keyAuth.ok) {
      res.status(keyAuth.status).json({
        error: keyAuth.error,
        message: keyAuth.message,
      });
      return;
    }

    const indexKey = keyProvider.getBlindIndexKey(keyAuth.key.tenantId);
    let phoneBlindIndex: string;
    try {
      phoneBlindIndex = computeBlindIndex(indexKey, phone);
    } finally {
      indexKey.fill(0);
    }

    const orders = await ExternalStoreOrderModel.find({
      storeTenantId: keyAuth.key.tenantId,
      'blindIndexes.phone': phoneBlindIndex,
    })
      .sort({ createdAt: -1 })
      .lean();

    const latencyMs = Number((performance.now() - start).toFixed(2));
    await appendAuditLog({
      tenantId: keyAuth.key.tenantId,
      actorId: keyAuth.key.keyId,
      actorRole: keyAuth.key.roleScope,
      action: 'SEARCH_BLIND_INDEX',
      purpose: 'EXTERNAL_STORE_PHONE_LOOKUP',
      result: 'SUCCESS',
      latencyMs,
    });

    res.json({
      matchCount: orders.length,
      phoneBlindIndex,
      latencyMs,
      orders,
    });
  } catch (err) {
    next(err);
  }
});

const storeDecryptSchema = z.object({
  orderId: z.string().min(1),
  apiKey: z.string().optional(),
  purpose: z.enum(['ORDER_DELIVERY', 'ADMIN_AUDIT', 'POLICY_FULL', 'ANALYTICS']).optional(),
});

storeSandboxRouter.post('/decrypt', async (req, res, next) => {
  try {
    const parsed = storeDecryptSchema.parse(req.body ?? {});
    const storeTenantId = getStoreTenantId(req.headers['x-tenant-id']);
    const order = await ExternalStoreOrderModel.findOne({
      orderId: parsed.orderId,
      storeTenantId,
    }).lean();

    if (!order) {
      res.status(404).json({
        error: 'ORDER_NOT_FOUND',
        message: `Order '${parsed.orderId}' not found in merchant store database.`,
      });
      return;
    }

    if (!order.protectedByVaultGuard || !order.encryptedEnvelope) {
      res.json({
        orderId: order.orderId,
        unprotected: true,
        warning: 'UNPROTECTED_PLAINTEXT_RECORD',
        data: order.plaintextCustomer,
      });
      return;
    }

    const rawKey = parsed.apiKey?.trim() ?? '';
    if (!rawKey) {
      res.status(401).json({
        error: 'MISSING_API_KEY',
        message:
          'This merchant database record is AES-256-GCM encrypted and cannot be read without a valid VaultGuard API key.',
      });
      return;
    }

    const keyAuth = await authenticateRawApiKey(rawKey);
    if (!keyAuth.ok) {
      res.status(keyAuth.status).json({
        error: keyAuth.error,
        message: keyAuth.message,
      });
      return;
    }

    const lock = isActorSessionBlocked(keyAuth.key.tenantId, keyAuth.key.keyId);
    if (lock.blocked) {
      res.status(403).json({
        error: 'API_KEY_BLOCKED_BY_SENTINEL',
        message: `API key '${keyAuth.key.keyPrefix}' was auto-blocked by VaultGuard Sentinel.`,
      });
      return;
    }

    const result = await decryptExternalEnvelope({
      tenantId: keyAuth.key.tenantId,
      actorId: keyAuth.key.keyId,
      actorRole: keyAuth.key.roleScope,
      envelope: order.encryptedEnvelope,
      purpose: parsed.purpose,
    });

    res.status(result.status).json({
      orderId: order.orderId,
      apiKeyPrefix: keyAuth.key.keyPrefix,
      ...result.body,
    });
  } catch (err) {
    next(err);
  }
});

const storeTamperSchema = z.object({
  orderId: z.string().min(1),
});

storeSandboxRouter.post('/tamper', async (req, res, next) => {
  const start = performance.now();
  try {
    const { orderId } = storeTamperSchema.parse(req.body ?? {});
    const storeTenantId = getStoreTenantId(req.headers['x-tenant-id']);
    const order = await ExternalStoreOrderModel.findOne({
      orderId,
      storeTenantId,
      protectedByVaultGuard: true,
    }).lean();

    if (!order || !order.encryptedEnvelope) {
      res.status(404).json({
        error: 'ENCRYPTED_ORDER_NOT_FOUND',
        message: 'Select a VaultGuard-encrypted order to run tamper verification.',
      });
      return;
    }

    const flipped = flipCiphertextByte(order.encryptedEnvelope.ciphertext, 0);
    let gcmVerificationPassed = true;
    let cryptoError = '';
    let errorCode = '';

    try {
      decryptRecord({
        envelope: {
          ...order.encryptedEnvelope,
          ciphertext: flipped.tamperedCiphertext,
        },
        expectedTenantId: storeTenantId,
        keyProvider,
      });
    } catch (err) {
      gcmVerificationPassed = false;
      cryptoError =
        err instanceof CryptographicTamperError
          ? err.cryptoMessage
          : err instanceof Error
            ? err.message
            : 'Unable to authenticate data';
      errorCode = 'CRYPTO_TAMPER_DETECTED';
    }

    const latencyMs = Number((performance.now() - start).toFixed(2));
    await recordAndEvaluateActivity({
      tenantId: storeTenantId,
      actorId: 'store_tamper_probe',
      actorRole: 'admin',
      recordId: order.orderId,
      outcome: 'tamper',
      persistEvent: true,
    });
    await appendAuditLog({
      tenantId: storeTenantId,
      actorId: 'store_tamper_probe',
      actorRole: 'system',
      action: 'TAMPER_DETECTED',
      recordId: order.orderId,
      purpose: 'EXTERNAL_STORE_TAMPER_TEST',
      result: 'FAILED',
      latencyMs,
    });

    res.json({
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      originalByteHex: flipped.originalByteHex,
      tamperedByteHex: flipped.tamperedByteHex,
      gcmVerificationPassed,
      failClosed: !gcmVerificationPassed,
      errorCode,
      cryptoError,
      latencyMs,
    });
  } catch (err) {
    next(err);
  }
});
