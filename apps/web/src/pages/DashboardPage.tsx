import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  FlaskConical,
  Gauge,
  KeyRound,
  MoreHorizontal,
  RotateCcw,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { vaultApi } from '../lib/api';
import { BubbleCluster } from '../components/charts/BubbleCluster';
import { DotMatrixIndex } from '../components/charts/DotMatrixIndex';
import { HatchedSentinelChart } from '../components/charts/HatchedSentinelChart';

export const DashboardPage: React.FC = () => {
  const { t } = useI18n();
  const { summary, reqCtx, triggerRefresh, showToast } = useWorkspace();
  const [attackRunning, setAttackRunning] = useState(false);
  const navigate = useNavigate();

  const totalFields = summary?.totalEncryptedFields ?? 0;
  const wrappedDeks = summary?.wrappedDekCount ?? 0;
  const blindIndexes = summary?.blindIndexCount ?? 0;
  const avgLatency = summary?.avgEncryptionLatencyMs ?? 1.2;
  const keyVersion = summary?.activeKeyVersion ?? 1;
  const tenantCount = summary?.tenantCount ?? 2;
  const securityScore = summary?.securityIndexScore ?? 98;
  const sentinel = summary?.sentinel;

  const formattedDate = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  const handleSimulateAttack = async () => {
    setAttackRunning(true);
    try {
      const res = await vaultApi.simulateSentinelAttack(reqCtx);
      showToast(
        'danger',
        `Sentinel Alert: Risk ${res.telemetry.currentRiskScore}/100 (${res.telemetry.severity})`,
        `Auto-blocked '${res.attackActorId}' after ${res.probesSimulated} anomalous probes.`,
      );
      triggerRefresh();
    } catch (err) {
      showToast('danger', 'Attack Simulation Failed', err instanceof Error ? err.message : undefined);
    } finally {
      setAttackRunning(false);
    }
  };

  const handleResetSentinel = async () => {
    try {
      await vaultApi.resetSentinel(reqCtx);
      showToast('info', 'Sentinel Session Unblocked', 'Active demo locks cleared cleanly.');
      triggerRefresh();
    } catch (err) {
      showToast('danger', 'Reset Failed', err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <div>
      {/* Hero Title Row */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[28px] sm:text-[34px] font-semibold tracking-tight text-[#111827] leading-tight">
            {t('hero.title')}
          </h1>
          <p className="text-[14px] text-[#71717A] mt-1">{t('hero.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="px-4 py-2 rounded-full bg-white border border-[#E4E4E7] text-[12.5px] font-medium text-[#71717A] tabular-nums">
            {formattedDate}
          </span>
          <button
            type="button"
            onClick={() => navigate('/playground')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#E4E4E7] text-[12.5px] font-semibold text-[#111827] hover:border-[#18181B]/30 cursor-pointer"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            {t('nav.playground')}
          </button>
          <button
            type="button"
            onClick={() => navigate('/api-keys')}
            className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-full bg-[#18181B] text-[#D4F358] text-[13px] font-semibold hover:bg-black transition-colors cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            {t('apiKeys.generateBtn')}
          </button>
        </div>
      </div>

      {/* Signature Asymmetric 12-Column Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* CARD 1 — Left Tall Card: Protected Data Footprint */}
        <section className="lg:col-span-5 bg-white rounded-[24px] border border-[#E4E4E7]/80 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#ECECEE] flex items-center justify-center text-[#111827]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h2 className="text-[16px] font-semibold text-[#111827]">
                  {t('card.footprint')}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('/vault')}
                className="w-9 h-9 rounded-full hover:bg-[#ECECEE] flex items-center justify-center text-[#71717A] cursor-pointer"
                aria-label="Open Customer Vault"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-baseline gap-3 flex-wrap mb-2">
              <span className="text-[40px] font-bold tracking-tight text-[#111827] tabular-nums leading-none">
                {totalFields}
              </span>
              <span className="text-[14px] text-[#71717A] font-medium">
                {t('footprint.fieldsLabel')}
              </span>
              <span className="ml-auto px-3 py-1 rounded-full bg-[#D4F358] text-[#18181B] text-[12px] font-bold">
                {t('footprint.badge')}
              </span>
            </div>

            <BubbleCluster
              fieldsCount={totalFields}
              deksCount={wrappedDeks}
              blindIndexCount={blindIndexes}
            />
          </div>

          {/* 3 Rounded Pill Progress Bars */}
          <div className="space-y-3.5 pt-2">
            <div>
              <div className="flex justify-between text-[12.5px] mb-1.5">
                <span className="font-medium text-[#111827]">{t('footprint.bar1')}</span>
                <span className="font-bold text-[#111827] tabular-nums">
                  {summary?.encryptedAtRestPct ?? 100}%
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-[#ECECEE] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#B4ACF9] transition-all duration-500"
                  style={{ width: `${summary?.encryptedAtRestPct ?? 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[12.5px] mb-1.5">
                <span className="font-medium text-[#111827]">{t('footprint.bar2')}</span>
                <span className="font-bold text-[#111827] tabular-nums">
                  {summary?.kekIsolationPct ?? 100}%
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-[#ECECEE] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#18181B] transition-all duration-500"
                  style={{ width: `${summary?.kekIsolationPct ?? 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[12.5px] mb-1.5">
                <span className="font-medium text-[#111827]">{t('footprint.bar3')}</span>
                <span className="font-bold text-[#10B981] tabular-nums">
                  {summary?.plaintextExposurePct ?? 0}%
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-[#ECECEE] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#D4F358] transition-all duration-500"
                  style={{ width: `${Math.max(4, summary?.plaintextExposurePct ?? 0)}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT 7 COLUMNS: Top Mini Stack + Dot Matrix Card + Bottom Dark Sentinel Card */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* CARD 2 — Stacked Mini Cards (Encryption Speed & Active Key Custody) */}
            <div className="md:col-span-5 flex flex-col gap-5">
              <div className="bg-white rounded-[24px] border border-[#E4E4E7]/80 p-5 flex-1 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold text-[#111827]">
                    {t('card.latency')}
                  </span>
                  <div className="w-9 h-9 rounded-full bg-[#ECECEE] flex items-center justify-center text-[#111827]">
                    <Gauge className="w-4.5 h-4.5" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-[34px] font-bold tracking-tight text-[#111827] tabular-nums leading-none">
                    {avgLatency} <span className="text-[16px] font-semibold text-[#71717A]">ms</span>
                  </div>
                  <p className="text-[12px] text-[#71717A] mt-1.5">{t('latency.sub')}</p>
                </div>
              </div>

              <div className="bg-white rounded-[24px] border border-[#E4E4E7]/80 p-5 flex-1 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold text-[#111827]">
                    {t('card.custody')}
                  </span>
                  <div className="w-9 h-9 rounded-full bg-[#D4F358] flex items-center justify-center text-[#18181B]">
                    <KeyRound className="w-4.5 h-4.5" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-[32px] font-bold tracking-tight text-[#111827] tabular-nums leading-none">
                    KEK v{keyVersion}
                  </div>
                  <p className="text-[12px] text-[#71717A] mt-1.5">
                    {t('custody.sub')} · {tenantCount} {t('custody.tenants')}
                  </p>
                </div>
              </div>
            </div>

            {/* CARD 3 — Top-Right: Sovereignty & Security Index */}
            <section className="md:col-span-7 bg-white rounded-[24px] border border-[#E4E4E7]/80 p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[15.5px] font-semibold text-[#111827]">
                  {t('card.index')}
                </h2>
                <span className="px-3 py-1 rounded-full bg-[#D4F358] text-[#18181B] text-[11.5px] font-bold">
                  {t('index.badge')}
                </span>
              </div>

              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-[38px] font-bold tracking-tight text-[#111827] tabular-nums leading-none">
                  {securityScore}
                </span>
                <span className="text-[18px] font-semibold text-[#71717A]">%</span>
              </div>

              <DotMatrixIndex columns={summary?.dotMatrixColumns ?? []} />
            </section>
          </div>

          {/* CARD 4 — Bottom-Right Wide Dark Feature Card: AI Sentinel Telemetry */}
          <section className="bg-[#18181B] text-[#FAFAFA] rounded-[24px] p-6 flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#27272A] flex items-center justify-center text-[#D4F358]">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-[16px] font-semibold text-white">{t('card.sentinel')}</h2>
                  <p className="text-[12px] text-[#A1A1AA]">
                    ML Z-Score + Access Graph + PDPA Policy RAG (Zero PII)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/sentinel')}
                className="px-3.5 py-1.5 rounded-full bg-[#27272A] hover:bg-[#3F3F46] text-[12px] font-medium text-[#FAFAFA] transition-colors cursor-pointer"
              >
                {t('sentinel.liveWindow')} →
              </button>
            </div>

            {/* Dual Metric Header */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-3 bg-[#27272A]/60 rounded-[16px] px-4 py-3">
                <span className="w-1.5 h-9 rounded-full bg-[#D4F358] shrink-0" />
                <div>
                  <div className="text-[24px] font-bold tabular-nums leading-none">
                    {sentinel?.authPrecisionPct ?? 99.4}%
                  </div>
                  <div className="text-[11.5px] text-[#A1A1AA] mt-1">{t('sentinel.precision')}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-[#27272A]/60 rounded-[16px] px-4 py-3">
                <span
                  className={`w-1.5 h-9 rounded-full shrink-0 ${
                    sentinel?.hasActiveBlock ? 'bg-[#F43F5E]' : 'bg-[#B4ACF9]'
                  }`}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[24px] font-bold tabular-nums leading-none">
                      {sentinel?.currentRiskScore ?? 0}/100
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        sentinel?.severity === 'CRITICAL'
                          ? 'bg-[#F43F5E]/20 text-[#F43F5E]'
                          : sentinel?.severity === 'MEDIUM'
                            ? 'bg-[#D4F358]/20 text-[#D4F358]'
                            : 'bg-[#10B981]/20 text-[#10B981]'
                      }`}
                    >
                      {sentinel?.severity ?? 'LOW'}
                    </span>
                  </div>
                  <div className="text-[11.5px] text-[#A1A1AA] mt-1">
                    {t('sentinel.blocked')}: {sentinel?.blockedCount ?? 0}
                  </div>
                </div>
              </div>
            </div>

            <HatchedSentinelChart buckets={sentinel?.buckets ?? []} />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-2 border-t border-white/10">
              <span className="text-[12px] text-[#A1A1AA]">
                {sentinel?.hasActiveBlock
                  ? `Active auto-block on ${sentinel.activeBlockedSessions.map((s) => s.actorId).join(', ')}`
                  : 'Baseline traffic normal — click to test automated exfiltration defense.'}
              </span>

              <div className="flex items-center gap-2">
                {sentinel?.hasActiveBlock && (
                  <button
                    type="button"
                    onClick={() => void handleResetSentinel()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#27272A] hover:bg-[#3F3F46] text-white text-[12.5px] font-semibold transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {t('action.resetSentinel')}
                  </button>
                )}
                <button
                  type="button"
                  disabled={attackRunning}
                  onClick={() => void handleSimulateAttack()}
                  className="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-full bg-[#D4F358] hover:bg-[#c5e642] text-[#18181B] text-[12.5px] font-bold transition-colors disabled:opacity-60 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  {attackRunning ? 'Simulating...' : t('action.attack')}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
