import React, { useState } from 'react';
import { Lock, Sparkles, X } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { vaultApi } from '../../lib/api';

const SYNTHETIC_PRESETS = [
  {
    name: 'Samira Chowdhury',
    phone: '01722334455',
    email: 'samira.demo@example.com',
    address: 'Road 27, Gulshan 2, Dhaka',
    orderTotal: '৳6,750',
  },
  {
    name: 'Imran Mahmud',
    phone: '01833445566',
    email: 'imran.demo@example.com',
    address: 'Sector 7, Uttara, Dhaka',
    orderTotal: '৳3,920',
  },
  {
    name: 'Maliha Rahman',
    phone: '01944556677',
    email: 'maliha.demo@example.com',
    address: 'Panchlaish, Chattogram',
    orderTotal: '৳11,200',
  },
];

export const AddCustomerModal: React.FC = () => {
  const { t } = useI18n();
  const { addModalOpen, setAddModalOpen, reqCtx, triggerRefresh, showToast } = useWorkspace();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [orderTotal, setOrderTotal] = useState('৳4,200');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [presetIdx, setPresetIdx] = useState(0);

  if (!addModalOpen) {
    return null;
  }

  const fillSynthetic = () => {
    const preset = SYNTHETIC_PRESETS[presetIdx % SYNTHETIC_PRESETS.length]!;
    setName(preset.name);
    setPhone(preset.phone);
    setEmail(preset.email);
    setAddress(preset.address);
    setOrderTotal(preset.orderTotal);
    setPresetIdx((p) => p + 1);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await vaultApi.createRecord(reqCtx, {
        name,
        phone,
        email,
        address,
        orderTotal,
      });
      showToast(
        'success',
        `Encrypted ${res.recordId} in ${res.latencyMs} ms`,
        `AES-256-GCM ciphertext stored · Blind index: ${res.phoneBlindIndex.slice(0, 14)}...`,
      );
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setAddModalOpen(false);
      triggerRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to encrypt customer record');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-[2px]">
      <div className="bg-white rounded-[24px] border border-[#E4E4E7] w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#18181B] text-[#D4F358] flex items-center justify-center">
              <Lock className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-[18px] font-semibold text-[#111827]">{t('action.encrypt')}</h2>
              <p className="text-[12px] text-[#71717A]">
                Synthetic demo PII only · Encrypted via AES-256-GCM before MongoDB write
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAddModalOpen(false)}
            className="p-1.5 rounded-full hover:bg-[#ECECEE] text-[#71717A] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={fillSynthetic}
          className="mb-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#ECECEE] hover:bg-[#D4F358] text-[#111827] text-[12px] font-semibold transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Fill Synthetic BD Customer
        </button>

        {errorMsg && (
          <div className="mb-4 px-3.5 py-2.5 rounded-[14px] bg-[#F43F5E]/10 border border-[#F43F5E]/30 text-[#F43F5E] text-[12.5px] font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#111827] mb-1">
                Full Name
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Samira Chowdhury"
                className="w-full rounded-[14px] border border-[#E4E4E7] px-3.5 py-2.5 text-[13.5px] focus:outline-none focus:border-[#18181B]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#111827] mb-1">
                Phone (Blind-Indexed)
              </label>
              <input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01722334455"
                className="w-full rounded-[14px] border border-[#E4E4E7] px-3.5 py-2.5 text-[13.5px] focus:outline-none focus:border-[#18181B]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#111827] mb-1">Email</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="samira.demo@example.com"
                className="w-full rounded-[14px] border border-[#E4E4E7] px-3.5 py-2.5 text-[13.5px] focus:outline-none focus:border-[#18181B]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#111827] mb-1">
                Order Total (BDT)
              </label>
              <input
                required
                value={orderTotal}
                onChange={(e) => setOrderTotal(e.target.value)}
                placeholder="৳4,850"
                className="w-full rounded-[14px] border border-[#E4E4E7] px-3.5 py-2.5 text-[13.5px] focus:outline-none focus:border-[#18181B]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#111827] mb-1">
              Delivery Address
            </label>
            <input
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House 14, Road 7, Dhanmondi, Dhaka"
              className="w-full rounded-[14px] border border-[#E4E4E7] px-3.5 py-2.5 text-[13.5px] focus:outline-none focus:border-[#18181B]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="px-4 py-2.5 rounded-full border border-[#E4E4E7] text-[13px] font-semibold text-[#71717A] hover:text-[#111827] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-full bg-[#18181B] text-[#D4F358] text-[13px] font-semibold hover:bg-black transition-colors disabled:opacity-60 cursor-pointer"
            >
              {submitting ? 'Encrypting (AES-256-GCM)...' : t('action.encrypt')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
