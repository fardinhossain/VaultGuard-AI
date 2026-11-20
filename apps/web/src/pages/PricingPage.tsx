import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, KeyRound, ShieldCheck } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { PlanComparisonRow, vaultApi } from '../lib/api';
import { PricingSection } from '../components/pricing/PricingSection';

export const PricingPage: React.FC = () => {
  const { lang, t } = useI18n();
  const { activeTenant, summary } = useWorkspace();
  const [rows, setRows] = useState<PlanComparisonRow[]>([]);

  useEffect(() => {
    vaultApi
      .fetchPlans()
      .then((res) => {
        if (Array.isArray(res.comparisonRows)) {
          setRows(res.comparisonRows);
        }
      })
      .catch(() => undefined);
  }, []);

  const planTier = (summary?.plan?.tier ?? activeTenant?.planTier ?? 'basic').toUpperCase();
  const billingCycle = summary?.plan?.billingCycle ?? activeTenant?.billingCycle ?? 'monthly';
  const keysUsed = summary?.plan?.activeApiKeysCount ?? summary?.activeApiKeysCount ?? 0;
  const maxKeys = summary?.plan?.maxApiKeys ?? activeTenant?.maxApiKeys ?? 15;
  const recordsUsed = summary?.plan?.totalProtectedCount ?? summary?.totalEncryptedRecords ?? 0;
  const maxRecords = summary?.plan?.monthlyRecordLimit ?? activeTenant?.monthlyRecordLimit ?? 100000;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 space-y-12">
      {/* Active Store Plan & Quota Banner */}
      <section className="bg-[#18181B] text-white rounded-[28px] p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4F358] text-[#18181B] text-[11.5px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            {activeTenant?.name ?? 'SuperShop BD'} · {planTier} PLAN ({billingCycle.toUpperCase()})
          </div>
          <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight">
            {t('pricing.title')}
          </h1>
          <p className="text-[13.5px] text-[#A1A1AA] max-w-xl">{t('pricing.subtitle')}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 shrink-0">
          <div className="rounded-[18px] bg-[#27272A] px-5 py-4 min-w-[160px]">
            <div className="text-[11px] uppercase tracking-wider text-[#A1A1AA]">API Keys Used</div>
            <div className="text-[24px] font-bold text-[#D4F358] tabular-nums mt-1">
              {keysUsed} <span className="text-[14px] text-[#A1A1AA]">/ {maxKeys}</span>
            </div>
          </div>
          <div className="rounded-[18px] bg-[#27272A] px-5 py-4 min-w-[160px]">
            <div className="text-[11px] uppercase tracking-wider text-[#A1A1AA]">
              Protected Records
            </div>
            <div className="text-[24px] font-bold text-[#B4ACF9] tabular-nums mt-1">
              {recordsUsed}{' '}
              <span className="text-[13px] text-[#A1A1AA]">/ {maxRecords.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive 4-Plan Grid */}
      <PricingSection />

      {/* Detailed Feature Comparison Table */}
      <section className="bg-white rounded-[24px] border border-[#E4E4E7] overflow-hidden">
        <div className="px-6 py-5 border-b border-[#E4E4E7] flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[18px] font-semibold text-[#111827]">{t('pricing.compareTitle')}</h2>
          <Link
            to="/api-keys"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#18181B] text-[#D4F358] text-[12.5px] font-bold"
          >
            <KeyRound className="w-3.5 h-3.5" />
            Manage API Keys
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#E4E4E7] text-[11.5px] font-bold uppercase tracking-wider text-[#71717A]">
                <th className="py-3.5 px-6">Capability</th>
                <th className="py-3.5 px-4">Free</th>
                <th className="py-3.5 px-4">Basic</th>
                <th className="py-3.5 px-4 text-[#18181B]">Premium</th>
                <th className="py-3.5 px-6">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E7]">
              {rows.map((r) => (
                <tr key={r.feature} className="hover:bg-[#ECECEE]/45">
                  <td className="py-3.5 px-6 font-semibold text-[#111827]">
                    {lang === 'bn' ? r.featureBn : r.feature}
                  </td>
                  <td className="py-3.5 px-4 text-[#71717A]">{r.free}</td>
                  <td className="py-3.5 px-4 text-[#111827] font-medium">{r.basic}</td>
                  <td className="py-3.5 px-4 font-bold text-[#18181B] bg-[#D4F358]/15">
                    {r.premium}
                  </td>
                  <td className="py-3.5 px-6 text-[#111827] font-medium">{r.enterprise}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
