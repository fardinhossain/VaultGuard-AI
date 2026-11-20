import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  BookOpenCheck,
  Network,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { SentinelTelemetry, vaultApi } from '../lib/api';
import { AccessGraphViz } from '../components/charts/AccessGraphViz';
import { HatchedSentinelChart } from '../components/charts/HatchedSentinelChart';

export const SentinelPage: React.FC = () => {
  const { lang, t } = useI18n();
  const { reqCtx, refreshVersion, triggerRefresh, showToast } = useWorkspace();

  const [telemetry, setTelemetry] = useState<SentinelTelemetry | null>(null);
  const [simulating, setSimulating] = useState(false);

  const loadTelemetry = useCallback(async () => {
    try {
      const data = await vaultApi.fetchSentinelTelemetry(reqCtx);
      setTelemetry(data);
    } catch (err) {
      showToast('danger', 'Failed to load Sentinel telemetry', err instanceof Error ? err.message : undefined);
    }
  }, [reqCtx, showToast]);

  useEffect(() => {
    void loadTelemetry();
  }, [loadTelemetry, refreshVersion]);

  const handleSimulateAttack = async () => {
    setSimulating(true);
    try {
      const res = await vaultApi.simulateSentinelAttack(reqCtx);
      setTelemetry(res.telemetry);
      showToast(
        'danger',
        `Insider Exfiltration Stopped: Risk ${res.telemetry.currentRiskScore}/100`,
        `Auto-blocked '${res.attackActorId}' and generated XAI + Policy RAG briefing.`,
      );
      triggerRefresh();
    } catch (err) {
      showToast('danger', 'Simulation Failed', err instanceof Error ? err.message : undefined);
    } finally {
      setSimulating(false);
    }
  };

  const handleReset = async () => {
    try {
      const res = await vaultApi.resetSentinel(reqCtx);
      setTelemetry(res.telemetry);
      showToast('info', 'Sentinel Reset Complete', 'Active session blocks cleared.');
      triggerRefresh();
    } catch (err) {
      showToast('danger', 'Reset Failed', err instanceof Error ? err.message : undefined);
    }
  };

  const riskScore = telemetry?.currentRiskScore ?? 0;
  const severity = telemetry?.severity ?? 'LOW';

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[#111827]">
            {t('sentinel.title')}
          </h1>
          <p className="text-[13.5px] text-[#71717A] mt-1">{t('sentinel.subtitle')}</p>
        </div>
      </div>

      {/* Top Obsidian Risk Banner */}
      <section className="bg-[#18181B] text-white rounded-[24px] p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-center gap-5">
          <div
            className={`w-20 h-20 rounded-[20px] flex flex-col items-center justify-center shrink-0 ${
              severity === 'CRITICAL'
                ? 'bg-[#F43F5E] text-white'
                : severity === 'MEDIUM'
                  ? 'bg-[#D4F358] text-[#18181B]'
                  : 'bg-[#27272A] text-[#D4F358]'
            }`}
          >
            <span className="text-[28px] font-bold tabular-nums leading-none">{riskScore}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider mt-1">/ 100</span>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span
                className={`px-3 py-0.5 rounded-full text-[11.5px] font-bold ${
                  severity === 'CRITICAL'
                    ? 'bg-[#F43F5E]/20 text-[#F43F5E]'
                    : severity === 'MEDIUM'
                      ? 'bg-[#D4F358]/20 text-[#D4F358]'
                      : 'bg-[#10B981]/20 text-[#10B981]'
                }`}
              >
                {severity} RISK POSTURE
              </span>
              {telemetry?.hasActiveBlock ? (
                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-[#F43F5E] text-white text-[11.5px] font-bold">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  SESSION AUTO-BLOCKED:{' '}
                  {telemetry.activeBlockedSessions.map((s) => s.actorId).join(', ')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-white/10 text-[#FAFAFA] text-[11.5px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                  No Active Session Locks
                </span>
              )}
            </div>
            <p className="text-[13px] text-[#A1A1AA] max-w-2xl">
              Evaluates rolling decryption velocity, role baseline Z-score, actor-record graph
              fan-out, and AES-GCM tamper signals — zero customer PII leaves the vault.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={simulating}
            onClick={() => void handleSimulateAttack()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#D4F358] hover:bg-[#c5e642] text-[#18181B] text-[13px] font-bold transition-colors disabled:opacity-60 cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            {simulating ? 'Firing Attack Burst...' : t('action.attack')}
          </button>

          <button
            type="button"
            onClick={() => void handleReset()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#27272A] hover:bg-[#3F3F46] text-white text-[12.5px] font-semibold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t('action.resetSentinel')}
          </button>
        </div>
      </section>

      {/* Dual Visual Analytics: Hatched Telemetry + Live Actor-Record Access Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-5 bg-[#18181B] text-white rounded-[24px] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4.5 h-4.5 text-[#D4F358]" />
              <h2 className="text-[15.5px] font-semibold">{t('card.sentinel')}</h2>
            </div>
            <span className="text-[11.5px] text-[#A1A1AA] tabular-nums">
              Auth Precision {telemetry?.authPrecisionPct ?? 99.4}%
            </span>
          </div>
          <HatchedSentinelChart buckets={telemetry?.buckets ?? []} />
        </section>

        <section className="lg:col-span-7 bg-white rounded-[24px] border border-[#E4E4E7] p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#ECECEE] flex items-center justify-center text-[#111827]">
                <Network className="w-4.5 h-4.5" />
              </div>
              <h2 className="text-[15.5px] font-semibold text-[#111827]">
                {t('sentinel.graphTitle')}
              </h2>
            </div>
          </div>
          {telemetry?.accessGraph && <AccessGraphViz graph={telemetry.accessGraph} />}
        </section>
      </div>

      {/* Explainable AI (XAI) Reasoning & Policy RAG Citations */}
      <section className="space-y-4">
        <div className="flex items-center gap-2.5">
          <BookOpenCheck className="w-5 h-5 text-[#111827]" />
          <h2 className="text-[18px] font-semibold text-[#111827]">{t('sentinel.xaiTitle')}</h2>
        </div>

        {!telemetry || telemetry.events.length === 0 ? (
          <div className="bg-white rounded-[24px] border border-[#E4E4E7] p-8 text-center text-[13.5px] text-[#71717A]">
            No security alerts triggered yet. Click{' '}
            <strong className="text-[#111827]">{t('action.attack')}</strong> above or probe
            unauthorized roles in Customer Vault to see live ML + Graph + Policy RAG reasoning cards.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {telemetry.events.map((evt) => (
              <article
                key={evt.eventId}
                className="bg-white rounded-[24px] border border-[#E4E4E7] p-6 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-[11.5px] font-bold ${
                        evt.severity === 'CRITICAL'
                          ? 'bg-[#F43F5E] text-white'
                          : evt.severity === 'MEDIUM'
                            ? 'bg-[#D4F358] text-[#18181B]'
                            : 'bg-[#ECECEE] text-[#111827]'
                      }`}
                    >
                      Risk {evt.riskScore}/100 · {evt.severity}
                    </span>
                    <span className="font-mono-crypto text-[12px] text-[#71717A]">
                      {evt.actorId} ({evt.actorRole})
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      evt.resolved
                        ? 'bg-[#10B981]/12 text-[#10B981]'
                        : 'bg-[#18181B] text-[#D4F358]'
                    }`}
                  >
                    {evt.resolved ? 'Resolved' : evt.actionTaken}
                  </span>
                </div>

                {/* Localized XAI Summary */}
                <p className="text-[13.5px] font-medium text-[#111827] leading-relaxed">
                  {lang === 'bn' ? evt.xaiReasoning.summaryBn : evt.xaiReasoning.summary}
                </p>

                {/* Hybrid ML + Graph Metrics */}
                <div className="grid grid-cols-2 gap-2.5 text-[12px]">
                  <div className="rounded-[14px] bg-[#ECECEE] px-3.5 py-2 flex items-center justify-between">
                    <span className="text-[#71717A]">ML Z-Score Anomaly</span>
                    <span className="font-bold text-[#111827] tabular-nums">
                      {evt.mlAnomalyScore}%
                    </span>
                  </div>
                  <div className="rounded-[14px] bg-[#ECECEE] px-3.5 py-2 flex items-center justify-between">
                    <span className="text-[#71717A]">Graph Fan-Out Score</span>
                    <span className="font-bold text-[#111827] tabular-nums">
                      {evt.graphFanOutScore}%
                    </span>
                  </div>
                </div>

                {/* Behavioral Factor Weights */}
                <div className="space-y-2">
                  {evt.xaiReasoning.factors.map((f, idx) => (
                    <div key={idx} className="text-[12px]">
                      <div className="flex justify-between mb-1">
                        <span className="font-semibold text-[#111827]">
                          {lang === 'bn' ? f.signalBn : f.signal}
                        </span>
                        <span className="font-mono-crypto text-[#71717A]">+{f.weight} pts</span>
                      </div>
                      <div className="text-[11.5px] text-[#71717A] mb-1">{f.observed}</div>
                      <div className="h-2 rounded-full bg-[#ECECEE] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#B4ACF9]"
                          style={{ width: `${Math.min(100, Math.max(8, f.weight * 2))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Grounded Policy RAG Citations */}
                {evt.xaiReasoning.ragCitations.length > 0 && (
                  <div className="pt-3 border-t border-[#E4E4E7] space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
                      Compliance Policy RAG Citations
                    </div>
                    {evt.xaiReasoning.ragCitations.slice(0, 2).map((cit, cIdx) => (
                      <div
                        key={cIdx}
                        className="rounded-[14px] bg-[#ECECEE]/75 p-3 text-[11.5px]"
                      >
                        <div className="font-semibold text-[#111827]">
                          {cit.standard} · <span className="text-[#71717A]">{cit.clause}</span>
                        </div>
                        <p className="text-[#71717A] mt-0.5 leading-snug">
                          {lang === 'bn' ? cit.guidanceBn : cit.guidance}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
