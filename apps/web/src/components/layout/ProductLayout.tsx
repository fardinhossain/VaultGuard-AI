import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Info, ShieldAlert, X } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ProductNavbar } from './ProductNavbar';

export const ProductLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast, dismissToast } = useWorkspace();

  return (
    <div className="min-h-screen flex flex-col bg-[#ECECEE] text-[#111827]">
      <ProductNavbar />

      <main className="flex-1">{children}</main>

      {/* Clean Commercial Footer */}
      <footer className="bg-[#18181B] text-[#A1A1AA] border-t border-white/10 mt-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-4 gap-8 text-[13px]">
          <div className="md:col-span-2 space-y-2.5">
            <div className="text-white font-semibold text-[18px]">VaultGuard AI</div>
            <p className="max-w-md leading-relaxed">
              Database Security & Encryption API for SuperShops, Retail Chains, and E-Commerce
              Platforms. Keep your own database—encrypt every customer record with one API key.
            </p>
            <p className="text-[11.5px] text-[#71717A]">
              AES-256-GCM Envelope Encryption · HMAC-SHA-256 Blind Indexing · Bangladesh PDPA 2026
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-white font-semibold text-[12px] uppercase tracking-wider">
              Product
            </div>
            <ul className="space-y-1.5">
              <li>
                <Link to="/" className="hover:text-white">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/#features" className="hover:text-white">
                  Benefits & Features
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-white">
                  Free, Basic & Premium Plans
                </Link>
              </li>
              <li>
                <Link to="/docs" className="hover:text-white">
                  Developer API Docs
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="text-white font-semibold text-[12px] uppercase tracking-wider">
              Merchant Portal
            </div>
            <ul className="space-y-1.5">
              <li>
                <Link to="/dashboard" className="hover:text-white">
                  Security Overview
                </Link>
              </li>
              <li>
                <Link to="/api-keys" className="hover:text-white">
                  API Keys & Connectors
                </Link>
              </li>
              <li>
                <Link to="/playground" className="hover:text-white">
                  API Encryption Playground
                </Link>
              </li>
              <li>
                <Link to="/sentinel" className="hover:text-white">
                  AI Threat Monitor
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </footer>

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-[#18181B] text-white rounded-[20px] p-4 shadow-2xl border border-white/10 flex items-start gap-3">
          {toast.tone === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-[#D4F358] shrink-0 mt-0.5" />
          ) : toast.tone === 'danger' ? (
            <ShieldAlert className="w-5 h-5 text-[#F43F5E] shrink-0 mt-0.5" />
          ) : (
            <Info className="w-5 h-5 text-[#B4ACF9] shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-semibold leading-snug">{toast.title}</p>
            {toast.detail && (
              <p className="text-[12px] text-[#A1A1AA] mt-1 leading-snug">{toast.detail}</p>
            )}
          </div>
          <button
            type="button"
            onClick={dismissToast}
            className="text-[#A1A1AA] hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
