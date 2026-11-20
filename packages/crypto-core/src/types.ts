export interface CustomerPIIPayload {
  name: string;
  phone: string;
  email: string;
  address: string;
  orderTotal: string;
}

export interface EncryptedEnvelope {
  recordId: string;
  tenantId: string;
  algorithm: 'AES-256-GCM';
  schemaVersion: number;
  keyVersion: number;
  ciphertext: string;
  dataNonce: string;
  dataAuthTag: string;
  wrappedDEK: string;
  wrapNonce: string;
  wrapAuthTag: string;
}

export interface WrappedKeyResult {
  wrappedDEK: string;
  wrapNonce: string;
  wrapAuthTag: string;
  keyVersion: number;
}

export interface KeyRotationResult {
  previousVersion: number;
  newVersion: number;
}

export interface KeyProvider {
  readonly providerName: string;
  ensureTenantKeys(tenantId: string): number;
  getActiveKeyVersion(tenantId: string): number;
  syncTenantKeyVersion(tenantId: string, version: number): void;
  wrapKey(tenantId: string, dek: Buffer, explicitVersion?: number): WrappedKeyResult;
  unwrapKey(
    tenantId: string,
    wrappedDEK: string,
    wrapNonce: string,
    wrapAuthTag: string,
    keyVersion: number,
  ): Buffer;
  rotateTenantKEK(tenantId: string): KeyRotationResult;
  getBlindIndexKey(tenantId: string): Buffer;
}

export interface AuditHashInput {
  auditId: string;
  tenantId: string;
  seq: number;
  actorId: string;
  actorRole: string;
  action: string;
  recordId?: string | null;
  purpose?: string | null;
  result: string;
  latencyMs: number;
  timestamp: Date | string;
}

export interface AuditChainEntry extends AuditHashInput {
  prevHash: string;
  entryHash: string;
}

export interface ChainVerificationResult {
  valid: boolean;
  checkedCount: number;
  latestHash: string;
  brokenAtIndex?: number;
  brokenAuditId?: string;
  reason?: string;
}

export class CryptographicTamperError extends Error {
  public readonly code = 'CRYPTO_TAMPER_DETECTED';
  public readonly cryptoMessage: string;

  constructor(cryptoMessage: string) {
    super(`AES-256-GCM integrity verification failed: ${cryptoMessage}`);
    this.name = 'CryptographicTamperError';
    this.cryptoMessage = cryptoMessage;
  }
}

export class KeyUnwrapError extends Error {
  public readonly code = 'KEY_UNWRAP_FAILED';

  constructor(message: string) {
    super(message);
    this.name = 'KeyUnwrapError';
  }
}

export class TenantMismatchError extends Error {
  public readonly code = 'TENANT_AAD_MISMATCH';

  constructor(expectedTenantId: string, actualTenantId: string) {
    super(
      `Cross-tenant access blocked: expected '${expectedTenantId}', record belongs to '${actualTenantId}'.`,
    );
    this.name = 'TenantMismatchError';
  }
}
