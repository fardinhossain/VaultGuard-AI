import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, FileCheck2, ShieldAlert } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { AuditLogItem, vaultApi } from '../lib/api';

const ACTION_FILTERS = [
  'ALL',
  'ENCRYPT',
  'SEARCH_BLIND_INDEX',
  'DECRYPT_SUCCESS',
  'DECRYPT_BLOCKED',
  'KEY_ROTATE',
  'TAMPER_DETECTED',
  'SESSION_BLOCKED',
];

export const AuditLogsPage: React.FC = () => {
  const { t } = useI18n();
  const { reqCtx, refreshVersion, showToast } = useWorkspace();

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    valid: boolean;
    checkedCount: number;
    latestHash: string;
    reason?: string;
  } | null>(null);

  const loadLogs = useCallback(async () => {
    try {
      const res = await vaultApi.fetchAuditLogs(reqCtx, {
        limit: 50,
        action: actionFilter,
      });
      setLogs(res.items);
      setTotal(res.total);
    } catch (err) {
      showToast('danger', 'Failed to load audit logs', err instanceof Error ? err.message : undefined);
    }
  }, [actionFilter, reqCtx, showToast]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs, refreshVersion]);

  const handleVerifyChain = async () => {
    setVerifying(true);
    try {
      const res = await vaultApi.verifyAuditChain(reqCtx);
      setVerifyResult(res);
      showToast(
        res.valid ? 'success' : 'danger',
        res.valid ? `Audit Hash Chain VALID (${res.checkedCount} entries)` : 'Audit Chain Tampered!',
        res.valid ? `Latest SHA-256: ${res.latestHash.slice(0, 22)}...` : res.reason,
      );
    } catch (err) {
      showToast('danger', 'Verification Error', err instanceof Error ? err.message : undefined);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[#111827]">
            {t('audit.title')}
          </h1>
          <p className="text-[13.5px] text-[#71717A] mt-1">{t('audit.subtitle')}</p>
        </div>

        <button
          type="button"
          disabled={verifying}
          onClick={() => void handleVerifyChain()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#18181B] hover:bg-black text-[#D4F358] text-[13px] font-semibold self-start cursor-pointer"
        >
          <FileCheck2 className="w-4 h-4" />
          {verifying ? 'Recomputing SHA-256 Chain...' : t('action.verifyChain')}
        </button>
      </div>

      {/* Verification Status Banner */}
      {verifyResult && (
        <div
          className={`rounded-[20px] p-4 border flex flex-wrap items-center justify-between gap-3 ${
            verifyResult.valid
              ? 'bg-[#10B981]/10 border-[#10B981]/30'
              : 'bg-[#F43F5E]/10 border-[#F43F5E]/30'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {verifyResult.valid ? (
              <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-[#F43F5E]" />
            )}
            <div>
              <div className="text-[13.5px] font-bold text-[#111827]">
                {verifyResult.valid
                  ? `CHAIN INTEGRITY VALID — ${verifyResult.checkedCount} entries verified from GENESIS`
                  : `CHAIN INTEGRITY BROKEN — ${verifyResult.reason}`}
              </div>
              <div className="font-mono-crypto text-[11.5px] text-[#71717A] break-all mt-0.5">
                latestEntryHash: {verifyResult.latestHash}
              </div>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-white text-[#111827] text-[11.5px] font-bold border border-[#E4E4E7]">
            Zero PII Logged
          </span>
        </div>
      )}

      {/* Action Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {ACTION_FILTERS.map((act) => (
            <button
              key={act}
              type="button"
              onClick={() => setActionFilter(act)}
              className={`px-3 py-1.5 rounded-full text-[11.5px] font-semibold transition-colors cursor-pointer ${
                actionFilter === act
                  ? 'bg-[#18181B] text-[#D4F358]'
                  : 'bg-white border border-[#E4E4E7] text-[#71717A] hover:text-[#111827]'
              }`}
            >
              {act}
            </button>
          ))}
        </div>
        <span className="text-[12px] font-semibold text-[#71717A] tabular-nums">
          Total matching events: {total}
        </span>
      </div>

      {/* Audit Ledger Table */}
      <div className="bg-white rounded-[24px] border border-[#E4E4E7] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[#E4E4E7] text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
                <th className="py-3.5 px-4">Seq</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Actor / Role</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Result</th>
                <th className="py-3.5 px-4">Prev Hash → Entry Hash (SHA-256)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E7]">
              {logs.map((log) => (
                <tr key={log.auditId} className="hover:bg-[#ECECEE]/45">
                  <td className="py-3 px-4 font-mono-crypto font-bold text-[#111827] tabular-nums">
                    #{log.seq}
                  </td>
                  <td className="py-3 px-4 text-[#71717A] whitespace-nowrap tabular-nums">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-mono-crypto font-semibold text-[#111827]">
                      {log.actorId}
                    </div>
                    <div className="text-[11px] text-[#71717A] uppercase">{log.actorRole}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-mono-crypto font-semibold text-[#111827]">
                      {log.action}
                    </div>
                    {log.recordId && (
                      <div className="font-mono-crypto text-[11px] text-[#71717A]">
                        {log.recordId} {log.purpose ? `· ${log.purpose}` : ''}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        log.result === 'SUCCESS'
                          ? 'bg-[#10B981]/15 text-[#10B981]'
                          : 'bg-[#F43F5E]/15 text-[#F43F5E]'
                      }`}
                    >
                      {log.result}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono-crypto text-[11px] text-[#71717A]">
                    <span>{log.prevHash === 'GENESIS' ? 'GENESIS' : log.prevHash.slice(0, 10) + '…'}</span>
                    <span className="mx-1.5 text-[#111827]">→</span>
                    <span className="text-[#111827] font-semibold">{log.entryHash.slice(0, 14)}…</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
