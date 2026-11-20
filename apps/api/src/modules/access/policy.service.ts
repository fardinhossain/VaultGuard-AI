import { CustomerPIIPayload } from '@vaultguard/crypto-core';

export type ActorRole = 'admin' | 'delivery' | 'marketing';
export type AccessPurpose = 'ADMIN_AUDIT' | 'POLICY_FULL' | 'ORDER_DELIVERY' | 'ANALYTICS';
export type CustomerField = keyof CustomerPIIPayload;

export interface RolePolicyDefinition {
  role: ActorRole;
  label: string;
  labelBn: string;
  allowedPurposes: AccessPurpose[];
  fields: Record<CustomerField, 'PLAINTEXT' | 'REDACTED' | 'BLOCKED'>;
  httpOutcome: string;
}

export const REDACTED_TOKEN = '[REDACTED_BY_POLICY]';

export const ROLE_POLICY_MATRIX: Record<ActorRole, RolePolicyDefinition> = {
  admin: {
    role: 'admin',
    label: 'Admin (Full Policy)',
    labelBn: 'অ্যাডমিন (পূর্ণ অ্যাক্সেস)',
    allowedPurposes: ['ADMIN_AUDIT', 'POLICY_FULL', 'ORDER_DELIVERY'],
    fields: {
      name: 'PLAINTEXT',
      phone: 'PLAINTEXT',
      email: 'PLAINTEXT',
      address: 'PLAINTEXT',
      orderTotal: 'PLAINTEXT',
    },
    httpOutcome: '200 OK (Full)',
  },
  delivery: {
    role: 'delivery',
    label: 'Delivery Agent',
    labelBn: 'ডেলিভারি এজেন্ট',
    allowedPurposes: ['ORDER_DELIVERY'],
    fields: {
      name: 'PLAINTEXT',
      phone: 'PLAINTEXT',
      email: 'REDACTED',
      address: 'PLAINTEXT',
      orderTotal: 'REDACTED',
    },
    httpOutcome: '200 OK (Field-Masked)',
  },
  marketing: {
    role: 'marketing',
    label: 'Marketing Analyst',
    labelBn: 'মার্কেটিং অ্যানালিস্ট',
    allowedPurposes: [],
    fields: {
      name: 'BLOCKED',
      phone: 'BLOCKED',
      email: 'BLOCKED',
      address: 'BLOCKED',
      orderTotal: 'BLOCKED',
    },
    httpOutcome: '403 Forbidden',
  },
};

export interface PolicyEvaluationResult {
  allowed: boolean;
  reason?: string;
}

export function getDefaultPurposeForRole(role: ActorRole): AccessPurpose {
  if (role === 'admin') return 'ADMIN_AUDIT';
  if (role === 'delivery') return 'ORDER_DELIVERY';
  return 'ANALYTICS';
}

export function evaluateDecryptPolicy(
  role: ActorRole,
  purpose: AccessPurpose,
): PolicyEvaluationResult {
  const policy = ROLE_POLICY_MATRIX[role];
  if (!policy || policy.allowedPurposes.length === 0) {
    return {
      allowed: false,
      reason: `Role '${role}' is not authorized to decrypt raw customer PII.`,
    };
  }

  if (!policy.allowedPurposes.includes(purpose)) {
    return {
      allowed: false,
      reason: `Role '${role}' cannot decrypt for purpose '${purpose}'. Allowed: ${policy.allowedPurposes.join(', ')}.`,
    };
  }

  return { allowed: true };
}

const DELIVERY_SENSITIVE_REDACT_FIELDS = new Set([
  'email',
  'orderTotal',
  'cardLast4',
  'nationalId',
]);

export function applyFieldRedaction<T extends object>(
  payload: T,
  role: ActorRole,
): T {
  if (role === 'admin') {
    return { ...payload };
  }

  const policy = ROLE_POLICY_MATRIX[role];
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    const matrixRule = policy.fields[key as CustomerField];
    if (matrixRule) {
      output[key] = matrixRule === 'PLAINTEXT' ? value : REDACTED_TOKEN;
    } else if (role === 'delivery' && DELIVERY_SENSITIVE_REDACT_FIELDS.has(key)) {
      output[key] = REDACTED_TOKEN;
    } else if (role === 'marketing') {
      output[key] = REDACTED_TOKEN;
    } else {
      output[key] = value;
    }
  }
  return output as T;
}
