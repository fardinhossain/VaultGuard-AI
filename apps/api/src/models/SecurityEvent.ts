import mongoose, { Schema, Document } from 'mongoose';

export interface XaiFactor {
  signal: string;
  signalBn: string;
  observed: string;
  weight: number;
}

export interface PolicyRagCitation {
  standard: string;
  clause: string;
  title: string;
  guidance: string;
  guidanceBn: string;
}

export interface SecurityEventDoc {
  eventId: string;
  tenantId: string;
  actorId: string;
  actorRole: string;
  riskScore: number;
  severity: 'LOW' | 'MEDIUM' | 'CRITICAL';
  actionTaken: 'ALLOWED' | 'FLAGGED' | 'SESSION_BLOCKED';
  mlAnomalyScore: number;
  graphFanOutScore: number;
  xaiReasoning: {
    summary: string;
    summaryBn: string;
    factors: XaiFactor[];
    ragCitations: PolicyRagCitation[];
  };
  resolved: boolean;
  timestamp: Date;
}

export interface SecurityEventDocument extends SecurityEventDoc, Document {}

const SecurityEventSchema = new Schema<SecurityEventDocument>(
  {
    eventId: { type: String, required: true, unique: true },
    tenantId: { type: String, required: true, index: true },
    actorId: { type: String, required: true },
    actorRole: { type: String, required: true },
    riskScore: { type: Number, required: true },
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'CRITICAL'], required: true },
    actionTaken: {
      type: String,
      enum: ['ALLOWED', 'FLAGGED', 'SESSION_BLOCKED'],
      required: true,
    },
    mlAnomalyScore: { type: Number, required: true, default: 0 },
    graphFanOutScore: { type: Number, required: true, default: 0 },
    xaiReasoning: {
      summary: { type: String, required: true },
      summaryBn: { type: String, required: true },
      factors: [
        {
          signal: { type: String, required: true },
          signalBn: { type: String, required: true },
          observed: { type: String, required: true },
          weight: { type: Number, required: true },
        },
      ],
      ragCitations: [
        {
          standard: { type: String, required: true },
          clause: { type: String, required: true },
          title: { type: String, required: true },
          guidance: { type: String, required: true },
          guidanceBn: { type: String, required: true },
        },
      ],
    },
    resolved: { type: Boolean, default: false },
    timestamp: { type: Date, default: () => new Date() },
  },
  {
    collection: 'security_events',
    versionKey: false,
  },
);

SecurityEventSchema.index({ tenantId: 1, timestamp: -1 });
SecurityEventSchema.index({ tenantId: 1, actorId: 1, resolved: 1 });

export const SecurityEventModel = mongoose.model<SecurityEventDocument>(
  'SecurityEvent',
  SecurityEventSchema,
);
