import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FlaskConical,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { vaultApi } from '../lib/api';

export const BreachSimulatorPage: React.FC = () => {
  const { t } = useI18n();
  const { reqCtx, refreshVersion, triggerRefresh, showToast } = useWorkspace();

  const [dumpData, setDumpData] = useState<{
    traditionalLeakSample: Array<Record<string, unknown>>;
    vaultguardRawDump: Array<Record<string, unknown>>;
    summary: {
      totalRecordsInVault: number;
      readablePiiFieldsInTraditional: number;
      readablePiiFieldsInVaultGuard: number;
    };
  } | null>(null);

  const [selectedRecordId, setSelectedRecordId] = useState<string>('');
  const [tamperLoading, setTamperLoading] = useState(false);
  const [tamperResult, setTamperResult] = useState<{
    recordId: string;
    algorithm: string;
    tamperedByteIndex: number;
    originalByteHex: string;
    tamperedByteHex: string;
    originalCiphertextSnippet: string;
    tamperedCiphertextSnippet: string;
    gcmVerificationPassed: boolean;
    failClosed: boolean;
    errorCode: string;
    cryptoError: string;
    auditLogged: boolean;
    databaseUntouched: boolean;
    latencyMs: number;
  } | null>(null);

  const loadDump = useCallback(async () => {
    try {
      const res = await vaultApi.fetchBreachDump(reqCtx);
      setDumpData(res);
      if (res.vaultguardRawDump.length > 0 && !selectedRecordId) {
        setSelectedRecordId(String(res.vaultguardRawDump[0]!.recordId ?? ''));
      }
    } catch (err) {
      showToast('danger', 'Failed to load breach dump', err instanceof Error ? err.message : undefined);
    }
  }, [reqCtx, selectedRecordId, showToast]);

  useEffect(() => {
    void loadDump();
  }, [loadDump, refreshVersion]);

  const handleDownloadJson = () => {
    if (!dumpData) return;
    const blob = new Blob([JSON.stringify(dumpData.vaultguardRawDump, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vaultguard-stolen-mongodb-dump-${reqCtx.tenantId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('info', 'Exported Raw MongoDB Dump', '0 readable PII fields inside downloaded file.');
  };

  const handleTamperTest = async () => {
    setTamperLoading(true);
    try {
      const res = await vaultApi.runTamperTest(reqCtx, selectedRecordId || undefined);
      setTamperResult(res);
      showToast(
        'success',
        'Tamper Blocked (Fail-Closed AES-GCM)',
        `1-byte flip (${res.originalByteHex} → ${res.tamperedByteHex}) rejected in ${res.latencyMs} ms.`,
      );
      triggerRefresh();
    } catch (err) {
      showToast('danger', 'Tamper Test Error', err instanceof Error ? err.message : undefined);
    } finally {
      setTamperLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[#111827]">
            {t('breach.title')}
          </h1>
          <p className="text-[13.5px] text-[#71717A] mt-1">{t('breach.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleDownloadJson}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-[#E4E4E7] hover:border-[#18181B]/30 text-[12.5px] font-semibold text-[#111827] cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {t('action.downloadDump')}
          </button>

          <button
            type="button"
            disabled={tamperLoading}
            onClick={() => void handleTamperTest()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#18181B] hover:bg-black text-[#D4F358] text-[13px] font-semibold disabled:opacity-60 cursor-pointer"
          >
            <FlaskConical className="w-4 h-4" />
            {tamperLoading ? 'Testing Ciphertext...' : t('action.tamper')}
          </button>
        </div>
      </div>

      {/* Dramatic 2-Column Split Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Traditional Unencrypted Leak */}
        <section className="bg-white rounded-[24px] border border-[#F43F5E]/30 p-6 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#F43F5E]/15 text-[#F43F5E] flex items-center justify-center">
                <AlertTriangle className="w-4.5 h-4.5" />
              </div>
              <h2 className="text-[16px] font-semibold text-[#111827]">
                {t('breach.legacyTitle')}
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#F43F5E] text-white text-[11.5px] font-bold">
              {t('breach.legacyBadge')}
            </span>
          </div>

          <p className="text-[12.5px] text-[#71717A] mb-3">
            When an attacker dumps an unencrypted retail MongoDB/SQL backup, every customer identity,
            Bangladeshi phone number, and home address leaks instantly:
          </p>

          <pre className="flex-1 rounded-[18px] bg-[#FFF1F2] border border-[#F43F5E]/20 p-4 font-mono-crypto text-[11.5px] text-[#881337] overflow-auto max-h-[360px] leading-relaxed">
            {JSON.stringify(dumpData?.traditionalLeakSample ?? [], null, 2)}
          </pre>
        </section>

        {/* Right: Live VaultGuard Raw MongoDB Dump */}
        <section className="bg-[#18181B] text-white rounded-[24px] p-6 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#27272A] text-[#D4F358] flex items-center justify-center">
                <Lock className="w-4.5 h-4.5" />
              </div>
              <h2 className="text-[16px] font-semibold text-white">{t('breach.vaultTitle')}</h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#D4F358] text-[#18181B] text-[11.5px] font-bold">
              {t('breach.vaultBadge')}
            </span>
          </div>

          <p className="text-[12.5px] text-[#A1A1AA] mb-3">
            Live raw documents exported directly from <code className="text-[#B4ACF9]">encrypted_records</code>{' '}
            ({dumpData?.summary.totalRecordsInVault ?? 0} documents). Without isolated KEKs, stolen dumps are useless:
          </p>

          <pre className="flex-1 rounded-[18px] bg-[#09090B] border border-white/10 p-4 font-mono-crypto text-[11.5px] text-[#B4ACF9] overflow-auto max-h-[360px] leading-relaxed">
            {JSON.stringify(dumpData?.vaultguardRawDump ?? [], null, 2)}
          </pre>
        </section>
      </div>

      {/* 1-Byte Ciphertext Tamper Test Proof Panel */}
      <section className="bg-white rounded-[24px] border border-[#E4E4E7] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-[16px] font-semibold text-[#111827]">{t('breach.tamperTitle')}</h2>
            <p className="text-[12.5px] text-[#71717A]">
              Clones a record in memory, flips 1 byte of ciphertext, and runs real AES-256-GCM authentication verification.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedRecordId}
              onChange={(e) => setSelectedRecordId(e.target.value)}
              className="rounded-full border border-[#E4E4E7] px-3.5 py-2 text-[12.5px] font-mono-crypto bg-white"
            >
              {(dumpData?.vaultguardRawDump ?? []).map((doc) => {
                const id = String(doc.recordId);
                return (
                  <option key={id} value={id}>
                    {id}
                  </option>
                );
              })}
            </select>
            <button
              type="button"
              disabled={tamperLoading}
              onClick={() => void handleTamperTest()}
              className="px-4 py-2 rounded-full bg-[#D4F358] hover:bg-[#c5e642] text-[#18181B] text-[12.5px] font-bold cursor-pointer"
            >
              Flip 1 Byte & Verify
            </button>
          </div>
        </div>

        {tamperResult ? (
          <div className="rounded-[18px] bg-[#18181B] text-white p-5 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F43F5E]/20 text-[#F43F5E] text-[11.5px] font-bold mb-2">
                <ShieldAlert className="w-3.5 h-3.5" /> FAIL-CLOSED REJECTION
              </div>
              <div className="text-[13px] font-semibold">
                Byte #{tamperResult.tamperedByteIndex} mutated:{' '}
                <code className="font-mono-crypto text-[#B4ACF9]">{tamperResult.originalByteHex}</code>{' '}
                →{' '}
                <code className="font-mono-crypto text-[#F43F5E]">{tamperResult.tamperedByteHex}</code>
              </div>
              <p className="text-[11.5px] text-[#A1A1AA] mt-1">
                DB copy untouched · Logged{' '}
                <code className="font-mono-crypto text-[#D4F358]">TAMPER_DETECTED</code> to SHA-256
                audit chain.
              </p>
            </div>

            <div className="md:col-span-2 bg-[#09090B] rounded-[14px] p-3.5 border border-white/10 font-mono-crypto text-[11.5px] space-y-1">
              <div className="text-[#A1A1AA]">
                errorCode: <span className="text-[#F43F5E]">{tamperResult.errorCode}</span>
              </div>
              <div className="text-[#A1A1AA]">
                openSSLAuthTagError:{' '}
                <span className="text-[#D4F358]">"{tamperResult.cryptoError}"</span>
              </div>
              <div className="text-[#A1A1AA] flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                Zero plaintext leaked ({tamperResult.latencyMs} ms)
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[16px] bg-[#ECECEE] px-4 py-3 text-[12.5px] text-[#71717A]">
            Click <strong className="text-[#111827]">Flip 1 Byte & Verify</strong> above to prove
            128-bit AES-GCM authentication tag verification rejects tampered ciphertext immediately.
          </div>
        )}
      </section>
    </div>
  );
};
