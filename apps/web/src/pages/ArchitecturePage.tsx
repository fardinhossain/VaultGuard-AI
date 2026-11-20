import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  Database,
  KeyRound,
  Layers,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useWorkspace } from '../context/WorkspaceContext';

const SDK_SNIPPET = `import { VaultGuardClient } from '@vaultguard/node';

const vault = new VaultGuardClient({
  endpoint: process.env.VAULTGUARD_API_URL || 'http://localhost:4000/v1',
  tenantId: 'tenant_supershop_bd',
  actorId: 'checkout_service_01',
  actorRole: 'delivery',
});

// 1. Encrypt customer PII with AES-256-GCM + DEK/KEK envelope
const protectedRecord = await vault.encrypt({
  name: 'Fardin Hossain',
  phone: '01712345678',
  email: 'fardin.demo@example.com',
  address: 'House 14, Road 7, Dhanmondi, Dhaka',
  orderTotal: '৳4,850',
});

// 2. Exact-match lookup on encrypted MongoDB via HMAC blind index
const matches = await vault.searchByPhone('+8801712-345678');

// 3. Purpose-bound decryption (field-redacted automatically)
const deliveryView = await vault.decrypt(protectedRecord.recordId, {
  purpose: 'ORDER_DELIVERY',
});`;

type ArchTab = 'planes' | 'envelope' | 'blind';

