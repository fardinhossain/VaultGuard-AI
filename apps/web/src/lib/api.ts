export type ActorRole = 'admin' | 'delivery' | 'marketing';
export type AccessPurpose = 'ORDER_DELIVERY' | 'ADMIN_AUDIT' | 'POLICY_FULL' | 'ANALYTICS';
export type PlanTier = 'free' | 'basic' | 'premium' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';

export interface PlanDefinition {
  tier: PlanTier;
  name: string;
  nameBn: string;
  badge: string;
  badgeBn: string;
  tagline: string;
  taglineBn: string;
  monthlyPriceBdt: number | null;
  yearlyMonthlyPriceBdt: number | null;
  monthlyPriceUsd: number | null;
  yearlyMonthlyPriceUsd: number | null;
  maxApiKeys: number;
  monthlyRecordLimit: number;
  popular?: boolean;
  features: string[];
  featuresBn: string[];
  ctaLabel: string;
  ctaLabelBn: string;
}

export interface PlanComparisonRow {
  feature: string;
  featureBn: string;
  free: string;
  basic: string;
  premium: string;
  enterprise: string;
}

export interface TenantInfo {
  tenantId: string;
  name: string;
  industry: string;
  contactEmail: string;
  region: string;
  deploymentMode: string;
  keyProvider: string;
  activeKeyVersion: number;
  keyReferenceId: string;
  planTier?: PlanTier;
  billingCycle?: BillingCycle;
  maxApiKeys?: number;
  monthlyRecordLimit?: number;
  recordCount?: number;
}

export interface TelemetryBucket {
  key: string;
  label: string;
  count: number;
  highlighted: boolean;
}

export interface XaiFactor {
  signal: string;
  signalBn: string;
  observed: string;
  weight: number;
}

export interface PolicyRagCitation {
  standard: string;
  clause: string;
  title: string;
  guidance: string;
  guidanceBn: string;
}

export interface SecurityEventItem {
  eventId: string;
  actorId: string;
  actorRole: string;
  riskScore: number;
  severity: 'LOW' | 'MEDIUM' | 'CRITICAL';
  actionTaken: 'ALLOWED' | 'FLAGGED' | 'SESSION_BLOCKED';
  mlAnomalyScore: number;
  graphFanOutScore: number;
  xaiReasoning: {
    summary: string;
    summaryBn: string;
    factors: XaiFactor[];
    ragCitations: PolicyRagCitation[];
  };
  resolved: boolean;
  timestamp: string;
}

export interface AccessGraphSnapshot {
  nodes: Array<{
    id: string;
    label: string;
    type: 'actor' | 'role' | 'record';
    riskLevel: 'safe' | 'watch' | 'critical';
    degree: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    action: string;
    count: number;
    anomalous: boolean;
  }>;
  metrics: {
    totalEdges: number;
    maxActorFanOut: number;
    deniedEdgeRatio: number;
    starBurstDetected: boolean;
  };
}

export interface SentinelTelemetry {
  currentRiskScore: number;
  severity: 'LOW' | 'MEDIUM' | 'CRITICAL';
  authPrecisionPct: number;
  blockedCount: number;
  hasActiveBlock: boolean;
  activeBlockedSessions: Array<{
    actorId: string;
    actorRole: string;
    riskScore: number;
    blockedAt: string;
  }>;
  buckets: TelemetryBucket[];
  events: SecurityEventItem[];
  accessGraph: AccessGraphSnapshot;
}

export interface DashboardSummary {
  tenant: TenantInfo;
  tenantCount: number;
  totalEncryptedRecords: number;
  totalEncryptedFields: number;
  wrappedDekCount: number;
  blindIndexCount: number;
  encryptedAtRestPct: number;
  kekIsolationPct: number;
  plaintextExposurePct: number;
  avgEncryptionLatencyMs: number;
  activeKeyVersion: number;
  securityIndexScore: number;
  auditChainValid: boolean;
  auditCount: number;
  activeApiKeysCount?: number;
  externalProtectedOrdersCount?: number;
  plan?: {
    tier: PlanTier;
    billingCycle: BillingCycle;
    maxApiKeys: number;
    monthlyRecordLimit: number;
    activeApiKeysCount: number;
    totalProtectedCount: number;
  };
  dotMatrixColumns: Array<{
    key: string;
    label: string;
    level: number;
    value: string;
  }>;
  sentinel: SentinelTelemetry;
}

