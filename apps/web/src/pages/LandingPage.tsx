import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Check,
  Copy,
  Database,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  Terminal,
  Truck,
} from 'lucide-react';
import { useMerchantAuth } from '../context/AuthContext';
import { PricingSection } from '../components/pricing/PricingSection';

const PLAINTEXT_DB_ROW = `{
  "orderNumber": "ORD-1001",
  "status": "PENDING_DELIVERY",
  "customer": {
    "name": "Fardin Hossain",
    "phone": "01712345678",
    "email": "fardin@gmail.com",
    "address": "House 14, Road 7, Dhanmondi, Dhaka",
    "orderTotal": 4850
  }
}`;

const ENCRYPTED_DB_ROW = `{
  "orderNumber": "ORD-1001",
  "status": "PENDING_DELIVERY",
  "phoneSearchHash": "6531cc7ff259cad99583afddb4eb76fe...",
  "encryptedCustomer": {
    "algorithm": "AES-256-GCM",
    "ciphertext": "M8KutXzYo8RgH6bLUSR1VViL9tHMBBqLV6X9...",
    "dataNonce": "Avp3YDmJGrZEyDqL",
    "wrappedDEK": "5BUX3fT5itJgHet1yVqmL69pE0GACcH4..."
  }
}`;

const STEP_2_CODE = `// Inside the SuperShop's OWN checkout backend (Node.js / Express / Next.js)
const customerData = {
  name: "Fardin Hossain",
  phone: "01712345678",
  email: "fardin@gmail.com",
  address: "House 14, Road 7, Dhanmondi, Dhaka",
  orderTotal: 4850
};

// 1. Send customer PII to VaultGuard using your API Key
const response = await fetch("http://localhost:4000/v1/crypto/encrypt", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.VAULTGUARD_API_KEY
  },
  body: JSON.stringify({
    data: customerData,
    blindIndexFields: ["phone"] // Creates a searchable hash of the phone number
  })
});
const { envelope, blindIndexes } = await response.json();

// 2. The SuperShop saves ONLY the encrypted envelope in THEIR OWN database!
await SuperShopDatabase.orders.insertOne({
  orderNumber: "ORD-1001",
  status: "PENDING_DELIVERY",
  phoneSearchHash: blindIndexes.phone, // Used to search by phone without decrypting!
  encryptedCustomer: envelope // 100% unreadable AES-256-GCM ciphertext
});`;

const STEP_3_CODE = `// How the SuperShop searches customers by phone number (POS / Support)
const res = await fetch("http://localhost:4000/v1/crypto/blind-index", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.VAULTGUARD_API_KEY
  },
  body: JSON.stringify({ field: "phone", value: "01712345678" })
});
const { blindIndex } = await res.json();

// 2. Query THEIR OWN database using that hash (<2ms lookup, zero table decryption)!
const order = await SuperShopDatabase.orders.findOne({
  phoneSearchHash: blindIndex
});`;

const STEP_4_CODE = `// How the SuperShop views real data when authorized (Admin vs Delivery Rider)
const res = await fetch("http://localhost:4000/v1/crypto/decrypt", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.VAULTGUARD_DELIVERY_API_KEY // Delivery Rider's API Key
  },
  body: JSON.stringify({
    envelope: order.encryptedCustomer,
    purpose: "ORDER_DELIVERY"
  })
});
const decrypted = await res.json();`;

