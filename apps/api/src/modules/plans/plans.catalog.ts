export type PlanTier = 'free' | 'basic' | 'premium' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';

export interface PlanDefinition {
  tier: PlanTier;
  name: string;
  nameBn: string;
  badge: string;
  badgeBn: string;
  tagline: string;
  taglineBn: string;
  monthlyPriceBdt: number | null;
  yearlyMonthlyPriceBdt: number | null;
  monthlyPriceUsd: number | null;
  yearlyMonthlyPriceUsd: number | null;
  maxApiKeys: number;
  monthlyRecordLimit: number;
  popular?: boolean;
  features: string[];
  featuresBn: string[];
  ctaLabel: string;
  ctaLabelBn: string;
}

export interface PlanComparisonRow {
  feature: string;
  featureBn: string;
  free: string;
  basic: string;
  premium: string;
  enterprise: string;
}

export const PLANS_CATALOG: PlanDefinition[] = [
  {
    tier: 'free',
    name: 'Free',
    nameBn: 'ফ্রি',
    badge: 'Developer Start',
    badgeBn: 'ডেভেলপার স্টার্ট',
    tagline: 'Test API-key encryption inside your local or staging store database at zero cost.',
    taglineBn: 'বিনামূল্যে আপনার স্টোরের ডেটাবেসে এপিআই-কী এনক্রিপশন পরীক্ষা করুন।',
    monthlyPriceBdt: 0,
    yearlyMonthlyPriceBdt: 0,
    monthlyPriceUsd: 0,
    yearlyMonthlyPriceUsd: 0,
    maxApiKeys: 5,
    monthlyRecordLimit: 5000,
    features: [
      'Up to 5,000 encrypted records / mo',
      '5 scoped API keys (vg_live_...)',
      'AES-256-GCM Zero-Storage API',
      'HMAC-SHA-256 blind-index phone search',
      'SHA-256 tamper-evident audit logs',
    ],
    featuresBn: [
      'মাসে ৫,০০০ পর্যন্ত এনক্রিপ্টেড রেকর্ড',
      '৫টি স্কোপড এপিআই কী (vg_live_...)',
      'AES-256-GCM জিরো-স্টোরেজ এপিআই',
      'HMAC-SHA-256 ব্লাইন্ড-ইনডেক্স ফোন সার্চ',
      'SHA-256 টেম্পার-এভিডেন্ট অডিট লগ',
    ],
    ctaLabel: 'Start Free',
    ctaLabelBn: 'ফ্রি শুরু করুন',
  },
  {
    tier: 'basic',
    name: 'Basic',
    nameBn: 'বেসিক',
    badge: 'Single Store',
    badgeBn: 'সিঙ্গেল স্টোর',
    tagline: 'Built for growing online shops, f-commerce brands, and single-branch SuperShops.',
    taglineBn: 'বর্ধনশীল অনলাইন শপ, এফ-কমার্স ও সিঙ্গেল-ব্রাঞ্চ সুপারশপের জন্য আদর্শ।',
    monthlyPriceBdt: 5000,
    yearlyMonthlyPriceBdt: 4000,
    monthlyPriceUsd: 42,
    yearlyMonthlyPriceUsd: 34,
    maxApiKeys: 15,
    monthlyRecordLimit: 100000,
    features: [
      '100,000 encrypted records / mo',
      '15 scoped API keys (Admin / Delivery / Marketing)',
      'Staff role-based field redaction',
      'AI Threat Monitor velocity auto-block',
      'Full English + বাংলা merchant portal',
    ],
    featuresBn: [
      'মাসে ১,০০,০০০ এনক্রিপ্টেড রেকর্ড',
      '১৫টি স্কোপড এপিআই কী (অ্যাডমিন / ডেলিভারি / মার্কেটিং)',
      'কর্মীদের জন্য রোল-ভিত্তিক ফিল্ড রিড্যাকশন',
      'এআই থ্রেট মনিটর ভেলোসিটি অটো-ব্লক',
      'পূর্ণ ইংরেজি ও বাংলা মার্চেন্ট পোর্টাল',
    ],
    ctaLabel: 'Get Basic',
    ctaLabelBn: 'বেসিক নিন',
  },
  {
    tier: 'premium',
    name: 'Premium',
    nameBn: 'প্রিমিয়াম',
    badge: 'Best for SuperShops',
    badgeBn: 'সুপারশপের জন্য সেরা',
    tagline: 'Multi-branch store encryption with full AI Threat Sentinel and instant key rotation.',
    taglineBn: 'এআই থ্রেট সেন্টিনেল ও শূন্য-ডাউনটাইম কী রোটেশনসহ মাল্টি-ব্রাঞ্চ সুপারশপ সুরক্ষা।',
    monthlyPriceBdt: 20000,
    yearlyMonthlyPriceBdt: 16000,
    monthlyPriceUsd: 169,
    yearlyMonthlyPriceUsd: 135,
    maxApiKeys: 100,
    monthlyRecordLimit: 2000000,
    popular: true,
    features: [
      '2,000,000 encrypted records / mo',
      '100 scoped API keys across branches & apps',
      'Full AI Threat Sentinel + automated key lock',
      'Zero-downtime KEK rotation (v1 → vN) without re-encrypting',
      'AWS KMS / GCP KMS BYOK support',
    ],
    featuresBn: [
      'মাসে ২০,০০,০০০ এনক্রিপ্টেড রেকর্ড',
      'সব ব্রাঞ্চ ও অ্যাপের জন্য ১০০টি স্কোপড এপিআই কী',
      'পূর্ণ এআই থ্রেট সেন্টিনেল ও স্বয়ংক্রিয় কী লক',
      'ডেটা পুনরায় এনক্রিপ্ট ছাড়াই KEK রোটেশন (v1 → vN)',
      'AWS KMS / GCP KMS BYOK সাপোর্ট',
    ],
    ctaLabel: 'Upgrade to Premium',
    ctaLabelBn: 'প্রিমিয়ামে আপগ্রেড করুন',
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    nameBn: 'এন্টারপ্রাইজ',
    badge: 'Retail Chains & Banks',
    badgeBn: 'রিটেইল চেইন ও ব্যাংক',
    tagline: 'Private server / VPC encryption agent so customer data & keys never leave your network.',
    taglineBn: 'প্রাইভেট সার্ভার ও VPC এজেন্ট—আপনার কী ও ডেটা কখনোই আপনার নেটওয়ার্ক ছাড়বে না।',
    monthlyPriceBdt: null,
    yearlyMonthlyPriceBdt: null,
    monthlyPriceUsd: null,
    yearlyMonthlyPriceUsd: null,
    maxApiKeys: 9999,
    monthlyRecordLimit: 99999999,
    features: [
      'Unlimited records, branches & custom tenants',
      'Private VPC / on-prem encryption deployment',
      'Dedicated HSM key custody',
      'Bangladesh PDPA 2026 & NIST compliance pack',
      '24/7 dedicated engineering SLA',
    ],
    featuresBn: [
      'আনলিমিটেড রেকর্ড, ব্রাঞ্চ ও কাস্টম টেন্যান্ট',
      'প্রাইভেট VPC বা অন-প্রেম ডিপ্লয়মেন্ট',
      'ডেডিকেটেড HSM কী কাস্টডি',
      'বাংলাদেশ PDPA ২০২৬ ও NIST কমপ্লায়েন্স প্যাক',
      '২৪/৭ ডেডিকেটেড ইঞ্জিনিয়ারিং SLA',
    ],
    ctaLabel: 'Choose Enterprise',
    ctaLabelBn: 'এন্টারপ্রাইজ বেছে নিন',
  },
];

