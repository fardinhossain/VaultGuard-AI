import crypto from 'node:crypto';
import {
  CryptographicTamperError,
  CustomerPIIPayload,
  EncryptedEnvelope,
  KeyProvider,
  TenantMismatchError,
  WrappedKeyResult,
} from './types.js';

const DEK_LENGTH_BYTES = 32;
const NONCE_LENGTH_BYTES = 12;

export interface EncryptRecordParams<T = CustomerPIIPayload> {
  tenantId: string;
  recordId: string;
  payload: T;
  schemaVersion?: number;
  keyProvider: KeyProvider;
}

export interface DecryptRecordParams {
  envelope: EncryptedEnvelope;
  expectedTenantId: string;
  keyProvider: KeyProvider;
}

export interface RewrapDEKParams {
  envelope: EncryptedEnvelope;
  targetKeyVersion: number;
  keyProvider: KeyProvider;
}

export interface TamperFlipResult {
  tamperedCiphertext: string;
  byteIndex: number;
  originalByteHex: string;
  tamperedByteHex: string;
}

/**
 * Constructs canonical AES-GCM Authenticated Additional Data (AAD)
 * binding ciphertext cryptographically to tenant, record ID, and schema version.
 */
export function buildRecordAAD(tenantId: string, recordId: string, schemaVersion: number): Buffer {
  return Buffer.from(`${tenantId}:${recordId}:v${schemaVersion}`, 'utf8');
}

export function encryptRecord<T = CustomerPIIPayload>({
  tenantId,
  recordId,
  payload,
  schemaVersion = 1,
  keyProvider,
}: EncryptRecordParams<T>): EncryptedEnvelope {
  const dek = crypto.randomBytes(DEK_LENGTH_BYTES);
  const dataNonce = crypto.randomBytes(NONCE_LENGTH_BYTES);

  try {
    const aad = buildRecordAAD(tenantId, recordId, schemaVersion);
    const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');

    const cipher = crypto.createCipheriv('aes-256-gcm', dek, dataNonce);
    cipher.setAAD(aad);

    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const dataAuthTag = cipher.getAuthTag();
    const wrapped = keyProvider.wrapKey(tenantId, dek);

    return {
      recordId,
      tenantId,
      algorithm: 'AES-256-GCM',
      schemaVersion,
      keyVersion: wrapped.keyVersion,
      ciphertext: ciphertext.toString('base64'),
      dataNonce: dataNonce.toString('base64'),
      dataAuthTag: dataAuthTag.toString('base64'),
      wrappedDEK: wrapped.wrappedDEK,
      wrapNonce: wrapped.wrapNonce,
      wrapAuthTag: wrapped.wrapAuthTag,
    };
  } finally {
    dek.fill(0);
  }
}

export function decryptRecord<T = CustomerPIIPayload>({
  envelope,
  expectedTenantId,
  keyProvider,
}: DecryptRecordParams): T {
  if (envelope.tenantId !== expectedTenantId) {
    throw new TenantMismatchError(expectedTenantId, envelope.tenantId);
  }

  const dek = keyProvider.unwrapKey(
    envelope.tenantId,
    envelope.wrappedDEK,
    envelope.wrapNonce,
    envelope.wrapAuthTag,
    envelope.keyVersion,
  );

  try {
    const aad = buildRecordAAD(envelope.tenantId, envelope.recordId, envelope.schemaVersion);
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      dek,
      Buffer.from(envelope.dataNonce, 'base64'),
    );
    decipher.setAAD(aad);
    decipher.setAuthTag(Buffer.from(envelope.dataAuthTag, 'base64'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString('utf8')) as T;
  } catch (err) {
    if (err instanceof CryptographicTamperError) {
      throw err;
    }
    const reason = err instanceof Error ? err.message : 'Unable to authenticate data';
    throw new CryptographicTamperError(reason);
  } finally {
    dek.fill(0);
  }
}

/**
 * Re-wraps the record's DEK under a rotated KEK version without decrypting or modifying ciphertext.
 */
export function rewrapRecordDEK({
  envelope,
  targetKeyVersion,
  keyProvider,
}: RewrapDEKParams): WrappedKeyResult {
  const dek = keyProvider.unwrapKey(
    envelope.tenantId,
    envelope.wrappedDEK,
    envelope.wrapNonce,
    envelope.wrapAuthTag,
    envelope.keyVersion,
  );

  try {
    return keyProvider.wrapKey(envelope.tenantId, dek, targetKeyVersion);
  } finally {
    dek.fill(0);
  }
}

/**
 * Flips 1 byte of a base64 ciphertext in memory to demonstrate fail-closed AES-GCM tamper detection.
 */
export function flipCiphertextByte(base64Ciphertext: string, byteIndex = 0): TamperFlipResult {
  const buffer = Buffer.from(base64Ciphertext, 'base64');
  if (buffer.length === 0) {
    throw new Error('Cannot flip byte in empty ciphertext.');
  }

  const idx = Math.max(0, Math.min(byteIndex, buffer.length - 1));
  const original = buffer[idx] ?? 0;
  const flipped = original ^ 0xff;
  buffer[idx] = flipped;

  return {
    tamperedCiphertext: buffer.toString('base64'),
    byteIndex: idx,
    originalByteHex: `0x${original.toString(16).padStart(2, '0')}`,
    tamperedByteHex: `0x${flipped.toString(16).padStart(2, '0')}`,
  };
}
