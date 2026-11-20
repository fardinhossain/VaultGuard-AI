import mongoose, { Schema, Document } from 'mongoose';
import { BillingCycle, PlanTier } from '../modules/plans/plans.catalog.js';

export interface TenantDoc {
  tenantId: string;
  name: string;
  industry: string;
  contactEmail: string;
  region: string;
  deploymentMode: 'cloud' | 'hybrid' | 'customer-hosted';
  keyProvider: 'local-dev-kms' | 'aws-kms' | 'gcp-kms';
  activeKeyVersion: number;
  keyReferenceId: string;
  planTier: PlanTier;
  billingCycle: BillingCycle;
  maxApiKeys: number;
  monthlyRecordLimit: number;
  createdAt: Date;
}

export interface TenantDocument extends TenantDoc, Document {}

const TenantSchema = new Schema<TenantDocument>(
  {
    tenantId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    industry: { type: String, required: true },
    contactEmail: { type: String, required: true },
    region: { type: String, required: true },
    deploymentMode: {
      type: String,
      enum: ['cloud', 'hybrid', 'customer-hosted'],
      default: 'cloud',
    },
    keyProvider: {
      type: String,
      enum: ['local-dev-kms', 'aws-kms', 'gcp-kms'],
      default: 'local-dev-kms',
    },
    activeKeyVersion: { type: Number, required: true, default: 1 },
    keyReferenceId: { type: String, required: true },
    planTier: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free',
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: 'monthly',
    },
    maxApiKeys: { type: Number, required: true, default: 5 },
    monthlyRecordLimit: { type: Number, required: true, default: 5000 },
    createdAt: { type: Date, default: () => new Date() },
  },
  {
    collection: 'tenants',
    versionKey: false,
  },
);

export const TenantModel = mongoose.model<TenantDocument>('Tenant', TenantSchema);
