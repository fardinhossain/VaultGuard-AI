import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Check, Copy, KeyRound, Lock, Terminal } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

type SnippetTab = 'node' | 'python' | 'mongo' | 'postgres' | 'curl';

export const DocsPage: React.FC = () => {
  const { sessionApiKey, showToast } = useWorkspace();
  const [activeTab, setActiveTab] = useState<SnippetTab>('node');
  const [copied, setCopied] = useState(false);

  const displayKey = sessionApiKey?.rawKey ?? 'vg_live_your_store_api_key';

  const codeSnippets: Record<SnippetTab, string> = {
    node: `// Node.js / Next.js / Express checkout protection (zero extra dependencies)
const API_KEY = process.env.VAULTGUARD_API_KEY || '${displayKey}';
const BASE_URL = 'http://localhost:4000/v1';

// 1. Encrypt customer details BEFORE saving the order into YOUR database
const enc = await fetch(\`\${BASE_URL}/crypto/encrypt\`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
  body: JSON.stringify({
    data: {
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      orderTotal: customer.orderTotal,
    },
    blindIndexFields: ['phone'],
  }),
}).then((r) => r.json());

// Save enc.envelope & enc.blindIndexes.phone inside YOUR MongoDB / PostgreSQL / MySQL!`,
    python: `# Python (FastAPI / Django / Flask) store integration
import requests

API_KEY = "${displayKey}"
BASE_URL = "http://localhost:4000/v1"

res = requests.post(
    f"{BASE_URL}/crypto/encrypt",
    headers={"x-api-key": API_KEY},
    json={
        "data": {
            "name": order.name,
            "phone": order.phone,
            "email": order.email,
            "address": order.address,
            "orderTotal": order.total,
        },
        "blindIndexFields": ["phone"],
    },
).json()

# Persist res["envelope"] and res["blindIndexes"]["phone"] in your own store DB`,
    mongo: `import { VaultGuardClient } from '@vaultguard/node';
import { OrderModel } from './models/Order';

const vault = new VaultGuardClient({ apiKey: '${displayKey}' });

const safeOrder = await vault.protectDocument(req.body, {
  sensitiveFields: ['name', 'phone', 'email', 'address', 'orderTotal'],
  blindIndexFields: ['phone'],
});

await OrderModel.create(safeOrder); // 0% plaintext stored in MongoDB`,
    postgres: `import { VaultGuardClient } from '@vaultguard/node';
import { prisma } from './db';

const vault = new VaultGuardClient({ apiKey: '${displayKey}' });

const { envelope, blindIndexes } = await vault.encryptFields(checkoutData, {
  blindIndexFields: ['phone'],
});

await prisma.order.create({
  data: {
    orderNumber: 'ORD-1024',
    phoneBlindIndex: blindIndexes.phone,
    encryptedCustomer: envelope,
  },
});`,
    curl: `curl -X POST http://localhost:4000/v1/crypto/encrypt \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${displayKey}" \\
  -d '{
    "data": {
      "name": "Fardin Hossain",
      "phone": "01712345678",
      "email": "fardin@supershop.bd",
      "address": "Dhanmondi Road 7, Dhaka",
      "orderTotal": 4850
    },
    "blindIndexFields": ["phone"]
  }'`,
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeSnippets[activeTab]).catch(() => undefined);
    setCopied(true);
    showToast('success', 'Copied Integration Snippet');
    window.setTimeout(() => setCopied(false), 2000);
  };

  const endpoints = [
    {
      method: 'POST',
      path: '/v1/api-keys/verify',
      title: 'Verify API Key Health & Scope',
      desc: 'Validate your store’s API key status (`active`, `revoked`, `sentinel_blocked`) and role permissions on boot.',
      req: `{ "apiKey": "${displayKey}" }`,
      res: `{ "valid": true, "status": "active", "tenantId": "tenant_supershop_bd", "roleScope": "admin" }`,
    },
    {
      method: 'POST',
      path: '/v1/crypto/encrypt',
      title: 'Encrypt Customer Fields (Zero-Storage)',
      desc: 'Encrypts sensitive fields with AES-256-GCM + fresh 256-bit DEK and returns the envelope + phone blind index. VaultGuard stores zero customer data.',
      req: `{
  "data": { "name": "Fardin Hossain", "phone": "01712345678", "orderTotal": 4850 },
  "blindIndexFields": ["phone"]
}`,
      res: `{
  "recordId": "ext_9a12b4c8d0",
  "algorithm": "AES-256-GCM",
  "envelope": { "ciphertext": "m9Xk2vP8...", "dataNonce": "...", "wrappedDEK": "..." },
  "blindIndexes": { "phone": "a91f8c4d2e7b...3901fa" },
  "storedInVaultGuard": false
}`,
    },
    {
      method: 'POST',
      path: '/v1/crypto/blind-index',
      title: 'Compute Searchable Phone Index',
      desc: 'Normalizes phone numbers (+8801712-345678 → 01712345678) and returns a deterministic HMAC-SHA-256 token to query your own database.',
      req: `{ "field": "phone", "value": "+8801712-345678" }`,
      res: `{ "field": "phone", "blindIndex": "a91f8c4d2e7b...3901fa", "latencyMs": 0.42 }`,
    },
    {
      method: 'POST',
      path: '/v1/crypto/decrypt',
      title: 'Role-Authorized Decryption',
      desc: 'Decrypts the envelope stored in your database while enforcing API-key role redaction (e.g. delivery keys mask email & orderTotal) and AI Sentinel locks.',
      req: `{ "envelope": { "...": "from your DB" }, "purpose": "ORDER_DELIVERY" }`,
      res: `{
  "role": "delivery",
  "data": { "name": "Fardin Hossain", "phone": "01712345678", "orderTotal": "[REDACTED_BY_POLICY]" },
  "integrityVerified": true
}`,
    },
    {
      method: 'POST',
      path: '/v1/crypto/rewrap',
      title: 'Re-Wrap DEK After Key Rotation',
      desc: 'Updates an encrypted record’s wrapped DEK to your latest KEK version without decrypting customer ciphertext.',
      req: `{ "envelope": { "...": "stored in your DB" } }`,
      res: `{ "previousKeyVersion": 1, "newKeyVersion": 2, "ciphertextModified": false }`,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4F358] text-[#18181B] text-[11.5px] font-bold mb-3">
            <BookOpen className="w-3.5 h-3.5" />
            DEVELOPER INTEGRATION GUIDE
          </span>
          <h1 className="text-[30px] sm:text-[36px] font-bold tracking-tight text-[#111827]">
            VaultGuard API & SDK Documentation
          </h1>
          <p className="text-[14px] text-[#71717A] mt-1 max-w-2xl">
            Connect any SuperShop, online store, or e-commerce backend to VaultGuard in 5 minutes
            using a scoped <code className="font-mono-crypto text-[#111827]">x-api-key</code>.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link
            to="/api-keys"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#18181B] hover:bg-black text-[#D4F358] text-[13px] font-bold"
          >
            <KeyRound className="w-4 h-4" />
            Generate API Key
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Base URL & Auth Strip */}
      <section className="bg-white rounded-[24px] border border-[#E4E4E7] p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-[16px] bg-[#ECECEE] p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
            API Base URL
          </div>
          <code className="font-mono-crypto text-[13px] font-bold text-[#111827] mt-1 block">
            http://localhost:4000/v1
          </code>
        </div>
        <div className="rounded-[16px] bg-[#ECECEE] p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
            Authentication Header
          </div>
          <code className="font-mono-crypto text-[13px] font-bold text-[#111827] mt-1 block">
            x-api-key: vg_live_...
          </code>
        </div>
        <div className="rounded-[16px] bg-[#18181B] text-white p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#D4F358]">
            Zero-Storage Guarantee
          </div>
          <div className="text-[13px] font-medium mt-1 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#D4F358]" /> VaultGuard never stores your customer PII
          </div>
        </div>
      </section>

      {/* Copyable Quickstart Code Card */}
      <section className="bg-[#18181B] text-white rounded-[24px] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-[#D4F358]" />
            <h2 className="text-[17px] font-semibold">Quickstart Snippets (5-Line Integration)</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap bg-[#27272A] p-1 rounded-full">
              {[
                { id: 'node', label: 'Node.js fetch' },
                { id: 'python', label: 'Python' },
                { id: 'mongo', label: 'MongoDB' },
                { id: 'postgres', label: 'PostgreSQL' },
                { id: 'curl', label: 'curl' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as SnippetTab)}
                  className={`px-3 py-1 rounded-full text-[12px] font-semibold cursor-pointer transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[#D4F358] text-[#18181B]'
                      : 'text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#27272A] hover:bg-[#3F3F46] text-[12px] font-semibold cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#D4F358]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Code'}
            </button>
          </div>
        </div>

        <pre className="rounded-[18px] bg-[#09090B] border border-white/10 p-4 font-mono-crypto text-[12px] text-[#B4ACF9] overflow-x-auto leading-relaxed">
          {codeSnippets[activeTab]}
        </pre>
      </section>

      {/* Endpoint Reference Cards */}
      <section className="space-y-4">
        <h2 className="text-[22px] font-semibold text-[#111827]">REST API Reference</h2>
        <div className="space-y-4">
          {endpoints.map((ep) => (
            <article
              key={ep.path}
              className="bg-white rounded-[24px] border border-[#E4E4E7] p-6 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="px-3 py-1 rounded-full bg-[#D4F358] text-[#18181B] font-mono-crypto text-[11.5px] font-bold">
                    {ep.method}
                  </span>
                  <code className="font-mono-crypto text-[14px] font-bold text-[#111827]">
                    {ep.path}
                  </code>
                </div>
                <span className="text-[13px] font-semibold text-[#71717A]">{ep.title}</span>
              </div>

              <p className="text-[13px] text-[#71717A] leading-relaxed">{ep.desc}</p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#71717A] mb-1">
                    Request Body
                  </div>
                  <pre className="rounded-[14px] bg-[#ECECEE] p-3.5 font-mono-crypto text-[11.5px] text-[#111827] overflow-x-auto">
                    {ep.req}
                  </pre>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#71717A] mb-1">
                    Response JSON
                  </div>
                  <pre className="rounded-[14px] bg-[#18181B] p-3.5 font-mono-crypto text-[11.5px] text-[#B4ACF9] overflow-x-auto">
                    {ep.res}
                  </pre>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
