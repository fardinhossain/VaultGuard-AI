import mongoose, { Schema, Document } from 'mongoose';

export type AuditAction =
  | 'ENCRYPT'
  | 'SEARCH_BLIND_INDEX'
  | 'DECRYPT_SUCCESS'
  | 'DECRYPT_BLOCKED'
  | 'KEY_ROTATE'
  | 'TAMPER_DETECTED'
  | 'SENTINEL_ALERT'
  | 'SESSION_BLOCKED'
  | 'API_KEY_CREATED'
  | 'API_KEY_REVOKED'
  | 'EXTERNAL_ENCRYPT'
  | 'EXTERNAL_DECRYPT'
  | 'PLAN_UPDATED';

export type AuditActorRole = 'admin' | 'delivery' | 'marketing' | 'system';

export interface AuditLogDoc {
  auditId: string;
  tenantId: string;
  seq: number;
  actorId: string;
  actorRole: AuditActorRole;
  action: AuditAction;
  recordId?: string;
  purpose?: string;
  result: 'SUCCESS' | 'BLOCKED' | 'FAILED';
  latencyMs: number;
  prevHash: string;
  entryHash: string;
  timestamp: Date;
}

export interface AuditLogDocument extends AuditLogDoc, Document {}

const AuditLogSchema = new Schema<AuditLogDocument>(
  {
    auditId: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true, index: true },
    seq: { type: Number, required: true },
    actorId: { type: String, required: true },
    actorRole: {
      type: String,
      enum: ['admin', 'delivery', 'marketing', 'system'],
      required: true,
    },
    action: {
      type: String,
      enum: [
        'ENCRYPT',
        'SEARCH_BLIND_INDEX',
        'DECRYPT_SUCCESS',
        'DECRYPT_BLOCKED',
        'KEY_ROTATE',
        'TAMPER_DETECTED',
        'SENTINEL_ALERT',
        'SESSION_BLOCKED',
        'API_KEY_CREATED',
        'API_KEY_REVOKED',
        'EXTERNAL_ENCRYPT',
        'EXTERNAL_DECRYPT',
        'PLAN_UPDATED',
      ],
      required: true,
    },
    recordId: { type: String, required: false },
    purpose: { type: String, required: false },
    result: {
      type: String,
      enum: ['SUCCESS', 'BLOCKED', 'FAILED'],
      required: true,
    },
    latencyMs: { type: Number, required: true },
    prevHash: { type: String, required: true },
    entryHash: { type: String, required: true },
    timestamp: { type: Date, required: true, default: () => new Date() },
  },
  {
    collection: 'audit_logs',
    versionKey: false,
  },
);

AuditLogSchema.index({ tenantId: 1, seq: 1 }, { unique: true });
AuditLogSchema.index({ tenantId: 1, timestamp: -1 });

export const AuditLogModel = mongoose.model<AuditLogDocument>('AuditLog', AuditLogSchema);