export const PLAN_COMPARISON_ROWS: PlanComparisonRow[] = [
  {
    feature: 'Monthly Encrypted Operations',
    featureBn: 'মাসিক এনক্রিপ্টেড অপারেশন',
    free: '5,000',
    basic: '100,000',
    premium: '2,000,000',
    enterprise: 'Unlimited',
  },
  {
    feature: 'Scoped Merchant API Keys',
    featureBn: 'স্কোপড মার্চেন্ট এপিআই কী',
    free: '5 keys',
    basic: '15 keys',
    premium: '100 keys',
    enterprise: 'Unlimited',
  },
  {
    feature: 'Zero-Storage External DB Encryption',
    featureBn: 'জিরো-স্টোরেজ এক্সটার্নাল ডিবি এনক্রিপশন',
    free: 'Included',
    basic: 'Included',
    premium: 'Included',
    enterprise: 'Included',
  },
  {
    feature: 'HMAC-SHA-256 Blind-Index Phone Search',
    featureBn: 'HMAC-SHA-256 ব্লাইন্ড-ইনডেক্স ফোন সার্চ',
    free: 'Included',
    basic: 'Included',
    premium: 'Included',
    enterprise: 'Included',
  },
  {
    feature: 'RBAC & Field-Level Redaction',
    featureBn: 'RBAC ও ফিল্ড-লেভেল রিড্যাকশন',
    free: 'Basic',
    basic: 'Full (3 Roles)',
    premium: 'Full + Custom',
    enterprise: 'Custom ABAC',
  },
  {
    feature: 'AI Sentinel Anomaly Detection',
    featureBn: 'এআই সেন্টিনেল অ্যানোমালি ডিটেকশন',
    free: 'Alerts Only',
    basic: 'Velocity Auto-Block',
    premium: 'ML + Graph + RAG',
    enterprise: 'Custom + SIEM Webhook',
  },
  {
    feature: 'Key Custody & KEK Rotation',
    featureBn: 'কী কাস্টডি ও KEK রোটেশন',
    free: 'Local Node v1',
    basic: '1-Click Rotation',
    premium: 'BYOK AWS / GCP Ready',
    enterprise: 'Dedicated HSM / VPC',
  },
];

export function getPlanDefinition(tier: PlanTier): PlanDefinition {
  return PLANS_CATALOG.find((p) => p.tier === tier) ?? PLANS_CATALOG[0]!;
}