export const ArchitecturePage: React.FC = () => {
  const { t } = useI18n();
  const { showToast } = useWorkspace();
  const [activeTab, setActiveTab] = useState<ArchTab>('planes');
  const [copied, setCopied] = useState(false);

  const handleCopySdk = async () => {
    try {
      await navigator.clipboard.writeText(SDK_SNIPPET);
      setCopied(true);
      showToast('success', 'Copied @vaultguard/node SDK Snippet');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('info', 'Copy manually from code card');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-[#111827]">
          {t('arch.title')}
        </h1>
        <p className="text-[13.5px] text-[#71717A] mt-1">{t('arch.subtitle')}</p>
      </div>

      {/* 1. Mandatory Requirement: Basic System Flow (Input -> AI -> Output) */}
      <section className="bg-[#18181B] text-white rounded-[24px] p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <span className="px-3 py-1 rounded-full bg-[#D4F358] text-[#18181B] text-[11.5px] font-bold">
            SYSTEM FLOW: INPUT → CRYPTO & AI → OUTPUT
          </span>
          <span className="text-[12px] text-[#A1A1AA]">
            Zero Plaintext Ever Exposed to AI Engine or Audit Logs
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          <div className="bg-[#27272A] rounded-[18px] p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#B4ACF9] mb-1">
              1. Input
            </div>
            <div className="text-[15px] font-semibold mb-1.5">Checkout PII & Access Telemetry</div>
            <p className="text-[12px] text-[#A1A1AA] leading-relaxed">
              Retail apps send customer PII via <code className="text-white">@vaultguard/node</code>{' '}
              while operational metadata (actor, role, purpose, velocity) streams to the gateway.
            </p>
          </div>

          <div className="bg-[#27272A] rounded-[18px] p-4 border border-[#D4F358]/40">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#D4F358] mb-1">
              2. Crypto + Sentinel AI
            </div>
            <div className="text-[15px] font-semibold mb-1.5">
              AES-256-GCM + ML / Graph / RAG
            </div>
            <p className="text-[12px] text-[#A1A1AA] leading-relaxed">
              Per-record DEK + tenant KEK + HMAC blind index protect PII. Sentinel computes ML
              Z-scores, Actor-Record scraping fan-out graphs, and PDPA Policy RAG citations.
            </p>
          </div>

          <div className="bg-[#27272A] rounded-[18px] p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#10B981] mb-1">
              3. Output
            </div>
            <div className="text-[15px] font-semibold mb-1.5">
              Ciphertext, Redacted PII & Auto-Block
            </div>
            <p className="text-[12px] text-[#A1A1AA] leading-relaxed">
              Zero plaintext in MongoDB, field-masked responses for Delivery, instant 403 block on
              Marketing, and automated session lock with XAI explanation when risk ≥ 70.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Problem & Target Users + Potential Impact KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-5 bg-white rounded-[24px] border border-[#E4E4E7] p-6 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#ECECEE] flex items-center justify-center">
              <Users className="w-4.5 h-4.5 text-[#111827]" />
            </div>
            <h2 className="text-[16px] font-semibold text-[#111827]">
              Problem & Target User Personas
            </h2>
          </div>
          <p className="text-[12.5px] text-[#71717A] leading-relaxed">
            Supermarkets, online marketplaces, hospitals, and fintechs in Bangladesh store millions
            of names, phone numbers, and home addresses in plaintext databases. Building envelope
            encryption and searchable indexes from scratch stalls product teams.
          </p>
          <div className="space-y-2 text-[12px]">
            <div className="rounded-[14px] bg-[#ECECEE] px-3.5 py-2.5">
              <strong className="text-[#111827]">Retail & F-Commerce SMEs:</strong> Drop-in 5-line
              Node.js SDK without rewriting checkout databases.
            </div>
            <div className="rounded-[14px] bg-[#ECECEE] px-3.5 py-2.5">
              <strong className="text-[#111827]">Operational Teams (3 Roles):</strong> Admin (full
              audit), Delivery Agent (name/phone/address only), Marketing (zero raw PII).
            </div>
          </div>
        </section>

        <section className="lg:col-span-7 bg-white rounded-[24px] border border-[#E4E4E7] p-6">
          <h2 className="text-[16px] font-semibold text-[#111827] mb-3">
            Defined Potential Impact & Commercial Viability KPIs
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="rounded-[18px] bg-[#ECECEE] p-4">
              <div className="text-[24px] font-bold text-[#111827] tabular-nums">0%</div>
              <div className="text-[11.5px] text-[#71717A] mt-0.5">
                Readable PII in stolen DB dumps
              </div>
            </div>
            <div className="rounded-[18px] bg-[#ECECEE] p-4">
              <div className="text-[24px] font-bold text-[#111827] tabular-nums">&lt;2 ms</div>
              <div className="text-[11.5px] text-[#71717A] mt-0.5">
                AES-256-GCM checkout latency
              </div>
            </div>
            <div className="rounded-[18px] bg-[#ECECEE] p-4">
              <div className="text-[24px] font-bold text-[#111827] tabular-nums">&lt;50 ms</div>
              <div className="text-[11.5px] text-[#71717A] mt-0.5">
                Insider exfiltration auto-block
              </div>
            </div>
            <div className="rounded-[18px] bg-[#D4F358] p-4">
              <div className="text-[24px] font-bold text-[#18181B] tabular-nums">৳5,000</div>
              <div className="text-[11.5px] text-[#18181B]/80 font-medium mt-0.5">
                /mo Startup SaaS Tier
              </div>
            </div>
          </div>
          <div className="text-[12px] text-[#71717A] flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full bg-[#ECECEE] text-[#111827] font-medium">
              Business Tier: ৳20,000/mo
            </span>
            <span className="px-3 py-1 rounded-full bg-[#ECECEE] text-[#111827] font-medium">
              Enterprise Sovereign VPC Agent: Custom
            </span>
          </div>
        </section>
      </div>

      {/* 3. Interactive Tabbed Architecture Visuals */}
      <section className="bg-white rounded-[24px] border border-[#E4E4E7] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-[#111827]" />
            <h2 className="text-[16px] font-semibold text-[#111827]">
              Technical Architecture Blueprint
            </h2>
          </div>
          <div className="flex flex-wrap gap-1.5 bg-[#ECECEE] p-1 rounded-full">
            {[
              { id: 'planes', label: 'Control vs Data Plane' },
              { id: 'envelope', label: 'Envelope DEK / KEK' },
              { id: 'blind', label: 'HMAC Blind Index' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as ArchTab)}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#18181B] text-[#D4F358]'
                    : 'text-[#71717A] hover:text-[#111827]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'planes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-[18px] bg-[#ECECEE] p-5 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-[#111827]">
                <Cpu className="w-4 h-4" /> Control Plane (Governance & AI)
              </div>
              <ul className="text-[12.5px] text-[#71717A] space-y-1.5 list-disc pl-5">
                <li>Tenant registry, RBAC + purpose-bound ABAC policy matrix</li>
                <li>VaultGuard Sentinel (ML Z-score + Access Graph + Policy RAG)</li>
                <li>
                  SHA-256 hash-chained audit ledger (
                  <code className="font-mono-crypto text-[#111827]">prevHash → entryHash</code>)
                </li>
              </ul>
            </div>
            <div className="rounded-[18px] bg-[#18181B] text-white p-5 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-[#D4F358]">
                <KeyRound className="w-4 h-4" /> Data Plane (Sovereign Crypto Engine)
              </div>
              <ul className="text-[12.5px] text-[#A1A1AA] space-y-1.5 list-disc pl-5">
                <li>
                  Pure <code className="font-mono-crypto text-white">packages/crypto-core</code>{' '}
                  AES-256-GCM + 96-bit CSPRNG nonces
                </li>
                <li>
                  Tenant + Record AAD (
                  <code className="font-mono-crypto text-white">tenantId:recordId:v1</code>) stopping
                  record swapping
                </li>
                <li>
                  Pluggable <code className="font-mono-crypto text-white">KeyProvider</code>{' '}
                  interface (LocalDev MVP → AWS/GCP KMS Prod)
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'envelope' && (
          <div className="rounded-[18px] bg-[#ECECEE] p-5 flex flex-wrap items-center justify-between gap-3 text-[12.5px]">
            <div className="bg-white rounded-[14px] px-4 py-3 border border-[#E4E4E7]">
              <div className="font-bold text-[#111827]">1. Fresh 256-bit DEK</div>
              <div className="text-[#71717A]">Generated per customer record</div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#71717A]" />
            <div className="bg-white rounded-[14px] px-4 py-3 border border-[#E4E4E7]">
              <div className="font-bold text-[#111827]">2. AES-256-GCM + AAD</div>
              <div className="text-[#71717A]">128-bit authTag fails closed</div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#71717A]" />
            <div className="bg-[#18181B] text-white rounded-[14px] px-4 py-3">
              <div className="font-bold text-[#D4F358]">3. Wrap DEK with KEK vN</div>
              <div className="text-[#A1A1AA]">Rotate v1 → v2 without touching ciphertext</div>
            </div>
          </div>
        )}

        {activeTab === 'blind' && (
          <div className="rounded-[18px] bg-[#ECECEE] p-5 flex flex-wrap items-center justify-between gap-3 text-[12.5px]">
            <div className="bg-white rounded-[14px] px-4 py-3 border border-[#E4E4E7]">
              <div className="font-bold text-[#111827]">+8801712-345678</div>
              <div className="text-[#71717A]">Deterministic normalize → 01712345678</div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#71717A]" />
            <div className="bg-white rounded-[14px] px-4 py-3 border border-[#E4E4E7]">
              <div className="font-bold text-[#111827]">HMAC-SHA-256(indexKey)</div>
              <div className="text-[#71717A]">Separate HKDF key from KEK & DEK</div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#71717A]" />
            <div className="bg-[#18181B] text-white rounded-[14px] px-4 py-3">
              <div className="font-bold text-[#B4ACF9]">Indexed MongoDB Match</div>
              <div className="text-[#A1A1AA]">Exact search with 0 database decryption</div>
            </div>
          </div>
        )}
      </section>

      {/* 4. Compliance Checklist + Honest Boundary + SDK Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-5 bg-white rounded-[24px] border border-[#E4E4E7] p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#10B981]" />
            <h2 className="text-[16px] font-semibold text-[#111827]">
              PDPA 2026 & Sovereignty Checklist
            </h2>
          </div>
          <ul className="space-y-2.5 text-[12.5px]">
            {[
              'Customer-controlled KEK isolation (BYOK Sovereign Mode)',
              'Purpose-bound decryption & automatic field redaction',
              'Zero plaintext PII sent to Sentinel ML / Graph / RAG',
              'Fail-closed AES-GCM 128-bit integrity verification',
              'SHA-256 hash-chained audit trail aligned with NIST SP 800-57',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-[#111827]">
                <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="rounded-[16px] bg-[#D4F358]/30 border border-[#D4F358] p-3.5 text-[12px] text-[#18181B]">
            <strong>Honest MVP Boundary:</strong> Uses <code>LocalDevKeyProvider</code> (HKDF-SHA-256)
            to simulate AWS KMS / GCP KMS / HSM custody at $0. Production deployments bind{' '}
            <code>KeyProvider</code> to hardware-backed KMS before handling live PII.
          </div>
        </section>

        <section className="lg:col-span-7 bg-[#18181B] text-white rounded-[24px] p-6 flex flex-col">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <Database className="w-4.5 h-4.5 text-[#D4F358]" />
              <h2 className="text-[15.5px] font-semibold">@vaultguard/node — 5-Line SDK</h2>
            </div>
            <button
              type="button"
              onClick={() => void handleCopySdk()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#27272A] hover:bg-[#3F3F46] text-[12px] font-semibold cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#D4F358]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy SDK'}
            </button>
          </div>
          <pre className="flex-1 rounded-[18px] bg-[#09090B] border border-white/10 p-4 font-mono-crypto text-[11.5px] text-[#B4ACF9] overflow-auto leading-relaxed">
            {SDK_SNIPPET}
          </pre>
        </section>
      </div>
    </div>
  );
};
