import crypto from 'node:crypto';
import { LocalDevKeyProvider } from './keyProvider.js';
import { decryptRecord, encryptRecord, flipCiphertextByte } from './envelope.js';
import { CryptographicTamperError } from './types.js';

export * from './types.js';
export * from './keyProvider.js';
export * from './envelope.js';
export * from './blindIndex.js';
export * from './hashChain.js';
export * from './apiKeys.js';

export function generateVaultId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;
}

export interface CryptoSelfTestResult {
  passed: boolean;
  latencyMs: number;
  tamperRejected: boolean;
}

/**
 * Runs a fast startup cryptographic self-test verifying AES-256-GCM encryption,
 * authorized decryption, and fail-closed 1-byte tamper rejection.
 */
export function runCryptoSelfTest(): CryptoSelfTestResult {
  const start = performance.now();
  const provider = new LocalDevKeyProvider('vaultguard-self-test-ephemeral-seed');
  const payload = {
    name: 'Self Test',
    phone: '01700000000',
    email: 'selftest@vaultguard.local',
    address: 'Dhaka',
    orderTotal: '৳0',
  };

  const envelope = encryptRecord({
    tenantId: 'tenant_selftest',
    recordId: 'rec_selftest',
    payload,
    keyProvider: provider,
  });

  const recovered = decryptRecord({
    envelope,
    expectedTenantId: 'tenant_selftest',
    keyProvider: provider,
  });

  let tamperRejected = false;
  try {
    const { tamperedCiphertext } = flipCiphertextByte(envelope.ciphertext, 0);
    decryptRecord({
      envelope: { ...envelope, ciphertext: tamperedCiphertext },
      expectedTenantId: 'tenant_selftest',
      keyProvider: provider,
    });
  } catch (err) {
    tamperRejected = err instanceof CryptographicTamperError;
  }

  const latencyMs = Number((performance.now() - start).toFixed(2));
  const passed = recovered.name === payload.name && tamperRejected;

  return {
    passed,
    latencyMs,
    tamperRejected,
  };
}
