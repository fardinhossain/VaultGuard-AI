import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  Database,
  KeyRound,
  Lock,
  Search,
  ShieldCheck,
  Terminal,
  Truck,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

export const DocsPage: React.FC = () => {
  const { sessionApiKey, showToast } = useWorkspace();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const displayKey = sessionApiKey?.rawKey ?? 'vg_live_shwapno_8f92a71c9e4b';

  const copyBlock = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    showToast('success', 'Copied Code Snippet');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const step1Code = `# Inside your SuperShop e-commerce server's .env file
VAULTGUARD_API_KEY=${displayKey}
VAULTGUARD_DELIVERY_API_KEY=vg_live_shwapno_3c11b40d2a9f
VAULTGUARD_API_URL=http://localhost:4000/v1`;

  const step2Code = `// Inside the SuperShop's OWN checkout backend (Node.js / Express / Next.js)
const customerData = {
  name: "Fardin Hossain",
  phone: "01712345678",
  email: "fardin@gmail.com",
  address: "House 14, Road 7, Dhanmondi, Dhaka",
  orderTotal: 4850
};

// 1. Send customer PII to VaultGuard using the API Key
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

  const step2DbJson = `{
  "orderNumber": "ORD-1001",
  "phoneSearchHash": "6531cc7ff259cad99583afddb4eb76fe...",
  "encryptedCustomer": {
    "algorithm": "AES-256-GCM",
    "ciphertext": "M8KutXzYo8RgH6bLUSR1VViL9tHMBBqLV6X9...",
    "dataNonce": "Avp3YDmJGrZEyDqL",
    "wrappedDEK": "5BUX3fT5itJgHet1yVqmL69pE0GACcH4..."
  }
}`;

  const step3Code = `// How the SuperShop searches customers by phone number (01712345678)
const res = await fetch("http://localhost:4000/v1/crypto/blind-index", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.VAULTGUARD_API_KEY
  },
  body: JSON.stringify({ field: "phone", value: "01712345678" })
});
const { blindIndex } = await res.json();

