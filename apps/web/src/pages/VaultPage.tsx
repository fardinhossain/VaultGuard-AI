import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  Eye,
  KeyRound,
  Lock,
  Plus,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  AccessPurpose,
  ApiClientError,
  CustomerPIIInput,
  EncryptedRecordItem,
  vaultApi,
} from '../lib/api';

export const VaultPage: React.FC = () => {
  const { t } = useI18n();
  const { reqCtx, actorRole, refreshVersion, setAddModalOpen, triggerRefresh, showToast } =
    useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();

  const [records, setRecords] = useState<EncryptedRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [phoneQuery, setPhoneQuery] = useState(searchParams.get('phone') ?? '');
  const [blindIndexHash, setBlindIndexHash] = useState<string | null>(null);

  // Slide-over inspection drawer state
  const [selectedRecord, setSelectedRecord] = useState<EncryptedRecordItem | null>(null);
  const [purpose, setPurpose] = useState<AccessPurpose>('ADMIN_AUDIT');
  const [decryptLoading, setDecryptLoading] = useState(false);
  const [decryptResult, setDecryptResult] = useState<{
    status: number;
    data?: CustomerPIIInput;
    errorCode?: string;
    message?: string;
    latencyMs?: number;
  } | null>(null);
  const lastSearchKeyRef = useRef<string>('');

  useEffect(() => {
    if (actorRole === 'admin') setPurpose('ADMIN_AUDIT');
    else if (actorRole === 'delivery') setPurpose('ORDER_DELIVERY');
    else setPurpose('ANALYTICS');
  }, [actorRole]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await vaultApi.fetchRecords(reqCtx);
      setRecords(res.records);
      setBlindIndexHash(null);
    } catch (err) {
      showToast('danger', 'Failed to load vault', err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [reqCtx, showToast]);

  const executePhoneSearch = useCallback(
    async (phone: string, openFirstDrawer: boolean) => {
      if (!phone.trim()) {
        await loadAll();
        return;
      }
      setLoading(true);
      try {
        const res = await vaultApi.searchByPhone(reqCtx, phone);
        setRecords(res.records);
        setBlindIndexHash(res.phoneBlindIndex);
        if (openFirstDrawer && res.records.length > 0) {
          setSelectedRecord(res.records[0]!);
          setDecryptResult(null);
        }
      } catch (err) {
        showToast('danger', 'Search Failed', err instanceof Error ? err.message : undefined);
      } finally {
        setLoading(false);
      }
    },
    [loadAll, reqCtx, showToast],
  );

  // Load records on tenant/refresh changes, or run blind-index search once per ?phone= change
  useEffect(() => {
    const paramPhone = searchParams.get('phone');
    if (paramPhone) {
      const searchKey = `${reqCtx.tenantId}::${paramPhone}`;
      if (lastSearchKeyRef.current !== searchKey) {
        lastSearchKeyRef.current = searchKey;
        setPhoneQuery(paramPhone);
        void executePhoneSearch(paramPhone, true);
      }
    } else {
      lastSearchKeyRef.current = '';
      void loadAll();
    }
  }, [reqCtx.tenantId, refreshVersion, searchParams, executePhoneSearch, loadAll]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = phoneQuery.trim();
    if (!trimmed) {
      setSearchParams({});
      void loadAll();
    } else {
      lastSearchKeyRef.current = '';
      setSearchParams({ phone: trimmed });
    }
  };

  const handleClearFilter = () => {
    setPhoneQuery('');
    setSearchParams({});
  };

  const handleDecrypt = async () => {
    if (!selectedRecord) return;
    setDecryptLoading(true);
    try {
      const res = await vaultApi.decryptRecord(reqCtx, selectedRecord.recordId, purpose);
      setDecryptResult({
        status: 200,
        data: res.data,
        latencyMs: res.latencyMs,
      });
      triggerRefresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setDecryptResult({
          status: err.status,
          errorCode: err.errorCode,
          message: err.message,
        });
        triggerRefresh();
      } else {
        setDecryptResult({
          status: 500,
          errorCode: 'DECRYPT_ERROR',
          message: err instanceof Error ? err.message : 'Unexpected failure',
        });
      }
    } finally {
      setDecryptLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[#111827]">
            {t('vault.title')}
          </h1>
          <p className="text-[13.5px] text-[#71717A] mt-1">{t('vault.subtitle')}</p>
        </div>

        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#18181B] text-[#D4F358] text-[13px] font-semibold hover:bg-black transition-colors self-start cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {t('action.encrypt')}
        </button>
      </div>

      {/* Blind-Index Filter Bar */}
      <div className="bg-white rounded-[24px] border border-[#E4E4E7] p-4 mb-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={phoneQuery}
              onChange={(e) => setPhoneQuery(e.target.value)}
              placeholder="e.g. 01712345678 or +8801712-345678"
              className="w-full rounded-full border border-[#E4E4E7] pl-10 pr-4 py-2 text-[13px] focus:outline-none focus:border-[#18181B]"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-full bg-[#18181B] text-white text-[12.5px] font-semibold hover:bg-black cursor-pointer"
          >
            HMAC Search
          </button>
          {blindIndexHash && (
            <button
              type="button"
              onClick={handleClearFilter}
              className="px-3.5 py-2 rounded-full bg-[#ECECEE] text-[#111827] text-[12px] font-semibold hover:bg-[#E4E4E7] cursor-pointer"
            >
              {t('vault.clearFilter')}
            </button>
          )}
        </form>

        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <span className="text-[#71717A]">{t('vault.searchHint')}</span>
          {['01712345678', '+8801819-876543'].map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => setSearchParams({ phone: sample })}
              className="px-3 py-1 rounded-full bg-[#ECECEE] hover:bg-[#D4F358] font-mono-crypto text-[11.5px] text-[#111827] transition-colors cursor-pointer"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

      {blindIndexHash && (
        <div className="mb-4 px-4 py-2.5 rounded-[16px] bg-[#18181B] text-white text-[12px] flex flex-wrap items-center justify-between gap-2">
          <span>
            Computed keyed <strong className="text-[#D4F358]">HMAC-SHA-256</strong> blind index
            without decrypting MongoDB:
          </span>
          <code className="font-mono-crypto text-[#B4ACF9] text-[11.5px] break-all">
            {blindIndexHash}
          </code>
        </div>
      )}

      {/* Encrypted Records Table */}
      <div className="bg-white rounded-[24px] border border-[#E4E4E7] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E4E4E7] text-[11.5px] font-semibold uppercase tracking-wider text-[#71717A]">
                <th className="py-3.5 px-5">Record ID</th>
                <th className="py-3.5 px-4">Ciphertext Preview (AES-256-GCM)</th>
                <th className="py-3.5 px-4">Nonce / IV (96-bit)</th>
                <th className="py-3.5 px-4">KEK</th>
                <th className="py-3.5 px-4">AuthTag</th>
                <th className="py-3.5 px-5 text-right">Policy Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E7] text-[13px]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#71717A]">
                    Loading encrypted envelopes...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#71717A]">
                    {t('vault.empty')}
                  </td>
                </tr>
              ) : (
                records.map((rec) => (
                  <tr key={rec.recordId} className="hover:bg-[#ECECEE]/45 transition-colors">
                    <td className="py-3.5 px-5 font-mono-crypto font-semibold text-[#111827]">
                      {rec.recordId}
                    </td>
                    <td className="py-3.5 px-4 font-mono-crypto text-[12px] text-[#71717A]">
                      {rec.ciphertextPreview}
                    </td>
                    <td className="py-3.5 px-4 font-mono-crypto text-[12px] text-[#71717A]">
                      {rec.dataNonce}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#ECECEE] text-[#111827] font-mono-crypto text-[11.5px] font-semibold">
                        <KeyRound className="w-3 h-3" /> v{rec.keyVersion}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#10B981]/12 text-[#10B981] text-[11.5px] font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 128-bit GCM
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRecord(rec);
                          setDecryptResult(null);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#18181B] hover:bg-black text-white text-[12px] font-semibold cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#D4F358]" />
                        {t('action.decrypt')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role-Gated Slide-Over Decryption Drawer */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-[2px]">
          <div className="bg-white w-full max-w-lg h-full overflow-y-auto p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#E4E4E7]">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
                    Envelope Inspection Drawer
                  </span>
                  <h2 className="text-[20px] font-semibold font-mono-crypto text-[#111827]">
                    {selectedRecord.recordId}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="p-1.5 rounded-full hover:bg-[#ECECEE] text-[#71717A] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Stored Ciphertext Summary */}
              <div className="mt-4 bg-[#18181B] text-white rounded-[18px] p-4 space-y-2 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#A1A1AA]">Stored in MongoDB:</span>
                  <span className="text-[#D4F358] font-semibold">Zero Plaintext PII</span>
                </div>
                <div className="font-mono-crypto text-[11px] text-[#B4ACF9] break-all">
                  ciphertext: {selectedRecord.ciphertextPreview}
                </div>
                <div className="font-mono-crypto text-[11px] text-[#A1A1AA] break-all">
                  wrappedDEK: {selectedRecord.wrappedDekPreview} (KEK v{selectedRecord.keyVersion})
                </div>
                <div className="font-mono-crypto text-[11px] text-[#A1A1AA] break-all">
                  blindIndex: {selectedRecord.phoneBlindIndexPreview}
                </div>
              </div>

              {/* Policy Parameters */}
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between bg-[#ECECEE] rounded-[16px] px-4 py-3">
                  <span className="text-[12.5px] font-semibold text-[#111827]">
                    Active Caller Role
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#18181B] text-[#D4F358] text-[12px] font-bold uppercase">
                    {actorRole}
                  </span>
                </div>

                <div>
                  <label className="block text-[12px] font-semibold text-[#111827] mb-1.5">
                    Declared Access Purpose (ABAC)
                  </label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value as AccessPurpose)}
                    className="w-full rounded-[14px] border border-[#E4E4E7] px-3.5 py-2.5 text-[13px] bg-white focus:outline-none focus:border-[#18181B]"
                  >
                    <option value="ADMIN_AUDIT">ADMIN_AUDIT (Full Admin Policy)</option>
                    <option value="ORDER_DELIVERY">ORDER_DELIVERY (Logistics Fulfillment)</option>
                    <option value="POLICY_FULL">POLICY_FULL (Compliance Audit)</option>
                    <option value="ANALYTICS">ANALYTICS (Marketing Scope)</option>
                  </select>
                </div>

                <button
                  type="button"
                  disabled={decryptLoading}
                  onClick={() => void handleDecrypt()}
                  className="w-full py-3 rounded-full bg-[#18181B] hover:bg-black text-[#D4F358] text-[13.5px] font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  {decryptLoading ? 'Verifying Policy & Unwrapping DEK...' : t('action.decrypt')}
                </button>
              </div>

              {/* Live Result Output */}
              {decryptResult && (
                <div className="mt-5">
                  {decryptResult.status === 200 && decryptResult.data ? (
                    <div className="rounded-[18px] border border-[#10B981]/30 bg-[#10B981]/8 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="inline-flex items-center gap-1.5 text-[#10B981] text-[12.5px] font-bold">
                          <CheckCircle2 className="w-4 h-4" /> 200 OK · GCM AuthTag Verified
                        </span>
                        <span className="font-mono-crypto text-[11px] text-[#71717A]">
                          {decryptResult.latencyMs} ms
                        </span>
                      </div>
                      <dl className="space-y-2 text-[13px]">
                        {Object.entries(decryptResult.data).map(([k, v]) => {
                          const redacted = v === '[REDACTED_BY_POLICY]';
                          return (
                            <div
                              key={k}
                              className="flex items-center justify-between gap-3 bg-white rounded-[12px] px-3 py-2 border border-[#E4E4E7]"
                            >
                              <dt className="text-[#71717A] font-medium capitalize">{k}</dt>
                              <dd
                                className={
                                  redacted
                                    ? 'font-mono-crypto text-[11.5px] px-2 py-0.5 rounded-full bg-[#D4F358]/40 text-[#18181B] font-semibold'
                                    : 'font-semibold text-[#111827] text-right'
                                }
                              >
                                {v}
                              </dd>
                            </div>
                          );
                        })}
                      </dl>
                    </div>
                  ) : (
                    <div className="rounded-[18px] border border-[#F43F5E]/35 bg-[#F43F5E]/10 p-4">
                      <div className="flex items-center gap-2 text-[#F43F5E] font-bold text-[13px] mb-1.5">
                        <ShieldAlert className="w-4.5 h-4.5" />
                        HTTP {decryptResult.status} · {decryptResult.errorCode}
                      </div>
                      <p className="text-[12.5px] text-[#111827] leading-relaxed">
                        {decryptResult.message}
                      </p>
                      <p className="text-[11px] text-[#71717A] mt-2">
                        Fail-closed block recorded in SHA-256 audit ledger and evaluated by AI Sentinel.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