export const LandingPage: React.FC = () => {
  const { openRegisterModal } = useMerchantAuth();
  const [heroEncrypted, setHeroEncrypted] = useState(true);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [step4Role, setStep4Role] = useState<'admin' | 'delivery'>('delivery');
  const [copiedCode, setCopiedCode] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.slice(1);
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [location.hash]);

  const copySnippet = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const services = [
    {
      icon: Database,
      title: 'Zero-Storage Architecture',
      desc: 'Your SuperShop keeps its own database (MongoDB, MySQL, PostgreSQL). VaultGuard never stores customer data—we turn PII into ciphertext in memory before you save it.',
      badge: 'Keep Your Own DB',
    },
    {
      icon: Search,
      title: 'Instant Phone Lookup (Blind Index)',
      desc: 'Even though the database is encrypted, POS counters and support agents find customers by phone (01712345678) in <2ms using HMAC-SHA-256 search hashes.',
      badge: 'Searchable Encryption',
    },
    {
      icon: Truck,
      title: 'Scoped Role API Keys',
      desc: 'Your Checkout Backend Key decrypts everything; your Delivery Rider App Key reveals only Name, Phone, and Address while hiding Email and Order Total.',
      badge: 'Field-Level Redaction',
    },
    {
      icon: Activity,
      title: 'AI Sentinel Blocks Stolen Keys',
      desc: 'If a hacker steals an API key and attempts bulk decryption of hundreds of rows, AI Sentinel detects abnormal velocity and blocks the key automatically.',
      badge: 'Real-Time Defense',
    },
    {
      icon: RefreshCw,
      title: 'One-Click Key Revocation & Rotation',
      desc: 'Cut off any compromised key immediately with one click in the portal, or rotate your store KEK (v1 → v2) with zero database downtime.',
      badge: 'Full Key Control',
    },
    {
      icon: Globe2,
      title: '5-Minute Universal Integration',
      desc: 'Standard REST endpoints and Node.js SDK work with Next.js, Express, Django, Laravel, and custom POS systems. Includes English & বাংলা team console.',
      badge: 'REST & Node SDK',
    },
  ];

  const sectors = [
    'SuperShops & Grocery Chains (Shwapno, Meena Bazar, Agora, Chaldal)',
    'Online Marketplaces & Retail Stores',
    'Pharmacies & Healthcare E-Commerce',
    'Quick-Commerce & Delivery Platforms',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 space-y-16">
      {/* 1. HERO SECTION */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-white rounded-[28px] border border-[#E4E4E7] p-7 sm:p-10 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#D4F358] text-[#18181B] text-[12px] font-bold">
                <ShieldCheck className="w-4 h-4" />
                Zero-Storage Database Encryption API
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#ECECEE] text-[#111827] text-[11.5px] font-semibold">
                Keep Your Own MongoDB / MySQL / Postgres
              </span>
            </div>

            <h1 className="text-[34px] sm:text-[44px] font-bold tracking-tight text-[#111827] leading-[1.12] mt-5">
              Protect Your SuperShop Database With One API Key.
            </h1>

            <p className="text-[15.5px] text-[#71717A] mt-4 leading-relaxed max-w-2xl">
              Your SuperShop keeps its own database—VaultGuard never stores your customers&apos; data.
              Use our API key to turn customer names, phone numbers, and addresses into unreadable
              AES-256-GCM ciphertext before saving to your database. Even if hackers steal your
              entire database, they get zero real customer info.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-7">
              <Link
                to="/api-keys"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#18181B] hover:bg-black text-[#D4F358] text-[14px] font-bold transition-colors"
              >
                <KeyRound className="w-4 h-4" />
                Get Your Store API Key
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to="/simulator"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#ECECEE] hover:bg-[#D4F358] text-[#111827] text-[14px] font-semibold transition-colors"
              >
                <Database className="w-4 h-4" />
                Test Live SuperShop Simulator
              </Link>

              <button
                type="button"
                onClick={openRegisterModal}
                className="inline-flex items-center gap-1.5 px-4 py-3 text-[13.5px] font-semibold text-[#71717A] hover:text-[#111827] cursor-pointer"
              >
                Register Shop →
              </button>
            </div>
          </div>

          {/* 4 Business Proof Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-[#E4E4E7]">
            <div>
              <div className="text-[26px] font-bold text-[#111827] tabular-nums">0%</div>
              <div className="text-[11.5px] text-[#71717A]">Plaintext in your DB</div>
            </div>
            <div>
              <div className="text-[26px] font-bold text-[#111827] tabular-nums">&lt;2 ms</div>
              <div className="text-[11.5px] text-[#71717A]">Phone hash search</div>
            </div>
            <div>
              <div className="text-[26px] font-bold text-[#111827] tabular-nums">3 Scopes</div>
              <div className="text-[11.5px] text-[#71717A]">Admin, Rider & BI Keys</div>
            </div>
            <div>
              <div className="text-[26px] font-bold text-[#111827] tabular-nums">24/7</div>
              <div className="text-[11.5px] text-[#71717A]">AI Sentinel key guard</div>
            </div>
          </div>
        </div>

        {/* Interactive Hero Visual: Toggle Plaintext Leak vs API Key Protected DB */}
        <div className="lg:col-span-5 bg-[#18181B] text-white rounded-[28px] p-6 sm:p-7 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="text-[12px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                What Hackers See Inside Your Database
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  heroEncrypted
                    ? 'bg-[#D4F358] text-[#18181B]'
                    : 'bg-[#F43F5E] text-white'
                }`}
              >
                {heroEncrypted ? 'PROTECTED: ZERO REAL PII' : 'UNPROTECTED: DATA STOLEN'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 bg-[#27272A] p-1 rounded-full mb-4">
              <button
                type="button"
                onClick={() => setHeroEncrypted(false)}
                className={`py-2 px-3 rounded-full text-[12px] font-bold cursor-pointer transition-colors ${
                  !heroEncrypted ? 'bg-[#F43F5E] text-white' : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                Without VaultGuard
              </button>
              <button
                type="button"
                onClick={() => setHeroEncrypted(true)}
                className={`py-2 px-3 rounded-full text-[12px] font-bold cursor-pointer transition-colors ${
                  heroEncrypted
                    ? 'bg-[#D4F358] text-[#18181B]'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                With VaultGuard Key
              </button>
            </div>

            <pre
              className={`rounded-[18px] p-4 font-mono text-[11.5px] overflow-x-auto leading-relaxed border ${
                heroEncrypted
                  ? 'bg-[#09090B] border-white/10 text-[#B4ACF9]'
                  : 'bg-[#2A0E14] border-[#F43F5E]/40 text-[#FDA4AF]'
              }`}
            >
              {heroEncrypted ? ENCRYPTED_DB_ROW : PLAINTEXT_DB_ROW}
            </pre>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-[12px]">
            <span className="flex items-center gap-1.5 text-[#A1A1AA]">
              {heroEncrypted ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-[#D4F358]" />
                  SQL Injection or stolen DB dump yields zero customer names, phones, or addresses
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-[#F43F5E]" />
                  Every customer phone number, home address, and order total is exposed
                </>
              )}
            </span>
          </div>
        </div>
      </section>

      {/* RETAIL SECTOR STRIP */}
      <section className="bg-white rounded-[20px] border border-[#E4E4E7] px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-[12.5px] font-bold text-[#111827]">
          <Store className="w-4 h-4 text-[#18181B]" />
          Built For Retail Chains & E-Commerce Platforms:
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {sectors.map((s) => (
            <span
              key={s}
              className="px-3 py-1 rounded-full bg-[#ECECEE] text-[11.5px] font-medium text-[#111827]"
            >
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* 2. INTERACTIVE 4-STEP CORE WORKFLOW */}
      <section id="how-it-works" className="space-y-6 scroll-mt-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#18181B] text-[#D4F358] text-[11px] font-bold uppercase tracking-wider mb-2">
              THE CORE CONCEPT: ZERO-STORAGE ENCRYPTION
            </span>
            <h2 className="text-[28px] sm:text-[34px] font-bold tracking-tight text-[#111827]">
              How a SuperShop Secures Its Database in 4 Steps
            </h2>
            <p className="text-[14px] text-[#71717A] mt-1 max-w-3xl">
              You keep your existing MongoDB, MySQL, or PostgreSQL database. Click through the 4 steps
              below to see how your store encrypts orders, searches by phone number, and controls staff decryption.
            </p>
          </div>
          <Link
            to="/simulator"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#18181B] text-[#D4F358] text-[13px] font-bold hover:bg-black transition-colors shrink-0"
          >
            Try This Live in Simulator
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 4 Step Selector Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              step: 1 as const,
              badge: 'STEP 1',
              title: 'Get Scoped API Keys',
              sub: 'Generate Admin & Delivery Rider keys for your store .env',
            },
            {
              step: 2 as const,
              badge: 'STEP 2',
              title: 'Encrypt Order on Checkout',
              sub: 'Save only AES-256-GCM ciphertext in your own database',
            },
            {
              step: 3 as const,
              badge: 'STEP 3',
              title: 'Search by Phone Number',
              sub: 'Find customer orders via HMAC blind index without decrypting',
            },
            {
              step: 4 as const,
              badge: 'STEP 4',
              title: 'Authorized Role Decryption',
              sub: 'Delivery sees address only; AI Sentinel blocks stolen keys',
            },
          ].map((item) => {
            const active = activeStep === item.step;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => setActiveStep(item.step)}
                className={`text-left p-5 rounded-[22px] border transition-all cursor-pointer flex flex-col justify-between ${
                  active
                    ? 'bg-[#18181B] text-white border-[#18181B] shadow-lg'
                    : 'bg-white text-[#111827] border-[#E4E4E7] hover:border-[#18181B]/40'
                }`}
              >
                <div>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold font-mono mb-2.5 ${
                      active ? 'bg-[#D4F358] text-[#18181B]' : 'bg-[#ECECEE] text-[#111827]'
                    }`}
                  >
                    {item.badge}
                  </span>
                  <h3 className="text-[15.5px] font-bold leading-snug">{item.title}</h3>
                </div>
                <p
                  className={`text-[12px] mt-2 leading-relaxed ${
                    active ? 'text-[#A1A1AA]' : 'text-[#71717A]'
                  }`}
                >
                  {item.sub}
                </p>
              </button>
            );
          })}
        </div>

        {/* Active Step Detailed Interactive Panel */}
        <div className="bg-white rounded-[28px] border border-[#E4E4E7] p-6 sm:p-8 shadow-xs">
          {activeStep === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-4">
                <span className="px-3 py-1 rounded-full bg-[#D4F358] text-[#18181B] text-[11.5px] font-bold">
                  STEP 1 · REGISTER STORE & GENERATE KEYS
                </span>
                <h3 className="text-[24px] font-bold text-[#111827]">
                  Generate Scoped API Keys for Your Checkout & Delivery Systems
                </h3>
                <p className="text-[14px] text-[#71717A] leading-relaxed">
                  The SuperShop owner registers their store name (e.g., <strong>&quot;Shwapno Online&quot;</strong>),
                  picks a plan (Free, Basic, or Premium), and generates separate keys for each service:
                </p>
                <div className="space-y-3 pt-1">
                  <div className="p-4 rounded-2xl bg-[#ECECEE]/70 border border-[#E4E4E7]">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-bold text-[#111827]">
                        1. Checkout Backend Key (Admin Scope)
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#18181B] text-[#D4F358] text-[10px] font-bold">
                        FULL ACCESS
                      </span>
                    </div>
                    <code className="text-[12px] font-mono text-[#18181B] block mt-1">
                      vg_live_shwapno_8f92a...
                    </code>
                    <p className="text-[12px] text-[#71717A] mt-1">
                      Used by your main e-commerce server to encrypt orders and decrypt full customer details.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#ECECEE]/70 border border-[#E4E4E7]">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-bold text-[#111827]">
                        2. Delivery Rider App Key (Delivery Scope)
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#B4ACF9] text-[#18181B] text-[10px] font-bold">
                        FIELD-MASKED
                      </span>
                    </div>
                    <code className="text-[12px] font-mono text-[#18181B] block mt-1">
                      vg_live_shwapno_3c11b...
                    </code>
                    <p className="text-[12px] text-[#71717A] mt-1">
                      Can only decrypt <strong>Name, Phone, and Address</strong>. Order Total and Email are automatically hidden.
                    </p>
                  </div>
                </div>
                <div className="pt-2">
                  <Link
                    to="/api-keys"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#18181B] text-[#D4F358] text-[13px] font-bold hover:bg-black"
                  >
                    Go to API Keys Console
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-6 bg-[#18181B] text-white rounded-[24px] p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-[12px] font-mono text-[#A1A1AA]">
                    SuperShop Server · .env file
                  </span>
                  <span className="text-[11px] text-[#D4F358] font-semibold">
                    5-Minute Drop-in Setup
                  </span>
                </div>
                <pre className="bg-[#09090B] border border-white/10 rounded-2xl p-4 font-mono text-[12px] text-[#D4F358] overflow-x-auto leading-relaxed">
{`# Your SuperShop's own database (VaultGuard never touches it)
DATABASE_URL="mongodb+srv://shwapno-prod.mongodb.net/orders"

# Scoped VaultGuard API Keys
VAULTGUARD_API_KEY="vg_live_shwapno_8f92a71c9e4b..."
VAULTGUARD_DELIVERY_API_KEY="vg_live_shwapno_3c11b40d2a..."
VAULTGUARD_API_URL="http://localhost:4000/v1"`}
                </pre>
                <p className="text-[12px] text-[#A1A1AA]">
                  No database migration required. Your existing tables and infrastructure stay 100% in your control.
                </p>
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-[#D4F358] text-[#18181B] text-[11.5px] font-bold">
                    STEP 2 · ENCRYPT BEFORE SAVING TO YOUR DB
                  </span>
                  <button
                    type="button"
                    onClick={() => copySnippet(STEP_2_CODE)}
                    className="text-[12px] font-semibold text-[#111827] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCode ? 'Copied' : 'Copy Code'}
                  </button>
                </div>
                <h3 className="text-[22px] font-bold text-[#111827]">
                  When a Customer Places an Order (`POST /v1/crypto/encrypt`)
                </h3>
                <p className="text-[13.5px] text-[#71717A] leading-relaxed">
                  Right before saving an order to your database, your checkout backend sends customer
                  PII to VaultGuard and saves <strong>only the returned ciphertext envelope</strong>:
                </p>
                <pre className="bg-[#18181B] text-[#D4D4D8] rounded-2xl p-4 font-mono text-[11.5px] overflow-x-auto leading-relaxed">
                  {STEP_2_CODE}
                </pre>
              </div>

              <div className="lg:col-span-6 bg-[#18181B] text-white rounded-[24px] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-[#D4F358]">
                    Why This Stops Hackers Cold
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#D4F358]/15 text-[#D4F358] text-[11px] font-semibold">
                    AES-256-GCM Envelope
                  </span>
                </div>
                <p className="text-[12.5px] text-[#A1A1AA] leading-relaxed">
                  If a hacker breaches your SuperShop database (via SQL Injection, stolen backup, or
                  hacked cloud server), the database row looks like this:
                </p>
                <pre className="bg-[#09090B] border border-white/10 rounded-2xl p-4 font-mono text-[11.5px] text-[#B4ACF9] overflow-x-auto leading-relaxed">
                  {ENCRYPTED_DB_ROW}
                </pre>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-[12px] text-[#D4D4D8] flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-[#D4F358] shrink-0" />
                  <span>
                    There are <strong>zero real names, phone numbers, or addresses</strong> in your
                    database for the hacker to steal.
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeStep === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-[#D4F358] text-[#18181B] text-[11.5px] font-bold">
                    STEP 3 · SEARCH ENCRYPTED DB BY PHONE
                  </span>
                  <button
                    type="button"
                    onClick={() => copySnippet(STEP_3_CODE)}
                    className="text-[12px] font-semibold text-[#111827] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCode ? 'Copied' : 'Copy Code'}
                  </button>
                </div>
                <h3 className="text-[22px] font-bold text-[#111827]">
                  Instant Customer Phone Lookup (`POST /v1/crypto/blind-index`)
                </h3>
                <p className="text-[13.5px] text-[#71717A] leading-relaxed">
                  Even though your database is encrypted, your SuperShop still needs to find a customer
                  when they call support or type their phone number (<code className="font-mono text-[#111827]">01712345678</code>)
                  at the POS checkout counter.
                </p>
                <pre className="bg-[#18181B] text-[#D4D4D8] rounded-2xl p-4 font-mono text-[11.5px] overflow-x-auto leading-relaxed">
                  {STEP_3_CODE}
                </pre>
              </div>

              <div className="lg:col-span-6 bg-[#18181B] text-white rounded-[24px] p-6 space-y-4">
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#D4F358]">
                  Deterministic HMAC-SHA-256 Blind Index Flow
                </span>
                <div className="space-y-3 text-[12.5px]">
                  <div className="p-3.5 rounded-xl bg-[#09090B] border border-white/10">
                    <div className="text-[#A1A1AA] text-[11px]">1. Cashier Types Any BD Phone Format:</div>
                    <div className="font-mono text-white mt-1">
                      &quot;+880 1712-345678&quot; → Normalized to &quot;01712345678&quot;
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#09090B] border border-white/10">
                    <div className="text-[#A1A1AA] text-[11px]">2. VaultGuard Returns Keyed HMAC Hash:</div>
                    <div className="font-mono text-[#D4F358] mt-1 break-all">
                      &quot;6531cc7ff259cad99583afddb4eb76fe9102a4c8...&quot;
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#09090B] border border-white/10">
                    <div className="text-[#A1A1AA] text-[11px]">3. Your Database Matches Index in 0.4ms:</div>
                    <div className="font-mono text-[#B4ACF9] mt-1">
                      Matched Order: ORD-1001 (Zero table scan decryption!)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeStep === 4 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-[#D4F358] text-[#18181B] text-[11.5px] font-bold">
                    STEP 4 · ROLE DECRYPTION & SENTINEL DEFENSE
                  </span>
                  <button
                    type="button"
                    onClick={() => copySnippet(STEP_4_CODE)}
                    className="text-[12px] font-semibold text-[#111827] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCode ? 'Copied' : 'Copy Code'}
                  </button>
                </div>
                <h3 className="text-[22px] font-bold text-[#111827]">
                  How Authorized Apps View Real Data (`POST /v1/crypto/decrypt`)
                </h3>
                <p className="text-[13.5px] text-[#71717A] leading-relaxed">
                  When your Admin dashboard or Delivery Rider app needs the customer&apos;s shipping
                  address, it sends <code className="font-mono text-[#111827]">order.encryptedCustomer</code> to
                  VaultGuard with its scoped API key:
                </p>
                <pre className="bg-[#18181B] text-[#D4D4D8] rounded-2xl p-4 font-mono text-[11.5px] overflow-x-auto leading-relaxed">
                  {STEP_4_CODE}
                </pre>
              </div>

              <div className="lg:col-span-6 bg-[#18181B] text-white rounded-[24px] p-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-[#A1A1AA]">
                    Compare API Key Decryption Output:
                  </span>
                  <div className="inline-flex bg-[#27272A] p-1 rounded-full">
                    <button
                      type="button"
                      onClick={() => setStep4Role('delivery')}
                      className={`px-3 py-1 rounded-full text-[11.5px] font-bold cursor-pointer ${
                        step4Role === 'delivery'
                          ? 'bg-[#D4F358] text-[#18181B]'
                          : 'text-[#A1A1AA] hover:text-white'
                      }`}
                    >
                      Delivery Rider Key
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep4Role('admin')}
                      className={`px-3 py-1 rounded-full text-[11.5px] font-bold cursor-pointer ${
                        step4Role === 'admin'
                          ? 'bg-[#D4F358] text-[#18181B]'
                          : 'text-[#A1A1AA] hover:text-white'
                      }`}
                    >
                      Admin Key
                    </button>
                  </div>
                </div>

                <pre className="bg-[#09090B] border border-white/10 rounded-2xl p-4 font-mono text-[11.5px] text-[#D4F358] overflow-x-auto leading-relaxed">
                  {step4Role === 'delivery'
                    ? `{
  "role": "delivery",
  "data": {
    "name": "Fardin Hossain",
    "phone": "01712345678",
    "address": "House 14, Road 7, Dhanmondi, Dhaka",
    "email": "[REDACTED_BY_POLICY]",
    "orderTotal": "[REDACTED_BY_POLICY]"
  }
}`
                    : `{
  "role": "admin",
  "data": {
    "name": "Fardin Hossain",
    "phone": "01712345678",
    "address": "House 14, Road 7, Dhanmondi, Dhaka",
    "email": "fardin@gmail.com",
    "orderTotal": 4850
  }
}`}
                </pre>

                <div className="p-3.5 rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[12px] text-[#FDA4AF]">
                  <strong>Stolen API Key Protection:</strong> If a hacker steals an API key and tries to
                  bulk-decrypt hundreds of rows, <strong>VaultGuard AI Sentinel</strong> detects the
                  abnormal speed and automatically blocks that API key—or the owner can click{' '}
                  <strong>Revoke Key</strong> in the portal to cut off access immediately.
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. SERVICES & BENEFITS BENTO GRID */}
      <section id="features" className="space-y-6 scroll-mt-24">
        <div>
          <h2 className="text-[28px] sm:text-[32px] font-semibold tracking-tight text-[#111827]">
            Why SuperShops & Online Platforms Choose VaultGuard
          </h2>
          <p className="text-[14px] text-[#71717A] mt-1">
            Purpose-built database protection that stops breaches without changing how your store operates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((svc) => {
            const Icon = svc.icon;
            return (
              <article
                key={svc.title}
                className="bg-white rounded-[24px] border border-[#E4E4E7] p-6 flex flex-col justify-between hover:border-[#18181B]/40 transition-colors shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-[#ECECEE] flex items-center justify-center text-[#18181B]">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="px-3 py-1 rounded-full bg-[#ECECEE] text-[#111827] text-[11px] font-semibold">
                      {svc.badge}
                    </span>
                  </div>
                  <h3 className="text-[17px] font-semibold text-[#111827]">{svc.title}</h3>
                  <p className="text-[13px] text-[#71717A] mt-2 leading-relaxed">{svc.desc}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 4. PRICING PLANS (FREE, BASIC, PREMIUM, ENTERPRISE) */}
      <PricingSection />

      {/* 5. BOTTOM LAUNCH CTA */}
      <section className="bg-[#D4F358] text-[#18181B] rounded-[28px] p-8 sm:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-md">
        <div>
          <h2 className="text-[26px] sm:text-[32px] font-bold tracking-tight">
            Ready to Make Your SuperShop Database Hacker-Proof?
          </h2>
          <p className="text-[14.5px] text-[#18181B]/80 mt-2 max-w-2xl">
            Generate your API key in seconds, test the 4-step encryption flow in our Live SuperShop
            Simulator, or integrate directly into your Node.js / Python store backend today.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            to="/api-keys"
            className="px-6 py-3.5 rounded-full bg-[#18181B] hover:bg-black text-[#D4F358] text-[13.5px] font-bold transition-colors"
          >
            Generate API Key →
          </Link>
          <Link
            to="/simulator"
            className="px-6 py-3.5 rounded-full bg-white hover:bg-[#ECECEE] text-[#111827] text-[13.5px] font-bold transition-colors"
          >
            Open Live SuperShop Simulator
          </Link>
        </div>
      </section>
    </div>
  );
};
