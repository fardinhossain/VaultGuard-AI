import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Database,
  Globe2,
  KeyRound,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
} from 'lucide-react';
import { useMerchantAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { PricingSection } from '../components/pricing/PricingSection';

const PLAINTEXT_JSON = `{
  "orderNumber": "ORD-BD-5041",
  "customer": {
    "name": "Fardin Hossain",
    "phone": "01712345678",
    "email": "fardin@supershop.bd",
    "address": "Dhanmondi Road 7, Dhaka",
    "orderTotal": "৳4,850"
  }
}`;

const ENCRYPTED_JSON = `{
  "orderNumber": "ORD-BD-5041",
  "_vaultguard": {
    "algorithm": "AES-256-GCM",
    "keyVersion": 1,
    "ciphertext": "m9Xk2vP8...9zQ1wA==",
    "dataNonce": "r4tY8kLm2pQ1...",
    "wrappedDEK": "wZ9vQ2mN7x..."
  },
  "blindIndexes": {
    "phone": "bidx_sha256_7f9c2e...3901fa"
  }
}`;

export const LandingPage: React.FC = () => {
  const { t } = useI18n();
  const { openRegisterModal } = useMerchantAuth();
  const [heroEncrypted, setHeroEncrypted] = useState(true);
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

  const services = [
    {
      icon: Database,
      title: 'Keep Your Own Store Database',
      desc: 'Zero database migration. Keep your existing MongoDB, PostgreSQL, or MySQL database—VaultGuard encrypts customer PII in memory before your server saves each order.',
      badge: 'Zero Storage Architecture',
    },
    {
      icon: Search,
      title: 'Sub-Millisecond Phone & Email Lookup',
      desc: 'Store staff, cashiers, and dispatchers can look up orders by phone number instantly using HMAC-SHA-256 blind indexes—without ever decrypting the database.',
      badge: 'Blind-Index Search',
    },
    {
      icon: KeyRound,
      title: 'Role-Based Customer Decryption',
      desc: 'Delivery riders see masked addresses; store managers see decrypted shipping records with cryptographic audit chaining to prevent unauthorized data leaks.',
      badge: 'Scoped Access Control',
    },
    {
      icon: Activity,
      title: 'AI Sentinel Threat Defense',
      desc: 'If an employee account, compromised API key, or scraping bot attempts bulk data exfiltration, AI Sentinel triggers automatic IP blocks in real time.',
      badge: 'Active Threat Guard',
    },
    {
      icon: RefreshCw,
      title: 'Zero-Downtime Key Rotation (BYOK)',
      desc: 'Rotate your store root Master Key (v1 → v2) in seconds with zero downtime, without re-encrypting or compromising existing customer order history.',
      badge: 'Automated Key Custody',
    },
    {
      icon: Globe2,
      title: 'Universal E-Commerce SDK & REST',
      desc: 'Drop 3 lines of code into Node.js, Next.js, Python, PHP, or Laravel. Full English & বাংলা team management console for retail operations.',
      badge: '5-Minute Integration',
    },
  ];

  const steps = [
    {
      num: '01',
      title: 'Register Store & Get API Key',
      desc: 'Sign up with Clerk authentication, choose Free or Growth tier, and generate your live API key (vg_live_...).',
      cta: 'Register Shop →',
      action: openRegisterModal,
    },
    {
      num: '02',
      title: 'Plug 3 Lines into Your Checkout Backend',
      desc: 'Call VaultGuard before db.orders.insertOne() to automatically encrypt customer name, phone, and delivery address.',
      cta: 'View Quickstart Guide →',
      to: '/docs',
    },
    {
      num: '03',
      title: 'Customer Data is 100% Hacker-Proof',
      desc: 'Even if your database server is breached or leaked on the dark web, attackers get zero plaintext. Zero compliance liability.',
      cta: 'Inspect Live Simulator →',
      to: '/playground',
    },
  ];

  const sectors = [
    'SuperShops & Grocery Chains (Shwapno, Meena Bazar, Agora, Chaldal)',
    'Online E-Commerce Marketplaces (Daraz, Pickaboo)',
    'Pharmacies & Health Commerce (Arogga, Lazz Pharma)',
    'Quick-Commerce & On-Demand Delivery Platforms (Pathao, Foodpanda)',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 space-y-16">
      {/* 1. ELEVATED HERO SECTION */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-white rounded-[28px] border border-[#E4E4E7] p-7 sm:p-10 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#D4F358] text-[#18181B] text-[12px] font-bold">
                <ShieldCheck className="w-4 h-4" />
                Zero-Storage Database Security
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#ECECEE] text-[#111827] text-[11.5px] font-semibold">
                Bangladesh PDPA 2026 Ready
              </span>
            </div>

            <h1 className="text-[34px] sm:text-[44px] font-bold tracking-tight text-[#111827] leading-[1.12] mt-5">
              Stop Customer Data Breaches Before They Happen.
            </h1>

            <p className="text-[15.5px] text-[#71717A] mt-4 leading-relaxed max-w-2xl">
              Keep customer phone numbers, home addresses, and order histories 100% encrypted in your
              own MongoDB or PostgreSQL. When hackers dump your database, they get zero plaintext.
              5-minute integration with one API key.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-7">
              <button
                type="button"
                onClick={openRegisterModal}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#18181B] hover:bg-black text-[#D4F358] text-[14px] font-bold transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Register Shop (Free API Key)
                <ArrowRight className="w-4 h-4" />
              </button>

              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#ECECEE] hover:bg-[#D4F358] text-[#111827] text-[14px] font-semibold transition-colors"
              >
                View Plans & Pricing
              </Link>

              <Link
                to="/docs"
                className="inline-flex items-center gap-1.5 px-4 py-3 text-[13.5px] font-semibold text-[#71717A] hover:text-[#111827]"
              >
                5-Min SDK Guide →
              </Link>
            </div>
          </div>

          {/* 4 SuperShop Business Proof Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-[#E4E4E7]">
            <div>
              <div className="text-[26px] font-bold text-[#111827] tabular-nums">0%</div>
              <div className="text-[11.5px] text-[#71717A]">Readable data on DB dump</div>
            </div>
            <div>
              <div className="text-[26px] font-bold text-[#111827] tabular-nums">&lt;2 ms</div>
              <div className="text-[11.5px] text-[#71717A]">AES-256-GCM Latency</div>
            </div>
            <div>
              <div className="text-[26px] font-bold text-[#111827] tabular-nums">5 Min</div>
              <div className="text-[11.5px] text-[#71717A]">Node / REST setup</div>
            </div>
            <div>
              <div className="text-[26px] font-bold text-[#111827] tabular-nums">EN / বাংলা</div>
              <div className="text-[11.5px] text-[#71717A]">Team portal ready</div>
            </div>
          </div>
        </div>

        {/* Interactive Hero Visual: Toggle Plaintext Leak vs API Key Protected DB */}
        <div className="lg:col-span-5 bg-[#18181B] text-white rounded-[28px] p-6 sm:p-7 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="text-[12px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                Inside Your Store's Own Database
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  heroEncrypted
                    ? 'bg-[#D4F358] text-[#18181B]'
                    : 'bg-[#F43F5E] text-white'
                }`}
              >
                {heroEncrypted ? 'PROTECTED: ZERO USABLE PII' : 'EXPOSED: PLAINTEXT LEAK'}
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
              {heroEncrypted ? ENCRYPTED_JSON : PLAINTEXT_JSON}
            </pre>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-[12px]">
            <span className="flex items-center gap-1.5 text-[#A1A1AA]">
              {heroEncrypted ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-[#D4F358]" />
                  Zero plaintext exposed to hackers, DB admins, or hosting providers
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-[#F43F5E]" />
                  Every customer name, phone number, and address exposed
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
          Engineered For Bangladeshi & Global Retail Chains:
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

      {/* 2. SERVICES & BENEFITS BENTO GRID */}
      <section id="features" className="space-y-6 scroll-mt-24">
        <div>
          <h2 className="text-[28px] sm:text-[32px] font-semibold tracking-tight text-[#111827]">
            Why Retail Chains Choose VaultGuard
          </h2>
          <p className="text-[14px] text-[#71717A] mt-1">
            Enterprise cryptographic architecture designed specifically for high-volume grocery & e-commerce checkouts.
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

      {/* 3. HOW IT WORKS (3 STEPS) */}
      <section id="how-it-works" className="space-y-6 scroll-mt-24">
        <h2 className="text-[28px] sm:text-[32px] font-semibold tracking-tight text-[#111827]">
          How SuperShops Integrate in 5 Minutes
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {steps.map((step) => {
            const content = (
              <div className="bg-white hover:border-[#18181B] rounded-[24px] border border-[#E4E4E7] p-6 flex flex-col justify-between transition-colors group h-full shadow-xs cursor-pointer">
                <div>
                  <span className="inline-block px-3 py-1 rounded-full bg-[#18181B] text-[#D4F358] font-mono text-[12px] font-bold mb-4">
                    STEP {step.num}
                  </span>
                  <h3 className="text-[17px] font-semibold text-[#111827]">{step.title}</h3>
                  <p className="text-[13px] text-[#71717A] mt-2 leading-relaxed">{step.desc}</p>
                </div>
                <span className="mt-5 text-[13px] font-bold text-[#111827] group-hover:underline flex items-center gap-1">
                  {step.cta}
                </span>
              </div>
            );

            if (step.to) {
              return (
                <Link key={step.num} to={step.to}>
                  {content}
                </Link>
              );
            }

            return (
              <button
                key={step.num}
                type="button"
                onClick={step.action}
                className="text-left w-full h-full"
              >
                {content}
              </button>
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
            Ready to Secure Your SuperShop’s Customer Database?
          </h2>
          <p className="text-[14.5px] text-[#18181B]/80 mt-2 max-w-2xl">
            Start with our Free plan, generate an API key in seconds, and protect every customer
            order in your own database today. Zero database migration required.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={openRegisterModal}
            className="px-6 py-3.5 rounded-full bg-[#18181B] hover:bg-black text-[#D4F358] text-[13.5px] font-bold transition-colors cursor-pointer"
          >
            Register Store & Get Key →
          </button>
          <Link
            to="/docs"
            className="px-6 py-3.5 rounded-full bg-white hover:bg-[#ECECEE] text-[#111827] text-[13.5px] font-bold transition-colors"
          >
            Read Integration Docs
          </Link>
        </div>
      </section>
    </div>
  );
};
