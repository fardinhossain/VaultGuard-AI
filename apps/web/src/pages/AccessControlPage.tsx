import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Play, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  AccessPurpose,
  ActorRole,
  ApiClientError,
  CustomerPIIInput,
  EncryptedRecordItem,
  vaultApi,
} from '../lib/api';

type PolicyRow = {
  role: ActorRole;
  label: string;
  labelBn: string;
  allowedPurposes: AccessPurpose[];
  fields: Record<keyof CustomerPIIInput, 'PLAINTEXT' | 'REDACTED' | 'BLOCKED'>;
  httpOutcome: string;
};

export const AccessControlPage: React.FC = () => {
  const { lang, t } = useI18n();
  const { reqCtx, actorRole, setActorRole, refreshVersion, triggerRefresh } = useWorkspace();

  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [purposes, setPurposes] = useState<AccessPurpose[]>([
    'ORDER_DELIVERY',
    'ADMIN_AUDIT',
    'POLICY_FULL',
    'ANALYTICS',
  ]);
  const [records, setRecords] = useState<EncryptedRecordItem[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [testPurpose, setTestPurpose] = useState<AccessPurpose>('ORDER_DELIVERY');
  const [testing, setTesting] = useState(false);
  const [testOutput, setTestOutput] = useState<{
    status: number;
    body: Record<string, unknown>;
    latencyMs?: number;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [polRes, recRes] = await Promise.all([
        vaultApi.fetchPolicies(),
        vaultApi.fetchRecords(reqCtx),
      ]);
      setPolicies(polRes.policies);
      setPurposes(polRes.purposes);
      setRecords(recRes.records);
      if (recRes.records.length > 0 && !selectedRecordId) {
        setSelectedRecordId(recRes.records[0]!.recordId);
      }
    } catch {
      // ignore transient load error
    }
  }, [reqCtx, selectedRecordId]);

  useEffect(() => {
    void loadData();
  }, [loadData, refreshVersion]);

  useEffect(() => {
    if (actorRole === 'admin') setTestPurpose('ADMIN_AUDIT');
    else if (actorRole === 'delivery') setTestPurpose('ORDER_DELIVERY');
    else setTestPurpose('ANALYTICS');
  }, [actorRole]);

  const handleRunTest = async () => {
    if (!selectedRecordId) return;
    setTesting(true);
    try {
      const res = await vaultApi.decryptRecord(reqCtx, selectedRecordId, testPurpose);
      setTestOutput({
        status: 200,
        latencyMs: res.latencyMs,
        body: res as unknown as Record<string, unknown>,
      });
      triggerRefresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setTestOutput({
          status: err.status,
          body: err.payload,
        });
        triggerRefresh();
      }
    } finally {
      setTesting(false);
    }
  };

  const fields: Array<keyof CustomerPIIInput> = ['name', 'phone', 'email', 'address', 'orderTotal'];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-[#111827]">
          {t('access.title')}
        </h1>
        <p className="text-[13.5px] text-[#71717A] mt-1">{t('access.subtitle')}</p>
      </div>

      {/* Role & Field-Level Permission Matrix */}
      <section className="bg-white rounded-[24px] border border-[#E4E4E7] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E4E4E7] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#111827]" />
            <h2 className="text-[16px] font-semibold text-[#111827]">
              RBAC + Purpose-Bound Field Matrix
            </h2>
          </div>

          <div className="flex items-center gap-1.5 bg-[#ECECEE] p-1 rounded-full">
            {(['admin', 'delivery', 'marketing'] as ActorRole[]).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setActorRole(role)}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold capitalize cursor-pointer transition-colors ${
                  actorRole === role
                    ? 'bg-[#18181B] text-[#D4F358]'
                    : 'text-[#71717A] hover:text-[#111827]'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#E4E4E7] text-[11.5px] font-semibold uppercase tracking-wider text-[#71717A]">
                <th className="py-3.5 px-6">Role</th>
                <th className="py-3.5 px-4">Allowed Purpose</th>
                {fields.map((f) => (
                  <th key={f} className="py-3.5 px-3 capitalize">
                    {f}
                  </th>
                ))}
                <th className="py-3.5 px-6 text-right">HTTP Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E4E7]">
              {policies.map((p) => {
                const isActive = p.role === actorRole;
                return (
                  <tr
                    key={p.role}
                    onClick={() => setActorRole(p.role)}
                    className={`cursor-pointer transition-colors ${
                      isActive ? 'bg-[#D4F358]/18' : 'hover:bg-[#ECECEE]/50'
                    }`}
                  >
                    <td className="py-4 px-6 font-semibold text-[#111827]">
                      <div className="flex items-center gap-2">
                        {isActive && <span className="w-2 h-2 rounded-full bg-[#18181B]" />}
                        {lang === 'bn' ? p.labelBn : p.label}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono-crypto text-[11.5px] text-[#71717A]">
                      {p.allowedPurposes.length > 0 ? p.allowedPurposes.join(', ') : 'NONE (Blocked)'}
                    </td>
                    {fields.map((f) => {
                      const state = p.fields[f];
                      return (
                        <td key={f} className="py-4 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              state === 'PLAINTEXT'
                                ? 'bg-[#10B981]/15 text-[#10B981]'
                                : state === 'REDACTED'
                                  ? 'bg-[#D4F358] text-[#18181B]'
                                  : 'bg-[#F43F5E]/15 text-[#F43F5E]'
                            }`}
                          >
                            {state}
                          </span>
                        </td>
                      );
                    })}
                    <td className="py-4 px-6 text-right font-mono-crypto text-[12px] font-semibold">
                      {p.httpOutcome}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Live Policy Playground */}
      <section className="bg-white rounded-[24px] border border-[#E4E4E7] p-6">
        <h2 className="text-[16px] font-semibold text-[#111827] mb-1">
          {t('access.playgroundTitle')}
        </h2>
        <p className="text-[12.5px] text-[#71717A] mb-4">
          Execute a real <code className="font-mono-crypto">POST /v1/records/:id/decrypt</code> call
          as <strong className="text-[#111827] uppercase">{actorRole}</strong> and inspect live
          field redaction or <code className="font-mono-crypto">403 Forbidden</code> enforcement.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-[11.5px] font-semibold text-[#71717A] mb-1">
              Target Encrypted Record
            </label>
            <select
              value={selectedRecordId}
              onChange={(e) => setSelectedRecordId(e.target.value)}
              className="w-full rounded-full border border-[#E4E4E7] px-4 py-2.5 text-[13px] font-mono-crypto bg-white"
            >
              {records.map((r) => (
                <option key={r.recordId} value={r.recordId}>
                  {r.recordId} (KEK v{r.keyVersion})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11.5px] font-semibold text-[#71717A] mb-1">
              Declared Business Purpose
            </label>
            <select
              value={testPurpose}
              onChange={(e) => setTestPurpose(e.target.value as AccessPurpose)}
              className="w-full rounded-full border border-[#E4E4E7] px-4 py-2.5 text-[13px] font-mono-crypto bg-white"
            >
              {purposes.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              disabled={testing || !selectedRecordId}
              onClick={() => void handleRunTest()}
              className="w-full py-2.5 px-5 rounded-full bg-[#18181B] hover:bg-black text-[#D4F358] text-[13px] font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4" />
              {testing ? 'Evaluating...' : 'Test Policy on Record'}
            </button>
          </div>
        </div>

        {testOutput && (
          <div className="rounded-[18px] bg-[#18181B] text-white p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {testOutput.status === 200 ? (
                  <CheckCircle2 className="w-4.5 h-4.5 text-[#10B981]" />
                ) : (
                  <ShieldAlert className="w-4.5 h-4.5 text-[#F43F5E]" />
                )}
                <span className="font-mono-crypto text-[13px] font-bold">
                  HTTP {testOutput.status} {testOutput.status === 200 ? 'OK' : 'FORBIDDEN'}
                </span>
              </div>
              {testOutput.latencyMs !== undefined && (
                <span className="font-mono-crypto text-[11.5px] text-[#A1A1AA]">
                  {testOutput.latencyMs} ms
                </span>
              )}
            </div>
            <pre className="font-mono-crypto text-[12px] text-[#B4ACF9] overflow-auto">
              {JSON.stringify(testOutput.body, null, 2)}
            </pre>
          </div>
        )}
      </section>
    </div>
  );
};