export interface ApiKeyItem {
  keyId: string;
  tenantId: string;
  name: string;
  keyPrefix: string;
  roleScope: ActorRole;
  status: 'active' | 'revoked' | 'sentinel_blocked';
  requestCount: number;
  lastUsedAt?: string;
  createdAt: string;
}

export interface ExternalStoreOrderItem {
  orderId: string;
  storeTenantId: string;
  orderNumber: string;
  itemsSummary: string;
  protectedByVaultGuard: boolean;
  apiKeyPrefixUsed?: string;
  plaintextCustomer?: Record<string, string>;
  encryptedEnvelope?: Record<string, unknown>;
  blindIndexes?: { phone?: string };
  createdAt: string;
}

export interface EncryptedRecordItem {
  recordId: string;
  tenantId: string;
  recordType: string;
  algorithm: string;
  schemaVersion: number;
  keyVersion: number;
  ciphertextPreview: string;
  dataNonce: string;
  dataAuthTagPreview: string;
  wrappedDekPreview: string;
  phoneBlindIndex: string;
  phoneBlindIndexPreview: string;
  fieldCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerPIIInput {
  name: string;
  phone: string;
  email: string;
  address: string;
  orderTotal: string;
}

export interface AuditLogItem {
  auditId: string;
  tenantId: string;
  seq: number;
  actorId: string;
  actorRole: string;
  action: string;
  recordId?: string;
  purpose?: string;
  result: 'SUCCESS' | 'BLOCKED' | 'FAILED';
  latencyMs: number;
  prevHash: string;
  entryHash: string;
  timestamp: string;
}

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly errorCode: string;
  public readonly payload: Record<string, unknown>;

  constructor(status: number, errorCode: string, message: string, payload: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
    this.payload = payload;
  }
}

export interface RequestContext {
  tenantId: string;
  actorRole: ActorRole;
  actorId: string;
  token?: string | null;
}

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || '/v1';

async function apiFetch<T>(
  path: string,
  ctx: RequestContext,
  init: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-tenant-id': ctx.tenantId,
    'x-actor-role': ctx.actorRole,
    'x-actor-id': ctx.actorId,
  };
  if (ctx.token) {
    headers.Authorization = `Bearer ${ctx.token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiClientError(
      res.status,
      String(data.error ?? 'API_ERROR'),
      String(data.message ?? `Request failed (${res.status})`),
      data,
    );
  }
  return data as T;
}

export async function issueDemoToken(tenantId: string, actorRole: ActorRole, actorId: string) {
  const res = await fetch(`${API_BASE}/auth/demo-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId, actorRole, actorId }),
  });
  const data = (await res.json()) as { token: string; claims: { tenantId: string; actorRole: ActorRole; actorId: string } };
  if (!res.ok) {
    throw new Error('Failed to obtain demo JWT token');
  }
  return data;
}

