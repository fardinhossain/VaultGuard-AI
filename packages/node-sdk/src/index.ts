export type ActorRole = 'admin' | 'delivery' | 'marketing';
export type AccessPurpose = 'ORDER_DELIVERY' | 'ADMIN_AUDIT' | 'POLICY_FULL' | 'ANALYTICS';

export interface CustomerPIIInput {
  name: string;
  phone: string;
  email: string;
  address: string;
  orderTotal: string;
}

export interface EncryptedEnvelopePayload {
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

export interface ExternalEncryptResponse {
  recordId: string;
  tenantId: string;
  algorithm: 'AES-256-GCM';
  keyVersion: number;
  envelope: EncryptedEnvelopePayload;
  blindIndexes: Record<string, string>;
  latencyMs: number;
  storedInVaultGuard: false;
}

export interface ExternalDecryptResponse<T = Record<string, string>> {
  recordId: string;
  tenantId: string;
  role: ActorRole;
  purpose: AccessPurpose;
  data: T;
  integrityVerified: boolean;
  keyVersion: number;
  latencyMs: number;
}

export interface EncryptedRecordSummary {
  recordId: string;
  tenantId: string;
  algorithm: string;
  keyVersion: number;
  ciphertextPreview: string;
  dataNonce: string;
  phoneBlindIndex: string;
  fieldCount: number;
  createdAt: string;
}

export interface EncryptResponse {
  recordId: string;
  tenantId: string;
  algorithm: string;
  keyVersion: number;
  ciphertextPreview: string;
  phoneBlindIndex: string;
  latencyMs: number;
  record: EncryptedRecordSummary;
}

export interface SearchResponse {
  normalizedPhoneHint: string;
  phoneBlindIndex: string;
  matchCount: number;
  latencyMs: number;
  records: EncryptedRecordSummary[];
}

export interface DecryptResponse {
  recordId: string;
  role: ActorRole;
  purpose: AccessPurpose;
  data: CustomerPIIInput;
  integrityVerified: boolean;
  keyVersion: number;
  latencyMs: number;
}

export interface RotateKeyResponse {
  tenantId: string;
  previousVersion: number;
  newVersion: number;
  recordsRewrapped: number;
  ciphertextModified: boolean;
  latencyMs: number;
}

export interface AuditVerificationResponse {
  valid: boolean;
  checkedCount: number;
  latestHash: string;
  brokenAtIndex?: number;
  brokenAuditId?: string;
}

export type VaultGuardClientConfig =
  | {
      apiKey: string;
      endpoint?: string;
    }
  | {
      endpoint: string;
      tenantId: string;
      actorId: string;
      actorRole: ActorRole;
      token?: string;
      apiKey?: string;
    };

export class VaultGuardApiError extends Error {
  public readonly status: number;
  public readonly errorCode: string;
  public readonly sentinelRiskImpact?: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    status: number,
    errorCode: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'VaultGuardApiError';
    this.status = status;
    this.errorCode = errorCode;
    this.sentinelRiskImpact =
      typeof details?.sentinelRiskImpact === 'string' ? details.sentinelRiskImpact : undefined;
    this.details = details;
  }
}

export class VaultGuardClient {
  private readonly endpoint: string;
  private readonly apiKey?: string;
  private readonly tenantId?: string;
  private readonly actorId?: string;
  private readonly actorRole?: ActorRole;
  private token?: string;

  constructor(config: VaultGuardClientConfig) {
    this.endpoint = (config.endpoint || 'http://localhost:4000/v1').replace(/\/+$/, '');
    if ('apiKey' in config && config.apiKey) {
      this.apiKey = config.apiKey;
    }
    if ('tenantId' in config) {
      this.tenantId = config.tenantId;
      this.actorId = config.actorId;
      this.actorRole = config.actorRole;
      this.token = config.token;
    }
  }

  public withApiKey(apiKey: string): VaultGuardClient {
    return new VaultGuardClient({
      endpoint: this.endpoint,
      apiKey,
    });
  }

  public withRole(actorRole: ActorRole, actorId?: string): VaultGuardClient {
    if (!this.tenantId) {
      throw new Error('withRole requires legacy tenantId mode; use withApiKey(newKey) for API-key clients.');
    }
    return new VaultGuardClient({
      endpoint: this.endpoint,
      tenantId: this.tenantId,
      actorRole,
      actorId: actorId ?? `${actorRole}_sdk_actor`,
    });
  }

  // --- Primary Zero-Storage External Database Protection Methods ---

  public async encryptFields(
    data: Record<string, string | number | boolean | null>,
    options?: { blindIndexFields?: string[]; recordId?: string },
  ): Promise<ExternalEncryptResponse> {
    return this.request<ExternalEncryptResponse>('/crypto/encrypt', {
      method: 'POST',
      body: JSON.stringify({
        data,
        blindIndexFields: options?.blindIndexFields,
        recordId: options?.recordId,
      }),
    });
  }

  public async createBlindIndex(
    value: string,
    field = 'phone',
  ): Promise<{ field: string; blindIndex: string; latencyMs: number }> {
    return this.request('/crypto/blind-index', {
      method: 'POST',
      body: JSON.stringify({ field, value }),
    });
  }