// 2. Query THEIR OWN database using that hash!
const order = await SuperShopDatabase.orders.findOne({ phoneSearchHash: blindIndex });`;

  const step4Code = `// When the Admin dashboard or Delivery Rider app views real data
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4F358] text-[#18181B] text-[11.5px] font-bold mb-3">
            <BookOpen className="w-3.5 h-3.5" />
            4-STEP ZERO-STORAGE INTEGRATION GUIDE
          </span>
          <h1 className="text-[30px] sm:text-[36px] font-bold tracking-tight text-[#111827]">
            How to Connect Your SuperShop Database
          </h1>
          <p className="text-[14.5px] text-[#71717A] mt-1 max-w-3xl">
            Your SuperShop keeps its own database (MongoDB, MySQL, PostgreSQL, etc.). VaultGuard
            never stores your customers&apos; data. Follow these 4 steps to turn sensitive customer
            details into unreadable ciphertext before saving them to your database.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link
            to="/api-keys"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#18181B] hover:bg-black text-[#D4F358] text-[13px] font-bold"
          >
            <KeyRound className="w-4 h-4" />
            Generate API Key
          </Link>
          <Link
            to="/simulator"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[#E4E4E7] hover:bg-[#ECECEE] text-[#111827] text-[13px] font-bold"
          >
            <Database className="w-4 h-4" />
            Test Live Simulator
          </Link>
        </div>
      </div>

      {/* STEP 1 */}
      <section className="bg-white rounded-[28px] border border-[#E4E4E7] p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <span className="px-3 py-1 rounded-full bg-[#18181B] text-[#D4F358] font-mono text-[12px] font-bold">
            STEP 1
          </span>
          <Link to="/api-keys" className="text-[13px] font-bold text-[#111827] hover:underline">
            Open API Keys Console →
          </Link>
        </div>
        <h2 className="text-[22px] font-bold text-[#111827]">
          Get Scoped API Keys From Your Portal
        </h2>
        <p className="text-[14px] text-[#71717A] leading-relaxed">
          Register your store name (e.g., <strong>&quot;Shwapno Online&quot;</strong>), choose a plan
          (Free, Basic, or Premium), and go to <Link to="/api-keys" className="underline font-semibold text-[#111827]">/api-keys</Link> to
          generate keys for your different systems:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-[#ECECEE]">
            <div className="text-[13.5px] font-bold text-[#111827]">
              Checkout Backend Key (Admin Scope)
            </div>
            <code className="text-[12px] font-mono text-[#18181B] block mt-1">
              vg_live_shwapno_8f92a...
            </code>
            <p className="text-[12.5px] text-[#71717A] mt-1">
              Can encrypt and decrypt all customer fields.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#ECECEE]">
            <div className="text-[13.5px] font-bold text-[#111827]">
              Delivery Rider App Key (Delivery Scope)
            </div>
            <code className="text-[12px] font-mono text-[#18181B] block mt-1">
              vg_live_shwapno_3c11b...
            </code>
            <p className="text-[12.5px] text-[#71717A] mt-1">
              Can only decrypt Name, Phone, and Address — Order Total and Email are hidden.
            </p>
          </div>
        </div>
        <div className="relative bg-[#18181B] text-[#D4F358] rounded-2xl p-4 font-mono text-[12px]">
          <button
            type="button"
            onClick={() => copyBlock(step1Code, 'step1')}
            className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-[#27272A] text-white text-[11px] flex items-center gap-1 cursor-pointer"
          >
            {copiedId === 'step1' ? <Check className="w-3.5 h-3.5 text-[#D4F358]" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedId === 'step1' ? 'Copied' : 'Copy .env'}
          </button>
          <pre className="overflow-x-auto leading-relaxed">{step1Code}</pre>
        </div>
      </section>

      {/* STEP 2 */}
      <section className="bg-white rounded-[28px] border border-[#E4E4E7] p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <span className="px-3 py-1 rounded-full bg-[#18181B] text-[#D4F358] font-mono text-[12px] font-bold">
            STEP 2
          </span>
          <span className="text-[12px] font-mono font-bold text-[#111827]">
            POST /v1/crypto/encrypt
          </span>
        </div>
        <h2 className="text-[22px] font-bold text-[#111827]">
          When a Customer Places an Order (Saving to the SuperShop&apos;s Database)
        </h2>
        <p className="text-[14px] text-[#71717A] leading-relaxed">
          Right before saving to your database, your checkout backend calls{' '}
          <code className="font-mono text-[#111827]">POST /v1/crypto/encrypt</code> and saves only
          the returned encrypted envelope and phone search hash:
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 relative bg-[#18181B] text-[#D4D4D8] rounded-2xl p-5 font-mono text-[11.5px]">
            <button
              type="button"
              onClick={() => copyBlock(step2Code, 'step2')}
              className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-[#27272A] text-white text-[11px] flex items-center gap-1 cursor-pointer"
            >
              {copiedId === 'step2' ? <Check className="w-3.5 h-3.5 text-[#D4F358]" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedId === 'step2' ? 'Copied' : 'Copy Code'}
            </button>
            <pre className="overflow-x-auto leading-relaxed">{step2Code}</pre>
          </div>

          <div className="lg:col-span-5 bg-[#18181B] text-white rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="text-[12px] font-bold uppercase tracking-wider text-[#D4F358] mb-2">
                Why This Stops Hackers
              </div>
              <p className="text-[12.5px] text-[#A1A1AA] mb-3">
                If a hacker breaches your SuperShop database, the database row looks like this:
              </p>
              <pre className="bg-[#09090B] border border-white/10 rounded-xl p-3.5 font-mono text-[11px] text-[#B4ACF9] overflow-x-auto leading-relaxed">
                {step2DbJson}
              </pre>
            </div>
            <p className="text-[12px] text-[#D4F358] font-semibold mt-3">
              Zero real names, phone numbers, or addresses exist in your database for hackers to steal.
            </p>
          </div>
        </div>
      </section>

      {/* STEP 3 */}
      <section className="bg-white rounded-[28px] border border-[#E4E4E7] p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <span className="px-3 py-1 rounded-full bg-[#18181B] text-[#D4F358] font-mono text-[12px] font-bold">
            STEP 3
          </span>
          <span className="text-[12px] font-mono font-bold text-[#111827]">
            POST /v1/crypto/blind-index
          </span>
        </div>
        <h2 className="text-[22px] font-bold text-[#111827]">
          How the SuperShop Searches Customers by Phone Number
        </h2>
        <p className="text-[14px] text-[#71717A] leading-relaxed">
          Even though the database is encrypted, your SuperShop can still find a customer when they
          call support or type their phone number (<code className="font-mono text-[#111827]">01712345678</code>)
          at the POS counter:
        </p>
        <div className="relative bg-[#18181B] text-[#D4D4D8] rounded-2xl p-5 font-mono text-[12px]">
          <button
            type="button"
            onClick={() => copyBlock(step3Code, 'step3')}
            className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-[#27272A] text-white text-[11px] flex items-center gap-1 cursor-pointer"
          >
            {copiedId === 'step3' ? <Check className="w-3.5 h-3.5 text-[#D4F358]" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedId === 'step3' ? 'Copied' : 'Copy Code'}
          </button>
          <pre className="overflow-x-auto leading-relaxed">{step3Code}</pre>
        </div>
      </section>

      {/* STEP 4 */}
      <section className="bg-white rounded-[28px] border border-[#E4E4E7] p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <span className="px-3 py-1 rounded-full bg-[#18181B] text-[#D4F358] font-mono text-[12px] font-bold">
            STEP 4
          </span>
          <span className="text-[12px] font-mono font-bold text-[#111827]">
            POST /v1/crypto/decrypt
          </span>
        </div>
        <h2 className="text-[22px] font-bold text-[#111827]">
          How the SuperShop Views the Real Data (When Authorized)
        </h2>
        <p className="text-[14px] text-[#71717A] leading-relaxed">
          When the Admin dashboard or Delivery Rider app needs the customer&apos;s address for
          delivery, it sends the <code className="font-mono text-[#111827]">encryptedCustomer</code> object
          from your database to <code className="font-mono text-[#111827]">POST /v1/crypto/decrypt</code>:
        </p>
        <div className="relative bg-[#18181B] text-[#D4D4D8] rounded-2xl p-5 font-mono text-[12px]">
          <button
            type="button"
            onClick={() => copyBlock(step4Code, 'step4')}
            className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-[#27272A] text-white text-[11px] flex items-center gap-1 cursor-pointer"
          >
            {copiedId === 'step4' ? <Check className="w-3.5 h-3.5 text-[#D4F358]" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedId === 'step4' ? 'Copied' : 'Copy Code'}
          </button>
          <pre className="overflow-x-auto leading-relaxed">{step4Code}</pre>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-[#ECECEE]">
            <div className="font-bold text-[13.5px] text-[#111827]">Admin API Key</div>
            <p className="text-[12.5px] text-[#71717A] mt-1">
              Returns all fields (<code className="font-mono">name</code>, <code className="font-mono">phone</code>,{' '}
              <code className="font-mono">email</code>, <code className="font-mono">address</code>,{' '}
              <code className="font-mono">orderTotal</code>).
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#ECECEE]">
            <div className="font-bold text-[13.5px] text-[#111827]">Delivery Rider API Key</div>
            <p className="text-[12.5px] text-[#71717A] mt-1">
              Returns <code className="font-mono">name</code>, <code className="font-mono">phone</code>, and{' '}
              <code className="font-mono">address</code>, but automatically masks <code className="font-mono">email</code> and{' '}
              <code className="font-mono">orderTotal</code> (<code className="font-mono">[REDACTED_BY_POLICY]</code>).
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#ECECEE]">
            <div className="font-bold text-[13.5px] text-[#111827]">AI Sentinel Protection</div>
            <p className="text-[12.5px] text-[#71717A] mt-1">
              If a stolen key tries bulk-decrypting rows, AI Sentinel detects the abnormal speed and
              automatically blocks the key—or click <strong>Revoke Key</strong> in the portal.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
