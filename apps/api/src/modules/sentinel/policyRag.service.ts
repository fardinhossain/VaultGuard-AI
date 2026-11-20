import { PolicyRagCitation } from '../../models/SecurityEvent.js';

interface PolicyChunk extends PolicyRagCitation {
  id: string;
  tags: string[];
}

const POLICY_CORPUS: PolicyChunk[] = [
  {
    id: 'pdpa-minimization',
    standard: 'Bangladesh PDPA 2026',
    clause: 'Sec. 12 — Data Minimization & Purpose Limitation',
    title: 'Restrict Field Decryption to Declared Operational Purpose',
    guidance:
      'Collect and decrypt only fields strictly necessary for the active business purpose; block out-of-scope bulk reads immediately.',
    guidanceBn:
      'শুধুমাত্র নির্ধারিত কাজের জন্য প্রয়োজনীয় ক্ষেত্র ডিক্রিপ্ট করুন; উদ্দেশ্যবহির্ভূত অতিরিক্ত ডেটা পঠন তাৎক্ষণিক ব্লক করুন।',
    tags: ['purpose', 'mismatch', 'unauthorized', 'marketing', 'delivery', 'analytics', 'minimization'],
  },
  {
    id: 'pdpa-safeguards',
    standard: 'Bangladesh PDPA 2026',
    clause: 'Sec. 21 — Technical Security Safeguards & Breach Defense',
    title: 'Automate Exfiltration Containment & Cryptographic Isolation',
    guidance:
      'Maintain encryption-at-rest with customer-controlled keys and automatically isolate compromised credentials upon abnormal velocity bursts.',
    guidanceBn:
      'গ্রাহক-নিয়ন্ত্রিত কী দ্বারা এনক্রিপশন বজায় রাখুন এবং অস্বাভাবিক ডিক্রিপশন গতি দেখা দিলে স্বয়ংক্রিয়ভাবে সেশন বিচ্ছিন্ন করুন।',
    tags: ['velocity', 'burst', 'exfiltration', 'scraping', 'bulk', 'enumeration', 'spike', 'auto-block'],
  },
  {
    id: 'pdpa-tamper',
    standard: 'Bangladesh PDPA 2026',
    clause: 'Sec. 24 — Integrity & Tamper-Evident Auditability',
    title: 'Fail-Closed Integrity Verification & Immutable Audit Ledger',
    guidance:
      'Reject any modified ciphertext or authentication tag without fallback and retain a hash-chained audit record for forensic review.',
    guidanceBn:
      'পরিবর্তিত সাইফারটেক্সট বা অথ-ট্যাগ তাৎক্ষণিক প্রত্যাখ্যান করুন এবং ফরেনসিক যাচাইয়ের জন্য হ্যাশ-চেইনড অডিট লগ সংরক্ষণ করুন।',
    tags: ['tamper', 'gcm', 'authtag', 'integrity', 'ciphertext', 'corrupt', 'bit-flip'],
  },
  {
    id: 'nist-kek',
    standard: 'NIST SP 800-57',
    clause: 'Part 1 §5.3 — Cryptographic Key Separation & Rotation',
    title: 'Isolate KEKs from Storage & Rotate Without Ciphertext Exposure',
    guidance:
      'Separate per-record DEKs from tenant KEKs and HMAC blind-index keys; revoke compromised session tokens and rotate KEK version after critical incidents.',
    guidanceBn:
      'প্রতিটি রেকর্ডের DEK, টেন্যান্ট KEK এবং ব্লাইন্ড ইনডেক্স কী পৃথক রাখুন এবং ঝুঁকি শনাক্ত হলে KEK রোটেশন করুন।',
    tags: ['kek', 'dek', 'rotate', 'key', 'custody', 'envelope', 'byok'],
  },
  {
    id: 'owasp-api4',
    standard: 'OWASP API Top 10',
    clause: 'API4:2023 — Unrestricted Resource & Enumeration Consumption',
    title: 'Throttle & Block High-Fan-Out Record Enumeration',
    guidance:
      'Actors scanning distinct customer record IDs beyond role baseline thresholds must be rate-capped and session-revoked.',
    guidanceBn:
      'নির্ধারিত বেসলাইনের চেয়ে বেশি সংখ্যক স্বতন্ত্র রেকর্ড অনুসন্ধান করলে অ্যাক্টর সেশন তাৎক্ষণিকভাবে ব্লক করতে হবে।',
    tags: ['enumeration', 'scraping', 'fan-out', 'graph', 'distinct', 'velocity', 'burst'],
  },
  {
    id: 'owasp-api3',
    standard: 'OWASP API Top 10',
    clause: 'API3:2023 — Broken Object Property Level Authorization',
    title: 'Enforce Server-Side Field Redaction Before Response Serialization',
    guidance:
      'Never expose sensitive financial or contact fields to non-admin roles even when authorized for partial fulfillment.',
    guidanceBn:
      'আংশিক অনুমোদিত রোলের ক্ষেত্রেও সার্ভার থেকেই সংবেদনশীল অর্ডার ও ইমেইল তথ্য রিড্যাক্ট করুন।',
    tags: ['field', 'redaction', 'rbac', 'abac', 'delivery', 'unauthorized', 'marketing'],
  },
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

/**
 * Local TF-IDF-style cosine/overlap RAG retriever over embedded regulatory & security policy chunks.
 * Runs at $0 cost and inspects zero PII.
 */
export function retrievePolicyCitations(queryText: string, topK = 3): PolicyRagCitation[] {
  const queryTokens = new Set(tokenize(queryText));

  const scored = POLICY_CORPUS.map((chunk) => {
    const docTokens = new Set([
      ...chunk.tags,
      ...tokenize(chunk.title),
      ...tokenize(chunk.guidance),
      ...tokenize(chunk.standard),
    ]);

    let matches = 0;
    for (const token of queryTokens) {
      if (docTokens.has(token)) {
        matches += chunk.tags.includes(token) ? 2.0 : 1.0;
      }
    }

    const score = matches / Math.sqrt(Math.max(1, docTokens.size));
    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(({ chunk }) => ({
    standard: chunk.standard,
    clause: chunk.clause,
    title: chunk.title,
    guidance: chunk.guidance,
    guidanceBn: chunk.guidanceBn,
  }));
}