export const vaultApi = {
  fetchTenants: () =>
    fetch(`${API_BASE}/tenants`).then((r) => r.json()) as Promise<{ tenants: TenantInfo[] }>,
  createTenant: (payload: {
    name: string;
    industry: string;
    contactEmail: string;
    planTier?: PlanTier;
  }) =>
    fetch(`${API_BASE}/tenants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(async (r) => {
      const data = (await r.json().catch(() => ({}))) as {
        tenant?: TenantInfo;
        error?: string;
        message?: string;
      };
      if (!r.ok || !data.tenant) {
        throw new Error(data.message ?? 'Failed to register store tenant');
      }
      return data.tenant;
    }),
  fetchPlans: () =>
    fetch(`${API_BASE}/plans`).then((r) => r.json()) as Promise<{
      plans: PlanDefinition[];
      comparisonRows: PlanComparisonRow[];
    }>,
  updateTenantPlan: (
    ctx: RequestContext,
    payload: { planTier: PlanTier; billingCycle: BillingCycle },
  ) =>
    apiFetch<{ tenant: TenantInfo; plan: PlanDefinition }>('/tenants/plan', ctx, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  fetchHealth: () =>
    fetch(`${API_BASE}/health`).then((r) => r.json()) as Promise<{
      status: string;
      dbMode: string;
      cryptoSelfTest: { passed: boolean; latencyMs: number };
    }>,
  fetchDashboardSummary: (ctx: RequestContext) =>
    apiFetch<DashboardSummary>('/dashboard/summary', ctx),
  fetchRecords: (ctx: RequestContext) =>
    apiFetch<{ tenantId: string; total: number; records: EncryptedRecordItem[] }>('/records', ctx),
  createRecord: (ctx: RequestContext, payload: CustomerPIIInput) =>
    apiFetch<{
      recordId: string;
      latencyMs: number;
      ciphertextPreview: string;
      phoneBlindIndex: string;
    }>('/records', ctx, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  searchByPhone: (ctx: RequestContext, phone: string) =>
    apiFetch<{
      normalizedPhoneHint: string;
      phoneBlindIndex: string;
      matchCount: number;
      latencyMs: number;
      records: EncryptedRecordItem[];
    }>('/records/search', ctx, {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),
  decryptRecord: (ctx: RequestContext, recordId: string, purpose?: AccessPurpose) =>
    apiFetch<{
      recordId: string;
      role: ActorRole;
      purpose: AccessPurpose;
      data: CustomerPIIInput;
      integrityVerified: boolean;
      keyVersion: number;
      latencyMs: number;
    }>(`/records/${encodeURIComponent(recordId)}/decrypt`, ctx, {
      method: 'POST',
      body: JSON.stringify(purpose ? { purpose } : {}),
    }),
  rotateKey: (ctx: RequestContext) =>
    apiFetch<{
      tenantId: string;
      previousVersion: number;
      newVersion: number;
      recordsRewrapped: number;
      ciphertextModified: boolean;
      latencyMs: number;
    }>('/keys/rotate', ctx, { method: 'POST', body: '{}' }),
  fetchBreachDump: (ctx: RequestContext) =>
    apiFetch<{
      tenantId: string;
      traditionalLeakSample: Array<Record<string, unknown>>;
      vaultguardRawDump: Array<Record<string, unknown>>;
      summary: {
        totalRecordsInVault: number;
        readablePiiFieldsInTraditional: number;
        readablePiiFieldsInVaultGuard: number;
      };
    }>('/breach/dump', ctx),
  runTamperTest: (ctx: RequestContext, recordId?: string) =>
    apiFetch<{
      recordId: string;
      algorithm: string;
      tamperedByteIndex: number;
      originalByteHex: string;
      tamperedByteHex: string;
      originalCiphertextSnippet: string;
      tamperedCiphertextSnippet: string;
      gcmVerificationPassed: boolean;
      failClosed: boolean;
      errorCode: string;
      cryptoError: string;
      auditLogged: boolean;
      databaseUntouched: boolean;
      latencyMs: number;
    }>('/breach/tamper-test', ctx, {
      method: 'POST',
      body: JSON.stringify(recordId ? { recordId } : {}),
    }),
  fetchSentinelTelemetry: (ctx: RequestContext) =>
    apiFetch<SentinelTelemetry>('/sentinel/telemetry', ctx),
  simulateSentinelAttack: (ctx: RequestContext) =>
    apiFetch<{
      attackActorId: string;
      attackRole: string;
      probesSimulated: number;
      telemetry: SentinelTelemetry;
    }>('/sentinel/simulate-attack', ctx, { method: 'POST', body: '{}' }),
  resetSentinel: (ctx: RequestContext) =>
    apiFetch<{ reset: boolean; telemetry: SentinelTelemetry }>('/sentinel/reset', ctx, {
      method: 'POST',
      body: '{}',
    }),
  fetchPolicies: () =>
    fetch(`${API_BASE}/access/policies`).then((r) => r.json()) as Promise<{
      policies: Array<{
        role: ActorRole;
        label: string;
        labelBn: string;
        allowedPurposes: AccessPurpose[];
        fields: Record<keyof CustomerPIIInput, 'PLAINTEXT' | 'REDACTED' | 'BLOCKED'>;
        httpOutcome: string;
      }>;
      purposes: AccessPurpose[];
    }>,
  fetchAuditLogs: (
    ctx: RequestContext,
    params: { page?: number; limit?: number; action?: string; result?: string } = {},
  ) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.action) q.set('action', params.action);
    if (params.result) q.set('result', params.result);
    return apiFetch<{
      items: AuditLogItem[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/audit-logs?${q.toString()}`, ctx);
  },
  verifyAuditChain: (ctx: RequestContext) =>
    apiFetch<{
      valid: boolean;
      checkedCount: number;
      latestHash: string;
      brokenAtIndex?: number;
      brokenAuditId?: string;
      reason?: string;
    }>('/audit-logs/verify', ctx),
  fetchApiKeys: (ctx: RequestContext) =>
    apiFetch<{ tenantId: string; keys: ApiKeyItem[] }>('/api-keys', ctx),
  createApiKey: (ctx: RequestContext, payload: { name: string; roleScope: ActorRole }) =>
    apiFetch<{ apiKey: ApiKeyItem; rawKey: string; warning: string }>('/api-keys', ctx, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  revokeApiKey: (ctx: RequestContext, keyId: string) =>
    apiFetch<{ revoked: boolean; apiKey: ApiKeyItem }>(
      `/api-keys/${encodeURIComponent(keyId)}/revoke`,
      ctx,
      { method: 'POST', body: '{}' },
    ),
  verifyApiKey: (apiKey: string) =>
    fetch(`${API_BASE}/api-keys/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    }).then(async (r) => {
      const data = (await r.json().catch(() => ({}))) as Record<string, unknown>;
      return { ok: r.ok, status: r.status, data };
    }),
  fetchStoreOrders: (ctx: RequestContext) =>
    apiFetch<{
      storeTenantId: string;
      orders: ExternalStoreOrderItem[];
      summary: {
        totalOrders: number;
        protectedOrders: number;
        unprotectedOrders: number;
        exposedPlaintextFields: number;
      };
    }>('/store-sandbox/orders', ctx),
  storeCheckout: (
    ctx: RequestContext,
    payload: {
      apiKey?: string;
      itemsSummary: string;
      customer: CustomerPIIInput;
    },
  ) =>
    apiFetch<{
      protectedByVaultGuard: boolean;
      apiKeyPrefixUsed?: string;
      latencyMs?: number;
      warning?: string;
      order: ExternalStoreOrderItem;
    }>('/store-sandbox/checkout', ctx, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  storeSearchByPhone: (ctx: RequestContext, apiKey: string, phone: string) =>
    apiFetch<{
      matchCount: number;
      phoneBlindIndex: string;
      latencyMs: number;
      orders: ExternalStoreOrderItem[];
    }>('/store-sandbox/search', ctx, {
      method: 'POST',
      body: JSON.stringify({ apiKey, phone }),
    }),
  storeDecryptOrder: (
    ctx: RequestContext,
    payload: { orderId: string; apiKey?: string; purpose?: AccessPurpose },
  ) =>
    apiFetch<{
      orderId: string;
      unprotected?: boolean;
      warning?: string;
      role?: ActorRole;
      purpose?: AccessPurpose;
      apiKeyPrefix?: string;
      data: Record<string, string>;
      integrityVerified?: boolean;
      keyVersion?: number;
      latencyMs?: number;
    }>('/store-sandbox/decrypt', ctx, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  storeTamperOrder: (ctx: RequestContext, orderId: string) =>
    apiFetch<{
      orderId: string;
      orderNumber: string;
      originalByteHex: string;
      tamperedByteHex: string;
      gcmVerificationPassed: boolean;
      failClosed: boolean;
      errorCode: string;
      cryptoError: string;
      latencyMs: number;
    }>('/store-sandbox/tamper', ctx, {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    }),
};
