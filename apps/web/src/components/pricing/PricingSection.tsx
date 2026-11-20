import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { BillingCycle, PlanDefinition, PlanTier, vaultApi } from '../../lib/api';

const FALLBACK_PLANS: PlanDefinition[] = [
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
      'SHA-256 hash-chained audit logs',
    ],
    featuresBn: [
      'মাসে ৫,০০০ পর্যন্ত এনক্রিপ্টেড রেকর্ড',
      '৫টি স্কোপড এপিআই কী (vg_live_...)',
      'AES-256-GCM জিরো-স্টোরেজ এপিআই',
      'HMAC-SHA-256 ব্লাইন্ড-ইনডেক্স ফোন সার্চ',
      'SHA-256 হ্যাশ-চেইনড অডিট লগ',
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
      'Server-side RBAC + automatic field redaction',
      'AI Sentinel velocity auto-block',
      'Full English + বাংলা team console',
    ],
    featuresBn: [
      'মাসে ১,০০,০০০ এনক্রিপ্টেড রেকর্ড',
      '১৫টি স্কোপড এপিআই কী (অ্যাডমিন / ডেলিভারি / মার্কেটিং)',
      'সার্ভার-সাইড RBAC ও স্বয়ংক্রিয় ফিল্ড রিড্যাকশন',
      'এআই সেন্টিনেল ভেলোসিটি অটো-ব্লক',
      'পূর্ণ ইংরেজি ও বাংলা টিম কনসোল',
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
    tagline: 'Multi-store encryption with full Hybrid AI Sentinel and BYOK key rotation.',
    taglineBn: 'হাইব্রিড এআই সেন্টিনেল ও শূন্য-ডাউনটাইম KEK রোটেশনসহ মাল্টি-স্টোর সুরক্ষা।',
    monthlyPriceBdt: 20000,
    yearlyMonthlyPriceBdt: 16000,
    monthlyPriceUsd: 169,
    yearlyMonthlyPriceUsd: 135,
    maxApiKeys: 100,
    monthlyRecordLimit: 2000000,
    popular: true,
    features: [
      '2,000,000 encrypted records / mo',
      '100 scoped API keys across multi-store tenants',
      'Hybrid AI Sentinel: ML Z-Score + Access Graph + PDPA Policy RAG',
      'Zero-downtime KEK rotation (v1 → vN) without re-encrypting',
      'BYOK adapters ready for AWS KMS / GCP KMS',
    ],
    featuresBn: [
      'মাসে ২০,০০,০০০ এনক্রিপ্টেড রেকর্ড',
      'মাল্টি-স্টোর জুড়ে ১০০টি স্কোপড এপিআই কী',
      'হাইব্রিড এআই সেন্টিনেল: ML + অ্যাক্সেস গ্রাফ + PDPA পলিসি RAG',
      'ডেটা পুনরায় এনক্রিপ্ট ছাড়াই KEK রোটেশন (v1 → vN)',
      'AWS KMS / GCP KMS-এর জন্য BYOK অ্যাডাপ্টার',
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
    tagline: 'Sovereign VPC Data-Plane Agent so keys & plaintext never leave your servers.',
    taglineBn: 'সোভেরেইন VPC এজেন্ট—আপনার কী ও ডেটা কখনোই আপনার সার্ভারের বাইরে যাবে না।',
    monthlyPriceBdt: null,
    yearlyMonthlyPriceBdt: null,
    monthlyPriceUsd: null,
    yearlyMonthlyPriceUsd: null,
    maxApiKeys: 9999,
    monthlyRecordLimit: 99999999,
    features: [
      'Unlimited records, throughput & custom tenants',
      'Customer-hosted Docker Sovereign Data-Plane Agent',
      'Dedicated HSM / on-prem key custody',
      'Bangladesh PDPA 2026 & NIST SP 800-57 audit pack',
      '24/7 security engineering SLA',
    ],
    featuresBn: [
      'আনলিমিটেড রেকর্ড, থ্রুপুট ও কাস্টম টেন্যান্ট',
      'কাস্টমার-হোস্টেড Docker সোভেরেইন ডেটা-প্লেন এজেন্ট',
      'ডেডিকেটেড HSM / অন-প্রেম কী কাস্টডি',
      'বাংলাদেশ PDPA ২০২৬ ও NIST SP 800-57 অডিট প্যাক',
      '২৪/৭ সিকিউরিটি ইঞ্জিনিয়ারিং SLA',
    ],
    ctaLabel: 'Choose Enterprise',
    ctaLabelBn: 'এন্টারপ্রাইজ বেছে নিন',
  },
];

