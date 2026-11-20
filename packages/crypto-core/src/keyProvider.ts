import crypto from 'node:crypto';
import { KeyProvider, KeyRotationResult, KeyUnwrapError, WrappedKeyResult } from './types.js';

const KEY_LENGTH_BYTES = 32;
const NONCE_LENGTH_BYTES = 12;

/**
 * Simulates an external KMS/HSM for zero-cost local MVP execution.
 * Derives tenant-isolated KEKs and blind-index keys on demand via HKDF-SHA-256
 * so no raw master or key wrapping keys are ever persisted in MongoDB.
 */
export class LocalDevKeyProvider implements KeyProvider {
  public readonly providerName = 'local-dev-kms';
  private readonly masterSeed: Buffer;
  private readonly activeVersions = new Map<string, number>();

  constructor(masterSeed: string) {
    if (!masterSeed || masterSeed.trim().length < 16) {
      throw new Error('LocalDevKeyProvider requires a non-empty masterSeed (>= 16 chars).');
    }
    this.masterSeed = Buffer.from(masterSeed, 'utf8');
  }

  public ensureTenantKeys(tenantId: string): number {
    const existing = this.activeVersions.get(tenantId);
    if (existing !== undefined) {
      return existing;
    }
    this.activeVersions.set(tenantId, 1);
    return 1;
  }

  public getActiveKeyVersion(tenantId: string): number {
    return this.ensureTenantKeys(tenantId);
  }

  public syncTenantKeyVersion(tenantId: string, version: number): void {
    if (!Number.isInteger(version) || version < 1) {
      throw new Error(`Invalid key version '${version}' for tenant '${tenantId}'.`);
    }
    this.activeVersions.set(tenantId, version);
  }

  public rotateTenantKEK(tenantId: string): KeyRotationResult {
    const previousVersion = this.getActiveKeyVersion(tenantId);
    const newVersion = previousVersion + 1;
    this.activeVersions.set(tenantId, newVersion);
    return { previousVersion, newVersion };
  }

  public wrapKey(tenantId: string, dek: Buffer, explicitVersion?: number): WrappedKeyResult {
    if (dek.length !== KEY_LENGTH_BYTES) {
      throw new Error(`DEK must be exactly ${KEY_LENGTH_BYTES} bytes.`);
    }
    const keyVersion = explicitVersion ?? this.getActiveKeyVersion(tenantId);
    const kek = this.deriveKEK(tenantId, keyVersion);
    const wrapNonce = crypto.randomBytes(NONCE_LENGTH_BYTES);

    try {
      const cipher = crypto.createCipheriv('aes-256-gcm', kek, wrapNonce);
      cipher.setAAD(this.buildWrapAAD(tenantId, keyVersion));
      const encrypted = Buffer.concat([cipher.update(dek), cipher.final()]);
      const wrapAuthTag = cipher.getAuthTag();

      return {
        wrappedDEK: encrypted.toString('base64'),
        wrapNonce: wrapNonce.toString('base64'),
        wrapAuthTag: wrapAuthTag.toString('base64'),
        keyVersion,
      };
    } finally {
      kek.fill(0);
    }
  }

  public unwrapKey(
    tenantId: string,
    wrappedDEK: string,
    wrapNonce: string,
    wrapAuthTag: string,
    keyVersion: number,
  ): Buffer {
    const kek = this.deriveKEK(tenantId, keyVersion);
    try {
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        kek,
        Buffer.from(wrapNonce, 'base64'),
      );
      decipher.setAAD(this.buildWrapAAD(tenantId, keyVersion));
      decipher.setAuthTag(Buffer.from(wrapAuthTag, 'base64'));
      return Buffer.concat([
        decipher.update(Buffer.from(wrappedDEK, 'base64')),
        decipher.final(),
      ]);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Key unwrap authentication failed';
      throw new KeyUnwrapError(`Failed to unwrap DEK under KEK v${keyVersion}: ${reason}`);
    } finally {
      kek.fill(0);
    }
  }

  public getBlindIndexKey(tenantId: string): Buffer {
    const raw = crypto.hkdfSync(
      'sha256',
      this.masterSeed,
      Buffer.from(`vaultguard:blind-index:${tenantId}`, 'utf8'),
      Buffer.from('phone-v1', 'utf8'),
      KEY_LENGTH_BYTES,
    );
    return Buffer.from(raw);
  }

  private deriveKEK(tenantId: string, keyVersion: number): Buffer {
    const raw = crypto.hkdfSync(
      'sha256',
      this.masterSeed,
      Buffer.from(`vaultguard:kek:${tenantId}`, 'utf8'),
      Buffer.from(`v${keyVersion}`, 'utf8'),
      KEY_LENGTH_BYTES,
    );
    return Buffer.from(raw);
  }

  private buildWrapAAD(tenantId: string, keyVersion: number): Buffer {
    return Buffer.from(`${tenantId}:kek-v${keyVersion}`, 'utf8');
  }
}
