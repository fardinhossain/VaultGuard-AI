import crypto from 'node:crypto';

export interface GeneratedApiKey {
  rawKey: string;
  keyPrefix: string;
  keyHash: string;
}

export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey.trim(), 'utf8').digest('hex');
}

export function generateApiKey(
  envPrefix: 'live' | 'test',
  tenantSlug: string,
): GeneratedApiKey {
  const cleanSlug =
    tenantSlug
      .toLowerCase()
      .replace(/^tenant_/, '')
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 8) || 'store';
  const secretHex = crypto.randomBytes(16).toString('hex');
  const rawKey = `vg_${envPrefix}_${cleanSlug}_${secretHex}`;
  const keyPrefix = `${rawKey.slice(0, 20)}...`;
  const keyHash = hashApiKey(rawKey);

  return {
    rawKey,
    keyPrefix,
    keyHash,
  };
}

export function verifyApiKeyHash(rawKey: string, storedHash: string): boolean {
  if (!rawKey || !storedHash) {
    return false;
  }
  const candidate = Buffer.from(hashApiKey(rawKey), 'hex');
  const expected = Buffer.from(storedHash, 'hex');
  if (candidate.length === 0 || candidate.length !== expected.length) {
    return false;
  }
  return crypto.timingSafeEqual(candidate, expected);
}
