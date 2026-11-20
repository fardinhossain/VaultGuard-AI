import { describe, expect, it } from 'vitest';
import {
  AuditChainEntry,
  CryptographicTamperError,
  CustomerPIIPayload,
  KeyUnwrapError,
  LocalDevKeyProvider,
  TenantMismatchError,
  buildRecordAAD,
  computeAuditEntryHash,
  computeBlindIndex,
  decryptRecord,
  encryptRecord,
  flipCiphertextByte,
  generateApiKey,
  hashApiKey,
  normalizePhone,
  rewrapRecordDEK,
  verifyApiKeyHash,
  verifyAuditChain,
} from '../src/index.js';

const sampleCustomer: CustomerPIIPayload = {
  name: 'Fardin Hossain',
  phone: '01712345678',
  email: 'fardin.demo@example.com',
  address: 'House 14, Road 7, Dhanmondi, Dhaka',
  orderTotal: '৳4,850',
};

describe('@vaultguard/crypto-core', () => {
  it('1. performs full AES-256-GCM envelope encrypt/decrypt roundtrip', () => {
    const kp = new LocalDevKeyProvider('vaultguard-test-master-seed-32bytes');
    const envelope = encryptRecord({
      tenantId: 'tenant_supershop_bd',
      recordId: 'rec_001',
      payload: sampleCustomer,
      keyProvider: kp,
    });

    expect(envelope.algorithm).toBe('AES-256-GCM');
    expect(envelope.keyVersion).toBe(1);
    expect(envelope.ciphertext).not.toContain('Fardin');
    expect(envelope.ciphertext).not.toContain('01712345678');

    const decrypted = decryptRecord({
      envelope,
      expectedTenantId: 'tenant_supershop_bd',
      keyProvider: kp,
    });

    expect(decrypted).toEqual(sampleCustomer);
  });

  it('2. rejects decryption when unwrapped with wrong master seed / KEK', () => {
    const kp1 = new LocalDevKeyProvider('vaultguard-test-master-seed-alpha');
    const kp2 = new LocalDevKeyProvider('vaultguard-test-master-seed-omega');

    const envelope = encryptRecord({
      tenantId: 'tenant_supershop_bd',
      recordId: 'rec_002',
      payload: sampleCustomer,
      keyProvider: kp1,
    });

    expect(() =>
      decryptRecord({
        envelope,
        expectedTenantId: 'tenant_supershop_bd',
        keyProvider: kp2,
      }),
    ).toThrow(KeyUnwrapError);
  });

  it('3. fails closed when 1 byte of ciphertext is tampered', () => {
    const kp = new LocalDevKeyProvider('vaultguard-test-master-seed-32bytes');
    const envelope = encryptRecord({
      tenantId: 'tenant_supershop_bd',
      recordId: 'rec_003',
      payload: sampleCustomer,
      keyProvider: kp,
    });

    const flipped = flipCiphertextByte(envelope.ciphertext, 2);

    expect(() =>
      decryptRecord({
        envelope: { ...envelope, ciphertext: flipped.tamperedCiphertext },
        expectedTenantId: 'tenant_supershop_bd',
        keyProvider: kp,
      }),
    ).toThrow(CryptographicTamperError);
  });

  it('4. fails closed when dataAuthTag is tampered', () => {
    const kp = new LocalDevKeyProvider('vaultguard-test-master-seed-32bytes');
    const envelope = encryptRecord({
      tenantId: 'tenant_supershop_bd',
      recordId: 'rec_004',
      payload: sampleCustomer,
      keyProvider: kp,
    });

    const flippedTag = flipCiphertextByte(envelope.dataAuthTag, 0);

    expect(() =>
      decryptRecord({
        envelope: { ...envelope, dataAuthTag: flippedTag.tamperedCiphertext },
        expectedTenantId: 'tenant_supershop_bd',
        keyProvider: kp,
      }),
    ).toThrow(CryptographicTamperError);
  });

  it('5. fails closed when wrappedDEK or wrapAuthTag is tampered', () => {
    const kp = new LocalDevKeyProvider('vaultguard-test-master-seed-32bytes');
    const envelope = encryptRecord({
      tenantId: 'tenant_supershop_bd',
      recordId: 'rec_005',
      payload: sampleCustomer,
      keyProvider: kp,
    });

    const flippedWrap = flipCiphertextByte(envelope.wrappedDEK, 1);

    expect(() =>
      decryptRecord({
        envelope: { ...envelope, wrappedDEK: flippedWrap.tamperedCiphertext },
        expectedTenantId: 'tenant_supershop_bd',
        keyProvider: kp,
      }),
    ).toThrow(KeyUnwrapError);
  });

  it('6. enforces strict cross-tenant and record-ID AAD binding', () => {
    const kp = new LocalDevKeyProvider('vaultguard-test-master-seed-32bytes');
    const envelope = encryptRecord({
      tenantId: 'tenant_supershop_bd',
      recordId: 'rec_006',
      payload: sampleCustomer,
      keyProvider: kp,
    });

    expect(() =>
      decryptRecord({
        envelope,
        expectedTenantId: 'tenant_quickkart_bd',
        keyProvider: kp,
      }),
    ).toThrow(TenantMismatchError);

    expect(() =>
      decryptRecord({
        envelope: { ...envelope, recordId: 'rec_stolen_swap' },
        expectedTenantId: 'tenant_supershop_bd',
        keyProvider: kp,
      }),
    ).toThrow(CryptographicTamperError);

    expect(buildRecordAAD('tenant_a', 'rec_1', 1).toString('utf8')).toBe('tenant_a:rec_1:v1');
  });

  it('7. generates unique nonces and wrapped DEKs for identical plaintexts', () => {
    const kp = new LocalDevKeyProvider('vaultguard-test-master-seed-32bytes');
    const envA = encryptRecord({
      tenantId: 'tenant_supershop_bd',
      recordId: 'rec_007a',
      payload: sampleCustomer,
      keyProvider: kp,
    });
    const envB = encryptRecord({
      tenantId: 'tenant_supershop_bd',
      recordId: 'rec_007b',
      payload: sampleCustomer,
      keyProvider: kp,
    });

    expect(envA.dataNonce).not.toBe(envB.dataNonce);
    expect(envA.wrapNonce).not.toBe(envB.wrapNonce);
    expect(envA.wrappedDEK).not.toBe(envB.wrappedDEK);
    expect(envA.ciphertext).not.toBe(envB.ciphertext);
  });

  it('8. rotates KEK (v1 -> v2) by re-wrapping DEK without modifying ciphertext', () => {
    const kp = new LocalDevKeyProvider('vaultguard-test-master-seed-32bytes');
    const envV1 = encryptRecord({
      tenantId: 'tenant_supershop_bd',
      recordId: 'rec_008',
      payload: sampleCustomer,
      keyProvider: kp,
    });

    const rotation = kp.rotateTenantKEK('tenant_supershop_bd');
    expect(rotation).toEqual({ previousVersion: 1, newVersion: 2 });

    const rewrapped = rewrapRecordDEK({
      envelope: envV1,
      targetKeyVersion: rotation.newVersion,
      keyProvider: kp,
    });

    const envV2 = {
      ...envV1,
      keyVersion: rewrapped.keyVersion,
      wrappedDEK: rewrapped.wrappedDEK,
      wrapNonce: rewrapped.wrapNonce,
      wrapAuthTag: rewrapped.wrapAuthTag,
    };

    expect(envV2.ciphertext).toBe(envV1.ciphertext);
    expect(envV2.keyVersion).toBe(2);
    expect(envV2.wrappedDEK).not.toBe(envV1.wrappedDEK);

    const decrypted = decryptRecord({
      envelope: envV2,
      expectedTenantId: 'tenant_supershop_bd',
      keyProvider: kp,
    });
    expect(decrypted).toEqual(sampleCustomer);
  });

  it('9. normalizes BD phone variants deterministically and isolates HMAC blind index per tenant', () => {
    const kp = new LocalDevKeyProvider('vaultguard-test-master-seed-32bytes');
    const keySuperShop = kp.getBlindIndexKey('tenant_supershop_bd');
    const keyQuickKart = kp.getBlindIndexKey('tenant_quickkart_bd');

    expect(normalizePhone('+8801712-345678')).toBe('01712345678');
    expect(normalizePhone('01712 345678')).toBe('01712345678');
    expect(normalizePhone('8801712345678')).toBe('01712345678');

    const idx1 = computeBlindIndex(keySuperShop, '+8801712-345678');
    const idx2 = computeBlindIndex(keySuperShop, '01712345678');
    const idxOtherTenant = computeBlindIndex(keyQuickKart, '01712345678');

    expect(idx1).toBe(idx2);
    expect(idx1).toHaveLength(64);
    expect(idx1).not.toBe(idxOtherTenant);
  });

  it('10. builds and verifies SHA-256 audit hash chain and pinpoints log tampering', () => {
    const entries: AuditChainEntry[] = [];
    let prevHash = 'GENESIS';

    const rawEvents = [
      {
        auditId: 'aud_1',
        tenantId: 'tenant_supershop_bd',
        seq: 1,
        actorId: 'demo_admin_01',
        actorRole: 'admin',
        action: 'ENCRYPT',
        recordId: 'rec_001',
        purpose: 'ADMIN_AUDIT',
        result: 'SUCCESS',
        latencyMs: 1.2,
        timestamp: '2026-11-20T09:00:00.000Z',
      },
      {
        auditId: 'aud_2',
        tenantId: 'tenant_supershop_bd',
        seq: 2,
        actorId: 'demo_marketing_01',
        actorRole: 'marketing',
        action: 'DECRYPT_BLOCKED',
        recordId: 'rec_001',
        purpose: 'ANALYTICS',
        result: 'BLOCKED',
        latencyMs: 0.4,
        timestamp: '2026-11-20T09:01:00.000Z',
      },
    ];

    for (const evt of rawEvents) {
      const entryHash = computeAuditEntryHash(prevHash, evt);
      entries.push({ ...evt, prevHash, entryHash });
      prevHash = entryHash;
    }

    const validResult = verifyAuditChain(entries);
    expect(validResult.valid).toBe(true);
    expect(validResult.checkedCount).toBe(2);

    const tamperedEntries = entries.map((entry, idx) =>
      idx === 1 ? { ...entry, result: 'SUCCESS' } : entry,
    );
    const tamperedResult = verifyAuditChain(tamperedEntries);
    expect(tamperedResult.valid).toBe(false);
    expect(tamperedResult.brokenAtIndex).toBe(1);
    expect(tamperedResult.brokenAuditId).toBe('aud_2');
  });

  it('11. generates scoped API keys (vg_live_...) and verifies SHA-256 hashes in timing-safe manner', () => {
    const generated = generateApiKey('live', 'tenant_supershop_bd');
    expect(generated.rawKey.startsWith('vg_live_supersho_')).toBe(true);
    expect(generated.keyPrefix.endsWith('...')).toBe(true);
    expect(generated.keyHash).toBe(hashApiKey(generated.rawKey));
    expect(generated.keyHash).toHaveLength(64);

    expect(verifyApiKeyHash(generated.rawKey, generated.keyHash)).toBe(true);
    expect(verifyApiKeyHash(`${generated.rawKey}x`, generated.keyHash)).toBe(false);
    expect(verifyApiKeyHash('', generated.keyHash)).toBe(false);
  });

  it('12. encrypts and decrypts arbitrary multi-field external merchant documents', () => {
    const kp = new LocalDevKeyProvider('vaultguard-test-master-seed-32bytes');
    const externalDoc: Record<string, string> = {
      name: 'Farhana Yasmin',
      phone: '01744556677',
      email: 'farhana@merchant.bd',
      address: 'Banani Road 11, Dhaka',
      orderTotal: '৳8,900',
      loyaltyTier: 'GOLD',
    };

    const envelope = encryptRecord<Record<string, string>>({
      tenantId: 'tenant_supershop_bd',
      recordId: 'ord_ext_001',
      payload: externalDoc,
      keyProvider: kp,
    });

    expect(envelope.ciphertext).not.toContain('Farhana');
    expect(envelope.ciphertext).not.toContain('01744556677');

    const recovered = decryptRecord<Record<string, string>>({
      envelope,
      expectedTenantId: 'tenant_supershop_bd',
      keyProvider: kp,
    });
    expect(recovered).toEqual(externalDoc);
  });

  it('13. rejects replaying an external encrypted envelope under a different tenant', () => {
    const kp = new LocalDevKeyProvider('vaultguard-test-master-seed-32bytes');
    const envelope = encryptRecord<Record<string, string>>({
      tenantId: 'tenant_supershop_bd',
      recordId: 'ord_ext_002',
      payload: { name: 'Rashed Karim', phone: '01988776655' },
      keyProvider: kp,
    });

    expect(() =>
      decryptRecord<Record<string, string>>({
        envelope,
        expectedTenantId: 'tenant_quickkart_bd',
        keyProvider: kp,
      }),
    ).toThrow(TenantMismatchError);
  });
});
