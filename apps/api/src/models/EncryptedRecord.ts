import mongoose, { Schema, Document } from 'mongoose';

export interface EncryptedRecordDoc {
  recordId: string;
  tenantId: string;
  recordType: 'customer';
  algorithm: 'AES-256-GCM';
  schemaVersion: number;
  keyVersion: number;
  ciphertext: string;
  dataNonce: string;
  dataAuthTag: string;
  wrappedDEK: string;
  wrapNonce: string;
  wrapAuthTag: string;
  phoneBlindIndex: string;
  fieldCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EncryptedRecordDocument extends EncryptedRecordDoc, Document {}

// Strictly enforces zero plaintext PII columns in storage.
const EncryptedRecordSchema = new Schema<EncryptedRecordDocument>(
  {
    recordId: { type: String, required: true },
    tenantId: { type: String, required: true, index: true },
    recordType: { type: String, enum: ['customer'], default: 'customer' },
    algorithm: { type: String, enum: ['AES-256-GCM'], default: 'AES-256-GCM' },
    schemaVersion: { type: Number, required: true, default: 1 },
    keyVersion: { type: Number, required: true, default: 1 },
    ciphertext: { type: String, required: true },
    dataNonce: { type: String, required: true },
    dataAuthTag: { type: String, required: true },
    wrappedDEK: { type: String, required: true },
    wrapNonce: { type: String, required: true },
    wrapAuthTag: { type: String, required: true },
    phoneBlindIndex: { type: String, required: true },
    fieldCount: { type: Number, required: true, default: 5 },
  },
  {
    collection: 'encrypted_records',
    timestamps: true,
    versionKey: false,
    strict: true,
  },
);

EncryptedRecordSchema.index({ tenantId: 1, recordId: 1 }, { unique: true });
EncryptedRecordSchema.index({ tenantId: 1, phoneBlindIndex: 1 });

export const EncryptedRecordModel = mongoose.model<EncryptedRecordDocument>(
  'EncryptedRecord',
  EncryptedRecordSchema,
);
