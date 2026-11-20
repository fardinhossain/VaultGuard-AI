import { computeAuditEntryHash, generateVaultId, verifyAuditChain } from '@vaultguard/crypto-core';
import { AuditAction, AuditActorRole, AuditLogDoc, AuditLogModel } from '../../models/AuditLog.js';

export interface AppendAuditInput {
  tenantId: string;
  actorId: string;
  actorRole: AuditActorRole;
  action: AuditAction;
  recordId?: string;
  purpose?: string;
  result: 'SUCCESS' | 'BLOCKED' | 'FAILED';
  latencyMs: number;
  timestamp?: Date;
}

// Per-tenant async queue prevents concurrent requests from racing on prevHash or seq
const tenantWriteQueues = new Map<string, Promise<unknown>>();

function enqueueTenantWrite<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
  const prev = tenantWriteQueues.get(tenantId) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  tenantWriteQueues.set(
    tenantId,
    next.catch(() => undefined),
  );
  return next;
}

export async function appendAuditLog(input: AppendAuditInput): Promise<AuditLogDoc> {
  return enqueueTenantWrite(input.tenantId, async () => {
    const latest = await AuditLogModel.findOne({ tenantId: input.tenantId })
      .sort({ seq: -1 })
      .lean();

    const seq = (latest?.seq ?? 0) + 1;
    const prevHash = latest?.entryHash ?? 'GENESIS';
    const timestamp = input.timestamp ?? new Date();
    const auditId = generateVaultId('aud');
    const latencyMs = Number(input.latencyMs.toFixed(2));

    const entryHash = computeAuditEntryHash(prevHash, {
      auditId,
      tenantId: input.tenantId,
      seq,
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: input.action,
      recordId: input.recordId ?? null,
      purpose: input.purpose ?? null,
      result: input.result,
      latencyMs,
      timestamp,
    });

    const created = await AuditLogModel.create({
      auditId,
      tenantId: input.tenantId,
      seq,
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: input.action,
      recordId: input.recordId,
      purpose: input.purpose,
      result: input.result,
      latencyMs,
      prevHash,
      entryHash,
      timestamp,
    });

    return created.toObject();
  });
}

export async function listAuditLogs(
  tenantId: string,
  options: { page?: number; limit?: number; action?: string; result?: string },
) {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 30));
  const filter: Record<string, unknown> = { tenantId };
  if (options.action && options.action !== 'ALL') {
    filter.action = options.action;
  }
  if (options.result && options.result !== 'ALL') {
    filter.result = options.result;
  }

  const [items, total] = await Promise.all([
    AuditLogModel.find(filter)
      .sort({ seq: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AuditLogModel.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function verifyTenantAuditChain(tenantId: string) {
  const entries = await AuditLogModel.find({ tenantId }).sort({ seq: 1 }).lean();
  const verification = verifyAuditChain(
    entries.map((e) => ({
      auditId: e.auditId,
      tenantId: e.tenantId,
      seq: e.seq,
      actorId: e.actorId,
      actorRole: e.actorRole,
      action: e.action,
      recordId: e.recordId ?? null,
      purpose: e.purpose ?? null,
      result: e.result,
      latencyMs: e.latencyMs,
      prevHash: e.prevHash,
      entryHash: e.entryHash,
      timestamp: e.timestamp,
    })),
  );

  return verification;
}
