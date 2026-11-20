import mongoose, { Document, Schema } from 'mongoose';
import { EncryptedEnvelope } from '@vaultguard/crypto-core';

export interface ExternalStoreOrderDoc {
  orderId: string;
  storeTenantId: string;
  orderNumber: string;
  itemsSummary: string;
  protectedByVaultGuard: boolean;
  apiKeyPrefixUsed?: string;
  plaintextCustomer?: Record<string, string>;
  encryptedEnvelope?: EncryptedEnvelope;
  blindIndexes?: {
    phone?: string;
  };
  createdAt: Date;
}

export interface ExternalStoreOrderDocument extends ExternalStoreOrderDoc, Document {}

/**
 * Simulates an external SuperShop / E-Commerce platform's OWN separate database table.
 * When protectedByVaultGuard=true, ZERO plaintext PII exists here—only ciphertext & blind indexes.
 */
const ExternalStoreOrderSchema = new Schema<ExternalStoreOrderDocument>(
  {
    orderId: { type: String, required: true, unique: true },
    storeTenantId: { type: String, required: true, index: true },
    orderNumber: { type: String, required: true },
    itemsSummary: { type: String, required: true },
    protectedByVaultGuard: { type: Boolean, required: true },
    apiKeyPrefixUsed: { type: String, required: false },
    plaintextCustomer: { type: Schema.Types.Mixed, required: false },
    encryptedEnvelope: { type: Schema.Types.Mixed, required: false },
    blindIndexes: {
      phone: { type: String, required: false },
    },
    createdAt: { type: Date, default: () => new Date() },
  },
  {
    collection: 'merchant_external_orders',
    versionKey: false,
  },
);

ExternalStoreOrderSchema.index({ storeTenantId: 1, 'blindIndexes.phone': 1 });
ExternalStoreOrderSchema.index({ storeTenantId: 1, createdAt: -1 });

export const ExternalStoreOrderModel = mongoose.model<ExternalStoreOrderDocument>(
  'ExternalStoreOrder',
  ExternalStoreOrderSchema,
);
