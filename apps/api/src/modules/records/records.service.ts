import {
  CustomerPIIPayload,
  computeBlindIndex,
  encryptRecord,
  generateVaultId,
  normalizePhone,
} from '@vaultguard/crypto-core';
import { keyProvider } from '../../config/db.js';
import { EncryptedRecordDoc, EncryptedRecordModel } from '../../models/EncryptedRecord.js';
import { TenantModel } from '../../models/Tenant.js';
import { AuditActorRole } from '../../models/AuditLog.js';
import { appendAuditLog } from '../audit/audit.service.js';

export function formatPreview(value: string, head = 12, tail = 10): string {
  if (value.length <= head + tail + 3) {
    return value;
  }
  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

export function serializeEncryptedSummary(doc: EncryptedRecordDoc) {
  return {
    recordId: doc.recordId,
    tenantId: doc.tenantId,
    recordType: doc.recordType,
    algorithm: doc.algorithm,
    schemaVersion: doc.schemaVersion,
    keyVersion: doc.keyVersion,
    ciphertextPreview: formatPreview(doc.ciphertext, 14, 10),
    dataNonce: doc.dataNonce,
    dataAuthTagPreview: formatPreview(doc.dataAuthTag, 10, 6),
    wrappedDekPreview: formatPreview(doc.wrappedDEK, 12, 8),
    phoneBlindIndex: doc.phoneBlindIndex,
    phoneBlindIndexPreview: formatPreview(doc.phoneBlindIndex, 12, 8),
    fieldCount: doc.fieldCount,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function createEncryptedCustomerRecord(params: {
  tenantId: string;
  actorId: string;
  actorRole: AuditActorRole;
  payload: CustomerPIIPayload;
  recordId?: string;
}) {
  const start = performance.now();
  const tenant = await TenantModel.findOne({ tenantId: params.tenantId }).lean();
  if (!tenant) {
    throw new Error(`Tenant '${params.tenantId}' not found.`);
  }

  keyProvider.syncTenantKeyVersion(params.tenantId, tenant.activeKeyVersion);
  const recordId = params.recordId ?? generateVaultId('rec');

  const envelope = encryptRecord({
    tenantId: params.tenantId,
    recordId,
    payload: params.payload,
    schemaVersion: 1,
    keyProvider,
  });

  const indexKey = keyProvider.getBlindIndexKey(params.tenantId);
  let phoneBlindIndex: string;
  try {
    phoneBlindIndex = computeBlindIndex(indexKey, params.payload.phone);
  } finally {
    indexKey.fill(0);
  }

  const created = await EncryptedRecordModel.create({
    ...envelope,
    recordType: 'customer',
    phoneBlindIndex,
    fieldCount: Object.keys(params.payload).length,
  });

  const latencyMs = Number((performance.now() - start).toFixed(2));
  await appendAuditLog({
    tenantId: params.tenantId,
    actorId: params.actorId,
    actorRole: params.actorRole,
    action: 'ENCRYPT',
    recordId,
    purpose: 'CUSTOMER_ONBOARDING',
    result: 'SUCCESS',
    latencyMs,
  });

  return {
    recordId,
    tenantId: params.tenantId,
    algorithm: envelope.algorithm,
    keyVersion: envelope.keyVersion,
    ciphertextPreview: formatPreview(envelope.ciphertext, 12, 10),
    phoneBlindIndex,
    latencyMs,
    record: serializeEncryptedSummary(created.toObject()),
  };
}

export async function searchEncryptedRecordsByPhone(params: {
  tenantId: string;
  actorId: string;
  actorRole: AuditActorRole;
  rawPhone: string;
}) {
  const start = performance.now();
  const normalized = normalizePhone(params.rawPhone);
  const indexKey = keyProvider.getBlindIndexKey(params.tenantId);
  let phoneBlindIndex: string;
  try {
    phoneBlindIndex = computeBlindIndex(indexKey, normalized);
  } finally {
    indexKey.fill(0);
  }

  const matches = await EncryptedRecordModel.find({
    tenantId: params.tenantId,
    phoneBlindIndex,
  })
    .sort({ createdAt: -1 })
    .lean();

  const latencyMs = Number((performance.now() - start).toFixed(2));
  await appendAuditLog({
    tenantId: params.tenantId,
    actorId: params.actorId,
    actorRole: params.actorRole,
    action: 'SEARCH_BLIND_INDEX',
    recordId: matches[0]?.recordId,
    purpose: 'BLIND_INDEX_LOOKUP',
    result: 'SUCCESS',
    latencyMs,
  });

  return {
    normalizedPhoneHint: `***${normalized.slice(-4)}`,
    phoneBlindIndex,
    matchCount: matches.length,
    latencyMs,
    records: matches.map(serializeEncryptedSummary),
  };
}
