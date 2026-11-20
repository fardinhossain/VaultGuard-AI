import crypto from 'node:crypto';
import { AuditChainEntry, AuditHashInput, ChainVerificationResult } from './types.js';

export function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalStringify(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  const sortedKeys = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort();

  const pairs = sortedKeys.map(
    (key) => `${JSON.stringify(key)}:${canonicalStringify(record[key])}`,
  );
  return `{${pairs.join(',')}}`;
}

function normalizeAuditInput(input: AuditHashInput): Record<string, unknown> {
  return {
    auditId: input.auditId,
    tenantId: input.tenantId,
    seq: Number(input.seq),
    actorId: input.actorId,
    actorRole: input.actorRole,
    action: input.action,
    recordId: input.recordId ?? null,
    purpose: input.purpose ?? null,
    result: input.result,
    latencyMs: Number(input.latencyMs),
    timestamp: new Date(input.timestamp).toISOString(),
  };
}

export function computeAuditEntryHash(prevHash: string, input: AuditHashInput): string {
  const canonical = canonicalStringify(normalizeAuditInput(input));
  return crypto.createHash('sha256').update(`${prevHash}|${canonical}`, 'utf8').digest('hex');
}

export function verifyAuditChain(entries: AuditChainEntry[]): ChainVerificationResult {
  if (entries.length === 0) {
    return {
      valid: true,
      checkedCount: 0,
      latestHash: 'GENESIS',
    };
  }

  let expectedPrevHash = 'GENESIS';
  let latestHash = 'GENESIS';

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    if (!entry) {
      continue;
    }

    if (entry.prevHash !== expectedPrevHash) {
      return {
        valid: false,
        checkedCount: i + 1,
        latestHash,
        brokenAtIndex: i,
        brokenAuditId: entry.auditId,
        reason: `Broken prevHash link at seq ${entry.seq}: expected '${expectedPrevHash}', got '${entry.prevHash}'.`,
      };
    }

    const recomputedHash = computeAuditEntryHash(entry.prevHash, entry);
    if (recomputedHash !== entry.entryHash) {
      return {
        valid: false,
        checkedCount: i + 1,
        latestHash,
        brokenAtIndex: i,
        brokenAuditId: entry.auditId,
        reason: `Entry hash mismatch at seq ${entry.seq} (${entry.auditId}): log contents were altered.`,
      };
    }

    expectedPrevHash = entry.entryHash;
    latestHash = entry.entryHash;
  }

  return {
    valid: true,
    checkedCount: entries.length,
    latestHash,
  };
}