interface PricingSectionProps {
  onPlanActivated?: (tier: PlanTier) => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onPlanActivated }) => {
  const { lang, t } = useI18n();
  const { activeTenant, summary, reqCtx, triggerRefresh, showToast } = useWorkspace();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<PlanDefinition[]>(FALLBACK_PLANS);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [updatingTier, setUpdatingTier] = useState<PlanTier | null>(null);
  const [justSwitched, setJustSwitched] = useState<PlanTier | null>(null);

  useEffect(() => {
    vaultApi
      .fetchPlans()
      .then((res) => {
        if (Array.isArray(res.plans) && res.plans.length > 0) {
          setPlans(res.plans);
        }
      })
      .catch(() => undefined);
  }, []);

  const currentTier: PlanTier = summary?.plan?.tier ?? activeTenant?.planTier ?? 'basic';

  const handleSelectPlan = async (tier: PlanTier) => {
    setUpdatingTier(tier);
    try {
      const res = await vaultApi.updateTenantPlan(reqCtx, {
        planTier: tier,
        billingCycle,
      });
      setJustSwitched(tier);
      showToast(
        'success',
        `${res.tenant.name} switched to ${tier.toUpperCase()} (${billingCycle})`,
        `Quota updated: up to ${res.plan.maxApiKeys} API keys & ${res.plan.monthlyRecordLimit.toLocaleString()} records/mo.`,
      );
      triggerRefresh();
      onPlanActivated?.(tier);
    } catch (err) {
      showToast('danger', 'Plan Update Failed', err instanceof Error ? err.message : undefined);
    } finally {
      setUpdatingTier(null);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-[28px] sm:text-[32px] font-semibold tracking-tight text-[#111827]">
            {t('home.plansTitle')}
          </h2>
          <p className="text-[14px] text-[#71717A] mt-1 max-w-2xl">{t('pricing.subtitle')}</p>
        </div>

        {/* Monthly / Yearly Toggle */}
        <div className="inline-flex items-center bg-white border border-[#E4E4E7] rounded-full p-1 self-start">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-1.5 rounded-full text-[12.5px] font-semibold cursor-pointer transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-[#18181B] text-white'
                : 'text-[#71717A] hover:text-[#111827]'
            }`}
          >
            {t('pricing.monthly')}
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-1.5 rounded-full text-[12.5px] font-semibold cursor-pointer transition-colors inline-flex items-center gap-1.5 ${
              billingCycle === 'yearly'
                ? 'bg-[#18181B] text-white'
                : 'text-[#71717A] hover:text-[#111827]'
            }`}
          >
            {t('pricing.yearly')}
            <span className="px-2 py-0.5 rounded-full bg-[#D4F358] text-[#18181B] text-[10.5px] font-bold">
              {t('pricing.saveBadge')}
            </span>
          </button>
        </div>
      </div>

      {justSwitched && (
        <div className="rounded-[20px] bg-[#18181B] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[13px]">
            <Sparkles className="w-4 h-4 text-[#D4F358]" />
            <span>
              <strong>{activeTenant?.name ?? 'SuperShop BD'}</strong> is now running on the{' '}
              <strong className="text-[#D4F358] uppercase">{justSwitched}</strong> plan. Ready to
              mint an API key for your store?
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/api-keys')}
            className="px-4 py-1.5 rounded-full bg-[#D4F358] text-[#18181B] text-[12.5px] font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            Mint API Key <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4 Editorial Bento Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch">
        {plans.map((plan) => {
          const isCurrent = currentTier === plan.tier;
          const isPopular = Boolean(plan.popular);
          const bdtPrice =
            billingCycle === 'yearly' ? plan.yearlyMonthlyPriceBdt : plan.monthlyPriceBdt;
          const usdPrice =
            billingCycle === 'yearly' ? plan.yearlyMonthlyPriceUsd : plan.monthlyPriceUsd;
          const features = lang === 'bn' ? plan.featuresBn : plan.features;

          return (
            <article
              key={plan.tier}
              className={`rounded-[24px] p-6 flex flex-col justify-between transition-transform ${
                isPopular
                  ? 'bg-[#18181B] text-white border-2 border-[#D4F358]'
                  : 'bg-white text-[#111827] border border-[#E4E4E7]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                      isPopular
                        ? 'bg-[#D4F358] text-[#18181B]'
                        : 'bg-[#ECECEE] text-[#111827]'
                    }`}
                  >
                    {lang === 'bn' ? plan.badgeBn : plan.badge}
                  </span>
                  {isCurrent && (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#10B981]/20 text-[#10B981] text-[11px] font-bold">
                      {t('pricing.currentPlan')}
                    </span>
                  )}
                </div>

                <h3 className="text-[22px] font-bold">
                  {lang === 'bn' ? plan.nameBn : plan.name}
                </h3>
                <p
                  className={`text-[12.5px] mt-1 leading-relaxed min-h-[38px] ${
                    isPopular ? 'text-[#A1A1AA]' : 'text-[#71717A]'
                  }`}
                >
                  {lang === 'bn' ? plan.taglineBn : plan.tagline}
                </p>

                <div className="mt-5 pb-5 border-b border-current/10">
                  {bdtPrice !== null ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-[34px] font-bold tracking-tight tabular-nums leading-none">
                        ৳{bdtPrice.toLocaleString()}
                      </span>
                      <span
                        className={`text-[12.5px] ${
                          isPopular ? 'text-[#A1A1AA]' : 'text-[#71717A]'
                        }`}
                      >
                        / mo {usdPrice !== null ? `(~$${usdPrice})` : ''}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span className="text-[32px] font-bold tracking-tight leading-none">
                        Custom
                      </span>
                      <span
                        className={`text-[12.5px] ${
                          isPopular ? 'text-[#A1A1AA]' : 'text-[#71717A]'
                        }`}
                      >
                        / Dedicated VPC
                      </span>
                    </div>
                  )}
                </div>

                <ul className="mt-5 space-y-2.5 text-[12.5px]">
                  {features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2">
                      <Check
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          isPopular ? 'text-[#D4F358]' : 'text-[#10B981]'
                        }`}
                      />
                      <span className={isPopular ? 'text-[#FAFAFA]' : 'text-[#111827]'}>
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                disabled={updatingTier === plan.tier || isCurrent}
                onClick={() => void handleSelectPlan(plan.tier)}
                className={`mt-6 w-full py-2.5 px-4 rounded-full text-[13px] font-bold transition-colors cursor-pointer disabled:cursor-default ${
                  isCurrent
                    ? isPopular
                      ? 'bg-white/15 text-[#D4F358]'
                      : 'bg-[#ECECEE] text-[#71717A]'
                    : isPopular
                      ? 'bg-[#D4F358] hover:bg-[#c5e642] text-[#18181B]'
                      : 'bg-[#18181B] hover:bg-black text-white'
                }`}
              >
                {updatingTier === plan.tier
                  ? 'Activating...'
                  : isCurrent
                    ? t('pricing.currentPlan')
                    : lang === 'bn'
                      ? plan.ctaLabelBn
                      : plan.ctaLabel}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
};
