import mongoose, { Document, Schema } from 'mongoose';
import { ActorRole } from '../modules/access/policy.service.js';

export type ApiKeyStatus = 'active' | 'revoked' | 'sentinel_blocked';

export interface ApiKeyDoc {
  keyId: string;
  tenantId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  roleScope: ActorRole;
  status: ApiKeyStatus;
  requestCount: number;
  lastUsedAt?: Date;
  createdAt: Date;
}

export interface ApiKeyDocument extends ApiKeyDoc, Document {}

// Never stores the raw API key secret; stores only SHA-256 hash + display prefix.
const ApiKeySchema = new Schema<ApiKeyDocument>(
  {
    keyId: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    keyPrefix: { type: String, required: true },
    keyHash: { type: String, required: true, unique: true },
    roleScope: {
      type: String,
      enum: ['admin', 'delivery', 'marketing'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'revoked', 'sentinel_blocked'],
      default: 'active',
    },
    requestCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date, required: false },
    createdAt: { type: Date, default: () => new Date() },
  },
  {
    collection: 'api_keys',
    versionKey: false,
  },
);

ApiKeySchema.index({ tenantId: 1, createdAt: -1 });

export const ApiKeyModel = mongoose.model<ApiKeyDocument>('ApiKey', ApiKeySchema);
