import crypto from 'node:crypto';

/**
 * Normalizes Bangladeshi and international phone inputs deterministically so
 * "+8801712-345678", "01712 345678", "8801712345678", and "01712345678"
 * all produce the canonical string "01712345678".
 */
export function normalizePhone(rawPhone: string): string {
  let cleaned = rawPhone.trim().replace(/[\s\-().]/g, '');

  if (cleaned.startsWith('+88')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('0088')) {
    cleaned = cleaned.slice(4);
  } else if (cleaned.startsWith('8801') && cleaned.length === 13) {
    cleaned = cleaned.slice(2);
  }

  if (!cleaned) {
    throw new Error('Phone number cannot be empty after normalization.');
  }
  return cleaned;
}

/**
 * Computes a keyed HMAC-SHA-256 blind index for exact-match lookup over encrypted records.
 * The indexKey MUST be cryptographically separate from both KEK and DEK.
 */
export function computeBlindIndex(indexKey: Buffer, rawPhone: string): string {
  const normalized = normalizePhone(rawPhone);
  return crypto.createHmac('sha256', indexKey).update(normalized, 'utf8').digest('hex');
}
