import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  BarChart2,
  BookOpen,
  Check,
  ChevronDown,
  Code2,
  Copy,
  CreditCard,
  DollarSign,
  ExternalLink,
  Eye,
  FileText,
  KeyRound,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { ActorRole, ApiKeyItem, vaultApi } from '../lib/api';

type GroupByOption = 'apiKey' | 'project';
type ConnectorTab = 'nodeSdk' | 'nodeFetch' | 'python' | 'curl';

export const ApiKeysPage: React.FC = () => {
  const { t } = useI18n();
  const {
    reqCtx,
    refreshVersion,
    activeTenant,
    tenants,
    sessionApiKey,
    setSessionApiKey,
    triggerRefresh,
    showToast,
  } = useWorkspace();
  const navigate = useNavigate();

  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<GroupByOption>('apiKey');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [menuOpenKeyId, setMenuOpenKeyId] = useState<string | null>(null);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [quickstartOpen, setQuickstartOpen] = useState(false);
  const [selectedSnippetKey, setSelectedSnippetKey] = useState<string>('');

  // Form state
  const [keyName, setKeyName] = useState('SuperShop BD Checkout Server');
  const [roleScope, setRoleScope] = useState<ActorRole>('admin');
  const [creating, setCreating] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<{
    rawKey: string;
    keyPrefix: string;
    roleScope: ActorRole;
    name: string;
    warning: string;
  } | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [connectorTab, setConnectorTab] = useState<ConnectorTab>('nodeSdk');

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await vaultApi.fetchApiKeys(reqCtx);
      setKeys(res.keys);
    } catch (err) {
      showToast('danger', 'Failed to load API keys', err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [reqCtx, showToast]);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys, refreshVersion]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;
    setCreating(true);
    try {
      const res = await vaultApi.createApiKey(reqCtx, {
        name: keyName.trim(),
        roleScope,
      });
      const createdPayload = {
        rawKey: res.rawKey,
        keyPrefix: res.apiKey.keyPrefix,
        roleScope: res.apiKey.roleScope,
        name: res.apiKey.name,
      };
      setNewlyCreatedKey({ ...createdPayload, warning: res.warning });
      setSessionApiKey(createdPayload);
      setCreateModalOpen(false);
      showToast(
        'success',
        `API Key Created: ${res.apiKey.keyPrefix}`,
        `Scope: ${res.apiKey.roleScope.toUpperCase()} — copy it now to use in your store.`,
      );
      triggerRefresh();
    } catch (err) {
      showToast('danger', 'Failed to create API key', err instanceof Error ? err.message : undefined);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    try {
      const res = await vaultApi.revokeApiKey(reqCtx, keyId);
      showToast(
        'info',
        `API Key Revoked: ${res.apiKey.keyPrefix}`,
        'Any store service using this key will immediately fail closed with 401 Unauthorized.',
      );
      setMenuOpenKeyId(null);
      triggerRefresh();
    } catch (err) {
      showToast('danger', 'Revoke failed', err instanceof Error ? err.message : undefined);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    showToast('success', 'Copied to Clipboard', text);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const currentDisplayKey =
    selectedSnippetKey ||
    newlyCreatedKey?.rawKey ||
    sessionApiKey?.rawKey ||
    'vg_live_supersho_YOUR_API_KEY';

  const snippets: Record<ConnectorTab, string> = {
    nodeSdk: `// Install: npm install @vaultguard/node-sdk
import { VaultGuardClient } from '@vaultguard/node-sdk';

const vg = new VaultGuardClient({
  apiKey: '${currentDisplayKey}',
  baseUrl: 'http://localhost:4000/v1'
});

// 1. Encrypt customer order before saving in your MongoDB / PostgreSQL
const protectedOrder = await vg.protectDocument(
  {
    orderId: 'ORD-BD-9041',
    customerName: 'Karim Chowdhury',
    phone: '01712345678',
    deliveryAddress: 'House 12, Road 5, Dhanmondi, Dhaka',
    totalBDT: 4850
  },
  ['customerName', 'deliveryAddress'],
  'phone' // Generates HMAC-SHA-256 blind index for search
);

await db.collection('orders').insertOne(protectedOrder);

// 2. Fast Customer Search by Phone without decrypting the DB
const phoneIndex = vg.createBlindIndex('01712345678');
const orderInDb = await db.collection('orders').findOne({ phone_blind_index: phoneIndex });

// 3. Authorized Decryption
const customerData = await vg.unprotectDocument(orderInDb);
console.log('Customer Shipping:', customerData.deliveryAddress);`,

    nodeFetch: `// Raw REST integration in any Node / Express / Next.js app
const API_KEY = '${currentDisplayKey}';
const BASE_URL = 'http://localhost:4000/v1';

// Encrypt customer PII at checkout
const res = await fetch(\`\${BASE_URL}/crypto/encrypt\`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
  body: JSON.stringify({
    data: {
      name: 'Karim Chowdhury',
      phone: '01712345678',
      address: 'House 12, Road 5, Dhanmondi, Dhaka',
      orderTotal: 4850
    },
    blindIndexFields: ['phone']
  })
});
const { envelope, blindIndexes } = await res.json();
// Store envelope and blindIndexes.phone in YOUR store database!`,

    python: `# Python / Django / FastAPI E-Commerce Integration
import requests

API_KEY = "${currentDisplayKey}"
BASE_URL = "http://localhost:4000/v1"

payload = {
    "data": {
        "name": "Karim Chowdhury",
        "phone": "01712345678",
        "address": "Dhanmondi, Dhaka",
        "total": 4850
    },
    "blindIndexFields": ["phone"]
}

res = requests.post(
    f"{BASE_URL}/crypto/encrypt",
    headers={"x-api-key": API_KEY},
    json=payload
)
protected_data = res.json()
# Save protected_data["envelope"] to PostgreSQL / MongoDB`,

    curl: `# Direct Terminal / Shell Test
curl -X POST http://localhost:4000/v1/crypto/encrypt \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${currentDisplayKey}" \\
  -d '{
    "data": {
      "customer": "Karim Chowdhury",
      "phone": "01712345678",
      "address": "Dhanmondi, Dhaka"
    },
    "blindIndexFields": ["phone"]
  }'`,
  };

  const filteredKeys = keys.filter((k) => {
    if (projectFilter === 'all') return true;
    return k.tenantId === projectFilter;
  });

  return (
    <div className="space-y-6 text-white min-h-[calc(100vh-140px)] flex flex-col justify-between">
      <div className="space-y-6">
        {/* Top Header Row matching Google AI Studio reference */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[26px] sm:text-[30px] font-bold text-white tracking-tight">
              API Keys
            </h1>
            <p className="text-[13px] text-[#A1A1AA] mt-0.5">
              Manage zero-storage encryption keys for your SuperShop checkout and order databases.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedSnippetKey(newlyCreatedKey?.rawKey || sessionApiKey?.rawKey || '');
                setQuickstartOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#27272A] hover:bg-[#323238] text-white text-[13px] font-medium transition-colors border border-white/5 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#A1A1AA]" />
              API quickstart
            </button>

            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#D4F358] hover:bg-[#c5e642] text-[#18181B] text-[13px] font-bold transition-colors cursor-pointer shadow-sm"
            >
              <KeyRound className="w-4 h-4" />
              + Create API key
            </button>
          </div>
        </div>

        {/* Newly Created Key Alert Banner */}
        {newlyCreatedKey && (
          <div className="bg-[#18181B] border-2 border-[#D4F358] rounded-[24px] p-5 shadow-xl space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[13px] font-bold text-[#D4F358]">
                <ShieldCheck className="w-4 h-4" />
                NEW API KEY GENERATED — SAVE IMMEDIATELY
              </span>
              <button
                type="button"
                onClick={() => setNewlyCreatedKey(null)}
                className="text-[#A1A1AA] hover:text-white p-1 rounded-full hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[12.5px] text-[#D4D4D8]">
              {newlyCreatedKey.warning ||
                "This secret key will never be shown again. Copy it now and store it securely in your store backend's .env file."}
            </p>
            <div className="flex items-center gap-2 bg-[#09090B] p-2.5 rounded-xl border border-white/10">
              <code className="text-[#D4F358] font-mono text-[12.5px] truncate flex-1">
                {newlyCreatedKey.rawKey}
              </code>
              <button
                type="button"
                onClick={() => copyToClipboard(newlyCreatedKey.rawKey, 'banner-raw')}
                className="px-3 py-1.5 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-white text-[12px] font-medium flex items-center gap-1.5 cursor-pointer"
              >
                {copiedKey === 'banner-raw' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#D4F358]" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Key
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Filter and Grouping Controls Bar matching Reference Image */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          {/* Group By Toggle Pills */}
          <div className="flex items-center gap-2 text-[13px]">
            <span className="text-[#A1A1AA] font-medium">Group by</span>
            <div className="inline-flex bg-[#27272A] p-0.5 rounded-full border border-white/10">
              <button
                type="button"
                onClick={() => setGroupBy('apiKey')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium cursor-pointer transition-colors ${
                  groupBy === 'apiKey'
                    ? 'bg-[#3F3F46] text-white font-semibold shadow-xs'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4F358]" />
                API Key
              </button>
              <button
                type="button"
                onClick={() => setGroupBy('project')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium cursor-pointer transition-colors ${
                  groupBy === 'project'
                    ? 'bg-[#3F3F46] text-white font-semibold shadow-xs'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                Project / Store
              </button>
            </div>
          </div>

          {/* Filter by Dropdown */}
          <div className="flex items-center gap-2 text-[13px]">
            <span className="text-[#A1A1AA] font-medium">Filter by</span>
            <div className="relative">
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                aria-label="Filter API keys by store"
                className="appearance-none bg-[#27272A] hover:bg-[#323238] border border-white/10 rounded-full pl-3.5 pr-8 py-1.5 text-[12.5px] font-medium text-white cursor-pointer focus:outline-hidden focus:border-[#D4F358]"
              >
                <option value="all">All stores & projects</option>
                {tenants.map((t) => (
                  <option key={t.tenantId} value={t.tenantId}>
                    {t.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#A1A1AA] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* API Keys Data Table matching Google AI Studio reference */}
        <div className="border border-white/10 rounded-[20px] overflow-hidden bg-[#18181B]/60 backdrop-blur-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px] border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[12px] font-semibold text-[#A1A1AA] uppercase tracking-wider bg-white/2">
                  <th className="py-3 px-5 font-semibold">Key</th>
                  <th className="py-3 px-5 font-semibold">Project / Store</th>
                  <th className="py-3 px-5 font-semibold">Created</th>
                  <th className="py-3 px-5 font-semibold">Billing Tier</th>
                  <th className="py-3 px-5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-[#A1A1AA]">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#D4F358]" />
                      Loading merchant API keys...
                    </td>
                  </tr>
                ) : filteredKeys.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#A1A1AA]">
                      No active API keys found for this filter.
                    </td>
                  </tr>
                ) : (
                  filteredKeys.map((k) => {
                    const maskedSuffix = k.keyPrefix.length > 8 ? k.keyPrefix.slice(-6) : k.keyPrefix;
                    const createdDate = new Date(k.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });

                    return (
                      <tr key={k.keyId} className="hover:bg-white/2 transition-colors group">
                        {/* Key Column */}
                        <td className="py-3.5 px-5 align-top">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSnippetKey(k.keyPrefix);
                              setQuickstartOpen(true);
                            }}
                            className="font-mono text-[#D4F358] hover:underline font-medium text-[13px] text-left block cursor-pointer"
                          >
                            ...{maskedSuffix}
                          </button>
                          <div className="text-[12px] text-[#A1A1AA] mt-0.5 truncate max-w-[220px]">
                            {k.name}
                          </div>
                        </td>

                        {/* Project / Store Column */}
                        <td className="py-3.5 px-5 align-top">
                          <div className="text-white font-medium text-[13px]">
                            {activeTenant?.name ?? 'SuperShop BD'}
                          </div>
                          <div className="text-[11.5px] text-[#71717A] mt-0.5 font-mono">
                            {k.tenantId}
                          </div>
                        </td>

                        {/* Created Column */}
                        <td className="py-3.5 px-5 align-top text-[#D4D4D8] text-[13px]">
                          {createdDate}
                        </td>

                        {/* Billing Tier Column */}
                        <td className="py-3.5 px-5 align-top">
                          <button
                            type="button"
                            onClick={() => navigate('/pricing')}
                            className="text-[#93C5FD] hover:underline font-medium text-[12.5px] block cursor-pointer"
                          >
                            Set up billing
                          </button>
                          <div className="text-[11.5px] text-[#71717A] capitalize">
                            {activeTenant?.planTier ?? 'free'} tier
                          </div>
                        </td>

                        {/* Actions Column (right aligned icons) */}
                        <td className="py-3.5 px-5 align-top text-right">
                          <div className="inline-flex items-center gap-1.5 text-[#A1A1AA]">
                            {/* Copy Prefix */}
                            <button
                              type="button"
                              title="Copy Key Prefix"
                              onClick={() => copyToClipboard(k.keyPrefix, k.keyId)}
                              className="p-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              {copiedKey === k.keyId ? (
                                <Check className="w-4 h-4 text-[#D4F358]" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>

                            {/* Billing / Dollar */}
                            <button
                              type="button"
                              title="Manage Billing"
                              onClick={() => navigate('/pricing')}
                              className="p-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>

                            {/* Usage Analytics */}
                            <button
                              type="button"
                              title="Usage & Metrics"
                              onClick={() => navigate('/dashboard')}
                              className="p-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              <BarChart2 className="w-4 h-4" />
                            </button>

                            {/* Quickstart Code */}
                            <button
                              type="button"
                              title="View Integration Snippet"
                              onClick={() => {
                                setSelectedSnippetKey(k.keyPrefix);
                                setQuickstartOpen(true);
                              }}
                              className="p-1.5 rounded-lg hover:text-[#D4F358] hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              <Code2 className="w-4 h-4" />
                            </button>

                            {/* Revoke / Delete Menu */}
                            <div className="relative">
                              <button
                                type="button"
                                title="More Options"
                                onClick={() =>
                                  setMenuOpenKeyId(menuOpenKeyId === k.keyId ? null : k.keyId)
                                }
                                className="p-1.5 rounded-lg hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {menuOpenKeyId === k.keyId && (
                                <>
                                  <div
                                    className="fixed inset-0 z-20"
                                    onClick={() => setMenuOpenKeyId(null)}
                                  />
                                  <div className="absolute right-0 mt-1 w-44 bg-[#27272A] border border-white/10 rounded-xl shadow-xl p-1.5 z-30 text-left">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedSnippetKey(k.keyPrefix);
                                        setQuickstartOpen(true);
                                        setMenuOpenKeyId(null);
                                      }}
                                      className="w-full px-3 py-1.5 text-[12px] text-white hover:bg-white/10 rounded-lg flex items-center gap-2 cursor-pointer"
                                    >
                                      <Code2 className="w-3.5 h-3.5 text-[#D4F358]" />
                                      View Code
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleRevoke(k.keyId)}
                                      className="w-full px-3 py-1.5 text-[12px] text-[#F43F5E] hover:bg-[#F43F5E]/10 rounded-lg flex items-center gap-2 cursor-pointer mt-1"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      Revoke Key
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Empty / Discovery Banner matching Google AI Studio reference */}
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#D4F358]">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-[16px] font-semibold text-white">
            Can't find your API keys here?
          </h3>
          <p className="text-[13px] text-[#A1A1AA] max-w-md">
            This list shows active keys for your current store project. You can generate a new API key
            above or test live encryption in the SuperShop Simulator.
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={() => navigate('/playground')}
              className="px-5 py-2 rounded-full bg-[#27272A] hover:bg-[#323238] text-white text-[13px] font-medium transition-colors border border-white/10 cursor-pointer"
            >
              Open Live Store Simulator
            </button>
          </div>
        </div>
      </div>

      {/* CREATE API KEY MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#18181B] text-white border border-white/10 rounded-[24px] max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-5 right-5 text-[#A1A1AA] hover:text-white p-1 rounded-full hover:bg-white/10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#D4F358] text-[#18181B] flex items-center justify-center font-bold">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[18px] font-bold">Create Store API Key</h3>
                <p className="text-[12px] text-[#A1A1AA]">
                  Scoped credentials for your external e-commerce server.
                </p>
              </div>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1.5">
                  Key Label / Service Name
                </label>
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g. Shwapno Dhanmondi Checkout Server"
                  required
                  className="w-full bg-[#27272A] border border-white/10 rounded-xl px-3.5 py-2.5 text-[13.5px] text-white placeholder-[#71717A] focus:outline-hidden focus:border-[#D4F358]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1.5">
                  Target Store / Branch
                </label>
                <div className="bg-[#27272A] border border-white/10 rounded-xl px-3.5 py-2.5 text-[13.5px] text-white flex items-center justify-between">
                  <span>{activeTenant?.name ?? 'SuperShop BD'}</span>
                  <span className="text-[11px] font-mono text-[#D4F358] uppercase">
                    {activeTenant?.planTier ?? 'free'} PLAN
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1.5">
                  Role & Permission Scope
                </label>
                <div className="space-y-2">
                  {[
                    {
                      id: 'admin' as ActorRole,
                      title: 'Admin (Full Protection)',
                      desc: 'Can encrypt, blind-index, and decrypt customer records with full audit log.',
                    },
                    {
                      id: 'staff_audit' as ActorRole,
                      title: 'Staff / Dispatcher',
                      desc: 'Can search via blind-index and decrypt shipping addresses only.',
                    },
                    {
                      id: 'app_readonly' as ActorRole,
                      title: 'App / Analytics (Zero Plaintext)',
                      desc: 'Can only query blind-indexes; strictly blocked from revealing raw PII.',
                    },
                  ].map((r) => (
                    <label
                      key={r.id}
                      className={`block p-3 rounded-xl border cursor-pointer transition-colors ${
                        roleScope === r.id
                          ? 'border-[#D4F358] bg-[#D4F358]/10'
                          : 'border-white/10 bg-[#27272A] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="roleScope"
                          value={r.id}
                          checked={roleScope === r.id}
                          onChange={() => setRoleScope(r.id)}
                          className="accent-[#D4F358]"
                        />
                        <span className="text-[13px] font-semibold text-white">{r.title}</span>
                      </div>
                      <p className="text-[11.5px] text-[#A1A1AA] ml-5 mt-0.5">{r.desc}</p>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-full text-[13px] text-[#A1A1AA] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-full bg-[#D4F358] text-[#18181B] text-[13px] font-bold hover:bg-[#c5e642] disabled:opacity-50 cursor-pointer"
                >
                  {creating ? 'Generating Key...' : 'Create Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICKSTART MODAL */}
      {quickstartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#18181B] text-white border border-white/10 rounded-[28px] max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setQuickstartOpen(false)}
              className="absolute top-5 right-5 text-[#A1A1AA] hover:text-white p-1 rounded-full hover:bg-white/10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#D4F358] text-[#18181B] flex items-center justify-center font-bold">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[18px] font-bold">API Quickstart: Protect Your SuperShop DB</h3>
                <p className="text-[12px] text-[#A1A1AA]">
                  3 lines of code before saving orders to MongoDB, PostgreSQL, or MySQL.
                </p>
              </div>
            </div>

            {/* Language Tabs */}
            <div className="flex items-center gap-1.5 border-b border-white/10 pb-2 mb-3">
              {[
                { id: 'nodeSdk' as ConnectorTab, label: 'Node.js SDK (Recommended)' },
                { id: 'nodeFetch' as ConnectorTab, label: 'Node / Next.js REST' },
                { id: 'python' as ConnectorTab, label: 'Python (Django / FastAPI)' },
                { id: 'curl' as ConnectorTab, label: 'cURL / Shell' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setConnectorTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer ${
                    connectorTab === tab.id
                      ? 'bg-[#D4F358] text-[#18181B] font-semibold'
                      : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Code Box */}
            <div className="relative bg-[#09090B] border border-white/10 rounded-2xl p-4 font-mono text-[11.5px] max-h-80 overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(snippets[connectorTab]);
                  setCopiedSnippet(true);
                  setTimeout(() => setCopiedSnippet(false), 2500);
                }}
                className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-white text-[11px] font-medium flex items-center gap-1 cursor-pointer border border-white/5"
              >
                {copiedSnippet ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#D4F358]" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Code
                  </>
                )}
              </button>
              <pre className="text-[#D4D4D8] leading-relaxed whitespace-pre">
                {snippets[connectorTab]}
              </pre>
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[12px] text-[#A1A1AA]">
              <span>Need the full client library? Run <code className="text-[#D4F358]">npm install @vaultguard/node-sdk</code></span>
              <button
                type="button"
                onClick={() => {
                  setQuickstartOpen(false);
                  navigate('/docs');
                }}
                className="text-[#D4F358] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                Full Documentation <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