  public async decryptEnvelope<T = Record<string, string>>(
    envelope: EncryptedEnvelopePayload,
    options?: { purpose?: AccessPurpose },
  ): Promise<ExternalDecryptResponse<T>> {
    return this.request<ExternalDecryptResponse<T>>('/crypto/decrypt', {
      method: 'POST',
      body: JSON.stringify({
        envelope,
        purpose: options?.purpose,
      }),
    });
  }

  public async rewrapEnvelope(envelope: EncryptedEnvelopePayload): Promise<{
    previousKeyVersion: number;
    newKeyVersion: number;
    ciphertextModified: boolean;
    envelope: EncryptedEnvelopePayload;
  }> {
    return this.request('/crypto/rewrap', {
      method: 'POST',
      body: JSON.stringify({ envelope }),
    });
  }

  /**
   * Drop-in helper for any merchant MongoDB / PostgreSQL / MySQL document:
   * strips sensitive fields, encrypts them via VaultGuard API key (zero storage in VaultGuard),
   * and returns the safe document ready to persist into the merchant's own DB.
   */
  public async protectDocument<T extends Record<string, unknown>>(
    doc: T,
    options: { sensitiveFields: string[]; blindIndexFields?: string[]; recordId?: string },
  ): Promise<
    Record<string, unknown> & {
      _vaultguard: EncryptedEnvelopePayload;
      blindIndexes: Record<string, string>;
    }
  > {
    const sensitivePayload: Record<string, string> = {};
    const safeDoc: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(doc)) {
      if (options.sensitiveFields.includes(k)) {
        sensitivePayload[k] = String(v ?? '');
      } else {
        safeDoc[k] = v;
      }
    }

    const encrypted = await this.encryptFields(sensitivePayload, {
      blindIndexFields: options.blindIndexFields,
      recordId: options.recordId,
    });

    return {
      ...safeDoc,
      _vaultguard: encrypted.envelope,
      blindIndexes: encrypted.blindIndexes,
    };
  }

  /**
   * Restores protected fields from a document fetched out of the merchant's own DB.
   * Respects API key role scope & purpose policies automatically.
   */
  public async unprotectDocument<T extends Record<string, unknown>>(
    storedDoc: T & { _vaultguard: EncryptedEnvelopePayload },
    options?: { purpose?: AccessPurpose },
  ): Promise<Record<string, unknown>> {
    const decrypted = await this.decryptEnvelope(storedDoc._vaultguard, options);
    const { _vaultguard: _omitEnv, blindIndexes: _omitIdx, ...rest } = storedDoc as Record<
      string,
      unknown
    >;
    return {
      ...rest,
      ...decrypted.data,
      _vaultguardMeta: {
        role: decrypted.role,
        purpose: decrypted.purpose,
        integrityVerified: decrypted.integrityVerified,
        keyVersion: decrypted.keyVersion,
      },
    };
  }

  // --- Legacy Vault-Hosted Methods (Kept for backward compatibility) ---

  public async encrypt(customer: CustomerPIIInput): Promise<EncryptResponse> {
    return this.request<EncryptResponse>('/records', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
  }

  public async searchByPhone(phone: string): Promise<SearchResponse> {
    return this.request<SearchResponse>('/records/search', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }

  public async decrypt(
    recordId: string,
    options?: { purpose?: AccessPurpose },
  ): Promise<DecryptResponse> {
    return this.request<DecryptResponse>(`/records/${encodeURIComponent(recordId)}/decrypt`, {
      method: 'POST',
      body: JSON.stringify(options ?? {}),
    });
  }

  public async listRecords(): Promise<{
    tenantId: string;
    total: number;
    records: EncryptedRecordSummary[];
  }> {
    return this.request('/records', { method: 'GET' });
  }

  public async rotateKey(): Promise<RotateKeyResponse> {
    return this.request<RotateKeyResponse>('/keys/rotate', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  public async verifyAuditChain(): Promise<AuditVerificationResponse> {
    return this.request<AuditVerificationResponse>('/audit-logs/verify', {
      method: 'GET',
    });
  }

  private async buildAuthHeaders(): Promise<Record<string, string>> {
    if (this.apiKey) {
      return {
        'x-api-key': this.apiKey,
      };
    }

    if (!this.token) {
      const res = await fetch(`${this.endpoint}/auth/demo-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: this.tenantId ?? 'tenant_supershop_bd',
          actorRole: this.actorRole ?? 'admin',
          actorId: this.actorId ?? 'sdk_actor_01',
        }),
      });
      const data = (await res.json()) as { token?: string; error?: string; message?: string };
      if (!res.ok || !data.token) {
        throw new VaultGuardApiError(
          res.status,
          String(data.error ?? 'AUTH_FAILED'),
          String(data.message ?? `Failed to authenticate SDK actor (${res.status})`),
        );
      }
      this.token = data.token;
    }

    return {
      Authorization: `Bearer ${this.token}`,
      'x-tenant-id': this.tenantId ?? 'tenant_supershop_bd',
      'x-actor-role': this.actorRole ?? 'admin',
      'x-actor-id': this.actorId ?? 'sdk_actor_01',
    };
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const authHeaders = await this.buildAuthHeaders();
    const res = await fetch(`${this.endpoint}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...(init.headers ?? {}),
      },
    });

    const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new VaultGuardApiError(
        res.status,
        String(payload.error ?? 'REQUEST_FAILED'),
        String(payload.message ?? `VaultGuard API error (${res.status})`),
        payload,
      );
    }

    return payload as T;
  }
}
