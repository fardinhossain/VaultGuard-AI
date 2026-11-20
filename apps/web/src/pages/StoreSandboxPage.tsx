import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FlaskConical,
  KeyRound,
  Lock,
  Search,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Unlock,
} from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  AccessPurpose,
  ActorRole,
  ApiClientError,
  ExternalStoreOrderItem,
  vaultApi,
} from '../lib/api';

const SYNTHETIC_ORDERS = [
  {
    itemsSummary: '3x Basmati Rice 5kg, 2x Mustard Oil',
    name: 'Tahmidul Karim',
    phone: '01733445566',
    email: 'tahmid.buyer@example.com',
    address: 'House 21, Road 5, Dhanmondi, Dhaka',
    orderTotal: '৳4,650',
  },
  {
    itemsSummary: '1x Infant Milk, 4x Fresh Juice',
    name: 'Sabina Yasmin',
    phone: '01877665544',
    email: 'sabina.buyer@example.com',
    address: 'Flat 6C, Sector 13, Uttara, Dhaka',
    orderTotal: '৳3,280',
  },
];

export const StoreSandboxPage: React.FC = () => {
  const { t } = useI18n();
  const { reqCtx, sessionApiKey, setSessionApiKey, refreshVersion, triggerRefresh, showToast } =
    useWorkspace();

  const [protectionEnabled, setProtectionEnabled] = useState(true);
  const [apiKeyInput, setApiKeyInput] = useState(sessionApiKey?.rawKey ?? '');
  const [keyStatus, setKeyStatus] = useState<{
    checked: boolean;
    valid: boolean;
    label: string;
    roleScope?: ActorRole;
  } | null>(
    sessionApiKey
      ? {
          checked: true,
          valid: true,
          label: `${sessionApiKey.keyPrefix} (${sessionApiKey.roleScope.toUpperCase()})`,
          roleScope: sessionApiKey.roleScope,
        }
      : null,
  );

  // Checkout state
  const [itemsSummary, setItemsSummary] = useState('2x Grocery Basket, 1x Olive Oil');
  const [name, setName] = useState('Tahmidul Karim');
  const [phone, setPhone] = useState('01733445566');
  const [email, setEmail] = useState('tahmid.buyer@example.com');
  const [address, setAddress] = useState('House 21, Road 5, Dhanmondi, Dhaka');
  const [orderTotal, setOrderTotal] = useState('৳4,650');
  const [presetIdx, setPresetIdx] = useState(1);
  const [placingOrder, setPlacingOrder] = useState(false);

  // Store DB orders & blind search
  const [orders, setOrders] = useState<ExternalStoreOrderItem[]>([]);
  const [summary, setSummary] = useState({
    totalOrders: 0,
    protectedOrders: 0,
    unprotectedOrders: 0,
    exposedPlaintextFields: 0,
  });
  const [searchPhone, setSearchPhone] = useState('');
  const [searchBlindIndex, setSearchBlindIndex] = useState<string | null>(null);

  // Per-order inline decrypt/tamper outputs
  const [decryptPurpose, setDecryptPurpose] = useState<AccessPurpose>('ADMIN_AUDIT');
  const [orderOutputs, setOrderOutputs] = useState<
    Record<
      string,
      {
        kind: 'decrypt' | 'tamper' | 'error';
        status: number;
        payload: Record<string, unknown>;
      }
    >
  >({});

  useEffect(() => {
    if (sessionApiKey) {
      setApiKeyInput(sessionApiKey.rawKey);
      setKeyStatus({
        checked: true,
        valid: true,
        label: `${sessionApiKey.keyPrefix} (${sessionApiKey.roleScope.toUpperCase()})`,
        roleScope: sessionApiKey.roleScope,
      });
    }
  }, [sessionApiKey]);

  const loadOrders = useCallback(async () => {
    try {
      const res = await vaultApi.fetchStoreOrders(reqCtx);
      setOrders(res.orders);
      setSummary(res.summary);
      setSearchBlindIndex(null);
    } catch (err) {
      showToast('danger', 'Failed to load store DB', err instanceof Error ? err.message : undefined);
    }
  }, [reqCtx, showToast]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders, refreshVersion]);

  const handleMintAndPlugKey = async (roleScope: ActorRole) => {
    try {
      const res = await vaultApi.createApiKey(reqCtx, {
        name: `Store Sandbox ${roleScope.toUpperCase()} Key`,
        roleScope,
      });
      setApiKeyInput(res.rawKey);
      setProtectionEnabled(true);
      setSessionApiKey({
        rawKey: res.rawKey,
        keyPrefix: res.apiKey.keyPrefix,
        roleScope,
        name: res.apiKey.name,
      });
      setKeyStatus({
        checked: true,
        valid: true,
        label: `${res.apiKey.keyPrefix} (${roleScope.toUpperCase()})`,
        roleScope,
      });
      setDecryptPurpose(
        roleScope === 'admin'
          ? 'ADMIN_AUDIT'
          : roleScope === 'delivery'
            ? 'ORDER_DELIVERY'
            : 'ANALYTICS',
      );
      showToast(
        'success',
        `Plugged In ${roleScope.toUpperCase()} API Key`,
        `${res.apiKey.keyPrefix} connected to SuperShop backend.`,
      );
      triggerRefresh();
    } catch (err) {
      showToast('danger', 'Failed to mint key', err instanceof Error ? err.message : undefined);
    }
  };

  const handleVerifyKey = async () => {
    if (!apiKeyInput.trim()) {
      setKeyStatus(null);
      return;
    }
    const res = await vaultApi.verifyApiKey(apiKeyInput.trim());
    if (res.ok && res.data.valid) {
      const scope = res.data.roleScope as ActorRole;
      setKeyStatus({
        checked: true,
        valid: true,
        label: `${String(res.data.keyPrefix)} (${scope.toUpperCase()})`,
        roleScope: scope,
      });
      setDecryptPurpose(
        scope === 'admin' ? 'ADMIN_AUDIT' : scope === 'delivery' ? 'ORDER_DELIVERY' : 'ANALYTICS',
      );
      showToast('success', 'API Key Verified', String(res.data.message));
    } else {
      setKeyStatus({
        checked: true,
        valid: false,
        label: String(res.data.error ?? 'INVALID_KEY'),
      });
      showToast('danger', 'API Key Rejected', String(res.data.message));
    }
  };

  const handleFillSynthetic = () => {
    const sample = SYNTHETIC_ORDERS[presetIdx % SYNTHETIC_ORDERS.length]!;
    setItemsSummary(sample.itemsSummary);
    setName(sample.name);
    setPhone(sample.phone);
    setEmail(sample.email);
    setAddress(sample.address);
    setOrderTotal(sample.orderTotal);
    setPresetIdx((p) => p + 1);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlacingOrder(true);
    try {
      const res = await vaultApi.storeCheckout(reqCtx, {
        apiKey: protectionEnabled ? apiKeyInput.trim() : '',
        itemsSummary,
        customer: { name, phone, email, address, orderTotal },
      });
      if (res.protectedByVaultGuard) {
        showToast(
          'success',
          `Order ${res.order.orderNumber} Saved Encrypted (${res.latencyMs} ms)`,
          `Protected via API key ${res.apiKeyPrefixUsed} · 0 plaintext saved in Store DB.`,
        );
      } else {
        showToast(
          'danger',
          `Order ${res.order.orderNumber} Saved in PLAINTEXT!`,
          'Protection was OFF — hackers dumping Store DB can read this customer PII.',
        );
      }
      triggerRefresh();
    } catch (err) {
      showToast(
        'danger',
        'Store Checkout Blocked',
        err instanceof Error ? err.message : 'Invalid or missing API key',
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleStoreSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPhone.trim()) {
      await loadOrders();
      return;
    }
    if (!apiKeyInput.trim()) {
      showToast('danger', 'API Key Required', 'Plug in a VaultGuard API key to compute blind-index search.');
      return;
    }
    try {
      const res = await vaultApi.storeSearchByPhone(reqCtx, apiKeyInput.trim(), searchPhone.trim());
      setOrders(res.orders);
      setSearchBlindIndex(res.phoneBlindIndex);
      showToast(
        'info',
        `Matched ${res.matchCount} Encrypted Order(s)`,
        `Searched merchant DB via HMAC blind index (${res.latencyMs} ms).`,
      );
    } catch (err) {
      showToast('danger', 'Search Failed', err instanceof Error ? err.message : undefined);
    }
  };

  const handleDecryptOrder = async (orderId: string) => {
    try {
      const res = await vaultApi.storeDecryptOrder(reqCtx, {
        orderId,
        apiKey: apiKeyInput.trim(),
        purpose: decryptPurpose,
      });
      setOrderOutputs((prev) => ({
        ...prev,
        [orderId]: {
          kind: 'decrypt',
          status: 200,
          payload: res as unknown as Record<string, unknown>,
        },
      }));
      triggerRefresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setOrderOutputs((prev) => ({
          ...prev,
          [orderId]: {
            kind: 'error',
            status: err.status,
            payload: err.payload,
          },
        }));
      }
    }
  };

  const handleTamperOrder = async (orderId: string) => {
    try {
      const res = await vaultApi.storeTamperOrder(reqCtx, orderId);
      setOrderOutputs((prev) => ({
        ...prev,
        [orderId]: {
          kind: 'tamper',
          status: 422,
          payload: res as unknown as Record<string, unknown>,
        },
      }));
      triggerRefresh();
    } catch (err) {
      showToast('danger', 'Tamper Test Error', err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#18181B] text-[#D4F358] text-[11px] font-bold uppercase tracking-wider mb-2">
          WORKABLE MVP · EXTERNAL SUPERSHOP DATABASE SIMULATOR
        </div>
        <h1 className="text-[28px] font-bold tracking-tight text-[#111827]">
          SuperShop Zero-Storage Encryption Simulator
        </h1>
        <p className="text-[13.5px] text-[#71717A] mt-1">
          Test the complete 4-step workflow live: generate a scoped key, place a customer order,
          inspect what a hacker sees inside the SuperShop&apos;s own database, search by phone
          number, and test role-based decryption.
        </p>
      </div>

      {/* STEP 1: Top API Key Connector Bar */}
      <section className="bg-white rounded-[24px] border border-[#E4E4E7] p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-full bg-[#18181B] text-[#D4F358] font-mono text-[11px] font-bold">
              STEP 1
            </span>
            <span className="text-[13px] font-semibold text-[#111827]">
              Store API Key & Encryption Mode:
            </span>
            <div className="inline-flex bg-[#ECECEE] p-1 rounded-full">
              <button
                type="button"
                onClick={() => setProtectionEnabled(false)}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-colors cursor-pointer ${
                  !protectionEnabled
                    ? 'bg-[#F43F5E] text-white'
                    : 'text-[#71717A] hover:text-[#111827]'
                }`}
              >
                Without API Key (Plaintext)
              </button>
              <button
                type="button"
                onClick={() => setProtectionEnabled(true)}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-colors cursor-pointer ${
                  protectionEnabled
                    ? 'bg-[#18181B] text-[#D4F358]'
                    : 'text-[#71717A] hover:text-[#111827]'
                }`}
              >
                Encrypt With VaultGuard Key
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-semibold text-[#71717A]">
              One-Click Plug Scoped Key:
            </span>
            {(['admin', 'delivery', 'marketing'] as ActorRole[]).map((scope) => (
              <button
                key={scope}
                type="button"
                onClick={() => void handleMintAndPlugKey(scope)}
                className="px-3 py-1.5 rounded-full bg-[#ECECEE] hover:bg-[#D4F358] text-[#111827] text-[12px] font-semibold capitalize transition-colors cursor-pointer"
              >
                + {scope} Key
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          <div className="relative flex-1">
            <KeyRound className="w-4 h-4 text-[#71717A] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={apiKeyInput}
              onChange={(e) => {
                setApiKeyInput(e.target.value);
                if (!e.target.value.trim()) {
                  setKeyStatus(null);
                }
              }}
              placeholder="Paste VaultGuard API Key (vg_live_...) or click + Mint Admin Key above — clear to simulate hacker without key"
              className="w-full rounded-full border border-[#E4E4E7] pl-10 pr-4 py-2.5 font-mono-crypto text-[12.5px] focus:outline-none focus:border-[#18181B]"
            />
          </div>

          <button
            type="button"
            onClick={() => void handleVerifyKey()}
            className="px-4 py-2.5 rounded-full bg-[#ECECEE] hover:bg-[#E4E4E7] text-[#111827] text-[12.5px] font-semibold cursor-pointer"
          >
            Verify Key
          </button>

          <button
            type="button"
            onClick={() => {
              setSessionApiKey(null);
              setApiKeyInput('');
              setKeyStatus(null);
            }}
            className="px-4 py-2.5 rounded-full border border-[#E4E4E7] text-[#71717A] hover:text-[#111827] text-[12.5px] font-semibold cursor-pointer"
          >
            Clear API Key
          </button>

          <span
            className={`px-3.5 py-2 rounded-full text-[12px] font-bold text-center ${
              !protectionEnabled
                ? 'bg-[#F43F5E]/15 text-[#F43F5E]'
                : keyStatus?.valid
                  ? 'bg-[#D4F358] text-[#18181B]'
                  : keyStatus && !keyStatus.valid
                    ? 'bg-[#F43F5E]/15 text-[#F43F5E]'
                    : 'bg-[#ECECEE] text-[#71717A]'
            }`}
          >
            {!protectionEnabled
              ? 'UNPROTECTED — PLAINTEXT'
              : keyStatus?.valid
                ? `CONNECTED: ${keyStatus.label}`
                : keyStatus
                  ? `KEY ERROR: ${keyStatus.label}`
                  : 'NO API KEY PLUGGED IN'}
          </span>
        </div>
      </section>

      {/* Main Split: Left Storefront Checkout + Right Merchant's Own DB */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: SuperShop BD Checkout + Blind-Index Search */}
        <div className="lg:col-span-5 space-y-5">
          <section className="bg-white rounded-[24px] border border-[#E4E4E7] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#18181B] text-[#D4F358] flex items-center justify-center">
                  <ShoppingBag className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#18181B] text-[#D4F358] font-mono text-[10px] font-bold">
                      STEP 2
                    </span>
                    <h2 className="text-[16px] font-semibold text-[#111827]">
                      SuperShop Checkout (POST /v1/crypto/encrypt)
                    </h2>
                  </div>
                  <p className="text-[11.5px] text-[#71717A] mt-0.5">
                    Encrypts customer PII before saving to the SuperShop&apos;s own database
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFillSynthetic}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#ECECEE] hover:bg-[#D4F358] text-[11.5px] font-semibold cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Load Sample Checkout
              </button>
            </div>

            <form onSubmit={handleCheckout} className="space-y-3">
              <div>
                <label className="block text-[11.5px] font-semibold text-[#71717A] mb-1">
                  Cart Items
                </label>
                <input
                  required
                  value={itemsSummary}
                  onChange={(e) => setItemsSummary(e.target.value)}
                  className="w-full rounded-[14px] border border-[#E4E4E7] px-3.5 py-2 text-[13px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#71717A] mb-1">
                    Customer Name
                  </label>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-[14px] border border-[#E4E4E7] px-3.5 py-2 text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#71717A] mb-1">
                    Phone
                  </label>
                  <input
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-[14px] border border-[#E4E4E7] px-3.5 py-2 text-[13px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#71717A] mb-1">
                    Email
                  </label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-[14px] border border-[#E4E4E7] px-3.5 py-2 text-[13px]"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#71717A] mb-1">
                    Order Total
                  </label>
                  <input
                    required
                    value={orderTotal}
                    onChange={(e) => setOrderTotal(e.target.value)}
                    className="w-full rounded-[14px] border border-[#E4E4E7] px-3.5 py-2 text-[13px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-[#71717A] mb-1">
                  Delivery Address
                </label>
                <input
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-[14px] border border-[#E4E4E7] px-3.5 py-2 text-[13px]"
                />
              </div>

              <button
                type="submit"
                disabled={placingOrder}
                className={`w-full py-3 rounded-full text-[13px] font-bold transition-colors cursor-pointer ${
                  protectionEnabled
                    ? 'bg-[#18181B] hover:bg-black text-[#D4F358]'
                    : 'bg-[#F43F5E] hover:bg-[#e11d48] text-white'
                }`}
              >
                {placingOrder
                  ? 'Processing Checkout...'
                  : protectionEnabled
                    ? 'Encrypt via API Key & Save to Store DB'
                    : 'Place Order WITHOUT API Key (Saves Plaintext!)'}
              </button>
            </form>
          </section>

          {/* STEP 3: Search inside Merchant's Own DB via Blind Index */}
          <section className="bg-white rounded-[24px] border border-[#E4E4E7] p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-[#18181B] text-[#D4F358] font-mono text-[10px] font-bold">
                STEP 3
              </span>
              <h3 className="text-[14.5px] font-semibold text-[#111827]">
                Search Encrypted Store DB by Phone (POST /v1/crypto/blind-index)
              </h3>
            </div>
            <form onSubmit={handleStoreSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#71717A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  placeholder="e.g. 01722998877"
                  className="w-full rounded-full border border-[#E4E4E7] pl-9 pr-3 py-2 text-[12.5px]"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-full bg-[#18181B] text-white text-[12px] font-semibold cursor-pointer"
              >
                Search
              </button>
              {searchBlindIndex && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchPhone('');
                    void loadOrders();
                  }}
                  className="px-3 py-2 rounded-full bg-[#ECECEE] text-[12px] font-semibold cursor-pointer"
                >
                  All
                </button>
              )}
            </form>
            {searchBlindIndex && (
              <div className="font-mono-crypto text-[11px] text-[#71717A] break-all">
                HMAC Blind Index: {searchBlindIndex}
              </div>
            )}
          </section>
        </div>

        {/* STEP 4: Right: Live "SuperShop's Own Database" Hacker View */}
        <section className="lg:col-span-7 bg-white rounded-[24px] border border-[#E4E4E7] p-6 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-[#111827]" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-[#18181B] text-[#D4F358] font-mono text-[10px] font-bold">
                    STEP 4
                  </span>
                  <h2 className="text-[16px] font-semibold text-[#111827]">
                    SuperShop’s Own Database (<code>db.merchant_orders</code>) & Role Decryption
                  </h2>
                </div>
                <p className="text-[12px] text-[#71717A] mt-0.5">
                  What a hacker sees on DB breach vs. what authorized Admin / Delivery keys can decrypt
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11.5px] font-bold">
              <span className="px-3 py-1 rounded-full bg-[#F43F5E]/15 text-[#F43F5E]">
                {summary.unprotectedOrders} Plaintext Leaks
              </span>
              <span className="px-3 py-1 rounded-full bg-[#10B981]/15 text-[#10B981]">
                {summary.protectedOrders} Encrypted Safe
              </span>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 bg-[#ECECEE] rounded-[14px] px-3.5 py-2 text-[12px]">
            <span className="font-medium text-[#111827]">
              Decryption Purpose tested by API Key:
            </span>
            <select
              value={decryptPurpose}
              onChange={(e) => setDecryptPurpose(e.target.value as AccessPurpose)}
              className="rounded-full bg-white border border-[#E4E4E7] px-3 py-1 font-mono-crypto text-[11.5px]"
            >
              <option value="ADMIN_AUDIT">ADMIN_AUDIT</option>
              <option value="ORDER_DELIVERY">ORDER_DELIVERY</option>
              <option value="POLICY_FULL">POLICY_FULL</option>
              <option value="ANALYTICS">ANALYTICS</option>
            </select>
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[680px] pr-1">
            {orders.map((ord) => {
              const out = orderOutputs[ord.orderId];
              return (
                <article
                  key={ord.orderId}
                  className={`rounded-[20px] p-4 border ${
                    ord.protectedByVaultGuard
                      ? 'bg-[#18181B] text-white border-[#18181B]'
                      : 'bg-[#FFF1F2] text-[#881337] border-[#F43F5E]/35'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      {ord.protectedByVaultGuard ? (
                        <Lock className="w-4 h-4 text-[#D4F358]" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-[#F43F5E]" />
                      )}
                      <span className="font-mono-crypto font-bold text-[13px]">
                        {ord.orderNumber}
                      </span>
                      <span className="text-[12px] opacity-80">· {ord.itemsSummary}</span>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        ord.protectedByVaultGuard
                          ? 'bg-[#D4F358] text-[#18181B]'
                          : 'bg-[#F43F5E] text-white'
                      }`}
                    >
                      {ord.protectedByVaultGuard
                        ? `ENCRYPTED (${ord.apiKeyPrefixUsed ?? 'API Key'})`
                        : 'PLAINTEXT EXPOSED'}
                    </span>
                  </div>

                  {ord.protectedByVaultGuard ? (
                    <pre className="rounded-[14px] bg-[#09090B] border border-white/10 p-3 font-mono-crypto text-[11px] text-[#B4ACF9] overflow-x-auto max-h-44">
                      {JSON.stringify(
                        {
                          _vaultguard: ord.encryptedEnvelope,
                          blindIndexes: ord.blindIndexes,
                        },
                        null,
                        2,
                      )}
                    </pre>
                  ) : (
                    <pre className="rounded-[14px] bg-white/80 border border-[#F43F5E]/25 p-3 font-mono-crypto text-[11.5px] text-[#881337] overflow-x-auto">
                      {JSON.stringify(ord.plaintextCustomer, null, 2)}
                    </pre>
                  )}

                  {ord.protectedByVaultGuard && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleDecryptOrder(ord.orderId)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#D4F358] hover:bg-[#c5e642] text-[#18181B] text-[12px] font-bold cursor-pointer"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        Decrypt Using Pasted API Key
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleTamperOrder(ord.orderId)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#27272A] hover:bg-[#3F3F46] text-white text-[12px] font-semibold cursor-pointer"
                      >
                        <FlaskConical className="w-3.5 h-3.5 text-[#B4ACF9]" />
                        Tamper 1 Byte
                      </button>
                    </div>
                  )}

                  {out && (
                    <div
                      className={`mt-3 rounded-[14px] p-3 text-[11.5px] font-mono-crypto border ${
                        out.status === 200
                          ? 'bg-[#10B981]/15 border-[#10B981]/40 text-white'
                          : 'bg-[#F43F5E]/20 border-[#F43F5E]/40 text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold mb-1.5">
                        {out.status === 200 ? (
                          <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                        ) : (
                          <ShieldAlert className="w-4 h-4 text-[#F43F5E]" />
                        )}
                        HTTP {out.status}
                      </div>
                      <pre className="overflow-x-auto">{JSON.stringify(out.payload, null, 2)}</pre>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
